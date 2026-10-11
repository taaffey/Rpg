// ===== Map characters: party members and townsfolk walking around towns and the overworld =====
// Interface used by game.js draw():
//   walker(job, dir, frame)     -> canvas for a party member; dir 'down' | 'up' | 'left' | 'right'; frame 0 = standing, 1..3 = walk cycle
//   npcWalker(type, dir, frame) -> canvas for a townsperson (types are the keys of NPC_STYLE in art2.js)
// Canvases are 16 px wide and may be taller than 16 px (e.g. 16x24); the renderer stands them on the bottom of the tile.
// This first version reuses the side-view battle/NPC sprites and mirrors them for 'left'.
import * as SP from './sprites.js';

const cache = new Map();
const flip = (c) => { const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const x = o.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return o; };
const WALK = [0, 1, 0, 2];
export function walker(job, dir = 'down', frame = 0) {
  const k = `w${job}${dir}${frame}`; if (cache.has(k)) return cache.get(k);
  const base = SP.hero(job, WALK[frame % 4]), c = dir === 'left' ? flip(base) : base;
  cache.set(k, c); return c;
}
export function npcWalker(type, dir = 'down', frame = 0) {
  const k = `n${type}${dir}${frame}`; if (cache.has(k)) return cache.get(k);
  const base = SP.npc(type, 0), c = dir === 'left' ? flip(base) : base;
  cache.set(k, c); return c;
}
