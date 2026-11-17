'use strict';
// The mission waypoint (2026-11-17: "use this as a mission waypoint, i.e. when prompted to enter a
// new area, when the mission objective changes"). One at a time: the creator's yellow diamond
// (ui/waypoint.png, cut out of its black background keeping its ink outline and glow), its point
// down on where the current objective is, bobbing and pulsing, the distance above it, and the
// HUD's screen-edge pointer to it when it's off screen. Setting one names the new objective in the
// log. Used for: the hub console (pick a stage), the curtain once
// the yard is clear (the way to the next area), and the cul-de-sac's stage while the boss is on his
// way in. To change the art, replace the image (a sheet of frames side by side: WAYPOINT_FRAMES).

const WAYPOINT_FRAMES = 1, WAYPOINT_SIZE = [1.5, 2.25];
const WAYPOINT = (() => {
  const tex = new THREE.TextureLoader().load('ui/waypoint.png');
  tex.repeat.set(1 / WAYPOINT_FRAMES, 1);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sp.center.set(0.5, 0); // the diamond's point sits on the spot
  sp.scale.set(WAYPOINT_SIZE[0], WAYPOINT_SIZE[1], 1); sp.renderOrder = 8; sp.visible = false;
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
  W.at = pos.clone(); W.h = opts.h != null ? opts.h : 0.5;
  W.sp.visible = W.ds.visible = true; W.shown = -1;
  if (opts.label && opts.label !== W.label && typeof hud !== 'undefined') hud.log('Objective: ' + opts.label, opts.color || '#ffd23a');
  W.label = opts.label || '';
}
function clearWaypoint() { const W = WAYPOINT; W.at = null; W.label = ''; W.sp.visible = W.ds.visible = false; }
// (the HUD's edge pointer aims at the middle of the marker, so it shows whenever the marker is off screen)
const _wpMid = new THREE.Vector3();
const waypointAt = () => (WAYPOINT.at ? _wpMid.set(WAYPOINT.at.x, WAYPOINT.at.y + WAYPOINT.h + WAYPOINT_SIZE[1] * 0.5, WAYPOINT.at.z) : null);

function updateWaypoint(dt) {
  const W = WAYPOINT;
  if (!W.at) return;
  W.t += dt;
  const bob = Math.sin(W.t * 4) * 0.22, pulse = 1 + Math.sin(W.t * 6) * 0.06;
  W.sp.position.set(W.at.x, W.at.y + W.h + bob, W.at.z);
  W.sp.scale.set(WAYPOINT_SIZE[0] * pulse, WAYPOINT_SIZE[1] * pulse, 1);
  if (WAYPOINT_FRAMES > 1) W.tex.offset.x = (Math.floor(W.t / 0.12) % WAYPOINT_FRAMES) / WAYPOINT_FRAMES;
  // distance over the marker (hidden once you're there)
  const d = Math.round(Math.hypot(player.pos.x - W.at.x, player.pos.z - W.at.z));
  W.ds.visible = d > 3;
  W.ds.position.set(W.at.x, W.at.y + W.h + WAYPOINT_SIZE[1] + 0.35 + bob, W.at.z);
  if (d !== W.shown && W.ds.visible) {
    W.shown = d;
    const g = W.g; g.clearRect(0, 0, 128, 48);
    g.font = '34px Bangers, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 6; g.strokeStyle = '#1c110a'; g.strokeText(d + ' m', 64, 26);
    g.fillStyle = '#ffd23a'; g.fillText(d + ' m', 64, 26);
    W.dtex.needsUpdate = true;
  }
}
