// ===== Hopsend (theme 'autumntown'): a golden late-afternoon orchard-and-hops village =====
// Amber grass and stubble, fallen leaves drifting over cobbles and lanes, apple and pear orchards, hop-pole trellises, oast houses,
// a timber barn with a hay loft, a cider press, a maypole on the village green, a leafy pond. Drawn at 16 px per tile.
// base chars: . amber grass  ; village green  , dirt lane  _ cobbles  : paving  ~ pond  # stone wall (red creeper)
//             T maple  a apple tree  e pear tree  k hop trellis  h hedge  f fence  w chrysanthemum bed  E exit
export function makeAutumn(U) {
  const { Pix, PAL, ramp, pk, cA, cl, mix, dk, hash, vnoise, fbm, pick, outline, rim, blob, canv, once, vor, tuft, trunk, thatch, tileRoof, chimney, masonryPx, oakPost, oakRail, lattice, doorAt, eaveShadow, eyebrow, climber, cob, wob,
    lampPix, puffPix, flipped, txt, txtW, PROPS, propPix, shEll, shRect, putSprite, edgeMask, braceLine, CLS, goosePix, haystackPix, hivesPix } = U;

  // ---------------------------------------------------------------- palettes
  const PA = {
    grass: ramp('#2a2208 #3e3010 #564218 #72581f #8e7228 #a88c34 #c2a642 #d8c058 #eadb78 #f6ec9c'),
    lawn: ramp('#1a3412 #264818 #345e1e #447626 #588e2e #6ea43a #88b848 #a4cc5c #c2dc7c'),
    dirt: ramp('#38240e #4e3414 #66461c #825c26 #9c7632 #b8923f #d0ac56 #e4c874'),
    cob: ramp('#322a24 #483c32 #604f40 #7a6650 #947c60 #ae9672 #c6b088 #dcc8a0'),
    plz: ramp('#40362e #5a4c40 #766454 #917c68 #aa957c #c2ae94 #d8c8ae #ece0c8'),
    stone: ramp('#2e2218 #44342a #5c4838 #765e48 #907858 #aa9068 #c4a87c #dcc494'),
    creeper: ramp('#2a0a0c #4a1014 #6e1a1a #922a20 #b84026 #d85c30 #ee7e40 #f8a05a'),
    bank: ramp('#2a2012 #3c2e1a #50402a #685338 #7f6a48 #988258'),
    brick: ramp('#240e0c #3c1814 #54241c #6e3224 #88422c #a25636 #bc6c44 #d4865a'),
    tile: ramp('#26100c #40201a #5c2e22 #784030 #965440 #b26a50 #cc8664 #e4a47e'),
    barn: ramp('#2a0e0c #46201a #62301f #7e4226 #9a5430 #b66a3c #cc8450'),
    hop: ramp('#0e2a10 #1a4016 #285a1e #38742a #4c8e36 #66a844 #86c458 #a8dc74'),
    straw: ramp('#4a3410 #6e4e16 #926a20 #b08430 #cca046 #e2bc62 #f4d684 #fff0a8'),
    tin: ramp('#2a3038 #3c444e #505a66 #687480 #8290a0 #9eacba #bcc8d4 #dce4ec'),
    leafO: ramp('#4a1608 #6c2410 #90340f #b44a14 #d4641c #ec8426 #f8a63c #ffc85c #ffe08a'),
    leafR: ramp('#3a0a10 #5c1216 #82201c #a8321f #cc4a24 #e66a30 #f48e44 #fcb460'),
    leafY: ramp('#4e3a0a #70540e #946e14 #b8881c #d8a628 #f0c43c #fcdc64 #fff0a0'),
    leafG: ramp('#1c3a10 #2c5016 #40681c #588424 #769c2c #98b438 #bcc84c #dcd864'),
    pearL: ramp('#243e10 #38581a #507424 #6c9030 #8cac3e #aec450 #cfd86a #ecea8e'),
    hedge: ramp('#1c2a0c #2c3e10 #3e5214 #526818 #6a8020 #849a2a #a2b438 #c4d050'),
    pumpkin: ramp('#5a1c06 #8e3008 #c44a0c #e8661a #f88a30 #ffb24c'),
    water: ramp('#0e2a30 #143c44 #1c525a #266a70 #34848a #4e9ea0 #78b8b4 #a8d2c6 #d6ece0 #f4fcf0'),
  };
  const LC = ['#e8742a', '#d4501e', '#f0a030', '#c03a1c', '#f8c040', '#b86418', '#e06424', '#9c2c18'].map(pk);
  function leafAt(x, y, dens, s = 5) { // a fallen leaf (2 px + shade) in a jittered 6x5 cell
    const gx = Math.floor(x / 6), gy = Math.floor(y / 5); if (hash(gx, gy, s) > dens) return 0;
    const ox = gx * 6 + 1 + Math.floor(hash(gx, gy, s + 1) * 4), oy = gy * 5 + 1 + Math.floor(hash(gx, gy, s + 2) * 3), dx = x - ox, dy = y - oy, c = LC[Math.floor(hash(gx, gy, s + 3) * LC.length)], f = hash(gx, gy, s + 4) < 0.5;
    if (dy === 0 && (dx === 0 || dx === 1)) return c;
    if (dy === 1 && dx === (f ? 1 : 0)) return dk(c, 0.7);
    if (dy === -1 && dx === (f ? 0 : 1) && hash(gx, gy, s + 5) < 0.5) return mix(c, pk('#ffffff'), 0.25);
    return 0;
  }
  const drift = (x, y) => cl((vnoise(x, y, 26, 71) - 0.45) * 2.4 + (vnoise(x, y, 9, 72) - 0.5) * 0.5, 0, 1); // leaves pile up in drifts

  // ---------------------------------------------------------------- ground materials
  const land = (x, y) => {
    let v = 0.3 + fbm(x, y, 1) * 0.5 + (vnoise(x, y, 36, 6) - 0.5) * 0.3 + tuft(x, y, 11, 0.8); if (hash(x >> 1, y >> 2, 5) < 0.1 && !(x & 1)) v -= 0.1; // stubble
    return leafAt(x, y, 0.035 + 0.42 * drift(x, y)) || pick(PA.grass, cl(v, 0.04, 0.92), x, y);
  };
  const dirt = (x, y) => { const v = vor(x, y, 4.2, 1, 41); let s = 0.42 + (fbm(x, y, 8) - 0.5) * 0.45; if (v.h < 0.14 && v.e > 1.1) s += v.dx + v.dy < 0 ? 0.28 : 0.1; else if (v.e < 0.7 && v.h > 0.8) s -= 0.12; return leafAt(x, y, 0.03 + 0.3 * drift(x, y), 15) || pick(PA.dirt, cl(s), x, y); };
  const cobble = (x, y) => {
    const v = vor(x, y, 5.6, 0.78, 31), n = fbm(x, y, 9); let col;
    if (v.e < 0.85) col = pick(PA.cob, 0.04 + n * 0.1, x, y);
    else { let s = 0.46 + (v.h - 0.5) * 0.34 + (n - 0.5) * 0.18; const lit = -(v.dx + v.dy); if (v.e < 2.0) s += lit > 0.3 ? 0.2 : lit < -0.3 ? -0.2 : 0; else s += 0.05; col = pick(PA.cob, cl(s, 0.12, 1), x, y); }
    return leafAt(x, y, 0.05 + 0.5 * drift(x, y), 25) || col;
  };
  const plaza = (x, y) => {
    const v = vor(x, y, 8.4, 0.8, 55), n = fbm(x, y, 9); let col;
    if (v.e < 1.0) col = pick(PA.plz, 0.07 + n * 0.1, x, y);
    else { let s = 0.52 + (v.h - 0.5) * 0.36 + (n - 0.5) * 0.2; const lit = -(v.dx + v.dy); if (v.e < 2.2) s += lit > 0.3 ? 0.17 : lit < -0.3 ? -0.17 : 0; col = pick(PA.plz, cl(s, 0.1, 1), x, y); }
    return leafAt(x, y, 0.04 + 0.45 * drift(x, y), 35) || col;
  };
  const lawn = (x, y) => { const stripe = (Math.floor((y + 3) / 8) & 1) ? 0.05 : -0.03; return leafAt(x, y, 0.015 + 0.22 * drift(x, y), 45) || pick(PA.lawn, cl(0.44 + fbm(x, y, 2) * 0.4 + tuft(x, y, 13, 0.85) * 0.8 + stripe, 0.05, 0.95), x, y); };
  const pond = (w, x, y, px, py) => {
    if (w <= 0.44) return dk(land(x, y), 0.68);
    if (w <= 0.5) return pick(PA.bank, cl(0.38 + (fbm(x, y, 3) - 0.5) * 0.5 + (hash(x, y, 9) < 0.14 ? 0.35 : 0)), x, y);
    if (w <= 0.58) return hash(x, y, 12) < 0.55 ? pk('#a8d4b470') : pk('#78acA068');
    return 0;
  };
  const wall = (x, y, wy, tot) => { // sandstone wall: cap stones on top, ashlar face with red creeper climbing down from the top
    const capH = tot > 16 ? 16 : 6;
    if (wy < capH) { const row = Math.floor(wy / 8), bx = Math.floor((x + (row & 1) * 4) / 8), bu = (((x + (row & 1) * 4) % 8) + 8) % 8; let v = 0.62 + (hash(bx, row, 21) - 0.5) * 0.2 + (fbm(x, y, 4) - 0.5) * 0.2; if (bu === 0) v = 0.28; if (wy === 0) v = 0.92; if (wy === capH - 1) v = 0.3;
      return leafAt(x, y, 0.16, 55) || pick(PA.stone, cl(v), x, y); }
    const fy = wy - capH, row = Math.floor(fy / 5), bx = Math.floor((x + (row & 1) * 5) / 10), bu = (((x + (row & 1) * 5) % 10) + 10) % 10, bv = fy % 5;
    let v = 0.46 + (hash(bx, row + 3, 23) - 0.5) * 0.26 + (fbm(x, y, 6) - 0.5) * 0.15; if (bu === 0 || bv === 4) v = 0.1; else if (bv === 0 || bu === 1) v += 0.14; if (wy >= tot - 3) v -= 0.12;
    const cr = vnoise(x * 0.8, y * 0.5, 6, 33) + (fy < 10 ? 0.25 : 0) - fy * 0.004;
    if (cr > 0.74 && bu !== 0) return pick(PA.creeper, cl(0.35 + hash(x, y, 8) * 0.55 + (vnoise(x, y, 3, 4) - 0.5) * 0.4), x, y);
    return pick(PA.stone, cl(v, 0.05, 0.9), x, y);
  };

  // ---------------------------------------------------------------- trees
  function maplePix(v) {
    return once('amaple' + v, () => {
      const p = new Pix(52, 58), cx = 26, RS = [PA.leafO, PA.leafR, PA.leafY], R = RS[v % 3], R2 = RS[(v + 1) % 3];
      trunk(p, cx, 34, 56, PAL.bark, 3.4);
      for (const s of [-1, 1]) for (let k = 0; k < 7; k++) { const x = Math.round(cx + s * (3.4 + k * 1.2)), y = 52 + Math.round(k * 0.7); p.set(x, y, pick(PAL.bark, 0.45, x, y)); p.set(x, y + 1, pick(PAL.bark, 0.2, x, y)); }
      const bl = [[26, 9, 9], [15, 14, 9], [37, 14, 9], [26, 17, 12], [8, 23, 7], [44, 23, 7], [15, 27, 10], [37, 27, 10], [26, 29, 10], [26, 22, 11], [20, 8, 7], [33, 9, 7]], jit = (k) => (hash(v, k, 5) - 0.5) * 3;
      bl.map((b, k) => [b[0] + jit(k), b[1] + jit(k + 9) * 0.6, b[2] + jit(k + 20) * 0.3]).sort((a, b) => a[1] - b[1]).forEach(([x, y, r], k) => blob(p, x, y, r, hash(v, k, 8) < 0.3 ? R2 : R, { seed: v * 31 + k, rimDark: 0.32, jit: 0.2, amb: 0.1 }));
      for (let i = 0; i < 110; i++) { const x = Math.floor(hash(i, v, 1) * 52), y = Math.floor(hash(i, v, 2) * 40), c = p.get(x, y); if (!cA(c)) continue; for (const Rr of RS) { const li = Rr.indexOf(c); if (li >= Rr.length - 4) { p.set(x, y, Rr[Math.min(Rr.length - 1, li + 2)]); p.set(x + 1, y + 1, Rr[Math.max(0, li - 2)]); break; } } }
      for (let i = 0; i < 6; i++) p.set(6 + Math.floor(hash(i, v, 4) * 40), 38 + Math.floor(hash(i, v, 6) * 14), LC[(i + v) % LC.length]); // leaves on their way down
      outline(p, 0.3); return canv(p);
    });
  }
  const fruitTree = (name, ramp2, w, h, fruit, n, seed) => (v) => once(name + v, () => {
    const p = new Pix(w, h), cx = w / 2; trunk(p, cx, h * 0.52, h - 2, PAL.bark, 1.9);
    for (const [x, y, r] of [[cx, 8, 7], [cx - 8, 13, 7], [cx + 8, 13, 7], [cx, 14, 9], [cx - 6, 20, 6], [cx + 6, 20, 6], [cx, 20, 7]]) blob(p, x + (hash(v, x, 5) - 0.5) * 1.5, y, r, hash(v, x + 9, 3) < 0.25 ? PA.leafY : ramp2, { seed: v * 17 + x + seed, rimDark: 0.3, jit: 0.2, amb: 0.1 });
    for (let i = 0; i < n; i++) { const x = Math.floor(5 + hash(i, v, seed) * (w - 12)), y = Math.floor(5 + hash(i, v + 4, seed) * (h * 0.5)); if (!p.on(x, y) || !p.on(x + 1, y + 1) || !p.on(x, y + 2)) continue; fruit(p, x, y); }
    outline(p, 0.3); return canv(p);
  });
  const applePix = fruitTree('aapple', PA.leafG, 38, 42, (p, x, y) => { p.set(x, y, pk('#e8402e')); p.set(x + 1, y, pk('#b82420')); p.set(x, y + 1, pk('#c02a24')); p.set(x + 1, y + 1, pk('#7a1414')); p.set(x, y - 1, pk('#ffa090')); }, 34, 3);
  const pearPix = fruitTree('apear', PA.pearL, 34, 42, (p, x, y) => { p.set(x, y, pk('#e8e468')); p.set(x + 1, y, pk('#bcc040')); p.set(x, y + 1, pk('#d4d450')); p.set(x + 1, y + 1, pk('#98a030')); p.set(x, y + 2, pk('#a8b038')); p.set(x, y - 1, pk('#fffcc0')); }, 28, 7);
  function tree(get, x, y, out, m) {
    if (m && (x < 0 || y < 0 || x >= m.rows[0].length || y >= m.rows.length)) return; // the map's own tree border does the job; no trees outside it
    const ch = get(x, y); if (ch !== 'T' && ch !== 'a' && ch !== 'e' && ch !== 'k' && ch !== 'h' && ch !== 'f' && ch !== 'w') return;
    const h = hash(x, y, 1); let img;
    if (ch === 'k') { img = hopPix(get(x - 1, y) === 'k', get(x + 1, y) === 'k', h < 0.5 ? 0 : 1); out.push({ img, x, y: y + 1 - img.height / 16, z: 1, sy: y + 1 }); return; }
    if (ch === 'h' || ch === 'f' || ch === 'w') return;
    img = ch === 'a' ? applePix(h < 0.5 ? 0 : 1) : ch === 'e' ? pearPix(h < 0.5 ? 0 : 1) : maplePix(h < 0.4 ? 0 : h < 0.72 ? 1 : 2);
    out.push({ img, x: x + 0.5 - img.width / 32, y: y + 1 - img.height / 16 + 0.1, z: 1, sy: y + 1 });
  }

  // ---------------------------------------------------------------- hop trellis: a pole, a top string and curtains of bines hung with pale green cones
  function hopPix(L, R, v) {
    return once(`ahop${+L}${+R}${v}`, () => {
      const p = new Pix(16, 52), HG = PA.hop, cols = [1, 4, 7, 10, 13].filter((x) => (x >= 6 || L) && (x <= 9 || R));
      for (const cx of cols) { if (cx === 7 && (L || R)) { /* the pole's own bine is drawn below */ }
        const len = 24 + Math.floor(hash(cx, v, 3) * 12);
        for (let y = 4; y < 4 + len; y++) { const x = cx + Math.round(Math.sin(y * 0.45 + cx + v) * 1.1); p.set(x, y, pick(HG, cl(0.3 + hash(x, y, 2) * 0.35 + (y < 12 ? 0.1 : 0)), x, y));
          if ((y + cx) % 4 === 0) { p.set(x - 1, y, pick(HG, 0.55 + hash(x, y, 3) * 0.3, x, y)); p.set(x + 1, y, pick(HG, 0.7, x, y)); p.set(x, y + 1, pick(HG, 0.4, x, y)); }
          if ((y + cx * 3) % 9 === 5) { p.set(x + 1, y + 1, pk('#d4e486')); p.set(x + 1, y + 2, pk('#b4c860')); p.set(x + 2, y + 1, pk('#e8f4a4')); p.set(x + 1, y + 3, pk('#98ac48')); } } }
      const xa = L ? 0 : 6, xb = R ? 15 : 9; for (let x = xa; x <= xb; x++) { p.set(x, 3, pk('#d8c8a0')); p.set(x, 4, pk('#8a7a58')); }
      for (let y = 2; y < 52; y++) { p.set(7, y, pick(PAL.wood, 0.68 - (y > 46 ? 0.1 : 0), 7, y)); p.set(8, y, pick(PAL.wood, 0.3, 8, y)); } p.set(7, 1, pick(PAL.wood, 0.8, 7, 1)); p.set(8, 1, pick(PAL.wood, 0.5, 8, 1));
      for (let k = 0; k < 8; k++) blob(p, 8 + (hash(k, v, 4) - 0.5) * 11, 48 + hash(k, v, 5) * 3, 2.6, HG, { seed: k + v, amb: 0.2, rimDark: 0.2 }); // the clump at the foot
      outline(p, 0.32); return canv(p);
    });
  }

  // ---------------------------------------------------------------- props
  function maypolePix(f) { // a hop pole: bines spiralling up it, orange / red / cream ribbons, a wheat sheaf on top
    return once('amay' + f, () => {
      const W = 48, H = 104, p = new Pix(W, H), cx = 24, top = 8, RIB = ['#e8602a', '#f0b030', '#f8f0d8', '#c8321c', '#f08c2c', '#fcd860', '#b83a1c', '#f8f0d8'];
      const ribbon = (i) => { const c = RIB[i], side = i % 2 ? 1 : -1, spread = 4 + Math.floor(i / 2) * 2.8 + (i % 3) * 0.9, ph = i * 0.9 + f * 2.1;
        for (let s = 0; s <= 80; s++) { const t = s / 80, x = Math.round(cx + side * spread * Math.pow(t, 0.8) + Math.sin(t * 6 + ph) * 1.6 * t), y = Math.round(top + 5 + t * 80 + Math.sin(t * 6 + ph + 1.7) * 0.8 * t); p.set(x, y, mix(pk(c), pk('#ffffff'), 0.25)); p.set(x + 1, y, dk(pk(c), 0.8)); } };
      for (const i of [0, 3, 4, 7]) ribbon(i);
      for (let y = top; y < 100; y++) for (let x = cx - 1; x <= cx + 1; x++) p.set(x, y, pick(PAL.wood, x === cx - 1 ? 0.78 : x === cx ? 0.5 : 0.22, x, y));
      for (let y = top + 4; y < 94; y++) { const x = Math.round(cx + Math.sin(y * 0.28) * 2.6), z = Math.cos(y * 0.28); if (z > -0.2) { p.set(x, y, pick(PA.hop, 0.45 + z * 0.3, x, y)); p.set(x + 1, y, pick(PA.hop, 0.3, x, y)); if (y % 7 === 0) { p.set(x - 1, y, pick(PA.hop, 0.8, 0, 0)); p.set(x + 2, y, pick(PA.hop, 0.7, 0, 0)); p.set(x + 1, y + 1, pk('#d4e486')); p.set(x + 1, y + 2, pk('#a8bc58')); } } }
      for (const i of [1, 2, 5, 6]) ribbon(i);
      for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, x = Math.round(cx + Math.cos(a) * 6), y = Math.round(top + 2 + Math.sin(a) * 2.2); p.set(x, y, k % 3 === 0 ? pk('#f8d848') : k % 3 === 1 ? pk('#e8602a') : pick(PA.hop, 0.6, 0, 0)); if (k % 2) { p.set(x, y + 1, pk('#d4e486')); p.set(x, y + 2, pk('#a8bc58')); } }
      for (let k = 0; k < 9; k++) { const a = (k - 4) * 0.34; for (let j = 0; j < 8; j++) p.set(Math.round(cx + Math.sin(a) * j * 1.5), top - 1 - Math.round(Math.cos(a) * j * 0.9), pick(PAL.gold, 0.5 + j * 0.06, 0, 0)); } // the wheat sheaf
      for (let y = 94; y < 101; y++) for (let x = cx - 3; x <= cx + 3; x++) p.set(x, y, pick(PAL.wood, 0.7 - (x - cx + 3) * 0.08 - (y === 100 ? 0.3 : 0), x, y));
      for (const [sx, sy] of [[cx - 9, 98], [cx + 6, 99], [cx - 5, 101], [cx + 9, 97]]) U.stoneBlob(p, sx, sy, 3.4, 1.8, PAL.dry, sx, 1);
      outline(p, 0.4); const c = canv(p); c.dx = -1; return c;
    });
  }
  function balesPix() {
    return once('abales', () => { const p = new Pix(32, 28);
      const bale = (cx, cy, r) => { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) { const dx = (x + 0.5 - cx), dy = (y + 0.5 - cy), d = Math.hypot(dx, dy); if (d > r) continue;
        const ring = Math.floor(d * 0.9) % 2; let v = 0.62 - dx * 0.025 - dy * 0.02 + (ring ? 0.1 : -0.04) + (hash(x, y, 3) - 0.5) * 0.14 - (d > r - 1.4 ? 0.2 : 0); if (d < 1.4) v = 0.3; p.set(x, y, pick(PA.straw, cl(v), x, y)); } };
      bale(8, 21, 7); bale(24, 21, 7); bale(16, 9, 7);
      outline(p, 0.4); return canv(p); });
  }
  function scarecrowPix() {
    return once('ascare', () => { const p = new Pix(22, 34);
      for (let y = 10; y < 33; y++) { p.set(10, y, pick(PAL.wood, 0.65, 10, y)); p.set(11, y, pick(PAL.wood, 0.3, 11, y)); }
      for (let x = 2; x < 20; x++) { p.set(x, 15, pick(PAL.wood, 0.7, x, 15)); p.set(x, 16, pick(PAL.wood, 0.35, x, 16)); }
      for (let y = 14; y < 26; y++) for (let x = 6; x < 16; x++) { const plaid = (x % 4 === 0 || y % 4 === 0), c = plaid ? pk('#8c2418') : pk('#c8462c'); p.set(x, y, x > 12 ? dk(c, 0.75) : c); }
      for (let y = 17; y < 20; y++) for (let x = 3; x < 6; x++) p.set(x, y, pk('#a8602c')); p.set(8, 21, pk('#4a6ab0')); p.set(12, 18, pk('#4a6ab0')); p.set(13, 18, pk('#4a6ab0')); p.set(12, 19, pk('#4a6ab0')); // patches
      for (const [sx, sy, dx] of [[1, 14, -1], [20, 14, 1], [10, 26, 0], [6, 25, -1], [15, 25, 1]]) for (let k = 0; k < 5; k++) p.set(sx + dx * (k % 3), sy + k - 1 + (dx ? 0 : 1), pick(PA.straw, 0.9 - k * 0.07, k, 0)); // straw poking out
      for (let y = 26; y < 33; y++) { for (const x0 of [6, 12]) for (let x = x0; x < x0 + 3; x++) p.set(x, y, pk(x === x0 ? '#5a6a8c' : '#3e4a68')); }
      for (let y = 3; y < 13; y++) for (let x = 5; x < 16; x++) { const dx = (x + 0.5 - 10.5) / 5.2, dy = (y + 0.5 - 8.5) / 4.6; if (dx * dx + dy * dy > 1) continue; p.set(x, y, pick(PAL.cloth, cl(0.62 - dx * 0.22 - dy * 0.1 + (hash(x, y, 2) - 0.5) * 0.1), x, y)); }
      p.set(8, 8, pk('#201008')); p.set(13, 8, pk('#201008')); for (let x = 8; x < 14; x++) p.set(x, 11 - (x === 8 || x === 13 ? 1 : 0) + (x > 8 && x < 13 ? 0 : 0), pk('#4a2c18')); p.set(10, 9, pk('#e8602a'));
      for (let x = 1; x < 21; x++) { const d = Math.abs(x - 10.5); const y = 5 + Math.round(d * 0.15); p.set(x, y, pick(PA.straw, 0.55 + (x < 10 ? 0.25 : -0.05), x, y)); p.set(x, y + 1, pick(PA.straw, 0.3, x, y)); if (d < 7) for (let k = 1; k < 4; k++) p.set(x, y - k, pick(PA.straw, 0.5 + k * 0.1 + (x < 10 ? 0.2 : 0), x, y - k)); }
      for (let x = 6; x < 15; x++) p.set(x, 4, pk('#a02818')); // hat band
      p.set(18, 13, pk('#101018')); p.set(19, 13, pk('#101018')); p.set(18, 12, pk('#101018')); p.set(19, 11, pk('#101018')); p.set(20, 12, pk('#e0a020')); // a crow on the arm
      outline(p, 0.4); return canv(p); });
  }
  function pumpkinsPix() { // baked into the ground
    const p = new Pix(32, 16);
    for (const [cx, cy, r, k] of [[8, 11, 5.5, 0], [19, 12, 6.5, 1], [27, 10, 4.2, 2], [13, 6, 4, 3]]) {
      for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) { const dx = (x + 0.5 - cx) / (r + 1), dy = (y + 0.5 - cy) / (r * 0.82), d = dx * dx + dy * dy; if (d > 1) continue;
        const rib = Math.abs(Math.sin(dx * 3.2 + k)) < 0.25; p.set(x, y, pick(PA.pumpkin, cl(0.62 - dx * 0.32 - dy * 0.3 + (rib ? -0.2 : 0) + (k === 3 ? 0.05 : 0)), x, y)); }
      p.set(Math.round(cx), Math.floor(cy - r * 0.82) - 1, pk('#3a5a1c')); p.set(Math.round(cx) + 1, Math.floor(cy - r * 0.82) - 2, pk('#58782a'));
    }
    for (let x = 1; x < 31; x++) if (hash(x, 3, 3) < 0.7) p.set(x, 14 + (hash(x, 4, 4) < 0.5 ? 0 : 1), pick(PA.hop, 0.3 + hash(x, 5, 5) * 0.4, x, 14));
    outline(p, 0.4); return p;
  }
  function pressPix() { // a cider press: oak cage of slats, a great screw with a capstan bar, a tub of golden juice, windfalls
    return once('apress', () => { const W = 56, H = 52, p = new Pix(W, H);
      for (let y = 36; y < 46; y++) for (let x = 4; x < 52; x++) p.set(x, y, pick(PAL.plank, y === 36 ? 0.85 : 0.5 - (y - 36) * 0.03 + (hash(x >> 3, y, 2) - 0.5) * 0.1 - ((x - 4) % 9 === 0 ? 0.2 : 0), x, y));
      for (const x of [6, 48]) for (let y = 44; y < 49; y++) for (let i = 0; i < 3; i++) p.set(x + i, y, pick(PAL.wood, i === 0 ? 0.5 : 0.2, x, y));
      for (let y = 16; y < 37; y++) for (let x = 15; x < 41; x++) { const u = (x - 15) / 25, slat = (x - 15) % 4; let v = 0.55 - u * 0.3 + (slat === 0 ? -0.3 : slat === 1 ? 0.12 : 0); if (y === 18 || y === 26 || y === 34) { p.set(x, y, pick(PAL.iron, 0.5 - u * 0.2, x, y)); continue; } if (slat === 3 && y > 20 && y < 34) v = 0.05; p.set(x, y, pick(PAL.wood, cl(v), x, y)); }
      for (let x = 14; x < 42; x++) for (let y = 14; y < 17; y++) p.set(x, y, pick(PAL.wood, y === 14 ? 0.9 : 0.5, x, y));
      for (const x of [10, 12, 42, 44]) for (let y = 12; y < 38; y++) p.set(x, y, pick(PAL.oakT, x % 2 ? 0.28 : 0.62, x, y));
      for (let x = 9; x < 46; x++) { p.set(x, 10, pick(PAL.oakT, 0.7, x, 10)); p.set(x, 11, pick(PAL.oakT, 0.34, x, 11)); }
      for (let y = 1; y < 15; y++) for (let x = 26; x < 30; x++) { const th = ((y * 2 + (x - 26)) % 5) === 0; p.set(x, y, pick(PAL.oakT, x === 26 ? 0.7 : x === 29 ? 0.2 : 0.45 - (th ? 0.25 : 0), x, y)); }
      for (let x = 6; x < 50; x++) { p.set(x, 5, pick(PAL.wood, 0.75, x, 5)); p.set(x, 6, pick(PAL.wood, 0.4, x, 6)); } for (const x of [5, 6, 49, 50]) for (let y = 3; y < 9; y++) p.set(x, y, pick(PAL.wood, x % 2 ? 0.8 : 0.45, x, y));
      for (let y = 38; y < 47; y++) for (let x = 2; x < 13; x++) { const dx = (x + 0.5 - 7.5) / 5.5, dy = (y + 0.5 - 42.5) / 4.8; if (dx * dx + dy * dy > 1) continue; p.set(x, y, y < 41 ? pick(PAL.gold, cl(0.7 - dx * 0.2 + (hash(x, y, 4) - 0.5) * 0.2), x, y) : pick(PAL.wood, cl(0.5 - dx * 0.25 - (y - 41) * 0.03), x, y)); } // tub of cider
      for (let k = 0; k < 4; k++) p.set(13 + k, 41 + (k > 1 ? 1 : 0), pick(PAL.gold, 0.8, 0, 0));
      for (const [cx, cy, c] of [[44, 43, '#d83a2a'], [48, 44, '#e8502e'], [46, 41, '#c8c840'], [51, 43, '#d83a2a'], [42, 46, '#e8a030']]) { p.set(cx, cy, pk(c)); p.set(cx + 1, cy, dk(pk(c), 0.75)); p.set(cx, cy + 1, dk(pk(c), 0.7)); p.set(cx + 1, cy + 1, dk(pk(c), 0.55)); p.set(cx, cy - 1, mix(pk(c), pk('#ffffff'), 0.4)); }
      outline(p, 0.4); const c = canv(p); c.dx = -0.2; return c; });
  }
  const archPost = (v) => once('aapost' + v, () => { const p = new Pix(16, 54);
    for (let y = 8; y < 54; y++) for (let i = 0; i < 6; i++) p.set(5 + i, y, pick(PAL.oakT, i < 2 ? 0.66 : i < 4 ? 0.42 : 0.2, 5 + i, y));
    for (let y = 8; y < 52; y++) { const x = 8 + Math.round(Math.sin(y * 0.3 + v * 3) * 3.2); p.set(x, y, pick(PA.hop, 0.5 + Math.sin(y * 0.3) * 0.2, x, y)); p.set(x + 1, y, pick(PA.hop, 0.35, x, y)); if (y % 6 === 0) { p.set(x - 1, y, pick(PA.hop, 0.8, 0, 0)); p.set(x + 2, y, pick(PA.hop, 0.7, 0, 0)); p.set(x + 1, y + 1, pk('#d4e486')); p.set(x + 1, y + 2, pk('#a8bc58')); } }
    for (let y = 0; y < 8; y++) for (let x = 4; x < 12; x++) { const e = x === 4 || x === 11 || y === 0 || y === 7; p.set(x, y, e ? pick(PAL.iron, 0.3, x, y) : pick(PAL.glow, cl(0.95 - Math.abs(x - 7.5) * 0.08 - y * 0.03), x, y)); } // a lantern atop
    outline(p, 0.4); return canv(p); });
  const archLintel = (w) => once('aalin' + w, () => { const W = (w + 2) * 16, p = new Pix(W, 30);
    for (let y = 2; y < 12; y++) for (let x = 0; x < W; x++) p.set(x, y, pick(PAL.oakT, y < 4 ? 0.7 : 0.42 - (y - 4) * 0.03, x, y));
    const bw = W - 18; for (let y = 3; y < 11; y++) for (let x = 9; x < 9 + bw; x++) p.set(x, y, x < 11 || x >= bw + 7 || y < 4 || y > 9 ? pick(PAL.gold, 0.8, x, y) : pick(PA.hop, 0.28 + (y - 4) * 0.03, x, y));
    const tw = txtW('HOPSEND'); txt(p, 'HOPSEND', Math.round(W / 2 - tw / 2), 4, pk('#f8f0c8'));
    for (let x = 2; x < W - 2; x++) { const sag = Math.round(Math.sin((x - 2) / (W - 4) * Math.PI) * 9), y = 12 + sag; p.set(x, y, pick(PA.hop, 0.4 + hash(x, 1, 1) * 0.4, x, y)); if (x % 3 === 0) { p.set(x, y + 1, pick(PA.hop, 0.6, 0, 0)); p.set(x, y - 1, pick(PA.hop, 0.7, 0, 0)); } if (x % 9 === 4) { p.set(x, y + 2, pk('#d4e486')); p.set(x, y + 3, pk('#a8bc58')); p.set(x + 1, y + 2, pk('#e8f4a4')); } }
    for (let k = 0; k < 4; k++) for (let j = 0; j < 8 + k * 2; j++) p.set(10 + k * 5 + (W - 40 > 0 ? 0 : 0), 12 + j, pick(PA.hop, 0.4 + (j % 3) * 0.2, 0, 0)); // hanging bines
    outline(p, 0.4); return canv(p); });
  const duckBob = (t, i) => Math.round(Math.sin(t * 2.2 + i * 1.7) * 0.4 * 16) / 16;

  // ---------------------------------------------------------------- buildings (sprites 8 px wider than the footprint each side; bottom = footprint bottom)
  const M = 8;
  const garland = (p, x0, x1, y, sag, seed) => { for (let x = x0; x <= x1; x++) { const yy = Math.round(y + Math.sin((x - x0) / (x1 - x0) * Math.PI) * sag); for (let j = 0; j < 3; j++) p.set(x, yy + j, pick(PA.hop, cl(0.3 + hash(x, j, seed) * 0.55), x, yy + j)); if ((x - x0) % 7 === 3) { p.set(x, yy + 3, pk('#d4e486')); p.set(x, yy + 4, pk('#a8bc58')); p.set(x + 1, yy + 3, pk('#e8f4a4')); } if ((x - x0) % 11 === 6) p.set(x, yy - 1, pk('#e8602a')); } };
  function growTree(p, cx, yb) { // an apple tree that has taken up residence in the roof
    for (let y = yb - 20; y <= yb; y++) for (let x = cx - 2; x <= cx + 2; x++) p.set(x, y, pick(PAL.bark, x < cx ? 0.6 : x === cx ? 0.4 : 0.2, x, y));
    for (const [x, y, r] of [[cx, yb - 29, 7], [cx - 8, yb - 24, 6], [cx + 8, yb - 24, 6], [cx, yb - 22, 8]]) blob(p, x, y, r, PA.leafG, { seed: x, rimDark: 0.3, jit: 0.2, amb: 0.1 });
    for (let i = 0; i < 9; i++) { const x = cx - 12 + Math.floor(hash(i, 1, 41) * 24), y = yb - 34 + Math.floor(hash(i, 2, 41) * 20); if (p.on(x, y)) { p.set(x, y, pk('#e8402e')); p.set(x + 1, y, pk('#b82420')); p.set(x, y + 1, pk('#a8201c')); p.set(x, y - 1, pk('#ffa090')); } }
    for (let x = cx - 6; x <= cx + 6; x++) for (let y = yb - 1; y <= yb + 1; y++) if (Math.abs(x - cx) + (y - yb + 1) * 2 < 7) p.set(x, y, pick(PAL.oakT, 0.08 + hash(x, y, 2) * 0.1, x, y));
  }
  function innPix(b) {
    return once(`ahb${b.x},${b.y}`, () => {
      const W = b.w * 16 + 2 * M, H = 136, p = new Pix(W, H), yB = H - 1, seed = 11, dc = M + b.door * 16 + 8, x0 = M, x1 = W - M - 1, upTop = yB - 60, jet = yB - 34, smoke = [];
      for (let y = yB - 5; y <= yB; y++) for (let x = x0; x <= x1; x++) p.set(x, y, masonryPx(x, y, yB - 5, seed, PA.stone, 9, 3));
      cob(p, x0, x1, yB - 31, yB - 6, seed); cob(p, x0 - 2, x1 + 2, upTop, jet - 1, seed + 1);
      oakRail(p, x0 - 3, x1 + 3, jet, 3); oakRail(p, x0 - 3, x1 + 3, upTop, 2); oakRail(p, x0, x1, yB - 7, 2); oakRail(p, x0, x1, yB - 32, 2);
      for (const x of [x0, x0 + 26, dc - 14, dc + 12, x1 - 26, x1 - 1]) oakPost(p, x - (x === x1 - 1 ? 1 : 0), yB - 30, yB - 6, 2);
      for (const x of [x0 - 2, x0 + 30, dc - 16, dc + 14, x1 - 30, x1]) oakPost(p, x - (x === x1 ? 1 : 0), upTop + 1, jet - 1, 2);
      braceLine(p, x0 + 1, upTop + 4, x0 + 26, jet - 4); braceLine(p, x1 - 2, upTop + 4, x1 - 28, jet - 4); braceLine(p, dc - 14, jet - 3, dc - 34, upTop + 5); braceLine(p, dc + 14, jet - 3, dc + 34, upTop + 5);
      for (const wx of [x0 + 12, dc - 5, x1 - 22]) lattice(p, wx, upTop + 9, 10, 14, { shut: PAL.green, seed: wx, box: wx !== dc - 5 });
      lattice(p, x0 + 10, yB - 27, 11, 13, { box: true, shut: PAL.green, seed: 3 }); lattice(p, x1 - 21, yB - 27, 11, 13, { box: true, shut: PAL.green, seed: 4 });
      doorAt(p, dc - 6, yB - 2, 12, 22, { frame: PAL.honey, wood: PAL.oakT, step: true });
      for (const lx of [dc - 12, dc + 11]) { p.set(lx, yB - 24, pick(PAL.iron, 0.4, 0, 0)); for (let y = yB - 23; y < yB - 18; y++) { p.set(lx, y, pick(PAL.glow, 0.95, 0, 0)); p.set(lx + 1, y, pick(PAL.glow, 0.65, 0, 0)); } }
      garland(p, x0 - 1, x1 + 1, jet + 3, 6, 5); garland(p, dc - 20, dc + 20, yB - 36, 4, 9);
      // the swinging sign: a golden sheaf of barley on a dark board, on an iron arm
      const sx = dc + 24; for (let x = sx; x < sx + 24; x++) p.set(x, upTop + 25, pick(PAL.iron, 0.5, x, 0)); for (let k = 0; k < 6; k++) p.set(sx + k, upTop + 26 + k, pick(PAL.iron, 0.5, 0, 0));
      for (let y = upTop + 28; y < upTop + 52; y++) for (let x = sx + 4; x < sx + 24; x++) { const e = x < sx + 6 || x > sx + 21 || y < upTop + 30 || y > upTop + 49; p.set(x, y, e ? pick(PAL.gold, 0.7 - (x > sx + 12 ? 0.2 : 0), x, y) : pick(PAL.green, 0.3 + (y - upTop) * 0.003, x, y)); }
      for (let k = -4; k <= 4; k++) for (let j = 0; j < 14; j++) { const x = sx + 14 + Math.round(k * j * 0.18), y = upTop + 47 - j; p.set(x, y, pick(PAL.gold, 0.55 + j * 0.03 + (k < 0 ? 0.15 : 0), 0, 0)); if (j > 6 && (j + k) % 2 === 0) p.set(x + 1, y, pick(PAL.gold, 0.95, 0, 0)); }
      for (let x = sx + 9; x < sx + 20; x++) p.set(x, upTop + 44, pk('#8a2418'));
      const R = tileRoof(p, { x0: 2, x1: W - 3, yR: 26, yE: upTop + 3, hx: 20, seed, R: PA.tile, moss: 0.15 }); eaveShadow(p, 4, W - 5, R.eave, 4);
      eyebrow(p, { cx: dc + 4, y: 52, w: 9, seed: seed + 2, R: PA.tile });
      smoke.push(chimney(p, W - 36, 16, 56, { lean: -1, w: 9, R: PA.brick })); smoke.push(chimney(p, 46, 20, 56, { lean: 1, w: 8, R: PA.brick }));
      growTree(p, 20, 50);
      rim(p, 0.42, 'tl'); const c = canv(p); c.dx = -M / 16; c.smoke = smoke; return c;
    });
  }
  function oastPix(b) { // a round brick kiln under a conical tile roof with a white cowl, between two low whitewashed wings
    return once(`ahb${b.x},${b.y}`, () => {
      const W = b.w * 16 + 2 * M, H = 100, p = new Pix(W, H), yB = H - 1, seed = 23, cx = W / 2, smoke = [], KR = 22, wallTop = yB - 40, coneTop = 17;
      // low whitewashed wings with hipped tile roofs
      for (const [a, z] of [[M, cx - KR + 3], [cx + KR - 3, W - M - 1]]) {
        for (let y = yB - 27; y <= yB; y++) for (let x = a; x <= z; x++) p.set(x, y, y > yB - 5 ? masonryPx(x, y, yB - 5, seed, PA.stone, 9, 3) : pick(PAL.wash, cl(0.78 + (fbm(x * 1.5, y * 1.5, seed) - 0.5) * 0.28 - (y > yB - 8 ? 0.1 : 0)), x, y));
        oakRail(p, a, z, yB - 28, 2); oakPost(p, a, yB - 27, yB - 5, 2); oakPost(p, z - 1, yB - 27, yB - 5, 2);
        const rr = tileRoof(p, { x0: a - 3, x1: z + 3, yR: yB - 44, yE: yB - 25, hx: 8, seed: seed + a, R: PA.tile, moss: 0.2, ch: 3, tw: 4 }); eaveShadow(p, a - 2, z + 2, rr.eave, 3);
      }
      lattice(p, M + 4, yB - 21, 7, 9, { shut: PAL.green, box: true, seed: 1 }); lattice(p, W - M - 11, yB - 21, 7, 9, { shut: PAL.green, box: true, seed: 2 });
      // the kiln drum: brick laid in curving courses, lit from the left
      for (let y = wallTop; y <= yB; y++) for (let x = cx - KR; x < cx + KR; x++) {
        const u = (x + 0.5 - cx) / KR, row = Math.floor((yB - y) / 3), ry = (yB - y) % 3, bx = Math.floor((x + row * 3 + Math.round(u * u * 3)) / 6), bu = (x + row * 3 + 600) % 6; let v = 0.62 - u * 0.4 + (hash(bx, row, seed) - 0.5) * 0.22 - u * u * 0.18;
        if (ry === 2 || bu === 0) v -= 0.2; else if (ry === 0) v += 0.07; if (y > yB - 5) v -= 0.12; if (vnoise(x, y * 0.6, 6, seed + 4) > 0.8 && y > wallTop + 18) v -= 0.14;
        p.set(x, y, pick(PA.brick, cl(v, 0.04, 0.95), x, y));
      }
      for (let y = wallTop; y < wallTop + 3; y++) for (let x = cx - KR; x < cx + KR; x++) p.set(x, y, pick(PAL.wash, y === wallTop ? 0.95 : 0.6 - (x - cx) * 0.004, x, y)); // whitewashed band under the eaves
      doorAt(p, cx - 6, yB - 2, 12, 22, { frame: PAL.plaster, wood: PAL.oakT, step: true });
      lattice(p, cx - 17, yB - 36, 5, 8, {}); lattice(p, cx + 12, yB - 36, 5, 8, {});
      // the cone: tile courses wrapped round it, an eave that overhangs the drum
      for (let y = coneTop; y <= wallTop + 2; y++) { const t = (y - coneTop) / (wallTop + 2 - coneTop), hw = 3.4 + (KR + 3 - 3.4) * Math.pow(t, 1.18);
        for (let x = Math.floor(cx - hw); x < cx + hw; x++) { const u = (x + 0.5 - cx) / hw, k = Math.floor((wallTop + 2 - y) / 4), j = (wallTop + 2 - y) % 4, tw = 4, xs = x + (k & 1) * 2, ti = Math.floor(xs / tw), tu = ((xs % tw) + tw) % tw;
          let v = 0.55 - u * 0.4 + (hash(ti, k, seed) - 0.5) * 0.24 - u * u * 0.12; if (j === 3) v -= 0.24; else if (j === 0) v += 0.08; if (tu === 0) v -= 0.12; if (y >= wallTop) v -= 0.25; if (Math.abs(u) > 0.9) v -= 0.1;
          p.set(x, y, pick(PA.tile, cl(v, 0.04, 0.95), x, y)); } }
      for (let x = cx - KR - 2; x < cx + KR + 2; x++) for (let k = 1; k <= 4; k++) { const c = p.get(x, wallTop + 2 + k); if (cA(c) === 255 && k > 0) p.set(x, wallTop + 2 + k, dk(c, 0.6 + k * 0.08)); }
      // the white cowl on top: a bonnet that turns to face the wind, with a dark mouth, and a vane
      for (let x = cx - 8; x <= cx + 7; x++) { const top = Math.round(7 - (x - (cx - 8)) * 0.25), bot = 16; for (let y = top; y <= bot; y++) { const u = (x - cx + 0.5) / 8; let v = 0.82 - u * 0.25 - (y - top) * 0.012; if (y === top) v += 0.15; if (y === bot) v -= 0.3; p.set(x, y, pick(PAL.cloth, cl(v, 0.15, 1), x, y)); } }
      for (let y = 6; y <= 16; y++) for (let x = cx + 7; x < cx + 10; x++) { const top = Math.round(7 - 15 * 0.25) + (x - cx - 7); if (y >= top + 2) p.set(x, y, x === cx + 9 ? pick(PAL.cloth, 0.4, x, y) : pick(PAL.iron, 0.1, x, y)); }
      for (let y = 9; y < 15; y += 2) for (let x = cx - 6; x < cx + 5; x++) p.set(x, y, pick(PAL.cloth, 0.45, x, y));
      for (let y = 0; y < 5; y++) p.set(cx - 2, y, pick(PAL.iron, 0.5, 0, 0)); for (let k = 0; k < 6; k++) p.set(cx - 2 + k, 1 + (k > 3 ? 1 : 0), pick(PAL.iron, 0.55, 0, 0)); p.set(cx + 4, 0, pk('#e8602a')); p.set(cx + 4, 2, pk('#e8602a'));
      for (let x = cx - 9; x <= cx + 8; x++) p.set(x, 17, pick(PAL.iron, 0.3, x, 17)); // the collar
      climber(p, M - 1, yB - 28, 12, 24, 7); garland(p, cx - 26, cx + 26, wallTop + 7, 3, 7);
      smoke.push([cx + 2, 1]);
      rim(p, 0.42, 'tl'); const c = canv(p); c.dx = -M / 16; c.smoke = smoke; return c;
    });
  }
  function smithPix(b) { // a brick forge with a tall stack, and a lean-to tin shed with corrugated iron
    return once(`ahb${b.x},${b.y}`, () => {
      const W = b.w * 16 + 2 * M, H = 128, p = new Pix(W, H), yB = H - 1, seed = 31, dc = M + b.door * 16 + 8, smoke = [], fX1 = 78;
      // the tin shed on the right: open front, tools hanging in the dark, a corrugated roof sloping down to the right
      for (let y = yB - 34; y <= yB; y++) for (let x = fX1 - 4; x < W - M; x++) p.set(x, y, pick(PAL.timber, 0.06 + (y - yB + 34) * 0.002 + hash(x, y, 2) * 0.04, x, y));
      for (const x of [fX1 - 4, fX1 + 20, W - M - 3]) oakPost(p, x, yB - 36, yB, 3);
      for (let x = fX1 + 2; x < W - M - 4; x += 5) for (let y = yB - 26; y < yB - 14; y++) if (hash(x, 1, 3) < 0.5) p.set(x, y, pick(PAL.iron, 0.55, x, y)); // hanging tongs and hammers
      for (let k = 0; k < 7; k++) { p.set(fX1 + 8 + k, yB - 14, pick(PAL.iron, 0.6, 0, 0)); }
      for (let y = yB - 6; y < yB; y++) for (let x = fX1 + 4; x < fX1 + 14; x++) p.set(x, y, pick(PAL.iron, 0.2 + (y === yB - 6 ? 0.2 : 0), x, y)); // anvil block
      for (let x = fX1 + 24; x < W - M - 5; x++) for (let y = yB - 10; y < yB; y++) { const o = Math.floor((x - fX1 - 24) / 5); p.set(x, y, pick(PAL.wood, 0.5 - ((x - fX1 - 24) % 5 === 0 ? 0.22 : 0) + (y === yB - 10 ? 0.2 : 0) + (hash(o, 2, 2) - 0.5) * 0.1, x, y)); } // stacked barrels
      for (let x = fX1 - 6; x <= W - 3; x++) { const yy = Math.round(yB - 46 + (x - (fX1 - 6)) * 0.12), top = yy; for (let y = top; y < top + 13; y++) { const rib = ((x + 2) % 5), v = 0.62 + (rib < 2 ? 0.16 : rib === 4 ? -0.18 : 0) - (y - top) * 0.012 - (x > W - 20 ? 0.08 : 0) + (hash(x, y >> 2, 4) - 0.5) * 0.06; p.set(x, y, pick(PA.tin, cl(v), x, y)); } for (let x2 = x; x2 === x; x2++) p.set(x, top + 13, pick(PA.tin, 0.12, x, 0)); }
      // the brick forge block
      for (let y = yB - 44; y <= yB; y++) for (let x = M; x < fX1; x++) { const row = Math.floor((yB - y) / 3), bx = Math.floor((x + row * 3) / 7), bu = (x + row * 3) % 7, ry = (yB - y) % 3; let v = 0.58 + (hash(bx, row, seed) - 0.5) * 0.3 - (x - M) * 0.002; if (ry === 2 || bu === 0) v -= 0.2; if (y > yB - 5) v -= 0.1; if (vnoise(x, y * 0.5, 7, seed + 2) > 0.7 && y < yB - 24) v -= 0.14; p.set(x, y, pick(PA.brick, cl(v, 0.04, 0.95), x, y)); }
      oakRail(p, M, fX1 - 1, yB - 46, 3);
      doorAt(p, dc - 6, yB - 2, 12, 22, { frame: PAL.stone, wood: PAL.oakT, step: true });
      const fx = 14, fw = 20, fy = yB - 22; for (let y = fy; y < yB - 2; y++) for (let x = M + fx; x < M + fx + fw; x++) { const dx = x + 0.5 - (M + fx + fw / 2), top = fy + 7 - Math.sqrt(Math.max(0, 10 * 10 - dx * dx)) * 0.7; if (y < top) continue; const u = Math.hypot(dx / 10, (y - (yB - 8)) / 12); p.set(x, y, u < 0.85 ? pick(PAL.glow, cl(0.9 - u * 0.5 + (hash(x, y, 3) - 0.5) * 0.12), x, y) : pick(PAL.oakT, 0.05, x, y)); } // glowing forge mouth
      for (let x = M + fx - 3; x < M + fx + fw + 3; x++) for (let j = 0; j < 3; j++) p.set(x, fy - 2 + j, pick(PA.stone, 0.8 - j * 0.15, x, 0));
      lattice(p, M + 38, yB - 26, 8, 11, { shut: PAL.red, seed: 5 });
      // a horseshoe over the door and an iron anvil sign
      for (let a = 0; a < 7; a++) { const ang = a / 6 * Math.PI - 0.4; p.set(dc + Math.round(Math.cos(ang) * 4), yB - 30 + Math.round(Math.sin(ang) * 4), pick(PAL.iron, 0.7, 0, 0)); }
      const R = tileRoof(p, { x0: M - 3, x1: fX1 + 3, yR: 28, yE: yB - 42, hx: 14, seed, R: PA.tile, moss: 0.15 }); eaveShadow(p, M - 2, fX1 + 2, R.eave, 4);
      // the stack: tall, tapering, with a flared hood
      for (let y = 4; y <= 70; y++) { const t = (y - 4) / 66, hw = 5 + t * 2.2, ccx = M + 24; for (let x = Math.floor(ccx - hw); x <= ccx + hw - 0.5; x++) { const u = (x + 0.5 - ccx) / hw, row = Math.floor(y / 3), bu = (x + row * 3 + 300) % 6; let v = 0.62 - u * 0.35 + (hash(Math.floor((x + row * 3) / 6), row, seed + 8) - 0.5) * 0.2 - (y < 16 ? 0.3 - y * 0.015 : 0); if (y % 3 === 2 || bu === 0) v -= 0.2; p.set(x, y, pick(PA.brick, cl(v, 0.03, 0.95), x, y)); } }
      for (let x = M + 17; x <= M + 31; x++) for (let j = 0; j < 3; j++) p.set(x, 2 + j, pick(PA.stone, 0.85 - j * 0.2, x, 0));
      smoke.push([M + 24, 0]);
      rim(p, 0.42, 'tl'); const c = canv(p); c.dx = -M / 16; c.smoke = smoke; return c;
    });
  }
  function barnPix(b) { // a weatherboard barn: big doors, a hay-loft door with a hoist beam, shingle roof
    return once(`ahb${b.x},${b.y}`, () => {
      const W = b.w * 16 + 2 * M, H = 104, p = new Pix(W, H), yB = H - 1, seed = 41, cx = W / 2, smoke = [], wTop = yB - 52, apex = 6;
      for (let y = apex; y <= yB; y++) { const hw = y < wTop ? (cx - 6) * ((y - apex) / (wTop - apex)) ** 0.9 + 3 : cx - M + 1; for (let x = Math.floor(cx - hw); x < cx + hw; x++) { const bi = Math.floor((x - 2) / 5), bu = (x - 2) % 5; let v = 0.55 + (hash(bi, 2, seed) - 0.5) * 0.18 - (x - cx) * 0.003 + (vnoise(x * 0.6, y, 8, seed) - 0.5) * 0.14; if (bu === 0) v -= 0.22; if (y > yB - 5) v -= 0.12; if (y < wTop && Math.abs(x + 0.5 - cx) > hw - 3) v = 0.8 - (x < cx ? 0 : 0.35); p.set(x, y, pick(PA.barn, cl(v, 0.03, 0.95), x, y)); } }
      for (let y = apex - 1; y < wTop; y++) { const hw = (cx - 6) * ((y - apex) / (wTop - apex)) ** 0.9 + 3; for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const x = Math.round(cx + s * (hw + k - 1)); p.set(x, y + 1, pick(PAL.timber, k < 2 ? (s < 0 ? 0.55 : 0.3) : 0.1, x, y)); if (y % 4 === 0) p.set(x, y + 1, pick(PAL.timber, 0.15, x, y)); } } // shingle edges of the roof
      for (let x = M - 2; x <= W - M + 1; x++) { p.set(x, wTop, pick(PAL.timber, 0.7, x, 0)); p.set(x, wTop + 1, pick(PAL.timber, 0.3, x, 0)); }
      for (const x of [M, W - M - 2, cx - 17, cx + 15]) oakPost(p, x, wTop + 1, yB - 4, 2);
      // the hay loft: an open door with hay and a hoist beam
      const lx = cx - 9, ly = wTop - 28; for (let y = ly; y < ly + 24; y++) for (let x = lx; x < lx + 18; x++) { const e = x < lx + 2 || x >= lx + 16 || y < ly + 2; p.set(x, y, e ? pick(PAL.wash, 0.8 - (x > cx ? 0.3 : 0), x, y) : pick(PAL.timber, 0.04, x, y)); }
      for (let y = ly + 12; y < ly + 24; y++) for (let x = lx + 2; x < lx + 16; x++) { const top = ly + 14 + Math.round(Math.sin(x * 0.9) * 1.6) + (x - lx) * 0.2; if (y >= top) p.set(x, y, pick(PA.straw, cl(0.55 + (y - top) * 0.04 + (hash(x, y, 3) - 0.5) * 0.35), x, y)); }
      for (let k = 0; k < 14; k++) { const x = lx + 2 + Math.floor(hash(k, 1, 6) * 14), y = ly + 21 + Math.floor(hash(k, 2, 6) * 6); for (let j = 0; j < 4; j++) p.set(x + (k & 1 ? j : -j), y + j, pick(PA.straw, 0.85, 0, 0)); } // hay spilling out
      for (let x = lx - 2; x < lx + 24; x++) { p.set(x, ly - 7, pick(PAL.oakT, 0.66, x, 0)); p.set(x, ly - 6, pick(PAL.oakT, 0.3, x, 0)); } for (let y = ly - 6; y < ly + 3; y++) p.set(lx + 21, y, pick(PAL.oakT, 0.5, 0, y));
      for (let y = ly - 5; y < ly + 14; y++) p.set(lx + 22, y, pk('#c8b890')); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (Math.hypot(x - 1.5, y - 1.5) < 2) p.set(lx + 20 + x, ly - 9 + y, pick(PAL.iron, 0.5, 0, 0)); // the rope and pulley
      for (let y = ly + 13; y < ly + 17; y++) for (let x = lx + 20; x < lx + 25; x++) p.set(x, y, pick(PA.straw, 0.7 + (x - lx - 20) * 0.04, x, y)); // a bale on the rope
      // the great doors with their white X-braces, and the wicket door in the middle
      for (const [a, z] of [[M + 5, cx - 1], [cx + 1, W - M - 6]]) for (let y = yB - 40; y < yB - 3; y++) for (let x = a; x < z; x++) { const xr = x - a, w2 = z - a, brace = Math.abs((xr * (37 / w2)) - (y - yB + 40)) < 1.2 || Math.abs(((w2 - xr) * (37 / w2)) - (y - yB + 40)) < 1.2, fr = xr < 2 || xr >= w2 - 2 || y < yB - 38 || y > yB - 6;
        p.set(x, y, fr || brace ? pick(PAL.wash, 0.72 - (x > cx ? 0.25 : 0), x, y) : pick(PAL.timber, 0.24 + hash(x >> 2, 1, 3) * 0.1 - ((x - a) % 4 === 0 ? 0.12 : 0), x, y)); }
      doorAt(p, cx - 6, yB - 2, 12, 20, { frame: PAL.wash, wood: PAL.oakT, step: false });
      lattice(p, M + 11, wTop - 10, 6, 8, {}); lattice(p, W - M - 17, wTop - 10, 6, 8, {});
      // a weathervane rooster on the apex
      for (let y = 0; y < 8; y++) p.set(cx, y, pick(PAL.iron, 0.55, 0, 0)); for (let k = 0; k < 5; k++) p.set(cx - 3 + k, 1 + (k > 2 ? 0 : 1), pick(PAL.iron, 0.6, 0, 0)); p.set(cx + 2, 0, pk('#e8602a'));
      rim(p, 0.42, 'tl'); const c = canv(p); c.dx = -M / 16; c.smoke = smoke; return c;
    });
  }
  function cottagePix(b) { // the beekeeper's: cream plaster, a golden thatch roof, skeps by the door
    return once(`ahb${b.x},${b.y}`, () => {
      const W = b.w * 16 + 2 * M, H = 108, p = new Pix(W, H), yB = H - 1, seed = 53, dc = M + b.door * 16 + 8, smoke = [], wallTop = yB - 31;
      cob(p, M, W - M - 1, wallTop, yB - 6, seed); for (let y = yB - 5; y <= yB; y++) for (let x = M; x < W - M; x++) p.set(x, y, masonryPx(x, y, yB - 5, seed + 1, PA.stone, 9, 3));
      oakRail(p, M, W - M - 1, wallTop + 1, 2); oakRail(p, M, W - M - 1, yB - 8, 2); for (const x of [M, 30, W - M - 30, W - M - 2]) oakPost(p, x, wallTop + 1, yB - 7);
      lattice(p, M + 6, yB - 24, 9, 11, { box: true, shut: PAL.green, seed: 2 }); lattice(p, W - M - 15, yB - 24, 9, 11, { box: true, shut: PAL.green, seed: 3 });
      doorAt(p, dc - 5, yB - 2, 11, 20, { frame: PAL.honey, wood: PAL.oakT, step: true });
      climber(p, W - M - 12, yB - 30, 12, 24, 5);
      // two straw skeps on a bench, bees about them
      for (const bx of [M + 2, M + 20]) { for (let x = bx; x < bx + 15; x++) for (let j = 0; j < 3; j++) p.set(x, yB - 8 + j, pick(PAL.wood, j === 0 ? 0.8 : 0.4, x, 0)); }
      for (const hx of [M + 4, M + 11, M + 22]) { for (let y = yB - 17; y < yB - 8; y++) { const t = (y - yB + 17) / 9, hw = 2 + 3.2 * Math.sin(Math.min(1, t * 1.2) * 1.5); for (let x = Math.floor(hx + 3.5 - hw); x < hx + 3.5 + hw; x++) p.set(x, y, pick(PA.straw, cl(0.6 - (x - hx) * 0.05 + ((y - yB) % 3 === 0 ? -0.2 : 0)), x, y)); } p.set(hx + 3, yB - 10, pk('#1a1008')); }
      const R = thatch(p, { x0: 2, x1: W - 3, yR: 30, yE: wallTop + 3, hx: 13, sag: 2, hem: 7, seed, R: PAL.thatchG, moss: 0.35 }); eaveShadow(p, 4, W - 5, R.eave, 4);
      eyebrow(p, { cx: dc, y: 52, w: 8, seed: seed + 2, R: PAL.thatchG });
      smoke.push(chimney(p, W - 30, 22, 52, { lean: 1, w: 8, R: PA.brick }));
      rim(p, 0.42, 'tl'); const c = canv(p); c.dx = -M / 16; c.smoke = smoke; return c;
    });
  }
  const BUILD = { hop_inn: innPix, hop_shop: oastPix, hop_smith: smithPix, hop_farm: barnPix, hop_bees: cottagePix };

  // ---------------------------------------------------------------- ground decoration
  const PSH = {
    maypole: (S, pr) => { const X = pr.x * 16, Y = pr.y * 16; shEll(S, X + 9, Y + 14, 11, 3); for (let k = 0; k < 18; k++) shRect(S, X + 10 + k, Y - 70 + k * 3.5, 1, 6); },
    press: (S, pr) => { const X = pr.x * 16, Y = pr.y * 16; shEll(S, X + 26, Y + 30, 24, 3.5); for (let k = 0; k < 8; k++) shRect(S, X + 50 + k, Y + 6 + k, 1, 22 - k); },
    haystack: (S, pr) => { const X = pr.x * 16, Y = pr.y * 16; shEll(S, X + 18, Y + 29, 15, 3.5); for (let k = 0; k < 10; k++) shRect(S, X + 28 + k, Y + 8 + k, 1, 20 - k); },
    hives: (S, pr) => shRect(S, pr.x * 16 + 2, pr.y * 16 + 15, 50, 2),
    scarecrow: (S, pr) => shEll(S, pr.x * 16 + 11, pr.y * 16 + 14, 6, 2),
    bales: (S, pr) => shEll(S, pr.x * 16 + 18, pr.y * 16 + 14, 14, 2.5),
    lamp: (S, pr) => shEll(S, pr.x * 16 + 11, pr.y * 16 + 14, 5, 2),
  };
  function decorate(m, S) {
    const { P, O, W, H } = S, base = m.base, at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '' : base[y][x]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = base[y][x];
      if (c === '#' && at(x, y + 1) !== '#' && at(x, y + 1) !== '') shRect(S, x * 16, (y + 1) * 16, 16, 4);
      if (c === 'T') shEll(S, x * 16 + 12, y * 16 + 13, 12, 5); else if (c === 'a' || c === 'e') shEll(S, x * 16 + 11, y * 16 + 13, 9, 4); else if (c === 'k') shEll(S, x * 16 + 9, y * 16 + 14, 9, 2.5);
      if (c === 'h' && at(x, y + 1) !== 'h') shRect(S, x * 16 + 1, (y + 1) * 16, 15, 2);
    }
    for (const b of m.buildings || []) { const R0 = (b.x + b.w) * 16; for (let k = 0; k < 10; k++) shRect(S, R0 + k, b.y * 16 + 6 + k, 1, b.h * 16 - 6 - k); shRect(S, b.x * 16 + 2, (b.y + b.h) * 16, b.w * 16 - 2, 1); }
    for (const pr of m.props || []) { PSH[pr.k]?.(S, pr); if (PROPS[pr.k]) shEll(S, pr.x * 16 + propPix(pr.k).w / 2 + 3, pr.y * 16 + 14, propPix(pr.k).w / 2 - 1, 2.5); }
    // leaf litter under every tree: a ring of fallen leaves in the tree's own colours
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = base[y][x]; if (c !== 'T' && c !== 'a' && c !== 'e') continue;
      const cols = c === 'T' ? [PA.leafO, PA.leafR, PA.leafY][Math.floor(hash(x, y, 1) * 3) % 3] : c === 'a' ? PA.leafY : PA.pearL;
      for (let k = 0; k < 16; k++) { const a = hash(x, y, k + 60) * 6.283, r = 6 + hash(x, y, k + 90) * 11, px = O + x * 16 + 8 + Math.cos(a) * r * 1.1, py = O + y * 16 + 12 + Math.sin(a) * r * 0.5; P.set(px, py, cols[3 + Math.floor(hash(x, y, k) * 3)]); P.set(px + 1, py, cols[2]); if (c === 'a' && hash(x, y, k + 7) < 0.3) { P.set(px, py + 1, pk('#d83a2a')); P.set(px + 1, py + 1, pk('#8a1c1c')); } } } // windfall apples
    const hm = new Set(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (base[y][x] === 'h') for (const [ox, oy] of [[4, 5], [12, 5], [8, 3], [4, 11], [12, 11], [8, 9]]) blob(P, O + x * 16 + ox + (hash(x, y, ox) - 0.5) * 2, O + y * 16 + oy, 5, PA.hedge, { seed: x * 7 + y, rimDark: 0.25, mask: hm, amb: 0.15 });
    edgeMask(P, hm, PA.hedge[0]);
    for (const i of hm) { const x = i % P.w, y = (i / P.w) | 0, h = hash(x, y, 41); if (h < 0.06) P.d[i] = pk('#d8382c'); else if (h < 0.1) P.d[i] = pk('#f09030'); else if (h < 0.13) P.d[i] = pk('#f4cc40'); }
    const MUM = ['#e8782a', '#f0b030', '#c83a2c', '#f8f0d8', '#a8406a', '#e8602c', '#f8d048'].map(pk);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (base[y][x] === 'w') {
      for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const px = O + x * 16 + i, py = O + y * 16 + j; P.set(px, py, pick(PAL.mud, 0.22 + hash(px, py, 1) * 0.3, px, py)); }
      for (let k = 0; k < 8; k++) blob(P, O + x * 16 + 2 + hash(x * 9 + k, y, 1) * 12, O + y * 16 + 4 + hash(x * 9 + k, y, 2) * 10, 2.9, PA.hedge, { seed: k + x });
      for (let k = 0; k < 11; k++) { const cx = Math.floor(O + x * 16 + 2 + hash(x * 13 + k, y, 3) * 12), cy = Math.floor(O + y * 16 + 3 + hash(x * 13 + k, y, 4) * 10), fc = MUM[(x * 3 + y + k * 2) % MUM.length];
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (Math.abs(i) + Math.abs(j) < 3) P.set(cx + i, cy + j, i + j < 0 ? pk('#ffffff') === fc ? fc : mix(fc, pk('#ffffff'), 0.25) : i + j > 0 ? dk(fc, 0.72) : fc); P.set(cx, cy, mix(fc, pk('#fff4a0'), 0.5)); }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (base[y][x] === 'f') {
      const L = at(x - 1, y) === 'f', Rt = at(x + 1, y) === 'f', X = O + x * 16, Y = O + y * 16, R = PAL.wood;
      const rail = (yy) => { for (let i = L ? 0 : 7; i <= (Rt ? 15 : 8); i++) { P.set(X + i, Y + yy, pick(R, 0.78, X + i, Y + yy)); P.set(X + i, Y + yy + 1, pick(R, 0.4, X + i, Y + yy)); P.set(X + i, Y + yy + 2, pick(R, 0.08, X + i, Y + yy)); S.SH[(Y + yy + 3) * S.GW + X + i] = 1; } };
      if (L || Rt) { rail(5); rail(10); }
      for (let j = 2; j < 15; j++) for (let i = 6; i < 10; i++) P.set(X + i, Y + j, pick(R, j === 2 ? 0.95 : i === 6 ? 0.7 : i === 9 ? 0.15 : 0.45 - j * 0.01, X + i, Y + j));
      P.set(X + 5, Y + 3, pick(R, 0.08, 0, 0)); P.set(X + 10, Y + 3, pick(R, 0.08, 0, 0)); for (let i = 6; i < 10; i++) P.set(X + i, Y + 1, pick(R, 0.08, 0, 0));
    }
    for (const pr of m.props || []) { if (pr.k === 'pumpkins') P.blit(pumpkinsPix(), O + pr.x * 16, O + pr.y * 16); else if (PROPS[pr.k]) P.blit(propPix(pr.k), O + pr.x * 16, O + pr.y * 16); }
    // reeds along the pond's near bank
    if (S.WF) for (let gy = 0; gy * 6 < S.GH; gy++) for (let gx = 0; gx * 8 < S.GW; gx++) { const px = gx * 8 + Math.floor(hash(gx, gy, 201) * 8), py = gy * 6 + Math.floor(hash(gx, gy, 202) * 6), w = S.WF[py * S.GW + px] || 0;
      if (w > 0.4 && w < 0.5 && hash(gx, gy, 203) < 0.5) { const top = 5 + Math.floor(hash(gx, gy, 204) * 5); for (let j = 0; j < top; j++) P.set(px + (j > top * 0.7 ? 1 : 0), py - j, pick(PAL.olive, 0.4 + j * 0.05, px, py)); if (hash(gx, gy, 205) < 0.5) { for (let j = top - 2; j <= top; j++) { P.set(px + 1, py - j, pk('#6a3c1c')); P.set(px + 2, py - j, pk('#4a2810')); } } } }
  }

  // ---------------------------------------------------------------- animated water: a teal stream-pond with drifting leaves and ripples (64x64, tileable)
  function waterPix(kind, f) {
    const p = new Pix(64, 64), R = PA.water, ph = (f / 8) * 64;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const a = vnoise(x + ph, y * 2.2, 16, 3, 64), b = vnoise(x - ph, y * 2.2 + 9, 16, 5, 64), c = vnoise(x, y, 32, 7, 64); let v = 0.42 + (a + b - 1) * 0.4 + (c - 0.5) * 0.25;
      const crest = Math.abs(a - b); if (crest < 0.035 && a > 0.55) v += 0.32; else if (crest < 0.06 && a < 0.4) v -= 0.1;
      p.set(x, y, pick(R, cl(v, 0, 0.86), x, y));
    }
    for (let i = 0; i < 9; i++) { const x = Math.floor(hash(i, f >> 1, 77) * 62), y = Math.floor(hash(i, f >> 1, 78) * 62); if (hash(i, f, 79) < 0.6) { p.set(x, y, R[9]); p.set(x + 1, y, R[8]); p.set(x - 1, y, R[7]); } }
    for (let i = 0; i < 7; i++) { const x = Math.floor(hash(i, 3, 90) * 64 + f * (0.5 + hash(i, 4, 90))) % 64, y = Math.floor(hash(i, 5, 90) * 62), c = LC[i % LC.length]; p.set(x, y, c); p.set((x + 1) % 64, y, c); p.set((x + 1) % 64, y + 1, dk(c, 0.7)); } // drifting leaves
    return p;
  }

  // ---------------------------------------------------------------- the draw hooks
  function mapObjects(m, t, out) {
    for (const b of m.buildings || []) {
      const img = (BUILD[b.to] || innPix)(b), bx = b.x + (img.dx || 0), by = b.y + b.h - img.height / 16;
      out.push({ img, x: bx, y: by, z: 1, sy: b.y + b.h });
      for (const [i, [sx, sy]] of (img.smoke || []).entries()) for (let n = 0; n < 3; n++) { const u = (t * 0.3 + n / 3 + (b.x + i * 7) * 0.13) % 1, k = Math.min(4, Math.floor(u * 5)); out.push({ img: puffPix(k), x: bx + sx / 16 - 0.375 + u * 0.55 + Math.sin(u * 5 + b.x + i) * 0.12, y: by + sy / 16 - 0.4 - u * 1.4, z: 2 }); }
    }
    for (const pr of m.props || []) {
      const { k, x, y } = pr;
      if (k === 'lamp') out.push({ img: lampPix(Math.floor(t * 3 + x) % 5 === 0 ? 1 : 0, false), x, y: y + 1 - 42 / 16, z: 1, sy: y + 1 });
      else if (k === 'maypole') putSprite(out, maypolePix(Math.floor(t * 2.2) % 3), x, y + 1.02);
      else if (k === 'haystack') putSprite(out, haystackPix(), x - 0.1, y + 2);
      else if (k === 'hives') { putSprite(out, hivesPix(), x - 0.1, y + 1);
        for (const [i, hx] of [8, 22, 36].entries()) for (let n = 0; n < 3; n++) { const a = t * (2.2 + n * 0.7) + i * 2 + n * 1.9, bx = x - 0.1 + (hx + 7) / 16 + Math.cos(a) * 0.55, by = y + 0.55 + Math.sin(a * 1.3) * 0.35;
          out.push({ x: bx, y: by, w: 1, h: 1, z: 2, draw: (ctx, X, Y, TS) => { const u = TS / 16; ctx.fillStyle = '#2a1a08'; ctx.fillRect(Math.round(X), Math.round(Y), Math.round(2 * u), Math.round(u)); ctx.fillStyle = '#f0c030'; ctx.fillRect(Math.round(X + u), Math.round(Y - u * 0.5), Math.round(u), Math.round(u)); } }); } }
      else if (k === 'bales') putSprite(out, balesPix(), x, y + 1);
      else if (k === 'scarecrow') putSprite(out, scarecrowPix(), x - 0.15, y + 1);
      else if (k === 'press') putSprite(out, pressPix(), x, y + 2);
      else if (k === 'arch') { const w = pr.w || 2; for (const px of [x - 1, x + w]) putSprite(out, archPost(px & 1), px, y + 2); out.push({ img: archLintel(w), x: x - 1, y: y - 0.75, z: 2 }); }
      else if (k === 'fowl') for (let i = 0; i < (pr.n || 2); i++) { const a = t * 0.32 + i * Math.PI + (pr.ph || 0), fx = x + Math.cos(a) * pr.rx, fy = y + Math.sin(a) * pr.ry, right = Math.sin(a) < 0, img = goosePix('swim');
        out.push({ img: right ? img : flipped(img), x: fx - 0.6, y: fy - 0.7 + duckBob(t, i), z: 1, sy: fy + 0.5 }); }
    }
    // leaves on the wind: a slow drift across the whole village
    const Wd = m.rows[0].length, Hd = m.rows.length;
    out.push({ x: 0, y: 0, w: 1, h: 1, z: 2, draw: (ctx, X, Y, TS) => { const u = TS / 16;
      for (let i = 0; i < 26; i++) { const sp = 0.22 + hash(i, 1, 5) * 0.2, wx = ((hash(i, 2, 5) * (Wd + 6) + t * sp * 1.6 + Math.sin(t * 0.9 + i) * 0.6) % (Wd + 6)) - 3, wy = ((hash(i, 3, 5) * (Hd + 6) + t * sp * 1.1) % (Hd + 6)) - 3, sx = X + wx * TS, sy = Y + wy * TS + Math.sin(t * 2.4 + i * 1.7) * u;
        if (sx < -TS || sy < -TS || sx > ctx.canvas.width || sy > ctx.canvas.height) continue; const c = ['#e8742a', '#d4501e', '#f0a030', '#c03a1c', '#f8c040'][i % 5], flip = Math.floor(t * 3 + i) % 2;
        ctx.fillStyle = c; ctx.fillRect(Math.round(sx), Math.round(sy), Math.round(2 * u), Math.round(u)); ctx.fillStyle = '#7a2c10'; ctx.fillRect(Math.round(sx + (flip ? u : 0)), Math.round(sy + u), Math.round(u), Math.round(u)); } } });
  }
  const overlay = (ctx, t, TS) => { // warm late-afternoon light: a golden wash, a little deeper toward the bottom
    const w = ctx.canvas.width, h = ctx.canvas.height, g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,196,96,.10)'); g.addColorStop(1, 'rgba(255,120,50,.13)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  };
  const kindAt = () => 'a-water';
  return { cls: { ',': CLS.DIRT, _: CLS.ST, E: CLS.ST, ':': CLS.PLZ, ';': CLS.LAWN, '~': CLS.WAT, '#': CLS.WALL }, land, dirt, cobble, plaza: (x, y) => plaza(x, y), lawn, pond, wall,
    kerb: (px, py) => pick(PA.stone, 0.38 + hash(px, py, 3) * 0.1, px, py), plazaEdge: (px, py) => pick(PA.plz, 0.14, px, py), dirtEdge: (px, py) => pick(PA.dirt, 0.1, px, py), lawnEdge: (px, py) => pick(PA.stone, 0.3 + hash(px, py, 3) * 0.12, px, py),
    lavapool: () => 0, mtn: () => 0, decorate, shade: [0.6, 0.62, 0.7, 12], kindAt, waterPix, tree, mapObjects, overlay };
}
