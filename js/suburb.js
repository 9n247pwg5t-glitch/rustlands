'use strict';
// Stage 1's second area (decisions.md 2026-11-16, after the creator's sketch): once the yard's 20
// enemies are dead, the entrance stage's curtain opens onto a run-down suburban cul-de-sac at night,
// where the boss fight happens and nothing else. A cracked, potholed asphalt square inside a curb, a giant
// clown face painted on it, a rickety outdoor stage at the north end (truss, lamp banks, speakers,
// a torn clown banner, steps), four street lamps, red-and-white barricades with oil drums (some
// burning), a ring of run-down houses with dead front yards (tarps, boarded windows, sagging porches,
// foreclosure signs, couches and bins on the lawns), vacant lots with cars on blocks, power poles
// with sagging wires, weeds everywhere, trash on the curbs, a van, a wrecked car, and the road out
// to the south blocked off.
// It is its own world (defineWorld 'suburb'), built the first time it's entered, so only one area
// of the stage is ever in the scene. Names and words on it are placeholders.

const SUB = { built: false, spawn: new THREE.Vector3(0, 0, 15.5), bossAt: new THREE.Vector3(0, 0, -7), flames: [], t: 0 };
const SUB_B = { minX: -31, maxX: 31, minZ: -25.2, maxZ: 25.2 }; // the square, the sidewalks and the front yards

function buildSuburb() {
  if (SUB.built) return;
  cmpTextures();
  const A = worlds.arena;
  defineWorld('suburb', { flat: 0, bounds: Object.assign({}, SUB_B), fog: A.fog, background: A.background, light: A.light }, (group) => {
    const root = new THREE.Group(), fx = new THREE.Group();
    const boxes = [];
    const add = (geo, mat, x, y, z, ry = 0, name = 'prop') => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.name = name; root.add(m); return m; };
    const blk = (w, h, d, mat, x, y, z, ry = 0, name) => add(cmpBox(w, h, d), mat, x, y + h / 2, z, ry, name);
    const col = (x, z, w, d, h) => { boxes.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2, -0.3, h]); addBoxCol(x, z, w, d, -0.3, h); };
    const pools = [], bulbs = [];
    const glow = (x, z, r, c) => pools.push([x, z, r, c]);

    // --- the ground: grass all round; the cul-de-sac itself is painted (suburbGround)
    add(new THREE.PlaneGeometry(140, 120).rotateX(-Math.PI / 2), cmpMat(0x8a8a6a, TEX.grass, 0, [14, 12]), 0, 0, 0, 0, 'Terrain');
    const W = 63, Dd = 51.4; // the painted ground: everything inside the fences
    const subT = subTextures(), sr0 = makeRng(4711); // (the painted road itself is made at the end: it bakes in contact shadows)
    glow(0, 3, 9, 0x9a7060); glow(0, -9, 7, 0xffc080); // light over the painted face and in front of the stage
    // (2026-11-17: "looks more like a parking lot") a real cul-de-sac: a round asphalt turnaround
    // (CUL.R) with the road leading out south (CUL.road wide), a curb and a sidewalk ring round it,
    // dead lawns everywhere else with a driveway and a front walk from every house (painted at the
    // end by suburbGround, which bakes in contact shadows)
    const CUL = { R: 17, road: 4.5, walkW: 1.6, drives: [], walks: [] };
    const curbM = cmpMat(0x9a948a, TEX.concrete, 0, [1, 1]);
    // the road out to the south, with yellow lines, blocked by sawhorses and a barrier
    add(new THREE.PlaneGeometry(9, 20).rotateX(-Math.PI / 2), cmpMat(0xffffff, TEX.asphalt, 0, [1, 2]), 0, 0.035, 30, 0, 'Road');
    for (let z = 22; z < 40; z += 3) for (const s of [-0.15, 0.15]) add(new THREE.PlaneGeometry(0.14, 1.8).rotateX(-Math.PI / 2), cmpMat(0xd8b23a), s, 0.05, z, 0, 'Road');

    // --- the stage at the north end
    const SZ = -15.5, wood = cmpMat(0x6b5038, TEX.fence, 0, [3, 1]), dark = cmpMat(0x1c1a1e), steel = cmpMat(0x4a4a52), red = cmpMat(0xb3121a), white = cmpMat(0xe8e0d0);
    blk(17, 1.25, 6.5, wood, 0, 0, SZ); col(0, SZ, 17, 6.5, 1.25);
    // its skirt: red and white panels round the front
    const skirt = cmpCanvas(256, 64, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#e8e0d0' : '#b3121a'; g.fillRect(i * w / 8, 0, w / 8, h); } grime(g, w, h, 30, 0.45); for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(110,4,8,0.7)'; g.fillRect(Math.random() * w, 0, 3, 10 + Math.random() * 40); } });
    add(new THREE.PlaneGeometry(17, 1.2), cmpMat(0xffffff, skirt, 0, [3, 1]), 0, 0.62, SZ + 3.27, 0, 'Detail');
    // planks across the top, blood on them
    const deck = cmpCanvas(256, 128, (g, w, h) => { g.fillStyle = '#6a5038'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { g.fillStyle = 'rgba(20,10,4,0.6)'; g.fillRect(x, 0, 2, h); } grime(g, w, h, 40, 0.4); for (let i = 0; i < 10; i++) { g.fillStyle = 'rgba(110,4,8,0.75)'; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * 16, 4 + Math.random() * 10, Math.random() * 3, 0, TAU); g.fill(); } });
    add(new THREE.PlaneGeometry(16.8, 6.3).rotateX(-Math.PI / 2), cmpMat(0xffffff, deck, 0, [2, 1]), 0, 1.26, SZ, 0, 'Detail');
    // steps down the front, the middle
    for (let k = 0; k < 4; k++) { blk(3.4, 0.31 * (k + 1), 0.45, wood, 0, 0, SZ + 3.25 + (3 - k) * 0.45, 0, 'Detail'); }
    // the truss: two towers and a span, lamp banks hanging from it, a torn clown banner between
    const trussM = cmpMat(0x9a9aa4);
    for (const s of [-1, 1]) {
      subTruss(root, trussM, 7.4, s * 8, 1.25, SZ - 2.6); col(s * 8, SZ - 2.6, 0.6, 0.6, 9);
      blk(0.7, 0.05, 0.7, steel, s * 8, 1.25, SZ - 2.6, 0, 'Detail'); // base plate
      for (let k = 0; k < 5; k++) { const a = k * 1.3; add(new THREE.SphereGeometry(0.22, 8, 5), cmpMat(0x6a5a3a, TEX.fence, 0, [1, 1]), s * 8 + Math.cos(a) * 0.55, 1.36 + (k > 3 ? 0.14 : 0), SZ - 2.6 + Math.sin(a) * 0.55, a, 'Detail').scale.set(1.4, 0.55, 0.8); } // sandbags
      blk(0.8, 0.05, 0.8, steel, s * 8, 8.85, SZ - 2.6, 0, 'Detail'); // corner block
    }
    subTruss(root, trussM, 16.0, -8, 8.45, SZ - 2.6, 0, 0, -Math.PI / 2);
    // the deck's edge trim, monitor wedges and a mic stand at the front, cables snaking off the side,
    // a ladder against a tower
    for (const [x, z, w, d] of [[0, SZ + 3.28, 17.1, 0.1], [0, SZ - 3.28, 17.1, 0.1], [-8.53, SZ, 0.1, 6.6], [8.53, SZ, 0.1, 6.6]]) blk(w, 0.1, d, cmpMat(0x3a2a1e), x, 1.2, z, 0, 'Detail');
    { const ws = new THREE.Shape(); ws.moveTo(-0.3, 0); ws.lineTo(0.3, 0); ws.lineTo(-0.15, 0.42); ws.lineTo(-0.3, 0.42); ws.lineTo(-0.3, 0);
      const wg = new THREE.ExtrudeGeometry(ws, { depth: 0.8, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 }); wg.translate(0, 0, -0.4); wg.rotateY(-Math.PI / 2);
      for (const x of [-2.4, 2.4]) { add(wg, dark, x, 1.26, SZ + 2.4, 0, 'Detail'); add(new THREE.PlaneGeometry(0.55, 0.28), cmpMat(0x3a3a40), x, 1.5, SZ + 2.52, 0, 'Detail').rotation.x = -0.9; } }
    add(new THREE.CylinderGeometry(0.015, 0.015, 1.5, 5), steel, 0, 2.0, SZ + 2.2, 0, 'Detail');
    for (let k = 0; k < 3; k++) { const l = add(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 4), steel, Math.cos(k * 2.1) * 0.13, 1.4, SZ + 2.2 + Math.sin(k * 2.1) * 0.13, 0, 'Detail'); l.rotation.set(Math.sin(k * 2.1) * 0.6, 0, -Math.cos(k * 2.1) * 0.6); }
    add(new THREE.CylinderGeometry(0.035, 0.025, 0.18, 8), dark, 0, 2.8, SZ + 2.3, 0, 'Detail').rotation.x = 0.5;
    for (const [pts, r] of [[[[-6.6, 1.3, SZ + 1.3], [-4, 1.28, SZ + 2.6], [-1, 1.28, SZ + 2.3], [0, 1.28, SZ + 2.2]], 0.03], [[[6.6, 1.3, SZ + 1.3], [8.2, 1.28, SZ + 1.8], [8.7, 0.7, SZ + 2.2], [9.6, 0.05, SZ + 2.9], [11, 0.05, SZ + 2.4]], 0.035], [[[-6.6, 1.3, SZ + 1.1], [-8.4, 1.28, SZ + 0.3], [-8.8, 0.6, SZ - 0.5], [-10.5, 0.05, SZ - 1.0]], 0.035]]) {
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q))), 24, r, 5), dark, 0, 0, 0, 0, 'Detail');
    }
    { const lg = new THREE.Group(); lg.position.set(-7.4, 1.25, SZ - 2.2); lg.rotation.set(0.0, 0, -0.22); lg.name = 'Detail'; root.add(lg);
      for (const sx of [-0.22, 0.22]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.05, 4.2, 0.05), steel); r.position.set(sx, 2.1, 0); lg.add(r); }
      for (let k = 0; k < 13; k++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.44, 4).rotateZ(Math.PI / 2), steel); r.position.set(0, 0.25 + k * 0.3, 0); lg.add(r); }
      lg.traverse((o) => { o.name = 'Detail'; }); }
    const lens = cmpMat(0xffffff, cmpStageTex().lens, 0xffffff);
    for (const s of [-1, 1]) {
      const g = new THREE.Group(); g.position.set(s * 6.2, 7.1, SZ - 2.2); g.rotation.set(0.5, 0, 0); g.name = 'prop'; root.add(g);
      for (let i = 0; i < 4; i++) { const lx = (i % 2 - 0.5) * 0.85, ly = (Math.floor(i / 2) - 0.5) * 0.7; const c = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.4, 14).rotateX(Math.PI / 2), dark); c.position.set(lx, ly, 0); g.add(c); const l = new THREE.Mesh(new THREE.CircleGeometry(0.25, 16), lens); l.position.set(lx, ly, 0.21); g.add(l); }
      g.traverse((o) => { o.name = 'prop'; });
      glow(s * 4.5, SZ + 6, 6, 0xffd090);
    }
    const banner = cmpCanvas(512, 256, (g, w, h) => {
      g.fillStyle = '#e8e0d0'; g.fillRect(0, 0, w, h);
      grime(g, w, h, 60, 0.4);
      g.lineCap = 'round'; g.strokeStyle = '#8a0a10'; g.lineWidth = 14;
      for (const ex of [-90, 90]) { g.beginPath(); g.moveTo(w / 2 + ex - 30, 50); g.lineTo(w / 2 + ex + 30, 110); g.moveTo(w / 2 + ex + 30, 50); g.lineTo(w / 2 + ex - 30, 110); g.stroke(); }
      g.fillStyle = '#b3121a'; g.beginPath(); g.arc(w / 2, 130, 20, 0, TAU); g.fill();
      g.strokeStyle = '#8a0a10'; g.lineWidth = 10; g.beginPath(); g.moveTo(w / 2 - 150, 160); g.quadraticCurveTo(w / 2, 260, w / 2 + 150, 160); g.stroke();
      for (let i = 0; i < 10; i++) { const x = w / 2 - 130 + i * 29; g.beginPath(); g.moveTo(x, 175 + Math.sin(i / 9 * Math.PI) * 40); g.lineTo(x + 6, 200 + Math.sin(i / 9 * Math.PI) * 40); g.stroke(); }
      for (let i = 0; i < 16; i++) { g.fillStyle = 'rgba(120,6,10,0.75)'; g.fillRect(Math.random() * w, Math.random() * h * 0.6, 4, 20 + Math.random() * 70); }
      // a torn bottom edge
      g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 32) g.lineTo(x, h - 10 - Math.random() * 40); g.lineTo(w, h); g.fill();
    });
    const bn = add(new THREE.PlaneGeometry(9, 4.5, 8, 1), cmpMat(0xffffff, banner), 0, 6.0, SZ - 2.3, 0, 'Detail'); bn.material.side = THREE.DoubleSide; bn.material.alphaTest = 0.4;
    // side drapes: striped, slanting out from the truss top
    for (const s of [-1, 1]) { const d = add(new THREE.PlaneGeometry(4, 6), cmpMat(0xffffff, TEX.stripes, 0, [2, 1]), s * 10, 4.8, SZ - 2.0, -s * 0.5, 'Detail'); d.material.side = THREE.DoubleSide; d.rotation.z = s * 0.12; }
    // speakers on the stage
    for (const s of [-1, 1]) { blk(1.3, 2.1, 1.0, dark, s * 6.6, 1.25, SZ + 1.6, -s * 0.25); for (const yy of [1.85, 2.75]) add(new THREE.CircleGeometry(0.42, 16), cmpMat(0x3a3a40), s * 6.6 + Math.sin(-s * 0.25) * 0.51, yy, SZ + 1.6 + Math.cos(-s * 0.25) * 0.51, -s * 0.25, 'Detail'); }
    // a string of bulbs along the front of the truss
    for (let i = 0; i <= 16; i++) { const t = i / 16, x = -8 + t * 16, y = 7.8 - Math.sin(t * Math.PI) * 1.2; bulbs.push([x, y, SZ - 2.2, [0xffd27a, 0xffffff, 0xff8a5a][i % 3]]); }

    // --- street lamps at the corners of the square
    const pole = cmpMat(0x2a2a30), lampHead = cmpMat(0xffe0a0, null, 0xffc070);
    for (const [x, z, sx, sz] of [[-0.9, 2.25], [0.9, 2.25], [-0.9, 0.85], [0.9, 0.85]].map(([s2, a]) => { const r = CUL.R + 1.9, th = s2 > 0 ? a : -a; return [Math.sin(th) * r, Math.cos(th) * r, -Math.sin(th), -Math.cos(th)]; })) {
      subLamp(root, x, z, sx, sz, pole, cmpMat(0x5a5a62), lampHead); col(x, z, 0.4, 0.4, 6);
      glow(x + sx * 2.2, z + sz * 2.2, 7, 0xffb060);
    }

    // --- barricade clusters: jersey barriers in red and white, oil drums, some burning, a crate
    const stripes = cmpCanvas(128, 48, (g, w, h) => { g.fillStyle = '#e8e0d4'; g.fillRect(0, 0, w, h); g.fillStyle = '#b3121a'; for (let i = -2; i < 8; i++) { g.beginPath(); g.moveTo(i * 24, h); g.lineTo(i * 24 + 12, h); g.lineTo(i * 24 + 30, 0); g.lineTo(i * 24 + 18, 0); g.fill(); } grime(g, w, h, 20, 0.45); for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(110,4,8,0.7)'; g.fillRect(Math.random() * w, 0, 3, 10 + Math.random() * 30); } });
    const barM = cmpMat(0xffffff, stripes, 0, [1, 1]), drum = cmpMat(0x8a5030, TEX.rust, 0, [1, 1]), drum2 = cmpMat(0x3a4a3a, TEX.rust, 0, [1, 1]), crate = cmpMat(0x7a5a3a, TEX.fence, 0, [1, 1]);
    const barrier = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.name = 'prop'; root.add(g); g.add(new THREE.Mesh(subJerseyGeo(), barM)); for (const lx of [-0.7, 0.7]) { const lp = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 4, 8, Math.PI), drum); lp.position.set(lx, 0.84, 0); g.add(lp); } g.traverse((o) => { o.name = 'prop'; }); const q = Math.abs(Math.sin(ry)) > 0.5; col(x, z, q ? 0.8 : 2.5, q ? 2.5 : 0.8, 0.95); };
    const drums = (x, z, n, fire) => { for (let i = 0; i < n; i++) { const a = i * 2.3, dx = Math.cos(a) * 0.55 * (i > 0 ? 1 : 0), dz = Math.sin(a) * 0.55 * (i > 0 ? 1 : 0); const open = fire && i === 0; add(subDrumGeo(i % 3, open), i % 2 ? drum2 : drum, x + dx, 0, z + dz, sr0() * TAU); } col(x, z, 1.6, 1.6, 1); }; // (no flames in them, 2026-11-19: they looked out of place)
    for (const [x, z, ry, fire] of [[-12, -4, 0.1, true], [12, -4, -0.1, false], [-13, 8, -0.05, false], [13, 8, 0.08, true], [0, 13, 0, true]]) {
      barrier(x + 1.5, z + 0.6, ry); barrier(x - 0.4, z - 1.3, ry + 0.25);
      drums(x - 2.2, z + 0.4, 4, fire);
      blk(0.8, 0.8, 0.8, crate, x - 1.0, 0, z - 2.6, 0.3); col(x - 1.0, z - 2.6, 0.9, 0.9, 0.8);
    }
    // more barriers angled round the edges of the square (as in the sketch)
    for (const [x, z, ry] of [[-20, -11, 0.6], [-23, -4, 1.4], [-23, 6, 1.6], [-20, 13, 2.5], [20, -11, -0.6], [23, -4, -1.4], [23, 6, -1.6], [20, 13, -2.5]]) { const a = Math.atan2(x, z), r = CUL.R - 1.6; barrier(Math.sin(a) * r, Math.cos(a) * r, ry); }
    for (const [x, z, ry] of [[-6.2, 15.3, 0.25], [6.2, 15.3, -0.25]]) barrier(x, z, ry); // either side of the road out
    // the road out, blocked: sawhorses across the gap in the curb
    for (const x of [-3, 0, 3]) { blk(2.4, 0.14, 0.08, barM, x, 0.95, 21, 0, 'Detail'); blk(2.4, 0.14, 0.08, barM, x, 0.55, 21, 0, 'Detail'); for (const s of [-1, 1]) blk(0.08, 1.05, 0.5, cmpMat(0x5a4030), x + s * 1.05, 0, 21, 0, 'Detail'); }
    col(0, 21, 9, 0.6, 1.2);

    // --- shared house textures
    const roofM = cmpMat(0xffffff, subT.roof, 0, [4, 2]), winM = cmpMat(0xffd27a, null, 0xffa040);
    const face = cmpCanvas(128, 96, (g, w, h) => { g.lineCap = 'round'; g.strokeStyle = '#a8121a'; g.lineWidth = 7; for (const ex of [-26, 26]) { g.beginPath(); g.moveTo(w / 2 + ex - 10, 18); g.lineTo(w / 2 + ex + 10, 38); g.moveTo(w / 2 + ex + 10, 18); g.lineTo(w / 2 + ex - 10, 38); g.stroke(); } g.lineWidth = 6; g.beginPath(); g.moveTo(w / 2 - 44, 56); g.quadraticCurveTo(w / 2, 96, w / 2 + 44, 56); g.stroke(); for (let i = 0; i < 6; i++) { g.fillStyle = '#a8121a'; g.fillRect(w / 2 - 36 + i * 14, 62 + Math.sin(i / 5 * Math.PI) * 14, 3, 10 + Math.random() * 12); } });
    // --- the street: rows of run-down houses round the square, each with its own front yard
    // (2026-11-16: "more obvious this is a rundown suburb"). Every house is a variation: faded siding,
    // a porch (sagging, or gone), boarded or broken or lit windows, a blue tarp or a hole in the roof,
    // a hanging gutter, a garage door, a dish, a chimney, clown faces sprayed on some; in the yards
    // dead lawns, cracked walkways, leaning mailboxes, tipped bins, an old couch, a kiddie pool, a
    // foreclosure sign, weeds; vacant corner lots with a car on blocks and junk.
    const sr = makeRng(1979);
    const pickS = (a) => a[Math.floor(sr() * a.length)];
    const plyM = cmpMat(0x8a6a44, TEX.fence, 0, [1, 1]), tarpM = cmpMat(0x2a5aa8), holeM = cmpMat(0x0e0c0e), trimM = cmpMat(0xc8c0b0), concM = cmpMat(0x8a8478, TEX.concrete, 0, [1, 1]);
    const lawn = cmpCanvas(256, 256, (g, w, h) => {
      g.fillStyle = '#5a5a32'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { const x = sr() * w, y = sr() * h, r = 15 + sr() * 45, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, sr() < 0.5 ? 'rgba(120,100,50,0.6)' : 'rgba(60,44,30,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
      for (let i = 0; i < 2600; i++) { g.strokeStyle = `rgba(${90 + sr() * 70},${90 + sr() * 50},${40 + sr() * 30},0.7)`; g.lineWidth = 1; const x = sr() * w, y = sr() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (sr() - 0.5) * 4, y - 3 - sr() * 5); g.stroke(); }
    });
    const lawnM = cmpMat(0xffffff, lawn, 0, [2, 1]);
    const sign = cmpCanvas(128, 80, (g, w, h) => { g.fillStyle = '#e8e0d0'; g.fillRect(0, 0, w, h); g.fillStyle = '#a8121a'; g.fillRect(0, 0, w, 20); g.font = 'bold 15px sans-serif'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('FORECLOSED', w / 2, 15); g.fillStyle = '#222'; g.font = 'bold 13px sans-serif'; g.fillText('KEEP OUT', w / 2, 45); grime(g, w, h, 20, 0.5); });
    const signM = cmpMat(0xffffff, sign), tagM = cmpMat(0xffffff, subT.tags); tagM.alphaTest = 0.5;
    const vm = { paint: (c) => cmpMat(c, TEX.metal, 0, [1, 1]), burnt: cmpMat(0x6a5446, TEX.rust, 0, [2, 2]), glass: cmpMat(0x1e2c3a), hole: cmpMat(0x0a080a), dark: cmpMat(0x121014), tyre: cmpMat(0x1a1a1a), rim: cmpMat(0x9a9aa0), chrome: cmpMat(0xb8b8c0), head: cmpMat(0xe8e0c0), tail: cmpMat(0xa01010), plate: cmpMat(0xd8d0b0) };
    vm.glass.side = vm.hole.side = THREE.DoubleSide;
    const treeM = { bark: cmpMat(0x2e241e), leaf: [cmpMat(0x3a4a26), cmpMat(0x4a5228), cmpMat(0x2f3a22), cmpMat(0x5a5a2a)] };
    const house = (x, z, ry, color, v) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.name = 'prop'; root.add(g);
      const put = (geo, m, px, py, pz, rx = 0, ryy = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.rotation.set(rx, ryy, rz); g.add(o); return o; };
      const wall = cmpMat(color, subT.siding, 0, [4, 1]);
      const RM = { roof: roofM, trim: trimM, soffit: cmpMat(0x6a645a), ridge: cmpMat(0x2a2628, subT.roof, 0, [4, 2]), wall, vent: cmpMat(0x2a2a2a), wallHalf: 4 };
      put(cmpBox(11, 3.4, 8), wall, 0, 1.9, 0);
      put(cmpBox(11.1, 0.25, 8.1), concM, 0, 0.12, 0); // foundation
      // a gable roof (js/suburb-detail.js): shingled slopes, overhanging eaves with soffits, fascia and
      // rake boards, a ridge cap, sided gable ends with vents; corner boards on the walls
      const RISE = 2.3, RA = Math.atan2(RISE, 4.2), roofY = (lz) => 3.6 + RISE * (1 - Math.abs(lz) / 4.2) + 0.13; // the slope's top at local z
      subGable(g, 11, 8.4, RISE, 0, 3.6, 0, 0, RM);
      for (const [cx, cz] of [[-5.5, 4], [5.5, 4], [-5.5, -4], [5.5, -4]]) put(new THREE.BoxGeometry(0.24, 3.45, 0.24), trimM, cx, 1.92, cz);
      for (const sx of [-3, 3]) put(new THREE.PlaneGeometry(0.42, 0.16), cmpMat(0x2a2a2a, subT.grill), sx, 0.13, 4.07); // foundation vents
      // a back wing with its own roof on some (the roofline isn't one box from above)
      if (v.wing) { const wx = v.wing * 2.6; put(cmpBox(5, 3.0, 4.6), wall, wx, 1.7, -5.9); put(cmpBox(5.1, 0.25, 4.7), concM, wx, 0.12, -5.9); subGable(g, 4.8, 5, 1.5, wx, 3.2, -6.0, Math.PI / 2, Object.assign({}, RM, { wallHalf: 2.5 })); }
      // a dormer on the front slope on some
      if (v.dormer && !v.tarp) {
        put(cmpBox(1.7, 1.25, 1.9), wall, -2.4, 4.9, 1.85);
        subGable(g, 1.9, 1.7, 0.6, -2.4, 5.52, 1.85, Math.PI / 2, Object.assign({}, RM, { wallHalf: 0.85 }));
        put(new THREE.PlaneGeometry(0.8, 0.65), v.light ? winM : cmpMat(0x161420), -2.4, 4.95, 2.81);
        for (const dy of [-0.37, 0.37]) put(new THREE.BoxGeometry(0.95, 0.08, 0.06), trimM, -2.4, 4.95 + dy, 2.83);
        for (const dx of [-0.44, 0.44]) put(new THREE.BoxGeometry(0.08, 0.8, 0.06), trimM, -2.4 + dx, 4.95, 2.83);
      }
      // (no blue tarps on the roofs: from above they read as solar panels, 2026-11-17)
      if (v.hole) { put(new THREE.CircleGeometry(0.9, 8), holeM, 2.6, roofY(2.0) + 0.01, 2.0, RA - Math.PI / 2); for (let k = 0; k < 3; k++) put(new THREE.BoxGeometry(0.08, 0.06, 1.1), cmpMat(0x3a2a1e), 2.1 + k * 0.5, roofY(2.0) + 0.02, 2.0, RA); } // exposed rafters
      if (v.chimney) { put(cmpBox(0.9, 2.2, 0.9), cmpMat(0x6a3a2a), -3.4, 5.3, -1.5); put(cmpBox(1.05, 0.14, 1.05), concM, -3.4, 6.45, -1.5); }
      if (v.dish) { put(new THREE.SphereGeometry(0.4, 10, 6, 0, TAU, 0, Math.PI / 2), white, 3.8, roofY(3.0) + 0.3, 3.0, -1.1); put(new THREE.BoxGeometry(0.05, 0.5, 0.05), trimM, 3.8, roofY(3.0) + 0.1, 3.0); }
      // gutter along the front eave, one end hanging loose, a downspout at the corner
      put(new THREE.BoxGeometry(11.6, 0.12, 0.14), trimM, 0, 3.32, 4.62, 0, 0, v.gutter ? 0.1 : 0);
      put(new THREE.BoxGeometry(0.1, 3.2, 0.1), trimM, v.gutter ? -5.62 : 5.62, 1.7, 4.5, 0, 0, v.gutter ? 0.06 : 0);
      put(new THREE.BoxGeometry(0.3, 0.06, 0.4), concM, v.gutter ? -5.62 : 5.62, 0.03, 4.6); // splash block
      // an electric meter and its conduit, a hose bib, graffiti tags low on the wall on some
      put(new THREE.BoxGeometry(0.3, 0.42, 0.14), cmpMat(0x7a7a72), 5.0, 1.45, 4.08); put(new THREE.CircleGeometry(0.09, 10), cmpMat(0xc8d0c8), 5.0, 1.5, 4.16); put(new THREE.BoxGeometry(0.05, 2.0, 0.05), cmpMat(0x5a5a5a), 5.0, 2.65, 4.05);
      put(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 5).rotateX(Math.PI / 2), cmpMat(0xa08040), -5.0, 0.55, 4.1);
      if (v.tag) { const tg = put(new THREE.PlaneGeometry(1.7, 0.85), tagM, -1.65, 0.75, 4.03); tg.rotation.z = (sr() - 0.5) * 0.1; }
      if (v.tag2) put(new THREE.PlaneGeometry(3.2, 1.6), tagM, 5.53, 1.3, 1.2, 0, Math.PI / 2);
      // windows: lit, dark, boarded with plywood, or smashed; a garage door on some
      const wins = v.garage ? [-3.6] : [-3.6, 3.4];
      for (const wx of wins) {
        const kind = pickS(['lit', 'dark', 'board', 'board', 'broken']);
        put(new THREE.PlaneGeometry(1.3, 1.1), kind === 'lit' ? winM : cmpMat(0x161420), wx, 2.1, 4.02);
        if (kind === 'board') { put(new THREE.BoxGeometry(1.5, 1.25, 0.05), plyM, wx, 2.1, 4.07); for (const r of [0.7, -0.7]) put(new THREE.BoxGeometry(1.7, 0.12, 0.04), plyM, wx, 2.1, 4.11, 0, 0, r); }
        if (kind === 'broken') for (let k = 0; k < 3; k++) put(new THREE.PlaneGeometry(0.3 + sr() * 0.3, 0.2 + sr() * 0.3), cmpMat(0x5a7088), wx - 0.4 + sr() * 0.8, 1.8 + sr() * 0.5, 4.04, 0, 0, sr() * 3);
        // a frame, a sill, a cross of mullions in the unboarded ones
        for (const dy of [-0.6, 0.6]) put(new THREE.BoxGeometry(1.5, 0.1, 0.08), trimM, wx, 2.1 + dy, 4.05);
        for (const dx of [-0.7, 0.7]) put(new THREE.BoxGeometry(0.1, 1.3, 0.08), trimM, wx + dx, 2.1, 4.05);
        if (kind === 'lit' || kind === 'dark') { put(new THREE.BoxGeometry(0.05, 1.1, 0.04), trimM, wx, 2.1, 4.04); put(new THREE.BoxGeometry(1.3, 0.05, 0.04), trimM, wx, 2.1, 4.04); }
        put(cmpBox(1.75, 0.09, 0.24), trimM, wx, 1.45, 4.1);
        for (const s of [-1, 1]) put(new THREE.BoxGeometry(0.3, 1.2, 0.04), cmpMat(0x2a3a3a), wx + s * 0.93, 2.1, 4.05, 0, 0, v.shutter && s > 0 ? 0.35 : 0); // shutters (one hanging)
        // an air conditioner in the lower sash, or a flower box of dead plants
        const extra = sr();
        if ((kind === 'lit' || kind === 'dark') && extra < 0.45) { put(cmpBox(0.7, 0.44, 0.56), cmpMat(0xb8b4a8), wx, 1.82, 4.24); put(new THREE.PlaneGeometry(0.6, 0.34), cmpMat(0x8a8a86, subT.grill), wx, 1.82, 4.53); put(new THREE.BoxGeometry(0.04, 0.5, 0.04), cmpMat(0x5a5a5a), wx - 0.3, 1.36, 4.42, 0.5); }
        else if (extra > 0.6) { put(cmpBox(1.3, 0.22, 0.26), cmpMat(0x5a3a2a, TEX.fence, 0, [1, 1]), wx, 1.3, 4.22); for (let k = 0; k < 6; k++) put(new THREE.ConeGeometry(0.05, 0.3 + sr() * 0.2, 4), cmpMat(pickS([0x6a5a2a, 0x4a3a1a, 0x5a6a2a])), wx - 0.5 + k * 0.2, 1.55, 4.22, (sr() - 0.5) * 0.6, 0, (sr() - 0.5) * 0.8); }
      }
      if (v.garage) { put(new THREE.PlaneGeometry(3.2, 2.5), cmpMat(0x9a9488, TEX.metal, 0, [1, 1]), 3.4, 1.4, 4.03); if (v.face) put(new THREE.PlaneGeometry(2.6, 1.95), cmpMat(0xffffff, face), 3.4, 1.6, 4.05).material.transparent = true; }
      // the door and the porch: posts and a roof (sagging on some), steps; or just a stoop
      put(new THREE.PlaneGeometry(1.1, 2.1), cmpMat(pickS([0x5a2a2a, 0x2a3a4a, 0x3a3a2a])), 0, 1.3, 4.02);
      for (const dx of [-0.62, 0.62]) put(new THREE.BoxGeometry(0.12, 2.25, 0.08), trimM, dx, 1.37, 4.05);
      put(new THREE.BoxGeometry(1.36, 0.12, 0.08), trimM, 0, 2.48, 4.05); // the door frame
      put(new THREE.SphereGeometry(0.05, 6, 4), cmpMat(0xb8a060), 0.4, 1.3, 4.06); // knob
      put(new THREE.BoxGeometry(0.14, 0.24, 0.12), cmpMat(0x2a2a2a), 0.9, 2.15, 4.08); put(new THREE.SphereGeometry(0.06, 6, 4), v.light ? winM : cmpMat(0x6a6a5a), 0.9, 2.08, 4.15); // porch lamp
      put(new THREE.PlaneGeometry(0.5, 0.16), cmpMat(0xb8a060), -0.95, 2.3, 4.04); // house number plate
      if (v.porch) {
        put(cmpBox(3.6, 0.35, 1.8), cmpMat(0x6b5a4a, TEX.fence, 0, [1, 1]), 0, 0.18, 4.9);
        for (const s of [-1, 1]) put(new THREE.BoxGeometry(0.14, 2.4, 0.14), trimM, s * 1.65, 1.5, 5.65, 0, 0, s > 0 && v.sag ? 0.18 : 0);
        put(new THREE.BoxGeometry(3.9, 0.1, 2.0), cmpMat(0x4a4038), 0, 2.75, 4.95, v.sag ? -0.12 : 0.05, 0, v.sag ? 0.1 : 0);
        // railings either side of the steps, some balusters gone, a rail broken on the sagging ones
        for (const s of [-1, 1]) {
          put(new THREE.BoxGeometry(1.0, 0.07, 0.08), trimM, s * 1.25, 1.13, 5.72, 0, 0, v.sag && s < 0 ? 0.25 : 0);
          for (let k = 0; k < 5; k++) if (sr() > 0.2) put(new THREE.BoxGeometry(0.05, 0.75, 0.05), trimM, s * (0.8 + k * 0.22), 0.72, 5.72);
          for (const zz of [4.3, 5.0]) put(new THREE.BoxGeometry(0.07, 0.07, 0.7), trimM, s * 1.74, 1.13, zz);
        }
      } else put(cmpBox(1.6, 0.3, 0.9), concM, 0, 0.15, 4.45);
      // scraggly shrubs along the front wall
      for (const sx of v.garage ? [-2.3] : [-2.35, 2.35, 5.0]) for (let k = 0; k < 2; k++) { const b = put(new THREE.IcosahedronGeometry(0.42 + sr() * 0.25, 1), cmpMat(pickS([0x3a4a26, 0x4a4a2a, 0x2f3a22, 0x5a4a2a])), sx + (k - 0.5) * 0.55, 0.36, 4.45 + sr() * 0.15); b.scale.y = 0.8; }
      for (let k = 0; k < 2; k++) put(cmpBox(1.4, 0.15, 0.35), concM, 0, 0.07 + k * 0.15, 6.0 - k * 0.3);
      if (v.face && !v.garage) put(new THREE.PlaneGeometry(2.6, 1.95), cmpMat(0xffffff, face), -2, 2.4, 4.04).material.transparent = true;
      // the front yard: a dead lawn, a cracked walkway, a mailbox, bins, junk
      // (the lawn, the walk and the driveway are painted into the ground: CUL.drives / CUL.walks)
      const mb = put(new THREE.BoxGeometry(0.08, 1.1, 0.08), cmpMat(0x3a3a3a), 2.0, 0.55, 7.2, 0, 0, v.mailLean ? 0.4 : 0); put(new THREE.BoxGeometry(0.28, 0.25, 0.45), cmpMat(pickS([0x2a4a8a, 0x8a1a1a, 0x2a2a2a])), 2.0 + (v.mailLean ? 0.42 : 0), v.mailLean ? 1.0 : 1.15, 7.2, 0, 0, v.mailLean ? 0.4 : 0);
      for (let k = 0; k < 2; k++) { const tipped = v.bins && k === 1; const b = put(cmpBox(0.6, 1, 0.6), cmpMat(k ? 0x2a3a2a : 0x1a1a22), -4.4 + k * 0.8, tipped ? 0.3 : 0.5, tipped ? 6.4 : 4.9, 0, 0, tipped ? Math.PI / 2 : 0); }
      if (v.bins) for (let k = 0; k < 3; k++) put(new THREE.IcosahedronGeometry(0.32, 1), cmpMat(0x18181c), -3.4 + sr() * 1.2, 0.22, 6.4 + sr() * 0.6);
      if (v.couch) { put(cmpBox(2, 0.45, 0.85), cmpMat(0x6a4a3a), -3.2, 0.32, 6.4, 0, 0.3); put(cmpBox(2, 0.6, 0.25), cmpMat(0x6a4a3a), -3.1, 0.7, 6.05, 0, 0.3); }
      if (v.pool && !v.couch) { put(new THREE.CylinderGeometry(0.9, 0.9, 0.3, 16), cmpMat(0x3a8ac8), -3.1, 0.15, 6.6); put(new THREE.CircleGeometry(0.85, 16).rotateX(-Math.PI / 2), cmpMat(0x4a6a2a), -3.1, 0.29, 6.6); }
      if (v.sign) { put(new THREE.BoxGeometry(0.06, 1.2, 0.06), cmpMat(0x5a4030), -1.6, 0.6, 7.1); put(new THREE.PlaneGeometry(0.9, 0.56), signM, -1.6, 1.0, 7.14, 0, 0, 0.08); }
      // a yard prop or two: a lawn chair, a kid's bike on its side, a rusty grill, a clown lawn gnome
      for (const [px, pz] of [[-4.8, 7.6], [-2.9, 5.5]]) {
        const k = sr(); if (k > 0.6 || (pz < 6 && (v.couch || v.pool))) continue;
        const pg = new THREE.Group(); pg.position.set(px, 0, pz); pg.rotation.y = sr() * TAU; g.add(pg);
        const pp = (geo, m, a, b, c, rx = 0, ry2 = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(a, b, c); o.rotation.set(rx, ry2, rz); pg.add(o); return o; };
        if (k < 0.15) { const fr = cmpMat(0xa8a8b0); for (const sx of [-0.25, 0.25]) { pp(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 4), fr, sx, 0.3, 0, 1.2); pp(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 4), fr, sx, 0.3, 0.05, -1.2); } pp(new THREE.PlaneGeometry(0.5, 0.45).rotateX(-Math.PI / 2), cmpMat(pickS([0x3a8a6a, 0xc84a3a, 0xd8b03a])), 0, 0.42, 0.05); pp(new THREE.PlaneGeometry(0.5, 0.55), cmpMat(pickS([0x3a8a6a, 0xc84a3a])), 0, 0.7, -0.22, -0.3); }
        else if (k < 0.3) { const fr = cmpMat(pickS([0xc83a3a, 0x3a6ac8, 0xd8a83a])); for (const zz of [-0.45, 0.45]) pp(new THREE.TorusGeometry(0.28, 0.025, 4, 14).rotateX(Math.PI / 2), cmpMat(0x141414), 0, 0.04, zz); pp(new THREE.CylinderGeometry(0.02, 0.02, 0.95, 4).rotateX(Math.PI / 2), fr, 0, 0.06, 0); pp(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 4).rotateZ(Math.PI / 2), fr, 0, 0.06, 0.4); }
        else if (k < 0.42) { const gm = cmpMat(0x2a2422, TEX.rust, 0, [1, 1]); pp(new THREE.SphereGeometry(0.3, 10, 5, 0, TAU, Math.PI / 2, Math.PI / 2), gm, 0, 0.75, 0); pp(new THREE.SphereGeometry(0.3, 10, 4, 0, TAU, 0, Math.PI / 2), gm, 0.05, 0.78, 0, 0, 0, -0.6); for (let q = 0; q < 3; q++) pp(new THREE.CylinderGeometry(0.015, 0.015, 0.75, 4), gm, Math.cos(q * 2.1) * 0.18, 0.37, Math.sin(q * 2.1) * 0.18, Math.sin(q * 2.1) * 0.3, 0, -Math.cos(q * 2.1) * 0.3); }
        else { pp(new THREE.ConeGeometry(0.16, 0.36, 8), cmpMat(0x3a6ac8), 0, 0.18, 0); pp(new THREE.SphereGeometry(0.11, 8, 6), cmpMat(0xe8e0d0), 0, 0.44, 0); pp(new THREE.SphereGeometry(0.03, 6, 4), cmpMat(0xc8121a), 0, 0.44, 0.11); pp(new THREE.ConeGeometry(0.1, 0.26, 8), cmpMat(0xc8121a), 0.02, 0.62, 0, 0, 0, -0.3); for (const sx of [-1, 1]) pp(new THREE.SphereGeometry(0.06, 6, 4), cmpMat(0x3aa04a), sx * 0.11, 0.48, -0.02); }
      }
      // a low picket fence down one side of the front yard (between this yard and the next)
      { const pk = cmpMat(pickS([0xd8d0c0, 0xc8c0a8, 0xb8a888])), fx2 = 5.75;
        for (const y of [0.3, 0.7]) put(new THREE.BoxGeometry(0.04, 0.07, 3.15), pk, fx2 - 0.03, y, 5.73);
        for (let zz = 4.2; zz < 7.3; zz += 0.14) { const q = sr(); if (q < 0.08) continue; const pi = put(new THREE.BoxGeometry(0.025, 0.85, 0.08), pk, fx2, 0.43, zz); if (q < 0.15) pi.rotation.x = (sr() - 0.5) * 0.6; const tip = put(new THREE.BoxGeometry(0.025, 0.06, 0.06), pk, fx2, 0.86, zz, Math.PI / 4); tip.rotation.order = 'YXZ'; }
        for (const zz of [4.15, 5.7, 7.3]) put(new THREE.BoxGeometry(0.09, 1.0, 0.09), pk, fx2, 0.5, zz); }
      // weeds against the walls and the walk
      g.updateMatrixWorld(true);
      // the driveway (to the garage side) and the front walk, in world coordinates, for the painter
      const L = (lx, lz) => { const q = g.localToWorld(new THREE.Vector3(lx, 0, lz)); return [q.x, q.z]; };
      const d0 = L(3.4, 4.0), d1 = L(3.4, 11.0), dl = Math.hypot(d1[0], d1[1]);
      CUL.drives.push({ pts: [d0, d1, [d1[0] / dl * (CUL.R + 0.2), d1[1] / dl * (CUL.R + 0.2)]], house: g, v });
      CUL.walks.push([L(0, 4.2), L(0, 6.2), L(1.9, 7.4)]);
      for (let k = 0; k < 10; k++) tufts.push(g.localToWorld(new THREE.Vector3(-5 + sr() * 10, 0, 4.1 + sr() * 3.2)));
      { const a = g.localToWorld(new THREE.Vector3(5.75, 0, 4.15)), b = g.localToWorld(new THREE.Vector3(5.75, 0, 7.3)); col((a.x + b.x) / 2, (a.z + b.z) / 2, Math.abs(a.x - b.x) + 0.2, Math.abs(a.z - b.z) + 0.2, 1); }
      g.traverse((o) => { o.name = 'prop'; });
      const q = Math.abs(Math.sin(ry)) > 0.5; col(x, z, q ? 8.4 : 11.4, q ? 11.4 : 8.4, 4);
      // a porch light on some: a warm pool on the walk
      if (v.light) { const p = g.localToWorld(new THREE.Vector3(0, 0, 5.4)); glow(p.x, p.z, 3, 0xffb050); }
    };
    const tufts = [];
    const colors = [0x8a7a6a, 0x6e7a7a, 0x8a8070, 0x7a6a7e, 0x9a8a78, 0x6a7a6e, 0x8a6a5a, 0x7a7a6a];
    let hi = 0;
    const V = () => ({ porch: sr() < 0.6, sag: sr() < 0.5, tarp: false, hole: sr() < 0.3, chimney: sr() < 0.6, dish: sr() < 0.4, gutter: sr() < 0.5, garage: sr() < 0.35, face: sr() < 0.45, shutter: sr() < 0.5, mailLean: sr() < 0.5, bins: sr() < 0.6, couch: sr() < 0.3, pool: sr() < 0.25, sign: sr() < 0.35, light: sr() < 0.4, wing: sr() < 0.6 ? (sr() < 0.5 ? -1 : 1) : 0, dormer: sr() < 0.45, tag: sr() < 0.4, tag2: sr() < 0.4 });
    for (const zc of [-13.5, 0.5, 14.5]) { house(-35.5, zc, Math.PI / 2, colors[hi++ % 8], V()); house(35.5, zc, -Math.PI / 2, colors[hi++ % 8], V()); }
    for (const xc of [-17, 17]) { house(xc, -29.6, 0, colors[hi++ % 8], V()); house(xc, 29.6, Math.PI, colors[hi++ % 8], V()); }
    // the house you go into once Bobbert is down (js/house.js): the middle one on the west side
    SUB.door = new THREE.Vector3(CUL.walks[2][0][0], 0, CUL.walks[2][0][1]);
    // vacant corner lots: a car up on blocks, tyres, a busted fridge, weeds, a dead tree
    const lot = (x, z) => {
      add(new THREE.PlaneGeometry(7, 6).rotateX(-Math.PI / 2), lawnM, x, 0.045, z, 0, 'Terrain');
      const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = sr() * 3; c.name = 'prop'; root.add(c);
      subVehicle(c, 'sedan', 0, 0, 0, pickS([0x6a3a2a, 0x3a4a5a, 0x5a5a3a]), false, vm, { noWheels: true, lift: 0.3 });
      for (const [a, bb] of [[-0.6, -1.35], [0.6, -1.35], [-0.6, 1.35], [0.6, 1.35]]) { const k = new THREE.Mesh(cmpBox(0.38, 0.42, 0.38), concM); k.position.set(a, 0.21, bb); c.add(k); }
      c.traverse((o) => { o.name = 'prop'; });
      col(x, z, 3.6, 3.6, 1.6);
      for (let k = 0; k < 3; k++) add(new THREE.TorusGeometry(0.38, 0.15, 6, 10).rotateX(Math.PI / 2), cmpMat(0x141414), x + 2 + sr(), 0.15 + k * 0.28, z + 1.8, 0, 'Detail');
      blk(0.75, 1.6, 0.7, cmpMat(0xd8d0c0), x - 2.5, 0, z - 1.8, 0.4); col(x - 2.5, z - 1.8, 0.9, 0.9, 1.6);
      for (let k = 0; k < 14; k++) tufts.push(new THREE.Vector3(x + (sr() - 0.5) * 6.5, 0, z + (sr() - 0.5) * 5.5));
      // a dead tree
      subTree(root, x + 2.4, z - 1.6, 6.5 + sr() * 2, false, sr, treeM);
      col(x + 2.4, z - 1.6, 0.5, 0.5, 4);
    };
    lot(-34, -25); lot(34, -25); lot(-34, 25.5); lot(34, 25.5);
    // power poles along the yards with sagging wires between them, a transformer can on one
    const poleM = cmpMat(0x4a3a2c), wires = [];
    const poles = [[-30.4, -21], [-30.4, -7], [-30.4, 7], [-30.4, 21], [30.4, -21], [30.4, -7], [30.4, 7], [30.4, 21]];
    const insM = cmpMat(0x5a7a6a), flyers = [0xe8e0d0, 0xf0d040, 0xe85a8a, 0x8ad0e8];
    for (const [x, z] of poles) {
      add(new THREE.CylinderGeometry(0.12, 0.17, 8.5, 9), poleM, x, 4.25, z); blk(2.2, 0.12, 0.12, poleM, x, 7.6, z); col(x, z, 0.4, 0.4, 8);
      for (const o of [-0.9, 0, 0.9]) add(new THREE.CylinderGeometry(0.05, 0.06, 0.16, 6), insM, x + o, 7.8, z, 0, 'Detail');
      for (const sd of [-1, 1]) { const br = add(new THREE.BoxGeometry(0.05, 0.9, 0.05), poleM, x + sd * 0.32, 7.3, z, 0, 'Detail'); br.rotation.z = sd * 0.75; }
      for (let k = 0; k < 7; k++) add(new THREE.CylinderGeometry(0.018, 0.018, 0.28, 4).rotateZ(Math.PI / 2), cmpMat(0x6a6a6a), x + (k % 2 ? 0.17 : -0.17), 2.6 + k * 0.45, z, 0, 'Detail');
      for (let k = 0; k < 3; k++) { const a = sr() * TAU; add(new THREE.PlaneGeometry(0.28, 0.38), cmpMat(pickS(flyers)), x + Math.sin(a) * 0.15, 1.3 + sr() * 0.9, z + Math.cos(a) * 0.15, a, 'Detail').rotation.z = (sr() - 0.5) * 0.3; }
    }
    add(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 10), cmpMat(0x6a6a6a), -30.1, 6.3, -7);
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) for (const o of [-0.9, 0, 0.9]) { const a = poles[(side < 0 ? 0 : 4) + i], b = poles[(side < 0 ? 0 : 4) + i + 1]; for (let k = 0; k < 8; k++) { const t0 = k / 8, t1 = (k + 1) / 8, s0 = Math.sin(t0 * Math.PI) * 1.1, s1 = Math.sin(t1 * Math.PI) * 1.1; wires.push(a[0] + o, 7.7 - s0, a[1] + (b[1] - a[1]) * t0, a[0] + o, 7.7 - s1, a[1] + (b[1] - a[1]) * t1); } }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3));
    fx.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0x0c0a0c })));
    // trash along the curbs: bags, a shopping cart, an old mattress, tyres
    const onRing = (r) => { for (;;) { const a = sr() * TAU; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) > 0.32) return [Math.sin(a) * r, Math.cos(a) * r, a]; } }; // (not across the road out)
    for (let i = 0; i < 18; i++) { const [x, z] = onRing(CUL.R - 0.35 + sr() * 0.2); add(new THREE.IcosahedronGeometry(0.3 + sr() * 0.15, 1), cmpMat(pickS([0x18181c, 0x22222a, 0x2a3a2a])), x + (sr() - 0.5) * 0.4, 0.25, z + (sr() - 0.5) * 0.4, 0, 'Detail'); }
    blk(1.9, 0.22, 1.4, cmpMat(0xb8b0a0), -13.2, 0, 12.6, 0.9, 'Detail'); // a mattress dumped at the curb
    for (const [x, z] of [[16.2, -3.5], [-16.0, 5.5], [10.5, -12.8]]) for (let k = 0; k < 2; k++) add(new THREE.TorusGeometry(0.38, 0.15, 6, 10).rotateX(Math.PI / 2 - k * 0.6), cmpMat(0x141414), x + k * 0.5, 0.18 + k * 0.1, z, 0, 'Detail');
    // weed tufts: crossed alpha quads, all one mesh (on the lawns, in the cracks along the curb)
    for (let i = 0; i < 130; i++) { const [x, z] = onRing(i % 2 ? CUL.R + 0.15 + sr() * 0.12 : CUL.R + CUL.walkW + 0.2 + sr() * 0.3); tufts.push(new THREE.Vector3(x, 0, z)); } // in the curb's cracks and the sidewalk's edge
    for (let i = 0; i < 240; i++) { const a = sr() * TAU, r = CUL.R + CUL.walkW + 0.8 + sr() * 11; const x = Math.sin(a) * r, z = Math.cos(a) * r; if (Math.abs(x) < 29 && Math.abs(z) < 23 && !(Math.abs(x) < CUL.road + 2 && z > 0)) tufts.push(new THREE.Vector3(x, 0, z)); } // out on the lawns
    {
      const gt = cmpCanvas(64, 64, (g, w, h) => { for (let i = 0; i < 16; i++) { const x = 8 + sr() * 48; g.strokeStyle = `rgb(${90 + sr() * 50},${110 + sr() * 40},${40 + sr() * 30})`; g.lineWidth = 2 + sr() * 2; g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + (sr() - 0.5) * 20, h * 0.5, x + (sr() - 0.5) * 26, 6 + sr() * 20); g.stroke(); } });
      const P = [], U = [], I = [];
      for (const p of tufts) { const s = 0.5 + sr() * 0.7, a0 = sr() * Math.PI; for (const a of [a0, a0 + Math.PI / 2]) { const dx = Math.cos(a) * s / 2, dz = Math.sin(a) * s / 2, n = P.length / 3; P.push(p.x - dx, 0.02, p.z - dz, p.x + dx, 0.02, p.z + dz, p.x + dx, s * 0.8, p.z + dz, p.x - dx, s * 0.8, p.z - dz); U.push(0, 0, 1, 0, 1, 1, 0, 1); I.push(n, n + 1, n + 2, n, n + 2, n + 3); } }
      const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); tg.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); tg.setIndex(I); tg.computeVertexNormals(); tg.computeBoundingSphere();
      fx.add(new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ map: gt, alphaTest: 0.45, side: THREE.DoubleSide, emissive: 0x1a2010 })));
    }
    // a van by the stage, a wrecked car by the south-east corner
    { const vg = subVehicle(root, 'van', -11.5, -9.8, 1.3, 0xb8b0a4, false, vm);
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.3), cmpMat(0xffffff, face)); tag.position.set(1.02, 1.3, -0.3); tag.rotation.y = Math.PI / 2; tag.material.transparent = true; tag.name = 'prop'; vg.add(tag);
      const t2 = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.0), tagM); t2.position.set(-1.02, 1.2, -0.6); t2.rotation.y = -Math.PI / 2; t2.name = 'prop'; vg.add(t2);
      col(-11.5, -9.8, 5.2, 2.4, 2.6); }
    subVehicle(root, 'sedan', 8.6, 13.6, -0.5, 0x5a3a2a, true, vm); col(8.6, 13.6, 3.4, 4.4, 1.8);
    // trees: scraggly ones and dead ones behind the fences and between the houses
    for (const [x, z, h, leafy] of [[-33.8, -6.5, 8, true], [33.8, 7.5, 7.5, true], [33.8, -6.5, 7, false], [-33.8, 7.5, 8.5, true], [-3, -28.8, 9, true], [5.5, -28.6, 7, false], [7.2, 29.5, 8, true], [-7, 30.5, 7.5, true], [-24, -29, 6.5, false], [26, 29.5, 7, true]]) subTree(root, x, z, h, leafy, sr, treeM);

    // --- the street furniture of a cul-de-sac (2026-11-17)
    // the curb round the turnaround (cut where each driveway meets it) and along the road out
    {
      const N = Math.round(TAU * CUL.R / 1.0), open = Math.asin((CUL.road + 0.1) / CUL.R);
      for (let i = 0; i < N; i++) {
        const a = (i + 0.5) / N * TAU, wa = Math.atan2(Math.sin(a), Math.cos(a)), x = Math.sin(a) * (CUL.R + 0.12), z = Math.cos(a) * (CUL.R + 0.12);
        if (Math.abs(wa) < open) continue;
        if (CUL.drives.some((d) => Math.hypot(d.pts[2][0] - x, d.pts[2][1] - z) < 1.7)) continue;
        blk(TAU * CUL.R / N + 0.03, 0.14, 0.25, curbM, x, 0, z, a, 'Detail');
      }
      const z0 = Math.sqrt(CUL.R * CUL.R - CUL.road * CUL.road), z1 = Dd / 2;
      for (const sx of [-1, 1]) blk(0.25, 0.14, z1 - z0, curbM, sx * (CUL.road + 0.12), 0, (z0 + z1) / 2, 0, 'Detail');
      // slabs heaved up by roots, chunks broken off the curb
      for (let i = 0; i < 6; i++) { const [x, z, a] = onRing(CUL.R + 0.95); const sl = blk(1.3, 0.12, 1.4, cmpMat(0x8e887e, TEX.concrete, 0, [1, 1]), x, 0, z, a, 'Detail'); sl.rotation.x = 0.09; sl.rotation.z = -0.06; }
      for (let i = 0; i < 5; i++) { const [x, z] = onRing(CUL.R - 0.3); for (let k = 0; k < 3; k++) add(new THREE.DodecahedronGeometry(0.1 + sr0() * 0.08, 0), curbM, x + (sr0() - 0.5) * 0.7, 0.07, z + (sr0() - 0.5) * 0.7, sr0() * 3, 'Detail'); }
    }
    // fire hydrants on the sidewalk (one knocked over, leaking a puddle)
    for (const [a, down] of [[1.42, false], [-1.95, true]]) {
      const r = CUL.R + 0.75, x = Math.sin(a) * r, z = Math.cos(a) * r, hg = new THREE.Group(); hg.position.set(x, 0, z); hg.rotation.y = a; hg.name = 'prop'; root.add(hg);
      const hm = cmpMat(0xc8a21a), m = (geo, mt, px, py, pz, rz = 0) => { const o = new THREE.Mesh(geo, mt); o.position.set(px, py, pz); o.rotation.z = rz; hg.add(o); };
      if (down) { hg.rotation.z = Math.PI / 2 - 0.1; hg.position.y = 0.2; glow(x, z, 1.6, 0x6a8ab0); }
      m(new THREE.CylinderGeometry(0.17, 0.19, 0.7, 12), hm, 0, 0.38, 0); m(new THREE.SphereGeometry(0.17, 12, 6, 0, TAU, 0, Math.PI / 2), hm, 0, 0.73, 0);
      m(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 12), hm, 0, 0.05, 0); m(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8), cmpMat(0x6a5a20), 0, 0.88, 0);
      for (const sd of [-1, 1]) m(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 8).rotateZ(Math.PI / 2), hm, sd * 0.22, 0.52, 0);
      m(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 8).rotateX(Math.PI / 2), hm, 0, 0.45, 0.2);
      hg.traverse((o) => { o.name = 'prop'; }); col(x, z, 0.5, 0.5, 0.9);
    }
    // a yellow DEAD END sign where the road comes in
    {
      const sign2 = cmpCanvas(128, 128, (g2, w, h) => { g2.fillStyle = '#e0b81a'; g2.fillRect(0, 0, w, h); g2.strokeStyle = '#1a1612'; g2.lineWidth = 8; g2.strokeRect(10, 10, w - 20, h - 20); g2.save(); g2.translate(w / 2, h / 2); g2.rotate(-Math.PI / 4); g2.fillStyle = '#1a1612'; g2.font = 'bold 26px sans-serif'; g2.textAlign = 'center'; g2.fillText('DEAD', 0, -4); g2.fillText('END', 0, 24); g2.restore(); grime(g2, w, h, 24, 0.5); for (let i = 0; i < 5; i++) { g2.fillStyle = '#1a1612'; g2.beginPath(); g2.arc(20 + Math.random() * 88, 20 + Math.random() * 88, 2 + Math.random() * 3, 0, TAU); g2.fill(); } }); // (bullet holes)
      add(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 6), cmpMat(0x8a8a90), 6.7, 1.3, 18.2); col(6.7, 18.2, 0.3, 0.3, 2.6);
      const sg = add(new THREE.PlaneGeometry(0.85, 0.85), cmpMat(0xffffff, sign2), 6.7, 2.45, 18.25, 0, 'Detail'); sg.rotation.set(0, 0.25, Math.PI / 4 + 0.06); sg.material.side = THREE.DoubleSide;
    }
    // cars left in two driveways (one with its doors open and a flat), a basketball hoop on another
    for (const [k, col2, flat] of [[2, 0x4a5a6a, false], [7, 0x6a5a3a, true]]) {
      const d = CUL.drives[k]; if (!d) continue;
      const [a0, a1] = d.pts, cx = a0[0] + (a1[0] - a0[0]) * 0.55, cz = a0[1] + (a1[1] - a0[1]) * 0.55, ry = d.house.rotation.y;
      const cg = subVehicle(root, 'sedan', cx, cz, ry, col2, false, vm);
      if (flat) { cg.rotation.z = 0.04; cg.position.y = -0.04; }
      const q = Math.abs(Math.sin(ry)) > 0.5; col(cx, cz, q ? 4.7 : 2.1, q ? 2.1 : 4.7, 1.5);
    }
    {
      const d = CUL.drives[4]; if (d) {
        const hg = new THREE.Group(); d.house.add(hg); hg.position.set(5.2, 0, 9.6); hg.name = 'prop';
        const m = (geo, mt, px, py, pz) => { const o = new THREE.Mesh(geo, mt); o.position.set(px, py, pz); hg.add(o); return o; };
        m(new THREE.CylinderGeometry(0.06, 0.07, 3.1, 8), cmpMat(0x3a3a40), 0, 1.55, 0); m(new THREE.BoxGeometry(0.6, 0.06, 0.06), cmpMat(0x3a3a40), -0.3, 3.0, 0);
        m(new THREE.BoxGeometry(0.05, 0.85, 1.2), cmpMat(0xd8d0c0), -0.62, 3.2, 0).rotation.z = 0.05;
        m(new THREE.TorusGeometry(0.23, 0.015, 4, 14).rotateX(Math.PI / 2), cmpMat(0xc8501a), -0.9, 2.95, 0);
        m(new THREE.CylinderGeometry(0.23, 0.15, 0.35, 10, 1, true), cmpMat(0xe8e0d0), -0.9, 2.77, 0).material.side = THREE.DoubleSide;
        m(new THREE.SphereGeometry(0.12, 10, 8), cmpMat(0xb8501a), -1.6, 0.12, 1.3); // the ball, flat in the grass
        hg.traverse((o) => { o.name = 'prop'; });
        const w2 = d.house.localToWorld(new THREE.Vector3(5.2, 0, 9.6)); col(w2.x, w2.z, 0.3, 0.3, 3);
      }
    }
    // a tyre swing in a scraggly yard tree, a dog house with a chain and an empty bowl
    {
      const d = CUL.drives[1]; if (d) {
        const t0 = d.house.localToWorld(new THREE.Vector3(-4.4, 0, 9.4));
        subTree(root, t0.x, t0.z, 7, true, sr, treeM); col(t0.x, t0.z, 0.5, 0.5, 4);
        const sx = t0.x + 1.4, sz = t0.z; add(new THREE.CylinderGeometry(0.01, 0.01, 2.6, 4), cmpMat(0x6a5a40), sx, 2.6, sz, 0, 'Detail');
        add(new THREE.TorusGeometry(0.34, 0.13, 6, 12), cmpMat(0x141414), sx, 1.0, sz, 0.4, 'Detail');
      }
      const d2 = CUL.drives[8]; if (d2) {
        const hg = new THREE.Group(); d2.house.add(hg); hg.position.set(-4.0, 0, 9.0); hg.rotation.y = 0.5; hg.name = 'prop';
        const dm = cmpMat(0x7a4a2a, TEX.fence, 0, [1, 1]);
        const body = new THREE.Mesh(cmpBox(1.0, 0.8, 1.2), dm); body.position.y = 0.4; hg.add(body);
        for (const sd of [-1, 1]) { const rf = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.05, 1.3), cmpMat(0x3a2a24)); rf.position.set(sd * 0.27, 0.98, 0); rf.rotation.z = -sd * 0.6; hg.add(rf); }
        const hole = new THREE.Mesh(new THREE.CircleGeometry(0.25, 12), cmpMat(0x0a0808)); hole.position.set(0, 0.42, 0.61); hg.add(hole);
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.08, 10), cmpMat(0xb81a1a)); bowl.position.set(0.7, 0.04, 0.9); hg.add(bowl);
        hg.traverse((o) => { o.name = 'prop'; });
        const w2 = d2.house.localToWorld(new THREE.Vector3(-4.0, 0, 9.0)); col(w2.x, w2.z, 1.3, 1.3, 1.2);
      }
    }

    // (the street's houses, yards and lots stand where the old outer fences and trees were)
    // --- the edge of the area (2026-11-16: a real barrier, not just an invisible wall). Where a house
    // front isn't the edge, a fence is: weathered wooden privacy fences between the yards (planks
    // missing or leaning), chain-link with privacy slats and barbed wire behind the stage and across
    // the road out, overgrown hedges at the corners. The bounds walls stay behind them as a backstop.
    const plank = cmpMat(0x7a6048, TEX.fence, 0, [1, 1]), plank2 = cmpMat(0x5e4a38, TEX.fence, 0, [1, 1]), postM = cmpMat(0x3a2e24), linkM = cmpMat(0x8a8a92);
    const linkTex = cmpCanvas(64, 64, (g) => { g.strokeStyle = 'rgba(175,178,188,1)'; g.lineWidth = 2.5; for (let i = -64; i <= 64; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.stroke(); g.beginPath(); g.moveTo(i + 64, 0); g.lineTo(i, 64); g.stroke(); } });
    linkTex.wrapS = linkTex.wrapT = THREE.RepeatWrapping;
    const meshM = new THREE.MeshLambertMaterial({ map: linkTex, alphaTest: 0.35, side: THREE.DoubleSide, emissive: 0x202024 });
    const slatM = [cmpMat(0x2a4a3a), cmpMat(0x3a3a3e), cmpMat(0x4a3a2a)], bushM = [cmpMat(0x2f3a22), cmpMat(0x3a4626), cmpMat(0x2a3420), cmpMat(0x45482a)];
    const fence = (x0, z0, x1, z1, style) => {
      const L = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / L, uz = (z1 - z0) / L, ang = Math.atan2(ux, uz), across = ang - Math.PI / 2;
      const at = (t) => [x0 + ux * t, z0 + uz * t], [cx, cz] = at(L / 2);
      if (style === 'wood') {
        const n = Math.max(1, Math.round(L / 2.4));
        for (let i = 0; i <= n; i++) { const [px, pz] = at(i * L / n); blk(0.18, 2.15, 0.18, postM, px, 0, pz, ang); }
        for (const y of [0.4, 1.65]) blk(0.07, 0.12, L, postM, cx - uz * 0.08, y, cz + ux * 0.08, ang, 'Detail');
        for (let t = 0.09; t < L; t += 0.19) {
          const r = sr(); if (r < 0.06) continue; // a plank missing
          const [px, pz] = at(t), h = 1.8 + (sr() - 0.5) * 0.22;
          const p = add(new THREE.BoxGeometry(0.17, h, 0.035), r < 0.5 ? plank : plank2, px, h / 2, pz, across, 'Detail');
          if (r < 0.12) p.rotation.z = (sr() < 0.5 ? -1 : 1) * 0.22; // leaning
        }
      } else if (style === 'chain') {
        const n = Math.max(1, Math.round(L / 2.6));
        for (let i = 0; i <= n; i++) { const [px, pz] = at(i * L / n); add(new THREE.CylinderGeometry(0.055, 0.055, 2.35, 6), linkM, px, 1.17, pz); }
        add(new THREE.CylinderGeometry(0.035, 0.035, L, 5).rotateX(Math.PI / 2), linkM, cx, 2.25, cz, ang, 'Detail');
        const pg = new THREE.PlaneGeometry(L, 2.2), uv = pg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L * 2.2, uv.getY(i) * 4.8);
        add(pg, meshM, cx, 1.12, cz, across, 'Detail');
        for (let t = 0.25; t < L; t += 0.42) if (sr() < 0.6) { const [px, pz] = at(t); add(new THREE.BoxGeometry(0.34, 1.7 + sr() * 0.35, 0.02), pickS(slatM), px - uz * 0.03, 1.0, pz + ux * 0.03, across, 'Detail'); } // privacy slats, some gone
        const bw = []; for (let t = 0; t < L; t += 0.3) { const [px, pz] = at(t); bw.push(px, 2.38 + Math.sin(t * 9) * 0.06, pz); } // barbed wire coil
        const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(bw, 3)); fx.add(new THREE.Line(bg, new THREE.LineBasicMaterial({ color: 0x2a2a2e })));
      } else {
        for (let t = 0.35; t < L; t += 0.75) { const [px, pz] = at(t); for (let k = 0; k < 2; k++) { const b = add(new THREE.IcosahedronGeometry(0.8 + sr() * 0.35, 1), pickS(bushM), px + (sr() - 0.5) * 0.4, 0.7 + k * 0.75, pz + (sr() - 0.5) * 0.4); b.scale.y = 0.85; } }
      }
      const w = Math.abs(ux) * L + 0.5, d = Math.abs(uz) * L + 0.5; boxes.push([cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, -0.3, 2.3]); addBoxCol(cx, cz, w, d, -0.3, 2.3);
    };
    const EX = 31.4, EN = -25.7, ES = 25.7;
    for (const s of [-1, 1]) {
      fence(s * EX, EN, s * EX, -19, 'hedge'); fence(s * EX, -8, s * EX, -5, 'wood'); fence(s * EX, 6, s * EX, 9, 'wood'); fence(s * EX, 20, s * EX, ES, 'hedge');
      fence(s * 22.5, EN, s * EX, EN, 'wood'); fence(s * 22.5, ES, s * EX, ES, 'wood'); fence(s * 4.5, ES, s * 11.5, ES, 'wood');
    }
    fence(-11.5, EN, 11.5, EN, 'chain'); fence(-4.5, ES, 4.5, ES, 'chain');
    // the bounds themselves, just inside the fences (a backstop)
    for (const [x, z, w, d] of [[0, SUB_B.minZ - 0.5, 70, 1], [0, SUB_B.maxZ + 0.5, 70, 1], [SUB_B.minX - 0.5, 0, 1, 60], [SUB_B.maxX + 0.5, 0, 1, 60]]) { boxes.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2, -1, 4]); addBoxCol(x, z, w, d, -1, 4); }

    // --- litter all over the square (instanced), then the painted road under everything
    const solid = boxes.filter((b) => b[2] - b[0] < 30 && b[3] - b[1] < 30);
    subLitter(fx, makeRng(99), (x, z) => !solid.some((b) => x > b[0] - 0.15 && x < b[2] + 0.15 && z > b[1] - 0.15 && z < b[3] + 0.15), { minX: -26, maxX: 26, minZ: -20, maxZ: 20, ring: CUL.R });
    fx.add(suburbGround(W, Dd, solid, CUL));

    // --- merge everything lit (one draw per material), then the glows, bulbs and fires on top
    const before = MAP.cells.length;
    mergeStatics(root, group, new Map());
    MAP.cells.splice(before); // (the arena's distance culling mustn't touch these)
    const poolMat = new THREE.MeshBasicMaterial({ map: TEX.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.75 });
    const P = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), poolMat, pools.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pv = new THREE.Vector3(), c = new THREE.Color();
    pools.forEach(([x, z, r, col2], i) => { P.setMatrixAt(i, m4.compose(pv.set(x, 0.09, z), q.identity(), sc.set(r * 2, 1, r * 2))); P.setColorAt(i, c.setHex(col2)); });
    P.frustumCulled = false; P.renderOrder = 2; fx.add(P);
    const bl = bulbs.filter(Boolean), B = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), bl.length);
    bl.forEach(([x, y, z, col2], i) => { B.setMatrixAt(i, m4.compose(pv.set(x, y, z), q.identity(), sc.set(1, 1, 1))); B.setColorAt(i, c.setHex(col2)); });
    B.frustumCulled = false; fx.add(B);
    SUB.flameSprites = []; // (no flames on the drums or the wrecked car, 2026-11-19)
    group.add(fx);
    SUB.boxes = boxes;
  });
  // the blood decals and the gun drone work here too (the arena's map-wide stains are hidden here)
  for (const k of Object.keys(BLOOD.kinds || {})) worlds.suburb.objects.push(BLOOD.kinds[k].mesh);
  SUB.nav = navFromBoxes(SUB.boxes, [], SUB_B, () => 0);
  SUB.built = true;
}
function updateSuburb(dt) {
  if (WORLD.id !== 'suburb' || !SUB.flameSprites) return;
  for (const f of SUB.flameSprites) { f.t += dt * 9; const k = 1 + Math.sin(f.t) * 0.12 + Math.sin(f.t * 2.3) * 0.08; f.sp.scale.set(0.9 * k, 1.4 * (2 - k), 1); }
}

// --- moving between the stage's two areas ----------------------------------------------------------
// A black fade over the screen while the area swaps.
const SUB_FADE = (() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:5;transition:opacity 0.45s'; document.body.appendChild(d); return d; })();
// The yard is clear: the curtain at the entrance stage is the way on.
function openStageExit() {
  game.phase = 'exit';
  game.exitAt = new THREE.Vector3(0, 0, -CMP_FENCE.z + 6.6);
  hud.banner('YARD CLEARED', 'Go through the curtain at the entrance stage');
  setWaypoint(game.exitAt, { label: 'Go through the curtain at the entrance stage' });
  SFX.levelUp();
}
function checkStageExit() {
  if (game.phase !== 'exit' || game.area !== 'yard' || !game.exitAt || SUB.going) return;
  if (Math.hypot(player.pos.x - game.exitAt.x, player.pos.z - game.exitAt.z) > 2.2) return;
  SUB.going = true;
  SUB_FADE.style.opacity = 1;
  setTimeout(() => { enterSuburb(); SUB_FADE.style.opacity = 0; SUB.going = false; }, 480);
}
function enterSuburb() {
  buildSuburb();
  for (const d of drops.slice()) if (d.kind !== 'item') { tryAutoPickup(d); removeDrop(d); } // what's left on the ground comes along
  clearStageWorld();
  bloodStatic(false);
  switchWorld('suburb');
  navInit(...SUB.nav);
  game.area = 'suburb'; game.exitAt = null;
  setWaypoint(SUB.bossAt, { label: 'The main event: take down the boss', h: 4.2 });
  respawnAt(SUB.spawn, 0);
  player.hp = player.maxHp; player.invuln = 2;
  game.phase = 'bossIntro'; game.introT = 3.2;
  // (2026-11-19: no THE MAIN EVENT banner before the boss fight)
  savePlayer();
}
function spawnSuburbBoss() {
  game.phase = 'combat';
  clearWaypoint(); // (the boss has his own markers)
  const e = spawnEnemy('bearBoss', Math.max(game.enemyLevel + 1, player.level), SUB.bossAt.clone());
  // (the boss's old health was tuned for a five-wave stage with a rifle: it's lighter as a one-on-one)
  // (2026-11-17: no shield on him: what was his shield is folded into his health, so the bar is all red)
  e.maxHp = (e.maxHp + (e.maxShield || 0)) * 0.45; e.hp = e.maxHp; e.maxShield = 0; e.shield = 0;
  bossFightStart(e);
  game.waveTotal = 1; game.waveKilled = 0; game.toSpawn = [];
  // (2026-11-19: no banner with his name as he arrives: it's on the nameplate above his health bar)
  SFX.wave(); game.shake(0.4);
}

