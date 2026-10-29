'use strict';
// Procedural loot: guns, shields, their 3D models, item cards and world drops.

const RARITY = [
  { name: 'Common', css: '#e9e6df', hex: 0xe9e6df, mul: 1.0 },
  { name: 'Uncommon', css: '#42e04f', hex: 0x42e04f, mul: 1.12 },
  { name: 'Rare', css: '#3e8eff', hex: 0x3e8eff, mul: 1.25 },
  { name: 'Epic', css: '#b552ff', hex: 0xb552ff, mul: 1.42 },
  { name: 'Legendary', css: '#ff8a1c', hex: 0xff8a1c, mul: 1.68 },
];
function rollRarity(luck = 0) {
  const w = [62, 25, 9.5, 2.9, 0.6].map((x, i) => x * (1 + luck * i * i * 0.5));
  return weighted(w.map((x, i) => [i, x]));
}

const ELEM = {
  none: { label: 'Kinetic', css: '#fff6e6', hex: 0xfff2d8, vs: { flesh: 1, shield: 1, armor: 1 } },
  fire: { label: 'Incendiary', css: '#ff7a1a', hex: 0xff6a10, vs: { flesh: 1.75, shield: 0.7, armor: 0.75 }, dot: 4 },
  shock: { label: 'Shock', css: '#4fc6ff', hex: 0x4fc6ff, vs: { flesh: 1, shield: 2.2, armor: 1 }, dot: 2.5 },
  corrosive: { label: 'Corrosive', css: '#9fe530', hex: 0x9fe530, vs: { flesh: 0.85, shield: 0.75, armor: 1.8 }, dot: 5 },
  explosive: { label: 'Explosive', css: '#ffd23a', hex: 0xffd23a, vs: { flesh: 1, shield: 1, armor: 1 } },
};

const TYPES = {
  pistol: { label: 'Pistol', dmg: 1.0, rate: 4.6, mag: 12, reload: 1.3, spread: 1.4, pellets: 1, ammo: 'pistol', auto: false, kick: 1.2, zoom: 1.4 },
  smg: { label: 'SMG', dmg: 0.5, rate: 11, mag: 34, reload: 1.6, spread: 2.4, pellets: 1, ammo: 'smg', auto: true, kick: 0.45, zoom: 1.4 },
  ar: { label: 'Assault Rifle', dmg: 0.78, rate: 7.5, mag: 30, reload: 2.0, spread: 1.6, pellets: 1, ammo: 'ar', auto: true, kick: 0.7, zoom: 1.6 },
  shotgun: { label: 'Shotgun', dmg: 0.42, rate: 1.35, mag: 6, reload: 2.4, spread: 5.2, pellets: 8, ammo: 'shotgun', auto: false, kick: 3.5, zoom: 1.3 },
  sniper: { label: 'Sniper Rifle', dmg: 3.4, rate: 1.1, mag: 5, reload: 2.6, spread: 0.25, pellets: 1, ammo: 'sniper', auto: false, kick: 4, zoom: 3.6 },
  launcher: { label: 'Rocket Launcher', dmg: 4.6, rate: 0.75, mag: 2, reload: 3.0, spread: 0.6, pellets: 1, ammo: 'rocket', auto: false, kick: 5, zoom: 1.3 },
};
const AMMO_MAX = { pistol: 240, smg: 480, ar: 360, shotgun: 72, sniper: 36, rocket: 12 };
const AMMO_LABEL = { pistol: 'Pistol', smg: 'SMG', ar: 'Rifle', shotgun: 'Shells', sniper: 'Sniper', rocket: 'Rockets' };

const MFR = {
  jakobs: { name: 'Jakobs', types: ['pistol', 'ar', 'shotgun', 'sniper'], dmg: 1.35, rate: 1.45, mag: 0.75, reload: 1.05, spread: 0.85, colors: [0x7a4a2a, 0x2b2b2b], semi: true, noElem: true, crit: 2.5, perk: 'Fires as fast as you can pull the trigger. Bonus crit damage.' },
  maliwan: { name: 'Maliwan', types: ['pistol', 'smg', 'shotgun', 'sniper', 'launcher'], dmg: 0.9, rate: 1, mag: 1, reload: 1, spread: 0.95, colors: [0xe9eef2, 0x2f6ea8], alwaysElem: true, elemBoost: 1.35, perk: 'Always elemental. Higher status-effect chance.' },
  torgue: { name: 'Torgue', types: ['pistol', 'ar', 'shotgun', 'launcher'], dmg: 1.28, rate: 0.85, mag: 0.85, reload: 1.1, spread: 1.1, colors: [0x2a2a2a, 0xf2c230], explosive: true, perk: 'Fires explosive gyrojet rounds.' },
  vladof: { name: 'Vladof', types: ['pistol', 'ar', 'sniper', 'launcher'], dmg: 0.88, rate: 1.45, mag: 1.5, reload: 1.05, spread: 1.15, colors: [0x9b2a22, 0xd8c39a], perk: 'High fire rate and big magazines.' },
  tediore: { name: 'Tediore', types: ['pistol', 'smg', 'shotgun', 'launcher'], dmg: 0.92, rate: 1, mag: 0.9, reload: 0.6, spread: 1, colors: [0xb8c8d0, 0x3a8acf], tediore: true, perk: 'Reload by throwing the gun. It explodes.' },
  hyperion: { name: 'Hyperion', types: ['pistol', 'smg', 'shotgun', 'sniper'], dmg: 0.95, rate: 1.05, mag: 1.25, reload: 1, spread: 1, colors: [0xf2f2ec, 0xf2c230], hyperion: true, perk: 'Accuracy improves the longer you fire.' },
  dahl: { name: 'Dahl', types: ['pistol', 'smg', 'ar', 'sniper'], dmg: 1.0, rate: 1.05, mag: 1.05, reload: 0.95, spread: 0.9, colors: [0x5d6b3a, 0x2b2b2b], dahl: true, perk: 'Automatic Dahl guns fire 3-round bursts while aiming.' },
};

const NOUNS = {
  pistol: ['Repeater', 'Hand Cannon', 'Peashooter', 'Gnasher', 'Sidewinder', 'Persuader'],
  smg: ['Buzzsaw', 'Chatterbox', 'Hornet', 'Stinger', 'Spitfire', 'Rattler'],
  ar: ['Warlord', 'Ripper', 'Thunderclap', 'Ironside', 'Rampager', 'Sawtooth'],
  shotgun: ['Boomstick', 'Scattergun', 'Thrasher', 'Mule', 'Hog Splitter', 'Blunderbuss'],
  sniper: ['Longshot', 'Widowmaker', 'Needle', 'Viper', 'Eagle Eye', 'Nightfall'],
  launcher: ['Bombard', 'Doombringer', 'Sky Sweeper', 'Mortar', 'Big Bertha', 'Party Popper'],
};
const PREFIX = {
  dmg: ['Brutal', 'Savage', 'Punishing', 'Heavy'],
  rate: ['Rabid', 'Frenzied', 'Hasty', 'Twitchy'],
  acc: ['Steady', 'Precise', 'Cold', 'Patient'],
  mag: ['Bulging', 'Hoarding', 'Deep', 'Fat'],
  fire: ['Scorching', 'Blazing', 'Smoldering'],
  shock: ['Crackling', 'Thundering', 'Static'],
  corrosive: ['Caustic', 'Melting', 'Acidic'],
  explosive: ['Volatile', 'Kaboom', 'Rowdy'],
};
const LEGENDARY = {
  pistol: { name: 'Bottomless', special: 'infinite', red: 'Ammo is a state of mind.' },
  smg: { name: 'Swarm Queen', special: 'split', red: 'One becomes three. Three become a problem.' },
  ar: { name: 'Ironstorm', special: 'regen', red: 'It reloads itself out of spite.' },
  shotgun: { name: 'Gravedigger', special: 'lifesteal', red: 'Your loss is my health bar.' },
  sniper: { name: 'Skullsplitter', special: 'headhunter', red: 'Aim for the noggin.' },
  launcher: { name: 'Cluster Fudge', special: 'cluster', red: 'Some assembly required.' },
};

const levelScale = (lvl) => Math.pow(1.13, lvl - 1);

let _itemId = 1;
function genGun(level, opts = {}) {
  const type = opts.type || weighted([['pistol', 24], ['smg', 18], ['ar', 20], ['shotgun', 16], ['sniper', 12], ['launcher', 6]]);
  const mfrKey = opts.mfr || pick(Object.keys(MFR).filter((k) => MFR[k].types.includes(type)));
  const r = opts.rarity != null ? opts.rarity : rollRarity(opts.luck || 0);
  const T = TYPES[type], M = MFR[mfrKey];
  const rolls = { dmg: rand(0.9, 1.14), rate: rand(0.88, 1.14), acc: rand(0.85, 1.18), mag: rand(0.85, 1.3) };
  const g = {
    id: _itemId++, kind: 'gun', type, mfr: mfrKey, rarity: r, level,
    pellets: T.pellets, ammo: T.ammo, auto: M.semi ? false : T.auto, zoom: T.zoom,
    crit: M.crit || (type === 'sniper' ? 2.5 : 2), special: null, red: null,
  };
  g.damage = 14 * levelScale(level) * T.dmg * M.dmg * RARITY[r].mul * rolls.dmg;
  g.rate = T.rate * M.rate * rolls.rate * (1 + r * 0.03);
  if (M.semi) g.rate = T.rate * M.rate * rolls.rate * 0.9; // Jakobs: semi-auto but click as fast as you like
  g.mag = Math.max(1, Math.round(T.mag * M.mag * rolls.mag * (1 + r * 0.07)));
  g.reload = T.reload * M.reload * rand(0.9, 1.1) * (1 - r * 0.03);
  g.spread = T.spread * M.spread / rolls.acc * (1 - r * 0.04);
  g.kick = T.kick;

  let elem = 'none';
  if (M.explosive) elem = 'explosive';
  else if (!M.noElem) {
    const chance = M.alwaysElem ? 1 : [0.06, 0.22, 0.4, 0.58, 0.75][r];
    if (Math.random() < chance) elem = pick(['fire', 'shock', 'corrosive']);
  }
  if (opts.element) elem = opts.element;
  g.element = elem;
  if (elem !== 'none' && elem !== 'explosive') {
    g.damage *= 0.88;
    let ch = (0.12 + r * 0.05 + rand(0, 0.08)) * (M.elemBoost || 1);
    if (type === 'shotgun') ch *= 0.45;
    if (type === 'smg') ch *= 0.8;
    if (type === 'sniper' || type === 'launcher') ch *= 1.8;
    g.elemChance = clamp(ch, 0.05, 0.9);
    g.elemDps = g.damage * g.pellets * (type === 'smg' ? 0.9 : 0.6) * (elem === 'fire' ? 1.2 : elem === 'shock' ? 1 : 0.8);
  }
  if (M.explosive || type === 'launcher') {
    g.projectile = true;
    g.projSpeed = type === 'launcher' ? 42 : 75;
    g.splash = type === 'launcher' ? 5.5 : 1.8;
  }
  if (M.dahl && g.auto) g.burstAds = 3;
  if (M.hyperion) g.hyperion = true;
  if (M.tediore) g.tediore = true;

  if (r === 4) {
    const L = LEGENDARY[type];
    g.special = L.special; g.red = L.red;
    g.name = L.name;
    if (g.special === 'split') { g.pellets = 3; g.damage *= 0.55; }
    if (g.special === 'regen') g.mag = Math.round(g.mag * 1.6);
    if (g.special === 'headhunter') g.crit = 4;
  } else {
    let best = 'dmg', bv = rolls.dmg;
    for (const k of ['rate', 'acc', 'mag']) if (rolls[k] > bv) { best = k; bv = rolls[k]; }
    const pre = elem !== 'none' && Math.random() < 0.65 ? pick(PREFIX[elem]) : pick(PREFIX[best]);
    g.name = pre + ' ' + pick(NOUNS[type]);
  }
  g.inMag = g.mag;
  g.value = Math.round(12 * levelScale(level) * (1 + r * r * 0.8));
  return g;
}

const SHIELD_KINDS = {
  standard: { name: 'Bulwark', cap: 1, delay: 3.2, rate: 1, perk: null },
  turtle: { name: 'Tortoise', cap: 1.7, delay: 3.8, rate: 0.7, perk: 'Huge capacity. -15% max health.' },
  nova: { name: 'Nova', cap: 0.85, delay: 3.2, rate: 1, perk: 'Releases an elemental nova when depleted.' },
  quick: { name: 'Snapback', cap: 0.72, delay: 1.5, rate: 1.7, perk: 'Recharges very quickly.' },
};
function genShield(level, opts = {}) {
  const r = opts.rarity != null ? opts.rarity : rollRarity(opts.luck || 0);
  const kind = opts.kind || weighted([['standard', 40], ['turtle', 20], ['nova', 20], ['quick', 20]]);
  const K = SHIELD_KINDS[kind];
  const s = {
    id: _itemId++, kind: 'shield', skind: kind, rarity: r, level,
    capacity: 60 * Math.pow(1.11, level - 1) * K.cap * RARITY[r].mul * rand(0.9, 1.12),
    delay: K.delay * rand(0.9, 1.1) * (1 - r * 0.04),
    perk: K.perk,
  };
  s.rate = s.capacity * 0.32 * K.rate * (1 + r * 0.05);
  if (kind === 'nova') { s.novaElem = pick(['fire', 'shock', 'corrosive']); s.novaDmg = 40 * levelScale(level) * RARITY[r].mul; }
  const pre = r === 4 ? 'The Impenetrable' : pick(['Sturdy', 'Rugged', 'Patched', 'Shiny', 'Reliable', 'Ample']);
  s.name = r === 4 ? pre + ' ' + K.name : pre + ' ' + K.name + (kind === 'nova' ? ' (' + ELEM[s.novaElem].label + ')' : '');
  if (r === 4) { s.capacity *= 1.2; s.red = 'Nothing gets through. Mostly.'; }
  return s;
}

// ---------------------------------------------------------------------------
// 3D gun model. Barrel points down -Z, grip at origin.
function buildGunModel(g, ol = 0.012) {
  const M = MFR[g.mfr];
  const main = M.colors[0], acc = M.colors[1];
  const root = new THREE.Group();
  const stripMat = glow(RARITY[g.rarity].hex);
  const elemMat = g.element !== 'none' ? glow(ELEM[g.element].hex) : null;
  const wood = 0x7a4a2a;
  const T = g.type;
  let muzzleZ = -0.5;
  if (T === 'pistol') {
    box(0.07, 0.11, 0.32, main, 0, 0.05, -0.1, root, ol);
    box(0.06, 0.18, 0.08, g.mfr === 'jakobs' ? wood : acc, 0, -0.08, 0.02, root, ol).rotation.x = -0.25;
    box(0.04, 0.04, 0.16, acc, 0, 0.06, -0.32, root, ol);
    box(0.072, 0.02, 0.18, 0, 0, 0.11, -0.1, root, 0, stripMat);
    muzzleZ = -0.41;
  } else if (T === 'smg') {
    box(0.08, 0.12, 0.42, main, 0, 0.05, -0.12, root, ol);
    box(0.06, 0.16, 0.07, acc, 0, -0.07, 0.03, root, ol).rotation.x = -0.2;
    box(0.05, 0.22, 0.07, acc, 0, -0.1, -0.16, root, ol);
    box(0.045, 0.045, 0.15, acc, 0, 0.06, -0.4, root, ol);
    box(0.082, 0.02, 0.3, 0, 0, 0.115, -0.12, root, 0, stripMat);
    muzzleZ = -0.48;
  } else if (T === 'ar') {
    box(0.09, 0.14, 0.6, main, 0, 0.05, -0.18, root, ol);
    box(0.07, 0.14, 0.28, g.mfr === 'jakobs' ? wood : acc, 0, 0.02, 0.24, root, ol);
    box(0.06, 0.16, 0.07, acc, 0, -0.08, 0.02, root, ol).rotation.x = -0.2;
    const mag = box(0.06, 0.24, 0.09, acc, 0, -0.12, -0.22, root, ol); mag.rotation.x = 0.25;
    box(0.045, 0.045, 0.3, 0x333333, 0, 0.07, -0.6, root, ol);
    box(0.05, 0.06, 0.16, 0x222222, 0, 0.16, -0.14, root, ol);
    box(0.092, 0.02, 0.44, 0, 0, 0.125, -0.18, root, 0, stripMat);
    muzzleZ = -0.76;
  } else if (T === 'shotgun') {
    box(0.1, 0.14, 0.42, main, 0, 0.05, -0.08, root, ol);
    box(0.075, 0.14, 0.3, g.mfr === 'jakobs' ? wood : acc, 0, 0.0, 0.26, root, ol);
    box(0.06, 0.15, 0.07, acc, 0, -0.08, 0.04, root, ol).rotation.x = -0.2;
    const twin = g.mfr === 'jakobs' || g.mfr === 'torgue';
    if (twin) { cyl(0.032, 0.032, 0.5, 0x333333, -0.03, 0.08, -0.5, root, ol, 8).rotation.x = Math.PI / 2; cyl(0.032, 0.032, 0.5, 0x333333, 0.03, 0.08, -0.5, root, ol, 8).rotation.x = Math.PI / 2; }
    else { cyl(0.045, 0.045, 0.5, 0x333333, 0, 0.08, -0.5, root, ol, 8).rotation.x = Math.PI / 2; }
    box(0.09, 0.07, 0.16, acc, 0, 0.0, -0.4, root, ol);
    box(0.102, 0.02, 0.3, 0, 0, 0.125, -0.08, root, 0, stripMat);
    muzzleZ = -0.76;
  } else if (T === 'sniper') {
    box(0.08, 0.13, 0.62, main, 0, 0.05, -0.12, root, ol);
    box(0.07, 0.15, 0.34, g.mfr === 'jakobs' ? wood : acc, 0, 0.01, 0.32, root, ol);
    box(0.06, 0.15, 0.07, acc, 0, -0.08, 0.04, root, ol).rotation.x = -0.2;
    cyl(0.028, 0.028, 0.6, 0x333333, 0, 0.07, -0.72, root, ol, 8).rotation.x = Math.PI / 2;
    const sc = cyl(0.045, 0.045, 0.34, 0x1f1f1f, 0, 0.19, -0.1, root, ol, 10); sc.rotation.x = Math.PI / 2;
    box(0.04, 0.05, 0.04, 0x1f1f1f, 0, 0.14, -0.1, root, 0);
    box(0.082, 0.02, 0.4, 0, 0, 0.12, -0.12, root, 0, stripMat);
    muzzleZ = -1.02;
  } else if (T === 'launcher') {
    cyl(0.11, 0.11, 0.95, main, 0, 0.12, -0.2, root, ol, 12).rotation.x = Math.PI / 2;
    cyl(0.13, 0.11, 0.12, acc, 0, 0.12, -0.7, root, ol, 12).rotation.x = Math.PI / 2;
    box(0.06, 0.16, 0.07, acc, 0, -0.06, 0.02, root, ol).rotation.x = -0.2;
    box(0.06, 0.13, 0.07, acc, 0, -0.03, -0.3, root, ol);
    box(0.05, 0.08, 0.18, 0x222222, 0.12, 0.2, -0.1, root, ol);
    box(0.225, 0.03, 0.4, 0, 0, 0.23, -0.2, root, 0, stripMat);
    muzzleZ = -0.78;
  }
  if (elemMat) {
    box(0.03, 0.03, 0.03, 0, 0.055, 0.05, -0.05, root, 0, elemMat);
    box(0.03, 0.03, 0.03, 0, -0.055, 0.05, -0.05, root, 0, elemMat);
  }
  if (g.mfr === 'torgue') box(0.03, 0.06, 0.06, 0, 0, 0.0, muzzleZ + 0.08, root, 0, glow(0xffd23a));
  root.userData.muzzleZ = muzzleZ;
  return root;
}

function buildShieldModel(s) {
  const g = new THREE.Group();
  const m = cyl(0.28, 0.28, 0.08, 0x445566, 0, 0, 0, g, 0.02, 6);
  m.rotation.x = Math.PI / 2;
  const c = cyl(0.16, 0.16, 0.1, 0, 0, 0, 0, g, 0, 6, glow(RARITY[s.rarity].hex));
  c.rotation.x = Math.PI / 2;
  return g;
}

// ---------------------------------------------------------------------------
// Item cards (HTML)
function statRow(label, val, cmp, higherBetter = true, fmt = (x) => x) {
  let arrow = '';
  if (cmp != null && Math.abs(val - cmp) > 1e-6) {
    const better = higherBetter ? val > cmp : val < cmp;
    arrow = `<span class="cmp ${better ? 'up' : 'down'}">${better ? '▲' : '▼'}</span>`;
  }
  return `<div class="srow"><span>${label}</span><b>${fmt(val)}${arrow}</b></div>`;
}
const accuracyOf = (g) => clamp(Math.round(100 - g.spread * 14), 5, 99);
function itemCardHTML(it, cmp) {
  const R = RARITY[it.rarity];
  let h = `<div class="card-name" style="color:${R.css}">${it.name}</div>`;
  if (it.kind === 'gun') {
    const c = cmp && cmp.kind === 'gun' ? cmp : null;
    h += `<div class="card-sub">${MFR[it.mfr].name} ${TYPES[it.type].label} · Lv ${it.level} · <span style="color:${R.css}">${R.name}</span></div>`;
    const dmgTxt = (x) => Math.round(x) + (it.pellets > 1 ? '×' + it.pellets : '');
    h += statRow('Damage', it.damage * it.pellets, c && c.damage * c.pellets, true, () => dmgTxt(it.damage));
    h += statRow('Accuracy', accuracyOf(it), c && accuracyOf(c), true, (x) => x + '%');
    h += statRow('Fire rate', it.rate, c && c.rate, true, (x) => x.toFixed(1));
    h += statRow('Reload', it.reload, c && c.reload, false, (x) => x.toFixed(1) + 's');
    h += statRow('Magazine', it.mag, c && c.mag, true);
    if (it.element !== 'none') {
      const E = ELEM[it.element];
      h += `<div class="card-elem" style="color:${E.css}">◆ ${E.label}${it.elemChance ? ` · ${Math.round(it.elemChance * 100)}% chance · ${Math.round(it.elemDps)}/s` : ''}</div>`;
    }
    h += `<div class="card-perk">${MFR[it.mfr].perk}</div>`;
  } else {
    const c = cmp && cmp.kind === 'shield' ? cmp : null;
    h += `<div class="card-sub">Shield · Lv ${it.level} · <span style="color:${R.css}">${R.name}</span></div>`;
    h += statRow('Capacity', it.capacity, c && c.capacity, true, (x) => Math.round(x));
    h += statRow('Recharge rate', it.rate, c && c.rate, true, (x) => Math.round(x) + '/s');
    h += statRow('Recharge delay', it.delay, c && c.delay, false, (x) => x.toFixed(1) + 's');
    if (it.perk) h += `<div class="card-perk">${it.perk}</div>`;
  }
  if (it.red) h += `<div class="card-red">${it.red}</div>`;
  return h;
}

// ---------------------------------------------------------------------------
// World drops
const drops = [];
const BEAM_GEO = new THREE.CylinderGeometry(0.06, 0.12, 1, 6, 1, true); BEAM_GEO.translate(0, 0.5, 0);

function spawnDrop(kind, pos, data = {}) {
  const d = { kind, pos: pos.clone(), vel: new THREE.Vector3(rand(-3, 3), rand(5, 8), rand(-3, 3)), t: 0, item: data.item || null, amount: data.amount || 0, ammo: data.ammo || null, grounded: false };
  const g = new THREE.Group();
  let color = 0xffffff, beamH = 0;
  if (kind === 'item') {
    const it = d.item;
    const m = it.kind === 'gun' ? buildGunModel(it, 0.018) : buildShieldModel(it);
    m.scale.setScalar(it.kind === 'gun' ? 1.5 : 1.2);
    g.add(m); d.model = m;
    color = RARITY[it.rarity].hex; beamH = 2 + it.rarity * 1.4;
    if (it.rarity >= 2) SFX.rareDrop(it.rarity);
  } else if (kind === 'cash') {
    box(0.32, 0.12, 0.18, 0x5fbf4a, 0, 0, 0, g, 0.02, glow(0x7ee35a)); color = 0x9fff6a;
  } else if (kind === 'ammo') {
    box(0.34, 0.22, 0.22, 0x5b6b3a, 0, 0, 0, g, 0.025); box(0.36, 0.06, 0.24, 0, 0, 0.05, 0, g, 0, glow(0xffd23a)); color = 0xffd23a;
  } else if (kind === 'health') {
    cyl(0.1, 0.1, 0.32, 0, 0, 0, 0, g, 0.02, 8, glow(0xff3b4a)); color = 0xff3b4a;
  } else if (kind === 'grenade') {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 1), toon(0x4f7a3a)); addOutline(m, 1.15); g.add(m); color = 0x8fd06a;
  }
  if (beamH > 0) {
    const beam = new THREE.Mesh(BEAM_GEO, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.scale.set(1, beamH, 1);
    g.add(beam); d.beam = beam;
  }
  g.position.copy(pos);
  scene.add(g);
  d.group = g; d.color = color;
  drops.push(d);
  return d;
}

function removeDrop(d) {
  scene.remove(d.group);
  const i = drops.indexOf(d);
  if (i >= 0) drops.splice(i, 1);
}

function updateDrops(dt) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.t += dt;
    if (d.t > (d.kind === 'item' ? (d.item.rarity >= 3 ? Infinity : 240) : 120)) { removeDrop(d); continue; }
    if (!d.grounded) {
      d.vel.y -= 20 * dt;
      d.pos.addScaledVector(d.vel, dt);
      const g = groundAt(d.pos.x, d.pos.z) + 0.35;
      if (d.pos.y < g) { d.pos.y = g; d.vel.y = -d.vel.y * 0.35; d.vel.x *= 0.5; d.vel.z *= 0.5; if (Math.abs(d.vel.y) < 1.2) d.grounded = true; }
      const r = Math.hypot(d.pos.x, d.pos.z);
      if (r > ARENA_R - 1) { d.pos.x *= (ARENA_R - 1) / r; d.pos.z *= (ARENA_R - 1) / r; }
    }
    d.group.position.copy(d.pos);
    d.group.position.y += Math.sin(d.t * 3) * 0.06;
    if (d.model) d.model.rotation.y += dt * 1.2;
    else d.group.rotation.y += dt * 2;
    if (d.beam) d.beam.material.opacity = 0.35 + Math.sin(d.t * 4) * 0.12;
  }
}
