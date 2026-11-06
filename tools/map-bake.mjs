// Bakes a stage map's gameplay data from its GLB (see js/map.js): a ground heightmap, box and
// sphere colliders, the enemy navigation grid and the named marker points (spawns, loot spots).
// Meshes flagged extras.ground are the walkable ground; meshes flagged extras.collider block
// movement and bullets (see-through BLEND materials don't, except an "Invisible" wall). Instanced
// trees become trunk boxes, rocks spheres, logs boxes. Deep water blocks too.
// usage: node map-bake.mjs <in.glb> <out.json>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import fs from 'fs';

const [inFile, outFile] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inFile);
const root = doc.getRoot();
const sceneExtras = root.listScenes()[0].listChildren()[0].getExtras() || {};
const B = sceneExtras.bounds || { minX: -160, maxX: 160, minZ: -160, maxZ: 160 };
const PAD = 1;
const X0 = Math.floor(B.minX) - PAD, Z0 = Math.floor(B.minZ) - PAD;
const C = 0.5; // collision cell (m)
const NX = Math.ceil((B.maxX + PAD - X0) / C), NZ = Math.ceil((B.maxZ + PAD - Z0) / C);
const ground = new Float32Array(NX * NZ).fill(-Infinity);
const STEP = 0.45, BAND_LO = 0.35, BAND_HI = 2.0, TOP_CAP = 3.2;

// world-space transform helpers
const mul = (m, v) => [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]];
function trs(t, r, s) {
  const [x, y, z, w] = r, x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
  return [(1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0, (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0, (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0, t[0], t[1], t[2], 1];
}
function tris(prim, m) {
  const P = prim.getAttribute('POSITION'), I = prim.getIndices();
  const n = I ? I.getCount() : P.getCount();
  const pts = [];
  for (let i = 0; i < P.getCount(); i++) pts.push(mul(m, P.getElement(i, [])));
  const out = [];
  for (let i = 0; i < n; i += 3) out.push([pts[I ? I.getScalar(i) : i], pts[I ? I.getScalar(i + 1) : i + 1], pts[I ? I.getScalar(i + 2) : i + 2]]);
  return out;
}
// call fn(cellIndex, y) for each cell centre under the triangle (top-down)
function rasterTop(t, fn) {
  const [a, b, c] = t;
  const minX = Math.min(a[0], b[0], c[0]), maxX = Math.max(a[0], b[0], c[0]), minZ = Math.min(a[2], b[2], c[2]), maxZ = Math.max(a[2], b[2], c[2]);
  const den = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
  if (Math.abs(den) < 1e-9) return;
  for (let iz = Math.max(0, Math.floor((minZ - Z0) / C)); iz <= Math.min(NZ - 1, Math.floor((maxZ - Z0) / C)); iz++) {
    const z = Z0 + (iz + 0.5) * C;
    for (let ix = Math.max(0, Math.floor((minX - X0) / C)); ix <= Math.min(NX - 1, Math.floor((maxX - X0) / C)); ix++) {
      const x = X0 + (ix + 0.5) * C;
      const l1 = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / den;
      const l2 = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / den;
      const l3 = 1 - l1 - l2;
      if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
      fn(iz * NX + ix, l1 * a[1] + l2 * b[1] + l3 * c[1]);
    }
  }
}
// call fn(cellIndex, y, normalY) for points spread over the triangle (every ~0.2 m)
function sampleTri(t, fn) {
  const [a, b, c] = t;
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
  const nl = Math.hypot(nx, ny, nz) || 1;
  const n = Math.max(1, Math.ceil(Math.max(Math.hypot(...e1), Math.hypot(...e2), Math.hypot(c[0] - b[0], c[1] - b[1], c[2] - b[2])) / 0.2));
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
    const u = i / n, v = j / n;
    const x = a[0] + e1[0] * u + e2[0] * v, y = a[1] + e1[1] * u + e2[1] * v, z = a[2] + e1[2] * u + e2[2] * v;
    const ix = Math.floor((x - X0) / C), iz = Math.floor((z - Z0) / C);
    if (ix < 0 || iz < 0 || ix >= NX || iz >= NZ) continue;
    fn(iz * NX + ix, y, Math.abs(ny / nl));
  }
}

const nodes = root.listNodes();
const meshNodes = nodes.filter((n) => n.getMesh());
const seeThrough = (prim) => { const m = prim.getMaterial(); return m && m.getAlphaMode() === 'BLEND' && m.getName() !== 'Invisible'; };
// 1. ground
for (const n of meshNodes) {
  if (!(n.getExtras() || {}).ground) continue;
  const m = n.getWorldMatrix();
  for (const p of n.getMesh().listPrimitives()) for (const t of tris(p, m)) rasterTop(t, (i, y) => { if (y > ground[i]) ground[i] = y; });
}
for (let i = 0; i < ground.length; i++) if (ground[i] === -Infinity) ground[i] = 0;
// 2. solid props: steps raise the ground; anything in the body's height band blocks
const stepTop = new Float32Array(NX * NZ).fill(-Infinity), blockTop = new Float32Array(NX * NZ).fill(-Infinity);
const blocked = new Uint8Array(NX * NZ);
const boxes = [], spheres = [];
let instCount = 0;
for (const n of meshNodes) {
  const ex = n.getExtras() || {};
  if (!ex.collider || ex.ground) continue;
  const inst = n.getExtension('EXT_mesh_gpu_instancing');
  const prims = n.getMesh().listPrimitives().filter((p) => !seeThrough(p));
  if (inst) {
    const T = inst.getAttribute('TRANSLATION'), R = inst.getAttribute('ROTATION'), S = inst.getAttribute('SCALE');
    const name = n.getName();
    // local bounds: a tree's trunk (bark) or the whole mesh
    const trunk = prims.find((p) => /bark/i.test((p.getMaterial() && p.getMaterial().getName()) || ''));
    const bb = (ps) => { const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]; for (const p of ps) { const P = p.getAttribute('POSITION'); for (let i = 0; i < P.getCount(); i++) { const v = P.getElement(i, []); for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], v[k]); hi[k] = Math.max(hi[k], v[k]); } } } return [lo, hi]; };
    const [lo, hi] = bb(trunk ? [trunk] : prims);
    for (let i = 0; i < T.getCount(); i++) {
      const m = trs(T.getElement(i, []), R ? R.getElement(i, []) : [0, 0, 0, 1], S ? S.getElement(i, []) : [1, 1, 1]);
      const cs = [];
      for (const x of [lo[0], hi[0]]) for (const y of [lo[1], hi[1]]) for (const z of [lo[2], hi[2]]) cs.push(mul(m, [x, y, z]));
      const mn = [0, 1, 2].map((k) => Math.min(...cs.map((c) => c[k]))), mx = [0, 1, 2].map((k) => Math.max(...cs.map((c) => c[k])));
      if (/^Rocks/.test(name)) {
        const r = Math.min(mx[0] - mn[0], mx[2] - mn[2]) / 2 * 0.85;
        spheres.push([+((mn[0] + mx[0]) / 2).toFixed(2), +((mn[1] + mx[1]) / 2).toFixed(2), +((mn[2] + mx[2]) / 2).toFixed(2), +r.toFixed(2), +mx[1].toFixed(2)]);
      } else if (/^Trees/.test(name)) {
        // the trunk, a little thinner than its widest point (the base flares)
        const cx = (mn[0] + mx[0]) / 2, cz = (mn[2] + mx[2]) / 2, w = Math.max(0.35, Math.min(mx[0] - mn[0], mx[2] - mn[2]) * (trunk ? 0.7 : 0.25));
        boxes.push([cx - w / 2, cz - w / 2, cx + w / 2, cz + w / 2, mn[1] - 0.3, trunk ? mx[1] : mn[1] + 4].map((v) => +v.toFixed(2)));
      } else boxes.push([mn[0], mn[2], mx[0], mx[2], mn[1] - 0.3, mx[1]].map((v) => +v.toFixed(2)));
      instCount++;
    }
    continue;
  }
  const m = n.getWorldMatrix();
  for (const p of prims) for (const t of tris(p, m)) sampleTri(t, (i, y, ny) => {
    const h = y - ground[i];
    if (ny > 0.7 && h > -0.1 && h < STEP) { if (y > stepTop[i]) stepTop[i] = y; return; }
    if (h > BAND_LO && h < BAND_HI) blocked[i] = 1;
    if (h > 0.05 && h < TOP_CAP && y > blockTop[i]) blockTop[i] = y;
  });
}
for (let i = 0; i < ground.length; i++) if (stepTop[i] > ground[i] && !blocked[i]) ground[i] = stepTop[i];
// deep water (a see-through "Water" surface well above the ground) is off limits
for (const n of meshNodes) for (const p of n.getMesh().listPrimitives()) {
  if (!p.getMaterial() || p.getMaterial().getName() !== 'Water' || n.getExtension('EXT_mesh_gpu_instancing')) continue;
  for (const t of tris(p, n.getWorldMatrix())) rasterTop(t, (i, y) => { if (y - ground[i] > 0.6) { blocked[i] = 1; blockTop[i] = Math.max(blockTop[i], y + 1); } });
}
// 3. merge blocked cells into boxes of similar height (greedy rectangles)
const q = (i) => Math.round(Math.min(blockTop[i] - ground[i], TOP_CAP) / 0.3);
const used = new Uint8Array(NX * NZ);
let cellBoxes = 0;
for (let iz = 0; iz < NZ; iz++) for (let ix = 0; ix < NX; ix++) {
  const i = iz * NX + ix;
  if (!blocked[i] || used[i]) continue;
  const k = q(i);
  let w = 1;
  while (ix + w < NX && blocked[i + w] && !used[i + w] && q(i + w) === k) w++;
  let h = 1;
  grow: while (iz + h < NZ) {
    for (let d = 0; d < w; d++) { const j = (iz + h) * NX + ix + d; if (!blocked[j] || used[j] || q(j) !== k) break grow; }
    h++;
  }
  let gmin = Infinity, top = -Infinity;
  for (let dz = 0; dz < h; dz++) for (let d = 0; d < w; d++) { const j = (iz + dz) * NX + ix + d; used[j] = 1; gmin = Math.min(gmin, ground[j]); top = Math.max(top, Math.min(blockTop[j], ground[j] + TOP_CAP)); }
  boxes.push([X0 + ix * C, Z0 + iz * C, X0 + (ix + w) * C, Z0 + (iz + h) * C, gmin - 0.3, top].map((v) => +v.toFixed(2)));
  cellBoxes++;
}
// 4. navigation grid (1 m): blocked where a body (0.5 m pad) would touch a collider
const NAV = 1, NNX = Math.ceil((B.maxX - B.minX) / NAV), NNZ = Math.ceil((B.maxZ - B.minZ) / NAV);
const nav = new Uint8Array(NNX * NNZ);
for (const b of boxes) {
  for (let iz = Math.max(0, Math.floor((b[1] - 0.5 - B.minZ) / NAV)); iz <= Math.min(NNZ - 1, Math.floor((b[3] + 0.5 - B.minZ) / NAV)); iz++)
    for (let ix = Math.max(0, Math.floor((b[0] - 0.5 - B.minX) / NAV)); ix <= Math.min(NNX - 1, Math.floor((b[2] + 0.5 - B.minX) / NAV)); ix++) {
      const x = B.minX + (ix + 0.5) * NAV, z = B.minZ + (iz + 0.5) * NAV;
      const gi = Math.floor((z - Z0) / C) * NX + Math.floor((x - X0) / C), g = ground[gi];
      if (b[5] < g + 0.5 || b[4] > g + 1.6) continue;
      if (x > b[0] - 0.5 && x < b[2] + 0.5 && z > b[1] - 0.5 && z < b[3] + 0.5) nav[iz * NNX + ix] = 1;
    }
}
for (const s of spheres) {
  for (let iz = 0; iz < NNZ; iz++) {
    const z = B.minZ + (iz + 0.5) * NAV; if (Math.abs(z - s[2]) > s[3] + 1) continue;
    for (let ix = 0; ix < NNX; ix++) { const x = B.minX + (ix + 0.5) * NAV; if (Math.hypot(x - s[0], z - s[2]) < s[3] + 0.5) nav[iz * NNX + ix] = 1; }
  }
}
// steep ground is also off limits
for (let iz = 0; iz < NNZ; iz++) for (let ix = 0; ix < NNX; ix++) {
  const x = B.minX + (ix + 0.5) * NAV, z = B.minZ + (iz + 0.5) * NAV;
  const g = (xx, zz) => ground[Math.floor((zz - Z0) / C) * NX + Math.floor((xx - X0) / C)];
  if (Math.abs(g(x + 0.5, z) - g(x - 0.5, z)) > 0.9 || Math.abs(g(x, z + 0.5) - g(x, z - 0.5)) > 0.9) nav[iz * NNX + ix] = 1;
}
// 5. markers
const points = {};
for (const n of nodes) {
  if (n.getMesh() || n === root.listScenes()[0].listChildren()[0]) continue;
  const p = n.getWorldTranslation().map((v) => +v.toFixed(2));
  const ex = n.getExtras() || {};
  points[n.getName()] = ex.light ? { p, light: ex.light, flicker: ex.flicker, pulse: ex.pulse } : p;
}
const hm = new Int16Array(NX * NZ);
for (let i = 0; i < ground.length; i++) hm[i] = Math.round(ground[i] * 100);
const navBytes = new Uint8Array(Math.ceil(nav.length / 8));
for (let i = 0; i < nav.length; i++) if (nav[i]) navBytes[i >> 3] |= 1 << (i & 7);
const out = {
  bounds: B,
  ground: { x0: X0, z0: Z0, cell: C, nx: NX, nz: NZ, cm: Buffer.from(hm.buffer).toString('base64') },
  nav: { x0: B.minX, z0: B.minZ, cell: NAV, nx: NNX, nz: NNZ, bits: Buffer.from(navBytes).toString('base64') },
  boxes, spheres, points,
};
fs.writeFileSync(outFile, JSON.stringify(out));
console.log(`ground ${NX}x${NZ}, ${cellBoxes} prop boxes + ${boxes.length - cellBoxes} instanced boxes (${instCount} instances), ${spheres.length} spheres, nav ${NNX}x${NNZ} ${nav.reduce((t, v) => t + v, 0)} blocked, ${Object.keys(points).length} points, ${(fs.statSync(outFile).size / 1024).toFixed(0)} KB`);
