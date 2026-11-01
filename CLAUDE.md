# Slaughterhouse Universe (working repo name: rustlands)

A dystopian, satirical clown-punk first-person looter-shooter (Borderlands-style feel) with an
Ape Escape-style stage-select campaign, built on three.js r128 for mobile browsers first (iPhone
Safari), desktop second. No build step: plain scripts loaded by `index.html` (see README for layout).

The authoritative creative and design spec is the narrative bible, imported here:

@docs/narrative-bible.md

Approved decisions made since the bible was written live in `docs/decisions.md`; they override
the bible where they conflict. Known gaps between the current build and the bible are tracked in
`docs/conflicts.md`.

## How to treat the bible's labels

- **CANON** — fixed fact. Follow it exactly; never contradict it in code, text or assets.
- **CONFIRMED DIRECTION** — build toward it.
- **PROPOSED** — a suggestion. You may use it as a starting point, but say so, and ask before
  treating it as settled (names, level order, missions, bosses).
- **OPEN** — undecided. Never invent an answer; offer two or three options and let the creator choose.

When something is approved, add a dated line to `docs/decisions.md` in the same change.

## Hard rules

- No stealth: no stealth AI, visibility meters, takedowns or stealth objectives unless asked.
- Campaign = main menu → stage select → separately loaded stages → rewards/progress saved → stage
  select. Not a seamless open world; never render or simulate more than the current stage.
- Don't invent permanent names for characters, Idols, bosses, factions, companies, stages or
  secret projects. Use clearly marked placeholders (e.g. `PLACEHOLDER_BOSS_1`) and list them in
  `docs/conflicts.md` until named.
- The protagonists' names, backstories, relationship and motives are OPEN — don't write them.
- Don't copy Borderlands' or Ape Escape's protected names, characters, artwork or exact UI;
  take structure and feel only.
- Never hide basic mission information in optional lore.
- Mobile performance first: hold a stable 30 FPS on the target phone (60 where sustainable);
  prefer responsiveness over effects. Keep stage size and enemy counts phone-sized. Test touch
  controls; desktop emulation isn't proof.

## Working in this repo

- Run locally: `python3 -m http.server 8000`, open `http://localhost:8000`.
- Character/animation/weapon conversion tools and their usage are in `tools/README.md`.
- Campaign and saves: `js/stages.js`. To add a stage, add an entry to `STAGES` (it unlocks when the
  one before it is completed) with `load()`/`unload()` that build and remove its world, so only one
  stage is ever in the scene. Bump `SAVE_KEY`'s version and migrate if the save format changes.
- Spoiler material (the writer's answer key for the Layer 3 mysteries) is not stored here unless
  the creator adds it; don't infer answers to those mysteries.
