'use strict';
// The hub: a room the player walks around between stages. A bank of TVs shows the stages and the
// console in front of them opens stage select (bible §7; the room's identity is OPEN, so it's a
// placeholder interior with no story content).

const HUB = { w: 14, d: 18, h: 4.2, spawn: new THREE.Vector3(0, 0, 6.2), screens: [], noise: null };

defineWorld('hub', {
  flat: 0,
  bounds: { minX: -HUB.w / 2 + 0.5, maxX: HUB.w / 2 - 0.5, minZ: -HUB.d / 2 + 0.5, maxZ: HUB.d / 2 - 0.5 },
  fog: new THREE.Fog(0x1c140e, 18, 40), background: new THREE.Color(0x1c140e),
  light: { hemi: 0.75, sun: 0.35 },
}, (g) => {
  const W = HUB.w, D = HUB.d, H = HUB.h;
  const solid = (w, h, d, color, x, y, z, ol = 0.03) => { const m = box(w, h, d, color, x, y, z, g, ol); m.castShadow = false; return m; };
  // shell: carpet, panelled walls with a dado rail, ceiling
  solid(W, 0.2, D, 0x4f4236, 0, -0.1, 0, 0);
  solid(W, 0.2, D, 0x3a3028, 0, H + 0.1, 0, 0);
  for (const [x, z, w, d] of [[0, -D / 2, W, 0.3], [0, D / 2, W, 0.3], [-W / 2, 0, 0.3, D], [W / 2, 0, 0.3, D]]) {
    solid(w, H, d, 0x8a6a48, x, H / 2, z, 0);
    solid(w + (d > w ? 0.06 : 0), 0.12, d + (w > d ? 0.06 : 0), 0x5a3f28, x, 1.05, z, 0);
    addBoxCol(x, z, w, d, -1, H + 1);
  }
  addBoxCol(0, 0, W, D, H, H + 0.4); // ceiling, for shots
  // a worn rug and ceiling lights
  solid(5, 0.02, 7, 0x7a2a22, 0, 0.01, 1, 0);
  for (const z of [-5, 1, 6.5]) {
    box(1.6, 0.06, 0.6, 0, 0, H - 0.03, z, g, 0, glow(0xfff2cc));
    const l = new THREE.PointLight(0xffd9a0, 0.7, 13, 1.6); l.position.set(0, H - 0.4, z); g.add(l);
  }

  // TV wall: a shelf unit with one screen per stage, plus a couple of dead sets showing static
  const zWall = -D / 2 + 0.75;
  solid(10, 0.18, 1.2, 0x3a2a1e, 0, 0.9, zWall);
  solid(10, 0.18, 1.2, 0x3a2a1e, 0, 2.35, zWall);
  for (const x of [-4.9, 4.9]) solid(0.18, 3.3, 1.2, 0x3a2a1e, x, 1.65, zWall);
  addBoxCol(0, zWall, 10, 1.2, -1, 3.4);
  const tv = (x, y, s) => {
    const set = box(1.5 * s, 1.15 * s, 0.95 * s, 0x2a2a2e, x, y + 0.575 * s, zWall, g, 0.03);
    box(1.32 * s, 0.98 * s, 0.02, 0x101012, 0, 0.02 * s, 0.48 * s, set, 0);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.22 * s, 0.9 * s), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    screen.position.set(0, 0.03 * s, 0.495 * s);
    set.add(screen);
    return screen;
  };
  const noise = document.createElement('canvas');
  noise.width = 96; noise.height = 72;
  const nc = noise.getContext('2d');
  for (let y = 0; y < 72; y += 2) for (let x = 0; x < 96; x += 2) { const v = 40 + Math.random() * 150; nc.fillStyle = `rgb(${v},${v},${v})`; nc.fillRect(x, y, 2, 2); }
  HUB.noise = new THREE.CanvasTexture(noise);
  for (const [x, y] of [[-3.7, 2.44], [3.7, 2.44]]) tv(x, y, 0.75).material.map = HUB.noise;
  for (let i = 0; i < 3; i++) {
    const c = document.createElement('canvas');
    c.width = 320; c.height = 236;
    const screen = tv(-2.4 + i * 2.4, 0.99, 1.15);
    screen.material.map = new THREE.CanvasTexture(c);
    HUB.screens.push({ canvas: c, tex: screen.material.map, img: null, url: null });
  }
  // sign over the screens
  const sc = document.createElement('canvas');
  sc.width = 512; sc.height = 96;
  const sx = sc.getContext('2d');
  sx.fillStyle = '#1c110a'; sx.fillRect(0, 0, 512, 96);
  sx.font = '64px Bangers, Impact, sans-serif'; sx.textAlign = 'center'; sx.textBaseline = 'middle';
  sx.fillStyle = '#ffd23a'; sx.fillText('STAGE SELECT', 256, 52);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.68), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc) }));
  sign.position.set(0, 3.75, -D / 2 + 0.17);
  g.add(sign);

  // the console that opens stage select
  const zc = -5.9;
  solid(3.4, 0.95, 1.0, 0x5a4a3a, 0, 0.475, zc);
  const top = box(3.5, 0.08, 1.1, 0x2a2a2e, 0, 0.99, zc, g, 0.02);
  top.rotation.x = -0.12;
  for (let i = 0; i < 7; i++) box(0.22, 0.05, 0.16, 0, -1.2 + i * 0.4, 1.06, zc + 0.1, g, 0, glow([0xff5a3a, 0xffd23a, 0x6aff7a, 0x4fc6ff][i % 4]));
  box(1.2, 0.08, 0.5, 0, 0, 1.05, zc - 0.25, g, 0, glow(0xffd23a));
  addBoxCol(0, zc, 3.4, 1.0, 0, 1.0);
  interactables.push({ kind: 'stages', pos: new THREE.Vector3(0, 1.2, zc + 0.9), group: top });

  // set dressing: workbench with tools, couch, crates and a lamp
  solid(1.0, 0.95, 3.2, 0x6a4a2e, -W / 2 + 0.9, 0.475, -1.5);
  solid(0.12, 1.6, 3.2, 0x9a8a6a, -W / 2 + 0.25, 1.9, -1.5);
  for (let i = 0; i < 5; i++) box(0.1, 0.1, 0.5 + (i % 2) * 0.3, [0x2a2a2a, 0xc4502b, 0x8a8a8a][i % 3], -W / 2 + 0.35, 1.5 + (i % 3) * 0.45, -2.8 + i * 0.6, g, 0.015);
  box(0.5, 0.25, 0.9, 0x3a3a3a, -W / 2 + 0.9, 1.08, -2.2, g, 0.02);
  box(0.3, 0.2, 0.3, 0xd23a26, -W / 2 + 0.9, 1.05, -0.6, g, 0.02);
  addBoxCol(-W / 2 + 0.9, -1.5, 1.0, 3.2, 0, 1.0);
  solid(1.0, 0.45, 2.6, 0x4a5a3a, W / 2 - 0.9, 0.225, 2.5);
  solid(0.3, 0.9, 2.6, 0x4a5a3a, W / 2 - 0.3, 0.45, 2.5);
  for (const z of [1.2, 3.8]) solid(1.0, 0.65, 0.3, 0x4a5a3a, W / 2 - 0.9, 0.325, z);
  addBoxCol(W / 2 - 0.75, 2.5, 1.3, 2.9, 0, 0.9);
  for (const [x, z, s] of [[W / 2 - 0.9, -3.4, 1.0], [W / 2 - 1.0, -4.6, 0.8], [W / 2 - 0.9, -3.4 + 0.05, 0.6]]) {
    const y = s === 0.6 ? 1.0 + 0.3 : s / 2;
    solid(s, s, s, 0x9c6b3e, x, y, z);
    if (s !== 0.6) addBoxCol(x, z, s, s, 0, s);
  }
  cyl(0.05, 0.05, 1.5, 0x2a2a2a, W / 2 - 0.9, 0.75, 5.8, g, 0.02);
  cyl(0.3, 0.4, 0.4, 0xe8d8a8, W / 2 - 0.9, 1.65, 5.8, g, 0.02);
  const lamp = new THREE.PointLight(0xffc880, 0.5, 6, 1.6); lamp.position.set(W / 2 - 0.9, 1.5, 5.8); g.add(lamp);
  // door the player came in by
  solid(1.6, 2.4, 0.1, 0x5a3f28, 0, 1.2, D / 2 - 0.2);
  box(0.12, 0.12, 0.1, 0xd8b23a, 0.6, 1.1, D / 2 - 0.27, g, 0);
});

// Draw each stage's screen: its preview (once captured), its name and whether it's open.
function refreshHubScreens() {
  STAGES.forEach((st, i) => {
    const s = HUB.screens[i];
    if (!s) return;
    const state = stageState(i);
    const url = state === 'locked' ? null : stagePreviewUrl(st);
    const draw = () => {
      const c = s.canvas, x = c.getContext('2d'), w = c.width, h = c.height;
      x.fillStyle = '#16100c'; x.fillRect(0, 0, w, h);
      if (s.img && url) x.drawImage(s.img, 0, 0, w, h);
      else { x.fillStyle = '#2a1d14'; for (let k = -h; k < w; k += 28) { x.beginPath(); x.moveTo(k, h); x.lineTo(k + h, 0); x.lineTo(k + h + 14, 0); x.lineTo(k + 14, h); x.fill(); } }
      if (state === 'locked' || state === 'dev') { x.fillStyle = 'rgba(28,17,10,0.55)'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(255,243,220,0.45)'; x.font = '96px Bangers, Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', w / 2, h / 2 - 10); }
      x.fillStyle = 'rgba(28,17,10,0.85)'; x.fillRect(0, h - 58, w, 58);
      x.textAlign = 'left'; x.textBaseline = 'alphabetic';
      x.fillStyle = '#ffd23a'; x.font = '34px Bangers, Impact, sans-serif'; x.fillText(st.title, 12, h - 24);
      x.fillStyle = { locked: '#9a9a9a', dev: '#4fc6ff', open: '#ffd23a', done: '#9fff6a' }[state];
      x.font = '700 18px "Barlow Condensed", "Arial Narrow", sans-serif'; x.fillText(STATE_LABEL[state], 12, h - 6);
      // scanlines
      x.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = 0; y < h; y += 3) x.fillRect(0, y, w, 1);
      s.tex.needsUpdate = true;
    };
    if (url && s.url !== url) {
      s.url = url; s.img = new Image();
      s.img.onload = draw;
      s.img.src = url;
    }
    draw();
  });
}
