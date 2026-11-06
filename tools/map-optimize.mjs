// Shrinks an exported stage map GLB for phones: simplifies the terrain mesh, drops its point lights (the game fakes them; real
// point lights are too costly on mobile GPUs), re-encodes textures as WebP up to --tex, packs the
// geometry with EXT_meshopt_compression and writes glTF JSON (buffer embedded) plus texture files.
// Instanced scatter (EXT_mesh_gpu_instancing) is kept; js/map.js builds it.
// usage: node map-optimize.mjs <in.glb> <out dir> <name> [--tex 1024]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, meshopt, unpartition, simplifyPrimitive, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = +args[i + 1]; args.splice(i, 2); return v; };
const TEX = opt('--tex', 1024);
const [inFile, outDir, name] = args;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
io.registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
fs.mkdirSync(outDir, { recursive: true });
const doc = await io.read(inFile);
const root = doc.getRoot();
for (const n of root.listNodes()) {
  const L = n.getExtension('KHR_lights_punctual');
  if (L) { n.setExtras(Object.assign({}, n.getExtras(), { light: { color: L.getColor(), intensity: L.getIntensity(), range: L.getRange() } })); n.setExtension('KHR_lights_punctual', null); }
}
for (const e of root.listExtensionsUsed()) if (e.extensionName === 'KHR_lights_punctual') e.dispose();
// the big terrain grid is simplified (gameplay uses the baked heightmap, not this mesh)
for (const n of root.listNodes()) {
  if (!(n.getExtras() || {}).ground || !n.getMesh()) continue;
  for (const p of n.getMesh().listPrimitives()) {
    const before = p.getIndices() ? p.getIndices().getCount() / 3 : 0;
    if (before < 20000) continue;
    simplifyPrimitive(p, { simplifier: MeshoptSimplifier, ratio: 0.25, error: 0.002, lockBorder: true });
    console.log(n.getName(), before, '->', p.getIndices().getCount() / 3, 'triangles');
  }
}
for (const tex of root.listTextures()) {
  const meta0 = await sharp(Buffer.from(tex.getImage())).metadata();
  const img = sharp(Buffer.from(tex.getImage())).resize(Math.min(meta0.width, TEX), Math.min(meta0.height, TEX), { fit: 'fill' });
  const meta = await img.metadata();
  const out = await (meta.hasAlpha ? img.webp({ quality: 82, alphaQuality: 90 }) : img.removeAlpha().webp({ quality: 80 })).toBuffer();
  tex.setImage(new Uint8Array(out)).setMimeType('image/webp')
    .setURI(name + '-' + (tex.getName() || 'tex').replace(/[^A-Za-z0-9_-]+/g, '_') + '.webp');
}
await doc.transform(prune({ keepLeaves: true }), dedup(), meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }), unpartition());
root.listBuffers()[0].setURI(name + '.bin');
const gltf = path.join(outDir, name + '.gltf'), bin = path.join(outDir, name + '.bin');
await io.write(gltf, doc);
const json = JSON.parse(fs.readFileSync(gltf, 'utf8'));
json.buffers[0].uri = 'data:application/octet-stream;base64,' + fs.readFileSync(bin).toString('base64');
fs.writeFileSync(path.join(outDir, name + '.json'), JSON.stringify(json));
fs.rmSync(gltf); fs.rmSync(bin);
const files = fs.readdirSync(outDir).filter((x) => x.startsWith(name + '.') || x.startsWith(name + '-'));
console.log(name, files.length, 'files', (files.reduce((t, x) => t + fs.statSync(path.join(outDir, x)).size, 0) / 1024).toFixed(0), 'KB');
