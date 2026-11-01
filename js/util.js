'use strict';
// Shared helpers: math, randomness, value noise, synthesized audio.

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

function weighted(entries) {
  let sum = 0;
  for (const e of entries) sum += e[1];
  let r = Math.random() * sum;
  for (const e of entries) { if ((r -= e[1]) <= 0) return e[0]; }
  return entries[entries.length - 1][0];
}

// Seeded RNG so the arena layout is the same every run.
function makeRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const PERM = new Uint8Array(512);
(function () {
  const rng = makeRng(1337);
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();
function hash2(x, z) { return PERM[(PERM[x & 255] + z) & 511] / 255; }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1;
}
function fbm(x, z, oct = 4) {
  let s = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += vnoise(x * f, z * f) * amp; f *= 2.03; amp *= 0.5; }
  return s;
}

// ---------------------------------------------------------------------------
// Audio: everything is synthesized with WebAudio, no sound files.
const SFX = (() => {
  let ctx = null, master = null, noiseBuf = null;
  let muted = false;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain();
    master.gain.value = 0.45;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function noise(dur, freq, q, vol, type = 'lowpass', when = 0, sweepTo = 0) {
    if (!ctx || muted || vol <= 0.001) return;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t, Math.random() * 1.2); src.stop(t + dur + 0.05);
  }

  function tone(freq, dur, vol, type = 'square', when = 0, slideTo = 0) {
    if (!ctx || muted || vol <= 0.001) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0008, t); g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  return {
    init,
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
    shot(type, elem) {
      switch (type) {
        case 'pistol': noise(0.13, 2600, 0.8, 0.45); tone(170, 0.09, 0.3, 'triangle', 0, 60); break;
        case 'smg': noise(0.07, 3200, 0.8, 0.3); tone(220, 0.05, 0.18, 'triangle', 0, 90); break;
        case 'ar': noise(0.11, 2100, 0.8, 0.4); tone(130, 0.08, 0.3, 'triangle', 0, 50); break;
        case 'shotgun': noise(0.32, 1300, 0.6, 0.75); tone(85, 0.22, 0.5, 'sine', 0, 35); break;
        case 'sniper': noise(0.55, 1900, 0.6, 0.75); tone(95, 0.35, 0.5, 'sine', 0, 30); noise(0.6, 600, 0.5, 0.25, 'lowpass', 0.05, 120); break;
        case 'launcher': noise(0.45, 900, 0.6, 0.55, 'lowpass', 0, 200); tone(70, 0.3, 0.4, 'sine', 0, 30); break;
      }
      if (elem === 'shock') tone(1400, 0.08, 0.06, 'sawtooth', 0, 400);
      else if (elem === 'fire') noise(0.15, 500, 1, 0.12, 'bandpass');
      else if (elem === 'corrosive') tone(500, 0.1, 0.05, 'sawtooth', 0, 900);
    },
    boom(size = 1, vol = 1) {
      noise(0.9 * size, 1000, 0.7, 0.9 * vol, 'lowpass', 0, 70);
      tone(65, 0.6 * size, 0.6 * vol, 'sine', 0, 28);
    },
    hit(crit) {
      noise(0.05, 2400, 1.2, 0.14, 'bandpass');
      if (crit) { tone(2300, 0.16, 0.16, 'triangle'); tone(3450, 0.12, 0.07, 'sine', 0.01); tone(160, 0.08, 0.2, 'sine', 0, 70); }
      else tone(1250, 0.04, 0.09, 'square');
    },
    shieldHit() { tone(800, 0.05, 0.07, 'sawtooth', 0, 1400); },
    kill() { noise(0.14, 900, 0.8, 0.25); tone(520, 0.09, 0.16, 'square', 0, 260); tone(980, 0.12, 0.12, 'square', 0.07); },
    pickup() { tone(700, 0.06, 0.13, 'triangle'); tone(1050, 0.09, 0.13, 'triangle', 0.06); },
    cash() { tone(1500, 0.05, 0.1, 'square'); tone(2100, 0.08, 0.08, 'square', 0.05); },
    rareDrop(r) {
      const notes = [523, 659, 784, 1046, 1318];
      for (let i = 0; i <= r; i++) tone(notes[i], 0.25, 0.1, 'triangle', i * 0.07);
    },
    shieldBreak() { tone(900, 0.4, 0.22, 'sawtooth', 0, 90); noise(0.3, 3000, 1, 0.2, 'highpass'); },
    shieldUp() { tone(300, 0.5, 0.1, 'sine', 0, 1300); },
    hurt() { noise(0.16, 500, 1, 0.35); tone(140, 0.12, 0.2, 'square', 0, 80); },
    enemyShot(vol = 1) { tone(760, 0.14, 0.1 * vol, 'sawtooth', 0, 220); noise(0.08, 1800, 1, 0.12 * vol); },
    reload() { tone(320, 0.04, 0.1, 'square'); tone(520, 0.05, 0.1, 'square', 0.22); },
    empty() { tone(1100, 0.02, 0.1, 'square'); },
    swing() { noise(0.16, 1600, 2, 0.3, 'bandpass', 0, 400); },
    // a heavy blade arriving: low whoosh into a thud
    chop(connect) { noise(0.2, 900, 1.5, 0.32, 'bandpass', 0, 220); if (connect) { tone(110, 0.16, 0.32, 'sine', 0.02, 45); noise(0.09, 600, 1, 0.3, 'lowpass', 0.02); } },
    jump() { tone(200, 0.08, 0.06, 'sine', 0, 320); },
    land() { noise(0.08, 400, 1, 0.12); },
    levelUp() { [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 0.12, 'square', i * 0.09)); },
    wave() { tone(220, 0.5, 0.15, 'sawtooth', 0, 110); tone(330, 0.5, 0.12, 'sawtooth', 0.1, 165); },
    yell(vol = 1) { tone(rand(260, 420), 0.45, 0.07 * vol, 'sawtooth', 0, rand(500, 700)); },
    growl(vol = 1) { noise(0.35, 300, 4, 0.25 * vol, 'bandpass', 0, 160); },
    turret() { tone(1600, 0.03, 0.05, 'square'); noise(0.04, 4000, 1, 0.08, 'highpass'); },
    deploy() { tone(400, 0.2, 0.12, 'square', 0, 900); tone(900, 0.15, 0.1, 'square', 0.15); },
    chest() { tone(200, 0.2, 0.15, 'square', 0, 400); [523, 784, 1046].forEach((f, i) => tone(f, 0.2, 0.1, 'triangle', 0.2 + i * 0.08)); },
    buy() { tone(880, 0.06, 0.12, 'square'); tone(1320, 0.1, 0.1, 'square', 0.07); },
    deny() { tone(180, 0.18, 0.14, 'square'); },
    down() { tone(400, 1.2, 0.18, 'sawtooth', 0, 60); },
    secondWind() { [262, 330, 392, 523, 659, 784].forEach((f, i) => tone(f, 0.25, 0.12, 'square', i * 0.06)); },
  };
})();
