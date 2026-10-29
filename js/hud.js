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

const hud = (() => {
  const nums = [], hurtArcs = [], logs = [];
  let marker = 0, markerKind = 0, bannerT = 0, xpFloat = 0, xpFloatT = 0;
  let target = null, targetT = 0, crossKick = 0;
  const el = {
    wave: $('waveLabel'), waveSub: $('waveSub'), cash: $('cash'),
    shieldFill: $('shieldFill'), shieldTxt: $('shieldTxt'), hpFill: $('hpFill'), hpTxt: $('hpTxt'),
    xpFill: $('xpFill'), lvl: $('lvl'),
    gunName: $('gunName'), gunSub: $('gunSub'), mag: $('ammoMag'), pool: $('ammoPool'), slots: $('slots'), gren: $('grenCount'),
    skill: $('skill'), skillFill: $('skillFill'), skillTxt: $('skillTxt'),
    target: $('target'), tName: $('tName'), tShield: $('tShield'), tHp: $('tHp'),
    boss: $('boss'), bossName: $('bossName'), bossShield: $('bossShield'), bossHp: $('bossHp'),
    ffyl: $('ffyl'), ffylFill: $('ffylFill'),
    prompt: $('prompt'), card: $('card'), banner: $('banner'), bTitle: $('bTitle'), bSub: $('bSub'),
    log: $('log'), hurt: $('vHurt'), shield: $('vShield'), low: $('vLow'), xpPop: $('xpPop'),
    cross: $('crosshair'), game: $('game'),
  };
  let hurtA = 0, shieldA = 0;

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
    hitMarker(crit, kill) { marker = kill ? 0.32 : 0.22; markerKind = kill ? 2 : crit ? 1 : 0; crossKick = kill ? 9 : crit ? 6 : 3; },
    targetHit(e) { target = e; targetT = 2.5; },
    hurtFrom(src) { hurtArcs.push({ a: Math.atan2(-(src.x - player.pos.x), -(src.z - player.pos.z)), t: 1 }); if (hurtArcs.length > 8) hurtArcs.shift(); },
    flash(kind, k = 1) { if (kind === 'hurt') hurtA = Math.max(hurtA, k * 0.8); else shieldA = 0.9; },
    floatXp(n) { xpFloat += n; xpFloatT = 1.4; },
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
      el.cash.textContent = '$' + Math.floor(p.cash).toLocaleString();
      const g = p.gun();
      if (g) {
        el.gunName.textContent = g.name;
        el.gunName.style.color = RARITY[g.rarity].css;
        el.gunSub.innerHTML = `${MFR[g.mfr].name} ${TYPES[g.type].label}${g.element !== 'none' ? ` · <span style="color:${ELEM[g.element].css}">${ELEM[g.element].label}</span>` : ''}`;
        el.mag.textContent = g.special === 'infinite' ? '∞' : (p.reloadT > 0 ? '··' : g.inMag);
        el.mag.classList.toggle('empty', g.special !== 'infinite' && g.inMag <= Math.ceil(g.mag * 0.2));
        el.pool.textContent = p.ammo[g.ammo];
      }
      let sh = '';
      for (let i = 0; i < 4; i++) {
        const w = p.weapons[i];
        sh += `<div class="slot${i === p.cur ? ' on' : ''}" data-i="${i}" style="${w ? 'border-color:' + RARITY[w.rarity].css : ''}"><span>${i + 1}</span>${w ? TYPES[w.type].label.split(' ')[0] : '—'}</div>`;
      }
      if (el.slots.dataset.v !== sh) { el.slots.innerHTML = sh; el.slots.dataset.v = sh; }
      el.gren.textContent = p.grenades;
      if (turret.active) { el.skillFill.style.transform = `scaleY(${turret.t / turret.dur})`; el.skill.className = 'active'; el.skillTxt.textContent = Math.ceil(turret.t); }
      else if (p.skillCd > 0) { el.skillFill.style.transform = `scaleY(${1 - p.skillCd / turret.cooldown})`; el.skill.className = 'cool'; el.skillTxt.textContent = Math.ceil(p.skillCd); }
      else { el.skillFill.style.transform = 'scaleY(1)'; el.skill.className = 'ready'; el.skillTxt.textContent = IS_TOUCH ? 'TURRET' : 'Q'; }

      el.wave.textContent = game.waveLabel();
      el.waveSub.textContent = game.waveSub();

      // target info from what's under the crosshair
      camBasis();
      const w = rayWorld(camera.position, _fwd, 120);
      const hit = rayEnemies(camera.position, _fwd, w.t);
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
      if (g) {
        const px = Math.tan(spreadFor(g) * Math.PI / 180) / Math.tan(camera.fov * Math.PI / 360) * window.innerHeight / 2;
        crossKick = Math.max(0, crossKick - dt * 40);
        el.cross.style.setProperty('--gap', (clamp(px, 3, 70) + crossKick) + 'px');
        el.cross.style.opacity = player.adsK > 0.85 && g.type === 'sniper' ? 0 : 1;
      }

      const boss = enemies.find((e) => e.alive && e.def.boss);
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
      el.hurt.style.opacity = hurtA;
      el.shield.style.opacity = shieldA;
      el.low.style.opacity = !p.downed && p.hp < p.maxHp * 0.3 ? 0.5 + Math.sin(performance.now() / 180) * 0.2 : 0;
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
      const cx = W / 2, cy = H / 2;
      if (marker > 0) {
        marker -= dt;
        octx.strokeStyle = markerKind === 2 ? '#ff3b2a' : markerKind === 1 ? '#ffd23a' : '#ffffff';
        octx.lineWidth = markerKind ? 3 : 2;
        const r1 = 7, r2 = markerKind === 2 ? 17 : 13;
        octx.beginPath();
        for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { octx.moveTo(cx + sx * r1, cy + sy * r1); octx.lineTo(cx + sx * r2, cy + sy * r2); }
        octx.stroke();
      }

      // damage direction arcs
      for (let i = hurtArcs.length - 1; i >= 0; i--) {
        const h = hurtArcs[i];
        h.t -= dt * 1.2;
        if (h.t <= 0) { hurtArcs.splice(i, 1); continue; }
        let rel = h.a - player.yaw; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
        const ang = -Math.PI / 2 - rel;
        octx.strokeStyle = `rgba(255,50,30,${h.t})`;
        octx.lineWidth = 7;
        octx.beginPath(); octx.arc(cx, cy, Math.min(W, H) * 0.2, ang - 0.3, ang + 0.3); octx.stroke();
      }

      // compass
      const cw = Math.min(380, W - 140), cxl = (W - cw) / 2, cyc = 22 + (parseFloat(getComputedStyle(document.documentElement).paddingTop) || 0);
      octx.fillStyle = 'rgba(28,17,10,0.55)';
      octx.fillRect(cxl, cyc - 12, cw, 24);
      const k = cw / (Math.PI * 0.9);
      const mark = (a, label, color, size) => {
        let rel = a - player.yaw; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
        const x = cx - rel * k;
        if (x < cxl + 6 || x > cxl + cw - 6) return;
        if (label) { octx.font = `${size}px Bangers, Impact, sans-serif`; octx.textAlign = 'center'; octx.fillStyle = color; octx.fillText(label, x, cyc + 6); }
        else { octx.fillStyle = color; octx.beginPath(); octx.moveTo(x, cyc + 9); octx.lineTo(x - 5, cyc); octx.lineTo(x + 5, cyc); octx.fill(); }
      };
      mark(0, 'N', '#ffd23a', 18); mark(Math.PI, 'S', '#fff3dc', 16); mark(-Math.PI / 2, 'E', '#fff3dc', 16); mark(Math.PI / 2, 'W', '#fff3dc', 16);
      for (let i = 0; i < 8; i++) mark(i * Math.PI / 4 + Math.PI / 8, '·', 'rgba(255,243,220,0.6)', 18);
      for (const e of enemies) if (e.alive) mark(Math.atan2(-(e.pos.x - player.pos.x), -(e.pos.z - player.pos.z)), null, e.def.boss ? '#ff8a1c' : '#ff3b2a');
      for (const d of drops) if (d.kind === 'item' && d.item.rarity >= 2) mark(Math.atan2(-(d.pos.x - player.pos.x), -(d.pos.z - player.pos.z)), '◆', RARITY[d.item.rarity].css, 14);
      if (game.chest && !game.chest.opened) mark(Math.atan2(-(game.chest.pos.x - player.pos.x), -(game.chest.pos.z - player.pos.z)), '▣', '#ffd23a', 16);
    },
  };
})();
