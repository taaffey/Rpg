# Gemforge Chronicles

A turn-based JRPG in the spirit of Final Fantasy 1 and Dragon Warrior, built around deep build customization.
Plain HTML/JS modules, no build step, no asset files: all art and audio are generated in code.

## Run
    python3 -m http.server 8123     # then open http://localhost:8123

Touch: hold the on-screen pad or tap/hold anywhere on the map to walk toward that spot. Keyboard: Arrows/WASD move, Esc/M menu, N toggles the minimap (on-screen pad on touch devices). In any menu or battle:
arrows move the focus, Enter/Space selects, Esc/Backspace goes back, L expands the battle log. Fully playable with the
keyboard alone, or with the mouse. Options (volumes, battle speed, shake, minimap) are in the menu and on the title screen.

## Built for iPhone (and every other screen)
- **Adaptive view**: the map shows 12 tiles across in portrait (as many rows as fit), 21x12 in landscape and 16x12 on desktop,
  so tiles stay chunky on an iPhone SE or a Pro Max. Pixel-perfect nearest-neighbour scaling, 60 fps even with the CPU throttled 4x.
- **Virtual controller**: a thumb-sized D-pad (hold to keep walking) plus Map and Menu buttons; or tap/hold anywhere on the map to
  walk toward it. In landscape the pads flank the map and the battle screen becomes two columns, so commands never fall below the fold.
- **iOS details**: safe-area insets, `viewport-fit=cover`, no pinch/double-tap zoom, no rubber-banding, audio unlocked on the first
  touch and paused when the app is backgrounded, autosave when the app is hidden (iOS can kill background tabs).
- **Install it**: host `dist/` over https, then Safari -> Share -> Add to Home Screen for a full-screen, offline app with an icon.

## Finished-game features
- **3 save slots** with details, autosave (towns, battles, quests, app backgrounding), delete/overwrite confirmation, and
  migration from older saves.
- **Difficulty** (Easy / Normal / Hard, changeable in Options). **Tutorial hints** appear once, when relevant.
- **Battle QoL**: Repeat your last move, Auto-battle (tap to stop), turn-order bar, expandable log, 3 speed settings.
- **Menus**: equipment stat comparison (green/red arrows), Bestiary with weaknesses, Journal with quests, full map screen.
- Crash safety: a battle error returns you to the map instead of freezing; progress is autosaved.

## How builds work (three layered systems)
1. **Jobs** (12): every character has a *main job* and a *sub job*. The sub job contributes 40% of its stat modifiers,
   its skills (two levels behind) and its weapon types. Change jobs in any town building.
2. **Weapons** (10 types, 47 weapons, tiers: Haven smithy -> Mirewood -> Frostholm forge -> chests, bosses and rare drops):
   each type grants a **signature skill** (some legendary weapons replace it with their own, e.g. Mend, Raijin, Demon Cut),
   many carry a free **innate gem**, and most have a trait: elemental attacks, extra crit, double blows, armor pierce,
   on-hit Poison/Slow/Stun/drain, healing bonus, or stat bonuses and curses.
3. **Gems** (21): socket gems into any skill slot to rewrite it: element swaps, Chain, Echo, Vampiric, Piercing, Thrifty,
   Overcharge, Wide, Venom, Swift, Focus, Stun, Crit, Execute, Berserk, Siphon, Guard. Capacity comes from sockets on
   weapon/armor/accessory (max 3 per skill).

## Final Fantasy 1 look & feel

Blue gradient windows with white borders, the Press Start 2P pixel font and a pointing-hand cursor. Battles use the FF1 GBA layout: the scene on top with a message box over it, an enemy-name window bottom-left (the command menu replaces it on your turn) and the party HP window bottom-right. Shops show the keeper, Buy/Sell and a gold window; dialogue types out line by line.

**An actual start:** like FF1, the party begins at level 1, **unarmed**, with 400 G: arming everyone at the Haven Smithy
costs about 205 G and leaves room for potions. Monks (and other fist-wielding main jobs) punch hard bare-handed.

**Loot and growth:** every monster has a common drop (potions, ethers, antidotes...) and a ★ RARE drop (a gem, accessory or a
unique weapon, 4-8%); bosses always drop their treasure. The Bestiary lists each foe's drops once defeated (rares stay `???` until found).
The EXP curve (`EXP_TABLE` in `src/logic.js`) gives a level every 1-4 fights near Haven and ~6-10 regional fights later; KO'd heroes
get half EXP. `node tools/progress.mjs` simulates a full playthrough and checks the level reached at every stage and boss.

**Gentle start:** safe zones around every town, an encounter ramp that unlocks tougher monsters the farther you walk from Haven, and a warning toast when you enter swamp or snow below the recommended level.

**Towns** are laid out like Corneria: multi-tile buildings with slate roofs, a sign over the door (INN plaque, potion, sword, guild crest), white walls with windows and arched doors, solid drop shadows, cobbled streets with rounded corners, round trees, canals with bridges, a fountain plaza, graves and a low stone wall. Frostholm has snowy roofs and pines; Mirewood is thatch and boardwalks over the bog.

**Overworld** (`src/terrain.js`): FF1-style autotiling. Each tile is composed from a ground texture plus region layers (swamp, snow, sand, forest, water). Region edges are found by sampling a disc around every pixel across the 3x3 neighbourhood, so coastlines, woods and paths come out rounded the way the NES map looks: patterned blue ocean with a pale shore band, flat bright grass, dense merged forests, walled-town and dungeon icons.

## The story
Three hundred years ago the smith Gemforge bound three great evils inside gems: the Ashen Wyrm, the drowned Lich King
Morvath and the Frost Titan. Now the seals are cracking, and Haven's Elder rings the old bell. Four answer it: you name them
and choose their callings, and the story speaks to them by name.

The seals are not failing on their own. They are being cut. Chisel marks in the cavern and the crypt, a grey figure on a
ledge after the first evil falls, a boatman's passenger, an acolyte's old books: Wyrm and Lich can be taken in either order and
the scenes follow suit. Each slain evil leaves a heart-gem (Ember, Grave, Rime Heart; key items shown in the journal). At the
foot of the Frost Spire the party meets the one who wants them. The Titan is the last battle, and the last scene settles it.

- **Scenes** (`STORY` in `src/data.js`): a few lines the first time the party enters each dungeon, Mirewood and Frostholm;
  boss taunts as battle intros; an aftermath after every boss; the finale; an epilogue line per hero (by calling) in the ending.
  `scene()` in `src/game.js` plays them in the dialogue window (narration, heroes by party slot, or a cast member). Esc skips.
- **A world that notices**: NPCs carry `textBy: [[condition, lines], ...]` (first match wins) next to their default `text`;
  conditions are tiny strings like `'wyrm !lich'`, `'s:met'`, `'v:frostholm'`. Guards, the Elder, innkeepers, the acolyte, the
  Mirewood warden and boatwright, the Plains Hermit and the Desert Oracle all change their tune as the story moves. News is told
  once ahead of quest talk. `node tools/checkids.mjs` validates every condition, speaker and epilogue.
- **Journal**: the main thread as short narrative goals that reveal and update as the plot advances.

## The world
- **Overworld** (40x30) with four regions: Greenmarch, Mire Marsh (swamp), Northern Plains and the Frostfields. Fog of war,
  a minimap and a full map screen. A rockslide gates the north until the Ashen Wyrm falls.
- **Towns**: Haven Town, the swamp stilt-village Mirewood, and Frostholm. Buildings are enterable interiors (inn, general store, smithy, guild, houses) with
  NPCs, dialogue, shops and chests. A `!` over an NPC marks news.
- **Dungeons** with their own lighting, music and enemies: Ashen Cavern (Ashen Wyrm), Sunken Crypt (Lich King Morvath),
  Frost Spire (Frost Titan, the final boss), the optional Storm Cavern on the Northern Plains (Storm Drake) and the optional
  **Sunscar Ruins** (Lv 11-14): a sandstone temple under the desert ruins south-east of Haven, with column-lined halls, glyph panels,
  drifting sand, five treasure chests (Scarab Bow, Sandwalker Garb, Mirage Staff...) and the **Sphinx Pharaoh** on its sun-disc altar
  (drops the Pharaoh's Khopesh and Sun Disc Amulet; weak to ice and dark). 65 enemies including recolored tiers and rare elites. Level cap 20.
- **Gem-wright** (in each smithy): spend gold for up to 3 bonus sockets per hero, so more gems fit on their skills.
- **Side quests** (14) from NPCs (`!` = offer, `?` = ready to turn in), tracked in the journal: monster hunts, find-an-item, boss bounties,
  a **delivery** (Mirewood child -> her brother at the Frostholm Forge), a **treasure hunt** (Haven's old sailor and Captain Redwake's gold),
  and **rare-elite hunts** (Golden Boar, Crystal Golem: while the hunt is open the quarry turns up more often). New in Haven: Acolyte, Huntress,
  Old Sailor; Mirewood: Apothecary; Frostholm: Prospector; in the wilds: the Desert Oracle and the Plains Hermit.
- **Hidden treasures** (4): spots on the overworld and in towns that glint faintly now and then; step on one to dig it up. The hermit, the
  oracle and a few townsfolk drop hints. The journal counts them.
- **Ending**: the finale scene, then a cinematic dawn with an epilogue for each hero, scrolling credits and your stats.

## Visuals and sound (all generated in code)
- `src/sprites.js`, `src/art2.js`: ASCII-grid pixel sprites (10 jobs, townsfolk, 25 enemies, three 32x32 bosses, furniture,
  tile themes), recolor variants, gem icons.
- `src/stage.js`: animated battle stage: painted backdrops per region, per-enemy attack animations (squash, swoop, pounce,
  float, stomp), hit flashes, spell projectiles and per-element particles, floating damage numbers, an arena slide-in, boss title cards,
  camera zoom on big hits and a victory pose.
- `src/terrain.js`: autotiled outdoor/town terrain and whole-building images (see above).
- Map: smooth walking, party trail with walk cycle, torch lighting, weather per region, battle wipe, animated title screen.
- `src/audio.js`: Web Audio chiptune: 11 looping tracks (town, Frostholm, overworld, snow, cavern, crypt, spire, battle, boss)
  plus jingles and ~20 effects. Notation is a tiny string format (`"E5:2 G5 -:2"` = note:length-in-steps, `-` = rest).

## Layout
- `src/data.js`: content (jobs, skills, gems, gear, enemies, bosses, shops). Add content here.
- `src/maps.js`: maps, portals, NPCs, chests, bosses. `src/mapgen.js` is generated by `tools/genmaps.py`.
- `src/logic.js`: pure logic (stats, build rules, gem rewriting, battle engine). No DOM.
- `src/game.js`: map/menus/build UI/battle flow.

## Single-file build
    ESBUILD=/path/to/esbuild node tools/build.mjs     # or just: node tools/build.mjs (uses npx esbuild)
Produces `dist/index.html` (the whole game, about 150 KB, no other files, works from any static host or `file://`) and
`dist/artifact.html` (the same page as a fragment for hosts that supply the document shell). `dist/` is git-ignored.

## Tests and tools
    node tools/sim.mjs fast 100      # headless balance sim: every region and boss at expected levels
    node tools/progress.mjs          # playthrough sim from an unarmed level-1 start: level per stage, boss win rates, economy
    node tools/newbie.mjs            # first fights outside Haven with the cheapest weapons (levels 1-3) and unarmed
    node tools/checkids.mjs          # every id used by shops, chests, drops, quests, bosses and the new game exists
    node tools/checkmaps.mjs         # every map valid; every portal/NPC/chest/boss reachable; gate verified
    node tools/checksprites.mjs      # sprite sizes
    node tools/fuzz.mjs 4 1500       # randomized playtest: a bot plays the real UI, checks invariants, soft-locks, page errors
    node tools/regress-mobile.mjs    # iPhone touch regression (portrait + landscape)
    node tools/devices.mjs <outdir>  # device matrix: layout metrics + screenshots (SE, 14, Pro Max, landscape, iPad, desktop)
    node tools/regress.mjs           # browser regression (needs the dev server + Playwright); URL=... tests the dist build
    python3 tools/genmaps.py         # regenerate the big world and dungeons (deterministic; Sunscar Ruins uses seed 700)
    # tools/sheet.html: sprite contact sheet, open via the dev server
