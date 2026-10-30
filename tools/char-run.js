const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl'] });
  const p = await b.newPage();
  p.on('pageerror', (e) => console.log('pageerror:', e.message));
  p.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 200)); });
  await p.goto('http://localhost:8766/conv/char.html');
  await p.waitForFunction(() => window.ready);
  const only = process.argv.slice(2);
  for (const f of fs.readdirSync('chars').filter((f) => f.endsWith('.fbx') && (!only.length || only.some((o) => f.startsWith(o))))) {
    const name = f.replace(/\.fbx$/, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/_$/, '');
    const t0 = Date.now();
    const r = await p.evaluate((u) => convert(u), 'http://localhost:8766/chars/' + encodeURIComponent(f));
    fs.writeFileSync('glb/' + name + '.glb', Buffer.from(r.glb, 'base64'));
    console.log(name, ((Date.now() - t0) / 1000).toFixed(1) + 's', fs.statSync('glb/' + name + '.glb').size, JSON.stringify(r.info));
  }
  await b.close();
})();
