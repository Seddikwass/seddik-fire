// Rythme de jeu : temporisation défensive, interceptions réalistes et décisions du porteur.
import assert from 'node:assert/strict';
globalThis.window = { addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1, innerWidth: 800, innerHeight: 400 };
globalThis.document = { addEventListener() {}, removeEventListener() {}, hidden: false, createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) }) };
const { getJockeyPoint, getAITackleCommitChance, getMovingBallInterceptChance, getCarrierPassDecision, AI_FOUL_SCALE } = await import('../public/js/match.js');

// Le défenseur temporise entre le porteur et son propre but, à distance de tacle.
const carrier = { x: 10, y: 5, vx: 0, vy: 0 };
const jockeyRight = getJockeyPoint(carrier, 1);
assert.ok(jockeyRight.x < carrier.x, 'une équipe attaquant vers +x défend son but en -x');
const gap = Math.hypot(jockeyRight.x - carrier.x, jockeyRight.y - carrier.y);
assert.ok(gap > 1.2 && gap < 2.2, 'distance de temporisation réaliste : ' + gap.toFixed(2));
const jockeyLeft = getJockeyPoint(carrier, -1);
assert.ok(jockeyLeft.x > carrier.x, 'sens inverse : le défenseur se place côté +x');
console.log('JOCKEY OK — temporisation côté but à distance de tacle');

// Un bon défenseur s'engage plus souvent qu'un mauvais, sans jamais tacler à chaque image.
const strong = getAITackleCommitChance({ a: { def: 90 } }, { a: { dri: 50 } }, 1.0);
const weak = getAITackleCommitChance({ a: { def: 40 } }, { a: { dri: 85 } }, 1.6);
assert.ok(strong > weak, 'la qualité défensive augmente l engagement');
assert.ok(strong <= 0.5 && weak >= 0.08, 'engagement borné');
assert.ok(AI_FOUL_SCALE > 0 && AI_FOUL_SCALE < 1, 'les fautes IA sont atténuées');
console.log('TACKLE COMMIT OK — engagement sélectif selon défense, dribble et distance');

// Interception : contre certain sur la trajectoire, rare quand le ballon passe loin et vite.
assert.equal(getMovingBallInterceptChance(0.2, 20, 50), 1, 'ballon dans le corps : contre');
const near = getMovingBallInterceptChance(0.6, 10, 70);
const far = getMovingBallInterceptChance(1.0, 20, 70);
assert.ok(near > far, 'plus le ballon passe près, plus l interception est probable');
assert.ok(far < 0.1, 'passe rapide à un mètre : interception rare');
assert.ok(getMovingBallInterceptChance(0.7, 10, 90) > getMovingBallInterceptChance(0.7, 10, 40), 'un défenseur fort lit mieux la passe');
console.log('INTERCEPTION OK — distance à la trajectoire, vitesse du ballon et lecture défensive');

// Décisions du porteur : conduite dans l'espace, passe sous pression, tempo et passe vers l'avant.
const option = { score: 12, tx: 25 };
assert.equal(getCarrierPassDecision({ pressure: 6, laneClearance: 6, option, carrierX: 10, roll: 0.9 }).pass, false, 'espace libre : le porteur conduit');
assert.equal(getCarrierPassDecision({ pressure: 0.9, option: { score: -4, tx: 0 }, carrierX: 10, roll: 0.9 }).reason, 'pressed');
assert.equal(getCarrierPassDecision({ pressure: 6, laneClearance: 6, option, carrierX: 10, roll: 0.1 }).reason, 'progressive');
assert.equal(getCarrierPassDecision({ pressure: 6, laneClearance: 6, option: { score: 3, tx: 8 }, carrierX: 10, carryTime: 4, roll: 0.9 }).reason, 'tempo');
assert.equal(getCarrierPassDecision({ pressure: 0.5, option: null }).pass, false, 'aucune option : pas de passe');
console.log('CARRIER DECISIONS OK — conduite, pression, progression et tempo');

// Commandes : changement de joueur côté but, centre contextuel et fautes utilisateur atténuées.
const { getSwitchCandidateScore, isCrossingZone, USER_FOUL_SCALE } = await import('../public/js/match.js');
const ballAt = { x: 0, y: 0 };
// Équipe qui attaque vers +x : son but est en -x, « côté but » = x plus petit que le ballon.
const goalSidePlayer = { x: -6, y: 2, vx: 0, vy: 0 };
const beatenPlayer = { x: 5, y: 1, vx: 0, vy: 0 };
assert.ok(getSwitchCandidateScore(goalSidePlayer, ballAt, 1) < getSwitchCandidateScore(beatenPlayer, ballAt, 1), 'le défenseur placé côté but est prioritaire sur un joueur dépassé');
assert.ok(getSwitchCandidateScore({ x: -3, y: 0 }, ballAt, 1) < getSwitchCandidateScore({ x: -20, y: 10 }, ballAt, 1), 'à position équivalente, le plus proche passe devant');
assert.equal(isCrossingZone({ x: 40, y: 22 }, 1), true, 'couloir droit près de la ligne de but : centre');
assert.equal(isCrossingZone({ x: 40, y: 5 }, 1), false, 'axe : pas de centre automatique');
assert.equal(isCrossingZone({ x: -40, y: 22 }, -1), true, 'sens inverse respecté');
assert.ok(USER_FOUL_SCALE > 0.3 && USER_FOUL_SCALE < 1, 'tacles utilisateur moins souvent sifflés');
console.log('USER CONTROLS OK — changement de joueur côté but, centre contextuel et fautes');

// Coups de pied arrêtés : mur à 9,15 m, position du tireur, profil de frappe et verrouillage.
const { getFreeKickWall, getFreeKickShotProfile, getRestartTakerSpot, Match } = await import('../public/js/match.js');
const wallPlan = getFreeKickWall({ x: 32, y: 3 }, 1);
assert.ok(wallPlan.count >= 3, 'coup franc axial à ~21 m : mur de 3 ou 4 joueurs');
for (const slot of wallPlan.slots) assert.ok(Math.abs(Math.hypot(slot.x - 32, slot.y - 3) - 9.15) < 1.4, 'chaque joueur du mur est à environ 9,15 m');
assert.equal(getFreeKickWall({ x: -10, y: 0 }, 1).count, 0, 'coup franc dans son propre camp : pas de mur');
assert.equal(getFreeKickWall({ x: 45, y: 30 }, 1).count, 0, 'coup franc excentré au bord du terrain : pas de mur');
const fkSoft = getFreeKickShotProfile(0.4, 80, 80), fkHard = getFreeKickShotProfile(1, 80, 80);
assert.ok(fkHard.speed > fkSoft.speed && fkSoft.targetHeight > fkHard.targetHeight, 'frappe dosée plus lente et plus haute, frappe puissante plus tendue');
const spotThrow = getRestartTakerSpot({ type: 'throw', x: 10, y: 34 }, 1);
assert.ok(spotThrow.y > 34, 'le joueur effectue la touche hors du terrain');
const spotFk = getRestartTakerSpot({ type: 'freekick', x: 30, y: 0 }, 1);
assert.ok(spotFk.x < 30, 'le tireur se place derrière le ballon face au but');

{
  const C = await import('../public/js/career.js');
  const st = C.newCareer({ clubId: 'est', seed: 3 });
  const canvas = { clientWidth: 800, clientHeight: 400, getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) };
  let seed = 99; const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
  const m = new Match({ canvas, home: C.matchTeam(st, 'est'), away: C.matchTeam(st, 'ca', true), userSide: 0, settings: { duration: 5, voice: false, replays: false, assist: true, difficulty: 1 }, random });
  for (let i = 0; i < 900 && m.state !== 'play'; i++) m.step(1 / 60);
  const dir = m.teams[0].dir;
  m.setRestart('freekick', 0, dir * 31, 2);
  for (let i = 0; i < 600 && m.state !== 'play'; i++) m.step(1 / 60);
  assert.equal(m.state, 'play', 'le coup franc est sifflé');
  const taker = m.ball.owner;
  assert.ok(taker && taker === m.selected, 'le tireur contrôlé par le joueur a le ballon');
  assert.ok(Math.hypot(m.ball.x - dir * 31, m.ball.y - 2) < 1.2, 'le ballon reste au point du coup franc');
  assert.ok(m.wall && m.wall.length >= 3, 'un mur est formé');
  const x0 = taker.x, y0 = taker.y;
  m.input.jx = dir; m.input.jy = 0.4;
  for (let i = 0; i < 60; i++) m.step(1 / 60);
  assert.ok(Math.hypot(taker.x - x0, taker.y - y0) < 0.4, 'le tireur ne peut pas partir balle au pied');
  for (const w of m.wall) assert.ok(Math.hypot(w.p.x - w.x, w.p.y - w.y) < 1.5, 'le mur tient sa position');
  m.btnShootDown(); for (let i = 0; i < 25; i++) m.step(1 / 60); m.btnShootUp();
  assert.ok(m.ball.inFlightShot, 'la frappe part');
  assert.ok(m.wall.some(w => w.p.jumpT > 0), 'le mur saute au moment de la frappe');
  assert.equal(m.isSetPieceLocked(), false, 'le jeu reprend normalement après la frappe');
}
console.log('SET PIECES OK — mur à 9,15 m, tireur fixe, visée, frappe enroulée et saut du mur');
{
  const { getSkillMoveChance } = await import('../public/js/match.js');
  const star = getSkillMoveChance(92, 88, 55), poor = getSkillMoveChance(45, 50, 85);
  assert.ok(star > poor, 'un dribbleur technique réussit plus souvent ses crochets');
  assert.ok(star <= 0.72 && poor >= 0.08, 'réussite bornée : jamais garantie, jamais impossible');
  console.log('SKILL MOVE OK — crochet selon dribble, agilité et défense');
}
{
  const { Match, CEREMONY_DUR } = await import('../public/js/match.js');
  const proto = Match.prototype;
  const fake = { teams: [0, 1].map(t => ({ ps: Array.from({ length: 16 }, (_, k) => ({ id: t * 100 + k })) })) };
  const plan = proto.ceremonyPlan.call(fake);
  assert.equal(plan.slots.length, 22, 'les 22 titulaires participent à la cérémonie');
  const end = plan.slots.map(s => proto.ceremonyPose.call(fake, s, CEREMONY_DUR - 1.5));
  assert.ok(end.every(q => !q.walking), 'tout le monde est aligné avant la fin de la séquence');
  const xs = end.map(q => q.x).sort((a, b) => a - b);
  assert.ok(xs.every((x, i) => i === 0 || x - xs[i - 1] > 0.6), 'aucun joueur ne se chevauche dans l alignement');
  console.log('CEREMONY OK — 22 joueurs alignés à temps, sans chevauchement');
}
{
  const { Match } = await import('../public/js/match.js');
  const P = Match.prototype;
  const mk = (team, rating, goals = 0) => ({ team, rating, goals, assists: 0 });
  const star = mk(1, 8.1, 2), solid = mk(0, 8.0);
  const fake = { score: [0, 2], teams: [{ ps: [solid, mk(0, 6.5)] }, { ps: [star, mk(1, 7)] }] };
  assert.equal(P.getManOfTheMatch.call(fake), star, 'homme du match : note + buts + victoire');
  const q0 = P.walkOff.call(fake, [-20, -10], 0.1), q1 = P.walkOff.call(fake, [-20, -10], 4), q2 = P.walkOff.call(fake, [-20, -10], 30);
  assert.ok(q1.y > q0.y && q1.x > q0.x, 'les joueurs marchent vers le tunnel');
  assert.equal(q2.y, 60, 'arrivés au tunnel, les joueurs disparaissent');
  console.log('BREAK SHOW OK — sortie vers le tunnel et homme du match');
}
{
  const { resolveWeather, getWeatherPhysics } = await import('../public/js/match.js');
  assert.equal(resolveWeather('auto', true), 'night', 'serveur et tests : nuit claire, déterministe');
  assert.equal(resolveWeather('rain'), 'rain');
  const seen = new Set(Array.from({ length: 60 }, (_, i) => resolveWeather('auto', false, () => i / 60)));
  assert.equal(seen.size, 4, 'météo variable : les 4 ambiances apparaissent');
  assert.ok(getWeatherPhysics('rain').groundFriction < getWeatherPhysics('night').groundFriction, 'pelouse mouillée : le ballon roule plus loin');
  console.log('WEATHER OK — 4 ambiances, pluie = ballon plus rapide au sol');
}
{
  const { Match } = await import('../public/js/match.js');
  const P = Match.prototype;
  const frames = Array.from({ length: 120 }, (_, k) => ({ b: [30 + k * 0.2, 1, 0, 20, 0, 0, 0, 0], p: [] }));
  const mk = () => ({ net: null, replay: null, settings: {}, renderer3d: {}, clock: 100, minute: 30, replayBuf: frames, bigChance: { kind: 'post', clock: 98, minute: 30 } });
  const a = mk(); P.maybeChanceReplay.call(a, 'goalkick');
  assert.ok(a.replay && a.replay.kind === 'chance' && a.replay.segs.length === 2, 'poteau puis 6 mètres : ralenti de l occasion (2 angles)');
  assert.equal(a.replay.title, 'SUR LE POTEAU !');
  const b = mk(); b.clock = 110; P.maybeChanceReplay.call(b, 'goalkick');
  assert.equal(b.replay, null, 'pas de ralenti si le jeu s arrête longtemps après l occasion');
  const c = mk(); c.lastChanceReplayMin = 25; P.maybeChanceReplay.call(c, 'corner');
  assert.equal(c.replay, null, 'pas plus d un ralenti d occasion toutes les 10 minutes');
  const d = mk(); d.net = {}; P.maybeChanceReplay.call(d, 'corner');
  assert.equal(d.replay, null, 'pas de ralenti en ligne');
  console.log('CHANCE REPLAY OK — poteaux, arrêts et frappes frôlant le cadre rejoués quand le jeu s arrête');
}
{
  const { withDerivedAttrs, getShotTechnique, getShotTypeSaveFactor } = await import('../public/js/match.js');
  const artist = withDerivedAttrs({ dri: 90, pas: 88, phy: 60, sho: 80, def: 30 }), stopper = withDerivedAttrs({ dri: 40, pas: 50, phy: 85, sho: 40, def: 85 });
  assert.ok(artist.tec > 80 && stopper.tec < 50, 'technique dérivée du dribble et de la passe');
  assert.ok(stopper.hea > artist.hea, 'jeu de tête dérivé du physique et de la défense');
  assert.equal(withDerivedAttrs({ tec: 77 }).tec, 77, 'une technique fournie est conservée');
  assert.equal(getShotTechnique({ power: 0.45, distance: 18, keeperOut: 8 }), 'chip', 'gardien sorti : piqué');
  assert.equal(getShotTechnique({ power: 0.6, distance: 20, keeperOut: 1, technique: 85, shooterY: 6, targetY: -2.5 }), 'curl', 'technicien côté opposé : enroulé');
  assert.equal(getShotTechnique({ power: 0.95, distance: 20, keeperOut: 1, technique: 85 }), 'standard', 'frappe pleine puissance : pas d enroulé');
  assert.equal(getShotTechnique({ power: 0.45, distance: 18, keeperOut: 8, setPiece: 'penalty' }), 'standard', 'pas de piqué sur coup de pied arrêté');
  assert.ok(getShotTypeSaveFactor('chip', 8) < getShotTypeSaveFactor('chip', 1), 'le piqué punit le gardien avancé');
  console.log('TECHNIQUES OK — technique et jeu de tête par joueur, piqué, enroulé, volée, retourné');
}

// Commentaire arabe style TV : noms de clubs en arabe, article fusionné, consultant après un but.
{
  const Cm = await import('../public/js/commentary.js');
  assert.equal(Cm.commentaryLang('auto', 'fr'), 'fr');
  assert.equal(Cm.commentaryLang('ar_tv', 'fr'), 'ar_tv');
  for (const k of Object.keys(Cm.LINES.fr)) assert.ok(Cm.LINES.ar_tv[k]?.length, `ar_tv couvre ${k}`);
  console.log('commentaire ar_tv OK');
}

// Temps additionnel : panneau du 4e arbitre à la 45e, horloge « 45+ ».
{
  const C = await import('../public/js/career.js');
  const st = C.newCareer({ clubId: 'est', seed: 4 });
  const canvas = { clientWidth: 800, clientHeight: 400, getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) };
  let seed = 7; const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
  const m = new Match({ canvas, home: C.matchTeam(st, 'est'), away: C.matchTeam(st, 'ca', true), userSide: null, settings: { duration: 1, voice: false, replays: false, assist: true, difficulty: 1 }, random });
  for (let i = 0; i < 60 * 200 && !m.addBoard && m.half === 1; i++) m.step(1 / 60);
  assert.ok(m.addBoard && m.addBoard.half === 1 && m.addBoard.n === m.addTime(1), 'panneau de temps additionnel à la 45e');
  assert.match(m.ticker, /additionnel/, 'annonce du temps additionnel');
  console.log('TEMPS ADDITIONNEL OK');
}

// VAR réelle : un but issu d'un hors-jeu non signalé est annulé (score, buteur, résumé) et la défense obtient un coup franc.
{
  const C = await import('../public/js/career.js');
  const st = C.newCareer({ clubId: 'est', seed: 4 });
  const canvas = { clientWidth: 800, clientHeight: 400, getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) };
  let seed = 11; const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
  const m = new Match({ canvas, home: C.matchTeam(st, 'est'), away: C.matchTeam(st, 'ca', true), userSide: null, settings: { duration: 3, voice: false, replays: false }, random });
  for (let i = 0; i < 120; i++) m.step(1 / 60);
  const scorer = m.teams[0].ps[9]; m.ball.last = scorer;
  m.varWatch = { team: 0, offender: scorer.name, x: m.teams[0].dir * 30, y: 5, line: m.teams[0].dir * 29.7, margin: 0.3, t0: m.clock };
  const goalsBefore = scorer.goals;
  m.goal(0);
  assert.equal(m.score[0], 1, 'but d abord accordé');
  assert.ok(m.pendingVar && m.pendingVar.kind === 'offside', 'VAR en attente');
  m.afterGoal();
  assert.equal(m.score[0], 0, 'VAR : but annulé');
  assert.equal(scorer.goals, goalsBefore, 'but retiré au buteur');
  assert.ok(m.events.some(e => e.type === 'var' && e.decision === 'goal_disallowed'), 'événement VAR');
  assert.ok(!m.events.some(e => e.type === 'goal' && e.team === 0), 'plus de but dans le résumé');
  assert.equal(m.restart?.type, 'freekick'); assert.equal(m.restart?.team, 1, 'coup franc pour la défense');
  // But sans hors-jeu : validé.
  m.varWatch = null; m.goal(0); m.afterGoal(); assert.equal(m.score[0], 1, 'but validé sans hors-jeu');
  // Penalty sifflé à tort (faute 40 cm hors de la surface) : annulé après visionnage, coup franc.
  const d = m.teams[1].dir, att = m.teams[1].ps[9], def = m.teams[0].ps[3];
  att.x = d * (52.5 - 16.9); att.y = 3; let ok = false;
  for (let k = 0; k < 40 && !ok; k++) { att.y = 3 + k * 0.37; m.state = 'play'; m.foul(def, att); ok = !!m.varReview; }
  assert.ok(ok, 'faute près de la surface : penalty sifflé puis revu');
  assert.equal(m.restart.type, 'penalty');
  for (let i = 0; i < 60 * 5 && m.varReview; i++) m.step(1 / 60);
  assert.equal(m.restart.type, 'freekick', 'VAR : penalty transformé en coup franc');
  assert.ok(m.events.some(e => e.type === 'var' && e.decision === 'penalty_cancelled'));
  console.log('VAR OK');
}
