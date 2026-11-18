import assert from 'node:assert/strict';
import { getRenderDpr, getBallRotation, getMatchHudLayout, shouldReduceRenderDetail, canRestoreRenderDetail, getTurfTextureConfig, getBallShadowMetrics, getCameraFollow } from '../public/js/match.js';

assert.equal(getRenderDpr('low', { pixelRatio: 3 }), 1, 'qualité basse : ratio plafonné à 1');
assert.equal(getRenderDpr('medium', { pixelRatio: 3 }), 1.5, 'qualité moyenne : ratio plafonné à 1,5');
assert.equal(getRenderDpr('high', { pixelRatio: 3 }), 2, 'qualité haute : ratio plafonné à 2');
assert.equal(getRenderDpr('high', { pixelRatio: 3, deviceMemory: 3, hardwareConcurrency: 8 }), 1.25, 'appareil avec 3 Go : rendu allégé');
assert.equal(getRenderDpr('high', { pixelRatio: 3, deviceMemory: 8, hardwareConcurrency: 4 }), 1.25, 'appareil avec 4 cœurs : rendu allégé');
assert.equal(getRenderDpr('high', { pixelRatio: 3, deviceMemory: 4, hardwareConcurrency: 8 }), 1.5, 'appareil avec 4 Go : ratio modéré');
assert.equal(getRenderDpr('high', { pixelRatio: 1.25, deviceMemory: 8, hardwareConcurrency: 8 }), 1.25, 'respecte le ratio natif disponible');

console.log('RENDER SCALE OK — qualité et adaptation aux capacités matérielles');

assert.ok(Math.abs(getBallRotation(0.5, 2, 10) - 5.35) < 1e-12, 'rotation calculée à partir du temps de match');
assert.equal(getBallRotation(0.5, 2, 10), getBallRotation(0.5, 2, 10), 'une même image de replay garde exactement la même rotation');
assert.ok(Math.abs(getBallRotation(0.5, 0, 10) - 0.35) < 1e-12, 'la rotation se fige proprement au temps zéro');
assert.equal(getBallRotation(Number.NaN, Number.NaN, Number.NaN), 0, 'les valeurs invalides ne contaminent pas le rendu');

console.log('REPLAY ROTATION OK — orientation déterministe et indépendante de l horloge système');

const mobileHud = getMatchHudLayout(780, 2);
assert.equal(mobileHud.compact, true, 'un téléphone paysage reste en tableau de score compact');
assert.equal(mobileHud.statsWidth, 0, 'les statistiques ne recouvrent pas le terrain sur petit écran');
assert.ok(mobileHud.panelWidth < 780, 'le panneau de score tient sur un écran mobile');
const desktopHud = getMatchHudLayout(1600, 2);
assert.equal(desktopHud.compact, false, 'un écran large affiche le centre de match');
assert.ok(desktopHud.statsWidth > 0 && desktopHud.statsHeight > 0, 'les statistiques sont disponibles sur grand écran');
assert.ok(desktopHud.panelWidth + desktopHud.statsWidth < 1600, 'score et statistiques ne se chevauchent pas sur grand écran');
assert.equal(getMatchHudLayout(0, 0).compact, false, 'les paramètres invalides utilisent une mise en page sûre');

console.log('BROADCAST HUD OK — scoreboard adaptatif et statistiques sans chevauchement');

assert.equal(shouldReduceRenderDetail(25, 60), true, 'une moyenne inférieure à 40 FPS déclenche le détail réduit');
assert.equal(shouldReduceRenderDetail(20, 60), false, 'un rendu fluide ne déclenche pas le détail réduit');
assert.equal(shouldReduceRenderDetail(45, 30), false, 'une cible volontaire à 30 FPS ne déclenche pas de réduction');
assert.equal(shouldReduceRenderDetail(48, 30), true, 'un rendu inférieur à la cible 30 FPS réduit les effets');
assert.equal(canRestoreRenderDetail(18, 60), true, 'les détails reviennent lorsque la cadence est stable');
assert.equal(canRestoreRenderDetail(22, 60), false, 'les détails ne reviennent pas pendant une baisse persistante');
assert.equal(canRestoreRenderDetail(35, 30), true, 'restauration correcte en mode 30 FPS');

console.log('ADAPTIVE DETAIL OK — baisse des effets sous charge et restauration avec marge');


const lowTurf = getTurfTextureConfig('low');
const mediumTurf = getTurfTextureConfig('medium');
const highTurf = getTurfTextureConfig('high');
assert.equal(lowTurf.size, 0, 'la qualité basse évite la texture coûteuse');
assert.equal(mediumTurf.size, 256, 'la qualité moyenne utilise la texture détaillée');
assert.ok(highTurf.blades > mediumTurf.blades, 'la qualité haute augmente la densité des brins');
assert.ok(highTurf.flecks > mediumTurf.flecks, 'la qualité haute enrichit les micro-détails');
assert.ok(highTurf.alpha > mediumTurf.alpha, 'le détail de la pelouse reste discret en qualité moyenne');

const groundedShadow = getBallShadowMetrics(0);
const aerialShadow = getBallShadowMetrics(7);
assert.ok(aerialShadow.opacity < groundedShadow.opacity, 'l ombre du ballon s atténue avec la hauteur');
assert.ok(aerialShadow.spread > groundedShadow.spread, 'l ombre s élargit lorsque le ballon monte');
assert.ok(Number.isFinite(getBallShadowMetrics(Number.NaN).opacity), 'les valeurs invalides gardent une ombre sûre');

console.log('MATCH MATERIALS OK — gazon multi-densité et ombre du ballon en hauteur');


const openPlayCamera = getCameraFollow({ x: 4, y: 18, vx: 0, vy: 0 });
const attackCamera = getCameraFollow({ x: 42, y: 1, vx: 16, vy: 0, inFlightShot: {} });
assert.ok(attackCamera.x > 42, 'la caméra anticipe légèrement un ballon rapide');
assert.ok(attackCamera.zoom > openPlayCamera.zoom, 'la caméra resserre le cadre dans une phase offensive');
assert.ok(attackCamera.zoom <= 1.09, 'le zoom reste plafonné pour préserver la lisibilité');
assert.equal(getCameraFollow({ x: 42, y: 1, vx: 16, vy: 0 }, true).zoom, 1, 'un replay conserve son cadrage dédié');

console.log('CAMERA FOLLOW OK — anticipation du ballon et zoom d action progressif');
