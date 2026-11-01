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
  - Gun manufacturers Jakobs, Maliwan, Torgue, Vladof, Tediore, Hyperion, Dahl and their signature
    mechanics as described (`MFR` in `js/loot.js`, README).
  - Enemy terms "Psycho", "Badass", "Marauder", "Nomad"; the downed-state banner "Fight For Your
    Life" / "Second Wind" (`js/player.js`, README).

## Structure (§7, §8)

- **Only one playable stage, and it's a stand-in.** The campaign flow exists (`js/stages.js`):
  main menu → hub room → console → stage select → briefing → stage → results → hub, with locked, unlocked and
  completed stages, replay and a save file. Stage 1 is the desert arena (clear 5 waves, the 5th a
  boss wave); Stages 2 and 3 are empty placeholders that unlock but can't be entered.
- **The hub room is a placeholder.** Between stages the player walks around a room (`js/hub.js`)
  and uses a console in front of a wall of TVs to open stage select. Whose place it is, where it
  is, how it looks and what else it holds (shop, gear, story) are OPEN; it's a generic panelled
  interior with no story content, labelled "HUB" in the HUD.
- **The desert arena** doesn't match the bible's visual identity (early-2000s suburbs, retail
  strips, highways, carnival/wrestling venues, distant metropolis). It's a prototype space.
- **Stages don't load their own worlds yet.** The arena is built once at boot (`js/world.js`);
  each stage has `load()`/`unload()` hooks for building and tearing down its own map, but the arena
  doesn't use them. The first real stage should move world building behind these hooks.
- **Objectives are wave-based only.** The bible imagines explorable zones with branching paths,
  optional discoveries and a culminating objective; stage objectives are just "clear N waves" so far.
- **Placeholder progression numbers.** Stage rewards (first clear: $300 × level scale and 60% of a
  level's XP; replays a quarter of that), the 20-second extraction window after the last wave, and
  "unlock the next stage in the list" are prototype choices, not approved rules (§8: confirm exact
  progression and loot rules).
- **Saves are per browser.** The save lives in this browser's `localStorage` (`rustlands.save.v1`):
  it doesn't follow the player to another device, and iPhone Safari can clear site storage for sites
  not visited for a while. Cross-device saves or a save export would need deciding.

## Narrative delivery (§5)

- No Layer 1 context (mission briefings, propaganda, environmental storytelling) and no Layer 2
  collectibles (broadcasts, memos, promos, graffiti) yet.
- No representation of Mike Mouse, the Federation, GTN, Idols or the protagonists.

## Gameplay items the bible lists as OPEN but the build already fixes (§6)

These exist in the prototype; they need confirming or replacing, not silently keeping:
- Weapon types (pistol, SMG, assault rifle, shotgun, sniper, rocket launcher), rarity tiers
  (Common → Legendary), elements (fire, shock, corrosive), shields.
- XP curve and levelling, the deployable-turret action skill, grenades, melee.
- Weapon switching UI (the touch weapon wheel).

## Controls (§10)

- No adjustable look sensitivity setting yet (fixed `SENS` in `js/main.js`).
