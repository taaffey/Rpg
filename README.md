# Gemforge Chronicles

A turn-based JRPG in the spirit of Final Fantasy 1 and Dragon Warrior, built around deep build customization.
Plain HTML/JS modules, no build step.

## Run
    python3 -m http.server 8123     # then open http://localhost:8123

Controls: Arrows/WASD to move, Esc/M for the menu (on-screen pad on touch devices). In any menu or battle: arrows move the
focus, Enter/Space selects, Esc/Backspace goes back. The whole game is playable with the keyboard alone, or with the mouse.

## How builds work (three layered systems)
1. **Jobs**: every character has a *main job* and a *sub job* (8 jobs). Sub job contributes 40% of its stat modifiers,
   its skills (2 levels behind), and its weapon types. Change jobs in town at the Guild.
2. **Weapons**: 8 weapon types (sword, dagger, staff, bow, fists, whip, scythe, tome). Each type grants a
   **signature skill**; some weapons carry a free **innate gem** on it.
3. **Gems**: socket gems into any skill slot to rewrite it: element swaps, Chain, Echo, Vampiric, Piercing, Thrifty,
   Overcharge, Wide, Venom, Swift, Focus. Gem capacity comes from weapon/armor/accessory sockets (max 3 per skill).

## Vertical slice content
Town (shop, inn+save, guild) -> overworld -> Ashen Cavern (chests, 5 enemy types, boss: Ashen Wyrm). Level cap 12.

## Visuals (all generated in code, no asset files)
- **Battle stage** (`src/stage.js`): painted low-res backdrops (field, cavern, lava-lit boss lair), heroes right / foes left,
  attack lunges, hit flashes, enemy dissolve and hero KO poses, per-element spell particles (fire, ice, bolt, holy, dark,
  slash, heal), pixel-font damage numbers, status icons over sprites.
- **Map**: smooth tile-to-tile walking, torch-lit darkness in the cavern, cloud shadows and flowers on the overworld,
  shoreline foam, battle-start screen wipe. Animated title screen. FF-style window skin.
- **Party & lighting**: the party trails behind the leader with a 4-frame walk cycle; cavern torches flicker and glow;
  town has trees and lamp posts; a banner announces each new area; menus animate in; pixel icons for every gem;
  HP bars shift green/yellow/red; spell orbs fly from caster to target.
- **Boss**: a 32x32 Ashen Wyrm, authored as a half-sprite and mirrored in code.

## Art and sound
- `src/sprites.js`: 16x16 ASCII-grid pixel sprites (8 job heroes, 9 enemies, tiles, objects) plus seeded procedural textures.
  Heroes are recolored from shared head/body templates, so a new job is a palette entry.
- `src/audio.js`: Web Audio chiptune engine (square/triangle/saw/noise). Looping tracks for town, overworld, cavern,
  battle and boss (with drums), jingles for victory/game over, and ~20 sound effects. Notation is a tiny string
  format (`"E5:2 G5 -:2"` = note:length-in-steps, `-` = rest). Mute button in the HUD; audio starts on first click/key.

## Layout
- `src/data.js`: all content (jobs, skills, gems, gear, enemies, maps). Add content here.
- `src/logic.js`: pure logic (stats, build rules, gem rewriting, battle engine). No DOM.
- `src/game.js`: map, menus, build UI, battle UI.
- `tools/sheet.html`: sprite contact sheet (open via the dev server); `tools/checksprites.mjs`: sprite size check.
- `tools/sim.mjs`: headless balance sim. `tools/checkmaps.mjs`: map reachability check.
