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

const CMP = { fx: [], fires: [], scatter: [], decals: [], wires: [], pennants: [], smoke: [] };
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

  cmpDetail({ add, blk, col, solid, plane, sign, glowAt, root, D, FX, FZ, R, wood, steel, bark, tyreM, drum, crate, rustM, glassM });

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
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const Bb = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 6, 4), bulbMat, bulbs.length);
  bulbs.forEach((f, i) => { Bb.setMatrixAt(i, m.compose(p.set(f.x, f.y, f.z), q.identity(), s.setScalar(f.s || 1))); Bb.setColorAt(i, c.setHex(f.color || 0xffe3a0)); });
  Bb.instanceColor.needsUpdate = true;
  Bb.frustumCulled = false; group.add(Bb);
  CMP.bulbs = { mesh: Bb, list: bulbs, t: 0 };
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
  cmpDetailFx(group);
}
// Per frame: flames flicker
function updateCompound(dt) {
  if (!CMP.flames) return;
  for (const f of CMP.flames) { f.t += dt * 9; const k = 1 + Math.sin(f.t) * 0.12 + Math.sin(f.t * 2.3) * 0.08; f.sp.scale.set((f.w || 0.9) * k, (f.h || 1.4) * (2 - k), 1); }
  updateCompoundDetail(dt);
}

// Builds the compound and hands it to js/map.js as Stage 1's map.
function buildCompoundStage() {
  const { root, fx, D } = cmpBuild();
  cmpFx(fx);
  applyStage(D, root, fx);
}
// Stage 1 is the painted map (js/painted.js) unless PM_USE is off.
MAP.promise = (typeof PM_USE !== 'undefined' && PM_USE ? buildPaintedStage() : Promise.resolve().then(buildCompoundStage))
  .catch((e) => { console.warn('Stage map failed to build:', e); MAP.failed = true; });

// ---------------------------------------------------------------------------
// Set dressing (decisions.md 2026-11-09: "as much detail as possible given mobile limitations").
// Everything lit here is merged with the rest of the map (one draw per material); small things are
// named "Detail" (no ink lines, no shadows); scatter (grass, weeds, litter, ground stains, pennants,
// string-light bulbs, smoke) is instanced in cmpFx. Placement keeps the barrier gaps, the runway,
// the gate and the spawn points clear.
function cmpDetailTextures() {
  const T = {};
  T.graffiti = ['HONK', 'NO EXIT', 'SMILE :)', 'BOO', 'LIVE', 'CLOWNS ONLY'].map((w, i) => cmpCanvas(256, 128, (g, W, H) => {
    g.font = `bold ${w.length > 6 ? 46 : 70}px Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = ['#1a1a1a', '#ffffff', '#1a1a1a'][i % 3]; g.save(); g.translate(W / 2, H / 2); g.rotate((cmpRng() - 0.5) * 0.2);
    g.strokeText(w, 0, 0); g.fillStyle = ['#e0187a', '#2ec4ff', '#ffd23a', '#9fff6a', '#ff5a2a', '#b46bff'][i]; g.fillText(w, 0, 0); g.restore();
    g.fillStyle = 'rgba(0,0,0,0.25)'; for (let k = 0; k < 6; k++) g.fillRect(40 + cmpRng() * 170, H / 2 + 20, 2, 10 + cmpRng() * 30);
  }));
  T.poster = [0, 1, 2].map((k) => cmpCanvas(128, 192, (g, W, H) => {
    g.fillStyle = ['#e9d9b8', '#d8c8a8', '#f0e0c0'][k]; g.fillRect(0, 0, W, H);
    g.fillStyle = ['#b3121a', '#1a1a5a', '#2a1a10'][k]; g.font = 'bold 30px Impact, sans-serif'; g.textAlign = 'center';
    g.fillText(['TONIGHT', 'LIVE!', 'MAIN EVENT'][k], W / 2, 34);
    // two wrestler silhouettes squaring up
    g.fillStyle = '#1c110a';
    for (const sx of [-1, 1]) { const x = W / 2 + sx * 26; g.beginPath(); g.arc(x, 72, 12, 0, TAU); g.fill(); g.fillRect(x - 14, 84, 28, 46); g.fillRect(x - 12, 130, 10, 34); g.fillRect(x + 2, 130, 10, 34); g.fillRect(x - sx * 14 - 6, 90, 12, 30); }
    g.fillStyle = '#b3121a'; g.font = 'bold 20px sans-serif'; g.fillText('VS', W / 2, 110);
    grime(g, W, H, 14, 0.3);
  }));
  T.ticket = cmpCanvas(128, 48, (g, W, H) => { g.fillStyle = '#7a1018'; g.fillRect(0, 0, W, H); g.fillStyle = '#ffd23a'; g.font = 'bold 30px Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TICKETS', W / 2, H / 2 + 2); });
  T.neon = cmpCanvas(256, 96, (g, W, H) => { g.fillStyle = '#120612'; g.fillRect(0, 0, W, H); g.font = 'bold 70px Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ff3bd0'; g.shadowBlur = 18; g.fillStyle = '#ff7ae8'; g.fillText('LIVE', W / 2, H / 2 + 4); g.fillText('LIVE', W / 2, H / 2 + 4); });
  T.popcorn = cmpCanvas(128, 48, (g, W, H) => { g.fillStyle = '#f0e6c8'; g.fillRect(0, 0, W, H); g.fillStyle = '#b3121a'; g.font = 'bold 28px Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('POPCORN', W / 2, H / 2 + 2); });
  T.monitor = cmpCanvas(64, 48, (g, W, H) => { g.fillStyle = '#103040'; g.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 3) { g.fillStyle = `rgba(80,200,255,${0.15 + cmpRng() * 0.2})`; g.fillRect(0, y, W, 1); } g.fillStyle = '#e9f6ff'; g.fillRect(10, 14, 20, 16); });
  T.window = cmpCanvas(64, 64, (g, W, H) => { g.fillStyle = '#ffcc70'; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(120,60,20,0.5)'; g.fillRect(30, 0, 4, H); g.fillRect(0, 30, W, 4); g.fillStyle = 'rgba(80,30,10,0.35)'; g.fillRect(0, 0, 14, H); });
  // scatter atlases (alpha)
  T.grassTuft = cmpCanvas(64, 64, (g, W, H) => { for (let i = 0; i < 18; i++) { const x = 8 + cmpRng() * 48; g.strokeStyle = `rgb(${110 + cmpRng() * 50},${130 + cmpRng() * 50},${50 + cmpRng() * 30})`; g.lineWidth = 2 + cmpRng() * 2; g.beginPath(); g.moveTo(x, H); g.quadraticCurveTo(x + (cmpRng() - 0.5) * 20, H * 0.5, x + (cmpRng() - 0.5) * 26, 6 + cmpRng() * 20); g.stroke(); } });
  T.litter = cmpCanvas(64, 64, (g, W, H) => {
    // paper, a cup, a can, a bottle, a flyer in one sprite (each instance shows a random rotation)
    g.fillStyle = '#e8e0d0'; g.save(); g.translate(18, 18); g.rotate(0.4); g.fillRect(-9, -6, 18, 12); g.restore();
    g.fillStyle = '#c0141a'; g.beginPath(); g.ellipse(46, 16, 6, 9, 0.6, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.fillRect(43, 12, 6, 3);
    g.fillStyle = '#7a8a90'; g.beginPath(); g.ellipse(18, 48, 9, 4, -0.3, 0, TAU); g.fill();
    g.fillStyle = 'rgba(60,120,60,0.85)'; g.save(); g.translate(46, 46); g.rotate(-0.8); g.fillRect(-3, -12, 6, 24); g.restore();
  });
  T.decal = {
    puddle: cmpCanvas(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 10, 64, 64, 62); gr.addColorStop(0, 'rgba(18,16,26,0.85)'); gr.addColorStop(0.8, 'rgba(20,18,28,0.7)'); gr.addColorStop(1, 'rgba(20,18,28,0)'); g.fillStyle = gr; g.beginPath(); for (let i = 0; i <= 20; i++) { const a = i / 20 * TAU, r = 50 + Math.sin(a * 3) * 8 + cmpRng() * 6; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r * 0.7); } g.fill(); g.strokeStyle = 'rgba(160,140,220,0.35)'; g.lineWidth = 2; g.beginPath(); g.ellipse(52, 54, 18, 6, -0.3, 0, TAU); g.stroke(); }),
    oil: cmpCanvas(128, 128, (g) => { for (let i = 0; i < 5; i++) { const gr = g.createRadialGradient(64 + (cmpRng() - 0.5) * 40, 64 + (cmpRng() - 0.5) * 40, 2, 64, 64, 50); gr.addColorStop(0, 'rgba(8,6,8,0.7)'); gr.addColorStop(1, 'rgba(8,6,8,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); } }),
    tracks: cmpCanvas(64, 256, (g) => { g.fillStyle = 'rgba(20,14,10,0.55)'; for (const x of [12, 44]) for (let y = 0; y < 256; y += 8) g.fillRect(x - 5 + Math.sin(y * 0.05) * 2, y, 10, 5); }),
    cracks: cmpCanvas(128, 128, (g) => { g.strokeStyle = 'rgba(10,8,10,0.75)'; g.lineWidth = 2; for (let i = 0; i < 5; i++) { g.beginPath(); let x = 64, y = 64; g.moveTo(x, y); for (let k = 0; k < 7; k++) { x += (cmpRng() - 0.5) * 36; y += (cmpRng() - 0.5) * 36; g.lineTo(x, y); } g.stroke(); } }),
    manhole: cmpCanvas(64, 64, (g) => { g.fillStyle = '#2a2826'; g.beginPath(); g.arc(32, 32, 30, 0, TAU); g.fill(); g.strokeStyle = '#4a4642'; g.lineWidth = 2; for (let r = 8; r < 30; r += 7) { g.beginPath(); g.arc(32, 32, r, 0, TAU); g.stroke(); } }),
    confetti: cmpCanvas(128, 128, (g) => { for (let i = 0; i < 70; i++) { g.fillStyle = ['#ff4a5a', '#ffd23a', '#4fc6ff', '#9fff6a', '#ff8a2a', '#d07aff', '#fff6e0'][i % 7]; g.save(); g.translate(8 + cmpRng() * 112, 8 + cmpRng() * 112); g.rotate(cmpRng() * 6); if (i % 7 === 6) { g.beginPath(); g.arc(0, 0, 3.5, 0, TAU); g.fill(); } else g.fillRect(-3, -1.5, 6, 3); g.restore(); } }),
    patch: cmpCanvas(128, 128, (g) => { for (let i = 0; i < 9; i++) { const x = 30 + cmpRng() * 68, y = 30 + cmpRng() * 68, gr = g.createRadialGradient(x, y, 2, x, y, 30 + cmpRng() * 20); const dk = cmpRng() < 0.5; gr.addColorStop(0, dk ? 'rgba(22,16,12,0.28)' : 'rgba(120,100,80,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); } for (let i = 0; i < 160; i++) { const v = 40 + cmpRng() * 90; g.fillStyle = `rgba(${v},${v * 0.9},${v * 0.8},${0.5 * cmpRng()})`; const r = 0.8 + cmpRng() * 2.2, a = cmpRng() * TAU, d = cmpRng() * 48; g.beginPath(); g.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, r, 0, TAU); g.fill(); } }),
    drip: cmpCanvas(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 46); gr.addColorStop(0, 'rgba(120,6,10,0.95)'); gr.addColorStop(0.7, 'rgba(80,2,6,0.9)'); gr.addColorStop(1, 'rgba(60,2,6,0)'); g.fillStyle = gr; g.beginPath(); for (let i = 0; i <= 20; i++) { const a = i / 20 * TAU, r = 40 + Math.sin(a * 4) * 6 + cmpRng() * 6; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } g.fill(); g.fillStyle = 'rgba(140,10,14,0.95)'; for (let i = 0; i < 14; i++) { const a = cmpRng() * TAU, d = 44 + cmpRng() * 16; g.beginPath(); g.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 1.5 + cmpRng() * 3, 0, TAU); g.fill(); } g.fillStyle = 'rgba(255,170,170,0.22)'; g.beginPath(); g.ellipse(52, 52, 12, 5, -0.6, 0, TAU); g.fill(); }),
    leaves: cmpCanvas(128, 128, (g) => { for (let i = 0; i < 40; i++) { g.fillStyle = ['#6a4a20', '#8a5a20', '#4a3a1a', '#a06a28'][i % 4]; g.save(); g.translate(cmpRng() * 128, cmpRng() * 128); g.rotate(cmpRng() * 6); g.beginPath(); g.ellipse(0, 0, 5, 2.5, 0, 0, TAU); g.fill(); g.restore(); } }),
  };
  T.smoke = cmpCanvas(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(90,80,90,0.5)'); gr.addColorStop(1, 'rgba(60,50,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  return T;
}

function cmpDetail(H) {
  const { add, blk, col, solid, plane, sign, glowAt, D, FX, FZ, R, wood, steel, bark, tyreM, drum, crate, rustM, glassM } = H;
  const T = (CMP.T = cmpDetailTextures());
  const det = (geo, mat, x, y, z, ry = 0) => add(geo, mat, x, y, z, ry, 'Detail');
  const dblk = (w, h, d, mat, x, y, z, ry = 0) => blk(w, h, d, mat, x, y, z, ry, 'Detail');
  const metal = cmpMat(0x6a6a72), dark = cmpMat(0x1e1a1c), red = cmpMat(0xb3121a), white = cmpMat(0xe8e0d0), blue = cmpMat(0x2a4a8a), yellow = cmpMat(0xd8b23a), green = cmpMat(0x2f5a3a);

  // ===== the ring and ringside
  plane(R.half * 2 + 3, R.half * 2 + 3, cmpMat(0x2a3a6a), R.x, 0.04, R.z, 'Road'); // padded mats round the ring
  for (const [sx, sz] of [[1, 1], [-1, -1]]) { // steel steps at two corners
    for (let k = 0; k < 3; k++) dblk(1.2, 0.3 * (k + 1), 0.5, metal, R.x + sx * (R.half + 1.1 - k * 0.35), 0, R.z + sz * (R.half + 0.4));
  }
  // announcer table: monitors, a bell, folding chairs
  const at = [-9.5, 9.5];
  solid(3.2, 0.85, 1, cmpMat(0x3a3a40), at[0], 0, at[1], 0);
  for (let i = 0; i < 2; i++) { dblk(0.6, 0.4, 0.06, dark, at[0] - 0.7 + i * 1.4, 0.85, at[1] - 0.2); det(new THREE.PlaneGeometry(0.52, 0.32), cmpMat(0xffffff, T.monitor, 0x4ab0e0), at[0] - 0.7 + i * 1.4, 1.07, at[1] - 0.16, 0); }
  det(new THREE.CylinderGeometry(0.14, 0.18, 0.18, 10), yellow, at[0] + 1.2, 0.95, at[1] + 0.1);
  const chair = (x, z, ry, tipped) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.name = 'Detail'; H.root.add(g);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 0.42), metal); seat.position.y = 0.45; g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.04), metal); back.position.set(0, 0.68, -0.2); g.add(back);
    for (const [a, b] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.45, 0.03), metal); l.position.set(a, 0.22, b); g.add(l); }
    if (tipped) { g.rotation.x = Math.PI / 2 - 0.1; g.position.y = 0.22; }
  };
  chair(at[0] - 0.8, at[1] + 1, Math.PI, false); chair(at[0] + 0.8, at[1] + 1, Math.PI, false);
  for (const [x, z, t] of [[8, 9, 1], [-8, -9, 0], [9.5, -3, 1], [-3, -9.5, 1], [4, 10.5, 0], [-10.5, 3, 1], [18, -13, 1], [-19, 14, 0], [12, 26, 0], [-12, -22, 1]]) chair(x, z, cmpRng() * TAU, t);
  // a ladder lying by the ring, a broken table
  const lad = new THREE.Group(); lad.position.set(-2, 0.08, 8.6); lad.rotation.y = 0.3; lad.name = 'Detail'; H.root.add(lad);
  for (const s of [-0.25, 0.25]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 3.2), yellow); r.position.x = s; lad.add(r); }
  for (let i = 0; i < 8; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), yellow); r.position.z = -1.4 + i * 0.4; lad.add(r); }
  const tb = dblk(1.8, 0.05, 0.75, cmpMat(0xd8d0c4), 8.5, 0.35, -8.5, 0.5); tb.rotation.z = 0.35;
  dblk(1.0, 0.05, 0.75, cmpMat(0xd8d0c4), 9.8, 0.02, -7.6, 1.1);
  // trash cans inside the barriers
  for (const [x, z] of [[19, 14.5], [-19, -14.5], [19, -14.5], [-19, 14.5]]) { solid(0.6, 0.9, 0.6, metal, x, 0, z, 0); det(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 10), metal, x, 0.95, z); }

  // ===== bleachers: supports, rails and litter under them
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * 15.5, z = sz * 5.5;
    dblk(0.06, 0.06, 8, steel, x + sx * 2.05, 2.15, z);
    for (let i = 0; i < 5; i++) dblk(0.05, 0.8, 0.05, steel, x + sx * 2.05, 1.35, z - 3.8 + i * 1.9);
    for (let t = 0; t < 3; t++) for (let i = 0; i < 4; i++) dblk(0.2, 0.05, 0.2, red, x + sx * (t * 1.3 - 1.3) + (cmpRng() - 0.5), 0.45 + t * 0.45, z - 3 + i * 2 + cmpRng()); // dropped cups
    for (let k = 0; k < 12; k++) CMP.scatter.push({ kind: 'litter', x: x + (cmpRng() - 0.5) * 6, z: z + (cmpRng() - 0.5) * 9, s: 0.5 });
  }

  // ===== power: generators by the floodlights, cables snaking over the ground
  for (const [x, z, tx, tz] of [[-27, -14, -11.5, -12.5], [27, 14, 11.5, 12.5], [-27, 14, -11.5, 12.5], [27, -14, 11.5, -12.5]]) {
    solid(1.6, 1.1, 0.9, yellow, x, 0, z, 0);
    dblk(1.62, 0.12, 0.92, dark, x, 1.1, z); det(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 6), dark, x + 0.5, 1.45, z);
    CMP.smoke.push([x + 0.5, 1.75, z, 0.5]);
    // the cable: a chain of short black strips wandering to the tower
    let px = x, pz = z;
    for (let k = 1; k <= 10; k++) { const t = k / 10, nx = x + (tx - x) * t + Math.sin(k * 1.7) * 0.6, nz = z + (tz - z) * t + Math.cos(k * 1.3) * 0.6; const len = Math.hypot(nx - px, nz - pz); dblk(0.07, 0.05, len, dark, (px + nx) / 2, 0.03, (pz + nz) / 2, Math.atan2(nx - px, nz - pz)); px = nx; pz = nz; }
  }

  // ===== string lights and pennants strung across the yard (catenaries between poles)
  const pole = (x, z, h) => { det(new THREE.CylinderGeometry(0.08, 0.1, h, 6), bark, x, h / 2, z); col(x, z, 0.3, 0.3, h); return [x, h, z]; };
  const strings = [
    [pole(-30, -22, 6), pole(30, -22, 6)], [pole(-30, 22, 6), pole(30, 22, 6)], [[-30, 6, -22], [-30, 6, 22]], [[30, 6, -22], [30, 6, 22]],
    [[-30, 6, -22], [0, 8.5, -FZ + 5.4]], [[30, 6, -22], [0, 8.5, -FZ + 5.4]], [[-30, 6, 22], [-5.4, 4.6, FZ]], [[30, 6, 22], [5.4, 4.6, FZ]],
  ];
  const BULB_COLORS = [0xff4a5a, 0xffd23a, 0x4fc6ff, 0x9fff6a, 0xff8a2a, 0xd07aff];
  strings.forEach(([a, b], si) => {
    const n = Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 1.6), pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n, sag = Math.sin(t * Math.PI) * 1.4; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag, a[2] + (b[2] - a[2]) * t]); }
    CMP.wires.push(pts);
    pts.forEach((p, i) => {
      if (i === 0 || i === n) return;
      if (si % 2 === 0) CMP.fx.push({ kind: 'bulb', x: p[0], y: p[1] - 0.12, z: p[2], color: BULB_COLORS[i % BULB_COLORS.length], s: 0.7 });
      else CMP.pennants.push({ x: p[0], y: p[1], z: p[2], ry: Math.atan2(b[0] - a[0], b[2] - a[2]), color: [0xb3121a, 0xe8e0d0, 0xd8b23a][i % 3] });
    });
  });

  // ===== barbed wire along the top of the fence
  const barb = cmpMat(0x5a5a60);
  const wireRun = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / 0.7);
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; const m = det(new THREE.TorusGeometry(0.26, 0.015, 3, 6), barb, x0 + (x1 - x0) * t, 3.3, z0 + (z1 - z0) * t, Math.atan2(x1 - x0, z1 - z0) + 0.3); m.rotation.x = 0.25; }
  };
  wireRun(-FX, -FZ, FX, -FZ); wireRun(-FX, FZ, -6.4, FZ); wireRun(6.4, FZ, FX, FZ); wireRun(-FX, -FZ, -FX, FZ); wireRun(FX, -FZ, FX, FZ);

  // ===== graffiti and posters on the inside of the fence
  const insideFence = [[-20, -FZ + 0.1, 0], [16, -FZ + 0.1, 0], [-FX + 0.1, -4, Math.PI / 2], [-FX + 0.1, 30, Math.PI / 2], [FX - 0.1, 22, -Math.PI / 2], [-24, FZ - 0.1, Math.PI], [22, FZ - 0.1, Math.PI], [FX - 0.1, -30, -Math.PI / 2]];
  insideFence.forEach(([x, z, ry], i) => {
    const m = sign(3.2, 1.6, T.graffiti[i % T.graffiti.length], x, 1.2, z, ry);
    m.material.alphaTest = 0.4; m.name = 'Detail';
  });
  for (let i = 0; i < 14; i++) {
    const side = i % 4, t = (cmpRng() - 0.5) * 1.6;
    const [x, z, ry] = side === 0 ? [t * FX, -FZ + 0.12, 0] : side === 1 ? [t * FX, FZ - 0.12, Math.PI] : side === 2 ? [-FX + 0.12, t * FZ, Math.PI / 2] : [FX - 0.12, t * FZ, -Math.PI / 2];
    if (Math.abs(x) < 7 && z > 0) continue;
    sign(0.75, 1.1, T.poster[i % 3], x, 1.3 + cmpRng() * 0.4, z, ry + (cmpRng() - 0.5) * 0.1).name = 'Detail';
  }

  // ===== by the gate: a ticket booth with a neon sign, a popcorn cart, cones, a turnstile
  solid(2.4, 2.4, 2, cmpMat(0x7a1018, TEX.curtain, 0, [2, 1]), -15, 0, 33.5, 0);
  dblk(2.8, 0.3, 2.4, cmpMat(0xffffff, TEX.stripes, 0, [3, 1]), -15, 2.4, 33.5);
  det(new THREE.PlaneGeometry(1.2, 0.8), cmpMat(0xffcc70, null, 0xffa040), -15, 1.4, 32.48, Math.PI);
  sign(1.8, 0.6, T.ticket, -15, 2.0, 32.47, Math.PI).name = 'Detail';
  sign(2.4, 0.9, T.neon, -15, 3.2, 33.5 - 1.05, Math.PI, 0xff40c0).name = 'Detail'; sign(2.4, 0.9, T.neon, -15, 3.2, 33.5 - 1.02, 0, 0xff40c0).name = 'Detail';
  glowAt(-15, 31, 4, 0xff40c0);
  // popcorn cart
  solid(1.6, 1.2, 1, red, 13, 0.3, 31, 0.3);
  dblk(1.4, 0.8, 0.9, cmpMat(0xfff0c0, null, 0x806020), 13, 1.5, 31, 0.3);
  dblk(1.9, 0.12, 1.3, cmpMat(0xffffff, TEX.stripes, 0, [2, 1]), 13, 2.4, 31, 0.3);
  sign(1.4, 0.45, T.popcorn, 13 + Math.sin(0.3) * 0.52, 0.9, 31 + Math.cos(0.3) * 0.52, 0.3).name = 'Detail';
  for (const s of [-1, 1]) det(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 10).rotateZ(Math.PI / 2), tyreM, 13 + s * 0.8, 0.3, 31);
  glowAt(13, 31, 3.5, 0xffc060);
  for (const [x, z] of [[-6.5, 30], [6.5, 30], [-3.5, -22], [3.5, -22], [-3.2, 21], [3.2, 21], [-26, 3], [26, -3]]) { det(new THREE.ConeGeometry(0.22, 0.6, 8), cmpMat(0xff6a1a), x, 0.3, z); dblk(0.4, 0.04, 0.4, dark, x, 0, z); }

  // ===== a prize booth with stuffed toys, animal cages, porta-potties, dumpsters, pallets, sandbags
  solid(4, 0.9, 1.2, cmpMat(0x3a2a6a), -14, 0, -26, 0);
  for (const s of [-1, 1]) dblk(0.12, 2.4, 0.12, wood, -14 + s * 2, 0, -26.5);
  dblk(4.4, 0.15, 1.6, cmpMat(0xffffff, TEX.stripes, 0, [3, 1]), -14, 2.4, -26.3);
  for (let i = 0; i < 9; i++) { det(new THREE.IcosahedronGeometry(0.2, 1), cmpMat([0xff7ac0, 0x7ad0ff, 0xffe066, 0x9fff6a, 0xb47aff][i % 5]), -15.6 + i * 0.4, 1.1 + (i % 2) * 0.1, -26.1); }
  glowAt(-14, -24.5, 3.5, 0xd07aff);
  const cage = (x, z) => {
    dblk(3, 0.15, 2, dark, x, 0, z); dblk(3, 0.1, 2, dark, x, 2.2, z);
    for (let i = 0; i <= 10; i++) { dblk(0.05, 2.1, 0.05, metal, x - 1.5 + i * 0.3, 0.1, z - 1); dblk(0.05, 2.1, 0.05, metal, x - 1.5 + i * 0.3, 0.1, z + 1); }
    for (let i = 0; i <= 6; i++) { dblk(0.05, 2.1, 0.05, metal, x - 1.5, 0.1, z - 1 + i * 0.33); dblk(0.05, 2.1, 0.05, metal, x + 1.5, 0.1, z - 1 + i * 0.33); }
    col(x, z, 3.1, 2.1, 2.3);
    CMP.scatter.push({ kind: 'grass', x, z, s: 0.8 }, { kind: 'litter', x: x + 0.5, z, s: 0.6 });
  };
  cage(-41, 15); cage(45, -4);
  for (const [x, z] of [[-46, -21], [-46, -18.8]]) { solid(1.1, 2.3, 1.1, cmpMat(0x2a5aa8), x, 0, z, 0); dblk(1.15, 0.12, 1.15, cmpMat(0xe8e0d0), x, 2.3, z); dblk(0.05, 1.8, 0.7, cmpMat(0x1e3e78), x + 0.56, 0.2, z); }
  for (const [x, z, ry] of [[46, 25, 0], [-21, -35.6, 0]]) { solid(2.2, 1.4, 1.4, green, x, 0, z, ry); dblk(2.3, 0.1, 1.5, cmpMat(0x1e3a26), x, 1.42, z, ry); CMP.scatter.push({ kind: 'litter', x: x + 1.5, z: z + 1, s: 0.8 }, { kind: 'litter', x: x - 1.2, z: z + 1.4, s: 0.8 }); }
  for (const [x, z, n] of [[-30, -35, 4], [31, -35.5, 3], [-46, 4, 5]]) { for (let k = 0; k < n; k++) dblk(1.2, 0.14, 1, cmpMat(0x8a6a44), x, k * 0.15, z, (k % 2) * 0.1); col(x, z, 1.2, 1, n * 0.15); }
  for (let i = 0; i < 6; i++) dblk(0.9, 0.3, 0.5, cmpMat(0x8a7a5a), -16 + (i % 3) * 0.95, Math.floor(i / 3) * 0.3, 22, 0);
  col(-15, 22, 3, 0.6, 0.6);

  // ===== a burned-out car in the yard, junk piles by the shacks
  solid(1.9, 0.9, 4.2, cmpMat(0x2a2220, TEX.rust, 0, [2, 1]), -20, 0.25, 31, 0.4);
  dblk(1.6, 0.6, 2, cmpMat(0x1a1616), -20 + Math.sin(0.4) * 0.3, 1.15, 31 + Math.cos(0.4) * 0.3, 0.4);
  CMP.smoke.push([-20, 1.6, 31, 0.35]);
  for (const [x, z] of [[-30, 31.5], [39.5, 31.5], [-27, -28], [26, -28], [-40, -35], [45, 33]]) {
    for (let k = 0; k < 6; k++) { const s = 0.3 + cmpRng() * 0.5; dblk(s, s * 0.6, s * 0.8, [rustM, crate, drum, dark][k % 4], x + (cmpRng() - 0.5) * 1.6, 0, z + (cmpRng() - 0.5) * 1.2, cmpRng() * 3); }
    det(new THREE.TorusGeometry(0.4, 0.17, 6, 10).rotateX(Math.PI / 2 - 0.4), tyreM, x + 0.6, 0.2, z - 0.4);
  }
  // shack windows (warm light) and corrugated roof ribs
  for (const [x, z, w, d] of [[-34, 28, 7, 5], [36, 28, 6, 5], [-24, -31, 6, 4], [22, -31, 5, 4]]) {
    det(new THREE.PlaneGeometry(1, 0.7), cmpMat(0xffffff, T.window, 0xd08030), x - w / 4, 1.8, z + d / 2 + 0.03, 0);
    for (let i = 0; i < 8; i++) dblk(0.05, 0.06, d + 0.6, cmpMat(0x5a5048), x - w / 2 + 0.4 + i * (w - 0.8) / 7, 3.34, z);
    glowAt(x - w / 4, z + d / 2 + 1, 2.5, 0xffa040);
  }
  // the bus: broken windows, a flat tyre, a door, graffiti
  sign(4, 1, T.graffiti[0], -39.44, 1.2, -8, Math.PI / 2).name = 'Detail';
  dblk(0.06, 1.8, 0.9, dark, -39.48, 0.5, -12.5);
  // the trailer: an awning, steps, lawn chairs, a grill
  dblk(4, 0.06, 2, cmpMat(0xffffff, TEX.stripes, 0, [3, 1]), 37, 3, -21.2);
  for (const s of [-1, 1]) dblk(0.05, 2.6, 0.05, steel, 37 + s * 1.9, 0, -20.3);
  for (let k = 0; k < 3; k++) dblk(0.9, 0.2 * (k + 1), 0.3, metal, 34.5, 0, -21.7 + k * 0.3);
  chair(39, -20.6, 0.4, false); chair(41.2, -20.9, -0.3, false);
  det(new THREE.SphereGeometry(0.3, 8, 6, 0, TAU, 0, Math.PI / 2), dark, 43, 0.8, -20); dblk(0.04, 0.7, 0.04, dark, 43, 0, -20);
  CMP.smoke.push([43, 1.1, -20, 0.25]);
  // the striped tent: guy ropes and stakes, bunting from its peak
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, x0 = 42 + Math.cos(a) * 4.3, z0 = 10 + Math.sin(a) * 4.3, x1 = 42 + Math.cos(a) * 6.3, z1 = 10 + Math.sin(a) * 6.3; CMP.wires.push([[x0, 2.6, z0], [x1, 0.05, z1]]); dblk(0.06, 0.3, 0.06, wood, x1, 0, z1); }

  // ===== the ground: grass and weeds, litter, puddles, oil stains, tyre tracks, cracks
  for (let i = 0; i < 260; i++) { // weeds along the fence and round props
    const side = i % 4, t = (cmpRng() - 0.5) * 2;
    const [x, z] = side === 0 ? [t * FX, -FZ + 0.6 + cmpRng()] : side === 1 ? [t * FX, FZ - 0.6 - cmpRng()] : side === 2 ? [-FX + 0.6 + cmpRng(), t * FZ] : [FX - 0.6 - cmpRng(), t * FZ];
    CMP.scatter.push({ kind: 'grass', x, z, s: 0.6 + cmpRng() * 0.6 });
  }
  for (let i = 0; i < 220; i++) { const x = (cmpRng() - 0.5) * 2 * (FX - 3), z = (cmpRng() - 0.5) * 2 * (FZ - 3); if (Math.abs(x) < R.half + 2 && Math.abs(z) < R.half + 2) continue; CMP.scatter.push({ kind: 'grass', x, z, s: 0.4 + cmpRng() * 0.5 }); }
  for (let i = 0; i < 260; i++) { const x = (cmpRng() - 0.5) * 2 * (FX - 2), z = (cmpRng() - 0.5) * 2 * (FZ - 2); if (Math.abs(x) < R.half && Math.abs(z) < R.half) continue; CMP.scatter.push({ kind: 'litter', x, z, s: 0.35 + cmpRng() * 0.3 }); }
  for (let i = 0; i < 420; i++) { const a = cmpRng() * TAU, r = 60 + cmpRng() * 50; CMP.scatter.push({ kind: 'grass', x: Math.cos(a) * r * 1.2, z: Math.sin(a) * r, s: 0.8 + cmpRng() * 0.7 }); } // lawns outside
  const dec = (kind, x, z, s, ry = cmpRng() * TAU, y = 0.075) => CMP.decals.push({ kind, x, z, s, ry, y });
  for (const [x, z, s] of [[-12, 18, 3], [18, 24, 2.4], [-30, -8, 3.4], [8, -26, 2.2], [32, 0, 2.6], [-40, 26, 2.4], [26, -12, 2], [-8, 28, 1.8], [0, 46, 3], [-48, 49, 2.6], [44, 49, 2.2], [61, -20, 2.8], [-61, 12, 2.4]]) dec('puddle', x, z, s);
  for (const [x, z, s] of [[-40, -3, 3], [37, -22, 2.4], [-27, -14, 1.6], [27, 14, 1.6], [-27, 14, 1.4], [27, -14, 1.4], [-20, 31, 2.6], [20, 49, 2], [-30, 49, 2.4], [61, 30, 2]]) dec('oil', x, z, s);
  for (const [x, z, ry, len] of [[0, 26, 0.1, 10], [-34, -20, 1.3, 12], [30, -30, 0.6, 9], [-12, -14, 2.2, 8], [40, 20, 0.3, 10]]) CMP.decals.push({ kind: 'tracks', x, z, s: 1.6, l: len, ry, y: 0.074 });
  for (let i = 0; i < 26; i++) { const s = cmpRng() < 0.5 ? -1 : 1; const onX = cmpRng() < 0.5; dec('cracks', onX ? (cmpRng() - 0.5) * 120 : s * 61 + (cmpRng() - 0.5) * 6, onX ? s * 49 + (cmpRng() - 0.5) * 6 : (cmpRng() - 0.5) * 90, 2 + cmpRng() * 3); }
  for (const [x, z] of [[-30, 49], [30, 49], [-30, -49], [30, -49], [61, 0], [-61, 0]]) dec('manhole', x, z, 1.1);
  for (let i = 0; i < 30; i++) { const s = cmpRng() < 0.5 ? -1 : 1, onX = cmpRng() < 0.5; dec('leaves', onX ? (cmpRng() - 0.5) * 130 : s * (55.5 + (cmpRng() - 0.5)), onX ? s * (42.5 + (cmpRng() - 0.5) * 2) : (cmpRng() - 0.5) * 100, 1.5 + cmpRng() * 2); }

  // ===== outside: picket fences, mailboxes, bins, hydrants, more parked cars, power poles and wires
  const picket = cmpMat(0xd8d0c0);
  const yard = (x, z, ry) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.name = 'Detail'; H.root.add(g);
    for (let i = -7; i <= 7; i++) { if (Math.abs(i) < 2) continue; const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9 + (i % 2) * 0.1, 0.05), picket); p.position.set(i * 0.8, 0.45, 7.5); g.add(p); }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(12, 0.06, 0.04), picket); rail.position.set(0, 0.6, 7.5); g.add(rail);
    const mb = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.45), cmpMat([0x2a4a8a, 0x8a1a1a, 0x2a2a2a][Math.floor(cmpRng() * 3)])); mb.position.set(2.2, 1.1, 8); g.add(mb);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1, 0.08), picket); post.position.set(2.2, 0.5, 8); g.add(post);
    const bin = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1, 0.6), cmpMat(0x2a3a2a)); bin.position.set(-3, 0.5, 8.4); bin.rotation.z = cmpRng() < 0.3 ? 1.4 : 0; g.add(bin);
    g.traverse((o) => { o.name = 'Detail'; });
  };
  [[-62, -66, 0], [-22, -66, 0], [18, -66, 0], [58, -66, 0], [-62, 66, Math.PI], [-22, 66, Math.PI], [18, 66, Math.PI], [58, 66, Math.PI]].forEach(([x, z, r]) => yard(x, z, r));
  for (const [x, z] of [[-45, 44], [40, -44], [57, 20], [-57, -24]]) { det(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 8), cmpMat(0xc0141a), x, 0.35, z); det(new THREE.SphereGeometry(0.17, 8, 4, 0, TAU, 0, Math.PI / 2), cmpMat(0xc0141a), x, 0.7, z); }
  const car = (x, z, ry, color) => {
    solid(2, 0.75, 4.3, cmpMat(color), x, 0.3, z, ry);
    const top = blk(1.75, 0.6, 2.3, cmpMat(0x1c1c22), x - Math.sin(ry) * 0.3, 1.05, z - Math.cos(ry) * 0.3, ry); top.name = 'Detail';
    for (const [a, b] of [[-0.95, -1.4], [0.95, -1.4], [-0.95, 1.4], [0.95, 1.4]]) det(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10).rotateZ(Math.PI / 2), tyreM, x + a * Math.cos(ry) + b * Math.sin(ry), 0.34, z - a * Math.sin(ry) + b * Math.cos(ry), ry);
    det(new THREE.BoxGeometry(1.6, 0.12, 0.05), cmpMat(0xfff0c0, null, 0xffd080), x + Math.sin(ry) * 2.16, 0.7, z + Math.cos(ry) * 2.16, ry);
  };
  car(-40, 46, Math.PI / 2, 0x6a1a1a); car(24, 52, -Math.PI / 2, 0x2a4a6a); car(58, 30, 0, 0x5a5a4a); car(-58, -12, Math.PI, 0x3a5a3a); car(-64, -56, 0.2, 0x8a7a5a);
  for (const [x, z] of [[-45, -58], [-5, -58], [35, -58], [-45, 58], [-5, 58], [35, 58]]) {
    det(new THREE.CylinderGeometry(0.12, 0.16, 8, 6), bark, x, 4, z);
    dblk(2.2, 0.12, 0.12, bark, x, 7.3, z);
  }
  for (const zz of [-58, 58]) CMP.wires.push([[-45, 7.4, zz], [-25, 6.6, zz], [-5, 7.4, zz], [15, 6.6, zz], [35, 7.4, zz]]);
  cmpFill(H, T, det, dblk, chair);
}

// The set dressing's own draws: ground decals and litter (one mesh, one atlas), grass and weeds (one
// mesh), overhead wires (one line set), bunting (one mesh), and smoke and embers (two point sets,
// animated on the GPU from one time uniform).
function cmpAtlas(T) {
  const A = document.createElement('canvas'); A.width = A.height = 512;
  const g = A.getContext('2d'), R = {};
  const put = (k, img, x, y, w, h) => { g.drawImage(img, x, y, w, h); R[k] = [x / 512, 1 - (y + h) / 512, w / 512, h / 512]; };
  const D = T.decal;
  put('puddle', D.puddle.image, 0, 0, 128, 128); put('oil', D.oil.image, 128, 0, 128, 128); put('cracks', D.cracks.image, 256, 0, 128, 128); put('leaves', D.leaves.image, 384, 0, 128, 128);
  put('manhole', D.manhole.image, 0, 128, 128, 128); put('tracks', D.tracks.image, 256, 128, 64, 256);
  put('confetti', D.confetti.image, 384, 128, 128, 128); put('patch', D.patch.image, 0, 256, 128, 128); put('drip', D.drip.image, 128, 256, 128, 128);
  g.drawImage(T.litter.image, 128, 128, 128, 128);
  for (let i = 0; i < 4; i++) R['litter' + i] = [(128 + (i % 2) * 64) / 512, 1 - (128 + (Math.floor(i / 2) + 1) * 64) / 512, 64 / 512, 64 / 512];
  const t = new THREE.CanvasTexture(A); t.anisotropy = 2;
  return { tex: t, R };
}
function cmpDetailFx(group) {
  const T = CMP.T; if (!T) return;
  const { tex, R } = cmpAtlas(T);
  // --- flat quads on the ground
  const pos = [], uv = [], idx = [];
  const quad = (x, z, w, l, ry, y, r) => {
    const c = Math.cos(ry), sn = Math.sin(ry), h = groundAt(x, z) + y, n = pos.length / 3;
    for (const [a, b, u, v] of [[-w / 2, -l / 2, 0, 0], [w / 2, -l / 2, 1, 0], [w / 2, l / 2, 1, 1], [-w / 2, l / 2, 0, 1]]) {
      pos.push(x + a * c + b * sn, h, z - a * sn + b * c); uv.push(r[0] + u * r[2], r[1] + v * r[3]);
    }
    idx.push(n, n + 2, n + 1, n, n + 3, n + 2);
  };
  for (const d of CMP.decals) {
    if (d.kind === 'tracks') { const segs = Math.max(1, Math.round(d.l / (d.s * 4))); for (let i = 0; i < segs; i++) { const o = (i - (segs - 1) / 2) * d.s * 4; quad(d.x + Math.sin(d.ry) * o, d.z + Math.cos(d.ry) * o, d.s, d.s * 4, d.ry, d.y, R.tracks); } }
    else quad(d.x, d.z, d.s * 2, d.s * 2, d.ry, d.y, R[d.kind]);
  }
  for (const f of CMP.scatter) if (f.kind === 'litter') quad(f.x, f.z, f.s, f.s, cmpRng() * TAU, 0.085, R['litter' + Math.floor(cmpRng() * 4)]);
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  gg.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  gg.setIndex(idx); gg.computeBoundingSphere();
  const gm = new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, color: 0xb0a8b8 });
  const G = new THREE.Mesh(gg, gm); G.renderOrder = 0.5; group.add(G);
  // --- grass and weed tufts: two crossed upright quads each
  const gp = [], gu = [], gi = [], gn = [];
  for (const f of CMP.scatter) {
    if (f.kind !== 'grass') continue;
    const y = groundAt(f.x, f.z), w = 0.7 * f.s, h = 0.55 * f.s, a0 = cmpRng() * Math.PI;
    for (const a of [a0, a0 + Math.PI / 2]) {
      const dx = Math.cos(a) * w / 2, dz = Math.sin(a) * w / 2, n = gp.length / 3;
      gp.push(f.x - dx, y, f.z - dz, f.x + dx, y, f.z + dz, f.x + dx, y + h, f.z + dz, f.x - dx, y + h, f.z - dz);
      gu.push(0, 0, 1, 0, 1, 1, 0, 1); for (let k = 0; k < 4; k++) gn.push(0, 1, 0);
      gi.push(n, n + 1, n + 2, n, n + 2, n + 3);
    }
  }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); tg.setAttribute('uv', new THREE.Float32BufferAttribute(gu, 2)); tg.setAttribute('normal', new THREE.Float32BufferAttribute(gn, 3));
  tg.setIndex(gi); tg.computeBoundingSphere();
  group.add(new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ map: T.grassTuft, alphaTest: 0.45, side: THREE.DoubleSide, color: 0xffffff, emissive: 0x1a2010 })));
  // --- wires: sagging line segments
  const wp = [];
  for (const pts of CMP.wires) for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[2] - a[2]), n = L > 4 ? 8 : 1, sag = L > 4 ? L * 0.05 : 0;
    for (let k = 0; k < n; k++) {
      const P = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t];
      wp.push(...P(k / n), ...P((k + 1) / n));
    }
  }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); wg.computeBoundingSphere();
  group.add(new THREE.LineSegments(wg, addCutaway(new THREE.LineBasicMaterial({ color: 0x120c14 }))));
  // --- bunting: little hanging triangles, coloured per flag
  const bp = [], bc = [], cc = new THREE.Color();
  for (const f of CMP.pennants) {
    const dx = Math.sin(f.ry) * 0.28, dz = Math.cos(f.ry) * 0.28;
    bp.push(f.x - dx, f.y, f.z - dz, f.x + dx, f.y, f.z + dz, f.x, f.y - 0.5, f.z);
    cc.setHex(f.color); for (let k = 0; k < 3; k++) bc.push(cc.r, cc.g, cc.b);
  }
  if (bp.length) {
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3)); bg.computeVertexNormals(); bg.computeBoundingSphere();
    group.add(new THREE.Mesh(bg, addCutaway(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }))));
  }
  const fireSrc = CMP.fires.map(([x, z]) => [x, 1.9, z, 0.55]);
  cmpSmokeFx(group, fireSrc.concat(CMP.smoke), CMP.fires.map(([x, z]) => [x, 1.4, z, 0.6]));
}
const _swV = new THREE.Vector3(), _swD = new THREE.Vector3(), _swUp = new THREE.Vector3(0, -1, 0);
function updateCompoundDetail(dt) {
  CMP.swT = (CMP.swT || 0) + dt;
  for (const w of CMP.sweeps || []) {
    if (!w.beam) continue;
    const t = CMP.swT * 0.32 + w.ph, x = Math.sin(t) * 32, z = Math.sin(t * 0.73 + 1) * 24;
    _swV.set(x, groundAt(x, z) + 0.1, z); _swD.copy(_swV).sub(w.beam.position);
    const L = _swD.length(); w.beam.scale.set(1, L, 1); w.beam.quaternion.setFromUnitVectors(_swUp, _swD.multiplyScalar(1 / L));
    w.pool.position.copy(_swV);
  }
  if (CMP.smokeFx) {
    const sc = renderer.domElement.height * 0.5 * camera.projectionMatrix.elements[5];
    for (const m of CMP.smokeFx) { m.uniforms.uT.value += dt; m.uniforms.uScale.value = sc; }
  }
  // string lights and marquee bulbs twinkle in a slow chase (colour only; the matrices stay put)
  const B = CMP.bulbs; if (!B) return;
  B.t += dt; if (B.t < 0.25) return; B.t = 0; B.step = (B.step || 0) + 1;
  const c = new THREE.Color();
  B.list.forEach((f, i) => { const on = (i + B.step) % 4 !== 0; B.mesh.setColorAt(i, c.setHex(f.color || 0xffe3a0).multiplyScalar(on ? 1 : 0.25)); });
  B.mesh.instanceColor.needsUpdate = true;
}

// The yard's mid-size fill (decisions.md 2026-11-09: "map feels too empty", "bloodier"): shipping
// containers, a food truck, a strength tester, game booths, merch tables, picnic tables, TV camera
// scaffolds, speaker stacks, searchlight towers, butcher racks with hanging carcasses, body bags,
// bath tubs and buckets of blood, trash bags along the fence, and drag trails of blood between them.
function cmpFill(H, T, det, dblk, chair) {
  const { add, blk, col, solid, sign, glowAt, D, FX, FZ, R, wood, steel, bark, tyreM, crate, rustM } = H;
  const metal = cmpMat(0x6a6a72), dark = cmpMat(0x1e1a1c), red = cmpMat(0xb3121a), white = cmpMat(0xe8e0d0), yellow = cmpMat(0xd8b23a);
  const gore = cmpMat(0x8a1418), meat = cmpMat(0x6a1a22), fat = cmpMat(0x9a6a5e), bone = cmpMat(0xe6dcc4), bagM = cmpMat(0x1e2a22), blood = cmpMat(0x5a0408, null, 0x200000);
  const trails = (D.bloodTrails = D.bloodTrails || []);
  const spot = (x, z, r, w) => D.bloodSpots.push([x, z, r, w]);

  // --- shipping containers (corrugated, rust streaked, tagged)
  const container = (x, z, ry, color, y = 0, tag = -1) => {
    const q = Math.abs(Math.sin(ry)) > 0.5, w = 6.1, h = 2.6, d = 2.45;
    blk(w, h, d, cmpMat(color, TEX.metal, 0, [2, 1]), x, y, z, ry);
    if (y === 0) col(x, z, q ? d : w, q ? w : d, h);
    for (let i = 0; i < 12; i++) { const o = -w / 2 + 0.25 + i * (w - 0.5) / 11; dblk(0.08, h - 0.1, 0.06, cmpMat(color), x + Math.cos(ry) * o + Math.sin(ry) * (d / 2 + 0.02), y + 0.05, z - Math.sin(ry) * o + Math.cos(ry) * (d / 2 + 0.02), ry); }
    dblk(0.06, h - 0.1, d - 0.1, dark, x + Math.cos(ry) * (w / 2 + 0.02), y + 0.05, z - Math.sin(ry) * (w / 2 + 0.02), ry); // doors end
    if (tag >= 0) sign(3, 1.4, T.graffiti[tag], x + Math.sin(ry) * (d / 2 + 0.07), y + 1.2, z + Math.cos(ry) * (d / 2 + 0.07), ry).name = 'Detail';
  };
  container(-38, -30.5, 0, 0x8a3a2a, 0, 2); container(-37.6, -30.5, 0.06, 0x2a4a6a, 2.6);
  container(30.5, 34.5, Math.PI, 0x3a5a3a, 0, 5);
  container(46.2, -20, Math.PI / 2, 0x8a6a2a, 0, 1);

  // --- a food truck with a lit hatch, an awning and a menu board
  solid(2.4, 2.9, 6.2, cmpMat(0xe8d8b0), -33, 0.4, 12, 0);
  blk(2.3, 1.2, 1.7, cmpMat(0xe8d8b0), -33, 0.4, 15.9, 0); dblk(2.0, 0.6, 0.05, cmpMat(0x1a1c22), -33, 1.0, 16.76);
  dblk(0.05, 0.9, 3, cmpMat(0xffd27a, null, 0xffa040), -31.78, 1.7, 11.5);
  dblk(1.4, 0.06, 3.4, cmpMat(0xffffff, TEX.stripes, 0, [3, 1]), -31.1, 2.75, 11.5);
  dblk(1.6, 0.08, 3, metal, -31.7, 1.55, 11.5); // counter
  sign(2.2, 0.7, T.popcorn, -31.77, 3.0, 11.5, Math.PI / 2).name = 'Detail';
  for (const [a, b] of [[-1.2, -2.3], [1.2, -2.3], [-1.2, 2.3], [1.2, 2.3]]) det(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10).rotateZ(Math.PI / 2), tyreM, -33 + a, 0.42, 12 + b);
  glowAt(-30.5, 11.5, 4, 0xffb050);
  for (let i = 0; i < 3; i++) chair(-29.4, 9.6 + i * 1.4, -Math.PI / 2 + (cmpRng() - 0.5) * 0.6, i === 1);

  // --- the strength tester: a tall striped post, the scale, a bell, a pad and the mallet
  add(new THREE.CylinderGeometry(0.16, 0.2, 6, 8), cmpMat(0xffffff, TEX.stripes, 0, [1, 4]), 28, 3, -8);
  for (let i = 0; i < 9; i++) dblk(0.5, 0.06, 0.04, [red, yellow, white][i % 3], 28, 0.8 + i * 0.6, -7.8);
  det(new THREE.SphereGeometry(0.4, 10, 6, 0, TAU, 0, Math.PI / 2), yellow, 28, 6.0, -8).rotation.x = Math.PI;
  dblk(1, 0.3, 1, red, 28, 0, -7.3); col(28, -7.8, 1, 1.2, 6);
  const mallet = dblk(0.06, 0.06, 1.3, bark, 29.3, 0.05, -6.8, 0.6); dblk(0.4, 0.25, 0.25, wood, 29.68, 0.02, -6.2, 0.6);
  glowAt(28, -7.5, 3, 0xffd060);

  // --- a game booth facing the prize booth: a pyramid of bottles to knock down
  solid(4, 0.9, 1.2, cmpMat(0x2a6a4a), 14, 0, -26, 0);
  for (const s2 of [-1, 1]) dblk(0.12, 2.4, 0.12, wood, 14 + s2 * 2, 0, -26.5);
  dblk(4.4, 0.15, 1.6, cmpMat(0xffffff, TEX.stripes, 0, [3, 1]), 14, 2.4, -26.3);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 3 - r; i++) for (const ox of [-1.1, 1.1]) det(new THREE.CylinderGeometry(0.06, 0.08, 0.28, 6), cmpMat([0x6a9a5a, 0xc8b070, 0x8a3a2a][r]), 14 + ox + (i - (2 - r) / 2) * 0.2, 1.04 + r * 0.29, -26.1);
  glowAt(14, -24.5, 3.5, 0x60ff9a);

  // --- merch tables beside the runway, shirts piled, a price sign
  for (const sx of [-1, 1]) {
    const x = sx * 7, z = -24;
    blk(2.4, 0.08, 1, white, x, 0.8, z); for (const [a, b] of [[-1.1, -0.4], [1.1, -0.4], [-1.1, 0.4], [1.1, 0.4]]) dblk(0.05, 0.8, 0.05, steel, x + a, 0, z + b);
    col(x, z, 2.4, 1, 0.9);
    for (let i = 0; i < 6; i++) dblk(0.45, 0.06 + (i % 3) * 0.05, 0.35, cmpMat([0xb3121a, 0x1a1a1a, 0x5a1890, 0xd8b23a][i % 4]), x - 0.9 + (i % 3) * 0.9, 0.88, z - 0.2 + Math.floor(i / 3) * 0.4);
    sign(0.75, 1.1, T.poster[(sx + 3) % 3], x + sx * 1.6, 0.6, z, -sx * Math.PI / 2).name = 'Detail';
    chair(x, z - 1.1, 0, false);
  }

  // --- picnic tables near the gate
  const picnic = (x, z, ry) => {
    blk(2.2, 0.08, 0.9, wood, x, 0.75, z, ry);
    for (const o of [-0.75, 0.75]) blk(2.2, 0.06, 0.3, wood, x - Math.sin(ry) * o, 0.42, z - Math.cos(ry) * o, ry);
    for (const o of [-0.9, 0.9]) dblk(0.08, 0.75, 1.6, bark, x + Math.cos(ry) * o, 0, z - Math.sin(ry) * o, ry);
    col(x, z, 2.3, 2, 0.85);
    CMP.scatter.push({ kind: 'litter', x: x + 0.6, z: z + 1.3, s: 0.6 }, { kind: 'litter', x: x - 0.8, z: z - 1.2, s: 0.5 });
  };
  picnic(-10, 27, 0.15); picnic(16, 22, -0.2); picnic(-27, 7, 1.5);

  // --- TV camera scaffolds and speaker stacks inside the barriers
  for (const [x, z, face] of [[-8, -14, 0.5], [8, 14, Math.PI + 0.5]]) {
    for (const [a, b] of [[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]]) dblk(0.08, 2.2, 0.08, steel, x + a, 0, z + b);
    for (const yy of [0.8, 2.2]) { dblk(1.9, 0.06, 0.06, steel, x, yy, z - 0.9); dblk(1.9, 0.06, 0.06, steel, x, yy, z + 0.9); dblk(0.06, 0.06, 1.9, steel, x - 0.9, yy, z); dblk(0.06, 0.06, 1.9, steel, x + 0.9, yy, z); }
    blk(2, 0.1, 2, wood, x, 2.2, z); col(x, z, 2, 2, 2.4);
    const g = new THREE.Group(); g.position.set(x, 2.3, z); g.rotation.y = face; g.name = 'Detail'; H.root.add(g);
    for (const r of [-1, 0, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.2, 0.04), dark); l.position.set(r * 0.3, 0.55, r === 0 ? 0.3 : -0.15); l.rotation.set(r === 0 ? -0.25 : 0.12, 0, -r * 0.25); g.add(l); }
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.8), dark); body.position.y = 1.25; g.add(body);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.3, 10).rotateX(Math.PI / 2), metal); lens.position.set(0, 1.25, 0.55); g.add(lens);
    const tally = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.06), cmpMat(0xff2020, null, 0xff0000)); tally.position.set(0, 1.5, 0.3); g.add(tally);
    g.traverse((o) => { o.name = 'Detail'; });
  }
  for (const [x, z] of [[19.5, 11], [-19.5, -11], [19.5, -11], [-19.5, 11]]) {
    solid(1.2, 1.2, 1, dark, x, 0, z, 0); blk(1.1, 1.1, 0.95, dark, x, 1.2, z);
    for (const yy of [0.6, 1.75]) det(new THREE.CircleGeometry(0.38, 12), cmpMat(0x3a3a40), x - Math.sign(x) * 0.61, yy, z, -Math.sign(x) * Math.PI / 2);
  }

  // --- searchlight towers whose beams sweep the yard (the beam and its pool move; see updateCompound)
  CMP.sweeps = [];
  for (const [x, z, ph] of [[46.5, -12, 0], [-46.5, 9, Math.PI]]) {
    for (const [a, b] of [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]]) dblk(0.1, 5, 0.1, steel, x + a, 0, z + b);
    for (const yy of [1.5, 3, 4.5]) { dblk(1.7, 0.07, 0.07, steel, x, yy, z - 0.8); dblk(1.7, 0.07, 0.07, steel, x, yy, z + 0.8); }
    blk(1.9, 0.12, 1.9, metal, x, 5, z); col(x, z, 1.8, 1.8, 5.2);
    det(new THREE.CylinderGeometry(0.35, 0.45, 0.7, 10), dark, x, 5.55, z);
    CMP.sweeps.push({ x, y: 5.6, z, ph });
  }

  // --- butcher racks: hooks, hanging carcasses, a block with a cleaver, a bath of blood, buckets, body bags
  const carcass = (x, y, z, s) => {
    const m = det(new THREE.IcosahedronGeometry(1, 1), meat, x, y, z, cmpRng() * TAU); m.scale.set(0.32 * s, 0.75 * s, 0.22 * s);
    const f = det(new THREE.IcosahedronGeometry(1, 0), fat, x, y + 0.25 * s, z + 0.12 * s, cmpRng()); f.scale.set(0.2 * s, 0.35 * s, 0.1 * s);
    const g2 = det(new THREE.IcosahedronGeometry(1, 0), gore, x, y - 0.3 * s, z, cmpRng()); g2.scale.set(0.24 * s, 0.4 * s, 0.18 * s);
    det(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 5), bone, x, y + 0.85 * s, z);
    det(new THREE.TorusGeometry(0.1, 0.02, 4, 8, Math.PI * 1.4), metal, x, y + 1.15 * s, z);
  };
  const rack = (x, z, ry, n) => {
    const c = Math.cos(ry), sn = Math.sin(ry), L = n * 1.1 + 0.6;
    for (const o of [-L / 2, L / 2]) dblk(0.14, 3.2, 0.14, rustM, x + c * o, 0, z - sn * o, ry);
    dblk(L + 0.3, 0.12, 0.12, rustM, x, 3.1, z, ry);
    col(x, z, Math.abs(c) * L + 0.6, Math.abs(sn) * L + 0.6, 2.4);
    for (let i = 0; i < n; i++) {
      const o = -L / 2 + 0.85 + i * 1.1;
      if (cmpRng() < 0.15) { det(new THREE.TorusGeometry(0.1, 0.02, 4, 8, Math.PI * 1.4), metal, x + c * o, 2.85, z - sn * o); continue; }
      carcass(x + c * o, 1.75 + cmpRng() * 0.2, z - sn * o, 0.9 + cmpRng() * 0.25);
      CMP.decals.push({ kind: 'drip', x: x + c * o, z: z - sn * o, s: 0.6, ry: cmpRng() * TAU, y: 0.09 });
    }
    spot(x, z, 4, 0.9);
  };
  const butcher = (x, z) => {
    solid(1.4, 0.85, 0.9, cmpMat(0x6a4a34), x, 0, z, 0);
    dblk(1.42, 0.03, 0.92, gore, x, 0.85, z);
    const cl = dblk(0.5, 0.03, 0.22, metal, x + 0.2, 0.9, z, 0.4); cl.rotation.z = 0.15;
    dblk(0.05, 0.05, 0.3, bark, x - 0.15, 0.9, z + 0.18, 0.4);
    for (let i = 0; i < 3; i++) { const b = det(new THREE.IcosahedronGeometry(0.15, 0), meat, x - 0.4 + i * 0.25, 0.95, z - 0.2); b.scale.y = 0.6; }
  };
  const tub = (x, z, ry) => {
    blk(1.7, 0.6, 0.8, white, x, 0.15, z, ry); col(x, z, 1.7, 1.7, 0.75);
    det(new THREE.PlaneGeometry(1.5, 0.62).rotateX(-Math.PI / 2), blood, x, 0.76, z, ry);
    for (const [a, b] of [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]]) det(new THREE.SphereGeometry(0.09, 6, 4), metal, x + a * Math.cos(ry) + b * Math.sin(ry), 0.1, z - a * Math.sin(ry) + b * Math.cos(ry));
    spot(x, z, 2.5, 0.4);
  };
  const bucket = (x, z, tipped) => {
    const b = det(new THREE.CylinderGeometry(0.2, 0.16, 0.38, 10), metal, x, tipped ? 0.17 : 0.19, z, cmpRng() * TAU);
    if (tipped) { b.rotation.z = Math.PI / 2; CMP.decals.push({ kind: 'drip', x: x + 0.5, z, s: 0.9, ry: 0, y: 0.09 }); }
    else det(new THREE.CircleGeometry(0.17, 10).rotateX(-Math.PI / 2), blood, x, 0.37, z);
  };
  const bodyBag = (x, z, ry) => {
    const b = det(new THREE.IcosahedronGeometry(1, 1), bagM, x, 0.2, z, ry); b.scale.set(0.38, 0.22, 0.95);
    dblk(0.03, 0.02, 1.6, cmpMat(0x8a8a90), x + Math.sin(ry) * 0, 0.4, z, ry);
    CMP.decals.push({ kind: 'drip', x: x + (cmpRng() - 0.5), z: z + (cmpRng() - 0.5), s: 0.8, ry: cmpRng() * TAU, y: 0.09 });
  };
  rack(-30, -4, Math.PI / 2, 4); butcher(-27.6, -6.5); tub(-27.4, -1.5, 0.2); bucket(-28.6, -8.3, false); bucket(-31.6, -7.2, true);
  rack(27.5, 7.5, 0, 3); butcher(30, 5.3); bucket(25.6, 5.6, false); bucket(26.4, 9.6, true);
  rack(-8, -33.5, 0, 4); // by the tent, where the shows end
  bodyBag(-33, -6.5, 0.3); bodyBag(-34.4, -5.6, 0.1); bodyBag(46, 22.4, 1.5); bodyBag(-19, -34.6, 1.6); bodyBag(-44, 21.5, 0.2); bodyBag(9.6, -31.4, 1.2);
  tub(-43.5, 30, 1.2);
  for (const [x, z] of [[-20.6, 33.4], [41.6, -14], [-12.4, -18.6], [21, 33.6], [-46.5, -6]]) bucket(x, z, cmpRng() < 0.5);

  // --- trash bags heaped along the fence and by the bins
  const bagC = [cmpMat(0x18181c), cmpMat(0x22222a), cmpMat(0x2a3a2a)];
  const heap = (x, z, n) => { for (let i = 0; i < n; i++) { const b = det(new THREE.IcosahedronGeometry(0.4, 1), bagC[i % 3], x + (cmpRng() - 0.5) * 1.6, 0.25 + (i > n / 2 ? 0.25 : 0), z + (cmpRng() - 0.5) * 1.1, cmpRng() * 3); b.scale.set(1 + cmpRng() * 0.3, 0.75, 0.9 + cmpRng() * 0.3); } };
  for (const [x, z, n] of [[-47.6, -2, 7], [47.6, 30, 6], [-12, 36.6, 6], [17, 36.6, 5], [-47.6, 35, 5], [47.6, -35, 5], [-28, -36.6, 6], [6, -36.6, 5], [45, 24.8, 5], [-22, -36.4, 4], [33, -36.6, 5]]) heap(x, z, n);

  // --- ground variety: muddy patches, gravel, confetti and popcorn by the stalls
  for (let i = 0; i < 46; i++) { const x = (cmpRng() - 0.5) * 2 * (FX - 3), z = (cmpRng() - 0.5) * 2 * (FZ - 3); if (Math.abs(x) < R.half + 1 && Math.abs(z) < R.half + 1) continue; CMP.decals.push({ kind: 'patch', x, z, s: 2 + cmpRng() * 3, ry: cmpRng() * TAU, y: 0.072 }); }
  for (const [x, z, n] of [[13, 31, 4], [-15, 31.5, 4], [-14, -24.5, 4], [14, -24.5, 4], [-31, 11.5, 3], [0, 21, 3], [-7, -22, 2], [7, -22, 2], [0, 12, 3]]) for (let i = 0; i < n; i++) CMP.decals.push({ kind: 'confetti', x: x + (cmpRng() - 0.5) * 4, z: z + (cmpRng() - 0.5) * 3, s: 0.9 + cmpRng() * 0.8, ry: cmpRng() * TAU, y: 0.08 });
  for (let i = 0; i < 260; i++) { const x = (cmpRng() - 0.5) * 2 * (FX - 2), z = (cmpRng() - 0.5) * 2 * (FZ - 2); if (Math.abs(x) < R.half && Math.abs(z) < R.half) continue; CMP.scatter.push({ kind: cmpRng() < 0.5 ? 'litter' : 'grass', x, z, s: 0.35 + cmpRng() * 0.4 }); }

  // --- blood: drag trails between the racks, the ring, the tent, the shacks and the bags; more spots everywhere
  trails.push(
    [[-30, -4], [-25, -2], [-18, 0], [-12, 1], [-6.5, 0.5]], [[27.5, 7.5], [22, 5], [14, 2.5], [6.5, 1]], [[-8, -33.5], [-4, -31], [-1, -28], [0, -22], [0, -15], [0, -7]],
    [[-6.5, -2], [-4, -9], [-3.6, -18], [-6, -24], [-14, -26]], [[3, 6.5], [3.4, 12], [2.6, 18], [0, 24], [-4, 30]], [[-34, 25.4], [-30, 22], [-24, 20], [-20, 14]],
    [[36, 25.4], [32, 20], [26, 17.5], [22, 12]], [[-24, -28.8], [-20, -24], [-14, -20]], [[22, -28.8], [24, -24], [20, -18], [13, -12]],
    [[-41, -2], [-36, 2], [-31, 6], [-33, 8.8]], [[38, -22.2], [34, -16], [28, -10]], [[-33, -6.5], [-38, -12], [-44, -18], [-46, -20]],
  );
  spot(-30, -4, 6, 1.2); spot(27.5, 7.5, 5, 1); spot(-8, -32, 5, 0.9); spot(-43.5, 30, 4, 0.5); spot(46, 22.4, 4, 0.5); spot(-33, 12, 5, 0.4);
  spot(28, -8, 5, 0.4); spot(14, -25, 5, 0.5); spot(-14, -25, 5, 0.5); spot(-38, -30, 6, 0.4); spot(30, 33, 5, 0.4); spot(15, 0, 5, 0.6); spot(-15, 0, 5, 0.6); spot(0, 14, 4, 0.6); spot(0, -14, 4, 0.6);
}

// Smoke and embers: points whose rise, growth and fade are worked out in the shader (two draws).
function cmpSmokeFx(group, smokeSrc, emberSrc) {
  const T = CMP.T;
  // --- smoke and embers: points whose rise, growth and fade are worked out in the shader
  const pts = (sources, per, additive, map, tint) => {
    const P = [], S = [], O = [];
    for (const [x, y, z, sc] of sources) for (let k = 0; k < per; k++) { P.push(x, y, z); S.push(sc); O.push(k / per + cmpRng() * 0.1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aSize', new THREE.Float32BufferAttribute(S, 1)); g.setAttribute('aOff', new THREE.Float32BufferAttribute(O, 1));
    g.computeBoundingSphere(); g.boundingSphere.radius += 6;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uScale: { value: 300 }, uMap: { value: map }, uTint: { value: new THREE.Color(tint) }, uEmber: { value: additive ? 1 : 0 } },
      vertexShader: `attribute float aSize; attribute float aOff; uniform float uT, uScale, uEmber; varying float vA;
        void main() { float l = fract(uT * (uEmber > 0.5 ? 0.55 : 0.18) + aOff); vec3 p = position;
          float sway = sin(uT * 1.3 + aOff * 40.0);
          p.y += l * (uEmber > 0.5 ? 2.6 : 4.5) * aSize * 2.0; p.x += sway * l * (uEmber > 0.5 ? 0.5 : 1.2); p.z += cos(uT * 0.9 + aOff * 30.0) * l * 0.6;
          vA = (uEmber > 0.5 ? (1.0 - l) : smoothstep(0.0, 0.15, l) * (1.0 - l)) ;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = (uEmber > 0.5 ? 0.09 : aSize * (0.8 + l * 2.2)) * uScale / max(0.5, -mv.z); }`,
      fragmentShader: `uniform sampler2D uMap; uniform vec3 uTint; uniform float uEmber; varying float vA;
        void main() { vec4 t = texture2D(uMap, gl_PointCoord); if (uEmber > 0.5) { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uTint * vA, 1.0) * smoothstep(0.5, 0.1, d); }
          else gl_FragColor = vec4(uTint, t.a * vA * 0.8); }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const o = new THREE.Points(g, mat); o.renderOrder = 3; group.add(o); return mat;
  };
  // --- sweeping searchlights: a cone and a pool of light that wander over the yard
  const swMat = new THREE.MeshBasicMaterial({ color: 0xe8f0ff, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const swPool = new THREE.MeshBasicMaterial({ map: TEX.glow, color: 0xb8c8ff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
  for (const w of CMP.sweeps || []) {
    w.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 2.2, 1, 12, 1, true).translate(0, -0.5, 0), swMat); w.beam.position.set(w.x, w.y, w.z); w.beam.frustumCulled = false;
    w.pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), swPool); w.pool.scale.set(6, 1, 6); w.pool.renderOrder = 2; w.pool.frustumCulled = false;
    group.add(w.beam, w.pool);
  }
  CMP.smokeFx = [pts(smokeSrc, IS_TOUCH ? 3 : 5, false, T.smoke, 0x3a3238), pts(emberSrc, IS_TOUCH ? 3 : 5, true, T.smoke, 0xff9a3a)];
}
