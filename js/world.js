'use strict';
// Renderer, cel-shaded materials, the arena (terrain + props), collision and
// raycasting against the world, and visual effects (particles, tracers, explosions).

const renderer = new THREE.WebGLRenderer({ antialias: !IS_TOUCH, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, IS_TOUCH ? 1.3 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
// Phones get no shadow maps (they'd draw every character twice); characters there stand on cartoon
// blob shadows instead (js/topdown.js).
renderer.shadowMap.enabled = !IS_TOUCH;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

// ---------------------------------------------------------------------------
// Lights
// cartoon lighting: warm sun, cool violet fill from below, so shadows read purple, not grey
const hemi = new THREE.HemisphereLight(0xe4f4ff, 0x8a6aa8, 0.66);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffecd0, 0.7);
sun.castShadow = !IS_TOUCH;
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
// Cartoon style (decisions.md 2026-11-08), not cel shading: light falls off smoothly and the dark
// side stays bright and colourful (a soft ramp instead of hard bands), there are no ink outlines,
// and every built-in material's final colour gets a saturation and brightness lift (below).
const INK = false;
// Two cartoon tones (shade and light) with a soft edge between them, like painted cel animation
// but without hard steps.
function softRamp(floor) {
  const n = 64, d = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1), t = clamp((x - 0.3) / 0.28, 0, 1), s = t * t * (3 - 2 * t);
    const v = Math.round(255 * (floor + (1 - floor) * (0.12 * x + 0.88 * s)));
    d.set([v, v, v, 255], i * 4);
  }
  const t = new THREE.DataTexture(d, n, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}
const gradTex = softRamp(0.58);
// the colour lift, at the end of every built-in material's fragment shader
THREE.ShaderChunk.dithering_fragment = `{
  float cartoonL = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
  vec3 cc = clamp(mix(vec3(cartoonL), gl_FragColor.rgb, 1.3), 0.0, 1.0);
  cc = mix(cc, cc * cc * (3.0 - 2.0 * cc), 0.3);
  // grit (decisions.md 2026-11-09): shadows lose a little colour, comic halftone dots in the
  // darker tones, and a fine static film grain
  float gl2 = dot(cc, vec3(0.299, 0.587, 0.114));
  cc = mix(vec3(gl2), cc, 0.82 + 0.18 * smoothstep(0.15, 0.55, gl2));
  vec2 hp = mat2(0.707, -0.707, 0.707, 0.707) * gl_FragCoord.xy / 4.5;
  float ht = smoothstep(0.5, 0.12, gl2);
  cc *= 1.0 - ht * 0.28 * step(length(fract(hp) - 0.5), 0.15 + 0.3 * ht);
  cc += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.04;
  gl_FragColor.rgb = cc; // a little punch
}
` + THREE.ShaderChunk.dithering_fragment;
// Top-down cutaway: world materials hide everything above the player's head within a radius of
// them (roofs, the canopy, ceilings, treetops), so the overhead camera can always see the player.
// CUT = (x, height, z, radius); js/topdown.js moves it every frame; height 1e6 turns it off.
const CUT = { value: new THREE.Vector4(0, 1e6, 0, 0) };
function cutawayCompile(sh) {
  sh.uniforms.uCut = CUT;
  sh.vertexShader = 'varying vec3 vCutW;\n' + sh.vertexShader.replace('#include <project_vertex>',
    '#include <project_vertex>\nvec4 cutW = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\ncutW = instanceMatrix * cutW;\n#endif\nvCutW = (modelMatrix * cutW).xyz;');
  sh.fragmentShader = 'uniform vec4 uCut;\nvarying vec3 vCutW;\n' + sh.fragmentShader.replace('void main() {',
    'void main() {\nif (vCutW.y > uCut.y && length(vCutW.xz - uCut.xz) < uCut.w) discard;');
}
function addCutaway(m) { m.onBeforeCompile = cutawayCompile; return m; }
const _toonCache = new Map();
function toon(color, emissive = 0) {
  const key = color + '_' + emissive;
  let m = _toonCache.get(key);
  if (!m) {
    m = addCutaway(new THREE.MeshToonMaterial({ color, gradientMap: gradTex }));
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
const OUTLINE_MAT = addCutaway(new THREE.MeshBasicMaterial({ color: 0x1c110a, side: THREE.BackSide }));

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
  if (ol > 0 && INK) {
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
  if (ol > 0 && INK) {
    const r = Math.max(rt, rb);
    const o = new THREE.Mesh(g, OUTLINE_MAT);
    o.scale.set((r + ol) / r, (h + ol * 2) / h, (r + ol) / r);
    m.add(o);
  }
  if (parent) parent.add(m);
  return m;
}
function addOutline(mesh, scale) {
  if (!INK) return null; // cartoon style: no ink outlines
  const o = new THREE.Mesh(mesh.geometry, OUTLINE_MAT);
  o.scale.setScalar(scale);
  mesh.add(o);
  return o;
}

// ---------------------------------------------------------------------------
// Ground. Stage maps are loaded from files (js/map.js): the arena world's ground is the loaded
// map's baked heightmap (`MAPG`), sampled bilinearly. Until a map is loaded the ground is flat at 0.
// The active world (see "Worlds" below): its id, flat floor height (null = the stage map's ground) and bounds.
const WORLD = { id: 'arena', flat: null, bounds: { minX: -150, maxX: 150, minZ: -150, maxZ: 150 } };
const MAPG = { ready: false, x0: 0, z0: 0, cell: 1, nx: 1, nz: 1, h: null };
function groundAt(x, z) { return WORLD.flat != null ? WORLD.flat : terrainAt(x, z); }
function terrainAt(x, z) {
  if (!MAPG.ready) return 0;
  const fx = (x - MAPG.x0) / MAPG.cell - 0.5, fz = (z - MAPG.z0) / MAPG.cell - 0.5;
  const ix = clamp(Math.floor(fx), 0, MAPG.nx - 2), iz = clamp(Math.floor(fz), 0, MAPG.nz - 2);
  const tx = clamp(fx - ix, 0, 1), tz = clamp(fz - iz, 0, 1);
  const W = MAPG.nx, H = MAPG.h;
  const a = H[iz * W + ix], b = H[iz * W + ix + 1], c = H[(iz + 1) * W + ix], d = H[(iz + 1) * W + ix + 1];
  return lerp(lerp(a, b, tx), lerp(c, d, tx), tz) * 0.01;
}
// Is a point inside the active world's playable area (with a margin)?
function inBounds(x, z, m = 0) {
  const B = WORLD.bounds;
  if (B.r) return Math.hypot(x, z) < B.r - m;
  return x > B.minX + m && x < B.maxX - m && z > B.minZ + m && z < B.maxZ - m;
}

// ---------------------------------------------------------------------------
// Colliders. Boxes are axis-aligned; rocks are spheres.
const boxCols = [];
const sphCols = [];
function addBoxCol(cx, cz, w, d, y0, y1, ref = null) {
  const c = { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, minY: y0, maxY: y1, ref };
  boxCols.push(c); COLG.dirty = true; return c;
}
// A uniform grid over the active world's colliders, so collision and ray tests only look at the
// ones nearby (a stage map has thousands). Rebuilt when the world or its colliders change.
const COLG = { dirty: true, cell: 6, x0: 0, z0: 0, nx: 0, nz: 0, cells: null, stamp: 1 };
function colgBuild() {
  COLG.dirty = false;
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  const ext = (a, b, c, d) => { minX = Math.min(minX, a); minZ = Math.min(minZ, b); maxX = Math.max(maxX, c); maxZ = Math.max(maxZ, d); };
  for (const c of boxCols) ext(c.minX, c.minZ, c.maxX, c.maxZ);
  for (const s of sphCols) ext(s.x - s.r, s.z - s.r, s.x + s.r, s.z + s.r);
  if (minX === Infinity) { minX = minZ = -1; maxX = maxZ = 1; }
  const C = COLG.cell;
  COLG.x0 = minX - C; COLG.z0 = minZ - C;
  COLG.nx = Math.ceil((maxX - COLG.x0) / C) + 2; COLG.nz = Math.ceil((maxZ - COLG.z0) / C) + 2;
  COLG.cells = new Array(COLG.nx * COLG.nz);
  const add = (o, a, b, c, d) => {
    for (let iz = Math.floor((b - COLG.z0) / C); iz <= Math.floor((d - COLG.z0) / C); iz++)
      for (let ix = Math.floor((a - COLG.x0) / C); ix <= Math.floor((c - COLG.x0) / C); ix++) {
        const k = iz * COLG.nx + ix;
        (COLG.cells[k] || (COLG.cells[k] = [])).push(o);
      }
  };
  for (const c of boxCols) add(c, c.minX, c.minZ, c.maxX, c.maxZ);
  for (const s of sphCols) add(s, s.x - s.r, s.z - s.r, s.x + s.r, s.z + s.r);
}
// The colliders overlapping an XZ rectangle: boxes into nearBoxes, spheres into nearSphs.
const nearBoxes = [], nearSphs = [];
function colsNear(minX, minZ, maxX, maxZ) {
  if (COLG.dirty) colgBuild();
  nearBoxes.length = 0; nearSphs.length = 0;
  const st = ++COLG.stamp, C = COLG.cell;
  const ix0 = Math.max(0, Math.floor((minX - COLG.x0) / C)), ix1 = Math.min(COLG.nx - 1, Math.floor((maxX - COLG.x0) / C));
  const iz0 = Math.max(0, Math.floor((minZ - COLG.z0) / C)), iz1 = Math.min(COLG.nz - 1, Math.floor((maxZ - COLG.z0) / C));
  for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) {
    const L = COLG.cells[iz * COLG.nx + ix];
    if (!L) continue;
    for (const o of L) {
      if (o._st === st) continue;
      o._st = st;
      if (o.minX !== undefined) { if (!o.ref || o.ref.alive) nearBoxes.push(o); } else nearSphs.push(o);
    }
  }
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

// ---------------------------------------------------------------------------
// Worlds. Each place the player can be (the arena, the hub room) owns its scene objects,
// colliders, interactables, floor and bounds; switching swaps them in and out whole, so only the
// current one is in the scene. While a world is active its colliders and interactables live in
// boxCols / sphCols / interactables, which the rest of the game reads.
const worlds = {
  arena: {
    objects: scene.children.filter((o) => o !== camera && !o.isLight && o !== sun.target),
    box: [], sph: [], inter: [], flat: null, bounds: WORLD.bounds,
    fog: scene.fog, background: FOG_COLOR, light: { hemi: hemi.intensity, sun: sun.intensity },
  },
};
// Build another world: `build(group)` adds its meshes to `group` and its colliders and
// interactables through the usual helpers; the arena's stay untouched.
function defineWorld(id, def, build) {
  const keep = [boxCols.splice(0), sphCols.splice(0), interactables.splice(0)];
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);
  build(group);
  worlds[id] = Object.assign({ objects: [group], box: boxCols.splice(0), sph: sphCols.splice(0), inter: interactables.splice(0) }, def);
  boxCols.push(...keep[0]); sphCols.push(...keep[1]); interactables.push(...keep[2]);
  COLG.dirty = true;
  return worlds[id];
}
function switchWorld(id) {
  if (id === WORLD.id) return;
  const cur = worlds[WORLD.id], next = worlds[id];
  cur.box = boxCols.splice(0); cur.sph = sphCols.splice(0); cur.inter = interactables.splice(0);
  for (const o of cur.objects) o.visible = false;
  boxCols.push(...next.box); sphCols.push(...next.sph); interactables.push(...next.inter);
  for (const o of next.objects) o.visible = true;
  WORLD.id = id; WORLD.flat = next.flat; WORLD.bounds = next.bounds;
  COLG.dirty = true;
  scene.fog = next.fog; scene.background = next.background;
  hemi.intensity = next.light.hemi; sun.intensity = next.light.sun;
}
// A world's live box colliders, whether or not it's the active one (barrels respawn on a timer).
const worldBoxCols = (id) => (WORLD.id === id ? boxCols : worlds[id].box);

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
function rayFlat(o, d, maxD) {
  if (d.y >= 0) return Infinity;
  const t = (WORLD.flat - o.y) / d.y;
  return t >= 0 && t < maxD ? t : Infinity;
}
// returns {t, barrel}
function rayWorld(o, d, maxD) {
  let best = maxD, barrel = null;
  // walk the collider grid cells along the ray (2D DDA), nearest first, until past the best hit
  if (COLG.dirty) colgBuild();
  const C = COLG.cell, st = ++COLG.stamp;
  let ix = Math.floor((o.x - COLG.x0) / C), iz = Math.floor((o.z - COLG.z0) / C);
  const sx = d.x > 0 ? 1 : -1, sz = d.z > 0 ? 1 : -1;
  const ddx = Math.abs(d.x) > 1e-9 ? C / Math.abs(d.x) : Infinity, ddz = Math.abs(d.z) > 1e-9 ? C / Math.abs(d.z) : Infinity;
  let tx = Math.abs(d.x) > 1e-9 ? ((sx > 0 ? (ix + 1) * C + COLG.x0 - o.x : o.x - (ix * C + COLG.x0)) / Math.abs(d.x)) : Infinity;
  let tz = Math.abs(d.z) > 1e-9 ? ((sz > 0 ? (iz + 1) * C + COLG.z0 - o.z : o.z - (iz * C + COLG.z0)) / Math.abs(d.z)) : Infinity;
  let tEnter = 0;
  for (let guard = 0; guard < 400 && tEnter <= best; guard++) {
    if (ix >= 0 && iz >= 0 && ix < COLG.nx && iz < COLG.nz) {
      const L = COLG.cells[iz * COLG.nx + ix];
      if (L) for (const c of L) {
        if (c._st === st) continue;
        c._st = st;
        if (c.minX !== undefined) {
          if (c.ref && !c.ref.alive) continue;
          const t = rayBox(o.x, o.y, o.z, d.x, d.y, d.z, c);
          if (t < best) { best = t; barrel = c.ref; }
        } else {
          const t = raySphere(o.x, o.y, o.z, d.x, d.y, d.z, c.x, c.y, c.z, c.r);
          if (t < best) { best = t; barrel = null; }
        }
      }
    } else if ((ix < 0 && sx < 0) || (iz < 0 && sz < 0) || (ix >= COLG.nx && sx > 0) || (iz >= COLG.nz && sz > 0)) break; // left the grid
    if (tx < tz) { tEnter = tx; tx += ddx; ix += sx; } else { tEnter = tz; tz += ddz; iz += sz; }
  }
  const tt = WORLD.flat != null ? rayFlat(o, d, best) : rayTerrain(o, d, best);
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
  colsNear(p.x - radius, p.z - radius, p.x + radius, p.z + radius);
  for (const c of nearBoxes) {
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
  for (const s of nearSphs) {
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
  const B = WORLD.bounds;
  if (B.r) { const r = Math.hypot(p.x, p.z); if (r > B.r) { p.x *= B.r / r; p.z *= B.r / r; } }
  else { p.x = clamp(p.x, B.minX, B.maxX); p.z = clamp(p.z, B.minZ, B.maxZ); }
  return ground;
}

// ---------------------------------------------------------------------------
// Effects
const fx = { particles: [], tracers: [], blasts: [], debris: [], rings: [] };
const PGEO = new THREE.BoxGeometry(1, 1, 1);
const MAX_PARTICLES = IS_TOUCH ? 70 : 300; // each particle is a draw call

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

// Muzzle flash: a comic-book starburst that faces the camera, popping in and out in a blink.
// A small pool of sprites is reused.
const MUZZLE_TEX = new THREE.TextureLoader().load('models/fx-muzzle.webp');
const muzzlePool = [];
for (let i = 0; i < 12; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: MUZZLE_TEX, transparent: true, depthWrite: false, fog: false }));
  s.visible = false; s.renderOrder = 5; s.userData = { t: 0, life: 0, size: 1 };
  scene.add(s); muzzlePool.push(s);
}
let muzzleIdx = 0;
function muzzleFlash(pos, size = 1) {
  const s = muzzlePool[muzzleIdx++ % muzzlePool.length];
  s.position.copy(pos);
  s.material.rotation = Math.random() * Math.PI * 2;
  Object.assign(s.userData, { t: 0, life: 0.07, size: size * (0.75 + Math.random() * 0.35) });
  s.visible = true;
}
function updateMuzzleFlashes(dt) {
  for (const s of muzzlePool) {
    if (!s.visible) continue;
    const u = s.userData;
    u.t += dt;
    const k = u.t / u.life;
    if (k >= 1) { s.visible = false; continue; }
    s.scale.setScalar(u.size * (k < 0.3 ? 0.6 + k / 0.3 * 0.4 : 1 + (k - 0.3) * 0.25)); // pop to full size, then a slight swell
    s.material.opacity = k < 0.5 ? 1 : 1 - (k - 0.5) / 0.5;
  }
}
function updateFx(dt) {
  updateMuzzleFlashes(dt);
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
// Navigation: a walkability grid over the stage plus a flow field toward the
// player, so enemies route around buildings, fences, cars, trees and rocks.
// The grid comes with the stage map (baked by tools/map-bake.mjs); navInit sets it up.
let NAV_CELL = 1, NAV_N = 2, NAV_X0 = -1, NAV_Z0 = -1;
let navBlocked = new Uint8Array(4), navDist = new Float32Array(4).fill(Infinity);
let _heapIdx = new Int32Array(16), _heapKey = new Float32Array(16);
let _aG = new Float32Array(4), _aFrom = new Int32Array(4), _aSeen = new Uint32Array(4);
// The flow field covers the whole map. Recomputing it is spread over several frames (NAV_BUDGET
// cells a frame) into a second buffer, then swapped in, so a big map never stalls a frame.
const NAV_REACH = Infinity, NAV_BUDGET = IS_TOUCH ? 9000 : 16000;
let navNext = new Float32Array(4), _dHeapIdx = new Int32Array(16), _dHeapKey = new Float32Array(16), navJob = null;
const navCellOf = (x, z) => {
  const ix = Math.floor((x - NAV_X0) / NAV_CELL), iz = Math.floor((z - NAV_Z0) / NAV_CELL);
  return ix < 0 || iz < 0 || ix >= NAV_N || iz >= NAV_N ? -1 : iz * NAV_N + ix;
};
const navCenterX = (i) => (i % NAV_N + 0.5) * NAV_CELL + NAV_X0;
const navCenterZ = (i) => (Math.floor(i / NAV_N) + 0.5) * NAV_CELL + NAV_Z0;
// `n` cells a side of `cell` metres from (x0, z0); `bits` marks blocked cells (1 bit each, row by row).
function navInit(n, cell, x0, z0, bits) {
  NAV_N = n; NAV_CELL = cell; NAV_X0 = x0; NAV_Z0 = z0;
  navBlocked = new Uint8Array(n * n); navDist = new Float32Array(n * n).fill(Infinity);
  _heapIdx = new Int32Array(n * n * 4); _heapKey = new Float32Array(n * n * 4);
  _aG = new Float32Array(n * n); _aFrom = new Int32Array(n * n); _aSeen = new Uint32Array(n * n);
  navNext = new Float32Array(n * n).fill(Infinity); _dHeapIdx = new Int32Array(n * n * 4); _dHeapKey = new Float32Array(n * n * 4); navJob = null;
  for (let i = 0; i < n * n; i++) navBlocked[i] = (bits[i >> 3] >> (i & 7)) & 1;
  navTargetCell = -2; navAge = 99;
}

// Dijkstra from the target cell with a binary heap, out to NAV_REACH.
let navTargetCell = -2, navAge = 99;
function navUpdate(target, dt) {
  navAge += dt;
  if (navJob) { navStep(NAV_BUDGET); return; }
  let tc = navCellOf(target.x, target.z);
  if (tc === navTargetCell && navAge < 1.0) return;
  if (tc < 0) return;
  if (tc !== navTargetCell && navAge < 0.35) return; // at most a few recomputes a second
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
  navNext.fill(Infinity);
  navNext[tc] = 0;
  _dHeapKey[0] = 0; _dHeapIdx[0] = tc;
  navJob = { n: 1 };
  navStep(NAV_BUDGET);
}
// Dijkstra over the grid with a binary heap, `budget` cells at a time; swaps the field in when done.
function navStep(budget) {
  const J = navJob, D = navNext, HK = _dHeapKey, HI = _dHeapIdx;
  let n = J.n;
  const push = (i, k) => {
    let p = n++;
    while (p > 0) { const q = (p - 1) >> 1; if (HK[q] <= k) break; HK[p] = HK[q]; HI[p] = HI[q]; p = q; }
    HK[p] = k; HI[p] = i;
  };
  const pop = () => {
    const top = HI[0];
    const lk = HK[--n], li = HI[n];
    let p = 0;
    for (;;) {
      let c = p * 2 + 1;
      if (c >= n) break;
      if (c + 1 < n && HK[c + 1] < HK[c]) c++;
      if (HK[c] >= lk) break;
      HK[p] = HK[c]; HI[p] = HI[c]; p = c;
    }
    HK[p] = lk; HI[p] = li;
    return top;
  };
  while (n > 0 && budget-- > 0) {
    const k0 = HK[0];
    const i = pop();
    if (k0 > D[i]) continue;
    const x = i % NAV_N, z = (i - x) / NAV_N;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= NAV_N || nz >= NAV_N) continue;
      const j = nz * NAV_N + nx;
      if (navBlocked[j]) continue;
      if (dx && dz && (navBlocked[z * NAV_N + nx] || navBlocked[nz * NAV_N + x])) continue; // no corner cutting
      const nd = k0 + (dx && dz ? 1.4142 : 1);
      if (nd < D[j] && n < HI.length) { D[j] = nd; push(j, nd); }
    }
  }
  J.n = n;
  if (n === 0) { navNext = navDist; navDist = D; navJob = null; }
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

// Is the straight line between two points walkable on the grid? (skips the first stretch, since a
// body hugging a wall sits inside the wall's padded cells)
function navLineClear(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
  for (let t = 0.7; t < d; t += 0.5) {
    const i = navCellOf(a.x + dx * t / d, a.z + dz * t / d);
    if (i < 0 || navBlocked[i]) return false;
  }
  return true;
}
function navWalkable(x, z) { const i = navCellOf(x, z); return i >= 0 && !navBlocked[i]; }

// A* over the grid from one point to another. Returns waypoints (cell centres) or null.
let _aGen = 0;
function navFindPath(from, to, maxExpand = 5000) {
  let s = navCellOf(from.x, from.z), g = navCellOf(to.x, to.z);
  if (s < 0 || g < 0) return null;
  const nearestFree = (c) => {
    if (!navBlocked[c]) return c;
    const cx = c % NAV_N, cz = (c - cx) / NAV_N;
    for (let r = 1; r <= 3; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const j = (cz + dz) * NAV_N + cx + dx;
      if (j >= 0 && j < navBlocked.length && !navBlocked[j]) return j;
    }
    return -1;
  };
  s = nearestFree(s); g = nearestFree(g);
  if (s < 0 || g < 0) return null;
  _aGen++;
  const gx = g % NAV_N, gz = (g - gx) / NAV_N;
  const h = (i) => { const x = i % NAV_N, z = (i - x) / NAV_N; const ax = Math.abs(x - gx), az = Math.abs(z - gz); return Math.max(ax, az) + 0.4142 * Math.min(ax, az); };
  let n = 0;
  const push = (i, k) => {
    let p = n++;
    while (p > 0) { const q = (p - 1) >> 1; if (_heapKey[q] <= k) break; _heapKey[p] = _heapKey[q]; _heapIdx[p] = _heapIdx[q]; p = q; }
    _heapKey[p] = k; _heapIdx[p] = i;
  };
  const pop = () => {
    const top = _heapIdx[0], lk = _heapKey[--n], li = _heapIdx[n];
    let p = 0;
    for (;;) { let c = p * 2 + 1; if (c >= n) break; if (c + 1 < n && _heapKey[c + 1] < _heapKey[c]) c++; if (_heapKey[c] >= lk) break; _heapKey[p] = _heapKey[c]; _heapIdx[p] = _heapIdx[c]; p = c; }
    _heapKey[p] = lk; _heapIdx[p] = li;
    return top;
  };
  _aSeen[s] = _aGen; _aG[s] = 0; _aFrom[s] = -1;
  push(s, h(s));
  let found = false, expanded = 0;
  while (n > 0 && expanded < maxExpand) {
    const i = pop();
    if (i === g) { found = true; break; }
    expanded++;
    const x = i % NAV_N, z = (i - x) / NAV_N, gi = _aG[i];
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= NAV_N || nz >= NAV_N) continue;
      const j = nz * NAV_N + nx;
      if (navBlocked[j]) continue;
      if (dx && dz && (navBlocked[z * NAV_N + nx] || navBlocked[nz * NAV_N + x])) continue;
      const ng = gi + (dx && dz ? 1.4142 : 1);
      if (_aSeen[j] === _aGen && ng >= _aG[j]) continue;
      _aSeen[j] = _aGen; _aG[j] = ng; _aFrom[j] = i;
      if (n < _heapIdx.length) push(j, ng + h(j));
    }
  }
  if (!found) return null;
  const cells = [];
  for (let c = g; c !== -1 && c !== s; c = _aFrom[c]) cells.push(c);
  cells.reverse();
  // keep only the turns
  const pts = [];
  for (let k = 0; k < cells.length; k++) {
    const c = cells[k];
    if (k > 0 && k < cells.length - 1) {
      const a = cells[k - 1], b = cells[k + 1];
      if (c - a === b - c) continue;
    }
    pts.push(new THREE.Vector3(navCenterX(c), 0, navCenterZ(c)));
  }
  return pts;
}
