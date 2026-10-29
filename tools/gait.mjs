// For each locomotion clip: hips path, facing, and ground speed measured from planted feet.
import fs from 'fs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
const loader = new FBXLoader();
for (const n of process.argv.slice(2)) {
  const buf = fs.readFileSync('../fbx/' + n + '.fbx');
  const obj = loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
  const clip = obj.animations[0];
  const mixer = new THREE.AnimationMixer(obj); mixer.clipAction(clip).play();
  const bones = {}; obj.traverse((o) => { if (o.isBone) bones[o.name.replace(/^mixamorig\d*:?/, '')] = o; });
  const h = new THREE.Vector3(), l = new THREE.Vector3(), r = new THREE.Vector3(), q = new THREE.Quaternion(), f = new THREE.Vector3();
  const rows = [];
  for (let t = 0; t <= clip.duration + 1e-6; t += 1 / 30) {
    mixer.setTime(t); obj.updateMatrixWorld(true);
    bones.Hips.getWorldPosition(h); bones.LeftToeBase.getWorldPosition(l); bones.RightToeBase.getWorldPosition(r);
    bones.Hips.getWorldQuaternion(q); f.set(0, 0, 1).applyQuaternion(q);
    rows.push({ t, h: h.clone(), l: l.clone(), r: r.clone(), yaw: Math.atan2(f.x, f.z) * 57.3 });
  }
  // planted foot = the lower one; its velocity relative to the hips (negated) is the ground speed
  let sum = new THREE.Vector3(), cnt = 0;
  const minY = Math.min(...rows.map((r) => Math.min(r.l.y, r.r.y)));
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    const foot = b.l.y < b.r.y ? 'l' : 'r';
    if (b[foot].y > minY + 4 || a[foot].y > minY + 4) continue; // only while the toe is on the ground
    const rel0 = a[foot].clone().sub(a.h), rel1 = b[foot].clone().sub(b.h);
    const v = rel0.sub(rel1).multiplyScalar(30); v.y = 0; // foot sliding back under the body = body moving forward
    sum.add(v); cnt++;
  }
  sum.divideScalar(cnt);
  const first = rows[0], last = rows[rows.length - 1];
  const yaws = rows.map((r) => r.yaw);
  console.log(n.padEnd(22), clip.duration.toFixed(2) + 's',
    'hips travel', ((last.h.x - first.h.x) / 100).toFixed(2) + ',' + ((last.h.z - first.h.z) / 100).toFixed(2) + ' m',
    '| facing yaw', Math.min(...yaws).toFixed(0) + '..' + Math.max(...yaws).toFixed(0),
    '| feet-based speed x,z', (sum.x / 100).toFixed(2) + ',' + (sum.z / 100).toFixed(2), 'm/s');
}
