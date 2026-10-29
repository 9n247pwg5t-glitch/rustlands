// Converts Mixamo "without skin" FBX animations into one compact JSON of three.js clips.
import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
globalThis.self = globalThis;
const [inDir, outFile] = process.argv.slice(2);
const loader = new FBXLoader();
const out = { restHipsY: null, clips: {} };
const r4 = (v) => Math.round(v * 1e4) / 1e4;
for (const f of fs.readdirSync(inDir).filter((f) => f.endsWith('.fbx')).sort()) {
  const buf = fs.readFileSync(path.join(inDir, f));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const obj = loader.parse(ab, '');
  let hips = null;
  obj.traverse((o) => { if (o.isBone && /Hips$/.test(o.name) && !hips) hips = o; });
  if (out.restHipsY == null && hips) { const p = new THREE.Vector3(); hips.getWorldPosition(p); out.restHipsY = r4(p.y); out.rootScale = r4(obj.scale.x); }
  const clip = obj.animations[0];
  const tracks = [];
  let motion = [0, 0];
  for (const t of clip.tracks) {
    const [node, prop] = t.name.split('.');
    const bone = node.replace(/^mixamorig\d*:?/, '');
    if (prop === 'quaternion') {
      tracks.push({ n: 'mixamorig' + bone + '.quaternion', t: Array.from(t.times, r4), v: Array.from(t.values, r4) });
    } else if (prop === 'position' && bone === 'Hips') {
      // root motion: average travel per second (cm, character space: +Z forward, +X to its left)
      const n = t.times.length, dur = t.times[n - 1] - t.times[0];
      if (dur > 0) motion = [r4((t.values[(n - 1) * 3] - t.values[0]) / dur), r4((t.values[(n - 1) * 3 + 2] - t.values[2]) / dur)];
      // keep only the hips' height; the game moves the characters itself
      const y = []; for (let i = 1; i < t.values.length; i += 3) y.push(r4(t.values[i]));
      tracks.push({ n: 'hipsY', t: Array.from(t.times, r4), v: y });
    }
  }
  // thin out keys: Mixamo bakes 30fps; keep every other key for loops longer than 1s
  for (const tr of tracks) {
    if (tr.t.length > 40) {
      const stride = tr.n === 'hipsY' ? 1 : (tr.v.length / tr.t.length);
      const t2 = [], v2 = [];
      for (let i = 0; i < tr.t.length; i += 2) { t2.push(tr.t[i]); for (let k = 0; k < stride; k++) v2.push(tr.v[i * stride + k]); }
      if ((tr.t.length - 1) % 2) { const i = tr.t.length - 1; t2.push(tr.t[i]); for (let k = 0; k < stride; k++) v2.push(tr.v[i * stride + k]); }
      tr.t = t2; tr.v = v2;
    }
  }
  const name = f.replace(/\.fbx$/, '');
  out.clips[name] = { d: r4(clip.duration), tracks, v: motion };
  console.log(name.padEnd(24), clip.duration.toFixed(2) + 's', 'travel cm/s x,z', motion.join(', '));
}
fs.writeFileSync(outFile, JSON.stringify(out));
console.log('restHipsY', out.restHipsY, 'rootScale', out.rootScale, 'bytes', fs.statSync(outFile).size);
