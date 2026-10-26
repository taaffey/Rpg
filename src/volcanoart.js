// ===== Kilnhaven (theme 'volcanotown'): a holiday village on the black slopes of a smoking volcano =====
// Black basalt with glowing lava veins and ember specks, obsidian cobbles, charred trees with glowing tips, bamboo-and-thatch beach
// huts under bright striped awnings, a neon beach bar, parasols, tiki torches, a lava-fed hot spring, a lava lake and a skyline
// volcano. Bright buildings on dark ground, warm red-orange light. Drawn at 16 px per tile.
// base chars: . basalt  , beach sand  _ obsidian cobbles  : paving  F hot spring (3x2)  L lava  # basalt wall  M volcano backdrop
//             T charred tree  h hibiscus  E exit
export function makeVolcano(U) {
  const { Pix, PAL, ramp, pk, cA, cR, cG, cB, cl, mix, dk, hash, vnoise, fbm, pick, outline, rim, blob, canv, once, vor, thatch, tileRoof, chimney, masonryPx, oakPost, oakRail, doorAt, eaveShadow,
    puffPix, flipped, F5, PROPS, propPix, shEll, shRect, putSprite, edgeMask, CLS } = U;
  const M = 8;
  const PV = {
    basalt: ramp('#08070a #100e12 #181519 #211d22 #2c262d #392f38 #483c47 #5c4e5a'),
    lava: ramp('#4a0800 #8a1400 #c42a00 #f04c06 #ff7a14 #ffa830 #ffd060 #fff0a0'),
    obs: ramp('#0a0812 #130f1e #1c1730 #272044 #342c5a #46397a #5d4e9a #8070bc'),
    sand: ramp('#5a3e20 #7a5a30 #987440 #b48e50 #cca862 #e0c078 #f0d894 #fbeab4'),
    spring: ramp('#08323e #0c4856 #12606e #1c7c86 #2c9c9c #4cbcb4 #7cd8cc #b4f0e4 #e0fff8'),
    trav: ramp('#5a4a3a #7a6650 #9a8268 #baa282 #d4c0a0 #e8dac0 #f8f0dc'),
    coral: ramp('#5a1c30 #7e2842 #a43656 #c84a68 #e06680 #f088a0 #f8b0bc'),
    teal: ramp('#083a46 #0c5460 #146e7a #1e8a94 #30a8ac #58c8c4 #90e4dc'),
    bamboo: ramp('#4a3a10 #6a5418 #8e7424 #b09434 #ccb048 #e2c866 #f4de88'),
    jungle: ramp('#0c2a12 #14401a #1e5a24 #2a7630 #3c9440 #54b050 #78cc6c'),
    char: ramp('#050404 #0e0a0a #181010 #241a16 #34261e #483428'),
    stoneG: ramp('#2a2630 #3e3846 #544c5e #6a6076 #82788e #9c92a8 #b8aec4'),
    rooftile: ramp('#3a1208 #5e2010 #8a3414 #b4501c #d86c26 #f08c3a #ffae58'),
    redtile: ramp('#2a0a0c #4a1216 #6e1c20 #922a2c #b43c38 #d4564a #ee7a66'),
    wall: ramp('#100e14 #1a1720 #26212c #342d3a #443b4c #564b5e #6a5d72'),
  };
  const cramp = (h) => { const c = pk(h); return [dk(c, 0.35), dk(c, 0.6), dk(c, 0.82), c, mix(c, pk('#ffffff'), 0.3), mix(c, pk('#ffffff'), 0.6)]; };
  const RC = {}; const rc = (h) => RC[h] || (RC[h] = cramp(h));
  const hot = (c) => cR(c) >= 190 && cG(c) >= 40 && cB(c) <= 90 && cR(c) > cG(c) + 60;
  const txtS = (p, s, x, y, c, sc = 1) => { for (const ch of s) { const g = F5[ch] || F5[' ']; g.forEach((r, j) => [...r].forEach((v, i) => { if (v === '#') for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) p.set(x + i * sc + a, y + j * sc + b, c); })); x += (g[0].length + 1) * sc; } return x; };
  const txtWs = (s, sc = 1) => [...s].reduce((a, ch) => a + ((F5[ch] || F5[' '])[0].length + 1) * sc, -sc);

  // ---------------------------------------------------------------- the skyline: a dusk sky, far ridges, and the smoking volcano (baked into the 'M' tiles)
  const CXV = 296, CY0 = 14, CH = 50, CHW = 96; // cone: centre x, crater y, height down to the foot, half-width at the foot
  const coneHW = (y) => 5 + (CHW - 5) * Math.pow(Math.max(0, (y - CY0)) / CH, 1.22);
  const riverX = (y) => CXV + Math.sin(y * 0.33) * 2.2 * Math.min(1, (y - CY0) / 20);
  function mtn(x, y) {
    const gl = Math.exp(-Math.hypot((x - CXV) / 100, (y - CY0) / 30) * 1.1);
    const sky = () => { let c = mix(pk('#24082a'), pk('#e0661e'), Math.pow(cl(y / 56, 0, 1), 1.5)); c = mix(c, pk('#ffa040'), gl * 0.6); if (y < 22 && hash(x, y, 5) < 0.012) c = mix(c, pk('#fff0c8'), 0.75); return c; };
    const r1 = 38 + 9 * Math.sin(x * 0.017 + 1) + 5 * Math.sin(x * 0.051) + (vnoise(x, 0, 14, 7) - 0.5) * 9, r2 = 52 + 5 * Math.sin(x * 0.031 + 2) + (vnoise(x, 3, 9, 8) - 0.5) * 7;
    const hw = coneHW(y) + (vnoise(y, 5, 4, 9) - 0.5) * 3.5, dx = x - CXV;
    let col;
    if (y >= CY0 - 2 && Math.abs(dx) < hw + (y < CY0 + 2 ? 2 : 0)) { // the cone
      const u = dx / Math.max(hw, 1), hh = cl((y - CY0) / CH, 0, 1);
      if (y < CY0 + 3 && Math.abs(dx) < 10) col = pick(PV.lava, cl(0.7 + (vnoise(x * 1.5, y * 3, 3, 4) - 0.5) * 0.5 - Math.abs(dx) * 0.02), x, y); // the glowing crater
      else {
        let v = 0.2 + (fbm(x * 0.9, y * 1.4, 4) - 0.5) * 0.42 + (1 - hh) * 0.2 + (u < 0 ? 0.06 : -0.04) + Math.pow(Math.max(0, 1 - hh * 2.2), 2) * 0.35;
        col = pick(PV.basalt, cl(v, 0.02, 0.95), x, y);
        const orange = cl((1 - hh) * 0.7, 0, 0.7); col = mix(col, pk('#a02a08'), orange * (0.35 + hash(x, y, 6) * 0.25));
        if (Math.abs(u) > 0.9) col = mix(col, pk('#ff7a14'), 0.3);
        for (let k = 0; k < 6; k++) { const uK = [-0.8, -0.52, -0.25, 0.04, 0.3, 0.86][k], st = CY0 + 3 + (k % 3) * 3; if (y < st) continue;
          const w = 0.012 + (y - CY0) * 0.0004; if (Math.abs(u - (uK + Math.sin(y * 0.36 + k * 2.1) * 0.04)) < w) col = pick(PV.lava, cl(0.5 + (1 - hh) * 0.4 + (vnoise(x, y * 2, 3, 12 + k) - 0.5) * 0.4), x, y); }
        const rw = 1.4 + Math.pow(hh, 1.6) * 7; if (y > CY0 + 2 && Math.abs(x - riverX(y)) < rw) { const e = Math.abs(x - riverX(y)) / rw; col = pick(PV.lava, cl(0.95 - e * 0.55 + (vnoise(x * 1.2, y * 2, 3, 15) - 0.5) * 0.35), x, y); }
      }
    } else if (y >= r2 && (Math.abs(dx) > hw || y < CY0)) col = pick(PV.basalt, cl(0.12 + (vnoise(x, y, 7, 3) - 0.5) * 0.3 + (hash(x, y, 4) < 0.02 ? 0.25 : 0), 0, 1), x, y); // foothills
    else if (y >= r1) col = mix(sky(), pk('#241028'), 0.88 - gl * 0.25 + (y - r1) * 0.004); // far ridges, purple against the glow
    else col = sky();
    if (y > 54) col = mix(col, land(x, y), cl((y - 54) / 10, 0, 1)); // blend the foot into the ground
    return col;
  }

  // ---------------------------------------------------------------- ground materials
  const veinAt = (x, y) => { const zone = vnoise(x, y, 46, 81), w = 0.01 + 0.032 * cl((zone - 0.42) * 3.2, 0, 1); if (w < 0.011) return -1; const d = Math.abs(vnoise(x, y, 19, 82) + (vnoise(x, y, 6, 83) - 0.5) * 0.06 - 0.5); return d < w ? d / w : d < w * 2.6 ? 1 + (d - w) / (w * 1.6) : -1; };
  function land(x, y) {
    const vn = veinAt(x, y);
    if (vn >= 0 && vn < 1) return pick(PV.lava, cl(0.95 - vn * 0.8 + (vnoise(x, y, 3, 5) - 0.5) * 0.3), x, y);
    let v = 0.3 + fbm(x, y, 1) * 0.42 + (vnoise(x, y, 28, 6) - 0.5) * 0.22 + (hash(x, y, 7) < 0.05 ? 0.14 : 0) - (hash(x >> 1, y >> 1, 8) < 0.07 ? 0.12 : 0);
    let c = pick(PV.basalt, cl(v, 0.03, 0.9), x, y);
    if (vn >= 1) c = mix(c, pk('#6a1408'), 0.55 - (vn - 1) * 0.5); // the glow bleeding onto the rock round a vein
    const h = hash(x, y, 9); if (h < 0.0032) return pk('#ffa830'); if (h < 0.0046) return pk('#ffd860'); if (h < 0.0055) return pk('#d83c08');
    return c;
  }
  const sand = (x, y) => { const rip = Math.sin((y + vnoise(x, y, 20, 5) * 9) * 0.85) * 0.07; let v = 0.55 + fbm(x, y, 3) * 0.3 + rip + (hash(x, y, 2) < 0.03 ? 0.12 : 0) - (hash(x, y, 3) < 0.02 ? 0.15 : 0); const vn = veinAt(x, y); if (vn >= 1 && vn < 1.5) v -= 0.1; return pick(PV.sand, cl(v, 0.1, 0.95), x, y); };
  const cobble = (x, y) => {
    const v = vor(x, y, 5.8, 0.8, 31), n = fbm(x, y, 9);
    if (v.e < 0.9) { const g = hash(Math.floor(x / 3), Math.floor(y / 3), 91); return g < 0.16 ? pick(PV.lava, 0.18 + g * 2.4, x, y) : pick(PV.obs, 0.03 + n * 0.08, x, y); }
    let s = 0.3 + (v.h - 0.5) * 0.3 + (n - 0.5) * 0.14; const lit = -(v.dx + v.dy); if (v.e < 2.1) s += lit > 0.3 ? 0.22 : lit < -0.3 ? -0.1 : 0; else s += 0.04;
    if (hash(x, y, 5) < 0.012) s += 0.3; return pick(PV.obs, cl(s, 0.05, 1), x, y);
  };
  const plaza = (x, y) => {
    const v = vor(x, y, 9, 0.82, 57), n = fbm(x, y, 9);
    if (v.e < 1.05) { const g = vnoise(x, y, 7, 92); return g > 0.5 ? pick(PV.lava, cl(0.2 + (g - 0.5) * 1.6), x, y) : pick(PV.obs, 0.04, x, y); } // glowing inlay between the tiles
    let s = 0.34 + (v.h - 0.5) * 0.26 + (n - 0.5) * 0.12; const lit = -(v.dx + v.dy); if (v.e < 2.3) s += lit > 0.3 ? 0.2 : lit < -0.3 ? -0.1 : 0; return pick(PV.obs, cl(s, 0.05, 1), x, y);
  };
  const pond = (w, x, y) => { if (w <= 0.44) return dk(land(x, y), 0.6); if (w <= 0.5) return pick(PV.trav, cl(0.5 + (fbm(x, y, 3) - 0.5) * 0.5), x, y); if (w <= 0.58) return hash(x, y, 12) < 0.55 ? pk('#9cf0e070') : pk('#4cbcb468'); return 0; };
  const lavapool = (w, x, y) => { if (w <= 0.44) return mix(land(x, y), pk('#8a1400'), 0.45); if (w <= 0.5) return hash(x, y, 4) < 0.5 ? pick(PV.lava, 0.18 + hash(x, y, 5) * 0.3, x, y) : pick(PV.basalt, 0.2, x, y); if (w <= 0.56) return vnoise(x, y, 4, 6) > 0.5 ? pick(PV.basalt, 0.15 + hash(x, y, 6) * 0.2, x, y) : pick(PV.lava, 0.5 + hash(x, y, 7) * 0.3, x, y); return 0; };
  function wall(x, y, wy, tot) { // basalt blocks with a dull glow in the joints
    const capH = tot > 16 ? 16 : 6;
    if (wy < capH) { const row = Math.floor(wy / 8), bx = Math.floor((x + (row & 1) * 5) / 10), bu = (((x + (row & 1) * 5) % 10) + 10) % 10; if (bu === 0 && hash(bx, row, 3) < 0.4) return pick(PV.lava, 0.25 + hash(x, y, 2) * 0.2, x, y); let v = 0.5 + (hash(bx, row, 21) - 0.5) * 0.22 + (fbm(x, y, 4) - 0.5) * 0.2; if (bu === 0) v = 0.12; if (wy === 0) v = 0.85; if (wy === capH - 1) v = 0.15; return pick(PV.wall, cl(v), x, y); }
    const fy = wy - capH, row = Math.floor(fy / 5), bx = Math.floor((x + (row & 1) * 5) / 10), bu = (((x + (row & 1) * 5) % 10) + 10) % 10, bv = fy % 5;
    if ((bu === 0 || bv === 4) && hash(bx, row, 7) < 0.3 && fy > 6) return pick(PV.lava, 0.2 + hash(x, y, 3) * 0.3 + (wy > tot - 6 ? 0.1 : 0), x, y);
    let v = 0.42 + (hash(bx, row + 3, 23) - 0.5) * 0.24 + (fbm(x, y, 6) - 0.5) * 0.14; if (bu === 0 || bv === 4) v = 0.08; else if (bv === 0 || bu === 1) v += 0.14; return pick(PV.wall, cl(v, 0.03, 0.9), x, y);
  }

  // ---------------------------------------------------------------- charred trees: a gnarled one and a burnt palm, with embers glowing in the bark and at the tips
  const GL = ['#ff7a14', '#ffa830', '#ffd060', '#d83c08'].map(pk);
  function charTree(v) {
    return once('vtree' + v, () => {
      const p = new Pix(44, 56), cx = 22;
      if (v === 1) { // burnt palm
        for (let y = 54; y > 20; y--) { const x = cx - 2 + Math.round(Math.sin((54 - y) * 0.1 + 0.6) * 4), k = (54 - y) % 5 === 0; for (let i = 0; i < 4; i++) p.set(x + i, y, pick(PV.char, k ? 0.1 : 0.55 - i * 0.12 + hash(x, y, 2) * 0.1, x, y)); if (hash(x, y, 3) < 0.05) p.set(x + 1, y, GL[hash(x, y, 4) < 0.5 ? 0 : 3]); }
        const tx = cx - 2 + Math.round(Math.sin(34 * 0.1 + 0.6) * 4) + 2;
        for (let k = 0; k < 8; k++) { const a = -2.9 + k * 0.42, L = 15 + (k % 3) * 2; for (let s = 0; s <= L; s++) { const t = s / L, x = Math.round(tx + Math.cos(a) * s * 0.95), y = Math.round(20 + Math.sin(a) * s * 0.75 + t * t * 15); p.set(x, y, pick(PV.char, 0.55 - t * 0.35 + hash(x, y, 5) * 0.15, x, y)); if (s % 3 === 0 && s > 3) { p.set(x, y + 1, pick(PV.char, 0.3, x, y)); p.set(x + (a < -1.57 ? -1 : 1), y + 1, pick(PV.char, 0.25, x, y)); } if (s === L) { p.set(x, y, GL[1]); p.set(x, y + 1, GL[0]); p.set(x + 1, y, GL[2]); } } }
        for (let k = 0; k < 3; k++) blob(p, tx - 1 + k * 1.6, 23 + (k & 1), 2.1, PV.char, { seed: k, amb: 0.2, rimDark: 0.1 });
      } else { // gnarled tree: forked bare branches ending in glowing tips
        for (let y = 54; y > 26; y--) { const lean = Math.round(Math.sin((54 - y) * 0.13 + v) * 2.2), hw = 3.2 - (54 - y) * 0.03 + (y > 48 ? (y - 48) * 0.5 : 0);
          for (let x = Math.floor(cx + lean - hw); x <= cx + lean + hw - 0.5; x++) { const u = (x + 0.5 - cx - lean) / hw; p.set(x, y, pick(PV.char, cl(0.62 - u * 0.5 - (hash(x, y >> 1, 3) < 0.2 ? 0.25 : 0)), x, y)); if (hash(x, y, 7) < 0.045 && Math.abs(u) < 0.6) p.set(x, y, GL[hash(x, y, 8) < 0.6 ? 3 : 0]); } }
        const br = (x, y, a, L, d) => { for (let s = 0; s <= L; s++) { const t = s / L, X = Math.round(x + Math.cos(a) * s), Y = Math.round(y + Math.sin(a) * s), w = d > 1 ? 1 : 0; for (let i = 0; i <= w; i++) p.set(X + i, Y, pick(PV.char, 0.55 - t * 0.3 - i * 0.2 + hash(X, Y, 4) * 0.1, X, Y)); if (s > 2 && hash(X, Y, 9) < 0.06) p.set(X, Y, GL[3]); }
          const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L; if (d > 0) { br(ex, ey, a - 0.55 + (hash(Math.round(ex), d, v) - 0.5) * 0.3, L * 0.72, d - 1); br(ex, ey, a + 0.5 + (hash(Math.round(ey), d, v + 3) - 0.5) * 0.3, L * 0.7, d - 1); } else { const X = Math.round(ex), Y = Math.round(ey); p.set(X, Y, GL[2]); p.set(X, Y - 1, GL[1]); p.set(X + 1, Y, GL[0]); p.set(X - 1, Y + 1, GL[3]); } };
        br(cx + Math.round(Math.sin(27 * 0.13 + v) * 2.2), 28, -1.57 - 0.9, 11, 2); br(cx + Math.round(Math.sin(27 * 0.13 + v) * 2.2), 28, -1.57 + 0.9, 11, 2); br(cx + Math.round(Math.sin(27 * 0.13 + v) * 2.2), 27, -1.57 + (v ? 0.12 : -0.12), 14, 2);
        for (const s of [-1, 1]) for (let k = 0; k < 7; k++) { const x = Math.round(cx + s * (3.4 + k * 1.2)), y = 52 + Math.round(k * 0.7); p.set(x, y, pick(PV.char, 0.3, x, y)); p.set(x, y + 1, pick(PV.char, 0.15, x, y)); }
      }
      outline(p, 0.5); return canv(p);
    });
  }
  function tree(get, x, y, out, m) {
    if (m && (x < 0 || y < 0 || x >= m.rows[0].length || y >= m.rows.length)) return;
    if (get(x, y) !== 'T') return; const h = hash(x, y, 1), img = charTree(h < 0.35 ? 1 : 0);
    out.push({ img, x: x + 0.5 - img.width / 32, y: y + 1 - img.height / 16 + 0.08, z: 1, sy: y + 1 });
  }

  // ---------------------------------------------------------------- props
  const stripe = (cols) => cols.map(rc);
  function parasolPix(c) {
    const C = { pink: ['#ff3c8c', '#fff4e0'], teal: ['#20c8c0', '#fff4e0'], yellow: ['#ffd030', '#ff7a20'], red: ['#e83030', '#fff4e0'] }[c] || ['#ff3c8c', '#fff4e0'];
    return once('vpar' + c, () => { const p = new Pix(36, 46), A = stripe(C);
      for (let y = 18; y < 45; y++) { p.set(18, y, pick(PAL.wood, 0.7, 18, y)); p.set(19, y, pick(PAL.wood, 0.3, 19, y)); }
      for (let y = 4; y < 17; y++) { const t = (y - 4) / 12, hw = 2 + 15.5 * Math.sin(Math.min(1, t * 1.05) * 1.5708) ** 0.75; for (let x = Math.floor(18.5 - hw); x <= 18.5 + hw - 0.5; x++) { const u = (x + 0.5 - 18.5) / hw, wedge = Math.floor((x - 1) / 4) & 1, R = A[wedge];
        if (y >= 15 && ((x + 1) % 4 === 0 || (x % 4 === 0))) continue; p.set(x, y, pick(R, cl(0.82 - t * 0.28 - u * 0.2 + (u < -0.4 ? 0.06 : 0)), x, y)); } }
      for (let x = 3; x < 35; x++) if ((x - 2) % 4 < 3) p.set(x, 16, dk(p.get(x, 15) || pk('#000000'), 0.55)); for (let y = 0; y < 4; y++) p.set(18 + (y & 1), y, pick(PAL.gold, 0.9 - y * 0.1, 0, 0));
      outline(p, 0.4); return canv(p); });
  }
  function loungerPix() {
    return once('vlounger', () => { const p = new Pix(32, 16), T1 = rc('#20c8c0'), T2 = rc('#fff4e0');
      for (let x = 2; x < 30; x++) { const y = x < 9 ? 5 + Math.round((9 - x) * 0.7) : 8; for (let j = 0; j < 4; j++) p.set(x, y + j, ((x >> 2) & 1) ? pick(T1, 0.75 - j * 0.12, x, y) : pick(T2, 0.9 - j * 0.12, x, y)); }
      for (let x = 3; x < 8; x++) for (let j = 2; j < 5; j++) p.set(x, 1 + (x < 6 ? 3 : 0) + j - (8 - x) * 0, pick(PAL.cloth, 0.8 - j * 0.1, x, j));
      for (const lx of [4, 12, 26]) for (let y = 12; y < 15; y++) { p.set(lx, y, pick(PAL.iron, 0.6, 0, 0)); p.set(lx + 1, y, pick(PAL.iron, 0.3, 0, 0)); }
      for (let x = 2; x < 30; x++) p.set(x, 12, pick(PAL.iron, 0.55, 0, 0)); p.set(27, 6, pk('#ff7a20')); p.set(28, 6, pk('#ff7a20')); p.set(29, 7, pk('#ff3c8c')); // flip-flops
      outline(p, 0.4); return canv(p); });
  }
  const TOWC = ['#ff3c8c', '#20c8c0', '#ffd030', '#ff7a20', '#8a60e8'];
  function towelPix(k) { // baked into the ground: a striped beach towel seen at an angle, with a pair of sunglasses
    const p = new Pix(32, 16), C = TOWC[k % 5], A = rc(C), B = rc('#fff4e0');
    for (let y = 3; y < 13; y++) { const sk = Math.round((y - 3) * 0.35); for (let x = 3 + sk; x < 27 + sk; x++) { const st = Math.floor((x - sk) / 4) & 1; p.set(x, y, st ? pick(B, 0.82 - (y - 3) * 0.03, x, y) : pick(A, 0.78 - (y - 3) * 0.04, x, y)); } }
    for (let x = 6; x < 12; x++) p.set(x + 1, 6, pk('#201020')); p.set(8, 7, pk('#201020')); p.set(11, 7, pk('#201020')); p.set(14, 6, pk('#f8d8a0')); p.set(15, 6, pk('#f8d8a0')); p.set(16, 6, pk('#e8b878'));
    outline(p, 0.35); return p;
  }
  function tikiPix(f) {
    return once('vtiki' + f, () => { const p = new Pix(16, 44);
      for (let y = 14; y < 43; y++) for (let x = 5; x < 11; x++) { const u = (x - 5) / 5; let v = 0.62 - u * 0.5 + (y % 9 === 0 ? -0.25 : 0) + (hash(x, y, 2) - 0.5) * 0.1; p.set(x, y, pick(PV.bamboo, cl(v), x, y)); }
      for (const [fy, h] of [[20, 5], [30, 5]]) { for (let x = 6; x < 10; x++) { p.set(x, fy + 2, pk('#1a0c06')); } p.set(6, fy, pk('#1a0c06')); p.set(9, fy, pk('#1a0c06')); p.set(7, fy + 4, pk('#1a0c06')); p.set(8, fy + 4, pk('#1a0c06')); } // carved faces
      for (let y = 9; y < 15; y++) for (let x = 3; x < 13; x++) { const e = Math.abs(x - 7.5) > 4 - (y - 9) * 0.3; if (!e) p.set(x, y, pick(PV.char, 0.5 - (x - 3) * 0.03 + (y === 9 ? 0.2 : 0), x, y)); } // the bowl
      for (let y = 3; y < 10; y++) for (let x = 3; x < 13; x++) { const t = (9 - y) / 6, hw = (1 - t) * 4.4 * (f % 3 === 1 ? 0.85 : 1) + 0.4, dx = Math.abs(x + 0.5 - 8 - (f % 3 - 1) * t * 1.6); if (dx > hw || y < 3 + (f % 3)) continue; p.set(x, y, pick(PV.lava, cl(1.0 - dx / 5 - t * 0.4 + (hash(x, y, f) - 0.5) * 0.2), x, y)); }
      outline(p, 0.4); return canv(p); });
  }
  function grillPix(f) {
    return once('vgrill' + f, () => { const p = new Pix(32, 24);
      for (let y = 12; y < 22; y++) for (let x = 2; x < 30; x++) { const e = x < 4 || x > 27 || y > 19; p.set(x, y, e ? pick(PV.stoneG, 0.3 + (x > 15 ? -0.1 : 0.1), x, y) : pick(PV.lava, cl(0.5 + (hash(x, y, f + 2) - 0.5) * 0.7 + (y < 15 ? 0.1 : -0.1)), x, y)); }
      for (let x = 1; x < 31; x++) { p.set(x, 11, pick(PV.stoneG, 0.85, x, 11)); p.set(x, 12, pick(PV.stoneG, 0.5, x, 12)); }
      for (let x = 4; x < 28; x += 4) { for (let y = 5; y < 12; y++) p.set(x, y, pick(PAL.iron, 0.6, 0, 0)); for (let j = 0; j < 3; j++) { p.set(x - 1, 6 + j * 2, j % 2 ? pk('#d84a28') : pk('#58b040')); p.set(x + 1, 6 + j * 2, j % 2 ? pk('#e8a030') : pk('#d84a28')); p.set(x, 6 + j * 2, pk('#a05020')); } } // kebab skewers
      for (let y = 21; y < 24; y++) for (const x of [4, 25]) { p.set(x, y, pick(PAL.iron, 0.4, 0, 0)); p.set(x + 1, y, pick(PAL.iron, 0.25, 0, 0)); }
      outline(p, 0.4); return canv(p); });
  }
  function groomPix() { // tied to a tiki post with rope, veiled, delighted
    return once('vgroom', () => { const p = new Pix(24, 38);
      for (let y = 6; y < 37; y++) for (let x = 14; x < 19; x++) p.set(x, y, pick(PV.bamboo, cl(0.62 - (x - 14) * 0.14 + (y % 9 === 0 ? -0.25 : 0)), x, y));
      for (let y = 16; y < 28; y++) for (let x = 5; x < 14; x++) { const wv = (x + y) % 6 < 2; p.set(x, y, wv ? pk('#ffd030') : (x + 2 * y) % 5 === 0 ? pk('#ff7a20') : pk('#20c8c0')); if (x > 11) p.set(x, y, dk(p.get(x, y), 0.8)); } // a Hawaiian shirt
      for (let y = 28; y < 36; y++) for (const x0 of [6, 10]) for (let x = x0; x < x0 + 3; x++) p.set(x, y, x === x0 ? pk('#4a68b8') : pk('#34508c'));
      for (let y = 6; y < 16; y++) for (let x = 5; x < 14; x++) { const dx = (x + 0.5 - 9.5) / 4.6, dy = (y + 0.5 - 10.5) / 4.8; if (dx * dx + dy * dy > 1) continue; p.set(x, y, mix(pk('#f4cca4'), pk('#b87850'), cl(0.2 + dx * 0.25 + dy * 0.2, 0, 1))); } for (let x = 6; x < 14; x++) for (let y = 5; y < 8; y++) if (p.on(x, y)) p.set(x, y, pk('#4a2c18')); p.set(7, 11, pk('#201008')); p.set(11, 11, pk('#201008')); for (let x = 7; x < 12; x++) p.set(x, 14, pk('#c03020')); p.set(7, 13, pk('#c03020')); p.set(11, 13, pk('#c03020'));
      for (let y = 4; y < 26; y++) for (let x = 3; x < 17; x++) { const side = Math.abs(x + 0.5 - 9.5) > 4.8, hang = y > 6, top = y < 6 && Math.abs(x + 0.5 - 9.5) < 5.5; if ((side && hang) || top) p.set(x, y, mix(pk('#ffffff'), pk('#c8e8ff'), (x + y) % 3 / 3)); } // the veil
      for (let x = 6; x < 13; x++) p.set(x, 5, pick(PAL.gold, 0.9, 0, 0)); p.set(9, 3, pick(PAL.gold, 0.95, 0, 0)); p.set(8, 4, pick(PAL.gold, 0.8, 0, 0)); p.set(10, 4, pick(PAL.gold, 0.8, 0, 0));
      for (const y of [18, 21, 24, 33]) for (let x = 4; x < 20; x++) p.set(x, y + (x % 2 ? 0 : 0), pk(x % 4 < 2 ? '#c8a870' : '#a88850')); // rope
      outline(p, 0.4); return canv(p); });
  }
  const archPost = () => once('vapost', () => { const p = new Pix(16, 54);
    for (let y = 6; y < 54; y++) for (let x = 5; x < 11; x++) p.set(x, y, pick(PV.bamboo, cl(0.66 - (x - 5) * 0.1 + (y % 10 === 0 ? -0.25 : 0)), x, y));
    for (let k = 0; k < 4; k++) { const y = 14 + k * 9; for (let x = 5; x < 11; x++) p.set(x, y, pick(PV.bamboo, 0.12, x, y)); }
    for (let y = 0; y < 8; y++) for (let x = 4; x < 12; x++) { const e = x === 4 || x === 11 || y === 0 || y === 7; p.set(x, y, e ? pick(PAL.iron, 0.3, x, y) : pick(PV.lava, cl(0.85 - Math.abs(x - 7.5) * 0.07 - y * 0.03), x, y)); }
    outline(p, 0.4); return canv(p); });
  const archLintel = (w, f) => once(`valin${w}${f}`, () => { const W = (w + 2) * 16, p = new Pix(W, 26);
    for (let y = 4; y < 22; y++) for (let x = 0; x < W; x++) p.set(x, y, y < 6 || y > 19 ? pick(PV.bamboo, y < 6 ? 0.8 : 0.3, x, y) : pick(PV.obs, 0.05 + (y - 6) * 0.004, x, y));
    const pk1 = f === 3 ? '#ff9ad0' : '#ff3c8c', cy1 = f === 2 ? '#a8fcff' : '#3cf0ff', text = 'KILNHAVEN', tw = txtWs(text), tx = Math.round(W / 2 - tw / 2), glowc = (c) => c + '40';
    for (let j = -1; j <= 5; j++) for (let i = -1; i < tw + 1; i++) if (p.get(tx + i, 8 + j) && f !== 1) { /* neon halo painted below */ }
    txtS(p, text, tx + 1, 9, pk(glowc(pk1.length ? '#ff3c8c' : '#ff3c8c')), 1); txtS(p, text, tx, 8, pk(pk1), 1);
    for (let x = 4; x < W - 4; x++) { p.set(x, 7, pk(cy1)); p.set(x, 20, pk(f === 1 ? '#1a8fa0' : cy1)); }
    for (let y = 21; y < 26; y++) for (let x = 4; x < W - 4; x += 6) { p.set(x, y, pk(['#ff3c8c', '#ffd030', '#20c8c0', '#ff7a20'][(x / 6 | 0) % 4])); p.set(x + 1, y, pk(['#ff3c8c', '#ffd030', '#20c8c0', '#ff7a20'][(x / 6 | 0) % 4])); } // bunting
    outline(p, 0.4); return canv(p); });

  // the hot spring: an octagonal basin of pale mineral crust, turquoise water, a boulder of black rock with a lava seam
  function springPix(w, h, f) {
    return once(`vspr${w}${h}${f}`, () => {
      const W = w * 16, Hh = h * 16 + 16, p = new Pix(W, Hh), cx = W / 2, cy = 16 + h * 8 - 2, RW = W / 2 - 1.5, RI = RW - 4, sq = 1.42, oct = (dx, dy, r) => Math.max(Math.abs(dx), Math.abs(dy), (Math.abs(dx) + Math.abs(dy)) * 0.7071) <= r;
      for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
        const dx = x + 0.5 - cx, dyT = (y + 0.5 - cy) * sq, dyF = (y + 0.5 - cy - 6) * sq, inTop = oct(dx, dyT, RW), inFace = !inTop && y > cy && oct(dx, dyF, RW);
        if (inFace) { const seam = Math.abs(Math.abs(dx) - RW * 0.414) < 0.8 || Math.abs(dx) > RW - 0.8; p.set(x, y, seam && y > cy + 4 ? pick(PV.lava, 0.28 + (hash(x, y, f) - 0.5) * 0.2, x, y) : pick(PV.wall, cl(0.45 - (seam ? 0.25 : 0) - dx / W * 0.3 - (y > cy + 9 ? 0.15 : 0)), x, y)); continue; }
        if (!inTop) continue;
        if (!oct(dx, dyT, RI)) { const lit = -(dx + dyT) / RW; p.set(x, y, pick(PV.trav, cl(0.66 + lit * 0.2 + (hash(Math.floor(Math.atan2(dyT, dx) * 2.5), 1, 4) - 0.5) * 0.12), x, y)); continue; }
        if (!oct(dx, (y + 0.5 - cy - 4) * sq, RI)) { p.set(x, y, pick(PV.spring, 0.22 + (y - (cy - RI / sq)) * 0.02, x, y)); continue; }
        const d = Math.hypot(dx, dyT); let v = 0.5 + 0.13 * Math.sin(d * 0.9 - f * Math.PI / 2) + (vnoise(x, y + f * 3, 3, 7) - 0.5) * 0.2; if (hash(x, y, f + 3) < 0.02) v = 0.98; p.set(x, y, pick(PV.spring, cl(v, 0.15, 1), x, y));
      }
      for (let y = cy - 14; y < cy + 3; y++) for (let x = cx - 8; x < cx + 8; x++) { const dx = (x + 0.5 - cx) / 8, dy = (y + 0.5 - cy + 5) / 8.5; if (dx * dx + dy * dy > 1) continue; p.set(x, y, pick(PV.basalt, cl(0.62 - dx * 0.35 - dy * 0.25 + (hash(x, y, 5) - 0.5) * 0.22), x, y)); } // the boulder
      for (let k = 0; k < 7; k++) { const x = cx - 3 + k, y = cy - 9 + Math.round(Math.sin(k * 0.9) * 1.6) + (k > 3 ? k - 3 : 0); p.set(x, y, pick(PV.lava, 0.78 + (k + f) % 2 * 0.1, x, y)); p.set(x, y + 1, pick(PV.lava, 0.5, x, y)); }
      for (let j = 0; j < 8; j++) { const y = cy - 6 + ((j * 3 + f * 2) % 9); p.set(cx + 5, y, pick(PV.lava, j % 2 ? 0.95 : 0.7, 0, 0)); } // lava dripping from the rock into the water
      for (let k = 0; k < 8; k++) { const bx = cx - 14 + Math.floor(hash(k, f, 11) * 28), by = cy + 1 + Math.floor(hash(k, f, 12) * 6); if (oct(bx + 0.5 - cx, (by + 0.5 - cy) * sq, RI - 2)) { p.set(bx, by, pk('#e0fff8')); p.set(bx + 1, by, pk('#b4f0e4')); } } // bubbles
      outline(p, 0.35); return canv(p);
    });
  }
  const fountains = (m) => { const base = m.base, out = []; base.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'F' && base[y][x - 1] !== 'F' && (base[y - 1] || '')[x] !== 'F') { let w = 0, h = 0; while (r[x + w] === 'F') w++; while ((base[y + h] || '')[x] === 'F') h++; out.push({ x, y, w, h }); } })); return out; };

  // ---------------------------------------------------------------- buildings
  const stucco = (p, x0, x1, y0, y1, R, seed) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { let v = 0.7 + (fbm(x * 1.4, y * 1.4, seed) - 0.5) * 0.26 - (y - y0 < 3 ? 0.18 - (y - y0) * 0.05 : 0) - (y > y1 - 4 ? 0.12 : 0); if (hash(x, y, seed + 2) < 0.02) v -= 0.1; p.set(x, y, pick(R, cl(v, 0.1, 1), x, y)); } };
  function awning(p, x0, x1, y0, hh, c1, c2) {
    const A = rc(c1), B = rc(c2);
    for (let x = x0; x <= x1; x++) { const u = (x - x0) % 5, R = (Math.floor((x - x0) / 5) & 1) ? B : A, hem = y0 + hh - 1 - (u === 0 || u === 4 ? 1 : 0);
      for (let y = y0; y <= hem; y++) { const k = (y - y0) / hh; p.set(x, y, pick(R, cl(0.9 - k * 0.5 + (u === 0 ? -0.12 : 0)), x, y)); }
      const c = p.get(x, hem + 1); if (cA(c) === 255) p.set(x, hem + 1, dk(c, 0.5)); const c2c = p.get(x, hem + 2); if (cA(c2c) === 255) p.set(x, hem + 2, dk(c2c, 0.7)); }
  }
  function bwin(p, x0, y0, w, h, fc, shut) {
    const F = rc(fc); for (let y = y0 - 1; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) p.set(x, y, pick(F, 0.7, x, y));
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const u = (x + 0.5 - x0) / w - 0.5, v = (y + 0.5 - y0) / h - 0.5; p.set(x, y, pick(PAL.glow, cl(0.82 - Math.hypot(u * 1.1, v) * 0.7 + (u + v < -0.35 ? 0.1 : 0)), x, y)); }
    for (let y = y0; y < y0 + h; y++) p.set(x0 + (w >> 1), y, pick(F, 0.5, x0, y)); for (let x = x0; x < x0 + w; x++) p.set(x, y0 + (h >> 1), pick(F, 0.5, x, y0));
    for (let x = x0 - 2; x <= x0 + w + 1; x++) { p.set(x, y0 + h, pick(F, 0.9, x, 0)); p.set(x, y0 + h + 1, pick(F, 0.35, x, 0)); }
    if (shut) { const S = rc(shut); for (const sx of [x0 - 4, x0 + w + 1]) for (let y = y0 - 1; y <= y0 + h - 1; y++) for (let x = sx; x < sx + 3; x++) p.set(x, y, pick(S, cl((x === sx ? 0.85 : x === sx + 2 ? 0.3 : 0.6) - ((y - y0) % 3 === 2 ? 0.2 : 0)), x, y)); }
  }
  const palmFrond = (p, x, y, dir, L) => { for (let s = 0; s <= L; s++) { const t = s / L, X = Math.round(x + dir * s), Y = Math.round(y - Math.sin(t * 2.4) * L * 0.34 + t * t * L * 0.5); p.set(X, Y, pick(PV.jungle, 0.6 - t * 0.2, X, Y)); p.set(X, Y + 1, pick(PV.jungle, 0.35, X, Y)); if (s % 2 === 0) { p.set(X, Y + 2, pick(PV.jungle, 0.45, X, Y)); p.set(X, Y - 1, pick(PV.jungle, 0.8, X, Y)); } } };
  function loungeInn(b) { // the Lava Lounge: coral over turquoise, a striped awning, a balcony, a teal tiled roof, palms
    return once(`vb${b.x},${b.y}`, () => {
      const W = b.w * 16 + 2 * M, H = 136, p = new Pix(W, H), yB = H - 1, seed = 11, dc = M + b.door * 16 + 8, x0 = M, x1 = W - M - 1, upTop = yB - 62, jet = yB - 34, smoke = [];
      for (let y = yB - 5; y <= yB; y++) for (let x = x0; x <= x1; x++) p.set(x, y, masonryPx(x, y, yB - 5, seed, PV.stoneG, 9, 3));
      stucco(p, x0 - 1, x1 + 1, upTop, jet - 1, PV.coral, seed); stucco(p, x0, x1, jet, yB - 6, PV.teal, seed + 1);
      for (let x = x0 - 3; x <= x1 + 3; x++) { p.set(x, jet - 1, pick(PAL.wash, 0.95, x, 0)); p.set(x, jet, pick(PAL.wash, 0.8, x, 0)); p.set(x, jet + 1, pick(PAL.wash, 0.4, x, 0)); p.set(x, jet + 2, dk(p.get(x, jet + 2), 0.7)); }
      for (const wx of [x0 + 12, dc - 6, x1 - 24]) bwin(p, wx, upTop + 9, 12, 17, '#fff4e0', wx === dc - 6 ? null : '#ffd030');
      for (let x = dc - 24; x <= dc + 24; x++) { p.set(x, upTop + 32, pick(PAL.wash, 0.9, x, 0)); p.set(x, upTop + 33, pick(PAL.wash, 0.45, x, 0)); p.set(x, upTop + 34, dk(p.get(x, upTop + 34), 0.6)); if ((x - dc) % 4 === 0) for (let y = upTop + 26; y < upTop + 32; y++) p.set(x, y, pick(PAL.wash, 0.75, x, y)); p.set(x, upTop + 26, pick(PAL.wash, 0.95, x, 0)); }
      for (let k = 0; k < 4; k++) for (let y = upTop + 27; y < upTop + 32; y++) for (let x = dc - 20 + k * 10; x < dc - 15 + k * 10; x++) p.set(x, y, ((x + y) & 1) ? pk(TOWC[k % 5]) : pk('#fff4e0')); // towels drying on the rail
      awning(p, x0 - 2, x1 + 2, jet + 3, 14, '#ff3c8c', '#fff4e0');
      bwin(p, x0 + 10, yB - 25, 12, 12, '#fff4e0', null); bwin(p, x1 - 21, yB - 25, 12, 12, '#fff4e0', null);
      doorAt(p, dc - 6, yB - 2, 12, 20, { frame: PV.bamboo, wood: PV.bamboo, step: true });
      for (const lx of [dc - 13, dc + 12]) { p.set(lx, yB - 24, pick(PAL.iron, 0.4, 0, 0)); for (let y = yB - 23; y < yB - 18; y++) { p.set(lx, y, pick(PV.lava, 0.95, 0, 0)); p.set(lx + 1, y, pick(PV.lava, 0.65, 0, 0)); } }
      const R = tileRoof(p, { x0: 2, x1: W - 3, yR: 24, yE: upTop + 3, hx: 22, seed, R: PV.teal, moss: 0, ch: 4, tw: 5 }); eaveShadow(p, 4, W - 5, R.eave, 4);
      for (let x = 6; x < W - 6; x += 7) { const y = upTop + 6 + (hash(x, 1, 2) < 0.5 ? 0 : 1); p.set(x, y, pk(['#ff3c8c', '#ffd030', '#3cf0ff', '#ff7a20'][(x / 7 | 0) % 4])); p.set(x + 1, y, pk('#fff4e0')); } // string lights
      palmFrond(p, 14, 60, 1, 13); palmFrond(p, 14, 60, -1, 12); palmFrond(p, W - 14, 58, 1, 12); palmFrond(p, W - 14, 58, -1, 13);
      rim(p, 0.42, 'tl'); const c = canv(p); c.dx = -M / 16; c.smoke = smoke; return c;
    });
  }
  function bambooShop(b) { // bamboo hut with a palm-thatch roof, a big turquoise awning, goods hanging out front
    return once(`vb${b.x},${b.y}`, () => {
      const W = b.w * 16 + 2 * M, H = 100, p = new Pix(W, H), yB = H - 1, seed = 23, dc = M + b.door * 16 + 8, smoke = [], wallTop = yB - 36;
      for (let y = wallTop; y <= yB - 6; y++) for (let x = M; x < W - M; x++) { const i = (x - M) % 4, node = (y + Math.floor((x - M) / 4) * 5) % 12 === 0; let v = 0.66 - (i === 0 ? 0.22 : i === 3 ? 0.14 : 0) + (hash(Math.floor((x - M) / 4), 3, seed) - 0.5) * 0.18 - (node ? 0.22 : 0) - (y < wallTop + 3 ? 0.15 : 0); p.set(x, y, pick(PV.bamboo, cl(v, 0.05, 0.95), x, y)); }
      for (let y = yB - 5; y <= yB; y++) for (let x = M; x < W - M; x++) p.set(x, y, masonryPx(x, y, yB - 5, seed, PV.stoneG, 9, 3));
      oakRail(p, M, W - M - 1, wallTop + 1, 2); for (const x of [M, W - M - 3]) oakPost(p, x, wallTop, yB - 6, 3);
      // the open counter on the left, with goods hanging under the awning
      for (let y = yB - 30; y < yB - 12; y++) for (let x = M + 6; x < M + 34; x++) p.set(x, y, pick(PV.obs, 0.06 + (y - yB + 30) * 0.003, x, y));
      for (let x = M + 4; x < M + 36; x++) { p.set(x, yB - 13, pick(PAL.wood, 0.85, x, 0)); p.set(x, yB - 12, pick(PAL.wood, 0.5, x, 0)); for (let y = yB - 11; y < yB - 5; y++) p.set(x, y, pick(PAL.wood, 0.38 - ((x - M) % 6 === 0 ? 0.15 : 0), x, y)); }
      for (let k = 0; k < 5; k++) { const x = M + 8 + k * 5; for (let y = yB - 30; y < yB - 24 - (k % 2) * 3; y++) p.set(x, y, pk('#8a7a58')); const c = ['#ff3c8c', '#ffd030', '#20c8c0', '#ff7a20', '#f8f0d8'][k]; for (let j = 0; j < 4; j++) for (let i = -1; i < 3; i++) p.set(x + i, yB - 24 - (k % 2) * 3 + j, i === -1 ? dk(pk(c), 0.7) : pk(c)); } // flip-flops, rings, hats on strings
      blob(p, M + 16, yB - 17, 4.5, rc('#ff3c8c'), { seed: 3, amb: 0.3 }); for (let x = M + 12; x < M + 21; x++) p.set(x, yB - 17, pk('#fff4e0')); // a beach ball
      for (let y = yB - 30; y < yB - 8; y++) for (let x = W - M - 32; x < W - M - 6; x++) p.set(x, y, pick(PV.obs, 0.08, x, y));
      for (const sy of [yB - 22, yB - 15]) for (let x = W - M - 32; x < W - M - 6; x++) { p.set(x, sy, pick(PAL.wood, 0.7, x, 0)); const c = [TOWC[(x >> 2) % 5]]; p.set(x, sy - 1, pk(c[0])); p.set(x, sy - 2, pk(c[0])); p.set(x, sy - 3, dk(pk(c[0]), 0.7)); } // shelves of towels
      // the beaded curtain in the doorway
      for (let y = yB - 24; y < yB - 1; y++) for (let x = dc - 7; x < dc + 7; x++) p.set(x, y, pick(PV.obs, 0.05, x, y));
      for (let x = dc - 6; x < dc + 6; x += 2) for (let y = yB - 22; y < yB - 2; y++) p.set(x, y, y % 3 === 0 ? pk(['#ff3c8c', '#ffd030', '#3cf0ff', '#ff7a20'][(x + y) % 4 & 3]) : pk('#5a4a6a'));
      for (let x = dc - 8; x <= dc + 7; x++) { p.set(x, yB - 25, pick(PV.bamboo, 0.8, x, 0)); p.set(x, yB - 24, pick(PV.bamboo, 0.4, x, 0)); }
      for (let y = yB - 4; y <= yB; y++) for (let x = dc - 8; x < dc + 8; x++) p.set(x, y, pick(PV.stoneG, 0.55 - (y - yB + 4) * 0.08, x, y));
      awning(p, M - 5, W - M + 4, wallTop - 4, 14, '#20c8c0', '#fff4e0');
      const R = thatch(p, { x0: 2, x1: W - 3, yR: 24, yE: wallTop - 5, hx: 14, sag: 1, hem: 6, seed, R: PAL.thatchG, moss: 0 }); eaveShadow(p, 4, W - 5, R.eave, 3);
      // the signboard under the thatch
      const sw = txtWs('BEACH SHOP') + 8, sx = Math.round(dc - sw / 2); for (let y = wallTop - 33; y < wallTop - 24; y++) for (let x = sx; x < sx + sw; x++) p.set(x, y, x === sx || x === sx + sw - 1 || y === wallTop - 33 || y === wallTop - 25 ? pick(PAL.wood, 0.9, x, y) : pick(PV.teal, 0.3 + (y - wallTop + 33) * 0.03, x, y));
      txtS(p, 'BEACH SHOP', sx + 4, wallTop - 31, pk('#fff4e0'), 1);
      palmFrond(p, W - 12, 34, 1, 11); palmFrond(p, 12, 34, -1, 11);
      rim(p, 0.42, 'tl'); const c = canv(p); c.dx = -M / 16; c.smoke = smoke; return c;
    });
  }
  function forgePix(b) { // Forge & Fire Pit: pale volcanic stone, a mouth of lava-glow, a hot-orange tile roof, a tall stack
    return once(`vb${b.x},${b.y}`, () => {
      const W = b.w * 16 + 2 * M, H = 128, p = new Pix(W, H), yB = H - 1, seed = 31, dc = M + b.door * 16 + 8, smoke = [], wallTop = yB - 42;
      for (let y = wallTop; y <= yB; y++) for (let x = M; x < W - M; x++) { let c = masonryPx(x, y, wallTop, seed, PV.stoneG, 10, 5); if (y > wallTop + 22 && hash(x, y, 3) < 0.02) c = pick(PV.lava, 0.3, x, y); p.set(x, y, c); }
      oakRail(p, M, W - M - 1, wallTop - 1, 3);
      doorAt(p, dc - 6, yB - 2, 12, 22, { frame: PV.stoneG, wood: PAL.iron, step: true });
      const fx = M + 62, fw = 34, fy = yB - 32; for (let y = fy; y < yB - 1; y++) for (let x = fx; x < fx + fw; x++) { const dx = x + 0.5 - (fx + fw / 2), top = fy + 9 - Math.sqrt(Math.max(0, 17 * 17 - dx * dx)) * 0.55; if (y < top) continue; const u = Math.hypot(dx / 17, (y - (yB - 8)) / 22); p.set(x, y, u < 0.86 ? pick(PV.lava, cl(0.95 - u * 0.65 + (hash(x, y, 3) - 0.5) * 0.14), x, y) : pick(PV.char, 0.2, x, y)); }
      for (let x = fx - 3; x < fx + fw + 3; x++) for (let j = 0; j < 4; j++) p.set(x, fy - 3 + j, pick(PV.stoneG, 0.9 - j * 0.15, x, 0));
      for (let x = fx + 8; x < fx + 26; x++) for (let y = yB - 9; y < yB - 5; y++) p.set(x, y, pick(PAL.iron, cl(0.3 + (y === yB - 9 ? 0.25 : 0)), x, y)); for (let y = yB - 5; y < yB - 1; y++) for (let x = fx + 14; x < fx + 20; x++) p.set(x, y, pick(PAL.iron, 0.22, 0, 0)); // the anvil
      for (let x = fx - 6; x < fx + fw + 4; x++) { p.set(x, yB - 3, pick(PV.lava, 0.6 + hash(x, 1, 1) * 0.2, 0, 0)); p.set(x, yB - 2, pick(PV.lava, 0.4, 0, 0)); } // a trough of molten metal running out under the mouth
      bwin(p, M + 8, yB - 28, 9, 12, '#a08a74', null);
      for (let a = 0; a < 7; a++) { const ang = a / 6 * Math.PI - 0.4; p.set(dc + Math.round(Math.cos(ang) * 4), yB - 31 + Math.round(Math.sin(ang) * 4), pick(PAL.iron, 0.75, 0, 0)); }
      const R = tileRoof(p, { x0: 2, x1: W - 3, yR: 42, yE: wallTop + 3, hx: 20, seed, R: PV.rooftile, moss: 0, ch: 4, tw: 5 }); eaveShadow(p, 4, W - 5, R.eave, 4);
      for (let y = 6; y <= 66; y++) { const t = (y - 6) / 60, hw = 5 + t * 2.4, ccx = M + 26; for (let x = Math.floor(ccx - hw); x <= ccx + hw - 0.5; x++) { const u = (x + 0.5 - ccx) / hw, row = Math.floor(y / 3), bu = (x + row * 3 + 300) % 7; let v = 0.55 - u * 0.35 + (hash(Math.floor((x + row * 3) / 7), row, seed + 8) - 0.5) * 0.2; if (y % 3 === 2 || bu === 0) v -= 0.2; p.set(x, y, pick(PV.stoneG, cl(v, 0.03, 0.95), x, y)); } }
      for (let x = M + 18; x <= M + 34; x++) for (let j = 0; j < 3; j++) p.set(x, 3 + j, pick(PV.stoneG, 0.85 - j * 0.2, x, 0));
      for (let x = M + 21; x < M + 32; x++) p.set(x, 2, pick(PV.lava, 0.6 + hash(x, 2, 1) * 0.3, 0, 0));
      smoke.push([M + 26, 0]);
      // the sign: an anvil under a flame on an iron bracket
      const sx = dc + 24; for (let x = sx; x < sx + 14; x++) p.set(x, wallTop + 6, pick(PAL.iron, 0.5, x, 0)); for (let y = wallTop + 7; y < wallTop + 9; y++) p.set(sx + 12, y, pick(PAL.iron, 0.5, 0, 0));
      for (let y = wallTop + 9; y < wallTop + 25; y++) for (let x = sx + 2; x < sx + 14; x++) p.set(x, y, x === sx + 2 || x === sx + 13 || y === wallTop + 9 || y === wallTop + 24 ? pick(PAL.iron, 0.4, x, y) : pick(PV.obs, 0.1, x, y));
      for (let j = 0; j < 7; j++) for (let i = 0; i < 4 - (j > 4 ? j - 4 : 0) * 1; i++) p.set(sx + 6 + i - (j >> 1), wallTop + 11 + j, pick(PV.lava, 0.95 - j * 0.1, 0, 0)); for (let x = sx + 4; x < sx + 12; x++) p.set(x, wallTop + 20, pick(PAL.iron, 0.8, x, 0));
      rim(p, 0.42, 'tl'); const c = canv(p); c.dx = -M / 16; c.smoke = smoke; return c;
    });
  }
  function barPix(b) { // the Beach Bar: an open tiki hut, a bar-top, stools, bottles aglow, bunting
    return once(`vb${b.x},${b.y}`, () => {
      const W = b.w * 16 + 2 * M, H = 104, p = new Pix(W, H), yB = H - 1, seed = 41, dc = M + b.door * 16 + 8, smoke = [], wallTop = yB - 38;
      for (let y = wallTop; y <= yB - 6; y++) for (let x = M + 2; x < W - M - 2; x++) p.set(x, y, pick(PV.obs, 0.08 + (y - wallTop) * 0.002 + hash(x, y, 2) * 0.03, x, y));
      for (const sy of [yB - 34, yB - 25]) { for (let x = M + 4; x < W - M - 4; x++) { p.set(x, sy, pick(PAL.wood, 0.75, x, 0)); p.set(x, sy + 1, pick(PAL.wood, 0.35, x, 0)); } for (let x = M + 6; x < W - M - 6; x += 4) { const c = ['#ff3c8c', '#20c8c0', '#ffd030', '#ff7a20', '#8a60e8', '#58e068'][((x + sy) >> 2) % 6]; for (let j = 1; j < 7; j++) p.set(x, sy - j, j > 4 ? pk(c) : mix(pk(c), pk('#ffffff'), 0.2)); p.set(x + 1, sy - 3, dk(pk(c), 0.7)); p.set(x + 1, sy - 2, dk(pk(c), 0.7)); } } // glowing bottles on two shelves
      for (let y = yB - 42; y < yB - 7; y++) for (let x = M + 2; x < W - M - 2; x++) if (hash(x >> 2, y >> 2, 3) < 0.03) p.set(x, y, pk('#ffd060'));
      const cb = (x0, x1) => { for (let x = x0; x <= x1; x++) { p.set(x, yB - 20, pick(PAL.wood, 0.9, x, 0)); p.set(x, yB - 19, pick(PAL.wood, 0.6, x, 0)); for (let y = yB - 18; y < yB - 6; y++) p.set(x, y, pick(PV.bamboo, cl(0.62 - ((x - M) % 4 === 0 ? 0.2 : 0) - (y > yB - 9 ? 0.12 : 0) + (hash(x >> 2, y, 3) - 0.5) * 0.1), x, y)); } };
      cb(M + 2, dc - 9); cb(dc + 8, W - M - 3);
      for (let y = yB - 20; y < yB - 1; y++) for (let x = dc - 8; x < dc + 8; x++) { if (y < yB - 6) p.set(x, y, pick(PV.obs, 0.05, x, y)); }
      for (const sx of [dc - 6, dc + 3]) for (let y = yB - 18; y < yB - 4; y++) for (let x = sx; x < sx + 4; x++) p.set(x, y, pick(PAL.wood, cl(0.5 + (x === sx ? 0.2 : -0.1) - (y - yB + 18) * 0.01), x, y)); // saloon doors
      for (let x = dc - 8; x < dc + 8; x++) for (let y = yB - 5; y <= yB; y++) p.set(x, y, pick(PV.sand, 0.65 - (y - yB + 5) * 0.06, x, y));
      for (const sx of [M + 8, M + 20, W - M - 14, W - M - 26]) { for (let y = yB - 12; y < yB - 1; y++) { p.set(sx, y, pick(PAL.iron, 0.6, 0, 0)); p.set(sx + 1, y, pick(PAL.iron, 0.3, 0, 0)); } for (let j = 0; j < 3; j++) for (let x = sx - 3; x < sx + 5; x++) if (Math.abs(x - sx - 0.5) < 4 - (j === 2 ? 1 : 0)) p.set(x, yB - 15 + j, pick(rc('#ff3c8c'), 0.85 - j * 0.15 - (x > sx ? 0.15 : 0), x, 0)); } // stools
      for (const x of [M, W - M - 3]) { for (let y = wallTop - 4; y <= yB; y++) for (let i = 0; i < 3; i++) p.set(x + i, y, pick(PV.bamboo, cl(0.7 - i * 0.2 + (y % 10 === 0 ? -0.25 : 0)), x + i, y)); }
      const R = thatch(p, { x0: 0, x1: W - 1, yR: 24, yE: wallTop - 2, hx: 16, sag: 1, hem: 8, seed, R: PAL.thatchG, moss: 0 }); eaveShadow(p, 2, W - 3, R.eave, 4);
      for (let x = 6; x < W - 6; x++) { const yy = Math.round(wallTop + 3 + Math.sin((x - 6) / (W - 12) * Math.PI * 3) * 2); p.set(x, yy, pk('#3a2a4a')); if ((x - 6) % 8 === 3) { p.set(x, yy + 1, pk(['#ff3c8c', '#ffd030', '#20c8c0', '#ff7a20'][((x - 6) / 8 | 0) % 4])); p.set(x, yy + 2, pk('#fff4e0')); p.set(x + 1, yy + 1, pk('#ffe8a0')); } } // string lights
      // a chalkboard: today's special
      for (let y = yB - 20; y < yB - 4; y++) for (let x = M - 6; x < M + 8; x++) p.set(x, y, y === yB - 20 || x === M - 6 || x === M + 7 || y === yB - 5 ? pick(PAL.wood, 0.6, x, y) : pk('#1c2c24')); txtS(p, 'KEBAB', M - 4, yB - 17, pk('#f8f0d8'), 1); for (let x = M - 4; x < M + 6; x++) p.set(x, yB - 10, pk('#e8b060')); txtS(p, 'NOW!', M - 3, yB - 9, pk('#f8d8e8'), 1);
      palmFrond(p, W - 12, 30, 1, 11); palmFrond(p, 12, 30, -1, 11);
      rim(p, 0.42, 'tl'); const c = canv(p); c.dx = -M / 16; c.smoke = smoke; return c;
    });
  }
  function wardenPix(b) { // the Warden's hut: whitewashed, a bright red tiled roof, a flashing beacon, a flag
    return once(`vb${b.x},${b.y}`, () => {
      const W = b.w * 16 + 2 * M, H = 112, p = new Pix(W, H), yB = H - 1, seed = 53, dc = M + b.door * 16 + 8, smoke = [], wallTop = yB - 34;
      for (let y = yB - 5; y <= yB; y++) for (let x = M; x < W - M; x++) p.set(x, y, masonryPx(x, y, yB - 5, seed, PV.stoneG, 9, 3));
      stucco(p, M, W - M - 1, wallTop, yB - 6, PAL.wash, seed); for (let y = wallTop + 14; y < wallTop + 19; y++) for (let x = M; x < W - M; x++) p.set(x, y, ((x >> 3) & 1) ? pick(PV.redtile, 0.7 - (y - wallTop - 14) * 0.05, x, y) : pick(PAL.cloth, 0.9 - (y - wallTop - 14) * 0.05, x, y)); // red and white hazard band
      oakRail(p, M, W - M - 1, wallTop + 1, 2); for (const x of [M, W - M - 2]) oakPost(p, x, wallTop + 1, yB - 6);
      bwin(p, M + 7, yB - 24, 9, 11, '#fff4e0', '#e83030'); bwin(p, W - M - 16, yB - 24, 9, 11, '#fff4e0', '#e83030');
      doorAt(p, dc - 5, yB - 2, 11, 19, { frame: PAL.wash, wood: PV.redtile, step: true });
      const R = tileRoof(p, { x0: 2, x1: W - 3, yR: 32, yE: wallTop + 3, hx: 15, seed, R: PV.redtile, moss: 0, ch: 4, tw: 5 }); eaveShadow(p, 4, W - 5, R.eave, 4);
      // beacon on the ridge: an orange lamp under a glass dome
      const bx = W / 2; for (let y = 20; y < 32; y++) for (let x = bx - 5; x < bx + 5; x++) p.set(x, y, pick(PAL.iron, 0.4 + (x - bx + 5) * 0.03, x, y)); for (let y = 12; y < 22; y++) for (let x = bx - 5; x < bx + 5; x++) { const dx = (x + 0.5 - bx) / 5, dy = (y + 0.5 - 21) / 9; if (dx * dx + dy * dy > 1) continue; p.set(x, y, pick(PV.lava, cl(0.8 - dx * 0.3 - dy * 0.2), x, y)); } for (let k = 0; k < 4; k++) p.set(bx + 2, 14 + k, pk('#fff0a0'));
      // the flag: a black cone belching orange on white, on a pole
      for (let y = 0; y < 32; y++) p.set(W - M - 14, y + 2, pick(PAL.iron, 0.6, 0, 0)); for (let y = 2; y < 15; y++) for (let x = W - M - 13; x < W - M + 6; x++) { const wv = Math.round(Math.sin((x - W) * 0.4) * 0.8); p.set(x, y + wv, pk('#fff4e0')); } for (let j = 0; j < 6; j++) for (let i = 0; i < 8 - j * 1.2; i++) p.set(W - M - 9 + Math.floor(j * 0.6) + i, 12 - j, pk('#201018')); p.set(W - M - 7, 5, pk('#ff7a14')); p.set(W - M - 6, 4, pk('#ffd060')); p.set(W - M - 5, 6, pk('#ff7a14'));
      // a sign over the door
      const sw = txtWs('WARDEN') + 8, sx = Math.round(dc - sw / 2); for (let y = wallTop + 4; y < wallTop + 13; y++) for (let x = sx; x < sx + sw; x++) p.set(x, y, x === sx || x === sx + sw - 1 || y === wallTop + 4 || y === wallTop + 12 ? pick(PAL.cloth, 0.9, x, y) : pick(PV.redtile, 0.4, x, y)); txtS(p, 'WARDEN', sx + 4, wallTop + 6, pk('#fff4e0'), 1);
      smoke.push(chimney(p, 12, 26, 56, { lean: 1, w: 8, R: PV.stoneG }));
      rim(p, 0.42, 'tl'); const c = canv(p); c.dx = -M / 16; c.smoke = smoke; return c;
    });
  }
  const BUILD = { kiln_inn: loungeInn, kiln_shop: bambooShop, kiln_smith: forgePix, kiln_bar: barPix, kiln_warden: wardenPix };

  // neon: a black panel with letters that flicker between bright and dim
  const neonSign = (kind, f) => once(`vneon${kind}${f}`, () => {
    const lit = f !== 2, c1 = lit ? '#ff3c8c' : '#8a2050', c2 = lit ? '#3cf0ff' : '#1a6a78';
    if (kind === 'inn') { const p = new Pix(52, 28); for (let y = 0; y < 28; y++) for (let x = 0; x < 52; x++) p.set(x, y, y < 1 || y > 26 || x < 1 || x > 50 ? pick(PAL.iron, 0.4, x, y) : pick(PV.obs, 0.04, x, y));
      for (let x = 3; x < 49; x++) { p.set(x, 2, pk(c2)); p.set(x, 25, pk(c2)); } txtS(p, 'LAVA', 7, 5, pk('#ff3c8c40'), 2); txtS(p, 'LAVA', 6, 4, pk(c1), 2); txtS(p, 'LOUNGE', 7, 17, pk(c2), 1); for (let k = 0; k < 4; k++) p.set(44 + (k & 1), 16 - k * 2, pk(lit ? '#ffa830' : '#7a4a14')); outline(p, 0.35); return canv(p); }
    const p = new Pix(46, 28); for (let y = 0; y < 28; y++) for (let x = 0; x < 46; x++) p.set(x, y, y < 1 || y > 26 || x < 1 || x > 44 ? pick(PAL.iron, 0.4, x, y) : pick(PV.obs, 0.04, x, y));
    for (let y = 4; y < 12; y++) for (let x = 4; x < 14; x++) { const t = (y - 4) / 8, hw = 5 - t * 4.4; if (y < 8 ? Math.abs(x - 8.5) < hw + 0.5 + (y === 4 ? 0.5 : 0) : Math.abs(x - 8.5) < 0.7 + (y > 10 ? 0 : 0)) p.set(x, y, pk(c1)); } for (let x = 5; x < 13; x++) p.set(x, 12, pk(c1)); p.set(13, 5, pk('#ffd030')); p.set(14, 4, pk('#ffd030')); p.set(13, 6, pk('#58e068'));
    txtS(p, 'BAR', 17, 6, pk(c2), 2); for (let x = 3; x < 43; x++) { p.set(x, 18, pk(c2)); } txtS(p, 'OPEN', 13, 20, pk(lit ? '#ffd030' : '#7a6010'), 1); outline(p, 0.35); return canv(p);
  });
  const ash = (k) => once('vash' + k, () => { const r = 3 + k * 1.5, S = 24, p = new Pix(S, S); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const d = Math.hypot(x + 0.5 - S / 2, y + 0.5 - S / 2 + 1) / r + (vnoise(x, y, 3, 5) - 0.5) * 0.35; if (d > 1) continue; p.set(x, y, pick(PV.basalt, cl(0.5 - d * 0.35 + (y > S / 2 ? 0.2 : 0) - (k > 3 ? 0.2 : 0)), x, y)); if (y > S / 2 + 1 && d < 0.9 && hash(x, y, 4) < 0.35 && k < 4) p.set(x, y, mix(p.get(x, y), pk('#ff7a14'), 0.4)); } return canv(p); });
  const dkc = (c) => c;

  // ---------------------------------------------------------------- ground decoration
  const PSH = { tiki: (S, pr) => shEll(S, pr.x * 16 + 11, pr.y * 16 + 14, 5, 2), parasol: (S, pr) => shEll(S, pr.x * 16 + 13, pr.y * 16 + 14, 12, 2.5), lounger: (S, pr) => shEll(S, pr.x * 16 + 17, pr.y * 16 + 15, 14, 2), grill: (S, pr) => shEll(S, pr.x * 16 + 18, pr.y * 16 + 15, 14, 2.5), groom: (S, pr) => shEll(S, pr.x * 16 + 11, pr.y * 16 + 14, 6, 2) };
  function decorate(m, S) {
    const { P, O, W, H } = S, base = m.base, at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '' : base[y][x]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = base[y][x];
      if (c === '#' && at(x, y + 1) !== '#' && at(x, y + 1) !== '') shRect(S, x * 16, (y + 1) * 16, 16, 4);
      if (c === 'T') shEll(S, x * 16 + 12, y * 16 + 13, 10, 4); if (c === 'h' && at(x, y + 1) !== 'h') shRect(S, x * 16 + 1, (y + 1) * 16, 15, 2); }
    for (const b of m.buildings || []) { const R0 = (b.x + b.w) * 16; for (let k = 0; k < 10; k++) shRect(S, R0 + k, b.y * 16 + 6 + k, 1, b.h * 16 - 6 - k); shRect(S, b.x * 16 + 2, (b.y + b.h) * 16, b.w * 16 - 2, 1); }
    for (const f of S.cen) shEll(S, (f.x + f.w / 2) * 16 + 5, (f.y + f.h) * 16 - 4, f.w * 8, 5);
    for (const pr of m.props || []) { PSH[pr.k]?.(S, pr); if (PROPS[pr.k]) shEll(S, pr.x * 16 + propPix(pr.k).w / 2 + 3, pr.y * 16 + 14, propPix(pr.k).w / 2 - 1, 2.5); }
    // hibiscus: dark glossy leaves, hot pink and orange blooms
    const hm = new Set(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (base[y][x] === 'h') for (const [ox, oy] of [[4, 5], [12, 5], [8, 3], [4, 11], [12, 11], [8, 9]]) blob(P, O + x * 16 + ox + (hash(x, y, ox) - 0.5) * 2, O + y * 16 + oy, 5, PV.jungle, { seed: x * 7 + y, rimDark: 0.25, mask: hm, amb: 0.15 });
    edgeMask(P, hm, PV.jungle[0]);
    for (const i of hm) { const x = i % P.w, y = (i / P.w) | 0, h = hash(x, y, 41); if (h < 0.05) { P.d[i] = pk('#ff3c8c'); if (hash(x, y, 5) < 0.5) P.d[i + 1] = pk('#ff8ab8'); } else if (h < 0.08) P.d[i] = pk('#ffd030'); else if (h < 0.1) P.d[i] = pk('#ff7a20'); }
    for (const pr of m.props || []) { if (pr.k === 'towel') P.blit(towelPix(pr.c ?? 0), O + pr.x * 16, O + pr.y * 16); else if (PROPS[pr.k]) P.blit(propPix(pr.k), O + pr.x * 16, O + pr.y * 16); }
    // ash flecks and glowing cracks round the lava
    if (S.LV) for (let gy = 0; gy * 5 < S.GH; gy++) for (let gx = 0; gx * 7 < S.GW; gx++) { const px = gx * 7 + Math.floor(hash(gx, gy, 211) * 7), py = gy * 5 + Math.floor(hash(gx, gy, 212) * 5), w = S.LV[py * S.GW + px] || 0; if (w > 0.22 && w < 0.36 && hash(gx, gy, 213) < 0.5) { P.set(px, py, pick(PV.lava, 0.35 + hash(gx, gy, 214) * 0.4, px, py)); if (hash(gx, gy, 215) < 0.5) P.set(px + 1, py, pick(PV.lava, 0.25, px, py)); } }
  }

  // ---------------------------------------------------------------- animated pools: lava (slow crawling plates) and spring
  function waterPix(kind, f) {
    const p = new Pix(64, 64), ph = (f / 8) * 64;
    if (kind === 'v-lava') {
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        const a = vnoise(x + ph * 0.5, y * 1.4, 16, 3, 64), b = vnoise(x - ph * 0.5, y * 1.4 + 9, 16, 5, 64), c = vnoise(x, y, 32, 7, 64); let v = 0.5 + (a + b - 1) * 0.5 + (c - 0.5) * 0.2; const crack = Math.abs(a - b);
        if (crack < 0.05) v += 0.3; const crust = vnoise(x + ph * 0.25, y, 22, 9, 64) + (c - 0.5) * 0.3; if (crust > 0.64) p.set(x, y, pick(PV.basalt, cl(0.16 + (crust - 0.64) * 1.2 + hash(x, y, 2) * 0.1), x, y)); else p.set(x, y, pick(PV.lava, cl(v * 0.9 + 0.1, 0.1, 1), x, y));
      }
      for (let i = 0; i < 6; i++) { const x = Math.floor(hash(i, f >> 1, 77) * 62), y = Math.floor(hash(i, f >> 1, 78) * 62); if (hash(i, f, 79) < 0.6) { p.set(x, y, pk('#fff0a0')); p.set(x + 1, y, pk('#ffd060')); } } return p;
    }
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const a = vnoise(x + ph, y * 2.2, 16, 3, 64), b = vnoise(x - ph, y * 2.2 + 9, 16, 5, 64), c = vnoise(x, y, 32, 7, 64); let v = 0.5 + (a + b - 1) * 0.4 + (c - 0.5) * 0.25; const crest = Math.abs(a - b); if (crest < 0.035 && a > 0.55) v += 0.3; p.set(x, y, pick(PV.spring, cl(v, 0, 0.9), x, y)); }
    return p;
  }
  const kindAt = (get, x, y) => { const L = (dx, dy) => get(x + dx, y + dy) === 'L'; return get(x, y) === 'L' || (get(x, y) !== '~' && (L(1, 0) || L(-1, 0) || L(0, 1) || L(0, -1) || L(1, 1) || L(-1, 1) || L(1, -1) || L(-1, -1))) ? 'v-lava' : 'v-spring'; };

  // ---------------------------------------------------------------- the draw hooks
  function mapObjects(m, t, out) {
    for (const b of m.buildings || []) {
      const img = (BUILD[b.to] || loungeInn)(b), bx = b.x + (img.dx || 0), by = b.y + b.h - img.height / 16;
      out.push({ img, x: bx, y: by, z: 1, sy: b.y + b.h });
      for (const [i, [sx, sy]] of (img.smoke || []).entries()) for (let n = 0; n < 3; n++) { const u = (t * 0.3 + n / 3 + (b.x + i * 7) * 0.13) % 1, k = Math.min(4, Math.floor(u * 5)); out.push({ img: puffPix(k), x: bx + sx / 16 - 0.375 + u * 0.55 + Math.sin(u * 5 + b.x + i) * 0.12, y: by + sy / 16 - 0.4 - u * 1.4, z: 2 }); }
      const fl = Math.floor(t * 6 + b.x) % 11 === 0 ? 2 : Math.floor(t * 2) % 2;
      if (b.to === 'kiln_inn') out.push({ img: neonSign('inn', fl), x: bx + 38 / 16, y: by + 30 / 16, z: 1, sy: b.y + b.h + 0.02 });
      if (b.to === 'kiln_bar') out.push({ img: neonSign('bar', fl), x: bx + 50 / 16, y: by + 34 / 16, z: 1, sy: b.y + b.h + 0.02 });
    }
    for (const f of fountains(m)) { out.push({ img: springPix(f.w, f.h, Math.floor(t * 6) % 4), x: f.x, y: f.y - 1, z: 1, sy: f.y + f.h });
      for (let i = 0; i < 6; i++) { const u = (t * 0.28 + i / 6) % 1; out.push({ img: puffPix(Math.min(4, Math.floor(u * 5))), x: f.x + f.w / 2 - 0.375 + Math.sin(u * 4 + i * 2) * 0.35 + (i % 3 - 1) * 0.25, y: f.y - 0.9 - u * 1.7, z: 2 }); } }
    for (const pr of m.props || []) {
      const { k, x, y } = pr;
      if (k === 'tiki') putSprite(out, tikiPix(Math.floor(t * 7 + x * 3) % 3), x + 0.25, y + 1);
      else if (k === 'parasol') putSprite(out, parasolPix(pr.c || 'pink'), x - 0.6, y + 1.05);
      else if (k === 'lounger') putSprite(out, loungerPix(), x, y + 1);
      else if (k === 'grill') { putSprite(out, grillPix(Math.floor(t * 5 + x) % 2), x, y + 1.4);
        for (let n = 0; n < 3; n++) { const u = (t * 0.35 + n / 3) % 1; out.push({ img: puffPix(Math.min(4, Math.floor(u * 5))), x: x + 0.9 + Math.sin(u * 5 + n) * 0.2, y: y - 0.4 - u * 1.3, z: 2 }); } }
      else if (k === 'groom') { putSprite(out, groomPix(), x - 0.1, y + 1.05); putSprite(out, tikiPix(Math.floor(t * 7 + 2) % 3), x + 0.85, y + 1); }
      else if (k === 'arch') { const w = pr.w || 2; for (const px of [x - 1, x + w]) putSprite(out, archPost(), px, y + 2); out.push({ img: archLintel(w, Math.floor(t * 3.3) % 11 === 0 ? 1 : Math.floor(t * 0.9) % 4 === 3 ? 3 : 0), x: x - 1, y: y - 0.75, z: 2 }); }
    }
    // ash trailing from the crater across the dusk sky, over the skyline (flat, behind everything else)
    for (let i = 0; i < 9; i++) { const u = (t * 0.045 + i / 9) % 1, k = Math.min(5, Math.floor(u * 6)); out.push({ img: ash(k), x: CXV / 16 - 0.7 + u * 7.5, y: (CY0 - 8) / 16 - u * 0.8 + Math.sin(u * 6 + i) * 0.1 - 0.4, z: 0 }); }
  }
  const pulse = (t) => 0.32 + 0.2 * Math.sin(t * 1.6) + 0.1 * Math.sin(t * 4.3);
  function overlay(ctx, t, TS, X, Y) { // red-orange heat haze, deeper toward the south, and glows round the lava
    const w = ctx.canvas.width, h = ctx.canvas.height, g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,90,40,.10)'); g.addColorStop(1, 'rgba(255,70,20,.14)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const glow = (wx, wy, r, a) => { const gx = X + wx * TS, gy = Y + wy * TS, rr = r * TS; if (gx + rr < 0 || gy + rr < 0 || gx - rr > w || gy - rr > h) return; const gr = ctx.createRadialGradient(gx, gy, 2, gx, gy, rr); gr.addColorStop(0, `rgba(255,110,30,${a})`); gr.addColorStop(1, 'rgba(255,110,30,0)'); ctx.fillStyle = gr; ctx.fillRect(gx - rr, gy - rr, rr * 2, rr * 2); };
    const f = 0.85 + 0.15 * Math.sin(t * 2.3) + 0.06 * Math.sin(t * 7.1);
    glow(24, 22, 6.5, 0.2 * f); glow(18.5, 6, 3, 0.16 * f); glow(14.5, 1.5, 7, 0.14 * f);
    for (const pr of overlay.props || []) if (pr.k === 'tiki' || pr.k === 'groom') glow(pr.x + 0.8, pr.y + 0.3, 2.4, 0.13 * (0.8 + 0.2 * Math.sin(t * 9 + pr.x)));
    ctx.restore();
  }
  return { cls: { ',': CLS.DIRT, _: CLS.ST, E: CLS.ST, ':': CLS.PLZ, F: CLS.PLZ, '~': CLS.WAT, L: CLS.LAVA, '#': CLS.WALL, M: CLS.MTN }, land, dirt: sand, cobble, plaza: (x, y) => plaza(x, y), lawn: land, pond, lavapool, wall, mtn,
    kerb: (px, py) => pick(PV.obs, 0.2 + hash(px, py, 3) * 0.1, px, py), plazaEdge: (px, py) => pick(PV.obs, 0.1, px, py), dirtEdge: (px, py) => pick(PV.sand, 0.22, px, py), lawnEdge: () => 0,
    decorate: (m, S) => { overlay.props = m.props; decorate(m, S); }, shade: [0.5, 0.46, 0.55, 8], kindAt, waterPix, tree, mapObjects, overlay, pulse, glowTest: hot };
}
