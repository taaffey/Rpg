// ===== Themed interiors, part 5: oasis (inside the Oasis kebab van) =====
import { pk, ramp, PAL, Pix, cl, mix, dk, hash, vnoise, fbm, pick, blob, outline, once, glowItem, GR, box, ell, line, spr, win, FR, text, frameAt, PL } from './roomkit.js';

const ST = PAL.steel;
const DP = ramp('#30343e #444a56 #5a626e #727a88 #8e96a4 #aab2be #c8d0da');
const SAND = ramp('#8a6034 #a2763f #b98c4e #cca260 #dcb874 #e9cc8c #f4dfaa');
const RDM = ramp('#3a0a0c #5e1214 #861c1c #a82a24 #c8402e #e0603e #f08a5a');
const CM = ramp('#3a2810 #5a4020 #7a5a30 #9a7a44 #b8985a #d4b474 #e8d09a');
const MEAT = ramp('#3a1408 #5a2410 #7a3a1a #9a5430 #b87448 #d4966a');

function oasisFloor(x, y) { // aluminium diamond plate, sand blown in from the door and the corners
  const cell = ((x >> 3) + (y >> 3)) & 1, u = x & 7, v = y & 7;
  let s = 0.5 + (vnoise(x, y, 6, 3) - 0.5) * 0.14;
  const d = cell ? Math.abs(u - v) : Math.abs(u + v - 7); if (d < 1.2) s += 0.2; else if (d < 2.2) s -= 0.1;
  if (u === 0 || v === 0) s -= 0.12;
  let c = pick(DP, cl(s), x, y);
  const dune = vnoise(x, y, 18, 41) * 0.55 + vnoise(x, y, 7, 42) * 0.3 + (y - 60) / 260 + (Math.abs(x - 88) < 26 ? (y - 70) / 160 : 0) + (x < 40 || x > 140 ? 0.12 : 0);
  if (dune > 0.7) { const rip = Math.sin(x * 0.5 + y * 0.9 + vnoise(x, y, 8, 5) * 4); c = pick(SAND, cl(0.55 + rip * 0.13 + (dune - 0.7) * 0.5 + (hash(x, y, 4) - 0.5) * 0.08), x, y); if (dune < 0.73 && hash(x, y, 5) < 0.6) c = mix(c, pick(DP, 0.4, x, y), 0.4); }
  else if (hash(x, y, 6) < 0.035) c = pick(SAND, 0.6, x, y);
  return c;
}
function oasisFace(x, f) {
  if (f <= 2) return pick(ST, [0.9, 0.55, 0.2][f], x, f);
  if (f >= 30) return pick(DP, f === 30 ? 0.5 : 0.1, x, f);
  if (f === 18 || f === 19) { const st = ((x >> 3) & 1) ? RDM : ramp('#8a6a10 #b8921c #e8c030 #f8e060'); return f === 18 ? pick(st, 0.8, x, f) : pick(st, 0.3, x, f); } // the van's livery stripe
  if (f > 19) { const u = x & 7, v = (f - 20) & 7, d = ((((x >> 3) + ((f - 20) >> 3)) & 1) ? Math.abs(u - v) : Math.abs(u + v - 7)); let s = 0.38 + (d < 1.2 ? 0.16 : 0) + (vnoise(x, f, 6, 2) - 0.5) * 0.1; return pick(DP, cl(s), x, f); }
  const pu = ((x - 16) % 24 + 24) % 24; let s = 0.62 + (vnoise(x * 0.3, f * 3, 5, 7) - 0.5) * 0.14 - (f - 3) * 0.006; // brushed steel panels with rivets
  if (pu === 0) s = 0.2; else if (pu === 1) s += 0.2; else if (pu === 23) s -= 0.12;
  if ((pu === 3 || pu === 21) && (f === 5 || f === 15)) s = 0.95; if (f === 3) s -= 0.18;
  return pick(ST, cl(s), x, f);
}
const camel = (fr) => spr('oasis-camel' + fr, 28, 18, (p) => {
  const bob = fr === 1 ? 1 : 0;
  for (let j = 7; j < 18; j++) for (let i = 16; i < 28; i++) { const hw = 5 + (j - 7) * 0.2; if (Math.abs(i + 0.5 - (22 + (j - 7) * 0.3)) > hw) continue; p.set(i, j, pick(CM, cl(0.62 - (i - 20) * 0.05 + (hash(i, j, 3) - 0.5) * 0.1), i, j)); } // neck
  ell(p, 12, 8 + bob, 8, 5.4, (x, y, uu, v) => pick(CM, cl(0.66 - uu * 0.14 - v * 0.2 + (hash(x, y, 2) - 0.5) * 0.08), x, y)); // head
  ell(p, 5, 10.5 + bob, 5, 3.8, (x, y, uu, v) => pick(CM, cl(0.72 - uu * 0.1 - v * 0.24), x, y)); // muzzle
  ell(p, 4, 13.2 + bob + (fr === 2 ? 0 : 0), 3.6, 1.5, (x, y, uu, v) => pick(CM, cl(0.5 - v * 0.2), x, y)); // chewing lip
  for (const ex of [13, 17]) for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) if (i + j < 5) p.set(ex + i, 0 + j + bob, pick(CM, cl(0.45 + i * 0.08 - j * 0.04), i, j)); // ears
  p.set(14, 1 + bob, pk('#a05a4a')); p.set(18, 1 + bob, pk('#a05a4a'));
  ell(p, 11, 6.5 + bob, 2.4, 2, (x, y, uu, v) => (fr === 2 ? pick(CM, 0.2, x, y) : Math.hypot(uu, v) > 0.7 ? pk('#2a1810') : pk('#fff8e8'))); if (fr !== 2) { p.set(10, 6 + bob, pk('#1a0c08')); p.set(11, 6 + bob, pk('#1a0c08')); p.set(10, 7 + bob, pk('#1a0c08')); }
  for (const k of [-1, 0, 1, 2]) p.set(9 + k, 4 + bob - (k === 2 ? 1 : 0), pk('#2a1810')); // lashes
  p.set(2, 9 + bob, pk('#3a2010')); p.set(3, 9 + bob, pk('#3a2010')); line(p, 1, 12 + bob, 6, 12 + bob, pk('#4a2a18'));
  if (fr === 1) { p.set(3, 14, pk('#d86a7a')); p.set(4, 14, pk('#d86a7a')); p.set(3, 15, pk('#d86a7a')); } // tongue out, rudely
}, 0.38);
const oasis = {
  mg: 4, light: { base: 0.78, vk: 0.3, min: 0.34, tint: [0.16, 0.05, -0.2] }, spill: '#ffe6a0', thr: DP, doorOut: pk('#c8a060'),
  floor: (x, y) => oasisFloor(x, y), face: (x, f) => oasisFace(x, f),
  cap: (x, y, d, outer, jamb) => { let s = d <= 1 ? 0.9 : d === 2 ? 0.68 : 0.55 + (vnoise(x, y, 4, 31) - 0.5) * 0.1; if (outer === 0) return pick(RDM, 0.2, x, y); if (outer === 1) return pick(RDM, 0.55, x, y); if (jamb) s = 0.25; return pick(ST, cl(s), x, y); },
  feat: () => [['neon', 2.3], ['hatch', 5], ['sticker', 8.6]],
  fit: {
    neon(u, cx) { // a neon KEBAB sign, one letter on the blink
      FR(u, cx - 14, 4, 29, 12, (i, j) => (i === 0 || j === 0 || i === 28 || j === 11) ? pick(PAL.iron, 0.5, i, j) : pk('#14101a'));
      text((x, y, c) => u.S(x, u.wy(y), c), cx - 11, 7, 'KEBAB', pk('#ff6ab8')); text((x, y, c) => u.S(x, u.wy(y), c), cx - 11, 8, 'KEBAB', pk('#ffd0f0'));
      for (let i = 0; i < 26; i += 2) u.S(cx - 12 + i, u.wy(14), pk('#38d8f0'));
      u.anim.push({ k: 'neon', x: cx, y: u.wy(10) }); u.lights.push([cx, 6, 0.28, 38]);
    },
    hatch(u, cx) { // serving hatch onto the dunes under a striped awning
      win(u, cx, 17, 8, 27, ST, (gx, gy, gw, gh) => {
        const hz = Math.floor(gh * 0.55);
        if (gy < hz) { let c = mix(pk('#58b8f0'), pk('#fff0b8'), (gy / hz) ** 1.6); if (Math.hypot(gx - 6, gy - 3) < 2.6) c = pk('#fffbe8'); return c; }
        const k = gy - hz, dn = Math.sin(gx * 0.32 + 1) * 1.8 + Math.sin(gx * 0.7) * 0.7; let c = pick(SAND, cl(0.78 - (k + dn) * 0.07 + (dn > 1.2 ? 0.1 : 0)), gx, gy); if (k + dn < -0.2 && k < 3) c = pick(SAND, 0.45, gx, gy); if (gy === hz) c = pk('#f8e8b0');
        if (gx >= 21 && gx <= 22 && gy >= hz - 6 && gy < hz + 2) c = pk('#2a4a18'); if (gy === hz - 6 && gx >= 18 && gx <= 25 && (gx + gy) % 2) c = pk('#3a6a20'); if (gy === hz - 5 && gx >= 19 && gx <= 24) c = pk('#2a5a18'); // a palm
        return c; });
      for (let f = 3; f <= 8; f++) for (let x = cx - 20; x < cx + 20; x++) { const sc = f >= 7 && (((x - cx + 20) >> 2) & 1) === 0 && f === 8 ? -1 : 0; if (sc) continue; const stripe = (((x - cx + 20) >> 2) & 1) === 0; u.S(x, u.wy(f), pick(stripe ? RDM : ST, f === 3 ? 0.85 : f === 8 ? 0.25 : 0.62, x, f)); } // awning
      u.anim.push({ k: 'camel', x: cx - 6, y: u.wy(10) }); u.lights.push([cx, 4, 0.45, 56]);
    },
    sticker(u, cx) { // food hygiene rating: five stars, allegedly
      FR(u, cx - 12, 5, 25, 13, (i, j) => (i === 0 || j === 0 || i === 24 || j === 12) ? pk('#1a5a2a') : pk('#e8f4e4'));
      for (let k = 0; k < 5; k++) { u.S(cx - 8 + k * 4, u.wy(8), pk('#e8a820')); u.S(cx - 8 + k * 4, u.wy(9), pk('#f8d048')); u.S(cx - 9 + k * 4, u.wy(9), pk('#e8a820')); u.S(cx - 7 + k * 4, u.wy(9), pk('#e8a820')); }
      text((x, y, c) => u.S(x, u.wy(y), c), cx - 10, 12, 'HYGIENE', pk('#2a6a3a'), 0);
    },
  },
  shadow: (k) => (k === 'spit' ? [6, 2.4, 14] : undefined),
  spr: {
    spit: (t) => { const f = frameAt(t, 5, 6); return spr('oasis-spit' + f, 18, 34, (p) => {
      box(p, 1, 4, 16, 26, PAL.iron, { s: 0.4 });
      for (let j = 8; j < 26; j++) { p.set(2, j, pk(j % 3 ? '#f08a20' : '#ffd060')); p.set(15, j, pk(j % 3 ? '#e07a18' : '#f8c050')); } // heating bars
      for (let j = 3; j < 27; j++) { p.set(8, j, pick(ST, 0.85, 8, j)); p.set(9, j, pick(ST, 0.4, 9, j)); } // the spit
      for (let j = 6; j < 25; j++) { const hw = 2.8 + (24 - j) * 0.17; for (let x = Math.floor(9 - hw); x < 9 + hw; x++) { const a = Math.asin(cl((x + 0.5 - 9) / hw, -1, 1)) + f * 0.55, b = Math.floor(a * 2.2 + 20), tone = hash(b, Math.floor(j / 2), 5); let s = 0.4 + tone * 0.35 - ((x + 0.5 - 9) / hw) * 0.12; if (j < 8) s += 0.15; p.set(x, j, pick(MEAT, cl(s), x, j)); } }
      p.set(5, 9, pk('#f8d8a0')); p.set(12, 12, pk('#f8d8a0')); p.set(7, 17, pk('#f0c890'));
      for (let i = 4; i < 15; i++) { p.set(i, 27, pick(ST, 0.7, i, 27)); p.set(i, 28, pick(ST, 0.3, i, 28)); } p.set(9, 26, pk('#f8c860')); // drip tray
    }); },
    grill: (t) => spr('oasis-grill', 18, 30, (p) => {
      box(p, 1, 14, 16, 14, ST, { s: 0.58 }); for (let j = 17; j < 26; j++) for (let i = 3; i < 15; i++) if (j === 17 || i === 3 || i === 14) p.set(i, j, pick(ST, 0.3, i, j)); for (const kx of [5, 9, 13]) { p.set(kx, 20, pk('#101010')); p.set(kx, 21, pick(ST, 0.9, kx, 21)); }
      for (let i = 2; i < 16; i++) for (let j = 8; j < 14; j++) p.set(i, j, j === 8 ? pick(PAL.iron, 0.7, i, j) : (i % 3 === 0 ? pk('#1a1a20') : pick(PAL.iron, 0.4, i, j)));
      for (const [sx, c] of [[4, '#a84a20'], [8, '#c86a30'], [12, '#8a3a18']]) { for (let j = 4; j < 9; j++) { p.set(sx, j, pk(j === 4 ? '#e8e8f0' : c)); p.set(sx + 1, j, dk(pk(c), 0.7)); } p.set(sx, 3, pk('#d8d8e0')); }
      p.set(6, 6, pk('#f8c050')); p.set(11, 5, pk('#f8c050')); p.set(2, 7, pk('#ff9a30')); p.set(15, 7, pk('#ff9a30'));
    }),
    sauce: () => spr('oasis-sauce', 18, 30, (p) => {
      box(p, 1, 16, 16, 12, ST, { s: 0.58 }); for (let i = 2; i < 16; i++) p.set(i, 21, pick(RDM, 0.7, i, 0));
      for (const [bx, c, cap] of [[2, '#d02828', '#f8f8f0'], [6, '#f0f0e8', '#d02828'], [10, '#e8c020', '#e8c020'], [14, '#38a048', '#f8f8f0']]) { for (let j = 0; j < 11; j++) for (let i = 0; i < 3; i++) { if (j < 3 && i !== 1) continue; p.set(bx + i, 5 + j, i === 0 ? pk(c) : i === 2 ? dk(pk(c), 0.6) : dk(pk(c), 0.85)); } p.set(bx + 1, 4, pk(cap)); p.set(bx + 1, 3, pk(cap)); if (bx < 14) for (let i = 0; i < 3; i++) p.set(bx + i, 11, pk('#f8f0d0')); }
      for (let i = 2; i < 16; i++) p.set(i, 16, pick(ST, 0.95, i, 0));
    }),
    tub: () => spr('oasis-tub', 18, 22, (p) => {
      for (let j = 8; j < 18; j++) for (let i = 2; i < 16; i++) { const e = i < 3 || i > 14; p.set(i, j, pick(ramp('#1a3a6a #2a58a0 #4478c8 #7aa4e8'), cl(0.62 - (i - 9) * 0.06 + (j === 8 ? 0.2 : 0) - (j > 15 ? 0.12 : 0)), i, j)); if (e) p.set(i, j, pk('#2a4a8a')); }
      for (let i = 1; i < 17; i++) p.set(i, 8, pk('#aac4f0'));
      for (let k = 0; k < 14; k++) { const x = 3 + (k * 5) % 12, y = 5 + (k * 3) % 4; blob(p, x, y, 2.1, ramp('#1a4a10 #2a6a1a #3a8a24 #5aaa38'), { sq: 0.7, seed: k }); }
      for (const [x, y] of [[5, 5], [10, 4], [13, 6]]) ell(p, x, y, 1.8, 1.4, (a, b, uu) => pick(ramp('#7a1010 #b02020 #e04838'), cl(0.7 - uu * 0.3), a, b));
    }),
    crate: () => spr('oasis-crate', 18, 22, (p) => {
      box(p, 1, 9, 16, 11, RDM, { s: 0.55 }); for (let i = 3; i < 15; i += 3) for (let j = 11; j < 17; j++) p.set(i, j, pick(RDM, 0.15, i, j)); for (let j = 12; j < 14; j++) for (let i = 3; i < 15; i++) p.set(i, j, pick(RDM, 0.3, i, j));
      for (const bx of [3, 6, 9, 12]) { for (let j = 0; j < 8; j++) { const w = j < 3 ? 1 : 2; for (let i = 0; i < w; i++) p.set(bx + i, 2 + j, pk(i === 0 ? '#7a4a18' : '#4a2a0c')); } p.set(bx, 1, pk('#e8e8e8')); p.set(bx + (bx % 2), 1, pk('#e8e8e8')); }
      for (let i = 2; i < 16; i++) p.set(i, 9, pick(RDM, 0.9, i, 9));
    }),
  },
  counter: (w) => once('oasis-counter' + w, () => {
    const PW = w * 16 + 2, p = new Pix(PW, 26);
    for (let y = 9; y < 25; y++) for (let x = 1; x < PW - 1; x++) { const v = y - 9; let s;
      if (v < 5) s = 0.78 + (v === 0 ? 0.16 : 0) - (v === 4 ? 0.22 : 0) + (vnoise(x, v * 5, 7, 2) - 0.5) * 0.08;
      else if (v === 5) s = 0.95; else if (v === 15) s = 0.08;
      else { s = 0.5 - x / PW * 0.1; }
      const c = (v >= 6 && v < 15) ? (((x >> 3) & 1) ? pick(RDM, cl(v === 6 ? 0.9 : v >= 13 ? 0.3 : 0.55 - x / PW * 0.12), x, y) : pick(ramp('#c8c0a8 #e0d8c0 #f4eed8 #ffffff'), cl(v === 6 ? 0.95 : v >= 13 ? 0.35 : 0.7 - x / PW * 0.12), x, y)) : pick(ST, cl(s), x, y);
      p.set(x, y, c); }
    box(p, 2, 3, 12, 7, ST, { s: 0.5 }); for (let i = 4; i < 10; i++) for (let j = 4; j < 6; j++) p.set(i, j, pk(j === 4 ? '#68d890' : '#2a8a58')); for (let i = 4; i < 12; i += 2) p.set(i, 7, pk('#c8c8d0')); // till
    for (const bx of [w * 16 - 15, w * 16 - 10]) for (let j = 0; j < 6; j++) for (let i = 0; i < 4; i++) p.set(bx + i, 4 + j, pk(i === 0 ? '#f0f0f4' : i === 3 ? '#a8a8b4' : '#d4d4dc')); // foil-wrapped
    for (let j = 0; j < 7; j++) { p.set(37, 3 + j, pk(j < 2 ? '#d8d8e0' : '#c8a060')); }
    for (let i = 0; i < 5; i++) p.set(34 + i, 3 + (i === 2 ? -1 : 0), pk('#e03020'));
    outline(p, 0.4); return p.canvas();
  }),
  over(m, t, out, s) {
    for (const a of s.anim) {
      if (a.k === 'camel') { const ph = (t * 0.7) % 6, fr = ph > 5.7 ? 2 : Math.floor(t * 2.2) % 2, by = Math.sin(t * 1.3) * 0.7; out.push({ img: camel(fr), x: (a.x - 8) / 16, y: (a.y + by) / 16, z: 0 }); }
      if (a.k === 'neon') { const on = Math.sin(t * 17) > -0.85 || Math.floor(t) % 5 !== 0; out.push(glowItem('255,90,200', a.x / 16, a.y / 16, 1.5, on ? 0.38 + Math.sin(t * 9) * 0.04 : 0.1, 0)); }
    }
    out.push({ x: 0, y: 0, w: 1, h: 1, z: 2, draw: (ctx, X, Y, TS) => { const q = TS / 16; for (let i = 0; i < 46; i++) { const T0 = 2.2 + hash(i, 1, 50) * 1.6, u = (t / T0 + hash(i, 2, 50)) % 1, px = X + (10 - u * 9) * TS, py = Y + (3 + hash(i, 3, 50) * 3.6 + Math.sin(u * 7 + i) * 0.25 + (u > 0.5 ? (u - 0.5) * 0.8 : 0)) * TS; ctx.fillStyle = u < 0.15 || u > 0.85 ? 'rgba(236,206,140,.3)' : 'rgba(240,210,140,.8)'; ctx.fillRect(Math.round(px), Math.round(py), q * (i % 4 ? 1 : 2), q); } } }); // sand blowing through
  },
};

export default { oasis };
