import assert from 'node:assert/strict';

globalThis.window = { addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1, innerWidth: 800, innerHeight: 450 };
globalThis.document = { addEventListener() {}, removeEventListener() {}, hidden: false, createElement: () => ({ getContext: () => ({}) }) };
globalThis.devicePixelRatio = 1;
globalThis.innerWidth = 800;
globalThis.innerHeight = 450;

const { Match } = await import('../public/js/match.js');
const C = await import('../public/js/career.js');
const career = C.newCareer({ clubId: 'est', seed: 17 });
const canvas = { clientWidth: 800, clientHeight: 450, getContext: () => ({}) };
const match = new Match({
  canvas,
  home: C.matchTeam(career, 'est'),
  away: C.matchTeam(career, 'ca', true),
  userSide: 0,
  settings: { duration: 5, voice: false, replays: false, assist: true }
});

const attacker = match.teams[0].ps.find(p => !p.isGK);
attacker.vx = 0;
attacker.vy = 0;
match.applyVel(attacker, 5, 3, 1 / 60);
assert.ok(Number.isFinite(attacker.heading), 'le joueur doit conserver une orientation valide');
assert.ok(attacker.vx > 0 && attacker.vy > 0, 'l accélération doit suivre la direction demandée');

attacker.x = 40;
attacker.y = 0;
attacker.vx = 1.5;
attacker.vy = 0;
match.shoot(attacker, 0.28, 2.7);
assert.equal(match.ball.shotType, 'driven', 'une pression courte doit produire une frappe rasante');
assert.ok(match.ball.inFlightShot && match.ball.vx > 0, 'la frappe doit partir vers le but');

const keeper = match.teams[1].ps[0];
keeper.y = 0;
// Scénario déterministe : tir cadré qui traverse la ligne dans moins d'une seconde,
// avec une hauteur encore atteignable par le gardien.
match.ball.x = 40;
match.ball.y = 0;
match.ball.z = 2.2;
match.ball.vx = 20;
match.ball.vy = 2;
match.ball.vz = 0;
match.ball.inFlightShot = { team: 0, t: 0 };
match.aiKeeper(keeper, 1 / 60);
assert.ok(keeper.diveT > 0, 'le gardien doit anticiper et amorcer son plongeon avant la ligne');

const receiver = match.teams[0].ps.find(p => p !== attacker && !p.isGK);
attacker.x = 5; attacker.y = -2; attacker.vx = 2; attacker.vy = 0.5;
receiver.x = 18; receiver.y = 4; receiver.vx = 0.5; receiver.vy = 0;
match.pass(attacker, receiver, false);
assert.equal(match.passInfo.to, receiver, 'la passe doit conserver son receveur');
assert.equal(attacker.kickStyle, 'pass', 'la passe doit déclencher son animation dédiée');
assert.ok(match.stats.passes[0] > 0, 'la passe doit être comptabilisée');

console.log('MOTION OK — orientation, frappe rasante, anticipation gardien et passe');
