'use strict';
// Stage 1's second area (decisions.md 2026-11-16, after the creator's sketch): once the yard's 20
// enemies are dead, the entrance stage's curtain opens onto a run-down suburban cul-de-sac at night,
// where the boss fight happens and nothing else. A cracked asphalt square inside a curb, a giant
// clown face painted on it, a rickety outdoor stage at the north end (truss, lamp banks, speakers,
// a torn clown banner, steps), four street lamps, red-and-white barricades with oil drums (some
// burning), houses at the corners with clown faces sprayed on, a van and a wrecked car, chain-link
// and picket fences, bunting, trees, and the road out to the south blocked off.
// It is its own world (defineWorld 'suburb'), built the first time it's entered, so only one area
// of the stage is ever in the scene. Names and words on it are placeholders.

const SUB = { built: false, spawn: new THREE.Vector3(0, 0, 15.5), bossAt: new THREE.Vector3(0, 0, -7), flames: [], t: 0 };
const SUB_B = { minX: -24.5, maxX: 24.5, minZ: -19.5, maxZ: 19.5 };

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

    // --- the ground: grass all round, sidewalks, and the painted asphalt square
    add(new THREE.PlaneGeometry(140, 120).rotateX(-Math.PI / 2), cmpMat(0xffffff, TEX.grass, 0, [14, 12]), 0, 0, 0, 0, 'Terrain');
    const W = 52, Dd = 40;
    const asphalt = cmpCanvas(1024, 788, (g, w, h) => {
      g.fillStyle = '#4a464c'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) { const v = 25 + Math.random() * 45; g.fillStyle = `rgba(${v},${v},${v + 4},0.5)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      for (let i = 0; i < 60; i++) { const x = Math.random() * w, y = Math.random() * h, r = 20 + Math.random() * 80, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${Math.random() < 0.5 ? '10,8,10' : '70,66,70'},0.35)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
      g.strokeStyle = 'rgba(8,6,8,0.85)'; // cracks
      for (let i = 0; i < 70; i++) { g.lineWidth = 1 + Math.random() * 2; g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 9; k++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
      g.strokeStyle = 'rgba(14,10,10,0.5)'; g.lineWidth = 7; // tyre arcs
      for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(w * (0.2 + Math.random() * 0.6), h * (0.3 + Math.random() * 0.5), 60 + Math.random() * 90, Math.random() * 3, Math.random() * 3 + 2); g.stroke(); }
      // the giant clown face: X eyes, a red nose, a jagged grin with drips (painted, worn)
      const cx = w / 2, cy = h * 0.47, s = 1;
      g.save(); g.globalAlpha = 0.95; g.lineCap = 'round';
      g.strokeStyle = '#d8d0c8'; g.lineWidth = 16;
      for (const ex of [-90, 90]) { g.beginPath(); g.moveTo(cx + ex - 38, cy - 120); g.lineTo(cx + ex + 38, cy - 50); g.moveTo(cx + ex + 38, cy - 120); g.lineTo(cx + ex - 38, cy - 50); g.stroke(); }
      g.fillStyle = '#a8121a'; g.beginPath(); g.arc(cx, cy - 10, 30, 0, TAU); g.fill();
      g.fillStyle = '#d8d0c8'; g.beginPath(); g.moveTo(cx - 190, cy + 10); g.quadraticCurveTo(cx, cy + 210, cx + 190, cy + 10); g.quadraticCurveTo(cx, cy + 120, cx - 190, cy + 10); g.fill();
      g.fillStyle = '#7a0a10'; // the teeth gaps
      for (let i = 0; i < 12; i++) { const t = (i + 0.5) / 12, x = cx - 170 + t * 340, y = cy + 40 + Math.sin(t * Math.PI) * 70; g.beginPath(); g.moveTo(x - 12, y - 8); g.lineTo(x, y + 18); g.lineTo(x + 12, y - 8); g.fill(); }
      g.fillStyle = '#d8d0c8'; for (let i = 0; i < 14; i++) { const t = Math.random(), x = cx - 160 + t * 320, y = cy + 60 + Math.sin(t * Math.PI) * 90; g.fillRect(x, y, 5, 20 + Math.random() * 60); } // drips
      g.restore();
      // blood: splats, smears and pools everywhere, more toward the stage and the middle
      for (let i = 0; i < 70; i++) {
        const x = Math.random() * w, y = Math.random() * h * (Math.random() < 0.5 ? 0.6 : 1), r = 8 + Math.random() * 30;
        g.fillStyle = `rgba(${100 + Math.random() * 40},4,8,${0.6 + Math.random() * 0.35})`;
        g.beginPath(); for (let k = 0; k <= 14; k++) { const a = k / 14 * TAU, rr = r * (0.6 + Math.random() * 0.6); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8); } g.fill();
        for (let k = 0; k < 10; k++) { const a = Math.random() * TAU, d = r * (1.2 + Math.random() * 1.5); g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.5 + Math.random() * 3, 0, TAU); g.fill(); }
      }
      for (let i = 0; i < 8; i++) { g.strokeStyle = 'rgba(100,4,8,0.55)'; g.lineWidth = 10 + Math.random() * 10; g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (Math.random() - 0.5) * 140; y += (Math.random() - 0.5) * 140; g.lineTo(x, y); } g.stroke(); }
      for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(230,225,215,0.7)'; g.save(); g.translate(Math.random() * w, Math.random() * h); g.rotate(Math.random() * 3); g.fillRect(-6, -4, 12, 8); g.restore(); } // paper scraps
    });
    add(new THREE.PlaneGeometry(W, Dd).rotateX(-Math.PI / 2), cmpMat(0xffffff, asphalt, 0x5a5050), 0, 0.03, 0, 0, 'Road'); // (lifted: it reads at night)
    glow(0, 3, 9, 0x9a7060); glow(0, -9, 7, 0xffc080); // light over the painted face and in front of the stage
    // the curb and sidewalk all round the square (a gap in the south side for the road)
    const walk = cmpMat(0x8a8478, TEX.concrete, 0, [12, 1]), curbM = cmpMat(0x9a948a);
    for (const [x, z, w, d] of [[0, -Dd / 2 - 1.3, W + 5.2, 2.6], [-W / 2 - 1.3, 0, 2.6, Dd], [W / 2 + 1.3, 0, 2.6, Dd], [-15, Dd / 2 + 1.3, W / 2 - 3.6 + 2.6, 2.6], [15, Dd / 2 + 1.3, W / 2 - 3.6 + 2.6, 2.6]]) add(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), walk, x, 0.06, z, 0, 'Road');
    for (const [x, z, w, d] of [[0, -Dd / 2, W, 0.25], [-W / 2, 0, 0.25, Dd], [W / 2, 0, 0.25, Dd], [-15.7, Dd / 2, W / 2 - 5.4, 0.25], [15.7, Dd / 2, W / 2 - 5.4, 0.25]]) blk(w, 0.14, d, curbM, x, 0, z, 0, 'Detail');
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
    for (const s of [-1, 1]) { blk(0.5, 7.4, 0.5, steel, s * 8, 1.25, SZ - 2.6); col(s * 8, SZ - 2.6, 0.6, 0.6, 9); }
    blk(16.5, 0.5, 0.5, steel, 0, 8.4, SZ - 2.6);
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
    for (const [x, z, sx] of [[-22.5, -9, 1], [22.5, -9, -1], [-22.5, 12, 1], [22.5, 12, -1]]) {
      add(new THREE.CylinderGeometry(0.12, 0.16, 6, 8), pole, x, 3, z); col(x, z, 0.4, 0.4, 6);
      blk(1.5, 0.1, 0.1, pole, x + sx * 0.7, 5.9, z, 0, 'Detail');
      blk(0.6, 0.25, 0.4, lampHead, x + sx * 1.35, 5.7, z, 0, 'Detail');
      glow(x + sx * 2.2, z, 7, 0xffb060);
    }

    // --- barricade clusters: jersey barriers in red and white, oil drums, some burning, a crate
    const stripes = cmpCanvas(128, 48, (g, w, h) => { g.fillStyle = '#e8e0d4'; g.fillRect(0, 0, w, h); g.fillStyle = '#b3121a'; for (let i = -2; i < 8; i++) { g.beginPath(); g.moveTo(i * 24, h); g.lineTo(i * 24 + 12, h); g.lineTo(i * 24 + 30, 0); g.lineTo(i * 24 + 18, 0); g.fill(); } grime(g, w, h, 20, 0.45); for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(110,4,8,0.7)'; g.fillRect(Math.random() * w, 0, 3, 10 + Math.random() * 30); } });
    const barM = cmpMat(0xffffff, stripes, 0, [1, 1]), drum = cmpMat(0x8a5030, TEX.rust, 0, [1, 1]), drum2 = cmpMat(0x3a4a3a, TEX.rust, 0, [1, 1]), crate = cmpMat(0x7a5a3a, TEX.fence, 0, [1, 1]);
    const barrier = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.name = 'prop'; root.add(g); const foot = new THREE.Mesh(cmpBox(2.4, 0.3, 0.7), barM); foot.position.y = 0.15; g.add(foot); const body = new THREE.Mesh(cmpBox(2.4, 0.65, 0.4, 0.08), barM); body.position.y = 0.6; g.add(body); g.traverse((o) => { o.name = 'prop'; }); const q = Math.abs(Math.sin(ry)) > 0.5; col(x, z, q ? 0.8 : 2.5, q ? 2.5 : 0.8, 0.95); };
    const drums = (x, z, n, fire) => { for (let i = 0; i < n; i++) { const a = i * 2.3, dx = Math.cos(a) * 0.55 * (i > 0 ? 1 : 0), dz = Math.sin(a) * 0.55 * (i > 0 ? 1 : 0); add(new THREE.CylinderGeometry(0.32, 0.32, 0.95, 12), i % 2 ? drum2 : drum, x + dx, 0.475, z + dz); for (const y of [0.22, 0.72]) add(new THREE.CylinderGeometry(0.335, 0.335, 0.05, 12), dark, x + dx, y, z + dz, 0, 'Detail'); } col(x, z, 1.6, 1.6, 1); if (fire) { SUB.flames.push([x, z]); glow(x, z, 4.5, 0xff8a2a); } };
    for (const [x, z, ry, fire] of [[-12, -4, 0.1, true], [12, -4, -0.1, false], [-13, 8, -0.05, false], [13, 8, 0.08, true], [0, 13, 0, true]]) {
      barrier(x + 1.5, z + 0.6, ry); barrier(x - 0.4, z - 1.3, ry + 0.25);
      drums(x - 2.2, z + 0.4, 4, fire);
      blk(0.8, 0.8, 0.8, crate, x - 1.0, 0, z - 2.6, 0.3); col(x - 1.0, z - 2.6, 0.9, 0.9, 0.8);
    }
    // more barriers angled round the edges of the square (as in the sketch)
    for (const [x, z, ry] of [[-20, -11, 0.6], [-23, -4, 1.4], [-23, 6, 1.6], [-20, 13, 2.5], [20, -11, -0.6], [23, -4, -1.4], [23, 6, -1.6], [20, 13, -2.5], [-7, 17.5, 0.2], [7, 17.5, -0.2]]) barrier(x, z, ry);
    // the road out, blocked: sawhorses across the gap in the curb
    for (const x of [-3, 0, 3]) { blk(2.4, 0.14, 0.08, barM, x, 0.95, 21, 0, 'Detail'); blk(2.4, 0.14, 0.08, barM, x, 0.55, 21, 0, 'Detail'); for (const s of [-1, 1]) blk(0.08, 1.05, 0.5, cmpMat(0x5a4030), x + s * 1.05, 0, 21, 0, 'Detail'); }
    col(0, 21, 9, 0.6, 1.2);

    // --- houses at the corners, outside the square: siding, roof, lit windows, a clown face sprayed on
    const roofM = cmpMat(0xffffff, TEX.roof, 0, [3, 2]), winM = cmpMat(0xffd27a, null, 0xffa040);
    const face = cmpCanvas(128, 96, (g, w, h) => { g.lineCap = 'round'; g.strokeStyle = '#a8121a'; g.lineWidth = 7; for (const ex of [-26, 26]) { g.beginPath(); g.moveTo(w / 2 + ex - 10, 18); g.lineTo(w / 2 + ex + 10, 38); g.moveTo(w / 2 + ex + 10, 18); g.lineTo(w / 2 + ex - 10, 38); g.stroke(); } g.lineWidth = 6; g.beginPath(); g.moveTo(w / 2 - 44, 56); g.quadraticCurveTo(w / 2, 96, w / 2 + 44, 56); g.stroke(); for (let i = 0; i < 6; i++) { g.fillStyle = '#a8121a'; g.fillRect(w / 2 - 36 + i * 14, 62 + Math.sin(i / 5 * Math.PI) * 14, 3, 10 + Math.random() * 12); } });
    const house = (x, z, ry, color) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.name = 'prop'; root.add(g);
      const put = (geo, m, px, py, pz, rx = 0, ryy = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.rotation.set(rx, ryy, 0); g.add(o); return o; };
      put(cmpBox(11, 3.6, 8), cmpMat(color, TEX.siding, 0, [4, 1]), 0, 1.8, 0);
      const roof = put(new THREE.CylinderGeometry(0.01, 6.6, 2.8, 4, 1).rotateY(Math.PI / 4), roofM, 0, 5.0, 0); roof.scale.set(1.25, 1, 0.95);
      put(cmpBox(0.9, 2, 0.9), cmpMat(0x6a3a2a), -3, 5.4, -1.5);
      for (const wx of [-3.4, 3.2]) { put(new THREE.PlaneGeometry(1.3, 1.1), Math.random() < 0.6 ? winM : cmpMat(0x1a1820), wx, 2, 4.02); put(cmpBox(1.5, 0.12, 0.12), white, wx, 1.4, 4.05); }
      put(new THREE.PlaneGeometry(1.1, 2.1), cmpMat(0x5a2a2a), 0.4, 1.05, 4.02);
      put(new THREE.PlaneGeometry(2.6, 1.95), cmpMat(0xffffff, face), -0.4, 2.6, 4.03).material.transparent = true;
      put(cmpBox(3, 0.3, 1.6), cmpMat(0x6b5a4a), 0.4, 0.15, 4.8);
      g.traverse((o) => { o.name = 'prop'; });
      const q = Math.abs(Math.sin(ry)) > 0.5; col(x, z, q ? 8.4 : 11.4, q ? 11.4 : 8.4, 4);
    };
    [[-33, -21, 0.0, 0x8a6a7a], [33, -21, 0, 0x6e7a8a], [-33, 22, Math.PI, 0x8a8070], [33, 22, Math.PI, 0x7a6a8e]].forEach(([x, z, r, c]) => house(x, z, r, c));
    // a van by the stage, a wrecked car by the south-east corner
    const van = (x, z, ry) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.name = 'prop'; root.add(g);
      const body = new THREE.Mesh(cmpBox(2.2, 2.2, 5, 0.3), cmpMat(0xb8b0a4, TEX.siding, 0, [2, 1])); body.position.y = 1.4; g.add(body);
      const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.8), cmpMat(0x1a2a38)); ws.position.set(0, 1.9, 2.52); g.add(ws);
      for (const [a, b] of [[-1, -1.6], [1, -1.6], [-1, 1.6], [1, 1.6]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 14).rotateZ(Math.PI / 2), cmpMat(0x141414)); w.position.set(a, 0.4, b); g.add(w); }
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.3), cmpMat(0xffffff, face)); tag.position.set(1.12, 1.5, 0); tag.rotation.y = Math.PI / 2; tag.material.transparent = true; g.add(tag);
      g.traverse((o) => { o.name = 'prop'; });
      const q = Math.abs(Math.sin(ry)) > 0.5; col(x, z, q ? 5.2 : 2.4, q ? 2.4 : 5.2, 2.6);
    };
    van(-15.5, -12.5, 1.3);
    const car = new THREE.Group(); car.position.set(15.5, 0, 15); car.rotation.y = -0.5; car.name = 'prop'; root.add(car);
    const cb = new THREE.Mesh(cmpBox(2, 0.9, 4.4, 0.2), cmpMat(0x5a3a2a, TEX.rust, 0, [2, 1])); cb.position.y = 0.7; car.add(cb);
    const cc = new THREE.Mesh(cmpBox(1.7, 0.7, 2.2, 0.18), cmpMat(0x3a2a22)); cc.position.set(0, 1.45, -0.3); car.add(cc);
    for (const [a, b] of [[-0.95, -1.4], [0.95, -1.4], [-0.95, 1.4], [0.95, 1.4]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12).rotateZ(Math.PI / 2), cmpMat(0x141414)); w.position.set(a, 0.36, b); car.add(w); }
    car.traverse((o) => { o.name = 'prop'; }); col(15.5, 15, 3.4, 4.4, 1.8);
    SUB.flames.push([15.2, 15.6]);

    // --- fences round the outside: chain-link at the back, pickets at the front, bunting on them
    const chain = cmpMat(0x6a6a72);
    const fenceRun = (x0, z0, x1, z1, picket) => {
      const L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L / 2.5), ang = Math.atan2(x1 - x0, z1 - z0);
      for (let i = 0; i <= n; i++) { const t = i / n; add(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6), picket ? cmpMat(0x6a5038) : chain, x0 + (x1 - x0) * t, 0.9, z0 + (z1 - z0) * t, 0, 'Detail'); }
      if (picket) { const m = Math.round(L / 0.35); for (let i = 0; i < m; i++) { const t = (i + 0.5) / m; blk(0.12, 1.0, 0.04, cmpMat(0x8a7058), x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t, ang, 'Detail'); } }
      else { const p = add(new THREE.PlaneGeometry(L, 1.7), cmpMat(0x9a9aa2, TEX.fence, 0, [L / 2, 1]), (x0 + x1) / 2, 0.9, (z0 + z1) / 2, ang + Math.PI / 2, 'Detail'); p.material.side = THREE.DoubleSide; p.material.transparent = true; p.material.opacity = 0.35; }
      const k = Math.round(L / 0.9); for (let i = 0; i < k; i++) { const t = (i + 0.5) / k, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, sag = Math.sin(t * Math.PI * 4) * 0.15; const flag = new THREE.BufferGeometry(); const dx = Math.sin(ang) * 0.22, dz = Math.cos(ang) * 0.22; flag.setAttribute('position', new THREE.Float32BufferAttribute([x - dx, 1.85 - sag, z - dz, x + dx, 1.85 - sag, z + dz, x, 1.45 - sag, z], 3)); flag.computeVertexNormals(); const fm = add(flag, cmpMat([0xb3121a, 0xe8e0d0, 0xd8b23a][i % 3]), 0, 0, 0, 0, 'Detail'); fm.material.side = THREE.DoubleSide; }
    };
    fenceRun(-38, -26, -9.5, -26, false); fenceRun(9.5, -26, 38, -26, false);
    fenceRun(-38, 27, -5, 27, true); fenceRun(5, 27, 38, 27, true);
    fenceRun(-38, -26, -38, 27, false); fenceRun(38, -26, 38, 27, false);
    // trees round the outside
    const bark = cmpMat(0x3a2a20), leaf = cmpMat(0x2f3a22), leaf2 = cmpMat(0x3e4a26);
    for (const [x, z, s] of [[-28, -12, 1.1], [28, -12, 1], [-29, 6, 1.2], [29, 6, 1.1], [-12, -24, 0.9], [12, -24, 1], [-24, 25, 1], [24, 25, 1.1], [-36, -2, 1.3], [36, 14, 1.2], [-3, -25, 0.8]]) {
      add(new THREE.CylinderGeometry(0.2 * s, 0.35 * s, 3 * s, 7), bark, x, 1.5 * s, z);
      for (let k = 0; k < 3; k++) add(new THREE.IcosahedronGeometry((1.7 + Math.random() * 0.7) * s, 1), k % 2 ? leaf : leaf2, x + (Math.random() - 0.5) * 2 * s, (3.6 + k * 0.7) * s, z + (Math.random() - 0.5) * 2 * s);
      col(x, z, 0.6, 0.6, 3);
    }
    // the edge of the area: invisible walls along the bounds (the fences and houses show it)
    for (const [x, z, w, d] of [[0, SUB_B.minZ - 0.5, 60, 1], [0, SUB_B.maxZ + 0.5, 60, 1], [SUB_B.minX - 0.5, 0, 1, 50], [SUB_B.maxX + 0.5, 0, 1, 50]]) { boxes.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2, -1, 4]); addBoxCol(x, z, w, d, -1, 4); }

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
    const flameMat = new THREE.SpriteMaterial({ map: TEX.flame, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    SUB.flameSprites = SUB.flames.map(([x, z]) => { const sp = new THREE.Sprite(flameMat); sp.position.set(x, 1.5, z); sp.scale.set(0.9, 1.4, 1); fx.add(sp); return { sp, t: Math.random() * 10 }; });
    group.add(fx);
    SUB.boxes = boxes;
  });
  // the blood decals and the gun drone work here too (the arena's map-wide stains are hidden here)
  for (const k of Object.keys(BLOOD.kinds || {})) worlds.suburb.objects.push(BLOOD.kinds[k].mesh);
  SUB.nav = navFromBoxes(SUB.boxes, [], SUB_B, () => 0);
  SUB.built = true;
}
function updateSuburb(dt) {
  updateEnterArrow(dt);
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
  showEnterArrow(game.exitAt);
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
  game.area = 'suburb'; game.exitAt = null; hideEnterArrow();
  respawnAt(SUB.spawn, 0);
  player.hp = player.maxHp; player.invuln = 2;
  game.phase = 'bossIntro'; game.introT = 3.2;
  hud.banner('THE MAIN EVENT', 'Get ready…');
  savePlayer();
}
function spawnSuburbBoss() {
  game.phase = 'combat';
  const e = spawnEnemy('boss', Math.max(game.enemyLevel + 1, player.level), SUB.bossAt.clone());
  // (the boss's old health was tuned for a five-wave stage with a rifle: it's lighter as a one-on-one)
  e.maxHp *= 0.45; e.hp = e.maxHp; e.maxShield *= 0.45; e.shield = e.maxShield;
  game.waveTotal = 1; game.waveKilled = 0; game.toSpawn = [];
  hud.banner(e.def.name.toUpperCase(), 'Boss fight');
  SFX.wave(); game.shake(0.4);
}

// The creator's arrow (ui/enter-arrow.png: the GIF's 6 frames side by side), bobbing over a way into
// another area (2026-11-16: "an indicator of enterable areas"); one at a time.
const ENTER_ARROW = (() => {
  const tex = new THREE.TextureLoader().load('ui/enter-arrow.png');
  tex.repeat.set(1 / 6, 1);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(1.7, 1.7, 1); sp.renderOrder = 6; sp.visible = false;
  scene.add(sp);
  return { sp, tex, at: null, t: 0 };
})();
function showEnterArrow(pos) { ENTER_ARROW.at = pos.clone(); ENTER_ARROW.sp.visible = true; }
function hideEnterArrow() { ENTER_ARROW.at = null; ENTER_ARROW.sp.visible = false; }
function updateEnterArrow(dt) {
  const A = ENTER_ARROW;
  if (!A.at) return;
  A.t += dt;
  A.sp.position.set(A.at.x, A.at.y + 3.4 + Math.sin(A.t * 4) * 0.25, A.at.z);
  A.tex.offset.x = (Math.floor(A.t / 0.12) % 6) / 6;
}
