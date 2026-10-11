// ===== Overworld renderer: autotiled terrain + overworld objects (mountains, towns, dungeons, bridges) =====
// Interface used by game.js draw():
//   isTheme(theme)                         -> true if this module draws that map theme
//   ground(theme, get, x, y, t)            -> 16x16 canvas for the ground of tile (x, y); get(x, y) = map char, t = seconds
//   objects(theme, get, x, y, t, out, m)   -> push draw items for tile (x, y) into out
//   mapObjects(m, t, out, ctx)             -> push map-level draw items (multi-tile structures, props) into out
// A draw item is { img, x, y, w, h, z, sy }: position/size in TILE units (w/h default img size / 16), z: 0 = flat on the
// ground (drawn before characters), 1 = depth-sorted with characters by sy (default y + h), 2 = above everything.
import { sprite, ART } from './sprites.js';
import { FURN } from './art2.js';
import { mk, rng, hex, tex, flat, water, canopy, cobble, blocks, planks, sand, composer } from './autotile.js';

let TX = null;
function textures() {
  if (TX) return TX;
  TX = {
    grass: flat('#2aa83a', ['#1f9030', '#38b848'], 0.035, 3),
    tgrass: flat('#2aa83a', ['#c8642a', '#1f9030'], 0.03, 5), // town grass: the little orange dashes Corneria has
    snow: flat('#eef4fc', ['#d4e2f2', '#ffffff', '#c4d6ec'], 0.12, 7),
    swamp: flat('#4a6a38', ['#2e4a28', '#5e7e44', '#22381e'], 0.16, 9),
    mud: flat('#5a6a3a', ['#3e4c2a', '#6e7e48'], 0.12, 11),
    sand: sand('#e0c070', ['#c8a050', '#f0d890'], 13),
    water: [0, 1, 2, 3].map((f) => water('#3c94f0', '#a8dcfc', f)),
    swampwater: [0, 1, 2, 3].map((f) => water('#2c5a5c', '#5a8a7c', f)),
    forest: canopy('#064a10', '#1c9a2a', '#8ae050', '#043008', 21),
    snowforest: canopy('#0c3a2a', '#3a8a6a', '#ffffff', '#062218', 23),
    swampforest: canopy('#1c2e14', '#3e6028', '#7a9a48', '#121e0c', 25),
    cobble: cobble('#a8a8a8', '#484848', '#d8d8d8', 31),
    scobble: cobble('#c8d4e4', '#5a6a80', '#ffffff', 33),
    boards: planks('#9a6a3c', '#5a3a1c', 35),
    wall: blocks('#c8c8c8', '#585858', '#f0f0f0'),
    swall: blocks('#dce6f2', '#5a6a80', '#ffffff'),
    wwall: planks('#6a4a2a', '#3a2614', 37),
  };
  return TX;
}

// ---------- themes: ground per tile, region layers (bottom to top), and sprite overlays ----------
const FIRST = (s) => (ch) => s.includes(ch);
const T_WATER = '~=', T_FOREST = 'T', T_SNOWF = 't';
const THEMES = {
  world: {
    ground: () => 'grass',
    // which broad region a tile belongs to; features (forest, mountain, towns, water) take their surroundings' region
    base: (ch, N) => { const g = (c) => (c === ',' || c === 't' ? 's' : c === ':' ? 'w' : c === '.' ? 'g' : null); const own = g(ch); if (own) return own; const n = { s: 0, w: 0, g: 0 }; for (const c of N) { const v = g(c); if (v) n[v]++; } return n.s > n.g && n.s >= n.w ? 's' : n.w > n.g ? 'w' : 'g'; },
    layers: [
      { is: (c, b) => c === ':' || (!'.,:t'.includes(c) && b === 'w'), tex: 'swamp', r: 6, edge: 0.56, edgeCol: '#2e4a24' },
      { is: (c, b) => c === ',' || c === 't' || (!'.,:'.includes(c) && b === 's'), tex: 'snow', r: 6, edge: 0.54, edgeCol: '#c4d6ec' },
      { is: FIRST('_B'), tex: 'sand', r: 4, edge: 0.56, edgeCol: '#a88038' },
      { is: FIRST(T_FOREST), tex: 'forest', r: 5, edge: 0.6, edgeCol: '#000000' },
      { is: FIRST(T_SNOWF), tex: 'snowforest', r: 5, edge: 0.6, edgeCol: '#1a2a38' },
      { is: FIRST(T_WATER), tex: 'water', anim: true, r: 6, edge: 0.7, edgeCol: '#d4f0fc' },
    ],
  },
};
const autoTile = composer(THEMES, textures);
export const isTheme = (theme) => theme === 'world';
export const ground = (theme, get, x, y, t) => autoTile(theme, get, x, y, Math.floor(t * 2.2) % 4);

// ---------- overlays drawn on top of the composed ground ----------
const sp = new Map();
const once = (k, f) => { if (!sp.has(k)) sp.set(k, f()); return sp.get(k); };
const MOUNTAIN = { w: '#f4ead0', s: '#c09058', S: '#7a5430', n: '#5a3a1c', N: '#3a2410' };
const SNOWMT = { s: '#c8d4e4', S: '#7a8aa8', n: '#5a6a88', N: '#3a4a68', w: '#ffffff' };
export const mountain = (snowy) => once('mt' + snowy, () => sprite(ART.mountain, snowy ? SNOWMT : MOUNTAIN));
// FF1 town tree: a big round canopy with a dark rim, a light upper-left, and a short trunk
const ROUND_TREE = ['....kkkkkkk.....', '..kkGgggggGkk...', '.kGggllgggggGk..', '.kgglllggggggk..', 'kGgllgggggggGGk.', 'kggggggggggggGk.', 'kgggggggggggGGk.', 'kGgggggggggGGGk.', '.kGgggggggGGGk..', '.kkGGgggGGGGkk..', '...kkGGGGGkk....', '.....kknNkk.....', '......knNk......', '.....kknNNk.....', '......kkkk......', '................'];
const PINE = ['.......k........', '......kGk.......', '.....kwGGk......', '.....kGgGk......', '....kwwGgGk.....', '....kGGggGk.....', '...kwwwGggGk....', '...kGGGgggGk....', '..kwwwwGgggGk...', '..kGGGGggggGk...', '.kwwwwwGggggGk..', '.kkkkkkkkkkkkk..', '......knNk......', '......knNk......', '.....kkkkkk.....', '................'];
export const townTree = (kind = 'tree') => once('tt' + kind, () => kind === 'snow' ? sprite(PINE, { G: '#0e4a32', g: '#2a7a52', w: '#ffffff', n: '#8a5a30', N: '#553820' })
  : sprite(ROUND_TREE, kind === 'swamp' ? { g: '#5e8a3a', G: '#2e4a1c', l: '#9ac060', n: '#6a4a2a', N: '#3a2614' } : { g: '#28a030', G: '#0a5a14', l: '#90e050', n: '#8a5a30', N: '#553820' }));
// little walled town as seen from the overworld: grey wall, plaza, white houses with grey roofs, a gate gap at the bottom
export const townIcon = (kind) => once('ti' + kind, () => {
  const c = mk(16, 16), x = c.getContext('2d'), snow = kind === 'snow', village = kind === 'village';
  if (!village) { x.fillStyle = '#000'; x.fillRect(0, 1, 16, 15); x.fillStyle = snow ? '#e8f0f8' : '#d0d0d0'; x.fillRect(1, 2, 14, 13); x.fillStyle = snow ? '#b8c8dc' : '#9a9a9a'; x.fillRect(2, 3, 12, 11); x.fillStyle = '#000'; x.fillRect(7, 14, 2, 2); x.fillStyle = snow ? '#b8c8dc' : '#9a9a9a'; x.fillRect(7, 14, 2, 1); }
  const roof = village ? '#a07838' : snow ? '#ffffff' : '#6a6a6a', wall = village ? '#d8c090' : '#f8f8f8';
  for (const [hx, hy] of village ? [[1, 3], [9, 2], [5, 9], [11, 9]] : [[3, 3], [9, 3], [3, 8], [9, 8]]) {
    x.fillStyle = '#000'; x.fillRect(hx - 1, hy - 1, 6, 6); x.fillStyle = roof; x.fillRect(hx, hy, 4, 2); x.fillStyle = wall; x.fillRect(hx, hy + 2, 4, 2); x.fillStyle = '#000'; x.fillRect(hx + 1, hy + 3, 1, 1);
  }
  return c;
});
const CAVE_ICON = ['................', '................', '......kkkk......', '....kknnnnkk....', '...knnNnnnnnk...', '..knnnkkkknnnk..', '..knnkkkkkknNk..', '.knnNkkkkkknnnk.', '.knnnkkkkkknnnk.', '.kkkkkkkkkkkkkk.', '................', '................', '................', '................', '................', '................'];
const SHRINE_ICON = ['................', '.......kk.......', '......kwwk......', '.....kwSSwk.....', '....kkkkkkkk....', '....kssssssk....', '....kskkkksk....', '....kskkkksk....', '....kskkkksk....', '...kkkkkkkkkk...', '...ksssssssssk..', '...kkkkkkkkkkk..', '................', '................', '................', '................'];
const TOWER_ICON = ['.......kk.......', '......kcck......', '......kwck......', '.....kcwwck.....', '.....kckkck.....', '.....kcwwck.....', '....kcwwwwck....', '....kcwkkwck....', '....kcwwwwck....', '...kcwwkkwwck...', '...kcwwkkwwck...', '..kkkkkkkkkkkk..', '................', '................', '................', '................'];
export const placeIcon = (kind) => once('pi' + kind, () => {
  if (kind === 'crypt') return sprite(SHRINE_ICON, { s: '#7a8a7a', S: '#4a5a4a', w: '#c8d8c8' });
  if (kind === 'spire') return sprite(TOWER_ICON, { c: '#7fb8e8', w: '#e8f4ff' });
  if (kind === 'storm') return sprite(CAVE_ICON, { n: '#5a5c8a', N: '#3a3c64' });
  return sprite(CAVE_ICON, { n: '#8a6a48', N: '#5a4028' });
});
export function bridge(vertical) {
  return once('br' + vertical, () => { const c = mk(16, 16), x = c.getContext('2d');
    if (vertical) { x.fillStyle = '#000'; x.fillRect(2, 0, 12, 16); x.fillStyle = '#9a9a9a'; x.fillRect(3, 0, 10, 16); x.fillStyle = '#c8c8c8'; for (let y = 0; y < 16; y += 4) x.fillRect(3, y, 10, 1); x.fillStyle = '#5a5a5a'; x.fillRect(3, 0, 1, 16); x.fillRect(12, 0, 1, 16); }
    else { x.fillStyle = '#000'; x.fillRect(0, 2, 16, 12); x.fillStyle = '#9a9a9a'; x.fillRect(0, 3, 16, 10); x.fillStyle = '#c8c8c8'; for (let k = 0; k < 16; k += 4) x.fillRect(k, 3, 1, 10); x.fillStyle = '#5a5a5a'; x.fillRect(0, 3, 16, 1); x.fillRect(0, 12, 16, 1); }
    return c; });
}

const snowyAt = (get, x, y) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => ',t'.includes(get(x + a, y + b)));
export function objects(theme, get, x, y, t, out, m) {
  const ch = get(x, y); let o = null;
  if (ch === '=') o = bridge(get(x - 1, y) === '~' && get(x + 1, y) === '~');
  else if (ch === 'M') o = mountain(snowyAt(get, x, y));
  else if (ch === 'B' && !m.gateOpen) o = sprite(FURN.rockslide);
  else if (ch === 'H') { const p = m.portals?.[`${x},${y}`]?.to; o = townIcon(p === 'frostholm' ? 'snow' : p === 'mirewood' ? 'village' : 'town'); }
  else if (ch === 'D') o = placeIcon(m.portals?.[`${x},${y}`]?.to);
  if (o) out.push({ img: o, x, y, z: 0 });
}
export function mapObjects(m, t, out, ctx) {}
