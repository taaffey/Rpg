// ===== Themed interiors, part 3: lodge (alpine ski lodge inn) and icehut (ice-fishing hut) =====
import { pk, ramp, PAL, Pix, cl, mix, dk, hash, vnoise, fbm, vor, pick, blob, outline, once, glowItem, plankPx, GR, box, ell, line, spr, win, FR, text, frameAt, bedGen, tableGen } from './roomkit.js';

const ST = PAL.steel;
const IRON = PAL.iron;
// ---------------------------------------------------------------------------------------------------------- LODGE
const PN = ramp('#3a2008 #5a3412 #7e4c1c #a06a2c #c48c42 #deb060 #f0cc80');
const PD = ramp('#1c0e06 #2e1a0c #44280e #5e3a16 #7a4e20 #966428');
const STN = ramp('#2a2622 #403a34 #58504a #70685e #8a8074 #a89c8c #c4b8a4');
const FIR = ramp('#06140e #0c2218 #14362a #1e4a38 #2a6048');
const SNOW = ramp('#6a7ca8 #8a9cc4 #a8b8dc #c8d4ec #e4ecf8 #ffffff');

function lodgeFace(x, f) {
  if (f <= 2) return pick(PD, [0.25, 0.8, 0.45][f], x, f);
  if (f >= 30) return pick(PD, f === 30 ? 0.5 : 0.12, x, f);
  if (f === 18 || f === 19) return pick(PN, f === 18 ? 0.9 : 0.35, x, f); // chair rail
  if (f > 19) { const row = Math.floor((f - 20) / 4), v = (f - 20) % 4, u = ((x + (row & 1) * 9) % 18 + 18) % 18; let s = 0.5 + (hash(Math.floor((x + (row & 1) * 9) / 18), row, 3) - 0.5) * 0.14 + (vnoise(x * 0.4, f * 4, 5, 4) - 0.5) * 0.14; if (u === 0 || v === 3) s = 0.2; else if (v === 0) s += 0.12; return pick(PD, cl(s), x, f); } // darker horizontal wainscot boards
  const u = ((x - 16) % 6 + 6) % 6, b = Math.floor((x - 16) / 6); let s = 0.56 + (hash(b, 4, 6) - 0.5) * 0.14 + (vnoise(x * 0.5, f * 0.3, 4, 5 + (b & 3)) - 0.5) * 0.16 - (f - 3) * 0.004; // tongue-and-groove pine
  if (u === 0) s = 0.22; else if (u === 1) s += 0.12; else if (u === 5) s -= 0.08;
  if (hash(b, 8, 6) < 0.18 && Math.abs(f - (7 + hash(b, 9, 6) * 8)) < 1.2 && u > 1 && u < 5) s -= 0.2;
  return pick(PN, cl(s), x, f);
}
const lodgeWin = (gx, gy, gw, gh) => {
  let c = mix(pk('#0a1a3a'), pk('#2a4a7a'), gy / gh);
  if (hash(gx, gy, 3) < 0.04 && gy < gh * 0.5) c = pk('#e8f0ff'); if (Math.hypot(gx - gw + 4, gy - 3) < 2) c = pk('#f4f0d0'); // moon
  const ridge = gh * 0.55 + Math.sin(gx * 0.5) * 2 - (gx > gw / 2 ? 2 : 0); if (gy > ridge) c = pick(SNOW, cl(0.55 + (gy - ridge) * 0.03 - gx * 0.003), gx, gy);
  for (const [px, ph] of [[3, 7], [gw - 4, 9]]) { const dy = ridge - gy + ph - 2; if (dy > 0 && dy < ph && Math.abs(gx - px) < (ph - dy) * 0.55 + 0.3) c = (dy % 3 === 0 && hash(gx, gy, 5) < 0.6) ? pk('#f0f4ff') : pick(FIR, 0.5, gx, gy); }
  return c;
};
const lodge = {
  mg: 4, light: { base: 0.7, vk: 0.38, min: 0.26, tint: [0.14, 0.05, -0.18] }, spill: '#ffeac0', thr: STN, doorOut: pk('#1a2a4a'),
  floor: (x, y) => plankPx(PN, x, y, 5), face: (x, f) => lodgeFace(x, f),
  cap: (x, y, d, outer, jamb) => { let s = 0.5 + (vnoise(x, y, 4, 31) - 0.5) * 0.2; if (d <= 1) s = 0.88; else if (d === 2) s = 0.66; if (outer === 0) s = 0.12; else if (outer === 1) s -= 0.15; if (jamb) s = 0.25; return pick(PD, cl(s), x, y); },
  feat: () => [['win', 1.75], ['skis', 3.2], ['hearth', 5], ['clock', 7.2], ['win', 8.25]],
  pre(u) { // a Nordic wool rug under the tables
    const x0 = 36, y0 = 44, w = 104, h = 56, R = ramp('#2a0610 #440a18 #620e20 #82162a #a02034 #bc3240 #d44c50');
    for (let v = 0; v < h; v++) for (let uu = 0; uu < w; uu++) { const x = x0 + uu, y = y0 + v, e = Math.min(uu, v, w - 1 - uu, h - 1 - v); let c;
      if (uu % 3 === 1 && (v === -1 || v === h)) continue;
      if (e === 0) c = pick(R, 0.1, x, y); else if (e <= 2) c = pk(((uu + v) & 3) < 2 ? '#e8dcc0' : '#b8aa8c'); else if (e === 3) c = pick(R, 0.2, x, y);
      else { const cx = uu - w / 2, cy = v - h / 2, zz = Math.abs(((cx + cy * 1.2) % 12 + 12) % 12 - 6); c = (e >= 6 && e <= 9 && zz < 2) ? pk('#e8dcc0') : (Math.abs(cx) < 8 && Math.abs(cy) < 8 && (Math.abs(cx) + Math.abs(cy)) % 6 < 2) ? pk('#e8dcc0') : pick(R, 0.56 + (hash(uu, v, 2) - 0.5) * 0.1 + (((uu + v) % 8 === 0) ? 0.1 : 0), x, y); }
      u.S(x, y, c); }
    for (let x = 16; x < 160; x++) for (let k = 0; k < 4; k++) u.D(x, 16 + k, 0.8 + k * 0.05);
    for (let x = 69; x < 107; x++) for (let y = 16; y < 20; y++) u.S(x, y, pick(STN, y === 16 ? 0.9 : y === 19 ? 0.25 : 0.6 + (((x - 69) % 7) === 0 ? -0.2 : 0), x, y)); // hearthstone
  },
  fit: {
    win(u, cx) {
      win(u, cx, 9, 4, 17, PD, lodgeWin, { mx: 1, my: 0.5 });
      for (let x = cx - 10; x < cx + 10; x++) { if (hash(x, 1, 9) < 0.8) { u.S(x, u.wy(18), pk('#f4f8ff')); u.S(x, u.wy(19), pick(SNOW, 0.7, x, 0)); } if (hash(x, 2, 9) < 0.5) u.S(x, u.wy(17), pk('#ffffff')); } // snow on the sill
      u.anim.push({ k: 'swin', x: cx - 7, y: u.wy(6), w: 14, h: 10 }); u.lights.push([cx, 4, 0.18, 36]);
    },
    skis(u, cx) { // crossed skis on the wall, with a pair of poles behind them
      const set = (x, y, c) => u.S(x, u.wy(y), c);
      line({ set }, cx - 9, 5, cx + 9, 18, pk('#b8b0a0')); line({ set }, cx + 9, 5, cx - 9, 18, pk('#b8b0a0'));
      for (const [x0, x1, c, c2] of [[cx - 8, cx + 8, '#c82a2a', '#f8f0e0'], [cx + 8, cx - 8, '#2a5ac8', '#f8f0e0']]) for (let k = 0; k <= 20; k++) { const x = Math.round(x0 + (x1 - x0) * k / 20), f = Math.round(4 + k * 0.7); set(x, f, k % 5 === 0 ? pk(c2) : pk(c)); set(x + 1, f, dk(pk(c), 0.7)); set(x, f - 1, k < 2 ? pk(c) : 0); }
      for (const bx of [cx - 3, cx + 3]) { set(bx, 11, pk('#202020')); set(bx + 1, 11, pk('#202020')); set(bx, 12, pk('#404040')); }
      u.S(cx, u.wy(11), pk('#e8c030'));
    },
    hearth(u, cx) { // river-stone hearth with a chimney breast, pine mantel and mounted antlers
      const stone = (x, f, sh) => { const q = vor(x, f, 6, 0.9, 71), s = 0.5 + (q.h - 0.5) * 0.3 + (q.dx + q.dy < 0 ? 0.08 : -0.05) + sh; return q.e < 0.9 ? pick(STN, 0.08, x, f) : pick(STN, cl(s), x, f); };
      for (let f = 3; f < 31; f++) { const hw = f < 15 ? 14 : 21; for (let x = cx - hw; x < cx + hw; x++) u.S(x, u.wy(f), stone(x, f, x > cx + hw - 4 ? -0.1 : 0)); }
      for (let x = cx - 24; x < cx + 24; x++) { u.S(x, u.wy(14), pick(PN, 0.9, x, 0)); u.S(x, u.wy(15), pick(PN, 0.55, x, 0)); u.S(x, u.wy(16), pick(PN, 0.2, x, 0)); } // mantel
      for (let f = 17; f < 32; f++) for (let x = cx - 11; x < cx + 11; x++) { const ar = f - 17 < 3 && Math.abs(x + 0.5 - cx) > 11 - [4, 2, 1][f - 17]; if (!ar) u.S(x, u.wy(f), mix(pk('#0c0604'), pk('#3a1a0c'), cl((f - 17) / 15))); }
      for (let f = 17; f < 32; f++) { u.S(cx - 12, u.wy(f), pick(STN, 0.85, f, 0)); u.S(cx + 11, u.wy(f), pick(STN, 0.2, f, 0)); }
      const set = (x, y, c) => u.S(x, u.wy(y), c), bone = pk('#e8dcc0'), bd = pk('#a89a7c'); // antlers
      for (let k = 0; k < 9; k++) for (const sd of [-1, 1]) { set(cx + sd * (2 + k * 0.9 | 0), 9 - (k * 0.6 | 0), k < 7 ? bone : bd); if (k % 3 === 1) set(cx + sd * (2 + k * 0.9 | 0), 6 - (k * 0.4 | 0), bone); }
      for (let i = -2; i <= 2; i++) set(cx + i, 10, pick(PD, 0.7, i, 0)); set(cx, 8, bone); set(cx, 9, bone);
      u.anim.push({ k: 'fire', x: cx - 7, y: u.wy(18), w: 14, h: 13 }); u.anim.push({ k: 'glow', x: cx, y: 12, r: 3, a: 0.46 }); u.lights.push([cx, 10, 0.6, 70]);
    },
    clock(u, cx) { // cuckoo clock
      const set = (x, y, c) => u.S(x, u.wy(y), c);
      for (let f = 4; f < 9; f++) for (let x = cx - 7 + (8 - f); x < cx + 7 - (8 - f) + 1; x++) set(x, f, pick(PD, f === 4 ? 0.9 : 0.55 - (x - cx) * 0.02, x, f));
      for (let f = 9; f < 18; f++) for (let x = cx - 5; x < cx + 6; x++) set(x, f, pick(PN, (x === cx - 5 || f === 9) ? 0.9 : x === cx + 5 ? 0.25 : 0.6, x, f));
      ell({ set }, cx, 13, 3.6, 3.6, (x, y, uu, v) => (Math.hypot(uu, v) > 0.8 ? pick(PD, 0.5, x, y) : pk('#f4f0e0'))); set(cx, 11, pk('#202020')); set(cx, 12, pk('#202020')); set(cx + 1, 13, pk('#202020'));
      for (let f = 18; f < 21; f++) set(cx, f, pk('#a8a8b0'));
    },
  },
  shadow: (k) => (k === 'logs' ? [6, 2.4, 14] : undefined),
  spr: {
    bed: () => bedGen('lodge-bed', { W: PN, pat: (u, v) => { const a = (u >> 2) + (v >> 2) & 1; let c = a ? pk('#b82a22') : pk('#2a1410'); if ((u + v * 2) % 12 === 0) c = pk('#e8dcc0'); if (hash(u, v, 5) < 0.12) c = dk(c, 0.85); return c; } }),
    table: () => tableGen('lodge-table', PN, (p) => { p.rect(4, 9, 2, 3, pk('#c8b890')); p.set(4, 9, pk('#f8f0d8')); p.set(13, 10, pk('#a02a2a')); }, PD),
    fondue: (t) => tableGen('lodge-fondue' + (Math.floor(t * 6) % 2), PN, (p) => {
      for (let x = 6; x < 12; x++) { p.set(x, 12, pk('#4a4a54')); p.set(x, 13, pk('#2a2a34')); } // burner
      p.set(8, 11, pk(Math.floor(t * 6) % 2 ? '#ffd060' : '#f08a20')); p.set(9, 11, pk('#f8a030'));
      ell(p, 9, 9, 4, 2.6, (x, y, uu, v) => (v < -0.4 ? pk('#f8d070') : pick(ramp('#4a0a0c #861c1c #c8402e #e8704a'), cl(0.55 - uu * 0.3 - v * 0.2), x, y))); ell(p, 9, 8.2, 2.6, 1, () => pk('#f8dc7a'));
      for (const fx of [4, 14]) line(p, fx, 12, fx + (fx < 9 ? 3 : -3), 7, pk('#b8b8c4')); p.set(3, 12, pk('#c8402e')); p.set(15, 12, pk('#c8402e'));
      for (const [bx, by] of [[13, 12], [14, 13], [12, 13]]) { p.set(bx, by, pk('#e8d098')); p.set(bx + 1, by, pk('#b89860')); }
    }, PD),
    skis: () => spr('lodge-skis', 18, 34, (p) => {
      box(p, 1, 26, 16, 6, PD, { s: 0.45 });
      for (const [sx, c] of [[3, '#c82a2a'], [7, '#2a5ac8'], [11, '#e8c020']]) { for (let j = 2; j < 28; j++) { p.set(sx, j, j % 6 === 1 ? pk('#f8f0e0') : pk(c)); p.set(sx + 1, j, dk(pk(c), 0.65)); } p.set(sx + (sx > 7 ? 1 : 0), 1, pk(c)); for (let j = 17; j < 20; j++) { p.set(sx - 1, j, pk('#202020')); p.set(sx + 2, j, pk('#202020')); } }
      for (const px of [5, 9, 14]) { line(p, px, 6, px + 1, 28, pk('#b8b8c4')); p.set(px, 5, pk('#2a2a30')); p.set(px, 6, pk('#2a2a30')); ell(p, px + 1, 25, 1.8, 0.8, () => pk('#8a8a98')); }
    }),
    logs: () => spr('lodge-logs', 18, 22, (p) => {
      const log = (cx, cy) => ell(p, cx, cy, 3.6, 3.6, (x, y, uu, v) => { const r = Math.hypot(uu, v); return r > 0.82 ? pick(PAL.bark, 0.35 + (uu < 0 ? 0.15 : 0), x, y) : r < 0.15 ? pk('#a0622a') : (Math.floor(r * 4) % 2 ? pick(PN, 0.62, x, y) : pick(PN, 0.82 - uu * 0.1, x, y)); });
      log(5, 14); log(11.5, 14); log(8, 8.5); log(3, 17.5); log(13.5, 17.5);
      for (let i = 1; i < 17; i++) if (hash(i, 2, 5) < 0.5) p.set(i, 19, pk('#d8c8a0'));
    }),
    coat: () => spr('lodge-coat', 18, 34, (p) => {
      for (let j = 4; j < 30; j++) { p.set(8, j, pick(PD, 0.7, 8, j)); p.set(9, j, pick(PD, 0.35, 9, j)); } blob(p, 8.5, 3, 1.5, PN, { amb: 0.4 });
      for (let x = 5; x < 13; x++) { p.set(x, 29, pick(PD, x < 9 ? 0.6 : 0.3, x, 29)); p.set(x, 30, pick(PD, 0.2, x, 30)); }
      for (const [hx, hy] of [[4, 8], [12, 8], [4, 15]]) { line(p, 8, hy + 2, hx, hy, pick(PD, 0.5, 0, 0)); }
      for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) if (i + j > 0 && i + j < 8) p.set(1 + i, 9 + j, pk(j === 0 ? '#e84a3a' : '#b82a22')); p.set(3, 8, pk('#f8f4f0')); p.set(4, 8, pk('#f8f4f0')); // bobble hat
      for (let j = 0; j < 7; j++) for (let i = 0; i < 3; i++) p.set(11 + i, 9 + j, pk(((j >> 1) & 1) ? '#f4f0e0' : '#c82a2a')); // scarf
      for (let j = 0; j < 9; j++) for (let i = 0; i < 6; i++) p.set(2 + i, 16 + j, pick(ramp('#0e1c44 #1a3a7a #2a58b0 #4a7ae0'), cl(0.65 - (i - 3) * 0.08 - (j % 3 === 2 ? 0.2 : 0)), i, j)); // puffer jacket
      for (const bx of [3, 11]) for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) p.set(bx + i, 26 + j, pick(PAL.bark, 0.3 + (j === 0 ? 0.3 : 0), i, j));
    }),
  },
  counter: (w) => once('lodge-counter' + w, () => {
    const PW = w * 16 + 2, p = new Pix(PW, 26);
    for (let y = 9; y < 25; y++) for (let x = 1; x < PW - 1; x++) { const v = y - 9; let s;
      if (v < 5) s = 0.76 + (v === 0 ? 0.14 : 0) - (v === 4 ? 0.2 : 0) + (vnoise(x, v * 4, 6, 2) - 0.5) * 0.14;
      else if (v === 5) s = 0.9; else if (v === 15) s = 0.15;
      else { const pu = (x - 1) % 16, pv = v - 6; s = 0.46; if (pu === 0 || pv === 0 || pv === 8) s = 0.25; else if (pu === 1 || pv === 1) s = 0.64; else if (pu === 15 || pv === 7) s = 0.3; else if (Math.abs(pu - 7.5) + Math.abs(pv - 4) < 3.5) s = 0.72; s -= x / (PW * 6); }
      p.set(x, y, pick(PN, cl(s), x, y)); }
    ell(p, 6, 6, 3.6, 2.4, (x, y, uu, v) => pick(PAL.gold, cl(0.75 - uu * 0.3 - v * 0.3), x, y)); p.set(6, 3, pk('#fff0a0')); p.set(5, 3, pick(PAL.gold, 0.5, 0, 0)); p.set(7, 3, pick(PAL.gold, 0.5, 0, 0)); // brass bell
    for (let j = 3; j < 8; j++) for (let i = 0; i < 8; i++) p.set(11 + i, j, pk(i === 0 ? '#8a2a20' : j === 3 ? '#f8f0e0' : '#e0d4b8')); // guest book
    for (const kx of [w * 16 - 12, w * 16 - 8, w * 16 - 4]) { p.set(kx, 6, pick(PAL.gold, 0.7, 0, 0)); p.set(kx, 7, pick(PAL.gold, 0.5, 0, 0)); p.set(kx, 5, pick(PAL.gold, 0.8, 0, 0)); }
    for (let j = 4; j < 9; j++) for (let i = 0; i < 4; i++) p.set(w * 16 - 20 + i, j, pk(j === 4 ? '#f8f0e0' : i === 0 ? '#c8b890' : '#a89870')); // schnapps
    outline(p, 0.4); return p.canvas();
  }),
  over(m, t, out, s) {
    for (const a of s.anim) if (a.k === 'swin') out.push({ x: 0, y: 0, w: 1, h: 1, z: 0, draw: (ctx, X, Y, TS) => { const q = TS / 16; ctx.save(); ctx.beginPath(); ctx.rect(X + a.x * q, Y + a.y * q, a.w * q, a.h * q); ctx.clip(); for (let i = 0; i < 14; i++) { const u = (t * 0.32 + hash(i, a.x, 6)) % 1, fx = a.x + ((hash(i, 3, 6) * a.w + Math.sin(t * 1.3 + i) * 1.2 + u * 3 + a.w * 2) % a.w), fy = a.y + u * a.h; ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillRect(Math.round(X + fx * q), Math.round(Y + fy * q), q, q); } ctx.restore(); } });
    out.push({ x: 4.5, y: 1.0, w: 2.1, h: 1.2, z: 2, draw: (ctx, X, Y, TS) => { // the antler chandelier
      const q = TS / 16, cx0 = X + 1.05 * TS, cy0 = Y + 0.3 * TS, fl = 0.8 + Math.sin(t * 9) * 0.1; ctx.fillStyle = '#5a3a1c'; for (let j = -14; j < 4; j++) ctx.fillRect(Math.round(cx0 - q), Math.round(cy0 + j * q), q * 2, q);
      ctx.fillStyle = '#e8dcc0'; for (const sd of [-1, 1]) for (let k = 0; k < 14; k++) { const px = cx0 + sd * (3 + k * 1.3) * q, py = cy0 + 3 * q + Math.sin(k * 0.22) * 4 * q - k * 0.1 * q; ctx.fillRect(Math.round(px), Math.round(py), q, q); if (k % 4 === 2) ctx.fillRect(Math.round(px), Math.round(py - 3 * q), q, q * 3); }
      ctx.fillStyle = '#a89a7c'; ctx.fillRect(Math.round(cx0 - 3 * q), Math.round(cy0 + 2 * q), q * 6, q * 3);
      for (const dx of [-17, -8, 8, 17]) { ctx.fillStyle = '#f4ecd8'; ctx.fillRect(Math.round(cx0 + dx * q), Math.round(cy0 + (Math.abs(dx) > 10 ? 1 : 2) * q), q * 2, q * 3); ctx.fillStyle = `rgba(255,${(190 + fl * 40) | 0},80,${fl})`; ctx.fillRect(Math.round(cx0 + dx * q), Math.round(cy0 + (Math.abs(dx) > 10 ? -1 : 0) * q), q * 2, q * 2); }
    } });
    out.push(glowItem('255,190,100', 5.5, 1.5, 2.4, 0.2 + Math.sin(t * 9) * 0.03, 2));
    out.push({ x: 0, y: 0, w: 1, h: 1, z: 0, draw: (ctx, X, Y, TS) => { const q = TS / 16, cx = 123; ctx.fillStyle = '#e8c030'; ctx.fillRect(Math.round(X + (cx + Math.sin(t * 3.2) * 2.4 - 1) * q), Math.round(Y + 4.2 * q), q * 2, q * 2); } }); // the pendulum
  },
};

// ---------------------------------------------------------------------------------------------------------- ICE HUT
const TW = ramp('#0c1c22 #16303a #1f4452 #2a5a6c #3a7488 #5090a4 #74b0c0 #a0d0dc');
const HW = ramp('#1e1a1c #2e2828 #423a38 #5a4e48 #74645a #94827a #b4a89c');
const DW = ramp('#02060c #040e1a #08203a #0e3a5e #1a5a88 #2e84b4 #6ab8e0');
const FRO = '#e4f6fc';
function frostMix(c, k) { return mix(c, pk(FRO), cl(k)); }
function hutFloor(x, y) {
  const row = Math.floor(y / 5), v = y % 5, L = 34 + Math.floor(hash(row, 1, 61) * 3) * 8, off = Math.floor(hash(row, 0, 61) * 40), xx = x + off, seg = Math.floor(xx / L), u = ((xx % L) + L) % L;
  let s = 0.5 + (hash(row, seg, 63) - 0.5) * 0.3 + (vnoise(x, y * 5, 9, 64) - 0.5) * 0.2;
  if (v === 4) s = 0.12; else if (v === 0) s += 0.1; if (u === 0) s = 0.1; else if (u === 1) s += 0.08; if ((u === 3 || u === L - 3) && v === 1) s = 0.9;
  let c = pick(HW, cl(s, 0.04, 0.95), x, y);
  const fr = fbm(x, y, 67), edge = Math.min(Math.hypot(x - 16, y - 16), Math.hypot(x - 160, y - 16), Math.hypot(x - 16, y - 112), Math.hypot(x - 160, y - 112));
  c = frostMix(c, (fr - 0.62) * 2 + (edge < 34 ? (34 - edge) / 44 : 0) + (hash(x, y, 68) < 0.03 ? 0.4 : 0));
  return c;
}
function hutFace(x, f) {
  if (f <= 2) return pick(TW, [0.2, 0.7, 0.4][f], x, f);
  if (f >= 30) return pick(TW, f === 30 ? 0.3 : 0.05, x, f);
  const row = Math.floor((f - 3) / 4), v = (f - 3) % 4, off = Math.floor(hash(row, 2, 62) * 30), u = ((x + off) % 40 + 40) % 40;
  let s = 0.5 + (hash(row, Math.floor((x + off) / 40), 62) - 0.5) * 0.2 + (vnoise(x * 0.3, f * 4, 5, 5) - 0.5) * 0.16 - (f - 3) * 0.003;
  if (v === 3) s = 0.15; else if (v === 0) s += 0.12; if (u === 0) s = 0.15;
  let c = pick(TW, cl(s), x, f);
  const peel = vnoise(x * 0.5, f * 0.5, 4, 66); if (peel > 0.78) c = pick(HW, cl(0.4 + (hash(x, f, 3) - 0.5) * 0.2), x, f);
  const fr = fbm(x, f, 69), top = f < 12 ? (12 - f) / 12 : 0, bot = f > 24 ? (f - 24) / 8 : 0;
  c = frostMix(c, (fr - 0.6) * 1.4 + top * 0.45 + bot * 0.15);
  const il = Math.floor(hash(x >> 2, 7, 62) * 9) + 2, ix = ((x % 4) + 4) % 4; if (f >= 3 && f < 3 + il && Math.abs(ix - 1.5) < 1.6 * (1 - (f - 3) / il) + 0.2 && hash(x >> 2, 8, 62) < 0.55) c = pick(ramp('#6aa8d0 #9ad0ea #c8ecf8 #f0fcff'), (f - 3) / il < 0.3 ? 0.9 : 0.5, x, f); // icicles
  return c;
}
const hut = {
  mg: 4, light: { base: 0.72, vk: 0.34, min: 0.3, tint: [0.02, 0.02, 0.1] }, spill: '#d8f0ff', thr: PAL.snow, doorOut: pk('#5a7aa8'), out: (x, y) => pk('#04060c'),
  floor: (x, y) => hutFloor(x, y), face: (x, f) => hutFace(x, f),
  cap: (x, y, d, outer, jamb) => { let s = d <= 1 ? 0.9 : d === 2 ? 0.7 : 0.5 + (vnoise(x, y, 4, 31) - 0.5) * 0.14; if (outer === 0) return pick(TW, 0.05, x, y); if (outer === 1) s -= 0.2; if (jamb) s = 0.3; return outer >= 3 && hash(x, y, 7) < 0.4 ? pk('#e8f4fc') : pick(TW, cl(s), x, y); },
  feat: () => [['fish', 2.2], ['win', 5], ['sign', 7.2], ['pipe', 8.5]],
  pre(u) { u.lights.push([136, 14, 0.5, 52]); },
  flat: {
    hole(u, tx, ty) { // the fishing hole: cut through the planks to the black water, ragged ice around the rim
      const cx = tx * 16 + 8, cy = ty * 16 + 8;
      for (let y = cy - 13; y <= cy + 12; y++) for (let x = cx - 16; x <= cx + 15; x++) { const dx = (x + 0.5 - cx) / 11.5, dy = (y + 0.5 - cy) / 8.2, jag = (hash(x >> 1, y >> 1, 71) - 0.5) * 0.25, d = Math.hypot(dx, dy) + jag;
        if (d < 0.78) u.S(x, y, pick(DW, cl(0.12 + d * 0.28 + (dy < -0.3 ? 0.06 : 0) + (vnoise(x, y, 3, 8) - 0.5) * 0.12), x, y));
        else if (d < 0.92) u.S(x, y, pick(ramp('#b8e4f4 #d8f4fc #f0fcff #ffffff'), cl(0.2 + (dx + dy) * -0.25 + hash(x, y, 2) * 0.4), x, y));
        else if (d < 1.08) u.S(x, y, pick(HW, 0.08, x, y)); else if (d < 1.35 && hash(x, y, 9) < 0.55) u.B(x, y, pk(FRO), 0.5); }
      for (const [a, b] of [[-3, -2], [-2, -2], [4, -3], [3, 1]]) u.S(cx + a, cy + b, pk('#ffffff'));
      u.anim.push({ k: 'hole', x: cx, y: cy });
    },
  },
  fit: {
    fish(u, cx) { // a mounted pike on a plaque
      FR(u, cx - 14, 4, 29, 13, (i, j) => (i === 0 || j === 0 || i === 28 || j === 12) ? pick(IRON, 0.5, i, j) : pick(HW, cl(0.5 + (vnoise(i, j * 4, 3, 5) - 0.5) * 0.2 - (i === 1 || j === 1 ? -0.1 : 0)), i, j));
      const set = (x, y, c) => u.S(x, u.wy(y), c);
      for (let i = 0; i < 22; i++) { const hw = i < 3 ? 1 + i * 0.6 : i > 17 ? Math.max(0.4, 3.6 - (i - 17) * 0.9) : 3.2 - Math.abs(i - 9) * 0.05; for (let j = Math.round(10 - hw); j <= 10 + hw; j++) { const bel = j > 10 + hw * 0.3; set(cx - 11 + i, j, bel ? pick(ramp('#7a8a7a #a8b8a8 #d0dcd0 #f0f4ec'), 0.7, i, j) : pick(ramp('#1a3a20 #2a5a30 #3a7a40 #5a9a50'), cl(0.55 + (hash(i, j, 2) - 0.5) * 0.4), i, j)); } }
      set(cx - 10, 9, pk('#f8f0a0')); set(cx - 10, 10, pk('#101010')); for (let i = 0; i < 3; i++) set(cx - 11 + i, 12, pk('#e8e8e0')); set(cx + 11, 8, pk('#2a5a30')); set(cx + 11, 12, pk('#2a5a30')); set(cx + 12, 10, pk('#2a5a30'));
    },
    win(u, cx) { // frosted pane, pale aurora behind the ice ferns
      win(u, cx, 9, 4, 17, TW, (gx, gy, gw, gh, x, f) => {
        let c = mix(pk('#10304a'), pk('#4ab8a8'), 0.2 + Math.sin(gx * 0.5 + gy * 0.2) * 0.2 + (gy / gh) * 0.3); const fern = Math.abs(Math.sin((gx + gy * 0.6) * 0.9) * Math.cos((gy - gx * 0.4) * 0.7)); if (fern > 0.72 || vnoise(gx, gy, 3, 12) > 0.7) c = mix(c, pk('#f4fcff'), 0.8); return c; }, { mx: 1, my: 0.5 });
      for (let x = cx - 10; x < cx + 10; x++) if (hash(x, 4, 9) < 0.7) { u.S(x, u.wy(18), pk('#f4fcff')); u.S(x, u.wy(17), pk('#e4f6fc')); }
      u.lights.push([cx, 4, 0.25, 40]);
    },
    sign(u, cx) {
      FR(u, cx - 15, 6, 31, 11, (i, j) => (i === 0 || j === 0 || i === 30 || j === 10) ? pick(TW, 0.15, i, j) : pk('#e8e0c8'));
      text((x, y, c) => u.S(x, u.wy(y), c), cx - 13, 8, 'NO FISH', pk('#b82a22')); for (let i = 0; i < 26; i++) if (hash(i, 3, 3) < 0.4) u.S(cx - 13 + i, u.wy(14), pk('#a89870'));
    },
    pipe(u, cx) { // the stove pipe disappears into the roof
      for (let f = 3; f < 17; f++) for (let x = cx - 3; x < cx + 3; x++) u.S(x, u.wy(f), pick(IRON, cl(0.7 - (x - cx + 3) * 0.14 + (f % 7 === 0 ? 0.2 : 0)), x, f));
      for (let x = cx - 4; x < cx + 4; x++) { u.S(x, u.wy(3), pick(IRON, 0.3, x, 0)); u.S(x, u.wy(4), pick(IRON, 0.8, x, 0)); }
    },
  },
  shadow: (k) => (k === 'stool' ? [5, 2, 14] : undefined),
  spr: {
    cot: () => bedGen('hut-cot', { W: HW, sheet: PAL.cloth, pat: (u, v) => { const n = vnoise(u, v, 3, 7); return n > 0.6 ? pk('#e8e4dc') : n > 0.35 ? pk('#a8a49c') : pk('#6a665e'); } }),
    stove: (t) => spr('hut-stove', 18, 36, (p) => {
      for (let j = 0; j < 9; j++) { p.set(8, j, pick(IRON, 0.7, 8, j)); p.set(9, j, pick(IRON, 0.35, 9, j)); p.set(7, j, pick(IRON, 0.4, 7, j)); }
      for (let x = 3; x < 15; x++) { p.set(x, 9, pick(IRON, 0.7, x, 9)); p.set(x, 10, pick(IRON, 0.3, x, 10)); }
      ell(p, 9, 20, 7.4, 9.6, (x, y, uu, v) => pick(IRON, cl(0.6 - uu * 0.35 - v * 0.1 + (hash(x, y, 2) - 0.5) * 0.06), x, y));
      for (let j = 17; j < 25; j++) for (let i = 6; i < 12; i++) p.set(i, j, i === 6 || j === 17 ? pick(IRON, 0.2, i, j) : mix(pk('#f8b040'), pk('#c8401a'), (j - 17) / 7)); p.set(8, 21, pk('#fff0a0')); p.set(9, 20, pk('#ffe070'));
      for (const lx of [3, 13]) for (let j = 28; j < 34; j++) p.set(lx, j, pick(IRON, 0.5, lx, j)); for (let x = 2; x < 16; x++) p.set(x, 33, pick(IRON, 0.25, x, 33));
      ell(p, 6, 7.4, 3.6, 2.4, (x, y, uu, v) => pick(ST, cl(0.7 - uu * 0.3 - v * 0.2), x, y)); line(p, 3, 6, 1, 4, pick(ST, 0.8, 0, 0)); p.set(7, 4, pk('#202020')); for (let i = 5; i < 8; i++) p.set(i, 5, pick(ST, 0.9, i, 0)); // kettle
    }),
    rods: () => spr('hut-rods', 18, 34, (p) => {
      box(p, 1, 27, 16, 5, HW, { s: 0.5 }); for (const [x0, x1, c] of [[3, 7, '#5a3a18'], [6, 10, '#2a2a30'], [9, 13, '#7a4a20']]) { line(p, x0, 29, x1 + 1, 2, pk(c)); for (const k of [0.3, 0.55, 0.8]) { const bx = Math.round(x0 + (x1 + 1 - x0) * k), by = Math.round(29 - 27 * k); p.set(bx, by, pk('#c8c8d0')); } ell(p, x0 + (x1 - x0) * 0.4 + 2, 20, 1.6, 1.6, (x, y, uu) => pick(ST, cl(0.7 - uu * 0.3), x, y)); }
      for (let j = 0; j < 11; j++) { p.set(14, 12 + j, pick(HW, 0.7, 14, j)); } ell(p, 14.5, 10, 2.8, 3.2, (x, y, uu, v) => (Math.hypot(uu, v) > 0.7 ? pick(HW, 0.8, x, y) : (x + y) & 1 ? pk('#c8b890') : 0)); // landing net
    }),
    bait: () => spr('hut-bait', 18, 22, (p) => {
      for (let j = 7; j < 18; j++) for (let i = 2; i < 12; i++) { const hw = 4.6 + (j - 7) * 0.05; if (Math.abs(i + 0.5 - 7) > hw) continue; p.set(i, j, pick(ST, cl(0.7 - (i - 4) * 0.12 + (j === 7 ? 0.15 : 0) + (j % 5 === 0 ? -0.1 : 0)), i, j)); }
      ell(p, 7, 7, 4.8, 1.6, (x, y, uu, v) => pick(ramp('#2a1a10 #4a2e1c #6a4a2c'), cl(0.5 - v * 0.2 + hash(x, y, 2) * 0.3), x, y)); for (const [a, b] of [[5, 6], [8, 7], [6, 8], [9, 6]]) { p.set(a, b, pk('#e88a98')); p.set(a + 1, b, pk('#c8586a')); }
      box(p, 10, 13, 7, 5, PAL.green, { s: 0.45 }); p.set(13, 14, pk('#e8c030')); for (let i = 11; i < 16; i++) p.set(i, 15, pick(PAL.green, 0.85, i, 15));
      ell(p, 8, 19, 6.5, 1.4, (x, y, uu) => 0 );
    }),
    stool: () => spr('hut-stool', 18, 22, (p) => {
      for (const [x0, x1] of [[4, 6], [13, 11], [9, 9]]) line(p, x0, 17, x1, 9, pick(PAL.bark, 0.5, 0, 0));
      ell(p, 9, 8.5, 6.4, 3.4, (x, y, uu, v) => (v > 0.5 ? pick(PAL.bark, 0.4, x, y) : mix(pk('#f4f0e8'), pk('#b8b4ac'), cl(0.35 + uu * 0.3 + v * 0.3 + hash(x, y, 2) * 0.2))));
    }),
  },
  over(m, t, out, s) {
    for (const a of s.anim) if (a.k === 'hole') {
      const hx = a.x, hy = a.y;
      out.push({ x: 0, y: 0, w: 1, h: 1, z: 0, draw: (ctx, X, Y, TS) => { const q = TS / 16, bob = Math.sin(t * 2.1) * 0.8, bx = hx - 1, by = hy + 1 + bob;
        for (let i = 0; i < 2; i++) { const u = (t * 0.45 + i * 0.5) % 1; ctx.strokeStyle = `rgba(170,220,250,${(0.55 * (1 - u)).toFixed(2)})`; ctx.lineWidth = q * 0.7; ctx.beginPath(); ctx.ellipse(X + bx * q, Y + (hy + 1) * q, (1.5 + u * 5) * q, (0.8 + u * 2.6) * q, 0, 0, 7); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(236,244,255,.95)'; ctx.lineWidth = q * 0.8; ctx.beginPath(); ctx.moveTo(X + (hx + 10) * q, Y + (hy - 14) * q); ctx.quadraticCurveTo(X + (hx + 4) * q, Y + (hy - 2) * q, X + bx * q, Y + by * q); ctx.stroke();
        ctx.fillStyle = '#7a4a20'; ctx.fillRect(Math.round(X + (hx + 9) * q), Math.round(Y + (hy - 15) * q), q * 2, q * 2); ctx.strokeStyle = '#7a4a20'; ctx.beginPath(); ctx.moveTo(X + (hx + 10) * q, Y + (hy - 14) * q); ctx.lineTo(X + (hx + 22) * q, Y + (hy + 4) * q); ctx.stroke();
        ctx.fillStyle = '#e04030'; ctx.fillRect(Math.round(X + (bx - 1) * q), Math.round(Y + (by - 2) * q), q * 2, q * 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(X + (bx - 1) * q), Math.round(Y + (by - 3) * q), q * 2, q); } });
    }
    out.push(glowItem('255,150,70', 8.5, 2.1, 1.7, 0.34 + Math.sin(t * 7) * 0.05, 0));
    out.push({ x: 0, y: 0, w: 1, h: 1, z: 2, draw: (ctx, X, Y, TS) => { const q = TS / 16;
      for (let i = 0; i < 6; i++) { const u = (t * 0.5 + i * 0.17) % 1, px = X + (8.1 + Math.sin(u * 5 + i) * 0.2 + u * 0.15) * TS, py = Y + (1.65 - u * 1.4) * TS; ctx.fillStyle = `rgba(255,255,255,${(0.55 * (1 - u)).toFixed(2)})`; ctx.fillRect(Math.round(px), Math.round(py), q * (u < 0.5 ? 2 : 3), q * 2); } // kettle steam
      for (let i = 0; i < 18; i++) { const px = (1 + hash(i, 1, 70) * 9) * TS, py = (1 + hash(i, 2, 70) * 6) * TS, a = Math.max(0, Math.sin(t * 1.5 + i * 3.1)); if (a < 0.7) continue; ctx.fillStyle = `rgba(230,250,255,${a.toFixed(2)})`; ctx.fillRect(Math.round(X + px), Math.round(Y + py), q, q); ctx.fillRect(Math.round(X + px - q), Math.round(Y + py + q * 0.0), q * 3, q * 0.5); } } }); // frost sparkles
  },
};

export default { lodge, icehut: hut };
