// Converts the creator's helicopter (military_helicopter_3d_model.glb: one untextured mesh, nose
// toward +Z, rotor hub near the top centre) into the gun drone's model (2026-11-12):
//  - drops the main rotor blades (the game spins a blurred rotor disc in their place),
//  - paints it with vertex colours (olive body, gunmetal skids and pods, dark cockpit glass, black
//    hub, a hazard stripe on the tail),
//  - simplifies it to --tris triangles and writes glTF JSON with the geometry embedded.
// usage: node drone-convert.mjs <in.glb> <out.json> [--tris 2500]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, prune, dedup } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import fs from 'fs';

const args = process.argv.slice(2);
const ti = args.indexOf('--tris'); const TRIS = ti >= 0 ? +args.splice(ti, 2)[1] : 2500;
const [inFile, outFile] = args;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inFile);
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const P = prim.getAttribute('POSITION'), I = prim.getIndices(), v = [0, 0, 0];
const HUB = [0.035, 0.03], BLADE_Y = 0.485, HUB_R = 0.11;
// 1. drop the rotor blades: triangles high up and away from the hub
const ia = I.getArray(), keep = [];
for (let t = 0; t < ia.length; t += 3) {
  let cy = 0, cx = 0, cz = 0;
  for (let k = 0; k < 3; k++) { P.getElement(ia[t + k], v); cx += v[0] / 3; cy += v[1] / 3; cz += v[2] / 3; }
  if (cy > BLADE_Y && Math.hypot(cx - HUB[0], cz - HUB[1]) > HUB_R) continue;
  keep.push(ia[t], ia[t + 1], ia[t + 2]);
}
prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(keep)).setBuffer(I.getBuffer()));
// 2. paint
const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255].map((c) => Math.pow(c, 2.2));
const OLIVE = hex(0x56603e), OLIVE_D = hex(0x3c4430), GUN = hex(0x2c2e33), GLASS = hex(0x14202c), HUBC = hex(0x161618), STRIPE_A = hex(0xe8c020), STRIPE_B = hex(0x1a1a1a);
const col = new Float32Array(P.getCount() * 3);
for (let i = 0; i < P.getCount(); i++) {
  P.getElement(i, v); const [x, y, z] = v;
  let c = y > 0.3 ? OLIVE : OLIVE_D;
  if (y < 0.1) c = GUN; // skids, pods
  if (Math.abs(x) > 0.18 && y < 0.2) c = GUN; // weapon pods out to the sides
  if (z > 0.22 && y > 0.17 && y < 0.36 && Math.abs(x) < 0.16) c = GLASS; // cockpit
  if (y > 0.42 && Math.hypot(x - HUB[0], z - HUB[1]) < HUB_R) c = HUBC;
  if (z < -0.28 && z > -0.36 && y > 0.15) c = Math.floor((x + y) * 30) % 2 ? STRIPE_A : STRIPE_B; // tail stripe
  col.set(c, i * 3);
}
prim.setAttribute('COLOR_0', doc.createAccessor().setType('VEC3').setArray(col).setBuffer(P.getBuffer()));
const mat = prim.getMaterial(); mat.setBaseColorFactor([1, 1, 1, 1]).setDoubleSided(true).setName('Drone');
// 3. simplify
await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: TRIS / (keep.length / 3), error: 0.01 }), prune(), dedup());
console.log('triangles', keep.length / 3, '->', prim.getIndices().getCount() / 3);
const j = await io.writeJSON(doc);
for (const b of j.json.buffers) { const name = b.uri; b.uri = 'data:application/octet-stream;base64,' + Buffer.from(j.resources[name]).toString('base64'); }
fs.writeFileSync(outFile, JSON.stringify(j.json));
console.log(outFile, fs.statSync(outFile).size);
