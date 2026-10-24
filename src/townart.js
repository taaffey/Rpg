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
  // ---- the Bell Village (theme 'village'): warm, late-afternoon greens, honey stone, golden thatch, terracotta
  vgrass: ramp('#12341a #1a4620 #245a24 #306e28 #408430 #539a36 #69b03e #84c64a #a2d85a #c2e878'),
  vdirt: ramp('#3c2814 #54391e #6c4e2a #876640 #a08052 #b89a68 #cdb482 #e0cc9c'),
  flag: ramp('#34302c #4a4540 #625c54 #7a7268 #938a7c #aba08e #c2b8a2 #d8cfb8 #ece4cc'),
  vwater: ramp('#0a2a3a #103c50 #184f66 #226680 #31809a #4e9db0 #78bcc6 #a8d8da #d2eeec #f0fcfa'),
  bank: ramp('#2a2012 #3c2e1a #50402a #685338 #7f6a48 #988258'),
  dry: ramp('#2a2824 #3e3b35 #55514a #6c6759 #868070 #a09883 #bab19a #d3c9ae'),
  honey: ramp('#463622 #62492e #7f6340 #9c7e54 #b99a6a #d0b480 #e4ca98 #f4e0b4'),
  wash: ramp('#6a5b46 #887960 #a69679 #c1b190 #d9caa8 #eadfbe #f6ecd0 #fffaea'),
  thatchG: ramp('#2c1c0a #46300e #644416 #845c1e #a47628 #c2903a #daa84c #ecc468 #f8dc8c #fff0b2'),
  reed: ramp('#2a2612 #403a1a #5a5026 #766934 #928244 #aea05a #c8ba74 #e0d492'),
  terra: ramp('#34160e #52220f #763018 #9c4222 #bc582c #d4743a #e68e4c #f4ac6c'),
  slateM: ramp('#262822 #383c34 #4c5248 #62695a #7a8470 #949e88 #b0b8a0 #ccd2b8'),
  oakT: ramp('#100904 #1c1007 #2c190c #402412 #563118 #6c4120 #865330'),
  ivy: ramp('#0a2010 #12301a #1a4421 #265c2a #327434 #428c3c #58a64a #78c25c'),
  bronze: ramp('#2e1a06 #4e2e0a #74480f #9c6416 #c4841e #e4a830 #f6cc4c #fff09c'),
  oakL: ramp('#0a2410 #12341a #1b461f #265a25 #336f2c #418634 #54a03c #6cb846 #8ad058 #b0e078'),
};
// per theme: what each map char is made of (ground classes) and which ramps paint it
const G_LAND = 0, G_DIRT = 1, G_ST = 2, G_PLZ = 3, G_WAT = 4, G_DOCK = 5, G_WALL = 6;
const CLS = {
  town: { ',': G_DIRT, _: G_ST, E: G_ST, H: G_ST, ':': G_PLZ, F: G_PLZ, '~': G_WAT, '=': G_DOCK, '#': G_WALL },
  snowtown: { ',': G_DIRT, _: G_ST, E: G_ST, H: G_ST, ':': G_PLZ, F: G_PLZ, '~': G_WAT, '=': G_DOCK, '#': G_WALL },
  swamptown: { ',': G_DIRT, _: G_DOCK, E: G_DOCK, H: G_DOCK, '=': G_DOCK, ':': G_PLZ, F: G_PLZ, '~': G_WAT, '#': G_WALL },
  village: { ',': G_DIRT, _: G_ST, E: G_DIRT, H: G_ST, ':': G_PLZ, '~': G_WAT, '=': G_WAT, '#': G_WALL },
};
export const isTheme = (theme) => !!CLS[theme];

// ---------------------------------------------------------------- animated water (seen through the ground canvas)
const WF = 8; // frames
function waterTex(theme, f) { // 64x64 tileable frame
  return once('wt' + theme + f, () => {
    const p = new Pix(64, 64), sw = theme === 'swamptown', R = sw ? PAL.swamp : theme === 'village' ? PAL.vwater : PAL.water, ph = (f / WF) * 64;
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
  if (m.theme === 'village') return buildVillage(m);
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
  s = { g: buildGround(m), cen: m.theme === 'village' ? [] : centres(m) }; MC.set(m, s);
  if (m.theme !== 'village') for (const b of m.buildings || []) buildingPix(m.theme, b); // builds and records chimney positions
  return s;
}
const TREE_KIND = (theme, ch) => (theme === 'snowtown' || ch === 't' ? 'pine' : theme === 'swamptown' ? 'swamp' : 'leaf');
export function objects(theme, get, x, y, t, out, m) {
  if (theme === 'village') return m && x >= 0 && y >= 0 && x < m.rows[0].length && y < m.rows.length ? villageTree(get, x, y, out) : undefined;
  const ch = get(x, y); if (ch !== 'T' && ch !== 't') return;
  const kind = TREE_KIND(theme, ch), h = hash(x, y, 1), v = kind === 'pine' ? (theme === 'snowtown' ? (h < 0.5 ? 0 : 1) : 2 + (h < 0.5 ? 0 : 1)) : kind === 'leaf' ? (h < 0.12 ? 2 : h < 0.45 ? 1 : 0) : (h < 0.5 ? 0 : 1);
  const img = treePix(kind, v); out.push({ img, x: x + 0.5 - img.width / 32, y: y + 1 - img.height / 16 + (kind === 'leaf' ? 0.12 : 0.06), z: 1, sy: y + 1 });
}
export function mapObjects(m, t, out) {
  if (m.theme === 'village') return villageObjects(m, t, out);
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

// ================================================================================================================
// THE BELL VILLAGE (theme 'village'): Haven, a thousand years ago. Golden thatch, honey stone, dry-stone walls, a brook
// and an open green. Same pipeline as the other towns (one ground bake + cached sprites), its own materials and art.
// base chars: . grass  , dirt lane  _ flagstones  : small cobbles  ~ water  = ford / bridge / jetty / stepping stones
//             # dry-stone wall  T oak  t yew  a apple tree  h hedgerow  f fence  w cottage flowers  k allotment  G grave  E exit
// ================================================================================================================
const VMAT = {
  grass: (x, y) => {
    const h = hash(x, y, 77); if (h < 0.0035) return pk('#f4f0d6'); if (h < 0.0055) return pk('#f0cc3c'); // daisies, buttercups
    return pick(PAL.vgrass, cl(0.24 + fbm(x, y, 1) * 0.5 + (vnoise(x, y, 36, 6) - 0.5) * 0.34 + tuft(x, y, 11, 0.85), 0.05, 0.94), x, y);
  },
  dirt: (x, y) => { const v = vor(x, y, 4.2, 1, 41); let s = 0.42 + (fbm(x, y, 8) - 0.5) * 0.45;
    if (v.h < 0.14 && v.e > 1.1) s += v.dx + v.dy < 0 ? 0.28 : 0.1; else if (v.e < 0.7 && v.h > 0.8) s -= 0.12; return pick(PAL.vdirt, cl(s), x, y); },
  flag: (x, y) => { // big irregular flagstones, mossy joints
    const v = vor(x, y, 10.5, 0.82, 55), n = fbm(x, y, 9);
    if (v.e < 1.15) return hash(x, y, 4) < 0.3 ? pick(PAL.moss, 0.3 + n * 0.3, x, y) : pick(PAL.flag, 0.07 + n * 0.1, x, y);
    let s = 0.52 + (v.h - 0.5) * 0.42 + (n - 0.5) * 0.22; const lit = -(v.dx + v.dy);
    if (v.e < 2.4) s += lit > 0.3 ? 0.17 : lit < -0.3 ? -0.17 : 0; if (hash(x, y, 5) < 0.035) s += hash(x, y, 6) < 0.5 ? 0.12 : -0.12;
    return pick(PAL.flag, cl(s, 0.1, 1), x, y);
  },
};
function dryWallPx(x, y, wy, tot) { // dry-stone wall: wy = pixel row down the wall's face, tot = wall height in px
  const capH = tot <= 16 ? 5 : 4;
  if (wy < capH) { // the top: rounded cap stones, mossy
    const bx = Math.floor((x + (wy < 2 ? 0 : 3)) / 6); let s = 0.68 + (hash(bx, 3, 5) - 0.5) * 0.24 + (fbm(x, y, 4) - 0.5) * 0.12;
    if (wy === 0) s += 0.14; if (wy === capH - 1) s -= 0.24; if ((((x + (wy & 1) * 3) % 6) + 6) % 6 === 0) s -= 0.18;
    if (vnoise(x, y, 6, 12) > 0.66 && hash(x, y, 7) < 0.7) return pick(PAL.moss, 0.5 + hash(x, y, 8) * 0.4, x, y);
    return pick(PAL.dry, cl(s, 0.1, 1), x, y);
  }
  const v = vor(x, y, 8.4, 0.62, 61); let s = 0.5 + (v.h - 0.5) * 0.42 + (fbm(x, y, 6) - 0.5) * 0.14;
  if (v.e < 0.95) s = 0.07; else { const lit = -(v.dx + v.dy); if (v.e < 2.1) s += lit > 0.25 ? 0.18 : lit < -0.25 ? -0.2 : 0; }
  if (wy > tot - 4) s -= 0.2;
  const mm = vnoise(x, y * 1.4, 7, 12); if (mm > 0.66 && v.e > 0.95 && (wy > tot * 0.45 || hash(x, y, 9) < 0.25)) return pick(PAL.moss, 0.35 + hash(x, y, 8) * 0.4, x, y);
  return pick(PAL.dry, cl(s, 0.05, 0.95), x, y);
}

function buildVillage(m) {
  const base = m.base || m.rows, W = base[0].length, H = base.length, TW = W + 2 * MG, TH = H + 2 * MG, GW = TW * 16, GH = TH * 16, O = MG * 16;
  const chAt = (x, y) => base[Math.max(0, Math.min(H - 1, y))][Math.max(0, Math.min(W - 1, x))];
  const C = new Uint8Array(TW * TH); for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) C[ty * TW + tx] = CLS.village[chAt(tx - MG, ty - MG)] ?? G_LAND;
  const cAt = (tx, ty) => C[Math.max(0, Math.min(TH - 1, ty)) * TW + Math.max(0, Math.min(TW - 1, tx))];
  const field = (set, r) => { // blurred mask of one ground class: gives soft, rounded borders
    const F = new Float32Array(GW * GH); for (let py = 0; py < GH; py++) for (let px = 0; px < GW; px++) F[py * GW + px] = set(C[(py >> 4) * TW + (px >> 4)]) ? 1 : 0;
    boxblur(F, GW, GH, r); boxblur(F, GW, GH, r); return F;
  };
  const WF = field((c) => c === G_WAT, 4), WB = field((c) => c === G_WAT, 11), FF = field((c) => c === G_ST || c === G_PLZ, 3), PF = field((c) => c === G_PLZ, 2), DF = field((c) => c === G_DIRT, 3);
  // lanes: which way each dirt tile runs, so cart ruts follow it (N-S or E-W lanes up to four tiles wide)
  const LANE = new Int16Array(TW * TH * 3); // [dir 0 none / 1 N-S / 2 E-W, centre px, half-width px]
  for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) if (C[ty * TW + tx] === G_DIRT) {
    let a = tx, b = tx, c = ty, d = ty; while (cAt(a - 1, ty) === G_DIRT && tx - a < 5) a--; while (cAt(b + 1, ty) === G_DIRT && b - tx < 5) b++; while (cAt(tx, c - 1) === G_DIRT && ty - c < 7) c--; while (cAt(tx, d + 1) === G_DIRT && d - ty < 7) d++;
    const hw = b - a + 1, vh = d - c + 1, k = (ty * TW + tx) * 3;
    if (hw <= 4 && vh >= hw + 2) { LANE[k] = 1; LANE[k + 1] = (a + hw / 2) * 16; LANE[k + 2] = hw * 8; } else if (vh <= 4 && hw >= vh + 2) { LANE[k] = 2; LANE[k + 1] = (c + vh / 2) * 16; LANE[k + 2] = vh * 8; }
  }
  const P = new Pix(GW, GH), SH = new Uint8Array(GW * GH);
  for (let py = 0; py < GH; py++) for (let px = 0; px < GW; px++) {
    const tx = px >> 4, ty = py >> 4, lx = px & 15, ly = py & 15, x = px - O, y = py - O, c = C[ty * TW + tx], i = py * GW + px; let col = 0;
    if (c === G_WALL) { let top = ty; while (top > MG && cAt(tx, top - 1) === G_WALL) top--; let bot = ty; while (bot < TH - MG - 1 && cAt(tx, bot + 1) === G_WALL) bot++;
      col = dryWallPx(x, y, (ty - top) * 16 + ly, (bot - top + 1) * 16);
      if (cAt(tx - 1, ty) !== G_WALL && lx <= 1) col = dk(col, 0.62); if (cAt(tx + 1, ty) !== G_WALL && lx >= 14) col = dk(col, 0.55);
    } else {
      const jag = (vnoise(x, y, 3, 19) - 0.5) * 0.12, w = WF[i] + jag + (vnoise(x, y, 4, 9) - 0.5) * 0.1;
      if (w > 0.36) { // pond / brook: wet grass fringe, muddy bank with pebbles, shallows, then open (animated) water
        if (w <= 0.44) col = dk(VMAT.grass(x, y), 0.68);
        else if (w <= 0.5) col = pick(PAL.bank, cl(0.38 + (fbm(x, y, 3) - 0.5) * 0.5 + (hash(x, y, 9) < 0.14 ? 0.35 : 0)), x, y);
        else if (w <= 0.58) col = hash(x, y, 12) < 0.55 ? pk('#86ccc470') : pk('#5aa4a068');
        else col = 0;
      } else {
        const s = FF[i] + jag, d = DF[i] + jag;
        if (s > 0.5) { const pv = PF[i] + jag * 0.5; col = s < 0.545 ? pick(PAL.flag, 0.34 + hash(x, y, 3) * 0.12, px, py) : pv > 0.5 ? (pv < 0.54 ? pick(PAL.flag, 0.2, px, py) : MAT.cobble(x, y)) : VMAT.flag(x, y); }
        else if (d > 0.5) { col = d < 0.54 ? pick(PAL.vdirt, 0.14, px, py) : VMAT.dirt(x, y);
          const k = (ty * TW + tx) * 3, dir = LANE[k]; if (dir && d > 0.6) { const u = Math.abs((dir === 1 ? px : py) - LANE[k + 1]), hw = LANE[k + 2], rc = hw * 0.5, off = Math.abs(u - rc);
            if (hw > 12 && off < 1.7) col = pick(PAL.vdirt, cl(0.3 + off * 0.1 + hash(x, y, 31) * 0.1), px, py); // cart ruts
            else if (u < rc - 3 && hash(x, y, 33) < 0.05) col = pick(PAL.vgrass, 0.5 + hash(x, y, 34) * 0.4, px, py); } } // grass tufts down the middle
        else { col = VMAT.grass(x, y); if (s > 0.43 || d > 0.44) col = dk(col, 0.74); }
      }
    }
    P.d[i] = col;
  }
  const S = { P, SH, GW, GH, O, chAt, cAt, W, H, WF, WB, C, TW, TH };
  decorateVillage(m, S);
  for (let i = 0; i < GW * GH; i++) if (SH[i]) { const c = P.d[i], a = cA(c); P.d[i] = a === 255 ? rgba(cR(c) * 0.6, cG(c) * 0.62, cB(c) * 0.7 + 12) : a ? c : pk('#00061a66'); }
  return { cv: P.canvas(), GW, GH };
}

// ---------------------------------------------------------------- the village's ground decoration (baked into the ground canvas)
function decorateVillage(m, S) {
  const { P, O, W, H } = S, base = m.base || m.rows, at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '' : base[y][x]), G = S.GW;
  // shadows first (they darken everything painted into this canvas)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = base[y][x];
    if (c === '#' && at(x, y + 1) !== '#' && at(x, y + 1) !== '') shRect(S, x * 16, (y + 1) * 16, 16, 4);
    if (c === 'T') shEll(S, x * 16 + 12, y * 16 + 13, 12, 5); else if (c === 't') shEll(S, x * 16 + 11, y * 16 + 13, 8, 4); else if (c === 'a') shEll(S, x * 16 + 11, y * 16 + 13, 9, 4);
    if (c === 'h' && at(x, y + 1) !== 'h') shRect(S, x * 16 + 1, (y + 1) * 16, 15, 2);
  }
  for (const b of m.buildings || []) { const R0 = (b.x + b.w) * 16; for (let k = 0; k < 10; k++) shRect(S, R0 + k, b.y * 16 + 6 + k, 1, b.h * 16 - 6 - k); shRect(S, b.x * 16 + 2, (b.y + b.h) * 16, b.w * 16 - 2, 1); }
  for (const pr of m.props || []) PSHADOW[pr.k]?.(S, pr);
  // hedgerows: hawthorn clumps with a dark rim, white may blossom and a few red haws
  const hm = new Set(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (base[y][x] === 'h') for (const [ox, oy] of [[4, 5], [12, 5], [8, 3], [4, 11], [12, 11], [8, 9]]) blob(P, O + x * 16 + ox + (hash(x, y, ox) - 0.5) * 2, O + y * 16 + oy, 5, PAL.leafD, { seed: x * 7 + y, rimDark: 0.25, mask: hm, amb: 0.15 });
  edgeMask(P, hm, PAL.leafD[0]);
  for (const i of hm) { const x = i % P.w, y = (i / P.w) | 0, h = hash(x, y, 41); if (h < 0.05) P.d[i] = pk('#f4f0e0'); else if (h < 0.07) P.d[i] = pk('#d8484c'); else if (h < 0.1) P.d[i] = pick(PAL.leaf, 0.85, x, y); }
  // cottage flower beds: no edging, red geraniums, marigolds, lavender
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (base[y][x] === 'w') {
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const px = O + x * 16 + i, py = O + y * 16 + j; P.set(px, py, pick(PAL.mud, 0.22 + hash(px, py, 1) * 0.3, px, py)); }
    for (let k = 0; k < 8; k++) blob(P, O + x * 16 + 2 + hash(x * 9 + k, y, 1) * 12, O + y * 16 + 3 + hash(x * 9 + k, y, 2) * 11, 2.8, PAL.leaf, { seed: k + x });
    const cols = ['#e03038', '#e03038', '#f0a020', '#b070e0', '#f8f0e0', '#e03038'];
    for (let k = 0; k < 12; k++) { const cx = Math.floor(O + x * 16 + 2 + hash(x * 13 + k, y, 3) * 12), cy = Math.floor(O + y * 16 + 2 + hash(x * 13 + k, y, 4) * 11), fc = pk(cols[(x + y + k) % cols.length]); P.set(cx, cy - 1, fc); P.set(cx - 1, cy, fc); P.set(cx + 1, cy, dk(fc, 0.75)); P.set(cx, cy + 1, dk(fc, 0.7)); P.set(cx, cy, pk('#fff4a0')); }
  }
  // fences: posts and two rails
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (base[y][x] === 'f') {
    const L = at(x - 1, y) === 'f', Rt = at(x + 1, y) === 'f', U = at(x, y - 1) === 'f', D = at(x, y + 1) === 'f', X = O + x * 16, Y = O + y * 16, R = PAL.wood;
    const rail = (yy) => { for (let i = L ? 0 : 7; i <= (Rt ? 15 : 8); i++) { P.set(X + i, Y + yy, pick(R, 0.78, X + i, Y + yy)); P.set(X + i, Y + yy + 1, pick(R, 0.4, X + i, Y + yy)); P.set(X + i, Y + yy + 2, pick(R, 0.08, X + i, Y + yy)); S.SH[(Y + yy + 3) * G + X + i] = 1; } };
    if (L || Rt) { rail(5); rail(10); }
    if (U || D) for (let j = U ? 0 : 7; j <= (D ? 15 : 9); j++) { P.set(X + 7, Y + j, pick(R, 0.7, X, Y + j)); P.set(X + 8, Y + j, pick(R, 0.4, X, Y + j)); P.set(X + 9, Y + j, pick(R, 0.08, X, Y + j)); S.SH[(Y + j) * G + X + 10] = 1; }
    for (let j = 2; j < 15; j++) for (let i = 6; i < 10; i++) P.set(X + i, Y + j, pick(R, j === 2 ? 0.95 : i === 6 ? 0.7 : i === 9 ? 0.15 : 0.45 - j * 0.01, X + i, Y + j));
    P.set(X + 5, Y + 3, pick(R, 0.08, 0, 0)); P.set(X + 10, Y + 3, pick(R, 0.08, 0, 0)); for (let i = 6; i < 10; i++) P.set(X + i, Y + 1, pick(R, 0.08, 0, 0));
  }
  villageGround2(m, S);
}

// ---------------------------------------------------------------- village trees (36-48 px wide, rooted at the bottom-centre of their tile)
function oakPix(v) {
  return once('oak' + v, () => {
    const p = new Pix(52, 58), cx = 26, R = v === 1 ? PAL.leafD : PAL.oakL;
    trunk(p, cx, 34, 56, PAL.bark, 3.4);
    for (const s of [-1, 1]) for (let k = 0; k < 7; k++) { const x = Math.round(cx + s * (3.4 + k * 1.2)), y = 52 + Math.round(k * 0.7); p.set(x, y, pick(PAL.bark, 0.45, x, y)); p.set(x, y + 1, pick(PAL.bark, 0.2, x, y)); } // roots
    if (v === 3) { for (let y = 43; y < 52; y++) for (let x = cx - 2; x <= cx + 1; x++) if (Math.hypot((x + 0.5 - cx), (y - 47) * 0.55) < 2.4) p.set(x, y, pick(PAL.bark, y < 45 ? 0.04 : 0.1, x, y)); } // a hollow in the trunk
    const bl = [[26, 9, 9], [15, 14, 9], [37, 14, 9], [26, 17, 12], [8, 23, 7], [44, 23, 7], [15, 27, 10], [37, 27, 10], [26, 29, 10], [26, 22, 11], [20, 8, 7], [33, 9, 7]];
    const jit = (k) => (hash(v, k, 5) - 0.5) * 3;
    bl.map((b, k) => [b[0] + jit(k), b[1] + jit(k + 9) * 0.6, b[2] + jit(k + 20) * 0.3]).sort((a, b) => a[1] - b[1]).forEach(([x, y, r], k) => blob(p, x, y, r, R, { seed: v * 31 + k, rimDark: 0.32, jit: 0.2, amb: 0.1 }));
    for (let i = 0; i < 110; i++) { const x = Math.floor(hash(i, v, 1) * 52), y = Math.floor(hash(i, v, 2) * 40); const c = p.get(x, y); if (!cA(c)) continue; const li = R.indexOf(c); if (li >= R.length - 4) { p.set(x, y, R[Math.min(R.length - 1, li + 2)]); p.set(x + 1, y + 1, R[Math.max(0, li - 2)]); } }
    if (v === 2) for (let i = 0; i < 16; i++) { const x = Math.floor(8 + hash(i, 3, 3) * 36), y = Math.floor(8 + hash(i, 4, 3) * 26); if (p.on(x, y)) { p.set(x, y, pk('#b88a30')); p.set(x + 1, y, pk('#7a5818')); } } // acorns
    outline(p, 0.3); return canv(p);
  });
}
function yewPix(v) {
  return once('yew' + v, () => {
    const p = new Pix(30, 50), cx = 15; trunk(p, cx, 40, 48, PAL.bark, 2.2);
    const bl = [[15, 9, 6], [15, 17, 8], [10, 24, 8], [20, 24, 8], [15, 28, 10], [9, 34, 7], [21, 34, 7], [15, 36, 9]];
    bl.forEach(([x, y, r], k) => blob(p, x + (hash(v, k, 4) - 0.5) * 1.5, y, r, PAL.pine, { seed: v * 13 + k, rimDark: 0.3, jit: 0.2, amb: 0.08, bias: -0.08 }));
    if (v === 1) for (let i = 0; i < 12; i++) { const x = Math.floor(5 + hash(i, 1, 6) * 20), y = Math.floor(8 + hash(i, 2, 6) * 30); if (p.on(x, y)) p.set(x, y, pk('#c8403c')); } // berries
    outline(p, 0.3); return canv(p);
  });
}
function applePix(v) {
  return once('apple' + v, () => {
    const p = new Pix(34, 38), cx = 17; trunk(p, cx, 20, 36, PAL.bark, 1.9);
    for (const [x, y, r] of [[17, 8, 7], [9, 13, 7], [25, 13, 7], [17, 14, 9], [11, 20, 6], [23, 20, 6], [17, 20, 7]]) blob(p, x + (hash(v, x, 5) - 0.5) * 1.5, y, r, PAL.oakL, { seed: v * 17 + x, rimDark: 0.3, jit: 0.2, amb: 0.1 });
    for (let i = 0; i < 12; i++) { const x = Math.floor(5 + hash(i, v, 3) * 24), y = Math.floor(5 + hash(i, v + 4, 3) * 19); if (!p.on(x, y)) continue;
      if (v === 1) { p.set(x, y, pk('#f4e8ec')); p.set(x + 1, y, pk('#e8a0b8')); } else { p.set(x, y, pk('#e03a2c')); p.set(x + 1, y, pk('#a01c1c')); p.set(x, y - 1, pk('#ff9a88')); } }
    outline(p, 0.3); return canv(p);
  });
}
function villageTree(get, x, y, out) {
  const ch = get(x, y); if (ch !== 'T' && ch !== 't' && ch !== 'a') return;
  const h = hash(x, y, 1); let img;
  if (ch === 't') img = yewPix(h < 0.5 ? 0 : 1); else if (ch === 'a') img = applePix(h < 0.5 ? 0 : 1); else img = oakPix(h < 0.18 ? 3 : h < 0.4 ? 2 : h < 0.7 ? 1 : 0);
  out.push({ img, x: x + 0.5 - img.width / 32, y: y + 1 - img.height / 16 + 0.1, z: 1, sy: y + 1 });
}

// ---------------------------------------------------------------- ground-baked details: water life, fords, stones, jetty, steps, flowers, allotments, graves
const stoneBlob = (p, cx, cy, rx, ry, R, seed, moss = 0) => { // a flat-topped stone seen from above-front: lit top, darker side face
  for (let y = Math.floor(cy - ry) - 2; y <= cy + ry + 3; y++) for (let x = Math.floor(cx - rx) - 1; x <= cx + rx + 1; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, top = dx * dx + dy * dy <= 1, side = !top && dx * dx + ((y + 0.5 - cy - 2.2) / ry) ** 2 <= 1; if (!top && !side) continue;
    let v = top ? 0.62 + (-dx * 0.22 - dy * 0.24) + (hash(x, y, seed) - 0.5) * 0.14 : 0.24 + (hash(x, y, seed) - 0.5) * 0.08;
    if (top && dx * dx + dy * dy > 0.7) v -= 0.12; p.set(x, y, moss && top && vnoise(x, y, 4, seed) > 0.64 ? pick(PAL.moss, 0.55, x, y) : pick(R, cl(v, 0.05, 0.95), x, y));
  }
};
function reedCluster(P, X, Y, seed) {
  const n = 3 + Math.floor(hash(seed, 1, 5) * 3);
  for (let k = 0; k < n; k++) { const dx = Math.round((hash(seed, k, 6) - 0.5) * 7), top = 6 + Math.floor(hash(seed, k, 7) * 5), lean = hash(seed, k, 8) < 0.5 ? -1 : 1;
    for (let j = 0; j < top; j++) P.set(X + dx + (j > top * 0.65 ? lean : 0), Y - j, pick(PAL.olive, 0.38 + j * 0.05 + (k & 1) * 0.12, X, Y - j));
    if (k % 2 === 0) { const hx = X + dx + lean; for (let j = top - 1; j <= top + 1; j++) { P.set(hx, Y - j, pk(j === top ? '#8a5a2a' : '#5e3a1a')); P.set(hx + 1, Y - j, pk('#4a2c14')); } } }
}
function lilyPad(P, X, Y, seed) {
  const rx = 3.4, ry = 2.1, notch = hash(seed, 1, 9) * 6.28;
  for (let y = Math.floor(Y - ry); y <= Y + ry; y++) for (let x = Math.floor(X - rx); x <= X + rx; x++) { const dx = (x + 0.5 - X) / rx, dy = (y + 0.5 - Y) / ry; if (dx * dx + dy * dy > 1) continue; if (Math.abs(Math.atan2(dy, dx) - notch) < 0.28) continue; P.set(x, y, pick(PAL.green, cl(0.78 - dy * 0.3 - dx * 0.1), x, y)); }
  if (hash(seed, 2, 9) < 0.28) { P.set(X, Y - 1, pk('#fff4f4')); P.set(X - 1, Y, pk('#f4b8d0')); P.set(X + 1, Y, pk('#f4b8d0')); P.set(X, Y, pk('#f8d848')); }
}
function bluebells(P, X, Y, seed) { for (let k = 0; k < 5; k++) { const x = X + Math.round((hash(seed, k, 11) - 0.5) * 6), y = Y + Math.round((hash(seed, k, 12) - 0.5) * 4); P.set(x, y + 1, pk('#2e7a30')); P.set(x, y, pk(hash(seed, k, 13) < 0.5 ? '#4e5ede' : '#6a7cf0')); if (hash(seed, k, 14) < 0.5) P.set(x, y - 1, pk('#8a9af8')); } }
const SPOTS = { // little flower drifts for the 'patch' prop: [colours]
  bluebell: ['#4e5ede', '#6a7cf0', '#8a9af8'], daisy: ['#ffffff', '#f4f0d6', '#f8e060'], poppy: ['#e8302c', '#f0503c', '#c01c1c'], lavender: ['#9a6ad8', '#b48ae8', '#7e4ec0'], parsley: ['#f8f8ec', '#e8ecd8', '#ffffff'], buttercup: ['#f8d838', '#f0c020', '#ffe868'],
};
function gravePix(v) {
  return once('gv' + v, () => { const p = new Pix(16, 18); const R = PAL.dry;
    if (v === 0) { for (let y = 3; y < 14; y++) for (let x = 4; x < 12; x++) { if (y < 6 && Math.hypot(x + 0.5 - 8, y + 0.5 - 6) > 4.2) continue; p.set(x, y, pick(R, cl(0.72 - (x - 4) * 0.07 + (y === 3 ? 0.2 : 0)), x, y)); } for (let y = 6; y < 9; y++) p.set(8, y, pick(R, 0.12, 8, y)); p.set(7, 7, pick(R, 0.12, 7, 7)); p.set(9, 7, pick(R, 0.12, 9, 7)); }
    else if (v === 1) { for (let y = 2; y < 15; y++) p.set(7, y, pick(R, 0.75, 7, y)), p.set(8, y, pick(R, 0.55, 8, y)), p.set(9, y, pick(R, 0.25, 9, y)); for (let x = 4; x < 12; x++) p.set(x, 5, pick(R, x < 8 ? 0.8 : 0.45, x, 5)), p.set(x, 6, pick(R, x < 8 ? 0.6 : 0.3, x, 6)); }
    else if (v === 2) { for (let y = 8; y < 14; y++) for (let x = 3; x < 13; x++) if (Math.hypot((x + 0.5 - 8) / 5, (y - 13) / 5) < 1) p.set(x, y, pick(PAL.vgrass, 0.5 + (x < 8 ? 0.15 : -0.05), x, y)); for (let y = 4; y < 11; y++) for (let x = 6; x < 11; x++) p.set(x, y, pick(R, cl(0.7 - (x - 6) * 0.1), x, y)); }
    else { for (let y = 4; y < 15; y++) { p.set(8, y, pick(PAL.wood, 0.55, 8, y)); p.set(9, y, pick(PAL.wood, 0.25, 9, y)); } for (let x = 5; x < 12; x++) p.set(x, 7, pick(PAL.wood, x < 8 ? 0.6 : 0.3, x, 7)); }
    for (let x = 3; x < 13; x++) if (hash(x, v, 3) < 0.5) p.set(x, 15, pick(PAL.mud, 0.45, x, 15));
    outline(p, 0.45); return p; });
}
function gemGrave(P, X, Y) { // Gemforge's grave: a long low slab with a carved gem, a headstone, and grey flowers that nobody admits to planting
  const x0 = X + 1, w = 30, R = PAL.dry;
  for (let y = Y + 4; y < Y + 18; y++) for (let x = x0; x < x0 + w; x++) { const top = y < Y + 12; let v = top ? 0.7 - (x - x0) * 0.004 + (y === Y + 4 ? 0.14 : 0) + (hash(x, y, 3) - 0.5) * 0.08 : 0.3 + (hash(x, y, 4) - 0.5) * 0.06; if (x === x0 || x === x0 + w - 1) v -= 0.2; P.set(x, y, pick(R, cl(v), x, y)); }
  const gx = X + 16, gy = Y + 8; for (const [dx, dy, c] of [[0, -3, '#b8f0f4'], [-1, -2, '#8ad8e4'], [0, -2, '#d8fcfc'], [1, -2, '#60b8cc'], [-2, -1, '#8ad8e4'], [-1, -1, '#b8f0f4'], [0, -1, '#e8ffff'], [1, -1, '#8ad8e4'], [2, -1, '#60b8cc'], [-1, 0, '#60b8cc'], [0, 0, '#8ad8e4'], [1, 0, '#4898b0'], [0, 1, '#4898b0']]) P.set(gx + dx, gy + dy, pk(c));
  for (let y = Y - 6; y < Y + 8; y++) for (let x = X + 25; x < X + 31; x++) { if (y < Y - 3 && Math.hypot(x + 0.5 - (X + 28), y + 0.5 - (Y - 3)) > 3.2) continue; P.set(x, y, pick(R, cl(0.74 - (x - X - 25) * 0.09 + (y === Y - 6 ? 0.18 : 0)), x, y)); } // headstone
  for (let k = 0; k < 16; k++) { const fx = X + Math.round(hash(k, 1, 21) * 34) - 2, fy = Y + 3 + Math.round(hash(k, 2, 21) * 16); const c = ['#c4c4d4', '#a8a8bc', '#dcdce8'][k % 3]; P.set(fx, fy, pk(c)); P.set(fx - 1, fy + 1, pk('#8c8ca0')); P.set(fx + 1, fy + 1, pk('#8c8ca0')); P.set(fx, fy + 1, pk('#4a6a4a')); P.set(fx, fy + 2, pk('#3a5a3a')); }
}
function villageGround2(m, S) {
  const { P, O, W, H, WF, WB, GW, C, TW } = S, base = m.base || m.rows, props = m.props || [];
  const keep = new Set(); // tiles where reeds / pads must stay away: crossings and steps
  for (const pr of props) if (['ford', 'stones', 'jetty', 'steps', 'weir', 'bridge'].includes(pr.k)) for (let j = -1; j <= (pr.h || 1); j++) for (let i = -1; i <= (pr.w || 1); i++) keep.add(`${pr.x + i},${pr.y + j}`);
  const tileOf = (px, py) => `${(px >> 4) - MG},${(py >> 4) - MG}`;
  // reeds along the banks, lily pads out in the pond
  for (let gy = 0; gy * 7 < S.GH - 8; gy++) for (let gx = 0; gx * 9 < GW - 10; gx++) {
    const px = gx * 9 + Math.floor(hash(gx, gy, 201) * 9), py = gy * 7 + Math.floor(hash(gx, gy, 202) * 7), i = py * GW + px, w = WF[i];
    if (keep.has(tileOf(px, py))) continue;
    if (w > 0.45 && w < 0.53 && hash(gx, gy, 203) < 0.4 && C[(py >> 4) * TW + (px >> 4)] !== G_WALL) reedCluster(P, px, py, gx * 31 + gy);
    else if (WB[i] > 0.82 && w > 0.9 && hash(gx, gy, 204) < 0.32 && P.d[i] === 0) lilyPad(P, px, py, gx * 17 + gy);
  }
  // bluebells under the oaks, flower drifts, allotments, graves
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = base[y][x];
    if (c === 'T' && hash(x, y, 55) < 0.6) for (let k = 0; k < 22; k++) { const tx = x + Math.floor((hash(x * 7 + k, y, 56) - 0.5) * 3.4), ty = y + Math.floor((hash(x, y * 7 + k, 57) - 0.2) * 3.2); if (base[ty]?.[tx] !== '.') continue; bluebells(P, O + tx * 16 + Math.floor(hash(k, x, 58) * 16), O + ty * 16 + 4 + Math.floor(hash(k, y, 59) * 11), x * 13 + y * 7 + k); }
    if (c === 'k') { const v = Math.floor(hash(x, y, 61) * 4), X = O + x * 16, Y = O + y * 16;
      for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) P.set(X + i, Y + j, pick(PAL.mud, 0.18 + hash(X + i, Y + j, 1) * 0.2 + (j % 5 === 1 ? 0.14 : 0), X + i, Y + j));
      for (let r = 0; r < 3; r++) { const ry = Y + 3 + r * 5;
        for (let k = 0; k < 3; k++) { const cx = X + 2 + k * 5 + (r & 1) * 2;
          if (v === 0) { blob(P, cx, ry + 1, 2.8, PAL.leaf, { seed: k + r * 3 + x, amb: 0.2, rimDark: 0.2 }); P.set(cx - 1, ry, pick(PAL.leaf, 0.95, 0, 0)); }
          else if (v === 1) { for (let j = 0; j < 5; j++) { P.set(cx, ry - j + 1, pick(PAL.leaf, 0.45 + j * 0.1, cx, ry - j)); if (j > 1) P.set(cx + (j & 1 ? 1 : -1), ry - j + 1, pick(PAL.leaf, 0.7, cx, ry)); } }
          else if (v === 2) { for (let j = 0; j < 7; j++) P.set(cx, ry - j + 2, pick(PAL.wood, 0.55, cx, ry - j)); for (let j = 0; j < 4; j++) { P.set(cx - 1, ry - j * 1.5 + 1, pick(PAL.leaf, 0.7, cx, ry)); P.set(cx + 1, ry - j * 1.5, pick(PAL.leaf, 0.5, cx, ry)); } P.set(cx + 1, ry - 4, pk('#e83040')); }
          else { blob(P, cx, ry + 1, 2.6, PAL.leafD, { seed: k + r * 5, amb: 0.25 }); P.set(cx, ry - 1, pk('#e8d8f0')); } } } }
    if (c === 'G') { const v = Math.floor(hash(x, y, 71) * 4); P.blit(gravePix(v), O + x * 16, O + y * 16 - 2); if (hash(x, y, 72) < 0.5) { const fx = O + x * 16 + 3 + Math.floor(hash(x, y, 73) * 10); P.set(fx, O + y * 16 + 14, pk(hash(x, y, 74) < 0.5 ? '#f8f0f0' : '#c4c4d4')); } }
  }
  for (const pr of props) { const X = O + pr.x * 16, Y = O + pr.y * 16, w = pr.w || 1, h = pr.h || 1;
    if (pr.k === 'patch') for (let k = 0; k < w * h * 16; k++) { const px = X + Math.floor(hash(k, pr.x, 81) * w * 16), py = Y + Math.floor(hash(k, pr.y, 82) * h * 16); if (base[(py - O) >> 4]?.[(px - O) >> 4] !== '.') continue; const cs = SPOTS[pr.c || 'daisy']; if (pr.c === 'bluebell') bluebells(P, px, py, k + pr.x); else { const c = pk(cs[k % cs.length]); P.set(px, py, c); P.set(px + 1, py, dk(c, 0.85)); P.set(px, py + 1, pk('#2e7a30')); } }
    else if (pr.k === 'ring') { const r = pr.r || 20; for (let y = Y - r; y <= Y + r; y++) for (let x = X - r * 1.3; x <= X + r * 1.3; x++) { const d = Math.hypot((x - X) / 1.3, (y - Y) * 1.1) + (vnoise(x, y, 4, 91) - 0.5) * 4; if (d > r) continue; const c = P.get(x, y); if (cA(c) === 255 && d > r - 2) P.set(x, y, dk(c, 0.82)); else if (cA(c) === 255) P.set(x, y, mix(c, pick(PAL.vdirt, 0.55 + (fbm(x, y, 5) - 0.5) * 0.4, x, y), 0.8)); } }
    else if (pr.k === 'ford') { for (let y = Y; y < Y + h * 16; y++) for (let x = X; x < X + w * 16; x++) { const lx = x - X, ly = y - Y; let c = VMAT.flag(x - O, y - O); const edge = lx < 2 || lx >= w * 16 - 2;
        if (edge) c = pick(PAL.flag, lx < 2 || lx >= w * 16 - 2 ? 0.32 + hash(x, y, 3) * 0.2 : 0.5, x, y);
        P.set(x, y, hash(x, y, 91) < 0.42 ? mix(c, pk('#6ab4bc'), 0.35) : c); }
      for (let k = 0; k < h * 9; k++) { const y = Y + 2 + Math.floor(hash(k, 1, 92) * (h * 16 - 4)); P.set(X + 2 + Math.floor(hash(k, 2, 92) * 3), y, pk('#e8faf8b0')); P.set(X + w * 16 - 3 - Math.floor(hash(k, 3, 92) * 3), y, pk('#e8faf870')); } }
    else if (pr.k === 'stones') for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const cx = X + i * 16 + 8 + (hash(i, j, 93) - 0.5) * 3, cy = Y + j * 16 + 8 + (((i + j) & 1) ? 2 : -2); stoneBlob(P, cx, cy, 6 + hash(i, j, 94) * 1.5, 3.8, PAL.dry, i * 5 + j, 1);
      for (let k = 0; k < 9; k++) { const a = hash(k, i + j * 7, 95) * 6.28; P.set(Math.round(cx + Math.cos(a) * 8), Math.round(cy + 3 + Math.sin(a) * 4.6), pk('#e8faf890')); } }
    else if (pr.k === 'jetty') { const vert = h >= w; for (let y = Y; y < Y + h * 16; y++) for (let x = X; x < X + w * 16; x++) { const lx = x - X, ly = y - Y, u = vert ? ly : lx, v = vert ? lx : ly, inset = vert ? (lx < 2 || lx > w * 16 - 3) : (ly < 2 || ly > h * 16 - 3); if (inset) continue;
        const pl = Math.floor(u / 4), pu = u % 4; let s = 0.52 + (hash(pl, Math.floor(v / 9), 9) - 0.5) * 0.3; if (pu === 0) s = 0.12; else if (pu === 1) s += 0.12; P.set(x, y, pick(PAL.wood, cl(s), x, y)); if (vert ? lx < 3 : ly < 3) P.set(x, y, pick(PAL.wood, 0.22, x, y)); if (vert ? lx > w * 16 - 4 : ly > h * 16 - 4) P.set(x, y, pick(PAL.wood, 0.16, x, y)); }
      for (const [px, py] of vert ? [[X, Y + 3], [X + w * 16 - 3, Y + 3], [X, Y + h * 16 - 4], [X + w * 16 - 3, Y + h * 16 - 4]] : [[X + 3, Y], [X + 3, Y + h * 16 - 3], [X + w * 16 - 4, Y], [X + w * 16 - 4, Y + h * 16 - 3]]) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) P.set(px + a, py + b, pick(PAL.wood, 0.7 - a * 0.2 - (b === 2 ? 0.2 : 0), px + a, py + b)); }
    else if (pr.k === 'steps') { const n = h * 4; for (let r = 0; r < n; r++) for (let x = X; x < X + w * 16; x++) { const y0 = Y + r * 4, edge = x < X + 2 || x >= X + w * 16 - 2;
        for (let j = 0; j < 4; j++) { const t = j < 2; let s = t ? 0.78 - r * 0.012 + (hash(x >> 2, r, 7) - 0.5) * 0.14 : 0.34 + (hash(x >> 2, r, 8) - 0.5) * 0.08; if (j === 0) s += 0.1; if (edge) s -= 0.2; if (((x - X) % 8 === 0) && t) s -= 0.2; P.set(x, y0 + j, pick(PAL.dry, cl(s), x, y0 + j)); } } }
    else if (pr.k === 'weir') { for (let x = X; x < X + w * 16; x++) { for (let j = 0; j < 6; j++) P.set(x, Y + 6 + j, pick(PAL.dry, cl(0.78 - j * 0.1 + (hash(x >> 2, 1, 4) - 0.5) * 0.2 - (x % 7 === 0 ? 0.25 : 0)), x, Y + 6 + j)); for (let j = 0; j < 4; j++) if (hash(x, j, 96) < 0.6) P.set(x, Y + 12 + j, pk(j < 2 ? '#f0fcfa' : '#c8ecec90')); } }
    else if (pr.k === 'gemgrave') gemGrave(P, X, Y);
    else if (PROPS[pr.k] && !VPROP[pr.k]) P.blit(propPix(pr.k), X, Y);
  }
}
// static prop shadows are added in the shadow pass; this keeps them next to the art that needs them

// <<VB
// ---------------------------------------------------------------- village building kit: cob, masonry, thatch, gables, windows, chimneys
const wob = (x, s, a = 1) => Math.sin(x * 0.08 + s) * a + Math.sin(x * 0.21 + s * 2.3) * a * 0.45; // gentle hand-built wobble
function cob(p, x0, x1, y0, y1, seed) { // whitewashed cob: lumpy plaster, damp near the ground
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    let v = 0.78 + (fbm(x * 1.5, y * 1.5, seed) - 0.5) * 0.3; if (hash(x, y, seed + 3) < 0.025) v -= 0.16; if (y > y1 - 4) v -= 0.12 - (y1 - y) * 0.02;
    p.set(x, y, pick(PAL.wash, cl(v, 0.25, 1), x, y));
  }
}
function masonryPx(x, y, y0, seed, R = PAL.honey, len = 9, rowH = 5) { // one pixel of stone laid in irregular courses
  const row = Math.floor((y - y0) / rowH), ry = (y - y0) % rowH, L = len - 2 + hash(row, 1, seed) * 5, off = hash(row, 2, seed) * 20, bi = Math.floor((x + off) / L), bu = (((x + off) % L) + L) % L, h = hash(bi, row, seed + 7);
  let v = 0.5 + (h - 0.5) * 0.32 + (fbm(x, y, seed) - 0.5) * 0.14; if (ry === rowH - 1 || bu < 1) v = 0.12; else if (ry === 0) v += 0.14; else if (bu < 2) v += 0.1;
  return pick(R, cl(v), x, y);
}
function masonry(p, x0, x1, y0, y1, seed, R = PAL.honey, len = 9, rowH = 5) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) p.set(x, y, masonryPx(x, y, y0, seed, R, len, rowH)); }
function thatchV(x, y, k, plane, seed) { // one pixel of straw: bundled courses that tuck under each other
  const course = Math.floor(k / 5), j = k % 5, cx = x + (course & 1) * 3, bundle = Math.floor(cx / 6), bu = ((cx % 6) + 6) % 6;
  let v = 0.52 + plane + (hash(bundle, course, seed) - 0.5) * 0.2 + (vnoise(x * 1.7, y * 0.4, 5, seed) - 0.5) * 0.3;
  if (j === 4) v -= 0.24; else if (j === 0) v += 0.08; if (bu === 0 && j > 0 && j < 4) v -= 0.08; if (hash(x, y, seed + 5) < 0.06) v += 0.14;
  return v;
}
function thatch(p, o) { // a hipped thatched roof, front-on: sagging ridge with a cross-hatched cap, hips, and a thick rounded eave
  const { x0, x1, yR, yE, hx = 12, sag = 2, seed = 1, R = PAL.thatchG, hem = 6, moss = 0.5, ridgeH = 4 } = o, wd = x1 - x0, xc = (x0 + x1) / 2;
  const ridge = (x) => yR + sag * (1 - ((x - xc) / (wd / 2)) ** 2), eave = (x) => yE + wob(x, seed, 0.9) + (hash(x >> 1, 3, seed) < 0.3 ? 1 : 0);
  for (let x = x0; x <= x1; x++) {
    const top = Math.round(ridge(x)), bot = Math.round(eave(x)), span = Math.max(1, bot - top);
    for (let y = top; y <= bot; y++) {
      const k = bot - y, t = k / span, bl = hx * t; let plane = 0;
      if (x - x0 < bl) plane = 0.22; else if (x1 - x < bl) plane = -0.3;
      const hipRoll = Math.abs(x - x0 - bl) < 1.2 || Math.abs(x1 - x - bl) < 1.2; let v;
      if (k < hem) v = 0.8 + plane * 0.6 + (hash(x, 0, seed + 2) - 0.5) * 0.3 - (k === 0 ? 0.3 : 0) - (k === hem - 1 ? 0.1 : 0) + ((x + k) % 3 === 0 ? -0.06 : 0); // the cut ends of the straw
      else if (y - top < ridgeH) v = 0.86 + plane * 0.4 + (((x + y) & 3) < 2 ? 0.06 : -0.08) - (y - top === ridgeH - 1 ? 0.3 : 0); // ridge roll, cross-hatched
      else if (hipRoll && t > 0.12) v = 0.78 + plane * 0.5 + ((x + y) & 1 ? 0.05 : -0.05);
      else v = thatchV(x, y, k - hem, plane, seed);
      let c = pick(R, cl(v, 0.04, 1), x, y);
      if (moss && k >= hem && y - top >= ridgeH && vnoise(x, y, 8, seed + 3) > 0.74 + (1 - moss) * 0.3 && k < 34) c = pick(PAL.moss, 0.3 + hash(x, y, 8) * 0.35, x, y);
      p.set(x, y, c);
    }
  }
  return { ridge, eave };
}
function eaveShadow(p, x0, x1, eave, depth = 4) { for (let x = x0; x <= x1; x++) for (let k = 1; k <= depth; k++) { const y = Math.round(eave(x)) + k, c = p.get(x, y); if (cA(c) === 255) p.set(x, y, dk(c, 0.6 + k * 0.08)); } }
function gable(p, o) { // a projecting cross-gable: thatched rolls round a plaster-and-oak face with its own little window
  const { cx, hw, ya, yb, seed = 1, R = PAL.thatchG, win = true, roll = 5, face = PAL.wash } = o;
  for (let y = ya; y <= yb; y++) {
    const half = hw * (y - ya) / Math.max(1, yb - ya);
    for (let x = Math.floor(cx - half - roll); x <= Math.ceil(cx + half + roll); x++) {
      const dx = x + 0.5 - cx, d = Math.abs(dx) - half; if (d > roll) continue;
      if (d > 0) { const v = 0.66 + (dx < 0 ? 0.14 : -0.16) + (hash(x, y, seed) - 0.5) * 0.18 + (((x + y) & 3) === 0 ? -0.1 : 0) - (d > roll - 1.3 ? 0.22 : 0) + (d < 1.2 ? 0.1 : 0); p.set(x, y, pick(R, cl(v, 0.05, 1), x, y)); }
      else { const fy = y - ya; p.set(x, y, Math.abs(dx) < 1.2 || (fy > (yb - ya) * 0.64 && fy < (yb - ya) * 0.64 + 2) || d > -1.6 ? pick(PAL.oakT, dx < 0 ? 0.58 : 0.3, x, y) : pick(face, cl(0.8 - (fy < 2 ? 0.3 : 0) + (fbm(x * 1.4, y * 1.4, seed) - 0.5) * 0.2), x, y)); }
    }
  }
  if (win && yb - ya > 20) lattice(p, Math.round(cx - 3), Math.round(ya + (yb - ya) * 0.42), 6, 8, {});
  p.set(Math.round(cx), ya - 3, pick(PAL.oakT, 0.7, 0, 0)); p.set(Math.round(cx), ya - 2, pick(PAL.oakT, 0.5, 0, 0)); p.set(Math.round(cx) - 1, ya - 3, pick(PAL.oakT, 0.35, 0, 0)); p.set(Math.round(cx) + 1, ya - 3, pick(PAL.oakT, 0.35, 0, 0)); // crossed barge-board ends
}
function eyebrow(p, o) { // an eyebrow dormer: a little window under a rounded hood of thatch
  const { cx, y, w = 9, seed = 1, R = PAL.thatchG } = o, rx = w / 2 + 3.5, ry = 6.5, wh = Math.round(w * 0.6);
  for (let yy = Math.floor(y - ry); yy <= y + wh + 1; yy++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x + 0.5 - cx) / rx, up = yy < y ? (y - yy - 0.5) / ry : 0, d = dx * dx + up * up; if (yy < y && d > 1) continue; if (yy >= y && Math.abs(x + 0.5 - cx) > w / 2) continue;
    if (yy < y - 2 || (yy < y && Math.abs(x + 0.5 - cx) > w / 2)) p.set(x, yy, pick(R, cl(0.7 + (x < cx ? 0.1 : -0.12) - (d > 0.78 ? 0.2 : 0) + (hash(x, yy, seed) - 0.5) * 0.16), x, yy));
  }
  lattice(p, Math.round(cx - w / 2), y - 1, w, wh, { sill: false });
  for (let x = Math.round(cx - w / 2); x < cx + w / 2; x++) { p.set(x, y - 2, pick(PAL.oakT, 0.12, x, 0)); p.set(x, y - 3, dk(p.get(x, y - 3) || pk('#000000'), 0.7)); }
}
function chimney(p, x, yTop, yBot, o = {}) { // a stone stack with a lean, soot and clay pots; returns where the smoke starts
  const { w = 8, lean = 0, R = PAL.honey, pots = 2 } = o, sh = (y) => Math.round((yBot - y) * lean / 10);
  for (let y = yTop; y <= yBot; y++) for (let i = 0; i < w; i++) { const xx = x + i + sh(y); let v = 0.5 + (i === 0 ? 0.26 : i === w - 1 ? -0.3 : 0) + (hash(i, y >> 1, 9) - 0.5) * 0.14; if ((y - yTop) % 4 === 3) v -= 0.18; if (y < yTop + 2) v += 0.14; if (y < yTop + 4) v -= 0.12; p.set(xx, y, pick(R, cl(v), xx, y)); }
  for (let i = 0; i < w; i++) p.set(x + i + sh(yTop), yTop, pick(PAL.dry, 0.8 - (i === w - 1 ? 0.3 : 0), 0, 0));
  for (let k = 0; k < pots; k++) { const px = x + 1 + k * 3 + sh(yTop); for (let y = yTop - 4; y < yTop; y++) for (let i = 0; i < 3; i++) if (px + i < x + w + sh(yTop) - 1) p.set(px + i, y, pick(PAL.terra, 0.75 - i * 0.22 - (y === yTop - 4 ? 0.2 : 0), px, y)); }
  return [x + Math.floor(w / 2) + sh(yTop), yTop - 5];
}
function lattice(p, x0, y0, w, h, o = {}) { // leaded diamond panes in an oak frame, warm light behind; optional shutters, sill and a box of red geraniums
  const { shut = null, box = false, sill = true, frame = PAL.oakT, seed = 0 } = o;
  for (let y = y0 - 1; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) p.set(x, y, pick(frame, 0.34, x, y));
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const u = (x + 0.5 - x0) / w - 0.5, v = (y + 0.5 - y0) / h - 0.5, g = 0.84 - Math.hypot(u * 1.1, v) * 0.85 + (u + v < -0.3 ? 0.1 : 0) + (hash(x, y, seed) - 0.5) * 0.06; let c = pick(PAL.glow, cl(g), x, y);
    const a = x - x0, b = y - y0; if ((a + b) % 4 === 0 || (((a - b) % 4) + 4) % 4 === 0) c = dk(c, 0.5); p.set(x, y, c);
  }
  if (sill) for (let x = x0 - 2; x <= x0 + w + 1; x++) { p.set(x, y0 + h, pick(PAL.honey, 0.92, x, 0)); p.set(x, y0 + h + 1, pick(PAL.honey, 0.4, x, 0)); }
  if (shut) for (const sx of [x0 - 4, x0 + w + 1]) for (let y = y0 - 1; y < y0 + h; y++) for (let x = sx; x < sx + 3; x++) p.set(x, y, pick(shut, cl((x === sx ? 0.85 : x === sx + 2 ? 0.25 : 0.55) - (y === y0 + (h >> 1) ? 0.3 : 0)), x, y));
  if (box) { const by = y0 + h + 2; for (let y = by; y < by + 3; y++) for (let x = x0 - 2; x <= x0 + w + 1; x++) p.set(x, y, pick(PAL.wood, y === by ? 0.7 : 0.35, x, y));
    for (let x = x0 - 2; x <= x0 + w + 1; x++) { const k = hash(x, by, 3); p.set(x, by - 1, k < 0.55 ? pk('#e03038') : pick(PAL.leaf, 0.5, x, by)); if (k < 0.5) p.set(x, by - 2, pk(k < 0.25 ? '#f04048' : '#e03038')); if (k > 0.7) p.set(x, by, pick(PAL.leaf, 0.4, x, by)); } }
}
function oakPost(p, x, y0, y1, w = 2) { for (let y = y0; y <= y1; y++) for (let i = 0; i < w; i++) p.set(x + i, y, pick(PAL.oakT, i === 0 ? 0.62 : 0.28, x, y)); }
function oakRail(p, x0, x1, y, h = 2) { for (let x = x0; x <= x1; x++) for (let j = 0; j < h; j++) p.set(x, y + j, pick(PAL.oakT, j === 0 ? 0.66 : 0.3, x, y)); }
function climber(p, x0, y0, w, h, seed, bloom = true) { // roses and ivy scrambling up a wall
  for (let k = 0; k < w * h / 9; k++) { const x = x0 + hash(k, seed, 1) * w, y = y0 + hash(k, seed, 2) * h * (0.55 + 0.45 * hash(k, seed, 3)); blob(p, x, y + h * 0.35, 2.6, PAL.ivy, { seed: k + seed, amb: 0.2, rimDark: 0.2 }); }
  if (bloom) for (let k = 0; k < w * h / 22; k++) { const x = Math.floor(x0 + hash(k, seed, 4) * w), y = Math.floor(y0 + h * 0.3 + hash(k, seed, 5) * h * 0.7); if (p.on(x, y)) { p.set(x, y, pk(k % 3 ? '#e8384c' : '#f8f0e8')); p.set(x + 1, y, pk('#a01c30')); } }
}
const FANCY = (sx) => sx; // (placeholder so the kit reads top-to-bottom)

// ---------------------------------------------------------------- the Gilded Goose: long, low, crooked, thickly thatched, with a porch and gables
function gooseInn(b) {
  return once(`vb${b.x},${b.y}`, () => {
    const M = 8, W = b.w * 16 + 2 * M, H = 124, p = new Pix(W, H), yB = H - 1, seed = 7, wallTop = yB - 32, plinth = yB - 6, smoke = [];
    cob(p, M, W - M - 1, wallTop, plinth - 1, seed); masonry(p, M, W - M - 1, plinth, yB, seed + 1, PAL.honey, 9, 3);
    oakRail(p, M, W - M - 1, wallTop + 1, 2); oakRail(p, M, W - M - 1, plinth - 3, 2);
    for (const x of [M, M + 27, M + 56, M + 94, M + 120, W - M - 2]) oakPost(p, x, wallTop + 1, plinth - 1);
    for (const [x0, sh] of [[M + 11, PAL.green], [M + 33, PAL.green], [M + 114, PAL.green], [M + 129, PAL.green]]) lattice(p, x0, yB - 25, 9, 12, { box: true, seed: x0 });
    climber(p, M - 2, yB - 36, 16, 30, 3);
    doorAt(p, 74, yB - 2, 12, 22, { frame: PAL.honey, wood: PAL.oakT, step: true });
    // roof: thick thatch with a sagging ridge, two cross-gables, an eyebrow over the porch
    const R = thatch(p, { x0: 2, x1: W - 3, yR: 31, yE: wallTop + 3, hx: 17, sag: 3, hem: 7, seed });
    gable(p, { cx: M + 30, hw: 14, ya: 57, yb: wallTop + 2, seed: seed + 2 }); gable(p, { cx: M + 110, hw: 14, ya: 54, yb: wallTop + 2, seed: seed + 5 });
    eyebrow(p, { cx: 80, y: 70, w: 9, seed: seed + 3 });
    eaveShadow(p, 4, W - 5, R.eave, 4);
    // the porch: a little thatched hood on two oak posts, with a lantern
    const P2 = thatch(p, { x0: 63, x1: 97, yR: yB - 40, yE: yB - 29, hx: 6, sag: 0, hem: 5, seed: seed + 9, ridgeH: 3, moss: 0 });
    for (let x = 63; x <= 97; x++) for (let k = 1; k <= 3; k++) { const y = Math.round(P2.eave(x)) + k, c = p.get(x, y); if (cA(c) === 255) p.set(x, y, dk(c, 0.55 + k * 0.1)); }
    oakPost(p, 66, yB - 28, yB - 3, 2); oakPost(p, 94, yB - 28, yB - 3, 2);
    for (let y = yB - 26; y < yB - 21; y++) { p.set(67, y, y === yB - 26 || y === yB - 22 ? pick(PAL.iron, 0.3, 0, 0) : pick(PAL.glow, 0.9, 0, 0)); p.set(68, y, y === yB - 26 || y === yB - 22 ? pick(PAL.iron, 0.3, 0, 0) : pick(PAL.glow, 0.6, 0, 0)); }
    // chimneys (one leaning) and a goose weathervane
    smoke.push(chimney(p, 12, 28, 62, { lean: 1.5 })); smoke.push(chimney(p, W - 24, 24, 66, { lean: -1 }));
    const cx = 80, rY = Math.round(R.ridge(80)); for (let y = rY - 17; y < rY; y++) p.set(cx, y, pick(PAL.iron, 0.55, 0, 0)); for (let x = cx - 4; x <= cx + 4; x++) p.set(x, rY - 12, pick(PAL.iron, 0.55, 0, 0));
    ['..........yy', '.........yyyy', '.....yy..yy..', '..yyyyyyyyy..', '.yyyyyyyyyy...', 'yyyyyyyyyy....', '.yyyyyyyy.....'].forEach((r, j) => [...r].forEach((c, i) => { if (c === 'y') p.set(cx - 7 + i, rY - 24 + j, pick(PAL.gold, cl(0.95 - j * 0.13 - (i > 8 ? 0.2 : 0)), 0, 0)); }));
    p.set(cx + 4, rY - 23, pk('#201008')); p.set(cx + 6, rY - 22, pk('#f08020')); p.set(cx + 5, rY - 22, pk('#f08020'));
    rim(p, 0.42, 'tl'); const c = canv(p); c.dx = -M / 16; c.smoke = smoke; return c;
  });
}
function gooseSign(f) { // the golden goose signboard on its wrought-iron bracket: far too big for the pub, and swinging gently
  return once('gsign' + f, () => { const p = new Pix(34, 34), sw = f === 1 ? 1 : 0;
    for (let x = 0; x < 30; x++) { p.set(x, 1, pick(PAL.iron, 0.5, x, 1)); p.set(x, 2, pick(PAL.iron, 0.25, x, 2)); } for (let k = 0; k < 6; k++) { p.set(2 + k, 3 + k, pick(PAL.iron, 0.5, 0, 0)); }
    for (const cx of [8, 24]) for (let y = 3; y < 7; y++) p.set(cx + sw, y, (y & 1) ? pick(PAL.iron, 0.7, 0, 0) : pick(PAL.iron, 0.3, 0, 0));
    const bx = 3 + sw, by = 7, bw = 28, bh = 22;
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { const e = x < 2 || y < 2 || x >= bw - 2 || y >= bh - 2; p.set(bx + x, by + y, e ? pick(PAL.gold, x < 2 || y < 2 ? 0.95 : 0.55, x, y) : pick(PAL.red, cl(0.3 + (x + y) * 0.004 + (hash(x, y, 2) - 0.5) * 0.06), x, y)); }
    for (let x = 2; x < bw - 2; x++) { p.set(bx + x, by + 2, pick(PAL.gold, 0.4, x, 0)); p.set(bx + x, by + bh - 3, pick(PAL.gold, 0.4, x, 0)); }
    // the goose: gold body, long curved neck, orange beak, a golden egg at its feet
    const G = (x, y, c) => p.set(bx + x, by + y, c), body = (cx, cy, rx, ry, R, k) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy > 1) continue; G(x, y, pick(R, cl(0.78 - dx * 0.2 - dy * 0.42 + (k ? 0 : 0)), x, y)); } };
    body(12.5, 13.5, 8.5, 4.6, PAL.gold, 0); for (let x = 3; x < 8; x++) G(x, 9 + Math.floor((8 - x) * 0.4), pick(PAL.gold, 0.9, x, 0)); // tail
    for (let j = 0; j < 9; j++) for (let i = 0; i < 3; i++) G(17 + Math.round(Math.sin(j * 0.45) * 1.2) + i - (j > 6 ? 1 : 0), 5 + j, pick(PAL.gold, 0.9 - i * 0.28, 0, 0)); // neck
    body(21, 5.5, 2.6, 2.2, PAL.gold, 0); G(23, 5, pk('#201008')); for (let i = 0; i < 4; i++) G(23 + i, 6 + (i > 1 ? 1 : 0), pk(i > 1 ? '#d86010' : '#f08a20'));
    for (let i = 0; i < 7; i++) G(9 + i, 12 + (i > 3 ? 1 : 0), pick(PAL.gold, 0.45, 0, 0)); G(10, 11, pick(PAL.gold, 0.95, 0, 0)); // wing
    for (const lx of [11, 15]) { for (let y = 18; y < 21; y++) G(lx, y, pk('#e07818')); G(lx - 1, 20, pk('#e07818')); G(lx + 1, 20, pk('#e07818')); }
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) { const dx = x - 1, dy = y - 1.3; if (dx * dx + dy * dy < 2.2) G(20 + x, 18 + y, pick(PAL.gold, 0.95 - dx * 0.2 - y * 0.2, 0, 0)); }
    for (const [x, y] of [[4, 4], [25, 12], [23, 17], [6, 17], [14, 5]]) { G(x, y, pk('#ffffff')); G(x - 1, y, pk('#fff4a0')); G(x + 1, y, pk('#fff4a0')); G(x, y - 1, pk('#fff4a0')); G(x, y + 1, pk('#fff4a0')); }
    outline(p, 0.4); return canv(p); });
}


const VPROP = {}, PSHADOW = {}; // per-kind sprite makers and shadow painters for the village's props

// ---------------------------------------------------------------- Bell Hill: the Bell Tower (the village landmark, 8 tiles tall) and its pennant
PAL.shingle = ramp('#241a14 #382a20 #4e3c2e #664e3c #80664e #9a8062 #b49a7a');
function braceLine(p, x0, y0, x1, y1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); p.set(x, y, pick(PAL.oakT, 0.62, x, y)); p.set(x + 1, y, pick(PAL.oakT, 0.3, x, y)); } }
function bellTowerPix() {
  return once('btower', () => {
    const W = 80, H = 128, p = new Pix(W, H), cx = 40, seed = 21;
    // ---- the stone base (y 96..127): a squat battered plinth with corner buttresses, an arched door and arrow slits
    for (let y = 96; y <= 127; y++) { const hw = 25 + (y - 96) * 0.12, xl = Math.round(cx - hw), xr = Math.round(cx + hw) - 1;
      for (let x = xl; x <= xr; x++) { let c = masonryPx(x, y, 96, seed, PAL.dry, 10, 5); const edge = Math.min(x - xl, xr - x);
        if (edge < 6) { c = pick(PAL.dry, cl(0.5 + (hash(Math.floor((x + y * 3) / 5), y >> 2, seed) - 0.5) * 0.3 + (x - xl < 6 ? 0.12 : -0.1) - (edge === 5 ? 0.3 : 0)), x, y); }
        else if (x > cx + 9) c = dk(c, 0.88);
        if (vnoise(x, y * 1.4, 8, seed + 4) > 0.7 && y > 106) c = pick(PAL.moss, 0.3 + hash(x, y, 8) * 0.4, x, y);
        if (y >= 126) c = dk(c, 0.7); p.set(x, y, c); } }
    for (let x = 14; x <= 65; x++) { p.set(x, 96, pick(PAL.dry, 0.9, x, 0)); p.set(x, 97, pick(PAL.dry, 0.32, x, 0)); }
    doorAt(p, 35, 123, 10, 17, { frame: PAL.dry, wood: PAL.oakT, step: true });
    for (const sx of [22, 56]) for (let y = 105; y < 115; y++) { p.set(sx, y, pk('#120a06')); p.set(sx + 1, y, pk('#120a06')); p.set(sx - 1, y, pick(PAL.dry, 0.8, 0, 0)); p.set(sx + 2, y, pick(PAL.dry, 0.25, 0, 0)); }
    climber(p, 15, 100, 9, 26, 5, false);
    // ---- the oak shaft (y 60..95): one tall braced panel of weathered cob; it overhangs the base
    cob(p, 23, 56, 63, 91, seed + 3); for (let y = 63; y <= 91; y++) for (let x = 23; x <= 56; x++) if (vnoise(x * 2, y * 0.25, 6, seed + 9) > 0.64) p.set(x, y, dk(p.get(x, y), 0.8));
    oakPost(p, 20, 60, 95, 3); oakPost(p, 57, 60, 95, 3); braceLine(p, 23, 63, 55, 91); braceLine(p, 55, 63, 23, 91);
    oakRail(p, 18, 61, 60, 3); oakRail(p, 18, 61, 92, 3); for (let x = 18; x <= 61; x++) { const c = p.get(x, 95); if (cA(c) === 255 && x > 18 && x < 61) p.set(x, 95, dk(c, 0.7)); }
    for (let x = 16; x <= 63; x++) { const c = p.get(x, 98); if (cA(c) === 255) p.set(x, 98, dk(c, 0.7)); }
    // ---- the belfry stage (y 30..59): open on every side, louvred side bays, and the great bronze bell
    for (let y = 34; y <= 56; y++) for (let x = 23; x <= 56; x++) { const slat = (x < 30 || x > 49) && y % 3 === 0; p.set(x, y, slat ? pick(PAL.oakT, 0.42, x, y) : pick(PAL.oakT, 0.04 + hash(x, y, 3) * 0.05 + (y > 50 ? 0.03 : 0), x, y)); }
    for (let x = 23; x <= 56; x++) for (let y = 34; y < 38; y++) p.set(x, y, dk(p.get(x, y), 0.6 + (y - 34) * 0.1));
    oakRail(p, 30, 49, 35, 3); for (const x of [33, 46]) for (let y = 35; y < 38; y++) p.set(x, y, pick(PAL.iron, 0.55, 0, 0));
    const top = 38, hwAt = (y) => 3.4 + 5.8 * ((y - top) / 17) ** 2;
    for (let y = top; y <= 55; y++) { const hw = hwAt(y), t = (y - top) / 17; for (let x = Math.floor(cx - hw); x <= cx + hw - 0.5; x++) { const u = (x + 0.5 - cx) / hw;
      let v = 0.3 + 0.5 * cl(0.62 - u * 0.95 - 0.15 * u * u) + (Math.abs(t - 0.48) < 0.06 || Math.abs(t - 0.8) < 0.06 ? -0.2 : 0) + (y === 55 ? 0.14 : 0) + (hash(x, y, 4) - 0.5) * 0.06; if (Math.abs(u) > 0.88) v -= 0.16;
      p.set(x, y, pick(PAL.bronze, cl(v, 0.05, 0.9), x, y)); } }
    for (const [x, y] of [[36, 42], [37, 41], [35, 46], [34, 50]]) p.set(x, y, pk('#ffe8a0')); for (const y of [36, 37]) { p.set(39, y, pick(PAL.iron, 0.5, 0, 0)); p.set(40, y, pick(PAL.iron, 0.3, 0, 0)); }
    for (const x of [20, 57]) oakPost(p, x, 30, 59, 3); for (const x of [28, 50]) oakPost(p, x, 30, 59, 2);
    for (const x of [23, 29, 51]) for (let k = 0; k < 4; k++) { p.set(x + k, 38 - k, pick(PAL.oakT, 0.5, 0, 0)); p.set(x + k, 39 - k, pick(PAL.oakT, 0.26, 0, 0)); } // knee braces
    oakRail(p, 17, 62, 30, 4); for (let y = 56; y <= 59; y++) for (let x = 20; x <= 59; x++) p.set(x, y, pick(PAL.oakT, ((x - 20) % 7 === 0 ? 0.18 : 0.46) - (y === 59 ? 0.16 : 0) + hash(x, y, 6) * 0.06, x, y));
    // ---- the spire (y 5..29): weathered cedar shingles, mossy, flared eave, bronze finial
    for (let y = 5; y <= 29; y++) { const hw = 26 * (y - 5) / 24 + 0.6; for (let x = Math.floor(cx - hw); x <= cx + hw - 0.5; x++) { const k = 29 - y, course = Math.floor(k / 3), j = k % 3, xs = x + (course & 1) * 2, bu = ((xs % 5) + 5) % 5;
      let v = 0.5 + (hash(Math.floor(xs / 5), course, seed) - 0.5) * 0.24 + (x < cx ? 0.12 : -0.14) - (j === 0 ? 0.22 : j === 2 ? -0.06 : 0) - (bu === 0 ? 0.1 : 0);
      let c = pick(PAL.shingle, cl(v), x, y); if (vnoise(x, y, 7, seed + 2) > 0.7 && k < 18) c = pick(PAL.moss, 0.3 + hash(x, y, 7) * 0.3, x, y);
      if (x <= Math.floor(cx - hw) || x >= Math.floor(cx + hw - 0.5)) c = dk(c, 0.55); p.set(x, y, c); } }
    for (let y = 7; y <= 28; y++) { p.set(cx - 1, y, pick(PAL.shingle, 0.9, 0, 0)); p.set(cx, y, pick(PAL.shingle, 0.28, 0, 0)); }
    for (let x = 12; x <= 67; x++) { p.set(x, 28, pick(PAL.oakT, 0.7, x, 0)); p.set(x, 29, pick(PAL.oakT, 0.28, x, 0)); }
    for (let y = 0; y < 6; y++) { p.set(cx - 1, y, pick(PAL.bronze, 0.8, 0, 0)); p.set(cx, y, pick(PAL.bronze, 0.45, 0, 0)); } for (const [x, y] of [[cx - 2, 3], [cx + 1, 3], [cx - 2, 4], [cx + 1, 4]]) p.set(x, y, pick(PAL.bronze, 0.6, 0, 0));
    outline(p, 0.35); const c = canv(p); c.dx = -1; return c;
  });
}
function bellPennant(f) { // a red and gold swallowtail streaming from the finial
  return once('bpen' + f, () => { const p = new Pix(24, 12);
    for (let x = 0; x < 22; x++) { const w = Math.round(Math.sin(x * 0.45 + f * 2.1) * 1.3), len = x > 15 ? 6 - (x - 15) * 0.9 : 6; for (let j = 0; j < len; j++) { const y = 2 + j + w; p.set(x, y, j < 3 ? pick(PAL.red, cl(0.8 - j * 0.1 - x * 0.012), x, y) : pick(PAL.gold, cl(0.8 - (j - 3) * 0.1), x, y)); } }
    outline(p, 0.4); return canv(p); });
}
VPROP.tower = (pr, m, t, out) => {
  const img = bellTowerPix(), top = pr.y + 2 - 8; out.push({ img, x: pr.x - 1, y: top, z: 1, sy: pr.y + 2 });
  out.push({ img: bellPennant(Math.floor(t * 3) % 3), x: pr.x - 1 + 41 / 16, y: top + 0.02, z: 1, sy: pr.y + 2.01 });
};
PSHADOW.tower = (S, pr) => { const X = pr.x * 16, Y = pr.y * 16; for (let k = 0; k < 26; k++) shRect(S, X + 52 + k, Y - 20 + k * 1.2, 1, 46 + k * 0.2); shRect(S, X + 40, Y + 32, 36, 3); };

// ---------------------------------------------------------------- Bell Green set pieces
const F5 = { A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'], G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'], J: ['..#', '..#', '..#', '#.#', '.#.'], K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'], M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'], Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'], U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'], W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'], Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], '!': ['#', '#', '#', '.', '#'], ' ': ['.', '.', '.', '.', '.'] };
function txt(p, s, x, y, c) { for (const ch of s) { const g = F5[ch] || F5[' ']; g.forEach((r, j) => [...r].forEach((v, i) => { if (v === '#') p.set(x + i, y + j, c); })); x += g[0].length + 1; } return x; }
const txtW = (s) => [...s].reduce((a, ch) => a + (F5[ch] || F5[' '])[0].length + 1, -1);
const putSprite = (out, img, x, yBottom, sy = 0, z = 1) => out.push({ img, x: x + (img.dx || 0), y: yBottom - img.height / 16 + (img.dy || 0), z, sy: yBottom + sy });
const RIBBONS = ['#e03038', '#f0c030', '#3a78d8', '#48b048', '#f8f8f0', '#e870a8', '#f08828', '#9060d0'];
function maypolePix(f) {
  return once('maypole' + f, () => {
    const W = 48, H = 104, p = new Pix(W, H), cx = 24, top = 8;
    const ribbon = (i) => { const c = RIBBONS[i], side = i % 2 ? 1 : -1, spread = 7 + Math.floor(i / 2) * 4.4 + (i % 3) * 1.2, ph = i * 0.9 + f * 2.1;
      for (let s = 0; s <= 80; s++) { const t = s / 80, x = Math.round(cx + side * spread * Math.pow(t, 0.8) + Math.sin(t * 6 + ph) * 1.6 * t), y = Math.round(top + 5 + t * 80 + Math.sin(t * 6 + ph + 1.7) * 0.8 * t);
        p.set(x, y, mix(pk(c), pk('#ffffff'), 0.3)); p.set(x + 1, y, dk(pk(c), 0.8)); } };
    for (const i of [0, 3, 4, 7]) ribbon(i); // the ones swinging round the back
    for (let y = top; y < 100; y++) { for (let x = cx - 1; x <= cx + 1; x++) p.set(x, y, ((y + (x - cx) * 2) % 9 < 4) ? pick(PAL.red, x === cx - 1 ? 0.8 : x === cx ? 0.55 : 0.3, x, y) : pick(PAL.cloth, x === cx - 1 ? 0.95 : x === cx ? 0.75 : 0.5, x, y)); }
    for (const i of [1, 2, 5, 6]) ribbon(i); // and the ones in front
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, x = Math.round(cx + Math.cos(a) * 6), y = Math.round(top + 2 + Math.sin(a) * 2.2); p.set(x, y, k % 3 === 0 ? pk('#f8f0f0') : k % 3 === 1 ? pk('#f090b0') : pick(PAL.leaf, 0.6, 0, 0)); if (k % 2) p.set(x, y + 1, pick(PAL.leaf, 0.45, 0, 0)); } // a wreath of flowers
    for (let y = top - 5; y < top - 1; y++) for (let x = cx - 1; x <= cx; x++) p.set(x, y, pick(PAL.gold, 0.9 - (x - cx + 1) * 0.3, 0, 0)); p.set(cx - 1, top - 6, pk('#fff0a0'));
    for (let y = 94; y < 101; y++) for (let x = cx - 3; x <= cx + 3; x++) p.set(x, y, pick(PAL.wood, 0.7 - (x - cx + 3) * 0.08 - (y === 100 ? 0.3 : 0), x, y)); // the collar
    for (const [sx, sy] of [[cx - 9, 98], [cx + 6, 99], [cx - 5, 101], [cx + 9, 97]]) stoneBlob(p, sx, sy, 3.4, 1.8, PAL.dry, sx, 1);
    outline(p, 0.4); const c = canv(p); c.dx = -1; return c;
  });
}
function marketCrossPix() {
  return once('mcross', () => { const W = 32, H = 66, p = new Pix(W, H), cx = 16, R = PAL.dry;
    const rect = (x0, x1, y0, y1, lit = 0, top = 0.14) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { let v = 0.58 + lit - (x - x0) / (x1 - x0 + 1) * 0.3 + (hash(x, y, 31) - 0.5) * 0.1 + (y === y0 ? top : 0) - (y === y1 ? 0.2 : 0); if (vnoise(x, y * 1.5, 5, 9) > 0.7 && y > y0 + 1) { p.set(x, y, pick(PAL.moss, 0.4 + hash(x, y, 2) * 0.3, x, y)); continue; } p.set(x, y, pick(R, cl(v), x, y)); } };
    rect(3, 28, 57, 64, 0, 0.18); rect(7, 24, 51, 56, 0.02); rect(10, 21, 46, 50, 0.04); // three tiers of steps
    for (let y = 20; y < 46; y++) { const hw = 3 - (y - 20) * 0.015; for (let x = Math.floor(cx - hw); x <= cx + hw - 0.5; x++) p.set(x, y, pick(R, cl(0.7 - (x - (cx - hw)) / (2 * hw) * 0.5 + (hash(x, y, 4) - 0.5) * 0.08 + ((y % 7) === 0 ? -0.15 : 0)), x, y)); } // the tapering shaft
    rect(10, 21, 14, 19, 0.06); for (let y = 2; y < 14; y++) for (let x = cx - 1; x <= cx + 1; x++) p.set(x, y, pick(R, cl(0.78 - (x - cx + 1) * 0.2 + (y === 2 ? 0.1 : 0)), x, y)); // the cross head
    for (let y = 7; y < 12; y++) for (let x = cx - 7; x <= cx + 6; x++) p.set(x, y, pick(R, cl(0.76 - (x - cx + 7) * 0.03 + (y === 7 ? 0.1 : 0) - (y === 11 ? 0.18 : 0)), x, y));
    p.set(cx, 9, pick(PAL.moss, 0.6, 0, 0)); outline(p, 0.4); return canv(p); });
}
PSHADOW.cross = (S, pr) => { const X = pr.x * 16, Y = pr.y * 16; for (let k = 0; k < 18; k++) shRect(S, X + 22 + k, Y - 24 + k * 1.3, 1, 30 + k * 0.2); shRect(S, X + 2, Y + 14, 22, 3); };
function stocksPix() {
  return once('stocks', () => { const W = 40, H = 36, p = new Pix(W, H);
    for (const px of [4, 31]) for (let y = 4; y < 30; y++) for (let i = 0; i < 4; i++) p.set(px + i, y, pick(PAL.wood, i === 0 ? 0.62 : i === 3 ? 0.18 : 0.4, px, y));
    for (let y = 10; y < 15; y++) for (let x = 4; x < 35; x++) { const hole = [11, 20, 29].some((hx) => Math.hypot(x + 0.5 - hx, y + 0.5 - 14.5) < 3); p.set(x, y, hole ? pick(PAL.oakT, 0.04, x, y) : pick(PAL.wood, y === 10 ? 0.85 : 0.5 - (y - 10) * 0.05 + (hash(x >> 2, y, 3) - 0.5) * 0.1, x, y)); }
    for (let y = 15; y < 19; y++) for (let x = 4; x < 35; x++) p.set(x, y, pick(PAL.wood, 0.3 - (y - 15) * 0.04, x, y));
    for (let x = 3; x < 36; x++) { p.set(x, 3, pick(PAL.wood, 0.8, x, 3)); p.set(x, 4, pick(PAL.wood, 0.4, x, 4)); } // the top rail
    for (let y = 8; y < 14; y++) { p.set(14, y, pk('#c8bca0')); p.set(25, y, pk('#c8bca0')); } // string
    for (let y = 13; y < 30; y++) for (let x = 10; x < 30; x++) { const e = x === 10 || x === 29 || y === 13 || y === 29; p.set(x, y, e ? pick(PAL.wood, 0.3, x, y) : pick(PAL.cloth, cl(0.82 - (y - 13) * 0.01 + (hash(x, y, 3) - 0.5) * 0.06), x, y)); }
    txt(p, 'KICK', 12, 15, pk('#d02828')); txt(p, 'ME', 15, 22, pk('#d02828')); p.set(24, 24, pk('#d02828')); p.set(25, 24, pk('#d02828')); p.set(25, 25, pk('#d02828'));
    for (const [tx, ty] of [[2, 30], [6, 32], [32, 31], [35, 29]]) { blob(p, tx + 1.5, ty, 2.2, PAL.red, { seed: tx, amb: 0.2 }); p.set(tx + 3, ty + 1, pk('#a01c1c')); } // rotten tomatoes
    outline(p, 0.4); return canv(p); });
}
PSHADOW.stocks = (S, pr) => { const X = pr.x * 16, Y = pr.y * 16; shRect(S, X + 4, Y + 12, 38, 3); for (let k = 0; k < 9; k++) shRect(S, X + 36 + k, Y - 4 + k, 1, 18 - k); };
function cartPix(kind) {
  return once('cart' + kind, () => { const W = 56, H = 50, p = new Pix(W, H);
    const wheel = (cx, cy, r) => { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d > r) continue; const ang = Math.atan2(y + 0.5 - cy, x + 0.5 - cx), spoke = d < r - 2 && Math.abs(Math.sin(ang * 4)) < 0.2 + 0.4 / Math.max(2, d);
      p.set(x, y, d > r - 2 ? pick(PAL.iron, 0.55 - (x - cx) * 0.01, x, y) : d < 2 ? pick(PAL.gold, 0.5, x, y) : spoke ? pick(PAL.wood, 0.6 - (x - cx) * 0.02, x, y) : pk('#00000000')); } };
    for (let y = 22; y < 36; y++) for (let x = 6; x < 50; x++) { const pl = Math.floor((y - 22) / 4); p.set(x, y, pick(PAL.wood, 0.52 + (hash(x >> 3, pl, 5) - 0.5) * 0.14 - ((y - 22) % 4 === 3 ? 0.22 : 0) - (x > 44 ? 0.12 : 0) - (y > 33 ? 0.1 : 0), x, y)); }
    for (let x = 5; x < 51; x++) { p.set(x, 21, pick(PAL.wood, 0.9, x, 21)); p.set(x, 22, pick(PAL.wood, 0.5, x, 22)); }
    for (let k = 0; k < 4; k++) { p.set(6 + k * 14, 28, pick(PAL.iron, 0.5, 0, 0)); }
    wheel(14, 38, 10); wheel(42, 38, 10);
    for (let k = 0; k < 24; k++) { p.set(48 + k * 0.4, 33 + k * 0.4, pick(PAL.wood, 0.5, 0, 0)); } // the shaft resting on the ground
    if (kind === 'veg') { // heaps of cabbages, apples and carrots on the bed
      for (let i = 0; i < 6; i++) blob(p, 10 + i * 6.2, 17 + (i % 2) * 1.5, 4.6 - (i % 2) * 0.6, PAL.leaf, { seed: i + 3, amb: 0.2, rimDark: 0.2 });
      for (let i = 0; i < 7; i++) { const x = 11 + i * 5.2, y = 12 + (i % 3); blob(p, x, y, 2.7, PAL.red, { seed: i, amb: 0.22 }); p.set(Math.round(x - 1), Math.round(y - 1), pk('#ffb0a0')); }
      for (let i = 0; i < 5; i++) { for (let j = 0; j < 7; j++) p.set(34 + i * 2.4 + j * 0.3, 11 + j, pk(j > 5 ? '#c05a14' : '#e8801c')); p.set(34 + i * 2.4, 10, pk('#48a848')); p.set(35 + i * 2.4, 9, pk('#48a848')); }
      for (let x = 4; x < 12; x++) for (let y = 14; y < 22; y++) p.set(x, y, pick(PAL.cloth, 0.7 - (x - 4) * 0.04 - (y - 14) * 0.02, x, y)); // a sack
    } else { // fur pelts hung over the side and piled on the bed
      for (let i = 0; i < 6; i++) { const x0 = 8 + i * 7, fc = [PAL.cloth, PAL.dirt, PAL.stone][i % 3]; for (let y = 22; y < 36 + (i % 2) * 3; y++) for (let x = x0; x < x0 + 6; x++) if (!(y > 33 + (i % 2) * 3 && (x === x0 || x === x0 + 5)) && (x - x0 - 2.5) ** 2 < 9 + (y - 22) * 0.1) p.set(x, y, pick(fc, cl(0.62 - (x - x0) * 0.06 + (hash(x, y, 3) - 0.5) * 0.3), x, y)); }
      for (let i = 0; i < 4; i++) blob(p, 12 + i * 8, 16, 5.5, [PAL.stone, PAL.dirt, PAL.cloth, PAL.stone][i], { seed: i + 11, amb: 0.3, rimDark: 0.2, sq: 0.7 });
      for (let i = 0; i < 3; i++) { p.set(46, 12 + i, pk('#f0f0e8')); p.set(47, 11 + i, pk('#c8c8c0')); } // a few feathers
    }
    outline(p, 0.4); const c = canv(p); c.dx = -4 / 16; return c; });
}
PSHADOW.cartstall = (S, pr) => { const X = pr.x * 16, Y = pr.y * 16; shRect(S, X + 2, Y + 29, 50, 3); for (let k = 0; k < 8; k++) shRect(S, X + 46 + k, Y + 14 + k, 1, 16 - k); };
function noticeBoardPix() {
  return once('nboard', () => { const W = 40, H = 40, p = new Pix(W, H);
    for (const px of [4, 33]) for (let y = 6; y < 38; y++) { p.set(px, y, pick(PAL.wood, 0.62, px, y)); p.set(px + 1, y, pick(PAL.wood, 0.4, px, y)); p.set(px + 2, y, pick(PAL.wood, 0.16, px, y)); }
    for (let y = 4; y < 30; y++) for (let x = 2; x < 38; x++) { const e = x < 4 || x > 35 || y < 6 || y > 27; p.set(x, y, e ? pick(PAL.wood, y < 6 ? 0.85 : 0.45, x, y) : pick(PAL.plank, 0.5 + (hash(x >> 3, y, 2) - 0.5) * 0.1, x, y)); }
    for (let y = 0; y < 4; y++) for (let x = 6 - y * 2; x < 34 + y * 2; x++) p.set(x, 3 - y + 3, pick(PAL.shingle, 0.7 - y * 0.1, x, y)); // a little shingled roof
    for (let y = 8; y < 27; y++) for (let x = 6; x < 28; x++) p.set(x, y, pick(PAL.cloth, 0.86 - (hash(x, y, 3) - 0.5) * 0.08 + (y > 25 ? -0.1 : 0), x, y)); // the poster
    for (let x = 6; x < 28; x++) { p.set(x, 8, pk('#e0d8c0')); }
    txt(p, 'QUIZ', 7, 9, pk('#c02828')); txt(p, 'NIGHT', 7, 15, pk('#2a2a5a')); txt(p, 'THURS', 7, 21, pk('#2a2a5a')); p.set(16, 8, pk('#d02828')); p.set(15, 7, pk('#d02828')); // pinned with a red pin
    for (let y = 9; y < 20; y++) for (let x = 30; x < 37; x++) p.set(x, y, pick(PAL.cloth, 0.78 + (hash(x, y, 5) - 0.5) * 0.1, x, y)); // a second scrap: a doodled goat
    [['..#..#.', '.#####.', '..###..', '..#.#..', '..#.#..']].forEach((rs) => rs.forEach((r, j) => [...r].forEach((c, i) => { if (c === '#') p.set(30 + i, 12 + j, pk('#5a4a3a')); }))); p.set(33, 9, pk('#d02828'));
    outline(p, 0.4); return canv(p); });
}
function villageBenchPix() {
  return once('vbench', () => { const W = 36, H = 26, p = new Pix(W, H);
    for (const lx of [4, 29]) for (let y = 6; y < 22; y++) for (let i = 0; i < 3; i++) p.set(lx + i, y, pick(PAL.wood, i === 0 ? 0.55 : 0.22, lx, y));
    for (let x = 2; x < 34; x++) { for (let j = 0; j < 3; j++) p.set(x, 5 + j, pick(PAL.wood, j === 0 ? 0.82 : 0.45 - j * 0.1, x, 5 + j)); for (let j = 0; j < 4; j++) p.set(x, 11 + j, pick(PAL.wood, j === 0 ? 0.88 : 0.5 - j * 0.08, x, 11 + j)); }
    for (let x = 2; x < 34; x++) for (let j = 0; j < 3; j++) p.set(x, 16 + j, pick(PAL.wood, 0.5 - j * 0.12, x, 16 + j));
    for (let y = 2; y < 6; y++) for (let x = 3; x < 33; x += 5) p.set(x, y, pick(PAL.wood, 0.4, x, y));
    outline(p, 0.4); return canv(p); });
}
function wellPix() {
  return once('vwell', () => { const W = 44, H = 60, p = new Pix(W, H), cx = 22;
    for (let y = 36; y < 56; y++) { const hw = 14 + (y > 52 ? 0.5 : 0); for (let x = cx - hw; x < cx + hw; x++) { const lit = (x - (cx - hw)) / (2 * hw); p.set(Math.floor(x), y, y < 40 ? (y < 38 ? pick(PAL.dry, 0.86, x, y) : pick(PAL.dry, 0.6 - lit * 0.3, x, y)) : masonryPx(Math.floor(x), y, 40, 13, PAL.dry, 7, 4)); } }
    for (let x = cx - 12; x < cx + 12; x++) for (let y = 34; y < 38; y++) { const dy = (y + 0.5 - 36) / 2.4; if (((x + 0.5 - cx) / 12) ** 2 + dy * dy < 1) p.set(Math.floor(x), y, pick(PAL.vwater, 0.35, x, y)); }
    for (const px of [cx - 12, cx + 10]) for (let y = 10; y < 40; y++) for (let i = 0; i < 3; i++) p.set(px + i, y, pick(PAL.wood, i === 0 ? 0.6 : 0.2, px, y));
    for (let y = 0; y < 11; y++) for (let x = cx - 18 + y; x < cx + 18 - y + 1; x++) p.set(x, 2 + y, pick(PAL.thatchG, cl(0.62 + (x < cx ? 0.1 : -0.12) + (hash(x, y, 5) - 0.5) * 0.2 - (y > 8 ? 0.22 : 0)), x, y));
    for (let x = cx - 8; x <= cx + 8; x++) p.set(x, 17, pick(PAL.wood, 0.6, x, 17)); for (let y = 18; y < 28; y++) p.set(cx, y, pk('#b8a888')); // the beam and rope
    for (let y = 28; y < 34; y++) for (let x = cx - 3; x <= cx + 3; x++) p.set(x, y, pick(PAL.wood, 0.55 - (x - cx + 3) * 0.06 - (y === 28 ? -0.2 : 0), x, y)); for (let x = cx - 3; x <= cx + 3; x++) p.set(x, 30, pick(PAL.iron, 0.5, 0, 0));
    outline(p, 0.4); return canv(p); });
}
PSHADOW.well = (S, pr) => { const X = pr.x * 16, Y = pr.y * 16; shEll(S, X + 20, Y + 29, 16, 3); for (let k = 0; k < 9; k++) shRect(S, X + 34 + k, Y + 6 + k, 1, 22 - k); };
function trestlePix() {
  return once('trestle', () => { const W = 36, H = 26, p = new Pix(W, H);
    for (const lx of [5, 28]) for (let y = 12; y < 23; y++) { p.set(lx + (y - 12) / 6, y, pick(PAL.wood, 0.3, 0, 0)); p.set(lx - (y - 12) / 6 + 3, y, pick(PAL.wood, 0.5, 0, 0)); }
    for (let x = 2; x < 34; x++) { for (let j = 0; j < 5; j++) p.set(x, 7 + j, pick(PAL.wood, j === 0 ? 0.86 : 0.6 - j * 0.04 + (hash(x >> 3, j, 4) - 0.5) * 0.12 + ((x % 9 === 0) ? -0.15 : 0), x, 7 + j)); for (let j = 0; j < 2; j++) p.set(x, 12 + j, pick(PAL.wood, 0.4 - j * 0.15, x, 12 + j)); }
    for (let x = 4; x < 32; x++) { for (let j = 0; j < 3; j++) p.set(x, 17 + j, pick(PAL.wood, j === 0 ? 0.75 : 0.42 - j * 0.1, x, 17 + j)); } // the bench
    for (const [mx, my] of [[8, 3], [15, 4], [24, 3]]) { for (let y = 0; y < 5; y++) for (let x = 0; x < 4; x++) p.set(mx + x, my + y, pick(PAL.gold, 0.75 - x * 0.12 - (y === 4 ? 0.2 : 0), 0, 0)); for (let x = 0; x < 4; x++) p.set(mx + x, my - 1, pk('#fffbe8')); p.set(mx + 4, my + 1, pk('#a07818')); p.set(mx + 4, my + 2, pk('#a07818')); } // three pints with foam
    for (let x = 28; x < 32; x++) { p.set(x, 4, pick(PAL.cloth, 0.8, 0, 0)); p.set(x, 5, pick(PAL.cloth, 0.6, 0, 0)); } // a loaf, for the look of it
    outline(p, 0.4); return canv(p); });
}
PSHADOW.trestle = (S, pr) => { const X = pr.x * 16, Y = pr.y * 16; shRect(S, X + 3, Y + 22, 32, 2); };
function lanternPost() {
  return once('lpost', () => { const p = new Pix(12, 48);
    for (let y = 8; y < 47; y++) for (let i = 0; i < 3; i++) p.set(4 + i, y, pick(PAL.wood, i === 0 ? 0.62 : i === 1 ? 0.4 : 0.16, 4, y));
    for (let x = 4; x < 11; x++) p.set(x, 8, pick(PAL.iron, 0.5, 0, 0)); for (let y = 8; y < 14; y++) p.set(10, y, pick(PAL.iron, 0.5, 0, 0));
    for (let y = 14; y < 20; y++) for (let x = 8; x < 12; x++) p.set(x, y, x === 8 || x === 11 || y === 14 || y === 19 ? pick(PAL.iron, 0.3, 0, 0) : pick(PAL.glow, 0.85, x, y));
    outline(p, 0.4); return canv(p); });
}
function festoonPix(w, f) { // lanterns and bunting strung between two posts (w tiles apart)
  return once(`fest${w}${f}`, () => { const W = (w + 1) * 16, H = 34, p = new Pix(W, H), sag = 9, x0 = 5, x1 = w * 16 + 5, xc = (x0 + x1) / 2, hw = (x1 - x0) / 2;
    const yAt = (x) => Math.round(4 + sag * (1 - ((x - xc) / hw) ** 2));
    for (let x = x0; x <= x1; x++) p.set(x, yAt(x), pk('#c8bca0'));
    const flags = ['#e03038', '#f8f0d8', '#3a9848', '#f0c030', '#f8f0d8', '#e03038'];
    for (let x = x0 + 4, k = 0; x < x1 - 3; x += 7, k++) { const y = yAt(x); for (let j = 0; j < 5; j++) for (let i = -2 + (j >> 1); i <= 2 - (j >> 1); i++) p.set(x + i, y + 1 + j, i < 0 ? pk(flags[k % flags.length]) : dk(pk(flags[k % flags.length]), 0.8)); }
    for (let x = x0 + 14, k = 0; x < x1 - 10; x += 24, k++) { const y = yAt(x); p.set(x, y + 1, pick(PAL.iron, 0.5, 0, 0)); p.set(x, y + 2, pick(PAL.iron, 0.5, 0, 0));
      for (let j = 0; j < 7; j++) for (let i = -2; i <= 2; i++) { const e = Math.abs(i) === 2 || j === 0 || j === 6; p.set(x + i, y + 3 + j, e ? pick(PAL.iron, 0.3, 0, 0) : pick(PAL.glow, cl(0.95 - Math.abs(i) * 0.08 - (f && (k & 1) ? 0.12 : 0)), 0, 0)); }
      for (let j = -1; j < 11; j++) for (let i = -4; i <= 4; i++) if (Math.abs(i) + Math.abs(j - 5) * 0.7 < 5.2 && !p.on(x + i, y + 3 + j)) p.set(x + i, y + 3 + j, pk('#ffe8a030')); }
    return canv(p); });
}
VPROP.lanterns = (pr, m, t, out) => { const img = festoonPix(pr.w, Math.floor(t * 4 + pr.x) % 2); out.push({ img, x: pr.x + 0.3, y: pr.y - 1.75, z: 2 }); };
VPROP.post = (pr, m, t, out) => putSprite(out, lanternPost(), pr.x + 0.3, pr.y + 1);
VPROP.cross = (pr, m, t, out) => putSprite(out, marketCrossPix(), pr.x - 0.25, pr.y + 1);
VPROP.stocks = (pr, m, t, out) => putSprite(out, stocksPix(), pr.x - 0.15, pr.y + 1);
VPROP.cartstall = (pr, m, t, out) => putSprite(out, cartPix(pr.c || 'veg'), pr.x, pr.y + 2);
VPROP.noticeboard = (pr, m, t, out) => putSprite(out, noticeBoardPix(), pr.x - 0.15, pr.y + 1);
VPROP.bench = (pr, m, t, out) => putSprite(out, villageBenchPix(), pr.x - 0.1, pr.y + 1);
VPROP.well = (pr, m, t, out) => putSprite(out, wellPix(), pr.x - 0.15, pr.y + 2);
VPROP.trestle = (pr, m, t, out) => putSprite(out, trestlePix(), pr.x - 0.1, pr.y + 1);
VPROP.maypole = (pr, m, t, out) => putSprite(out, maypolePix(Math.floor(t * 2.2) % 3), pr.x, pr.y + 1.02);

// ---------------------------------------------------------------- village life: geese, goats, the hay cart, haystacks, hives, washing, the lych gate
const FLIPS = new WeakMap();
const flipped = (c) => { let o = FLIPS.get(c); if (!o) { o = mk(c.width, c.height); const x = o.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); o.dx = c.dx; FLIPS.set(c, o); } return o; };
function wander(i, t, x0, y0, w, h, T = 7) { // walk to a random spot, then stand about for a while
  const u = t / T + i * 0.37, k = Math.floor(u), ph = u - k, tg = (kk) => [x0 + hash(kk, i, 1) * w, y0 + hash(kk, i, 2) * h], a = tg(k - 1), b = tg(k), s = Math.min(1, ph / 0.38), e = s * s * (3 - 2 * s);
  return { x: a[0] + (b[0] - a[0]) * e, y: a[1] + (b[1] - a[1]) * e, moving: ph < 0.38, dir: b[0] >= a[0] ? 1 : -1, ph };
}
function goosePix(pose) { // a white goose facing right; poses: a, b (walking), peck, swim
  return once('goose' + pose, () => { const p = new Pix(20, 19), sw = pose === 'swim', cy = sw ? 12.4 : 11;
    blob(p, 8.5, cy, 6.2, PAL.cloth, { sq: 0.6, amb: 0.5, jit: 0.04, rimDark: 0.1 }); for (let k = 0; k < 4; k++) { p.set(2 - (k > 1 ? 1 : 0), cy - 2 - k, pick(PAL.cloth, 0.9 - k * 0.1, 0, 0)); p.set(3 - (k > 1 ? 1 : 0), cy - 2 - k, pick(PAL.cloth, 0.7, 0, 0)); } // tail
    for (let k = 0; k < 6; k++) p.set(5 + k, cy - 0.5 + (k > 3 ? 0.6 : 0), pick(PAL.cloth, 0.38, 0, 0)); // the folded wing
    if (pose === 'peck') { for (let j = 0; j < 7; j++) { const x = 13 + Math.round(j * 0.55), y = cy - 3 + j; p.set(x, y, pick(PAL.cloth, 0.92, 0, 0)); p.set(x + 1, y, pick(PAL.cloth, 0.68, 0, 0)); } blob(p, 17, cy + 4, 2.1, PAL.cloth, { amb: 0.5 }); p.set(18, cy + 4, pk('#201008')); p.set(18, cy + 5, pk('#f08a20')); p.set(19, cy + 5, pk('#d86010')); }
    else { for (let j = 0; j < 8; j++) { const x = 13 + Math.round(Math.sin(j * 0.45) * 1.2), y = cy - 2 - j; p.set(x, y, pick(PAL.cloth, 0.92, 0, 0)); p.set(x + 1, y, pick(PAL.cloth, 0.68, 0, 0)); } blob(p, 14.5, cy - 10, 2.2, PAL.cloth, { amb: 0.5 }); p.set(15, cy - 10, pk('#201008')); for (let i = 0; i < 3; i++) p.set(16 + i, cy - 9 + (i > 1 ? 1 : 0), pk(i > 1 ? '#d86010' : '#f08a20')); }
    if (!sw) { const f = pose === 'b' ? 1 : 0; for (const lx of [6 + f, 10 - f]) { for (let y = cy + 3; y < cy + 6; y++) p.set(lx, y, pk('#e07818')); p.set(lx + 1, cy + 5, pk('#e07818')); p.set(lx + 2, cy + 5, pk('#c06010')); } }
    else { for (let x = 1; x < 17; x++) { p.set(x, 17, pk('#e8faf8a0')); if (x % 3 === 0) p.set(x, 18, pk('#e8faf860')); } for (let x = 0; x < 20; x++) for (let y = 15; y < 19; y++) if (cA(p.get(x, y)) === 255 && y > 15) p.set(x, y, pk('#ffffff00')); }
    outline(p, 0.5); return canv(p); });
}
const GOATBROWN = ramp('#2a1c10 #3e2a18 #56402a #70563a #8c7050 #a8896a #c4a888');
function goatPix(pose, coat) { // a goat facing right: short thick neck, swept-back horns, a goatee; poses: stand, graze, a, b (walking); coats: 0 white, 1 patched, 2 brown
  return once(`goat${pose}${coat}`, () => { const p = new Pix(24, 20), C = coat === 2 ? GOATBROWN : PAL.cloth, gz = pose === 'graze', f = pose === 'a' ? 1 : pose === 'b' ? -1 : 0, am = coat === 2 ? 0.5 : 0.52;
    blob(p, 9.4, 10.2, 6.2, C, { sq: 0.58, amb: am, jit: 0.05, rimDark: 0.14 });
    if (coat === 1) for (let y = 4; y < 16; y++) for (let x = 3; x < 17; x++) if (p.on(x, y) && Math.hypot((x - 8) / 4.4, (y - 9.5) / 2.8) < 1) p.set(x, y, pick(GOATBROWN, cl(0.66 - (x - 4) * 0.02 + (hash(x, y, 2) - 0.5) * 0.15), x, y));
    const hx = gz ? 17.6 : 16.6, hy = gz ? 14.2 : 5.8;
    if (!gz) { blob(p, 13.4, 8.2, 2.9, C, { amb: am }); blob(p, 14.8, 6.8, 2.6, C, { amb: am }); } else { blob(p, 13.6, 10, 2.9, C, { amb: am }); blob(p, 15.6, 12, 2.6, C, { amb: am }); }
    blob(p, hx, hy, 2.6, C, { sq: 0.95, amb: am }); blob(p, hx + 2.2, hy + 1.2, 1.7, coat === 2 ? PAL.dirt : PAL.cloth, { amb: 0.55 });
    p.set(hx + 3, hy + 1, pk('#a86868')); p.set(hx + 3, hy + 2, pk('#7a4848')); p.set(hx + 0.6, hy - 0.8, pk('#181008'));
    for (const [dx, dy] of [[-0.5, -2.6], [-1.4, -3.4], [-2.6, -3.6], [-3.6, -3.0], [-4.2, -2.2]]) p.set(hx + dx, hy + dy, pk(dy < -3.2 ? '#c8c0a8' : '#a8a088')); // horns, swept back
    for (const [dx, dy] of [[-1.6, -0.6], [-2.6, 0.2], [-3.2, 0.8]]) p.set(hx + dx, hy + dy, pick(coat === 2 ? GOATBROWN : PAL.cloth, 0.28, 0, 0)); // ears
    for (const [dx, dy] of [[0.6, 2.8], [0.8, 3.8], [0.4, 4.6]]) p.set(hx + dx, hy + dy, pick(PAL.cloth, 0.95 - dy * 0.05, 0, 0)); // goatee
    for (const [lx, d] of [[12.2, 0.95], [14.8, 0.8], [4.4, 0.8], [7, 0.95]]) { const off = (lx > 10 ? f : -f), x0 = Math.round(lx + off * 0.7); for (let y = 13; y < 18; y++) for (let i = 0; i < 2; i++) p.set(x0 + i, y, pick(coat === 2 ? GOATBROWN : PAL.cloth, 0.62 * d - i * 0.2 - (y > 16 ? 0.2 : 0), 0, 0)); p.set(x0, 18, pk('#2a1c10')); p.set(x0 + 1, 18, pk('#2a1c10')); }
    p.set(2, 6, pick(C, 0.9, 0, 0)); p.set(1, 5, pick(C, 0.8, 0, 0)); p.set(2, 7, pick(C, 0.6, 0, 0)); // the tail, up
    outline(p, 0.45); return canv(p); });
}
VPROP.geese = (pr, m, t, out) => { for (let i = 0; i < (pr.n || 2); i++) { const c = wander(i, t, pr.x, pr.y, pr.w, pr.h, 8), peck = !c.moving && hash(Math.floor(t * 0.6 + i), i, 3) < 0.55, pose = c.moving ? (Math.floor(t * 6 + i) % 2 ? 'a' : 'b') : peck ? 'peck' : 'a', img = goosePix(pose);
  out.push({ img: c.dir < 0 ? flipped(img) : img, x: c.x - 0.1, y: c.y + 1 - 19 / 16, z: 1, sy: c.y + 1 }); } };
VPROP.pondfowl = (pr, m, t, out) => { for (let i = 0; i < (pr.n || 2); i++) { const a = t * 0.32 + i * Math.PI + (pr.ph || 0), x = pr.x + Math.cos(a) * pr.rx, y = pr.y + Math.sin(a) * pr.ry, right = Math.sin(a) < 0, img = goosePix('swim');
  out.push({ img: right ? img : flipped(img), x: x - 0.6, y: y - 0.7, z: 1, sy: y + 0.5 }); } };
VPROP.goats = (pr, m, t, out) => { for (let i = 0; i < (pr.n || 3); i++) { const c = pr.w ? wander(i + (pr.seed || 0), t, pr.x, pr.y, pr.w, pr.h, 9) : { x: pr.x, y: pr.y, moving: false, dir: pr.dir || 1 }, graze = !c.moving && hash(Math.floor(t * 0.35 + i * 3), i, 5) < 0.6, pose = c.moving ? (Math.floor(t * 5 + i) % 2 ? 'a' : 'b') : graze ? 'graze' : 'stand', img = goatPix(pose, (i + (pr.seed || 0)) % 3);
  out.push({ img: c.dir < 0 ? flipped(img) : img, x: c.x - 0.25, y: c.y + 1 - 20 / 16 + 0.05, z: 1, sy: c.y + 1 }); } };
function hayCartPix() {
  return once('haycart', () => { const W = 64, H = 56, p = new Pix(W, H);
    const wheel = (cx, cy, r) => { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d > r) continue; const ang = Math.atan2(y + 0.5 - cy, x + 0.5 - cx), spoke = d < r - 2 && Math.abs(Math.sin(ang * 4)) < 0.2 + 0.4 / Math.max(2, d);
      if (d > r - 2) p.set(x, y, pick(PAL.iron, 0.55 - (x - cx) * 0.01, x, y)); else if (d < 2.2) p.set(x, y, pick(PAL.gold, 0.5, x, y)); else if (spoke) p.set(x, y, pick(PAL.wood, 0.6 - (x - cx) * 0.02, x, y)); } };
    for (let y = 30; y < 44; y++) for (let x = 6; x < 58; x++) { const pl = Math.floor((y - 30) / 4); p.set(x, y, pick(PAL.wood, 0.5 + (hash(x >> 3, pl, 5) - 0.5) * 0.16 - ((y - 30) % 4 === 3 ? 0.22 : 0) - (x > 52 ? 0.12 : 0) - (y > 41 ? 0.1 : 0), x, y)); }
    for (let x = 5; x < 59; x++) { p.set(x, 29, pick(PAL.wood, 0.9, x, 29)); p.set(x, 30, pick(PAL.wood, 0.5, x, 30)); }
    // the heap: a golden mound of hay with loose strands
    for (let y = 6; y < 30; y++) for (let x = 3; x < 61; x++) { const dx = (x + 0.5 - 32) / 29, top = 8 + (dx * dx) * 18 + (hash(x >> 2, 1, 3) - 0.5) * 3; if (y < top) continue; const lit = -dx * 0.2 - (y - top) * 0.012; p.set(x, y, pick(PAL.gold, cl(0.62 + lit + (hash(x, y >> 1, 4) - 0.5) * 0.4 - ((x + y * 2) % 7 === 0 ? 0.22 : 0)), x, y)); }
    for (let k = 0; k < 40; k++) { const x = 2 + Math.floor(hash(k, 1, 7) * 60), y = 6 + Math.floor(hash(k, 2, 7) * 26); if (!p.on(x, y) || y < 12) continue; for (let j = 0; j < 3 + (k % 3); j++) p.set(x + (k % 2 ? j : -j), y - j * 0.7, pick(PAL.gold, 0.95, 0, 0)); }
    for (let k = 0; k < 14; k++) for (let j = 0; j < 4; j++) p.set(6 + k * 3.6, 30 + j + (k % 2), pick(PAL.gold, 0.85 - j * 0.1, 0, 0)); // straw hanging over the side
    wheel(16, 45, 10); wheel(46, 45, 10);
    for (let k = 0; k < 28; k++) p.set(56 + k * 0.28, 38 + k * 0.45, pick(PAL.wood, 0.5, 0, 0));
    for (let y = 8; y < 36; y++) { p.set(52, y, pick(PAL.wood, 0.55, 0, 0)); p.set(53, y, pick(PAL.wood, 0.25, 0, 0)); } for (const tx of [50, 52, 54]) for (let y = 4; y < 9; y++) p.set(tx + (tx === 52 ? 0 : 0), y, pick(PAL.iron, 0.55, 0, 0)); p.set(51, 8, pick(PAL.iron, 0.5, 0, 0)); p.set(55, 8, pick(PAL.iron, 0.5, 0, 0)); // the pitchfork
    outline(p, 0.4); const c = canv(p); c.dx = -0.25; return c; });
}
VPROP.haycart = (pr, m, t, out) => { putSprite(out, hayCartPix(), pr.x, pr.y + 2);
  const bob = Math.floor(t * 1.6) % 2, img = goatPix(bob ? 'stand' : 'graze', 1); out.push({ img, x: pr.x + 1.2, y: pr.y - 1.75, z: 1, sy: pr.y + 2.02 }); }; // a goat atop the hay, chewing
PSHADOW.haycart = (S, pr) => { const X = pr.x * 16, Y = pr.y * 16; shRect(S, X + 2, Y + 32, 52, 3); for (let k = 0; k < 9; k++) shRect(S, X + 54 + k, Y + 10 + k, 1, 22 - k); };
function haystackPix() {
  return once('haystack', () => { const W = 36, H = 44, p = new Pix(W, H);
    for (let y = 2; y < 42; y++) { const t = (y - 2) / 40, hw = 3 + 14 * Math.pow(t, 0.8) + (y > 36 ? 0.5 : 0), cx = 18; for (let x = Math.floor(cx - hw); x <= cx + hw - 0.5; x++) { const u = (x + 0.5 - cx) / hw, streak = hash(x, y >> 2, 3); p.set(x, y, pick(PAL.gold, cl(0.62 - u * 0.3 + (streak - 0.5) * 0.34 + (((x * 2 + y) % 9 === 0) ? -0.2 : 0) + (y > 38 ? -0.2 : 0)), x, y)); } }
    for (let x = 6; x < 31; x++) { const y = 26 + Math.round(Math.sin(x * 0.5) * 0.6); p.set(x, y, pk('#7a5a24')); p.set(x, y + 1, pk('#a08038')); }
    for (let k = 0; k < 30; k++) { const x = 3 + Math.floor(hash(k, 1, 9) * 30), y = 14 + Math.floor(hash(k, 2, 9) * 28); if (p.on(x, y)) { p.set(x + 1, y - 1, pick(PAL.gold, 0.95, 0, 0)); p.set(x + 2, y - 2, pick(PAL.gold, 0.95, 0, 0)); } }
    for (let k = 0; k < 8; k++) p.set(15 + k, 1 + (k & 1), pick(PAL.gold, 0.9, 0, 0));
    outline(p, 0.4); return canv(p); });
}
VPROP.haystack = (pr, m, t, out) => putSprite(out, haystackPix(), pr.x - 0.1, pr.y + 2);
PSHADOW.haystack = (S, pr) => { const X = pr.x * 16, Y = pr.y * 16; shEll(S, X + 18, Y + 29, 15, 3.5); for (let k = 0; k < 10; k++) shRect(S, X + 28 + k, Y + 8 + k, 1, 20 - k); };
function marrowPix() {
  return once('marrow', () => { const W = 40, H = 26, p = new Pix(W, H);
    for (let y = 18; y < 23; y++) for (let x = 2; x < 38; x++) p.set(x, y, pick(PAL.plank, y === 18 ? 0.8 : 0.5 - (y - 18) * 0.06 + (hash(x >> 3, y, 3) - 0.5) * 0.1 - ((x - 2) % 12 === 0 ? 0.2 : 0), x, y)); // the pallet
    for (let y = 4; y < 19; y++) for (let x = 3; x < 37; x++) { const dx = (x + 0.5 - 18) / 16.5, dy = (y + 0.5 - 11.5) / 7.2, d = dx * dx + dy * dy; if (d > 1) continue; const stripe = Math.sin((x - 3) * 0.7 + dy * 1.2) > 0.55;
      p.set(x, y, pick(PAL.leaf, cl(0.55 - dx * 0.2 - dy * 0.5 + (stripe ? 0.2 : -0.06) + (hash(x, y, 5) - 0.5) * 0.08 - (d > 0.85 ? 0.15 : 0)), x, y)); }
    for (let k = 0; k < 4; k++) p.set(34 + k, 8 - (k > 1 ? 1 : 0), pick(PAL.bark, 0.6, 0, 0)); p.set(37, 9, pk('#f0cc3c')); p.set(37, 10, pk('#d8a820')); p.set(38, 9, pk('#f8e060')); // the withered flower end
    for (let y = 11; y < 18; y++) for (let x = 6; x < 15; x++) if (Math.hypot(x - 10.5, y - 13) < 4.4) p.set(x, y, Math.hypot(x - 10.5, y - 13) < 2.1 ? pk('#f8d040') : pk(hash(x, y, 2) < 0.5 ? '#3a60d8' : '#2a48b8')); // a blue first-prize rosette
    for (const [x, y] of [[8, 17], [9, 18], [12, 17], [13, 18]]) p.set(x, y, pk('#3a60d8')); txt(p, '1', 10, 11, pk('#7a5a10'));
    outline(p, 0.4); return canv(p); });
}
VPROP.marrow = (pr, m, t, out) => putSprite(out, marrowPix(), pr.x - 0.2, pr.y + 1);
PSHADOW.marrow = (S, pr) => { const X = pr.x * 16, Y = pr.y * 16; shRect(S, X + 3, Y + 14, 34, 2); };
function hivesPix() {
  return once('hives', () => { const W = 54, H = 30, p = new Pix(W, H);
    for (const lx of [4, 47]) for (let y = 18; y < 28; y++) for (let i = 0; i < 3; i++) p.set(lx + i, y, pick(PAL.wood, i === 0 ? 0.55 : 0.2, lx, y));
    for (let x = 2; x < 52; x++) { for (let j = 0; j < 3; j++) p.set(x, 17 + j, pick(PAL.wood, j === 0 ? 0.85 : 0.5 - j * 0.12, x, 17 + j)); }
    for (const hx of [8, 22, 36]) { for (let y = 2; y < 17; y++) { const t = (y - 2) / 15, hw = 3 + 4.6 * Math.pow(Math.sin(Math.min(1, t * 1.15) * 1.57), 0.8) + (y > 14 ? 0.6 : 0); for (let x = Math.floor(hx + 7 - hw); x <= hx + 7 + hw - 0.5; x++) { const u = (x + 0.5 - hx - 7) / hw; p.set(x, y, pick(PAL.gold, cl(0.62 - u * 0.3 + ((y % 3 === 0) ? -0.22 : 0.04) + (hash(x, y >> 1, 3) - 0.5) * 0.15), x, y)); } }
      for (let y = 14; y < 17; y++) for (let x = hx + 5; x < hx + 10; x++) p.set(x, y, pk('#1a1008')); p.set(hx + 7, 1, pick(PAL.gold, 0.9, 0, 0)); p.set(hx + 6, 2, pick(PAL.gold, 0.8, 0, 0)); }
    outline(p, 0.4); return canv(p); });
}
VPROP.hives = (pr, m, t, out) => { putSprite(out, hivesPix(), pr.x - 0.1, pr.y + 1);
  for (const [i, hx] of [8, 22, 36].entries()) for (let n = 0; n < 3; n++) { const a = t * (2.2 + n * 0.7) + i * 2 + n * 1.9, bx = pr.x - 0.1 + (hx + 7) / 16 + Math.cos(a) * 0.55, by = pr.y + 0.55 + Math.sin(a * 1.3) * 0.35;
    out.push({ draw: (ctx, X, Y, TS) => { const u = TS / 16; ctx.fillStyle = '#2a1a08'; ctx.fillRect(Math.round(X), Math.round(Y), Math.round(2 * u), Math.round(u)); ctx.fillStyle = '#f0c030'; ctx.fillRect(Math.round(X + u), Math.round(Y - u * 0.5), Math.round(u), Math.round(u)); }, x: bx, y: by, w: 0.2, h: 0.1, z: 2 }); } };
PSHADOW.hives = (S, pr) => { const X = pr.x * 16, Y = pr.y * 16; shRect(S, X + 2, Y + 15, 50, 2); };
function washPix(f) { // a washing line with a shirt, socks and a pair of comically enormous bloomers
  return once('wash' + f, () => { const W = 56, H = 40, p = new Pix(W, H), sag = 5, yAt = (x) => Math.round(3 + sag * (1 - ((x - 28) / 26) ** 2) * 0 + sag * (1 - ((x - 28) / 26) ** 2)), sw = f ? 1 : 0;
    for (let x = 2; x < 54; x++) p.set(x, yAt(x), pk('#c8b890'));
    const peg = (x) => { p.set(x, yAt(x) - 1, pk('#a07838')); p.set(x, yAt(x), pk('#7a5a28')); p.set(x + 1, yAt(x) - 1, pk('#a07838')); };
    // shirt
    for (let y = 0; y < 11; y++) for (let x = 0; x < 9; x++) { const sleeve = y < 4 && (x < 2 || x > 6); const body = x >= 1 && x <= 7; if (!(body || sleeve)) continue; p.set(7 + x + (y > 8 ? sw : 0), yAt(10) + y, pick(PAL.cloth, cl(0.86 - (x > 5 ? 0.18 : 0) - (y > 8 ? 0.08 : 0)), x, y)); } peg(11); peg(14);
    // the bloomers: huge, cream, red polka dots, a patch, leg holes
    const bx = 22 + sw; for (let y = 0; y < 17; y++) for (let x = 0; x < 20; x++) { const legs = y > 9 && x > 8 && x < 11 + (y - 10) * 0.1; const edge = (y > 9 && (x < 1 + (y - 9) * 0.2 || x > 18 - (y - 9) * 0.2)) ; const inside = x >= 0 && x < 20 && y < 17; if (legs) continue; const dx = x - 9.5; if (y > 10 && Math.abs(dx) > 9.5 - (y - 10) * 0.3) continue;
      const waist = y < 2; let c = waist ? pick(PAL.red, 0.7, x, y) : pick(PAL.cloth, cl(0.92 - (dx > 3 ? 0.18 : 0) - (y > 14 ? 0.1 : 0) + (hash(x, y, 6) - 0.5) * 0.04), x, y); if (!waist && ((x * 5 + y * 3) % 11 === 0 || (x * 3 + y * 7) % 13 === 0) && y > 2 && y < 15) c = pick(PAL.red, 0.6, x, y); p.set(bx + x, yAt(bx + 10) + y, c); }
    for (let y = 8; y < 12; y++) for (let x = 3; x < 7; x++) p.set(bx + x, yAt(bx + 10) + y, pick(PAL.blue, 0.55 + (x + y) % 2 * 0.1, x, y)); // a patch
    peg(bx + 3); peg(bx + 16);
    for (const sx of [46, 49]) { for (let y = 0; y < 8; y++) for (let x = 0; x < 3; x++) p.set(sx + x + (y > 5 ? 1 : 0), yAt(sx) + y, y % 3 === 0 ? pick(PAL.red, 0.7, 0, 0) : pick(PAL.cloth, 0.8, 0, 0)); peg(sx + 1); }
    outline(p, 0.4); return canv(p); });
}
VPROP.washline = (pr, m, t, out) => { const img = washPix(Math.floor(t * 1.3 + pr.x) % 2); out.push({ img, x: pr.x - 0.1, y: pr.y - 0.5, z: 2 }); };
function lychRoof() {
  return once('lychroof', () => { const W = 88, H = 34, p = new Pix(W, H), cx = 44;
    for (let y = 0; y < 22; y++) { const hw = 4 + 37 * y / 21; for (let x = Math.floor(cx - hw); x <= cx + hw - 0.5; x++) { const d = Math.abs(x + 0.5 - cx) - (hw - 6);
      if (d > 0) { const k = 21 - y, course = Math.floor(k / 3), j = k % 3; p.set(x, y, pick(PAL.shingle, cl(0.52 + (x < cx ? 0.12 : -0.14) + (hash(Math.floor((x + (course & 1) * 2) / 5), course, 9) - 0.5) * 0.25 - (j === 0 ? 0.2 : 0) - (d > 4.5 ? 0.25 : 0)), x, y)); }
      else p.set(x, y, y > 17 && y < 20 ? pick(PAL.oakT, 0.55, x, y) : (x + 2) % 8 < 2 ? pick(PAL.oakT, 0.34, x, y) : pick(PAL.plank, cl(0.52 + (hash(x >> 3, y >> 3, 4) - 0.5) * 0.12 - (y < 2 ? 0.3 : 0)), x, y)); } }
    for (let x = 3; x < 85; x++) { p.set(x, 22, pick(PAL.oakT, 0.66, x, 0)); p.set(x, 23, pick(PAL.oakT, 0.62, x, 0)); p.set(x, 24, pick(PAL.oakT, 0.3, x, 0)); }
    p.set(cx, 25, pk('#3a3a44')); p.set(cx, 26, pk('#3a3a44')); for (let y = 27; y < 33; y++) for (let x = cx - 2; x <= cx + 2; x++) p.set(x, y, x === cx - 2 || x === cx + 2 || y === 27 || y === 32 ? pick(PAL.iron, 0.3, 0, 0) : pick(PAL.glow, 0.85, 0, 0));
    for (let y = 8; y < 16; y++) for (let x = cx - 4; x <= cx + 4; x++) if (Math.hypot(x - cx, y - 11.5) < 3.8) p.set(x, y, Math.hypot(x - cx, y - 11.5) > 2.6 ? pick(PAL.oakT, 0.6, x, y) : pk('#140c06')); // a round vent in the gable
    outline(p, 0.35); return canv(p); });
}
function lychPost() { return once('lychpost', () => { const p = new Pix(14, 54); for (let y = 0; y < 52; y++) for (let i = 0; i < 6; i++) p.set(4 + i, y, pick(PAL.oakT, i < 2 ? 0.66 : i < 4 ? 0.46 : 0.2, 4, y)); for (let y = 48; y < 54; y++) for (let x = 2; x < 12; x++) p.set(x, y, pick(PAL.dry, 0.6 - (x - 2) * 0.04 + (y === 48 ? 0.2 : 0), x, y)); for (let k = 0; k < 4; k++) { p.set(2 - k + 4, 3 + k, pick(PAL.oakT, 0.5, 0, 0)); } outline(p, 0.4); return canv(p); }); }
VPROP.lychgate = (pr, m, t, out) => { const w = pr.w || 3, post = lychPost(), by = pr.y + 1;
  putSprite(out, post, pr.x + 0.2, by); putSprite(out, post, pr.x + w + 1 + 0.2, by);
  out.push({ img: lychRoof(), x: pr.x + (w + 1) / 2 - 2.25, y: by - 54 / 16 - 22 / 16 + 0.05, z: 2 }); };
PSHADOW.lychgate = (S, pr) => { const X = pr.x * 16, Y = pr.y * 16; shRect(S, X + 4, Y + 14, 14, 3); shRect(S, X + (pr.w + 1) * 16 + 4, Y + 14, 14, 3); for (let k = 0; k < 14; k++) shRect(S, X + (pr.w + 1) * 16 + 10 + k, Y - 4 + k, 1, 18 - k); };

// ---------------------------------------------------------------- the brook: waterwheel, humpbacked bridge, rowboat; and the shrine chapel
function wheelPix(f) { // Gemforge's Old Forge's waterwheel: 12 paddles, 12 spokes, turning (6 frames loop seamlessly)
  return once('wheel' + f, () => { const W = 52, H = 52, p = new Pix(W, H), cx = 26, cy = 26, R = 21, rot = f * 5 * Math.PI / 180, SEC = Math.PI / 6;
    const wrap = (a) => { a = ((a % SEC) + SEC) % SEC; return a > SEC / 2 ? a - SEC : a; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx) - rot, w = wrap(a), lat = d * Math.sin(w), lit = -(dx + dy) / 40; let v = -1;
      if (d > R - 3 && d <= R) v = 0.5 + lit * 0.4 + (d > R - 1 ? 0.1 : 0) - (d < R - 2 ? 0.1 : 0); // outer rim
      else if (d > 12.5 && d <= 14.5) v = 0.46 + lit * 0.4; // inner ring
      else if (d > 4 && d <= R - 3 && Math.abs(lat) < 1.1) v = 0.52 + lit * 0.35 - (Math.abs(lat) > 0.6 ? 0.18 : 0); // spokes
      else if (d > R - 1.5 && d < R + 3 && Math.abs(lat) < 3.2 && Math.cos(w) > 0) v = 0.42 + lit * 0.4 - (Math.abs(lat) > 2.4 ? 0.2 : 0) + (d > R + 2 ? 0.1 : 0); // paddles
      if (d <= 4.6) { p.set(x, y, pick(PAL.iron, cl(0.55 - lit * 0.3 + (d < 2 ? 0.2 : 0)), x, y)); continue; }
      if (v >= 0) { let c = pick(PAL.wood, cl(v + (hash(x, y, 4) - 0.5) * 0.08, 0.05, 0.95), x, y); if (vnoise(x, y, 5, 8) > 0.68 && dy > 0) c = pick(PAL.moss, 0.35 + hash(x, y, 5) * 0.3, x, y); p.set(x, y, c); } }
    for (let k = 0; k < 14; k++) { const x = 8 + Math.floor(hash(k, f, 21) * 34), y = 44 + Math.floor(hash(k, f, 22) * 6); p.set(x, y, pk(hash(k, f, 23) < 0.5 ? '#e8faf8' : '#c8ecec')); if (hash(k, f, 24) < 0.4) p.set(x + 1, y + 1, pk('#e8faf890')); } // splash
    outline(p, 0.4); return canv(p); });
}
VPROP.wheel = (pr, m, t, out) => out.push({ img: wheelPix(Math.floor(t * 7) % 6), x: pr.x - 1.1, y: pr.y - 1.6, z: 1, sy: pr.y + 1.02 });
function bridgePix(w) { // the humpbacked bridge: a crowned deck between two parapets, with the arch showing in the near face
  return once('bridge' + w, () => { const W = w * 16, H = 64, p = new Pix(W, H), cxm = W / 2, crown = (x) => Math.round(4.2 * (1 - ((x + 0.5 - cxm) / cxm) ** 2));
    for (let x = 0; x < W; x++) { const c = crown(x), pier = x < 6 || x >= W - 6, lift = pier ? 3 : 0;
      for (let y = 2 - c - lift; y <= 4 - c; y++) p.set(x, y, pick(PAL.dry, cl((y === 2 - c - lift ? 0.96 : 0.8) - (y === 4 - c ? 0.28 : 0) - ((x + (y & 1) * 4) % 8 === 0 ? 0.22 : 0) + (hash(x >> 3, 1, 6) - 0.5) * 0.1), x, y)); // north parapet: the cap
      for (let y = 5 - c; y <= 10 - c; y++) p.set(x, y, dk(masonryPx(x, y, 5 - c, 17, PAL.dry, 8, 3), 0.95)); // its inner face
      for (let y = 11 - c; y <= 29 - c; y++) { let col = masonryPx(x, y, 11 - c, 41, PAL.honey, 11, 6); if (y <= 12 - c) col = dk(col, 0.62); else if (y === 13 - c) col = dk(col, 0.8); if (Math.abs(x + 0.5 - cxm) < 1.1 && y > 14 - c) col = mix(col, pk('#fff2c0'), 0.12); p.set(x, y, col); } // the paved deck, a shade lighter along the crown
      for (let y = 30 - c - lift; y <= 34 - c; y++) p.set(x, y, pick(PAL.dry, cl((y === 30 - c - lift ? 0.96 : 0.8) - (y === 34 - c ? 0.32 : 0) - ((x + (y & 1) * 4) % 8 === 0 ? 0.22 : 0) + (hash(x >> 3, 2, 6) - 0.5) * 0.1), x, y)); // south parapet: the cap
      for (let y = 35 - c; y <= 47; y++) { let col = masonryPx(x, y, 35 - c, 23, PAL.dry, 9, 4); if (vnoise(x, y * 1.3, 7, 14) > 0.7 && y > 40) col = pick(PAL.moss, 0.3 + hash(x, y, 8) * 0.4, x, y); if (y >= 46) col = dk(col, 0.7); p.set(x, y, col); } } // its outer face
    const ax = cxm, rx = Math.min(12, cxm - 8), ay = 47; for (let x = Math.floor(ax - rx - 3); x <= ax + rx + 3; x++) { const u = (x + 0.5 - ax) / rx, top = ay - Math.round(10 * Math.sqrt(Math.max(0, 1 - u * u))), ring = ay - Math.round(12.5 * Math.sqrt(Math.max(0, 1 - (u * u) * 0.78))) - 1;
      if (Math.abs(u) <= 1) for (let y = top; y <= ay; y++) p.set(x, y, y > ay - 3 ? pk('#00000000') : pick(PAL.vwater, 0.06 + (y - top) * 0.012, x, y)); // the dark opening, water at its foot
      if (Math.abs(u) < 1.25) for (let y = ring; y < top; y++) if (y > 33 - crown(x)) p.set(x, y, pick(PAL.dry, cl(0.84 - (Math.abs(x - Math.floor(ax)) % 4 === 0 ? 0.32 : 0) + (u < 0 ? 0.06 : -0.06)), x, y)); } // voussoirs
    climber(p, 0, 24, 8, 22, 9, false);
    outline(p, 0.35); return canv(p); });
}
VPROP.bridge = (pr, m, t, out) => out.push({ img: bridgePix(pr.w || 4), x: pr.x, y: pr.y - 1, z: 0 });
function rowboatPix(f) {
  return once('rowboat' + f, () => { const p = new Pix(30, 16), oy = f;
    for (let y = 3; y < 13; y++) for (let x = 1; x < 29; x++) { const u = (x - 1) / 27, half = 4.2 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.85)), 0.8) + 0.3, dy = y + 0.5 - 8; if (Math.abs(dy) > half) continue; const inner = Math.abs(dy) < half - 1.3 && x > 3 && x < 26;
      p.set(x, y + oy, inner ? pick(PAL.wood, 0.5 + (x % 6 === 0 ? -0.25 : 0) - dy * 0.03, x, y) : pick(PAL.wood, dy < 0 ? 0.85 : 0.3, x, y)); }
    for (let k = 0; k < 9; k++) p.set(11 + k, 2 + oy + Math.floor(k / 4), pick(PAL.wood, 0.85, 0, 0)); for (const x of [10, 19]) for (let y = 5; y < 11; y++) p.set(x, y + oy, pick(PAL.wood, 0.7, 0, 0));
    for (let x = 4; x < 27; x += 3) if ((x + f) % 2) p.set(x, 13 + (f ? 1 : 0), pk('#e8faf8a0'));
    outline(p, 0.4); return canv(p); });
}
VPROP.rowboat = (pr, m, t, out) => out.push({ img: rowboatPix(Math.floor(t * 1.1 + pr.x) % 2), x: pr.x, y: pr.y, z: 1, sy: pr.y + 0.9 });

// the shrine: a small stone chapel seen gable-end on, with a mossy slate roof, a pointed door and a carved gem over it
function chapelPix() {
  return once('chapel', () => { const W = 80, H = 104, p = new Pix(W, H), cx = 40, seed = 33;
    const yL = (x) => 42 + (Math.abs(x + 0.5 - cx) / 32) * 26;
    for (let y = 8; y < 70; y++) for (let x = 6; x < 74; x++) { const l = yL(x); if (y >= l) continue; const left = x + 0.5 < cx, k = 5 - (Math.floor((y - 8) / 3)), col = Math.floor((x - 6) / 4), stag = (col & 1) * 2;
      let v = 0.5 + (left ? 0.14 : -0.14) + (hash(col, Math.floor((y + stag) / 3), seed) - 0.5) * 0.22 - (((y + stag) % 3 === 2) ? 0.16 : 0) - (((x - 6) % 4) === 0 ? 0.1 : 0); let c = pick(PAL.slateM, cl(v), x, y);
      if (vnoise(x, y, 8, seed + 2) > 0.66) c = pick(PAL.moss, 0.3 + hash(x, y, 7) * 0.35, x, y); if (y - l > -3.5) c = pick(PAL.dry, cl(0.82 + (left ? 0.04 : -0.1) - (y - l > -1 ? 0.25 : 0)), x, y); p.set(x, y, c); }
    for (let y = 9; y < 42; y++) { p.set(cx - 1, y, pick(PAL.dry, 0.9, 0, 0)); p.set(cx, y, pick(PAL.dry, 0.45, 0, 0)); } // the ridge
    for (let y = 42; y < 104; y++) for (let x = 8; x < 72; x++) { const l = yL(x); if (y < l + 3.5) continue; let c;
      if (y < 68) c = masonryPx(x, y, 42, seed, PAL.honey, 8, 4); else c = masonryPx(x, y, 68, seed + 1, PAL.honey, 9, 5);
      const edge = Math.min(x - 8, 71 - x); if (y > 66 && edge < 6) c = pick(PAL.honey, cl(0.52 + (hash(Math.floor((x + y * 3) / 5), y >> 2, seed) - 0.5) * 0.3 + (x - 8 < 6 ? 0.12 : -0.1) - (edge === 5 ? 0.3 : 0)), x, y);
      if (vnoise(x, y * 1.4, 8, seed + 4) > 0.7 && y > 84) c = pick(PAL.moss, 0.3 + hash(x, y, 8) * 0.4, x, y); if (y >= 102) c = dk(c, 0.7); p.set(x, y, c); }
    for (let y = 50; y < 62; y++) for (let x = 34; x < 47; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - 56); if (d > 5.6) continue; p.set(x, y, d > 4 ? pick(PAL.dry, 0.8 - (x < cx ? 0 : 0.3), x, y) : (Math.abs(x + 0.5 - cx) < 0.7 || Math.abs(y + 0.5 - 56) < 0.7) ? pick(PAL.dry, 0.6, x, y) : pick(PAL.glow, cl(0.78 - d * 0.1), x, y)); } // the round window
    // the pointed door with its stone surround, and a carved gem above it
    for (let y = 80; y < 103; y++) { const t = (y - 80) / 22, half = y < 88 ? 2 + (y - 80) * 0.72 : 7.8; for (let x = Math.floor(cx - half - 2); x <= cx + half + 1.5; x++) { const d = Math.abs(x + 0.5 - cx); if (d > half + 2) continue; if (d > half) p.set(x, y, pick(PAL.dry, cl(0.78 - (x > cx ? 0.3 : 0)), x, y)); else { const pl = Math.floor((x - cx + 8) / 3); p.set(x, y, pick(PAL.oakT, cl(0.5 + (pl % 2 ? 0.08 : -0.06) - (y < 86 ? 0.1 : 0) - (x > cx ? 0.12 : 0)), x, y)); } } }
    for (const y of [88, 96]) for (let x = 33; x < 47; x++) p.set(x, y, pick(PAL.iron, 0.5, 0, 0)); p.set(44, 92, pk('#f8d058'));
    for (let y = 103; y < 105; y++) for (let x = cx - 10; x < cx + 10; x++) p.set(x, y - 1, pick(PAL.fstone, 0.5, x, y));
    for (const [dx, dy, c] of [[0, -2, '#b8f0f4'], [-1, -1, '#8ad8e4'], [0, -1, '#e8ffff'], [1, -1, '#60b8cc'], [0, 0, '#8ad8e4'], [0, 1, '#4898b0']]) p.set(cx + dx, 74 + dy, pk(c));
    for (let k = 0; k < 6; k++) { p.set(cx - 1, 33 + k, pick(PAL.dry, 0.9, 0, 0)); p.set(cx, 33 + k, pick(PAL.dry, 0.55, 0, 0)); } for (let x = cx - 4; x < cx + 4; x++) { p.set(x, 36, pick(PAL.dry, x < cx ? 0.9 : 0.5, 0, 0)); p.set(x, 37, pick(PAL.dry, 0.5, 0, 0)); } // a stone cross on the apex
    climber(p, 9, 70, 12, 30, 11, false);
    outline(p, 0.35); const c = canv(p); c.dx = -0.5; return c; });
}
VPROP.chapel = (pr, m, t, out) => putSprite(out, chapelPix(), pr.x, pr.y + 3);
PSHADOW.chapel = (S, pr) => { const X = pr.x * 16, Y = pr.y * 16; shRect(S, X + 2, Y + 47, 66, 3); for (let k = 0; k < 14; k++) shRect(S, X + 68 + k, Y + 6 + k * 1.2, 1, 44 - k * 1.2); };

// ---------------------------------------------------------------- tiled roofs (terracotta, mossy stone slates) and the other five buildings
function tileRoof(p, o) { // a hipped roof of clay tiles or stone slates: staggered courses with rounded ends, ridge tiles, moss
  const { x0, x1, yR, yE, hx = 12, seed = 1, R = PAL.terra, moss = 0.5, ch = 4, tw = 5, ridge = true } = o, eave = (x) => yE + Math.round(wob(x, seed, 0.6));
  for (let x = x0; x <= x1; x++) {
    const bot = eave(x), span = Math.max(1, bot - yR);
    for (let y = yR; y <= bot; y++) {
      const k = bot - y, t = k / span, bl = hx * t; let plane = 0; if (x - x0 < bl) plane = 0.2; else if (x1 - x < bl) plane = -0.28;
      const course = Math.floor(k / ch), j = k % ch, xs = x + (course & 1) * (tw >> 1), ti = Math.floor(xs / tw), tu = (((xs % tw) + tw) % tw);
      let v = 0.52 + plane + (hash(ti, course, seed) - 0.5) * 0.28 + (vnoise(x, y, 9, seed) - 0.5) * 0.12;
      if (j === 0) v += 0.07; if (j === ch - 1) v -= 0.22; if (tu === 0) v -= 0.12; if (j === 0 && (tu === 0 || tu === tw - 1)) v -= 0.2;
      if (ridge && y - yR < 3) v = 0.78 + plane * 0.5 - (y - yR === 2 ? 0.28 : 0) + (x % 4 === 0 ? -0.12 : 0);
      else if ((Math.abs(x - x0 - bl) < 1.1 || Math.abs(x1 - x - bl) < 1.1) && t > 0.1) v = 0.76 + plane * 0.5 + ((x + y) & 1 ? 0.04 : -0.06);
      let c = pick(R, cl(v, 0.04, 1), x, y); if (moss && j > 0 && y - yR > 3 && vnoise(x, y, 8, seed + 3) > 0.7 + (1 - moss) * 0.3 && k < 36) c = pick(PAL.moss, 0.3 + hash(x, y, 8) * 0.35, x, y);
      if (y === bot) c = dk(c, 0.5); p.set(x, y, c);
    }
  }
  return { eave };
}
function banner(p, x, y0, w, h, f) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const notch = j > h - 7 && Math.abs(i - (w - 1) / 2) < (j - (h - 7)) * 0.9 && j > h - 6; if (notch) continue; const wave = Math.round(Math.sin(j * 0.22 + f * 2.1) * 1.1);
  p.set(x + i + wave, y0 + j, i < 1 || i >= w - 1 ? pick(PAL.gold, 0.7, 0, 0) : pick(PAL.red, cl(0.55 + (i < w / 2 ? 0.1 : -0.1) - j * 0.004), 0, 0)); } }
function guildBanner(f) {
  return once('gbanner' + f, () => { const p = new Pix(16, 34);
    for (let x = 0; x < 16; x++) p.set(x, 0, pick(PAL.iron, 0.5, 0, 0)); p.set(0, 1, pick(PAL.iron, 0.5, 0, 0)); p.set(15, 1, pick(PAL.iron, 0.5, 0, 0)); banner(p, 2, 2, 12, 30, f);
    for (let k = 0; k < 11; k++) { p.set(4 + Math.round(k * 0.9) + (f & 1 ? 0 : 0), 8 + k, pick(PAL.gold, 0.95, 0, 0)); p.set(11 - Math.round(k * 0.9), 8 + k, pick(PAL.stone, 0.85, 0, 0)); } // crossed sword and staff
    for (const [dx, dy] of [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]]) p.set(8 + dx, 21 + dy, pick(PAL.gold, 0.95, 0, 0));
    outline(p, 0.4); return canv(p); });
}
function guildHall(b) {
  return once(`vb${b.x},${b.y}`, () => {
    const M = 8, W = b.w * 16 + 2 * M, H = 132, p = new Pix(W, H), yB = H - 1, seed = 41, smoke = [], cx = W / 2;
    // the stone arcade (y 100..131): five round arches on stout piers, a recessed oak door in the middle one
    const BW = (W - 2 * M) / 5;
    for (let y = 100; y <= yB; y++) for (let x = M; x < W - M; x++) { const bi = Math.floor((x - M) / BW), u = (x - M) - bi * BW, dx = u - BW / 2, r = 8.4, open = Math.abs(dx) < r && y > 112 - Math.sqrt(Math.max(0, r * r - dx * dx)) + 1 && y < yB - 4;
      if (open) { const back = y > yB - 12; p.set(x, y, back ? pick(PAL.dry, 0.14 + (y - (yB - 12)) * 0.01, x, y) : pick(PAL.oakT, 0.04 + hash(x, y, 3) * 0.05, x, y)); }
      else { let c = masonryPx(x, y, 100, seed, PAL.dry, 9, 5); const ring = Math.abs(dx) < r + 3 && y > 112 - Math.sqrt(Math.max(0, (r + 3) ** 2 - dx * dx)) - 1 && y < 114; if (ring && y < 112) c = pick(PAL.dry, cl(0.84 - (Math.floor(Math.abs(dx)) % 3 === 0 ? 0.3 : 0) + (dx < 0 ? 0.05 : -0.08)), x, y);
        if (vnoise(x, y * 1.4, 8, seed + 4) > 0.72 && y > 116) c = pick(PAL.moss, 0.3 + hash(x, y, 8) * 0.4, x, y); if (y >= yB - 1) c = dk(c, 0.7); p.set(x, y, c); } }
    for (const [bx, kind] of [[0, 'barrels'], [1, 'bench'], [3, 'sacks'], [4, 'wheel']]) { const ox = M + bx * BW + BW / 2; for (let y = yB - 13; y < yB - 4; y++) for (let x = ox - 5; x <= ox + 5; x++) { if (kind === 'barrels' && (x - ox + 5) % 6 > 4) continue; if (kind === 'bench' && y < yB - 9) continue; if (kind === 'wheel' && Math.abs(Math.hypot(x - ox, y - (yB - 9)) - 4.5) > 1) continue; p.set(x, y, pick(PAL.oakT, 0.22 + hash(x, y, 2) * 0.1, x, y)); } }
    doorAt(p, Math.round(M + 2 * BW + BW / 2 - 6), yB - 3, 12, 18, { frame: PAL.dry, wood: PAL.oakT, step: false });
    for (const x of [M + 2 * BW - 1, M + 3 * BW - 1]) for (let y = yB - 20; y < yB - 14; y++) { p.set(x - 3 + (x > cx ? 6 : 0), y, pick(PAL.iron, 0.3, 0, 0)); }
    for (let x = M - 2; x < W - M + 2; x++) { p.set(x, 98, pick(PAL.dry, 0.9, x, 0)); p.set(x, 99, pick(PAL.dry, 0.3, x, 0)); }
    // the timber hall above (y 62..97): jettied, cream panels between oak posts, three tall lattice windows
    for (let y = 64; y <= 96; y++) for (let x = M - 3; x < W - M + 3; x++) p.set(x, y, pick(PAL.wash, cl(0.78 + (fbm(x * 1.4, y * 1.4, seed) - 0.5) * 0.28 - (y > 92 ? 0.1 : 0)), x, y));
    for (const [wx, ww] of [[26, 12], [cx - 8, 16], [W - 38, 12]]) { lattice(p, Math.round(wx), 72, ww, 14, { seed: wx }); for (let x = Math.round(wx) - 2; x <= wx + ww + 1; x++) p.set(x, 88, pick(PAL.honey, 0.9, x, 0)); }
    const posts = [M - 3, 24, 48, cx - 11, cx + 10, W - 52, W - 28, W - M + 1]; for (const x of posts) oakPost(p, x, 63, 97, 3);
    oakRail(p, M - 3, W - M + 3, 62, 3); oakRail(p, M - 3, W - M + 3, 94, 4); oakRail(p, M - 3, W - M + 3, 83, 2);
    for (const [a, b2] of [[27, 47], [cx + 12, W - 29]]) { braceLine(p, a, 66, b2 - 2, 82); braceLine(p, b2 - 2, 66, a, 82); }
    for (let x = M - 3; x < W - M + 3; x++) { const c = p.get(x, 98); if (cA(c) === 255) p.set(x, 98, dk(c, 0.55)); }
    // the terracotta roof, a louvred cupola on the ridge, a leaning chimney
    const R = tileRoof(p, { x0: 2, x1: W - 3, yR: 26, yE: 66, hx: 22, seed, R: PAL.terra, moss: 0.35 });
    for (let x = 4; x < W - 4; x++) for (let k = 1; k <= 3; k++) { const y = R.eave(x) + k, c = p.get(x, y); if (cA(c) === 255) p.set(x, y, dk(c, 0.6 + k * 0.1)); }
    eyebrow(p, { cx: 34, y: 50, w: 9, seed: seed + 2, R: PAL.terra }); eyebrow(p, { cx: W - 34, y: 50, w: 9, seed: seed + 3, R: PAL.terra });
    for (let y = 6; y < 26; y++) for (let x = cx - 9; x <= cx + 9; x++) { const ox = Math.abs(x - cx); if (y < 14) { const hw = 2 + (y - 6) * 1.0; if (ox > hw) continue; p.set(x, y, pick(PAL.terra, cl(0.55 + (x < cx ? 0.12 : -0.14) - (y % 3 === 0 ? 0.2 : 0)), x, y)); } else if (y < 24) { if (ox > 8) continue; p.set(x, y, ox > 6 || ox < 1 ? pick(PAL.oakT, 0.55 - (x > cx ? 0.2 : 0), x, y) : y % 3 === 0 ? pick(PAL.oakT, 0.5, x, y) : pick(PAL.oakT, 0.06, x, y)); } else p.set(x, y, pick(PAL.oakT, 0.6, x, y)); }
    for (let y = 0; y < 8; y++) p.set(cx, y, pick(PAL.iron, 0.5, 0, 0)); for (let x = cx - 3; x <= cx + 3; x++) p.set(x, 3, pick(PAL.iron, 0.5, 0, 0)); for (let k = 0; k < 4; k++) p.set(cx + 3 + k, 3 - (k > 1 ? 1 : 0), pick(PAL.gold, 0.9, 0, 0));
    smoke.push(chimney(p, W - 30, 22, 48, { lean: -1, w: 9, R: PAL.honey }));
    rim(p, 0.42, 'tl'); const c = canv(p); c.dx = -M / 16; c.smoke = smoke; return c;
  });
}
function generalStore(b) {
  return once(`vb${b.x},${b.y}`, () => {
    const M = 8, W = b.w * 16 + 2 * M, H = 92, p = new Pix(W, H), yB = H - 1, seed = 53, smoke = [], wallTop = yB - 31;
    cob(p, M, W - M - 1, wallTop, yB - 7, seed); masonry(p, M, W - M - 1, yB - 6, yB, seed + 1, PAL.honey, 9, 3);
    for (const x of [M, W - M - 3]) { for (let y = wallTop; y <= yB; y++) for (let i = 0; i < 3; i++) p.set(x + i, y, masonryPx(x + i, y, wallTop, seed + 8, PAL.honey, 6, 5)); } // quoins
    oakRail(p, M, W - M - 1, wallTop + 1, 2);
    // the big bow window: three glowing facets over an oak bulkhead, a little roof over it, wares on the sill
    const bx = M + 8, bw = 36; for (let y = yB - 26; y < yB - 7; y++) for (let x = bx; x < bx + bw; x++) { const fac = x < bx + 8 ? 0 : x >= bx + bw - 8 ? 2 : 1, u = (x - bx) / bw - 0.5, v = (y - (yB - 26)) / 19 - 0.5; let g = 0.86 - Math.hypot(u * 1.1, v * 1.3) * 0.8 - (fac === 2 ? 0.12 : fac === 0 ? 0.0 : 0.02);
      let c = pick(PAL.glow, cl(g), x, y); const a = (x - bx) % 6, bb = (y - (yB - 26)) % 6; if (a === 0 || bb === 0) c = dk(c, 0.45); if ((x === bx + 8 || x === bx + bw - 8)) c = pick(PAL.oakT, 0.5, x, y); p.set(x, y, c); }
    for (let x = bx - 2; x <= bx + bw + 1; x++) { p.set(x, yB - 27, pick(PAL.oakT, 0.66, x, 0)); p.set(x, yB - 26, pick(PAL.oakT, 0.3, x, 0)); for (let y = yB - 8; y < yB - 3; y++) p.set(x, y, pick(PAL.oakT, 0.52 - (y - yB + 8) * 0.05 - ((x - bx) % 12 === 0 ? 0.2 : 0), x, y)); }
    for (let x = bx - 3; x <= bx + bw + 2; x++) { p.set(x, yB - 9, pick(PAL.honey, 0.92, x, 0)); }
    for (let k = 0; k < 7; k++) { const x = bx + 3 + k * 5; if (k % 3 === 0) blob(p, x, yB - 12, 2.3, PAL.red, { seed: k, amb: 0.2 }); else if (k % 3 === 1) { for (let y = yB - 16; y < yB - 10; y++) for (let i = 0; i < 3; i++) p.set(x + i, y, pick(PAL.glass || PAL.cloth, 0.6 - i * 0.1, 0, 0)); } else { for (let y = yB - 14; y < yB - 10; y++) for (let i = 0; i < 4; i++) p.set(x + i, y, pick(PAL.gold, 0.8 - i * 0.12, 0, 0)); } } // apples, jars and loaves
    for (let y = 0; y < 5; y++) for (let x = bx - 4 + y; x < bx + bw + 4 - y; x++) p.set(x, yB - 31 + y, pick(PAL.terra, cl(0.62 - y * 0.06 + (x < bx + bw / 2 ? 0.1 : -0.1)), x, y)); // pentice roof over the bow
    for (let x = bx - 4; x < bx + bw + 4; x++) p.set(x, yB - 26, dk(p.get(x, yB - 26), 0.8));
    doorAt(p, 59, yB - 2, 11, 20, { frame: PAL.honey, wood: PAL.oakT, step: true });
    lattice(p, 78, yB - 24, 7, 12, { box: true, shut: PAL.green, seed: 5 });
    // a little hanging sign (a purse of coins) on an iron arm
    for (let x = 72; x < 78; x++) p.set(x, yB - 26, pick(PAL.iron, 0.5, 0, 0)); for (let y = yB - 25; y < yB - 22; y++) { p.set(73, y, pk('#3a3a44')); p.set(77, y, pk('#3a3a44')); }
    for (let y = yB - 22; y < yB - 12; y++) for (let x = 72; x < 79; x++) p.set(x, y, x === 72 || x === 78 || y === yB - 22 || y === yB - 13 ? pick(PAL.wood, 0.3, 0, 0) : pick(PAL.blue, 0.55, 0, 0)); blob(p, 75, yB - 17, 2.2, PAL.gold, { amb: 0.3 }); p.set(75, yB - 21, pick(PAL.gold, 0.9, 0, 0));
    climber(p, W - M - 8, yB - 28, 10, 22, 4);
    const R = tileRoof(p, { x0: 2, x1: W - 3, yR: 30, yE: wallTop + 3, hx: 14, seed, R: PAL.terra, moss: 0.5 });
    for (let x = 4; x < W - 4; x++) for (let k = 1; k <= 3; k++) { const y = R.eave(x) + k, c = p.get(x, y); if (cA(c) === 255) p.set(x, y, dk(c, 0.6 + k * 0.1)); }
    eyebrow(p, { cx: 50, y: 52, w: 8, seed: seed + 2, R: PAL.terra });
    smoke.push(chimney(p, 17, 22, 50, { lean: 1, w: 8, R: PAL.honey }));
    rim(p, 0.42, 'tl'); const c = canv(p); c.dx = -M / 16; c.smoke = smoke; return c;
  });
}
function oldForge(b) {
  return once(`vb${b.x},${b.y}`, () => {
    const M = 8, W = b.w * 16 + 2 * M, H = 136, p = new Pix(W, H), yB = H - 1, seed = 67, smoke = [], wallTop = yB - 32;
    for (let y = wallTop; y <= yB; y++) for (let x = M; x < W - M; x++) { let c = masonryPx(x, y, wallTop, seed, PAL.honey, 10, 5); c = dk(c, 0.86 - (y < wallTop + 12 ? 0.04 : 0)); if (vnoise(x * 1.2, y * 0.3, 7, seed + 2) > 0.62 && y < yB - 10) c = dk(c, 0.7); p.set(x, y, c); } // soot-stained stone
    oakRail(p, M, W - M - 1, wallTop + 1, 3);
    // the forge mouth: a wide arch with the fire glowing inside, an anvil in the dark
    const fx = 21, fw = 28; for (let y = yB - 26; y <= yB - 1; y++) for (let x = fx; x < fx + fw; x++) { const dx = x + 0.5 - (fx + fw / 2), top = yB - 26 + 8 - Math.sqrt(Math.max(0, 14 * 14 - dx * dx)) * 0.6; if (y < top) continue;
      const u = Math.hypot(dx / 14, (y - (yB - 8)) / 18); p.set(x, y, u < 0.8 ? pick(PAL.glow, cl(0.95 - u * 0.5 + (hash(x, y, 3) - 0.5) * 0.1), x, y) : pick(PAL.oakT, 0.06, x, y)); }
    for (let x = fx + 8; x < fx + 20; x++) for (let y = yB - 8; y < yB - 4; y++) p.set(x, y, pick(PAL.iron, cl(0.35 + (y === yB - 8 ? 0.2 : 0)), x, y)); for (let y = yB - 4; y < yB - 1; y++) for (let x = fx + 12; x < fx + 17; x++) p.set(x, y, pick(PAL.iron, 0.25, 0, 0)); // the anvil
    for (let x = fx - 3; x < fx + fw + 3; x++) { for (let j = 0; j < 4; j++) p.set(x, yB - 30 + j, pick(PAL.dry, 0.85 - j * 0.12, x, 0)); } for (let y = yB - 26; y < yB; y++) { p.set(fx - 3, y, pick(PAL.dry, 0.7, 0, 0)); p.set(fx - 2, y, pick(PAL.dry, 0.5, 0, 0)); p.set(fx + fw + 1, y, pick(PAL.dry, 0.3, 0, 0)); p.set(fx + fw + 2, y, pick(PAL.dry, 0.2, 0, 0)); }
    for (let y = yB - 40; y < yB - 30; y++) for (let x = fx + 2; x < fx + fw - 2; x++) if (hash(x, y, 3) < 0.5 * (1 - (yB - 30 - y) / 10)) p.set(x, y, dk(p.get(x, y), 0.6)); // soot above the mouth
    for (const hx of [60, 70]) { for (let a = 0; a < 7; a++) { const ang = a / 6 * Math.PI - 0.4; p.set(hx + Math.round(Math.cos(ang) * 4), yB - 28 + Math.round(Math.sin(ang) * 4), pick(PAL.iron, 0.55, 0, 0)); } } // horseshoes
    lattice(p, 84, yB - 24, 7, 10, { seed: 9 });
    for (let y = yB - 20; y < yB - 8; y++) { p.set(96, y, pick(PAL.iron, 0.5, 0, 0)); } for (let k = 0; k < 4; k++) p.set(95 + k, yB - 20 + k, pick(PAL.iron, 0.55, 0, 0)); // a hammer on a hook
    // the mossy slate roof and the tall chimney of the Old Forge
    const R = tileRoof(p, { x0: 2, x1: W - 3, yR: 76, yE: wallTop + 4, hx: 14, seed, R: PAL.slateM, moss: 0.8, ch: 5, tw: 7 });
    for (let x = 4; x < W - 4; x++) for (let k = 1; k <= 3; k++) { const y = R.eave(x) + k, c = p.get(x, y); if (cA(c) === 255) p.set(x, y, dk(c, 0.6 + k * 0.1)); }
    // the stack: wide, tapering, with a flared hood and two pots; blackened at the top
    for (let y = 14; y <= 86; y++) { const t = (y - 14) / 72, hw = 6 + t * 2.6, ccx = 30 + (1 - t) * 0.5; for (let x = Math.floor(ccx - hw); x <= ccx + hw - 0.5; x++) { let c = masonryPx(x, y, 14, seed + 5, PAL.honey, 8, 5); const u = (x + 0.5 - ccx) / hw; c = dk(c, 0.78 + (u < -0.5 ? 0.2 : u > 0.5 ? -0.12 : 0)); if (y < 30) c = dk(c, 0.55 + (y - 14) * 0.02); p.set(x, y, c); } }
    for (let x = 20; x <= 41; x++) { for (let j = 0; j < 3; j++) p.set(x, 12 + j, pick(PAL.dry, 0.8 - j * 0.18, x, 0)); } for (let k = 0; k < 2; k++) for (let y = 6; y < 12; y++) for (let i = 0; i < 3; i++) p.set(24 + k * 8 + i, y, pick(PAL.terra, 0.7 - i * 0.2, 0, 0));
    smoke.push([30, 5]);
    rim(p, 0.42, 'tl'); const c = canv(p); c.dx = -M / 16; c.smoke = smoke; return c;
  });
}
function fisherCottage(b) {
  return once(`vb${b.x},${b.y}`, () => {
    const M = 8, W = b.w * 16 + 2 * M, H = 100, p = new Pix(W, H), yB = H - 1, seed = 71, smoke = [], wallTop = yB - 29;
    cob(p, M, W - M - 1, wallTop, yB - 6, seed); masonry(p, M, W - M - 1, yB - 5, yB, seed + 1, PAL.honey, 9, 3);
    oakRail(p, M, W - M - 1, wallTop + 1, 2); oakRail(p, M, W - M - 1, yB - 8, 2); for (const x of [M, 38, 64, W - M - 2]) oakPost(p, x, wallTop + 1, yB - 7);
    lattice(p, 19, yB - 22, 9, 11, { box: true, shut: PAL.green, seed: 2 }); doorAt(p, 43, yB - 2, 11, 20, { frame: PAL.honey, wood: PAL.oakT, step: true }); lattice(p, 69, yB - 21, 6, 9, { shut: PAL.green, seed: 3 });
    // a net hung to dry on a pole, corks along its top, and a wicker lobster pot
    for (let x = 60; x < 80; x++) p.set(x, yB - 24, pick(PAL.wood, 0.6, x, 0)); for (let y = yB - 23; y < yB - 8; y++) for (let x = 62; x < 79; x++) if (((x + y) % 4 === 0 || (x - y + 200) % 4 === 0) && hash(x, y, 7) < 0.9) p.set(x, y, pk(y > yB - 16 ? '#6a6450' : '#9a9478'));
    for (let x = 63; x < 79; x += 3) { p.set(x, yB - 23, pk('#d0603c')); p.set(x + 1, yB - 23, pk('#a04028')); }
    blob(p, 14, yB - 4, 5.5, PAL.reed, { sq: 0.9, amb: 0.3, rimDark: 0.2 }); for (let k = 0; k < 6; k++) { p.set(9 + k * 2, yB - 8, pick(PAL.reed, 0.4, 0, 0)); }
    climber(p, M - 2, yB - 28, 10, 22, 6);
    const R = thatch(p, { x0: 2, x1: W - 3, yR: 34, yE: wallTop + 3, hx: 13, sag: 2, hem: 7, seed, R: PAL.reed, moss: 0.7 });
    eyebrow(p, { cx: 30, y: 56, w: 8, seed: seed + 2, R: PAL.reed });
    eaveShadow(p, 4, W - 5, R.eave, 4);
    smoke.push(chimney(p, 66, 26, 56, { lean: 1.2, w: 8 }));
    rim(p, 0.42, 'tl'); const c = canv(p); c.dx = -M / 16; c.smoke = smoke; return c;
  });
}
function elderHouse(b) {
  return once(`vb${b.x},${b.y}`, () => {
    const M = 8, W = b.w * 16 + 2 * M, H = 124, p = new Pix(W, H), yB = H - 1, seed = 83, smoke = [], wallTop = yB - 30, tcx = 24, tr = 15;
    // the main block: honey stone, a steep mossy slate roof
    for (let y = wallTop; y <= yB; y++) for (let x = 36; x < W - M; x++) p.set(x, y, dk(masonryPx(x, y, wallTop, seed, PAL.honey, 10, 5), 0.95));
    lattice(p, 66, yB - 24, 8, 12, { box: true, shut: PAL.red, seed: 3 }); doorAt(p, 46, yB - 2, 11, 20, { frame: PAL.honey, wood: PAL.oakT, step: true });
    lattice(p, 80, yB - 22, 6, 9, { shut: PAL.red, seed: 4 });
    const R = tileRoof(p, { x0: 34, x1: W - 3, yR: 58, yE: wallTop + 3, hx: 12, seed, R: PAL.slateM, moss: 0.8, ch: 5, tw: 7 });
    for (let x = 36; x < W - 4; x++) for (let k = 1; k <= 3; k++) { const y = R.eave(x) + k, c = p.get(x, y); if (cA(c) === 255) p.set(x, y, dk(c, 0.6 + k * 0.1)); }
    smoke.push(chimney(p, 70, 36, 66, { lean: -1, w: 9, R: PAL.honey }));
    // the round tower: a stone drum thick with ivy, arrow slits, and a terracotta cone
    for (let y = 48; y <= yB; y++) for (let x = tcx - tr; x <= tcx + tr - 1; x++) { const u = (x + 0.5 - tcx) / tr; if (Math.abs(u) > 1) continue; let c = masonryPx(x, y, 48, seed + 9, PAL.honey, 9, 5); c = dk(c, 0.62 + 0.4 * cl(0.78 - u * 0.62)); if (y >= yB - 1) c = dk(c, 0.7); p.set(x, y, c); }
    for (const [sy, sx] of [[66, 0], [92, 3]]) for (let y = sy; y < sy + 9; y++) { p.set(tcx + sx, y, pk('#120a06')); p.set(tcx + sx + 1, y, pk('#120a06')); p.set(tcx + sx - 1, y, pick(PAL.honey, 0.8, 0, 0)); }
    for (let k = 0; k < 60; k++) { const y = 54 + Math.floor(hash(k, 1, 2) * 64), x = tcx - tr + 1 + Math.floor(hash(k, 2, 2) * (tr * 2 - 3)), left = (x - tcx) < 4 ? 1 : 0.5; if (hash(k, 3, 2) < 0.4 + left * 0.4 + (y > 90 ? 0.2 : 0)) blob(p, x, y, 2.9 + hash(k, 4, 2), PAL.ivy, { seed: k, amb: 0.2, rimDark: 0.2 }); }
    for (let y = 8; y <= 48; y++) { const hw = 20 * (y - 8) / 40 + 0.6; for (let x = Math.floor(tcx - hw); x <= tcx + hw - 0.5; x++) { const k = 48 - y, course = Math.floor(k / 3), j = k % 3, xs = x + (course & 1) * 2, bu = ((xs % 4) + 4) % 4; let v = 0.52 + (hash(Math.floor(xs / 4), course, seed) - 0.5) * 0.26 + (x < tcx ? 0.1 : -0.14) - (j === 0 ? 0.22 : 0) - (bu === 0 ? 0.1 : 0); p.set(x, y, pick(PAL.terra, cl(v), x, y)); } }
    for (let y = 4; y < 10; y++) p.set(tcx, y, pick(PAL.gold, 0.8, 0, 0)); p.set(tcx - 1, 4, pick(PAL.gold, 0.9, 0, 0)); p.set(tcx + 1, 4, pick(PAL.gold, 0.9, 0, 0));
    for (let x = tcx - 17; x <= tcx + 16; x++) { p.set(x, 47, pick(PAL.oakT, 0.62, x, 0)); p.set(x, 48, pick(PAL.oakT, 0.26, x, 0)); }
    climber(p, 38, yB - 28, 8, 24, 8, true);
    rim(p, 0.42, 'tl'); const c = canv(p); c.dx = -M / 16; c.smoke = smoke; return c;
  });
}
VPROP.guildbanner = (pr, m, t, out) => out.push({ img: guildBanner(Math.floor(t * 2.4 + pr.x) % 3), x: pr.x, y: pr.y, z: 1, sy: pr.y + 3.2 });
// sparks and soot from the forge chimney
VPROP.sparks = (pr, m, t, out) => { for (let i = 0; i < 6; i++) { const u = (t * 0.9 + i / 6) % 1, x = pr.x + Math.sin(u * 7 + i * 2) * 0.35 + u * 0.4, y = pr.y - u * 1.6;
  out.push({ draw: (ctx, X, Y, TS) => { const q = TS / 16; ctx.fillStyle = u < 0.5 ? '#ffd060' : '#e8801c'; ctx.globalAlpha = 1 - u * 0.9; ctx.fillRect(Math.round(X), Math.round(Y), Math.round(q * (u < 0.3 ? 2 : 1)), Math.round(q * (u < 0.3 ? 2 : 1))); ctx.globalAlpha = 1; }, x, y, w: 0.1, h: 0.1, z: 2 }); } };
// ---------------------------------------------------------------- village sprites: buildings, props, life
function stubBuilding(b) { // placeholder art until each building has its own
  return once(`vb${b.x},${b.y}`, () => { const w = b.w * 16, h = (b.h + 3) * 16, p = new Pix(w, h), yB = h - 1, yE = h - b.h * 16 + 4;
    for (let y = yE; y <= yB; y++) for (let x = 1; x < w - 1; x++) p.set(x, y, pick(PAL.wash, 0.7 + (hash(x, y, 3) - 0.5) * 0.1, x, y));
    for (let y = 2; y <= yE; y++) { const ins = Math.max(0, (yE - y) * 0.35); for (let x = Math.floor(ins); x < w - ins; x++) p.set(x, y, pick(PAL.thatchG, 0.55 + (hash(x >> 2, y >> 2, 4) - 0.5) * 0.3, x, y)); }
    p.rect(b.door * 16 + 3, yB - 14, 10, 15, pick(PAL.oakT, 0.5, 0, 0)); rim(p, 0.4, 'tlr'); return canv(p); });
}
const VBUILD = { haven_inn: gooseInn, haven_guild: guildHall, haven_shop: generalStore, haven_smith: oldForge, haven_cottage: fisherCottage, haven_elder: elderHouse };
function villageBuildingPix(b) { return (VBUILD[b.to] || stubBuilding)(b); }
function villageProp(pr, m, t, out) { VPROP[pr.k]?.(pr, m, t, out); }
function villageObjects(m, t, out) {
  const s = mapState(m), G = s.g;
  out.push({ x: -MG, y: -MG, w: 1, h: 1, z: 0, draw: (ctx, X, Y, TS) => { const k = TS / 16, sx0 = Math.max(0, Math.floor(-X / k)), sy0 = Math.max(0, Math.floor(-Y / k)), sw = Math.min(G.GW - sx0, Math.ceil(ctx.canvas.width / k) + 2), sh = Math.min(G.GH - sy0, Math.ceil(ctx.canvas.height / k) + 2); if (sw > 0 && sh > 0) ctx.drawImage(G.cv, sx0, sy0, sw, sh, X + sx0 * k, Y + sy0 * k, sw * k, sh * k); } });
  for (const b of m.buildings || []) {
    const img = villageBuildingPix(b), bx = b.x + (img.dx || 0), by = b.y + b.h - img.height / 16 + (img.dy || 0);
    out.push({ img, x: bx, y: by, z: 1, sy: b.y + b.h });
    for (const [i, [sx, sy]] of (img.smoke || []).entries()) for (let n = 0; n < 3; n++) { const u = (t * 0.3 + n / 3 + (b.x + i * 7) * 0.13) % 1, k = Math.min(4, Math.floor(u * 5)); out.push({ img: puffPix(k), x: bx + sx / 16 - 0.375 + u * 0.55 + Math.sin(u * 5 + b.x + i) * 0.12, y: by + sy / 16 - 0.4 - u * 1.4, z: 2 }); }
    if (b.kind === 'inn') out.push({ img: gooseSign(Math.floor(t * 0.9) % 2), x: b.x + 5.75, y: b.y + b.h - 2.2, z: 1, sy: b.y + b.h + 0.05 });
  }
  for (const pr of m.props || []) villageProp(pr, m, t, out);
}

// VB>>
