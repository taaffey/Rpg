// ===== Map characters: party members and townsfolk walking around towns and the overworld =====
// Interface used by game.js draw():
//   walker(job, dir, frame)     -> canvas for a party member; dir 'down' | 'up' | 'left' | 'right'; frame 0 = standing, 1..3 = walk cycle
//   npcWalker(type, dir, frame) -> canvas for a townsperson (types are the keys of NPC_STYLE in art2.js)
// 16x24 SNES-style chibi field sprites (taller when a spear/staff pokes above the head), painted from layered
// ASCII parts in walkerart.js with per-character 4-shade material ramps and an automatic coloured outline.
// Walk cycle: 1 = stride A, 2 = passing, 3 = stride B (body dips 1px on strides, arms swing opposite the legs).
import { NPCS, compose, cfgFor } from './walkerart.js';

const cache = new Map();
const flip = (c) => { const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const x = o.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return o; };
const DIRS = { down: 1, up: 1, left: 1, right: 1 };
function get(k, cfg, dir, frame, npc = false) {
  let c = cache.get(k); if (c) return c;
  const d = DIRS[dir] ? dir : 'down', f = ((frame | 0) % 4 + 4) % 4;
  c = d === 'left' ? flip(get(k.replace('|left|', '|right|'), cfg, 'right', f, npc)) : npc && f === 1 ? compose(cfg, d, 0, true) : compose(cfg, d, f);
  cache.set(k, c); return c;
}
// job: a calling id or 'job@look' (e.g. 'knight@adam', 'bloke@devon'); unknown looks fall back to the plain calling
export function walker(job, dir = 'down', frame = 0) {
  return get(`w|${job}|${dir}|${frame}`, cfgFor(job), dir, frame);
}
export function npcWalker(type, dir = 'down', frame = 0) {
  // npcs: frame 1 is an idle blink of the standing pose; 2 and 3 are stride frames if one ever walks
  return get(`n|${type}|${dir}|${frame}`, NPCS[type] || (String(type).includes('@') ? cfgFor(type) : NPCS.villager), dir, frame, true);
}
