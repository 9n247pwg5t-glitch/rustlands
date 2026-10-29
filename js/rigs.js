'use strict';
// Mixamo characters for the human enemies. Bodies are the uploaded Mixamo characters (models/*.json,
// glTF converted from FBX), motion is the uploaded Mixamo clips (models/enemy-anims.json). Every body
// shares one skeleton, so every clip plays on every body. They're cel-shaded with an ink outline, and
// weapons and gear are pinned to their bones. If nothing loads, the block figures are used.

const RIG = { ready: false, failed: false, base: {}, data: null };
const RIG_HEIGHT = 1.85; // metres at enemy scale 1

// Melee attacks: clip, start, impact times, end (seconds in the clip), damage share per impact.
const RIG_ATTACKS = [
  { clip: 'Hook', start: 0.4, hits: [1.0], end: 1.45, dmg: [1.1] },
  { clip: 'Punch Combo', start: 0.3, hits: [0.63, 0.87, 1.13, 1.37], end: 1.55, dmg: [0.4, 0.4, 0.4, 0.5] },
  { clip: 'Mma Kick 1', start: 0.35, hits: [0.73], end: 1.15, dmg: [1.2] },
  { clip: 'Mma Kick 2', start: 0.3, hits: [0.63], end: 1.05, dmg: [1.2] },
  { clip: 'Roundhouse Kick', start: 0.55, hits: [1.0], end: 1.45, dmg: [1.4] },
];

// The uploaded characters: game name -> model file.
const RIG_FILES = {
  psycho1: 'male-psychosis-enemy-1',
  ugly: 'male-psychosis-enemy-2-ugly',
  female: 'femal-psychosis-1',
  clown: 'brawler-clown',
  gangster: 'gangster-clown',
  brute: 'brute',
};
// Per enemy type: which bodies, and the gear pinned to the bones. The characters are shown as
// authored; `cloth` (optional) would dye the dark parts of their clothes.
const RIG_LOOKS = {
  bandit: { bases: ['psycho1', 'ugly', 'female'], weapon: 'rifle' },
  marauder: { bases: ['gangster'], weapon: 'rifle' }, // the top-heavy gangster clown
  psycho: { bases: ['ugly', 'psycho1', 'female'], weapon: 'axe' },
  suicide: { bases: ['psycho1', 'ugly', 'female'], weapon: 'bomb' },
  nomad: { bases: ['clown'], weapon: 'smg', dual: true }, // the clown brawler, an SMG in each fist
  boss: { bases: ['brute'], pod: true }, // the Brute carries his own battle axe
};

const RIG_UPPER = /^mixamorig(Spine1|Spine2|Neck|Head|(Left|Right)(Shoulder|Arm|ForeArm|Hand))$/;

function rigOutlineMaterial(thick) {
  return new THREE.ShaderMaterial({
    uniforms: { thick: { value: thick }, color: { value: new THREE.Color(0x1c110a) } },
    vertexShader: `
      #include <common>
      #include <skinning_pars_vertex>
      uniform float thick;
      void main() {
        #include <beginnormal_vertex>
        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        transformed += normalize(objectNormal) * thick;
        #include <project_vertex>
      }`,
    fragmentShader: 'uniform vec3 color; void main() { gl_FragColor = vec4(color, 1.0); }',
    side: THREE.BackSide,
    skinning: true,
  });
}

function loadRigs() {
  if (RIG.loading) return RIG.loading;
  if (!THREE.GLTFLoader || !THREE.SkeletonUtils) { RIG.failed = true; return (RIG.loading = Promise.resolve()); }
  const loader = new THREE.GLTFLoader();
  const get = (f) => new Promise((ok, fail) => loader.load('models/' + f + '.json', ok, undefined, fail));
  const anims = fetch('models/enemy-anims.json').then((r) => { if (!r.ok) throw new Error('anims ' + r.status); return r.json(); });
  const names = Object.keys(RIG_FILES);
  RIG.loading = anims.then((data) => {
    RIG.data = data;
    return Promise.allSettled(names.map((n) => get(RIG_FILES[n])));
  }).then((results) => {
    results.forEach((r, i) => {
      if (r.status !== 'fulfilled') { console.warn('Enemy model failed to load:', RIG_FILES[names[i]], r.reason); return; }
      try { RIG.base[names[i]] = prepareRigBase(r.value); } catch (e) { console.warn('Enemy model unusable:', RIG_FILES[names[i]], e); }
    });
    // a type whose bodies all failed falls back to any loaded body
    const loaded = Object.keys(RIG.base);
    for (const look of Object.values(RIG_LOOKS)) {
      look.bases = look.bases.filter((b) => RIG.base[b]);
      if (!look.bases.length) look.bases = loaded.slice();
    }
    RIG.ready = loaded.length > 0;
    RIG.failed = !RIG.ready;
  }).catch((e) => { console.warn('Enemy models unavailable, using block figures.', e); RIG.failed = true; });
  return RIG.loading;
}

function prepareRigBase(gltf) {
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  const hips = scene.getObjectByName('mixamorigHips');
  const head = scene.getObjectByName('mixamorigHead');
  if (!hips || !head) throw new Error('not a Mixamo skeleton');
  // Height from the skeleton (the skin's mesh units can differ from its bones'). Not every rig has a
  // head-top bone; the head bone sits at about 87% of a Mixamo character's height.
  const top = scene.getObjectByName('mixamorigHeadTop_End');
  const headY = head.getWorldPosition(new THREE.Vector3()).y;
  const topY = top ? top.getWorldPosition(v).y : headY / 0.87;
  const height = topY * 1.03;
  const fit = RIG_HEIGHT / height;
  // leg length relative to the skeleton the clips were recorded on (hips about 1 m up): a
  // short-legged body takes shorter strides, so it can't move as fast without its feet sliding
  const gaitScale = clamp(hips.getWorldPosition(new THREE.Vector3()).y * fit / 1.0, 0.4, 1.3);
  // Head size in metres after fitting (stylised characters have big heads), so masks fit every body.
  const headLen = (topY - headY) * fit;
  const headSize = clamp((headLen / 0.2) * 0.8, 1, 2.2);
  const meshes = [];
  scene.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
  // Texture info by mesh name (clones copy userData through JSON, which would flatten a texture).
  const mats = {};
  for (const m of meshes) {
    const src = m.material;
    mats[m.name] = { map: src.map || null, alpha: src.alphaTest > 0 || src.transparent, id: m.name, vc: !!m.geometry.attributes.color };
    m.frustumCulled = false;
    m.castShadow = true;
    if (/Eye|Brow|Lash|Mouth|Facial/i.test(m.name)) continue;
    const ws = m.getWorldScale(v).x;
    const o = new THREE.SkinnedMesh(m.geometry, rigOutlineMaterial(0.016 / (ws * fit)));
    o.position.copy(m.position); o.quaternion.copy(m.quaternion); o.scale.copy(m.scale);
    o.bind(m.skeleton, m.bindMatrix);
    o.frustumCulled = false;
    o.userData.outline = true;
    m.parent.add(o);
  }
  // Clips scaled to this body: only the hips carry translation (height only).
  const f = hips.position.y / RIG.data.restHipsY;
  const clips = {};
  for (const [name, c] of Object.entries(RIG.data.clips)) {
    const tracks = c.tracks.map((t) => {
      if (t.n === 'hipsY') {
        const vals = [];
        for (const y of t.v) vals.push(hips.position.x, y * f, hips.position.z);
        return new THREE.VectorKeyframeTrack('mixamorigHips.position', t.t, vals);
      }
      return new THREE.QuaternionKeyframeTrack(t.n, t.t, t.v);
    });
    clips[name] = new THREE.AnimationClip(name, c.d, tracks);
  }
  // The upper body's aiming pose (rifle shouldered), sampled from Shoot Rifle, so gunners can keep
  // aiming while their legs walk, side-step or backpedal.
  const aimPose = {}, rest = [];
  scene.traverse((o) => { if (o.isBone) rest.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]); });
  const mixer = new THREE.AnimationMixer(scene);
  mixer.clipAction(clips['Shoot Rifle']).play();
  mixer.setTime(0.1);
  scene.traverse((o) => { if (o.isBone && RIG_UPPER.test(o.name)) aimPose[o.name] = o.quaternion.clone(); });
  mixer.stopAllAction(); mixer.uncacheRoot(scene);
  for (const [o, p, q, sc] of rest) { o.position.copy(p); o.quaternion.copy(q); o.scale.copy(sc); }
  scene.updateMatrixWorld(true);
  return { scene, fit, clips, mats, headSize, aimPose, gaitScale };
}

const _rigMatCache = new Map();
function rigMaterial(baseName, info, tint) {
  const key = baseName + '_' + info.id + '_' + tint;
  let mat = _rigMatCache.get(key);
  if (!mat) {
    mat = new THREE.MeshToonMaterial({ map: info.map, gradientMap: gradTex, skinning: true, vertexColors: info.vc });
    // lift dark textures a little so faces and clothes read under the cel shading
    if (info.map) { mat.emissiveMap = info.map; mat.emissive = new THREE.Color(0xffffff); mat.emissiveIntensity = 0.28; }
    if (info.alpha) { mat.alphaTest = 0.5; mat.side = THREE.DoubleSide; }
    if (tint == null) { _rigMatCache.set(key, mat); return mat; }
    // Dye the dark parts of the texture (clothes) and keep the lighter ones (skin, prints) as they are.
    const uTint = { value: new THREE.Color(tint) };
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTint = uTint;
      sh.fragmentShader = 'uniform vec3 uTint;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        float dye = 1.0 - smoothstep(0.1, 0.28, lum);
        diffuseColor.rgb = mix(diffuseColor.rgb, uTint * (0.55 + lum * 2.2), dye);`);
    };
    mat.customProgramCacheKey = () => 'rigDye';
    _rigMatCache.set(key, mat);
  }
  return mat;
}

// ---------------------------------------------------------------------------
// Gear. Each prop is built in metres with world-aligned axes for the T-pose
// (character facing +Z, its right hand out along -X).
function rigMask(kind) {
  const g = new THREE.Group();
  const eyes = (color) => {
    box(0.07, 0.035, 0.02, 0, -0.055, 0.0, 0.035, g.children[0], 0, glow(color));
    box(0.07, 0.035, 0.02, 0, 0.055, 0.0, 0.035, g.children[0], 0, glow(color));
  };
  if (kind === 'bandit') {
    box(0.22, 0.2, 0.05, 0xece4d0, 0, 0.1, 0.11, g, 0.012); eyes(0x111111);
    box(0.14, 0.025, 0.02, 0x111111, 0, -0.06, 0.035, g.children[0], 0);
    box(0.24, 0.05, 0.22, 0x7a3a22, 0, 0.21, 0.0, g, 0.012); // bandana
  } else if (kind === 'psycho') {
    box(0.22, 0.22, 0.05, 0xf3efe2, 0, 0.1, 0.11, g, 0.012); eyes(0x111111);
    for (let i = -2; i <= 2; i++) box(0.018, 0.04, 0.02, 0x8a1d1d, i * 0.03, -0.065, 0.035, g.children[0], 0);
  } else if (kind === 'suicide') {
    box(0.22, 0.22, 0.05, 0xd13a2a, 0, 0.1, 0.11, g, 0.012); eyes(0xffe14a);
  } else if (kind === 'goggles') {
    box(0.23, 0.07, 0.06, 0x222222, 0, 0.13, 0.1, g, 0.012); eyes(0xff4a2a);
    box(0.2, 0.08, 0.05, 0x3a3a3a, 0, 0.03, 0.11, g, 0.012); // respirator
  } else if (kind === 'nomad') {
    box(0.23, 0.22, 0.05, 0x2a2a2a, 0, 0.1, 0.11, g, 0.012); eyes(0xff8a1c);
    box(0.26, 0.06, 0.24, 0xd8b23a, 0, 0.22, 0, g, 0.012);
  } else if (kind === 'jaw') {
    box(0.23, 0.2, 0.05, 0x8a8a8a, 0, 0.13, 0.11, g, 0.012); eyes(0xff3a1a);
    box(0.26, 0.09, 0.2, 0x9a9a9a, 0, 0.0, 0.07, g, 0.014);
    for (let i = -2; i <= 2; i++) box(0.025, 0.04, 0.02, 0xffffff, i * 0.04, 0.04, 0.175, g, 0);
  }
  return g;
}
// `left` builds the mirrored version for a left hand (reaching out along +X in the T-pose).
function rigWeapon(kind, left = false) {
  const g = new THREE.Group();
  if (kind === 'smg') {
    const w = new THREE.Group(); g.add(w);
    w.rotation.y = left ? -Math.PI / 2 : Math.PI / 2; // barrel along the fingers
    w.position.set(left ? 0.07 : -0.07, -0.03, 0);
    box(0.06, 0.1, 0.34, 0x2e2e30, 0, 0.04, -0.06, w, 0.012);
    box(0.05, 0.12, 0.06, 0x5a3a24, 0, -0.05, 0.03, w, 0.01);
    box(0.04, 0.18, 0.05, 0x1f1f1f, 0, -0.08, -0.08, w, 0.01);
    box(0.03, 0.03, 0.12, 0x1a1a1a, 0, 0.05, -0.28, w, 0.008);
    box(0.065, 0.02, 0.2, 0, 0, 0.1, -0.06, w, 0, glow(0xff8a1c));
  } else if (kind === 'rifle') {
    const w = new THREE.Group(); g.add(w);
    w.rotation.y = Math.PI / 2; // barrel (-Z) along the fingers (-X)
    w.position.set(-0.07, -0.03, 0.0);
    box(0.06, 0.1, 0.55, 0x3a3a3a, 0, 0.04, -0.12, w, 0.012);
    box(0.05, 0.13, 0.06, 0x5a3a24, 0, -0.05, 0.02, w, 0.01);
    box(0.05, 0.08, 0.2, 0x5a3a24, 0, 0.02, 0.24, w, 0.01);
    box(0.04, 0.16, 0.06, 0x2a2a2a, 0, -0.06, -0.14, w, 0.01);
    box(0.03, 0.03, 0.18, 0x222222, 0, 0.06, -0.47, w, 0.008);
  } else if (kind === 'axe') {
    box(0.04, 0.04, 0.62, 0x5a3a24, -0.06, -0.02, 0.12, g, 0.01);
    box(0.03, 0.26, 0.2, 0xb8bcc0, -0.06, 0.1, 0.38, g, 0.012);
    box(0.032, 0.05, 0.21, 0x8a1d1d, -0.06, 0.2, 0.38, g, 0);
  } else if (kind === 'bomb') {
    for (let i = -1; i <= 1; i++) cyl(0.03, 0.03, 0.24, 0xc0392b, -0.07, -0.02, i * 0.06, g, 0.008, 8).rotation.x = Math.PI / 2;
    box(0.04, 0.04, 0.04, 0, -0.07, 0.04, -0.14, g, 0, glow(0xffe14a));
  } else if (kind === 'hammer') {
    box(0.06, 0.06, 1.0, 0x4a3426, -0.07, -0.02, 0.3, g, 0.012);
    box(0.3, 0.28, 0.4, 0x777777, -0.07, -0.02, 0.8, g, 0.018);
    box(0.31, 0.07, 0.41, 0xd23a26, -0.07, -0.02, 0.8, g, 0);
  }
  return g;
}
function rigArmor() {
  const g = new THREE.Group();
  box(0.42, 0.3, 0.12, 0xd8b23a, 0, 0.0, 0.14, g, 0.014);
  box(0.42, 0.3, 0.1, 0xb8922a, 0, 0.0, -0.14, g, 0.014);
  box(0.16, 0.08, 0.26, 0xd8b23a, -0.22, 0.14, 0, g, 0.012);
  box(0.16, 0.08, 0.26, 0xd8b23a, 0.22, 0.14, 0, g, 0.012);
  return g;
}
function rigPod() {
  const g = new THREE.Group();
  const pod = box(0.3, 0.26, 0.36, 0x5d6b3a, 0.14, 0.18, -0.2, g, 0.014);
  for (const [px, py] of [[-0.07, 0.06], [0.07, 0.06], [-0.07, -0.06], [0.07, -0.06]]) box(0.07, 0.07, 0.03, 0, px, py, 0.19, pod, 0, glow(0xff5a2a));
  pod.rotation.x = -0.3;
  return g;
}
function rigMohawk() {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) box(0.04, 0.09 - i * 0.012, 0.06, 0x3a2a1e, 0, 0.23 - i * 0.01, 0.06 - i * 0.06, g, 0.008);
  return g;
}

const _rq = new THREE.Quaternion(), _rv = new THREE.Vector3();
// Pin a world-aligned prop to a bone of a model in its rest pose.
function pinToBone(bone, prop, size = 1, align = null) {
  bone.getWorldQuaternion(_rq);
  bone.getWorldScale(_rv);
  prop.quaternion.copy(_rq).invert();
  if (align) prop.quaternion.multiply(align);
  prop.scale.setScalar(size / _rv.x);
  bone.add(prop);
}

// Hand-held gear is modelled for a right hand reaching out along -X (the Mixamo T-pose). For bodies
// bound in another pose (an A-pose with the arms hanging down), turn it to follow the hand's real
// direction, wrist to fingers, so it sits in the fist the same way on every body.
const _hw = new THREE.Vector3(), _fw = new THREE.Vector3();
function handAlign(hand, left = false) {
  const finger = hand.children.find((c) => c.isBone && /Middle1/.test(c.name)) || hand.children.find((c) => c.isBone);
  if (!finger) return null;
  hand.getWorldPosition(_hw); finger.getWorldPosition(_fw);
  const dir = _fw.sub(_hw);
  if (dir.lengthSq() < 1e-10) return null;
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(left ? 1 : -1, 0, 0), dir.normalize());
}

// A two-gun aiming pose for a body: each arm reaches forward on its own (two-bone IK from the
// shoulder, elbow angled down and out) and each wrist turns so its fingers point straight ahead.
// Only the arm bones are posed; the spine keeps following the walk/run clips underneath.
function dualAimPose(base) {
  if (base.dualPose) return base.dualPose;
  const sc = base.scene;
  const saved = [];
  sc.traverse((o) => { if (o.isBone) saved.push([o, o.quaternion.clone()]); });
  sc.updateMatrixWorld(true);
  const W = (o) => o.getWorldPosition(new THREE.Vector3());
  const aimAt = (bone, from, to) => {
    // turn `bone` (in world space, as little as possible) so the direction from->current becomes from->to
    const cur = W(from === bone ? bone.children.find((c) => c.isBone) : from).sub(W(bone)).normalize();
    const want = to.clone().sub(W(bone)).normalize();
    const d = new THREE.Quaternion().setFromUnitVectors(cur, want);
    const wq = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(d);
    const pq = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.copy(pq.invert().multiply(wq));
    sc.updateMatrixWorld(true);
  };
  const pose = {};
  for (const [side, sgn] of [['Left', 1], ['Right', -1]]) {
    const arm = sc.getObjectByName('mixamorig' + side + 'Arm');
    const fore = sc.getObjectByName('mixamorig' + side + 'ForeArm');
    const hand = sc.getObjectByName('mixamorig' + side + 'Hand');
    if (!arm || !fore || !hand) continue;
    const S = W(arm), E0 = W(fore), H0 = W(hand);
    const a = S.distanceTo(E0), b = E0.distanceTo(H0), reach = a + b;
    // hand target: well in front of the shoulder, a little low and a little inward
    const T = S.clone().add(new THREE.Vector3(-sgn * 0.12 * reach, -0.22 * reach, 0.78 * reach));
    const d = Math.min(S.distanceTo(T), reach * 0.98);
    const u = T.clone().sub(S).normalize();
    const cosA = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
    const pole = new THREE.Vector3(sgn * 0.6, -1, -0.2);
    pole.addScaledVector(u, -pole.dot(u)).normalize();
    const E = S.clone().addScaledVector(u, a * cosA).addScaledVector(pole, a * Math.sqrt(1 - cosA * cosA));
    aimAt(arm, fore, E);
    aimAt(fore, hand, S.clone().addScaledVector(u, d));
    // fingers straight ahead
    aimAt(hand, hand, W(hand).add(new THREE.Vector3(0, 0, 1)));
    for (const bn of [arm, fore, hand]) pose[bn.name] = bn.quaternion.clone();
  }
  for (const [o, q] of saved) o.quaternion.copy(q);
  // square the chest to the hips (the rifle clips turn it sideways)
  for (const n of ['Spine1', 'Spine2', 'LeftShoulder', 'RightShoulder']) { const bn = sc.getObjectByName('mixamorig' + n); if (bn) pose[bn.name] = bn.quaternion.clone(); }
  sc.updateMatrixWorld(true);
  base.dualPose = pose;
  return pose;
}

// Two guns: each one is set so it points straight ahead (and upright) when the body is in its
// aiming pose, with the grip in the fist, whatever way that hand happens to be turned.
function pinDualGuns(model, base, bones, kind) {
  const saved = [];
  const pose = dualAimPose(base);
  model.traverse((o) => { if (o.isBone && pose[o.name]) { saved.push([o, o.quaternion.clone()]); o.quaternion.copy(pose[o.name]); } });
  model.updateMatrixWorld(true);
  const face = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI); // barrel (-Z) to the front (+Z)
  for (const hand of [bones.rhand, bones.lhand]) {
    const gun = rigWeapon(kind);
    const inner = gun.children[0];
    inner.rotation.set(0, 0, 0); inner.position.set(0, -0.02, 0.05);
    const hq = hand.getWorldQuaternion(new THREE.Quaternion());
    const hs = hand.getWorldScale(new THREE.Vector3()).x;
    gun.quaternion.copy(hq).invert().multiply(face);
    gun.scale.setScalar(1 / hs);
    // grip in the fist: a little way from the wrist toward the fingers
    const finger = hand.children.find((c) => c.isBone && /Middle1/.test(c.name)) || hand.children.find((c) => c.isBone);
    if (finger) {
      const off = finger.getWorldPosition(new THREE.Vector3()).sub(hand.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.7);
      gun.position.copy(off.applyQuaternion(hq.clone().invert()).divideScalar(hs));
    }
    hand.add(gun);
  }
  for (const [o, q] of saved) o.quaternion.copy(q);
  model.updateMatrixWorld(true);
}

function makeRigEnemy(key, def) {
  const look = RIG_LOOKS[key];
  const baseName = pick(look.bases);
  const tint = look.cloth ? pick(look.cloth) : null;
  const base = RIG.base[baseName];
  const model = THREE.SkeletonUtils.clone(base.scene);
  model.scale.setScalar(base.fit);
  model.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    if (o.userData.outline) return;
    if (look.mask && look.mask !== 'goggles' && /Eye|Brow|Lash|Mouth|Facial/i.test(o.name)) { o.visible = false; return; } // masked
    const info = base.mats[o.name];
    if (info) o.material = rigMaterial(baseName, info, tint);
  });
  const root = new THREE.Group();
  root.add(model);
  root.updateMatrixWorld(true);
  const bone = (n) => model.getObjectByName('mixamorig' + n);
  const bones = { head: bone('Head'), spine: bone('Spine2'), hips: bone('Hips'), rhand: bone('RightHand'), lhand: bone('LeftHand') };
  if (look.mask) pinToBone(bones.head, rigMask(look.mask), base.headSize);
  if (look.mohawk) pinToBone(bones.head, rigMohawk(), base.headSize);
  if (look.dual) pinDualGuns(model, base, bones, look.weapon);
  else if (look.weapon) pinToBone(bones.rhand, rigWeapon(look.weapon), 1, handAlign(bones.rhand));
  if (look.armor) pinToBone(bones.spine, rigArmor());
  if (look.pod) pinToBone(bones.spine, rigPod());
  const mixer = new THREE.AnimationMixer(model);
  const aimBones = [];
  const aimPose = look.dual ? dualAimPose(base) : base.aimPose;
  model.traverse((o) => { if (o.isBone && aimPose[o.name]) aimBones.push([o, aimPose[o.name]]); });
  const rig = { model, mixer, clips: base.clips, bones, actions: {}, loop: null, one: null, lastState: null, baseName, aimBones, aimW: 0, gait: base.gaitScale, dual: !!look.dual };
  return { root, rig };
}

// ---------------------------------------------------------------------------
// Playback
function rigAction(R, name) {
  let a = R.actions[name];
  if (!a) { a = R.mixer.clipAction(R.clips[name]); R.actions[name] = a; }
  return a;
}
function rigLoop(R, name, ts) {
  const a = rigAction(R, name);
  if (R.loop !== a || R.one) {
    a.reset(); a.setLoop(THREE.LoopRepeat, Infinity); a.enabled = true;
    a.play();
    const from = R.one ? R.one.action : R.loop;
    if (from && from !== a) a.crossFadeFrom(from, 0.18, false);
    R.loop = a; R.one = null;
  }
  a.timeScale = ts;
}
// Play part of a clip once: from `start` to `end` seconds, at speed `ts`.
function rigOnce(R, name, ts = 1, start = 0, end = Infinity, fade = 0.12) {
  const a = rigAction(R, name);
  const from = R.one ? R.one.action : R.loop;
  a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.enabled = true;
  a.time = start; a.timeScale = ts;
  a.play();
  if (from && from !== a) a.crossFadeFrom(from, fade, false);
  R.one = { action: a, end: Math.min(end, a.getClip().duration) };
  R.loop = null;
  return a;
}
const rigTime = (R) => (R.one ? R.one.action.time : 0);

function startRigAttack(e) {
  e.atk = pick(RIG_ATTACKS);
  e.atkHit = 0;
  rigOnce(e.rig, e.atk.clip, 1.35, e.atk.start, e.atk.end, 0.08);
}

function animateRig(e, dt) {
  const R = e.rig, r = e.model.root;
  r.position.copy(e.pos);
  r.rotation.y = e.yaw;
  r.scale.setScalar(e.def.scale * (e.flash > 0 ? 1.04 : 1));
  const fl = Math.max(0, e.flinchT);
  r.rotation.x = -fl * (e.def.boss ? 0.25 : 0.6);

  if (e.state !== R.lastState) {
    R.lastState = e.state;
    if (e.state === 'slamWind') rigOnce(R, 'Rifle Jump', 1.5, 0.25, 2.1);
    else if (e.state === 'move' && R.one && !R.one.keep) R.one = null;
  }
  if (R.one && R.one.action.time >= R.one.end - 1e-3 && !R.one.keep) R.one = null;
  if (!R.one) {
    if (e.state === 'charge') rigLoop(R, 'Rifle Run', clamp(Math.hypot(e.vel.x, e.vel.z) / (clipSpeed('Rifle Run', 4) * e.def.scale * R.gait), 0.6, 1.4));
    else if (e.state === 'rockets') rigLoop(R, 'Shoot Rifle', 0);
    else rigLocomotion(e, R, dt);
  }
  R.mixer.update(dt);
  // gunners hold the rifle up while moving, blended in and out
  // (two-gun bodies use their own pose even when standing, since the rifle clip's stance doesn't fit them)
  const wantAim = e.aiming && !R.one && (R.mode !== 'idle' || R.dual) && (e.def.ai === 'ranged' || e.def.ai === 'boss') && e.state === 'move';
  R.aimW = clamp(R.aimW + (wantAim ? dt : -dt) * 6, 0, 1);
  if (R.aimW > 0) for (const [b, q] of R.aimBones) b.quaternion.slerp(q, R.aimW);
  if (e.flinchCrit && fl > 0) R.bones.head.rotation.x -= fl * 2.2;
}

// How fast a clip travels (m/s) and which way it steps sideways (+1 = to the character's right),
// measured from its root motion when the clips were converted.
function clipSpeed(name, fallback) {
  const c = RIG.data.clips[name];
  const v = c && c.v ? Math.hypot(c.v[0], c.v[1]) / 100 : 0;
  return v > 0.1 ? v : fallback;
}
function clipSide(name) { const c = RIG.data.clips[name]; return c && c.v && c.v[0] > 0 ? -1 : 1; }

// Gait per kind of enemy: the clip for each direction and the fastest it may be played.
// ("Running" circles on the spot, so straight runs use Rifle Run.)
const GAIT = {
  gun: { fwd: ['Rifle Run', 1.35], back: ['Backwards Rifle Walk', 2.0], side: ['Rifle Side Step', 2.2] },
  melee: { fwd: ['Rifle Run', 1.4], back: ['Run Backwards', 2.0], side: ['Goalkeeper Sidestep', 1.7] },
  suicide: { fwd: ['Injured Run', 1.75], back: ['Run Backwards', 2.0], side: ['Goalkeeper Sidestep', 1.7] },
};
const gaitOf = (e) => (e.def.ai === 'ranged' || e.def.ai === 'boss' ? GAIT.gun : e.def.ai === 'suicide' ? GAIT.suicide : GAIT.melee);
const gaitMax = (e, g) => clipSpeed(g[0], 1) * g[1] * e.def.scale * e.rig.gait;

// Keep a rigged enemy no faster than its legs can carry it in the direction it's moving
// relative to where it faces, so the feet never skate. Called on normal movement only.
function rigClampVelocity(e) {
  const G = gaitOf(e);
  const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw);
  let vf = e.vel.x * fx + e.vel.z * fz, vr = -e.vel.x * fz + e.vel.z * fx;
  const fMax = gaitMax(e, G.fwd), bMax = gaitMax(e, G.back), sMax = gaitMax(e, G.side);
  if (Math.abs(vr) > Math.abs(vf)) {
    vr = clamp(vr, -sMax, sMax);
    vf = clamp(vf, -bMax * 0.3, fMax * 0.15);
  } else if (vf >= 0) {
    vf = Math.min(vf, fMax);
    vr = clamp(vr, -sMax * 0.5, sMax * 0.5);
  } else {
    vf = Math.max(vf, -bMax);
    vr = clamp(vr, -sMax * 0.3, sMax * 0.3);
  }
  e.vel.x = fx * vf - fz * vr;
  e.vel.z = fz * vf + fx * vr;
}

// Pick forward, backward or sideways movement from the velocity relative to where the body faces,
// with playback speed matched to the ground speed (side steps play in reverse for the other side).
function rigLocomotion(e, R, dt) {
  const gun = e.def.ai === 'ranged' || e.def.ai === 'boss';
  const G = gaitOf(e), sc = e.def.scale;
  const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw);
  const vf = e.vel.x * fx + e.vel.z * fz;
  const vr = -e.vel.x * fz + e.vel.z * fx;
  const speed = Math.hypot(vf, vr);
  let mode = speed < 0.35 * sc ? 'idle' : Math.abs(vr) > Math.abs(vf) ? 'side' : vf > 0 ? 'fwd' : 'back';
  // a short hold so brief wobbles don't flip clips back and forth
  if (R.mode && mode !== R.mode) { R.modeT = (R.modeT || 0) + dt; if (R.modeT < 0.12) mode = R.mode; else R.modeT = 0; }
  else R.modeT = 0;
  R.mode = mode;
  const play = (g, v) => {
    const ts = clamp(Math.abs(v) / (clipSpeed(g[0], 1) * sc * R.gait), 0.4, g[1]);
    return ts;
  };
  if (mode === 'idle') {
    if (gun && R.dual) rigLoop(R, 'Backwards Rifle Walk', 0); // a standing frame that faces straight ahead
    else if (gun) rigLoop(R, 'Shoot Rifle', 0); // aiming pose
    else rigLoop(R, 'Slap thigh Taunt', 1);
  } else if (mode === 'fwd') {
    if (gun && e.burstLeft > 0 && vf < clipSpeed('Shoot Rifle', 1.9) * sc * 1.3) rigLoop(R, 'Shoot Rifle', play(['Shoot Rifle', 1.3], vf)); // walk and shoot
    else rigLoop(R, G.fwd[0], play(G.fwd, vf));
  } else if (mode === 'back') {
    rigLoop(R, G.back[0], play(G.back, vf));
  } else {
    const ts = play(G.side, vr);
    rigLoop(R, G.side[0], Math.sign(vr) === clipSide(G.side[0]) ? ts : -ts);
  }
}

// Dead enemies keep playing their death clip, then sink into the sand.
const rigCorpses = [];
function rigDie(e, violent) {
  rigOnce(e.rig, violent ? 'Flying Back Death' : 'Dying', violent ? 1.3 : 1.5, violent ? 0 : 0.2, Infinity, 0.08);
  e.rig.one.keep = true;
  rigCorpses.push({ e, t: 0 });
}
function updateRigCorpses(dt) {
  for (let i = rigCorpses.length - 1; i >= 0; i--) {
    const c = rigCorpses[i];
    c.t += dt;
    c.e.rig.mixer.update(dt);
    if (c.t > 3.2) c.e.model.root.position.y -= dt * 0.9;
    if (c.t > 4.6) { scene.remove(c.e.model.root); rigCorpses.splice(i, 1); }
  }
}
function clearRigCorpses() {
  for (const c of rigCorpses) scene.remove(c.e.model.root);
  rigCorpses.length = 0;
}

// Hit spheres that follow the animation: head (crit), chest, hips.
const _hb = new THREE.Vector3();
function rigSpheres(e, out) {
  const s = e.def.scale;
  e.model.root.updateMatrixWorld(true);
  e.rig.bones.head.getWorldPosition(_hb);
  out.push([_hb.x, _hb.y + 0.1 * s, _hb.z, 0.16 * s, true]);
  e.rig.bones.spine.getWorldPosition(_hb);
  out.push([_hb.x, _hb.y, _hb.z, 0.3 * s, false]);
  e.rig.bones.hips.getWorldPosition(_hb);
  out.push([_hb.x, _hb.y - 0.05 * s, _hb.z, 0.32 * s, false]);
  out.push([e.pos.x, e.pos.y + 0.45 * s, e.pos.z, 0.26 * s, false]);
}
