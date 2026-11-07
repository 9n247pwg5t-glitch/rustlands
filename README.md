# Rustlands

A Borderlands-style looter shooter that runs in the browser. It's top-down and cel-shaded: you pick a stage from the stage select, fight through it with an assault rifle and an axe, and keep your level, cash, mods and skills between stages.

There is no build step. The world, guns and creatures are drawn with [three.js](https://threejs.org/) primitives, and every sound is synthesized with WebAudio. The human enemies are rigged Mixamo characters driven by motion-captured Mixamo animations.

## Play

Serve the folder with any static file server and open `index.html`:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

It also works on GitHub Pages: turn Pages on for the `main` branch.

## Features

- **Assault rifle and axe.** Two weapons you switch between (Q, 1/2 or the mouse wheel; on touch, tap the corner button, hold it to reload): the assault rifle (the Ringmaster HA15 model; aim down its red-dot sight with right-click, or swipe FIRE left on touch) and an axe swung in a three-move combo: a diagonal slash, a flat backhand that can catch two enemies, and an overhead chop finisher that hits about 1.7× as hard. Swing again within about two-thirds of a second of a swing ending to go on to the next move; wait longer and it starts over. F (or KICK on touch) kicks with either weapon out: it shoves enemies back, knocks them off their feet and breaks their attacks, on a short cooldown. No grenades or turret.
- **Loot is mods.** Enemies and chests drop modifications for the rifle (barrel, magazine, optic, stock) and the axe (head, handle, charm) in five rarities, Common to Legendary. Each adds bonuses (damage, accuracy, fire rate, magazine size, reload speed, recoil, crit damage, swing speed, reach, health per hit), and barrels and axe heads can carry fire, shock or corrosive. Picking one up fits it; the one it replaces drops so you can swap back. Item cards compare against what's fitted. Enemies also drop rifle ammo, and a vending machine sells it.
- **Elements.** Fire is strong against flesh, shock against shields and corrosive against armor. Each element can also apply a damage-over-time effect.
- **Shield.** Your shield grows with your level.
- **Skill trees.** Every level up gives a skill point (the level bar shows a ★ when you have some; K or tap ★ to spend). Two trees, Assault Rifle and Melee, with ranked skills; deeper tiers open at levels 5 and 10, ending in Overdrive (rifle kills boost fire rate and damage), Berserk (axe kills boost damage and speed) and Earthsplitter (the chop sends out a shockwave).
- **Enemies.** There are Bandits, Marauders (with shields), Psychos, Suicide Psychos and Badass Nomads. Every 5th wave adds a boss, **Krag the Scrapjaw**, who has ground slams, rocket barrages and charges.
- **Top-down view.** An angled overhead camera follows you (screen up is always north), leaning a little toward where you aim. You see your own character, the uploaded Mixamo body, holding the rifle or the axe and animated with the shared clips: walking, strafing and backpedalling relative to where you aim, shooting, reloading on the upper body, the three axe combo moves (each plays an axe attack clip timed to the hit, with a blade trail) and the kick. Roofs, the canopy, ceilings and treetops are cut away in a circle around you, so buildings never hide you. Arrows at the screen edge point to enemies, good loot and the chest off screen.
- **Combat feedback.** Every enemy shot flashes a comic-book starburst at the muzzle (camera-facing, gone in 70 ms). Damage numbers pop off enemies, headshots score critical hits, and enemies fall apart when they die.
- **Fight For Your Life.** When your health hits zero you go down. Kill an enemy before the timer runs out to get a Second Wind.
- **Stage 1 map.** The uploaded clown gas station map (about 320 × 320 m playable): a forecourt under a canopy with six pumps, the store (with an interior), a car wash, a carnival tent, a carousel, woods, a farm, a pond and a highway blockaded at both ends. Enemies come in from the map's spawn points nearest you; explosive barrels stand around the pumps. It loads in the background while you're in the menus and hub.
- **Campaign.** Main menu → the hub, a room you walk around in → use the console in front of the wall of TVs (one per stage) → stage select → briefing → stage → results → back in the hub. No fighting in the hub. Stages show as locked, unlocked or completed, unlock in order, and can be replayed. Your level, XP, cash, mods, skills and ammo are saved in the browser after every wave and when you leave or finish a stage; Continue picks up where you left off. Stage 1 is the gas station map (clear 5 waves, the 5th a boss wave, then a 20-second window to grab the loot); Stages 2 and 3 are placeholders.
- **Progression.** You earn XP and level up; enemies hit hard and their level climbs a full level a wave, so mods and skills matter. Loot chests appear after each wave, and vending machines by the store sell ammo and healing. Clearing a stage pays a reward (less on replays).
- **Controls.** Made for iOS touch, with automatic aiming: firing turns you to the nearest enemy in sight and stays locked on while it's in range (the crosshair marks it), and axe swings and kicks turn toward an enemy within reach. Touch: the left stick moves; FIRE (SWING with the axe) shoots or swings at the locked-on enemy; optionally, drag on the right side to aim by hand and push all the way to fire. Desktop: WASD moves, click or J fires the same way; there's no mouse aiming.
- **Animated enemies.** Bandits, marauders, psychos, nomads and the boss are rigged Mixamo characters (a strung-out clown, a psycho clown showgirl, a burnt clown with glowing embers, a top-heavy gangster clown as the Marauder, a top-heavy brawler restyled as a bloody clown (face paint, ruffle, stripes and blood drawn by a shader) dual-wielding SMGs as the Badass Nomad and the Brute with his battle axe as the boss), cel-shaded with weapons pinned to their bones. Their weapons are four clown-built models (the Honkmaker pistol, the Calliope rifle, the Sad Sack shotgun and the Punchline axe), each repainted in a random colour and sized a little differently per enemy; a gunner fires the way its weapon does (rifle bursts, shotgun pellet spreads up close, slower, harder pistol shots), and shots leave from the barrel. They pick forward, backpedal or side-step clips from how they're actually moving relative to where they face (walking or running by speed, with playback speed matched to their ground speed), stand in proper idles (rifle, pistol or unarmed), turn and run on long moves, and they aim, shoot and reload (the reload plays on the upper body while the legs keep moving), flinch when hit (head-snap on headshots), and psychos hunch into a mutant run and swing their axes: a drawn-out wind-up and a fast strike (the clip's clock is warped around each impact, and the chest and arm over-rotate through it), stopping dead for a beat with a jolt and a shove when it connects, kicking up dust when it misses, a quick step into the blow, a trail behind the blade and a follow-through, committing to the direction just before impact so a late sidestep can dodge it, sometimes chaining into a second swing, with the blade glinting and the psycho yelling just before each blow as a warning; from a few strides away a psycho can leap at you with the axe raised and chop down as it lands (a shockwave of dust; a sidestep makes it miss and leaves it slow to recover); about one attack in seven is a kick (damage lands on the swing's impact frame), dodge-roll when aimed at, flip or slide in to close distance, get knocked down by explosions and climb back up, scream and taunt when they arrive, while circling, after landing a hit, when you hide (to bait you out) and when you're down (five taunt clips, four of them also played mirrored), and play death animations. Their hitboxes follow the animation.
- **Enemy tactics.** Gunners pick their own firing spot at their preferred range, spread apart and off to your sides, preferring cover; they hold it while side-stepping, relocate every few seconds, and fall back behind walls or rocks to recharge when their shield breaks or they're badly hurt. Behind cover they crouch, and stand to fire over it. They count their shots and reload, and lob grenades to flush you out when you hide (one grenade in the air at a time). They move in bounds: only a couple relocate at once while the rest hold and fire, and a teammate lays down covering fire when one breaks cover. They fan out around you so the fire comes from different sides, and keep their distance from each other. Only a few fire at the same moment; their bullets are fast tracer streaks. Melee enemies take turns: several engage at once (closing in from different sides around where you're facing, front, flanks and behind, cutting off a moving target by running at where it's heading, curving in on a slow one, flipping or sliding to close distance, fast enough to run down a walking player but not a sprinting one) while the rest circle close by, and after a combo some briefly back off to let another in.
- **Enemy pathfinding.** A navigation grid with a flow field toward the player and A* paths to any spot route enemies around buildings, walls, cars and rocks; they sidestep if they get stuck.

## Controls

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Move / sprint / jump | WASD / Shift / Space | Left stick (push all the way to sprint) / JUMP |
| Shoot or swing (auto-aim) | Left click or J (with the axe, keep clicking or hold for the combo) | FIRE or SWING; optional right-side aim stick (push all the way to fire) |
| Switch rifle ⇄ axe / reload | Q, 1–2 or mouse wheel / R | Tap the corner button / hold it |
| Kick | F | KICK (dims while it recharges) |
| Skills | K | ★ next to the level bar |
| Interact (pick up, open, buy, hub console) | E | Pop-up TAKE / OPEN / BUY / STAGES button |
| Skip intermission / leave a cleared stage / pause | N / N / Esc | — / pause menu / II button |

## Design docs

- `docs/narrative-bible.md`: the authoritative creative and design spec (Narrative Bible v2.0).
- `docs/decisions.md`: dated decisions approved since the bible; they override it.
- `docs/conflicts.md`: where the current prototype still differs from the bible.
- `CLAUDE.md`: working rules for Claude Code sessions in this repo (it loads the bible automatically).

## Code layout

```
index.html     markup, HUD styles
js/util.js     math, noise, synthesized audio
js/world.js    renderer, toon materials, ground, collision (with a spatial grid), ray tests, navigation, effects
js/map.js      stage maps loaded from files: toon materials, merged static cells, instanced scatter tiles, colliders, spawn points
js/loot.js     loot tables, gun models, mod drop models, item cards, world drops
js/arsenal.js  the player's rifle and axe: mods, skill trees, building the weapons, the axe combo, the kick
js/rigs.js     rigged Mixamo enemies: loading, cel shading, gear on bones, animation playback
js/enemies.js  enemy models, AI, damage, explosions, boss
models/        character models and the Stage 1 map (glTF as .json + WebP textures), the map's baked data (-data.json) and enemy-anims.json (converted Mixamo clips)
tools/         scripts that convert Mixamo FBX characters and animations, and stage maps, into models/
vendor/        three.js GLTFLoader and SkeletonUtils (r128)
js/player.js   movement, weapons, viewmodel, projectiles, turret
js/topdown.js  the top-down view: follow camera, cursor and twin-stick aiming, the player's animated body
js/fparms.js   (unused since the top-down switch) first-person arms
js/hud.js      HUD and overlay canvas (damage numbers, compass, hit markers)
js/stages.js   campaign: stage list, save file, main menu, stage select, briefing, results
js/hub.js      the hub room between stages: TV wall showing the stages, console that opens stage select
js/main.js     waves, loot chests, vending, input, main loop
```
