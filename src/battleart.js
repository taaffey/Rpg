// ===== 16-bit battle art: shaded-primitive sprite engine, side-view party, large enemies, painted backdrops =====
// Everything is generated in code and cached. Sprites are modelled as shaded primitives (ellipsoids, tapered
// capsules, bevelled polygons) that are z-buffered, lit from the upper left, quantised onto hue-shifted
// 3-6 tone ramps with a little ordered dither, creased where parts overlap, rim-lit and outlined (sel-out).
// Small details (faces, eyes, teeth, trims) are stamped as pixels on top.

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
// slide whole parts down by dy (room above a model for horns/antlers)
const shiftAll = (parts, dy) => (dy ? parts.map((p) => ({ ...p, bb: [p.bb[0], p.bb[1] + dy, p.bb[2], p.bb[3] + dy], f: (px, py, hit) => p.f(px, py - dy, hit) })) : parts);
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
// THE SILLY PASS. The twelve callings are silly archetypes (job ids unchanged): knight = Bouncer, rogue = Chancer, mage = Spreadsheet
// Sorcerer, cleric = Barmaid, monk = Gym Bro, ranger = Darts Player, hexer = Influencer, bard = Busker, berserker = Stag Do Lad,
// alchemist = Home Brewer, samurai = Angry Chef, paladin = Traffic Warden (+ bloke, the jobless intro class).
// A hero = class outfit (CLS) + a person's look (BA_LOOKS: hair, skin, beard) + the weapon art for the equipped weapon TYPE (ART).
// Heads are stamps facing left, bottom-aligned on the chin: a base (the person's hair) + headgear / glasses overlays + the beard,
// so Adam's beard, Devon's bush and Wendell's walrus show under any hat, cone or pair of shades. Clothes never change with the look.
// Stamp letters: H h j W = hair (bases) or headgear (overlays) light..dark, R r = hair, F f g = skin, e = eye, A a = accent,
// S k = shades / black, w = glint, c = cord, P p = pale (pom-pom, white stripes), Y = flushed skin, m = brass, G = glass, Q = leaf
const HEADS = {
  short: { ax: 6, rows: ['..HHHHH...', '.HWHHhhhh.', 'HWHhhhhhhj', 'HHhhhhhhjj', 'hFFFhhhhjj', 'FeFFfghhj.', 'FeFFfgjhj.', '.FFffgj...', '..fgg.....'] },
  messy: { ax: 6, rows: ['.H..H.H...', '..HHHHHHh.', '.HWHHhhhhj', 'HWHhhhhhhj', 'HHhhhhhhjj', 'hFhFhhhhjj', 'FeFFfghhjj', 'FeFFfgjhj.', '.FFffgj...', '..fgg.....'] },
  buzz: { ax: 6, rows: ['...hhhh...', '.hHHHhhhh.', 'hHHhhhhhhj', 'hHhhhhhhjj', 'hFFhhhhhjj', 'FeFFfghhj.', 'FeFFfgjhj.', '.FFffgj...', '..fgg.....'] },
  quiff: { ax: 6, rows: ['.HW.......', 'HWHHH.....', 'HHHWHHhh..', 'HWHHHhhhhj', 'HHhhhhhhjj', 'hFFFhhhhjj', 'FeFFfghhj.', 'FeFFfgjhj.', '.FFffgj...', '..fgg.....'] },
  bun: { ax: 6, rows: ['......HHh.', '.....HWhhj', '...HHHhhj.', '.HHWhhhhh.', 'HHhhhhhhjj', 'hFFFFhhhjj', 'FeFFfghjj.', 'FeFFfgjhj.', '.FFffgjj..', '..fgg.....'] },
  bald: { ax: 6, rows: ['...FFFF...', '.FFFFFffg.', 'FFFFFfffgg', 'FFFfffffgg', 'FFFFffrRrg', 'FeFFfgRrr.', 'FeFFfgRr..', '.FFffgr...', '..fgg.....'] },
  beanie: { ax: 6, rows: ['...HHHH...', '..HWHHhhh.', '.HWHhhhhhj', 'HWHhhhhhhj', 'jhjhjhjhjj', 'RFFFFRrrr.', 'FeFFfgRrr.', 'FeFFfgrr..', '.FFffgr...', '..fgg.....'] },
};
const HAIRBASE = new Set(['short', 'messy', 'buzz', 'quiff', 'bun', 'bald']); // stamps whose H h j W are hair, not headgear
// overlays: canonical 9-row head (row 0 = top of the skull, 5-6 = eyes, 8 = chin); dx shifts left/right, y0 = first row
const OVER = {
  shades: { y0: 5, rows: ['SSSSkkkk..', 'SwSS......'] },
  bigshades: { y0: 4, rows: ['SSSSSkkkk.', 'SSSSSS....', 'SwSSSS....', '.SSSS.....'] },
  specs: { y0: 4, rows: ['kkkk......', 'k..kkkkk..', 'k..k......', 'kkkk......'] },
  earpiece: { y0: 6, rows: ['......w...', '......c...', '......c...', '.....c....', '.....c....'] },
  sweat: { y0: 4, rows: ['AAAAAAAAaa'] },
  flatcap: { dx: -2, y0: -1, rows: ['...HHHHHH...', '..HWHHHHhhj.', '.HWHHHHHhhhj', '.HHHHHHHhhhj', 'jjjjjjjHhhhj', '.jjjj.......'] },
  wiz: { y0: -3, rows: ['........Hj.', '.......HHj.', '......HHhj.', '.....HWhhj.', '....HHhhhj.', '...HHAAAAj.', 'HHHHhhhhhhj'] },
  postit: { y0: 0, rows: ['.....PP...', '.....Pp...'] },
  bobble: { y0: -3, rows: ['...PPpp...', '...PPpp...', '..HHHHHh..', '.HWHHHhhj.', 'HWHHHhhhhj', 'HHHHhhhhhj', 'HhHhHhHhHj'] },
  goggles: { y0: 4, rows: ['mGGm......', '.QQ.......'] },
  toque: { y0: -3, rows: ['..HWHHHh..', '.HWHHHHhh.', 'HWHHHHHhhj', 'HHHHHhHhhj', '.HHhHHhhj.', '.HHHHhhhj.', '.hhhhhhhj.'] },
  angry: { y0: 4, rows: ['.kkk......', '..Y.......', '..YY......', '.YYY......'] },
  peaked: { dx: -2, y0: -2, rows: ['....HHHHH...', '..HHWHHHhhj.', '..HHHHHHhhj.', '..HHHHHHhhj.', '..wkwkwkwkj.', 'SSSSSjjjjj..', '.SSSS.......'] },
  dartear: { y0: 3, rows: ['....w.....', '.....k....', '......k...', '.......q..', '.......qq.'] },
  cone: { y0: -4, rows: ['....Wh....', '...HHhh...', '...PPPP...', '..PPPPpp..', '..HHhhhj..', '.HHhhhhhj.', '.kkkkkkkk.'] },
};
// beard stamps, facing left: rows from (mouth row + dy0), column 0 = front-most face pixel + dx0. L hi, B mid, b shade, d deep, o mouth, g grey
const BEARDS = {
  adam: { dx0: -1, dy0: -2, rows: ['.....g', '....bb', '.LLBBb', 'BBoBBb', 'BBBBbd', '.BBbd.'] },
  devon: { dx0: -2, dy0: -2, rows: ['.......b', '.....Bbb', '.LLLBBbb', 'LBBoBBBb', 'BBBBBBbd', 'BBLBBBbd', '.BBBBbd.', '.BBBbbd.', '..BBbd..', '..bdd...'] },
  walrus: { dx0: -2, dy0: -3, rows: ['......BB', '.....BBb', '.....BBb', 'LLLLLBBb', 'BBBBBbBb', 'dBBbd.bd', '.d..d...'] },
};
// per-person looks (hair, skin, beard). `head` is the base stamp used under hats, `hairstyle` what the person wears bare-headed
const BA_LOOKS = {
  adam: { head: 'short', hair: '#5a3a22', skin: '#f2c8a2', beard: 'adam', beardCol: '#5a3a22' },
  devon: { head: 'messy', hair: '#d0702c', skin: '#f6caa4', beard: 'devon', beardCol: '#d0702c' },
  brenna: { head: 'bun', hair: '#a8462a', skin: '#f4c8a2' },
  wendell: { head: 'bald', hair: '#e4e4ec', skin: '#e4a47e', beard: 'walrus', beardCol: '#eeeef4', brows: true },
};
export function parseKey(key) { const [job, look] = String(key || '').split('@'); return { job, look: BA_LOOKS[look] ? look : null }; }

// ---------- weapon art: the ten weapon TYPES are silly families; a class may carry its own version (ART[job][type]) ----------
const ART = {
  _: { sword: 'bat', dagger: 'screwdriver', staff: 'broom', rod: 'mop', bow: 'dart', fists: 'glove', whip: 'cable', scythe: 'strimmer', tome: 'tablet', axe: 'hammer', katana: 'knife', flask: 'demijohn' },
  rogue: { dagger: 'penknife' }, mage: { staff: 'selfie' }, cleric: { staff: 'mop', fists: 'marigold' }, monk: { whip: 'band' },
  hexer: { tome: 'phone' }, bard: { sword: 'guitar', whip: 'miccable' }, paladin: { sword: 'lollipop' },
};
const FAMILY = { bat: 'sword', guitar: 'sword', lollipop: 'staff', screwdriver: 'dagger', penknife: 'dagger', dart: 'dagger', broom: 'staff', mop: 'staff', selfie: 'staff', glove: 'fists', marigold: 'fists', cable: 'whip', band: 'whip', miccable: 'whip', strimmer: 'scythe', tablet: 'tome', phone: 'tome', hammer: 'axe', knife: 'katana', demijohn: 'flask' };
export const weaponArt = (job, type) => (type === 'none' ? null : (ART[job] && ART[job][type]) || ART._[type] || null);

// ---------- colours of the weapon / prop materials (all classes share them) ----------
const XC = {
  rubber: ['#26262e'], red: ['#d63a34'], yel: ['#f0cc40'], org: ['#ff8a1e'], wht: ['#f2f2f6'], bat: ['#c8a060'], bat2: ['#8a5a30'], tape: ['#26262e'],
  gtr: ['#c0702a'], hole: ['#1a1018'], stop: ['#d42a2a'], straw: ['#d8b860'], mopw: ['#d8d8e0'], steel2: ['#9aa0ac'], glv: ['#d83a34'], line: ['#d8f070'],
  pcase: ['#f078b8'], inflat: ['#e8403a'], jug: ['#e0a028', 4, { hi: 0.7 }], cork: ['#b8884a'], amber: ['#f0b840'], foam: ['#f6f0e0', 3, { lo: 0.75 }],
  towel: ['#f4f4f8'], towel2: ['#3a6ac8'], can: ['#c8ccd6', 4, { hi: 0.8 }], gold: ['#f0c840'], leather: ['#7c4c28'], refl: ['#e6eaf2', 4, { hi: 0.8 }],
  pink: ['#ff7ac0'], seam: ['#8a74c8'], band: ['#f6f6fa'], red2: ['#e84a3a'], blue: ['#3a6ac8'], scarf: ['#d8483e'], check: ['#4a4a58'], wine: ['#8c2c3e'], apron: ['#2a2430'],
};
const GLOW = { screen: ['#8ad8ff'], ringlight: ['#ff9ad0'] };
function allMats(K, LK) {
  const hair = LK ? LK.hair : K.hair || '#6a4428', skin = LK ? LK.skin : K.skin || '#f0c8a0', shirt = K.shirt || '#6a8ac0';
  const tex = (f) => (f ? { tex: f } : {});
  const m = {
    hat: { r: R(K.hat || hair, 5), spec: undefined },
    hair: { r: R(hair, 4) },
    tunic: { r: R(shirt, 5), ...tex(K.plaid ? (x, y) => { const a = x % 3 === 0, b = (y + 1) % 3 === 0; return a && b ? -0.75 : a || b ? -0.36 : 0; } : null) },
    sleeve: { r: R(K.sleeve || shirt, 5) },
    skirt: { r: R(K.skirt || shirt, 5) },
    legs: { r: R(K.legs || '#3e5a92', 5), ...tex(K.check ? (x, y) => (((x >> 1) + (y >> 1)) & 1 ? -0.16 : 0.04) : K.shin === 'legs' ? (x, y) => (hash(x, y, 31) < 0.12 ? -0.1 : 0) : null) },
    boots: { r: R(K.shoe || '#6a4024', 4, { lo: 0.5 }) },
    acc: { r: R(K.belt || '#3a3036', 4, { hi: 0.6 }) },
    skin: { r: R(skin, 4, { lo: 0.55, hi: 0.4 }) },
    steel: { r: R('#a4b0c8', 5, { hi: 0.85, lo: 0.25 }), spec: '#ffffff', specAt: 0.8 },
    wood: { r: R('#8a5a30', 4) },
    gem: { r: R('#7fd8f0', 4, { hi: 0.9 }), glow: true, lift: 0.15 },
    paper: { r: R('#e8e0c8', 3) },
    tee: { r: R(K.tee || '#2c2a34', 3) },
  };
  for (const [k, [hex, n = 4, o]] of Object.entries(XC)) m[k] = { r: R(hex, n, o), spec: k === 'jug' || k === 'inflat' || k === 'can' ? '#ffffff' : undefined, specAt: 0.86 };
  for (const [k, [hex]] of Object.entries(GLOW)) m[k] = { r: R(hex, 4, { hi: 0.9 }), glow: true, lift: 0.15 };
  for (const [k, [hex, n = 4, o]] of Object.entries(K.mats || {})) m[k] = { r: R(hex, n, o) };
  if (LK && LK.beardCol) m.beard = { r: R(LK.beardCol, 4, { lo: 0.42 }) };
  return m;
}

// ---------- the pose skeleton ----------
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
function heroPose(name, fam) { // fam = the weapon family that drives the arm pose (sword dagger staff scythe katana axe whip tome flask fists none)
  const J = basePose(); const set = (o) => Object.assign(J, o);
  const longW = fam === 'staff' || fam === 'rod' || fam === 'scythe';
  if (HOLD[fam] != null) J.wAng = HOLD[fam];
  if (longW) set({ elF: [12.2, 16.6], haF: [10.6, 18.6] }); // poles are held out in front, clear of the head
  switch (name) {
    case 'ready': upper(J, -1, 0.5); set({ kneeF: [14, 24], ankF: [13.2, 27.6] }); if (!longW) set({ elF: [12.4, 16.2], haF: [11.2, 17.2], wAng: fam === 'fists' ? 0 : 215 }); break;
    case 'windup': upper(J, 1, 0); set({ elF: [16.8, 10.4], haF: [18.8, 8.4], wAng: longW ? 300 : 305, kneeF: [13.6, 24], ankF: [12.6, 27.6] }); break;
    case 'strike': upper(J, -2.6, 1); set({ elF: [11.2, 15.8], haF: [8.6, 17.2], wAng: longW ? 200 : 150, kneeF: [12.6, 23.6], ankF: [11.4, 27.6], kneeB: [19.6, 24.4], ankB: [21.4, 27.6] }); if (fam === 'whip') J.wAng = 185; break;
    case 'cast': set({ elF: [12, 14.6], haF: [10, 12.8], elB: [14.6, 15.1], haB: [12, 13.6], wAng: longW ? 250 : J.wAng }); break;
    case 'hurt': upper(J, 2, 0.4); set({ elF: [15.8, 17], haF: [17.6, 19.2], elB: [20.8, 16.4], haB: [22.4, 18.4], wAng: 70, face: 'x', ankF: [15.6, 27.6] }); break;
    case 'kneel': upper(J, -1.4, 3.6); set({ hipF: [15.4, 23.6], hipB: [17.8, 23.6], kneeF: [12.8, 24.4], ankF: [13.4, 27.8], kneeB: [18.8, 27.9], ankB: [22.4, 28], elF: [12.6, 20.6], haF: [11.6, 23.2], wAng: longW ? 280 : 95, face: 'd' }); break;
    case 'victory': set({ elF: [14, 10.2], haF: [13.4, 7.2], wAng: fam === 'fists' || fam === 'tome' || fam === 'flask' ? 0 : 270, elB: [20.2, 16], haB: [18.6, 18.4], face: 'h' }); break;
    case 'ko': upper(J, 0.5, 0.2); set({ face: 'x', wAng: 80, elF: [15.2, 17], haF: [16.4, 19.6] }); break;
    default: break;
  }
  return J;
}
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const unit = (a, b) => { const x = b[0] - a[0], y = b[1] - a[1], l = Math.hypot(x, y) || 1; return [x / l, y / l]; };

// ---------- weapon art (drawn from the hand along the angle `ang`; Z = depth of the weapon layer) ----------
function weaponParts(art, hand, ang, pose, J) {
  const d = [Math.cos(ang * D2R), Math.sin(ang * D2R)], p = [-d[1], d[0]], P = [], Z = 12;
  const at = (k, t = 0) => add(add(hand, d, k), p, t);
  const C = (a, b, r1, r2, m, z = Z) => P.push(cap(a[0], a[1], b[0], b[1], r1, r2, m, { z }));
  const E = (c, rx, ry, m, z = Z, o = {}) => P.push(ell(c[0], c[1], rx, ry, m, { z, ...o }));
  const Q = (pts, m, z = Z, bev = 1) => P.push(poly(pts, m, { z, bev }));
  const stripe = (a, b, r, m) => P.push(paint(cap(a[0], a[1], b[0], b[1], r, r, m)));
  const fd = unit(J.elF, J.haF);
  switch (art) {
    case 'bat': C(at(-1.8), at(3.2), 0.62, 0.62, 'bat2'); C(at(2.8), at(11), 0.8, 1.8, 'bat', Z + 1); E(at(11.2), 1.8, 1.8, 'bat', Z + 1); E(at(-1.9), 0.95, 0.95, 'bat2', Z + 1, { d: 0.5 }); stripe(at(-1), at(2.6), 0.75, 'tape'); break;
    case 'guitar': C(at(-2), at(5.5), 0.5, 0.5, 'wood'); E(at(-2.3), 0.8, 1, 'wood'); E(at(6.9), 2.4, 2.6, 'gtr', Z + 1); E(at(9.6), 3.3, 3.4, 'gtr', Z + 1); P.push(paint(ell(at(9.2)[0], at(9.2)[1], 1, 1, 'hole'))); C(at(10.8, -2.2), at(10.8, 2.2), 0.4, 0.4, 'wood', Z + 2); break;
    case 'lollipop': C(at(-3), at(10), 0.55, 0.55, 'wht'); E(at(12.2), 3.9, 3.9, 'wht', Z + 1, { d: 0.5 }); E(at(12.2), 3.2, 3.2, 'stop', Z + 2, { d: 0.5 }); stripe(at(12.2, -2.1), at(12.2, 2.1), 0.75, 'wht'); break;
    case 'screwdriver': C(at(-0.8), at(3.4), 1.25, 1.05, 'yel'); stripe(at(0.6), at(1.9), 1.3, 'org'); C(at(3.4), at(8.8), 0.42, 0.3, 'steel'); C(at(8.8), at(10), 0.3, 0.1, 'steel'); break;
    case 'penknife': C(at(-0.6), at(3.6), 1, 1, 'red'); C(at(3.6), at(8.4), 0.85, 0.3, 'steel', Z + 1); E(at(-0.7), 0.7, 0.7, 'steel', Z + 1); break;
    case 'broom': C(at(-6), at(9), 0.6, 0.6, 'wood'); Q([at(9, 0.9), at(12.8, 2.9), at(12.8, -2.9), at(9, -0.9)], 'straw', Z + 1, 1); stripe(at(9.6, -1.4), at(9.6, 1.4), 0.5, 'wood'); break;
    case 'mop': C(at(-6), at(9), 0.6, 0.6, 'wood'); E(at(10.6), 2.7, 2.2, 'mopw', Z + 1); for (const k of [-1.5, 0, 1.5]) { const s = at(10.8, k); C(s, add(s, [k * 0.25, 3.8]), 0.55, 0.35, 'mopw', Z + 1); } break;
    case 'selfie': C(at(-5), at(9.5), 0.42, 0.42, 'rubber'); Q([at(9.3, -1.7), at(9.3, 1.7), at(14, 1.7), at(14, -1.7)], 'rubber', Z, 0.8); Q([at(10, -1.05), at(10, 1.05), at(13.4, 1.05), at(13.4, -1.05)], 'screen', Z + 1, 0.5); break;
    case 'dart': C(at(-1.8), at(0.6), 1.35, 0.45, 'red'); C(at(0.4), at(4.6), 0.62, 0.5, 'steel', Z + 1); C(at(4.6), at(7.8), 0.38, 0.08, 'steel', Z + 1); break;
    case 'glove': case 'marigold': { const col = art === 'glove' ? 'glv' : 'yel'; E(hand, 2.2, 2, col, Z); E(add(hand, [-0.7, -1.7]), 0.95, 0.95, col, Z + 1); E(add(hand, fd, -2), 1.5, 1.3, 'wht', Z - 0.5); break; }
    case 'cable': case 'band': case 'miccable': {
      const band = art === 'band', mic = art === 'miccable', col = band ? 'org' : 'rubber', rr = band ? 0.75 : 0.45;
      C(hand, at(1.6), 0.6, 0.55, 'rubber'); const len = pose === 'strike' ? 15 : 7, droop = pose === 'strike' ? 0.5 : 2.4; let q = at(1.6);
      for (let k = 1; k <= 7; k++) { const t = k / 7, n = add(add(add(hand, d, 1.6 + len * t), [0, 1], droop * t * t * 3), p, Math.sin(t * 7) * 0.9); C(q, n, rr, rr * 0.9, col); q = n; }
      E(q, band ? 1.1 : 0.9, band ? 1.1 : 0.7, mic ? 'steel' : band ? 'org' : 'wht'); break; }
    case 'strimmer': C(at(-5), at(10), 0.5, 0.5, 'steel2'); C(at(1, -1.8), at(1, 1.8), 0.5, 0.5, 'rubber'); E(at(10.6), 1.5, 1.2, 'org', Z + 1); E(at(12.4), 3.7, 0.75, 'line', Z + 1, { rot: (ang + 90) * D2R, d: 0.5 }); break;
    case 'tablet': Q([add(hand, [-2.8, -3.4]), add(hand, [2.2, -3.9]), add(hand, [2.8, 2.2]), add(hand, [-2.4, 2.6])], 'rubber', Z, 1); Q([add(hand, [-2, -2.7]), add(hand, [1.6, -3.1]), add(hand, [2.1, 1.5]), add(hand, [-1.7, 1.9])], 'screen', Z + 1, 0.5); break;
    case 'phone': Q([add(hand, [-1.6, -3.0]), add(hand, [1.4, -3.3]), add(hand, [1.8, 2.0]), add(hand, [-1.4, 2.3])], 'pcase', Z, 0.8); Q([add(hand, [-1.1, -2.4]), add(hand, [1.0, -2.6]), add(hand, [1.3, 1.5]), add(hand, [-1.0, 1.7])], 'screen', Z + 1, 0.4); break;
    case 'hammer': { C(at(-1.6), at(5.4), 0.65, 0.65, 'yel'); const e = at(6.8); C(add(e, p, -3.1), add(e, p, 3.1), 1.95, 1.95, 'inflat', Z + 1); stripe(add(e, p, -1), add(e, p, 1), 2, 'yel'); break; }
    case 'knife': C(at(-2.6), at(1.6), 0.78, 0.78, 'rubber'); E(at(1.8), 0.6, 1.1, 'steel', Z + 1); Q([at(1.6, 1), at(7.5, 1.5), at(12.6, 0.2), at(7.2, -1.5), at(1.6, -0.9)], 'steel', Z + 1, 1); break;
    case 'fist': E(hand, 1.5, 1.4, 'skin', Z); break;
    case 'demijohn': { const c = [hand[0] - 0.4, hand[1] - 1.6]; E(c, 2.8, 3.1, 'jug'); C(add(c, [0, -3]), add(c, [0, -5.6]), 1.05, 0.8, 'jug'); E(add(c, [0, -6.2]), 1.1, 0.7, 'cork', Z + 1); C(add(c, [0, -6.6]), add(c, [0.8, -8.2]), 0.35, 0.35, 'wht', Z + 1); break; }
    default: break;
  }
  return P;
}

// ---------- the twelve silly classes ----------
// K fields: shirt sleeve skirt legs shoe belt hat tee (hex) · short (short sleeves) tank (bare arms) shin ('skin' = shorts) body ('robe' = long skirt) noBelt
// chest [rx,ry] belly [rx,ry] armR · head {dflt, map, base, over[]} · weapon (type) · pal (stamp letter colours) · mats {name: [hex, n, opts]} · torso/late/post hooks
const poly1 = (c, pts, m, o = {}) => c.parts.push(poly(pts, m, { bev: 0.7, ...o }));
const paintPoly = (c, pts, m) => c.parts.push(paint(poly(pts, m, { bev: 0.5 })));
const paintCap = (c, a, b, r, m) => c.parts.push(paint(cap(a[0], a[1], b[0], b[1], r, r, m)));
const towelParts = (c) => { const s = c.J.shF; poly1(c, [add(s, [-1.8, -1.3]), add(s, [1.5, -1.3]), add(s, [1.7, 5]), add(s, [-1.7, 5])], 'towel', { z: 6.5, bev: 0.5 }); paintPoly(c, [add(s, [-1.8, 2.2]), add(s, [1.7, 2.2]), add(s, [1.7, 3.4]), add(s, [-1.8, 3.4])], 'towel2'); };
const CLS = {
  bloke: { shirt: '#8a8e98', legs: '#3e5a92', shoe: '#e6e6ee', belt: '#3a3036', short: true, weapon: 'fists', bare: true, head: { dflt: 'short' } },
  knight: { // BOUNCER: black bomber, shades and a curly-cord earpiece, a guest-list clipboard, a bat
    shirt: '#30303a', legs: '#26262e', shoe: '#17171c', belt: '#4a4a58', cuff: 'acc', weapon: 'sword', offhand: true,
    head: { dflt: 'buzz', map: { short: 'buzz', messy: 'buzz' }, over: ['shades', 'earpiece'] }, pal: { c: '#e0d8c8', w: '#8aa0c8' },
    mats: { shirtw: ['#f4f4f8'], zip: ['#aab0bc'] },
    torso(c) { const { J } = c, n = J.neck; paintPoly(c, [[n[0] - 3, n[1] + 0.8], [n[0] + 0.6, n[1] + 0.3], [n[0] - 0.9, n[1] + 4.8]], 'shirtw'); paintCap(c, [J.chest[0] - 2.3, J.chest[1] - 0.2], [J.belly[0] - 2.2, J.belly[1] + 0.9], 0.42, 'zip'); },
    late(c) { const { J, bz } = c, h = J.haB, o = bz < 0 ? 1.6 : 0; poly1(c, [[h[0] - 1.6 + o, h[1] - 2.6], [h[0] + 2 + o, h[1] - 2.9], [h[0] + 2.2 + o, h[1] + 2.9], [h[0] - 1.4 + o, h[1] + 3.3]], 'wood', { z: bz + 0.4 }); poly1(c, [[h[0] - 1 + o, h[1] - 1.8], [h[0] + 1.5 + o, h[1] - 2], [h[0] + 1.6 + o, h[1] + 2], [h[0] - 0.8 + o, h[1] + 2.3]], 'paper', { z: bz + 0.7, bev: 0.5 }); poly1(c, [[h[0] - 0.8 + o, h[1] - 3.2], [h[0] + 1.2 + o, h[1] - 3.4], [h[0] + 1.2 + o, h[1] - 2.4], [h[0] - 0.8 + o, h[1] - 2.2]], 'steel', { z: bz + 0.8, bev: 0.3 }); },
  },
  rogue: { // CHANCER: teal shell suit, flat cap, gold chain, a lot of watches
    shirt: '#22b2a4', legs: '#7c3cb8', shoe: '#f2f2f6', belt: '#22b2a4', noBelt: true, weapon: 'dagger',
    head: { dflt: 'short', over: ['flatcap'] }, hat: '#8a7a64', mats: { band: ['#f6f6fa'], gold: ['#f0c840'], silver: ['#d8dce6'] },
    late(c) { const { J } = c, s = (a, b) => paintCap(c, a, b, 0.42, 'band'); s(J.shF, J.elF); s(J.elF, J.haF); s(J.hipF, J.kneeF); s(J.kneeF, J.ankF); },
    post(c) { const { api, J } = c, n = J.neck, G = c.m.gold.r; for (const [dx, dy, k] of [[-2.3, 1.4, 2], [-2.7, 2.4, 3], [-2.2, 3.4, 2], [-1.1, 4, 3]]) api.px(n[0] + dx, n[1] + dy, G[k]); const fd = unit(J.elF, J.haF); api.px(...add(J.haF, fd, -2.6), G[3]); api.px(...add(J.haF, fd, -3.6), c.m.silver.r[3]); },
  },
  mage: { // SPREADSHEET SORCERER: green wizard robe, specs, lanyard, a Post-it on the hat
    shirt: '#2c9c5e', hat: '#1f7c4c', belt: '#e6e8f0', legs: '#2a2a32', shoe: '#2a2a32', body: 'robe', weapon: 'staff',
    head: { dflt: 'short', over: ['wiz', 'postit', 'specs'] }, pal: { A: '#e6e8f0', a: '#a8acc0', P: '#fff070', p: '#e8d040', k: '#1a1620' },
    mats: { tie: ['#e04a4a'], cord: ['#2a9ad8'], collar: ['#f4f4f8'], badge: ['#f4f4f8'] },
    torso(c) { const { J } = c, n = J.neck; paintPoly(c, [[n[0] - 3, n[1] + 0.8], [n[0] + 0.6, n[1] + 0.3], [n[0] - 1.2, n[1] + 2.4]], 'collar'); paintCap(c, [n[0] - 1.7, n[1] + 1.6], [J.belly[0] - 2.3, J.belly[1] + 1.2], 0.55, 'tie'); paintCap(c, [n[0] - 2.5, n[1] + 1], [J.chest[0] - 3, J.chest[1] + 3.2], 0.4, 'cord'); paintPoly(c, [[J.chest[0] - 4, J.chest[1] + 3], [J.chest[0] - 1.8, J.chest[1] + 3], [J.chest[0] - 1.8, J.chest[1] + 6], [J.chest[0] - 4, J.chest[1] + 6]], 'badge'); },
    late(c) { if (c.poseName === 'cast') { const h = c.J.haB; poly1(c, [[h[0] - 2.8, h[1] - 3.4], [h[0] + 2.2, h[1] - 3.9], [h[0] + 2.8, h[1] + 2.2], [h[0] - 2.4, h[1] + 2.6]], 'rubber', { z: 11 }); poly1(c, [[h[0] - 2, h[1] - 2.7], [h[0] + 1.6, h[1] - 3.1], [h[0] + 2.1, h[1] + 1.5], [h[0] - 1.7, h[1] + 1.9]], 'screen', { z: 11.5, bev: 0.5 }); } },
  },
  cleric: { // BARMAID: wine skirt, white blouse, bar apron, tea towel, a pint in the off hand
    shirt: '#f6f2f6', skirt: '#8c2c3e', legs: '#2a2028', shoe: '#2a2028', belt: '#f0a424', body: 'robe', noHem: true, weapon: 'rod', offhand: true, head: { dflt: 'bun' },
    torso(c) { const { J } = c, n = J.neck, hem = Math.max(J.ankF[1], J.ankB[1]) + 0.6, mx = (J.ankF[0] + J.ankB[0]) / 2;
      paintPoly(c, [[n[0] - 2.8, n[1] + 2.4], [n[0] - 0.5, n[1] + 2.2], [J.belly[0] + 0.6, J.belly[1] + 0.6], [J.belly[0] - 3.4, J.belly[1] + 0.6]], 'apron');
      paintPoly(c, [[J.belly[0] - 3.4, J.belly[1] + 0.6], [J.belly[0] + 0.6, J.belly[1] + 0.6], [mx + 1.6, hem], [mx - 4.2, hem]], 'apron'); towelParts(c); },
    late(c) { const h = c.J.haB, z = c.bz + 0.4, o = c.bz < 0 ? 1.6 : 0; poly1(c, [[h[0] - 1.6 + o, h[1] - 3.7], [h[0] + 1.6 + o, h[1] - 3.7], [h[0] + 1.1 + o, h[1] + 0.8], [h[0] - 1.1 + o, h[1] + 0.8]], 'amber', { z }); c.parts.push(ell(h[0] + o, h[1] - 4, 1.9, 1, 'foam', { z: z + 0.1 })); },
  },
  monk: { // GYM BRO: tank top, sweatband, shorts, big arms, a protein shaker
    shirt: '#2a8cf2', legs: '#1e1e28', shoe: '#f2f2f6', belt: '#f6f6fa', tank: true, armR: 1.4, shin: 'skin', cuff: 'band', weapon: 'fists',
    head: { dflt: 'short', over: ['sweat'] }, pal: { A: '#f6f6fa', a: '#b8bcd0' }, mats: { shake: ['#e8e060'], lid: ['#e84a3a'] },
    torso(c) { const n = c.J.neck; paintPoly(c, [[n[0] - 2.8, n[1] + 0.8], [n[0] + 0.4, n[1] + 0.5], [n[0] - 1.2, n[1] + 3.6]], 'skin'); c.parts.push(ell(c.J.shF[0] + 0.5, c.J.shF[1] - 0.2, 2.3, 2, 'skin', { z: 6 })); },
    late(c) { const h = c.J.haB, z = c.bz + 0.4, o = c.bz < 0 ? 1.6 : 0, r = (a, b, w, hh, m, zz) => poly1(c, [[h[0] - w + o, h[1] + a], [h[0] + w + o, h[1] + a], [h[0] + w + o, h[1] + b], [h[0] - w + o, h[1] + b]], m, { z: zz, bev: 0.4 }); r(-3.2, 1.8, 1.3, 0, 'wht', z); r(-0.8, 1.8, 1.3, 0, 'shake', z + 0.1); r(-4.2, -3.2, 1.5, 0, 'lid', z + 0.2); },
  },
  ranger: { // DARTS PLAYER: loud sponsor shirt, belly, gold chain, a dart
    shirt: '#d6322e', legs: '#2c2c3a', shoe: '#1c1c22', belt: '#2a2228', short: true, weapon: 'bow', chest: [3.8, 3.5], belly: [3.4, 2.9], head: { dflt: 'short', over: ['dartear'] }, pal: { q: '#d63a34', k: '#8a90a0', w: '#f0f4fa' },
    mats: { patch: ['#f6d838'], patch2: ['#f6f6fa'], logo: ['#26202a'], gold: ['#f0c840'] },
    torso(c) { const { J } = c, cx = J.chest[0], cy = J.chest[1]; c.parts.push(ell(J.belly[0] - 1.8, J.belly[1] + 0.5, 3.7, 3.2, 'tunic', { z: 2.5 })); paintPoly(c, [[cx - 4.2, cy - 0.6], [cx + 0.4, cy - 0.6], [cx + 0.4, cy + 2.2], [cx - 4.2, cy + 2.2]], 'patch'); paintPoly(c, [[cx - 5.4, J.belly[1] + 0.8], [cx - 1.4, J.belly[1] + 0.8], [cx - 1.4, J.belly[1] + 3], [cx - 5.4, J.belly[1] + 3]], 'patch2'); },
    post(c) { const { api, J } = c, n = J.neck, G = c.m.gold.r, cx = J.chest[0], cy = J.chest[1]; for (const [dx, dy, k] of [[-2.3, 1.4, 3], [-3.0, 2.2, 2], [-3.2, 3.2, 3], [-2.6, 4.2, 2], [-1.6, 4.8, 3], [-0.6, 4.6, 2]]) { api.px(n[0] + dx, n[1] + dy, G[k]); api.px(n[0] + dx + 1, n[1] + dy, G[k]); } api.px(n[0] - 1.8, n[1] + 6, G[3]); api.px(n[0] - 1.8, n[1] + 7, G[2]); for (const [dx, dy] of [[-3.4, 0.2], [-2.4, 0.2], [-1.4, 0.2], [-3.4, 1.4], [-1.4, 1.4]]) api.px(cx + dx, cy + dy, c.m.logo.r[1]); },
  },
  hexer: { // INFLUENCER: lavender puffer, quiff, huge shades, a phone
    shirt: '#b6a0f2', legs: '#26262e', shoe: '#f6f6fa', belt: '#26262e', noBelt: true, chest: [4.5, 4.1], belly: [3.9, 3.2], armR: 1.45, weapon: 'tome',
    head: { dflt: 'quiff', map: { short: 'quiff', messy: 'quiff' }, over: ['bigshades'] },
    torso(c) { const { J } = c, cx = J.chest[0], cy = J.chest[1]; for (const dy of [-1.8, 0.7, 3.2, 5.4]) paintCap(c, [cx - 5, cy + dy], [cx + 4.6, cy + dy], 0.4, 'seam'); },
    late(c) { const { J } = c, perp = (a, b, t) => { const m = add(a, [b[0] - a[0], b[1] - a[1]], t), u = unit(a, b); paintCap(c, add(m, [-u[1], u[0]], -2.3), add(m, [-u[1], u[0]], 2.3), 0.45, 'seam'); }; perp(J.shF, J.elF, 0.5); perp(J.elF, J.haF, 0.4); perp(J.shB, J.elB, 0.5); },
    post(c) { if (c.poseName === 'cast') { const h = c.J.haF, R = 5.2; for (let a = 0; a < 40; a++) { const t = (a / 40) * Math.PI * 2; c.api.px(Math.round(h[0] - 1 + Math.cos(t) * R), Math.round(h[1] - 1 + Math.sin(t) * R * 0.95), a % 2 ? '#ff9ad0' : '#fff0fa'); } } },
  },
  bard: { // BUSKER: beanie, red scarf, olive jacket, an acoustic guitar
    shirt: '#6c7c3c', legs: '#3c4c70', shoe: '#5a3a24', belt: '#4a3a24', weapon: 'whip', head: { base: 'beanie' }, hat: '#e2a82e',
    torso(c) { const { J } = c, n = J.neck; c.parts.push(ell(n[0] + 0.5, n[1] + 1.2, 2.9, 1.6, 'scarf', { z: 5.5 })); c.parts.push(cap(n[0] + 1.5, n[1] + 1.2, n[0] + 4.6, n[1] + 4.6, 0.95, 0.7, 'scarf', { z: -1 }));
      if (c.art !== 'guitar') { const b = [J.hipB[0] + 3.4, J.belly[1] - 0.4]; c.parts.push(ell(b[0], b[1] + 1.2, 3.4, 3.2, 'gtr', { z: -5 })); c.parts.push(ell(b[0] - 0.2, b[1] - 2.2, 2.4, 2.4, 'gtr', { z: -5 })); c.parts.push(cap(b[0] + 0.4, b[1] - 3.6, b[0] + 3.8, b[1] - 10, 0.5, 0.5, 'wood', { z: -5 })); c.parts.push(ell(b[0] + 4, b[1] - 10.6, 0.8, 1.1, 'wood', { z: -5 })); } },
  },
  berserker: { // STAG DO LAD: the matching hot-pink STAG tee (a class constant), traffic cone, a can of lager
    shirt: '#ff4fa6', legs: '#2c3c6c', shoe: '#f2f2f6', belt: '#2c3c6c', noBelt: true, short: true, shin: 'skin', weapon: 'axe', offhand: true, head: { dflt: 'short', over: ['cone'] }, hat: '#ff8c1e', pal: { P: '#f8f8fa', p: '#c8c8d8', k: '#1c1824' },
    mats: { tee2: ['#f8f8fa'], text: ['#26202a'] },
    torso(c) { const { J } = c, cx = J.chest[0], cy = J.chest[1]; paintPoly(c, [[cx - 4.6, cy - 0.4], [cx + 4.6, cy - 0.4], [cx + 4.6, cy + 2.8], [cx - 4.6, cy + 2.8]], 'tee2'); },
    late(c) { const h = c.J.haB, z = c.bz + 0.4, o = c.bz < 0 ? 1.6 : 0, r = (a, b, w, m, zz) => poly1(c, [[h[0] - w + o, h[1] + a], [h[0] + w + o, h[1] + a], [h[0] + w + o, h[1] + b], [h[0] - w + o, h[1] + b]], m, { z: zz, bev: 0.4 }); r(-3.2, 1.4, 1.2, 'can', z); r(-1.4, 0.2, 1.3, 'gold', z + 0.1); },
    post(c) { const { api, J } = c, cx = J.chest[0], cy = J.chest[1], T = c.m.text.r[1]; for (const [dx, dy] of [[-3.6, 0.7], [-2.6, 0.7], [-1.6, 0.7], [-0.6, 0.7], [0.8, 0.7], [1.8, 0.7], [-3.1, 1.9], [-1.1, 1.9], [0.3, 1.9], [2.3, 1.9]]) api.px(cx + dx, cy + dy, T); },
  },
  alchemist: { // HOME BREWER: bobble hat with hops, goggles up, leather apron, a demijohn
    shirt: '#e8c44c', legs: '#4c4a3a', shoe: '#7c4c28', belt: '#5a3a20', short: true, weapon: 'flask', head: { dflt: 'short', over: ['bobble', 'goggles'] }, hat: '#c45e2a', pal: { P: '#f6f2ea', p: '#c8c4b8', m: '#d0a842', G: '#8adcf2', Q: '#6cc44c' },
    torso(c) { const { J } = c, n = J.neck, hem = J.kneeF[1] + 1; paintPoly(c, [[n[0] - 2.6, n[1] + 2], [n[0] - 0.4, n[1] + 1.8], [J.belly[0] + 0.8, J.belly[1] + 0.8], [J.belly[0] - 3.6, J.belly[1] + 0.8]], 'leather'); paintPoly(c, [[J.belly[0] - 3.6, J.belly[1] + 0.8], [J.belly[0] + 0.8, J.belly[1] + 0.8], [J.hipB[0] + 0.2, hem], [J.hipF[0] - 2.8, hem]], 'leather'); paintCap(c, [n[0] - 2.2, n[1] + 0.6], [J.chest[0] + 2.4, J.chest[1] - 1.6], 0.45, 'leather'); },
  },
  samurai: { // ANGRY CHEF: whites, toque, red face, kitchen towel, a big knife
    shirt: '#f4f4f8', legs: '#464654', check: true, shoe: '#2a2a32', belt: '#f4f4f8', noBelt: true, weapon: 'katana', head: { dflt: 'short', over: ['toque', 'angry'] }, hat: '#f6f6fa', pal: { k: '#2a1a20' }, mats: { neck: ['#d83a2a'], btn: ['#a8acb8'] },
    torso(c) { const n = c.J.neck; c.parts.push(ell(n[0] - 0.6, n[1] + 0.9, 2.2, 1.3, 'neck', { z: 5.5 })); towelParts(c); },
    post(c) { const { api, J } = c, cx = J.chest[0], cy = J.chest[1]; for (const dy of [0, 2.2, 4.4]) { api.px(cx - 2.6, cy + dy, c.m.btn.r[3]); api.px(cx - 1.6, cy + dy, c.m.btn.r[2]); } },
  },
  paladin: { // TRAFFIC WARDEN: hi-vis, peaked cap, STOP lollipop, ticket machine
    shirt: '#eee83a', legs: '#2a3052', shoe: '#1a1a22', belt: '#2a2a34', cuff: 'refl', weapon: 'sword', head: { dflt: 'short', over: ['peaked'] }, hat: '#242c4a', pal: { w: '#f6f6fa', k: '#14141c' },
    torso(c) { const { J } = c, cx = J.chest[0]; paintCap(c, [cx - 4.6, J.chest[1] + 0.2], [cx + 4.6, J.chest[1] + 0.2], 0.5, 'refl'); paintCap(c, [cx - 4.6, J.belly[1] - 0.6], [cx + 4.6, J.belly[1] - 0.6], 0.5, 'refl'); paintCap(c, [J.neck[0] - 1.6, J.neck[1] + 1], [J.belly[0] - 1.4, J.belly[1] - 1], 0.4, 'refl'); },
    late(c) { const { J } = c, h = J.hipF; poly1(c, [[h[0] - 2.8, h[1] - 0.6], [h[0] - 0.8, h[1] - 0.6], [h[0] - 0.8, h[1] + 2.4], [h[0] - 2.8, h[1] + 2.4]], 'rubber', { z: 3.6 }); },
    post(c) { const h = c.J.hipF; c.api.px(h[0] - 2.2, h[1] + 0.2, '#8ad8ff'); c.api.px(h[0] - 1.6, h[1] + 0.2, '#8ad8ff'); },
  },
};
// person-specific outfits of the jobless intro class ('bloke@adam' ...): the 2026 pub clothes
const OUT = {
  'bloke@adam': { shirt: '#b8323a', plaid: true, tee: '#2c2a34', belt: '#2a2228', shoe: '#ecebf2' },
  'bloke@devon': { shirt: '#2c3c72', legs: '#b8a274', shin: 'skin', shoe: '#c8ccd6', belt: '#8a7650', hood: true, logo: '#f4d35e', head: { base: 'beanie' }, hat: '#8e9098' },
};
export const CLASS_FX = { // cast accents (the stage reads these): ring colour, accent colour, and what the burst looks like
  knight: { c1: '#c8ccd6', c2: '#ffffff' }, rogue: { c1: '#f0c840', c2: '#fff4b0' }, mage: { c1: '#8ad8ff', c2: '#e8fbff' }, cleric: { c1: '#f6f0e0', c2: '#f0b840' },
  monk: { c1: '#4aa0ff', c2: '#e8f4ff' }, ranger: { c1: '#f6d838', c2: '#ff6a5a' }, hexer: { c1: '#ff7ac0', c2: '#fff0fa' }, bard: { c1: '#e2a82e', c2: '#fff0b0' },
  berserker: { c1: '#ff8c1e', c2: '#ffd0e8' }, alchemist: { c1: '#f0b840', c2: '#f6f0e0' }, samurai: { c1: '#ff6a4a', c2: '#fff4e8' }, paladin: { c1: '#eee83a', c2: '#d42a2a' },
};

const hexMix = mix;
function heroSpec(job, poseName, wover, look = null, key = job) {
  const K = { ...(CLS[job] || CLS.knight), ...(OUT[key] || {}) }, LK = look ? BA_LOOKS[look] : null;
  let art = wover == null ? weaponArt(job, K.weapon) : weaponArt(job, wover); if (art === 'glove' && K.bare) art = 'fist';
  const fam = FAMILY[art] || (art === 'fist' ? 'fists' : 'none'), J = heroPose(poseName, fam), mats = allMats(K, LK), parts = [];
  const C = (a, b, r1, r2, m, z) => parts.push(cap(a[0], a[1], b[0], b[1], r1, r2, m, { z }));
  // classes that carry something in the off hand bring it in front of the chest while standing, so the item (and the hand) shows
  if (K.offhand && ['idle', 'ready', 'victory'].includes(poseName) && poseName !== 'victory') { J.elB = add(J.chest, [-0.6, 3.1]); J.haB = add(J.chest, [-3.8, 2.3]); }
  const bz = J.haB[0] < J.chest[0] - 2.2 ? 3.5 : -2; // the off arm is drawn in front of the body when the hand is in front
  const ctx = { J, parts, m: mats, poseName, art, K, api: null, bz };
  if (art === 'dart' && poseName === 'idle') J.wAng = 235;
  const sleeveM = K.tank ? 'skin' : 'sleeve', foreM = K.tank || K.short ? 'skin' : 'sleeve', ar = K.armR || 1, shin = K.shin === 'skin' ? 'skin' : 'legs', robe = K.body === 'robe';
  // back arm and back leg
  C(J.shB, J.elB, 1.25 * ar, 1.15 * ar, sleeveM, bz); C(J.elB, J.haB, 1.15 * ar, ar, foreM, bz); parts.push(ell(J.haB[0], J.haB[1], 1.15, 1.15, 'skin', { z: bz + 0.5 }));
  if (!robe) { C(J.hipB, J.kneeB, 1.5, 1.35, 'legs', -3); C(J.kneeB, J.ankB, shin === 'skin' ? 1.1 : 1.35, 1.2, shin, -3); }
  parts.push(ell(J.ankB[0] - 1.2, J.ankB[1] + 0.9, 2, 1.15, 'boots', { z: -3, d: 0.7 }));
  // torso
  const [crx, cry] = K.chest || [3.6, 3.4], [brx, bry] = K.belly || [3.1, 2.5];
  if (robe) {
    const hem = Math.max(J.ankF[1], J.ankB[1]) + 0.6, mx = (J.ankF[0] + J.ankB[0]) / 2;
    parts.push(poly([add(J.shF, [-0.4, -1]), add(J.shB, [0.8, -1]), [J.hipB[0] + 1.6, J.hipB[1]], [mx + 4.6, hem], [mx - 4.4, hem], [J.hipF[0] - 2, J.hipF[1]]], K.skirt ? 'skirt' : 'tunic', { z: 1, bev: 2.2 }));
    if (!K.noHem) parts.push(paint(poly([[mx - 5, hem - 1.6], [mx + 5, hem - 1.6], [mx + 5.2, hem + 1], [mx - 5.2, hem + 1]], 'acc')));
    parts.push(ell(J.chest[0], J.chest[1], crx - 0.1, cry - 0.1, 'tunic', { z: 2 }));
  } else {
    parts.push(ell(J.belly[0], J.belly[1], brx, bry, 'tunic', { z: 1 })); parts.push(ell(J.chest[0], J.chest[1], crx, cry, 'tunic', { z: 2 }));
    if (!K.noBelt) parts.push(cap(J.belly[0] - 3, J.belly[1] + 0.9, J.belly[0] + 3, J.belly[1] + 0.9, 0.85, 0.85, 'acc', { z: 3.4 }));
  }
  if (K.tee) parts.push(paint(cap(J.chest[0] - 2.7, J.chest[1] - 2.2, J.belly[0] - 2.5, J.belly[1] + 0.2, 0.75, 0.75, 'tee')));
  if (K.hood) parts.push(ell(J.neck[0] + 1.8, J.neck[1] + 0.8, 2.3, 1.7, 'tunic', { z: 2.6 }));
  if (K.torso) K.torso(ctx);
  // front leg and shoe, then the front arm
  if (!robe) { C(J.hipF, J.kneeF, 1.55, 1.4, 'legs', 0.5); C(J.kneeF, J.ankF, shin === 'skin' ? 1.15 : 1.4, 1.25, shin, 0.6); }
  parts.push(ell(J.ankF[0] - 1.2, J.ankF[1] + 0.9, 2.1, 1.15, 'boots', { z: 0.8, d: 0.7 }));
  C(J.shF, J.elF, 1.3 * ar, 1.2 * ar, sleeveM, 5); C(J.elF, J.haF, 1.2 * ar, 1.05 * ar, foreM, 5.5);
  if (K.cuff) for (const [el, ha] of [[J.elF, J.haF], [J.elB, J.haB]]) { const fd = unit(el, ha); parts.push(paint(cap(...add(ha, fd, -2.7), ...add(ha, fd, -1.8), 1.0 * ar, 1.0 * ar, K.cuff))); }
  if (K.late) K.late(ctx);
  const hand = J.wHand === 'F' ? J.haF : J.haB;
  if (art) parts.push(...weaponParts(art, hand, J.wAng, poseName, J));
  if (!(art === 'glove' || art === 'marigold')) parts.push(ell(J.haF[0], J.haF[1], 1.2, 1.2, 'skin', { z: 13.5 }));
  // the head: base stamp (the person's hair) + overlays, the beard, then class details
  const hd = K.head || {}, over = hd.over || [];
  let baseKey = hd.base || (LK ? LK.head : hd.dflt || 'short'); if (!hd.base && LK && hd.map && hd.map[baseKey]) baseKey = hd.map[baseKey]; if (!hd.base && !LK) baseKey = hd.dflt || 'short';
  const head = HEADS[baseKey] || HEADS.short;
  return { w: 32, h: 32, mats, parts, crease: 1.2, post(api) {
    const m = mats, hx = Math.round(J.neck[0] - 6), chinY = Math.round(J.neck[1] + 0.6) - 1, top0 = chinY - 8;
    const hr = R(LK ? LK.hair : K.hair || '#6a4428', 5), ht = R(K.hat || (LK ? LK.hair : '#8e9098'), 5);
    const skin = m.skin.r, extra = { S: '#12101c', k: '#1a1620', w: '#9ab4dc', c: '#d8d0c0', P: '#f6f2ea', p: '#c8c4d0', Y: hexMix(skin[3], '#e8402c', 0.5), m: '#d0a842', G: '#8adcf0', Q: '#6cc44c', A: m.acc.r[3], a: m.acc.r[1], ...(K.pal || {}) };
    const common = { R: hr[2], r: hr[1], F: skin[3], f: skin[2], g: skin[1], e: '#2a1c34', ...extra };
    const isHair = HAIRBASE.has(baseKey), palB = { ...common, H: (isHair ? hr : ht)[3], h: (isHair ? hr : ht)[2], j: (isHair ? hr : ht)[1], W: (isHair ? hr : ht)[4], _ol: (isHair ? hr : ht)[0] };
    const palO = { ...common, H: ht[3], h: ht[2], j: ht[1], W: ht[4], _ol: ht[0] };
    const shaded = over.includes('shades') || over.includes('bigshades');
    let rows = head.rows; if (J.face !== 'n') rows = rows.map((r) => r.replace(/e/g, 'F'));
    api.stamp(rows, palB, hx, chinY - (rows.length - 1));
    for (const k of over) { const o = OVER[k]; api.stamp(o.rows, palO, hx + (o.dx || 0), top0 + o.y0); }
    const ex = hx + 1, e1 = chinY - 3, e2 = chinY - 2;
    if (!shaded) {
      if (J.face === 'x') { api.px(ex, e2, '#2a1c34'); api.px(ex + 1, e2 - 1, '#2a1c34'); }
      if (J.face === 'd') { api.px(ex, e2, '#2a1c34'); api.px(ex + 1, e2, '#2a1c34'); }
      if (J.face === 'h') { api.px(ex, e1 + 1, '#2a1c34'); api.px(ex + 1, e1, '#2a1c34'); }
    }
    if (LK && LK.beard) { // beard stamped under the mouth: reads on every pose, under hats and shades too
      const bd = BEARDS[LK.beard], br = m.beard.r, bp = { L: br[3], B: br[2], b: br[1], d: br[0], o: '#2a1418', g: '#b4aca8', _ol: br[0] };
      api.stamp(bd.rows, bp, hx + 1 + bd.dx0, chinY - 1 + bd.dy0);
      if (LK.brows && !shaded) for (let k = -1; k <= 1; k++) api.px(ex + k, e1 - 1, k < 1 ? br[3] : br[2]); // bushy white brows
    }
    if (K.logo && poseName !== 'ko') api.px(Math.round(J.chest[0] - 1.6), Math.round(J.chest[1]), K.logo);
    if (K.post) K.post({ ...ctx, api });
  } };
}
export const HERO_POSES = ['idle', 'ready', 'windup', 'strike', 'cast', 'hurt', 'kneel', 'victory', 'ko'];
const HCACHE = new Map();
// weapon: a WEAPON_TYPES id to show instead of the class's signature weapon ('none' = empty hands)
// job: a calling id or 'job@look' ('knight@adam', 'bloke@devon', 'cleric@brenna'); unknown looks/jobs fall back to the plain art (the Bouncer)
export function heroFrame(job, pose = 'idle', weapon = null) {
  const key = String(job), { job: j0, look } = parseKey(key), jb = CLS[j0] ? j0 : 'knight';
  const k = key + ':' + pose + ':' + (weapon || ''); if (HCACHE.has(k)) return HCACHE.get(k);
  const spec = heroSpec(jb, pose, weapon, look, look ? jb + '@' + look : jb); if (pose === 'ko') spec.tint = 0.45;
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
  slime: { col: { goo: '#4fbe4a', eye: '#ffffff', mouth: '#1a3a20', foam: '#f4ecd8' }, build(P, V = {}) {
    return { w: 38, h: 30, mats: { goo: mat(P.goo, 6, { spec: '#ffffff', specAt: 0.86, lift: 0.06, ramp: { hi: 0.75 } }), foam: mat(P.foam, 4, { tex: 'wart', ramp: { lo: 0.62, hi: 0.7 } }) },
      parts: [ell(19, 20.5, 16, 9, 'goo', { d: 0.9 }), ell(18, 14, 10, 9, 'goo', { z: 1 }), V.foam ? null : cap(17, 9, 20.5, 3.5, 4, 1.2, 'goo', { z: 2 }), ell(6, 26.5, 3, 2.2, 'goo', { z: 2 }), ell(31, 27, 3.4, 2, 'goo', { z: 2 }),
        ...(V.foam ? [ell(11.5, 8.5, 4.6, 3.4, 'foam', { z: 3 }), ell(18, 6, 5.6, 4.2, 'foam', { z: 3.6 }), ell(24.5, 8, 4.8, 3.4, 'foam', { z: 3.2 }), ell(15, 3, 3, 2.4, 'foam', { z: 4 }), ell(8.6, 12, 1.6, 2.6, 'foam', { z: 3.4 }), ell(27.6, 11.6, 1.4, 2.2, 'foam', { z: 3.4 })] : [])],
      post(a) {
        if (V.foam) { for (const [bx, by] of [[12, 22], [16, 26], [26, 25], [31, 21], [8, 20], [20, 24], [14, 17]]) { a.px(bx, by, a.ramp('goo', -1)); a.px(bx + 1, by + 1, a.ramp('goo', -2)); } a.px(17, 2, '#ffffff'); a.px(11, 7, '#ffffff'); }
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
  wraith: { col: { cloak: '#5a6a9a', inner: '#141020', eye: '#7af0ff', hand: '#c8d8e8' }, build(P, V = {}) {
    const m = { cloak: mat(P.cloak, 5, { tex: 'cloth', lift: 0.03 }), inner: mat(P.inner, 3, { flat: 0.2 }), hand: mat(P.hand, 4), antler: mat('#e8dcc0', 5, { tex: 'grain', spec: '#fffbe8', specAt: 0.9 }), sash: mat('#d8c030', 4, { tex: 'cloth' }) };
    const hem = [[7, 38], [10, 33], [12, 40], [15, 34], [18, 41], [21, 35], [24, 40], [26, 33], [29, 37]], oy = V.antlers ? 14 : 0;
    // a stag do gone wrong: a rack of antlers on the head (the whole figure drops down to make room) and a tattered BEST MAN sash
    const ant = V.antlers ? [...chain([[15, 5], [12, -3], [9, -9], [6, -12]], [1.6, 1.3, 1.1, 0.5], 'antler', 5), ...chain([[12, -3], [7, -4.5], [3, -3]], [1, 0.8, 0.4], 'antler', 5), ...chain([[10, -7], [14, -11]], [0.9, 0.4], 'antler', 5),
      ...chain([[21, 5], [22, -3], [21, -9], [19, -13]], [1.6, 1.3, 1.1, 0.5], 'antler', 6), ...chain([[22, -3], [27, -5], [31, -4]], [1, 0.8, 0.4], 'antler', 6), ...chain([[21.5, -7], [26, -11]], [0.9, 0.4], 'antler', 6)] : [];
    const sash = V.antlers ? [paint(poly([[12, 20], [16, 18], [31, 33], [26, 34]], 'sash'))] : [];
    return { w: 38, h: 44 + oy, mats: m, shift: oy, parts: shiftAll([...ant, 
      cap(12, 14, 6, 22, 2.4, 1.8, 'cloak', { z: -3 }), cap(6, 22, 9, 27, 1.8, 1.5, 'cloak', { z: -3 }), cap(9, 27, 7, 30, 0.6, 0.4, 'hand', { z: -2 }), cap(9.5, 27, 10, 31, 0.6, 0.4, 'hand', { z: -2 }),
      poly([[11, 12], [24, 11], [30, 24], [31, 34], ...hem.reverse(), [6, 30]], 'cloak', { z: 0, bev: 2.4 }),
      ell(17.5, 10, 7.5, 8, 'cloak', { z: 3 }), cap(14, 4, 7, 1, 2.4, 0.8, 'cloak', { z: 2 }), paint(ell(20.5, 11, 4.2, 5.2, 'inner')),
      cap(23, 15, 28, 21, 2.6, 2.1, 'cloak', { z: 6 }), cap(28, 21, 32, 18, 2.1, 1.8, 'cloak', { z: 6 }),
      ...[[35.5, 14], [36.5, 17], [36, 20.5]].map(([x, y]) => cap(32.5, 18.3, x, y, 0.7, 0.4, 'hand', { z: 7 })), ...sash,
    ], oy), post(a) { const q = { px: (x, y, c) => a.px(x, y + oy, c), line: (x0, y0, x1, y1, c) => a.line(x0, y0 + oy, x1, y1 + oy, c), rect: (x, y, w2, h2, c) => a.rect(x, y + oy, w2, h2, c), ramp: a.ramp }; glowEye(q, 18, 10, P.eye); glowEye(q, 22, 10, P.eye); q.px(18, 11, shade(P.eye, 0.5)); q.px(23, 11, shade(P.eye, 0.5));
      if (V.antlers) { q.line(15, 25, 19, 21.5, '#5a4a10'); q.line(18, 27, 22, 24.5, '#5a4a10'); for (const [x, y] of [[17, 21], [21, 25], [24, 28]]) q.px(x, y, '#2a2208'); } } };
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
  ale_slime: ['slime', { goo: '#e09a2a', mouth: '#4a2208' }, { foam: true }], // Bearded Bros: a foamy pint come to life
  mire_wolf: ['wolf', { fur: '#6a8a5a', mane: '#3e5a3a', belly: '#a8b890', eye: '#ffd23a' }],
  ice_wolf: ['wolf', { fur: '#d8ecf8', mane: '#8ac0e0', belly: '#ffffff', eye: '#3ad0ff' }],
  frost_goblin: ['goblin', { skin: '#8ad0e8', cloth: '#4a5a8a', hair: '#e8f4ff', club: '#a8d8f0', eye: '#ffffff' }, { ice: true }],
  storm_bat: ['bat', { fur: '#8a7020', wing: '#e0b830', bone: '#6a5010', eye: '#7af0ff' }],
  skeleton_knight: ['skeleton', { armor: '#4a62a8', shield: '#3a4a7a', trim: '#e0c050', eye: '#7ad8ff' }, { helm: true }],
  frozen_knight: ['skeleton', { bone: '#d8f0ff', armor: '#8ad0f0', shield: '#5a8ab8', trim: '#ffffff', metal: '#c8f0ff', eye: '#3ad0ff' }, { helm: true }],
  // Hopsend Isle: autumn orchard-and-brewery recolours
  hop_goblin: ['goblin', { skin: '#98b840', cloth: '#e8901c', metal: '#c8c090', hair: '#5a3a1a', club: '#4a7a2a', eye: '#ff5a2a' }],
  scarecrow: ['bandit', { skin: '#ecd470', hood: '#d4721c', vest: '#7a3a2a', cloth: '#4a8a3a', pants: '#6a5030', boots: '#3a2a1a', steel: '#b8b0a0', eye: '#ffffff' }, { desert: true }],
  pumpkin_slime: ['slime', { goo: '#ee7a1a', mouth: '#3a1a08', foam: '#f6e8cc' }, { foam: true }],
  cider_wolf: ['wolf', { fur: '#c4502a', mane: '#6a2a14', belly: '#f0c880', eye: '#a8ff40', nose: '#2a1008' }],
  barrel_imp: ['imp', { skin: '#d49a30', wing: '#5a3412', horn: '#f0e4c0', eye: '#ffffff', fire: '#fff0a0' }],
  straw_golem: ['golem', { rock: '#dcba50', dark: '#a68228', glow: '#fff080', moss: '#8a9a30' }],
  brew_wraith: ['wraith', { cloak: '#c8841a', inner: '#2a1408', hand: '#f0d890', eye: '#fff27a' }],
  wasp_swarm: ['hornet', { body: '#f6d414', stripe: '#14100c', wing: '#e8f6ff', eye: '#ff2a2a', sting: '#ffffff' }],
};
// ---------- bestiary expansion: new monster designs (all face right, lit from the upper left) ----------
TEX.ribs = (x) => (x % 4 === 0 ? -0.16 : x % 4 === 1 ? 0.06 : 0);
TEX.grain = (x, y) => (x % 3 === 0 ? -0.12 : 0) + (hash(x, y >> 2, 4) < 0.08 ? -0.1 : 0);
TEX.wrap = (x, y) => ((y + (x >> 1)) % 4 === 0 ? -0.2 : (y + (x >> 1)) % 4 === 1 ? 0.06 : 0);
TEX.feather = (x, y) => ((x + y * 2) % 5 === 0 ? -0.12 : 0) + (y % 4 === 0 ? -0.05 : 0);
TEX.wart = (x, y) => (hash(x >> 1, y >> 1, 11) < 0.12 ? -0.16 : 0) + (hash(x, y, 12) < 0.05 ? 0.12 : 0);
const chain = (pts, r, m, z, o = {}) => { const out = []; for (let i = 0; i < pts.length - 1; i++) out.push(cap(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r[i], r[i + 1], m, { z, ...o })); return out; };
function bolts(a, list, col = '#fff27a') { for (const [x, y] of list) { a.line(x, y, x + 2, y + 3, col); a.line(x + 2, y + 3, x, y + 4, col); a.line(x, y + 4, x + 2, y + 7, '#ffffff'); } }
Object.assign(MODELS, {
  hornet: { col: { body: '#e8b830', stripe: '#2a2018', wing: '#e8f4ff', eye: '#b0182a', sting: '#f0e8d8' }, build(P) {
    const m = { body: mat(P.body, 5, { spec: '#fff8d0', specAt: 0.9 }), stripe: mat(P.stripe, 4), wing: mat(P.wing, 4, { lift: 0.18, nocrease: true, tex: (x, y) => ((x + y) % 5 === 0 ? -0.1 : 0) }), sting: mat(P.sting, 3), eye: mat(P.eye, 3, { spec: '#ffffff' }) };
    const ax = [Math.cos(0.45), Math.sin(0.45)], pp = [-ax[1], ax[0]], A = [13, 20], st = [];
    for (const t of [-4.5, -0.5, 3.5]) { const c = [A[0] + ax[0] * t, A[1] + ax[1] * t]; st.push(paint(cap(c[0] - pp[0] * 7, c[1] - pp[1] * 7, c[0] + pp[0] * 7, c[1] + pp[1] * 7, 1.1, 1.1, 'stripe'))); }
    return { w: 42, h: 34, mats: m, parts: [
      ell(21, 6, 6.5, 2.2, 'wing', { z: -6, rot: -0.9 }), // far wing
      ...chain([[22, 19], [20, 25], [21, 29]], [0.8, 0.6, 0.5], 'stripe', -4), ...chain([[25, 19], [27, 24], [29, 27]], [0.8, 0.6, 0.5], 'stripe', -4),
      ell(A[0], A[1], 9, 5.6, 'body', { rot: 0.45, z: 0 }), ...st, poly([[5, 23.5], [0.5, 29], [6.5, 26]], 'sting', { z: 1, bev: 0.8 }),
      ell(22.5, 15.5, 5.2, 4.6, 'stripe', { z: 2 }), paint(ell(22, 13.5, 3.6, 2, 'body')),
      ell(29.5, 14, 4, 3.8, 'body', { z: 4 }), ell(31, 13, 2.2, 2.6, 'eye', { z: 6 }), cap(33, 17, 35.5, 19, 0.8, 0.5, 'stripe', { z: 6 }), cap(31.5, 17.5, 33, 20, 0.7, 0.4, 'stripe', { z: 5 }),
      cap(29, 10.5, 33, 5, 0.45, 0.4, 'stripe', { z: 5 }), cap(30, 10.5, 36, 7, 0.45, 0.4, 'stripe', { z: 5 }),
      ...chain([[24, 19], [23.5, 24], [25, 29]], [0.9, 0.7, 0.5], 'stripe', 3), ...chain([[26.5, 18.5], [29, 23], [31.5, 25]], [0.9, 0.7, 0.5], 'stripe', 3),
      ell(17, 7, 7, 2.4, 'wing', { z: 8, rot: -0.6 }), // near wing
    ], post(a) { a.px(31, 12, '#ffffff'); a.px(32, 13, '#ff6a6a'); a.px(36, 6, a.ramp('stripe', 2)); a.px(33, 4, a.ramp('stripe', 2)); a.line(12, 10, 21, 4, a.ramp('wing', 1)); } };
  } },
  shroom: { col: { cap: '#d23a30', spot: '#f4ecd8', gill: '#c8a888', stem: '#e8d8b8', eye: '#2a1810' }, build(P, V = {}) {
    const m = { cap: mat(P.cap, 5, { spec: V.knot ? '#fff4c8' : '#ffd8d0', specAt: 0.9 }), spot: mat(P.spot, 4), gill: mat(P.gill, 4, { tex: (x) => (x % 2 ? -0.12 : 0) }), stem: mat(P.stem, 5, { tex: 'rough' }) };
    return { w: 38, h: 40, mats: m, parts: [
      ell(19, 13, 16, 10.5, 'cap', { z: 4, d: 0.85 }), cut(poly([[0, 16.2], [38, 16.2], [38, 40], [0, 40]], null)),
      cap(12, 25, 7, 30, 1.8, 1.4, 'stem', { z: -3 }), ell(6.5, 30.5, 1.8, 1.6, 'stem', { z: -3 }),
      ell(14, 36, 4, 2.6, 'stem', { z: -1, d: 0.6 }), ell(24, 36.5, 4.2, 2.6, 'stem', { z: 2, d: 0.6 }),
      ell(19, 27, 8, 9.5, 'stem', { z: 0 }), ell(19, 16.5, 14, 2.6, 'gill', { z: 3, d: 0.4 }),
      ...[[11, 9, 3, 2.4], [20, 6, 2.6, 2], [27, 10, 2.8, 2.4], [16, 13, 2, 1.6], [33, 13, 1.6, 1.6], [6, 13.5, 1.6, 1.4]].map(([x, y, rx, ry]) => paint(ell(x, y, rx, ry, 'spot'))),
      cap(25, 24, 30, 27, 1.8, 1.4, 'stem', { z: 3 }), ell(30.5, 27.5, 1.8, 1.6, 'stem', { z: 3 }),
    ], post(a) {
      a.rect(21, 21, 2, 3, P.eye); a.rect(25, 21, 2, 3, P.eye); a.px(21, 21, '#ffffff'); a.px(25, 21, '#ffffff');
      a.line(22, 27, 25, 27, '#6a3020'); a.px(23, 28, '#6a3020'); a.px(19, 24, '#e89a8a'); a.px(28, 24, '#e89a8a');
      if (V.knot) { // a twisted dough knot with garlic butter and parsley
        const dk = a.ramp('cap', 0), hi = a.ramp('cap', 5);
        for (let k = 0; k < 44; k++) { const x = 5 + k * 0.66, ph = k * 0.5, yA = 9 + Math.sin(ph) * 3.4, yB = 9 - Math.sin(ph) * 3.4; for (const [yy, c] of [[yA, Math.cos(ph) > 0 ? '#8a5420' : '#c88838'], [yB, Math.cos(ph) > 0 ? '#c88838' : '#8a5420']]) for (let d = 0; d < 2; d++) { const X = Math.round(x), Y = Math.round(yy) + d; if (a.mat(X, Y) === 'cap') a.px(X, Y, d ? dk : c); } }
        for (const [x, y] of [[10, 5], [15, 12], [22, 4], [28, 11], [12, 14], [31, 14], [19, 14], [26, 6]]) { a.px(x, y, '#3a8a2a'); a.px(x + 1, y, '#8acc5a'); a.px(x, y + 1, '#2a6a20'); }
        for (const [x, y] of [[14, 8], [24, 12], [29, 6]]) { a.px(x, y, '#fff6a0'); a.px(x + 1, y, '#ffe060'); }
        a.line(15, 17, 15, 19, '#ffe060'); a.line(24, 17, 24, 20, '#ffe060'); a.px(24, 21, '#fff6a0');
      }
    } };
  } },
  boar: { col: { fur: '#7a5038', mane: '#3e2a20', snout: '#c88a78', tusk: '#f4ecd8', hoof: '#2a2020', eye: '#ff5030' }, build(P, V) {
    const m = { fur: mat(P.fur, 5, { tex: 'fur', spec: V.gold ? '#fffbe0' : undefined, specAt: 0.84, ramp: V.gold ? { hi: 0.8 } : undefined }), mane: mat(P.mane, 4, { tex: 'fur' }), snout: mat(P.snout, 4), tusk: mat(P.tusk, 4), hoof: mat(P.hoof, 3) };
    const bristles = []; for (let k = 0; k < 6; k++) { const x = 17 + k * 3.2, y = 11.5 - Math.sin(k / 5 * Math.PI) * 3; bristles.push(poly([[x - 2, y + 3], [x - 0.5, y - 3.5], [x + 1.8, y + 3]], 'mane', { z: 1, bev: 0.9 })); }
    return { w: 50, h: 34, mats: m, parts: [
      cap(7, 15, 4, 14, 0.9, 0.7, 'fur', { z: -4 }), ell(3.5, 13, 1.3, 1.3, 'fur', { z: -4 }),
      cap(15, 24, 14, 30.5, 2.3, 1.8, 'fur', { z: -6 }), ell(14, 31, 2.2, 1.3, 'hoof', { z: -6, d: 0.5 }), cap(31, 24, 33, 30.5, 2.4, 1.8, 'fur', { z: -6 }), ell(33, 31, 2.2, 1.3, 'hoof', { z: -6, d: 0.5 }),
      ...bristles, ell(21, 19.5, 14, 8.5, 'fur', { z: 0 }), ell(11, 19.5, 6.5, 7, 'fur', { z: 0.5 }), ell(29, 16, 8.5, 8.5, 'mane', { z: 1 }),
      cap(11, 24, 11.5, 30.5, 2.6, 1.9, 'fur', { z: 2 }), ell(11.5, 31, 2.3, 1.3, 'hoof', { z: 2, d: 0.5 }), cap(29, 24, 29.5, 31, 2.8, 2, 'fur', { z: 3 }), ell(29.5, 31.6, 2.5, 1.3, 'hoof', { z: 3, d: 0.5 }),
      poly([[33, 13], [32, 6.5], [37, 11]], 'mane', { z: 4, bev: 1 }), ell(37, 19, 7, 6.2, 'fur', { z: 4 }), cap(40, 20.5, 46, 22, 3.6, 2.8, 'fur', { z: 5 }), ell(46.6, 22.2, 1.4, 2.5, 'snout', { z: 6 }),
      cap(42, 25, 43.5, 21, 0.8, 0.5, 'tusk', { z: 7 }), cap(43.5, 21, 45, 18.5, 0.5, 0.3, 'tusk', { z: 7 }),
    ], post(a) {
      a.px(40, 17, P.eye); a.px(41, 17, P.eye); a.px(41, 18, '#200808'); a.line(38, 15.5, 41, 16, a.ramp('mane', 0));
      a.px(47, 21, a.ramp('snout', 0)); a.px(47, 23, a.ramp('snout', 0)); a.line(42, 24, 45, 24, '#2a1010');
      for (const x of [10, 12, 28, 30]) a.px(x, 32, a.ramp('hoof', 0));
      if (V.gold) for (const [x, y] of [[18, 14], [25, 20], [10, 17], [36, 15], [31, 25]]) { a.px(x, y, '#ffffff'); a.px(x - 1, y, '#fff6c0'); a.px(x + 1, y, '#fff6c0'); a.px(x, y - 1, '#fff6c0'); a.px(x, y + 1, '#fff6c0'); }
    } };
  } },
  bandit: { col: { skin: '#d8a070', hood: '#5a4a3a', vest: '#7a5a30', cloth: '#b83a2a', pants: '#4a4a5a', boots: '#3a2a20', steel: '#b8c0d0', eye: '#ffffff' }, build(P, V = {}) {
    const m = { skin: mat(P.skin, 4, { ramp: { lo: 0.5 } }), hood: mat(P.hood, 5, { tex: 'cloth' }), vest: mat(P.vest, 4, { tex: 'rough' }), cloth: mat(P.cloth, 4, { tex: 'cloth' }), pants: mat(P.pants, 4, { tex: 'cloth' }), boots: mat(P.boots, 3), steel: mat(P.steel, 5, { spec: '#ffffff', specAt: 0.85, ramp: { hi: 0.85 } }) };
    const blade = V.desert ? [poly([[28, 15], [31, 4], [35, 0.5], [33.5, 6], [30, 16]], 'steel', { z: 10, bev: 1 })] : [cap(28.5, 14.5, 32.5, 1.5, 1.1, 0.35, 'steel', { z: 10 })];
    return { w: 38, h: 42, mats: m, parts: [
      cap(12, 16, 9, 22, 1.8, 1.5, 'hood', { z: -4 }), cap(9, 22, 8, 26, 1.5, 1.2, 'skin', { z: -4 }), ell(8, 26.5, 1.5, 1.4, 'skin', { z: -4 }),
      cap(14, 28, 12, 34, 2.1, 1.8, 'pants', { z: -2 }), cap(12, 34, 12, 38.5, 1.8, 1.6, 'boots', { z: -2 }), ell(13, 39.5, 3, 1.4, 'boots', { z: -2, d: 0.5 }),
      cap(14, 26, 8, 33, 1.2, 0.8, 'cloth', { z: -1 }), cap(14.5, 26.5, 10, 35, 1, 0.6, 'cloth', { z: -1 }),
      poly([[11, 14], [21, 13], [23, 21], [22, 29], [11, 29], [9.5, 21]], 'vest', { z: 0, bev: 2 }), paint(poly([[15, 14], [18, 14], [17, 29], [15.5, 29]], 'hood')),
      cap(10.5, 27, 22.5, 27, 1.3, 1.3, 'cloth', { z: 2 }), ell(17, 27, 1.4, 1.4, 'steel', { z: 3 }),
      cap(19, 29, 20, 34, 2.2, 1.9, 'pants', { z: 2 }), cap(20, 34, 20.5, 38.5, 1.9, 1.6, 'boots', { z: 2 }), ell(22, 39.5, 3, 1.4, 'boots', { z: 2, d: 0.5 }),
      cap(13, 4, 8, 11, 2.4, 0.8, 'hood', { z: 3 }), ell(17, 8, 5.8, 6, 'hood', { z: 4 }), ell(20, 9, 3.4, 4, 'skin', { z: 6 }), paint(poly([[16, 10.5], [26, 10.5], [24, 14], [17, 14]], 'cloth')),
      cap(19, 16, 24, 19, 1.9, 1.6, 'hood', { z: 7 }), cap(24, 19, 28, 16, 1.6, 1.3, 'skin', { z: 7 }),
      cap(26, 16.5, 30.5, 14, 0.7, 0.7, 'steel', { z: 9 }), ...blade, ell(28.3, 15.6, 1.6, 1.5, 'skin', { z: 11 }),
    ], post(a) { a.px(20, 8, P.eye); a.px(21, 8, '#1a1018'); a.px(23, 8, P.eye); a.px(24, 8, '#1a1018'); a.line(19, 7, 21, 6.6, a.ramp('hood', 0)); a.line(23, 6.6, 25, 7, a.ramp('hood', 0)); a.px(13, 20, a.ramp('vest', 0)); a.px(20, 22, a.ramp('vest', 0));
      if (V.torch) { // a lit torch: the blade becomes a wooden handle with a roaring flame, and a fire-eater's glowing mouth
        for (let y = 0; y <= 9; y++) for (let x = 27; x <= 38; x++) { const cx = 32.2 + Math.sin(y * 0.9) * 0.7, w = y < 3 ? 1.5 + y * 0.9 : y < 7 ? 4 - (y - 3) * 0.2 : 2.6 - (y - 7) * 0.3, d = Math.abs(x - cx); if (d < w) a.px(x, y, d < w * 0.35 ? (y < 4 ? '#ffffff' : '#fff2a0') : d < w * 0.7 ? '#ffc830' : y < 2 ? '#ff7a1a' : '#e04a18'); }
        a.px(25, 11, '#ffc830'); a.px(26, 12, '#ff7a1a'); a.rect(22, 12, 2, 2, '#e04a18'); a.px(23, 12, '#ffd250');
      } } };
  } },
  sapling: { col: { bark: '#7a5a3a', leaf: '#5aa040', bud: '#f0a0c0', eye: '#e8f060' }, build(P) {
    const m = { bark: mat(P.bark, 5, { tex: 'grain' }), leaf: mat(P.leaf, 5, { tex: (x, y) => (hash(x >> 1, y, 21) < 0.2 ? -0.18 : hash(x, y, 22) < 0.08 ? 0.15 : 0) }), void: mat('#1a120c', 2, { flat: 0.1 }) };
    return { w: 38, h: 44, mats: m, parts: [
      ...chain([[14, 20], [8, 16], [5, 10]], [1.8, 1.3, 0.8], 'bark', -4), ell(4.5, 8.5, 3.5, 3, 'leaf', { z: -3 }),
      ...chain([[15, 34], [11, 38], [8, 41]], [2.4, 1.6, 0.9], 'bark', -2), ...chain([[18, 35], [18, 39], [17, 42]], [2.2, 1.6, 1], 'bark', 0), ...chain([[21, 34], [25, 38], [28, 41]], [2.4, 1.6, 0.9], 'bark', 1),
      cap(18, 35, 18, 14, 6.4, 4.8, 'bark', { z: 0 }),
      ell(18, 9, 9, 6.5, 'leaf', { z: 3 }), ell(11, 12, 5.5, 4.6, 'leaf', { z: 2 }), ell(25, 10, 5.8, 5, 'leaf', { z: 4 }), ell(17, 3.8, 5.8, 3.8, 'leaf', { z: 5 }), ell(23, 4.5, 3.8, 3, 'leaf', { z: 5.5 }),
      ...chain([[21, 26], [27, 24], [31, 19]], [1.9, 1.4, 0.9], 'bark', 6), cap(31, 19, 34, 17, 0.7, 0.4, 'bark', { z: 6 }), cap(31, 19, 31.5, 15.5, 0.7, 0.4, 'bark', { z: 6 }), ell(33, 15, 2.6, 2.2, 'leaf', { z: 7 }),
      paint(ell(17, 20.5, 1.6, 1.8, 'void')), paint(ell(21, 20.5, 1.5, 1.8, 'void')), paint(poly([[16, 25], [22, 25], [21, 27.5], [17, 27.5]], 'void')),
    ], post(a) {
      a.px(17, 21, P.eye); a.px(21, 21, P.eye); a.px(17, 25, a.ramp('bark', 3)); a.px(19, 25, a.ramp('bark', 3)); a.px(21, 25, a.ramp('bark', 3));
      for (const [x, y] of [[14, 6], [22, 2], [27, 8], [9, 11], [33, 14]]) { a.px(x, y, P.bud); a.px(x + 1, y, shade(P.bud, 0.75)); a.px(x, y - 1, '#ffffff'); }
      a.line(16, 17, 16, 30, a.ramp('bark', 0)); a.px(13, 32, '#7ac050'); a.px(12, 31, '#7ac050');
    } };
  } },
  spider: { col: { chitin: '#4a3a30', abd: '#3a2a24', mark: '#e8c040', leg: '#2e2420', eye: '#ff3a2a', fang: '#c8b898' }, build(P) {
    const m = { chitin: mat(P.chitin, 5, { spec: '#d8c8b0', specAt: 0.88 }), abd: mat(P.abd, 5, { tex: 'fur' }), mark: mat(P.mark, 4), leg: mat(P.leg, 4, { spec: '#a89888', specAt: 0.9 }), fang: mat(P.fang, 3) };
    const leg = (b, k, f, z, mm = 'leg') => chain([b, k, f], [1.2, 0.9, 0.5], mm, z);
    return { w: 46, h: 34, mats: m, parts: [
      ...leg([28, 19], [37, 9], [44, 28], -7), ...leg([27, 19], [32, 7], [36, 30], -7), ...leg([25, 19], [21, 7], [21, 30], -7), ...leg([24, 19], [15, 9], [10, 29], -7),
      ell(13, 15, 10, 8.5, 'abd', { z: 0, rot: -0.2 }), paint(poly([[9, 10], [13, 13], [17, 10], [16, 14], [13, 17], [10, 14]], 'mark')), paint(ell(8, 19, 1.4, 1.4, 'mark')), paint(ell(15, 20, 1.2, 1.2, 'mark')),
      ell(27, 19, 6.5, 5, 'chitin', { z: 2 }), ell(33, 19, 4, 3.8, 'chitin', { z: 3 }),
      cap(35, 21, 36.5, 25, 1.1, 0.5, 'fang', { z: 6 }), cap(33.5, 21.5, 34, 25.5, 1, 0.45, 'fang', { z: 5 }),
      ...leg([30, 21], [39, 11], [45, 30], 8), ...leg([28, 22], [33, 10], [38, 31], 7), ...leg([26, 22], [22, 10], [24, 31], 6), ...leg([24, 21], [16, 12], [13, 31], 5),
    ], post(a) { for (const [x, y] of [[34, 17], [36, 17], [35, 16], [37, 18]]) a.px(x, y, P.eye); a.px(36, 17, '#ffd0a0'); } };
  } },
  bog_toad: { col: { skin: '#6a7a3a', spot: '#3a4a20', belly: '#d8c878', eye: '#e8d040', mouth: '#2a1810' }, build(P) {
    const m = { skin: mat(P.skin, 5, { tex: 'wart', spec: '#e8f0c0', specAt: 0.9 }), spot: mat(P.spot, 4), belly: mat(P.belly, 4, { tex: 'belly' }), eye: mat(P.eye, 4, { spec: '#ffffff' }) };
    return { w: 44, h: 34, mats: m, parts: [
      ell(9, 24, 6.5, 6.5, 'skin', { z: -3 }), cap(6, 30, 15, 31.5, 1.8, 1.5, 'skin', { z: -3 }),
      ell(21, 22, 14, 9.5, 'skin', { z: 0 }), paint(ell(27, 27, 9, 4.5, 'belly')), ...[[14, 16, 2.4], [19, 14, 1.8], [11, 21, 2], [24, 17, 1.6]].map(([x, y, r]) => paint(ell(x, y, r, r * 0.8, 'spot'))),
      ell(12, 26, 6, 6.5, 'skin', { z: 2 }), cap(9, 31, 18, 32, 2, 1.6, 'skin', { z: 2 }), ...[[18.5, 31], [19, 33]].map(([x, y]) => ell(x, y, 1.3, 1, 'skin', { z: 3 })),
      ell(31, 18.5, 8.5, 6.5, 'skin', { z: 3 }), ell(34, 24, 4.5, 3, 'belly', { z: 4 }),
      ell(29, 12, 3.4, 3.4, 'skin', { z: 5 }), ell(35, 13, 3.2, 3.2, 'skin', { z: 6 }), ell(29.5, 11.4, 2.3, 2.3, 'eye', { z: 6 }), ell(35.4, 12.4, 2.2, 2.2, 'eye', { z: 7 }),
      cap(33, 25, 35, 31, 1.9, 1.5, 'skin', { z: 5 }), ell(36, 31.5, 2.6, 1.2, 'skin', { z: 5, d: 0.5 }),
    ], post(a) {
      a.rect(30, 11, 1, 2, '#100808'); a.rect(36, 12, 1, 2, '#100808');
      for (let x = 27; x <= 39; x++) a.px(x, 20 + (x > 36 ? -1 : 0), P.mouth); a.px(39, 18, P.mouth);
      a.px(38, 16, a.ramp('skin', 0)); a.px(37, 16, a.ramp('skin', 0));
    } };
  } },
  leech: { col: { skin: '#5a3a4a', belly: '#a87878', mouth: '#2a0a14', tooth: '#f0e0d0' }, build(P) {
    const m = { skin: mat(P.skin, 5, { spec: '#f0c8d8', specAt: 0.84, tex: (x, y) => ((x + y) % 4 === 0 ? -0.14 : 0) }), belly: mat(P.belly, 4, { tex: 'belly' }), mouth: mat(P.mouth, 3, { flat: 0.25 }) };
    const seg = [[5, 22, 3.6, 3.2], [10, 21.5, 5, 4.4], [16, 20.5, 5.6, 5.2], [22, 18.5, 5.6, 5.4], [27.5, 15, 5.2, 5.2], [32.5, 11.5, 4.6, 4.6]];
    return { w: 42, h: 28, mats: m, parts: [
      ...seg.map(([x, y, rx, ry], i) => ell(x, y, rx, ry, 'skin', { z: i * 0.6 })), ...seg.slice(1).map(([x, y, rx, ry]) => paint(ell(x + 1, y + ry * 0.62, rx * 0.8, ry * 0.35, 'belly'))),
      ell(37, 10.5, 2.6, 4.8, 'skin', { z: 5, rot: 0.3 }), ell(38.2, 10.8, 1.5, 3.6, 'mouth', { z: 6, rot: 0.3 }),
    ], post(a) {
      for (const [x, y] of [[38, 7], [39, 8], [39, 12], [38, 14], [37, 13]]) a.px(x, y, P.tooth);
      for (const [x, y] of [[33, 7], [35, 8], [34, 6]]) a.px(x, y, '#ff6a3a');
      for (const x of [13, 19, 25, 30]) a.px(x, x < 25 ? 16 : x < 30 ? 11 : 8, a.ramp('skin', 4));
    } };
  } },
  wisp: { col: { flame: '#4ad0b0', core: '#d0fff0', eye: '#0a3a30' }, build(P) {
    const m = { flame: mat(P.flame, 5, { glow: true, lift: 0.22, nocrease: true, ramp: { hi: 0.8 } }), core: mat(P.core, 4, { glow: true, lift: 0.4, nocrease: true }) };
    return { w: 32, h: 40, mats: m, outline: shade(P.flame, 0.35), parts: [
      ...chain([[14, 24], [9, 31], [4, 35], [2, 39]], [5.5, 3.6, 2, 0.6], 'flame', -2), ...chain([[18, 25], [19, 31], [16, 36]], [3, 2, 0.6], 'flame', -2),
      ell(16, 18, 9, 8.5, 'flame', { z: 0 }), ...chain([[16, 11], [15, 5], [17, 0.6]], [5, 2.6, 0.5], 'flame', 1), ...chain([[11, 13], [7, 7], [8, 3]], [3, 1.6, 0.4], 'flame', 1), ...chain([[21, 12], [24, 6], [23, 2]], [3, 1.6, 0.4], 'flame', 1),
      ell(17.5, 18, 5.6, 5.6, 'core', { z: 4 }),
    ], post(a) {
      a.rect(16, 16, 2, 3, P.eye); a.rect(20, 16, 2, 3, P.eye); a.px(18, 21, P.eye); a.px(19, 21, P.eye); a.px(18, 22, P.eye); a.px(19, 22, P.eye);
      for (const [x, y] of [[5, 15], [27, 9], [28, 24], [3, 26], [25, 30]]) { a.px(x, y, P.core); a.px(x, y + 1, a.ramp('flame', 2)); }
    } };
  } },
  lizardman: { col: { scale: '#3a8a6a', belly: '#d8c890', crest: '#c84a2a', shield: '#8a5a30', wood: '#6a4424', steel: '#b8c0d0', eye: '#ffd23a' }, build(P) {
    const m = { scale: mat(P.scale, 5, { tex: 'scale' }), belly: mat(P.belly, 4, { tex: 'belly' }), crest: mat(P.crest, 4), shield: mat(P.shield, 4, { tex: 'grain' }), wood: mat(P.wood, 4), steel: mat(P.steel, 5, { spec: '#ffffff', ramp: { hi: 0.85 } }) };
    return { w: 40, h: 46, mats: m, parts: [
      ...chain([[13, 28], [7, 34], [3, 40], [1, 44]], [3.6, 2.6, 1.6, 0.6], 'scale', -6),
      ell(9, 21, 5, 6.5, 'shield', { z: -5, d: 0.45 }), paint(cap(9, 15, 9, 27, 0.8, 0.8, 'steel')), ell(9, 21, 1.6, 1.6, 'steel', { z: -3 }),
      ...chain([[15, 28], [12, 35], [15, 41]], [2.4, 1.8, 1.4], 'scale', -3), ell(16.5, 42, 2.8, 1.2, 'scale', { z: -3, d: 0.5 }),
      ell(18, 21.5, 6.5, 8.5, 'scale', { z: 0 }), paint(ell(21, 23, 3.6, 6.8, 'belly')), cap(12, 27.5, 24, 27.5, 1, 1, 'shield', { z: 2 }),
      ...chain([[20, 28], [24, 35], [22, 41]], [2.6, 1.9, 1.5], 'scale', 2), ell(24, 42, 3, 1.2, 'scale', { z: 2, d: 0.5 }),
      cap(12, 39, 34, 2.5, 0.75, 0.75, 'wood', { z: 3 }), poly([[33, 4], [35.5, -1], [36.5, 5], [34, 7]], 'steel', { z: 4, bev: 0.9 }), cap(32, 6.5, 34.5, 8, 0.7, 0.7, 'crest', { z: 4 }),
      poly([[17, 7], [12, 2], [14, 7], [10, 6], [16, 11]], 'crest', { z: 4, bev: 1 }),
      ell(22, 10, 5, 4.6, 'scale', { z: 5 }), cap(24, 11, 31, 12.5, 3.2, 1.8, 'scale', { z: 6 }), cap(24, 14, 30, 14, 1.6, 1, 'belly', { z: 5.5 }),
      cap(19, 16, 24, 21, 1.9, 1.6, 'scale', { z: 7 }), cap(24, 21, 27.5, 19, 1.6, 1.3, 'scale', { z: 7 }), ell(27.5, 19.3, 1.6, 1.5, 'scale', { z: 9 }),
    ], post(a) { a.px(24, 9, P.eye); a.px(25, 9, P.eye); a.px(25, 10, '#100808'); a.line(23, 8, 26, 8, a.ramp('scale', 0)); a.line(26, 13, 31, 13, '#1a2a20'); fangs(a, [[28, 13], [30, 13]], '#fff8e0'); a.px(31, 11, a.ramp('scale', 0)); } };
  } },
  scorpion: { col: { shell: '#c8903a', shell2: '#8a5a28', sting: '#3a1a18', eye: '#100808' }, build(P) {
    const m = { shell: mat(P.shell, 5, { spec: '#fff0c0', specAt: 0.86, tex: 'rough' }), shell2: mat(P.shell2, 4, { tex: 'rough' }), sting: mat(P.sting, 4, { spec: '#ffffff' }) };
    const legs = []; for (const [bx, fx, z, mm] of [[15, 11, -5, 'shell2'], [19, 18, -5, 'shell2'], [23, 25, -5, 'shell2'], [26, 31, -5, 'shell2'], [16, 13, 4, 'shell'], [20, 20, 4, 'shell'], [24, 27, 4, 'shell'], [27, 33, 4, 'shell']]) legs.push(...chain([[bx, 26], [(bx + fx) / 2 + (z > 0 ? 0 : 1), 23 + (z > 0 ? 4 : 2)], [fx, z > 0 ? 34 : 32]], [0.9, 0.8, 0.45], mm, z));
    return { w: 48, h: 36, mats: m, parts: [
      ...chain([[30, 26], [35, 28], [39, 26]], [1.8, 1.6, 1.4], 'shell2', -4), ell(42, 25.5, 3.6, 2.4, 'shell2', { z: -4 }), poly([[43, 23.5], [47, 22.5], [44, 25]], 'shell2', { z: -4, bev: 0.8 }),
      ...legs.slice(0, 8),
      ell(9, 23, 4, 3.6, 'shell', { z: 0 }), ell(13.5, 24, 5, 4.4, 'shell', { z: 0.5 }), ell(21, 25, 9.5, 5.5, 'shell', { z: 1 }),
      ...[[6, 18, 3.4, 3.2], [5.5, 12, 3.2, 3], [8.5, 6.5, 3, 2.8], [14, 3.5, 2.8, 2.6], [19.5, 4, 2.6, 2.4]].map(([x, y, rx, ry], i) => ell(x, y, rx, ry, 'shell', { z: 2 + i * 0.4 })),
      ell(23.5, 6.5, 2.8, 2.3, 'shell2', { z: 5 }), poly([[25, 6.5], [29.5, 10.5], [25, 9]], 'sting', { z: 6, bev: 0.8 }),
      ...legs.slice(8),
      ...chain([[27, 23], [32, 20], [35, 18.5]], [2.3, 2, 1.8], 'shell', 6), ell(38.5, 18, 4.6, 3, 'shell', { z: 7 }), poly([[39, 15.6], [46.5, 14.5], [41, 18]], 'shell', { z: 8, bev: 1 }), poly([[39, 20.5], [46, 21], [40.5, 19]], 'shell2', { z: 8, bev: 1 }),
    ], post(a) { a.px(29, 22, P.eye); a.px(30, 21, P.eye); a.px(30, 22, '#ff6a3a'); for (const x of [17, 21, 25]) a.line(x, 21, x + 1, 29, a.ramp('shell', 1)); a.px(28, 10, '#ffffff'); } };
  } },
  sandworm: { col: { skin: '#c8986a', plate: '#7a5a3a', sand: '#e0c080', maw: '#3a0a18', tooth: '#fff4e0' }, build(P) {
    const m = { skin: mat(P.skin, 5, { tex: 'belly', spec: '#fff0d0', specAt: 0.9 }), plate: mat(P.plate, 4, { tex: 'stone' }), sand: mat(P.sand, 5, { tex: 'rough' }), maw: mat(P.maw, 3, { flat: 0.25 }) };
    const seg = [[19, 42, 10, 6.5, 0.2], [17.5, 34, 9.6, 6.2, 0.1], [19.5, 26, 9, 6, -0.3], [25, 19, 8.6, 6, -0.7], [31.5, 13.5, 8, 6.6, -0.9]];
    return { w: 52, h: 52, mats: m, crease: 1.8, parts: [
      ...seg.map(([x, y, rx, ry, r], i) => ell(x, y, rx, ry, 'skin', { z: i * 1.2, rot: r })),
      ...[[11, 33, 3.6, 5], [12.5, 25, 3.6, 4.6], [17, 17, 3.4, 4.2], [23, 10.5, 3.2, 3.8]].map(([x, y, rx, ry], i) => ell(x, y, rx, ry, 'plate', { z: 2 + i * 1.3, d: 0.7 })),
      ell(38, 12.5, 4.5, 8, 'skin', { z: 8, rot: -0.35 }), ell(39.5, 12.2, 3, 6.4, 'maw', { z: 9, rot: -0.35 }),
      ell(24, 47.5, 23, 5.2, 'sand', { z: 6, d: 0.45 }), ell(8, 48, 6, 3, 'sand', { z: 7, d: 0.5 }), ell(40, 48.5, 7, 2.8, 'sand', { z: 7, d: 0.5 }),
    ], post(a) {
      for (const [x, y] of [[38, 6], [40, 7], [41, 9], [42, 12], [41, 15], [40, 17], [38, 18], [37, 8], [37, 16]]) { a.px(x, y, P.tooth); }
      a.px(39, 11, '#ff7a3a'); a.px(39, 13, '#ff7a3a'); a.px(40, 12, '#ffb070');
      for (const [x, y] of [[4, 41], [45, 42], [47, 39], [2, 44], [33, 41], [43, 44]]) a.px(x, y, P.sand);
    } };
  } },
  cactus: { col: { cactus: '#4a9a5a', flower: '#ff7ab0', root: '#8a6a40', eye: '#1a1008', spine: '#f8f0d0' }, build(P) {
    const m = { cactus: mat(P.cactus, 5, { tex: 'ribs' }), flower: mat(P.flower, 4), root: mat(P.root, 4), void: mat('#1a2a18', 2, { flat: 0.1 }) };
    return { w: 36, h: 44, mats: m, parts: [
      ...chain([[11, 25], [5, 23], [5, 13]], [3.2, 3.2, 2.8], 'cactus', -2), ell(5, 12.5, 2.8, 2.6, 'cactus', { z: -2 }),
      ell(13, 41, 3.8, 2, 'root', { z: -1, d: 0.6 }), ell(22, 41, 3.8, 2, 'root', { z: 1, d: 0.6 }),
      cap(17.5, 37, 17.5, 11, 8, 7, 'cactus', { z: 0 }), ell(17.5, 10, 7, 6.5, 'cactus', { z: 0.5 }),
      ...chain([[24, 22], [29.5, 21], [30.5, 12]], [3.2, 3.2, 2.8], 'cactus', 3), ell(30.5, 11.5, 2.8, 2.6, 'cactus', { z: 3 }),
      ell(15, 4.2, 3, 2.2, 'flower', { z: 4 }), ell(19.5, 4, 2.6, 2, 'flower', { z: 4.5 }), ell(17, 2.6, 2.4, 1.8, 'flower', { z: 5 }),
      paint(poly([[14, 15], [18, 16.5], [18, 19], [14, 18.5]], 'void')), paint(poly([[20, 16.5], [23, 15], [23, 18.5], [20, 19]], 'void')), paint(poly([[15, 23], [22, 23], [21, 25.5], [16, 25.5]], 'void')),
    ], post(a) {
      a.px(16, 18, '#ffe060'); a.px(21, 18, '#ffe060'); a.px(17, 4, '#ffe060'); a.px(18, 3, '#ffe060'); fangs(a, [[17, 23], [20, 23]], '#f8f0d0');
      for (const [x, y] of [[10, 14], [10, 24], [10, 32], [25, 30], [25, 36], [13, 7], [22, 7], [2, 16], [8, 17], [33, 14], [27, 15], [33, 19], [14, 30], [20, 34]]) { a.px(x, y, P.spine); a.px(x + (x < 18 ? -1 : 1), y - 1, P.spine); }
    } };
  } },
  mummy: { col: { wrap: '#d8c8a0', dark: '#2a2018', gold: '#e0b040', eye: '#ff6a3a' }, build(P) {
    const m = { wrap: mat(P.wrap, 5, { tex: 'wrap', ramp: { lo: 0.4 } }), dark: mat(P.dark, 3, { flat: 0.2 }), gold: mat(P.gold, 4, { spec: '#ffffff' }) };
    return { w: 36, h: 44, mats: m, parts: [
      cap(13, 16, 20, 18, 1.9, 1.6, 'wrap', { z: -4 }), cap(20, 18, 27, 17.5, 1.6, 1.4, 'wrap', { z: -4 }), cap(27, 17.5, 29, 24, 0.6, 0.4, 'wrap', { z: -4 }),
      cap(14, 28, 12, 34, 2.4, 2, 'wrap', { z: -2 }), cap(12, 34, 12, 39.5, 2, 1.7, 'wrap', { z: -2 }), ell(13, 40.5, 3, 1.4, 'wrap', { z: -2, d: 0.5 }),
      poly([[11, 14], [21, 13], [23, 22], [22, 29], [11, 30], [9, 21]], 'wrap', { z: 0, bev: 2.2 }), cap(12, 29, 7, 37, 0.9, 0.6, 'wrap', { z: -1 }),
      poly([[13, 15], [21, 14.5], [19.5, 18.5], [14, 18.5]], 'gold', { z: 2, bev: 1 }), ell(17, 17.5, 1.4, 1.4, 'dark', { z: 3 }),
      cap(19, 29, 21, 34.5, 2.5, 2.1, 'wrap', { z: 2 }), cap(21, 34.5, 21, 39.5, 2.1, 1.8, 'wrap', { z: 2 }), ell(22.5, 40.5, 3, 1.4, 'wrap', { z: 2, d: 0.5 }),
      ell(17.5, 8, 5.6, 6, 'wrap', { z: 4, rot: 0.2 }), paint(poly([[16, 7], [24, 6.5], [24, 9.6], [16, 10]], 'dark')), cap(12, 6, 8, 12, 1, 0.5, 'wrap', { z: 3 }),
      cap(17, 16, 24, 15.5, 2, 1.7, 'wrap', { z: 7 }), cap(24, 15.5, 31, 15.5, 1.7, 1.4, 'wrap', { z: 7 }), cap(28, 16, 30, 23, 0.6, 0.4, 'wrap', { z: 7 }),
      ...[[34, 14.5], [34.2, 16.2], [33.5, 18]].map(([x, y]) => cap(31, 15.5, x, y, 0.5, 0.4, 'dark', { z: 8 })),
    ], post(a) { a.px(19, 8, P.eye); a.px(20, 8, '#ffd080'); a.px(22, 8, P.eye); a.px(23, 8, '#ffd080'); a.px(17, 9, '#100808'); a.line(10, 22, 13, 25, a.ramp('wrap', 0)); a.line(19, 24, 22, 22, a.ramp('wrap', 0)); } };
  } },
  salamander: { col: { skin: '#c83a2a', belly: '#f0a040', fire: '#ff9a2a', eye: '#ffe040' }, build(P, V = {}) {
    const m = { skin: mat(P.skin, 5, { tex: 'scale', spec: '#ffd0a0', specAt: 0.9 }), belly: mat(P.belly, 4, { tex: 'belly' }), fire: mat(P.fire, 5, { glow: true, lift: 0.25, nocrease: true, ramp: { hi: 0.95 } }) };
    const flames = []; for (let k = 0; k < 6; k++) { const x = 13 + k * 3.8, y = 15 - Math.sin(k / 5 * Math.PI) * 1.6, h = 4 + (k % 2) * 2.5; flames.push(...chain([[x, y + 2], [x - 1, y - h * 0.5], [x + 0.6, y - h]], [1.8, 1.1, 0.3], 'fire', -1)); }
    return { w: 48, h: 30, mats: m, parts: [
      ...flames, ...chain([[12, 19], [6, 18], [2.5, 14], [2, 10]], [4, 2.8, 1.8, 1], 'skin', -2), ...chain([[2, 10], [1.4, 6], [3, 2]], [2.2, 1.6, 0.4], 'fire', -1),
      ...chain([[17, 22], [14.5, 25], [16, 27.5]], [1.6, 1.2, 0.8], 'skin', -5), ...chain([[30, 22], [33, 25], [33, 27.5]], [1.6, 1.2, 0.8], 'skin', -5),
      ell(22, 19.5, 12, 5.6, 'skin', { z: 0 }), paint(ell(23, 23.5, 10, 2.2, 'belly')),
      ...chain([[14, 22], [10, 25], [11.5, 28]], [1.9, 1.4, 1], 'skin', 2), ...chain([[29, 22], [26.5, 25.5], [28.5, 28]], [1.9, 1.4, 1], 'skin', 3),
      ell(36, 16.5, 6.4, 4.6, 'skin', { z: 4 }), cap(38, 18, 45, 19, 3.2, 1.8, 'skin', { z: 5 }), cap(39, 20.5, 44, 20.5, 1.4, 0.9, 'belly', { z: 4.5 }),
    ], post(a) {
      a.px(38, 14, P.eye); a.px(39, 14, P.eye); a.px(39, 15, '#200808'); a.line(37, 13, 40, 13, a.ramp('skin', 0)); a.line(40, 19, 45, 19, '#3a0808'); a.px(46, 18, '#3a0808');
      for (const [x, y] of [[19, 17], [25, 16], [31, 18], [15, 20]]) { a.px(x, y, '#ffb040'); a.px(x + 1, y, '#3a0a10'); }
      for (const [x, y] of [[10, 25], [11, 28], [29, 28]]) a.px(x, y, '#f0e0c0');
      if (V.pep) { // pepperoni discs stamped down its back and a cheese-drip mouth
        for (const [cx, cy, r] of [[17, 17.5, 3.6], [25, 15.5, 4], [32, 18, 3.2], [22, 20.5, 2.6]]) for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const d = Math.hypot(x - cx, (y - cy) * 1.15); if (d <= r && a.mat(x, y) === 'skin') a.px(x, y, d > r - 1 ? '#5a0e0c' : (x * 3 + y * 5) % 7 === 0 ? '#ffb090' : (x + y) % 3 === 0 ? '#e04a38' : '#c8382a'); }
        for (const [x, y] of [[18, 16], [24, 14], [29, 17], [22, 19]]) a.px(x, y, '#ffd870');
        a.px(41, 20, '#ffd870'); a.px(41, 21, '#ffd870'); a.px(43, 20, '#ffd870'); a.px(43, 21, '#ffd870'); a.px(43, 22, '#ffb040');
      }
    } };
  } },
  batswarm: { col: { fur: '#4a3a5a', wing: '#6a4a7a', bone: '#2a1a3a', eye: '#ff3a3a' }, build(P) {
    const m = { fur: mat(P.fur, 4, { tex: 'fur' }), wing: mat(P.wing, 4, { lift: -0.04 }), bone: mat(P.bone, 3) }, parts = [], eyes = [];
    const bat = (cx, cy, s, z, up) => {
      const W = [[0, 0], [-4, up ? -6 : -3], [-8, up ? -6 : -2], [-10, up ? -1 : 2], [-7, 0], [-6, 3], [-3, 1.5]].map(([x, y]) => [cx - 1.5 * s + x * s, cy - 1 * s + y * s]);
      parts.push(poly(W, 'wing', { z: z - 1, bev: 1 }), poly(mirrorPts(W, cx), 'wing', { z: z - 1, bev: 1 }));
      parts.push(cap(cx - 1.5 * s, cy - 1 * s, cx - 1.5 * s - 4 * s, cy - (up ? 7 : 4) * s, 0.6, 0.35, 'bone', { z: z - 0.5 }), cap(cx + 1.5 * s, cy - 1 * s, cx + 1.5 * s + 4 * s, cy - (up ? 7 : 4) * s, 0.6, 0.35, 'bone', { z: z - 0.5 }));
      parts.push(ell(cx, cy + 0.6 * s, 2.4 * s, 3 * s, 'fur', { z }), ell(cx, cy - 2.6 * s, 2.3 * s, 2 * s, 'fur', { z: z + 0.5 }), poly([[cx - 2 * s, cy - 3.5 * s], [cx - 2.2 * s, cy - 6.5 * s], [cx - 0.6 * s, cy - 4 * s]], 'fur', { z: z + 1, bev: 0.7 }), poly([[cx + 2 * s, cy - 3.5 * s], [cx + 2.2 * s, cy - 6.5 * s], [cx + 0.6 * s, cy - 4 * s]], 'fur', { z: z + 1, bev: 0.7 }));
      eyes.push([Math.round(cx - 1 * s), Math.round(cy - 2.8 * s)], [Math.round(cx + 1 * s), Math.round(cy - 2.8 * s)]);
    };
    bat(13, 12, 0.85, -6, true); bat(33, 10, 0.95, -3, false); bat(9, 28, 0.9, 0, false); bat(36, 27, 1, 2, true); bat(22, 20, 1.15, 5, false);
    return { w: 46, h: 36, mats: m, parts, post(a) { for (const [x, y] of eyes) a.px(x, y, P.eye); } };
  } },
  ghoul_knight: { col: { armor: '#4a4a5a', cape: '#5a1a24', steel: '#a8a8b8', skin: '#7a8a6a', eye: '#7aff9a', trim: '#8a7a40' }, build(P) {
    const m = { armor: mat(P.armor, 6, { spec: '#d8e0f0', specAt: 0.88, ramp: { hi: 0.7 } }), armor2: mat(shade(P.armor, 0.65), 4), cape: mat(P.cape, 4, { tex: 'cloth' }), steel: mat(P.steel, 5, { spec: '#ffffff', ramp: { hi: 0.8 }, tex: (x, y) => (hash(x, y, 31) < 0.1 ? -0.25 : 0) }), skin: mat(P.skin, 4, { tex: 'rough' }), trim: mat(P.trim, 4) };
    return { w: 42, h: 48, mats: m, crease: 1.6, parts: [
      poly([[11, 12], [22, 12], [25, 28], [23, 45], [19, 40], [15, 46], [11, 41], [7, 45], [5, 30]], 'cape', { z: -9, bev: 1.6 }),
      cap(13, 15, 9, 23, 2.4, 2, 'armor2', { z: -5 }), ell(8.5, 24, 2.3, 2.2, 'armor2', { z: -5 }),
      ...chain([[16, 32], [14, 38], [14, 44]], [2.8, 2.4, 2.2], 'armor2', -3), ell(15, 45.5, 3.6, 1.6, 'armor2', { z: -3, d: 0.5 }),
      poly([[10, 13], [27, 12], [29, 22], [26, 32], [13, 32], [9.5, 22]], 'armor', { z: 0, tilt: [-0.1, -0.1], bev: 2 }), poly([[14, 15], [25, 14], [26, 22], [20, 27], [14, 22]], 'armor', { z: 1.5, tilt: [0.2, 0.15], bev: 1.6 }),
      cap(11, 30, 27, 30, 1.2, 1.2, 'trim', { z: 3 }), poly([[11, 31], [27, 31], [28, 36], [11, 36]], 'armor2', { z: 2, bev: 1.2 }),
      ...chain([[23, 33], [25, 39], [25, 44]], [3, 2.6, 2.3], 'armor', 3), ell(27, 45.5, 3.8, 1.6, 'armor', { z: 3, d: 0.5 }),
      ell(20.5, 7.5, 5.8, 5.8, 'armor', { z: 5 }), ...chain([[16.5, 4.5], [13, 2], [11, 4.5]], [1.6, 1, 0.4], 'trim', 6), ...chain([[23.5, 3], [27, 0.8], [29.5, 3]], [1.5, 0.9, 0.4], 'trim', 6),
      cap(30, 25, 35, 25, 0.9, 0.9, 'trim', { z: 9 }), cap(32, 26, 37, 46, 1.9, 0.7, 'steel', { z: 8 }), cap(31.4, 22.5, 32.1, 25, 0.7, 0.7, 'trim', { z: 9 }),
      ell(26, 14, 5, 4, 'armor', { z: 8 }), poly([[24, 11], [26, 6], [28, 11]], 'armor', { z: 9, bev: 0.8 }), cap(27, 17, 30.5, 23, 2.2, 1.9, 'armor', { z: 10 }), ell(31.5, 24, 2.2, 2, 'skin', { z: 11 }),
    ], post(a) { a.rect(19, 7, 6, 1, '#0a0810'); a.rect(21, 5, 1, 5, '#0a0810'); a.px(20, 7, P.eye); a.px(23, 7, P.eye); a.px(24, 7, '#ffffff'); a.px(15, 33, a.ramp('armor2', 3)); a.px(23, 34, a.ramp('armor2', 3)); a.px(21, 19, '#7aff9a'); } };
  } },
  banshee: { col: { gown: '#8aa0c8', hair: '#e8eef8', skin: '#c8d8e8', eye: '#a0f0ff' }, build(P) {
    const m = { gown: mat(P.gown, 5, { tex: 'cloth', lift: 0.08 }), hair: mat(P.hair, 5, { tex: (x, y) => ((x * 2 + y) % 5 === 0 ? -0.14 : 0), lift: 0.05 }), skin: mat(P.skin, 4), void: mat('#0e0a1a', 2, { flat: 0.1 }) };
    return { w: 38, h: 48, mats: m, parts: [
      poly([[15, 3], [22, 2], [23, 10], [17, 17], [10, 25], [2, 32], [5, 22], [0.5, 17], [6, 11]], 'hair', { z: -6, bev: 1.6 }), ...chain([[14, 9], [6, 14], [1, 12]], [1.4, 1, 0.4], 'hair', -5),
      cap(16, 16, 12, 22, 1.2, 1, 'skin', { z: -3 }), cap(12, 22, 9, 25, 1, 0.6, 'skin', { z: -3 }),
      poly([[14, 15], [22, 14], [26, 26], [27, 36], [24, 43], [21, 37], [18, 46], [15, 38], [11, 46], [10.5, 34], [10, 24]], 'gown', { z: 0, bev: 2.2 }),
      ell(19, 6.5, 5.6, 4.8, 'hair', { z: 4 }), ell(22.5, 9.5, 3.4, 4.6, 'skin', { z: 5 }), cap(18, 9, 16, 16, 2, 1.2, 'hair', { z: 6 }),
      paint(ell(23.5, 8.6, 1.2, 1.2, 'void')), paint(ell(25.4, 9, 1, 1.1, 'void')), paint(ell(25, 12.6, 1.1, 1.6, 'void')),
      cap(21, 16.5, 27, 20, 1.3, 1.1, 'skin', { z: 7 }), cap(27, 20, 33, 17, 1.1, 0.9, 'skin', { z: 7 }), ...[[36, 14.5], [36.5, 17], [35.5, 19.5]].map(([x, y]) => cap(33, 17, x, y, 0.5, 0.35, 'skin', { z: 8 })),
    ], post(a) { a.px(23, 9, P.eye); a.px(25, 9, P.eye); a.px(25, 13, '#3a1020'); for (const [x, y] of [[29, 10], [31, 9], [30, 13], [33, 12]]) a.px(x, y, '#d0f4ff'); } };
  } },
  bone_whelp: { col: { bone: '#e0d8c0', membrane: '#4a2a5a', soul: '#b080ff', eye: '#c070ff' }, build(P) {
    const m = { bone: mat(P.bone, 5, { tex: 'bone', ramp: { lo: 0.38 } }), membrane: mat(P.membrane, 4, { tex: (x, y) => (hash(x >> 1, y >> 1, 41) < 0.08 ? -0.3 : 0) }), soul: mat(P.soul, 5, { glow: true, lift: 0.3, nocrease: true, ramp: { hi: 0.9 } }) };
    const ribs = []; for (let k = 0; k < 5; k++) { const x = 17 + k * 2.6; ribs.push(...chain([[x, 20], [x - 1.4, 24.5], [x + 0.6, 28.5]], [0.75, 0.7, 0.55], 'bone', 2)); }
    const W = [[25, 18], [22, 6], [16, 1], [13, 7], [8, 4], [9, 11], [3, 13], [11, 16], [9, 20], [16, 19]];
    return { w: 50, h: 40, mats: m, parts: [
      poly(W, 'membrane', { z: -8, bev: 1.2 }), ...chain([[25, 18], [22, 6], [16, 1]], [1.2, 1, 0.6], 'bone', -7), ...[[8, 4], [3, 13], [9, 20]].map(([x, y]) => cap(22, 6, x, y, 0.8, 0.4, 'bone', { z: -7 })),
      ...chain([[13, 22], [7, 27], [3, 25], [1.5, 20]], [1.5, 1.1, 0.8, 0.4], 'bone', -2), ...[[9, 25.5], [5, 26.5]].map(([x, y]) => ell(x, y, 1.4, 1.4, 'bone', { z: -1.5 })),
      ell(22, 25, 6.5, 4.2, 'soul', { z: -1 }), ...chain([[12, 22], [20, 20], [29, 19.5], [34, 15], [38, 12.5]], [1.6, 1.5, 1.5, 1.2, 1.1], 'bone', 0),
      ...[[15, 21], [19, 20.2], [23, 19.8], [27, 19.6], [32, 16.5], [35.5, 13.5]].map(([x, y]) => ell(x, y, 1.6, 1.4, 'bone', { z: 1 })), ...ribs,
      ell(13, 23.5, 3, 2.4, 'bone', { z: 1 }), ...chain([[14, 24], [12, 30], [15, 34]], [1.3, 1, 0.8], 'bone', 3), ...chain([[29, 21], [31.5, 27], [29.5, 32]], [1.3, 1, 0.8], 'bone', 3),
      ...chain([[11, 24], [9, 30], [11.5, 34]], [1.1, 0.9, 0.7], 'bone', -3), ...chain([[27, 21], [28, 27], [26.5, 32]], [1.1, 0.9, 0.7], 'bone', -3),
      ell(41, 12, 5, 4.2, 'bone', { z: 5 }), cap(43, 12.5, 49, 14.5, 3, 1.6, 'bone', { z: 6 }), cap(41, 16.5, 47.5, 18.5, 1.3, 0.8, 'bone', { z: 4 }), ...chain([[38.5, 9], [34, 5.5], [31, 5]], [1.3, 0.8, 0.3], 'bone', 6),
    ], post(a) {
      a.rect(41, 10, 3, 3, '#140a1c'); a.px(42, 11, P.eye); a.px(43, 11, '#ffffff'); a.px(47, 13, '#140a1c'); fangs(a, [[44, 16], [46, 16], [48, 16]], '#fff8e8');
      for (const [x, y] of [[16, 34], [30, 32], [12, 34], [27, 32]]) a.px(x, y, '#fff8e8'); a.px(22, 24, '#ffffff'); a.px(21, 25, '#e0d0ff');
    } };
  } },
  ice_elemental: { col: { ice: '#8ad0f0', ice2: '#5a9ad0', core: '#e8ffff', eye: '#ffffff' }, build(P, V) {
    const m = { ice: mat(P.ice, 5, { spec: '#ffffff', specAt: 0.85, tex: V.bolt ? 'rough' : 'ice', ramp: { hi: 0.8 } }), ice2: mat(P.ice2, 4, { tex: V.bolt ? 'rough' : 'ice' }), core: mat(P.core, 4, { glow: true, lift: 0.35, nocrease: true }) };
    const t = (pts, mm, tilt, z, bev = 1.4) => poly(pts, mm, { z, tilt, bev });
    return { w: 40, h: 46, mats: m, parts: [
      t([[5, 16], [10, 13], [12, 20], [8, 25], [4, 22]], 'ice2', [-0.3, -0.2], -6), t([[6, 27], [10, 26], [9, 32]], 'ice2', [-0.2, 0.2], -6),
      t([[13, 29], [26, 29], [19.5, 43]], 'ice2', [0.2, 0.3], -1), t([[11, 14], [26, 13], [29, 23], [20, 34], [11, 24]], 'ice', [-0.25, -0.25], 0, 1.8), t([[19.5, 14], [26, 13], [29, 23], [20.5, 30]], 'ice', [0.4, -0.05], 1, 1.2),
      t([[15, 22], [19, 19], [23, 22], [19, 26]], 'core', [0, 0], 3, 1),
      t([[14, 5], [19.5, 0], [26, 5], [24, 12], [16, 12]], 'ice', [-0.25, -0.3], 4), t([[20, 0.5], [26, 5], [24, 12], [21, 9]], 'ice', [0.45, 0], 5, 1),
      t([[28, 12], [34, 8], [36, 15], [31, 19]], 'ice', [0.2, -0.3], 6), t([[31, 21], [36, 19], [38, 25], [33, 27]], 'ice', [0.3, 0], 6), t([[33.5, 28], [37, 28], [35, 33]], 'ice2', [0.2, 0.2], 6),
      t([[25, 36], [29, 34], [29, 39]], 'ice2', [0.3, 0], 2), t([[8, 36], [12, 37], [9, 40]], 'ice2', [-0.2, 0.2], -2),
    ], post(a) {
      a.rect(18, 6, 2, 1, P.eye); a.rect(22, 6, 2, 1, P.eye); a.px(18, 7, shade(P.ice, 0.5)); a.px(23, 7, shade(P.ice, 0.5));
      a.px(19, 22, '#ffffff'); a.px(20, 21, '#ffffff');
      if (V.bolt) bolts(a, [[3, 30], [30, 30], [14, 37], [36, 5]], P.core); else for (const [x, y] of [[3, 34], [33, 4], [37, 35], [14, 42]]) { a.px(x, y, '#ffffff'); a.px(x - 1, y, P.ice); a.px(x + 1, y, P.ice); a.px(x, y - 1, P.ice); a.px(x, y + 1, P.ice); }
    } };
  } },
  harpy: { col: { feather: '#e8f0fa', wing: '#a0bce0', wing2: '#7894c0', skin: '#c8d4e8', hair: '#3a4a90', leg: '#8a8070', eye: '#ffd23a' }, build(P) {
    const m = { feather: mat(P.feather, 5, { tex: 'feather', ramp: { lo: 0.45 } }), wing: mat(P.wing, 5, { tex: 'feather' }), wing2: mat(P.wing2, 4, { tex: 'feather' }), skin: mat(P.skin, 4), hair: mat(P.hair, 4, { tex: (x, y) => ((x + y * 2) % 4 === 0 ? -0.15 : 0) }), leg: mat(P.leg, 4) };
    return { w: 44, h: 44, mats: m, parts: [
      poly([[18, 15], [12, 3], [5, 0.5], [1, 5], [6, 7], [1, 11], [7, 13], [2, 18], [10, 18], [8, 23], [15, 20]], 'wing2', { z: -6, bev: 1.4 }),
      poly([[23, 15], [24, 4], [30, 0.5], [37, 2], [33, 5], [39, 7], [33, 9], [37, 13], [30, 14], [32, 18], [26, 18]], 'wing', { z: -3, bev: 1.4 }),
      poly([[16, 28], [5, 34], [3, 39], [9, 37], [11, 41], [17, 32]], 'wing2', { z: -2, bev: 1.2 }),
      ...chain([[18, 31], [16, 36], [18, 40.5]], [1.2, 0.9, 0.7], 'leg', -1), ...chain([[23, 31], [25.5, 36], [24, 40.5]], [1.3, 1, 0.8], 'leg', 2),
      ell(20.5, 21, 4.6, 6.2, 'skin', { z: 0 }), paint(ell(20.5, 25, 5, 3, 'feather')), ell(20, 28.5, 5.6, 4.4, 'feather', { z: 1 }),
      ...chain([[19, 7], [13, 10], [9, 15], [7, 19]], [3, 2.4, 1.6, 0.6], 'hair', 2), ell(22, 9.5, 4, 4.6, 'skin', { z: 4 }), ell(20.5, 6.8, 4.8, 3.6, 'hair', { z: 5 }), cap(19, 8, 18, 14, 1.8, 1, 'hair', { z: 5 }),
      ell(26, 17, 3, 3, 'feather', { z: 6 }), ...chain([[27, 17], [33, 13], [38, 11]], [2.6, 2, 1], 'wing', 6), ...chain([[33, 13], [39, 15]], [1.4, 0.6], 'wing', 6.5),
    ], post(a) {
      a.px(23, 9, P.eye); a.px(24, 9, P.eye); a.px(24, 10, '#100808'); a.line(22, 8, 25, 8, a.ramp('hair', 0)); a.line(23, 12, 25, 12, '#5a3048');
      for (const [x, y] of [[19, 41], [17, 41], [25, 41], [23, 41]]) a.px(x, y, '#2a2028');
    } };
  } },
  mammoth: { col: { fur: '#7a5a40', fur2: '#5a3e2a', tusk: '#f0e8d0', skin: '#5a4a44', snow: '#eef4fa', eye: '#ffd060' }, build(P) {
    const m = { fur: mat(P.fur, 5, { tex: 'fur' }), fur2: mat(P.fur2, 4, { tex: 'fur' }), tusk: mat(P.tusk, 5, { spec: '#ffffff' }), skin: mat(P.skin, 4), snow: mat(P.snow, 3) };
    const hem = []; for (let k = 0; k <= 12; k++) hem.push([44 - k * 3, 38 + (k % 2 ? 3 : 0)]);
    return { w: 60, h: 52, mats: m, crease: 1.8, parts: [
      cap(9, 24, 5, 31, 1.4, 0.9, 'fur2', { z: -6 }),
      cap(15, 33, 15, 46, 4, 3.6, 'fur2', { z: -6 }), ell(15, 47.5, 4, 1.6, 'skin', { z: -6, d: 0.5 }), cap(36, 33, 37, 46, 4, 3.6, 'fur2', { z: -6 }), ell(37, 47.5, 4, 1.6, 'skin', { z: -6, d: 0.5 }),
      ell(26, 27, 18, 12, 'fur', { z: 0 }), ell(33, 18, 10, 9, 'fur', { z: 1 }), poly([[10, 30], [46, 30], ...hem], 'fur2', { z: 1.5, bev: 1.4 }),
      paint(ell(31, 12, 9, 3.4, 'snow')), paint(ell(18, 17.5, 7, 2.4, 'snow')),
      cap(21, 34, 21, 47, 4.4, 4, 'fur', { z: 3 }), ell(21, 48.5, 4.4, 1.7, 'skin', { z: 3, d: 0.5 }), cap(41, 33, 42, 47, 4.4, 4, 'fur', { z: 4 }), ell(42.5, 48.5, 4.4, 1.7, 'skin', { z: 4, d: 0.5 }),
      ell(44, 22, 8, 9, 'fur', { z: 5 }), ell(43, 15, 6, 5, 'fur', { z: 5.5 }), paint(ell(42, 12, 5, 2, 'snow')), ell(39.5, 21, 3, 4.6, 'fur2', { z: 6 }),
      ...chain([[49, 24], [52, 32], [51, 40], [54, 44.5]], [3.6, 2.8, 2, 1.4], 'fur2', 7),
      ...chain([[47, 28], [51, 36], [56.5, 34], [57, 27]], [2.2, 2, 1.4, 0.5], 'tusk', 9),
    ], post(a) { a.px(47, 19, P.eye); a.px(48, 19, '#100808'); a.line(45, 18, 48, 17.6, a.ramp('fur', 0)); for (const x of [19, 21, 23, 40, 42, 44]) a.px(x, 49, '#d8d0c0'); a.line(53, 44, 55, 45, a.ramp('fur2', 0)); } };
  } },
  crystal_sentinel: { col: { crystal: '#c070e0', crystal2: '#7a3aa8', gold: '#e0b040', core: '#ffe0ff', eye: '#ffffff' }, build(P) {
    const m = { crystal: mat(P.crystal, 5, { spec: '#ffffff', specAt: 0.84, ramp: { hi: 0.85 } }), crystal2: mat(P.crystal2, 4), gold: mat(P.gold, 5, { spec: '#fffbe0' }), core: mat(P.core, 4, { glow: true, lift: 0.4, nocrease: true }) };
    const t = (pts, mm, tilt, z, bev = 1.6) => poly(pts, mm, { z, tilt, bev });
    return { w: 46, h: 50, mats: m, crease: 1.6, parts: [
      t([[1, 18], [9, 16], [10, 31], [5, 36], [0.5, 29]], 'crystal2', [-0.3, 0], -6), paint(poly([[4, 18], [6, 18], [6, 33], [4, 31]], 'gold')),
      t([[13, 34], [20, 34], [19, 48], [12, 48]], 'crystal2', [-0.2, 0], -3), t([[11, 46], [21, 46], [21, 49], [10, 49]], 'gold', [0, -0.3], -2, 1),
      t([[9, 13], [33, 12], [31, 27], [21, 36], [12, 27]], 'crystal', [-0.2, -0.2], 0, 2), t([[21, 13], [33, 12], [31, 27], [21, 33]], 'crystal', [0.4, 0], 1, 1.4),
      cap(12, 13, 31, 12.5, 1.1, 1.1, 'gold', { z: 2 }), t([[17, 19], [21, 16], [25, 19], [21, 25]], 'core', [0, 0], 3, 1), paint(poly([[16.5, 18.5], [21, 15.5], [25.5, 18.5], [21, 25.5]], 'gold')), t([[18, 19.5], [21, 17], [24, 19.5], [21, 23.5]], 'core', [0, 0], 4, 0.8),
      t([[23, 34], [31, 34], [32, 48], [24, 48]], 'crystal', [0.2, 0], 2), t([[23, 46], [33, 46], [34, 49], [22, 49]], 'gold', [0, -0.3], 3, 1),
      t([[5, 15], [8, 3], [13, 9], [13, 16]], 'crystal', [-0.4, -0.2], 4), t([[28, 14], [33, 2], [38, 9], [35, 18]], 'crystal', [0.3, -0.3], 6),
      t([[16, 8], [21, 0.5], [26, 8], [21, 13]], 'crystal', [-0.2, -0.3], 5), t([[21, 0.5], [26, 8], [21, 13]], 'crystal', [0.4, 0], 5.5, 1),
      cap(41, 2, 41, 49, 0.9, 0.9, 'gold', { z: 7 }), t([[41, 1], [45.5, 7], [41, 13], [38, 7]], 'crystal', [0.3, -0.2], 8, 1.2),
      ...chain([[34, 18], [37, 25], [40, 24]], [2.4, 2, 1.8], 'crystal', 9), ell(40.5, 24, 2.2, 2.2, 'gold', { z: 10 }),
    ], post(a) { a.rect(18, 7, 6, 1, '#2a0a3a'); a.px(20, 7, P.eye); a.px(23, 7, P.eye); a.px(22, 7, '#ffd0ff'); for (const [x, y] of [[8, 5], [32, 4], [44, 5]]) a.px(x, y, '#ffffff'); } };
  } },
  thunderbird: { col: { feather: '#3a5ab8', wing: '#4a6ad0', wing2: '#2a3a8a', chest: '#e8eef8', beak: '#f0c030', crest: '#f4d35e', eye: '#ffffff' }, build(P) {
    const m = { feather: mat(P.feather, 5, { tex: 'feather' }), wing: mat(P.wing, 5, { tex: 'feather' }), wing2: mat(P.wing2, 4, { tex: 'feather' }), chest: mat(P.chest, 4, { tex: 'feather' }), beak: mat(P.beak, 4, { spec: '#ffffff' }), crest: mat(P.crest, 4, { glow: true, lift: 0.15 }) };
    return { w: 52, h: 44, mats: m, parts: [
      poly([[22, 19], [16, 5], [8, 0.5], [0.5, 2], [5, 6], [0.5, 9], [7, 11], [2, 15], [10, 16], [6, 21], [16, 22]], 'wing2', { z: -6, bev: 1.4 }),
      poly([[26, 18], [29, 7], [37, 1], [46, 0.5], [43, 5], [50, 6], [44, 10], [48, 13], [39, 15], [34, 21]], 'wing', { z: -3, bev: 1.4 }),
      poly([[17, 26], [4, 33], [7, 37], [3, 41], [11, 39], [12, 43], [19, 31]], 'wing2', { z: -2, bev: 1.2 }),
      ...chain([[24, 29], [25, 34], [28, 36.5]], [1.4, 1.1, 0.8], 'beak', -1),
      ell(23, 23, 8.5, 7.4, 'feather', { z: 0 }), paint(ell(26.5, 25, 4.6, 5.6, 'chest')),
      ...chain([[28, 29], [30, 34], [33, 36]], [1.5, 1.2, 0.9], 'beak', 2),
      ...chain([[30, 12], [24, 8], [19, 7]], [1.6, 1.1, 0.4], 'crest', 3), ...chain([[31, 11], [28, 4], [25, 1.5]], [1.4, 1, 0.4], 'crest', 3.5), ...chain([[33, 10.5], [33, 4], [31, 0.6]], [1.2, 0.9, 0.3], 'crest', 4),
      ell(32, 15, 5.4, 5, 'feather', { z: 5 }), poly([[36, 13], [42, 14.5], [41, 18.5], [37.5, 17]], 'beak', { z: 6, bev: 1 }), ell(29.5, 19, 4, 3, 'chest', { z: 4.5 }),
    ], post(a) { a.px(34, 13, P.eye); a.px(35, 13, P.crest); a.px(35, 14, '#100808'); a.line(33, 12, 36, 12.4, a.ramp('feather', 0)); a.px(41, 18, a.ramp('beak', 0)); a.line(37, 16, 40, 16.5, a.ramp('beak', 0)); for (const x of [26, 28, 31, 33]) a.px(x, 37, '#f0f0f0'); bolts(a, [[9, 7], [39, 5], [6, 30]], P.crest); } };
  } },
});
Object.assign(ENEMY_VARIANTS, {
  golden_boar: ['boar', { fur: '#e0b040', mane: '#a87818', snout: '#f4c8a0', hoof: '#6a4a18', eye: '#ffffff' }, { gold: true }],
  desert_bandit: ['bandit', { hood: '#e8d8b0', vest: '#c89a58', cloth: '#3a7ab8', pants: '#a07848', skin: '#b07848', boots: '#6a4a2a' }, { desert: true }],
  magma_golem: ['golem', { rock: '#5a4440', dark: '#3a2a28', glow: '#ff8a2a', moss: '#ff5a1a' }],
  crystal_golem: ['golem', { rock: '#c8a0f0', dark: '#8a60c0', glow: '#ffe0ff' }, { ice: true }],
  storm_elemental: ['ice_elemental', { ice: '#8a86b8', ice2: '#4a4a7a', core: '#fff27a', eye: '#fff27a' }, { bolt: true }],
  glacier_yeti: ['yeti', { fur: '#a8c8e8', chest: '#7aa0c8', face: '#3a5a8a', horn: '#e8f8ff', eye: '#ff5a4a' }],
});
// ---------- Sunscar Ruins: Temple Cobra and the Sphinx Pharaoh (boss), plus recolored tomb dwellers ----------
Object.assign(MODELS, {
  cobra: { col: { scale: '#c8a040', belly: '#f0dca0', hood: '#2a4aa8', mark: '#f0c040', eye: '#ff3a2a', tongue: '#e0305a' }, build(P) {
    const m = { scale: mat(P.scale, 5, { tex: 'scale', spec: '#fff4c0', specAt: 0.9 }), scale2: mat(shade(P.scale, 0.66), 4, { tex: 'scale' }), belly: mat(P.belly, 4, { tex: 'belly' }), hood: mat(P.hood, 5, { tex: (x, y) => ((x + y) % 5 === 0 ? -0.1 : 0) }), mark: mat(P.mark, 4, { spec: '#ffffff', specAt: 0.9 }) };
    return { w: 42, h: 46, mats: m, parts: [
      ...chain([[5, 42], [2, 38], [5, 34], [8, 35]], [1.6, 1.2, 0.8, 0.5], 'scale2', -2),
      ell(18, 41, 14, 4.6, 'scale2', { z: 0 }), ell(20, 37.5, 11.5, 4.2, 'scale', { z: 2 }), ell(22, 34, 8.5, 3.6, 'scale', { z: 4 }),
      poly([[15, 6], [21, 2], [29, 3], [33, 10], [32, 21], [26, 26], [19, 23], [15, 14]], 'hood', { z: 3, bev: 2.2 }), paint(ell(19.5, 13, 2.6, 3.4, 'mark')), paint(ell(29, 13, 2.6, 3.4, 'mark')),
      ...chain([[23, 33], [27, 26], [25, 18], [26, 10]], [4.4, 4, 3.6, 3.2], 'scale', 6), paint(cap(28.5, 28, 28, 13, 1.8, 1.6, 'belly')),
      ell(29, 7, 5.2, 3.8, 'scale', { z: 9 }), cap(30, 8, 37, 9, 3, 2, 'scale', { z: 9 }),
    ], post(a) { a.px(31, 6, P.eye); a.px(32, 6, '#ffd0c0'); a.line(30, 4, 34, 5, a.ramp('scale', 0)); a.px(36, 8, '#200a08');
      a.line(38, 10, 40, 11, P.tongue); a.px(41, 10, P.tongue); a.px(41, 12, P.tongue); a.px(35, 11, '#fff8e8'); for (const y of [14, 18, 22]) a.line(26, y, 27, y + 1, a.ramp('scale', 1)); } };
  } },
  sphinx: { big: true, col: { fur: '#d8a050', belly: '#f0d090', skin: '#c88a48', gold: '#e8b830', lapis: '#2a4aa8', wing: '#e8c888', disc: '#ffc838', eye: '#40e0ff' }, build(P) {
    const m = { fur: mat(P.fur, 6, { tex: 'fur' }), fur2: mat(shade(P.fur, 0.7), 5, { tex: 'fur' }), belly: mat(P.belly, 5, { tex: 'belly' }), skin: mat(P.skin, 5, { ramp: { lo: 0.4 } }), gold: mat(P.gold, 6, { spec: '#fffbe0', specAt: 0.88 }), lapis: mat(P.lapis, 5, { spec: '#a8c0ff', specAt: 0.92 }),
      wing: mat(P.wing, 5, { tex: 'feather' }), wing2: mat(mix(P.wing, '#8a5a20', 0.45), 4, { tex: 'feather' }), disc: mat(P.disc, 5, { glow: true, lift: 0.25, nocrease: true, ramp: { hi: 0.95 } }), claw: mat('#f0e8d8', 3) };
    const wing = [[60, 50], [46, 30], [30, 18], [12, 14], [2, 20], [12, 26], [4, 32], [16, 37], [8, 44], [24, 48], [18, 55], [40, 58]];
    return { w: 112, h: 98, mats: m, crease: 2, parts: [
      ell(72, 24, 16, 16, 'disc', { z: -30 }),
      poly([[54, 50], [46, 24], [52, 6], [60, 16], [66, 38]], 'wing2', { z: -24, bev: 2 }),
      ...chain([[26, 70], [14, 72], [7, 82], [12, 91]], [3, 2.4, 1.8, 1.4], 'fur2', -12), ell(14, 92, 4.2, 3, 'lapis', { z: -11 }),
      ...chain([[72, 70], [74, 82], [76, 89]], [6, 5, 4], 'fur2', -8), ell(79, 91, 6.5, 3, 'fur2', { z: -8, d: 0.5 }),
      poly(wing, 'wing', { z: -6, bev: 2.4 }),
      ell(56, 68, 30, 15, 'fur', { z: 0 }), paint(ell(62, 78, 22, 6, 'belly')),
      ell(34, 72, 15, 15, 'fur', { z: 2 }), ell(40, 90, 10, 3.6, 'fur', { z: 3, d: 0.5 }),
      ell(80, 60, 13, 15, 'fur', { z: 4 }), paint(ell(84, 64, 7, 10, 'belly')),
      ...chain([[82, 68], [86, 81], [88, 88]], [7, 6, 5], 'fur', 8), ell(93, 91, 8.5, 3.6, 'fur', { z: 9, d: 0.5 }),
      ell(86, 47, 13.5, 6, 'gold', { z: 12 }),
      poly([[74, 17], [84, 8], [98, 9], [104, 18], [102, 28], [107, 48], [99, 51], [95, 41], [82, 41], [78, 51], [70, 49], [74, 29]], 'gold', { z: 13, bev: 2 }),
      ell(94, 28, 7, 9, 'skin', { z: 16 }), cap(99.5, 25, 101.5, 31, 1.3, 1.7, 'skin', { z: 17 }),
      cap(83, 15, 102, 16, 1.4, 1.4, 'lapis', { z: 16.5 }), cap(100, 15, 103, 9, 1.2, 1.5, 'gold', { z: 18 }), ell(103.5, 8, 1.7, 2.1, 'gold', { z: 18.5 }),
      poly([[94, 36], [99.5, 36], [98.5, 48], [95, 48]], 'lapis', { z: 17, bev: 1 }),
    ], post(a) {
      for (let y = 8; y <= 51; y++) for (let x = 68; x <= 108; x++) { if (a.mat(x, y) !== 'gold' || ((x - 86) / 13.5) ** 2 + ((y - 47) / 6) ** 2 <= 1) continue; if (y % 4 < 2 && !(x > 98 && y < 12)) a.px(x, y, (x + y) % 9 === 0 ? a.ramp('lapis', 4) : a.ramp('lapis', y % 4 === 0 ? 3 : 2)); } // nemes stripes
      for (let y = 41; y <= 53; y++) for (let x = 72; x <= 100; x++) { if (a.mat(x, y) !== 'gold') continue; const q = Math.hypot((x - 86) / 13.5, (y - 47) / 6); if (q > 0.5 && q < 0.66) a.px(x, y, a.ramp('lapis', 2)); else if (q > 0.82 && (x % 3 === 0)) a.px(x, y, '#d84a3a'); } // usekh collar
      for (let y = 36; y <= 48; y += 3) a.line(95, y, 98, y, a.ramp('gold', 3)); // braided beard
      a.rect(95, 25, 4, 1, '#1a1010'); a.px(96, 26, P.eye); a.px(97, 26, '#ffffff'); a.px(95, 26, '#1a1010'); a.px(99, 26, '#1a1010'); a.px(100, 27, '#1a1010'); a.line(96, 33, 99, 33, a.ramp('skin', 0)); a.px(99, 23, a.ramp('skin', 0));
      for (const [x0, y0, x1, y1] of [[46, 30, 20, 22], [44, 38, 10, 30], [40, 46, 14, 44], [38, 54, 22, 52]]) a.line(x0, y0, x1, y1, a.ramp('wing', 1)); // feather rows
      for (const [x, y] of [[96, 92], [99, 92], [102, 91], [44, 92], [47, 92], [83, 92], [86, 92]]) { a.px(x, y, '#f0e8d8'); a.px(x, y + 1, '#a09880'); }
      a.px(70, 13, '#ffffff'); a.px(69, 14, '#fff8d0');
    } };
  } },
});
Object.assign(ENEMY_VARIANTS, {
  royal_mummy: ['mummy', { wrap: '#e8d8a8', gold: '#ffd040', dark: '#1a2a6a', eye: '#40e0ff' }],
  ruin_scorpion: ['scorpion', { shell: '#4a4058', shell2: '#2e2638', sting: '#e8b830', eye: '#ff4030' }],
  sand_golem: ['golem', { rock: '#d0a868', dark: '#9a7440', moss: '#ecd090', glow: '#40d0ff' }],
  dust_wraith: ['wraith', { cloak: '#c8a070', inner: '#2a1a10', hand: '#f0dcb0', eye: '#ffb040' }],
});

// ---------- Bearded Bros: the tavern cellar ----------
Object.assign(MODELS, {
  cellar_rat: { col: { fur: '#7a5a40', belly: '#c8a888', tail: '#e0a0a0', nose: '#2a1418', eye: '#100810', tooth: '#fff4e0' }, build(P) {
    const m = { fur: mat(P.fur, 5, { tex: 'fur' }), belly: mat(P.belly, 4, { tex: 'fur' }), tail: mat(P.tail, 4, { tex: 'ribs' }), nose: mat(P.nose, 3) };
    return { w: 42, h: 28, mats: m, parts: [
      ...chain([[9, 21], [4, 20], [1.5, 15], [3, 10], [6, 8.5]], [1.3, 1.1, 0.9, 0.7, 0.5], 'tail', -4),
      cap(11, 20, 9, 25, 1.8, 1.4, 'fur', { z: -3 }), ell(9.5, 25.6, 2.3, 1, 'tail', { z: -3, d: 0.5 }), cap(25, 21, 25, 25, 1.4, 1.1, 'fur', { z: -3 }),
      ell(18, 17, 11.5, 8, 'fur', { z: 0 }), paint(ell(20, 22.5, 9, 3.2, 'belly')),
      cap(13, 21, 13, 25, 2.2, 1.5, 'fur', { z: 2 }), ell(14, 25.6, 2.6, 1.1, 'tail', { z: 2, d: 0.5 }),
      ell(30, 15, 6.2, 5.4, 'fur', { z: 3 }), cap(32, 16, 38, 17.4, 3.2, 1.4, 'fur', { z: 4 }), ell(39, 17.4, 1.3, 1.2, 'nose', { z: 6 }),
      ell(27, 8.6, 3.2, 3.4, 'fur', { z: 5 }), paint(ell(27.2, 8.8, 1.7, 2.1, 'tail')), ell(31.6, 9.6, 2.4, 2.6, 'fur', { z: 4.5 }), paint(ell(31.8, 9.8, 1.2, 1.5, 'tail')),
      cap(31, 20, 33, 24.6, 1.5, 1.2, 'fur', { z: 5 }), ell(34, 25.3, 1.9, 0.9, 'tail', { z: 5, d: 0.5 }),
    ], post(a) {
      a.px(33, 13, P.eye); a.px(34, 13, P.eye); a.px(33, 12, '#ffffff'); a.px(34, 14, a.ramp('fur', 0));
      a.px(37, 19, P.tooth); a.px(37, 20, P.tooth); a.px(36, 19, a.ramp('fur', 0));
      for (const [dx, dy] of [[0, -1], [1, 1], [0, 2]]) a.line(38, 17 + dy, 41, 17 + dy * 2 - 1 + dx, '#e8e0d0');
      a.line(12, 11, 20, 10, a.ramp('fur', -1)); a.px(15, 13, a.ramp('fur', 0)); a.px(22, 12, a.ramp('fur', 0));
    } };
  } },
  big_gary: { big: true, col: { goo: '#c47816', foam: '#f6eedc', tank: '#7a5030', band: '#9aa0ae', eye: '#ffffff', mouth: '#4a1c08', cheek: '#f0603a' }, build(P) {
    const m = { goo: mat(P.goo, 7, { spec: '#fff4d0', specAt: 0.93, lift: -0.08, ramp: { hi: 0.6, lo: 0.4 } }), foam: mat(P.foam, 5, { tex: 'wart', ramp: { lo: 0.6, hi: 0.7 } }),
      tank: mat(P.tank, 5, { tex: 'grain' }), band: mat(P.band, 5, { spec: '#ffffff', ramp: { hi: 0.8 } }), bub: mat('#ffe8b0', 4, { spec: '#ffffff', specAt: 0.8, lift: 0.1 }) };
    const foam = [[22, 26, 9, 6], [34, 20, 10, 7], [48, 17, 11, 8], [62, 20, 10, 7], [74, 27, 9, 6], [40, 11, 6, 5], [56, 10, 6, 5], [48, 5, 5, 4.5], [30, 14, 4.5, 4], [66, 13, 4.5, 4]];
    const drips = [[18, 34, 2.4, 5], [29, 32, 2, 4], [70, 34, 2.2, 6], [80, 36, 2, 4.5], [58, 31, 1.8, 3.4]];
    return { w: 106, h: 92, mats: m, parts: [
      ell(52, 66, 46, 24, 'goo', { d: 0.85 }), ell(50, 48, 34, 28, 'goo', { z: 1 }), ell(14, 84, 7, 4, 'goo', { z: 2 }), ell(92, 85, 7.5, 3.6, 'goo', { z: 2 }), ell(30, 88, 6, 2.6, 'goo', { z: 2 }),
      ...foam.map(([x, y, rx, ry], i) => ell(x, y, rx, ry, 'foam', { z: 4 + (i % 3) * 0.6 })), ...drips.map(([x, y, rx, ry]) => ell(x, y, rx, ry, 'foam', { z: 4.4 })),
      // a pewter-banded tankard stuck in his side, foam still on it
      poly([[74, 62], [92, 56], [98, 78], [80, 84]], 'tank', { z: 34, bev: 2 }), paint(poly([[75, 66], [93, 60], [94, 63.5], [76, 69.5]], 'band')), paint(poly([[78, 77], [96, 71], [97, 74.5], [79, 80.5]], 'band')),
      cap(94, 62, 101, 64, 1.4, 1.4, 'band', { z: 35 }), cap(101, 64, 102, 72, 1.4, 1.4, 'band', { z: 35 }), cap(102, 72, 97, 74, 1.4, 1.4, 'band', { z: 35 }),
      ell(83, 58, 7, 3.6, 'foam', { z: 36 }), ell(78, 56.5, 3, 2.4, 'foam', { z: 36.5 }),
      // burp bubbles drifting up
      ell(14, 30, 4, 4, 'bub', { z: 40 }), ell(8, 18, 2.8, 2.8, 'bub', { z: 40 }), ell(15, 9, 2, 2, 'bub', { z: 40 }), ell(90, 22, 3, 3, 'bub', { z: 40 }), ell(96, 12, 2, 2, 'bub', { z: 40 }),
    ], post(a) {
      const dk = a.ramp('goo', 1), dd = a.ramp('goo', 0);
      // sleepy, tipsy eyes: heavy lids, one higher than the other
      for (const [ex, ey, lid] of [[50, 44, 3], [66, 42, 2]]) { a.rect(ex, ey, 8, 9, '#ffffff'); a.rect(ex + 2, ey + 3, 4, 5, '#18101c'); a.px(ex + 2, ey + 3, '#ffffff'); a.px(ex + 3, ey + 3, '#ffffff'); a.rect(ex - 1, ey - 1, 10, lid + 1, dk); a.line(ex - 1, ey + lid, ex + 8, ey + lid, dd); }
      for (const [cx2, cy2] of [[45, 57], [76, 55]]) for (let j = 0; j < 3; j++) for (let k = -3; k <= 3; k++) if (((k + j) & 1) === 0 && Math.abs(k) + j < 5) a.px(cx2 + k, cy2 + j, P.cheek); // rosy cheeks
      for (let x = 51; x <= 73; x++) { const t = (x - 51) / 22, y = 61 + Math.round(Math.sin(t * Math.PI) * 5); for (let j = 0; j < 2 + Math.round(Math.sin(t * Math.PI) * 3); j++) a.px(x, y + j - 1, j ? '#2a0c04' : P.mouth); } // big daft grin
      a.rect(57, 64, 3, 2, '#fff4e0'); a.rect(64, 65, 3, 2, '#fff4e0'); a.rect(60, 67, 4, 2, '#e05a5a');
      for (const [bx, by] of [[30, 60], [36, 72], [22, 66], [44, 78], [60, 80], [70, 76], [28, 50], [82, 70], [40, 68], [18, 74]]) { a.px(bx, by, a.ramp('goo', -1)); a.px(bx + 1, by, a.ramp('goo', -2)); a.px(bx, by + 1, a.ramp('goo', -2)); }
      for (let y = 66; y < 82; y++) for (let x = 24; x < 30; x++) { const neck = y < 70, w = neck ? 1.2 : 3; if (Math.abs(x + 0.5 - 27) < w && a.mat(x, y) === 'goo') a.px(x, y, dk); } // a swallowed bottle
      a.px(16, 27, '#ffffff'); a.px(9, 16, '#ffffff'); a.px(89, 20, '#ffffff'); a.rect(30, 34, 3, 4, '#fff8e8'); a.px(34, 32, '#fff8e8');
    } };
  } },
});

// a vertical, optionally bulging cylinder part (barrels, vats): shaded across its width, lit from the left
function cylY(cx, y0, y1, r0, r1, m, o = {}) {
  const Rm = Math.max(r0, r1) + (o.bulge || 0);
  return { m, z: o.z || 0, mode: o.mode, bb: [Math.floor(cx - Rm - 1), Math.floor(y0 - 1), Math.ceil(cx + Rm + 1), Math.ceil(y1 + 1)],
    f(px, py, hit) {
      if (py < y0 || py > y1) return false; const t = (py - y0) / (y1 - y0), r = r0 + (r1 - r0) * t + (o.bulge || 0) * Math.sin(Math.PI * t), u = (px - cx) / r;
      if (Math.abs(u) > 1) return false; const nz = Math.sqrt(1 - u * u); hit.nx = u; hit.ny = 0; hit.nz = nz; hit.h = nz * r; return true;
    } };
}
MODELS.mash_tun = { big: true, col: { copper: '#b4521e', oak: '#7e4c26', iron: '#585a6e', foam: '#f6eedc', ale: '#e09420', brass: '#dcae34', wheel: '#c0361e', hose: '#2e2e3a', glass: '#1a3a48', eye: '#ffb818' }, build(P) {
  const m = { copper: mat(P.copper, 6, { spec: '#ffe0a0', specAt: 0.9, lift: -0.04, ramp: { hi: 0.55, lo: 0.28 } }), oak: mat(P.oak, 5, { tex: 'grain' }), iron: mat(P.iron, 5, { spec: '#ffffff', ramp: { hi: 0.8 } }),
    foam: mat(P.foam, 5, { tex: 'wart', ramp: { lo: 0.6, hi: 0.7 } }), ale: mat(P.ale, 5, { spec: '#fff4c0', specAt: 0.86, lift: 0.04 }), brass: mat(P.brass, 5, { spec: '#ffffff', specAt: 0.88, ramp: { hi: 0.8 } }),
    wheel: mat(P.wheel, 5, { spec: '#ffd0c0', specAt: 0.9 }), hose: mat(P.hose, 4, { tex: 'ribs', spec: '#8a8aa0', specAt: 0.9 }), glass: mat(P.glass, 4, { spec: '#c8f4ff', specAt: 0.8 }),
    steam: mat('#e4ecf4', 4, { lift: 0.22, ramp: { lo: 0.7, hi: 0.5 } }), paper: mat('#f4ecd0', 3, { lift: 0.1 }) };
  const foam = [[32, 33, 5, 4], [46, 29, 8, 6], [58, 24, 9, 7], [70, 26, 9, 7], [82, 32, 6, 5], [54, 16, 5.5, 5], [66, 15, 5, 4.5], [76, 20, 4.5, 4]];
  return { w: 124, h: 108, mats: m, parts: [
    // barrel feet and a puddle of spilt ale
    cylY(26, 88, 103, 9, 8, 'oak', { bulge: 1.6 }), cylY(82, 88, 103, 9, 8, 'oak', { bulge: 1.6 }), cylY(54, 90, 105, 10, 9, 'oak', { bulge: 1.8, z: 40 }),
    // the left arm: a ribbed hose with a brass nozzle that dribbles
    cap(26, 56, 12, 62, 4, 4, 'hose', { z: 4 }), cap(12, 62, 7, 76, 4, 4, 'hose', { z: 4 }), cap(7, 76, 12, 88, 4, 4, 'hose', { z: 4 }), cap(12, 88, 16, 94, 3.6, 3, 'hose', { z: 4 }), cap(16, 93, 18, 99, 3.8, 3, 'brass', { z: 5 }),
    ell(26, 56, 5, 6, 'brass', { z: 14 }),
    // the body: a riveted copper vessel, oak belt at the foot
    cylY(54, 34, 92, 31, 32, 'copper', { bulge: 1.5 }),
    paint(poly([[20, 78], [90, 78], [90, 92], [20, 92]], 'oak')),
    paint(poly([[20, 36], [90, 36], [90, 40], [20, 40]], 'iron')), paint(poly([[20, 76], [90, 76], [90, 79.5], [20, 79.5]], 'iron')), paint(poly([[20, 88.5], [90, 88.5], [90, 92], [20, 92]], 'iron')),
    // rim and the lid, ajar on a hinge
    ell(54, 35, 34, 5.5, 'iron', { z: 20, d: 0.7 }),
    poly([[14, 35], [18, 25], [58, 6], [64, 15], [32, 41]], 'oak', { z: 36, bev: 2.2 }),
    paint(poly([[22, 33], [25, 24], [30, 22], [27, 35]], 'iron')), paint(poly([[38, 27], [41, 18], [46, 16], [43, 29]], 'iron')),
    cap(33, 22, 36, 13, 2.4, 2, 'iron', { z: 48 }), ell(36, 12, 3.4, 3.4, 'iron', { z: 49 }),
    // foam heaving over the rim, tongues of it running down the front, and a vent pipe
    ...foam.map(([x, y, rx, ry], i) => ell(x, y, rx, ry, 'foam', { z: 50 + (i % 3) * 0.7 })),
    cap(24, 34, 24, 52, 3.4, 2.2, 'foam', { z: 50 }), cap(46, 34, 46, 46, 3, 2, 'foam', { z: 50 }), cap(85, 37, 85, 47, 2.8, 2, 'foam', { z: 50 }),
    ell(24, 53, 2.4, 2.4, 'foam', { z: 51 }), ell(85, 48, 2.2, 2.2, 'foam', { z: 51 }),
    // gauges
    ell(38, 50, 7, 7, 'brass', { z: 32 }), ell(38, 50, 5, 5, 'paper', { z: 36, d: 0.3 }), ell(30, 69, 5.5, 5.5, 'brass', { z: 32 }), ell(30, 69, 4, 4, 'paper', { z: 36, d: 0.3 }),
    // the porthole face: brass ring round dark glass, a furnace grate beneath
    ell(68, 52, 13, 13, 'brass', { z: 30 }), ell(68, 52, 10, 10, 'glass', { z: 38, d: 0.3 }),
    poly([[55, 67], [85, 67], [86, 80], [54, 80]], 'iron', { z: 31, bev: 1.8 }),
    // the right arm: a copper pipe with brass couplings, ending in a big red valve-wheel fist
    cap(84, 52, 97, 58, 5, 5, 'copper', { z: 24 }), cap(97, 58, 104, 70, 4.6, 4.4, 'copper', { z: 24 }), ell(97, 58, 6.2, 6.2, 'brass', { z: 26 }), ell(84, 52, 5.5, 7, 'brass', { z: 26 }),
    ell(106, 78, 14, 14, 'wheel', { z: 30, d: 0.5 }), cut(ell(106, 78, 9.5, 9.5)),
    cap(106, 64, 106, 92, 1.9, 1.9, 'wheel', { z: 30 }), cap(92, 78, 120, 78, 1.9, 1.9, 'wheel', { z: 30 }), cap(96, 68, 116, 88, 1.7, 1.7, 'wheel', { z: 30 }), cap(116, 68, 96, 88, 1.7, 1.7, 'wheel', { z: 30 }),
    ell(106, 78, 4.4, 4.4, 'brass', { z: 36 }),
    // steam puffs and falling ale
    ell(80, 8, 6, 5, 'steam', { z: 60 }), ell(90, 4.5, 4.6, 3.8, 'steam', { z: 60 }), ell(98, 12, 3.6, 3.2, 'steam', { z: 60 }), ell(8, 18, 5, 4.4, 'steam', { z: 60 }), ell(4, 8, 3.4, 3, 'steam', { z: 60 }),
    ell(17, 103, 1.8, 2.4, 'ale', { z: 60 }), ell(18, 107, 1.4, 1.2, 'ale', { z: 60 }), ell(90, 96, 1.8, 2.6, 'ale', { z: 60 }), ell(96, 100, 3.6, 1.4, 'ale', { z: 5, d: 0.4 }),
  ], post(a) {
    const cu = (i) => a.ramp('copper', i), ir = (i) => a.ramp('iron', i), br = (i) => a.ramp('brass', i);
    // rivets along the bands and the vertical seams
    for (const y of [38, 77.6, 90]) for (let x = 24; x <= 86; x += 5) if (a.mat(x, Math.floor(y)) === 'iron') { a.px(x, Math.floor(y), ir(4)); a.px(x + 1, Math.floor(y) + 1, ir(0)); }
    for (const x of [33, 77]) for (let y = 44; y < 76; y += 5) if (a.mat(x, y) === 'copper') { a.px(x, y, cu(5)); a.px(x + 1, y + 1, cu(0)); }
    for (let y = 43; y < 76; y++) { if (a.mat(35, y) === 'copper' && y % 5 !== 0) a.px(35, y, cu(1)); if (a.mat(79, y) === 'copper' && y % 5 !== 0) a.px(79, y, cu(1)); }
    // oak belt planks
    for (let x = 22; x < 90; x += 6) for (let y = 80; y < 88; y++) if (a.mat(x, y) === 'oak') a.px(x, y, a.ramp('oak', 0));
    // gauges: needles and ticks
    a.line(38, 50, 41, 47, '#d02020'); a.px(38, 50, '#201010'); a.px(35, 53, '#201010'); a.px(41, 53, '#201010'); a.px(38, 46, '#201010');
    a.line(30, 69, 28, 66, '#d02020'); a.px(30, 69, '#201010'); a.px(27, 71, '#201010'); a.px(33, 71, '#201010');
    // the face behind the porthole: glass, two angry amber eyes
    for (let y = 42; y <= 62; y++) for (let x = 58; x <= 78; x++) if (Math.hypot(x - 67.5, y - 51.5) < 9.6) a.px(x, y, y < 45 ? '#18303c' : '#0e1c24');
    for (const ex of [61, 68]) { a.rect(ex, 50, 6, 5, P.eye); a.rect(ex + 1, 51, 4, 3, '#fff4a0'); a.rect(ex + 2, 52, 2, 1, '#ffffff'); a.rect(ex, 49, 6, 1, '#0e1c24'); }
    a.line(60, 47, 66, 50, '#0e1c24'); a.line(75, 47, 69, 50, '#0e1c24'); a.line(60, 48, 66, 51, '#0e1c24'); a.line(75, 48, 69, 51, '#0e1c24'); a.px(61, 49, '#0e1c24'); a.px(74, 49, '#0e1c24');
    for (let k = 0; k < 4; k++) { a.px(62 + k, 56 - (k >> 1) * 0, '#2c6070'); } a.px(63, 55, '#c8f4ff'); a.px(62, 56, '#c8f4ff'); a.px(64, 54, '#9ae0f0');
    // grate mouth: a glowing furnace seen through iron bars, jagged like teeth
    for (let y = 69; y < 79; y++) for (let x = 57; x < 84; x++) { const t = (y - 69) / 9, jag = y < 71 && (x % 4 < 2) ; if (jag) { a.px(x, y, ir(1)); continue; } a.px(x, y, t < 0.35 ? '#fff0a0' : t < 0.7 ? '#ffb020' : '#e05a10'); }
    for (let x = 57; x < 84; x += 4) { a.rect(x, 69, 2, 10, ir(2)); a.px(x, 69, ir(4)); a.px(x + 1, 76, ir(1)); }
    a.rect(57, 74, 27, 1, ir(1)); a.rect(57, 78, 27, 1, ir(0));
    // gleams on the brass ring and the copper
    a.px(60, 44, '#ffffff'); a.px(61, 43, '#fff4c0'); a.px(31, 41, '#ffffff'); a.px(30, 42, cu(5)); a.px(29, 60, cu(5));
    // beer dribbling out of the nozzle
    a.px(18, 100, P.ale); a.px(18, 101, a.ramp('ale', 4)); a.px(17, 104, '#fff4c0');
    for (const [bx, by] of [[28, 34], [50, 17], [64, 19], [76, 25], [40, 21]]) a.px(bx, by, '#ffffff');
    a.px(80, 6, '#ffffff'); a.px(8, 16, '#ffffff'); a.px(90, 3, '#ffffff'); a.px(98, 11, '#ffffff');
    a.px(103, 74, '#ffffff'); a.px(102, 75, '#ffd0c0');
  } };
} };
// ---------- The Margherita (Cinder Isle boss): a colossal pizza stood upright on a wood fire, pepperoni-disc armour, basil eyebrows,
// a crown of peel handles and a pizza peel for a spear ----------
const flame = (x, y0, h, w = 4, lean = 0, mm = 'fire') => poly([[x - w, y0], [x - w * 0.9 + lean * 0.3, y0 - h * 0.4], [x - w * 0.3 + lean * 0.7, y0 - h * 0.75], [x + lean, y0 - h], [x + w * 0.35 + lean * 0.6, y0 - h * 0.62], [x + w * 0.95 + lean * 0.2, y0 - h * 0.35], [x + w, y0]], mm, { bev: 1.2 });
MODELS.margherita = { big: true, col: { crust: '#b8702c', sauce: '#c42a1a', cheese: '#f6d058', brown: '#b0701c', pep: '#b4302a', basil: '#2e9a34', wood: '#b0743e', log: '#5c361a', dough: '#e4b86c', fire: '#ff8a1a', eye: '#ffb818' }, build(P) {
  const m = { crust: mat(P.crust, 6, { tex: 'rough', spec: '#ffe4b0', specAt: 0.93, ramp: { hi: 0.6 } }), sauce: mat(P.sauce, 5, { spec: '#ff9a80', specAt: 0.9 }), cheese: mat(P.cheese, 6, { spec: '#fffbd0', specAt: 0.9, lift: 0.06, tex: 'wart', ramp: { hi: 0.7, lo: 0.4 } }),
    brown: mat(P.brown, 4, { tex: 'wart' }), pep: mat(P.pep, 5, { tex: 'rough', spec: '#ffb8a8', specAt: 0.9 }), basil: mat(P.basil, 5, { spec: '#d8ffb0', specAt: 0.92 }),
    wood: mat(P.wood, 5, { tex: 'grain', spec: '#ffe0b0', specAt: 0.94 }), log: mat(P.log, 5, { tex: 'grain' }), dough: mat(P.dough, 5, { tex: 'rough', spec: '#fff4d0', specAt: 0.93 }), iron: mat('#6a6a7c', 5, { spec: '#ffffff', ramp: { hi: 0.8 } }), brass: mat('#dcae34', 5, { spec: '#fffbe0', specAt: 0.88 }),
    fire: mat(P.fire, 5, { glow: true, lift: -0.02, nocrease: true }), flame2: mat('#ffd040', 4, { glow: true, lift: 0.0, nocrease: true }), ember: mat('#ff4a10', 4, { glow: true, lift: -0.05, nocrease: true }),
    steam: mat('#eef2f6', 4, { lift: 0.22, ramp: { lo: 0.7, hi: 0.5 } }) };
  const pepDisc = (x, y, r, z = 40) => [ell(x, y, r, r, 'pep', { z, d: 0.4 })];
  const back = [[18, 96, 40, 6, -3], [32, 94, 54, 7, -2], [100, 94, 52, 7, 3], [112, 96, 38, 6, 3], [8, 98, 22, 5, -3], [54, 92, 30, 6, 0]];
  return { w: 128, h: 116, mats: m, parts: [
    // the wood fire: flames licking up behind the pizza, then the logs and embers in front
    ...back.map(([x, y, h, w, l]) => flame(x, y, h, w, l)), ...back.slice(0, 4).map(([x, y, h, w, l]) => paint(flame(x, y + 1, h * 0.55, w * 0.5, l, 'flame2'))),
    // left arm (behind): a doughy limb ending in a fist, a string of melted cheese hanging from it
    cap(26, 62, 12, 72, 6, 5.4, 'dough', { z: 50 }), cap(12, 72, 9, 86, 5.4, 4.8, 'dough', { z: 50 }), ell(9, 91, 6.6, 6, 'dough', { z: 52 }), cap(9, 96, 10, 108, 1.2, 0.7, 'cheese', { z: 52 }), ell(10, 109, 1.8, 1.6, 'cheese', { z: 52 }),
    // the pizza: crust ring, a rim of sauce, then the melted cheese
    ell(62, 56, 42, 42, 'crust', { z: 0, d: 0.5 }), ell(62, 56, 33.5, 33.5, 'sauce', { z: 22, d: 0.15 }), ell(62, 55.5, 31, 30.5, 'cheese', { z: 26, d: 0.25 }),
    // cheese lava gloop: lumps spilling over the sauce, brown blisters
    ...[[34, 70, 5, 4], [44, 83, 6, 4], [58, 87, 5, 3.4], [78, 84, 6, 4], [90, 70, 5, 4], [92, 44, 4.4, 4], [88, 33, 5, 3.6], [34, 38, 4.4, 4], [48, 26, 5, 3.4], [76, 25, 5, 3.4]].map(([x, y, rx, ry]) => ell(x, y, rx, ry, 'cheese', { z: 30, d: 0.5 })),
    ...[[40, 36, 2.4, 1.8], [84, 62, 2.6, 2], [50, 78, 2.4, 1.8], [72, 79, 2.2, 1.6], [90, 52, 2, 1.6], [38, 58, 2, 1.6], [70, 30, 2.2, 1.6], [58, 33, 1.8, 1.4], [82, 78, 1.8, 1.4]].map(([x, y, rx, ry]) => paint(ell(x, y, rx, ry, 'brown'))),
    // pepperoni-disc armour: pauldrons on the shoulders of the crust, discs low down
    ...pepDisc(27, 34, 9.5, 40), ...pepDisc(97, 34, 9.5, 40), ...pepDisc(38, 77, 8.5, 40), ...pepDisc(86, 77, 8.5, 40), ...pepDisc(62, 90, 7.5, 40), ...pepDisc(18, 56, 6.4, 40), ...pepDisc(106, 56, 6.4, 40),
    // a crown of pizza-peel handles stuck in the crust, with brass ferrules
    cap(44, 21, 38, 3, 2.3, 2, 'wood', { z: 14 }), cap(62, 17, 62, 2, 2.5, 2.2, 'wood', { z: 14 }), cap(80, 21, 86, 3, 2.3, 2, 'wood', { z: 14 }),
    ell(38, 3.5, 2.8, 2.8, 'brass', { z: 15 }), ell(62, 2.5, 3.2, 3, 'brass', { z: 15 }), ell(86, 3.5, 2.8, 2.8, 'brass', { z: 15 }), cap(43, 19, 41, 12, 2.8, 2.8, 'brass', { z: 15 }), cap(62, 15, 62, 9, 3, 3, 'brass', { z: 15 }), cap(81, 19, 83, 12, 2.8, 2.8, 'brass', { z: 15 }),
    // basil leaf eyebrows, angled down in a scowl
    poly([[36, 37], [44, 33], [54, 38], [58, 44], [49, 41], [38, 42]], 'basil', { z: 46, bev: 1.4 }), poly([[88, 37], [80, 33], [70, 38], [66, 44], [75, 41], [86, 42]], 'basil', { z: 46, bev: 1.4 }),
    // the logs and the fire pit in front of the pizza's foot
    cap(10, 104, 84, 99, 5.4, 5.4, 'log', { z: 90 }), cap(116, 104, 44, 98, 5.4, 5.4, 'log', { z: 64 }), cap(22, 110, 106, 109, 3.6, 3.6, 'log', { z: 62 }),
    ...[[30, 96, 12, 3.6, -1], [48, 97, 10, 3.2, 1], [76, 96, 14, 3.8, -1], [92, 97, 11, 3.4, 1], [62, 98, 9, 3, 0]].map(([x, y, h, w, l]) => Object.assign(flame(x, y, h, w, l), { z: 70 })),
    ...[[16, 106], [36, 108], [58, 103], [78, 106], [100, 108], [112, 104]].map(([x, y]) => ell(x, y, 3, 2.2, 'ember', { z: 80, d: 0.5 })),
    // the right arm and the peel it holds like a spear: a long wooden handle and a scorched paddle head
    cap(98, 62, 110, 66, 6, 5.4, 'dough', { z: 50 }),
    cap(112, 28, 112, 112, 2.3, 2.3, 'wood', { z: 54 }), ell(112, 14, 12, 15, 'wood', { z: 26, d: 0.3 }), cap(112, 26, 112, 30, 4.2, 4.2, 'iron', { z: 55 }), ell(111, 66, 5.8, 5.6, 'dough', { z: 56 }),
    // steam puffs
    ell(6, 30, 5, 4.4, 'steam', { z: 90 }), ell(3, 18, 3.6, 3.2, 'steam', { z: 90 }), ell(14, 10, 4, 3.4, 'steam', { z: 90 }), ell(100, 10, 4, 3.4, 'steam', { z: 90 }), ell(95, 3, 3, 2.6, 'steam', { z: 90 }), ell(124, 36, 3.4, 3, 'steam', { z: 90 }),
  ], post(a) {
    const ch = (i) => a.ramp('cheese', i), pp = (i) => a.ramp('pep', i), cr = (i) => a.ramp('crust', i), bs = (i) => a.ramp('basil', i);
    // crust: blistered, charred spots
    for (let y = 14; y < 98; y++) for (let x = 20; x < 105; x++) if (a.mat(x, y) === 'crust' && hash(x, y, 21) < 0.06) a.px(x, y, hash(x, y, 22) < 0.5 ? '#6a3a14' : cr(0));
    // pepperoni: bolted on like plate armour, with fat flecks and a lit rim
    for (const [cx, cy, r] of [[27, 34, 9.5], [97, 34, 9.5], [38, 77, 8.5], [86, 77, 8.5], [62, 90, 7.5], [18, 56, 6.4], [106, 56, 6.4]]) {
      for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { if (a.mat(x, y) !== 'pep') continue; const d = Math.hypot(x - cx, y - cy); if (d > r - 1.4 && d < r - 0.4 && x < cx + 2) a.px(x, y, pp(5)); else if (d < r - 2 && hash(x, y, 31) < 0.12) a.px(x, y, '#f0907a'); else if (d < r - 2 && hash(x, y, 33) < 0.1) a.px(x, y, pp(0)); }
      for (const [dx, dy] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) { const rx = Math.round(cx + dx * r), ry = Math.round(cy + dy * r); a.px(rx, ry, '#c8c8d8'); a.px(rx + 1, ry + 1, '#3a3a48'); }
    }
    // the face: scowling amber eyes in dark sockets, a molten grin with garlic-clove teeth, glowing cracks in the cheese
    for (const [ex, ey] of [[45, 47], [77, 47]]) {
      for (let y = ey - 5; y <= ey + 5; y++) for (let x = ex - 7; x <= ex + 7; x++) { if (((x - ex) / 7.4) ** 2 + ((y - ey) / 5.2) ** 2 <= 1) a.px(x, y, y < ey - 3 ? '#1a0604' : '#2e0e06'); }
      for (let y = ey - 3; y <= ey + 3; y++) for (let x = ex - 3; x <= ex + 5; x++) { const d = Math.hypot(x - (ex + 1.5), (y - ey) * 1.2); if (d < 3.6) a.px(x, y, d < 1.5 ? '#fff4a0' : d < 2.6 ? P.eye : '#e07a10'); }
      a.rect(ex + 2, ey - 1, 2, 3, '#1a0604'); a.px(ex, ey - 2, '#ffffff');
    }
    for (const [x0, y0, x1, y1] of [[36, 37, 54, 39], [88, 37, 70, 39]]) a.line(x0, y0, x1, y1, bs(1)); // basil veins
    for (const [x0, y0, x1, y1] of [[40, 38, 44, 40], [46, 36, 49, 39], [84, 38, 80, 40], [78, 36, 75, 39]]) a.line(x0, y0, x1, y1, bs(5));
    a.line(61, 49, 59, 58, ch(2)); a.line(62, 49, 60, 58, ch(2)); a.line(58, 58, 63, 59, ch(1)); a.px(60, 60, ch(1)); // a lump of nose
    for (let x = 41; x <= 83; x++) { // the mouth: a wide lopsided grin, lava glowing in the throat
      const t = (x - 41) / 42, top = 66 + Math.round(Math.sin(t * Math.PI) * 1.5 - (t > 0.8 ? (t - 0.8) * 22 : 0)), bot = top + 2 + Math.round(Math.sin(t * Math.PI) * 9);
      for (let y = top; y <= bot; y++) { const k = (y - top) / Math.max(1, bot - top); a.px(x, y, k < 0.25 ? '#1e0604' : k < 0.55 ? '#7a1a08' : k < 0.8 ? '#d8480c' : '#ff9a1a'); }
      if (x % 5 === 2 && x > 44 && x < 80) { a.px(x, top + 1, '#fff6e0'); a.px(x + 1, top + 1, '#fff6e0'); a.px(x, top + 2, '#e8d8b8'); } // teeth
    }
    for (const [x, y, l] of [[48, 76, 9], [58, 79, 12], [69, 78, 7], [78, 74, 5]]) { a.line(x, y, x, y + l, ch(5)); a.px(x + 1, y + 1, ch(2)); a.rect(x - 1, y + l, 3, 2, ch(4)); a.px(x, y + l + 2, ch(3)); } // dripping cheese strings
    for (const [x0, y0, x1, y1] of [[42, 64, 36, 62], [82, 64, 88, 61], [70, 28, 78, 24], [50, 28, 44, 30], [32, 52, 28, 48], [92, 50, 96, 46], [56, 74, 52, 84], [72, 74, 78, 82]]) { a.line(x0, y0, x1, y1, '#ff9a1a'); a.px(x0, y0, '#ffe060'); } // glowing lava cracks
    for (const [x, y] of [[54, 30], [67, 28], [85, 46], [40, 44], [72, 86], [50, 86], [94, 62], [30, 64]]) { a.px(x, y, '#fff6a0'); a.px(x + 1, y, '#ffd040'); } // oil sizzle
    // olive rings on the cheese
    for (const [ox, oy] of [[62, 28], [90, 58], [33, 62]]) for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) { const d = Math.hypot(x, y * 1.1); if (d < 2.6 && d > 1.2 && a.mat(ox + x, oy + y) === 'cheese') a.px(ox + x, oy + y, d > 2 ? '#14120e' : '#3a3a30'); }
    for (let y = 1; y < 114; y++) for (let x = 108; x <= 117; x++) if (a.mat(x, y) === 'wood' && y < 29 && hash(x, y, 41) < 0.14) a.px(x, y, a.ramp('wood', 0)); // paddle grain
    for (let y = 4; y < 26; y++) for (let x = 102; x <= 122; x++) if (a.mat(x, y) === 'wood') { const d = Math.hypot((x - 112) / 11.5, (y - 14) / 14); if (d > 0.5 && d < 0.72) a.px(x, y, a.ramp('wood', 1)); } // scorch ring
    for (const [x, y] of [[6, 30], [14, 10], [100, 10]]) a.px(x, y, '#ffffff');
  } };
} };
// ---------- Cinder Isle: volcano-holiday-pizza recolours (see src/embers.js) ----------
Object.assign(ENEMY_VARIANTS, {
  cinder_imp: ['imp', { skin: '#35282e', wing: '#8a2a10', horn: '#ffb040', eye: '#ffe860', fire: '#ff7a1a' }],
  pepperoni_salamander: ['salamander', { skin: '#a82a20', belly: '#ffd870', fire: '#ff9a2a', eye: '#ffffff' }, { pep: true }],
  garlic_knot: ['shroom', { cap: '#e0a850', spot: '#fff6d8', gill: '#b07a30', stem: '#f0d890', eye: '#2a1810' }, { knot: true }],
  anchovy_eel: ['cobra', { scale: '#7a8ea4', belly: '#d8e4ee', hood: '#2c4a68', mark: '#e8f4ff', eye: '#ffe040', tongue: '#ff6a60' }],
  magma_slime: ['slime', { goo: '#ffb02a', mouth: '#5a2008', foam: '#fff0b0' }, { foam: true }],
  basalt_golem: ['golem', { rock: '#3a3844', dark: '#1e1c26', glow: '#ff7a20', moss: '#ffb030' }],
  fire_eater: ['bandit', { skin: '#d89868', hood: '#c8301c', vest: '#2a2a3a', cloth: '#f0a020', pants: '#3a2a2a', boots: '#2a1a1a', steel: '#8a6a3a', eye: '#ffffff' }, { torch: true }],
  stag_wraith: ['wraith', { cloak: '#6a7a60', inner: '#0e140c', hand: '#d8e4c8', eye: '#b8ff70' }, { antlers: true }],
});
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
export const BACKDROPS = ['world', 'desert', 'forest', 'snow', 'swamp', 'dungeon', 'crypt', 'spire', 'storm', 'ruins', 'boss', 'crypt:boss', 'spire:boss', 'storm:boss', 'ruins:boss', 'cellar', 'cellar:boss', 'brewery', 'brewery:boss', 'embers', 'pizzaoven', 'pizzaoven:boss'];
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

// ---------- tavern cellar props (Bearded Bros) ----------
const WOODC = ['#1a0e08', '#2e1a0e', '#4a2c16', '#6a4022', '#8a5630', '#a86e40', '#c48a56'], IRONC = ['#14121a', '#2a2834', '#4a4858', '#7a7888', '#a8a8b8'];
function barrelUp(P, cx, by, w, h, seed = 1) { // upright barrel: bulging staves, two iron hoops, lit lid
  const C = RG(WOODC), I = RG(IRONC), top = by - h;
  for (let y = Math.floor(top); y <= by; y++) { const t = (y - top) / h, half = (w / 2) * (0.86 + 0.14 * Math.sin(Math.PI * t));
    for (let x = Math.floor(cx - half); x <= cx + half; x++) { const u = (x + 0.5 - cx) / half, stave = Math.floor((u + 1) * 4.5 + 0.5) !== Math.floor((u + 1) * 4.5 + 0.5 + 0.12);
      let v = clamp(0.62 - u * 0.42 - Math.abs(u) ** 3 * 0.25 + (hash(x, y, seed) - 0.5) * 0.12 - (t > 0.92 ? 0.25 : 0), 0, 1);
      if (Math.abs(t - 0.18) < 0.05 || Math.abs(t - 0.8) < 0.05) P.set(x, y, P.pick(I, clamp(v + 0.1, 0, 1), x, y)); else P.set(x, y, P.pick(C, stave ? v - 0.25 : v, x, y)); } }
  for (let y = Math.floor(top - w * 0.18); y <= top + w * 0.18; y++) for (let x = Math.floor(cx - w / 2); x <= cx + w / 2; x++) { const q = ((x + 0.5 - cx) / (w * 0.43)) ** 2 + ((y + 0.5 - top) / (w * 0.17)) ** 2; if (q > 1) continue; P.set(x, y, P.pick(C, q > 0.7 ? 0.2 : 0.72 - ((x - cx) & 3 ? 0 : 0.12), x, y)); }
}
function barrelEnd(P, cx, cy, r, seed = 1) { // a cask on its side, end-on: growth rings, iron rim, bung and a little brass tap
  const C = RG(WOODC), I = RG(IRONC);
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r; if (d > 1) continue;
    if (d > 0.84) { P.set(x, y, P.pick(I, clamp(0.55 - (x - cx + y - cy) / (r * 3), 0, 1), x, y)); continue; }
    const ring = (d * 7 + hash(seed, 1) * 3) % 1 < 0.18 ? -0.18 : 0, plank = Math.abs(((x - cx) / r * 3.5 + 10) % 1) < 0.08 ? -0.22 : 0;
    P.set(x, y, P.pick(C, clamp(0.6 - (x - cx + y - cy) / (r * 4) + ring + plank, 0, 1), x, y)); }
  P.set(cx, cy, hex2rgb('#140a06')); P.set(cx + 1, cy, hex2rgb('#2a1a0e'));
  if (r > 5) { const G = RG(['#4a2e06', '#a07018', '#e8c050', '#fff0a0']); for (let k = 0; k < 3; k++) P.set(cx - 1 + k, cy + r * 0.55, G[k === 0 ? 3 : 2]); P.set(cx, cy + r * 0.55 + 1, G[1]); P.set(cx, cy + r * 0.55 + 2, G[0]); }
}
function cobweb(P, x0, y0, sd, r) { for (let a = 0; a <= 5; a++) { const t = (a / 5) * Math.PI / 2; for (let k = 0; k < r; k++) if (bayer(k, a) < 0.8) P.blend(x0 + sd * Math.round(Math.cos(t) * k), y0 + Math.round(Math.sin(t) * k), [220, 216, 200], 0.4); }
  for (const rr of [r * 0.35, r * 0.6, r * 0.85]) for (let k = 0; k <= rr * 1.6; k++) { const t = (k / (rr * 1.6)) * Math.PI / 2; P.blend(x0 + sd * Math.round(Math.cos(t) * rr), y0 + Math.round(Math.sin(t) * rr), [230, 226, 210], 0.35); } }

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
  desert(P, hy, L) { // Sunscar Sands: bleached sky, sandstone mesas, rolling dunes, bones and rocks
    sky(P, 0, hy, ['#3a6ac0', '#5a8ad0', '#86acdc', '#b8cce0', '#e0d8c4', '#f4e4c0']);
    cloud(P, 196, 18, 46, 9, ['#c8c0b0', '#e4dccc', '#fbf6ec'], 6);
    ridge(P, hy - 4, 34, 0.009, 29, ['#7a3a20', '#9a5028', '#b86a34', '#d08a48', '#e4aa66'], {});
    ridge(P, hy + 1, 14, 0.022, 33, ['#a05a2c', '#c07838', '#d8964c', '#ecb468'], {});
    ground(P, hy + 1, ['#a8743c', '#c08c48', '#d4a45a', '#e4bc70', '#f0d088', '#f8e2a8'], (X, Z) => { const dune = Math.sin(X * 0.35 + Z * 0.9 + fbm(X * 0.2, Z * 0.3, 7, 2) * 5) * 0.5 + 0.5; return 0.2 + dune * 0.45 + fbm(X * 1.4, Z * 1.8, 8, 3) * 0.3; }, { haze: '#f0d8a8', hazeMax: 0.45 });
    scatter(P, hy + 1, 150, 91, (x, y, s, k) => { if (k < 0.12) rock(P, x, y, s, ['#5a3a24', '#7a5634', '#a07a4c', '#c8a06c'], x); else if (k < 0.18) { P.set(x, y, hex2rgb('#f4ecd8')); P.set(x + 1, y, hex2rgb('#f4ecd8')); P.set(x + 2, y - 1, hex2rgb('#d8ccb0')); } });
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
  ruins(P, hy, L, boss) { // Sunscar Ruins: sandstone hall, carved columns, a glyph frieze; the boss hall has a blazing sun disc
    const SS = ['#2a170c', '#4a2c14', '#6e4422', '#946032', '#b47e46', '#cf9c5c', '#e8bc7c'], C = RG(SS);
    bricks(P, 0, 0, P.w, hy + 10, SS.slice(0, 6), 121, 18, 9);
    for (let y = 18; y < 32; y++) for (let x = 0; x < P.w; x++) { const g = Math.floor(x / 6), lx = x % 6, ly = y - 20, on = ly >= 0 && ly < 9 && lx > 0 && lx < 5 && hash(g * 7 + lx, ly, boss ? 5 : 3) < 0.42; P.set(x, y, P.pick(C, y === 18 || y === 31 ? 0.75 : on ? 0.12 : 0.5 + (fbm(x / 4, y / 4, 9) - 0.5) * 0.2, x, y)); if (on && hash(g, 1, 4) < 0.3) P.set(x, y, hex2rgb(hash(g, 2, 4) < 0.5 ? '#3a5cc0' : '#e0b030')); }
    if (boss) { glow(P, 128, 44, 60, '#ffd060', 0.7); const D = RG(['#a05a10', '#d08a20', '#f0b830', '#ffe070', '#fff6c0']);
      for (let y = 4; y < 88; y++) for (let x = 60; x < 196; x++) { const dx = x + 0.5 - 128, dy = y + 0.5 - 44, r = Math.hypot(dx, dy), a = ((Math.atan2(dy, dx) / (Math.PI * 2)) * 20 + 20) % 1;
        if (r < 24) P.set(x, y, P.pick(D, clamp(0.95 - r / 40 - (dx + dy) / 120, 0, 1), x, y)); else if (r < 26) P.set(x, y, D[0]); else if (r < 44 && a < 0.28 && bayer(x, y) < 1.2 - r / 44) P.blend(x, y, [255, 214, 110], 0.55); } }
    for (const cx of boss ? [28, 228] : [26, 96, 160, 230]) { const top = 4, wd = 10;
      for (let y = top; y < hy + 12; y++) for (let x = cx - wd - 3; x <= cx + wd + 3; x++) { const u = (x - cx) / wd, capt = y < top + 6, base = y > hy + 6; if (!capt && !base && Math.abs(u) > 1) continue;
        const flute = !capt && !base && Math.floor((x - cx + wd) / 3) % 2 ? -0.1 : 0; P.set(x, y, P.pick(C, clamp((capt || base ? 0.8 : 0.72) - (u + 1) * 0.28 + flute + (capt && y === top ? 0.15 : 0), 0, 1), x, y)); }
      glow(P, cx, hy + 14, 18, '#1a0c04', 0.25); }
    torch(P, boss ? 70 : 62, 40, '#ffb23a', L); torch(P, boss ? 186 : 194, 40, '#ffb23a', L);
    ground(P, hy + 10, ['#6a4422', '#8a5e30', '#a87a42', '#c49656', '#dcb070', '#f0cc8c'], (X, Z, x, y) => { const fx = ((X * 0.3) % 1 + 1) % 1, fz = ((Z * 0.42) % 1 + 1) % 1, sand = fbm(X * 0.4, Z * 0.5, 12, 3); const slab = sand < 0.52 ? (fx < 0.05 || fz < 0.07 ? -0.32 : 0) : 0; return 0.42 + slab + (fbm(X * 1.3, Z * 1.7, 11, 3) - 0.5) * 0.35 + (sand > 0.52 ? 0.12 + Math.sin(X * 2 + Z * 3) * 0.06 : 0); }, { haze: '#c89a5a', hazeMax: 0.4 });
    scatter(P, hy + 10, 50, 85, (x, y, s, k) => { if (k < 0.5) rock(P, x, y, s, ['#3a2410', '#7a5030', '#b08050', '#dcb47a'], x); else if (k < 0.6 && s > 0.35) { const C2 = RG(['#4a2c14', '#946032', '#cf9c5c']); for (let j = 0; j < Math.round(5 * s + 2); j++) for (let i = -2; i <= 2; i++) P.set(x + i, y - j, C2[i < 0 ? 2 : i > 0 ? 0 : 1]); } });
    shadowBand(P, hy + 10, hy + 22, 0.3); vignette(P, 0.38);
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

BD_FNS.cellar = function (P, hy, L, boss) { // the Bell & Anvil's cellar: brick vaults, stacked casks, a wine rack, warm lantern light
  const BR = ['#1c0e0c', '#2e1812', '#44241a', '#5a3222', '#70402c', '#86503a', '#9a6248'];
  bricks(P, 0, 0, P.w, hy + 12, BR, 131, 12, 5);
  const A = RG(['#0a0506', '#140a08', '#20120e', '#2c1a14']), S = RG(['#2a1610', '#5a3424', '#8a5a40', '#b07a58']);
  const vaults = boss ? [[128, 44]] : [[42, 30], [128, 32], [214, 30]];
  for (const [ax, aw] of vaults) { const top = boss ? 6 : 14;
    for (let y = top; y < hy + 12; y++) for (let x = ax - aw; x <= ax + aw; x++) { const ry = y - (top + aw); if (ry < 0 && Math.hypot((x - ax) / aw, ry / aw) > 1) continue; P.set(x, y, P.pick(A, clamp(0.15 + (y - top) / (hy + 12 - top) * 0.7 + (bayer(x, y) - 0.5) * 0.12, 0, 1), x, y)); }
    for (let k = 0; k <= 180; k++) { const t = Math.PI * (k / 180), ex = ax - Math.cos(t) * (aw + 2), ey = top + aw - Math.sin(t) * (aw + 2); for (let j = 0; j < 3; j++) P.set(ex - Math.cos(t) * j, ey - Math.sin(t) * j, S[j === 0 ? 3 : j === 1 ? 2 : 0]); } // arch voussoirs
    for (let y = top + aw; y < hy + 12; y++) for (const dx of [-aw - 4, aw + 2]) for (let k = 0; k < 3; k++) P.set(ax + dx + k, y, S[k === 0 ? 2 : k === 1 ? 3 : 1]);
  }
  if (!boss) {
    // left vault: casks stacked end-on in a pyramid
    for (const [cx, cy, r] of [[30, hy + 2, 9], [50, hy + 2, 9], [40, hy - 14, 9], [22, hy - 14, 6], [58, hy - 14, 6], [40, hy - 28, 6]]) barrelEnd(P, cx, cy, r, cx + cy);
    // middle vault: a wine rack (diamond lattice full of bottle ends)
    const R2 = RG(WOODC), GL = RG(['#0a1a10', '#16321e', '#2a5a34', '#5a9a5a']), RD = RG(['#1a060a', '#3a0c14', '#6a1a24', '#a04050']);
    for (let y = 26; y < hy + 8; y++) for (let x = 104; x < 152; x++) { const u = (x - 104 + y) % 10, v = (x - 104 - y + 200) % 10;
      if (u < 1 || v < 1) P.set(x, y, P.pick(R2, 0.55 - (x - 104) / 120, x, y));
      else if (u > 3 && u < 7 && v > 3 && v < 7) { const red = hash(Math.floor((x - 104 + y) / 10), Math.floor((x - 104 - y + 200) / 10), 5) < 0.45; P.set(x, y, (red ? RD : GL)[u === 4 && v === 4 ? 3 : u + v > 11 ? 0 : 2]); } }
    for (let x = 102; x < 154; x++) { P.set(x, 25, R2[5]); P.set(x, hy + 8, R2[1]); }
    // right vault: an upright keg row with copper taps, sacks of hops
    for (const [cx, w, h] of [[200, 16, 26], [222, 16, 30]]) barrelUp(P, cx, hy + 10, w, h, cx);
    for (const cx of [200, 222]) { const G = RG(['#4a2408', '#9a5a1c', '#e09040', '#ffd090']); for (let k = 0; k < 4; k++) P.set(cx + k - 1, hy - 4, G[2]); P.set(cx + 2, hy - 3, G[1]); P.set(cx + 2, hy - 2, G[3]); }
  } else { // boss vault: the great vat, burst and frothing
    for (let y = 18; y < hy + 12; y++) for (let x = 92; x <= 164; x++) { const u = (x - 128) / 36; if (Math.abs(u) > 1) continue; const C = RG(WOODC), I = RG(IRONC), hoop = (y - 18) % 14 < 2;
      P.set(x, y, P.pick(hoop ? I : C, clamp(0.6 - u * 0.4 - u * u * 0.2 + ((x - 92) % 6 === 0 && !hoop ? -0.25 : 0), 0, 1), x, y)); }
    const F = RG(['#c8b898', '#e8dcc0', '#f8f0dc', '#ffffff']); for (let i = 0; i < 40; i++) { const bx = 96 + hash(i, 1, 9) * 64, by = 14 + hash(i, 2, 9) * 8, br = 2 + hash(i, 3, 9) * 4; for (let y = Math.floor(by - br); y <= by + br; y++) for (let x = Math.floor(bx - br); x <= bx + br; x++) if (Math.hypot(x - bx, y - by) < br) P.set(x, y, P.pick(F, clamp(0.85 - (y - by + br) / (br * 3) - (x - bx) / (br * 6), 0, 1), x, y)); }
    const AM = RG(['#6a3a08', '#a8600e', '#d88a1c', '#f0b440']); for (let y = 24; y < hy + 12; y++) for (const sx of [104, 140, 150]) { const w = 1.5 + Math.sin(y * 0.3 + sx) * 0.6; for (let x = Math.floor(sx - w); x <= sx + w; x++) P.set(x, y, AM[x < sx ? 3 : 2]); } // ale running down the staves
    glow(P, 128, 40, 60, '#ffb040', 0.35);
  }
  for (const [lx, ly] of boss ? [[64, 36], [192, 36]] : [[84, 36], [172, 36]]) { torch(P, lx, ly, '#ffb04a', L); glow(P, lx, ly + 6, 34, '#ff9a3a', 0.4); }
  ground(P, hy + 12, ['#1a100c', '#2a1a12', '#3c281a', '#503622', '#664630', '#7c5a40'], (X, Z) => { const fx = ((X * 0.32) % 1 + 1) % 1, fz = ((Z * 0.45) % 1 + 1) % 1, row = Math.floor(Z * 0.45), fx2 = ((X * 0.32 + row * 0.5) % 1 + 1) % 1; const grout = fx2 < 0.05 || fz < 0.07 ? -0.32 : 0; return 0.4 + grout + (fbm(X * 1.3, Z * 1.7, 31, 3) - 0.5) * 0.4 + (hash(Math.floor(X * 0.32 + row * 0.5), row, 3) - 0.5) * 0.2; }, { haze: '#3a2416', hazeMax: 0.45 });
  for (let y = hy + 12; y < P.h; y++) for (let x = 0; x < P.w; x++) { const d = Math.hypot((x - 128) / 150, (y - hy - 12) / 70); if (bayer(x, y) < (1 - d) * 0.22) P.blend(x, y, [255, 170, 80], 0.18); } // warm light pooling on the flags
  for (const [cx, cy, rw, rh] of boss ? [[128, 128, 70, 12], [60, 160, 30, 6]] : [[150, 140, 26, 5]]) pool(P, cx, cy, rw, rh, ['#3a1e06', '#7a4410', '#b8701c', '#f0b040'], '#ffd070'); // spilt ale
  barrelUp(P, 12, hy + 64, 26, 40, 7); barrelUp(P, 246, hy + 58, 24, 36, 9); // foreground kegs framing the shot
  scatter(P, hy + 12, 30, 87, (x, y, s, k) => { if (k < 0.4) rock(P, x, y, s * 0.7, ['#1a100c', '#3a281c', '#5a4430', '#7a6048'], x); else if (k < 0.55 && s > 0.3) { const G = RG(['#0a1a10', '#2a5a34', '#7ab07a']); for (let j = 0; j < 3; j++) P.set(x + j, y, G[j === 0 ? 2 : 1]); P.set(x + 3, y, G[0]); } }); // pebbles, a dropped bottle
  cobweb(P, 0, 0, 1, 22); cobweb(P, P.w - 1, 0, -1, 18);
  shadowBand(P, hy + 12, hy + 24, 0.3); vignette(P, 0.42);
};
BD_FNS.brewery = function (P, hy, L, boss) { // the Great Brewery: copper vats, oak casks, pipes, hop garlands, wet flagstones, lantern light
  const BR = ['#160c0a', '#281612', '#3c2218', '#52301f', '#6a402a', '#7e5034'];
  bricks(P, 0, 0, P.w, hy + 12, BR, 171, 14, 6);
  const T = RG(WOODC), CU = RG(['#240a06', '#52200e', '#82351a', '#b0521e', '#d87a2c', '#f2a64e', '#ffd890']), I = RG(IRONC);
  // oak casks racked along the back wall, between the vats
  const rack = (x0, x1, y) => { for (let x = x0; x < x1; x++) { P.set(x, y, T[5]); P.set(x, y + 1, T[2]); P.set(x, y + 2, T[0]); } };
  for (const [x0, cnt, y] of [[150, 3, hy - 6], [6, 2, hy - 10]]) { for (let k = 0; k < cnt; k++) barrelEnd(P, x0 + 10 + k * 20, y - 7, 9, x0 + k); rack(x0, x0 + 20 * cnt + 2, y + 3); }
  // the great copper vats, domed, banded and riveted
  const vat = (cx, top, bot, hw, seed) => {
    const dome = Math.round(hw * 0.5);
    for (let y = top; y <= bot; y++) {
      const dy = top + dome - y, half = dy > 0 ? hw * Math.sqrt(Math.max(0, 1 - (dy / dome) ** 2)) : hw;
      for (let x = Math.floor(cx - half); x <= cx + half; x++) {
        const u = (x + 0.5 - cx) / hw, band = (y - top - dome) % 22 < 3 && y > top + dome;
        const v = 0.58 - u * 0.5 - Math.abs(u) ** 3 * 0.3 + (hash(x >> 1, y, seed) - 0.5) * 0.08 - (y > bot - 3 ? 0.25 : 0) - (dy > 0 ? (dy / dome) * 0.18 * (u > 0 ? 1 : -0.4) : 0);
        P.set(x, y, P.pick(CU, clamp(band ? v - 0.28 : v, 0, 1), x, y));
      }
    }
    for (let y = top + dome; y < bot; y += 22) for (let x = Math.ceil(cx - hw + 3); x < cx + hw - 2; x += 6) { P.set(x, y + 1, CU[6]); P.set(x + 1, y + 2, CU[0]); } // rivets on the bands
    P.set(cx - 4, top + 2, CU[6]); P.set(cx - 3, top + 3, CU[6]); // dome glint
    const gx = Math.round(cx + hw * 0.3), gy0 = top + dome + 10, gy1 = bot - 14, AM = RG(['#6a3a08', '#d88a1c', '#ffd25a']), DK = RG(['#0a1a22', '#16303c']); // a sight glass with the brew in it
    for (let y = gy0; y <= gy1; y++) for (let k = -1; k <= 3; k++) P.set(gx + k, y, k === -1 || k === 3 ? I[1] : y > gy0 + (gy1 - gy0) * 0.35 ? AM[k === 0 ? 2 : k === 1 ? 1 : 0] : DK[k === 0 ? 1 : 0]);
    for (let k = 0; k < 4; k++) P.set(gx + k - 1, gy0 - 1, I[3]);
    for (const dx of [-hw + 4, hw - 5]) for (let y = bot; y < bot + 6; y++) for (let k = 0; k < 3; k++) P.set(cx + dx + k, y, T[k === 0 ? 4 : k === 1 ? 3 : 1]); // stubby legs
  };
  vat(34, 22, hy + 8, 24, 1); vat(128, 8, hy + 6, 32, 2); vat(216, 18, hy + 8, 27, 3);
  // pipework: horizontal copper runs with flanges, and vertical drops
  const pipeH = (x0, x1, y, h) => { for (let x = x0; x <= x1; x++) for (let j = 0; j < h; j++) P.set(x, y + j, P.pick(CU, clamp(0.9 - j / (h - 1) * 0.85 - (hash(x >> 2, y, 4) - 0.5) * 0.05, 0, 1), x, y + j)); for (let x = x0 + 10; x < x1; x += 34) for (let j = -1; j <= h; j++) { P.set(x, y + j, I[j < 1 ? 3 : 1]); P.set(x + 1, y + j, I[j < 1 ? 4 : 2]); } };
  pipeH(56, 98, 38, 5); pipeH(160, 190, 46, 5);
  for (let y = 38; y < hy + 6; y++) for (let k = 0; k < 4; k++) P.set(99 + k, y, P.pick(CU, 0.85 - k * 0.22, 99 + k, y));
  for (let y = 46; y < hy + 6; y++) for (let k = 0; k < 4; k++) P.set(157 + k, y, P.pick(CU, 0.85 - k * 0.22, 157 + k, y));
  // timber beams overhead and hop garlands swagged between the posts
  for (let y = 0; y < 7; y++) for (let x = 0; x < P.w; x++) P.set(x, y, P.pick(T, clamp(0.78 - y * 0.12 + (hash(x >> 2, y, 6) - 0.5) * 0.12, 0, 1), x, y));
  for (let x = 0; x < P.w; x++) P.set(x, 7, T[0]);
  for (const px of [0, 84, 170, 250]) for (let y = 0; y < hy + 12; y++) for (let k = 0; k < 6; k++) P.set(px + k, y, P.pick(T, clamp(0.62 - k * 0.1 + (hash(px, y >> 2, 8) - 0.5) * 0.12 - (k === 5 ? 0.2 : 0), 0, 1), px + k, y));
  const GR = RG(['#0c2410', '#1c5a1c', '#3a8c2a', '#7cc03c', '#c0e26a']);
  for (const [x0, x1] of [[6, 84], [90, 170], [176, 250]]) for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / (x1 - x0), y = 8 + Math.round(Math.sin(t * Math.PI) * 12); P.set(x, y, T[2]);
    if ((x - x0) % 4 === 0) { const h2 = 2 + Math.floor(hash(x, 3, 2) * 3); for (let j = 0; j < h2 + 2; j++) for (let k = -1; k <= 1; k++) if (Math.abs(k) + (j === 0 || j === h2 + 1 ? 1 : 0) < 2) P.set(x + k, y + 1 + j, GR[(x + j) % 4 === 0 ? 4 : (x + j) % 3 === 0 ? 3 : j === 0 ? 1 : 2]); }
  }
  for (const [lx, ly] of [[94, 34], [176, 36]]) { torch(P, lx, ly, '#ffb04a', L); glow(P, lx, ly + 6, 40, '#ff9a3a', 0.42); }
  glow(P, 128, 30, 70, '#ffb040', 0.18);
  ground(P, hy + 12, ['#120e12', '#201a1e', '#322a2c', '#483c3a', '#625048', '#7e6858'], (X, Z) => { const row = Math.floor(Z * 0.5), fx = (((X * 0.3 + row * 0.5) % 1) + 1) % 1, fz = (((Z * 0.5) % 1) + 1) % 1, grout = fx < 0.05 || fz < 0.08 ? -0.34 : 0; return 0.42 + grout + (fbm(X * 1.2, Z * 1.6, 41, 3) - 0.5) * 0.42 + (hash(Math.floor(X * 0.3 + row * 0.5), row, 5) - 0.5) * 0.22; }, { haze: '#3a2a22', hazeMax: 0.4 });
  for (let y = hy + 12; y < P.h; y++) for (let x = 0; x < P.w; x++) { const d = Math.hypot((x - 128) / 150, (y - hy - 12) / 70); if (bayer(x, y) < (1 - d) * 0.22) P.blend(x, y, [255, 170, 80], 0.18); } // lantern light pooling on the wet flags
  for (const [cx, cy, rw, rh] of boss ? [[150, 128, 44, 8], [54, 152, 34, 6], [212, 162, 30, 6], [110, 168, 24, 4]] : [[150, 140, 30, 6]]) pool(P, cx, cy, rw, rh, ['#1a1218', '#2c222a', '#54424a', '#a08068'], '#ffc878'); // puddles reflecting the lanterns
  pool(P, 188, 150, 18, 4, ['#3a1e06', '#7a4410', '#b8701c', '#f0b040'], '#ffd070'); // spilt ale
  barrelUp(P, 10, hy + 66, 26, 40, 11); barrelUp(P, 247, hy + 58, 24, 36, 13); // foreground kegs framing the shot
  scatter(P, hy + 12, 24, 91, (x, y, s, k) => { if (k < 0.5) rock(P, x, y, s * 0.6, ['#1a1214', '#3a2c2a', '#5a4840', '#7a6254'], x); else if (s > 0.3) { const G2 = RG(['#1c5a1c', '#3a8c2a', '#7cc03c']); P.set(x, y, G2[1]); P.set(x + 1, y, G2[2]); P.set(x, y - 1, G2[0]); } }); // pebbles and fallen hops
  shadowBand(P, hy + 12, hy + 24, 0.3); vignette(P, 0.42);
};
// ---------- Cinder Isle backdrops ----------
// 'embers': the island's random-battle scenery. A smouldering sunset behind a great black volcano, basalt flats cracked with lava, charred trees.
BD_FNS.embers = function (P, hy, L) {
  sky(P, 0, hy, ['#1a0c1c', '#34142a', '#5a1c30', '#8c2c34', '#c4502c', '#f08a38', '#ffc868'], 14);
  cloud(P, 50, 26, 54, 12, ['#2a1626', '#4a2230', '#7a3a38', '#c0663c'], 5); cloud(P, 196, 18, 60, 11, ['#2a1626', '#4a2230', '#7a3a38', '#c0663c'], 9); cloud(P, 130, 44, 40, 8, ['#4a2230', '#7a3a38', '#d0804a'], 12);
  ridge(P, hy - 2, 24, 0.012, 61, ['#1c1420', '#2a1c2c', '#3c283a', '#563448'], {}); // far basalt hills
  // the volcano: a big cone with a glowing crater, lava rivers down its flank and a dark plume of smoke
  const VX = 150, VT = 14, VB = hy + 4, CR = RG(['#0e0a12', '#1a1220', '#281c2c', '#3a2838', '#52384a']), LV = RG(['#6a1008', '#b02a0a', '#e85a10', '#ff9a2a', '#ffd25a']);
  for (let y = VT; y < VB; y++) { const k = (y - VT) / (VB - VT), half = 8 + Math.pow(k, 0.8) * 86 + (hash(y, 1, 71) - 0.5) * 2;
    for (let x = Math.floor(VX - half); x <= VX + half; x++) { const u = (x - VX) / half, t = clamp(0.5 - u * 0.4 + (fbm(x / 4, y / 5, 72) - 0.5) * 0.5 - k * 0.12, 0, 1); P.set(x, y, P.pick(CR, t, x, y)); } }
  for (let y = VT - 1; y < VT + 5; y++) for (let x = VX - 11; x <= VX + 11; x++) { const q = ((x - VX) / 11) ** 2 + ((y - (VT + 1)) / 3) ** 2; if (q <= 1) P.set(x, y, P.pick(LV, clamp(0.95 - q * 0.5, 0, 1), x, y)); } // crater glow
  for (const [sx, sw] of [[-7, 2.6], [4, 2], [12, 1.6]]) { let x = VX + sx; for (let y = VT + 4; y < hy + 3; y++) { x += Math.sin(y * 0.3 + sx) * 0.35 + sx * 0.012; for (let k = -Math.round(sw); k <= sw; k++) P.set(Math.round(x) + k, y, P.pick(LV, clamp(0.9 - Math.abs(k) / sw * 0.5 - (y - VT) / 90 + (hash(y, k, 73) - 0.5) * 0.3, 0, 1), x + k, y)); } } // lava rivers
  glow(P, VX, VT, 42, '#ff8a2a', 0.45);
  const SM = RG(['#1a1018', '#2c1c26', '#4a303a', '#6a4a50']);
  for (let i = 0; i < 9; i++) { const sx = VX - 4 + i * 5 + Math.sin(i * 1.3) * 5, sy = VT - 4 - i * 4, r = 7 + i * 1.5; for (let y = Math.floor(sy - r); y <= sy + r; y++) for (let x = Math.floor(sx - r); x <= sx + r; x++) { const d = Math.hypot(x - sx, (y - sy) * 1.2) / r; if (d > 1 || y < 0) continue; P.set(x, y, P.pick(SM, clamp(0.7 - d * 0.5 + (fbm(x / 4, y / 4, 74) - 0.5) * 0.4 - i * 0.03, 0, 1), x, y)); } } // smoke plume
  glow(P, VX, 2, 50, '#ff7a2a', 0.18);
  hills(P, hy + 1, 8, 0.05, 75, ['#1a1220', '#281c2c', '#382838']);
  // basalt columns: a Voronoi network of glowing lava cracks (crack width grows with distance so it stays at least a pixel wide)
  const vor = (X, Z) => { const gx = Math.floor(X / 2.1), gz = Math.floor(Z / 2.1); let d1 = 9, d2 = 9; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const cx = gx + i, cz = gz + j, fx = (cx + hash(cx, cz, 85)) * 2.1, fz = (cz + hash(cx, cz, 86)) * 2.1, d = Math.hypot(X - fx, (Z - fz) * 1.15); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; } return d2 - d1; };
  ground(P, hy + 3, ['#0c0a10', '#161219', '#201a26', '#2c2434', '#3a3044', '#ff5a18', '#ffb030'], (X, Z) => {
    const n = fbm(X * 1.1, Z * 1.5, 81, 4), e = vor(X, Z), w = 0.07 + Z * 0.011;
    if (Z < 6.5 && e < w) return e < w * 0.45 ? 0.95 : 0.8;
    return 0.04 + n * 0.42 + (e < w * 2.2 ? 0.07 : 0) + (hash(Math.floor(X * 6), Math.floor(Z * 8), 3) < 0.06 ? 0.05 : 0); }, { haze: '#6a2a30', hazeMax: 0.55 });
  for (let y = hy + 3; y < P.h; y++) for (let x = 0; x < P.w; x++) { const d = Math.hypot((x - VX) / 170, (y - hy - 3) / 52); if (bayer(x, y) < (1 - d) * 0.14) P.blend(x, y, [255, 120, 50], 0.14); } // volcano-light on the flats
  pool(P, 52, 142, 22, 4, ['#4a0e06', '#a02a0a', '#e85a10', '#ffb030'], '#ffe080'); pool(P, 196, 128, 16, 3.4, ['#4a0e06', '#a02a0a', '#e85a10', '#ffb030'], '#ffe080'); // little lava pools
  glow(P, 52, 140, 30, '#ff7a2a', 0.3); glow(P, 196, 127, 24, '#ff7a2a', 0.25);
  const bare = (x, y, s) => { const h = Math.round(9 + 20 * s), B = RG(['#050306', '#120c10', '#241a1c']); for (let j = 0; j < h; j++) { const w = j < 3 ? 1 : 0; for (let k = -w; k <= w; k++) P.set(x + k, y - j, B[k < 0 ? 2 : 0]); }
    for (const [dx, dy, l] of [[-1, 0.45, 0.5], [1, 0.58, 0.45], [-1, 0.75, 0.32], [1, 0.82, 0.28], [0, 1, 0.2]]) { const len = Math.round(h * l), by = y - Math.round(h * dy); for (let k = 1; k <= len; k++) { P.set(x + dx * k, by - Math.round(k * 0.7), B[0]); if (k > 2 && k % 3 === 0) P.set(x + dx * k, by - Math.round(k * 0.7) - 1, B[1]); } } };
  scatter(P, hy + 3, 40, 88, (x, y, s, k) => { if (k < 0.4) bare(x, y, s); else if (k < 0.8) rock(P, x, y, s, ['#0c0810', '#201a26', '#382c44', '#54445c'], x); else { const R2 = RG(['#6a1008', '#e85a10', '#ffd25a']); P.set(x, y, R2[1]); P.set(x + 1, y, R2[2]); P.set(x, y - 1, R2[0]); } }); // charred trees, basalt chunks, embers
  bare(14, hy + 60, 1.5); bare(244, hy + 54, 1.3);
  shadowBand(P, hy + 3, hy + 14, 0.25); vignette(P, 0.4);
};

// 'pizzaoven': the boss arena inside the volcano. A vast fire-brick dome with a great sooty arch, two roaring wood-fire pits,
// glowing embers in the air and a flagstone floor slick with oil.
BD_FNS.pizzaoven = function (P, hy, L, boss, info) {
  const BR = ['#140806', '#241210', '#3a1e16', '#522a1e', '#6c3a28', '#8a4c34', '#a8603e'];
  bricks(P, 0, 0, P.w, hy + 12, BR, 191, 13, 6);
  const top = 6, floor = hy + 12, archY = (x) => top + ((x - 128) / 92) ** 2 * (floor - top);
  const BD = RG(['#080303', '#120706', '#1e0e0a', '#2e1610', '#44221a']), VS = RG(['#3a1c14', '#5a2e20', '#7e4430', '#a8603e', '#c47a4c']), TH = RG(['#ff4a10', '#ff7a1a', '#ffa830', '#ffd860']);
  // the deep arch: a darker, soot-black inner brickwork with a fierce orange glow rising from the pits
  for (let y = 0; y < floor; y++) for (let x = 36; x <= 220; x++) { if (y < archY(x)) continue; const g = clamp((y - 20) / (floor - 20), 0, 1), u = Math.abs(x - 128) / 92;
    const row = Math.floor(y / 5), lx = (x + (row % 2) * 6) % 12, mortar = lx === 0 || y % 5 === 0, n = hash(Math.floor((x + (row % 2) * 6) / 12), row, 17);
    let t = mortar ? 0.04 : clamp(0.14 + n * 0.22 + (fbm(x / 6, y / 6, 19) - 0.5) * 0.2, 0, 1) + g * (1 - u * 0.6) * 0.5 * (mortar ? 0.4 : 1);
    P.set(x, y, P.pick(g * (1 - u * 0.7) > 0.55 && !mortar ? RG(['#1e0a06', '#3e1608', '#7a2a0c', '#c04a14']) : BD, clamp(t, 0, 1), x, y)); }
  // voussoirs: pale radial bricks round the arch, a keystone, soot streaks above
  for (let x = 28; x <= 228; x++) { const y0 = Math.floor(archY(x)); for (let k = -9; k < 0; k++) { const y = y0 + k; if (y < 0 || y >= floor) continue; const ang = Math.atan2(x - 128, 90 + (y - 40)), seam = Math.abs(((ang * 18) % 1 + 1) % 1 - 0.5) > 0.46 || k === -9 || k === -1;
    const t = clamp(0.62 - Math.abs(x - 128) / 260 + (hash(Math.floor(ang * 18), k, 23) - 0.5) * 0.25 + (k > -4 ? 0.12 : 0) + (seam ? -0.4 : 0), 0, 1); P.set(x, y, P.pick(VS, t, x, y)); } }
  for (let y = 0; y < 10; y++) for (let k = -5; k <= 5; k++) { const kx = 128 + k, ky = Math.floor(archY(kx)) - 9 + y * 0.0; if (Math.abs(k) < 4 - y * 0.2) P.set(kx, Math.max(0, Math.floor(archY(128)) - 9 + y), P.pick(VS, clamp(0.8 - Math.abs(k) * 0.08 - (y === 0 ? 0.3 : 0), 0, 1), kx, y)); }
  for (let i = 0; i < 40; i++) { const sx = 6 + hash(i, 5, 29) * 244, sh = 8 + hash(i, 6, 29) * 28; for (let y = 0; y < sh; y++) if (bayer(Math.floor(sx), y) < 0.7 - y / sh * 0.6) P.blend(Math.floor(sx), y, [4, 2, 2], 0.5); } // soot streaks
  // a flue slot at the crown of the dome, breathing smoke
  for (let y = 0; y < 5; y++) for (let x = 112; x < 144; x++) P.set(x, y, P.pick(BD, 0.12 + y * 0.02 + hash(x, y, 3) * 0.04, x, y));
  glow(P, 128, floor - 30, 110, '#ff6a18', 0.3); glow(P, 128, 40, 80, '#ff8a2a', 0.18);
  // the two fire pits: iron baskets on stubby legs, stacked split logs, a sea of embers
  const pit = (cx, by, w) => {
    const I2 = RG(IRONC), W2 = RG(WOODC);
    for (const side of [-1, 1]) for (let y = by - 8; y <= by + 2; y++) for (let k = 0; k < 3; k++) P.set(cx + side * (w / 2 - 1) - 1 + k, y, I2[k === 0 ? 4 : k === 1 ? 3 : 1]); // legs
    for (let x = cx - w / 2; x <= cx + w / 2; x++) for (let k = 0; k < 3; k++) P.set(x, by - 8 + k, I2[k === 0 ? 4 : k === 1 ? 2 : 0]); // rim bar
    for (let k = 0; k < 6; k++) { const lx = cx - w / 2 + 3 + k * (w - 6) / 5, ly = by - 12 - (k % 2) * 3; for (let j = 0; j < 4; j++) for (let i = -5; i <= 5; i++) P.set(Math.round(lx + i + j * 0.0), ly + j + (i > 2 ? 1 : 0), P.pick(W2, clamp(0.5 - j * 0.14 + (i < -2 ? 0.2 : 0), 0, 1), lx + i, j)); } // logs
    for (let x = cx - w / 2 + 2; x <= cx + w / 2 - 2; x++) { const fx = (x - cx) / (w / 2), h = (18 + 20 * Math.max(0, 1 - Math.abs(fx) * 0.9)) * (0.7 + hash(x, 5, 77) * 0.5);
      for (let j = 0; j < h; j++) { const t = j / h, wob = Math.sin(j * 0.5 + x * 0.7) * (1.5 + t * 2.5), xx = Math.round(x + wob * 0.4), core = 1 - t - Math.abs(fx) * 0.35; P.set(xx, by - 12 - j, P.pick(TH, clamp(core * 1.3 + (hash(x, j, 8) - 0.5) * 0.2, 0, 1), xx, j)); } } // roaring flames
    glow(P, cx, by - 18, 50, '#ffb040', 0.5); glow(P, cx, by - 22, 26, '#ffe070', 0.3);
    info.pits.push([cx, by - 14, w]);
    L.push([cx - 8, by - 12, '#ffb04a'], [cx + 8, by - 13, '#ff9a3a']);
  };
  info.pits = [];
  pit(56, hy + 6, 44); pit(200, hy + 4, 40);
  ground(P, floor, ['#0e0806', '#1c100c', '#2e1c14', '#44281c', '#5e3a28', '#7a4c34'], (X, Z) => { const row = Math.floor(Z * 0.5), fx = (((X * 0.3 + row * 0.5) % 1) + 1) % 1, fz = (((Z * 0.5) % 1) + 1) % 1, grout = fx < 0.05 || fz < 0.08 ? -0.34 : 0; return 0.4 + grout + (fbm(X * 1.2, Z * 1.6, 91, 3) - 0.5) * 0.42 + (hash(Math.floor(X * 0.3 + row * 0.5), row, 5) - 0.5) * 0.22; }, { haze: '#4a2414', hazeMax: 0.4 });
  for (let y = floor; y < P.h; y++) for (let x = 0; x < P.w; x++) { const d = Math.hypot((x - 128) / 150, (y - floor) / 70); if (bayer(x, y) < (1 - d) * 0.3) P.blend(x, y, [255, 140, 50], 0.22); } // firelight pooling on the flags
  for (const [cx, cy, rw, rh] of boss ? [[128, 130, 60, 10], [44, 152, 34, 6], [214, 160, 30, 6], [100, 168, 24, 4]] : [[150, 140, 34, 6]]) pool(P, cx, cy, rw, rh, ['#1c0e08', '#3e2010', '#8a4a1c', '#e8903a'], '#ffd070'); // oil sheen reflecting the fire
  const logEnd = (cx, cy, r, sd) => { const W2 = RG(WOODC), BK = RG(['#0e0804', '#2a1810', '#4a3020']); for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r; if (d > 1) continue;
    if (d > 0.82) { P.set(x, y, P.pick(BK, clamp(0.55 - (x - cx + y - cy) / (r * 3) + (hash(x, y, sd) - 0.5) * 0.3, 0, 1), x, y)); continue; }
    const ring = (d * 5 + hash(sd, 1) * 2) % 1 < 0.2 ? -0.2 : 0, crack = Math.abs(y - cy - (x - cx) * 0.2) < 0.6 && x > cx ? -0.3 : 0; P.set(x, y, P.pick(W2, clamp(0.66 - (x - cx + y - cy) / (r * 4) + ring + crack, 0, 1), x, y)); }
    const sc = Math.round(r * 0.25); P.set(cx, cy, W2[1]); P.set(cx + sc, cy + sc, W2[2]); };
  for (const [cx, cy, r] of [[12, hy + 84, 11], [32, hy + 86, 10], [52, hy + 87, 9], [22, hy + 68, 10], [42, hy + 70, 9], [32, hy + 54, 9]]) logEnd(cx, cy, r, cx + cy); // foreground: a pyramid of split logs bottom-left
  for (const [cx, cy, r] of [[236, hy + 86, 11], [216, hy + 88, 10], [226, hy + 70, 10]]) logEnd(cx, cy, r, cx * 3 + cy); // ... and bottom-right
  const peel = RG(WOODC); for (let y = 18; y < hy + 56; y++) { const x0 = Math.round(238 - (y - 18) * 0.1) + 0; for (let k = 0; k < 4; k++) P.set(x0 + k, y, P.pick(peel, clamp(0.7 - k * 0.18 + (hash(k, y >> 2, 6) - 0.5) * 0.1, 0, 1), x0 + k, y)); } // a giant pizza peel leaning on the wall
  for (let y = 0; y < 28; y++) for (let x = 218; x < 256; x++) { const q = ((x - 242) / 19) ** 2 + ((y - 14) / 15) ** 2; if (q > 1 || x > 255) continue; P.set(x, y + 6, P.pick(peel, clamp(0.64 - q * 0.3 - (x - 242) / 90 + (hash(x >> 2, y, 7) - 0.5) * 0.12 + (q > 0.7 ? -0.2 : 0), 0, 1), x, y)); }
  scatter(P, floor, 24, 93, (x, y, s, k) => { if (k < 0.5) rock(P, x, y, s * 0.55, ['#140a08', '#322018', '#54382a', '#78523c'], x); else if (s > 0.3) { const E2 = RG(['#6a1008', '#e85a10', '#ffd25a']); P.set(x, y, E2[1]); P.set(x + 1, y, E2[2]); } }); // ash chunks and live coals
  shadowBand(P, floor, floor + 12, 0.3); vignette(P, 0.42);
};
