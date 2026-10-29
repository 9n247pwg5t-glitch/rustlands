const { chromium } = require('playwright');
const fs = require('fs');
const T = {
  Hips: [0, 0.60, 0.0], Spine: [0, 0.82, 0.02], Spine1: [0, 1.10, 0.03], Spine2: [0, 1.40, 0.02], Neck: [0, 1.84, 0.02], Head: [0, 1.95, 0.04], HeadTop_End: [0, 2.26, 0.04],
};
for (const [s, sx] of [['Left', 1], ['Right', -1]]) Object.assign(T, {
  [s + 'Shoulder']: [0.14 * sx, 1.72, -0.03], [s + 'Arm']: [0.56 * sx, 1.70, -0.08], [s + 'ForeArm']: [0.78 * sx, 1.40, 0.0], [s + 'Hand']: [0.80 * sx, 0.98, 0.05], [s + 'HandEnd']: [0.80 * sx, 0.84, 0.08],
  [s + 'UpLeg']: [0.22 * sx, 0.58, 0.0], [s + 'Leg']: [0.24 * sx, 0.37, 0.02], [s + 'Foot']: [0.24 * sx, 0.17, 0.0], [s + 'ToeBase']: [0.24 * sx, 0.03, 0.16], [s + 'Toe_End']: [0.24 * sx, 0.02, 0.28],
});
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl'] });
  const p = await b.newPage();
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  p.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text().slice(0, 200)); });
  await p.goto('http://localhost:8766/conv/rig.html');
  await p.waitForFunction(() => window.ready, null, { timeout: 60000 });
  const r = await p.evaluate(([T]) => rig('../brawler.glb', './male-psychosis-top-heavy.json', T), [T]);
  fs.mkdirSync('glb2', { recursive: true });
  fs.writeFileSync('glb2/Brawler_Clown.glb', Buffer.from(r.glb, 'base64'));
  delete r.glb;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
