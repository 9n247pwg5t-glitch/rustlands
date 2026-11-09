'use strict';
// Stage 1 as a painted map (decisions.md 2026-11-09): the creator's overhead painting of the clown
// wrestling compound is the ground itself, a single unlit picture laid flat, and invisible
// colliders are traced over everything painted on it. The painting looks down from the south at an
// angle, like the game camera, so its depth is squashed: it is stretched north-south (PM_ZK) to
// undo that. Painted things that stand up (the bus, tents, fences, floodlights) get colliders over
// their whole painted outline, not just their footprint, so nobody can walk "behind" them and be
// drawn on top of them. The clown face on the ring mat is painted out (2026-11-09 note: "Remove the
// clown face from the ring mat"). Fire barrels get live flames, smoke and embers over the painting.
// The 3D compound (js/compound.js) is kept; PM_USE picks which one Stage 1 loads.

const PM_USE = true;                 // false: Stage 1 is the 3D compound in js/compound.js
const PM_IMG = 'maps/compound-painted.webp';
const PM = { W: 1536, H: 1024, S: 16, ZK: 1.4, OX: 785, OY: 495 }; // px per metre, z stretch, origin (ring centre)
const pmX = (px) => (px - PM.OX) / PM.S;
const pmZ = (py) => ((py - PM.OY) / PM.S) * PM.ZK;

// Colliders in painting pixels: [x0, y0, x1, y1, height in metres]
const PM_COLS = [
  // the perimeter: fence faces, the entrance tent, the shed, the banner wall, the gate
  [190, 90, 1340, 262, 3.2], [190, 90, 242, 870, 3.2], [1300, 90, 1340, 870, 3.2], [190, 768, 1340, 870, 3.2],
  [660, 90, 866, 300, 6], [568, 244, 666, 292, 1.2], [645, 686, 930, 770, 5],
  // west: the bus, drums, crates, fire barrels, the wooden pen, the shack and its lean-to
  [222, 262, 358, 500, 3], [352, 330, 398, 372, 1], [332, 398, 362, 432, 1], [385, 286, 413, 322, 1], [318, 460, 346, 496, 1],
  [222, 495, 272, 552, 1], [215, 548, 358, 645, 2], [282, 636, 428, 768, 3], [425, 670, 472, 720, 1.6],
  // north: a crate, the work desk, a fire barrel, a table
  [508, 304, 531, 338, 1], [858, 238, 940, 298, 1.2], [946, 250, 976, 286, 1], [1026, 266, 1090, 314, 1],
  // east: the trailer and its pallet, the striped tent, a fire barrel, the shack, the purple booth, the hut, the tree
  [1106, 226, 1308, 370, 3], [1114, 298, 1164, 350, 1], [1198, 366, 1322, 550, 4], [1174, 426, 1203, 472, 1],
  [1204, 594, 1312, 708, 3], [1222, 704, 1302, 776, 2], [1158, 728, 1242, 776, 2], [1048, 648, 1160, 768, 3],
  // floodlight towers (pole and tripod)
  [584, 328, 621, 450, 7], [938, 312, 972, 452, 7], [574, 598, 616, 730, 7], [958, 584, 996, 728, 7],
  // bleachers
  [450, 396, 552, 602, 1.5], [1016, 403, 1122, 607, 1.5],
  // crowd barriers (gaps north-west, north-east and the path to the gate)
  [452, 362, 640, 390, 1.1], [704, 338, 836, 364, 1.1], [878, 354, 1046, 382, 1.1], [1044, 358, 1126, 380, 1.1], [1110, 370, 1134, 612, 1.1],
  [438, 380, 460, 612, 1.1], [452, 598, 602, 640, 1.1], [538, 650, 652, 697, 1.1], [876, 652, 1024, 697, 1.1], [1020, 596, 1126, 634, 1.1],
  // drums and crates by the ring, the ring posts
  [490, 366, 546, 402, 1], [672, 364, 702, 394, 1], [872, 356, 902, 388, 1], [1056, 366, 1088, 400, 1], [702, 584, 730, 616, 1],
  [646, 384, 670, 412, 1.9], [896, 384, 920, 412, 1.9], [642, 574, 668, 606, 1.9], [904, 574, 928, 606, 1.9],
];
// Fire barrels painted with flames: [x, y] in pixels (where the flame is drawn)
const PM_FIRES = [[398, 300], [331, 474], [961, 258], [1188, 440], [1243, 698]];
const PM_SPAWNS = [[768, 322], [500, 300], [410, 560], [300, 525], [500, 722], [990, 330], [1182, 622], [1165, 400], [604, 300]];

function buildPaintedStage() {
  return new Promise((res, rej) => new THREE.TextureLoader().load(PM_IMG, res, undefined, rej)).then((tex) => {
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const root = new THREE.Group(), fx = new THREE.Group();
    const D = { boxes: [], spheres: [], points: {}, barrels: [], bloodSpots: [], ring: null, noWallBlood: true, bloodAmount: 0.45, camScale: 1.45 };
    // the painting, unlit, plus a dark surround past its edges
    const w = PM.W / PM.S, d = (PM.H / PM.S) * PM.ZK, cx = pmX(PM.W / 2), cz = pmZ(PM.H / 2);
    // shown exactly as painted: no cartoon colour lift or halftone (js/world.js), just the night fog
    const mat = new THREE.ShaderMaterial({
      uniforms: Object.assign({ map: { value: tex } }, THREE.UniformsUtils.clone(THREE.UniformsLib.fog)),
      vertexShader: `varying vec2 vUv;\n#include <fog_pars_vertex>\nvoid main() { vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}`,
      fragmentShader: `uniform sampler2D map; varying vec2 vUv;\n#include <fog_pars_fragment>\nvoid main() { gl_FragColor = texture2D(map, vUv);\n#include <fog_fragment>\n}`,
      fog: true,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), mat);
    ground.position.set(cx, 0, cz); ground.name = 'PaintedGround'; ground.renderOrder = -1;
    fx.add(ground);
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(w * 4, d * 4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1e1820 }));
    edge.position.set(cx, -0.05, cz); fx.add(edge);
    // colliders
    for (const [x0, y0, x1, y1, h] of PM_COLS) D.boxes.push([pmX(x0), pmZ(y0), pmX(x1), pmZ(y1), -0.3, h]);
    // markers
    const P = (px, py) => [pmX(px), 0, pmZ(py)];
    D.points.PlayerSpawn = P(788, 640);
    D.points.LookAt = P(785, 495);
    D.points.ChestSpot = P(705, 640);
    D.points.Vending = P(1000, 738);
    PM_SPAWNS.forEach(([x, y], i) => { D.points['EnemySpawn_' + (i + 1)] = P(x, y); });
    D.barrels = [P(625, 655), P(1150, 640), P(395, 610), P(860, 300)].map((p) => [p[0], p[2]]);
    // where the static blood goes (on top of what's painted): heavy round the ring and the gate path
    for (const [x, y, r, k] of [[785, 495, 11, 1.2], [785, 640, 5, 0.8], [768, 330, 5, 0.6], [520, 300, 6, 0.5], [400, 590, 6, 0.5], [1170, 620, 5, 0.4], [1000, 330, 6, 0.4], [600, 520, 5, 0.6], [970, 520, 5, 0.6], [520, 720, 5, 0.4], [1160, 400, 4, 0.4]]) D.bloodSpots.push([pmX(x), pmZ(y), r, k]);
    D.bounds = { minX: pmX(242) + 0.4, maxX: pmX(1300) - 0.4, minZ: pmZ(262) + 0.4, maxZ: pmZ(768) - 0.4 };
    // live fire over the painted fire barrels: a flickering flame, smoke and embers
    if (!TEX.flame) cmpTextures();
    const flameMat = new THREE.SpriteMaterial({ map: TEX.flame, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 });
    CMP.flames = PM_FIRES.map(([px, py]) => { const sp = new THREE.Sprite(flameMat); sp.position.set(pmX(px), 0.35, pmZ(py)); sp.renderOrder = 3; fx.add(sp); return { sp, w: 0.7, h: 1.1, t: Math.random() * 10 }; });
    CMP.fires = PM_FIRES.map(([px, py]) => [pmX(px), pmZ(py)]);
    CMP.T = { smoke: cmpCanvas(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(90,80,90,0.5)'); gr.addColorStop(1, 'rgba(60,50,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }) };
    cmpSmokeFx(fx, CMP.fires.map(([x, z]) => [x, 0.7, z, 0.5]), CMP.fires.map(([x, z]) => [x, 0.4, z, 0.6]));
    applyStage(D, root, fx);
    // nudge enemy spawns onto open ground if a collider sits on them
    for (const p of spawnPoints) if (!navWalkable(p.x, p.z)) for (let r = 1; r < 6; r++) { let hit = false; for (let a = 0; a < 8 && !hit; a++) { const x = p.x + Math.cos(a * Math.PI / 4) * r, z = p.z + Math.sin(a * Math.PI / 4) * r; if (navWalkable(x, z)) { p.x = x; p.z = z; hit = true; } } if (hit) break; }
  });
}
