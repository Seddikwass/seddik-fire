// Défis, récompenses cosmétiques et pied fort / pied faible.
import assert from 'node:assert/strict';
globalThis.window = { addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1, innerWidth: 800, innerHeight: 400 };
globalThis.document = { addEventListener() {}, removeEventListener() {}, hidden: false, createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) }) };
const CH = await import('../public/js/challenges.js');
const M = await import('../public/js/match.js');

// Défis
const g = (team, min, extra = {}) => ({ type: 'goal', team, min, ...extra });
let ids = CH.evaluateChallenges({ hg: 3, ag: 1, events: [g(1, 10), g(0, 30, { kind: 'header' }), g(0, 60, { weakFoot: true }), g(0, 80, { kind: 'long' })] }, { userSide: 0, homeId: 'est', awayId: 'ca', difficulty: 2 });
for (const id of ['first_win', 'header', 'weak', 'long', 'comeback', 'derby', 'hard']) assert.ok(ids.includes(id), 'défi attendu : ' + id);
assert.ok(!ids.includes('clean') && !ids.includes('big'), 'pas de clean sheet ni d écart de 3');
ids = CH.evaluateChallenges({ hg: 0, ag: 3, events: [g(1, 5), g(1, 20), g(1, 70)] }, { userSide: 1, homeId: 'ob', awayId: 'eshs' });
assert.deepEqual(ids.sort(), ['big', 'clean', 'first_win'].sort(), 'victoire à l extérieur 3-0');
assert.deepEqual(CH.evaluateChallenges({ hg: 1, ag: 1, events: [g(1, 3, { own: true })] }, { userSide: 1 }), [], 'un csc ne compte pas pour l utilisateur ; nul = aucun défi de victoire');
assert.deepEqual(CH.evaluateChallenges({ hg: 2, ag: 0, events: [] }, { userSide: null }), [], 'IA contre IA : aucun défi');
let { progress, fresh } = CH.recordChallenges({}, ['first_win', 'derby', 'inconnu'], '2026-11-22');
assert.deepEqual(fresh, ['first_win', 'derby']);
({ fresh } = CH.recordChallenges(progress, ['first_win'])); assert.deepEqual(fresh, [], 'pas de double attribution');
const un = CH.unlockedSkins(progress);
assert.deepEqual(un.balls.sort(), ['classic', 'nuit', 'rades'].sort());
assert.deepEqual(un.boots, ['auto']);

// Pied fort / pied faible
const p = { name: 'Test Droitier', foot: 'R', weakFoot: 2, heading: 0, x: 0, y: 0, a: { tec: 60 } };
const right = { x: 0.3, y: -0.2 }, left = { x: 0.3, y: 0.2 }; // en regardant vers +x, +y est à gauche
assert.equal(M.getKickingFoot(p, right), 1); assert.equal(M.getKickingFoot(p, left), -1);
assert.equal(M.getWeakFootLoad(p, right), 0, 'bon pied : aucune pénalité');
assert.equal(M.getWeakFootLoad(p, left), 0.75, 'pied faible noté 2 : forte pénalité');
assert.equal(M.getWeakFootLoad({ ...p, weakFoot: 5 }, left), 0, 'ambidextre');
const base = { shooting: 75, technique: 70, pressure: 99, movingSpeed: 3, power: 0.7 };
assert.ok(M.getShotAccuracy({ ...base, weakFoot: 0.75 }).spread > M.getShotAccuracy(base).spread + 0.5, 'le mauvais pied disperse les tirs');
assert.ok(M.getShotAccuracy({ ...base, turn: 0.8 }).spread > M.getShotAccuracy(base).spread, 'frapper en pivotant dégrade la précision');
let L = 0; for (let i = 0; i < 1000; i++) if (M.getPlayerFooting({ name: 'Joueur ' + i }).foot === 'L') L++;
assert.ok(L > 150 && L < 300, 'environ un gaucher sur cinq : ' + L);
assert.ok(M.getPlayerFooting({ name: 'X' }).estimated, 'données estimées signalées comme telles');
console.log('CHALLENGES + WEAK FOOT OK — 10 défis, récompenses cosmétiques, pied fort/faible et équilibre');
