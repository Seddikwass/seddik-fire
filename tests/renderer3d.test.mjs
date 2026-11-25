import assert from 'node:assert/strict';
import { get3DQualityProfile, getPlayer3DDetailLevel, getPlayer3DPose, getPlayer3DActionWeights, get3DBallShadowProfile, get3DCrowdMotionPose, get3DCameraPose, get3DStadiumMeshStats, getPlayer3DModelStats, getWeatherProfile, playerLook, kitPatternColor } from '../public/js/renderer3d.js';

const low = get3DQualityProfile('low');
assert.equal(getPlayer3DDetailLevel(0, 10), 1, 'le profil faible conserve des détails près de la caméra');
assert.equal(getPlayer3DDetailLevel(0, 25), 0, 'le profil faible allège les joueurs éloignés');
assert.equal(getPlayer3DDetailLevel(1, 30), 2, 'le profil moyen passe en haute définition près du jeu');
assert.equal(getPlayer3DDetailLevel(2, 60), 2, 'les joueurs proches gardent le détail facial et textile');
assert.equal(getPlayer3DDetailLevel(2, 120), 1, 'les joueurs éloignés sont allégés pour Android');
const medium = get3DQualityProfile('medium');
const high = get3DQualityProfile('high');

const night = getWeatherProfile('night');
const day = getWeatherProfile('day');
assert.ok(night.light[0] > 1 && night.light[1] > 1, 'le mode nuit conserve une luminosité suffisante pour lire les joueurs et la pelouse');
assert.ok(night.fogRange[2] < 0.5, 'la brume nocturne ne masque pas les détails du stade');
assert.ok(night.light[0] >= 1.2 && night.light[1] >= 1.15,
  'les projecteurs gardent les joueurs et les tribunes lisibles la nuit');
assert.ok(night.fogRange[2] <= 0.36 && night.fogRange[1] >= 200,
  'la visibilité nocturne reste longue avec une brume discrète');
assert.ok(day.light[0] > night.light[0], 'le plein jour reste plus lumineux que le mode nuit');
assert.ok(low.pixelRatio <= medium.pixelRatio && medium.pixelRatio <= high.pixelRatio,
  'le ratio de pixels progresse avec la qualité');
assert.ok(low.crowd < medium.crowd && medium.crowd < high.crowd,
  'la densité du public s adapte au niveau graphique');
assert.ok(low.sphereSegments < medium.sphereSegments && medium.sphereSegments < high.sphereSegments,
  'les détails géométriques suivent la qualité');
assert.ok(low.turfDetail < medium.turfDetail && medium.turfDetail < high.turfDetail,
  'les détails de pelouse augmentent avec la qualité');
assert.ok(low.crowdMotion < medium.crowdMotion && medium.crowdMotion < high.crowdMotion,
  'la foule animée s adapte à la puissance du terminal');
assert.ok(high.crowd > 600 && high.seatRows >= 5, 'le stade haut de gamme comprend plusieurs rangées de supporters');
assert.equal(get3DQualityProfile('unknown').detail, 2, 'le profil par défaut reste haut');

const closeCamera = get3DCameraPose({ cam: { x: 14, y: -8, actionZoom: 1 } });
const previousCameraDistance = Math.hypot(7, 82, 82);
assert.ok(closeCamera.distance < previousCameraDistance * 0.82,
  'la nouvelle caméra 3D est nettement plus proche que le cadrage précédent');
assert.ok(closeCamera.target[0] === 14 && Math.abs(closeCamera.target[2] - 8) < 3, 'la caméra suit le centre de jeu fourni par le moteur');
assert.ok(Math.atan2(closeCamera.eye[1], closeCamera.eye[2] - closeCamera.target[2]) < 0.55, 'angle de caméra TV moderne (bas, < 32°)');
assert.ok(closeCamera.eye.every(Number.isFinite), 'la position de caméra reste finie');
const actionCamera = get3DCameraPose({ cam: { x: 14, y: -8, actionZoom: 1.09 } });
assert.ok(actionCamera.distance < closeCamera.distance, 'le zoom d action rapproche progressivement la caméra');
const replayCamera = get3DCameraPose({ cam: { x: 14, y: -8, actionZoom: 1.09 } }, true);
assert.equal(replayCamera.zoom, 1.02, 'le ralenti conserve un cadrage stable');
assert.equal(get3DCameraPose({}, null, 0.8).fovy, 0.9,
  'le cadrage vertical s adapte aux écrans étroits');
const groundCamera = get3DCameraPose({ cam: { x: 14, y: -8, actionZoom: 1 }, ball: { z: 0 } });
const aerialCamera = get3DCameraPose({ cam: { x: 14, y: -8, actionZoom: 1 }, ball: { z: 8 } });
assert.ok(aerialCamera.focusLift > groundCamera.focusLift, 'la caméra relève le centre d image quand le ballon monte');
assert.ok(aerialCamera.target[1] > groundCamera.target[1], 'les ballons aériens restent dans le champ de la caméra');
const portraitCamera = get3DCameraPose({ cam: { x: 0, y: 0 } }, null, 0.72);
const landscapeCamera = get3DCameraPose({ cam: { x: 0, y: 0 } }, null, 16 / 9);
assert.ok(portraitCamera.distance > landscapeCamera.distance, 'le cadrage mobile étroit recule légèrement pour préserver la largeur de jeu');
const replayAerialCamera = get3DCameraPose({}, { b: [0, 0, 6] }, 16 / 9);
assert.ok(replayAerialCamera.focusLift > 0, 'le ralenti suit aussi la hauteur du ballon');

console.log('3D CAMERA OK — cadrage rapproché, suivi du ballon, zoom d action et adaptation mobile');

const runner = getPlayer3DPose({
  x: 12, y: -4, vx: 3, vy: 4, heading: 0.93, anim: 2, turn: 0.8,
  slideT: 0, diveT: 0, jumpT: 0, kickT: 0, headerT: 0,
});
assert.equal(runner.x, 12);
assert.equal(runner.y, -4);
assert.equal(runner.speed, 5, 'la vitesse est calculée dans le plan du terrain');
assert.equal(runner.heading, 0.93, 'l orientation du modèle suit celle du moteur');
assert.ok(runner.lean > 0, 'la course crée une légère inclinaison du buste');
assert.ok(runner.turnLean < 0, 'le buste s incline dans le sens du virage');
assert.ok(runner.bodyBob > 0, 'la course ajoute une oscillation verticale subtile');
const sprintPose = getPlayer3DPose({ vx: 8.5, vy: 0, anim: 2, turn: 0.4 });
assert.ok(sprintPose.sprint > 0.5 && sprintPose.turnLean < 0, 'le sprint amplifie l allonge et le contrepoids du virage');
const accelerationPose = getPlayer3DPose({ vx: 6.8, vy: 0, motionAccel: 0.9, anim: 2 });
const brakingPose = getPlayer3DPose({ vx: 6.8, vy: 0, motionAccel: -0.9, anim: 2 });
assert.ok(accelerationPose.accelerationLean > 0 && accelerationPose.driveBurst > 0.9,
  'une accélération franche incline le buste et renforce la foulée');
assert.ok(brakingPose.accelerationLean < 0 && brakingPose.brakeBrace > 0.9,
  'un freinage prépare le buste et les appuis');
assert.ok(accelerationPose.bodyBob >= sprintPose.bodyBob * 0.9,
  'la poussée accentue légèrement le rythme du corps');
assert.equal(runner.slide, 0);
assert.equal(runner.dive, 0);

const sliding = getPlayer3DPose({ x: 0, y: 0, slideT: 0.19, slideDuration: 0.38, diveT: 0.26, jumpT: 0.1 });
assert.ok(sliding.slide > 0.45 && sliding.slide < 0.55, 'le tacle anime une descente du corps');
assert.ok(sliding.dive > 0.45 && sliding.dive < 0.55, 'le plongeon du gardien est normalisé');
assert.ok(sliding.jump > 0, 'le saut est transmis au modèle 3D');

const replayFrame = Array(27).fill(0);
replayFrame[0] = -8; replayFrame[1] = 5; replayFrame[3] = 7;
replayFrame[4] = -2; replayFrame[5] = 6; replayFrame[26] = -1.2; replayFrame[27] = -1;
const replayPose = getPlayer3DPose({ x: 100, y: 100 }, replayFrame);
assert.equal(replayPose.x, -8, 'le modèle 3D lit la position du ralenti');
assert.equal(replayPose.y, 5);
assert.equal(replayPose.speed, Math.hypot(-2, 6));
assert.equal(replayPose.heading, -1.2, 'le ralenti conserve l orientation enregistrée');
assert.equal(replayPose.kickFootSide, -1, 'le replay conserve le pied ayant frappé le ballon');
const accelerationReplayFrame = Array(29).fill(0);
accelerationReplayFrame[4] = 6;
accelerationReplayFrame[28] = 0.82;
const accelerationReplayPose = getPlayer3DPose({}, accelerationReplayFrame);
assert.equal(accelerationReplayPose.acceleration, 0.82, 'le replay conserve l accélération du joueur');

console.log('3D RENDERER CORE OK — profils mobiles, course, tacle, saut, plongeon et ralenti');


const stadiumTeams = [
  { kit: { shirt: '#d71920', trim: '#ffffff', shorts: '#111111' } },
  { kit: { shirt: '#123d91', trim: '#f4d35e', shorts: '#111111' } },
];
const lowStadium = get3DStadiumMeshStats({ teams: stadiumTeams }, 'low');
const highStadium = get3DStadiumMeshStats({ teams: stadiumTeams }, 'high');
assert.ok(lowStadium.vertexCount > 5000, 'la scène 3D comprend terrain, buts, tribunes et équipements');
assert.ok(highStadium.vertexCount > lowStadium.vertexCount, 'le stade haut détail ajoute de la géométrie de public');
assert.equal(lowStadium.finite, true, 'les coordonnées du stade bas détail sont toutes finies');
assert.equal(highStadium.finite, true, 'les coordonnées du stade haut détail sont toutes finies');
console.log('3D STADIUM GEOMETRY OK — pelouse, tribunes, filets, projecteurs et coordonnées valides');


// Les motifs de maillot doivent produire des couleurs déterministes et préserver les couleurs d'équipe.
{
  const shirt = [0.8, 0.05, 0.08], alt = [0.95, 0.9, 0.75], alt2 = [0.08, 0.12, 0.2];
  assert.deepEqual(kitPatternColor({ pattern: 'plain' }, shirt, alt), shirt);
  const stripe = kitPatternColor({ pattern: 'stripes', stripes: 8 }, shirt, alt);
  assert.ok([stripe(1, 0, 0), stripe(0, 0, 1)].every(col => Array.isArray(col) && col.length === 3),
    'les rayures retournent des couleurs RGB valides');
  const triple = kitPatternColor({ pattern: 'stripes3', stripes: 9 }, shirt, alt, alt2);
  const colors = [triple(1, 0, 0), triple(0, 0, 1), triple(-1, 0, 0)];
  assert.ok(colors.every(col => Array.isArray(col) && col.length === 3), 'les trois couleurs du motif restent valides');
  const sash = kitPatternColor({ pattern: 'sash' }, shirt, alt, alt2);
  assert.ok(sash(0, 0, 0).length === 3, 'la diagonale du maillot retourne une couleur valide');
}
console.log('KIT PATTERNS OK — couleurs unies, rayures, tricolore et diagonale');

const modelMatch = {
  selected: null,
  teams: [
    { kit: { shirt: '#d71920', trim: '#ffffff', shorts: '#111111' }, gkKit: { shirt: '#42b96b', trim: '#ffffff', shorts: '#111111' } },
    { kit: { shirt: '#123d91', trim: '#f4d35e', shorts: '#111111' }, gkKit: { shirt: '#f0a52b', trim: '#111111', shorts: '#111111' } },
  ],
};
const lookA = playerLook({ id: 'player-a', name: 'Player A' }, 0);
const lookARepeat = playerLook({ id: 'player-a', name: 'Player A' }, 0);
assert.deepEqual(lookA, lookARepeat, 'les détails du visage restent déterministes entre les matchs');
assert.ok(Array.isArray(lookA.eye) && lookA.eye.length === 3, 'chaque joueur reçoit une couleur d iris valide');
assert.ok(Number.isInteger(lookA.beardStyle), 'le style de barbe est stable et individualisé');
assert.ok(Array.isArray(lookA.hairHighlight) && lookA.hairHighlight.length === 3 && lookA.hairHighlight.every(Number.isFinite),
  'chaque joueur reçoit une teinte de reflet capillaire RGB valide');
assert.deepEqual(lookA.hairHighlight, lookARepeat.hairHighlight, 'les reflets des cheveux restent déterministes');

const modelPlayer = {
  x: 3, y: -2, vx: 2, vy: 1, heading: 0.6, anim: 1.4, team: 0, i: 9,
  num: 10, skin: '#c68642', isGK: false, slideT: 0, diveT: 0,
  a: { phy: 78 }, stamina: 0.92,
};
const lowPlayerMesh = getPlayer3DModelStats(modelMatch, modelPlayer, 'low');
const highPlayerMesh = getPlayer3DModelStats(modelMatch, modelPlayer, 'high');
assert.ok(lowPlayerMesh.vertexCount > 500, 'un joueur dispose d un vrai maillage 3D articulé');
assert.ok(highPlayerMesh.vertexCount > lowPlayerMesh.vertexCount, 'la qualité haute ajoute les détails du visage, du maillot et des chaussures');
assert.equal(lowPlayerMesh.finite, true, 'le modèle bas détail a des coordonnées finies');
assert.equal(highPlayerMesh.finite, true, 'le modèle haute qualité a des coordonnées finies');
const keeperMesh = getPlayer3DModelStats(modelMatch, { ...modelPlayer, isGK: true }, 'high');
assert.ok(keeperMesh.vertexCount > 0, 'le gardien possède un modèle 3D et ses gants');
console.log('3D PLAYER MODELS OK — numéros de maillot, visage, peau, chaussures et profil gardien');


// Les gestes déjà simulés doivent aussi être transmis au modèle 3D, y compris en replay.
const actionFrame = Array(27).fill(0);
actionFrame[3] = 1.7;
actionFrame[4] = 2.4;
actionFrame[5] = -0.8;
actionFrame[7] = 0.26;  // plongeon : 0,52 s
actionFrame[8] = 0.19;  // tacle : 0,38 s
actionFrame[9] = 0.17;  // frappe : 0,34 s
actionFrame[10] = 0.22; // tête : 0,44 s
actionFrame[11] = 0.16; // première touche : 0,32 s
actionFrame[12] = 0.12; // déséquilibre : 0,24 s
actionFrame[13] = 0.24; // prise du gardien : 0,48 s
actionFrame[14] = 0.21; // dégagement du poing : 0,42 s
actionFrame[15] = -1;
actionFrame[16] = -1;
actionFrame[17] = 1;
actionFrame[18] = -1;
actionFrame[19] = 1;
actionFrame[20] = -1;
actionFrame[21] = 0.7;
actionFrame[22] = 0.8;
actionFrame[23] = 0.11;
actionFrame[24] = -1;
actionFrame[25] = 0.38;
actionFrame[26] = 0.42;
const actionPose = getPlayer3DPose({}, actionFrame);
assert.equal(actionPose.firstTouch, 0.5, 'la première touche est transmise à la pose 3D');
assert.equal(actionPose.stumble, 0.5, 'le déséquilibre est transmis à la pose 3D');
assert.equal(actionPose.keeperCatch, 0.5, 'la prise du gardien est transmise à la pose 3D');
assert.equal(actionPose.keeperPunch, 0.5, 'le dégagement du poing est transmis à la pose 3D');
assert.equal(actionPose.contact, 0.5, 'le contact physique est transmis à la pose 3D');
assert.equal(actionPose.diveHeight, 0.7, 'la hauteur du plongeon est conservée');
assert.equal(actionPose.diveStretch, 0.8, 'l extension du plongeon est conservée');
assert.equal(actionPose.headerDir, -1);
assert.equal(actionPose.firstTouchDir, 1);
assert.equal(actionPose.stumbleDir, -1);
assert.equal(actionPose.contactDir, -1);
assert.equal(actionPose.heading, 0.42, 'le replay conserve l orientation du joueur');

const actionWeights = getPlayer3DActionWeights(actionPose);
assert.ok(actionWeights.gait >= 0 && actionWeights.gait <= 1, 'la foulée reste bornée pendant les gestes');
assert.ok(actionWeights.diveReach > 0.4, 'le plongeon utilise son extension réelle');
assert.ok(actionWeights.diveFlight > 0.98, 'le gardien passe par une phase de vol au milieu du plongeon');
assert.ok(actionWeights.keeperLeadReach > actionWeights.keeperBalanceReach,
  'le bras du côté du ballon s étend davantage que le bras de contrepoids');
assert.equal(actionWeights.catchReach, 0.5, 'la portée de prise suit la phase du gardien');
assert.equal(actionWeights.punchReach, 0.5, 'la portée de dégagement suit la phase du gardien');
assert.equal(actionWeights.kickPulse, 1, 'la frappe produit une impulsion au milieu de son animation');
assert.equal(actionWeights.firstTouchPulse, 1, 'la première touche produit une impulsion au milieu de son animation');
assert.equal(actionWeights.brace, 0.5, 'le corps prépare une réaction cohérente au contact');
assert.ok(Object.values(actionWeights).every(Number.isFinite), 'tous les poids d animation sont numériques et finis');

const kickWindupPose = getPlayer3DPose({ x: 0, y: 0, kickT: 0.34, kickStyle: 'shot', kickPower: 0.92 });
const kickFollowPose = getPlayer3DPose({ x: 0, y: 0, kickT: 0.05, kickStyle: 'shot', kickPower: 0.92 });
const kickWindupWeights = getPlayer3DActionWeights(kickWindupPose);
const kickFollowWeights = getPlayer3DActionWeights(kickFollowPose);
assert.ok(kickWindupWeights.kickWindup > kickFollowWeights.kickWindup, 'la jambe recule avant la frappe');
assert.ok(kickFollowWeights.kickFollowThrough > kickWindupWeights.kickFollowThrough, 'la jambe traverse le ballon après la frappe');
assert.ok(kickFollowWeights.kickPulse > 0, 'la phase de contact est visible');

const headerPose = getPlayer3DPose({ headerT: 0.22 });
const headerWeights = getPlayer3DActionWeights(headerPose);
assert.ok(headerWeights.headerDrive > 0.98 && headerWeights.headerBrace > 0, 'le coup de tête engage le buste et ouvre les bras');

const tackleStartPose = getPlayer3DPose({ slideT: 0.38, slideDuration: 0.38 });
const tackleMidPose = getPlayer3DPose({ slideT: 0.19, slideDuration: 0.38 });
const tackleEndPose = getPlayer3DPose({ slideT: 0.015, slideDuration: 0.38 });
const tackleStartWeights = getPlayer3DActionWeights(tackleStartPose);
const tackleMidWeights = getPlayer3DActionWeights(tackleMidPose);
const tackleEndWeights = getPlayer3DActionWeights(tackleEndPose);
assert.equal(tackleStartWeights.slideLunge, 0, 'le tacle débute avant la pleine extension');
assert.ok(tackleMidWeights.slideLunge > 0.98 && tackleMidWeights.tackleReach > 0.8, 'le tacle atteint sa phase d extension');
assert.ok(tackleMidWeights.tackleArmSpread > 0.4, 'les bras s ouvrent pour stabiliser le tacle glissé');
assert.ok(tackleEndWeights.tackleRecovery > 0.8, 'le tacle passe en récupération avant de se relever');
const idleWeights=getPlayer3DActionWeights(getPlayer3DPose({ x:0, y:0, slideT:0 }));
assert.equal(idleWeights.tackleReach, 0, 'un joueur au repos ne garde aucune extension de tacle');
assert.equal(idleWeights.tackleArmSpread, 0, 'les bras ne restent pas écartés hors du tacle');
const diveStartWeights=getPlayer3DActionWeights(getPlayer3DPose({ isGK:true, x:0, y:0, diveT:0.52, diveDir:-1 }));
assert.ok(diveStartWeights.diveLaunch > 0.98, 'le plongeon commence par une impulsion lisible');

const touchPose = getPlayer3DPose({ firstTouchT: 0.16, firstTouchDir: -1 });
const touchWeights = getPlayer3DActionWeights(touchPose);
assert.ok(touchWeights.firstTouchAbsorb > 0.85, 'la première touche amortit le ballon avec un mouvement orienté');
const strikingMesh = getPlayer3DModelStats(modelMatch, {
  ...modelPlayer, kickT: 0.05, kickStyle: 'shot', kickPower: 0.92,
  headerT: 0, firstTouchT: 0, slideT: 0,
}, 'high');
assert.ok(strikingMesh.vertexCount > 500 && strikingMesh.finite, 'la pose de frappe conserve un maillage complet et valide');
console.log('3D ACTION PHASES OK — préparation/frappe/suivi, contrôle orienté, tête et tacle articulé');
console.log('3D ACTION POSES OK — première touche, contacts, frappes, prise et plongeon du gardien');


// L'ombre du ballon doit s'élargir et perdre en intensité avec la hauteur.
const groundShadow = get3DBallShadowProfile(0);
const aerialShadow = get3DBallShadowProfile(8);
assert.equal(groundShadow.radiusX, 0.27);
assert.equal(groundShadow.radiusZ, 0.16);
assert.ok(aerialShadow.radiusX > groundShadow.radiusX, 'l ombre s élargit quand le ballon monte');
assert.ok(aerialShadow.radiusZ > groundShadow.radiusZ, 'l ombre s étale sur la pelouse');
assert.ok(aerialShadow.opacity < groundShadow.opacity, 'l ombre devient moins dense en hauteur');
assert.ok([groundShadow, aerialShadow].every(p => Object.values(p).every(Number.isFinite)), 'le profil d ombre reste fini');

// Une partie du public anime ses bras ; le mouvement est déterministe et borné.
const crowdStill = get3DCrowdMotionPose(0, 3, 1);
const crowdLater = get3DCrowdMotionPose(0.7, 3, 1);
const crowdGoal = get3DCrowdMotionPose(0.7, 3, 1.28);
assert.notEqual(crowdStill.armLift, crowdLater.armLift, 'les bras évoluent pendant le match');
assert.ok(crowdGoal.armLift >= crowdLater.armLift || crowdGoal.armLift === 0.88, 'un but accentue la réaction des supporters');
assert.ok([crowdStill, crowdLater, crowdGoal].every(p =>
  p.armLift >= 0.12 && p.armLift <= 0.88 &&
  Math.abs(p.armSwing) <= 0.18 && Math.abs(p.sway) <= 0.09 &&
  Object.values(p).every(Number.isFinite)), 'les gestes du public restent bornés et finis');
assert.deepEqual(get3DCrowdMotionPose(0.7, 3, 1), crowdLater, 'les animations du public sont reproductibles');
console.log('BALL SHADOW + CROWD OK — ombre aérienne progressive et supporters animés');

// Le maillage reste valide pendant une première touche, une tête et un contact.
const actionPlayer = {
  ...modelPlayer,
  firstTouchT: 0.16,
  firstTouchDir: -1,
  headerT: 0.22,
  headerDir: 1,
  contactT: 0.16,
  contactDir: -1,
  stumbleT: 0.1,
  stumbleDir: 1,
};
const actionPlayerMesh = getPlayer3DModelStats(modelMatch, actionPlayer, 'high');
assert.ok(actionPlayerMesh.vertexCount > 500, 'les poses d action gardent un maillage complet');
assert.equal(actionPlayerMesh.finite, true, 'les poses d action ne génèrent aucune coordonnée invalide');
const divingKeeperMesh = getPlayer3DModelStats(modelMatch, {
  ...modelPlayer,
  isGK: true,
  diveT: 0.26,
  diveDir: -1,
  diveHeight: 0.72,
  diveStretch: 0.84,
  keeperCatchT: 0.24,
}, 'high');
assert.equal(divingKeeperMesh.finite, true, 'le plongeon du gardien garde un maillage fini');
console.log('3D ACTION MESH OK — corps orienté sur première touche, tête, contact et plongeon gardien');

// Foule 3D : des milliers de supporters animés par le GPU, densité adaptée à la qualité.
{
  const teams = [{ kit: { shirt: '#c8102e', trim: '#ffd200' } }, { kit: { shirt: '#ffffff', trim: '#d40000' } }];
  const lo = get3DStadiumMeshStats({ teams }, 'low'), me = get3DStadiumMeshStats({ teams }, 'medium'), hi = get3DStadiumMeshStats({ teams }, 'high');
  assert.ok(lo.fans < me.fans && me.fans < hi.fans, 'plus de supporters en qualité supérieure');
  assert.ok(hi.fans > 5000, 'stade plein en qualité haute : ' + hi.fans);
  assert.ok(hi.animatedVertices >= hi.fans * 12, 'chaque supporter est animé par le shader');
  assert.ok(hi.vertexCount < 400000, 'budget de sommets du stade respecté : ' + hi.vertexCount);
  assert.deepEqual(hi.features, { walkoutTunnel: true, broadcastCameraRigs: 4, tunnelClubCrest: true, detailedCameraLenses: 4, scoreboardFrame: true, scoreboardStatusLamps: 6 }, 'le tunnel, les caméras et le tableau central sont détaillés');
  console.log(`3D CROWD OK — ${lo.fans} / ${me.fans} / ${hi.fans} supporters animés (bas / moyen / haut), ${hi.vertexCount} sommets`);
}


{
  const { getPlayer3DPose: P, getPlayer3DActionWeights: W, playerLook } = await import('../public/js/renderer3d.js');
  const rest = W(P({ x: 0, y: 0, vx: 0, vy: 0, kickT: 0 }));
  assert.equal(rest.kickFollowThrough, 0, 'au repos, aucune jambe ne reste tendue (bug du grand écart)');
  const mid = W(P({ kickT: 0.12 }));
  assert.ok(mid.kickFollowThrough > 0.5, 'le suivi de frappe reste visible juste après le contact');
  const styles = new Set(Array.from({ length: 40 }, (_, i) => playerLook({ name: 'Joueur ' + i, id: i }, i).style));
  assert.ok(styles.size >= 5, 'coiffures variées dans un effectif');
  console.log('3D PLAYER LOOK OK — repos sans grand écart, ' + styles.size + ' coiffures');
}

{
  const { buildReplayPlan } = await import('../public/js/match.js');
  const { get3DCameraPose: cam } = await import('../public/js/renderer3d.js');
  const frames = Array.from({ length: 130 }, (_, k) => ({ b: [20 + k * 0.25, 2, 0.4], p: [] }));
  const plan = buildReplayPlan(frames, 1);
  assert.equal(plan.segs.length, 3, 'trois angles de ralenti');
  assert.equal(plan.goalSide, 1, 'but côté droit détecté');
  for (let s = 0; s < 3; s++) {
    plan.seg = s; plan.i = plan.segs[s].from;
    const pose = cam({ replay: plan, cam: { x: 0, y: 0 }, ball: { x: 0, y: 0, z: 0 } }, frames[plan.i], 16 / 9);
    assert.ok(pose.eye.every(Number.isFinite) && pose.target.every(Number.isFinite), 'caméra finie ' + s);
    if (s === 1) assert.ok(pose.eye[0] > 54 && pose.eye[1] < 8, 'caméra derrière le but');
    if (s === 2) assert.ok(pose.distance < 16, 'caméra rapprochée proche du ballon');
  }
  console.log('REPLAY TV OK — 3 angles (principale, derrière le but, rapprochée)');
}

{
  const { getOfficialTargets } = await import('../public/js/renderer3d.js');
  const mk = (xs, dir) => ({ dir, ps: xs.map(x => ({ x, y: 0 })) });
  const m = { ball: { x: 20, y: 10 }, teams: [mk([-50, -30, -20, -10], 1), mk([48, 30, 18, 25], -1)] };
  const t = getOfficialTargets(m);
  assert.equal(t.ar1.x, 30, 'le juge de ligne suit l avant-dernier défenseur de sa moitié');
  assert.ok(t.ar1.y < -34 && t.ar2.y > 34, 'juges de ligne hors du terrain, un de chaque côté');
  assert.ok(Math.hypot(t.ref.x - 20, t.ref.y - 10) > 8, 'l arbitre garde ses distances avec le ballon');
  console.log('OFFICIALS OK — arbitre en diagonale, juges de ligne sur la ligne de hors-jeu');
}

{
  const { ballPanelColor } = await import('../public/js/renderer3d.js');
  let dark = 0, n = 0;
  for (let i = 0; i < 4000; i++) { const z = 2 * ((i + 0.5) / 4000) - 1, a = i * 2.39996, r = Math.sqrt(1 - z * z); const c = ballPanelColor([r * Math.cos(a), z, r * Math.sin(a)]); n++; if (c[0] < 0.2) dark++; }
  const share = dark / n;
  assert.ok(share > 0.08 && share < 0.3, 'ballon : environ 1/6 de la surface en panneaux sombres (' + share.toFixed(2) + ')');
  console.log('BALL PANELS OK — 12 pentagones, ' + Math.round(share * 100) + ' % de surface sombre');
}
