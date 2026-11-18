import assert from 'node:assert/strict';
import { getRenderDpr, getBallRotation, getMatchHudLayout, shouldReduceRenderDetail, canRestoreRenderDetail } from '../public/js/match.js';

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
