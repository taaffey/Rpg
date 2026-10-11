// ===== Town renderer: autotiled streets/grass/water + buildings, trees, fountains and props =====
// Same interface as terrain.js (isTheme, ground, objects, mapObjects); see the comment there for draw items.
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
  town: {
    ground: () => 'tgrass',
    layers: [
      { is: FIRST('_EHF'), tex: 'cobble', r: 4, edge: 0.57, edgeCol: '#303030' },
      { is: FIRST('#'), tex: 'wall', r: 2, edge: 0.6, edgeCol: '#202020' },
      { is: FIRST(T_WATER), tex: 'water', anim: true, r: 3, edge: 0.6, edgeCol: '#1a5ab0', inner: '#d4f0fc' },
    ],
  },
  snowtown: {
    ground: () => 'snow',
    layers: [
      { is: FIRST('_EHF'), tex: 'scobble', r: 4, edge: 0.57, edgeCol: '#3a4a60' },
      { is: FIRST('#'), tex: 'swall', r: 2, edge: 0.6, edgeCol: '#2a3a50' },
      { is: FIRST(T_WATER), tex: 'water', anim: true, r: 3, edge: 0.6, edgeCol: '#1a5ab0', inner: '#d4f0fc' },
    ],
  },
  swamptown: {
    ground: () => 'swamp',
    layers: [
      { is: FIRST(T_WATER), tex: 'swampwater', anim: true, r: 4, edge: 0.6, edgeCol: '#1a2e22', inner: '#7aa08a' },
      { is: FIRST('_EHF'), tex: 'boards', r: 2, edge: 0.6, edgeCol: '#2a1a0c' },
      { is: FIRST('#'), tex: 'wwall', r: 2, edge: 0.6, edgeCol: '#1a0e04' },
    ],
  },
};
const autoTile = composer(THEMES, textures);
const sp = new Map();
const once = (k, f) => { if (!sp.has(k)) sp.set(k, f()); return sp.get(k); };
export const isTheme = (theme) => !!THEMES[theme];
export const ground = (theme, get, x, y, t) => autoTile(theme, get, x, y, Math.floor(t * 2.2) % 4);

// FF1 town tree: a big round canopy with a dark rim, a light upper-left, and a short trunk
const ROUND_TREE = ['....kkkkkkk.....', '..kkGgggggGkk...', '.kGggllgggggGk..', '.kgglllggggggk..', 'kGgllgggggggGGk.', 'kggggggggggggGk.', 'kgggggggggggGGk.', 'kGgggggggggGGGk.', '.kGgggggggGGGk..', '.kkGGgggGGGGkk..', '...kkGGGGGkk....', '.....kknNkk.....', '......knNk......', '.....kknNNk.....', '......kkkk......', '................'];
const PINE = ['.......k........', '......kGk.......', '.....kwGGk......', '.....kGgGk......', '....kwwGgGk.....', '....kGGggGk.....', '...kwwwGggGk....', '...kGGGgggGk....', '..kwwwwGgggGk...', '..kGGGGggggGk...', '.kwwwwwGggggGk..', '.kkkkkkkkkkkkk..', '......knNk......', '......knNk......', '.....kkkkkk.....', '................'];
export const townTree = (kind = 'tree') => once('tt' + kind, () => kind === 'snow' ? sprite(PINE, { G: '#0e4a32', g: '#2a7a52', w: '#ffffff', n: '#8a5a30', N: '#553820' })
  : sprite(ROUND_TREE, kind === 'swamp' ? { g: '#5e8a3a', G: '#2e4a1c', l: '#9ac060', n: '#6a4a2a', N: '#3a2614' } : { g: '#28a030', G: '#0a5a14', l: '#90e050', n: '#8a5a30', N: '#553820' }));
export function bridge(vertical) {
  return once('br' + vertical, () => { const c = mk(16, 16), x = c.getContext('2d');
    if (vertical) { x.fillStyle = '#000'; x.fillRect(2, 0, 12, 16); x.fillStyle = '#9a9a9a'; x.fillRect(3, 0, 10, 16); x.fillStyle = '#c8c8c8'; for (let y = 0; y < 16; y += 4) x.fillRect(3, y, 10, 1); x.fillStyle = '#5a5a5a'; x.fillRect(3, 0, 1, 16); x.fillRect(12, 0, 1, 16); }
    else { x.fillStyle = '#000'; x.fillRect(0, 2, 16, 12); x.fillStyle = '#9a9a9a'; x.fillRect(0, 3, 16, 10); x.fillStyle = '#c8c8c8'; for (let k = 0; k < 16; k += 4) x.fillRect(k, 3, 1, 10); x.fillStyle = '#5a5a5a'; x.fillRect(0, 3, 16, 1); x.fillRect(0, 12, 16, 1); }
    return c; });
}
export function fountain(frame, half = -1) { // stone basin with a jet of water; half 0/1 = left/right of a two-tile fountain
  const big = once('fo' + frame, () => { const c = mk(32, 16), x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(2, 4, 28, 12); x.fillRect(4, 3, 24, 1); x.fillStyle = '#e0e0e0'; x.fillRect(3, 5, 26, 10); x.fillStyle = '#a8a8a8'; x.fillRect(3, 13, 26, 2);
    x.fillStyle = '#28b0d8'; x.fillRect(5, 6, 22, 7); x.fillStyle = '#a8f0fc'; for (const [a, b] of frame ? [[7, 8], [13, 10], [19, 8], [23, 11], [10, 11]] : [[8, 10], [14, 8], [20, 11], [24, 8], [11, 7]]) x.fillRect(a, b, 3, 1);
    x.fillStyle = '#000'; x.fillRect(14, 3, 4, 6); x.fillStyle = '#c8c8c8'; x.fillRect(15, 4, 2, 5);
    x.fillStyle = '#f8f8f8'; x.fillRect(15, frame ? 0 : 1, 2, 3); x.fillStyle = '#a8f0fc'; x.fillRect(12 - frame, 2, 1, 3); x.fillRect(19 + frame, 2, 1, 3); x.fillRect(10 - frame, 5, 1, 1); x.fillRect(21 + frame, 5, 1, 1); return c; });
  if (half < 0) return big;
  return once('fh' + frame + half, () => { const c = mk(16, 16); c.getContext('2d').drawImage(big, half * 16, 0, 16, 16, 0, 0, 16, 16); return c; });
}
const GRAVE = ['................', '.....kkkkkk.....', '....kwwwwwwk....', '...kwwwwwwwwk...', '...kwwsSSswwk...', '...kwwwSSwwwk...', '...kwwsSSswwk...', '...kwwwSSwwwk...', '...kwwwwwwwwk...', '...kwwwwwwwwk...', '...kwwwwwwwwk...', '...kSSSSSSSSk...', '..kkkkkkkkkkkk..', '..kSSSSSSSSSSk..', '..kkkkkkkkkkkk..', '................'];
export const grave = () => once('grave', () => sprite(GRAVE, { w: '#d8d8d8', s: '#a8a8a8', S: '#787878' }));

// ---------- buildings: one image per building, FF1 Corneria style ----------
// roof (slate grid) over a white wall with a row of dark windows and an arched door; an icon sign sits on the roof above the door
const ROOF = {
  town: { base: '#a0a0a0', line: '#383838', hi: '#e0e0e0', top: '#f8f8f8', wall: '#f8f8f8', wallLo: '#c0c0c0', win: '#181818', door: '#808080', doorHi: '#b8b8b8' },
  snowtown: { base: '#9aaac0', line: '#3a4a60', hi: '#dce6f2', top: '#ffffff', wall: '#f0f4fa', wallLo: '#b8c6d8', win: '#1a2638', door: '#6a7a90', doorHi: '#aab8cc', snow: true },
  swamptown: { base: '#b08a48', line: '#5a4020', hi: '#d8b870', top: '#e8d090', wall: '#8a5a30', wallLo: '#5a3a1c', win: '#1a0e04', door: '#5a3a1c', doorHi: '#8a6038', thatch: true },
};
const SIGN = { // 12x12 icon art painted on a white-framed plaque
  smith: ['............', '.........ww.', '........wcw.', '.......wcw..', '......wcw...', '.....wcw....', '..k.wcw.....', '..kkcw......', '...kk.......', '..kkkk......', '.kk..k......', '............'],
  armor: ['............', '..wwwwwwww..', '..wccccccw..', '..wccwwccw..', '..wcwwwwcw..', '..wccwwccw..', '..wccwwccw..', '...wccccw...', '....wccw....', '.....ww.....', '............', '............'],
  shop: ['............', '.....kk.....', '.....ww.....', '....wwww....', '...wccccw...', '..wccccccw..', '..wcwccccw..', '..wccccccw..', '..wccccccw..', '...wwwwww...', '............', '............'],
  guild: ['............', '.....ww.....', '.....ww.....', '..wwwwwwww..', '..wwwwwwww..', '.....ww.....', '....wwww....', '...ww..ww...', '..ww....ww..', '............', '............', '............'],
  gem: ['............', '....wwww....', '...wccccw...', '..wccwwccw..', '.wccwccwccw.', '.wcccccccww.', '..wcccccw...', '...wcccw....', '....wcw.....', '.....w......', '............', '............'],
};
const INN = ['k...k...k..k...k', 'k...kk..k..kk..k', 'k...k.k.k..k.k.k', 'k...k..kk..k..kk', 'k...k...k..k...k'];
function sign(x, kind, cx, cy) {
  if (kind === 'inn') {
    x.fillStyle = '#000'; x.fillRect(cx - 12, cy - 6, 24, 12); x.fillStyle = '#f8f8f8'; x.fillRect(cx - 11, cy - 5, 22, 10);
    x.fillStyle = '#000'; INN.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === 'k') x.fillRect(cx - 8 + i, cy - 2 + j, 1, 1); })); return;
  }
  const art = SIGN[kind]; if (!art) return;
  x.fillStyle = '#000'; x.fillRect(cx - 8, cy - 8, 16, 16); x.fillStyle = '#f8f8f8'; x.fillRect(cx - 7, cy - 7, 14, 14); x.fillStyle = '#28a8c8'; x.fillRect(cx - 6, cy - 6, 12, 12);
  const pal = { w: '#f8f8f8', c: '#78e0f8', k: '#303030' };
  art.forEach((r, j) => [...r].forEach((ch, i) => { if (pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(cx - 6 + i, cy - 6 + j, 1, 1); } }));
}
// returns a canvas of w*16 x h*16 pixels; door = column index (0-based) of the door in the bottom row
export function building(theme, kind, w, h, door) {
  return once(`bd${theme}${kind}${w}x${h}d${door}`, () => {
    const P = ROOF[theme] || ROOF.town, c = mk(w * 16, h * 16), x = c.getContext('2d'), W = w * 16, roofH = (h - 1) * 16;
    // roof
    x.fillStyle = '#000'; x.fillRect(0, 0, W, roofH + 1);
    x.fillStyle = P.base; x.fillRect(1, 2, W - 2, roofH - 2);
    x.fillStyle = P.top; x.fillRect(1, 1, W - 2, 1);
    if (P.thatch) { x.fillStyle = P.line; for (let y = 5; y < roofH; y += 4) for (let k = (y % 8 ? 0 : 2); k < W; k += 4) x.fillRect(k, y, 2, 1); x.fillStyle = P.hi; for (let y = 3; y < roofH; y += 4) x.fillRect(1, y, W - 2, 1); }
    else {
      for (let y = 2; y < roofH; y += 6) { x.fillStyle = P.line; x.fillRect(1, y + 5, W - 2, 1); x.fillStyle = P.hi; x.fillRect(1, y, W - 2, 1); }
      x.fillStyle = P.line; for (let k = 6; k < W - 1; k += 6) x.fillRect(k, 2, 1, roofH - 2);
    }
    if (P.snow) { x.fillStyle = '#ffffff'; x.fillRect(1, 1, W - 2, 4); for (let k = 2; k < W - 2; k += 5) x.fillRect(k, 5, 2, 1 + (k % 3)); }
    // wall
    const wy = roofH; x.fillStyle = '#000'; x.fillRect(0, wy, W, 16);
    x.fillStyle = P.wall; x.fillRect(1, wy, W - 2, 15); x.fillStyle = P.wallLo; x.fillRect(1, wy + 13, W - 2, 2);
    if (P.thatch) { x.fillStyle = P.wallLo; for (let k = 4; k < W; k += 4) x.fillRect(k, wy, 1, 13); }
    x.fillStyle = P.win;
    for (let k = 3; k < W - 4; k += 6) { const col = Math.floor((k + 2) / 16); if (col === door || Math.floor((k + 5) / 16) === door) continue; x.fillRect(k, wy + 4, 4, 5); }
    // door: arched double door
    const dx = door * 16 + 3;
    x.fillStyle = '#000'; x.fillRect(dx, wy + 2, 10, 14); x.fillRect(dx + 1, wy + 1, 8, 1);
    x.fillStyle = P.door; x.fillRect(dx + 1, wy + 3, 8, 13); x.fillStyle = P.doorHi; x.fillRect(dx + 2, wy + 3, 1, 12); x.fillRect(dx + 6, wy + 3, 1, 12);
    x.fillStyle = '#000'; x.fillRect(dx + 5, wy + 3, 1, 13);
    if (kind !== 'house') sign(x, kind, door * 16 + 8, roofH - 9);
    return c;
  });
}

export function objects(theme, get, x, y, t, out, m) {
  const ch = get(x, y); let o = null;
  if (ch === '=') o = bridge(get(x - 1, y) === '~' && get(x + 1, y) === '~');
  else if (ch === 'T' || ch === 't') o = townTree(ch === 't' ? 'snow' : theme === 'swamptown' ? 'swamp' : 'tree');
  else if (ch === 'F') o = fountain(Math.floor(t * 4) % 2, get(x - 1, y) === 'F' ? 1 : get(x + 1, y) === 'F' ? 0 : -1);
  else if (ch === 'G') o = grave();
  if (o) out.push({ img: o, x, y, z: 1 });
}
export function mapObjects(m, t, out, ctx) {
  for (const b of m.buildings || []) out.push({ shadow: true, x: b.x, y: b.y, w: b.w, h: b.h, z: 0 }, { img: building(m.theme, b.kind, b.w, b.h, b.door), x: b.x, y: b.y, w: b.w, h: b.h, z: 1 });
}
