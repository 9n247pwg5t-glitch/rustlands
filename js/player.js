'use strict';
// The player: movement, health/shield, weapons and viewmodel, grenades,
// the deployable turret action skill, and player projectiles.

const input = {
  keys: Object.create(null),
  fire: false, firePressed: false, ads: false,
  lookDX: 0, lookDY: 0,
  touchMove: { x: 0, y: 0 },
  jumpPressed: false, sprint: false,
};

// Portrait screens get a wider vertical FOV so the horizontal view isn't a slit.
const baseFov = () => (camera.aspect < 1 ? 92 : 75);
const player = {
  pos: new THREE.Vector3(0, 0, 12), vel: new THREE.Vector3(),
  get vy() { return this.vel.y; }, set vy(v) { this.vel.y = v; },
  yaw: 0, pitch: 0,
  level: 1, xp: 0, cash: 0,
  hp: 100, maxHp: 100, shield: 0, shieldItem: null, shieldDelayT: 0, shieldCharging: false,
  weapons: [null, null, null, null], cur: 0,
  ammo: { pistol: 120, smg: 0, ar: 180, shotgun: 0, sniper: 0, rocket: 0 },
  grenades: 3, maxGrenades: 5,
  alive: true, downed: false, downT: 0, grounded: true, invuln: 0,
  reloadT: 0, reloadDur: 1, swapT: 0, fireCd: 0, burstLeft: 0, triggerQueue: 0,
  hyperSpin: 0, adsK: 0, vmKick: 0, meleeCd: 0, meleeT: 0, recoil: 0,
  skillCd: 0, bob: 0, hurtSoundT: 0, lifesteal: false,
  stats: { kills: 0, crits: 0, shots: 0, damage: 0 },

  center() { return new THREE.Vector3(this.pos.x, this.pos.y + (this.downed ? 0.5 : 1.15), this.pos.z); },
  eyeY() { return this.pos.y + (this.downed ? 0.65 : 1.62); },
  gun() { return this.weapons[this.cur]; },
  shieldMax() { return this.shieldItem ? this.shieldItem.capacity : 0; },
  recomputeMaxHp() {
    const turtle = this.shieldItem && this.shieldItem.skind === 'turtle' ? 0.85 : 1;
    const old = this.maxHp;
    this.maxHp = Math.round(100 * Math.pow(1.1, this.level - 1) * turtle);
    this.hp = Math.min(this.maxHp, this.hp * (this.maxHp / old));
  },
  heal(n) { if (this.downed || !this.alive) return; this.hp = Math.min(this.maxHp, this.hp + n); },
  xpNeeded() { return Math.round(90 * Math.pow(this.level, 1.55)); },
  addXp(n) {
    this.xp += n;
    hud.floatXp(n);
    while (this.xp >= this.xpNeeded()) {
      this.xp -= this.xpNeeded();
      this.level++;
      this.recomputeMaxHp();
      this.hp = this.maxHp; this.shield = this.shieldMax();
      hud.banner('LEVEL UP!', 'Level ' + this.level + ' · Max health ' + this.maxHp);
      SFX.levelUp();
      burst(this.center(), 0xffd23a, 30, 6, 0.12, 1, -0.2, true);
    }
  },
  hurt(amount, srcPos, elem) {
    if (!this.alive || this.invuln > 0 || game.state !== 'play') return;
    if (srcPos) hud.hurtFrom(srcPos);
    if (this.downed) return;
    let rem = amount;
    this.shieldDelayT = this.shieldItem ? this.shieldItem.delay : 3;
    this.shieldCharging = false;
    if (this.shield > 0) {
      const a = Math.min(this.shield, rem);
      this.shield -= a; rem -= a;
      if (this.shield <= 0) {
        SFX.shieldBreak();
        hud.flash('shield');
        if (this.shieldItem && this.shieldItem.skind === 'nova') {
          const s = this.shieldItem;
          ringFx(this.pos.clone(), 7, ELEM[s.novaElem].hex, 0.4);
          explode(this.center(), 7, s.novaDmg, s.novaElem, { fromPlayer: true, dotElem: s.novaElem, dotDps: s.novaDmg * 0.3 });
        }
      } else SFX.shieldHit();
    }
    if (rem > 0) {
      this.hp -= rem;
      hud.flash('hurt', clamp(rem / this.maxHp * 4, 0.25, 1));
      if (this.hurtSoundT <= 0) { SFX.hurt(); this.hurtSoundT = 0.25; }
      if (this.hp <= 0) this.goDown();
    }
    game.shake(clamp(amount / this.maxHp, 0.05, 0.35));
  },
  goDown() {
    this.hp = 0; this.shield = 0;
    this.downed = true; this.downT = 12;
    this.reloadT = 0; input.ads = false;
    SFX.down();
    hud.banner('FIGHT FOR YOUR LIFE', 'Kill an enemy to get a Second Wind');
  },
  secondWind() {
    this.downed = false;
    this.hp = this.maxHp * 0.5;
    this.invuln = 1.5;
    SFX.secondWind();
    hud.banner('SECOND WIND!', '');
  },
};

function resetPlayer() {
  Object.assign(player, {
    level: 1, xp: 0, cash: 0, hp: 100, maxHp: 100, shield: 0, shieldDelayT: 0,
    weapons: [null, null, null, null], cur: 0,
    ammo: { pistol: 120, smg: 60, ar: 180, shotgun: 16, sniper: 6, rocket: 0 },
    grenades: 3, alive: true, downed: false, downT: 0, invuln: 1,
    reloadT: 0, swapT: 0, fireCd: 0, burstLeft: 0, skillCd: 0, hyperSpin: 0,
    stats: { kills: 0, crits: 0, shots: 0, damage: 0 },
  });
  player.weapons[0] = genGun(1, { type: 'pistol', mfr: 'dahl', rarity: 0 });
  player.weapons[1] = genGun(1, { type: 'ar', mfr: 'vladof', rarity: 0, element: 'none' });
  player.shieldItem = genShield(1, { rarity: 0, kind: 'standard' });
  player.recomputeMaxHp();
  player.hp = player.maxHp;
  player.shield = player.shieldMax();
  respawnAt(new THREE.Vector3(0, 0, 12));
  setViewmodel();
}
function respawnAt(p) {
  player.pos.copy(p); player.pos.y = groundAt(p.x, p.z) + 0.1;
  player.vel.set(0, 0, 0);
  player.yaw = 0; player.pitch = 0;
}

// ---------------------------------------------------------------------------
// Viewmodel
const vm = { root: new THREE.Group(), gun: null, hands: null };
vmScene.add(vm.root);
const vmScope = document.getElementById('scope');
function setViewmodel() {
  if (vm.gun) vm.root.remove(vm.gun);
  vm.gun = null;
  const g = player.gun();
  if (!g) return;
  vm.gun = buildGunModel(g, 0.008);
  // a gloved hand on the grip
  box(0.085, 0.09, 0.11, 0x3a2a1e, 0.0, -0.1, 0.04, vm.gun, 0.008);
  vm.gun.scale.setScalar(0.6);
  vm.root.add(vm.gun);
  player.swapT = 0.35;
}
const _fwd = new THREE.Vector3(), _right = new THREE.Vector3(), _up = new THREE.Vector3();
function camBasis() {
  _fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
  _right.set(1, 0, 0).applyQuaternion(camera.quaternion);
  _up.set(0, 1, 0).applyQuaternion(camera.quaternion);
}
function muzzleWorld() {
  camBasis();
  const k = player.adsK;
  return camera.position.clone().addScaledVector(_fwd, 0.75).addScaledVector(_right, 0.2 * (1 - k)).addScaledVector(_up, -0.16 + k * 0.06);
}

function updateViewmodel(dt, moving) {
  const g = player.gun();
  if (!vm.gun || !g) return;
  const k = player.adsK;
  const sniperScope = g.type === 'sniper' && k > 0.85;
  vm.root.visible = !sniperScope;
  vmScope.hidden = !sniperScope;
  const bobAmt = moving && player.grounded ? 1 : 0;
  const bx = Math.sin(player.bob) * 0.012 * bobAmt * (1 - k * 0.8);
  const by = Math.abs(Math.cos(player.bob)) * 0.012 * bobAmt * (1 - k * 0.8);
  let x = lerp(0.27 * clamp(camera.aspect / 1.6, 0.4, 1), 0.0, k) + bx, y = lerp(-0.25, -0.1, k) - by, z = lerp(-0.58, -0.48, k);
  let rx = 0, ry = 0, rz = 0;
  // sway from looking around
  ry += clamp(input.lookDX * 0.0015, -0.08, 0.08);
  rx += clamp(input.lookDY * 0.0015, -0.08, 0.08);
  // recoil
  z += player.vmKick * 0.07; rx += player.vmKick * 0.12;
  player.vmKick = Math.max(0, player.vmKick - dt * 8);
  // reload: dip and tilt
  if (player.reloadT > 0) {
    const p = 1 - player.reloadT / player.reloadDur;
    const s = Math.sin(p * Math.PI);
    if (g.tediore) { y -= (p < 0.5 ? 0.5 : (1 - p) * 0.8); }
    else { y -= s * 0.12; rx -= s * 0.6; rz += s * 0.5; }
  }
  if (player.swapT > 0) y -= player.swapT * 1.0;
  if (player.meleeT > 0) { const s = Math.sin((1 - player.meleeT / 0.35) * Math.PI); z -= s * 0.25; x -= s * 0.12; ry += s * 0.6; }
  if (player.downed) { y -= 0.04; rz -= 0.25; }
  vm.root.position.set(x, y, z);
  vm.root.rotation.set(rx, ry, rz);
}

// ---------------------------------------------------------------------------
// Weapons
function spreadFor(g) {
  let s = g.spread;
  s *= lerp(1, 0.4, player.adsK);
  const sp = Math.hypot(player.vel.x, player.vel.z);
  if (sp > 1) s *= 1 + sp / 14;
  if (!player.grounded) s *= 1.6;
  if (g.hyperion) s *= lerp(2.2, 0.25, player.hyperSpin);
  return s;
}

function randomCone(fwd, deg) {
  const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * Math.tan(deg * Math.PI / 180);
  return fwd.clone().addScaledVector(_right, Math.cos(a) * r).addScaledVector(_up, Math.sin(a) * r).normalize();
}

function startReload() {
  const g = player.gun();
  if (!g || player.reloadT > 0 || player.swapT > 0 || g.special === 'infinite') return;
  if (g.inMag >= g.mag) return;
  if (player.ammo[g.ammo] <= 0) { hud.log('Out of ' + AMMO_LABEL[g.ammo] + ' ammo', '#ff6a5a'); SFX.empty(); return; }
  player.burstLeft = 0;
  if (g.tediore && g.inMag > 0) throwTediore(g);
  player.reloadT = player.reloadDur = g.reload;
  SFX.reload();
}
function finishReload() {
  const g = player.gun();
  if (!g) return;
  const need = g.mag - g.inMag;
  const take = Math.min(need, player.ammo[g.ammo]);
  g.inMag += take; player.ammo[g.ammo] -= take;
}

function switchWeapon(i) {
  if (i === player.cur || !player.weapons[i]) return;
  player.cur = i;
  player.reloadT = 0; player.burstLeft = 0; player.hyperSpin = 0;
  setViewmodel();
}
function cycleWeapon(dir) {
  for (let k = 1; k <= 4; k++) {
    const i = (player.cur + dir * k + 8) % 4;
    if (player.weapons[i]) { switchWeapon(i); return; }
  }
}

function fireOnce(g) {
  if (g.inMag <= 0 && g.special !== 'infinite') {
    if (player.ammo[g.ammo] > 0) startReload(); else { SFX.empty(); hud.log('Out of ' + AMMO_LABEL[g.ammo] + ' ammo', '#ff6a5a'); }
    player.fireCd = 0.3;
    return false;
  }
  if (g.special !== 'infinite') g.inMag--;
  player.stats.shots++;
  camBasis();
  const origin = camera.position.clone();
  const fwd = _fwd.clone();
  const muzzle = muzzleWorld();
  const spread = spreadFor(g);
  const E = ELEM[g.element];
  const hits = new Map();
  for (let p = 0; p < g.pellets; p++) {
    const dir = randomCone(fwd, spread);
    if (g.projectile) {
      spawnPlayerProj(g.type === 'launcher' ? 'rocket' : 'gyro', muzzle.clone(), dir.multiplyScalar(g.projSpeed), g);
      continue;
    }
    const w = rayWorld(origin, dir, 260);
    const en = rayEnemies(origin, dir, w.t);
    let end;
    if (en) {
      end = origin.clone().addScaledVector(dir, en.t);
      const h = hits.get(en.e) || { dmg: 0, crit: false, procs: 0 };
      h.dmg += g.damage * (en.crit ? g.crit : 1);
      h.crit = h.crit || en.crit;
      if (g.elemChance && Math.random() < g.elemChance) h.procs++;
      hits.set(en.e, h);
      burst(end, en.e.shield > 0 ? 0x7fd6ff : (en.e.hpType === 'armor' ? 0xffd23a : 0xb02020), 4, 4, 0.08, 0.35);
    } else {
      end = origin.clone().addScaledVector(dir, Math.min(w.t, 260));
      if (w.barrel) damageBarrel(w.barrel, g.damage);
      if (w.t < 260) { burst(end, 0xd8b088, 3, 3, 0.09, 0.4); burst(end, E.hex, 2, 5, 0.05, 0.15, 1, true); }
    }
    if (p < 4 || Math.random() < 0.3) tracer(muzzle, end, E.hex, g.type === 'sniper' ? 0.06 : 0.03, g.type === 'sniper' ? 0.15 : 0.06);
  }
  for (const [e, h] of hits) {
    const wasShield = e.shield > 0;
    const dealt = damageEnemy(e, h.dmg, g.element, { crit: h.crit, fromPlayer: true, lifesteal: g.special === 'lifesteal', dir: fwd });
    player.stats.damage += dealt;
    if (h.crit) player.stats.crits++;
    if (h.procs && e.alive) applyDot(e, g.element, g.elemDps);
    hud.hitMarker(h.crit, !e.alive);
    if (!e.alive && h.crit) game.hitstop = Math.max(game.hitstop, 0.06);
    if (wasShield) SFX.shieldHit(); else SFX.hit(h.crit);
  }
  // recoil and feedback
  const kick = g.kick * 0.011 * lerp(1, 0.55, player.adsK);
  player.recoil += kick * 0.75; player.pitch += kick * 0.25; player.yaw += rand(-0.3, 0.3) * kick;
  player.vmKick = Math.min(1.5, player.vmKick + g.kick * 0.25);
  vmFlash.intensity = 2.2; vmFlash.color.setHex(E.hex);
  vmFlash.position.set(vm.root.position.x, vm.root.position.y + 0.05, vm.root.position.z + (vm.gun ? vm.gun.userData.muzzleZ : -0.5));
  flashAt(muzzle, E.hex, 1.6, 7, 0.06);
  SFX.shot(g.type, g.element);
  if (g.hyperion) player.hyperSpin = Math.min(1, player.hyperSpin + 0.14);
  game.shake(g.kick * 0.02);
  return true;
}

function updateWeapon(dt) {
  const g = player.gun();
  player.fireCd -= dt;
  player.meleeCd -= dt; player.meleeT -= dt;
  if (player.swapT > 0) player.swapT -= dt;
  if (player.reloadT > 0) { player.reloadT -= dt; if (player.reloadT <= 0) finishReload(); }
  vmFlash.intensity = Math.max(0, vmFlash.intensity - dt * 30);
  if (!input.fire) player.hyperSpin = Math.max(0, player.hyperSpin - dt * 1.5);
  if (input.firePressed) player.triggerQueue = 0.18;
  player.triggerQueue -= dt;
  if (!g) return;
  if (g.special === 'regen' && player.reloadT <= 0) {
    g.regenT = (g.regenT || 0) + dt;
    if (g.regenT > 0.35) { g.regenT = 0; if (g.inMag < g.mag) g.inMag++; }
  }
  if (player.reloadT > 0 || player.swapT > 0 || player.meleeT > 0) return;
  if (g.inMag <= 0 && g.special !== 'infinite' && player.ammo[g.ammo] > 0 && !input.fire) { startReload(); return; }
  if (player.fireCd > 0) return;
  const dahlBurst = g.burstAds && player.adsK > 0.6;
  let trigger = false;
  if (player.burstLeft > 0) trigger = true;
  else if (g.auto && !dahlBurst) trigger = input.fire;
  else trigger = player.triggerQueue > 0;
  if (!trigger) return;
  player.triggerQueue = 0;
  const fired = fireOnce(g);
  if (!fired) { player.burstLeft = 0; return; }
  if (dahlBurst) {
    if (player.burstLeft > 0) player.burstLeft--;
    else player.burstLeft = g.burstAds - 1;
    player.fireCd = player.burstLeft > 0 ? 1 / (g.rate * 1.8) : 1 / g.rate + 0.12;
  } else player.fireCd = 1 / g.rate;
}

function doMelee() {
  if (player.meleeCd > 0 || !player.alive || player.downed) return;
  player.meleeCd = 0.8; player.meleeT = 0.35;
  SFX.swing();
  camBasis();
  const dmg = 45 * levelScale(player.level);
  const c = new THREE.Vector3();
  setTimeout(() => {
    for (const e of enemies) {
      if (!e.alive) continue;
      enemyCenter(e, c);
      const d = c.clone().sub(camera.position);
      const dist = d.length();
      if (dist > 2.6 + e.radius) continue;
      d.normalize();
      if (d.dot(_fwd) < 0.45) continue;
      damageEnemy(e, dmg, 'none', { fromPlayer: true, dir: _fwd.clone() });
      e.vel.addScaledVector(_fwd, 9);
      hud.hitMarker(false, !e.alive);
      SFX.hit(false);
      game.shake(0.15);
    }
  }, 90);
}

// ---------------------------------------------------------------------------
// Player projectiles: gyrojets, rockets, grenades, thrown Tediore guns, bomblets
const playerProj = [];
const GRENADE_GEO = new THREE.IcosahedronGeometry(0.14, 1);
function spawnPlayerProj(kind, pos, vel, gun) {
  let mesh;
  if (kind === 'gyro') mesh = new THREE.Mesh(SHOT_GEO, glow(0xffd23a));
  else if (kind === 'rocket') { mesh = new THREE.Group(); cyl(0.07, 0.07, 0.45, 0x555555, 0, 0, 0, mesh, 0.015, 8).rotation.x = Math.PI / 2; box(0.1, 0.1, 0.06, 0, 0, 0, 0.25, mesh, 0, glow(0xffa040)); mesh.lookAt(vel.clone().normalize()); }
  else if (kind === 'grenade' || kind === 'bomblet') { mesh = new THREE.Mesh(GRENADE_GEO, toon(kind === 'grenade' ? 0x4f7a3a : 0x444444)); addOutline(mesh, 1.15); if (kind === 'bomblet') mesh.scale.setScalar(0.7); }
  else if (kind === 'tedi') { mesh = buildGunModel(gun, 0.012); }
  mesh.position.copy(pos);
  scene.add(mesh);
  playerProj.push({ kind, mesh, pos: pos.clone(), vel, gun, life: kind === 'grenade' ? 1.8 : kind === 'bomblet' ? rand(0.5, 0.9) : kind === 'tedi' ? 1.4 : 4, extra: 0 });
}

function throwTediore(g) {
  camBasis();
  const pos = camera.position.clone().addScaledVector(_fwd, 0.6).addScaledVector(_right, 0.2);
  const vel = _fwd.clone().multiplyScalar(18).addScaledVector(_up, 3).add(player.vel);
  const ghost = Object.assign({}, g);
  ghost.tediDmg = g.damage * g.pellets * Math.max(2, g.inMag) * 0.6;
  g.inMag = 0;
  spawnPlayerProj('tedi', pos, vel, ghost);
}

function throwGrenade() {
  if (player.grenades <= 0 || !player.alive || player.downed) { if (player.grenades <= 0) hud.log('No grenades', '#ff6a5a'); return; }
  player.grenades--;
  camBasis();
  const pos = camera.position.clone().addScaledVector(_fwd, 0.5).addScaledVector(_right, -0.2);
  const vel = _fwd.clone().multiplyScalar(20).addScaledVector(_up, 4).add(player.vel);
  spawnPlayerProj('grenade', pos, vel, null);
  SFX.swing();
}

const _seg = new THREE.Vector3();
function updatePlayerProj(dt) {
  for (let i = playerProj.length - 1; i >= 0; i--) {
    const p = playerProj[i];
    p.life -= dt;
    let boom = p.life <= 0, hitEnemy = null, hitCrit = false;
    const grav = p.kind === 'grenade' || p.kind === 'tedi' || p.kind === 'bomblet' ? 20 : p.kind === 'gyro' ? 2 : 0;
    p.vel.y -= grav * dt;
    const step = p.vel.length() * dt;
    if (step > 0) {
      _seg.copy(p.vel).normalize();
      const en = rayEnemies(p.pos, _seg, step + 0.15);
      const w = rayWorld(p.pos, _seg, step);
      if (en && en.t <= w.t) { hitEnemy = en.e; hitCrit = en.crit; p.pos.addScaledVector(_seg, en.t); boom = true; }
      else if (w.t < step) {
        p.pos.addScaledVector(_seg, w.t);
        if (w.barrel) damageBarrel(w.barrel, 999);
        if (p.kind === 'grenade' || p.kind === 'tedi' || p.kind === 'bomblet') {
          // bounce
          const gy = groundAt(p.pos.x, p.pos.z);
          if (p.pos.y <= gy + 0.3) { p.vel.y = Math.abs(p.vel.y) * 0.4; p.vel.x *= 0.6; p.vel.z *= 0.6; p.pos.y = gy + 0.15; }
          else { p.vel.x *= -0.4; p.vel.z *= -0.4; }
          p.pos.addScaledVector(_seg, -0.05);
          if (p.kind === 'bomblet') boom = true;
        } else boom = true;
      } else p.pos.addScaledVector(p.vel, dt);
    }
    p.mesh.position.copy(p.pos);
    if (p.kind === 'rocket') { p.mesh.lookAt(p.pos.clone().add(p.vel)); if (Math.random() < 0.8) particle(p.pos, new THREE.Vector3(rand(-0.3, 0.3), 0.6, rand(-0.3, 0.3)), 0x8a8580, 0.25, 0.7, -0.1); }
    else if (p.kind === 'tedi' || p.kind === 'grenade') { p.mesh.rotation.x += dt * 10; p.mesh.rotation.y += dt * 5; }
    if (!boom) continue;
    const g = p.gun;
    if (p.kind === 'gyro') {
      if (hitEnemy) {
        const dealt = damageEnemy(hitEnemy, g.damage * (hitCrit ? g.crit : 1), 'explosive', { crit: hitCrit, fromPlayer: true, explosive: true, lifesteal: g.special === 'lifesteal' });
        player.stats.damage += dealt;
        hud.hitMarker(hitCrit, !hitEnemy.alive); SFX.hit(hitCrit);
      }
      explode(p.pos, g.splash, g.damage * 0.45, 'explosive', { fromPlayer: true, ignore: hitEnemy, hurtsPlayer: true, selfScale: 0.4 });
    } else if (p.kind === 'rocket') {
      const elem = g.element === 'none' ? 'explosive' : g.element;
      if (hitEnemy && hitCrit) hud.hitMarker(true, false);
      explode(p.pos, g.splash, g.damage * (hitCrit ? 1.5 : 1), elem, { fromPlayer: true, hurtsPlayer: true, dotElem: g.elemChance ? g.element : null, dotDps: g.elemDps });
      if (g.special === 'cluster') for (let k = 0; k < 5; k++) spawnPlayerProj('bomblet', p.pos.clone().setY(p.pos.y + 0.4), new THREE.Vector3(rand(-6, 6), rand(5, 9), rand(-6, 6)), Object.assign({}, g, { damage: g.damage * 0.35, splash: 2.8 }));
    } else if (p.kind === 'bomblet') {
      explode(p.pos, g.splash, g.damage, 'explosive', { fromPlayer: true, hurtsPlayer: true, selfScale: 0.3 });
    } else if (p.kind === 'grenade') {
      explode(p.pos, 6.5, 95 * levelScale(player.level), 'explosive', { fromPlayer: true, hurtsPlayer: true });
    } else if (p.kind === 'tedi') {
      const elem = g.element === 'none' ? 'explosive' : g.element;
      explode(p.pos, 4, g.tediDmg, elem, { fromPlayer: true, hurtsPlayer: true, selfScale: 0.3, dotElem: g.elemChance ? g.element : null, dotDps: g.elemDps });
    }
    scene.remove(p.mesh);
    playerProj.splice(i, 1);
  }
}

// ---------------------------------------------------------------------------
// Action skill: deployable turret
const turret = { active: false, pos: new THREE.Vector3(), t: 0, fireT: 0, scanT: 0, target: null, group: null, head: null, dur: 20, cooldown: 30 };
(function buildTurret() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    const leg = box(0.08, 0.9, 0.08, 0x333a40, Math.cos(a) * 0.35, 0.4, Math.sin(a) * 0.35, g, 0.02);
    leg.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4);
  }
  cyl(0.25, 0.3, 0.25, 0xd9a83a, 0, 0.85, 0, g, 0.03, 8);
  const head = new THREE.Group(); head.position.y = 1.1; g.add(head);
  box(0.5, 0.32, 0.6, 0xd9a83a, 0, 0, 0, head, 0.03);
  box(0.52, 0.06, 0.62, 0x2b2b2b, 0, 0.1, 0, head, 0);
  cyl(0.05, 0.05, 0.6, 0x333333, -0.1, 0, 0.5, head, 0.02, 8).rotation.x = Math.PI / 2;
  cyl(0.05, 0.05, 0.6, 0x333333, 0.1, 0, 0.5, head, 0.02, 8).rotation.x = Math.PI / 2;
  box(0.12, 0.08, 0.02, 0, 0, 0.05, 0.31, head, 0, glow(0x4fc6ff));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 10, 0, TAU, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x4fc6ff, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
  g.add(dome);
  turret.group = g; turret.head = head;
})();

function deployTurret() {
  if (turret.active || player.skillCd > 0 || !player.alive || player.downed) { if (player.skillCd > 0) SFX.deny(); return; }
  camBasis();
  const flat = new THREE.Vector3(_fwd.x, 0, _fwd.z).normalize();
  const w = rayWorld(camera.position, _fwd, 12);
  let p = camera.position.clone().addScaledVector(_fwd, Math.max(2, w.t - 0.8));
  if (w.t >= 12) p = player.pos.clone().addScaledVector(flat, 4);
  collideBody(p, 0.6, 1.4);
  p.y = groundAt(p.x, p.z);
  for (const c of boxCols) if (p.x > c.minX && p.x < c.maxX && p.z > c.minZ && p.z < c.maxZ && c.maxY < camera.position.y && c.maxY > p.y) p.y = c.maxY;
  turret.pos.copy(p);
  turret.group.position.copy(p);
  turret.group.scale.setScalar(0.01);
  scene.add(turret.group);
  turret.active = true; turret.t = turret.dur; turret.target = null;
  SFX.deploy();
  burst(p.clone().setY(p.y + 0.5), 0x4fc6ff, 20, 5, 0.12, 0.6, 0.2, true);
}

function updateTurret(dt) {
  if (!turret.active) { if (player.skillCd > 0) player.skillCd -= dt; return; }
  turret.t -= dt;
  const s = Math.min(1, turret.group.scale.x + dt * 4);
  turret.group.scale.setScalar(s);
  if (turret.t <= 0) {
    turret.active = false;
    scene.remove(turret.group);
    burst(turret.pos.clone().setY(turret.pos.y + 0.8), 0x4fc6ff, 18, 5, 0.12, 0.6, 0.2, true);
    player.skillCd = turret.cooldown;
    return;
  }
  const eye = turret.pos.clone(); eye.y += 1.1;
  turret.scanT -= dt;
  if (turret.scanT <= 0) {
    turret.scanT = 0.3;
    let best = null, bd = 34;
    const c = new THREE.Vector3();
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = enemyCenter(e, c).distanceTo(eye);
      if (d < bd && lineOfSight(eye, c)) { bd = d; best = e; }
    }
    turret.target = best;
  }
  const t = turret.target;
  if (t && t.alive) {
    const c = enemyCenter(t, new THREE.Vector3());
    const want = Math.atan2(c.x - eye.x, c.z - eye.z);
    let d = want - turret.head.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    turret.head.rotation.y += d * Math.min(1, dt * 10);
    turret.fireT -= dt;
    if (turret.fireT <= 0 && Math.abs(d) < 0.3) {
      turret.fireT = 0.13;
      const dir = c.clone().sub(eye).normalize();
      dir.x += rand(-0.03, 0.03); dir.y += rand(-0.03, 0.03); dir.normalize();
      const muzzle = eye.clone().addScaledVector(dir, 0.8);
      const en = rayEnemies(eye, dir, 40);
      const end = en ? eye.clone().addScaledVector(dir, en.t) : eye.clone().addScaledVector(dir, 40);
      tracer(muzzle, end, 0x4fc6ff, 0.035, 0.06);
      flashAt(muzzle, 0x4fc6ff, 1.2, 5, 0.05);
      if (en) damageEnemy(en.e, 7 * levelScale(player.level) * (en.crit ? 2 : 1), 'none', { crit: en.crit, fromPlayer: true });
      SFX.turret();
    }
  }
}
