// Tactique en direct : consignes rapides, changement de formation et conseils de l'adjoint.
// Fonctions pures, sans rendu : testables et partagées par le moteur et l'interface.
import { FORMATIONS, FORMATION_POS, POS_GROUP } from './data.js';

// Consignes rapides (comme les flèches tactiques des jeux de football modernes).
export const TACTIC_PRESETS = {
  park: { label: 'Bloc bas', icon: '🧱', mentality: -2, pressing: 0, width: 0, line: -1 },
  counter: { label: 'Contre-attaque', icon: '⚡', mentality: -1, pressing: 1, width: 1, line: -1 },
  balanced: { label: 'Équilibré', icon: '⚖️', mentality: 0, pressing: 1, width: 1, line: 0 },
  press: { label: 'Pressing haut', icon: '🔥', mentality: 1, pressing: 2, width: 1, line: 1 },
  allout: { label: 'Tout pour l\'attaque', icon: '🚀', mentality: 2, pressing: 2, width: 2, line: 1 },
  possession: { label: 'Possession', icon: '🔄', mentality: 0, pressing: 1, width: 1, line: 0, style: 'possession' },
  wings: { label: 'Jeu sur les ailes', icon: '↔️', mentality: 1, pressing: 1, width: 2, line: 0, style: 'wings' },
};

export function applyPreset(team, key) {
  const p = TACTIC_PRESETS[key];
  if (!team || !p) return false;
  team.mentality = p.mentality; team.pressing = p.pressing; team.width = p.width; team.line = p.line; team.style = p.style || null;
  team.preset = key;
  return true;
}

// Côté naturel d'un poste : droite (+1), gauche (-1) ou axe (0).
const SIDE = { DD: 1, MD: 1, AD: 1, DG: -1, MG: -1, AG: -1 };
const GROUP_ORDER = { G: 0, D: 1, M: 2, A: 3 };

function slotFit(playerPos, slotPos) {
  if (playerPos === slotPos) return 10;
  const pg = POS_GROUP[playerPos], sg = POS_GROUP[slotPos];
  if (!pg || !sg) return 0;
  let score = 0;
  const gap = Math.abs(GROUP_ORDER[pg] - GROUP_ORDER[sg]);
  if (pg === sg) score = 6;
  else if (gap === 1) score = 2.5;
  else score = -8 * gap; // un défenseur en attaque (ou l'inverse) est à éviter absolument
  const ps = SIDE[playerPos] ?? 0, ss = SIDE[slotPos] ?? 0;
  if (ps === ss) score += 1.5; else if (ps && ss && ps !== ss) score -= 1;
  return score;
}

// Affectation optimale joueurs → cases (algorithme hongrois, coût = −correspondance) :
// le gardien reste dans le but, chaque joueur de champ rejoint la case la plus cohérente.
function hungarian(cost) {
  const n = cost.length, INF = 1e9;
  const u = new Array(n + 1).fill(0), v = new Array(n + 1).fill(0), p = new Array(n + 1).fill(0), way = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i; let j0 = 0;
    const minv = new Array(n + 1).fill(INF), used = new Array(n + 1).fill(false);
    do {
      used[j0] = true; const i0 = p[j0]; let delta = INF, j1 = 0;
      for (let j = 1; j <= n; j++) if (!used[j]) {
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= n; j++) { if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta; }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const assign = new Array(n).fill(-1);
  for (let j = 1; j <= n; j++) if (p[j]) assign[p[j] - 1] = j - 1;
  return assign;
}

export function getFormationAssignment(players = [], formation = '4-3-3') {
  const slots = FORMATION_POS[formation] || FORMATION_POS['4-3-3'];
  const result = new Array(players.length).fill(-1);
  const gkIndex = players.findIndex(p => p?.isGK);
  if (gkIndex >= 0) result[gkIndex] = 0;
  const outfield = players.map((p, i) => i).filter(i => i !== gkIndex && players[i] && !players[i].sentOff);
  const slotIdx = slots.map((_, i) => i).filter(i => i > 0);
  // Matrice carrée : cases en trop (joueurs expulsés) comblées par des colonnes neutres.
  const n = Math.max(outfield.length, slotIdx.length);
  const cost = [];
  for (let r = 0; r < n; r++) {
    const row = [];
    for (let c = 0; c < n; c++) {
      const pi = outfield[r], si = slotIdx[c];
      row.push(pi == null || si == null ? 0 : -slotFit(players[pi].pos, slots[si]));
    }
    cost.push(row);
  }
  const assign = hungarian(cost);
  assign.forEach((c, r) => { if (outfield[r] != null && slotIdx[c] != null) result[outfield[r]] = slotIdx[c]; });
  return result;
}

export function getFormationBase(formation, slot) {
  const form = FORMATIONS[formation] || FORMATIONS['4-3-3'];
  return form[slot] ? form[slot].slice() : null;
}

// Conseils de l'adjoint : remplacements prioritaires et consigne adaptée au score.
export function getCoachAdvice(team, { minute = 0, goalDiff = 0, subsLeft = 5 } = {}) {
  const advice = [];
  if (!team) return advice;
  const bench = (team.bench || []).map((b, idx) => ({ b, idx })).filter(v => !v.b.used);
  const bestBenchFor = (pos) => {
    const keeper = pos === 'GK';
    const options = bench.filter(v => (v.b.pos === 'GK') === keeper);
    options.sort((x, y) => (slotFit(y.b.pos, pos) * 10 + (y.b.fitness ?? 1) * 5) - (slotFit(x.b.pos, pos) * 10 + (x.b.fitness ?? 1) * 5));
    return options[0] || null;
  };
  if (subsLeft > 0) {
    const concerns = [];
    team.ps.forEach((p, idx) => {
      if (!p || p.sentOff || p.subbedOff) return;
      if (p.injured) concerns.push({ idx, p, weight: 100, reason: 'blessé' });
      else if (p.stamina < 0.42) concerns.push({ idx, p, weight: 60 + (0.42 - p.stamina) * 100, reason: `épuisé (${Math.round(p.stamina * 100)} %)` });
      else if (p.yellow === 1 && minute >= 55 && !p.isGK && POS_GROUP[p.pos] !== 'A') concerns.push({ idx, p, weight: 35, reason: 'averti, risque d\'expulsion' });
      else if (p.stamina < 0.55 && minute >= 60) concerns.push({ idx, p, weight: 25, reason: `fatigué (${Math.round(p.stamina * 100)} %)` });
    });
    concerns.sort((a, b) => b.weight - a.weight);
    const usedBench = new Set();
    for (const c of concerns) {
      if (advice.filter(a => a.type === 'sub').length >= Math.min(3, subsLeft)) break;
      const option = bestBenchFor(c.p.pos);
      if (!option || usedBench.has(option.idx)) continue;
      usedBench.add(option.idx);
      advice.push({ type: 'sub', out: c.idx, in: option.idx, outName: c.p.name, inName: option.b.name, reason: c.reason });
    }
  }
  if (minute >= 65 && goalDiff < 0 && team.preset !== 'allout' && team.mentality < 2) advice.push({ type: 'preset', preset: goalDiff <= -2 || minute >= 80 ? 'allout' : 'press', reason: 'il faut revenir au score' });
  else if (minute >= 75 && goalDiff > 0 && team.mentality > -1) advice.push({ type: 'preset', preset: goalDiff >= 2 ? 'counter' : 'park', reason: 'préserver l\'avance' });
  return advice;
}
