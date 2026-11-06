# Conflicts between the current build and the narrative bible

What the game does today that the bible (`narrative-bible.md`) says otherwise about. Each item
needs a creator decision; record it in `decisions.md`, fix the code, then remove the item here.

## Names and identity

- **Game title.** The page, README and repo are titled "Rustlands"; the bible's title is
  *Slaughterhouse Universe*. (§1)
- **Invented names used as if canon.** These were made up during prototyping and are placeholders,
  not approved names (§4: don't invent permanent canon names):
  - Boss "Krag the Scrapjaw" (`js/enemies.js`, wave banner in `js/main.js`, README).
  - Enemy class names: Bandit, Marauder, Psycho, Suicide Psycho, Badass Nomad (`js/enemies.js`).
  - Weapon model nicknames: Honkmaker, Calliope, Sad Sack, Punchline (README; the model files'
    own node names).
  - Legendary weapon names and flavour text (`LEGENDARY` in `js/loot.js`).
- **Borderlands-owned names.** Must be replaced before any public release (bible: take structure
  and feel, not protected names):
  - Gun manufacturers Jakobs, Maliwan, Torgue, Vladof, Tediore, Hyperion, Dahl remain in the code
    (`MFR` in `js/loot.js`) only to colour the fallback block-built gun models; players no longer
    see them. The gun-loot code that used them (`genGun`, legendary guns) is unused.
  - Enemy terms "Psycho", "Badass", "Marauder", "Nomad"; the downed-state banner "Fight For Your
    Life" / "Second Wind" (`js/player.js`, README).

## Structure (§7, §8)

- **Only one playable stage, and it's a stand-in.** The campaign flow exists (`js/stages.js`):
  main menu → hub room → console → stage select → briefing → stage → results → hub, with locked, unlocked and
  completed stages, replay and a save file. Stage 1 is the uploaded gas station map (clear 5 waves, the 5th a
  boss wave); Stages 2 and 3 are empty placeholders that unlock but can't be entered.
- **The hub room is a placeholder.** Between stages the player walks around a room (`js/hub.js`)
  and uses a console in front of a wall of TVs to open stage select. Whose place it is, where it
  is, how it looks and what else it holds (shop, gear, story) are OPEN; it's a generic panelled
  interior with no story content, labelled "HUB" in the HUD.
- **Stage 1's map is loaded at boot, not by the stage.** The gas station map (`js/map.js`)
  downloads in the background when the game starts and becomes the "arena" world; it is hidden
  and not simulated outside Stage 1, but it isn't built by Stage 1's `load()` or removed by
  `unload()`. Fine with one map; with more stages, each map should load on entering its stage.
- **The gas station map's names.** Its node names (`GasStation_*`, `Clown_Carnival`, `Farm`...)
  are the file's own labels, not approved place names; the stage card calls it "Roadside gas
  station · placeholder".
- **Map performance is unproven on the target phone.** On phones the map draws about 250 draw calls
  and 150k triangles a frame with no map shadows and a shorter view; this needs checking on the
  actual iPhone.
- **Objectives are wave-based only.** The bible imagines explorable zones with branching paths,
  optional discoveries and a culminating objective; stage objectives are just "clear N waves" so far.
- **Placeholder progression numbers.** Stage rewards (first clear: $300 × level scale and 60% of a
  level's XP; replays a quarter of that), the 20-second extraction window after the last wave, and
  "unlock the next stage in the list" are prototype choices, not approved rules (§8: confirm exact
  progression and loot rules).
- **Saves are per browser.** The save lives in this browser's `localStorage` (`rustlands.save.v2`):
  it doesn't follow the player to another device, and iPhone Safari can clear site storage for sites
  not visited for a while. Cross-device saves or a save export would need deciding.

## Narrative delivery (§5)

- No Layer 1 context (mission briefings, propaganda, environmental storytelling) and no Layer 2
  collectibles (broadcasts, memos, promos, graffiti) yet.
- No representation of Mike Mouse, the Federation, GTN, Idols or the protagonists.

## Gameplay items the bible lists as OPEN but the build already fixes (§6)

The arsenal and loot model are decided (decisions.md, 2026-11-05 and 2026-11-06: assault rifle
and axe, toggled). Still open or placeholder:
- Mod slots (rifle: barrel, magazine, optic, stock; axe: head, handle, charm), mod stat ranges,
  rarity tiers (Common → Legendary) and elements (fire, shock, corrosive) are first-pass choices.
- Skill names (Hollow Points, Steady Hands, Deep Pockets, Fast Hands, Trigger Happy, Headhunter,
  Overdrive; Heavy Swings, Quick Swings, Bloodthirst, Steel Toes, Finisher, Thick Skin,
  Executioner, Cleave, Berserk, Earthsplitter), their effects, tiers (levels 5 and 10) and every
  number are placeholders (`js/arsenal.js`).
- The combo's three moves, their timings and damage, the 0.65 s window to chain them, and the kick
  (damage, knock-down, 1.1 s cooldown) are first-pass (`AXE_COMBO` in `js/arsenal.js`, `AXE_MOVES`
  in `js/fparms.js`).
- Enemy leap slam range, damage and cooldown (`startLeap` in `js/enemies.js`).
- Difficulty values (`DIFFICULTY` in `js/enemies.js`), the XP curve, the shield scaling with level.
- Leftover gun code (gun loot, player projectiles, the turret, grenades) is still in `js/player.js`
  and `js/loot.js` but unused by the player.
- The touch controls for switching (tap the corner button, hold to reload) and the KICK button.
- The starting assault rifle is named "Ringmaster HA15", the name its uploaded model came with
  (`STARTER_AR` in `js/loot.js`).

## Controls (§10)

- No adjustable look sensitivity setting yet (fixed `SENS` in `js/main.js`).
