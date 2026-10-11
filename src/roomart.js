// ===== Room + dungeon renderer: 16-bit (SNES-style) building interiors and the four dungeons, drawn entirely in code =====
// Same interface as townart.js / terrain.js (isTheme, ground, objects, mapObjects, drawsDecor). Per map, everything static
// (floors, walls with a top face + front face, rugs, wall fittings, stairs, rune circles, every drop shadow and a baked
// light field) is pre-rendered once into one big canvas; ground() only supplies animated lava under the cavern's cracks.
// Furniture, chests and the boss dais are cached sprites sorted with the characters; fire, coals, candles, embers,
// ghost-lights, ice twinkles and storm crystals are tiny cached frames. Art is 16 px per tile (TS = 32 on screen).
import { mk } from './autotile.js';

// ---------------------------------------------------------------- colour + pixel helpers (same conventions as townart.js)
const PKC = new Map();
const pk = (h) => { let v = PKC.get(h); if (v === undefined) { const n = parseInt(h.slice(1, 7), 16), a = h.length > 7 ? parseInt(h.slice(7, 9), 16) : 255; v = ((a << 24) | ((n & 255) << 16) | (n & 0xff00) | (n >>> 16)) >>> 0; PKC.set(h, v); } return v; };
const ramp = (s) => s.trim().split(/\s+/).map(pk);
const cR = (c) => c & 255, cG = (c) => (c >>> 8) & 255, cB = (c) => (c >>> 16) & 255, cA = (c) => c >>> 24;
const rgba = (r, g, b, a = 255) => (((a & 255) << 24) | ((Math.min(255, b) & 255) << 16) | ((Math.min(255, g) & 255) << 8) | (Math.min(255, r) & 255)) >>> 0;
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const mix = (a, b, t) => rgba(cR(a) + (cR(b) - cR(a)) * t, cG(a) + (cG(b) - cG(a)) * t, cB(a) + (cB(b) - cB(a)) * t, cA(a) + (cA(b) - cA(a)) * t);
const dk = (c, f) => rgba(cR(c) * f, cG(c) * f, Math.min(255, cB(c) * f * 1.08 + 10 * (1 - f)), cA(c));
const hash = (x, y, s = 0) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const sm = (t) => t * t * (3 - 2 * t);
function vnoise(x, y, c, s, P = 0) { // value noise, cell size c; with P it tiles every P px (P a multiple of c)
  const gx = Math.floor(x / c), gy = Math.floor(y / c), fx = sm(x / c - gx), fy = sm(y / c - gy), n = P / c;
  const w = (v) => (n ? ((v % n) + n) % n : v);
  const a = hash(w(gx), w(gy), s), b = hash(w(gx + 1), w(gy), s), d = hash(w(gx), w(gy + 1), s), e = hash(w(gx + 1), w(gy + 1), s);
  return a + (b - a) * fx + (d - a) * fy + (a - b - d + e) * fx * fy;
}
const fbm = (x, y, s = 0) => vnoise(x, y, 12, s) * 0.55 + vnoise(x, y, 5, s + 9) * 0.3 + vnoise(x, y, 2, s + 17) * 0.15;
const fbmP = (x, y, s = 0) => vnoise(x, y, 16, s, 64) * 0.55 + vnoise(x, y, 8, s + 9, 64) * 0.3 + vnoise(x, y, 2, s + 17, 64) * 0.15; // tiles every 64 px
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAY[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const pick = (R, v, x, y) => R[Math.max(0, Math.min(R.length - 1, Math.floor(v * (R.length - 1) + bay(x, y))))];
const V = { e: 0, h: 0, dx: 0, dy: 0 };
function vor(x, y, S, sy, seed) { // jittered-grid voronoi cell of pixel (x, y): V.e ~ distance to the cell border
  const gx = Math.floor(x / S), gy = Math.floor(y / (S * sy)); let d1 = 1e9, d2 = 1e9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = gx + i, cy = gy + j, h = hash(cx, cy, seed), fx = (cx + 0.15 + 0.7 * h) * S, fy = (cy + 0.15 + 0.7 * hash(cx, cy, seed + 1)) * S * sy;
    const dx = x + 0.5 - fx, dy = (y + 0.5 - fy) / sy, d = dx * dx + dy * dy;
    if (d < d1) { d2 = d1; d1 = d; V.h = h; V.dx = dx; V.dy = dy; } else if (d < d2) d2 = d;
  }
  V.e = Math.sqrt(d2) - Math.sqrt(d1); return V;
}
class Pix {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); }
  set(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; }
  get(x, y) { x = Math.floor(x); y = Math.floor(y); return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.d[y * this.w + x] : 0; }
  on(x, y) { return cA(this.get(x, y)) > 0; }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c); }
  canvas() { const c = mk(this.w, this.h), x = c.getContext('2d'), id = x.createImageData(this.w, this.h); new Uint32Array(id.data.buffer).set(this.d); x.putImageData(id, 0, 0); return c; }
}
function outline(p, f = 0.38) { // transparent pixels next to the shape take a darkened copy of their neighbour (needs 1 px padding)
  const o = p.d.slice(), w = p.w, h = p.h, at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : o[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (cA(o[y * w + x])) continue;
    const n = [at(x, y + 1), at(x + 1, y), at(x - 1, y), at(x, y - 1)].find((c) => cA(c) === 255);
    if (n) p.d[y * w + x] = dk(n, f);
  }
}
const LN = Math.hypot(-0.5, -0.62, 0.6), LX = -0.5 / LN, LY = -0.62 / LN, LZ = 0.6 / LN;
function blob(p, cx, cy, r, R, o = {}) { // sphere-shaded clump lit from the upper left
  const { amb = 0.1, sq = 1, jit = 0.12, seed = 1 } = o;
  for (let y = Math.floor(cy - r * sq) - 1; y <= cy + r * sq + 1; y++) for (let x = Math.floor(cx - r) - 1; x <= cx + r + 1; x++) {
    const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / (r * sq), d2 = dx * dx + dy * dy; if (d2 > 1) continue;
    const nz = Math.sqrt(1 - d2); p.set(x, y, pick(R, cl(amb + (1 - amb) * cl(dx * LX + dy * LY + nz * LZ) + (hash(x, y, seed) - 0.5) * jit), x, y));
  }
}
const sp = new Map();
const once = (k, f) => { let v = sp.get(k); if (v === undefined) { v = f(); sp.set(k, v); } return v; };

// ---------------------------------------------------------------- palettes
const PAL = {
  oak: ramp('#2a1608 #3e220e #563216 #6e431e #865628 #9c6a34 #b07e42 #c49452 #d6aa68'),
  redwood: ramp('#200e0a #341810 #4a2416 #60301c #763e24 #8c4e2e #a2603a #b47448 #c48a5a'),
  mireplank: ramp('#14120a #201c10 #2e2816 #3c341c #4a4224 #5a502c #6a5e36 #7c6e42'),
  wood: ramp('#1e120a #301d10 #462b17 #5e3b1f #784d29 #926134 #ab7842 #c69456'),
  timber: ramp('#140a06 #22130b #321d10 #432816 #56341d #6a4226 #7e5230'),
  bark: ramp('#1a0f08 #2c190d #422614 #58341c #6e4426 #865632 #9a6a40'),
  plaster: ramp('#6c5a40 #8a7656 #a6926c #bea984 #d2bf98 #e2d2ac #eee2c0 #f8f0d6'),
  fstone: ramp('#2a2a3a #3a3a4a #525264 #6a6a7e #828296 #9a9aac #b2b2c2 #cacad6 #e2e2ea'),
  stone: ramp('#1e1c22 #2e2c34 #44424c #5a5862 #706e78 #86848e #9c9aa2 #b2b0b6 #c8c6ca'),
  iron: ramp('#101018 #1c1c28 #2a2a38 #3a3a4a #4e4e60 #66667a #8a8aa0 #b4b4c8'),
  steel: ramp('#3a4050 #586070 #78808e #98a0ac #b8c0ca #d8dee6 #f4f8fc'),
  glow: ramp('#5a2c0c #8e4814 #c46a1e #e8902c #f8b444 #ffd468 #ffec9c #fffbe0'),
  red: ramp('#3a0a0c #5e1214 #861c1c #a82a24 #c8402e #e0603e #f08a5a'),
  rugR: ramp('#2a0610 #440a18 #620e20 #82162a #a02034 #bc3240 #d44c50'),
  rugB: ramp('#08102e #0e1a48 #142664 #1c3482 #26449e #3458b6 #4a70ca'),
  rugG: ramp('#08200e #0e3016 #16421e #1e5428 #286834 #347c40 #44924e'),
  blue: ramp('#0a1440 #122060 #1a3084 #2444a4 #3058c0 #4472d4 #6290e2'),
  green: ramp('#0c2412 #14381c #1e4e28 #2a6636 #388046 #4a9a58 #62b46e'),
  cloth: ramp('#7a7468 #9c9688 #bab4a6 #d4cec0 #e8e4d8 #f8f6ee #ffffff'),
  gold: ramp('#4a2e06 #6a4208 #8a5e10 #b8861c #e0b030 #f8d458 #fff0a0'),
  leaf: ramp('#0a2210 #0f3016 #15421c #1c5622 #256c28 #30822e #3e9a36 #52b040 #6cc64e'),
  // dungeons
  basalt: ramp('#0c0809 #150e0e #1e1513 #281c18 #33241e #3f2c24 #4d362c #5e4236 #725040 #8a624e'),
  lava: ramp('#3a0800 #6a1400 #a02800 #d04400 #f06a10 #ff9a28 #ffc850 #fff0a0'),
  cstone: ramp('#0e1412 #161e1b #1e2824 #28332e #323e38 #3d4a43 #49574f #56645b #64736a #768678'),
  moss: ramp('#101a0a #16240e #1e3212 #284216 #33531c #3f6522 #4c782a #5c8c34 #70a040'),
  cwater: ramp('#040a10 #08141c #0e2028 #162e38 #20404c #2e5664 #487488 #78a0b0 #b0d0d8'),
  ghost: ramp('#0a3018 #105a28 #1a8a3c #2abc52 #4ee070 #8af8a0 #d0ffd8'),
  ice: ramp('#0a1e44 #12305e #1a427a #245694 #306cac #3e84c2 #52a0d6 #6cbae6 #8ed2f2 #b8e6fa #e4f6ff'),
  icef: ramp('#1c3660 #244470 #2c5282 #366294 #4274a6 #5086b6 #6098c6 #74acd4 #8cc0e0 #a8d4ec #c8e6f6 #eaf6fd'),
  snow: ramp('#5c6c96 #7484ae #8e9cc4 #aab6d8 #c4cee6 #dae2f2 #ecf1f9 #ffffff'),
  sfl: ramp('#10131c #171b27 #1f2433 #282e40 #32394e #3d465d #4a546d #59647f #6a7692 #7e8aa6'),
  slate: ramp('#07080e #0c0e16 #12151f #181c29 #1f2433 #272d3f #30384c #3b445a #48526a #58647e'),
  ystal: ramp('#3a2a08 #6a4e10 #a07a18 #d0a828 #f0d040 #fff080 #ffffd0'),
  pstal: ramp('#1e0a3a #341464 #4e2090 #6a34b8 #8a50d8 #ac78ee #d0a8fa #f0e0ff'),
};
const POTS = [['#5a0e14', '#a01c24', '#e04a4a', '#ffb0a0'], ['#0e1a5a', '#2040b0', '#4a7ae8', '#b0d0ff'], ['#0e4a1a', '#1e8a34', '#4ac860', '#b8f8c0'], ['#4a2a06', '#a06a10', '#e8b030', '#fff0a0'], ['#3a0e4a', '#7a2a9a', '#b85ae0', '#f0c0ff']].map((r) => r.map(pk));
const THEMES = new Set(['interior', 'cavern', 'crypt', 'spire', 'storm']);
export const isTheme = (theme) => THEMES.has(theme);
export const drawsDecor = (m) => THEMES.has(m.theme);
const VOID = pk('#07050a');

// ---------------------------------------------------------------- cached overlay sprites
function glowCv(rgb, size = 64) { // soft radial light, drawn with 'lighter'
  return once('gl' + rgb + size, () => { const c = mk(size, size), x = c.getContext('2d'), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, `rgba(${rgb},.55)`); g.addColorStop(0.35, `rgba(${rgb},.22)`); g.addColorStop(1, `rgba(${rgb},0)`); x.fillStyle = g; x.fillRect(0, 0, size, size); return c; });
}
const glowItem = (rgb, x, y, r, a, z = 2) => ({ x, y, w: 1, h: 1, z, draw: (ctx, X, Y, TS) => { if (a <= 0.01) return; const R = r * TS; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(glowCv(rgb), X - R, Y - R, R * 2, R * 2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; } });
function firePix(f, w = 14, h = 14) { // dancing flames over embers
  return once(`fire${f}${w}${h}`, () => { const p = new Pix(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w * 2 - 1, up = (h - 1 - y) / h, n = vnoise(x * 1.3, y * 0.9 + f * 3.1, 3, 7 + (f & 1)), n2 = vnoise(x + f * 5, y, 2, 11);
      const heat = (1 - u * u) * 1.15 - up * (1.05 + (n2 - 0.5) * 0.4) + (n - 0.5) * 0.75;
      if (heat < 0.06) continue; p.set(x, y, pick(PAL.glow, cl(heat * 1.25 + 0.05), x, y));
    } return p.canvas(); });
}
function flamePix(f) { return once('fl' + f, () => { const p = new Pix(5, 7), r = f ? ['..y..', '.yoy.', '.ywy.', '.ywy.', '..o..'] : ['.....', '..y..', '.yoy.', '.ywy.', '..o..']; r.forEach((s, j) => [...s].forEach((c, i) => c !== '.' && p.set(i, j + 2, pk({ y: '#ffd060', o: '#f08a20', w: '#fff8e0' }[c])))); return p.canvas(); }); }
function coalsPix(f, w = 22, h = 8) {
  return once(`coal${f}`, () => { const p = new Pix(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = vor(x, y * 1.4, 3, 1, 5); const lump = c.e > 0.5; const heat = 0.35 + (vnoise(x, y, 4, 20 + f) - 0.5) * 0.8 + (h - y) * -0.04 + (lump ? 0.15 : -0.3);
    p.set(x, y, heat < 0.18 ? pk('#2a1008') : pick(PAL.glow, cl(heat), x, y)); } return p.canvas(); });
}

// =================================================================================================== INTERIORS
function roomInfo(m) {
  const d = m.decor || [], n = (k) => d.filter((e) => e[2] === k).length;
  const kind = n('anvil') ? 'smith' : n('banner') ? 'guild' : n('bed') >= 3 ? 'inn' : n('shelf') >= 4 ? 'shop' : 'house';
  const to = Object.values(m.portals || {})[0]?.to || 'haven', town = to === 'frostholm' ? 'frost' : to === 'mirewood' ? 'mire' : 'haven';
  return { kind, town };
}
const STY = {
  haven: { floor: 'oak', upper: 'plaster', cap: 'timber', glass: ['#7ab8e8', '#d8f0ff'], quilt: ['#b83a3a', '#e8dcc0'] },
  frost: { floor: 'redwood', upper: 'stone', cap: 'timber', glass: ['#a8c4e0', '#f0f8ff'], quilt: ['#2a5aa8', '#e8e4dc'], snow: true },
  mire: { floor: 'mireplank', upper: 'logs', cap: 'bark', glass: ['#3a6a5a', '#a8c8a0'], quilt: ['#4a7a3a', '#d8d0b0'] },
};
// wall fittings per room kind: [what, tile column of its centre]
const FEAT = {
  inn: [['win', 3], ['fire', 5], ['win', 7], ['paint', 1.5], ['paint', 8.5]],
  shop: [['win', 5], ['sconce', 4], ['sconce', 6]],
  smith: [['forge', 5], ['tools', 2], ['tools', 8]],
  guild: [['board', 3.5], ['crest', 6.5], ['sconce', 1], ['sconce', 9]],
  house: [['win', 3], ['fire', 5], ['win', 7], ['paint', 1]],
};
const RUG = { inn: [3, 4, 5, 3, 'rugR'], house: [3, 4, 5, 3, 'rugB'], guild: [4, 4, 3, 3, 'rugB'], shop: [4, 4, 3, 2, 'rugG'] };

function plankPx(R, x, y, s0) {
  const row = Math.floor(y / 4), v = ((y % 4) + 4) % 4, L = 28 + Math.floor(hash(row, 1, s0) * 3) * 6, off = Math.floor(hash(row, 0, s0) * 48), xx = x + off, seg = Math.floor(xx / L), u = ((xx % L) + L) % L;
  let s = 0.5 + (hash(row, seg, s0 + 2) - 0.5) * 0.3 + (vnoise(x, y * 5, 9, s0 + 3) - 0.5) * 0.2;
  if (vnoise(x * 0.5, row * 13 + v * 3, 3, s0 + 5) > 0.7) s -= 0.1; // grain streaks
  if (v === 3) s = 0.1; else if (v === 0) s += 0.1;
  if (u === 0) s = 0.12; else if (u === 1) s += 0.07;
  if ((u === 3 || u === L - 3) && v === 1) s = 0.22; // nail heads
  if (hash(row, seg, s0 + 7) < 0.08 && Math.abs(u - L / 2) < 1.5 && v === 1) s -= 0.22; // knots
  return pick(R, cl(s, 0.03, 0.97), x, y);
}
function flagPx(x, y) {
  const v = vor(x, y, 8, 0.8, 71), n = fbm(x, y, 4);
  if (v.e < 0.9) return pick(PAL.stone, 0.12 + n * 0.08, x, y);
  let s = 0.42 + (v.h - 0.5) * 0.24 + (n - 0.5) * 0.18; const lit = -(v.dx + v.dy);
  if (v.e < 2) s += lit > 0.3 ? 0.16 : lit < -0.3 ? -0.14 : 0;
  return pick(PAL.stone, cl(s, 0.1, 0.9), x, y);
}
function wallFacePx(st, kind, x, f) { // f = 0..31 from the top of the 2-tile back wall
  const W = PAL.wood, smith = kind === 'smith';
  if (f <= 2) return pick(W, [0.2, 0.85, 0.5][f], x, f);
  if (f >= 30) return pick(W, f === 30 ? 0.4 : 0.15, x, f);
  if (f === 18 || f === 19) return pick(W, f === 18 ? 0.82 : 0.32, x, f);
  if (f > 19) { // wainscoting: raised panels (stone blocks in the smithy)
    if (smith) { const row = Math.floor((f - 20) / 5), u = ((x + (row & 1) * 6) % 12 + 12) % 12, v = (f - 20) % 5; return pick(PAL.stone, u === 0 || v === 4 ? 0.12 : v === 0 ? 0.6 : 0.4 + (hash(Math.floor((x + (row & 1) * 6) / 12), row, 3) - 0.5) * 0.2, x, f); }
    const u = ((x - 16) % 12 + 12) % 12, v = f - 20;
    let s = 0.5 + (vnoise(x, f * 4, 5, 3) - 0.5) * 0.18;
    if (u === 0 || v === 0 || v === 9) s = 0.28; else if (u === 1 || v === 1) s = 0.72; else if (u === 11 || v === 8) s = 0.36; else if (u === 2 || u === 10 || v === 2 || v === 7) s = 0.42;
    return pick(W, s, x, f);
  }
  const top = f <= 4 ? -0.12 : 0;
  if (smith) { const row = Math.floor((f - 3) / 4), bx = Math.floor((x + (row & 1) * 4) / 8), u = ((x + (row & 1) * 4) % 8 + 8) % 8, v = (f - 3) % 4; let s = 0.36 + (hash(bx, row, 9) - 0.5) * 0.2 - (17 - f) * 0.012 + top; if (u === 0 || v === 3) s = 0.1; else if (v === 0) s += 0.12; return pick(PAL.stone, cl(s), x, f); }
  if (st.upper === 'plaster') { let s = 0.5 + (fbm(x, f, 6) - 0.5) * 0.3 + top; if (hash(x, f, 4) < 0.03) s -= 0.12; return pick(PAL.plaster, cl(s), x, f); }
  if (st.upper === 'stone') { const row = Math.floor((f - 3) / 5), bx = Math.floor((x + (row & 1) * 5) / 10), u = ((x + (row & 1) * 5) % 10 + 10) % 10, v = (f - 3) % 5; let s = 0.5 + (hash(bx, row, 5) - 0.5) * 0.22 + (fbm(x, f, 2) - 0.5) * 0.12 + top; if (u === 0 || v === 4) s = 0.18; else if (v === 0 || u === 1) s += 0.14; return pick(PAL.fstone, cl(s), x, f); }
  const v = (f - 3) % 5, row = Math.floor((f - 3) / 5); let s = [0.78, 0.66, 0.52, 0.36, 0.16][v] + (vnoise(x * 0.4, row * 9, 3, 6) - 0.5) * 0.2 + top; // logs
  if (hash(Math.floor(x / 22), row, 8) < 0.15 && ((x % 22) + 22) % 22 < 3 && v > 0 && v < 4) s = 0.3; // knot
  return pick(PAL.bark, cl(s), x, f);
}

function buildRoom(m) {
  const info = roomInfo(m), { kind, town } = info, st = STY[town], rows = m.rows, W = rows[0].length, H = rows.length, MG = 3;
  const TW = W + 2 * MG, TH = H + 2 * MG, GW = TW * 16, GH = TH * 16, O = MG * 16, P = new Pix(GW, GH);
  const X0 = 16, X1 = (W - 1) * 16, Y0 = 16, Y1 = (H - 1) * 16, CAPT = -23, ST = 7, CAP = PAL[st.cap], FL = PAL[st.floor];
  const doors = [...rows[H - 1]].map((c, i) => (c === 'E' ? i : -1)).filter((i) => i >= 0), isDoor = (x) => doors.includes(x >> 4);
  const floorAt = (x, y) => (kind === 'smith' ? flagPx(x, y) : plankPx(FL, x, y, 13));
  for (let py = 0; py < GH; py++) for (let px = 0; px < GW; px++) {
    const x = px - O, y = py - O, inX = x >= X0 && x < X1; let col = VOID;
    if (inX && y >= Y0 && y < Y1) col = floorAt(x, y);
    else if (inX && y >= -16 && y < 16) col = wallFacePx(st, kind, x, y + 16);
    else if (y >= Y1 && y < Y1 + 16 && isDoor(x)) { // doorway: floor, threshold, then daylight spilling in
      const dy = y - Y1; col = dy < 3 ? floorAt(x, y) : dy < 6 ? pick(PAL.stone, dy === 3 ? 0.85 : dy === 4 ? 0.62 : 0.3, x, y) : mix(VOID, pk('#fff0c4'), cl((1 - (dy - 6) / 10) * 0.5) * (1 - Math.abs((x & 15) - 7.5) / 12));
    } else if (y >= CAPT && y < Y1 + ST && x >= X0 - ST && x < X1 + ST) { // the walls' top surface around the room
      const d = Math.min(y < -16 ? -16 - y : 99, x < X0 ? X0 - x : x >= X1 ? x - X1 + 1 : 99, y >= Y1 ? y - Y1 + 1 : 99), outer = Math.min(y - CAPT, x - (X0 - ST), X1 + ST - 1 - x, Y1 + ST - 1 - y);
      let s = 0.5 + (vnoise(x, y, 4, 31) - 0.5) * 0.2; if (d <= 1) s = 0.88; else if (d === 2) s = 0.66; if (outer === 0) s = 0.12; else if (outer === 1) s -= 0.15;
      if (y >= Y1 && isDoor(x - 1) !== isDoor(x + 1)) s = 0.25; // door jambs
      col = pick(CAP, cl(s), x, y);
    }
    P.d[py * GW + px] = col;
  }
  const S = (x, y, c) => P.set(x + O, y + O, c), G = (x, y) => P.get(x + O, y + O), D = (x, y, f) => { const c = G(x, y); if (cA(c)) S(x, y, dk(c, f)); }, B = (x, y, c, t) => { const o = G(x, y); if (cA(o)) S(x, y, mix(o, c, t)); };
  const anim = [], lights = [];
  // rug (flat, under furniture)
  const rg = RUG[kind]; if (rg) { const R = PAL[rg[4]], x0 = rg[0] * 16 + 2, y0 = rg[1] * 16 + 2, w = rg[2] * 16 - 4, h = rg[3] * 16 - 4;
    for (let v = -1; v <= h; v++) for (let u = 0; u < w; u++) { const x = x0 + u, y = y0 + v;
      if (v < 0 || v === h) { if (u % 2 === 0) S(x, y, pick(PAL.cloth, 0.55, x, y)); continue; }
      const e = Math.min(u, v, w - 1 - u, h - 1 - v), du = Math.abs(u + 0.5 - w / 2), dv = Math.abs(v + 0.5 - h / 2), dd = du / (w / 2) + dv / (h / 2);
      let c;
      if (e === 0) c = R[0]; else if (e <= 2) c = pick(PAL.gold, ((u + v) & 3) < 2 ? 0.62 : 0.4, x, y); else if (e === 3) c = R[1];
      else if (dd < 0.42) c = Math.floor(dd * 14) % 2 ? pick(PAL.gold, 0.55, x, y) : R[5];
      else c = ((u + v) % 8 === 0 || (u - v + 64) % 8 === 0) ? R[4] : pick(R, 0.5 - (v / h) * 0.12 + (hash(u, v, 2) - 0.5) * 0.08, x, y);
      S(x, y, c);
    } }
  if (kind === 'smith') for (let y = 16; y < 64; y++) for (let x = 40; x < 136; x++) { const d = Math.hypot((x - 88) / 46, (y - 14) / 40); if (d < 1 && hash(x, y, 9) < (1 - d) * 0.7) D(x, y, 0.7); } // soot
  // doormat inside each door
  for (const dx of doors) for (let y = Y1 - 7; y < Y1 - 1; y++) for (let x = dx * 16 + 2; x < dx * 16 + 14; x++) S(x, y, pick(PAL.timber, (y === Y1 - 7 || y === Y1 - 2) ? 0.25 : ((x + y) & 1) ? 0.7 : 0.5, x, y));
  // ambient occlusion along the walls
  for (let y = 16; y < 24; y++) for (let x = X0; x < X1; x++) D(x, y, 0.5 + (y - 16) * 0.065);
  for (let y = 16; y < Y1; y++) for (let k = 0; k < 4; k++) { D(X0 + k, y, 0.6 + k * 0.1); D(X1 - 1 - k, y, 0.68 + k * 0.08); }
  for (let y = -16; y < 16; y++) for (let k = 0; k < 3; k++) { D(X0 + k, y, 0.6 + k * 0.13); D(X1 - 1 - k, y, 0.66 + k * 0.11); }
  for (let x = X0; x < X1; x++) if (!isDoor(x)) for (let k = 0; k < 2; k++) D(x, Y1 - 1 - k, 0.75 + k * 0.12);
  // wall fittings
  const wy = (f) => f - 16; // back-wall row -> world y
  for (const [what, c] of FEAT[kind]) {
    const cx = Math.round(c * 16 + 8);
    if (what === 'win') {
      const [g0, g1] = st.glass.map(pk);
      for (let f = 4; f <= 17; f++) for (let x = cx - 6; x < cx + 6; x++) { const u = x - cx + 6, v = f - 4; let col;
        if (u === 0 || u === 11 || v === 0) col = pick(PAL.wood, 0.2, x, f); else if (u === 1 || u === 10 || v === 1 || v === 13) col = pick(PAL.wood, v === 1 ? 0.8 : 0.55, x, f);
        else if (u === 5 || u === 6 || v === 7) col = pick(PAL.wood, u === 5 || v === 7 ? 0.62 : 0.4, x, f);
        else { col = mix(g0, g1, cl((v - 2) / 11 + (hash(x, f, 1) - 0.5) * 0.15)); if ((u + v) % 7 === 0 && u + v < 12) col = mix(col, pk('#ffffff'), 0.7); if (st.snow && v > 10 - (u % 3 === 0 ? 1 : 0)) col = pk('#f4f8ff'); }
        S(x, wy(f), col); }
      for (let x = cx - 8; x < cx + 8; x++) { S(x, wy(18), pick(PAL.wood, 0.9, x, 0)); S(x, wy(19), pick(PAL.wood, 0.3, x, 0)); }
      for (let f = 2; f <= 6; f++) for (let x = cx - 8; x < cx + 8; x++) if (f < 4 || x < cx - 5 || x > cx + 4) { const red = st.quilt[0]; if (f === 2) S(x, wy(f), pick(PAL.wood, 0.7, x, f)); else if ((f < 4) || (x < cx - 5 && f < 17 - (cx - 5 - x) * 2) || (x > cx + 4 && f < 17 - (x - cx - 4) * 2)) S(x, wy(f), dk(pk(red), 0.6 + ((x + f) % 3 === 0 ? -0.1 : 0.15))); }
      for (let x = cx - 8; x < cx + 8; x++) for (let f = 7; f < 17; f++) if ((x < cx - 5 && f < 17 - (cx - 5 - x) * 3) || (x > cx + 4 && f < 17 - (x - cx - 4) * 3)) S(x, wy(f), dk(pk(st.quilt[0]), x === cx - 8 || x === cx + 7 ? 0.45 : 0.75));
      for (let d = 0; d < 44; d++) for (let x = Math.floor(cx - 6 - d * 0.35); x < cx + 6 + d * 0.35; x++) { const a = 0.22 * (1 - d / 44); if (a > bay(x, d)) B(x, 16 + d, pk('#fff4d0'), 0.25); }
      lights.push([cx, 0, 0.25, 44]);
    } else if (what === 'paint') {
      const ox = cx - 7, oy = wy(4);
      for (let v = 0; v < 11; v++) for (let u = 0; u < 14; u++) { const x = ox + u, y = oy + v, e = Math.min(u, v, 13 - u, 10 - v); let col;
        if (e === 0) col = pick(PAL.gold, 0.25, x, y); else if (e === 1) col = pick(PAL.gold, u + v < 12 ? 0.85 : 0.5, x, y);
        else { const hz = 4.5 + Math.sin(u * 0.8 + c) * 1.2; col = v < hz ? mix(pk('#f0c890'), pk('#6aa0d8'), cl(1 - v / hz)) : v < hz + 1.5 ? pick(PAL.green, 0.6, x, y) : pick(PAL.green, 0.3 + (hash(u, v, 3)) * 0.2, x, y); if (Math.hypot(u - 9, v - 3.5) < 1.3) col = pk('#fff0b0'); }
        S(x, y, col); }
      for (let u = 1; u < 14; u++) D(ox + u, oy + 11, 0.6);
    } else if (what === 'fire') {
      for (let f = 0; f < 10; f++) for (let x = cx - 10; x < cx + 10; x++) { const row = Math.floor(f / 3), u = ((x + (row & 1) * 3) % 6 + 6) % 6; S(x, wy(f), pick(PAL.fstone, u === 0 || f % 3 === 2 ? 0.2 : 0.5 + (hash(Math.floor((x + (row & 1) * 3) / 6), row, 2) - 0.5) * 0.25 - (x > cx + 6 ? 0.1 : 0), x, f)); }
      for (let x = cx - 13; x < cx + 13; x++) { S(x, wy(10), pick(PAL.wood, 0.85, x, 0)); S(x, wy(11), pick(PAL.wood, 0.6, x, 0)); S(x, wy(12), pick(PAL.wood, 0.25, x, 0)); }
      for (let f = 13; f < 32; f++) for (let x = cx - 12; x < cx + 12; x++) { const row = Math.floor((f - 13) / 4), u = ((x + (row & 1) * 4) % 8 + 8) % 8; S(x, wy(f), pick(PAL.fstone, u === 0 || (f - 13) % 4 === 3 ? 0.18 : 0.52 + (hash(Math.floor((x + (row & 1) * 4) / 8), row, 4) - 0.5) * 0.24 + (x < cx - 8 ? 0.1 : x > cx + 8 ? -0.1 : 0), x, f)); }
      for (let f = 16; f < 32; f++) for (let x = cx - 7; x < cx + 7; x++) { const ar = f - 16 < 3 && Math.abs(x + 0.5 - cx) > 7 - [3, 1, 0][f - 16]; if (ar) continue; S(x, wy(f), mix(pk('#0c0604'), pk('#3a1a0c'), cl((f - 16) / 16))); }
      for (let x = cx - 6; x < cx + 6; x++) { S(x, wy(29), pick(PAL.bark, 0.6, x, 0)); S(x, wy(30), pick(PAL.bark, 0.3, x, 0)); if ((x & 3) === 0) S(x, wy(29), pk('#ff8a30')); }
      for (let y = 16; y < 21; y++) for (let x = cx - 13; x < cx + 13; x++) S(x, y, pick(PAL.fstone, y === 16 ? 0.75 : y === 20 ? 0.25 : 0.55 + (((x - cx) & 7) === 0 ? -0.2 : 0), x, y));
      S(cx - 10, wy(8), pk('#f0ecd8')); S(cx - 10, wy(9), pk('#c8c0a8')); S(cx - 9, wy(8), pk('#e8e0c8')); S(cx - 9, wy(9), pk('#c8c0a8')); for (let k = 0; k < 4; k++) S(cx + 7 + k, wy(8 + (k === 0 || k === 3 ? 1 : 0)), pick(PAL.red, 0.5, k, 0)); for (let k = 0; k < 4; k++) S(cx + 7 + k, wy(9), pick(PAL.red, 0.3, k, 0));
      anim.push({ k: 'fire', x: cx - 7, y: wy(17), w: 14, h: 13 }); anim.push({ k: 'flame', x: cx - 12, y: wy(3) }); lights.push([cx, 10, 0.55, 64]); anim.push({ k: 'glow', x: cx, y: 12, r: 2.6, a: 0.42 });
    } else if (what === 'forge') {
      for (let f = 0; f < 12; f++) { const hw = 7 + f * 1.1; for (let x = Math.floor(cx - hw); x < cx + hw; x++) S(x, wy(f), pick(PAL.iron, cl(0.38 - (x - cx) / (hw * 5) + (f === 11 ? 0.25 : 0) + ((x - cx + 64) % 6 === 0 && f % 4 === 2 ? 0.3 : 0)), x, f)); }
      for (let f = 12; f < 32; f++) for (let x = cx - 22; x < cx + 22; x++) { const row = Math.floor((f - 12) / 4), u = ((x + (row & 1) * 5) % 10 + 10) % 10; S(x, wy(f), pick(PAL.stone, u === 0 || (f - 12) % 4 === 3 ? 0.12 : 0.48 + (hash(Math.floor((x + (row & 1) * 5) / 10), row, 6) - 0.5) * 0.24 + (x > cx + 16 ? -0.12 : x < cx - 16 ? 0.08 : 0), x, f)); }
      for (let f = 16; f < 27; f++) for (let x = cx - 12; x < cx + 12; x++) S(x, wy(f), f === 16 ? pk('#0a0604') : mix(pk('#2a0c04'), pk('#8a2a08'), cl((f - 16) / 10)));
      for (let x = cx - 14; x < cx + 14; x++) { S(x, wy(27), pick(PAL.stone, 0.8, x, 0)); S(x, wy(28), pick(PAL.stone, 0.4, x, 0)); }
      for (let f = 22; f < 31; f++) for (let x = cx + 15; x < cx + 22; x++) S(x, wy(f), pick(PAL.bark, cl(0.65 - (f - 22) * 0.04 - (x - cx - 15) * 0.05 + (f % 3 === 0 ? -0.15 : 0)), x, f)); // bellows
      anim.push({ k: 'coals', x: cx - 11, y: wy(18) }); lights.push([cx, 6, 0.75, 70]); anim.push({ k: 'glow', x: cx, y: 6, r: 3.2, a: 0.5 });
    } else if (what === 'tools') {
      for (let x = cx - 8; x < cx + 8; x++) { S(x, wy(6), pick(PAL.wood, 0.7, x, 0)); S(x, wy(7), pick(PAL.wood, 0.3, x, 0)); }
      for (let f = 8; f < 16; f++) { S(cx - 5, wy(f), pick(PAL.wood, 0.55, 0, f)); S(cx + 1, wy(f), pick(PAL.iron, 0.6, 0, f)); S(cx + 3, wy(f), pick(PAL.iron, 0.5, 0, f)); }
      for (let x = cx - 7; x < cx - 2; x++) { S(x, wy(15), pick(PAL.iron, 0.7, x, 0)); S(x, wy(16), pick(PAL.iron, 0.4, x, 0)); }
      S(cx + 2, wy(16), pick(PAL.iron, 0.5, 0, 0)); S(cx + 1, wy(17), pick(PAL.iron, 0.6, 0, 0)); S(cx + 3, wy(17), pick(PAL.iron, 0.6, 0, 0));
      for (let a = 0; a < 12; a++) { const t = a / 11 * Math.PI * 1.25 - Math.PI * 0.12; S(cx + 5 + Math.round(Math.cos(t) * 2.2), wy(12) + Math.round(Math.sin(t) * 3), pick(PAL.steel, 0.6, a, 0)); }
    } else if (what === 'sconce') {
      for (let x = cx - 2; x <= cx + 2; x++) S(x, wy(13), pick(PAL.gold, 0.5, x, 0)); S(cx, wy(14), pick(PAL.gold, 0.35, 0, 0)); S(cx, wy(15), pick(PAL.gold, 0.5, 0, 0));
      for (let f = 9; f < 13; f++) { S(cx, wy(f), pk('#f4ecd8')); S(cx + 1, wy(f), pk('#c8bca0')); }
      anim.push({ k: 'flame', x: cx - 2, y: wy(3) }); lights.push([cx, -6, 0.28, 30]); anim.push({ k: 'glow', x: cx + 0.5, y: wy(7), r: 1.1, a: 0.35 });
    } else if (what === 'board') {
      for (let f = 4; f < 17; f++) for (let x = cx - 11; x < cx + 11; x++) { const e = Math.min(f - 4, 16 - f, x - cx + 11, cx + 10 - x); S(x, wy(f), e === 0 ? pick(PAL.wood, 0.2, x, f) : e === 1 ? pick(PAL.wood, 0.7, x, f) : pick(PAL.oak, 0.62 + (hash(x, f, 7) - 0.5) * 0.2, x, f)); }
      for (const [px0, py0, w, h] of [[-9, 6, 6, 5], [-2, 7, 5, 7], [4, 6, 6, 4], [-8, 12, 5, 3], [5, 11, 5, 4]]) { for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) S(cx + px0 + u, wy(py0 + v), (v % 2 === 1 && u > 0 && u < w - 1) ? pk('#a8a088') : pk(u + v === 0 ? '#ffffff' : '#ece4cc')); S(cx + px0 + (w >> 1), wy(py0), pk('#d02828')); }
    } else if (what === 'crest') {
      for (let a = -7; a <= 7; a++) { S(cx + a, wy(10 + a), pick(PAL.steel, 0.7, a, 0)); S(cx - a, wy(10 + a), pick(PAL.steel, 0.55, a, 0)); }
      for (let f = 4; f < 17; f++) { const hw = f < 12 ? 6 : 6 - (f - 11) * 1.2; for (let x = Math.floor(cx - hw); x < cx + hw; x++) { const e = Math.min(x - (cx - hw), cx + hw - 1 - x, f - 4); S(x, wy(f), e < 1 ? pick(PAL.gold, 0.4, x, f) : pick(PAL.blue, cl(0.55 - (x - cx) * 0.04 - (f - 4) * 0.015), x, f)); } }
      for (let f = 7; f < 14; f++) { const hw = 3 - Math.abs(f - 10) * 0.8; for (let x = Math.ceil(cx - hw); x < cx + hw; x++) S(x, wy(f), pick(PAL.gold, x < cx ? 0.85 : 0.55, x, f)); }
    }
  }
  // drop shadows of the furniture (baked)
  for (const [tx, ty, k] of m.decor || []) {
    const cx = tx * 16 + 8, cy = ty * 16 + (k === 'bed' ? 12 : 14), rx = k === 'counter' ? 0 : k === 'bed' ? 8 : 7, ry = k === 'bed' ? 5 : 2.6;
    if (rx) for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx + 1; x++) if (((x + 0.5 - cx - 1) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) D(x, y, 0.62);
  }
  for (const c of counters(m)) for (let y = c.y * 16 + 14; y < c.y * 16 + 18; y++) for (let x = c.x * 16; x < (c.x + c.w) * 16 + 2; x++) D(x, y, y < c.y * 16 + 16 ? 0.55 : 0.75);
  rows.forEach((r, ty) => [...r].forEach((ch, tx) => { if (ch === 'C') for (let y = ty * 16 + 12; y < ty * 16 + 17; y++) for (let x = tx * 16 + 2; x < tx * 16 + 16; x++) if (((x + 0.5 - tx * 16 - 9) / 7) ** 2 + ((y + 0.5 - ty * 16 - 14.5) / 2.4) ** 2 <= 1) D(x, y, 0.6); }));
  // baked warm light field: windows, hearth, forge, candles, the doorway; corners fall off into shadow
  for (const dx of doors) lights.push([dx * 16 + 8, Y1 + 4, 0.3, 30]);
  const ccx = (X0 + X1) / 2, ccy = 40;
  for (let py = 0; py < GH; py++) for (let px = 0; px < GW; px++) {
    const i = py * GW + px, c = P.d[i]; if (c === VOID) continue; const x = px - O, y = py - O;
    let L = 0.66 - Math.hypot((x - ccx) / 120, (y - ccy) / 90) * 0.35;
    for (const [lx, ly, s, r] of lights) { const d2 = ((x - lx) ** 2 + (y - ly) ** 2) / (r * r); if (d2 < 4) L += s * Math.exp(-d2 * 1.6); }
    L = cl(L, 0.2, 1.25); const f = 0.42 + 0.66 * L, w = cl(L - 0.6, 0, 0.6);
    P.d[i] = rgba(cR(c) * f * (1 + w * 0.12), cG(c) * f * (1 + w * 0.03), cB(c) * f * (1 - w * 0.18), 255);
  }
  return { cv: P.canvas(), GW, GH, MG, anim, info };
}
function counters(m) { // runs of 'counter' decor in a row (one tile gaps are bridged: the keeper stands in the gap)
  const cs = (m.decor || []).filter((d) => d[2] === 'counter').sort((a, b) => a[1] - b[1] || a[0] - b[0]), out = [];
  for (const [x, y] of cs) { const l = out[out.length - 1]; if (l && l.y === y && x - (l.x + l.w) <= 1) l.w = x - l.x + 1; else out.push({ x, y, w: 1 }); }
  return out;
}

// ---------------------------------------------------------------- furniture sprites (1 px padding; bottom content row = h - 2)
function cylinder(p, x0, y0, w, h, R, hoops = []) {
  const cx = x0 + w / 2;
  for (let y = y0; y < y0 + h; y++) { const half = w / 2 - 0.7 + 0.7 * Math.sin(Math.PI * (y - y0 + 0.5) / h);
    for (let x = x0; x < x0 + w; x++) { const u = (x + 0.5 - cx) / half; if (Math.abs(u) > 1) continue; const nz = Math.sqrt(1 - u * u);
      let v = 0.12 + 0.85 * cl(-u * 0.5 + nz * 0.8) + (hash(x, y, 4) - 0.5) * 0.08; if ((x - x0) % 3 === 0) v -= 0.18;
      if (hoops.includes(y - y0)) { p.set(x, y, pick(PAL.iron, cl(v + 0.15), x, y)); continue; }
      if (y === y0 + h - 1) v -= 0.2; p.set(x, y, pick(R, cl(v), x, y)); } }
  for (let y = y0 - 2; y <= y0 + 1; y++) for (let x = x0; x < x0 + w; x++) { const u = (x + 0.5 - cx) / (w / 2 - 0.7), vv = (y + 0.5 - y0) / 2; if (u * u + vv * vv > 1) continue; p.set(x, y, pick(R, u * u + vv * vv > 0.55 ? 0.22 : 0.78 - vv * 0.1 + ((x - x0) % 3 === 0 ? -0.1 : 0), x, y)); }
}
const barrelPix = () => once('barrel', () => { const p = new Pix(16, 17); cylinder(p, 3, 4, 10, 11, PAL.wood, [2, 8]); outline(p, 0.4); return p.canvas(); });
function bedPix(q) {
  return once('bed' + q, () => { const p = new Pix(18, 30), Q0 = pk(STY[q].quilt[0]), Q1 = pk(STY[q].quilt[1]), W = PAL.wood;
    for (let y = 1; y < 11; y++) for (let x = 1; x < 17; x++) { const post = x <= 2 || x >= 15; if (!post && y < 3) continue; p.set(x, y, pick(W, post ? (x === 1 || x === 15 ? 0.72 : 0.4) + (y === 1 ? 0.15 : 0) : y === 3 ? 0.8 : (x - 3) % 4 === 0 ? 0.3 : 0.55, x, y)); }
    for (let y = 9; y < 27; y++) for (let x = 2; x < 16; x++) p.set(x, y, pick(PAL.cloth, 0.7 - (x - 2) * 0.02, x, y)); // sheet
    blob(p, 9, 11.5, 5.5, PAL.cloth, { sq: 0.5, amb: 0.4, jit: 0.05 }); // pillow
    for (let y = 15; y < 27; y++) for (let x = 2; x < 16; x++) { const u = x - 2, v = y - 15, chk = ((u >> 2) + (v >> 2)) & 1, side = x === 2 || x === 15;
      let c = chk ? Q0 : Q1; if (u % 4 === 0 || v % 4 === 0) c = dk(c, 0.8); if (v < 2) c = v === 0 ? pk('#fbf8ee') : pk('#d8d2c0'); c = dk(c, side ? 0.62 : 1 - u * 0.012 - v * 0.012); if (v === 2) c = dk(c, 0.75); p.set(x, y, c); }
    for (let y = 26; y < 29; y++) for (let x = 1; x < 17; x++) p.set(x, y, pick(W, y === 26 ? 0.75 : y === 27 ? 0.45 : 0.2, x, y));
    outline(p, 0.4); return p.canvas(); });
}
function tablePix() {
  return once('table', () => { const p = new Pix(18, 24), W = PAL.wood;
    for (let y = 1; y < 10; y++) for (const x of [5, 12]) { p.set(x, y, pick(W, 0.7, x, y)); p.set(x + 1, y, pick(W, 0.35, x, y)); } // chair back
    for (const y of [2, 5]) for (let x = 6; x < 12; x++) { p.set(x, y, pick(W, 0.62, x, y)); p.set(x, y + 1, pick(W, 0.3, x, y)); }
    for (let y = 16; y < 22; y++) for (let x = 8; x < 10; x++) p.set(x, y, pick(W, x === 8 ? 0.5 : 0.25, x, y));
    for (let x = 5; x < 13; x++) { p.set(x, 21, pick(W, 0.4, x, 21)); p.set(x, 22, pick(W, 0.2, x, 22)); }
    for (let y = 8; y < 18; y++) for (let x = 1; x < 17; x++) { const dx = (x + 0.5 - 9) / 7.6, dy = (y + 0.5 - 12) / 4.2, d = dx * dx + dy * dy; if (d > 1 && !(y >= 12 && Math.abs(dx) <= 0.98 && y < 15)) continue;
      const front = y >= 12 && d > 1 || (d > 0.82 && dy > 0.2); p.set(x, y, front ? pick(W, 0.32 - dx * 0.08, x, y) : pick(W, cl(0.72 - dx * 0.12 - dy * 0.12 + ((y - 8) % 3 === 0 ? -0.08 : 0) + (d > 0.8 ? -0.12 : 0)), x, y)); }
    p.rect(4, 9, 2, 3, pk('#b8b0a0')); p.set(4, 9, pk('#f8f4e8')); p.set(5, 9, pk('#f8f4e8')); p.set(6, 10, pk('#8a8070')); // mug
    for (let y = 9; y < 12; y++) p.set(13, y, pk(y === 9 ? '#fff8e0' : '#e8e0c8')); p.set(13, 8, pk('#ffd060')); p.set(13, 7, pk('#fff0a0')); // candle
    for (let x = 7; x < 12; x++) { p.set(x, 12, pk('#e8e4d8')); p.set(x, 13, pk('#c0bcb0')); } p.set(8, 11, pk('#c88a40')); p.set(9, 11, pk('#e0a858')); p.set(10, 11, pk('#a86a30')); // bread
    outline(p, 0.4); return p.canvas(); });
}
function counterPix(w, kind) {
  return once(`ctr${w}${kind}`, () => { const PW = w * 16 + 2, p = new Pix(PW, 26), W = PAL.wood;
    for (let y = 9; y < 25; y++) for (let x = 1; x < PW - 1; x++) { const u = x - 1, v = y - 9; let s;
      if (v < 5) s = 0.74 + (v === 0 ? 0.14 : 0) - (v === 4 ? 0.2 : 0) + (vnoise(x, v * 4, 6, 2) - 0.5) * 0.14; // top
      else if (v === 5) s = 0.88; else if (v === 15) s = 0.15;
      else { const pu = u % 12, pv = v - 6; s = 0.46; if (pu === 0 || pv === 0 || pv === 8) s = 0.28; else if (pu === 1 || pv === 1) s = 0.62; else if (pu === 11 || pv === 7) s = 0.34; s -= u / (PW * 6); }
      p.set(x, y, pick(W, cl(s), x, y)); }
    const it = (x, y, c) => p.set(x, y, pk(c));
    if (kind === 'shop') { [[6, 0], [10, 1], [14, 2], [w * 16 - 12, 3], [w * 16 - 8, 4]].forEach(([bx, ci]) => { const R = POTS[ci]; for (let y = 5; y < 11; y++) for (let x = bx; x < bx + 3; x++) p.set(x, y, R[x === bx ? 3 : y === 5 ? 2 : x === bx + 2 ? 0 : 1]); p.set(bx + 1, 3, pk('#e8d8b0')); p.set(bx + 1, 4, R[2]); });
      for (let x = 20; x < 28; x++) it(x, 8, '#b8861c'); it(23, 4, '#8a5e10'); for (let y = 4; y < 8; y++) it(24, y, '#e0b030'); for (let x = 20; x < 23; x++) it(x, 7, '#f8d458'); for (let x = 26; x < 29; x++) it(x, 6, '#f8d458'); }
    if (kind === 'inn') { for (let x = 6; x < 15; x++) for (let y = 7; y < 11; y++) it(x, y, x === 10 ? '#7a2018' : y === 7 ? '#fffcf0' : (y & 1) ? '#e8e0c8' : '#cfc6aa'); for (let y = 6; y < 10; y++) for (let x = 20; x < 25; x++) if (Math.hypot(x + 0.5 - 22.5, y - 9) < 3) it(x, y, x < 22 ? '#f8d458' : '#b8861c'); it(22, 5, '#fff0a0');
      for (const bx of [w * 16 - 14, w * 16 - 9]) { for (let y = 6; y < 11; y++) for (let x = bx; x < bx + 3; x++) it(x, y, x === bx ? '#c8a878' : '#8a6a40'); it(bx, 6, '#f8f4e8'); it(bx + 1, 6, '#f8f4e8'); it(bx + 3, 8, '#6a4a28'); } }
    if (kind === 'smith') { for (let x = 6; x < 18; x++) { it(x, 8, x < 9 ? '#6a6a7a' : '#5e3b1f'); } for (let y = 5; y < 9; y++) for (let x = 5; x < 9; x++) it(x, y, y === 5 ? '#b4b4c8' : '#4e4e60');
      for (const [bx, by] of [[w * 16 - 14, 8], [w * 16 - 10, 8], [w * 16 - 12, 6]]) for (let x = bx; x < bx + 4; x++) { it(x, by, '#f8d458'); it(x, by + 1, '#b8861c'); } }
    if (kind === 'guild') { for (let x = 6; x < 16; x++) for (let y = 6; y < 11; y++) it(x, y, (x + y) % 5 === 0 ? '#c8b088' : '#e8d8b0'); it(9, 7, '#a02020'); it(12, 8, '#3058c0'); for (let y = 6; y < 11; y++) for (let x = w * 16 - 14; x < w * 16 - 8; x++) it(x, y, y === 6 ? '#ffffff' : '#ece4cc'); for (let k = 0; k < 6; k++) it(w * 16 - 6 + (k >> 1), 4 + k, '#f8f8f0'); it(w * 16 - 5, 10, '#202028'); }
    if (kind === 'house') { for (let y = 7; y < 11; y++) for (let x = 8; x < 12; x++) it(x, y, '#7a8a40'); }
    outline(p, 0.4); return p.canvas(); });
}
function shelfPix(kind) {
  return once('shelf' + kind, () => { const p = new Pix(18, 34), W = PAL.wood, books = kind === 'house';
    for (let y = 1; y < 33; y++) for (let x = 1; x < 17; x++) { let s; if (x <= 2 || x >= 15) s = x === 1 ? 0.7 : x === 2 ? 0.5 : x === 15 ? 0.42 : 0.25; else s = 0.16 + ((x - 3) % 4 === 0 ? -0.06 : 0.04); if (y <= 3) s = y === 1 ? 0.85 : 0.6; if (y >= 31) s = 0.3; p.set(x, y, pick(W, s, x, y)); }
    for (const by of [12, 21, 30]) for (let x = 2; x < 16; x++) { p.set(x, by, pick(W, 0.8, x, by)); p.set(x, by + 1, pick(W, 0.4, x, by)); }
    [4, 13, 22].forEach((top, k) => { let x = 3; while (x < 15) { const h0 = hash(x, k, books ? 3 : 7);
      if (books) { const bw = 1 + (h0 < 0.5 ? 1 : 0), bh = 5 + Math.floor(h0 * 3), col = [['#5a1414', '#8a2a20'], ['#142a5a', '#2a4a8a'], ['#1e4a24', '#3a7a3a'], ['#4a2e14', '#7a5028'], ['#5a4a14', '#9a8030']][Math.floor(hash(x, k, 9) * 5)];
        for (let y = top + 8 - bh; y < top + 8; y++) for (let i = 0; i < bw; i++) p.set(x + i, y, pk(i === 0 ? col[1] : col[0])); if (bh > 5) for (let i = 0; i < bw; i++) p.set(x + i, top + 9 - bh, pk('#d0a830')); x += bw + (h0 > 0.85 ? 1 : 0);
      } else { const R = POTS[Math.floor(hash(x, k, 5) * POTS.length)], jar = h0 < 0.25;
        if (jar) { for (let y = top + 4; y < top + 8; y++) for (let i = 0; i < 3; i++) p.set(x + i, y, pk(i === 0 ? '#d8d0c0' : y === top + 4 ? '#a89070' : '#b8b0a0')); p.set(x + 1, top + 3, pk('#7a5a3a')); x += 4; }
        else { for (let y = top + 3; y < top + 8; y++) for (let i = 0; i < 3; i++) p.set(x + i, y, R[i === 0 ? 3 : y === top + 3 ? 2 : i === 2 ? 0 : 1]); p.set(x + 1, top + 2, R[2]); p.set(x + 1, top + 1, pk('#c8a878')); x += 4; } } } });
    outline(p, 0.4); return p.canvas(); });
}
function rackPix() {
  return once('rack', () => { const p = new Pix(18, 34), W = PAL.wood, S = PAL.steel;
    for (let y = 9; y < 32; y++) { p.set(2, y, pick(W, 0.65, 2, y)); p.set(3, y, pick(W, 0.35, 3, y)); p.set(14, y, pick(W, 0.6, 14, y)); p.set(15, y, pick(W, 0.3, 15, y)); }
    for (let x = 1; x < 17; x++) { p.set(x, 10, pick(W, 0.78, x, 0)); p.set(x, 11, pick(W, 0.38, x, 0)); p.set(x, 27, pick(W, 0.72, x, 0)); p.set(x, 28, pick(W, 0.35, x, 0)); }
    for (let y = 4; y < 32; y++) p.set(11, y, pick(W, 0.55, 11, y)); for (let y = 1; y < 5; y++) { p.set(11, y, S[5 - (y === 1 ? 1 : 0)]); if (y > 2) { p.set(10, y, S[3]); p.set(12, y, S[2]); } } // spear
    for (let y = 2; y < 22; y++) { p.set(6, y, S[y < 4 ? 6 : 5]); p.set(7, y, S[y < 4 ? 4 : 3]); } p.set(6, 1, S[4]); for (let x = 4; x < 10; x++) p.set(x, 22, pick(PAL.gold, x < 7 ? 0.8 : 0.5, x, 0)); for (let y = 23; y < 27; y++) { p.set(6, y, pk('#5e3b1f')); p.set(7, y, pk('#3e2414')); } p.set(6, 27, pick(PAL.gold, 0.7, 0, 0)); p.set(7, 27, pick(PAL.gold, 0.5, 0, 0)); // sword
    for (let y = 6; y < 30; y++) p.set(13, y, pick(W, 0.5, 13, y)); for (let y = 5; y < 12; y++) for (let x = 14; x < 17; x++) if (x - 14 < 3 - Math.abs(y - 8.5) * 0.4) p.set(x, y, S[x === 16 ? 6 : 3]); // axe
    blob(p, 8.5, 28, 5, PAL.red, { sq: 0.9, amb: 0.25 }); for (let y = 24; y < 33; y++) for (let x = 3; x < 14; x++) { const d = Math.hypot(x + 0.5 - 8.5, (y + 0.5 - 28) / 0.9); if (d > 4.2 && d <= 5.2) p.set(x, y, pick(PAL.gold, x + y < 36 ? 0.8 : 0.45, x, y)); } p.set(8, 27, pk('#fff0a0')); p.set(9, 28, pk('#b8861c')); // shield
    outline(p, 0.4); return p.canvas(); });
}
function anvilPix() {
  return once('anvil', () => { const p = new Pix(18, 18); cylinder(p, 4, 11, 10, 5, PAL.bark);
    const I = PAL.iron; for (let x = 1; x < 16; x++) { if (x < 4 && Math.abs(5 - 0.5) < 0) continue; }
    for (let y = 4; y < 11; y++) for (let x = 1; x < 17; x++) { let in_ = false, s = 0.5;
      if (y <= 5) { in_ = x >= 4 && x <= 15 || (x >= 1 && x < 4 && y === 5) || (x >= 2 && y === 4 && x < 4); s = y === 4 ? 0.95 : 0.7; }
      else if (y <= 7) { in_ = x >= 4 + (y - 6) && x <= 15 - (y - 6); s = 0.45 - (x - 4) * 0.02; } else { in_ = x >= 6 && x <= 12; s = y === 10 ? 0.55 : 0.32; }
      if (in_) p.set(x, y, pick(I, cl(s), x, y)); }
    for (let x = 8; x < 12; x++) { p.set(x, 3, pk(x < 10 ? '#ffe070' : '#f08a20')); } p.set(9, 2, pk('#fff8c0'));
    outline(p, 0.4); return p.canvas(); });
}
function bannerPix(i) {
  return once('ban' + i, () => { const p = new Pix(18, 42), R = [PAL.blue, PAL.red, PAL.green][i % 3];
    for (let y = 2; y < 40; y++) { p.set(8, y, pick(PAL.wood, 0.7, 8, y)); p.set(9, y, pick(PAL.wood, 0.35, 9, y)); }
    for (let x = 6; x < 12; x++) p.set(x, 40, pick(PAL.iron, 0.5, x, 0)); for (let x = 5; x < 13; x++) p.set(x, 39, pick(PAL.iron, x < 9 ? 0.7 : 0.4, x, 0));
    blob(p, 8.5, 1.5, 1.4, PAL.gold, { amb: 0.4 }); for (let x = 2; x < 16; x++) { p.set(x, 4, pick(PAL.gold, 0.85, x, 0)); p.set(x, 5, pick(PAL.gold, 0.45, x, 0)); }
    for (let y = 6; y < 32; y++) for (let x = 3; x < 15; x++) { if (y > 26 && Math.abs(x + 0.5 - 9) < (y - 26) * 1.2) continue; const u = x - 3, edge = u === 0 || u === 11;
      p.set(x, y, edge ? pick(PAL.gold, 0.6, x, y) : pick(R, cl(0.55 + Math.sin(u * 0.95) * 0.14 - u * 0.02 - (y - 6) * 0.004), x, y)); }
    for (let y = 11; y < 20; y++) { const hw = 3.5 - Math.abs(y - 15.5) * 0.8; for (let x = Math.ceil(9 - hw); x < 9 + hw; x++) p.set(x, y, pick(PAL.gold, x < 9 ? (y < 15 ? 0.95 : 0.7) : (y < 15 ? 0.7 : 0.45), x, y)); }
    outline(p, 0.4); return p.canvas(); });
}
function chestPix(open, tint = '') {
  return once('chest' + open + tint, () => { const p = new Pix(18, 18), W = tint === 'ice' ? PAL.icef : tint === 'dark' ? PAL.basalt : PAL.wood, Gd = PAL.gold;
    const yb = open ? 9 : 8;
    for (let y = yb; y < 16; y++) for (let x = 2; x < 16; x++) { const fx = x - 2; let c;
      if (fx <= 1 || fx >= 12) c = pick(Gd, fx === 0 ? 0.75 : fx === 13 ? 0.3 : 0.55, x, y);
      else if (y === 12) c = pick(PAL.iron, 0.55, x, y);
      else c = pick(W, cl(0.6 - fx * 0.025 + (y === yb ? 0.2 : 0) - (y === 15 ? 0.25 : 0) + (hash(x, y, 2) - 0.5) * 0.1), x, y);
      p.set(x, y, c); }
    if (!open) {
      for (let y = 2; y < 8; y++) for (let x = 2; x < 16; x++) { const fx = x - 2, w0 = y === 2 ? 3 : y === 3 ? 1 : 0; if (fx < w0 || fx > 13 - w0) continue;
        p.set(x, y, fx <= 1 || fx >= 12 ? pick(Gd, fx <= 1 ? 0.85 : 0.4, x, y) : y === 7 ? pick(Gd, 0.6, x, y) : pick(W, cl(0.9 - (y - 2) * 0.07 - fx * 0.02), x, y)); }
      for (let y = 6; y < 11; y++) for (let x = 8; x < 10; x++) p.set(x, y, pick(Gd, x === 8 ? 0.95 : 0.65, x, y)); p.set(8, 8, pk('#2a1808')); p.set(9, 8, pk('#2a1808'));
    } else {
      for (let y = 1; y < 9; y++) for (let x = 2; x < 16; x++) { const fx = x - 2; p.set(x, y, fx <= 1 || fx >= 12 ? pick(Gd, 0.5, x, y) : y <= 2 ? pick(W, 0.4, x, y) : pk(y < 6 ? '#4a1410' : '#6a1e16')); }
      for (let x = 4; x < 14; x++) { p.set(x, 9, pick(Gd, 0.5 + hash(x, 1, 3) * 0.5, x, 9)); p.set(x, 10, pk('#2a0e08')); } p.set(7, 9, pk('#ffffff')); p.set(11, 9, pk('#fff8c0'));
      for (let x = 8; x < 10; x++) p.set(x, 13, pick(Gd, 0.7, x, 13));
    }
    outline(p, 0.35); return p.canvas(); });
}
const place = (img, tx, ty, sy = ty + 1) => ({ img, x: tx + 0.5 - img.width / 32, y: ty + 1 - (img.height - 1) / 16, z: 1, sy });

// =================================================================================================== DUNGEONS
const CAPH = 4; // wall tiles with floor below: 4 px of top face, then a 12 px front face
const w64 = (v) => ((v % 64) + 64) % 64;
const DUN = {
  cavern: {
    top: (x, y) => { const n = fbmP(x, y, 3), h = hash(w64(x), w64(y), 5); return h < 0.004 ? PAL.lava[2] : pick(PAL.basalt, cl(0.06 + n * 0.16 + (h < 0.05 ? 0.08 : 0)), x, y); },
    face: (x, y, fy) => { const v = vor(x, y, 5, 1.7, 44), e = v.e, hh = v.h; let s = 0.46 + (hh - 0.5) * 0.3 + (vnoise(x, y * 0.4, 5, 8) - 0.5) * 0.3 - fy * 0.028;
      if (e < 0.7) s = 0.14; else if (v.dx < -0.5 && e < 1.8) s += 0.14;
      if (fy === 0) s += 0.25; else if (fy === 1) s += 0.1; if (fy >= 11) s -= 0.15;
      if (Math.abs(vnoise(x, y * 2, 9, 12) - 0.5) < 0.03 && fy > 1) return pick(PAL.lava, 0.55 + hash(x, y, 1) * 0.3, x, y); // lava veins
      return pick(PAL.basalt, cl(s, 0.05, 0.95), x, y); },
    floor: (x, y) => { const lv = vnoise(x, y, 18, 5), v = vor(x, y, 7, 0.8, 61), e = v.e, hh = v.h, dx = v.dx, dy = v.dy, n = fbm(x, y, 3);
      if (e < 0.9) return lv > 0.6 ? 0 : pick(PAL.basalt, 0.04, x, y);
      let s = 0.5 + (hh - 0.5) * 0.24 + (n - 0.5) * 0.26; const lit = -(dx + dy); if (e < 2) s += lit > 0.3 ? 0.16 : lit < -0.3 ? -0.14 : 0;
      if (hash(x, y, 9) < 0.02) s += 0.18;
      let c = pick(PAL.basalt, cl(s, 0.08, 0.95), x, y);
      if (lv > 0.6 && e < 3) c = mix(c, PAL.lava[3], (3 - e) / 3 * 0.65); else if (lv > 0.52 && e < 1.6) c = mix(c, PAL.lava[2], 0.35);
      return c; },
    rim: PAL.basalt, rimV: 0.78, accent: '#ff7a20', glow: '255,120,40',
  },
  crypt: {
    top: (x, y) => { const n = fbmP(x, y, 4), h = hash(w64(x), w64(y), 6); return n > 0.66 && h < 0.35 ? pick(PAL.moss, cl(0.08 + (n - 0.66) * 0.8), x, y) : pick(PAL.cstone, cl(0.04 + n * 0.14 + (h < 0.04 ? 0.08 : 0)), x, y); },
    face: (x, y, fy, tx, ty) => { const row = Math.floor(fy / 4), bx = Math.floor((x + (row & 1) * 4) / 8), u = ((x + (row & 1) * 4) % 8 + 8) % 8, v = fy % 4;
      let s = 0.44 + (hash(bx, row + ty * 5, 23) - 0.5) * 0.24 + (fbm(x, y, 6) - 0.5) * 0.15 - fy * 0.015;
      if (u === 0 || v === 3) s = 0.1; else if (v === 0 || u === 1) s += 0.15; if (fy === 0) s = 0.75;
      const dl = Math.floor(vnoise(x, ty * 7, 3, 21) * 9) - 2; if (fy < dl) return pick(PAL.moss, cl(0.62 - fy * 0.06 + (hash(x, fy, 2) - 0.5) * 0.15), x, y);
      if (hash(x, y, 31) < 0.03) s -= 0.15;
      return pick(PAL.cstone, cl(s, 0.05, 0.92), x, y); },
    floor: (x, y) => { const row = Math.floor(y / 8), off = (row & 1) * 4, cx = Math.floor((x + off) / 8), u = ((x + off) % 8 + 8) % 8, v = ((y % 8) + 8) % 8, n = fbm(x, y, 5);
      const pud = vnoise(x, y, 14, 77) + (n - 0.5) * 0.15;
      if (pud > 0.72) { const d = pud - 0.72; if (d < 0.02) return pick(PAL.cwater, 0.2, x, y); let s = 0.38 + (vnoise(x, y * 3, 6, 3) - 0.5) * 0.3 + (d > 0.06 ? 0.08 : 0); if (((x * 2 + y * 5) % 23 + 23) % 23 < 2) s += 0.4; return pick(PAL.cwater, cl(s), x, y); }
      const ms = fbm(x, y, 13);
      if (u === 0 || v === 0) return ms > 0.5 ? pick(PAL.moss, cl(0.25 + (ms - 0.5) * 1.2), x, y) : pick(PAL.cstone, 0.08, x, y);
      let s = 0.42 + (hash(cx, row, 81) - 0.5) * 0.26 + (n - 0.5) * 0.18; if (u === 1 || v === 1) s += 0.14; else if (u === 7 || v === 7) s -= 0.1;
      if (hash(cx, row, 82) < 0.12 && Math.abs(u - v) < 0.6) s -= 0.2; // cracked slabs
      if (pud > 0.66) s -= (pud - 0.66) * 3; // wet rim
      if (ms > 0.7) return pick(PAL.moss, cl(0.3 + (ms - 0.66) * 1.6 + (hash(x, y, 4) - 0.5) * 0.2), x, y);
      return pick(PAL.cstone, cl(s, 0.08, 0.95), x, y); },
    rim: PAL.cstone, rimV: 0.72, accent: '#50ff90', glow: '80,255,140',
  },
  spire: {
    top: (x, y) => { const n = fbmP(x, y, 7), h = hash(w64(x), w64(y), 8), sn = fbmP(x * 1.3, y, 12) + (vnoise(x, y, 4, 13, 64) - 0.5) * 0.12; if (sn > 0.67) return pick(PAL.snow, cl(0.4 + (sn - 0.67) * 3 + (n - 0.5) * 0.3), x, y); return pick(PAL.ice, cl(0.14 + n * 0.2 + (h < 0.02 ? 0.35 : 0)), x, y); },
    face: (x, y, fy) => { const v = vor(x, y, 5, 1.9, 91), e = v.e, hh = v.h, dx = v.dx; let s = 0.5 + (hh - 0.5) * 0.4 - dx * 0.04 - fy * 0.03;
      if (e < 0.6) s = 0.88; if (fy === 0) s = 0.95;
      const icl = Math.floor(hash(x >> 1, y >> 4, 13) * 6); if (fy < icl && ((x & 1) === 0 || fy < icl - 2)) return pick(PAL.snow, cl(0.9 - fy * 0.08), x, y);
      return pick(PAL.ice, cl(s, 0.05, 1), x, y); },
    floor: (x, y) => { const n = fbm(x, y, 9), band = ((x * 0.6 + y) % 46 + 46) % 46; let s = 0.5 + (n - 0.5) * 0.3;
      if (band < 5) s += 0.16 - Math.abs(band - 2.5) * 0.03; else if (band < 7) s += 0.06;
      const v = vor(x, y, 13, 0.85, 17); if (v.e < 0.55) s = 0.88; else if (v.e < 1.4 && v.dx + v.dy > 0) s -= 0.07;
      if (hash(x, y, 4) < 0.004) s = 1;
      return pick(PAL.icef, cl(s, 0.1, 1), x, y); },
    rim: PAL.snow, rimV: 1, accent: '#90e8ff', glow: '140,220,255',
  },
  storm: {
    top: (x, y) => { const n = fbmP(x, y, 2), h = hash(w64(x), w64(y), 3); return h < 0.003 ? PAL.ystal[3] : pick(PAL.slate, cl(0.05 + n * 0.16 + (h < 0.05 ? 0.07 : 0)), x, y); },
    face: (x, y, fy, tx, ty) => { let s = 0.48 + (vnoise(x * 0.3, y, 3, 4) - 0.5) * 0.3 + (hash(x >> 2, ty, 5) - 0.5) * 0.1 - fy * 0.022;
      if ((fy + Math.floor(vnoise(x, ty * 3, 8, 6) * 3)) % 4 === 0) s -= 0.18; else if ((fy + Math.floor(vnoise(x, ty * 3, 8, 6) * 3)) % 4 === 1) s += 0.1;
      if (vnoise(x, ty, 2.5, 9) > 0.82 && fy > 1) s = 0.08; if (fy === 0) s = 0.82;
      return pick(PAL.slate, cl(s, 0.05, 0.95), x, y); },
    floor: (x, y) => { const pud = vnoise(x, y, 13, 55), v = vor(x, y, 7, 0.85, 37), e = v.e, hh = v.h, dx = v.dx, dy = v.dy, n = fbm(x, y, 6);
      if (pud > 0.7) { let s = 0.3 + (vnoise(x, y * 2, 5, 3) - 0.5) * 0.2; if (((x * 3 - y * 2) % 31 + 31) % 31 < 2) s += 0.4; return pick(PAL.sfl, cl(s), x, y); }
      if (e < 1) return pick(PAL.sfl, 0.04, x, y);
      let s = 0.55 + (hh - 0.5) * 0.24 + (n - 0.5) * 0.22; const lit = -(dx + dy); if (e < 2.1) s += lit > 0.3 ? 0.16 : lit < -0.3 ? -0.14 : 0;
      if (pud > 0.64) s -= 0.12;
      if (hash(x, y, 7) < 0.004) return PAL.ystal[5];
      return pick(PAL.sfl, cl(s, 0.1, 0.98), x, y); },
    rim: PAL.slate, rimV: 0.8, accent: '#ffe060', glow: '255,230,110',
  },
};
// ice / storm crystal clusters (tile-local, bottom at y 15)
const CLUSTERS = [[[7.5, 10, 3, 0], [4.5, 6, 2, -0.3], [11, 7, 2, 0.35]], [[6, 8, 3, -0.15], [10, 10, 3, 0.15], [13, 5, 2, 0.4]], [[8, 11, 4, 0.05], [4, 5, 2, -0.45]]];
function crystal(set, R, v, ox = 0, oy = 0, by = 15) {
  for (const [bx, h, w, lean] of CLUSTERS[v % CLUSTERS.length]) for (let t = 0; t < h; t++) { const cx = bx + lean * t, half = (w / 2) * (t < h - 2 ? 1 : (h - t) / 2.2);
    for (let x = Math.floor(cx - half); x < cx + half; x++) { const u = (x + 0.5 - cx) / half; set(ox + x, oy + by - t, R[Math.max(0, Math.min(R.length - 1, Math.round((u < -0.2 ? 0.85 : u < 0.25 ? 0.62 : 0.32) * (R.length - 1) + (t > h - 3 ? 1 : 0))))]); } }
}
const crystalPix = (pal, v) => once(`cry${pal}${v}`, () => { const p = new Pix(16, 16); crystal((x, y, c) => p.set(x, y, c), PAL[pal], v); return p.canvas(); });
const starPix = () => once('star', () => { const p = new Pix(5, 5); for (const [x, y, c] of [[2, 0, '#c8ecff'], [2, 1, '#ffffff'], [0, 2, '#c8ecff'], [1, 2, '#ffffff'], [2, 2, '#ffffff'], [3, 2, '#ffffff'], [4, 2, '#c8ecff'], [2, 3, '#ffffff'], [2, 4, '#c8ecff']]) p.set(x, y, pk(c)); return p.canvas(); });

function buildDungeon(m) {
  const th = m.theme, T = DUN[th], rows = m.rows, W = rows[0].length, H = rows.length, MG = 3, TW = W + 2 * MG, TH = H + 2 * MG, GW = TW * 16, GH = TH * 16, O = MG * 16, P = new Pix(GW, GH);
  const ch = (tx, ty) => (tx < 0 || ty < 0 || tx >= W || ty >= H ? '#' : rows[ty][tx]), isW = (tx, ty) => ch(tx, ty) === '#';
  const torch = (tx, ty) => isW(tx, ty) && ch(tx, ty + 1) === '.' && (tx * 5 + ty * 3) % 7 === 0; // where game.js hangs its torches
  for (let py = 0; py < GH; py++) for (let px = 0; px < GW; px++) {
    const x = px - O, y = py - O, tx = x >> 4, ty = y >> 4, lx = x & 15, ly = y & 15; let col;
    if (isW(tx, ty)) {
      const face = !isW(tx, ty + 1), cap = isW(tx, ty - 1) ? 0 : CAPH, lip = isW(tx, ty + 1) && !isW(tx, ty + 2) ? 15 - ly : 99;
      if (face && ly >= cap) { col = T.face(x, y, ly - cap, tx, ty); if (lx === 0 && !isW(tx - 1, ty)) col = dk(col, 0.62); else if (lx === 15 && !isW(tx + 1, ty)) col = dk(col, 0.55); if (ly === 15) col = dk(col, 0.7); }
      else {
        col = T.top(x, y);
        const dL = !isW(tx - 1, ty) ? lx : 99, dR = !isW(tx + 1, ty) ? 15 - lx : 99, dU = !isW(tx, ty - 1) ? ly : 99, dB = face ? cap - 1 - ly : lip, d = Math.min(dL, dR, dU, dB);
        if (d === 0) col = pick(T.rim, T.rimV, x, y); else if (d === 1) col = pick(T.rim, T.rimV * 0.7, x, y);
        else if (d > 1 && !face) { // diagonal corners
          if ((!isW(tx - 1, ty - 1) && lx + ly === 0) || (!isW(tx + 1, ty - 1) && lx === 15 && ly === 0) || (!isW(tx - 1, ty + 1) && lx === 0 && ly === 15) || (!isW(tx + 1, ty + 1) && lx === 15 && ly === 15)) col = pick(T.rim, T.rimV * 0.7, x, y);
        }
      }
    } else {
      col = T.floor(x, y);
      if (col) { let f = 1; if (isW(tx, ty - 1) && ly < 5) f *= 0.5 + ly * 0.1; if (isW(tx - 1, ty) && lx < 3) f *= 0.62 + lx * 0.13; if (isW(tx + 1, ty) && lx > 12) f *= 0.72 + (15 - lx) * 0.09; if (isW(tx, ty + 1) && ly > 14) f *= 0.8; if (f < 1) col = dk(col, f); }
    }
    P.d[py * GW + px] = col;
  }
  const S = (x, y, c) => P.set(x + O, y + O, c), G = (x, y) => P.get(x + O, y + O), D = (x, y, f) => { const c = G(x, y); if (cA(c)) S(x, y, dk(c, f)); }, B = (x, y, c, t) => { const o = G(x, y); if (cA(o)) S(x, y, mix(o, c, t)); };
  const anim = { cryst: [], floor: [], walls: [] }, ACC = pk(T.accent);
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const c = ch(tx, ty), X = tx * 16, Y = ty * 16, h = hash(tx, ty, 77);
    if (c !== '#') anim.floor.push([tx, ty]);
    if (c === '#' && !isW(tx, ty + 1)) anim.walls.push([tx, ty]);
    const faceRun = c === '#' && !isW(tx, ty + 1) && isW(tx - 1, ty) && isW(tx + 1, ty) && !isW(tx - 1, ty + 1) && !isW(tx + 1, ty + 1) && !torch(tx, ty) && ch(tx, ty + 1) !== 'E';
    if (th === 'crypt' && faceRun && h < 0.3) { // burial niche with an upright coffin
      for (let fy = 1; fy < 12; fy++) for (let lx = 3; lx < 13; lx++) { if (fy < 3 && Math.abs(lx + 0.5 - 8) > 5 - (3 - fy) * 1.6) continue; S(X + lx, Y + CAPH + fy, lx === 3 || fy === 1 ? pick(PAL.cstone, 0.7, lx, fy) : pk('#060a08')); }
      for (let fy = 2; fy < 12; fy++) { const hw = fy < 4 ? 2 + (fy - 2) : 3 - (fy - 4) * 0.12; for (let lx = Math.floor(8 - hw); lx < 8 + hw; lx++) { const u = (lx + 0.5 - 8) / hw; S(X + lx, Y + CAPH + fy, pick(PAL.wood, cl(0.55 - u * 0.25 - fy * 0.015), lx, fy)); } }
      for (let fy = 4; fy < 10; fy++) S(X + 8, Y + CAPH + fy, pick(PAL.gold, 0.55, 0, fy)); for (let lx = 6; lx < 10; lx++) S(X + lx, Y + CAPH + 5, pick(PAL.gold, 0.6, lx, 0));
    }
    if ((th === 'storm' || th === 'spire') && faceRun && h < (th === 'storm' ? 0.34 : 0.22)) { const pal = th === 'spire' ? 'ice' : hash(tx, ty, 5) < 0.6 ? 'ystal' : 'pstal', v = Math.floor(hash(tx, ty, 6) * 3);
      crystal((x, y, c) => S(X + x, Y + y, th === 'storm' ? dk(c, 0.55) : c), PAL[pal], v); anim.cryst.push([tx, ty, pal, v]); }
    if (th === 'cavern' && faceRun && h < 0.14) for (let fy = 0; fy < 12; fy++) for (let lx = 6; lx < 10; lx++) { const wv = 7.5 + Math.sin(fy * 0.9 + tx) * 0.8; if (Math.abs(lx + 0.5 - wv) < 1.3) S(X + lx, Y + CAPH + fy, pick(PAL.lava, cl(0.85 - Math.abs(lx + 0.5 - wv) * 0.3 - (fy & 1) * 0.08), lx, fy)); } // lava seep
    if (c !== '#' && th === 'crypt') { // cobwebs in inner corners, scattered bones
      for (const sd of [-1, 1]) if (isW(tx, ty - 1) && isW(tx + sd, ty) && hash(tx, ty, 40 + sd) < 0.75) { const cx0 = sd < 0 ? X : X + 15;
        for (let r = 0; r < 9; r++) for (let a = 0; a <= 4; a++) { const t = (a / 4) * Math.PI / 2, px = cx0 - sd * Math.round(Math.cos(t) * r), py = Y + Math.round(Math.sin(t) * r); if (r > 0 && (r % 3 === 0 || true)) B(px, py, pk('#d8e0dc'), r % 3 === 0 ? 0.55 : 0.3); }
        for (const r of [3, 6, 8]) for (let s = 0; s <= r * 1.6; s++) { const t = (s / (r * 1.6)) * Math.PI / 2; B(cx0 - sd * Math.round(Math.cos(t) * r), Y + Math.round(Math.sin(t) * r), pk('#e8f0ec'), 0.45); } }
      if (c === '.' && h > 0.95) { const bx = X + 4 + Math.floor(hash(tx, ty, 3) * 6), by = Y + 6 + Math.floor(hash(tx, ty, 4) * 6); for (const [u, v, k] of [[0, 0, 'w'], [1, 0, 'w'], [2, 0, 'w'], [0, 1, 'k'], [1, 1, 'w'], [2, 1, 'k'], [1, 2, 'g'], [4, 2, 'w'], [5, 2, 'g'], [6, 2, 'w'], [3, 1, 'g']]) S(bx + u, by + v, pk(k === 'w' ? '#e8e4d0' : k === 'g' ? '#a8a490' : '#202018')); }
    }
    if (c === 'C') for (let y = Y + 12; y < Y + 17; y++) for (let x = X + 2; x < X + 16; x++) if (((x + 0.5 - X - 9) / 7) ** 2 + ((y + 0.5 - Y - 14.5) / 2.4) ** 2 <= 1) D(x, y, 0.55);
    if (c === 'E') { // stairs up to daylight: an arched passage in the wall above, steps down onto the floor
      const day = pk('#fff2c8'), stone = th === 'spire' ? PAL.icef : th === 'crypt' ? PAL.cstone : th === 'storm' ? PAL.slate : PAL.basalt;
      if (isW(tx, ty - 1)) for (let ly = CAPH - 2; ly < 16; ly++) for (let lx = 1; lx < 15; lx++) { const fy = ly - CAPH + 2, ar = fy < 4 && Math.abs(lx + 0.5 - 8) > 7 - [5, 3, 1.5, 0.5][fy]; if (ar) continue;
        const jamb = lx < 3 || lx > 12, k = (ly - CAPH + 2) / 14;
        S(X + lx, Y - 16 + ly, jamb ? pick(stone, lx === 1 || lx === 13 ? 0.85 : 0.5, lx, ly) : mix(pick(stone, ((ly + 1) % 3 === 0 ? 0.15 : (ly + 1) % 3 === 1 ? 0.8 : 0.55), lx, ly), day, cl(0.7 - k * 0.8))); }
      for (let ly = 0; ly < 12; ly++) for (let lx = 1; lx < 15; lx++) { const jamb = lx < 3 || lx > 12; S(X + lx, Y + ly, jamb ? pick(stone, 0.55 - ly * 0.03, lx, ly) : mix(pick(stone, (ly % 4 === 3 ? 0.12 : ly % 4 === 0 ? 0.9 : 0.62), lx, ly), day, cl(0.12 - ly * 0.012))); }
      for (let ly = 10; ly < 16; ly++) for (let lx = 2; lx < 14; lx++) B(X + lx, Y + ly, day, 0.18 - (ly - 10) * 0.025);
    }
  }
  if (th === 'spire') for (let py = 0; py < GH; py++) for (let px = 0; px < GW; px++) { // polished ice mirrors the wall faces above it
    const x = px - O, y = py - O, tx = x >> 4, ty = y >> 4, ly = y & 15; if (isW(tx, ty) || !isW(tx, ty - 1) || ly > 9) continue;
    const src = P.get(px, py - 2 * ly - 1); if (cA(src)) P.d[py * GW + px] = mix(P.d[py * GW + px], src, 0.42 * (1 - ly / 10));
  }
  const boss = m.boss; if (boss) { // rune circle around the boss's lair
    const cx = boss.x * 16 + 8, cy = boss.y * 16 + 8, glowC = mix(ACC, pk('#ffffff'), 0.5), pts = [0, 1, 2, 3, 4, 5].map((i) => [cx + Math.cos(i * Math.PI / 3 - Math.PI / 2) * 21, cy + Math.sin(i * Math.PI / 3 - Math.PI / 2) * 21 * 0.8]);
    const fl = (x, y) => !isW((x) >> 4, (y) >> 4);
    for (let y = cy - 26; y <= cy + 26; y++) for (let x = cx - 28; x <= cx + 28; x++) { if (!fl(x, y)) continue; const r = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) / 0.8);
      if ((r > 21 && r < 22.6) || (r > 13 && r < 14.2)) S(x, y, ACC); else if (r > 22.6 && r < 24) B(x, y, ACC, 0.35); else if (r > 14.2 && r < 21 && ((Math.atan2(y - cy, x - cx) * 8 / Math.PI + 16) % 2) < 0.18) B(x, y, ACC, 0.6); else if (r < 13) B(x, y, ACC, 0.12); }
    for (let i = 0; i < 6; i++) for (const j of [2]) { const [ax, ay] = pts[i], [bx, by] = pts[(i + j) % 6], n = Math.ceil(Math.hypot(bx - ax, by - ay)); for (let k = 0; k <= n; k++) { const x = Math.round(ax + (bx - ax) * k / n), y = Math.round(ay + (by - ay) * k / n); if (fl(x, y)) S(x, y, glowC); } }
    anim.boss = [boss.x + 0.5, boss.y + 0.5];
  }
  return { cv: P.canvas(), GW, GH, MG, anim };
}

// ---------------------------------------------------------------- animated ground: lava under the cavern's cracks
const LF = 8;
function lavaTex(f) {
  return once('lava' + f, () => { const p = new Pix(64, 64), ph = (f / LF) * 64;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const a = vnoise(x + ph, y, 16, 3, 64), b = vnoise(x - ph, y + 32, 16, 5, 64), c = vnoise(x, y + ph, 8, 7, 64);
      let v = 0.55 + (a + b - 1) * 0.55 + (c - 0.5) * 0.3; if (Math.abs(a - b) < 0.04) v += 0.3; p.set(x, y, pick(PAL.lava, cl(v, 0.15, 1), x, y)); } return p; });
}
const lavaTile = (x, y, f) => once(`lv${f}${x & 3}${y & 3}`, () => { const t = lavaTex(f), p = new Pix(16, 16); for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) p.d[j * 16 + i] = t.d[((y & 3) * 16 + j) * 64 + (x & 3) * 16 + i]; return p.canvas(); });
const topTile = (th, x, y) => once(`tp${th}${x & 3}${y & 3}`, () => { const p = new Pix(16, 16); for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) p.d[j * 16 + i] = DUN[th].top((x & 3) * 16 + i, (y & 3) * 16 + j); return p.canvas(); });
const blackTile = () => once('black', () => { const p = new Pix(1, 1); p.d[0] = VOID; return p.canvas(); });
export function ground(theme, get, x, y, t) {
  if (theme === 'interior') return blackTile();
  if (get(x, y) === '#') return topTile(theme, x, y);
  return theme === 'cavern' ? lavaTile(x, y, Math.floor(t * 6) % LF) : blackTile();
}
export function objects() {}

// ---------------------------------------------------------------- per-map cache and the draw hooks used by game.js
const MC = new WeakMap();
const mapState = (m) => { let s = MC.get(m); if (!s) { s = m.theme === 'interior' ? buildRoom(m) : buildDungeon(m); MC.set(m, s); } return s; };
const canvasItem = (s) => ({ x: -s.MG, y: -s.MG, w: 1, h: 1, z: 0, draw: (ctx, X, Y, TS) => { const k = TS / 16, sx0 = Math.max(0, Math.floor(-X / k)), sy0 = Math.max(0, Math.floor(-Y / k)), sw = Math.min(s.GW - sx0, Math.ceil(ctx.canvas.width / k) + 2), sh = Math.min(s.GH - sy0, Math.ceil(ctx.canvas.height / k) + 2); if (sw > 0 && sh > 0) ctx.drawImage(s.cv, sx0, sy0, sw, sh, X + sx0 * k, Y + sy0 * k, sw * k, sh * k); } });
const stormFlash = (t) => { const p = t % 5.3; return p < 0.07 ? 1 : p < 0.14 ? 0.2 : p < 0.5 ? 0.85 * (1 - (p - 0.14) / 0.36) : 0; };
const EMB = ['rgba(255,200,90,.9)', 'rgba(255,150,50,.7)', 'rgba(240,90,30,.5)', 'rgba(200,60,20,.3)'];
export function mapObjects(m, t, out) {
  const s = mapState(m), open = (x, y) => !!m.chestOpen?.(x, y);
  out.push(canvasItem(s));
  m.rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === 'C') out.push(place(chestPix(open(x, y)), x, y)); });
  if (m.theme === 'interior') {
    const { kind, town } = s.info; let bi = 0;
    for (const [x, y, k] of m.decor || []) {
      if (k === 'counter') continue;
      const img = k === 'bed' ? bedPix(town) : k === 'table' ? tablePix() : k === 'barrel' ? barrelPix() : k === 'anvil' ? anvilPix() : k === 'banner' ? bannerPix(bi++) : k === 'shelf' ? (kind === 'smith' ? rackPix() : shelfPix(kind === 'shop' ? 'shop' : 'house')) : null;
      if (img) out.push(place(img, x, y));
    }
    for (const c of counters(m)) { const img = counterPix(c.w, kind); out.push({ img, x: c.x - 1 / 16, y: c.y + 1 - 19 / 16, z: 1, sy: c.y + 1.02 }); } // drops 6 px into the row below: the keeper shows from the waist up
    const fl = 0.85 + Math.sin(t * 9) * 0.08 + Math.sin(t * 23) * 0.05;
    for (const a of s.anim) {
      if (a.k === 'fire') out.push({ img: firePix(Math.floor(t * 8) % 4), x: a.x / 16, y: a.y / 16, w: a.w / 16, h: a.h / 16, z: 0 });
      else if (a.k === 'coals') out.push({ img: coalsPix(Math.floor(t * 3) % 4), x: a.x / 16, y: a.y / 16, z: 0 });
      else if (a.k === 'flame') out.push({ img: flamePix(Math.floor(t * 5 + a.x) % 2), x: a.x / 16, y: a.y / 16, z: 0 });
      else if (a.k === 'glow') out.push(glowItem('255,150,60', a.x / 16, a.y / 16, a.r, a.a * fl));
    }
    return;
  }
  const A = s.anim, th = m.theme, T = DUN[th];
  if (A.boss) { const pu = 0.45 + Math.sin(t * 2.2) * 0.2; out.push(glowItem(T.glow, A.boss[0], A.boss[1], 2.2, pu, 0)); }
  for (const [x, y] of m.rows.flatMap((r, y) => [...r].map((c, x) => (c === 'E' ? [x, y] : null)).filter(Boolean))) out.push(glowItem('255,240,200', x + 0.5, y - 0.2, 1.4, 0.35 + Math.sin(t * 1.3) * 0.05, 0));
  if (th === 'cavern') {
    const F = A.floor;
    out.push({ x: 0, y: 0, w: 1, h: 1, z: 2, draw: (ctx, X, Y, TS) => { const q = TS / 16; for (let i = 0; i < 70; i++) { const [tx, ty] = F[Math.floor(hash(i, 1, 9) * F.length)], T0 = 2.4 + hash(i, 2, 9) * 2.2, u = (t / T0 + hash(i, 3, 9)) % 1;
      const ex = X + (tx + 0.5 + Math.sin(u * 6 + i) * 0.3 + (hash(i, 4, 9) - 0.5) * 0.6) * TS, ey = Y + (ty + 0.9 - u * 1.8) * TS; if (ex < -4 || ey < -4 || ex > ctx.canvas.width + 4 || ey > ctx.canvas.height + 4) continue;
      ctx.fillStyle = EMB[Math.min(3, Math.floor(u * 4))]; ctx.fillRect(Math.round(ex), Math.round(ey), q * (u < 0.5 ? 2 : 1), q * (u < 0.5 ? 2 : 1)); } } });
  } else if (th === 'crypt') {
    const F = A.floor;
    for (let i = 0; i < 9; i++) { const [tx, ty] = F[Math.floor(hash(i, 5, 3) * F.length)], h = hash(i, 6, 3), wx = tx + 0.5 + Math.sin(t * 0.45 + h * 9) * 1.1, wy = ty + 0.2 + Math.cos(t * 0.33 + h * 5) * 0.7 + Math.sin(t * 2 + i) * 0.08;
      out.push(glowItem('80,255,150', wx, wy, 0.95, 0.42 + Math.sin(t * 3 + i) * 0.12));
      out.push({ x: wx, y: wy, w: 1, h: 1, z: 2, draw: (ctx, X, Y, TS) => { const q = TS / 16; ctx.fillStyle = 'rgba(210,255,220,.9)'; ctx.fillRect(Math.round(X - q), Math.round(Y - q), q * 2, q * 2); ctx.fillStyle = 'rgba(120,255,160,.5)'; ctx.fillRect(Math.round(X - q * 2), Math.round(Y), q * 4, q); } }); }
  } else if (th === 'spire') {
    const F = A.floor.concat(A.walls);
    for (let i = 0; i < 40; i++) { const u = (t * 0.55 + hash(i, 7, 4)) % 1; if (u > 0.14) continue; const [tx, ty] = F[Math.floor(hash(i, 8, 4) * F.length)]; out.push({ img: starPix(), x: tx + 0.2 + hash(i, 9, 4) * 0.6, y: ty + 0.2 + hash(i, 10, 4) * 0.6, w: 5 / 16, h: 5 / 16, z: 2 }); }
    for (const [tx, ty, pal, v] of A.cryst) out.push(glowItem(T.glow, tx + 0.5, ty + 0.6, 0.9, 0.22 + Math.sin(t * 1.4 + tx * 2 + ty) * 0.1, 0));
  } else if (th === 'storm') {
    const f = stormFlash(t);
    for (const [tx, ty, pal, v] of A.cryst) { const a = Math.max(f, 0.3 + 0.25 * Math.sin(t * 1.7 + tx * 1.3 + ty * 0.7)); out.push({ img: crystalPix(pal, v), x: tx, y: ty, z: 0, draw: (ctx, X, Y, TS) => { ctx.globalAlpha = a; ctx.drawImage(crystalPix(pal, v), X, Y, TS, TS); ctx.globalAlpha = 1; } }); out.push(glowItem(pal === 'pstal' ? '190,130,255' : T.glow, tx + 0.5, ty + 0.65, 1.1, a * 0.5, 0)); }
    if (f > 0) out.push({ x: 0, y: 0, w: 1, h: 1, z: 2, draw: (ctx) => { ctx.fillStyle = `rgba(200,215,255,${(f * 0.22).toFixed(3)})`; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); } });
  }
}
