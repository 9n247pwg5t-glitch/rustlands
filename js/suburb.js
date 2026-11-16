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

    // --- the ground: grass all round, sidewalks, and the painted asphalt square
    add(new THREE.PlaneGeometry(140, 120).rotateX(-Math.PI / 2), cmpMat(0x8a8a6a, TEX.grass, 0, [14, 12]), 0, 0, 0, 0, 'Terrain');
    const W = 52, Dd = 40;
    const asphalt = cmpCanvas(1024, 788, (g, w, h) => {
      g.fillStyle = '#4a464c'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) { const v = 25 + Math.random() * 45; g.fillStyle = `rgba(${v},${v},${v + 4},0.5)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      for (let i = 0; i < 60; i++) { const x = Math.random() * w, y = Math.random() * h, r = 20 + Math.random() * 80, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${Math.random() < 0.5 ? '10,8,10' : '70,66,70'},0.35)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
      g.strokeStyle = 'rgba(8,6,8,0.85)'; // cracks
      for (let i = 0; i < 70; i++) { g.lineWidth = 1 + Math.random() * 2; g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 9; k++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
      // potholes (broken edges, gravel in them), puddles catching the light, manholes and drains
      for (let i = 0; i < 16; i++) { const x = Math.random() * w, y = Math.random() * h, r = 10 + Math.random() * 22; g.fillStyle = '#5a5458'; g.beginPath(); for (let k = 0; k <= 12; k++) { const a = k / 12 * TAU, rr = (r + 5) * (0.75 + Math.random() * 0.4); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8); } g.fill(); g.fillStyle = '#121012'; g.beginPath(); for (let k = 0; k <= 12; k++) { const a = k / 12 * TAU, rr = r * (0.7 + Math.random() * 0.4); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8); } g.fill(); for (let k = 0; k < 14; k++) { g.fillStyle = 'rgba(90,86,90,0.9)'; g.fillRect(x + (Math.random() - 0.5) * r, y + (Math.random() - 0.5) * r * 0.7, 2, 2); } }
      for (let i = 0; i < 10; i++) { const x = Math.random() * w, y = Math.random() * h, r = 20 + Math.random() * 40, gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r); gr.addColorStop(0, 'rgba(120,120,160,0.5)'); gr.addColorStop(0.6, 'rgba(30,30,44,0.7)'); gr.addColorStop(1, 'rgba(30,30,44,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * 0.6, Math.random(), 0, TAU); g.fill(); }
      for (const [mx, my] of [[0.3, 0.75], [0.72, 0.25]]) { g.fillStyle = '#1e1c1e'; g.beginPath(); g.arc(mx * w, my * h, 18, 0, TAU); g.fill(); g.strokeStyle = '#4a464c'; g.lineWidth = 2; for (let r = 5; r < 18; r += 4) { g.beginPath(); g.arc(mx * w, my * h, r, 0, TAU); g.stroke(); } }
      for (const [dx, dy] of [[0.02, 0.3], [0.02, 0.7], [0.97, 0.3], [0.97, 0.7], [0.3, 0.015], [0.7, 0.015]]) { g.fillStyle = '#0e0c0e'; g.fillRect(dx * w - 14, dy * h - 8, 28, 16); g.fillStyle = '#4a464c'; for (let k = 0; k < 6; k++) g.fillRect(dx * w - 12 + k * 5, dy * h - 7, 2, 14); }
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
    add(new THREE.PlaneGeometry(W, Dd).rotateX(-Math.PI / 2), cmpMat(0xd8d0d0, asphalt, 0x2e2a2a), 0, 0.03, 0, 0, 'Road'); // (lifted: it reads at night)
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

    // --- shared house textures
    const roofM = cmpMat(0xffffff, TEX.roof, 0, [3, 2]), winM = cmpMat(0xffd27a, null, 0xffa040);
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
    const signM = cmpMat(0xffffff, sign);
    const house = (x, z, ry, color, v) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.name = 'prop'; root.add(g);
      const put = (geo, m, px, py, pz, rx = 0, ryy = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.rotation.set(rx, ryy, rz); g.add(o); return o; };
      const wall = cmpMat(color, TEX.siding, 0, [4, 1]);
      put(cmpBox(11, 3.4, 8), wall, 0, 1.9, 0);
      put(cmpBox(11.1, 0.25, 8.1), concM, 0, 0.12, 0); // foundation
      // a gable roof (2026-11-16, "less blocky"): two shingled slopes meeting at a ridge along the
      // front, eaves overhanging the walls, a ridge cap, fascia boards, sided gable ends, corner boards
      const RA = Math.atan2(2.4, 4.6), RL = Math.hypot(4.6, 2.4) + 0.2, roofY = (lz) => 6.0 - 2.4 * Math.abs(lz) / 4.6 + 0.08; // the slope's top at local z
      for (const sz of [-1, 1]) {
        put(new THREE.BoxGeometry(12.2, 0.14, RL), roofM, 0, 4.73, sz * 2.3, sz * RA);
        put(new THREE.BoxGeometry(12.3, 0.24, 0.07), trimM, 0, 3.47, sz * 4.72); // fascia
      }
      put(new THREE.BoxGeometry(12.3, 0.14, 0.34), cmpMat(0x2a2628), 0, 6.06, 0); // ridge cap
      const gs = new THREE.Shape(); gs.moveTo(-4, 0); gs.lineTo(4, 0); gs.lineTo(4, 0.32); gs.lineTo(0, 2.4); gs.lineTo(-4, 0.32); gs.lineTo(-4, 0);
      const gg = new THREE.ShapeGeometry(gs), guv = gg.attributes.uv; for (let i = 0; i < guv.count; i++) guv.setXY(i, guv.getX(i) / 11, guv.getY(i) / 3.4);
      for (const sx of [-1, 1]) put(gg, wall, sx * 5.51, 3.58, 0, 0, sx * Math.PI / 2);
      for (const [cx, cz] of [[-5.5, 4], [5.5, 4], [-5.5, -4], [5.5, -4]]) put(new THREE.BoxGeometry(0.24, 3.45, 0.24), trimM, cx, 1.92, cz);
      if (v.tarp) {
        const t = put(new THREE.PlaneGeometry(3.4, 2.4), tarpM, -2, roofY(2.2) + 0.02, 2.2, RA - Math.PI / 2, 0, 0.05); t.material.side = THREE.DoubleSide;
        for (const [tx, tz] of [[-3.5, 1.3], [-0.5, 1.2], [-3.4, 3.1], [-0.6, 3.2]]) put(cmpBox(0.3, 0.14, 0.3), concM, tx, roofY(tz) + 0.08, tz, RA); // bricks holding it down
      }
      if (v.hole) { put(new THREE.CircleGeometry(0.9, 8), holeM, 2.6, roofY(2.0) + 0.01, 2.0, RA - Math.PI / 2); for (let k = 0; k < 3; k++) put(new THREE.BoxGeometry(0.08, 0.06, 1.1), cmpMat(0x3a2a1e), 2.1 + k * 0.5, roofY(2.0) + 0.02, 2.0, RA); } // exposed rafters
      if (v.chimney) { put(cmpBox(0.9, 2.2, 0.9), cmpMat(0x6a3a2a), -3.4, 5.3, -1.5); put(cmpBox(1.05, 0.14, 1.05), concM, -3.4, 6.45, -1.5); }
      if (v.dish) { put(new THREE.SphereGeometry(0.4, 10, 6, 0, TAU, 0, Math.PI / 2), white, 3.8, roofY(3.0) + 0.3, 3.0, -1.1); put(new THREE.BoxGeometry(0.05, 0.5, 0.05), trimM, 3.8, roofY(3.0) + 0.1, 3.0); }
      // gutter along the front eave, one end hanging loose, a downspout at the corner
      put(new THREE.BoxGeometry(11.6, 0.12, 0.14), trimM, 0, 3.32, 4.82, 0, 0, v.gutter ? 0.1 : 0);
      put(new THREE.BoxGeometry(0.1, 3.2, 0.1), trimM, v.gutter ? -5.6 : 5.6, 1.7, 4.75, 0, 0, v.gutter ? 0.06 : 0);
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
      }
      if (v.garage) { put(new THREE.PlaneGeometry(3.2, 2.5), cmpMat(0x9a9488, TEX.metal, 0, [1, 1]), 3.4, 1.4, 4.03); if (v.face) put(new THREE.PlaneGeometry(2.6, 1.95), cmpMat(0xffffff, face), 3.4, 1.6, 4.05).material.transparent = true; }
      // the door and the porch: posts and a roof (sagging on some), steps; or just a stoop
      put(new THREE.PlaneGeometry(1.1, 2.1), cmpMat(pickS([0x5a2a2a, 0x2a3a4a, 0x3a3a2a])), 0, 1.3, 4.02);
      for (const dx of [-0.62, 0.62]) put(new THREE.BoxGeometry(0.12, 2.25, 0.08), trimM, dx, 1.37, 4.05);
      put(new THREE.BoxGeometry(1.36, 0.12, 0.08), trimM, 0, 2.48, 4.05); // the door frame
      put(new THREE.SphereGeometry(0.05, 6, 4), cmpMat(0xb8a060), 0.4, 1.3, 4.06); // knob
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
      put(new THREE.PlaneGeometry(11, 3.4).rotateX(-Math.PI / 2), lawnM, 0, 0.045, 5.7);
      put(new THREE.PlaneGeometry(1.2, 3.4).rotateX(-Math.PI / 2), concM, 0, 0.05, 5.7);
      const mb = put(new THREE.BoxGeometry(0.08, 1.1, 0.08), cmpMat(0x3a3a3a), 2.0, 0.55, 7.2, 0, 0, v.mailLean ? 0.4 : 0); put(new THREE.BoxGeometry(0.28, 0.25, 0.45), cmpMat(pickS([0x2a4a8a, 0x8a1a1a, 0x2a2a2a])), 2.0 + (v.mailLean ? 0.42 : 0), v.mailLean ? 1.0 : 1.15, 7.2, 0, 0, v.mailLean ? 0.4 : 0);
      for (let k = 0; k < 2; k++) { const tipped = v.bins && k === 1; const b = put(cmpBox(0.6, 1, 0.6), cmpMat(k ? 0x2a3a2a : 0x1a1a22), -4.4 + k * 0.8, tipped ? 0.3 : 0.5, tipped ? 6.4 : 4.9, 0, 0, tipped ? Math.PI / 2 : 0); }
      if (v.bins) for (let k = 0; k < 3; k++) put(new THREE.IcosahedronGeometry(0.32, 1), cmpMat(0x18181c), -3.4 + sr() * 1.2, 0.22, 6.4 + sr() * 0.6);
      if (v.couch) { put(cmpBox(2, 0.45, 0.85), cmpMat(0x6a4a3a), -3.2, 0.32, 6.4, 0, 0.3); put(cmpBox(2, 0.6, 0.25), cmpMat(0x6a4a3a), -3.1, 0.7, 6.05, 0, 0.3); }
      if (v.pool) { put(new THREE.CylinderGeometry(0.9, 0.9, 0.3, 16), cmpMat(0x3a8ac8), 3.6, 0.15, 6.2); put(new THREE.CircleGeometry(0.85, 16).rotateX(-Math.PI / 2), cmpMat(0x4a6a2a), 3.6, 0.29, 6.2); }
      if (v.sign) { put(new THREE.BoxGeometry(0.06, 1.2, 0.06), cmpMat(0x5a4030), -1.6, 0.6, 7.1); put(new THREE.PlaneGeometry(0.9, 0.56), signM, -1.6, 1.0, 7.14, 0, 0, 0.08); }
      // weeds against the walls and the walk
      for (let k = 0; k < 10; k++) tufts.push(g.localToWorld(new THREE.Vector3(-5 + sr() * 10, 0, 4.1 + sr() * 3.2)));
      g.updateMatrixWorld(true);
      g.traverse((o) => { o.name = 'prop'; });
      const q = Math.abs(Math.sin(ry)) > 0.5; col(x, z, q ? 8.4 : 11.4, q ? 11.4 : 8.4, 4);
      // a porch light on some: a warm pool on the walk
      if (v.light) { const p = g.localToWorld(new THREE.Vector3(0, 0, 5.4)); glow(p.x, p.z, 3, 0xffb050); }
    };
    const tufts = [];
    const colors = [0x8a7a6a, 0x6e7a7a, 0x8a8070, 0x7a6a7e, 0x9a8a78, 0x6a7a6e, 0x8a6a5a, 0x7a7a6a];
    let hi = 0;
    const V = () => ({ porch: sr() < 0.6, sag: sr() < 0.5, tarp: sr() < 0.4, hole: sr() < 0.3, chimney: sr() < 0.6, dish: sr() < 0.4, gutter: sr() < 0.5, garage: sr() < 0.35, face: sr() < 0.45, shutter: sr() < 0.5, mailLean: sr() < 0.5, bins: sr() < 0.6, couch: sr() < 0.3, pool: sr() < 0.25, sign: sr() < 0.35, light: sr() < 0.4 });
    for (const zc of [-13.5, 0.5, 14.5]) { house(-35.5, zc, Math.PI / 2, colors[hi++ % 8], V()); house(35.5, zc, -Math.PI / 2, colors[hi++ % 8], V()); }
    for (const xc of [-17, 17]) { house(xc, -29.6, 0, colors[hi++ % 8], V()); house(xc, 29.6, Math.PI, colors[hi++ % 8], V()); }
    // vacant corner lots: a car up on blocks, tyres, a busted fridge, weeds, a dead tree
    const lot = (x, z) => {
      add(new THREE.PlaneGeometry(7, 6).rotateX(-Math.PI / 2), lawnM, x, 0.045, z, 0, 'Terrain');
      const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = sr() * 3; c.name = 'prop'; root.add(c);
      const b = new THREE.Mesh(cmpBox(1.9, 0.85, 4.2, 0.2), cmpMat(pickS([0x6a3a2a, 0x3a4a5a, 0x5a5a3a]), TEX.rust, 0, [2, 1])); b.position.y = 0.95; c.add(b);
      const t = new THREE.Mesh(cmpBox(1.65, 0.65, 2.1, 0.16), cmpMat(0x2a2422)); t.position.set(0, 1.65, -0.3); c.add(t);
      for (const [a, bb] of [[-0.8, -1.3], [0.8, -1.3], [-0.8, 1.3], [0.8, 1.3]]) { const k = new THREE.Mesh(cmpBox(0.4, 0.5, 0.4), concM); k.position.set(a, 0.25, bb); c.add(k); }
      c.traverse((o) => { o.name = 'prop'; });
      col(x, z, 3.6, 3.6, 1.6);
      for (let k = 0; k < 3; k++) add(new THREE.TorusGeometry(0.38, 0.15, 6, 10).rotateX(Math.PI / 2), cmpMat(0x141414), x + 2 + sr(), 0.15 + k * 0.28, z + 1.8, 0, 'Detail');
      blk(0.75, 1.6, 0.7, cmpMat(0xd8d0c0), x - 2.5, 0, z - 1.8, 0.4); col(x - 2.5, z - 1.8, 0.9, 0.9, 1.6);
      for (let k = 0; k < 14; k++) tufts.push(new THREE.Vector3(x + (sr() - 0.5) * 6.5, 0, z + (sr() - 0.5) * 5.5));
      // a dead tree
      add(new THREE.CylinderGeometry(0.14, 0.3, 4.5, 7), cmpMat(0x2e241e), x + 2.4, 2.25, z - 1.6);
      for (let k = 0; k < 6; k++) { const br = add(new THREE.CylinderGeometry(0.04, 0.1, 2.2, 5), cmpMat(0x2e241e), x + 2.4, 2.6 + k * 0.38, z - 1.6); br.rotation.set((sr() - 0.5) * 2, sr() * TAU, 0.6 + sr() * 0.6); br.position.x += Math.sin(br.rotation.y) * 0.6; br.position.z += Math.cos(br.rotation.y) * 0.6; }
      col(x + 2.4, z - 1.6, 0.5, 0.5, 4);
    };
    lot(-34, -25); lot(34, -25); lot(-34, 25.5); lot(34, 25.5);
    // power poles along the yards with sagging wires between them, a transformer can on one
    const poleM = cmpMat(0x4a3a2c), wires = [];
    const poles = [[-30.4, -21], [-30.4, -7], [-30.4, 7], [-30.4, 21], [30.4, -21], [30.4, -7], [30.4, 7], [30.4, 21]];
    for (const [x, z] of poles) { add(new THREE.CylinderGeometry(0.12, 0.16, 8.5, 7), poleM, x, 4.25, z); blk(2.2, 0.12, 0.12, poleM, x, 7.6, z); col(x, z, 0.4, 0.4, 8); }
    add(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 10), cmpMat(0x6a6a6a), -30.1, 6.3, -7);
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) for (const o of [-0.9, 0, 0.9]) { const a = poles[(side < 0 ? 0 : 4) + i], b = poles[(side < 0 ? 0 : 4) + i + 1]; for (let k = 0; k < 8; k++) { const t0 = k / 8, t1 = (k + 1) / 8, s0 = Math.sin(t0 * Math.PI) * 1.1, s1 = Math.sin(t1 * Math.PI) * 1.1; wires.push(a[0] + o, 7.7 - s0, a[1] + (b[1] - a[1]) * t0, a[0] + o, 7.7 - s1, a[1] + (b[1] - a[1]) * t1); } }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3));
    fx.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0x0c0a0c })));
    // trash along the curbs: bags, a shopping cart, an old mattress, tyres
    for (let i = 0; i < 18; i++) { const side = i % 4, t = sr() * 0.8 + 0.1; const [x, z] = side === 0 ? [-24 + t * 48, -20.6] : side === 1 ? [(t < 0.5 ? -24 + t * 36 : 6 + (t - 0.5) * 36), 20.6] : side === 2 ? [-26.6, -18 + t * 36] : [26.6, -18 + t * 36]; add(new THREE.IcosahedronGeometry(0.3 + sr() * 0.15, 1), cmpMat(pickS([0x18181c, 0x22222a, 0x2a3a2a])), x + (sr() - 0.5), 0.25, z + (sr() - 0.5) * 0.6, 0, 'Detail'); }
    blk(1.9, 0.22, 1.4, cmpMat(0xb8b0a0), -26.5, 0, -4.5, 0.4, 'Detail'); // a mattress on the sidewalk
    for (const [x, z] of [[26.8, 9.5], [-26.8, 12.5], [11, -21]]) for (let k = 0; k < 2; k++) add(new THREE.TorusGeometry(0.38, 0.15, 6, 10).rotateX(Math.PI / 2 - k * 0.6), cmpMat(0x141414), x + k * 0.5, 0.18 + k * 0.1, z, 0, 'Detail');
    // weed tufts: crossed alpha quads, all one mesh (on the lawns, in the cracks along the curb)
    for (let i = 0; i < 160; i++) { const side = i % 4, t = sr(); tufts.push(side === 0 ? new THREE.Vector3(-25 + t * 50, 0, -19.6 - sr() * 0.3) : side === 1 ? new THREE.Vector3(-25 + t * 50, 0, 19.6 + sr() * 0.3) : side === 2 ? new THREE.Vector3(-25.6 - sr() * 0.3, 0, -19 + t * 38) : new THREE.Vector3(25.6 + sr() * 0.3, 0, -19 + t * 38)); }
    for (let i = 0; i < 35; i++) tufts.push(new THREE.Vector3((sr() - 0.5) * 48, 0, (sr() - 0.5) * 36)); // in the asphalt's cracks
    {
      const gt = cmpCanvas(64, 64, (g, w, h) => { for (let i = 0; i < 16; i++) { const x = 8 + sr() * 48; g.strokeStyle = `rgb(${90 + sr() * 50},${110 + sr() * 40},${40 + sr() * 30})`; g.lineWidth = 2 + sr() * 2; g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + (sr() - 0.5) * 20, h * 0.5, x + (sr() - 0.5) * 26, 6 + sr() * 20); g.stroke(); } });
      const P = [], U = [], I = [];
      for (const p of tufts) { const s = 0.5 + sr() * 0.7, a0 = sr() * Math.PI; for (const a of [a0, a0 + Math.PI / 2]) { const dx = Math.cos(a) * s / 2, dz = Math.sin(a) * s / 2, n = P.length / 3; P.push(p.x - dx, 0.02, p.z - dz, p.x + dx, 0.02, p.z + dz, p.x + dx, s * 0.8, p.z + dz, p.x - dx, s * 0.8, p.z - dz); U.push(0, 0, 1, 0, 1, 1, 0, 1); I.push(n, n + 1, n + 2, n, n + 2, n + 3); } }
      const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); tg.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); tg.setIndex(I); tg.computeVertexNormals(); tg.computeBoundingSphere();
      fx.add(new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ map: gt, alphaTest: 0.45, side: THREE.DoubleSide, emissive: 0x1a2010 })));
    }
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
