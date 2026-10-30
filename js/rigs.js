'use strict';
// Mixamo characters for the human enemies. Bodies are the uploaded Mixamo characters (models/*.json,
// glTF converted from FBX), motion is the uploaded Mixamo clips (models/enemy-anims.json). Every body
// shares one skeleton, so every clip plays on every body. They're cel-shaded with an ink outline, and
// weapons and gear are pinned to their bones. If nothing loads, the block figures are used.

const RIG = { ready: false, failed: false, base: {}, data: null, guns: {} };
const RIG_HEIGHT = 1.85; // metres at enemy scale 1

// Melee attacks: clip, start, impact times, end (seconds in the clip), damage share per impact.
// Axe swings land where the hand moves fastest; the odd kick keeps them unpredictable.
const RIG_ATTACKS = [
  { clip: 'Standing Melee Attack Downward', start: 0.35, hits: [0.85], end: 1.45, dmg: [1.3] },
  { clip: 'Standing Melee Attack Downward', start: 0.35, hits: [0.85], end: 1.45, dmg: [1.3] },
  { clip: 'Standing Melee Attack 360 High', start: 0.45, hits: [1.08], end: 1.75, dmg: [1.4] },
  { clip: 'Standing Melee Combo Attack Ver. 3', start: 0.45, hits: [1.03, 1.78], end: 2.25, dmg: [0.8, 0.8] },
  { clip: 'Mma Kick 1', start: 0.35, hits: [0.73], end: 1.15, dmg: [1.2] },
  { clip: 'Roundhouse Kick', start: 0.55, hits: [1.0], end: 1.45, dmg: [1.4] },
];

// The uploaded characters: game name -> model file.
const RIG_FILES = {
  psycho1: 'strung-out-clown', // the strung-out clown
  ugly: 'burnt-clown', // the burnt clown
  female: 'psycho-clown-showgirl', // the psycho clown showgirl
  heavy: 'male-psychosis-top-heavy',
  gangster: 'gangster-clown',
  brute: 'brute',
};
// Per enemy type: which bodies, and the gear pinned to the bones. The characters are shown as
// authored; `cloth` (optional) would dye the dark parts of their clothes.
const RIG_LOOKS = {
  bandit: { bases: ['psycho1', 'ugly', 'female'], weapon: ['rifle', 'rifle', 'shotgun', 'pistol'] },
  marauder: { bases: ['gangster'], weapon: ['rifle', 'shotgun'] }, // the top-heavy gangster clown
  psycho: { bases: ['ugly', 'psycho1', 'female'], weapon: 'axe' },
  suicide: { bases: ['psycho1', 'ugly', 'female'], weapon: 'bomb' },
  nomad: { bases: ['heavy'], weapon: 'pistol', dual: true, style: 'clown' }, // the top-heavy brawler as a bloody clown, a pistol in each fist
  boss: { bases: ['brute'], pod: true }, // the Brute carries his own battle axe
};

// Weapon models (glTF as .json, vertex coloured; barrel or blade toward +Z, up +Y, metres). The
// sockets are where the hand grips it and where shots leave. `size` scales the model in the fist.
const GUN_FILES = { pistol: 'gun-pistol', rifle: 'gun-rifle', shotgun: 'gun-shotgun', axe: 'gun-axe' };
const GUN_SOCKETS = {
  pistol: { grip: [0, -0.035, -0.052], muzzle: [0, 0.034, 0.282], size: 0.9 },
  rifle: { grip: [0, -0.03, -0.042], muzzle: [0, 0.046, 0.66], size: 0.8 },
  shotgun: { grip: [0, -0.01, -0.03], muzzle: [0.004, 0.045, 0.668], size: 0.8 },
  axe: { grip: [0, 0, 0], size: 0.85 },
};
// Paint variations: hue turns (radians) applied to the painted parts only (greys, whites and metal stay)
const GUN_HUES = [0, 0, 0.7, 2.2, 3.4, 4.3, 5.2];

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
    const guns = Object.keys(GUN_FILES);
    const gunLoads = Promise.allSettled(guns.map((k) => get(GUN_FILES[k]))).then((rs) => rs.forEach((r, i) => {
      if (r.status === 'fulfilled') RIG.guns[guns[i]] = r.value.scene;
      else console.warn('Weapon model failed to load:', GUN_FILES[guns[i]], r.reason);
    }));
    return Promise.all([Promise.allSettled(names.map((n) => get(RIG_FILES[n]))), gunLoads]).then(([rs]) => rs);
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
    // glow: the model's own emissive map / colour (embers, eyes), kept instead of the lift below
    const glow = src.emissive && src.emissive.getHex() ? { map: src.emissiveMap || null, color: src.emissive.clone() } : null;
    if (src.map) capTexture(src.map);
    const normal = src.normalMap ? { map: capTexture(src.normalMap), scale: src.normalScale.clone() } : null;
    mats[m.name] = { map: src.map || null, alpha: src.alphaTest > 0 || src.transparent, id: m.name, vc: !!m.geometry.attributes.color, glow, normal };
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
  return { scene, fit, clips, mats, headSize, headLen, aimPose, gaitScale };
}

// Phones get textures no bigger than 1024 (the files carry up to 2048 for big screens).
const RIG_TEX_CAP = window.matchMedia && matchMedia('(pointer: coarse)').matches ? 1024 : 4096;
const _capped = new WeakSet();
function capTexture(tex) {
  const img = tex.image;
  if (!img || _capped.has(tex) || Math.max(img.width, img.height) <= RIG_TEX_CAP) return tex;
  const k = RIG_TEX_CAP / Math.max(img.width, img.height);
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  tex.image = c; _capped.add(tex); tex.needsUpdate = true;
  return tex;
}
// Character and weapon shading on top of the cel bands: four light steps (the world uses three),
// ink-dark creases wherever the normal map bends the surface away from the mesh (folds, seams,
// muscle), and a thin rim of light along the silhouette.
const rigGradTex = (() => {
  const d = new Uint8Array([64, 64, 64, 255, 118, 118, 118, 255, 178, 178, 178, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
})();
const RIG_DETAIL = `{
    float crease = 1.0 - clamp(dot(normal, geometryNormal), 0.0, 1.0);
    float rim = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
    outgoingLight *= 1.0 - smoothstep(0.012, 0.09, crease) * 0.4;
    outgoingLight += diffuseColor.rgb * smoothstep(0.6, 0.78, rim) * 0.32;
  }
  #include <output_fragment>`;
function rigDetail(sh) { sh.fragmentShader = sh.fragmentShader.replace('#include <output_fragment>', RIG_DETAIL); }
const _rigMatCache = new Map();
function rigMaterial(baseName, info, tint, style) {
  const key = baseName + '_' + info.id + '_' + tint + '_' + style;
  let mat = _rigMatCache.get(key);
  if (!mat && style === 'clown') { mat = clownMaterial(info); _rigMatCache.set(key, mat); }
  if (!mat) {
    mat = new THREE.MeshToonMaterial({ map: info.map, gradientMap: rigGradTex, skinning: true, vertexColors: info.vc });
    mat.onBeforeCompile = rigDetail;
    // lift dark textures a little so faces and clothes read under the cel shading
    if (info.map) { mat.emissiveMap = info.map; mat.emissive = new THREE.Color(0xffffff); mat.emissiveIntensity = 0.24; }
    if (info.glow) { mat.emissiveMap = info.glow.map; mat.emissive = info.glow.color; mat.emissiveIntensity = 1; }
    if (info.alpha) { mat.alphaTest = 0.5; mat.side = THREE.DoubleSide; }
    // surface detail (folds, seams, muscle) from the model's normal map, read through the cel bands
    if (info.normal) { mat.normalMap = info.normal.map; mat.normalScale.copy(info.normal.scale); }
    if (tint == null) { _rigMatCache.set(key, mat); return mat; }
    // Dye the dark parts of the texture (clothes) and keep the lighter ones (skin, prints) as they are.
    const uTint = { value: new THREE.Color(tint) };
    mat.onBeforeCompile = (sh) => {
      rigDetail(sh);
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
// Bloody clown restyle for a Mixamo body. Per-vertex data from the bind pose drives a shader:
// aBind = position in metres, aZone = 0 torso, 1 legs, 2 arms, 3 head, aFace = position on the head
// (x to its left, y up, z forward, in head lengths). Patterns live on the body, not the texture, so
// they don't break at texture seams.
const _attrScale = (a) => { if (!a.normalized) return 1; const r = a.array; return r instanceof Int16Array ? 1 / 32767 : r instanceof Uint16Array ? 1 / 65535 : r instanceof Int8Array ? 1 / 127 : r instanceof Uint8Array ? 1 / 255 : 1; };
function prepareClownBody(base) {
  if (base.clownReady) return;
  const sc = base.scene;
  sc.updateMatrixWorld(true);
  const head = sc.getObjectByName('mixamorigHead');
  const hc = head.getWorldPosition(new THREE.Vector3()).multiplyScalar(base.fit);
  const L = base.headLen || 0.25;
  hc.y += L * 0.45; // middle of the face
  const v = new THREE.Vector3();
  sc.traverse((m) => {
    if (!m.isSkinnedMesh || m.userData.outline || m.geometry.attributes.aZone) return;
    const g = m.geometry, P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
    const ps = _attrScale(P), ws = _attrScale(SW);
    const names = m.skeleton.bones.map((b) => b.name);
    const bind = new Float32Array(P.count * 3), zone = new Float32Array(P.count), face = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) {
      v.set(P.getX(i) * ps, P.getY(i) * ps, P.getZ(i) * ps).applyMatrix4(m.matrixWorld).multiplyScalar(base.fit);
      bind[i * 3] = v.x; bind[i * 3 + 1] = v.y; bind[i * 3 + 2] = v.z;
      let best = 0, bw = -1;
      for (let j = 0; j < 4; j++) {
        const w = (j === 0 ? SW.getX(i) : j === 1 ? SW.getY(i) : j === 2 ? SW.getZ(i) : SW.getW(i)) * ws;
        if (w > bw) { bw = w; best = j === 0 ? SI.getX(i) : j === 1 ? SI.getY(i) : j === 2 ? SI.getZ(i) : SI.getW(i); }
      }
      const n = names[best] || '';
      const z = /Head|Neck/.test(n) ? 3 : /Arm|Shoulder|Hand/.test(n) ? 2 : /Leg|Foot|Toe|Hips/.test(n) ? 1 : 0;
      zone[i] = z;
      face[i * 3] = (v.x - hc.x) / L; face[i * 3 + 1] = (v.y - hc.y) / L; face[i * 3 + 2] = (v.z - hc.z) / L;
    }
    g.setAttribute('aBind', new THREE.BufferAttribute(bind, 3));
    g.setAttribute('aZone', new THREE.BufferAttribute(zone, 1));
    g.setAttribute('aFace', new THREE.BufferAttribute(face, 3));
  });
  base.clownReady = true;
}
const CLOWN_NOISE = `
  float cHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float cNoise(vec3 x) {
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(cHash(i), cHash(i + vec3(1,0,0)), f.x), mix(cHash(i + vec3(0,1,0)), cHash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(cHash(i + vec3(0,0,1)), cHash(i + vec3(1,0,1)), f.x), mix(cHash(i + vec3(0,1,1)), cHash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }`;
function clownMaterial(info) {
  const mat = new THREE.MeshToonMaterial({ map: info.map, gradientMap: rigGradTex, skinning: true, vertexColors: info.vc });
  if (info.alpha) { mat.alphaTest = 0.5; mat.side = THREE.DoubleSide; }
  if (info.normal) { mat.normalMap = info.normal.map; mat.normalScale.copy(info.normal.scale); }
  mat.onBeforeCompile = (sh) => {
    rigDetail(sh);
    sh.vertexShader = 'attribute vec3 aBind;\nattribute float aZone;\nattribute vec3 aFace;\nvarying vec3 vBind;\nvarying float vZone;\nvarying vec3 vFace;\n' +
      sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvBind = aBind; vZone = aZone; vFace = aFace;');
    sh.fragmentShader = 'varying vec3 vBind;\nvarying float vZone;\nvarying vec3 vFace;\n' + CLOWN_NOISE + '\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      vec3 c = diffuseColor.rgb;
      float lum = dot(c, vec3(0.299, 0.587, 0.114));
      bool skin = c.r > c.b * 1.2 && c.r > 0.3 && c.g > c.b * 0.85;
      vec3 cream = vec3(0.93, 0.89, 0.78), red = vec3(0.78, 0.07, 0.08);
      if (vZone > 2.5) {
        // greasepaint face: white over skin, a wide red grin, blue diamonds over the eyes
        if (lum > 0.05) c = vec3(0.96, 0.95, 0.92) * (0.88 + lum * 0.25);
        vec3 f = vFace;
        if (f.z > -0.05) {
          float grinY = -0.5 + 0.35 * f.x * f.x;
          if (abs(f.x) < 0.42 && abs(f.y - grinY) < 0.07) c = red;
          vec2 e = vec2(abs(f.x) - 0.2, f.y - 0.12);
          if (abs(e.x) * 1.6 + abs(e.y) < 0.13) c = vec3(0.12, 0.25, 0.75);
        }
      } else if (!skin) {
        if (vZone > 0.5 && vZone < 1.5) {
          // baggy red and cream striped pants
          float st = step(0.5, fract(vBind.x * 15.0 + vBind.z * 4.0));
          c = mix(cream, red, st) * (0.7 + lum * 0.9);
        } else if (vZone < 0.5) {
          // grimy cream shirt with faded red dots
          float dots = step(0.72, cNoise(vBind * 9.0));
          c = mix(cream * (0.75 + lum * 0.6), red * 0.9, dots * 0.8);
        }
      }
      // blood: splatter plus drips running down, heaviest on the front of the torso and hands
      float n = cNoise(vBind * 5.5) * 0.6 + cNoise(vec3(vBind.x * 9.0, vBind.y * 2.2, vBind.z * 9.0)) * 0.4;
      float heavy = (vZone < 0.5 || vZone > 1.5) ? 0.0 : 0.05;
      float blood = smoothstep(0.53 + heavy, 0.6 + heavy, n);
      c = mix(c, vec3(0.42, 0.02, 0.03) * (0.75 + lum * 0.4), blood * 0.92);
      diffuseColor.rgb = c;
      totalEmissiveRadiance += c * 0.22;`);
  };
  mat.customProgramCacheKey = () => 'rigClown';
  return mat;
}
function rigClownGear() {
  const g = new THREE.Group();
  // red nose
  const nose = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 1), toon(0xd81a1a)); nose.position.set(0, 0.1, 0.13); addOutline(nose, 1.15); g.add(nose);
  // spiky red hair tufts on both sides
  for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 5), toon(0xc0141a));
    const a = (i / 5 - 0.5) * 1.6;
    c.position.set(sx * 0.13, 0.17 + Math.sin(a) * 0.07, -0.02 + Math.cos(a) * 0.04 - 0.04);
    c.rotation.set(Math.sin(a) * 0.6, 0, -sx * (1.0 + Math.cos(a) * 0.3));
    addOutline(c, 1.1); g.add(c);
  }
  return g;
}
function rigRuffle() {
  const g = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const b = box(0.09, 0.07, 0.05, i % 2 ? 0xf0ece0 : 0xc8141a, Math.sin(a) * 0.15, 0.04, Math.cos(a) * 0.13, g, 0.01);
    b.rotation.y = a; b.rotation.x = 0.5;
  }
  return g;
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
// the block-built stand-in when a weapon model didn't load
const blockGun = (kind) => rigWeapon(kind === 'pistol' ? 'smg' : kind === 'shotgun' ? 'rifle' : kind);
// A weapon model for the hand, in the same frame as rigWeapon (right hand reaching along -X, or +X
// when `left`), with its grip in the fist. Returns the group and its muzzle point (null for the axe).
const _gunMats = new Map();
let _gunOutline = null;
function gunMaterial(src, hue) {
  const key = src.name + '_' + hue;
  let m = _gunMats.get(key);
  if (m) return m;
  m = new THREE.MeshToonMaterial({ gradientMap: rigGradTex, vertexColors: true });
  m.onBeforeCompile = rigDetail;
  if (src.emissive && src.emissive.getHex()) { m.emissive = src.emissive.clone(); m.emissiveIntensity = 0.8; }
  else { m.emissive = new THREE.Color(0xffffff); m.emissiveIntensity = 0.12; } // lift, like the bodies
  if (src.name === 'Paint' && hue) {
    // turn the hue about the grey axis: saturated paint changes colour, white, black and grey don't
    m.onBeforeCompile = (sh) => {
      rigDetail(sh);
      sh.uniforms.uHue = { value: hue };
      sh.fragmentShader = 'uniform float uHue;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        { vec3 k = vec3(0.57735); float c = cos(uHue), s = sin(uHue);
          diffuseColor.rgb = clamp(diffuseColor.rgb * c + cross(k, diffuseColor.rgb) * s + k * dot(k, diffuseColor.rgb) * (1.0 - c), 0.0, 1.0); }`);
    };
    m.customProgramCacheKey = () => 'gunhue' + hue;
  }
  _gunMats.set(key, m);
  return m;
}
function rigGun(kind, left = false) {
  const src = RIG.guns[kind], sock = GUN_SOCKETS[kind];
  if (!src || !sock) return null;
  if (!_gunOutline) { _gunOutline = rigOutlineMaterial(0.007); _gunOutline.skinning = false; }
  const hue = pick(GUN_HUES);
  const gun = src.clone();
  const meshes = [];
  gun.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    o.material = gunMaterial(o.material, hue);
    o.castShadow = true;
    o.add(new THREE.Mesh(o.geometry, _gunOutline));
  }
  const muzzle = sock.muzzle ? new THREE.Object3D() : null;
  if (muzzle) { muzzle.position.fromArray(sock.muzzle); gun.add(muzzle); }
  const g = new THREE.Group(), w = new THREE.Group();
  g.add(w); w.add(gun);
  const size = sock.size * rand(0.93, 1.07);
  gun.scale.setScalar(size);
  gun.position.fromArray(sock.grip).multiplyScalar(-size); // grip socket on w's origin
  const sx = left ? -1 : 1;
  if (kind === 'axe') {
    // handle (+Y) through the fist along +Z, blade (+Z) up
    w.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)));
    w.position.set(-0.06 * sx, -0.03, 0);
  } else {
    // barrel along the fingers, grip in the curled fist just below the hand bone
    w.rotation.y = -Math.PI / 2 * sx;
    w.position.set(-0.07 * sx, -0.05, 0);
  }
  return { group: g, inner: w, muzzle };
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
  const muzzles = [];
  for (const hand of [bones.rhand, bones.lhand]) {
    const made = rigGun(kind);
    const gun = made ? made.group : blockGun(kind);
    const inner = made ? made.inner : gun.children[0];
    if (made) { inner.rotation.set(0, Math.PI, 0); inner.position.set(0, -0.04, 0.02); muzzles.push(made.muzzle); } // model barrel (+Z) to -Z
    else { inner.rotation.set(0, 0, 0); inner.position.set(0, -0.02, 0.05); }
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
  return muzzles.length === 2 ? muzzles : null;
}

function makeRigEnemy(key, def) {
  const look = RIG_LOOKS[key];
  const baseName = pick(look.bases);
  const tint = look.cloth ? pick(look.cloth) : null;
  const base = RIG.base[baseName];
  if (look.style === 'clown') prepareClownBody(base);
  const model = THREE.SkeletonUtils.clone(base.scene);
  model.scale.setScalar(base.fit);
  model.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    if (o.userData.outline) return;
    if (look.mask && look.mask !== 'goggles' && /Eye|Brow|Lash|Mouth|Facial/i.test(o.name)) { o.visible = false; return; } // masked
    const info = base.mats[o.name];
    if (info) o.material = rigMaterial(baseName, info, tint, look.style);
  });
  const root = new THREE.Group();
  root.add(model);
  root.updateMatrixWorld(true);
  const bone = (n) => model.getObjectByName('mixamorig' + n);
  const bones = { head: bone('Head'), spine: bone('Spine2'), hips: bone('Hips'), rhand: bone('RightHand'), lhand: bone('LeftHand') };
  if (look.mask) pinToBone(bones.head, rigMask(look.mask), base.headSize);
  if (look.mohawk) pinToBone(bones.head, rigMohawk(), base.headSize);
  if (look.style === 'clown') {
    pinToBone(bones.head, rigClownGear(), base.headSize);
    const neck = model.getObjectByName('mixamorigNeck');
    if (neck) pinToBone(neck, rigRuffle(), base.headSize);
  }
  const gunKind = Array.isArray(look.weapon) ? pick(look.weapon) : look.weapon;
  let muzzles = null;
  if (look.dual) muzzles = pinDualGuns(model, base, bones, gunKind);
  else if (gunKind) {
    const made = rigGun(gunKind);
    pinToBone(bones.rhand, made ? made.group : blockGun(gunKind), 1, handAlign(bones.rhand));
    if (made && made.muzzle) muzzles = [made.muzzle];
  }
  if (look.armor) pinToBone(bones.spine, rigArmor());
  if (look.pod) pinToBone(bones.spine, rigPod());
  const mixer = new THREE.AnimationMixer(model);
  const aimBones = [];
  const aimPose = look.dual ? dualAimPose(base) : base.aimPose;
  model.traverse((o) => { if (o.isBone && aimPose[o.name]) aimBones.push([o, aimPose[o.name]]); });
  const rig = { model, mixer, clips: base.clips, bones, actions: {}, loop: null, one: null, lastState: null, baseName, aimBones, aimW: 0, gait: base.gaitScale, dual: !!look.dual, gun: gunKind, muzzles };
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

// Upper-body layer: a clip on the chest, arms and head only, over whatever the legs are doing
// (reloads, hit reactions). A second mixer writes those bones after the main one; it's blended in
// and out from the pose underneath.
function rigUpper(R, name, ts = 1, start = 0, end = Infinity) {
  const base = RIG.base[R.baseName];
  base.upper = base.upper || {};
  let clip = base.upper[name];
  if (!clip) {
    const c = R.clips[name];
    if (!c) return;
    clip = base.upper[name] = new THREE.AnimationClip(name + ' (upper)', c.duration, c.tracks.filter((t) => RIG_UPPER.test(t.name.split('.')[0])));
  }
  if (!R.mixer2) {
    R.mixer2 = new THREE.AnimationMixer(R.model);
    R.upBones = [];
    R.model.traverse((o) => { if (o.isBone && RIG_UPPER.test(o.name)) R.upBones.push([o, new THREE.Quaternion()]); });
  }
  if (R.up) R.up.action.stop();
  const a = R.mixer2.clipAction(clip);
  a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true;
  a.time = start; a.timeScale = ts; a.play();
  R.up = { action: a, end: Math.min(end, clip.duration), name };
  R.upW = R.upW || 0;
}
const _uq = new THREE.Quaternion();
function rigUpperApply(R, dt) {
  const a = R.up.action, done = a.time >= R.up.end - 1e-3 || R.one;
  R.upW = clamp(R.upW + (done ? -dt : dt) * 7, 0, 1);
  if (done && R.upW === 0) { a.stop(); R.up = null; return; }
  for (const [b, q] of R.upBones) q.copy(b.quaternion);
  R.mixer2.update(dt);
  if (R.upW < 1) for (const [b, q] of R.upBones) { _uq.copy(b.quaternion); b.quaternion.copy(q).slerp(_uq, R.upW); }
}

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
  const wantAim = e.aiming && !R.one && !e.reloadT && (R.mode !== 'idle' || R.dual) && (e.def.ai === 'ranged' || e.def.ai === 'boss') && e.state === 'move';
  R.aimW = clamp(R.aimW + (wantAim ? dt : -dt) * 6, 0, 1);
  if (R.aimW > 0) for (const [b, q] of R.aimBones) b.quaternion.slerp(q, R.aimW);
  if (R.up) rigUpperApply(R, dt);
  if (e.flinchCrit && fl > 0 && !R.up) R.bones.head.rotation.x -= fl * 2.2;
}

// How fast a clip travels (m/s) and which way it steps sideways (+1 = to the character's right),
// measured from its root motion when the clips were converted.
function clipSpeed(name, fallback) {
  const c = RIG.data.clips[name];
  const v = c && c.v ? Math.hypot(c.v[0], c.v[1]) / 100 : 0;
  return v > 0.1 ? v : fallback;
}
function clipSide(name) { const c = RIG.data.clips[name]; return c && c.v && c.v[0] > 0 ? -1 : 1; }

// Gait per kind of enemy: the clips for each direction and the fastest each may be played. Forward
// has tiers, slowest first (walk, then run); the first one fast enough is used. Side steps that
// come as separate left and right clips are given as [right, left].
// ("Running" circles on the spot, so straight runs use Rifle Run.)
const GAIT = {
  gun: { fwd: [['Walk Forward rifle', 1.25], ['Rifle Run', 1.35]], back: ['Walk Backward rifle', 1.6], side: ['Rifle Side Step', 2.2], idle: 'Rifle Aiming Idle' },
  pistol: { fwd: [['Walk Forward rifle', 1.25], ['Unarmed Run Forward 2', 1.5], ['Rifle Run', 1.35]], back: ['Pistol Run Backward', 1.3], side: ['Pistol Strafe', 1.4], idle: 'Pistol Idle' },
  // gunners holding a spot behind cover crouch, and stand to fire over or around it
  cover: { fwd: [['Rifle Crouch Walk', 1.8], ['Walk Forward rifle', 1.25], ['Rifle Run', 1.35]], back: ['Walk Backward rifle', 1.6], side: [['Crouch Walk Strafe Right rifle', 'Crouch Walk Strafe Left rifle'], 1.8], idle: 'Crouch Walk Strafe Left rifle', idleFrozen: true },
  melee: { fwd: [['Mutant Run', 1.6], ['Rifle Run', 1.4]], back: ['Run Backwards', 2.0], side: ['Goalkeeper Sidestep', 1.7], idle: 'Unarmed Idle' },
  suicide: { fwd: [['Mutant Run', 1.85]], back: ['Run Backwards', 2.0], side: ['Goalkeeper Sidestep', 1.7], idle: 'Unarmed Idle' },
};
const gaitOf = (e) => {
  if (e.def.ai === 'suicide') return GAIT.suicide;
  if (e.def.ai !== 'ranged' && e.def.ai !== 'boss') return GAIT.melee;
  if (e.inCover && !e.burstLeft) return GAIT.cover;
  return e.rig && e.rig.gun === 'pistol' && !e.rig.dual ? GAIT.pistol : GAIT.gun;
};
const sideClip = (g, right) => (Array.isArray(g[0]) ? g[0][right ? 0 : 1] : g[0]);
const gaitMax = (e, g) => clipSpeed(Array.isArray(g[0]) ? g[0][0] : g[0], 1) * g[1] * e.def.scale * e.rig.gait;

// Keep a rigged enemy no faster than its legs can carry it in the direction it's moving
// relative to where it faces, so the feet never skate. Called on normal movement only.
function rigClampVelocity(e) {
  const G = gaitOf(e);
  const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw);
  let vf = e.vel.x * fx + e.vel.z * fz, vr = -e.vel.x * fz + e.vel.z * fx;
  const fMax = gaitMax(e, G.fwd[G.fwd.length - 1]), bMax = gaitMax(e, G.back), sMax = gaitMax(e, G.side);
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
  const cap = (g) => clipSpeed(g[0], 1) * sc * R.gait * g[1];
  let mode = speed < 0.35 * sc ? 'idle' : Math.abs(vr) > Math.abs(vf) ? 'side' : vf > 0 ? 'fwd' : 'back';
  if (mode === 'fwd') { let i = 0; while (i < G.fwd.length - 1 && vf > cap(G.fwd[i]) * 0.92) i++; mode = 'fwd' + i; }
  mode += G === GAIT.cover ? 'c' : '';
  // a short hold so brief wobbles don't flip clips back and forth
  if (R.mode && mode !== R.mode) { R.modeT = (R.modeT || 0) + dt; if (R.modeT < 0.15) mode = R.mode; else R.modeT = 0; }
  else R.modeT = 0;
  R.mode = mode;
  const play = (g, v) => clamp(Math.abs(v) / (clipSpeed(g[0], 1) * sc * R.gait), 0.4, g[1]);
  if (mode.startsWith('idle')) {
    if (gun && R.dual) rigLoop(R, 'Backwards Rifle Walk', 0); // a standing frame that faces straight ahead
    else if (G.idleFrozen) rigLoop(R, G.idle, 0); // crouched behind cover
    else rigLoop(R, G.idle, 1);
  } else if (mode.startsWith('fwd')) {
    const g = G.fwd[Math.min(+mode[3], G.fwd.length - 1)];
    if (gun && e.burstLeft > 0 && vf < clipSpeed('Shoot Rifle', 1.9) * sc * 1.3) rigLoop(R, 'Shoot Rifle', play(['Shoot Rifle', 1.3], vf)); // walk and shoot
    else rigLoop(R, g[0], play(g, vf));
  } else if (mode.startsWith('back')) {
    rigLoop(R, G.back[0], play(G.back, vf));
  } else {
    const name = sideClip(G.side, vr > 0);
    const ts = play([name, G.side[1]], vr);
    rigLoop(R, name, Math.sign(vr) === clipSide(name) ? ts : -ts);
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
