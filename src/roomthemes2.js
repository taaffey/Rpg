// ===== Themed interiors, part 2: stones (the Standing Stones clearing) and bogshed (stilt shed over the bog) =====
import { pk, ramp, PAL, Pix, cl, mix, dk, hash, vnoise, fbm, pick, blob, outline, once, glowItem, GR, box, ell, line, spr, win, FR, text, frameAt, PL } from './roomkit.js';

// ---------------------------------------------------------------------------------------------------------- STONES
const GRS = ramp('#0a1c14 #102a1c #183a24 #224a2c #2e5e36 #3c7240 #4e8a4a #66a456');
const DIRT = ramp('#241a10 #36281a #4a3824 #5e4a30 #745e3c');
const SG = ramp('#1c2224 #2c3436 #425052 #5a6a6a #748484 #8e9e98 #a8b8ae #c4d0c2');
const MS = ramp('#10281a #1a3c22 #285a2c #3a7a38 #52963c #78b450');
const GLOW = ramp('#0c3a30 #145a48 #1e7a60 #34a07c #5cd0a0 #98f4cc');
const BRK = ramp('#0a2a14 #14401c #1e5a26 #2c7a30 #429a38 #62b848');

function drawStone(set, ox, oy, w, h, seed, rune) { // a moss-grey monolith: ox = left, oy = top, base at oy + h - 1
  const cx = ox + w / 2, lean = (hash(1, seed, 41) - 0.5) * 3;
  for (let j = 0; j < h; j++) {
    const t = j / (h - 1), capk = Math.min(1, (j + 1.5) / (w * 0.5));
    let hw = (w / 2) * (0.78 + 0.22 * t) * Math.sqrt(1 - (1 - capk) * (1 - capk));
    hw += (vnoise(j * 1.7, seed * 3, 4, seed) - 0.5) * 1.5 - (j < 3 ? 0.4 : 0);
    const c0 = cx + lean * (1 - t), Y = oy + j;
    for (let x = Math.floor(c0 - hw); x < c0 + hw; x++) {
      const uu = (x + 0.5 - c0) / hw;
      let s = 0.58 - uu * 0.3 + (vnoise(x * 0.9, Y * 0.35, 5, seed + 2) - 0.5) * 0.36;
      if (vnoise(x * 1.4, Y * 0.18, 3, seed + 7) < 0.1) s -= 0.25;
      if (uu > 0.78) s -= 0.2; else if (uu < -0.8) s += 0.1; if (j < 2) s += 0.2; if (j > h - 3) s -= 0.2;
      if (Math.abs(uu) > 0.93) s = 0.1;
      let c = pick(SG, cl(s), x, Y);
      const mv = fbm(x, Y, seed + 5);
      if ((j < h * 0.3 && mv > 0.5 - (0.3 - j / h) * 1.2) || (j > h * 0.78 && mv > 0.4) || mv > 0.82) c = pick(MS, cl(0.45 + (mv - 0.5) * 1.1 - uu * 0.15), x, Y);
      if (hash(x, Y, seed + 9) < 0.022) c = pk('#b8c49a');
      set(x, Y, c);
    }
  }
  if (rune) { const rx = Math.round(cx - 2 + lean * 0.4), ry = oy + Math.floor(h * 0.34); for (const [i, j] of [[1, 0], [1, 1], [0, 2], [1, 2], [2, 2], [1, 3], [1, 4], [2, 5], [0, 5]]) set(rx + i, ry + j, pick(GLOW, 0.75 + (j === 2 ? 0.2 : 0), i, j)); }
}
function stonesFloor(x, y) {
  const n = fbm(x, y, 3);
  let s = 0.4 + (n - 0.5) * 0.45 + (vnoise(x, y, 3, 8) - 0.5) * 0.1;
  const bl = hash(x >> 1, y >> 2, 5); if (bl < 0.1 && (y & 3) < 2) s += 0.2; else if (bl > 0.93) s -= 0.1;
  let c = pick(GRS, cl(s), x, y);
  const pd = Math.abs(x - 88) - (7 + (vnoise(y, 3, 6, 4) - 0.5) * 4); // the trodden path from the gap up to the altar
  if (y > 96 && pd < 0) c = pick(DIRT, cl(0.5 + (vnoise(x, y, 3, 6) - 0.5) * 0.4 - (y - 96) * 0.002), x, y); else if (y > 96 && pd < 2 && hash(x, y, 5) < 0.5) c = pick(DIRT, 0.3, x, y);
  const d = Math.hypot((x - 88) / 15, (y - 88) / 12); // flagged ring round the altar
  if (d < 1.15) { const fl = vor0(x, y); c = d > 1 ? pick(SG, 0.2, x, y) : pick(SG, cl(0.3 + fl.s * 0.3 + (hash(x, y, 1) - 0.5) * 0.08), x, y); if (fl.edge) c = pick(MS, 0.3, x, y); }
  const mm = vnoise(x, y, 15, 17); if (mm > 0.86 && d > 1.15) c = pick(GLOW, cl(0.25 + (mm - 0.86) * 3 + (hash(x, y, 3) - 0.5) * 0.2), x, y); // glowing moss pools
  if (hash(x, y, 11) < 0.004) c = pk(['#f4f4f0', '#f8e070', '#f0a8c8'][(((x + y) % 3) + 3) % 3]);
  return c;
}
const vor0 = (x, y) => { const u = ((x + 3) % 7 + 7) % 7, v = ((y + 2 * ((x + 3) / 7 | 0)) % 6 + 6) % 6; return { edge: u === 0 || v === 0, s: hash((x + 3) / 7 | 0, y / 6 | 0, 3) }; };

const stonePlan = (() => { // standing stones: [centre x, base y, width, height, seed]
  const out = [];
  for (let i = 0, x = 6; x < 176; i++) { const w = 12 + Math.floor(hash(i, 1, 70) * 6), h = 28 + Math.floor(hash(i, 2, 70) * 14); out.push([x + w / 2, 15 + Math.floor(hash(i, 3, 70) * 3), w, h, 100 + i]); x += w + 2 + Math.floor(hash(i, 4, 70) * 3); }
  for (const sx of [8, 169]) for (let i = 0, y = 26; y < 124; i++) { const w = 12 + Math.floor(hash(i, sx, 71) * 4), h = 16 + Math.floor(hash(i, sx + 1, 71) * 10); out.push([sx, y + h * 0.5 + 8, w, h, 200 + i + (sx > 100 ? 40 : 0)]); y += 16 + Math.floor(hash(i, sx + 2, 71) * 6); }
  for (let i = 0, x = 4; x < 176; i++) { const w = 12 + Math.floor(hash(i, 5, 72) * 6), h = 11 + Math.floor(hash(i, 6, 72) * 5); if (x + w / 2 < 74 || x - w / 2 > 102) out.push([x + w / 2, 127, w, h, 300 + i]); x += w + 1 + Math.floor(hash(i, 7, 72) * 3); }
  return out.sort((a, b) => a[1] - b[1]);
})();
const MOSSPOTS = [[24, 20], [60, 13], [112, 14], [150, 18], [10, 56], [168, 48], [8, 100], [170, 96], [40, 122], [140, 123], [88, 88], [66, 60], [118, 70], [30, 80]];

const stones = {
  open: true, mg: 10, noAO: true, fade: [40, 90, 0.92], light: { base: 0.78, vk: 0.14, min: 0.36, tint: [-0.1, 0.03, 0.14] },
  floor: (x, y) => stonesFloor(x, y),
  pre(u) {
    for (const [cx, by, w, h] of stonePlan) for (let y = by - 3; y <= by + 3; y++) for (let x = Math.floor(cx - w / 2 - 1); x <= cx + w / 2 + 4; x++) if (((x - cx - 2) / (w / 2 + 3)) ** 2 + ((y - by) / 3) ** 2 <= 1) u.D(x, y, 0.62);
    const set = (x, y, c) => u.S(x, y, c);
    for (const [cx, by, w, h, seed] of stonePlan) { drawStone(set, Math.round(cx - w / 2), by - h + 1, w, h, seed, hash(seed, 1, 9) < 0.35); }
    // bracken and brambles knit the gaps so the ring reads as a barrier
    const q = { set };
    for (let i = 0; i < 70; i++) { const side = Math.floor(hash(i, 1, 80) * 4), a = hash(i, 2, 80); let x, y; if (side === 0) { x = 4 + a * 168; y = 12; } else if (side === 1) { x = 4 + a * 168; y = 122; if (x > 74 && x < 102) continue; } else if (side === 2) { x = 6; y = 20 + a * 100; } else { x = 170; y = 20 + a * 100; }
      blob(q, x, y, 3.4 + hash(i, 3, 80) * 2, BRK, { sq: 0.75, seed: i, amb: 0.2 }); }
    for (const [mx, my] of MOSSPOTS) { u.anim.push({ k: 'moss', x: mx, y: my }); for (const [dx, dy, v] of [[0, 0, 0.9], [-1, 0, 0.6], [1, 0, 0.7], [0, 1, 0.5], [0, -1, 0.5], [2, 1, 0.4], [-2, 1, 0.4]]) set(mx + dx, my + dy, pick(GLOW, v, dx, dy)); u.lights.push([mx, my, 0.1, 18]); }
  },
  shadow: (k) => (k === 'menhir' ? [8, 3, 14] : k === 'sheep' ? [6, 2, 14] : k === 'mossrock' ? [8, 3, 14] : undefined),
  spr: {
    menhir: (t, m, x, y) => spr('st-menhir' + (x * 3 + y), 18, 38, (p) => drawStone((a, b, c) => p.set(a, b, c), 2, 2, 14, 34, 400 + x * 7 + y, true), 0.35),
    mossrock: () => spr('st-mossrock', 18, 18, (p) => {
      ell(p, 9, 10.5, 7.6, 5.6, (x, y, uu, v) => { const mv = fbm(x, y, 3); if (mv > 0.45 + v * 0.2 + 0.1) return pick(MS, cl(0.5 + (mv - 0.5) * 1.2 - uu * 0.2), x, y); return pick(SG, cl(0.55 - uu * 0.3 - v * 0.15 + (hash(x, y, 2) - 0.5) * 0.15), x, y); });
      for (const [a, b] of [[5, 6], [9, 4], [13, 7], [7, 9], [11, 10], [4, 11]]) { p.set(a, b, pick(GLOW, 0.85, a, b)); p.set(a + 1, b, pick(GLOW, 0.55, a, b)); }
    }),
    altar: () => spr('st-altar', 22, 20, (p) => { // a flat altar slab on two stumps, a sun glyph carved in the top
      for (const sx of [3, 15]) for (let j = 11; j < 17; j++) for (let i = 0; i < 5; i++) p.set(sx + i, j, pick(SG, cl(0.55 - i * 0.1 - (j === 16 ? 0.25 : 0)), i, j));
      for (let j = 4; j < 13; j++) for (let i = 0; i < 20; i++) { const top = j < 9, edge = j === 4 || i === 0; let s = top ? 0.7 - (j - 4) * 0.02 + (vnoise(i, j, 4, 5) - 0.5) * 0.16 : 0.34 + (vnoise(i, j, 3, 6) - 0.5) * 0.1; if (edge && top) s = 0.9; if (j === 9) s = 0.88; if (j === 12) s = 0.14; if (i === 19) s -= 0.12; p.set(1 + i, j, pick(SG, cl(s), i, j)); }
      for (let i = 2; i < 19; i++) if (hash(i, 4, 3) < 0.6) p.set(i, 5, pick(MS, 0.55, i, 5));
      ell(p, 11, 6.8, 3.6, 1.8, (x, y) => ((x + y) & 1 ? pick(GLOW, 0.9, x, y) : pick(GLOW, 0.55, x, y)));
      for (let a = 0; a < 8; a++) p.set(Math.round(11 + Math.cos(a * 0.785) * 5.2), Math.round(6.8 + Math.sin(a * 0.785) * 2.5), pick(GLOW, 0.95, a, 0));
      ell(p, 17, 6, 1.8, 1.2, (x, y, uu) => pick(PAL.red, cl(0.7 - uu * 0.3), x, y)); p.set(17, 4, pk('#3a8a3a')); // an apple left as an offering
    }),
    sheep: (t, m, x, y) => spr(`st-sheep${frameAt(t, 0.5, 2, x * 0.37 + y * 0.13)}`, 18, 16, (p) => {
      const g = frameAt(t, 0.5, 2, x * 0.37 + y * 0.13); const W = ramp('#8a8a98 #aeaeba #cfcfd8 #ecece8 #ffffff');
      for (const lx of [4, 7, 11, 14]) for (let j = 11; j < 14; j++) p.set(lx, j, pk(j === 13 ? '#14141a' : '#2a2a32'));
      for (const [bx, by, r] of [[6, 8, 4.2], [11, 8, 4.4], [8.5, 6.5, 4.4], [13, 6.8, 3.2], [5, 6, 3.2], [9, 9.5, 3.6]]) blob(p, bx, by, r, W, { sq: 0.85, seed: bx, amb: 0.3, jit: 0.06 });
      const hy = g ? 10 : 7; ell(p, 15.2, hy, 2.2, 2.4, (px, py, uu, v) => pick(ramp('#14141a #2a2a34 #44444e #5c5c68'), cl(0.6 - uu * 0.3), px, py)); p.set(15, hy - 1, pk('#e8e8f0')); p.set(16, hy - 1, pk('#101018')); p.set(14, hy - 3, pk('#2a2a34')); p.set(17, hy - 3, pk('#2a2a34'));
    }),
    hamper: () => spr('st-hamper', 18, 18, (p) => {
      const WK = ramp('#3a2410 #5a3a1a #7a5228 #9a6c38 #b8884a #d4a460');
      for (let j = 8; j < 15; j++) for (let i = 2; i < 16; i++) { const w = ((i >> 1) + (j >> 1)) & 1; p.set(i, j, pick(WK, cl((w ? 0.55 : 0.4) - (j - 8) * 0.03 + (i === 2 ? 0.2 : 0) - (i === 15 ? 0.18 : 0)), i, j)); }
      for (let i = 2; i < 16; i++) p.set(i, 8, pick(WK, 0.9, i, 8)); for (let i = 2; i < 16; i++) p.set(i, 14, pick(WK, 0.1, i, 14));
      for (let j = 5; j < 9; j++) for (let i = 3; i < 15; i++) p.set(i, j, pk(((i >> 1) + (j >> 1)) & 1 ? '#d83a3a' : '#f4f0e8'));
      ell(p, 6, 4, 2.2, 1.6, (x, y, uu) => pick(ramp('#6a3a10 #a05a1c #d08a30 #f0b858'), cl(0.6 - uu * 0.3), x, y)); ell(p, 11, 4.4, 1.8, 1.8, (x, y, uu) => pick(PAL.red, cl(0.7 - uu * 0.3), x, y));
      for (let j = 0; j < 5; j++) { p.set(13, 1 + j, pk(j < 2 ? '#2a6a3a' : '#1e4a2a')); p.set(14, 2 + j, pk('#1e4a2a')); } // a bottle
      line(p, 4, 8, 9, 2, pick(WK, 0.7, 0, 0)); line(p, 14, 8, 9, 2, pick(WK, 0.45, 0, 0));
    }),
  },
  over(m, t, out, s) {
    for (const a of s.anim) if (a.k === 'moss') out.push(glowItem('90,255,190', a.x / 16, a.y / 16, 1.1, 0.26 + Math.sin(t * 1.6 + a.x * 0.3 + a.y) * 0.12, 0));
    out.push({ x: 0, y: 0, w: 1, h: 1, z: 2, draw: (ctx, X, Y, TS) => { const q = TS / 16; for (let i = 0; i < 16; i++) { const px = 1 + hash(i, 1, 60) * 9 + Math.sin(t * 0.5 + i * 2.1) * 0.8, py = 1 + hash(i, 2, 60) * 6 + Math.cos(t * 0.4 + i * 1.3) * 0.6, a = 0.5 + 0.5 * Math.sin(t * 2.4 + i * 4); ctx.fillStyle = `rgba(220,255,150,${(a * 0.9).toFixed(2)})`; ctx.fillRect(Math.round(X + px * TS), Math.round(Y + py * TS), q, q); ctx.fillStyle = `rgba(200,255,120,${(a * 0.25).toFixed(2)})`; ctx.fillRect(Math.round(X + px * TS - q), Math.round(Y + py * TS - q), q * 3, q * 3); } } });
  },
};

// ---------------------------------------------------------------------------------------------------------- BOG SHED
const PLK = ramp('#0c1008 #181c0e #262c16 #363e20 #485228 #5c6a32 #72823e #8a9a50');
const SW = ramp('#06140c #0c2416 #143a20 #1e5230 #2c7040 #44904c #78b858');
const RUST = ramp('#2a0e06 #4a1a0a #6e2c10 #8e4018 #b05a22 #cc7a34');
const HOLES = [[26, 34, 30, 12], [106, 38, 22, 10], [48, 66, 16, 12], [108, 80, 32, 11], [20, 88, 22, 10], [72, 96, 28, 10], [136, 22, 16, 10]];
function holeAt(x, y) {
  for (const [hx, hy, hw, hh] of HOLES) { const j = hash(y, hx, 3) * 1.5; if (x >= hx + j && x < hx + hw - hash(y, hy, 4) * 1.5 && y >= hy && y < hy + hh) return Math.min(x - hx, hx + hw - x, y - hy, hy + hh - y); }
  return -1;
}
const SWT = ramp('#04141a #082a30 #0e4448 #186062 #268080 #44a89c #8cd8c0');
function waterPx(x, y) {
  const rip = Math.sin(x * 0.6 + y * 1.4 + vnoise(x, y, 6, 5) * 5), n = vnoise(x, y, 4, 9);
  let s = 0.36 + (n - 0.5) * 0.3 + (rip > 0.84 ? 0.34 : 0);
  if (vnoise(x, y, 3, 14) > 0.84) return pick(PAL.leaf, cl(0.45 + (n - 0.5) * 0.5), x, y); // a little duckweed
  return pick(SWT, cl(s), x, y);
}
function bogFloor(x, y) {
  const d = holeAt(x, y); if (d >= 0) return d === 0 ? pick(PLK, 0.05, x, y) : d === 1 ? pick(SWT, 0.06, x, y) : waterPx(x, y);
  const yy = y + Math.round(Math.sin(x * 0.045 + Math.floor(y / 5) * 1.3) * 1.2), row = Math.floor(yy / 5), v = ((yy % 5) + 5) % 5, L = 30 + Math.floor(hash(row, 1, 21) * 3) * 7, off = Math.floor(hash(row, 0, 21) * 40), xx = x + off, seg = Math.floor(xx / L), uu = ((xx % L) + L) % L;
  if (v === 4) return pick(SW, 0.12 + hash(x, y, 4) * 0.12, x, y); // gap between boards: dark water below
  let s = 0.48 + (hash(row, seg, 23) - 0.5) * 0.3 + (vnoise(x, yy * 5, 9, 24) - 0.5) * 0.2;
  if (v === 0) s += 0.12; if (v === 3) s -= 0.12; if (uu === 0) return pick(SW, 0.14, x, y); if (uu === 1) s += 0.08;
  if ((uu === 3 || uu === L - 3) && v === 1) s = 0.18; if (hash(row, seg, 27) < 0.12 && Math.abs(uu - L / 2) < 1.5 && v === 2) s -= 0.2;
  let c = pick(PLK, cl(s, 0.04, 0.95), x, y);
  const sl = fbm(x, y, 31); if (sl > 0.62) c = mix(c, pk('#3c7a30'), cl((sl - 0.62) * 3) * 0.6); // slime
  for (const [hx, hy, hw, hh] of HOLES) if (x > hx - 3 && x < hx + hw + 3 && y > hy - 3 && y < hy + hh + 3) c = dk(c, 0.82);
  return c;
}
function bogFace(x, f) {
  const bw = 7, off = Math.floor(hash(1, 1, 33) * 4), b = Math.floor((x + off) / bw), uu = (((x + off) % bw) + bw) % bw, top = Math.floor(hash(b, 2, 33) * 5);
  if (f <= 2) return pick(PAL.bark, [0.18, 0.5, 0.3][f], x, f); // the cross-beam under the roof
  if (f >= 29) return pick(PAL.bark, f === 29 ? 0.5 : 0.12, x, f);
  if (f < 3 + top) return pick(SW, 0.08 + hash(x, f, 3) * 0.06, x, f); // a short board: a dark gap above it
  if (uu === 0) return pick(PLK, 0.06, x, f);
  let s = 0.5 + (hash(b, 4, 33) - 0.5) * 0.3 + (vnoise(x * 0.6, f * 0.25, 4, 5 + b) - 0.5) * 0.3 - (uu === bw - 1 ? 0.15 : 0) + (uu === 1 ? 0.1 : 0);
  if (hash(b, 5, 33) < 0.2 && Math.abs(f - (8 + hash(b, 6, 33) * 14)) < 1.6 && uu > 1 && uu < bw - 2) s -= 0.25; // knots
  if ((f === 9 || f === 20) && uu === 3) s = 0.9; // nails
  let c = pick(PLK, cl(s, 0.04, 0.95), x, f);
  const damp = cl((f - 14) / 14), g = vnoise(x * 0.7, f, 5, 11); // rising damp, green algae near the waterline
  c = mix(c, pk('#1a3a22'), damp * 0.5); if (f > 20 && g > 0.55) c = mix(c, pk('#3c7a30'), (g - 0.55) * 1.4 * damp);
  if (f > 16 && vnoise(x * 1.3, f * 0.1, 3, 17) > 0.8) c = dk(c, 0.7);
  return c;
}
const bog = {
  mg: 4, light: { base: 0.72, vk: 0.38, min: 0.32, tint: [0.1, 0.07, -0.14] }, spill: '#a8d890', thr: PLK, doorOut: pk('#10241a'), out: (x, y) => pk('#050a07'),
  floor: (x, y) => bogFloor(x, y), face: (x, f) => bogFace(x, f),
  cap: (x, y, d, outer, jamb) => { let s = 0.5 + (vnoise(x, y, 4, 31) - 0.5) * 0.2; if (d <= 1) s = 0.82; else if (d === 2) s = 0.6; if (outer === 0) s = 0.1; else if (outer === 1) s -= 0.15; if (jamb) s = 0.2; return pick(PAL.bark, cl(s), x, y); },
  feat: () => [['rosettes', 2.5], ['win', 5.1], ['lantern', 7.7]],
  pre(u) { for (const [hx, hy, hw, hh] of HOLES) u.anim.push({ k: 'hole', x: hx + hw / 2, y: hy + hh / 2, w: hw, h: hh }); },
  fit: {
    rosettes(u, cx) { // a plaque of trophy rosettes, mostly for fourth place
      FR(u, cx - 15, 5, 30, 12, (i, j) => (i === 0 || j === 0 || i === 29 || j === 11) ? pick(PAL.bark, 0.2, i, j) : pick(PLK, cl(0.5 + (vnoise(i, j * 4, 3, 5) - 0.5) * 0.2 - (i === 1 || j === 1 ? -0.1 : 0)), i, j));
      const set = (x, y, c) => u.S(x, u.wy(y), c);
      [[cx - 9, '#2a5ac8', '#6a9af0'], [cx, '#d02828', '#f06a5a'], [cx + 9, '#e8c030', '#fff088']].forEach(([x, a, b], k) => {
        const ra = pk(a), rb = pk(b); ell({ set }, x, 9.5, 4.2, 4.2, (px, py, uu, v) => { const r = Math.hypot(uu, v); return r > 0.78 ? ((px + py) & 1 ? ra : dk(ra, 0.7)) : r < 0.35 ? pk('#f8f4e0') : mix(ra, rb, cl(0.5 - uu * 0.3 - v * 0.3)); });
        for (let j = 0; j < 4; j++) { set(x - 2, 13 + j, ra); set(x - 1, 13 + j, dk(ra, 0.7)); set(x + 1, 13 + j, rb); set(x + 2, 13 + j, ra); } });
    },
    win(u, cx) { // a cracked pane onto the bog: mist, reeds and a will-o-wisp
      win(u, cx, 10, 4, 17, PLK, (gx, gy, gw, gh) => {
        let c = mix(pk('#7aa088'), pk('#b8d0a8'), gy / gh); if (gx > 6 && gy > gh * 0.55 && (gx * 7) % 5 < 2) c = pk('#1a3020'); if ((gx === 3 || gx === 12 || gx === 14) && gy > gh * 0.4) c = pk('#243a22');
        if (Math.abs(gx - gy * 0.8 - 2) < 0.6 && gy < 7) c = pk('#e8f0e0'); if (gx === 4 && gy === 4) c = pk('#e8ffb0'); return c; }, { mx: 1 });
      u.lights.push([cx, 4, 0.2, 36]);
    },
    lantern(u, cx) { // a rusty hurricane lantern on a hook
      const set = (x, y, c) => u.S(x, u.wy(y), c);
      for (let j = 3; j < 7; j++) set(cx, j, pick(RUST, 0.45, 0, j)); for (let i = -2; i <= 2; i++) set(cx + i, 7, pick(RUST, 0.6 - Math.abs(i) * 0.1, i, 7));
      for (let j = 8; j < 16; j++) for (let i = -3; i <= 3; i++) { const edge = i === -3 || i === 3 || j === 8; set(cx + i, j, edge ? pick(RUST, i < 0 ? 0.7 : 0.35, i, j) : mix(pk('#f4c860'), pk('#c46a1e'), (j - 8) / 8)); }
      for (let i = -3; i <= 3; i++) set(cx + i, 16, pick(RUST, 0.3, i, 16)); set(cx, 11, pk('#fff8c8')); set(cx, 12, pk('#ffd868')); set(cx - 3, 12, pick(RUST, 0.8, 0, 0));
      u.anim.push({ k: 'glow', x: cx, y: u.wy(12), r: 2.4, a: 0.5 }); u.lights.push([cx, -2, 0.55, 46]);
    },
  },
  shadow: (k) => (k === 'hammock' ? [7, 3, 14] : undefined),
  spr: {
    hammock: () => spr('bog-hammock', 18, 28, (p) => {
      for (const px of [1, 15]) for (let j = 3; j < 25; j++) { p.set(px, j, pick(PLK, 0.65, px, j)); p.set(px + 1, j, pick(PLK, 0.3, px, j)); }
      ell(p, 9, 15, 7, 8.5, (x, y, uu, v) => { const r = Math.hypot(uu, v); if (r > 0.82) return pick(ramp('#4a3a20 #6a5430 #8a7242 #a8905a'), cl(0.55 - uu * 0.3), x, y); const st = ((y >> 2) & 1) ? 0.62 : 0.5; return pick(ramp('#4a5a3a #6a7a50 #8a9a68 #aab88a'), cl(st - uu * 0.12 - v * 0.08 + (hash(x, y, 2) - 0.5) * 0.08), x, y); });
      for (let i = 4; i < 14; i++) p.set(i, 15, pk('#c8a040')); ell(p, 9, 9, 3.5, 2, (x, y, uu) => pick(ramp('#7a8070 #a0a898 #c4c8b8 #e2e4d8'), cl(0.65 - uu * 0.3), x, y));
      line(p, 2, 6, 6, 9, pk('#a89060')); line(p, 16, 6, 12, 9, pk('#a89060')); line(p, 2, 24, 6, 21, pk('#a89060')); line(p, 16, 24, 12, 21, pk('#a89060'));
    }),
    pegs: () => spr('bog-pegs', 18, 34, (p) => {
      box(p, 1, 2, 16, 29, PLK, { s: 0.5, tex: (i, j) => ((i % 5 === 0) ? -0.12 : 0) });
      for (const py of [7, 15, 23]) { for (let i = 3; i < 15; i += 4) { p.set(i, py, pick(PAL.bark, 0.8, i, py)); p.set(i, py + 1, pick(PAL.bark, 0.3, i, py)); } }
      for (let j = 8; j < 17; j++) { p.set(3, j, pk('#e8c020')); p.set(4, j, pk('#a88a10')); } for (let j = 17; j < 19; j++) p.set(3, j, pk('#101010')); // snorkel
      for (const [fx, c] of [[7, '#2a6ae0'], [11, '#e8e028']]) for (let j = 8; j < 19; j++) { const w = j < 11 ? 2 : 3 + (j > 15 ? 1 : 0); for (let i = 0; i < w; i++) p.set(fx + i, j, i === 0 ? pk(c) : dk(pk(c), 0.65)); }
      ell(p, 13, 25, 3.4, 3, (x, y, uu, v) => (Math.hypot(uu, v) > 0.7 ? pk('#101418') : mix(pk('#7ac0d0'), pk('#cfeaf0'), cl(0.5 + uu * 0.3)))); for (let i = 3; i < 10; i++) p.set(i, 25, pk('#20242a')); // mask and strap
      p.set(5, 6, pk('#c04030')); p.set(10, 6, pk('#4090c0'));
    }),
    trophy: () => spr('bog-trophy', 18, 34, (p) => {
      box(p, 1, 2, 16, 29, PLK, { s: 0.44 });
      for (const by of [11, 21, 30]) for (let i = 2; i < 16; i++) { p.set(i, by, pick(PLK, 0.8, i, by)); p.set(i, by + 1, pick(PLK, 0.2, i, by)); }
      for (let j = 6; j < 11; j++) { p.set(4, j, pk('#e8c030')); p.set(5, j, pk('#a88820')); p.set(3, 7, pk('#e8c030')); p.set(6, 7, pk('#a88820')); } for (let i = 3; i < 8; i++) p.set(i, 11 - 1, pk('#f8d858')); // little cup
      ell(p, 12, 7.5, 2.8, 2.8, (x, y, uu, v) => (((x + y) & 1) ? pk('#d02828') : pk('#f06a5a'))); p.set(12, 8, pk('#f8f4e0')); for (let j = 10; j < 12; j++) p.set(11, j, pk('#d02828'));
      for (let j = 16; j < 21; j++) for (let i = 3; i < 9; i++) p.set(i, j, i < 4 || j === 16 ? pk('#4a2a10') : pk('#6a3a18')); for (let j = 14; j < 16; j++) for (let i = 4; i < 7; i++) p.set(i, j, pk('#4a2a10')); // the muddy boot
      ell(p, 13, 18, 2.8, 2.8, (x, y, uu) => pick(PAL.green, cl(0.6 - uu * 0.2), x, y)); p.set(13, 18, pk('#f8f4e0')); for (let j = 21; j < 22; j++) p.set(12, j, pk('#2a7a3a'));
      for (let i = 3; i < 15; i += 3) { p.set(i, 26, pk('#e8e0c8')); p.set(i, 27, pk('#e8e0c8')); p.set(i, 28, pk('#c8c0a0')); }
    }),
    crate: (t) => spr('bog-crate' + (Math.floor(t * 6) % 2), 18, 22, (p) => {
      box(p, 1, 9, 16, 11, PLK, { s: 0.5, tex: (i, j) => (j === 5 ? -0.2 : 0) }); for (let i = 1; i < 17; i++) p.set(i, 9, pick(PLK, 0.88, i, 9));
      for (const sx of [2, 14]) for (let j = 10; j < 20; j++) p.set(sx, j, pick(PAL.iron, 0.4, sx, j));
      for (let j = 3; j < 9; j++) for (let i = 10; i < 15; i++) { const edge = i === 10 || i === 14 || j === 3 || j === 8; p.set(i, j, edge ? pick(RUST, i < 12 ? 0.7 : 0.35, i, j) : mix(pk('#f4c860'), pk('#c46a1e'), (j - 3) / 5)); } p.set(12, 5, pk('#fff8c8'));
      for (let j = 1; j < 3; j++) p.set(12, j, pick(RUST, 0.5, 0, j));
      for (let j = 6; j < 9; j++) for (let i = 3; i < 6; i++) p.set(i, j, pk(i === 3 ? '#f0f0e8' : '#b8b8b0')); // a mug
    }),
    waders: () => spr('bog-waders', 18, 32, (p) => {
      const OL = ramp('#1a2a10 #2a3e18 #3e5624 #546e32 #6e8a42'), RB = ramp('#0a0a0a #1a1612 #2a221a #3c3024 #504234');
      for (let j = 2; j < 30; j++) { p.set(8, j, pick(PAL.bark, 0.6, 8, j)); p.set(9, j, pick(PAL.bark, 0.3, 9, j)); } for (let i = 5; i < 13; i++) p.set(i, 2, pick(PAL.bark, 0.75, i, 2));
      for (let j = 4; j < 12; j++) for (let i = 4; i < 14; i++) { const hw = 5 - (j > 9 ? (j - 9) * 0.3 : 0); if (Math.abs(i + 0.5 - 9) > hw) continue; p.set(i, j, pick(OL, cl(0.55 - (i - 9) * 0.06 + (j === 4 ? 0.2 : 0)), i, j)); }
      for (const lx of [4, 9]) for (let j = 12; j < 26; j++) for (let i = 0; i < 5; i++) p.set(lx + i, j, pick(OL, cl(0.75 - Math.abs(i - 1.5) * 0.18 - i * 0.05 - (j > 23 ? 0.1 : 0) + (i === 1 ? 0.1 : 0)), i, j));
      for (const lx of [2, 9]) for (let j = 25; j < 29; j++) for (let i = 0; i < 7; i++) if (j < 27 ? i > 1 : true) p.set(lx + i, j, pick(RB, cl(0.55 - i * 0.04 - (j === 28 ? 0.35 : 0)), i, j));
      for (const sx of [6, 11]) line(p, sx, 5, 9, 2, pk('#3a2a18')); p.set(5, 7, pk('#d8b840')); p.set(12, 7, pk('#d8b840'));
      ell(p, 9, 29.5, 7, 1.4, (x, y, uu) => (Math.abs(uu) < 0.8 ? pick(SW, 0.5 + (hash(x, y, 1) - 0.5) * 0.3, x, y) : 0));
    }),
  },
  over(m, t, out, s) {
    out.push({ x: 0, y: 0, w: 1, h: 1, z: 0, draw: (ctx, X, Y, TS) => { const q = TS / 16; for (const a of s.anim) if (a.k === 'hole') { for (let i = 0; i < 3; i++) { const u = (t * 0.35 + i / 3 + hash(a.x, i, 5)) % 1, gx = a.x - a.w / 2 + 2 + hash(i, a.x, 6) * (a.w - 4), gy = a.y + (hash(i, a.y, 7) - 0.5) * (a.h - 2); ctx.strokeStyle = `rgba(190,240,170,${(0.55 * (1 - u)).toFixed(2)})`; ctx.lineWidth = q * 0.7; ctx.beginPath(); ctx.ellipse(X + gx * q, Y + gy * q, (1 + u * 3) * q, (0.5 + u * 1.2) * q, 0, 0, 7); ctx.stroke(); } if (Math.sin(t * 1.7 + a.x) > 0.93) { ctx.fillStyle = 'rgba(210,255,190,.9)'; ctx.fillRect(Math.round(X + (a.x - 1) * q), Math.round(Y + a.y * q), q * 2, q); } } } });
    out.push({ x: 0, y: 0, w: 1, h: 1, z: 2, draw: (ctx, X, Y, TS) => { const q = TS / 16; for (let i = 0; i < 6; i++) { const u = (t * 0.5 + i * 0.37) % 1, px = X + (1.5 + hash(i, 3, 40) * 8) * TS, py = Y + (1 + u * 5.2) * TS; ctx.fillStyle = `rgba(150,220,150,${(0.5 * (1 - Math.abs(u - 0.5) * 1.4)).toFixed(2)})`; ctx.fillRect(Math.round(px), Math.round(py), q, q * 2); } } }); // drips
  },
};

export default { stones, bogshed: bog };
