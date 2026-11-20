// Moteur de match 2.5D — caméra télévisée en perspective, 11 contre 11, IA, contrôles tactiles, ralentis.
import { clamp, lerp } from './util.js';
import { FORMATIONS } from './data.js';
import * as A from './audio.js';
import { MatchRenderer3D } from './renderer3d.js';
import { getFormationAssignment, getFormationBase, applyPreset, getCoachAdvice } from './tactics.js';
import { getMatchFlavor, getGoalCommentKeys, pickLine, fillLine } from './commentary.js';
import { getShootoutStatus, getNextKicker, getShootoutOrder, getAIPenaltyChoice, getPenaltyStrike, getAIKeeperDive, getPenaltyOutcome } from './shootout.js';

export const TV_WIPE = 0.55;
// Plan de réalisation : vue large, derrière le but, puis caméra rapprochée sur la fin de l'action.
export function buildReplayPlan(frames, attackDir = 1) {
  const n = frames.length, last = frames[n - 1]?.b || [attackDir * 52.5, 0, 0];
  const goalSide = Math.abs(last[0]) > 40 ? Math.sign(last[0]) : (attackDir >= 0 ? 1 : -1);
  return {
    frames, i: 0, seg: 0, goalSide,
    segs: [
      { angle: 'tv', from: 0, speed: 0.42, label: 'Caméra principale' },
      { angle: 'goal', from: Math.max(0, n - 64), speed: 0.36, label: 'Derrière le but' },
      { angle: 'close', from: Math.max(0, n - 50), speed: 0.3, label: 'Caméra rapprochée' },
    ],
  };
}
const HL = 52.5, HW = 34, GOAL_W = 3.66, GOAL_H = 2.44, G = 9.81;
const DT = 1 / 60;
const SKIN = ['#8d5524', '#c68642', '#e0ac69', '#a0662f', '#5c3a1e', '#f1c27d'];

export function getRenderDpr(quality = 'high', device = {}) {
  const pixelRatio = Number(device.pixelRatio) > 0 ? Number(device.pixelRatio) : 1;
  const qualityCap = quality === 'low' ? 1 : quality === 'medium' ? 1.5 : 2;
  const memory = Number(device.deviceMemory) || 0;
  const cores = Number(device.hardwareConcurrency) || 0;
  let hardwareCap = 2;
  if ((memory > 0 && memory <= 3) || (cores > 0 && cores <= 4)) hardwareCap = 1.25;
  else if (memory > 0 && memory <= 4) hardwareCap = 1.5;
  return Math.max(1, Math.min(pixelRatio, qualityCap, hardwareCap));
}

export function getBallRotation(spin, clockSeconds, speed) {
  const safeSpin = Number.isFinite(spin) ? spin : 0;
  const safeClock = Number.isFinite(clockSeconds) ? clockSeconds : 0;
  const safeSpeed = Number.isFinite(speed) ? Math.max(0, speed) : 0;
  return safeSpin * safeClock * 5 + safeSpeed * 0.035;
}

// Paramètres stables de texture : le niveau graphique ne change jamais la simulation.
export function getTurfTextureConfig(quality = 'high') {
  if (quality === 'low') return { size: 0, blades: 0, flecks: 0, alpha: 0 };
  const high = quality === 'high';
  return {
    size: 256,
    blades: high ? 1500 : 850,
    flecks: high ? 520 : 280,
    alpha: high ? 0.19 : 0.135,
  };
}

// Ombre du ballon physiquement lisible : plus le ballon monte, plus elle s'élargit et s'atténue.
export function getBallShadowMetrics(height = 0) {
  const z = Number.isFinite(height) ? clamp(height, 0, 12) : 0;
  return {
    opacity: Math.max(0.13, 0.42 / (1 + z * 0.28)),
    spread: 1.08 + z * 0.1,
    squash: 0.4 + Math.min(z, 6) * 0.018,
  };
}


export function shouldReduceRenderDetail(frameAverageMs, targetFps = 60) {
  const fps = Number.isFinite(targetFps) && targetFps > 0 ? targetFps : 60;
  const average = Number.isFinite(frameAverageMs) ? frameAverageMs : 0;
  return average > (1000 / fps) * 1.42;
}

export function canRestoreRenderDetail(frameAverageMs, targetFps = 60) {
  const fps = Number.isFinite(targetFps) && targetFps > 0 ? targetFps : 60;
  const average = Number.isFinite(frameAverageMs) ? frameAverageMs : Infinity;
  return average < (1000 / fps) * 1.12;
}

export function getMatchHudLayout(width, dpr = 1) {
  const scale = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const screenWidth = Number.isFinite(width) && width > 0 ? width : 800 * scale;
  const compact = screenWidth < 760 * scale;
  const teamWidth = (compact ? 55 : 92) * scale;
  const scoreWidth = (compact ? 64 : 82) * scale;
  const clockWidth = (compact ? 42 : 54) * scale;
  return {
    compact,
    teamWidth,
    scoreWidth,
    clockWidth,
    scoreHeight: (compact ? 38 : 44) * scale,
    panelWidth: (teamWidth * 2 + scoreWidth + clockWidth + 16 * scale),
    // Statistiques en direct seulement sur grand écran (tablette, ordinateur) : sur téléphone le terrain reste dégagé.
    statsWidth: screenWidth < 1100 * scale ? 0 : Math.min(220 * scale, screenWidth * 0.32),
    statsHeight: screenWidth < 1100 * scale ? 0 : 76 * scale,
  };
}

const v2len = (x, y) => Math.hypot(x, y);
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Réponse du joueur modulée par ses qualités, sa forme physique et sa fatigue.
export function getMovementTuning(attrs = {}, stamina = 1) {
  const pac = clamp(Number(attrs.pac) || 50, 0, 100);
  const phy = clamp(Number(attrs.phy) || 50, 0, 100);
  const dri = clamp(Number(attrs.dri) || 50, 0, 100);
  const tec = clamp(Number(attrs.tec) || 50, 0, 100);
  const energy = clamp(Number.isFinite(stamina) ? stamina : 1, 0.25, 1);
  const agility = clamp((dri * 0.42 + tec * 0.34 + phy * 0.24) / 100, 0.4, 1.05);
  return {
    agility,
    acceleration: (8.8 + pac / 27 + phy / 85) * (0.76 + energy * 0.24),
    turnRate: (3.1 + pac / 55 + agility * 1.15) * (0.78 + energy * 0.22),
  };
}

// Cadence de foulée réaliste : fréquence progressive selon la vitesse et la qualité athlétique.
export function getRunningCadence(speed = 0, pace = 50) {
  const velocity = clamp(Number.isFinite(speed) ? Math.max(0, speed) : 0, 0, 12);
  const acceleration = clamp(Number.isFinite(pace) ? pace : 50, 0, 100) / 100;
  return clamp(6.8 + velocity * 0.9 + acceleration * 1.6, 6.8, 18.5);
}

// Distance de conduite et décalage latéral du ballon selon le contrôle technique.
export function getCarryBallOffset({
  speed = 0, dribbling = 50, technique = 50, stamina = 1, sprinting = false, phase = 0
} = {}) {
  const velocity = clamp(Number.isFinite(speed) ? Math.max(0, speed) : 0, 0, 12);
  const dribble = clamp(Number.isFinite(dribbling) ? dribbling : 50, 0, 100) / 100;
  const tech = clamp(Number.isFinite(technique) ? technique : 50, 0, 100) / 100;
  const energy = clamp(Number.isFinite(stamina) ? stamina : 1, 0.25, 1);
  const skill = clamp(dribble * 0.68 + tech * 0.32, 0, 1) * (0.82 + energy * 0.18);
  const pace = clamp(velocity / 10, 0, 1);
  const phaseValue = Number.isFinite(phase) ? phase : 0;
  const touchWave = Math.sin(phaseValue + 0.35);
  const forwardBase = 0.31 + pace * (0.34 - skill * 0.12) +
    (sprinting ? 0.07 - skill * 0.025 : 0);
  const forward = clamp(forwardBase + touchWave * (0.035 + pace * (0.07 - skill * 0.025)), 0.24, 0.86);
  const lateral = Math.cos(phaseValue + 0.35) * (0.025 + pace * (0.065 - skill * 0.025));
  return { forward, lateral, skill };
}

// Choisit un couloir de conduite en évaluant plusieurs trajectoires courtes,
// les déplacements adverses étant légèrement anticipés.
export function getDribbleLaneTarget(player, opponents = [], direction = 1, halfWidth = 34, halfLength = 52.5) {
  const dir = direction < 0 ? -1 : 1;
  const dribbleSkill = clamp(((Number(player.a?.dri) || 50) * 0.62 +
    (Number(player.a?.tec) || 50) * 0.38) / 100, 0, 1);
  const safeMargin = 2.15 - dribbleSkill * 0.95;
  const angles = [-0.72, -0.48, -0.24, 0, 0.24, 0.48, 0.72];
  let best = null;
  for (const angle of angles) {
    const forward = Math.cos(angle), lateral = Math.sin(angle);
    const x = clamp(player.x + dir * forward * 8.5, -halfLength + 2, halfLength - 2);
    const y = clamp(player.y + lateral * 8.5, -halfWidth + 1.5, halfWidth - 1.5);
    let clearance = 12;
    for (const o of opponents) {
      if (!o || o.sentOff) continue;
      const opponentSpeed = Math.hypot(o.vx || 0, o.vy || 0);
      const horizon = clamp(0.28 + opponentSpeed * 0.018, 0.28, 0.48);
      const ox = o.x + (o.vx || 0) * horizon, oy = o.y + (o.vy || 0) * horizon;
      const gap = segDist(ox, oy, player.x + dir * forward * 1.1, player.y + lateral * 1.1, x, y);
      clearance = Math.min(clearance, gap);
    }
    const progress = forward * 4.2;
    const sidelinePenalty = Math.max(0, Math.abs(y) - halfWidth * 0.72) * 0.12;
    const crowdedPenalty = Math.max(0, safeMargin - clearance) * (1.25 - dribbleSkill * 0.5);
    const directionChangePenalty = Math.abs(angle) * 0.38;
    const score = Math.min(clearance, 8) * 1.35 + progress - sidelinePenalty -
      crowdedPenalty - directionChangePenalty;
    if (!best || score > best.score) best = { x, y, score, clearance, angle };
  }
  return best || { x: player.x + dir * 7, y: player.y, score: 0, clearance: 12, angle: 0 };
}

// Lecture d'un duel : orientation, vitesse d'arrivée et position par rapport au porteur.
// Organise le pressing : un défenseur sur le porteur, les autres ferment les lignes.
// Point de temporisation : entre le porteur et le but défendu, à distance de tacle.
export function getJockeyPoint(carrier = {}, direction = 1, standoff = 1.7) {
  const dir = direction < 0 ? -1 : 1;
  const cx = (Number(carrier.x) || 0) + (Number(carrier.vx) || 0) * 0.22;
  const cy = (Number(carrier.y) || 0) + (Number(carrier.vy) || 0) * 0.22;
  const gx = -HL * dir, gy = clamp(cy * 0.15, -GOAL_W, GOAL_W);
  const len = Math.hypot(gx - cx, gy - cy) || 1;
  return {
    x: clamp(cx + (gx - cx) / len * standoff, -HL + 1, HL - 1),
    y: clamp(cy + (gy - cy) / len * standoff, -HW + 1, HW - 1),
  };
}

// Engagement du tacle par l'IA : un bon défenseur choisit son moment ; un
// porteur lancé vers le but ou dos au jeu déclenche plus souvent l'intervention.
export function getAITackleCommitChance(defender = {}, carrier = {}, distance = 1.5) {
  const def = clamp(Number(defender.a?.def) || 50, 0, 100);
  const dri = clamp(Number(carrier.a?.dri) || 50, 0, 100);
  const close = clamp((1.8 - (Number(distance) || 1.8)) / 1.2, 0, 1);
  return clamp(0.16 + def / 420 - dri / 900 + close * 0.12, 0.08, 0.5);
}

// Choix du joueur à contrôler en défense : temps d'arrivée sur le ballon,
// avec priorité au joueur placé entre le ballon et son propre but.
export function getSwitchCandidateScore(player = {}, ball = {}, direction = 1) {
  const dir = direction < 0 ? -1 : 1;
  const px = (Number(player.x) || 0) + (Number(player.vx) || 0) * 0.4;
  const py = (Number(player.y) || 0) + (Number(player.vy) || 0) * 0.4;
  const bx = Number(ball.x) || 0, by = Number(ball.y) || 0;
  const distance = Math.hypot(px - bx, py - by);
  // Positif quand le joueur est plus proche de son but que le ballon.
  const goalSide = (bx - (Number(player.x) || 0)) * dir;
  const beaten = goalSide < -1.5 ? Math.min(8, -goalSide * 0.6) : 0;
  const cover = goalSide > 0 ? Math.min(3, goalSide * 0.25) : 0;
  return distance + beaten - cover;
}

// Centre contextuel : bouton passe depuis le couloir, près de la ligne de but adverse.
export function isCrossingZone(player = {}, direction = 1) {
  const dir = direction < 0 ? -1 : 1;
  const depth = HL - (Number(player.x) || 0) * dir;
  return depth < 20 && depth > 0 && Math.abs(Number(player.y) || 0) > 14;
}

export const USER_FOUL_SCALE = 0.65;

// Mur sur coup franc : nombre de joueurs selon la distance et l'angle, placé à 9,15 m
// sur la ligne ballon / centre du but, perpendiculairement à cette ligne.
// Position du tireur au moment de la remise en jeu.
export function getRestartTakerSpot(restart = {}, direction = 1) {
  const d = direction < 0 ? -1 : 1, x = Number(restart.x) || 0, y = Number(restart.y) || 0;
  if (restart.type === 'kickoff') return { x: -0.6 * d, y: 0 };
  if (restart.type === 'throw') return { x, y: y + (Math.sign(y) || 1) * 0.6 };
  const ang = Math.atan2(0 - y, d * HL - x);
  return { x: x - Math.cos(ang) * 0.7, y: y - Math.sin(ang) * 0.7 };
}

export function getFreeKickWall(ball = {}, attackDir = 1) {
  const dir = attackDir < 0 ? -1 : 1;
  const gx = HL * dir, bx = Number(ball.x) || 0, by = Number(ball.y) || 0;
  const dist = Math.hypot(gx - bx, by);
  if ((gx - bx) * dir <= 0 || Math.abs(by) > 24 || dist > 34) return { count: 0, slots: [] };
  const count = dist < 21 ? 4 : dist < 26 ? 3 : dist < 31 ? 2 : 1;
  const ux = (gx - bx) / dist, uy = -by / dist;
  const cx = bx + ux * 9.15, cy = by + uy * 9.15;
  // Le mur couvre le côté du but le plus proche du ballon, le gardien l'autre.
  const nearPost = by >= 0 ? 1 : -1;
  const spacing = 1.05;
  const shift = nearPost * spacing * 0.45 * (count - 1);
  const slots = [];
  for (let i = 0; i < count; i++) {
    const off = (i - (count - 1) / 2) * spacing + shift;
    slots.push({ x: cx - uy * off, y: cy + ux * off });
  }
  return { count, slots, distance: dist };
}

// Tir sur coup franc : trajectoire enroulée qui passe au-dessus du mur.
export function getFreeKickShotProfile(power = 0.7, shooting = 50, technique = 50) {
  const skill = clamp(Number(shooting) || 50, 0, 100) / 100;
  const tech = clamp(Number(technique) || 50, 0, 100) / 100;
  return {
    speed: 19 + clamp(power, 0, 1) * 5 + skill * 1.5,
    targetHeight: 1.35 + (1 - clamp(power, 0, 1)) * 0.5,
    spinBoost: 1.35 + tech * 0.6,
    // Effet brossé : le ballon plonge après le mur (accélération verticale supplémentaire).
    dip: 6.5 + tech * 3,
  };
}

export function getPressingPlan(defenders = [], carrier = {}, direction = 1, intensity = 1) {
  if (!carrier || !Number.isFinite(carrier.x) || !Number.isFinite(carrier.y)) return [];
  const dir = direction < 0 ? -1 : 1;
  const level = clamp(Number.isFinite(intensity) ? intensity : 1, 0, 3);
  const count = level >= 2.7 ? 3 : level >= 1.7 ? 2 : 1;
  const available = defenders.filter(p => p && !p.isGK && !p.sentOff);
  const assignments = [], remaining = new Set(available);
  const addNearest = (role, target) => {
    let best = null, bestTime = Infinity;
    for (const p of remaining) {
      const pace = clamp(Number(p.a?.pac) || 50, 0, 100);
      const stamina = clamp(Number.isFinite(p.stamina) ? p.stamina : 1, 0.25, 1);
      const speed = (5.4 + pace * 0.03) * (0.72 + stamina * 0.28);
      const time = Math.hypot(target.x - p.x, target.y - p.y) / speed;
      if (time < bestTime) { bestTime = time; best = p; }
    }
    if (best) { remaining.delete(best); assignments.push({ player: best, role, x: target.x, y: target.y }); }
  };
  // Le premier défenseur temporise côté but : il ferme le chemin du but à
  // courte distance au lieu de foncer dans le porteur.
  addNearest('press', getJockeyPoint(carrier, dir));
  if (count >= 2) addNearest('cover-inside', {
    x: clamp(carrier.x + dir * 3.4, -HL + 2, HL - 2),
    y: clamp(carrier.y * 0.48, -HW + 4, HW - 4),
  });
  if (count >= 3) addNearest('cover-outside', {
    x: clamp(carrier.x + dir * 5.1, -HL + 2, HL - 2),
    y: clamp(carrier.y + (carrier.y >= 0 ? -1 : 1) * 5.5, -HW + 3, HW - 3),
  });
  return assignments;
}

// Défenseur côté but : protège le chemin direct vers le but tout en gardant
// un léger décalage vers la ligne de passe afin de fermer le centre ou la remise.
export function getDefensiveMarkTarget(defender = {}, attacker = {}, ball = {}, goalX = -HL, tightness = 0.82, halfLength = HL, halfWidth = HW) {
  if (!Number.isFinite(attacker.x) || !Number.isFinite(attacker.y)) return { x: 0, y: 0, depth: 0, shade: 0 };
  const gx = Number.isFinite(goalX) ? goalX : -HL;
  const length = Number.isFinite(halfLength) && halfLength > 10 ? halfLength : HL;
  const width = Number.isFinite(halfWidth) && halfWidth > 10 ? halfWidth : HW;
  const pressure = clamp(Number.isFinite(tightness) ? tightness : 0.82, 0, 1);
  const dx = gx - attacker.x, dy = -attacker.y;
  const distance = Math.hypot(dx, dy) || 1;
  const defensiveSkill = clamp((Number(defender.a?.def) || 50) / 100, 0, 1);
  const depth = clamp(0.72 + pressure * 0.42 + (defensiveSkill - 0.5) * 0.18, 0.62, 1.34);
  const ballY = Number.isFinite(ball.y) ? ball.y : attacker.y;
  const ballSide = clamp((ballY - attacker.y) / 12, -1, 1);
  const shade = ballSide * (0.12 + pressure * 0.16);
  return {
    x: clamp(attacker.x + dx / distance * depth, -length + 2, length - 2),
    y: clamp(attacker.y + dy / distance * depth + shade, -width + 2, width - 2),
    depth,
    shade,
  };
}

// Affecte les attaquants dangereux à des défenseurs distincts : un marquage individuel
// stable par menace, pondéré par le danger, le temps d'approche et la compatibilité de couloir.
export function getDefensiveMarkAssignments(defenders = [], attackers = [], ball = {}, goalX = -HL, halfLength = HL, halfWidth = HW) {
  const gx = Number.isFinite(goalX) ? goalX : -HL;
  const length = Number.isFinite(halfLength) && halfLength > 10 ? halfLength : HL;
  const width = Number.isFinite(halfWidth) && halfWidth > 10 ? halfWidth : HW;
  const goalDirection = Math.sign(gx) || -1;
  const teamDirection = -goalDirection;
  const bx = Number.isFinite(ball?.x) ? ball.x : 0;
  const by = Number.isFinite(ball?.y) ? ball.y : 0;
  const available = defenders.filter(p => p && !p.isGK && !p.sentOff &&
    (Number.isFinite(p.base?.[0]) && p.base[0] < -12 || p.instr === 'mark'));
  const threats = attackers.filter(p => p && !p.isGK && !p.sentOff &&
    Number.isFinite(p.x) && Number.isFinite(p.y)).map((p, index) => {
      const progress = clamp((p.x * goalDirection + 18) / 44, 0, 1);
      const ballProximity = 1 - clamp(Math.hypot(p.x - bx, p.y - by) / 32, 0, 1);
      const centrality = 1 - clamp(Math.abs(p.y) / (width + 4), 0, 1);
      const forwardSpeed = Math.max(0, (Number.isFinite(p.vx) ? p.vx : 0) * goalDirection);
      const momentum = clamp(forwardSpeed / 7, 0, 1);
      const threat = progress * 0.5 + ballProximity * 0.27 + centrality * 0.13 + momentum * 0.1;
      return { player: p, threat, index };
    }).sort((a, b) => b.threat - a.threat || a.index - b.index);
  const remaining = new Set(available);
  const assignments = [];
  for (const entry of threats) {
    let selected = null, selectedTarget = null, bestCost = Infinity;
    for (const defender of remaining) {
      const tightness = defender.instr === 'mark' ? 0.96 : 0.78;
      const target = getDefensiveMarkTarget(defender, entry.player, { x: bx, y: by }, gx, tightness, length, width);
      const pace = clamp(Number(defender.a?.pac) || 50, 0, 100);
      const stamina = clamp(Number.isFinite(defender.stamina) ? defender.stamina : 1, 0.25, 1);
      const speed = (5.4 + pace * 0.03) * (0.72 + stamina * 0.28);
      const travelTime = Math.hypot(target.x - defender.x, target.y - defender.y) / speed;
      const baseY = Number.isFinite(defender.base?.[1]) ? defender.base[1] * teamDirection : defender.y;
      const laneMismatch = Math.min(2.2, Math.abs(baseY - entry.player.y) * 0.035);
      const instructionBonus = defender.instr === 'mark' ? 0.16 : 0;
      const continuityBonus = defender.markedOpponentId === entry.player.id ? 0.42 : 0;
      const cost = travelTime + laneMismatch - instructionBonus - continuityBonus;
      if (cost < bestCost) {
        bestCost = cost; selected = defender; selectedTarget = target;
      }
    }
    if (!selected) break;
    remaining.delete(selected);
    assignments.push({ player: selected, opponent: entry.player, x: selectedTarget.x, y: selectedTarget.y, threat: entry.threat });
  }
  return assignments;
}

// Organise les solutions autour du porteur : profondeur, largeur et appui court.
// Les appels en profondeur restent derrière la ligne de hors-jeu estimée.
export function getAttackingSupportPlan(players = [], carrier = {}, opponents = [], direction = 1, halfLength = HL, halfWidth = HW) {
  if (!carrier || !Number.isFinite(carrier.x) || !Number.isFinite(carrier.y)) return [];
  const dir = direction < 0 ? -1 : 1;
  const length = Number.isFinite(halfLength) && halfLength > 10 ? halfLength : HL;
  const width = Number.isFinite(halfWidth) && halfWidth > 10 ? halfWidth : HW;
  const teammates = players.filter(p => p && p !== carrier && !p.isGK && !p.sentOff);
  const rivals = opponents.filter(p => p && !p.sentOff && Number.isFinite(p.x) && Number.isFinite(p.y));
  if (!teammates.length) return [];

  // Le deuxième adversaire le plus proche de la ligne de but fixe la limite du dernier défenseur.
  const defensiveLine = rivals.map(p => p.x * dir).sort((a, b) => b - a);
  const offsideLimit = defensiveLine.length >= 2 ? defensiveLine[1] - 1.1 : length - 4;
  const carrierX = carrier.x * dir;
  const carrierY = carrier.y * dir;
  const advance = clamp((carrierX + 8) / 34, 0, 1);
  const assignments = [];
  const remaining = new Set(teammates);
  const local = p => ({ x: p.x * dir, y: p.y * dir });
  const pressure = p => {
    const pos = local(p);
    let load = 0;
    for (const o of rivals) {
      const gap = Math.hypot(pos.x - o.x * dir, pos.y - o.y * dir);
      if (gap < 5.5) load += (5.5 - gap) * 0.42;
    }
    return load;
  };
  const choose = (candidates, score) => {
    let selected = null, best = -Infinity;
    for (const p of candidates) {
      const value = score(p);
      if (value > best) { best = value; selected = p; }
    }
    return selected;
  };
  const add = (player, role, x, y) => {
    if (!player) return;
    remaining.delete(player);
    assignments.push({
      player, role,
      x: clamp(x * dir, -length + 2, length - 2),
      y: clamp(y * dir, -width + 2, width - 2),
    });
  };

  // 1. Un joueur attaque l'espace libre sans dépasser le dernier rideau défensif.
  const runX = Math.min(carrierX + 8.5 + advance * 2.2, offsideLimit, length - 4);
  if (runX >= carrierX + 2.5) {
    const runner = choose(teammates.filter(p => {
      const baseX = Number.isFinite(p.base?.[0]) ? p.base[0] : p.x * dir;
      return (baseX >= -22 || p.instr === 'run' || p.instr === 'att') && p.x * dir <= offsideLimit + 1.5;
    }), p => {
      const baseX = Number.isFinite(p.base?.[0]) ? p.base[0] : p.x * dir;
      const pace = clamp(Number(p.a?.pac) || 50, 0, 100);
      const finish = clamp(Number(p.a?.sho) || 50, 0, 100);
      return baseX * 0.32 + pace * 0.035 + finish * 0.03 - pressure(p) * 0.8;
    });
    if (runner) {
      const pos = local(runner);
      const baseY = Number.isFinite(runner.base?.[1]) ? runner.base[1] : pos.y;
      const side = Math.sign(pos.y - carrierY || baseY || 1);
      const targetY = clamp(pos.y * 0.45 + carrierY * 0.55 + side * 1.1, -width + 2, width - 2);
      add(runner, 'forward-run', runX, targetY);
    }
  }

  // 2. Un joueur de couloir étire la défense et garde une largeur exploitable.
  const winger = choose([...remaining].filter(p => {
    const baseY = Number.isFinite(p.base?.[1]) ? p.base[1] : p.y * dir;
    return Math.abs(baseY) >= 10 || p.instr === 'wide';
  }), p => {
    const baseY = Number.isFinite(p.base?.[1]) ? p.base[1] : p.y * dir;
    const pace = clamp(Number(p.a?.pac) || 50, 0, 100);
    return Math.abs(baseY) * 0.28 + pace * 0.025 - pressure(p) * 0.65;
  });
  if (winger) {
    const baseY = Number.isFinite(winger.base?.[1]) ? winger.base[1] : winger.y * dir;
    const side = Math.sign(baseY || winger.y * dir || 1);
    const targetX = Math.min(carrierX + 2.8 + advance * 1.8, offsideLimit - 0.8);
    const targetY = side * Math.min(width - 4, 14 + advance * 4.5);
    add(winger, 'wide-support', targetX, targetY);
  }

  // 3. Un milieu décroche pour proposer une passe de sécurité sous pression.
  const option = choose([...remaining].filter(p => {
    const baseX = Number.isFinite(p.base?.[0]) ? p.base[0] : p.x * dir;
    return baseX >= -32 && baseX <= 16;
  }), p => {
    const pos = local(p);
    const passing = clamp(Number(p.a?.pas) || 50, 0, 100);
    const technique = clamp(Number(p.a?.tec) || 50, 0, 100);
    return -Math.hypot(pos.x - carrierX, pos.y - carrierY) * 0.42 + passing * 0.045 + technique * 0.025 - pressure(p) * 0.7;
  });
  if (option) {
    const pos = local(option);
    const side = Math.sign(pos.y - carrierY || (Number(option.base?.[1]) || 1));
    add(option, 'short-option', carrierX - 4.2, clamp(carrierY + side * 4.2, -width + 3, width - 3));
  }

  // 4. Un troisième joueur attaque le demi-espace en diagonale : l'équipe
  // dispose ainsi d'une solution de progression supplémentaire sans s'entasser.
  const diagonalX = Math.min(carrierX + 5.4 + advance * 2.1, offsideLimit - 1.4, length - 4);
  if (diagonalX >= carrierX + 2.2) {
    const occupied = assignments.map(entry => ({ x: entry.x * dir, y: entry.y * dir }));
    const diagonalRunner = choose([...remaining].filter(p => {
      const baseX = Number.isFinite(p.base?.[0]) ? p.base[0] : p.x * dir;
      return baseX >= carrierX - 24 && baseX <= carrierX + 10 && p.x * dir <= offsideLimit + 1.2;
    }), p => {
      const pos = local(p);
      const baseY = Number.isFinite(p.base?.[1]) ? p.base[1] * dir : pos.y;
      const pace = clamp(Number(p.a?.pac) || 50, 0, 100);
      const finish = clamp(Number(p.a?.sho) || 50, 0, 100);
      const technique = clamp(Number(p.a?.tec) || 50, 0, 100);
      const laneSide = Math.sign(pos.y - carrierY || baseY || 1);
      const targetY = clamp(pos.y * 0.58 + carrierY * 0.42 + laneSide * (1.2 + advance * 1.5), -width + 3, width - 3);
      const separation = occupied.length
        ? Math.min(...occupied.map(point => Math.hypot(diagonalX - point.x, targetY - point.y)))
        : 10;
      const halfSpaceFit = Math.abs(Math.abs(baseY) - 8);
      return -Math.abs(pos.x - (carrierX - 2)) * 0.22 +
        pace * 0.035 + finish * 0.025 + technique * 0.02 -
        halfSpaceFit * 0.14 - pressure(p) * 0.65 + Math.min(separation, 14) * 0.18;
    });
    if (diagonalRunner) {
      const pos = local(diagonalRunner);
      const baseY = Number.isFinite(diagonalRunner.base?.[1]) ? diagonalRunner.base[1] * dir : pos.y;
      const laneSide = Math.sign(pos.y - carrierY || baseY || 1);
      const targetY = clamp(pos.y * 0.58 + carrierY * 0.42 + laneSide * (1.2 + advance * 1.5), -width + 3, width - 3);
      add(diagonalRunner, 'diagonal-run', diagonalX, targetY);
    }
  }
  return assignments;
}

// Répartition des impacts corporels : physique, agilité et endurance déterminent
// la résistance au choc et la part d'impulsion transmise à chaque joueur.
export function getBodyContactAssessment(a = {}, b = {}, closingSpeed = 0) {
  const profile = p => {
    const attrs = p?.a || {};
    const physical = clamp(Number(attrs.phy) || 50, 0, 100) / 100;
    const agility = clamp(Number(attrs.dri) || 50, 0, 100) / 100;
    const stamina = clamp(Number.isFinite(p?.stamina) ? p.stamina : 1, 0.3, 1);
    return {
      mass: 0.82 + physical * 0.42,
      balance: clamp(0.42 + physical * 0.2 + agility * 0.16 + stamina * 0.18, 0.4, 0.96),
    };
  };
  const pa = profile(a), pb = profile(b);
  const speed = Math.max(0, Number.isFinite(closingSpeed) ? closingSpeed : 0);
  const collision = clamp((speed - 1.0) / 7, 0, 1);
  const impulse = clamp((speed - 0.8) * 0.22, 0, 2.4);
  const staggerA = clamp(collision * (pb.mass / pa.mass) * (1.08 - pa.balance * 0.42), 0, 1);
  const staggerB = clamp(collision * (pa.mass / pb.mass) * (1.08 - pb.balance * 0.42), 0, 1);
  return {
    collision,
    impulseA: impulse * (2 * pb.mass / (pa.mass + pb.mass)),
    impulseB: impulse * (2 * pa.mass / (pa.mass + pb.mass)),
    staggerA,
    staggerB,
  };
}

// Animation du tacle glissé : approche, extension puis retour à l'appui.
// Le profil est indépendant du rendu et reste léger pour les appareils Android.
// Vitesse d'approche avec freinage progressif : le joueur ralentit avant sa cible.
export function getArriveSpeed(distance, maxSpeed, brakingAcceleration = 8) {
  const d = Number.isFinite(distance) ? Math.max(0, distance) : 0;
  const cap = Number.isFinite(maxSpeed) ? Math.max(0, maxSpeed) : 0;
  const braking = Number.isFinite(brakingAcceleration) ? Math.max(0, brakingAcceleration) : 0;
  return Math.min(cap, Math.sqrt(2 * braking * d));
}

// Limite l'accélération sur le vecteur complet, quelle que soit sa direction.
export function getVelocityStep(vx, vy, targetX, targetY, maxChange) {
  const x = Number.isFinite(vx) ? vx : 0, y = Number.isFinite(vy) ? vy : 0;
  const tx = Number.isFinite(targetX) ? targetX : 0, ty = Number.isFinite(targetY) ? targetY : 0;
  const dx = tx - x, dy = ty - y, gap = Math.hypot(dx, dy);
  const step = Number.isFinite(maxChange) ? Math.max(0, maxChange) : 0;
  const scale = gap > step && gap > 1e-9 ? step / gap : 1;
  return { vx: x + dx * scale, vy: y + dy * scale };
}

// Les changements de direction réduisent brièvement la vitesse cible :
// les joueurs chargés en course doivent réorienter leurs appuis avant de repartir.
export function getTurnSpeedFactor(heading = 0, targetX = 0, targetY = 0, currentSpeed = 0) {
  const x = Number.isFinite(targetX) ? targetX : 0;
  const y = Number.isFinite(targetY) ? targetY : 0;
  if (Math.hypot(x, y) < 0.15) return 1;
  const facing = Number.isFinite(heading) ? heading : 0;
  const desired = Math.atan2(y, x);
  const angle = Math.abs(Math.atan2(Math.sin(desired - facing), Math.cos(desired - facing)));
  const turnLoad = clamp(angle / Math.PI, 0, 1);
  const speedLoad = clamp((Number.isFinite(currentSpeed) ? Math.max(0, currentSpeed) : 0) / 8.5, 0, 1);
  return clamp(1 - turnLoad * (0.08 + speedLoad * 0.2), 0.68, 1);
}

// Lisse les variations de consigne de l'IA sans retarder excessivement un changement tactique.
export function getSmoothedTarget(x, y, targetX, targetY, dt, rate = 8) {
  const time = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.1);
  const smoothing = clamp(Number.isFinite(rate) ? rate : 8, 1, 30);
  const alpha = 1 - Math.exp(-time * smoothing);
  const fromX = Number.isFinite(x) ? x : (Number.isFinite(targetX) ? targetX : 0);
  const fromY = Number.isFinite(y) ? y : (Number.isFinite(targetY) ? targetY : 0);
  const toX = Number.isFinite(targetX) ? targetX : fromX;
  const toY = Number.isFinite(targetY) ? targetY : fromY;
  return { x: fromX + (toX - fromX) * alpha, y: fromY + (toY - fromY) * alpha };
}

// Direction de séparation déterministe, même lorsque deux joueurs occupent exactement le même point.
export function getPlayerContactNormal(a = {}, b = {}, seed = 0) {
  const ax = Number.isFinite(a.x) ? a.x : 0, ay = Number.isFinite(a.y) ? a.y : 0;
  const bx = Number.isFinite(b.x) ? b.x : 0, by = Number.isFinite(b.y) ? b.y : 0;
  const dx = bx - ax, dy = by - ay, distance = Math.hypot(dx, dy);
  if (distance > 1e-4) return { x: dx / distance, y: dy / distance, distance };
  const identity = (Number.isFinite(a.team) ? a.team * 101 : 0) +
    (Number.isFinite(a.i) ? a.i * 17 : 0) +
    (Number.isFinite(b.team) ? b.team * 211 : 0) +
    (Number.isFinite(b.i) ? b.i * 31 : 0) +
    (Number.isFinite(seed) ? seed : 0);
  const angle = identity * 2.399963229728653;
  return { x: Math.cos(angle), y: Math.sin(angle), distance: 0 };
}

// Évite les regroupements entre coéquipiers sans provoquer de changements de direction brusques.
export function getTeammateAvoidance(player = {}, teammates = [], radius = 2.6) {
  if (!Number.isFinite(player.x) || !Number.isFinite(player.y)) return { x: 0, y: 0, strength: 0 };
  const range = clamp(Number.isFinite(radius) ? radius : 2.6, 0.5, 6);
  let sx = 0, sy = 0, count = 0;
  for (const mate of teammates) {
    if (!mate || mate === player || mate.sentOff ||
        !Number.isFinite(mate.x) || !Number.isFinite(mate.y)) continue;
    let dx = player.x - mate.x, dy = player.y - mate.y;
    let distance = Math.hypot(dx, dy);
    if (distance >= range) continue;
    if (distance < 1e-4) {
      const seed = (Number.isFinite(player.i) ? player.i : 0) * 2.399963229728653;
      dx = Math.cos(seed); dy = Math.sin(seed); distance = 1;
    }
    const pressure = ((range - distance) / range) ** 2;
    sx += dx / distance * pressure;
    sy += dy / distance * pressure;
    count++;
  }
  const magnitude = Math.hypot(sx, sy);
  if (!count || magnitude < 1e-8) return { x: 0, y: 0, strength: 0 };
  return {
    x: sx / magnitude,
    y: sy / magnitude,
    strength: clamp(magnitude, 0, 1),
  };
}

// Matrice de projection du joueur : axe local X = direction de course,
// axe local Y = verticale du corps. La perspective tourne réellement la silhouette.
export function getPlayerBodyTransform(forwardX, forwardY, minimumWidth = 0.64) {
  const fx = Number.isFinite(forwardX) ? forwardX : 1;
  const fy = Number.isFinite(forwardY) ? forwardY : 0;
  const length = Math.hypot(fx, fy) || 1;
  // L'axe de course peut se projeter presque verticalement à l'écran.
  // On réduit alors la largeur du sprite, sans coucher ni écraser sa hauteur.
  const horizontalFacing = clamp(Math.abs(fx) / length, 0, 1);
  const minWidth = clamp(Number.isFinite(minimumWidth) ? minimumWidth : 0.64, 0.5, 0.9);
  const width = minWidth + (1 - minWidth) * horizontalFacing;
  const direction = Math.abs(fx) < 1e-4 ? 1 : (fx < 0 ? -1 : 1);
  return { a: direction * width, b: 0, c: 0, d: 1 };
}

export function getTackleAnimationProfile(remaining = 0, duration = 0.38) {
  const total = clamp(Number.isFinite(duration) ? duration : 0.38, 0.08, 0.8);
  const left = clamp(Number.isFinite(remaining) ? remaining : 0, 0, total);
  const progress = clamp(1 - left / total, 0, 1);
  if (left <= 0) return { progress: 1, lunge: 0, reach: 0, recovery: 1 };
  const lunge = Math.sin(progress * Math.PI);
  const reach = Math.sin(clamp(progress / 0.68, 0, 1) * Math.PI / 2) * (1 - progress * 0.22);
  const recovery = clamp((progress - 0.58) / 0.42, 0, 1);
  return { progress, lunge, reach, recovery };
}

// Les tacles de l'IA restent engagés mais provoquent beaucoup moins d'arrêts de jeu.
export const AI_FOUL_SCALE = 0.32;

// Décision de passe du porteur IA : conduire quand l'espace existe, passer sous
// pression réelle, chercher la passe qui fait progresser et ne pas garder le ballon trop longtemps.
export function getCarrierPassDecision({
  pressure = 99, laneClearance = 12, option = null, carrierX = 0,
  direction = 1, carryTime = 0, vision = 50, roll = 0.5,
} = {}) {
  if (!option) return { pass: false, reason: 'no-option' };
  const score = Number(option.score) || 0;
  const progress = ((Number(option.tx) || 0) - (Number(carrierX) || 0)) * (direction < 0 ? -1 : 1);
  const visionBoost = clamp(((Number(vision) || 50) - 50) / 200, -0.1, 0.2);
  if (pressure < 1.15 && score > -8) return { pass: true, reason: 'pressed' };
  if (laneClearance < 1.25 && pressure < 2.4 && score > -3) return { pass: true, reason: 'blocked' };
  if (progress > 7 && score > 9 && roll < 0.42 + visionBoost) return { pass: true, reason: 'progressive' };
  if (carryTime > 3.4 && score > 0) return { pass: true, reason: 'tempo' };
  if (score > 6 && roll < 0.05) return { pass: true, reason: 'recycle' };
  return { pass: false, reason: 'carry' };
}

export function getTackleAssessment(defender, carrier, distance, user = false, difficultyPenalty = 0) {
  const d = Math.max(0.01, Number(distance) || 0.01);
  const nx = (carrier.x - defender.x) / d, ny = (carrier.y - defender.y) / d;
  const heading = Number.isFinite(defender.heading) ? defender.heading : Math.atan2(defender.vy || 0, defender.vx || 1);
  const facing = Math.cos(Math.atan2(ny, nx) - heading);
  const carrierHeading = Number.isFinite(carrier.heading) ? carrier.heading : Math.atan2(carrier.vy || 0, carrier.vx || 1);
  const carrierToDefender = Math.atan2(defender.y - carrier.y, defender.x - carrier.x);
  const rear = clamp((-Math.cos(carrierToDefender - carrierHeading) + 0.12) / 1.12, 0, 1);
  const closingSpeed = Math.max(0, ((defender.vx || 0) - (carrier.vx || 0)) * nx + ((defender.vy || 0) - (carrier.vy || 0)) * ny);
  const skillGap = ((defender.a?.def ?? 50) - (carrier.a?.dri ?? 50)) / 160;
  const proximity = clamp((2.5 - d) / 2.5, 0, 1) * 0.055;
  const successChance = clamp(0.38 + skillGap + (user ? 0.12 : 0) - difficultyPenalty +
    facing * 0.055 - rear * 0.065 + proximity - Math.max(0, closingSpeed - 7) * 0.012, 0.08, 0.84);
  const foulChance = clamp((user ? 0.11 : 0.075) + (d > 1.4 ? 0.04 : 0) +
    clamp((closingSpeed - 3) / 9, 0, 1) * 0.13 + rear * 0.055 + (facing < -0.2 ? 0.04 : 0), 0.03, 0.4);
  return { successChance, foulChance, facing, rear, closingSpeed };
}

// Hors-jeu à l'instant où le ballon est joué : deuxième dernier adversaire,
// ligne du ballon et moitié de terrain adverse sont tous pris en compte.
// Évalue une ligne de passe avec anticipation des déplacements adverses sur le temps de trajet.
const PASS_LANE_PHASES = [0.06, 0.14, 0.24, 0.4, 0.6, 0.8, 1];

// Interception d'un ballon en mouvement par un joueur qui n'est pas le destinataire :
// contre quasi certain s'il est sur la trajectoire, de plus en plus difficile
// à mesure que le ballon passe loin du corps et vite.
export function getMovingBallInterceptChance(distance = 1, ballSpeed = 10, defending = 50) {
  const d = Math.max(0, Number(distance) || 0);
  if (d < 0.4) return 1;
  const reach = clamp((1.12 - d) / 0.72, 0, 1);
  const speedLoad = clamp(((Number(ballSpeed) || 0) - 7) / 15, 0, 0.7);
  const skill = 0.72 + clamp(Number(defending) || 50, 0, 100) / 360;
  return clamp(reach * reach * (1 - speedLoad) * skill, 0, 0.95);
}

export function getPassLaneAssessment(from = {}, to = {}, opponents = [], flightTime = 0.8) {
  const sx = Number.isFinite(from.x) ? from.x : 0;
  const sy = Number.isFinite(from.y) ? from.y : 0;
  const dx = (Number.isFinite(to.x) ? to.x : sx) - sx;
  const dy = (Number.isFinite(to.y) ? to.y : sy) - sy;
  const duration = clamp(Number.isFinite(flightTime) ? flightTime : 0.8, 0.12, 2.4);
  let risk = 0, clearance = 12, interceptor = null, interceptAt = 1;
  for (const opponent of opponents) {
    if (!opponent || opponent.sentOff) continue;
    const ox = Number.isFinite(opponent.x) ? opponent.x : 0;
    const oy = Number.isFinite(opponent.y) ? opponent.y : 0;
    const ovx = Number.isFinite(opponent.vx) ? opponent.vx : 0;
    const ovy = Number.isFinite(opponent.vy) ? opponent.vy : 0;
    let nearest = Infinity, nearestAt = 1;
    // Un défenseur qui ferme la ligne est détecté même s'il n'est pas dessus au départ.
    for (const phase of PASS_LANE_PHASES) {
      const ballX = sx + dx * phase, ballY = sy + dy * phase;
      const time = duration * phase;
      const defenderX = ox + ovx * time * 0.82;
      const defenderY = oy + ovy * time * 0.82;
      const gap = Math.hypot(defenderX - ballX, defenderY - ballY);
      if (gap < nearest) { nearest = gap; nearestAt = phase; }
    }
    clearance = Math.min(clearance, nearest);
    if (nearest < 2.4) {
      const urgency = 1.08 - nearestAt * 0.22;
      risk += (2.4 - nearest) ** 2 * 1.6 * urgency;
      if (!interceptor || nearest < interceptor.clearance) {
        interceptor = { player: opponent, clearance: nearest };
        interceptAt = nearestAt;
      }
    }
  }
  return { risk, clearance, interceptor: interceptor?.player || null, interceptAt };
}

// Dispersion des frappes : qualité technique, pression, équilibre et puissance influencent le geste.
export function getShotAccuracy({ shooting = 50, technique = 50, pressure = 99, movingSpeed = 0, power = 0.7, assist = 1 } = {}) {
  const shotSkill = clamp(Number(shooting) || 50, 0, 100) / 100;
  const techSkill = clamp(Number(technique) || 50, 0, 100) / 100;
  const pressureLoad = clamp((4.2 - (Number.isFinite(pressure) ? pressure : 99)) / 4.2, 0, 1);
  const balanceLoad = clamp(((Number.isFinite(movingSpeed) ? movingSpeed : 0) - 3) / 11, 0, 1);
  const powerLoad = clamp(((Number.isFinite(power) ? power : 0.7) - 0.72) / 0.28, 0, 1);
  const support = clamp(Number(assist) || 1, 0.45, 1.2);
  const spread = (0.26 + (1 - shotSkill) * 1.15 + (1 - techSkill) * 0.42 +
    pressureLoad * 1.05 + balanceLoad * 0.58 + powerLoad * 0.36) * support;
  const verticalSpread = (0.1 + (1 - techSkill) * 0.44 +
    pressureLoad * 0.24 + balanceLoad * 0.16 + powerLoad * 0.12) * support;
  return { spread: clamp(spread, 0.2, 4.5), verticalSpread: clamp(verticalSpread, 0.08, 1.25), pressureLoad, balanceLoad };
}

// Évalue une occasion de tir de l'IA avant de déclencher la frappe :
// distance, angle, pression, qualités du tireur, fatigue et ouverture face au gardien.
export function getAIShootingQuality({
  distance = 30, shooterY = 0, pressure = 99, shooting = 50,
  technique = 50, stamina = 1, keeperY = 0,
} = {}) {
  const shotDistance = Number.isFinite(distance) ? Math.max(0, distance) : 36;
  const lateral = Math.abs(Number.isFinite(shooterY) ? shooterY : 0);
  const pressureDistance = Number.isFinite(pressure) ? Math.max(0, pressure) : 99;
  const shotSkill = clamp(Number.isFinite(shooting) ? shooting : 50, 0, 100) / 100;
  const techSkill = clamp(Number.isFinite(technique) ? technique : 50, 0, 100) / 100;
  const energy = clamp(Number.isFinite(stamina) ? stamina : 1, 0.25, 1);
  const keeper = Number.isFinite(keeperY) ? keeperY : 0;
  const range = clamp((36 - shotDistance) / 28, 0, 1);
  const angle = clamp(1 - Math.max(0, lateral - 6) / 24, 0.18, 1);
  const pressureControl = clamp((pressureDistance - 0.7) / 5.3, 0, 1);
  const skill = shotSkill * 0.65 + techSkill * 0.35;
  const staminaControl = 0.58 + energy * 0.42;
  const targetY = getShotTargetY(keeper, shooterY);
  const keeperOpening = clamp(Math.abs(targetY - keeper) / GOAL_W, 0, 1);
  const score = clamp(
    range * 0.48 + angle * 0.20 + skill * 0.15 +
    pressureControl * 0.11 + staminaControl * 0.04 + keeperOpening * 0.02,
    0, 1
  );
  return { score, range, angle, pressure: pressureControl, skill, stamina: staminaControl, keeperOpening };
}

// Profil de plongeon du gardien : extension latérale, hauteur de prise et durée
// dépendent du tir reçu, du temps disponible et de la qualité du gardien.
export function getKeeperDiveProfile({ keeperY = 0, shotY = 0, shotZ = 0.8, shotSpeed = 20, crossingTime = 0.5, rating = 50 } = {}) {
  const skill = clamp(Number.isFinite(rating) ? rating : 50, 0, 100);
  const lateralGap = (Number.isFinite(shotY) ? shotY : 0) - (Number.isFinite(keeperY) ? keeperY : 0);
  const timing = clamp(Number.isFinite(crossingTime) ? crossingTime : 0.5, 0.02, 1.5);
  const speed = Math.max(0, Number.isFinite(shotSpeed) ? shotSpeed : 20);
  const urgency = clamp((0.98 - timing) / 0.78, 0, 1);
  const lateralDemand = clamp(Math.abs(lateralGap) / (GOAL_W + 0.55), 0, 1);
  // -1 : ballon bas, 0 : hauteur du buste, +1 : ballon haut / lucarne.
  const height = clamp(((Number.isFinite(shotZ) ? shotZ : 0.8) - 1.2) / 1.05, -1, 1);
  const speedDemand = clamp((speed - 18) / 18, 0, 1);
  const stretch = clamp(0.24 + lateralDemand * 0.48 + urgency * 0.09 + speedDemand * 0.08 - (skill - 50) * 0.0011, 0.2, 0.9);
  const duration = clamp(0.41 + lateralDemand * 0.055 + urgency * 0.07 + (50 - skill) * 0.00075, 0.38, 0.58);
  return { direction: Math.sign(lateralGap) || 1, height, stretch, duration, urgency, lateralDemand };
}

// Recherche la zone opposée au gardien ; une visée tactile explicite reste prioritaire.
// Probabilité d'arrêt : distance latérale, hauteur, vitesse et temps de réaction du gardien.
// Déplacement latéral du gardien : qualité des appuis et urgence de l'intervention.
export function getKeeperFootworkPace(rating = 50, crossingTime = 0.5) {
  const skill = clamp(Number.isFinite(rating) ? rating : 50, 0, 100) / 100;
  const timing = clamp(Number.isFinite(crossingTime) ? crossingTime : 0.5, 0.02, 1.5);
  const urgency = clamp((1.1 - timing) / 0.95, 0, 1);
  return clamp(0.96 + skill * 0.22 + urgency * 0.08, 0.96, 1.26);
}

// Placement du gardien sur la bissectrice du ballon, avec une courte
// anticipation de trajectoire et une profondeur modulée par son niveau.
export function getKeeperPositioning({ goalX = -HL, ballX = 0, ballY = 0, ballVx = 0, ballVy = 0, rating = 50 } = {}) {
  const gx = Number.isFinite(goalX) ? goalX : -HL;
  const bx = Number.isFinite(ballX) ? ballX : 0;
  const by = Number.isFinite(ballY) ? ballY : 0;
  const vx = Number.isFinite(ballVx) ? ballVx : 0;
  const vy = Number.isFinite(ballVy) ? ballVy : 0;
  const skill = clamp(Number.isFinite(rating) ? rating : 50, 0, 100) / 100;
  const leadTime = clamp(0.14 + Math.hypot(vx, vy) * 0.006, 0.14, 0.3);
  const predictedX = bx + vx * leadTime;
  const predictedY = by + vy * leadTime;
  const dx = predictedX - gx, dy = predictedY;
  const distance = Math.hypot(dx, dy) || 1;
  const anticipation = 0.9 + skill * 0.14;
  const depth = clamp((0.62 + Math.min(distance, 38) * 0.068) * anticipation, 0.58, 4.05);
  return {
    x: clamp(gx + dx / distance * depth, -HL + 0.35, HL - 0.35),
    y: clamp(dy / distance * depth, -GOAL_W + 0.38, GOAL_W - 0.38),
    depth,
    predictedX,
    predictedY,
    leadTime,
  };
}

// Un tir est cadré uniquement si son point de passage coupe réellement le cadre du but.
export function isShotOnTargetAtGoalLine(y = 0, z = 0) {
  return Number.isFinite(y) && Number.isFinite(z) &&
    Math.abs(y) < GOAL_W && z >= 0 && z < GOAL_H;
}

export function getKeeperSaveAssessment({ rating = 50, keeperY = 0, shotY = 0, shotZ = 0.8, shotSpeed = 20, crossingTime = 0.5, difficulty = 0 } = {}) {
  const skill = clamp(Number(rating) || 50, 0, 100);
  const lateralGap = (Number.isFinite(shotY) ? shotY : 0) - (Number.isFinite(keeperY) ? keeperY : 0);
  const heightGap = Math.max(0, (Number.isFinite(shotZ) ? shotZ : 0.8) - 1.25);
  const need = Math.hypot(lateralGap, heightGap * 0.58);
  const timing = Number.isFinite(crossingTime) ? crossingTime : 0.5;
  const reaction = clamp((1.05 - timing) / 0.72, 0, 1);
  const reach = clamp(1.6 + skill / 100 * 1.6 + clamp(Number(difficulty) || 0, -0.3, 0.3), 1.25, 3.5);
  const speed = Math.max(0, Number.isFinite(shotSpeed) ? shotSpeed : 20);
  const chance = need < reach
    ? 0.92 - (need / reach) * 0.55 - (speed - 20) * 0.012 + (skill - 70) / 200 + (reaction - 0.5) * 0.07
    : 0.02;
  return { reach, need, reaction, chance: clamp(chance, 0.02, 0.96) };
}

export function getShotTargetY(keeperY = 0, shooterY = 0, aimY = null) {
  const limit = GOAL_W - 0.28;
  if (Number.isFinite(aimY)) return clamp(aimY, -limit, limit);
  const keeper = Number.isFinite(keeperY) ? keeperY : 0;
  const shooter = Number.isFinite(shooterY) ? shooterY : 0;
  const side = Math.abs(keeper) > 0.3 ? -Math.sign(keeper) : (Math.abs(shooter) > 0.45 ? -Math.sign(shooter) : 1);
  // Cherche davantage le second poteau sans viser systématiquement le centre :
  // le placement est ambitieux, mais la précision reste liée aux attributs du tireur.
  const depth = clamp(2.25 + Math.min(0.38, Math.abs(keeper) * 0.16), 2.15, limit);
  return side * depth;
}

export function getOffsideDecision(attacker, ball, defenders = [], direction = 1) {
  const dir = direction < 0 ? -1 : 1;
  const defenderLines = defenders
    .filter(p => p && !p.sentOff)
    .map(p => Number(p.x) * dir)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const secondLastDefender = defenderLines.length >= 2 ? defenderLines[defenderLines.length - 2] : -Infinity;
  const ballProgress = (Number(ball?.x) || 0) * dir;
  const line = Math.max(secondLastDefender, ballProgress);
  const playerProgress = (Number(attacker?.x) || 0) * dir;
  const attackingHalf = playerProgress > 0;
  const offside = attackingHalf && playerProgress > line + 0.08;
  return { offside, line, playerProgress, secondLastDefender, ballProgress };
}

// Caméra broadcast : léger suivi anticipé et zoom d'action progressif, jamais instantané.
export function getCameraFollow(ball = {}, close = false) {
  const x = Number.isFinite(ball.x) ? ball.x : 0;
  const y = Number.isFinite(ball.y) ? ball.y : 0;
  const vx = Number.isFinite(ball.vx) ? ball.vx : 0;
  const vy = Number.isFinite(ball.vy) ? ball.vy : 0;
  const speed = Math.hypot(vx, vy);
  const lead = close ? 0.035 : clamp(speed / 120, 0, 0.18);
  const threat = clamp((Math.abs(x) - 25) / 26, 0, 1) * clamp(1 - Math.abs(y) / 38, 0.3, 1);
  const zoom = close ? 1 : clamp(1 + threat * 0.055 + (ball.inFlightShot ? 0.035 : 0), 1, 1.09);
  return {
    x: clamp(x + vx * lead, -HL + 6, HL - 6),
    y: clamp(y + vy * lead * 0.65, -HW + 4, HW - 4),
    zoom,
  };
}

export class Match {
  constructor(opts) {
    this.o = opts;
    this.canvas = opts.canvas; this.c = this.canvas.getContext('2d');
    this.settings = Object.assign({ duration: 5, difficulty: 1, assist: true, quality: 'high', fps: 60, voice: true, lang: 'fr' }, opts.settings || {});
    this.userSide = opts.userSide; // 0, 1 ou null (spectateur)
    // Match à élimination directe : buts déjà acquis au cumul (aller) ; tirs au but si égalité.
    this.knockout = opts.knockout ? { aggBefore: opts.knockout.aggBefore || [0, 0] } : null;
    this.teams = [this.makeTeam(opts.home, 0), this.makeTeam(opts.away, 1)];
    this.ball = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, owner: null, last: null, lastTeam: 0, prevOwnerT: -1 };
    this.score = [0, 0]; this.minute = 0; this.half = 1; this.clock = 0;
    this.stats = { poss: [0, 0], shots: [0, 0], onTarget: [0, 0], passes: [0, 0], passOk: [0, 0], fouls: [0, 0], corners: [0, 0], yellows: [0, 0], reds: [0, 0], tackles: [0, 0], tacklesWon: [0, 0], offsides: [0, 0] };
    this.events = []; this.state = 'kickoff'; this.stateT = 0; this.kickTeam = 0;
    this.input = { jx: 0, jy: 0, sprint: false, shootHold: 0, shooting: false, press: false };
    this.selected = null; this.cam = { x: 0, y: 0, zoom: 1 };
    this.replayBuf = []; this.replay = null; this.paused = false; this.ended = false;
    this.msg = null; this.msgT = 0; this.ticker = ''; this.tickerT = 0;
    this.goalFxT = 0; this.goalFxTeam = 0;
    this.matchIntroT = 5.8;
    this.r = Math.random; this.acc = 0; this.last = 0; this.frameSkip = 0;
    this.subsLeft = [5, 5];
    this.crowdTex = null;
    this.pitchPattern = null;
    this.pitchPatternAlpha = 0;
    this.pitchPatternBuilt = false;
    this.autoReduced = false;
    this.frameAverageMs = 1000 / 60;
    this.performanceSamples = 0;
    this.lastPerformanceTransition = 0;
    this.halfLen = 45;
    this.secondsPerMinute = (this.settings.duration * 60) / 90;
    this.setupKickoff(0);
    this.resize = this.resize.bind(this); this.loop = this.loop.bind(this);
    this.onVis = () => { if (document.hidden) { this.paused = true; A.audioSuspend(); this.o.onPause && this.o.onPause(); } };
    window.addEventListener('resize', this.resize); document.addEventListener('visibilitychange', this.onVis);
    this.resize();
    this.renderer3d = null;
    if (this.canvas.parentElement && typeof document !== 'undefined') {
      try {
        this.renderer3d = new MatchRenderer3D(this.canvas, this);
      } catch (error) {
        this.canvas.parentElement.querySelector('.ft26-3d-canvas')?.remove();
        console.warn('Rendu 3D indisponible, retour au moteur 2.5D :', error);
      }
    }
  }

  makeTeam(t, side) {
    const form = FORMATIONS[t.formation] || FORMATIONS['4-3-3'];
    const ps = t.players.slice(0, 11).map((p, i) => ({
      id: p.id, name: p.name, num: p.num || i + 1, pos: p.pos, a: p.attrs, team: side, i,
      isGK: i === 0, base: form[i], x: 0, y: 0, vx: 0, vy: 0, face: side === 0 ? 1 : -1, heading: side === 0 ? 0 : Math.PI, turn: 0, bodyLean: 0, keeperReactShot: null, diveHeight: 0, diveStretch: 0, anim: Math.random() * 6,
      stamina: clamp(p.fitness ?? 1, 0.5, 1), cd: 0, tackleCd: 0, aiThink: 0, motionAccel: 0, run: 0, diveT: 0, slideT: 0, slideDuration: 0.38, slideDir: 1, jumpT: 0, jumpCd: 0, headerT: 0, headerDir: side === 0 ? 1 : -1, firstTouchT: 0, firstTouchDir: 1, stumbleT: 0, stumbleDir: 1, keeperCatchT: 0, keeperPunchT: 0, saveT: 0, kickT: 0, kickDir: 1, kickFootSide: i % 2 === 0 ? -1 : 1, yellow: 0, sentOff: false, injured: false, celebrateT: 0, contactT: 0, contactDir: 1,
      instr: p.instr || '', skin: SKIN[(p.name || '').length % SKIN.length], rating: 6.5, touches: 0, goals: 0, assists: 0, minutes: 0,
    }));
    return {
      side, id: t.id, name: t.name, short: t.short, kit: t.kit || { shirt: t.colors[0], trim: t.colors[1], shorts: t.colors[1] },
      gkKit: t.gkKit || { shirt: '#2fb84a', trim: '#111', shorts: '#111' },
      ps, bench: (t.bench || []).map(b => ({ ...b })), mentality: t.mentality || 0, pressing: t.pressing ?? 1, formation: t.formation,
      width: t.width ?? 1, line: t.line ?? 0, takers: t.takers || {},
      dir: side === 0 ? 1 : -1, stadium: t.stadium,
    };
  }

  // ---------------- cycle de vie ----------------
  start() { this.running = true; this.last = performance.now(); A.audioInit(); A.crowd(0.25); requestAnimationFrame(this.loop); }
  destroy() { this.running = false; window.removeEventListener('resize', this.resize); document.removeEventListener('visibilitychange', this.onVis); this.renderer3d?.dispose(); this.renderer3d = null; A.stopDrums(); A.stopChant(); A.crowd(0); }
  resize() {
    const nav = typeof navigator === 'undefined' ? {} : navigator;
    const ratio = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
    const dpr = getRenderDpr(this.settings.quality, {
      pixelRatio: ratio, deviceMemory: nav.deviceMemory, hardwareConcurrency: nav.hardwareConcurrency
    });
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.W = this.canvas.width; this.H = this.canvas.height; this.dpr = dpr;
  }
  updateRenderBudget(frameMs, now) {
    if (this.settings.quality === 'low') return;
    const sample = clamp(Number.isFinite(frameMs) ? frameMs : 1000 / 60, 0, 120);
    this.frameAverageMs += (sample - this.frameAverageMs) * 0.08;
    this.performanceSamples++;
    if (this.performanceSamples < 45 || now - this.lastPerformanceTransition < (this.autoReduced ? 5500 : 1800)) return;
    const targetFps = this.settings.fps === 30 ? 30 : 60;
    if (!this.autoReduced && shouldReduceRenderDetail(this.frameAverageMs, targetFps)) {
      this.autoReduced = true;
      this.lastPerformanceTransition = now;
    } else if (this.autoReduced && canRestoreRenderDetail(this.frameAverageMs, targetFps)) {
      this.autoReduced = false;
      this.lastPerformanceTransition = now;
    }
  }
  loop(now) {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    if (this.settings.fps === 30 && (this.frameSkip ^= 1)) return;
    let dt = Math.min(0.1, (now - this.last) / 1000);
    if (!this.paused) this.updateRenderBudget(dt * 1000, now);
    this.last = now;
    if (this.net) this.net.frame(dt); // match en ligne : l'état vient du serveur
    else if (!this.paused) {
      if (this.replay) this.updateReplay(dt);
      else { if (this.tvWipeT > 0) this.tvWipeT = Math.max(0, this.tvWipeT - dt); this.acc += dt; while (this.acc >= DT) { this.step(DT); this.acc -= DT; } }
    }
    this.render();
  }
  // Commentaire : clé (ou liste de clés de la plus spécifique à la plus générale).
  say(keys, vars = {}, priority = false) {
    this.commentMemory = this.commentMemory || new Map();
    const line = pickLine(this.settings.lang || 'fr', keys, this.r, this.commentMemory); if (!line) return;
    const T = this.teams;
    const all = { h: T[0].short, a: T[1].short, sh: this.score[0], sa: this.score[1], st: T[0].stadium || 'stade', ...vars };
    const s = fillLine(line.text, all);
    this.ticker = s; this.tickerT = 4; this.lastCommentKey = line.key;
    if (this.settings.voice) A.speak(s, this.settings.lang, priority);
  }
  // Réactions du public : les tribunes soutiennent l'équipe qui reçoit (camp 0).
  crowdReact(kind, team = 0) {
    const home = team === 0;
    if (kind === 'goal') { if (home) { A.roar(); this.nextChantT = 25; } else A.groan(); }
    else if (kind === 'save') { if (home) A.applause(2.2); else A.ooh(0.8); }
    else if (kind === 'miss' || kind === 'post') { if (home) A.ooh(kind === 'post' ? 1 : 0.7); else A.applause(1.2, 25); }
    else if (kind === 'foul') { if (!home) A.crowdWhistles(1.4); }
    else if (kind === 'card') { if (home) A.crowdWhistles(2.2); else A.applause(1.4, 30); }
  }
  banner(text, t = 2) { this.msg = text; this.msgT = t; }

  // ---------------- positions ----------------
  formationPos(p, inPoss) {
    const T = this.teams[p.team], d = T.dir, b = this.ball;
    const bnx = b.x * d, bny = b.y * d;
    let [bx, by] = p.base;
    if (p.isGK) {
      const gx = -HL + 1.5 + clamp((bnx + HL) * 0.04, 0, 4);
      return [gx * d, clamp(bny * 0.15, -2.5, 2.5) * d];
    }
    const line = bx < -28 ? 0 : bx < -12 ? 1 : 2;
    const push = (inPoss ? [20, 24, 27] : [7, 6, 4])[line] + (T.liveMentality ?? T.mentality) * 3 + (line === 0 ? T.line * 4 : T.line * 2);
    let nx = bx + push + bnx * (inPoss ? 0.38 : 0.42) + (p.instr === 'def' ? -6 : p.instr === 'att' && inPoss ? 6 : 0);
    let ny = by * (inPoss ? 1.08 : 0.72) * (0.85 + T.width * 0.15) + bny * (inPoss ? 0.18 : 0.32);
    if (!inPoss) {
      nx = Math.min(nx, bnx + 6 + (line === 2 ? 14 : 0));
      // Bloc défensif compact : les lignes coulissent ensemble vers le ballon.
      const blockShift = clamp((bnx - bx) * 0.12, -7, 7);
      nx += blockShift;
      ny += clamp((bny - by) * 0.16, -5.5, 5.5);
      // Réduire les espaces entre les lignes lorsque l'adversaire attaque.
      if (line === 1) nx -= 1.8;
      if (line === 0) nx -= 0.8;
    }
    // appel en profondeur des attaquants
    if (inPoss && p.run > 0) {
      const burst = line === 2 ? 13 : line === 1 ? 8 : 3;
      nx += burst;
      // écarter légèrement les appels pour ouvrir une ligne de passe.
      ny += Math.sign(by || p.y || 1) * (line === 2 ? 1.8 : 1.1);
    }
    nx = clamp(nx, -HL + 3, HL - 4); ny = clamp(ny, -HW + 1.5, HW - 1.5);
    return [nx * d, ny * d];
  }
  setupKickoff(team) {
    this.kickTeam = team;
    if (this.half === 1 && !this.saidKickoff) {
      this.saidKickoff = true;
      const flavor = getMatchFlavor(this.teams[0].id, this.teams[1].id);
      this.say(flavor ? ['kickoff_' + flavor, 'kickoff'] : 'kickoff', {}, true);
      if (flavor) this.nextChantT = 4;
    } else if (this.half === 2 && !this.saidSecondHalf) { this.saidSecondHalf = true; this.say('second_half', {}, true); }
    for (const T of this.teams) for (const p of T.ps) {
      const [bx, by] = p.base;
      const nx = p.isGK ? -HL + 1.5 : Math.min(bx * 0.95, -1.5), ny = by * 0.85;
      p.x = nx * T.dir; p.y = ny * T.dir; p.vx = p.vy = 0;
    }
    const T = this.teams[team];
    const taker = T.ps.filter(p => !p.isGK && !p.sentOff).sort((a, b) => b.base[0] - a.base[0])[0];
    taker.x = -0.6 * T.dir; taker.y = 0;
    const b = this.ball; b.x = b.y = b.z = b.vx = b.vy = b.vz = 0; b.owner = null;
    this.restart = { type: 'kickoff', team, taker, x: 0, y: 0 };
    this.state = 'restart'; this.stateT = 1.4;
    if (this.userSide === team) this.select(taker);
  }
  setRestart(type, team, x, y) {
    this.passInfo = null;
    const T = this.teams[team];
    if (type === 'corner') this.say('corner', { t: T.short });
    let taker;
    if (type === 'goalkick') taker = T.ps[0];
    else taker = T.ps.filter(p => !p.sentOff && !p.isGK).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
    if (type === 'penalty') taker = T.ps.filter(p => !p.sentOff && !p.isGK).sort((a, b) => b.a.sho - a.a.sho)[0];
    const pref = { penalty: T.takers.penalty, corner: T.takers.corner, freekick: T.takers.freekick }[type];
    const designated = pref && T.ps.find(p => p.id === pref && !p.sentOff);
    if (designated && (type === 'penalty' || Math.hypot(designated.x - x, designated.y - y) < 40)) taker = designated;
    const b = this.ball; b.x = x; b.y = y; b.z = 0; b.vx = b.vy = b.vz = 0; b.owner = null;
    this.restart = { type, team, taker, x, y };
    if (this.humans?.[team] && taker && !taker.isGK) this.humans[team].selected = taker;
    this.wall = null;
    if (type === 'freekick') {
      const plan = getFreeKickWall({ x, y }, T.dir);
      if (plan.count) {
        const defenders = this.teams[1 - team].ps.filter(p => !p.sentOff && !p.isGK)
          .sort((a, c) => Math.hypot(a.x - plan.slots[0].x, a.y - plan.slots[0].y) - Math.hypot(c.x - plan.slots[0].x, c.y - plan.slots[0].y));
        this.wall = plan.slots.map((slot, i) => ({ p: defenders[i], x: slot.x, y: slot.y })).filter(w => w.p);
      }
    }
    this.state = 'restart'; this.stateT = type === 'penalty' ? 2.2 : type === 'throw' ? 0.9 : type === 'corner' ? 2.1 : 1.3;
    if (type === 'corner') this.stats.corners[team]++;
    if (this.userSide === team) this.select(taker);
    else if (this.userSide != null) this.autoSelectDefender();
  }

  // ---------------- simulation ----------------
  step(dt) {
    if (this.tickerT > 0) this.tickerT -= dt;
    if (this.msgT > 0) this.msgT -= dt;
    this.goalFxT = Math.max(0, (this.goalFxT || 0) - dt);
    this.matchIntroT = Math.max(0, (this.matchIntroT || 0) - dt);
    for (const T of this.teams) for (const p of T.ps) { p.diveT = Math.max(0, (p.diveT || 0) - dt); p.slideT = Math.max(0, (p.slideT || 0) - dt); p.saveT = Math.max(0, (p.saveT || 0) - dt); }
    if (this.state === 'restart') return this.stepRestart(dt);
    if (this.state === 'goal') {
      this.stateT -= dt; this.goalCrowdT = Math.max(0, (this.goalCrowdT || 0) - dt);
      this.goalCrowdPulseT = (this.goalCrowdPulseT || 0) - dt;
      if (this.goalCrowdPulseT <= 0) {
        this.goalCrowdPulseT = 0.18;
        A.crowd(0.42 + 0.48 * Math.max(0, this.goalCrowdT / 2.2));
      }
      this.moveAll(dt, true); this.physics(dt);
      if (this.stateT <= 0) { A.crowd(0.3); this.startReplay(); }
      return;
    }
    if (this.state === 'halftime') { this.stateT -= dt; if (this.stateT <= 0) { this.half = 2; for (const T of this.teams) T.dir *= -1; this.setupKickoff(1); } return; }
    if (this.state === 'shootout') return this.stepShootout(dt);
    if (this.state === 'fulltime') { this.stateT -= dt; if (this.stateT <= 0 && !this.ended) { if (this.needsShootout()) this.startShootout(); else this.finish(); } return; }
    // horloge
    this.clock += dt;
    const gm = this.clock / this.secondsPerMinute + (this.half === 2 ? 45 : 0);
    this.minute = Math.min(gm, this.half === 1 ? 45 + 2 : 90 + 4);
    const limit = this.half === 1 ? 45 + this.addTime(1) : 90 + this.addTime(2);
    if (gm >= limit && !this.ball.inFlightShot) {
      A.whistle(true);
      if (this.half === 1) { this.state = 'halftime'; this.stateT = 2.5; this.clock = 0; this.banner('MI-TEMPS', 2.5); this.say('half', {}, true); }
      else { this.state = 'fulltime'; this.stateT = 2.5; this.banner('FIN DU MATCH', 2.5); const w = this.score[0] === this.score[1] ? null : this.teams[this.score[0] > this.score[1] ? 0 : 1].short; this.say(w ? ['full_win', 'full'] : ['full_draw', 'full'], { w }, true); if (w && this.score[0] > this.score[1]) A.applause(3.5, 60); else if (w) A.crowdWhistles(2.5); }
      return;
    }
    const own = this.ball.owner ? this.ball.owner.team : this.ball.lastTeam;
    this.stats.poss[own] += dt;
    this.ai(dt); this.userControl(dt); this.moveAll(dt); this.physics(dt); this.contacts(dt); this.rules();
    this.record();
    for (const T of this.teams) for (const p of T.ps) if (!p.sentOff) p.minutes += dt / this.secondsPerMinute;
    // ambiance
    const b = this.ball;
    const attackThreat = clamp((Math.abs(b.x) - 17) / 35, 0, 1);
    const shotThreat = b.inFlightShot ? 0.24 : 0;
    const boxThreat = b.owner && Math.abs(b.owner.x) > 34 && Math.abs(b.owner.y) < 21 ? 0.18 : 0;
    const atk = clamp(0.18 + attackThreat * 0.42 + shotThreat + boxThreat, 0.18, 0.92);
    if ((this.crowdT = (this.crowdT || 0) + dt) > 0.45) { this.crowdT = 0; A.crowd(atk); }
    this.updateAtmosphere(dt);
  }
  // Temps forts du commentaire et chants des tribunes au fil du match.
  updateAtmosphere(dt) {
    if (this.state !== 'play') return;
    if (this.half === 2 && this.minute >= 85 && !this.saidLate) { this.saidLate = true; this.say('late', {}, true); }
    // Domination : le ballon reste longtemps dans le dernier tiers d'une équipe.
    const b = this.ball, holder = b.owner?.team ?? b.lastTeam;
    const inFinalThird = holder != null && (b.x * this.teams[holder].dir) > 17;
    this.pressureT = inFinalThird && holder === this.pressureTeam ? (this.pressureT || 0) + dt : 0;
    if (!inFinalThird || holder !== this.pressureTeam) this.pressureTeam = holder;
    this.pressureCd = Math.max(0, (this.pressureCd || 0) - dt);
    if (this.pressureT > 9 && this.pressureCd <= 0) { this.pressureCd = 60; this.say('pressure', { t: this.teams[holder].short }); }
    // Adjoint : signale une seule fois chaque joueur blessé ou épuisé de l'équipe du joueur humain.
    if (this.userSide != null && (this.coachT = (this.coachT || 0) + dt) > 6) {
      this.coachT = 0; this.coachWarned = this.coachWarned || new Set();
      const T = this.teams[this.userSide];
      const urgent = getCoachAdvice(T, { minute: this.minute, goalDiff: 0, subsLeft: this.subsLeft[this.userSide] })
        .find(a => a.type === 'sub' && /blessé|épuisé/.test(a.reason) && !this.coachWarned.has(a.outName));
      if (urgent) { this.coachWarned.add(urgent.outName); this.ticker = `🧑‍💼 Adjoint : ${urgent.outName} ${urgent.reason} — remplacement conseillé (pause)`; this.tickerT = 5; }
    }
    // Chants : régulièrement, plus souvent quand l'équipe à domicile mène ou pousse.
    this.nextChantT = (this.nextChantT ?? 30 + this.r() * 20) - dt;
    if (this.nextChantT <= 0) {
      const homeLeads = this.score[0] > this.score[1];
      A.chant(homeLeads ? 9 : 6);
      this.nextChantT = (homeLeads ? 28 : 45) + this.r() * 25;
    }
  }
  addTime(h) { return this._add?.[h] ?? ((this._add = this._add || {})[h] = h === 1 ? 1 + Math.floor(this.r() * 2) : 2 + Math.floor(this.r() * 4)); }

  stepRestart(dt) {
    const R = this.restart, b = this.ball;
    this.stateT -= dt;
    // placement des joueurs
    for (const T of this.teams) for (const p of T.ps) {
      if (p.sentOff) continue;
      let tx, ty;
      if (p === R.taker) {
        const spot = getRestartTakerSpot(R, T.dir); tx = spot.x; ty = spot.y;
      } else if (R.type === 'penalty') {
        if (p.isGK && p.team !== R.team) { tx = this.teams[p.team].dir * -HL + this.teams[p.team].dir * 0.3; ty = 0; }
        else { const d = this.teams[R.team].dir; tx = d * 30 + (p.i % 5) * d * 1.2; ty = (p.i - 5) * 2.2; }
      } else if (R.type === 'kickoff') {
        const [bx, by] = p.base; tx = (p.isGK ? -HL + 1.5 : Math.min(bx * 0.95, -1.5)) * T.dir; ty = by * 0.85 * T.dir;
      } else if (R.type === 'corner') {
        const atk = p.team === R.team, d = this.teams[R.team].dir;
        if (p.isGK) { const pd = this.teams[p.team].dir; tx = -HL * pd + pd * 0.8; ty = 0; }
        else if (atk && p.base[0] > -30) { tx = d * (HL - 7 - (p.i % 3) * 3); ty = ((p.i % 5) - 2) * 3.5; }
        else if (!atk) { tx = d * (HL - 5 - (p.i % 4) * 2.5); ty = ((p.i % 6) - 2.5) * 3; }
        else { const fp = this.formationPos(p, true); tx = fp[0]; ty = fp[1]; }
      } else {
        const slot = this.wall?.find(w => w.p === p);
        if (slot) { tx = slot.x; ty = slot.y; }
        else { const fp = this.formationPos(p, p.team === R.team); tx = fp[0]; ty = fp[1]; }
      }
      // Règle des 9,15 m : les adversaires reculent sur les coups de pied arrêtés.
      if (p !== R.taker && p.team !== R.team && !p.isGK && ['freekick', 'corner'].includes(R.type) && !this.wall?.some(w => w.p === p)) {
        const gap = Math.hypot(tx - R.x, ty - R.y);
        if (gap < 9.15) {
          const ux = gap > 0.01 ? (tx - R.x) / gap : -this.teams[R.team].dir, uy = gap > 0.01 ? (ty - R.y) / gap : 0;
          tx = clamp(R.x + ux * 9.4, -HL + 1, HL - 1); ty = clamp(R.y + uy * 9.4, -HW + 1, HW - 1);
        }
      }
      this.moveTo(p, tx, ty, dt, 1.4, true);
    }
    // Les placements de remise en jeu sont réellement exécutés (course vers la position).
    this.moveAll(dt);
    b.x = R.x; b.y = R.y; b.z = 0; b.vx = b.vy = b.vz = 0; b.owner = null;
    // Le coup de sifflet attend que le tireur et le mur soient en place (3 s max),
    // puis il est calé derrière le ballon : le ballon ne se téléporte jamais vers lui.
    const spot = getRestartTakerSpot(R, this.teams[R.team].dir);
    const wallReady = !this.wall || this.wall.every(w => Math.hypot(w.p.x - w.x, w.p.y - w.y) < 0.9);
    if (this.stateT <= 0 && (Math.hypot(R.taker.x - spot.x, R.taker.y - spot.y) > 1.2 || !wallReady) && (R.wait || 0) < 3) {
      R.wait = (R.wait || 0) + dt; return;
    }
    if (this.stateT <= 0) {
      R.taker.x = spot.x; R.taker.y = spot.y; R.taker.vx = 0; R.taker.vy = 0;
      b.owner = R.taker; b.last = R.taker; b.lastTeam = R.team; R.taker.cd = 0;
      this.state = 'play'; this.setPiece = R.type; this.setPieceT = 0;
      if (R.type !== 'throw' && R.type !== 'goalkick') A.whistle();
      if (R.taker && (this.userSide !== R.team || R.type === 'goalkick')) R.taker.aiThink = 0.35;
    }
  }

  select(p) { if (p && !p.sentOff) this.selected = p; }
  // Joueur dirigé par un humain : le joueur local, ou l'un des deux joueurs d'un match en ligne.
  isHuman(p) {
    if (!p) return false;
    if (p === this.selected && p.team === this.userSide) return true;
    const h = this.humans?.[p.team];
    return !!(h && h.connected !== false && h.selected === p);
  }
  // Le tireur d'un coup de pied arrêté ne peut pas partir balle au pied.
  isSetPieceLocked() {
    return !!(this.setPiece && this.restart && this.ball.owner && this.ball.owner === this.restart.taker);
  }
  autoSelectDefender() {
    if (this.userSide == null) return;
    const T = this.teams[this.userSide], b = this.ball;
    let best = null, bd = 1e9;
    for (const p of T.ps) { if (p.isGK || p.sentOff) continue; const d = getSwitchCandidateScore(p, b, T.dir); if (d < bd) { bd = d; best = p; } }
    this.select(best);
  }
  switchPlayer() {
    if (this.userSide == null) return;
    const T = this.teams[this.userSide], b = this.ball;
    const cand = T.ps.filter(p => !p.isGK && !p.sentOff && p !== this.selected)
      .sort((a, c) => getSwitchCandidateScore(a, b, T.dir) - getSwitchCandidateScore(c, b, T.dir));
    if (cand[0]) this.select(cand[0]);
  }

  speedOf(p, sprint) {
    const base = 5.4 + (p.a.pac / 100) * 3.0;
    let s = base * (sprint ? 1.28 : 1) * (0.72 + 0.28 * p.stamina);
    if (this.ball.owner === p) s *= 0.86 + p.a.dri / 1000;
    if (p.injured) s *= 0.6;
    if (p.team !== this.userSide && this.userSide != null) s *= [0.9, 0.97, 1.02, 1.07][this.settings.difficulty] || 1;
    return s;
  }
  moveTo(p, tx, ty, dt, mult = 1, nostam = false, sprint = false) {
    // Les coéquipiers proches créent une légère zone de séparation : les joueurs
    // ne se superposent plus en soutien, en pressing ou au point de réception.
    const carrier = this.ball.owner === p;
    const inWall = !!this.wall && (this.state === 'restart' || this.isSetPieceLocked()) && this.wall.some(w => w.p === p);
    const avoidance = inWall ? { x: 0, y: 0, strength: 0 } : getTeammateAvoidance(
      p, this.teams[p.team]?.ps || [], carrier ? 1.9 : 2.8
    );
    const avoidDistance = avoidance.strength * (carrier ? 0.48 : 1.3);
    const adjustedX = clamp(tx + avoidance.x * avoidDistance, -HL - 1, HL + 1);
    const adjustedY = clamp(ty + avoidance.y * avoidDistance, -HW - 1, HW + 1);
    // Les consignes tactiques sont lissées pour éviter qu'un joueur hésite
    // lorsque la balle, le porteur ou son rôle change légèrement à chaque image.
    const target = getSmoothedTarget(
      p.moveTargetX, p.moveTargetY, adjustedX, adjustedY, dt, sprint ? 13 : 8
    );
    p.moveTargetX = target.x; p.moveTargetY = target.y;
    const dx = target.x - p.x, dy = target.y - p.y, d = Math.hypot(dx, dy);
    const tuning = getMovementTuning(p.a, p.stamina);
    const maxSpeed = this.speedOf(p, sprint) * mult;
    const desiredSpeed = getArriveSpeed(d, maxSpeed, tuning.acceleration * 1.45);
    const wx = d > 0.025 ? dx / d * desiredSpeed : 0;
    const wy = d > 0.025 ? dy / d * desiredSpeed : 0;
    this.applyVel(p, wx, wy, dt);
    if (sprint && !nostam) p.stamina = Math.max(0.3, p.stamina - dt * 0.012 * (1.2 - p.a.phy / 200));
    else p.stamina = Math.min(1, p.stamina + dt * 0.002);
  }
  applyVel(p, wx, wy, dt) {
    const currentSpeed = Math.hypot(p.vx, p.vy);
    const requestedSpeed = Math.hypot(wx, wy);
    const currentHeading = Number.isFinite(p.heading) ? p.heading :
      (currentSpeed > 0.2 ? Math.atan2(p.vy, p.vx) : Math.atan2(wy || 0, wx || 1));
    const turnFactor = getTurnSpeedFactor(currentHeading, wx, wy, currentSpeed);
    const controlledWx = wx * turnFactor, controlledWy = wy * turnFactor;
    const targetSpeed = Math.hypot(controlledWx, controlledWy);
    const targetHeading = requestedSpeed > 0.15 ? Math.atan2(wy, wx) : currentHeading;
    const delta = Math.atan2(Math.sin(targetHeading - currentHeading), Math.cos(targetHeading - currentHeading));
    p.turn = clamp(delta / Math.PI, -1, 1);
    const tuning = getMovementTuning(p.a, p.stamina);
    // Le freinage et les virages consomment une partie de l'accélération disponible.
    const turnLoad = clamp(Math.abs(delta) / Math.PI, 0, 1);
    const braking = targetSpeed + 0.12 < currentSpeed ? 1.42 : 1;
    const acceleration = tuning.acceleration * braking * (1 - turnLoad * 0.16);
    const next = getVelocityStep(p.vx, p.vy, controlledWx, controlledWy, acceleration * Math.max(0, dt));
    const nextSpeed = Math.hypot(next.vx, next.vy);
    p.motionAccel = clamp((nextSpeed - currentSpeed) / Math.max(0.01, dt) / 12, -1, 1);
    p.vx = next.vx; p.vy = next.vy;
    // Le torse anticipe le virage, alors que la vitesse conserve son inertie.
    const turnRate = tuning.turnRate * (currentSpeed < 1 ? 1.2 : 1);
    p.heading = currentHeading + delta * clamp(dt * turnRate, 0, 1);
    p.face = Math.cos(p.heading) >= 0 ? 1 : -1;
  }
  moveAll(dt, celebrate = false) {
    for (const T of this.teams) for (const p of T.ps) {
      if (p.sentOff) { p.x = 0; p.y = -HW - 6; continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.x = clamp(p.x, -HL - 2, HL + 2); p.y = clamp(p.y, -HW - 2, HW + 2);
      p.motionAccel = (Number.isFinite(p.motionAccel) ? p.motionAccel : 0) * Math.exp(-dt * 2.6);
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > 0.18) p.anim += getRunningCadence(sp, p.a.pac) * dt;
      p.jumpT = Math.max(0, (p.jumpT || 0) - dt);
      p.jumpCd = Math.max(0, (p.jumpCd || 0) - dt);
      p.kickT = Math.max(0, (p.kickT || 0) - dt);
      p.headerT = Math.max(0, (p.headerT || 0) - dt);
      p.firstTouchT = Math.max(0, (p.firstTouchT || 0) - dt);
      p.stumbleT = Math.max(0, (p.stumbleT || 0) - dt);
      p.keeperCatchT = Math.max(0, (p.keeperCatchT || 0) - dt);
      p.keeperPunchT = Math.max(0, (p.keeperPunchT || 0) - dt);
      p.celebrateT = Math.max(0, (p.celebrateT || 0) - dt);
      p.contactT = Math.max(0, (p.contactT || 0) - dt);
      if (sp > 0.3 && Number.isFinite(p.heading)) p.face = Math.cos(p.heading) >= 0 ? 1 : -1;
      if (p.cd > 0) p.cd -= dt; if (p.tackleCd > 0) p.tackleCd -= dt;
      if (p.run > 0) p.run -= dt;
      if (celebrate) { p.vx *= 0.9; p.vy *= 0.9; }
    }
    this.updateAirDuels(dt);
    // Contacts corporels : séparation souple, puis transfert d'impulsion
    // lorsque deux adversaires se rencontrent à vitesse réelle.
    const all = this.teams[0].ps.concat(this.teams[1].ps);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const a = all[i], c = all[j]; if (a.sentOff || c.sentOff) continue;
      const contact = getPlayerContactNormal(a, c, i * 23 + j);
      const nx = contact.x, ny = contact.y, d = contact.distance;
      if (d < 1.02) {
        const overlap = 1.02 - d;
        const push = overlap * 0.48;
        a.x -= nx * push; a.y -= ny * push; c.x += nx * push; c.y += ny * push;
        const closing = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;
        if (closing > 0.8) {
          const impact = getBodyContactAssessment(a, c, closing);
          a.vx -= nx * impact.impulseA; a.vy -= ny * impact.impulseA;
          c.vx += nx * impact.impulseB; c.vy += ny * impact.impulseB;
          if (a.team !== c.team && closing > 2.6) {
            if (impact.staggerA > 0.22) {
              a.contactT = Math.max(a.contactT || 0, 0.12 + impact.staggerA * 0.12);
              a.contactDir = -1;
            }
            if (impact.staggerB > 0.22) {
              c.contactT = Math.max(c.contactT || 0, 0.12 + impact.staggerB * 0.12);
              c.contactDir = 1;
            }
            if (impact.staggerA > 0.38) {
              a.stumbleT = Math.max(a.stumbleT || 0, 0.07 + impact.staggerA * 0.15);
              a.stumbleDir = -1;
            }
            if (impact.staggerB > 0.38) {
              c.stumbleT = Math.max(c.stumbleT || 0, 0.07 + impact.staggerB * 0.15);
              c.stumbleDir = 1;
            }
          }
        }
        // Garder les joueurs dans les limites du terrain après le choc.
        a.x = clamp(a.x, -HL - 2, HL + 2); a.y = clamp(a.y, -HW - 2, HW + 2);
        c.x = clamp(c.x, -HL - 2, HL + 2); c.y = clamp(c.y, -HW - 2, HW + 2);
      }
    }
  }

  // Duel aérien : un seul joueur prioritaire par équipe attaque le point de chute.
  // Cela limite les sauts simultanés artificiels et valorise détente, physique et jeu de tête.
  updateAirDuels(dt) {
    const b = this.ball;
    if (b.inFlightShot || b.z < 1.25 || b.z > 5.4) return;
    const landing = this.ballLanding();
    for (const T of this.teams) {
      const candidates = T.ps.filter(p => !p.sentOff && !p.isGK && p.jumpCd <= 0 && !p.injured)
        .map(p => {
          const dist = Math.hypot(p.x - landing.x, p.y - landing.y);
          const jumpSkill = ((p.a.hea || 50) * 0.58 + (p.a.phy || 50) * 0.42) / 100;
          return { p, dist, score: dist - jumpSkill * 0.72 };
        })
        .filter(x => x.dist < 4.8)
        .sort((a, c) => a.score - c.score);
      const best = candidates[0];
      if (!best) continue;
      const p = best.p;
      p.jumpT = 0.46;
      p.jumpCd = 0.92;
      p.heading = Math.atan2(b.y - p.y, b.x - p.x);
      p.headerDir = 1;
      p.face = Math.cos(p.heading) >= 0 ? 1 : -1;
      p.vx += clamp((landing.x - p.x) * 0.18, -1.8, 1.8);
      p.vy += clamp((landing.y - p.y) * 0.18, -1.8, 1.8);
    }
  }

  // ---------------- IA ----------------
  ai(dt) {
    const b = this.ball, own = b.owner;
    const possTeam = own ? own.team : (b.last ? b.lastTeam : -1);
    // Remplacements automatiques pour les équipes pilotées par l'IA.
    this.autoSubT = Math.max(0, (this.autoSubT || 0) - dt);
    if (this.autoSubT <= 0 && this.minute >= 58) {
      this.autoSubT = 8;
      for (const team of this.teams) {
        if (team.side === this.userSide || this.subsLeft[team.side] <= 0) continue;
        const candidates = team.ps.map((p, idx) => ({ p, idx })).filter(v => !v.p.isGK && !v.p.sentOff && !v.p.subbedOff && (v.p.stamina < 0.43 || v.p.injured));
        candidates.sort((a, b) => (a.p.stamina - (a.p.injured ? 0.18 : 0)) - (b.p.stamina - (b.p.injured ? 0.18 : 0)));
        const tired = candidates[0];
        if (!tired) continue;
        const bench = team.bench.map((p, idx) => ({ p, idx })).filter(v => !v.p.used && v.p.pos !== 'GK');
        bench.sort((a, b) => {
          const posA = a.p.pos === tired.p.pos ? 3 : (String(a.p.pos || '')[0] === String(tired.p.pos || '')[0] ? 1 : 0);
          const posB = b.p.pos === tired.p.pos ? 3 : (String(b.p.pos || '')[0] === String(tired.p.pos || '')[0] ? 1 : 0);
          return (posB * 10 + (b.p.fitness ?? 1) * 4 + (b.p.attrs?.pac ?? 50) / 100) - (posA * 10 + (a.p.fitness ?? 1) * 4 + (a.p.attrs?.pac ?? 50) / 100);
        });
        const fresh = bench[0];
        if (fresh && ((fresh.p.fitness ?? 1) > tired.p.stamina + 0.12 || tired.p.injured)) this.substitute(team.side, tired.idx, fresh.idx);
      }
    }
    // Ajustement tactique contextuel : le score et le temps influencent
    // progressivement la prise de risque sans écraser les réglages initiaux.
    for (const T of this.teams) {
      const goalDiff = this.score[T.side] - this.score[1 - T.side];
      const lateFactor = clamp((this.minute - 58) / 32, 0, 1);
      // L'équipe du joueur humain applique exactement ses consignes : pas d'ajustement caché.
      const coachedByAI = T.side !== this.userSide;
      const urgency = coachedByAI && goalDiff < 0 ? lateFactor * Math.min(1.25, 0.45 + Math.abs(goalDiff) * 0.32) : 0;
      const protectLead = coachedByAI && goalDiff > 0 ? lateFactor * Math.min(0.9, 0.28 + goalDiff * 0.22) : 0;
      T.liveMentality = clamp(T.mentality + urgency * 0.85 - protectLead * 0.48, -2, 2);
      T.livePressing = clamp(T.pressing + urgency * 1.2 - protectLead * 0.45, 0, 3);
      const inPoss = possTeam === T.side;
      const supportPlayers = T.ps.filter(p => !this.isHuman(p));
      const attackingPlan = inPoss && own
        ? getAttackingSupportPlan(supportPlayers, own, this.teams[1 - T.side].ps, T.dir)
        : [];
      const supportByPlayer = new Map(attackingPlan.map(entry => [entry.player, entry]));
      // presseurs
      let pressers = [], pressingPlan = [], markingPlan = [];
      let interceptor = null, interceptPoint = null;
      if (!inPoss) {
        const cand = T.ps.filter(p => !p.isGK && !p.sentOff).map(p => ({ p, d: Math.hypot(p.x - b.x, p.y - b.y) })).sort((a, c) => a.d - c.d);
        const pressing = T.livePressing ?? T.pressing;
        pressingPlan = own ? getPressingPlan(T.ps, own, T.dir, pressing) : [];
        pressers = pressingPlan.map(entry => entry.player);
        if (pressing < 0.5 && cand[0] && Math.abs(b.x - (-HL * T.dir)) > 50) { pressers = []; pressingPlan = []; }
        // Sur une passe aérienne ou tendue, un défenseur anticipe le point
        // de coupe au lieu de poursuivre aveuglément le porteur précédent.
        const ballSpeed2 = b.vx * b.vx + b.vy * b.vy;
        if (!b.owner && !b.inFlightShot && ballSpeed2 > 25) {
          let bestScore = Infinity;
          for (const p of T.ps) {
            if (p.isGK || p.sentOff) continue;
            const rawT = ((p.x - b.x) * b.vx + (p.y - b.y) * b.vy) / ballSpeed2;
            const t = clamp(rawT, 0.12, 1.35);
            const ix = clamp(b.x + b.vx * t * 0.82, -HL + 1, HL - 1);
            const iy = clamp(b.y + b.vy * t * 0.82, -HW + 1, HW - 1);
            const score = Math.hypot(ix - p.x, iy - p.y) / this.speedOf(p, true) + t * 0.42;
            if (score < bestScore) { bestScore = score; interceptor = p; interceptPoint = { x: ix, y: iy }; }
          }
        }
        const markingCandidates = T.ps.filter(p => !pressers.includes(p) && p !== interceptor &&
          !this.isHuman(p));
        markingPlan = getDefensiveMarkAssignments(
          markingCandidates, this.teams[1 - T.side].ps, b, -HL * T.dir
        );
      }
      const markingByPlayer = new Map(markingPlan.map(entry => [entry.player, entry]));
      for (const p of T.ps) {
        if (p.sentOff) continue;
        if (this.isHuman(p)) continue; // contrôlé par un joueur humain
        if (p === own) { this.aiCarrier(p, dt); continue; }
        if (p.isGK) { this.aiKeeper(p, dt); continue; }
        const locked = this.isSetPieceLocked();
        const wallSlot = locked && this.wall?.find(w => w.p === p);
        if (wallSlot) { this.moveTo(p, wallSlot.x, wallSlot.y, dt, 1, true); continue; }
        if (locked && !inPoss && ['freekick', 'corner', 'kickoff'].includes(this.setPiece)) {
          // Défenseurs à distance réglementaire jusqu'à ce que le ballon soit joué.
          let [fx, fy] = this.formationPos(p, false);
          const gap = Math.hypot(fx - b.x, fy - b.y), minGap = this.setPiece === 'kickoff' ? 9.15 : 9.4;
          if (gap < minGap) { const ux = gap > 0.01 ? (fx - b.x) / gap : -T.dir, uy = gap > 0.01 ? (fy - b.y) / gap : 0; fx = b.x + ux * minGap; fy = b.y + uy * minGap; }
          this.moveTo(p, clamp(fx, -HL + 1, HL - 1), clamp(fy, -HW + 1, HW - 1), dt, 1, true);
          continue;
        }
        // receveur désigné : va au-devant du ballon
        const pi = this.passInfo;
        if (!own && pi && pi.to === p && pi.t < 3) { const tgt = this.receivePoint(p, pi); this.moveTo(p, tgt.x, tgt.y, dt, 1, false, true); continue; }
        // Interception prioritaire : le défenseur désigné coupe la ligne de passe.
        if (!own && interceptor === p && interceptPoint) {
          this.moveTo(p, interceptPoint.x, interceptPoint.y, dt, 1.08, false, true);
          continue;
        }
        // balle libre : le plus proche va la chercher
        if (!own) {
          const t = this.ballLanding();
          const mine = this.closestTo(T, t.x, t.y);
          if (mine === p) { this.moveTo(p, t.x, t.y, dt, 1, false, true); continue; }
        }
        if (pressers.includes(p) && own) {
          const assignment = pressingPlan.find(entry => entry.player === p);
          const tx = assignment?.x ?? own.x + (own.vx || 0) * 0.35;
          const ty = assignment?.y ?? own.y + (own.vy || 0) * 0.35;
          this.moveTo(p, tx, ty, dt, assignment?.role === 'press' ? 1.08 : 0.98, false, true);
          if (assignment?.role === 'press') this.tryTackle(p, false);
          continue;
        }
        let [tx, ty] = this.formationPos(p, inPoss);
        if (inPoss && own && p !== own && !p.isGK) {
          // Soutien offensif : proposer une solution devant le porteur,
          // tout en conservant l'écartement des joueurs de couloir.
          const advance = clamp((own.x * T.dir + 8) / 34, 0, 1);
          const side = Math.sign(p.base[1] || p.y || 1);
          const wideRole = Math.abs(p.base[1]) > 13 || p.instr === 'run';
          const forwardRun = p.run > 0 || (wideRole && advance > 0.35);
          if (forwardRun) {
            const lead = p.run > 0 ? 8 : 4 + advance * 5;
            tx = clamp(Math.max(tx, own.x + T.dir * lead) , -HL + 3, HL - 3);
            if (wideRole) ty = clamp(ty * 0.55 + side * (13 + advance * 5) * 0.45, -HW + 2, HW - 2);
            else ty = clamp(ty * 0.72 + own.y * 0.28, -HW + 3, HW - 3);
          } else if (advance > 0.5) {
            // Les milieux proches se placent en diagonale pour créer un angle de passe.
            ty = clamp(ty * 0.78 + (own.y + side * 4) * 0.22, -HW + 3, HW - 3);
          }
          const support = supportByPlayer.get(p);
          if (support) {
            const weight = support.role === 'forward-run' ? 0.82 : support.role === 'diagonal-run' ? 0.78 : support.role === 'wide-support' ? 0.72 : 0.64;
            tx = lerp(tx, support.x, weight);
            ty = lerp(ty, support.y, weight);
          }
        }
        if (!inPoss) {
          const mark = markingByPlayer.get(p);
          if (mark) {
            p.markedOpponentId = mark.opponent.id;
            const weight = p.instr === 'mark' ? 0.9 : 0.66;
            // Chaque défenseur suit sa menace propre, sans abandonner sa zone de départ.
            tx = lerp(tx, mark.x, weight);
            ty = lerp(ty, mark.y, weight);
          }
        }
        this.moveTo(p, tx, ty, dt, 1, false, Math.hypot(tx - p.x, ty - p.y) > 12);
      }
    }
  }
  // point de réception : projection du joueur sur la trajectoire du ballon
  receivePoint(p, pi) {
    const b = this.ball, vx = b.vx, vy = b.vy, v2 = vx * vx + vy * vy;
    if (v2 < 4) return { x: b.x, y: b.y };
    const t = clamp(((p.x - b.x) * vx + (p.y - b.y) * vy) / v2, 0.05, 2);
    return { x: b.x + vx * t, y: b.y + vy * t };
  }
  closestTo(T, x, y) {
    let best = null, bd = 1e9;
    for (const p of T.ps) { if (p.sentOff || p.isGK) continue; const d = Math.hypot(p.x - x, p.y - y) / this.speedOf(p, true); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  ballLanding() {
    const b = this.ball;
    if (b.z < 0.5 && Math.hypot(b.vx, b.vy) < 2) return { x: b.x, y: b.y };
    const tz = b.vz > 0 || b.z > 0 ? (b.vz + Math.sqrt(b.vz * b.vz + 2 * G * b.z)) / G : 0;
    const t = clamp(Math.max(tz, 0.35), 0, 2);
    return { x: clamp(b.x + b.vx * t * 0.8, -HL, HL), y: clamp(b.y + b.vy * t * 0.8, -HW, HW) };
  }
  aiKeeper(p, dt) {
    const T = this.teams[p.team], b = this.ball, d = T.dir, gx = -HL * d;
    // Lecture anticipée du tir : le gardien se replace sur la trajectoire
    // et déclenche son plongeon avant que le ballon n'arrive sur la ligne.
    const shot = b.inFlightShot;
    if (shot && shot.team !== p.team && Math.abs(b.vx) > 3) {
      const tcross = (gx - b.x) / b.vx;
      if (tcross > 0.02 && tcross < 1.15) {
        const cy = b.y + b.vy * tcross;
        const cz = b.z + b.vz * tcross - 0.5 * G * tcross * tcross;
        if (Math.abs(cy) < GOAL_W + 1.2 && cz > -0.25 && cz < GOAL_H + 1.2) {
          const targetY = clamp(cy, -GOAL_W + 0.32, GOAL_W - 0.32);
          const gap = targetY - p.y;
          const needsDive = Math.abs(gap) > 0.38 || cz > GOAL_H * 0.76 || cz < 0.42;
          if (tcross < 0.9 && needsDive && p.keeperReactShot !== shot) {
            const dive = getKeeperDiveProfile({
              keeperY: p.y, shotY: targetY, shotZ: cz,
              shotSpeed: Math.hypot(b.vx, b.vy), crossingTime: tcross,
              rating: p.a?.gk ?? 50,
            });
            p.keeperReactShot = shot;
            p.diveDir = dive.direction;
            p.diveHeight = dive.height;
            p.diveStretch = dive.stretch;
            p.diveT = Math.max(p.diveT || 0, dive.duration);
          }
          this.moveTo(p, gx + d * 1.25, targetY, dt, getKeeperFootworkPace(p.a?.gk ?? 50, tcross), true, true);
          return;
        }
      }
    }
    // Sortie maîtrisée sur ballon libre dans la surface.
    const inBox = Math.abs(b.x - gx) < 16 && Math.abs(b.y) < 20;
    if (!b.owner && inBox && Math.hypot(b.x - p.x, b.y - p.y) < 9 && b.z < 2 && !b.inFlightShot) {
      this.moveTo(p, b.x, b.y, dt, 1.1, true, true); return;
    }
    // Placement de base anticipé : rester sur l'angle du ballon et ajuster
    // la profondeur selon la vitesse du jeu et la qualité des appuis du gardien.
    const position = getKeeperPositioning({
      goalX: gx, ballX: b.x, ballY: b.y, ballVx: b.vx, ballVy: b.vy,
      rating: p.a?.gk ?? 50,
    });
    this.moveTo(p, b.inFlightShot ? p.x : position.x, position.y, dt, 1.1, true, true);
  }
  aiCarrier(p, dt) {
    const T = this.teams[p.team], d = T.dir, gx = HL * d;
    if (p.aiThink == null) p.aiThink = 0;
    p.aiThink = Math.max(0, p.aiThink - dt);
    const distG = Math.hypot(gx - p.x, p.y), opp = this.teams[1 - p.team].ps;
    let press = 99; for (const o of opp) if (!o.sentOff) press = Math.min(press, Math.hypot(o.x - p.x, o.y - p.y));
    if (p.isGK) { // dégagement / relance
      this.moveTo(p, p.x, p.y, dt);
      if (p.aiThink <= 0) { const opt = this.bestPass(p, null, false); if (opt && opt.score > -5 && this.r() < 0.6) this.pass(p, opt.p, false); else this.clearance(p); }
      return;
    }
    if (this.isSetPieceLocked()) {
      this.applyVel(p, 0, 0, dt);
      if (p.aiThink > 0) return;
      if (this.setPiece === 'throw' || this.setPiece === 'kickoff') {
        const opt = this.bestPass(p, null, false);
        const near = T.ps.filter(t => t !== p && !t.sentOff && !t.isGK)
          .sort((a, c) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(c.x - p.x, c.y - p.y))[0];
        const target = opt && Math.hypot(opt.tx - p.x, opt.ty - p.y) < (this.setPiece === 'throw' ? 24 : 40) ? opt.p : near;
        if (target) this.pass(p, target, false, this.setPiece === 'throw' && Math.hypot(target.x - p.x, target.y - p.y) > 14);
        else this.clearance(p);
        return;
      }
    }
    if (this.setPiece === 'corner' && p.aiThink <= 0) {
      // Corner : privilégier un centre vers un partenaire placé dans la zone dangereuse.
      const boxTargets = T.ps.filter(t => !t.sentOff && !t.isGK && t !== p && (gx - t.x) * d > -15 && (gx - t.x) * d < 22 && Math.abs(t.y) < 15);
      boxTargets.sort((a, c) => {
        const score = q => q.a.phy * 0.45 + q.a.sho * 0.35 + q.a.pac * 0.2 - Math.abs(q.y) * 0.25;
        return score(c) - score(a);
      });
      if (boxTargets[0]) this.pass(p, boxTargets[0], false, true); else this.cross(p);
      return;
    }
    if (this.setPiece === 'penalty' && p.aiThink <= 0) {
      const keeper = this.teams[1 - p.team].ps[0];
      const side = keeper.y >= 0 ? -1 : 1;
      const aim = side * (2.1 + this.r() * 1.1);
      this.shoot(p, 0.76 + this.r() * 0.18, aim);
      return;
    }
    if (this.setPiece === 'freekick' && p.aiThink <= 0) {
      const freeDist = Math.hypot(gx - p.x, p.y);
      const central = Math.abs(p.y) < 17;
      // Frappe directe dans une zone favorable, sinon combinaison ou centre.
      if (freeDist < 30 && central && this.r() < (freeDist < 23 ? 0.72 : 0.42)) {
        const keeper = this.teams[1 - p.team].ps[0];
        const aim = (keeper.y >= 0 ? -1 : 1) * (1.4 + this.r() * 1.5);
        this.shoot(p, clamp(0.58 + (30 - freeDist) * 0.012, 0.58, 0.88), aim);
      } else {
        const opt = this.bestPass(p, null, false);
        if (opt && opt.score > -2) this.pass(p, opt.p, opt.through, freeDist < 26);
        else this.cross(p);
      }
      return;
    }
    // Conduite : recherche du couloir le plus libre plutôt que course rectiligne.
    let near = null, nd = 99;
    for (const o of opp) {
      if (o.sentOff) continue;
      const dd = Math.hypot(o.x - p.x, o.y - p.y);
      if (dd < nd && (o.x - p.x) * d > -1) { nd = dd; near = o; }
    }
    const lane = getDribbleLaneTarget(p, opp, d, HW, HL);
    const tx = lane.x, ty = lane.y;
    const skill = clamp(((p.a.dri || 50) * 0.62 + (p.a.tec || 50) * 0.38) / 100, 0, 1);
    const pressure = clamp((4.8 - nd) / 4.8, 0, 1);
    const carryPace = clamp(1.01 + (skill - 0.5) * 0.1 - pressure * (0.16 - skill * 0.075), 0.82, 1.08);
    const canSprint = nd > 5.2 && lane.clearance > 3.1 && p.stamina > 0.38;
    this.moveTo(p, tx, clamp(ty, -HW + 2, HW - 2), dt, carryPace, false, canSprint);
    p.carryT = (p.carryT || 0) + dt;
    if (p.aiThink > 0) return;
    p.aiThink = 0.3 + this.r() * 0.25;
    const angleOK = Math.abs(p.y) < 19 && (gx - p.x) * d > 0;
    const opt = this.bestPass(p, null, false);
    const keeper = this.teams[1 - p.team].ps[0];
    const shotQuality = getAIShootingQuality({
      distance: distG, shooterY: p.y, pressure: press,
      shooting: p.a.sho, technique: p.a.tec, stamina: p.stamina,
      keeperY: keeper?.y ?? 0,
    });
    // Une solution de passe réellement ouverte réduit les tirs forcés.
    const passAdvantage = opt ? clamp((opt.score - 2) / 26, 0, 1) : 0;
    const urgency = Math.max(0, Number(T.liveMentality) || 0);
    const shootP = clamp((shotQuality.score - 0.52) * 2.0 + urgency * 0.055, 0, 0.8) *
      (1 - passAdvantage * 0.26);
    if (angleOK && this.r() < shootP) { this.shoot(p, clamp(0.5 + (distG / 45), 0.4, 0.95)); return; }
    // centre depuis le couloir
    if ((gx - p.x) * d < 18 && Math.abs(p.y) > 15 && this.r() < 0.45) { this.cross(p); return; }
    const decision = getCarrierPassDecision({
      pressure: press, laneClearance: lane.clearance, option: opt,
      carrierX: p.x, direction: d, carryTime: p.carryT,
      vision: p.a.pas, roll: this.r(),
    });
    if (decision.pass && opt) { this.pass(p, opt.p, opt.through); return; }
  }
  bestPass(p, dir, through) {
    const T = this.teams[p.team], d = T.dir, opp = this.teams[1 - p.team].ps;
    let best = null;
    for (const t of T.ps) {
      if (t === p || t.sentOff) continue;
      let tx = t.x + t.vx * 0.6, ty = t.y + t.vy * 0.6;
      const th = through || (t.base[0] > -14 && t.run > 0);
      if (th) { tx += d * 5; }
      const dx = tx - p.x, dy = ty - p.y, dist = Math.hypot(dx, dy);
      if (dist < 4 || dist > 45) continue;
      let score = (dx * d) * 0.7 - Math.max(0, dist - 25) * 0.4 + (Math.abs(HL * d - tx) < 25 ? 6 : 0);
      if (dir) { const cos = (dx * dir[0] + dy * dir[1]) / dist; if (cos < 0.45) continue; score += cos * 25; }
      const passSpeed = clamp(dist * 0.75 + 7, 9, 22);
      const lane = getPassLaneAssessment(p, { x: tx, y: ty }, opp, dist / passSpeed);
      let open = 99; for (const o of opp) if (!o.sentOff) open = Math.min(open, Math.hypot(o.x + (o.vx || 0) * 0.25 - tx, o.y + (o.vy || 0) * 0.25 - ty));
      score += Math.min(open, 8) * 1.1 + Math.min(lane.clearance, 6) * 0.35 - lane.risk;
      // Récompenser les appels en profondeur seulement si le joueur a de l'espace devant lui.
      if (th && dx * d > 5) score += Math.min(12, Math.max(0, open - 2) * 1.4) + Math.min(7, dx * d * 0.12);
      if (t.run > 0) score += 4;
      if (t.isGK) score -= 12;
      // Un partenaire déjà hors-jeu n'est pas une option : passe annulée par l'arbitre.
      if (getOffsideDecision(t, this.ball, opp, d).offside) score -= 40;
      if (!best || score > best.score) best = { p: t, score, through: th, tx, ty };
    }
    return best;
  }

  // ---------------- actions ----------------
  kickBall(p, vx, vy, vz, power = 0.5) {
    const b = this.ball;
    p.carryT = 0;
    // Choisir le pied le plus proche du ballon dans le repère local du joueur,
    // avant de réorienter le corps vers la trajectoire de frappe.
    const headingBeforeKick = Number.isFinite(p.heading) ? p.heading : Math.atan2(p.vy || 0, p.vx || p.face || 1);
    const ballDx = b.x - p.x, ballDy = b.y - p.y;
    const lateralBallOffset = ballDx * Math.sin(headingBeforeKick) - ballDy * Math.cos(headingBeforeKick);
    if (Math.abs(lateralBallOffset) > 0.055) p.kickFootSide = Math.sign(lateralBallOffset);
    else if (!Number.isFinite(p.kickFootSide) || p.kickFootSide === 0) p.kickFootSide = p.i % 2 === 0 ? -1 : 1;
    b.owner = null; b.vx = vx; b.vy = vy; b.vz = vz; b.z = Math.max(b.z, 0.12); b.last = p; b.lastTeam = p.team;
    p.kickT = 0.34; p.kickStyle = power >= 0.65 ? 'shot' : 'pass'; p.kickPower = power;
    if (Math.hypot(vx, vy) > 0.1) p.heading = Math.atan2(vy, vx);
    p.face = Math.cos(p.heading || 0) >= 0 ? 1 : -1;
    p.kickDir = 1;
    p.cd = 0.35; p.touches++; this.setPiece = null;
    A.kick(power);
  }
  pass(p, t, through, lofted = false) {
    const T = this.teams[p.team], d = T.dir;
    let tx = t.x, ty = t.y;
    const dist0 = Math.hypot(tx - p.x, ty - p.y);
    const lob = lofted || dist0 > 32;
    let speed = clamp(dist0 * (lob ? 0.55 : 0.75) + 7, 9, lob ? 20 : 22);
    const tf = dist0 / speed;
    tx += t.vx * tf * 0.9; ty += t.vy * tf * 0.9;
    if (through) tx += d * (4 + dist0 * 0.08);
    const assist = p.team === this.userSide && this.settings.assist ? 0.5 : 1;
    let pressure = 99;
    for (const o of this.teams[1 - p.team].ps) if (!o.sentOff) pressure = Math.min(pressure, Math.hypot(o.x - p.x, o.y - p.y));
    const pressureError = clamp((3.8 - pressure) / 3.8, 0, 1) * 0.075;
    const balanceError = clamp(Math.hypot(p.vx, p.vy) / 12, 0, 1) * 0.035;
    const err = (1 - p.a.pas / 100) * 0.11 * assist + pressureError + balanceError + (p.team !== this.userSide ? 0.02 : 0);
    let ang = Math.atan2(ty - p.y, tx - p.x) + (this.r() - 0.5) * 2 * err;
    const dist = Math.hypot(tx - p.x, ty - p.y);
    speed = clamp(dist * (lob ? 0.55 : 0.75) + 7, 9, lob ? 20 : 22);
    const vz = lob ? clamp(dist * 0.32, 4, 11) : 0.6;
    const restartExempt = ['corner', 'goalkick', 'throw'].includes(this.setPiece);
    this.kickBall(p, Math.cos(ang) * speed + p.vx * 0.1, Math.sin(ang) * speed + p.vy * 0.1, vz, 0.4);
    this.stats.passes[p.team]++;
    const offsidePlayers = restartExempt ? [] : T.ps.filter(candidate =>
      candidate !== p && !candidate.isGK && !candidate.sentOff &&
      getOffsideDecision(candidate, this.ball, this.teams[1 - p.team].ps, d).offside
    );
    this.passInfo = {
      from: p, to: t, team: p.team, t: 0,
      tx: p.x + Math.cos(ang) * dist, ty: p.y + Math.sin(ang) * dist,
      offsidePlayers
    };
    if (p.team === this.userSide && this.userSide != null) this.select(t);
  }
  cross(p) {
    const T = this.teams[p.team], d = T.dir, opp = this.teams[1 - p.team].ps;
    // Choisir le partenaire qui attaque réellement la zone, pas seulement le plus fort.
    const targets = T.ps.filter(t => !t.sentOff && !t.isGK && t !== p && (d * (t.x - p.x)) > -2 && Math.abs(t.x - d * HL) < 23 && Math.abs(t.y) < 19);
    let target = null, best = -Infinity;
    for (const t of targets) {
      const goalDepth = d * t.x;
      const centrality = 1 - Math.min(1, Math.abs(t.y) / 20);
      let marking = 0;
      for (const o of opp) if (!o.sentOff) {
        const gap = Math.hypot(o.x - t.x, o.y - t.y);
        if (gap < 5) marking += (5 - gap) * 1.8;
      }
      const runBonus = t.run > 0 ? 7 : 0;
      const score = goalDepth * 0.32 + centrality * 8 + t.a.phy * 0.12 + t.a.sho * 0.1 + t.a.hea * 0.18 + runBonus - marking;
      if (score > best) { best = score; target = t; }
    }
    if (target) this.pass(p, target, false, true); else this.clearance(p);
  }
  clearance(p) {
    const d = this.teams[p.team].dir, ang = (this.r() - 0.5) * 0.9;
    const sp = 24 + this.r() * 6;
    this.kickBall(p, Math.cos(ang) * sp * d, Math.sin(ang) * sp, 11 + this.r() * 4, 0.8);
  }
  recordShotOnTarget(shot, y, z) {
    if (!shot || shot.onTargetRecorded || !isShotOnTargetAtGoalLine(y, z)) return false;
    if (shot.team !== 0 && shot.team !== 1) return false;
    this.stats.onTarget[shot.team]++;
    shot.onTargetRecorded = true;
    return true;
  }
  shoot(p, power = 0.7, aimY = null) {
    const T = this.teams[p.team], d = T.dir, gx = HL * d;
    const shotOrigin = { x: p.x, y: p.y, kind: this.setPiece === 'penalty' || this.setPiece === 'freekick' ? this.setPiece : null, distance: Math.hypot(gx - p.x, p.y) };
    const gk = this.teams[1 - p.team].ps[0];
    const movingSpeed = Math.hypot(p.vx, p.vy);
    let pressure = 99;
    for (const o of this.teams[1 - p.team].ps) if (!o.sentOff) pressure = Math.min(pressure, Math.hypot(o.x - p.x, o.y - p.y));
    // Le dosage du bouton distingue frappe rasante, tir placé et frappe puissante.
    const driven = power < 0.38;
    const powerShot = power > 0.82;
    const assist = p.team === this.userSide && this.settings.assist ? 0.72 : (p.team === this.userSide ? 1 : 1.08);
    const skill = clamp(Number(p.a.sho) || 50, 0, 100) / 100;
    const accuracy = getShotAccuracy({
      shooting: p.a.sho, technique: p.a.tec, pressure, movingSpeed, power, assist
    });
    const targetY = getShotTargetY(gk.y, p.y, aimY);
    const distanceFactor = clamp(Math.hypot(gx - p.x, targetY - p.y) / 24, 0.72, 1.28);
    let ty = targetY + (this.r() - 0.5) * 2 * accuracy.spread * distanceFactor;
    let tz = driven ? 0.18 + this.r() * 0.22 : powerShot ? 1.35 + this.r() * 0.75 : 0.52 + this.r() * 0.62;
    tz += (this.r() - 0.5) * 2 * accuracy.verticalSpread + Math.max(0, power - 0.88) * 0.28;
    const freeKick = this.setPiece === 'freekick' ? getFreeKickShotProfile(power, p.a.sho, p.a.tec) : null;
    if (freeKick) {
      tz = freeKick.targetHeight + (this.r() - 0.5) * 2 * accuracy.verticalSpread * 0.7;
      for (const w of this.wall || []) if (w.p && !w.p.sentOff) w.p.jumpT = 0.46;
    }
    const dist = Math.hypot(gx - p.x, ty - p.y);
    const speed = freeKick ? freeKick.speed : 17 + power * 15 + skill * 4 + Math.min(2, movingSpeed * 0.18);
    const t = dist / speed;
    const gravity = G + (freeKick ? freeKick.dip : 0);
    const vz = clamp((tz - 0.12 + 0.5 * gravity * t * t) / t, 0.5, 14);
    const ang = Math.atan2(ty - p.y, gx - p.x);
    const vx = Math.cos(ang) * speed + p.vx * 0.1;
    const vy = Math.sin(ang) * speed + p.vy * 0.1;
    this.kickBall(p, vx, vy, vz, 0.6 + power * 0.4);
    this.ball.dip = freeKick ? freeKick.dip : 0;
    // Enroulé plus lisible : la technique du joueur module la courbe du ballon.
    this.ball.spin = clamp(((ty - p.y) / Math.max(8, dist)) * (0.5 + power * 0.65) * skill * (0.65 + (p.a.tec || 50) / 220) * (freeKick ? freeKick.spinBoost : 1), -0.95, 0.95);
    this.ball.shotType = driven ? 'driven' : powerShot ? 'power' : 'placed';
    this.ball.inFlightShot = { team: p.team, shooter: p, t: 0, type: this.ball.shotType, ...shotOrigin };
    this.stats.shots[p.team]++;
    if (this.r() < 0.5) this.say('chance', { t: T.short, p: p.name });
  }
  tryTackle(p, user) {
    const b = this.ball, c = b.owner;
    if (p.tackleCd > 0) return false;
    if (this.isSetPieceLocked()) return false; // ballon pas encore en jeu
    if (!c || c.team === p.team) {
      if (user && !c && Math.hypot(b.x - p.x, b.y - p.y) < 2.2 && b.z < 1) {
        p.vx += (b.x - p.x) * 3; p.vy += (b.y - p.y) * 3; p.tackleCd = 0.6;
        p.slideT = Math.max(p.slideT || 0, 0.18); p.slideDuration = 0.18; p.slideDir = Math.sign(b.y - p.y) || 1;
      }
      return false;
    }
    const dist = Math.hypot(c.x - p.x, c.y - p.y);
    if (dist > (user ? 2.4 : 1.7)) { if (user) { p.tackleCd = 0.5; p.vx += (c.x - p.x) * 2.5; p.vy += (c.y - p.y) * 2.5; } return false; }
    if (!user && this.r() > getAITackleCommitChance(p, c, dist) * this.aiDefenseFactor(c.team)) {
      // Temporisation : le défenseur reste sur ses appuis et réévalue un peu plus tard.
      p.tackleCd = 0.35 + this.r() * 0.35;
      return false;
    }
    p.tackleCd = user ? 0.7 : 1.3 + this.r() * 0.8;
    const diff = this.settings.difficulty;
    const difficultyPenalty = c.team === this.userSide ? ([0.12, 0.05, 0, -0.04][diff] || 0) : 0;
    const assessment = getTackleAssessment(p, c, dist, user, difficultyPenalty);
    this.stats.tackles[p.team] = (this.stats.tackles[p.team] || 0) + 1;
    if (this.r() < assessment.successChance) {
      b.owner = null; b.last = p; b.lastTeam = p.team;
      p.slideT = 0.38; p.slideDuration = 0.38; p.slideDir = Math.sign(c.y - p.y) || 1;
      if (this.r() < 0.58) { b.owner = p; }
      else {
        b.vx = p.vx * 0.28 + c.vx * 0.12 + (this.r() - 0.5) * 4.2;
        b.vy = p.vy * 0.28 + c.vy * 0.12 + (this.r() - 0.5) * 4.2;
      }
      this.stats.tacklesWon[p.team] = (this.stats.tacklesWon[p.team] || 0) + 1;
      c.cd = 0.6; p.rating += 0.1;
      c.stumbleT = Math.max(c.stumbleT || 0, 0.24); c.stumbleDir = Math.sign(c.y - p.y) || 1;
      c.contactT = Math.max(c.contactT || 0, 0.22); c.contactDir = c.stumbleDir;
      p.slideT = Math.max(p.slideT || 0, 0.28);
      A.impact(Math.min(1, (2.4 - dist) / 2.4));
      if (p.team === this.userSide) this.select(p);
      return true;
    }
    // Une tentative manquée garde une animation visible ; le risque de faute
    // augmente sur une arrivée rapide ou par derrière.
    const missDuration = assessment.closingSpeed > 3.2 ? 0.22 : 0.14;
    p.slideT = Math.max(p.slideT || 0, missDuration); p.slideDuration = missDuration;
    if (this.r() < assessment.foulChance * (user ? USER_FOUL_SCALE : AI_FOUL_SCALE)) this.foul(p, c);
    else if (dist < 2.8) { p.stumbleT = Math.max(p.stumbleT || 0, 0.13); p.stumbleDir = Math.sign(c.y - p.y) || 1; }
    return false;
  }
  callOffside(p) {
    this.stats.offsides[p.team] = (this.stats.offsides[p.team] || 0) + 1;
    this.addEvent('offside', p);
    this.banner('HORS-JEU !', 1.7);
    this.say('offside', { p: p.name }, true);
    A.whistle();
    this.passInfo = null;
    this.setRestart('freekick', 1 - p.team,
      clamp(p.x, -HL + 1, HL - 1), clamp(p.y, -HW + 1, HW - 1));
  }
  foul(p, victim) {
    this.stats.fouls[p.team]++; p.rating -= 0.2;
    A.whistle();
    const T = this.teams[victim.team], d = T.dir;
    const inBox = victim.x * d > HL - 16.5 && Math.abs(victim.y) < 20.16;
    const card = this.r();
    if (card < 0.04) this.sendOff(p, 'red');
    else if (card < 0.22 || inBox && card < 0.4) { p.yellow++; this.stats.yellows[p.team]++; this.addEvent('yellow', p); this.say('yellow', { p: p.name }); if (p.yellow >= 2) this.sendOff(p, 'red2'); }
    else this.say('foul', { p: p.name });
    this.crowdReact(card < 0.22 || (inBox && card < 0.4) ? 'card' : 'foul', p.team);
    if (this.r() < 0.03) { victim.injured = true; this.addEvent('injury', victim); this.say('injury', { p: victim.name }, true); }
    if (inBox) { this.banner('PENALTY !', 1.8); this.say('penalty', { t: T.short }, true); this.setRestart('penalty', victim.team, d * (HL - 11), 0); }
    else this.setRestart('freekick', victim.team, clamp(victim.x, -HL + 1, HL - 1), clamp(victim.y, -HW + 1, HW - 1));
  }
  sendOff(p, why) {
    p.sentOff = true; this.stats.reds[p.team]++; this.addEvent('red', p);
    this.say('red', { p: p.name }, true);
    if (this.selected === p) this.switchPlayer();
    if (p.isGK) { // un joueur de champ prend les gants
      const T = this.teams[p.team], rep = T.ps.find(q => !q.sentOff && !q.isGK);
      if (rep) { rep.isGK = true; T.ps[0] = rep; T.ps[rep.i] = p; [rep.i, p.i] = [0, rep.i]; [rep.base, p.base] = [p.base, rep.base]; }
    }
  }
  addEvent(type, p, extra = {}) { this.events.push({ type, min: Math.max(1, Math.round(this.minute)), team: p.team, pid: p.id, name: p.name, ...extra }); }

  // ---------------- utilisateur ----------------
  userControl(dt) {
    if (this.userSide == null) return;
    const p = this.selected; if (!p || p.sentOff) { this.autoSelectDefender(); return; }
    const inp = this.input, b = this.ball;
    const mag = Math.hypot(inp.jx, inp.jy);
    const T = this.teams[this.userSide];
    this.joyIdleT = mag > 0.15 ? 0 : (this.joyIdleT || 0) + dt;
    this.autoSwitchCd = Math.max(0, (this.autoSwitchCd || 0) - dt);
    // Changement automatique en défense : si le joueur contrôlé est loin de
    // l'action et que le joystick est relâché, un défenseur mieux placé prend le relais.
    if (this.settings.assist && b.owner && b.owner.team !== p.team && this.joyIdleT > 0.45 && this.autoSwitchCd <= 0) {
      const currentScore = getSwitchCandidateScore(p, b, T.dir);
      if (currentScore > 11) {
        const better = T.ps.filter(q => q !== p && !q.isGK && !q.sentOff)
          .map(q => ({ q, score: getSwitchCandidateScore(q, b, T.dir) }))
          .sort((a, c) => a.score - c.score)[0];
        if (better && better.score < currentScore - 4) { this.select(better.q); this.autoSwitchCd = 1.2; return; }
      }
    }
    if (b.owner === p && this.isSetPieceLocked()) {
      // Coup de pied arrêté : le joystick oriente la visée, le tireur reste sur place.
      this.applyVel(p, 0, 0, dt);
      if (mag > 0.15) { p.heading = Math.atan2(inp.jy, inp.jx); p.face = Math.cos(p.heading) >= 0 ? 1 : -1; }
      if (inp.shooting) inp.shootHold = Math.min(1, inp.shootHold + dt * 1.25);
      return;
    }
    if (b.owner === p) {
      if (mag > 0.15) { const s = this.speedOf(p, inp.sprint) * Math.min(1, mag); this.applyVel(p, inp.jx / mag * s, inp.jy / mag * s, dt); if (inp.sprint) p.stamina = Math.max(0.3, p.stamina - dt * 0.012); }
      else this.applyVel(p, 0, 0, dt);
      if (inp.shooting) inp.shootHold = Math.min(1, inp.shootHold + dt * 1.25);
    } else {
      if (inp.press && b.owner && b.owner.team !== p.team) {
        const c = b.owner; this.moveTo(p, c.x + c.vx * 0.3, c.y + c.vy * 0.3, dt, 1, false, true);
        // un second coéquipier presse aussi
        const mate = T.ps.filter(q => q !== p && !q.isGK && !q.sentOff).sort((a, c2) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c2.x - b.x, c2.y - b.y))[0];
        if (mate) this.moveTo(mate, c.x - T.dir * 2, c.y, dt, 1, false, true);
      } else if (mag > 0.15) { const s = this.speedOf(p, inp.sprint) * Math.min(1, mag); this.applyVel(p, inp.jx / mag * s, inp.jy / mag * s, dt); if (inp.sprint) p.stamina = Math.max(0.3, p.stamina - dt * 0.012); }
      else if (this.settings.assist) { // assistance : se replace automatiquement
        const own = b.owner; const poss = own ? own.team === p.team : false;
        // Défense assistée : cadrer le porteur côté but sans plonger dans le duel.
        if (own && !poss && Math.hypot(own.x - p.x, own.y - p.y) < 13) {
          const jp = getJockeyPoint(own, T.dir, 1.8);
          this.moveTo(p, jp.x, jp.y, dt, 1, false, Math.hypot(jp.x - p.x, jp.y - p.y) > 5);
          return;
        }
        if (!own && this.passInfo && this.passInfo.to === p) { const tg = this.receivePoint(p, this.passInfo); this.moveTo(p, tg.x, tg.y, dt, 1, false, true); return; }
        if (!own) { const t = this.ballLanding(); if (this.closestTo(T, t.x, t.y) === p) { this.moveTo(p, t.x, t.y, dt, 1, false, true); return; } }
        const [tx, ty] = this.formationPos(p, poss); this.moveTo(p, tx, ty, dt, 0.9);
      } else this.applyVel(p, 0, 0, dt);
    }
  }
  // appelé par l'interface
  btnPass(through = false) {
    const p = this.selected, b = this.ball;
    if (!p || this.state !== 'play') return;
    if (b.owner !== p) { if (through) this.input.press = true; else this.switchPlayer(); return; }
    const mag = Math.hypot(this.input.jx, this.input.jy);
    const T = this.teams[p.team];
    if (!through && !this.setPiece && isCrossingZone(p, T.dir)) {
      // Joystick relâché ou orienté vers l'axe : centre dans la surface.
      const towardBox = mag < 0.2 || this.input.jy * -Math.sign(p.y) > 0.25;
      if (towardBox) { this.cross(p); return; }
    }
    const dir = mag > 0.2 ? [this.input.jx / mag, this.input.jy / mag] : [p.face, 0];
    const opt = this.bestPass(p, dir, through) || this.bestPass(p, null, through);
    if (opt) this.pass(p, opt.p, through || opt.through, this.setPiece === 'corner');
  }
  btnShootDown() { if (this.state === 'shootout') { this.shootoutPress(true); return; } const p = this.selected; if (p && this.ball.owner === p) { this.input.shooting = true; this.input.shootHold = 0.15; } }
  btnShootUp() {
    if (this.state === 'shootout') { this.shootoutPress(false); return; }
    const p = this.selected, inp = this.input;
    if (!p || this.state !== 'play') { inp.shooting = false; return; }
    if (this.ball.owner === p && inp.shooting) {
      const mag = Math.hypot(inp.jx, inp.jy);
      const aimY = mag > 0.3 ? clamp(inp.jy / mag * 3.2, -3.3, 3.3) : null;
      this.shoot(p, clamp(inp.shootHold, 0.2, 1), aimY);
    } else if (this.ball.owner && this.ball.owner.team !== p.team) this.tryTackle(p, true);
    else if (!this.ball.owner) this.tryTackle(p, true);
    inp.shooting = false; inp.shootHold = 0;
  }

  // ---------------- physique ----------------
  physics(dt) {
    const b = this.ball;
    if (this.isSetPieceLocked()) {
      // Ballon posé (ou tenu à deux mains sur une touche) au point de remise en jeu.
      b.x = this.restart.x; b.y = this.restart.y; b.z = 0; b.vx = b.vy = b.vz = 0;
      return;
    }
    if (b.owner) {
      const p = b.owner, sp = Math.hypot(p.vx, p.vy);
      const heading = Number.isFinite(p.heading) ? p.heading : Math.atan2(p.vy || 0, p.vx || p.face || 1);
      const fx = sp > 0.5 ? p.vx / sp : Math.cos(heading);
      const fy = sp > 0.5 ? p.vy / sp : Math.sin(heading);
      const userSprint = this.isHuman(p) && (p === this.selected ? this.input?.sprint : this.humans?.[p.team]?.input?.sprint);
      const aiSprint = sp > this.speedOf(p, false) * 1.06;
      const carry = getCarryBallOffset({
        speed: sp, dribbling: p.a.dri, technique: p.a.tec, stamina: p.stamina,
        sprinting: !!(userSprint || aiSprint), phase: p.anim || 0
      });
      b.x = p.x + fx * carry.forward - fy * carry.lateral;
      b.y = p.y + fy * carry.forward + fx * carry.lateral;
      b.z = 0; b.vx = p.vx; b.vy = p.vy; b.vz = 0;
      return;
    }
    // Effet Magnus léger : la rotation courbe la trajectoire en vol.
    // Le spin décroît progressivement et n'affecte pas les ballons contrôlés.
    if (b.z > 0.02 && b.spin) {
      const spin = clamp(b.spin, -1, 1);
      b.vx += -b.vy * spin * 0.2 * dt;
      b.vy += b.vx * spin * 0.2 * dt;
      b.spin *= Math.exp(-0.42 * dt);
      if (Math.abs(b.spin) < 0.015) b.spin = 0;
    }
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.z > 0) { b.vz -= (G + (b.dip || 0)) * dt; b.vx *= 1 - 0.08 * dt; b.vy *= 1 - 0.08 * dt; }
    if (b.z <= 0) {
      b.dip = 0;
      b.z = 0;
      if (b.vz < -1.5) { b.vz = -b.vz * 0.5; } else { b.vz = 0; }
      const f = 1 - 1.1 * dt; b.vx *= f; b.vy *= f;
    }
    if (b.inFlightShot) b.inFlightShot.t += dt;
    if (this.passInfo) this.passInfo.t += dt;
    // poteaux / barre
    for (const s of [-1, 1]) {
      if (Math.abs(Math.abs(b.x) - HL) < 0.25 && Math.sign(b.x) === s) {
        for (const py of [-GOAL_W, GOAL_W]) if (Math.abs(b.y - py) < 0.2 && b.z < GOAL_H) { b.vx *= -0.6; b.vy += (this.r() - 0.5) * 6; this.say('post'); A.kick(0.9); this.crowdReact('post', b.lastTeam); }
        if (Math.abs(b.y) < GOAL_W && Math.abs(b.z - GOAL_H) < 0.15) { b.vz = -Math.abs(b.vz) * 0.5; b.vx *= -0.5; this.say('post'); }
      }
    }
  }
  contacts(dt) {
    const b = this.ball;
    if (b.owner) return;
    // gardien face à un tir
    const shot = b.inFlightShot;
    for (const T of this.teams) {
      const gk = T.ps[0]; if (gk.sentOff) continue;
      const gxLine = -HL * T.dir;
      if (shot && shot.team !== T.side && (b.vx * -T.dir) > 4) {
        const tcross = (gxLine - b.x) / b.vx;
        if (tcross > 0 && tcross < 1.05) {
          const yc = b.y + b.vy * tcross, zc = b.z + b.vz * tcross - 0.5 * G * tcross * tcross;
          if (Math.abs(yc) < GOAL_W + 0.3 && zc < GOAL_H + 0.3) {
            const sp = Math.hypot(b.vx, b.vy);
            const difficulty = gk.team === this.userSide ? 0 : ([-.3, 0, .15, .3][this.settings.difficulty] || 0);
            const assessment = getKeeperSaveAssessment({
              rating: gk.a.gk, keeperY: gk.y, shotY: yc, shotZ: zc,
              shotSpeed: sp, crossingTime: tcross, difficulty
            });
            const { reach, need, reaction } = assessment;
            gk.vy += clamp((yc - gk.y) * 10, -14, 14) * dt * (4.5 + reaction * 2);
            gk.dive = Math.sign(yc - gk.y) * Math.min(1, need / 2);
            if (need > 0.4 && tcross < 0.82) {
              gk.diveT = Math.max(gk.diveT || 0, 0.48);
              gk.diveDir = Math.sign(yc - gk.y) || 1;
              gk.keeperReactShot = shot;
            }
            if (!shot.judged && tcross < 0.18) {
              shot.judged = true;
              let pSave = assessment.chance;
              if (Math.abs(yc) > GOAL_W - 0.5 && zc > GOAL_H - 0.6) pSave -= 0.25; // lucarne
              if (this.r() < clamp(pSave, 0.02, 0.95)) {
                this.recordShotOnTarget(shot, yc, zc);
                if (sp < 22 && this.r() < 0.55) {
                  b.owner = gk; b.last = gk; b.lastTeam = gk.team; b.inFlightShot = null;
                  gk.keeperCatchT = 0.48; gk.keeperPunchT = 0;
                } else if (this.r() < 0.45) {
                  b.vx = b.vx * 0.25; b.vy = (yc >= gk.y ? 1 : -1) * (7 + this.r() * 5); b.vz = 2 + this.r() * 3;
                  b.last = gk; b.lastTeam = gk.team; b.inFlightShot = null;
                  gk.keeperPunchT = 0.42; gk.keeperCatchT = 0;
                } else {
                  b.vx = -b.vx * 0.35; b.vy = (this.r() - 0.5) * 14; b.vz = 3 + this.r() * 3;
                  b.last = gk; b.lastTeam = gk.team; b.inFlightShot = null;
                  gk.keeperPunchT = 0.42; gk.keeperCatchT = 0;
                }
                gk.rating += 0.4; gk.saveT = 0.75; gk.diveT = Math.max(gk.diveT || 0, 0.5); gk.diveDir = Math.sign(yc - gk.y) || 1; this.say(this.minute >= 85 ? ['save_late', 'save'] : 'save', { p: gk.name }); this.addEvent('save', gk);
                A.crowd(0.82); A.saveSound(); this.crowdReact('save', gk.team);
                return;
              }
            }
          } else if (!shot.missSaid && tcross < 0.15) { shot.missSaid = true; this.say('miss'); if (Math.abs(yc) < GOAL_W + 2.5 && zc < GOAL_H + 1.5) this.crowdReact('miss', shot.team); }
        }
      }
      if (shot && shot.t > 2.5) b.inFlightShot = null;
    }
    // contrôle du ballon
    let best = null, bd = 1e9;
    for (const T of this.teams) for (const p of T.ps) {
      if (p.sentOff || p.cd > 0) continue;
      const d = Math.hypot(p.x - b.x, p.y - b.y);
      const reachZ = p.isGK && Math.abs(b.x - (-HL * T.dir)) < 17 && Math.abs(b.y) < 21 ? 2.6 : 1.0;
      const rad = this.passInfo && this.passInfo.to === p ? 1.7 : 1.1;
      const activeOffside = this.passInfo && this.passInfo.t < 3 &&
        this.passInfo.offsidePlayers?.includes(p) && d < Math.max(1.1, rad);
      if (activeOffside) { this.callOffside(p); return; }
      if (d < rad && b.z < reachZ && d < bd && this.canClaimMovingBall(p, d)) { bd = d; best = p; }
      // Tête : le saut aide à atteindre le ballon, mais un ballon bas peut
      // également être dévié de la tête sans saut complet.
      if (!p.isGK && d < 1.1 && b.z >= 1.1 && b.z < 2.4 && p.cd <= 0 && ((p.jumpT || 0) > 0.04 || b.z < 1.72)) this.header(p);
    }
    if (best) {
      const rel = Math.hypot(b.vx - best.vx, b.vy - best.vy);
      const receiveBonus = this.passInfo && this.passInfo.to === best ? 5 : 0;
      let pressure = 99;
      for (const T of this.teams) if (T.side !== best.team) for (const o of T.ps) {
        if (!o.sentOff) pressure = Math.min(pressure, Math.hypot(o.x - best.x, o.y - best.y));
      }
      const ctl = 15 + best.a.dri / 7 + best.a.tec / 18 + (best.isGK ? 10 : 0) + receiveBonus;
      if (rel > ctl && this.r() < clamp(0.58 - (best.a.dri + best.a.tec) / 650, 0.28, 0.58)) {
        b.vx *= 0.35; b.vy *= 0.35; b.vz = Math.abs(b.vz) * 0.3 + 1;
        best.cd = 0.25; best.stumbleT = Math.max(best.stumbleT || 0, 0.12);
        b.last = best; b.lastTeam = best.team; return;
      }
      const prevTeam = b.lastTeam, pi = this.passInfo;
      b.owner = best; b.last = best; b.inFlightShot = null; best.touches++;
      // Première touche : amorti plus propre pour les techniciens, plus fuyant
      // sous pression et sur les ballons très rapides.
      const firstTouch = clamp(
        0.18 + (best.a.dri || 50) / 220 + (best.a.tec || 50) / 230 +
        (receiveBonus ? 0.08 : 0) - clamp((rel - 10) / 65, 0, 0.16) -
        clamp((2.2 - pressure) / 2.2, 0, 0.12),
        0.2, 0.82
      );
      best.firstTouchT = 0.32;
      // Temps de contrôle avant la décision suivante : une première touche propre
      // permet d'enchaîner plus vite, un contrôle difficile demande un temps d'ajustement.
      best.aiThink = Math.max(best.aiThink || 0, 0.12 + (1 - firstTouch) * 0.32);
      best.carryT = 0;
      const firstTouchAngle = Math.atan2(b.vy - best.vy, (b.vx - best.vx) || best.face || 1);
      best.heading = Math.atan2(b.vy || best.vy, b.vx || best.vx || best.face);
      best.firstTouchDir = Math.cos(firstTouchAngle - best.heading) >= 0 ? 1 : -1;
      best.face = Math.cos(best.heading) >= 0 ? 1 : -1;
      b.controlQuality = firstTouch;
      // Micro-déviation contrôlée : une touche orientée accompagne l'action
      // sans téléporter le ballon ni supprimer les pertes de balle.
      const touchAngle = best.run > 0 ? Math.atan2(best.vy, best.vx || best.face) : Math.atan2(b.vy - best.vy, b.vx - best.vx || best.face);
      const touchOffset = 0.12 + firstTouch * 0.18;
      b.x = best.x + Math.cos(touchAngle) * touchOffset;
      b.y = best.y + Math.sin(touchAngle) * touchOffset;
      b.vx *= 1 - firstTouch; b.vy *= 1 - firstTouch; b.vz *= 0.18;
      if (pi && pi.team === best.team && pi.from !== best) { this.stats.passOk[best.team]++; pi.from.rating += 0.03; best.lastPasser = pi.from; }
      else best.lastPasser = null;
      this.passInfo = null;
      b.lastTeam = best.team;
      if (this.userSide != null && best.team === this.userSide) this.select(best);
      else if (this.userSide != null && prevTeam === this.userSide && best.team !== this.userSide && this.settings.assist) this.autoSelectDefender();
    }
  }
  canClaimMovingBall(p, distance) {
    const b = this.ball, pi = this.passInfo;
    if (!pi || pi.team === p.team || p.isGK) return true;
    const speed = Math.hypot(b.vx, b.vy);
    if (speed < 7) return true;
    if (p.claimPass !== pi) { p.claimPass = pi; p.claimRoll = this.r(); }
    return getMovingBallInterceptChance(distance, speed, p.a?.def) * this.aiDefenseFactor(pi.team) > p.claimRoll;
  }
  // Intensité défensive de l'IA face aux actions du joueur humain, selon la difficulté.
  aiDefenseFactor(attackingTeam) {
    if (this.userSide == null || attackingTeam !== this.userSide) return 1;
    return [0.55, 0.85, 1, 1.15][this.settings.difficulty] ?? 1;
  }
  header(p) {
    const b = this.ball, T = this.teams[p.team], d = T.dir, gx = HL * d;
    p.cd = 0.62; p.headerT = 0.44; p.headerDir = 1;
    p.heading = Math.atan2(b.y - p.y, b.x - p.x);
    p.face = Math.cos(p.heading) >= 0 ? 1 : -1;
    p.kickT = 0.22; p.kickStyle = 'header'; p.kickDir = 1;
    b.last = p; b.lastTeam = p.team; b.owner = null;
    if (Math.abs(gx - p.x) < 16 && Math.abs(p.y) < 12) {
      const keeper = this.teams[1 - p.team].ps[0];
      const farSide = keeper.y >= 0 ? -1 : 1;
      const aimBase = farSide * (1.45 + this.r() * 1.15);
      let pressure = 99;
      for (const o of this.teams[1 - p.team].ps) if (!o.sentOff) pressure = Math.min(pressure, Math.hypot(o.x - p.x, o.y - p.y));
      const headingSkill = p.a.hea || 50;
      const error = (1 - headingSkill / 100) * 2.8 + clamp((2.6 - pressure) / 2.6, 0, 1) * 1.5;
      const ty = aimBase + (this.r() - 0.5) * error;
      const ang = Math.atan2(ty - p.y, gx - p.x);
      const sp = 12.5 + (p.a.phy || 50) / 15 + headingSkill / 35;
      b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp;
      b.vz = clamp(1.65 + (p.jumpT > 0 ? 0.55 : 0) - Math.abs(p.y) * 0.025, 0.35, 2.3);
      b.spin = clamp((ty - p.y) / 18 * (headingSkill / 100), -0.45, 0.45);
      b.inFlightShot = { team: p.team, shooter: p, t: 0, type: 'header', kind: 'header', distance: Math.hypot(HL * this.teams[p.team].dir - p.x, p.y) };
      this.stats.shots[p.team]++;
      p.rating += 0.06;
    } else {
      b.vx = d * (8 + this.r() * 6); b.vy = (this.r() - 0.5) * 8; b.vz = 2.4 + this.r() * 1.2;
    }
    A.kick(0.45);
  }
  rules() {
    const b = this.ball;
    if (b.owner) return;
    if (Math.abs(b.x) > HL) {
      const s = Math.sign(b.x);
      // quelle équipe défend ce but ?
      const defSide = this.teams[0].dir * s < 0 ? 0 : 1; // l'équipe dont le but est de ce côté
      if (Math.abs(b.y) < GOAL_W && b.z < GOAL_H) return this.goal(1 - defSide);
      if (b.lastTeam === defSide) this.setRestart('corner', 1 - defSide, s * (HL - 0.4), Math.sign(b.y) * (HW - 0.4));
      else this.setRestart('goalkick', defSide, s * (HL - 5.5), Math.sign(b.y) * 4);
      return;
    }
    if (Math.abs(b.y) > HW) this.setRestart('throw', 1 - b.lastTeam, clamp(b.x, -HL + 1, HL - 1), Math.sign(b.y) * (HW - 0.2));
  }
  goal(team) {
    const b = this.ball, scorer = b.last && b.last.team === team ? b.last : null;
    const shotInfo = b.inFlightShot?.team === team ? b.inFlightShot : null;
    if (b.inFlightShot?.team === team) this.recordShotOnTarget(b.inFlightShot, b.y, b.z);
    this.score[team]++;
    const T = this.teams[team];
    let name = scorer ? scorer.name : 'c.s.c.';
    if (scorer) { scorer.goals++; scorer.rating += 1; if (scorer.lastPasser) { scorer.lastPasser.assists++; scorer.lastPasser.rating += 0.5; } }
    this.events.push({ type: 'goal', min: Math.max(1, Math.round(this.minute)), team, pid: scorer?.id, name, own: !scorer, assist: scorer?.lastPasser?.name });
    b.vx *= 0.2; b.vy *= 0.2; b.inFlightShot = null;
    this.state = 'goal'; this.stateT = 2.2;
    this.goalFxT = 2.2; this.goalFxTeam = team; this.goalFxScorer = scorer ? scorer.name : 'BUT CONTRE SON CAMP';
    for (const p of T.ps) if (!p.sentOff) { p.celebrateT = p === scorer ? 2.2 : 1.55; p.vx *= 0.35; p.vy *= 0.35; }
    this.goalCrowdT = 2.2; this.goalCrowdPulseT = 0;
    A.netSound(); this.crowdReact('goal', team);
    this.say(getGoalCommentKeys({
      own: !scorer, scorerGoals: scorer?.goals || 1, minute: this.minute, scoreAfter: this.score, team,
      kind: shotInfo?.kind || null, distance: shotInfo?.distance || 12,
    }), { p: name, t: T.short }, true);
    this.lastGoalTeam = team;
    if (this.o.onGoal) this.o.onGoal(team);
  }

  // ---------------- ralenti ----------------
  record() {
    if ((this.recT = (this.recT || 0) + 1) % 2) return;
    const f = { b: [this.ball.x, this.ball.y, this.ball.z, this.ball.vx || 0, this.ball.vy || 0, this.ball.vz || 0, this.ball.spin || 0, this.clock], p: [] };
    for (const T of this.teams) for (const p of T.ps) f.p.push([
      p.x, p.y, p.face, p.anim, p.vx, p.vy, p.jumpT || 0, p.diveT || 0,
      p.slideT || 0, p.kickT || 0, p.headerT || 0, p.firstTouchT || 0,
      p.stumbleT || 0, p.keeperCatchT || 0, p.keeperPunchT || 0, p.headerDir || p.face,
      p.diveDir || 1, p.slideDir || 1, p.kickDir || p.face, p.firstTouchDir || 1, p.stumbleDir || 1,
      p.diveHeight || 0, p.diveStretch || 0,
      p.contactT || 0, p.contactDir || 1, p.slideDuration || 0.38, p.heading || 0,
      p.kickFootSide || 1, p.motionAccel || 0
    ]);
    this.replayBuf.push(f); if (this.replayBuf.length > 150) this.replayBuf.shift();
  }
  // Réalisation TV : le but est rejoué sous trois angles, séparés par un volet animé.
  startReplay() {
    if (this.settings.replays === false || this.replayBuf.length < 20) return this.afterGoal();
    const frames = this.replayBuf.slice(-130);
    this.replay = buildReplayPlan(frames, this.lastGoalTeam != null ? this.teams[this.lastGoalTeam].dir : 1);
    this.tvWipeT = TV_WIPE;
    this.msg = ''; this.msgT = 0;
  }
  updateReplay(dt) {
    const r = this.replay;
    this.tvWipeT = Math.max(0, (this.tvWipeT || 0) - dt);
    const seg = r.segs[r.seg];
    r.i += dt * 30 * seg.speed;
    if (r.i >= r.frames.length - 1) {
      if (r.seg < r.segs.length - 1) { r.seg++; r.i = r.segs[r.seg].from; this.tvWipeT = TV_WIPE; }
      else this.skipReplay();
    }
  }
  skipReplay() { if (!this.replay) return; this.replay = null; this.msgT = 0; this.tvWipeT = TV_WIPE; this.afterGoal(); }
  afterGoal() { this.replayBuf = []; this.setupKickoff(1 - this.lastGoalTeam); }

  // ---------------- fin ----------------
  finish() {
    this.ended = true; this.running = false;
    A.crowd(0.1);
    const res = this.allPlayersForResult();
    this.destroy();
    this.o.onEnd && this.o.onEnd(res);
  }
  needsShootout() {
    if (!this.knockout || this.shootout) return false;
    const agg = this.knockout.aggBefore;
    return this.score[0] + agg[0] === this.score[1] + agg[1];
  }
  startShootout() {
    const first = this.r() < 0.5 ? 0 : 1; // tirage au sort
    this.shootout = {
      first, kicks: [[], []], order: this.teams.map(T => getShootoutOrder(T.ps)), next: [0, 0],
      phase: 'walk', t: 1.6, kick: null, status: getShootoutStatus([[], []]),
    };
    this.state = 'shootout'; this.replay = null; this.passInfo = null; this.wall = null; this.setPiece = null;
    this.banner('TIRS AU BUT', 2.2); A.whistle(true); A.crowd(0.6); this.say('shootout', {}, true);
    this.prepareShootoutKick();
  }
  prepareShootoutKick() {
    const so = this.shootout, team = getNextKicker(so.kicks, so.first);
    const list = so.order[team];
    const shooter = list[so.next[team] % list.length]; so.next[team]++;
    const keeper = this.teams[1 - team].ps.find(p => p.isGK && !p.sentOff) || this.teams[1 - team].ps[0];
    so.kick = { team, shooter, keeper, strike: null, outcome: null, dive: 0, flightT: 0, userDive: null };
    so.phase = 'walk'; so.t = so.kicks[0].length + so.kicks[1].length === 0 ? 2.2 : 1.4;
    this.input.shooting = false; this.input.shootHold = 0;
    if (this.userSide === team) this.select(shooter); else if (this.userSide != null) this.select(keeper);
  }
  // Position des joueurs : tireur au point, gardien sur sa ligne, autres dans le rond central.
  placeShootout(dt) {
    const so = this.shootout, k = so.kick;
    let a = 0;
    for (const T of this.teams) for (const p of T.ps) {
      if (p.sentOff) continue;
      let tx, ty;
      if (p === k.shooter) { tx = so.phase === 'walk' ? HL - 12.6 : HL - 11.7; ty = so.phase === 'walk' ? -0.5 : -0.25; }
      else if (p === k.keeper) { tx = HL - 0.35; ty = so.phase === 'flight' || so.phase === 'result' ? p.y : 0; }
      else { const ang = (a++ / 21) * Math.PI * 2; tx = Math.cos(ang) * 6 + (T.side ? 2 : -2); ty = Math.sin(ang) * 5; }
      if (!(p === k.keeper && (so.phase === 'flight' || so.phase === 'result'))) this.moveTo(p, tx, ty, dt, 1, true);
    }
    this.moveAll(dt);
  }
  shootoutPress(down) {
    const so = this.shootout; if (!so || so.phase !== 'aim') return;
    const k = so.kick; if (this.userSide !== k.team) return;
    if (down) { this.input.shooting = true; this.input.shootHold = 0.15; return; }
    if (!this.input.shooting) return;
    const inp = this.input, mag = Math.hypot(inp.jx, inp.jy);
    const aimY = mag > 0.25 ? clamp(inp.jy / Math.max(mag, 0.001), -1, 1) * 3.25 : 0;
    const power = clamp(inp.shootHold, 0.2, 1);
    inp.shooting = false; inp.shootHold = 0;
    this.takeShootoutKick({ aimY, power, lift: 0.35 + power * 1.1 + (inp.jx < -0.4 ? 0.5 : 0) });
  }
  takeShootoutKick(choice) {
    const so = this.shootout, k = so.kick, sh = k.shooter;
    k.strike = getPenaltyStrike({ ...choice, shooting: sh.a.sho, technique: sh.a.tec, roll: this.r });
    k.dive = this.userSide === 1 - k.team ? null : getAIKeeperDive(k.strike.y, k.keeper.a.gk, this.r);
    so.phase = 'flight'; k.flightT = 0; k.duration = 11.2 / k.strike.speed;
    sh.kickT = 0.34; sh.kickStyle = 'shot'; sh.kickPower = choice.power; sh.heading = 0; sh.face = 1;
    A.kick(choice.power);
  }
  stepShootout(dt) {
    const so = this.shootout, k = so.kick, b = this.ball, inp = this.input;
    if (this.tickerT > 0) this.tickerT -= dt;
    if (this.msgT > 0) this.msgT -= dt;
    this.placeShootout(dt);
    if (so.phase === 'walk') {
      b.x = HL - 11; b.y = 0; b.z = 0.11; b.vx = b.vy = b.vz = 0; b.owner = null;
      so.t -= dt;
      const sh = k.shooter, ready = Math.hypot(sh.x - (HL - 12.6), sh.y + 0.5) < 0.8 && Math.hypot(k.keeper.x - (HL - 0.35), k.keeper.y) < 1;
      if (so.t <= 0 && (ready || so.t < -4)) { so.phase = 'aim'; so.t = this.userSide === k.team ? 12 : 0.9 + this.r() * 0.5; A.whistle(); }
      return;
    }
    if (so.phase === 'aim') {
      if (inp.shooting) inp.shootHold = Math.min(1, inp.shootHold + dt * 1.1);
      so.t -= dt;
      if (so.t <= 0) {
        if (this.userSide === k.team) { inp.shooting = true; inp.shootHold = Math.max(inp.shootHold, 0.6); this.shootoutPress(false); }
        else this.takeShootoutKick(getAIPenaltyChoice(k.shooter, this.r));
      }
      return;
    }
    if (so.phase === 'flight') {
      k.flightT += dt;
      // Gardien humain : le joystick haut/bas au moment de la frappe décide du plongeon.
      if (k.dive == null && k.flightT >= 0.12) {
        const jy = inp.jy; k.dive = Math.abs(jy) > 0.35 ? Math.sign(jy) : 0;
      }
      if (k.dive != null && !k.outcome) {
        k.outcome = getPenaltyOutcome({ ...k.strike, dive: k.dive, keeperRating: k.keeper.a.gk, roll: this.r });
        if (k.dive) { k.keeper.diveT = 0.62; k.diveDuration = 0.62; k.keeper.diveDir = k.dive; k.keeper.dive = k.dive; }
      }
      const gk = k.keeper;
      if (k.outcome) gk.y += clamp(k.outcome.keeperY - gk.y, -dt * 7, dt * 7);
      const u = Math.min(1, k.flightT / k.duration);
      const endY = k.outcome?.result === 'saved' ? lerp(k.strike.y, k.outcome.keeperY, 0.5) : k.strike.y;
      b.x = lerp(HL - 11, HL - (k.outcome?.result === 'saved' ? 0.6 : -0.2), u);
      b.y = lerp(0, endY, u); b.z = lerp(0.11, k.strike.z, u) + Math.sin(u * Math.PI) * 0.25;
      if (u >= 1 && k.outcome) this.resolveShootoutKick();
      return;
    }
    if (so.phase === 'result') {
      // Ballon dans les filets, repoussé par le gardien ou sorti.
      const r = k.outcome.result;
      if (r === 'goal') { b.x = Math.min(HL + 1.4, b.x + dt * 8); b.z = Math.max(0.11, b.z - dt * 2); }
      else if (r === 'saved') { b.x -= dt * 9; b.y += Math.sign(b.y || 1) * dt * 4; b.z = Math.max(0.11, b.z - dt * 3); }
      else { b.x = Math.min(HL + 4, b.x + dt * 10); }
      so.t -= dt;
      if (so.t <= 0) {
        if (so.status.decided) { this.state = 'fulltime'; this.stateT = 0; this.finish(); }
        else this.prepareShootoutKick();
      }
    }
  }
  resolveShootoutKick() {
    const so = this.shootout, k = so.kick, scored = k.outcome.result === 'goal';
    so.kicks[k.team].push(scored);
    so.status = getShootoutStatus(so.kicks);
    so.phase = 'result'; so.t = so.status.decided ? 3.2 : 1.8;
    const vars = { p: k.shooter.name, k: k.keeper.name };
    if (scored) { this.banner('BUT !', 1.6); A.crowd(1); k.shooter.celebrateT = 1.4; this.say('shootout_goal', vars); if (k.team === 0) A.applause(1.6); else A.groan(); }
    else if (k.outcome.result === 'saved') { this.banner('ARRÊT !', 1.6); A.saveSound(); k.keeper.saveT = 0.75; this.say('shootout_save', vars, true); this.crowdReact('save', k.keeper.team); }
    else { this.banner(k.outcome.result === 'post' ? 'SUR LE POTEAU !' : 'À CÔTÉ !', 1.6); this.say('shootout_miss', vars, true); this.crowdReact('miss', k.team); }
    if (so.status.decided) {
      const w = this.teams[so.status.winner];
      this.banner(`${w.short || w.name} QUALIFIÉ !`, 3);
      this.say('shootout_win', { w: w.short || w.name }, true);
      if (so.status.winner === 0) A.roar(); else A.groan();
      this.events.push({ type: 'shootout', min: 120, team: so.status.winner, name: `${so.status.goals[0]}-${so.status.goals[1]} t.a.b.` });
    }
  }
  drawShootoutPanel() {
    const so = this.shootout; if (!so) return;
    const c = this.c, d = this.dpr, T = this.teams;
    const w = 250 * d, h = 58 * d, x = (this.W - w) / 2, y = this.H - h - 14 * d;
    c.save(); c.fillStyle = 'rgba(6,12,22,0.86)'; this.rr(x, y, w, h, 10 * d); c.fill();
    c.font = `800 ${11 * d}px system-ui,Arial`; c.textBaseline = 'middle';
    for (let side = 0; side < 2; side++) {
      const ry = y + (side ? 39 : 19) * d;
      c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(String(T[side].short || T[side].name).slice(0, 6), x + 10 * d, ry);
      const n = Math.max(5, so.kicks[0].length, so.kicks[1].length);
      for (let i = 0; i < n; i++) {
        const v = so.kicks[side][i], cx = x + (70 + i * 19) * d;
        c.beginPath(); c.arc(cx, ry, 6.5 * d, 0, Math.PI * 2);
        c.fillStyle = v === true ? '#2fd36b' : v === false ? '#ff4d4d' : 'rgba(255,255,255,0.18)'; c.fill();
      }
      c.textAlign = 'right'; c.fillStyle = '#ffe14a'; c.fillText(String(so.status.goals[side]), x + w - 10 * d, ry);
    }
    // Aide contextuelle pour le joueur humain.
    const k = so.kick;
    if (this.userSide != null && k && so.phase === 'aim' && this.userSide === k.team) this.drawShootoutHint('Joystick : viser haut/bas · maintenir TIR : puissance');
    else if (this.userSide != null && k && (so.phase === 'aim' || so.phase === 'walk') && this.userSide !== k.team) this.drawShootoutHint('Gardien : joystick haut/bas au moment de la frappe pour plonger');
    c.restore();
  }
  // Jauge de puissance et cible dans le but pendant la visée du joueur humain.
  drawShootoutAim() {
    const so = this.shootout, k = so?.kick; if (!k || so.phase !== 'aim' || this.userSide !== k.team) return;
    const c = this.c, d = this.dpr, inp = this.input;
    const mag = Math.hypot(inp.jx, inp.jy);
    const aimY = mag > 0.25 ? clamp(inp.jy / mag, -1, 1) * 3.25 : 0;
    const lift = 0.35 + clamp(inp.shootHold || 0.4, 0.2, 1) * 1.1 + (inp.jx < -0.4 ? 0.5 : 0);
    const target = this.screenPoint(HL, aimY, Math.min(2.6, lift));
    if (target) {
      c.save(); c.strokeStyle = '#ff5a5f'; c.lineWidth = 2.5 * d;
      c.beginPath(); c.arc(target[0], target[1], 9 * d, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(target[0] - 13 * d, target[1]); c.lineTo(target[0] + 13 * d, target[1]); c.moveTo(target[0], target[1] - 13 * d); c.lineTo(target[0], target[1] + 13 * d); c.stroke();
      c.restore();
    }
    const head = this.screenPoint(k.shooter.x, k.shooter.y, 2.35);
    if (inp.shooting && head) {
      const w = 46 * d, h = 7 * d, pw = clamp(inp.shootHold, 0, 1);
      c.save(); c.fillStyle = 'rgba(0,0,0,0.55)'; this.rr(head[0] - w / 2, head[1] - h, w, h, 3 * d); c.fill();
      c.fillStyle = pw > 0.82 ? '#ff4d4d' : pw > 0.55 ? '#ffb020' : '#ffe14a';
      this.rr(head[0] - w / 2, head[1] - h, Math.max(h, w * pw), h, 3 * d); c.fill(); c.restore();
    }
  }
  drawShootoutHint(text) {
    const c = this.c, d = this.dpr;
    c.save(); c.font = `700 ${11 * d}px system-ui,Arial`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const w = c.measureText(text).width + 22 * d, x = this.W / 2, y = this.H - 92 * d;
    c.fillStyle = 'rgba(0,0,0,0.6)'; this.rr(x - w / 2, y - 11 * d, w, 22 * d, 11 * d); c.fill();
    c.fillStyle = '#fff'; c.fillText(text, x, y); c.restore();
  }
  result() {
    const players = [];
    for (const T of this.teams) for (const p of T.ps) players.push({ id: p.id, name: p.name, num: p.num, pos: p.pos, team: T.side, minutes: Math.round(p.minutes), goals: p.goals, assists: p.assists, rating: clamp(Math.round(p.rating * 10) / 10, 3, 10), stamina: p.stamina, injured: p.injured, yellow: p.yellow, red: p.sentOff });
    const tp = this.stats.poss[0] + this.stats.poss[1] || 1;
    const pens = this.shootout?.status?.decided ? this.shootout.status.goals.slice() : undefined;
    return { hg: this.score[0], ag: this.score[1], pens, events: this.events, stats: { ...this.stats, possPct: [Math.round(this.stats.poss[0] / tp * 100), Math.round(this.stats.poss[1] / tp * 100)] }, players, played: true };
  }
  // termine le match en simulation rapide (minutes restantes)
  simulateRest(strengthH, strengthA) {
    const rem = Math.max(0, 90 - this.minute) / 90;
    const lamH = rem * 1.35 * Math.pow(strengthH / strengthA, 1.4), lamA = rem * 1.1 * Math.pow(strengthA / strengthH, 1.4);
    const pois = l => { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; };
    const add = [pois(lamH), pois(lamA)];
    for (let s = 0; s < 2; s++) for (let i = 0; i < add[s]; i++) {
      const T = this.teams[s], c = T.ps.filter(p => !p.sentOff && !p.isGK); const sc = c[Math.floor(Math.random() * c.length)];
      this.score[s]++; sc.goals++; this.events.push({ type: 'goal', min: Math.round(this.minute + Math.random() * (90 - this.minute)), team: s, pid: sc.id, name: sc.name });
    }
    this.minute = 90;
    this.resolveShootoutInstantly();
    this.finish();
  }
  // Tirs au but restants simulés sans animation (fin simulée ou abandon).
  resolveShootoutInstantly() {
    if (!this.shootout && !this.needsShootout()) return;
    if (!this.shootout) this.startShootout();
    const so = this.shootout;
    let guard = 0;
    while (!so.status.decided && guard++ < 60) {
      if (so.phase !== 'walk' && so.phase !== 'aim') { this.prepareShootoutKick(); }
      const k = so.kick;
      k.strike = getPenaltyStrike({ ...getAIPenaltyChoice(k.shooter, this.r), shooting: k.shooter.a.sho, technique: k.shooter.a.tec, roll: this.r });
      k.outcome = getPenaltyOutcome({ ...k.strike, dive: getAIKeeperDive(k.strike.y, k.keeper.a.gk, this.r), keeperRating: k.keeper.a.gk, roll: this.r });
      so.kicks[k.team].push(k.outcome.result === 'goal');
      so.status = getShootoutStatus(so.kicks);
      so.phase = 'result';
    }
    if (so.status.decided && !this.events.some(e => e.type === 'shootout')) this.events.push({ type: 'shootout', min: 120, team: so.status.winner, name: `${so.status.goals[0]}-${so.status.goals[1]} t.a.b.` });
  }
  // Changement de formation en direct : chaque joueur rejoint la case qui correspond le mieux à son poste.
  changeFormation(side, formation) {
    const T = this.teams[side];
    if (!T || !formation || T.formation === formation) return false;
    const slots = getFormationAssignment(T.ps, formation);
    T.ps.forEach((p, i) => { if (slots[i] >= 0) { const base = getFormationBase(formation, slots[i]); if (base) p.base = base; } });
    T.formation = formation;
    this.events.push({ type: 'tactic', min: Math.round(this.minute), team: side, name: `Formation ${formation}` });
    this.banner(`FORMATION ${formation}`, 1.8);
    return true;
  }
  setTacticPreset(side, key) {
    const T = this.teams[side];
    if (!applyPreset(T, key)) return false;
    T.liveMentality = T.mentality; T.livePressing = T.pressing;
    this.events.push({ type: 'tactic', min: Math.round(this.minute), team: side, name: key });
    return true;
  }
  substitute(side, outIdx, benchIdx) {
    const T = this.teams[side];
    if (this.subsLeft[side] <= 0) return false;
    const out = T.ps[outIdx], inn = T.bench[benchIdx];
    if (!out || !inn || out.sentOff || inn.used) return false;
    const np = { ...out, id: inn.id, name: inn.name, num: inn.num, pos: inn.pos, a: inn.attrs, stamina: inn.fitness ?? 1, yellow: 0, injured: false, rating: 6.5, goals: 0, assists: 0, minutes: 0, touches: 0, skin: SKIN[inn.name.length % SKIN.length] };
    inn.used = true; out.subbedOff = true;
    this.subbedOff = this.subbedOff || []; this.subbedOff.push(out);
    T.ps[outIdx] = np; if (this.selected === out) this.select(np);
    if (this.ball.owner === out) this.ball.owner = np;
    this.subsLeft[side]--;
    this.events.push({ type: 'sub', min: Math.round(this.minute), team: side, pid: np.id, name: np.name, outName: out.name, outId: out.id });
    this.banner(`${out.name}  →  ${np.name}`, 2.2);
    return true;
  }
  allPlayersForResult() {
    const r = this.result();
    for (const p of this.subbedOff || []) r.players.push({ id: p.id, name: p.name, num: p.num, pos: p.pos, team: p.team, minutes: Math.round(p.minutes), goals: p.goals, assists: p.assists, rating: clamp(Math.round(p.rating * 10) / 10, 3, 10), stamina: p.stamina, injured: p.injured, yellow: p.yellow, red: false });
    return r;
  }

  // ---------------- rendu ----------------
  proj(x, y, z) {
    const C = this.camC, f = this.camF, r = this.camR, u = this.camU;
    const dx = x - C[0], dy = y - C[1], dz = z - C[2];
    const zc = dx * f[0] + dy * f[1] + dz * f[2];
    const xc = dx * r[0] + dy * r[1] + dz * r[2];
    const yc = dx * u[0] + dy * u[1] + dz * u[2];
    const k = this.focal / Math.max(zc, 0.1);
    return [this.W / 2 + xc * k, this.H * 0.5 - yc * k, k, zc];
  }
  setCamera(bx, by, close = false, actionZoom = 1) {
    const aspect = this.W / this.H;
    const target = clamp(bx, -HL + 6, HL - 6);
    this.cam.x = lerp(this.cam.x, target, close ? 0.2 : 0.06);
    this.cam.y = lerp(this.cam.y, by, 0.04);
    const zoomTarget = close ? 1 : clamp(actionZoom, 1, 1.09);
    this.cam.actionZoom = lerp(this.cam.actionZoom || 1, zoomTarget, close ? 0.16 : 0.035);
    const z = (this.settings.zoom || 1) * this.cam.actionZoom;
    const camY = -44 + this.cam.y * 0.35 + (close ? 16 : 0), camZ = (close ? 11 : 17) / Math.sqrt(z);
    const C = [this.cam.x, camY, camZ], T = [this.cam.x, this.cam.y * 0.6 + (close ? 4 : 0), 0];
    let f = [T[0] - C[0], T[1] - C[1], T[2] - C[2]]; const fl = Math.hypot(...f); f = f.map(v => v / fl);
    let r = [f[1], -f[0], 0]; const rl = Math.hypot(...r); r = r.map(v => v / rl);
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    this.camC = C; this.camF = f; this.camR = r; this.camU = u;
    this.focal = Math.min(this.H * 2.3, this.W * 1.25) * (close ? 1.3 : 1) * z;
  }
  render() {
    const c = this.c, W = this.W, H = this.H;
    let frame = null;
    const host = this.canvas.parentElement;
    if (host && !!this.replay !== !!this._replayClass) { this._replayClass = !!this.replay; host.classList.toggle('replaying', this._replayClass); }
    if (this.replay) { const fr = this.replay.frames, i = Math.floor(this.replay.i); frame = fr[Math.min(i, fr.length - 1)]; }
    const bx = frame ? frame.b[0] : this.ball.x, by = frame ? frame.b[1] : this.ball.y;
    const follow = getCameraFollow({
      x: bx, y: by,
      vx: frame ? frame.b[3] : this.ball.vx,
      vy: frame ? frame.b[4] : this.ball.vy,
      inFlightShot: frame ? null : this.ball.inFlightShot
    }, !!frame);
    this.setCamera(follow.x, follow.y, !!frame, follow.zoom);
    if (this.renderer3d && !this.renderer3d.lost) {
      try {
        this.renderer3d.setQuality(this.autoReduced ? 'low' : this.settings.quality);
        this.renderer3d.render(this, frame);
        c.clearRect(0, 0, W, H);
        this.drawHUD(!!frame, frame);
        if (!frame && this.matchIntroT > 0) this.drawMatchIntro();
        if (!frame && this.goalFxT > 0) this.drawGoalCelebration();
        return;
      } catch (error) {
        console.warn('Le rendu 3D a été interrompu, retour au rendu 2.5D :', error);
        this.renderer3d.dispose();
        this.renderer3d = null;
      }
    }
    // ciel / fond
    const g = c.createLinearGradient(0, 0, 0, H * 0.4);
    g.addColorStop(0, '#05070d'); g.addColorStop(1, '#16213a');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    this.drawStands(); this.drawPitch(); this.drawGoal(-1, true); this.drawGoal(1, true);
    // entités triées par profondeur
    const ents = [];
    let k = 0;
    for (const T of this.teams) for (const p of T.ps) {
      const fp = frame ? frame.p[k] : null; k++;
      if (p.sentOff && !frame) continue;
      ents.push({ y: fp ? fp[1] : p.y, draw: () => this.drawPlayer(p, fp) });
    }
    const bz = frame ? frame.b[2] : this.ball.z;
    ents.push({ y: by + 0.01, draw: () => this.drawBall(bx, by, bz, frame ? frame.b : null) });
    ents.sort((a, b) => b.y - a.y);
    for (const e of ents) e.draw();
    this.drawGoal(-1, false); this.drawGoal(1, false);
    this.drawHUD(!!frame, frame);
    if (!frame && this.matchIntroT > 0) this.drawMatchIntro();
    if (!frame && this.goalFxT > 0) this.drawGoalCelebration();
  }
  drawMatchIntro() {
    const c = this.c, d = this.dpr, t = this.matchIntroT;
    const alpha = Math.min(1, t / 0.85);
    const w = Math.min(this.W - 24 * d, 680 * d), h = Math.min(258 * d, this.H * 0.48);
    const x = (this.W - w) / 2, y = Math.max(12 * d, this.H * 0.07);
    const left = this.teams[0], right = this.teams[1], mid = this.W / 2;
    const compact = h < 205 * d;
    c.save(); c.globalAlpha = alpha;
    c.shadowColor = 'rgba(0,0,0,0.42)'; c.shadowBlur = 24 * d;
    c.fillStyle = 'rgba(3,8,18,0.94)';
    c.beginPath(); c.roundRect(x, y, w, h, 16 * d); c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = d; c.stroke();
    c.fillStyle = '#e6bd62'; c.fillRect(x + 18 * d, y + 31 * d, w - 36 * d, 2 * d);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#e6bd62'; c.font = `900 ${Math.max(10, 12 * d)}px system-ui,Arial`;
    c.fillText('PRÉSENTATION DES ÉQUIPES  •  FOOTBALL TUNISIA 2026', mid, y + 18 * d);
    // Drapeau tunisien stylisé, dessiné en vectoriel pour rester net sur mobile.
    const flagX = mid - 13 * d, flagY = y + 43 * d, flagW = 26 * d, flagH = 17 * d;
    c.fillStyle = '#e21b2d'; c.fillRect(flagX, flagY, flagW, flagH);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(mid, flagY + flagH / 2, 5.8 * d, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e21b2d'; c.beginPath(); c.arc(mid + 2 * d, flagY + flagH / 2, 4.5 * d, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e21b2d'; c.font = `900 ${8 * d}px system-ui,Arial`;
    c.fillText('★', mid + 1.8 * d, flagY + flagH / 2 + 2.8 * d);
    const badge = Math.min(31 * d, h * 0.13), cy = y + (compact ? 78 : 88) * d;
    for (const [team, ratio] of [[left, 0.22], [right, 0.78]]) {
      const bx = x + w * ratio;
      c.fillStyle = team.kit.shirt; c.beginPath(); c.arc(bx, cy, badge, 0, Math.PI * 2); c.fill();
      c.strokeStyle = team.kit.trim; c.lineWidth = 5 * d; c.stroke();
      c.fillStyle = '#fff'; c.font = `900 ${Math.max(12, 18 * d)}px system-ui,Arial`;
      c.fillText(team.short || team.name, bx, cy + badge + 17 * d);
      c.fillStyle = '#aebbd0'; c.font = `700 ${Math.max(9, 11 * d)}px system-ui,Arial`;
      c.fillText(team.formation || 'FORMATION', bx, cy + badge + 34 * d);
    }
    c.fillStyle = '#f4f7fb'; c.font = `900 ${Math.max(17, 27 * d)}px system-ui,Arial`;
    c.fillText('VS', mid, cy);
    if (!compact) {
      const rowY = y + 164 * d;
      c.fillStyle = 'rgba(255,255,255,0.07)';
      c.beginPath(); c.roundRect(x + 18 * d, rowY - 10 * d, w - 36 * d, 55 * d, 8 * d); c.fill();
      const drawStarters = (team, ratio) => {
        const players = team.ps.filter(p => !p.sentOff).slice(0, 11);
        const names = players.slice(1, 5).map(p => `${p.num || ''} ${p.name || 'Joueur'}`.trim());
        c.fillStyle = '#f2f5fa'; c.font = `700 ${Math.max(9, 11 * d)}px system-ui,Arial`;
        c.textAlign = 'center';
        names.forEach((name, i) => {
          const reveal = clamp((5.8 - t - i * 0.22) / 0.45, 0, 1);
          if (reveal <= 0) return;
          c.globalAlpha = alpha * reveal;
          c.fillText(name.length > 23 ? name.slice(0, 21) + '…' : name, x + w * ratio, rowY + i * 12 * d);
        });
        c.globalAlpha = alpha;
      };
      drawStarters(left, 0.25); drawStarters(right, 0.75);
    }
    const stadium = left.stadium || right.stadium || 'STADE';
    c.fillStyle = '#aebbd0'; c.font = `700 ${Math.max(9, 11 * d)}px system-ui,Arial`;
    c.fillText(stadium, mid, y + h - 15 * d);
    c.restore();
  }
  drawGoalCelebration() {
    const c = this.c, d = this.dpr, t = this.goalFxT, team = this.teams[this.goalFxTeam];
    const pulse = 0.5 + 0.5 * Math.sin((2.2 - t) * 17);
    c.save();
    c.fillStyle = `rgba(255,255,255,${0.02 + pulse * 0.03})`; c.fillRect(0, 0, this.W, this.H);
    const w = Math.min(this.W - 28 * d, 420 * d), h = 88 * d, x = (this.W - w) / 2, y = this.H * 0.19;
    c.fillStyle = 'rgba(5,10,18,0.9)'; this.rr(x, y, w, h, 14 * d); c.fill();
    c.fillStyle = team.kit.shirt; this.rr(x, y, 8 * d, h, 4 * d); c.fill();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#fff'; c.font = `900 ${Math.max(24, 36 * d)}px system-ui,Arial`;
    c.fillText('BUUUUT !', this.W / 2, y + 31 * d);
    c.fillStyle = team.kit.trim === team.kit.shirt ? '#ffe16a' : team.kit.trim;
    c.font = `800 ${Math.max(13, 18 * d)}px system-ui,Arial`;
    c.fillText(`${team.short}  ${this.score[0]} - ${this.score[1]}`, this.W / 2, y + 59 * d);
    c.fillStyle = '#fff'; c.font = `700 ${Math.max(10, 12 * d)}px system-ui,Arial`;
    c.fillText(this.goalFxScorer || 'BUT !', this.W / 2, y + 78 * d);
    // confettis légers et déterministes, sans allocations d'images
    for (let i = 0; i < 18; i++) {
      const phase = (i * 2.399 + (2.2 - t) * (1.8 + (i % 5) * 0.25));
      const px = this.W / 2 + Math.cos(phase) * (24 + (2.2 - t) * (35 + i % 7 * 8)) * d;
      const py = y + h + Math.sin(phase * 1.3) * (10 + (2.2 - t) * (18 + i % 6 * 5)) * d;
      c.globalAlpha = Math.max(0, t / 2.2) * 0.85; c.fillStyle = i % 2 ? team.kit.trim : '#fff';
      c.fillRect(px, py, (2 + i % 3) * d, (4 + i % 4) * d);
    }
    c.restore();
  }
  buildCrowd() {
    const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 256;
    const x = cv.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#0d0f16'); g.addColorStop(1, '#232733');
    x.fillStyle = g; x.fillRect(0, 0, 2048, 256);
    const cols = [this.teams[0].kit.shirt, this.teams[0].kit.trim, '#e70013', '#ffffff', '#3a3f4c', this.teams[1].kit.shirt];
    // rangées de spectateurs (tête + buste), plus sombres vers le haut
    for (let row = 0; row < 26; row++) {
      const py = 6 + row * 9.6, shade = 0.45 + row / 26 * 0.55;
      for (let px = Math.random() * 6; px < 2048; px += 5 + Math.random() * 4) {
        const away = px > 1720;
        if (Math.random() < 0.08) continue;
        x.globalAlpha = shade;
        x.fillStyle = away ? (Math.random() < 0.6 ? this.teams[1].kit.shirt : '#2a2e38') : cols[Math.floor(Math.random() * (Math.random() < 0.72 ? 2 : 5))];
        x.fillRect(px, py + 3, 4, 5);
        x.fillStyle = ['#8d5524', '#c68642', '#e0ac69', '#5c3a1e'][(px * 7 + row) % 4 | 0];
        x.fillRect(px + 0.5, py, 3, 3);
      }
    }
    x.globalAlpha = 1;
    x.save(); x.scale(2, 2);
    // drapeaux tunisiens stylisés (cercle + croissant + étoile simplifiés)
    for (let i = 0; i < 6; i++) {
      const fx = 60 + i * 160, fy = 30 + (i % 2) * 40;
      x.fillStyle = '#e70013'; x.fillRect(fx, fy, 46, 30);
      x.fillStyle = '#fff'; x.beginPath(); x.arc(fx + 23, fy + 15, 9, 0, 7); x.fill();
      x.fillStyle = '#e70013'; x.beginPath(); x.arc(fx + 24, fy + 15, 6.5, 0, 7); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(fx + 26.5, fy + 15, 5.2, 0, 7); x.fill();
      x.fillStyle = '#e70013'; x.fillRect(fx + 26, fy + 13.5, 3, 3);
    }
    // tifo bande
    x.fillStyle = this.teams[0].kit.shirt; x.fillRect(380, 100, 260, 16); x.fillStyle = this.teams[0].kit.trim === this.teams[0].kit.shirt ? '#000' : this.teams[0].kit.trim; x.font = 'bold 12px Arial'; x.textAlign = 'center'; x.fillText((this.teams[0].short + ' • ' + this.teams[0].short + ' • ' + this.teams[0].short), 510, 112);
    x.restore();
    this.crowdTex = cv;
    const ad = document.createElement('canvas'); ad.width = 2048; ad.height = 40; const a = ad.getContext('2d');
    const boards = [['#0b3d91', '#fff', 'FOOTBALL TUNISIA 2026'], ['#e70013', '#fff', 'تونس • TUNISIE'], ['#111', '#f5c400', 'JASMIN SPORT'], ['#0f7b3c', '#fff', 'SAHEL • SFAX • TUNIS'], ['#fff', '#e70013', 'قرطاج 2026'], ['#5b2c83', '#fff', 'DJERBA AIR'], ['#f39200', '#111', 'HARISSA ENERGY'], ['#1d1d1d', '#fff', 'KAIROUAN TELECOM']];
    for (let i = 0; i < 8; i++) { const [bg, fg, tx] = boards[i]; a.fillStyle = bg; a.fillRect(i * 256, 0, 256, 40); a.fillStyle = fg; a.font = 'bold 22px Arial'; a.textAlign = 'center'; a.fillText(tx, i * 256 + 128, 28); }
    this.adTex = ad;
  }
  drawAnimatedFans() {
    if (this.settings.quality === 'low' || this.autoReduced) return;
    const c = this.c, d = this.dpr;
    const colours = [this.teams[0].kit.shirt, this.teams[1].kit.shirt, '#e51d35', '#f0e8d6'];
    c.save();
    for (let i = 0; i < 24; i++) {
      const row = i % 4, x = -57 + i * 4.95;
      const y = 38 + row * 5.3, z = 1.7 + row * 3.2;
      const base = this.proj(x, y, z), top = this.proj(x, y, z + 1.35);
      const h = Math.max(2, Math.abs(base[1] - top[1]));
      const r = Math.max(0.8 * d, Math.min(2.1 * d, h * 0.19));
      const wave = Math.sin(this.clock * (2.2 + (i % 5) * 0.16) + i * 1.71);
      const shoulderY = base[1] - h * 0.48, headY = base[1] - h * 0.92;
      c.globalAlpha = 0.42;
      c.strokeStyle = colours[i % colours.length]; c.lineWidth = Math.max(0.8, 0.7 * d); c.lineCap = 'round';
      c.beginPath(); c.moveTo(base[0], base[1]); c.lineTo(base[0], shoulderY); c.stroke();
      c.beginPath();
      c.moveTo(base[0], shoulderY);
      c.lineTo(base[0] - r * (1.5 + wave * 0.7), shoulderY - r * (1.2 + Math.max(0, wave) * 2.2));
      c.moveTo(base[0], shoulderY);
      c.lineTo(base[0] + r * (1.5 - wave * 0.7), shoulderY - r * (1.1 + Math.max(0, -wave) * 2.2));
      c.stroke();
      c.fillStyle = '#c98f5a'; c.beginPath(); c.arc(base[0], headY, r, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }
  drawStands() {
    const c = this.c;
    if (this.settings.quality !== 'low' && !this.autoReduced && !this.crowdTex) this.buildCrowd();
    if (!this.adTex) this.buildCrowd();
    // tribune lointaine : bandes horizontales
    const rows = this.settings.quality === 'low' || this.autoReduced ? 6 : 18;
    for (let i = 0; i < rows; i++) {
      const y0 = 38 + i * 1.6, z0 = i * 1.05, y1 = y0 + 1.6, z1 = z0 + 1.05;
      const a = this.proj(-75, y0, z0), b = this.proj(-75, y1, z1);
      const r0 = this.proj(75, y0, z0);
      const w = r0[0] - a[0], h = a[1] - b[1] + 1;
      if (this.crowdTex) c.drawImage(this.crowdTex, 0, (1 - (i + 1) / rows) * 256, 2048, 256 / rows, a[0], b[1], w, h);
      else { c.fillStyle = i % 2 ? '#262a35' : '#20232c'; c.fillRect(a[0], b[1], w, h); }
    }
    this.drawAnimatedFans();
    // vague lumineuse dans les tribunes après un but
    if (this.goalCrowdT > 0) { const pulse = 0.5 + 0.5 * Math.sin((2.2 - this.goalCrowdT) * 19); c.save(); c.globalAlpha = Math.min(0.18, (this.goalCrowdT / 2.2) * 0.1 + pulse * 0.06); c.fillStyle = '#ffe7a0'; c.fillRect(0, 0, this.W, this.H * 0.28); c.restore(); }
    // toit / projecteurs
    const top = this.proj(0, 38 + rows * 1.6, rows * 1.05);
    c.fillStyle = '#0a0c12'; c.fillRect(0, 0, this.W, Math.max(0, top[1]));
    for (const lx of [-60, -20, 20, 60]) {
      const p = this.proj(lx, 70, 30), target = this.proj(lx * 0.72, 10, 0);
      if (this.settings.quality !== 'low' && !this.autoReduced) {
        const beam = c.createLinearGradient(p[0], p[1], target[0], target[1]);
        beam.addColorStop(0, 'rgba(255,248,220,0.07)');
        beam.addColorStop(0.55, 'rgba(255,244,205,0.035)');
        beam.addColorStop(1, 'rgba(255,244,205,0)');
        const l = this.proj(lx - 18, 17, 0), r = this.proj(lx + 18, 17, 0);
        c.save(); this.poly([p, l, r], beam); c.restore();
      }
      const radius = 60 * this.dpr;
      const gr = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], radius);
      gr.addColorStop(0, '#fffbe6');
      gr.addColorStop(0.18, '#fff6c877');
      gr.addColorStop(0.52, '#fff2b51c');
      gr.addColorStop(1, '#0000');
      c.fillStyle = gr;
      c.fillRect(p[0] - radius, p[1] - radius, radius * 2, radius * 2);
    }
    // panneaux publicitaires
    const a = this.proj(-62, 36, 0), b = this.proj(-62, 36, 0.9), r = this.proj(62, 36, 0);
    c.drawImage(this.adTex, a[0], b[1], r[0] - a[0], a[1] - b[1]);
  }
  poly(pts, fill) { const c = this.c; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fillStyle = fill; c.fill(); }
  buildPitchPattern() {
    this.pitchPatternBuilt = true;
    const config = getTurfTextureConfig(this.settings.quality);
    if (!config.size || typeof document === 'undefined' || !this.c.createPattern) return;
    const tile = document.createElement('canvas');
    tile.width = config.size; tile.height = config.size;
    const g = tile.getContext('2d');
    if (!g || !g.beginPath || !g.stroke || !g.createLinearGradient) return;
    let seed = 0x26f2026;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const base = g.createLinearGradient(0, 0, tile.width, tile.height);
    base.addColorStop(0, '#39883a'); base.addColorStop(0.52, '#347e34'); base.addColorStop(1, '#2e742f');
    g.fillStyle = base; g.fillRect(0, 0, tile.width, tile.height);
    g.lineCap = 'round';
    // Brins courbes à plusieurs longueurs : une texture de gazon moins plate, mais précalculée.
    for (let i = 0; i < config.blades; i++) {
      const x = random() * tile.width, y = random() * tile.height;
      const length = 2.2 + random() * 7.2, bend = (random() - 0.5) * 2.8;
      g.strokeStyle = random() > 0.47 ? 'rgba(225,255,220,0.19)' : 'rgba(5,34,12,0.21)';
      g.lineWidth = 0.35 + random() * 0.85;
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + bend * 0.45, y - length * 0.55, x + bend, y - length);
      g.stroke();
    }
    // Petits reflets et fibres sombres, générés avec une graine fixe pour les replays.
    for (let i = 0; i < config.flecks; i++) {
      const x = random() * tile.width, y = random() * tile.height;
      g.fillStyle = random() > 0.52 ? 'rgba(235,255,225,0.12)' : 'rgba(8,40,14,0.14)';
      g.fillRect(x, y, 0.7 + random() * 1.1, 0.7 + random() * 1.5);
    }
    this.pitchPattern = this.c.createPattern(tile, 'repeat');
    this.pitchPatternAlpha = config.alpha;
  }
  drawPitch() {
    const c = this.c;
    // gazon autour
    this.poly([this.proj(-62, -40, 0), this.proj(62, -40, 0), this.proj(62, 36, 0), this.proj(-62, 36, 0)], '#2b6f2a');
    const n = this.settings.quality === 'low' ? 12 : 22, sw = 2 * HL / n;
    for (let i = 0; i < n; i++) {
      const x0 = -HL + i * sw, x1 = x0 + sw;
      this.poly([this.proj(x0, -HW, 0), this.proj(x1, -HW, 0), this.proj(x1, HW, 0), this.proj(x0, HW, 0)], i % 2 ? '#3d8f37' : '#357f31');
    }
    if (!this.pitchPatternBuilt && !this.autoReduced) this.buildPitchPattern();
    if (this.pitchPattern && !this.autoReduced) {
      const corners = [[-HL, -HW], [HL, -HW], [HL, HW], [-HL, HW]].map(([x, y]) => this.proj(x, y, 0));
      const xs = corners.map(p => p[0]), ys = corners.map(p => p[1]);
      c.save();
      c.beginPath(); corners.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
      c.closePath(); c.clip();
      c.globalAlpha = this.pitchPatternAlpha || (this.settings.quality === 'high' ? 0.19 : 0.12);
      c.fillStyle = this.pitchPattern;
      c.fillRect(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      c.restore();
    }
    this.drawPitchWear();
    if (this.settings.quality !== 'low' && !this.autoReduced) {
      for (const lx of [-42, -14, 14, 42]) {
        const p = this.proj(lx, 0, 0), radius = (this.settings.quality === 'high' ? 112 : 86) * this.dpr;
        const light = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], radius);
        light.addColorStop(0, 'rgba(255,248,218,0.13)');
        light.addColorStop(0.48, 'rgba(255,244,205,0.055)');
        light.addColorStop(1, 'rgba(255,244,205,0)');
        c.fillStyle = light;
        c.fillRect(p[0] - radius, p[1] - radius, radius * 2, radius * 2);
      }
    }
    c.save();
    c.strokeStyle = 'rgba(245,250,241,0.92)'; c.lineWidth = Math.max(1, 2 * this.dpr);
    c.shadowColor = 'rgba(226,255,219,0.24)'; c.shadowBlur = this.settings.quality === 'low' ? 0 : 4 * this.dpr;
    const line = pts => { c.beginPath(); pts.forEach((p, i) => { const q = this.proj(p[0], p[1], 0); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.stroke(); };
    c.save();
    c.strokeStyle = 'rgba(0,0,0,0.24)'; c.lineWidth = Math.max(2, 4 * this.dpr);
    line([[-HL, -HW], [HL, -HW], [HL, HW], [-HL, HW], [-HL, -HW]]);
    c.restore();
    c.strokeStyle = 'rgba(248,251,245,0.96)'; c.lineWidth = Math.max(1.2, 2 * this.dpr);
    line([[-HL, -HW], [HL, -HW], [HL, HW], [-HL, HW], [-HL, -HW]]);
    line([[0, -HW], [0, HW]]);
    const circ = (cx, cy, r, a0 = 0, a1 = Math.PI * 2) => { const pts = []; for (let i = 0; i <= 40; i++) { const a = a0 + (a1 - a0) * i / 40; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } line(pts); };
    circ(0, 0, 9.15);
    for (const s of [-1, 1]) {
      line([[s * HL, -20.16], [s * (HL - 16.5), -20.16], [s * (HL - 16.5), 20.16], [s * HL, 20.16]]);
      line([[s * HL, -9.16], [s * (HL - 5.5), -9.16], [s * (HL - 5.5), 9.16], [s * HL, 9.16]]);
      const a = Math.acos(5.5 / 9.15);
      if (s > 0) circ(HL - 11, 0, 9.15, Math.PI - a, Math.PI + a); else circ(-HL + 11, 0, 9.15, -a, a);
      const ps = this.proj(s * (HL - 11), 0, 0); c.fillStyle = '#fff'; c.beginPath(); c.arc(ps[0], ps[1], 2 * this.dpr, 0, 7); c.fill();
    }
    const cs = this.proj(0, 0, 0); c.fillStyle = '#fff'; c.beginPath(); c.arc(cs[0], cs[1], 2 * this.dpr, 0, 7); c.fill();
    // Arcs de corner et points de penalty : marquages complets et mieux lisibles.
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const arc = [];
        for (let i = 0; i <= 10; i++) {
          const a = i / 10 * Math.PI / 2;
          arc.push([sx * (HL - 0.9 + Math.cos(a) * 0.9), sy * (HW - 0.9 + Math.sin(a) * 0.9)]);
        }
        line(arc);
        // Corner flags and slim poles make the pitch scale feel more tangible.
        const fx = sx * (HL - 0.35), fy = sy * (HW - 0.35);
        const base = this.proj(fx, fy, 0), top = this.proj(fx, fy, 1.35);
        c.strokeStyle = '#f2f4f7'; c.lineWidth = Math.max(1, 1.2 * this.dpr);
        c.beginPath(); c.moveTo(base[0], base[1]); c.lineTo(top[0], top[1]); c.stroke();
        c.fillStyle = sx === sy ? '#e31b32' : '#f2d05b';
        c.beginPath(); c.moveTo(top[0], top[1]); c.lineTo(top[0] + sx * 0.42 * this.dpr, top[1] + 0.14 * this.dpr); c.lineTo(top[0], top[1] + 0.33 * this.dpr); c.closePath(); c.fill();
      }
    }
    // Technical areas are marked outside both touchlines.
    for (const side of [-1, 1]) {
      const y = side * (HW + 2.2);
      line([[-10, y], [-10, y + side * 4.2], [10, y + side * 4.2], [10, y]]);
      line([[-8, y], [8, y]]);
    }
    c.restore();
  }
  drawPitchWear() {
    if (this.settings.quality === 'low' || this.autoReduced) return;
    const c = this.c;
    const corners = [[-HL, -HW], [HL, -HW], [HL, HW], [-HL, HW]].map(([x, y]) => this.proj(x, y, 0));
    c.save();
    c.beginPath(); corners.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
    c.closePath(); c.clip();
    const zones = [
      [0, 0, 8.5, 4.2, 0.075],
      [-HL + 13, 0, 6.5, 7.8, 0.10], [HL - 13, 0, 6.5, 7.8, 0.10],
      [-HL + 2.2, 0, 2.2, 4.9, 0.13], [HL - 2.2, 0, 2.2, 4.9, 0.13],
    ];
    for (const [x, y, rxM, ryM, alpha] of zones) {
      const p = this.proj(x, y, 0), px = this.proj(x + rxM, y, 0), py = this.proj(x, y + ryM, 0);
      const rx = Math.max(2, Math.abs(px[0] - p[0])), ry = Math.max(2, Math.abs(py[1] - p[1]));
      const shade = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], Math.max(rx, ry));
      shade.addColorStop(0, `rgba(16,43,18,${alpha})`);
      shade.addColorStop(0.62, `rgba(19,50,20,${alpha * 0.48})`);
      shade.addColorStop(1, 'rgba(19,50,20,0)');
      c.fillStyle = shade;
      c.beginPath(); c.ellipse(p[0], p[1], rx, ry, Math.atan2(py[1] - p[1], px[0] - p[0]), 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }
  drawGoal(s, back) {
    const c = this.c, x = s * HL, xb = s * (HL + 2);
    c.lineWidth = Math.max(1, 1 * this.dpr);
    if (back) {
      const scoredHere = this.goalFxT > 0 && s === (this.teams[this.goalFxTeam]?.dir || 0);
      const ripple = scoredHere ? Math.sin((2.2 - this.goalFxT) * 22) * Math.max(0, this.goalFxT / 2.2) : 0;
      c.strokeStyle = scoredHere ? 'rgba(255,248,205,0.72)' : 'rgba(255,255,255,0.35)';
      for (let i = 0; i <= 8; i++) { const yy = -GOAL_W + i * GOAL_W / 4; const bulge = scoredHere ? ripple * (1 - Math.abs(yy) / GOAL_W) * 0.42 : 0; const a = this.proj(x, yy, GOAL_H), b = this.proj(xb + s * bulge, yy, GOAL_H * 0.6), d = this.proj(xb + s * bulge * 0.35, yy, 0); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.stroke(); }
      for (let j = 0; j <= 4; j++) { const z = j * GOAL_H * 0.6 / 4; const bulge = scoredHere ? ripple * Math.sin(Math.PI * j / 4) * 0.42 : 0; const a = this.proj(xb + s * bulge, -GOAL_W, z), b = this.proj(xb + s * bulge, GOAL_W, z); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
      if (scoredHere) { c.save(); c.globalAlpha = Math.min(0.5, this.goalFxT / 2.2); c.strokeStyle = '#ffe99a'; c.lineWidth = 2 * this.dpr; const a = this.proj(xb + s * ripple * 0.55, -GOAL_W * 0.8, GOAL_H * 0.35), b = this.proj(xb + s * ripple * 0.55, GOAL_W * 0.8, GOAL_H * 0.35); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); c.restore(); }
      return;
    }
    c.strokeStyle = '#f4f4f4'; c.lineWidth = Math.max(2, 3.5 * this.dpr);
    const l = this.proj(x, -GOAL_W, 0), lt = this.proj(x, -GOAL_W, GOAL_H), r = this.proj(x, GOAL_W, 0), rt = this.proj(x, GOAL_W, GOAL_H);
    c.beginPath(); c.moveTo(l[0], l[1]); c.lineTo(lt[0], lt[1]); c.lineTo(rt[0], rt[1]); c.lineTo(r[0], r[1]); c.stroke();
  }
  drawPlayer(p, fp) {
    const c = this.c;
    const x = fp ? fp[0] : p.x, y = fp ? fp[1] : p.y, anim = fp ? fp[3] : p.anim;
    const vx = fp ? fp[4] : p.vx, vy = fp ? fp[5] : p.vy;
    const heading = fp && Number.isFinite(fp[26]) ? fp[26] :
      (Number.isFinite(p.heading) ? p.heading : Math.atan2(vy || 0, vx || 1));
    const face = Math.cos(heading) >= 0 ? 1 : -1;
    const T = this.teams[p.team], kit = p.isGK ? T.gkKit : T.kit;
    const ground = this.proj(x, y, 0); const s = ground[2]; // px par mètre
    if (ground[3] < 1) return;
    const action = (index, key) => fp ? (fp[index] || 0) : (p[key] || 0);
    const jump = Math.max(0, Math.min(1, action(6, 'jumpT') / 0.46));
    const keeperDive = p.isGK ? Math.max(0, Math.min(1, action(7, 'diveT') / 0.5)) : 0;
    const keeperSave = !fp && p.isGK ? Math.max(0, Math.min(1, (p.saveT || 0) / 0.75)) : 0;
    const diveSide = fp ? (fp[16] || 1) : (p.diveDir || 1);
    const diveHeight = fp ? (fp[21] || 0) : (p.diveHeight || 0);
    const diveStretch = fp ? (fp[22] || 0) : (p.diveStretch || 0);
    const slideSide = fp ? (fp[17] || 1) : (p.slideDir || 1);
    const kickDir = fp ? (fp[18] || face) : (p.kickDir || face);
    const firstTouchDir = fp ? (fp[19] || 1) : (p.firstTouchDir || 1);
    const stumbleDir = fp ? (fp[20] || 1) : (p.stumbleDir || 1);
    const slideDuration = fp ? (fp[25] || 0.38) : (p.slideDuration || 0.38);
    const tackleProfile = getTackleAnimationProfile(action(8, 'slideT'), slideDuration);
    const slidePulse = tackleProfile.lunge;
    const contactDir = fp ? (fp[24] || 1) : (p.contactDir || 1);
    const contactPulse = Math.max(0, Math.min(1, action(23, 'contactT') / 0.26));
    const headerPulse = Math.sin(Math.max(0, Math.min(1, 1 - action(10, 'headerT') / 0.44)) * Math.PI);
    const firstTouchProgress = Math.max(0, Math.min(1, 1 - action(11, 'firstTouchT') / 0.32));
    const firstTouchPulse = Math.sin(firstTouchProgress * Math.PI);
    const stumblePulse = Math.max(0, Math.min(1, action(12, 'stumbleT') / 0.24));
    const keeperCatchPulse = p.isGK ? Math.max(0, Math.min(1, action(13, 'keeperCatchT') / 0.48)) : 0;
    const keeperPunchPulse = p.isGK ? Math.max(0, Math.min(1, action(14, 'keeperPunchT') / 0.42)) : 0;
    const headerDir = fp ? (fp[15] || 1) : (p.headerDir || 1);
    const forwardPoint = this.proj(x + Math.cos(heading), y + Math.sin(heading), 0);
    const upPoint = this.proj(x, y, 1);
    const bodyTransform = getPlayerBodyTransform(
      forwardPoint[0] - ground[0], forwardPoint[1] - ground[1]
    );
    const divePoint = this.proj(x, y + diveSide * 0.72, 0);
    const g = [
      ground[0] + slidePulse * 0.22 * s + (divePoint[0] - ground[0]) * keeperDive * 0.72,
      ground[1] - Math.sin(jump * Math.PI) * 0.62 * s - keeperDive * (0.12 + diveHeight * 0.26) * s + slidePulse * 0.1 * s + (divePoint[1] - ground[1]) * keeperDive * 0.72,
      ground[2], ground[3]
    ];
    const hgt = 1.8 * s, w = 0.5 * s;
    // ombre et effets d'action au sol : plongeon du gardien / tacle glissé
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(ground[0] + 0.25 * s, ground[1], 0.45 * s * (1 - jump * 0.22), 0.14 * s, 0, 0, 7); c.fill();
    if (slidePulse > 0.03) { c.save(); c.globalAlpha = slidePulse * 0.38; c.fillStyle = '#d8d2bd'; c.beginPath(); c.ellipse(ground[0] - face * 0.35 * s, ground[1] + 0.02 * s, (0.45 + slidePulse * 0.7) * s, 0.18 * s, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = kit.trim; c.lineWidth = Math.max(1, 0.045 * s); c.beginPath(); c.arc(ground[0], ground[1], (0.38 + (1 - slidePulse) * 0.55) * s, 0, Math.PI * 2); c.stroke(); c.restore(); }
    const divePulse = Math.max(0, Math.min(1, action(7, 'diveT') / 0.42));
    if (keeperSave > 0.02) { c.save(); c.globalAlpha = keeperSave * 0.55; c.strokeStyle = '#fff'; c.lineWidth = Math.max(1.5, 0.1 * s); c.beginPath(); c.ellipse(ground[0], ground[1] - 0.28 * s, (0.55 + (1 - keeperSave) * 0.55) * s, 0.28 * s, 0, 0, Math.PI * 2); c.stroke(); c.restore(); }
    if (divePulse > 0.02 || slidePulse > 0.02) {
      const dir = p.isGK ? diveSide : slideSide;
      c.save(); c.globalAlpha = 0.28 * Math.max(divePulse, slidePulse); c.strokeStyle = p.isGK ? '#f5f8ff' : kit.trim;
      c.lineWidth = Math.max(1, 0.09 * s); c.lineCap = 'round';
      c.beginPath(); c.moveTo(g[0] - 0.7 * s, g[1] - dir * 0.18 * s); c.lineTo(g[0] - 1.35 * s, g[1] - dir * 0.32 * s); c.stroke();
      c.beginPath(); c.moveTo(g[0] - 0.55 * s, g[1] + dir * 0.12 * s); c.lineTo(g[0] - 1.05 * s, g[1] + dir * 0.24 * s); c.stroke(); c.restore();
    }
    // repère joueur sélectionné
    if (p === this.selected && !fp) {
      c.strokeStyle = '#ffe14a'; c.lineWidth = Math.max(2, 0.08 * s);
      c.beginPath(); c.ellipse(g[0], g[1], 0.7 * s, 0.24 * s, 0, 0, 7); c.stroke();
      c.fillStyle = '#ffe14a'; c.beginPath(); c.moveTo(g[0], g[1] - hgt - 0.25 * s); c.lineTo(g[0] - 0.22 * s, g[1] - hgt - 0.6 * s); c.lineTo(g[0] + 0.22 * s, g[1] - hgt - 0.6 * s); c.fill();
      // jauge de tir
      if (this.input.shooting) { const pw = this.input.shootHold; c.fillStyle = '#0008'; c.fillRect(g[0] - 0.6 * s, g[1] - hgt - 0.95 * s, 1.2 * s, 0.18 * s); c.fillStyle = pw > 0.85 ? '#ff4d4d' : '#ffe14a'; c.fillRect(g[0] - 0.6 * s, g[1] - hgt - 0.95 * s, 1.2 * s * pw, 0.18 * s); }
    }
    // Projection affine du corps : la direction suivie par le joueur est visible,
    // y compris lorsqu'il court vers le haut ou le bas du terrain.
    c.save(); c.translate(g[0], g[1]);
    c.transform(bodyTransform.a, bodyTransform.b, bodyTransform.c, bodyTransform.d, 0, 0);
    c.translate(-g[0], -g[1]);
    const sp = Math.hypot(vx, vy), gait = Math.min(1, sp / 4), phase = anim, sw = Math.sin(phase) * gait * 0.58;
    const diveReach = keeperDive * (0.38 + keeperSave * 0.35 + diveStretch * 0.18);
    const armSwing = Math.sin(phase + Math.PI) * gait * 0.34;
    const kickProgress = clamp(1 - action(9, 'kickT') / 0.34, 0, 1);
    const kickPulse = Math.sin(kickProgress * Math.PI);
    const celebration = !fp ? Math.max(0, Math.min(1, (p.celebrateT || 0) / 0.7)) : 0;
    // Petit saut synchronisé à la célébration, sans déplacer le joueur au sol.
    if (celebration > 0.02) g[1] -= Math.sin((1 - celebration) * Math.PI * 2.2) * 0.18 * s * celebration;
    const bodyLean = clamp(
      sp * 0.012 + (p.turn || 0) * gait * 0.16 + tackleProfile.lunge * 0.3 -
      celebration * 0.08 + contactPulse * contactDir * 0.32 +
      keeperDive * diveSide * 0.28 + headerPulse * headerDir * 0.3 +
      stumblePulse * (p.stumbleDir || 1) * 0.23,
      -0.42, 0.52
    );
    const hipY = g[1] - hgt * 0.47;
    // Inclinaison dynamique du corps : accélération, changement d'appui,
    // contact et plongeon sont visibles jusque dans le haut du joueur.
    c.save(); c.translate(g[0], hipY); c.rotate(bodyLean); c.translate(-g[0], -hipY);
    // jambes
    c.strokeStyle = p.skin; c.lineWidth = Math.max(1.5, 0.15 * s); c.lineCap = 'round';
    for (const k of [-1, 1]) { const kickingLeg = k === 1 ? kickPulse : 0; const injuryLimp = p.injured ? (k === 1 ? -0.12 : 0.035) * (0.55 + 0.45 * Math.sin(anim * 0.55)) : 0;
      const celebrateStep = celebration * Math.sin(anim * 1.1 + k * Math.PI) * 0.22;
      const touchLeg = k === 1 ? firstTouchPulse : 0;
      const stride = sw * k + kickingLeg * (0.42 + 0.18 * Math.sin(kickProgress * Math.PI * 0.5)) +
        touchLeg * firstTouchDir * 0.32 + headerPulse * k * 0.12 +
        (k === 1 ? tackleProfile.reach * 0.52 : -tackleProfile.lunge * 0.1) +
        celebrateStep + injuryLimp + (p.turn || 0) * gait * 0.06 -
        stumblePulse * stumbleDir * 0.16;
      const lift = Math.max(0, Math.sin(phase * k)) * gait * (p.injured ? 0.045 : 0.15) * s +
        kickingLeg * 0.28 * s + touchLeg * 0.14 * s + Math.max(0, celebrateStep) * 0.22 * s;
      const rootX = g[0] + k * 0.1 * s;
      const kneeX = rootX + stride * 0.28 * s;
      const kneeY = hipY + hgt * 0.22 - lift * 0.36 - kickingLeg * 0.045 * s;
      const footX = rootX + stride * 0.5 * s + kickingLeg * 0.08 * s +
        (k === 1 ? tackleProfile.reach * 0.16 * s : 0);
      const footY = g[1] - 0.05 * s - lift;
      c.beginPath(); c.moveTo(rootX, hipY); c.lineTo(kneeX, kneeY); c.lineTo(footX, footY); c.stroke();
      c.fillStyle = p.skin; c.beginPath(); c.arc(kneeX, kneeY, Math.max(1, 0.055 * s), 0, Math.PI * 2); c.fill();
    }
    // chaussettes
    c.strokeStyle = kit.shirt; c.lineWidth = Math.max(1.5, 0.17 * s);
    for (const k of [-1, 1]) { const kickLeg = k === 1 ? kickPulse : 0; const fx = g[0] + k * 0.1 * s + sw * k * 0.5 * s + kickLeg * 0.24 * s; c.beginPath(); c.moveTo(fx - sw * k * 0.12 * s, g[1] - 0.45 * s); c.lineTo(fx + kickLeg * 0.12 * s, g[1] - 0.08 * s - kickLeg * 0.16 * s); c.stroke(); }
    // crampons sombres avec semelle claire, visibles en course
    c.strokeStyle = '#17191d'; c.lineWidth = Math.max(1.8, 0.11 * s); c.lineCap = 'round';
    for (const k of [-1, 1]) {
      const kickLeg = k === 1 ? kickPulse : 0; const fx = g[0] + k * 0.1 * s + sw * k * 0.5 * s + kickLeg * 0.24 * s;
      c.beginPath(); c.moveTo(fx, g[1] - 0.08 * s - kickLeg * 0.16 * s); c.lineTo(fx + (0.13 + kickLeg * 0.2) * s, g[1] - 0.015 * s - kickLeg * 0.16 * s); c.stroke();
      c.strokeStyle = '#d9dce2'; c.lineWidth = Math.max(0.7, 0.035 * s);
      c.beginPath(); c.moveTo(fx - 0.04 * s, g[1] - 0.02 * s); c.lineTo(fx + 0.12 * s, g[1] - 0.02 * s); c.stroke();
      c.strokeStyle = '#17191d'; c.lineWidth = Math.max(1.8, 0.11 * s);
    }
    // mouvement bref du pied au moment de la frappe ou de la passe
    if (kickPulse > 0.03) {
      c.save(); c.globalAlpha = kickPulse * 0.85; c.strokeStyle = '#f4f6fa'; c.lineWidth = Math.max(1, 0.045 * s); c.lineCap = 'round';
      const kx = g[0] + kickDir * 0.34 * s, ky = g[1] - 0.12 * s;
      c.beginPath(); c.moveTo(kx, ky); c.lineTo(kx + kickDir * 0.3 * s, ky - 0.12 * s); c.stroke(); c.restore();
    }
    // short : volume, coutures et liseré aux couleurs du club
    c.fillStyle = kit.shorts; c.fillRect(g[0] - w * 0.5, hipY - 0.06 * s, w, 0.3 * s);
    c.fillStyle = kit.trim; c.globalAlpha = 0.9;
    c.fillRect(g[0] - w * 0.5, hipY - 0.06 * s, Math.max(1, 0.035 * s), 0.3 * s);
    c.fillRect(g[0] + w * 0.465, hipY - 0.06 * s, Math.max(1, 0.035 * s), 0.3 * s);
    c.globalAlpha = 1;
    c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = Math.max(0.7, 0.025 * s);
    c.beginPath(); c.moveTo(g[0], hipY - 0.02 * s); c.lineTo(g[0], hipY + 0.2 * s); c.stroke();
    // maillot : rendu textile enrichi, panneaux, fines rayures et col
    const tY = g[1] - hgt * 0.82, tH = hgt * 0.37;
    const shirtX = g[0] - w * 0.55, shirtW = w * 1.1;
    c.save();
    this.rr(shirtX, tY, shirtW, tH, 0.1 * s); c.clip();
    c.fillStyle = kit.shirt; c.fillRect(shirtX, tY, shirtW, tH);
    // Motifs distincts par club : créations originales inspirées des couleurs,
    // sans prétendre reproduire un maillot officiel sous licence.
    const kitId = T.id || T.short || '';
    const pattern = kit.pattern || ({
      est: 'hoops', ca: 'stripes', css: 'pinstripes', ess: 'hoops',
      st: 'sash', usm: 'split', cab: 'stripes', esz: 'split',
      esm: 'stripes', usbg: 'hoops', asm: 'sash', ob: 'split'
    }[kitId] || (p.team === 0 ? 'stripes' : 'sash'));
    c.fillStyle = kit.trim;
    c.globalAlpha = 0.78;
    if (pattern === 'stripes' || pattern === 'pinstripes') {
      const count = pattern === 'pinstripes' ? 7 : 3;
      const band = shirtW / (count * 2 + 1);
      for (let n = 0; n < count; n++) {
        const width = pattern === 'pinstripes' ? Math.max(0.7, band * 0.28) : band;
        c.fillRect(shirtX + band * (1 + n * 2), tY, width, tH);
      }
    } else if (pattern === 'hoops') {
      c.fillRect(shirtX, tY + tH * 0.28, shirtW, Math.max(1, tH * 0.15));
      c.fillRect(shirtX, tY + tH * 0.67, shirtW, Math.max(1, tH * 0.13));
    } else if (pattern === 'sash') {
      c.beginPath(); c.moveTo(shirtX + shirtW * 0.68, tY); c.lineTo(shirtX + shirtW * 0.91, tY);
      c.lineTo(shirtX + shirtW * 0.34, tY + tH); c.lineTo(shirtX + shirtW * 0.11, tY + tH); c.closePath(); c.fill();
    } else if (pattern === 'split') {
      c.fillRect(shirtX + shirtW * 0.5, tY, shirtW * 0.5, tH);
    }
    c.globalAlpha = 1;
    // Panneaux latéraux légèrement ombrés pour donner du volume au tissu
    c.fillStyle = 'rgba(0,0,0,0.13)';
    c.fillRect(shirtX, tY, shirtW * 0.13, tH);
    c.fillRect(shirtX + shirtW * 0.87, tY, shirtW * 0.13, tH);
    // Rayures fines aux couleurs du club, visibles sans surcharger les petits sprites
    c.globalAlpha = 0.42;
    c.fillStyle = kit.trim;
    for (let stripe = 1; stripe <= 4; stripe++) {
      const sx = shirtX + shirtW * stripe / 5;
      c.fillRect(sx - Math.max(0.45, 0.018 * s), tY, Math.max(0.9, 0.036 * s), tH);
    }
    c.globalAlpha = 1;
    // Bande centrale / détail distinctif du maillot
    c.fillStyle = kit.trim;
    c.fillRect(g[0] - w * 0.055, tY, w * 0.11, tH);
    // Reflet textile discret sur le haut du torse
    const sheen = c.createLinearGradient(shirtX, tY, shirtX + shirtW, tY + tH);
    sheen.addColorStop(0, 'rgba(255,255,255,0.16)');
    sheen.addColorStop(0.48, 'rgba(255,255,255,0.015)');
    sheen.addColorStop(1, 'rgba(0,0,0,0.12)');
    c.fillStyle = sheen; c.fillRect(shirtX, tY, shirtW, tH);
    c.restore();
    c.strokeStyle = 'rgba(3,8,15,0.34)'; c.lineWidth = Math.max(0.8, 0.035 * s);
    this.rr(shirtX, tY, shirtW, tH, 0.1 * s); c.stroke();
    // Col contrasté
    c.strokeStyle = kit.trim; c.lineWidth = Math.max(1, 0.055 * s);
    c.beginPath(); c.arc(g[0], tY + 0.015 * s, 0.105 * s, 0.12 * Math.PI, 0.88 * Math.PI); c.stroke();
    // bras, manches et poignets contrastés
    c.strokeStyle = kit.shirt; c.lineWidth = Math.max(1.5, 0.13 * s);
    for (const k of [-1, 1]) {
      const ax = g[0] + k * w * 0.5;
      const ex = g[0] + k * w * 0.62 + armSwing * k * s +
        (p.isGK ? k * (0.12 + diveReach + keeperCatchPulse * 0.52 + keeperPunchPulse * 0.28) * s : 0) +
        (!p.isGK ? tackleProfile.reach * 0.42 * s + tackleProfile.lunge * k * 0.14 * s : 0) +
        celebration * k * 0.62 * s + (p.isGK ? 0 : headerPulse * k * 0.28 * s);
      const ey = tY + tH * 0.85 + Math.abs(armSwing) * 0.12 * s -
        (p.isGK ? (0.1 + diveReach * 0.72 + keeperCatchPulse * 0.48 + keeperPunchPulse * 0.28 + keeperDive * diveHeight * 0.24) * s : 0) +
        (!p.isGK ? tackleProfile.lunge * 0.18 * s : 0) - celebration * 0.98 * s -
        (p.isGK ? 0 : headerPulse * 0.45 * s);
      const shoulderY = tY + 0.08 * s;
      const elbowX = ax + (ex - ax) * 0.52 + Math.sin(phase * 1.1 + k * 0.9) * gait * 0.14 * s;
      const elbowY = shoulderY + (ey - shoulderY) * 0.5 + Math.abs(armSwing) * 0.055 * s + k * 0.012 * s;
      c.beginPath(); c.moveTo(ax, shoulderY); c.lineTo(elbowX, elbowY); c.lineTo(ex, ey); c.stroke();
      c.strokeStyle = kit.trim; c.lineWidth = Math.max(1.2, 0.075 * s);
      c.beginPath(); c.moveTo(elbowX + (ex - elbowX) * 0.56, elbowY + (ey - elbowY) * 0.56);
      c.lineTo(ex, ey); c.stroke();
      c.strokeStyle = kit.shirt; c.lineWidth = Math.max(1.5, 0.13 * s);
      if (!p.isGK) { c.fillStyle = p.skin; c.beginPath(); c.arc(ex, ey, Math.max(1, 0.045 * s), 0, Math.PI * 2); c.fill(); }
      if (p.isGK) {
        const gloveR = Math.max(2.2, (0.105 + keeperCatchPulse * 0.035 + keeperPunchPulse * 0.025) * s);
        c.fillStyle = '#f5d34f'; c.beginPath(); c.arc(ex, ey, gloveR, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#fff4b0'; c.lineWidth = Math.max(1, 0.035 * s); c.beginPath(); c.arc(ex, ey, gloveR + 1, -0.8, 0.8); c.stroke();
      }
    }
    if (p.isGK && (keeperDive > 0.02 || keeperSave > 0.02)) {
      c.save(); c.globalAlpha = Math.max(keeperDive, keeperSave) * 0.45; c.strokeStyle = '#f7d86a'; c.lineWidth = Math.max(1.5, 0.07 * s); c.beginPath(); c.ellipse(g[0], g[1] - 0.72 * s, (0.42 + diveReach * 0.85) * s, 0.22 * s, 0, 0, Math.PI * 2); c.stroke(); c.restore();
    }
    // tête
    const headX = g[0] + headerPulse * headerDir * 0.1 * s;
    const headY = tY - 0.14 * s - headerPulse * 0.12 * s;
    const skinLight = c.createRadialGradient(headX - 0.045 * s, headY - 0.055 * s, 0.012 * s, headX, headY, 0.14 * s);
    skinLight.addColorStop(0, '#f2c59b'); skinLight.addColorStop(0.55, p.skin); skinLight.addColorStop(1, '#543522');
    c.fillStyle = skinLight; c.beginPath(); c.arc(headX, headY, 0.13 * s, 0, 7); c.fill();
    c.fillStyle = '#1b130d'; c.beginPath(); c.arc(headX - face * 0.02 * s, headY - 0.04 * s, 0.12 * s, Math.PI, 0); c.fill();
    // numéro
    if (s > 14) { c.fillStyle = kit.trim === kit.shirt ? '#000' : '#fff'; c.font = `bold ${Math.round(0.24 * s)}px Arial`; c.textAlign = 'center'; c.fillText(p.num, g[0], tY + tH * 0.62); }
    // nom
    if ((p === this.selected || p === this.ball.owner) && !fp && s > 8) {
      c.font = `600 ${Math.round(Math.max(10 * this.dpr, 0.3 * s))}px system-ui,Arial`; c.textAlign = 'center';
      const nm = p.name.split(' ').slice(-1)[0];
      c.fillStyle = '#000a'; const tw = c.measureText(nm).width + 8; c.fillRect(g[0] - tw / 2, g[1] + 0.25 * s, tw, 0.42 * s);
      c.fillStyle = p.team === this.userSide ? '#ffe14a' : '#fff'; c.fillText(nm, g[0], g[1] + 0.56 * s);
    }
    c.restore();
    c.restore();
  }
  rr(x, y, w, h, r) { const c = this.c; c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  drawBall(x, y, z, replayState = null) {
    const c = this.c, sh = this.proj(x, y, 0), b = this.proj(x, y, z + 0.11);
    const ball = this.ball;
    const vx = replayState ? (replayState[3] || 0) : (ball.vx || 0);
    const vy = replayState ? (replayState[4] || 0) : (ball.vy || 0);
    const vz = replayState ? (replayState[5] || 0) : (ball.vz || 0);
    const spinValue = replayState ? (replayState[6] || 0) : (ball.spin || 0);
    const speed = Math.hypot(vx, vy);
    const r = Math.max(2.5 * this.dpr, 0.13 * b[2]);
    // Ombre portée : elle s'élargit et s'adoucit avec la hauteur réelle du ballon.
    const shadow = getBallShadowMetrics(z);
    c.save(); c.globalAlpha = shadow.opacity; c.fillStyle = 'rgba(0,0,0,0.52)';
    c.beginPath(); c.ellipse(sh[0], sh[1], r * shadow.spread, r * shadow.squash, 0, 0, Math.PI * 2); c.fill(); c.restore();
    // Petit anneau d'impact à la retombée après un rebond.
    if (z < 0.22 && vz < -1.2) {
      const impact = Math.max(0, 1 - z / 0.22);
      c.save(); c.globalAlpha = impact * 0.28; c.strokeStyle = '#fff'; c.lineWidth = Math.max(1, this.dpr);
      c.beginPath(); c.ellipse(sh[0], sh[1], r * (1.2 + impact * 1.1), r * (0.45 + impact * 0.18), 0, 0, Math.PI * 2); c.stroke(); c.restore();
    }
    // Traînée courte, orientée selon la vitesse réelle du ballon.
    if (speed > 7) {
      const len = Math.min(2.8, speed * 0.13), tail = this.proj(x - (vx / speed) * len, y - (vy / speed) * len, z + 0.11);
      const grad = c.createLinearGradient(tail[0], tail[1], b[0], b[1]);
      grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(1, 'rgba(255,255,255,0.62)');
      c.strokeStyle = grad; c.lineWidth = Math.max(1.2 * this.dpr, r * 0.42); c.lineCap = 'round';
      c.beginPath(); c.moveTo(tail[0], tail[1]); c.lineTo(b[0], b[1]); c.stroke();
    }
    c.save(); c.translate(b[0], b[1]);
    // Rotation des panneaux pour rendre la balle moins statique en vol et en roulement.
    const replayClock = replayState && Number.isFinite(replayState[7]) ? replayState[7] : this.clock;
    const spin = getBallRotation(spinValue, replayClock, speed);
    c.rotate(spin);
    const surface = c.createRadialGradient(-r * 0.34, -r * 0.38, r * 0.04, 0, 0, r * 1.08);
    surface.addColorStop(0, '#ffffff'); surface.addColorStop(0.62, '#eef1f3'); surface.addColorStop(1, '#9ca5ae');
    c.fillStyle = surface; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
    c.save(); c.beginPath(); c.arc(0, 0, r * 0.985, 0, Math.PI * 2); c.clip();
    // Panneau central et coutures courbes, lisibles même lorsque le ballon est petit.
    c.fillStyle = '#252a31'; c.beginPath();
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5, px = Math.cos(a) * r * 0.31, py = Math.sin(a) * r * 0.31; i ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.closePath(); c.fill();
    c.strokeStyle = 'rgba(28,34,41,0.82)'; c.lineWidth = Math.max(0.55, r * 0.055);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      c.beginPath(); c.moveTo(Math.cos(a) * r * 0.28, Math.sin(a) * r * 0.28);
      c.quadraticCurveTo(Math.cos(a + 0.18) * r * 0.72, Math.sin(a + 0.18) * r * 0.72, Math.cos(a + 0.42) * r * 0.98, Math.sin(a + 0.42) * r * 0.98); c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,0.52)'; c.beginPath(); c.ellipse(-r * 0.31, -r * 0.42, r * 0.21, r * 0.1, -0.55, 0, Math.PI * 2); c.fill();
    c.restore();
    c.strokeStyle = 'rgba(20,27,34,0.55)'; c.lineWidth = Math.max(0.55, r * 0.035); c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
    c.restore();
  }
  screenPoint(x, y, z = 0) {
    if (this.renderer3d && !this.renderer3d.lost && this.renderer3d.lastVP) return this.renderer3d.project(x, y, z, this.W, this.H);
    const q = this.proj(x, y, z); return q && q[3] > 0.1 ? [q[0], q[1]] : null;
  }
  // Visée des coups de pied arrêtés et jauge de puissance du joueur contrôlé.
  drawAimGuide() {
    if (this.userSide == null || this.state !== 'play') return;
    const p = this.selected, b = this.ball, c = this.c, d = this.dpr;
    if (!p || b.owner !== p) return;
    const inp = this.input, locked = this.isSetPieceLocked();
    const head = this.screenPoint(p.x, p.y, 2.35);
    if (inp.shooting && head) {
      const w = 46 * d, h = 7 * d, pw = clamp(inp.shootHold, 0, 1);
      c.save(); c.fillStyle = 'rgba(0,0,0,0.55)'; this.rr(head[0] - w / 2, head[1] - h, w, h, 3 * d); c.fill();
      c.fillStyle = pw > 0.85 ? '#ff4d4d' : pw > 0.55 ? '#ffb020' : '#ffe14a';
      this.rr(head[0] - w / 2, head[1] - h, Math.max(h, w * pw), h, 3 * d); c.fill(); c.restore();
    }
    if (!locked) return;
    const T = this.teams[p.team], dir = T.dir, gx = HL * dir;
    const mag = Math.hypot(inp.jx, inp.jy);
    const drawPath = (tx, ty, peak, color, ring) => {
      c.save(); c.strokeStyle = color; c.lineWidth = 2.4 * d; c.setLineDash([6 * d, 5 * d]); c.beginPath();
      let started = false;
      for (let i = 0; i <= 16; i++) {
        const t = i / 16, q = this.screenPoint(b.x + (tx - b.x) * t, b.y + (ty - b.y) * t, 0.12 + peak * 4 * t * (1 - t) + (ring === 'goal' ? t * 1.0 : 0));
        if (!q) continue;
        if (!started) { c.moveTo(q[0], q[1]); started = true; } else c.lineTo(q[0], q[1]);
      }
      c.stroke(); c.setLineDash([]);
      const end = this.screenPoint(tx, ty, ring === 'goal' ? 1.1 : 0);
      if (end) { c.fillStyle = color; c.globalAlpha = 0.85; c.beginPath(); c.arc(end[0], end[1], 6 * d, 0, Math.PI * 2); c.fill(); }
      c.restore();
    };
    const near = Math.hypot(gx - b.x, b.y) < 36;
    if ((this.setPiece === 'freekick' && near) || this.setPiece === 'penalty') {
      const keeper = this.teams[1 - p.team].ps[0];
      const aimY = mag > 0.3 ? clamp(inp.jy / mag * 3.2, -3.3, 3.3) : null;
      drawPath(gx, getShotTargetY(keeper?.y ?? 0, p.y, aimY), this.setPiece === 'penalty' ? 0.3 : 1.2, '#ff5a5f', 'goal');
    }
    if (this.setPiece !== 'penalty') {
      const aim = mag > 0.2 ? [inp.jx / mag, inp.jy / mag] : null;
      const opt = (aim && this.bestPass(p, aim, false)) || this.bestPass(p, null, false);
      if (opt) drawPath(opt.tx, opt.ty, this.setPiece === 'corner' || Math.hypot(opt.tx - b.x, opt.ty - b.y) > 32 ? 2 : 0.15, '#ffffff', 'pass');
    }
  }
  drawReplayBug() {
    const c = this.c, d = this.dpr, r = this.replay, seg = r.segs[r.seg];
    const x = 12 * d, y = this.H - 64 * d, w = Math.min(230 * d, this.W * 0.42), h = 40 * d;
    c.save();
    c.fillStyle = 'rgba(7,17,29,0.82)'; this.rr(x, y, w, h, 7 * d); c.fill();
    c.fillStyle = '#ffdf45'; this.rr(x, y, 62 * d, h, 7 * d); c.fill();
    c.fillStyle = '#07111d'; c.font = `900 ${10 * d}px system-ui,Arial`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('RALENTI', x + 31 * d, y + h / 2 - 5 * d);
    c.font = `800 ${9 * d}px system-ui,Arial`; c.fillText(`${r.seg + 1}/${r.segs.length}`, x + 31 * d, y + h / 2 + 8 * d);
    c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = `800 ${11 * d}px system-ui,Arial`;
    c.fillText(seg.label, x + 72 * d, y + 14 * d);
    const bx = x + 72 * d, bw = w - 82 * d, prog = clamp((r.i - seg.from) / Math.max(1, r.frames.length - 1 - seg.from), 0, 1);
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(bx, y + 26 * d, bw, 3 * d);
    c.fillStyle = '#ffdf45'; c.fillRect(bx, y + 26 * d, bw * prog, 3 * d);
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.font = `700 ${9 * d}px system-ui,Arial`; c.textAlign = 'right';
    c.fillText('Touchez pour passer', this.W - 14 * d, this.H - 14 * d);
    // Bandeaux cinéma pendant le ralenti.
    c.fillStyle = 'rgba(0,0,0,0.38)'; c.fillRect(0, 0, this.W, 6 * d);
    c.restore();
  }
  // Volet de transition aux couleurs du club (masque les changements de caméra).
  drawTvWipe() {
    const t = this.tvWipeT || 0; if (t <= 0) return;
    const c = this.c, d = this.dpr, W = this.W, H = this.H;
    const p = 1 - t / TV_WIPE, ease = p * p * (3 - 2 * p);
    const cx = -W * 0.45 + ease * W * 1.9, band = W * 0.62, slant = H * 0.45;
    const home = this.teams[this.lastGoalTeam ?? 0]?.kit || {};
    c.save();
    const poly = (x0, wdt, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(x0 - wdt / 2 + slant, 0); c.lineTo(x0 + wdt / 2 + slant, 0); c.lineTo(x0 + wdt / 2 - slant, H); c.lineTo(x0 - wdt / 2 - slant, H); c.closePath(); c.fill(); };
    poly(cx - band * 0.62, band * 0.16, home.trim || '#ffffff');
    poly(cx, band, home.shirt || '#c8102e');
    poly(cx + band * 0.6, band * 0.1, '#ffdf45');
    c.fillStyle = '#fff'; c.font = `900 ${Math.min(46 * d, H * 0.14)}px system-ui,Arial`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.globalAlpha = clamp(1 - Math.abs(ease - 0.5) * 2.4, 0, 1);
    c.fillText('FT 26', cx, H / 2);
    c.restore();
  }
  drawHUD(isReplay, frame = null) {
    const c = this.c, d = this.dpr, T = this.teams;
    if (!isReplay) this.drawAimGuide();
    // Scoreboard broadcast : proportions calculées selon la largeur réelle du canvas.
    const layout = getMatchHudLayout(this.W, d);
    const x0 = 12 * d, y0 = 12 * d, h = layout.scoreHeight;
    const min = Math.floor(this.minute);
    const homeLabel = String(T[0].short || T[0].name).slice(0, layout.compact ? 5 : 9);
    const awayLabel = String(T[1].short || T[1].name).slice(0, layout.compact ? 5 : 9);
    const teamW = layout.teamWidth, scoreW = layout.scoreWidth, clockW = layout.clockWidth;
    const scoreX = x0 + teamW, awayX = scoreX + scoreW, clockX = awayX + teamW;
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.42)'; c.shadowBlur = 14 * d; c.shadowOffsetY = 3 * d;
    const panel = c.createLinearGradient(x0, y0, x0, y0 + h);
    panel.addColorStop(0, 'rgba(12,22,35,0.96)'); panel.addColorStop(1, 'rgba(4,10,18,0.94)');
    this.rr(x0, y0, layout.panelWidth, h, 9 * d);
    c.fillStyle = panel; c.fill();
    c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = Math.max(1, d);
    this.rr(x0, y0, layout.panelWidth, h, 9 * d); c.stroke();
    c.fillStyle = T[0].kit.shirt; c.fillRect(x0, y0 + 5 * d, 4 * d, h - 10 * d);
    c.fillStyle = T[1].kit.shirt; c.fillRect(awayX + teamW - 4 * d, y0 + 5 * d, 4 * d, h - 10 * d);
    c.textBaseline = 'middle'; c.textAlign = 'center';
    c.fillStyle = '#f3f6fb'; c.font = `800 ${(layout.compact ? 9.5 : 11) * d}px system-ui,Arial`;
    c.fillText(homeLabel, x0 + teamW / 2, y0 + h / 2);
    c.fillText(awayLabel, awayX + teamW / 2, y0 + h / 2);
    c.fillStyle = 'rgba(255,255,255,0.09)'; c.fillRect(scoreX + 2 * d, y0 + 5 * d, scoreW - 4 * d, h - 10 * d);
    c.fillStyle = '#fff'; c.font = `900 ${(layout.compact ? 17 : 20) * d}px system-ui,Arial`;
    c.fillText(`${this.score[0]}  –  ${this.score[1]}`, scoreX + scoreW / 2, y0 + h / 2);
    const clockGrad = c.createLinearGradient(clockX, y0, clockX + clockW, y0 + h);
    clockGrad.addColorStop(0, '#f13a45'); clockGrad.addColorStop(1, '#a90d1b');
    c.fillStyle = clockGrad; c.fillRect(clockX, y0, clockW, h);
    c.fillStyle = '#fff'; c.font = `900 ${(layout.compact ? 10 : 12) * d}px system-ui,Arial`;
    c.fillText(this.state === 'shootout' ? 'TAB' : `${String(min).padStart(2, '0')}'`, clockX + clockW / 2, y0 + h / 2);
    c.restore();
    // Live match centre remains on desktop; on narrow phones the pitch stays clear.
    if (!isReplay && layout.statsWidth > 0) {
      const sw = layout.statsWidth, sh = layout.statsHeight, sx = this.W - sw - 12 * d, sy = 12 * d;
      const totalPoss = Math.max(0.01, this.stats.poss[0] + this.stats.poss[1]);
      const poss0 = Math.round(this.stats.poss[0] / totalPoss * 100), poss1 = 100 - poss0;
      c.save();
      this.rr(sx, sy, sw, sh, 9 * d); c.fillStyle = 'rgba(5,14,24,0.86)'; c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.17)'; c.lineWidth = Math.max(1, d); this.rr(sx, sy, sw, sh, 9 * d); c.stroke();
      c.fillStyle = '#e7c86b'; c.font = `800 ${10 * d}px system-ui,Arial`;
      c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('MATCH CENTER', sx + 9 * d, sy + 13 * d);
      c.fillStyle = T[0].kit.shirt; c.fillRect(sx + 9 * d, sy + 23 * d, (sw - 18 * d) * poss0 / 100, 5 * d);
      c.fillStyle = T[1].kit.shirt; c.fillRect(sx + 9 * d + (sw - 18 * d) * poss0 / 100, sy + 23 * d, (sw - 18 * d) * poss1 / 100, 5 * d);
      c.fillStyle = '#e9eef8'; c.font = `600 ${9 * d}px system-ui,Arial`;
      c.fillText(`Possession  ${poss0}% – ${poss1}%`, sx + 9 * d, sy + 41 * d);
      c.fillText(`Tirs  ${this.stats.shots[0]}–${this.stats.shots[1]}   •   Cadrés  ${this.stats.onTarget[0]}–${this.stats.onTarget[1]}`, sx + 9 * d, sy + 56 * d);
      const passPct = [0, 1].map(i => this.stats.passes[i] ? Math.round(this.stats.passOk[i] / this.stats.passes[i] * 100) : 0);
      c.fillStyle = '#aebbd0'; c.fillText(`Précision passes  ${passPct[0]}%–${passPct[1]}%`, sx + 9 * d, sy + 69 * d);
      c.restore();
    }
    // bandeau commentaire
    const celebrating = !isReplay && this.goalFxT > 0;
    if (this.tickerT > 0 && this.ticker && !celebrating) {
      c.font = `600 ${12.5 * d}px system-ui,Arial`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const text = this.ticker.length > 90 ? this.ticker.slice(0, 88) + '…' : this.ticker;
      const w = Math.min(this.W - 40 * d, c.measureText(text).width + 28 * d), ty = y0 + h + 10 * d;
      c.save(); c.globalAlpha = Math.min(1, this.tickerT / 0.4);
      c.fillStyle = 'rgba(6,12,22,0.78)'; this.rr(this.W / 2 - w / 2, ty, w, 26 * d, 13 * d); c.fill();
      c.fillStyle = '#ffe14a'; this.rr(this.W / 2 - w / 2, ty, 4 * d, 26 * d, 2 * d); c.fill();
      c.fillStyle = '#fff'; c.fillText(text, this.W / 2, ty + 13.5 * d); c.restore();
    }
    if (this.msgT > 0 && this.msg && !celebrating) {
      // Annonce en pastille : lisible sans masquer l'action.
      const size = Math.max(18, Math.round(Math.min(this.H * 0.07, 40 * d)));
      c.font = `900 ${size}px system-ui,Arial`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const w = c.measureText(this.msg).width + 44 * d, bh = size * 1.55, by = this.H * 0.3;
      c.save(); c.globalAlpha = Math.min(1, this.msgT / 0.35);
      c.fillStyle = 'rgba(6,12,22,0.82)'; this.rr(this.W / 2 - w / 2, by - bh / 2, w, bh, bh / 2); c.fill();
      c.strokeStyle = isReplay ? '#ffe14a' : 'rgba(255,255,255,0.35)'; c.lineWidth = 1.5 * d; this.rr(this.W / 2 - w / 2, by - bh / 2, w, bh, bh / 2); c.stroke();
      c.fillStyle = isReplay ? '#ffe14a' : '#fff'; c.fillText(this.msg, this.W / 2, by + 1 * d); c.restore();
    }
    c.textBaseline = 'alphabetic';
    if (isReplay && this.replay) this.drawReplayBug();
    this.drawTvWipe();
    // Tirs au but : tableau de séance à la place du radar.
    if (this.state === 'shootout') { this.drawShootoutPanel(); this.drawShootoutAim(); c.textBaseline = 'alphabetic'; return; }
    // radar
    const mw = 96 * d, mh = 62 * d, mx = this.W / 2 - mw / 2, my = this.H - mh - 10 * d;
    c.fillStyle = 'rgba(6,24,14,0.55)'; this.rr(mx, my, mw, mh, 6 * d); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 1; this.rr(mx, my, mw, mh, 6 * d); c.stroke();
    c.beginPath(); c.arc(mx + mw / 2, my + mh / 2, mh * 0.13, 0, Math.PI * 2); c.stroke();
    c.strokeRect(mx, my + mh * 0.22, mw * 0.16, mh * 0.56); c.strokeRect(mx + mw * 0.84, my + mh * 0.22, mw * 0.16, mh * 0.56);
    c.beginPath(); c.moveTo(mx + mw / 2, my); c.lineTo(mx + mw / 2, my + mh); c.stroke();
    for (const Tm of T) for (const p of Tm.ps) { if (p.sentOff) continue; c.fillStyle = p === this.selected ? '#ffe14a' : Tm.kit.shirt; c.beginPath(); c.arc(mx + (p.x + HL) / (2 * HL) * mw, my + (HW - p.y) / (2 * HW) * mh, (p === this.selected ? 2.8 : 2) * d, 0, 7); c.fill(); }
    const radarBall = frame ? frame.b : [this.ball.x, this.ball.y];
    c.fillStyle = '#fff'; c.beginPath(); c.arc(mx + (radarBall[0] + HL) / (2 * HL) * mw, my + (HW - radarBall[1]) / (2 * HW) * mh, 2 * d, 0, 7); c.fill();
    c.textBaseline = 'alphabetic';
  }
}

// ---------- Simulation statistique rapide (sans rendu) ----------
export function quickSim(strH, strA, r = Math.random, homeAdv = 1.08) {
  const ratio = (strH * homeAdv) / strA;
  const lamH = 1.25 * Math.pow(ratio, 2.2), lamA = 1.05 * Math.pow(1 / ratio, 2.2);
  const pois = l => { const L = Math.exp(-Math.min(l, 6)); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; };
  return [Math.min(pois(lamH), 8), Math.min(pois(lamA), 8)];
}

// ---------- Réseau : état compact d'un match (même champs que le ralenti) ----------
export const NET_PLAYER_FIELDS = ['x', 'y', 'face', 'anim', 'vx', 'vy', 'jumpT', 'diveT', 'slideT', 'kickT', 'headerT', 'firstTouchT', 'stumbleT', 'keeperCatchT', 'keeperPunchT', 'headerDir', 'diveDir', 'slideDir', 'kickDir', 'firstTouchDir', 'stumbleDir', 'diveHeight', 'diveStretch', 'contactT', 'contactDir', 'slideDuration', 'heading', 'kickFootSide', 'motionAccel', 'celebrateT', 'saveT'];
const r2 = v => Math.round((Number(v) || 0) * 100) / 100;
export function getNetSnapshot(m, full = false) {
  const b = m.ball;
  const snap = {
    t: r2(m.clock), mi: r2(m.minute), h: m.half, st: m.state, sc: m.score.slice(),
    b: [r2(b.x), r2(b.y), r2(b.z), r2(b.vx), r2(b.vy), r2(b.vz), r2(b.spin)],
    o: b.owner ? b.owner.team * 11 + b.owner.i : -1,
    p: m.teams.flatMap(T => T.ps.map(p => NET_PLAYER_FIELDS.map(k => r2(p[k])).concat(p.sentOff ? 1 : 0))),
    sel: [m.humans?.[0]?.selected?.i ?? -1, m.humans?.[1]?.selected?.i ?? -1],
    sp: m.setPiece || null, msg: m.msgT > 0 ? m.msg : null, msgT: r2(m.msgT),
    tk: m.tickerT > 0 ? m.ticker : null, tkT: r2(m.tickerT),
    gfx: m.goalFxT > 0 ? [r2(m.goalFxT), m.goalFxTeam, m.goalFxScorer] : null,
  };
  if (full) snap.stats = m.stats;
  return snap;
}
export function applyNetSnapshot(m, snap, smooth = 1) {
  if (!snap) return;
  m.clock = snap.t; m.minute = snap.mi; m.half = snap.h; m.state = snap.st; m.score = snap.sc;
  const [bx, by, bz, bvx, bvy, bvz, spin] = snap.b, b = m.ball;
  b.x += (bx - b.x) * smooth; b.y += (by - b.y) * smooth; b.z += (bz - b.z) * smooth;
  b.vx = bvx; b.vy = bvy; b.vz = bvz; b.spin = spin;
  b.owner = snap.o >= 0 ? m.teams[Math.floor(snap.o / 11)]?.ps[snap.o % 11] || null : null;
  const n = NET_PLAYER_FIELDS.length;
  let k = 0;
  for (const T of m.teams) for (const p of T.ps) {
    const row = snap.p[k++]; if (!row) continue;
    for (let i = 0; i < n; i++) {
      const key = NET_PLAYER_FIELDS[i];
      if (smooth < 1 && (key === 'x' || key === 'y')) p[key] += (row[i] - p[key]) * smooth; else p[key] = row[i];
    }
    p.sentOff = !!row[n];
  }
  if (m.userSide != null && snap.sel[m.userSide] >= 0) m.selected = m.teams[m.userSide].ps[snap.sel[m.userSide]];
  m.setPiece = snap.sp;
  if (snap.msg) { m.msg = snap.msg; m.msgT = snap.msgT; } else m.msgT = 0;
  if (snap.tk) { m.ticker = snap.tk; m.tickerT = snap.tkT; }
  if (snap.gfx) { [m.goalFxT, m.goalFxTeam, m.goalFxScorer] = snap.gfx; } else m.goalFxT = 0;
  if (snap.stats) m.stats = snap.stats;
}
