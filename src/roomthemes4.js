// ===== Themed interiors, part 4: jetty (harbour master's hut) and hoppub (Hopsend's autumn farmhouse and oast look) =====
import { pk, ramp, PAL, Pix, cl, mix, dk, hash, vnoise, fbm, vor, pick, blob, outline, once, glowItem, plankPx, GR, box, ell, line, spr, win, FR, text, frameAt, bedGen, tableGen, cylinder } from './roomkit.js';

const ST = PAL.steel, IRON = PAL.iron, OAK = PAL.oak;
// ---------------------------------------------------------------------------------------------------------- JETTY
const NAVY = ramp('#060e24 #0c1a3e #14295c #1e3a7a #2c4e98 #4068b4 #6088d0');
const WHT = ramp('#6a7a8c #8a9aac #aab8c8 #c8d4e0 #e2eaf2 #f6f9fc #ffffff');
const DRIFT = ramp('#3a2e20 #544430 #6e5842 #8a7156 #a8906e #c4ac88 #dcc8a4');
const BRASS = PAL.gold;
const ROPE = ramp('#3a2a14 #5a4420 #7a5e30 #9a7a42 #b8965a #d4b278 #e8cc96');
const SEAC = ramp('#0a2a5a #0e3c78 #164e92 #2066ae #3282c8 #52a0dc #8cc8f0 #d0ecfc');
function jettyFloor(x, y) {
  const row = Math.floor(y / 5), v = y % 5, L = 30 + Math.floor(hash(row, 1, 81) * 3) * 8, off = Math.floor(hash(row, 0, 81) * 40), xx = x + off, seg = Math.floor(xx / L), u = ((xx % L) + L) % L;
  let s = 0.55 + (hash(row, seg, 83) - 0.5) * 0.28 + (vnoise(x, y * 5, 9, 84) - 0.5) * 0.2;
  if (v === 4) s = 0.14; else if (v === 0) s += 0.1; if (u === 0) s = 0.14; else if (u === 1) s += 0.07; if ((u === 3 || u === L - 3) && v === 1) s = 0.25; if (hash(row, seg, 87) < 0.1 && Math.abs(u - L / 2) < 1.5 && v === 2) s -= 0.2;
  let c = pick(DRIFT, cl(s, 0.05, 0.95), x, y);
  if (vnoise(x, y, 14, 85) > 0.72) c = mix(c, pk('#f0ece0'), 0.28); // salt stains
  return c;
}
function jettyFace(x, f) {
  if (f <= 2) return pick(WHT, [0.9, 1, 0.5][f] * 0.9, x, f);
  if (f >= 30) return pick(WHT, f === 30 ? 0.6 : 0.3, x, f);
  if (f === 18) return pick(WHT, 0.95, x, f); if (f === 19) return pick(WHT, 0.45, x, f);
  if (f > 19) { const u = ((x - 16) % 5 + 5) % 5; let s = 0.78 + (vnoise(x * 0.5, f * 0.3, 4, 3) - 0.5) * 0.1; if (u === 0) s = 0.4; else if (u === 1) s = 0.96; else if (u === 4) s -= 0.1; if (f >= 28) s -= 0.06; return pick(WHT, cl(s), x, f); } // white beadboard
  const row = Math.floor((f - 3) / 5), v = (f - 3) % 5; let s = 0.5 + (hash(row, 3, 82) - 0.5) * 0.06 + (vnoise(x * 0.2, f * 3, 4, 7) - 0.5) * 0.16; // navy clapboard
  if (v === 4) s = 0.1; else if (v === 0) s += 0.2; if (vnoise(x * 0.8, f * 0.2, 3, 8) > 0.84) s += 0.12; if (hash(x, f, 9) < 0.02) s -= 0.12;
  return pick(NAVY, cl(s), x, f);
}
function ringBuoy(set, cx, cy, ro, ri) {
  for (let y = Math.floor(cy - ro); y <= cy + ro; y++) for (let x = Math.floor(cx - ro); x <= cx + ro; x++) { const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy); if (r > ro || r < ri) continue; const a = Math.atan2(dy, dx), red = Math.floor(((a + Math.PI) / (Math.PI / 2)) + 0.5) % 2 === 0, lit = -(dx + dy) / (ro * 2);
    set(x, y, r > ro - 1 ? pk(red ? '#6a1010' : '#8a8a90') : pick(red ? PAL.red : WHT, cl(0.62 + lit * 0.7 + (r < ri + 1 ? -0.18 : 0)), x, y)); }
}
const SEA_HZ = 5;
const jetty = {
  mg: 4, light: { base: 0.8, vk: 0.3, min: 0.34, tint: [0.02, 0.03, 0.08] }, spill: '#f4fbff', thr: WHT, doorOut: pk('#6a9ac0'),
  floor: (x, y) => jettyFloor(x, y), face: (x, f) => jettyFace(x, f),
  cap: (x, y, d, outer, jamb) => { let s = d <= 1 ? 0.92 : d === 2 ? 0.74 : 0.6 + (vnoise(x, y, 4, 31) - 0.5) * 0.1; if (outer === 0) return pick(NAVY, 0.15, x, y); if (outer === 1) return pick(NAVY, 0.4, x, y); if (jamb) s = 0.3; return pick(WHT, cl(s), x, y); },
  feat: () => [['buoy', 2.75], ['win', 5], ['chart', 7.5], ['bunting', 5]],
  pre(u) { // a braided rope rug under the chart table
    for (let y = 56; y < 112; y++) for (let x = 36; x < 140; x++) { const d = Math.hypot((x - 88) / 50, (y - 86) / 24); if (d > 1) continue; const ring = Math.floor((1 - d) * 11), tw = ((x + y * 2 + ring * 3) % 4); if (ring < 1) { u.S(x, y, pick(ROPE, 0.25, x, y)); continue; } if (ring > 7) { u.S(x, y, pick(NAVY, 0.5 + (hash(x, y, 2) - 0.5) * 0.1, x, y)); continue; } u.S(x, y, pick(ROPE, cl((tw < 2 ? 0.7 : 0.5) - ring * 0.02 + (hash(x, y, 3) - 0.5) * 0.1), x, y)); }
  },
  fit: {
    buoy(u, cx) { ringBuoy((x, y, c) => u.S(x, u.wy(y), c), cx, 15, 7.5, 4); for (const i of [-1, 1]) for (let f = 10; f < 12; f++) u.S(cx + i * 6, u.wy(f), pick(IRON, 0.5, 0, 0)); },
    win(u, cx) { // the harbour: still sea baked in, whitecaps, a sailing boat and gulls come on top
      win(u, cx, 18, 11, 28, WHT, (gx, gy, gw, gh) => {
        if (gy < SEA_HZ) { let c = mix(pk('#58a8e8'), pk('#c8ecfc'), (gy / SEA_HZ) ** 1.4); if (gy === 1 && gx > 20 && gx < 26) c = pk('#ffffff'); return c; }
        const k = gy - SEA_HZ; return pick(SEAC, cl(0.55 - k * 0.04 + (k === 0 ? 0.25 : 0) + (hash(gx, gy, 2) - 0.5) * 0.05), gx, gy); }, { mx: 1, my: 0.5 });
      u.anim.push({ k: 'sea', x: cx - 16, y: u.wy(13), w: 32, h: 14 }); u.lights.push([cx, 4, 0.34, 58]);
    },
    chart(u, cx) { // tide table on the wall: a framed chart with a coast and a compass rose
      FR(u, cx - 16, 9, 33, 14, (i, j) => (i === 0 || j === 0 || i === 32 || j === 13) ? pick(OAK, 0.2, i, j) : (i === 1 || j === 1 || i === 31 || j === 12) ? pick(OAK, 0.8, i, j) : pk(vnoise(i, j, 3, 4) > 0.7 ? '#dcc890' : '#ecdcaa'));
      const set = (x, y, c) => u.S(x, u.wy(y), c);
      for (let i = 2; i < 31; i++) { const cy = 16 + Math.round(Math.sin(i * 0.5) * 2 + Math.sin(i * 0.19) * 2); set(cx - 16 + i, cy, pk('#3a5a8a')); if (i % 3 === 0) set(cx - 16 + i, cy + 1, pk('#8aa8c8')); }
      for (let a = 0; a < 4; a++) { const d = [[0, -3], [3, 0], [0, 3], [-3, 0]][a]; set(cx + 9 + d[0], 15 + d[1], pk('#a82a24')); } set(cx + 9, 15, pk('#202020'));
      set(cx - 8, 13, pk('#a82a24')); set(cx - 7, 14, pk('#a82a24')); set(cx - 9, 14, pk('#a82a24')); set(cx - 8, 15, pk('#a82a24'));
    },
    bunting(u, cx) { // a string of signal flags along the top of the wall
      const cols = ['#d02828', '#f0e030', '#2a5ac8', '#f8f8f8', '#38a048', '#e87a1c'];
      for (let x = 17; x < 159; x++) { const ph = ((x - 16) % 36) / 36, sag = 3 + Math.sin(ph * Math.PI) * 3; u.S(x, u.wy(Math.round(3 + sag * 0.5)), pk('#5a4a30')); }
      for (let x = 20; x < 158; x += 5) { const ph = ((x - 16) % 36) / 36, top = Math.round(3 + (3 + Math.sin(ph * Math.PI) * 3) * 0.5) + 1, c = pk(cols[Math.floor(x / 5) % 6]); for (let k = 0; k < 4; k++) for (let i = 0; i < 4 - k; i++) u.S(x + i, u.wy(top + k), (k === 0 || i === 0) ? c : dk(c, 0.8)); }
    },
  },
  shadow: (k) => (k === 'rope' ? [7, 2.6, 14] : k === 'wheel' ? [6, 2.4, 14] : undefined),
  spr: {
    wheel: () => spr('jetty-wheel', 18, 34, (p) => {
      box(p, 3, 27, 12, 5, OAK, { s: 0.5 }); for (let j = 17; j < 28; j++) { p.set(8, j, pick(OAK, 0.8, 8, j)); p.set(9, j, pick(OAK, 0.4, 9, j)); p.set(7, j, pick(OAK, 0.55, 7, j)); }
      for (let a = 0; a < 8; a++) { const ang = a * Math.PI / 4, sx = 9 + Math.cos(ang) * 8.8, sy = 10 + Math.sin(ang) * 8.8; ell(p, sx, sy, 1.4, 1.4, (x, y, uu, v) => pick(OAK, cl(0.7 - uu * 0.2 - v * 0.2), x, y)); line(p, 9, 10, 9 + Math.cos(ang) * 8, 10 + Math.sin(ang) * 8, pick(OAK, 0.45, 0, 0)); }
      for (let y = 0; y < 22; y++) for (let x = 0; x < 18; x++) { const dx = x + 0.5 - 9, dy = y + 0.5 - 10, r = Math.hypot(dx, dy); if (r > 6.9 || r < 5) continue; p.set(x, y, pick(OAK, cl(0.62 - (dx + dy) * 0.045 + (r > 6.3 ? 0.14 : 0)), x, y)); }
      ell(p, 9, 10, 2.4, 2.4, (x, y, uu, v) => pick(BRASS, cl(0.75 - uu * 0.3 - v * 0.3), x, y));
    }),
    buoy: () => spr('jetty-buoy', 18, 30, (p) => {
      box(p, 1, 22, 16, 7, OAK, { s: 0.5, tex: (i, j) => (j === 3 ? -0.2 : 0) });
      for (let j = 2; j < 22; j++) { p.set(17, j, pick(OAK, 0.6, 17, j)); } for (let i = 2; i < 17; i++) p.set(i, 3, pick(OAK, 0.8, i, 3)); // boat hook shaft is the rail
      ringBuoy((x, y, c) => p.set(x, y, c), 6, 13, 5.5, 2.6); ringBuoy((x, y, c) => p.set(x, y, c), 12, 14, 5, 2.4);
      for (let j = 0; j < 3; j++) p.set(15 + j, 1 + j, pick(IRON, 0.6, 0, 0));
    }),
    tides: () => spr('jetty-tides', 18, 34, (p) => {
      box(p, 1, 2, 16, 26, OAK, { s: 0.5 }); for (let j = 4; j < 26; j++) for (let i = 3; i < 15; i++) p.set(i, j, pick(PAL.green, 0.2 + (vnoise(i, j * 2, 3, 3) - 0.5) * 0.1, i, j));
      for (let i = 3; i < 15; i++) { const y = 12 + Math.round(Math.sin(i * 0.9) * 3); p.set(i, y, pk('#f4f4ec')); p.set(i, y + 1, pk('#c8c8bc')); }
      for (const [y, w] of [[19, 9], [21, 6], [23, 8]]) for (let i = 0; i < w; i++) if ((i + y) % 3) p.set(4 + i, y, pk('#e8e8dc'));
      for (let i = 4; i < 14; i += 3) p.set(i, 6, pk('#e8d868')); p.set(5, 8, pk('#8ac0f0')); p.set(11, 8, pk('#8ac0f0'));
      for (const lx of [3, 13]) for (let j = 28; j < 33; j++) p.set(lx, j, pick(OAK, 0.4, lx, j));
    }),
    maptable: () => tableGen('jetty-table', OAK, (p) => {
      for (let y = 9; y < 14; y++) for (let x = 2; x < 16; x++) p.set(x, y, pk(vnoise(x, y, 3, 4) > 0.7 ? '#dcc890' : '#ecdcaa')); for (let x = 2; x < 16; x++) p.set(x, 13, pk('#b8a470')); p.set(2, 9, pk('#f8f0d0'));
      for (let x = 3; x < 14; x++) p.set(x, 10 + Math.round(Math.sin(x * 0.7)), pk('#3a5a8a')); p.set(11, 12, pk('#d02828')); p.set(12, 11, pk('#d02828'));
      for (let k = 0; k < 11; k++) { const x = 3 + k, y = 13 - Math.round(k * 0.4); p.set(x, y, pick(BRASS, 0.75 - k * 0.02, k, 0)); p.set(x, y - 1, pick(BRASS, 0.45, k, 0)); } p.set(14, 9, pk('#c8e8f8')); p.set(14, 10, pk('#8ac0f0')); p.set(2, 13, pick(BRASS, 0.4, 0, 0)); // brass telescope
    }, OAK),
    rope: () => spr('jetty-rope', 18, 20, (p) => {
      for (let y = 4; y < 18; y++) for (let x = 1; x < 17; x++) { const dx = (x + 0.5 - 9) / 7.8, dy = (y + 0.5 - 11) / 5.8, d = Math.hypot(dx, dy); if (d > 1) continue; if (d < 0.22) { p.set(x, y, pk('#1a1208')); continue; } const ring = Math.floor(d * 5), tw = (x + y * 2 + ring) % 3, lit = -(dx + dy) * 0.18; p.set(x, y, pick(ROPE, cl((tw === 0 ? 0.78 : tw === 1 ? 0.58 : 0.38) + lit - (y > 13 ? 0.15 : 0)), x, y)); }
      for (let k = 0; k < 6; k++) { p.set(14 + (k >> 1), 14 + k, pick(ROPE, 0.6 - (k % 2) * 0.2, k, 0)); }
    }),
  },
  over(m, t, out, s) {
    for (const a of s.anim) if (a.k === 'sea') out.push({ x: 0, y: 0, w: 1, h: 1, z: 0, draw: (ctx, X, Y, TS) => { const q = TS / 16; ctx.save(); ctx.beginPath(); ctx.rect(X + a.x * q, Y + a.y * q, a.w * q, a.h * q); ctx.clip();
      for (let r = 1; r < 10; r++) for (let k = 0; k < 4; k++) { const sp = 3 + r * 0.7, px = a.x + ((hash(k, r, 7) * a.w + t * sp * 0.6 + r * 5) % (a.w + 6)) - 3, py = a.y + (SEA_HZ + r) ; ctx.fillStyle = r > 6 ? 'rgba(220,244,255,.8)' : 'rgba(200,232,252,.6)'; ctx.fillRect(Math.round(X + px * q), Math.round(Y + py * q), q * (1 + (r > 4 ? 2 : 1)), q); }
      const bu = (t * 0.7) % 60 / 60, bx = a.x - 8 + bu * (a.w + 16), by = a.y + SEA_HZ - 1 + Math.sin(t * 1.6) * 0.5, ang = Math.sin(t * 1.6) * 0.04; ctx.translate(X + bx * q, Y + by * q); ctx.rotate(ang);
      ctx.fillStyle = '#f8f8f4'; for (let k = 0; k < 8; k++) ctx.fillRect(0, -k * q - q, q * Math.max(1, 5 - k * 0.5), q); ctx.fillStyle = '#e8d8b8'; for (let k = 0; k < 6; k++) ctx.fillRect(q * 6, -k * q - q, q * Math.max(1, 4 - k * 0.6), q); ctx.fillStyle = '#5a2a14'; ctx.fillRect(q * -2, 0, q * 12, q); ctx.fillStyle = '#7a3a1c'; ctx.fillRect(q * -1, q, q * 10, q); ctx.fillStyle = '#2a2a30'; ctx.fillRect(q * 4, -q * 9, q, q * 9);
      ctx.restore(); ctx.save(); ctx.beginPath(); ctx.rect(X + a.x * q, Y + a.y * q, a.w * q, a.h * q); ctx.clip();
      for (let g = 0; g < 2; g++) { const gu = (t * 0.12 + g * 0.5) % 1, gx = a.x + gu * (a.w + 8) - 4, gy = a.y + 2 + g * 1.5 + Math.sin(t * 2 + g * 3) * 0.8, w = Math.floor(t * 5 + g) % 2; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(X + gx * q), Math.round(Y + (gy + (w ? 0 : 1)) * q), q * 2, q); ctx.fillRect(Math.round(X + (gx + 2) * q), Math.round(Y + (gy + (w ? 1 : 0)) * q), q * 2, q); }
      ctx.restore(); } });
  },
};

// ---------------------------------------------------------------------------------------------------------- HOPPUB
const BRK = ramp('#3a1208 #5a2010 #7a3418 #964a24 #b06232 #c88046');
const PLS = ramp('#6a5232 #8a7048 #a88c5e #c4aa78 #dcc592 #eedcae');
const HOPG = ramp('#0e2a10 #1a4418 #2a6020 #3e7a2a #5a9a38 #82bc50 #b0d878');
const QRY = ramp('#2a1008 #421a0e #5c2a16 #763a1e #924c28 #ac6234 #c47c44');
const PEW = ramp('#2a2c34 #444854 #6a707e #8a92a0 #aab2c0 #d0d6e0');
const HONEY = ramp('#4a2a04 #7a4a08 #a8700e #d09a1c #f0c038 #ffe070');
const APPLE = ramp('#3a0a0c #6a1218 #9a1c20 #c42c28 #e04a38 #f27a58');
function hopFloor(x, y) {
  const cx = Math.floor(x / 12), cy = Math.floor(y / 12), u = ((x % 12) + 12) % 12, v = ((y % 12) + 12) % 12;
  if (u === 0 || v === 0) return pick(QRY, 0.08 + hash(x, y, 4) * 0.05, x, y);
  let s = 0.5 + (hash(cx, cy, 91) - 0.5) * 0.3 + (vnoise(x, y, 6, 92) - 0.5) * 0.14; if (u === 1 || v === 1) s += 0.12; else if (u === 11 || v === 11) s -= 0.1;
  if (hash(cx, cy, 93) < 0.1 && Math.abs(u - v) < 0.8) s -= 0.2;
  let c = pick(QRY, cl(s, 0.1, 0.95), x, y);
  if (hash(x, y, 94) < 0.012) c = pk(hash(x, y, 95) < 0.85 ? '#d8b858' : '#7aa83a'); // straw and a dropped hop
  return c;
}
function hopFace(x, f) {
  if (f <= 2) return pick(OAK, [0.3, 0.88, 0.45][f], x, f);
  if (f >= 30) return pick(OAK, f === 30 ? 0.45 : 0.1, x, f);
  if (f === 18 || f === 19) return pick(OAK, f === 18 ? 0.85 : 0.3, x, f);
  if (f > 19) { const row = Math.floor((f - 20) / 3), off = (row & 1) * 4, bu = ((x + off) % 8 + 8) % 8, v = (f - 20) % 3; if (bu === 0 || v === 2) return pick(PLS, 0.35 + hash(x, f, 3) * 0.1, x, f); let s = 0.5 + (hash(Math.floor((x + off) / 8), row, 5) - 0.5) * 0.36 + (v === 0 ? 0.1 : 0); return pick(BRK, cl(s), x, f); } // oast-house brick plinth
  const xl = ((x - 16) % 40 + 40) % 40, post = xl < 4 || xl > 38;
  if (post) return pick(OAK, xl === 0 || xl === 39 ? 0.25 : xl === 1 ? 0.85 : 0.5 + (vnoise(f * 0.2, x, 3, 4) - 0.5) * 0.15, x, f);
  const br = Math.abs(xl - 4 - (17 - f) / 14 * 16), br2 = Math.abs((36 - xl) - (17 - f) / 14 * 16); if ((xl < 22 && br < 1.6) || (xl >= 22 && br2 < 1.6)) return pick(OAK, br < 0.6 || br2 < 0.6 ? 0.6 : 0.32, x, f);
  let s = 0.55 + (fbm(x, f, 6) - 0.5) * 0.3 - (f - 3) * 0.004; if (hash(x, f, 7) < 0.03) s -= 0.12; if (vnoise(x * 0.4, f * 0.4, 3, 9) > 0.8) s -= 0.1;
  return pick(PLS, cl(s), x, f);
}
function hopSwag(u) { // hop bines looped along the top of the wall
  const set = (x, f, c) => u.S(x, u.wy(f), c), segs = 3, L = 144 / segs;
  for (let x = 16; x < 160; x++) { const ph = ((x - 16) % L) / L, f = 3.5 + Math.sin(ph * Math.PI) * 2.6; set(x, Math.round(f), pick(HOPG, 0.45 + (hash(x, 1, 2) - 0.5) * 0.2, x, 0)); if (hash(x, 3, 5) < 0.5) set(x, Math.round(f) - 1, pick(HOPG, 0.7, x, 0)); }
  for (let x = 17; x < 160; x += 4) { const ph = ((x - 16) % L) / L, f = Math.round(3.5 + Math.sin(ph * Math.PI) * 2.6), len = 3 + Math.floor(hash(x, 6, 5) * 3); for (let k = 1; k <= len; k++) for (let i = 0; i < (k < 2 ? 2 : k > len - 1 ? 1 : 3); i++) set(x + i - (k < 2 || k > len - 1 ? 0 : 1) + (k > len - 1 ? 1 : 0), f + k, pick(HOPG, cl(0.5 + (i === 0 ? 0.25 : -0.1) + (k % 2 ? -0.08 : 0.08)), x, k)); }
  for (let x = 20; x < 158; x += 9) { const ph = ((x - 16) % L) / L, f = Math.round(3.5 + Math.sin(ph * Math.PI) * 2.6); for (const [a, b] of [[-1, -1], [0, -1], [1, 0], [-1, 0]]) set(x + a, f + b, pick(HOPG, 0.65, x, 0)); } // leaves
}
const hoppub = {
  mg: 4, light: { base: 0.72, vk: 0.38, min: 0.28, tint: [0.16, 0.05, -0.2] }, spill: '#ffe2a0', thr: ramp('#3a2a1c #5a4630 #7a6244 #9a8058 #b89c70'), doorOut: pk('#2a1a0e'),
  floor: (x, y) => hopFloor(x, y), face: (x, f) => hopFace(x, f),
  cap: (x, y, d, outer, jamb) => { let s = 0.5 + (vnoise(x, y, 4, 31) - 0.5) * 0.2; if (d <= 1) s = 0.85; else if (d === 2) s = 0.62; if (outer === 0) s = 0.1; else if (outer === 1) s -= 0.15; if (jamb) s = 0.2; return pick(OAK, cl(s), x, y); },
  feat: (kind, m) => (kind === 'inn' ? [['win', 1.75], ['brasses', 3.2], ['hearth', 5], ['tankards', 7.2], ['win', 8.25], ['hops', 5]]
    : kind === 'general' ? [['board', 2.3], ['win', 5], ['scales', 7.7], ['hops', 5]]
    : kind === 'smith' ? [['tools', 2], ['forge', 5], ['tools', 8], ['hops', 5]]
    : /Bee/.test(m.name) ? [['win', 3], ['comb', 5.6], ['win', 8], ['hops', 5]] : [['win', 3], ['hearth', 5.4], ['win', 7.8], ['hops', 5]]),
  pre(u) { // a threadbare rug before the hearth, in inns and houses
    if (u.kind === 'smith' || u.kind === 'general') return;
    const x0 = 52, y0 = 54, w = 72, h = 40; for (let v = 0; v < h; v++) for (let uu = 0; uu < w; uu++) { const x = x0 + uu, y = y0 + v, e = Math.min(uu, v, w - 1 - uu, h - 1 - v); let c; if (e === 0) c = pk('#3a1a0c'); else if (e <= 2) c = pk(((uu + v) & 3) < 2 ? '#e0b858' : '#a87a30'); else if (e === 3) c = pk('#5a2a14'); else c = ((Math.floor(uu / 6) + Math.floor(v / 6)) & 1) ? pick(ramp('#4a1a0c #7a2c14 #a8441e #c85a2a'), 0.55 + (hash(uu, v, 2) - 0.5) * 0.12, x, y) : pick(ramp('#1e3a14 #2e5a1e #427a2c #5a9a3c'), 0.5 + (hash(uu, v, 3) - 0.5) * 0.12, x, y); u.S(x, y, c); }
  },
  fit: {
    hops: (u) => hopSwag(u),
    win(u, cx) {
      win(u, cx, 9, 4, 17, OAK, (gx, gy, gw, gh) => {
        let c = mix(pk('#f4d880'), pk('#f8b868'), gy / gh); const hill = gh * 0.5 + Math.sin(gx * 0.45) * 1.4; if (gy > hill) c = mix(pk('#d8a038'), pk('#a86a20'), (gy - hill) / (gh - hill));
        if (gy > hill && gx % 4 === 1) c = pk('#5a7a28'); if (gy > hill + 1 && gx % 4 === 2) c = pk('#7a9a38'); if ((gx === 3 || gx === 11) && gy < hill + 1 && gy > hill - 4) c = pk('#3a2810'); if (gy < 3 && gx > 8) c = mix(c, pk('#fff8d8'), 0.5); return c; }, { mx: 1, my: 0.5 });
      u.lights.push([cx, 4, 0.22, 36]);
    },
    brasses(u, cx) { // a leather strap of horse brasses
      for (let f = 4; f < 20; f++) { u.S(cx, u.wy(f), pick(ramp('#1a0c06 #3a1e0e #5a3418 #7a4a22'), 0.55, 0, f)); u.S(cx + 1, u.wy(f), pick(ramp('#1a0c06 #3a1e0e #5a3418 #7a4a22'), 0.3, 0, f)); }
      for (const [f, r] of [[7, 3], [12, 3.4], [17, 3]]) ell({ set: (x, y, c) => u.S(x, u.wy(y), c) }, cx + 0.5, f, r, r, (x, y, uu, v) => (Math.hypot(uu, v) > 0.78 ? pick(PAL.gold, 0.35, x, y) : pick(PAL.gold, cl(0.82 - uu * 0.3 - v * 0.3), x, y)));
    },
    tankards(u, cx) {
      for (let x = cx - 15; x < cx + 15; x++) { u.S(x, u.wy(8), pick(OAK, 0.85, x, 0)); u.S(x, u.wy(9), pick(OAK, 0.3, x, 0)); }
      for (let k = 0; k < 4; k++) { const x0 = cx - 13 + k * 7; u.S(x0 + 2, u.wy(10), pick(IRON, 0.5, 0, 0)); for (let j = 0; j < 6; j++) for (let i = 0; i < 5; i++) u.S(x0 + i, u.wy(11 + j), pick(PEW, cl(0.7 - (i - 2) * 0.14 + (j === 0 ? 0.2 : 0) - (j === 5 ? 0.2 : 0)), i, j)); for (let j = 1; j < 5; j++) u.S(x0 + 5, u.wy(11 + j), pick(PEW, 0.5, 0, 0)); }
    },
    board(u, cx) { // chalkboard of the day's apples
      FR(u, cx - 15, 9, 31, 11, (i, j) => (i === 0 || j === 0 || i === 30 || j === 10) ? pick(OAK, 0.2, i, j) : (i === 1 || j === 1 || i === 29 || j === 9) ? pick(OAK, 0.75, i, j) : pk(vnoise(i, j * 2, 3, 2) > 0.7 ? '#2a3228' : '#1a221a'));
      text((x, y, c) => u.S(x, u.wy(y), c), cx - 12, 12, 'APPLES', pk('#f8e070'));
      for (let i = 0; i < 24; i += 2) u.S(cx - 13 + i, u.wy(18), pk('#8a9a8a'));
    },
    scales(u, cx) {
      const set = (x, y, c) => u.S(x, u.wy(y), c);
      set(cx, 4, pick(IRON, 0.5, 0, 0)); set(cx, 5, pick(IRON, 0.5, 0, 0)); for (let i = -9; i <= 9; i++) set(cx + i, 7 + (Math.abs(i) > 7 ? 1 : 0), pick(BRASS, 0.75 - Math.abs(i) * 0.02, i, 0)); set(cx, 6, pick(BRASS, 0.9, 0, 0));
      for (const sd of [-1, 1]) { const px = cx + sd * 9; for (let j = 8; j < 13; j++) set(px - (j - 8) * sd * 0.7 | 0, j, pk('#b89850')); for (let j = 8; j < 13; j++) set(px + (j - 8) * sd * 0.7 | 0, j, pk('#b89850')); for (let i = -4; i <= 4; i++) set(px + i, 13, pick(BRASS, 0.7 - Math.abs(i) * 0.05, i, 0)); for (let i = -3; i <= 3; i++) set(px + i, 14, pick(BRASS, 0.35, i, 0)); }
      ell({ set }, cx - 9, 11.5, 2.2, 1.7, (x, y, uu) => pick(APPLE, cl(0.7 - uu * 0.3), x, y));
    },
    hearth(u, cx) { // brick inglenook with a crane and a cauldron over a log fire
      const brick = (x, f, sh) => { const row = Math.floor((f - 3) / 3), off = (row & 1) * 4, bu = ((x + off) % 8 + 8) % 8, v = (f - 3) % 3; if (bu === 0 || v === 2) return pick(PLS, 0.3, x, f); return pick(BRK, cl(0.5 + (hash(Math.floor((x + off) / 8), row, 5) - 0.5) * 0.34 + sh + (v === 0 ? 0.08 : 0)), x, f); };
      for (let f = 3; f < 31; f++) { const hw = f < 15 ? 13 : 22; for (let x = cx - hw; x < cx + hw; x++) u.S(x, u.wy(f), brick(x, f, x > cx + hw - 4 ? -0.1 : 0)); }
      for (let x = cx - 25; x < cx + 25; x++) { u.S(x, u.wy(14), pick(OAK, 0.9, x, 0)); u.S(x, u.wy(15), pick(OAK, 0.55, x, 0)); u.S(x, u.wy(16), pick(OAK, 0.2, x, 0)); }
      for (let f = 17; f < 32; f++) for (let x = cx - 12; x < cx + 12; x++) { const ar = f - 17 < 4 && Math.abs(x + 0.5 - cx) > 12 - [5, 3, 2, 1][f - 17]; if (!ar) u.S(x, u.wy(f), mix(pk('#0c0604'), pk('#3a1a0c'), cl((f - 17) / 15))); }
      for (let f = 17; f < 32; f++) { u.S(cx - 13, u.wy(f), pick(PLS, 0.8, f, 0)); u.S(cx + 12, u.wy(f), pick(PLS, 0.2, f, 0)); }
      for (let x = cx - 10; x < cx + 3; x++) u.S(x, u.wy(20), pick(IRON, 0.5, x, 0)); for (let f = 20; f < 28; f++) u.S(cx - 10, u.wy(f), pick(IRON, 0.5, 0, f)); // crane
      ell({ set: (x, y, c) => u.S(x, u.wy(y), c) }, cx - 2, 24, 4.2, 3.4, (x, y, uu, v) => pick(IRON, cl(0.5 - uu * 0.25 - v * 0.1), x, y));
      u.anim.push({ k: 'fire', x: cx - 7, y: u.wy(21), w: 14, h: 11 }); u.anim.push({ k: 'glow', x: cx, y: 12, r: 3, a: 0.44 }); u.lights.push([cx, 10, 0.6, 70]);
    },
    forge(u, cx) { // the oast-kiln forge: round brick arch glowing orange
      const brick = (x, f, sh) => { const row = Math.floor((f - 3) / 3), off = (row & 1) * 4, bu = ((x + off) % 8 + 8) % 8, v = (f - 3) % 3; if (bu === 0 || v === 2) return pick(PLS, 0.3, x, f); return pick(BRK, cl(0.48 + (hash(Math.floor((x + off) / 8), row, 7) - 0.5) * 0.34 + sh + (v === 0 ? 0.08 : 0)), x, f); };
      for (let f = 3; f < 31; f++) { const hw = f < 12 ? 8 + (f - 3) * 1 : 23; for (let x = cx - hw; x < cx + hw; x++) u.S(x, u.wy(f), brick(x, f, x > cx + hw - 5 ? -0.12 : 0)); }
      for (let f = 15; f < 31; f++) for (let x = cx - 12; x < cx + 12; x++) { const ar = f - 15 < 4 && Math.abs(x + 0.5 - cx) > 12 - [5, 3, 2, 1][f - 15]; if (!ar) u.S(x, u.wy(f), f < 20 ? pk('#0a0402') : mix(pk('#2a0c04'), pk('#8a2a08'), cl((f - 20) / 10))); }
      for (let x = cx - 14; x < cx + 14; x++) { u.S(x, u.wy(28), pick(PLS, 0.8, x, 0)); u.S(x, u.wy(29), pick(PLS, 0.4, x, 0)); }
      u.anim.push({ k: 'coals', x: cx - 11, y: u.wy(22) }); u.anim.push({ k: 'glow', x: cx, y: 6, r: 3.2, a: 0.5 }); u.lights.push([cx, 6, 0.75, 70]);
    },
    tools(u, cx) {
      for (let x = cx - 9; x < cx + 9; x++) { u.S(x, u.wy(6), pick(OAK, 0.8, x, 0)); u.S(x, u.wy(7), pick(OAK, 0.3, x, 0)); }
      for (let f = 8; f < 17; f++) { u.S(cx - 6, u.wy(f), pick(OAK, 0.55, 0, f)); u.S(cx - 5, u.wy(f), pick(OAK, 0.3, 0, f)); u.S(cx + 2, u.wy(f), pick(IRON, 0.6, 0, f)); u.S(cx + 4, u.wy(f), pick(IRON, 0.5, 0, f)); }
      for (let x = cx - 8; x < cx - 2; x++) { u.S(x, u.wy(8), pick(IRON, 0.7, x, 0)); u.S(x, u.wy(9), pick(IRON, 0.4, x, 0)); } // hammer head
      for (let a = 0; a < 12; a++) { const t = a / 11 * Math.PI * 1.25 - Math.PI * 0.12; u.S(cx + 7 + Math.round(Math.cos(t) * 2.2), u.wy(11) + Math.round(Math.sin(t) * 3), pick(ST, 0.6, a, 0)); } // a horseshoe
    },
    comb(u, cx) { // frames of honeycomb
      FR(u, cx - 17, 4, 35, 15, (i, j) => (i === 0 || j === 0 || i === 34 || j === 14) ? pick(OAK, 0.2, i, j) : (i === 1 || j === 1 || i === 33 || j === 13) ? pick(OAK, 0.8, i, j) : mix(pk('#4a2a04'), pk('#d09a1c'), 0.5));
      for (let j = 2; j < 13; j++) for (let i = 2; i < 33; i++) { const row = Math.floor(j / 3), xx = i + (row & 1) * 2, a = xx % 4, b = j % 3; let c = (a === 0 || b === 2) ? pick(HONEY, 0.2, i, j) : pick(HONEY, cl(0.7 + (a === 1 && b === 0 ? 0.2 : 0) - (i > 17 ? 0.12 : 0)), i, j); if ((row + (xx >> 2)) % 4 === 0 && a > 0 && b < 2) c = pk('#f8ecc0'); u.S(cx - 17 + i, u.wy(4 + j), c); }
      u.lights.push([cx, 8, 0.2, 30]);
    },
  },
  shadow: (k) => (k === 'press' ? [8, 3, 14] : k === 'hive' ? [6, 2.4, 14] : undefined),
  spr: {
    bed: () => bedGen('hop-bed', { W: OAK, pat: (u, v) => { const pc = ['#c8501e', '#e8a030', '#a83a28', '#e8d8a8', '#6a8a3a', '#7a4a1c']; let c = pk(pc[Math.floor(hash(u >> 2, v >> 2, 4) * 6)]); if (u % 4 === 0 || v % 4 === 0) c = dk(c, 0.78); return c; } }),
    table: () => tableGen('hop-table', OAK, (p) => { for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) p.set(4 + i, 8 + j, pk(j === 0 ? '#fff8e8' : i === 0 ? '#c8a050' : '#8a6420')); p.set(7, 10, pk('#8a6420')); ell(p, 13, 11, 1.8, 1.5, (x, y, uu) => pick(APPLE, cl(0.7 - uu * 0.3), x, y)); p.set(13, 9, pk('#3a2810')); for (let x = 7; x < 12; x++) { p.set(x, 12, pk('#e8e4d8')); p.set(x, 13, pk('#c0bcb0')); } }, OAK),
    honey: () => tableGen('hop-honey', OAK, (p) => { for (const [bx, c] of [[3, 0], [7, 1], [11, 0]]) { for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) p.set(bx + i, 8 + j, pick(HONEY, cl(0.72 - i * 0.14 + (j === 3 ? -0.2 : 0)), i, j)); p.set(bx + 1, 7, pk('#a88a58')); p.set(bx, 7, pk('#a88a58')); p.set(bx + 2, 7, pk('#a88a58')); p.set(bx, 8, pk('#fff0b0')); } for (let x = 5; x < 13; x++) { p.set(x, 13, pick(HONEY, 0.5, x, 13)); } p.set(14, 11, pk('#e8c030')); p.set(14, 12, pk('#8a5a10')); }, OAK),
    cask: () => spr('hop-cask', 18, 20, (p) => { cylinder(p, 3, 4, 12, 13, OAK, [2, 9]); for (let y = 10; y < 13; y++) p.set(9, y, pick(PAL.gold, y === 10 ? 0.9 : 0.5, 0, y)); p.set(10, 11, pick(PAL.gold, 0.4, 0, 0)); p.set(11, 11, pick(PAL.gold, 0.4, 0, 0)); for (let i = 0; i < 4; i++) p.set(6 + i, 6, pk('#e8e0c8')); p.set(4, 2, pick(HOPG, 0.7, 0, 0)); p.set(5, 3, pick(HOPG, 0.5, 0, 0)); p.set(5, 2, pick(HOPG, 0.8, 0, 0)); p.set(4, 3, pick(HOPG, 0.6, 0, 0)); }),
    apples: () => spr('hop-apples', 18, 22, (p) => { box(p, 1, 11, 16, 9, OAK, { s: 0.52, tex: (i, j) => (j === 4 ? -0.2 : 0) }); for (let i = 1; i < 17; i++) p.set(i, 11, pick(OAK, 0.9, i, 11)); for (const [bx, by, c] of [[4, 8, APPLE], [8, 7, APPLE], [12, 8, APPLE], [6, 5, PAL.green], [10, 5, APPLE], [3, 11, PAL.green], [14, 11, APPLE], [8, 10, PAL.green]]) { ell(p, bx, by, 2.8, 2.6, (x, y, uu, v) => pick(c === APPLE ? APPLE : ramp('#1a3a0c #2a5a14 #4a8a24 #82b83a #b4d860'), cl(0.65 - uu * 0.25 - v * 0.28), x, y)); p.set(bx + 1, by - 3, pk('#3a2410')); p.set(bx - 1, by - 1, pk('#fff0e8')); } }),
    sacks: () => spr('hop-sacks', 18, 24, (p) => { const SK = ramp('#3a2a14 #5a4624 #7a6234 #9a7e44 #b89a58 #d4b674'); for (const [bx, by, w, h] of [[1, 12, 9, 10], [8, 10, 9, 12]]) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const hw = w / 2 - (j < 3 ? (3 - j) * 0.8 : 0) + (j > h - 3 ? -0.5 : 0); if (Math.abs(i + 0.5 - w / 2) > hw) continue; p.set(bx + i, by + j, pick(SK, cl(0.62 - (i - w / 2) * 0.07 + (((i + j) % 3 === 0) ? -0.1 : 0) - (j > h - 3 ? 0.12 : 0)), i, j)); } for (let i = 1; i < w - 1; i++) p.set(bx + i, by + 2, pick(SK, 0.25, i, 0)); } for (const [hx, hy] of [[11, 6], [13, 7], [9, 8], [14, 9]]) { p.set(hx, hy, pick(HOPG, 0.75, 0, 0)); p.set(hx, hy + 1, pick(HOPG, 0.5, 0, 0)); p.set(hx + 1, hy, pick(HOPG, 0.6, 0, 0)); } }),
    jars: () => spr('hop-jars', 18, 34, (p) => { box(p, 1, 2, 16, 29, OAK, { s: 0.46 }); for (const by of [11, 21, 30]) for (let i = 2; i < 16; i++) { p.set(i, by, pick(OAK, 0.85, i, by)); p.set(i, by + 1, pick(OAK, 0.3, i, by)); }
      [[4, 'r'], [13, 'g'], [22, 'o']].forEach(([top, kk], row) => { for (let k = 0; k < 3; k++) { const bx = 3 + k * 4, c = ['#c8402e', '#e8a030', '#6a9a2a'][(k + row) % 3]; for (let j = 0; j < 6; j++) for (let i = 0; i < 3; i++) p.set(bx + i, top + 3 + j, i === 0 ? pk(c) : i === 2 ? dk(pk(c), 0.6) : dk(pk(c), 0.85)); for (let i = 0; i < 3; i++) p.set(bx + i, top + 2, pk('#e8d8b8')); p.set(bx, top + 4, pk('#fff8e0')); } }); for (let x = 3; x < 15; x += 2) { p.set(x, 3, pick(HOPG, 0.6, x, 3)); p.set(x, 4, pick(HOPG, 0.8, x, 4)); } }),
    press: () => spr('hop-press', 18, 34, (p) => { box(p, 1, 27, 16, 5, OAK, { s: 0.5 }); for (let j = 8; j < 27; j++) { p.set(2, j, pick(OAK, 0.7, 2, j)); p.set(15, j, pick(OAK, 0.4, 15, j)); } for (let x = 1; x < 17; x++) { p.set(x, 7, pick(OAK, 0.85, x, 7)); p.set(x, 8, pick(OAK, 0.35, x, 8)); }
      for (let j = 12; j < 26; j++) for (let i = 4; i < 14; i++) { const slat = (i - 4) % 3 === 0; p.set(i, j, pick(OAK, slat ? 0.25 : 0.62 - (i - 4) * 0.025, i, j)); } for (const hy of [14, 21]) for (let i = 4; i < 14; i++) p.set(i, hy, pick(IRON, 0.6, i, hy));
      for (let j = 2; j < 12; j++) { p.set(8, j, pick(OAK, 0.8, 8, j)); p.set(9, j, pick(OAK, 0.4, 9, j)); if (j % 2) { p.set(7, j, pick(OAK, 0.3, 7, j)); p.set(10, j, pick(OAK, 0.3, 7, j)); } } for (let i = 1; i < 17; i++) { p.set(i, 3, pick(OAK, 0.8, i, 3)); p.set(i, 4, pick(OAK, 0.35, i, 4)); }
      for (let i = 5; i < 13; i++) { p.set(i, 25, pick(APPLE, 0.55, i, 25)); } p.set(6, 24, pk('#d8a878')); p.set(11, 24, pk('#d8a878')); }),
    hive: () => spr('hop-hive', 18, 24, (p) => { box(p, 2, 17, 14, 4, OAK, { s: 0.5 }); for (const lx of [3, 13]) for (let j = 21; j < 23; j++) p.set(lx, j, pick(OAK, 0.4, lx, j));
      for (let j = 3; j < 17; j++) { const t = (j - 3) / 14, hw = 2 + Math.sqrt(Math.max(0, 1 - ((1 - t) ** 2))) * 5.4; for (let x = Math.floor(9 - hw); x < 9 + hw; x++) { const ring = Math.floor(j / 3) % 2, u = (x + 0.5 - 9) / hw; p.set(x, j, pick(HONEY, cl((ring ? 0.58 : 0.45) - u * 0.2 + (j % 3 === 2 ? -0.15 : 0.05)), x, j)); } }
      p.set(8, 15, pk('#1a0c04')); p.set(9, 15, pk('#1a0c04')); p.set(9, 14, pk('#1a0c04')); p.set(8, 14, pk('#1a0c04')); p.set(9, 1, pk('#a88a58')); p.set(9, 2, pk('#a88a58')); }),
  },
  counter: (w, kind) => once(`hop-counter${w}${kind}`, () => {
    const PW = w * 16 + 2, p = new Pix(PW, 26);
    for (let y = 9; y < 25; y++) for (let x = 1; x < PW - 1; x++) { const v = y - 9; let s;
      if (v < 5) s = 0.76 + (v === 0 ? 0.14 : 0) - (v === 4 ? 0.2 : 0) + (vnoise(x, v * 4, 6, 2) - 0.5) * 0.14;
      else if (v === 5) s = 0.9; else if (v === 15) s = 0.12;
      else { const pu = (x - 1) % 12, pv = v - 6; s = 0.46; if (pu === 0 || pv === 0 || pv === 8) s = 0.26; else if (pu === 1 || pv === 1) s = 0.64; else if (pu === 11 || pv === 7) s = 0.32; s -= x / (PW * 6); }
      p.set(x, y, pick(OAK, cl(s), x, y)); }
    if (kind === 'inn') { for (const bx of [3, 7, 11]) { for (let j = 0; j < 5; j++) p.set(bx, 4 + j, pick(PAL.gold, 0.8, 0, 0)); ell(p, bx + 1, 3, 1.7, 2.6, (x, y, uu) => pick(ramp('#e8e4d8 #f8f4e8 #ffffff'), cl(0.7 - uu * 0.4), x, y)); p.set(bx + 1, 2, pk(['#c8402e', '#3a7a3a', '#2a5ac8'][(bx / 4) | 0])); }
      for (const bx of [w * 16 - 15, w * 16 - 9]) { for (let j = 0; j < 6; j++) for (let i = 0; i < 4; i++) p.set(bx + i, 3 + j, pick(PEW, cl(0.7 - (i - 1.5) * 0.18 + (j === 5 ? -0.2 : 0)), i, j)); for (let i = 0; i < 4; i++) p.set(bx + i, 3, pk('#fff8e8')); p.set(bx + 4, 5, pick(PEW, 0.5, 0, 0)); p.set(bx + 4, 6, pick(PEW, 0.5, 0, 0)); } }
    else if (kind === 'general') { for (let i = 3; i < 12; i++) p.set(i, 8, pick(BRASS, 0.75, i, 0)); for (let j = 3; j < 8; j++) p.set(7, j, pick(BRASS, 0.75, 0, j)); ell(p, 4, 6.5, 2.6, 1.4, (x, y, uu) => pick(BRASS, cl(0.7 - uu * 0.3), x, y)); ell(p, 11, 6.5, 2.6, 1.4, (x, y, uu) => pick(BRASS, cl(0.7 - uu * 0.3), x, y));
      ell(p, w * 16 - 11, 6, 5.4, 3, (x, y, uu, v) => pick(ramp('#a07018 #c89a2c #e8c458 #f8e08a'), cl(0.65 - uu * 0.2 - v * 0.25), x, y)); for (let i = -4; i < 4; i++) p.set(w * 16 - 11 + i, 6, pk('#b88a20')); p.set(w * 16 - 9, 4, pk('#fff2b0'));
      for (const [bx, by] of [[w * 16 - 4, 6], [w * 16 - 2, 7]]) ell(p, bx, by, 2.4, 2.2, (x, y, uu, v) => pick(APPLE, cl(0.7 - uu * 0.3 - v * 0.2), x, y)); }
    else { for (let i = 3; i < 13; i++) { p.set(i, 8, pick(IRON, 0.6, i, 0)); p.set(i, 7, pick(IRON, 0.9, i, 0)); } for (let j = 3; j < 8; j++) { p.set(6, j, pick(OAK, 0.6, 0, j)); p.set(7, j, pick(OAK, 0.35, 0, j)); } for (let i = 3; i < 11; i++) { p.set(i, 3, pick(IRON, 0.85, i, 0)); p.set(i, 4, pick(IRON, 0.5, i, 0)); }
      for (let a = 0; a < 12; a++) { const t = a / 11 * Math.PI * 1.25 - Math.PI * 0.12; p.set(w * 16 - 12 + Math.round(Math.cos(t) * 3), 6 + Math.round(Math.sin(t) * 3), pick(ST, 0.6, a, 0)); } for (let a = 0; a < 12; a++) { const t = a / 11 * Math.PI * 1.25 - Math.PI * 0.12; p.set(w * 16 - 5 + Math.round(Math.cos(t) * 2.6), 6 + Math.round(Math.sin(t) * 2.6), pick(ST, 0.5, a, 0)); } }
    outline(p, 0.4); return p.canvas();
  }),
  over(m, t, out, s) {
    if (/Bee/.test(m.name)) out.push({ x: 0, y: 0, w: 1, h: 1, z: 2, draw: (ctx, X, Y, TS) => { const q = TS / 16; for (let i = 0; i < 9; i++) { const bx = 1.5 + hash(i, 1, 90) * 8 + Math.sin(t * (0.7 + hash(i, 2, 90)) + i * 2) * 1.6, by = 1.2 + hash(i, 3, 90) * 4.5 + Math.cos(t * (0.9 + hash(i, 4, 90)) + i) * 1.1, w = Math.floor(t * 20 + i) % 2; ctx.fillStyle = '#f0c020'; ctx.fillRect(Math.round(X + bx * TS), Math.round(Y + by * TS), q * 2, q * 2); ctx.fillStyle = '#2a1a08'; ctx.fillRect(Math.round(X + bx * TS + q), Math.round(Y + by * TS), q, q * 2); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(Math.round(X + bx * TS), Math.round(Y + by * TS - q * (w ? 1 : 0.5)), q * 2, q); } } });
    out.push({ x: 0, y: 0, w: 1, h: 1, z: 2, draw: (ctx, X, Y, TS) => { const q = TS / 16; for (let i = 0; i < 22; i++) { const T0 = 7 + hash(i, 1, 55) * 6, u = (t / T0 + hash(i, 2, 55)) % 1, px = X + (1 + hash(i, 3, 55) * 9 + Math.sin(u * 5 + i) * 0.5) * TS, py = Y + (1.2 + hash(i, 4, 55) * 5.6 - u * 0.8) * TS; ctx.fillStyle = u < 0.2 || u > 0.8 ? 'rgba(255,224,160,.2)' : 'rgba(255,230,170,.55)'; ctx.fillRect(Math.round(px), Math.round(py), q, q); } } }); // dust in the lamplight
  },
};

export default { jetty, hoppub };
