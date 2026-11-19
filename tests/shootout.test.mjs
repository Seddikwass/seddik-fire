// Tirs au but : règles IFAB (alternance, fin anticipée, mort subite), ordre des tireurs et modèle de tir.
import assert from 'node:assert/strict';
globalThis.window = { addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1, innerWidth: 800, innerHeight: 400 };
globalThis.document = { addEventListener() {}, removeEventListener() {}, hidden: false, createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) }) };
const S = await import('../public/js/shootout.js');
const O = true, X = false;

assert.equal(S.getShootoutStatus([[O, O, O], [X, X, X]]).decided, true, '3-0 après 3 tirs chacun : l’équipe B ne peut plus revenir');
assert.equal(S.getShootoutStatus([[O, O, O], [X, X]]).decided, false, '3-0 mais B a encore 3 tirs : rien n’est joué');
assert.equal(S.getShootoutStatus([[X, X, O, X], [O, O, O]]).decided, true, '1-3 après 4 tirs contre 3 : A ne peut plus égaliser');
assert.equal(S.getShootoutStatus([[O, O, O, O, O], [O, O, O, O, O]]).decided, false, '5-5 : mort subite');
assert.equal(S.getShootoutStatus([[O, O, O, O, O, O], [O, O, O, O, O]]).decided, false, 'mort subite : la paire doit être complète');
const sd = S.getShootoutStatus([[O, O, O, O, O, O], [O, O, O, O, O, X]]);
assert.equal(sd.decided, true); assert.equal(sd.winner, 0); assert.equal(sd.suddenDeath, true);
assert.equal(S.getNextKicker([[], []], 1), 1, 'l’équipe désignée par le tirage tire en premier');
assert.equal(S.getNextKicker([[], [O]], 1), 0, 'alternance stricte');
console.log('SHOOTOUT RULES OK — alternance, fin anticipée et mort subite');

const squad = [
  { id: 'gk', isGK: true, a: { sho: 20, tec: 40 } },
  { id: 'star', a: { sho: 90, tec: 85 } },
  { id: 'def', a: { sho: 40, tec: 50 } },
  { id: 'red', sentOff: true, a: { sho: 99, tec: 99 } },
];
const order = S.getShootoutOrder(squad).map(p => p.id);
assert.deepEqual(order, ['star', 'def', 'gk'], 'meilleur tireur en premier, gardien en dernier, exclu absent');
console.log('SHOOTOUT ORDER OK — tireurs classés, joueurs expulsés exclus');

let seed = 11; const r = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
const tally = {};
for (let i = 0; i < 6000; i++) {
  const sh = { a: { sho: 60 + r() * 30, tec: 60 + r() * 25 } };
  const choice = S.getAIPenaltyChoice(sh, r);
  const strike = S.getPenaltyStrike({ ...choice, shooting: sh.a.sho, technique: sh.a.tec, roll: r });
  const out = S.getPenaltyOutcome({ ...strike, dive: S.getAIKeeperDive(strike.y, 70, r), keeperRating: 70, roll: r });
  tally[out.result] = (tally[out.result] || 0) + 1;
}
const goalRate = tally.goal / 6000;
assert.ok(goalRate > 0.66 && goalRate < 0.84, 'taux de réussite réaliste (~75 %) : ' + (goalRate * 100).toFixed(1));
assert.ok((tally.saved || 0) / 6000 > 0.1, 'les gardiens arrêtent une part réelle des tirs');
assert.equal(S.getPenaltyOutcome({ y: 4.2, z: 1, dive: 0, roll: () => 0 }).result, 'miss', 'tir hors du cadre');
assert.equal(S.getPenaltyOutcome({ y: 0.2, z: 1, dive: 0, keeperRating: 80, roll: () => 0 }).result, 'saved', 'tir central sur un gardien resté au centre');
assert.equal(S.getPenaltyOutcome({ y: 3.2, z: 0.3, dive: -1, roll: () => 0.99 }).result, 'goal', 'gardien parti du mauvais côté');
console.log('PENALTY MODEL OK — réussite réaliste, arrêts, tirs à côté');

// Intégration : un match nul à élimination directe se termine par une séance décidée.
const { Match } = await import('../public/js/match.js');
const C = await import('../public/js/career.js');
const st = C.newCareer({ clubId: 'est', seed: 3 });
const canvas = { clientWidth: 800, clientHeight: 400, getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) };
let ended = null;
const m = new Match({ canvas, home: C.matchTeam(st, 'est'), away: C.matchTeam(st, 'ca', true), userSide: null, knockout: { aggBefore: [0, 0] }, settings: { duration: 5, voice: false, replays: false }, random: r, onEnd: res => { ended = res; } });
m.destroy = () => {};
m.score = [2, 2]; m.state = 'fulltime'; m.stateT = 0.01;
for (let i = 0; i < 60 * 240 && !ended; i++) m.step(1 / 60);
assert.ok(ended && ended.pens, 'le résultat contient le score des tirs au but');
assert.notEqual(ended.pens[0], ended.pens[1], 'la séance désigne un vainqueur');
const m2 = new Match({ canvas, home: C.matchTeam(st, 'est'), away: C.matchTeam(st, 'ca', true), userSide: null, knockout: { aggBefore: [1, 0] }, settings: { duration: 5, voice: false, replays: false }, random: r });
m2.score = [0, 1];
assert.equal(m2.needsShootout(), true, 'match retour : égalité au cumul (1-1) → tirs au but');
m2.score = [0, 0];
assert.equal(m2.needsShootout(), false, 'match retour : vainqueur au cumul, pas de tirs au but');
let ended3 = null;
const m3 = new Match({ canvas, home: C.matchTeam(st, 'est'), away: C.matchTeam(st, 'ca', true), userSide: 0, knockout: { aggBefore: [0, 0] }, settings: { duration: 5, voice: false, replays: false }, random: r, onEnd: res => { ended3 = res; } });
m3.destroy = () => {};
m3.minute = 80; m3.simulateRest(60, 60);
if (ended3.hg === ended3.ag) assert.ok(ended3.pens && ended3.pens[0] !== ended3.pens[1], 'fin simulée : séance résolue instantanément');
console.log('SHOOTOUT MATCH OK — séance jouée, cumul aller-retour et fin simulée');
