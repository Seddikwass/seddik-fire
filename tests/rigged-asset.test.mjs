import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetPath = path.join(root, 'public/assets/players/rigged/player.glb');
const licensePath = path.join(root, 'public/assets/players/rigged/LICENSE-quaternius.txt');
const bytes = fs.readFileSync(assetPath);

assert.equal(bytes.toString('ascii', 0, 4), 'glTF', 'GLB magic header');
assert.equal(bytes.readUInt32LE(4), 2, 'GLB version 2');
assert.equal(bytes.readUInt32LE(8), bytes.length, 'GLB declared length matches file');
let offset = 12, document = null;
while (offset < bytes.length) {
  const length = bytes.readUInt32LE(offset);
  const type = bytes.readUInt32LE(offset + 4);
  offset += 8;
  assert.ok(offset + length <= bytes.length, 'GLB chunk stays within file');
  if (type === 0x4E4F534A) document = JSON.parse(bytes.toString('utf8', offset, offset + length).trim());
  offset += length;
}
assert.ok(document, 'GLB contains a JSON chunk');
assert.ok(Array.isArray(document.meshes) && document.meshes.length, 'GLB contains a mesh');
assert.ok(Array.isArray(document.skins) && document.skins.length, 'GLB contains a rigged skin');
assert.ok(Array.isArray(document.animations) && document.animations.length >= 1, 'GLB contains animation clips');
assert.ok(Array.isArray(document.nodes) && document.nodes.length, 'GLB contains nodes');
const license = fs.readFileSync(licensePath, 'utf8');
assert.match(license, /CC0 1\.0 Universal/i, 'asset license is documented as CC0');
console.log('OK — rigged GLB structure, skin, animation clips and CC0 license verified');
