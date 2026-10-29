'use strict';
// Game flow (waves, chests, vending, pickups), input (mouse, keyboard, touch) and the main loop.

const BEST_KEY = 'rustlands.best';
function loadBest() { try { return JSON.parse(localStorage.getItem(BEST_KEY)) || { wave: 0, level: 1 }; } catch (e) { return { wave: 0, level: 1 }; } }
function saveBest(b) { try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch (e) { /* storage unavailable */ } }

const game = {
  state: 'menu', wave: 0, phase: 'intermission', interT: 0,
  toSpawn: [], spawnT: 0, enemyLevel: 1, chest: null, shakeAmt: 0, hitstop: 0, best: loadBest(),
  waveStartKills: 0, waveTotal: 0, waveKilled: 0,

  waveLabel() { return this.wave === 0 ? 'GET READY' : (this.wave % 5 === 0 ? 'BOSS WAVE ' : 'WAVE ') + this.wave; },
  waveSub() {
    if (this.phase === 'intermission') return 'Next wave in ' + Math.ceil(this.interT) + 's' + (IS_TOUCH ? '' : ' · N to start now');
    const left = this.waveTotal - this.waveKilled;
    return left + (left === 1 ? ' enemy' : ' enemies') + ' left · Enemy Lv ' + this.enemyLevel;
  },
  shake(a) { this.shakeAmt = Math.min(1.2, this.shakeAmt + a); },
  queueSpawn(key, front) { if (front) this.toSpawn.unshift(key); else this.toSpawn.push(key); this.waveTotal++; },
  onEnemyKilled(e, opts) {
    this.waveKilled++;
    if (!opts.noXp) {
      player.stats.kills++;
      player.addXp(e.def.xp * (1 + (e.level - 1) * 0.3));
      dropLoot(e);
    }
    if (player.downed && opts.fromPlayer) player.secondWind();
    if (e.def.boss) { hud.banner('KRAG IS SCRAP', 'Boss defeated'); SFX.levelUp(); this.hitstop = 0.35; }
  },
};

// ---------------------------------------------------------------------------
// Waves
function buildWave(w) {
  const list = [];
  const boss = w % 5 === 0;
  const n = Math.min(6 + Math.floor(w * 2.2), 34);
  const pool = [['bandit', 10], ['psycho', 6], ['skag', w >= 2 ? 6 : 0], ['marauder', w >= 3 ? 5 : 0], ['suicide', w >= 4 ? 3 : 0], ['skagAdult', w >= 4 ? 4 : 0]].filter((p) => p[1] > 0);
  for (let i = 0; i < (boss ? Math.floor(n * 0.5) : n); i++) list.push(weighted(pool));
  const badass = w >= 3 ? 1 + Math.floor((w - 3) / 3) : 0;
  for (let i = 0; i < (boss ? Math.floor(badass / 2) : badass); i++) list.splice(randi(2, list.length), 0, 'nomad');
  if (boss) list.splice(Math.min(3, list.length), 0, 'boss');
  return list;
}
function startWave() {
  game.wave++;
  game.phase = 'combat';
  game.enemyLevel = 1 + Math.floor((game.wave - 1) * 0.8);
  game.toSpawn = buildWave(game.wave);
  game.waveTotal = game.toSpawn.length; game.waveKilled = 0;
  game.spawnT = 1;
  SFX.wave();
  hud.banner(game.waveLabel(), game.wave % 5 === 0 ? 'Krag the Scrapjaw has entered the arena' : game.waveTotal + ' enemies incoming');
}
function endWave() {
  game.phase = 'intermission';
  game.interT = 25;
  hud.banner('WAVE ' + game.wave + ' CLEARED', 'A loot chest has appeared');
  if (game.wave > game.best.wave) { game.best.wave = game.wave; }
  game.best.level = Math.max(game.best.level, player.level);
  saveBest(game.best);
  spawnChest(game.wave % 5 === 0);
  if (player.grenades < player.maxGrenades) player.grenades++;
}
function updateWaves(dt) {
  if (game.phase === 'intermission') {
    game.interT -= dt;
    if (game.interT <= 0) startWave();
    return;
  }
  const alive = enemies.filter((e) => e.alive).length;
  game.spawnT -= dt;
  const maxAlive = Math.min(7 + game.wave, 16);
  if (game.toSpawn.length && game.spawnT <= 0 && alive < maxAlive) {
    game.spawnT = rand(0.4, 1.0);
    const key = game.toSpawn.shift();
    const gates = spawnPoints.filter((g) => g.distanceTo(player.pos) > 28);
    const gate = pick(gates.length ? gates : spawnPoints);
    const p = gate.clone().multiplyScalar(0.94).add(new THREE.Vector3(rand(-2.5, 2.5), 0, rand(-2.5, 2.5)));
    p.y = groundAt(p.x, p.z);
    const lvl = game.enemyLevel + (key === 'boss' ? 1 : 0);
    spawnEnemy(key, lvl, p);
  }
  // purge dead
  for (let i = enemies.length - 1; i >= 0; i--) if (!enemies[i].alive) enemies.splice(i, 1);
  if (!game.toSpawn.length && enemies.length === 0) endWave();
}

// ---------------------------------------------------------------------------
// Loot
function dropLoot(e) {
  const p = enemyCenter(e, new THREE.Vector3());
  const lvl = e.level;
  const luck = (e.def.badass ? 0.8 : 0) + game.wave * 0.03;
  if (e.def.boss) {
    spawnDrop('item', p, { item: genGun(lvl, { rarity: Math.random() < 0.45 ? 4 : 3 }) });
    spawnDrop('item', p, { item: genGun(lvl, { luck: 2 }) });
    spawnDrop('item', p, { item: genShield(lvl, { luck: 2 }) });
    for (let i = 0; i < 6; i++) spawnDrop('cash', p, { amount: Math.round(rand(10, 20) * levelScale(lvl)) });
    for (let i = 0; i < 3; i++) spawnDrop('ammo', p);
    spawnDrop('health', p);
    return;
  }
  if (Math.random() < (e.def.badass ? 0.75 : 0.15)) spawnDrop('item', p, { item: genGun(lvl, { luck }) });
  if (Math.random() < (e.def.badass ? 0.3 : 0.035)) spawnDrop('item', p, { item: genShield(lvl, { luck }) });
  if (Math.random() < 0.55) spawnDrop('cash', p, { amount: Math.round(rand(3, 8) * levelScale(lvl) * (e.def.badass ? 4 : 1)) });
  if (Math.random() < 0.38) spawnDrop('ammo', p);
  if (Math.random() < 0.09) spawnDrop('health', p);
  if (Math.random() < 0.06) spawnDrop('grenade', p);
}

function buildChestModel(boss) {
  const g = new THREE.Group();
  const col = boss ? 0x9a2a22 : 0x4a5a6a;
  box(1.6, 0.8, 1.0, col, 0, 0.4, 0, g, 0.05);
  box(1.62, 0.12, 1.02, 0xd8b23a, 0, 0.2, 0, g, 0);
  const lid = new THREE.Group(); lid.position.set(0, 0.8, -0.5); g.add(lid);
  box(1.6, 0.3, 1.0, col, 0, 0.15, 0.5, lid, 0.05);
  box(0.3, 0.2, 0.06, 0, 0, 0.05, 1.02, lid, 0, glow(boss ? 0xff8a1c : 0x4fc6ff));
  const glowM = box(1.5, 0.05, 0.9, 0, 0, 0.82, 0, g, 0, glow(boss ? 0xff8a1c : 0x9fe0ff));
  glowM.visible = false;
  g.userData = { lid, glowM };
  return g;
}
function spawnChest(boss) {
  if (game.chest) scene.remove(game.chest.group);
  const pos = new THREE.Vector3(0, 0, -1.5); pos.y = groundAt(pos.x, pos.z);
  const group = buildChestModel(boss);
  group.position.copy(pos);
  scene.add(group);
  burst(pos.clone().setY(pos.y + 1), boss ? 0xff8a1c : 0x4fc6ff, 30, 6, 0.12, 0.8, 0.2, true);
  game.chest = { group, pos, boss, opened: false, t: 0 };
}
function openChest() {
  const c = game.chest;
  if (!c || c.opened) return;
  c.opened = true;
  SFX.chest();
  c.group.userData.glowM.visible = true;
  const p = c.pos.clone(); p.y += 1.2;
  const lvl = Math.max(game.enemyLevel, player.level);
  const luck = c.boss ? 2.5 : 0.4 + game.wave * 0.06;
  spawnDrop('item', p, { item: genGun(lvl, { luck, rarity: c.boss ? (Math.random() < 0.3 ? 4 : 3) : undefined }) });
  spawnDrop('item', p, { item: genGun(lvl, { luck }) });
  if (Math.random() < 0.45) spawnDrop('item', p, { item: genShield(lvl, { luck }) });
  for (let i = 0; i < 3; i++) spawnDrop('cash', p, { amount: Math.round(rand(6, 12) * levelScale(lvl)) });
  spawnDrop('ammo', p); spawnDrop('ammo', p); spawnDrop('grenade', p);
}

const AMMO_PICK = { pistol: 24, smg: 48, ar: 36, shotgun: 8, sniper: 4, rocket: 2 };
const AMMO_PRICE = { pistol: 22, smg: 26, ar: 30, shotgun: 26, sniper: 34, rocket: 55 };
function ammoRefillCost() {
  let c = 0;
  for (const k in AMMO_MAX) {
    const owned = player.weapons.some((w) => w && w.ammo === k);
    if (!owned) continue;
    c += (1 - player.ammo[k] / AMMO_MAX[k]) * AMMO_PRICE[k];
  }
  return Math.ceil(c * levelScale(player.level));
}
function healCost() { return Math.ceil((1 - player.hp / player.maxHp) * 45 * levelScale(player.level)); }

function tryAutoPickup(d) {
  if (d.kind === 'cash') { player.cash += d.amount; SFX.cash(); hud.log('+$' + d.amount, '#9fff6a'); return true; }
  if (d.kind === 'health') { if (player.hp >= player.maxHp || player.downed) return false; player.heal(player.maxHp * 0.35); SFX.pickup(); hud.log('+Health', '#ff6a7a'); return true; }
  if (d.kind === 'grenade') { if (player.grenades >= player.maxGrenades) return false; player.grenades++; SFX.pickup(); hud.log('+1 Grenade', '#8fd06a'); return true; }
  if (d.kind === 'ammo') {
    if (!d.ammo) {
      const owned = player.weapons.filter(Boolean).map((w) => w.ammo).filter((a) => player.ammo[a] < AMMO_MAX[a]);
      d.ammo = owned.length ? pick(owned) : pick(Object.keys(AMMO_MAX));
    }
    const k = d.ammo;
    if (player.ammo[k] >= AMMO_MAX[k]) return false;
    const n = Math.min(AMMO_PICK[k], AMMO_MAX[k] - player.ammo[k]);
    player.ammo[k] += n; SFX.pickup(); hud.log('+' + n + ' ' + AMMO_LABEL[k] + ' ammo', '#ffd23a');
    return true;
  }
  return false;
}

function pickupItem(d) {
  const it = d.item;
  if (it.kind === 'gun') {
    const empty = player.weapons.indexOf(null);
    if (empty >= 0) { player.weapons[empty] = it; if (!player.gun()) { player.cur = empty; setViewmodel(); } }
    else {
      const old = player.weapons[player.cur];
      player.weapons[player.cur] = it;
      setViewmodel();
      spawnDrop('item', player.pos.clone().setY(player.pos.y + 1), { item: old }).vel.set(0, 3, 0);
    }
  } else {
    const old = player.shieldItem;
    player.shieldItem = it;
    player.recomputeMaxHp();
    player.shield = Math.min(player.shield, it.capacity);
    player.shieldDelayT = 0.5;
    if (old) spawnDrop('item', player.pos.clone().setY(player.pos.y + 1), { item: old }).vel.set(0, 3, 0);
  }
  SFX.pickup();
  hud.log('Picked up ' + it.name, RARITY[it.rarity].css);
  removeDrop(d);
}

let focus = null; // what E would act on
const USE_KEY = IS_TOUCH ? '' : '<kbd>E</kbd> ';
function updateInteraction(dt) {
  focus = null;
  const eye = camera.position;
  camBasis();
  // auto pickups with a little magnetism
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    if (d.kind === 'item' || d.t < 0.4) continue;
    const dist = d.pos.distanceTo(player.center());
    if (dist < 4 && d.grounded) {
      const willTake = d.kind === 'cash' || (d.kind === 'ammo') || (d.kind === 'health' && player.hp < player.maxHp) || (d.kind === 'grenade' && player.grenades < player.maxGrenades);
      if (willTake) d.pos.lerp(player.center(), Math.min(1, dt * 6));
    }
    if (dist < 1.4 && tryAutoPickup(d)) removeDrop(d);
  }
  let best = null, bestScore = -Infinity;
  for (const d of drops) {
    if (d.kind !== 'item') continue;
    const to = d.pos.clone().sub(eye);
    const dist = to.length();
    if (dist > 3.2) continue;
    const dot = to.normalize().dot(_fwd);
    const score = dot * 2 - dist * 0.4;
    if (dot > 0.55 && score > bestScore) { bestScore = score; best = d; }
  }
  if (best) {
    const it = best.item;
    const cmp = it.kind === 'gun' ? player.gun() : player.shieldItem;
    const full = it.kind === 'gun' && player.weapons.indexOf(null) < 0;
    focus = { kind: 'drop', d: best };
    hud.showCard(it, cmp);
    hud.showPrompt(`${USE_KEY}${it.kind === 'shield' ? 'Equip shield' : full ? 'Swap for ' + cmp.name : 'Pick up'}`);
    return;
  }
  hud.showCard(null);
  if (game.chest && !game.chest.opened && game.chest.pos.distanceTo(player.pos) < 3) {
    focus = { kind: 'chest' };
    hud.showPrompt(`${USE_KEY}Open ${game.chest.boss ? 'boss ' : ''}chest`);
    return;
  }
  for (const v of interactables) {
    if (v.pos.distanceTo(player.center()) < 2.6) {
      const cost = v.kind === 'ammo' ? ammoRefillCost() : healCost();
      focus = { kind: v.kind, cost };
      const what = v.kind === 'ammo' ? 'Refill ammo' : 'Heal to full';
      hud.showPrompt(cost > 0 ? `${USE_KEY}${what} · <span class="${player.cash >= cost ? 'ok' : 'bad'}">$${cost}</span>` : (v.kind === 'ammo' ? 'Ammo is full' : 'Health is full'));
      return;
    }
  }
  hud.showPrompt(null);
}
const useBtn = $('useBtn');
function updateUseButton() {
  const label = !focus ? '' : focus.kind === 'drop' ? 'TAKE' : focus.kind === 'chest' ? 'OPEN' : focus.cost > 0 ? 'BUY' : '';
  useBtn.hidden = !label;
  if (label && useBtn.textContent !== label) useBtn.textContent = label;
}
function interact() {
  if (!focus || player.downed) return;
  if (focus.kind === 'drop') pickupItem(focus.d);
  else if (focus.kind === 'chest') openChest();
  else if (focus.kind === 'ammo' || focus.kind === 'health') {
    if (focus.cost <= 0) return;
    if (player.cash < focus.cost) { SFX.deny(); hud.log('Not enough cash', '#ff6a5a'); return; }
    player.cash -= focus.cost;
    SFX.buy();
    if (focus.kind === 'ammo') { for (const k in AMMO_MAX) if (player.weapons.some((w) => w && w.ammo === k)) player.ammo[k] = AMMO_MAX[k]; hud.log('Ammo refilled', '#ffd23a'); }
    else { player.hp = player.maxHp; hud.log('Healed', '#ff6a7a'); }
  }
}

// ---------------------------------------------------------------------------
// Player movement
function updatePlayer(dt) {
  const k = input.keys;
  let mx = 0, mz = 0;
  if (k.KeyW) mz += 1; if (k.KeyS) mz -= 1; if (k.KeyD) mx += 1; if (k.KeyA) mx -= 1;
  mx += input.touchMove.x; mz += input.touchMove.y;
  const mag = Math.hypot(mx, mz);
  if (mag > 1) { mx /= mag; mz /= mag; }
  const stickSprint = Math.hypot(input.touchMove.x, input.touchMove.y) > 0.92 && input.touchMove.y > 0.5;
  const sprint = (k.ShiftLeft || k.ShiftRight || stickSprint) && mz > 0.3 && !input.ads && !player.downed;
  stickBase.classList.toggle('sprint', stickSprint);
  let speed = player.downed ? 1.6 : sprint ? 10.5 : 7;
  if (player.adsK > 0.5) speed *= 0.6;
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
  const rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
  const wx = (fx * mz + rx * mx) * speed, wz = (fz * mz + rz * mx) * speed;
  const a = player.grounded ? 1 - Math.exp(-12 * dt) : 1 - Math.exp(-2.5 * dt);
  player.vel.x = lerp(player.vel.x, wx, a); player.vel.z = lerp(player.vel.z, wz, a);
  if (input.jumpPressed && player.grounded && !player.downed) { player.vel.y = 8.2; player.grounded = false; SFX.jump(); }
  player.vel.y -= 22 * dt;
  player.pos.addScaledVector(player.vel, dt);
  const wasGrounded = player.grounded;
  const g = collideBody(player.pos, 0.4, 1.75, player.vel.y);
  if (player.pos.y <= g || (wasGrounded && player.vel.y <= 0 && player.pos.y - g < 0.45)) {
    if (!wasGrounded && player.vel.y < -9) { SFX.land(); game.shake(0.08); }
    player.pos.y = g; player.vel.y = 0; player.grounded = true;
  } else player.grounded = false;
  const moving = mag > 0.1 && player.grounded;
  if (moving) player.bob += dt * (sprint ? 13 : 9);
  // shield recharge
  const sm = player.shieldMax();
  player.shieldDelayT -= dt;
  if (player.shieldDelayT <= 0 && player.shield < sm && !player.downed) {
    if (!player.shieldCharging) { player.shieldCharging = true; SFX.shieldUp(); }
    player.shield = Math.min(sm, player.shield + player.shieldItem.rate * dt);
  }
  player.invuln -= dt; player.hurtSoundT -= dt;
  if (player.downed) {
    player.downT -= dt;
    if (player.downT <= 0) { player.alive = false; playerDied(); }
  }
  return { moving, sprint };
}

function updateCamera(dt, moving, sprint) {
  const g = player.gun();
  const wantAds = input.ads && g && player.reloadT <= 0 && !sprint;
  player.adsK = clamp(player.adsK + (wantAds ? dt : -dt) * 7, 0, 1);
  const zoom = g ? g.zoom : 1;
  const fov = baseFov() / lerp(1, zoom, player.adsK) + (sprint ? 6 : 0);
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = lerp(camera.fov, fov, Math.min(1, dt * 14)); camera.updateProjectionMatrix(); }
  const bobY = moving ? Math.abs(Math.sin(player.bob)) * 0.05 * (1 - player.adsK) : 0;
  camera.position.set(player.pos.x, player.eyeY() + bobY, player.pos.z);
  game.shakeAmt = Math.max(0, game.shakeAmt - dt * 2.5);
  const s = game.shakeAmt * game.shakeAmt * 0.15;
  camera.position.x += rand(-s, s); camera.position.y += rand(-s, s); camera.position.z += rand(-s, s);
  player.recoil -= player.recoil * Math.min(1, dt * 9);
  camera.rotation.set(clamp(player.pitch + player.recoil, -1.55, 1.55), player.yaw, player.downed ? 0.15 : 0);
  sky.position.copy(camera.position);
  sun.position.copy(player.pos).addScaledVector(SUN_DIR, 80);
  sun.target.position.copy(player.pos);
}

// Aim assist. Three light layers, all aimed at the body so headshots are still
// on you: friction (look slows while the crosshair is near an enemy), a gentle
// pull while shooting or zoomed, and a quick snap when you start zooming next
// to a target. Touch gets more help than a mouse.
const assist = { snapT: 0, prevAds: false, target: null, current: null };
const _ac = new THREE.Vector3(), _at = new THREE.Vector3();
function findAssistTarget(cone, maxDist) {
  camBasis();
  let best = null, bestScore = Infinity;
  for (const e of enemies) {
    if (!e.alive) continue;
    enemyCenter(e, _ac);
    _at.subVectors(_ac, camera.position);
    const d = _at.length();
    if (d > maxDist || d < 0.5) continue;
    _at.divideScalar(d);
    const ang = Math.acos(clamp(_at.dot(_fwd), -1, 1));
    const lim = cone + Math.atan(e.radius / d);
    if (ang > lim) continue;
    const score = ang / lim + d * 0.003;
    if (score < bestScore && lineOfSight(camera.position, _ac)) { best = e; bestScore = score; }
  }
  return best;
}
function steerToward(e, k) {
  enemyCenter(e, _ac);
  _at.subVectors(_ac, camera.position).normalize();
  const wantYaw = Math.atan2(-_at.x, -_at.z), wantPitch = Math.asin(clamp(_at.y, -1, 1)) - player.recoil;
  let dy = wantYaw - player.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  player.yaw += dy * k;
  player.pitch += (wantPitch - player.pitch) * k;
}
function applyLook(dt) {
  const g = player.gun();
  const zoom = g ? lerp(1, g.zoom, player.adsK) : 1;
  const range = !g ? 50 : g.type === 'sniper' ? 140 : g.type === 'shotgun' ? 28 : g.type === 'launcher' ? 70 : 60;
  const touch = IS_TOUCH;
  const tgt = player.alive ? findAssistTarget((touch ? 0.09 : 0.045) / Math.sqrt(zoom), range) : null;
  assist.current = tgt;
  let friction = 1;
  if (tgt) friction = touch ? 0.5 : (player.adsK > 0.5 ? 0.7 : 0.85);
  const sens = SENS / zoom * friction;
  player.yaw -= input.lookDX * sens;
  player.pitch = clamp(player.pitch - input.lookDY * sens, -1.5, 1.5);

  const adsNow = input.ads;
  if (adsNow && !assist.prevAds && player.adsK < 0.3) {
    const snapTgt = findAssistTarget(touch ? 0.17 : 0.1, range);
    if (snapTgt) { assist.snapT = 0.18; assist.target = snapTgt; }
  }
  assist.prevAds = adsNow;
  if (assist.snapT > 0 && assist.target && assist.target.alive) {
    assist.snapT -= dt;
    steerToward(assist.target, Math.min(1, dt * (touch ? 16 : 9)));
  } else if (tgt && (input.fire || player.adsK > 0.5)) {
    steerToward(tgt, Math.min(1, dt * (touch ? 4 : 1.2)));
  }
}

// ---------------------------------------------------------------------------
// Screens
const screens = { menu: $('menu'), pause: $('pause'), dead: $('dead') };
function show(name) { for (const k in screens) screens[k].hidden = k !== name; $('hud').hidden = name === 'menu'; $('touch').hidden = !IS_TOUCH || name !== null; }

function renderBest() {
  $('bestLine').textContent = game.best.wave > 0 ? `Best run: wave ${game.best.wave} · level ${game.best.level}` : 'Survive the waves. Grab the loot.';
}
function startGame() {
  SFX.init();
  clearEnemies();
  for (const d of drops.slice()) removeDrop(d);
  for (const p of playerProj) scene.remove(p.mesh);
  playerProj.length = 0;
  if (turret.active) { turret.active = false; scene.remove(turret.group); }
  if (game.chest) { scene.remove(game.chest.group); game.chest = null; }
  resetPlayer();
  Object.assign(game, { wave: 0, phase: 'intermission', interT: 6, toSpawn: [], waveTotal: 0, waveKilled: 0, enemyLevel: 1 });
  camera.fov = baseFov(); camera.updateProjectionMatrix();
  game.state = 'play';
  show(null);
  lockPointer();
  hud.log('Shoot bandits. Grab loot. Don\'t die.', '#ffd23a');
  hud.log(IS_TOUCH ? 'Left thumb moves. Drag right side to aim.' : 'WASD move · Mouse aim · Q turret · G grenade', '#fff3dc');
}
function pauseGame() {
  if (game.state !== 'play') return;
  game.state = 'paused';
  input.fire = false; input.ads = false;
  show('pause');
}
function resumeGame() {
  game.state = 'play';
  show(null);
  lockPointer();
}
function playerDied() {
  game.state = 'dead';
  input.fire = false; input.ads = false;
  const cost = Math.floor(player.cash * 0.07);
  $('deadStats').innerHTML = `Reached wave <b>${game.wave}</b> · Level <b>${player.level}</b><br>${player.stats.kills} kills · ${player.stats.crits} crits · ${Math.round(player.stats.damage).toLocaleString()} damage dealt`;
  $('btnRespawn').textContent = `Respawn ($${cost.toLocaleString()})`;
  game.best.wave = Math.max(game.best.wave, game.wave - 1); game.best.level = Math.max(game.best.level, player.level); saveBest(game.best);
  if (document.pointerLockElement) document.exitPointerLock();
  show('dead');
}
function respawn() {
  player.cash -= Math.floor(player.cash * 0.07);
  player.alive = true; player.downed = false;
  player.hp = player.maxHp; player.shield = player.shieldMax(); player.invuln = 3;
  respawnAt(new THREE.Vector3(0, 0, 12));
  for (const s of enemyShots) scene.remove(s.mesh);
  enemyShots.length = 0;
  burst(player.center(), 0x4fc6ff, 30, 5, 0.12, 0.8, 0.2, true);
  hud.banner('NEW-U', 'Cloned and ready. 7% of your cash was the fee.');
  game.state = 'play';
  show(null);
  lockPointer();
}

$('btnDeploy').addEventListener('click', startGame);
$('btnResume').addEventListener('click', resumeGame);
$('btnRestart').addEventListener('click', startGame);
$('btnRespawn').addEventListener('click', respawn);
$('btnRestart2').addEventListener('click', startGame);
$('btnMute').addEventListener('click', () => { $('btnMute').textContent = SFX.toggleMute() ? 'Sound: off' : 'Sound: on'; });
$('pauseBtn').addEventListener('click', pauseGame);

// ---------------------------------------------------------------------------
// Mouse & keyboard
const canvasEl = renderer.domElement;
let lockFailed = false, hadLock = false;
function lockPointer() {
  if (IS_TOUCH || lockFailed) return;
  try { const r = canvasEl.requestPointerLock(); if (r && r.catch) r.catch(() => { lockFailed = true; }); } catch (e) { lockFailed = true; }
}
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvasEl) hadLock = true;
  else if (hadLock && game.state === 'play') pauseGame();
});
document.addEventListener('pointerlockerror', () => { lockFailed = true; });

document.addEventListener('mousemove', (e) => {
  if (game.state !== 'play') return;
  if (document.pointerLockElement === canvasEl || lockFailed) { input.lookDX += e.movementX || 0; input.lookDY += e.movementY || 0; }
});
canvasEl.addEventListener('mousedown', (e) => {
  if (game.state !== 'play') return;
  if (!document.pointerLockElement && !lockFailed) { lockPointer(); return; }
  if (e.button === 0) { input.fire = true; input.firePressed = true; }
  if (e.button === 2) input.ads = true;
});
window.addEventListener('mouseup', (e) => { if (e.button === 0) input.fire = false; if (e.button === 2) input.ads = false; });
canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('wheel', (e) => { if (game.state === 'play') cycleWeapon(e.deltaY > 0 ? 1 : -1); }, { passive: true });

window.addEventListener('keydown', (e) => {
  input.keys[e.code] = true;
  if (e.repeat) return;
  if (game.state !== 'play') {
    if (e.code === 'Escape' && game.state === 'paused') resumeGame();
    return;
  }
  switch (e.code) {
    case 'Space': input.jumpPressed = true; e.preventDefault(); break;
    case 'KeyR': startReload(); break;
    case 'KeyE': interact(); break;
    case 'KeyG': throwGrenade(); break;
    case 'KeyQ': deployTurret(); break;
    case 'KeyF': case 'KeyV': doMelee(); break;
    case 'Digit1': switchWeapon(0); break;
    case 'Digit2': switchWeapon(1); break;
    case 'Digit3': switchWeapon(2); break;
    case 'Digit4': switchWeapon(3); break;
    case 'KeyN': if (game.phase === 'intermission') game.interT = 0; break;
    case 'KeyM': $('btnMute').textContent = SFX.toggleMute() ? 'Sound: off' : 'Sound: on'; break;
    case 'KeyP': case 'Escape': pauseGame(); break;
  }
});
window.addEventListener('keyup', (e) => { input.keys[e.code] = false; });
window.addEventListener('blur', () => { input.keys = Object.create(null); input.fire = false; if (game.state === 'play' && !IS_TOUCH) pauseGame(); });

// ---------------------------------------------------------------------------
// Touch controls
const touchEl = $('touch');
const stickBase = $('stickBase'), stickKnob = $('stickKnob');
const pointers = new Map();
function touchAct(act, down, btn) {
  if (game.state !== 'play') return;
  if (act === 'fire') { input.fire = down; if (down) input.firePressed = true; return; }
  if (!down) return;
  switch (act) {
    case 'ads': input.ads = !input.ads; btn.classList.toggle('on', input.ads); break;
    case 'jump': input.jumpPressed = true; break;
    case 'use': interact(); break;
    case 'gren': throwGrenade(); break;
    case 'skill': deployTurret(); break;
  }
}
touchEl.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') return;
  e.preventDefault();
  SFX.init();
  const btn = e.target.closest('[data-act]');
  if (btn) {
    const act = btn.dataset.act;
    btn.classList.add('down');
    touchAct(act, true, btn);
    pointers.set(e.pointerId, { kind: act === 'fire' ? 'look' : 'btn', act, btn, x: e.clientX, y: e.clientY });
  } else if (e.clientX < window.innerWidth * 0.42) {
    pointers.set(e.pointerId, { kind: 'stick', x0: e.clientX, y0: e.clientY });
    stickBase.hidden = false;
    stickBase.style.transform = `translate(${e.clientX - 60}px, ${e.clientY - 60}px)`;
    stickKnob.style.transform = 'translate(0px, 0px)';
  } else pointers.set(e.pointerId, { kind: 'look', x: e.clientX, y: e.clientY });
  try { touchEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
}, { passive: false });
touchEl.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  e.preventDefault();
  if (p.kind === 'stick') {
    let dx = e.clientX - p.x0, dy = e.clientY - p.y0;
    const d = Math.hypot(dx, dy), R = 55;
    if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    input.touchMove.x = dx / R; input.touchMove.y = -dy / R;
  } else if (p.kind === 'look') {
    input.lookDX += (e.clientX - p.x) * 2.4; input.lookDY += (e.clientY - p.y) * 2.4;
    p.x = e.clientX; p.y = e.clientY;
  }
}, { passive: false });
function endPointer(e) {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  pointers.delete(e.pointerId);
  if (p.kind === 'stick') { input.touchMove.x = 0; input.touchMove.y = 0; stickBase.hidden = true; }
  if (p.btn) { p.btn.classList.remove('down'); if (p.act === 'fire') touchAct('fire', false, p.btn); }
}
touchEl.addEventListener('pointerup', endPointer);
touchEl.addEventListener('pointercancel', endPointer);
document.addEventListener('gesturestart', (e) => e.preventDefault());
if (IS_TOUCH) {
  const tap = (el, fn) => el.addEventListener('pointerdown', (e) => { if (game.state !== 'play') return; e.preventDefault(); e.stopPropagation(); fn(e); });
  tap($('ammoMag').parentNode, () => startReload());
  tap($('gunName'), () => cycleWeapon(1));
  tap($('slots'), (e) => { const s = e.target.closest('.slot'); if (s) switchWeapon(+s.dataset.i); });
}

// ---------------------------------------------------------------------------
// Main loop
const SENS = 0.0022;
function update(dt) {
  if (input.keys.ArrowLeft) input.lookDX -= 900 * dt;
  if (input.keys.ArrowRight) input.lookDX += 900 * dt;
  if (input.keys.ArrowUp) input.lookDY -= 600 * dt;
  if (input.keys.ArrowDown) input.lookDY += 600 * dt;
  applyLook(dt);
  navUpdate(player.pos, dt);

  const { moving, sprint } = updatePlayer(dt);
  if (game.state !== 'play') return;
  updateCamera(dt, moving, sprint);
  updateWeapon(dt);
  updateViewmodel(dt, moving);
  updateTurret(dt);
  for (const e of enemies) if (e.alive) updateEnemy(e, dt);
  separateEnemies();
  updateEnemyShots(dt);
  updateHazards(dt);
  updatePlayerProj(dt);
  updateDrops(dt);
  updateFx(dt);
  updateWaves(dt);
  updateInteraction(dt);
  if (IS_TOUCH) updateUseButton();
  if (game.chest) {
    const c = game.chest;
    c.t += dt;
    const lid = c.group.userData.lid;
    lid.rotation.x = lerp(lid.rotation.x, c.opened ? -1.9 : 0, Math.min(1, dt * 6));
  }
  hud.update(dt);
  input.lookDX = 0; input.lookDY = 0; input.firePressed = false; input.jumpPressed = false;
}

let menuT = 0;
function updateMenu(dt) {
  menuT += dt * 0.05;
  camera.position.set(Math.cos(menuT) * 48, 18, Math.sin(menuT) * 48);
  camera.lookAt(0, 4, 0);
  sky.position.copy(camera.position);
  sun.position.set(0, 0, 0).addScaledVector(SUN_DIR, 80); sun.target.position.set(0, 0, 0);
  updateFx(dt);
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game.hitstop > 0) { game.hitstop -= dt; dt *= 0.12; }
  if (game.state === 'play') update(dt);
  else if (game.state === 'menu') updateMenu(dt);
  renderer.clear();
  renderer.render(scene, camera);
  if (game.state !== 'menu' && player.gun()) { renderer.clearDepth(); renderer.render(vmScene, vmCamera); }
}

// boot
show('menu');
renderBest();
$('ctlDesktop').hidden = IS_TOUCH;
$('ctlTouch').hidden = !IS_TOUCH;
requestAnimationFrame(frame);
