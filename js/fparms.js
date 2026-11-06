'use strict';
// First-person arms: the player's Mixamo character (its body and hoodie only), seen from its own
// eyes in the viewmodel scene. The gun is placed where a first-person gun belongs (low right,
// toed in towards the crosshair; lowered when sprinting, on the sight line when aiming) and the
// arms reach for it with two-bone IK: the right hand on the grip and the left on the handguard,
// each held the way the Mixamo aiming clip holds its own rifle. The shared clips still drive the
// body and breathing, and the hands let go of the IK for the reload (left) and grenade throw (both).
// Sway, bob and recoil turn the whole rig around the eye. Until the model loads (or if it fails)
// the plain floating gun is used.

const FP = { ready: false, actions: {}, ikR: 1, ikL: 1, sprintK: 0, throwK: 0, throwT: 0, mount: null };
const FP_EYE = new THREE.Vector3(0, 0.05, -0.04); // eye position from the head bone (up, forward in the body's frame); the head is hidden
const FP_STRETCH = [1.15, 1.3]; // upper arms and forearms lengthened so the hands reach a long gun (unseen from the eye)
// Where the gun's grip sits (camera space, metres): at the hip, and the turn that toes the barrel in.
const FP_HIP = new THREE.Vector3(0.13, -0.19, -0.34), FP_TOE = 0.05;
const FP_GUN_SCALE = 0.75;
// Where the support hand goes on guns without a model (gun frame: barrel down -Z, grip at origin).
const FP_FOREGRIP = { pistol: -0.03, smg: -0.2, ar: -0.3, shotgun: -0.33, sniper: -0.36, launcher: -0.3 };

function buildFpArms() {
  const base = RIG.base.fp;
  if (!base || FP.ready) return;
  const model = THREE.SkeletonUtils.clone(base.scene);
  model.scale.setScalar(base.fit);
  model.traverse((o) => {
    o.frustumCulled = false;
    if (!o.isSkinnedMesh) return;
    if (o.userData.outline) { o.visible = false; return; } // no ink shell: the camera sits by the shoulders, inside it
    const info = base.mats[o.name];
    if (info) o.material = rigMaterial('fp', info, null);
  });
  const bone = (n) => model.getObjectByName('mixamorig' + n);
  FP.head = bone('Head');
  FP.spine = [bone('Spine1'), bone('Spine2')];
  FP.arm = {};
  for (const s of ['Left', 'Right']) FP.arm[s] = { clav: bone(s + 'Shoulder'), up: bone(s + 'Arm'), fore: bone(s + 'ForeArm'), hand: bone(s + 'Hand'), sh: s === 'Left' ? -1 : 1 };
  FP.holder = new THREE.Group();
  FP.holder.add(model);
  FP.pivot = new THREE.Group(); // at the eye: sway, recoil and bob turn the rig around it
  FP.pivot.add(FP.holder);
  model.rotation.y = Math.PI; // the character faces +Z; the viewmodel camera looks down -Z
  FP.model = model;
  FP.mixer = new THREE.AnimationMixer(model);
  FP.clips = base.clips;
  vmScene.add(FP.pivot);
  fpPlay('Rifle Aiming Idle', 1, 0);
  FP.mixer.update(0);
  // How the aiming clip holds its rifle, as hand placements relative to the gun: the gun frame is
  // the right fist's grip (barrel along the body's forward, top up), and the left hand is wherever
  // the clip puts it on the handguard.
  FP.pivot.updateMatrixWorld(true);
  const R = FP.arm.Right.hand, L = FP.arm.Left.hand;
  const hq = R.getWorldQuaternion(new THREE.Quaternion());
  const want = model.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)); // gun -Z to the body's +Z
  const finger = R.children.find((c) => c.isBone && /Middle1/.test(c.name));
  const hp = R.getWorldPosition(new THREE.Vector3());
  const grip = finger.getWorldPosition(new THREE.Vector3()).sub(hp).multiplyScalar(0.55).add(hp);
  grip.y -= 0.03; // the grip sits in the curl of the fingers, a little below the knuckles
  const gunW = new THREE.Matrix4().compose(grip, want, new THREE.Vector3(1, 1, 1)), gunInv = gunW.clone().invert();
  const unscaled = (o) => { const p = new THREE.Vector3(), q = new THREE.Quaternion(); o.getWorldPosition(p); o.getWorldQuaternion(q); return new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1)); };
  FP.relR = gunInv.clone().multiply(unscaled(R)); // right wrist in the gun frame
  FP.relL = gunInv.clone().multiply(unscaled(L)); // left wrist in the gun frame (its depth is set per gun)
  // the left hand's own axes (in its bone's frame): fingers, and the palm side (where the thumb is)
  const lb = (n) => L.children.find((c) => c.isBone && new RegExp(n).test(c.name)).position.clone();
  const f = lb('Middle1').normalize(), across = lb('Index1').sub(lb('Pinky1')).normalize();
  const n = f.clone().cross(across).normalize();
  if (n.dot(lb('Thumb1')) < 0) n.negate();
  FP.lBasisInv = new THREE.Matrix4().makeBasis(f, n, f.clone().cross(n)).transpose();
  FP.palmL = lb('Middle1').length() * L.getWorldScale(new THREE.Vector3()).x;
  // longer forearms (moving the child bones out stretches the skin along the limb)
  for (const s of ['Left', 'Right']) { FP.arm[s].fore.position.multiplyScalar(FP_STRETCH[0]); FP.arm[s].hand.position.multiplyScalar(FP_STRETCH[1]); }
  // the gun, now on its own in front of the eye
  FP.mount = new THREE.Group();
  FP.pivot.add(FP.mount);
  // the player doesn't see their own head: it's shrunk to nothing (the clips only rotate bones)
  FP.head.scale.setScalar(0.001);
  FP.ready = true;
  setViewmodel();
}

// Where the eyes are in the pivot's frame for the current pose: the head bone's position plus a
// fixed offset (up and forward in the body's frame, not the head's, so the view doesn't wobble).
const _fe = new THREE.Vector3(), _fq = new THREE.Quaternion();
function fpEye(out) {
  FP.holder.position.set(0, 0, 0); FP.holder.rotation.set(0, 0, 0);
  FP.pivot.updateMatrixWorld(true);
  FP.head.getWorldPosition(out);
  FP.model.getWorldQuaternion(_fq);
  FP.pivot.worldToLocal(out.add(_fe.copy(FP_EYE).applyQuaternion(_fq)));
  return out;
}

// Crossfade to a clip: looping, or once over `dur` seconds from clip time t0 to t1.
function fpPlay(name, ts = 1, fade = 0.2, once = null) {
  const clip = FP.clips && FP.clips[name];
  if (!clip) return;
  const key = name + (once ? ':once' : '');
  let a = FP.actions[key];
  if (!a) { a = FP.mixer.clipAction(clip); FP.actions[key] = a; }
  if (FP.cur === a && !once) { a.timeScale = ts; return; }
  a.reset(); a.enabled = true;
  if (once) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.time = once.t0; a.timeScale = (once.t1 - once.t0) / once.dur; }
  else { a.setLoop(THREE.LoopRepeat, Infinity); a.timeScale = ts; }
  a.play();
  if (FP.cur && FP.cur !== a) a.crossFadeFrom(FP.cur, fade, false);
  FP.cur = a; FP.curName = key;
}

// The current gun: its model in the gun frame (barrel down -Z, grip at the origin), and where the
// support hand holds it.
function fpSetGun(g) {
  FP.mount.clear();
  if (!g) return;
  const m = buildGunModel(g, 0.006);
  m.scale.setScalar(FP_GUN_SCALE);
  FP.mount.add(m);
  FP.muzzleRef = m;
  FP.axe = !!g.melee;
  FP.optic = m.userData.optic || null;
  FP.mag = m.userData.mag || null;
  if (FP.mag) FP.magY = FP.mag.position.y;
  // the handguard: the model's foregrip socket, or a spot along the barrel by gun type
  const sock = g.model && GUN_SOCKETS[g.model];
  FP.foreZ = sock && sock.foregrip ? -(sock.foregrip[2] - sock.grip[2]) * FP_GUN_SCALE : (FP_FOREGRIP[g.type] || -0.28) * FP_GUN_SCALE;
  // the sight line for aiming: the optic's eye point, or just over the top of the gun
  FP.sight = FP.optic ? null : new THREE.Vector3(0, 0.1 * FP_GUN_SCALE, -0.05);
}

// The axe: held up and forward at rest. The combo's three moves each have their own keyframes
// (time 0..1 through the swing: x, y, z, pitch, yaw, roll of the axe in front of the eye):
//  1. slash: wound up high on the right, cut diagonally down to the lower left
//  2. backhand: pulled across to the left, swept flat out to the right
//  3. chop: lifted high overhead, brought straight down the middle
// The key marked `strike` is where the axe accelerates (it eases in rather than out).
const AXE_REST = [0.2, -0.3, -0.42, -0.45, 0.25, -0.15];
const AXE_MOVES = {
  slash: { strike: 1, keys: [
    [0, AXE_REST],
    [0.35, [0.26, -0.12, -0.34, 0.6, 0.4, -0.5]], // up and cocked back over the right shoulder
    [0.58, [-0.14, -0.34, -0.55, -1.45, 0.1, 0.95]], // through, down and across to the left
    [0.78, [-0.1, -0.4, -0.5, -1.2, 0.15, 0.8]],
    [1, AXE_REST],
  ] },
  backhand: { strike: 1, keys: [
    [0, AXE_REST],
    [0.32, [-0.32, -0.06, -0.3, -0.15, 1.1, 1.45]], // drawn across the body to the left, blade flat
    [0.56, [0.4, -0.1, -0.5, -0.3, -1.25, 1.35]], // swept out to the right
    [0.76, [0.36, -0.18, -0.44, -0.3, -1.0, 1.0]],
    [1, AXE_REST],
  ] },
  chop: { strike: 2, keys: [
    [0, AXE_REST],
    [0.2, [0.12, -0.05, -0.3, 0.6, 0.15, -0.1]],
    [0.44, [0.05, 0.12, -0.24, 1.25, 0.05, 0]], // raised high overhead, held a beat
    [0.62, [0.02, -0.5, -0.6, -1.65, 0, 0.05]], // slammed straight down
    [0.8, [0.03, -0.48, -0.56, -1.55, 0.02, 0.05]], // buried for a moment
    [1, AXE_REST],
  ] },
};
function fpAxePose(p, e) {
  let v = AXE_REST;
  if (player.meleeT > 0) {
    const M = AXE_MOVES[(AXE_COMBO[player.combo || 0] || AXE_COMBO[0]).name], K = M.keys;
    const t = 1 - player.meleeT / player.meleeDur;
    let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++;
    const [t0, a] = K[i], [t1, b] = K[i + 1];
    let u = clamp((t - t0) / (t1 - t0), 0, 1);
    u = i === M.strike ? u * u : u * u * (3 - 2 * u);
    v = a.map((x, j) => x + (b[j] - x) * u);
  }
  // a kick pulls the axe back and up out of the way
  if (player.kickT > 0) {
    const s = Math.sin((1 - player.kickT / player.kickDur) * Math.PI);
    v = v.map((x, j) => x + [0.05, 0.08, 0.12, 0.3, 0.1, -0.1][j] * s);
  }
  p.set(v[0], v[1], v[2]);
  e.set(v[3], v[4], v[5]);
}
// The kick: a boot thrusts up into view from below.
function fpKick(dt) {
  if (!FP.boot) {
    const g = new THREE.Group();
    box(0.13, 0.12, 0.3, 0x2a1c14, 0, 0, -0.05, g, 0.012);
    box(0.14, 0.04, 0.32, 0x111111, 0, -0.07, -0.05, g, 0.012);
    box(0.12, 0.2, 0.13, 0x3b3f52, 0, 0.13, 0.06, g, 0.012); // the trouser leg
    g.visible = false;
    FP.pivot.add(g);
    FP.boot = g;
  }
  const on = player.kickT > 0;
  FP.boot.visible = on;
  if (!on) return;
  const t = 1 - player.kickT / player.kickDur;
  const s = t < 0.4 ? t / 0.4 : 1 - (t - 0.4) / 0.6; // out fast, back slower
  const u = s * s * (3 - 2 * s);
  FP.boot.position.set(0.1, -0.72 + u * 0.4, -0.25 - u * 0.5);
  FP.boot.rotation.set(-0.9 + u * 0.75, 0, 0);
}

// ---------------------------------------------------------------------------
// Two-bone IK
const _ia = new THREE.Vector3(), _ib = new THREE.Vector3(), _ic = new THREE.Vector3(), _id = new THREE.Vector3(), _iq = new THREE.Quaternion(), _ir = new THREE.Quaternion();
// Turn `bone` (in world space, as little as possible) so its child points at world point `to`.
function fpAim(bone, child, to) {
  bone.getWorldPosition(_ia);
  child.getWorldPosition(_ib);
  _ib.sub(_ia).normalize();
  _ic.copy(to).sub(_ia).normalize();
  _iq.setFromUnitVectors(_ib, _ic);
  bone.getWorldQuaternion(_ir).premultiply(_iq);
  bone.parent.getWorldQuaternion(_iq).invert();
  bone.quaternion.copy(_iq.multiply(_ir));
  bone.updateMatrixWorld(true);
}
// Put arm `A`'s wrist at world point T with world rotation Q, blended in by w; the elbow bends
// towards `pole` (world direction).
const _S = new THREE.Vector3(), _T = new THREE.Vector3(), _E = new THREE.Vector3(), _U = new THREE.Vector3(), _P = new THREE.Vector3(), _H = new THREE.Vector3(), _Q = new THREE.Quaternion();
function fpReach(A, T, Q, w, pole) {
  if (w <= 0.001) return;
  // the collarbone swings a little towards a far target, as a real shoulder does
  if (A.clav) {
    A.up.getWorldPosition(_S);
    A.hand.getWorldPosition(_H);
    _T.copy(_H).lerp(T, w);
    const a0 = A.fore.getWorldPosition(_E).distanceTo(_S) + A.hand.getWorldPosition(_H).distanceTo(_E);
    const over = _T.distanceTo(_S) - a0 * 0.92;
    if (over > 0) {
      A.clav.getWorldPosition(_P);
      _U.copy(_S).sub(_P);
      const len = _U.length();
      _U.lerp(_ic.copy(_T).sub(_P).normalize().multiplyScalar(len), clamp(over / (len * 1.2), 0, 0.45));
      fpAim(A.clav, A.up, _P.add(_U));
    }
  }
  A.up.getWorldPosition(_S);
  const a = A.fore.getWorldPosition(_E).distanceTo(_S), b = A.hand.getWorldPosition(_H).distanceTo(_E);
  _T.copy(_H).lerp(T, w);
  const d = Math.min(_T.distanceTo(_S), (a + b) * 0.999);
  _U.copy(_T).sub(_S).normalize();
  const cosA = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
  _P.copy(pole).addScaledVector(_U, -pole.dot(_U)).normalize();
  _E.copy(_S).addScaledVector(_U, a * cosA).addScaledVector(_P, a * Math.sqrt(1 - cosA * cosA));
  fpAim(A.up, A.fore, _E);
  fpAim(A.fore, A.hand, _T);
  A.hand.getWorldQuaternion(_Q).slerp(Q, w);
  A.hand.parent.getWorldQuaternion(_iq).invert();
  A.hand.quaternion.copy(_iq.multiply(_Q));
  A.hand.updateMatrixWorld(true);
}

// The support hand under the handguard: palm up against it, fingers wrapping up the far side,
// thumb along the near side. Leaves the wrist position in _T and its rotation in _gq.
const _lf = new THREE.Vector3(), _ln = new THREE.Vector3(), _lx = new THREE.Vector3(), _lw = new THREE.Matrix4(), _lp = new THREE.Vector3();
function fpGripLeft(gun) {
  _gq.setFromRotationMatrix(_m4.extractRotation(gun));
  _lf.set(1, 0.55, -0.15).normalize().applyQuaternion(_gq); // fingers: across to the right and up
  _ln.set(0, 1, 0).applyQuaternion(_gq); // palm: up into the gun
  _ln.addScaledVector(_lf, -_ln.dot(_lf)).normalize();
  _lx.copy(_lf).cross(_ln);
  _lw.makeBasis(_lf, _ln, _lx).multiply(FP.lBasisInv);
  _gq.setFromRotationMatrix(_lw);
  // the palm's centre just under the handguard; the wrist is back from it along the fingers
  _lp.set(-0.012, -0.04, FP.foreZ).applyMatrix4(gun);
  _T.copy(_lp).addScaledVector(_lf, -FP.palmL * 0.55).addScaledVector(_ln, -0.025);
}

// Turn the chest square to the camera: the aiming clips twist the shoulders sideways.
const _sl = new THREE.Vector3(), _sr = new THREE.Vector3(), _yq = new THREE.Quaternion(), _yaxis = new THREE.Vector3(0, 1, 0);
function fpSquareChest() {
  FP.pivot.updateMatrixWorld(true);
  FP.arm.Left.up.getWorldPosition(_sl); FP.arm.Right.up.getWorldPosition(_sr);
  const yaw = Math.atan2(_sr.z - _sl.z, _sr.x - _sl.x);
  _yq.setFromAxisAngle(_yaxis, yaw / FP.spine.length);
  for (const b of FP.spine) {
    b.getWorldQuaternion(_ir).premultiply(_yq);
    b.parent.getWorldQuaternion(_iq).invert();
    b.quaternion.copy(_iq.multiply(_ir));
    b.updateMatrixWorld(true);
  }
}

// ---------------------------------------------------------------------------
// Per frame: pick the clip for what the player is doing, place the gun, then reach for it.
const _gp = new THREE.Vector3(), _gq = new THREE.Quaternion(), _ge = new THREE.Euler(), _ads = new THREE.Vector3(), _m4 = new THREE.Matrix4(), _m5 = new THREE.Matrix4();
const _poleR = new THREE.Vector3(0.5, -1, 0.35), _poleL = new THREE.Vector3(-0.7, -1, 0.1);
function fpUpdate(dt, o) {
  const g = player.gun();
  const k = player.adsK;
  const sprinting = o.sprint && o.moving && player.grounded && k < 0.2 && player.reloadT <= 0;
  const reloading = player.reloadT > 0 && g && !g.tediore;
  if (FP.throwT > 0) FP.throwT -= dt;
  if (FP.throwT > 0) { if (FP.curName !== 'Grenade Throw:once') fpPlay('Grenade Throw', 1, 0.08, { t0: 1.1, t1: 2.5, dur: 0.75 }); }
  else fpPlay('Rifle Aiming Idle', 1, 0.2);
  FP.mixer.update(dt);
  fpSquareChest();
  // the camera rides the head
  const eye = fpEye(FP.eyeNow || (FP.eyeNow = new THREE.Vector3()));
  FP.holder.position.copy(eye).negate();
  FP.pivot.position.set(o.x, o.y, o.z);
  FP.pivot.rotation.set(o.rx, o.ry, o.rz);
  // the gun: at the hip, lowered and canted when sprinting, dipped away for a throw, on the sight line when aiming
  const ease = (cur, on, rate) => cur + ((on ? 1 : 0) - cur) * Math.min(1, dt * rate);
  FP.sprintK = ease(FP.sprintK, sprinting, 8);
  FP.throwK = ease(FP.throwK, FP.throwT > 0, 10);
  FP.reloadK = ease(FP.reloadK || 0, reloading, 9);
  // reload: the gun tips over towards the player, magazine side out
  _gp.copy(FP_HIP).add(_ads.set(0.03, -0.03, 0.04).multiplyScalar(FP.sprintK)).add(_ads.set(0.04, -0.45, 0.1).multiplyScalar(FP.throwK)).add(_ads.set(-0.04, 0.03, 0.04).multiplyScalar(FP.reloadK));
  _ge.set(-0.22 * FP.sprintK - 0.5 * FP.throwK + 0.18 * FP.reloadK, FP_TOE + 0.12 * FP.sprintK, 0.22 * FP.sprintK + 0.55 * FP.reloadK);
  fpKick(dt);
  if (FP.axe) fpAxePose(_gp, _ge);
  else if (k > 0 && FP.mount.children.length) {
    // the optic's eye point (or the sight line) a hand's width in front of the eye
    if (FP.optic) { FP.mount.updateMatrixWorld(true); _ads.copy(FP.optic.getWorldPosition(_ads)); FP.mount.worldToLocal(_ads); }
    else _ads.copy(FP.sight);
    _ads.set(-_ads.x, -_ads.y, -0.15 - _ads.z);
    _gp.lerp(_ads, k);
    _ge.set(_ge.x * (1 - k), _ge.y * (1 - k), _ge.z * (1 - k));
  }
  FP.mount.position.copy(_gp);
  FP.mount.rotation.copy(_ge);
  FP.mount.updateMatrixWorld(true);
  // reloading a gun with a magazine: it drops out, a fresh one comes up
  if (FP.mag) {
    const r = player.reloadT > 0 ? 1 - player.reloadT / player.reloadDur : 1;
    const d = r < 0.2 ? r / 0.2 : r < 0.55 ? 1 : r < 0.8 ? 1 - (r - 0.55) / 0.25 : 0;
    FP.mag.position.y = FP.magY - d * 0.3;
    FP.mag.visible = d < 0.99;
  }
  // the hands: right on the grip (let go for a throw), left on the handguard (let go to reload or throw)
  FP.ikR = ease(FP.ikR, FP.throwT <= 0 && g, 10);
  FP.ikL = ease(FP.ikL, FP.throwT <= 0 && g, 8);
  const gun = FP.mount.matrixWorld;
  _m4.multiplyMatrices(gun, FP.relR);
  _m4.decompose(_T, _gq, _ads);
  fpReach(FP.arm.Right, _T.clone(), _gq.clone(), FP.ikR, _poleR);
  if (FP.axe) {
    // the free hand hangs down out of view
    FP.arm.Left.hand.getWorldQuaternion(_gq);
    fpReach(FP.arm.Left, new THREE.Vector3(-0.3, -0.75, 0.0), _gq.clone(), 1, _poleL);
    return;
  }
  fpGripLeft(gun);
  // reloading: the left hand goes down to the magazine, pulls it out and pushes a fresh one in
  if (FP.reloadK > 0.01) {
    const r = player.reloadT > 0 ? 1 - player.reloadT / player.reloadDur : 1;
    const drop = r < 0.2 ? r / 0.2 : r < 0.55 ? 1 : r < 0.8 ? 1 - (r - 0.55) / 0.25 : 0;
    _lp.set(0, -0.11 * FP_GUN_SCALE - drop * 0.24, -0.1 * FP_GUN_SCALE).applyMatrix4(gun);
    _lp.addScaledVector(_lf, -FP.palmL * 0.5);
    _T.lerp(_lp, FP.reloadK);
  }
  fpReach(FP.arm.Left, _T.clone(), _gq.clone(), FP.ikL, _poleL);
}
