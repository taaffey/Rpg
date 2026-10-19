// ===== Field-sprite art for walkers.js: layered ASCII parts + material ramps + auto outline =====
// Every part is { x, y, rows } in sprite coordinates (feet outline on row 23, head top around row 0; negative
// rows are allowed for hats/spears and the canvas grows upward to fit, see cfg.h).
// Letters pick a material and a shade (hi, base, shade, deep):
//   skin S s x X · hair Y H h j · main cloth W T t u · 2nd cloth/legs Q P p q · metal L M m n
//   accent Z A a z · leather/boots D B b d · wood/prop G R r g · 3rd cloth (cape, hat) K C c v · fur/feather O F f N
//   e eye, E iris, w white, o dark line, '1'..'9' per-character special colours, '_' erase, '.' keep
// Outlines are added automatically around the silhouette, tinted from the neighbouring material.

const BW = 16, BH = 34, OY = 10; // work buffer; sprite row r lives at buffer row r + OY
const SETS = { S: 'SsxX', H: 'YHhj', T: 'WTtu', P: 'QPpq', M: 'LMmn', A: 'ZAaz', B: 'DBbd', R: 'GRrg', C: 'KCcv', F: 'OFfN' };
const CODE = {}; for (const [m, s] of Object.entries(SETS)) [...s].forEach((ch, i) => { CODE[ch] = [m, i]; });

// ---------- colour ramps (hue-shifted: warm highlights, cool purple shadows) ----------
const hx = (h) => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map((c) => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
function toHsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; }
function fromHsl(h, s, l) { h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l)); const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return '#' + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join(''); }
const toward = (h, t, amt) => { let d = ((t - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), amt); };
export function ramp(base) {
  if (Array.isArray(base)) return base.length >= 5 ? base : [...base, outlineOf(base[base.length - 1])];
  const [h, s, l] = toHsl(hx(base)), grey = s < 0.08;
  const hi = fromHsl(grey ? h : toward(h, 55, 10), s * 0.92, Math.min(0.96, l + 0.13 + (1 - l) * 0.08));
  const sh = fromHsl(grey ? 230 : toward(h, 255, 12), grey ? 0.1 + s : Math.min(1, s * 1.04), l - 0.13);
  const dp = fromHsl(grey ? 240 : toward(h, 260, 22), grey ? 0.14 + s : Math.min(1, s * 1.06), Math.max(0.07, l - 0.27));
  return [hi, base, sh, dp, outlineOf(dp)];
}
function outlineOf(c) { const [h, s, l] = toHsl(hx(c)); return fromHsl(toward(h, 265, 25), Math.min(0.55, s * 0.8 + 0.1), Math.min(0.13, Math.max(0.05, l * 0.42))); }

const SPECIAL = { e: '#1d1530', E: '#3b4d96', w: '#fbf8f0', o: '#2b1a2c' };
const DEFAULT_RAMPS = { S: ['#ffe2c4', '#f3bf92', '#d08d64', '#9a5c40'], B: '#6a4630', P: '#5a5068', M: '#a8b0c4', A: '#e8c050', R: '#8a5a30', F: '#f2f2f2', C: '#c04040', H: '#7a4a26', T: '#4a6ab0' };

// ---------- compositor ----------
function paint(buf, part, dx = 0, dy = 0, map) {
  if (!part) return;
  const { rows, x = 0, y = 0 } = part;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r], by = y + r + dy + OY;
    if (by < 0 || by >= BH) continue;
    for (let c = 0; c < row.length; c++) {
      const ch = row[c], bx = x + c + dx; if (ch === '.' || ch === ' ' || bx < 0 || bx >= BW) continue;
      buf[by * BW + bx] = ch === '_' ? null : (typeof map === 'function' ? map(ch, y + r + dy) : map && map[ch]) || ch;
    }
  }
}
const P = (x, y, rows) => ({ x, y, rows });
export { P as part };

import { FACE, EAR, TORSO, ARM, LEGS, ROBE, HAIR, HEADS, PROPS, HEROES, TOWNS, LOOKS, OUTFITS } from './walkerdata.js';

export const CHARS = HEROES, NPCS = {};
for (const [k, v] of Object.entries(TOWNS)) NPCS[k] = { ...v, npc: true };

// ---------- looks: 'job' or 'job@look' -> recipe (the calling's outfit, the person's hair / skin / beard) ----------
const OPEN_HEADS = new Set(['monk', 'cowlick']), HOODED = new Set(['cleric', 'rogue']);
const LOOKC = new Map();
export function cfgFor(key, table = CHARS, fallback = 'knight') {
  key = String(key || ''); let c = LOOKC.get(key); if (c) return c;
  const [job, look] = key.split('@'), L = LOOKS[look], base = OUTFITS[key] || table[job] || table[fallback] || CHARS.knight;
  if (!L) { LOOKC.set(key, base); return base; }
  const heads = [].concat(base.head || []), open = !heads.length || heads.every((h) => OPEN_HEADS.has(h)), hood = heads.some((h) => HOODED.has(h));
  c = { ...base, ramps: { ...(base.ramps || {}), ...L.ramps }, spec: { ...(base.spec || {}), ...(L.spec || {}) } };
  if (base.hair && !OUTFITS[key]) c.hair = L.hair;
  c.head = [...heads, ...(base.hair && open ? L.open || [] : []), ...(hood ? L.hood || [] : []), ...(L.face || [])];
  LOOKC.set(key, c); return c;
}
for (const who of ['adam', 'devon']) NPCS[who] = { ...cfgFor('bloke@' + who), npc: true }; // the bros as standing townsfolk

const rampCache = new WeakMap();
function rampsFor(cfg) {
  let r = rampCache.get(cfg); if (r) return r;
  r = {}; const src = { ...DEFAULT_RAMPS, ...(cfg.ramps || {}) };
  for (const m of Object.keys(SETS)) r[m] = ramp(src[m] || '#808080');
  r.x = { ...SPECIAL, ...(cfg.spec || {}) };
  rampCache.set(cfg, r); return r;
}

// build the part list for one pose: [part, dy, remap]
function layers(cfg, dir, f) {
  const L = [], bob = f % 2 ? 1 : 0, rm = cfg.remap || {};
  const sw = f === 1 ? 1 : f === 3 ? 2 : 0, sw2 = f === 1 ? 2 : f === 3 ? 1 : 0; // arm swing opposite to the legs
  const props = (cfg.props || []).map((n) => PROPS[n]?.[dir]).filter(Boolean);
  const z = (k) => { for (const p of props) if (p.z === k) for (const q of p.parts) L.push([q, bob]); };
  const add = (p, m, dy = bob) => p && L.push([p, dy, m]);
  z('back');
  const legs = cfg.body === 'robe' ? ROBE[dir][f] : LEGS[dir][f];
  if (dir === 'right') {
    if (!cfg.hold) add(ARM.far[sw2], rm.arms);
    add(legs, cfg.body === 'robe' ? rm.torso : rm.legs, 0); add(TORSO.right, rm.torso); add(ARM.near[cfg.hold && props.some((p) => p.z === 'top') ? 0 : sw], rm.arms);
  } else {
    add(legs, cfg.body === 'robe' ? rm.torso : rm.legs, 0); add(TORSO[dir], rm.torso);
    const a = dir === 'down' ? [cfg.hold ? 0 : sw, sw2] : [sw2, cfg.hold ? 0 : sw];
    add(ARM.L[a[0]], rm.arms); add(ARM.R[a[1]], rm.arms);
  }
  z('mid');
  add(FACE[dir]); add(HAIR[cfg.hair]?.[dir]); if (dir === 'right') add(EAR);
  for (const h of [].concat(cfg.head || [])) for (const p of HEADS[h]?.[dir] || []) add(p);
  z('top');
  return L;
}

// children: drop two torso rows and one leg row so the big head sits on a small body
function kidSquash(buf) {
  const drop = new Set([13, 15, 19].map((r) => r + OY)), keep = [];
  for (let y = 0; y < BH; y++) if (!drop.has(y)) keep.push(buf.slice(y * BW, y * BW + BW));
  while (keep.length < BH) keep.unshift(new Array(BW).fill(null));
  keep.forEach((row, y) => row.forEach((v, x) => { buf[y * BW + x] = v; }));
}
// dev check: rows of a part must share one width (16 for full-width parts)
function check(name, p) {
  if (!p || !p.rows) return; const w = p.rows[0].length;
  p.rows.forEach((r, i) => { if (w > 9 && (r.length !== w || (p.x === 0 && r.length !== 16))) console.warn('walker part', name, 'row', i, JSON.stringify(r), r.length); });
}
const walk = (name, o) => { if (!o) return; if (o.rows) return check(name, o); if (Array.isArray(o)) return o.forEach((v, i) => walk(name + '.' + i, v)); if (typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(name + '.' + k, v); };
if (typeof location !== 'undefined' && /walkers\.html/.test(location.pathname)) walk('W', { FACE, EAR, TORSO, ARM, LEGS, ROBE, HAIR, HEADS, PROPS });
const NB = [[0, -1], [0, 1], [-1, 0], [1, 0]];
export function compose(cfg, dir, f, blink = false) {
  const buf = new Array(BW * BH).fill(null);
  for (const [p, dy, m] of layers(cfg, dir, f)) paint(buf, p, 0, dy, m);
  if (cfg.kid) kidSquash(buf);
  if (cfg.plaid) for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) { // check shirt: dark stripes every 3 px on the main cloth
    const i = y * BW + x, ch = buf[i]; if (!ch || CODE[ch]?.[0] !== 'T') continue; const vx = (x + 1) % 3 === 0, hy = (y + 2) % 3 === 0;
    if (vx && hy) buf[i] = '1'; else if (vx || hy) buf[i] = { W: 'T', T: 't', t: 'u', u: '1' }[ch];
  }
  if (blink) for (let i = 0; i < buf.length; i++) { if (buf[i] === 'e') buf[i] = 's'; else if (buf[i] === 'E') buf[i] = 'e'; }
  const R = rampsFor(cfg), col = new Array(BW * BH).fill(null), out = new Array(BW * BH).fill(null);
  for (let i = 0; i < buf.length; i++) {
    const ch = buf[i]; if (!ch) continue;
    if (CODE[ch]) { const [m, s] = CODE[ch]; col[i] = R[m][s]; out[i] = R[m][4]; }
    else { col[i] = R.x[ch] || SPECIAL.o; out[i] = '#1a1022'; }
  }
  // auto outline: empty pixel touching the silhouette takes the darkest neighbour's outline tint
  const ol = new Array(BW * BH).fill(null);
  for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
    const i = y * BW + x; if (col[i]) continue;
    for (const [dx, dy] of NB) { const X = x + dx, Y = y + dy; if (X >= 0 && X < BW && Y >= 0 && Y < BH && out[Y * BW + X]) { ol[i] = out[Y * BW + X]; break; } }
  }
  for (let i = 0; i < ol.length; i++) if (ol[i]) col[i] = ol[i];
  const h = cfg.h || (cfg.kid ? 21 : 24), c = document.createElement('canvas'); c.width = BW; c.height = h;
  const x = c.getContext('2d'), top = OY + 24 - h;
  for (let y = 0; y < h; y++) for (let X = 0; X < BW; X++) { const v = col[(y + top) * BW + X]; if (v) { x.fillStyle = v; x.fillRect(X, y, 1, 1); } }
  return c;
}
