'use strict';
// Detail builders for the boss's cul-de-sac (js/suburb.js; 2026-11-16, "still way too blocky, more
// detail"): fine textures (clapboard siding, 3-tab shingles, slab sidewalks, graffiti tags, a grit
// map for the road up close), shaped props instead of boxes (jersey barriers with their sloped
// profile, ribbed and dented oil drums, lattice truss, curved cobra-head street lamps, cars and a van
// with real profiles, wheels, glass and lights, branching trees), gable-roof pieces for the houses, and
// instanced litter (cans, bottles, paper, leaves, glass, rubble) in a handful of draws.
// Everything here is static and merged by suburb.js, except the litter (instanced, in its fx group).

const SUBD = {};

function subTextures() {
  if (SUBD.tex) return SUBD.tex;
  const rng = makeRng(777), r = () => rng();
  const T = {};
  // clapboard siding: boards with a shadow under each lap, a lit top edge, paint peeling to grey wood,
  // water streaks, mildew along the bottom (white, so each house's colour tints it)
  T.siding = cmpCanvas(256, 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      const v = 236 + r() * 19; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, w, 16);
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, y + 13, w, 3);
      g.fillStyle = 'rgba(0,0,0,0.1)'; g.fillRect(0, y + 10, w, 3);
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(0, y, w, 1);
      for (let x = r() * 120; x < w; x += 90 + r() * 120) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y, 1, 13); } // butt joints
    }
    for (let i = 0; i < 26; i++) { // peeling paint
      const x = r() * w, y = r() * h, rw = 6 + r() * 30, rh = 3 + r() * 9;
      g.fillStyle = 'rgba(120,110,100,0.75)'; g.beginPath(); g.ellipse(x, y, rw, rh, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1; g.stroke();
    }
    for (let i = 0; i < 30; i++) { const x = r() * w, y = r() * h * 0.6, len = 30 + r() * 120; const gr = g.createLinearGradient(0, y, 0, y + len); gr.addColorStop(0, 'rgba(60,50,40,0.35)'); gr.addColorStop(1, 'rgba(60,50,40,0)'); g.fillStyle = gr; g.fillRect(x, y, 2 + r() * 4, len); }
    const gr = g.createLinearGradient(0, h * 0.7, 0, h); gr.addColorStop(0, 'rgba(50,60,30,0)'); gr.addColorStop(1, 'rgba(50,60,30,0.55)'); g.fillStyle = gr; g.fillRect(0, h * 0.7, w, h * 0.3);
  });
  T.siding.wrapS = T.siding.wrapT = THREE.RepeatWrapping;
  // 3-tab asphalt shingles: rows with tab slots, tone varying per tab, moss, black algae streaks
  // running down the slope, missing tabs showing felt, a patch of newer shingles
  T.roof = cmpCanvas(256, 256, (g, w, h) => {
    g.fillStyle = '#2a2628'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 12) {
      const off = (y / 12) % 2 ? 16 : 0;
      for (let x = -32 + off; x < w; x += 32) {
        const v = 52 + r() * 34, missing = r() < 0.03;
        g.fillStyle = missing ? '#121014' : `rgb(${v + 4},${v - 2},${v + 2})`; g.fillRect(x + 1, y, 31, 11);
        if (!missing) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + 1, y + 9, 31, 2); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x + 1, y, 31, 2); }
        for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(${r() < 0.5 ? '20,18,20' : '120,110,110'},0.4)`; g.fillRect(x + r() * 30, y + r() * 10, 1, 1); } // granules
      }
    }
    for (let i = 0; i < 12; i++) { const x = r() * w, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(10,10,10,0)'); gr.addColorStop(1, 'rgba(10,10,10,0.45)'); g.fillStyle = gr; g.fillRect(x, r() * 60, 6 + r() * 16, h); }
    for (let i = 0; i < 9; i++) { const x = r() * w, y = r() * h, rr = 8 + r() * 24, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(70,90,40,0.7)'); gr.addColorStop(1, 'rgba(70,90,40,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    g.fillStyle = 'rgba(110,100,90,0.35)'; g.fillRect(150, 96, 64, 36);
  });
  T.roof.wrapS = T.roof.wrapT = THREE.RepeatWrapping;
  // sidewalk: a strip of concrete slabs (4 along by 2 across) with joints, cracks, a broken corner,
  // stains, weeds in the joints; u runs along the walk (5.2 m a tile), v across it (2.6 m)
  T.walk = cmpCanvas(512, 256, (g, w, h) => {
    g.fillStyle = '#8a847a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) { const v = 100 + r() * 70; g.fillStyle = `rgba(${v},${v * 0.96},${v * 0.9},0.35)`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
    for (let sx = 0; sx < 4; sx++) for (let sy = 0; sy < 2; sy++) {
      const x0 = sx * 128, y0 = sy * 128, t = r();
      g.fillStyle = `rgba(${t < 0.5 ? '255,250,240' : '30,26,22'},${0.04 + r() * 0.08})`; g.fillRect(x0, y0, 128, 128);
      if (r() < 0.5) { g.strokeStyle = 'rgba(30,26,22,0.7)'; g.lineWidth = 1.2; g.beginPath(); let x = x0 + r() * 128, y = y0; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 40; y += 22; g.lineTo(x, Math.min(y, y0 + 128)); } g.stroke(); }
      if (r() < 0.25) { g.fillStyle = 'rgba(40,36,30,0.85)'; g.beginPath(); g.moveTo(x0 + 128, y0 + 128); g.lineTo(x0 + 128 - 20 - r() * 20, y0 + 128); g.lineTo(x0 + 128, y0 + 128 - 20 - r() * 20); g.fill(); }
      if (r() < 0.4) { const x = x0 + r() * 128, y = y0 + r() * 128, rr = 10 + r() * 25, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(30,24,20,0.5)'); gr.addColorStop(1, 'rgba(30,24,20,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    }
    g.fillStyle = 'rgba(30,26,22,0.8)'; for (let x = 0; x <= w; x += 128) g.fillRect(x - 1, 0, 3, h); g.fillRect(0, 127, w, 3); g.fillRect(0, 0, w, 2); g.fillRect(0, h - 2, w, 2);
    for (let i = 0; i < 260; i++) { const onX = r() < 0.6, x = onX ? Math.round(r() * 4) * 128 + (r() - 0.5) * 4 : r() * w, y = onX ? r() * h : (r() < 0.5 ? 128 : (r() < 0.5 ? 2 : h - 2)) + (r() - 0.5) * 4; g.strokeStyle = `rgba(${70 + r() * 40},${90 + r() * 40},${30 + r() * 20},0.9)`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 8, y + (r() - 0.5) * 8); g.stroke(); }
  });
  T.walk.wrapS = T.walk.wrapT = THREE.RepeatWrapping;
  // graffiti tags (alpha-tested): scribbled letters-ish shapes and a little clown face, no words
  T.tags = cmpCanvas(256, 128, (g, w, h) => {
    const cols = ['#e83a8a', '#3ae8d0', '#f0d020', '#e84a2a', '#a8f040', '#ffffff'];
    for (let t = 0; t < 4; t++) {
      const cx = 32 + t * 64, cy = 64; g.strokeStyle = cols[Math.floor(r() * cols.length)]; g.lineWidth = 4 + r() * 3; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); let x = cx - 26, y = cy + (r() - 0.5) * 20; g.moveTo(x, y);
      for (let k = 0; k < 10; k++) { x += 5 + r() * 3; y = cy + (r() - 0.5) * 50; g.quadraticCurveTo(x - 6, cy + (r() - 0.5) * 60, x, y); }
      g.stroke(); g.lineWidth = 2; g.strokeStyle = '#111'; g.stroke();
      for (let k = 0; k < 4; k++) { g.fillStyle = g.strokeStyle; g.fillRect(cx - 20 + r() * 40, cy + 20, 2, 8 + r() * 20); }
    }
  });
  // a fine grain multiplied over the road up close (grey around 0.5)
  T.grit = cmpCanvas(128, 128, (g) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1400; i++) { const v = 60 + r() * 110; g.fillStyle = `rgb(${v},${v},${v})`; const s = 0.6 + r() * 2; g.beginPath(); g.arc(r() * 128, r() * 128, s, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(40,40,40,0.5)'; for (let i = 0; i < 8; i++) { g.beginPath(); let x = r() * 128, y = r() * 128; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 24; y += (r() - 0.5) * 24; g.lineTo(x, y); } g.stroke(); }
  });
  T.grit.wrapS = T.grit.wrapT = THREE.RepeatWrapping;
  // a vent/AC grille
  T.grill = cmpCanvas(64, 64, (g, w, h) => { g.fillStyle = '#9a9a96'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a3a3a'; for (let y = 4; y < h; y += 6) g.fillRect(4, y, w - 8, 3); grime(g, w, h, 8, 0.4); });
  return (SUBD.tex = T);
}

// A jersey barrier (2.4 m): the real stepped profile, stripes running along it.
function subJerseyGeo() {
  if (SUBD.jersey) return SUBD.jersey;
  const s = new THREE.Shape();
  const pts = [[-0.3, 0], [0.3, 0], [0.3, 0.08], [0.2, 0.25], [0.09, 0.8], [-0.09, 0.8], [-0.2, 0.25], [-0.3, 0.08]];
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: 2.3, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.02, bevelSegments: 1 });
  g.translate(0, 0, -1.15); g.rotateY(Math.PI / 2);
  const P = g.attributes.position, U = g.attributes.uv;
  for (let i = 0; i < P.count; i++) U.setXY(i, P.getX(i) / 2.4 + 0.5 + P.getZ(i) * 0.3, P.getY(i) / 0.8);
  g.computeVertexNormals();
  return (SUBD.jersey = g);
}

// An oil drum: rolling hoops, a rim, dents (three dent patterns); open ones burn (a dark inside).
function subDrumGeo(k, open) {
  const key = 'drum' + k + (open ? 'o' : '');
  if (SUBD[key]) return SUBD[key];
  const p = [], R = 0.31;
  const prof = [[0.0, 0], [0.29, 0], [R, 0.025], [R, 0.21], [R + 0.016, 0.225], [R, 0.24], [R, 0.46], [R + 0.016, 0.475], [R, 0.49], [R, 0.71], [R + 0.016, 0.725], [R, 0.74], [R, 0.93], [R + 0.02, 0.945], [R - 0.005, 0.955]];
  if (open) prof.push([R - 0.03, 0.94], [R - 0.03, 0.4], [0, 0.4]); else prof.push([R - 0.03, 0.94], [0, 0.94]);
  for (const [x, y] of prof) p.push(new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(p, 14);
  const rng = makeRng(31 + k), P = g.attributes.position, dents = [0, 1, 2].map(() => [rng() * TAU, 0.15 + rng() * 0.7, 0.03 + rng() * 0.05]);
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), a = Math.atan2(z, x), rr = Math.hypot(x, z);
    if (rr < 0.2) continue;
    let s = 1; for (const [da, dy, dd] of dents) { const d = Math.abs(Math.atan2(Math.sin(a - da), Math.cos(a - da))); s -= dd * Math.max(0, 1 - d / 0.6) * Math.max(0, 1 - Math.abs(y - dy) / 0.22); }
    P.setXYZ(i, x * s, y, z * s);
  }
  g.computeVertexNormals();
  return (SUBD[key] = g);
}

// A square lattice truss along +y (towers) of length L: four chords, rungs, zig-zag braces. Added
// as small 'Detail' meshes to `parent` at (x, y, z), turned by (rx, ry, rz) (merged later).
function subTruss(parent, mat, L, x, y, z, rx = 0, ry = 0, rz = 0, s = 0.42) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(rx, ry, rz); g.name = 'Detail'; parent.add(g);
  const h = s / 2, chord = new THREE.CylinderGeometry(0.035, 0.035, L, 6, 1, true);
  for (const [cx, cz] of [[-h, -h], [h, -h], [h, h], [-h, h]]) { const m = new THREE.Mesh(chord, mat); m.position.set(cx, L / 2, cz); g.add(m); }
  const n = Math.max(1, Math.round(L / 0.55)), step = L / n, diag = Math.hypot(step, s), ang = Math.atan2(s, step);
  const brace = new THREE.CylinderGeometry(0.016, 0.016, diag, 4, 1, true), rung = new THREE.CylinderGeometry(0.016, 0.016, s, 4, 1, true);
  for (let i = 0; i < n; i++) {
    const y0 = i * step, flip = i % 2 ? 1 : -1;
    for (let f = 0; f < 4; f++) {
      const a = f * Math.PI / 2, face = new THREE.Group(); face.rotation.y = a; g.add(face);
      const b = new THREE.Mesh(brace, mat); b.position.set(0, y0 + step / 2, h); b.rotation.z = ang * flip; face.add(b);
      const rg = new THREE.Mesh(rung, mat); rg.position.set(0, y0, h); rg.rotation.z = Math.PI / 2; face.add(rg);
    }
  }
  g.traverse((o) => { o.name = 'Detail'; });
  return g;
}

// A cobra-head street lamp: a tapered pole on a flanged base, a curved arm, the head, a lit lens.
function subLamp(parent, x, z, dirx, dirz, poleM, headM, lensM) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(dirx, dirz); g.name = 'prop'; parent.add(g);
  const m = (geo, mat, px, py, pz) => { const o = new THREE.Mesh(geo, mat); o.position.set(px, py, pz); g.add(o); return o; };
  m(new THREE.CylinderGeometry(0.28, 0.32, 0.25, 10), poleM, 0, 0.12, 0);
  m(new THREE.CylinderGeometry(0.08, 0.15, 6.2, 10), poleM, 0, 3.3, 0);
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 6.2, 0), new THREE.Vector3(0, 7.0, 0.4), new THREE.Vector3(0, 6.9, 1.9));
  m(new THREE.TubeGeometry(curve, 10, 0.05, 6), poleM, 0, 0, 0);
  const head = m(new THREE.SphereGeometry(0.4, 12, 6, 0, TAU, 0, Math.PI / 2), headM, 0, 6.82, 2.15); head.scale.set(0.55, 0.4, 1);
  const lens = m(new THREE.CircleGeometry(0.36, 12).rotateX(Math.PI / 2), lensM, 0, 6.8, 2.15); lens.scale.set(0.5, 1, 0.92);
  m(new THREE.BoxGeometry(0.22, 0.32, 0.12), poleM, 0, 2.2, 0.12); // a hand-hole box
  g.traverse((o) => { o.name = 'prop'; });
  return g;
}

// A car or the van, from a side profile (extruded, bevelled), with glass on every side, a
// windshield, wheels with rims in dark arches, bumpers, lights, mirrors. kind: 'sedan' | 'van'.
// burned: blackened, the glass gone.
function subVehicle(parent, kind, x, z, ry, color, burned, mats, opts = {}) {
  const g = new THREE.Group(); g.position.set(x, opts.lift || 0, z); g.rotation.y = ry; g.name = 'prop'; parent.add(g);
  const m = (geo, mat, px, py, pz, rx = 0, ryy = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(px, py, pz); o.rotation.set(rx, ryy, rz); g.add(o); return o; };
  const van = kind === 'van', W = van ? 2.0 : 1.72, H0 = 0.32;
  const prof = van
    ? [[-2.45, H0], [2.45, H0], [2.5, 0.85], [2.35, 1.15], [1.95, 1.28], [1.55, 2.1], [1.35, 2.22], [-2.4, 2.25], [-2.5, 2.1]]
    : [[-2.2, H0], [2.2, H0], [2.25, 0.72], [2.05, 0.86], [0.95, 0.94], [0.4, 1.36], [-0.95, 1.38], [-1.65, 0.98], [-2.2, 0.92], [-2.27, 0.6]];
  const s = new THREE.Shape(); prof.forEach(([a, b], i) => (i ? s.lineTo(a, b) : s.moveTo(a, b)));
  const body = new THREE.ExtrudeGeometry(s, { depth: W - 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 });
  body.translate(0, 0, -(W - 0.12) / 2);
  const P = body.attributes.position, U = body.attributes.uv; for (let i = 0; i < P.count; i++) U.setXY(i, P.getX(i) / 2 + P.getZ(i) * 0.3, P.getY(i) / 2);
  body.rotateY(-Math.PI / 2); // length along local z (front at +z)
  const bodyM = burned ? mats.burnt : mats.paint(color);
  m(body, bodyM, 0, 0, 0);
  const glass = burned ? mats.hole : mats.glass, half = W / 2 + 0.005;
  // side glass: the greenhouse outline, a little inside the profile
  const gl = van ? [[1.85, 1.3], [1.5, 2.05], [0.4, 2.08], [0.4, 1.35]] : [[0.88, 0.98], [0.38, 1.32], [-0.92, 1.33], [-1.5, 0.99]];
  const gs = new THREE.Shape(); gl.forEach(([a, b], i) => (i ? gs.lineTo(a, b) : gs.moveTo(a, b)));
  for (const sd of [-1, 1]) { const sg = new THREE.ShapeGeometry(gs); sg.rotateY(-Math.PI / 2); m(sg, glass, sd * half, 0, 0); }
  if (van) for (const sd of [-1, 1]) m(new THREE.PlaneGeometry(1.4, 0.6), glass, sd * half, 1.75, -0.6, 0, sd * Math.PI / 2); // a rear side window
  // windshield and rear window: quads along the sloped segments
  const quad = (a, b, w, mat) => { const [az, ay] = a, [bz, by] = b, L = Math.hypot(bz - az, by - ay); m(new THREE.PlaneGeometry(w, L * 0.9), mat, 0, (ay + by) / 2 + 0.04, (az + bz) / 2 + 0.04 * Math.sign(az + bz), Math.atan2(bz - az, by - ay), 0, 0); };
  if (van) quad([1.95, 1.28], [1.55, 2.1], W - 0.3, glass); else { quad([0.95, 0.94], [0.4, 1.36], W - 0.25, glass); quad([-1.65, 0.98], [-0.95, 1.38], W - 0.3, glass); }
  // wheels: tyres, rims, dark arches
  const wz = van ? [1.6, -1.6] : [1.35, -1.35];
  for (const zz of wz) for (const sd of [-1, 1]) {
    m(new THREE.CircleGeometry(0.44, 12), mats.dark, sd * (half + 0.004), 0.36, zz, 0, sd * Math.PI / 2);
    if (opts.noWheels) { m(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8).rotateZ(Math.PI / 2), mats.dark, sd * (half - 0.2), 0.34, zz); continue; } // just the hubs
    m(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14).rotateZ(Math.PI / 2), mats.tyre, sd * (half - 0.08), 0.34, zz);
    m(new THREE.CylinderGeometry(0.19, 0.2, 0.03, 10).rotateZ(Math.PI / 2), burned ? mats.dark : mats.rim, sd * (half + 0.045), 0.34, zz);
  }
  // bumpers, lights, plate, mirrors, handles
  const L = van ? 2.5 : 2.27;
  for (const e of [-1, 1]) m(new THREE.BoxGeometry(W + 0.04, 0.16, 0.14), burned ? mats.dark : mats.chrome, 0, 0.42, e * (L + 0.04));
  for (const sd of [-1, 1]) {
    m(new THREE.BoxGeometry(0.34, 0.14, 0.04), burned ? mats.dark : mats.head, sd * (W / 2 - 0.3), van ? 0.95 : 0.66, L + 0.03);
    m(new THREE.BoxGeometry(0.3, 0.14, 0.04), burned ? mats.dark : mats.tail, sd * (W / 2 - 0.28), van ? 1.0 : 0.76, -L - 0.03);
    m(new THREE.BoxGeometry(0.06, 0.12, 0.18), mats.dark, sd * (half + 0.06), van ? 1.4 : 1.0, van ? 1.8 : 0.85);
    for (const zz of van ? [1.0] : [0.2, -0.7]) m(new THREE.BoxGeometry(0.02, 0.04, 0.16), mats.dark, sd * (half + 0.01), van ? 1.2 : 0.86, zz);
  }
  m(new THREE.PlaneGeometry(0.42, 0.14), mats.plate, 0, 0.6, -L - 0.07, 0, Math.PI, 0);
  g.traverse((o) => { o.name = 'prop'; });
  return g;
}

// A tree: dead (bare branching limbs) or scraggly (a few clumps of lumpy foliage).
function subTree(parent, x, z, h, leafy, rng, mats) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rng() * TAU; g.name = 'prop'; parent.add(g);
  const limb = (from, dir, len, r0, depth) => {
    const to = from.clone().addScaledVector(dir, len);
    const geo = new THREE.CylinderGeometry(r0 * 0.6, r0, len, 6, 1, true); geo.translate(0, len / 2, 0);
    const o = new THREE.Mesh(geo, mats.bark); o.position.copy(from); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); g.add(o);
    if (depth <= 0) { if (leafy) { const f = new THREE.Mesh(SUBD.leafGeo, mats.leaf[Math.floor(rng() * mats.leaf.length)]); f.position.copy(to); const sc = 0.9 + rng() * 0.8; f.scale.set(sc, sc * 0.75, sc); f.rotation.y = rng() * TAU; g.add(f); } return; }
    const n = depth > 1 ? 3 : 2 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
      const d = dir.clone().add(new THREE.Vector3((rng() - 0.5) * 1.6, 0.2 + rng() * 0.5, (rng() - 0.5) * 1.6)).normalize();
      limb(to, d, len * (0.55 + rng() * 0.2), r0 * 0.6, depth - 1);
    }
  };
  if (!SUBD.leafGeo) {
    const lg = new THREE.IcosahedronGeometry(1, 1), P = lg.attributes.position;
    for (let i = 0; i < P.count; i++) { const x0 = P.getX(i), y0 = P.getY(i), z0 = P.getZ(i), s = 1 + 0.22 * Math.sin(x0 * 5.1 + y0 * 3.7) * Math.cos(z0 * 4.3 - y0 * 2.1); P.setXYZ(i, x0 * s, y0 * s, z0 * s); }
    lg.computeVertexNormals(); SUBD.leafGeo = lg;
  }
  limb(new THREE.Vector3(0, 0, 0), new THREE.Vector3((rng() - 0.5) * 0.15, 1, (rng() - 0.5) * 0.15).normalize(), h * 0.42, 0.22 + h * 0.015, 3);
  g.traverse((o) => { o.name = 'prop'; });
  return g;
}

// A gable roof over a w (ridge length) x d (eave to eave) footprint, ridge `rise` above the eaves,
// built into `g` at (cx, baseY, cz) turned by ry: shingled slopes, ridge cap, fascia and rake
// boards, soffits, the gable-end triangles in the wall material.
function subGable(g, w, d, rise, cx, baseY, cz, ry, M) {
  const r = new THREE.Group(); r.position.set(cx, baseY, cz); r.rotation.y = ry; g.add(r);
  const put = (geo, mat, x, y, z, rx = 0, ryy = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ryy, rz); r.add(o); return o; };
  const hd = d / 2, ang = Math.atan2(rise, hd), ext = 0.35, L = Math.hypot(hd, rise) + ext, ov = 0.4, ca = Math.cos(ang), sa = Math.sin(ang);
  const wallHalf = M.wallHalf != null ? M.wallHalf : hd;
  for (const sz of [-1, 1]) {
    // the slope's middle, pushed out by half its thickness and down the slope by half the eave extension
    const cy = rise / 2 + 0.06 * ca - ext / 2 * sa, cz2 = sz * (hd / 2 + 0.06 * sa + ext / 2 * ca);
    put(new THREE.BoxGeometry(w + ov * 2, 0.12, L), M.roof, 0, cy, cz2, sz * ang);
    const ez = hd + ext * ca, ey = -ext * sa; // the eave's edge
    put(new THREE.BoxGeometry(w + ov * 2 + 0.04, 0.2, 0.05), M.trim, 0, ey - 0.04, sz * (ez + 0.02)); // fascia
    if (ez > wallHalf + 0.05) put(new THREE.PlaneGeometry(w + ov * 2, ez - wallHalf).rotateX(Math.PI / 2), M.soffit, 0, ey - 0.12, sz * (ez + wallHalf) / 2); // soffit
    for (const sx of [-1, 1]) put(new THREE.BoxGeometry(0.06, 0.22, L), M.trim, sx * (w / 2 + ov + 0.02), cy, cz2, sz * ang); // rake boards
  }
  put(new THREE.BoxGeometry(w + ov * 2 + 0.04, 0.12, 0.32), M.ridge, 0, rise + 0.13, 0); // ridge cap
  const base = Math.min(hd - 0.02, wallHalf), lift = rise * (1 - base / hd);
  const gs = new THREE.Shape(); gs.moveTo(-base, 0); gs.lineTo(base, 0); gs.lineTo(base, lift); gs.lineTo(0, rise); gs.lineTo(-base, lift); gs.lineTo(-base, 0);
  const gg = new THREE.ShapeGeometry(gs), uv = gg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 11, uv.getY(i) / 3.4);
  for (const sx of [-1, 1]) put(gg, M.wall, sx * (w / 2 + 0.01), -0.02, 0, 0, sx * Math.PI / 2);
  // a gable vent in each end
  for (const sx of [-1, 1]) put(new THREE.CircleGeometry(0.28, 3).rotateZ(Math.PI / 2), M.vent, sx * (w / 2 + 0.03), rise * 0.5, 0, 0, sx * Math.PI / 2);
  return r;
}

// Litter all over the square, in a few instanced draws: cans, bottles, paper and leaves, glass
// shards, rubble. `free(x, z)` says whether a spot is clear of props.
function subLitter(fx, rng, free, area) {
  const r = () => rng(), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), Pv = new THREE.Vector3(), C = new THREE.Color();
  const spot = (edge) => {
    for (let k = 0; k < 20; k++) {
      let x, z;
      if (area.ring) { const an = r() * TAU, rr = edge && r() < 0.7 ? area.ring - r() * 0.8 : Math.sqrt(r()) * (area.ring + 4); x = Math.sin(an) * rr; z = Math.cos(an) * rr; if (free(x, z)) return [x, z]; continue; }
      if (edge && r() < 0.7) { const s = Math.floor(r() * 4), t = r(); [x, z] = s === 0 ? [area.minX + t * (area.maxX - area.minX), area.minZ + r() * 0.8] : s === 1 ? [area.minX + t * (area.maxX - area.minX), area.maxZ - r() * 0.8] : s === 2 ? [area.minX + r() * 0.8, area.minZ + t * (area.maxZ - area.minZ)] : [area.maxX - r() * 0.8, area.minZ + t * (area.maxZ - area.minZ)]; }
      else { x = area.minX + r() * (area.maxX - area.minX); z = area.minZ + r() * (area.maxZ - area.minZ); }
      if (free(x, z)) return [x, z];
    }
    return [area.minX, area.minZ];
  };
  const make = (geo, mat, n, place) => {
    const im = new THREE.InstancedMesh(geo, mat, n);
    for (let i = 0; i < n; i++) { place(i); im.setMatrixAt(i, M4.compose(Pv, Q, S)); im.setColorAt(i, C); }
    im.instanceMatrix.needsUpdate = true; im.name = 'Detail'; fx.add(im); return im;
  };
  const toon = (opts) => new THREE.MeshToonMaterial(Object.assign({ gradientMap: gradTex }, opts));
  const n = IS_TOUCH ? 1 : 1.5;
  make(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 7).rotateZ(Math.PI / 2), toon({}), Math.round(110 * n), () => { // cans, lying, some crushed
    const [x, z] = spot(true); Pv.set(x, 0.035, z); Q.setFromEuler(E.set(0, r() * TAU, 0)); S.set(1, r() < 0.3 ? 0.45 : 1, 1); C.setHex([0xb3121a, 0xd8d0c0, 0x2a6ab0, 0x3a9a3a, 0xc8a020, 0x9a9aa0][Math.floor(r() * 6)]);
  });
  const bottle = new THREE.LatheGeometry([[0, 0], [0.04, 0], [0.04, 0.16], [0.016, 0.21], [0.014, 0.27], [0, 0.27]].map(([a, b]) => new THREE.Vector2(a, b)), 7).rotateZ(Math.PI / 2);
  make(bottle, toon({ emissive: 0x101810 }), Math.round(40 * n), () => {
    const [x, z] = spot(true); Pv.set(x, 0.04, z); Q.setFromEuler(E.set(0, r() * TAU, 0)); S.set(1, 1, 1); C.setHex([0x2a5a2a, 0x6a4a1a, 0x8a9a9a][Math.floor(r() * 3)]);
  });
  make(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), toon({ side: THREE.DoubleSide }), Math.round(260 * n), (i) => { // paper, wrappers, cups, leaves
    const [x, z] = spot(true), leaf = i % 2 === 0; Pv.set(x, 0.05 + r() * 0.01, z); Q.setFromEuler(E.set((r() - 0.5) * 0.4, r() * TAU, (r() - 0.5) * 0.4));
    const s = leaf ? 0.08 + r() * 0.06 : 0.12 + r() * 0.2; S.set(s, 1, s * (0.6 + r() * 0.6));
    C.setHex(leaf ? [0x6a4a22, 0x8a5a2a, 0x4a3a1a, 0x7a6a2a][Math.floor(r() * 4)] : [0xb8b0a0, 0xa89880, 0x8a5a4a, 0x6a7a8a, 0xa8984a, 0x9a948a, 0xc8c0b0][Math.floor(r() * 7)]);
  });
  make(new THREE.CircleGeometry(0.05, 3).rotateX(-Math.PI / 2), toon({ emissive: 0x6a7a80, side: THREE.DoubleSide }), Math.round(90 * n), () => { // glass
    const [x, z] = spot(false); Pv.set(x, 0.048, z); Q.setFromEuler(E.set(0, r() * TAU, 0)); const s = 0.5 + r() * 1.2; S.set(s, 1, s * 0.6); C.setHex(r() < 0.6 ? 0x9ab8c0 : 0x5a8a5a);
  });
  make(new THREE.DodecahedronGeometry(0.1, 0), toon({}), Math.round(70 * n), () => { // rubble, brick bits
    const [x, z] = spot(true); Pv.set(x, 0.04, z); Q.setFromEuler(E.set(r() * 3, r() * 3, r() * 3)); const s = 0.5 + r() * 1.3; S.set(s, s * 0.6, s * 0.9); C.setHex(r() < 0.5 ? 0x8a8478 : 0x8a4a3a);
  });
}

// The cul-de-sac's painted ground (W x Dd metres, centred; 2026-11-17, "looks more like a parking
// lot"): dead lawns everywhere (worn paths, bald dirt, tyre ruts), the round asphalt turnaround
// (L.R) and the road out south (L.road wide) with their aggregate, patches, sealed and branching
// cracks, potholes holding water, oil, skid marks, a concrete gutter with drains and leaves; a
// sidewalk ring round it in slabs; a concrete driveway and a front walk from every house (L.drives,
// L.walks), stained and cracked, chalk on one; (the creator's logo is painted over the middle as
// its own decal); blood; soft contact shadows under everything (`boxes`). Grain multiplied over it up
// close. Returns the mesh (unmerged, under everything).
function suburbGround(W, Dd, boxes, L) {
  const T = subTextures(), K = IS_TOUCH ? 18 : 24, CW = Math.round(W * K), CH = Math.round(Dd * K);
  const rng = makeRng(5150), r = () => rng();
  const X = (x) => (x + W / 2) * K, Z = (z) => (z + Dd / 2) * K;
  const R = L.R, RW = L.road, SW = L.walkW;
  const tex = cmpCanvas(CW, CH, (g, w, h) => {
    const blot = (x, z, rad, c0, c1 = 'rgba(0,0,0,0)') => { const gr = g.createRadialGradient(X(x), Z(z), 0, X(x), Z(z), rad * K); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.beginPath(); g.arc(X(x), Z(z), rad * K, 0, TAU); g.fill(); };
    const rx = () => (r() - 0.5) * W, rz = () => (r() - 0.5) * Dd;
    const asphaltPath = () => { g.beginPath(); g.arc(X(0), Z(0), R * K, 0, TAU); g.rect(X(-RW), Z(0), RW * 2 * K, (Dd / 2) * K + 2); };
    const strip = (pts, wid, style) => { g.strokeStyle = style; g.lineWidth = wid * K; g.lineJoin = 'round'; g.lineCap = 'butt'; g.beginPath(); pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.stroke(); };
    // --- dead lawns
    g.fillStyle = '#4e5030'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) blot(rx(), rz(), 1 + r() * 4, r() < 0.5 ? `rgba(${110 + r() * 30},${92 + r() * 20},${48 + r() * 15},0.45)` : `rgba(${50 + r() * 20},${40 + r() * 14},${26 + r() * 10},0.5)`);
    for (let i = 0; i < 40; i++) blot(rx(), rz(), 0.6 + r() * 1.6, 'rgba(70,52,34,0.75)'); // bald dirt
    for (let i = 0; i < CW * CH / 26; i++) { const v = r(); g.strokeStyle = `rgba(${80 + v * 70},${82 + v * 50},${36 + v * 26},0.75)`; g.lineWidth = 1; const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - 2 - r() * 4); g.stroke(); }
    for (let i = 0; i < CW * CH / 60; i++) { const x = r() * w, y = r() * h; g.strokeStyle = `rgba(${150 + r() * 50},${130 + r() * 40},${60 + r() * 30},0.55)`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y - 3 - r() * 6); g.stroke(); } // dry yellow blades
    for (let i = 0; i < 70; i++) blot(rx(), rz(), 0.4 + r() * 1.2, 'rgba(34,48,22,0.55)'); // greener clumps where it's damp
    for (let i = 0; i < 2600; i++) { const x = r() * w, y = r() * h; g.fillStyle = `rgba(${110 + r() * 60},${60 + r() * 40},${20 + r() * 20},0.85)`; g.save(); g.translate(x, y); g.rotate(r() * 3); g.beginPath(); g.ellipse(0, 0, 1.5 + r() * 2, 0.8 + r(), 0, 0, TAU); g.fill(); g.restore(); } // fallen leaves
    for (let i = 0; i < 900; i++) { const v = 90 + r() * 70; g.fillStyle = `rgba(${v},${v * 0.95},${v * 0.88},0.8)`; g.beginPath(); g.arc(r() * w, r() * h, 0.7 + r() * 1.3, 0, TAU); g.fill(); } // stones
    for (let i = 0; i < 14; i++) { const x = rx(), z = rz(); blot(x, z, 0.35, 'rgba(60,44,30,0.9)'); blot(x, z, 0.18, 'rgba(90,70,50,0.8)'); } // molehills
    for (let i = 0; i < 6; i++) { // tyre ruts cut across the lawns
      const a = r() * TAU, x0 = rx(), z0 = rz(), len = 6 + r() * 8;
      for (const o of [-0.8, 0.8]) { g.strokeStyle = 'rgba(40,30,20,0.5)'; g.lineWidth = 0.3 * K; g.beginPath(); g.moveTo(X(x0 + Math.cos(a + 1.57) * o), Z(z0 + Math.sin(a + 1.57) * o)); g.quadraticCurveTo(X(x0 + Math.cos(a) * len * 0.5 + Math.cos(a + 1.57) * o + 1.5), Z(z0 + Math.sin(a) * len * 0.5 + Math.sin(a + 1.57) * o), X(x0 + Math.cos(a) * len + Math.cos(a + 1.57) * o), Z(z0 + Math.sin(a) * len + Math.sin(a + 1.57) * o)); g.stroke(); }
    }
    // --- driveways and front walks (concrete), then the sidewalk ring over them
    const conc = (v) => `rgb(${v},${Math.round(v * 0.96)},${Math.round(v * 0.9)})`;
    for (const d of L.drives) { strip(d.pts, 3.0, conc(92)); strip(d.pts, 2.7, conc(104)); }
    for (const wk of L.walks) strip(wk, 1.1, conc(98));
    for (const d of L.drives) {
      // oil stains, cracks and expansion joints along each driveway
      const [a, b] = d.pts, c = d.pts[2];
      for (let k = 0; k < 3; k++) { const t = 0.3 + r() * 0.6; blot(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0.4 + r() * 0.6, 'rgba(14,12,14,0.55)'); }
      for (let t = 0.25; t < 1; t += 0.25) { const px = b[0] + (c[0] - b[0]) * t, pz = b[1] + (c[1] - b[1]) * t, dx = c[0] - b[0], dz = c[1] - b[1], dl = Math.hypot(dx, dz) || 1; g.strokeStyle = 'rgba(50,44,40,0.6)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(px - dz / dl * 1.4), Z(pz + dx / dl * 1.4)); g.lineTo(X(px + dz / dl * 1.4), Z(pz - dx / dl * 1.4)); g.stroke(); }
      g.strokeStyle = 'rgba(40,36,32,0.7)'; g.lineWidth = 1.2; g.beginPath(); let x = X(b[0]), y = Z(b[1]); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 30; y += (r() - 0.5) * 30; g.lineTo(x, y); } g.stroke();
    }
    { // chalk on one driveway: a hopscotch and a crude clown face
      const d = L.drives[3]; if (d) { const [a, b] = d.pts, cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2; g.save(); g.translate(X(cx), Z(cz)); g.rotate(Math.atan2(b[1] - a[1], b[0] - a[0])); g.strokeStyle = 'rgba(240,180,220,0.7)'; g.lineWidth = 2; for (let k = 0; k < 5; k++) g.strokeRect(-1.6 * K + k * 0.6 * K, -0.3 * K, 0.6 * K, 0.6 * K); g.strokeStyle = 'rgba(160,220,255,0.7)'; g.beginPath(); g.arc(1.6 * K, 0, 0.45 * K, 0, TAU); g.stroke(); g.beginPath(); g.arc(1.6 * K, 0.1 * K, 0.25 * K, 0.2, Math.PI - 0.2); g.stroke(); g.restore(); }
    }
    // sidewalk ring and the walks either side of the road out, in slabs
    g.save(); g.beginPath(); g.arc(X(0), Z(0), (R + SW) * K, 0, TAU); g.arc(X(0), Z(0), R * K, 0, TAU, true); g.fillStyle = conc(104); g.fill('evenodd');
    for (const sx of [-1, 1]) { g.fillStyle = conc(104); g.fillRect(X(sx > 0 ? RW : -RW - SW), Z(Math.sqrt(R * R - RW * RW) - 0.5), SW * K, (Dd / 2) * K); }
    g.strokeStyle = 'rgba(40,36,32,0.6)'; g.lineWidth = 1.5;
    for (let a = 0; a < TAU; a += 1.5 / (R + SW / 2)) { g.beginPath(); g.moveTo(X(Math.sin(a) * R), Z(Math.cos(a) * R)); g.lineTo(X(Math.sin(a) * (R + SW)), Z(Math.cos(a) * (R + SW))); g.stroke(); }
    for (let i = 0; i < 1600; i++) { const a = r() * TAU, rr = R + r() * SW, v = 70 + r() * 60; g.fillStyle = `rgba(${v},${v},${v * 0.92},0.35)`; g.fillRect(X(Math.sin(a) * rr), Z(Math.cos(a) * rr), 1.5, 1.5); }
    for (let i = 0; i < 14; i++) { const a = r() * TAU; blot(Math.sin(a) * (R + SW / 2), Math.cos(a) * (R + SW / 2), 0.4 + r() * 0.5, 'rgba(30,26,20,0.4)'); }
    g.restore();
    // --- the asphalt (everything inside the turnaround and the road is clipped to it)
    g.save(); asphaltPath(); g.clip();
    g.fillStyle = '#4a464c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) blot(rx() * 0.7, rz() * 0.8, 2 + r() * 6, r() < 0.5 ? 'rgba(20,18,22,0.28)' : 'rgba(110,104,110,0.16)');
    for (let i = 0; i < CW * CH / 45; i++) { const v = 40 + r() * 80; g.fillStyle = `rgba(${v},${v},${v + 6},${0.25 + r() * 0.35})`; const sz = 0.8 + r() * 1.4; g.fillRect(r() * w, r() * h, sz, sz); }
    for (let i = 0; i < 8; i++) { // utility-cut patches
      const x = rx() * 0.5, z = rz() * 0.6, pw = 1 + r() * 4, pd = 0.8 + r() * 2.5, a = (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.1;
      g.save(); g.translate(X(x), Z(z)); g.rotate(a); g.fillStyle = 'rgba(30,28,34,0.75)'; g.fillRect(-pw * K / 2, -pd * K / 2, pw * K, pd * K);
      g.strokeStyle = 'rgba(12,10,14,0.9)'; g.lineWidth = 0.08 * K; g.strokeRect(-pw * K / 2, -pd * K / 2, pw * K, pd * K); g.restore();
    }
    // the road out: a faded double yellow line
    for (const o of [-0.13, 0.13]) { g.strokeStyle = 'rgba(210,170,50,0.55)'; g.lineWidth = 0.1 * K; g.setLineDash([2.2 * K, 1.4 * K]); g.beginPath(); g.moveTo(X(o), Z(R - 1)); g.lineTo(X(o), Z(Dd / 2)); g.stroke(); }
    g.setLineDash([]);
    // cracks, tar snakes, alligator cracking
    const crack = (x, y, a, len, wdt, depth) => {
      let px = x, py = y; const pts = [[px, py]];
      for (let k = 0; k < len; k++) { a += (r() - 0.5) * 0.55; px += Math.cos(a) * 0.35 * K; py += Math.sin(a) * 0.35 * K; pts.push([px, py]); if (depth > 0 && r() < 0.12) crack(px, py, a + (r() < 0.5 ? 1 : -1) * (0.6 + r() * 0.8), len * 0.5, wdt * 0.65, depth - 1); }
      for (const [col, lw, off] of [['rgba(150,145,150,0.25)', wdt + 1, 1], ['rgba(10,8,12,0.85)', wdt, 0]]) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); pts.forEach(([a1, b1], i) => (i ? g.lineTo(a1 + off, b1 + off) : g.moveTo(a1 + off, b1 + off))); g.stroke(); }
    };
    g.lineJoin = 'round'; g.lineCap = 'round';
    for (let i = 0; i < 22; i++) crack(X(rx() * 0.6), Z(rz() * 0.8), r() * TAU, 10 + r() * 30, 1 + r() * 1.1, 2);
    for (let i = 0; i < 7; i++) { let x = X(rx() * 0.5), y = Z(rz() * 0.6), a = r() * TAU; g.strokeStyle = 'rgba(14,12,16,0.92)'; g.lineWidth = 0.1 * K + r() * 0.06 * K; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 18; k++) { a += (r() - 0.5) * 0.7; x += Math.cos(a) * 0.4 * K; y += Math.sin(a) * 0.4 * K; g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 5; i++) { const cx0 = rx() * 0.5, cz0 = rz() * 0.6, rad = 1 + r() * 1.6; g.strokeStyle = 'rgba(14,12,16,0.7)'; g.lineWidth = 1;
      for (let k = 0; k < 40; k++) { const a = r() * TAU, d = Math.sqrt(r()) * rad, x = X(cx0 + Math.cos(a) * d), y = Z(cz0 + Math.sin(a) * d); g.beginPath(); g.moveTo(x, y); let px = x, py = y; for (let q = 0; q < 3; q++) { px += (r() - 0.5) * 0.4 * K; py += (r() - 0.5) * 0.4 * K; g.lineTo(px, py); } g.stroke(); } }
    // potholes (some holding water), puddles, oil, skid marks, manholes
    for (let i = 0; i < 12; i++) {
      const a0 = r() * TAU, d0 = Math.sqrt(r()) * (R - 2), x = Math.sin(a0) * d0, z = Math.cos(a0) * d0, rad = 0.35 + r() * 0.6, wet = r() < 0.4;
      blot(x, z, rad * 1.6, 'rgba(20,18,22,0.5)');
      const poly = (rr, col) => { g.fillStyle = col; g.beginPath(); for (let k = 0; k <= 14; k++) { const a = k / 14 * TAU, q = rr * (0.75 + r() * 0.35); g.lineTo(X(x + Math.cos(a) * q), Z(z + Math.sin(a) * q * 0.8)); } g.fill(); };
      poly(rad * 1.15, 'rgba(96,90,96,0.9)'); poly(rad, '#141216');
      if (wet) { const gr = g.createRadialGradient(X(x - rad * 0.3), Z(z - rad * 0.3), 1, X(x), Z(z), rad * 0.8 * K); gr.addColorStop(0, 'rgba(150,150,190,0.65)'); gr.addColorStop(0.5, 'rgba(40,40,60,0.8)'); gr.addColorStop(1, 'rgba(40,40,60,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(X(x), Z(z), rad * 0.8 * K, rad * 0.6 * K, 0, 0, TAU); g.fill(); }
    }
    for (let i = 0; i < 8; i++) { const a0 = r() * TAU, d0 = Math.sqrt(r()) * (R - 2), x = Math.sin(a0) * d0, z = Math.cos(a0) * d0, rad = 0.8 + r() * 1.6, gr = g.createRadialGradient(X(x - rad * 0.3), Z(z - rad * 0.3), 2, X(x), Z(z), rad * K); gr.addColorStop(0, 'rgba(130,130,170,0.45)'); gr.addColorStop(0.6, 'rgba(26,26,40,0.6)'); gr.addColorStop(1, 'rgba(26,26,40,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(X(x), Z(z), rad * K, rad * 0.6 * K, r(), 0, TAU); g.fill(); }
    for (let i = 0; i < 12; i++) blot(rx() * 0.55, rz() * 0.7, 0.5 + r() * 1.1, 'rgba(8,6,10,0.55)');
    for (let i = 0; i < 6; i++) { const rad = 4 + r() * 8, a0 = r() * TAU; for (const o of [0, 1.5]) { g.strokeStyle = 'rgba(10,8,8,0.4)'; g.lineWidth = 0.22 * K; g.beginPath(); g.arc(X(0), Z(0), (rad + o) * K, a0, a0 + 0.8 + r()); g.stroke(); } } // donuts round the turnaround
    for (const [mx, mz] of [[-6, 7], [7, -6], [0, 21]]) { blot(mx, mz, 0.7, 'rgba(10,8,10,0.6)'); g.fillStyle = '#2a2628'; g.beginPath(); g.arc(X(mx), Z(mz), 0.42 * K, 0, TAU); g.fill(); g.strokeStyle = '#4a464c'; g.lineWidth = 1.5; for (let q = 0.1; q < 0.42; q += 0.07) { g.beginPath(); g.arc(X(mx), Z(mz), q * K, 0, TAU); g.stroke(); } }
    // the gutter pan round the curb, leaves and grit in it, drain grates
    g.beginPath(); g.arc(X(0), Z(0), R * K, 0, TAU); g.arc(X(0), Z(0), (R - 0.45) * K, 0, TAU, true); g.fillStyle = '#7a756c'; g.fill('evenodd');
    for (const sx of [-1, 1]) { g.fillStyle = '#7a756c'; g.fillRect(X(sx > 0 ? RW - 0.45 : -RW), Z(0), 0.45 * K, (Dd / 2) * K); }
    for (let i = 0; i < 700; i++) { const a = r() * TAU, rr = R - Math.pow(r(), 2) * 0.9; g.fillStyle = `rgba(${90 + r() * 50},${60 + r() * 30},${20 + r() * 20},0.8)`; g.save(); g.translate(X(Math.sin(a) * rr), Z(Math.cos(a) * rr)); g.rotate(r() * 3); g.beginPath(); g.ellipse(0, 0, 2 + r() * 2.5, 1 + r() * 1.2, 0, 0, TAU); g.fill(); g.restore(); }
    for (const a of [0.9, 2.0, -2.0, -0.9, 3.14]) { const x = Math.sin(a) * (R - 0.25), z = Math.cos(a) * (R - 0.25); g.save(); g.translate(X(x), Z(z)); g.rotate(-a); g.fillStyle = '#0e0c0e'; g.fillRect(-0.45 * K, -0.2 * K, 0.9 * K, 0.4 * K); g.fillStyle = '#5a5654'; for (let k = 1; k < 7; k++) g.fillRect(-0.45 * K + k * 0.9 * K / 7, -0.2 * K, 1.5, 0.4 * K); g.restore(); blot(x, z, 1.1, 'rgba(14,10,8,0.35)'); }
    // blood: soaked pools, droplets, spatter, drag smears (mostly round the middle)
    for (let i = 0; i < 40; i++) {
      const a0 = r() * TAU, d0 = Math.sqrt(r()) * (R - 1), x = Math.sin(a0) * d0, z = Math.cos(a0) * d0 * 0.9 - 2, rad = 0.3 + r() * 1.1;
      blot(x, z, rad * 1.5, `rgba(90,4,8,${0.25 + r() * 0.2})`);
      g.fillStyle = `rgba(${100 + r() * 40},4,8,${0.7 + r() * 0.25})`; g.beginPath(); for (let k = 0; k <= 18; k++) { const a = k / 18 * TAU, q = rad * (0.6 + r() * 0.45); g.lineTo(X(x + Math.cos(a) * q), Z(z + Math.sin(a) * q * 0.85)); } g.fill();
      for (let k = 0; k < 14; k++) { const a = r() * TAU, d = rad * (1.1 + r() * 1.8); g.beginPath(); g.arc(X(x + Math.cos(a) * d), Z(z + Math.sin(a) * d), (0.02 + r() * 0.05) * K, 0, TAU); g.fill(); }
    }
    for (let i = 0; i < 6; i++) { let x = rx() * 0.4, z = rz() * 0.5; g.strokeStyle = 'rgba(100,4,8,0.45)'; g.lineWidth = (0.3 + r() * 0.3) * K; g.beginPath(); g.moveTo(X(x), Z(z)); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 6; z += (r() - 0.5) * 6; g.lineTo(X(x), Z(z)); } g.stroke(); }
    g.restore(); // (end of the asphalt clip)
    // a little blood dragged up onto a lawn or two
    for (let i = 0; i < 6; i++) { const a = r() * TAU, d = R + SW + 1 + r() * 5; blot(Math.sin(a) * d, Math.cos(a) * d, 0.5 + r() * 0.6, 'rgba(80,4,8,0.55)'); }
    // soft contact shadows under everything standing on the ground
    g.save(); g.shadowColor = 'rgba(6,4,8,0.8)'; g.shadowBlur = 0.6 * K; g.shadowOffsetX = w * 2; g.fillStyle = '#000';
    for (const b of boxes) { if (b[4] > 0.3 || b[2] < -W / 2 - 1 || b[0] > W / 2 + 1 || b[3] < -Dd / 2 - 1 || b[1] > Dd / 2 + 1) continue; const pad = 0.12; g.fillRect(X(b[0] - pad) - w * 2, Z(b[1] - pad), (b[2] - b[0] + pad * 2) * K, (b[3] - b[1] + pad * 2) * K); }
    g.restore();
  });
  tex.anisotropy = IS_TOUCH ? 2 : 8;
  const mat = new THREE.MeshToonMaterial({ color: 0xd8d0d0, map: tex, emissive: 0x2e2a2a, emissiveMap: tex, gradientMap: gradTex });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.gritMap = { value: T.grit };
    sh.fragmentShader = 'uniform sampler2D gritMap;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      diffuseColor.rgb *= mix(vec3(1.0), texture2D(gritMap, vUv * vec2(${(W / 1.8).toFixed(1)}, ${(Dd / 1.8).toFixed(1)})).rgb * 2.0, 0.45);`);
  };
  addCutaway(mat);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, Dd).rotateX(-Math.PI / 2), mat);
  m.position.y = 0.03; m.receiveShadow = true; m.renderOrder = -1; m.name = 'Road';
  // the creator's Slaughter House Universe logo painted big across the middle of the turnaround
  // (2026-11-17, replacing the old clown face): ui/suburb-logo.webp, worn red paint, black cut away;
  // it reads upright from the camera (its top toward the stage)
  const logoTex = new THREE.TextureLoader().load('ui/suburb-logo.webp');
  logoTex.anisotropy = IS_TOUCH ? 2 : 8;
  const logoMat = new THREE.MeshToonMaterial({ map: logoTex, transparent: true, depthWrite: false, gradientMap: gradTex, color: 0xd8c8c8, emissive: 0x281616, emissiveMap: logoTex, polygonOffset: true, polygonOffsetFactor: -2 });
  addCutaway(logoMat);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(22, 22).rotateX(-Math.PI / 2), logoMat);
  logo.position.set(0, 0.012, 0.6); logo.renderOrder = 0; logo.name = 'Road';
  m.add(logo);
  return m;
}
