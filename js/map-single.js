'use strict';
// Stage 1 as the creator's uploaded map (decisions.md 2026-11-12: clown_map_1.glb): one textured
// mesh with its night lighting baked into the texture, converted by tools/map-single.mjs (scaled to
// about 66 m across, the ring lowered to a step-up height, the object on the ring's mat removed,
// 1.9M triangles cut to 160k). It is drawn unlit (the texture already holds its light and shadow).
// Its gameplay data (models/map-clown-yard-data.json) was baked from a top-down height scan: the
// ground heightmap, box colliders over everything taller than a step, spawn points, blood spots and
// crowd seats on the bleachers. Concrete barricades with road-closed sawhorses ring the edge of the
// map (2026-11-12: "prevent player from leaving map boundaries").
// The 3D compound (js/compound.js) and the painted picture (js/painted.js) are kept; MS_USE picks this.

const MS_USE = true;
const MS_NAME = 'map-clown-yard';

function buildSingleMapStage() {
  const loader = new THREE.GLTFLoader();
  if (window.MeshoptDecoder) loader.setMeshoptDecoder(MeshoptDecoder);
  const data = fetch('models/' + MS_NAME + '-data.json?v=1').then((r) => { if (!r.ok) throw new Error('map data ' + r.status); return r.json(); });
  const gltf = new Promise((res, rej) => loader.load('models/' + MS_NAME + '.json?v=1', res, undefined, rej));
  return Promise.all([data, gltf]).then(([M, g]) => {
    const root = new THREE.Group(), fx = new THREE.Group();
    // the map itself, unlit, brightened (its baked night is very dark, and the game grades it darker still)
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      const tex = o.material.map;
      if (tex) tex.anisotropy = Math.min(IS_TOUCH ? 2 : 8, renderer.capabilities.getMaxAnisotropy());
      // (no cutaway: the mesh is a hollow shell, so a cut-away roof would show a hole, not a room)
      o.material = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(2.7, 2.6, 2.6) });
      o.frustumCulled = false;
    });
    g.scene.name = 'Terrain';
    fx.add(g.scene);
    // the world past the map's edge: dark ground into the fog
    const out = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1a1418 }));
    out.position.y = -0.7; fx.add(out);

    const D = { boxes: M.boxes, spheres: [], points: M.points, barrels: M.barrels, bloodSpots: M.bloodSpots, bounds: M.bounds, noWallBlood: true,
      heightmap: { x0: M.x0, z0: M.z0, cell: M.cell, nx: M.nx, nz: M.nz, h: M.h } };
    Object.assign(MAPG, { x0: M.x0, z0: M.z0, cell: M.cell, nx: M.nx, nz: M.nz, h: Int16Array.from(M.h), ready: true });
    cmpTextures(); // (the compound's painted textures: stripes, glow pools)
    msBarricades(root, fx, D);
    cmpFx(fx); // lamp bulbs and glow pools
    CMP.seats = M.seats;       // the cheering crowd (js/compound-extra.js) sits here
    CMP.flames = CMP.flames || []; // (keeps the compound's per-frame effects, the crowd, running)
    applyStage(D, root, fx);
  });
}

// Concrete barriers round the map's edge, broken by striped road-closed sawhorses with blinking
// lamps, each side one long collider (the stage bounds hold the line too).
function msBarricades(root, fx, D) {
  const B = D.bounds, pad = 0.3;
  const x0 = B.minX - pad, x1 = B.maxX + pad, z0 = B.minZ - pad, z1 = B.maxZ + pad;
  const conc = cmpMat(0x9a958c), concDark = cmpMat(0x6a665e), stripeTex = cmpCanvas(64, 16, (g, w, h) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f2f0ea' : '#e0601a'; g.beginPath(); g.moveTo(i * 10 - 10, h); g.lineTo(i * 10, 0); g.lineTo(i * 10 + 10, 0); g.lineTo(i * 10, h); g.fill(); }
  });
  stripeTex.wrapS = THREE.RepeatWrapping;
  const stripe = cmpMat(0xffffff, stripeTex), wood = cmpMat(0x5a4030), lampOff = cmpMat(0x6a4a10);
  const barrier = (x, z, ry) => {
    // a jersey barrier: wide foot, sloped sides, a flat top, a reflective band
    const g = new THREE.Group(); g.position.set(x, groundAtMS(D, x, z) - 0.05, z); g.rotation.y = ry; g.name = 'prop'; root.add(g);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.3, 0.62), concDark); foot.position.y = 0.15; g.add(foot);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.3, 0.62, 4, 1).rotateY(Math.PI / 4), conc); body.scale.set(5.4, 1, 1); body.position.y = 0.6; g.add(body);
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.1, 0.5), stripe); band.position.y = 0.72; g.add(band);
  };
  const sawhorse = (x, z, ry) => {
    const g = new THREE.Group(); g.position.set(x, groundAtMS(D, x, z), z); g.rotation.y = ry; g.name = 'prop'; root.add(g);
    for (const y of [0.55, 0.95]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 0.06), stripe); b.position.y = y; g.add(b); }
    for (const s of [-1, 1]) for (const k of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.15, 0.07), wood); l.position.set(s * 0.95, 0.55, k * 0.18); l.rotation.x = k * 0.18; g.add(l); }
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 8), lampOff); lamp.position.set(0.9, 1.15, 0); g.add(lamp);
    const p = new THREE.Vector3(0.9, 1.17, 0).applyEuler(new THREE.Euler(0, ry, 0)).add(g.position);
    CMP.fx.push({ kind: 'bulb', x: p.x, y: p.y, z: p.z, color: 0xffb020, s: 0.9 });
    CMP.fx.push({ kind: 'pool', x: p.x, y: 0.05, z: p.z, r: 2.4, color: 0xff9a20 });
  };
  const run = (ax, az, bx, bz) => {
    const L = Math.hypot(bx - ax, bz - az), n = Math.round(L / 2.4), ry = Math.atan2(bz - az, bx - ax) * -1;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      if (i % 6 === 3) sawhorse(x, z, ry); else barrier(x, z, ry);
    }
    D.boxes.push([Math.min(ax, bx) - 0.35, Math.min(az, bz) - 0.35, Math.max(ax, bx) + 0.35, Math.max(az, bz) + 0.35, -1.5, 1.3]);
  };
  run(x0, z0, x1, z0); run(x0, z1, x1, z1); run(x0, z0, x0, z1); run(x1, z0, x1, z1);
}
const groundAtMS = (D, x, z) => {
  const H = D.heightmap, i = Math.max(0, Math.min(H.nx - 1, Math.floor((x - H.x0) / H.cell))), j = Math.max(0, Math.min(H.nz - 1, Math.floor((z - H.z0) / H.cell)));
  return H.h[j * H.nx + i] / 100;
};
