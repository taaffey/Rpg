// ===== Festival towns: Hopsend ('autumntown') and Kilnhaven ('volcanotown') =====
// Same pipeline as the Bell Village in townart.js: everything static is baked once into a big ground canvas (materials, banks,
// walls, hedges, fences, litter, shadows); buildings, trees, props and animated bits are cached sprites sorted with the characters.
// This file is the shared framework (ground bake, water frames, draw hooks); the art itself lives in autumnart.js (Hopsend) and
// volcanoart.js (Kilnhaven). townart.js hands us its pixel kit lazily (see KIT there), so the modules never import each other.
import { makeAutumn } from './autumnart.js';
import { makeVolcano } from './volcanoart.js';

export function makeFestTowns(K) {
  const { Pix, hash, vnoise, pk, cA, cR, cG, cB, rgba, cl, dk, boxblur, MG, once, mk, pick, canv } = K;
  const CLS = { LAND: 0, DIRT: 1, ST: 2, PLZ: 3, WAT: 4, LAVA: 5, WALL: 6, LAWN: 7, MTN: 8 };
  const shEll = (S, cx, cy, rx, ry) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) { const X = x + S.O, Y = y + S.O; if (X >= 0 && Y >= 0 && X < S.GW && Y < S.GH) S.SH[Y * S.GW + X] = 1; } };
  const shRect = (S, x0, y0, w, h, skew = 0) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const X = x + S.O + (skew ? Math.floor((y - y0) * skew) : 0), Y = y + S.O; if (X >= 0 && Y >= 0 && X < S.GW && Y < S.GH) S.SH[Y * S.GW + X] = 1; } };
  const putSprite = (out, img, x, yBottom, sy = 0, z = 1) => out.push({ img, x: x + (img.dx || 0), y: yBottom - img.height / 16 + (img.dy || 0), z, sy: yBottom + sy });
  const U = { ...K, CLS, shEll, shRect, putSprite };
  const THEMES = { autumntown: makeAutumn(U), volcanotown: makeVolcano(U) };

  // 'F' blocks (centrepieces): top-left and size
  function centres(base) {
    const out = [];
    base.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'F' && base[y][x - 1] !== 'F' && (base[y - 1] || '')[x] !== 'F') { let w = 0, h = 0; while (r[x + w] === 'F') w++; while ((base[y + h] || '')[x] === 'F') h++; out.push({ x, y, w, h }); } }));
    return out;
  }

  // ---------------------------------------------------------------- the static ground canvas
  function buildGround(m, T) {
    const base = m.base || m.rows, W = base[0].length, H = base.length, TW = W + 2 * MG, TH = H + 2 * MG, GW = TW * 16, GH = TH * 16, O = MG * 16;
    const chAt = (x, y) => base[Math.max(0, Math.min(H - 1, y))][Math.max(0, Math.min(W - 1, x))];
    const C = new Uint8Array(TW * TH); for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) C[ty * TW + tx] = T.cls[chAt(tx - MG, ty - MG)] ?? CLS.LAND;
    const cAt = (tx, ty) => C[Math.max(0, Math.min(TH - 1, ty)) * TW + Math.max(0, Math.min(TW - 1, tx))];
    const field = (set, r) => { const F = new Float32Array(GW * GH); for (let py = 0; py < GH; py++) for (let px = 0; px < GW; px++) F[py * GW + px] = set(C[(py >> 4) * TW + (px >> 4)]) ? 1 : 0; boxblur(F, GW, GH, r); boxblur(F, GW, GH, r); return F; };
    const has = (k) => C.includes(k);
    const WF = has(CLS.WAT) ? field((c) => c === CLS.WAT, 4) : null, LV = has(CLS.LAVA) ? field((c) => c === CLS.LAVA, 4) : null;
    const SF = field((c) => c === CLS.ST || c === CLS.PLZ, 3), PF = field((c) => c === CLS.PLZ, 2), DF = field((c) => c === CLS.DIRT, 3), LF = has(CLS.LAWN) ? field((c) => c === CLS.LAWN, 3) : null;
    const cen = centres(base).map((f) => [(f.x + f.w / 2) * 16, (f.y + f.h / 2) * 16]);
    const nearest = (x, y) => { let b = cen[0] || [W * 8, H * 8], bd = 1e9; for (const c of cen) { const d = (c[0] - x) ** 2 + (c[1] - y) ** 2; if (d < bd) { bd = d; b = c; } } return b; };
    const P = new Pix(GW, GH), SH = new Uint8Array(GW * GH);
    for (let py = 0; py < GH; py++) for (let px = 0; px < GW; px++) {
      const tx = px >> 4, ty = py >> 4, lx = px & 15, ly = py & 15, x = px - O, y = py - O, c = C[ty * TW + tx], i = py * GW + px; let col = 0;
      if (c === CLS.WALL) {
        let top = ty; while (top > MG && cAt(tx, top - 1) === CLS.WALL) top--; let bot = ty; while (bot < TH - MG - 1 && cAt(tx, bot + 1) === CLS.WALL) bot++;
        col = T.wall(x, y, (ty - top) * 16 + ly, (bot - top + 1) * 16, px, py);
        if (cAt(tx - 1, ty) !== CLS.WALL && lx <= 1) col = dk(col, 0.62); if (cAt(tx + 1, ty) !== CLS.WALL && lx >= 14) col = dk(col, 0.55);
      } else if (c === CLS.MTN) col = T.mtn(x, y, px, py, ty - MG);
      else {
        const jag = (vnoise(x, y, 3, 19) - 0.5) * 0.12, jg2 = (vnoise(x, y, 4, 9) - 0.5) * 0.1, w = WF ? WF[i] + jag + jg2 : 0, lv = LV ? LV[i] + jag + jg2 : 0;
        if (w > 0.36) col = T.pond(w, x, y, px, py);
        else if (lv > 0.36) col = T.lavapool(lv, x, y, px, py);
        else {
          const s = SF[i] + jag, d = DF[i] + jag, l = LF ? LF[i] + jag : 0;
          if (s > 0.5) { const pv = PF[i] + jag * 0.5; col = s < 0.545 ? T.kerb(px, py) : pv > 0.5 ? (pv < 0.54 ? T.plazaEdge(px, py) : T.plaza(x, y, nearest(x, y))) : T.cobble(x, y); }
          else if (d > 0.5) col = d < 0.54 ? T.dirtEdge(px, py) : T.dirt(x, y);
          else if (l > 0.5) col = l < 0.55 ? T.lawnEdge(px, py) : T.lawn(x, y);
          else { col = T.land(x, y); if (s > 0.43 || d > 0.44) col = dk(col, 0.74); }
        }
      }
      P.d[i] = col;
    }
    const S = { P, SH, GW, GH, O, W, H, C, TW, TH, WF, LV, cAt, chAt, cen: centres(base) };
    T.decorate(m, S);
    const sm = T.shade || [0.6, 0.62, 0.7, 12];
    for (let i = 0; i < GW * GH; i++) if (SH[i]) { const c = P.d[i], a = cA(c); P.d[i] = a === 255 ? rgba(cR(c) * sm[0], cG(c) * sm[1], cB(c) * sm[2] + sm[3]) : a ? c : pk('#00061a66'); }
    let glow = null;
    if (T.glowTest) { const Gp = new Pix(GW, GH); let n = 0; for (let i = 0; i < GW * GH; i++) { const c = P.d[i]; if (cA(c) === 255 && T.glowTest(c)) { Gp.d[i] = c; n++; } } if (n) glow = Gp.canvas(); }
    return { cv: P.canvas(), GW, GH, glow };
  }

  // ---------------------------------------------------------------- animated water / lava / spring frames (seen through holes in the ground canvas)
  const WF8 = 8;
  const waterTile = (T, kind, x, y, f) => once(`fw${kind}${f}${x & 3}${y & 3}`, () => {
    const t = once(`ft${kind}${f}`, () => T.waterPix(kind, f)), p = new Pix(16, 16);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) p.d[j * 16 + i] = t.d[((y & 3) * 16 + j) * 64 + (x & 3) * 16 + i];
    return canv(p);
  });
  const ground = (theme, get, x, y, t) => { const T = THEMES[theme]; return waterTile(T, T.kindAt(get, x, y), x, y, Math.floor(t * 5) % WF8); };

  // ---------------------------------------------------------------- per-map cache and the draw hooks used by game.js
  const MC = new WeakMap();
  const state = (m) => { let s = MC.get(m); if (!s) { s = { g: buildGround(m, THEMES[m.theme]) }; MC.set(m, s); } return s; };
  const objects = (theme, get, x, y, t, out, m) => THEMES[theme].tree(get, x, y, out, m);
  function mapObjects(m, t, out) {
    const T = THEMES[m.theme], s = state(m), G = s.g;
    out.push({ x: -MG, y: -MG, w: 1, h: 1, z: 0, draw: (ctx, X, Y, TS) => {
      const k = TS / 16, sx0 = Math.max(0, Math.floor(-X / k)), sy0 = Math.max(0, Math.floor(-Y / k)), sw = Math.min(G.GW - sx0, Math.ceil(ctx.canvas.width / k) + 2), sh = Math.min(G.GH - sy0, Math.ceil(ctx.canvas.height / k) + 2);
      if (sw <= 0 || sh <= 0) return; ctx.drawImage(G.cv, sx0, sy0, sw, sh, X + sx0 * k, Y + sy0 * k, sw * k, sh * k);
      if (G.glow) { const a = T.pulse ? T.pulse(t) : 0.4; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.drawImage(G.glow, sx0, sy0, sw, sh, X + sx0 * k, Y + sy0 * k, sw * k, sh * k); ctx.restore(); }
    } });
    T.mapObjects(m, t, out);
    if (T.overlay) out.push({ x: 0, y: 0, w: 1, h: 1, z: 2, draw: (ctx, X, Y, TS) => T.overlay(ctx, t, TS, X, Y) });
  }
  return { ground, objects, mapObjects };
}
