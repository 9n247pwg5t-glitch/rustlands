'use strict';
// Stage 1's extra detail layer (decisions.md 2026-11-10: "switch back [to the 3D compound] but with
// extreme detail, as much as an iOS version can handle"). Loaded before js/compound.js, which calls
// in here while it builds:
//  - cmpGround: the yard's ground is one hand-painted picture (about 20 px per metre) instead of a
//    tiled texture: mud, dust and worn grass, trampled paths and footprints between the gate, the
//    ring and the tent, tyre ruts, gravel, dried-mud cracks, burn marks round the fire barrels, oil,
//    soaked-in blood, litter specks, and soft contact shadows baked under everything that stands on
//    it. A fine grit texture is multiplied over it up close. One draw.
//  - cmpExtra: more props and finer building detail, merged with the rest of the map (colour-only
//    materials, so they add triangles but hardly any draws): fence rails and post caps, shack
//    windows, frames, stovepipes and signs, house chimneys, gutters, porches and AC units, the bus's
//    and trailer's fittings, ringside weapons and debris, crowd signs on the barriers (one atlas),
//    and a dense scatter of junk (boxes, cans, bottles, tyres, busted TVs, carts, traffic drums).
//  - cmpExtraFx / updateCompoundExtra: propaganda TV screens on poles (one animated canvas), and
//    drifting ash and moths round the floodlights (two point sets animated on the GPU).
// Everything here is placeholder art: no names (the screens and signs use generic words only).

// --- the painted ground -------------------------------------------------------------------------
function cmpGround(fx, D) {
  const FX = CMP_FENCE.x, FZ = CMP_FENCE.z, K = IS_TOUCH ? 16 : 20; // px per metre
  const W = Math.round(FX * 2 * K), H = Math.round(FZ * 2 * K);
  const rng = makeRng(4242), r = () => rng();
  const tex = cmpCanvas(W, H, (g) => {
    const X = (x) => (x + FX) * K, Z = (z) => (z + FZ) * K;
    const blot = (x, z, rad, col0, col1 = 'rgba(0,0,0,0)') => { const gr = g.createRadialGradient(X(x), Z(z), 0, X(x), Z(z), rad * K); gr.addColorStop(0, col0); gr.addColorStop(1, col1); g.fillStyle = gr; g.beginPath(); g.arc(X(x), Z(z), rad * K, 0, TAU); g.fill(); };
    const rx = () => (r() - 0.5) * 2 * FX, rz = () => (r() - 0.5) * 2 * FZ;
    // base dirt, then big soft patches: dark mud, pale dust, worn grass
    g.fillStyle = '#4e3a29'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 160; i++) blot(rx(), rz(), 2 + r() * 7, `rgba(${30 + r() * 20},${22 + r() * 14},${16 + r() * 10},${0.25 + r() * 0.3})`);
    for (let i = 0; i < 80; i++) blot(rx(), rz(), 2 + r() * 6, `rgba(${120 + r() * 30},${96 + r() * 25},${70 + r() * 20},${0.08 + r() * 0.12})`);
    for (let i = 0; i < 140; i++) blot(rx(), rz(), 1.5 + r() * 5, `rgba(${55 + r() * 25},${70 + r() * 25},${30 + r() * 15},${0.2 + r() * 0.3})`);
    // grass thick along the fence, thin in the open
    for (let i = 0; i < 9000; i++) {
      const side = i % 4, t = (r() - 0.5) * 2, d = Math.pow(r(), 2) * 6;
      const [x, z] = side === 0 ? [t * FX, -FZ + d] : side === 1 ? [t * FX, FZ - d] : side === 2 ? [-FX + d, t * FZ] : [FX - d, t * FZ];
      g.strokeStyle = `rgba(${50 + r() * 40},${65 + r() * 45},${25 + r() * 20},${0.5 + r() * 0.4})`; g.lineWidth = 1 + r();
      g.beginPath(); g.moveTo(X(x), Z(z)); g.lineTo(X(x) + (r() - 0.5) * 6, Z(z) - 3 - r() * 6); g.stroke();
    }
    // gravel and pebbles everywhere
    for (let i = 0; i < 26000; i++) { const v = 30 + r() * 90; g.fillStyle = `rgba(${v},${v * 0.88},${v * 0.74},${0.2 + r() * 0.45})`; const s = 0.6 + r() * 1.8; g.fillRect(r() * W, r() * H, s, s); }
    // worn paths: trampled, paler, packed (the crowd's routes)
    const path = (pts, w, a) => { g.lineCap = 'round'; g.lineJoin = 'round'; for (const [ww, aa] of [[w * 1.6, a * 0.4], [w, a]]) { g.strokeStyle = `rgba(150,128,100,${aa})`; g.lineWidth = ww * K; g.beginPath(); pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.stroke(); } };
    const routes = [[[0, 38], [0, 26], [-1, 16], [0, 8]], [[0, -30], [0, -20], [1, -12], [0, -7]], [[-22, 0], [-14, 1], [-7, 0]], [[22, 0], [14, -1], [7, 0]],
      [[0, 26], [-14, 24], [-30, 25], [-34, 26]], [[0, 26], [16, 24], [30, 25], [36, 26]], [[-1, -20], [-12, -24], [-24, -29]], [[1, -20], [12, -24], [22, -29]],
      [[-22, 0], [-30, -2], [-38, -4]], [[22, 0], [30, -6], [37, -20]], [[22, 0], [33, 4], [38, 9]]];
    for (const p of routes) path(p, 2.2, 0.16);
    // footprints along the paths
    for (const p of routes) for (let i = 0; i + 1 < p.length; i++) {
      const [ax, az] = p[i], [bx, bz] = p[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.round(L * 1.6), dir = Math.atan2(bz - az, bx - ax);
      for (let k = 0; k < n; k++) {
        const t = r(), side = (r() - 0.5) * 1.8, x = ax + (bx - ax) * t - Math.sin(dir) * side, z = az + (bz - az) * t + Math.cos(dir) * side;
        g.save(); g.translate(X(x), Z(z)); g.rotate(dir + (r() - 0.5) * 0.4); g.fillStyle = `rgba(35,26,18,${0.35 + r() * 0.25})`;
        for (const o of [-1, 1]) { g.beginPath(); g.ellipse(o * 0.2 * K, 0, 0.14 * K, 0.07 * K, 0, 0, TAU); g.fill(); }
        g.restore();
      }
    }
    // tyre ruts from the gate to the bus and the trailer
    const rut = (pts) => { for (const off of [-0.8, 0.8]) { g.strokeStyle = 'rgba(30,22,16,0.45)'; g.lineWidth = 0.35 * K; g.beginPath(); pts.forEach(([x, z], i) => { const nx = x + off, nz = z; i ? g.lineTo(X(nx), Z(nz)) : g.moveTo(X(nx), Z(nz)); }); g.stroke(); } };
    rut([[-4, 38], [-14, 32], [-30, 20], [-40, 2]]); rut([[4, 38], [16, 32], [30, 10], [38, -20]]);
    // dried-mud cracks in the dusty patches
    g.strokeStyle = 'rgba(25,18,12,0.45)'; g.lineWidth = 1;
    for (let i = 0; i < 70; i++) { let x = X(rx()), z = Z(rz()); for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(x, z); x += (r() - 0.5) * 40; z += (r() - 0.5) * 40; g.lineTo(x, z); g.stroke(); } }
    // burn marks round the fire barrels, oil under the bus, generators and trailer
    for (const [x, z] of CMP.fires) { blot(x, z, 2.6, 'rgba(12,8,6,0.75)'); for (let k = 0; k < 14; k++) blot(x + (r() - 0.5) * 3, z + (r() - 0.5) * 3, 0.2 + r() * 0.3, 'rgba(230,120,40,0.35)'); }
    for (const [x, z, s] of [[-41, -8, 4], [38, -24, 3], [-27, -14, 1.6], [27, 14, 1.6], [-27, 14, 1.6], [27, -14, 1.6], [-33, 12, 2.5], [-20, 31, 3]]) blot(x, z, s, 'rgba(10,8,12,0.6)');
    // blood soaked into the dirt (under the decals): round the ring, the racks, the drag routes
    const soak = (x, z, rad, a) => { blot(x, z, rad, `rgba(70,4,8,${a})`); for (let k = 0; k < 18; k++) { const an = r() * TAU, dd = rad * (0.6 + r()); blot(x + Math.cos(an) * dd, z + Math.sin(an) * dd, 0.1 + r() * 0.35, 'rgba(90,6,10,0.8)'); } };
    for (const s of D.bloodSpots) for (let k = 0; k < 3; k++) soak(s[0] + (r() - 0.5) * s[2], s[1] + (r() - 0.5) * s[2], 0.8 + r() * 1.6 * s[3], 0.35 + r() * 0.3);
    for (const line of D.bloodTrails || []) { g.strokeStyle = 'rgba(80,6,10,0.45)'; g.lineWidth = 0.7 * K; g.beginPath(); line.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.stroke(); }
    // litter specks: cigarette butts, bottle caps, paper scraps
    for (let i = 0; i < 900; i++) { const c = r(); g.fillStyle = c < 0.4 ? 'rgba(200,190,170,0.5)' : c < 0.6 ? 'rgba(170,140,60,0.5)' : c < 0.8 ? 'rgba(150,30,30,0.5)' : 'rgba(110,120,130,0.5)'; g.fillRect(r() * W, r() * H, 1 + r() * 2.5, 1 + r() * 1.5); }
    // soft contact shadows under everything standing on the ground (baked ambient occlusion)
    g.save(); g.shadowColor = 'rgba(8,4,10,0.85)'; g.shadowBlur = 0.9 * K; g.shadowOffsetX = W * 2; g.fillStyle = '#000';
    for (const b of D.boxes) { if (b[4] > 0.3) continue; const pad = 0.15; g.fillRect(X(b[0] - pad) - W * 2, Z(b[1] - pad), (b[2] - b[0] + pad * 2) * K, (b[3] - b[1] + pad * 2) * K); }
    for (const s of D.spheres) { g.beginPath(); g.arc(X(s[0]) - W * 2, Z(s[2]), (s[3] + 0.2) * K, 0, TAU); g.fill(); }
    g.restore();
  });
  tex.anisotropy = IS_TOUCH ? 2 : 8;
  // a fine grit multiplied over it up close (neutral grey: pebbles, grain, tiny cracks)
  const grit = cmpCanvas(128, 128, (g) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) { const v = 70 + rng() * 80; g.fillStyle = `rgb(${v},${v},${v})`; const s = 0.8 + rng() * 2.4; g.beginPath(); g.arc(rng() * 128, rng() * 128, s, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(40,40,40,0.5)'; for (let i = 0; i < 6; i++) { g.beginPath(); let x = rng() * 128, y = rng() * 128; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rng() - 0.5) * 24; y += (rng() - 0.5) * 24; g.lineTo(x, y); } g.stroke(); }
  });
  grit.wrapS = grit.wrapT = THREE.RepeatWrapping;
  const mat = new THREE.MeshToonMaterial({ map: tex, gradientMap: gradTex });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.gritMap = { value: grit };
    sh.fragmentShader = 'uniform sampler2D gritMap;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      diffuseColor.rgb *= mix(vec3(1.0), texture2D(gritMap, vUv * vec2(${(FX * 2 / 2.2).toFixed(1)}, ${(FZ * 2 / 2.2).toFixed(1)})).rgb * 2.0, 0.55);`);
  };
  const m = new THREE.Mesh(new THREE.PlaneGeometry(FX * 2, FZ * 2).rotateX(-Math.PI / 2), mat);
  m.position.y = 0.022; m.receiveShadow = true; m.renderOrder = -1; m.name = 'Ground';
  fx.add(m);
}

// --- props and building detail --------------------------------------------------------------------
function cmpExtra(H, T, det, dblk, chair) {
  const { add, blk, col, solid, sign, glowAt, D, FX, FZ, R, wood, steel, bark, tyreM, crate, rustM } = H;
  const rnd = cmpRng, metal = cmpMat(0x6a6a72), dark = cmpMat(0x1e1a1c), red = cmpMat(0xb3121a), white = cmpMat(0xe8e0d0), yellow = cmpMat(0xd8b23a);
  const brown = cmpMat(0x8a6a44), cardboard = cmpMat(0xa07a4a), green = cmpMat(0x2f6a3a), glass = cmpMat(0x3a5a3a), amber = cmpMat(0x7a4a1a), orange = cmpMat(0xff6a1a);
  const lit = cmpMat(0xffd27a, null, 0xffa040), screenOff = cmpMat(0x101418), plank = cmpMat(0x5a4030), rail = cmpMat(0x3a2a20);
  const C = Math.cos, S = Math.sin;

  // fence: rails along the inside face and caps on the posts
  const runs = [[-FX, -FZ, FX, -FZ, 1], [-FX, FZ, -5, FZ, -1], [5, FZ, FX, FZ, -1], [-FX, -FZ, -FX, FZ, 1], [FX, -FZ, FX, FZ, -1]];
  for (const [x0, z0, x1, z1, s] of runs) {
    const L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0), nx = (z1 - z0) / L * s, nz = -(x1 - x0) / L * s;
    const cx = (x0 + x1) / 2 - nx * 0.14 * (x0 === x1 ? -1 : 1), cz = (z0 + z1) / 2 + nz * 0.14 * (z0 === z1 ? 1 : -1);
    for (const y of [0.55, 2.35]) dblk(0.08, 0.14, L, rail, x0 === x1 ? x0 + s * 0.14 : cx, y, z0 === z1 ? z0 + s * 0.14 : cz, ang);
    const n = Math.round(L / 4);
    for (let i = 0; i <= n; i++) { const t = i / n; det(new THREE.ConeGeometry(0.16, 0.22, 4), rail, x0 + (x1 - x0) * t, 3.35, z0 + (z1 - z0) * t, Math.PI / 4); }
  }

  // shacks: door frames, barred windows, wall ribs, a stovepipe with smoke, a bulb over the door, a sign
  for (const [x, z, w, d] of [[-34, 28, 7, 5], [36, 28, 6, 5], [-24, -31, 6, 4], [22, -31, 5, 4]]) {
    const fz = z + d / 2 + 0.05;
    for (const o of [-0.58, 0.58]) dblk(0.1, 2.1, 0.08, plank, x + o, 0, fz); dblk(1.26, 0.1, 0.08, plank, x, 2.05, fz);
    const wx = x + w / 4 + 0.4;
    dblk(1.2, 0.9, 0.04, cmpMat(0x2a1c10, null, 0x3a2008), wx, 1.3, fz);
    for (let i = 0; i < 5; i++) dblk(0.04, 0.9, 0.06, metal, wx - 0.48 + i * 0.24, 1.3, fz + 0.03);
    for (let i = 0; i < Math.floor(w / 0.5); i++) dblk(0.05, 3.1, 0.05, cmpMat(0x5a5650), x - w / 2 + 0.25 + i * 0.5, 0, fz - 0.01);
    det(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 8), dark, x - w / 2 + 0.8, 3.9, z - d / 4);
    CMP.smoke.push([x - w / 2 + 0.8, 4.6, z - d / 4, 0.35]);
    CMP.fx.push({ kind: 'bulb', x, y: 2.35, z: fz + 0.25, color: 0xffd27a, s: 0.8 });
    glowAt(x, fz + 1.2, 2.2, 0xffb050);
    dblk(0.5, 0.5, 0.5, cmpMat(0x8a8a90), x + w / 2 - 0.5, 0.2, fz + 0.3); // an AC unit / box
    for (let k = 0; k < 3; k++) dblk(0.35, 0.35, 0.35, cardboard, x - w / 2 + 0.6 + k * 0.4, k === 2 ? 0.35 : 0, fz + 0.4, rnd());
  }
  // houses outside: chimneys, gutters, porch posts and steps, shutters, AC units, satellite dishes
  for (const [x, z, ry] of [[-62, -66, 0], [-22, -66, 0], [18, -66, 0], [58, -66, 0], [-62, 66, Math.PI], [-22, 66, Math.PI], [18, 66, Math.PI], [58, 66, Math.PI], [-80, -28, Math.PI / 2], [-80, 14, Math.PI / 2], [80, -28, -Math.PI / 2], [80, 14, -Math.PI / 2]]) {
    const L = (lx, ly, lz, w, h, d, m) => dblk(w, h, d, m, x + lx * C(ry) + lz * S(ry), ly, z - lx * S(ry) + lz * C(ry), ry);
    L(-3.5, 4.6, -1, 0.8, 2.2, 0.8, cmpMat(0x6a3a2a));
    L(0, 3.55, 4.15, 12.4, 0.12, 0.18, cmpMat(0xc8c0b0));
    for (const o of [-0.4, 2.4]) L(o, 0, 5.5, 0.12, 2.4, 0.12, cmpMat(0xd8d0c0));
    L(1, 2.4, 5.0, 3.2, 0.12, 1.8, cmpMat(0x5a4a3a));
    for (let k = 0; k < 2; k++) L(1, 0, 5.9 + k * 0.3, 1.4, 0.3 - k * 0.15, 0.3, cmpMat(0x8a8078));
    for (const wx of [-3.8, 3.4]) for (const o of [-0.8, 0.8]) L(wx + o, 1.4, 4.08, 0.25, 1.2, 0.05, cmpMat(0x2a3a4a));
    L(6.4, 0, 0, 0.8, 0.8, 0.6, cmpMat(0x9a9aa0));
    if (rnd() < 0.5) { const g = det(new THREE.SphereGeometry(0.45, 8, 4, 0, TAU, 0, Math.PI / 2), white, x + 3 * C(ry) + 1 * S(ry), 4.6, z - 3 * S(ry) + 1 * C(ry)); g.rotation.x = -0.9; }
  }
  // the bus: a lit destination sign, headlights, a roof rack of junk, a flat tyre's rim, a ladder
  dblk(2.2, 0.35, 0.05, cmpMat(0xffd27a, null, 0xffb040), -41, 2.9, -2.2);
  for (const o of [-1.1, 1.1]) dblk(0.3, 0.2, 0.05, cmpMat(0xfff0c0, null, 0xffe0a0), -41 + o, 1.05, -2.22);
  for (let k = 0; k < 7; k++) dblk(0.5 + rnd() * 0.6, 0.3 + rnd() * 0.4, 0.5 + rnd() * 0.8, [crate, cardboard, rustM, dark][k % 4], -41 + (rnd() - 0.5) * 2, 3.5, -12 + k * 1.3 + rnd(), rnd());
  for (let i = 0; i < 6; i++) dblk(0.04, 0.04, 2.8, metal, -42.2 + i * 0.45, 3.5, -8);
  // the trailer: windows, an AC unit, a propane tank, a wheel
  for (const wx of [35.8, 40.4]) { dblk(1.2, 0.7, 0.05, lit, wx, 2, -22.27); dblk(1.3, 0.08, 0.08, metal, wx, 2.72, -22.25); }
  dblk(1, 0.5, 0.8, cmpMat(0x9a9aa0), 39, 3.6, -24);
  det(new THREE.CylinderGeometry(0.3, 0.3, 1.1, 10), white, 43.1, 0.55, -23);
  det(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12).rotateX(Math.PI / 2), tyreM, 36, 0.45, -22.2);

  // ringside: weapons and debris from the matches (bats, a crowbar, a chain, lids, broken boards, belts of tape)
  const bat = (x, z, ry) => { dblk(0.07, 0.07, 0.9, cmpMat(0x9a7a50), x, 0.04, z, ry); for (let k = 0; k < 5; k++) det(new THREE.ConeGeometry(0.02, 0.12, 4), metal, x + S(ry) * (0.15 + k * 0.06), 0.12, z + C(ry) * (0.15 + k * 0.06), 0); };
  bat(-7.5, 7.6, 0.6); bat(7.8, -7.2, 2.2); bat(-9.4, -4, 1.4); bat(4.6, 8.2, -0.9);
  dblk(0.04, 0.04, 0.8, cmpMat(0x6a2020), 6.8, 0.03, 7.4, 1.1); // crowbar
  for (let k = 0; k < 10; k++) det(new THREE.TorusGeometry(0.06, 0.018, 3, 6), metal, -6.6 + k * 0.1, 0.03, -8 + S(k) * 0.08).rotation.x = Math.PI / 2 * (k % 2); // chain
  for (const [x, z] of [[-8.2, 3], [8.8, 4.6], [-3, -8.4]]) det(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 12), metal, x, 0.02, z);
  for (let k = 0; k < 8; k++) dblk(0.15 + rnd() * 0.5, 0.03, 0.2 + rnd() * 0.6, cmpMat(0xd8d0c4), (rnd() - 0.5) * 18, 0.01, (rnd() < 0.5 ? -1 : 1) * (7 + rnd() * 3), rnd() * 3);
  // apron trim
  for (const s of [-1, 1]) { dblk(R.half * 2 + 0.06, 0.08, 0.04, red, R.x, R.h - 0.1, R.z + s * (R.half + 0.02)); dblk(0.04, 0.08, R.half * 2 + 0.06, red, R.x + s * (R.half + 0.02), R.h - 0.1, R.z); }

  // crowd signs hung on the barriers: one painted atlas, eight signs
  const words = ['MORE!', 'AGAIN!', 'BLOOD!', '#1 FAN', 'BOO!', 'HIT HIM', 'LOSER', 'ENCORE'];
  const atlas = cmpCanvas(512, 256, (g) => {
    words.forEach((w, i) => {
      const x = (i % 4) * 128, y = Math.floor(i / 4) * 128;
      g.fillStyle = ['#efe6d0', '#f6f0a0', '#e8d8ff', '#ffffff'][i % 4]; g.fillRect(x + 4, y + 20, 120, 88);
      g.font = `bold ${w.length > 6 ? 24 : 32}px Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = ['#b3121a', '#1a1a5a', '#111', '#b3121a'][i % 4]; g.save(); g.translate(x + 64, y + 64); g.rotate((i % 3 - 1) * 0.08); g.fillText(w, 0, 0); g.restore();
    });
  });
  const signMat = cmpMat(0xffffff, atlas);
  const BX = 22, BZ = 17.5;
  const spots = [[-12, -BZ, 0], [10, -BZ, 0], [-15, BZ, Math.PI], [12, BZ, Math.PI], [-BX, -10, Math.PI / 2], [-BX, 10, Math.PI / 2], [BX, 9, -Math.PI / 2], [BX, -12, -Math.PI / 2]];
  spots.forEach(([x, z, ry], i) => {
    const g = new THREE.PlaneGeometry(1, 0.7), uv = g.attributes.uv, u0 = (i % 4) / 4, v0 = 1 - (Math.floor(i / 4) + 1) / 2;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + 0.008 + uv.getX(k) * 0.234, v0 + 0.08 + uv.getY(k) * 0.34);
    const m = det(g, signMat, x + S(ry) * 0.06, 0.75, z + C(ry) * 0.06, ry + (rnd() - 0.5) * 0.15); m.rotation.z = (rnd() - 0.5) * 0.15;
  });

  // junk everywhere: boxes, cans, bottles, tyres, busted TVs, shopping carts, traffic drums
  const can = (x, z) => { const m = det(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 6), [red, metal, yellow, green][Math.floor(rnd() * 4)], x, 0.04, z); m.rotation.z = Math.PI / 2; m.rotation.y = rnd() * 3; };
  const bottle = (x, z) => { const m = det(new THREE.CylinderGeometry(0.03, 0.045, 0.28, 6), rnd() < 0.5 ? glass : amber, x, 0.05, z); m.rotation.z = rnd() < 0.6 ? Math.PI / 2 : 0; if (m.rotation.z === 0) m.position.y = 0.14; m.rotation.y = rnd() * 3; };
  const box = (x, z) => { const s = 0.3 + rnd() * 0.4; dblk(s, s * 0.8, s * 0.9, cardboard, x, 0, z, rnd() * 3); };
  const tyre = (x, z) => det(new THREE.TorusGeometry(0.38, 0.15, 5, 10).rotateX(Math.PI / 2 - (rnd() < 0.3 ? 0.9 : 0)), tyreM, x, 0.15, z);
  const tv = (x, z) => { const ry = rnd() * TAU; dblk(0.7, 0.55, 0.55, cmpMat(0x3a3430), x, 0, z, ry); dblk(0.55, 0.4, 0.02, screenOff, x + S(ry) * 0.28, 0.08, z + C(ry) * 0.28, ry); det(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 3), metal, x, 0.75, z).rotation.z = 0.5; };
  const cart = (x, z) => { const ry = rnd() * TAU, g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.name = 'Detail'; H.root.add(g);
    for (const [w, h, d, px, py, pz] of [[0.6, 0.02, 0.9, 0, 0.45, 0], [0.02, 0.4, 0.9, -0.3, 0.65, 0], [0.02, 0.4, 0.9, 0.3, 0.65, 0], [0.6, 0.4, 0.02, 0, 0.65, 0.45], [0.6, 0.4, 0.02, 0, 0.65, -0.45], [0.6, 0.03, 0.03, 0, 0.95, -0.6]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), metal); m.position.set(px, py, pz); g.add(m); }
    for (const [a, b] of [[-0.25, -0.35], [0.25, -0.35], [-0.25, 0.35], [0.25, 0.35]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 6).rotateZ(Math.PI / 2), dark); m.position.set(a, 0.06, b); g.add(m); }
    if (rnd() < 0.4) g.rotation.z = Math.PI / 2 - 0.1, g.position.y = 0.3;
    g.traverse((o) => { o.name = 'Detail'; }); };
  const drumT = (x, z) => { det(new THREE.CylinderGeometry(0.28, 0.32, 0.9, 10), orange, x, 0.45, z); for (const y of [0.3, 0.6]) det(new THREE.CylinderGeometry(0.305, 0.31, 0.1, 10), white, x, y, z); col(x, z, 0.6, 0.6, 0.9); };
  // along the fence, round the shacks, the booths, under the bleachers and in the open
  const scatterNear = (x, z, rad, n) => { for (let i = 0; i < n; i++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * rad, px = x + C(a) * d, pz = z + S(a) * d; const k = rnd(); (k < 0.35 ? can : k < 0.6 ? bottle : k < 0.85 ? box : tyre)(px, pz); } };
  for (let i = 0; i < 44; i++) { const side = i % 4, t = (rnd() - 0.5) * 1.8; const [x, z] = side === 0 ? [t * FX, -FZ + 0.9] : side === 1 ? [t * FX, FZ - 0.9] : side === 2 ? [-FX + 0.9, t * FZ] : [FX - 0.9, t * FZ]; if (Math.abs(x) < 7 && z > 0) continue; scatterNear(x, z, 1.2, 3); }
  for (const [x, z] of [[-34, 31.5], [36, 31.5], [-24, -28.5], [22, -28.5], [-15, 31], [13, 29.5], [-14, -24], [14, -24], [-31, 9.5], [28, -6], [-41, -1], [-41, -15], [38, -21], [44, 10], [-44, 21], [46, -4], [-30, -2], [27.5, 9.5]]) scatterNear(x, z, 2.2, 6);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) scatterNear(sx * 15.5, sz * 5.5, 3.5, 8);
  for (let i = 0; i < 60; i++) { const x = (rnd() - 0.5) * 2 * (FX - 3), z = (rnd() - 0.5) * 2 * (FZ - 3); if (Math.abs(x) < R.half + 1 && Math.abs(z) < R.half + 1) continue; (rnd() < 0.5 ? can : bottle)(x, z); }
  for (const [x, z] of [[-45.5, -28], [44.5, 28.5], [-30, 34], [27, -34.5], [-46, 26]]) tv(x, z);
  for (const [x, z] of [[-11, 30.5], [18, 33.5], [-36, 18.5], [42.5, -14.5], [-44, -12]]) cart(x, z);
  for (const [x, z] of [[-3.6, 18.6], [3.6, 18.6], [-3.6, -18.6], [3.6, -18.6], [-23.2, -4.8], [-23.2, 4.8], [23.2, -4.8], [23.2, 4.8]]) drumT(x, z);
}

// A second pass: string lights crossing over the ring, the entrance tent dressed up, and the streets outside.
function cmpExtra2(H, T, det, dblk) {
  const { D, FX, FZ, R, bark, steel } = H, rnd = cmpRng;
  const metal = cmpMat(0x6a6a72);
  // (no mannequins: 2026-11-10 "remove any blocky NPCs"; the bleachers hold the game's own clowns, cmpCrowd)

  // string lights in an X over the ring, tower to tower
  const BULB = [0xff4a5a, 0xffd23a, 0x4fc6ff, 0x9fff6a, 0xff8a2a, 0xd07aff];
  for (const [a, b] of [[[-11.5, 7.6, -12.5], [11.5, 7.6, 12.5]], [[11.5, 7.6, -12.5], [-11.5, 7.6, 12.5]], [[-11.5, 7.4, -12.5], [11.5, 7.4, -12.5]], [[-11.5, 7.4, 12.5], [11.5, 7.4, 12.5]]]) {
    const n = 22, pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n, sag = Math.sin(t * Math.PI) * 1.6; pts.push([a[0] + (b[0] - a[0]) * t, a[1] - sag, a[2] + (b[2] - a[2]) * t]); }
    CMP.wires.push(pts);
    pts.forEach((p, i) => { if (i && i < n) CMP.fx.push({ kind: 'bulb', x: p[0], y: p[1] - 0.1, z: p[2], color: BULB[i % BULB.length], s: 0.6 }); });
  }

  // the entrance tent: a scalloped valance, corner poles with flags, guy ropes
  const tz = -FZ + 3, front = tz + 2.55;
  for (let i = 0; i < 14; i++) { const m = det(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 10, 1, false, Math.PI / 2, Math.PI), cmpMat(i % 2 ? 0xe8e0d0 : 0xd8b23a), -6.5 + i, 5.75, front + 0.04); m.rotation.x = -Math.PI / 2; }
  for (const sx of [-1, 1]) {
    det(new THREE.CylinderGeometry(0.08, 0.1, 4, 6), bark, sx * 7.1, 8, front - 0.2);
    const fl = new THREE.BufferGeometry(); fl.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1.1, -0.3, 0, 0, -0.6, 0], 3)); fl.computeVertexNormals();
    const f = det(fl, cmpMat(sx < 0 ? 0xb3121a : 0xd8b23a), sx * 7.1, 9.9, front - 0.2); f.material.side = THREE.DoubleSide;
    for (const oz of [-1, 1]) CMP.wires.push([[sx * 7, 6, tz + oz * 2], [sx * 9.5, 0.05, tz + oz * 3.5]]);
  }

  // the streets: stop signs, boarded windows, graffiti on the houses, trash bins, a burnt-out car
  for (const [x, z] of [[-56, -45], [56, -45], [-56, 45], [56, 45]]) {
    det(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), metal, x, 1.2, z);
    const o = det(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 8), cmpMat(0xc0141a), x, 2.4, z + 0.05); o.rotation.x = Math.PI / 2; o.rotation.y = Math.PI / 8;
  }
  const houses = [[-62, -66, 0], [-22, -66, 0], [18, -66, 0], [58, -66, 0], [-62, 66, Math.PI], [-22, 66, Math.PI], [18, 66, Math.PI], [58, 66, Math.PI]];
  houses.forEach(([x, z, ry], i) => {
    const P = (lx, lz) => [x + lx * Math.cos(ry) + lz * Math.sin(ry), z - lx * Math.sin(ry) + lz * Math.cos(ry)];
    if (i % 2 === 0) for (let k = 0; k < 3; k++) { const [px, pz] = P(-1.4, 4.1); dblk(1.5, 0.18, 0.04, cmpMat(0x8a6a44), px, 1.6 + k * 0.32, pz, ry + (k - 1) * 0.08); }
    const [gx, gz] = P(-4.6, 4.07); const m = H.sign(2.4, 1.1, T.graffiti[i % T.graffiti.length], gx, 0.9, gz, ry); m.name = 'Detail'; m.material.alphaTest = 0.4;
    const [bx, bz] = P(-5, 8.6); for (let k = 0; k < 2; k++) dblk(0.6, 1, 0.6, cmpMat(k ? 0x2a4a2a : 0x1a1a2a), bx + k * 0.7 * Math.cos(ry), 0, bz, ry);
  });
  H.solid(1.9, 0.9, 4.2, cmpMat(0x2a2220, TEX.rust, 0, [2, 1]), -30, 0.25, -49, Math.PI / 2 + 0.2);
  dblk(1.6, 0.6, 2, cmpMat(0x1a1616), -30, 1.15, -49, Math.PI / 2 + 0.2);
  CMP.smoke.push([-30, 1.6, -49, 0.3]);
}

// --- animated extras: propaganda screens, ash, moths ----------------------------------------------
function cmpExtraFx(group, D) {
  // TV screens on poles: one canvas redrawn a few times a second, shared by every screen
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 96;
  const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  CMP.screen = { cv, g: cv.getContext('2d'), tex, t: 0, frame: 0 };
  const smat = new THREE.MeshBasicMaterial({ map: tex });
  const frameM = new THREE.MeshLambertMaterial({ color: 0x1a1a1e });
  const geo = new THREE.PlaneGeometry(2.4, 1.8), box = new THREE.BoxGeometry(2.6, 2, 0.3), pole = new THREE.CylinderGeometry(0.1, 0.12, 4.4, 6);
  for (const [x, z, ry] of [[-19.5, 17.4, 0.35], [19.5, -17.4, -0.35], [-24, 36.2, 0], [19.5, 17.4, -0.35], [-19.5, -17.4, 0.35]]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
    const p = new THREE.Mesh(pole, frameM); p.position.y = 2.2; g.add(p);
    const b = new THREE.Mesh(box, frameM); b.position.y = 5.2; g.add(b);
    const s = new THREE.Mesh(geo, smat); s.position.set(0, 5.2, 0.16); g.add(s);
    addCutaway(frameM); group.add(g);
    CMP.fx.push({ kind: 'pool', x: x + Math.sin(ry) * 2, y: 0.05, z: z + Math.cos(ry) * 2, r: 3, color: 0x6aa0ff });
    D.boxes.push([x - 0.2, z - 0.2, x + 0.2, z + 0.2, -0.3, 4.2]);
  }
  addCutaway(smat);
  drawScreen(0);
  // ash drifting across the yard, moths round the floodlights: points moved in the shader
  const mk = (n, gen, size, color, additive, speed) => {
    const P = [], O = [];
    for (let i = 0; i < n; i++) { const [x, y, z] = gen(i); P.push(x, y, z); O.push(Math.random() * 100); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aOff', new THREE.Float32BufferAttribute(O, 1));
    g.computeBoundingSphere(); g.boundingSphere.radius += 10;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uScale: { value: 300 }, uColor: { value: new THREE.Color(color) } },
      vertexShader: `attribute float aOff; uniform float uT, uScale; varying float vA;
        void main() { vec3 p = position; float t = uT * ${speed.toFixed(2)} + aOff;
          ${additive ? 'p += vec3(sin(t * 3.1) * 0.9, sin(t * 2.3) * 0.5 + 0.4, cos(t * 2.7) * 0.9); vA = 0.6 + 0.4 * sin(t * 9.0);'
                     : 'p.x += mod(t * 1.3 + aOff * 7.0, 60.0) - 30.0; p.y += sin(t + aOff) * 0.6; p.z += sin(t * 0.7 + aOff) * 2.0; vA = 0.55;'}
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = ${size.toFixed(3)} * uScale / max(0.5, -mv.z); }`,
      fragmentShader: `uniform vec3 uColor; varying float vA; void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(uColor, vA * smoothstep(0.5, 0.15, d)); }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const o = new THREE.Points(g, mat); o.frustumCulled = false; o.renderOrder = 3; group.add(o); return mat;
  };
  const FX = CMP_FENCE.x, FZ = CMP_FENCE.z;
  CMP.extraPts = [
    mk(IS_TOUCH ? 140 : 260, () => [(Math.random() - 0.5) * 2 * FX, 1 + Math.random() * 6, (Math.random() - 0.5) * 2 * FZ], 0.06, 0x9a8a90, false, 0.25),
    mk(IS_TOUCH ? 48 : 80, (i) => { const [sx, sz] = [[-1, -1], [1, -1], [1, 1], [-1, 1]][i % 4]; return [sx * 11.5 + (Math.random() - 0.5), 7 + Math.random() * 0.6, sz * 12.5 + (Math.random() - 0.5)]; }, 0.07, 0xfff0c0, true, 0.6),
  ];
}
// One frame of the propaganda feed: colour bars, a grinning clown silhouette with TONIGHT, static,
// STAY TUNED (generic placeholder broadcast; no names).
function drawScreen(f) {
  const { g, tex } = CMP.screen, W = 128, H = 96;
  const k = f % 24;
  if (k < 5) { const cols = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0']; cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * W / 7, 0, W / 7 + 1, H * 0.7); }); g.fillStyle = '#111'; g.fillRect(0, H * 0.7, W, H * 0.3); g.fillStyle = '#fff'; g.font = 'bold 14px sans-serif'; g.textAlign = 'center'; g.fillText('STAY TUNED', W / 2, H * 0.9); }
  else if (k < 16) {
    g.fillStyle = k % 2 ? '#2a0a20' : '#300a24'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ff3bd0'; g.beginPath(); g.arc(W / 2, 40, 22, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(W / 2 - 8, 35, 5, 0, TAU); g.arc(W / 2 + 8, 35, 5, 0, TAU); g.fill();
    g.fillStyle = '#c00'; g.beginPath(); g.arc(W / 2, 43, 5, 0, TAU); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(W / 2, 46, 11, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    g.fillStyle = '#ffd23a'; g.font = 'bold 18px Impact, sans-serif'; g.textAlign = 'center'; g.fillText(k < 11 ? 'TONIGHT' : 'LIVE!', W / 2, 86);
  } else { const im = g.createImageData(W, H); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); }
  for (let y = 0; y < H; y += 3) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, y, W, 1); } // scanlines
  tex.needsUpdate = true;
}
// The crowd on the bleachers (2026-11-10): the game's own clown characters (the colourful ones: the strung-out
// clown, the showgirl and the gangster clown), unarmed, standing on the tiers and playing the
// uploaded Cheering clip, each at its own speed and point in the loop. They use low-detail copies of those bodies (models/*-crowd), and rigged bodies still cost far more
// than simple props, so there are fewer of them (20 on phones, 28 on desktop), and on phones
// their animation steps every other frame.
function cmpCrowd() {
  if (CMP.crowd || !RIG.ready || !MAP.ready) return;
  const group = new THREE.Group(); group.name = 'crowd';
  const per = IS_TOUCH ? 5 : 7, list = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const slots = [];
    for (let t = 0; t < 3; t++) for (let i = 0; i < 6; i++) slots.push([t, i]);
    for (let k = 0; k < per; k++) {
      const [t, i] = slots.splice(Math.floor(Math.random() * slots.length), 1)[0];
      const x = sx * 15.5 + sx * (t * 1.3 - 1.3) + (Math.random() - 0.5) * 0.3, z = sz * 5.5 - 3.2 + i * 1.28 + (Math.random() - 0.5) * 0.3, h = 0.45 + t * 0.45;
      const { root, rig } = makeRigEnemy('crowd', {});
      root.position.set(x, h, z);
      root.rotation.y = (sx < 0 ? Math.PI / 2 : -Math.PI / 2) + (Math.random() - 0.5) * 0.5; // facing the ring
      root.scale.setScalar(0.92 + Math.random() * 0.12);
      root.traverse((o) => { if (o.isMesh && o.material && !o.material.userData.crowdLift) { const m = o.material; m.userData.crowdLift = true; if (m.map) { m.emissiveMap = m.map; m.emissive = new THREE.Color(0x5a5a5a); m.needsUpdate = true; } } }); // a colour lift so they read in the dim stands
      root.traverse((o) => { if (o.isMesh) { o.castShadow = !IS_TOUCH; o.frustumCulled = true; if (/lash|brow|eye/i.test(o.name + (o.material && o.material.name))) o.visible = false; } }); // (lashes: too small to see from up here)
      rigLoop(rig, 'Cheering', 0.85 + Math.random() * 0.3);
      rig.loop.time = Math.random() * rig.loop.getClip().duration;
      group.add(root); list.push(rig);
    }
  }
  scene.add(group);
  worlds.arena.objects.push(group);
  group.visible = WORLD.id === 'arena';
  CMP.crowd = { group, list, f: 0, acc: 0 };
}
function updateCrowd(dt) {
  if (!CMP.crowd) { cmpCrowd(); return; }
  const C = CMP.crowd;
  if (!C.group.visible) return;
  C.acc += dt;
  if (IS_TOUCH && (C.f++ & 1)) return; // phones: every other frame
  for (const R of C.list) R.mixer.update(C.acc);
  C.acc = 0;
}
function updateCompoundExtra(dt) {
  updateCrowd(dt);
  const S = CMP.screen;
  if (S) { S.t += dt; if (S.t > 0.18) { S.t = 0; drawScreen(++S.frame); } }
  if (CMP.extraPts) { const sc = renderer.domElement.height * 0.5 * camera.projectionMatrix.elements[5]; for (const m of CMP.extraPts) { m.uniforms.uT.value += dt; m.uniforms.uScale.value = sc; } }
}
