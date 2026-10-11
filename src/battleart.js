// ===== 16-bit battle art: shaded-primitive sprite engine, side-view party, large enemies, painted backdrops =====
// Everything is generated in code and cached. Sprites are modelled as shaded primitives (ellipsoids, tapered
// capsules, bevelled polygons) that are z-buffered, lit from the upper left, quantised onto hue-shifted
// 3-6 tone ramps with a little ordered dither, creased where parts overlap, rim-lit and outlined (sel-out).
// Small details (faces, eyes, teeth, trims) are stamped as pixels on top.
import { HERO_STYLE } from './sprites.js';

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export function rng(seed) { let a = seed | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
export function hash(x, y, s = 0) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y, s = 0) { // smooth value noise
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash(xi, yi, s), hash(xi + 1, yi, s), u), lerp(hash(xi, yi + 1, s), hash(xi + 1, yi + 1, s), u), v);
}
export function fbm(x, y, s = 0, oct = 3) { let a = 0, amp = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { a += vnoise(x * f, y * f, s + i * 17) * amp; n += amp; amp *= 0.5; f *= 2; } return a / n; }

// ---------- colour ----------
export function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = [...h].map((c) => c + c).join(''); const n = parseInt(h, 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
export const rgb2hex = ([r, g, b]) => '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
function rgb2hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return [h, s, l];
}
function hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360; if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
const toward = (h, target, deg) => { let d = ((target - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), deg); };
export const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex([lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)]); };
export const shade = (hex, f) => { const [r, g, b] = hex2rgb(hex); return rgb2hex([r * f, g * f, b * f]); };
// Hue-shifted ramp, dark -> light. Shadows drift toward blue/violet, lights toward warm yellow (classic SNES ramps).
export function ramp(hex, n = 5, o = {}) {
  const lo = o.lo ?? 0.3, hi = o.hi ?? 0.55, hs = o.hs ?? 1, [h, s, l] = rgb2hsl(hex2rgb(hex)), mid = o.mid ?? Math.round((n - 1) * 0.55), out = [];
  for (let i = 0; i < n; i++) {
    let L = l, H = h, S = s;
    if (i < mid) { const k = (mid - i) / mid; L = l * (1 - k * (1 - lo)); H = toward(h, o.cold ?? 250, 26 * k * hs); S = clamp(Math.max(s * (1 + 0.18 * k), 0.14 * k), 0, 1); }
    else if (i > mid) { const k = (i - mid) / (n - 1 - mid); L = l + (1 - l) * k * hi; H = toward(h, o.warm ?? 52, 16 * k * hs); S = clamp(s * (1 - 0.22 * k), 0, 1); }
    out.push(rgb2hex(hsl2rgb(H, S, L)));
  }
  return out;
}
const RAMP_CACHE = new Map();
const R = (hex, n = 5, o) => { const k = hex + n + JSON.stringify(o || 0); if (!RAMP_CACHE.has(k)) RAMP_CACHE.set(k, ramp(hex, n, o)); return RAMP_CACHE.get(k); };
export { R as rampOf };

// ---------- primitive parts ----------
// Every part: { m: material, z: depth offset, mode: undefined|'cut'|'paint', bb: [x0,y0,x1,y1], f(px,py,hit) }
// f fills hit.h (height above its base plane), hit.nx/ny/nz (unit normal) and returns true when (px,py) is inside.
export function ell(x, y, rx, ry, m, o = {}) {
  const rot = o.rot || 0, c = Math.cos(rot), s = Math.sin(rot), d = (o.d ?? 1) * Math.min(rx, ry), Rr = Math.max(rx, ry);
  return { m, z: o.z || 0, mode: o.mode, tag: o.tag, bb: [Math.floor(x - Rr - 1), Math.floor(y - Rr - 1), Math.ceil(x + Rr + 1), Math.ceil(y + Rr + 1)],
    f(px, py, hit) {
      const dx = px - x, dy = py - y, u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry, q = u * u + v * v; if (q > 1) return false;
      const nz = Math.sqrt(1 - q), ax = u / rx, ay = v / ry, az = nz / d, nx = ax * c - ay * s, ny = ax * s + ay * c, l = Math.hypot(nx, ny, az) || 1;
      hit.nx = nx / l; hit.ny = ny / l; hit.nz = az / l; hit.h = nz * d; return true;
    } };
}
export function cap(x1, y1, x2, y2, r1, r2, m, o = {}) {
  const vx = x2 - x1, vy = y2 - y1, L2 = vx * vx + vy * vy || 1e-6, d = o.d ?? 1, Rr = Math.max(r1, r2);
  return { m, z: o.z || 0, mode: o.mode, tag: o.tag, bb: [Math.floor(Math.min(x1, x2) - Rr - 1), Math.floor(Math.min(y1, y2) - Rr - 1), Math.ceil(Math.max(x1, x2) + Rr + 1), Math.ceil(Math.max(y1, y2) + Rr + 1)],
    f(px, py, hit) {
      const t = clamp(((px - x1) * vx + (py - y1) * vy) / L2, 0, 1), r = r1 + (r2 - r1) * t, dx = px - (x1 + vx * t), dy = py - (y1 + vy * t), s2 = dx * dx + dy * dy;
      if (s2 > r * r) return false; const nz = Math.sqrt(r * r - s2), l = Math.hypot(dx, dy, nz / d) || 1;
      hit.nx = dx / l; hit.ny = dy / l; hit.nz = nz / d / l; hit.h = nz * d; return true;
    } };
}
// polygon with a bevelled rim; o.tilt = [tx,ty] tilts the flat face (faceted rocks/crystals/armour plates)
export function poly(pts, m, o = {}) {
  const bev = o.bev ?? 1.6, tx = o.tilt ? o.tilt[0] : 0, ty = o.tilt ? o.tilt[1] : 0, d = o.d ?? 1;
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { m, z: o.z || 0, mode: o.mode, tag: o.tag, bb: [Math.floor(Math.min(...xs)) - 1, Math.floor(Math.min(...ys)) - 1, Math.ceil(Math.max(...xs)) + 1, Math.ceil(Math.max(...ys)) + 1],
    f(px, py, hit) {
      let inside = false, best = 1e9, ox = 0, oy = 0;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
        const ex = xj - xi, ey = yj - yi, t = clamp(((px - xi) * ex + (py - yi) * ey) / (ex * ex + ey * ey || 1e-6), 0, 1), cx = xi + ex * t, cy = yi + ey * t, dd = Math.hypot(px - cx, py - cy);
        if (dd < best) { best = dd; ox = cx - px; oy = cy - py; }
      }
      if (!inside) return false;
      let nx = tx, ny = ty, nz = 1;
      if (best < bev) { const k = (1 - best / bev) * 1.1, l = best || 1; nx += (ox / l) * k; ny += (oy / l) * k; }
      const l = Math.hypot(nx, ny, nz); hit.nx = nx / l; hit.ny = ny / l; hit.nz = nz / l; hit.h = Math.min(best, bev) * d; return true;
    } };
}
export const cut = (p) => ((p.mode = 'cut'), p);
export const paint = (p) => ((p.mode = 'paint'), p);

// ---------- renderer ----------
const BBOX = new WeakMap(); // tight opaque boxes recorded at render time (no canvas readbacks)
const LDIR = (() => { const l = Math.hypot(-0.52, -0.62, 0.58); return [-0.52 / l, -0.62 / l, 0.58 / l]; })();
// spec: { w, h, mats: { name: { r: ramp[], tex?(x,y,hit)->dv, spec?:hex, glow?:bool } }, parts: [], post?(api), outline?: false|hex, rim?: bool, light?: [x,y,z] }
export function render(spec) {
  const { w, h } = spec, N = w * h, names = Object.keys(spec.mats), mats = names.map((k) => spec.mats[k]), mIdx = Object.fromEntries(names.map((k, i) => [k, i]));
  const MI = new Int16Array(N).fill(-1), HT = new Float32Array(N).fill(-1e9), NX = new Float32Array(N), NY = new Float32Array(N), NZ = new Float32Array(N), PT = new Int16Array(N).fill(-1);
  const hit = { h: 0, nx: 0, ny: 0, nz: 1 }, L = spec.light || LDIR;
  spec.parts.forEach((p, pi) => {
    if (!p) return; const mi = p.m != null ? mIdx[p.m] : -1; if (p.m != null && mi === undefined) throw new Error('battleart: unknown material ' + p.m);
    const [x0, y0, x1, y1] = p.bb;
    for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) {
      if (!p.f(x + 0.5, y + 0.5, hit)) continue; const i = y * w + x;
      if (p.mode === 'cut') { MI[i] = -1; HT[i] = -1e9; PT[i] = -1; continue; }
      if (p.mode === 'paint') { if (MI[i] >= 0) MI[i] = mi; continue; }
      const H = hit.h + p.z; if (H > HT[i]) { HT[i] = H; MI[i] = mi; NX[i] = hit.nx; NY[i] = hit.ny; NZ[i] = hit.nz; PT[i] = pi; }
    }
  });
  const rgbs = mats.map((m) => m.r.map(hex2rgb)), img = new Uint8ClampedArray(N * 4), OL = new Array(N);
  const crease = spec.crease ?? 1.4;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, mi = MI[i]; if (mi < 0) continue;
    const mat = mats[mi], rr = rgbs[mi], n = rr.length, lum = NX[i] * L[0] + NY[i] * L[1] + NZ[i] * L[2];
    let v = mat.flat ?? 0.16 + 0.8 * Math.max(lum, -0.25) + (mat.lift || 0);
    if (mat.tex) v += mat.tex(x, y, NX[i], NY[i], HT[i]);
    let edge = false, rimSide = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) { edge = true; continue; }
      const j = yy * w + xx; if (MI[j] < 0) { edge = true; if (dx > 0 || dy > 0) rimSide = true; continue; }
      if (PT[j] !== PT[i] && HT[j] > HT[i] + crease && !mat.nocrease) v -= 0.34;
    }
    let f = clamp(v, 0, 0.999) * (n - 1), b = Math.floor(f); if (f - b > (spec.dither === false ? 0.5 : 0.38 + 0.24 * bayer(x, y))) b++;
    if (spec.rim !== false && edge && rimSide && lum < 0.3 && !mat.glow) b = Math.max(b, Math.min(n - 1, Math.round((n - 1) * 0.6)));
    b = clamp(b, 0, n - 1);
    let c = rr[b]; if (mat.spec && lum > (mat.specAt ?? 0.92)) c = hex2rgb(mat.spec);
    img.set([c[0], c[1], c[2], 255], i * 4); OL[i] = rr[0];
  }
  const api = {
    w, h, img,
    px(x, y, col, ol) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= w || y >= h) return; const c = typeof col === 'string' ? hex2rgb(col) : col, i = y * w + x; img.set([c[0], c[1], c[2], 255], i * 4); OL[i] = ol ? hex2rgb(ol) : OL[i] || c.map((v) => v * 0.4); },
    clear(x, y) { if (x < 0 || y < 0 || x >= w || y >= h) return; img[(y * w + x) * 4 + 3] = 0; },
    on(x, y) { return x >= 0 && y >= 0 && x < w && y < h && img[(y * w + x) * 4 + 3] > 0; },
    mat(x, y) { return x >= 0 && y >= 0 && x < w && y < h && MI[y * w + x] >= 0 ? names[MI[y * w + x]] : null; },
    rect(x, y, ww, hh, col) { for (let j = 0; j < hh; j++) for (let k = 0; k < ww; k++) api.px(x + k, y + j, col); },
    line(x0, y0, x1, y1, col) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let k = 0; k <= n; k++) api.px(Math.round(lerp(x0, x1, k / n)), Math.round(lerp(y0, y1, k / n)), col); },
    stamp(rows, pal, ox, oy, flip = false) { rows.forEach((row, y) => [...row].forEach((ch, x) => { const c = pal[ch]; if (ch !== '.' && c) api.px(ox + (flip ? row.length - 1 - x : x), oy + y, c, pal._ol); })); },
    ramp: (name, i) => spec.mats[name].r[clamp(i < 0 ? spec.mats[name].r.length + i : i, 0, spec.mats[name].r.length - 1)],
  };
  if (spec.post) spec.post(api);
  if (spec.outline !== false) { // sel-out: outline in the darkest tone of the touching material, a touch lighter on the lit (top-left) side
    const A = new Uint8Array(N); for (let i = 0; i < N; i++) A[i] = img[i * 4 + 3];
    const fixed = spec.outline ? hex2rgb(spec.outline) : null;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (A[i]) continue; let src = -1, lit = false;
      if (x + 1 < w && A[i + 1]) { src = i + 1; lit = true; } else if (y + 1 < h && A[i + w]) { src = i + w; lit = true; } else if (x > 0 && A[i - 1]) src = i - 1; else if (y > 0 && A[i - w]) src = i - w;
      if (src < 0) continue; const base = fixed || OL[src] || [20, 16, 28], k = lit ? 0.62 : 0.42;
      img.set([base[0] * k + 6, base[1] * k + 4, base[2] * k + 10, 255], i * 4);
    }
  }
  if (spec.tint) for (let i = 0; i < N * 4; i += 4) { const g = img[i] * 0.3 + img[i + 1] * 0.59 + img[i + 2] * 0.11; img[i] = lerp(img[i], g, spec.tint) * 0.86; img[i + 1] = lerp(img[i + 1], g, spec.tint) * 0.86; img[i + 2] = lerp(img[i + 2], g, spec.tint) * 0.95; }
  const c = mk(w, h); c.getContext('2d').putImageData(new ImageData(img, w, h), 0, 0);
  let x0 = w, y0 = h, x1 = -1, y1 = -1; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (img[(y * w + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  BBOX.set(c, x1 < 0 ? [0, 0, w - 1, h - 1] : [x0, y0, x1, y1]); return c;
}

// ---------- canvas helpers ----------
export function flipX(src) { const c = mk(src.width, src.height), x = c.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c; }
export function rot90(src, ccw = true) { // pixel-exact quarter turn
  const c = mk(src.height, src.width), x = c.getContext('2d'); x.setTransform(0, ccw ? -1 : 1, ccw ? 1 : -1, 0, ccw ? 0 : c.width, ccw ? c.height : 0); x.drawImage(src, 0, 0); return c;
}
export function bbox(src) { // tight box of opaque pixels: [x0,y0,x1,y1]
  if (BBOX.has(src)) return BBOX.get(src);
  const tmp = mk(src.width, src.height), tx = tmp.getContext('2d', { willReadFrequently: true }); tx.drawImage(src, 0, 0); const d = tx.getImageData(0, 0, src.width, src.height).data; // fallback for canvases not made by render() let x0 = src.width, y0 = src.height, x1 = -1, y1 = -1;
  for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) if (d[(y * src.width + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const b = x1 < 0 ? [0, 0, src.width - 1, src.height - 1] : [x0, y0, x1, y1]; BBOX.set(src, b); return b;
}
export function toURL(canvas, scale) { const c = mk(canvas.width * scale, canvas.height * scale), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(canvas, 0, 0, c.width, c.height); return c.toDataURL(); }

// =====================================================================
// ===== Party: 16x24-ish side-view heroes (facing left) built from a pose skeleton =====
// =====================================================================
// Head stamps (facing left). H h j W = headgear/hair light..dark (+shine), R r = visible hair, F f g = skin, e = eye, A a = accent.
const HEADS = {
  spiky: { ax: 6, rows: ['..H..H.H..', '.HHHHHHHH.', 'HHWHhhhhHh', 'HhHhhhhhhj', 'hFhHhhhhjj', 'FFFFfghhjj', 'FeFFfgjhj.', 'FeFFfgjj..', '.FFffgj...', '..fgg.....'] },
  topknot: { ax: 6, rows: ['.....Hh...', '.....hj...', '...HHHHH..', '.HHWhhhhh.', 'HHhhhhhhjj', 'hFFFFhhhjj', 'FeFFfghjj.', 'FeFFfgjj..', '.FFffgj...', '..fgg.....'] },
  helm: { ax: 6, rows: ['....AA....', '...HHAa...', '..HHHHAa..', '.HWHHhhAa.', 'HWHHhhhhj.', 'HHHhhhhhjj', 'jjjjhhhhjj', 'FeFFjhhhj.', 'FFFfjhhj..', '.jhhhhj...'] },
  hood: { ax: 6, rows: ['...HHHH...', '..HHHHhhh.', '.HHWhhhhhj', 'HHHhhhhhjj', 'HjjFFFjhjj', 'HjFFFfjhjj', 'jFeFFfjhjj', 'FFeFfgjhj.', '.FFfgjhhj.', '..gjjhhjj.'] },
  hat: { ax: 6, rows: ['........Hj.', '.......HHj.', '......HHhj.', '.....HWhhj.', '....HHhhhj.', '...HHAAAAj.', 'HHHHhhhhhhj', '.jjFFFRrrr.', '..FeFFfRrr.', '.FFeFfgRr..', '..FFfgRr...', '...fgg.....'] },
  cap: { ax: 6, rows: ['.......A..', '......Aa..', '...HHHHa..', '.HHWHHhhh.', 'HHHHhhhhhj', 'jjFFFRrrr.', '.FFFFfRrr.', 'FeFFfgRr..', 'FeFffgr...', '.FFfgg....', '..fg......'] },
};
const JOBART = {
  knight: { head: 'helm', body: 'armor', weapon: 'sword', cape: true, metalHead: true },
  rogue: { head: 'hood', body: 'tunic', weapon: 'dagger', scarf: true },
  mage: { head: 'hat', body: 'robe', weapon: 'staff', hair: '#d8b868' },
  cleric: { head: 'hood', body: 'robe', weapon: 'rod' },
  monk: { head: 'topknot', body: 'gi', weapon: 'fists', bare: true },
  ranger: { head: 'cap', body: 'tunic', weapon: 'bow', hatFrom: 'T' },
  hexer: { head: 'hood', body: 'robe', weapon: 'tome' },
  bard: { head: 'cap', body: 'tunic', weapon: 'whip', hair: '#e8c070' },
  berserker: { head: 'spiky', body: 'bare', weapon: 'axe', bare: true },
  alchemist: { head: 'hood', body: 'robe', weapon: 'flask' },
  samurai: { head: 'topknot', body: 'gi', weapon: 'katana' },
  paladin: { head: 'helm', body: 'armor', weapon: 'sword', cape: true, metalHead: true },
};
const DEF_STYLE = ['hair', '#8a5a30', '#55341c', '#6a8ac0', '#4a6a98', '#f2f2f2', '#f0c8a0'];
function heroMats(job) {
  const [, H, , T, t, A, F] = HERO_STYLE[job] || DEF_STYLE, ja = JOBART[job] || JOBART.knight;
  const hatCol = ja.hatFrom === 'T' ? T : H, metal = ja.metalHead;
  return {
    hat: { r: R(hatCol, 5, metal ? { hi: 0.8, lo: 0.25 } : undefined), spec: metal ? '#ffffff' : undefined },
    hair: { r: R(ja.hair || (ja.hatFrom === 'T' ? H : '#6a4428'), 4) },
    tunic: { r: R(T, 5), tex: ja.body === 'robe' || ja.body === 'gi' ? (x) => ((x % 3) === 0 ? -0.06 : 0) : undefined },
    tunic2: { r: R(t, 4) },
    acc: { r: R(A, 4, { hi: 0.6 }) },
    skin: { r: R(F, 4, { lo: 0.55, hi: 0.4 }) },
    boots: { r: R('#6a4024', 4) },
    steel: { r: R('#a4b0c8', 5, { hi: 0.85, lo: 0.25 }), spec: '#ffffff', specAt: 0.8 },
    wood: { r: R('#8a5a30', 4) },
    gem: { r: R(A === '#f2f2f2' ? '#7fd8f0' : A, 4, { hi: 0.9 }), glow: true, lift: 0.15 },
    paper: { r: R('#e8e0c8', 3) },
  };
}
const D2R = Math.PI / 180;
function basePose() {
  return {
    neck: [16.5, 12.6], chest: [16.6, 15.4], belly: [16.9, 18.4], hipF: [15.7, 20.2], hipB: [18, 20.2],
    kneeF: [15.1, 24.2], ankF: [14.9, 27.6], kneeB: [18.4, 24.2], ankB: [18.7, 27.6],
    shF: [14.8, 13.8], elF: [14, 17.1], haF: [13.6, 19.8], shB: [18.6, 13.8], elB: [19.4, 17], haB: [19.6, 19.6],
    wAng: 115, wHand: 'F', face: 'n', lean: 0,
  };
}
function upper(J, dx, dy) { for (const k of ['neck', 'chest', 'belly', 'shF', 'elF', 'haF', 'shB', 'elB', 'haB']) J[k] = [J[k][0] + dx, J[k][1] + dy]; }
const HOLD = { staff: 270, rod: 270, scythe: 280, bow: 270, tome: 0, flask: 0, fists: 0, none: 0 };
function heroPose(name, wtype) {
  const J = basePose(); const set = (o) => Object.assign(J, o);
  const longW = wtype === 'staff' || wtype === 'rod' || wtype === 'scythe';
  if (HOLD[wtype] != null) J.wAng = HOLD[wtype];
  if (longW) set({ elF: [13.2, 16.6], haF: [12.6, 18.6] });
  if (wtype === 'bow') set({ elF: [12.6, 16.2], haF: [11.4, 17.6] });
  switch (name) {
    case 'ready': upper(J, -1, 0.5); set({ kneeF: [14, 24], ankF: [13.2, 27.6] }); if (!longW && wtype !== 'bow') set({ elF: [12.4, 16.2], haF: [11.2, 17.2], wAng: wtype === 'fists' ? 0 : 215 }); break;
    case 'windup': upper(J, 1, 0); set({ elF: [16.8, 10.4], haF: [18.8, 8.4], wAng: longW ? 300 : 305, kneeF: [13.6, 24], ankF: [12.6, 27.6] }); if (wtype === 'bow') set({ elF: [11.5, 15], haF: [9.6, 15.2], elB: [15, 15.2], haB: [16.8, 15.4], wAng: 270 }); break;
    case 'strike': upper(J, -2.6, 1); set({ elF: [11.2, 15.8], haF: [8.6, 17.2], wAng: longW ? 200 : 150, kneeF: [12.6, 23.6], ankF: [11.4, 27.6], kneeB: [19.6, 24.4], ankB: [21.4, 27.6] }); if (wtype === 'bow') set({ elF: [10.5, 15.2], haF: [8.2, 15.2], elB: [16, 15.6], haB: [18.6, 15.4], wAng: 270 }); if (wtype === 'whip') J.wAng = 185; break;
    case 'cast': set({ elF: [12, 14.6], haF: [10, 12.8], elB: [14.6, 15.1], haB: [12, 13.6], wAng: longW ? 250 : J.wAng }); break;
    case 'hurt': upper(J, 2, 0.4); set({ elF: [15.8, 17], haF: [17.6, 19.2], elB: [20.8, 16.4], haB: [22.4, 18.4], wAng: 70, face: 'x', ankF: [15.6, 27.6] }); break;
    case 'kneel': upper(J, -1.4, 3.6); set({ hipF: [15.4, 23.6], hipB: [17.8, 23.6], kneeF: [12.8, 24.4], ankF: [13.4, 27.8], kneeB: [18.8, 27.9], ankB: [22.4, 28], elF: [12.6, 20.6], haF: [11.6, 23.2], wAng: longW ? 280 : 95, face: 'd' }); break;
    case 'victory': set({ elF: [14, 10.2], haF: [13.4, 7.2], wAng: wtype === 'fists' || wtype === 'tome' || wtype === 'flask' ? 0 : 270, elB: [20.2, 16], haB: [18.6, 18.4], face: 'h' }); break;
    case 'ko': upper(J, 0.5, 0.2); set({ face: 'x', wAng: 80, elF: [15.2, 17], haF: [16.4, 19.6] }); break;
    default: break;
  }
  return J;
}
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
function weaponParts(type, hand, ang, pose) {
  const d = [Math.cos(ang * D2R), Math.sin(ang * D2R)], p = [-d[1], d[0]], P = [], Z = 12;
  const C = (a, b, r1, r2, m, z = Z) => P.push(cap(a[0], a[1], b[0], b[1], r1, r2, m, { z }));
  switch (type) {
    case 'sword': C(add(hand, d, -1.4), add(hand, d, -0.2), 0.75, 0.75, 'acc'); C(add(add(hand, d, 1.1), p, -2), add(add(hand, d, 1.1), p, 2), 0.6, 0.6, 'acc', Z + 1); C(add(hand, d, 1.4), add(hand, d, 10.5), 0.95, 0.45, 'steel'); break;
    case 'dagger': C(add(hand, d, -0.8), add(hand, d, 0.4), 0.6, 0.6, 'acc'); C(add(add(hand, d, 0.9), p, -1.3), add(add(hand, d, 0.9), p, 1.3), 0.5, 0.5, 'acc', Z + 1); C(add(hand, d, 1.2), add(hand, d, 6), 0.85, 0.35, 'steel'); break;
    case 'katana': C(add(hand, d, -2.2), add(hand, d, 0.4), 0.6, 0.6, 'tunic2'); P.push(ell(...add(hand, d, 0.9), 1.1, 1.1, 'acc', { z: Z + 1, d: 0.4 })); C(add(hand, d, 1.3), add(add(hand, d, 12), p, -0.8), 0.7, 0.35, 'steel'); break;
    case 'axe': { C(add(hand, d, -2.4), add(hand, d, 8.5), 0.62, 0.62, 'wood'); const e = add(hand, d, 7.6); P.push(poly([add(e, d, 1.6), add(add(e, d, 3.4), p, 4.2), add(add(e, d, -2.6), p, 4.4), add(e, d, -1.4)], 'steel', { z: Z + 1, bev: 1.2 })); break; }
    case 'staff': C(add(hand, d, -6), add(hand, d, 9), 0.65, 0.6, 'wood'); C(add(add(hand, d, 9), p, -1.6), add(hand, d, 10.6), 0.45, 0.45, 'wood', Z + 1); C(add(add(hand, d, 9), p, 1.6), add(hand, d, 10.6), 0.45, 0.45, 'wood', Z + 1); P.push(ell(...add(hand, d, 11), 1.75, 1.75, 'gem', { z: Z + 2 })); break;
    case 'rod': C(add(hand, d, -4), add(hand, d, 7.5), 0.6, 0.55, 'acc'); P.push(ell(...add(hand, d, 8.6), 1.6, 1.6, 'acc', { z: Z + 1, d: 0.5 })); P.push(cut(ell(...add(hand, d, 8.6), 0.7, 0.7, null))); C(add(add(hand, d, 6.6), p, -1.6), add(add(hand, d, 6.6), p, 1.6), 0.45, 0.45, 'acc', Z + 2); break;
    case 'tome': P.push(poly([add(hand, [-2.6, -2.8]), add(hand, [1.6, -3.4]), add(hand, [2.2, 1.6]), add(hand, [-2, 2.2])], 'acc', { z: Z, bev: 1 })); P.push(poly([add(hand, [-2.2, 1.4]), add(hand, [1.8, 0.9]), add(hand, [2.1, 1.7]), add(hand, [-1.9, 2.3])], 'paper', { z: Z + 1, bev: 0.6 })); break;
    case 'flask': C(add(hand, [0, -1.6]), add(hand, [0, -4]), 0.55, 0.55, 'paper'); P.push(ell(hand[0], hand[1] - 0.6, 1.9, 1.8, 'gem', { z: Z })); break;
    case 'bow': { const pts = []; for (let k = -4; k <= 4; k++) { const t = k / 4; pts.push(add(add(hand, [0, 1], t * 6.5), [-1, 0], (1 - t * t) * 2.2)); } for (let k = 0; k < pts.length - 1; k++) C(pts[k], pts[k + 1], 0.55, 0.55, 'wood'); break; }
    case 'whip': { C(add(hand, d, -1), add(hand, d, 2.2), 0.6, 0.55, 'wood'); const len = pose === 'strike' ? 15 : 7, droop = pose === 'strike' ? 0.5 : 2.4; let q = add(hand, d, 2.2); for (let k = 1; k <= 7; k++) { const t = k / 7, n = add(add(add(hand, d, 2.2 + len * t), [0, 1], droop * t * t * 3), p, Math.sin(t * 7) * 0.9); C(q, n, 0.45, 0.4, 'boots'); q = n; } break; }
    case 'fists': P.push(ell(hand[0], hand[1], 1.5, 1.4, 'acc', { z: Z })); break;
    case 'scythe': { C(add(hand, d, -5), add(hand, d, 10), 0.62, 0.6, 'wood'); const e = add(hand, d, 9.6), q = [-p[0], -p[1]]; P.push(poly([add(e, d, 1), add(add(e, q, 5), d, 0.2), add(add(e, q, 8.5), d, -2.4), add(add(e, q, 5), d, -1.4), add(e, d, -0.8)], 'steel', { z: Z + 1, bev: 1 })); break; }
    default: break;
  }
  return P;
}
function heroSpec(job, poseName, wover) {
  const ja = { ...(JOBART[job] || JOBART.knight) }; if (wover) ja.weapon = wover;
  const mats = heroMats(job), J = heroPose(poseName, ja.weapon), parts = [];
  const C = (a, b, r1, r2, m, z) => parts.push(cap(a[0], a[1], b[0], b[1], r1, r2, m, { z }));
  const sleeve = ja.bare ? 'skin' : ja.body === 'robe' ? 'tunic' : ja.body === 'armor' ? 'tunic' : 'tunic2';
  // cape / scarf (behind everything)
  if (ja.cape) parts.push(poly([add(J.neck, [0.4, 0.2]), add(J.neck, [3.4, 0.6]), [J.hipB[0] + 5.2, J.ankB[1] - 3.2], [J.hipB[0] + 1.6, J.ankB[1] - 2.2]], 'tunic2', { z: -6, bev: 1.4 }));
  if (ja.scarf) parts.push(poly([add(J.neck, [0.5, -0.6]), add(J.neck, [5.6, 0.6]), add(J.neck, [6.4, 3.4]), add(J.neck, [1.6, 1.4])], 'acc', { z: -6, bev: 1 }));
  // back arm, back leg
  C(J.shB, J.elB, 1.25, 1.15, sleeve, -2); C(J.elB, J.haB, 1.15, 1.0, ja.bare ? 'skin' : sleeve, -2); parts.push(ell(J.haB[0], J.haB[1], 1.15, 1.15, 'skin', { z: -1.5 }));
  const legM = ja.body === 'armor' ? 'tunic2' : ja.body === 'bare' ? 'tunic2' : 'tunic2';
  C(J.hipB, J.kneeB, 1.5, 1.35, legM, -3); C(J.kneeB, J.ankB, 1.35, 1.2, 'boots', -3); parts.push(ell(J.ankB[0] - 1.2, J.ankB[1] + 0.9, 2, 1.15, 'boots', { z: -3, d: 0.7 }));
  // torso
  if (ja.body === 'robe') {
    const hem = Math.max(J.ankF[1], J.ankB[1]) + 0.6, mx = (J.ankF[0] + J.ankB[0]) / 2;
    parts.push(poly([add(J.shF, [-0.4, -1]), add(J.shB, [0.8, -1]), [J.hipB[0] + 1.6, J.hipB[1]], [mx + 4.6, hem], [mx - 4.4, hem], [J.hipF[0] - 2, J.hipF[1]]], 'tunic', { z: 1, bev: 2.2 }));
    parts.push(paint(poly([[mx - 5, hem - 1.6], [mx + 5, hem - 1.6], [mx + 5.2, hem + 1], [mx - 5.2, hem + 1]], 'acc')));
    parts.push(ell(J.chest[0], J.chest[1], 3.5, 3.3, 'tunic', { z: 2 }));
  } else {
    parts.push(ell(J.belly[0], J.belly[1], 3.1, 2.5, ja.body === 'bare' ? 'skin' : 'tunic', { z: 1 }));
    parts.push(ell(J.chest[0], J.chest[1], 3.6, 3.4, ja.body === 'bare' ? 'tunic' : 'tunic', { z: 2 }));
    if (ja.body === 'bare') parts.push(paint(cap(J.chest[0] - 3, J.chest[1] - 2.5, J.chest[0] + 2.5, J.chest[1] + 2.6, 0.9, 0.9, 'acc')));
    parts.push(cap(J.belly[0] - 3, J.belly[1] + 0.9, J.belly[0] + 3, J.belly[1] + 0.9, 0.85, 0.85, 'acc', { z: 3.4 }));
    if (ja.body === 'gi') { const top = [J.hipF[0] - 1.2, J.hipF[1] - 0.6], top2 = [J.hipB[0] + 1.3, J.hipB[1] - 0.6]; parts.push(poly([top, top2, [J.ankB[0] + 2.4, J.ankB[1] - 0.6], [J.ankF[0] - 2.3, J.ankF[1] - 0.6]], 'tunic2', { z: 0.5, bev: 1.8 })); }
  }
  // front leg
  if (ja.body !== 'robe') { C(J.hipF, J.kneeF, 1.55, 1.4, legM, 0.5); C(J.kneeF, J.ankF, 1.4, 1.25, 'boots', 0.6); }
  parts.push(ell(J.ankF[0] - 1.2, J.ankF[1] + 0.9, 2.1, 1.15, 'boots', { z: 0.8, d: 0.7 }));
  if (ja.body === 'armor') parts.push(ell(J.shF[0] + 0.6, J.shF[1] - 0.2, 2.4, 1.9, 'hat', { z: 6, d: 0.8 }));
  // weapon in the back hand goes behind the front arm; front hand weapon in front
  const hand = J.wHand === 'F' ? J.haF : J.haB;
  // front arm
  C(J.shF, J.elF, 1.3, 1.2, sleeve, 5); C(J.elF, J.haF, 1.2, 1.05, ja.bare ? 'skin' : sleeve, 5.5);
  parts.push(...weaponParts(ja.weapon, hand, J.wAng, poseName));
  parts.push(ell(J.haF[0], J.haF[1], 1.2, 1.2, 'skin', { z: 11 }));
  if (ja.weapon === 'fists') parts.push(ell(J.haF[0], J.haF[1], 1.5, 1.4, 'acc', { z: 13 }));
  const head = HEADS[ja.head], hx = Math.round(J.neck[0] - head.ax), hy = Math.round(J.neck[1] - head.rows.length + 0.6);
  return { w: 32, h: 32, mats, parts, crease: 1.2, post(api) {
    const m = mats, pal = { H: m.hat.r[3], h: m.hat.r[2], j: m.hat.r[1], W: m.hat.r[4], R: m.hair.r[2], r: m.hair.r[1], F: m.skin.r[3], f: m.skin.r[2], g: m.skin.r[1], e: '#2a1c34', A: m.acc.r[3], a: m.acc.r[1], _ol: m.hat.r[0] };
    let rows = head.rows;
    if (J.face !== 'n') rows = rows.map((r) => r.replace(/e/g, 'F'));
    api.stamp(rows, pal, hx, hy);
    const eyes = []; head.rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'e') eyes.push([hx + x, hy + y]); }));
    if (J.face === 'x' && eyes.length) { const [ex, ey] = eyes[eyes.length - 1]; api.px(ex, ey, '#2a1c34'); api.px(ex + 1, ey - 1, '#2a1c34'); }
    if (J.face === 'd' && eyes.length) { const [ex, ey] = eyes[eyes.length - 1]; api.px(ex, ey, '#2a1c34'); api.px(ex + 1, ey, '#2a1c34'); }
    if (J.face === 'h' && eyes.length) { const [ex, ey] = eyes[0]; api.px(ex, ey + 1, '#2a1c34'); api.px(ex + 1, ey, '#2a1c34'); }
    if (ja.weapon === 'bow' && poseName !== 'ko') { const top = add(hand, [0, -6.5]), bot = add(hand, [0, 6.5]), pull = poseName === 'windup' || poseName === 'strike' ? J.haB : [hand[0] + 1.6, hand[1]]; api.line(Math.round(top[0]), Math.round(top[1]), Math.round(pull[0]), Math.round(pull[1]), '#e8e0c8'); api.line(Math.round(pull[0]), Math.round(pull[1]), Math.round(bot[0]), Math.round(bot[1]), '#e8e0c8'); if (poseName === 'windup' || poseName === 'strike') { api.line(Math.round(hand[0] - 3), Math.round(J.haB[1]), Math.round(J.haB[0]), Math.round(J.haB[1]), '#c8a070'); api.px(Math.round(hand[0] - 4), Math.round(J.haB[1]), '#e8e8f0'); } }
  } };
}
export const HERO_POSES = ['idle', 'ready', 'windup', 'strike', 'cast', 'hurt', 'kneel', 'victory', 'ko'];
const HCACHE = new Map();
// weapon: a WEAPON_TYPES id to show instead of the job's signature weapon ('none' = empty hands)
export function heroFrame(job, pose = 'idle', weapon = null) {
  if (weapon === 'staff' && job === 'cleric') weapon = 'rod';
  const k = job + ':' + pose + ':' + (weapon || ''); if (HCACHE.has(k)) return HCACHE.get(k);
  const spec = heroSpec(HERO_STYLE[job] ? job : 'knight', pose, weapon); if (pose === 'ko') spec.tint = 0.45;
  let c = render(spec);
  if (pose === 'ko') { const [x0, y0, x1, y1] = bbox(c); c = rot90(c, false); BBOX.set(c, [c.width - 1 - y1, x0, c.width - 1 - y0, x1]); } // lie on the back: pixel-exact quarter turn
  HCACHE.set(k, c); return c;
}
export function heroPortrait(job) { // square idle frame cropped around the body, for menus and the turn-order bar
  const k = job + ':portrait'; if (HCACHE.has(k)) return HCACHE.get(k);
  const f = heroFrame(job, 'idle'), [x0, y0, x1, y1] = bbox(f), s = Math.max(x1 - x0 + 1, y1 - y0 + 1) + 2, c = mk(s, s);
  c.getContext('2d').drawImage(f, Math.round((s - (x1 - x0 + 1)) / 2) - x0, Math.round((s - (y1 - y0 + 1)) / 2) - y0);
  HCACHE.set(k, c); return c;
}

// =====================================================================
// ===== Enemies (face right, toward the party) =====
// =====================================================================
const TEX = {
  fur: (x, y) => ((x * 2 + (y >> 1) * 3) % 7 === 0 ? -0.13 : 0) + ((x + y * 3) % 11 === 0 ? 0.08 : 0),
  scale: (x, y) => ((y % 3 === 0 && (x + ((y / 3) | 0) * 2) % 4 === 0) || ((y % 3 === 1) && (x + ((y / 3) | 0) * 2) % 4 === 1) ? -0.16 : 0),
  stone: (x, y) => (fbm(x / 3.5, y / 3.5, 7) - 0.5) * 0.45 + (hash(x, y, 3) < 0.06 ? -0.2 : 0),
  bone: (x, y) => (hash(x, y, 5) < 0.08 ? -0.12 : 0),
  cloth: (x, y) => ((x + (y >> 2)) % 5 === 0 ? -0.08 : 0),
  rough: (x, y) => (hash(x, y, 9) - 0.5) * 0.18,
  ice: (x, y) => ((x - y) % 6 === 0 ? 0.14 : 0) + (hash(x, y, 2) < 0.05 ? 0.2 : 0),
  belly: (x, y) => (y % 3 === 0 ? -0.15 : 0),
};
const mat = (col, n = 5, o = {}) => ({ r: R(col, n, o.ramp), tex: o.tex ? TEX[o.tex] || o.tex : undefined, spec: o.spec, specAt: o.specAt, glow: o.glow, lift: o.lift, flat: o.flat, nocrease: o.nocrease });
const P2 = (pts) => pts.map(([x, y]) => [x, y]);
const mirrorPts = (pts, cx) => pts.map(([x, y]) => [2 * cx - x, y]);
function eye(api, x, y, iris, pupil = '#100810', big = false) { api.px(x, y, iris); api.px(x + 1, y, iris); if (big) { api.px(x, y + 1, iris); api.px(x + 1, y + 1, pupil); api.px(x + 1, y - 1, '#ffffff'); } else api.px(x + 1, y, pupil); }
function glowEye(api, x, y, c1, c2 = '#ffffff', w = 2) { for (let k = 0; k < w; k++) api.px(x + k, y, c1); api.px(x + w - 1, y, c2); }
function fangs(api, pts, col = '#f4f0e0') { for (const [x, y, l = 1] of pts) for (let k = 0; k < l; k++) api.px(x, y + k, col); }

const MODELS = {
  slime: { col: { goo: '#4fbe4a', eye: '#ffffff', mouth: '#1a3a20' }, build(P) {
    return { w: 38, h: 30, mats: { goo: mat(P.goo, 6, { spec: '#ffffff', specAt: 0.86, lift: 0.06, ramp: { hi: 0.75 } }) },
      parts: [ell(19, 20.5, 16, 9, 'goo', { d: 0.9 }), ell(18, 14, 10, 9, 'goo', { z: 1 }), cap(17, 9, 20.5, 3.5, 4, 1.2, 'goo', { z: 2 }), ell(6, 26.5, 3, 2.2, 'goo', { z: 2 }), ell(31, 27, 3.4, 2, 'goo', { z: 2 })],
      post(a) {
        a.rect(21, 13, 3, 5, '#ffffff'); a.rect(28, 13, 3, 5, '#ffffff'); a.rect(22, 15, 2, 3, '#18101c'); a.rect(29, 15, 2, 3, '#18101c'); a.px(22, 15, '#ffffff'); a.px(29, 15, '#ffffff');
        for (let x = 22; x <= 30; x++) a.px(x, 21 + (x > 23 && x < 29 ? 1 : 0), P.mouth); a.px(25, 23, P.mouth); a.px(26, 23, P.mouth);
        a.rect(9, 12, 2, 3, '#ffffff'); a.px(11, 10, '#ffffff'); a.px(8, 16, a.ramp('goo', -1));
      } };
  } },
  goblin: { col: { skin: '#5fae46', cloth: '#8a5a30', metal: '#9aa4b8', eye: '#ffd23a', club: '#7a5030', hair: '#3a2a20' }, build(P, V) {
    const m = { skin: mat(P.skin, 5, { tex: 'rough' }), cloth: mat(P.cloth, 4, { tex: 'cloth' }), metal: mat(P.metal, 5, { spec: '#ffffff', ramp: { hi: 0.8 } }), club: mat(P.club, 4, { tex: 'rough' }), hair: mat(P.hair, 3) };
    return { w: 36, h: 38, mats: m, parts: [
      cap(12, 20, 9, 27, 2, 1.6, 'skin', { z: -4 }), ell(9, 28, 2.2, 2, 'skin', { z: -4 }), // back arm
      cap(15, 29, 13, 35, 2.3, 1.8, 'skin', { z: -2 }), ell(13, 36, 3, 1.6, 'skin', { z: -2, d: 0.6 }),
      ell(17, 24, 7, 7, 'cloth', { z: 0 }), ell(20, 25.5, 4, 4.5, 'skin', { z: 2.5 }), poly([[11, 28], [24, 28], [25, 33], [18, 31], [11, 33]], 'cloth', { z: 3, bev: 1.4 }),
      cap(21, 29, 23, 35, 2.4, 1.9, 'skin', { z: 3 }), ell(24.5, 36, 3.2, 1.6, 'skin', { z: 3, d: 0.6 }),
      poly([[16, 10], [3, 2], [7, 8], [15, 15]], 'skin', { z: 3, bev: 1.6 }), poly([[24, 9], [33, 2], [30, 9], [25, 14]], 'skin', { z: 3, bev: 1.6 }),
      ell(20, 11.5, 7, 6.5, 'skin', { z: 5 }), ell(27, 13, 2.6, 2.2, 'skin', { z: 9 }), ell(18, 6.5, 4, 2, 'hair', { z: 6, d: 0.6 }),
      cap(23, 19, 27, 24, 2, 1.7, 'skin', { z: 8 }), cap(28, 26, 32, 10, 1.3, 2.8, 'club', { z: 9 }), ell(31.5, 9.5, 2.2, 2, 'club', { z: 10 }), ell(27.5, 24.5, 2, 2, 'skin', { z: 11 }),
      ...(V.ice ? [poly([[29, 6], [31, 0], [33, 7]], 'metal', { z: 11, bev: 1 })] : [cap(30, 13, 33.5, 12, 0.7, 0.5, 'metal', { z: 11 }), cap(29.5, 17, 33, 17.5, 0.7, 0.5, 'metal', { z: 11 })]),
    ], post(a) {
      a.rect(21, 10, 3, 2, P.eye); a.px(23, 10, '#c01818'); a.px(23, 11, '#c01818'); a.rect(25, 10, 2, 2, P.eye); a.px(26, 11, '#c01818');
      for (let x = 20; x <= 27; x++) a.px(x, 16, '#3a1010'); fangs(a, [[21, 15], [24, 17], [26, 15]], '#f4ecd0');
      a.line(18, 8, 22, 9, a.ramp('skin', 0));
    } };
  } },
  wolf: { col: { fur: '#8a8e9c', mane: '#5a5e6e', belly: '#c8c8d0', eye: '#ff4030', nose: '#18141c' }, build(P) {
    const m = { fur: mat(P.fur, 5, { tex: 'fur' }), mane: mat(P.mane, 5, { tex: 'fur' }), belly: mat(P.belly, 4, { tex: 'fur' }), claw: mat('#e8e0d0', 3) };
    return { w: 46, h: 32, mats: m, parts: [
      cap(10, 15, 3, 17, 2.8, 2.2, 'fur', { z: -3 }), cap(3, 17, 1.5, 23, 2.2, 1, 'mane', { z: -3 }), // tail
      cap(29, 21, 27, 29.5, 1.8, 1.3, 'mane', { z: -6 }), cap(12, 22, 9, 29.5, 1.9, 1.3, 'mane', { z: -6 }), // far legs
      ell(19, 17, 12, 6.4, 'fur', { z: 0 }), paint(ell(21, 22, 9, 2.6, 'belly')),
      ell(11, 18.5, 5.5, 6, 'fur', { z: 1 }), cap(11, 22, 13.6, 26.5, 2.2, 1.6, 'fur', { z: 2 }), cap(13.6, 26.5, 12.4, 29.4, 1.5, 1.3, 'fur', { z: 2 }), ell(13.6, 29.8, 2.2, 1, 'fur', { z: 2, d: 0.5 }),
      ell(31, 17, 6.5, 7, 'mane', { z: 2 }), cap(33, 21, 34, 29.4, 2.2, 1.5, 'fur', { z: 3 }), ell(35.4, 29.8, 2.4, 1, 'fur', { z: 3, d: 0.5 }),
      ell(33, 11, 6, 5.5, 'mane', { z: 3 }), poly([[31.5, 8], [33, 0.5], [36, 6]], 'mane', { z: 5, bev: 1 }), poly([[35, 6.5], [38.5, 1], [39.5, 7.5]], 'fur', { z: 7, bev: 1 }),
      ell(37, 10.5, 5, 4.5, 'fur', { z: 6 }), cap(39, 11.5, 44, 13.2, 2.6, 1.6, 'fur', { z: 7 }), cap(39, 15, 43, 15.6, 1.4, 0.9, 'belly', { z: 6.5 }),
    ], post(a) {
      a.px(38, 9, P.eye); a.px(39, 9, P.eye); a.px(39, 10, '#ffd0a0'); a.line(37, 8, 40, 8, a.ramp('mane', 0));
      a.px(45, 12, P.nose); a.px(44, 12, P.nose); a.px(45, 13, P.nose); fangs(a, [[41, 14, 2], [43, 14], [39, 14]]);
      for (const x of [12, 14, 34, 36]) a.px(x, 30, '#e8e0d0');
      a.px(4, 15, a.ramp('fur', -1)); a.line(17, 11, 23, 11, a.ramp('fur', -1));
    } };
  } },
  bat: { col: { fur: '#5a3a70', wing: '#7a4a9a', bone: '#3a2050', eye: '#ff3a3a' }, build(P) {
    const m = { fur: mat(P.fur, 5, { tex: 'fur' }), wing: mat(P.wing, 5, { lift: -0.04 }), bone: mat(P.bone, 4), tooth: mat('#f4f0e0', 3) };
    const L = [[19, 12], [12, 3], [6, 2], [1, 9], [3, 15], [7, 12.5], [9, 19], [13, 15], [16, 21], [19, 18]];
    return { w: 46, h: 32, mats: m, parts: [
      poly(L, 'wing', { z: -2, bev: 1.4 }), poly(mirrorPts(L, 23), 'wing', { z: -2, bev: 1.4 }),
      ...[[12, 3], [1, 9], [9, 19], [16, 21]].flatMap(([x, y]) => [cap(19, 12, x, y, 1, 0.45, 'bone', { z: -1 }), cap(2 * 23 - 19, 12, 2 * 23 - x, y, 1, 0.45, 'bone', { z: -1 })]),
      cap(17, 11, 12, 3, 1.2, 0.7, 'bone', { z: 0 }), cap(29, 11, 34, 3, 1.2, 0.7, 'bone', { z: 0 }),
      ell(23, 17, 4.8, 6, 'fur', { z: 2 }), ell(23, 10, 4.4, 3.8, 'fur', { z: 4 }), poly([[19.5, 8], [18.5, 1.5], [22, 6.5]], 'fur', { z: 5, bev: 1 }), poly([[26.5, 8], [27.5, 1.5], [24, 6.5]], 'fur', { z: 5, bev: 1 }),
      cap(21, 22.5, 20, 26.5, 0.9, 0.7, 'bone', { z: 3 }), cap(25, 22.5, 26, 26.5, 0.9, 0.7, 'bone', { z: 3 }),
    ], post(a) { a.px(21, 9, P.eye); a.px(25, 9, P.eye); a.px(21, 10, '#ffc0a0'); a.px(25, 10, '#ffc0a0'); a.line(21, 12, 25, 12, '#2a0a1a'); fangs(a, [[21, 13, 2], [25, 13, 2]]); a.px(23, 11, a.ramp('fur', 0)); } };
  } },
  skeleton: { col: { bone: '#e4dcc4', dark: '#2a2030', metal: '#8a94a8', shield: '#7a4a2a', trim: '#d0a040', eye: '#ff5030' }, build(P, V) {
    const m = { bone: mat(P.bone, 5, { tex: 'bone', ramp: { lo: 0.38 } }), metal: mat(P.metal, 5, { spec: '#ffffff', ramp: { hi: 0.8 } }), shield: mat(P.shield, 4, { tex: 'rough' }), trim: mat(P.trim, 4), armor: mat(P.armor || P.metal, 5, { spec: '#ffffff', specAt: 0.88 }) };
    const ribs = []; for (let k = 0; k < 4; k++) ribs.push(cap(12.2 + k * 0.3, 15.4 + k * 2.1, 20.5 - k * 0.4, 15.6 + k * 2.1, 0.75, 0.75, 'bone', { z: 1 }));
    return { w: 34, h: 42, mats: m, parts: [
      ell(8.5, 22, 5, 6.5, 'shield', { z: -6, d: 0.45 }), paint(cap(8.5, 15.8, 8.5, 28.2, 0.9, 0.9, 'trim')), ell(8.5, 22, 1.4, 1.4, 'trim', { z: -4 }),
      cap(12, 15, 10, 20, 1, 0.9, 'bone', { z: -3 }), cap(10, 20, 9.5, 23, 0.9, 0.8, 'bone', { z: -3 }),
      cap(14, 26, 12.5, 32, 1.2, 1, 'bone', { z: -2 }), cap(12.5, 32, 12.5, 38, 1, 0.9, 'bone', { z: -2 }), ell(13.5, 39, 2.5, 1.2, 'bone', { z: -2, d: 0.6 }),
      cap(16, 12.5, 16.3, 25, 1.1, 1.1, 'bone', { z: 0 }), ...ribs, ell(16.5, 25.6, 4.2, 2.2, 'bone', { z: 2 }),
      cap(18.5, 26, 20.5, 32, 1.3, 1, 'bone', { z: 3 }), cap(20.5, 32, 20.5, 38, 1, 0.9, 'bone', { z: 3 }), ell(22, 39, 2.6, 1.2, 'bone', { z: 3, d: 0.6 }),
      ell(17, 7, 5.6, 5.4, 'bone', { z: 4 }), ell(19.5, 11.2, 3.4, 1.9, 'bone', { z: 5 }),
      ...(V.helm ? [ell(16.6, 5.6, 6.2, 4.8, 'armor', { z: 6 }), cut(poly([[10, 9], [24, 9], [24, 14], [10, 14]], null)), ell(17, 7, 5.6, 5.4, 'bone', { z: -9 }), poly([[11, 3], [6, -1], [10, 6]], 'armor', { z: 7, bev: 1 })] : []),
      cap(20, 14.5, 23.5, 18.5, 1.1, 1, 'bone', { z: 6 }), cap(23.5, 18.5, 26.5, 18.5, 1, 0.9, 'bone', { z: 6 }),
      cap(27.4, 20, 27.4, 16.5, 0.8, 0.8, 'trim', { z: 7 }), cap(25, 16.6, 30, 16.6, 0.65, 0.65, 'trim', { z: 8 }), cap(27.4, 15.8, 28.5, 1, 1.15, 0.5, 'metal', { z: 7 }), ell(27, 18.6, 1.4, 1.3, 'bone', { z: 9 }),
      ...(V.helm ? [ell(16.5, 15.5, 5, 3.8, 'armor', { z: 3 }), ell(21, 14, 2.6, 2.2, 'armor', { z: 7 })] : []),
    ], post(a) {
      const ey = V.helm ? 8 : 7; a.rect(17, ey - 1, 3, 3, '#1a1018'); a.rect(21, ey - 1, 2, 3, '#1a1018'); a.px(18, ey, P.eye); a.px(21, ey, P.eye); a.px(19, ey, '#ffd080');
      if (!V.helm) { a.px(22, 10, '#1a1018'); for (let x = 17; x <= 22; x += 2) a.px(x, 12, '#3a2a30'); }
    } };
  } },
  imp: { col: { skin: '#d8483a', wing: '#7a2030', horn: '#e8dcc0', eye: '#ffe040', fire: '#ff9a2a' }, build(P, V) {
    const m = { skin: mat(P.skin, 5, { tex: 'rough' }), wing: mat(P.wing, 4), horn: mat(P.horn, 4), fire: mat(P.fire, 5, { glow: true, lift: 0.25, ramp: { hi: 0.95 }, nocrease: true }), claw: mat('#f0e8d8', 3) };
    const W = [[14, 15], [4, 6], [2, 12], [5, 13], [3, 18], [8, 17], [9, 22], [15, 20]];
    return { w: 36, h: 36, mats: m, parts: [
      poly(W, 'wing', { z: -6, bev: 1.3 }), cap(14, 15, 4, 6, 0.9, 0.4, 'wing', { z: -5 }), poly(mirrorPts(W, 15).map(([x, y]) => [x + 2, y - 2]), 'wing', { z: -8, bev: 1.3 }),
      cap(13, 25, 6, 28, 1.2, 0.8, 'skin', { z: -4 }), cap(6, 28, 3, 25, 0.8, 0.5, 'skin', { z: -4 }), poly([[1, 24], [4, 21], [5, 26]], 'skin', { z: -3, bev: 1 }),
      cap(14, 26, 12, 30, 1.9, 1.5, 'skin', { z: -2 }), cap(12, 30, 13.5, 33.5, 1.5, 1.2, 'skin', { z: -2 }), ell(14.5, 34, 2.3, 1.1, 'skin', { z: -2, d: 0.5 }),
      cap(12, 18, 9, 23, 1.6, 1.3, 'skin', { z: -1 }),
      ell(16, 22, 5, 5.6, 'skin', { z: 0 }), cap(19, 26, 21, 30, 2, 1.6, 'skin', { z: 2 }), cap(21, 30, 20, 33.5, 1.6, 1.3, 'skin', { z: 2 }), ell(21.5, 34, 2.4, 1.1, 'skin', { z: 2, d: 0.5 }),
      ell(17, 11.5, 6.6, 6, 'skin', { z: 4 }), cap(12.5, 8, 9, 2, 1.6, 0.5, 'horn', { z: 5 }), cap(20, 7, 23.5, 1, 1.6, 0.5, 'horn', { z: 6 }),
      poly([[11, 11], [5, 8], [11, 14]], 'skin', { z: 5, bev: 1 }), poly([[23, 11], [29, 7.5], [23, 14]], 'skin', { z: 6, bev: 1 }),
      cap(20, 18, 25, 16, 1.6, 1.3, 'skin', { z: 7 }), ell(29, 13, 4.2, 4.2, 'fire', { z: 9 }), ell(30, 10, 2.6, 3.2, 'fire', { z: 10 }), ell(26, 16, 1.5, 1.5, 'skin', { z: 11 }),
    ], post(a) {
      a.rect(15, 10, 3, 2, P.eye); a.rect(20, 10, 3, 2, P.eye); a.px(17, 11, '#200808'); a.px(22, 11, '#200808'); a.line(14, 9, 17, 9.6, a.ramp('skin', 0)); a.line(20, 9, 23, 8.6, a.ramp('skin', 0));
      for (let x = 15; x <= 22; x++) a.px(x, 14 + (x === 15 || x === 22 ? -1 : 0), '#3a0a10'); fangs(a, [[16, 15], [18, 15], [20, 15]], '#fff4e0');
      a.px(29, 12, '#ffffff'); a.px(30, 11, '#ffffff'); a.px(31, 7, a.ramp('fire', -1)); a.px(32, 5, a.ramp('fire', 2));
    } };
  } },
  golem: { col: { rock: '#8a8478', moss: '#5a8a3a', glow: '#ffb83a', dark: '#4a4440' }, build(P, V) {
    const m = { rock: mat(P.rock, 5, { tex: V.ice ? 'ice' : 'stone', spec: V.ice ? '#ffffff' : undefined, specAt: 0.9 }), rock2: mat(P.dark, 4, { tex: V.ice ? 'ice' : 'stone' }), moss: mat(P.moss, 4, { tex: 'rough' }), glow: mat(P.glow, 4, { glow: true, flat: 0.95, nocrease: true }) };
    const t = (pts, mm = 'rock', tilt = [0, 0], z = 0) => poly(pts, mm, { z, tilt, bev: 1.6 });
    return { w: 50, h: 48, mats: m, parts: [
      ell(9, 22, 5.5, 6, 'rock2', { z: -6 }), ell(8, 31, 5, 5.5, 'rock2', { z: -6 }), ell(9, 39.5, 6.5, 4.5, 'rock2', { z: -6 }), // back arm
      t([[14, 34], [22, 34], [23, 46], [12, 46]], 'rock2', [-0.2, 0], -3), t([[27, 34], [36, 34], [38, 46], [26, 46]], 'rock', [0.15, 0], 2),
      t([[13, 13], [36, 11], [40, 22], [36, 36], [14, 37], [10, 24]], 'rock', [-0.15, -0.2], 0), t([[18, 22], [33, 21], [34, 33], [19, 34]], 'rock', [0.2, 0.15], 1),
      t([[20, 2], [32, 1], [35, 9], [31, 14], [20, 14], [17, 8]], 'rock', [-0.1, -0.25], 4), t([[27, 6], [35, 5], [35, 12], [28, 12]], 'rock', [0.35, 0], 5),
      ...(V.ice ? [poly([[13, 13], [12, 2], [17, 11]], 'glow', { z: 6, bev: 1 }), poly([[16, 12], [19, 4], [20, 12]], 'glow', { z: 6, bev: 1 }), poly([[36, 12], [41, 3], [40, 14]], 'glow', { z: 6, bev: 1 })] : [paint(ell(17, 13, 6, 3, 'moss')), paint(ell(28, 1.5, 5, 2, 'moss')), paint(ell(15, 36, 4, 2, 'moss'))]),
      ell(40, 17, 6.5, 6, 'rock', { z: 6 }), ell(42, 27, 5.2, 5.5, 'rock', { z: 7 }), ell(42.5, 37.5, 6.5, 5.5, 'rock', { z: 8 }), cut(ell(49, 44, 2, 2, null)),
    ], post(a) {
      a.rect(24, 7, 3, 2, P.glow); a.rect(30, 7, 3, 2, P.glow); a.px(25, 7, '#ffffff'); a.px(31, 7, '#ffffff');
      a.line(24, 24, 27, 28, P.glow); a.line(27, 28, 25, 31, P.glow); a.line(28, 26, 31, 24, P.glow); a.px(26, 27, '#ffffff');
      for (const [x, y] of [[16, 28], [20, 18], [35, 30], [38, 20], [24, 42]]) { a.px(x, y, a.ramp('rock', 0)); a.px(x + 1, y + 1, a.ramp('rock', 0)); }
    } };
  } },
  wraith: { col: { cloak: '#5a6a9a', inner: '#141020', eye: '#7af0ff', hand: '#c8d8e8' }, build(P) {
    const m = { cloak: mat(P.cloak, 5, { tex: 'cloth', lift: 0.03 }), inner: mat(P.inner, 3, { flat: 0.2 }), hand: mat(P.hand, 4) };
    const hem = [[7, 38], [10, 33], [12, 40], [15, 34], [18, 41], [21, 35], [24, 40], [26, 33], [29, 37]];
    return { w: 38, h: 44, mats: m, parts: [
      cap(12, 14, 6, 22, 2.4, 1.8, 'cloak', { z: -3 }), cap(6, 22, 9, 27, 1.8, 1.5, 'cloak', { z: -3 }), cap(9, 27, 7, 30, 0.6, 0.4, 'hand', { z: -2 }), cap(9.5, 27, 10, 31, 0.6, 0.4, 'hand', { z: -2 }),
      poly([[11, 12], [24, 11], [30, 24], [31, 34], ...hem.reverse(), [6, 30]], 'cloak', { z: 0, bev: 2.4 }),
      ell(17.5, 10, 7.5, 8, 'cloak', { z: 3 }), cap(14, 4, 7, 1, 2.4, 0.8, 'cloak', { z: 2 }), paint(ell(20.5, 11, 4.2, 5.2, 'inner')),
      cap(23, 15, 28, 21, 2.6, 2.1, 'cloak', { z: 6 }), cap(28, 21, 32, 18, 2.1, 1.8, 'cloak', { z: 6 }),
      ...[[35.5, 14], [36.5, 17], [36, 20.5]].map(([x, y]) => cap(32.5, 18.3, x, y, 0.7, 0.4, 'hand', { z: 7 })),
    ], post(a) { glowEye(a, 18, 10, P.eye); glowEye(a, 22, 10, P.eye); a.px(18, 11, shade(P.eye, 0.5)); a.px(23, 11, shade(P.eye, 0.5)); } };
  } },
  zombie: { col: { skin: '#8aa070', cloth: '#5a5a7a', pants: '#5a4030', hair: '#3a3028', eye: '#ffffa0' }, build(P) {
    const m = { skin: mat(P.skin, 5, { tex: 'rough' }), cloth: mat(P.cloth, 4, { tex: 'cloth' }), pants: mat(P.pants, 4, { tex: 'cloth' }), hair: mat(P.hair, 3), bone: mat('#e8e0c8', 3) };
    return { w: 34, h: 42, mats: m, parts: [
      cap(14, 16, 22, 19, 1.8, 1.5, 'cloth', { z: -4 }), cap(22, 19, 28, 20, 1.5, 1.3, 'skin', { z: -4 }),
      cap(14, 27, 12, 33, 2.2, 1.9, 'pants', { z: -2 }), cap(12, 33, 12, 38.5, 1.8, 1.5, 'skin', { z: -2 }), ell(13, 39.5, 2.8, 1.3, 'skin', { z: -2, d: 0.5 }),
      poly([[11, 14], [20, 13], [22, 22], [21, 28], [11, 29], [9, 21]], 'cloth', { z: 0, bev: 2 }), cut(poly([[15, 26], [17, 22], [19, 27]], null)), poly([[10, 27], [22, 27], [21, 31], [11, 31]], 'pants', { z: 1, bev: 1.4 }),
      paint(ell(16.4, 25, 2, 2.2, 'skin')), cap(18, 29, 19.5, 34, 2.2, 1.9, 'pants', { z: 2 }), cap(19.5, 34, 19.5, 38.5, 1.8, 1.5, 'skin', { z: 2 }), ell(21, 39.5, 2.8, 1.3, 'skin', { z: 2, d: 0.5 }),
      ell(17, 8.5, 5.6, 6, 'skin', { z: 4, rot: 0.25 }), ell(20, 12, 3.3, 2.2, 'skin', { z: 5 }), ell(15, 4.5, 5, 2.8, 'hair', { z: 5, d: 0.6 }), cap(13, 5, 10, 12, 1.4, 0.6, 'hair', { z: 5 }),
      cap(16, 16, 24, 17, 2, 1.7, 'cloth', { z: 7 }), cap(24, 17, 30, 18.5, 1.6, 1.3, 'skin', { z: 7 }), ...[[33, 17], [33.5, 19], [32.5, 21]].map(([x, y]) => cap(30, 18.5, x, y, 0.6, 0.4, 'bone', { z: 8 })),
    ], post(a) { a.rect(18, 7, 2, 2, '#1a1018'); a.px(19, 8, P.eye); a.px(22, 8, P.eye); a.px(22, 9, '#1a1018'); a.line(18, 13, 22, 12, '#2a1010'); fangs(a, [[19, 12], [21, 12]], '#d8d0b0'); a.px(14, 20, a.ramp('cloth', 0)); a.px(20, 18, a.ramp('cloth', 0)); } };
  } },
  yeti: { col: { fur: '#e8eef8', chest: '#b8c8e0', face: '#6a9ad0', horn: '#c8b898', eye: '#ffd23a' }, build(P) {
    const m = { fur: mat(P.fur, 5, { tex: 'fur', ramp: { lo: 0.42 } }), chest: mat(P.chest, 4, { tex: 'fur' }), face: mat(P.face, 4), horn: mat(P.horn, 4), claw: mat('#2a3040', 3) };
    return { w: 46, h: 48, mats: m, parts: [
      cap(10, 16, 6, 30, 4.5, 3.8, 'fur', { z: -5 }), cap(6, 30, 7, 40, 3.8, 3.4, 'fur', { z: -5 }), ell(7.5, 42, 4, 3, 'face', { z: -4 }),
      cap(16, 34, 14, 44, 4.4, 3.6, 'fur', { z: -2 }), ell(14, 45.4, 4.6, 2, 'face', { z: -2, d: 0.5 }),
      ell(21, 25, 12.5, 13, 'fur', { z: 0 }), paint(ell(25, 27, 6.5, 8, 'chest')), cap(27, 34, 30, 44, 4.6, 3.8, 'fur', { z: 2 }), ell(31.5, 45.4, 4.8, 2, 'face', { z: 2, d: 0.5 }),
      ell(24, 11, 8, 7.4, 'fur', { z: 4 }), ell(27, 13, 5.2, 4.6, 'face', { z: 7 }), cap(18, 7, 12, 1, 2.2, 1, 'horn', { z: 5 }), cap(12, 1, 10, 4, 1, 0.6, 'horn', { z: 5 }), cap(28, 6, 34, 1, 2.2, 1, 'horn', { z: 5 }), cap(34, 1, 36.5, 4, 1, 0.6, 'horn', { z: 5 }),
      cap(31, 17, 38, 28, 4.6, 4, 'fur', { z: 8 }), cap(38, 28, 39, 37, 4, 3.6, 'fur', { z: 8 }), ell(39.5, 39.5, 4, 3.2, 'face', { z: 9 }),
    ], post(a) {
      a.rect(24, 10, 2, 2, P.eye); a.rect(28, 10, 2, 2, P.eye); a.px(25, 11, '#100810'); a.px(29, 11, '#100810'); a.line(23, 9, 26, 9, a.ramp('face', 0)); a.line(28, 9, 31, 9, a.ramp('face', 0));
      a.rect(25, 14, 6, 2, '#3a0a18'); fangs(a, [[25, 14], [30, 14], [26, 16], [29, 16]], '#ffffff'); for (const x of [37, 39, 41]) a.px(x, 42, '#ffffff');
    } };
  } },
  wyrm: { big: true, col: { scale: '#b8402a', belly: '#e8b060', wing: '#7a2a24', horn: '#e8dcc0', eye: '#ffe040', mouth: '#3a0a10', spike: '#4a1a18' }, build(P, V) {
    const m = { scale: mat(P.scale, 6, { tex: 'scale' }), scale2: mat(shade(P.scale, 0.62), 5, { tex: 'scale' }), belly: mat(P.belly, 5, { tex: 'belly' }), wing: mat(P.wing, 5, { tex: (x, y) => ((x * 3 + y) % 13 === 0 ? -0.1 : 0) }), wbone: mat(shade(P.scale, 0.8), 4), horn: mat(P.horn, 5), mouth: mat(P.mouth, 3, { flat: 0.3 }), spike: mat(P.spike, 4), claw: mat('#f0e8d8', 3) };
    const C = (pts, r, mm, z) => { const out = []; for (let i = 0; i < pts.length - 1; i++) out.push(cap(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r[i], r[i + 1], mm, { z })); return out; };
    const wing = [[60, 42], [48, 12], [30, 1], [27, 11], [12, 5], [15, 16], [1, 21], [13, 25], [15, 33], [28, 32], [42, 44]];
    const fwing = [[62, 38], [66, 14], [76, 2], [84, 6], [80, 18], [74, 30], [70, 40]];
    const spikes = []; for (let k = 0; k < 6; k++) { const x = 30 + k * 7, y = 38 - (k > 3 ? (k - 3) * 3 : 0); spikes.push(poly([[x - 2.5, y + 2], [x - 0.5, y - 5], [x + 2.5, y + 2]], 'spike', { z: -1, bev: 1 })); }
    return { w: 116, h: 96, mats: m, crease: 2, parts: [
      poly(fwing, 'wing', { z: -20, bev: 2 }), ...C([[62, 38], [66, 14], [76, 2]], [2, 1.6, 1], 'wbone', -19),
      ...C([[70, 64], [76, 76], [74, 88]], [5, 3.6, 3], 'scale2', -14), ell(77, 89, 5, 2.5, 'scale2', { z: -14, d: 0.5 }), ...C([[38, 66], [32, 78], [36, 88]], [6, 4, 3], 'scale2', -14), ell(39, 89, 5.5, 2.5, 'scale2', { z: -14, d: 0.5 }),
      ...C([[30, 60], [18, 70], [10, 82], [22, 90], [36, 92]], [8, 6.5, 4.5, 3, 1.4], 'scale', -6), poly([[33, 92], [42, 88], [40, 95]], 'spike', { z: -5, bev: 1 }), ...[[18, 64], [10, 76]].map(([x, y]) => poly([[x - 3, y + 2], [x - 6, y - 5], [x + 2, y - 1]], 'spike', { z: -7, bev: 1 })),
      poly(wing, 'wing', { z: -4, bev: 2.4 }), cap(60, 42, 48, 12, 3.2, 2.2, 'wbone', { z: -3 }), ...[[30, 1], [12, 5], [1, 21], [15, 33]].map(([x, y]) => cap(48, 12, x, y, 1.5, 0.6, 'wbone', { z: -3 })), poly([[46, 10], [44, 3], [50, 9]], 'claw', { z: -2, bev: 1 }),
      ...spikes, ell(52, 54, 25, 17, 'scale', { z: 0 }), paint(ell(58, 63, 18, 8, 'belly')),
      ell(34, 64, 10, 11, 'scale', { z: 3 }), ...C([[34, 70], [30, 80], [36, 88]], [6, 4.4, 3.4], 'scale', 4), ell(39, 89, 6.5, 3, 'scale', { z: 5, d: 0.5 }),
      ...C([[66, 46], [76, 34], [82, 24]], [11, 8.5, 7], 'scale', 4), paint(cap(72, 46, 84, 28, 4, 3, 'belly')),
      
      ...C([[70, 62], [78, 74], [82, 86]], [6, 4.4, 3.4], 'scale', 10), ell(86, 88, 6.5, 3, 'scale', { z: 10, d: 0.5 }),
      ell(88, 20, 10, 8.5, 'scale', { z: 10 }), cap(92, 20, 108, 24, 6, 4, 'scale', { z: 11 }), cap(90, 28, 104, 33, 3.6, 2.4, 'scale2', { z: 9 }), paint(cap(92, 28, 104, 32, 2, 1.4, 'belly')),
      cut(poly([[95, 26], [110, 26], [106, 31], [96, 31]], null)), poly([[94, 25.5], [108, 26.5], [104, 30], [95, 30]], 'mouth', { z: 8.5, bev: 0.8 }),
      ...C([[84, 13], [74, 6], [66, 4]], [3, 1.8, 0.6], 'horn', 12), ...C([[88, 12], [84, 3], [78, 0.5]], [2.6, 1.6, 0.6], 'horn', 13), poly([[96, 15], [99, 9], [101, 16]], 'spike', { z: 13, bev: 1 }),
    ], post(a) {
      a.rect(93, 16, 4, 2, P.eye); a.px(96, 17, '#200808'); a.px(95, 17, '#200808'); a.line(91, 14, 97, 14.6, a.ramp('scale', 0));
      fangs(a, [[97, 26, 2], [100, 26, 2], [103, 26, 2], [106, 26, 1], [99, 29, -1], [102, 29], [98, 29]], '#fff8e8');
      a.px(107, 21, a.ramp('scale', 0)); a.px(106, 21, a.ramp('scale', 0));
      for (const [x, y] of [[80, 89], [83, 90], [86, 90], [89, 89], [36, 90], [39, 91], [42, 90]]) { a.px(x, y, '#f0e8d8'); a.px(x, y + 1, '#a09880'); }
      if (V.bolt) for (const [x0, y0] of [[46, 50], [58, 48], [40, 60], [64, 56]]) { a.line(x0, y0, x0 + 3, y0 + 3, P.belly); a.line(x0 + 3, y0 + 3, x0 + 1, y0 + 6, P.belly); }
    } };
  } },
  lich: { big: true, col: { robe: '#4a2a7a', robe2: '#2a1a48', trim: '#e0b040', bone: '#e8e0c8', gem: '#5aff8a', eye: '#ff4040', staff: '#5a3a28', orb: '#9a6aff' }, build(P) {
    const m = { robe: mat(P.robe, 5, { tex: 'cloth' }), robe2: mat(P.robe2, 4, { tex: 'cloth' }), trim: mat(P.trim, 5, { spec: '#fff8d0', specAt: 0.9 }), bone: mat(P.bone, 5, { tex: 'bone', ramp: { lo: 0.38 } }), gem: mat(P.gem, 4, { glow: true, lift: 0.25 }), staff: mat(P.staff, 4, { tex: 'rough' }), orb: mat(P.orb, 5, { glow: true, lift: 0.3, ramp: { hi: 0.9 }, nocrease: true }), void: mat('#140c1c', 2, { flat: 0.1 }) };
    const hem = []; for (let k = 0; k <= 10; k++) hem.push([62 - k * 5, 86 + (k % 2 ? -5 : 0) + (k % 3 === 0 ? 2 : 0)]);
    const cape = [[26, 26], [52, 24], [66, 50], [72, 84], ...hem.map(([x, y]) => [x + 3, y + 3]).slice(1, -1), [8, 86], [14, 50]];
    return { w: 84, h: 96, mats: m, crease: 2, parts: [
      poly(cape, 'robe2', { z: -10, bev: 3 }),
      cap(58, 6, 61, 90, 1.6, 1.8, 'staff', { z: -6 }), ell(57.5, 7, 4.6, 4.6, 'orb', { z: -5 }), ...[[52, 12], [64, 12], [58, 0.5]].map(([x, y]) => cap(58, 12, x, y, 0.9, 0.5, 'trim', { z: -4 })),
      cap(30, 30, 22, 44, 4, 3.6, 'robe', { z: -2 }), cap(22, 44, 18, 52, 3.6, 3.2, 'robe', { z: -2 }), ...[[14, 52], [15, 56], [18, 57]].map(([x, y]) => cap(18, 52, x, y, 0.8, 0.5, 'bone', { z: -1 })), ell(16, 47, 4.5, 4.5, 'gem', { z: -1 }),
      poly([[28, 28], [50, 28], [58, 56], [64, 86], ...hem, [14, 84], [22, 56]], 'robe', { z: 0, bev: 3 }),
      paint(poly([[37, 30], [43, 30], [46, 86], [34, 86]], 'robe2')), paint(poly([[36, 30], [37.6, 30], [35, 86], [33, 86]], 'trim')), paint(poly([[42.4, 30], [44, 30], [47, 86], [45, 86]], 'trim')),
      ...[0, 1, 2].map((k) => cap(33, 36 + k * 4, 47, 36 + k * 4, 0.9, 0.9, 'bone', { z: 2 })), cap(28, 50, 52, 50, 1.6, 1.6, 'trim', { z: 3 }), ell(40, 50, 2.6, 2.2, 'gem', { z: 4 }),
      poly([[22, 22], [30, 30], [50, 30], [58, 22], [54, 34], [26, 34]], 'robe2', { z: 4, bev: 2 }), poly([[20, 12], [28, 26], [26, 30], [18, 22]], 'robe', { z: 1, bev: 2 }), poly([[60, 12], [52, 26], [54, 30], [62, 22]], 'robe', { z: 1, bev: 2 }),
      ell(40, 19, 8.5, 9, 'bone', { z: 6 }), ell(41.5, 26, 4.4, 2.3, 'bone', { z: 7, d: 0.6 }), poly([[31, 13], [33, 4], [36, 9], [40, 1], [44, 9], [47, 4], [49, 13]], 'trim', { z: 9, bev: 1.4 }), ell(40, 10.5, 1.6, 1.6, 'gem', { z: 10 }),
      cap(50, 32, 56, 40, 4, 3.4, 'robe', { z: 10 }), cap(56, 40, 58, 33, 3.4, 3, 'robe', { z: 10 }), ...[[56, 28], [59, 27], [61.5, 29]].map(([x, y]) => cap(58.5, 33, x, y, 0.9, 0.6, 'bone', { z: 11 })),
    ], post(a) {
      a.rect(36, 17, 4, 4, '#140c1c'); a.rect(43, 17, 4, 4, '#140c1c'); a.rect(37, 18, 2, 2, P.eye); a.rect(44, 18, 2, 2, P.eye); a.px(37, 18, '#ffd0d0'); a.px(44, 18, '#ffd0d0');
      a.px(41, 22, '#140c1c'); a.px(42, 22, '#140c1c'); for (let x = 38; x <= 46; x += 2) { a.px(x, 26, '#3a2a30'); a.px(x, 27, '#3a2a30'); }
      a.px(56, 5, '#ffffff'); a.px(55, 6, '#ffffff'); a.px(14, 45, '#ffffff');
    } };
  } },
  titan: { big: true, col: { skin: '#9ac8e8', armor: '#4a6aa8', ice: '#c8f4ff', beard: '#e8f8ff', eye: '#ffffff', fur: '#e0e8f0', axe: '#7a5a40' }, build(P) {
    const m = { skin: mat(P.skin, 5, { tex: 'rough' }), armor: mat(P.armor, 6, { spec: '#ffffff', specAt: 0.9, ramp: { hi: 0.7 } }), armor2: mat(shade(P.armor, 0.6), 5), ice: mat(P.ice, 5, { glow: true, lift: 0.12, tex: 'ice', ramp: { hi: 0.9 } }), beard: mat(P.beard, 4, { tex: 'fur' }), fur: mat(P.fur, 5, { tex: 'fur' }), axe: mat(P.axe, 4, { tex: 'rough' }), steel: mat('#b8c8e0', 5, { spec: '#ffffff', ramp: { hi: 0.85 } }) };
    const t = (pts, mm, tilt = [0, 0], z = 0, bev = 2) => poly(pts, mm, { z, tilt, bev });
    return { w: 100, h: 108, mats: m, crease: 2, parts: [
      cap(26, 28, 16, 50, 7, 6, 'skin', { z: -8 }), cap(16, 50, 14, 66, 6, 5.5, 'skin', { z: -8 }), ell(14, 70, 7, 6.5, 'armor2', { z: -7 }),
      cap(36, 72, 32, 90, 8, 7, 'armor2', { z: -6 }), cap(32, 90, 30, 102, 7, 6, 'armor2', { z: -6 }), ell(29, 104, 9, 3.6, 'armor2', { z: -6, d: 0.5 }),
      ell(48, 50, 20, 24, 'skin', { z: 0, d: 0.25 }), t([[30, 30], [66, 28], [70, 52], [62, 66], [34, 66], [26, 52]], 'armor', [-0.1, -0.15], 6, 3), t([[40, 38], [58, 37], [60, 56], [48, 62], [38, 56]], 'armor', [0.15, 0.1], 7, 2),
      ell(48, 47, 4, 4, 'ice', { z: 9 }), t([[28, 64], [70, 64], [72, 76], [26, 76]], 'fur', [0, 0], 8, 2), paint(poly([[26, 69], [72, 69], [72, 72], [26, 72]], 'armor2')),
      cap(58, 74, 64, 90, 8.5, 7.5, 'armor', { z: 5 }), cap(64, 90, 66, 102, 7.5, 6.5, 'armor', { z: 5 }), ell(68, 104, 10, 3.8, 'armor', { z: 6, d: 0.5 }), t([[56, 84], [70, 82], [72, 92], [58, 94]], 'ice', [0.2, -0.2], 7, 1.5),
      t([[20, 24], [36, 16], [42, 28], [30, 36], [18, 34]], 'armor', [-0.3, -0.3], 12), t([[22, 22], [16, 4], [28, 18]], 'ice', [-0.4, 0], 13, 1.5), t([[28, 19], [30, 2], [35, 17]], 'ice', [0.2, -0.2], 13, 1.5),
      ell(50, 20, 11, 11, 'skin', { z: 8, d: 0.4 }), t([[38, 16], [44, 4], [58, 3], [64, 14], [62, 19], [38, 19]], 'armor', [-0.2, -0.35], 14), cap(42, 9, 30, 2, 2.6, 1, 'ice', { z: 15 }), cap(60, 8, 72, 0.5, 2.6, 1, 'ice', { z: 15 }),
      t([[42, 25], [60, 24], [62, 32], [56, 44], [52, 36], [48, 46], [44, 36], [40, 40], [40, 30]], 'beard', [0, 0.2], 15, 1.6),
      t([[60, 26], [78, 20], [84, 32], [72, 40], [62, 38]], 'armor', [0.25, -0.3], 24), t([[76, 22], [86, 6], [84, 26]], 'ice', [0.3, -0.1], 25, 1.5), t([[70, 22], [74, 6], [79, 21]], 'ice', [0, -0.3], 25, 1.5),
      cap(76, 38, 82, 54, 6.5, 6, 'skin', { z: 13 }), cap(82, 54, 86, 64, 6, 5.5, 'skin', { z: 13 }),
      cap(88, 104, 90, 14, 2.2, 2.2, 'axe', { z: 14 }), t([[90, 12], [99, 4], [99, 32], [90, 26]], 'steel', [0.2, -0.1], 15), t([[90, 14], [82, 8], [82, 24], [90, 22]], 'steel', [-0.2, 0], 15), ell(86, 66, 6, 5.5, 'armor', { z: 16 }),
    ], post(a) { a.rect(44, 20, 4, 2, P.eye); a.rect(53, 20, 4, 2, P.eye); a.px(46, 20, '#5ad0ff'); a.px(55, 20, '#5ad0ff'); a.line(42, 18, 48, 19, a.ramp('armor', 0)); a.line(53, 19, 59, 18, a.ramp('armor', 0)); a.rect(46, 26, 8, 2, '#1a2a48'); // plate seams, rivets, frost runes
      a.line(31, 31, 40, 38, a.ramp('armor', 1)); a.line(65, 30, 58, 37, a.ramp('armor', 1)); a.line(38, 57, 47, 62, a.ramp('armor', 1)); a.line(60, 57, 49, 62, a.ramp('armor', 1));
      for (const [x, y] of [[33, 34], [63, 33], [30, 50], [67, 50], [36, 62], [61, 62]]) { a.px(x, y, a.ramp('armor', 5)); a.px(x + 1, y + 1, a.ramp('armor', 0)); }
      for (const [x, y] of [[44, 42], [52, 42], [48, 54]]) { a.px(x, y, P.ice); a.px(x, y + 1, P.ice); a.px(x + 1, y + 2, '#ffffff'); } } };
  } },
};
const ENEMY_VARIANTS = {
  storm_drake: ['wyrm', { scale: '#3a62b8', belly: '#ffe070', wing: '#24306a', horn: '#fff6c8', eye: '#ffffff', spike: '#f4d35e' }, { bolt: true }],
  ghoul: ['zombie', { skin: '#8a8a9a', cloth: '#3a3048', pants: '#2a2a34', hair: '#d8d8e0', eye: '#ff5040' }],
  wraith_elder: ['wraith', { cloak: '#6a3aa0', hand: '#d8c8f0', eye: '#ff70ff' }],
  frost_wraith: ['wraith', { cloak: '#c8e4f4', inner: '#1a2a48', hand: '#ffffff', eye: '#3ad0ff' }],
  gale_wraith: ['wraith', { cloak: '#c8a830', inner: '#2a2010', hand: '#fff6c8', eye: '#ffffff' }],
  bone_mage: ['imp', { skin: '#9a7ac8', wing: '#3a2060', horn: '#f0f0e0', eye: '#a6ffb0', fire: '#5aff8a' }],
  ice_imp: ['imp', { skin: '#5a8ae0', wing: '#2a3a7a', horn: '#ffffff', eye: '#ffffff', fire: '#a8ecff' }],
  thunder_imp: ['imp', { skin: '#e0b030', wing: '#7a5a10', horn: '#ffffff', eye: '#ffffff', fire: '#a8f0ff' }],
  ice_golem: ['golem', { rock: '#8ab8e0', dark: '#5a7aa8', glow: '#c8f4ff' }, { ice: true }],
  bog_slime: ['slime', { goo: '#9a5ad0', mouth: '#2a1040' }],
  mire_wolf: ['wolf', { fur: '#6a8a5a', mane: '#3e5a3a', belly: '#a8b890', eye: '#ffd23a' }],
  ice_wolf: ['wolf', { fur: '#d8ecf8', mane: '#8ac0e0', belly: '#ffffff', eye: '#3ad0ff' }],
  frost_goblin: ['goblin', { skin: '#8ad0e8', cloth: '#4a5a8a', hair: '#e8f4ff', club: '#a8d8f0', eye: '#ffffff' }, { ice: true }],
  storm_bat: ['bat', { fur: '#8a7020', wing: '#e0b830', bone: '#6a5010', eye: '#7af0ff' }],
  skeleton_knight: ['skeleton', { armor: '#4a62a8', shield: '#3a4a7a', trim: '#e0c050', eye: '#7ad8ff' }, { helm: true }],
  frozen_knight: ['skeleton', { bone: '#d8f0ff', armor: '#8ad0f0', shield: '#5a8ab8', trim: '#ffffff', metal: '#c8f0ff', eye: '#3ad0ff' }, { helm: true }],
};
const ECACHE = new Map();
export function enemyArt(id) {
  if (ECACHE.has(id)) return ECACHE.get(id);
  const vr = ENEMY_VARIANTS[id], base = vr ? vr[0] : id, M = MODELS[base]; if (!M) return null;
  const P = { ...M.col, ...(vr ? vr[1] : {}) }, c = render(M.build(P, (vr && vr[2]) || {}));
  ECACHE.set(id, c); return c;
}
export const isBigArt = (id) => !!(MODELS[enemyBase(id)] || {}).big;
export const hasEnemyArt = (id) => !!MODELS[ENEMY_VARIANTS[id] ? ENEMY_VARIANTS[id][0] : id];
export const enemyBase = (id) => (ENEMY_VARIANTS[id] ? ENEMY_VARIANTS[id][0] : id);
export const enemyIds = () => [...Object.keys(MODELS), ...Object.keys(ENEMY_VARIANTS)];

// =====================================================================
// ===== Painted backdrops =====
// =====================================================================
export const BW = 256, BH = 176;
export const BACKDROPS = ['world', 'forest', 'snow', 'swamp', 'dungeon', 'crypt', 'spire', 'storm', 'boss', 'crypt:boss', 'spire:boss', 'storm:boss'];
function painter(w, h, seed) {
  const img = new Uint8ClampedArray(w * h * 4), r = rng(seed);
  const P = {
    w, h, img, r,
    set(x, y, c) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= w || y >= h) return; const i = (y * w + x) * 4; img[i] = c[0]; img[i + 1] = c[1]; img[i + 2] = c[2]; img[i + 3] = 255; },
    get(x, y) { x = clamp(x | 0, 0, w - 1); y = clamp(y | 0, 0, h - 1); const i = (y * w + x) * 4; return [img[i], img[i + 1], img[i + 2]]; },
    blend(x, y, c, a) { if (x < 0 || y < 0 || x >= w || y >= h) return; const o = P.get(x, y); P.set(x, y, [lerp(o[0], c[0], a), lerp(o[1], c[1], a), lerp(o[2], c[2], a)]); },
    // pick from a list of colours with ordered dither: t in [0,1]
    pick(cols, t, x, y, sharp = 1) { const f = clamp(t, 0, 0.9999) * (cols.length - 1), b = Math.floor(f), fr = sharp === 1 ? f - b : clamp((f - b - 0.5) * sharp + 0.5, 0, 1); return cols[Math.min(cols.length - 1, b + (fr > bayer(x, y) ? 1 : 0))]; },
    canvas() { const c = mk(w, h); c.getContext('2d').putImageData(new ImageData(img, w, h), 0, 0); return c; },
  };
  return P;
}
const RG = (list) => list.map(hex2rgb);
function sky(P, y0, y1, cols, stars = 0) {
  const C = RG(cols); for (let y = y0; y < y1; y++) for (let x = 0; x < P.w; x++) P.set(x, y, P.pick(C, (y - y0) / (y1 - y0), x, y, 3));
  for (let i = 0; i < stars; i++) { const x = P.r() * P.w, y = y0 + P.r() * (y1 - y0) * 0.7; P.set(x, y, [255, 255, 240 - P.r() * 60]); }
}
function cloud(P, cx, cy, wdt, hgt, cols, seed) { // cumulus: union of blobs, flat-ish base, lit top-left
  const C = RG(cols), rr = rng(seed), blobs = [];
  for (let i = 0; i < 7; i++) { const t = i / 6; blobs.push([cx - wdt / 2 + t * wdt + (rr() - 0.5) * 6, cy - Math.sin(t * Math.PI) * hgt * 0.45 + (rr() - 0.5) * 3, (0.35 + Math.sin(t * Math.PI) * 0.55) * hgt * (0.8 + rr() * 0.4)]); }
  for (let y = Math.floor(cy - hgt * 1.4); y < cy + hgt * 0.5; y++) for (let x = Math.floor(cx - wdt / 2 - hgt); x < cx + wdt / 2 + hgt; x++) {
    let best = -1, lit = 0; for (const [bx, by, br] of blobs) { const d = Math.hypot(x - bx, (y - by) * 1.2) / br; if (d < 1 && (best < 0 || d < best)) { best = d; lit = ((bx - x) + (by - y)) / br; } }
    if (best < 0 || y > cy + hgt * 0.25 + fbm(x / 5, 0, seed) * 3) continue;
    const t = clamp(0.55 + lit * 0.45 - (y - (cy - hgt * 0.5)) / (hgt * 2.2), 0, 1); P.set(x, y, P.pick(C, t, x, y));
  }
}
function ridge(P, base, amp, freq, seed, cols, o = {}) { // mountain range: faces lit on the left of each peak, gullies, strata, snowcaps
  const C = RG(cols), S = o.snow ? RG(o.snow) : null, hs = [], N = 1.875;
  const rr = rng(seed), peaks = [], n = Math.max(3, Math.round(P.w * freq * 2.4));
  for (let i = 0; i < n; i++) peaks.push([(i + 0.2 + rr() * 0.6) * (P.w + 40) / n - 20, amp * (0.45 + rr() * 0.55), 0.55 + rr() * 0.6, 0.55 + rr() * 0.6]);
  for (let x = -6; x <= P.w + 6; x++) { let v = 0; for (const [px, ph, sl, sr] of peaks) v = Math.max(v, ph - Math.abs(x - px) * (x < px ? sl : sr)); v += (fbm(x / 5, 0.5, seed) - 0.5) * amp * 0.18 + (hash(x, 1, seed) - 0.5) * 1.2; hs.push(base - Math.max(0, v)); }
  const H = (x) => hs[clamp(x + 6, 0, hs.length - 1)];
  for (let x = 0; x < P.w; x++) {
    let sl = 0; for (let k = 1; k <= 5; k++) sl += H(x + k) - H(x - k); sl /= 15; // smoothed slope: >0 = surface descends to the right = faces the light
    const top = H(x), face = clamp(sl * 1.6, -0.38, 0.38);
    for (let y = Math.floor(top); y < (o.bottom ?? base + 2); y++) {
      if (y < 0) continue; const dep = (y - top) / (base - top + 1);
      const gx = x + (y - top) * (face > 0 ? 0.7 : -0.7), gully = (fbm(gx / 2.5, y / 9, seed + 5) - 0.5) * 0.55, strata = Math.sin(y * 0.8 + fbm(x / 7, y / 7, seed) * 5) * 0.06;
      const t = clamp(0.5 + face + gully + strata - dep * 0.3, 0, 1);
      const snowY = (o.snowLine ?? base - amp * 0.55) + fbm(x / 4, y / 6, seed + 3) * 7 + (face < 0 ? 3 : 0);
      if (S && y < snowY && gully > -0.2) P.set(x, y, P.pick(S, clamp(t + 0.15, 0, 1), x, y)); else P.set(x, y, P.pick(C, t, x, y));
    }
  }
  return hs;
}
function hills(P, base, amp, freq, seed, cols, o = {}) {
  const C = RG(cols);
  for (let x = 0; x < P.w; x++) { const top = base - amp * (0.5 + 0.5 * Math.sin(x * freq + seed) * 0.6 + fbm(x * freq * 2, 0, seed) * 0.6); for (let y = Math.floor(top); y < base + (o.extra ?? 4); y++) { const t = clamp(0.75 - (y - top) / (amp + 6) + (fbm(x / 5, y / 5, seed) - 0.5) * 0.3, 0, 1); P.set(x, y, P.pick(C, t, x, y)); } }
}
function treeline(P, base, hgt, cols, seed, o = {}) { // rounded canopy bumps (o.pine for conifers), lit from upper-left
  const C = RG(cols), rr = rng(seed), S = o.snow ? RG(o.snow) : null;
  for (let tx = -6; tx < P.w + 6; tx += o.step ?? 5) {
    const th = hgt * (0.7 + rr() * 0.5), cx = tx + rr() * 3, wd = (o.pine ? th * 0.42 : th * 0.55) * (0.8 + rr() * 0.3);
    for (let y = Math.floor(base - th); y < base + 2; y++) for (let x = Math.floor(cx - wd - 1); x < cx + wd + 1; x++) {
      const k = (y - (base - th)) / th; let half;
      if (o.pine) { const tier = (k * 4) % 1; half = wd * (k * 0.75 + tier * 0.35) ; } else half = wd * Math.sqrt(clamp(1 - Math.pow((k - 0.55) / 0.6, 2), 0, 1)) + (k > 0.55 ? wd * 0.2 : 0);
      if (Math.abs(x - cx) > half) continue;
      const lit = clamp(0.5 - (x - cx) / (wd * 2) - k * 0.35 + (hash(x, y, seed) - 0.5) * 0.35 + ((x + y * 2) % 5 === 0 ? -0.15 : 0), 0, 1);
      if (S && o.pine && (k * 4) % 1 < 0.28 && hash(x, y, 3) < 0.8) P.set(x, y, P.pick(S, lit + 0.2, x, y)); else P.set(x, y, P.pick(C, lit, x, y));
    }
  }
}
// perspective ground plane: f(X,Z,x,y) -> t (0..1) into cols; haze toward the horizon
function ground(P, hy, cols, f, o = {}) {
  const C = RG(cols), haze = o.haze ? hex2rgb(o.haze) : null;
  for (let y = hy; y < P.h; y++) { const dz = y - hy + 1.5, Z = 90 / dz; for (let x = 0; x < P.w; x++) { const X = ((x - P.w / 2) * Z) / 26; let c = P.pick(C, f(X, Z, x, y), x, y); if (haze) { const a = clamp((Z - 4) / 40, 0, o.hazeMax ?? 0.6); c = [lerp(c[0], haze[0], a), lerp(c[1], haze[1], a), lerp(c[2], haze[2], a)]; } P.set(x, y, c); } }
}
const proj = (P, hy, X, Z) => [P.w / 2 + (X * 26) / Z, hy - 1.5 + 90 / Z];
function scatter(P, hy, n, seed, draw) { // world-space props on the ground, nearer = larger; far first
  const rr = rng(seed), items = [];
  for (let i = 0; i < n; i++) { const Z = 2.2 + Math.pow(rr(), 0.7) * 28, X = (rr() - 0.5) * (P.w * Z) / 26 * 1.1; items.push([X, Z, rr()]); }
  items.sort((a, b) => b[1] - a[1]);
  for (const [X, Z, k] of items) { const [x, y] = proj(P, hy, X, Z); if (y < hy || y >= P.h + 4) continue; draw(Math.round(x), Math.round(y), clamp(3.2 / Z, 0.15, 1.5), k); }
}
function tuft(P, x, y, s, cols) { const C = RG(cols), n = Math.max(1, Math.round(s * 4)); for (let k = -n; k <= n; k++) { const hgt = Math.round((n + 1 - Math.abs(k)) * (1 + s) * 0.9); for (let j = 0; j < hgt; j++) P.set(x + k + (j > hgt / 2 ? Math.sign(k) : 0), y - j, C[clamp(Math.round((j / Math.max(1, hgt)) * (C.length - 1) + (k < 0 ? 0.6 : -0.4)), 0, C.length - 1)]); } }
function rock(P, x, y, s, cols, seed = 1) { const C = RG(cols), rw = Math.max(2, s * 7), rh = Math.max(1.5, s * 4.5); for (let j = Math.floor(-rh); j <= 0; j++) for (let k = Math.floor(-rw); k <= rw; k++) { const q = (k / rw) ** 2 + ((j + rh * 0.1) / rh) ** 2; if (q > 1 + (hash(k, j, seed) - 0.5) * 0.25) continue; const t = clamp(0.6 - k / rw * 0.35 + j / rh * 0.45 + (hash(x + k, y + j, seed) - 0.5) * 0.25, 0, 1); P.set(x + k, y + j, P.pick(C, t, x + k, y + j)); } for (let k = Math.floor(-rw); k <= rw; k++) P.blend(x + k, y + 1, [10, 10, 20], 0.35); }
function shadowBand(P, y0, y1, a = 0.3, col = [8, 6, 20]) { for (let y = y0; y < y1; y++) { const t = (y - y0) / (y1 - y0); for (let x = 0; x < P.w; x++) if (bayer(x, y) < (1 - t) * a * 2) P.blend(x, y, col, 0.5); } }
function vignette(P, a = 0.35) { for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) { const dx = (x / P.w - 0.5) * 2, dy = (y / P.h - 0.5) * 2, d = Math.max(0, Math.hypot(dx * 0.85, dy) - 0.75); if (d > 0 && bayer(x, y) < d * a * 3) P.blend(x, y, [6, 4, 14], 0.45); } }
// cave wall: rock texture with ledges, lit from a soft key; cols dark->light
function caveWall(P, y0, y1, cols, seed, o = {}) {
  const C = RG(cols);
  for (let y = y0; y < y1; y++) for (let x = 0; x < P.w; x++) {
    const n = fbm(x / 14, y / 9, seed, 4), n2 = fbm(x / 4, y / 3, seed + 4, 2), ledge = Math.sin(y * 0.35 + n * 9) * 0.5 + 0.5, crack = Math.abs(n - 0.5) < 0.018 ? -0.35 : 0;
    const t = clamp(0.25 + n * 0.55 + (n2 - 0.5) * 0.35 + (ledge > 0.86 ? 0.22 : ledge < 0.12 ? -0.2 : 0) + crack - (o.fade ? Math.pow(1 - (y - y0) / (y1 - y0), 2) * o.fade : 0), 0, 1);
    P.set(x, y, P.pick(C, t, x, y));
  }
}
function stalactites(P, n, maxH, cols, seed, fromY = 0) { const C = RG(cols), rr = rng(seed); for (let i = 0; i < n; i++) { const cx = rr() * P.w, hh = maxH * (0.35 + rr() * 0.65), wd = 2 + rr() * 5; for (let y = fromY; y < fromY + hh; y++) { const half = wd * (1 - (y - fromY) / hh); for (let x = Math.floor(cx - half); x <= cx + half; x++) P.set(x, y, P.pick(C, clamp(0.55 - (x - cx) / (wd * 1.8) - (y - fromY) / hh * 0.2, 0, 1), x, y)); } } }
function stalagmite(P, cx, by, hh, wd, cols) { const C = RG(cols); for (let y = Math.floor(by - hh); y <= by; y++) { const half = wd * Math.pow((y - (by - hh)) / hh, 0.8); for (let x = Math.floor(cx - half); x <= cx + half; x++) P.set(x, y, P.pick(C, clamp(0.62 - (x - cx) / (wd * 1.6) + (hash(x, y, 4) - 0.5) * 0.25, 0, 1), x, y)); } }
function crystal(P, cx, by, hh, wd, lean, cols) { // faceted crystal: lit face / dark face / bright edge
  const C = RG(cols);
  for (let y = Math.floor(by - hh); y <= by; y++) { const k = (y - (by - hh)) / hh, half = k < 0.25 ? wd * (k / 0.25) : wd, cx2 = cx + lean * (1 - k) * hh * 0.3; for (let x = Math.floor(cx2 - half); x <= cx2 + half; x++) { const side = x < cx2 ? 0.78 : 0.32, edge = Math.abs(x - cx2) < 0.6 ? 0.25 : 0; P.set(x, y, P.pick(C, clamp(side + edge - k * 0.25 + (bayer(x, y) - 0.5) * 0.1, 0, 1), x, y)); } }
}
function glow(P, cx, cy, rad, col, a = 0.5) { // soft light pool: banded alpha steps with a thin dithered seam between bands
  const c = hex2rgb(col); for (let y = Math.floor(cy - rad); y <= cy + rad; y++) for (let x = Math.floor(cx - rad); x <= cx + rad; x++) { const d = Math.hypot(x - cx, (y - cy) * 1.1) / rad; if (d >= 1) continue; const f = (1 - d) * 4, b = Math.floor(f) + ((f % 1) > 0.35 + bayer(x, y) * 0.3 ? 1 : 0); if (b > 0) P.blend(x, y, c, Math.min(0.85, b * 0.11 * a * 2)); }
}
function bricks(P, x0, y0, x1, y1, cols, seed, bw = 12, bh = 6) {
  const C = RG(cols);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const row = Math.floor((y - y0) / bh), off = (row % 2) * (bw / 2), bx = Math.floor((x - x0 + off) / bw), lx = (x - x0 + off) % bw, ly = (y - y0) % bh;
    const mortar = lx === 0 || ly === 0, n = hash(bx, row, seed), t = mortar ? 0.05 : clamp(0.35 + n * 0.35 + (ly === 1 ? 0.18 : 0) + (lx === 1 ? 0.1 : 0) - (ly === bh - 1 ? 0.15 : 0) + (fbm(x / 3, y / 3, seed) - 0.5) * 0.3, 0, 1);
    P.set(x, y, P.pick(C, t, x, y));
  }
}
function torch(P, x, y, flame, lights) { // bracket + glow; the flame itself is animated by the stage
  glow(P, x + 0.5, y - 3, 24, flame, 0.6);
  const M = RG(['#140c08', '#3a2a1a', '#6a5034', '#9a7a50']); for (let j = 0; j < 8; j++) { P.set(x, y + j, M[j < 2 ? 3 : 1]); P.set(x + 1, y + j, M[j < 2 ? 2 : 0]); } for (let k = -2; k <= 3; k++) { P.set(x + k, y, M[k < 1 ? 3 : 2]); P.set(x + k, y + 1, M[0]); } P.set(x - 2, y - 1, M[2]); P.set(x + 3, y - 1, M[1]);
  lights.push([x, y - 1, flame]);
}
function pool(P, cx, cy, rw, rh, cols, skyCol) { const C = RG(cols), S = skyCol ? hex2rgb(skyCol) : null; for (let y = Math.floor(cy - rh); y <= cy + rh; y++) for (let x = Math.floor(cx - rw); x <= cx + rw; x++) { const q = ((x - cx) / rw) ** 2 + ((y - cy) / rh) ** 2; if (q > 1 + (hash(x, y, 7) - 0.5) * 0.1) continue; let c = P.pick(C, clamp(0.3 + (y - cy) / rh * -0.3 + (q > 0.75 ? 0.35 : 0), 0, 1), x, y); if (S && q < 0.7 && hash(Math.floor(x / 3), y, 9) < 0.12 && (x % 3)) c = S; P.set(x, y, c); } }

const BDCACHE = new Map();
export function backdrop(kind) {
  if (BDCACHE.has(kind)) return BDCACHE.get(kind).c;
  const out = paintBackdrop(kind); BDCACHE.set(kind, out); return out.c;
}
export function backdropInfo(kind) { backdrop(kind); return BDCACHE.get(kind); }
function paintBackdrop(kind) {
  const [base, mode] = kind.split(':'), boss = mode === 'boss', P = painter(BW, BH, base.length * 97 + (boss ? 5 : 0)), lights = [], info = { horizon: 74, lights, kind: base, boss };
  const W = BW, H = BH, hy = 74;
  if (base === 'world' || !BD_FNS[base]) BD_FNS.world(P, hy, lights, boss, info);
  else BD_FNS[base](P, hy, lights, boss, info);
  info.c = P.canvas(); return info;
}
const GRASS = ['#1a4228', '#245e2c', '#347a32', '#4c963a', '#6cae44', '#94c856'];
const BD_FNS = {
  world(P, hy, L) {
    sky(P, 0, hy, ['#2a58c8', '#3a74dc', '#4f90e8', '#70acf0', '#98c8f4', '#c4e2f8', '#e8f4f8']);
    cloud(P, 46, 22, 44, 14, ['#8aa4d8', '#b8ccec', '#e0ecf8', '#ffffff'], 3); cloud(P, 170, 14, 56, 16, ['#8aa4d8', '#b8ccec', '#e0ecf8', '#ffffff'], 8); cloud(P, 232, 34, 30, 9, ['#9ab4e0', '#c8d8f0', '#f0f6fc'], 11); cloud(P, 112, 40, 26, 7, ['#9ab4e0', '#c8d8f0', '#f0f6fc'], 15);
    ridge(P, hy - 6, 30, 0.012, 21, ['#4a5a98', '#5a6eac', '#7088c0', '#8aa0d0', '#a8bce0'], { snow: ['#a8bce0', '#d0dcf0', '#f4f8ff'], snowLine: hy - 26 });
    hills(P, hy - 2, 12, 0.03, 4, ['#2a6a4a', '#3a7a48', '#4a8c4a', '#5c9e50']);
    treeline(P, hy + 2, 11, ['#123a26', '#1e5230', '#2c6a36', '#3e843e', '#5aa04a'], 31, { step: 4 });
    ground(P, hy + 1, GRASS, (X, Z, x, y) => { const n = fbm(X * 1.1, Z * 1.6, 5, 4), m = fbm(X * 0.25, Z * 0.35, 6, 2); return 0.12 + n * 0.5 + m * 0.35 + ((hash(Math.floor(X * 6), Math.floor(Z * 8), 1) < 0.1) ? 0.14 : 0) + Math.min(0.12, Z * 0.01); }, { haze: '#90b8c8', hazeMax: 0.45 });
    // dirt path (drawn as a second pass over pixels marked by t<0)
    const D = RG(['#6a4a2a', '#8a6a3c', '#a88a52', '#c8a868']);
    for (let y = hy + 1; y < P.h; y++) { const dz = y - hy - 1 + 1.5, Z = 90 / dz; for (let x = 0; x < P.w; x++) { const X = ((x - P.w / 2) * Z) / 26, d = Math.abs(X - 2.6 - Math.sin(Z * 0.18) * 3 - Z * 0.08), wdt = 0.75 + Z * 0.012; if (d < wdt) P.set(x, y, P.pick(D, clamp(0.75 - d / wdt * 0.5 + (fbm(X, Z * 2, 9) - 0.5) * 0.5, 0, 1), x, y)); } }
    scatter(P, hy + 1, 260, 77, (x, y, s, k) => { if (k < 0.08) rock(P, x, y, s, ['#3a3a48', '#5a5a68', '#8a8a96', '#b8b8c0'], x); else if (k < 0.2) { const c = ['#ffffff', '#f4d35e', '#ee80a8', '#c8a0ff'][Math.floor(k * 40) % 4]; P.set(x, y - 1, hex2rgb(c)); if (s > 0.5) { P.set(x + 1, y - 1, hex2rgb(c)); P.set(x, y, hex2rgb('#2a6a2e')); } } else tuft(P, x, y, s, ['#2a6a2e', '#4a9a3a', '#7cc04a', '#b8e870']); });
  },
  forest(P, hy, L) {
    sky(P, 0, hy, ['#5a9ad0', '#7ab8e0', '#a8d4ec', '#d8ecf0']);
    treeline(P, hy - 4, 40, ['#1a3a3a', '#24504a', '#2e6450', '#3e7a58'], 41, { step: 9 });
    const T = RG(['#1a120c', '#2e2016', '#4a3420', '#6a4c2e', '#8a6a42']);
    for (const [tx, tw] of [[12, 9], [58, 6], [92, 5], [150, 7], [204, 6], [238, 10], [124, 4], [180, 4]]) for (let y = 0; y < hy + 6; y++) for (let x = tx - tw; x <= tx + tw; x++) P.set(x, y, P.pick(T, clamp(0.75 - (x - tx + tw) / (tw * 2) * 0.8 + ((x * 7 + (y >> 2)) % 9 === 0 ? -0.2 : 0), 0, 1), x, y));
    treeline(P, hy + 8, 12, ['#0e2416', '#18361e', '#244a28', '#326034'], 47, { step: 5 });
    treeline(P, 30, 30, ['#0c2a1a', '#16402a', '#22583a', '#33704a', '#4a8c58'], 43, { step: 8 });
    for (let y = 0; y < 18; y++) for (let x = 0; x < P.w; x++) if (fbm(x / 9, y / 5, 3) > 0.35 + y / 40) P.set(x, y, P.pick(RG(['#0a2014', '#14361f', '#1e4c2c', '#2e6a3c']), clamp(fbm(x / 3, y / 3, 6) - y / 40, 0, 1), x, y));
    ground(P, hy + 6, ['#1a3a1e', '#24502a', '#336a32', '#4a843e', '#6aa04a'], (X, Z) => 0.15 + fbm(X * 1.2, Z * 1.6, 9, 4) * 0.55 + fbm(X * 0.3, Z * 0.4, 3, 2) * 0.35, { haze: '#5a8a6a', hazeMax: 0.5 });
    for (let k = 0; k < 4; k++) { const x0 = 40 + k * 55; for (let y = 0; y < P.h; y++) for (let x = x0 + y * 0.45; x < x0 + 9 + y * 0.45; x++) if (bayer(x | 0, y) < 0.16) P.blend(x | 0, y, [255, 250, 200], 0.45); }
    scatter(P, hy + 6, 220, 78, (x, y, s, k) => { if (k < 0.07) rock(P, x, y, s, ['#2a3a2a', '#4a5a40', '#6a7a58', '#8a9a70'], x); else if (k < 0.14) { P.set(x, y - 1, hex2rgb('#e85a4a')); P.set(x, y, hex2rgb('#f0e8d8')); } else tuft(P, x, y, s, ['#1a4a22', '#2e6a2e', '#4e8c3a', '#7ab04a']); });
  },
  snow(P, hy, L) {
    sky(P, 0, hy, ['#5a6aa0', '#7a8cbc', '#9aaed4', '#bccce4', '#dce6f2', '#f0f4f8']);
    cloud(P, 60, 20, 60, 12, ['#9aa8c8', '#c0cce0', '#e4ecf6'], 4); cloud(P, 196, 28, 50, 10, ['#9aa8c8', '#c0cce0', '#e4ecf6'], 9);
    ridge(P, hy - 4, 42, 0.013, 23, ['#28345e', '#384874', '#4a5c8a', '#6478a4'], { snow: ['#8aa0c8', '#b8cae6', '#e8f0fa', '#ffffff'], snowLine: hy - 30 });
    ridge(P, hy + 2, 16, 0.02, 25, ['#5a6c9c', '#7084b0', '#8ea0c8'], { snow: ['#a8bcdc', '#d0dcf0', '#ffffff'], snowLine: hy - 8 });
    treeline(P, hy + 3, 18, ['#14283a', '#1e3a4a', '#2a4e5a', '#3a646a'], 51, { pine: true, step: 6, snow: ['#a8bcd8', '#d8e4f4', '#ffffff'] });
    ground(P, hy + 3, ['#7a8cc0', '#98aad4', '#b8c8e4', '#d8e4f4', '#f0f6fc', '#ffffff'], (X, Z) => { const drift = Math.sin(X * 0.6 + fbm(X * 0.3, Z * 0.6, 2) * 6) * 0.5 + 0.5; return 0.4 + drift * 0.3 + (fbm(X * 1.6, Z * 2, 7, 3) - 0.5) * 0.4; }, { haze: '#d0dcf0', hazeMax: 0.5 });
    scatter(P, hy + 3, 120, 79, (x, y, s, k) => { if (k < 0.15) rock(P, x, y, s, ['#3a4a6a', '#5a6a88', '#8a9ab8', '#e8f0fa'], x); else if (k < 0.3) tuft(P, x, y, s * 0.7, ['#4a5a6a', '#7a8a98', '#c8d4e4']); else if (s > 0.4) P.set(x, y, [255, 255, 255]); });
  },
  swamp(P, hy, L) {
    sky(P, 0, hy, ['#2a3a3a', '#3a4c40', '#4e6248', '#6a7c58', '#8a9a6a', '#a8b480']);
    treeline(P, hy - 2, 26, ['#1a261e', '#223428', '#2c4230', '#36503a'], 61, { step: 7 });
    const D = RG(['#0e1410', '#1a2418', '#28341f']); for (const [tx, th] of [[30, 50], [196, 58], [120, 36], [236, 40]]) { for (let y = hy - th; y < hy + 2; y++) for (let x = tx - 2; x <= tx + 2; x++) P.set(x, y, D[x < tx ? 1 : 0]); for (const [dx, dy, l] of [[-1, 0.3, 14], [1, 0.45, 12], [-1, 0.65, 9], [1, 0.75, 8]]) for (let k = 0; k < l; k++) { P.set(tx + dx * (2 + k), hy - th * (1 - dy) - k * 0.6, D[0]); P.set(tx + dx * (2 + k), hy - th * (1 - dy) - k * 0.6 + 1, D[1]); } }
    ground(P, hy + 2, ['#1a2a1e', '#24382a', '#2e4a32', '#3e5e3a', '#56724a'], (X, Z) => 0.15 + fbm(X * 1.1, Z * 1.5, 11, 4) * 0.6 + fbm(X * 0.3, Z * 0.4, 1, 2) * 0.3, { haze: '#7a8a68', hazeMax: 0.55 });
    for (const [cx, cy, rw, rh] of [[70, 112, 40, 8], [190, 132, 46, 10], [40, 158, 30, 7], [150, 95, 30, 4], [230, 100, 24, 4]]) pool(P, cx, cy, rw, rh, ['#16242a', '#1e3440', '#2a4a58', '#5a7a70'], '#8a9a6a');
    scatter(P, hy + 2, 140, 80, (x, y, s, k) => { if (k < 0.35) { const C = RG(['#2a3a1e', '#4a5a2a', '#6a7a3a', '#a89a5a']), n = Math.round(4 + s * 9); for (let j = 0; j < n; j++) { P.set(x, y - j, C[j > n - 3 ? 3 : 1]); if (j < n - 2) P.set(x + 2, y - j + 1, C[0]); } } else tuft(P, x, y, s, ['#1e3020', '#34502e', '#56703e', '#7a8a48']); });
    shadowBand(P, hy + 2, hy + 20, 0.25, [140, 160, 120]);
  },
  dungeon(P, hy, L, boss, info) {
    caveWall(P, 0, hy + 8, ['#14101c', '#221c2e', '#30283e', '#40364e', '#544862', '#6a5e78'], 71, { fade: 0.4 });
    stalactites(P, 26, 26, ['#0e0a14', '#1e1828', '#30283c', '#463c54'], 72);
    for (const [cx, hh, col] of [[24, 34, 'v'], [206, 40, 'b'], [240, 24, 'v'], [62, 20, 'b'], [128, 14, 'v']]) { const cols = col === 'v' ? ['#3a1a6a', '#6a3aa8', '#a070e0', '#d8b8ff', '#ffffff'] : ['#1a3a7a', '#2a6ab8', '#4aa0e8', '#a8e0ff', '#ffffff']; glow(P, cx, hy + 6 - hh / 2, hh + 6, col === 'v' ? '#a070e0' : '#4aa0e8', 0.45); crystal(P, cx, hy + 9, hh, 4, -0.4, cols); crystal(P, cx + 7, hy + 9, hh * 0.6, 3, 0.7, cols); crystal(P, cx - 6, hy + 9, hh * 0.45, 2.5, -1, cols); crystal(P, cx + 3, hy + 10, hh * 0.3, 2, 0.2, cols); }
    torch(P, 92, 34, '#ffb23a', L); torch(P, 164, 34, '#ffb23a', L);
    ground(P, hy + 8, ['#18141e', '#241e2c', '#322a3a', '#433a4c', '#5a5064'], (X, Z) => { const tiles = (Math.abs(((X * 0.4) % 1 + 1) % 1 - 0.5) < 0.03 || Math.abs(((Z * 0.5) % 1 + 1) % 1 - 0.5) < 0.04) ? -0.25 : 0; return 0.25 + fbm(X * 1.4, Z * 1.8, 13, 4) * 0.6 + tiles * 0.5; }, { haze: '#2a2238', hazeMax: 0.5 });
    scatter(P, hy + 8, 60, 81, (x, y, s, k) => { if (k < 0.5) rock(P, x, y, s, ['#1a1622', '#332c3e', '#4e4458', '#6a6074'], x); else if (k < 0.62 && s > 0.3) crystal(P, x, y, 6 * s + 3, 1.5, 0.3, ['#3a1a6a', '#6a3aa8', '#a070e0', '#e8d0ff']); });
    stalagmite(P, 6, hy + 30, 34, 7, ['#14101c', '#2a2236', '#3e344c', '#544862']); stalagmite(P, 250, hy + 36, 42, 8, ['#14101c', '#2a2236', '#3e344c', '#544862']);
    shadowBand(P, hy + 8, hy + 22, 0.4); vignette(P, 0.4);
  },
  crypt(P, hy, L, boss) {
    bricks(P, 0, 0, P.w, hy + 10, ['#0c1410', '#16221c', '#203028', '#2c3e34', '#3a4e42', '#4a5e50'], 91, 14, 7);
    const A = RG(['#060a08', '#0a120e', '#142018']);
    for (const ax of boss ? [128] : [44, 128, 212]) { const aw = boss ? 34 : 22, top = boss ? 10 : 18; for (let y = top; y < hy + 10; y++) for (let x = ax - aw; x <= ax + aw; x++) { const ry = y - (top + aw * 0.9); if (ry < 0 && Math.hypot((x - ax) / aw, ry / (aw * 0.9)) > 1) continue; P.set(x, y, P.pick(A, clamp(0.2 + (y - top) / (hy - top) * 0.6 + (bayer(x, y) - 0.5) * 0.1, 0, 1), x, y)); }
      const S = RG(['#1a2a22', '#3a4e42', '#5a7060', '#7a9080']); for (let y = top - 2; y < hy + 10; y++) for (const dx of [-aw - 4, aw + 1]) for (let k = 0; k < 4; k++) P.set(ax + dx + k, y, S[k === 0 ? 0 : k === 1 ? 3 : 2]); }
    if (boss) { const G = RG(['#2a1a10', '#5a3a1a', '#a07a30', '#e0c060', '#fff0a0']); for (let y = 30; y < hy + 10; y++) for (let x = 112; x <= 144; x++) { const k = (y - 30) / (hy - 20); if (Math.abs(x - 128) > 8 + k * 8) continue; P.set(x, y, P.pick(G, clamp(0.25 + (128 - x) / 40 + (y < 36 ? 0.4 : 0), 0, 1), x, y)); } glow(P, 128, 50, 40, '#6aff8a', 0.4); }
    torch(P, boss ? 84 : 86, 30, '#6aff8a', L); torch(P, boss ? 172 : 170, 30, '#6aff8a', L);
    ground(P, hy + 10, ['#0e1612', '#18241e', '#24342a', '#304438', '#405848'], (X, Z) => { const fx = ((X * 0.35) % 1 + 1) % 1, fz = ((Z * 0.45) % 1 + 1) % 1, grout = fx < 0.06 || fz < 0.08 ? -0.35 : 0; return 0.35 + fbm(X * 1.4, Z * 2, 15, 3) * 0.45 + grout; }, { haze: '#1a2a22', hazeMax: 0.5 });
    for (const [cx, cy, rw, rh] of [[60, 130, 50, 9], [200, 150, 44, 10], [130, 104, 34, 4]]) pool(P, cx, cy, rw, rh, ['#081210', '#0e2220', '#16342e', '#3a6a58'], '#2a5a48');
    if (!boss) for (const gx of [24, 100, 160, 230]) { const S = RG(['#101a14', '#26342c', '#3e5046', '#5a6e60']), gy = hy + 14 + (gx % 7); for (let y = gy - 10; y < gy; y++) for (let x = gx - 4; x <= gx + 4; x++) { if (y < gy - 8 && Math.hypot(x - gx, y - (gy - 8)) > 4) continue; P.set(x, y, P.pick(S, clamp(0.7 - (x - gx + 4) / 10 + (hash(x, y) - 0.5) * 0.3, 0, 1), x, y)); } }
    vignette(P, 0.45);
  },
  spire(P, hy, L, boss) {
    const IC = ['#1a2a5a', '#2a4482', '#3a62a8', '#5a88c8', '#88b4e0', '#bce0f4', '#ffffff'];
    sky(P, 0, hy + 10, ['#1a2a5a', '#24407a', '#2e5694', '#4a76b4', '#6a98cc']);
    for (let k = 0; k < 9; k++) { const cx = 10 + k * 30 + (k % 2) * 8, wd = 8 + (k % 3) * 3, top = (k % 2 ? 6 : -4); const C = RG(IC); for (let y = Math.max(0, top); y < hy + 10; y++) for (let x = cx - wd; x <= cx + wd; x++) { const u = (x - cx) / wd; P.set(x, y, P.pick(C, clamp(0.55 - u * 0.4 + (Math.abs(u) > 0.8 ? 0.3 : 0) + (((x - y * 0.3) | 0) % 7 === 0 ? 0.25 : 0) - (k % 2 ? 0.25 : 0), 0, 1), x, y)); } }
    for (let i = 0; i < 18; i++) crystal(P, 6 + i * 14.5, 0 + 30 + (i % 3) * 6, 30 + (i % 3) * 6, 3, 0, ['#2a4482', '#5a88c8', '#a8d4f0', '#ffffff']);
    for (let y = 0; y < 28; y++) for (let x = 0; x < P.w; x++) { const hgt = 6 + Math.abs(Math.sin(x * 0.7) * 10) + hash(x, 0, 5) * 10; if (y < hgt) P.set(x, y, P.pick(RG(IC.slice(0, 5)), clamp(0.6 - y / hgt * 0.5 + (x % 3 === 0 ? 0.2 : 0), 0, 1), x, y)); }
    if (boss) { glow(P, 128, 40, 56, '#bce0f4', 0.55); crystal(P, 128, hy + 10, 64, 9, 0, IC.slice(1)); crystal(P, 112, hy + 10, 40, 5, -0.4, IC.slice(1)); crystal(P, 144, hy + 10, 40, 5, 0.4, IC.slice(1)); }
    torch(P, 74, 36, '#8ad8ff', L); torch(P, 182, 36, '#8ad8ff', L);
    ground(P, hy + 10, ['#2a4482', '#3a62a8', '#5a88c8', '#88b4e0', '#bce0f4', '#e8f6ff'], (X, Z, x, y) => { const fx = ((X * 0.3) % 1 + 1) % 1, fz = ((Z * 0.4) % 1 + 1) % 1, seam = fx < 0.05 || fz < 0.07 ? -0.3 : 0; return 0.45 + seam + (fbm(X * 1.2, Z * 1.6, 17, 3) - 0.5) * 0.4 + ((x - y) % 23 === 0 && hash(x >> 3, y >> 2) < 0.4 ? 0.25 : 0); }, { haze: '#6a98cc', hazeMax: 0.4 });
    for (let y = hy + 10; y < hy + 40; y++) for (let x = 0; x < P.w; x++) { const src = P.get(x, 2 * (hy + 10) - y); if (bayer(x, y) < 0.35 * (1 - (y - hy - 10) / 30)) P.blend(x, y, src, 0.5); } // glossy reflection
    scatter(P, hy + 10, 30, 82, (x, y, s, k) => crystal(P, x, y, 10 * s + 3, 1 + s * 2, (k - 0.5), ['#2a4482', '#5a88c8', '#a8d4f0', '#ffffff']));
    vignette(P, 0.3);
  },
  storm(P, hy, L, boss) {
    sky(P, 0, hy, ['#0c0e22', '#141a36', '#1e2648', '#2a345e', '#3a4676']);
    for (let i = 0; i < 6; i++) cloud(P, 20 + i * 46, 14 + (i % 2) * 14, 50, 14, ['#14182e', '#232a48', '#343e66', '#4a5684'], 30 + i);
    const B = RG(['#fff6a0', '#ffffff']); { let x = 180, y = 0; while (y < hy - 20) { const nx = x + (hash(y, 3) - 0.5) * 10, ny = y + 3; for (let k = 0; k <= 3; k++) { P.set(lerp(x, nx, k / 3), lerp(y, ny, k / 3), B[1]); P.set(lerp(x, nx, k / 3) + 1, lerp(y, ny, k / 3), B[0]); } x = nx; y = ny; } glow(P, 180, 12, 36, '#a8b8ff', 0.4); }
    if (!boss) { // cavern mouth opening onto the storm: rock wall everywhere outside a ragged ellipse
      const keep = P.img.slice(); caveWall(P, 0, hy + 8, ['#0a0c18', '#141828', '#1e2438', '#2a3248', '#3a4460'], 101, {});
      for (let y = 0; y < hy + 8; y++) for (let x = 0; x < P.w; x++) { const cx = (x - 150) / 86, cy = (y - 58) / 52, q = cx * cx + cy * cy + (fbm(x / 7, y / 7, 4) - 0.5) * 0.5; const i = (y * P.w + x) * 4; if (q < 1) { P.img[i] = keep[i]; P.img[i + 1] = keep[i + 1]; P.img[i + 2] = keep[i + 2]; } else if (q < 1.12) P.set(x, y, [8, 8, 16]); else if (q < 1.25 && bayer(x, y) < 0.5) P.blend(x, y, [120, 130, 200], 0.25); }
      stalactites(P, 16, 22, ['#06080e', '#10141e', '#1e2438', '#2a3248'], 102);
    }
    ridge(P, hy + 4, 26, 0.016, 107, ['#0e1020', '#181c32', '#242a46', '#323a5c'], { bottom: hy + 8 });
    ground(P, hy + 6, ['#10121e', '#1a1e30', '#262c44', '#343c58', '#46506e'], (X, Z) => 0.25 + fbm(X * 1.3, Z * 1.8, 19, 4) * 0.6 + (Math.abs(fbm(X * 0.2, Z * 0.2, 4) - 0.5) < 0.02 ? 0.4 : 0), { haze: '#2a345e', hazeMax: 0.5 });
    for (const [cx, cy, rw, rh] of [[80, 120, 40, 6], [196, 146, 40, 8]]) pool(P, cx, cy, rw, rh, ['#0a0e1a', '#141c30', '#22304e', '#5a6aa0'], '#a8b8ff');
    scatter(P, hy + 6, 50, 83, (x, y, s, k) => { if (k < 0.6) rock(P, x, y, s, ['#0e1020', '#22283e', '#3a4460', '#58648a'], x); else if (s > 0.25) crystal(P, x, y, 8 * s + 3, 1.5, 0.2, ['#5a4a10', '#c0a020', '#fff27a', '#ffffff']); });
    torch(P, 40, 42, '#ffe45a', L); torch(P, 216, 42, '#ffe45a', L);
    vignette(P, 0.35);
  },
  boss(P, hy, L) { // Ashen Wyrm's lair: lava cavern
    caveWall(P, 0, hy + 8, ['#0a0408', '#140a10', '#201016', '#2e181c', '#402420', '#563226'], 111, {});
    stalactites(P, 22, 30, ['#060206', '#120810', '#22101a', '#341a20'], 112);
    for (let y = hy - 20; y < hy + 8; y++) for (let x = 0; x < P.w; x++) { const a = (y - (hy - 20)) / 28; if (bayer(x, y) < a * 0.4) P.blend(x, y, [255, 110, 30], 0.25); }
    const LV = RG(['#6a1008', '#b02a0a', '#e85a10', '#ff9a2a', '#ffd25a', '#fff2a0']);
    ground(P, hy + 8, ['#0c0608', '#160c10', '#221418', '#301e1e', '#422a24'], (X, Z) => 0.2 + fbm(X * 1.3, Z * 1.8, 23, 4) * 0.65, { haze: '#5a2010', hazeMax: 0.45 });
    for (let y = hy + 8; y < P.h; y++) { const Z = 90 / (y - hy - 8 + 1.5); for (let x = 0; x < P.w; x++) { const X = ((x - P.w / 2) * Z) / 26, rv = Math.abs(X + 18 - Math.sin(Z * 0.3) * 6 - Z * 0.8), wd = 3 + 3 / Z; if (rv < wd) { const t = clamp(0.95 - rv / wd * 0.7 + (fbm(X * 0.8, Z * 1.6 + 3, 2) - 0.5) * 0.6, 0, 1); P.set(x, y, P.pick(LV, t, x, y)); } else if (rv < wd + 1.2) P.set(x, y, LV[0]); } }
    for (let y = hy + 8; y < P.h; y++) for (let x = 0; x < 110; x++) if (bayer(x, y) < 0.08) P.blend(x, y, [255, 120, 40], 0.3);
    stalagmite(P, 10, hy + 40, 52, 10, ['#0c0406', '#2a0e0c', '#4a1c14', '#6e2c1a']); stalagmite(P, 244, hy + 30, 40, 9, ['#0c0406', '#2a0e0c', '#4a1c14', '#6e2c1a']);
    scatter(P, hy + 8, 40, 84, (x, y, s) => rock(P, x, y, s, ['#14080a', '#3a1a14', '#5a2a1a', '#8a4a2a'], x));
    vignette(P, 0.4); L.push(['lava']);
  },
};
