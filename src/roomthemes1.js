// ===== Themed interiors, part 1: chippy (seaside chip shop), stones (Standing Stones clearing), bogshed (stilt shed over the bog) =====
import { pk, ramp, PAL, Pix, cl, mix, dk, hash, vnoise, fbm, vor, pick, blob, outline, once, glowItem, PL, GR, box, ell, line, spr, win, GRU, FR, text, frameAt, lerp, place } from './roomkit.js';

// ---------------------------------------------------------------------------------------------------------- CHIPPY
const WT = ramp('#5a6a86 #7a8aa6 #9aaac4 #b8c8dc #d4e0ee #eaf2fa #ffffff');
const BT = ramp('#081c44 #0e2c66 #163e8a #1e54ae #2e6cc8 #4e8ae0 #86b4f0');
const LR = ramp('#4a0a10 #7a1018 #a41c24 #c42c2c #e04a3c #f07858');
const LC = ramp('#7a6a50 #a8987a #cfc2a2 #e8dfc4 #f8f2de #ffffff');
const ST = PAL.steel;
const BRN = ramp('#1a0c04 #3a1c08 #5a3010 #7a4a1c #a06a2c');

function chippyFloor(x, y) {
  const sq = ((x >> 3) + (y >> 3)) & 1, u = x & 7, v = y & 7, n = vnoise(x, y, 5, 4);
  let s = (sq ? 0.62 : 0.56) + (n - 0.5) * 0.12;
  if (u === 0 || v === 0) s -= 0.1; if (u === 1 && v === 1) s += 0.12; // bevelled lino squares
  if (((x + y) % 28) < 3 && v < 6) s += 0.1; // gloss streaks
  const g = Math.hypot((x - 88) / 36, (y - 54) / 22); if (g < 1) s -= (1 - g) * 0.18 * (hash(x, y, 3) < 0.7 ? 1 : 0.5); // grease by the fryer
  if (hash(x >> 1, y >> 1, 9) < 0.02) s -= 0.12; // scuffs
  return sq ? pick(LR, cl(s), x, y) : pick(LC, cl(s + 0.1), x, y);
}
function chippyFace(x, f) {
  if (f <= 2) return pick(BT, [0.3, 0.85, 0.15][f], x, f); // blue cornice
  if (f >= 30) return pick(BT, f === 30 ? 0.3 : 0.05, x, f);
  if (f === 16 || f === 17) return pick(BT, f === 16 ? 0.9 : 0.25, x, f); // blue border strip between white and blue
  if (f < 16) { const row = f - 3, u = ((x + ((row / 6 | 0) & 1) * 4) % 8 + 8) % 8, v = row % 6; let s = 0.74 + (hash((x + ((row / 6 | 0) & 1) * 4) >> 3, row / 6 | 0, 4) - 0.5) * 0.1; if (u === 0 || v === 5) s = 0.3; else if (v === 0 || u === 1) s = 0.98; else if (v === 4 || u === 7) s -= 0.1; return pick(WT, cl(s), x, f); }
  const row = f - 18, rr = (row / 6) | 0, xx = x + (rr & 1) * 4, u = ((xx % 8) + 8) % 8, v = row % 6; let s = 0.5 + (hash(xx >> 3, rr, 6) - 0.5) * 0.14;
  if (u === 0 || v === 5) s = 0.1; else if (v === 0) s = 0.95; else if (u === 1) s = 0.82; else if (u === 7 || v === 4) s -= 0.16;
  return pick(BT, cl(s), x, f);
}
const SEA = [[0.0, '#a8d8f4'], [0.45, '#d8f0fc']];
const chippy = {
  mg: 4, light: { base: 0.8, vk: 0.3, min: 0.3, tint: [-0.02, 0.01, 0.06] }, spill: '#e8f4ff', thr: BT, doorOut: pk('#3a6a8a'),
  floor: (x, y) => chippyFloor(x, y), face: (x, f) => chippyFace(x, f),
  cap: (x, y, d, outer, jamb) => { let s = d <= 1 ? 0.92 : d === 2 ? 0.7 : 0.55 + (vnoise(x, y, 4, 31) - 0.5) * 0.1; if (outer === 0) return pick(BT, 0.05, x, y); if (outer === 1) s = 0.4; if (jamb) s = 0.25; return outer <= 2 ? pick(BT, outer === 2 ? 0.55 : 0.2, x, y) : pick(WT, cl(s), x, y); },
  feat: () => [['menu', 1.5], ['poster', 3.05], ['hood', 5], ['clock', 7.06], ['win', 8.7]],
  fit: {
    menu(u, cx) { // black slate menu board in a white frame
      FR(u, cx - 14, 3, 29, 15, (i, j) => (i === 0 || j === 0 || i === 28 || j === 14) ? pick(WT, j === 14 || i === 28 ? 0.4 : 0.95, i, j) : (i === 1 || j === 1 || i === 27 || j === 13) ? pick(WT, 0.3, i, j) : pk(vnoise(i, j * 2, 3, 2) > 0.7 ? '#2a3438' : '#1a2226'));
      const set = (x, y, c) => u.S(x, u.wy(y), c);
      text(set, cx - 8, 5, 'MENU', pk('#ffd84a'));
      text(set, cx - 12, 11, 'FISH 3', pk('#f4f4ec'));      for (let i = 0; i < 26; i += 2) set(cx - 13 + i, 10, pk('#8a9aa0')); // chalk underline
      u.lights.push([cx, 4, 0.12, 24]);
    },
    poster(u, cx) { // framed fish poster
      FR(u, cx - 8, 4, 16, 13, (i, j) => (i === 0 || j === 0 || i === 15 || j === 12) ? pick(BT, 0.85, i, j) : (i === 1 || j === 1 || i === 14 || j === 11) ? pick(WT, 0.95, i, j) : mix(pk('#7ac0e8'), pk('#2a6aa8'), j / 10));
      const set = (x, y, c) => u.S(x, u.wy(y), c), fx = cx - 4, fy = 8;
      for (const [i, j, c] of [[1, 0, '#e8e8f0'], [2, 0, '#f8f8ff'], [3, 0, '#e8e8f0'], [0, 1, '#d8d8e8'], [1, 1, '#f8f8ff'], [2, 1, '#ffffff'], [3, 1, '#c8c8d8'], [4, 1, '#a8a8c0'], [5, 1, '#e0a040'], [0, 2, '#d8d8e8'], [1, 2, '#f0f0f8'], [2, 2, '#e8e8f0'], [3, 2, '#c8c8d8'], [4, 2, '#a8a8c0'], [5, 2, '#e0a040'], [1, 3, '#b8b8d0'], [2, 3, '#c8c8d8'], [3, 3, '#b8b8d0']]) set(fx + i, fy + j, pk(c));
      set(fx + 1, fy + 1, pk('#101820'));
    },
    hood(u, cx) { // stainless extractor hood over the fryer
      for (let f = 3; f <= 14; f++) { const hw = f < 8 ? 6 : 6 + (f - 7) * 3.2; for (let x = Math.floor(cx - hw); x < cx + hw; x++) { const t = (x - cx) / hw; let s = 0.5 - t * 0.3 + (f === 8 ? 0.22 : 0) + (f === 14 ? -0.3 : 0) + ((x * 3 + f) % 11 === 0 ? 0.12 : 0) + (Math.abs(x - cx) > hw - 1.5 ? -0.3 : 0); if (f >= 9 && f <= 13 && (x & 3) === 0) s -= 0.18; u.S(x, u.wy(f), pick(ST, cl(s), x, f)); } }
      for (let x = cx - 22; x < cx + 22; x++) u.S(x, u.wy(15), pick(ST, x < cx ? 0.4 : 0.2, x, 15));
      u.lights.push([cx, 20, 0.38, 64]);
    },
    clock(u, cx) { // round wall clock
      const set = (x, y, c) => u.S(x, u.wy(y), c);
      ell({ set }, cx, 10, 6, 6, (x, y, uu, v) => { const r = Math.hypot(uu, v); return r > 0.8 ? pick(BT, 0.9 - (uu + v) * 0.2, x, y) : pick(WT, 1 - (uu + v) * 0.05, x, y); });
      line({ set }, cx, 10, cx, 6, pk('#1a2840')); line({ set }, cx, 10, cx + 2, 11, pk('#1a2840')); set(cx, 10, pk('#d02828'));
      for (const [a, b] of [[0, -4], [4, 0], [0, 4], [-4, 0]]) set(cx + a, 10 + b, pk('#3a4a68'));
    },
    win(u, cx) { // sea view, with a gull
      win(u, cx, 10, 4, 17, WT, (gx, gy, gw, gh) => {
        const hz = Math.floor(gh * 0.46);
        if (gy < hz) { let c = mix(pk('#7ec0f0'), pk('#d6effc'), gy / hz); if ((gx - 3) ** 2 / 6 + (gy - 3) ** 2 / 2 < 1 && gx < 8) c = pk('#ffffff'); if (gy === 3 && gx >= 11 && gx <= 12) c = pk('#2a2a38'); if (gy === 4 && (gx === 10 || gx === 13)) c = pk('#2a2a38'); return c; }
        const k = gy - hz, w = Math.sin(gx * 0.9 + k * 1.7); let c = mix(pk('#2e78c0'), pk('#164c88'), k / (gh - hz)); if (w > 0.82) c = pk('#9acaf0'); if (k === 0) c = pk('#bfe0f8'); return c; }, { mx: 1 });
      u.lights.push([cx, 4, 0.3, 40]);
    },
  },
  shadow: (k) => (k === 'stool' ? [5, 2, 15] : undefined),
  spr: {
    fridge: () => spr('chip-fridge', 18, 30, (p) => {
      box(p, 1, 3, 16, 25, ST, { s: 0.6 });
      for (let i = 2; i < 16; i++) { p.set(i, 4, pick(BT, 0.45, i, 4)); p.set(i, 5, pick(BT, 0.8, i, 5)); p.set(i, 6, pick(BT, 0.3, i, 6)); }
      for (let j = 8; j < 26; j++) for (let i = 3; i < 15; i++) p.set(i, j, pk(j === 8 || i === 3 ? '#101820' : '#1c2c3c'));
      const cans = ['#d03030', '#2a5ac8', '#e8c030', '#38a048'];
      for (const sy of [11, 17, 23]) { for (let i = 4; i < 14; i++) p.set(i, sy + 2, pick(ST, 0.5, i, 0)); for (let k = 0; k < 3; k++) for (let j = 0; j < 4; j++) { const c = pk(cans[(k + sy) % 4]); p.set(4 + k * 3, sy - 1 + j, c); p.set(5 + k * 3, sy - 1 + j, dk(c, 0.7)); p.set(4 + k * 3, sy - 1, pk('#f0f0f0')); } }
      for (let j = 9; j < 25; j++) for (let i = 3; i < 15; i++) if ((i + j) % 9 === 0) p.set(i, j, mix(p.get(i, j), pk('#ffffff'), 0.35)); // glass glare
      for (let j = 10; j < 20; j++) { p.set(15, j, pick(ST, 0.9, 0, 0)); }
      for (let i = 2; i < 16; i++) p.set(i, 26, pick(ST, 0.2, i, 0));
    }),
    jar: () => spr('chip-jar', 18, 30, (p) => {
      box(p, 2, 16, 14, 12, ST, { s: 0.58 }); for (let i = 3; i < 15; i++) p.set(i, 19, pick(BT, 0.5, i, 0)); for (let j = 21; j < 27; j++) p.set(8, j, pick(ST, 0.3, 0, j));
      ell(p, 9, 9.5, 6.4, 6.6, (x, y, uu, v) => { const r = Math.hypot(uu, v); if (r > 0.86) return pick(ST, 0.78 - uu * 0.2, x, y); return mix(pk('#d8b858'), pk('#8a6a24'), cl(0.3 + v * 0.3 + uu * 0.2)); });
      for (const [ex, ey] of [[6, 7], [10, 6], [7, 11], [11, 10], [9, 13], [5, 12], [12, 13]]) ell(p, ex, ey, 2.2, 1.7, (x, y, uu, v) => pick(LC, cl(0.78 - uu * 0.16 - v * 0.18), x, y));
      for (let i = 4; i < 14; i++) { p.set(i, 3, pick(BT, 0.8, i, 3)); p.set(i, 2, pick(BT, 0.5, i, 2)); }
      p.set(5, 5, pk('#fffbe8')); p.set(5, 6, pk('#fffbe8'));
    }),
    vinegar: () => spr('chip-vin', 18, 30, (p) => {
      box(p, 2, 17, 14, 11, ST, { s: 0.58 }); for (let i = 3; i < 15; i++) p.set(i, 20, pick(LR, 0.7, i, 0));
      const bottle = (bx, h, body, cap) => { for (let j = 0; j < h; j++) for (let i = 0; i < 5; i++) { const neck = j < 4; if (neck && (i < 2 || i > 2)) continue; p.set(bx + i, 17 - h + j, pick(body, cl(0.6 - (i - 2) * 0.15 + (j === h - 1 ? -0.2 : 0)), i, j)); } for (let j = 0; j < 2; j++) p.set(bx + 2, 17 - h + j, pk(cap)); if (h > 8) for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) p.set(bx + i, 17 - h + 7 + j, pk(i < 1 || i > 3 ? '#a08a60' : '#f0e8c8')); };
      bottle(2, 12, BRN, '#f4f4f4'); bottle(8, 12, BRN, '#f4f4f4'); bottle(13, 9, LR, '#f4f4f4');
      p.set(5, 5, pk('#a08a60')); p.set(11, 5, pk('#a08a60'));
    }),
    spuds: () => spr('chip-spuds', 18, 22, (p) => {
      ell(p, 9, 14, 7.5, 6.5, (x, y, uu, v) => pick(ramp('#4a3418 #6a4c24 #8a6a38 #a88a52 #c8aa6c'), cl(0.55 - uu * 0.25 - v * 0.2 + (hash(x, y, 2) - 0.5) * 0.15), x, y));
      for (let i = 4; i < 14; i++) p.set(i, 9, pk('#5a4020')); for (let j = 8; j < 11; j++) p.set(9, j, pk('#3a2810'));
      for (const [bx, by] of [[5, 7], [9, 5], [12, 7], [7, 4], [10, 8], [4, 9]]) blob(p, bx, by, 2.3, ramp('#4a3014 #6a4a22 #8c6a36 #b08e52 #d0b070'), { sq: 0.8, seed: bx });
      p.set(6, 6, pk('#e0c890')); p.set(11, 5, pk('#e0c890'));
    }),
    stool: () => spr('chip-stool', 18, 22, (p) => {
      for (let j = 8; j < 18; j++) { p.set(8, j, pick(ST, 0.85, 8, j)); p.set(9, j, pick(ST, 0.4, 9, j)); }
      ell(p, 9, 17.5, 5, 1.8, (x, y, uu) => pick(ST, cl(0.7 - uu * 0.3), x, y)); for (let i = 5; i < 14; i++) p.set(i, 18, pick(ST, 0.25, i, 0));
      ell(p, 9, 6.5, 6.5, 3.6, (x, y, uu, v) => (v > 0.45 ? pick(LR, 0.3, x, y) : pick(LR, cl(0.8 - uu * 0.3 - v * 0.25), x, y))); ell(p, 7, 5, 1.3, 0.8, () => pk('#fcb8a8'));
    }),
  },
  counter: (w) => once('chip-counter' + w, () => {
    const PW = w * 16 + 2, p = new Pix(PW, 26);
    for (let y = 9; y < 25; y++) for (let x = 1; x < PW - 1; x++) { const v = y - 9; let s;
      if (v < 5) s = 0.78 + (v === 0 ? 0.16 : 0) - (v === 4 ? 0.22 : 0) + (vnoise(x, v * 5, 7, 2) - 0.5) * 0.08 + (((x + v) % 17) < 2 ? 0.1 : 0);
      else if (v === 5) s = 0.95; else if (v === 15) s = 0.08;
      else { const u = (x - 1) % 16; s = 0.52 - (x / PW) * 0.1; if (u === 0 || u === 15) s = 0.25; else if (u === 1) s = 0.8; if (v === 6 || v === 7) s = v === 6 ? 0.9 : 0.35; if (v === 8 || v === 9) s = null; if ((u === 3 || u === 12) && (v === 8 || v === 13)) s = 0.95; }
      p.set(x, y, s === null ? pick(BT, v === 8 ? 0.85 : 0.5, x, y) : pick(ST, cl(s), x, y)); }
    // the fryer: steel tank, two basket lids, a glowing front window and a handle
    box(p, 2, 1, 14, 9, ST, { s: 0.55 });
    for (let i = 3; i < 9; i++) for (let j = 2; j < 5; j++) p.set(i, j, pick(PAL.iron, 0.3 + (i === 3 ? 0.15 : 0), i, j));
    for (let i = 9; i < 15; i++) for (let j = 2; j < 5; j++) p.set(i, j, pick(PAL.iron, 0.3 + (i === 9 ? 0.15 : 0), i, j));
    for (const hx of [5, 11]) for (let i = 0; i < 3; i++) p.set(hx + i, 6, pick(ST, 0.9 - i * 0.2, i, 0));
    for (let i = 4; i < 14; i++) { p.set(i, 7, pk('#e88a28')); p.set(i, 8, pk('#a84a10')); } // lit front
    // chip scoops hung on a rail, then the parcels, a vinegar bottle and salt
    for (let i = 20; i < 31; i++) p.set(i, 5, pick(ST, 0.6, i, 0));
    for (const sx of [21, 26]) { for (let j = 6; j < 8; j++) p.set(sx, j, pick(ST, 0.7, 0, 0)); for (let j = 8; j < 11; j++) for (let i = sx - 1; i < sx + 3; i++) p.set(i, j, pick(ST, j === 8 ? 0.95 : 0.55 - (i - sx) * 0.1, i, j)); }
    const par = (px, py) => { for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) { if (j < 2 && (i < 1 || i > 5)) continue; p.set(px + i, py + 2 + j, pk(j % 2 ? '#e8e4d4' : '#d8d4c0')); if ((i + j) % 3 === 0 && j > 1) p.set(px + i, py + 2 + j, pk('#7a7a78')); }
      for (let i = 1; i < 6; i++) { p.set(px + i, py + 1, pk(i % 2 ? '#f0c040' : '#d8a028')); p.set(px + i, py, pk('#f8dc6a')); } p.set(px + 3, py - 1, pk('#f8dc6a')); p.set(px + 1, py - 1, pk('#e0b038')); };
    par(w * 16 - 14, 1); par(w * 16 - 7, 3);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) { if (j < 3 && i !== 1 && i !== 2) continue; p.set(36 + i, 2 + j, pick(BRN, cl(0.55 - (i - 1.5) * 0.15), i, j)); } p.set(37, 2, pk('#f4f4f4')); p.set(38, 2, pk('#f4f4f4'));
    outline(p, 0.4); return p.canvas();
  }),
  over(m, t, out) { // steam off the fryer, sizzle glow
    out.push({ x: 0, y: 0, w: 1, h: 1, z: 2, draw: (ctx, X, Y, TS) => { const q = TS / 16; for (let i = 0; i < 10; i++) { const u = (t * 0.45 + i * 0.1) % 1, sx = X + (4.65 + Math.sin(u * 5 + i * 2) * 0.22 + (i % 3) * 0.07) * TS, sy = Y + (3.05 - u * 1.7) * TS; ctx.fillStyle = `rgba(255,255,255,${(0.5 * (1 - u)).toFixed(2)})`; ctx.fillRect(Math.round(sx), Math.round(sy), q * (u < 0.5 ? 2 : 3), q * 2); } } });
    out.push(glowItem('255,170,70', 4.55, 2.9, 1.1, 0.26 + Math.sin(t * 7) * 0.05));
  },
};


export default { chippy };
