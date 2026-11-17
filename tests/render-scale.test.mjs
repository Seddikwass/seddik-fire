import assert from 'node:assert/strict';
import { getRenderDpr, getBallRotation } from '../public/js/match.js';

assert.equal(getRenderDpr('low', { pixelRatio: 3 }), 1, 'qualité basse : ratio plafonné à 1');
assert.equal(getRenderDpr('medium', { pixelRatio: 3 }), 1.5, 'qualité moyenne : ratio plafonné à 1,5');
assert.equal(getRenderDpr('high', { pixelRatio: 3 }), 2, 'qualité haute : ratio plafonné à 2');
assert.equal(getRenderDpr('high', { pixelRatio: 3, deviceMemory: 3, hardwareConcurrency: 8 }), 1.25, 'appareil avec 3 Go : rendu allégé');
assert.equal(getRenderDpr('high', { pixelRatio: 3, deviceMemory: 8, hardwareConcurrency: 4 }), 1.25, 'appareil avec 4 cœurs : rendu allégé');
assert.equal(getRenderDpr('high', { pixelRatio: 3, deviceMemory: 4, hardwareConcurrency: 8 }), 1.5, 'appareil avec 4 Go : ratio modéré');
assert.equal(getRenderDpr('high', { pixelRatio: 1.25, deviceMemory: 8, hardwareConcurrency: 8 }), 1.25, 'respecte le ratio natif disponible');

console.log('RENDER SCALE OK — qualité et adaptation aux capacités matérielles');

assert.equal(getBallRotation(0.5, 2, 10), 5.35, 'rotation calculée à partir du temps de match');
assert.equal(getBallRotation(0.5, 2, 10), getBallRotation(0.5, 2, 10), 'une même image de replay garde exactement la même rotation');
assert.equal(getBallRotation(0.5, 0, 10), 0.35, 'la rotation se fige proprement au temps zéro');
assert.equal(getBallRotation(Number.NaN, Number.NaN, Number.NaN), 0, 'les valeurs invalides ne contaminent pas le rendu');

console.log('REPLAY ROTATION OK — orientation déterministe et indépendante de l horloge système');
