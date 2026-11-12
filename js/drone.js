'use strict';
// The gun drone (decisions.md 2026-11-12): a skill every player has from the start, no level or
// skill points needed. DRONE (the button by STRIKE, or G) launches the creator's mini helicopter
// (models/gun-drone.json, from military_helicopter_3d_model.glb) to hover over the player's shoulder
// and fire its machine gun at the nearest enemy in sight for DRONE_TIME seconds; then it flies off
// and the skill cools down for DRONE_COOLDOWN seconds (40, the creator's number). It shoots whatever
// enemy the player is hitting; when the player isn't fighting it picks random enemies in range. Its rotor is a
// spinning blurred disc (the model's fixed blades were taken off, tools/drone-convert.mjs).
// PROPOSED, not set by the creator: how long it stays, its range, damage and fire rate.

const DRONE_TIME = 15, DRONE_COOLDOWN = 40, DRONE_RANGE = 14, DRONE_RATE = 0.11, DRONE_SIZE = 0.95;
const DRONE = { clock: 0, model: null, obj: null, rotor: null, t: 0, cd: 0, fireT: 0, side: 1, target: null, out: 0, pos: new THREE.Vector3(), yaw: 0 };

(function loadDrone() {
  const L = new THREE.GLTFLoader();
  L.load('models/gun-drone.json?v=1', (g) => {
    const m = new THREE.Group();
    const body = g.scene;
    body.traverse((o) => { if (o.isMesh) { o.material = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradTex, side: THREE.DoubleSide, emissive: 0x2a2e26 }); o.castShadow = !IS_TOUCH; } });
    body.position.set(-0.035, -0.5, -0.03); // the model's rotor hub at the group's origin
    m.add(body);
    // the rotor: a blurred disc that spins, plus a smaller one on the tail
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g2 = c.getContext('2d');
    const gr = g2.createRadialGradient(64, 64, 6, 64, 64, 63); gr.addColorStop(0, 'rgba(30,30,32,0.8)'); gr.addColorStop(0.3, 'rgba(60,60,64,0.35)'); gr.addColorStop(1, 'rgba(60,60,64,0.1)');
    g2.fillStyle = gr; g2.beginPath(); g2.arc(64, 64, 63, 0, Math.PI * 2); g2.fill();
    g2.strokeStyle = 'rgba(20,20,22,0.55)'; g2.lineWidth = 7; for (let i = 0; i < 4; i++) { g2.beginPath(); g2.moveTo(64, 64); const a = i * Math.PI / 2; g2.lineTo(64 + Math.cos(a) * 62, 64 + Math.sin(a) * 62); g2.stroke(); }
    const rmat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const rotor = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24).rotateX(-Math.PI / 2), rmat); rotor.position.y = 0.03; m.add(rotor);
    const tail = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12), rmat); tail.position.set(0.06, -0.24, -0.47); tail.rotation.y = Math.PI / 2; m.add(tail);
    // navigation lights: red on the left, green on the right, white strobe on the tail (they blink)
    const navs = [[0xff2020, -0.3], [0x20ff40, 0.3]].map(([c, x]) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshBasicMaterial({ color: c })); l.position.set(x, -0.3, 0.05); m.add(l); return l; });
    const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff })); strobe.position.set(0, -0.2, -0.5); m.add(strobe); navs.push(strobe);
    m.scale.setScalar(DRONE_SIZE); m.visible = false;
    scene.add(m);
    Object.assign(DRONE, { obj: m, rotor, tail, navs });
  }, undefined, (e) => console.warn('Drone model failed to load', e));
})();

const droneReady = () => DRONE.cd <= 0 && DRONE.t <= 0;
function launchDrone() {
  if (!DRONE.obj || !droneReady() || !player.alive || game.mode === 'hub' || game.state !== 'play') return false;
  DRONE.t = DRONE_TIME; DRONE.side = Math.random() < 0.5 ? 1 : -1; DRONE.fireT = 0.6;
  // it arrives from above
  DRONE.pos.copy(player.pos).add(new THREE.Vector3(0, 7, 0));
  DRONE.obj.visible = true;
  hud.popText('DRONE!', '#8fe0ff'); SFX.deploy();
  return true;
}

const _dA = new THREE.Vector3(), _dB = new THREE.Vector3(), _dC = new THREE.Vector3();
function updateDrone(dt) {
  const D = DRONE;
  if (!D.obj) return;
  if (D.t <= 0 && D.cd > 0) D.cd -= dt;
  const inStage = WORLD.id === 'arena' && game.mode !== 'hub';
  if (D.t <= 0 && D.out <= 0) { D.obj.visible = false; return; }
  if (!inStage || !player.alive) { D.t = 0; D.out = 0; D.obj.visible = false; if (D.cd <= 0) D.cd = DRONE_COOLDOWN; return; }
  // over the shoulder: a little behind and to one side of the player's head, bobbing
  D.clock += dt;
  const T = D.clock, yaw = player.yaw;
  const rx = Math.cos(yaw) * D.side, rz = -Math.sin(yaw) * D.side; // the player's right (or left)
  _dA.set(player.pos.x + rx * 0.75 + Math.sin(yaw) * 0.25, player.pos.y + 2.25 + Math.sin(T * 3.1) * 0.08, player.pos.z + rz * 0.75 + Math.cos(yaw) * 0.25);
  if (D.t > 0) {
    D.t -= dt;
    if (D.t <= 0) { D.out = 1.2; D.cd = DRONE_COOLDOWN; hud.log('Drone recharging', '#8fe0ff'); }
  } else { D.out -= dt; _dA.y += (1.2 - D.out) * 9; } // flying off
  D.pos.lerp(_dA, 1 - Math.exp(-(D.t > 0 ? 6 : 3) * dt));
  D.obj.position.copy(D.pos);
  // target: the nearest enemy in range and in sight (the player's lock if it qualifies)
  if (D.t > 0) {
    const ok = (e) => e && e.alive && e.pos.distanceTo(D.pos) < DRONE_RANGE && lineOfSight(D.pos, enemyCenter(e, _dB));
    // (2026-11-12) in a fight it shoots whatever the player is hitting; otherwise it picks enemies at
    // random in range and in sight, switching to another one every few seconds
    const fighting = player.lastHitE && performance.now() - (player.lastHitT || 0) < 3000;
    if (fighting && ok(player.lastHitE)) { D.target = player.lastHitE; D.pickT = 0; }
    else {
      D.pickT = (D.pickT || 0) - dt;
      if (!ok(D.target) || D.pickT <= 0) {
        const pool = enemies.filter((e) => e.alive && e !== D.target && ok(e));
        if (pool.length) D.target = pick(pool); else if (!ok(D.target)) D.target = null;
        D.pickT = rand(2, 3.5);
      }
    }
  } else D.target = null;
  // face the target (else where the player faces), nose dipping toward it
  let want = yaw + Math.PI, pitch = 0.08;
  if (D.target) { enemyCenter(D.target, _dB); want = Math.atan2(_dB.x - D.pos.x, _dB.z - D.pos.z); pitch = 0.22; }
  let d = want - D.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); D.yaw += d * Math.min(1, dt * 8);
  D.obj.rotation.set(pitch, D.yaw, Math.sin(T * 2.3) * 0.06, 'YXZ');
  D.rotor.rotation.y += dt * 40; D.tail.rotation.x += dt * 50;
  D.navs[0].visible = D.navs[1].visible = (T % 1) < 0.6; D.navs[2].visible = (T % 0.8) < 0.08;
  // fire: bursts of machine-gun rounds while it has a target and is facing it
  if (D.target && D.t > 0 && Math.abs(d) < 0.35) {
    D.fireT -= dt;
    if (D.fireT <= 0) {
      const burstN = Math.floor((T * 1.6) % 2.2) < 1.6; // short pauses between bursts
      D.fireT = burstN ? DRONE_RATE : 0.35;
      if (burstN) {
        _dC.set(0, -0.12, 0.36).multiplyScalar(DRONE_SIZE).applyEuler(D.obj.rotation).add(D.pos); // the gun under the nose
        enemyCenter(D.target, _dB); _dB.x += rand(-0.25, 0.25); _dB.y += rand(-0.3, 0.3); _dB.z += rand(-0.25, 0.25);
        tracer(_dC, _dB, 0xffd070, 0.03, 0.06); muzzleFlash(_dC, 0.5);
        const dmg = 70 * levelScale(player.level) * 0.12 * (D.target.star ? 0.8 : 1);
        damageEnemy(D.target, dmg, 'none', { fromPlayer: true, drone: true, dir: _dB.clone().sub(_dC).normalize() });
        if (Math.random() < 0.25) burst(_dB.clone(), 0xb3121a, 3, 2, 0.06, 0.3, 1);
        SFX.turret();
      }
    }
  }
}
