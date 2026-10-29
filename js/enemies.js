'use strict';
// Enemies: models, AI, damage, death and explosions.

const ENEMY_DEFS = {
  bandit: { name: 'Bandit', body: 'human', hp: 52, shield: 0, hpType: 'flesh', speed: 4.4, xp: 10, ai: 'ranged', dmg: 6, burst: 3, burstGap: 0.16, cd: [1.5, 2.6], projSpeed: 34, spread: 0.05, range: [9, 24], scale: 1, look: { shirt: 0xb3753a, pants: 0x4a3b2e, skin: 0xe0a77a, mask: 0xe8e2d0, weapon: 'gun' } },
  marauder: { name: 'Marauder', body: 'human', hp: 58, shield: 45, hpType: 'flesh', speed: 4.2, xp: 16, ai: 'ranged', dmg: 7, burst: 4, burstGap: 0.12, cd: [1.6, 2.6], projSpeed: 38, spread: 0.045, range: [10, 26], scale: 1.05, look: { shirt: 0x3f5b7a, pants: 0x2e2e33, skin: 0xd09a72, mask: 0x30302c, weapon: 'gun', goggles: true } },
  psycho: { name: 'Psycho', body: 'human', hp: 62, shield: 0, hpType: 'flesh', speed: 7.6, xp: 12, ai: 'melee', dmg: 14, scale: 1, look: { shirt: null, pants: 0x6b2a20, skin: 0xe6b08a, mask: 0xf3efe2, weapon: 'axe', stripes: true } },
  suicide: { name: 'Suicide Psycho', body: 'human', hp: 34, shield: 0, hpType: 'flesh', speed: 8.4, xp: 10, ai: 'suicide', dmg: 36, scale: 0.95, look: { shirt: null, pants: 0x3a3a3a, skin: 0xe6b08a, mask: 0xd13a2a, weapon: 'bomb' } },
  skag: { name: 'Skag Pup', body: 'skag', hp: 40, shield: 0, hpType: 'flesh', speed: 9.5, xp: 8, ai: 'skag', dmg: 8, scale: 0.75, look: { hide: 0xc9a77a, belly: 0xe8cfa0 } },
  skagAdult: { name: 'Adult Skag', body: 'skag', hp: 75, shield: 0, hpType: 'armor', speed: 8.2, xp: 18, ai: 'skag', dmg: 14, scale: 1.15, look: { hide: 0x8e7a5a, belly: 0xc9b088 } },
  nomad: { name: 'Badass Nomad', body: 'human', hp: 230, shield: 90, hpType: 'armor', speed: 3.3, xp: 70, ai: 'ranged', dmg: 5, burst: 1, pellets: 6, burstGap: 0.1, cd: [1.5, 2.2], projSpeed: 40, spread: 0.1, range: [5, 15], scale: 1.4, badass: true, look: { shirt: 0x5a4a3a, pants: 0x2e2a26, skin: 0xc58d66, mask: 0x222222, weapon: 'gun', armor: true } },
  boss: { name: 'Krag the Scrapjaw', body: 'human', hp: 2600, shield: 900, hpType: 'armor', speed: 3.8, xp: 600, ai: 'boss', dmg: 22, projSpeed: 30, scale: 2.4, boss: true, look: { shirt: 0x6a3a2a, pants: 0x2e2a26, skin: 0xc58d66, mask: 0x8a8a8a, weapon: 'hammer', armor: true, jaw: true } },
};

const enemies = [];
const enemyShots = [];
const hazards = [];

// ---------------------------------------------------------------------------
// Models (face +Z)
function buildHuman(look, parts) {
  const root = new THREE.Group();
  const reg = (m) => { parts.push(m); return m; };
  const shirt = look.shirt != null ? look.shirt : look.skin;
  const legL = new THREE.Group(); legL.position.set(-0.15, 0.92, 0); root.add(legL);
  const legR = new THREE.Group(); legR.position.set(0.15, 0.92, 0); root.add(legR);
  reg(box(0.2, 0.92, 0.22, look.pants, 0, -0.46, 0, legL));
  reg(box(0.2, 0.92, 0.22, look.pants, 0, -0.46, 0, legR));
  box(0.22, 0.14, 0.3, 0x2b211a, 0, -0.86, 0.04, legL, 0.02);
  box(0.22, 0.14, 0.3, 0x2b211a, 0, -0.86, 0.04, legR, 0.02);
  const torso = reg(box(0.56, 0.66, 0.32, shirt, 0, 1.27, 0, root));
  if (look.stripes) { box(0.57, 0.06, 0.33, 0xb02a1e, 0, 0.1, 0, torso, 0); box(0.57, 0.06, 0.33, 0xb02a1e, 0, -0.1, 0, torso, 0); }
  if (look.shirt != null) box(0.58, 0.1, 0.34, 0x3a2a1e, 0, -0.28, 0, torso, 0);
  if (look.armor) { box(0.62, 0.36, 0.38, 0xd8b23a, 0, 0.12, 0, torso, 0.03); box(0.28, 0.14, 0.36, 0xd8b23a, -0.36, 0.3, 0, torso, 0.03); box(0.28, 0.14, 0.36, 0xd8b23a, 0.36, 0.3, 0, torso, 0.03); }
  const head = new THREE.Group(); head.position.set(0, 1.62, 0); root.add(head);
  reg(box(0.3, 0.32, 0.3, look.skin, 0, 0.02, 0, head));
  const mask = box(0.32, 0.3, 0.06, look.mask, 0, 0.03, 0.16, head, 0.02);
  box(0.08, 0.05, 0.02, 0x111111, -0.07, 0.06, 0.035, mask, 0, glow(look.weapon === 'bomb' ? 0xffe14a : 0x111111));
  box(0.08, 0.05, 0.02, 0x111111, 0.07, 0.06, 0.035, mask, 0, glow(look.weapon === 'bomb' ? 0xffe14a : 0x111111));
  if (look.goggles) { box(0.34, 0.08, 0.08, 0x222222, 0, 0.08, 0.17, head, 0.015); box(0.06, 0.06, 0.02, 0, -0.08, 0.08, 0.215, head, 0, glow(0xff4a2a)); box(0.06, 0.06, 0.02, 0, 0.08, 0.08, 0.215, head, 0, glow(0xff4a2a)); }
  else box(0.2, 0.04, 0.02, 0x111111, 0, -0.07, 0.035, mask, 0);
  if (look.jaw) { box(0.36, 0.14, 0.34, 0x9a9a9a, 0, -0.16, 0.04, head, 0.02); for (let i = -2; i <= 2; i++) box(0.04, 0.06, 0.02, 0xffffff, i * 0.06, -0.08, 0.215, head, 0); }
  if (look.weapon === 'axe') box(0.06, 0.24, 0.04, 0x3a2a1e, 0, 0.26, -0.05, head, 0.015); // mohawk
  const armL = new THREE.Group(); armL.position.set(-0.37, 1.55, 0); root.add(armL);
  const armR = new THREE.Group(); armR.position.set(0.37, 1.55, 0); root.add(armR);
  reg(box(0.15, 0.62, 0.17, look.skin, 0, -0.3, 0, armL));
  reg(box(0.15, 0.62, 0.17, look.skin, 0, -0.3, 0, armR));
  if (look.shirt != null) { box(0.17, 0.22, 0.19, shirt, 0, -0.08, 0, armL, 0); box(0.17, 0.22, 0.19, shirt, 0, -0.08, 0, armR, 0); }
  let weapon = null;
  if (look.weapon === 'gun') {
    weapon = new THREE.Group(); weapon.position.set(0, -0.58, 0.1); armR.add(weapon);
    box(0.08, 0.12, 0.5, 0x3a3a3a, 0, 0, 0.15, weapon, 0.02);
    box(0.06, 0.15, 0.07, 0x5a3a24, 0, -0.1, 0.0, weapon, 0.015);
  } else if (look.weapon === 'axe') {
    weapon = new THREE.Group(); weapon.position.set(0, -0.6, 0.05); armR.add(weapon);
    box(0.05, 0.05, 0.7, 0x5a3a24, 0, 0, 0.25, weapon, 0.015);
    box(0.04, 0.32, 0.26, 0xb8bcc0, 0, 0.12, 0.55, weapon, 0.02);
  } else if (look.weapon === 'bomb') {
    weapon = new THREE.Group(); weapon.position.set(0, -0.62, 0.05); armR.add(weapon);
    cyl(0.07, 0.07, 0.3, 0xc0392b, 0, 0, 0, weapon, 0.015, 8);
    box(0.05, 0.05, 0.05, 0, 0, 0.18, 0, weapon, 0, glow(0xffe14a));
    armR.rotation.x = -2.6;
  } else if (look.weapon === 'hammer') {
    weapon = new THREE.Group(); weapon.position.set(0, -0.6, 0.05); armR.add(weapon);
    box(0.08, 0.08, 1.2, 0x4a3426, 0, 0, 0.45, weapon, 0.02);
    box(0.36, 0.34, 0.5, 0x777777, 0, 0, 1.05, weapon, 0.03);
    box(0.38, 0.08, 0.52, 0xd23a26, 0, 0, 1.05, weapon, 0);
    // shoulder rocket pod
    const pod = box(0.36, 0.3, 0.5, 0x5d6b3a, -0.12, 1.86, -0.05, root, 0.03);
    for (const [px, py] of [[-0.08, 0.06], [0.08, 0.06], [-0.08, -0.06], [0.08, -0.06]]) box(0.08, 0.08, 0.04, 0, px, py, 0.25, pod, 0, glow(0xff5a2a));
  }
  return { root, legL, legR, armL, armR, head, torso, weapon };
}

function buildSkag(look, parts) {
  const root = new THREE.Group();
  const reg = (m) => { parts.push(m); return m; };
  const body = reg(box(0.8, 0.62, 1.4, look.hide, 0, 0.78, 0, root));
  box(0.7, 0.12, 1.2, look.belly, 0, -0.3, 0, body, 0);
  for (let i = 0; i < 4; i++) box(0.12, 0.22, 0.12, 0xefe4cc, 0, 0.38, -0.45 + i * 0.3, body, 0.015).rotation.x = -0.4; // spikes
  const head = new THREE.Group(); head.position.set(0, 0.86, 0.78); root.add(head);
  reg(box(0.64, 0.28, 0.6, look.hide, 0, 0.1, 0.25, head));
  box(0.6, 0.06, 0.56, 0xa8303a, 0, -0.06, 0.25, head, 0);
  for (let i = -2; i <= 2; i++) box(0.05, 0.1, 0.05, 0xffffff, i * 0.12, -0.06, 0.52, head, 0);
  const jaw = new THREE.Group(); jaw.position.set(0, -0.06, 0); head.add(jaw);
  reg(box(0.58, 0.16, 0.56, look.belly, 0, -0.1, 0.25, jaw));
  const legs = [];
  for (const [lx, lz] of [[-0.32, 0.5], [0.32, 0.5], [-0.32, -0.5], [0.32, -0.5]]) {
    const l = new THREE.Group(); l.position.set(lx, 0.6, lz); root.add(l);
    reg(box(0.2, 0.6, 0.22, look.hide, 0, -0.3, 0, l));
    legs.push(l);
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.9, -0.7); root.add(tail);
  box(0.12, 0.12, 0.6, look.hide, 0, 0, -0.3, tail, 0.02).rotation.x = 0.4;
  return { root, head, jaw, legs, tail };
}

// ---------------------------------------------------------------------------
function spawnEnemy(key, level, pos) {
  const def = ENEMY_DEFS[key];
  const parts = [];
  let model, rig = null;
  if (RIG.ready && RIG_LOOKS[key]) { const m = makeRigEnemy(key, def); model = { root: m.root }; rig = m.rig; }
  else model = def.body === 'skag' ? buildSkag(def.look, parts) : buildHuman(def.look, parts);
  model.root.scale.setScalar(def.scale);
  const sc = levelScale(level);
  const e = {
    key, def, level, model, parts, rig,
    dodgeCd: rand(2, 4), dashCd: rand(1, 3), tauntCd: rand(4, 8), dashDir: new THREE.Vector3(), dashSpeed: 0,
    pos: pos.clone(), vel: new THREE.Vector3(), vy: 0, grounded: true,
    yaw: Math.atan2(-pos.x, -pos.z),
    maxHp: def.hp * sc, maxShield: def.shield * sc,
    hpType: def.hpType, alive: true,
    radius: (def.body === 'skag' ? 0.6 : 0.42) * def.scale, height: (def.body === 'skag' ? 1.2 : 1.85) * def.scale,
    dmgScale: Math.pow(1.11, level - 1),
    t: rand(0, 10), fireCd: rand(1, 2.5), burstLeft: 0, burstT: 0, attackCd: 0.5, leapCd: rand(1, 3),
    strafeDir: Math.random() < 0.5 ? -1 : 1, strafeT: 0, state: 'move', stateT: 0,
    dots: [], dotTick: 0, sinceHit: 99, lastSeenPlayer: 0, flash: 0, yellT: rand(2, 6),
    bossPhase: 0, bossAttackT: 4, summoned: false,
    chase: new THREE.Vector3(), direct: true, directCheck: 0, stuckT: 0, unstickT: 0, unstickDir: new THREE.Vector3(), flinchT: 0,
  };
  e.hp = e.maxHp; e.shield = e.maxShield;
  model.root.position.copy(e.pos);
  scene.add(model.root);
  enemies.push(e);
  burst(e.pos.clone().setY(e.pos.y + 1), 0x7fd6ff, 12, 5, 0.12, 0.5, 0.2, true);
  if (rig && !def.boss && Math.random() < 0.35) { e.state = 'taunt'; e.stateT = 1.0; rigOnce(rig, 'Pointing', 1.6, 0.3, 1.9); }
  return e;
}

function enemyName(e) { return e.def.name; }

// Hit spheres in world space: [x, y, z, r, isCrit]
const _sph = [];
function enemySpheres(e) {
  const s = e.def.scale, p = e.pos;
  _sph.length = 0;
  if (e.rig) { rigSpheres(e, _sph); return _sph; }
  if (e.def.body === 'skag') {
    const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw);
    _sph.push([p.x, p.y + 0.78 * s, p.z, 0.5 * s, false]);
    _sph.push([p.x - fx * 0.45 * s, p.y + 0.75 * s, p.z - fz * 0.45 * s, 0.45 * s, false]);
    _sph.push([p.x + fx * 1.0 * s, p.y + 0.85 * s, p.z + fz * 1.0 * s, 0.34 * s, true]);
  } else {
    const hy = e.model.head.position.y;
    _sph.push([p.x, p.y + (hy + 0.03) * s, p.z, 0.23 * s, true]);
    _sph.push([p.x, p.y + 1.25 * s, p.z, 0.42 * s, false]);
    _sph.push([p.x, p.y + 0.55 * s, p.z, 0.33 * s, false]);
  }
  return _sph;
}

function rayEnemies(o, d, maxD) {
  let best = maxD, hit = null, crit = false;
  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = e.pos.x - o.x, dz = e.pos.z - o.z;
    const along = dx * d.x + dz * d.z;
    if (along < -3 || along > best + 3) continue;
    for (const s of enemySpheres(e)) {
      const t = raySphere(o.x, o.y, o.z, d.x, d.y, d.z, s[0], s[1], s[2], s[3]);
      if (t < best || (t === best && s[4] && hit === e)) { best = t; hit = e; crit = s[4]; }
    }
  }
  return hit ? { e: hit, t: best, crit } : null;
}

function enemyCenter(e, out) {
  return out.set(e.pos.x, e.pos.y + e.height * 0.55, e.pos.z);
}

// ---------------------------------------------------------------------------
// Damage
function damageEnemy(e, amount, elem, opts = {}) {
  if (!e.alive || amount <= 0) return 0;
  let remaining = amount, dealt = 0, broke = false;
  const E = ELEM[elem] || ELEM.none;
  let shown = 1;
  if (e.shield > 0) {
    const m = E.vs.shield;
    const d = remaining * m;
    shown = m;
    if (d >= e.shield) { dealt += e.shield; remaining -= e.shield / m; e.shield = 0; broke = true; }
    else { e.shield -= d; dealt += d; remaining = 0; }
  }
  if (remaining > 0) {
    const m = E.vs[e.hpType];
    shown = m;
    const d = remaining * m;
    e.hp -= d; dealt += d;
  }
  e.sinceHit = 0; e.flash = 0.08;
  if (!opts.dot) { e.flinchT = Math.max(e.flinchT, opts.crit ? 0.32 : 0.12); e.flinchCrit = !!opts.crit; }
  e.aggro = true;
  if (broke) { SFX.shieldBreak(); burst(enemyCenter(e, new THREE.Vector3()), 0x7fd6ff, 14, 6, 0.1, 0.4, 0.3, true); }
  if (!opts.silent) {
    const p = enemyCenter(e, new THREE.Vector3());
    p.y += e.height * 0.4;
    hud.damageNumber(p, dealt, opts.dot ? ELEM[elem].css : (opts.crit ? '#ffd23a' : (elem !== 'none' ? E.css : '#ffffff')), opts.crit, shown > 1.2 ? 'up' : shown < 0.85 ? 'down' : '');
  }
  if (opts.fromPlayer) {
    hud.targetHit(e);
    if (player.lifesteal && opts.lifesteal) player.heal(dealt * 0.06);
  }
  if (e.hp <= 0) killEnemy(e, opts);
  return dealt;
}

function applyDot(e, elem, dps) {
  if (!e.alive || !ELEM[elem].dot) return;
  const ex = e.dots.find((d) => d.elem === elem);
  if (ex) { ex.t = ELEM[elem].dot; ex.dps = Math.max(ex.dps, dps); }
  else e.dots.push({ elem, dps, t: ELEM[elem].dot });
}

function killEnemy(e, opts = {}) {
  if (!e.alive) return;
  e.alive = false;
  const center = enemyCenter(e, new THREE.Vector3());
  const violent = opts.explosive || opts.crit || opts.overkill;
  if (e.rig) rigDie(e, violent);
  else e.model.root.updateMatrixWorld(true);
  for (const m of e.parts) {
    scene.attach(m);
    const v = new THREE.Vector3(m.position.x - e.pos.x, 0, m.position.z - e.pos.z).normalize().multiplyScalar(violent ? rand(4, 9) : rand(0.5, 2));
    v.y = violent ? rand(4, 9) : rand(0.5, 2);
    if (opts.dir) v.addScaledVector(opts.dir, violent ? 4 : 1.5);
    addDebris(m, v, new THREE.Vector3(rand(-6, 6), 0, rand(-6, 6)), rand(3.5, 5));
  }
  if (!e.rig) scene.remove(e.model.root);
  burst(center, 0x8a1d1d, violent ? 22 : 10, violent ? 8 : 4, 0.14, 0.9);
  if (violent) burst(center, 0xefe4cc, 6, 7, 0.12, 1.2);
  for (const d of e.dots) if (d.elem === 'fire') burst(center, 0xff8a2a, 8, 4, 0.15, 0.6, -0.3, true);
  SFX.kill();
  if (e.key === 'suicide' && !opts.selfDestruct) explode(center, 5, 30 * e.dmgScale, 'explosive', { hurtsPlayer: true, fromPlayer: true, enemyDmg: true });
  game.onEnemyKilled(e, opts);
}

// Generic explosion. Damages enemies (if fromPlayer/enemyDmg), the player (if hurtsPlayer) and barrels.
function explode(pos, radius, dmg, elem = 'explosive', opts = {}) {
  blastFx(pos, radius, elem === 'explosive' ? 0xff8a2a : ELEM[elem].hex);
  SFX.boom(clamp(radius / 5, 0.5, 1.6), clamp(1.4 - pos.distanceTo(camera.position) / 80, 0.2, 1));
  game.shake(clamp(1.2 - pos.distanceTo(player.pos) / (radius * 4), 0, 1) * 0.6);
  const c = new THREE.Vector3();
  if (opts.fromPlayer || opts.enemyDmg) {
    for (const e of enemies) {
      if (!e.alive || e === opts.ignore) continue;
      const d = enemyCenter(e, c).distanceTo(pos);
      if (d < radius + e.radius) {
        const k = 1 - clamp(d / (radius + e.radius), 0, 1) * 0.6;
        const dir = c.clone().sub(pos).normalize();
        e.vel.addScaledVector(dir, 6 * k); if (e.grounded && !e.def.boss) { e.vy = 4 * k; e.grounded = false; }
        damageEnemy(e, dmg * k, elem, { explosive: true, fromPlayer: opts.fromPlayer, dir });
        if (e.alive && e.rig && !e.def.boss && k > 0.55 && e.state !== 'down') { e.state = 'down'; e.stateT = 1.9; rigOnce(e.rig, 'Getting Up', 1.4, 0, Infinity, 0.05); }
        if (opts.dotElem && opts.dotDps) applyDot(e, opts.dotElem, opts.dotDps);
      }
    }
  }
  if (opts.hurtsPlayer && player.alive) {
    const d = player.center().distanceTo(pos);
    if (d < radius + 0.4) {
      const k = 1 - clamp(d / (radius + 0.4), 0, 1) * 0.6;
      player.hurt(dmg * k * (opts.selfScale || 1) * (opts.fromPlayer ? 0.35 : 1), pos, elem);
      player.vel.addScaledVector(player.center().sub(pos).normalize(), 7 * k);
    }
  }
  for (const b of barrels) {
    if (!b.alive) continue;
    const d = Math.hypot(b.x - pos.x, b.y + 0.5 - pos.y, b.z - pos.z);
    if (d < radius + 0.5) setTimeout(() => damageBarrel(b, 999), 120);
  }
}

function damageBarrel(b, dmg) {
  if (!b.alive) return;
  b.hp -= dmg;
  if (b.hp > 0) return;
  b.alive = false;
  scene.remove(b.group);
  const i = boxCols.indexOf(b.col); if (i >= 0) boxCols.splice(i, 1);
  explode(new THREE.Vector3(b.x, b.y + 0.6, b.z), 6, 70 * levelScale(Math.max(1, game.enemyLevel)), 'explosive', { fromPlayer: true, hurtsPlayer: true, selfScale: 2.5 });
  // barrels respawn later so the arena doesn't run dry
  setTimeout(() => { b.alive = true; b.hp = 25; scene.add(b.group); boxCols.push(b.col); }, 45000);
}

// ---------------------------------------------------------------------------
// Enemy shots
const SHOT_GEO = new THREE.IcosahedronGeometry(0.13, 0);
function enemyFire(e, from, target, opts = {}) {
  const dir = target.clone().sub(from).normalize();
  const sp = opts.spread != null ? opts.spread : e.def.spread;
  dir.x += rand(-sp, sp); dir.y += rand(-sp, sp) * 0.6; dir.z += rand(-sp, sp);
  dir.normalize();
  const rocket = !!opts.rocket;
  const mesh = new THREE.Mesh(SHOT_GEO, glow(rocket ? 0xff6a2a : 0xffa040));
  mesh.scale.setScalar(rocket ? 1.8 : 1);
  mesh.position.copy(from);
  scene.add(mesh);
  const speed = opts.speed || e.def.projSpeed || 34;
  enemyShots.push({ mesh, pos: from.clone(), vel: dir.multiplyScalar(speed), dmg: opts.dmg != null ? opts.dmg : e.def.dmg * e.dmgScale, life: 3, rocket, grav: opts.grav || 0, splash: opts.splash || 0, owner: e });
  SFX.enemyShot(clamp(1.3 - from.distanceTo(player.pos) / 50, 0.1, 1));
  flashAt(from, 0xffa040, 2, 5, 0.06);
}

function updateEnemyShots(dt) {
  const pc = player.center();
  for (let i = enemyShots.length - 1; i >= 0; i--) {
    const s = enemyShots[i];
    s.life -= dt;
    const steps = Math.max(1, Math.ceil(s.vel.length() * dt / 0.4));
    const sdt = dt / steps;
    let done = false;
    for (let k = 0; k < steps && !done; k++) {
      s.vel.y -= s.grav * sdt;
      s.pos.addScaledVector(s.vel, sdt);
      if (player.alive && s.pos.distanceTo(pc) < (s.rocket ? 0.9 : 0.55) + (player.downed ? 0.2 : 0)) {
        if (s.splash) explode(s.pos, s.splash, s.dmg, 'explosive', { hurtsPlayer: true });
        else player.hurt(s.dmg, s.owner ? s.owner.pos : s.pos);
        done = true; break;
      }
      if (s.pos.y < groundAt(s.pos.x, s.pos.z) || pointInBox(s.pos)) {
        if (s.splash) explode(s.pos, s.splash, s.dmg, 'explosive', { hurtsPlayer: true });
        else burst(s.pos, 0xffc070, 4, 3, 0.07, 0.25, 1, true);
        done = true;
      }
    }
    if (s.rocket && Math.random() < 0.6) particle(s.pos, new THREE.Vector3(0, 0.5, 0), 0x777070, 0.25, 0.6, -0.1);
    if (done || s.life <= 0) { scene.remove(s.mesh); enemyShots.splice(i, 1); continue; }
    s.mesh.position.copy(s.pos);
  }
}
function pointInBox(p) {
  for (const c of boxCols) if (p.x > c.minX && p.x < c.maxX && p.z > c.minZ && p.z < c.maxZ && p.y > c.minY && p.y < c.maxY) return true;
  for (const s of sphCols) if ((p.x - s.x) ** 2 + (p.y - s.y) ** 2 + (p.z - s.z) ** 2 < s.r * s.r * 0.8) return true;
  return false;
}

// ---------------------------------------------------------------------------
// AI
const _to = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _want = new THREE.Vector3();

function enemyTarget(e) {
  const pp = player.pos;
  if (turret.active) {
    const dt = e.pos.distanceTo(turret.pos), dp = e.pos.distanceTo(pp);
    if (dt < dp * 0.8) return { pos: turret.pos, eye: turret.pos.clone().setY(turret.pos.y + 0.9), isTurret: true };
  }
  return { pos: pp, eye: player.center(), isTurret: false };
}

// Head straight for the target when the way is clear at knee height,
// otherwise follow the navigation flow field around obstacles.
const _k1 = new THREE.Vector3(), _k2 = new THREE.Vector3();
function chaseDir(e, tgt, fwd, side, dt) {
  e.directCheck -= dt;
  if (e.directCheck <= 0) {
    e.directCheck = 0.35;
    let direct = tgt.isTurret || Math.abs(tgt.pos.y - e.pos.y) < 1.2;
    for (let s = -1; s <= 1 && direct; s += 2) {
      const o = e.radius * 0.9 * s;
      _k1.set(e.pos.x + side.x * o, e.pos.y + 0.6, e.pos.z + side.z * o);
      _k2.set(tgt.pos.x + side.x * o, tgt.pos.y + 0.6, tgt.pos.z + side.z * o);
      if (!lineOfSight(_k1, _k2)) direct = false;
    }
    e.direct = direct;
  }
  if (e.direct) return fwd;
  return navDir(e.pos, e.chase) ? e.chase : fwd;
}

function updateEnemy(e, dt) {
  e.t += dt; e.sinceHit += dt; e.flash -= dt;
  // damage over time
  e.dotTick -= dt;
  if (e.dots.length && e.dotTick <= 0) {
    e.dotTick = 0.5;
    const c = enemyCenter(e, _a);
    for (let i = e.dots.length - 1; i >= 0; i--) {
      const d = e.dots[i];
      damageEnemy(e, d.dps * 0.5, d.elem, { dot: true, fromPlayer: true });
      burst(c, ELEM[d.elem].hex, 3, 2.5, 0.12, 0.5, d.elem === 'fire' ? -0.4 : 0.6, true);
      if (!e.alive) return;
    }
  }
  for (let i = e.dots.length - 1; i >= 0; i--) { e.dots[i].t -= dt; if (e.dots[i].t <= 0) e.dots.splice(i, 1); }
  if (e.maxShield > 0 && e.sinceHit > 4 && e.shield < e.maxShield) e.shield = Math.min(e.maxShield, e.shield + e.maxShield * 0.25 * dt);

  const tgt = enemyTarget(e);
  _to.subVectors(tgt.pos, e.pos); _to.y = 0;
  const dist = _to.length();
  const fwd = dist > 0.001 ? _to.clone().divideScalar(dist) : new THREE.Vector3(0, 0, 1);
  const side = new THREE.Vector3(-fwd.z, 0, fwd.x);
  _want.set(0, 0, 0);
  let face = true;
  const sp = e.def.speed * (e.dots.some((d) => d.elem === 'shock') ? 0.75 : 1);
  const playerDowned = player.downed && !tgt.isTurret;
  const chase = chaseDir(e, tgt, fwd, side, dt);

  const ai = e.def.ai;
  const special = e.state === 'taunt' || e.state === 'down' || e.state === 'dash';
  if (special) {
    e.stateT -= dt;
    if (e.state === 'dash') { _want.copy(e.dashDir).multiplyScalar(e.dashSpeed); }
    if (e.state === 'down') face = false;
    if (e.stateT <= 0) e.state = 'move';
  } else if (ai === 'ranged') {
    e.strafeT -= dt;
    if (e.strafeT <= 0) { e.strafeDir = Math.random() < 0.5 ? -1 : 1; e.strafeT = rand(1.2, 2.8); }
    const eye = _a.set(e.pos.x, e.pos.y + 1.6 * e.def.scale, e.pos.z);
    e.losCheck = (e.losCheck || 0) - dt;
    if (e.losCheck <= 0) { e.los = lineOfSight(eye, tgt.eye); e.losCheck = 0.3; }
    const [rMin, rMax] = e.def.range;
    e.dodgeCd -= dt; e.tauntCd -= dt;
    if (e.rig && e.dodgeCd <= 0 && e.grounded && (e.flinchCrit && e.flinchT > 0 || (assist.current === e && player.adsK > 0.6 && Math.random() < dt * 1.5))) {
      e.dodgeCd = rand(3.5, 6);
      e.state = 'dash'; e.stateT = 0.62; e.dashSpeed = 6.5;
      e.dashDir.copy(fwd).multiplyScalar(-0.6).addScaledVector(side, Math.random() < 0.5 ? -0.8 : 0.8).normalize();
      rigOnce(e.rig, 'Rifle Jump Backward', 1.4, 0, Infinity, 0.06);
    } else if (e.rig && playerDowned && e.tauntCd <= 0 && dist < 28) {
      e.tauntCd = rand(6, 10);
      e.state = 'taunt'; e.stateT = 1.8;
      if (Math.random() < 0.5) rigOnce(e.rig, 'Loser', 1.4, 0.2, 2.8); else rigOnce(e.rig, 'Slap thigh Taunt', 1.5, 0.5, 3.2);
    }
    if (!e.los || dist > rMax) _want.copy(chase).multiplyScalar(sp);
    else if (dist < rMin) _want.copy(fwd).multiplyScalar(-sp * 0.8).addScaledVector(side, e.strafeDir * sp * 0.4);
    else _want.copy(side).multiplyScalar(e.strafeDir * sp * 0.6);
    if (e.los && dist < rMax + 10) {
      if (e.burstLeft > 0) {
        e.burstT -= dt;
        if (e.burstT <= 0) {
          e.burstLeft--; e.burstT = e.def.burstGap;
          const muzzle = _b.set(e.pos.x + fwd.x * 0.6 * e.def.scale + side.x * 0.3, e.pos.y + 1.3 * e.def.scale, e.pos.z + fwd.z * 0.6 * e.def.scale + side.z * 0.3);
          const aim = tgt.eye.clone();
          const n = e.def.pellets || 1;
          for (let k = 0; k < n; k++) enemyFire(e, muzzle.clone(), aim, { spread: e.def.spread + (dist / 400) });
        }
      } else {
        e.fireCd -= dt * (playerDowned ? 0.6 : 1);
        if (e.fireCd <= 0) { e.burstLeft = e.def.burst; e.burstT = 0; e.fireCd = rand(e.def.cd[0], e.def.cd[1]); }
      }
    }
  } else if (ai === 'melee' || ai === 'suicide') {
    e.yellT -= dt;
    if (e.yellT <= 0) { e.yellT = rand(3, 7); SFX.yell(clamp(1.2 - dist / 40, 0, 1)); }
    const zig = e.direct ? Math.sin(e.t * 2.3) * (dist > 6 ? 0.45 : 0) : 0;
    _want.copy(chase).addScaledVector(side, zig).normalize().multiplyScalar(sp);
    if (ai === 'suicide' && dist < 1.9) {
      const c = enemyCenter(e, new THREE.Vector3());
      e.alive = false;
      explode(c, 5, e.def.dmg * e.dmgScale, 'explosive', { hurtsPlayer: true, enemyDmg: true });
      e.alive = true;
      killEnemy(e, { selfDestruct: true, explosive: true, noXp: true });
      return;
    }
    e.attackCd -= dt; e.dashCd -= dt;
    if (e.state === 'swing' && e.rig) {
      _want.multiplyScalar(0.25);
      const t = rigTime(e.rig);
      while (e.atkHit < e.atk.hits.length && t >= e.atk.hits[e.atkHit]) {
        if (dist < 2.5 && !tgt.isTurret) player.hurt(e.def.dmg * e.dmgScale * e.atk.dmg[e.atkHit], e.pos);
        SFX.swing();
        e.atkHit++;
      }
      if (!e.rig.one || t >= e.atk.end - 0.02) e.state = 'move';
    } else if (e.state === 'swing') {
      e.stateT -= dt;
      _want.multiplyScalar(0.3);
      if (e.stateT <= 0) {
        e.state = 'move';
        if (dist < 2.6) { if (tgt.isTurret) {} else player.hurt(e.def.dmg * e.dmgScale, e.pos); SFX.swing(); }
      }
    } else if (dist < 2.0 && e.attackCd <= 0) {
      e.state = 'swing'; e.stateT = 0.32; e.attackCd = 1.1;
      if (e.rig && ai === 'melee') startRigAttack(e);
      else if (e.rig) e.state = 'move';
    } else if (e.rig && ai === 'melee' && e.direct && dist > 5 && dist < 9 && e.dashCd <= 0 && e.grounded) {
      e.dashCd = rand(3, 6);
      e.state = 'dash'; e.dashDir.copy(fwd);
      if (Math.random() < 0.5) { e.stateT = 0.75; e.dashSpeed = 10; rigOnce(e.rig, 'Running Forward Flip', 1.4, 0, Infinity, 0.06); }
      else { e.stateT = 0.8; e.dashSpeed = 11; rigOnce(e.rig, 'Running Slide 2', 1.6, 0.1, Infinity, 0.06); }
    }
  } else if (ai === 'skag') {
    e.leapCd -= dt; e.attackCd -= dt;
    if (e.state === 'leap') {
      face = false;
      if (!e.hitDuringLeap && dist < 1.8 * e.def.scale && !tgt.isTurret) { player.hurt(e.def.dmg * 1.3 * e.dmgScale, e.pos); e.hitDuringLeap = true; }
      if (e.grounded && e.stateT < 0.3) e.state = 'move';
      e.stateT -= dt;
      _want.copy(e.vel);
    } else {
      _want.copy(chase).multiplyScalar(sp);
      if (dist > 4 && dist < 9 && e.leapCd <= 0 && e.grounded && e.direct) {
        e.state = 'leap'; e.stateT = 0.8; e.leapCd = rand(3, 5); e.hitDuringLeap = false;
        e.vel.copy(fwd).multiplyScalar(15); e.vy = 6.5; e.grounded = false;
        SFX.growl(clamp(1.2 - dist / 40, 0, 1));
      } else if (dist < 1.9 * e.def.scale && e.attackCd <= 0) {
        e.attackCd = 0.9; e.biteT = 0.25;
        if (!tgt.isTurret) player.hurt(e.def.dmg * e.dmgScale, e.pos);
      }
    }
  } else if (ai === 'boss') {
    updateBoss(e, dt, tgt, dist, fwd, side, sp, chase);
  }

  // hit stagger
  if (e.flinchT > 0) { e.flinchT -= dt; _want.multiplyScalar(e.def.boss ? 0.85 : 0.35); }
  // getting unstuck: sidestep for a moment, then re-path
  if (e.unstickT > 0) {
    e.unstickT -= dt;
    _want.multiplyScalar(0.3).addScaledVector(e.unstickDir, sp * 0.9);
  }
  const px = e.pos.x, pz = e.pos.z;

  // movement
  if (e.state !== 'leap' && e.state !== 'charge' && e.state !== 'dash') {
    const k = e.grounded ? 1 - Math.exp(-8 * dt) : 1 - Math.exp(-1 * dt);
    e.vel.x = lerp(e.vel.x, _want.x, k); e.vel.z = lerp(e.vel.z, _want.z, k);
  } else if (e.state === 'charge' || e.state === 'dash') { e.vel.x = _want.x; e.vel.z = _want.z; }
  e.pos.x += e.vel.x * dt; e.pos.z += e.vel.z * dt;
  e.vy -= 22 * dt;
  e.pos.y += e.vy * dt;
  const g = collideBody(e.pos, e.radius, e.height, e.vy);
  if (e.pos.y <= g) {
    if (!e.grounded && e.def.boss && e.state === 'slamAir') bossLand(e);
    e.pos.y = g; e.vy = 0; e.grounded = true;
  } else if (e.pos.y > g + 0.05) e.grounded = false;

  const wantSp = Math.hypot(_want.x, _want.z);
  const moved = Math.hypot(e.pos.x - px, e.pos.z - pz) / Math.max(dt, 1e-4);
  if (e.grounded && e.state === 'move' && wantSp > 1.5 && moved < wantSp * 0.3) e.stuckT += dt;
  else e.stuckT = Math.max(0, e.stuckT - dt * 2);
  if (e.stuckT > 0.5) {
    e.stuckT = 0;
    e.unstickT = rand(0.5, 0.9);
    const s = Math.random() < 0.5 ? -1 : 1;
    e.unstickDir.set(-_want.z * s, 0, _want.x * s).normalize();
    e.strafeDir = -e.strafeDir;
    e.direct = false; e.directCheck = 1.5;
  }

  // face target
  if (face) {
    const want = Math.atan2(_to.x, _to.z);
    let d = want - e.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    e.yaw += d * Math.min(1, dt * 8);
  }
  animateEnemy(e, dt);
}

function separateEnemies() {
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i]; if (!a.alive) continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j]; if (!b.alive) continue;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz), m = a.radius + b.radius;
      if (d < m && d > 1e-4) {
        const k = (m - d) / d * 0.5;
        a.pos.x -= dx * k; a.pos.z -= dz * k; b.pos.x += dx * k; b.pos.z += dz * k;
      }
    }
    // keep off the player
    const dx = player.pos.x - a.pos.x, dz = player.pos.z - a.pos.z;
    const d = Math.hypot(dx, dz), m = a.radius + 0.4;
    if (d < m && d > 1e-4 && Math.abs(player.pos.y - a.pos.y) < a.height) { a.pos.x -= dx / d * (m - d); a.pos.z -= dz / d * (m - d); }
  }
}

function animateEnemy(e, dt) {
  if (e.rig) { animateRig(e, dt); return; }
  const M = e.model, r = M.root;
  r.position.copy(e.pos);
  r.rotation.y = e.yaw;
  const speed = Math.hypot(e.vel.x, e.vel.z);
  e.phase = (e.phase || 0) + dt * speed * (e.def.body === 'skag' ? 2.2 : 1.9) / e.def.scale;
  const sw = Math.sin(e.phase) * clamp(speed / 4, 0, 1);
  if (e.def.body === 'skag') {
    M.legs[0].rotation.x = sw * 0.8; M.legs[3].rotation.x = sw * 0.8;
    M.legs[1].rotation.x = -sw * 0.8; M.legs[2].rotation.x = -sw * 0.8;
    M.tail.rotation.y = Math.sin(e.t * 6) * 0.4;
    const open = e.state === 'leap' ? 0.7 : (e.biteT > 0 ? 0.8 : 0.15 + Math.sin(e.t * 3) * 0.1);
    e.biteT = (e.biteT || 0) - dt;
    M.jaw.rotation.x = open;
  } else {
    M.legL.rotation.x = sw * 0.9; M.legR.rotation.x = -sw * 0.9;
    let armL = -sw * 0.7, armR = sw * 0.7;
    if (e.def.ai === 'ranged') { armR = -1.45; armL = -1.2; }
    if (e.def.ai === 'melee') { armR = e.state === 'swing' ? -2.8 + (0.32 - e.stateT) * 9 : -0.6 + sw * 0.3; }
    if (e.def.ai === 'suicide') armR = -2.7;
    if (e.def.ai === 'boss') {
      if (e.state === 'slamWind' || e.state === 'slamAir') { armR = -3.0; armL = -3.0; }
      else if (e.state === 'charge') { armR = -1.4; armL = -1.4; }
      else armR = -0.7 + sw * 0.3;
    }
    M.armL.rotation.x = armL; M.armR.rotation.x = armR;
    M.armL.rotation.z = e.def.ai === 'ranged' ? 0.5 : 0;
    M.torso.position.y = 1.27 + Math.abs(sw) * 0.04;
    M.head.rotation.z = e.def.ai === 'melee' ? Math.sin(e.t * 9) * 0.15 : 0;
  }
  // hit flash and stagger
  r.scale.setScalar(e.def.scale * (e.flash > 0 ? 1.04 : 1));
  const fl = Math.max(0, e.flinchT);
  r.rotation.x = (e.state === 'leap' ? -0.3 : 0) - fl * (e.def.boss ? 0.3 : 0.9);
  if (M.head && e.def.body !== 'skag') M.head.rotation.x = e.flinchCrit ? -fl * 2.2 : 0;
}

// ---------------------------------------------------------------------------
// Boss
function updateBoss(e, dt, tgt, dist, fwd, side, sp, chase) {
  e.bossAttackT -= dt;
  if (!e.summoned && e.shield <= 0 && e.hp < e.maxHp * 0.5) {
    e.summoned = true;
    hud.banner('KRAG CALLS FOR BACKUP', '');
    for (let i = 0; i < 4; i++) game.queueSpawn(i % 2 ? 'psycho' : 'suicide', true);
  }
  if (e.state === 'move') {
    _want.copy(chase).multiplyScalar(dist > 8 || !e.direct ? sp : 0);
    if (e.bossAttackT <= 0) {
      const opts = dist < 14 ? ['slam', 'slam', 'rockets', 'charge'] : ['rockets', 'rockets', 'charge', 'slam'];
      const a = pick(opts);
      e.bossAttackT = rand(2.5, 4) * (e.hp < e.maxHp * 0.4 ? 0.7 : 1);
      if (a === 'slam') { e.state = 'slamWind'; e.stateT = 0.7; }
      else if (a === 'rockets') { e.state = 'rockets'; e.stateT = 0; e.rocketsLeft = e.hp < e.maxHp * 0.4 ? 6 : 4; }
      else { e.state = 'charge'; e.stateT = 1.6; e.chargeDir = fwd.clone(); e.chargeHit = false; SFX.yell(1); SFX.growl(1); }
    }
  } else if (e.state === 'slamWind') {
    e.stateT -= dt;
    if (e.stateT <= 0) { e.state = 'slamAir'; e.vy = 9; e.grounded = false; e.vel.copy(fwd).multiplyScalar(Math.min(dist, 10) / 1.1); }
  } else if (e.state === 'slamAir') {
    _want.set(e.vel.x, 0, e.vel.z);
  } else if (e.state === 'rockets') {
    e.stateT -= dt;
    if (e.stateT <= 0) {
      e.stateT = 0.28; e.rocketsLeft--;
      const from = new THREE.Vector3(e.pos.x - Math.cos(e.yaw) * 0.3, e.pos.y + 4.6, e.pos.z + Math.sin(e.yaw) * 0.3);
      const aim = tgt.pos.clone().add(new THREE.Vector3(rand(-4, 4), 0, rand(-4, 4)));
      const flat = Math.hypot(aim.x - from.x, aim.z - from.z);
      const T = clamp(flat / 22, 0.6, 2.2);
      const v = new THREE.Vector3((aim.x - from.x) / T, (aim.y - from.y + 0.5 * 14 * T * T) / T, (aim.z - from.z) / T);
      const speed = v.length();
      enemyFire(e, from, from.clone().add(v), { rocket: true, speed, spread: 0, grav: 14, splash: 3.6, dmg: e.def.dmg * 0.9 * e.dmgScale });
      if (e.rocketsLeft <= 0) e.state = 'move';
    }
  } else if (e.state === 'charge') {
    e.stateT -= dt;
    _want.copy(e.chargeDir).multiplyScalar(17);
    if (Math.random() < 0.5) particle(e.pos.clone().setY(e.pos.y + 0.2), new THREE.Vector3(rand(-1, 1), 1, rand(-1, 1)), 0xc9a070, 0.4, 0.6, -0.1);
    if (!e.chargeHit && dist < 2.8 && !tgt.isTurret) { e.chargeHit = true; player.hurt(e.def.dmg * 1.3 * e.dmgScale, e.pos); player.vel.addScaledVector(e.chargeDir, 14); player.vy = 6; game.shake(0.8); }
    if (e.stateT <= 0) e.state = 'move';
  }
}

function bossLand(e) {
  e.state = 'move';
  e.vel.set(0, 0, 0);
  const p = e.pos.clone();
  ringFx(p, 20, 0xffb040, 1.0);
  burst(p.clone().setY(p.y + 0.3), 0xc9a070, 24, 10, 0.5, 1.0, 0.3);
  SFX.boom(1.4, 1);
  game.shake(1);
  hazards.push({ kind: 'shockwave', origin: p, r: 0, speed: 20, max: 20, dmg: e.def.dmg * e.dmgScale, done: false });
}

function updateHazards(dt) {
  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i];
    const prev = h.r;
    h.r += h.speed * dt;
    if (!h.done && player.alive) {
      const d = Math.hypot(player.pos.x - h.origin.x, player.pos.z - h.origin.z);
      const airborne = player.pos.y - groundAt(player.pos.x, player.pos.z) > 0.5;
      if (d >= prev - 0.6 && d <= h.r + 0.6 && !airborne) { h.done = true; player.hurt(h.dmg, h.origin); player.vy = 7; }
    }
    if (h.r > h.max) hazards.splice(i, 1);
  }
}

function clearEnemies() {
  clearRigCorpses();
  for (const e of enemies) if (e.alive) scene.remove(e.model.root);
  enemies.length = 0;
  for (const s of enemyShots) scene.remove(s.mesh);
  enemyShots.length = 0;
  hazards.length = 0;
}
