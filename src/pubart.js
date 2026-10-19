// ===== Bearded Bros: "The Bell & Anvil", a cosy 2026 pub, as a 256x144 16-bit illustration =====
// pubScene(variant) -> canvas (native pixels; scale it up with image-rendering: pixelated); pubURL(variant, scale) -> dataURL.
// Variants: 'pub' (the bros on their stools, pints in hand), 'ring' (Devon up, yanking the old brass bell's rope),
// 'flash' (the ring scene washed in golden-white light, the bros dissolving into sparkles),
// 'return' (the ending: back on their stools in a few fantasy bits, a sword leaning on the bar, the bell swinging gently).
// The room is painted pixel by pixel with ordered dither; the bros and the bell are modelled with the battle sprite engine.
import { render, ell, cap, poly, paint, rampOf as R, hex2rgb, bayer, hash, fbm } from './battleart.js';

export const PW = 256, PH = 144;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const RG = (list) => list.map(hex2rgb);

// ---------------------------------------------------------------- pixel buffer
function buffer(w, h) {
  const d = new Uint8ClampedArray(w * h * 4);
  const P = {
    w, h, d,
    set(x, y, c, a = 255) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= w || y >= h) return; const i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a; },
    get(x, y) { x = clamp(x | 0, 0, w - 1); y = clamp(y | 0, 0, h - 1); const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]]; },
    blend(x, y, c, a) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= w || y >= h || a <= 0) return; const i = (y * w + x) * 4; d[i] = lerp(d[i], c[0], a); d[i + 1] = lerp(d[i + 1], c[1], a); d[i + 2] = lerp(d[i + 2], c[2], a); },
    pick(cols, t, x, y) { const f = clamp(t, 0, 0.9999) * (cols.length - 1), b = Math.floor(f); return cols[Math.min(cols.length - 1, b + (f - b > bayer(x, y) ? 1 : 0))]; },
    fill(x0, y0, x1, y1, cols, fn) { for (let y = Math.max(0, y0 | 0); y < Math.min(h, y1); y++) for (let x = Math.max(0, x0 | 0); x < Math.min(w, x1); x++) { const t = fn(x, y); if (t != null) P.set(x, y, P.pick(cols, t, x, y)); } },
    glow(cx, cy, r, col, a = 0.4, sy = 1) { const c = hex2rgb(col); for (let y = Math.floor(cy - r * sy); y <= cy + r * sy; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const q = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) / sy) / r; if (q >= 1) continue; const f = (1 - q) * 4, b = Math.floor(f) + ((f % 1) > 0.35 + bayer(x, y) * 0.3 ? 1 : 0); if (b > 0) P.blend(x, y, c, Math.min(0.85, b * 0.1 * a * 2)); } },
    sprite(src, ox, oy, fx) { // composite a canvas (alpha) at ox, oy; fx(x, y, rgb) may return null (skip) or a colour
      const sd = src.getContext('2d').getImageData(0, 0, src.width, src.height).data;
      for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) { const i = (y * src.width + x) * 4; if (sd[i + 3] < 128) continue; let c = [sd[i], sd[i + 1], sd[i + 2]]; if (fx) { c = fx(ox + x, oy + y, c); if (!c) continue; } P.set(ox + x, oy + y, c); }
    },
    canvas() { const c = mk(w, h); c.getContext('2d').putImageData(new ImageData(d, w, h), 0, 0); return c; },
  };
  return P;
}

// ---------------------------------------------------------------- 3x5 pixel font (chalk, neon, the TV score)
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', K: '101101110101101', L: '100100100100111', M: '101111101101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011',
  R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110', 8: '111101111101111', '&': '0110010010011010101001101',
  '-': '000000111000000', '!': '010010010000010', ':': '000010000010000', '*': '000101010101000', '?': '110001010000010', '.': '000000000000010',
};
function text(P, x, y, str, col, o = {}) {
  const c = hex2rgb(col), sc = o.scale || 1; let cx = x;
  for (const ch of str) { const g = FONT[ch], gw = g ? g.length / 5 : 3; if (g) for (let j = 0; j < 5; j++) for (let i = 0; i < gw; i++) if (g[j * gw + i] === '1') for (let v = 0; v < sc; v++) for (let u = 0; u < sc; u++) { const X = cx + i * sc + u, Y = y + j * sc + v; if (o.rough && hash(X, Y, o.rough) < 0.07) continue; P.set(X, Y, c); } cx += (ch === ' ' ? 3 : gw + 1) * sc; }
  return cx - x;
}
const textW = (str, sc = 1) => [...str].reduce((a, ch) => a + (ch === ' ' ? 3 : (FONT[ch] ? FONT[ch].length / 5 : 3) + 1) * sc, 0) - sc;

// ---------------------------------------------------------------- palettes
const C = {
  paper: RG(['#0c1a14', '#12241c', '#183026', '#1e3c30', '#26483a', '#305646']),
  oak: RG(['#140a06', '#24120a', '#361c10', '#4a2816', '#5e361e', '#744628', '#8a5834', '#a06c42']),
  maho: RG(['#1a0806', '#2e100a', '#461a10', '#5e2616', '#78341e', '#924428', '#ac5834', '#c8744a', '#e09a6a']),
  brass: RG(['#3a2406', '#6a440e', '#9a6a18', '#c89428', '#e8b840', '#f8d870', '#fff4c0']),
  chrome: RG(['#2a2e3a', '#4a505e', '#7a8090', '#aab0bc', '#d8dce4', '#ffffff']),
  floor: RG(['#120a06', '#1e120a', '#2c1a0e', '#3a2414', '#4a2e1a', '#5a3a22', '#6a462a']),
  chalk: RG(['#141a18', '#1a2220', '#202a26']),
  pitch: RG(['#1a5a24', '#22702c', '#2a8434']),
  mirror: RG(['#1a1e28', '#262c38', '#343c4a', '#48505e', '#5e6676']),
  leather: RG(['#2a0a0a', '#4a1214', '#6a1c1e', '#8a2a28', '#a83e36']),
};
const BOTTLE = [['#1a3a1a', '#2e6a2e', '#5aa05a'], ['#3a1a08', '#7a3a10', '#c07a30'], ['#0e1a3a', '#2a4a8a', '#6a90d0'], ['#3a0a14', '#7a1a2a', '#c04a5a'], ['#3a3a3a', '#8a8a90', '#e0e0e8'], ['#4a3a08', '#a08a20', '#f0d860']].map(RG);

// ---------------------------------------------------------------- the room
function room(P, v) {
  const bellX = 128;
  // wallpaper: deep green with gold-ish damask pips, darker toward the corners
  P.fill(0, 0, PW, 80, C.paper, (x, y) => { const st = (x % 8) === 0 ? -0.18 : 0, dm = ((x + 4) % 8 === 0 && (y + (x >> 3 & 1) * 5) % 10 === 0) ? 0.5 : 0; return clamp(0.55 + st + dm - Math.abs(x - 128) / 420 - y / 420 + (fbm(x / 9, y / 9, 3) - 0.5) * 0.2, 0, 1); });
  for (let x = 0; x < PW; x++) for (let y = 0; y < 80; y++) if ((x + 4) % 8 === 0 && (y + ((x >> 3) & 1) * 5) % 10 === 0) P.set(x, y, hex2rgb('#5a6a3a'));
  // dado rail and panelling below it (shows either side of the bar)
  P.fill(0, 62, PW, 80, C.oak, (x, y) => (y === 62 ? 0.9 : y === 63 ? 0.35 : (x % 22 === 0 || x % 22 === 21) ? 0.2 : 0.45 + (y - 64) * 0.01 + (fbm(x / 4, y, 9) - 0.5) * 0.2));
  // ceiling beam + joists
  P.fill(0, 0, PW, 8, C.oak, (x, y) => (y === 7 ? 0.1 : y === 0 ? 0.25 : 0.5 + (fbm(x / 6, y * 2, 4) - 0.5) * 0.35 - (y > 5 ? 0.15 : 0)));
  for (const jx of [40, 216]) P.fill(jx - 3, 8, jx + 3, 12, C.oak, (x, y) => (x === jx - 3 ? 0.6 : 0.3));
  // ---- back bar: mirror, shelves of bottles, cabinet
  P.fill(60, 26, 196, 80, C.oak, (x, y) => (x < 62 || x > 193 ? 0.62 - (x > 193 ? 0.3 : 0) : 0.28 + (fbm(x / 3, y / 8, 7) - 0.5) * 0.15));
  P.fill(64, 28, 192, 46, C.mirror, (x, y) => clamp(0.35 + ((x - y * 0.6) % 37 < 4 ? 0.45 : 0) + (y - 28) / 60, 0, 1));
  for (const sy of [46, 61]) { P.fill(62, sy, 194, sy + 2, C.oak, (x, y) => (y === sy ? 0.85 : 0.35)); P.fill(62, sy + 2, 194, sy + 3, C.oak, () => 0.05); }
  for (const [sy, seed] of [[46, 1], [61, 2]]) for (let x = 66, i = 0; x < 190; i++) { // bottles standing on each shelf
    const kind = Math.floor(hash(i, seed, 11) * BOTTLE.length), bw = 3 + (hash(i, seed, 12) < 0.4 ? 1 : 0), bh = 8 + Math.floor(hash(i, seed, 13) * 5), col = BOTTLE[kind];
    if (Math.abs(x + bw / 2 - bellX) < 4 && sy === 46) { x += 6; continue; } // gap behind the bell rope
    for (let y = sy - bh; y < sy; y++) for (let k = 0; k < bw; k++) { const neck = y < sy - bh + 3; if (neck && (k === 0 || k === bw - 1) && bw > 2) continue; P.set(x + k, y, col[k === 0 ? 2 : k === bw - 1 ? 0 : 1]); }
    if (bh > 9) for (let k = 0; k < bw; k++) P.set(x + k, sy - 4, hex2rgb(hash(i, seed, 14) < 0.5 ? '#f0e8d0' : '#d0a040')); // label
    x += bw + 1 + Math.floor(hash(i, seed, 15) * 2);
  }
  P.fill(64, 64, 192, 80, C.oak, (x, y) => (y === 64 ? 0.7 : (x - 64) % 16 === 0 ? 0.15 : 0.38 + (fbm(x / 5, y / 3, 8) - 0.5) * 0.2)); // cupboard doors
  // ---- TV showing the football
  { const x0 = 10, y0 = 16, x1 = 56, y1 = 44; P.fill(x0 - 2, y0 - 2, x1 + 2, y1 + 2, RG(['#08080c', '#18181e', '#2a2a32']), (x, y) => (y === y0 - 2 ? 0.9 : 0.3));
    P.fill(x0, y0, x1, y1, C.pitch, (x, y) => (Math.floor((x - x0) / 5) % 2 ? 0.25 : 0.75) + (y - y0) / 120);
    const W2 = RG(['#e8f0e8']); for (let y = y0 + 3; y < y1 - 2; y++) { P.set((x0 + x1) >> 1, y, W2[0]); } for (let x = x0 + 2; x < x1 - 2; x++) { P.set(x, y0 + 3, W2[0]); P.set(x, y1 - 3, W2[0]); } for (let y = y0 + 3; y < y1 - 2; y++) { P.set(x0 + 2, y, W2[0]); P.set(x1 - 3, y, W2[0]); }
    for (let a = 0; a < 24; a++) P.set(((x0 + x1) >> 1) + Math.round(Math.cos(a / 24 * 6.283) * 4), ((y0 + y1) >> 1) + Math.round(Math.sin(a / 24 * 6.283) * 4), W2[0]);
    for (const [px, py, red] of [[18, 26, 1], [24, 33, 1], [30, 28, 1], [38, 35, 0], [44, 26, 0], [36, 30, 0], [27, 38, 1]]) { P.set(px, py, hex2rgb(red ? '#e03a3a' : '#f0f0f8')); P.set(px, py + 1, hex2rgb(red ? '#a02020' : '#3a4aa0')); }
    P.set(33, 31, hex2rgb('#ffffff'));
    P.fill(x0 + 1, y0 + 1, x0 + 22, y0 + 7, RG(['#10102a']), () => 0); text(P, x0 + 2, y0 + 2, 'BAA 2-1', '#f0f0f8');
    P.fill(x0, y0, x0 + 14, y0 + 14, RG(['#ffffff']), (x, y) => (x - x0 + y - y0 < 12 && (x - y) % 5 === 0 && bayer(x, y) < 0.3 ? 0 : null)); // screen glare
    P.fill(31, 44, 35, 50, RG(['#18181e', '#2a2a32']), (x) => (x === 31 ? 1 : 0)); P.glow(33, 30, 30, '#6af06a', 0.2);
  }
  // ---- quiz-night chalkboard
  { const x0 = 206, y0 = 12, x1 = 248, y1 = 56; P.fill(x0 - 2, y0 - 2, x1 + 2, y1 + 2, C.oak, (x, y) => (y === y0 - 2 || x === x0 - 2 ? 0.85 : 0.45));
    P.fill(x0, y0, x1, y1, C.chalk, (x, y) => 0.4 + (fbm(x / 6, y / 6, 21) - 0.5) * 0.8);
    text(P, x0 + 4, y0 + 3, 'QUIZ', '#f4f0e0'); text(P, x0 + 21, y0 + 3, 'NITE', '#f4f0e0');
    for (let x = x0 + 4; x < x1 - 4; x++) if (hash(x, 1, 5) < 0.8) P.set(x, y0 + 10, hex2rgb('#c8c4b4'));
    text(P, x0 + 4, y0 + 14, 'THURS', '#f8d870'); text(P, x0 + 26, y0 + 14, '8PM', '#f8d870');
    text(P, x0 + 4, y0 + 22, 'WIN A', '#f0a0b0'); text(P, x0 + 4, y0 + 29, 'BAR TAB!', '#f0a0b0');
    text(P, x0 + 4, y0 + 36, '*', '#a0d8f0'); text(P, x0 + 32, y0 + 36, '*', '#a0d8f0');
    P.fill(x0, y1 - 1, x1, y1 + 1, RG(['#e8e4d4']), (x) => (x % 5 === 0 ? 0 : null)); // chalk dust on the ledge
  }
  // ---- neon: THE BELL & ANVIL
  { const pink = '#ff6ac8', cy = 13; const L = 'THE BELL', Rt = '& ANVIL', wl = textW(L), wr = textW(Rt);
    for (const [s2, x] of [[L, bellX - 14 - wl], [Rt, bellX + 15]]) { P.glow(x + (s2 === L ? wl : wr) / 2, cy + 2, 22, pink, 0.45, 0.5); text(P, x + 1, cy + 1, s2, '#5a1440'); text(P, x, cy, s2, pink); }
    for (let x = bellX - 14 - wl; x < bellX - 14; x++) if (x % 3 === 0) P.set(x, cy - 2, hex2rgb('#ffd0f0'));
    for (let x = bellX + 15; x < bellX + 15 + wr; x++) if (x % 3 === 0) P.set(x, cy - 2, hex2rgb('#ffd0f0'));
  }
  // wall lamps
  for (const lx of [80, 176]) { P.glow(lx, 22, 26, '#ffb860', 0.45); P.fill(lx - 2, 18, lx + 3, 24, C.brass, (x, y) => 0.4 + (x - lx) * -0.12 + (y === 18 ? 0.3 : 0)); P.fill(lx - 1, 15, lx + 2, 18, RG(['#fff0c0', '#ffffff']), (x) => (x === lx ? 1 : 0)); }
  // ---- bar counter: polished mahogany top, panelled front, brass foot rail
  P.fill(0, 78, PW, 85, C.maho, (x, y) => (y === 78 ? 0.95 : y === 79 ? 0.7 : y === 84 ? 0.15 : 0.45 + (fbm(x / 10, y, 12) - 0.5) * 0.25 + ((x - y * 3) % 41 < 3 ? 0.25 : 0)));
  P.fill(0, 85, PW, 118, C.maho, (x, y) => { const px = (x + 4) % 32, edge = px < 2 || px > 29 || y === 88 || y === 112; return edge ? (px < 2 || y === 88 ? 0.42 : 0.1) : 0.24 + (fbm(x / 3, y / 12, 13) - 0.5) * 0.18 + (y < 92 ? 0.06 : 0); });
  P.fill(0, 108, PW, 111, C.brass, (x, y) => (y === 108 ? 0.95 : y === 109 ? 0.6 : 0.25));
  for (let bx = 14; bx < PW; bx += 48) P.fill(bx, 111, bx + 2, 116, C.brass, (x) => (x === bx ? 0.7 : 0.3));
  // ---- floor: worn boards running away from us
  P.fill(0, 116, PW, PH, C.floor, (x, y) => { const k = (y - 116) / 28, X = (x - 128) / (0.4 + k * 0.9), board = Math.floor((X + 400) / 14), u = ((X + 400) % 14) / 14; return (u < 0.07 ? 0.12 : 0.42 + (hash(board, 1, 31) - 0.5) * 0.25 + (fbm(x / 6, y / 2, 33) - 0.5) * 0.2) + k * 0.25; });
  for (let y = 116; y < 120; y++) for (let x = 0; x < PW; x++) P.blend(x, y, [6, 2, 2], 0.5 - (y - 116) * 0.12);
  // ---- beer taps on the bar
  P.fill(100, 70, 156, 73, C.chrome, (x, y) => (y === 70 ? 0.95 : 0.45 + (x - 100) / 200));
  const HAND = [['#2a0a0a', '#8a1a1a', '#e04a3a'], ['#08203a', '#1a5aa0', '#5aa0e8'], ['#2a1a06', '#9a6a18', '#f8d050'], ['#0a2a10', '#2a7a3a', '#6ad07a']].map(RG);
  [106, 118, 138, 150].forEach((tx, i) => { const Hc = HAND[i]; for (let y = 56; y < 66; y++) for (let k = 0; k < 4; k++) P.set(tx + k, y, Hc[k === 0 ? 2 : k === 3 ? 0 : 1]); for (let k = 0; k < 4; k++) P.set(tx + k, 55, Hc[2]); P.set(tx + 1, 59, hex2rgb('#f0e8d0')); P.set(tx + 2, 59, hex2rgb('#f0e8d0'));
    P.fill(tx + 1, 66, tx + 3, 70, C.chrome, (x) => (x === tx + 1 ? 0.9 : 0.4)); P.fill(tx + 1, 73, tx + 3, 75, C.chrome, (x) => (x === tx + 1 ? 0.7 : 0.3)); });
  P.fill(98, 76, 158, 78, C.chrome, (x, y) => (y === 76 ? 0.8 : 0.3 + ((x & 1) ? 0.1 : 0)));
  // ---- the old brass bell, hanging from an iron bracket on the beam
  P.fill(bellX - 1, 8, bellX + 1, 15, RG(['#2a2834', '#5a5868']), (x) => (x === bellX - 1 ? 1 : 0));
  P.fill(bellX - 8, 7, bellX + 8, 9, RG(['#1a1a22', '#3a3a48', '#6a6a7a']), (x, y) => (y === 7 ? 1 : 0.4));
}

// the bell: modelled + shaded; tilt in radians (a ring swings it), with a rope pull hanging from the clapper
function bellSprite(tilt = 0, glowing = false) {
  const cx = 16, top = 4, rot = (x, y) => { const dx = x - cx, dy = y - top, c = Math.cos(tilt), s = Math.sin(tilt); return [cx + dx * c - dy * s, top + dx * s + dy * c]; };
  const prof = [[-2, 0], [2, 0], [4, 2], [5, 6], [6, 10], [8, 13], [9, 15], [-9, 15], [-8, 13], [-6, 10], [-5, 6], [-4, 2]].map(([x, y]) => rot(cx + x, top + y));
  const mats = { brass: { r: R('#c8922a', 7, { hi: 0.8, lo: 0.3 }), spec: '#fff8d0', specAt: 0.86, lift: glowing ? 0.25 : 0 }, dark: { r: R('#4a300c', 3) }, iron: { r: R('#5a5868', 4) } };
  const [lx, ly] = rot(cx, top + 17.5), [hx, hy] = rot(cx, top - 1.5);
  return render({ w: 32, h: 28, mats, parts: [
    cap(...rot(cx, top - 3), hx, hy, 1.6, 1.6, 'iron', { z: 1 }), poly(prof, 'brass', { bev: 3.2, z: 2 }), ell(...rot(cx, top + 15), 9, 1.6, 'brass', { z: 4, rot: tilt, d: 0.6 }),
    paint(cap(...rot(cx - 7.4, top + 13), ...rot(cx + 7.4, top + 13), 0.6, 0.6, 'dark')), ell(lx, ly, 2, 2, 'dark', { z: 5 }),
  ] });
}

// ---------------------------------------------------------------- the bros (modelled with the battle sprite engine)
// who: 'adam' | 'devon'; pose: 'sit' | 'reach' (Devon up ringing the bell); f: facing (+1 looks right, -1 left); extra: fantasy bits
function bro(who, pose, f, extra = {}) {
  const A = who === 'adam', W = 60, Hh = pose === 'reach' ? 112 : 100, cx = 30, top = pose === 'reach' ? 12 : (A ? 0 : 2); // Adam sits a touch taller
  const mats = {
    skin: { r: R('#f4cca8', 5, { lo: 0.6, hi: 0.45 }), nocrease: true },
    hair: { r: R(A ? '#5a3a22' : '#c25a1a', 5) },
    beard: { r: R(A ? '#5a3a22' : '#c25a1a', 5, { lo: 0.4 }), tex: (x, y) => ((x * 3 + y * 5) % 7 === 0 ? -0.12 : 0) },
    shirt: { r: R(A ? '#b8323a' : '#2c3c72', 5), tex: A ? (x, y) => { const a = (x + 1) % 4 === 0, b = (y + 2) % 4 === 0; return a && b ? -0.6 : a || b ? -0.3 : 0; } : undefined },
    tee: { r: R('#2c2a34', 3) },
    legs: { r: R(A ? '#3e5a92' : '#b8a274', 5), tex: A ? (x, y) => (hash(x, y, 4) < 0.1 ? -0.1 : 0) : undefined },
    shoe: { r: R(A ? '#ecebf2' : '#c8ccd6', 4, { lo: 0.5 }) },
    hat: { r: R(extra.wizard ? '#5a38b0' : '#8e9098', 5) },
    band: { r: R('#e8c050', 4, { hi: 0.7 }) },
    cloak: { r: R('#2a4a8a', 5) },
    glass: { r: R('#d88a20', 5, { hi: 0.7 }), spec: '#fff8e0', specAt: 0.8 },
    foam: { r: R('#f4ecd8', 3, { lo: 0.75 }) },
  };
  const P = [], C2 = (a, b, r1, r2, m, z) => P.push(cap(a[0], a[1], b[0], b[1], r1, r2, m, { z }));
  const y = (v) => v + top, X = (v) => cx + v * f; // local helpers: X mirrors toward the facing side
  const sit = pose === 'sit';
  // legs
  if (sit) {
    for (const s of [-f, f]) { const near = s === f, hip = [cx + s * 3, y(63)], knee = [cx + f * 13 + s * 1.5, y(near ? 67 : 65)], ank = [cx + f * (near ? 11 : 15) + s * 1, y(near ? 88 : 84)];
      C2(hip, knee, 4.6, 4, 'legs', near ? 2 : -1); C2(knee, ank, 3.4, 2.8, A ? 'legs' : 'skin', near ? 2 : -1); P.push(ell(ank[0] + f * 2.5, ank[1] + 2.2, 4.2, 2.3, 'shoe', { z: near ? 3 : -0.5, d: 0.6 })); }
  } else {
    for (const s of [-1, 1]) { const hip = [cx + s * 4.5, y(64)], knee = [cx + s * 5, y(78)], ank = [cx + s * 5.5, y(94)];
      C2(hip, knee, 4.4, 3.8, 'legs', 0); C2(knee, ank, 3.2, 2.7, A ? 'legs' : 'skin', 0); P.push(ell(ank[0] + f * 2, ank[1] + 2.2, 4, 2.3, 'shoe', { z: 1, d: 0.6 })); }
  }
  if (extra.cloak) P.push(poly([[cx - 11, y(36)], [cx + 11, y(36)], [cx + 15, y(sit ? 72 : 84)], [cx - 15, y(sit ? 72 : 84)]], 'cloak', { z: -6, bev: 2.4 }));
  // torso
  P.push(ell(cx, y(52), 11, 14, 'shirt', { z: 3 })); P.push(ell(cx, y(60), 10, 7, 'shirt', { z: 3.5 }));
  if (A) P.push(paint(cap(X(1.5), y(40), X(2.5), y(64), 2.2, 2.6, 'tee')));
  else { P.push(ell(cx - f * 2, y(39), 8, 3.6, 'shirt', { z: 5 })); P.push(paint(ell(cx, y(63), 7, 3.2, 'tee'))); } // hood bunched at the neck, kangaroo pocket
  P.push(ell(cx - 9, y(42), 4.6, 4.4, 'shirt', { z: 4 })); P.push(ell(cx + 9, y(42), 4.6, 4.4, 'shirt', { z: 4 }));
  if (extra.cloak) { P.push(ell(cx - 9, y(40), 5, 3.6, 'cloak', { z: 6 })); P.push(ell(cx + 9, y(40), 5, 3.6, 'cloak', { z: 6 })); P.push(ell(cx, y(39), 2, 2, 'band', { z: 9 })); }
  // arms: one resting back on the bar (behind), one holding the pint (or reaching up for the bell rope)
  const shB = [cx - f * 9, y(42)], shF = [cx + f * 9, y(42)];
  C2(shB, [cx - f * 15, y(52)], 3.2, 3, 'shirt', 1); C2([cx - f * 15, y(52)], [cx - f * 13, y(60)], 3, 2.6, 'shirt', 1); P.push(ell(cx - f * 13, y(61), 2.6, 2.4, 'skin', { z: 2 }));
  let pint = null;
  if (pose === 'reach') { const el = [cx + f * 12, y(26)], ha = [cx + f * 13, y(10)]; C2(shF, el, 3.4, 3, 'shirt', 8); C2(el, ha, 3, 2.6, 'shirt', 8); P.push(ell(ha[0], ha[1] - 1, 2.8, 2.8, 'skin', { z: 9 })); }
  else { const el = [cx + f * 15, y(54)], ha = [cx + f * (A ? 8 : 9), y(A ? 58 : 50)]; C2(shF, el, 3.4, 3.1, 'shirt', 8); C2(el, ha, 3.1, 2.6, 'shirt', 8); P.push(ell(ha[0], ha[1], 2.8, 2.6, 'skin', { z: 11 })); pint = ha; }
  if (pint) { const [px, py] = [pint[0] - f * 1, pint[1] - 6]; P.push(poly([[px - 3.4, py - 6], [px + 3.4, py - 6], [px + 3, py + 6], [px - 3, py + 6]], 'glass', { z: 10, bev: 1.6 })); P.push(ell(px, py - 6.5, 3.6, 1.8, 'foam', { z: 10.5 })); }
  // head
  const hx = cx + f * 1.5, hy = y(26);
  C2([cx, y(38)], [cx, y(32)], 3.4, 3.4, 'skin', 4);
  P.push(ell(hx, hy, 8, 9, 'skin', { z: 6 })); P.push(ell(hx - f * 7.6, hy + 1, 1.8, 2.8, 'skin', { z: 5 }));
  if (A) { // neat short hair, a side parting
    P.push(ell(hx - f * 0.5, hy - 6, 8.6, 5, 'hair', { z: 7 })); P.push(ell(hx - f * 6, hy - 1, 3, 5, 'hair', { z: 6.5 })); P.push(paint(ell(hx + f * 4, hy - 6.5, 4, 2.4, 'hair')));
  } else if (extra.wizard) {
    P.push(ell(hx - f * 6, hy, 3.4, 5.5, 'hair', { z: 6.5 })); P.push(ell(hx + f * 6.5, hy - 1, 2.4, 3.4, 'hair', { z: 6.5 }));
    P.push(poly([[hx - 10, hy - 4], [hx + 10, hy - 4], [hx + f * 8, hy - 28], [hx + f * 12, hy - 30]], 'hat', { z: 9, bev: 2.4 })); P.push(ell(hx, hy - 4, 12, 2.6, 'hat', { z: 10, d: 0.5 })); P.push(paint(cap(hx - 8, hy - 7, hx + 8, hy - 7, 1.2, 1.2, 'band')));
  } else { // grey beanie over a ginger mop
    P.push(ell(hx - f * 6, hy, 3.4, 5.5, 'hair', { z: 6.5 })); P.push(ell(hx + f * 6.5, hy - 1, 2.4, 3.4, 'hair', { z: 6.5 }));
    P.push(ell(hx, hy - 6, 9, 6.4, 'hat', { z: 8 })); P.push(cap(hx - 8.6, hy - 2.6, hx + 8.6, hy - 2.6, 2, 2, 'hat', { z: 9 }));
  }
  // beards: Adam full and well kept; Devon huge and bushy, almost to his chest
  if (A) { P.push(ell(hx + f * 0.6, hy + 5, 8, 5.4, 'beard', { z: 8 })); P.push(ell(hx + f * 1, hy + 9, 5.8, 3.6, 'beard', { z: 8.4 })); P.push(ell(hx - f * 6.4, hy + 1, 2.2, 4, 'beard', { z: 7.6 })); }
  else { P.push(ell(hx + f * 1, hy + 6, 9.5, 7, 'beard', { z: 8 })); P.push(ell(hx + f * 1.5, hy + 13, 8, 7, 'beard', { z: 8.5 })); P.push(ell(hx + f * 1, hy + 19, 5.5, 4.5, 'beard', { z: 8.8 })); P.push(ell(hx - f * 6.6, hy + 1, 2.6, 4.4, 'beard', { z: 7.6 })); }
  const spec = { w: W, h: Hh, mats, parts: P, crease: 1.6, post(a) {
    const e = '#20141c', ex = Math.round(hx + f * 1), ey = Math.round(hy - 1);
    for (const s of [-1, 1]) { const x = ex + s * 3 + (s === f ? 0 : 0); a.px(x, ey, e); a.px(x, ey + 1, e); a.px(x + (f > 0 ? 1 : -1) * 0, ey - 1, a.ramp('skin', 4)); a.px(x - 1, ey - 2, A ? mats.hair.r[1] : mats.hair.r[2]); a.px(x, ey - 2, A ? mats.hair.r[1] : mats.hair.r[2]); a.px(x + 1, ey - 2, A ? mats.hair.r[1] : mats.hair.r[2]); }
    a.px(ex + f * 5, ey + 2, a.ramp('skin', 1)); // nose shadow
    const my = Math.round(hy + 5); for (let k = -2; k <= 2; k++) a.px(Math.round(hx + f * 1.4) + k, my, k === 0 ? '#3a1414' : a.ramp('beard', 1)); a.px(Math.round(hx + f * 1.4), my + 1, '#7a3a34');
    if (A) for (const [gx, gy] of [[hx - f * 6.4, hy - 3], [hx - f * 6, hy - 2], [hx + f * 0, hy + 11], [hx - f * 5.4, hy + 3]]) a.px(Math.round(gx), Math.round(gy), '#b4aca8'); // grey at the temples and chin
    if (!A) { a.px(Math.round(hx - f * 3), Math.round(hy + 2), '#d8946c'); a.px(Math.round(hx + f * 5), Math.round(hy + 2), '#d8946c'); } // freckles
    if (!A && !extra.wizard) a.px(Math.round(cx + f * 4), Math.round(y(48)), '#f4d35e'); // hoodie logo
  } };
  return render(spec);
}

function stool(P, cx, seatY) {
  const L = C.chrome; for (const [dx, sp] of [[-6, -1], [6, 1]]) for (let y = seatY + 3; y < 142; y++) { const x = Math.round(cx + dx + sp * (y - seatY) * 0.12); P.set(x, y, L[3]); P.set(x + 1, y, L[1]); }
  for (let x = cx - 9; x <= cx + 9; x++) { P.set(x, 128, L[4]); P.set(x, 129, L[1]); }
  P.fill(cx - 10, seatY, cx + 11, seatY + 4, C.leather, (x, y) => (y === seatY ? 0.9 : y === seatY + 3 ? 0.1 : 0.55 - (x - cx) * 0.02));
}
function pint(P, x, y) { // a pint standing on the bar
  const G = RG(['#6a3a08', '#a8600e', '#d88a1c', '#f0b440', '#ffe0a0']), F = RG(['#d8ccb0', '#f4ecd8', '#ffffff']);
  for (let j = 0; j < 9; j++) for (let k = 0; k < 5; k++) P.set(x + k, y + j, G[clamp(3 - k + (j > 6 ? -1 : 0), 0, 4)]);
  for (let k = -1; k < 6; k++) { P.set(x + k, y - 1, F[k < 2 ? 2 : 1]); P.set(x + k, y, F[k === 5 ? 0 : 1]); } P.set(x + 1, y + 3, G[4]); P.set(x + 1, y + 4, G[4]);
}

// ---------------------------------------------------------------- scenes
const SCACHE = new Map();
export function pubScene(variant = 'pub') {
  if (SCACHE.has(variant)) return SCACHE.get(variant);
  const v = ['pub', 'ring', 'flash', 'return'].includes(variant) ? variant : 'pub', P = buffer(PW, PH), bellX = 128;
  room(P, v);
  const ring = v === 'ring' || v === 'flash', tilt = ring ? -0.42 : v === 'return' ? 0.12 : 0;
  // bell + rope pull
  const bell = bellSprite(tilt, ring); P.sprite(bell, bellX - 16, 11);
  const ropeTop = [bellX + Math.round(Math.sin(-tilt) * 17), 11 + 4 + Math.round(Math.cos(tilt) * 17)], ropeBot = ring ? [bellX + 12, 60] : [bellX + (v === 'return' ? 2 : 0), 56];
  for (let k = 0, n = 60; k <= n; k++) { const t = k / n, x = Math.round(lerp(ropeTop[0], ropeBot[0], t) + Math.sin(t * Math.PI) * (ring ? 2 : 0)), y = Math.round(lerp(ropeTop[1], ropeBot[1], t)); P.set(x, y, hex2rgb((y & 1) ? '#c8a868' : '#8a6a38')); }
  P.fill(ropeBot[0] - 1, ropeBot[1], ropeBot[0] + 2, ropeBot[1] + 4, RG(['#8a2a2a', '#c84a3a']), (x) => (x === ropeBot[0] - 1 ? 1 : 0)); // tassel
  if (ring || v === 'return') { const n = ring ? 3 : 1; for (let i = 0; i < n; i++) { const r = 14 + i * 4; for (let a = -0.9; a <= 0.9; a += 0.05) { const x = Math.round(bellX + Math.cos(a - 1.57 + (i % 2 ? 3.14 : 0)) * 0 + Math.sin(a) * r * (i % 2 ? -1 : 1)), y = Math.round(26 - Math.cos(a) * r * 0.5 + 6); if (bayer(x, y) < 0.7) P.set(x + (i % 2 ? -10 : 10) * (ring ? 1 : 0.4), y, hex2rgb(ring ? '#fff4c0' : '#e8d8a0')); } }
    if (ring) for (const [x0, y0, x1, y1] of [[106, 18, 100, 16], [107, 24, 100, 24], [106, 30, 100, 32], [150, 18, 156, 16], [149, 24, 156, 24], [150, 30, 156, 32]]) for (let k = 0; k <= 6; k++) P.set(Math.round(lerp(x0, x1, k / 6)), Math.round(lerp(y0, y1, k / 6)), hex2rgb('#ffffff')); }
  if (ring) P.glow(bellX, 26, 36, '#fff0a0', 0.5);
  // pints on the bar, the sword leaning on it in the ending
  pint(P, 64, 69); if (v !== 'ring' && v !== 'flash') pint(P, 186, 69); else pint(P, 172, 69);
  if (v === 'return') { const S = RG(['#4a5060', '#8a90a0', '#d8dce4', '#ffffff']), G = C.brass; for (let k = 0; k < 44; k++) { const x = 46 + Math.round(k * 0.22), y = 74 + k; P.set(x, y, S[2]); P.set(x + 1, y, S[k % 7 === 0 ? 3 : 1]); } for (let k = -4; k <= 4; k++) P.set(46 + k, 75 + Math.round(k * -0.2), G[k < 0 ? 5 : 3]); P.fill(44, 66, 47, 74, RG(['#3a1a0a', '#6a3a1a']), (x) => (x === 44 ? 1 : 0)); P.fill(44, 64, 47, 66, G, () => 0.8);
    P.glow(150, 74, 10, '#9a6aff', 0.35); P.fill(149, 72, 152, 76, RG(['#5a2aa0', '#b07aff', '#f0e0ff']), (x, y) => (x === 149 && y === 72 ? 1 : 0.5)); } // a sword, a glowing gem
  // stools and the bros
  const seat = 103, dv = v === 'ring' || v === 'flash';
  stool(P, 84, seat); stool(P, 172, seat);
  const adam = bro('adam', 'sit', 1, v === 'return' ? { cloak: true } : {}), devon = bro('devon', dv ? 'reach' : 'sit', dv ? -1 : -1, v === 'return' ? { wizard: true } : {});
  const ax = 84 - 30, ay = seat - 64 + 1, dx2 = dv ? 140 - 30 + 0 : 172 - 30, dy2 = dv ? 141 - 112 - 12 + 6 : seat - 64 - 2 + 1;
  const sparkle = (x, y) => { const h = hash(x, y, 77); return h < 0.18 ? hex2rgb(h < 0.06 ? '#ffffff' : '#fff2a0') : null; };
  const dissolve = v === 'flash' ? (x, y, c) => { const k = clamp((y - 40) / 90, 0, 1), cut = 0.25 + k * 0.6; return bayer(x, y) * 0.6 + hash(x, y, 3) * 0.4 < cut ? [lerp(c[0], 255, 0.6), lerp(c[1], 245, 0.6), lerp(c[2], 200, 0.6)] : sparkle(x, y); } : null;
  P.sprite(adam, ax, ay, dissolve); P.sprite(devon, dx2, dy2, dissolve);
  if (v === 'flash') { // golden-white light pours out of the bell and washes the room
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const d = Math.hypot((x - bellX) / 1.4, y - 26) / 170, a = clamp(0.92 - d * 0.75, 0.35, 0.92); P.blend(x, y, [255, 246, 214], a * (0.85 + bayer(x, y) * 0.15)); }
    for (let i = 0; i < 160; i++) { const x = Math.round(hash(i, 1, 41) * PW), y = Math.round(hash(i, 2, 41) * PH), big = hash(i, 3, 41) < 0.2; P.set(x, y, [255, 255, 255]); if (big) { P.set(x - 1, y, [255, 240, 170]); P.set(x + 1, y, [255, 240, 170]); P.set(x, y - 1, [255, 240, 170]); P.set(x, y + 1, [255, 240, 170]); } }
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; for (let r = 18; r < 120; r += 1) if (hash(k, r, 9) < 0.5) P.blend(Math.round(bellX + Math.cos(a) * r * 1.4), Math.round(26 + Math.sin(a) * r), [255, 255, 255], 0.5); }
  }
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const d = Math.max(0, Math.hypot((x / PW - 0.5) * 2 * 0.9, (y / PH - 0.5) * 2) - 0.8); if (d > 0 && bayer(x, y) < d * 1.6) P.blend(x, y, [8, 4, 12], 0.4); } // vignette
  const c = P.canvas(); SCACHE.set(variant, c); return c;
}
const UCACHE = new Map();
export function pubURL(variant = 'pub', scale = 1) {
  const k = variant + ':' + scale; if (UCACHE.has(k)) return UCACHE.get(k);
  const src = pubScene(variant), c = mk(src.width * scale, src.height * scale), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, c.width, c.height);
  const u = c.toDataURL(); UCACHE.set(k, u); return u;
}
