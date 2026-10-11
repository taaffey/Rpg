# Gemforge Chronicles

A turn-based JRPG in the spirit of Final Fantasy 1 and Dragon Warrior, built around deep build customization.
Plain HTML/JS modules, no build step.

## Run
    python3 -m http.server 8123     # then open http://localhost:8123

Controls: Arrows/WASD to move, Esc/M for the menu (on-screen pad on touch devices).

## How builds work (three layered systems)
1. **Jobs**: every character has a *main job* and a *sub job* (8 jobs). Sub job contributes 40% of its stat modifiers,
   its skills (2 levels behind), and its weapon types. Change jobs in town at the Guild.
2. **Weapons**: 8 weapon types (sword, dagger, staff, bow, fists, whip, scythe, tome). Each type grants a
   **signature skill**; some weapons carry a free **innate gem** on it.
3. **Gems**: socket gems into any skill slot to rewrite it: element swaps, Chain, Echo, Vampiric, Piercing, Thrifty,
   Overcharge, Wide, Venom, Swift, Focus. Gem capacity comes from weapon/armor/accessory sockets (max 3 per skill).

## Vertical slice content
Town (shop, inn+save, guild) -> overworld -> Ashen Cavern (chests, 5 enemy types, boss: Ashen Wyrm). Level cap 12.

## Layout
- `src/data.js`: all content (jobs, skills, gems, gear, enemies, maps). Add content here.
- `src/logic.js`: pure logic (stats, build rules, gem rewriting, battle engine). No DOM.
- `src/game.js`: map, menus, build UI, battle UI.
- `tools/sim.mjs`: headless balance sim. `tools/checkmaps.mjs`: map reachability check.
