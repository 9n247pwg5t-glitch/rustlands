# Rustlands

A Borderlands-style looter shooter that runs in the browser. It's first person and cel-shaded: you fight waves of bandits, psychos and skags in a desert arena and pick up thousands of randomly generated guns.

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
- **Enemies.** There are Bandits, Marauders (with shields), Psychos, Suicide Psychos, Skag pups and adults, and Badass Nomads. Every 5th wave adds a boss, **Krag the Scrapjaw**, who has ground slams, rocket barrages and charges.
- **Combat feedback.** Damage numbers pop off enemies, headshots score critical hits, and enemies fall apart when they die.
- **Fight For Your Life.** When your health hits zero you go down. Kill an enemy before the timer runs out to get a Second Wind.
- **Action skill.** You can deploy a turret. You also have grenades, a melee attack and explosive barrels.
- **Progression.** You earn XP and level up. Loot chests appear after each wave, and vending machines sell ammo and healing.
- **Controls.** The game supports touch as well as mouse and keyboard. Light aim assist (look slowdown near enemies, a gentle pull while firing, a snap when you start aiming) is stronger on touch and always aims at the body, so headshots are still on you.
- **Animated enemies.** Bandits, marauders, psychos, nomads and the boss are rigged characters with comic masks and weapons pinned to their bones. They run, aim, shoot, punch and kick (damage lands on the clip's impact frame), dodge-roll when aimed at, flip or slide in to close distance, get knocked down by explosions and climb back up, taunt you when you're down, and play death animations. Their hitboxes follow the animation.
- **Enemy pathfinding.** Enemies follow a navigation grid around buildings, walls, cars and rocks, and sidestep if they get stuck.

## Controls

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Move / sprint / jump | WASD / Shift / Space | Left stick (push all the way to sprint) / JUMP |
| Aim / shoot / zoom | Mouse / Left click / Right click | Drag right side / FIRE / AIM |
| Reload / swap | R / 1–4 or wheel | Tap ammo count / tap a weapon slot |
| Interact (pick up, open, buy) | E | Pop-up TAKE / OPEN / BUY button |
| Grenade / melee / turret | G / F / Q | GREN / — / SKILL |
| Skip intermission / pause | N / Esc | II button |

## Code layout

```
index.html     markup, HUD styles
js/util.js     math, noise, synthesized audio
js/world.js    renderer, toon materials, terrain, props, collision, ray tests, effects
js/loot.js     gun/shield generation, gun models, item cards, world drops
js/rigs.js     rigged Mixamo enemies: loading, cel shading, gear on bones, animation playback
js/enemies.js  enemy models, AI, damage, explosions, boss
models/        character models (glTF as .json + WebP textures) and enemy-anims.json (converted Mixamo clips)
vendor/        three.js GLTFLoader and SkeletonUtils (r128)
js/player.js   movement, weapons, viewmodel, projectiles, turret
js/hud.js      HUD and overlay canvas (damage numbers, compass, hit markers)
js/main.js     waves, loot chests, vending, input, main loop
```
