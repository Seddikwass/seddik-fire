import assert from 'node:assert/strict';

globalThis.window = { addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1, innerWidth: 800, innerHeight: 450 };
globalThis.document = { addEventListener() {}, removeEventListener() {}, hidden: false, createElement: () => ({ getContext: () => ({}) }) };
globalThis.devicePixelRatio = 1;
globalThis.innerWidth = 800;
globalThis.innerHeight = 450;

const { Match, getMovementTuning, getDribbleLaneTarget, getTackleAssessment, getPassLaneAssessment, getShotAccuracy, getShotTargetY, getKeeperSaveAssessment, getPressingPlan } = await import('../public/js/match.js');
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


const fresh = getMovementTuning({ pac: 88, phy: 86, dri: 84, tec: 82 }, 1);
const exhausted = getMovementTuning({ pac: 48, phy: 42, dri: 44, tec: 40 }, 0.28);
assert.ok(fresh.acceleration > exhausted.acceleration, 'un joueur rapide et frais accélère mieux qu un joueur fatigué');
assert.ok(fresh.turnRate > exhausted.turnRate, 'la fatigue réduit aussi la vivacité des changements de direction');

const lanePlayer = { x: 0, y: 0 };
const blockedLane = [{ x: 4, y: 0, vx: 0, vy: 0, sentOff: false }];
const lane = getDribbleLaneTarget(lanePlayer, blockedLane, 1);
assert.ok(Math.abs(lane.y) > 0.5, 'le porteur choisit un couloir latéral si l axe direct est fermé');
assert.ok(lane.x > 0, 'le couloir choisi conserve une progression vers le but');
const freeLane = getDribbleLaneTarget(lanePlayer, [], 1);
assert.ok(Math.abs(freeLane.y) < 0.01, 'le porteur garde l axe lorsque le couloir est libre');

const defenderFront = { x: 2.2, y: 0, vx: 2, vy: 0, heading: Math.PI, a: { def: 88 } };
const carrierFront = { x: 0.5, y: 0, vx: 2, vy: 0, heading: 0, a: { dri: 55 } };
const frontalTackle = getTackleAssessment(defenderFront, carrierFront, 1.7, false, 0);
const defenderRear = { x: -1.2, y: 0, vx: 8, vy: 0, heading: 0, a: { def: 88 } };
const rearTackle = getTackleAssessment(defenderRear, carrierFront, 1.7, false, 0);
assert.ok(frontalTackle.successChance > rearTackle.successChance, 'un duel frontal bien orienté est mieux évalué qu un tacle arrière lancé');
assert.ok(rearTackle.foulChance > frontalTackle.foulChance, 'un tacle arrière rapide augmente le risque de faute');

console.log('MATCH FEEL OK — fatigue, conduite en couloir et duels orientés');

// Une passe doit pénaliser les défenseurs qui coupent la trajectoire pendant le temps de vol.
const laneFrom = { x: 0, y: 0 }, laneTo = { x: 20, y: 0 };
const staticInterceptor = getPassLaneAssessment(laneFrom, laneTo, [{ x: 10, y: 0 }], 1.1);
const openPassingLane = getPassLaneAssessment(laneFrom, laneTo, [{ x: 10, y: 5 }], 1.1);
const movingInterceptor = getPassLaneAssessment(laneFrom, laneTo, [{ x: 10, y: 5, vy: -8 }], 1.1);
assert.ok(staticInterceptor.risk > openPassingLane.risk, 'une ligne directement occupée est risquée');
assert.ok(movingInterceptor.risk > openPassingLane.risk, 'un défenseur qui ferme la ligne est anticipé');
assert.ok(movingInterceptor.interceptor, 'le défenseur interceptant est identifié');

// Les tireurs techniques gardent une meilleure précision ; pression et puissance élevée dégradent le geste.
const composedShot = getShotAccuracy({ shooting: 92, technique: 94, pressure: 8, movingSpeed: 1, power: 0.68, assist: 1 });
const pressuredShot = getShotAccuracy({ shooting: 52, technique: 48, pressure: 1, movingSpeed: 12, power: 0.98, assist: 1 });
assert.ok(composedShot.spread < pressuredShot.spread, 'le tir élite et équilibré est moins dispersé');
assert.ok(composedShot.verticalSpread < pressuredShot.verticalSpread, 'la technique limite aussi l erreur verticale');
assert.ok(getShotAccuracy({ shooting: 80, technique: 80, pressure: 8, power: 0.98 }).spread >
  getShotAccuracy({ shooting: 80, technique: 80, pressure: 8, power: 0.65 }).spread,
  'une frappe maximale coûte un peu de précision');
assert.ok(getShotTargetY(1.5, 0) < 0, 'le tireur vise le côté opposé au gardien');
assert.ok(getShotTargetY(-1.5, 0) > 0, 'le choix de côté s inverse avec le gardien');
assert.ok(getShotTargetY(0, 2) < 0, 'un gardien centré laisse le tireur viser de l autre côté de son couloir');
assert.equal(getShotTargetY(1, 0, 99), 3.38, 'la visée tactile est bornée dans le but');
console.log('PASSING + SHOOTING OK — anticipation des interceptions, précision contextualisée et visée opposée au gardien');

// Les gardiens d'élite gagnent en portée, mais les tirs placés et puissants restent dangereux.
const keeperElite = getKeeperSaveAssessment({ rating: 92, keeperY: 0, shotY: 0.2, shotZ: 0.8, shotSpeed: 18, crossingTime: 0.2 });
const keeperAverage = getKeeperSaveAssessment({ rating: 52, keeperY: 0, shotY: 0.2, shotZ: 0.8, shotSpeed: 18, crossingTime: 0.2 });
const keeperBeaten = getKeeperSaveAssessment({ rating: 52, keeperY: 0, shotY: 2.9, shotZ: 2.1, shotSpeed: 28, crossingTime: 0.78 });
assert.ok(keeperElite.chance > keeperAverage.chance, 'la note du gardien augmente sa chance d arrêt');
assert.ok(keeperBeaten.chance < keeperAverage.chance, 'un tir puissant dans la lucarne est nettement plus difficile');
assert.ok(keeperElite.reach > keeperAverage.reach, 'la portée dépend de la qualité du gardien');
console.log('GOALKEEPING OK — portée, placement, hauteur du tir et temps de réaction');

// Le pressing répartit les défenseurs entre porteur, axe intérieur et couloir opposé.
const carrierForPress = { x: 8, y: 7, vx: -3, vy: 0.5 };
const pressingDefenders = [
  { id: 'near', x: 6, y: 7, a: { pac: 65 }, stamina: 1 },
  { id: 'inside', x: 11, y: 3, a: { pac: 78 }, stamina: 0.9 },
  { id: 'wide', x: 13, y: -2, a: { pac: 72 }, stamina: 0.95 },
  { id: 'keeper', x: -48, y: 0, isGK: true, a: { pac: 50 } },
  { id: 'sent-off', x: 9, y: 8, sentOff: true, a: { pac: 99 } },
];
const pressOne = getPressingPlan(pressingDefenders, carrierForPress, 1, 1);
const pressTwo = getPressingPlan(pressingDefenders, carrierForPress, 1, 2);
const pressThree = getPressingPlan(pressingDefenders, carrierForPress, 1, 3);
assert.equal(pressOne.length, 1, 'pressing bas : un seul joueur');
assert.equal(pressTwo.length, 2, 'pressing moyen : un joueur presse et un couvre l axe');
assert.equal(pressThree.length, 3, 'pressing haut : trois rôles');
assert.deepEqual(pressThree.map(x => x.role), ['press', 'cover-inside', 'cover-outside']);
assert.equal(new Set(pressThree.map(x => x.player.id)).size, 3, 'chaque rôle est confié à un joueur distinct');
assert.ok(pressThree.every(x => x.player.id !== 'keeper' && x.player.id !== 'sent-off'), 'gardien et joueur expulsé exclus');
assert.ok(pressThree.every(x => Number.isFinite(x.x) && Number.isFinite(x.y)), 'les cibles du pressing restent valides');
console.log('PRESSING SHAPE OK — pressing du porteur et couvertures intérieure/extérieure');
