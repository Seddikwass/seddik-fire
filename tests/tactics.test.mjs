// Tactique en direct : consignes rapides, formation optimale, conseils de l'adjoint, effet réel sur le jeu.
import assert from 'node:assert/strict';
globalThis.window = { addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1, innerWidth: 800, innerHeight: 400 };
globalThis.document = { addEventListener() {}, removeEventListener() {}, hidden: false, createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) }) };
const Tc = await import('../public/js/tactics.js');
const D = await import('../public/js/data.js');

const team = { mentality: 0, pressing: 1, width: 1, line: 0 };
assert.ok(Tc.applyPreset(team, 'park'));
assert.deepEqual([team.mentality, team.pressing, team.width, team.line], [-2, 0, 0, -1], 'bloc bas');
Tc.applyPreset(team, 'allout');
assert.deepEqual([team.mentality, team.pressing, team.width, team.line], [2, 2, 2, 1], 'tout pour l’attaque');
assert.equal(Tc.applyPreset(team, 'inconnu'), false);
console.log('PRESETS OK — cinq consignes rapides');

// Formation : 5 défenseurs vers un 4-3-3 → le défenseur en trop recule au milieu, jamais en attaque.
const squad = ['GK', 'DD', 'DC', 'DC', 'DC', 'DG', 'MC', 'MDC', 'MC', 'BU', 'BU'].map((pos, i) => ({ pos, isGK: i === 0 }));
const slots = Tc.getFormationAssignment(squad, '4-3-3');
const names = D.FORMATION_POS['4-3-3'];
assert.equal(new Set(slots).size, 11, 'chaque joueur a une case distincte');
assert.equal(slots[0], 0, 'le gardien reste dans le but');
for (let i = 0; i < squad.length; i++) {
  const from = D.POS_GROUP[squad[i].pos], to = D.POS_GROUP[names[slots[i]]];
  assert.ok(!(from === 'D' && to === 'A') && !(from === 'A' && to === 'D'), `${squad[i].pos} ne saute pas deux lignes (${names[slots[i]]})`);
}
assert.equal(names[slots[1]], 'DD', 'le latéral droit garde son couloir');
assert.equal(names[slots[5]], 'DG', 'le latéral gauche garde son couloir');
const tenMen = squad.map((p, i) => i === 4 ? { ...p, sentOff: true } : p);
const s10 = Tc.getFormationAssignment(tenMen, '4-4-2');
assert.equal(s10[4], -1, 'joueur expulsé non placé');
assert.equal(new Set(s10.filter(x => x >= 0)).size, 10);
console.log('FORMATION OK — affectation optimale, couloirs respectés, à dix aussi');

// Conseils : blessé et épuisé en priorité, averti plus tard, consigne selon le score.
const coachTeam = {
  ps: [{ pos: 'GK', isGK: true, stamina: 0.9 }, { pos: 'DC', stamina: 0.3, name: 'Fatigué' }, { pos: 'MC', stamina: 0.8, yellow: 1, name: 'Averti' }, { pos: 'BU', stamina: 0.9, injured: true, name: 'Blessé' }],
  bench: [{ pos: 'DC', name: 'Remplaçant DC', fitness: 1 }, { pos: 'BU', name: 'Remplaçant BU', fitness: 1 }, { pos: 'MC', name: 'Remplaçant MC', fitness: 1 }, { pos: 'GK', name: 'Gardien 2', fitness: 1 }],
  mentality: 0,
};
const adv = Tc.getCoachAdvice(coachTeam, { minute: 70, goalDiff: -1, subsLeft: 5 });
assert.equal(adv[0].outName, 'Blessé'); assert.equal(adv[0].inName, 'Remplaçant BU', 'poste identique proposé');
assert.equal(adv[1].outName, 'Fatigué'); assert.equal(adv[1].inName, 'Remplaçant DC');
assert.ok(adv.some(a => a.outName === 'Averti'), 'joueur averti signalé après l’heure de jeu');
assert.ok(adv.some(a => a.type === 'preset' && a.preset === 'press'), 'mené : consigne offensive');
assert.ok(!adv.some(a => a.inName === 'Gardien 2'), 'pas de gardien pour un joueur de champ');
assert.ok(Tc.getCoachAdvice(coachTeam, { minute: 80, goalDiff: 1, subsLeft: 0 }).every(a => a.type === 'preset'), 'plus de changement disponible : aucun remplacement proposé');
assert.ok(Tc.getCoachAdvice({ ...coachTeam, mentality: 0 }, { minute: 80, goalDiff: 2, subsLeft: 5 }).some(a => a.preset === 'counter'), 'large avance : contre-attaque');
console.log('COACH ADVICE OK — priorités, postes, score et changements restants');

// Effet réel : en bloc bas l'équipe joue nettement plus bas qu'en « tout pour l'attaque ».
const { Match } = await import('../public/js/match.js');
const C = await import('../public/js/career.js');
const st = C.newCareer({ clubId: 'est', seed: 3 });
const canvas = { clientWidth: 800, clientHeight: 400, getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) };
const avgHeight = (preset) => {
  let seed = 77; const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
  const m = new Match({ canvas, home: C.matchTeam(st, 'est'), away: C.matchTeam(st, 'ca', true), userSide: 0, settings: { duration: 5, voice: false, replays: false, assist: true, difficulty: 1 }, random });
  for (let i = 0; i < 900 && m.state !== 'play'; i++) m.step(1 / 60);
  m.setTacticPreset(0, preset);
  let sum = 0, n = 0;
  for (let i = 0; i < 60 * 40; i++) { m.step(1 / 60); if (m.state === 'goal' && m.stateT <= 0) m.afterGoal(); for (const p of m.teams[0].ps) if (!p.isGK && p !== m.selected) { sum += p.x * m.teams[0].dir; n++; } }
  return sum / n;
};
const low = avgHeight('park'), high = avgHeight('allout');
assert.ok(high - low > 6, `bloc bas ${low.toFixed(1)} m contre attaque totale ${high.toFixed(1)} m`);
console.log(`TACTIC EFFECT OK — hauteur moyenne ${low.toFixed(1)} m en bloc bas, ${high.toFixed(1)} m en attaque totale`);
