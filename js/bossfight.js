'use strict';
// Boss fights (2026-11-17, "there needs to be a way to make boss fights more engaging"). PROPOSED
// design, built for Stage 1's bear-suit clown and usable by any melee boss that has `e.bf`
// (bossFightStart):
//  - Three rounds, wrestling-show style. At 66% and 33% health he stops and screams (a shockwave
//    that shoves the player off him), a ROUND banner drops, and he gets faster and meaner: round 2
//    calls in backup and adds the belly slam, the final round throws the cleaver twice.
//  - A stagger meter under his health bar. Hits fill it, counters fill it a lot, hits while he's
//    open fill it double; it drains if the player backs off. Full: he goes down (STAGGERED) for a
//    few seconds and takes heavy damage (hits on a downed enemy already count 1.6x).
//  - Signature moves, each telegraphed on the ground and each leaving an opening:
//      Cleaver Throw: a red lane shows where it will fly; the cleaver spins out and comes back like a
//        boomerang (it hurts both ways; dodge it). Until he catches it he's unarmed and open.
//      Belly Slam (round 2+): he jumps at where the player stands, a red circle fills under him,
//        and he crashes down with a shockwave. Then he's stuck getting up: open.
//  - His normal melee (chops, the spin, combos, the leap) carries on between them.
// All numbers are PROPOSED (BF_TUNE).

const BF_TUNE = {
  poiseMax: 100, poiseDrain: 9, poiseDrainAfter: 2.5, counterPoise: 34, openMult: 2,
  staggerT: 2.9, rounds: [0.66, 0.33], speed: [1, 1.12, 1.25], specCd: [[6, 9], [4.5, 7], [3.5, 5.5]],
  throwRange: [5, 17], throwLen: 14, throwSpeed: 17, slamR: 3.6, slamAir: 1.0,
};
const BF = { fx: [], blades: [] };

function bossFightStart(e) {
  e.bf = { round: 1, poise: 0, sincePoise: 9, specCd: rand(3, 4.5), open: false, told: {}, gun: e.rig && e.rig.blade ? e.rig.blade.edge.parent : null };
}
const bfHelp = (e, key, text, color = '#ffd23a') => { if (e.bf.told[key]) return; e.bf.told[key] = true; hud.popText(text, color); hud.log(text, color); };

// --- ground telegraphs: a red disc that fills toward its edge, and a lane ----------------------
function bfMarker(pos, r, dur) {
  const g = new THREE.Group(); g.position.set(pos.x, groundAt(pos.x, pos.z) + 0.12, pos.z);
  const mat = (o) => new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.93, r, 48).rotateX(-Math.PI / 2), mat(0.9));
  const fill = new THREE.Mesh(new THREE.CircleGeometry(r, 48).rotateX(-Math.PI / 2), mat(0.35));
  fill.scale.setScalar(0.01); g.add(ring, fill); g.renderOrder = 3; scene.add(g);
  const f = { g, fill, ring, t: 0, dur, kind: 'marker' }; BF.fx.push(f); return f;
}
function bfLane(width, len) {
  const geo = new THREE.PlaneGeometry(width, len).rotateX(-Math.PI / 2); geo.translate(0, 0, len / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  m.renderOrder = 3; scene.add(m);
  const f = { g: m, t: 0, dur: Infinity, kind: 'lane' }; BF.fx.push(f); return f;
}
function bfDrop(f) { if (!f) return; scene.remove(f.g); f.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); const i = BF.fx.indexOf(f); if (i >= 0) BF.fx.splice(i, 1); }

// --- the rounds -----------------------------------------------------------------------------
function bfRoarStart(e) {
  const B = e.bf; B.round++; e.state = 'bfRoar'; e.stateT = 0; B.hit = false; e.threat = 0;
  bfDrop(B.lane); B.lane = null; bfDrop(B.marker); B.marker = null;
  if (e.rig) { rigOnce(e.rig, 'Zombie Scream', 1.0, 0.4, 2.5, 0.1); e.rig.one.keep = true; }
  hud.banner(B.round === 2 ? 'ROUND 2' : 'FINAL ROUND', B.round === 2 ? e.def.name + ' is getting angry' : 'He has lost it');
  SFX.growl(1); SFX.yell(1);
}
function bfRoar(e, dt, dist, fwd) {
  const B = e.bf; e.stateT += dt; _want.set(0, 0, 0); e.vel.x *= 0.5; e.vel.z *= 0.5; e.faceLock = false;
  if (!B.hit && e.stateT > 0.6) {
    B.hit = true;
    ringFx(e.pos.clone(), 6, 0xff3a2a, 0.6); ringFx(e.pos.clone(), 3.5, 0xffd23a, 0.4);
    burst(e.pos.clone().setY(e.pos.y + 0.3), 0xc9a070, 26, 7, 0.16, 0.8, 0.6);
    game.shake(0.8); game.slowmo = Math.max(game.slowmo, 0.4); SFX.boom(0.7, 1);
    if (dist < 6 && !player.downed) {
      player.vel.x += fwd.x * 13; player.vel.z += fwd.z * 13; player.vy = Math.max(player.vy || 0, 5);
      if (dist < 3) player.hurt(e.def.dmg * e.dmgScale * 0.5, e.pos);
    }
    e.speedK = BF_TUNE.speed[B.round - 1];
    if (B.round === 2) for (let i = 0; i < 4; i++) game.queueSpawn(i % 2 ? 'psycho' : 'suicide', true);
  }
  if (e.stateT > 2.0) { if (e.rig && e.rig.one) e.rig.one.keep = false; e.state = 'move'; B.specCd = rand(1.5, 2.5); }
}

// --- the stagger meter ------------------------------------------------------------------------
function bossPoise(e, amount) {
  const B = e.bf;
  if (!B || !e.alive || e.state === 'down' || e.state === 'bfRoar') return;
  B.poise += amount * (B.open ? BF_TUNE.openMult : 1); B.sincePoise = 0;
  if (B.poise < BF_TUNE.poiseMax) return;
  // STAGGERED: knocked flat for a few seconds, wide open
  B.poise = 0; B.open = false;
  bfDrop(B.lane); B.lane = null; bfDrop(B.marker); B.marker = null;
  if (B.gun && !B.gun.visible) bfDropBlades(e);
  e.state = 'down'; e.stateT = BF_TUNE.staggerT; e.threat = 0; e.vel.set(0, 0, 0);
  if (e.rig) { if (e.rig.one) e.rig.one.keep = false; rigOnce(e.rig, 'Getting Up', 0.6, 0, Infinity, 0.1); }
  hud.popText('STAGGERED! HIT HIM!', '#ffd23a');
  game.slowmo = Math.max(game.slowmo, 0.5); game.shake(0.6); game.hitstop = Math.max(game.hitstop, 0.1);
  SFX.shieldBreak(); burst(enemyCenter(e, new THREE.Vector3()), 0xffd23a, 18, 6, 0.1, 0.5, 0.3, true);
}

// --- Cleaver Throw ----------------------------------------------------------------------------
function bfThrowStart(e, fwd) {
  const B = e.bf; e.state = 'bfThrow'; e.stateT = 0; B.dir = fwd.clone(); B.released = false;
  B.throwsLeft = B.throwsLeft > 0 ? B.throwsLeft - 1 : (B.round >= 3 ? 1 : 0);
  if (e.rig) { rigOnce(e.rig, 'Grenade Throw', 1.0, 1.1, 2.65, 0.1); e.rig.one.keep = true; }
  B.lane = bfLane(1.3, BF_TUNE.throwLen); B.lane.e = e;
  SFX.yell(1);
}
function bfThrow(e, dt, tgt, fwd) {
  const B = e.bf; e.stateT += dt; _want.set(0, 0, 0); e.vel.x *= 0.5; e.vel.z *= 0.5;
  if (e.stateT < 0.7) { B.dir.copy(fwd); e.faceLock = false; } else e.faceLock = true; // aims, then commits
  if (B.lane) { B.lane.g.position.set(e.pos.x, groundAt(e.pos.x, e.pos.z) + 0.12, e.pos.z); B.lane.g.rotation.y = Math.atan2(B.dir.x, B.dir.z); B.lane.g.material.opacity = 0.25 + 0.25 * Math.sin(e.stateT * 18) ** 2; }
  e.threat = !B.released ? Math.max(0.05, 0.95 - e.stateT) : 0; e.unblockable = true;
  if (!B.released && e.stateT >= 0.95) {
    B.released = true; e.threat = 0;
    bfDrop(B.lane); B.lane = null;
    const from = e.rig ? e.rig.bones.rhand.getWorldPosition(new THREE.Vector3()) : enemyCenter(e, new THREE.Vector3());
    from.y = Math.max(from.y, e.pos.y + 1.2);
    bfLaunchBlade(e, from, B.dir.clone());
    if (B.gun) B.gun.visible = false;
    SFX.swing();
  }
  if (e.stateT >= 1.5) { if (e.rig && e.rig.one) e.rig.one.keep = false; e.state = 'bfWait'; e.stateT = 0; B.open = true; bfHelp(e, 'unarmed', "HE'S UNARMED: GET IN THERE!"); }
}
function bfLaunchBlade(e, from, dir) {
  if (!RIG.guns.cleaver) RIG.guns.cleaver = rigCleaver();
  const mesh = RIG.guns.cleaver.clone(); mesh.traverse((o) => { if (o.isMesh) o.material = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradTex, emissive: 0x222222 }); });
  const spin = new THREE.Group(); spin.add(mesh); mesh.position.set(0, -0.28, -0.06);
  const holder = new THREE.Group(); holder.add(spin); holder.scale.setScalar(2.4 * e.def.scale); holder.position.copy(from);
  // a pale blur disc round it, so it reads as a spinning blade from the overhead camera
  if (!BF.discMat) BF.discMat = new THREE.MeshBasicMaterial({ color: 0xffe8d0, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20).rotateY(Math.PI / 2), BF.discMat); spin.add(disc);
  holder.rotation.y = Math.atan2(dir.x, dir.z); scene.add(holder);
  BF.blades.push({ e, holder, spin, pos: from.clone(), dir, out: 0, back: false, hitOut: false, hitBack: false, t: 0 });
}
function bfDropBlades(e) {
  for (let i = BF.blades.length - 1; i >= 0; i--) if (BF.blades[i].e === e) { scene.remove(BF.blades[i].holder); BF.blades.splice(i, 1); }
  if (e.bf && e.bf.gun) e.bf.gun.visible = true; // (he picks it up as he gets back on his feet)
}
function bfWait(e, dt, tgt, dist, fwd, sp) {
  // unarmed: he backs off a little and waits for the cleaver to come back
  e.stateT += dt; e.faceLock = false;
  _want.copy(fwd).multiplyScalar(dist < 4 ? -sp * 0.5 : 0);
  if (!BF.blades.some((b) => b.e === e) || e.stateT > 4) bfCatch(e);
}
function bfCatch(e) {
  const B = e.bf; bfDropBlades(e); B.open = false;
  if (B.throwsLeft > 0) { e.state = 'move'; B.specCd = 0.35; return; }
  e.state = 'move'; B.specCd = rand(...BF_TUNE.specCd[B.round - 1]);
}

// --- Belly Slam -------------------------------------------------------------------------------
function bfSlamStart(e, tgt) {
  const B = e.bf; e.state = 'bfSlamWind'; e.stateT = 0;
  const lead = Math.min(1.2, Math.hypot(player.vel.x, player.vel.z) * 0.3), vl = Math.hypot(player.vel.x, player.vel.z) || 1;
  B.at = new THREE.Vector3(tgt.pos.x + player.vel.x / vl * lead, 0, tgt.pos.z + player.vel.z / vl * lead);
  B.marker = bfMarker(B.at, BF_TUNE.slamR, 0.45 + BF_TUNE.slamAir);
  if (e.rig) { rigOnce(e.rig, 'Great Sword Jump Attack', 1.02 / (0.45 + BF_TUNE.slamAir), 0.2, 2.17, 0.08); e.rig.one.keep = true; }
  SFX.growl(1);
  bfHelp(e, 'slam', 'GET OUT OF THE RED!', '#ff3b2a');
}
function bfSlam(e, dt, tgt, dist) {
  const B = e.bf; e.stateT += dt; e.faceLock = true;
  const toAt = Math.hypot(player.pos.x - B.at.x, player.pos.z - B.at.z);
  e.threat = toAt < BF_TUNE.slamR + 0.5 ? Math.max(0.05, 0.45 + BF_TUNE.slamAir - e.stateT) : 0; e.unblockable = true;
  if (e.state === 'bfSlamWind') {
    _want.set(0, 0, 0); e.vel.x *= 0.5; e.vel.z *= 0.5;
    if (e.stateT >= 0.45) {
      e.state = 'bfSlamAir'; const T = BF_TUNE.slamAir;
      e.vy = 11 * T; e.grounded = false; e.pos.y += 0.05;
      B.v = new THREE.Vector3((B.at.x - e.pos.x) / T, 0, (B.at.z - e.pos.z) / T);
    }
    return;
  }
  if (e.state === 'bfSlamAir') {
    _want.copy(B.v);
    if ((e.grounded && e.stateT > 0.7) || e.stateT > 0.45 + BF_TUNE.slamAir + 0.3) {
      // the crash
      bfDrop(B.marker); B.marker = null; e.threat = 0;
      const at = e.pos.clone(); at.y = groundAt(at.x, at.z);
      ringFx(at, BF_TUNE.slamR + 0.4, 0xff3a2a, 0.5); ringFx(at, BF_TUNE.slamR * 0.6, 0xc9a070, 0.4);
      burst(at.clone().setY(at.y + 0.2), 0xc9a070, 30, 7, 0.18, 0.8, 0.6);
      bloodSplat(at, rand(1, 1.5), 'splat');
      SFX.boom(0.9, 1); SFX.chop(false);
      const pd = Math.hypot(player.pos.x - at.x, player.pos.z - at.z);
      game.shake(clamp(1.1 - pd / 14, 0.2, 0.9));
      const hit = pd < BF_TUNE.slamR && !player.downed && !tgt.isTurret;
      if (hit) {
        player.hurt(e.def.dmg * e.dmgScale * 1.7, e.pos);
        const k = 1 / Math.max(pd, 0.3); player.vel.x += (player.pos.x - at.x) * k * 9; player.vel.z += (player.pos.z - at.z) * k * 9; player.vy = Math.max(player.vy || 0, 6);
        game.hitstop = Math.max(game.hitstop, 0.08);
      }
      e.state = 'bfStuck'; e.stateT = 0; B.stuckFor = hit ? 1.4 : 2.4; B.open = true; e.vel.set(0, 0, 0);
      if (e.rig && e.rig.one) e.rig.one.action.timeScale = 0.55;
      if (!hit) bfHelp(e, 'stuck', "HE'S STUCK: HIT HIM!");
    }
    return;
  }
  // stuck after the crash
  _want.set(0, 0, 0); e.vel.x *= 0.3; e.vel.z *= 0.3; e.faceLock = true;
  if (e.stateT >= B.stuckFor) { if (e.rig && e.rig.one) e.rig.one.keep = false; B.open = false; e.state = 'move'; B.specCd = rand(...BF_TUNE.specCd[B.round - 1]); }
}

// --- the brain: called from updateMelee for a boss with e.bf; true when it ran this frame -------
function bossFightThink(e, dt, tgt, dist, fwd, sp) {
  const B = e.bf;
  B.sincePoise += dt;
  if (B.sincePoise > BF_TUNE.poiseDrainAfter) B.poise = Math.max(0, B.poise - BF_TUNE.poiseDrain * dt);
  // the final round: he steams blood
  if (B.round >= 3 && (B.steamT = (B.steamT || 0) - dt) <= 0) { B.steamT = 0.25; burst(enemyCenter(e, new THREE.Vector3()).setY(e.pos.y + e.height * 0.95), 0x9a0a10, 3, 1.5, 0.07, 0.5, -0.3); }
  if (e.state === 'bfRoar') { bfRoar(e, dt, dist, fwd); return true; }
  if (e.state === 'bfThrow') { bfThrow(e, dt, tgt, fwd); return true; }
  if (e.state === 'bfWait') { bfWait(e, dt, tgt, dist, fwd, sp); return true; }
  if (e.state === 'bfSlamWind' || e.state === 'bfSlamAir' || e.state === 'bfStuck') { bfSlam(e, dt, tgt, dist); return true; }
  if (e.state !== 'move') return false;
  // a new round
  if (B.round < 3 && e.hp / e.maxHp < BF_TUNE.rounds[B.round - 1]) { bfRoarStart(e); return true; }
  B.specCd -= dt;
  if (B.specCd > 0 || player.downed || tgt.isTurret) return false;
  const canThrow = dist > BF_TUNE.throwRange[0] && dist < BF_TUNE.throwRange[1] && e.direct !== false;
  const canSlam = B.round >= 2 && dist > 4 && dist < 15;
  if (canSlam && (!canThrow || Math.random() < 0.5)) { bfSlamStart(e, tgt); return true; }
  if (canThrow) { bfThrowStart(e, fwd); return true; }
  if (B.throwsLeft > 0 && dist <= BF_TUNE.throwRange[0]) B.throwsLeft = 0;
  return false;
}

// --- per frame: telegraphs and flying cleavers --------------------------------------------------
function updateBossFight(dt) {
  for (let i = BF.fx.length - 1; i >= 0; i--) {
    const f = BF.fx[i]; f.t += dt;
    if (f.kind === 'marker') { const k = clamp(f.t / f.dur, 0, 1); f.fill.scale.setScalar(Math.max(0.01, k)); f.ring.material.opacity = 0.55 + 0.45 * Math.sin(f.t * 20) ** 2; }
    if (f.t > f.dur + 1.5 || (f.e && !f.e.alive)) bfDrop(f);
  }
  const pc = player.center();
  for (let i = BF.blades.length - 1; i >= 0; i--) {
    const b = BF.blades[i], e = b.e; b.t += dt;
    if (!e.alive) { scene.remove(b.holder); BF.blades.splice(i, 1); continue; }
    b.spin.rotation.x -= dt * 22;
    if (!b.back) {
      const step = BF_TUNE.throwSpeed * dt; b.pos.addScaledVector(b.dir, step); b.out += step;
      if (b.out >= BF_TUNE.throwLen) { b.back = true; SFX.swing(); }
    } else {
      const hand = e.rig ? e.rig.bones.rhand.getWorldPosition(new THREE.Vector3()) : enemyCenter(e, new THREE.Vector3());
      const to = hand.sub(b.pos), d = to.length();
      if (d < 1.0 || b.t > 4) { scene.remove(b.holder); BF.blades.splice(i, 1); if (e.state === 'bfWait') bfCatch(e); continue; }
      b.pos.addScaledVector(to.normalize(), Math.min(d, (BF_TUNE.throwSpeed + 4) * dt));
      b.holder.rotation.y = Math.atan2(to.x, to.z);
    }
    b.holder.position.copy(b.pos);
    const hitKey = b.back ? 'hitBack' : 'hitOut';
    if (!b[hitKey] && player.alive && !player.downed && Math.hypot(b.pos.x - pc.x, b.pos.z - pc.z) < 1.1 && Math.abs(b.pos.y - pc.y) < 1.6) {
      b[hitKey] = true;
      player.hurt(e.def.dmg * e.dmgScale * 1.2, b.pos);
      burst(pc.clone(), 0x8a1d1d, 10, 4, 0.09, 0.5); game.shake(0.5);
    }
  }
}
function bossFightClear() {
  for (const f of BF.fx.slice()) bfDrop(f);
  for (const b of BF.blades) scene.remove(b.holder);
  BF.blades.length = 0;
}
