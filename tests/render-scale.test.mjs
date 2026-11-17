import assert from 'node:assert/strict';
import { getRenderDpr } from '../public/js/match.js';

assert.equal(getRenderDpr('low', { pixelRatio: 3 }), 1, 'qualité basse : ratio plafonné à 1');
assert.equal(getRenderDpr('medium', { pixelRatio: 3 }), 1.5, 'qualité moyenne : ratio plafonné à 1,5');
assert.equal(getRenderDpr('high', { pixelRatio: 3 }), 2, 'qualité haute : ratio plafonné à 2');
assert.equal(getRenderDpr('high', { pixelRatio: 3, deviceMemory: 3, hardwareConcurrency: 8 }), 1.25, 'appareil avec 3 Go : rendu allégé');
assert.equal(getRenderDpr('high', { pixelRatio: 3, deviceMemory: 8, hardwareConcurrency: 4 }), 1.25, 'appareil avec 4 cœurs : rendu allégé');
assert.equal(getRenderDpr('high', { pixelRatio: 3, deviceMemory: 4, hardwareConcurrency: 8 }), 1.5, 'appareil avec 4 Go : ratio modéré');
assert.equal(getRenderDpr('high', { pixelRatio: 1.25, deviceMemory: 8, hardwareConcurrency: 8 }), 1.25, 'respecte le ratio natif disponible');

console.log('RENDER SCALE OK — qualité et adaptation aux capacités matérielles');
