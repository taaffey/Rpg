// ===== Pixel-art kit for the themed interiors (roomart2.js + roomthemes*.js): small drawing helpers on top of roomart.js's =====
import { RH } from './roomart.js';
export const { pk, ramp, PAL, Pix, cl, mix, dk, hash, vnoise, fbm, vor, pick, bay, outline, blob, cylinder, once, glowItem, glowCv, firePix, flamePix, coalsPix, place, plankPx, flagPx, barrelPix, tablePix, bedPix, rackPix, anvilPix, chestPix, candlePix, rgba, cR, cG, cB, cA, VOID, counters } = RH;
export const PL = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, pk(v)]));
export const lerp = (a, b, t) => a + (b - a) * t;
// blit a character grid: '.' and ' ' are clear, every other letter looks up pal
export function GR(p, ox, oy, rows, pal) {
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) { const c = rows[j][i]; if (c === '.' || c === ' ') continue; const v = pal[c]; if (v !== undefined) p.set(ox + i, oy + j, v); }
}
// a shaded rectangle lit from the upper left: bright top row and left column, dark bottom row and right column
export function box(p, x, y, w, h, R, o = {}) {
  const { s = 0.55, hi = 0.88, lo = 0.2, tex = null } = o;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { let v = s; if (j === 0) v = hi; else if (j === h - 1) v = lo; else if (i === 0) v = hi - 0.14; else if (i === w - 1) v = lo + 0.12; if (tex) v += tex(i, j); p.set(x + i, y + j, pick(R, cl(v), x + i, y + j)); }
}
// filled ellipse; fn(x, y, u, v) with u, v in -1..1 returns a colour (or 0 to skip)
export function ell(p, cx, cy, rx, ry, fn) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry; if (u * u + v * v > 1) continue; const c = fn(x, y, u, v); if (c) p.set(x, y, c); }
}
export function line(p, x0, y0, x1, y1, c) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let i = 0; i <= n; i++) p.set(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), typeof c === 'function' ? c(i / n) : c);
}
// cached sprite: w x h px (1 px padding for the outline), drawn by fn(p)
export const spr = (key, w, h, fn, ol = 0.4) => once(key, () => { const p = new Pix(w, h); fn(p); if (ol) outline(p, ol); return p.canvas(); });
// a framed window set into the back wall between face rows f0..f1; paint(gx, gy, gw, gh, x, y) colours the glass
export function win(u, cx, hw, f0, f1, R, paint, o = {}) {
  const { mx = 0, my = 0, sill = true } = o, gw = hw * 2 - 4, gh = f1 - f0 + 1 - 4;
  for (let f = f0; f <= f1; f++) for (let x = cx - hw; x < cx + hw; x++) {
    const i = x - (cx - hw), j = f - f0, e = Math.min(i, j, hw * 2 - 1 - i, f1 - f0 - j);
    let c;
    if (e === 0) c = pick(R, 0.1, x, f); else if (e === 1) c = pick(R, i < 2 || j < 2 ? 0.85 : 0.45, x, f);
    else { const gx = i - 2, gy = j - 2; c = paint(gx, gy, gw, gh, x, f); if ((mx && gx === Math.floor(gw / 2)) || (my && gy === Math.floor(gh * my))) c = pick(R, gx === Math.floor(gw / 2) ? 0.6 : 0.75, x, f); }
    u.S(x, u.wy(f), c);
  }
  if (sill) for (let x = cx - hw - 2; x < cx + hw + 2; x++) { u.S(x, u.wy(f1 + 1), pick(R, 0.9, x, 0)); u.S(x, u.wy(f1 + 2), pick(R, 0.3, x, 0)); }
}
// draw a character grid directly into the baked room (wall fittings): rows of palette letters
export const GRU = (u, x0, f0, rows, pal) => rows.forEach((r, j) => [...r].forEach((c, i) => { if (c !== '.' && c !== ' ' && pal[c] !== undefined) u.S(x0 + i, u.wy(f0 + j), pal[c]); }));
// a face-row rectangle in the baked room
export const FR = (u, x0, f0, w, h, fn) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) u.S(x0 + i, u.wy(f0 + j), fn(i, j, x0 + i, f0 + j)); };
// 3x5 chalk-style glyph strokes for menus and signs: text of A-Z 0-9 . - (drawn as tiny pixel letters)
const FONT = { A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110', '.': '000000000000010', '-': '000000111000000', '!': '010010010000010', ' ': '000000000000000' };
export function text(set, x, y, str, c, gap = 1) {
  let cx = x;
  for (const ch of str.toUpperCase()) { const g = FONT[ch] || FONT[' ']; for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === '1') set(cx + i, y + j, c); cx += 3 + gap; }
  return cx - x - gap;
}
// a frame list helper: which of n frames to show at time t
export const frameAt = (t, fps, n, off = 0) => Math.floor(t * fps + off) % n;
// a bed like the pub's, recoloured: W = frame ramp, pat(u, v) = blanket colour at blanket pixel u, v, sheet = sheet ramp
export function bedGen(key, { W, pat, sheet = PAL.cloth, post = null }) {
  return once(key, () => {
    const p = new Pix(18, 30);
    for (let y = 1; y < 11; y++) for (let x = 1; x < 17; x++) { const ps = x <= 2 || x >= 15; if (!ps && y < 3) continue; p.set(x, y, pick(W, ps ? (x === 1 || x === 15 ? 0.72 : 0.4) + (y === 1 ? 0.15 : 0) : y === 3 ? 0.8 : (x - 3) % 4 === 0 ? 0.3 : 0.55, x, y)); }
    for (let y = 9; y < 27; y++) for (let x = 2; x < 16; x++) p.set(x, y, pick(sheet, 0.7 - (x - 2) * 0.02, x, y));
    blob(p, 9, 11.5, 5.5, PAL.cloth, { sq: 0.5, amb: 0.4, jit: 0.05 });
    for (let y = 15; y < 27; y++) for (let x = 2; x < 16; x++) { const u = x - 2, v = y - 15, side = x === 2 || x === 15; let c = pat(u, v); if (v < 2) c = v === 0 ? pk('#fbf8ee') : pk('#d8d2c0'); c = dk(c, side ? 0.62 : 1 - u * 0.012 - v * 0.012); if (v === 2) c = dk(c, 0.75); p.set(x, y, c); }
    for (let y = 26; y < 29; y++) for (let x = 1; x < 17; x++) p.set(x, y, pick(W, y === 26 ? 0.75 : y === 27 ? 0.45 : 0.2, x, y));
    if (post) post(p);
    outline(p, 0.4); return p.canvas();
  });
}
// a round table with two chair backs, recoloured; top(p) draws what stands on it (table top spans x 1..16, y 8..14)
export function tableGen(key, W, top, chair = W) {
  return once(key, () => {
    const p = new Pix(18, 24);
    for (let y = 1; y < 10; y++) for (const x of [5, 12]) { p.set(x, y, pick(chair, 0.7, x, y)); p.set(x + 1, y, pick(chair, 0.35, x, y)); }
    for (const y of [2, 5]) for (let x = 6; x < 12; x++) { p.set(x, y, pick(chair, 0.62, x, y)); p.set(x, y + 1, pick(chair, 0.3, x, y)); }
    for (let y = 16; y < 22; y++) for (let x = 8; x < 10; x++) p.set(x, y, pick(W, x === 8 ? 0.5 : 0.25, x, y));
    for (let x = 5; x < 13; x++) { p.set(x, 21, pick(W, 0.4, x, 21)); p.set(x, 22, pick(W, 0.2, x, 22)); }
    for (let y = 8; y < 18; y++) for (let x = 1; x < 17; x++) { const dx = (x + 0.5 - 9) / 7.6, dy = (y + 0.5 - 12) / 4.2, d = dx * dx + dy * dy; if (d > 1 && !(y >= 12 && Math.abs(dx) <= 0.98 && y < 15)) continue;
      const front = y >= 12 && d > 1 || (d > 0.82 && dy > 0.2); p.set(x, y, front ? pick(W, 0.32 - dx * 0.08, x, y) : pick(W, cl(0.72 - dx * 0.12 - dy * 0.12 + ((y - 8) % 3 === 0 ? -0.08 : 0) + (d > 0.8 ? -0.12 : 0)), x, y)); }
    top(p); outline(p, 0.4); return p.canvas();
  });
}
