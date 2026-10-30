// Shrinks exported character GLBs for the web: weld + simplify meshes to a vertex budget,
// re-encode textures as WebP, quantize, then write glTF JSON (buffer embedded as a data URI)
// plus separate texture files, which is what the artifact host serves.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, weld, simplifyPrimitive, quantize, unpartition } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// usage: node optimize.mjs <glb dir> <out dir> [vertex budget] [--tex 2048] [--normals 1024]
// --tex caps colour textures, --normals keeps normal maps at that size (default: dropped)
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = +args[i + 1]; args.splice(i, 2); return v; };
const TEX = opt('--tex', 1024), NORMALS = opt('--normals', 0);
const [inDir, outDir, budgetArg] = args;
const BUDGET = +(budgetArg || 16000);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptSimplifier.ready;
fs.mkdirSync(outDir, { recursive: true });

for (const f of fs.readdirSync(inDir).filter((f) => f.endsWith('.glb'))) {
  const name = f.replace(/\.glb$/, '').toLowerCase().replace(/_+/g, '-');
  const doc = await io.read(path.join(inDir, f));
  const root = doc.getRoot();
  await doc.transform(weld());
  const prims = [];
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) prims.push([m, p]);
  const total = prims.reduce((t, [, p]) => t + p.getAttribute('POSITION').getCount(), 0);
  const ratio = Math.min(1, BUDGET / total);
  let after = 0;
  for (const [m, p] of prims) {
    const n = p.getAttribute('POSITION').getCount();
    // small parts (eyes, earrings) keep more of their shape
    const r = n < 2000 ? Math.max(ratio, 0.5) : ratio;
    if (r < 1) simplifyPrimitive(p, { simplifier: MeshoptSimplifier, ratio: r, error: 0.01, lockBorder: false });
    after += p.getAttribute('POSITION').getCount();
  }
  if (!NORMALS) for (const m of root.listMaterials()) m.setNormalTexture(null);
  await doc.transform(prune());
  const normalTex = new Set(root.listMaterials().map((m) => m.getNormalTexture()).filter(Boolean));
  for (const tex of root.listTextures()) {
    const meta0 = await sharp(Buffer.from(tex.getImage())).metadata();
    const cap = normalTex.has(tex) ? NORMALS : TEX;
    const img = sharp(Buffer.from(tex.getImage())).resize(Math.min(meta0.width, cap), Math.min(meta0.height, cap), { fit: 'fill' });
    const meta = await img.metadata();
    const out = await (meta.hasAlpha ? img.webp({ quality: 82, alphaQuality: 90 }) : img.removeAlpha().webp({ quality: 80 })).toBuffer();
    tex.setImage(new Uint8Array(out)).setMimeType('image/webp')
      .setURI(name + '-' + (tex.getName() || 'tex').replace(/[^A-Za-z0-9_-]+/g, '_') + '-' + root.listTextures().indexOf(tex) + '.webp');
  }
  await doc.transform(prune(), dedup(), quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 8 }), unpartition());
  root.listBuffers()[0].setURI(name + '.bin');
  const gltf = path.join(outDir, name + '.gltf'), bin = path.join(outDir, name + '.bin');
  await io.write(gltf, doc);
  const json = JSON.parse(fs.readFileSync(gltf, 'utf8'));
  json.buffers[0].uri = 'data:application/octet-stream;base64,' + fs.readFileSync(bin).toString('base64');
  fs.writeFileSync(path.join(outDir, name + '.json'), JSON.stringify(json));
  fs.rmSync(gltf); fs.rmSync(bin);
  const files = fs.readdirSync(outDir).filter((x) => x.startsWith(name + '.') || x.startsWith(name + '-'));
  const kb = files.reduce((t, x) => t + fs.statSync(path.join(outDir, x)).size, 0) / 1024;
  console.log(`${name}: ${total} -> ${after} verts, ${files.length} files, ${kb.toFixed(0)} KB`);
}
