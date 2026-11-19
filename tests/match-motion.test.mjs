import assert from 'node:assert/strict';

globalThis.window = { addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1, innerWidth: 800, innerHeight: 450 };
globalThis.document = { addEventListener() {}, removeEventListener() {}, hidden: false, createElement: () => ({ getContext: () => ({}) }) };
globalThis.devicePixelRatio = 1;
globalThis.innerWidth = 800;
globalThis.innerHeight = 450;

const { Match, getMovementTuning, getDribbleLaneTarget, getTackleAssessment, getPassLaneAssessment, getShotAccuracy, getShotTargetY, getKeeperSaveAssessment, getKeeperDiveProfile, getKeeperFootworkPace, isShotOnTargetAtGoalLine, getBodyContactAssessment, getTackleAnimationProfile, getArriveSpeed, getVelocityStep, getSmoothedTarget, getTeammateAvoidance, getPlayerBodyTransform, getRunningCadence, getCarryBallOffset, getPressingPlan, getAttackingSupportPlan } = await import('../public/js/match.js');
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


// Les appels offensifs créent quatre solutions complémentaires et respectent la ligne de hors-jeu.
const attackCarrier = { id: 'carrier', x: 12, y: 1 };
const attackingPlayers = [
  attackCarrier,
  { id: 'runner', x: 18, y: 4, base: [23, 3], a: { pac: 91, sho: 88, phy: 78 } },
  { id: 'winger', x: 10, y: 15, base: [7, 18], a: { pac: 84, pas: 72 } },
  { id: 'midfielder', x: 6, y: -4, base: [0, -5], a: { pas: 90, tec: 85 } },
  { id: 'inside-runner', x: 9, y: -9, base: [9, -9], a: { pac: 82, sho: 78, tec: 76, pas: 58 } },
  { id: 'keeper', x: -48, y: 0, base: [-50, 0], isGK: true, a: { pac: 99 } },
  { id: 'sent-off', x: 20, y: -8, base: [20, -8], sentOff: true, a: { pac: 99, sho: 99 } },
];
const attackDefenders = [
  { x: 45, y: 0 }, { x: 36, y: -3 }, { x: 28, y: 10 }, { x: 22, y: -12 },
];
const attackPlan = getAttackingSupportPlan(attackingPlayers, attackCarrier, attackDefenders, 1);
assert.deepEqual(attackPlan.map(x => x.role), ['forward-run', 'wide-support', 'short-option', 'diagonal-run']);
assert.equal(new Set(attackPlan.map(x => x.player.id)).size, 4, 'les solutions offensives utilisent quatre joueurs différents');
assert.ok(attackPlan.every(x => x.player.id !== 'keeper' && x.player.id !== 'sent-off'), 'gardien et joueur expulsé exclus des appels');
const lastDefender = attackDefenders.map(p => p.x).sort((a, b) => b - a)[1];
const forwardRun = attackPlan.find(x => x.role === 'forward-run');
assert.ok(forwardRun.x <= lastDefender - 1.1 + 1e-9, 'l appel en profondeur reste derrière le deuxième dernier adversaire');
assert.ok(Math.abs(attackPlan.find(x => x.role === 'wide-support').y) >= 12, 'le soutien extérieur conserve la largeur');
assert.ok(attackPlan.find(x => x.role === 'short-option').x < attackCarrier.x, 'l appui court reste disponible derrière le porteur');
assert.ok(attackPlan.every(x => Math.abs(x.x) < 52.5 && Math.abs(x.y) < 34), 'toutes les cibles restent dans le terrain');
const diagonalRun = attackPlan.find(x => x.role === 'diagonal-run');
assert.ok(diagonalRun.x > attackCarrier.x && diagonalRun.x <= lastDefender - 1.1 - 1.4 + 1e-9, 'l appel diagonal attaque le demi-espace sans franchir la ligne défensive');
assert.ok(Math.abs(diagonalRun.y - forwardRun.y) > 1, 'l appel diagonal propose un angle différent de la course axiale');

const tightLine = [{ x: 16, y: 0 }, { x: 15, y: 2 }, { x: 12, y: -2 }, { x: 8, y: 6 }];
const blockedRun = getAttackingSupportPlan(attackingPlayers, attackCarrier, tightLine, 1);
assert.ok(!blockedRun.some(x => x.role === 'forward-run' || x.role === 'diagonal-run'), 'aucun appel en profondeur ou diagonal forcé quand la ligne défensive bloque l espace');

const mirroredPlayers = attackingPlayers.map(p => ({ ...p, x: -p.x, y: -p.y }));
const mirroredDefenders = attackDefenders.map(p => ({ x: -p.x, y: -p.y }));
const mirroredPlan = getAttackingSupportPlan(mirroredPlayers, mirroredPlayers[0], mirroredDefenders, -1);
assert.deepEqual(mirroredPlan.map(x => x.role), ['forward-run', 'wide-support', 'short-option', 'diagonal-run']);
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


// Le tacle glissé suit une vraie séquence : départ progressif, extension, puis récupération.
const tackleStart = getTackleAnimationProfile(0.38, 0.38);
const tackleMid = getTackleAnimationProfile(0.19, 0.38);
const tackleRecovery = getTackleAnimationProfile(0.015, 0.38);
const shortAttempt = getTackleAnimationProfile(0.07, 0.14);
assert.equal(tackleStart.lunge, 0, 'le tacle part sans saut visuel');
assert.ok(tackleMid.lunge > 0.98, 'le corps atteint son extension au milieu du geste');
assert.ok(tackleMid.reach > tackleStart.reach, 'la jambe d intervention s allonge progressivement');
assert.ok(tackleRecovery.lunge < 0.13 && tackleRecovery.recovery > 0.9, 'la fin du geste revient vers la course');
assert.ok(shortAttempt.progress > 0.45 && shortAttempt.progress < 0.55, 'la durée réduite d un tacle manqué garde un mouvement partiel cohérent');
assert.ok([tackleStart, tackleMid, tackleRecovery, shortAttempt].every(x =>
  [x.progress, x.lunge, x.reach, x.recovery].every(Number.isFinite) &&
  x.progress >= 0 && x.progress <= 1 && x.lunge >= 0 && x.lunge <= 1 && x.reach >= 0 && x.reach <= 1),
  'le profil d animation reste borné et fini');
console.log('TACKLE ANIMATION OK — extension progressive, récupération et valeurs bornées');


// La vitesse d'arrivée freine avant la cible et ne dépasse jamais la vitesse maximale.
assert.equal(getArriveSpeed(0, 8, 9), 0, 'à la cible, la vitesse désirée est nulle');
assert.ok(getArriveSpeed(0.5, 8, 9) < 8, 'le joueur ralentit à proximité de son point de course');
assert.equal(getArriveSpeed(100, 7, 9), 7, 'la vitesse maximale est conservée loin de la cible');

// L'accélération est limitée sur le vecteur complet, y compris en diagonale.
const accelStraight = getVelocityStep(0, 0, 8, 0, 0.15);
const accelDiagonal = getVelocityStep(0, 0, 8, 8, 0.15);
assert.ok(Math.abs(Math.hypot(accelStraight.vx, accelStraight.vy) - 0.15) < 1e-9, 'l accélération droite respecte le budget');
assert.ok(Math.abs(Math.hypot(accelDiagonal.vx, accelDiagonal.vy) - 0.15) < 1e-9, 'l accélération diagonale respecte le même budget');

// La cible tactique évolue progressivement sans dépasser son point d'arrivée.
const smoothedTarget = getSmoothedTarget(0, 0, 10, -6, 1 / 60, 8);
assert.ok(smoothedTarget.x > 0 && smoothedTarget.x < 10, 'la cible X est amortie');
assert.ok(smoothedTarget.y < 0 && smoothedTarget.y > -6, 'la cible Y est amortie');
assert.deepEqual(getSmoothedTarget(2, 3, 2, 3, 1 / 60, 8), { x: 2, y: 3 }, 'une cible stable reste immobile');

// La projection du joueur suit la direction de course tout en gardant une verticale stable.
const sideOn = getPlayerBodyTransform(10, 0);
assert.ok(Math.abs(sideOn.a - 1) < 1e-9 && Math.abs(sideOn.d - 1) < 1e-9, 'le mouvement longitudinal garde le profil latéral');
assert.ok(Math.abs(sideOn.b) < 1e-9 && Math.abs(sideOn.c) < 1e-9, 'la projection latérale n inclut pas de cisaillement');
const endOn = getPlayerBodyTransform(0, -8);
assert.ok(endOn.a >= 0.63 && endOn.a <= 0.65, 'un joueur orienté vers la profondeur reste visible avec une largeur réduite');
assert.equal(endOn.b, 0, 'la course vers la profondeur ne couche pas la silhouette');
assert.equal(endOn.c, 0, 'la verticale du corps ne se mélange pas à la largeur');
assert.equal(endOn.d, 1, 'la hauteur du joueur reste intacte');
const reversed = getPlayerBodyTransform(-10, 0);
assert.ok(reversed.a < 0, 'le sprite se retourne quand le joueur court dans la direction opposée');
console.log('PRO MOVEMENT OK — freinage d arrivée, accélération vectorielle, cibles lissées et orientation projetée');

console.log('PLAYER PROJECTION OK — silhouette stable de profil et en profondeur');


// La cadence varie progressivement avec l'allure et la vitesse naturelle du joueur.
const walkingCadence = getRunningCadence(2.2, 55);
const sprintCadence = getRunningCadence(9.5, 88);
assert.ok(sprintCadence > walkingCadence, 'la foulée accélère avec la vitesse');
assert.ok(sprintCadence < 18.5 && walkingCadence > 6.8, 'la fréquence reste dans une plage d animation stable');

// La conduite garde le ballon plus près du pied d'un joueur technique, même en sprint.
const closeControl = getCarryBallOffset({ speed: 9, dribbling: 92, technique: 90, stamina: 0.96, sprinting: true, phase: 0.4 });
const looseControl = getCarryBallOffset({ speed: 9, dribbling: 42, technique: 45, stamina: 0.55, sprinting: true, phase: 0.4 });
assert.ok(closeControl.forward < looseControl.forward, 'un joueur technique conserve un ballon plus proche');
assert.ok(closeControl.skill > looseControl.skill, 'la maîtrise dépend du dribble et de la technique');
const touchA = getCarryBallOffset({ speed: 7, dribbling: 75, technique: 80, stamina: 0.9, phase: 0 });
const touchB = getCarryBallOffset({ speed: 7, dribbling: 75, technique: 80, stamina: 0.9, phase: Math.PI });
assert.ok(touchA.forward !== touchB.forward, 'la touche de balle évolue au fil des foulées');
assert.ok([closeControl, looseControl, touchA, touchB].every(x =>
  Number.isFinite(x.forward) && Number.isFinite(x.lateral) && x.forward >= 0.24 && x.forward <= 0.86),
  'les offsets de conduite restent bornés');
console.log('BALL CONTROL OK — touches dynamiques, maîtrise technique et sprint');
console.log('RUNNING CADENCE OK — fréquence de foulée adaptée à l allure');


// Les tirs cadrés sont déterminés au cadre réel, pas à la seule visée initiale.
assert.equal(isShotOnTargetAtGoalLine(0, 1.1), true, 'un ballon dans le cadre est cadré');
assert.equal(isShotOnTargetAtGoalLine(3.7, 1.1), false, 'un ballon à côté du poteau n est pas cadré');
assert.equal(isShotOnTargetAtGoalLine(0, 2.5), false, 'un ballon au-dessus de la barre n est pas cadré');
assert.equal(isShotOnTargetAtGoalLine(0, -0.1), false, 'un point sous le terrain n est pas cadré');
const onTargetStart = match.stats.onTarget[0];
const countedShot = { team: 0 };
assert.equal(match.recordShotOnTarget(countedShot, 0.5, 1.0), true, 'un arrêt sur un tir dans le cadre est comptabilisé');
assert.equal(match.recordShotOnTarget(countedShot, 0.5, 1.0), false, 'le même tir ne peut être compté deux fois');
assert.equal(match.stats.onTarget[0], onTargetStart + 1, 'un tir cadré n est ajouté qu une seule fois');

const averageKeeperFootwork = getKeeperFootworkPace(52, 0.55);
const eliteKeeperFootwork = getKeeperFootworkPace(92, 0.55);
const urgentKeeperFootwork = getKeeperFootworkPace(72, 0.18);
const relaxedKeeperFootwork = getKeeperFootworkPace(72, 1.05);
assert.ok(eliteKeeperFootwork > averageKeeperFootwork, 'un gardien plus fort ajuste plus vite ses appuis');
assert.ok(urgentKeeperFootwork > relaxedKeeperFootwork, 'le gardien accélère ses appuis quand le tir approche');
assert.ok([averageKeeperFootwork, eliteKeeperFootwork, urgentKeeperFootwork, relaxedKeeperFootwork]
  .every(v => Number.isFinite(v) && v >= 0.96 && v <= 1.26), 'la réponse latérale reste bornée');
console.log('SHOT ACCOUNTING + KEEPER FOOTWORK OK — cadre réel, anti-double comptage et appuis contextualisés');


// Les coéquipiers proches se séparent doucement au lieu de courir dans la même zone.
const spacingPlayer = { id: 'spacer', i: 4, x: 0, y: 0 };
const teammateAhead = { id: 'nearby', x: 1, y: 0 };
const spacing = getTeammateAvoidance(spacingPlayer, [spacingPlayer, teammateAhead], 2.8);
assert.ok(spacing.x < 0, 'un joueur s écarte d un coéquipier placé devant lui');
assert.ok(Math.abs(spacing.y) < 1e-9, 'la séparation reste stable sur un axe dégagé');
assert.ok(spacing.strength > 0 && spacing.strength <= 1, 'la pression de séparation est bornée');
const farSpacing = getTeammateAvoidance(spacingPlayer, [{ x: 5, y: 0 }], 2.8);
assert.deepEqual(farSpacing, { x: 0, y: 0, strength: 0 }, 'un joueur éloigné ne perturbe pas le déplacement');
const balancedSpacing = getTeammateAvoidance(spacingPlayer, [
  { x: -1, y: 0 }, { x: 1, y: 0 },
], 2.8);
assert.equal(balancedSpacing.strength, 0, 'deux pressions symétriques ne créent pas de dérive latérale');
const overlapSpacing = getTeammateAvoidance(spacingPlayer, [
  { x: 0, y: 0 },
], 2.8);
assert.ok([overlapSpacing.x, overlapSpacing.y, overlapSpacing.strength].every(Number.isFinite),
  'des positions presque confondues ne provoquent pas de NaN');
assert.ok(overlapSpacing.strength > 0, 'une superposition exacte reçoit une direction de dégagement déterministe');
console.log('TEAMMATE SPACING OK — séparation douce, stabilité et positions superposées');
