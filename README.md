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

- **Axe combat.** The axe is the only weapon. Fights are one-on-one at a time, like free-flow superhero brawlers. STRIKE goes to one enemy: the one you push the stick toward, else your current target, else the nearest. If they're a few strides away you leap onto them (Run Jump Attack). Strikes chain into three-hit combos drawn from nine moves built from six axe clips (two combo attacks, two downward chops, the 360 and the run-jump), the third a heavy finisher. Hits in a row without getting hit build Momentum (up to +25% damage, +50% with the skill). When an enemy is about to strike it shows a "!" (red just before the blow): COUNTER then (F, or the corner button, which lights up) knocks it down with a roundhouse kick and no damage taken; with nothing to counter it's a kick. DODGE (Space, or the button above) dashes with a moment of invulnerability. One swing never hits a crowd. **How the three fit together:** a yellow "!" over an enemy means its attack can be COUNTERED (if two or three come at once, one press counters them all, and your next strike is a quick riposte). A red "!!" (the spinning swing, the leap slam) can't be countered and has to be DODGED; the DODGE button flashes red. Dodging just before any blow lands is a PERFECT DODGE: time slows and the attacker is stunned (green stars), wide open: hits on stunned enemies always crit and hit 1.5× harder, and enemies knocked down by a counter take 1.6×. Missing a swing or getting hit breaks your Momentum; keep 8 hits flowing and STRIKE turns into TAKEDOWN, which kills a regular enemy outright (a Star loses half its health).
- **Loot is axe mods.** Enemies and chests drop axe heads, handles and charms in five rarities, Common to Legendary (damage, crit damage, swing speed, reach, health per hit; heads can carry fire, shock or corrosive).
- **Elements.** Fire is strong against flesh, shock against shields and corrosive against armor. Each element can also apply a damage-over-time effect.
- **Shield.** Your shield grows with your level.
- **Skill tree.** Every level up gives a skill point (★ by the level bar or K to spend). One Melee tree: damage, swing speed, healing on hit, counters and kicks, the finisher, armour, executions, Momentum, and at level 10 Berserk and Counter Master (triple-damage counters).
- **Packs, methodically.** Enemies arrive in small packs from just off screen, mostly axe-wielding Psychos with a few gunners (no bomb-carriers). One to three attack at a time (taking turns, favouring your back); the rest keep a ring 6-8 m out, circling and now and then feinting a step in. Every 9-14 seconds two come together from opposite sides. The one you strike may sidestep it, unless your hits are flowing. The badly hurt back off. Pathfinding covers the whole map, and anyone stuck off screen is moved back into the fight.
- **Carnage.** Kills within 3.5 seconds of each other build a streak (shown top right) that multiplies XP and cash up to 3×. Milestones are called out like a broadcast; some bring a sponsor drop (a mod and health falling from the sky), and a 15-kill streak sends you into a Frenzy (harder, faster hits that heal). Each wave has Star enemies (a gold star overhead): bigger, three times the health, five times the XP and a guaranteed good mod. A wave's last kill plays in slow motion.
- **Gear.** I (or ⚙ next to the level bar, or GEAR in the pause menu) shows each weapon's mod slots and your bag of spare mods: tap one to compare it with what's fitted, then fit it, take it off or scrap it for cash. Mods you pick up for an empty slot are fitted straight away; others go in the bag (30 max).
- **Blood.** Blood stains are scattered over the map, splattered up walls (heaviest at the forecourt, store, tent, carousel and farm), and every hit and kill leaves splats, pools and spatter on the ground.
- **Cartoon look, with grit.** Soft two-tone shading, warm light and violet shadows, bold inked edges on characters and line art on buildings and props, comic halftone dots in the shadows, film grain and a dark vignette.
- **Enemies.** There are Bandits, Marauders (with shields), Psychos, Suicide Psychos and Badass Nomads. Every 5th wave adds a boss, **Krag the Scrapjaw**, who has ground slams, rocket barrages and charges.
- **Top-down view.** An angled overhead camera follows you (screen up is always north), leaning a little toward where you aim. You see your own character, the uploaded Mixamo body, holding the rifle or the axe and animated with the shared clips: walking, strafing and backpedalling relative to where you aim, shooting, reloading on the upper body, the axe moves (each plays an axe attack clip timed to the hit, with a blade trail) and the kick. Roofs, the canopy, ceilings and treetops are cut away in a circle around you, so buildings never hide you. Arrows at the screen edge point to enemies, good loot and the chest off screen.
- **Combat feedback.** Every enemy shot flashes a comic-book starburst at the muzzle (camera-facing, gone in 70 ms). Damage numbers pop off enemies, headshots score critical hits, and enemies fall apart when they die.
- **Fight For Your Life.** When your health hits zero you go down. Kill an enemy before the timer runs out to get a Second Wind.
- **Stage 1 map.** The uploaded clown gas station map (about 320 × 320 m playable): a forecourt under a canopy with six pumps, the store (with an interior), a car wash, a carnival tent, a carousel, woods, a farm, a pond and a highway blockaded at both ends. Enemies come in from the map's spawn points nearest you; explosive barrels stand around the pumps. It loads in the background while you're in the menus and hub.
- **Campaign.** Main menu → the hub, a room you walk around in → use the console in front of the wall of TVs (one per stage) → stage select → briefing → stage → results → back in the hub. No fighting in the hub. Stages show as locked, unlocked or completed, unlock in order, and can be replayed. Your level, XP, cash, mods, skills and ammo are saved in the browser after every wave and when you leave or finish a stage; Continue picks up where you left off. Stage 1 is the gas station map (clear 5 waves, the 5th a boss wave, then a 20-second window to grab the loot); Stages 2 and 3 are placeholders.
- **Progression.** You earn XP and level up; enemies hit hard and their level climbs a full level a wave, so mods and skills matter. Loot chests appear after each wave, and vending machines by the store sell ammo and healing. Clearing a stage pays a reward (less on replays).
- **Controls.** Made for iOS touch, with automatic aiming: firing turns you to the nearest enemy in sight and stays locked on while it's in range (the crosshair marks it), and axe swings and kicks turn toward an enemy within reach. Touch: the left stick moves; FIRE (SWING with the axe) shoots or swings at the locked-on enemy; optionally, drag on the right side to aim by hand and push all the way to fire. Desktop: WASD moves, click or J fires the same way; there's no mouse aiming.
- **Animated enemies.** Bandits, marauders, psychos, nomads and the boss are rigged Mixamo characters (a strung-out clown, a psycho clown showgirl, a burnt clown with glowing embers, a top-heavy gangster clown as the Marauder, a top-heavy brawler restyled as a bloody clown (face paint, ruffle, stripes and blood drawn by a shader) dual-wielding SMGs as the Badass Nomad and the Brute with his battle axe as the boss), cel-shaded with weapons pinned to their bones. Their weapons are four clown-built models (the Honkmaker pistol, the Calliope rifle, the Sad Sack shotgun and the Punchline axe), each repainted in a random colour and sized a little differently per enemy; a gunner fires the way its weapon does (rifle bursts, shotgun pellet spreads up close, slower, harder pistol shots), and shots leave from the barrel. They pick forward, backpedal or side-step clips from how they're actually moving relative to where they face (walking or running by speed, with playback speed matched to their ground speed), stand in proper idles (rifle, pistol or unarmed), turn and run on long moves, and they aim, shoot and reload (the reload plays on the upper body while the legs keep moving), flinch when hit (head-snap on headshots), and psychos hunch into a mutant run and swing their axes: a drawn-out wind-up and a fast strike (the clip's clock is warped around each impact, and the chest and arm over-rotate through it), stopping dead for a beat with a jolt and a shove when it connects, kicking up dust when it misses, a quick step into the blow, a trail behind the blade and a follow-through, committing to the direction just before impact so a late sidestep can dodge it, sometimes chaining into a second swing, with the blade glinting and the psycho yelling just before each blow as a warning; from a few strides away a psycho can leap at you with the axe raised and chop down as it lands (a shockwave of dust; a sidestep makes it miss and leaves it slow to recover); about one attack in seven is a kick (damage lands on the swing's impact frame), dodge-roll when aimed at, flip or slide in to close distance, get knocked down by explosions and climb back up, scream and taunt when they arrive, while circling, after landing a hit, when you hide (to bait you out) and when you're down (five taunt clips, four of them also played mirrored), and play death animations. Their hitboxes follow the animation.
- **Enemy tactics.** Gunners pick their own firing spot at their preferred range, spread apart and off to your sides, preferring cover; they hold it while side-stepping, relocate every few seconds, and fall back behind walls or rocks to recharge when their shield breaks or they're badly hurt. Behind cover they crouch, and stand to fire over it. They count their shots and reload (they don't throw grenades). They move in bounds: only a couple relocate at once while the rest hold and fire, and a teammate lays down covering fire when one breaks cover. They fan out around you so the fire comes from different sides, and keep their distance from each other. Only a few fire at the same moment; their bullets are fast tracer streaks. Melee enemies take turns: several engage at once (closing in from different sides around where you're facing, front, flanks and behind, cutting off a moving target by running at where it's heading, curving in on a slow one, flipping or sliding to close distance, fast enough to run down a walking player but not a sprinting one) while the rest circle close by, and after a combo some briefly back off to let another in.
- **Enemy pathfinding.** A navigation grid with a flow field toward the player and A* paths to any spot route enemies around buildings, walls, cars and rocks; they sidestep if they get stuck.

## Controls

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Move / sprint / jump | WASD / Shift / Space | Left stick (push all the way to sprint) / JUMP |
| Strike (auto-targeted) | Left click or J (push WASD toward an enemy to pick it) | STRIKE (push the left stick toward an enemy to pick it) |
| Counter (when "!") / dodge | F / Space | COUNTER (corner) / DODGE |
| Skills / gear (mods) | K / I | ★ / ⚙ next to the level bar |
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
js/blood.js    blood decals: splats, pools, smears and spatter on the ground (four instanced meshes)
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
