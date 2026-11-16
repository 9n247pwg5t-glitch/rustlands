const { chromium } = require('playwright');
const fs = require('fs');
// joint targets for the bear-suit clown (tools: rig.html), A-pose, metres
const T = { Hips: [0, 0.8, 0.0], Spine: [0, 0.92, 0.0], Spine1: [0, 1.1, 0.0], Spine2: [0, 1.3, 0.0], Neck: [0, 1.55, 0.0], Head: [0, 1.64, 0.03], HeadTop_End: [0, 2.12, 0.03] };
for (const [s, sx] of [['Left', 1], ['Right', -1]]) Object.assign(T, {
  [s + 'Shoulder']: [0.16 * sx, 1.46, -0.01], [s + 'Arm']: [0.42 * sx, 1.43, 0.0], [s + 'ForeArm']: [0.66 * sx, 1.14, 0.02], [s + 'Hand']: [0.84 * sx, 0.88, 0.04], [s + 'HandEnd']: [0.89 * sx, 0.7, 0.05],
  [s + 'UpLeg']: [0.21 * sx, 0.74, 0.0], [s + 'Leg']: [0.24 * sx, 0.45, 0.02], [s + 'Foot']: [0.25 * sx, 0.17, 0.0], [s + 'ToeBase']: [0.26 * sx, 0.06, 0.2], [s + 'Toe_End']: [0.26 * sx, 0.05, 0.38],
});
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl'] });
  const p = await b.newPage();
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  await p.goto('http://localhost:8766/conv/rig.html');
  await p.waitForFunction(() => window.ready, null, { timeout: 60000 });
  const r = await p.evaluate(([T]) => rig('./bear.glb', './male-psychosis-top-heavy.json', T), [T]);
  fs.mkdirSync('conv/bear-out', { recursive: true });
  fs.writeFileSync('conv/bear-out/bear-clown.glb', Buffer.from(r.glb, 'base64'));
  delete r.glb; console.log(JSON.stringify(r).slice(0, 1500));
  await b.close();
})();
