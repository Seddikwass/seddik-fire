// Arbitrage (Master Production Bible §30 : « scénarios hors-jeu, faute, avantage, penalty, corner, touche, carton »).
import assert from 'node:assert/strict';
{ let r = 99; Math.random = () => { r = (Math.imul(r, 1664525) + 1013904223) >>> 0; return r / 0x100000000; }; }
globalThis.window = { addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1, innerWidth: 800, innerHeight: 400 };
globalThis.document = { addEventListener() {}, removeEventListener() {}, hidden: false, createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) }) };
const M = await import('../public/js/match.js');
const C = await import('../public/js/career.js');
const { getFoulSanction, getFoulContext, shouldPlayAdvantage, ADVANTAGE_WINDOW, Match } = M;
const HL = 52.5, HW = 34;

// 1) Sanctions selon la Loi 12
assert.equal(getFoulSanction({ dogso: true, inBox: false }), 'red', 'DOGSO hors surface : rouge');
assert.equal(getFoulSanction({ dogso: true, inBox: true }), 'yellow', 'DOGSO dans la surface avec penalty : jaune');
assert.equal(getFoulSanction({ spa: true, variance: 0.3 }), 'yellow', 'attaque prometteuse stoppée : jaune');
assert.equal(getFoulSanction({ closingSpeed: 8, rear: 0.3, variance: 0.3 }), 'yellow', 'tacle imprudent : jaune');
assert.equal(getFoulSanction({ closingSpeed: 10.5, rear: 0.8 }), 'red', 'force excessive par derrière : rouge');
assert.equal(getFoulSanction({ closingSpeed: 3, rear: 0.1, variance: 0.5 }), 'none', 'faute ordinaire : pas de carton');

// 2) Contexte : dernier défenseur
const victim = { x: 34, y: 2, vx: 6, vy: 0 };
const fouler = { x: 33, y: 2.5, isGK: false };
const keeper = { x: 51, y: 0, isGK: true };
assert.ok(getFoulContext(victim, fouler, 1, [fouler, keeper]).dogso, 'seul le gardien entre l attaquant et le but : DOGSO');
const cover = [fouler, keeper, { x: 40, y: 1 }, { x: 42, y: -4 }];
assert.ok(!getFoulContext(victim, fouler, 1, cover).dogso, 'défenseurs en couverture : pas de DOGSO');
assert.ok(!getFoulContext({ x: 34, y: 2, vx: -4, vy: 0, heading: Math.PI }, fouler, 1, [fouler, keeper]).dogso, 'dos au but : pas de DOGSO');

// 3) Avantage : seulement si le fauté garde le ballon hors de son camp profond
const ball = { owner: victim };
assert.ok(shouldPlayAdvantage(victim, ball, 1, [fouler]), 'ballon conservé : avantage');
assert.ok(!shouldPlayAdvantage(victim, { owner: null }, 1, [fouler]), 'ballon perdu : coup franc');
assert.ok(!shouldPlayAdvantage({ x: -45, y: 0 }, { owner: null }, 1, []), 'pas d avantage dans sa propre surface');

// 4) Scénarios dans le moteur
function fresh() {
  const st = C.newCareer({ clubId: 'est', seed: 3 });
  let s = 1234; const random = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
  const canvas = { clientWidth: 800, clientHeight: 400, getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) };
  const m = new Match({ canvas, home: C.matchTeam(st, 'est'), away: C.matchTeam(st, 'ca', true), userSide: null, settings: { duration: 5, voice: false, replays: false, difficulty: 1 }, random });
  for (let i = 0; i < 1200 && m.state !== 'play'; i++) m.step(1 / 60);
  assert.equal(m.state, 'play');
  return m;
}
const steps = (m, n) => { for (let i = 0; i < n; i++) m.step(1 / 60); };

{ // Avantage joué et concrétisé : pas de coup franc, carton au prochain arrêt
  const m = fresh(), d = m.teams[0].dir;
  const v = m.teams[0].ps[9], f = m.teams[1].ps[5];
  for (const p of m.teams[1].ps) if (!p.isGK) { p.x = -d * 40; p.y = (p.i || 0) - 5; }
  v.x = d * 5; v.y = 0; v.vx = d * 5; f.x = d * 3.8; f.y = 0.4;
  m.ball.owner = v; m.ball.x = v.x; m.ball.y = v.y;
  { const r0 = m.r; m.r = () => 0.2; m.foul(f, v, { closingSpeed: 8.2, rear: 0.4 }); m.r = r0; } // tirage fixé : tacle imprudent sanctionné
  assert.ok(m.advantage, 'l arbitre laisse l avantage');
  assert.equal(m.refCall.type, 'advantage', 'geste d avantage');
  assert.equal(m.state, 'play', 'le jeu continue');
  const y0 = m.stats.yellows[1];
  steps(m, Math.ceil(ADVANTAGE_WINDOW * 60) + 5);
  assert.ok(!m.advantage, 'avantage terminé après la fenêtre');
  assert.ok(m.pendingCard && m.pendingCard.sanction === 'yellow', 'carton en attente du prochain arrêt de jeu ' + JSON.stringify({ st: m.state, rt: m.restart?.type, ow: m.ball.owner?.team, y: m.stats.yellows }));
  assert.equal(m.stats.yellows[1], y0, 'pas de carton pendant le jeu');
  m.ball.owner = null; m.ball.x = 0; m.ball.y = HW + 1; m.ball.z = 0; m.ball.vx = m.ball.vy = 0; m.ball.lastTeam = 0;
  steps(m, 3);
  assert.equal(m.state, 'restart', 'touche sifflée');
  steps(m, 2);
  assert.equal(m.stats.yellows[1], y0 + 1, 'carton montré à l arrêt de jeu');
}
{ // Avantage sans suite : retour à la faute
  const m = fresh(), d = m.teams[0].dir;
  const v = m.teams[0].ps[9], f = m.teams[1].ps[5];
  for (const p of m.teams[1].ps) if (!p.isGK) { p.x = -d * 40; p.y = 0; }
  v.x = d * 5; v.y = 6; f.x = d * 3.8; f.y = 6.4;
  m.ball.owner = v; m.ball.x = v.x; m.ball.y = v.y;
  m.foul(f, v, { closingSpeed: 3, rear: 0.1 });
  assert.ok(m.advantage);
  steps(m, 20);
  m.ball.owner = f; f.x = m.ball.x; f.y = m.ball.y; // l'adversaire récupère tout de suite
  steps(m, 2);
  assert.ok(!m.advantage, 'avantage annulé');
  assert.equal(m.state, 'restart');
  assert.equal(m.restart.type, 'freekick', 'retour au coup franc');
  assert.equal(m.restart.team, 0, 'coup franc pour l équipe fautée');
  assert.ok(Math.hypot(m.restart.x - d * 5, m.restart.y - 6) < 0.5, 'au point de la faute');
}
{ // Dernier défenseur en position de DOGSO hors surface : rouge direct
  const m = fresh(), d = m.teams[0].dir;
  const v = m.teams[0].ps[9], f = m.teams[1].ps[3];
  for (const p of m.teams[1].ps) if (!p.isGK && p !== f) { p.x = -d * 20; p.y = 0; }
  v.x = d * 34; v.y = 0; v.vx = d * 6; v.vy = 0; v.heading = d > 0 ? 0 : Math.PI; f.x = d * 33; f.y = 0.5;
  m.ball.owner = null;
  m.foul(f, v, { closingSpeed: 4, rear: 0.5 });
  assert.ok(f.sentOff, 'dernier défenseur exclu');
  assert.equal(m.restart.type, 'freekick');
}
{ // Lois du jeu sur sortie de balle : touche, corner, six mètres
  const out = (x, y, lastTeam) => { const m = fresh(); m.ball.owner = null; Object.assign(m.ball, { x, y, z: 0, vx: 0, vy: 0, vz: 0, lastTeam, inFlightShot: null }); steps(m, 2); return m; };
  const d0 = fresh().teams[0].dir;
  let m = out(10, HW + 0.5, 0); assert.equal(m.restart.type, 'throw', 'touche'); assert.equal(m.restart.team, 1, 'touche pour l adversaire du dernier toucheur');
  m = out(d0 * (HL + 0.5), 12, 1); assert.equal(m.restart.type, 'corner', 'corner quand le défenseur sort le ballon derrière sa ligne');
  m = out(d0 * (HL + 0.5), 12, 0); assert.equal(m.restart.type, 'goalkick', 'six mètres quand l attaquant sort le ballon');
}
console.log('REFEREE OK — sanctions Loi 12 (DOGSO, SPA, imprudence, force excessive), avantage concrétisé/annulé, carton au prochain arrêt, touche, corner, six mètres');
