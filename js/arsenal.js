'use strict';
// The player's arsenal (docs/decisions.md, 2026-11-06): an assault rifle and an axe, toggled
// between, plus a kick. The axe swings in a three-move combo (slash, backhand, overhead chop).
// Loot is modifications for the rifle and the axe; levelling up earns skill points for the
// Assault Rifle and Melee trees. Both weapons are rebuilt from the player's level, fitted mods and
// learned skills whenever one of those changes. Mod and skill names and every number here are
// placeholders to tune.

// ---------------------------------------------------------------------------
// Mods: one per slot. `stats` are fractions (0.12 = +12%).
const MOD_SLOTS = {
  ar: {
    barrel: { label: 'Barrel', main: 'dmg', side: ['acc', 'crit'], elem: true },
    mag: { label: 'Magazine', main: 'mag', side: ['reload', 'dmg'] },
    optic: { label: 'Optic', main: 'crit', side: ['acc', 'adsAcc'] },
    stock: { label: 'Stock', main: 'recoil', side: ['rate', 'acc'] },
  },
  melee: {
    head: { label: 'Axe Head', main: 'dmg', side: ['crit', 'reach'], elem: true },
    handle: { label: 'Handle', main: 'speed', side: ['reach', 'dmg'] },
    charm: { label: 'Charm', main: 'leech', side: ['crit', 'speed'] },
  },
};
const MOD_STATS = {
  dmg: { label: 'Damage', base: 0.1 },
  acc: { label: 'Accuracy', base: 0.1 },
  mag: { label: 'Magazine size', base: 0.15 },
  reload: { label: 'Reload speed', base: 0.1 },
  adsAcc: { label: 'Aimed accuracy', base: 0.12 },
  recoil: { label: 'Recoil reduction', base: 0.15 },
  rate: { label: 'Fire rate', base: 0.07 },
  crit: { label: 'Crit damage', base: 0.12 },
  speed: { label: 'Swing speed', base: 0.1 },
  reach: { label: 'Reach', base: 0.08 },
  leech: { label: 'Health per hit', base: 0.012 }, // of max health
};
const MOD_NAMES = {
  barrel: ['Heavy', 'Rifled', 'Ported', 'Long'], mag: ['Extended', 'Drum', 'Quick-Release', 'Stacked'],
  optic: ['Red Dot', 'Holo', 'Marksman', 'Reflex'], stock: ['Padded', 'Braced', 'Skeleton', 'Folding'],
  head: ['Serrated', 'Hooked', 'Weighted', 'Bearded'], handle: ['Wrapped', 'Balanced', 'Long', 'Grip-Taped'],
  charm: ['Rabbit Foot', 'Bell', 'Lucky Die', 'Rubber Nose'],
};

function genMod(level, opts = {}) {
  const weapon = opts.weapon || (Math.random() < 0.55 ? 'ar' : 'melee');
  const slot = opts.slot || pick(Object.keys(MOD_SLOTS[weapon]));
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
  ar: {
    label: 'Assault Rifle',
    skills: [
      { id: 'arDmg', name: 'Hollow Points', max: 5, tier: 1, desc: (r) => `+${6 * r}% rifle damage` },
      { id: 'arAcc', name: 'Steady Hands', max: 5, tier: 1, desc: (r) => `+${8 * r}% rifle accuracy, -${8 * r}% recoil` },
      { id: 'arMag', name: 'Deep Pockets', max: 3, tier: 1, desc: (r) => `+${10 * r}% magazine size` },
      { id: 'arReload', name: 'Fast Hands', max: 3, tier: 2, desc: (r) => `+${10 * r}% reload speed` },
      { id: 'arRate', name: 'Trigger Happy', max: 3, tier: 2, desc: (r) => `+${6 * r}% fire rate` },
      { id: 'arCrit', name: 'Headhunter', max: 3, tier: 2, desc: (r) => `+${15 * r}% critical hit damage` },
      { id: 'arCap', name: 'Overdrive', max: 1, tier: 3, desc: () => 'Rifle kills give +30% fire rate and +15% damage for 5 seconds' },
    ],
  },
  melee: {
    label: 'Melee',
    skills: [
      { id: 'mDmg', name: 'Heavy Swings', max: 5, tier: 1, desc: (r) => `+${8 * r}% axe damage` },
      { id: 'mSpeed', name: 'Quick Swings', max: 3, tier: 1, desc: (r) => `+${8 * r}% swing speed` },
      { id: 'mLeech', name: 'Bloodthirst', max: 3, tier: 1, desc: (r) => `Axe hits heal ${r}% of max health` },
      { id: 'mKick', name: 'Steel Toes', max: 3, tier: 1, desc: (r) => `Kicks deal +${40 * r}% damage and shove ${25 * r}% further` },
      { id: 'mFinish', name: 'Finisher', max: 3, tier: 2, desc: (r) => `The combo's overhead chop deals +${20 * r}% damage` },
      { id: 'mArmor', name: 'Thick Skin', max: 3, tier: 2, desc: (r) => `Take ${6 * r}% less damage` },
      { id: 'mExec', name: 'Executioner', max: 3, tier: 2, desc: (r) => `+${20 * r}% axe damage to enemies under 30% health` },
      { id: 'mCleave', name: 'Cleave', max: 1, tier: 2, desc: () => 'Swings hit every enemy in the arc, not just the nearest' },
      { id: 'mCap', name: 'Berserk', max: 1, tier: 3, desc: () => 'Axe kills give +25% axe damage and +20% move speed for 6 seconds' },
      { id: 'mQuake', name: 'Earthsplitter', max: 1, tier: 3, desc: () => 'The overhead chop sends a shockwave that hits everyone close by' },
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
// Points spent on skills that no longer exist come back.
function refundRetiredSkills() {
  for (const id of Object.keys(player.skills)) if (!SKILL_BY_ID[id]) { player.skillPoints += player.skills[id]; delete player.skills[id]; }
}

// ---------------------------------------------------------------------------
// Building the weapons
const modSum = (w, k) => Object.values(player.mods[w] || {}).reduce((t, m) => t + ((m && m.stats[k]) || 0), 0);
const modElem = (w) => { for (const m of Object.values(player.mods[w] || {})) if (m && m.element !== 'none') return m; return null; };
const bestRarity = (w) => Math.max(0, ...Object.values(player.mods[w] || {}).map((m) => (m ? m.rarity : 0)));
const axeOf = () => player.weapons.find((w) => w && w.melee);

function buildWeapons() {
  const L = player.level, ls = levelScale(L);
  const old = player.weapons || [];
  // assault rifle
  const buffAr = player.buffs && player.buffs.overdrive > 0;
  const T = TYPES.ar;
  const ar = {
    id: 'ar', kind: 'gun', type: 'ar', model: 'ringmaster', mfr: 'vladof', label: 'Rifle', name: STARTER_AR.name, level: L,
    rarity: bestRarity('ar'), ammo: 'ar', auto: true, pellets: 1, zoom: T.zoom, special: null,
    damage: 14 * ls * T.dmg * (1 + modSum('ar', 'dmg') + rank('arDmg') * 0.06) * (buffAr ? 1.15 : 1),
    rate: T.rate * (1 + modSum('ar', 'rate') + rank('arRate') * 0.06) * (buffAr ? 1.3 : 1),
    mag: Math.round(T.mag * (1 + modSum('ar', 'mag') + rank('arMag') * 0.1)),
    reload: T.reload / (1 + modSum('ar', 'reload') + rank('arReload') * 0.1),
    spread: T.spread / (1 + modSum('ar', 'acc') + rank('arAcc') * 0.08),
    adsAcc: 1 + modSum('ar', 'adsAcc'),
    kick: T.kick * Math.max(0.3, 1 - modSum('ar', 'recoil') - rank('arAcc') * 0.08),
    crit: 2 * (1 + modSum('ar', 'crit') + rank('arCrit') * 0.15),
    element: 'none',
  };
  const ae = modElem('ar');
  if (ae) { ar.element = ae.element; ar.elemChance = ae.elemChance; ar.elemDps = ar.damage * 0.6 * (ae.element === 'fire' ? 1.2 : ae.element === 'shock' ? 1 : 0.8); ar.damage *= 0.92; }
  ar.sub = 'Assault rifle' + (ar.element !== 'none' ? ' · ' + ELEM[ar.element].label : '');
  const o = old.find((x) => x && x.id === 'ar');
  ar.inMag = o ? Math.min(o.inMag, ar.mag) : ar.mag;
  // axe
  const buff = player.buffs && player.buffs.berserk > 0;
  const axe = {
    id: 'axe', kind: 'gun', type: 'melee', melee: true, model: 'axe', mfr: 'jakobs', label: 'Axe', name: 'Axe', level: L,
    rarity: bestRarity('melee'), ammo: null, auto: true, pellets: 1, special: null, kick: 0, zoom: 1, inMag: 1,
    damage: 70 * ls * (1 + modSum('melee', 'dmg') + rank('mDmg') * 0.08) * (buff ? 1.25 : 1),
    rate: 1.35 * (1 + modSum('melee', 'speed') + rank('mSpeed') * 0.08),
    reach: 2.7 * (1 + modSum('melee', 'reach')),
    critChance: 0.08 + modSum('melee', 'crit') * 0.5, crit: 1.8 * (1 + modSum('melee', 'crit')),
    leech: modSum('melee', 'leech') + rank('mLeech') * 0.01,
    exec: rank('mExec') * 0.2, cleave: rank('mCleave') > 0, finisher: 1.7 + rank('mFinish') * 0.2, quake: rank('mQuake') > 0,
    element: 'none',
  };
  const me = modElem('melee');
  if (me) { axe.element = me.element; axe.elemChance = me.elemChance + 0.15; axe.elemDps = axe.damage * 0.35; }
  axe.sub = 'Melee' + (axe.element !== 'none' ? ' · ' + ELEM[axe.element].label : '');
  player.weapons = [ar, axe];
  if (!(player.cur >= 0 && player.cur < 2)) player.cur = 0;
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
// Swinging: a three-move combo. Swinging again soon after a swing ends moves on to the next move;
// waiting starts over. Each move has its own length, the moment it lands, its arc and its damage.
const AXE_COMBO = [
  { name: 'slash', len: 1.0, hit: 0.42, arc: 0.45, dmg: 1 }, // diagonal, upper right to lower left
  { name: 'backhand', len: 0.95, hit: 0.4, arc: 0.25, dmg: 1 }, // flat, left to right: a wide arc
  { name: 'chop', len: 1.3, hit: 0.5, arc: 0.55, dmg: 0 }, // overhead finisher (damage from the axe's finisher)
];
const COMBO_WINDOW = 0.65; // seconds after a swing ends to chain the next
function meleeSwing() {
  const g = player.gun();
  if (!g || !g.melee) return false;
  if (!g || player.meleeCd > 0 || player.kickT > 0 || !player.alive || player.downed || game.mode === 'hub') return false;
  const chained = player.comboT > -COMBO_WINDOW && player.meleeT <= 0;
  player.combo = chained ? ((player.combo || 0) + 1) % AXE_COMBO.length : 0;
  const M = AXE_COMBO[player.combo];
  const dur = clamp(0.62 / g.rate * 1.35, 0.32, 0.6) * M.len;
  player.meleeCd = dur * 0.92;
  player.meleeT = player.meleeDur = dur;
  player.meleeHitT = dur * M.hit;
  player.meleeHit = false;
  SFX.chop(false);
  return true;
}
function resolveMeleeHit() {
  const g = axeOf(), M = AXE_COMBO[player.combo || 0];
  const finisher = M.name === 'chop';
  camBasis();
  _fwd.y = 0; _fwd.normalize(); // swings and kicks sweep level
  const c = new THREE.Vector3(), hits = [];
  for (const e of enemies) {
    if (!e.alive) continue;
    enemyCenter(e, c);
    const d = c.clone().sub(aimEye()); d.y *= 0.3;
    const dist = d.length();
    if (dist > g.reach + e.radius) continue;
    if (d.normalize().dot(_fwd) < (g.cleave ? Math.min(0.2, M.arc) : M.arc)) continue;
    hits.push([dist, e]);
  }
  hits.sort((a, b) => a[0] - b[0]);
  // the backhand sweeps through two; Cleave hits everything in the arc
  const targets = g.cleave ? hits : hits.slice(0, M.name === 'backhand' ? 2 : 1);
  for (const [, e] of targets) axeHit(e, g, finisher ? g.finisher : M.dmg, finisher ? 14 : 9);
  // Earthsplitter: the chop's shockwave
  if (finisher && g.quake) {
    const at = player.pos.clone().addScaledVector(_fwd.clone().setY(0).normalize(), 1.8);
    at.y = groundAt(at.x, at.z);
    ringFx(at, 4.5, 0xc9a070, 0.4);
    burst(at.clone().setY(at.y + 0.2), 0xc9a070, 18, 6, 0.14, 0.6, 0.5);
    for (const e of enemies) if (e.alive && !targets.some(([, t]) => t === e) && e.pos.distanceTo(at) < 4.5) axeHit(e, g, 0.6, 7);
  }
  if (targets.length) {
    SFX.chop(true);
    game.shake(finisher ? 0.45 : 0.22);
    game.hitstop = Math.max(game.hitstop, finisher ? 0.09 : 0.05);
  } else if (finisher) { game.shake(0.12); }
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

// The kick: a front kick that shoves enemies back and staggers them.
function kick() {
  if (player.kickCd > 0 || (player.meleeT > 0 && !player.meleeHit) || !player.alive || player.downed || game.mode === 'hub') return false;
  player.meleeT = 0; // a kick cuts short the recovery of a swing that has landed
  player.kickCd = 1.1;
  player.kickT = player.kickDur = 0.42;
  player.kickHit = false;
  SFX.swing();
  return true;
}
function resolveKick() {
  const g = axeOf(), k = rank('mKick');
  camBasis();
  _fwd.y = 0; _fwd.normalize(); // swings and kicks sweep level
  const c = new THREE.Vector3();
  let any = false;
  for (const e of enemies) {
    if (!e.alive) continue;
    enemyCenter(e, c);
    const d = c.clone().sub(aimEye()); d.y *= 0.3;
    if (d.length() > 2.4 + e.radius || d.normalize().dot(_fwd) < 0.5) continue;
    const dealt = damageEnemy(e, g.damage * 0.35 * (1 + k * 0.4), 'none', { fromPlayer: true, dir: _fwd.clone() });
    player.stats.damage += dealt;
    e.vel.addScaledVector(_fwd.clone().setY(0).normalize(), 15 * (1 + k * 0.25));
    e.flinchT = Math.max(e.flinchT, 0.6); // staggered
    // a kick breaks an attack (a leap in the air can't be stopped) and knocks a body off its feet
    if (e.alive && !e.def.boss && e.state !== 'leap') {
      if (e.grounded) { e.vy = 3.5; e.grounded = false; }
      if (e.rig && e.state !== 'down') { e.state = 'down'; e.stateT = 1.5; rigOnce(e.rig, 'Getting Up', 1.4, 0, Infinity, 0.05); }
      else if (e.state === 'swing') e.state = 'move';
    }
    hud.hitMarker(false, !e.alive);
    if (!e.alive) onPlayerKill('kick');
    any = true;
  }
  if (any) { SFX.hit(false); game.shake(0.25); game.hitstop = Math.max(game.hitstop, 0.04); }
}
function updatePlayerMelee(dt) {
  player.meleeCd -= dt; player.kickCd -= dt;
  if (player.meleeT > 0) {
    player.meleeT -= dt;
    if (!player.meleeHit && player.meleeDur - player.meleeT >= player.meleeHitT) { player.meleeHit = true; resolveMeleeHit(); }
    if (player.meleeT <= 0) player.comboT = 0;
  } else player.comboT = (player.comboT || 0) - dt;
  if (player.kickT > 0) {
    player.kickT -= dt;
    if (!player.kickHit && player.kickDur - player.kickT >= player.kickDur * 0.4) { player.kickHit = true; resolveKick(); }
  }
}

// Kill-triggered skills.
function onPlayerKill(by) {
  player.buffs = player.buffs || {};
  if (by === 'ar' && rank('arCap')) { const was = player.buffs.overdrive > 0; player.buffs.overdrive = 5; if (!was) { buildWeapons(); hud.log('Overdrive!', '#ffd23a'); } return; }
  if (by !== 'ar' && rank('mCap')) { const was = player.buffs.berserk > 0; player.buffs.berserk = 6; if (!was) { buildWeapons(); hud.log('Berserk!', '#ff5a3a'); } }
}
function updateBuffs(dt) {
  if (!player.buffs) return;
  for (const k of ['berserk', 'overdrive']) {
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
