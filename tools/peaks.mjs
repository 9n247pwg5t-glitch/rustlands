import fs from 'fs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
const loader = new FBXLoader();
const names = process.argv.slice(2);
for (const n of names) {
  const buf = fs.readFileSync('../fbx/' + n + '.fbx');
  const obj = loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
  const clip = obj.animations[0];
  const mixer = new THREE.AnimationMixer(obj);
  mixer.clipAction(clip).play();
  const bones = {}; obj.traverse(o => { if (o.isBone) { const k = o.name.replace(/^mixamorig\d*:?/, ''); if (/^(Hips|RightHand|LeftHand|RightFoot|LeftFoot)$/.test(k)) bones[k] = o; } });
  const rows = [];
  const v = new THREE.Vector3(), h = new THREE.Vector3();
  for (let t = 0; t <= clip.duration; t += 1 / 30) {
    mixer.setTime(t); obj.updateMatrixWorld(true);
    bones.Hips.getWorldPosition(h);
    const r = { t: +t.toFixed(2) };
    for (const k of ['RightHand', 'LeftHand', 'RightFoot', 'LeftFoot']) { bones[k].getWorldPosition(v); r[k] = +(v.z - h.z).toFixed(1); }
    rows.push(r);
  }
  // reach = max forward extension of any limb (cm ahead of the hips)
  const reach = rows.map(r => ({ t: r.t, z: Math.max(r.RightHand, r.LeftHand, r.RightFoot, r.LeftFoot), who: ['RightHand', 'LeftHand', 'RightFoot', 'LeftFoot'].reduce((a, b) => r[a] > r[b] ? a : b) }));
  const peaks = reach.filter((p, i) => i > 0 && i < reach.length - 1 && p.z >= reach[i - 1].z && p.z > reach[i + 1].z && p.z > 45);
  console.log(n.padEnd(18), clip.duration.toFixed(2), 'peaks:', peaks.map(p => `${p.t}s ${p.who} ${p.z}cm`).join(' | '));
}
