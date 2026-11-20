'use strict';
// Stage 1's third area (2026-11-19): once Bobbert is down, one of the cul-de-sac's houses (the middle
// one on the west side, SUB.door) becomes the way on: the waypoint marks its front door, and walking
// up to it fades into its living room, a run-down family home after the creator's reference: worn
// plank floor, peeling wallpaper with water stains and holes, two curtained windows and a picture on
// the back wall with the dark hallway between them, a red patterned rug under a sagging three-seat
// couch with a blanket thrown over it, a coffee table (newspapers, a can, an ashtray), two worn
// armchairs, an old CRT on a stand flickering with static, a potted plant, a floor lamp, a cabinet
// with cans, an overflowing bin, a side table with a radio, a bookshelf, a round table with three
// chairs, papers and stains everywhere, the front door hanging open behind you.
// Its own world (defineWorld 'house'), built the first time it's entered, with its own nav grid.
// What happens in the house is OPEN (not designed yet): for now the stage clears when you get in.

const HOUSE = { built: false, spawn: new THREE.Vector3(-0.1, 0, 4.6), W: 18, D: 12, tv: null, t: 0 };
const HOUSE_B = { minX: -8.6, maxX: 8.6, minZ: -5.6, maxZ: 5.6 };

function buildHouse() {
  if (HOUSE.built) return;
  cmpTextures();
  const A = worlds.arena, W = HOUSE.W, D = HOUSE.D, H = 2.7;
  defineWorld('house', { flat: 0, bounds: Object.assign({}, HOUSE_B), fog: null, background: new THREE.Color(0x07060a), light: A.light }, (group) => {
    const root = new THREE.Group(), fx = new THREE.Group(), boxes = [], pools = [];
    const rng = makeRng(1860), r = () => rng(), pick = (a) => a[Math.floor(r() * a.length)];
    const add = (geo, mat, x, y, z, ry = 0, name = 'prop') => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.name = name; root.add(m); return m; };
    const blk = (w, h, d, mat, x, y, z, ry = 0, name) => add(cmpBox(w, h, d), mat, x, y + h / 2, z, ry, name);
    const col = (x, z, w, d, h) => { boxes.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2, -0.3, h]); addBoxCol(x, z, w, d, -0.3, h); };
    const glow = (x, z, rad, c) => pools.push([x, z, rad, c]);
    // a group of parts turned as one (furniture), named for the merge
    const piece = (x, z, ry, fn) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.name = 'prop'; root.add(g); const put = (geo, m, px, py, pz, rx = 0, ryy = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.rotation.set(rx, ryy, rz); g.add(o); return o; }; fn(put, g); g.traverse((o) => { o.name = 'prop'; }); return g; };

    // --- textures
    const floorTex = cmpCanvas(1024, 683, (g, w, h) => {
      const pw = 38; // plank width in px (about 0.67 m of 18 m)
      for (let y = 0; y < h; y += 17) for (let x = -(y * 7) % 260; x < w; ) { const L = 120 + r() * 220, v = 70 + r() * 30; g.fillStyle = `rgb(${v + 22},${v * 0.66 + 8},${v * 0.42})`; g.fillRect(x, y, L, 16); for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(30,18,10,${0.15 + r() * 0.2})`; g.fillRect(x + r() * L, y + 2 + r() * 12, 20 + r() * 60, 1); } g.fillStyle = 'rgba(20,12,6,0.85)'; g.fillRect(x + L - 1, y, 2, 16); x += L; }
      for (let y = 0; y < h; y += 17) { g.fillStyle = 'rgba(16,10,6,0.9)'; g.fillRect(0, y + 16, w, 1.5); }
      void pw;
      for (let i = 0; i < 40; i++) { const x = r() * w, y = r() * h, rr = 8 + r() * 30, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(14,8,6,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); } // stains
      for (let i = 0; i < 9; i++) { const x = r() * w, y = r() * h; g.fillStyle = 'rgba(6,4,4,0.9)'; g.beginPath(); for (let k = 0; k <= 9; k++) { const a = k / 9 * TAU, q = (5 + r() * 8) * (0.6 + r() * 0.5); g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.fill(); } // holes in the boards
      const FX = (x) => (x + W / 2) / W * w, FZ = (z) => (z + D / 2) / D * h; // room metres to floor pixels
      // dust and grit settled everywhere, heaviest along the walls and in the corners
      for (let i = 0; i < 9000; i++) { const x = r() * w, y = r() * h, v = 120 + r() * 60; g.fillStyle = `rgba(${v},${v * 0.9},${v * 0.75},${0.08 + r() * 0.12})`; g.fillRect(x, y, 1.5, 1.5); }
      for (const [x0, y0, x1, y1] of [[0, 0, w, 24], [0, h - 24, w, h], [0, 0, 26, h], [w - 26, 0, w, h]]) { const gr = g.createLinearGradient(x0, y0, x0 === 0 && x1 === 26 ? 26 : x1 === w && x0 === w - 26 ? w - 26 : x0, y0 === 0 && y1 === 24 ? 24 : y0 === h - 24 ? h - 24 : y0); gr.addColorStop(0, 'rgba(70,58,44,0.6)'); gr.addColorStop(1, 'rgba(70,58,44,0)'); g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0); }
      // water damage under the windows, a big rotten patch by the left wall
      for (const [x, z, rad] of [[-4.9, -5.3, 1.3], [4.7, -5.3, 1.1], [-7.4, 2.4, 1.6]]) { const gr = g.createRadialGradient(FX(x), FZ(z), 0, FX(x), FZ(z), rad / W * w); gr.addColorStop(0, 'rgba(20,24,12,0.75)'); gr.addColorStop(0.6, 'rgba(40,36,20,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(FX(x) - 80, FZ(z) - 80, 160, 160); }
      // boards gone: dark gaps between the joists
      for (const [x, z, L] of [[5.6, 4.2, 1.6], [-3.4, -4.6, 1.2], [7.4, -0.6, 1.0]]) { g.fillStyle = '#070504'; g.fillRect(FX(x), FZ(z), L / W * w, 16); g.fillStyle = 'rgba(60,40,24,0.9)'; for (let k = 0; k < 3; k++) g.fillRect(FX(x) + (k + 0.5) * L / 3 / W * w, FZ(z), 3, 16); }
      // footprints in the dust, from the front door toward the hallway
      for (let k = 0; k < 26; k++) { const t = k / 26, x = 0.3 * Math.sin(t * 6) + (t < 0.5 ? -4.6 * Math.sin(t * Math.PI) : -4.6 * Math.sin(t * Math.PI)), z = 5.4 - t * 11, side = k % 2 ? 0.14 : -0.14; g.fillStyle = 'rgba(30,20,12,0.45)'; g.beginPath(); g.ellipse(FX(x + side), FZ(z), 3.5, 6, 0.2, 0, TAU); g.fill(); }
      // blood with a reason: something heavy dragged from the front door, round the rug, down the hallway;
      // a dried pool where it lay by the hallway, drips, a smeared handprint where someone tried to hold on
      g.lineCap = 'round'; g.lineJoin = 'round';
      const drag = [[-0.2, 5.9], [-0.9, 4.6], [-3.3, 3.6], [-4.9, 2.4], [-5.0, 0.2], [-4.6, -2.6], [-2.4, -3.9], [-0.4, -4.6], [0.1, -5.9]];
      for (const [wid, col] of [[0.55, 'rgba(70,6,10,0.35)'], [0.32, 'rgba(90,8,12,0.55)'], [0.12, 'rgba(60,4,8,0.6)']]) { g.strokeStyle = col; g.lineWidth = wid / W * w; g.beginPath(); drag.forEach(([x, z], i) => (i ? g.lineTo(FX(x) + (r() - 0.5) * 6, FZ(z) + (r() - 0.5) * 6) : g.moveTo(FX(x), FZ(z)))); g.stroke(); }
      for (let i = 0; i < 40; i++) { const seg = Math.floor(r() * (drag.length - 1)), t = r(), [ax, az] = drag[seg], [bx, bz] = drag[seg + 1]; g.fillStyle = 'rgba(80,6,10,0.75)'; g.beginPath(); g.arc(FX(ax + (bx - ax) * t + (r() - 0.5) * 0.9), FZ(az + (bz - az) * t + (r() - 0.5) * 0.9), 1.5 + r() * 2.5, 0, TAU); g.fill(); }
      { const gr = g.createRadialGradient(FX(0.1), FZ(-5.5), 2, FX(0.1), FZ(-5.5), 46); gr.addColorStop(0, 'rgba(70,4,8,0.9)'); gr.addColorStop(0.7, 'rgba(60,4,8,0.7)'); gr.addColorStop(1, 'rgba(60,4,8,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(FX(0.1), FZ(-5.5), 46, 26, 0.2, 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(90,8,12,0.7)'; { const hx = FX(-0.6), hy = FZ(5.2); g.beginPath(); g.ellipse(hx, hy, 6, 7, 0, 0, TAU); g.fill(); for (let f = 0; f < 4; f++) { g.fillRect(hx - 6 + f * 3.5, hy - 16, 2.2, 9 + (f === 1 || f === 2 ? 3 : 0)); } }
      const vg = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.62); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)'); g.fillStyle = vg; g.fillRect(0, 0, w, h); // darker toward the walls
    });
    const wallTex = cmpCanvas(256, 256, (g, w, h) => {
      g.fillStyle = '#b8a888'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(120,96,70,0.35)'; g.fillRect(x, 0, 12, h); g.fillStyle = 'rgba(90,70,50,0.25)'; for (let y = 8; y < h; y += 28) { g.beginPath(); g.arc(x + 22, y, 4, 0, TAU); g.fill(); } } // stripes and little motifs
      for (let i = 0; i < 14; i++) { const x = r() * w, y = r() * h * 0.5, L = 40 + r() * 150, gr = g.createLinearGradient(0, y, 0, y + L); gr.addColorStop(0, 'rgba(90,64,30,0.35)'); gr.addColorStop(1, 'rgba(90,64,30,0)'); g.fillStyle = gr; g.fillRect(x, y, 6 + r() * 26, L); } // water stains
      for (let i = 0; i < 3; i++) { const x = r() * w, y = r() * h, rw = 8 + r() * 18, rh = 6 + r() * 12; g.fillStyle = '#9a8a74'; g.beginPath(); g.ellipse(x, y, rw, rh, r(), 0, TAU); g.fill(); g.strokeStyle = 'rgba(240,230,210,0.7)'; g.lineWidth = 1.5; g.stroke(); } // peeled to the plaster
      grime(g, w, h, 30, 0.3);
      for (let i = 0; i < 18; i++) { const x = r() * w, y = h * (0.78 + r() * 0.22), rr = 6 + r() * 16, gr2 = g.createRadialGradient(x, y, 0, x, y, rr); gr2.addColorStop(0, 'rgba(30,40,20,0.6)'); gr2.addColorStop(1, 'rgba(30,40,20,0)'); g.fillStyle = gr2; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); } // mold creeping up from the floor
      g.strokeStyle = 'rgba(60,46,34,0.8)'; g.lineWidth = 2; g.beginPath(); { let x = r() * w, y = 10; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 20; y += 18; g.lineTo(x, y); } } g.stroke(); // a crack down the plaster
      const gr = g.createLinearGradient(0, h * 0.75, 0, h); gr.addColorStop(0, 'rgba(40,28,18,0)'); gr.addColorStop(1, 'rgba(40,28,18,0.6)'); g.fillStyle = gr; g.fillRect(0, h * 0.75, w, h * 0.25);
    });
    wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
    const rugTex = cmpCanvas(512, 304, (g, w, h) => {
      g.fillStyle = '#5a1418'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 12) for (let x = (y / 12) % 2 ? 6 : 0; x < w; x += 12) { g.fillStyle = r() < 0.5 ? 'rgba(150,70,40,0.5)' : 'rgba(30,6,10,0.4)'; g.beginPath(); g.moveTo(x + 6, y); g.lineTo(x + 12, y + 6); g.lineTo(x + 6, y + 12); g.lineTo(x, y + 6); g.fill(); }
      g.strokeStyle = '#8a4a30'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20); g.strokeStyle = '#2a080a'; g.lineWidth = 3; g.strokeRect(20, 20, w - 40, h - 40);
      for (let i = 0; i < 7; i++) { const x = r() * w, y = r() * h; g.fillStyle = '#c8a878'; g.beginPath(); for (let k = 0; k <= 7; k++) { const a = k / 7 * TAU, q = (6 + r() * 10); g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.fill(); } // worn through
      grime(g, w, h, 30, 0.35);
    });
    const leather = (c) => cmpMat(c, TEX.metal, 0x1a140c, [1, 1]); // (a little lift so they read in the dim room)
    const wood = cmpMat(0x8a5e3a, TEX.fence, 0, [1, 1]), woodD = cmpMat(0x5e3e26, TEX.fence, 0, [1, 1]);
    const paper = cmpMat(0xd8d0bc), can = cmpMat(0xb81a1a), dark = cmpMat(0x141012);

    // --- floor, walls, ceiling-less (the camera looks down into the room)
    add(new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2), cmpMat(0xffffff, floorTex), 0, 0, 0, 0, 'Terrain');
    add(new THREE.PlaneGeometry(60, 50).rotateX(-Math.PI / 2), cmpMat(0x0a0808), 0, -0.02, 0, 0, 'Terrain'); // the dark outside the room
    const wallM = cmpMat(0xffffff, wallTex, 0, [6, 1]), wallSide = cmpMat(0xffffff, wallTex, 0, [4, 1]), trim = cmpMat(0x3a2418), cap = cmpMat(0x6a5a62);
    // back wall in three parts round the hallway, with a dark hallway behind
    const hx0 = -0.9, hx1 = 1.1;
    for (const [x0, x1] of [[-W / 2, hx0], [hx1, W / 2]]) { blk(x1 - x0, H, 0.25, x1 - x0 > 6 ? wallM : wallSide, (x0 + x1) / 2, 0, -D / 2 - 0.12); col((x0 + x1) / 2, -D / 2 - 0.12, x1 - x0, 0.4, H); }
    blk(hx1 - hx0, 0.5, 0.25, wallSide, (hx0 + hx1) / 2, H - 0.5, -D / 2 - 0.12);
    add(new THREE.PlaneGeometry(hx1 - hx0, 3).rotateX(-Math.PI / 2), cmpMat(0x2a1a12, TEX.fence, 0, [1, 2]), (hx0 + hx1) / 2, 0.01, -D / 2 - 1.5, 0, 'Terrain'); // the hallway floor
    for (const sx of [hx0 - 0.12, hx1 + 0.12]) blk(0.25, H, 3, wallSide, sx, 0, -D / 2 - 1.5);
    blk(hx1 - hx0, H, 0.2, dark, (hx0 + hx1) / 2, 0, -D / 2 - 3);
    add(new THREE.PlaneGeometry(1.4, 0.8).rotateX(-Math.PI / 2), cmpMat(0x6a1a1a), (hx0 + hx1) / 2, 0.02, -D / 2 - 1.2, 0, 'Detail'); // runner rug
    col((hx0 + hx1) / 2, -D / 2 - 1.5, hx1 - hx0 + 0.4, 3, H); // (the hallway is closed off for now)
    for (const sx of [-1, 1]) { blk(0.25, H, D + 0.5, wallSide, sx * (W / 2 + 0.12), 0, 0); col(sx * (W / 2 + 0.12), 0, 0.4, D + 0.5, H); }
    // the front wall is kept low so the camera sees in; the doorway in it, the door hanging open
    const dx0 = -0.9, dx1 = 0.75;
    for (const [x0, x1] of [[-W / 2, dx0], [dx1, W / 2]]) { blk(x1 - x0, 0.7, 0.25, wallSide, (x0 + x1) / 2, 0, D / 2 + 0.12); col((x0 + x1) / 2, D / 2 + 0.12, x1 - x0, 0.4, 0.7); }
    col((dx0 + dx1) / 2, D / 2 + 0.6, dx1 - dx0, 0.4, 2); // (out the front: back the way you came, closed)
    piece(dx1 - 0.05, D / 2 + 0.1, 1.2, (put) => { put(new THREE.BoxGeometry(1.5, 2.1, 0.06), cmpMat(0x5a3020, TEX.fence, 0, [1, 1]), -0.75, 1.05, 0); put(new THREE.SphereGeometry(0.04, 6, 4), cmpMat(0xb8a060), -1.35, 1.0, 0.05); });
    // baseboards and wall caps
    blk(W, 0.14, 0.05, trim, 0, 0, -D / 2 + 0.03, 0, 'Detail'); for (const sx of [-1, 1]) blk(0.05, 0.14, D, trim, sx * (W / 2 - 0.03), 0, 0, 0, 'Detail');
    blk(W + 0.5, 0.06, 0.32, cap, 0, H, -D / 2 - 0.12, 0, 'Detail'); for (const sx of [-1, 1]) blk(0.32, 0.06, D + 0.5, cap, sx * (W / 2 + 0.12), H, 0, 0, 'Detail');
    // holes punched in the plaster, a crack
    for (const [x, y] of [[-2.6, 1.7], [-5.8, 0.6]]) add(new THREE.CircleGeometry(0.22, 7), dark, x, y, -D / 2 + 0.01, 0, 'Detail');
    // windows with net curtains on the back wall (night outside), a picture
    for (const wx of [-4.9, 4.7]) {
      add(new THREE.PlaneGeometry(1.5, 1.0), cmpMat(0x203050, null, 0x101830), wx, 1.65, -D / 2 + 0.02, 0, 'Detail');
      for (const dy of [-0.55, 0.55]) blk(1.7, 0.08, 0.08, trim, wx, 1.65 + dy - 0.04, -D / 2 + 0.06, 0, 'Detail');
      for (const ddx of [-0.8, 0, 0.8]) blk(0.07, 1.1, 0.06, trim, wx + ddx, 1.1, -D / 2 + 0.06, 0, 'Detail');
      blk(1.5, 0.05, 0.05, trim, wx, 1.6, -D / 2 + 0.06, 0, 'Detail');
      for (const s of [-1, 1]) { const cu = add(new THREE.PlaneGeometry(0.5, s > 0 && wx > 0 ? 0.7 : 1.2), cmpMat(0xc8bca0), wx + s * 0.62, s > 0 && wx > 0 ? 1.95 : 1.6, -D / 2 + 0.1, 0, 'Detail'); if (s > 0 && wx > 0) cu.rotation.z = 0.25; } // (one torn half off)
      if (wx < 0) for (const [dy, rz] of [[0.25, 0.12], [-0.05, -0.08], [-0.32, 0.05]]) blk(1.75, 0.16, 0.04, cmpMat(0x7a5a3a, TEX.fence, 0, [1, 1]), wx, 1.65 + dy - 0.08, -D / 2 + 0.14, 0, 'Detail').rotation.z = rz; // boarded up
      add(new THREE.BoxGeometry(1.9, 0.05, 0.05), cmpMat(0x6a5a40), wx, 2.25, -D / 2 + 0.1, 0, 'Detail');
      glow(wx, -D / 2 + 1.2, 1.6, 0x4a5a8a);
    }
    blk(1.1, 0.5, 0.05, cmpMat(0x3a2418), 2.8, 1.45, -D / 2 + 0.04, 0, 'Detail'); add(new THREE.PlaneGeometry(0.95, 0.38), cmpMat(0x4a6a5a), 2.8, 1.7, -D / 2 + 0.08, 0, 'Detail');
    for (const [z, h2] of [[-3.8, 1.6], [-1.2, 1.4]]) { blk(0.04, 0.6, 0.45, cmpMat(0x3a2418), -W / 2 + 0.04, h2 - 0.3, z, 0, 'Detail'); add(new THREE.PlaneGeometry(0.36, 0.5), cmpMat(0x6a4a5a), -W / 2 + 0.07, h2, z, Math.PI / 2, 'Detail'); }

    // --- the rug and the living-room set
    add(new THREE.PlaneGeometry(8.3, 4.9).rotateX(-Math.PI / 2), cmpMat(0xffffff, rugTex), 0.05, 0.015, 0.45, 0, 'Detail');
    // the couch: base, back, arms, three seat cushions and three back cushions, a blanket over one end
    const couchM = leather(0x9a7e58), couchD = leather(0x7a6244);
    piece(0, -1.85, 0, (put) => {
      put(cmpBox(4.4, 0.45, 1.0, 0.08), couchD, 0, 0.32, 0);
      put(cmpBox(4.4, 0.75, 0.3, 0.1), couchD, 0, 0.75, -0.38);
      for (const s of [-1, 1]) put(cmpBox(0.32, 0.62, 1.0, 0.12), couchM, s * 2.1, 0.5, 0);
      for (let i = 0; i < 3; i++) { put(cmpBox(1.25, 0.18, 0.78, 0.07), couchM, -1.3 + i * 1.3, 0.62, 0.08); put(cmpBox(1.25, 0.55, 0.22, 0.08), couchM, -1.3 + i * 1.3, 0.95, -0.24, -0.15); }
      for (const [x, z] of [[-1.6, 0.2], [0.9, 0.1], [1.7, -0.2]]) put(new THREE.CircleGeometry(0.12, 6).rotateX(-Math.PI / 2), cmpMat(0xc8a878), x, 0.715, z); // worn through to the stuffing
      const bl = put(new THREE.PlaneGeometry(0.9, 1.6, 4, 6), cmpMat(0xb0a8a0), 1.2, 0.95, -0.05, -1.1, 0, 0.15); bl.material.side = THREE.DoubleSide;
      const P = bl.geometry.attributes.position; for (let i = 0; i < P.count; i++) P.setZ(i, P.getZ(i) + Math.sin(P.getX(i) * 6 + P.getY(i) * 3) * 0.05);
      for (const [x, z] of [[-2.05, -0.4], [2.05, -0.4], [-2.05, 0.4], [2.05, 0.4]]) put(new THREE.CylinderGeometry(0.05, 0.04, 0.12, 6), woodD, x, 0.06, z);
    });
    col(0, -1.85, 4.5, 1.1, 1.1);
    // the coffee table: newspapers, a red can, an ashtray
    piece(-0.1, 0.35, 0, (put) => {
      put(cmpBox(2.4, 0.08, 1.05, 0.02), wood, 0, 0.45, 0);
      for (const [x, z] of [[-1.1, -0.45], [1.1, -0.45], [-1.1, 0.45], [1.1, 0.45]]) put(new THREE.BoxGeometry(0.08, 0.42, 0.08), woodD, x, 0.21, z);
      put(new THREE.BoxGeometry(2.2, 0.04, 0.9), woodD, 0, 0.12, 0);
      for (let k = 0; k < 3; k++) put(new THREE.PlaneGeometry(0.42, 0.3).rotateX(-Math.PI / 2), paper, -0.55 + k * 0.08, 0.495 + k * 0.002, 0.05 + k * 0.05, 0, 0.3 * k - 0.2, 0);
      put(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 10), can, 0.3, 0.56, -0.2);
      put(new THREE.CylinderGeometry(0.12, 0.1, 0.04, 12), cmpMat(0x3a3a40), 0.6, 0.51, 0.15);
    });
    col(-0.1, 0.35, 2.5, 1.1, 0.5);
    // two worn armchairs angled at the table
    for (const [x, z, ry] of [[-3.2, 1.35, 0.55], [2.75, 1.45, -0.6]]) {
      piece(x, z, ry + Math.PI, (put) => {
        put(cmpBox(1.1, 0.45, 1.0, 0.08), couchD, 0, 0.3, 0);
        put(cmpBox(1.1, 0.75, 0.28, 0.1), couchM, 0, 0.75, -0.38);
        for (const s of [-1, 1]) put(cmpBox(0.24, 0.6, 1.0, 0.1), couchM, s * 0.5, 0.48, 0);
        put(cmpBox(0.7, 0.16, 0.7, 0.06), couchM, 0, 0.6, 0.08);
        put(new THREE.CircleGeometry(0.1, 6).rotateX(-Math.PI / 2), cmpMat(0xc8a878), 0.15, 0.685, 0.2);
      });
      col(x, z, 1.15, 1.15, 1);
    }
    // the TV corner: a wooden stand, an old CRT flickering with static, a potted plant, a floor lamp
    const tvCv = document.createElement('canvas'); tvCv.width = 64; tvCv.height = 48;
    const tvTex = new THREE.CanvasTexture(tvCv); tvTex.minFilter = THREE.LinearFilter; tvTex.generateMipmaps = false;
    HOUSE.tv = { cv: tvCv, g: tvCv.getContext('2d'), tex: tvTex, t: 0 };
    piece(-6.3, -1.05, 0.7, (put) => {
      put(cmpBox(1.7, 0.6, 0.7, 0.03), wood, 0, 0.3, 0);
      for (const s of [-1, 1]) put(new THREE.PlaneGeometry(0.7, 0.42), woodD, s * 0.42, 0.3, 0.355);
      put(cmpBox(0.95, 0.75, 0.75, 0.1), cmpMat(0x2a2a2e), 0, 0.98, -0.02);
      put(new THREE.PlaneGeometry(0.72, 0.54), new THREE.MeshBasicMaterial({ map: tvTex }), 0, 1.0, 0.36);
      for (const s of [-1, 1]) put(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 4), cmpMat(0x9a9aa0), s * 0.15, 1.55, -0.1, 0, 0, s * 0.5);
    });
    col(-6.3, -1.05, 1.6, 1.3, 1.4);
    glow(-5.4, -0.2, 2.6, 0x6a8ad0);
    piece(-7.2, -3.9, 0, (put) => {
      put(new THREE.CylinderGeometry(0.32, 0.24, 0.5, 12), cmpMat(0x8a4a2a), 0, 0.25, 0);
      for (let k = 0; k < 14; k++) { const a = k / 14 * TAU, l = put(new THREE.PlaneGeometry(0.18, 0.9), cmpMat(pick([0x3a5a24, 0x4a6a2a, 0x5a5a2a])), Math.cos(a) * 0.12, 0.9, Math.sin(a) * 0.12, Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7); l.material.side = THREE.DoubleSide; }
    });
    col(-7.2, -3.9, 0.7, 0.7, 1);
    piece(-7.6, -0.1, 0, (put) => {
      put(new THREE.CylinderGeometry(0.18, 0.22, 0.05, 12), dark, 0, 0.03, 0);
      put(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 6), cmpMat(0x6a5a40), 0, 0.82, 0);
      put(new THREE.CylinderGeometry(0.18, 0.3, 0.32, 12, 1, true), cmpMat(0xe8d8a8, null, 0x6a5020), 0.04, 1.66, 0, 0.3, 0, 0.2).material.side = THREE.DoubleSide; // (knocked crooked)
    });
    col(-7.6, -0.1, 0.5, 0.5, 1.8);
    glow(-7.4, -0.1, 2.4, 0xffc070);
    // along the left wall: a cabinet with cans and bottles, an overflowing bin
    piece(-8.1, 1.7, Math.PI / 2, (put) => {
      put(cmpBox(1.5, 1.0, 0.45, 0.03), woodD, 0, 0.5, 0);
      for (let k = 0; k < 4; k++) put(new THREE.CylinderGeometry(0.04, 0.04, 0.13, 8), k % 2 ? can : cmpMat(0x3a5a3a), -0.5 + k * 0.3, 1.07, 0.05);
      for (let k = 0; k < 3; k++) put(new THREE.BoxGeometry(0.05, 0.25, 0.18), cmpMat(pick([0x6a2a2a, 0x2a3a5a, 0x5a5a2a])), -0.3 + k * 0.08, 0.35, 0.1);
    });
    col(-8.1, 1.7, 0.6, 1.6, 1.1);
    piece(-7.9, 3.6, 0, (put) => {
      put(new THREE.CylinderGeometry(0.3, 0.25, 0.65, 12, 1, true), cmpMat(0x5a5a52), 0, 0.33, 0).material.side = THREE.DoubleSide;
      for (let k = 0; k < 6; k++) put(new THREE.IcosahedronGeometry(0.12, 0), cmpMat(pick([0xd8d0bc, 0x8a8478, 0xb81a1a])), (r() - 0.5) * 0.3, 0.62 + r() * 0.15, (r() - 0.5) * 0.3);
    });
    col(-7.9, 3.6, 0.65, 0.65, 0.8);
    // the right side: a side table with a radio and a can, a bookshelf, a round table with three chairs
    piece(4.5, -5.0, 0, (put) => {
      put(cmpBox(1.7, 0.08, 0.6, 0.02), wood, 0, 0.75, 0); for (const [x, z] of [[-0.78, -0.24], [0.78, -0.24], [-0.78, 0.24], [0.78, 0.24]]) put(new THREE.BoxGeometry(0.06, 0.72, 0.06), woodD, x, 0.36, z);
      put(new THREE.BoxGeometry(1.6, 0.04, 0.5), woodD, 0, 0.25, 0);
      put(cmpBox(0.6, 0.32, 0.25, 0.03), cmpMat(0x6a6a62), -0.2, 0.95, 0); put(new THREE.CircleGeometry(0.08, 10), dark, -0.35, 0.95, 0.13); put(new THREE.PlaneGeometry(0.22, 0.12), cmpMat(0xc8a860), -0.05, 0.98, 0.13);
      put(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 10), can, 0.45, 0.86, 0.05);
    });
    col(4.5, -5.0, 1.8, 0.7, 1);
    piece(8.25, -3.3, -Math.PI / 2, (put) => {
      put(cmpBox(1.6, 2.0, 0.45, 0.03), woodD, 0, 1.0, 0);
      for (let s = 0; s < 4; s++) { put(new THREE.BoxGeometry(1.45, 0.04, 0.4), wood, 0, 0.25 + s * 0.48, 0.03); for (let k = 0; k < 7; k++) if (r() > 0.25) put(new THREE.BoxGeometry(0.1 + r() * 0.05, 0.3 + r() * 0.1, 0.28), cmpMat(pick([0x6a2a2a, 0x2a3a5a, 0x5a5a2a, 0x3a2a4a, 0x8a6a3a])), -0.6 + k * 0.19, 0.42 + s * 0.48, 0.05, 0, 0, (r() - 0.5) * 0.3); }
      put(new THREE.CylinderGeometry(0.25, 0.25, 0.1, 16).rotateX(Math.PI / 2), cmpMat(0x2a2a2e), 0.4, 2.2, 0); // a clock face down on top
    });
    col(8.25, -3.3, 0.6, 1.7, 2.1);
    piece(6.9, 2.0, 0, (put) => {
      put(new THREE.CylinderGeometry(0.75, 0.75, 0.06, 20), wood, 0, 0.75, 0); put(new THREE.CylinderGeometry(0.08, 0.12, 0.72, 8), woodD, 0, 0.36, 0); put(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 12), woodD, 0, 0.02, 0);
      put(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 10), can, -0.2, 0.85, -0.1); put(new THREE.PlaneGeometry(0.4, 0.3).rotateX(-Math.PI / 2), paper, 0.15, 0.785, 0.2, 0, 0.4, 0);
    });
    col(6.9, 2.0, 1.5, 1.5, 0.8);
    for (const [a, tip] of [[2.6, 0], [0.9, 0], [-1.1, 0.12]]) {
      const cx = 6.9 + Math.sin(a) * 1.0, cz = 2.0 + Math.cos(a) * 1.0;
      piece(cx, cz, a + Math.PI, (put) => {
        put(new THREE.BoxGeometry(0.45, 0.05, 0.45), wood, 0, 0.45, 0, tip, 0, 0);
        for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) put(new THREE.BoxGeometry(0.04, 0.45, 0.04), woodD, x, 0.22, z);
        put(new THREE.BoxGeometry(0.45, 0.5, 0.04), woodD, 0, 0.72, -0.2, -0.1 + tip, 0, 0);
      });
      col(cx, cz, 0.5, 0.5, 0.9);
    }
    // papers, cans and stains scattered over the floor
    for (let i = 0; i < 16; i++) { const x = (r() - 0.5) * (W - 2), z = (r() - 0.5) * (D - 2); if (Math.abs(x) < 4 && Math.abs(z) < 2.5) continue; add(new THREE.PlaneGeometry(0.3, 0.22).rotateX(-Math.PI / 2), paper, x, 0.02, z, r() * 3, 'Detail'); }
    for (let i = 0; i < 5; i++) add(new THREE.CylinderGeometry(0.04, 0.04, 0.13, 8).rotateZ(Math.PI / 2), can, (r() - 0.5) * (W - 2), 0.04, (r() - 0.5) * (D - 2), r() * 3, 'Detail');

    // --- decay and clutter (2026-11-20: "more run down", "not enough detail")
    // holes kicked through the plaster down to the lath and studs
    for (const [x, y, wd, ht, side] of [[-2.2, 1.0, 0.9, 0.7, 'b'], [6.0, 1.9, 0.7, 0.5, 'b'], [-W / 2, 1.2, 0.8, 0.6, 'l'], [W / 2, 0.8, 1.0, 0.7, 'r']]) {
      const g2 = new THREE.Group(); g2.name = 'Detail'; root.add(g2);
      if (side === 'b') g2.position.set(x, y, -D / 2 + 0.02); else { g2.position.set(x + (side === 'l' ? 0.02 : -0.02), y, side === 'l' ? 0.6 : -0.6); g2.rotation.y = side === 'l' ? Math.PI / 2 : -Math.PI / 2; }
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.5, 9), cmpMat(0x0e0a08)); hole.scale.set(wd, ht, 1); g2.add(hole);
      for (let k = -2; k <= 2; k++) { const lath = new THREE.Mesh(new THREE.BoxGeometry(wd * 0.9, 0.04, 0.02), cmpMat(0x6a4a2a)); lath.position.set(0, k * ht * 0.18, 0.01); lath.rotation.z = (r() - 0.5) * 0.1; g2.add(lath); }
      const stud = new THREE.Mesh(new THREE.BoxGeometry(0.08, ht * 0.9, 0.03), cmpMat(0x5a3a22)); stud.position.set(wd * 0.15, 0, 0.005); g2.add(stud);
      g2.traverse((o) => { o.name = 'Detail'; });
      // plaster chunks fallen below it
      const px = side === 'b' ? x : x + (side === 'l' ? 0.4 : -0.4), pz = side === 'b' ? -D / 2 + 0.4 : (side === 'l' ? 0.6 : -0.6);
      for (let k = 0; k < 6; k++) add(new THREE.DodecahedronGeometry(0.05 + r() * 0.07, 0), cmpMat(0xd8ccb4), px + (r() - 0.5) * 0.7, 0.04, pz + (r() - 0.5) * 0.5, r() * 3, 'Detail');
    }
    // wallpaper peeling off in strips from the top of the walls
    for (let i = 0; i < 10; i++) {
      const onBack = i < 6, x = onBack ? -8 + r() * 16 : (i % 2 ? -1 : 1) * (W / 2 - 0.02), z = onBack ? -D / 2 + 0.05 : -4 + r() * 8, L = 0.5 + r() * 0.9;
      const st = add(new THREE.PlaneGeometry(0.28 + r() * 0.2, L, 1, 4), cmpMat(0xb8a888, wallTex, 0, [0.3, 0.4]), x, H - L / 2 - 0.05, z, onBack ? 0 : (x < 0 ? Math.PI / 2 : -Math.PI / 2), 'Detail');
      const P = st.geometry.attributes.position; for (let k = 0; k < P.count; k++) { const t = (L / 2 - P.getY(k)) / L; P.setZ(k, t * t * 0.35); } st.geometry.computeVertexNormals(); st.material.side = THREE.DoubleSide;
    }
    // the blood on the walls: a smear and a handprint by the hallway, spatter by the couch
    { const bt = cmpCanvas(256, 256, (g) => { g.fillStyle = 'rgba(90,6,10,0.85)'; g.beginPath(); g.ellipse(70, 150, 22, 26, 0, 0, TAU); g.fill(); for (let f = 0; f < 4; f++) g.fillRect(52 + f * 11, 96, 7, 40 + (f === 1 || f === 2 ? 8 : 0)); g.fillRect(88, 140, 22, 9); // a handprint
        const gr = g.createLinearGradient(130, 60, 230, 250); gr.addColorStop(0, 'rgba(90,6,10,0.85)'); gr.addColorStop(1, 'rgba(90,6,10,0)'); g.strokeStyle = gr; g.lineWidth = 28; g.lineCap = 'round'; g.beginPath(); g.moveTo(150, 70); g.quadraticCurveTo(170, 160, 200, 240); g.stroke(); // a smear dragged down
        for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(90,6,10,0.8)'; g.fillRect(140 + r() * 70, 80 + r() * 60, 3, 20 + r() * 60); } });
      const bm = cmpMat(0xffffff, bt); bm.transparent = true; bm.alphaTest = 0.1;
      add(new THREE.PlaneGeometry(1.4, 1.4), bm, 1.9, 1.2, -D / 2 + 0.03, 0, 'Detail');
      const sp = cmpCanvas(128, 128, (g) => { for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${80 + r() * 30},6,10,0.8)`; g.beginPath(); g.arc(64 + (r() - 0.5) * 100, 64 + (r() - 0.5) * 80, 1 + r() * 5, 0, TAU); g.fill(); } });
      const sm = cmpMat(0xfffffe, sp); sm.transparent = true; sm.alphaTest = 0.1;
      add(new THREE.PlaneGeometry(1.2, 1.0), sm, -1.6, 1.4, -D / 2 + 0.03, 0, 'Detail'); }
    // cobwebs in the corners
    { const cw = cmpCanvas(128, 128, (g) => { g.strokeStyle = 'rgba(230,230,230,0.6)'; g.lineWidth = 1; for (let a = 0; a < 7; a++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a / 6 * Math.PI / 2) * 128, Math.sin(a / 6 * Math.PI / 2) * 128); g.stroke(); } for (let rr = 18; rr < 128; rr += 16) { g.beginPath(); for (let a = 0; a <= 6; a++) { const q = rr * (0.9 + r() * 0.2); g.lineTo(Math.cos(a / 6 * Math.PI / 2) * q, Math.sin(a / 6 * Math.PI / 2) * q); } g.stroke(); } });
      const cm = cmpMat(0xffffff, cw); cm.transparent = true; cm.alphaTest = 0.05; cm.side = THREE.DoubleSide;
      for (const [x, ry] of [[-W / 2 + 0.03, 0], [W / 2 - 0.03, -Math.PI / 2]]) { const c = add(new THREE.PlaneGeometry(0.9, 0.9), cm, x + (ry ? -0.45 : 0.45), H - 0.45, -D / 2 + 0.05, 0, 'Detail'); if (ry) c.scale.x = -1; } }
    // stuffing spilling out of the couch and the armchairs
    for (const [x, y, z] of [[-1.6, 0.74, -1.65], [0.9, 0.74, -1.75], [1.7, 0.74, -2.05], [-3.0, 0.7, 1.6], [2.6, 0.7, 1.7], [-2.1, 0.5, -1.4]]) for (let k = 0; k < 3; k++) add(new THREE.IcosahedronGeometry(0.06 + r() * 0.05, 0), cmpMat(0xe8e0c8), x + (r() - 0.5) * 0.2, y + r() * 0.05, z + (r() - 0.5) * 0.2, 0, 'Detail');
    // a fallen picture frame with its glass smashed, the empty nail above it
    piece(-8.5, -2.6, Math.PI / 2 + 0.3, (put) => { put(new THREE.BoxGeometry(0.5, 0.04, 0.4), cmpMat(0x3a2418), 0, 0.03, 0, -0.1); put(new THREE.PlaneGeometry(0.4, 0.3).rotateX(-Math.PI / 2), cmpMat(0x5a4a6a), 0, 0.055, 0); for (let k = 0; k < 6; k++) put(new THREE.CircleGeometry(0.05, 3).rotateX(-Math.PI / 2), cmpMat(0xa8c0c8, null, 0x203038), (r() - 0.5) * 0.9, 0.02, (r() - 0.5) * 0.8, 0, r() * 3, 0); });
    // pizza boxes, beer bottles, a pile of clothes, a stack of old newspapers, a kid's ball, a clown doll
    for (const [x, z, ry, open] of [[1.6, 3.4, 0.4, true], [-5.8, 4.4, -0.3, false], [-5.75, 4.4, -0.1, false]]) piece(x, z, ry, (put) => { put(new THREE.BoxGeometry(0.45, 0.05, 0.45), cmpMat(0xc8b088), 0, open ? 0.025 : 0.025 + (x < -5.7 ? 0.05 : 0), 0); if (open) { put(new THREE.PlaneGeometry(0.45, 0.45), cmpMat(0xc8b088), 0, 0.25, -0.23, -0.2); put(new THREE.CircleGeometry(0.18, 10).rotateX(-Math.PI / 2), cmpMat(0x8a3a1a), 0, 0.055, 0); } });
    for (let i = 0; i < 8; i++) { const x = (r() - 0.5) * (W - 3), z = (r() - 0.5) * (D - 3); if (Math.abs(x) < 3 && z > -2.5 && z < 1.5) continue; add(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 7).rotateZ(r() < 0.6 ? Math.PI / 2 : 0), cmpMat(r() < 0.5 ? 0x3a5a2a : 0x6a4a1a, null, 0x101408), x, r() < 0.6 ? 0.035 : 0.12, z, r() * 3, 'Detail'); }
    for (let k = 0; k < 7; k++) add(new THREE.IcosahedronGeometry(0.16 + r() * 0.1, 1), cmpMat([0x3a3a52, 0x5a2a2a, 0x8a8a7a, 0x2a3a2a][k % 4]), 7.6 + (r() - 0.5) * 0.7, 0.1, 4.6 + (r() - 0.5) * 0.6, r() * 3, 'Detail');
    for (let k = 0; k < 6; k++) add(new THREE.BoxGeometry(0.42, 0.04, 0.32), cmpMat(k % 2 ? 0xd0c8b0 : 0xc0b89e), 7.9, 0.02 + k * 0.04, 0.6, (r() - 0.5) * 0.3, 'Detail');
    add(new THREE.SphereGeometry(0.16, 12, 8), cmpMat(0xc8301a), 3.4, 0.16, 4.1); col(3.4, 4.1, 0.3, 0.3, 0.3);
    piece(8.3, -1.8, -Math.PI / 2, (put) => { // a clown doll slumped against the wall
      put(new THREE.SphereGeometry(0.16, 10, 8), cmpMat(0xc8301a), 0, 0.16, 0); put(new THREE.SphereGeometry(0.11, 10, 8), cmpMat(0xece4d6), 0, 0.38, 0.02, 0.2); put(new THREE.SphereGeometry(0.03, 6, 4), cmpMat(0xd81a1a), 0, 0.39, 0.13);
      put(new THREE.ConeGeometry(0.09, 0.18, 8), cmpMat(0x3a6ac8), 0, 0.55, 0, 0.3); for (const s of [-1, 1]) { put(new THREE.SphereGeometry(0.07, 6, 4), cmpMat(0xf0b030), s * 0.11, 0.42, -0.03); put(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 6), cmpMat(0xe8e0d0), s * 0.18, 0.12, 0.05, 0, 0, s * 1.2); }
    });
    // an extension cord from the TV across the floor to the wall, a dead ceiling-light fixture fallen by the couch
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-6.0, 0.02, -0.7], [-5.2, 0.02, 0.6], [-6.6, 0.02, 1.4], [-8.6, 0.02, 1.0]].map((q) => new THREE.Vector3(...q))), 20, 0.015, 4), cmpMat(0x141414), 0, 0, 0, 0, 'Detail');
    piece(3.6, -0.4, 0.5, (put) => { put(new THREE.SphereGeometry(0.25, 12, 6, 0, TAU, 0, Math.PI / 2), cmpMat(0xd8d0b8), 0, 0.02, 0, Math.PI); for (let k = 0; k < 5; k++) put(new THREE.CircleGeometry(0.06, 3).rotateX(-Math.PI / 2), cmpMat(0xd8d0b8), (r() - 0.5) * 0.9, 0.015, (r() - 0.5) * 0.9, 0, r() * 3, 0); });
    // a torn circus poster on the left wall (a grinning clown, no words)
    { const pc = cmpCanvas(128, 180, (g, w, h) => { g.fillStyle = '#e8d8b8'; g.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#b8201a' : '#e8d8b8'; g.beginPath(); g.moveTo(w / 2, 40); g.lineTo(i * 16, h); g.lineTo(i * 16 + 16, h); g.fill(); } drawClown(g, w / 2, 60, 34); grime(g, w, h, 20, 0.5); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(w, h * 0.55); g.lineTo(w * 0.6, h); g.lineTo(w, h); g.fill(); });
      const pm = cmpMat(0xffffff, pc); pm.transparent = true; pm.alphaTest = 0.3; add(new THREE.PlaneGeometry(0.7, 1.0), pm, -W / 2 + 0.05, 1.5, 3.6, Math.PI / 2, 'Detail'); }

    // the bounds just inside the walls (a backstop)
    for (const [x, z, w, d] of [[0, HOUSE_B.minZ - 0.5, W + 2, 1], [0, HOUSE_B.maxZ + 0.5, W + 2, 1], [HOUSE_B.minX - 0.5, 0, 1, D + 2], [HOUSE_B.maxX + 0.5, 0, 1, D + 2]]) { boxes.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2, -1, 4]); addBoxCol(x, z, w, d, -1, 4); }

    const before = MAP.cells.length;
    mergeStatics(root, group, new Map());
    MAP.cells.splice(before);
    // warm and cold pools of light (lamp, TV, windows), one instanced draw
    const poolMat = new THREE.MeshBasicMaterial({ map: TEX.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.7 });
    const PM = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), poolMat, pools.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pv = new THREE.Vector3(), c = new THREE.Color();
    pools.forEach(([x, z, rad, col2], i) => { PM.setMatrixAt(i, m4.compose(pv.set(x, 0.05, z), q.identity(), sc.set(rad * 2, 1, rad * 2))); PM.setColorAt(i, c.setHex(col2)); });
    PM.frustumCulled = false; PM.renderOrder = 2; fx.add(PM);
    group.add(fx);
    HOUSE.boxes = boxes;
  });
  for (const k of Object.keys(BLOOD.kinds || {})) worlds.house.objects.push(BLOOD.kinds[k].mesh);
  HOUSE.nav = navFromBoxes(HOUSE.boxes, [], HOUSE_B, () => 0);
  HOUSE.built = true;
}

// The TV's static, a few frames a second.
function updateHouse(dt) {
  if (WORLD.id !== 'house' || !HOUSE.tv) return;
  const T = HOUSE.tv; T.t += dt;
  if (T.t < 0.08) return;
  T.t = 0;
  const g = T.g, img = g.createImageData(64, 48), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255; d[i] = v * 0.85; d[i + 1] = v * 0.9; d[i + 2] = v; d[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  g.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = (Date.now() / 40) % 6; y < 48; y += 6) g.fillRect(0, y, 64, 2);
  T.tex.needsUpdate = true;
}

// Bobbert is down: the house's front door is the way on.
function openHouseDoor() {
  game.phase = 'exit';
  game.exitAt = SUB.door.clone();
  setWaypoint(game.exitAt, { label: 'Go into the house', h: 3.2 });
}
function checkHouseEnter() {
  if (game.phase !== 'exit' || game.area !== 'suburb' || !game.exitAt || HOUSE.going) return;
  if (Math.hypot(player.pos.x - game.exitAt.x, player.pos.z - game.exitAt.z) > 2.4) return;
  HOUSE.going = true;
  SUB_FADE.style.opacity = 1;
  setTimeout(() => { enterHouse(); SUB_FADE.style.opacity = 0; HOUSE.going = false; }, 480);
}
function enterHouse() {
  buildHouse();
  for (const d of drops.slice()) if (d.kind !== 'item') { tryAutoPickup(d); removeDrop(d); } // what's left on the ground comes along
  clearStageWorld();
  bloodClearFights(); // (the cul-de-sac's fight stains don't follow you in)
  switchWorld('house');
  navInit(...HOUSE.nav);
  game.area = 'house'; game.exitAt = null;
  respawnAt(HOUSE.spawn, 0);
  // (what happens in the house is OPEN; for now getting in clears the stage)
  stageCleared();
  savePlayer();
}
