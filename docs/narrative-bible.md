# Narrative Bible & Mobile Game Design Report — Version 2.0

**Purpose:** Authoritative context for Claude-assisted development of a mobile-first Three.js game.
**Updated direction:** Borderlands-style first-person action RPG / looter-shooter gameplay with Ape Escape-inspired stage selection and replayable, separately loaded maps.

---

## PART I — CREATIVE VISION

### 1. High-level concept — CANON / CONFIRMED DIRECTION

Slaughterhouse Universe is a dystopian, satirical, clown-punk action game set in the aftermath of a societal collapse driven by an uncontrollable entertainment economy. Powerful corporations once tried to monopolize internet personalities and the attention economy. Those personalities evolved into fanatical, territorial celebrities called Idols, and the resulting conflict shattered institutions. By 2060, charismatic wrestling promoter and executive Michael Delgado, a.k.a. Mike Mouse, has reorganized much of the chaos into a corporate-backed carnival-themed media and paramilitary empire.

**Gameplay feel:** Borderlands-style first-person shooting, varied weapons and loot, RPG progression, enemy factions, bosses, and exploration of distinctive zones.

**Campaign structure:** Ape Escape-inspired level-select interface, independently loaded stages, unlockable territories, and replayable earlier levels. This is not an uninterrupted open world.

**Technology:** Three.js / WebGL, mobile-browser-first with iPhone Safari as a key target. Desktop support is desirable.

**Visual identity:** Abandoned early-2000s American suburbs, dying retail strips, highways, carnival/wrestling imagery, clown-punk factions, grotesque celebrity iconography, and a surreal metropolis looming in the distance. Stylized/cel-shaded influences are desirable, subject to mobile performance.

**One-sentence player-facing premise:** The apocalypse became entertainment. Now two unlikely allies aim to bring down the man running the show.

### 2. Themes and tone — CANON

- Celebrity as a form of social and political authority.
- Corporate monopolization of decentralized attention, and the unintended consequences.
- Audiences' increasing desensitization and competition for spectacle.
- Idols as cult leaders, gang bosses, entertainers, and objects of devotion.
- Corporate power adapting to chaos rather than ending it.
- Theatrical violence, carnival absurdity, wrestling-style storytelling, and corporate satire.
- A world that can be funny and grotesque without losing its menace.

Mike should read as a calculating promoter and executive, not merely a generic evil clown. His genius is packaging personalities, rivalries, and chaos into a repeatable business.

---

## PART II — HISTORICAL AND NARRATIVE CANON

### 3. Timeline

**By 2030: Entertainment consolidation — CANON**

Traditional film, television, and news institutions have largely been displaced by a new generation of entertainment conglomerates. These companies consolidate platforms, advertising networks, influencer management, and distribution while attempting to centralize a fundamentally decentralized attention economy. They wrongly assume that their celebrity assets can be managed through contracts and institutional control.

**Early 2030s–early 2040s: The Decade of Decay — CANON**

The new celebrities compete ruthlessly for audience attention. Contracts, norms, and boundaries lose meaning; increasingly extreme behavior becomes a path to notoriety. Many personalities acquire devoted followings and evolve into territorial gangs and cults called Idols. Corporate lawsuits, platform enforcement, and political intervention fail. Corporations then sanction violent operations to regain control, but attacks on Idols antagonize their massive followings and often generate more attention for the targeted personalities. Society fractures amid escalating conflicts. The few remaining academics call this period the Decade of Decay.

*PROPOSED worldbuilding clarification:* Corporate dominance of payment systems, communications, logistics, and security can help explain how a cultural crisis cascades into wider institutional collapse. This is not yet established canon.

**Early 2040s–2060: The Age of Idols — CANON**

Large portions of the United States and wider world are ruled by competing Idols and their supporters. These followers include sycophants, grifters seeking proximity to fame, opportunists, and sincere devotees who find purpose and belonging in their chosen personality cults. Entertainment is not merely escapism; it organizes social power. Surviving corporations still possess money, infrastructure, and political leverage, but cannot easily rule the public through direct coercion.

**By 2060: GTN and Michael Delgado — CANON**

Global Topic News (GTN) is among the last surviving traditional-media institutions. Its efforts to preserve integrity have left it commercially vulnerable. GTN owns Slaughterhouse Universe Wrestling, a carny-style wrestling/circus entertainment property run by ambitious promoter and showrunner Michael Delgado (Mike Mouse). Surviving entertainment conglomerates acquire GTN and install Mike as acting chief executive, believing his cultural influence and organizational savvy can restore their power.

**2060 onward: The Slaughterhouse Federation — CANON**

With corporate support, Mike transforms his entertainment property into a federation of clown/carnival-themed performers and armed followers. The Slaughterhouse Federation uses theatricality, broadcasts, propaganda, and organized violence to extend its influence. Corporate power returns in a new form: society is controlled through spectacle rather than restored to its previous order.

**Game starting point — CANON**

A former organized-crime soldier and a weapons-technology entrepreneur/inventor form an alliance to bring down Mike Mouse's reign. Their names, individual histories, relationship, and precise motives are OPEN. Do not invent their definitive backstories.

### 4. Major characters and factions

- **Mike Mouse / Michael Delgado — CANON:** Promoter of Slaughterhouse Universe Wrestling, installed as GTN's chief executive after the corporate acquisition, and central organizer of the Federation. Charismatic, ambitious, commercially savvy, and comfortable treating violence as entertainment. Whether he ultimately controls his corporate backers or vice versa remains OPEN.
- **Former organized-crime soldier — CANON:** One protagonist, experienced in criminal organization and violence. Playable status and combat specialization are OPEN.
- **Weapons-technology entrepreneur/inventor — CANON:** The other protagonist, with technical expertise relevant to the fight against Mike. Whether playable, a companion, or a support character is OPEN.
- **Independent Idols — CANON:** Celebrity-gang leaders and their fanatical followers. They are not automatically all subordinate to Mike.
- **Slaughterhouse Federation — CANON:** Mike's corporate-backed clown/carnival/wrestling-themed power structure.
- **Corporate coalition — CANON:** Surviving conglomerates that acquire GTN and use Mike to reestablish influence. Specific company names and hidden agendas are OPEN.
- **GTN — CANON:** A last remnant of traditional media and former owner of Mike's wrestling property.
- **Named regional bosses, enemy classes, civilian groups, and subordinate commanders — PROPOSED:** To be designed and approved individually. Do not invent permanent canon names.

### 5. Lore delivery: accessible surface, deeper mystery — CONFIRMED DIRECTION

Every player must quickly understand: society has collapsed, Idols and theatrical gangs dominate territory, Mike runs a dangerous corporate-backed Federation, and the protagonists oppose him. They do not need to know the entire history before playing.

- **Layer 1 — Mandatory clarity:** Short in-game dialogue, visible propaganda, environmental design, and mission context communicate immediate goals and the nature of the world.
- **Layer 2 — Optional history:** Collectible broadcasts, dated corporate memos, advertisements, wrestling promos, graffiti, audio fragments, and ruined infrastructure reveal the Decade of Decay, GTN's decline, and the rise of the Idols.
- **Layer 3 — Long-term mysteries:** Who truly controls the Federation? Did the corporations intentionally accelerate events? What did Mike know about the acquisition? How are the protagonists connected to this system? These are potential mysteries, not approved answers.

**Writing rules:** Show consequences before explanations; keep required exposition brief; make clues short and specific; use recurring names, dates, and symbols; let conflicting sources be biased but internally plausible. Never conceal basic mission information in optional lore. Maintain a private writer's answer key once major mysteries are approved.

*Example optional artifact — PROPOSED, not canon:* A short acquisition memo mentioning a redacted project associated with Mike. Do not establish an actual secret project name unless approved.

---

## PART III — GAMEPLAY AND PROGRESSION

### 6. Core mechanical identity — CONFIRMED DIRECTION

The game should be designed as a Borderlands-inspired first-person action RPG / looter-shooter, rather than a stealth or survival-horror game. Core reference characteristics include:

1. **First-person combat:** responsive movement, aiming, firing, hit feedback, and readable enemy attacks.
2. **Varied weapons:** distinct weapon handling, fire rates, damage characteristics, and visual identities.
3. **Loot:** pickups and gear rewards that motivate combat and replay.
4. **RPG progression:** player growth and equipment improvement over time.
5. **Enemy variety:** factions, combat roles, and stronger encounters.
6. **Bosses:** major combat encounters tied to memorable personalities.
7. **Exploration:** stylized 3D maps with optional discoveries and reasons to revisit.

**Not yet specified:** exact gun types, rarity tiers, procedural weapon-generation formulas, skill trees, classes, experience curves, damage numbers, multiplayer, crafting, vehicles, weapon swapping UI, and whether both protagonists are playable. Treat these as OPEN. Suggest options before implementing them.

**No stealth requirement.** Do not add stealth AI, visibility meters, takedowns, or stealth mission objectives unless explicitly requested later.

### 7. Ape Escape-inspired stage-selection architecture — CONFIRMED DIRECTION

Use a persistent stage-selection menu as the campaign's organizing interface. The reference is Ape Escape's structure—distinct levels accessible from a central selection flow, progressive unlocking, and returning to earlier stages—not its specific copyrighted artwork or exact UI.

**Player flow:** Main Menu → Stage Selection → Stage Details/Briefing → Load Selected Level → Play → Completion/Exit → Rewards/Progress Saved → Stage Selection.

**Level-selection requirements:**

- Display selectable stage nodes/cards on a readable, touch-friendly menu.
- Clearly distinguish locked, unlocked, and completed stages.
- Show level name, environment preview, and progression information where available.
- Unlock additional stages through campaign progress.
- Permit replay of previously completed stages.
- Preserve inventory, equipped gear, player progression, and unlocked stages between levels.
- Do not render or simulate every stage simultaneously.
- A stage can be broad and explorable, like a Borderlands zone, without becoming a seamless open world.
- New levels should be addable independently as the game grows.

*Suggested presentation — PROPOSED:* A stylized broadcast-network map with regions represented as channels or territories. This is a design option, not a mandatory UI aesthetic.

### 8. Stage design and campaign structure

Each stage is a self-contained, explorable combat zone, not necessarily a short corridor or single encounter. It can include an entry area, branching paths, combat spaces, optional lore discoveries, rewards, and a culminating objective. Keep map dimensions and enemy density appropriate to mobile hardware.

**Potential environments — PROPOSED, not confirmed level names or order:**

- Abandoned early-2000s suburban neighborhood with a distant AI-punk metropolis.
- Ruined strip mall and retail district.
- Derelict family entertainment restaurant.
- Highway district covered in Idol propaganda.
- Wrestling/circus venue under Federation control.
- Broadcast facility.
- Corporate compound.
- Federation stronghold or central arena.

**IMPORTANT:** These are environmental suggestions only. The creator has not approved an eight-stage campaign, exact missions, boss identities, or a specific narrative sequence. Claude should not treat them as locked content.

*Replay incentives — PROPOSED:* Optional collectibles, gear drops, challenges, or later-unlocked routes. Confirm exact progression and loot rules before implementation.

### 9. Sample opening level direction — PROPOSED

A ruined suburban zone introduces the contrast between familiar early-2000s architecture and distant grotesque entertainment infrastructure. The player encounters Federation propaganda, fights an introductory enemy group, receives basic shooting and loot tutorials, and discovers one short historical clue. The level ends with a clear completion condition and returns the player to stage selection.

This is a design sketch, not an approved mission script. Do not force stealth, scripted capture, or specific character dialogue into the opening.

### 10. Mobile-first FPS controls — PROPOSED IMPLEMENTATION

Use a two-thumb interface suitable for landscape play: left virtual movement stick; right drag-to-look region; large, well-spaced fire, aim, reload, jump, interact, and weapon-switch controls as needed. Exact button set and placement remain OPEN. Include adjustable sensitivity and avoid controls crowding the center of the screen. Support mouse/keyboard for development and desktop play. Test on actual iPhone Safari rather than relying only on desktop emulation.

*Suggested performance approach:* Aim for stable 30 FPS on the initial target phone; test whether 60 FPS is sustainable on stronger devices. These are targets, not guaranteed results. Prefer stable responsiveness over advanced visual effects.
