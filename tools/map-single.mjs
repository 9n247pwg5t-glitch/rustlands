// Converts a single-mesh stage map (one textured mesh, e.g. an AI-generated scene with its lighting
// baked into the texture; the 2026-11-12 clown_map_1.glb) for the game:
//  - scales it to metres and puts the yard's ground at y = 0 (--scale, --ground: the model's ground
//    height in its own units),
//  - squashes the wrestling ring's height (--ring x0,z0,x1,z1 in model units, --ringK factor) so a
//    body can step up into it, and flattens anything standing on the mat inside a circle
//    (--clear x,z,r in model units, and the --clearRect x0,z0,x1,z1 strip) to the mat, repainting it
//    with the mat's own texture from just outside (each flattened vertex takes the texture coordinate
//    of the mat vertex nearest its mirror image across the edge),
//  - simplifies the mesh to --tris triangles, keeps only the colour texture (as WebP, --tex px),
//    packs the geometry with meshopt and writes glTF JSON plus the texture.
// Gameplay data (ground heights, colliders, spawn points) comes from js/map-single.js's height bake.
// usage: node map-single.mjs <in.glb> <out dir> <name> --scale 70 --ground -0.0839
//          --ring -0.064,-0.083,0.087,0.059 --ringK 0.42 --clear 0.021,-0.016,0.024 --tris 160000 --tex 2048
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, meshopt, weld, simplify, unpartition } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const SCALE = +opt('--scale', 70), GROUND = +opt('--ground', 0), TRIS = +opt('--tris', 160000), TEX = +opt('--tex', 2048);
const RING = opt('--ring', null), RINGK = +opt('--ringK', 1), CLEAR = opt('--clear', null), CLEARR = opt('--clearRect', null);
const [inFile, outDir, name] = args;
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
fs.mkdirSync(outDir, { recursive: true });
const doc = await io.read(inFile);
const root = doc.getRoot();
for (const e of root.listExtensionsUsed()) if (/quantization|meshopt/.test(e.extensionName)) e.dispose();

const PAINT = { tris: [], src: [] };
const ring = RING && RING.split(',').map(Number), clear = CLEAR && CLEAR.split(',').map(Number), clearR = CLEARR && CLEARR.split(',').map(Number);
const inCircle = (x, z) => clear && Math.hypot(x - clear[0], z - clear[1]) < clear[2];
const inStrip = (x, z) => clearR && x > clearR[0] && x < clearR[2] && z > clearR[1] && z < clearR[3];
// where to take the mat texture from for a point inside a cleared zone (just outside it)
function mirror(x, z) {
  if (inCircle(x, z)) { const d = Math.hypot(x - clear[0], z - clear[1]) || 1e-6, k = (2 * clear[2] - d + 0.004) / d; let mx = clear[0] + (x - clear[0]) * k, mz = clear[1] + (z - clear[1]) * k; if (inStrip(mx, mz)) mx += clearR[2] - clearR[0]; return [mx, mz]; }
  const mid = (clearR[0] + clearR[2]) / 2, w = clearR[2] - clearR[0];
  return [x < mid ? clearR[0] - (x - clearR[0]) - 0.003 - w * 0.3 : clearR[2] + (clearR[2] - x) + 0.003 + w * 0.3, z];
}
// bake every node's transform into its mesh, then scale/shift/squash the vertices
for (const node of root.listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue;
  const M = node.getWorldMatrix();
  for (const prim of mesh.listPrimitives()) {
    const P = prim.getAttribute('POSITION');
    const out = new Float32Array(P.getCount() * 3);
    const v = [0, 0, 0];
    // the mat's height inside the ring (for flattening): the median of the vertices near the centre
    let matY = null;
    if (ring && clear) {
      const ys = [];
      for (let i = 0; i < P.getCount(); i++) {
        P.getElement(i, v);
        const x = M[0] * v[0] + M[4] * v[1] + M[8] * v[2] + M[12], y = M[1] * v[0] + M[5] * v[1] + M[9] * v[2] + M[13], z = M[2] * v[0] + M[6] * v[1] + M[10] * v[2] + M[14];
        const d = Math.hypot(x - clear[0], z - clear[1]);
        if (d > clear[2] * 1.15 && d < clear[2] * 1.9 && x > ring[0] && x < ring[2] && z > ring[1] && z < ring[3]) ys.push(y);
      }
      ys.sort((a, b) => a - b); matY = ys[Math.floor(ys.length * 0.5)];
      console.log('mat height (model units)', matY, 'from', ys.length, 'vertices');
    }
    let flattened = 0;
    for (let i = 0; i < P.getCount(); i++) {
      P.getElement(i, v);
      const x = M[0] * v[0] + M[4] * v[1] + M[8] * v[2] + M[12];
      let y = M[1] * v[0] + M[5] * v[1] + M[9] * v[2] + M[13];
      const z = M[2] * v[0] + M[6] * v[1] + M[10] * v[2] + M[14];
      if ((inCircle(x, z) || inStrip(x, z)) && y > matY) { y = matY; flattened++; }
      let Y = (y - GROUND) * SCALE;
      if (ring && x > ring[0] && x < ring[2] && z > ring[1] && z < ring[3] && Y > 0) Y *= RINGK;
      out[i * 3] = x * SCALE; out[i * 3 + 1] = Y; out[i * 3 + 2] = z * SCALE;
    }
    if (clear) console.log('flattened', flattened, 'vertices');
    // remember, for repainting the texture: the cleared zones' upward triangles (their own patches of
    // the texture) and texels of the mat around them (the colours to paint with)
    const UV = prim.getAttribute('TEXCOORD_0');
    if (UV && (clear || clearR)) {
      const ia = prim.getIndices().getArray(), t = [0, 0];
      const matYw = (matY - GROUND) * SCALE * (ring ? RINGK : 1);
      for (let k = 0; k < ia.length; k += 3) {
        const a = ia[k], b = ia[k + 1], c = ia[k + 2];
        const cx = (out[a * 3] + out[b * 3] + out[c * 3]) / 3 / SCALE, cz = (out[a * 3 + 2] + out[b * 3 + 2] + out[c * 3 + 2]) / 3 / SCALE;
        if (inCircle(cx, cz) || inStrip(cx, cz)) PAINT.tris.push([a, b, c].map((v) => (UV.getElement(v, t), [t[0], t[1]])));
      }
      for (let v = 0; v < P.getCount(); v++) {
        const x = out[v * 3] / SCALE, z = out[v * 3 + 2] / SCALE;
        if (inCircle(x, z) || inStrip(x, z) || Math.abs(out[v * 3 + 1] - matYw) > 0.06 || Math.hypot(x - clear[0], z - clear[1]) > clear[2] * 2.2) continue;
        UV.getElement(v, t); PAINT.src.push([t[0], t[1]]);
      }
      console.log('texture patches to repaint', PAINT.tris.length, 'mat samples', PAINT.src.length);
    }
    // the flattened object's underside now lies on the mat facing down (black in flat shading): drop
    // every triangle in the cleared zones that faces down
    if (clear || clearR) {
      const I = prim.getIndices(), ia = I.getArray(), keep = [];
      for (let t = 0; t < ia.length; t += 3) {
        const a = ia[t], b = ia[t + 1], c = ia[t + 2];
        const cx = (out[a * 3] + out[b * 3] + out[c * 3]) / 3 / SCALE, cz = (out[a * 3 + 2] + out[b * 3 + 2] + out[c * 3 + 2]) / 3 / SCALE;
        if (inCircle(cx, cz) || inStrip(cx, cz)) {
          const ux = out[b * 3] - out[a * 3], uz = out[b * 3 + 2] - out[a * 3 + 2], vx = out[c * 3] - out[a * 3], vz = out[c * 3 + 2] - out[a * 3 + 2];
          if (uz * vx - ux * vz <= 0) continue; // its normal's y (n = u x v) points down (or it's edge-on)
        }
        keep.push(a, b, c);
      }
      console.log('dropped', ia.length / 3 - keep.length / 3, 'down-facing triangles');
      prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(keep)).setBuffer(P.getBuffer()));
    }
    const acc = doc.createAccessor().setType('VEC3').setArray(out).setBuffer(P.getBuffer());
    prim.setAttribute('POSITION', acc);
    prim.setAttribute('NORMAL', null); prim.setAttribute('TANGENT', null);
  }
  node.setMatrix([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}
// only the colour texture: the lighting is baked into it, and normal/ORM maps cost a lot on phones
for (const m of root.listMaterials()) { m.setNormalTexture(null); m.setOcclusionTexture(null); m.setMetallicRoughnessTexture(null); m.setMetallicFactor(0); m.setRoughnessFactor(1); }
await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 1, error: 0.0001 }));
let tris = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tris += p.getIndices().getCount() / 3;
const ratio = Math.min(1, TRIS / tris);
console.log('triangles', tris, '-> ratio', ratio.toFixed(4));
await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.02, lockBorder: false }), prune(), dedup());
tris = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tris += p.getIndices().getCount() / 3;
console.log('after simplify', tris);
// repaint the cleared object's patches of the colour texture with the mat's colours (mottled)
const baseTex = root.listMaterials()[0] && root.listMaterials()[0].getBaseColorTexture();
if (baseTex && PAINT.tris.length) {
  const img = sharp(Buffer.from(baseTex.getImage()));
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, px = (u, v) => [Math.min(W - 1, Math.max(0, Math.floor(u * W))), Math.min(H - 1, Math.max(0, Math.floor(v * H)))];
  const cols = PAINT.src.map(([u, v]) => { const [x, y] = px(u, v), o = (y * W + x) * 4; return [data[o], data[o + 1], data[o + 2]]; });
  cols.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  const mid = cols.slice(Math.floor(cols.length * 0.2), Math.floor(cols.length * 0.8)); // drop the darkest and brightest
  // the mat's average colour turned into dried blood (dark red), so the patch reads as a stain
  const avg = [0, 1, 2].map((k) => mid.reduce((t, c) => t + c[k], 0) / mid.length * [0.62, 0.22, 0.22][k]);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let painted = 0;
  for (const tri of PAINT.tris) {
    const P3 = tri.map(([u, v]) => [u * W, v * H]);
    const minX = Math.max(0, Math.floor(Math.min(...P3.map((p) => p[0]))) - 1), maxX = Math.min(W - 1, Math.ceil(Math.max(...P3.map((p) => p[0]))) + 1);
    const minY = Math.max(0, Math.floor(Math.min(...P3.map((p) => p[1]))) - 1), maxY = Math.min(H - 1, Math.ceil(Math.max(...P3.map((p) => p[1]))) + 1);
    if ((maxX - minX) * (maxY - minY) > 400000) continue;
    const [A, B, C] = P3, area = (B[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (B[1] - A[1]);
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const qx = x + 0.5, qy = y + 0.5;
      const w0 = ((B[0] - qx) * (C[1] - qy) - (C[0] - qx) * (B[1] - qy)) / area, w1 = ((C[0] - qx) * (A[1] - qy) - (A[0] - qx) * (C[1] - qy)) / area, w2 = 1 - w0 - w1;
      const e = -1.5 / Math.max(1, Math.abs(area) ** 0.5); // a pixel's slack, so the patches have no gaps
      if (w0 < e || w1 < e || w2 < e) continue;
      // with a little grain
      const c = avg, g = (rnd() - 0.5) * 10, o = (y * W + x) * 4;
      data[o] = Math.max(0, Math.min(255, c[0] + g)); data[o + 1] = Math.max(0, Math.min(255, c[1] + g)); data[o + 2] = Math.max(0, Math.min(255, c[2] + g)); painted++;
    }
  }
  console.log('repainted', painted, 'texels');
  baseTex.setImage(new Uint8Array(await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer())).setMimeType('image/png');
}
for (const t of root.listTextures()) {
  const buf = await sharp(Buffer.from(t.getImage())).resize(TEX, TEX, { fit: 'inside' }).webp({ quality: 82 }).toBuffer();
  t.setImage(new Uint8Array(buf)).setMimeType('image/webp').setURI(name + '-tex.webp');
}
await doc.transform(prune(), unpartition(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(path.join(outDir, name + '.gltf'), doc);
fs.renameSync(path.join(outDir, name + '.gltf'), path.join(outDir, name + '.json'));
// the geometry goes inside the JSON (the game's other models are single .json files)
{ const f = path.join(outDir, name + '.json'), j = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const b of j.buffers || []) if (b.uri && b.uri.endsWith('.bin')) { const bin = path.join(outDir, b.uri); b.uri = 'data:application/octet-stream;base64,' + fs.readFileSync(bin).toString('base64'); fs.unlinkSync(bin); }
  fs.writeFileSync(f, JSON.stringify(j)); }
for (const f of fs.readdirSync(outDir)) if (f.startsWith(name)) console.log(f, fs.statSync(path.join(outDir, f)).size);
