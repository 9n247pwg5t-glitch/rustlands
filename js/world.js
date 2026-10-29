'use strict';
// Renderer, cel-shaded materials, the arena (terrain + props), collision and
// raycasting against the world, and visual effects (particles, tracers, explosions).

const renderer = new THREE.WebGLRenderer({ antialias: !IS_TOUCH, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, IS_TOUCH ? 1.3 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.autoClear = false;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const FOG_COLOR = new THREE.Color(0xe9b07c);
scene.fog = new THREE.Fog(FOG_COLOR, 70, 230);
scene.background = FOG_COLOR;

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 700);
camera.rotation.order = 'YXZ';
scene.add(camera);

// Viewmodel gets its own scene so the gun never clips into walls.
const vmScene = new THREE.Scene();
const vmCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 10);
vmScene.add(new THREE.HemisphereLight(0xfff1dc, 0x6b4a33, 0.85));
const vmSun = new THREE.DirectionalLight(0xffffff, 0.75); vmSun.position.set(1, 2, 1.5); vmScene.add(vmSun);
const vmFlash = new THREE.PointLight(0xffc070, 0, 3); vmScene.add(vmFlash);

// ---------------------------------------------------------------------------
// Sky dome
const SUN_DIR = new THREE.Vector3(0.45, 0.62, -0.64).normalize();
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(600, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sunDir: { value: SUN_DIR } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vDir; uniform vec3 sunDir;
      void main(){
        float h = clamp(vDir.y, -0.2, 1.0);
        vec3 horizon = vec3(0.95, 0.70, 0.48);
        vec3 mid = vec3(0.55, 0.74, 0.86);
        vec3 zenith = vec3(0.18, 0.47, 0.75);
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.25, h));
        col = mix(col, zenith, smoothstep(0.25, 0.9, h));
        float s = dot(normalize(vDir), sunDir);
        col = mix(col, vec3(1.0, 0.97, 0.85), smoothstep(0.9965, 0.998, s));
        col += vec3(1.0, 0.8, 0.5) * pow(max(s, 0.0), 24.0) * 0.25;
        // flat comic cloud streaks
        float az = atan(vDir.z, vDir.x);
        float lo = 0.1 + 0.04 * sin(az * 13.0) + 0.03 * sin(az * 5.0 + 1.0);
        float hi = lo + 0.025 + 0.03 * max(0.0, sin(az * 3.0 + 0.7));
        float streak = step(lo, h) * step(h, hi) * step(0.15, sin(az * 4.0 + 1.3 * sin(az * 9.0)));
        col = mix(col, vec3(1.0, 0.94, 0.86), streak * 0.7);
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
);
sky.renderOrder = -1;
scene.add(sky);

// Distant mesas silhouettes
(function () {
  const mat = new THREE.MeshBasicMaterial({ color: 0xc98f62, fog: false });
  const rng = makeRng(77);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * TAU + rng() * 0.2;
    const r = 330 + rng() * 60;
    const w = 30 + rng() * 60, h = 20 + rng() * 45;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.6, w, h, 6), mat);
    m.position.set(Math.cos(a) * r, h / 2 - 4, Math.sin(a) * r);
    scene.add(m);
  }
})();

// ---------------------------------------------------------------------------
// Lights
const hemi = new THREE.HemisphereLight(0xcfe8ff, 0xb06a3c, 0.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 1.0);
sun.castShadow = true;
sun.shadow.mapSize.set(IS_TOUCH ? 1024 : 2048, IS_TOUCH ? 1024 : 2048);
const SC = 45;
Object.assign(sun.shadow.camera, { left: -SC, right: SC, top: SC, bottom: -SC, near: 1, far: 160 });
sun.shadow.bias = -0.0008;
scene.add(sun); scene.add(sun.target);

// Pool of point lights for muzzle flashes and explosions. Lights are never added
// or removed at runtime because that forces every shader to recompile.
const flashLights = [];
for (let i = 0; i < 3; i++) {
  const l = new THREE.PointLight(0xffa040, 0, 14, 2);
  scene.add(l); flashLights.push({ light: l, t: 0, dur: 1, peak: 0 });
}
let flashIdx = 0;
function flashAt(pos, color, intensity, range, dur) {
  const f = flashLights[flashIdx++ % flashLights.length];
  f.light.position.copy(pos); f.light.color.setHex(color); f.light.distance = range;
  f.peak = intensity; f.t = 0; f.dur = dur; f.light.intensity = intensity;
}

// ---------------------------------------------------------------------------
// Cel-shaded materials and comic outlines (inverted hull)
const gradTex = (() => {
  const d = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
})();
const _toonCache = new Map();
function toon(color, emissive = 0) {
  const key = color + '_' + emissive;
  let m = _toonCache.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap: gradTex });
    if (emissive) { m.emissive = new THREE.Color(emissive); }
    _toonCache.set(key, m);
  }
  return m;
}
const _basicCache = new Map();
function glow(color, opacity = 1, additive = false) {
  const key = color + '_' + opacity + '_' + additive;
  let m = _basicCache.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1 || additive, opacity, depthWrite: !(opacity < 1 || additive) });
    if (additive) m.blending = THREE.AdditiveBlending;
    _basicCache.set(key, m);
  }
  return m;
}
const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x1c110a, side: THREE.BackSide });

const _geoCache = new Map();
function boxGeo(w, h, d) {
  const k = 'b' + w + '_' + h + '_' + d;
  let g = _geoCache.get(k);
  if (!g) { g = new THREE.BoxGeometry(w, h, d); _geoCache.set(k, g); }
  return g;
}
function cylGeo(rt, rb, h, seg = 10) {
  const k = 'c' + rt + '_' + rb + '_' + h + '_' + seg;
  let g = _geoCache.get(k);
  if (!g) { g = new THREE.CylinderGeometry(rt, rb, h, seg); _geoCache.set(k, g); }
  return g;
}

// A box with an ink outline. Returns the mesh (outline is a child).
function box(w, h, d, color, x = 0, y = 0, z = 0, parent = null, ol = 0.04, mat = null) {
  const g = boxGeo(w, h, d);
  const m = new THREE.Mesh(g, mat || toon(color));
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (ol > 0) {
    const o = new THREE.Mesh(g, OUTLINE_MAT);
    o.scale.set((w + ol * 2) / w, (h + ol * 2) / h, (d + ol * 2) / d);
    m.add(o);
  }
  if (parent) parent.add(m);
  return m;
}
function cyl(rt, rb, h, color, x = 0, y = 0, z = 0, parent = null, ol = 0.04, seg = 10, mat = null) {
  const g = cylGeo(rt, rb, h, seg);
  const m = new THREE.Mesh(g, mat || toon(color));
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (ol > 0) {
    const r = Math.max(rt, rb);
    const o = new THREE.Mesh(g, OUTLINE_MAT);
    o.scale.set((r + ol) / r, (h + ol * 2) / h, (r + ol) / r);
    m.add(o);
  }
  if (parent) parent.add(m);
  return m;
}
function addOutline(mesh, scale) {
  const o = new THREE.Mesh(mesh.geometry, OUTLINE_MAT);
  o.scale.setScalar(scale);
  mesh.add(o);
  return o;
}

// ---------------------------------------------------------------------------
// Terrain: a dusty basin ringed by cliffs.
const ARENA_R = 84;          // playable radius
const WORLD_SIZE = 300, SEG = 150;
const CELL = WORLD_SIZE / SEG;
function rawHeight(x, z) {
  const r = Math.hypot(x, z);
  let h = fbm(x * 0.025, z * 0.025) * 5 + fbm(x * 0.09 + 7, z * 0.09 - 3, 2) * 0.7;
  h *= smoothstep(8, 55, r) * 0.85 + 0.15;
  const c = smoothstep(76, 104, r);
  h += c * c * 34 + c * fbm(x * 0.06, z * 0.06) * 12;
  return h;
}
const HMAP = new Float32Array((SEG + 1) * (SEG + 1));
const terrainGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, SEG, SEG);
terrainGeo.rotateX(-Math.PI / 2);
(function buildTerrain() {
  const pos = terrainGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = rawHeight(x, z);
    pos.setY(i, y);
    const gx = Math.round((x + WORLD_SIZE / 2) / CELL), gz = Math.round((z + WORLD_SIZE / 2) / CELL);
    HMAP[gz * (SEG + 1) + gx] = y;
  }
  terrainGeo.computeVertexNormals();
  const nrm = terrainGeo.attributes.normal;
  const cols = new Float32Array(pos.count * 3);
  const sandA = [0.93, 0.71, 0.46], sandB = [0.85, 0.6, 0.38], rockA = [0.66, 0.38, 0.26], rockB = [0.5, 0.28, 0.21], dark = [0.75, 0.5, 0.33];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const slope = 1 - nrm.getY(i);
    let c;
    if (slope > 0.3 || y > 13) c = (Math.floor(y / 2.6) % 2 === 0) ? rockA : rockB;
    else if (slope > 0.16) c = dark;
    else c = vnoise(x * 0.12, z * 0.12) > 0.25 ? sandB : sandA;
    cols[i * 3] = c[0]; cols[i * 3 + 1] = c[1]; cols[i * 3 + 2] = c[2];
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
})();
const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradTex }));
terrain.receiveShadow = true;
scene.add(terrain);

function groundAt(x, z) {
  const fx = (x + WORLD_SIZE / 2) / CELL, fz = (z + WORLD_SIZE / 2) / CELL;
  const ix = clamp(Math.floor(fx), 0, SEG - 1), iz = clamp(Math.floor(fz), 0, SEG - 1);
  const tx = clamp(fx - ix, 0, 1), tz = clamp(fz - iz, 0, 1);
  const W = SEG + 1;
  const a = HMAP[iz * W + ix], b = HMAP[iz * W + ix + 1], c = HMAP[(iz + 1) * W + ix], d = HMAP[(iz + 1) * W + ix + 1];
  return lerp(lerp(a, b, tx), lerp(c, d, tx), tz);
}

// ---------------------------------------------------------------------------
// Colliders. Boxes are axis-aligned; rocks are spheres.
const boxCols = [];
const sphCols = [];
function addBoxCol(cx, cz, w, d, y0, y1, ref = null) {
  const c = { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, minY: y0, maxY: y1, ref };
  boxCols.push(c); return c;
}

const props = new THREE.Group();
scene.add(props);
const barrels = [];
const spawnPoints = [];
const interactables = []; // vending machines, chests

function rotXZ(x, z, rot) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return [x * c - z * s, x * s + z * c];
}

function buildShack(x, z, rot, rng) {
  const g = new THREE.Group();
  const y = groundAt(x, z);
  g.position.set(x, y, z); g.rotation.y = rot;
  const W = 6 + rng() * 2, D = 5 + rng() * 1.5, H = 3.4;
  const metal = pick([0xa1593a, 0x8b6b4a, 0x7c8a8a, 0xb07a3a]);
  // three walls + open front
  box(W, H, 0.2, metal, 0, H / 2 - 0.3, -D / 2, g);
  box(0.2, H, D, metal, -W / 2, H / 2 - 0.3, 0, g);
  box(0.2, H, D, metal, W / 2, H / 2 - 0.3, 0, g);
  box(W * 0.3, H, 0.2, metal, -W * 0.35, H / 2 - 0.3, D / 2, g);
  box(W * 0.3, H, 0.2, metal, W * 0.35, H / 2 - 0.3, D / 2, g);
  const roof = box(W + 0.8, 0.15, D + 1, 0x6d4630, 0, H - 0.1, 0, g);
  roof.rotation.x = 0.08;
  // corrugation stripes
  for (let i = -2; i <= 2; i++) box(0.08, H * 0.9, 0.05, 0x5a3322, i * W * 0.18, H / 2 - 0.3, -D / 2 - 0.13, g, 0);
  // sign
  box(2.2, 0.6, 0.1, 0xe8d24a, 0, H + 0.4, D / 2 + 0.2, g);
  props.add(g);
  // colliders (walls) – rotation is a multiple of 90deg so boxes stay axis-aligned
  const walls = [[0, -D / 2, W, 0.3], [-W / 2, 0, 0.3, D], [W / 2, 0, 0.3, D], [-W * 0.35, D / 2, W * 0.3, 0.3], [W * 0.35, D / 2, W * 0.3, 0.3]];
  for (const [lx, lz, w, d] of walls) {
    const [ox, oz] = rotXZ(lx, lz, -rot);
    const swap = Math.abs(Math.sin(rot)) > 0.5;
    addBoxCol(x + ox, z + oz, swap ? d : w, swap ? w : d, y - 1, y + H - 0.2);
  }
  // roof you can stand on
  const swap = Math.abs(Math.sin(rot)) > 0.5;
  addBoxCol(x, z, swap ? D : W, swap ? W : D, y + H - 0.4, y + H);
}

function buildCrate(x, z, s, rng) {
  const y = groundAt(x, z);
  const c = box(s, s, s, pick([0x9c6b3e, 0x7f8f4a, 0xb08a52]), x, y + s / 2, z, props, 0.04);
  c.rotation.y = 0;
  box(s * 1.02, s * 0.12, s * 1.02, 0x4b3b2a, 0, s * 0.3, 0, c, 0);
  box(s * 1.02, s * 0.12, s * 1.02, 0x4b3b2a, 0, -s * 0.3, 0, c, 0);
  addBoxCol(x, z, s, s, y, y + s);
  return y + s;
}

function buildWall(x, z, len, rot) {
  const y = groundAt(x, z);
  const vertical = Math.abs(Math.sin(rot)) > 0.5;
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const n = Math.round(len / 1.4);
  for (let i = 0; i < n; i++) {
    const h = 1.3 + Math.random() * 0.5;
    const p = box(1.35, h, 0.25, pick([0x8a5a3c, 0x9a9a8c, 0x6f4b33, 0xa77a40]), -len / 2 + 0.7 + i * 1.4, h / 2 - 0.1, (Math.random() - 0.5) * 0.1, g, 0.04);
    p.rotation.z = (Math.random() - 0.5) * 0.1;
  }
  props.add(g);
  addBoxCol(x, z, vertical ? 0.5 : len, vertical ? len : 0.5, y - 1, y + 1.45);
}

function buildRock(x, z, r, rng) {
  const y = groundAt(x, z);
  const geo = new THREE.DodecahedronGeometry(r, 0);
  const m = new THREE.Mesh(geo, toon(pick([0x9b5a3c, 0x8a4c33, 0xae6a45])));
  m.scale.set(1 + rng() * 0.4, 0.65 + rng() * 0.4, 1 + rng() * 0.4);
  m.rotation.set(rng() * 3, rng() * 3, rng() * 3);
  m.position.set(x, y + r * 0.35, z);
  m.castShadow = true; m.receiveShadow = true;
  addOutline(m, 1.05);
  props.add(m);
  const er = r * Math.max(m.scale.x, m.scale.z) * 0.85;
  sphCols.push({ x, y: y + r * 0.35, z, r: er, top: y + r * 0.35 + r * m.scale.y * 0.8 });
}

function buildCar(x, z, rot) {
  const y = groundAt(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const col = pick([0x4f7a8a, 0xa3402e, 0x7b6a2e]);
  box(4.4, 0.9, 2.1, col, 0, 0.75, 0, g);
  box(2.2, 0.7, 1.9, col, -0.3, 1.5, 0, g);
  box(1.95, 0.5, 1.95, 0x2a3a40, -0.3, 1.5, 0, g, 0);
  for (const [wx, wz] of [[1.4, 1.05], [-1.4, 1.05], [1.4, -1.05], [-1.4, -1.05]]) {
    const w = cyl(0.42, 0.42, 0.3, 0x222222, wx, 0.42, wz, g, 0.03, 12);
    w.rotation.x = Math.PI / 2;
  }
  box(0.3, 0.2, 2.2, 0x9a9a9a, 2.25, 0.6, 0, g);
  g.rotation.z = (Math.random() - 0.5) * 0.1;
  props.add(g);
  const vertical = Math.abs(Math.sin(rot)) > 0.5;
  addBoxCol(x, z, vertical ? 2.1 : 4.4, vertical ? 4.4 : 2.1, y, y + 1.85);
}

function buildBarrel(x, z) {
  const y = groundAt(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z);
  cyl(0.42, 0.42, 1.1, 0xd23a26, 0, 0.55, 0, g, 0.04, 12);
  cyl(0.43, 0.43, 0.15, 0xf2c230, 0, 0.75, 0, g, 0, 12);
  cyl(0.43, 0.43, 0.15, 0xf2c230, 0, 0.3, 0, g, 0, 12);
  box(0.3, 0.3, 0.02, 0xffffff, 0, 0.55, 0.43, g, 0);
  props.add(g);
  const b = { group: g, x, y, z, hp: 25, alive: true, col: null };
  b.col = addBoxCol(x, z, 0.8, 0.8, y, y + 1.1, b);
  barrels.push(b);
}

function buildTower(x, z) {
  const y = groundAt(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z);
  for (const [lx, lz] of [[1.5, 1.5], [-1.5, 1.5], [1.5, -1.5], [-1.5, -1.5]]) box(0.25, 9, 0.25, 0x5a4030, lx, 4.5, lz, g);
  cyl(2.4, 2.4, 3.2, 0x8f6a45, 0, 10.6, 0, g, 0.06, 14);
  cyl(2.6, 0.3, 1.2, 0x5a3a28, 0, 12.8, 0, g, 0.05, 14);
  box(3.4, 0.2, 3.4, 0x5a4030, 0, 8.9, 0, g);
  props.add(g);
  addBoxCol(x, z, 3.5, 3.5, y, y + 8.9);
}

function buildSpawnGate(x, z) {
  const y = groundAt(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z);
  g.lookAt(0, y, 0);
  box(0.4, 5, 0.4, 0x4a3426, -3, 2.5, 0, g);
  box(0.4, 5, 0.4, 0x4a3426, 3, 2.5, 0, g);
  box(6.8, 0.5, 0.4, 0x4a3426, 0, 4.8, 0, g);
  const flag = box(1.4, 0.9, 0.05, 0xc0392b, -3, 5.6, 0, g, 0.03);
  box(0.5, 0.5, 0.06, 0xffffff, 0, 0, 0.01, flag, 0);
  // skull totems
  box(0.5, 0.45, 0.45, 0xf0e6d0, 3, 5.4, 0, g, 0.03);
  props.add(g);
  spawnPoints.push(new THREE.Vector3(x, y, z));
}

function buildVending(x, z, rot, kind) {
  const y = groundAt(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const body = kind === 'ammo' ? 0x3a6db0 : 0xb03a4a;
  box(1.6, 2.6, 1.0, body, 0, 1.3, 0, g, 0.05);
  box(1.2, 1.0, 0.05, 0x111111, 0, 1.75, 0.5, g, 0, glow(kind === 'ammo' ? 0x7fd6ff : 0xff8fa0));
  box(1.3, 0.35, 0.06, 0xffe066, 0, 2.45, 0.5, g, 0);
  box(0.9, 0.25, 0.08, 0x222222, 0, 0.7, 0.5, g, 0);
  // simple icon on screen
  if (kind === 'ammo') { box(0.18, 0.5, 0.02, 0xffd23a, -0.2, 1.75, 0.54, g, 0, glow(0xffd23a)); box(0.18, 0.5, 0.02, 0xffd23a, 0.2, 1.75, 0.54, g, 0, glow(0xffd23a)); }
  else { box(0.6, 0.18, 0.02, 0xffffff, 0, 1.75, 0.54, g, 0, glow(0xffffff)); box(0.18, 0.6, 0.02, 0xffffff, 0, 1.75, 0.54, g, 0, glow(0xffffff)); }
  props.add(g);
  const vertical = Math.abs(Math.sin(rot)) > 0.5;
  addBoxCol(x, z, vertical ? 1 : 1.6, vertical ? 1.6 : 1, y, y + 2.6);
  const [fx, fz] = [Math.sin(rot), Math.cos(rot)];
  interactables.push({ kind, pos: new THREE.Vector3(x + fx * 1.2, y + 1.2, z + fz * 1.2), group: g });
}

(function buildArena() {
  const rng = makeRng(4242);
  const taken = [];
  const free = (x, z, r) => {
    if (Math.hypot(x, z) < 9) return false;
    for (const t of taken) if (Math.hypot(t[0] - x, t[1] - z) < t[2] + r) return false;
    taken.push([x, z, r]); return true;
  };
  const randPos = (minR, maxR) => { const a = rng() * TAU, r = minR + rng() * (maxR - minR); return [Math.cos(a) * r, Math.sin(a) * r]; };

  // spawn gates on the rim
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.3;
    const x = Math.cos(a) * 74, z = Math.sin(a) * 74;
    taken.push([x, z, 7]);
    buildSpawnGate(x, z);
  }
  buildVending(-3.2, 4.5, 0, 'ammo');
  buildVending(3.2, 4.5, 0, 'health');

  for (let i = 0; i < 6; i++) {
    for (let k = 0; k < 20; k++) {
      const [x, z] = randPos(22, 60);
      if (free(x, z, 6)) { buildShack(x, z, Math.floor(rng() * 4) * Math.PI / 2, rng); break; }
    }
  }
  for (let i = 0; i < 2; i++) {
    for (let k = 0; k < 20; k++) {
      const [x, z] = randPos(40, 66);
      if (free(x, z, 4)) { buildTower(x, z); break; }
    }
  }
  for (let i = 0; i < 14; i++) {
    for (let k = 0; k < 20; k++) {
      const [x, z] = randPos(12, 66);
      const len = 4 + Math.floor(rng() * 3) * 1.4;
      if (free(x, z, len / 2 + 1)) { buildWall(x, z, len, rng() < 0.5 ? 0 : Math.PI / 2); break; }
    }
  }
  for (let i = 0; i < 5; i++) {
    for (let k = 0; k < 20; k++) {
      const [x, z] = randPos(15, 65);
      if (free(x, z, 3.5)) { buildCar(x, z, rng() < 0.5 ? 0 : Math.PI / 2); break; }
    }
  }
  for (let i = 0; i < 16; i++) {
    for (let k = 0; k < 20; k++) {
      const [x, z] = randPos(12, 68);
      if (free(x, z, 1.5)) {
        buildCrate(x, z, 1.2, rng);
        if (rng() < 0.4) { const y = groundAt(x, z); const c = box(1.0, 1.0, 1.0, 0x9c6b3e, x + 0.1, y + 1.7, z, props); addBoxCol(x + 0.1, z, 1.0, 1.0, y + 1.2, y + 2.2); c.rotation.y = 0; }
        break;
      }
    }
  }
  for (let i = 0; i < 28; i++) {
    for (let k = 0; k < 20; k++) {
      const [x, z] = randPos(14, 78);
      const r = 0.9 + rng() * 2.2;
      if (free(x, z, r + 0.8)) { buildRock(x, z, r, rng); break; }
    }
  }
  for (let i = 0; i < 12; i++) {
    for (let k = 0; k < 20; k++) {
      const [x, z] = randPos(10, 62);
      if (free(x, z, 1.2)) { buildBarrel(x, z); break; }
    }
  }
  // decorative scrub, bones and tyres (no collision)
  for (let i = 0; i < 60; i++) {
    const [x, z] = randPos(10, 80);
    const y = groundAt(x, z);
    if (rng() < 0.5) {
      const s = 0.3 + rng() * 0.5;
      const m = new THREE.Mesh(new THREE.ConeGeometry(s, s * 2.2, 5), toon(pick([0x7a8a3a, 0x8f9b46, 0x6a7a30])));
      m.position.set(x, y + s, z); addOutline(m, 1.08); props.add(m);
    } else if (rng() < 0.5) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.18, 6, 10), toon(0x262626));
      t.rotation.x = Math.PI / 2 + (rng() - 0.5) * 0.6; t.position.set(x, y + 0.18, z); addOutline(t, 1.08); props.add(t);
    } else {
      box(0.9, 0.12, 0.12, 0xefe4cc, x, y + 0.06, z, props, 0.025).rotation.y = rng() * 3;
    }
  }
})();

// ---------------------------------------------------------------------------
// Ray tests. Directions are unit vectors; return distance or Infinity.
function rayBox(ox, oy, oz, dx, dy, dz, c) {
  let tmin = 0, tmax = Infinity;
  const ax = [[ox, dx, c.minX, c.maxX], [oy, dy, c.minY, c.maxY], [oz, dz, c.minZ, c.maxZ]];
  for (const [o, d, mn, mx] of ax) {
    if (Math.abs(d) < 1e-9) { if (o < mn || o > mx) return Infinity; }
    else {
      let t1 = (mn - o) / d, t2 = (mx - o) / d;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return Infinity;
    }
  }
  return tmin;
}
function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
  const lx = cx - ox, ly = cy - oy, lz = cz - oz;
  const tca = lx * dx + ly * dy + lz * dz;
  const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
  if (d2 > r * r) return Infinity;
  const thc = Math.sqrt(r * r - d2);
  const t0 = tca - thc, t1 = tca + thc;
  if (t1 < 0) return Infinity;
  return t0 >= 0 ? t0 : 0;
}
function rayTerrain(o, d, maxD) {
  let t = 0, step = 0.35;
  while (t < maxD) {
    const nt = Math.min(t + step, maxD);
    const x = o.x + d.x * nt, y = o.y + d.y * nt, z = o.z + d.z * nt;
    if (y < groundAt(x, z)) {
      let a = t, b = nt;
      for (let i = 0; i < 6; i++) {
        const m = (a + b) / 2;
        if (o.y + d.y * m < groundAt(o.x + d.x * m, o.z + d.z * m)) b = m; else a = m;
      }
      return b;
    }
    t = nt;
    step = t < 25 ? 0.35 : 0.9;
  }
  return Infinity;
}
// returns {t, barrel}
function rayWorld(o, d, maxD) {
  let best = maxD, barrel = null;
  for (const c of boxCols) {
    const t = rayBox(o.x, o.y, o.z, d.x, d.y, d.z, c);
    if (t < best) { best = t; barrel = c.ref; }
  }
  for (const s of sphCols) {
    const t = raySphere(o.x, o.y, o.z, d.x, d.y, d.z, s.x, s.y, s.z, s.r);
    if (t < best) { best = t; barrel = null; }
  }
  const tt = rayTerrain(o, d, best);
  if (tt < best) { best = tt; barrel = null; }
  return { t: best, barrel: barrel && barrel.alive ? barrel : null };
}
const _losD = new THREE.Vector3();
function lineOfSight(a, b) {
  _losD.subVectors(b, a);
  const len = _losD.length();
  _losD.divideScalar(len);
  return rayWorld(a, _losD, len - 0.3).t >= len - 0.3;
}

// Push a vertical capsule (feet at p) out of the world; returns ground height under it.
function collideBody(p, radius, height, vy = 0) {
  let ground = groundAt(p.x, p.z);
  for (const c of boxCols) {
    if (p.x + radius < c.minX || p.x - radius > c.maxX || p.z + radius < c.minZ || p.z - radius > c.maxZ) continue;
    const insideXZ = p.x > c.minX && p.x < c.maxX && p.z > c.minZ && p.z < c.maxZ;
    if (p.y >= c.maxY - 0.45 && vy <= 0.5) {
      // standing on top
      const cx = clamp(p.x, c.minX, c.maxX), cz = clamp(p.z, c.minZ, c.maxZ);
      if (Math.hypot(p.x - cx, p.z - cz) < radius * 0.6 || insideXZ) ground = Math.max(ground, c.maxY);
      continue;
    }
    if (p.y + height < c.minY || p.y > c.maxY) continue;
    const cx = clamp(p.x, c.minX, c.maxX), cz = clamp(p.z, c.minZ, c.maxZ);
    let dx = p.x - cx, dz = p.z - cz;
    const dist = Math.hypot(dx, dz);
    if (insideXZ || dist < 1e-6) {
      const pushes = [[c.minX - radius - p.x, 0], [c.maxX + radius - p.x, 0], [0, c.minZ - radius - p.z], [0, c.maxZ + radius - p.z]];
      pushes.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
      p.x += pushes[0][0]; p.z += pushes[0][1];
    } else if (dist < radius) {
      p.x += (dx / dist) * (radius - dist); p.z += (dz / dist) * (radius - dist);
    }
  }
  for (const s of sphCols) {
    const dx = p.x - s.x, dz = p.z - s.z;
    const dist = Math.hypot(dx, dz);
    const rr = s.r + radius;
    if (dist < rr) {
      if (p.y >= s.top - 0.5 && dist < s.r * 0.75) { ground = Math.max(ground, s.top); continue; }
      if (p.y > s.top) continue;
      const k = (rr - dist) / Math.max(dist, 1e-4);
      p.x += dx * k; p.z += dz * k;
    }
  }
  const r = Math.hypot(p.x, p.z);
  if (r > ARENA_R) { p.x *= ARENA_R / r; p.z *= ARENA_R / r; }
  return ground;
}

// ---------------------------------------------------------------------------
// Effects
const fx = { particles: [], tracers: [], blasts: [], debris: [], rings: [] };
const PGEO = new THREE.BoxGeometry(1, 1, 1);
const MAX_PARTICLES = IS_TOUCH ? 220 : 420;

function particle(pos, vel, color, size, life, grav = 1, additive = false) {
  let p;
  if (fx.particles.length >= MAX_PARTICLES) { p = fx.particles.shift(); p.mesh.material = glow(color, additive ? 0.9 : 1, additive); }
  else { p = { mesh: new THREE.Mesh(PGEO, glow(color, additive ? 0.9 : 1, additive)) }; scene.add(p.mesh); }
  p.mesh.visible = true;
  p.mesh.position.copy(pos);
  p.vel = vel.clone ? vel.clone() : new THREE.Vector3(vel.x, vel.y, vel.z);
  p.size = size; p.life = p.max = life; p.grav = grav;
  p.mesh.scale.setScalar(size);
  p.mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
  fx.particles.push(p);
}
const _v = new THREE.Vector3();
function burst(pos, color, n, speed, size, life, grav = 1, additive = false) {
  for (let i = 0; i < n; i++) {
    _v.set(rand(-1, 1), rand(-0.2, 1.2), rand(-1, 1)).normalize().multiplyScalar(speed * rand(0.4, 1));
    particle(pos, _v, color, size * rand(0.6, 1.2), life * rand(0.6, 1.2), grav, additive);
  }
}

const TRACER_GEO = new THREE.BoxGeometry(1, 1, 1); TRACER_GEO.translate(0, 0, 0.5);
const tracerPool = [];
function tracer(from, to, color, width = 0.035, life = 0.07) {
  let t = tracerPool.find((x) => !x.active);
  if (!t) {
    t = { mesh: new THREE.Mesh(TRACER_GEO, new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })), active: false };
    scene.add(t.mesh); tracerPool.push(t);
  }
  t.active = true; t.life = t.max = life;
  t.mesh.visible = true;
  t.mesh.material.color.setHex(color);
  t.mesh.material.opacity = 1;
  t.mesh.position.copy(from);
  t.mesh.lookAt(to);
  t.mesh.scale.set(width, width, from.distanceTo(to));
}

const BLAST_GEO = new THREE.IcosahedronGeometry(1, 1);
function blastFx(pos, radius, color = 0xff8a2a) {
  const outer = new THREE.Mesh(BLAST_GEO, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
  const inner = new THREE.Mesh(BLAST_GEO, new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 1, depthWrite: false }));
  outer.position.copy(pos); inner.position.copy(pos);
  scene.add(outer); scene.add(inner);
  fx.blasts.push({ outer, inner, t: 0, dur: 0.38, r: radius });
  flashAt(pos, color, 6, radius * 4, 0.35);
  burst(pos, 0x4a4040, 10, radius * 1.4, 0.6, 1.2, -0.15);
  burst(pos, 0xffc040, 14, radius * 3, 0.18, 0.5, 1, true);
}
function ringFx(pos, radius, color, dur = 0.5) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.rotation.x = -Math.PI / 2; m.position.copy(pos); m.position.y += 0.2;
  scene.add(m);
  fx.rings.push({ m, t: 0, dur, r: radius });
}

// Body parts flung on death
function addDebris(mesh, vel, spin, life = 4) {
  fx.debris.push({ mesh, vel, spin, life, max: life, rest: false });
}

function updateFx(dt) {
  for (let i = fx.particles.length - 1; i >= 0; i--) {
    const p = fx.particles[i];
    p.life -= dt;
    if (p.life <= 0) { p.mesh.visible = false; scene.remove(p.mesh); fx.particles.splice(i, 1); continue; }
    p.vel.y -= 18 * p.grav * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    const g = groundAt(p.mesh.position.x, p.mesh.position.z);
    if (p.mesh.position.y < g) { p.mesh.position.y = g; p.vel.multiplyScalar(0.4); p.vel.y = Math.abs(p.vel.y) * 0.3; }
    if (p.grav < 0) p.mesh.scale.setScalar(p.size * (1 + (1 - p.life / p.max) * 1.5));
    else p.mesh.scale.setScalar(p.size * Math.min(1, p.life / p.max * 2));
  }
  for (const t of tracerPool) {
    if (!t.active) continue;
    t.life -= dt;
    if (t.life <= 0) { t.active = false; t.mesh.visible = false; continue; }
    t.mesh.material.opacity = t.life / t.max;
  }
  for (let i = fx.blasts.length - 1; i >= 0; i--) {
    const b = fx.blasts[i];
    b.t += dt;
    const k = b.t / b.dur;
    if (k >= 1) { scene.remove(b.outer); scene.remove(b.inner); b.outer.material.dispose(); b.inner.material.dispose(); fx.blasts.splice(i, 1); continue; }
    const e = 1 - Math.pow(1 - k, 3);
    b.outer.scale.setScalar(b.r * (0.3 + e * 0.9));
    b.inner.scale.setScalar(b.r * (0.2 + e * 0.6));
    b.outer.material.opacity = 0.9 * (1 - k);
    b.inner.material.opacity = 1 - k * 1.3;
  }
  for (let i = fx.rings.length - 1; i >= 0; i--) {
    const r = fx.rings[i];
    r.t += dt;
    const k = r.t / r.dur;
    if (k >= 1) { scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); fx.rings.splice(i, 1); continue; }
    r.m.scale.setScalar(Math.max(0.01, r.r * k));
    r.m.material.opacity = 1 - k;
  }
  for (let i = fx.debris.length - 1; i >= 0; i--) {
    const d = fx.debris[i];
    d.life -= dt;
    if (d.life <= 0) { scene.remove(d.mesh); fx.debris.splice(i, 1); continue; }
    if (!d.rest) {
      d.vel.y -= 20 * dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      d.mesh.rotation.x += d.spin.x * dt; d.mesh.rotation.z += d.spin.z * dt;
      const g = groundAt(d.mesh.position.x, d.mesh.position.z) + 0.1;
      if (d.mesh.position.y < g) {
        d.mesh.position.y = g;
        d.vel.y = -d.vel.y * 0.3; d.vel.x *= 0.5; d.vel.z *= 0.5; d.spin.multiplyScalar(0.5);
        if (Math.abs(d.vel.y) < 1) d.rest = true;
      }
    }
    if (d.life < 1) d.mesh.position.y -= dt * 0.6; // sink into the sand
  }
  for (const f of flashLights) {
    if (f.light.intensity <= 0) continue;
    f.t += dt;
    f.light.intensity = f.t >= f.dur ? 0 : f.peak * (1 - f.t / f.dur);
  }
}

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  vmCamera.aspect = w / h; vmCamera.fov = w < h ? 82 : 60; vmCamera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
onResize();

// ---------------------------------------------------------------------------
// Navigation: a walkability grid over the arena plus a flow field toward the
// player, so enemies route around shacks, walls, cars and rocks.
const NAV_CELL = 1.0;
const NAV_N = Math.ceil((ARENA_R * 2) / NAV_CELL) + 2;
const NAV_OFF = NAV_N * NAV_CELL / 2;
const navBlocked = new Uint8Array(NAV_N * NAV_N);
const navDist = new Float32Array(NAV_N * NAV_N).fill(Infinity);
const navCellOf = (x, z) => {
  const ix = Math.floor((x + NAV_OFF) / NAV_CELL), iz = Math.floor((z + NAV_OFF) / NAV_CELL);
  return ix < 0 || iz < 0 || ix >= NAV_N || iz >= NAV_N ? -1 : iz * NAV_N + ix;
};
const navCenterX = (i) => (i % NAV_N + 0.5) * NAV_CELL - NAV_OFF;
const navCenterZ = (i) => (Math.floor(i / NAV_N) + 0.5) * NAV_CELL - NAV_OFF;

(function buildNav() {
  const pad = 0.5;
  for (let i = 0; i < navBlocked.length; i++) {
    const x = navCenterX(i), z = navCenterZ(i);
    if (Math.hypot(x, z) > ARENA_R - 0.5) { navBlocked[i] = 1; continue; }
    const g = groundAt(x, z);
    for (const c of boxCols) {
      if (c.ref) continue; // barrels come and go
      if (c.maxY < g + 0.5 || c.minY > g + 1.6) continue;
      if (x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad) { navBlocked[i] = 1; break; }
    }
    if (navBlocked[i]) continue;
    for (const s of sphCols) {
      if (s.top < g + 0.5) continue;
      if (Math.hypot(x - s.x, z - s.z) < s.r + pad) { navBlocked[i] = 1; break; }
    }
  }
})();

// Dijkstra from the target cell with a binary heap. ~29k cells, a few ms.
const _heapIdx = new Int32Array(NAV_N * NAV_N * 4);
const _heapKey = new Float32Array(NAV_N * NAV_N * 4);
let navTargetCell = -2, navAge = 99;
function navUpdate(target, dt) {
  navAge += dt;
  let tc = navCellOf(target.x, target.z);
  if (tc === navTargetCell && navAge < 1.5) return;
  if (tc < 0) return;
  if (navBlocked[tc]) {
    // standing on a roof or crate: route enemies to the nearest open cell
    let best = -1, bd = Infinity;
    const tx = tc % NAV_N, tz = Math.floor(tc / NAV_N);
    for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) {
      const j = (tz + dz) * NAV_N + tx + dx;
      if (j >= 0 && j < navBlocked.length && !navBlocked[j] && dx * dx + dz * dz < bd) { bd = dx * dx + dz * dz; best = j; }
    }
    if (best < 0) return;
    tc = best;
  }
  navTargetCell = navCellOf(target.x, target.z); navAge = 0;
  navDist.fill(Infinity);
  let n = 0;
  const push = (i, k) => {
    let p = n++;
    while (p > 0) { const q = (p - 1) >> 1; if (_heapKey[q] <= k) break; _heapKey[p] = _heapKey[q]; _heapIdx[p] = _heapIdx[q]; p = q; }
    _heapKey[p] = k; _heapIdx[p] = i;
  };
  const pop = () => {
    const top = _heapIdx[0];
    const lk = _heapKey[--n], li = _heapIdx[n];
    let p = 0;
    for (;;) {
      let c = p * 2 + 1;
      if (c >= n) break;
      if (c + 1 < n && _heapKey[c + 1] < _heapKey[c]) c++;
      if (_heapKey[c] >= lk) break;
      _heapKey[p] = _heapKey[c]; _heapIdx[p] = _heapIdx[c]; p = c;
    }
    _heapKey[p] = lk; _heapIdx[p] = li;
    return top;
  };
  navDist[tc] = 0; push(tc, 0);
  while (n > 0) {
    const k0 = _heapKey[0];
    const i = pop();
    if (k0 > navDist[i]) continue;
    const x = i % NAV_N, z = (i - x) / NAV_N;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= NAV_N || nz >= NAV_N) continue;
      const j = nz * NAV_N + nx;
      if (navBlocked[j]) continue;
      if (dx && dz && (navBlocked[z * NAV_N + nx] || navBlocked[nz * NAV_N + x])) continue; // no corner cutting
      const nd = k0 + (dx && dz ? 1.4142 : 1);
      if (nd < navDist[j] && n < _heapIdx.length) { navDist[j] = nd; push(j, nd); }
    }
  }
}

// Direction (unit XZ vector written into out) along the flow field, or false.
function navDir(pos, out) {
  const i = navCellOf(pos.x, pos.z);
  if (i < 0) return false;
  const x = i % NAV_N, z = (i - x) / NAV_N;
  let best = -1, bd = navBlocked[i] ? Infinity : navDist[i];
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dz) continue;
    const nx = x + dx, nz = z + dz;
    if (nx < 0 || nz < 0 || nx >= NAV_N || nz >= NAV_N) continue;
    const j = nz * NAV_N + nx;
    if (navBlocked[j]) continue;
    if (dx && dz && (navBlocked[z * NAV_N + nx] || navBlocked[nz * NAV_N + x])) continue;
    if (navDist[j] < bd) { bd = navDist[j]; best = j; }
  }
  if (best < 0 || bd === Infinity) return false;
  // look one more step ahead for smoother turns
  const bx = best % NAV_N, bz = (best - bx) / NAV_N;
  let next = best, nd = navDist[best];
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const nx = bx + dx, nz = bz + dz;
    if (nx < 0 || nz < 0 || nx >= NAV_N || nz >= NAV_N) continue;
    const j = nz * NAV_N + nx;
    if (navBlocked[j] || navDist[j] >= nd) continue;
    if (dx && dz && (navBlocked[bz * NAV_N + nx] || navBlocked[nz * NAV_N + bx])) continue;
    nd = navDist[j]; next = j;
  }
  const tx = (navCenterX(best) * 2 + navCenterX(next)) / 3, tz = (navCenterZ(best) * 2 + navCenterZ(next)) / 3;
  out.set(tx - pos.x, 0, tz - pos.z);
  const l = out.length();
  if (l < 1e-4) return false;
  out.divideScalar(l);
  return true;
}
