'use strict';
// First-person arms: the player's Mixamo character (its body and hoodie only), seen from its own
// eyes in the viewmodel scene and playing the shared Mixamo clips (aiming idle, sprint, reload,
// grenade throw) with the current gun in its right hand. Sway, bob, recoil and aiming down the
// sights move the whole rig. Until the model loads (or if it fails) the plain floating gun is used.

const FP = { ready: false, holder: null, model: null, mixer: null, actions: {}, cur: null, mount: null, hand: null, throwT: 0, adsOff: new THREE.Vector3() };
const FP_EYE = new THREE.Vector3(0, 0.05, 0.24); // eye position from the head bone (up, forward)
const FP_PITCH = 0.12; // the arms are tipped up into view (radians) around the eye, less when aiming

function buildFpArms() {
  const base = RIG.base.fp;
  if (!base || FP.ready) return;
  const model = THREE.SkeletonUtils.clone(base.scene);
  model.scale.setScalar(base.fit);
  model.traverse((o) => {
    o.frustumCulled = false;
    if (!o.isSkinnedMesh) return;
    if (o.userData.outline) { o.material = o.material.clone(); o.material.uniforms.thick.value *= 0.3; return; } // close up: a fine ink line
    const info = base.mats[o.name];
    if (info) o.material = rigMaterial('fp', info, null);
  });
  const bone = (n) => model.getObjectByName('mixamorig' + n);
  FP.hand = bone('RightHand');
  FP.head = bone('Head');
  // the gun mount sits in the right fist (pinned in the bind pose, like the enemies' guns)
  FP.mount = new THREE.Group();
  pinToBone(FP.hand, FP.mount, 1, handAlign(FP.hand));
  FP.holder = new THREE.Group();
  FP.holder.add(model);
  FP.pivot = new THREE.Group(); // at the eye: sway, recoil and the tilt turn the rig around it
  FP.pivot.add(FP.holder);
  model.rotation.y = Math.PI; // the character faces +Z; the viewmodel camera looks down -Z
  FP.model = model;
  FP.mixer = new THREE.AnimationMixer(model);
  FP.clips = base.clips;
  vmScene.add(FP.pivot);
  fpPlay('Rifle Aiming Idle', 1, 0);
  FP.mixer.update(0);
  // the player doesn't see their own head: it's shrunk to nothing (the clips only rotate bones)
  FP.head.scale.setScalar(0.001);
  FP.ready = true;
  setViewmodel();
}

// Where the eyes are in the holder's frame for the current pose: the head bone's position plus a
// fixed offset (up and forward in the body's frame, not the head's, so the view doesn't wobble).
const _fe = new THREE.Vector3(), _fq = new THREE.Quaternion();
function fpEye(out) {
  FP.holder.position.set(0, 0, 0); FP.holder.rotation.set(0, 0, 0);
  FP.holder.updateMatrixWorld(true);
  FP.head.getWorldPosition(out);
  FP.model.getWorldQuaternion(_fq);
  return out.add(_fe.copy(FP_EYE).applyQuaternion(_fq));
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

// The current gun in the fist: the gun model's barrel (-Z) along the fingers.
function fpSetGun(g) {
  FP.mount.clear();
  if (!g) return;
  const w = new THREE.Group();
  const m = buildGunModel(g, 0.006);
  m.scale.setScalar(0.85);
  w.add(m);
  w.rotation.y = Math.PI / 2;
  w.position.set(-0.07, -0.035, 0);
  FP.mount.add(w);
  FP.muzzleRef = m;
}

// Per frame: pick the clip for what the player is doing, then lay the procedural motion on top.
function fpUpdate(dt, o) {
  const g = player.gun();
  const sprinting = o.sprint && o.moving && player.grounded && player.adsK < 0.2 && player.reloadT <= 0;
  if (FP.throwT > 0) FP.throwT -= dt;
  if (FP.throwT > 0) { if (FP.curName !== 'Grenade Throw:once') fpPlay('Grenade Throw', 1, 0.08, { t0: 1.1, t1: 2.5, dur: 0.75 }); }
  else if (player.reloadT > 0 && g && !g.tediore) { if (FP.curName !== 'Reloading idle:once') fpPlay('Reloading idle', 1, 0.12, { t0: 0.15, t1: 3.2, dur: player.reloadDur }); }
  else if (sprinting) fpPlay('Rifle Run', 1.15, 0.25);
  else fpPlay('Rifle Aiming Idle', 1, 0.2);
  FP.mixer.update(dt);
  // the camera rides the head: keep the eyes on the viewmodel camera however the body leans
  const eye = fpEye(FP.eyeNow || (FP.eyeNow = new THREE.Vector3()));
  // aiming down the sights: slide the rig so the gun sits on the centre line
  if (player.adsK > 0 && FP.mount.children.length) {
    FP.mount.getWorldPosition(_fe).sub(eye);
    FP.adsOff.set(-_fe.x, -_fe.y - 0.075, -0.14); // and out from the eye a little, so it doesn't fill the view
  }
  FP.holder.position.copy(eye).negate().addScaledVector(FP.adsOff, player.adsK);
  FP.pivot.position.set(o.x, o.y, o.z);
  FP.pivot.rotation.set(o.rx + FP_PITCH * (1 - player.adsK), o.ry, o.rz);
}
