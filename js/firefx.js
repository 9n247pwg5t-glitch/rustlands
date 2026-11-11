'use strict';
// Fire Axe's flames (decisions.md 2026-11-11): the creator's animated fire (fx/fire-sheet.webp: the
// uploaded GIF's 9 frames in a 3x3 sheet, 110 ms a frame) shown once the Fire Axe skill is bought:
// on every enemy it has set burning, and along the blade while Rampage Psychosis (when Fire Axe
// works) is on. All the flames are one instanced, camera-facing draw; each plays from its own frame.

const FIREFX = (() => {
  const MAX = 48;
  const tex = new THREE.TextureLoader().load('fx/fire-sheet.webp');
  const geo = new THREE.PlaneGeometry(1, 1);
  const frame = new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1);
  geo.setAttribute('aFrame', frame);
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex } },
    vertexShader: `attribute float aFrame; varying vec2 vUv;
      void main() {
        vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float s = length(instanceMatrix[0].xyz);
        c.xy += position.xy * s;
        gl_Position = projectionMatrix * c;
        float f = mod(floor(aFrame), 9.0);
        vUv = (vec2(mod(f, 3.0), 2.0 - floor(f / 3.0)) + uv) / 3.0;
      }`,
    fragmentShader: `uniform sampler2D map; varying vec2 vUv;
      void main() { vec4 t = texture2D(map, vUv); if (t.a < 0.08) discard; gl_FragColor = t; }`,
    transparent: true, depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, MAX);
  mesh.frustumCulled = false; mesh.renderOrder = 4; mesh.count = 0;
  scene.add(mesh);
  return { mesh, frame, t: 0 };
})();
const _ffM = new THREE.Matrix4(), _ffP = new THREE.Vector3(), _ffQ = new THREE.Quaternion(), _ffS = new THREE.Vector3(), _ffA = new THREE.Vector3(), _ffB = new THREE.Vector3();
function updateFireFx(dt) {
  const F = FIREFX;
  F.t += dt;
  let n = 0;
  const on = typeof rank === 'function' && rank('rFire') > 0 && WORLD.id === 'arena';
  const put = (p, size, seed) => {
    if (n >= 48) return;
    _ffM.compose(p, _ffQ, _ffS.setScalar(size));
    F.mesh.setMatrixAt(n, _ffM);
    F.frame.array[n] = F.t / 0.11 + seed;
    n++;
  };
  if (on) {
    // burning enemies: a big flame on the body and a smaller one lower down
    for (const e of enemies) {
      if (!e.alive || !e.dots.some((d) => d.elem === 'fire')) continue;
      if (e._ffSeed == null) e._ffSeed = Math.random() * 9;
      const h = e.height || 1.8, s = e.def.scale || 1, seed = e._ffSeed;
      put(_ffP.set(e.pos.x, e.pos.y + h * 0.55, e.pos.z), 1.3 * s, seed);
      put(_ffP.set(e.pos.x + 0.15, e.pos.y + h * 0.2, e.pos.z + 0.1), 0.9 * s, seed + 4);
    }
    // the blade, while Rampage is on: flames from the middle of the blade to its tip
    const B = TD.body;
    if (B && raging() && B.rig.blade && B.root.visible) {
      B.rig.blade.inner.getWorldPosition(_ffA); B.rig.blade.edge.getWorldPosition(_ffB);
      for (let i = 0; i < 3; i++) put(_ffP.copy(_ffA).lerp(_ffB, 0.15 + i * 0.4), 0.55 - i * 0.05, i * 3);
    }
  }
  F.mesh.count = n;
  if (n) { F.mesh.instanceMatrix.needsUpdate = true; F.frame.needsUpdate = true; }
}
