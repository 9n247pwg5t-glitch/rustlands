'use strict';
// The player's arsenal (docs/decisions.md, 2026-11-09): the axe only. Combat is single-target and
// auto-targeted, in the style of free-flow brawlers: each strike goes to one enemy (the one you
// push toward, else the one you're locked on to, else the nearest), closing the distance with a
// leap if it's a few strides away. Hits in a row without getting hit build Momentum (more damage).
// An enemy about to strike shows a "!" - COUNTER then knocks it down. DODGE dashes out of the way
// with a moment of invulnerability. Loot is axe modifications; levelling up earns skill points for
// the Melee tree. Mod and skill names and every number here are placeholders to tune.

// ---------------------------------------------------------------------------
// Mods: one per slot. `stats` are fractions (0.12 = +12%).
const MOD_SLOTS = {
  melee: {
    head: { label: 'Axe Head', main: 'dmg', side: ['crit', 'reach'], elem: true },
    handle: { label: 'Handle', main: 'speed', side: ['reach', 'dmg'] },
    charm: { label: 'Charm', main: 'leech', side: ['crit', 'speed'] },
  },
};
const MOD_STATS = {
  dmg: { label: 'Damage', base: 0.1 },
  crit: { label: 'Crit damage', base: 0.12 },
  speed: { label: 'Swing speed', base: 0.1 },
  reach: { label: 'Reach', base: 0.08 },
  leech: { label: 'Health per hit', base: 0.012 }, // of max health
};
const MOD_NAMES = {
  head: ['Serrated', 'Hooked', 'Weighted', 'Bearded'], handle: ['Wrapped', 'Balanced', 'Long', 'Grip-Taped'],
  charm: ['Rabbit Foot', 'Bell', 'Lucky Die', 'Rubber Nose'],
};

function genMod(level, opts = {}) {
  const weapon = 'melee';
  const slot = opts.slot && MOD_SLOTS[weapon][opts.slot] ? opts.slot : pick(Object.keys(MOD_SLOTS[weapon]));
  const S = MOD_SLOTS[weapon][slot];
  const r = opts.rarity != null ? opts.rarity : rollRarity(opts.luck || 0);
  const lv = 1 + (level - 1) * 0.015; // later mods are a little stronger
  const roll = (k, mul) => +(MOD_STATS[k].base * mul * lv * rand(0.85, 1.15)).toFixed(3);
  const stats = { [S.main]: roll(S.main, 1 + r * 0.45) };
  if (r >= 1) stats[S.side[0]] = roll(S.side[0], 0.5 + r * 0.2);
  if (r >= 3) stats[S.side[1]] = roll(S.side[1], 0.5 + r * 0.2);
  const m = { id: _itemId++, kind: 'mod', weapon, slot, rarity: r, level, stats, element: 'none' };
  if (S.elem && Math.random() < [0.05, 0.15, 0.35, 0.55, 1][r]) {
    m.element = pick(['fire', 'shock', 'corrosive']);
    m.elemChance = +(0.12 + r * 0.05).toFixed(2);
  }
  m.name = (m.element !== 'none' ? ELEM[m.element].label + ' ' : '') + pick(MOD_NAMES[slot]) + ' ' + S.label;
  m.value = Math.round(15 * levelScale(level) * (1 + r * r * 0.8));
  return m;
}

// ---------------------------------------------------------------------------
// The Melee skill tree. Each rank costs one point; deeper tiers open at a player level.
const SKILL_TREES = {
  melee: {
    label: 'Melee',
    skills: [
      { id: 'mDmg', name: 'Heavy Swings', max: 5, tier: 1, desc: (r) => `+${8 * r}% axe damage` },
      { id: 'mSpeed', name: 'Quick Swings', max: 3, tier: 1, desc: (r) => `+${8 * r}% swing speed` },
      { id: 'mLeech', name: 'Bloodthirst', max: 3, tier: 1, desc: (r) => `Axe hits heal ${r}% of max health` },
      { id: 'mKick', name: 'Steel Toes', max: 3, tier: 1, desc: (r) => `Counters and kicks deal +${40 * r}% damage` },
      { id: 'mFinish', name: 'Finisher', max: 3, tier: 2, desc: (r) => `The third hit of a combo deals +${20 * r}% damage` },
      { id: 'mArmor', name: 'Thick Skin', max: 3, tier: 2, desc: (r) => `Take ${6 * r}% less damage` },
      { id: 'mExec', name: 'Executioner', max: 3, tier: 2, desc: (r) => `+${20 * r}% axe damage to enemies under 30% health` },
      { id: 'mFlow', name: 'Momentum', max: 1, tier: 2, desc: () => 'Hits in a row build up to +50% damage (instead of +25%)' },
      { id: 'mCap', name: 'Berserk', max: 1, tier: 3, desc: () => 'Axe kills give +25% axe damage and +20% move speed for 6 seconds' },
      { id: 'mCounter', name: 'Counter Master', max: 1, tier: 3, desc: () => 'Counters deal triple damage' },
    ],
  },
};
const SKILL_TIER_LEVEL = { 1: 1, 2: 5, 3: 10 };
const SKILL_BY_ID = {};
for (const t of Object.values(SKILL_TREES)) for (const s of t.skills) SKILL_BY_ID[s.id] = s;
const rank = (id) => (player.skills && player.skills[id]) || 0;
function canLearn(id) {
  const s = SKILL_BY_ID[id];
  return player.skillPoints > 0 && rank(id) < s.max && player.level >= SKILL_TIER_LEVEL[s.tier];
}
function learnSkill(id) {
  if (!canLearn(id)) return false;
  player.skills[id] = rank(id) + 1;
  player.skillPoints--;
  buildWeapons();
  SFX.levelUp();
  return true;
}
// Points spent on skills that no longer exist (the rifle tree, Cleave, Earthsplitter) come back.
function refundRetiredSkills() {
  for (const id of Object.keys(player.skills)) if (!SKILL_BY_ID[id]) { player.skillPoints += player.skills[id]; delete player.skills[id]; }
}
// Rifle mods from older saves are scrapped for cash.
function scrapRetiredMods() {
  let cash = 0;
  for (const m of Object.values(player.mods.ar || {})) if (m) cash += Math.round((m.value || 10) * 0.6);
  const keep = [];
  for (const m of player.stash) { if (m.weapon === 'melee') keep.push(m); else cash += Math.round((m.value || 10) * 0.6); }
  player.stash = keep;
  delete player.mods.ar;
  if (cash) { player.cash += cash; hud.log('Rifle mods scrapped: +$' + cash, '#9fff6a'); }
}

// ---------------------------------------------------------------------------
// The axe
const modSum = (w, k) => Object.values(player.mods[w] || {}).reduce((t, m) => t + ((m && m.stats[k]) || 0), 0);
const modElem = (w) => { for (const m of Object.values(player.mods[w] || {})) if (m && m.element !== 'none') return m; return null; };
const bestRarity = (w) => Math.max(0, ...Object.values(player.mods[w] || {}).map((m) => (m ? m.rarity : 0)));
const axeOf = () => player.weapons[0];

function buildWeapons() {
  const L = player.level, ls = levelScale(L);
  const buff = player.buffs && player.buffs.berserk > 0, frenzy = player.buffs && player.buffs.frenzy > 0 ? 1.3 : 1;
  const axe = {
    id: 'axe', kind: 'gun', type: 'melee', melee: true, model: 'axe', mfr: 'jakobs', label: 'Axe', name: 'Axe', level: L,
    rarity: bestRarity('melee'), ammo: null, auto: true, pellets: 1, special: null, kick: 0, zoom: 1, inMag: 1,
    damage: 70 * ls * (1 + modSum('melee', 'dmg') + rank('mDmg') * 0.08) * (buff ? 1.25 : 1) * frenzy,
    rate: 1.35 * (1 + modSum('melee', 'speed') + rank('mSpeed') * 0.08) * frenzy,
    reach: 2.5 * (1 + modSum('melee', 'reach')),
    critChance: 0.08 + modSum('melee', 'crit') * 0.5, crit: 1.8 * (1 + modSum('melee', 'crit')),
    leech: modSum('melee', 'leech') + rank('mLeech') * 0.01 + (frenzy > 1 ? 0.012 : 0),
    exec: rank('mExec') * 0.2, finisher: 1.0 + rank('mFinish') * 0.2, flowMax: rank('mFlow') ? 0.5 : 0.25,
    element: 'none',
  };
  const me = modElem('melee');
  if (me) { axe.element = me.element; axe.elemChance = me.elemChance + 0.15; axe.elemDps = axe.damage * 0.35; }
  axe.sub = 'Melee' + (axe.element !== 'none' ? ' · ' + ELEM[axe.element].label : '');
  player.weapons = [axe];
  player.cur = 0;
}

// Fit a mod in its slot; returns the one it replaces (or null).
function equipMod(m) {
  const mods = player.mods[m.weapon] || (player.mods[m.weapon] = {});
  const old = mods[m.slot] || null;
  mods[m.slot] = m;
  buildWeapons();
  return old;
}

// ---------------------------------------------------------------------------
// Moves. Each plays a stretch of one of the axe clips (js/topdown.js) - `start`, `hit`, `end` in
// clip seconds - over `dur` real seconds at base swing speed; `dmg` is its damage multiplier.
// A combo is three strikes; the third is a heavy finisher. Strikes chained within COMBO_WINDOW of
// each other continue the combo; otherwise a new one (a random string) starts.
const AXE_SET = {
  slash: { name: 'slash', clip: 'Standing Melee Combo Attack Ver. 3', start: 0.3, hit: 1.03, end: 1.35, dur: 0.55, dmg: 1, trail: [[0.86, 1.14]] },
  backhand: { name: 'backhand', clip: 'Standing Melee Combo Attack Ver. 3', start: 1.3, hit: 1.78, end: 2.25, dur: 0.55, dmg: 1, trail: [[1.58, 1.95]] },
  cleaver: { name: 'cleaver', clip: 'Standing Melee Combo Attack Ver. 2', start: 0.4, hit: 0.95, end: 1.3, dur: 0.52, dmg: 1, trail: [[0.75, 1.1]] },
  hook: { name: 'hook', clip: 'Standing Melee Combo Attack Ver. 2', start: 1.3, hit: 1.66, end: 1.95, dur: 0.45, dmg: 0.9, trail: [[1.5, 1.8]] },
  overhead: { name: 'overhead', clip: 'Standing Melee Combo Attack Ver. 2', start: 1.95, hit: 2.6, end: 3.2, dur: 0.78, dmg: 1.7, heavy: true, trail: [[2.3, 2.75]] },
  chop: { name: 'chop', clip: 'Standing Melee Attack Downward', start: 0.2, hit: 0.84, end: 1.3, dur: 0.72, dmg: 1.6, heavy: true, trail: [[0.58, 0.98]] },
  chop2: { name: 'chop2', clip: 'Standing Melee Attack Downward 2', start: 0.25, hit: 0.83, end: 1.35, dur: 0.72, dmg: 1.6, heavy: true, trail: [[0.6, 0.95]] },
  spin: { name: 'spin', clip: 'Standing Melee Attack 360 High', start: 0.3, hit: 1.08, end: 1.6, dur: 0.75, dmg: 1.6, heavy: true, trail: [[0.7, 1.35]] },
  // the gap-closer: a running leap onto a target a few strides away
  leap: { name: 'leap', clip: 'Standing Melee Run Jump Attack', start: 0.5, hit: 1.7, end: 2.35, dur: 0.85, dmg: 1.3, leap: true, trail: [[1.4, 1.85]] },
};
const AXE_COMBOS = [
  ['slash', 'backhand', 'overhead'], ['cleaver', 'hook', 'chop'], ['slash', 'cleaver', 'chop2'],
  ['backhand', 'hook', 'spin'], ['cleaver', 'slash', 'overhead'], ['hook', 'backhand', 'chop2'],
];
const COMBO_WINDOW = 0.75; // seconds after a strike ends to chain the next
const STRIKE_RANGE = 9; // how far a strike looks for a target (beyond reach, it leaps)
const axeMove = (step = player.combo || 0) => (player.leaping ? AXE_SET.leap : AXE_SET[(player.comboSeq || AXE_COMBOS[0])[step]]);
const AXE_COMBO = { get length() { return 3; } }; // (kept for older code that counts the moves)

// Who a strike goes to: the enemy nearest the direction you're pushing (if you are), else the one
// you're locked on to, else the nearest in front, else the nearest.
const _sv = new THREE.Vector3();
function strikeTarget() {
  const mx = input.touchMove.x + ((input.keys.KeyD || input.keys.ArrowRight) ? 1 : 0) - ((input.keys.KeyA || input.keys.ArrowLeft) ? 1 : 0);
  const mz = -input.touchMove.y - ((input.keys.KeyW || input.keys.ArrowUp) ? 1 : 0) + ((input.keys.KeyS || input.keys.ArrowDown) ? 1 : 0);
  const push = Math.hypot(mx, mz) > 0.3;
  let best = null, bs = Infinity;
  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = e.pos.x - player.pos.x, dz = e.pos.z - player.pos.z, d = Math.hypot(dx, dz);
    if (d > STRIKE_RANGE || Math.abs(e.pos.y - player.pos.y) > 2.5) continue;
    let s = d;
    if (push) s += (1 - (dx * mx + dz * mz) / (d * Math.hypot(mx, mz) || 1)) * 9; // the way you push
    else if (e === TD.lock) s -= 2.5; // stick with your target
    else s += (1 - (dx * -Math.sin(player.yaw) + dz * -Math.cos(player.yaw)) / (d || 1)) * 2.5; // in front
    if (s < bs && lineOfSight(aimEye(_sv), enemyCenter(e, new THREE.Vector3()))) { bs = s; best = e; }
  }
  return best;
}

function meleeSwing() {
  const g = axeOf();
  if (!g || player.meleeCd > 0 || player.kickT > 0 || player.dodgeT > 0 || !player.alive || player.downed || game.mode === 'hub') return false;
  const tgt = strikeTarget();
  if (tgt) TD.lock = tgt;
  player.strikeTarget = tgt;
  const dist = tgt ? Math.hypot(tgt.pos.x - player.pos.x, tgt.pos.z - player.pos.z) : 0;
  player.leaping = !!tgt && dist > g.reach + tgt.radius + 1.2;
  if (!player.leaping) {
    const chained = player.comboT > -COMBO_WINDOW && player.meleeT <= 0;
    player.combo = chained ? ((player.combo || 0) + 1) % 3 : 0;
    if (player.combo === 0) { const last = player.comboSeq; do player.comboSeq = pick(AXE_COMBOS); while (player.comboSeq === last); }
  } else player.combo = 0;
  const M = axeMove();
  const dur = M.dur * 1.35 / g.rate;
  player.meleeCd = dur * 0.9;
  player.meleeT = player.meleeDur = dur;
  player.meleeHitT = dur * (M.hit - M.start) / (M.end - M.start);
  player.meleeHit = false;
  SFX.chop(false);
  enemiesReactToSwing(g.reach); // some see it coming
  return true;
}
// The blow lands: on the target only, if it's still in reach (a dodge makes it miss).
function resolveMeleeHit() {
  const g = axeOf(), M = axeMove();
  const heavy = M.heavy || (player.combo || 0) === 2;
  let e = player.strikeTarget;
  const c = new THREE.Vector3();
  camBasis();
  _fwd.y = 0; _fwd.normalize();
  const inReach = (x) => {
    if (!x || !x.alive) return false;
    enemyCenter(x, c);
    const dx = c.x - player.pos.x, dz = c.z - player.pos.z, d = Math.hypot(dx, dz);
    return d < g.reach + x.radius + 0.4 && (dx * _fwd.x + dz * _fwd.z) / (d || 1) > 0.1;
  };
  if (!inReach(e)) {
    // no target (or it got away): the nearest enemy right in front instead, if any
    e = null; let bd = Infinity;
    for (const x of enemies) if (inReach(x)) { const d = x.pos.distanceTo(player.pos); if (d < bd) { bd = d; e = x; } }
  }
  if (!e) { player.whiffs = (player.whiffs || 0) + 1; return; }
  const flow = 1 + Math.min(player.flow || 0, 20) / 20 * g.flowMax;
  axeHit(e, g, M.dmg * flow * (heavy ? g.finisher : 1), heavy ? 12 : 6);
  player.flow = (player.flow || 0) + 1;
  player.flowT = 3;
  // a heavy blow staggers
  if (heavy && e.alive && !e.def.boss) { e.flinchT = Math.max(e.flinchT, 0.7); if (e.state === 'swing') e.state = 'move'; }
  SFX.chop(true);
  game.shake(heavy ? 0.4 : 0.18);
  game.hitstop = Math.max(game.hitstop, heavy ? 0.08 : 0.045);
}
function axeHit(e, g, mult, shove) {
  const crit = Math.random() < g.critChance;
  let dmg = g.damage * mult * (crit ? g.crit : 1);
  if (g.exec && e.hp < e.maxHp * 0.3) dmg *= 1 + g.exec;
  const dealt = damageEnemy(e, dmg, g.element, { crit, fromPlayer: true, dir: _fwd.clone() });
  player.stats.damage += dealt;
  if (crit) player.stats.crits++;
  if (g.elemChance && e.alive && Math.random() < g.elemChance) applyDot(e, g.element, g.elemDps);
  if (g.leech) player.heal(player.maxHp * g.leech);
  e.vel.addScaledVector(_fwd, shove);
  hud.hitMarker(crit, !e.alive);
  if (!e.alive) onPlayerKill('axe');
}

// COUNTER: when an enemy close by is about to strike (its "!" is up), knock it down and take no
// hit. With nobody to counter it's a kick, which shoves and staggers whoever is in front.
function counterThreat() {
  let best = null, bt = Infinity;
  for (const e of enemies) {
    if (!e.alive || !(e.threat > 0)) continue;
    const d = Math.hypot(e.pos.x - player.pos.x, e.pos.z - player.pos.z);
    if (d < 4.2 && e.threat < bt) { bt = e.threat; best = e; }
  }
  return best;
}
function counter() {
  const e = counterThreat();
  if (!e) return kick();
  if (player.kickCd > 0.6 || !player.alive || player.downed || game.mode === 'hub') return false;
  const g = axeOf(), k = rank('mKick');
  player.yaw = Math.atan2(-(e.pos.x - player.pos.x), -(e.pos.z - player.pos.z));
  player.meleeT = 0; player.kickCd = 0.35; player.kickT = player.kickDur = 0.42; player.kickHit = true; player.countered = true;
  player.invuln = Math.max(player.invuln, 0.45);
  camBasis(); _fwd.y = 0; _fwd.normalize();
  const dealt = damageEnemy(e, g.damage * 0.6 * (1 + k * 0.4) * (rank('mCounter') ? 3 : 1), 'none', { fromPlayer: true, dir: _fwd.clone() });
  player.stats.damage += dealt;
  e.threat = 0;
  if (e.alive && !e.def.boss) {
    e.vel.addScaledVector(_fwd, 9); e.vy = 3; e.grounded = false;
    if (e.rig) { e.state = 'down'; e.stateT = 1.6; rigOnce(e.rig, 'Getting Up', 1.3, 0, Infinity, 0.05); }
    e.attackCd = 1.5; e.engaged = false; e.backoffT = 0;
  } else if (e.alive) e.state = 'move';
  player.flow = (player.flow || 0) + 1; player.flowT = 3;
  hud.hitMarker(true, !e.alive);
  if (!e.alive) onPlayerKill('kick');
  hud.popText('COUNTER!', '#4fc6ff');
  SFX.hit(true); game.shake(0.35); game.hitstop = Math.max(game.hitstop, 0.12);
  return true;
}

// The kick: a front kick that shoves enemies back and staggers them.
function kick() {
  if (player.kickCd > 0 || (player.meleeT > 0 && !player.meleeHit) || !player.alive || player.downed || game.mode === 'hub') return false;
  player.meleeT = 0; // a kick cuts short the recovery of a swing that has landed
  player.kickCd = 1.1;
  player.kickT = player.kickDur = 0.42;
  player.kickHit = false; player.countered = false;
  SFX.swing();
  return true;
}
function resolveKick() {
  const g = axeOf(), k = rank('mKick');
  camBasis();
  _fwd.y = 0; _fwd.normalize();
  const c = new THREE.Vector3();
  let any = false;
  for (const e of enemies) {
    if (!e.alive) continue;
    enemyCenter(e, c);
    const d = c.clone().sub(aimEye()); d.y *= 0.3;
    if (d.length() > 2.4 + e.radius || d.normalize().dot(_fwd) < 0.5) continue;
    const dealt = damageEnemy(e, g.damage * 0.3 * (1 + k * 0.4), 'none', { fromPlayer: true, dir: _fwd.clone() });
    player.stats.damage += dealt;
    e.vel.addScaledVector(_fwd, 12 * (1 + k * 0.25));
    e.flinchT = Math.max(e.flinchT, 0.6); // staggered
    if (e.state === 'swing' && !e.def.boss) e.state = 'move';
    hud.hitMarker(false, !e.alive);
    if (!e.alive) onPlayerKill('kick');
    any = true;
    break; // one at a time
  }
  if (any) { SFX.hit(false); game.shake(0.25); game.hitstop = Math.max(game.hitstop, 0.04); }
}

// DODGE: a quick dash the way you're pushing (or away from whoever is closest), briefly untouchable.
function dodge() {
  if (player.dodgeCd > 0 || (player.meleeT > 0 && !player.meleeHit) || !player.alive || player.downed || game.mode === 'hub') return false;
  let dx = input.touchMove.x + ((input.keys.KeyD || input.keys.ArrowRight) ? 1 : 0) - ((input.keys.KeyA || input.keys.ArrowLeft) ? 1 : 0);
  let dz = -input.touchMove.y - ((input.keys.KeyW || input.keys.ArrowUp) ? 1 : 0) + ((input.keys.KeyS || input.keys.ArrowDown) ? 1 : 0);
  if (Math.hypot(dx, dz) < 0.3) {
    const e = counterThreat() || TD.lock;
    if (e && e.alive) { dx = player.pos.x - e.pos.x; dz = player.pos.z - e.pos.z; } else { dx = Math.sin(player.yaw); dz = Math.cos(player.yaw); }
  }
  const l = Math.hypot(dx, dz) || 1;
  player.dodgeDir = new THREE.Vector3(dx / l, 0, dz / l);
  player.meleeT = 0; player.kickT = 0;
  player.dodgeT = 0.26; player.dodgeCd = 0.6;
  player.invuln = Math.max(player.invuln, 0.34);
  SFX.swing();
  return true;
}

function updatePlayerMelee(dt) {
  player.meleeCd -= dt; player.kickCd -= dt; player.dodgeCd = (player.dodgeCd || 0) - dt;
  player.forceVel = null;
  if ((player.flowT = (player.flowT || 0) - dt) <= 0) player.flow = 0;
  if (player.dodgeT > 0) { player.dodgeT -= dt; player.forceVel = player.dodgeDir.clone().multiplyScalar(15); }
  if (player.meleeT > 0) {
    player.meleeT -= dt;
    // glide in to the target so the blow lands at reach (the leap covers the most ground)
    const e = player.strikeTarget;
    if (e && e.alive && !player.meleeHit) {
      const dx = e.pos.x - player.pos.x, dz = e.pos.z - player.pos.z, d = Math.hypot(dx, dz);
      const stop = axeOf().reach * 0.65 + e.radius, toHit = Math.max(0.06, player.meleeHitT - (player.meleeDur - player.meleeT));
      if (d > stop) { const v = Math.min((d - stop) / toHit, player.leaping ? 22 : 11); player.forceVel = new THREE.Vector3(dx / d * v, 0, dz / d * v); }
      else player.forceVel = new THREE.Vector3(0, 0, 0);
    } else if (!player.meleeHit) player.forceVel = new THREE.Vector3(-Math.sin(player.yaw) * 2, 0, -Math.cos(player.yaw) * 2);
    if (!player.meleeHit && player.meleeDur - player.meleeT >= player.meleeHitT) { player.meleeHit = true; resolveMeleeHit(); }
    if (player.meleeT <= 0) { player.comboT = 0; player.leaping = false; }
  } else player.comboT = (player.comboT || 0) - dt;
  if (player.kickT > 0) {
    player.kickT -= dt;
    if (!player.kickHit && player.kickDur - player.kickT >= player.kickDur * 0.4) { player.kickHit = true; resolveKick(); }
  }
}

// Kill-triggered skills.
function onPlayerKill(by) {
  player.buffs = player.buffs || {};
  if (rank('mCap')) { const was = player.buffs.berserk > 0; player.buffs.berserk = 6; if (!was) { buildWeapons(); hud.log('Berserk!', '#ff5a3a'); } }
}
function updateBuffs(dt) {
  if (!player.buffs) return;
  for (const k of ['berserk', 'frenzy']) {
    if (!(player.buffs[k] > 0)) continue;
    player.buffs[k] -= dt;
    if (player.buffs[k] <= 0) buildWeapons();
  }
}
const damageTakenScale = () => 1 - rank('mArmor') * 0.06;
const moveSpeedScale = () => (player.buffs && player.buffs.berserk > 0 ? 1.2 : 1);
// The shield grows with the player's level (shields aren't loot).
function levelShield() { return genShield(player.level, { rarity: 0, kind: 'standard' }); }

// ---------------------------------------------------------------------------
// Skill screen
function renderSkills() {
  $('skillPts').textContent = player.skillPoints === 1 ? '1 point to spend' : player.skillPoints + ' points to spend';
  const wrap = $('skillTrees');
  wrap.textContent = '';
  for (const T of Object.values(SKILL_TREES)) {
    const col = document.createElement('div');
    col.className = 'tree';
    col.innerHTML = `<div class="tree-title">${T.label}</div>`;
    for (const tier of [1, 2, 3]) {
      const row = document.createElement('div');
      row.className = 'tier';
      const need = SKILL_TIER_LEVEL[tier];
      if (tier > 1) row.dataset.label = player.level >= need ? '' : 'Level ' + need;
      for (const s of T.skills.filter((x) => x.tier === tier)) {
        const r = rank(s.id);
        const b = document.createElement('button');
        b.className = 'skill' + (r ? ' has' : '') + (canLearn(s.id) ? ' can' : '') + (player.level < need ? ' locked' : '');
        b.innerHTML = `<div class="sk-name"></div><div class="sk-rank">${r}/${s.max}</div><div class="sk-desc"></div>`;
        b.children[0].textContent = s.name;
        b.children[2].textContent = s.desc(Math.max(1, r));
        b.disabled = !canLearn(s.id);
        b.addEventListener('click', () => { if (learnSkill(s.id)) renderSkills(); });
        row.append(b);
      }
      col.append(row);
    }
    wrap.append(col);
  }
}
let skillsFrom = null;
function openSkills() {
  if (game.state !== 'play' && game.state !== 'paused') return;
  skillsFrom = game.state;
  game.state = 'paused';
  input.fire = false;
  if (document.pointerLockElement) document.exitPointerLock();
  renderSkills();
  show('skills');
}
function closeSkills() {
  if (typeof savePlayer === 'function' && campaign.save) savePlayer();
  if (skillsFrom === 'paused') { show('pause'); return; }
  game.state = 'play';
  show(null);
  lockPointer();
}

// ---------------------------------------------------------------------------
// Gear screen (decisions.md 2026-11-08): what's fitted to each weapon, and the bag of mods picked
// up but not fitted. Picking up a mod fits it when its slot is empty, otherwise it goes in the bag.
// From here a mod can be fitted (the one it replaces goes to the bag), taken off, or scrapped for cash.
const BAG_MAX = 30;
const WEAPON_LABEL = { melee: 'Axe' };
let gearFrom = null, gearSel = null; // gearSel: { mod, where: 'bag' | 'fitted' }
const scrapValue = (m) => Math.round((m.value || 10) * 0.6);
function takeMod(m) {
  const mods = player.mods[m.weapon] || (player.mods[m.weapon] = {});
  if (!mods[m.slot]) { equipMod(m); return 'fitted'; }
  if (player.stash.length >= BAG_MAX) return null;
  player.stash.push(m);
  return 'bag';
}
function gearFit(m) {
  const i = player.stash.indexOf(m);
  if (i < 0) return;
  player.stash.splice(i, 1);
  const old = equipMod(m);
  if (old) player.stash.push(old);
  SFX.pickup();
}
function gearUnfit(m) {
  if (player.stash.length >= BAG_MAX) { hud.log('Your bag is full', '#ff6a5a'); return; }
  delete player.mods[m.weapon][m.slot];
  buildWeapons();
  player.stash.push(m);
}
function gearScrap(m) {
  const i = player.stash.indexOf(m);
  if (i < 0) return;
  player.stash.splice(i, 1);
  player.cash += scrapValue(m);
  SFX.cash();
}
function renderGear() {
  const el = $('gearBody');
  el.textContent = '';
  const tile = (m, where, slotLabel) => {
    const b = document.createElement('button');
    b.className = 'gtile' + (m ? '' : ' empty') + (gearSel && gearSel.mod === m && m ? ' sel' : '');
    if (m) {
      b.style.borderColor = RARITY[m.rarity].css;
      const stat = Object.entries(m.stats).map(([k, v]) => (k === 'leech' ? '+' + (v * 100).toFixed(1) + '% ' : '+' + Math.round(v * 100) + '% ') + MOD_STATS[k].label.toLowerCase()).join(', ');
      b.innerHTML = `<i></i><b></b><small></small>`;
      b.children[0].textContent = slotLabel || (WEAPON_LABEL[m.weapon] + ' · ' + MOD_SLOTS[m.weapon][m.slot].label);
      b.children[1].textContent = m.name; b.children[1].style.color = RARITY[m.rarity].css;
      b.children[2].textContent = stat + (m.element !== 'none' ? ' · ' + ELEM[m.element].label : '');
      b.addEventListener('click', () => { gearSel = { mod: m, where }; renderGear(); });
    } else { b.innerHTML = `<i></i><b>empty</b>`; b.children[0].textContent = slotLabel; b.disabled = true; }
    return b;
  };
  for (const w of ['melee']) {
    const col = document.createElement('div');
    col.className = 'tree';
    col.innerHTML = `<div class="tree-title">${WEAPON_LABEL[w]}</div>`;
    const grid = document.createElement('div'); grid.className = 'gslots';
    for (const [slot, S] of Object.entries(MOD_SLOTS[w])) grid.append(tile(player.mods[w][slot], 'fitted', S.label));
    col.append(grid);
    el.append(col);
  }
  const bag = document.createElement('div');
  bag.className = 'tree bag';
  bag.innerHTML = `<div class="tree-title">Bag <span class="bagn">${player.stash.length} / ${BAG_MAX}</span></div>`;
  const grid = document.createElement('div'); grid.className = 'gslots';
  const sorted = player.stash.slice().sort((a, b) => b.rarity - a.rarity || (a.weapon > b.weapon ? 1 : -1));
  for (const m of sorted) grid.append(tile(m, 'bag'));
  if (!sorted.length) grid.innerHTML = '<div class="note">Mods you pick up for a filled slot go here.</div>';
  bag.append(grid);
  el.append(bag);
  // the selected mod: its card against what's fitted, and what can be done with it
  const det = $('gearDetail');
  if (!gearSel || (gearSel.where === 'bag' ? !player.stash.includes(gearSel.mod) : player.mods[gearSel.mod.weapon][gearSel.mod.slot] !== gearSel.mod)) gearSel = null;
  det.hidden = !gearSel;
  if (!gearSel) return;
  const m = gearSel.mod, cur = player.mods[m.weapon][m.slot];
  det.innerHTML = `<div class="card" style="border-color:${RARITY[m.rarity].css}">${itemCardHTML(m, gearSel.where === 'bag' ? cur : null)}</div><div class="row"></div>`;
  const row = det.children[1];
  const btn = (label, fn, alt) => { const b = document.createElement('button'); b.className = 'btn' + (alt ? ' alt' : ''); b.textContent = label; b.addEventListener('click', () => { fn(); renderGear(); }); row.append(b); };
  if (gearSel.where === 'bag') {
    btn(cur ? 'FIT (SWAP)' : 'FIT', () => { gearFit(m); gearSel = null; });
    btn('SCRAP $' + scrapValue(m), () => { gearScrap(m); gearSel = null; }, true);
  } else btn('TAKE OFF', () => { gearUnfit(m); gearSel = null; }, true);
  btn('CLOSE', () => { gearSel = null; }, true);
}
function openGear() {
  if (game.state !== 'play' && game.state !== 'paused') return;
  gearFrom = game.state;
  game.state = 'paused';
  input.fire = false;
  gearSel = null;
  renderGear();
  show('gear');
}
function closeGear() {
  if (typeof savePlayer === 'function' && campaign.save) savePlayer();
  if (gearFrom === 'paused') { show('pause'); return; }
  game.state = 'play';
  show(null);
}
