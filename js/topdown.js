'use strict';
// Top-down view (docs/decisions.md, 2026-11-07): instead of first person, a camera hangs above and
// behind the player at a fixed angle (screen up is always north) and follows them. The player is a
// full animated body (the uploaded Mixamo character) holding the rifle or the axe. Aiming is
// automatic, made for iOS touch: firing turns you to the nearest enemy in sight (locked on while it
// stays in range); a second stick on the right side of the screen optionally aims by hand
// (pushing it far fires). There is no cursor aiming on desktop either: click fires the same way.
// World geometry above the player's head is cut away around them (see CUT in js/world.js) so
// roofs and treetops never hide them.

const TD = {
  cam: new THREE.Vector3(), camReady: false,
  aimDir: new THREE.Vector3(0, 0, -1), aimPoint: new THREE.Vector3(), target: null,
  stick: { x: 0, y: 0, on: false }, fireBtn: false, mouseFire: false, lock: null,
  body: null,
};
// phones sit closer, so the characters are big enough to read on a small screen
const TD_VIEW = { height: IS_TOUCH ? 9 : 11, back: IS_TOUCH ? 5.6 : 6.8, fov: 50, chest: 1.35, cutUp: 2.3, cutR: 6 };
// The angled view: landscape gets the usual height, portrait looks from higher up to see as far sideways.
const tdHeight = () => TD_VIEW.height * (camera.aspect < 1 ? 1.45 : 1);

// Where shots and swings come from: the player's chest.
const aimEye = (out = new THREE.Vector3()) => out.set(player.pos.x, player.pos.y + TD_VIEW.chest, player.pos.z);

// ---------------------------------------------------------------------------
// Camera
function updateCamera(dt) {
  player.adsK = 0;
  if (Math.abs(camera.fov - TD_VIEW.fov) > 0.01) { camera.fov = TD_VIEW.fov; camera.updateProjectionMatrix(); }
  // follow the player, leaning a little toward where they aim
  const lead = IS_TOUCH ? 1.2 : 2.2;
  const tx = player.pos.x + TD.aimDir.x * lead, tz = player.pos.z + TD.aimDir.z * lead, ty = player.pos.y;
  if (!TD.camReady) { TD.cam.set(tx, ty, tz); TD.camReady = true; }
  const k = 1 - Math.exp(-7 * dt);
  TD.cam.x += (tx - TD.cam.x) * k; TD.cam.z += (tz - TD.cam.z) * k; TD.cam.y += (ty - TD.cam.y) * (1 - Math.exp(-4 * dt));
  const h = tdHeight(), b = TD_VIEW.back * h / TD_VIEW.height;
  camera.position.set(TD.cam.x, TD.cam.y + h, TD.cam.z + b);
  game.shakeAmt = Math.max(0, game.shakeAmt - dt * 2.5);
  const s = game.shakeAmt * game.shakeAmt * 0.35;
  camera.position.x += rand(-s, s); camera.position.z += rand(-s, s);
  camera.lookAt(TD.cam.x, TD.cam.y + 0.5, TD.cam.z);
  camera.updateMatrixWorld();
  sky.position.copy(camera.position);
  sun.position.copy(player.pos).addScaledVector(SUN_DIR, 80);
  sun.target.position.copy(player.pos);
  // cut away what's above the player's head, on the camera's side of them
  CUT.value.set(player.pos.x, player.pos.y + TD_VIEW.cutUp, player.pos.z + 2, TD_VIEW.cutR);
}
// Menus and the main menu's views see everything.
function cutawayOff() { CUT.value.y = 1e6; }

// ---------------------------------------------------------------------------
// Aiming
const _ta = new THREE.Vector3(), _tb = new THREE.Vector3();
// The nearest enemy in sight within `cone` radians of a direction and `range` metres.
function tdTarget(dir, cone, range) {
  const eye = aimEye(_tb);
  let best = null, bestS = Infinity;
  for (const e of enemies) {
    if (!e.alive) continue;
    enemyCenter(e, _ta);
    const dx = _ta.x - eye.x, dz = _ta.z - eye.z, d = Math.hypot(dx, dz);
    if (d > range || d < 0.3) continue;
    const ang = Math.acos(clamp((dx * dir.x + dz * dir.z) / (d * Math.hypot(dir.x, dir.z) || 1), -1, 1));
    if (ang > cone + Math.atan(e.radius / d)) continue;
    const sc = ang * 8 + d * 0.05;
    if (sc < bestS && lineOfSight(eye, _ta)) { best = e; bestS = sc; }
  }
  return best;
}
function tdAim(dt) {
  const eye = aimEye(_tb.clone());
  let want = null;
  TD.target = null; TD.exact = false;
  // Aiming is automatic (built for iOS touch; no cursor aiming): firing turns you to the
  // locked-on enemy, the nearest one in sight (kept while it stays in range), preferring ones in
  // front. The right-side stick on touch is an optional manual override.
  const g0 = player.gun(), range = g0 && g0.melee ? (g0.reach || 2.7) + 4 : 30;
  const st = TD.stick, m = Math.hypot(st.x, st.y);
  const btn = TD.fireBtn || (!IS_TOUCH && TD.mouseFire);
  input.fire = btn || (st.on && m > 0.7); // the aim stick pushed far shoots (or swings)
  if (st.on && m > 0.7 && !TD.stickFired) input.firePressed = true;
  TD.stickFired = st.on && m > 0.7;
  // the lock: keep the current one while it's alive, in range and in sight, else pick again
  const L = TD.lock;
  if (!(L && L.alive && L.pos.distanceTo(player.pos) < range + 3 && lineOfSight(eye, enemyCenter(L, _ta)))) {
    _ta.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    TD.lock = tdTarget(_ta, 1.2, range) || tdTarget(_ta, Math.PI, range);
  }
  if (st.on && m > 0.25) {
    // manual: the aim stick points the way to shoot; an enemy close to that line is locked onto
    _ta.set(st.x / m, 0, st.y / m);
    const e = tdTarget(_ta, 0.45, 32);
    if (e) { want = enemyCenter(e, new THREE.Vector3()); TD.target = e; TD.lock = e; }
    else want = eye.clone().addScaledVector(_ta, 10);
  } else if (input.fire || player.meleeT > 0 || player.kickT > 0) {
    if (TD.lock) { want = enemyCenter(TD.lock, new THREE.Vector3()); TD.target = TD.lock; }
  } else if (Math.hypot(player.vel.x, player.vel.z) > 1.5) {
    want = eye.clone().add(_ta.set(player.vel.x, 0, player.vel.z).normalize().multiplyScalar(10)); // face where you're going
  }
  // melee assist: an axe swing or kick turns toward an enemy within reach near where you aim
  const g = player.gun();
  if ((g && g.melee && player.meleeT > 0) || player.kickT > 0) {
    _ta.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const e = tdTarget(_ta, 1.1, (g && g.reach || 2.7) + 1.2);
    if (e) { want = enemyCenter(e, new THREE.Vector3()); TD.target = e; TD.exact = false; }
  }
  let dy = 0;
  if (want) {
    const dx = want.x - eye.x, dz = want.z - eye.z, dh = Math.hypot(dx, dz);
    if (dh > 0.4) {
      const yaw = Math.atan2(-dx, -dz);
      // turn quickly but not instantly (the body follows the aim)
      let d = yaw - player.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      player.yaw += d * Math.min(1, dt * (IS_TOUCH ? 18 : 30));
      dy = (want.y - eye.y) / dh;
    } else want = null;
  }
  // light assist: an enemy close to the aim line gets the shot's height (so shots don't sail over
  // someone standing lower)
  if (!TD.exact) {
    _ta.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const e = TD.target || tdTarget(_ta, IS_TOUCH ? 0.2 : 0.09, 60);
    if (e) { const c = enemyCenter(e, new THREE.Vector3()); dy = (c.y - eye.y) / Math.max(0.5, Math.hypot(c.x - eye.x, c.z - eye.z)); TD.target = e; }
  }
  TD.aimDir.set(-Math.sin(player.yaw), clamp(dy, -0.6, 0.6), -Math.cos(player.yaw)).normalize();
  if (want) TD.aimPoint.copy(want);
  else if (TD.lock) enemyCenter(TD.lock, TD.aimPoint); // the crosshair sits on the locked-on enemy
  else TD.aimPoint.copy(eye).addScaledVector(TD.aimDir, 8);
}

// ---------------------------------------------------------------------------
// The player's body: the uploaded character (the same model the first-person arms used), with the
// rifle and the axe in the right hand, animated with the shared clips.
const GAIT_PLAYER_AXE = { fwd: [['Walk Forward rifle', 1.25], ['Unarmed Run Forward 2', 1.6]], back: ['Run Backwards', 2.0], side: ['Goalkeeper Sidestep', 1.8], idle: 'Unarmed Idle' };
// Each combo move plays one of the enemy axe clips, timed so its blow lands when the swing does.
const TD_SWINGS = {
  slash: { clip: 'Standing Melee Combo Attack Ver. 3', start: 0.3, hit: 1.03, end: 1.35, trail: [[0.86, 1.14]] },
  backhand: { clip: 'Standing Melee Attack 360 High', start: 0.3, hit: 1.08, end: 1.5, trail: [[0.82, 1.32]] },
  chop: { clip: 'Standing Melee Attack Downward', start: 0.2, hit: 0.84, end: 1.3, trail: [[0.58, 0.98]] },
};
RIG_LOOKS.player = { bases: ['fp'] };
function buildPlayerBody() {
  if (TD.body || !RIG.base[RIG_LOOKS.player.bases[0]]) return;
  const { root, rig } = makeRigEnemy('player', {});
  const ar = rigGun('ringmaster'), axe = rigGun('axe');
  if (ar) pinToBone(rig.bones.rhand, ar.group, 1, handAlign(rig.bones.rhand));
  if (axe) pinToBone(rig.bones.rhand, axe.group, 1, handAlign(rig.bones.rhand));
  if (axe) rig.blade = axe.blade;
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(root);
  const pe = {
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, def: { scale: 1, ai: 'ranged' }, state: 'move',
    flash: 0, flinchT: 0, aiming: true, reloadT: 0, burstLeft: 0, model: { root }, rig, gait: null, atk: null,
  };
  TD.body = { root, rig, pe, ar, axe, meleeT: 0, kickT: 0, reloading: false };
  tdSetWeapon(player.gun());
}
function tdSetWeapon(g) {
  const B = TD.body;
  if (!B || !g) return;
  if (B.ar) B.ar.group.visible = !g.melee;
  if (B.axe) B.axe.group.visible = !!g.melee;
  B.pe.def.ai = g.melee ? 'melee' : 'ranged';
  B.pe.gait = g.melee ? GAIT_PLAYER_AXE : null;
  B.pe.aiming = !g.melee;
}
// The rifle's muzzle on the body, for where shots leave.
function tdMuzzle(out) {
  const B = TD.body, g = player.gun();
  if (B && B.ar && B.ar.muzzle && g && !g.melee && B.root.visible) { B.root.updateMatrixWorld(true); return B.ar.muzzle.getWorldPosition(out); }
  return aimEye(out).addScaledVector(TD.aimDir, 0.7);
}
function updatePlayerBody(dt) {
  const B = TD.body;
  if (!B) return;
  const pe = B.pe, R = B.rig, g = player.gun();
  B.root.visible = player.alive && game.mode !== 'menu';
  pe.pos.copy(player.pos);
  pe.vel.set(player.vel.x, 0, player.vel.z);
  pe.yaw = player.yaw + Math.PI; // the body model faces +Z
  pe.burstLeft = g && !g.melee && player.vmKick > 0.05 ? 1 : 0; // walking and shooting
  pe.flinchT = Math.max(0, pe.flinchT - dt);
  // a new axe swing: play its clip
  if (player.meleeT > B.meleeT + 1e-4) {
    const S = TD_SWINGS[AXE_COMBO[player.combo || 0].name];
    pe.state = 'swing';
    pe.atk = { clip: S.clip, start: S.start, hits: [S.hit], end: S.end, trail: S.trail };
    rigOnce(R, S.clip, (S.hit - S.start) / Math.max(0.05, player.meleeHitT), S.start, S.end, 0.06);
  }
  B.meleeT = player.meleeT;
  if (player.kickT > B.kickT + 1e-4) {
    pe.state = 'swing'; pe.atk = null;
    rigOnce(R, 'Mma Kick 1', (0.73 - 0.3) / (player.kickDur * 0.4), 0.3, 1.2, 0.05);
  }
  B.kickT = player.kickT;
  if (pe.state === 'swing' && player.meleeT <= 0 && player.kickT <= 0) { pe.state = 'move'; pe.atk = null; }
  // reloading plays on the upper body
  if (player.reloadT > 0 && !B.reloading) { B.reloading = true; rigUpper(R, 'Reload walking', 3.9 / Math.max(0.3, player.reloadDur), 0.2, 4.1); }
  if (player.reloadT <= 0) B.reloading = false;
  pe.reloadT = B.reloading ? 1 : 0;
  animateRig(pe, dt);
  if (player.downed) B.root.rotation.x = -0.5; // slumped
}
