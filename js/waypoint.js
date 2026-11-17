'use strict';
// The mission waypoint (2026-11-17: "use this as a mission waypoint, i.e. when prompted to enter a
// new area, when the mission objective changes"). One at a time: the creator's animated arrow
// (ui/enter-arrow.png, the GIF's 6 frames side by side) bobbing over where the current objective
// is, the distance under it, and the HUD's screen-edge pointer to it when it's off screen. Setting
// one names the new objective in the log. Used for: the hub console (pick a stage), the curtain once
// the yard is clear (the way to the next area), and the cul-de-sac's stage while the boss is on his
// way in. To change the art, replace the image (any number of frames: WAYPOINT_FRAMES).

const WAYPOINT_FRAMES = 6;
const WAYPOINT = (() => {
  const tex = new THREE.TextureLoader().load('ui/enter-arrow.png');
  tex.repeat.set(1 / WAYPOINT_FRAMES, 1);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sp.scale.set(1.7, 1.7, 1); sp.renderOrder = 8; sp.visible = false;
  scene.add(sp);
  // the distance, drawn on a small canvas only when it changes
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 48;
  const dtex = new THREE.CanvasTexture(cv);
  const ds = new THREE.Sprite(new THREE.SpriteMaterial({ map: dtex, transparent: true, depthWrite: false, depthTest: false }));
  ds.scale.set(1.3, 0.49, 1); ds.renderOrder = 8; ds.visible = false;
  scene.add(ds);
  return { sp, tex, ds, dtex, g: cv.getContext('2d'), at: null, h: 3.4, t: 0, shown: -1, label: '' };
})();

// Point the waypoint at `pos` (a Vector3). opts: label (the objective, logged when it's new),
// h (height of the arrow over the spot), color (the log line's).
function setWaypoint(pos, opts = {}) {
  const W = WAYPOINT;
  W.at = pos.clone(); W.h = opts.h != null ? opts.h : 3.4;
  W.sp.visible = W.ds.visible = true; W.shown = -1;
  if (opts.label && opts.label !== W.label && typeof hud !== 'undefined') hud.log('Objective: ' + opts.label, opts.color || '#ffd23a');
  W.label = opts.label || '';
}
function clearWaypoint() { const W = WAYPOINT; W.at = null; W.label = ''; W.sp.visible = W.ds.visible = false; }
const waypointAt = () => WAYPOINT.at;

function updateWaypoint(dt) {
  const W = WAYPOINT;
  if (!W.at) return;
  W.t += dt;
  W.sp.position.set(W.at.x, W.at.y + W.h + Math.sin(W.t * 4) * 0.25, W.at.z);
  W.tex.offset.x = (Math.floor(W.t / 0.12) % WAYPOINT_FRAMES) / WAYPOINT_FRAMES;
  // distance under the arrow (hidden once you're there)
  const d = Math.round(Math.hypot(player.pos.x - W.at.x, player.pos.z - W.at.z));
  W.ds.visible = d > 3;
  W.ds.position.set(W.at.x, W.at.y + W.h - 1.05 + Math.sin(W.t * 4) * 0.25, W.at.z);
  if (d !== W.shown && W.ds.visible) {
    W.shown = d;
    const g = W.g; g.clearRect(0, 0, 128, 48);
    g.font = '34px Bangers, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 6; g.strokeStyle = '#1c110a'; g.strokeText(d + ' m', 64, 26);
    g.fillStyle = '#ffd23a'; g.fillText(d + ' m', 64, 26);
    W.dtex.needsUpdate = true;
  }
}
