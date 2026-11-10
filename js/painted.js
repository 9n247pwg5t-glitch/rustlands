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

const PM_USE = false;                // false: Stage 1 is the 3D compound in js/compound.js
const PM_IMG = 'maps/compound-painted.webp';
const PM = { W: 1536, H: 1024, S: 16, ZK: 1.4, OX: 785, OY: 495 }; // px per metre, z stretch, origin (ring centre)
const pmX = (px) => (px - PM.OX) / PM.S;
const pmZ = (py) => ((py - PM.OY) / PM.S) * PM.ZK;

// Colliders in painting pixels: [x0, y0, x1, y1, height in metres]. Each one covers only where a
// thing stands on the ground (its base), so the open ground you can see is open: fences are thin
// lines along their foot, buildings and vehicles their footprint. (2026-11-09: the first version
// blocked whole painted outlines and fenced the player in; the streets are walkable now.)
const PM_COLS = [
  // the compound fence: north (either side of the entrance tent), west, east, south (open at the gate)
  [212, 246, 662, 262, 3], [864, 244, 1318, 262, 3], [214, 246, 240, 850, 3], [1298, 240, 1320, 850, 3],
  [214, 832, 702, 850, 3], [878, 832, 1320, 850, 3],
  // the gate's pillars, the entrance tent, the shed's tyres
  [648, 815, 704, 850, 4], [876, 815, 930, 850, 4], [660, 262, 866, 300, 6], [572, 262, 664, 290, 1.2],
  // west: the bus, drums, a crate, fire barrels, the wooden pen's fence, the shack and its lean-to
  [228, 300, 352, 498, 3], [354, 345, 396, 372, 1], [334, 412, 360, 432, 1], [386, 305, 412, 322, 1], [320, 478, 345, 496, 1],
  [224, 520, 270, 552, 1], [214, 626, 356, 646, 2], [286, 690, 426, 765, 3], [426, 696, 470, 720, 1.6],
  // north: a crate, the work desk, a fire barrel, a table
  [508, 322, 530, 338, 1], [862, 262, 938, 298, 1.2], [948, 268, 974, 286, 1], [1030, 292, 1088, 314, 1],
  // east: the trailer and its steps, the striped tent, a fire barrel, the shack, the purple booth, the hut, the tree trunk
  [1112, 266, 1304, 368, 3], [1116, 330, 1160, 350, 1], [1206, 468, 1318, 548, 4], [1176, 452, 1202, 472, 1],
  [1210, 650, 1310, 708, 3], [1226, 742, 1298, 790, 2], [1162, 752, 1238, 778, 2], [1088, 744, 1118, 770, 1.5],
  // floodlight tripods
  [588, 430, 616, 452, 7], [942, 432, 970, 455, 7], [576, 710, 612, 732, 7], [960, 706, 994, 730, 7],
  // bleachers
  [452, 410, 550, 600, 1.5], [1018, 416, 1120, 605, 1.5],
  // crowd barriers: thin lines along their feet (gaps north-west, north-east and the path to the gate)
  [452, 378, 640, 390, 1.1], [704, 352, 836, 364, 1.1], [878, 370, 1046, 382, 1.1], [1044, 370, 1126, 380, 1.1], [1120, 380, 1134, 612, 1.1],
  [440, 390, 456, 612, 1.1], [452, 626, 602, 640, 1.1], [538, 684, 652, 697, 1.1], [876, 684, 1024, 697, 1.1], [1020, 620, 1126, 634, 1.1],
  // drums and crates by the ring, the ring posts
  [492, 384, 544, 402, 1], [674, 378, 700, 394, 1], [874, 372, 900, 388, 1], [1058, 382, 1086, 400, 1], [704, 598, 728, 616, 1],
  [648, 396, 668, 410, 1.9], [898, 396, 918, 410, 1.9], [644, 590, 666, 606, 1.9], [906, 590, 926, 606, 1.9],
  // outside: the houses (north, west, east, south), the parked car, trees, lamp posts, a power pole, the fire barrel by the gate
  [92, 0, 332, 92, 4], [864, 0, 1032, 72, 4], [1140, 0, 1392, 88, 4], [1290, 60, 1344, 134, 1.5],
  [0, 270, 70, 440, 4], [0, 735, 74, 900, 4], [1472, 262, 1536, 440, 4], [1482, 700, 1536, 880, 4],
  [360, 966, 600, 1024, 4], [906, 978, 1140, 1024, 4], [1180, 986, 1300, 1024, 4],
  [420, 86, 444, 104, 3], [740, 50, 762, 66, 3], [30, 236, 56, 262, 3], [1450, 540, 1474, 562, 3], [1030, 984, 1054, 1000, 3],
  [316, 236, 334, 250, 4], [1220, 246, 1238, 260, 4], [60, 598, 76, 612, 4], [282, 990, 302, 1006, 4], [1300, 990, 1318, 1006, 4], [1078, 100, 1094, 114, 6],
  [886, 878, 914, 900, 1],
];
// Fire barrels painted with flames: [x, y] in pixels (where the flame is drawn)
const PM_FIRES = [[398, 300], [331, 474], [961, 258], [1188, 440], [1243, 698]];
const PM_SPAWNS = [[768, 322], [500, 300], [410, 560], [300, 525], [500, 722], [990, 330], [1182, 622], [1165, 400], [604, 300], [130, 600], [1400, 470], [560, 920], [1000, 150]];

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
    D.points.PlayerSpawn = P(788, 700);
    D.points.LookAt = P(785, 495);
    D.points.ChestSpot = P(705, 660);
    D.points.Vending = P(1000, 738);
    PM_SPAWNS.forEach(([x, y], i) => { D.points['EnemySpawn_' + (i + 1)] = P(x, y); });
    D.barrels = [P(625, 655), P(1150, 640), P(395, 610), P(860, 300)].map((p) => [p[0], p[2]]);
    // where the static blood goes (on top of what's painted): heavy round the ring and the gate path
    for (const [x, y, r, k] of [[785, 495, 11, 1.2], [785, 640, 5, 0.8], [768, 330, 5, 0.6], [520, 300, 6, 0.5], [400, 590, 6, 0.5], [1170, 620, 5, 0.4], [1000, 330, 6, 0.4], [600, 520, 5, 0.6], [970, 520, 5, 0.6], [520, 720, 5, 0.4], [1160, 400, 4, 0.4]]) D.bloodSpots.push([pmX(x), pmZ(y), r, k]);
    D.bounds = { minX: pmX(14), maxX: pmX(1522), minZ: pmZ(14), maxZ: pmZ(1010) }; // the whole picture: yard and streets
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
