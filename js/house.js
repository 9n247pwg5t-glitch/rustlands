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
      for (let i = 0; i < 40; i++) { const x = r() * w, y = r() * h, rr = 8 + r() * 30, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(${r() < 0.3 ? '50,4,8' : '14,8,6'},0.55)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); } // stains
      for (let i = 0; i < 9; i++) { const x = r() * w, y = r() * h; g.fillStyle = 'rgba(6,4,4,0.9)'; g.beginPath(); for (let k = 0; k <= 9; k++) { const a = k / 9 * TAU, q = (5 + r() * 8) * (0.6 + r() * 0.5); g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.fill(); } // holes in the boards
      const vg = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.62); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)'); g.fillStyle = vg; g.fillRect(0, 0, w, h); // darker toward the walls
    });
    const wallTex = cmpCanvas(256, 256, (g, w, h) => {
      g.fillStyle = '#b8a888'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(120,96,70,0.35)'; g.fillRect(x, 0, 12, h); g.fillStyle = 'rgba(90,70,50,0.25)'; for (let y = 8; y < h; y += 28) { g.beginPath(); g.arc(x + 22, y, 4, 0, TAU); g.fill(); } } // stripes and little motifs
      for (let i = 0; i < 14; i++) { const x = r() * w, y = r() * h * 0.5, L = 40 + r() * 150, gr = g.createLinearGradient(0, y, 0, y + L); gr.addColorStop(0, 'rgba(90,64,30,0.35)'); gr.addColorStop(1, 'rgba(90,64,30,0)'); g.fillStyle = gr; g.fillRect(x, y, 6 + r() * 26, L); } // water stains
      for (let i = 0; i < 3; i++) { const x = r() * w, y = r() * h, rw = 8 + r() * 18, rh = 6 + r() * 12; g.fillStyle = '#9a8a74'; g.beginPath(); g.ellipse(x, y, rw, rh, r(), 0, TAU); g.fill(); g.strokeStyle = 'rgba(240,230,210,0.7)'; g.lineWidth = 1.5; g.stroke(); } // peeled to the plaster
      grime(g, w, h, 30, 0.3);
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
      for (const s of [-1, 1]) add(new THREE.PlaneGeometry(0.5, 1.2), cmpMat(0xe0d8c0), wx + s * 0.62, 1.6, -D / 2 + 0.1, 0, 'Detail');
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
      put(new THREE.CylinderGeometry(0.18, 0.3, 0.32, 12, 1, true), cmpMat(0xe8d8a8, null, 0x6a5020), 0, 1.68, 0).material.side = THREE.DoubleSide;
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
    for (const [a, tip] of [[2.6, 0], [0.9, 0], [-1.1, 0.25]]) {
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
  switchWorld('house');
  navInit(...HOUSE.nav);
  game.area = 'house'; game.exitAt = null;
  respawnAt(HOUSE.spawn, 0);
  // (what happens in the house is OPEN; for now getting in clears the stage)
  stageCleared();
  savePlayer();
}
