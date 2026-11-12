'use strict';
// HUD: DOM bars and panels plus a 2D overlay canvas for damage numbers,
// enemy health bars, hit markers, damage direction and the compass.

const $ = (id) => document.getElementById(id);
const overlay = $('overlay');
const octx = overlay.getContext('2d');
let ODPR = 1;
function sizeOverlay() {
  ODPR = Math.min(window.devicePixelRatio || 1, 2);
  overlay.width = window.innerWidth * ODPR; overlay.height = window.innerHeight * ODPR;
}
sizeOverlay();
window.addEventListener('resize', sizeOverlay);

// Safe-area insets in px (the overlay canvas is fixed to the full screen).
const SAFE = { top: 0 };
const saProbe = document.createElement('div');
saProbe.style.cssText = 'position:fixed;left:0;top:0;width:1px;visibility:hidden;pointer-events:none;height:env(safe-area-inset-top,0px)';
document.body.appendChild(saProbe);
function readSafe() { SAFE.top = saProbe.offsetHeight || 0; }
readSafe();
window.addEventListener('resize', readSafe);

const hud = (() => {
  const nums = [], hurtArcs = [], logs = [];
  let marker = 0, markerKind = 0, bannerT = 0, xpFloat = 0, xpFloatT = 0;
  const pops = [];
  let target = null, targetT = 0, crossKick = 0, reticle = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const el = {
    wave: $('waveLabel'), waveSub: $('waveSub'), cash: $('cash'),
    shieldFill: $('shieldFill'), shieldTxt: $('shieldTxt'), hpFill: $('hpFill'), hpTxt: $('hpTxt'),
    xpFill: $('xpFill'), lvl: $('lvl'), sp: $('skillBtn'),
    gunName: $('gunName'), gunSub: $('gunSub'), mag: $('ammoMag'), pool: $('ammoPool'), slots: $('slots'), gren: $('grenCount'),
    skill: $('skill'), skillFill: $('skillFill'), skillTxt: $('skillTxt'),
    target: $('target'), tName: $('tName'), tShield: $('tShield'), tHp: $('tHp'),
    boss: $('boss'), bossName: $('bossName'), bossShield: $('bossShield'), bossHp: $('bossHp'),
    ffyl: $('ffyl'), ffylFill: $('ffylFill'),
    prompt: $('prompt'), card: $('card'), banner: $('banner'), bTitle: $('bTitle'), bSub: $('bSub'),
    log: $('log'), blood: $('vBlood'), hurt: $('vHurt'), shield: $('vShield'), low: $('vLow'), xpPop: $('xpPop'),
    cross: $('crosshair'), game: $('game'), streak: $('streak'), sN: $('sN'), sM: $('sM'), sBar: $('sBar'),
  };
  let hurtA = 0, shieldA = 0, refreshT = 0;
  const refreshEl = $('refreshed');

  function project(p) {
    const v = p.clone().project(camera);
    if (v.z > 1) return null;
    return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight };
  }

  return {
    damageNumber(pos, amount, color, crit, effect) {
      if (amount < 0.5) return;
      nums.push({ pos: pos.clone().add(new THREE.Vector3(rand(-0.3, 0.3), 0, rand(-0.3, 0.3))), vx: rand(-30, 30), t: 0, life: crit ? 1.1 : 0.85, text: Math.round(amount).toLocaleString(), color, crit, effect });
      if (nums.length > 60) nums.shift();
    },
    // a word popping up over the player (COUNTER!)
    popText(text, color) { pops.push({ text, color, t: 0.9 }); },
    hitMarker(crit, kill) { marker = kill ? 0.32 : 0.22; markerKind = kill ? 2 : crit ? 1 : 0; crossKick = kill ? 9 : crit ? 6 : 3; },
    targetHit(e) { target = e; targetT = 2.5; },
    hurtFrom(src) { hurtArcs.push({ a: Math.atan2(-(src.x - player.pos.x), -(src.z - player.pos.z)), t: 1 }); if (hurtArcs.length > 8) hurtArcs.shift(); },
    flash(kind, k = 1) { if (kind === 'hurt') hurtA = Math.max(hurtA, k * 0.8); else shieldA = 0.9; },
    refreshed() { refreshT = 2; },
    floatXp(n) { xpFloat += n; xpFloatT = 1.4; },
    streak(n, t, mult, frenzy) {
      const on = n >= 2;
      el.streak.hidden = !on;
      el.game.classList.toggle('frenzy', !!frenzy);
      if (!on) return;
      const txt = '×' + n;
      if (el.sN.textContent !== txt) { el.sN.textContent = txt; el.streak.classList.remove('bump'); void el.streak.offsetWidth; el.streak.classList.add('bump'); }
      el.sM.textContent = mult > 1 ? 'CARNAGE · ' + mult.toFixed(2) + '× XP & CASH' : 'CARNAGE';
      el.sBar.style.transform = `scaleX(${clamp(t, 0, 1)})`;
    },
    banner(title, sub) { el.bTitle.textContent = title; el.bSub.textContent = sub || ''; el.banner.hidden = false; el.banner.classList.remove('pop'); void el.banner.offsetWidth; el.banner.classList.add('pop'); bannerT = 2.6; },
    log(text, color = '#fff3dc') {
      const d = document.createElement('div');
      d.className = 'logline'; d.textContent = text; d.style.color = color;
      el.log.prepend(d);
      logs.push({ d, t: 3.5 });
      while (el.log.children.length > 6) el.log.lastChild.remove();
    },
    showPrompt(text) { if (text) { el.prompt.innerHTML = text; el.prompt.hidden = false; } else el.prompt.hidden = true; },
    showCard(item, cmp) {
      if (!item) { el.card.hidden = true; el.card.dataset.id = ''; return; }
      const key = item.id + '_' + (cmp ? cmp.id : 0);
      if (el.card.dataset.id !== key) { el.card.innerHTML = itemCardHTML(item, cmp); el.card.dataset.id = key; el.card.style.borderColor = RARITY[item.rarity].css; }
      el.card.hidden = false;
    },
    clearTarget() { target = null; },
    // drop banners, log lines and prompts left over from the last place (entering a stage or the hub)
    reset() { bannerT = 0; el.banner.hidden = true; logs.length = 0; el.log.textContent = ''; el.prompt.hidden = true; el.card.hidden = true; },

    update(dt) {
      // --- DOM
      const p = player;
      const sm = p.shieldMax();
      el.shieldFill.style.transform = `scaleX(${sm ? clamp(p.shield / sm, 0, 1) : 0})`;
      el.shieldTxt.textContent = Math.round(p.shield) + ' / ' + Math.round(sm);
      el.hpFill.style.transform = `scaleX(${clamp(p.hp / p.maxHp, 0, 1)})`;
      el.hpTxt.textContent = Math.ceil(Math.max(0, p.hp)) + ' / ' + p.maxHp;
      el.xpFill.style.transform = `scaleX(${clamp(p.xp / p.xpNeeded(), 0, 1)})`;
      el.lvl.textContent = p.level;
      // unspent skill points: a star on the level badge and the skills button
      const pts = p.skillPoints || 0;
      if (el.sp.dataset.v !== String(pts)) { el.sp.dataset.v = String(pts); el.sp.textContent = pts ? '★' + pts : '★'; el.sp.classList.toggle('has', pts > 0); }
      el.cash.textContent = '$' + Math.floor(p.cash).toLocaleString();
      const g = p.gun();
      if (g) {
        el.gunName.textContent = g.name;
        el.gunName.style.color = RARITY[g.rarity].css;
        el.gunSub.innerHTML = g.element !== 'none' ? `${g.sub.split(' · ')[0]} · <span style="color:${ELEM[g.element].css}">${ELEM[g.element].label}</span>` : g.sub;
        el.mag.textContent = (p.flow || 0) >= 2 ? p.flow + ' HITS' : '⚔';
        el.mag.classList.toggle('empty', !g.melee && g.inMag <= Math.ceil(g.mag * 0.2));
      }
      // the rifle's ammo pool, or the kick cooldown with the axe; the two weapon slots
      if (g) el.pool.textContent = counterThreat() ? 'COUNTER NOW (F)' : dangerThreat() ? 'DODGE NOW (SPACE)' : (p.flow || 0) >= TAKEDOWN_FLOW ? 'TAKEDOWN READY' : '';
      let sh = '';
      for (let i = 0; i < p.weapons.length; i++) {
        const w = p.weapons[i];
        sh += `<div class="slot${i === p.cur ? ' on' : ''}" data-i="${i}" style="border-color:${RARITY[w.rarity].css}"><span>${i + 1}</span>${w.label}</div>`;
      }
      if (el.slots.dataset.v !== sh) { el.slots.innerHTML = sh; el.slots.dataset.v = sh; }

      el.wave.textContent = game.waveLabel();
      el.waveSub.textContent = game.waveSub();

      // target info from what's under the crosshair
      camBasis();
      const eye0 = aimEye();
      const w = rayWorld(eye0, _fwd, 120);
      const hit = rayEnemies(eye0, _fwd, w.t);
      if (hit) { target = hit.e; targetT = 1.2; }
      targetT -= dt;
      if (target && target.alive && targetT > 0 && !target.def.boss) {
        el.target.hidden = false;
        el.tName.innerHTML = `${target.def.badass ? '<b class="badass">' : ''}${enemyName(target)}${target.def.badass ? '</b>' : ''} <i>Lv ${target.level}</i>`;
        el.tShield.style.transform = `scaleX(${target.maxShield ? target.shield / target.maxShield : 0})`;
        el.tShield.parentNode.hidden = !target.maxShield;
        el.tHp.style.transform = `scaleX(${clamp(target.hp / target.maxHp, 0, 1)})`;
        el.tHp.className = target.hpType === 'armor' ? 'armor' : '';
      } else el.target.hidden = true;
      el.cross.classList.toggle('on-enemy', !!hit);
      // top-down: the crosshair marks what you'll shoot at (the locked-on enemy)
      const ret = project(TD.aimPoint);
      if (ret) { el.cross.style.left = ret.x + 'px'; el.cross.style.top = ret.y + 'px'; reticle = ret; }
      if (g) {
        crossKick = Math.max(0, crossKick - dt * 40);
        el.cross.style.setProperty('--gap', ((g.melee ? 10 : clamp(4 + spreadFor(g) * 4, 4, 30)) + crossKick) + 'px');
        el.cross.style.opacity = 1;
      }

      const boss = enemies.find((e) => e.alive && e.def.boss);
      el.target.classList.toggle('below-boss', !!boss);
      if (boss) {
        el.boss.hidden = false;
        el.bossName.textContent = boss.def.name + '  ·  Lv ' + boss.level;
        el.bossShield.style.transform = `scaleX(${boss.shield / boss.maxShield})`;
        el.bossHp.style.transform = `scaleX(${clamp(boss.hp / boss.maxHp, 0, 1)})`;
      } else el.boss.hidden = true;

      el.ffyl.hidden = !p.downed;
      if (p.downed) el.ffylFill.style.transform = `scaleX(${p.downT / 12})`;
      el.game.classList.toggle('downed', p.downed);

      bannerT -= dt;
      if (bannerT <= 0) el.banner.hidden = true;
      for (let i = logs.length - 1; i >= 0; i--) { logs[i].t -= dt; if (logs[i].t <= 0) { logs[i].d.remove(); logs.splice(i, 1); } else if (logs[i].t < 0.6) logs[i].d.style.opacity = logs[i].t / 0.6; }
      hurtA = Math.max(0, hurtA - dt * 1.6); shieldA = Math.max(0, shieldA - dt * 2);
      el.shield.style.opacity = shieldA;
      // blood on the screen instead of health bars: nothing at full health, creeping in from the edges
      // as health drops (a lost shield adds a little), pulsing like a heartbeat below 30%, a flash on
      // each hit; the middle of the screen always stays clear
      const hpK = clamp(1 - p.hp / p.maxHp, 0, 1), shK = sm ? clamp(1 - p.shield / sm, 0, 1) : 0;
      let k = p.downed ? 1 : clamp(hpK * 0.9 + shK * 0.12, 0, 1);
      const low = !p.downed && p.hp < p.maxHp * 0.3;
      const beat = low ? Math.pow(Math.max(0, Math.sin(performance.now() / 300)), 6) * 0.12 : 0;
      // (2026-11-11: about half as strong as before, with a wider clear middle)
      const op = k < 0.02 && hurtA < 0.02 ? 0 : clamp(0.06 + k * 0.34 + hurtA * 0.2 + beat * 0.6, 0, 0.45);
      const inner = 78 - k * 30 - hurtA * 6 - beat * 30; // where the clear middle ends (% of the ellipse)
      const key = op.toFixed(2) + '|' + inner.toFixed(0);
      if (el.blood.dataset.k !== key) { el.blood.dataset.k = key; el.blood.style.opacity = op; el.blood.style.setProperty('--bin', inner.toFixed(0) + '%'); el.blood.style.setProperty('--bout', Math.min(100, inner + 34).toFixed(0) + '%'); }
      // REFRESHED! pops in over the player's head, holds, then fades
      if (refreshT > 0) {
        refreshT -= dt;
        const at = project(player.center().add(new THREE.Vector3(0, 1.3, 0)));
        if (refreshT > 0 && at) {
          const age = 2 - refreshT, sc = age < 0.15 ? 0.5 + age / 0.15 * 0.6 : age < 0.3 ? 1.1 - (age - 0.15) / 0.15 * 0.1 : 1;
          refreshEl.hidden = false;
          refreshEl.style.left = at.x + 'px'; refreshEl.style.top = (at.y - age * 12) + 'px';
          refreshEl.style.transform = `translate(-50%, -100%) scale(${sc.toFixed(3)})`;
          refreshEl.style.opacity = Math.min(1, refreshT / 0.4).toFixed(2);
        } else refreshEl.hidden = true;
      }
      xpFloatT -= dt;
      if (xpFloatT > 0) { el.xpPop.hidden = false; el.xpPop.textContent = '+' + Math.round(xpFloat) + ' XP'; el.xpPop.style.opacity = Math.min(1, xpFloatT * 2); }
      else { el.xpPop.hidden = true; xpFloat = 0; }

      // --- canvas
      const W = window.innerWidth, H = window.innerHeight;
      octx.setTransform(ODPR, 0, 0, ODPR, 0, 0);
      octx.clearRect(0, 0, W, H);
      octx.lineJoin = 'round';

      // enemy bars
      const c = new THREE.Vector3();
      for (const e of enemies) {
        if (!e.alive || e.def.boss || (e.sinceHit > 3 && e !== target)) continue;
        c.set(e.pos.x, e.pos.y + e.height + 0.35, e.pos.z);
        const s = project(c);
        if (!s) continue;
        const d = c.distanceTo(camera.position);
        const bw = clamp(900 / d, 30, 70);
        const x = s.x - bw / 2;
        octx.fillStyle = 'rgba(20,12,8,0.85)';
        octx.fillRect(x - 2, s.y - 2, bw + 4, e.maxShield ? 12 : 8);
        octx.fillStyle = e.hpType === 'armor' ? '#f2c230' : '#e0332b';
        octx.fillRect(x, s.y + (e.maxShield ? 4 : 0), bw * clamp(e.hp / e.maxHp, 0, 1), 4);
        if (e.maxShield) { octx.fillStyle = '#4fc6ff'; octx.fillRect(x, s.y, bw * e.shield / e.maxShield, 3); }
        if (e.dots.length) {
          let k = 0;
          for (const dd of e.dots) { octx.fillStyle = ELEM[dd.elem].css; octx.beginPath(); octx.arc(x + bw + 8 + k * 9, s.y + 3, 3.5, 0, TAU); octx.fill(); k++; }
        }
      }

      // damage numbers
      for (let i = nums.length - 1; i >= 0; i--) {
        const n = nums[i];
        n.t += dt;
        if (n.t > n.life) { nums.splice(i, 1); continue; }
        const wp = n.pos.clone(); wp.y += n.t * 1.6;
        const s = project(wp);
        if (!s) continue;
        const pop = n.t < 0.1 ? 0.6 + n.t * 6 : 1.2 - Math.min(0.2, (n.t - 0.1) * 0.6);
        let size = (n.crit ? 30 : 22) * pop * (n.effect === 'up' ? 1.15 : n.effect === 'down' ? 0.85 : 1);
        const a = clamp((n.life - n.t) / 0.3, 0, 1);
        octx.globalAlpha = a;
        octx.font = `${size}px Bangers, Impact, sans-serif`;
        octx.textAlign = 'center';
        const x = s.x + n.vx * n.t;
        octx.lineWidth = 4; octx.strokeStyle = '#1c110a';
        octx.strokeText(n.text, x, s.y); octx.fillStyle = n.color; octx.fillText(n.text, x, s.y);
        if (n.crit) {
          octx.font = `${16 * pop}px Bangers, Impact, sans-serif`;
          octx.strokeText('CRITICAL!', x, s.y - size * 0.85); octx.fillStyle = '#ff5a2a'; octx.fillText('CRITICAL!', x, s.y - size * 0.85);
        }
        octx.globalAlpha = 1;
      }

      // hit marker
      const cx = reticle.x, cy = reticle.y;
      const me = project(player.center()) || { x: W / 2, y: H / 2 };
      if (marker > 0) {
        marker -= dt;
        octx.strokeStyle = markerKind === 2 ? '#ff3b2a' : markerKind === 1 ? '#ffd23a' : '#ffffff';
        octx.lineWidth = markerKind ? 3 : 2;
        const r1 = 7, r2 = markerKind === 2 ? 17 : 13;
        octx.beginPath();
        for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { octx.moveTo(cx + sx * r1, cy + sy * r1); octx.lineTo(cx + sx * r2, cy + sy * r2); }
        octx.stroke();
      }

      // pop-up words over the player
      for (let i = pops.length - 1; i >= 0; i--) {
        const q = pops[i]; q.t -= dt;
        if (q.t <= 0) { pops.splice(i, 1); continue; }
        const k = 1 - q.t / 0.9, sc = k < 0.15 ? 0.6 + k / 0.15 * 0.6 : 1.2 - Math.min(0.2, (k - 0.15));
        octx.font = `${Math.round(30 * sc)}px Bangers, Impact, sans-serif`; octx.textAlign = 'center';
        octx.globalAlpha = Math.min(1, q.t * 3); octx.lineWidth = 5; octx.strokeStyle = '#1c110a';
        octx.strokeText(q.text, me.x, me.y - 70 - k * 30); octx.fillStyle = q.color; octx.fillText(q.text, me.x, me.y - 70 - k * 30);
        octx.globalAlpha = 1;
      }
      // damage direction arcs
      for (let i = hurtArcs.length - 1; i >= 0; i--) {
        const h = hurtArcs[i];
        h.t -= dt * 1.2;
        if (h.t <= 0) { hurtArcs.splice(i, 1); continue; }
        const rel = Math.atan2(Math.sin(h.a), Math.cos(h.a)); // relative to the camera, which always faces north
        const ang = -Math.PI / 2 - rel;
        octx.strokeStyle = `rgba(255,50,30,${h.t})`;
        octx.lineWidth = 7;
        octx.beginPath(); octx.arc(me.x, me.y, Math.min(W, H) * 0.14, ang - 0.3, ang + 0.3); octx.stroke();
      }

      // off-screen markers: arrows at the screen edge toward enemies, good loot and the chest
      const edge = (p, color, size) => {
        const v = p.clone().project(camera);
        let x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H;
        if (v.z < 1 && x > 20 && x < W - 20 && y > 20 && y < H - 20) return; // on screen
        if (v.z > 1) { x = W - x; y = H - y; }
        const dx = x - me.x, dy = y - me.y, a = Math.atan2(dy, dx);
        const m = 26, k2 = Math.min(Math.abs(dx) > 1e-3 ? ((dx > 0 ? W - m : m) - me.x) / dx : Infinity, Math.abs(dy) > 1e-3 ? ((dy > 0 ? H - m : m) - me.y) / dy : Infinity);
        const ex = me.x + dx * k2, ey = me.y + dy * k2;
        octx.save(); octx.translate(ex, ey); octx.rotate(a);
        octx.fillStyle = color; octx.strokeStyle = '#1c110a'; octx.lineWidth = 2;
        octx.beginPath(); octx.moveTo(size, 0); octx.lineTo(-size * 0.6, size * 0.7); octx.lineTo(-size * 0.6, -size * 0.7); octx.closePath(); octx.fill(); octx.stroke();
        octx.restore();
      };
      for (const e of enemies) if (e.alive) edge(e.pos, e.def.boss ? '#ff8a1c' : '#ff3b2a', e.def.boss ? 13 : 9);
      for (const d of drops) if (d.kind === 'item' && d.item.rarity >= 2) edge(d.pos, RARITY[d.item.rarity].css, 9);
      if (game.chest && !game.chest.opened) edge(game.chest.pos, '#ffd23a', 11);
    },
  };
})();
