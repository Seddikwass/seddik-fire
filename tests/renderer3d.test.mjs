import assert from 'node:assert/strict';
import { get3DQualityProfile, getPlayer3DPose, get3DStadiumMeshStats } from '../public/js/renderer3d.js';

const low = get3DQualityProfile('low');
const medium = get3DQualityProfile('medium');
const high = get3DQualityProfile('high');
assert.ok(low.pixelRatio <= medium.pixelRatio && medium.pixelRatio <= high.pixelRatio,
  'le ratio de pixels progresse avec la qualité');
assert.ok(low.crowd < medium.crowd && medium.crowd < high.crowd,
  'la densité du public s adapte au niveau graphique');
assert.ok(low.sphereSegments < medium.sphereSegments && medium.sphereSegments < high.sphereSegments,
  'les détails géométriques suivent la qualité');
assert.equal(get3DQualityProfile('unknown').detail, 2, 'le profil par défaut reste haut');

const runner = getPlayer3DPose({
  x: 12, y: -4, vx: 3, vy: 4, heading: 0.93, anim: 2,
  slideT: 0, diveT: 0, jumpT: 0, kickT: 0, headerT: 0,
});
assert.equal(runner.x, 12);
assert.equal(runner.y, -4);
assert.equal(runner.speed, 5, 'la vitesse est calculée dans le plan du terrain');
assert.equal(runner.heading, 0.93, 'l orientation du modèle suit celle du moteur');
assert.ok(runner.lean > 0, 'la course crée une légère inclinaison du buste');
assert.equal(runner.slide, 0);
assert.equal(runner.dive, 0);

const sliding = getPlayer3DPose({ x: 0, y: 0, slideT: 0.19, slideDuration: 0.38, diveT: 0.26, jumpT: 0.1 });
assert.ok(sliding.slide > 0.45 && sliding.slide < 0.55, 'le tacle anime une descente du corps');
assert.ok(sliding.dive > 0.45 && sliding.dive < 0.55, 'le plongeon du gardien est normalisé');
assert.ok(sliding.jump > 0, 'le saut est transmis au modèle 3D');

const replayFrame = Array(27).fill(0);
replayFrame[0] = -8; replayFrame[1] = 5; replayFrame[3] = 7;
replayFrame[4] = -2; replayFrame[5] = 6; replayFrame[26] = -1.2;
const replayPose = getPlayer3DPose({ x: 100, y: 100 }, replayFrame);
assert.equal(replayPose.x, -8, 'le modèle 3D lit la position du ralenti');
assert.equal(replayPose.y, 5);
assert.equal(replayPose.speed, Math.hypot(-2, 6));
assert.equal(replayPose.heading, -1.2, 'le ralenti conserve l orientation enregistrée');

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
