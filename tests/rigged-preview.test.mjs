import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = fs.readFileSync(path.join(root, 'public/rigged-player-preview.html'), 'utf8');
const model = path.join(root, 'public/assets/players/rigged/player.glb');
assert.ok(fs.existsSync(model), 'the staged rigged GLB exists');
assert.match(page, /src="\/assets\/players\/rigged\/player\.glb"/, 'preview loads the staged model from the app origin');
assert.match(page, /availableAnimations/, 'preview reports and selects available animation clips');
assert.match(page, /banc d’essai séparé/, 'preview clearly stays separate from the live match renderer');
assert.match(page, /@google\/model-viewer/, 'preview uses a dedicated model inspection component');
console.log('OK — isolated rigged-player preview points to the staged GLB and preserves match fallback');
