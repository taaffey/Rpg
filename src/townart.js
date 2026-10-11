// ===== Town renderer: 16-bit (SNES-style) towns, drawn entirely in code =====
// Same interface as terrain.js (isTheme, ground, objects, mapObjects); see the comment there for draw items.
// Per map, everything static is pre-rendered once into one big ground canvas (cobbles, grass, quays, docks, walls, hedges,
// fences, flower beds, small props and every drop shadow); ground() only supplies the animated water that shows through its
// holes. Buildings, trees, lamps, stalls, the fountain, boats and the castle are cached sprites sorted with the characters.
// Art is authored at 16 px per tile (TS = 32 on screen) with 6-12 shade ramps, ordered dithering and selective outlines.
import { mk } from './autotile.js';

// ---------------------------------------------------------------- colour + pixel helpers
const PKC = new Map();
const pk = (h) => { let v = PKC.get(h); if (v === undefined) { const n = parseInt(h.slice(1, 7), 16), a = h.length > 7 ? parseInt(h.slice(7, 9), 16) : 255; v = ((a << 24) | ((n & 255) << 16) | (n & 0xff00) | (n >>> 16)) >>> 0; PKC.set(h, v); } return v; };
const ramp = (s) => s.trim().split(/\s+/).map(pk);
const cR = (c) => c & 255, cG = (c) => (c >>> 8) & 255, cB = (c) => (c >>> 16) & 255, cA = (c) => c >>> 24;
const rgba = (r, g, b, a = 255) => (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
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
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAY[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const pick = (R, v, x, y) => R[Math.max(0, Math.min(R.length - 1, Math.floor(v * (R.length - 1) + bay(x, y))))];

class Pix {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); }
  set(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; }
  get(x, y) { x = Math.floor(x); y = Math.floor(y); return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.d[y * this.w + x] : 0; }
  on(x, y) { return cA(this.get(x, y)) > 0; }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c); }
  blend(x, y, c, t) { const o = this.get(x, y); if (cA(o)) this.set(x, y, mix(o, c, t)); }
  blit(s, dx, dy) { for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) { const c = s.d[j * s.w + i], a = cA(c); if (!a) continue; if (a === 255) this.set(dx + i, dy + j, c); else { const o = this.get(dx + i, dy + j); this.set(dx + i, dy + j, cA(o) ? rgba(cR(o) + (cR(c) - cR(o)) * a / 255, cG(o) + (cG(c) - cG(o)) * a / 255, cB(o) + (cB(c) - cB(o)) * a / 255, Math.max(cA(o), a)) : c); } } }
  canvas() { const c = mk(this.w, this.h), x = c.getContext('2d'), id = x.createImageData(this.w, this.h); new Uint32Array(id.data.buffer).set(this.d); x.putImageData(id, 0, 0); return c; }
}
// selective outline: transparent pixels next to the shape take a darkened copy of their neighbour (needs 1 px padding)
function outline(p, f = 0.38, skipDown = false) {
  const o = p.d.slice(), w = p.w, h = p.h, at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : o[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (cA(o[y * w + x])) continue;
    const n = [at(x, y + 1), at(x + 1, y), at(x - 1, y), skipDown ? 0 : at(x, y - 1)].find((c) => cA(c) === 255);
    if (n) p.d[y * w + x] = dk(n, f);
  }
}
// inner rim: opaque pixels on the shape's border get darker (for images without padding, e.g. buildings)
function rim(p, f = 0.45, sides = 'tlr') {
  const o = p.d.slice(), w = p.w, h = p.h, tr = (x, y) => { if (x < 0) return sides.includes('l'); if (x >= w) return sides.includes('r'); if (y < 0) return sides.includes('t'); if (y >= h) return sides.includes('b'); return !cA(o[y * w + x]); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (cA(o[y * w + x]) && (tr(x - 1, y) || tr(x + 1, y) || tr(x, y - 1) || tr(x, y + 1))) p.d[y * w + x] = dk(o[y * w + x], f);
}
// sphere-shaded clump (leaves, hedges, bushes, snow lumps): lit from the upper left, dithered into the ramp
const LN = Math.hypot(-0.5, -0.62, 0.6), LX = -0.5 / LN, LY = -0.62 / LN, LZ = 0.6 / LN;
function blob(p, cx, cy, r, R, o = {}) {
  const { amb = 0.1, sq = 1, jit = 0.12, seed = 1, rimDark = 0, bias = 0, mask = null } = o;
  for (let y = Math.floor(cy - r * sq) - 1; y <= cy + r * sq + 1; y++) for (let x = Math.floor(cx - r) - 1; x <= cx + r + 1; x++) {
    const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / (r * sq), d2 = dx * dx + dy * dy; if (d2 > 1) continue;
    const nz = Math.sqrt(1 - d2); let v = amb + (1 - amb) * cl(dx * LX + dy * LY + nz * LZ) + bias + (hash(x, y, seed) - 0.5) * jit;
    if (rimDark && d2 > 0.72 && dy > -0.2 && p.on(x, y)) v -= rimDark;
    p.set(x, y, pick(R, cl(v), x, y)); if (mask) mask.add(y * p.w + x);
  }
}
const canv = (p) => p.canvas();
const sp = new Map();
const once = (k, f) => { let v = sp.get(k); if (v === undefined) { v = f(); sp.set(k, v); } return v; };

// ---------------------------------------------------------------- palettes
const PAL = {
  grass: ramp('#123216 #184019 #1f511e #276424 #31772a #3d8a30 #4c9e38 #5fb243 #7ac652 #9ad866'),
  cob: ramp('#34323c #4a4852 #5e5c66 #72707a #86848c #9a989e #aeacb0 #c4c2c4 #dcdad8'),
  cobw: ramp('#3a3430 #50483f #665c50 #7c7060 #908472 #a49886 #b8ae9c'), // warm stones mixed in
  plaza: ramp('#3e3c44 #57555e #6f6d74 #85838a #9b999e #b1afb2 #c7c5c6 #dddbd8'),
  dirt: ramp('#3a2816 #4e361e #644628 #7a5832 #906c40 #a68250 #ba9866'),
  wall: ramp('#26252e #383742 #4b4a56 #5f5e6a #74737e #8a8992 #a1a0a8 #b9b8be #d2d1d4'),
  wood: ramp('#1e120a #301d10 #462b17 #5e3b1f #784d29 #926134 #ab7842 #c69456'),
  water: ramp('#0a1e5c #0e2a78 #143894 #1a48aa #2058bc #2a6ccc #3a84da #5aa2e6 #8ac4f0 #c8e8fa'),
  snow: ramp('#6c7ca6 #8494ba #9eaccc #b8c4dc #ced8ea #e0e8f4 #eff3fa #ffffff'),
  ice: ramp('#4a7aa8 #5e92bc #78aace #96c2dc #b4d8ea #d4ecf6 #f2fbff'),
  moss: ramp('#16200e #1c2a12 #243616 #2e441a #3a531f #476226 #56722e #688538 #7e9a44'),
  mud: ramp('#1e160c #2a1f12 #382a18 #46351e #554226 #66522e'),
  swamp: ramp('#0a1a1c #0e2428 #142e32 #1a383a #204444 #28504e #325e58 #487466 #78987e'),
  leaf: ramp('#0a2210 #0f3016 #15421c #1c5622 #256c28 #30822e #3e9a36 #52b040 #6cc64e #92dc6a'),
  leafD: ramp('#081c10 #0c2816 #11381c #174a22 #1e5c28 #286e30 #34823a #449648'),
  pine: ramp('#051a16 #092620 #0f342a #164434 #1e5440 #28664c #36785a #488c68'),
  olive: ramp('#10160a #182010 #222c14 #2c3a18 #38481e #445624 #52662c #627834 #78903e'),
  bark: ramp('#1a0f08 #2c190d #422614 #58341c #6e4426 #865632'),
  slate: ramp('#0b1030 #111a46 #17245c #1e3074 #263e8c #304ea4 #3c60b8 #4e76ca #6890da #8eb0ea'),
  thatch: ramp('#24180a #382610 #4e3616 #66481e #7e5c28 #967232 #ae883e #c6a050 #dcb868 #ecd088'),
  plaster: ramp('#6c5a40 #8a7656 #a6926c #bea984 #d2bf98 #e2d2ac #eee2c0 #f8f0d6'),
  splaster: ramp('#5a5e6a #747886 #8e92a0 #a8acb8 #c0c4ce #d4d8e0 #e6e9ef #f6f8fb'),
  timber: ramp('#1c100a #2c1a0f #3e2615 #52331c #664226 #7a5230'),
  plank: ramp('#1e140c #2e1f12 #402b18 #543a20 #684a2a #7e5c34 #946e40'),
  glow: ramp('#5a2c0c #8e4814 #c46a1e #e8902c #f8b444 #ffd468 #ffec9c #fffbe0'),
  stone: ramp('#2e2c34 #44424c #5a5862 #706e78 #86848e #9c9aa2 #b2b0b6 #c8c6ca'),
  fstone: ramp('#3a3a4a #525264 #6a6a7e #828296 #9a9aac #b2b2c2 #cacad6 #e2e2ea #f4f4f8'),
  iron: ramp('#101018 #1c1c28 #2a2a38 #3a3a4a #4e4e60 #66667a'),
  red: ramp('#3a0a0c #5e1214 #861c1c #a82a24 #c8402e #e0603e #f08a5a'),
  blue: ramp('#0a1440 #122060 #1a3084 #2444a4 #3058c0 #4472d4 #6290e2'),
  cloth: ramp('#7a7468 #9c9688 #bab4a6 #d4cec0 #e8e4d8 #f8f6ee'),
  gold: ramp('#5a3a08 #8a5e10 #b8861c #e0b030 #f8d458 #fff0a0'),
  green: ramp('#0c2412 #14381c #1e4e28 #2a6636 #388046 #4a9a58'),
  flowers: ['#e83850', '#f87090', '#f8d040', '#ffffff', '#b070e0', '#f89038', '#60a8f0'].map(pk),
};
// per theme: what each map char is made of (ground classes) and which ramps paint it
const G_LAND = 0, G_DIRT = 1, G_ST = 2, G_PLZ = 3, G_WAT = 4, G_DOCK = 5, G_WALL = 6;
const CLS = {
  town: { ',': G_DIRT, _: G_ST, E: G_ST, H: G_ST, ':': G_PLZ, F: G_PLZ, '~': G_WAT, '=': G_DOCK, '#': G_WALL },
  snowtown: { ',': G_DIRT, _: G_ST, E: G_ST, H: G_ST, ':': G_PLZ, F: G_PLZ, '~': G_WAT, '=': G_DOCK, '#': G_WALL },
  swamptown: { ',': G_DIRT, _: G_DOCK, E: G_DOCK, H: G_DOCK, '=': G_DOCK, ':': G_PLZ, F: G_PLZ, '~': G_WAT, '#': G_WALL },
};
export const isTheme = (theme) => !!CLS[theme];

// ---------------------------------------------------------------- animated water (seen through the ground canvas)
const WF = 8; // frames
function waterTex(theme, f) { // 64x64 tileable frame
  return once('wt' + theme + f, () => {
    const p = new Pix(64, 64), sw = theme === 'swamptown', R = sw ? PAL.swamp : PAL.water, ph = (f / WF) * 64;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const a = vnoise(x + ph, y * 2.2, 16, 3, 64), b = vnoise(x - ph, y * 2.2 + 9, 16, 5, 64), c = vnoise(x, y, 32, 7, 64);
      let v = (sw ? 0.4 : 0.42) + (a + b - 1) * 0.42 + (c - 0.5) * 0.25;
      const crest = Math.abs(a - b);
      if (crest < 0.035 && a > 0.55) v += sw ? 0.18 : 0.34; // bright ripple crests
      else if (crest < 0.06 && a < 0.4) v -= 0.1;
      p.set(x, y, pick(R, cl(v, 0, sw ? 0.8 : 0.86), x, y));
    }
    // sparkles that blink on and off between frames
    for (let i = 0; i < (sw ? 4 : 10); i++) { const x = Math.floor(hash(i, f >> 1, 77) * 62), y = Math.floor(hash(i, f >> 1, 78) * 62); if (hash(i, f, 79) < 0.6) { p.set(x, y, R[R.length - 1]); p.set(x + 1, y, R[R.length - 2]); p.set(x - 1, y, R[R.length - 3]); } }
    return p;
  });
}
function waterTile(theme, x, y, f) {
  return once(`wq${theme}${f}${x & 3}${y & 3}`, () => { const t = waterTex(theme, f), p = new Pix(16, 16); for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) p.d[j * 16 + i] = t.d[((y & 3) * 16 + j) * 64 + (x & 3) * 16 + i]; return canv(p); });
}
export const ground = (theme, get, x, y, t) => waterTile(theme === 'snowtown' ? 'town' : theme, x, y, Math.floor(t * 5) % WF);

// ---------------------------------------------------------------- ground materials (world pixel coords, never repeating)
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
function tuft(x, y, s, dens = 0.7) { // little grass blades: +/- shade offsets on a jittered grid
  const gx = Math.floor(x / 5), gy = Math.floor(y / 4); if (hash(gx, gy, s) > dens) return 0;
  const dx = x - (gx * 5 + Math.floor(hash(gx, gy, s + 1) * 4)), dy = y - (gy * 4 + Math.floor(hash(gx, gy, s + 2) * 2));
  if (dy === 0 && dx === 0) return 0.3; if (dy === 1 && (dx === -1 || dx === 1)) return 0.15; if (dy === 1 && dx === 0) return -0.1; if (dy === 2 && dx >= -1 && dx <= 1) return -0.2; return 0;
}
const MAT = {
  grass: (x, y) => pick(PAL.grass, cl(0.26 + fbm(x, y, 1) * 0.5 + tuft(x, y, 11), 0.06, 0.92), x, y),
  snow: (x, y) => { const d = vnoise(x, y * 1.7, 22, 4); let v = 0.6 + (fbm(x, y, 2) - 0.5) * 0.25 + (d - 0.5) * 0.35; if (hash(x, y, 5) < 0.006) v = 1; else if (tuft(x, y, 13, 0.25) < -0.1) v -= 0.12; return pick(PAL.snow, cl(v, 0.3, 1), x, y); },
  moss: (x, y) => { const mud = vnoise(x, y, 14, 6); if (mud > 0.68) return pick(PAL.mud, cl(0.35 + fbm(x, y, 3) * 0.5 + (mud - 0.68) * 1.5), x, y); return pick(PAL.moss, cl(0.22 + fbm(x, y, 3) * 0.5 + tuft(x, y, 17, 0.6) * 1.2, 0.04, 0.95), x, y); },
  dirt: (x, y) => { const v = vor(x, y, 4, 1, 41); let s = 0.38 + (fbm(x, y, 8) - 0.5) * 0.4; if (V.h < 0.12 && v.e > 1.2) s += v.dx + v.dy < 0 ? 0.3 : 0.12; return pick(PAL.dirt, cl(s), x, y); },
  mud: (x, y) => pick(PAL.mud, cl(0.35 + fbm(x, y, 8) * 0.55 + (hash(x, y, 3) < 0.03 ? 0.3 : 0)), x, y),
  cobble: (x, y) => {
    const v = vor(x, y, 5.6, 0.78, 31), n = fbm(x, y, 9);
    if (v.e < 0.85) return pick(PAL.cob, 0.04 + n * 0.1, x, y);
    const warm = hash(Math.floor(v.h * 1e6), 3, 7) < 0.2, R = warm ? PAL.cobw : PAL.cob;
    let s = 0.44 + (v.h - 0.5) * 0.34 + (n - 0.5) * 0.18; const lit = -(v.dx + v.dy);
    if (v.e < 2.0) s += lit > 0.3 ? 0.2 : lit < -0.3 ? -0.2 : 0; else s += 0.05;
    return pick(R, cl(s, 0.12, 1), x, y);
  },
};
function plazaPx(x, y, cx, cy) { // radial paving rings around the centrepiece
  const dx = x + 0.5 - cx, dy = (y + 0.5 - cy) * 1.25, r = Math.hypot(dx, dy), RW = 6.2, ri = Math.floor(r / RW), fr = r / RW - ri;
  const circ = 2 * Math.PI * Math.max(r, 1), n = Math.max(6, Math.round(circ / 9)), arc = circ / n, a = (Math.atan2(dy, dx) / (2 * Math.PI) + 1) * n + ri * 0.5, ai = Math.floor(a), fa = a - ai;
  const ed = Math.min(Math.min(fr, 1 - fr) * RW, Math.min(fa, 1 - fa) * arc), N = fbm(x, y, 12);
  if (ed < 0.8) return pick(PAL.plaza, 0.06 + N * 0.12, x, y);
  const ux = dx / Math.max(r, 1), uy = dy / Math.max(r, 1), ox = ux * (fr - 0.5) * RW - uy * (fa - 0.5) * arc, oy = uy * (fr - 0.5) * RW + ux * (fa - 0.5) * arc, lit = -(ox + oy);
  let s = 0.52 + (hash(ri, ai % n, 5) - 0.5) * 0.2 + (N - 0.5) * 0.1; if (ed < 1.9) s += lit > 0.4 ? 0.2 : lit < -0.4 ? -0.18 : 0; else s += 0.04;
  return pick(PAL.plaza, cl(s, 0.14, 1), x, y);
}

// ---------------------------------------------------------------- the static ground canvas
const MG = 3; // margin tiles: the map edge is continued outward this far
function boxblur(F, w, h, r) {
  const T = new Float32Array(w * h), n = 2 * r + 1;
  for (let y = 0; y < h; y++) { const o = y * w; let s = 0; for (let i = -r; i <= r; i++) s += F[o + Math.max(0, Math.min(w - 1, i))]; for (let x = 0; x < w; x++) { T[o + x] = s / n; s += F[o + Math.min(w - 1, x + r + 1)] - F[o + Math.max(0, x - r)]; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let i = -r; i <= r; i++) s += T[Math.max(0, Math.min(h - 1, i)) * w + x]; for (let y = 0; y < h; y++) { F[y * w + x] = s / n; s += T[Math.min(h - 1, y + r + 1) * w + x] - T[Math.max(0, y - r) * w + x]; } }
}
function centres(m) { // top-left of every 'F' block (fountains / centrepieces) with its size
  const base = m.base || m.rows, out = [];
  base.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'F' && base[y][x - 1] !== 'F' && (base[y - 1] || '')[x] !== 'F') { let w = 0, h = 0; while (r[x + w] === 'F') w++; while ((base[y + h] || '')[x] === 'F') h++; out.push({ x, y, w, h }); } }));
  return out;
}
function buildGround(m) {
  const theme = m.theme, cls = CLS[theme], base = m.base || m.rows, W = base[0].length, H = base.length, snow = theme === 'snowtown', swamp = theme === 'swamptown';
  const TW = W + 2 * MG, TH = H + 2 * MG, GW = TW * 16, GH = TH * 16, O = MG * 16;
  const chAt = (x, y) => base[Math.max(0, Math.min(H - 1, y))][Math.max(0, Math.min(W - 1, x))];
  const C = new Uint8Array(TW * TH); for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) C[ty * TW + tx] = cls[chAt(tx - MG, ty - MG)] ?? G_LAND;
  const cAt = (tx, ty) => C[Math.max(0, Math.min(TH - 1, ty)) * TW + Math.max(0, Math.min(TW - 1, tx))];
  const hard = (c) => c >= G_WAT, softWater = snow || swamp;
  const field = (set, r, wet) => {
    const I = new Float32Array(TW * TH);
    for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) { const c = C[ty * TW + tx]; I[ty * TW + tx] = wet ? (set(c) ? 1 : 0) : !hard(c) ? (set(c) ? 1 : 0) : [cAt(tx - 1, ty), cAt(tx + 1, ty), cAt(tx, ty - 1), cAt(tx, ty + 1)].some((n) => !hard(n) && set(n)) ? 1 : 0; }
    const F = new Float32Array(GW * GH); for (let py = 0; py < GH; py++) for (let px = 0; px < GW; px++) F[py * GW + px] = I[(py >> 4) * TW + (px >> 4)];
    boxblur(F, GW, GH, r); boxblur(F, GW, GH, r); return F;
  };
  const SF = field((c) => c === G_ST || c === G_PLZ, 3), PF = field((c) => c === G_PLZ, 2), DF = field((c) => c === G_DIRT, 3);
  const WFd = softWater ? field((c) => c === G_WAT || (swamp && c === G_DOCK), 4, true) : null;
  const cen = centres(m).map((f) => [(f.x + f.w / 2) * 16, (f.y + f.h / 2) * 16]);
  const plz = (x, y) => { let b = cen[0] || [W * 8, H * 8], bd = 1e9; for (const c of cen) { const d = (c[0] - x) ** 2 + (c[1] - y) ** 2; if (d < bd) { bd = d; b = c; } } return plazaPx(x, y, b[0], b[1]); };
  const land = snow ? MAT.snow : swamp ? MAT.moss : MAT.grass;
  const P = new Pix(GW, GH), SH = new Uint8Array(GW * GH);
  const dockH = (tx, ty) => { let a = 1, b = 1; while (a < 6 && cAt(tx - a, ty) === G_DOCK) a++; while (a < 12 && cAt(tx + b, ty) === G_DOCK) b++; let c = 1, d = 1; while (c < 6 && cAt(tx, ty - c) === G_DOCK) c++; while (d < 12 && cAt(tx, ty + d) === G_DOCK) d++; return a + b >= c + d; };
  const DH = new Uint8Array(TW * TH); for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) if (C[ty * TW + tx] === G_DOCK) DH[ty * TW + tx] = dockH(tx, ty) ? 1 : 0;
  const isWet = (c) => c === G_WAT || c === G_DOCK, quay = (c) => !isWet(c) && c !== G_WALL;
  for (let py = 0; py < GH; py++) for (let px = 0; px < GW; px++) {
    const tx = px >> 4, ty = py >> 4, lx = px & 15, ly = py & 15, x = px - O, y = py - O, c = C[ty * TW + tx], i = py * GW + px;
    let col = 0;
    if (c === G_DOCK) { // planks: across the pier's run; posts and a front beam where it meets water
      const hz = DH[ty * TW + tx], u = hz ? x : y, v = hz ? y : x, bi = Math.floor(u / 4), bu = ((u % 4) + 4) % 4, seg = Math.floor((v + hash(bi, 0, 3) * 40) / 37);
      const up = cAt(tx, ty - 1), dn = cAt(tx, ty + 1), lf = cAt(tx - 1, ty), rt = cAt(tx + 1, ty);
      let s = 0.5 + (hash(bi, seg, 9) - 0.5) * 0.3 + (vnoise(hz ? u * 4 : v, hz ? v : u * 4, 6, 2) - 0.5) * 0.25;
      if (bu === 0) s = swamp ? 0.2 : 0.1; else if (bu === 1) s += 0.1;
      if (((v + Math.floor(hash(bi, 0, 3) * 40)) % 37 + 37) % 37 === 0) s = 0.1;
      if (bu === 2 && hash(bi, Math.floor(v / 8), 4) < 0.1) s += 0.25; // nail heads
      if (swamp && bu === 0 && hash(bi, seg, 6) < 0.18) { col = 0; } else col = pick(swamp ? PAL.plank : PAL.wood, cl(s, 0.05, 0.95), px, py);
      if (dn === G_WAT && ly >= 13) col = ly === 13 ? pick(PAL.wood, 0.75, px, py) : pick(PAL.wood, ly === 14 ? 0.3 : 0.15, px, py);
      if (up === G_WAT && ly === 0) col = pick(PAL.wood, 0.2, px, py);
      if (lf === G_WAT && lx === 0) col = pick(PAL.wood, 0.18, px, py); if (rt === G_WAT && lx === 15) col = pick(PAL.wood, 0.15, px, py);
      const post = (lx <= 2 || lx >= 13) && ((hz ? tx : ty) & 1) === 0;
      if (post && (dn === G_WAT && ly >= 11 || up === G_WAT && ly <= 3) && (hz || lf === G_WAT || rt === G_WAT)) col = pick(PAL.wood, lx === 0 || lx === 13 ? 0.7 : 0.4, px, py);
      if (swamp && ((hz && (dn === G_WAT || up === G_WAT)) || (!hz && (lf === G_WAT || rt === G_WAT))) && hash(bi, seg, 8) < 0.25) col = pick(PAL.moss, 0.6, px, py); // moss on the edges
    } else if (c === G_WALL) {
      const upW = cAt(tx, ty - 1) === G_WALL, dnW = cAt(tx, ty + 1) === G_WALL, faceTop = upW ? 0 : dnW ? 16 : 6;
      if (ly < faceTop) { // cap stones
        const bx = Math.floor((x + (ty & 1) * 4) / 8), s = 0.68 + (hash(bx, ty, 21) - 0.5) * 0.2 + (fbm(x, y, 4) - 0.5) * 0.2;
        col = snow ? pick(PAL.snow, cl(0.62 + (fbm(x, y, 3) - 0.5) * 0.3 + (ly === 0 ? 0.3 : 0)), px, py) : pick(PAL.wall, cl(((x + (ty & 1) * 4) % 8 === 0) ? 0.3 : ly === 0 ? 0.92 : ly === faceTop - 1 && !dnW ? 0.9 : s), px, py);
      } else { // brick face
        const fy = py - faceTop, row = Math.floor(fy / 4), bx = Math.floor((x + (row & 1) * 4) / 8), bu = ((x + (row & 1) * 4) % 8 + 8) % 8, bv = fy % 4;
        let s = 0.42 + (hash(bx, row + ty * 7, 23) - 0.5) * 0.24 + (fbm(x, y, 6) - 0.5) * 0.15;
        if (bu === 0 || bv === 3) s = 0.1; else if (bv === 0 || bu === 1) s += 0.16;
        if (!dnW && ly >= 14) s -= 0.15;
        col = pick(PAL.wall, cl(s, 0.05, 0.9), px, py);
        if (snow && fy < 2 && hash(x, 1, 3) < 0.7) col = pick(PAL.snow, 0.7, px, py);
      }
      if (cAt(tx - 1, ty) !== G_WALL && lx === 0) col = dk(col, 0.6); if (cAt(tx + 1, ty) !== G_WALL && lx === 15) col = dk(col, 0.55);
    } else if (c === G_WAT && !softWater) { // harbour: stone quay faces on the north shore, open water elsewhere
      const up = cAt(tx, ty - 1);
      if (quay(up) && ly < 6) {
        const row = Math.floor(ly / 3), bx = Math.floor((x + row * 3) / 7), bu = ((x + row * 3) % 7 + 7) % 7;
        col = ly === 5 ? pick(PAL.water, 0.15, px, py) : pick(PAL.wall, cl((bu === 0 || ly % 3 === 2 ? 0.08 : 0.3 + (hash(bx, row + ty * 3, 2) - 0.5) * 0.2) - ly * 0.03), px, py);
        if (ly === 5 && hash(x, 7, 2) < 0.5) col = pk('#c8e8fa80');
      } else if (up === G_DOCK && ly < 3) { col = (((tx & 1) === 0 && (lx <= 2 || lx >= 13)) || !DH[(ty - 1) * TW + tx]) && (lx <= 2 || lx >= 13) ? pick(PAL.wood, 0.25, px, py) : pk('#00081a70'); }
      else if ((quay(cAt(tx - 1, ty)) && lx < 2) || (quay(cAt(tx + 1, ty)) && lx > 13) || (quay(cAt(tx, ty + 1)) && ly > 14)) col = pk('#00102a60');
    } else if (softWater && (c === G_WAT || (WFd[i] > 0.5 && c !== G_DOCK))) {
      const wv = WFd[i] + (vnoise(x, y, 4, 9) - 0.5) * 0.16;
      if (snow) { // frozen pond: ice with streaks inside a snowbank
        if (wv < 0.5) col = land(x, y); else if (wv < 0.58) col = pick(PAL.snow, cl(0.8 + (0.58 - wv) * 2), px, py); else if (wv < 0.63) col = pick(PAL.ice, 0.25, px, py);
        else { let s = 0.5 + (fbm(x, y, 14) - 0.5) * 0.4 + (((x * 2 + y * 3) % 29 + 29) % 29 < 2 ? 0.3 : 0) - (hash(Math.floor(x / 3), Math.floor(y / 2), 8) < 0.02 ? 0.3 : 0); col = pick(PAL.ice, cl(s), px, py); }
      } else { // murky swamp water with a muddy bank, shallows and lily pads
        if (wv < 0.5) col = land(x, y); else if (wv < 0.55) col = pick(PAL.mud, 0.2, px, py); else if (wv < 0.66) col = pk('#2a2a1260'); else col = 0;
        const gx = Math.floor(x / 9), gy = Math.floor(y / 8), hh = hash(gx, gy, 51);
        if (wv > 0.75 && hh < 0.16) { const cx = gx * 9 + 2 + hash(gx, gy, 52) * 5, cy = gy * 8 + 2 + hash(gx, gy, 53) * 4, ddx = (x + 0.5 - cx) / 3.4, ddy = (y + 0.5 - cy) / 2.2, d = ddx * ddx + ddy * ddy;
          if (d < 1 && !(ddx > 0 && Math.abs(ddy) < 0.3)) col = pick(PAL.green, cl(0.8 - d * 0.6 - ddy * 0.3), px, py); if (hh < 0.04 && Math.abs(x + 0.5 - cx) < 1 && Math.abs(y + 0.5 - cy + 0.5) < 1) col = pk('#f0a0c8'); }
      }
    } else { // soft land: grass / dirt / street / plaza with rounded, slightly ragged borders
      const jag = (vnoise(x, y, 3, 19) - 0.5) * 0.12, s = SF[i] + jag, d = DF[i] + jag;
      if (s > 0.5) {
        if (s < 0.555) col = snow ? pick(PAL.snow, 0.35, px, py) : pick(PAL.cob, swamp ? 0.1 : 0.06, px, py);
        else if (swamp) col = MAT.dirt(x, y);
        else { const pv = PF[i] + jag * 0.5; col = pv > 0.5 ? (pv < 0.54 ? pick(PAL.plaza, 0.12, px, py) : plz(x, y)) : MAT.cobble(x, y); }
        if (snow && fbm(x, y, 27) + (0.62 - Math.min(0.62, s)) * 2.2 > 0.66) col = pick(PAL.snow, cl(0.5 + (fbm(x, y, 3) - 0.5) * 0.5 + (s < 0.6 ? 0.2 : 0)), px, py);
      } else if (d > 0.5) col = d < 0.54 ? pick(PAL.dirt, 0.1, px, py) : swamp ? MAT.mud(x, y) : MAT.dirt(x, y);
      else {
        col = land(x, y);
        if ((s > 0.43 || d > 0.44) && !snow) col = dk(col, 0.72); // grass rim against paving
      }
      if (!softWater) { // coping stones along the harbour edge
        const W4 = [cAt(tx, ty + 1) === G_WAT && ly >= 13, cAt(tx - 1, ty) === G_WAT && lx <= 1, cAt(tx + 1, ty) === G_WAT && lx >= 14, cAt(tx, ty - 1) === G_WAT && ly <= 1];
        if (W4.some(Boolean)) { const k = W4[0] ? ly - 13 : W4[3] ? 1 - ly : W4[1] ? 1 - lx : lx - 14, seam = ((W4[0] || W4[3] ? x : y) % 8 + 8) % 8 === 0; col = pick(PAL.wall, seam ? 0.25 : W4[0] ? [0.85, 0.62, 0.35][k] : 0.6 + k * 0.15, px, py); }
      }
    }
    P.d[i] = col;
  }
  const S = { P, SH, GW, GH, O, chAt, cAt, W, H, theme, snow, swamp };
  decorate(m, S);
  for (let i = 0; i < GW * GH; i++) if (SH[i]) { const c = P.d[i], a = cA(c); P.d[i] = a === 255 ? rgba(cR(c) * 0.58, cG(c) * 0.6, cB(c) * 0.68 + 14) : a ? c : pk('#00061a6a'); }
  return { cv: P.canvas(), GW, GH };
}
// soft drop shadows are hard-edged pixel shapes in a mask (applied once at the end)
const shEll = (S, cx, cy, rx, ry) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) { const X = x + S.O, Y = y + S.O; if (X >= 0 && Y >= 0 && X < S.GW && Y < S.GH) S.SH[Y * S.GW + X] = 1; } };
const shRect = (S, x0, y0, w, h, skew = 0) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const X = x + S.O + (skew ? Math.floor((y - y0) * skew) : 0), Y = y + S.O; if (X >= 0 && Y >= 0 && X < S.GW && Y < S.GH) S.SH[Y * S.GW + X] = 1; } };

// ---------------------------------------------------------------- small static props (painted into the ground canvas)
function cylinder(p, x0, y0, w, h, R, o = {}) { // upright wooden barrel-like body, lit from the left
  const { bulge = 0.7, staves = 3, hoops = [], top = true } = o, cx = x0 + w / 2;
  for (let y = y0; y < y0 + h; y++) { const half = w / 2 - bulge + bulge * Math.sin(Math.PI * (y - y0 + 0.5) / h);
    for (let x = x0; x < x0 + w; x++) { const u = (x + 0.5 - cx) / half; if (Math.abs(u) > 1) continue; const nz = Math.sqrt(1 - u * u);
      let v = 0.12 + 0.85 * cl(-u * 0.5 + nz * 0.8) + (hash(x, y, 4) - 0.5) * 0.08; if (((x - x0) % staves) === 0) v -= 0.18; if (hoops.includes(y - y0)) { p.set(x, y, pick(PAL.iron, cl(v + 0.1), x, y)); continue; }
      if (y === y0 + h - 1) v -= 0.2; p.set(x, y, pick(R, cl(v), x, y)); } }
  if (top) for (let y = y0 - 2; y <= y0 + 1; y++) for (let x = x0; x < x0 + w; x++) { const u = (x + 0.5 - cx) / (w / 2 - bulge), vv = (y + 0.5 - (y0)) / 2; if (u * u + vv * vv > 1) continue; p.set(x, y, pick(R, u * u + vv * vv > 0.55 ? 0.2 : 0.75 + (((x - x0) % 3) === 0 ? -0.1 : 0) - vv * 0.1, x, y)); }
}
const PROPS = {
  barrel: () => { const p = new Pix(16, 16); cylinder(p, 3, 4, 10, 11, PAL.wood, { hoops: [2, 8] }); return p; },
  barrels: () => { const p = new Pix(32, 16); cylinder(p, 3, 4, 10, 11, PAL.wood, { hoops: [2, 8] }); cylinder(p, 15, 5, 10, 10, PAL.wood, { hoops: [2, 7] }); cylinder(p, 24, 7, 7, 8, PAL.plank, { hoops: [1, 6], bulge: 0.4 }); return p; },
  crate: () => { const p = new Pix(16, 16); crate(p, 2, 3, 12, 12); return p; },
  crates: () => { const p = new Pix(32, 16); crate(p, 2, 3, 13, 12); crate(p, 16, 6, 11, 9); cylinder(p, 26, 8, 5, 7, PAL.plank, { hoops: [1, 5], bulge: 0.2 }); return p; },
  sacks: () => { const p = new Pix(16, 16); for (const [cx, cy] of [[5.5, 10], [10.5, 10.5], [8, 7]]) blob(p, cx, cy, 4.2, PAL.cloth, { sq: 1.15, seed: cx * 9, rimDark: 0.2 }); outline(p, 0.45); return p; },
  hay: () => { const p = new Pix(16, 16); for (let y = 3; y < 15; y++) for (let x = 2; x < 14; x++) { const u = (x + 0.5 - 8) / 6, top = y < 6; if (top && ((x + 0.5 - 8) / 6) ** 2 + ((y - 5.5) / 2.5) ** 2 > 1) continue; p.set(x, y, pick(PAL.gold, cl((top ? 0.85 : 0.55 - u * 0.3) + (hash(x, Math.floor(y / 2), 5) - 0.5) * 0.4 - (y === 9 || y === 10 ? 0.3 : 0)), x, y)); } outline(p, 0.4); return p; },
  bench: () => { const p = new Pix(32, 16), R = PAL.wood; for (let x = 2; x < 30; x++) { p.set(x, 4, pick(R, 0.75, x, 4)); p.set(x, 5, pick(R, 0.45, x, 5)); p.set(x, 9, pick(R, 0.85, x, 9)); p.set(x, 10, pick(R, 0.6, x, 10)); p.set(x, 11, pick(R, 0.3, x, 11)); }
    for (const lx of [4, 27]) { for (let y = 3; y < 15; y++) { p.set(lx, y, pick(PAL.iron, 0.6, lx, y)); p.set(lx + 1, y, pick(PAL.iron, 0.3, lx, y)); } } outline(p, 0.4); return p; },
  logs: () => { const p = new Pix(32, 16); [[6, 12], [13, 12], [20, 12], [27, 12], [9.5, 7], [16.5, 7], [23.5, 7], [13, 3]].forEach(([cx, cy], k) => { for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 4; x <= cx + 4; x++) { const d = Math.hypot((x + 0.5 - cx) / 3.6, (y + 0.5 - cy) / 3.2); if (d > 1) continue; p.set(x, y, d > 0.75 ? pick(PAL.bark, 0.35, x, y) : pick(PAL.dirt, cl(0.95 - d * 0.5 - (Math.round(d * 4) % 2) * 0.15), x, y)); } }); if (true) for (let x = 6; x < 30; x++) if (hash(x, 1, 2) < 0.6) p.set(x, 0 + (x % 3 === 0 ? 1 : 0), pick(PAL.snow, 0.9, x, 0)); outline(p, 0.4); return p; },
  sled: () => { const p = new Pix(32, 16); for (let x = 4; x < 27; x++) for (let y = 5; y < 10; y++) p.set(x, y, pick(PAL.red, y === 5 ? 0.85 : 0.5 - (x % 5 === 0 ? 0.2 : 0), x, y)); for (let x = 3; x < 29; x++) { p.set(x, 12, pick(PAL.iron, 0.7, x, 12)); } p.set(29, 11, pick(PAL.iron, 0.7, 0, 0)); p.set(30, 10, pick(PAL.iron, 0.6, 0, 0)); for (const x of [7, 14, 22]) { p.set(x, 10, pick(PAL.iron, 0.4, 0, 0)); p.set(x, 11, pick(PAL.iron, 0.4, 0, 0)); } outline(p, 0.4); return p; },
  nets: () => { const p = new Pix(32, 16); for (const x of [3, 28]) for (let y = 1; y < 15; y++) { p.set(x, y, pick(PAL.wood, 0.7, x, y)); p.set(x + 1, y, pick(PAL.wood, 0.35, x, y)); } for (let x = 3; x < 30; x++) p.set(x, 2, pick(PAL.wood, 0.6, x, 2));
    for (let y = 3; y < 13; y++) for (let x = 5; x < 28; x++) if ((x + y) % 3 === 0 || (x - y + 30) % 3 === 0) p.set(x, y + Math.round(Math.sin(x / 4) * 0.8), pk(y > 9 ? '#6a6450' : '#9a9478')); outline(p, 0.5); return p; },
  reeds: () => { const p = new Pix(16, 16); for (let k = 0; k < 7; k++) { const x = 2 + Math.floor(hash(k, 1, 3) * 12), top = 2 + Math.floor(hash(k, 2, 3) * 5); for (let y = top; y < 15; y++) p.set(x + (y < top + 3 ? 0 : 0), y, pick(PAL.olive, 0.4 + (y - top) * -0.02 + (k & 1) * 0.2, x, y)); if (k % 2 === 0) { p.set(x, top - 1, pk('#5a3418')); p.set(x, top, pk('#7a4a24')); p.set(x, top + 1, pk('#5a3418')); } } outline(p, 0.45); return p; },
  pot: () => { const p = new Pix(16, 16); for (let y = 9; y < 15; y++) for (let x = 4; x < 12; x++) { const w = 4 - (y - 9) * 0.25; if (Math.abs(x + 0.5 - 8) > w) continue; p.set(x, y, pick(PAL.red, cl(0.6 - (x - 4) * 0.06 + (y === 9 ? 0.3 : 0)), x, y)); } for (let k = 0; k < 6; k++) blob(p, 5 + hash(k, 0, 1) * 6, 5 + hash(k, 1, 1) * 4, 2.6, PAL.leaf, { seed: k }); for (let k = 0; k < 5; k++) p.set(5 + Math.floor(hash(k, 3, 2) * 7), 3 + Math.floor(hash(k, 4, 2) * 5), PAL.flowers[k % 3]); outline(p, 0.45); return p; },
  board: () => { const p = new Pix(16, 16); for (const x of [3, 12]) for (let y = 4; y < 15; y++) p.set(x, y, pick(PAL.wood, 0.3, x, y)); for (let y = 2; y < 11; y++) for (let x = 2; x < 14; x++) p.set(x, y, pick(PAL.wood, y === 2 ? 0.85 : 0.55 + (hash(x, y, 1) - 0.5) * 0.15, x, y)); for (const [x, y, w, h] of [[3, 4, 4, 3], [8, 3, 4, 4], [4, 8, 6, 2]]) p.rect(x, y, w, h, pick(PAL.cloth, 0.8, x, y)); outline(p, 0.45); return p; },
};
function crate(p, x0, y0, w, h) {
  const R = PAL.wood, top = 4;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const fx = x - x0, fy = y - y0; let v;
    if (fy < top) v = 0.78 + (fy === 0 ? 0.12 : 0) - (fx % 4 === 0 ? 0.15 : 0);
    else { const frame = fx === 0 || fx === w - 1 || fy === top || fy === h - 1; v = frame ? 0.42 : 0.55 - (((fy - top) % 3) === 0 ? 0.18 : 0); if (!frame && Math.abs((fx - 1) * (h - top - 2) / (w - 2) - (fy - top - 1)) < 1) v = 0.38; v -= fx / w * 0.15; }
    p.set(x, y, pick(R, cl(v + (hash(x, y, 2) - 0.5) * 0.08), x, y));
  }
  for (let x = x0 - 1; x <= x0 + w; x++) { if (!p.on(x, y0 - 1)) p.set(x, y0 - 1, pick(R, 0.08, x, 0)); p.set(x, y0 + h, pick(R, 0.08, x, 0)); }
  for (let y = y0; y < y0 + h; y++) { p.set(x0 - 1, y, pick(R, 0.08, 0, y)); p.set(x0 + w, y, pick(R, 0.08, 0, y)); }
}
const propPix = (k) => once('pp' + k, () => PROPS[k]());

// ---------------------------------------------------------------- hedges, fences, flower beds, graves, static props, shadows
function decorate(m, S) {
  const { P, O, chAt, W, H, snow, swamp } = S, base = m.base || m.rows, at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '' : base[y][x]);
  // shadows first (they darken everything painted in this canvas)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = base[y][x];
    if (c === '#' && at(x, y + 1) !== '#' && at(x, y + 1) !== '') shRect(S, x * 16, (y + 1) * 16, 16, 4);
    if (c === 'T' || c === 't') shEll(S, x * 16 + 11, y * 16 + 13, 10, 4.5);
    if (c === 'h' && at(x, y + 1) !== 'h') shRect(S, x * 16 + 1, (y + 1) * 16, 15, 2);
  }
  for (const b of m.buildings || []) { const R0 = (b.x + b.w) * 16; for (let k = 0; k < 10; k++) shRect(S, R0 + k, b.y * 16 - 4 + k, 1, b.h * 16 + 4 - k); shRect(S, b.x * 16 + 2, (b.y + b.h) * 16, b.w * 16 - 2, swamp ? 0 : 1); }
  for (const f of centres(m)) shEll(S, (f.x + f.w / 2) * 16 + 5, (f.y + f.h) * 16 - 4, f.w * 8, 5);
  for (const pr of m.props || []) {
    const X = pr.x * 16, Y = pr.y * 16;
    if (pr.k === 'lamp') shEll(S, X + 11, Y + 14, 5, 2);
    else if (pr.k === 'stall') shRect(S, X + 2, Y + 30, 46, 4);
    else if (PROPS[pr.k]) { const w = propPix(pr.k).w; shEll(S, X + w / 2 + 3, Y + 14, w / 2 - 1, 2.5); }
    else if (pr.k === 'well' || pr.k === 'snowman' || pr.k === 'statue' || pr.k === 'totem') shEll(S, X + (pr.k === 'well' ? 20 : 11), Y + (pr.k === 'well' ? 29 : 14), pr.k === 'well' ? 15 : 7, 3);
    else if (pr.k === 'castle') shRect(S, X, Y + 80, 208, 3);
  }
  // hedges: rows of sphere-shaded leaf clumps with a dark rim
  const hm = new Set(), HR = snow ? PAL.pine : swamp ? PAL.olive : PAL.leafD;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (base[y][x] === 'h') for (const [ox, oy] of [[4, 5], [12, 5], [8, 3], [4, 11], [12, 11], [8, 9]]) blob(P, O + x * 16 + ox + (hash(x, y, ox) - 0.5) * 2, O + y * 16 + oy, 5, HR, { seed: x * 7 + y, rimDark: 0.25, mask: hm, amb: 0.15 });
  edgeMask(P, hm, HR[0]);
  if (snow) for (const i of hm) { const x = i % P.w, y = (i / P.w) | 0; if (!hm.has(i - P.w * 2) && hash(x, y, 3) < 0.85) P.d[i] = pick(PAL.snow, 0.85, x, y); }
  // flower beds: dark soil, stone edging and dense blooms
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (base[y][x] === 'w') {
    const L = at(x - 1, y) === 'w', Rt = at(x + 1, y) === 'w', U = at(x, y - 1) === 'w', D = at(x, y + 1) === 'w';
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const px = O + x * 16 + i, py = O + y * 16 + j, edge = (!L && i < 2) || (!Rt && i > 13) || (!U && j < 2) || (!D && j > 13);
      P.set(px, py, edge ? pick(PAL.stone, (!U && j < 2) || (!L && i < 2) ? 0.75 : 0.35, px, py) : pick(PAL.mud, 0.3 + hash(px, py, 1) * 0.3, px, py)); }
    for (let k = 0; k < 7; k++) { const cx = O + x * 16 + 3 + hash(x * 9 + k, y, 1) * 10, cy = O + y * 16 + 3 + hash(x * 9 + k, y, 2) * 10; blob(P, cx, cy + 1, 2.6, PAL.leaf, { seed: k + x }); }
    for (let k = 0; k < 9; k++) { const cx = Math.floor(O + x * 16 + 3 + hash(x * 13 + k, y, 3) * 10), cy = Math.floor(O + y * 16 + 3 + hash(x * 13 + k, y, 4) * 10), fc = PAL.flowers[(x * 3 + y * 5 + k) % 6];
      P.set(cx, cy - 1, fc); P.set(cx - 1, cy, fc); P.set(cx + 1, cy, dk(fc, 0.75)); P.set(cx, cy + 1, dk(fc, 0.7)); P.set(cx, cy, pk('#fff4a0')); }
  }
  // fences: posts with two rails, joined to neighbouring fence tiles
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (base[y][x] === 'f') {
    const L = at(x - 1, y) === 'f', Rt = at(x + 1, y) === 'f', U = at(x, y - 1) === 'f', D = at(x, y + 1) === 'f', X = O + x * 16, Y = O + y * 16, R = PAL.wood;
    const rail = (yy) => { for (let i = L ? 0 : 7; i <= (Rt ? 15 : 8); i++) { P.set(X + i, Y + yy, pick(R, 0.78, X + i, Y + yy)); P.set(X + i, Y + yy + 1, pick(R, 0.4, X + i, Y + yy)); P.set(X + i, Y + yy + 2, pick(R, 0.08, X + i, Y + yy)); S.SH[(Y + yy + 3) * S.GW + X + i] = 1; } };
    if (L || Rt) { rail(5); rail(10); }
    if (U || D) for (let j = U ? 0 : 7; j <= (D ? 15 : 9); j++) { P.set(X + 7, Y + j, pick(R, 0.7, X, Y + j)); P.set(X + 8, Y + j, pick(R, 0.4, X, Y + j)); P.set(X + 9, Y + j, pick(R, 0.08, X, Y + j)); S.SH[(Y + j) * S.GW + X + 10] = 1; }
    for (let j = 2; j < 15; j++) for (let i = 6; i < 10; i++) P.set(X + i, Y + j, pick(R, j === 2 ? 0.95 : i === 6 ? 0.7 : i === 9 ? 0.15 : 0.45 - j * 0.01, X + i, Y + j));
    P.set(X + 5, Y + 3, pick(R, 0.08, 0, 0)); P.set(X + 10, Y + 3, pick(R, 0.08, 0, 0)); for (let i = 6; i < 10; i++) P.set(X + i, Y + 1, pick(R, 0.08, 0, 0));
    if (snow) for (let i = 6; i < 10; i++) P.set(X + i, Y + 2, pk('#ffffff'));
  }
  // graves
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (base[y][x] === 'G') { const g = propPix('grave'); P.blit(g, O + x * 16, O + y * 16); }
  // static props
  for (const pr of m.props || []) if (PROPS[pr.k]) P.blit(propPix(pr.k), O + pr.x * 16, O + pr.y * 16);
}
PROPS.grave = () => { const p = new Pix(16, 16); for (let y = 2; y < 14; y++) for (let x = 4; x < 12; x++) { if (y < 4 && Math.hypot(x + 0.5 - 8, y + 0.5 - 4.5) > 4.2) continue; p.set(x, y, pick(PAL.stone, cl(0.7 - (x - 4) * 0.07 + (y === 2 ? 0.2 : 0) + ((x === 7 || x === 8) && y > 4 && y < 10 || (y === 6 && x > 5 && x < 10) ? -0.35 : 0)), x, y)); } for (let x = 3; x < 13; x++) p.set(x, 14, pick(PAL.mud, 0.4, x, 14)); outline(p, 0.45); return p; };
function edgeMask(P, set, col) { const add = []; for (const i of set) for (const n of [i - 1, i + 1, i - P.w, i + P.w]) if (!set.has(n) && n >= 0 && n < P.d.length) add.push(n); for (const n of add) P.d[n] = col; }

// ---------------------------------------------------------------- trees (36 px wide, rooted at the bottom-centre of their tile)
function trunk(p, cx, y0, y1, R, wide = 3) {
  for (let y = y0; y <= y1; y++) { const flare = y > y1 - 3 ? (y - (y1 - 3)) * 1.3 : 0, hw = wide + flare;
    for (let x = Math.floor(cx - hw); x <= cx + hw; x++) { const u = (x + 0.5 - cx) / hw; if (Math.abs(u) > 1) continue; p.set(x, y, pick(R, cl(0.75 - u * 0.55 - (hash(x, y >> 1, 3) < 0.2 ? 0.2 : 0) - (y === y1 ? 0.3 : 0)), x, y)); } }
}
function treePix(kind, v) {
  return once(`tr${kind}${v}`, () => {
    if (kind === 'pine') {
      const p = new Pix(36, 50), cx = 18; trunk(p, cx, 40, 47, PAL.bark, 2.5);
      for (let k = 0; k < 5; k++) { const top = 1 + k * 7 + (k ? 0 : 0), bot = top + 11 + (k > 2 ? 2 : 0), hw0 = 5 + k * 3.1 + v * 0.6;
        for (let y = top; y <= bot; y++) { const t = (y - top) / (bot - top), hw = hw0 * (0.18 + 0.82 * t) + (y === bot ? -1 : 0);
          for (let x = Math.floor(cx - hw - 1); x <= cx + hw + 1; x++) { const u = (x + 0.5 - cx) / hw; if (Math.abs(u) > 1 + (t > 0.85 && hash(x, k, 7) < 0.5 ? 0.12 : 0)) continue;
            if (y === bot && (Math.floor(x / 3) + k) % 2 === 0) continue; // ragged hem
            const snowy = y - top < 2.5 + (1 - Math.abs(u)) * 3 + hash(x, k, 9) * 1.5 || (t > 0.55 && u < -0.55 && hash(x, y, 4) < 0.5);
            if (v < 2 && snowy) p.set(x, y, pick(PAL.snow, cl(0.95 - u * 0.25 - t * 0.3), x, y));
            else p.set(x, y, pick(PAL.pine, cl(0.62 - u * 0.4 - t * 0.25 + (hash(x, y, 11) - 0.5) * 0.25 + ((x + y * 2) % 5 === 0 ? 0.12 : 0)), x, y)); } } }
      outline(p, 0.32); return canv(p);
    }
    const sw = kind === 'swamp', p = new Pix(36, 46), cx = 18, R = sw ? PAL.olive : v === 1 ? PAL.leafD : PAL.leaf, bark = PAL.bark;
    trunk(p, cx, 26, 44, bark, sw ? 3.5 : 2.6);
    if (sw) for (const s of [-1, 1]) for (let k = 0; k < 7; k++) { const x = Math.round(cx + s * (3 + k * 1.1)), y = 37 + Math.round(k * 0.9); p.set(x, y, pick(bark, 0.4, x, y)); p.set(x, y + 1, pick(bark, 0.2, x, y)); }
    const bl = sw ? [[18, 9, 8], [9, 13, 7], [27, 13, 7], [4, 18, 5], [32, 18, 5], [13, 18, 8], [24, 18, 8], [18, 16, 9]]
      : [[18, 7, 7], [10, 11, 7], [26, 11, 7], [18, 14, 10], [5, 18, 6], [31, 18, 6], [11, 21, 8], [25, 21, 8], [18, 24, 8]];
    const jit = (k) => (hash(v, k, 5) - 0.5) * 3;
    bl.map((b, k) => [b[0] + jit(k), b[1] + jit(k + 9) * 0.6, b[2] + jit(k + 20) * 0.3]).sort((a, b) => a[1] - b[1]).forEach(([x, y, r], k) => blob(p, x, y, r, R, { seed: v * 31 + k, rimDark: 0.3, jit: 0.2, amb: 0.1 }));
    for (let i = 0; i < 70; i++) { const x = Math.floor(hash(i, v, 1) * 36), y = Math.floor(hash(i, v, 2) * 34); const c = p.get(x, y); if (!cA(c)) continue; const li = R.indexOf(c); if (li >= R.length - 4) { p.set(x, y, R[Math.min(R.length - 1, li + 2)]); p.set(x + 1, y + 1, R[Math.max(0, li - 2)]); } }
    if (v === 2 && !sw) for (let i = 0; i < 14; i++) { const x = Math.floor(5 + hash(i, 3, 3) * 26), y = Math.floor(6 + hash(i, 4, 3) * 22); if (p.on(x, y)) { p.set(x, y, pk('#e83040')); p.set(x + 1, y, pk('#a01828')); p.set(x, y - 1, pk('#ff9080')); } }
    if (sw) for (let x = 3; x < 34; x++) if (hash(x, 1, 7) < 0.4) { let y = 0; while (y < 30 && !(p.on(x, y) && !p.on(x, y + 1))) y++; const L = 3 + Math.floor(hash(x, 2, 7) * 8); for (let k = 1; k <= L; k++) p.set(x, y + k, pick(PAL.moss, 0.75 - k * 0.05, x, y + k)); }
    outline(p, 0.3); return canv(p);
  });
}

// ---------------------------------------------------------------- buildings
const FONT = { I: ['###', '.#.', '.#.', '.#.', '###'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'] };
const ICON = { // 9x7 icons on plaques: k dark, w white/silver, s silver shade, g gold, r red, R dark red, b blue, B dark blue, c cyan
  shop: ['...kk....', '...gg....', '..krrk...', '.krwrRk..', '.krrrRk..', '.kRRRRk..', '..kkkk...'],
  smith: ['w.......w', '.ws...sw.', '..ws.sw..', '...wsw...', '..gsg.g..', '.g.....g.', 'k.......k'],
  guild: ['.kkkkkkk.', '.kbbgbbk.', '.kbgggbk.', '.kbbgbbk.', '..kbgbk..', '...kbk...', '....k....'],
};
const ICOL = { k: '#1a1008', w: '#f0f4f8', s: '#8a96a8', g: '#f8c838', r: '#e83040', R: '#901828', b: '#3060d0', B: '#1a3080', c: '#80e0f8' };
function plaque(p, kind, cx, y0) {
  const w = kind === 'inn' ? 19 : 13, h = 9, x0 = Math.round(cx - w / 2);
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const e = x === x0 || x === x0 + w - 1 || y === y0 || y === y0 + h - 1; p.set(x, y, e ? pick(PAL.wood, 0.05, x, y) : pick(PAL.wood, y === y0 + 1 ? 0.8 : 0.5 + (hash(x, y, 2) - 0.5) * 0.12 - (y - y0) * 0.03, x, y)); }
  if (kind === 'inn') { let x = x0 + 3; for (const ch of 'INN') { FONT[ch].forEach((r, j) => [...r].forEach((c, i) => { if (c === '#') { p.set(x + i, y0 + 2 + j, pk('#f8d858')); p.set(x + i + 1, y0 + 3 + j, p.get(x + i + 1, y0 + 3 + j) === pk('#f8d858') ? pk('#f8d858') : pk('#3a2010')); } })); x += FONT[ch][0].length + 1; } return; }
  const ic = ICON[kind]; if (ic) ic.forEach((r, j) => [...r].forEach((c, i) => { if (c !== '.') p.set(x0 + 2 + i, y0 + 1 + j, pk(ICOL[c])); }));
}
function windowAt(p, x0, y0, w, h, o) { // lit window: frame, warm glow, mullions, sill, shutters, flower box
  const { shut = PAL.green, box = false, snow = false, open = false, frame = PAL.timber } = o;
  for (let y = y0 - 1; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) p.set(x, y, pick(frame, 0.12, x, y));
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const u = (x + 0.5 - x0) / w - 0.5, v = (y + 0.5 - y0) / h - 0.5; let g = 0.82 - Math.hypot(u * 1.2, v) * 0.7 + (u + v < -0.35 ? 0.12 : 0) - (v < -0.3 ? 0.08 : 0);
    if (open) g -= 0.1; p.set(x, y, pick(PAL.glow, cl(g), x, y));
  }
  if (!open) { const mx = x0 + (w >> 1) - (w % 2 ? 0 : 1), my = y0 + Math.floor(h * 0.42); for (let y = y0; y < y0 + h; y++) p.set(mx, y, pick(frame, 0.35, mx, y)); if (w % 2 === 0) for (let y = y0; y < y0 + h; y++) p.set(mx + 1, y, pick(frame, 0.2, mx, y)); for (let x = x0; x < x0 + w; x++) p.set(x, my, pick(frame, 0.3, x, my)); }
  for (let x = x0 - 2; x <= x0 + w + 1; x++) { p.set(x, y0 + h, pick(PAL.plaster, 0.95, x, 0)); p.set(x, y0 + h + 1, pick(PAL.plaster, 0.35, x, 0)); if (snow) p.set(x, y0 + h - 1 + (x === x0 - 2 || x === x0 + w + 1 ? 1 : 0), pk('#ffffff')); }
  if (shut) for (const sx of [x0 - 4, x0 + w + 1]) for (let y = y0 - 1; y <= y0 + h - 1; y++) for (let x = sx; x < sx + 3; x++) p.set(x, y, pick(shut, cl((x === sx ? 0.85 : x === sx + 2 ? 0.25 : 0.55) - (y === y0 + (h >> 1) ? 0.3 : 0) + (y === y0 - 1 ? 0.15 : 0)), x, y));
  if (box) { const by = y0 + h + 2; for (let y = by; y < by + 3; y++) for (let x = x0 - 2; x <= x0 + w + 1; x++) p.set(x, y, pick(PAL.wood, y === by ? 0.7 : 0.35, x, y));
    for (let x = x0 - 2; x <= x0 + w + 1; x++) { const k = hash(x, by, 3); p.set(x, by - 1, k < 0.55 ? PAL.flowers[(x * 7 + by) % 5] : pick(PAL.leaf, 0.5, x, by)); if (k < 0.5) p.set(x, by - 2, pick(PAL.leaf, 0.75, x, by)); if (k > 0.75) p.set(x, by, pick(PAL.leaf, 0.4, x, by)); } }
}
function doorAt(p, x0, yb, w, h, o) { // arched plank door standing on row yb, with stone frame and a step
  const { frame = PAL.stone, wood = PAL.plank, step = true } = o, top = yb - h + 1;
  for (let y = top - 2; y <= yb; y++) for (let x = x0 - 2; x <= x0 + w + 1; x++) { const ar = y < top + 2 && (x < x0 + (top + 2 - y) - 1 || x > x0 + w - (top + 2 - y)); if (ar && y < top) continue; p.set(x, y, pick(frame, cl(x < x0 ? 0.8 : x >= x0 + w ? 0.3 : y < top ? 0.75 : 0.5), x, y)); }
  for (let y = top; y <= yb; y++) for (let x = x0; x < x0 + w; x++) {
    if (y < top + 2 && (x === x0 || x === x0 + w - 1) && y < top + 1) continue;
    const pl = (x - x0) % 4; let v = 0.55 + (hash(Math.floor((x - x0) / 4), 5, 3) - 0.5) * 0.15 - (y < top + 3 ? 0.18 : 0) - (x - x0) * 0.015;
    if (pl === 0) v = 0.12; else if (pl === 1) v += 0.12; if (y === top + 4 || y === yb - 4) v = 0.2;
    p.set(x, y, (y === top + 4 || y === yb - 4) && pl !== 0 ? pick(PAL.iron, 0.55, x, y) : pick(wood, cl(v), x, y));
  }
  p.set(x0 + w - 3, top + Math.floor(h * 0.55), pk('#f8d058')); p.set(x0 + w - 3, top + Math.floor(h * 0.55) + 1, pk('#8a5e10'));
  if (step) for (let y = yb + 1; y <= yb + 2; y++) for (let x = x0 - 2; x <= x0 + w + 1; x++) p.set(x, y, pick(PAL.fstone, y === yb + 1 ? 0.85 : 0.4, x, y));
}
function buildingPix(theme, b) {
  return once(`bd${theme}${b.x},${b.y}`, () => {
    const w = b.w * 16, H = (b.h + 1) * 16, p = new Pix(w, H), seed = b.x * 31 + b.y * 17, rnd = (k) => hash(seed, k, 99);
    const snow = theme === 'snowtown', swamp = theme === 'swamptown', two = b.h >= 5 && !swamp, stilt = swamp ? 11 : 0;
    const yB = H - 1 - stilt - (swamp ? 0 : 0), WH = two ? 44 : 31, yE = yB - WH + 2, yR = 6, dc = b.door * 16 + 8;
    const RR = swamp ? PAL.thatch : PAL.slate, WALL = swamp ? PAL.plank : snow ? PAL.splaster : PAL.plaster, shut = [PAL.green, PAL.blue, PAL.red][Math.floor(rnd(3) * 3)];
    const hip = swamp || rnd(1) < 0.55, hx = hip ? Math.min(Math.floor(w * 0.2), Math.floor((yE - yR) * 0.55)) : 0;
    // cross gables: one over the door for shops (holds the sign), a second one on big buildings
    const gables = [], ghw = Math.min(11, (b.w * 16) / 4);
    if (b.kind !== 'house' || rnd(4) < 0.6) gables.push({ cx: dc, hw: two ? 12 : 10, ya: yR + 4 });
    if (b.w >= 6) { const side = dc < w / 2 ? w - 22 : 22; gables.push({ cx: side, hw: 9, ya: yR + 8 }); }
    const inG = (x) => gables.some((g) => Math.abs(x + 0.5 - g.cx) <= g.hw + 1);
    // ---- walls
    for (let y = yE + 1; y <= yB; y++) for (let x = 1; x < w - 1; x++) {
      const fy = y - yE - 1; let c;
      if (swamp) { const bi = Math.floor(x / 4), pl = x % 4; let v = 0.5 + (hash(bi, 2, seed) - 0.5) * 0.3 + (vnoise(x * 3, y, 4, seed) - 0.5) * 0.2 - (yB - y < 5 ? 0.15 : 0); if (pl === 0) v = 0.1; c = pick(WALL, cl(v - (fy < 3 && !inG(x) ? 0.35 - fy * 0.1 : 0)), x, y); }
      else if (y > yB - (snow ? 7 : 5)) { const row = Math.floor((yB - y) / 3), bx = Math.floor((x + row * 3) / 6), bu = (x + row * 3) % 6, bv = (yB - y) % 3; let v = 0.5 + (hash(bx, row, seed) - 0.5) * 0.3; if (bu === 0 || bv === 2) v = 0.12; else if (bv === 1 && bu === 1) v += 0.2; c = pick(PAL.stone, cl(v), x, y); }
      else { let v = 0.72 + (fbm(x * 1.5, y * 1.5, seed) - 0.5) * 0.2; if (fy < 3 && !inG(x)) v -= 0.42 - fy * 0.12; c = pick(WALL, cl(v), x, y); }
      p.set(x, y, c);
    }
    const beamH = (y, x0 = 1, x1 = w - 2, sh = true) => { for (let x = x0; x <= x1; x++) { p.set(x, y, pick(PAL.timber, 0.75, x, y)); p.set(x, y + 1, pick(PAL.timber, 0.35, x, y)); if (sh) p.set(x, y + 2, dk(p.get(x, y + 2), 0.78)); } };
    const post = (x, y0, y1) => { for (let y = y0; y <= y1; y++) { p.set(x, y, pick(PAL.timber, 0.6, x, y)); p.set(x + 1, y, pick(PAL.timber, 0.25, x, y)); } };
    const fbot = yB - (snow ? 7 : 5), upperB = yE + 19;
    if (!swamp) {
      beamH(yE + 3); beamH(fbot - 1, 1, w - 2, false); if (two) beamH(upperB);
      post(1, yE + 1, fbot); post(w - 3, yE + 1, fbot);
      for (let c = 1; c < b.w; c++) post(c * 16 - 1, yE + 3, fbot);
      // diagonal braces in the panels without windows (upper storey of big buildings, and beside doors)
      if (two) for (let c = 0; c < b.w; c++) if ((c + Math.floor(rnd(5) * 2)) % 3 === 2 && c !== b.door) for (let k = 0; k < 13; k++) { const x = c * 16 + 1 + k, y = upperB - 1 - Math.round(k * (upperB - yE - 6) / 13); p.set(x, y, pick(PAL.timber, 0.55, x, y)); p.set(x, y + 1, pick(PAL.timber, 0.25, x, y)); }
    } else { for (let x = 1; x < w - 1; x++) { p.set(x, yB, pick(PAL.timber, 0.3, x, yB)); p.set(x, yB - 1, pick(PAL.timber, 0.55, x, yB)); } post(1, yE + 1, yB); post(w - 3, yE + 1, yB); }
    // windows and door, one bay (tile column) at a time
    for (let c = 0; c < b.w; c++) {
      const bx = c * 16;
      if (c === b.door) {
        doorAt(p, bx + 2, yB - (swamp ? 1 : 2), 12, two ? 20 : 19, { wood: swamp ? PAL.bark : PAL.plank, frame: swamp ? PAL.timber : PAL.stone, step: !swamp });
        if (two && b.kind !== 'house') plaque(p, b.kind, bx + 8, yE + 6);
        if (b.kind === 'inn' || b.kind === 'guild') for (const lx of [bx - 1, bx + 15]) { p.set(lx, yB - 17, pick(PAL.iron, 0.3, 0, 0)); for (let y = yB - 16; y < yB - 12; y++) { p.set(lx, y, pick(PAL.glow, 0.9, 0, y)); p.set(lx + 1, y, pick(PAL.glow, 0.6, 0, y)); } p.set(lx, yB - 12, pick(PAL.iron, 0.3, 0, 0)); }
        continue;
      }
      const opt = { shut: swamp ? PAL.bark : shut, box: !swamp && (c + b.x) % 2 === 0, snow, open: swamp, frame: swamp ? PAL.bark : PAL.timber };
      if (two) { windowAt(p, bx + 5, yE + 6, 6, 8, { ...opt, box: true }); windowAt(p, bx + 4, upperB + 5, 8, 9, opt); }
      else windowAt(p, bx + 4, yE + 7, 8, swamp ? 8 : 10, opt);
    }
    if (snow) for (let x = 1; x < w - 1; x++) { const hgt = 2 + Math.floor(vnoise(x, 0, 5, seed) * 4); if (Math.abs(x + 0.5 - dc) < 8) continue; for (let y = yB - hgt; y <= yB; y++) p.set(x, y, pick(PAL.snow, cl(0.9 - (y - (yB - hgt)) * 0.06 - (x / w) * 0.2), x, y)); }
    if (swamp) { // platform and stilts down into the water, a ladder under the door
      for (let y = yB + 1; y <= yB + 3; y++) for (let x = 0; x < w; x++) p.set(x, y, pick(PAL.timber, y === yB + 1 ? 0.7 : 0.25, x, y));
      for (const sx of [2, Math.floor(w / 2) - 1 + (b.door === Math.floor(b.w / 2) ? 10 : 0), w - 5]) for (let y = yB + 4; y < H; y++) for (let x = sx; x < sx + 3; x++) p.set(x, y, y >= H - 2 ? pk('#5a6a4a') : pick(PAL.bark, x === sx ? 0.75 : 0.3, x, y));
      for (let y = yB + 1; y < H; y++) { p.set(dc - 6, y, pick(PAL.wood, 0.5, 0, y)); p.set(dc + 5, y, pick(PAL.wood, 0.3, 0, y)); if ((H - y) % 3 === 1) for (let x = dc - 5; x < dc + 5; x++) p.set(x, y, pick(PAL.wood, 0.75, x, y)); }
    }
    // ---- main roof: back slope, ridge, front plane and hips
    const sh = (x, y, plane, kk) => roofPx(RR, x, y, yE, plane, seed, kk, swamp, snow);
    for (let y = 1; y <= yE; y++) for (let x = 0; x < w; x++) {
      let pl;
      if (y >= yR) { const bl = hx * (yE - y) / (yE - yR); pl = x + 0.5 < bl ? 0.25 : x + 0.5 > w - bl ? -0.28 : 0; if (hip && (Math.abs(x + 0.5 - bl) < 0.8 || Math.abs(x + 0.5 - (w - bl)) < 0.8)) { p.set(x, y, pick(RR, swamp ? 0.3 : 0.85, x, y)); continue; } }
      else { const ins = hip ? hx + (yR - y) * 1.6 : (swamp ? (yR - y) : 0); if (x < ins || x > w - 1 - ins || y < 2) continue; pl = -0.32; }
      if (y === yR - 1 || y === yR) { p.set(x, y, swamp ? pick(RR, y === yR ? 0.35 : 0.7, x, y) : pick(RR, y === yR - 1 ? (x % 4 === 0 ? 0.55 : 0.9) : 0.3, x, y)); continue; }
      p.set(x, y, sh(x, y, pl, 0));
    }
    if (!hip) for (let y = 2; y <= yE; y++) for (const [x, v] of [[0, 0.1], [1, 0.75], [w - 2, 0.45], [w - 1, 0.1]]) p.set(x, y, pick(PAL.wood, v, x, y));
    for (let x = 0; x < w; x++) p.set(x, yE, swamp ? (hash(x, 1, seed) < 0.5 ? 0 : pick(RR, 0.15, x, yE)) : pick(RR, 0.08, x, yE)); // eave edge
    if (swamp) for (let x = 0; x < w; x++) if (hash(x, 2, seed) < 0.6) for (let k = 1; k <= 1 + Math.floor(hash(x, 3, seed) * 3); k++) p.set(x, yE + k, pick(RR, 0.5 - k * 0.12, x, yE + k)); // dangling straw
    // ---- cross gables: Λ roof band, bargeboards and a half-timbered face (with window or sign)
    for (const g of gables) {
      const half = g.hw + 3, d = g.ya - yR + 3, edge = (x) => g.ya + Math.abs(x + 0.5 - g.cx) * (yE + 1 - g.ya) / half;
      for (let x = Math.floor(g.cx - half); x < g.cx + half; x++) { if (x < 0 || x >= w) continue; const e = edge(x);
        for (let y = Math.max(1, Math.floor(e - d)); y <= yE + 1; y++) {
          if (y <= e - 2) p.set(x, y, Math.abs(y - (e - d)) < 1 ? pick(RR, 0.08, x, y) : roofPx(RR, x, y, Math.round(e), x + 0.5 < g.cx ? 0.28 : -0.22, seed + 7, 1, swamp, snow));
          else if (y <= e) p.set(x, y, swamp ? pick(RR, y > e - 1 ? 0.2 : 0.55, x, y) : pick(PAL.wood, y > e - 1 ? 0.12 : 0.7, x, y));
          else if (y <= yE + 1 && Math.abs(x + 0.5 - g.cx) <= g.hw + 1) { let v = 0.74 + (fbm(x * 1.5, y * 1.5, seed) - 0.5) * 0.2 - (y - e < 2 ? 0.3 : 0); const fx = Math.abs(x + 0.5 - g.cx);
            p.set(x, y, swamp ? pick(WALL, cl(v - 0.2 - (x % 4 === 0 ? 0.3 : 0)), x, y) : (fx < 1 || fx > g.hw && y > e + 1) ? pick(PAL.timber, x < g.cx ? 0.6 : 0.25, x, y) : pick(WALL, cl(v), x, y)); }
        } }
      if (!swamp) for (let x = Math.floor(g.cx - g.hw); x <= g.cx + g.hw; x++) { const y = yE + 1; if (edge(x) < y - 1) { p.set(x, y, pick(PAL.timber, 0.7, x, y)); p.set(x, y + 1, pick(PAL.timber, 0.3, x, y)); } }
      p.set(Math.floor(g.cx), Math.floor(g.ya) - 2, pick(PAL.wood, 0.7, 0, 0)); p.set(Math.floor(g.cx) - 1, Math.floor(g.ya) - 1, pick(PAL.wood, 0.4, 0, 0)); p.set(Math.floor(g.cx), Math.floor(g.ya) - 1, pick(PAL.wood, 0.8, 0, 0));
      const room = yE - g.ya;
      if (!two && b.kind !== 'house' && Math.abs(g.cx - dc) < 1) plaque(p, b.kind, g.cx, yE - 9);
      else if (room >= 14) windowAt(p, Math.round(g.cx - 3), Math.round(g.ya + room * 0.42), 6, Math.min(8, room - 9), { shut: null, open: swamp, frame: swamp ? PAL.bark : PAL.timber });
    }
    // ---- dormers on wide roofs, between gables
    if (yE - yR > 26) for (let c = 0; c < b.w; c++) { const cx = c * 16 + 8; if (cx < hx + 8 || cx > w - hx - 8 || gables.some((g) => Math.abs(g.cx - cx) < g.hw + 9) || (c + b.x) % 2) continue; dormer(p, cx, yR + 6, RR, swamp, snow, seed); }
    // ---- chimney
    if (!swamp || rnd(6) < 0.4) { let cx = Math.floor(hx + 4 + rnd(7) * Math.max(1, w - 2 * hx - 14)); for (const g of gables) if (Math.abs(cx + 3 - g.cx) < 5) cx = g.cx + 6 < w - hx - 7 ? g.cx + 6 : g.cx - 12;
      for (let y = 0; y <= yR + 4; y++) for (let x = cx; x < cx + 6; x++) { const row = Math.floor(y / 2), bu = (x - cx + row) % 3; let v = y < 2 ? (y === 0 ? 0.55 : 0.2) : 0.5 + (x === cx ? 0.3 : x === cx + 5 ? -0.25 : 0) - (bu === 0 || y % 2 === 1 ? 0.18 : 0); p.set(x, y, pick(PAL.stone, cl(v), x, y)); }
      if (snow) for (let x = cx; x < cx + 6; x++) p.set(x, 0, pk('#ffffff'));
      for (let y = 2; y <= yR + 6; y++) { const x = cx + 6; if (cA(p.get(x, y))) p.set(x, y, dk(p.get(x, y), 0.6)); }
      b._chim = [cx + 3, 0];
    }
    if (snow) for (let x = 1; x < w - 1; x += 1) { if (hash(x, 5, seed) < 0.45) { const L = 1 + Math.floor(hash(x, 6, seed) * 4); for (let k = 1; k <= L; k++) p.set(x, yE + k, k === L ? pk('#ffffff') : pk('#bfe4fa')); } }
    rim(p, 0.42, 'tlr'); return canv(p);
  });
}
function roofPx(R, x, y, yE, plane, seed, kk, swamp, snow) {
  if (swamp) { const n = vnoise(x * 1.1, y * 0.25, 3, seed), k = yE - y, band = ((k % 6) + 6) % 6; let v = 0.52 + plane + (n - 0.5) * 0.55 - (band === 5 ? 0.25 : 0) + (band === 0 ? 0.08 : 0) - (hash(x, Math.floor(y / 3), seed) < 0.12 ? 0.18 : 0);
    if (vnoise(x, y, 7, seed + 3) > 0.7) return pick(PAL.moss, cl(0.45 + plane + (n - 0.5) * 0.4), x, y); return pick(R, cl(v), x, y); }
  const k = yE - y, r = Math.floor(k / 4), j = ((k % 4) + 4) % 4, cx = x + (r & 1) * 2, ci = Math.floor(cx / 4), i = ((cx % 4) + 4) % 4;
  if (snow && k > 3 + (hash(ci, 0, seed) < 0.5 ? 1 : 0)) { let v = 0.68 + plane * 0.9 + (vnoise(x, y, 6, seed) - 0.5) * 0.18 - (j === 3 ? 0.07 : 0); return pick(PAL.snow, cl(v, 0.15, 1), x, y); }
  let v = 0.5 + plane + (hash(ci, r, seed) - 0.5) * 0.16 + k * 0.004;
  if (j === 3) v -= 0.3; else if (j === 0) v += 0.15; if (i === 0 && j !== 0) v -= 0.2;
  if (snow && k <= 1) return pk(k === 0 ? '#ffffff' : '#e0ecf8');
  return pick(R, cl(v), x, y);
}
function dormer(p, cx, y0, RR, swamp, snow, seed) {
  const hw = 5, ya = y0, yb = y0 + 13;
  for (let y = ya; y <= yb; y++) for (let x = cx - hw - 2; x <= cx + hw + 1; x++) {
    const e = ya + Math.abs(x + 0.5 - cx) * 0.9;
    if (y < e - 3) continue;
    if (y <= e - 1) p.set(x, y, snow ? pick(PAL.snow, x < cx ? 0.95 : 0.6, x, y) : swamp ? pick(RR, x < cx ? 0.7 : 0.35, x, y) : pick(RR, x < cx ? 0.75 : 0.35, x, y));
    else if (y <= e) p.set(x, y, pick(PAL.wood, 0.15, x, y));
    else if (Math.abs(x + 0.5 - cx) <= hw) p.set(x, y, y === yb ? pick(RR, 0.1, x, y) : pick(swamp ? PAL.plank : PAL.plaster, 0.6 - (y - e < 2 ? 0.3 : 0), x, y));
  }
  windowAt(p, cx - 2, ya + 6, 4, 5, { shut: null, open: swamp, frame: PAL.timber });
  for (let y = ya + 4; y < yb; y++) { p.set(cx + hw + 1, y, dk(p.get(cx + hw + 1, y), 0.55)); }
}

// ---------------------------------------------------------------- tall / animated props (sorted with the characters)
const oct = (dx, dy, r) => Math.max(Math.abs(dx), Math.abs(dy), (Math.abs(dx) + Math.abs(dy)) * 0.7071) <= r;
function lampPix(f, snow) {
  return once('lamp' + f + snow, () => {
    const p = new Pix(16, 42);
    for (let y = 35; y < 40; y++) for (let x = 4; x < 12; x++) p.set(x, y, pick(PAL.iron, cl(0.7 - (x - 4) * 0.08 - (y - 35) * 0.05 + (y === 35 ? 0.2 : 0)), x, y));
    for (let y = 13; y < 35; y++) { p.set(7, y, pick(PAL.iron, 0.8, 7, y)); p.set(8, y, pick(PAL.iron, 0.35, 8, y)); } for (const y of [20, 30]) for (let x = 6; x < 10; x++) p.set(x, y, pick(PAL.iron, x === 6 ? 0.9 : 0.4, x, y));
    for (let x = 5; x < 11; x++) p.set(x, 13, pick(PAL.iron, 0.5, x, 13));
    for (let y = 6; y < 13; y++) for (let x = 4; x < 12; x++) { const edge = x === 4 || x === 11 || y === 12; p.set(x, y, edge ? pick(PAL.iron, 0.3, x, y) : pick(PAL.glow, cl(0.95 - Math.abs(x - 7.5) * 0.08 - (f ? 0.08 : 0) - (y - 6) * 0.03), x, y)); }
    for (let y = 6; y < 12; y++) p.set(7 + (y & 1 ? 0 : 1), y, pick(PAL.glow, f ? 1 : 0.9, 0, y));
    for (let y = 2; y < 6; y++) for (let x = 7 - (y - 2); x <= 8 + (y - 2); x++) p.set(x, y, pick(PAL.iron, x < 8 ? 0.65 : 0.3, x, y)); p.set(7, 1, pick(PAL.iron, 0.6, 0, 0));
    if (snow) for (let x = 4; x < 12; x++) p.set(x, 5, pk('#ffffff'));
    outline(p, 0.35); return canv(p);
  });
}
function stallPix(c, theme) {
  return once('stall' + c + theme, () => {
    const p = new Pix(48, 46), A = c === 'blue' ? PAL.blue : c === 'green' ? PAL.green : PAL.red, top = 14;
    const goods = theme === 'snowtown' ? ['fur', 'fur', 'fish', 'bread'] : theme === 'swamptown' ? ['fish', 'mush', 'fish', 'herb'] : c === 'blue' ? ['fish', 'bread', 'pot', 'fish'] : ['apple', 'cab', 'orange', 'apple'];
    for (let y = top; y < 46; y++) for (let x = 3; x < 45; x++) p.set(x, y, pick(PAL.timber, y < 26 ? 0.08 : 0.2, x, y)); // shaded interior
    for (let y = 29; y < 45; y++) for (let x = 3; x < 45; x++) { const pl = (x - 3) % 5; p.set(x, y, pick(PAL.wood, cl((pl === 0 ? 0.15 : 0.5 + (hash(Math.floor(x / 5), 1, 3) - 0.5) * 0.2) - (y - 29) * 0.015 - (y === 44 ? 0.3 : 0)), x, y)); }
    for (let y = 29; y < 33; y++) for (let x = 3; x < 45; x++) { const st = Math.floor((x - 3) / 6) % 2, sc = y === 32 && Math.abs(((x - 3) % 6) - 2.5) > 2; if (!sc) p.set(x, y, st ? pick(PAL.cloth, 0.85 - (y - 29) * 0.12, x, y) : pick(A, 0.65 - (y - 29) * 0.12, x, y)); }
    for (let y = 25; y < 29; y++) for (let x = 3; x < 45; x++) p.set(x, y, pick(PAL.wood, y === 25 ? 0.95 : 0.65 - (y - 25) * 0.1, x, y));
    goods.forEach((g, k) => { const bx = 5 + k * 10; // baskets of produce on the counter
      for (let y = 21; y < 27; y++) for (let x = bx; x < bx + 9; x++) p.set(x, y, pick(g === 'fur' ? PAL.dirt : PAL.gold, cl(0.45 + ((x + y) % 2) * 0.15 - (y - 21) * 0.04 + (y === 21 ? 0.3 : 0)), x, y));
      const R = { apple: PAL.red, cab: PAL.leaf, orange: ramp('#5a2408 #8a3c0c #c05a14 #e8801c #f8a83a #ffd070'), fish: PAL.fstone, bread: PAL.gold, pot: PAL.blue, fur: PAL.cloth, mush: PAL.red, herb: PAL.green }[g];
      for (const [ox, oy] of [[2, 20], [4.5, 19.5], [7, 20], [3.2, 18], [5.8, 17.8]]) blob(p, bx + ox, oy, g === 'cab' ? 2.4 : 1.9, R, { seed: k * 7 + ox, amb: 0.2 });
    });
    for (const sx of [1, 44]) for (let y = 4; y < 46; y++) { p.set(sx, y, pick(PAL.wood, 0.75, sx, y)); p.set(sx + 1, y, pick(PAL.wood, 0.4, sx, y)); p.set(sx + 2, y, pick(PAL.wood, 0.15, sx, y)); }
    for (let y = 1; y < 16; y++) { const ins = Math.max(0, (11 - y) * 0.35); for (let x = Math.floor(ins); x < 48 - ins; x++) { // striped awning sloping toward us, scalloped hem
      const st = Math.floor(x / 6) % 2, u = (x % 6) - 2.5; if (y >= 13 && y - 13 > Math.sqrt(Math.max(0, 1 - (u / 3) ** 2)) * 2.6) continue;
      const v = 0.35 + (y / 15) * 0.5 - (y >= 13 ? 0.1 : 0) + (u < -1.5 ? 0.08 : 0); p.set(x, y, st ? pick(PAL.cloth, cl(v + 0.1), x, y) : pick(A, cl(v), x, y)); } }
    for (let x = 4; x < 44; x++) p.set(x, 1, pick(PAL.wood, 0.5, x, 1));
    if (theme === 'snowtown') for (let x = 4; x < 44; x++) for (let y = 1; y < 3 + (hash(x, 0, 3) < 0.4 ? 1 : 0); y++) p.set(x, y, pk('#ffffff'));
    outline(p, 0.35); return canv(p);
  });
}
function centrePix(theme, f, w, h) { // 'F' block: fountain (town), frozen fountain (snow), bonfire ring (swamp)
  return once(`cen${theme}${f}${w}${h}`, () => {
    const W = w * 16, Hh = h * 16 + 16, p = new Pix(W, Hh), cx = W / 2, cy = 16 + h * 8 - 2, snow = theme === 'snowtown';
    if (theme === 'swamptown') {
      for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2, x = cx + Math.cos(a) * (W / 2 - 6), y = cy + 4 + Math.sin(a) * (h * 8 - 6); blob(p, x, y, 3.6, PAL.stone, { seed: k, rimDark: 0.2 }); }
      for (const [a, b] of [[-9, 4], [9, -4]]) for (let k = -10; k <= 10; k++) { const x = cx + k, y = cy + 6 + Math.round(k * a / 40); for (let j = 0; j < 3; j++) p.set(x, y + j, pick(PAL.bark, 0.7 - j * 0.25, x, y)); }
      const fl = ramp('#8a1a08 #c43a0c #ec6a14 #f89a24 #ffd050 #fff4b0');
      for (let y = 4; y < cy + 8; y++) for (let x = cx - 10; x < cx + 10; x++) { const u = (x + 0.5 - cx) / 9, t = (cy + 8 - y) / (cy + 2), n = vnoise(x * 1.5, y + f * 6, 4, 3);
        const hgt = 1 - Math.abs(u) * 1.1 - t * 0.9 + (n - 0.5) * 0.7; if (hgt < 0) continue; p.set(x, y, pick(fl, cl(hgt * 1.6 + 0.1), x, y)); }
      for (let k = 0; k < 5; k++) { const y = Math.floor(((k * 7 + f * 5) % 26)), x = Math.floor(cx - 6 + hash(k, f, 1) * 12); p.set(x, y, pk('#ffd050')); }
      outline(p, 0.35); return canv(p);
    }
    const RW = W / 2 - 1.5, RI = RW - 4, sq = 1.42, STN = PAL.fstone, WA = PAL.water;
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - cx, dyT = (y + 0.5 - cy) * sq, dyF = (y + 0.5 - cy - 6) * sq;
      const inTop = oct(dx, dyT, RW), inFace = !inTop && y > cy && oct(dx, dyF, RW);
      if (inFace) { const seam = Math.abs(Math.abs(dx) - RW * 0.414) < 0.8 || Math.abs(dx) > RW - 0.8; p.set(x, y, pick(STN, cl(0.42 - (seam ? 0.2 : 0) - dx / W * 0.3 - (y > cy + 9 ? 0.15 : 0) + (y === Math.floor(cy + 1 + Math.sqrt(1) * 0) ? 0.1 : 0)), x, y)); continue; }
      if (!inTop) continue;
      if (!oct(dx, dyT, RI)) { const lit = -(dx + dyT) / RW; p.set(x, y, snow && dyT < 2 && hash(x, y, 3) < 0.8 ? pick(PAL.snow, 0.9, x, y) : pick(STN, cl(0.66 + lit * 0.2 + (hash(Math.floor(Math.atan2(dyT, dx) * 2.5), 1, 4) - 0.5) * 0.1), x, y)); continue; }
      if (!oct(dx, (y + 0.5 - cy - 4) * sq, RI)) { p.set(x, y, pick(STN, 0.22 + (y - (cy - RI / sq)) * 0.02, x, y)); continue; } // inner wall, far side
      const d = Math.hypot(dx, dyT);
      if (snow) { p.set(x, y, pick(PAL.ice, cl(0.55 + (fbm(x, y, 5) - 0.5) * 0.4 + ((x * 2 + y) % 13 < 1 ? 0.25 : 0)), x, y)); continue; }
      let v = 0.45 + 0.13 * Math.sin(d * 0.9 - f * Math.PI / 2) + (vnoise(x, y + f * 3, 3, 7) - 0.5) * 0.18; if (hash(x, y, f + 3) < 0.02) v = 0.95;
      p.set(x, y, pick(WA, cl(v, 0.15, 1), x, y));
    }
    // pedestal, upper bowl and jet
    const by = cy - 17;
    for (let y = by; y < cy + 3; y++) for (let x = cx - 3; x < cx + 3; x++) p.set(x, y, pick(STN, cl(0.75 - (x - cx + 3) * 0.12), x, y));
    for (let y = cy; y < cy + 4; y++) for (let x = cx - 7; x < cx + 7; x++) if (((x + 0.5 - cx) / 7) ** 2 + ((y + 0.5 - cy - 1.5) / 2.2) ** 2 < 1) p.set(x, y, snow ? pick(PAL.snow, 0.8, x, y) : pick(WA, (y + f) % 2 ? 0.95 : 0.75, x, y));
    for (let y = by - 4; y < by + 5; y++) for (let x = cx - 11; x < cx + 11; x++) { const e = ((x + 0.5 - cx) / 10.5) ** 2 + ((y + 0.5 - by + 1) / 3.6) ** 2; if (e > 1) continue; const under = y > by; p.set(x, y, under ? pick(STN, 0.35 - (x - cx) * 0.02, x, y) : e > 0.55 ? pick(STN, 0.8 - (x - cx) * 0.02, x, y) : snow ? pick(PAL.ice, 0.7, x, y) : pick(WA, 0.6 + ((x + f) % 3 === 0 ? 0.2 : 0), x, y)); }
    if (!snow) {
      for (const s of [-1, 1]) for (let y = by + 2; y < cy - 1; y++) for (let k = 0; k < 2; k++) { const x = Math.round(cx + s * (10 - (y - by) * 0.08) + k * s * -1); p.set(x, y, pick(WA, ((y - f * 2) % 4 + 4) % 4 < 2 ? 0.98 : 0.72, x, y)); }
      for (let y = 2; y < by - 2; y++) { p.set(cx - 1, y, pick(WA, ((y + f * 2) % 3) ? 0.95 : 0.8, 0, y)); p.set(cx, y, pick(WA, 1, 0, y)); }
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + f * 0.4, r = 3 + ((k + f) % 3); p.set(Math.round(cx + Math.cos(a) * r), Math.round(3 + Math.abs(Math.sin(a)) * 2 + ((k + f) % 3)), pick(WA, 0.98, 0, 0)); }
      for (let k = 0; k < 10; k++) { const x = Math.round(cx + (hash(k, f, 1) - 0.5) * 12), y = Math.round(cy - 2 + hash(k, f, 2) * 6); p.set(x, y, pk('#ffffff')); }
    } else { for (let y = 3; y < by - 1; y++) { const hw = (y - 3) * 0.18; for (let x = Math.floor(cx - hw - 1); x <= cx + hw; x++) p.set(x, y, pick(PAL.ice, cl(0.9 - (x - cx + hw) * 0.12), x, y)); } for (let x = cx - 10; x < cx + 10; x += 2) { const L = 2 + Math.floor(hash(x, 1, 1) * 4); for (let k = 0; k < L; k++) p.set(x, by + 3 + k, pk(k === L - 1 ? '#ffffff' : '#a8d8f0')); } }
    outline(p, 0.35); return canv(p);
  });
}
function castlePix(f) {
  return once('castle' + f, () => {
    const W = 208, Hh = 80, p = new Pix(W, Hh), R = PAL.wall;
    const block = (x0, x1, y0, y1, lit, bw = 12, bh = 7) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const row = Math.floor((y - y0) / bh), bx = Math.floor((x - x0 + (row & 1) * (bw >> 1)) / bw), bu = (x - x0 + (row & 1) * (bw >> 1)) % bw, bv = (y - y0) % bh;
      let v = 0.48 + lit + (hash(bx, row, x0) - 0.5) * 0.18 + (fbm(x, y, 3) - 0.5) * 0.12; if (bu === 0 || bv === bh - 1) v = 0.12 + lit * 0.5; else if (bv === 0 || bu === 1) v += 0.15; p.set(x, y, pick(R, cl(v - (y > Hh - 6 ? 0.12 : 0)), x, y)); } };
    const merlons = (x0, x1, y0, h) => { for (let x = x0; x <= x1; x++) { const m = Math.floor((x - x0) / 5) % 2 === 0; for (let y = y0; y < y0 + h; y++) if (m) p.set(x, y, pick(R, y === y0 ? 0.92 : (x - x0) % 5 === 0 ? 0.75 : (x - x0) % 5 === 4 ? 0.3 : 0.6, x, y)); } };
    const cap = (x0, x1, y0, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) p.set(x, y, pick(R, (x % 9 === 0 ? 0.45 : 0.72) + (y === y0 ? 0.15 : 0) - (y === y1 ? 0.25 : 0), x, y)); };
    // outer curtain walls
    for (const [a, b] of [[0, 47], [160, 207]]) { merlons(a, b, 12, 5); cap(a, b, 17, 22); block(a, b, 23, 79, a ? -0.06 : 0.04); for (const sx of [a + 14, a + 32]) for (let y = 34; y < 44; y++) { p.set(sx, y, pick(R, 0.04, 0, 0)); p.set(sx + 1, y, pick(R, 0.04, 0, 0)); } }
    // gatehouse
    merlons(80, 127, 6, 5); cap(80, 127, 11, 16); block(80, 127, 17, 79, 0.02);
    for (let y = 36; y < 80; y++) for (let x = 90; x < 118; x++) { const dx = x + 0.5 - 104, r = 14, inA = y >= 50 || dx * dx + (y + 0.5 - 50) ** 2 <= r * r, ring = y >= 50 ? Math.abs(dx) > r - 3 : dx * dx + (y + 0.5 - 50) ** 2 > (r - 3) ** 2;
      if (!inA) continue; if (ring) { p.set(x, y, pick(R, cl(0.75 - dx * 0.02 + (Math.floor(Math.atan2(y - 50, dx) * 3) % 2 ? 0.1 : -0.05)), x, y)); continue; }
      const gx = (x - 91) % 5, gy = (y - 36) % 6, bar = gx === 0 || gy === 0; p.set(x, y, bar ? pick(PAL.iron, gx === 0 ? 0.75 : 0.5, x, y) : pick(PAL.iron, y < 54 ? 0.02 : 0.08, x, y)); }
    for (let y = 77; y < 80; y++) for (let x = 91; x < 117; x++) if ((x - 91) % 5 === 0) p.set(x, y, pick(PAL.iron, 0.9, x, y)); // portcullis spikes
    // towers (in front, with arrow slits and blue banners)
    for (const [a, lit] of [[48, 0.12], [128, 0.0]]) { merlons(a - 2, a + 33, 0, 6); cap(a - 2, a + 33, 6, 11); block(a - 2, a + 33, 12, 79, lit, 10, 6); for (let y = 12; y < 80; y++) { p.set(a + 32, y, pick(R, 0.15, 0, y)); p.set(a + 33, y, pick(R, 0.08, 0, y)); p.set(a - 2, y, pick(R, 0.85, 0, y)); }
      for (let y = 14; y < 22; y++) { p.set(a + 15, y, pick(R, 0.02, 0, 0)); p.set(a + 16, y, pick(R, 0.02, 0, 0)); }
      const bx = a + 9; for (let y = 24; y < 58; y++) { const wave = Math.round(Math.sin(y * 0.25 + f * 2.1) * 0.8); for (let x = bx; x < bx + 15; x++) { const u = x - bx, tip = y > 50 && Math.abs(u - 7) > (57 - y) * 1.1; if (tip) continue; const edge = u === 0 || u === 14 || y >= 56 - Math.abs(u - 7) * 0; p.set(x + wave, y, u === 0 || u === 14 ? pick(PAL.gold, 0.6, x, y) : pick(PAL.blue, cl(0.55 + Math.sin((u + f) * 0.6) * 0.15 - (y - 24) * 0.008), x, y)); } }
      for (let x = bx - 1; x < bx + 16; x++) { p.set(x, 23, pick(PAL.iron, 0.6, x, 23)); p.set(x, 24, pick(PAL.gold, 0.7, x, 24)); }
      const fl = ['...w...', '..www..', 'w.www.w', 'wwwwwww', '..www..', '.w.w.w.', '...w...'];
      fl.forEach((r, j) => [...r].forEach((c, i) => { if (c === 'w') { const x = bx + 4 + i + Math.round(Math.sin((34 + j) * 0.25 + f * 2.1) * 0.8); p.set(x, 34 + j, pk('#f8d858')); } }));
    }
    rim(p, 0.5, 'tlr'); return canv(p);
  });
}
function pillarPix(snow) {
  return once('pillar' + snow, () => { const p = new Pix(16, 50); for (let y = 8; y < 50; y++) for (let x = 2; x < 14; x++) { const row = Math.floor((y - 8) / 6), bu = (x + row * 4) % 12, bv = (y - 8) % 6; let v = 0.55 - (x - 2) * 0.03 + (x === 2 ? 0.25 : 0) + (x === 13 ? -0.25 : 0); if (bv === 5 || bu === 0) v -= 0.25; p.set(x, y, pick(PAL.wall, cl(v), x, y)); }
    for (let y = 5; y < 9; y++) for (let x = 0; x < 16; x++) p.set(x, y, pick(PAL.wall, y === 5 ? 0.95 : 0.6 - x * 0.02, x, y));
    for (let y = 0; y < 5; y++) for (let x = 5; x < 11; x++) p.set(x, y, x === 5 || x === 10 || y === 0 ? pick(PAL.iron, 0.3, x, y) : pick(PAL.glow, 0.95 - y * 0.05, x, y));
    if (snow) for (let x = 0; x < 16; x++) p.set(x, 5, pk('#ffffff'));
    outline(p, 0.4); return canv(p); });
}
function lintelPix(w, snow) {
  return once('lintel' + w + snow, () => { const W = (w + 2) * 16, p = new Pix(W, 14); for (let y = 2; y < 12; y++) for (let x = 0; x < W; x++) { const arch = y >= 8 && x > 14 && x < W - 15 && (y - 8) > 3 * Math.sqrt(Math.max(0, 1 - ((x - W / 2) / (W / 2 - 14)) ** 2)) - 0.1; if (arch && y > 9) continue; const bu = x % 8; p.set(x, y, pick(PAL.wall, cl((y === 2 ? 0.95 : 0.6) - (bu === 0 ? 0.25 : 0) - (y > 9 ? 0.25 : 0)), x, y)); }
    for (let y = 3; y < 9; y++) for (let x = W / 2 - 8; x < W / 2 + 8; x++) p.set(x, y, pick(PAL.blue, 0.55 + (y === 3 ? 0.2 : 0), x, y)); for (let x = W / 2 - 3; x < W / 2 + 3; x++) p.set(x, 5 + (x & 1), pk('#f8d858'));
    if (snow) for (let x = 0; x < W; x++) { p.set(x, 1, pk('#ffffff')); p.set(x, 2, hash(x, 2, 2) < 0.6 ? pk('#ffffff') : p.get(x, 2)); }
    outline(p, 0.4); return canv(p); });
}
function boatPix(f, swamp) {
  return once('boat' + f + swamp, () => { const p = new Pix(34, 18), oy = f;
    for (let y = 3; y < 14; y++) for (let x = 2; x < 32; x++) { const u = (x - 2) / 30, half = 5.4 * Math.sin(Math.PI * Math.pow(u, 0.8)) + 0.2, dy = y + 0.5 - 8.5; if (Math.abs(dy) > half) continue; const inner = Math.abs(dy) < half - 1.6 && x > 4 && x < 29;
      p.set(x, y + oy, inner ? pick(swamp ? PAL.plank : PAL.wood, 0.55 + (x % 5 === 0 ? -0.3 : 0) + ((x === 12 || x === 21) ? 0.25 : 0) - dy * 0.03, x, y) : pick(swamp ? PAL.bark : PAL.wood, dy < 0 ? 0.8 : 0.25, x, y)); }
    for (let k = 0; k < 9; k++) { p.set(11 + k, 2 + oy + Math.floor(k / 3), pick(PAL.wood, 0.8, 0, 0)); }
    for (let x = 3; x < 31; x += 3) if ((x + f) % 2) p.set(x, 15, pk('#c8e8fa'));
    outline(p, 0.35); return canv(p); });
}
function shipPix(f) {
  return once('ship' + f, () => { const W = 72, Hh = 86, p = new Pix(W, Hh), oy = f;
    for (let y = 56; y < 80; y++) for (let x = 3; x < 69; x++) { const u = (x - 3) / 66, half = (y < 62 ? 1 : 1 - (y - 62) / 22) * 33 * Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.5; if (Math.abs(x - 36 - (u - 0.5) * -6) > half + 1) continue;
      const deck = y < 63; p.set(x, y + oy, deck ? pick(PAL.wood, 0.75 - ((x % 4 === 0) ? 0.2 : 0), x, y) : y === 66 || y === 67 ? pick(PAL.gold, 0.6, x, y) : pick(PAL.wood, cl(0.38 - (y - 63) * 0.012 - (x % 6 === 0 ? 0.08 : 0)), x, y)); if (!deck && y === 70 && x % 8 === 4) p.set(x, y + oy, pk('#1a1008')); }
    for (let x = 4; x < 68; x++) p.set(x, 56 + oy, pick(PAL.wood, 0.95, x, 0));
    for (const mx of [24, 46]) for (let y = 4; y < 60; y++) { p.set(mx, y + oy, pick(PAL.wood, 0.7, 0, y)); p.set(mx + 1, y + oy, pick(PAL.wood, 0.35, 0, y)); }
    for (const [mx, y0, y1, hw] of [[24, 10, 30, 13], [46, 8, 28, 12], [24, 33, 50, 15], [46, 31, 48, 14]]) { for (let x = mx - hw - 1; x <= mx + hw + 2; x++) p.set(x, y0 - 1 + oy, pick(PAL.wood, 0.4, x, 0));
      for (let y = y0; y < y1; y++) for (let x = mx - hw; x <= mx + hw + 1; x++) { const u = (x - mx) / hw, t = (y - y0) / (y1 - y0), bulge = Math.sin(t * Math.PI) * 2; if (y === y1 - 1 && Math.abs(u) > 0.9) continue; p.set(x, y + oy + Math.round(bulge * (1 - u * u) * 0.5), pick(PAL.cloth, cl(0.85 - u * 0.25 - Math.abs(t - 0.4) * 0.3 + ((x - mx) % 7 === 0 ? -0.15 : 0)), x, y)); } }
    for (let k = 0; k < 10; k++) { p.set(26 + k, 4 + oy + ((k + f) % 3 === 0 ? 1 : 0), pick(PAL.blue, 0.6 - k * 0.03, 0, 0)); p.set(26 + k, 5 + oy, pick(PAL.blue, 0.4, 0, 0)); }
    for (let k = 0; k < 20; k++) { p.set(5 + k, 56 - k * 2.2 + oy, pk('#3a2a1a')); p.set(66 - k, 56 - k * 2.4 + oy, pk('#3a2a1a')); }
    for (let x = 6; x < 66; x += 3) if ((x + f) % 2) p.set(x, 81 + (x % 2), pk('#c8e8fa'));
    outline(p, 0.35); return canv(p); });
}
function chickenPix(f, flip) {
  return once('ch' + f + flip, () => { const p = new Pix(12, 11), rows = f ? ['...........', '...........', '........rr.', '.......wwwy', '.w....wwwk.', 'wwwwwwww...', 'swwwwwwws..', '.sswwwwss..', '..ssssss...', '....y.y....', '...yy.yy...']
      : ['......rr...', '.....wwwy..', '.....wwk...', '.w...ww....', 'wwwwwww....', 'swwwwwws...', '.sswwwss...', '..ssssss...', '...........', '....y.y....', '...yy.yy...'];
    rows.forEach((r, j) => [...r].forEach((c, i) => { const x = flip ? 10 - i : i; if (c !== '.') p.set(x + 1, j, pk({ w: '#f8f8f0', s: '#c0bcb0', r: '#e02828', y: '#f0a020', k: '#201008' }[c])); })); outline(p, 0.35); return canv(p); });
}
function snowmanPix() {
  return once('snowman', () => { const p = new Pix(18, 30); blob(p, 9, 22, 7, PAL.snow, { amb: 0.3, jit: 0.05 }); blob(p, 9, 12.5, 5, PAL.snow, { amb: 0.3, jit: 0.05 }); blob(p, 9, 6, 3.8, PAL.snow, { amb: 0.3, jit: 0.05 });
    for (let x = 5; x < 14; x++) { p.set(x, 9, pick(PAL.red, 0.6, x, 9)); p.set(x, 10, pick(PAL.red, 0.35, x, 9)); } for (let y = 10; y < 15; y++) p.set(12, y, pick(PAL.red, 0.5, 0, y));
    p.set(7, 5, pk('#101018')); p.set(10, 5, pk('#101018')); p.set(9, 7, pk('#f07818')); p.set(10, 7, pk('#c05010')); for (const y of [12, 15, 19]) p.set(9, y, pk('#101018'));
    for (let k = 0; k < 5; k++) { p.set(3 - k * 0.6 + 4 - 4, 12 - k, pk('#5a3418')); p.set(14 + k * 0.6, 12 - k, pk('#5a3418')); }
    for (let y = 0; y < 3; y++) for (let x = 6; x < 12; x++) p.set(x, y, pick(PAL.iron, 0.4, x, y)); for (let x = 5; x < 13; x++) p.set(x, 3, pick(PAL.iron, 0.2, x, 3));
    outline(p, 0.4); return canv(p); });
}
function puffPix(k) { return once('puff' + k, () => { const r = 1.6 + k * 0.6, p = new Pix(12, 12); for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) { const d = Math.hypot(x + 0.5 - 6, y + 0.5 - 6) / r; if (d > 1) continue; p.set(x, y, pk(k > 3 ? '#c8ccd480' : d > 0.7 ? '#b8bcc8' : x + y < 11 ? '#f4f6fa' : '#d8dce4')); } return canv(p); }); }
function gullPix(f) { return once('gull' + f, () => { const r = f ? ['.k.....k.', '.ww...ww.', '..wwwww..', '....k....'] : ['.........', 'ww.....ww', '.wwwwwww.', '....k....']; const p = new Pix(11, 6); r.forEach((s, j) => [...s].forEach((c, i) => c !== '.' && p.set(i + 1, j + 1, pk(c === 'k' ? '#404048' : '#ffffff')))); outline(p, 0.5); return canv(p); }); }

// ---------------------------------------------------------------- per-map cache and the draw hooks used by game.js
const MC = new WeakMap();
function mapState(m) {
  let s = MC.get(m); if (s) return s;
  s = { g: buildGround(m), cen: centres(m) }; MC.set(m, s);
  for (const b of m.buildings || []) buildingPix(m.theme, b); // builds and records chimney positions
  return s;
}
const TREE_KIND = (theme, ch) => (theme === 'snowtown' || ch === 't' ? 'pine' : theme === 'swamptown' ? 'swamp' : 'leaf');
export function objects(theme, get, x, y, t, out, m) {
  const ch = get(x, y); if (ch !== 'T' && ch !== 't') return;
  const kind = TREE_KIND(theme, ch), h = hash(x, y, 1), v = kind === 'pine' ? (theme === 'snowtown' ? (h < 0.5 ? 0 : 1) : 2 + (h < 0.5 ? 0 : 1)) : kind === 'leaf' ? (h < 0.12 ? 2 : h < 0.45 ? 1 : 0) : (h < 0.5 ? 0 : 1);
  const img = treePix(kind, v); out.push({ img, x: x + 0.5 - img.width / 32, y: y + 1 - img.height / 16 + (kind === 'leaf' ? 0.12 : 0.06), z: 1, sy: y + 1 });
}
export function mapObjects(m, t, out) {
  const s = mapState(m), G = s.g, snow = m.theme === 'snowtown', swamp = m.theme === 'swamptown';
  out.push({ x: -MG, y: -MG, w: 1, h: 1, z: 0, draw: (ctx, X, Y, TS) => { const k = TS / 16, sx0 = Math.max(0, Math.floor(-X / k)), sy0 = Math.max(0, Math.floor(-Y / k)), sw = Math.min(G.GW - sx0, Math.ceil(ctx.canvas.width / k) + 2), sh = Math.min(G.GH - sy0, Math.ceil(ctx.canvas.height / k) + 2); if (sw > 0 && sh > 0) ctx.drawImage(G.cv, sx0, sy0, sw, sh, X + sx0 * k, Y + sy0 * k, sw * k, sh * k); } });
  for (const b of m.buildings || []) {
    out.push({ img: buildingPix(m.theme, b), x: b.x, y: b.y - 1, z: 1 });
    if (b._chim) for (let i = 0; i < 3; i++) { const u = (t * 0.32 + i / 3 + b.x * 0.13) % 1, k = Math.min(4, Math.floor(u * 5)); out.push({ img: puffPix(k), x: b.x + b._chim[0] / 16 - 0.375 + u * 0.5 + Math.sin(u * 5 + b.x) * 0.12, y: b.y - 1 - 0.3 - u * 1.3, z: 2 }); }
  }
  const f2 = Math.floor(t * 2) % 2, f4 = Math.floor(t * 6) % 4;
  for (const c of s.cen) out.push({ img: centrePix(m.theme, f4, c.w, c.h), x: c.x, y: c.y - 1, z: 1, sy: c.y + c.h });
  for (const pr of m.props || []) {
    const { k, x, y } = pr;
    if (k === 'lamp') out.push({ img: lampPix(Math.floor(t * 3 + x) % 5 === 0 ? 1 : 0, snow), x, y: y + 1 - 42 / 16, z: 1, sy: y + 1 });
    else if (k === 'stall') out.push({ img: stallPix(pr.c || 'red', m.theme), x, y: y + 2 - 46 / 16, z: 1, sy: y + 2 });
    else if (k === 'castle') out.push({ img: castlePix(Math.floor(t * 1.5) % 3), x, y, z: 1, sy: y + 5 });
    else if (k === 'snowman') out.push({ img: snowmanPix(), x: x - 1 / 16, y: y + 1 - 30 / 16, z: 1, sy: y + 1 });
    else if (k === 'boat') out.push({ img: boatPix(Math.floor(t * 1.2 + x) % 2, swamp), x: x - 1 / 16, y: y - 1 / 16, z: 0 });
    else if (k === 'ship') out.push({ img: shipPix(Math.floor(t * 0.9) % 2), x: x - 1 / 16, y, z: 1, sy: y + 5 });
    else if (k === 'arch') { const w = pr.w || 2; for (const px of [x - 1, x + w]) out.push({ img: pillarPix(snow), x: px, y: y + 2 - 50 / 16, z: 1, sy: y + 2 }); out.push({ img: lintelPix(w, snow), x: x - 1, y: y - 0.75, z: 2 }); }
    else if (k === 'pen') for (let i = 0; i < (pr.n || 3); i++) { // chickens wandering and pecking inside their pen
      const u = t * 0.18 + i * 2.3, cx = x + (pr.w - 0.8) * (0.5 + 0.5 * Math.sin(u * 1.3 + i)), cy = y + (pr.h - 0.8) * (0.5 + 0.5 * Math.sin(u * 0.83 + i * 2)), dir = Math.cos(u * 1.3 + i) > 0, peck = hash(Math.floor(t * 2.5), i, 4) < 0.35;
      out.push({ img: chickenPix(peck ? 1 : 0, dir), x: cx, y: cy, z: 1, sy: cy + 0.7 });
    }
  }
  if (m.props?.some((p) => p.k === 'ship' || p.k === 'boat') && !swamp) for (let i = 0; i < 2; i++) { const a = t * 0.35 + i * 3; out.push({ img: gullPix(Math.floor(t * 4 + i) % 2), x: 2.5 + Math.cos(a) * 2.2 + i * 1.5, y: 8 + i * 9 + Math.sin(a * 1.3) * 1.5, z: 2 }); }
}
