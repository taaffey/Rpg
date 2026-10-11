// ===== FF1-style terrain: rounded autotiled regions (coasts, forests, paths, walls) + whole multi-tile buildings =====
// Every outdoor/town tile is composed from a ground texture plus "region" layers. A layer's edge is found by
// sampling a disc around each pixel over the 3x3 neighbourhood, so straight edges stay on the tile border while
// corners come out rounded, the way the NES overworld and towns look. Results are cached per neighbourhood key.
import { sprite, ART } from './sprites.js';
import { FURN } from './art2.js';

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function rng(seed) { let a = seed; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };

// ---------- textures: 32x32 so repeats are less obvious; sampled by world position so neighbours line up ----------
function tex(draw) { const c = mk(32, 32), x = c.getContext('2d'); draw(x); return { c, d: x.getImageData(0, 0, 32, 32).data }; }
function flat(base, specks = [], density = 0, seed = 1) {
  return tex((x) => { const r = rng(seed); x.fillStyle = base; x.fillRect(0, 0, 32, 32); for (let i = 0; i < 1024 * density; i++) { x.fillStyle = specks[Math.floor(r() * specks.length)]; x.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), specks.length > 2 && i % 3 === 0 ? 2 : 1, 1); } });
}
function water(base, wave, frame) { // NES ocean: rows of little scalloped ripples that drift sideways
  return tex((x) => {
    x.fillStyle = base; x.fillRect(0, 0, 32, 32); x.fillStyle = wave;
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      const ox = (col * 8 + (row % 2) * 4 + frame * 2) % 32, oy = row * 8 + 2;
      for (const [dx, dy] of [[0, 1], [1, 0], [2, 0], [3, 0], [4, 1], [1, 3], [2, 3], [3, 3]]) x.fillRect((ox + dx) % 32, oy + dy, 1, 1);
    }
  });
}
function canopy(dark, mid, light, gap, seed) { // dense forest: overlapping round bushes, wrapped so the texture tiles
  return tex((x) => {
    const r = rng(seed); x.fillStyle = gap; x.fillRect(0, 0, 32, 32);
    const blob = (cx, cy, rad) => { for (const ox of [-32, 0, 32]) for (const oy of [-32, 0, 32]) {
      x.fillStyle = dark; x.beginPath(); x.arc(cx + ox + 0.5, cy + oy + 1.5, rad, 0, 7); x.fill();
      x.fillStyle = mid; x.beginPath(); x.arc(cx + ox, cy + oy, rad - 0.6, 0, 7); x.fill();
      x.fillStyle = light; x.fillRect(Math.round(cx + ox - rad / 2), Math.round(cy + oy - rad / 2), 2, 1); x.fillRect(Math.round(cx + ox - rad / 2), Math.round(cy + oy - rad / 2) + 1, 1, 1);
    } };
    for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) blob(col * 6.4 + (row % 2) * 3.2 + r() * 1.5, row * 6.4 + r() * 1.5, 3.6 + r() * 0.8);
  });
}
function cobble(fill, line, hi, seed) { // rounded grey stones in offset rows (FF1 town streets)
  return tex((x) => {
    const r = rng(seed); x.fillStyle = line; x.fillRect(0, 0, 32, 32);
    for (let row = 0; row < 8; row++) for (let col = -1; col < 5; col++) {
      const w = 6 + Math.floor(r() * 3), sx = col * 8 + (row % 2) * 4 + Math.floor(r() * 2), sy = row * 4;
      x.fillStyle = fill; x.fillRect(sx + 1, sy, w - 1, 3); x.fillStyle = hi; x.fillRect(sx + 1, sy, w - 2, 1);
    }
  });
}
function blocks(fill, line, hi) { // low stone town wall: big pale blocks
  return tex((x) => {
    x.fillStyle = line; x.fillRect(0, 0, 32, 32);
    for (let row = 0; row < 4; row++) for (let col = -1; col < 3; col++) { const sx = col * 16 + (row % 2) * 8, sy = row * 8; x.fillStyle = fill; x.fillRect(sx + 1, sy + 1, 14, 6); x.fillStyle = hi; x.fillRect(sx + 1, sy + 1, 14, 1); }
  });
}
function planks(fill, line, seed) { // boardwalk for the swamp village
  return tex((x) => { const r = rng(seed); x.fillStyle = fill; x.fillRect(0, 0, 32, 32); x.fillStyle = line; for (let y = 3; y < 32; y += 5) x.fillRect(0, y, 32, 1); for (let y = 0; y < 32; y += 5) x.fillRect(Math.floor(r() * 30), y, 1, 3); });
}
function sand(base, dots, seed) { return flat(base, dots, 0.06, seed); }

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

// ---------- region masks ----------
const masks = new Map();
function fracMask(bits, r) { // bits: 9-char '0'/'1', row-major 3x3, centre = this tile
  const key = bits + r; let m = masks.get(key); if (m) return m;
  m = new Float32Array(256); const pts = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + 0.5) pts.push([dx, dy]);
  for (let py = 0; py < 16; py++) for (let px = 0; px < 16; px++) {
    let c = 0;
    for (const [dx, dy] of pts) { const gx = Math.floor((px + 16.5 + dx) / 16), gy = Math.floor((py + 16.5 + dy) / 16); c += bits[gy * 3 + gx] === '1' ? 1 : 0; }
    m[py * 16 + px] = c / pts.length;
  }
  masks.set(key, m); return m;
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
export const isAutoTheme = (theme) => !!THEMES[theme];

const tiles = new Map();
// get(x, y) returns the map char (callers clamp the edge however suits the map); frame drives water animation
export function autoTile(theme, get, x, y, frame) {
  const th = THEMES[theme], ch = get(x, y), N = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) N.push(get(x + dx, y + dy));
  const gname = th.ground(ch, N.join('')), base = th.base ? th.base(ch, N) : '', par = ((x & 1) << 4) | ((y & 1) << 5);
  let key = theme + gname + base + par, anyAnim = false; const parts = [];
  for (const L of th.layers) {
    const bits = N.map((c) => (L.is(c, base) ? '1' : '0')).join('');
    if (bits === '000000000') continue;
    parts.push([L, bits]); key += '|' + bits; if (L.anim) anyAnim = true;
  }
  const f = anyAnim ? frame % 4 : 0; key += ':' + f;
  let c = tiles.get(key); if (c) return c;
  const T = textures(), out = new ImageData(16, 16), o = out.data, ox = (x & 1) * 16, oy = (y & 1) * 16;
  const sample = (t, px, py, i) => { const s = ((oy + py) * 32 + ox + px) * 4; o[i] = t[s]; o[i + 1] = t[s + 1]; o[i + 2] = t[s + 2]; o[i + 3] = 255; };
  const g = T[gname].d;
  for (let p = 0; p < 256; p++) sample(g, p & 15, p >> 4, p * 4);
  for (const [L, bits] of parts) {
    const tn = typeof L.tex === 'function' ? L.tex(gname, base) : L.tex, src = L.anim ? T[tn][f] : T[tn], t = src.d;
    const m = bits === '111111111' ? null : fracMask(bits, L.r), ec = hex(L.edgeCol), ic = L.inner && hex(L.inner);
    for (let p = 0; p < 256; p++) {
      const v = m ? m[p] : 1, i = p * 4; if (v < 0.5) continue;
      if (v < L.edge) { const col = ic && v >= (0.5 + L.edge) / 2 ? ic : ec; o[i] = col[0]; o[i + 1] = col[1]; o[i + 2] = col[2]; }
      else sample(t, p & 15, p >> 4, i);
    }
  }
  c = mk(16, 16); c.getContext('2d').putImageData(out, 0, 0); tiles.set(key, c);
  if (tiles.size > 6000) tiles.clear(); // safety valve; the working set is a few hundred tiles
  return c;
}

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
