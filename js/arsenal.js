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
// The levelling tree (decisions.md 2026-11-11, the creator's design). One point per level up; each
// rank costs a point.
//  - Axe (from the first level up): Melee Swings +3% axe damage per rank, Quick Swing +3% swing
//    speed per rank, 5 ranks each.
//  - Rampage Psychosis (level 5): a cooldown skill (RAMPAGE button / R): for RAGE_TIME seconds
//    the axe deals +20% damage and swings 25% faster, on top of everything else.
//  - Under Rampage (once it's unlocked; they work while it's active): Fire Axe (hits set enemies
//    burning for 3/7/12% of the hit's damage per second), Knockout (20/25/30% chance a hit kills
//    outright; a Star loses half its health, bosses are immune), Damage Reduction (5/10/20% less
//    damage taken).
//  - The next tree opens once two Rampage skills are fully upgraded (not designed yet).
// The Rampage timings are placeholders the creator hasn't set.
const RAGE_TIME = 10, RAGE_COOLDOWN = 45;
const SKILL_TREES = {
  axe: {
    label: 'Axe', note: 'from your first level up',
    skills: [
      { id: 'lvDmg', name: 'Melee Swings', max: 5, desc: (r) => `+${3 * r}% axe damage`, req: () => (player.level >= 2 || TESTER.on ? null : 'Level 2') },
      { id: 'lvSpeed', name: 'Quick Swing', max: 5, desc: (r) => `+${3 * r}% axe swing speed`, req: () => (player.level >= 2 || TESTER.on ? null : 'Level 2') },
    ],
  },
  rage: {
    label: 'Cooldown skill', note: 'unlocks at level 5',
    skills: [
      { id: 'rampage', name: 'Rampage Psychosis', max: 1, desc: () => `For ${RAGE_TIME}s: +20% axe damage and +25% swing speed on top of everything else (${RAGE_COOLDOWN}s cooldown). RAMPAGE button / R.`, req: () => (player.level >= 5 || TESTER.on ? null : 'Level 5') },
    ],
  },
  rageSkills: {
    label: 'While Rampage Psychosis is active', note: 'unlock Rampage Psychosis first',
    skills: [
      { id: 'rFire', name: 'Fire Axe', max: 3, desc: (r) => `Hits set enemies burning for ${[3, 7, 12][r - 1]}% of the hit's damage per second`, req: () => (rank('rampage') ? null : 'Rampage Psychosis') },
      { id: 'rKO', name: 'Knockout', max: 3, desc: (r) => `${[20, 25, 30][r - 1]}% chance a hit kills outright (a Star loses half its health; not bosses)`, req: () => (rank('rampage') ? null : 'Rampage Psychosis') },
      { id: 'rArmor', name: 'Damage Reduction', max: 3, desc: (r) => `Take ${[5, 10, 20][r - 1]}% less damage from enemies`, req: () => (rank('rampage') ? null : 'Rampage Psychosis') },
    ],
  },
};
const SKILL_BY_ID = {};
for (const t of Object.values(SKILL_TREES)) for (const s of t.skills) SKILL_BY_ID[s.id] = s;
const rank = (id) => (player.skills && player.skills[id]) || 0;
// the next tree: two Rampage skills at full rank
const nextTreeOpen = () => ['rFire', 'rKO', 'rArmor'].filter((id) => rank(id) >= 3).length >= 2;
function canLearn(id) {
  const s = SKILL_BY_ID[id];
  return player.skillPoints > 0 && rank(id) < s.max && !s.req();
}
// Tester mode (pause menu): try the tree without levelling: level locks are off, Rampage has no
// cooldown, and the skill screen can add points, level up and reset the tree. Kept on this device.
const TESTER = { on: (() => { try { return localStorage.getItem('su-tester') === '1'; } catch (e) { return false; } })() };
function setTester(on) { TESTER.on = on; try { localStorage.setItem('su-tester', on ? '1' : '0'); } catch (e) {} }
function resetSkills() {
  let n = 0;
  for (const id of Object.keys(player.skills)) n += player.skills[id];
  player.skills = {}; player.skillPoints += n;
  if (player.buffs) player.buffs.rampage = 0;
  player.rageCd = 0;
  buildWeapons();
}
// Rampage Psychosis: start it (if learned and off cooldown)
function rampage() {
  if (!rank('rampage') || !player.alive || game.mode === 'hub') return false;
  if ((player.rageCd || 0) > 0 && !TESTER.on) return false;
  player.buffs = player.buffs || {};
  player.buffs.rampage = RAGE_TIME; player.rageCd = RAGE_TIME + RAGE_COOLDOWN;
  buildWeapons();
  hud.popText('RAMPAGE!', '#ff3b2a'); game.shake(0.25); SFX.levelUp();
  return true;
}
const raging = () => !!(player.buffs && player.buffs.rampage > 0);
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
  const rage = player.buffs && player.buffs.rampage > 0; // Rampage Psychosis: +20% damage, +25% swing speed
  const buff = player.buffs && player.buffs.berserk > 0, frenzy = player.buffs && player.buffs.frenzy > 0 ? 1.3 : 1;
  const axe = {
    id: 'axe', kind: 'gun', type: 'melee', melee: true, model: 'axe', mfr: 'jakobs', label: 'Axe', name: 'Axe', level: L,
    rarity: bestRarity('melee'), ammo: null, auto: true, pellets: 1, special: null, kick: 0, zoom: 1, inMag: 1,
    damage: 70 * ls * (1 + modSum('melee', 'dmg') + rank('lvDmg') * 0.03) * (buff ? 1.25 : 1) * frenzy * (rage ? 1.2 : 1),
    rate: 1.35 * (1 + modSum('melee', 'speed') + rank('lvSpeed') * 0.03) * frenzy * (rage ? 1.25 : 1),
    reach: 2.5 * (1 + modSum('melee', 'reach')),
    critChance: 0.08 + modSum('melee', 'crit') * 0.5, crit: 1.8 * (1 + modSum('melee', 'crit')),
    leech: modSum('melee', 'leech') + (frenzy > 1 ? 0.012 : 0),
    exec: 0, finisher: 1.0, flowMax: 0.25,
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
// clip seconds, wind-up and follow-through included - at about 1.5x the clip's own speed (faster
// with swing-speed mods and skills); `dmg` is its damage multiplier. A combo is three strikes, the
// third a heavy finisher. Combos mostly follow the clips as they were animated (the two-blow and
// three-blow combo clips play straight through), so a combo looks like the uploaded animation.
// Strikes chained within COMBO_WINDOW continue the combo, and a strike pressed during a swing is
// queued and starts as the swing ends.
const AXE_SET = {
  slash: { name: 'slash', clip: 'Standing Melee Combo Attack Ver. 3', start: 0.15, hit: 1.03, end: 1.35, dmg: 1, trail: [[0.82, 1.15]] },
  backhand: { name: 'backhand', clip: 'Standing Melee Combo Attack Ver. 3', start: 1.35, hit: 1.78, end: 2.45, dmg: 1.1, trail: [[1.56, 1.98]] },
  cleaver: { name: 'cleaver', clip: 'Standing Melee Combo Attack Ver. 2', start: 0.15, hit: 0.95, end: 1.3, dmg: 1, trail: [[0.72, 1.12]] },
  hook: { name: 'hook', clip: 'Standing Melee Combo Attack Ver. 2', start: 1.3, hit: 1.66, end: 1.95, dmg: 0.9, trail: [[1.48, 1.82]] },
  overhead: { name: 'overhead', clip: 'Standing Melee Combo Attack Ver. 2', start: 1.95, hit: 2.6, end: 3.4, dmg: 1.7, heavy: true, trail: [[2.28, 2.78]] },
  chop: { name: 'chop', clip: 'Standing Melee Attack Downward', start: 0.05, hit: 0.84, end: 1.5, dmg: 1.6, heavy: true, trail: [[0.56, 1.0]] },
  chop2: { name: 'chop2', clip: 'Standing Melee Attack Downward 2', start: 0.1, hit: 0.83, end: 1.5, dmg: 1.6, heavy: true, trail: [[0.58, 0.98]] },
  spin: { name: 'spin', clip: 'Standing Melee Attack 360 High', start: 0.2, hit: 1.08, end: 1.75, dmg: 1.6, heavy: true, trail: [[0.68, 1.36]] },
  // the gap-closer: a running leap onto a target a few strides away
  leap: { name: 'leap', clip: 'Standing Melee Run Jump Attack', start: 0.35, hit: 1.7, end: 2.5, dmg: 1.3, leap: true, trail: [[1.38, 1.88]] },
  // Rampage Psychosis: the sword's moves, from the uploaded Great Sword clips (2026-11-11). The Slash
  // clip holds two blows (0.8 s and 1.77 s), Slide Attack lands at 1.2 s, Jump Attack at 1.1 s.
  gs1: { name: 'sword slash', clip: 'Great Sword Slash', start: 0.3, hit: 0.8, end: 1.25, dmg: 1.1, trail: [[0.6, 0.95]] },
  gs2: { name: 'sword cut', clip: 'Great Sword Slash', start: 1.25, hit: 1.77, end: 2.45, dmg: 1.2, trail: [[1.55, 1.95]] },
  gsSlide: { name: 'slide attack', clip: 'Great Sword Slide Attack', start: 0.45, hit: 1.2, end: 1.8, dmg: 1.7, heavy: true, trail: [[0.95, 1.35]] },
  gsJump: { name: 'jump attack', clip: 'Great Sword Jump Attack', start: 0.25, hit: 1.1, end: 1.85, dmg: 1.8, heavy: true, trail: [[0.85, 1.25]] },
  gsLeap: { name: 'jump attack', clip: 'Great Sword Jump Attack', start: 0.25, hit: 1.1, end: 1.85, dmg: 1.3, leap: true, trail: [[0.85, 1.25]] },
};
const SWORD_COMBOS = [['gs1', 'gs2', 'gsSlide'], ['gs1', 'gs2', 'gsJump']];
const AXE_PLAY = 1.5; // clip seconds per real second at base swing speed
const AXE_COMBOS = [
  ['cleaver', 'hook', 'overhead'], // the three-blow combo clip, straight through
  ['slash', 'backhand', 'chop2'], ['slash', 'backhand', 'overhead'], ['cleaver', 'hook', 'chop'],
  ['slash', 'backhand', 'spin'], ['cleaver', 'hook', 'chop2'],
];
const COMBO_WINDOW = 0.9; // seconds after a strike ends to chain the next
const STRIKE_RANGE = 9; // how far a strike looks for a target (beyond reach, it leaps)
const TAKEDOWN_FLOW = 8;
// (during Rampage Psychosis the sword's moves: its own leap, takedown and combos)
const axeMove = (step = player.combo || 0) => (player.leaping ? AXE_SET[raging() ? 'gsLeap' : 'leap'] : player.takedown ? AXE_SET[raging() ? 'gsJump' : 'overhead'] : AXE_SET[(player.comboSeq || AXE_COMBOS[0])[step]]);
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
  player.leaping = !!tgt && dist > g.reach + tgt.radius + 2.6; // a few strides away: leap onto them
  if (!player.leaping) {
    const chained = player.comboT > -COMBO_WINDOW && player.meleeT <= 0 && player.comboSeq && !player.wasLeap;
    player.combo = chained ? ((player.combo || 0) + 1) % 3 : 0;
    if (player.combo === 0) { const set = raging() ? SWORD_COMBOS : AXE_COMBOS, last = player.comboSeq; do player.comboSeq = pick(set); while (player.comboSeq === last); }
  } else player.combo = 0;
  player.wasLeap = player.leaping;
  // a takedown when 8 hits are flowing: the next strike on a regular enemy kills it outright
  player.takedown = (player.flow || 0) >= TAKEDOWN_FLOW && !!tgt && !tgt.def.boss;
  const M = axeMove();
  let dur = (M.end - M.start) / AXE_PLAY * 1.35 / g.rate;
  if (player.riposteT > 0) { dur *= 0.72; player.riposteT = 0; } // the riposte after a counter is quick
  player.meleeCd = dur * 0.6; // once the blow has landed, the next strike may cut the follow-through short
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
  if (!e) {
    // a miss breaks the flow (if there was anyone to hit)
    if ((player.flow || 0) > 0 && enemies.some((x) => x.alive && x.pos.distanceTo(player.pos) < 7)) { player.flow = 0; hud.popText('MISS', '#c8c0b4'); }
    player.takedown = false;
    return;
  }
  if (player.takedown) {
    // TAKEDOWN: a regular enemy dies on the spot; a Star loses half its health
    player.takedown = false;
    player.flow -= TAKEDOWN_FLOW; player.flowT = 3.5;
    const dmg = e.star ? e.maxHp * 0.5 : e.hp + e.shield + 1;
    _fwd.set(e.pos.x - player.pos.x, 0, e.pos.z - player.pos.z).normalize();
    player.stats.damage += damageEnemy(e, dmg, g.element, { crit: true, fromPlayer: true, dir: _fwd.clone(), overkill: true });
    for (let i = 0; i < 3; i++) bloodSplat(e.pos, 1.6, i ? 'spatter' : 'pool');
    hud.popText('TAKEDOWN!', '#ff3b2a'); hud.hitMarker(true, !e.alive);
    if (!e.alive) onPlayerKill('axe');
    game.slowmo = Math.max(game.slowmo, 0.6); game.shake(0.6); game.hitstop = Math.max(game.hitstop, 0.12);
    SFX.chop(true);
    return;
  }
  const flow = 1 + Math.min(player.flow || 0, 20) / 20 * g.flowMax;
  axeHit(e, g, M.dmg * flow * (heavy ? g.finisher : 1), heavy ? 12 : 6);
  player.flow = (player.flow || 0) + 1;
  player.flowT = 3.5;
  // a heavy blow staggers
  if (heavy && e.alive && !e.def.boss) { e.flinchT = Math.max(e.flinchT, 0.7); if (e.state === 'swing') e.state = 'move'; }
  SFX.chop(true);
  game.shake(heavy ? 0.4 : 0.18);
  game.hitstop = Math.max(game.hitstop, heavy ? 0.08 : 0.045);
}
function axeHit(e, g, mult, shove) {
  // an opening: hits on a stunned enemy always crit and hit harder; on one that's down, harder still
  const open = e.state === 'stun', down = e.state === 'down';
  if (open) mult *= 1.5; else if (down) mult *= 1.6;
  const crit = open || Math.random() < g.critChance;
  let dmg = g.damage * mult * (crit ? g.crit : 1);
  if (g.exec && e.hp < e.maxHp * 0.3) dmg *= 1 + g.exec;
  const dealt = damageEnemy(e, dmg, g.element, { crit, fromPlayer: true, dir: _fwd.clone() });
  player.stats.damage += dealt;
  if (crit) player.stats.crits++;
  if (g.elemChance && e.alive && Math.random() < g.elemChance) applyDot(e, g.element, g.elemDps);
  if (g.leech) player.heal(player.maxHp * g.leech);
  if (raging() && e.alive) {
    // Fire Axe: a burn for a share of the hit's damage per second
    const fr = rank('rFire');
    if (fr) applyDot(e, 'fire', dealt * [0.03, 0.07, 0.12][fr - 1]);
    // Knockout: a chance the hit kills outright (a Star loses half its health; bosses are immune)
    const ko = rank('rKO');
    if (ko && !e.def.boss && Math.random() < [0.2, 0.25, 0.3][ko - 1]) {
      const extra = e.star ? e.maxHp * 0.5 : e.hp + (e.shield || 0) + 1;
      player.stats.damage += damageEnemy(e, extra, 'none', { crit: true, fromPlayer: true, dir: _fwd.clone(), overkill: true });
      hud.popText('KNOCKOUT!', '#ffd23a');
    }
  }
  e.vel.addScaledVector(_fwd, shove);
  hud.hitMarker(crit, !e.alive);
  if (!e.alive) onPlayerKill('axe');
}

// COUNTER: when enemies close by are about to strike with a yellow "!", knock every one of them
// down at once (a double or triple counter when a pincer comes) and take no hit; the next strike is
// a quick riposte. A red "!!" can't be countered - that one has to be dodged. With nothing to
// counter it's a kick.
const threatsNear = (r, counterable) => enemies.filter((e) => e.alive && e.threat > 0 && (!counterable || !e.unblockable) && Math.hypot(e.pos.x - player.pos.x, e.pos.z - player.pos.z) < r);
function counterThreat() {
  let best = null, bt = Infinity;
  for (const e of threatsNear(4.2, true)) if (e.threat < bt) { bt = e.threat; best = e; }
  return best;
}
const dangerThreat = () => threatsNear(4.6, false).find((e) => e.unblockable) || null;
function counter() {
  if (!player.alive || player.downed || game.mode === 'hub') return false;
  const list = threatsNear(4.2, true).sort((a, b) => a.threat - b.threat).slice(0, 3);
  if (!list.length) {
    if (dangerThreat()) { hud.popText("CAN'T COUNTER: DODGE!", '#ff3b2a'); SFX.deny(); return false; }
    return kick();
  }
  if (player.kickCd > 0.6) return false;
  const g = axeOf(), k = 0;
  const e0 = list[0];
  player.yaw = Math.atan2(-(e0.pos.x - player.pos.x), -(e0.pos.z - player.pos.z));
  player.meleeT = 0; player.kickCd = 0.35; player.kickT = player.kickDur = 0.42; player.kickHit = true; player.countered = true;
  player.invuln = Math.max(player.invuln, 0.5);
  for (const e of list) {
    _fwd.set(e.pos.x - player.pos.x, 0, e.pos.z - player.pos.z).normalize();
    const dealt = damageEnemy(e, g.damage * 0.6 * (1 + k * 0.4) * 1, 'none', { fromPlayer: true, dir: _fwd.clone() });
    player.stats.damage += dealt;
    e.threat = 0;
    if (e.alive && !e.def.boss) {
      e.vel.addScaledVector(_fwd, 9); e.vy = 3; e.grounded = false;
      if (e.rig) { e.state = 'down'; e.stateT = 1.8; rigOnce(e.rig, 'Getting Up', 1.2, 0, Infinity, 0.05); }
      e.attackCd = 1.8; e.engaged = false; e.backoffT = 0;
    } else if (e.alive) e.state = 'move';
    if (!e.alive) onPlayerKill('kick');
  }
  player.flow = (player.flow || 0) + list.length; player.flowT = 3.5;
  player.riposteT = 1.5; // the next strike comes quick
  hud.hitMarker(true, false);
  hud.popText(['COUNTER!', 'DOUBLE COUNTER!', 'TRIPLE COUNTER!'][list.length - 1], '#4fc6ff');
  if (list.length > 1) { player.addXp(5 * list.length); game.slowmo = Math.max(game.slowmo, 0.3); }
  SFX.hit(true); game.shake(0.35 + list.length * 0.1); game.hitstop = Math.max(game.hitstop, 0.12);
  return true;
}
// A stunned enemy: dazed for a moment, its attack dropped, wide open (hits on it crit).
function stunEnemy(e, t) {
  e.threat = 0;
  if (e.def.boss) { if (e.state === 'swing' || e.state === 'charge') e.state = 'move'; return; }
  e.state = 'stun'; e.stateT = t; e.engaged = false; e.attackCd = t + 0.6; e.backoffT = 0;
  e.vel.x *= 0.2; e.vel.z *= 0.2;
  if (e.rig) rigOnce(e.rig, 'Hit Reaction headshot', 0.75, 0, Infinity, 0.05);
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
  const g = axeOf(), k = 0;
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
// The dodge roll: how long it lasts and how fast it carries you (about 4.3 m).
const DODGE_TIME = 0.6, DODGE_SPEED = 7.8;
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
  // a perfect dodge: right before a blow lands (any blow, red or yellow). Time slows, and whoever
  // swung is left stunned and open.
  const late = threatsNear(4.8, false).filter((e) => e.threat < 0.42);
  if (late.length) {
    for (const e of late) stunEnemy(e, 1.7);
    game.slowmo = Math.max(game.slowmo, 0.5);
    player.invuln = Math.max(player.invuln, 0.7);
    player.flow = (player.flow || 0) + late.length + (late.some((e) => e.unblockable) ? 1 : 0); player.flowT = 3.5;
    player.addXp(4 * late.length);
    hud.popText('PERFECT DODGE!', '#9fff6a');
    SFX.shieldUp();
  }
  player.meleeT = 0; player.kickT = 0;
  // a forward roll (the uploaded Stand To Roll clip, 2026-11-10): the body turns to roll the way it goes
  player.yaw = Math.atan2(-player.dodgeDir.x, -player.dodgeDir.z);
  player.dodgeT = DODGE_TIME; player.dodgeCd = 0.75;
  player.invuln = Math.max(player.invuln, 0.5);
  SFX.swing();
  return true;
}

function updatePlayerMelee(dt) {
  player.meleeCd -= dt; player.kickCd -= dt; player.dodgeCd = (player.dodgeCd || 0) - dt; player.riposteT = (player.riposteT || 0) - dt;
  player.forceVel = null;
  if ((player.flowT = (player.flowT || 0) - dt) <= 0) player.flow = 0;
  if (player.dodgeT > 0) { player.dodgeT -= dt; const k = player.dodgeT / DODGE_TIME; player.forceVel = player.dodgeDir.clone().multiplyScalar(DODGE_SPEED * (k < 0.2 ? 0.4 + k * 3 : 1)); } // eases off as the roll comes up
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
    // a strike pressed during this one: start it once the blow has landed and the follow-through is underway
    else if (player.strikeQueued && player.meleeHit && player.meleeCd <= 0) { player.strikeQueued = false; player.meleeT = 0; player.comboT = 0; player.leaping = false; meleeSwing(); }
  } else {
    player.comboT = (player.comboT || 0) - dt;
    if (player.strikeQueued) { player.strikeQueued = false; meleeSwing(); }
  }
  if (player.kickT > 0) {
    player.kickT -= dt;
    if (!player.kickHit && player.kickDur - player.kickT >= player.kickDur * 0.4) { player.kickHit = true; resolveKick(); }
  }
}

// Kill-triggered skills.
function onPlayerKill(by) {
  player.buffs = player.buffs || {};
}
function updateBuffs(dt) {
  if (!player.buffs) return;
  if (player.rageCd > 0) player.rageCd -= dt;
  if (player.buffs.rampage > 0 && player.buffs.rampage - dt <= 0) hud.log('Rampage over', '#ffb07a');
  for (const k of ['berserk', 'frenzy', 'rampage']) {
    if (!(player.buffs[k] > 0)) continue;
    player.buffs[k] -= dt;
    if (player.buffs[k] <= 0) buildWeapons();
  }
}
const damageTakenScale = () => 1 - (raging() ? [0, 0.05, 0.1, 0.2][rank('rArmor')] : 0); // Damage Reduction, during Rampage
const moveSpeedScale = () => (player.buffs && player.buffs.berserk > 0 ? 1.2 : 1);
// The shield grows with the player's level (shields aren't loot).
function levelShield() { return genShield(player.level, { rarity: 0, kind: 'standard' }); }

// ---------------------------------------------------------------------------
// Skill screen
function renderSkills() {
  $('skillPts').textContent = (player.skillPoints === 1 ? '1 point to spend' : player.skillPoints + ' points to spend') + ' · level ' + player.level;
  const wrap = $('skillTrees');
  wrap.textContent = '';
  // tester tools
  if (TESTER.on) {
    const bar = document.createElement('div');
    bar.className = 'tester';
    bar.innerHTML = '<b>TESTER MODE</b><span>level locks off · Rampage has no cooldown</span>';
    for (const [label, fn] of [['+5 POINTS', () => { player.skillPoints += 5; }], ['LEVEL UP', () => { player.addXp(player.xpNeeded() - player.xp + 1); }], ['RESET TREE', resetSkills]]) {
      const b = document.createElement('button'); b.className = 'btn alt'; b.textContent = label;
      b.addEventListener('click', () => { fn(); buildWeapons(); renderSkills(); });
      bar.append(b);
    }
    wrap.append(bar);
  }
  for (const T of Object.values(SKILL_TREES)) {
    const col = document.createElement('div');
    col.className = 'tree';
    col.innerHTML = `<div class="tree-title">${T.label}</div><div class="tree-note">${T.note}</div>`;
    const row = document.createElement('div');
    row.className = 'tier';
    for (const s of T.skills) {
      const r = rank(s.id), lock = s.req();
      const b = document.createElement('button');
      b.className = 'skill' + (r ? ' has' : '') + (canLearn(s.id) ? ' can' : '') + (lock ? ' locked' : '');
      b.innerHTML = `<div class="sk-name"></div><div class="sk-rank">${lock ? 'needs ' + lock : r + '/' + s.max}</div><div class="sk-desc"></div>`;
      b.children[0].textContent = s.name;
      b.children[2].textContent = s.desc(Math.max(1, r));
      b.disabled = !canLearn(s.id);
      b.addEventListener('click', () => { if (learnSkill(s.id)) renderSkills(); });
      row.append(b);
    }
    col.append(row);
    wrap.append(col);
  }
  const next = document.createElement('div');
  next.className = 'tree locked-tree';
  next.innerHTML = `<div class="tree-title">Next skill tree</div><div class="tree-note">${nextTreeOpen() ? 'Unlocked: not designed yet' : 'Fully upgrade two Rampage skills to unlock'}</div>`;
  wrap.append(next);
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
