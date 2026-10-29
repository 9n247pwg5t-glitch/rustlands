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
  topheavy: 'male-psychosis-top-heavy',
  brute: 'brute',
};
// Per enemy type: which bodies, and the gear pinned to the bones. The characters are shown as
// authored; `cloth` (optional) would dye the dark parts of their clothes.
const RIG_LOOKS = {
  bandit: { bases: ['psycho1', 'ugly', 'female'], weapon: 'rifle' },
  marauder: { bases: ['female', 'psycho1', 'topheavy'], mask: 'goggles', weapon: 'rifle' },
  psycho: { bases: ['ugly', 'psycho1', 'female'], weapon: 'axe' },
  suicide: { bases: ['psycho1', 'ugly', 'female'], weapon: 'bomb' },
  nomad: { bases: ['topheavy'], weapon: 'rifle' },
  boss: { bases: ['brute'], pod: true }, // the Brute carries his own battle axe
};

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
  // Head size in metres after fitting (stylised characters have big heads), so masks fit every body.
  const headLen = (topY - headY) * fit;
  const headSize = clamp((headLen / 0.2) * 0.8, 1, 2.2);
  const meshes = [];
  scene.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
  // Texture info by mesh name (clones copy userData through JSON, which would flatten a texture).
  const mats = {};
  for (const m of meshes) {
    const src = m.material;
    mats[m.name] = { map: src.map || null, alpha: src.alphaTest > 0 || src.transparent, id: m.name };
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
  return { scene, fit, clips, mats, headSize };
}

const _rigMatCache = new Map();
function rigMaterial(baseName, info, tint) {
  const key = baseName + '_' + info.id + '_' + tint;
  let mat = _rigMatCache.get(key);
  if (!mat) {
    mat = new THREE.MeshToonMaterial({ map: info.map, gradientMap: gradTex, skinning: true });
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
function rigWeapon(kind) {
  const g = new THREE.Group();
  if (kind === 'rifle') {
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
function pinToBone(bone, prop, size = 1) {
  bone.getWorldQuaternion(_rq);
  bone.getWorldScale(_rv);
  prop.quaternion.copy(_rq).invert();
  prop.scale.setScalar(size / _rv.x);
  bone.add(prop);
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
  const bones = { head: bone('Head'), spine: bone('Spine2'), hips: bone('Hips'), rhand: bone('RightHand') };
  if (look.mask) pinToBone(bones.head, rigMask(look.mask), base.headSize);
  if (look.mohawk) pinToBone(bones.head, rigMohawk(), base.headSize);
  if (look.weapon) pinToBone(bones.rhand, rigWeapon(look.weapon));
  if (look.armor) pinToBone(bones.spine, rigArmor());
  if (look.pod) pinToBone(bones.spine, rigPod());
  const mixer = new THREE.AnimationMixer(model);
  const rig = { model, mixer, clips: base.clips, bones, actions: {}, loop: null, one: null, lastState: null, baseName };
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
    const speed = Math.hypot(e.vel.x, e.vel.z);
    const ai = e.def.ai;
    if (e.state === 'charge') rigLoop(R, 'Running', 1.7);
    else if (e.state === 'rockets') rigLoop(R, 'Shoot Rifle', 1);
    else if (ai === 'ranged' || ai === 'boss') {
      if (speed > 0.8) rigLoop(R, 'Rifle Run', clamp(speed / 4.2, 0.6, 1.5));
      else rigLoop(R, 'Shoot Rifle', e.burstLeft > 0 ? 1.2 : 0);
    } else if (ai === 'suicide') rigLoop(R, 'Injured Run', clamp(speed / 5, 0.6, 1.6));
    else if (speed > 0.8) rigLoop(R, 'Running', clamp(speed / 6.5, 0.6, 1.7));
    else rigLoop(R, 'Slap thigh Taunt', 1);
  }
  R.mixer.update(dt);
  if (e.flinchCrit && fl > 0) R.bones.head.rotation.x -= fl * 2.2;
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
