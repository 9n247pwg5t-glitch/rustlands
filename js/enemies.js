'use strict';
// Enemies: models, AI, damage, death and explosions.

const ENEMY_DEFS = {
  bandit: { name: 'Bandit', body: 'human', hp: 52, shield: 0, hpType: 'flesh', speed: 4.4, xp: 10, ai: 'ranged', dmg: 6, burst: 4, burstGap: 0.14, cd: [0.9, 1.7], projSpeed: 34, spread: 0.05, range: [9, 24], scale: 1, look: { shirt: 0xb3753a, pants: 0x4a3b2e, skin: 0xe0a77a, mask: 0xe8e2d0, weapon: 'gun' } },
  marauder: { name: 'Marauder', body: 'human', hp: 58, shield: 45, hpType: 'flesh', speed: 4.2, xp: 16, ai: 'ranged', dmg: 7, burst: 5, burstGap: 0.11, cd: [1.0, 1.8], projSpeed: 38, spread: 0.045, range: [10, 26], scale: 1.05, look: { shirt: 0x3f5b7a, pants: 0x2e2e33, skin: 0xd09a72, mask: 0x30302c, weapon: 'gun', goggles: true } },
  psycho: { name: 'Psycho', body: 'human', hp: 62, shield: 0, hpType: 'flesh', speed: 7.6, xp: 12, ai: 'melee', dmg: 14, scale: 1, look: { shirt: null, pants: 0x6b2a20, skin: 0xe6b08a, mask: 0xf3efe2, weapon: 'axe', stripes: true } },
  suicide: { name: 'Suicide Psycho', body: 'human', hp: 34, shield: 0, hpType: 'flesh', speed: 8.4, xp: 10, ai: 'suicide', dmg: 36, scale: 0.95, look: { shirt: null, pants: 0x3a3a3a, skin: 0xe6b08a, mask: 0xd13a2a, weapon: 'bomb' } },
  nomad: { name: 'Badass Nomad', body: 'human', hp: 230, shield: 90, hpType: 'armor', speed: 3.3, xp: 70, ai: 'ranged', dmg: 4.5, burst: 10, burstGap: 0.07, cd: [1.2, 1.9], projSpeed: 42, spread: 0.075, range: [6, 18], scale: 1.4, badass: true, look: { shirt: 0x5a4a3a, pants: 0x2e2a26, skin: 0xc58d66, mask: 0x222222, weapon: 'gun', armor: true } },
  boss: { name: 'Krag the Scrapjaw', body: 'human', hp: 2600, shield: 900, hpType: 'armor', speed: 3.8, xp: 600, ai: 'boss', dmg: 22, projSpeed: 30, scale: 2.4, boss: true, look: { shirt: 0x6a3a2a, pants: 0x2e2a26, skin: 0xc58d66, mask: 0x8a8a8a, weapon: 'hammer', armor: true, jaw: true } },
};

// How a gunner fires the weapon it carries (from its type's numbers): rifles use the type's own
// stats, shotguns fire one spread of pellets up close, pistols fire slower, harder single shots.
const GUN_FIRE = {
  rifle: () => ({}),
  shotgun: (d) => ({ pellets: 6, burst: 1, dmg: d.dmg * 0.75, spread: d.spread * 2.2, cd: [d.cd[0] + 0.3, d.cd[1] + 0.4], range: [5, 13], projSpeed: d.projSpeed + 6 }),
  pistol: (d) => ({ burst: 2, burstGap: 0.3, dmg: d.dmg * 1.5, spread: d.spread * 0.8, range: [7, 19] }),
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

// ---------------------------------------------------------------------------
function spawnEnemy(key, level, pos) {
  let def = ENEMY_DEFS[key];
  const parts = [];
  let model, rig = null;
  if (RIG.ready && RIG_LOOKS[key]) { const m = makeRigEnemy(key, def); model = { root: m.root }; rig = m.rig; }
  else model = buildHuman(def.look, parts);
  if (rig && rig.gun && !rig.dual && def.ai === 'ranged' && GUN_FIRE[rig.gun]) def = Object.assign({}, def, GUN_FIRE[rig.gun](def));
  model.root.scale.setScalar(def.scale);
  const sc = levelScale(level);
  const e = {
    key, def, level, model, parts, rig,
    dodgeCd: rand(2, 4), dashCd: rand(1, 3), tauntCd: rand(4, 8), dashDir: new THREE.Vector3(), dashSpeed: 0,
    pos: pos.clone(), vel: new THREE.Vector3(), vy: 0, grounded: true,
    yaw: Math.atan2(-pos.x, -pos.z),
    maxHp: def.hp * sc, maxShield: def.shield * sc,
    hpType: def.hpType, alive: true,
    radius: 0.42 * def.scale, height: 1.85 * def.scale,
    dmgScale: Math.pow(1.11, level - 1),
    t: rand(0, 10), fireCd: rand(1, 2.5), burstLeft: 0, burstT: 0, attackCd: 0.5,
    strafeDir: Math.random() < 0.5 ? -1 : 1, strafeT: 0, state: 'move', stateT: 0,
    dots: [], dotTick: 0, sinceHit: 99, lastSeenPlayer: 0, flash: 0, yellT: rand(2, 6),
    bossPhase: 0, bossAttackT: 4, summoned: false,
    chase: new THREE.Vector3(), direct: true, directCheck: 0, stuckT: 0, unstickT: 0, unstickDir: new THREE.Vector3(), flinchT: 0,
    engaged: false, waitT: 0, backoffT: 0, orbitAng: null, orbitR: rand(5, 8), orbitDir: Math.random() < 0.5 ? -1 : 1,
    tac: null, tacT: 0, spot: null, prefDist: 0, moveShoot: false, retreatCd: rand(3, 6), noLosT: 0,
    path: null, pathT: 0, pathI: 0, pathGoal: new THREE.Vector3(),
  };
  e.hp = e.maxHp; e.shield = e.maxShield;
  model.root.position.copy(e.pos);
  scene.add(model.root);
  enemies.push(e);
  burst(e.pos.clone().setY(e.pos.y + 1), 0x7fd6ff, 12, 5, 0.12, 0.5, 0.2, true);
  if (rig && !def.boss && Math.random() < 0.35) {
    e.state = 'taunt'; e.stateT = 1.0;
    if (def.ai === 'ranged') e.stateT = rigTaunt(e);
    else { e.stateT = 1.3; rigOnce(rig, 'Zombie Scream', 1.5, 0.3, 2.3); } // psychos scream as they arrive
  }
  if (rig && def.ai === 'ranged') { e.mag = magSize(e); e.nadeCd = rand(6, 14); }
  return e;
}

function enemyName(e) { return e.def.name; }

// Hit spheres in world space: [x, y, z, r, isCrit]
const _sph = [];
function enemySpheres(e) {
  const s = e.def.scale, p = e.pos;
  _sph.length = 0;
  if (e.rig) { rigSpheres(e, _sph); return _sph; }
  const hy = e.model.head.position.y;
  _sph.push([p.x, p.y + (hy + 0.03) * s, p.z, 0.23 * s, true]);
  _sph.push([p.x, p.y + 1.25 * s, p.z, 0.42 * s, false]);
  _sph.push([p.x, p.y + 0.55 * s, p.z, 0.33 * s, false]);
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
  // flinch on the upper body (the legs keep going); not while reloading or mid-attack
  if (!opts.dot && e.rig && !e.def.boss && e.state === 'move' && !e.reloadT && !e.rig.one && !(e.hitAnimT > 0)) {
    e.hitAnimT = 0.7;
    if (opts.crit || e.def.ai !== 'ranged') rigUpper(e.rig, 'Hit Reaction headshot', 1.2);
    else rigUpper(e.rig, 'Walking Hit Reaction rifle', 1.5, 0.15, 0.95);
  }
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
  b.group.visible = false;
  const i = boxCols.indexOf(b.col); if (i >= 0) boxCols.splice(i, 1);
  explode(new THREE.Vector3(b.x, b.y + 0.6, b.z), 6, 70 * levelScale(Math.max(1, game.enemyLevel)), 'explosive', { fromPlayer: true, hurtsPlayer: true, selfScale: 2.5 });
  // barrels respawn later so the arena doesn't run dry
  setTimeout(() => { b.alive = true; b.hp = 25; b.group.visible = true; worldBoxCols('arena').push(b.col); }, 45000);
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
const _lead = new THREE.Vector3();

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

// ---------------------------------------------------------------------------
// Tactics. Gunners pick their own firing spot around the player (their preferred range, spread
// apart, off to the player's sides, near cover), hold it while strafing, move on after a while and
// fall back to cover to recharge. Melee enemies take turns: a few engage while the rest circle at a
// distance; after a combo they often back off and let another one in. Only a few gunners fire at once.
const tactics = { shooters: 0, maxShooters: 2, engaged: 0, maxEngaged: 2 };
function tacticsFrame(dt = 1 / 60) {
  if (tactics.nadeT > 0) tactics.nadeT -= dt;
  tactics.maxShooters = Math.min(7, 4 + Math.floor(game.wave / 2));
  tactics.maxEngaged = Math.min(5, 3 + Math.floor(game.wave / 4));
  let shooters = 0, engaged = 0;
  const waiting = [];
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.burstLeft > 0) shooters++;
    const ai = e.def.ai;
    if (ai === 'melee') {
      if (e.engaged) engaged++;
      else if (!(e.waitT > 0) && e.state !== 'taunt') waiting.push(e);
    }
  }
  waiting.sort((a, b) => a.pos.distanceToSquared(player.pos) - b.pos.distanceToSquared(player.pos));
  for (const e of waiting) { if (engaged >= tactics.maxEngaged) break; e.engaged = true; engaged++; }
  tactics.shooters = shooters; tactics.engaged = engaged;
}

// Steer toward a point: straight when the grid line is clear, otherwise along an A* path.
function steerTo(e, target, dt, out) {
  const dx = target.x - e.pos.x, dz = target.z - e.pos.z, d = Math.hypot(dx, dz);
  if (d < 0.3) { out.set(0, 0, 0); return d; }
  if (navLineClear(e.pos, target)) { e.path = null; out.set(dx / d, 0, dz / d); return d; }
  e.pathT -= dt;
  if (!e.path || e.pathT <= 0 || e.pathGoal.distanceToSquared(target) > 4) {
    e.path = navFindPath(e.pos, target); e.pathT = 1.5; e.pathGoal.copy(target); e.pathI = 0;
  }
  if (e.path && e.path.length) {
    for (let k = 0; k < 3 && e.pathI < e.path.length - 1 && navLineClear(e.pos, e.path[e.pathI + 1]); k++) e.pathI++;
    const w = e.path[e.pathI];
    const wx = w.x - e.pos.x, wz = w.z - e.pos.z, wd = Math.hypot(wx, wz);
    if (wd < 0.6 && e.pathI < e.path.length - 1) e.pathI++;
    if (wd > 1e-3) { out.set(wx / wd, 0, wz / wd); return d; }
  }
  out.set(dx / d, 0, dz / d);
  return d;
}

// 1 when something solid sits between a spot and the target, 0.4 when cover is merely adjacent.
function coverScore(x, z, tp) {
  const dx = tp.x - x, dz = tp.z - z, d = Math.hypot(dx, dz) || 1;
  for (const t of [1.0, 1.8]) if (!navWalkable(x + dx / d * t, z + dz / d * t)) return 1;
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; if (!navWalkable(x + Math.sin(a) * 1.3, z + Math.cos(a) * 1.3)) return 0.4; }
  return 0;
}

const _sp1 = new THREE.Vector3();
function pickSpot(e, tgt, retreat) {
  const [rMin, rMax] = e.def.range;
  if (!e.prefDist) e.prefDist = rand(rMin + 1, (rMin + rMax) / 2 + 3);
  const ang0 = Math.atan2(e.pos.x - tgt.pos.x, e.pos.z - tgt.pos.z);
  const look = Math.atan2(-Math.sin(player.yaw), -Math.cos(player.yaw));
  const cur = Math.hypot(e.pos.x - tgt.pos.x, e.pos.z - tgt.pos.z);
  // candidates: points on a ring at the preferred range, plus spots tucked behind nearby
  // walls, crates, cars and rocks (on the far side from the player, or beside them to peek out)
  const cands = [];
  for (let i = 0; i < 10; i++) {
    const a = ang0 + (retreat ? rand(-0.9, 0.9) : rand(-0.8, 0.8) * (i < 4 ? 0.35 : 1));
    const r = retreat ? Math.max(cur, e.prefDist) + rand(2, 8) : e.prefDist + rand(-2.5, 2.5);
    cands.push([tgt.pos.x + Math.sin(a) * r, tgt.pos.z + Math.cos(a) * r]);
  }
  const near = [];
  for (const c of boxCols) {
    if (c.ref || c.maxY - c.minY < 1) continue;
    const cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2;
    const d = Math.hypot(cx - e.pos.x, cz - e.pos.z);
    if (d < 18) near.push([cx, cz, Math.max(c.maxX - c.minX, c.maxZ - c.minZ) / 2, d]);
  }
  for (const c of sphCols) { const d = Math.hypot(c.x - e.pos.x, c.z - e.pos.z); if (d < 18 && c.r > 1) near.push([c.x, c.z, c.r, d]); }
  near.sort((u, v) => u[3] - v[3]);
  for (const [cx, cz, half] of near.slice(0, 6)) {
    const ax = cx - tgt.pos.x, az = cz - tgt.pos.z, al = Math.hypot(ax, az) || 1;
    const off = half + 1.3;
    cands.push([cx + ax / al * off, cz + az / al * off]);                         // behind it
    if (!retreat) for (const sgn of [-1, 1]) cands.push([cx + ax / al * off * 0.5 - az / al * off * sgn, cz + az / al * off * 0.5 + ax / al * off * sgn]); // beside it
  }
  let best = null, bestS = -Infinity;
  for (const [x, z] of cands) {
    const a = Math.atan2(x - tgt.pos.x, z - tgt.pos.z), r = Math.hypot(x - tgt.pos.x, z - tgt.pos.z);
    if (Math.hypot(x, z) > ARENA_R - 3 || !navWalkable(x, z)) continue;
    if (!retreat && (r < rMin * 0.8 || r > rMax + 2)) continue;
    const y = groundAt(x, z);
    _sp1.set(x, y + 1.5 * e.def.scale, z);
    const los = lineOfSight(_sp1, tgt.eye);
    let sc = retreat ? (los ? -8 : 6) : (los ? 4 : -5);
    if (!retreat) sc -= Math.abs(r - e.prefDist) * 0.25;
    sc += coverScore(x, z, tgt.pos) * (retreat ? 1 : 2.5);
    if (!retreat) { let rel = a - look; rel = Math.atan2(Math.sin(rel), Math.cos(rel)); sc += Math.min(Math.abs(rel), 1.6) * 0.9; }
    for (const o of enemies) {
      if (o === e || !o.alive) continue;
      const q = o.spot || o.pos, dd = Math.hypot(q.x - x, q.z - z);
      if (dd < 5) sc -= (5 - dd) * 1.2;
    }
    sc -= Math.hypot(x - e.pos.x, z - e.pos.z) * 0.08;
    if (sc > bestS) { bestS = sc; best = [x, y, z]; }
  }
  if (!best) return false;
  e.spot = (e.spot || new THREE.Vector3()).set(best[0], best[1], best[2]);
  e.spotCover = coverScore(best[0], best[2], tgt.pos) >= 1;
  e.path = null;
  return true;
}

// Shots per magazine, counted in bursts (two-gun nomads never stop to reload).
const magSize = (e) => (e.rig && e.rig.dual ? Infinity : e.rig && e.rig.gun === 'shotgun' ? 3 : e.rig && e.rig.gun === 'pistol' ? 4 : 3);
function enemyReload(e) {
  const v = Math.hypot(e.vel.x, e.vel.z);
  // the clip that matches the legs, on the upper body only; it lasts as long as the reload does
  if (v < 0.6) { rigUpper(e.rig, 'Reloading idle', 1.45, 0.1, 3.3); e.reloadT = 3.2 / 1.45; }
  else if (v < 2.6) { rigUpper(e.rig, 'Reload walking', 1.7, 0.2, 4.1); e.reloadT = 3.9 / 1.7; }
  else { rigUpper(e.rig, 'Reload running', 1.55, 0.2, 3.67); e.reloadT = 3.47 / 1.55; }
  e.hitAnimT = 0;
}
// Grenade: wind up and throw (the clip's release is 2.05 s in), lobbed to land where the target is.
const NADE_START = 1.0, NADE_RELEASE = 2.05, NADE_TS = 1.3;
function enemyStartThrow(e) {
  e.state = 'throw'; e.stateT = (2.6 - NADE_START) / NADE_TS; e.throwT = 0; e.nadeOut = false;
  rigOnce(e.rig, 'Grenade Throw', NADE_TS, NADE_START, 2.6, 0.1);
  tactics.nadeT = 5; // one grenade at a time across the arena
}
const NADE_MAT = glow(0x3a4a2a);
function enemyLobGrenade(e, tgt) {
  const from = e.rig.bones.rhand.getWorldPosition(new THREE.Vector3());
  const to = tgt.pos.clone();
  to.x += rand(-1.2, 1.2); to.z += rand(-1.2, 1.2); to.y = groundAt(to.x, to.z);
  const d = Math.hypot(to.x - from.x, to.z - from.z);
  const T = 0.7 + d / 18, g = 16;
  const vel = new THREE.Vector3((to.x - from.x) / T, (to.y - from.y + 0.5 * g * T * T) / T, (to.z - from.z) / T);
  const mesh = new THREE.Mesh(SHOT_GEO, NADE_MAT);
  mesh.scale.setScalar(1.1);
  mesh.position.copy(from);
  scene.add(mesh);
  enemyShots.push({ mesh, pos: from, vel, dmg: e.def.dmg * 3.5 * e.dmgScale, life: T + 1, rocket: false, grav: g, splash: 3.6, owner: e, nade: true });
}
function enemyUpdateThrow(e, dt, tgt) {
  e.throwT += dt;
  if (!e.nadeOut && e.throwT >= (NADE_RELEASE - NADE_START) / NADE_TS) { e.nadeOut = true; enemyLobGrenade(e, tgt); }
}

function updateRanged(e, dt, tgt, dist, fwd, side, sp, playerDowned) {
  const [rMin, rMax] = e.def.range;
  if (e.reloadT > 0) {
    e.reloadT -= dt;
    // done, or cut short by a dodge or throw (the reload clip is gone): magazine full
    if (e.reloadT <= 0 || !e.rig.up) { e.reloadT = 0; e.mag = magSize(e); }
  }
  e.nadeCd -= dt;
  const eye = _a.set(e.pos.x, e.pos.y + 1.6 * e.def.scale, e.pos.z);
  e.losCheck = (e.losCheck || 0) - dt;
  if (e.losCheck <= 0) { e.los = lineOfSight(eye, tgt.eye); e.losCheck = 0.3; }
  e.noLosT = e.los ? 0 : (e.noLosT || 0) + dt;
  e.dodgeCd -= dt; e.tauntCd -= dt; e.tacT -= dt; e.strafeT -= dt; e.retreatCd -= dt;
  if (e.strafeT <= 0) { if (Math.random() < 0.6) e.strafeDir = -e.strafeDir; e.strafeT = rand(0.7, 1.7); }
  if (e.rig && e.dodgeCd <= 0 && e.grounded && (e.flinchCrit && e.flinchT > 0 || (assist.current === e && player.adsK > 0.6 && Math.random() < dt * 1.5))) {
    e.dodgeCd = rand(3.5, 6);
    e.state = 'dash'; e.stateT = 0.62; e.dashSpeed = 6.5;
    e.dashDir.copy(fwd).multiplyScalar(-0.6).addScaledVector(side, Math.random() < 0.5 ? -0.8 : 0.8).normalize();
    rigOnce(e.rig, 'Rifle Jump Backward', 1.4, 0, Infinity, 0.06);
    return;
  }
  if (e.rig && playerDowned && e.tauntCd <= 0 && dist < 28) {
    e.tauntCd = rand(6, 10);
    e.state = 'taunt'; e.stateT = rigTaunt(e);
    return;
  }
  // a target that's gone to ground gets heckled, to bait it out
  if (e.rig && e.tauntCd <= 0 && e.tac === 'hold' && e.noLosT > 2.5 && !e.reloadT && dist < 30 && Math.random() < dt * 0.35) {
    e.tauntCd = rand(8, 14);
    e.state = 'taunt'; e.stateT = rigTaunt(e);
    SFX.yell(clamp(1 - dist / 40, 0, 0.8));
    return;
  }
  // fall back to cover to recharge when the shield breaks or health runs low
  if (e.tac !== 'retreat' && e.retreatCd <= 0 && ((e.maxShield > 0 && e.shield <= 0) || e.hp < e.maxHp * 0.35)) {
    e.retreatCd = 14;
    if (pickSpot(e, tgt, true)) { e.tac = 'retreat'; e.tacT = rand(3.5, 5); }
  }
  if (!e.spot) { pickSpot(e, tgt, false); e.tac = 'move'; e.tacT = 8; }
  const sd = e.spot ? Math.hypot(e.spot.x - e.pos.x, e.spot.z - e.pos.z) : 0;
  let canFire = e.los && dist < rMax + 10;
  if (!e.spot) {
    _want.copy(side).multiplyScalar(e.strafeDir * sp * 0.4);
  } else if (e.tac === 'retreat') {
    canFire = false;
    if (sd > 1) { steerTo(e, e.spot, dt, _b); _want.copy(_b).multiplyScalar(sp * 1.15); e.faceMove = sd > 2.5; }
    const recharged = e.maxShield ? e.shield >= e.maxShield * 0.8 : e.tacT <= 0;
    if ((sd <= 1 && recharged) || e.tacT <= -5) { e.tac = 'move'; pickSpot(e, tgt, false); e.tacT = 8; }
  } else if (e.tac === 'move') {
    steerTo(e, e.spot, dt, _b);
    // long moves away from the player: turn and run; short ones: backpedal or side-step while facing them
    // long moves: turn and run; short ones: step there while still facing the player
    e.faceMove = sd > 7 && _b.dot(fwd) < 0.3;
    _want.copy(_b).multiplyScalar(sp);
    canFire = canFire && e.moveShoot && !e.faceMove;
    if (sd < 1.2 || e.tacT <= 0) { e.tac = 'hold'; e.tacT = rand(4.5, 8); }
  } else {
    // hold the spot: short side steps, drift back if pushed off it
    if (sd > 2.5) { steerTo(e, e.spot, dt, _b); _want.copy(_b).multiplyScalar(sp * 0.6); }
    else _want.copy(side).multiplyScalar(e.strafeDir * Math.min(sp * 0.35, 1.0));
    if (e.tacT <= 0 || dist < rMin * 0.7 || dist > rMax + 4 || e.noLosT > 1.5) {
      pickSpot(e, tgt, false); e.tac = 'move'; e.tacT = 8; e.moveShoot = Math.random() < 0.75;
    }
  }
  // crouched while holding a spot behind cover (standing up to fire)
  e.inCover = !!(e.rig && e.tac === 'hold' && e.spotCover && sd < 1.6);
  // a grenade to flush out a target that's been hiding, or now and then to break up a standoff
  if (e.rig && e.nadeCd <= 0 && !e.burstLeft && !e.reloadT && e.grounded && !(tactics.nadeT > 0) && dist > 7 && dist < 24 && e.tac !== 'retreat' && !tgt.isTurret
      && (e.noLosT > 2.5 || (e.los && Math.random() < 0.25))) {
    e.nadeCd = rand(12, 20);
    enemyStartThrow(e);
    return;
  }
  if (e.reloadT) canFire = false;
  e.aiming = !e.reloadT && (e.burstLeft > 0 || (e.los && !e.faceMove && e.tac !== 'retreat' && dist < rMax + 12));
  if (e.burstLeft > 0) {
    if (!e.los) { e.burstLeft = 0; return; }
    e.burstT -= dt;
    if (e.burstT <= 0) {
      e.burstLeft--; e.burstT = e.def.burstGap;
      let muzzle;
      if (e.rig && e.rig.dual) e.handFlip = !e.handFlip; // two guns: alternate hands
      if (e.rig && e.rig.muzzles) {
        // from the weapon's own barrel
        e.rig.model.updateMatrixWorld(true);
        muzzle = e.rig.muzzles[e.rig.muzzles.length > 1 && e.handFlip ? 1 : 0].getWorldPosition(_b);
      } else if (e.rig && e.rig.dual) {
        (e.handFlip ? e.rig.bones.lhand : e.rig.bones.rhand).getWorldPosition(_b);
        muzzle = _b.addScaledVector(fwd, 0.35 * e.def.scale);
      } else muzzle = _b.set(e.pos.x + fwd.x * 0.6 * e.def.scale + side.x * 0.3, e.pos.y + 1.3 * e.def.scale, e.pos.z + fwd.z * 0.6 * e.def.scale + side.z * 0.3);
      const aim = tgt.eye.clone();
      const n = e.def.pellets || 1;
      const moving = Math.hypot(e.vel.x, e.vel.z) > 1.5;
      for (let k = 0; k < n; k++) enemyFire(e, muzzle.clone(), aim, { spread: e.def.spread * (moving ? 1.6 : 1) + dist / 400 });
      // end of a burst: one less in the magazine, reload when it's empty
      if (e.burstLeft === 0 && e.rig && e.mag != null && --e.mag <= 0) enemyReload(e);
    }
  } else if (canFire) {
    e.fireCd -= dt * (playerDowned ? 0.6 : 1);
    if (e.fireCd <= 0) {
      if (tactics.shooters < tactics.maxShooters) { tactics.shooters++; e.burstLeft = e.def.burst; e.burstT = 0; e.fireCd = rand(e.def.cd[0], e.def.cd[1]); }
      else e.fireCd = rand(0.25, 0.6); // wait for a turn to shoot
    }
  }
}

function afterMeleeAttack(e) {
  // a psycho that drew blood sometimes stops to gloat (an opening for the player)
  if (e.landed && e.rig && Math.random() < 0.3) { e.landed = false; e.state = 'taunt'; e.stateT = rigTaunt(e) * 0.8; e.tauntCd = rand(4, 7); return; }
  e.landed = false;
  if (Math.random() < 0.3) e.backoffT = rand(0.7, 1.1);
}

// Returns true when the enemy blew itself up.
function updateMelee(e, dt, tgt, dist, fwd, side, sp, chase) {
  const ai = e.def.ai;
  e.yellT -= dt;
  if (e.yellT <= 0) { e.yellT = rand(3, 7); SFX.yell(clamp(1.2 - dist / 40, 0, 1)); }
  if (ai === 'suicide' && dist < 1.9) {
    const c = enemyCenter(e, new THREE.Vector3());
    e.alive = false;
    explode(c, 5, e.def.dmg * e.dmgScale, 'explosive', { hurtsPlayer: true, enemyDmg: true });
    e.alive = true;
    killEnemy(e, { selfDestruct: true, explosive: true, noXp: true });
    return true;
  }
  e.attackCd -= dt; e.dashCd -= dt; e.tauntCd -= dt; e.waitT -= dt;

  // attacks already under way
  e.faceLock = false;
  if (e.state === 'swing' && e.rig) {
    const a = e.atk, t = rigTime(e.rig);
    const next = a.hits[Math.min(e.atkHit, a.hits.length - 1)];
    const toHit = e.atkHit < a.hits.length ? axeTimeTo(a, t, next) : -1;
    const sinceHit = e.atkHit > 0 ? (t - a.hits[e.atkHit - 1]) / RIG_ATK_TS : 9;
    // stalk after a target that backs off during the wind-up, then a quick step into the blow just
    // before it lands, planted after
    if (toHit > 0 && toHit < 0.32) _want.copy(fwd).multiplyScalar(clamp((dist - 1.25) / Math.max(toHit, 0.1), 0, 9));
    else if (toHit > 0 && dist > 2) _want.copy(fwd).multiplyScalar(Math.min(3, (dist - 2) * 3));
    else _want.set(0, 0, 0);
    // track the target while winding up, then commit to the swing (a sidestep can dodge it)
    e.faceLock = (toHit >= 0 && toHit < 0.16) || sinceHit < 0.3;
    while (e.atkHit < a.hits.length && t >= a.hits[e.atkHit]) {
      const connect = dist < 2.4 * e.def.scale && !tgt.isTurret;
      if (a.axe) SFX.chop(connect); else SFX.swing();
      const p = e.rig.blade && a.axe ? e.rig.blade.edge.getWorldPosition(new THREE.Vector3()) : null;
      if (connect) {
        player.hurt(e.def.dmg * e.dmgScale * a.dmg[e.atkHit], e.pos);
        e.landed = true;
        // weight: the swing stops dead in the target for a beat, the screen jolts, the target is shoved
        e.rig.freezeT = a.axe ? 0.09 : 0.05;
        game.hitstop = Math.max(game.hitstop, 0.05);
        game.shake(a.axe ? 0.55 : 0.4);
        player.vel.x += fwd.x * 4.5; player.vel.z += fwd.z * 4.5;
        if (p) { burst(p, 0xffe2a8, 10, 6, 0.06, 0.25, 1, true); burst(p, 0x8a1d1d, 8, 3.5, 0.09, 0.5); }
      } else if (p && p.y < e.pos.y + 0.7) burst(p, 0xc9a070, 10, 3, 0.12, 0.6, 0.6); // a chop into the dirt
      e.atkHit++;
    }
    if (!e.rig.one || t >= a.end - 0.02) {
      // still in reach: sometimes chain straight into another swing
      if (dist < 3 && !e.chained && Math.random() < 0.4) { e.chained = true; startRigAttack(e, true); return false; }
      e.chained = false; e.state = 'move'; afterMeleeAttack(e);
    }
    return false;
  }
  if (e.state === 'swing') {
    e.stateT -= dt;
    _want.copy(fwd).multiplyScalar(sp * 0.3);
    if (e.stateT <= 0) {
      e.state = 'move';
      if (dist < 2.6 && !tgt.isTurret) player.hurt(e.def.dmg * e.dmgScale, e.pos);
      SFX.swing();
      afterMeleeAttack(e);
    }
    return false;
  }

  // backing off after an attack, which frees the turn for someone else
  if (e.backoffT > 0) {
    e.backoffT -= dt;
    _want.copy(fwd).multiplyScalar(-2.2).addScaledVector(side, e.orbitDir * 0.9);
    if (e.backoffT <= 0) { e.engaged = false; e.waitT = rand(0.4, 1.0); }
    return false;
  }

  const engaged = e.engaged || ai === 'suicide' || dist < 3.2 || tgt.isTurret || player.downed;
  if (engaged) {
    // a target on the move is cut off: run at where it's heading (when the way is clear), straight
    // in; a slow one is approached on a curve from further out
    const tv = tgt.isTurret ? 0 : Math.hypot(player.vel.x, player.vel.z);
    _lead.copy(chase);
    if (e.direct && tv > 2.5 && dist > 2.5) {
      const t = Math.min(1.2, dist / Math.max(sp, 1));
      _a.set(tgt.pos.x + player.vel.x * t, 0, tgt.pos.z + player.vel.z * t);
      if (navLineClear(e.pos, _a)) _lead.set(_a.x - e.pos.x, 0, _a.z - e.pos.z).normalize();
    }
    const curve = e.direct && dist > 5 && tv < 2.5 ? 0.55 * e.orbitDir : 0;
    const zig = ai === 'suicide' && e.direct ? Math.sin(e.t * 2.3) * 0.45 : 0;
    _want.copy(_lead).addScaledVector(side, curve + zig).normalize().multiplyScalar(sp);
    if (dist < (e.rig && ai === 'melee' ? 3.0 : 2.0) && e.attackCd <= 0) {
      e.state = 'swing'; e.stateT = 0.32; e.attackCd = 0.8;
      if (e.rig && ai === 'melee') startRigAttack(e);
      else if (e.rig) e.state = 'move';
    } else if (e.rig && ai === 'melee' && e.direct && dist > 4 && dist < 10 && e.dashCd <= 0 && e.grounded) {
      e.dashCd = rand(2.5, 4.5);
      e.state = 'dash'; e.dashDir.copy(fwd);
      if (Math.random() < 0.5) { e.stateT = 0.75; e.dashSpeed = 10; rigOnce(e.rig, 'Running Forward Flip', 1.4, 0, Infinity, 0.06); }
      else { e.stateT = 0.8; e.dashSpeed = 11; rigOnce(e.rig, 'Running Slide 2', 1.6, 0.1, Infinity, 0.06); }
    }
    return false;
  }

  // waiting for a turn: circle the player at a distance
  if (e.orbitAng == null) e.orbitAng = Math.atan2(e.pos.x - tgt.pos.x, e.pos.z - tgt.pos.z);
  e.orbitAng += e.orbitDir * dt * (sp * 0.4) / e.orbitR;
  let ox = tgt.pos.x + Math.sin(e.orbitAng) * e.orbitR, oz = tgt.pos.z + Math.cos(e.orbitAng) * e.orbitR;
  if (!navWalkable(ox, oz) || Math.hypot(ox, oz) > ARENA_R - 3) { e.orbitDir = -e.orbitDir; e.orbitAng += e.orbitDir * 0.3; }
  _b.set(ox, 0, oz);
  const td = steerTo(e, _b, dt, _a);
  e.faceMove = td > 4;
  _want.copy(_a).multiplyScalar(sp * (td > 3 ? 0.8 : 0.45));
  if (e.rig && ai === 'melee' && e.tauntCd <= 0 && td < 3 && dist < 16 && Math.random() < dt * 0.2) {
    e.tauntCd = rand(7, 12);
    e.state = 'taunt'; e.stateT = rigTaunt(e);
    SFX.yell(clamp(1.2 - dist / 40, 0, 1));
  }
  return false;
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
  e.faceMove = false;
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
  const special = e.state === 'taunt' || e.state === 'down' || e.state === 'dash' || e.state === 'throw';
  if (special) {
    e.stateT -= dt;
    if (e.state === 'throw') enemyUpdateThrow(e, dt, tgt);
    if (e.state === 'dash') { _want.copy(e.dashDir).multiplyScalar(e.dashSpeed); }
    if (e.state === 'down') face = false;
    if (e.stateT <= 0) e.state = 'move';
  } else if (ai === 'ranged') {
    updateRanged(e, dt, tgt, dist, fwd, side, sp, playerDowned);
  } else if (ai === 'melee' || ai === 'suicide') {
    if (updateMelee(e, dt, tgt, dist, fwd, side, sp, chase)) return; // blew itself up
  } else if (ai === 'boss') {
    updateBoss(e, dt, tgt, dist, fwd, side, sp, chase);
  }

  // hit stagger
  if (e.hitAnimT > 0) e.hitAnimT -= dt;
  if (e.flinchT > 0) { e.flinchT -= dt; _want.multiplyScalar(e.def.boss ? 0.85 : 0.35); }
  // getting unstuck: sidestep for a moment, then re-path
  if (e.unstickT > 0) {
    e.unstickT -= dt;
    _want.multiplyScalar(0.3).addScaledVector(e.unstickDir, sp * 0.9);
  }
  const px = e.pos.x, pz = e.pos.z;

  // movement
  if (e.state !== 'charge' && e.state !== 'dash') {
    const k = e.grounded ? 1 - Math.exp(-8 * dt) : 1 - Math.exp(-1 * dt);
    e.vel.x = lerp(e.vel.x, _want.x, k); e.vel.z = lerp(e.vel.z, _want.z, k);
    if (e.rig && e.grounded && (e.state === 'move' || e.state === 'swing')) {
      rigClampVelocity(e);
      // settle instead of creeping when there's nowhere to go
      if (Math.hypot(_want.x, _want.z) < 0.3) { e.vel.x *= Math.exp(-10 * dt); e.vel.z *= Math.exp(-10 * dt); }
    }
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

  // face the target, or the way it's running when it turned to run
  if (face && !e.faceLock) {
    const vs = Math.hypot(e.vel.x, e.vel.z);
    const want = e.faceMove && vs > 1 ? Math.atan2(e.vel.x, e.vel.z) : Math.atan2(_to.x, _to.z);
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
  e.phase = (e.phase || 0) + dt * speed * 1.9 / e.def.scale;
  const sw = Math.sin(e.phase) * clamp(speed / 4, 0, 1);
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
  // hit flash and stagger
  r.scale.setScalar(e.def.scale * (e.flash > 0 ? 1.04 : 1));
  const fl = Math.max(0, e.flinchT);
  r.rotation.x = -fl * (e.def.boss ? 0.3 : 0.9);
  if (M.head) M.head.rotation.x = e.flinchCrit ? -fl * 2.2 : 0;
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
    _want.copy(e.chargeDir).multiplyScalar(12.5);
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
