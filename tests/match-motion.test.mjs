import assert from 'node:assert/strict';

globalThis.window = { addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1, innerWidth: 800, innerHeight: 450 };
globalThis.document = { addEventListener() {}, removeEventListener() {}, hidden: false, createElement: () => ({ getContext: () => ({}) }) };
globalThis.devicePixelRatio = 1;
globalThis.innerWidth = 800;
globalThis.innerHeight = 450;

const { Match, getMovementTuning, getDribbleLaneTarget, getTackleAssessment, getPassLaneAssessment, getShotAccuracy, getShotTargetY, getKeeperSaveAssessment, getKeeperDiveProfile, getBodyContactAssessment, getPressingPlan, getAttackingSupportPlan } = await import('../public/js/match.js');
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
assert.ok(Math.abs(getShotTargetY(0, 0)) > 2.1, 'la visée automatique cherche une zone latérale plus difficile à lire pour le gardien');
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


// Les appels offensifs créent trois solutions distinctes et respectent la ligne de hors-jeu.
const attackCarrier = { id: 'carrier', x: 12, y: 1 };
const attackingPlayers = [
  attackCarrier,
  { id: 'runner', x: 18, y: 4, base: [23, 3], a: { pac: 91, sho: 88, phy: 78 } },
  { id: 'winger', x: 10, y: 15, base: [7, 18], a: { pac: 84, pas: 72 } },
  { id: 'midfielder', x: 6, y: -4, base: [0, -5], a: { pas: 90, tec: 85 } },
  { id: 'keeper', x: -48, y: 0, base: [-50, 0], isGK: true, a: { pac: 99 } },
  { id: 'sent-off', x: 20, y: -8, base: [20, -8], sentOff: true, a: { pac: 99, sho: 99 } },
];
const attackDefenders = [
  { x: 45, y: 0 }, { x: 36, y: -3 }, { x: 28, y: 10 }, { x: 22, y: -12 },
];
const attackPlan = getAttackingSupportPlan(attackingPlayers, attackCarrier, attackDefenders, 1);
assert.deepEqual(attackPlan.map(x => x.role), ['forward-run', 'wide-support', 'short-option']);
assert.equal(new Set(attackPlan.map(x => x.player.id)).size, 3, 'les solutions offensives utilisent trois joueurs différents');
assert.ok(attackPlan.every(x => x.player.id !== 'keeper' && x.player.id !== 'sent-off'), 'gardien et joueur expulsé exclus des appels');
const lastDefender = attackDefenders.map(p => p.x).sort((a, b) => b - a)[1];
const forwardRun = attackPlan.find(x => x.role === 'forward-run');
assert.ok(forwardRun.x <= lastDefender - 1.1 + 1e-9, 'l appel en profondeur reste derrière le deuxième dernier adversaire');
assert.ok(Math.abs(attackPlan.find(x => x.role === 'wide-support').y) >= 12, 'le soutien extérieur conserve la largeur');
assert.ok(attackPlan.find(x => x.role === 'short-option').x < attackCarrier.x, 'l appui court reste disponible derrière le porteur');
assert.ok(attackPlan.every(x => Math.abs(x.x) < 52.5 && Math.abs(x.y) < 34), 'toutes les cibles restent dans le terrain');

const tightLine = [{ x: 16, y: 0 }, { x: 15, y: 2 }, { x: 12, y: -2 }, { x: 8, y: 6 }];
const blockedRun = getAttackingSupportPlan(attackingPlayers, attackCarrier, tightLine, 1);
assert.ok(!blockedRun.some(x => x.role === 'forward-run'), 'aucun appel en profondeur forcé quand la ligne défensive bloque l espace');

const mirroredPlayers = attackingPlayers.map(p => ({ ...p, x: -p.x, y: -p.y }));
const mirroredDefenders = attackDefenders.map(p => ({ x: -p.x, y: -p.y }));
const mirroredPlan = getAttackingSupportPlan(mirroredPlayers, mirroredPlayers[0], mirroredDefenders, -1);
assert.deepEqual(mirroredPlan.map(x => x.role), ['forward-run', 'wide-support', 'short-option']);
assert.ok(mirroredPlan.every(x => x.x * -1 > -52.5 && x.y * -1 > -34), 'les cibles restent valides dans le sens d attaque inverse');
console.log('ATTACK SUPPORT OK — appels dans le jeu, largeur, appui court et hors-jeu');


// Les gardiens adaptent leur plongeon à la hauteur, à la portée et au temps de réaction.
const lowDive = getKeeperDiveProfile({ keeperY: 0, shotY: -2.6, shotZ: 0.25, shotSpeed: 25, crossingTime: 0.3, rating: 55 });
const highDive = getKeeperDiveProfile({ keeperY: 0, shotY: 2.7, shotZ: 2.25, shotSpeed: 27, crossingTime: 0.24, rating: 88 });
const lateDive = getKeeperDiveProfile({ keeperY: 0, shotY: 3.1, shotZ: 1.3, shotSpeed: 31, crossingTime: 0.18, rating: 42 });
assert.ok(lowDive.height < 0, 'un tir bas déclenche une extension descendante');
assert.ok(highDive.height > 0, 'une frappe en hauteur déclenche une extension ascendante');
assert.ok(lowDive.direction < 0 && highDive.direction > 0, 'le plongeon suit le côté du tir');
assert.ok(lateDive.duration > highDive.duration, 'un gardien moins réactif conserve une animation de plongeon plus longue');
assert.ok(lateDive.stretch >= 0.2 && lateDive.stretch <= 0.9, 'l extension est bornée pour rester visuellement stable');
console.log('KEEPER DIVE OK — extension latérale, prise basse/haute et réaction');


// Les contacts corporels tiennent compte du physique, de l'agilité et de la fatigue.
const powerfulFresh = { a: { phy: 92, dri: 84 }, stamina: 0.98, vx: 4, vy: 0 };
const lightTired = { a: { phy: 48, dri: 44 }, stamina: 0.42, vx: -2, vy: 0 };
const balancedContact = getBodyContactAssessment(powerfulFresh, lightTired, 6.2);
const reversedContact = getBodyContactAssessment(lightTired, powerfulFresh, 6.2);
assert.ok(balancedContact.staggerA < balancedContact.staggerB, 'le joueur plus puissant et frais résiste mieux au choc');
assert.ok(reversedContact.staggerA > reversedContact.staggerB, 'l avantage physique s inverse avec l ordre des joueurs');
assert.ok(balancedContact.impulseA < balancedContact.impulseB, 'le joueur plus lourd reçoit moins de variation de vitesse');
assert.ok(balancedContact.collision > 0 && balancedContact.collision <= 1, 'la sévérité du contact reste bornée');
assert.equal(getBodyContactAssessment(powerfulFresh, lightTired, 0).collision, 0, 'pas d impact sans vitesse de fermeture');
console.log('BODY CONTACT OK — physique, équilibre, fatigue et impulsion différenciée');
