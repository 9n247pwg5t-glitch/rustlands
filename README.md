# Rustlands

A Borderlands-style looter shooter that runs in the browser. It's first person and cel-shaded: you pick a stage from the stage select, fight through it, and keep your level, cash and gear between stages. Thousands of randomly generated guns to loot.

There is no build step. The world, guns and creatures are drawn with [three.js](https://threejs.org/) primitives, and every sound is synthesized with WebAudio. The human enemies are rigged Mixamo characters driven by motion-captured Mixamo animations.

## Play

Serve the folder with any static file server and open `index.html`:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

It also works on GitHub Pages: turn Pages on for the `main` branch.

## Features

- **Procedural guns.** There are 6 weapon types (pistol, SMG, assault rifle, shotgun, sniper, rocket launcher) and 7 manufacturers, and each manufacturer plays differently:
  - Jakobs fires as fast as you can click and gets bonus crits.
  - Maliwan guns are always elemental.
  - Torgue guns fire explosive gyrojet rounds.
  - Vladof guns have high fire rates and big magazines.
  - Tediore guns are thrown when you reload, and they explode.
  - Hyperion guns get more accurate the longer you fire.
  - Dahl guns fire bursts while you aim down sights.
- **Rarity tiers.** Guns come in Common, Uncommon, Rare, Epic and Legendary. Each Legendary has a unique effect and its own red flavor text.
- **Elements.** Fire is strong against flesh, shock against shields and corrosive against armor. Each element can also apply a damage-over-time effect.
- **Shields.** Equippable shields come in Standard, Tortoise, Nova and Snapback types.
- **Item cards.** Each item shows its stats compared with what you have equipped.
- **Enemies.** There are Bandits, Marauders (with shields), Psychos, Suicide Psychos and Badass Nomads. Every 5th wave adds a boss, **Krag the Scrapjaw**, who has ground slams, rocket barrages and charges.
- **Combat feedback.** Damage numbers pop off enemies, headshots score critical hits, and enemies fall apart when they die.
- **Fight For Your Life.** When your health hits zero you go down. Kill an enemy before the timer runs out to get a Second Wind.
- **Action skill.** You can deploy a turret. You also have grenades, a melee attack and explosive barrels.
- **Campaign.** Main menu → the hub, a room you walk around in → use the console in front of the wall of TVs (one per stage) → stage select → briefing → stage → results → back in the hub. No fighting in the hub. Stages show as locked, unlocked or completed, unlock in order, and can be replayed. Your level, XP, cash, guns, shield, ammo and grenades are saved in the browser after every wave and when you leave or finish a stage; Continue picks up where you left off. Stage 1 is the prototype arena (clear 5 waves, the 5th a boss wave, then a 20-second window to grab the loot); Stages 2 and 3 are placeholders.
- **Progression.** You earn XP and level up. Loot chests appear after each wave, and vending machines sell ammo and healing. Clearing a stage pays a reward (less on replays).
- **Controls.** The game supports touch as well as mouse and keyboard. Light aim assist (look slowdown near enemies, a gentle pull while firing, a snap when you start aiming) is stronger on touch and always aims at the body, so headshots are still on you.
- **Animated enemies.** Bandits, marauders, psychos, nomads and the boss are rigged Mixamo characters (a strung-out clown, a psycho clown showgirl, a burnt clown with glowing embers, a top-heavy gangster clown as the Marauder, a top-heavy brawler restyled as a bloody clown (face paint, ruffle, stripes and blood drawn by a shader) dual-wielding SMGs as the Badass Nomad and the Brute with his battle axe as the boss), cel-shaded with weapons pinned to their bones. Their weapons are four clown-built models (the Honkmaker pistol, the Calliope rifle, the Sad Sack shotgun and the Punchline axe), each repainted in a random colour and sized a little differently per enemy; a gunner fires the way its weapon does (rifle bursts, shotgun pellet spreads up close, slower, harder pistol shots), and shots leave from the barrel. They pick forward, backpedal or side-step clips from how they're actually moving relative to where they face (walking or running by speed, with playback speed matched to their ground speed), stand in proper idles (rifle, pistol or unarmed), turn and run on long moves, and they aim, shoot and reload (the reload plays on the upper body while the legs keep moving), flinch when hit (head-snap on headshots), and psychos hunch into a mutant run and swing their axes: a drawn-out wind-up and a fast strike (the clip's clock is warped around each impact, and the chest and arm over-rotate through it), stopping dead for a beat with a jolt and a shove when it connects, kicking up dust when it misses, a quick step into the blow, a trail behind the blade and a follow-through, committing to the direction just before impact so a late sidestep can dodge it, sometimes chaining into a second swing; about one attack in seven is a kick (damage lands on the swing's impact frame), dodge-roll when aimed at, flip or slide in to close distance, get knocked down by explosions and climb back up, scream and taunt when they arrive, while circling, after landing a hit, when you hide (to bait you out) and when you're down (five taunt clips, four of them also played mirrored), and play death animations. Their hitboxes follow the animation.
- **Enemy tactics.** Gunners pick their own firing spot at their preferred range, spread apart and off to your sides, preferring cover; they hold it while side-stepping, relocate every few seconds, and fall back behind walls or rocks to recharge when their shield breaks or they're badly hurt. Behind cover they crouch, and stand to fire over it. They count their shots and reload, and lob grenades to flush you out when you hide (one grenade in the air at a time). Only a few fire at the same moment. Melee enemies take turns: several engage at once (cutting off a moving target by running at where it's heading, curving in on a slow one, flipping or sliding to close distance, fast enough to run down a walking player but not a sprinting one) while the rest circle close by, and after a combo some briefly back off to let another in.
- **Enemy pathfinding.** A navigation grid with a flow field toward the player and A* paths to any spot route enemies around buildings, walls, cars and rocks; they sidestep if they get stuck.

## Controls

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Move / sprint / jump | WASD / Shift / Space | Left stick (push all the way to sprint) / JUMP |
| Look / shoot | Mouse / Left click | Drag right side / FIRE: tap to shoot, hold for automatics (and drag to look) |
| Aim down sights | Right click | Swipe FIRE left to aim, right for hip fire |
| Reload | R | Tap the weapon wheel |
| Switch weapon / grenade / turret | 1–4 or mouse wheel / G / Q | Hold the weapon wheel and slide toward a gun, the grenade or the turret (time slows while it's open) |
| Interact (pick up, open, buy, hub console) | E | Pop-up TAKE / OPEN / BUY / STAGES button |
| Melee | F | — |
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
js/world.js    renderer, toon materials, terrain, props, collision, ray tests, effects
js/loot.js     gun/shield generation, gun models, item cards, world drops
js/rigs.js     rigged Mixamo enemies: loading, cel shading, gear on bones, animation playback
js/enemies.js  enemy models, AI, damage, explosions, boss
models/        character models (glTF as .json + WebP textures) and enemy-anims.json (converted Mixamo clips)
tools/         scripts that convert Mixamo FBX characters and animations into models/
vendor/        three.js GLTFLoader and SkeletonUtils (r128)
js/player.js   movement, weapons, viewmodel, projectiles, turret
js/hud.js      HUD and overlay canvas (damage numbers, compass, hit markers)
js/stages.js   campaign: stage list, save file, main menu, stage select, briefing, results
js/hub.js      the hub room between stages: TV wall showing the stages, console that opens stage select
js/main.js     waves, loot chests, vending, input, main loop
```
