// ===== Themed small interiors: chippy, stones, bogshed, oasis, lodge, icehut, jetty, hoppub, beachbar =====
// Same interface as roomart.js (isTheme, ground, objects, mapObjects, drawsDecor). Each theme (roomthemes1-3.js) is a spec of
// hooks: floor / back-wall face / wall-top ramp, wall fittings (windows, signs, hearths), furniture sprites, flat floor art,
// animated overlays and a light tint. This engine bakes everything static into one canvas per map (like the pub rooms do),
// then draws sprites, chests, counters and animations on top. Art is 16 px per tile (TS = 32 on screen).
import { mk } from './autotile.js';
import { pk, Pix, cl, mix, dk, hash, vnoise, pick, rgba, cR, cG, cB, cA, VOID, place, chestPix, barrelPix, tablePix, bedPix, rackPix, anvilPix, glowItem, firePix, flamePix, coalsPix, counters, PAL } from './roomkit.js';
import T1 from './roomthemes1.js';
import T2 from './roomthemes2.js';
import T3 from './roomthemes3.js';
import T4 from './roomthemes4.js';
import T5 from './roomthemes5.js';
import T6 from './roomthemes6.js';

const TH = { ...T1, ...T2, ...T3, ...T4, ...T5, ...T6 };
export const isTheme = (theme) => Object.prototype.hasOwnProperty.call(TH, theme);
export const drawsDecor = (m) => isTheme(m.theme);
export const themeNames = () => Object.keys(TH);
const blackTile = (() => { let c = null; return () => { if (!c) { c = mk(1, 1); } return c; }; })();
export const ground = () => blackTile();
export function objects() {}

function build(m) {
  const T = TH[m.theme], kind = m.ikind || 'house', rows = m.rows, W = rows[0].length, H = rows.length, MG = T.mg || 4;
  const TW = W + 2 * MG, THt = H + 2 * MG, GW = TW * 16, GH = THt * 16, O = MG * 16, P = new Pix(GW, GH);
  const X0 = 16, X1 = (W - 1) * 16, Y0 = 16, Y1 = (H - 1) * 16, CAPT = -23, ST = 7;
  const doors = [...rows[H - 1]].map((c, i) => (c === 'E' ? i : -1)).filter((i) => i >= 0), isDoor = (x) => doors.includes(x >> 4);
  const light = { base: 0.66, vk: 0.35, min: 0.2, tint: [0.12, 0.03, -0.18], ...(T.light || {}) };
  for (let py = 0; py < GH; py++) for (let px = 0; px < GW; px++) {
    const x = px - O, y = py - O, inX = x >= X0 && x < X1; let col;
    if (T.open) {
      col = T.floor(x, y, m);
    } else {
      col = T.out ? T.out(x, y) : VOID;
      if (inX && y >= Y0 && y < Y1) col = T.floor(x, y, m);
      else if (inX && y >= -16 && y < 16) col = T.face(x, y + 16, m);
      else if (y >= Y1 && y < Y1 + 16 && isDoor(x)) {
        const dy = y - Y1;
        col = dy < 3 ? T.floor(x, y, m) : dy < 6 ? pick(T.thr || PAL.stone, dy === 3 ? 0.85 : dy === 4 ? 0.62 : 0.3, x, y) : mix(T.doorOut || VOID, pk(T.spill || '#fff0c4'), cl((1 - (dy - 6) / 10) * 0.5) * (1 - Math.abs((x & 15) - 7.5) / 12));
      } else if (y >= CAPT && y < Y1 + ST && x >= X0 - ST && x < X1 + ST) {
        const d = Math.min(y < -16 ? -16 - y : 99, x < X0 ? X0 - x : x >= X1 ? x - X1 + 1 : 99, y >= Y1 ? y - Y1 + 1 : 99), outer = Math.min(y - CAPT, x - (X0 - ST), X1 + ST - 1 - x, Y1 + ST - 1 - y);
        col = T.cap(x, y, d, outer, y >= Y1 && isDoor(x - 1) !== isDoor(x + 1));
      }
    }
    P.d[py * GW + px] = col;
  }
  const S = (x, y, c) => P.set(x + O, y + O, c), G = (x, y) => P.get(x + O, y + O), D = (x, y, f) => { const c = G(x, y); if (cA(c)) S(x, y, dk(c, f)); }, B = (x, y, c, t) => { const o = G(x, y); if (cA(o)) S(x, y, mix(o, c, t)); };
  const anim = [], lights = [], u = { S, G, D, B, P, O, GW, GH, anim, lights, X0, X1, Y0, Y1, W, H, kind, m, wy: (f) => f - 16, isDoor, doors, id: m.name };
  T.pre?.(u);
  // flat floor art (holes, trapdoor-like things) baked under everything
  for (const [tx, ty, k] of m.decor || []) T.flat?.[k]?.(u, tx, ty);
  if (T.mat) for (const dx of doors) T.mat(u, dx);
  if (!T.noAO) {
    for (let y = 16; y < 24; y++) for (let x = X0; x < X1; x++) D(x, y, 0.55 + (y - 16) * 0.055);
    for (let y = 16; y < Y1; y++) for (let k = 0; k < 4; k++) { D(X0 + k, y, 0.62 + k * 0.09); D(X1 - 1 - k, y, 0.68 + k * 0.08); }
    for (let y = -16; y < 16; y++) for (let k = 0; k < 3; k++) { D(X0 + k, y, 0.6 + k * 0.13); D(X1 - 1 - k, y, 0.66 + k * 0.11); }
    for (let x = X0; x < X1; x++) if (!isDoor(x)) for (let k = 0; k < 2; k++) D(x, Y1 - 1 - k, 0.75 + k * 0.12);
  }
  for (const [what, c] of T.feat ? T.feat(kind, m) : []) T.fit[what]?.(u, Math.round(c * 16 + 8), c);
  // drop shadows of the furniture (baked)
  for (const [tx, ty, k] of m.decor || []) {
    const sh = T.shadow ? T.shadow(k) : undefined, cx = tx * 16 + 8, cy = ty * 16 + 14, rx = sh ? sh[0] : k === 'counter' || T.flat?.[k] ? 0 : k === 'bed' ? 8 : 7, ry = sh ? sh[1] : k === 'bed' ? 5 : 2.6, ccy = sh && sh[2] != null ? ty * 16 + sh[2] : k === 'bed' ? ty * 16 + 12 : cy;
    if (rx) for (let y = Math.floor(ccy - ry); y <= ccy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx + 1; x++) if (((x + 0.5 - cx - 1) / rx) ** 2 + ((y + 0.5 - ccy) / ry) ** 2 <= 1) D(x, y, T.shadowK || 0.62);
  }
  for (const c of counters(m)) for (let y = c.y * 16 + 14; y < c.y * 16 + 18; y++) for (let x = c.x * 16; x < (c.x + c.w) * 16 + 2; x++) D(x, y, y < c.y * 16 + 16 ? 0.55 : 0.75);
  rows.forEach((r, ty) => [...r].forEach((ch, tx) => { if (ch === 'C') for (let y = ty * 16 + 12; y < ty * 16 + 17; y++) for (let x = tx * 16 + 2; x < tx * 16 + 16; x++) if (((x + 0.5 - tx * 16 - 9) / 7) ** 2 + ((y + 0.5 - ty * 16 - 14.5) / 2.4) ** 2 <= 1) D(x, y, 0.6); }));
  T.post?.(u);
  // baked light field: the theme's lights, the doorway, corners falling off into shadow
  for (const dx of doors) lights.push([dx * 16 + 8, Y1 + 4, 0.3, 30]);
  const ccx = (X0 + X1) / 2, ccy = 40, [tr, tg, tb] = light.tint, fd = T.fade;
  for (let py = 0; py < GH; py++) for (let px = 0; px < GW; px++) {
    const i = py * GW + px, c = P.d[i]; if (c === VOID) continue; const x = px - O, y = py - O;
    let L = light.base - Math.hypot((x - ccx) / 120, (y - ccy) / 90) * light.vk;
    for (const [lx, ly, s, r] of lights) { const d2 = ((x - lx) ** 2 + (y - ly) ** 2) / (r * r); if (d2 < 4) L += s * Math.exp(-d2 * 1.6); }
    L = cl(L, light.min, 1.25); let f = 0.42 + 0.66 * L; const w = cl(L - 0.6, 0, 0.6);
    if (fd) { const dd = Math.max(0, Math.max(X0 - x, x - X1, Y0 - 16 - y, y - Y1)); f *= 1 - cl((dd - fd[0]) / fd[1]) * fd[2]; }
    P.d[i] = rgba(cR(c) * f * (1 + w * tr), cG(c) * f * (1 + w * tg), cB(c) * f * (1 + w * tb), 255);
  }
  return { cv: P.canvas(), GW, GH, MG, anim, kind };
}

const MC = new WeakMap();
const mapState = (m) => { let s = MC.get(m); if (!s) { s = build(m); MC.set(m, s); } return s; };
const canvasItem = (s) => ({ x: -s.MG, y: -s.MG, w: 1, h: 1, z: 0, draw: (ctx, X, Y, TS) => { const k = TS / 16, sx0 = Math.max(0, Math.floor(-X / k)), sy0 = Math.max(0, Math.floor(-Y / k)), sw = Math.min(s.GW - sx0, Math.ceil(ctx.canvas.width / k) + 2), sh = Math.min(s.GH - sy0, Math.ceil(ctx.canvas.height / k) + 2); if (sw > 0 && sh > 0) ctx.drawImage(s.cv, sx0, sy0, sw, sh, X + sx0 * k, Y + sy0 * k, sw * k, sh * k); } });
const DEF = { barrel: () => barrelPix(), table: () => tablePix(), bed: () => bedPix('haven'), anvil: () => anvilPix(), shelf: () => rackPix() };

export function mapObjects(m, t, out) {
  const s = mapState(m), T = TH[m.theme], open = (x, y) => !!m.chestOpen?.(x, y), kind = s.kind;
  out.push(canvasItem(s));
  m.rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === 'C') out.push(place(chestPix(open(x, y), T.chest || ''), x, y)); });
  for (const [x, y, k] of m.decor || []) {
    if (k === 'counter' || T.flat?.[k]) continue;
    const f = T.spr[k] || DEF[k]; if (!f) continue;
    const img = f(t, m, x, y, kind); if (img) out.push(place(img, x, y));
  }
  if (T.counter) for (const c of counters(m)) { const img = T.counter(c.w, kind, t); out.push({ img, x: c.x - 1 / 16, y: c.y + 1 - 19 / 16, z: 1, sy: c.y + 1.02 }); }
  const fl = 0.85 + Math.sin(t * 9) * 0.08 + Math.sin(t * 23) * 0.05;
  for (const a of s.anim) {
    if (a.k === 'fire') out.push({ img: firePix(Math.floor(t * 8) % 4), x: a.x / 16, y: a.y / 16, w: a.w / 16, h: a.h / 16, z: 0 });
    else if (a.k === 'coals') out.push({ img: coalsPix(Math.floor(t * 3) % 4), x: a.x / 16, y: a.y / 16, z: 0 });
    else if (a.k === 'flame') out.push({ img: flamePix(Math.floor(t * 5 + a.x) % 2), x: a.x / 16, y: a.y / 16, z: 0 });
    else if (a.k === 'glow') out.push(glowItem(a.rgb || '255,150,60', a.x / 16, a.y / 16, a.r, a.a * (a.flat ? 1 : fl)));
  }
  T.over?.(m, t, out, s);
}
