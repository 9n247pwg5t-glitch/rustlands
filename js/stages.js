'use strict';
// Campaign (narrative bible §7): main menu → stage select → briefing → stage → results → stage
// select. Stages are listed here and loaded one at a time; the save file keeps the player's level,
// gear and stage unlocks between stages and between sessions.

// A stage: what the select screen and briefing show, how it's won, and load/unload hooks that
// build and tear down its world, so only the current stage exists in the scene. A stage unlocks
// when the one before it in this list is completed; `ready: false` stages are listed but can't be
// entered yet. Names here are placeholders until the creator names the stages (see docs/).
const STAGES = [
  {
    id: 'stage-1', title: 'Stage 1', subtitle: 'Prototype arena · placeholder',
    env: 'The desert test arena, standing in until the first real stage is built.',
    objective: 'Clear 5 waves. The 5th is a boss wave.',
    waves: 5, ready: true, preview: 'snapshot',
    load() {}, unload() {}, // the arena is the world built at boot
  },
  { id: 'stage-2', title: 'Stage 2', subtitle: 'Not built yet', ready: false },
  { id: 'stage-3', title: 'Stage 3', subtitle: 'Not built yet', ready: false },
];

// ---------------------------------------------------------------------------
// Save file (this browser's localStorage; reading or writing can fail, e.g. in private browsing)
const SAVE_KEY = 'rustlands.save.v1';
const campaign = { save: null, stage: null, stageIdx: -1, runT: 0, extractT: 0, previewUrl: null, newGameArmed: 0 };

function freshSave() { return { v: 1, player: null, stages: {} }; }
function readSave() {
  try { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); return d && d.v === 1 ? d : null; } catch (e) { return null; }
}
function writeSave() {
  if (!campaign.save) return false;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(campaign.save)); return true; } catch (e) { return false; }
}
const stageRecord = (id) => campaign.save.stages[id] || (campaign.save.stages[id] = { completed: false, clears: 0, bestWave: 0 });
const stageUnlocked = (i) => i === 0 || !!(campaign.save.stages[STAGES[i - 1].id] || {}).completed;

// The player's persistent state: progression, gear and supplies (all plain data).
function snapshotPlayer() {
  return {
    level: player.level, xp: player.xp, cash: player.cash, cur: player.cur, grenades: player.grenades,
    weapons: player.weapons, shieldItem: player.shieldItem, ammo: player.ammo,
  };
}
function savePlayer() { campaign.save.player = JSON.parse(JSON.stringify(snapshotPlayer())); return writeSave(); }
function restorePlayer(p) {
  resetPlayer();
  if (!p) return;
  Object.assign(player, { level: p.level, xp: p.xp, cash: p.cash, cur: p.cur || 0, grenades: p.grenades });
  player.weapons = [0, 1, 2, 3].map((i) => (p.weapons && p.weapons[i]) || null);
  if (!player.gun()) player.cur = player.weapons.findIndex(Boolean);
  player.shieldItem = p.shieldItem || player.shieldItem;
  Object.assign(player.ammo, p.ammo);
  // new items must not reuse the ids of saved ones
  for (const it of [...player.weapons, player.shieldItem]) if (it && it.id >= _itemId) _itemId = it.id + 1;
  player.recomputeMaxHp();
  player.hp = player.maxHp;
  player.shield = player.shieldMax();
  setViewmodel();
}

// ---------------------------------------------------------------------------
// Screens
function showMainMenu() {
  game.state = 'menu';
  campaign.save = campaign.save || readSave();
  const s = campaign.save, has = !!(s && s.player);
  $('btnContinue').hidden = !has;
  $('btnNew').classList.toggle('alt', has);
  $('btnNew').textContent = has ? 'NEW GAME' : 'START';
  campaign.newGameArmed = 0;
  if (has) {
    const cleared = STAGES.filter((st) => (s.stages[st.id] || {}).completed).length;
    $('saveLine').textContent = `Level ${s.player.level} · $${Math.floor(s.player.cash).toLocaleString()} · ${cleared} of ${STAGES.length} stages cleared`;
  } else $('saveLine').textContent = 'Shoot. Loot. Clear the stages.';
  show('menu');
}

function continueGame() {
  SFX.init();
  restorePlayer(campaign.save.player);
  showStageSelect();
}
function newGame() {
  // a second tap within 3 s confirms erasing an existing save
  if (campaign.save && campaign.save.player && performance.now() - campaign.newGameArmed > 3000) {
    campaign.newGameArmed = performance.now();
    $('btnNew').textContent = 'TAP AGAIN TO ERASE SAVE';
    setTimeout(() => { if (game.state === 'menu' && !screens.menu.hidden) showMainMenu(); }, 3000);
    return;
  }
  SFX.init();
  campaign.save = freshSave();
  resetPlayer();
  savePlayer();
  showStageSelect();
}

function stagePreview(st) {
  if (st.preview !== 'snapshot') return '';
  if (!campaign.previewUrl) {
    try { renderer.render(scene, camera); campaign.previewUrl = renderer.domElement.toDataURL('image/jpeg', 0.7); } catch (e) { return ''; }
  }
  return `url("${campaign.previewUrl}")`;
}
function stageState(i) {
  const st = STAGES[i], rec = campaign.save.stages[st.id];
  if (!stageUnlocked(i)) return 'locked';
  if (!st.ready) return 'dev';
  return rec && rec.completed ? 'done' : 'open';
}
const STATE_LABEL = { locked: 'LOCKED', dev: 'IN DEVELOPMENT', open: 'UNLOCKED', done: 'COMPLETED ✓' };

function showStageSelect() {
  game.state = 'menu';
  if (document.pointerLockElement) document.exitPointerLock();
  const grid = $('stageGrid');
  grid.textContent = '';
  STAGES.forEach((st, i) => {
    const state = stageState(i), rec = campaign.save.stages[st.id];
    const card = document.createElement('button');
    card.className = 'stage-card';
    card.dataset.state = state;
    card.disabled = state === 'locked' || state === 'dev';
    const pv = document.createElement('div');
    pv.className = 'preview';
    pv.style.backgroundImage = state === 'locked' ? '' : stagePreview(st);
    const badge = document.createElement('span');
    badge.className = 'badge ' + state;
    badge.textContent = STATE_LABEL[state];
    pv.append(badge);
    const body = document.createElement('div');
    body.className = 'card-body';
    const info = state === 'locked' ? `Complete ${STAGES[i - 1].title} to unlock`
      : state === 'dev' ? 'Unlocked. Coming in a later update.'
      : rec && rec.clears ? `Cleared ${rec.clears}× · best wave ${rec.bestWave}` : st.objective;
    body.innerHTML = `<div class="card-title"></div><div class="card-sub"></div><div class="card-info"></div>`;
    body.children[0].textContent = st.title;
    body.children[1].textContent = st.subtitle;
    body.children[2].textContent = info;
    card.append(pv, body);
    card.addEventListener('click', () => openBrief(i));
    grid.append(card);
  });
  show('stages');
}

function stageReward(first) {
  const k = first ? 1 : 0.25;
  return { cash: Math.round(300 * levelScale(player.level) * k), xp: Math.round(player.xpNeeded() * 0.6 * k) };
}
function openBrief(i) {
  const st = STAGES[i], rec = campaign.save.stages[st.id];
  campaign.stageIdx = i;
  $('briefPreview').style.backgroundImage = stagePreview(st);
  $('briefTitle').textContent = st.title;
  $('briefSub').textContent = st.subtitle;
  $('briefEnv').textContent = st.env;
  $('briefObj').textContent = st.objective;
  const r = stageReward(!(rec && rec.completed));
  $('briefReward').textContent = `$${r.cash.toLocaleString()} · ${r.xp.toLocaleString()} XP${rec && rec.completed ? ' (replay)' : ''}, plus everything you loot`;
  $('briefRecord').textContent = rec && rec.clears ? `Cleared ${rec.clears}× · best wave ${rec.bestWave}` : 'Not cleared yet';
  show('brief');
}

// ---------------------------------------------------------------------------
// Running a stage
function startStage(i) {
  if (campaign.stage && campaign.stage !== STAGES[i]) campaign.stage.unload();
  campaign.stage = STAGES[i];
  campaign.stage.load();
  campaign.runT = 0;
  player.stats = { kills: 0, crits: 0, shots: 0, damage: 0 };
  startGame();
}
// The last wave is cleared: a short window to grab the loot, then the results.
function stageCleared() {
  game.phase = 'complete';
  campaign.extractT = 20;
  hud.banner('STAGE CLEARED', 'Grab your loot · extraction in 20s');
  SFX.levelUp();
}
function finishStage(completed) {
  const st = campaign.stage, rec = stageRecord(st.id);
  rec.bestWave = Math.max(rec.bestWave, completed ? st.waves : game.wave - 1);
  let lines = [];
  if (completed) {
    const first = !rec.completed;
    const r = stageReward(first);
    rec.completed = true; rec.clears++;
    player.cash += r.cash;
    player.addXp(r.xp);
    const next = STAGES[campaign.stageIdx + 1];
    lines = [
      `<b>${st.title}</b> cleared${first ? ' for the first time' : ''}`,
      `${player.stats.kills} kills · ${player.stats.crits} crits · ${fmtTime(campaign.runT)}`,
      `Reward: <b>+$${r.cash.toLocaleString()}</b> · <b>+${r.xp.toLocaleString()} XP</b>`,
    ];
    if (first && next) lines.push(next.ready ? `<b>${next.title}</b> unlocked` : `<b>${next.title}</b> unlocked (coming in a later update)`);
  } else {
    lines = [`Left <b>${st.title}</b> on wave ${game.wave}`, 'Your level, cash and gear are kept. The stage isn\'t marked cleared.'];
  }
  player.alive = true; player.downed = false;
  const saved = savePlayer();
  if (!saved) lines.push('<i>Progress couldn\'t be saved in this browser (storage is blocked).</i>');
  game.state = 'menu';
  clearStageWorld();
  if (document.pointerLockElement) document.exitPointerLock();
  $('resTitle').textContent = completed ? 'STAGE COMPLETE' : 'STAGE LEFT';
  $('resStats').innerHTML = lines.map((l) => `<div>${l}</div>`).join('');
  show('results');
}
// From the pause or death screen: leaving after the last wave counts as finishing.
function leaveStage() { finishStage(game.phase === 'complete'); }
function fmtTime(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ':' + String(s).padStart(2, '0'); }

$('btnContinue').addEventListener('click', continueGame);
$('btnNew').addEventListener('click', newGame);
$('btnStagesBack').addEventListener('click', showMainMenu);
$('btnBriefBack').addEventListener('click', showStageSelect);
$('btnBriefGo').addEventListener('click', () => startStage(campaign.stageIdx));
$('btnResDone').addEventListener('click', showStageSelect);
// keep mid-stage progress if the tab is closed or the phone locks
document.addEventListener('visibilitychange', () => { if (document.hidden && campaign.save && campaign.save.player && campaign.stage && game.state !== 'menu') savePlayer(); });
