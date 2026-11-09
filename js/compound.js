'use strict';
// Stage 1's map (decisions.md 2026-11-09), built in code after the creator's concept art: a fenced
// clown-wrestling compound in a run-down suburban block, at night. A ring in the middle (a plain,
// blood-stained mat: no clown face) with four floodlight towers, bleachers and crowd barriers;
// the entrance tent with its clown billboard and purple doorway at the back; the front gate arch
// with curtains and stars; clown banners on the fence; a rusted bus, a trailer, a striped tent,
// shacks, fire barrels, tyres and dead trees; streets, sidewalks, lamps and houses all round.
// The art on banners and billboards is painted on canvases here. Lights are faked with glowing
// pools and beams (real lights are too costly on phones). Names on it are placeholders.
//
// It plugs into js/map.js like a loaded map: the same ground heightmap, colliders, navigation grid,
// marker points, merged static meshes and blood (applyStage).

const CMP = { fx: [], fires: [] };
const CMP_FENCE = { x: 50, z: 38 }; // the compound's fence (half-sizes)

// ---------------------------------------------------------------------------
// Painted textures
function cmpCanvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = IS_TOUCH ? 1 : 4;
  return t;
}
const cmpRng = makeRng(2026);
// grime: blotches and streaks over whatever is painted
function grime(g, w, h, n = 40, a = 0.18) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(${20 + cmpRng() * 30},${10 + cmpRng() * 20},${10 + cmpRng() * 20},${a * cmpRng()})`;
    g.beginPath(); g.ellipse(cmpRng() * w, cmpRng() * h, 4 + cmpRng() * w * 0.08, 3 + cmpRng() * h * 0.06, cmpRng() * 3, 0, TAU); g.fill();
  }
  g.fillStyle = 'rgba(40,20,16,0.25)';
  for (let i = 0; i < n / 2; i++) g.fillRect(cmpRng() * w, cmpRng() * h * 0.6, 1 + cmpRng() * 2, h * (0.1 + cmpRng() * 0.3)); // drips
}
// a grinning clown face, as on the banners, billboard and gate sign
function drawClown(g, cx, cy, s, mean = 1) {
  // hair tufts
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { g.fillStyle = ['#2e8b57', '#ff7f2a', '#c2185b', '#ffb000'][(i + (sx > 0 ? 1 : 0)) % 4]; g.beginPath(); g.arc(cx + sx * s * (0.85 + i * 0.06), cy - s * 0.15 + i * s * 0.18, s * 0.28, 0, TAU); g.fill(); }
  g.fillStyle = '#f3ede0'; g.beginPath(); g.ellipse(cx, cy, s * 0.82, s, 0, 0, TAU); g.fill();
  g.strokeStyle = '#1c110a'; g.lineWidth = s * 0.05; g.stroke();
  // eyes: diamonds and angry brows
  for (const sx of [-1, 1]) {
    g.fillStyle = '#3a1a5a'; g.beginPath(); g.moveTo(cx + sx * s * 0.32, cy - s * 0.62); g.lineTo(cx + sx * s * 0.48, cy - s * 0.3); g.lineTo(cx + sx * s * 0.32, cy + 0.02 * s); g.lineTo(cx + sx * s * 0.16, cy - s * 0.3); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + sx * s * 0.3, cy - s * 0.3, s * 0.1, 0, TAU); g.fill();
    g.fillStyle = '#c0141a'; g.beginPath(); g.arc(cx + sx * s * 0.3, cy - s * 0.3, s * 0.05, 0, TAU); g.fill();
    g.strokeStyle = '#1c110a'; g.lineWidth = s * 0.07; g.beginPath(); g.moveTo(cx + sx * s * 0.55, cy - s * (0.55 + 0.1 * mean)); g.lineTo(cx + sx * s * 0.12, cy - s * 0.48); g.stroke();
  }
  // nose
  g.fillStyle = '#d81a1a'; g.beginPath(); g.arc(cx, cy + s * 0.05, s * 0.16, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(cx - s * 0.05, cy, s * 0.05, 0, TAU); g.fill();
  // the grin, with teeth
  g.fillStyle = '#b5121b'; g.beginPath(); g.moveTo(cx - s * 0.62, cy + s * 0.22); g.quadraticCurveTo(cx, cy + s * 1.05, cx + s * 0.62, cy + s * 0.22); g.quadraticCurveTo(cx, cy + s * 0.55, cx - s * 0.62, cy + s * 0.22); g.fill();
  g.fillStyle = '#2a0a0a'; g.beginPath(); g.moveTo(cx - s * 0.5, cy + s * 0.32); g.quadraticCurveTo(cx, cy + s * 0.92, cx + s * 0.5, cy + s * 0.32); g.quadraticCurveTo(cx, cy + s * 0.55, cx - s * 0.5, cy + s * 0.32); g.fill();
  g.fillStyle = '#f6efd8';
  for (let i = -4; i <= 4; i++) { const x = cx + i * s * 0.1; g.beginPath(); g.moveTo(x - s * 0.04, cy + s * 0.42); g.lineTo(x + s * 0.04, cy + s * 0.42); g.lineTo(x, cy + s * (0.55 - Math.abs(i) * 0.01)); g.fill(); }
}
const TEX = {};
function cmpTextures() {
  TEX.banner = cmpCanvas(256, 256, (g, w, h) => {
    g.fillStyle = '#e9e1cf'; g.fillRect(0, 0, w, h);
    for (const [x, y] of [[30, 30], [226, 30], [30, 226], [226, 226]]) { g.fillStyle = '#c0141a'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', x, y); }
    drawClown(g, 128, 120, 72); grime(g, w, h, 30, 0.25);
  });
  TEX.billboard = cmpCanvas(512, 256, (g, w, h) => {
    g.fillStyle = '#e0d6c0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7a1018'; g.fillRect(0, h - 18, w, 18); g.fillRect(0, 0, w, 10);
    drawClown(g, 256, 118, 104, 1.4); grime(g, w, h, 60, 0.3);
  });
  TEX.wrestling = cmpCanvas(512, 160, (g, w, h) => {
    g.fillStyle = '#e8ddc6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#b3121a'; g.font = 'bold 62px Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.save(); g.translate(w / 2, h / 2); g.rotate(-0.03); g.fillText('CLOWN', -2, -32); g.fillText('WRESTLING', 0, 34); g.restore();
    g.fillText('★', 34, 80); g.fillText('★', w - 34, 80); grime(g, w, h, 40, 0.3);
  });
  TEX.stars = cmpCanvas(128, 256, (g, w, h) => {
    g.fillStyle = '#7a1018'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2a0a0a'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#e9dfc6'; g.font = 'bold 64px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) g.fillText('★', w / 2, 46 + i * 80);
    grime(g, w, h, 16, 0.3);
  });
  TEX.curtain = cmpCanvas(128, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 8; i++) gr.addColorStop(i / 8, i % 2 ? '#5e0a10' : '#a3121c');
    g.fillStyle = gr; g.fillRect(0, 0, w, h); grime(g, w, h, 12, 0.3);
  });
  TEX.stripes = cmpCanvas(256, 64, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#efe6d4' : '#b3121a'; g.fillRect(i * w / 8, 0, w / 8, h); } grime(g, w, h, 20, 0.25); });
  TEX.mat = cmpCanvas(512, 512, (g, w, h) => {
    // the ring mat: plain canvas, scuffed and blood-stained (no clown face)
    g.fillStyle = '#ddd5c4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(90,70,60,${cmpRng() * 0.08})`; g.fillRect(cmpRng() * w, cmpRng() * h, 2 + cmpRng() * 20, 2 + cmpRng() * 20); }
    for (let i = 0; i < 12; i++) {
      // soaked-in stains: soft, dark round blots with spatter
      const x = 60 + cmpRng() * 390, y = 60 + cmpRng() * 390, r = 12 + cmpRng() * 34;
      const gr = g.createRadialGradient(x, y, 1, x, y, r);
      gr.addColorStop(0, 'rgba(105,6,12,0.9)'); gr.addColorStop(0.7, 'rgba(120,10,16,0.7)'); gr.addColorStop(1, 'rgba(120,10,16,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * (0.6 + cmpRng() * 0.4), cmpRng() * 3, 0, TAU); g.fill();
      g.fillStyle = 'rgba(110,8,14,0.85)';
      for (let k = 0; k < 12; k++) { g.beginPath(); g.arc(x + (cmpRng() - 0.5) * r * 3.2, y + (cmpRng() - 0.5) * r * 3.2, 1 + cmpRng() * 4, 0, TAU); g.fill(); }
    }
    g.strokeStyle = 'rgba(120,10,16,0.5)'; g.lineWidth = 6; g.beginPath(); g.moveTo(80, 400); g.bezierCurveTo(200, 330, 260, 380, 430, 300); g.stroke(); // a drag mark
  });
  TEX.fence = cmpCanvas(256, 128, (g, w, h) => {
    for (let i = 0; i < 16; i++) { const v = 60 + cmpRng() * 30; g.fillStyle = `rgb(${v},${v * 0.72},${v * 0.55})`; g.fillRect(i * 16, 0, 15, h); g.fillStyle = 'rgba(20,10,6,0.6)'; g.fillRect(i * 16 + 15, 0, 1, h); }
    g.fillStyle = 'rgba(30,18,10,0.7)'; g.fillRect(0, 20, w, 5); g.fillRect(0, h - 26, w, 5);
    grime(g, w, h, 30, 0.35);
  });
  TEX.metal = cmpCanvas(128, 128, (g, w, h) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#6f6a63' : '#5b5650'; g.fillRect(i * 16, 0, 16, h); }
    for (let i = 0; i < 25; i++) { g.fillStyle = `rgba(${120 + cmpRng() * 60},${50 + cmpRng() * 30},20,${0.2 + cmpRng() * 0.4})`; g.beginPath(); g.ellipse(cmpRng() * w, cmpRng() * h, 3 + cmpRng() * 14, 2 + cmpRng() * 10, 0, 0, TAU); g.fill(); } // rust
  });
  TEX.rust = cmpCanvas(128, 128, (g, w, h) => {
    g.fillStyle = '#8a5a2e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${70 + cmpRng() * 80},${30 + cmpRng() * 30},${15 + cmpRng() * 15},${0.3 + cmpRng() * 0.5})`; g.beginPath(); g.ellipse(cmpRng() * w, cmpRng() * h, 2 + cmpRng() * 16, 2 + cmpRng() * 10, cmpRng() * 3, 0, TAU); g.fill(); }
  });
  TEX.grass = cmpCanvas(256, 256, (g, w, h) => {
    g.fillStyle = '#3d4227'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { const v = cmpRng(); g.fillStyle = v < 0.5 ? `rgba(70,80,40,${0.5 * cmpRng()})` : v < 0.8 ? `rgba(90,70,45,${0.4 * cmpRng()})` : `rgba(30,32,20,${0.6 * cmpRng()})`; g.fillRect(cmpRng() * w, cmpRng() * h, 2 + cmpRng() * 6, 1 + cmpRng() * 4); }
  });
  TEX.dirt = cmpCanvas(256, 256, (g, w, h) => {
    g.fillStyle = '#4a3a2c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1200; i++) { const v = cmpRng(); g.fillStyle = v < 0.5 ? `rgba(80,62,45,${0.5 * cmpRng()})` : v < 0.75 ? `rgba(60,70,38,${0.5 * cmpRng()})` : `rgba(25,18,14,${0.5 * cmpRng()})`; g.fillRect(cmpRng() * w, cmpRng() * h, 2 + cmpRng() * 8, 1 + cmpRng() * 6); }
  });
  TEX.asphalt = cmpCanvas(256, 256, (g, w, h) => {
    g.fillStyle = '#2b2a2e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${60 + cmpRng() * 40},${60 + cmpRng() * 40},${65 + cmpRng() * 40},${0.25 * cmpRng()})`; g.fillRect(cmpRng() * w, cmpRng() * h, 1 + cmpRng() * 3, 1 + cmpRng() * 3); }
    g.strokeStyle = 'rgba(15,14,16,0.7)'; g.lineWidth = 1.5; for (let i = 0; i < 6; i++) { g.beginPath(); let x = cmpRng() * w, y = cmpRng() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (cmpRng() - 0.5) * 40; y += (cmpRng() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); } // cracks
  });
  TEX.concrete = cmpCanvas(128, 128, (g, w, h) => { g.fillStyle = '#7d766e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(50,45,42,${0.2 * cmpRng()})`; g.fillRect(cmpRng() * w, cmpRng() * h, 2 + cmpRng() * 6, 2 + cmpRng() * 6); } g.fillStyle = 'rgba(40,36,34,0.6)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); });
  TEX.siding = cmpCanvas(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); for (let i = 0; i < 16; i++) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, i * 8 + 7, w, 1); } grime(g, w, h, 12, 0.15); });
  TEX.roof = cmpCanvas(128, 128, (g, w, h) => { g.fillStyle = '#3a3438'; g.fillRect(0, 0, w, h); for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) { g.fillStyle = `rgba(${40 + cmpRng() * 30},${36 + cmpRng() * 24},${40 + cmpRng() * 30},1)`; g.fillRect(x * 16 + (y % 2) * 8, y * 8, 15, 7); } });
  for (const k of ['fence', 'metal', 'rust', 'grass', 'dirt', 'asphalt', 'concrete', 'siding', 'roof', 'stripes']) { TEX[k].wrapS = TEX[k].wrapT = THREE.RepeatWrapping; }
  TEX.glow = cmpCanvas(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 2, 64, 64, 63); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  TEX.flame = cmpCanvas(64, 128, (g, w, h) => {
    const gr = g.createRadialGradient(32, 96, 4, 32, 80, 60); gr.addColorStop(0, 'rgba(255,240,180,1)'); gr.addColorStop(0.3, 'rgba(255,150,40,0.9)'); gr.addColorStop(0.7, 'rgba(200,40,10,0.4)'); gr.addColorStop(1, 'rgba(120,10,0,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(32, 4); g.quadraticCurveTo(62, 70, 46, 120); g.lineTo(18, 120); g.quadraticCurveTo(2, 70, 32, 4); g.fill();
  });
}

// ---------------------------------------------------------------------------
// Building blocks. Lit meshes go in `root` (merged later); collider boxes go in `D.boxes`.
const _cmpMats = new Map();
function cmpMat(color, map, emissive, repeat) {
  const k = color + '|' + (map ? map.uuid : '') + '|' + (emissive || 0) + '|' + (repeat || '');
  let m = _cmpMats.get(k);
  if (!m) {
    let tex = map;
    if (map && repeat) { tex = map.clone(); tex.needsUpdate = true; tex.repeat.set(repeat[0], repeat[1]); }
    m = new THREE.MeshToonMaterial({ color, map: tex || null, gradientMap: gradTex });
    if (emissive) { m.emissive = new THREE.Color(emissive); if (tex) m.emissiveMap = tex; }
    _cmpMats.set(k, m);
  }
  return m;
}
function cmpBuild() {
  cmpTextures();
  const root = new THREE.Group(), fx = new THREE.Group();
  const D = { boxes: [], spheres: [], points: {}, barrels: [], bloodSpots: [], ring: { x: 0, z: 0, half: 6, h: 0.9 } };
  const add = (geo, mat, x, y, z, ry = 0, name = 'prop') => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.name = name; m.castShadow = m.receiveShadow = true; root.add(m); return m; };
  const blk = (w, h, d, mat, x, y, z, ry = 0, name) => add(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, ry, name);
  const col = (x, z, w, d, h, y0 = 0) => D.boxes.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2, y0 - 0.3, y0 + h]);
  // a solid box, with its collider (for quarter turns, w/d swap)
  const solid = (w, h, d, mat, x, y, z, ry = 0) => { blk(w, h, d, mat, x, y, z, ry); const q = Math.abs(Math.sin(ry)) > 0.5; col(x, z, q ? d : w, q ? w : d, y + h, y); };
  const plane = (w, d, mat, x, y, z, name = 'Terrain') => { const m = add(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), mat, x, y, z, 0, name); m.castShadow = false; return m; };
  const sign = (w, h, tex, x, y, z, ry, emiss = 0) => { const m = add(new THREE.PlaneGeometry(w, h), cmpMat(0xffffff, tex, emiss), x, y, z, ry); m.material.side = THREE.DoubleSide; return m; };
  const glowAt = (x, z, r, color, y = 0.05) => CMP.fx.push({ kind: 'pool', x, y, z, r, color });

  // --- ground: dark grass outside, trampled dirt inside, streets and sidewalks all round
  plane(260, 220, cmpMat(0xffffff, TEX.grass, 0, [26, 22]), 0, 0, 0);
  plane(CMP_FENCE.x * 2, CMP_FENCE.z * 2, cmpMat(0xffffff, TEX.dirt, 0, [10, 8]), 0, 0.02, 0, 'Road');
  const road = cmpMat(0xffffff, TEX.asphalt, 0, [20, 2]), roadV = cmpMat(0xffffff, TEX.asphalt, 0, [2, 16]), walk = cmpMat(0xb8b0a6, TEX.concrete, 0, [40, 1]), walkV = cmpMat(0xb8b0a6, TEX.concrete, 0, [1, 32]);
  for (const s of [-1, 1]) {
    plane(140, 10, road, 0, 0.03, s * 49, 'Road'); plane(10, 118, roadV, s * 61, 0.03, 0, 'Road');
    plane(126, 3, walk, 0, 0.06, s * 42.5, 'Road'); plane(3, 88, walkV, s * 54.5, 0.06, 0, 'Road');
    plane(160, 3, walk, 0, 0.06, s * 55.5, 'Road'); plane(3, 120, walkV, s * 67.5, 0.06, 0, 'Road');
  }
  // lane paint
  const paint = cmpMat(0xd8b23a);
  for (let x = -60; x <= 60; x += 6) for (const s of [-1, 1]) plane(3, 0.25, paint, x, 0.05, s * 49, 'Road');
  for (let z = -40; z <= 40; z += 6) for (const s of [-1, 1]) plane(0.25, 3, paint, s * 61, 0.05, z, 'Road');

  // --- the ring: a raised platform (the ground heightmap lifts it), posts, red ropes
  const R = D.ring;
  blk(R.half * 2, R.h, R.half * 2, cmpMat(0x1c1418), R.x, 0, R.z, 0, 'ring');
  add(new THREE.PlaneGeometry(R.half * 2 - 0.3, R.half * 2 - 0.3).rotateX(-Math.PI / 2), cmpMat(0x9c9284, TEX.mat), R.x, R.h + 0.01, R.z, 0, 'ringmat').castShadow = false;
  const postMat = cmpMat(0x2a2a2e), rope = cmpMat(0xb3121a, null, 0x300000), pad = cmpMat(0xb3121a);
  const P = R.half - 0.2;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    add(new THREE.CylinderGeometry(0.12, 0.12, 1.9, 8), postMat, R.x + sx * P, R.h + 0.95, R.z + sz * P);
    for (let k = 0; k < 3; k++) blk(0.32, 0.18, 0.32, pad, R.x + sx * P, R.h + 0.32 + k * 0.42, R.z + sz * P);
    col(R.x + sx * P, R.z + sz * P, 0.4, 0.4, R.h + 1.9);
  }
  for (let k = 0; k < 3; k++) {
    const y = R.h + 0.42 + k * 0.42;
    for (const s of [-1, 1]) {
      add(new THREE.CylinderGeometry(0.045, 0.045, P * 2, 6).rotateZ(Math.PI / 2), rope, R.x, y, R.z + s * P);
      add(new THREE.CylinderGeometry(0.045, 0.045, P * 2, 6).rotateX(Math.PI / 2), rope, R.x + s * P, y, R.z);
    }
  }
  D.bloodSpots.push([R.x, R.z, 9, 0.5]);
  glowAt(R.x, R.z, 11, 0x6a6458); // the floodlit ring (dimmer: the mat is pale)

  // --- floodlight towers at the ring's corners, with beams and pools of light
  const steel = cmpMat(0x3a3a40), lamp = cmpMat(0xfff6dc, null, 0xfff1c8);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const x = R.x + sx * 11.5, z = R.z + sz * 12.5;
    for (const [ox, oz] of [[0.5, 0], [-0.3, 0.45], [-0.3, -0.45]]) add(new THREE.CylinderGeometry(0.05, 0.08, 7, 6), steel, x + ox * 0.6, 3.5, z + oz * 0.6).rotation.set(oz * 0.12, 0, -ox * 0.12);
    const head = blk(1.8, 1.2, 0.3, steel, x, 6.7, z, Math.atan2(-sx, -sz));
    for (let i = 0; i < 4; i++) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.1), lamp);
      l.position.set((i % 2 - 0.5) * 0.85, (Math.floor(i / 2) - 0.5) * 0.55 + 0.6, 0.18); head.add(l);
    }
    col(x, z, 1.2, 1.2, 7);
    CMP.fx.push({ kind: 'beam', from: new THREE.Vector3(x, 7.2, z), to: new THREE.Vector3(R.x + sx * 2, 0, R.z + sz * 2), color: 0xfff2d0 });
    glowAt(R.x + sx * 9, R.z + sz * 9, 5, 0x9a9080); // light spilling round the ring
  }

  // --- bleachers either side of the ring
  const wood = cmpMat(0x6b5038, TEX.fence, 0, [1, 1]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * 15.5, z = sz * 5.5;
    for (let t = 0; t < 3; t++) blk(1.4, 0.45 + t * 0.45, 8, wood, x + sx * (t * 1.3 - 1.3), 0, z);
    col(x, z, 4.2, 8, 1.4);
  }

  // --- crowd barriers round the ring area (gaps front and back)
  const barrier = cmpMat(0x8a8a92);
  const rail = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    for (let y of [0.3, 1.0]) add(new THREE.BoxGeometry(0.06, 0.06, len), barrier, cx, y, cz, ang);
    for (let i = 0; i <= Math.floor(len / 1.2); i++) { const t = i / Math.max(1, Math.floor(len / 1.2)); add(new THREE.BoxGeometry(0.04, 0.75, 0.04), barrier, x0 + (x1 - x0) * t, 0.65, z0 + (z1 - z0) * t); }
    col(cx, cz, Math.abs(x1 - x0) + 0.2, Math.abs(z1 - z0) + 0.2, 1.1);
  };
  const BX = 22, BZ = 17.5;
  rail(-BX, -BZ, -3, -BZ); rail(3, -BZ, BX, -BZ); rail(-BX, BZ, -3, BZ); rail(3, BZ, BX, BZ);
  rail(-BX, -BZ, -BX, -4); rail(-BX, 4, -BX, BZ); rail(BX, -BZ, BX, -4); rail(BX, 4, BX, BZ);

  // --- the perimeter fence: weathered planks and sheet metal, banners hung on it
  const fenceM = cmpMat(0xffffff, TEX.fence, 0, [1, 1]), metalM = cmpMat(0xffffff, TEX.metal, 0, [1, 1]);
  const FX = CMP_FENCE.x, FZ = CMP_FENCE.z, FH = 3;
  const fenceRun = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 4));
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, cx = x0 + (x1 - x0) * (t0 + t1) / 2, cz = z0 + (z1 - z0) * (t0 + t1) / 2;
      const ang = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2, h = FH + (cmpRng() - 0.5) * 0.5;
      add(new THREE.BoxGeometry(len / n + 0.05, h, 0.15), cmpRng() < 0.3 ? metalM : fenceM, cx, h / 2, cz, ang - Math.PI / 2 + Math.PI / 2);
      add(new THREE.CylinderGeometry(0.1, 0.1, h + 0.4, 6), cmpMat(0x3a2a20), x0 + (x1 - x0) * t0, (h + 0.4) / 2, z0 + (z1 - z0) * t0);
    }
    col((x0 + x1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0) + 0.4, Math.abs(z1 - z0) + 0.4, FH);
  };
  fenceRun(-FX, -FZ, FX, -FZ); fenceRun(-FX, FZ, -5, FZ); fenceRun(5, FZ, FX, FZ);
  fenceRun(-FX, -FZ, -FX, FZ); fenceRun(FX, -FZ, FX, FZ);
  // banners on the fence (outer faces too, as seen from the street)
  for (const [x, z, ry] of [[-34, -FZ + 0.12, 0], [-38, FZ - 0.12, Math.PI], [36, FZ - 0.12, Math.PI], [-FX + 0.12, 20, Math.PI / 2], [FX - 0.12, -6, -Math.PI / 2], [12, FZ - 0.12, Math.PI]]) sign(4, 3, TEX.banner, x, 1.9, z, ry);
  sign(12, 3.6, TEX.wrestling, 28, 2.1, -FZ + 0.12, 0);

  // --- the entrance tent at the back: red curtains, a purple doorway, the clown billboard on top
  const curtain = cmpMat(0xffffff, TEX.curtain, 0, [3, 1]);
  solid(14, 6, 5, curtain, 0, 0, -FZ + 3, 0);
  add(new THREE.PlaneGeometry(3.4, 4.6), cmpMat(0x2a0840, null, 0x6a10b0), 0, 2.3, -FZ + 5.52); // the doorway, glowing purple
  sign(15, 6, TEX.billboard, 0, 9, -FZ + 5.4, 0, 0x2a2018);
  blk(15.4, 0.4, 0.5, cmpMat(0x2a1a18), 0, 5.9, -FZ + 5.3);
  for (let i = 0; i <= 14; i++) CMP.fx.push({ kind: 'bulb', x: -7 + i, y: 6.2, z: -FZ + 5.6 }); // marquee bulbs
  for (let i = 0; i <= 6; i++) { CMP.fx.push({ kind: 'bulb', x: -2, y: 0.6 + i * 0.75, z: -FZ + 5.6 }); CMP.fx.push({ kind: 'bulb', x: 2, y: 0.6 + i * 0.75, z: -FZ + 5.6 }); }
  plane(3.2, 12, cmpMat(0x5a1890, null, 0x220640), 0, 0.07, -FZ + 11.5, 'Road'); // purple runway
  glowAt(0, -FZ + 8, 7, 0xb040ff);
  D.points.TentDoor = [0, 0, -FZ + 7];

  // --- the front gate: an arch with red curtains, star panels and the clown sign
  for (const s of [-1, 1]) {
    solid(1.6, 4.4, 0.8, cmpMat(0xffffff, TEX.stars), s * 5.4, 0, FZ, 0);
    add(new THREE.PlaneGeometry(2.2, 4.2), cmpMat(0xffffff, TEX.curtain), s * 3.6, 2.1, FZ - 0.3).material.side = THREE.DoubleSide;
  }
  blk(12, 0.6, 0.8, cmpMat(0x5e0a10), 0, 4.4, FZ);
  const gateSign = add(new THREE.CircleGeometry(1.6, 24), cmpMat(0xffffff, cmpCanvas(256, 256, (g) => { g.fillStyle = '#2a0a12'; g.fillRect(0, 0, 256, 256); drawClown(g, 128, 120, 92, 1.2); })), 0, 6.1, FZ - 0.42, Math.PI);
  gateSign.material.side = THREE.DoubleSide;
  for (let i = 0; i <= 11; i++) CMP.fx.push({ kind: 'bulb', x: -5.5 + i, y: 5.05, z: FZ - 0.5 });
  glowAt(0, FZ - 4, 6, 0xffa040);

  // --- the rusted school bus (west), the trailer (east), the striped tent, shacks
  const rustM = cmpMat(0xffffff, TEX.rust, 0, [3, 1]), glassM = cmpMat(0x1a1c22), tyreM = cmpMat(0x161616);
  const bus = (x, z) => {
    solid(3, 3, 11.5, rustM, x, 0.5, z, 0);
    for (let i = 0; i < 7; i++) for (const s of [-1, 1]) blk(0.06, 0.8, 1.1, glassM, x + s * 1.52, 2.1, z - 4.5 + i * 1.45);
    for (const [ox, oz] of [[-1.4, -3.8], [1.4, -3.8], [-1.4, 3.8], [1.4, 3.8]]) add(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 10).rotateZ(Math.PI / 2), tyreM, x + ox, 0.5, z + oz);
  };
  bus(-41, -8);
  // trailer
  solid(9, 3.2, 3.4, cmpMat(0xb8b0a2, TEX.siding, 0, [3, 1]), 38, 0.4, -24, 0);
  sign(2.4, 1.8, TEX.banner, 38, 2.1, -22.25, 0);
  blk(1.4, 1.6, 0.06, cmpMat(0x3a2a20), 34.5, 0.4, -22.28);
  // the striped tent, purple light inside
  const tent = add(new THREE.CylinderGeometry(4, 4, 3, 16, 1, true), cmpMat(0xffffff, TEX.stripes, 0, [4, 1]), 42, 1.5, 10);
  tent.material.side = THREE.DoubleSide;
  add(new THREE.ConeGeometry(4.6, 2.6, 16), cmpMat(0xffffff, TEX.stripes, 0, [4, 1]), 42, 4.3, 10);
  D.spheres.push([42, 1.5, 10, 4.1, 3]);
  glowAt(42, 10, 7, 0xb040ff);
  // shacks
  const shack = (x, z, w, d, ry) => {
    solid(w, 3.2, d, cmpMat(0xffffff, TEX.metal, 0, [2, 1]), x, 0, z, ry);
    add(new THREE.BoxGeometry(w + 0.6, 0.15, d + 0.6), cmpMat(0x4a3a30), x, 3.3, z, ry).rotation.z = 0.06;
    blk(1, 2, 0.06, cmpMat(0x2a1a14), x, 0, z + d / 2 + 0.04, ry);
  };
  shack(-34, 28, 7, 5, 0); shack(36, 28, 6, 5, 0); shack(-24, -31, 6, 4, 0); shack(22, -31, 5, 4, 0);

  // --- clutter: tyre stacks, drums, crates, tables, dead trees
  const drum = cmpMat(0x4a4f3a, TEX.rust, 0, [1, 1]), crate = cmpMat(0x7a5a3a, TEX.fence, 0, [1, 1]);
  for (const [x, z] of [[-17, -33], [-15.5, -33.6], [-16.2, -31.8], [44, -33], [-45, 33], [26, 33]]) {
    for (let k = 0; k < 3; k++) add(new THREE.TorusGeometry(0.42, 0.18, 6, 12).rotateX(Math.PI / 2), tyreM, x, 0.18 + k * 0.32, z);
    col(x, z, 1.2, 1.2, 1);
  }
  for (const [x, z] of [[-38, 2], [-37, 3.2], [-38.2, 3.6], [33, -18], [34, -17], [8, -30], [-44, -26], [45, 20], [-8, 32.5]]) { add(new THREE.CylinderGeometry(0.35, 0.35, 1, 10), drum, x, 0.5, z); col(x, z, 0.75, 0.75, 1); }
  for (const [x, z] of [[-28, 31], [-27, 32], [30, 31.5], [12, -31], [-10, -32], [46, -12]]) { const s = 0.8 + cmpRng() * 0.4; solid(s, s, s, crate, x, 0, z, cmpRng() * 0.4); }
  for (const [x, z] of [[24, -22], [-26, 20]]) { blk(2.2, 0.08, 1.1, cmpMat(0xd8d0c4), x, 0.9, z); for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) blk(0.06, 0.9, 0.06, steel, x + a * 1, 0, z + b * 0.45); col(x, z, 2.2, 1.1, 1); }
  const bark = cmpMat(0x2e241e);
  const deadTree = (x, z, s) => {
    add(new THREE.CylinderGeometry(0.15 * s, 0.32 * s, 5 * s, 7), bark, x, 2.5 * s, z);
    for (let i = 0; i < 6; i++) { const b = add(new THREE.CylinderGeometry(0.04 * s, 0.11 * s, 2.4 * s, 5), bark, x, (2.6 + i * 0.45) * s, z); b.rotation.set((cmpRng() - 0.5) * 2, cmpRng() * TAU, 0.6 + cmpRng() * 0.6); b.position.x += Math.sin(b.rotation.y) * 0.7 * s; b.position.z += Math.cos(b.rotation.y) * 0.7 * s; }
    col(x, z, 0.6 * s, 0.6 * s, 5 * s);
  };
  deadTree(-27, 17, 1.2); deadTree(25, 19, 1); deadTree(-44, 28, 1.1); deadTree(44, -31, 0.9); deadTree(-6, 26, 0.9);

  // --- fire barrels: flames and warm pools of light
  for (const [x, z] of [[-36, -14], [-36, 6], [-30, 24], [30, 24], [-8, -31], [10, -31], [-10, 35], [10, 35], [40, 4], [44, 16], [-44, -32], [44, -28]]) {
    add(new THREE.CylinderGeometry(0.38, 0.38, 1, 10), cmpMat(0xffffff, TEX.rust), x, 0.5, z);
    col(x, z, 0.8, 0.8, 1);
    CMP.fires.push([x, z]); glowAt(x, z, 5.5, 0xff8a2a);
  }
  // explosive red barrels (the game's own)
  D.barrels = [[-12, 12], [12, -12], [-28, -18], [30, 14], [6, 28]];

  // --- outside: street lamps, houses, yard trees, a parked car
  const pole = cmpMat(0x2a2a30), lampHead = cmpMat(0xffe0a0, null, 0xffc070);
  for (let x = -60; x <= 60; x += 30) for (const s of [-1, 1]) { add(new THREE.CylinderGeometry(0.08, 0.1, 5.5, 6), pole, x, 2.75, s * 43.5); blk(0.5, 0.25, 0.5, lampHead, x, 5.3, s * 43.5); glowAt(x, s * 45, 7, 0xffb060); }
  for (let z = -30; z <= 30; z += 30) for (const s of [-1, 1]) { add(new THREE.CylinderGeometry(0.08, 0.1, 5.5, 6), pole, s * 55.5, 2.75, z); blk(0.5, 0.25, 0.5, lampHead, s * 55.5, 5.3, z); glowAt(s * 57, z, 7, 0xffb060); }
  const roofM = cmpMat(0xffffff, TEX.roof, 0, [3, 2]), winM = cmpMat(0xffd27a, null, 0xffa040), darkWin = cmpMat(0x1a1820);
  const house = (x, z, ry, color) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g); g.name = 'prop';
    const wall = new THREE.Mesh(new THREE.BoxGeometry(12, 3.6, 8), cmpMat(color, TEX.siding, 0, [4, 1])); wall.position.y = 1.8; g.add(wall);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 6.6, 2.6, 4, 1).rotateY(Math.PI / 4), roofM); roof.scale.set(1.35, 1, 0.95); roof.position.y = 4.9; g.add(roof);
    for (const [wx, lit] of [[-3.8, cmpRng() < 0.6], [-1.4, false], [3.4, cmpRng() < 0.5]]) { const w = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 0.05), lit ? winM : darkWin); w.position.set(wx, 2, 4.03); g.add(w); }
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.05), cmpMat(0x5a2a2a)); door.position.set(1, 1.05, 4.03); g.add(door);
    const porch = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 1.6), cmpMat(0x6b5a4a)); porch.position.set(1, 0.15, 4.8); g.add(porch);
    g.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  };
  const hc = [0x8a6a7a, 0x6e7a8a, 0x8a8070, 0x7a6a8e, 0x9a8a78, 0x6a7a6e];
  [[-62, -66, 0], [-22, -66, 0], [18, -66, 0], [58, -66, 0], [-62, 66, Math.PI], [-22, 66, Math.PI], [18, 66, Math.PI], [58, 66, Math.PI], [-80, -28, Math.PI / 2], [-80, 14, Math.PI / 2], [80, -28, -Math.PI / 2], [80, 14, -Math.PI / 2]].forEach(([x, z, r], i) => house(x, z, r, hc[i % hc.length]));
  const leaf = cmpMat(0x2f3a22), leaf2 = cmpMat(0x3e4a26);
  for (const [x, z] of [[-42, -62], [0, -62], [38, -60], [-42, 62], [0, 62], [38, 60], [-74, -6], [74, -6], [-74, 34], [74, 34]]) {
    add(new THREE.CylinderGeometry(0.2, 0.35, 3, 7), bark, x, 1.5, z);
    for (let k = 0; k < 3; k++) add(new THREE.IcosahedronGeometry(1.8 + cmpRng() * 0.8, 0), k % 2 ? leaf : leaf2, x + (cmpRng() - 0.5) * 2, 3.8 + k * 0.7, z + (cmpRng() - 0.5) * 2);
  }
  // a parked car by the north-east house
  blk(2, 1, 4.4, cmpMat(0x2a2a30), 66, 0.35, -56); blk(1.8, 0.7, 2.4, cmpMat(0x1c1c22), 66, 1.35, -56.4);

  // --- markers
  D.points.PlayerSpawn = [0, 0, 30];
  D.points.LookAt = [0, 0, 0];
  D.points.ChestSpot = [0, 0, 24];
  D.points.Vending = [7, 0, 33.5];
  const spawns = [[0, -FZ + 8], [-38, -1], [35, -20], [40, 4], [-34, 24], [34, 24], [-24, -27], [22, -27], [-6, 34], [6, 34]];
  spawns.forEach(([x, z], i) => { D.points['EnemySpawn_' + (i + 1)] = [x, 0, z]; });
  D.bloodSpots.push([0, 30, 6, 0.5], [0, -FZ + 9, 6, 0.6], [-38, -4, 7, 0.5], [36, -20, 6, 0.4], [-32, 26, 6, 0.4], [34, 26, 6, 0.4], [0, 0, 24, 1.2], [0, 0, 46, 0.6]);
  D.bounds = { minX: -FX + 1.2, maxX: FX - 1.2, minZ: -FZ + 1.2, maxZ: FZ - 1.2 };
  return { root, fx, D };
}

// Glow pools, light beams, marquee bulbs and fires: additive, unlit, drawn on top of the merged map.
function cmpFx(group) {
  const pools = CMP.fx.filter((f) => f.kind === 'pool'), bulbs = CMP.fx.filter((f) => f.kind === 'bulb'), beams = CMP.fx.filter((f) => f.kind === 'beam');
  const poolMat = new THREE.MeshBasicMaterial({ map: TEX.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.75, vertexColors: false });
  const P = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), poolMat, pools.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  pools.forEach((f, i) => { P.setMatrixAt(i, m.compose(p.set(f.x, groundAt(f.x, f.z) + 0.08, f.z), q.identity(), s.set(f.r * 2, 1, f.r * 2))); P.setColorAt(i, c.setHex(f.color)); });
  P.instanceColor.needsUpdate = true; P.frustumCulled = false; P.renderOrder = 2;
  group.add(P);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe3a0 });
  const Bb = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 6, 4), bulbMat, bulbs.length);
  bulbs.forEach((f, i) => Bb.setMatrixAt(i, m.compose(p.set(f.x, f.y, f.z), q.identity(), s.set(1, 1, 1))));
  Bb.frustumCulled = false; group.add(Bb);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff2d0, transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  for (const f of beams) {
    const len = f.from.distanceTo(f.to), g = new THREE.CylinderGeometry(0.4, 3.2, len, 12, 1, true).translate(0, -len / 2, 0);
    const b = new THREE.Mesh(g, beamMat); b.position.copy(f.from);
    b.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), f.to.clone().sub(f.from).normalize());
    group.add(b);
  }
  const flameMat = new THREE.SpriteMaterial({ map: TEX.flame, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  CMP.flames = CMP.fires.map(([x, z]) => { const sp = new THREE.Sprite(flameMat); sp.position.set(x, 1.6, z); sp.scale.set(0.9, 1.4, 1); group.add(sp); return { sp, x, z, t: Math.random() * 10 }; });
  CMP.pools = P;
}
// Per frame: flames flicker
function updateCompound(dt) {
  if (!CMP.flames) return;
  for (const f of CMP.flames) { f.t += dt * 9; const k = 1 + Math.sin(f.t) * 0.12 + Math.sin(f.t * 2.3) * 0.08; f.sp.scale.set(0.9 * k, 1.4 * (2 - k), 1); }
}

// Builds the compound and hands it to js/map.js as Stage 1's map.
function buildCompoundStage() {
  const { root, fx, D } = cmpBuild();
  cmpFx(fx);
  applyStage(D, root, fx);
}
MAP.promise = Promise.resolve().then(() => { try { buildCompoundStage(); } catch (e) { console.warn('Stage map failed to build:', e); MAP.failed = true; } });
