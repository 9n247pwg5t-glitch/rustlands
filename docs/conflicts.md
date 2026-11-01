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

- **No stage select.** The game is one desert arena with endless waves; the bible calls for main
  menu → stage select → briefing → separately loaded stage → completion → rewards saved → stage
  select, with locked/unlocked/completed stages and replay.
- **No persistent progression.** Only the best wave/level is saved (`localStorage`, `js/main.js`).
  Inventory, equipped gear, player level and unlocked stages are not kept between sessions or levels.
- **The desert arena** doesn't match the bible's visual identity (early-2000s suburbs, retail
  strips, highways, carnival/wrestling venues, distant metropolis). It's a prototype space.
- **No objectives.** Stages need a culminating objective and a completion condition; the arena
  only has waves and an intermission.

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
