'use strict';
// Stage maps loaded from files: a map is a glTF scene (models/<name>.json, made by
// tools/map-optimize.mjs) plus its baked gameplay data (models/<name>-data.json, made by
// tools/map-bake.mjs: ground heightmap, colliders, navigation grid and marker points). Stage 1's
// map is the clown gas station; it becomes the "arena" world. It loads in the background at boot
// and only shows (and is only simulated) while Stage 1 is the current world.
//
// Scatter (trees, grass, rocks...) comes as EXT_mesh_gpu_instancing, which this three.js version
// doesn't read, so it's built here as InstancedMeshes cut into tiles; each tile is hidden when it's
// off screen or beyond its kind's draw distance, which keeps phones at a steady frame rate.

const MAP = { ready: false, failed: false, promise: null, group: null, tiles: [], cells: [], points: {}, loot: [], spawn: new THREE.Vector3(0, 0, -18), name: '' };
const MAP_TILE = 80; // metres per scatter tile
const MAP_CELL = 128; // metres per merged static cell
const MAP_STATIC_DRAW = IS_TOUCH ? 140 : 210; // how far merged static cells are drawn (m)
// How far each kind of scatter is drawn (m), on phones and on desktops.
const MAP_DRAW = [
  [/^Grass_/, 32, 50], [/^Pond_Reeds/, 50, 80], [/^Bushes_/, 70, 110], [/^(Stumps|Logs)/, 70, 110], [/^Rocks_/, 100, 150], [/^Trees_/, 150, 220],
];

function loadStageMap(name) {
  MAP.name = name;
  const loader = new THREE.GLTFLoader();
  if (window.MeshoptDecoder) loader.setMeshoptDecoder(MeshoptDecoder);
  const data = fetch('models/' + name + '-data.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const gltf = new Promise((res, rej) => loader.load('models/' + name + '.json', res, undefined, rej));
  MAP.promise = Promise.all([data, gltf])
    .then(([d, g]) => buildStageMap(d, g))
    .catch((e) => { console.warn('Stage map failed to load:', e); MAP.failed = true; });
  return MAP.promise;
}

const b64bytes = (s) => { const bin = atob(s); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; };

// Run `fn` with the arena world's colliders and interactables as the live ones, whichever world is active.
function intoArena(fn) {
  if (WORLD.id === 'arena') { fn(); COLG.dirty = true; return; }
  const A = worlds.arena;
  const keep = [boxCols.splice(0), sphCols.splice(0), interactables.splice(0)];
  boxCols.push(...A.box); sphCols.push(...A.sph); interactables.push(...A.inter);
  fn();
  A.box = boxCols.splice(0); A.sph = sphCols.splice(0); A.inter = interactables.splice(0);
  boxCols.push(...keep[0]); sphCols.push(...keep[1]); interactables.push(...keep[2]);
  COLG.dirty = true;
}

// The map's PBR materials as the game's cel-shaded toon materials (cheaper on phones, and they match).
function mapMaterial(m, cache) {
  if (cache.has(m)) return cache.get(m);
  const t = new THREE.MeshToonMaterial({
    color: m.color, map: m.map, emissive: m.emissive, emissiveMap: m.emissiveMap, emissiveIntensity: m.emissiveIntensity,
    transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest, side: m.side, vertexColors: m.vertexColors,
    depthWrite: m.depthWrite, gradientMap: gradTex,
  });
  t.name = m.name;
  addCutaway(t);
  for (const k of ['map', 'emissiveMap']) if (t[k]) { t[k].encoding = THREE.LinearEncoding; t[k].anisotropy = IS_TOUCH ? 1 : 4; }
  cache.set(m, t);
  m.dispose();
  return t;
}

async function buildStageMap(data, gltf) {
  // ground
  const G = data.ground;
  Object.assign(MAPG, { x0: G.x0, z0: G.z0, cell: G.cell, nx: G.nx, nz: G.nz, h: new Int16Array(b64bytes(G.cm).buffer), ready: true });
  // bounds and navigation
  const B = data.bounds;
  worlds.arena.bounds = { minX: B.minX, maxX: B.maxX, minZ: B.minZ, maxZ: B.maxZ };
  if (WORLD.id === 'arena') WORLD.bounds = worlds.arena.bounds;
  const N = data.nav;
  navInit(Math.max(N.nx, N.nz), N.cell, N.x0, N.z0, b64bytes(N.bits));
  // markers
  MAP.points = data.points;
  const pt = (v) => new THREE.Vector3(...(Array.isArray(v) ? v : v.p));
  if (data.points.PlayerSpawn) MAP.spawn.copy(pt(data.points.PlayerSpawn));
  spawnPoints.length = 0;
  MAP.loot = [];
  for (const [k, v] of Object.entries(data.points)) {
    if (/^EnemySpawn/.test(k)) spawnPoints.push(pt(v));
    else if (/^Loot_/.test(k)) MAP.loot.push(pt(v));
  }

  // the scene
  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const cache = new Map();
  const json = gltf.parser.json;
  // instanced scatter
  const instanced = [];
  for (const nd of json.nodes) {
    const ext = nd.extensions && nd.extensions.EXT_mesh_gpu_instancing;
    if (!ext) continue;
    const obj = root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(nd.name));
    if (!obj) continue;
    const A = ext.attributes;
    const get = (k) => (A[k] != null ? gltf.parser.getDependency('accessor', A[k]) : Promise.resolve(null));
    const [T, R, S] = await Promise.all([get('TRANSLATION'), get('ROTATION'), get('SCALE')]);
    instanced.push({ name: nd.name, obj, T, R, S });
  }
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
  const val = (a, i, k) => { const v = a.array[i * a.itemSize + k]; return a.normalized ? Math.max(v / (a.array instanceof Int16Array ? 32767 : a.array instanceof Int8Array ? 127 : a.array instanceof Uint16Array ? 65535 : 255), -1) : v; };
  const group = new THREE.Group();
  group.name = 'stage-map';
  for (const it of instanced) {
    const meshes = it.obj.isMesh ? [it.obj] : it.obj.children.filter((c) => c.isMesh);
    const draw = MAP_DRAW.find(([re]) => re.test(it.name)) || [null, 120, 200];
    const maxD = IS_TOUCH ? draw[1] : draw[2];
    const n = it.T.count;
    // bucket the instances into tiles
    const tiles = new Map();
    for (let i = 0; i < n; i++) {
      _p.set(val(it.T, i, 0), val(it.T, i, 1), val(it.T, i, 2));
      if (it.R) _q.set(val(it.R, i, 0), val(it.R, i, 1), val(it.R, i, 2), val(it.R, i, 3)).normalize(); else _q.set(0, 0, 0, 1);
      if (it.S) _s.set(val(it.S, i, 0), val(it.S, i, 1), val(it.S, i, 2)); else _s.set(1, 1, 1);
      _m.compose(_p, _q, _s).premultiply(it.obj.matrixWorld);
      const key = Math.floor(_p.x / MAP_TILE) + ',' + Math.floor(_p.z / MAP_TILE);
      let t = tiles.get(key);
      if (!t) tiles.set(key, (t = { mats: [], scale: 0 }));
      t.mats.push(_m.clone());
      t.scale = Math.max(t.scale, _s.x, _s.y, _s.z);
    }
    for (const t of tiles.values()) {
      const tile = { meshes: [], center: new THREE.Vector3(), radius: 0, maxD };
      for (const m of t.mats) tile.center.add(_p.setFromMatrixPosition(m));
      tile.center.divideScalar(t.mats.length);
      let geoR = 0;
      for (const mesh of meshes) { if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere(); geoR = Math.max(geoR, mesh.geometry.boundingSphere.center.length() + mesh.geometry.boundingSphere.radius); }
      for (const m of t.mats) tile.radius = Math.max(tile.radius, _p.setFromMatrixPosition(m).distanceTo(tile.center));
      tile.radius += geoR * t.scale;
      for (const mesh of meshes) {
        const im = new THREE.InstancedMesh(mesh.geometry, mapMaterial(mesh.material, cache), t.mats.length);
        t.mats.forEach((m, i) => im.setMatrixAt(i, m));
        im.instanceMatrix.needsUpdate = true;
        im.frustumCulled = false; // culled per tile in updateStageMap
        im.receiveShadow = true;
        group.add(im);
        tile.meshes.push(im);
      }
      MAP.tiles.push(tile);
    }
    it.obj.parent.remove(it.obj);
  }
  // everything else: static meshes, merged by material within each MAP_TILE cell (a few hundred
  // separate meshes would be a few hundred draw calls), with toon materials
  mergeStatics(root, group, cache);
  scene.add(group);
  MAP.group = group;
  worlds.arena.objects.push(group);
  group.visible = WORLD.id === 'arena';

  // colliders, and the game's own props: a health vending machine by the store and red barrels by the pumps
  intoArena(() => {
    for (const b of data.boxes) boxCols.push({ minX: b[0], minZ: b[1], maxX: b[2], maxZ: b[3], minY: b[4], maxY: b[5], ref: null });
    for (const s of data.spheres) sphCols.push({ x: s[0], y: s[1], z: s[2], r: s[3], top: s[4] });
    const e = data.points.StoreEntrance;
    if (e) buildVending(e[0] + 4.2, e[2] - 1.6, Math.PI, 'health');
    for (const [x, z] of [[-12.5, -13], [12.5, -5], [-4, -3.5], [4.5, -14.5], [-20, 2], [18, -18]]) if (navWalkable(x, z)) buildBarrel(x, z);
  });
  // a shorter view on phones: the fog hides where the draw distance ends
  worlds.arena.fog = new THREE.Fog(FOG_COLOR, IS_TOUCH ? 50 : 70, IS_TOUCH ? 135 : 200);
  if (WORLD.id === 'arena') scene.fog = worlds.arena.fog;
  MAP.ready = true;
  buildBlood(); // js/blood.js
  if (typeof campaign !== 'undefined') campaign.previewUrl = null; // re-render the stage card picture
}

// Read component c of vertex i, undoing the integer quantization of packed (meshopt) attributes.
function attrComp(a, i, c) {
  const arr = a.isInterleavedBufferAttribute ? a.data.array : a.array;
  const v = c === 0 ? a.getX(i) : c === 1 ? a.getY(i) : c === 2 ? a.getZ(i) : a.getW(i);
  if (!a.normalized) return v;
  if (arr instanceof Int16Array) return Math.max(v / 32767, -1);
  if (arr instanceof Uint16Array) return v / 65535;
  if (arr instanceof Int8Array) return Math.max(v / 127, -1);
  if (arr instanceof Uint8Array) return v / 255;
  return v;
}
// Materials that differ only in colour are drawn as one, with the colour in the vertices.
const matKey = (m) => [m.map ? m.map.uuid : '', m.emissiveMap ? m.emissiveMap.uuid : '', m.emissive.getHex(), m.emissiveIntensity, m.transparent, m.opacity, m.alphaTest, m.side, m.depthWrite].join('|');
const _sharedMats = new Map();
function sharedMat(m) {
  const k = matKey(m);
  let s = _sharedMats.get(k);
  if (!s) { s = addCutaway(m.clone()); s.color.setRGB(1, 1, 1); s.vertexColors = true; s.name = 'merged:' + m.name; _sharedMats.set(k, s); }
  return s;
}
const MAP_INK = addCutaway(new THREE.LineBasicMaterial({ color: 0x1c0e20, transparent: true, opacity: 0.88 }));
const MAP_NO_SHADOW = /^(Terrain|Road|GasStation_Lot|Bounds_|Blood|Graffiti|Pond$|PowerLines)/;
function mergeStatics(root, group, cache) {
  root.updateMatrixWorld(true);
  const meshes = [];
  root.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) meshes.push(o); });
  const buckets = new Map();
  const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _nm = new THREE.Matrix3();
  for (const o of meshes) {
    if (o.material.name === 'Invisible') continue;
    const mat = mapMaterial(o.material, cache);
    let top = o; while (top.parent && top.parent !== root) top = top.parent;
    const prop = !MAP_NO_SHADOW.test(top.name) && !mat.transparent;
    const cast = !IS_TOUCH && prop; // no map shadows on phones
    const geo = o.geometry, P = geo.attributes.position, idx = geo.index;
    const nTri = (idx ? idx.count : P.count) / 3;
    const vi = (k) => (idx ? idx.getX(k) : k);
    // each triangle goes to the cell under its middle
    for (let t = 0; t < nTri; t++) {
      _v.set(0, 0, 0);
      for (let k = 0; k < 3; k++) { const i = vi(t * 3 + k); _v.x += attrComp(P, i, 0); _v.y += attrComp(P, i, 1); _v.z += attrComp(P, i, 2); }
      _v.divideScalar(3).applyMatrix4(o.matrixWorld);
      const key = matKey(mat) + (cast ? 's' : 'n') + (prop ? 'p' : '') + Math.floor(_v.x / MAP_CELL) + ',' + Math.floor(_v.z / MAP_CELL);
      let b = buckets.get(key);
      if (!b) buckets.set(key, (b = { mat: sharedMat(mat), cast, prop, parts: new Map() }));
      let part = b.parts.get(o);
      if (!part) b.parts.set(o, (part = []));
      part.push(t);
    }
  }
  for (const b of buckets.values()) {
    const uv = !!(b.mat.map || b.mat.emissiveMap);
    let nv = 0, ni = 0;
    for (const tris of b.parts.values()) ni += tris.length * 3;
    const pos = [], nor = [], uvs = [], cols = [], index = new Uint32Array(ni);
    ni = 0;
    for (const [o, tris] of b.parts) {
      const geo = o.geometry, P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv, C = geo.attributes.color, idx = geo.index;
      _nm.getNormalMatrix(o.matrixWorld);
      const remap = new Map();
      const tint = cache.get(o.material).color, vc = cache.get(o.material).vertexColors && C;
      for (const t of tris) for (let k = 0; k < 3; k++) {
        const i = idx ? idx.getX(t * 3 + k) : t * 3 + k;
        let j = remap.get(i);
        if (j === undefined) {
          j = nv++; remap.set(i, j);
          _v.set(attrComp(P, i, 0), attrComp(P, i, 1), attrComp(P, i, 2)).applyMatrix4(o.matrixWorld);
          pos.push(_v.x, _v.y, _v.z);
          if (N) _n.set(attrComp(N, i, 0), attrComp(N, i, 1), attrComp(N, i, 2)).applyMatrix3(_nm).normalize(); else _n.set(0, 1, 0);
          nor.push(_n.x, _n.y, _n.z);
          if (uv) { if (U) uvs.push(attrComp(U, i, 0), attrComp(U, i, 1)); else uvs.push(0, 0); }
          // each part's own colour (times its vertex colours) is baked into the vertices
          if (vc) cols.push(attrComp(C, i, 0) * tint.r, attrComp(C, i, 1) * tint.g, attrComp(C, i, 2) * tint.b); else cols.push(tint.r, tint.g, tint.b);
        }
        index[ni++] = j;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.setIndex(new THREE.BufferAttribute(nv > 65535 ? index : new Uint16Array(index), 1));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, b.mat);
    m.castShadow = b.cast; m.receiveShadow = true;
    group.add(m);
    MAP.cells.push(m);
    // cartoon line art: ink along the creases and silhouettes of buildings and props
    if (b.prop) {
      const lines = new THREE.LineSegments(new THREE.EdgesGeometry(g, 38), MAP_INK);
      lines.geometry.computeBoundingSphere();
      group.add(lines);
      MAP.cells.push(lines);
    }
  }
  root.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
}

// Per frame: show only the scatter tiles in view and within draw distance, and the merged static
// cells within draw distance (three.js culls those outside the view itself).
const _mapFrustum = new THREE.Frustum(), _mapPS = new THREE.Matrix4(), _mapSphere = new THREE.Sphere();
function updateStageMap(cam) {
  if (!MAP.ready || !MAP.group.visible) return;
  _mapPS.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  _mapFrustum.setFromProjectionMatrix(_mapPS);
  const cp = cam.position;
  for (const t of MAP.tiles) {
    _mapSphere.center.copy(t.center); _mapSphere.radius = t.radius;
    const on = cp.distanceTo(t.center) - t.radius < t.maxD && _mapFrustum.intersectsSphere(_mapSphere);
    for (const m of t.meshes) m.visible = on;
  }
  for (const m of MAP.cells) m.visible = cp.distanceTo(m.geometry.boundingSphere.center) - m.geometry.boundingSphere.radius < MAP_STATIC_DRAW;
}

// Where stage play starts: the map's player spawn (or the middle before it loads).
const stageSpawn = () => (MAP.ready ? MAP.spawn.clone() : new THREE.Vector3(0, 0, 12));
// facing the store (the map's StoreEntrance marker), or straight ahead
function stageSpawnYaw() {
  const e = MAP.ready && MAP.points.StoreEntrance;
  return e ? Math.atan2(-(e[0] - MAP.spawn.x), -(e[2] - MAP.spawn.z)) : 0;
}

loadStageMap('map-clown-station');
