# Model tools

How the enemy characters and animations in `models/` were built from Mixamo FBX exports.
Needs `npm install three@0.128.0 @gltf-transform/core@4 @gltf-transform/functions@4 @gltf-transform/extensions@4 meshoptimizer sharp`
and Playwright (for the browser step).

1. **Animations** (Mixamo, "without skin"): `node convert.mjs <dir of .fbx> ../models/enemy-anims.json`
   keeps bone rotations and the hips' height, drops travel across the floor, thins keys.
   `node peaks.mjs "Hook" "Mma Kick 1" ...` prints when each punch or kick reaches furthest forward
   (used for the impact times in `js/rigs.js`).
2. **Characters** (Mixamo, "with skin"): serve this folder's parent over HTTP, then
   `node char-run.js` loads each FBX in a headless browser with three.js's FBXLoader, merges duplicate
   skeleton copies, splits multi-material meshes, shrinks textures and exports a GLB.
3. `node optimize.mjs <glb dir> ../models 16000` simplifies each character to about 16k vertices,
   re-encodes textures as WebP and writes glTF JSON (buffer embedded) plus texture files.
4. Add the file to `RIG_FILES` in `js/rigs.js` and use it in `RIG_LOOKS`.
