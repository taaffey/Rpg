// ===== Themed interiors, part 6: beachbar (Kilnhaven's tiki bar look: bamboo, thatch, neon and a lava-glow window) =====
import { pk, ramp, PAL, Pix, cl, mix, dk, hash, vnoise, fbm, vor, pick, blob, outline, once, glowItem, plankPx, GR, box, ell, line, spr, win, FR, text, frameAt, bedGen, tableGen, cylinder } from './roomkit.js';

const BAM = ramp('#3a2a08 #5e4410 #86641a #aa8426 #cca43a #e4c258 #f4dc84');
const BAMW = ramp('#1a2a08 #2e4410 #46661c #648a2a #86ac3a #aacc58 #cce486');
const THT = ramp('#3a2a10 #5a4418 #7e6226 #a08034 #c4a048 #dcbe62 #ecd684');
const DECK = ramp('#3a3a38 #52504a #6a665a #86806e #a49c86 #c0b8a0 #d8d0b8');
const SANDB = PAL.sand, LAVA = PAL.lava, BAS = PAL.basalt, IRON = PAL.iron, ST = PAL.steel;
const PINK = '#ff5ab4', CYAN = '#38e0f0', YEL = '#ffe040';
const WOODD = ramp('#1a0c06 #2e1a0c #44280e #5e3a16 #7a4e20 #966428 #b07a34');

function beachFloor(x, y) {
  let c = plankPx(DECK, x, y, 17);
  const dune = vnoise(x, y, 16, 41) * 0.5 + vnoise(x, y, 6, 42) * 0.3 + (y - 70) / 250 + (Math.abs(x - 88) < 24 ? (y - 70) / 170 : 0) + (x < 34 || x > 142 ? 0.1 : 0);
  if (dune > 0.72) { const rip = Math.sin(x * 0.5 + y * 0.9 + vnoise(x, y, 8, 5) * 4); c = pick(SANDB, cl(0.62 + rip * 0.12 + (dune - 0.72) * 0.5 + (hash(x, y, 4) - 0.5) * 0.08), x, y); if (dune < 0.75 && hash(x, y, 5) < 0.6) c = mix(c, pick(DECK, 0.5, x, y), 0.4); }
  return c;
}
function beachFace(x, f) {
  const edge = 6 + Math.floor(hash(x >> 1, 3, 71) * 3) + (((x * 3) % 7) === 0 ? 1 : 0);
  if (f <= edge) { // thatch skirt along the top
    let s = 0.55 + (vnoise(x * 0.6, f * 0.5, 3, 4) - 0.5) * 0.3 - (f / 10) * 0.15 + (hash(x, f, 5) - 0.5) * 0.12; if (((x + f * 2) % 5) === 0) s -= 0.14; if (f === edge) s -= 0.2; if (f <= 1) s -= 0.15; return pick(THT, cl(s), x, f);
  }
  if (f >= 30) return pick(WOODD, f === 30 ? 0.5 : 0.1, x, f);
  if (f === 18 || f === 19) { let s = f === 18 ? 0.85 : 0.3; if (((x - 16) % 12) < 2 && f >= 18) return pick(ramp('#3a2a14 #5a4624 #7a6234 #9a7e44'), 0.7 - (f - 18) * 0.3, x, f); return pick(BAM, s, x, f); }
  if (f > 19) { const a = ((x + f) & 3), b = ((x - f) & 3); let s = 0.42 + (a === 0 ? 0.14 : 0) + (b === 0 ? -0.1 : 0) + (hash(x >> 2, f >> 2, 6) - 0.5) * 0.12; if (((x + f) >> 2) % 2) s += 0.05; return pick(THT, cl(s), x, f); } // woven mat
  const u = ((x - 16) % 6 + 6) % 6, pole = Math.floor((x - 16) / 6), node = ((f + pole * 5) % 14) === 0; let s = 0.62 + (hash(pole, 2, 72) - 0.5) * 0.14 + (vnoise(x * 0.3, f * 0.2, 4, 3) - 0.5) * 0.1;
  if (u === 0) s = 0.1; else if (u === 1) s += 0.2; else if (u === 5) s -= 0.18; if (node) s -= 0.25; else if (((f + pole * 5) % 14) === 1) s += 0.1;
  return pick(BAMW, cl(s), x, f);
}
const NEONS = [['BAR', PINK], ['OPEN', CYAN], ['TIKI', YEL], ['LAVA', '#ff7a30']];
const beachbar = {
  mg: 4, light: { base: 0.82, vk: 0.34, min: 0.32, tint: [0.18, -0.02, 0.0] }, spill: '#ffd0a0', thr: ramp('#3a2a14 #5e4a2c #86703e #aa9058 #ccb070'), doorOut: pk('#3a1a14'),
  floor: (x, y) => beachFloor(x, y), face: (x, f) => beachFace(x, f),
  cap: (x, y, d, outer, jamb) => { let s = 0.55 + (vnoise(x, y, 3, 31) - 0.5) * 0.25 + (((x + y * 2) % 5) === 0 ? -0.12 : 0); if (d <= 1) s += 0.2; else if (d === 2) s += 0.05; if (outer === 0) s = 0.12; else if (outer === 1) s -= 0.15; if (jamb) s = 0.2; return pick(THT, cl(s), x, y); },
  feat: (kind) => (kind === 'inn' ? [['win', 1.75], ['neon', 5], ['win', 8.25], ['lights', 5]]
    : kind === 'general' ? [['neon', 2.3], ['win', 5], ['neon', 7.8], ['lights', 5]]
    : kind === 'smith' ? [['tools', 2], ['forge', 5], ['tools', 8], ['lights', 5]]
    : [['win', 3], ['neon', 5.6], ['win', 8], ['lights', 5]]),
  pre(u) { // a woven grass mat under the middle of the room
    if (u.kind === 'smith') return;
    const x0 = 44, y0 = 48, w = 88, h = 48;
    for (let v = 0; v < h; v++) for (let uu = 0; uu < w; uu++) { const x = x0 + uu, y = y0 + v, e = Math.min(uu, v, w - 1 - uu, h - 1 - v); let c; if (e === 0) c = pk('#3a2a10'); else if (e <= 2) c = pk(((uu + v) & 3) < 2 ? '#e8508a' : '#2ab8c8'); else c = pick(ramp('#0a3a40 #14606a #1e8890 #38b0b8 #6cd0d0'), cl(0.5 + (((uu >> 1) + (v >> 1)) & 1 ? 0.1 : -0.04) + (hash(uu, v, 2) - 0.5) * 0.1), x, y); u.S(x, y, c); }
  },
  fit: {
    neon(u, cx) { const [txt, col] = NEONS[Math.floor(hash(cx, u.m.name.length, 5) * 4)], w = txt.length * 4 - 1, set = (x, y, c) => u.S(x, u.wy(y), c), bw = w + 8;
      FR(u, cx - (bw >> 1), 6, bw, 12, (i, j) => (i === 0 || j === 0 || i === bw - 1 || j === 11) ? pick(BAM, 0.3, i, j) : pk('#14101a'));
      text(set, cx - (w >> 1), 9, txt, pk(col)); for (let i = 0; i < bw - 4; i += 2) set(cx - (bw >> 1) + 2 + i, 16, pk(i % 4 ? col : '#ffffff'));
      u.anim.push({ k: 'neon', x: cx, y: u.wy(12), col: col === PINK ? '255,90,180' : col === CYAN ? '56,224,240' : col === YEL ? '255,224,64' : '255,122,48' }); u.lights.push([cx, 6, 0.22, 34]); },
    win(u, cx) { // a lava-glow window: the volcano and its streams against an orange night
      win(u, cx, 10, 4, 21, BAM, (gx, gy, gw, gh) => {
        let c = mix(pk('#1a0a2a'), pk('#d8501e'), (gy / gh) ** 1.5); if (hash(gx, gy, 3) < 0.03 && gy < gh * 0.4) c = pk('#ffe8c0');
        const cone = gh * 0.45 + Math.abs(gx - 8) * 1.15; if (gy > cone) { c = pick(BAS, 0.2 + hash(gx, gy, 2) * 0.1, gx, gy); if (gx === 8 || (gx === 7 && gy > cone + 3) || (gx === 9 && gy > cone + 5)) c = pick(LAVA, 0.6 + hash(gx, gy, 4) * 0.3, gx, gy); if (gy - cone < 1.6 && Math.abs(gx - 8) < 3) c = pick(LAVA, 0.85, gx, gy); }
        if (gy > gh * 0.82) c = mix(c, pk('#0a0604'), 0.8); if ((gx === 1 || gx === 17) && gy > gh * 0.3) c = pk('#0a0604'); return c; }, { mx: 0 });
      u.anim.push({ k: 'lavawin', x: cx - 8, y: u.wy(6), w: 16, h: 14 }); u.lights.push([cx, 4, 0.34, 46]);
    },
    lights(u) { // a string of fairy lights along the top of the wall
      for (let x = 17; x < 159; x++) { const ph = ((x - 16) % 24) / 24, f = Math.round(8 + Math.sin(ph * Math.PI) * 3); u.S(x, u.wy(f), pk('#2a1a0c')); }
      const cols = [PINK, CYAN, YEL, '#ff7a30', '#7aff7a'];
      for (let x = 20, i = 0; x < 158; x += 6, i++) { const ph = ((x - 16) % 24) / 24, f = Math.round(8 + Math.sin(ph * Math.PI) * 3); u.S(x, u.wy(f + 1), pk('#2a1a0c')); u.S(x, u.wy(f + 2), pk(cols[i % 5])); u.S(x + 1, u.wy(f + 2), dk(pk(cols[i % 5]), 0.7)); u.anim.push({ k: 'bulb', x, y: u.wy(f + 2), col: cols[i % 5], i }); }
    },
    forge(u, cx) { // a basalt fire pit forge, lava glowing in the arch
      for (let f = 3; f < 31; f++) { const hw = f < 12 ? 8 + (f - 3) : 23; for (let x = cx - hw; x < cx + hw; x++) { const q = vor(x, f, 6, 0.9, 77); u.S(x, u.wy(f), q.e < 0.9 ? pick(BAS, 0.1, x, f) : pick(BAS, cl(0.42 + (q.h - 0.5) * 0.3 + (q.dx + q.dy < 0 ? 0.08 : -0.04) - (x > cx + hw - 5 ? 0.1 : 0)), x, f)); } }
      for (let f = 15; f < 31; f++) for (let x = cx - 12; x < cx + 12; x++) { const ar = f - 15 < 4 && Math.abs(x + 0.5 - cx) > 12 - [5, 3, 2, 1][f - 15]; if (!ar) u.S(x, u.wy(f), f < 20 ? pk('#1a0804') : mix(pk('#6a1400'), pk('#ff9a28'), cl((f - 20) / 10))); }
      for (let x = cx - 14; x < cx + 14; x++) { u.S(x, u.wy(28), pick(BAS, 0.8, x, 0)); u.S(x, u.wy(29), pick(BAS, 0.35, x, 0)); }
      u.anim.push({ k: 'coals', x: cx - 11, y: u.wy(22) }); u.anim.push({ k: 'glow', x: cx, y: 6, r: 3.4, a: 0.55 }); u.lights.push([cx, 6, 0.8, 72]);
    },
    tools(u, cx) {
      for (let x = cx - 9; x < cx + 9; x++) { u.S(x, u.wy(6), pick(BAM, 0.85, x, 0)); u.S(x, u.wy(7), pick(BAM, 0.3, x, 0)); }
      for (let f = 8; f < 17; f++) { u.S(cx - 6, u.wy(f), pick(WOODD, 0.6, 0, f)); u.S(cx - 5, u.wy(f), pick(WOODD, 0.3, 0, f)); u.S(cx + 2, u.wy(f), pick(IRON, 0.6, 0, f)); u.S(cx + 4, u.wy(f), pick(IRON, 0.5, 0, f)); }
      for (let x = cx - 8; x < cx - 2; x++) { u.S(x, u.wy(8), pick(IRON, 0.7, x, 0)); u.S(x, u.wy(9), pick(IRON, 0.4, x, 0)); }
      for (let a = 0; a < 10; a++) { const t = a / 9 * Math.PI * 2; u.S(cx + 8 + Math.round(Math.cos(t) * 2.6), u.wy(11) + Math.round(Math.sin(t) * 2.6), pk(a % 2 ? '#ff5ab4' : '#fff0f8')); } // a rubber ring
    },
  },
  shadow: (k) => (k === 'stool' ? [5, 2, 17] : undefined),
  spr: {
    bed: () => bedGen('beach-bed', { W: BAM, pat: (u, v) => { let c = pk(((u >> 2) & 1) ? '#1aa8b8' : '#18889a'); if ((u + v) % 7 === 0) c = pk('#f8f0e0'); if (hash(u >> 1, v >> 1, 8) < 0.12) c = pk(PINK); if (hash(u >> 1, v >> 1, 9) < 0.06) c = pk(YEL); return c; } }),
    table: () => tableGen('beach-table', BAM, (p) => {
      for (let j = 0; j < 3; j++) for (let i = 0; i < 5 - j * 2; i++) p.set(4 + i + j, 9 + j, pick(ramp('#a01858 #d02878 #ff5ab4 #ff98d0'), cl(0.7 - (i - 2) * 0.12), i, j)); p.set(6, 12, pk('#e8e8f0')); p.set(6, 13, pk('#c8c8d8')); line(p, 6, 8, 8, 5, pk('#f8f8f0')); p.set(8, 4, pk('#ffe040')); p.set(9, 5, pk('#38e0f0')); p.set(7, 4, pk('#ff5a8a'));
      for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) p.set(12 + i, 8 + j, pick(ramp('#0a4a88 #1a78c8 #4aa8f0 #a8d8ff'), cl(0.65 - i * 0.15), i, j)); p.set(13, 7, pk('#f8f8f0')); p.set(14, 6, pk('#f08a20')); p.set(11, 12, pk('#ffe070'));
    }, BAM),
    surf: () => spr('beach-surf', 18, 34, (p) => {
      for (let i = 1; i < 17; i++) { p.set(i, 31, pick(BAM, 0.4, i, 0)); p.set(i, 30, pick(BAM, 0.8, i, 0)); } for (const lx of [2, 15]) for (let j = 27; j < 33; j++) p.set(lx, j, pick(BAM, 0.5, lx, j));
      for (const [bx, h, c1, c2] of [[2, 27, '#18a8b8', '#f8f0e0'], [7, 30, '#ff5a8a', '#ffe040'], [12, 25, '#f8f0e0', '#e85a1c']]) for (let j = 0; j < h; j++) { const t = j / h, hw = 2.6 * Math.min(1, Math.sqrt(1 - (1 - Math.min(1, (j + 1) / 5)) ** 2)) * (1 - t * 0.08); for (let i = 0; i < 6; i++) { if (Math.abs(i + 0.5 - 3) > hw) continue; let c = pk(j % 8 < 3 ? c2 : c1); if (i === 0) c = mix(c, pk('#ffffff'), 0.35); if (i >= 4) c = dk(c, 0.7); if (i === 3 && j > 3 && j < h - 4) c = dk(c, 0.82); p.set(bx + i, 29 - j, c); } p.set(bx + 3, 29, pk('#2a2a30')); p.set(bx + 2, 28, pk('#2a2a30')); p.set(bx + 4, 28, pk('#2a2a30')); }
    }),
    lava: (t) => { const f = frameAt(t, 1.4, 4); return spr('beach-lava' + f, 18, 30, (p) => {
      box(p, 3, 22, 12, 7, BAM, { s: 0.55 }); for (let i = 4; i < 14; i++) p.set(i, 25, pick(BAM, 0.25, i, 0));
      for (let j = 17; j < 22; j++) for (let i = 5; i < 13; i++) p.set(i, j, pick(PAL.gold, cl(0.7 - (i - 8) * 0.1 + (j === 17 ? 0.15 : 0)), i, j));
      for (let j = 3; j < 18; j++) { const hw = 1.6 + (j - 3) * 0.28; for (let x = Math.floor(9 - hw); x < 9 + hw; x++) { const u = (x + 0.5 - 9) / hw; p.set(x, j, mix(pk('#7a1a4a'), pk('#ff4a6a'), cl(0.4 + (j - 3) / 25 - u * 0.15))); if (Math.abs(u) > 0.85) p.set(x, j, mix(p.get(x, j), pk('#ffffff'), 0.35)); } }
      for (const [bx, by0, r] of [[9, 14 - ((f * 3) % 9), 2.4], [8, 6 + ((f * 5) % 7), 1.8], [10, 11 - ((f * 2) % 5), 1.4]]) ell(p, bx, Math.max(5, by0), r, r * 1.2, (x, y, uu, v) => pick(ramp('#ff8a2a #ffb040 #ffd870 #fff0a0'), cl(0.5 - uu * 0.2 - v * 0.2), x, y));
      for (let j = 1; j < 4; j++) for (let i = 7; i < 11; i++) p.set(i, j, pick(PAL.gold, cl(0.7 - (i - 8) * 0.15), i, j)); p.set(9, 0, pk('#ffe8a0'));
    }); },
    tiki: () => spr('beach-tiki', 18, 34, (p) => {
      for (let j = 6; j < 32; j++) for (let i = 4; i < 14; i++) p.set(i, j, pick(WOODD, cl(0.5 - (i - 8) * 0.07 + (vnoise(i, j * 3, 3, 4) - 0.5) * 0.18), i, j));
      for (let i = 3; i < 15; i++) { p.set(i, 31, pick(WOODD, 0.2, i, 31)); p.set(i, 32, pick(WOODD, 0.1, i, 32)); }
      for (const [fy, c] of [[8, '#d02828'], [20, '#e8a020']]) { for (let i = 5; i < 13; i++) for (let j = 0; j < 8; j++) { const edge = j === 0 || j === 7 || i === 5 || i === 12; p.set(i, fy + j, edge ? pick(WOODD, 0.15, i, j) : pick(WOODD, 0.55 - (i - 8) * 0.04, i, j)); }
        for (const ex of [6, 10]) { p.set(ex, fy + 2, pk('#fff8e0')); p.set(ex + 1, fy + 2, pk('#fff8e0')); p.set(ex, fy + 3, pk('#101010')); p.set(ex + 1, fy + 3, pk(c)); } for (let i = 6; i < 12; i++) { p.set(i, fy + 6, pk(c)); if (i % 2) p.set(i, fy + 5, pk('#fff8e0')); } p.set(8, fy + 4, pick(WOODD, 0.2, 0, 0)); p.set(9, fy + 4, pick(WOODD, 0.2, 0, 0)); }
      for (let k = 0; k < 7; k++) { const a = -2.6 + k * 0.45, len = 7 - Math.abs(k - 3) * 0.7; line(p, 9, 7, 9 + Math.cos(a) * len, 7 + Math.sin(a) * len, pk(['#d02828', '#e8a020', '#18a8b8', '#ff5ab4'][k % 4])); }
    }),
    stool: () => spr('beach-stool', 18, 24, (p) => {
      for (const [x0, x1] of [[4, 6], [13, 11], [9, 9]]) line(p, x0, 21, x1, 12, pick(BAM, 0.55, 0, 0)); for (let i = 5; i < 13; i++) p.set(i, 18, pick(BAM, 0.4, i, 0));
      ell(p, 9, 10.5, 6.4, 3.4, (x, y, uu, v) => (v > 0.5 ? pick(BAM, 0.3, x, y) : pick(ramp('#a01858 #d02878 #ff5ab4 #ff98d0'), cl(0.62 - uu * 0.25 - v * 0.25 + (((x + y) & 1) ? 0.04 : 0)), x, y)));
    }),
    blender: (t) => { const f = frameAt(t, 6, 2); return spr('beach-blender' + f, 18, 30, (p) => {
      box(p, 1, 17, 16, 11, BAM, { s: 0.55 }); for (let i = 2; i < 16; i++) p.set(i, 21, pick(BAM, 0.25, i, 0)); for (let j = 22; j < 27; j++) for (let i = 3; i < 15; i += 4) p.set(i, j, pick(BAM, 0.2, i, j));
      for (let j = 12; j < 17; j++) for (let i = 4; i < 12; i++) p.set(i, j, pick(PAL.red, cl(0.6 - (i - 7) * 0.08 + (j === 12 ? 0.2 : 0)), i, j)); p.set(6, 14, pk('#38e0f0')); p.set(8, 14, pk('#ffe040'));
      for (let j = 2; j < 12; j++) { const hw = 3 + (j - 2) * 0.12; for (let x = Math.floor(8 - hw); x < 8 + hw; x++) { const u = (x + 0.5 - 8) / hw, sw = ((x + j + f * 2) % 4) < 2; p.set(x, j, j > 4 ? (sw ? pk('#ff6a9a') : pk('#ff9ab8')) : pk('#e8f4f8')); if (Math.abs(u) > 0.8) p.set(x, j, pk('#cfe4ec')); } } for (let i = 4; i < 12; i++) p.set(i, 1, pk('#2a2a34')); p.set(8, 0, pk('#2a2a34'));
      for (const [ux, c] of [[13, '#ff5a8a'], [15, '#38e0f0']]) { p.set(ux, 13, pk('#e8e0c8')); p.set(ux, 14, pk('#e8e0c8')); for (let i = -1; i <= 1; i++) p.set(ux + i, 12, pk(c)); }
    }); },
  },
  counter: (w) => once('beach-counter' + w, () => {
    const PW = w * 16 + 2, p = new Pix(PW, 26);
    for (let y = 9; y < 25; y++) for (let x = 1; x < PW - 1; x++) { const v = y - 9; let c;
      if (v < 5) c = pick(WOODD, cl(0.62 + (v === 0 ? 0.16 : 0) - (v === 4 ? 0.2 : 0) + (vnoise(x, v * 4, 6, 2) - 0.5) * 0.14), x, y);
      else if (v === 5) c = pick(BAM, 0.9, x, y); else if (v === 15) c = pick(WOODD, 0.1, x, y);
      else { const u = (x - 1) % 6, node = ((v + Math.floor((x - 1) / 6) * 5) % 10) === 0; let s = 0.6 + (hash(Math.floor((x - 1) / 6), 1, 3) - 0.5) * 0.12; if (u === 0) s = 0.12; else if (u === 1) s += 0.2; else if (u === 5) s -= 0.18; if (node) s -= 0.25; c = pick(BAM, cl(s), x, y); if (v === 9 || v === 13) c = ((x + v) & 1) ? pk('#8a6a3a') : pk('#5a4424'); }
      p.set(x, y, c); }
    for (const bx of [3, 7, 11]) { ell(p, bx + 1.5, 6, 2.6, 2.6, (x, y, uu, v) => pick(ramp('#3a2410 #5a3a1c #7a5428 #a07a3c'), cl(0.6 - uu * 0.25 - v * 0.2), x, y)); line(p, bx + 2, 4, bx + 4, 0, pk('#f8f8f0')); p.set(bx + 4, 0, pk(['#ff5a8a', '#38e0f0', '#ffe040'][(bx / 4) | 0])); p.set(bx + 5, 0, pk(['#ff5a8a', '#38e0f0', '#ffe040'][(bx / 4) | 0])); }
    for (let j = 0; j < 7; j++) { p.set(37, 3 + j, pick(THT, 0.7 - j * 0.05, 0, j)); p.set(38, 3 + j, pick(THT, 0.5 - j * 0.05, 0, j)); p.set(36, 3 + j, pick(THT, 0.4, 0, j)); } for (const [dx, dy] of [[36, 1], [38, 1], [37, 0], [35, 2], [39, 2]]) p.set(dx, dy, pick(ramp('#1a4a10 #2a6a1a #4a9a2a #7ac44a'), 0.7, 0, 0)); // a pineapple
    for (const bx of [w * 16 - 14, w * 16 - 8]) { ell(p, bx + 2, 6, 2.6, 2.6, (x, y, uu, v) => pick(ramp('#3a2410 #5a3a1c #7a5428 #a07a3c'), cl(0.6 - uu * 0.25 - v * 0.2), x, y)); p.set(bx + 4, 1, pk('#38e0f0')); p.set(bx + 4, 2, pk('#f8f8f0')); p.set(bx + 3, 3, pk('#f8f8f0')); }
    outline(p, 0.4); return p.canvas();
  }),
  over(m, t, out, s) {
    for (const a of s.anim) {
      if (a.k === 'neon') { const on = Math.sin(t * 13 + a.x) > -0.9 && !(Math.floor(t * 0.7 + a.x) % 6 === 0 && (t * 11) % 1 < 0.3); out.push(glowItem(a.col, a.x / 16, a.y / 16, 1.5, on ? 0.4 + Math.sin(t * 8) * 0.04 : 0.08, 0)); }
      if (a.k === 'lavawin') out.push({ x: 0, y: 0, w: 1, h: 1, z: 0, draw: (ctx, X, Y, TS) => { const q = TS / 16, g = 0.5 + Math.sin(t * 1.7) * 0.25; ctx.save(); ctx.beginPath(); ctx.rect(X + a.x * q, Y + a.y * q, a.w * q, a.h * q); ctx.clip(); ctx.fillStyle = `rgba(255,${(100 + g * 60) | 0},30,${(0.1 + g * 0.16).toFixed(2)})`; ctx.fillRect(X + a.x * q, Y + a.y * q, a.w * q, a.h * q);
        for (let i = 0; i < 6; i++) { const u = (t * 0.5 + i / 6) % 1, ex = a.x + 8 + Math.sin(u * 6 + i * 2) * 3 * u, ey = a.y + 6 - u * 7; ctx.fillStyle = `rgba(255,${(180 - u * 90) | 0},60,${(1 - u).toFixed(2)})`; ctx.fillRect(Math.round(X + ex * q), Math.round(Y + ey * q), q, q); } ctx.restore(); } });
      if (a.k === 'bulb') { const on = 0.4 + 0.6 * Math.max(0, Math.sin(t * 2.2 + a.i * 1.7)); out.push(glowItem(a.col.replace('#', '') && hexRgb(a.col), a.x / 16, a.y / 16, 0.5, 0.35 * on, 0)); }
    }
    for (const [x, y, k] of m.decor || []) if (k === 'lava') out.push(glowItem('255,70,80', x + 0.5, y + 0.5, 1.3, 0.3 + Math.sin(t * 1.4 + x * 2) * 0.08, 0));
  },
};
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return `${n >> 16},${(n >> 8) & 255},${n & 255}`; }

export default { beachbar };
