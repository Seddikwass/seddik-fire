import assert from 'node:assert/strict';

globalThis.window = { addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1, innerWidth: 800, innerHeight: 450 };
globalThis.document = { addEventListener() {}, removeEventListener() {}, hidden: false, createElement: () => ({ getContext: () => ({}) }) };
globalThis.devicePixelRatio = 1;
globalThis.innerWidth = 800;
globalThis.innerHeight = 450;

const { Match } = await import('../public/js/match.js');
const C = await import('../public/js/career.js');
const career = C.newCareer({ clubId: 'est', seed: 23 });
const canvas = { clientWidth: 800, clientHeight: 450, getContext: () => ({}) };
const match = new Match({
  canvas,
  home: C.matchTeam(career, 'est'),
  away: C.matchTeam(career, 'ca', true),
  userSide: 0,
  settings: { duration: 5, voice: false, replays: true, assist: true }
});

const home = match.teams[0];
const away = match.teams[1];
const attacker = home.ps.find(p => !p.isGK);
const teammate = home.ps.find(p => p !== attacker && !p.isGK);

// A high cross selects one aerial challenger for each team.
match.ball.x = 26; match.ball.y = 2; match.ball.z = 2.3;
match.ball.vx = 5; match.ball.vy = 1; match.ball.vz = 1; match.ball.inFlightShot = null;
for (const p of home.ps) { p.x = 45; p.y = 25; p.jumpCd = 2; }
for (const p of away.ps) { p.x = 45; p.y = -25; p.jumpCd = 2; }
attacker.x = 27; attacker.y = 2; attacker.jumpCd = 0;
teammate.x = 28; teammate.y = 2.4; teammate.jumpCd = 0;
away.ps.find(p => !p.isGK).x = 27;
away.ps.find(p => !p.isGK).y = 2.2;
away.ps.find(p => !p.isGK).jumpCd = 0;
match.updateAirDuels(1 / 60);
assert.ok(attacker.jumpT > 0 || teammate.jumpT > 0, 'un joueur doit attaquer le ballon aérien');
assert.ok(home.ps.filter(p => p.jumpT > 0).length <= 1, 'un seul joueur de champ doit être prioritaire par équipe');

// A controlled attacking header should create an aerial attempt and an animation.
const header = attacker.jumpT > 0 ? attacker : teammate;
header.x = 40; header.y = 0; header.jumpT = 0.3; header.cd = 0;
match.ball.x = 40; match.ball.y = 0; match.ball.z = 1.8; match.ball.inFlightShot = null;
const beforeShots = match.stats.shots[0];
match.header(header);
assert.ok(header.headerT > 0, 'la tête doit déclencher une animation dédiée');
assert.equal(match.stats.shots[0], beforeShots + 1, 'la tête en zone offensive doit être comptabilisée comme tir');
assert.equal(match.ball.inFlightShot.type, 'header', 'le tir de la tête doit être identifiable');

// First-touch action metadata is saved in replay frames, not lost during slow motion.
header.firstTouchT = 0.27;
header.stumbleT = 0.18;
header.keeperCatchT = 0.2;
header.diveDir = -1;
header.slideDir = 1;
header.kickDir = -1;
header.firstTouchDir = 1;
header.stumbleDir = -1;
match.ball.vx = 8; match.ball.vy = -3; match.ball.vz = 2; match.ball.spin = 0.42;
match.recT = 0;
match.record(); match.record();
const last = match.replayBuf.at(-1);
assert.equal(last.p[header.team * 11 + header.i][10] > 0, true, 'la tête doit être enregistrée dans le replay');
assert.equal(last.p[header.team * 11 + header.i][11] > 0, true, 'la première touche doit être enregistrée dans le replay');
assert.equal(last.p[header.team * 11 + header.i][12] > 0, true, 'la perte d équilibre doit être enregistrée dans le replay');
const recordedPlayer = last.p[header.team * 11 + header.i];
assert.equal(last.b[3], 8, 'la vitesse horizontale du ballon doit être enregistrée');
assert.equal(last.b[4], -3, 'la vitesse latérale du ballon doit être enregistrée');
assert.equal(last.b[5], 2, 'la vitesse verticale du ballon doit être enregistrée');
assert.equal(last.b[6], 0.42, 'la rotation du ballon doit être enregistrée');
assert.equal(recordedPlayer[16], -1, 'la direction du plongeon doit être enregistrée');
assert.equal(recordedPlayer[17], 1, 'la direction du tacle doit être enregistrée');
assert.equal(recordedPlayer[18], -1, 'la direction du geste de frappe doit être enregistrée');
assert.equal(recordedPlayer[20], -1, 'la direction de déséquilibre doit être enregistrée');

console.log('ACTIONS OK — duel aérien prioritaire, tête offensive, poses de replay');
