# Model tools

How the enemy characters and animations in `models/` were built from Mixamo FBX exports.
Needs `npm install three@0.128.0 @gltf-transform/core@4 @gltf-transform/functions@4 @gltf-transform/extensions@4 meshoptimizer sharp`
and Playwright (for the browser step).

1. **Animations** (Mixamo, "without skin"): `node convert.mjs <dir of .fbx> ../models/enemy-anims.json`
   keeps bone rotations and the hips' height, drops travel across the floor, thins keys.
   New clips can also be converted on their own (`node convert.mjs <dir> new.json`) and merged into
   `enemy-anims.json` with their hipsY scaled by the ratio of the two files' `restHipsY` (that's how the
   2026-11-09 axe clips and the 2026-11-10 Stand To Roll dodge were added). `node peaks.mjs "Hook" "Mma Kick 1" ...` prints when each punch or kick reaches furthest forward
   (used for the impact times in `js/rigs.js`). `node gait.mjs "Rifle Run" ...` measures each movement
   clip's real ground speed from its planted feet and whether it turns (e.g. a run that circles).
2. **Characters** (Mixamo, "with skin"): serve this folder's parent over HTTP, then
   `node char-run.js` loads each FBX in a headless browser with three.js's FBXLoader, merges duplicate
   skeleton copies, splits multi-material meshes, shrinks textures and exports a GLB.
3. `node optimize.mjs <glb dir> ../models 60000 --tex 2048 --normals 2048 --meshopt 1` welds each
   character and simplifies it only past the vertex budget (the uploaded characters fit, so they keep
   their full geometry), keeps colour textures and normal maps up to 2048 (without `--normals` they're
   dropped), packs the geometry with EXT_meshopt_compression (the game decodes it with
   `vendor/meshopt_decoder.js`), re-encodes textures as WebP and writes glTF JSON (buffer embedded) plus
   texture files. The weapons use `30000 --meshopt 1`. `--error` (default 0.01) lets the simplifier move the surface further to reach a small budget: the bleacher crowd's `-crowd` copies of the colourful clowns (strung-out, showgirl, gangster) are the `-td` ones run through `2000 --tex 512 --meshopt 1 --error 0.15` (2.8–4.7k vertices).
4. Add the file to `RIG_FILES` in `js/rigs.js` and use it in `RIG_LOOKS`.

For the top-down view every character and weapon uses a lower-detail copy (`-td`): enemies with
`7000 --tex 512`, the player body (`models/player-body`, from the original First person player upload
with its pants, hair and beard) with `12000 --tex 1024`, guns with `1500`. For example the axe and the player's rifle: copy `models/gun-axe.json`
and `models/player-ar.json` into a folder as `gun-axe-td.gltf` and `player-ar-td.gltf`, then
`node optimize.mjs <that folder> ../models 2500 --meshopt 1` (it also reads .gltf, including meshopt-packed input).

## Rigging a static model

`rig.html` + `rig-run.js` auto-rig an unrigged humanoid mesh (facing +Z, in metres, A- or T-pose) onto
the Mixamo skeleton of a template character, so the Mixamo clips play on it. The joint targets in
`rig-run.js` were placed for the clown brawler from front and side renders; each limb joint is then
snapped to the middle of the limb. Bones are aimed at their child joints and bound in the mesh's own
pose; skin weights come from each vertex's distance to each bone relative to that bone's thickness,
with left/right bones kept to their side. Run `optimize.mjs` on the result as usual.

## Stage maps

A stage map is a GLB laid out like the uploaded clown gas station: meshes flagged in their extras as
`ground` (walkable) or `collider` (solid), instanced scatter (`EXT_mesh_gpu_instancing`), empty
marker nodes (`PlayerSpawn`, `EnemySpawn_N`, `Loot_*`, `StoreEntrance`...) and `bounds` on the root.

1. `node map-optimize.mjs <map.glb> ../models <name> [--tex 1024]` simplifies the terrain mesh,
   drops the point lights (too costly on phones), re-encodes textures as WebP and packs the geometry
   with meshopt, writing `<name>.json` plus texture files.
2. `node map-bake.mjs <map.glb> ../models/<name>-data.json` bakes the gameplay data from the
   original GLB: a 0.5 m ground heightmap (low steps like curbs and pump islands raise it), box
   colliders merged from everything solid in the body's height band, trunk boxes for trees,
   spheres for rocks, a 1 m navigation grid and the marker points.
3. `js/map.js` loads both (`loadStageMap(name)`); it merges static meshes by material into 128 m
   cells and draws scatter as instanced 80 m tiles with per-kind draw distances.

The map's graffiti texture (`models/map-clown-station-T_Graffiti.webp`) had its "HA HA HA" blood lettering (the top-left
patch, 510 × 262 px of the 1024 px texture) erased by hand after conversion; redo that if the map is re-converted.
