'use strict';
// Blood on the ground (decisions.md 2026-11-08: "make the map even bloodier"). Flat decals in four
// kinds (splat, pool, smear, spatter), each an InstancedMesh, so all the blood on the map is four
// draw calls. Part of each is scattered across the stage map when it loads; the rest is a ring
// that hits, kills and the player's own wounds keep writing into (the oldest dynamic stain goes
// first). Decals live in the arena world only. Textures are drawn on a canvas at load.

const BLOOD = { ready: false, kinds: {}, cap: IS_TOUCH ? 230 : 360, staticN: IS_TOUCH ? 110 : 170, wall: null };
const BLOOD_KINDS = ['splat', 'pool', 'smear', 'spatter'];

function bloodTexture(kind) {
  const S = 128, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const rng = makeRng(kind.length * 97 + 13);
  const blob = (x, y, r, col, wob = 0.25, n = 14) => {
    g.fillStyle = col; g.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2, rr = r * (1 - wob / 2 + rng() * wob);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.closePath(); g.fill();
  };
  const drops = (n, r0, r1, spread) => { for (let i = 0; i < n; i++) { const a = rng() * Math.PI * 2, d = spread * (0.5 + rng() * 0.5); blob(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, r0 + rng() * (r1 - r0), 'rgba(150,8,12,0.95)', 0.3, 8); } };
  if (kind === 'splat') { blob(64, 64, 26, 'rgba(120,6,10,0.95)', 0.5, 18); blob(60, 62, 14, 'rgba(165,14,18,0.9)', 0.4); drops(16, 2, 6, 54); }
  else if (kind === 'pool') { blob(64, 64, 48, 'rgba(95,4,8,0.92)', 0.22, 22); blob(58, 58, 34, 'rgba(135,8,12,0.9)', 0.25, 18); blob(50, 50, 9, 'rgba(210,60,60,0.45)', 0.3); }
  else if (kind === 'smear') {
    for (let i = 0; i < 9; i++) blob(18 + i * 11, 64 + Math.sin(i * 0.8) * 4, 13 - i * 1.1, 'rgba(125,6,10,0.85)', 0.4, 10);
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,0.35)';
    for (let i = 0; i < 6; i++) g.fillRect(10 + i * 18, 52 + rng() * 6, 10, 2); // drag marks
    g.globalCompositeOperation = 'source-over';
  } else { drops(40, 1.5, 5, 58); blob(64, 64, 8, 'rgba(140,8,12,0.95)'); }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 2;
  return t;
}

function buildBlood() {
  if (BLOOD.ready) return;
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  for (const k of BLOOD_KINDS) {
    const mat = new THREE.MeshBasicMaterial({ map: bloodTexture(k), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const m = new THREE.InstancedMesh(geo, mat, BLOOD.cap);
    for (let i = 0; i < BLOOD.cap; i++) m.setMatrixAt(i, hide);
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false; m.renderOrder = 1;
    m.visible = WORLD.id === 'arena';
    scene.add(m);
    worlds.arena.objects.push(m);
    BLOOD.kinds[k] = { mesh: m, n: 0, ring: BLOOD.staticN };
  }
  // splatter up walls: a separate set of upright decals
  const wm = new THREE.MeshBasicMaterial({ map: BLOOD.kinds.splat.mesh.material.map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: THREE.DoubleSide });
  addCutaway(wm);
  const W = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), wm, IS_TOUCH ? 90 : 160);
  for (let i = 0; i < W.count; i++) W.setMatrixAt(i, hide);
  W.frustumCulled = false; W.renderOrder = 1; W.visible = WORLD.id === 'arena';
  scene.add(W); worlds.arena.objects.push(W);
  BLOOD.wall = { mesh: W, n: 0 };
  BLOOD.ready = true;
  scatterBlood();
  scatterWallBlood();
}

const _bm = new THREE.Matrix4(), _bq = new THREE.Quaternion(), _bp = new THREE.Vector3(), _bs = new THREE.Vector3(), _bup = new THREE.Vector3(0, 1, 0);
function placeBlood(kind, x, z, size, rot, fixed) {
  const K = BLOOD.kinds[kind];
  let i;
  if (fixed) { if (K.n >= BLOOD.staticN) return; i = K.n++; }
  else { i = K.ring; K.ring = K.ring + 1 >= BLOOD.cap ? BLOOD.staticN : K.ring + 1; }
  _bp.set(x, groundAt(x, z) + 0.03, z);
  _bq.setFromAxisAngle(_bup, rot);
  _bs.set(size * (kind === 'smear' ? 1.6 : 1), 1, size);
  K.mesh.setMatrixAt(i, _bm.compose(_bp, _bq, _bs));
  K.mesh.instanceMatrix.needsUpdate = true;
}
// A stain from gameplay: on the ground under `pos` (arena only).
function bloodSplat(pos, size = 1, kind = 'splat') {
  if (!BLOOD.ready || WORLD.id !== 'arena') return;
  placeBlood(kind, pos.x + rand(-0.3, 0.3), pos.z + rand(-0.3, 0.3), size * rand(0.8, 1.25), rand(0, TAU), false);
}

// The map's own blood, heavier where the fighting would have been: the forecourt, the store, the
// tent, the carousel, the car wash and the farm, plus drag trails and spatter everywhere.
function scatterBlood() {
  const rng = makeRng(666);
  const P = (n) => { const v = MAP.points[n]; return v ? (Array.isArray(v) ? v : v.p) : null; };
  const spots = [[0, -10, 22, 1], [0, 22, 9, 0.6], [32, 12, 9, 0.5], [-30, 6, 10, 0.4]];
  for (const [n, r, w] of [['TentEntrance', 16, 0.8], ['Carousel', 12, 0.6], ['FarmYard', 14, 0.5], ['PondDock', 8, 0.3], ['BlockadeEast', 10, 0.4], ['BlockadeWest', 10, 0.4]]) { const p = P(n); if (p) spots.push([p[0], p[2], r, w]); }
  const total = spots.reduce((t, s) => t + s[3], 0);
  const put = (kind, x, z, size, rot) => { if (navWalkable(x, z)) placeBlood(kind, x, z, size, rot, true); };
  for (let k = 0; k < BLOOD.staticN * 4; k++) {
    let r = rng() * total, s = spots[0];
    for (const q of spots) { r -= q[3]; if (r <= 0) { s = q; break; } }
    const a = rng() * TAU, d = Math.sqrt(rng()) * s[2];
    const x = s[0] + Math.cos(a) * d, z = s[1] + Math.sin(a) * d;
    const kind = BLOOD_KINDS[k % 4];
    if (kind === 'smear') {
      // a drag trail: a few smears in a line
      const dir = rng() * TAU;
      for (let j = 0; j < 3; j++) put('smear', x + Math.cos(dir) * j * 1.5, z - Math.sin(dir) * j * 1.5, 1.1 + rng() * 0.6, dir);
    } else put(kind, x, z, kind === 'pool' ? 1.6 + rng() * 2 : 0.9 + rng() * 1.4, rng() * TAU);
  }
}

// Blood sprayed up walls near where the fighting was: rays out from spots on the ground find the
// nearest wall (a box collider), and a splat is stuck to the face it hit.
function scatterWallBlood() {
  const rng = makeRng(1313), W = BLOOD.wall, M = W.mesh;
  const P = (n) => { const v = MAP.points[n]; return v ? (Array.isArray(v) ? v : v.p) : null; };
  const centres = [[0, -10, 22], [0, 22, 10], [32, 12, 10], [-30, 6, 10]];
  for (const n of ['TentEntrance', 'Carousel', 'FarmYard', 'BlockadeEast', 'BlockadeWest']) { const p = P(n); if (p) centres.push([p[0], p[2], 14]); }
  const o = new THREE.Vector3(), d = new THREE.Vector3(), hit = new THREE.Vector3(), n = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), m = new THREE.Matrix4(), z = new THREE.Vector3(0, 0, 1);
  for (let k = 0; k < M.count * 25 && W.n < M.count; k++) {
    const c = centres[k % centres.length], a = rng() * TAU, r = Math.sqrt(rng()) * c[2];
    const x = c[0] + Math.cos(a) * r, zz = c[1] + Math.sin(a) * r;
    if (!navWalkable(x, zz)) continue;
    o.set(x, groundAt(x, zz) + 0.6 + rng() * 1.2, zz);
    const b = rng() * TAU; d.set(Math.cos(b), 0, Math.sin(b));
    const t = rayWorld(o, d, 9).t;
    if (t >= 9) continue;
    hit.copy(o).addScaledVector(d, t);
    // which face of which box: the nearest box surface to the hit point
    colsNear(hit.x - 0.1, hit.z - 0.1, hit.x + 0.1, hit.z + 0.1);
    let best = null, bd = 0.08;
    for (const c2 of nearBoxes) {
      if (c2.ref || hit.y < c2.minY || hit.y > c2.maxY) continue;
      for (const [dist, nx, nz] of [[Math.abs(hit.x - c2.minX), -1, 0], [Math.abs(hit.x - c2.maxX), 1, 0], [Math.abs(hit.z - c2.minZ), 0, -1], [Math.abs(hit.z - c2.maxZ), 0, 1]]) if (dist < bd) { bd = dist; best = [nx, nz]; }
    }
    if (!best || best[0] * d.x + best[1] * d.z > 0) continue;
    n.set(best[0], 0, best[1]);
    q.setFromUnitVectors(z, n).multiply(new THREE.Quaternion().setFromAxisAngle(z, rng() * TAU));
    const size = 0.8 + rng() * 1.3;
    M.setMatrixAt(W.n++, m.compose(hit.addScaledVector(n, 0.03), q, s.set(size, size, size)));
  }
  M.instanceMatrix.needsUpdate = true;
}
