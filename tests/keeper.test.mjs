// Batterie de 25 situations de gardien (Master Production Bible §30 : « au moins 25 situations de tir et centres »).
// Chaque situation est injectée dans le moteur réel (match.js), le gardien est piloté par l'IA, et l'issue est mesurée.
// REPORT=1 écrit docs/RAPPORT-GARDIEN.md avec les résultats bruts (aucun chiffre inventé : tout vient de cette exécution).
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
{ let r = 424242; Math.random = () => { r = (Math.imul(r, 1664525) + 1013904223) >>> 0; return r / 0x100000000; }; } // exécution reproductible
globalThis.window = { addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1, innerWidth: 800, innerHeight: 400 };
globalThis.document = { addEventListener() {}, removeEventListener() {}, hidden: false, createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) }) };

const { Match, getKeeperClaimPlan, resolveKeeperState } = await import('../public/js/match.js');
const C = await import('../public/js/career.js');
const HL = 52.5, G = 9.81;
const canvas = { clientWidth: 800, clientHeight: 400, getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) };

function freshMatch(seedBase) {
  const st = C.newCareer({ clubId: 'est', seed: 3 });
  let seed = seedBase >>> 0; const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
  const m = new Match({ canvas, home: C.matchTeam(st, 'est'), away: C.matchTeam(st, 'ca', true), userSide: null, settings: { duration: 5, voice: false, replays: false, difficulty: 1 }, random });
  for (let i = 0; i < 1200 && m.state !== 'play'; i++) m.step(1 / 60);
  return m;
}

// Attaque de l'équipe 0 vers le but défendu par le gardien de l'équipe 1.
function setup(m, keeperPos) {
  const att = m.teams[0], def = m.teams[1], d = att.dir, goalX = HL * d;
  const gk = def.ps[0];
  // Les joueurs de champ sont éloignés de l'action pour isoler le duel tireur / gardien.
  for (const T of [att, def]) T.ps.forEach((p, i) => { if (!p.isGK) { p.x = -d * 20 + (i % 5); p.y = -28 + i * 5; p.vx = p.vy = 0; } });
  gk.x = goalX - d * (keeperPos?.depth ?? 1.6); gk.y = keeperPos?.y ?? 0; gk.vx = gk.vy = 0; gk.diveT = 0; gk.gkState = 'set'; gk.gkStateLog = [];
  return { att, def, d, goalX, gk, shooter: att.ps.find(p => !p.isGK && p.pos !== 'G') || att.ps[9] };
}

function launch(m, ctx, { from, to, speed, z0 = 0.11, type = 'normal', shot = true }) {
  const b = m.ball, { d, goalX, shooter } = ctx;
  const sx = goalX - d * from.dist, sy = from.y;
  const tx = goalX + d * (to.over ?? 0), ty = to.y, tz = to.z;
  const dist = Math.hypot(tx - sx, ty - sy), T = dist / speed;
  b.owner = null; b.x = sx; b.y = sy; b.z = z0;
  b.vx = (tx - sx) / T; b.vy = (ty - sy) / T; b.vz = (tz - z0 + 0.5 * G * T * T) / T;
  b.last = shooter; b.lastTeam = 0;
  shooter.x = sx - d * 6; shooter.y = sy + 3; shooter.cd = 1;
  b.inFlightShot = shot ? { team: 0, shooter, t: 0, type, kind: type, x: sx, y: sy, distance: from.dist } : null;
  if (b.shotType !== undefined) b.shotType = type;
}

function run(m, ctx, maxT = 3) {
  const ev0 = m.events.length, s0 = m.score[0], gk = ctx.gk;
  let this_line = null; let maxSpeed = 0, prev = { x: gk.x, y: gk.y }, states = new Set();
  for (let i = 0; i < maxT * 60; i++) {
    m.step(1 / 60);
    const v = Math.hypot(gk.x - prev.x, gk.y - prev.y) * 60; prev = { x: gk.x, y: gk.y };
    if (m.state === 'play') maxSpeed = Math.max(maxSpeed, v);
    if (gk.gkState) states.add(gk.gkState);
    if (!this_line && Math.abs(m.ball.x - ctx.goalX) < 2.5) this_line = { y: +m.ball.y.toFixed(2), z: +m.ball.z.toFixed(2), v: +Math.hypot(m.ball.vx, m.ball.vy).toFixed(1), gy: +gk.y.toFixed(2) };
    if (m.score[0] !== s0 || m.state === 'goal') return { line: this_line, out: 'but', maxSpeed, states };
    const ev = m.events.slice(ev0).find(e => ['save', 'claim', 'punch'].includes(e.type) && e.team === 1);
    if (ev) return { line: this_line, out: ev.type === 'save' ? 'arrêt' : ev.type === 'claim' ? 'captage' : 'boxe', maxSpeed, states };
    if (m.ball.owner === gk) return { line: this_line, out: ev0 < m.events.length && m.events.slice(ev0).some(e => e.type === 'claim') ? 'captage' : 'prise', maxSpeed, states };
    if (m.ball.owner && m.ball.owner.team === 1) return { line: this_line, out: 'récupéré', maxSpeed, states };
    if (m.ball.owner) return { line: this_line, out: 'perdu', maxSpeed, states };
    if (m.state !== 'play') return { line: this_line, out: 'sortie', maxSpeed, states };
  }
  return { line: this_line, out: 'aucune', maxSpeed, states };
}

const SHOTS = [
  // nom, distance, origine y, cible y, hauteur cible, vitesse (m/s)
  ['Frappe axiale lente au sol, 18 m', 18, 0, 0.4, 0.2, 16],
  ['Frappe axiale moyenne, 16 m', 16, 0, -0.6, 1.0, 22],
  ['Frappe puissante plein axe, 20 m', 20, 0, 0.3, 1.3, 30],
  ['Tir rasant poteau gauche, 16 m', 16, -3, -3.2, 0.15, 24],
  ['Tir rasant poteau droit, 16 m', 16, 3, 3.2, 0.15, 24],
  ['Lucarne gauche puissante, 22 m', 22, 0, -3.3, 1.95, 31],
  ['Lucarne droite puissante, 22 m', 22, 2, 3.3, 1.95, 31],
  ['Mi-hauteur à mi-distance du poteau, 17 m', 17, -6, 1.8, 1.2, 25],
  ['Tir croisé depuis l angle de la surface', 15, 14, -2.8, 0.5, 25],
  ['Frappe enroulée petit filet, 14 m', 14, -10, -3.3, 0.4, 22],
  ['Face-à-face à 9 m, frappe placée', 9, 1, -2.6, 0.3, 20],
  ['Face-à-face à 7 m, frappe sur le gardien', 7, 0, 0.1, 0.6, 19],
  ['Tir de loin, 30 m, au-dessus de la tête', 30, 0, 0.5, 2.1, 27],
  ['Tir de loin, 32 m, au sol', 32, -4, -1.5, 0.2, 26],
  ['Tête à 7 m vers le sol', 7, 1, -1.8, 0.1, 14, 1.9, 'header'],
  ['Tête piquée au second poteau', 6, -3, 2.7, 0.3, 13, 2.0, 'header'],
  ['Penalty côté fort', 11, 0, 2.6, 0.5, 26, 0.11, 'penalty'],
  ['Penalty au centre à mi-hauteur', 11, 0, 0, 1.2, 24, 0.11, 'penalty'],
  ['Tir non cadré à côté', 18, 0, 5.2, 0.8, 25],
];
const CROSSES = [
  // nom, origine (dist devant la ligne, y), point de chute (dist, y), vitesse, sortie attendue ?
  ['Centre flottant dans les six mètres, premier poteau', [12, 26], [3.2, -2.5], 15, true],
  ['Centre flottant au point des six mètres', [14, -26], [4.8, 0.5], 15, true],
  ['Centre rentrant au second poteau', [16, 24], [3.5, 3.5], 17, true],
  ['Corner sortant tombant à 5 m', [0.5, 34], [4.6, -1.5], 18, true],
  ['Corner rentrant sur le gardien', [0.5, -34], [2.0, 0.6], 19, true],
  ['Centre en retrait au point de penalty', [14, 26], [11, 0], 15, false],
  ['Centre lointain vers 13 m', [20, -24], [13, 2], 16, false],
];

const N = Number(process.env.TRIALS || 20); // chaque situation est rejouée N fois (graines différentes)
const rows = [];
let seed = 7001;
const SAVED = new Set(['arrêt', 'prise', 'captage', 'boxe']);
for (const [name, dist, y0, ty, tz, speed, z0 = 0.11, type = 'normal'] of SHOTS) {
  const outs = []; let maxSpeed = 0; const states = new Set();
  for (let k = 0; k < N; k++) {
    const m = freshMatch(seed += 31); const ctx = setup(m);
    launch(m, ctx, { from: { dist, y: y0 }, to: { y: ty, z: tz }, speed, z0, type });
    const r = run(m, ctx); outs.push(r.out); maxSpeed = Math.max(maxSpeed, r.maxSpeed); r.states.forEach(x => states.add(x));
  }
  const onTarget = Math.abs(ty) < 3.66 && tz < 2.44;
  rows.push({ kind: 'tir', name, onTarget, outs, goals: outs.filter(o => o === 'but').length, saved: outs.filter(o => SAVED.has(o)).length, maxSpeed, states, out: summarize(outs) });
}
for (const [name, from, land, speed, expectOut] of CROSSES) {
  const outs = []; let maxSpeed = 0; const states = new Set();
  for (let k = 0; k < N; k++) {
    const m = freshMatch(seed += 31); const ctx = setup(m);
    launch(m, ctx, { from: { dist: from[0], y: from[1] }, to: { y: land[1], z: 2.0, over: -land[0] }, speed, z0: 0.11, shot: false });
    const r = run(m, ctx, 2.5); outs.push(r.out); maxSpeed = Math.max(maxSpeed, r.maxSpeed); r.states.forEach(x => states.add(x));
  }
  rows.push({ kind: 'centre', name, expectOut, outs, claimed: outs.filter(o => o === 'captage' || o === 'boxe').length, maxSpeed, states, out: summarize(outs) });
}
function summarize(outs) { const c = {}; for (const o of outs) c[o] = (c[o] || 0) + 1; return Object.entries(c).map(([k, v]) => `${k} ${v}`).join(', '); }
// --- Assertions de cohérence (pas de script visible, pas de téléportation, taux crédibles) ---
const shots = rows.filter(r => r.kind === 'tir'), crosses = rows.filter(r => r.kind === 'centre');
const by = n => rows.find(r => r.name.startsWith(n));
const rate = (r, k = 'goals') => r[k] / N;
assert.equal(rows.length, 26, '26 situations (19 tirs + 7 centres)');
for (const r of rows) assert.ok(r.maxSpeed < 10, `gardien sans téléportation (${r.name} : ${r.maxSpeed.toFixed(1)} m/s)`);
for (const r of shots.filter(s => s.onTarget)) assert.ok(r.states.has('track'), `lecture du tir (${r.name})`);
assert.equal(by('Tir non cadré').goals, 0, 'un tir non cadré ne rentre pas');
assert.ok(rate(by('Frappe axiale lente'), 'saved') >= 0.8, 'frappe axiale lente arrêtée');
assert.ok(rate(by('Frappe axiale moyenne'), 'saved') >= 0.7, 'frappe axiale moyenne arrêtée');
const corners = rate(by('Lucarne gauche')) + rate(by('Lucarne droite'));
assert.ok(corners / 2 >= 0.5, 'les lucarnes puissantes sont majoritairement des buts : ' + corners / 2);
const pen = rate(by('Penalty côté fort'));
assert.ok(pen >= 0.5, 'un penalty puissant à ras du poteau est majoritairement transformé : ' + pen);
const onT = shots.filter(s => s.onTarget), totSaved = onT.reduce((a, r) => a + r.saved, 0), totShots = onT.length * N;
const saveRate = totSaved / totShots;
assert.ok(saveRate > 0.45 && saveRate < 0.85, `taux d'arrêt global crédible : ${(saveRate * 100).toFixed(0)} %`);
const outCrosses = crosses.filter(c => c.expectOut), stayCrosses = crosses.filter(c => !c.expectOut);
const claimed = outCrosses.reduce((a, c) => a + c.claimed, 0);
assert.ok(claimed / (outCrosses.length * N) >= 0.6, `sorties aériennes sur centres dans les six mètres (${claimed}/${outCrosses.length * N})`);
for (const c of stayCrosses) assert.ok(!c.states.has('claim'), `pas de sortie hasardeuse (${c.name})`);
const saves = totSaved;

// Fonctions pures de la machine à états
assert.equal(resolveKeeperState({ diveT: 0.3 }, { owner: null }), 'dive');
assert.equal(resolveKeeperState({ diveT: 0, gkState: 'dive' }, { owner: null }), 'recover');
assert.equal(getKeeperClaimPlan({ goalX: -52.5, dir: 1, bx: -30, by: 0, bz: 0.2, bvx: -20, bvy: 0, bvz: 1, kx: -51, ky: 0 }), null, 'pas de sortie sur ballon rasant');

if (process.env.REPORT) {
  const L = ['# Rapport gardien — batterie de 26 situations', '', `Généré par \`REPORT=1 node tests/keeper.test.mjs\` le ${new Date().toISOString().slice(0, 10)} sur le moteur réel (IA gardien, notes de l'effectif chargé). Résultats d'une exécution déterministe (graines fixes).`, '',
    '| # | Type | Situation | Issues sur ' + N + ' essais | États observés | Vitesse max gardien |', '|---|---|---|---|---|---|'];
  rows.forEach((r, i) => L.push(`| ${i + 1} | ${r.kind} | ${r.name} | ${r.out} | ${[...r.states].join(' → ')} | ${r.maxSpeed.toFixed(1)} m/s |`));
  L.push('', `Tirs cadrés arrêtés ou captés : ${totSaved}/${totShots} (${(saveRate * 100).toFixed(0)} %). Sorties aériennes réussies (captage ou boxe) sur centres dans les six mètres : ${claimed}/${outCrosses.length * N}.`);
  L.push('', 'Limites : trajectoires injectées sans effet (spin) ni défenseurs ; les animations restent procédurales (pas de capture de mouvement).');
  writeFileSync(new URL('../docs/RAPPORT-GARDIEN.md', import.meta.url), L.join('\n') + '\n');
}
console.log(`GOALKEEPER BATTERY OK — ${rows.length} situations × ${N} essais, ${(saveRate * 100).toFixed(0)} % d'arrêts sur tirs cadrés, ${claimed}/${outCrosses.length * N} sorties aériennes`);
for (const r of rows) console.log(`  ${r.kind.padEnd(6)} ${r.out.padEnd(34)} ${r.name}  [${[...r.states].join('>')}]`);
