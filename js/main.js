'use strict';
// Stage play (waves, chests, vending, pickups), input (mouse, keyboard, touch) and the main loop.
// The campaign around it (menus, stage list, save file) is in stages.js.

const game = {
  state: 'menu', mode: 'menu', wave: 0, phase: 'intermission', interT: 0,
  toSpawn: [], spawnT: 0, enemyLevel: 1, chest: null, shakeAmt: 0, hitstop: 0, slowmo: 0,
  streak: 0, streakT: 0, streakMult: 1, starsLeft: 0,
  waveStartKills: 0, waveTotal: 0, waveKilled: 0,

  waveLabel() {
    if (this.mode === 'hub') return 'HUB';
    if (this.phase === 'complete') return 'STAGE CLEARED';
    const of = campaign.stage ? '/' + campaign.stage.waves : '';
    return this.wave === 0 ? 'GET READY' : (this.wave % 5 === 0 ? 'BOSS WAVE ' : 'WAVE ') + this.wave + of;
  },
  waveSub() {
    if (this.mode === 'hub') return 'Use the console to pick a stage';
    if (this.phase === 'complete') return 'Extraction in ' + Math.ceil(campaign.extractT) + 's' + (IS_TOUCH ? ' · pause to leave now' : ' · N to leave now');
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
      carnageKill(e);
      player.addXp(e.def.xp * (1 + (e.level - 1) * 0.3) * this.streakMult);
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
  // packs (decisions.md 2026-11-09): mostly axe-wielders, a few gunners behind; fewer than the old
  // hordes, since each now takes a few hits and only a few come at you at once
  const n = Math.min(Math.round((8 + w * 4) * DIFFICULTY.waveSize), 40);
  // (no Suicide Psychos: no bomb-carriers or grenades, decisions.md 2026-11-09)
  const pool = [['psycho', 12], ['bandit', 2.5], ['marauder', w >= 3 ? 1.2 : 0]].filter((p) => p[1] > 0);
  for (let i = 0; i < (boss ? Math.floor(n * 0.5) : n); i++) list.push(weighted(pool));
  const badass = w >= 3 ? 1 + Math.floor((w - 3) / 3) : 0;
  for (let i = 0; i < (boss ? Math.floor(badass / 2) : badass); i++) list.splice(randi(2, list.length), 0, 'nomad');
  if (boss) list.splice(Math.min(3, list.length), 0, 'boss');
  return list;
}
// Where a pack comes in: open ground the enemies can walk from (on the flow field), off screen but
// close (20-36 m), in a random direction; else the map's reachable spawn points.
const _hv = new THREE.Vector3();
function offScreen(x, y, z) { _hv.set(x, y + 1, z).project(camera); return _hv.z > 1 || Math.abs(_hv.x) > 1.08 || Math.abs(_hv.y) > 1.08; }
function hordeSpawnPoint() {
  for (let k = 0; k < 40; k++) {
    const a = rand(0, TAU), d = rand(20, 36) + k * 0.3;
    const x = player.pos.x + Math.cos(a) * d, z = player.pos.z + Math.sin(a) * d;
    if (!inBounds(x, z, 3) || !navWalkable(x, z)) continue;
    const c = navCellOf(x, z), nd = navDist[c];
    if (!(nd < d * 2.2 + 10) && !(k > 25 && nd < Infinity)) continue; // a reasonable walk in
    const y = groundAt(x, z);
    if (!offScreen(x, y, z)) continue;
    return new THREE.Vector3(x, y, z);
  }
  const ok = spawnPoints.filter((g) => navWalkable(g.x, g.z) && navDist[navCellOf(g.x, g.z)] < Infinity);
  const list = ok.length ? ok : spawnPoints;
  return list.slice().sort((a, b) => a.distanceTo(player.pos) - b.distanceTo(player.pos))[Math.min(1, list.length - 1)].clone();
}
// Anyone who stops getting closer for a while (stuck on the map, or a gunner far off) and isn't on
// screen is moved to a fresh spot near the player, so waves always end.
function unstickEnemies(dt) {
  for (const e of enemies) {
    if (!e.alive || e.def.boss) continue;
    const d = Math.hypot(e.pos.x - player.pos.x, e.pos.z - player.pos.z);
    const s = e.stuck || (e.stuck = { t: 0, best: d, check: 1 });
    s.check -= dt;
    if (s.check > 0) continue;
    s.check = 1;
    const far = e.def.ai === 'ranged' ? d > 40 : d > 6;
    if (far && d > s.best - 1) s.t += 1; else { s.t = 0; s.best = Math.min(s.best, d); }
    if (d < s.best) s.best = d;
    if (s.t >= (e.def.ai === 'ranged' ? 8 : 4) && offScreen(e.pos.x, e.pos.y, e.pos.z)) {
      const p = hordeSpawnPoint();
      e.pos.copy(p); e.vel.set(0, 0, 0); e.path = null; e.spot = null; e.state = 'move';
      s.t = 0; s.best = Math.hypot(p.x - player.pos.x, p.z - player.pos.z);
    }
  }
}
function startWave() {
  game.wave++;
  game.phase = 'combat';
  game.enemyLevel = 1 + Math.floor((game.wave - 1) * DIFFICULTY.levelPerWave);
  game.toSpawn = buildWave(game.wave);
  game.waveTotal = game.toSpawn.length; game.waveKilled = 0;
  game.spawnT = 1;
  SFX.wave();
  game.pack = null;
  game.starsLeft = 1 + Math.floor(game.wave / 2);
  hud.banner(game.waveLabel(), game.wave % 5 === 0 ? 'Krag the Scrapjaw has entered the arena' : game.waveTotal + ' incoming');
}
// ---------------------------------------------------------------------------
// Carnage (decisions.md 2026-11-08): kills in quick succession build a streak that multiplies XP
// and cash. Milestones are called out like a broadcast, and some bring a sponsor drop (loot from
// the sky) or a Frenzy (faster, harder hits that heal). Every wave also has a few Star enemies:
// bigger, tougher, worth far more. The last kill of a wave plays in slow motion. All placeholder
// tuning; the call-out lines are generic placeholders, not approved slogans.
const STREAK_WINDOW = 7; // kills take a few hits each, so the window is generous
const STREAK_MILESTONES = { 5: ['RATINGS UP!', ''], 10: ['PRIME TIME!', 'Sponsor drop incoming'], 15: ['FRENZY!', 'Hit harder, swing faster, heal on hit'], 25: ['SPONSORED!', 'Sponsor drop incoming'], 40: ['GOING VIRAL!', 'Sponsor drop incoming'], 60: ['SERIES FINALE!', 'Sponsor drop incoming'] };
function carnageKill(e) {
  game.streak = game.streakT > 0 ? game.streak + 1 : 1;
  game.streakT = STREAK_WINDOW;
  game.streakMult = Math.min(3, 1 + Math.floor(game.streak / 5) * 0.25);
  game.bestStreak = Math.max(game.bestStreak || 0, game.streak);
  const m = STREAK_MILESTONES[game.streak];
  if (m) {
    hud.banner(m[0], m[1]); SFX.levelUp();
    if (game.streak === 15) { player.buffs = player.buffs || {}; player.buffs.frenzy = 7; buildWeapons(); }
    else if (m[1]) sponsorDrop();
  }
  if (e.star) hud.log('Star down! ×' + game.streakMult.toFixed(2) + ' carnage', '#ffd23a');
}
function sponsorDrop() {
  const p = player.pos.clone().add(new THREE.Vector3(rand(-3, 3), 9, rand(-3, 3)));
  const lvl = Math.max(game.enemyLevel, player.level);
  const d = spawnDrop('item', p, { item: genMod(lvl, { luck: 1.5 + game.streak / 20, rarity: game.streak >= 40 ? weighted([[3, 2], [4, 1]]) : undefined }) });
  d.vel.set(0, -4, 0);
  spawnDrop('health', p.clone().add(new THREE.Vector3(1, 0, 0))).vel.set(0, -4, 0);
  for (const c of [0xff3b6b, 0xffd23a, 0x4fc6ff, 0x9fff6a]) burst(p.clone().setY(player.pos.y + 4), c, 10, 6, 0.12, 1.2, 0.6, true); // confetti
}
function updateCarnage(dt) {
  if (game.streakT > 0) { game.streakT -= dt; if (game.streakT <= 0) { game.streak = 0; game.streakMult = 1; } }
  hud.streak(game.streak, game.streakT / STREAK_WINDOW, game.streakMult, player.buffs && player.buffs.frenzy > 0);
}
function endWave() {
  game.slowmo = 1.1; // the last kill, in slow motion
  spawnChest(game.wave % 5 === 0);
  if (campaign.stage && game.wave >= campaign.stage.waves) { stageCleared(); savePlayer(); return; }
  game.phase = 'intermission';
  game.interT = 25;
  hud.banner('WAVE ' + game.wave + ' CLEARED', 'A loot chest has appeared');
  savePlayer(); // mid-stage progress survives closing the tab
}
function updateWaves(dt) {
  if (game.phase === 'complete') {
    campaign.extractT -= dt;
    if (campaign.extractT <= 0) finishStage(true);
    return;
  }
  if (game.phase === 'intermission') {
    game.interT -= dt;
    if (game.interT <= 0) startWave();
    return;
  }
  const alive = enemies.filter((e) => e.alive).length;
  game.spawnT -= dt;
  // how many at once: phones draw fewer
  const maxAlive = IS_TOUCH ? Math.min(7 + game.wave, 11) : Math.min(8 + game.wave * 1.5, 14);
  if (game.toSpawn.length && game.spawnT <= 0 && alive < maxAlive) {
    // they come in packs, each pack from one spot just off screen
    if (!game.pack || game.pack.left <= 0) game.pack = { at: hordeSpawnPoint(), left: randi(2, 4) };
    game.pack.left--;
    game.spawnT = game.pack.left > 0 ? rand(0.25, 0.5) : rand(2.5, 4.5);
    const key = game.toSpawn.shift();
    const a = game.pack.at, p = a.clone();
    for (let k = 0; k < 8; k++) { const x = a.x + rand(-2.5, 2.5), z = a.z + rand(-2.5, 2.5); if (navWalkable(x, z)) { p.set(x, 0, z); break; } }
    p.y = groundAt(p.x, p.z);
    const lvl = game.enemyLevel + (key === 'boss' ? 1 : 0);
    const e = spawnEnemy(key, lvl, p);
    // Star enemies: about one or two a wave, more later
    if (key !== 'boss' && (game.starsLeft || 0) > 0 && Math.random() < game.starsLeft / (game.toSpawn.length + 1)) { game.starsLeft--; makeStar(e); }
  }
  unstickEnemies(dt);
  updateCarnage(dt);
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
  // loot is axe mods (js/arsenal.js)
  if (e.def.boss) {
    spawnDrop('item', p, { item: genMod(lvl, { rarity: Math.random() < 0.45 ? 4 : 3 }) });
    spawnDrop('item', p, { item: genMod(lvl, { luck: 2 }) });
    spawnDrop('item', p, { item: genMod(lvl, { luck: 2 }) });
    for (let i = 0; i < 6; i++) spawnDrop('cash', p, { amount: Math.round(rand(10, 20) * levelScale(lvl)) });
    spawnDrop('health', p);
    return;
  }
  if (e.star) { // a star always drops something good, and a pile of cash
    spawnDrop('item', p, { item: genMod(lvl, { rarity: weighted([[2, 5], [3, 3], [4, 1]]) }) });
    for (let i = 0; i < 4; i++) spawnDrop('cash', p, { amount: Math.round(rand(8, 14) * levelScale(lvl) * game.streakMult) });
  }
  if (Math.random() < (e.def.badass ? 0.8 : 0.1)) spawnDrop('item', p, { item: genMod(lvl, { luck }) });
  if (Math.random() < 0.55) spawnDrop('cash', p, { amount: Math.round(rand(3, 8) * levelScale(lvl) * (e.def.badass ? 4 : 1) * game.streakMult) });
  if (Math.random() < DIFFICULTY.healthDrop) spawnDrop('health', p);
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
  // in the open on the forecourt, a few steps from where the player starts
  const cs = MAP.ready && MAP.points.ChestSpot;
  const pos = cs ? new THREE.Vector3(...cs) : MAP.ready ? MAP.spawn.clone().add(new THREE.Vector3(0, 0, 6)) : new THREE.Vector3(0, 0, -1.5);
  pos.y = groundAt(pos.x, pos.z);
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
  spawnDrop('item', p, { item: genMod(lvl, { luck, rarity: c.boss ? (Math.random() < 0.3 ? 4 : 3) : undefined }) });
  spawnDrop('item', p, { item: genMod(lvl, { luck }) });
  for (let i = 0; i < 3; i++) spawnDrop('cash', p, { amount: Math.round(rand(6, 12) * levelScale(lvl)) });
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
function healCost() { return Math.ceil((1 - player.hp / player.maxHp) * 45 * DIFFICULTY.healCost * levelScale(player.level)); }

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
  if (it.kind === 'mod') {
    const where = takeMod(it);
    if (!where) { hud.log('Your bag is full: scrap some mods (GEAR)', '#ff6a5a'); SFX.deny(); return; }
    SFX.pickup();
    hud.log((where === 'fitted' ? 'Fitted ' : 'Bagged ') + it.name, RARITY[it.rarity].css);
    removeDrop(d);
    return;
  } else if (it.kind === 'gun') {
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
  const eye = player.center();
  // auto pickups with a little magnetism
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    if (d.kind === 'item' || d.t < 0.4) continue;
    const dist = d.pos.distanceTo(player.center());
    if (dist < 4 && d.grounded) {
      const willTake = d.kind === 'cash' || (d.kind === 'health' && player.hp < player.maxHp) || (d.kind === 'grenade' && player.grenades < player.maxGrenades);
      if (willTake) d.pos.lerp(player.center(), Math.min(1, dt * 6));
    }
    if (dist < 1.4 && tryAutoPickup(d)) removeDrop(d);
  }
  let best = null, bestScore = -Infinity;
  for (const d of drops) {
    if (d.kind !== 'item') continue;
    const to = d.pos.clone().sub(eye);
    const dist = to.length();
    if (dist > 2.6) continue;
    const score = -dist;
    if (score > bestScore) { bestScore = score; best = d; }
  }
  if (best) {
    const it = best.item;
    const cmp = it.kind === 'mod' ? player.mods[it.weapon][it.slot] : it.kind === 'gun' ? player.gun() : player.shieldItem;
    const full = it.kind === 'gun' && player.weapons.indexOf(null) < 0;
    focus = { kind: 'drop', d: best };
    hud.showCard(it, cmp);
    hud.showPrompt(`${USE_KEY}${it.kind === 'mod' ? (cmp ? (player.stash.length >= BAG_MAX ? 'Bag full' : 'Take (to bag)') : 'Fit this mod') : it.kind === 'shield' ? 'Equip shield' : full ? 'Swap for ' + cmp.name : 'Pick up'}`);
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
      if (v.kind === 'stages') { focus = { kind: 'stages' }; hud.showPrompt(`${USE_KEY}Stage select`); return; }
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
  const label = !focus ? '' : focus.kind === 'drop' ? 'TAKE' : focus.kind === 'chest' ? 'OPEN' : focus.kind === 'stages' ? 'STAGES' : focus.cost > 0 ? 'BUY' : '';
  useBtn.hidden = !label;
  if (label && useBtn.textContent !== label) useBtn.textContent = label;
}
function interact() {
  if (!focus || player.downed) return;
  if (focus.kind === 'drop') pickupItem(focus.d);
  else if (focus.kind === 'chest') openChest();
  else if (focus.kind === 'stages') openStageSelect();
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
  if (k.KeyW || k.ArrowUp) mz += 1; if (k.KeyS || k.ArrowDown) mz -= 1; if (k.KeyD || k.ArrowRight) mx += 1; if (k.KeyA || k.ArrowLeft) mx -= 1;
  mx += input.touchMove.x; mz += input.touchMove.y;
  const mag = Math.hypot(mx, mz);
  if (mag > 1) { mx /= mag; mz /= mag; }
  const stickSprint = Math.hypot(input.touchMove.x, input.touchMove.y) > 0.92;
  const sprint = (k.ShiftLeft || k.ShiftRight || stickSprint) && mag > 0.3 && !player.downed;
  stickBase.classList.toggle('sprint', stickSprint);
  player.sprinting = sprint;
  let speed = player.downed ? 1.6 : sprint ? 10.5 : 7;
  if (player.adsK > 0.5) speed *= 0.6;
  // top-down: up on the stick (or W) is up the screen, which is always north
  const fx = 0, fz = -1, rx = 1, rz = 0;
  const wx = (fx * mz + rx * mx) * speed, wz = (fz * mz + rz * mx) * speed;
  const a = player.grounded ? 1 - Math.exp(-12 * dt) : 1 - Math.exp(-2.5 * dt);
  // strikes glide toward their target and dodges dash: they take over the movement
  if (player.forceVel) { player.vel.x = player.forceVel.x; player.vel.z = player.forceVel.z; }
  else { player.vel.x = lerp(player.vel.x, wx, a); player.vel.z = lerp(player.vel.z, wz, a); }
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

// The camera and aiming are top-down (js/topdown.js). Enemies read assist.current (the enemy being
// aimed at) to decide when to dodge.
const assist = { current: null };

// ---------------------------------------------------------------------------
// Screens
const screens = { menu: $('menu'), stages: $('stages'), brief: $('brief'), results: $('results'), pause: $('pause'), dead: $('dead'), skills: $('skills'), gear: $('gear') };
const MENU_SCREENS = ['menu', 'stages', 'brief', 'results'];
function show(name) {
  for (const k in screens) screens[k].hidden = k !== name;
  $('hud').hidden = $('overlay').hidden = MENU_SCREENS.includes(name);
  $('touch').hidden = !IS_TOUCH || name !== null;
}

// Empty the arena of everything a run leaves behind.
function clearStageWorld() {
  clearEnemies();
  for (const d of drops.slice()) removeDrop(d);
  for (const p of playerProj) scene.remove(p.mesh);
  playerProj.length = 0;
  if (turret.active) { turret.active = false; scene.remove(turret.group); }
  if (game.chest) { scene.remove(game.chest.group); game.chest = null; }
}
// Put the player at a spot with full health and a fresh weapon state, keeping their gear.
function readyPlayer(at, yaw = 0) {
  player.alive = true; player.downed = false; player.invuln = 1;
  player.reloadT = 0; player.swapT = 0; player.fireCd = 0; player.burstLeft = 0; player.skillCd = 0;
  player.hp = player.maxHp; player.shield = player.shieldMax();
  respawnAt(at, yaw);
  setViewmodel();
  camera.fov = baseFov(); camera.updateProjectionMatrix();
}
// Start (or restart) the current stage with the player's current gear, at full health.
function startGame() {
  SFX.init();
  clearStageWorld();
  readyPlayer(stageSpawn(), stageSpawnYaw());
  hud.reset();
  Object.assign(game, { mode: 'stage', wave: 0, phase: 'intermission', interT: 6, toSpawn: [], waveTotal: 0, waveKilled: 0, enemyLevel: 1, streak: 0, streakT: 0, streakMult: 1, bestStreak: 0, slowmo: 0 });
  game.state = 'play';
  show(null);
  lockPointer();
  if (IS_TOUCH) setAds(false);
  hud.log(campaign.stage ? campaign.stage.objective : 'Shoot bandits. Grab loot. Don\'t die.', '#ffd23a');
  hud.log(IS_TOUCH ? 'Left thumb moves. FIRE aims itself at the nearest enemy.' : 'WASD move · Click or J fires (auto-aim) · Q: rifle ⇄ axe · F kick', '#fff3dc');
}
function pauseGame() {
  if (game.state !== 'play') return;
  game.state = 'paused';
  input.fire = false;
  if (IS_TOUCH) setAds(false); else input.ads = false;
  if (document.pointerLockElement) document.exitPointerLock(); // the menu needs the cursor
  const hub = game.mode === 'hub';
  $('btnRestart').hidden = $('btnLeave').hidden = hub;
  $('btnMainMenu').hidden = !hub;
  $('pauseNote').textContent = hub ? 'Your progress is saved.' : 'Leaving keeps your level, cash and gear.';
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
  if (document.pointerLockElement) document.exitPointerLock();
  show('dead');
}
function respawn() {
  player.cash -= Math.floor(player.cash * 0.07);
  player.alive = true; player.downed = false;
  player.hp = player.maxHp; player.shield = player.shieldMax(); player.invuln = 3;
  respawnAt(stageSpawn(), stageSpawnYaw());
  for (const s of enemyShots) scene.remove(s.mesh);
  enemyShots.length = 0;
  burst(player.center(), 0x4fc6ff, 30, 5, 0.12, 0.8, 0.2, true);
  hud.banner('NEW-U', 'Cloned and ready. 7% of your cash was the fee.');
  game.state = 'play';
  show(null);
  lockPointer();
}

$('btnResume').addEventListener('click', resumeGame);
$('btnRestart').addEventListener('click', startGame);
$('btnLeave').addEventListener('click', leaveStage);
$('btnRespawn').addEventListener('click', respawn);
$('btnLeave2').addEventListener('click', leaveStage);
$('skillBtn').addEventListener('click', openSkills);
$('gearBtn').addEventListener('click', openGear);
$('btnPauseGear').addEventListener('click', openGear);
$('btnGearDone').addEventListener('click', closeGear);
$('btnPauseSkills').addEventListener('click', openSkills);
$('btnSkillsDone').addEventListener('click', closeSkills);
$('btnMainMenu').addEventListener('click', () => { savePlayer(); game.mode = 'menu'; showMainMenu(); });
$('btnMute').addEventListener('click', () => { $('btnMute').textContent = SFX.toggleMute() ? 'Sound: off' : 'Sound: on'; });
$('pauseBtn').addEventListener('click', pauseGame);

// ---------------------------------------------------------------------------
// Mouse & keyboard
const canvasEl = renderer.domElement;
// Top-down: aiming is automatic (js/topdown.js); clicking (or J) fires at the locked-on enemy.
function lockPointer() {}
canvasEl.addEventListener('mousedown', (e) => {
  if (game.state !== 'play') return;
  if (e.button === 0) { TD.mouseFire = true; input.fire = true; input.firePressed = true; }
});
window.addEventListener('mouseup', (e) => { if (e.button === 0) { TD.mouseFire = false; input.fire = false; } });
canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
  input.keys[e.code] = true;
  if (e.repeat) return;
  if (game.state !== 'play') {
    if (e.code === 'Escape' && game.state === 'paused') resumeGame();
    return;
  }
  switch (e.code) {
    case 'Space': dodge(); e.preventDefault(); break;
    case 'KeyJ': TD.mouseFire = true; input.firePressed = true; break;
    case 'KeyE': interact(); break;
    case 'KeyF': case 'KeyV': case 'KeyQ': counter(); break;
    case 'KeyK': openSkills(); break;
    case 'KeyI': case 'Tab': e.preventDefault(); openGear(); break;
    case 'KeyN': if (game.phase === 'intermission') game.interT = 0; else if (game.phase === 'complete') finishStage(true); break;
    case 'KeyM': $('btnMute').textContent = SFX.toggleMute() ? 'Sound: off' : 'Sound: on'; break;
    case 'KeyP': case 'Escape': pauseGame(); break;
  }
});
window.addEventListener('keyup', (e) => { input.keys[e.code] = false; if (e.code === 'KeyJ') TD.mouseFire = false; });
window.addEventListener('blur', () => { input.keys = Object.create(null); input.fire = false; if (game.state === 'play' && !IS_TOUCH) pauseGame(); });

// ---------------------------------------------------------------------------
// Touch controls
//  - left side: floating move stick (push all the way to sprint)
//  - right side: floating aim stick (top-down twin-stick): point it to aim, push it far to shoot
//    or swing; an enemy near the aim line is locked onto
//  - FIRE / SWING: hold to shoot the rifle, or tap (keep tapping, or hold) for the axe's three-move
//    combo, at the nearest enemy in front when the aim stick isn't held
//  - corner button: COUNTER (lights up with "!" when an enemy is about to strike), else a kick
//  - DODGE: a quick dash
const touchEl = $('touch');
const stickBase = $('stickBase'), stickKnob = $('stickKnob'), aimBase = $('aimBase'), aimKnob = $('aimKnob');
const fireBtn = $('fireBtn'), wheelBtn = $('wheelBtn'), wheelEl = $('wheel');
const pointers = new Map();

function setAds(on) {
  input.ads = on;
  fireBtn.classList.toggle('ads', on);
}
function fireStart(p) { if (p.decided) return; p.decided = 'fire'; TD.fireBtn = true; input.fire = true; input.firePressed = true; }

// ----- the corner button shows the weapon and its ammo and switches; the kick button its cooldown;
// the fire button reads FIRE or SWING (and the axe combo's next move)
function updateWheelButton() {
  // the corner button counters (lit up, with a "!", when an enemy can be countered) or kicks
  const th = counterThreat();
  wheelBtn.classList.toggle('threat', !!th);
  const big = th ? '!' : '🦶';
  if ($('wbAmmo').textContent !== big) $('wbAmmo').textContent = big;
  $('wbPool').textContent = th ? 'counter now' : player.kickCd > 0 ? '' : 'kick';
  $('kickBtn').classList.toggle('cool', (player.dodgeCd || 0) > 0);
  $('kickBtn').classList.toggle('danger', !!dangerThreat()); // a red "!!" is coming: dodge
  const td = (player.flow || 0) >= TAKEDOWN_FLOW;
  fireBtn.classList.toggle('takedown', td);
  const lab = td ? 'TAKEDOWN' : 'STRIKE';
  if ($('fireLabel').textContent !== lab) $('fireLabel').textContent = lab;
  const hint = player.flow >= 2 ? player.flow + ' hits' : (player.meleeT > 0 || player.comboT > -COMBO_WINDOW ? axeMove((player.combo + 1) % 3).name : 'combo');
  if ($('fireHint').textContent !== hint) $('fireHint').textContent = hint;
}
function openWheel() { /* no weapon wheel: the axe is the only weapon */ }

function touchAct(act, btn) {
  if (game.state !== 'play') return;
  if (act === 'jump') dodge(); // the JUMP button is DODGE now
  else if (act === 'kick') dodge(); // the KICK slot is DODGE now
  else if (act === 'use') interact();
}
touchEl.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') return;
  e.preventDefault();
  SFX.init();
  const btn = e.target.closest('[data-act]');
  const now = performance.now();
  if (btn && btn.dataset.act === 'fire') {
    const p = { kind: 'fire', btn, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: now, decided: null };
    pointers.set(e.pointerId, p);
    btn.classList.add('down');
    fireStart(p);
  } else if (btn && btn.dataset.act === 'wheel') {
    // COUNTER (or a kick when there's nothing to counter)
    btn.classList.add('down');
    if (game.state === 'play') counter();
    pointers.set(e.pointerId, { kind: 'btn', btn });
  } else if (btn) {
    btn.classList.add('down');
    touchAct(btn.dataset.act, btn);
    pointers.set(e.pointerId, { kind: 'btn', btn });
  } else if (e.clientX < window.innerWidth * 0.42) {
    pointers.set(e.pointerId, { kind: 'stick', x0: e.clientX, y0: e.clientY });
    stickBase.hidden = false;
    stickBase.style.transform = `translate(${e.clientX - 60}px, ${e.clientY - 60}px)`;
    stickKnob.style.transform = 'translate(0px, 0px)';
  } else {
    pointers.set(e.pointerId, { kind: 'aim', x0: e.clientX, y0: e.clientY });
    aimBase.hidden = false;
    aimBase.style.transform = `translate(${e.clientX - 60}px, ${e.clientY - 60}px)`;
    aimKnob.style.transform = 'translate(0px, 0px)';
    TD.stick.on = true; TD.stick.x = TD.stick.y = 0;
  }
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
  } else if (p.kind === 'aim') {
    let dx = e.clientX - p.x0, dy = e.clientY - p.y0;
    const d = Math.hypot(dx, dy), R = 55;
    if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    aimKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    TD.stick.x = dx / R; TD.stick.y = dy / R; // screen right = east, screen down = south
  }
}, { passive: false });
function endPointer(e) {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  pointers.delete(e.pointerId);
  if (p.btn) p.btn.classList.remove('down');
  if (p.kind === 'stick') { input.touchMove.x = 0; input.touchMove.y = 0; stickBase.hidden = true; }
  else if (p.kind === 'aim') { TD.stick.on = false; TD.stick.x = TD.stick.y = 0; aimBase.hidden = true; }
  else if (p.kind === 'fire') {
    TD.fireBtn = false;
    input.fire = false;
  }
}
touchEl.addEventListener('pointerup', endPointer);
touchEl.addEventListener('pointercancel', endPointer);
document.addEventListener('gesturestart', (e) => e.preventDefault());

// ---------------------------------------------------------------------------
// Main loop
function update(dt) {
  tdAim(dt);
  assist.current = TD.target;
  const hub = game.mode === 'hub';
  if (hub) { input.fire = false; input.firePressed = false; } // no shooting in the hub
  else navUpdate(player.pos, dt);

  const { moving, sprint } = updatePlayer(dt);
  if (game.state !== 'play') return;
  updateCamera(dt);
  updateWeapon(dt);
  updatePlayerBody(dt);
  updateTurret(dt);
  tacticsFrame(dt);
  for (const e of enemies) if (e.alive) updateEnemy(e, dt);
  separateEnemies();
  updateEnemyShots(dt);
  updateHazards(dt);
  updatePlayerProj(dt);
  updateDrops(dt);
  updateFx(dt);
  updateCompound(dt);
  updateRigCorpses(dt);
  if (!hub) { updateWaves(dt); campaign.runT += dt; }
  updateInteraction(dt);
  if (IS_TOUCH) { updateUseButton(); updateWheelButton(); }
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
  cutawayOff();
  if (WORLD.id === 'hub') {
    // the main menu looks over the hub; menus opened in the hub keep the player's view
    if (!screens.menu.hidden) {
      menuT += dt;
      camera.position.set(3.2 + Math.sin(menuT * 0.2) * 0.6, 2.1, 3.6);
      camera.lookAt(0, 1.5, -7);
    }
    updateFx(dt);
    return;
  }
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
  if (game.slowmo > 0) { game.slowmo -= dt; dt *= 0.3; }
  if (game.state === 'play') update(dt);
  else if (game.state === 'menu') updateMenu(dt);
  renderer.clear();
  camera.updateMatrixWorld();
  updateStageMap(camera);
  renderer.render(scene, camera);
}

// boot
switchWorld('hub');
showMainMenu();
(function waitForRigs() {
  const btn = $('btnBriefGo');
  btn.disabled = true; btn.textContent = 'LOADING…';
  const ready = () => { btn.disabled = false; btn.textContent = 'DEPLOY'; };
  const fallback = setTimeout(ready, 15000);
  loadRigs().then(() => { clearTimeout(fallback); buildPlayerBody(); ready(); });
})();
$('ctlDesktop').hidden = IS_TOUCH;
$('ctlTouch').hidden = !IS_TOUCH;
requestAnimationFrame(frame);
