// ===== Overworld renderer (16-bit style): the whole world is painted once into a pixel bake, then served per tile =====
// Interface used by game.js draw():
//   isTheme(theme)                         -> true if this module draws that map theme
//   ground(theme, get, x, y, t)            -> 16x16 canvas for the ground of tile (x, y); get(x, y) = map char, t = seconds
//   objects(theme, get, x, y, t, out, m)   -> push draw items for tile (x, y) into out
//   mapObjects(m, t, out, ctx)             -> push map-level draw items (multi-tile structures, props) into out
// A draw item is { img, x, y, w, h, z, sy }: position/size in TILE units (w/h default img size / 16), z: 0 = flat on the
// ground (drawn before characters), 1 = depth-sorted with characters by sy (default y + h), 2 = above everything.
//
// How it works: bake() reads GEN.world once and paints every pixel of the map (plus an ocean margin) with global knowledge:
// organic coastlines with rock cliffs dropping into the sea, textured grass/snow/swamp/desert blended with dither,
// forests built from hundreds of overlapping tree crowns, mountain ranges built from overlapping snow-capped peaks,
// rivers, bridges and a canyon pass. Water pixels stay "dynamic": each tile that shows water is composed for 8 animation
// frames (depth shading, shimmering ripples, surf lines, waterfalls) and cached. Open ocean tiles share 16 cached tiles.
// Towns, caves, the shrine, the tower, ruins and the ship are separate sprites drawn as depth-sorted items.
import { GEN } from './mapgen.js';
import { mk, hex, fracMask } from './autotile.js';

const PAD = 6, FRAMES = 8, FPS = 4;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bay = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];
const h2 = (x, y, s = 0) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const NT = new Float32Array(65536); for (let i = 0; i < 65536; i++) NT[i] = h2(i, 7, 3);
function vn(x, y, s = 0) { // value noise from a lattice table (fast enough to run per pixel over the whole bake)
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const ox = (xi + s * 131) & 255, oy = ((yi + s * 71) & 255) << 8, ox1 = (ox + 1) & 255, oy1 = (oy + 256) & 65280;
  const a = NT[ox | oy], b = NT[ox1 | oy], c = NT[ox | oy1], d = NT[ox1 | oy1];
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
const fbm = (x, y, s) => vn(x, y, s) * 0.62 + vn(x * 2.13, y * 2.13, s + 7) * 0.28 + vn(x * 4.37, y * 4.37, s + 13) * 0.1;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const frac = (v) => v - Math.floor(v);
const pal = (s) => s.split(' ').map(hex);

// ---------- palettes (dark -> light) ----------
const GRASS = pal('#0b3210 #124a16 #1b621c #257a22 #32922a #42a832 #56bc3c #72ce4c #96e068 #c0f08c');
const AMBER = pal('#3a2406 #5a3a0c #7c5212 #9c6c1a #bc8a26 #d8a634 #ecc044 #f8d864 #fff0a0'); // Hopsend's golden stubble and fallen leaves
const ASH = pal('#0a0808 #141010 #1e1816 #2a2220 #382e2a #4a3e38 #5e504a #766660'); // Cinder Isle: black basalt
const LAVA = pal('#5a0a00 #a01c00 #e04800 #ff8a10 #ffd040');
const SNOW = pal('#3a4878 #56689a #7686b8 #96a8d4 #b4c6e8 #d0def4 #e8f0fc #ffffff');
const SWAMP = pal('#0e160a #172210 #213016 #2c3e1c #384e22 #465e28 #566e30 #6a823a #82964a');
const POOL = pal('#0c1e1c #12302c #1a423c #26584c #3a7060 #5a8a74');
const SAND = pal('#5a3a1a #7a5226 #9a6c34 #b88646 #cfa05a #e0b872 #ecce8e #f6e2b2 #fff2d4');
const DIRT = pal('#2e1e10 #4a3018 #664424 #845a30 #a0723e #ba8c52 #d0a668');
const OCEAN = pal('#06164e #0a2268 #0e2e84 #143a9e #1c4ab6 #285ecc #3876de #5894ea #94c0f6 #e4f2ff');
const CLIFF = { // rock faces where land drops into water, by the land's region
  0: pal('#22140c #362214 #4c321c #644426 #7e5a32 #987040 #b08852 #c8a46c'),
  1: pal('#1c2236 #2a3450 #3c486a #525e84 #6c7a9e #8a98b8 #aab6d0 #ccd6e8'),
  2: pal('#141410 #222016 #302c1e #403a26 #524a30 #665c3a #7a7046 #908656'),
  3: pal('#3a200c #562e12 #74421a #925824 #ae7032 #c68a44 #daa45a #ecc078'),
};
CLIFF[4] = CLIFF[0];
CLIFF[5] = pal('#0c0a0a #181212 #241a1a #342626 #483434 #5e4444 #765656 #906e6e');
const FOREST = {
  5: pal('#0a0606 #140c0a #1e1210 #2a1812 #3a2016 #4c2a1a #6a3a1c #8a4a1e #b05a20 #d87a28 #ffa040'), // charred trees with glowing tips
  4: pal('#2a0c04 #4a1608 #6a220c #8c3412 #b04c18 #cc6a20 #e08a2c #f0aa40 #f8c860 #fce090 #ffffe0'), // autumn woods: rust, orange, gold
  0: pal('#021008 #04180a #07240e #0c3412 #134616 #1c5a1c #267024 #32882c #44a034 #62b844 #8ad060'),
  2: pal('#080e06 #0e160a #141e0e #1c2a12 #263616 #30441c #3c5222 #4a6228 #5a7230 #6e8438 #889c48'),
};
const PINE = pal('#020c0c #041612 #08221a #0e3024 #163e2e #204e3a #2c6048 #3c7458');
const ROCK = pal('#1a120e #2c2018 #403022 #56422e #6e573c #88704c #a28a62 #bca47c #d4c09a #e8dcbc'); // lit faces
const SHADE = pal('#14141e #1e1e2c #2a2a3c #38384e #484862 #5a5a76 #6e6e8a'); // shadow faces
const ICE = pal('#7a86b0 #98a6cc #b8c6e4 #d4e0f4 #eef4fe #ffffff'); // snow caps
const MESA = pal('#2e160a #4a2410 #683618 #864a22 #a6622e #c27c3e #d89a56 #ecb874 #f8d498');
const STONE = pal('#24201c #3a342c #524a3e #6a6052 #847a68 #9e9480 #b8ae9a #d2cab6 #ece6d4');

// ---------- the bake ----------
let BK = null;
function* bakeGen() { // generator: yields often so the bake can run in idle slices before the player reaches the world
  const PROF = [], T0 = performance.now(), mark = (n) => PROF.push(n + ':' + Math.round(performance.now() - T0));
  const ROWS = GEN.world, W = ROWS[0].length, H = ROWS.length, TW = W + PAD * 2, TH = H + PAD * 2, PW = TW * 16, PH = TH * 16, N = PW * PH;
  const ch = (tx, ty) => { const x = tx - PAD, y = ty - PAD; return x < 0 || y < 0 || x >= W || y >= H ? '~' : ROWS[y][x]; };
  const poiAt = {}; for (const [k, [x, y]] of Object.entries(GEN.pois)) poiAt[`${x + PAD},${y + PAD}`] = k;
  const isCaveTile = (tx, ty) => ['cavern', 'storm', 'spire'].includes(poiAt[`${tx},${ty}`]);
  // region of every tile: 0 grass, 1 snow, 2 swamp, 3 desert; features take the region of their surroundings
  const AU = GEN.deco?.autumn || [1e9, 1e9, -1, -1]; // the autumn island (Hopsend) is a rectangle of 'grass' that is painted as region 4
  const EM = GEN.deco?.ember || [1e9, 1e9, -1, -1];
  const own = (c, tx, ty) => (c === '.' ? (tx - PAD >= EM[0] && tx - PAD <= EM[2] && ty - PAD >= EM[1] && ty - PAD <= EM[3] ? 5 : tx - PAD >= AU[0] && tx - PAD <= AU[2] && ty - PAD >= AU[1] && ty - PAD <= AU[3] ? 4 : 0) : c === ',' || c === 't' ? 1 : c === ':' ? 2 : c === 'd' ? 3 : -1);
  const reg = new Int8Array(TW * TH);
  for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) {
    let r = own(ch(tx, ty), tx, ty);
    if (r < 0) { const n = [0.5, 0, 0, 0, 0, 0]; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const o = own(ch(tx + dx, ty + dy), tx + dx, ty + dy); if (o >= 0) n[o] += Math.abs(dx) + Math.abs(dy) <= 1 ? 3 : 1; } r = n.indexOf(Math.max(...n)); }
    reg[ty * TW + tx] = r;
  }
  const isWater = (c) => c === '~' || c === 'r' || c === '=';
  const isRiver = (c) => c === 'r' || c === '=';
  const isMount = (c, tx, ty) => c === 'M' || c === 'B' || (c === 'D' && isCaveTile(tx, ty));
  const isForest = (c) => c === 'T' || c === 't';
  const bits = (tx, ty, f) => { let s = ''; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += f(ch(tx + dx, ty + dy), tx + dx, ty + dy, reg[clamp(ty + dy, 0, TH - 1) * TW + clamp(tx + dx, 0, TW - 1)]) ? '1' : '0'; return s; };
  const ONE = new Float32Array(256).fill(1), ZERO = new Float32Array(256);
  const mask = (b, r) => (b === '000000000' ? ZERO : b === '111111111' ? ONE : fracMask(b, r));

  mark('// ---- 1. c'); yield;
  // ---- 1. classify pixels: 0 ocean, 1 river, 2 land, 3 forest floor, 4 mountain, 5 canyon; plus region per pixel
  const cls = new Uint8Array(N), rpx = new Uint8Array(N), fmask = new Float32Array(N);
  for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) {
    if (!tx && !(ty & 1)) yield;
    const wb = bits(tx, ty, isWater);
    if (wb === '111111111' && !isRiver(ch(tx, ty))) continue; // open ocean: cls 0 already
    const mW = mask(wb, 6), mR = mask(bits(tx, ty, isRiver), 6), mO = mask(bits(tx, ty, (c) => c === '~'), 6);
    const mM = mask(bits(tx, ty, isMount), 5), mF = mask(bits(tx, ty, isForest), 6);
    const mRg = [1, 2, 3, 4, 5].map((k) => mask(bits(tx, ty, (c, x, y, r) => r === k), 8));
    const ownRiver = isRiver(ch(tx, ty));
    const rgOne = mRg.findIndex((m) => m === ONE), rgFlat = mRg.every((m) => m === ZERO || m === ONE);
    for (let p = 0; p < 256; p++) {
      const X = tx * 16 + (p & 15), Y = ty * 16 + (p >> 4), i = Y * PW + X;
      const riverish = ownRiver || (mR[p] > 0.01 && mR[p] >= mO[p]);
      const w = mW === ZERO ? 0 : mW[p] + (riverish ? vn(X / 5, Y / 5, 2) * 0.12 : fbm(X / 11, Y / 11, 1) * 0.26);
      // region: argmax with noisy, dithered borders
      let r = rgOne + 1;
      if (!rgFlat) { let best = 0.5 + fbm(X / 16, Y / 16, 20) * 0.22; r = 0; for (let k = 0; k < 5; k++) { if (mRg[k] === ZERO) continue; const v = mRg[k][p] + fbm(X / 15, Y / 15, 21 + k) * 0.34 + (bay(X, Y) - 0.5) * 0.14; if (v > best) { best = v; r = k + 1; } } }
      rpx[i] = r; fmask[i] = mF[p];
      if (w > 0.5) { cls[i] = riverish ? 1 : 0; continue; }
      if (mM !== ZERO && mM[p] + vn(X / 6, Y / 6, 3) * 0.22 > 0.5) cls[i] = 4;
      else if (mF !== ZERO && mF[p] + vn(X / 5, Y / 5, 5) * 0.2 > 0.5) cls[i] = 3;
      else cls[i] = 2;
    }
  }
  // canyon through the gate column
  const gate = []; ROWS.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'B') gate.push([x + PAD, y + PAD]); }));
  const canyonAt = (X, Y) => gate.some(([tx, ty]) => Y >= ty * 16 && Y < ty * 16 + 16 && Math.abs(X - (tx * 16 + 7.5)) <= 5 + (vn(Y / 4, tx, 61) * 0.8));

  const S = new Uint8ClampedArray(N * 4); // static colours (alpha 255 = static pixel)
  const kind = new Uint8Array(N); // 0 dynamic water, 1 ground, 2 rock face, 3 crown, 4 forest floor, 5 peak, 6 canyon, 7 bridge
  const put = (i, c) => { const j = i * 4; S[j] = c[0]; S[j + 1] = c[1]; S[j + 2] = c[2]; S[j + 3] = 255; };
  const shade = (i, k) => { const j = i * 4; S[j] = S[j] * k; S[j + 1] = S[j + 1] * k; S[j + 2] = S[j + 2] * k; };

  mark('// ---- 2. g'); yield;
  // ---- 2. ground textures
  const groundCol = (X, Y, r, i) => {
    const n1 = fbm(X / 30, Y / 30, 31), n2 = vn(X / 5, Y / 5, 33), d = bay(X, Y) - 0.5, hh = h2(X, Y, 35);
    if (r === 1) { // snow: soft blue drifts and wind lines
      const rl = (fbm((X - 2) / 14, (Y - 2) / 14, 38) - fbm((X + 2) / 14, (Y + 2) / 14, 38)) * 4.5;
      let v = 4.9 + n1 * 0.7 + rl + n2 * 0.3 + d * 0.9; const q = frac((Y + vn(X / 16, Y / 16, 36) * 7 + X * 0.15) / 7);
      if (q < 0.1 && vn(X / 6, Y / 3, 37) > -0.1) v -= 1; else if (q < 0.2) v += 0.5; if (hh > 0.99) v = 7;
      return SNOW[clamp(Math.round(v), 2, 7)];
    }
    if (r === 2) { // swamp: murky moss with dark pools
      const pl = fbm(X / 15, Y / 15, 41) - 0.06;
      if (pl > 0.3) { const v = 3.2 - (pl - 0.3) * 6 + d * 0.8 + (hh > 0.93 ? 2 : 0); return pl < 0.34 ? SWAMP[1] : POOL[clamp(Math.round(v), 0, 5)]; }
      let v = 4 + n1 * 1.3 + n2 * 0.6 + d * 1.1; if (hh < 0.05) v -= 1.5; else if (hh > 0.985) v += 1.2;
      return SWAMP[clamp(Math.round(v), 1, 8)];
    }
    if (r === 3) { // desert: dune ripples and pebbles
      let v = 5 + n1 * 0.6 + (fbm((X - 2) / 16, (Y - 2) / 16, 52) - fbm((X + 2) / 16, (Y + 2) / 16, 52)) * 7 + d * 0.9; const q = frac((Y + vn(X / 22, Y / 22, 51) * 8 + X * 0.22) / 6);
      if (q < 0.14) v -= 1.4; else if (q < 0.3) v += 0.8; if (hh < 0.01) v = 2; else if (hh > 0.993) v = 7;
      return SAND[clamp(Math.round(v), 2, 8)];
    }
    // grass: bright, textured, darker patches, darker under woods and mountains
    let v = 4.7 + n1 * 1.5 + n2 * 0.7 + d * 1.15 - Math.max(0, fmask[i] - 0.15) * 2.2;
    if (hh < 0.07) v -= 1.7; else if (hh > 0.955) v += 1.3;
    if (r === 5) { const cr = Math.abs(fbm(X / 10, Y / 10, 61) - 0.5); if (cr < 0.02 + (hh > 0.97 ? 0.01 : 0)) return LAVA[clamp(Math.round(1.5 + (0.02 - cr) * 160 + hh), 0, 4)]; return ASH[clamp(Math.round(v - 0.8 + d * 0.5), 0, 7)]; }
    if (r === 4) return AMBER[clamp(Math.round(v + 0.2), 1, 8)];
    return GRASS[clamp(Math.round(v), 1, 8)];
  };
  for (let i = 0; i < N; i++) { if (!(i & 32767)) yield; if (cls[i] >= 2) { put(i, groundCol(i % PW, (i / PW) | 0, rpx[i], i)); kind[i] = 1; } }
  // grass tufts, reeds, snow sparkle (little multi-pixel marks)
  for (let i = 0; i < N; i++) {
    if (cls[i] !== 2) continue; const X = i % PW, Y = (i / PW) | 0, r = rpx[i], hh = h2(X, Y, 37);
    if ((r === 0 || r === 4) && hh < 0.022 && X > 1 && X < PW - 2 && Y > 1) { const TF = r === 4 ? AMBER : GRASS; for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1]]) if (cls[i + dx + dy * PW] === 2) put(i + dx + dy * PW, TF[2]); put(i - PW, TF[7]); }
    if (r === 2 && hh < 0.006 && Y > 3) { const c = hh < 0.015 ? SWAMP[7] : SWAMP[6]; put(i, SWAMP[2]); put(i - PW, c); put(i - 2 * PW, c); put(i - 3 * PW, SWAMP[8]); }
  }

  mark('// ---- 3. w'); yield;
  // ---- 3. water pixels: cliffs (land falls into the sea), banks (rivers), waterfalls (river over a sea cliff)
  const wT = new Uint8Array(N), wD = new Uint8Array(N), wF = new Uint8Array(N); // type 1 ocean 2 river 3 fall; dist; fall depth
  for (let X = 0; X < PW; X++) {
    if (!(X & 63)) yield;
    let above = -1, run = 0, upRegion = 0; // what lies above the current run of water: -1 none, 2 land, 1 river
    const ch0 = 6.4 + vn(X / 7, 3, 70) * 2;
    for (let Y = 0; Y < PH; Y++) {
      const i = Y * PW + X, c = cls[i];
      if (c >= 2) { above = 2; run = 0; upRegion = rpx[i]; continue; }
      run++;
      if (c === 1) { // river
        wT[i] = 2;
        if (above === 2 && run <= 2) { const C = CLIFF[upRegion]; put(i, run === 1 ? C[5] : C[2]); kind[i] = 2; }
        else if (above === 2 || above === 1) { above = 1; run = 0; }
        continue;
      }
      wT[i] = 1;
      if (above === 1 && run <= 9) { wT[i] = 3; wF[i] = run; continue; } // waterfall: river water spilling over the sea cliff
      if (above === 2 && run <= ch0 + 1.5 * vn(X / 3, 9, 71)) { // cliff face
        const C = CLIFF[upRegion], hgt = ch0, t = run / hgt, slab = vn(X / 2.6, 5, 72), crack = h2(X, 0, 73) < 0.16 || (slab > 0.55 && slab < 0.66);
        let v = 5.6 - t * 3.3 + (slab > 0 ? 0.6 : -0.3) + (bay(X, Y) - 0.5) * 0.9;
        if (run === 1) v = 7; else if (crack) v -= 2.4; else if (h2(X - 1, 0, 73) < 0.16) v += 1.2;
        put(i, C[clamp(Math.round(v), 0, 7)]); kind[i] = 2; continue;
      }
      above = -1;
    }
  }
  // side faces: sea pixels beside land get a thin rock wall; land lips above water
  for (let i = 0; i < N; i++) {
    if (cls[i] > 1 || kind[i]) continue; const X = i % PW, Y = (i / PW) | 0; if (X < 4 || X >= PW - 4 || Y < 2 || Y >= PH - 2) continue;
    const span = cls[i] === 1 ? 1 : 4;
    for (let k = 1; k <= span; k++) {
      const l = cls[i - k] >= 2 ? i - k : cls[i + k] >= 2 ? i + k : -1;
      const ul = cls[i - k - PW] >= 2 || cls[i + k - PW] >= 2;
      if (l >= 0 || (k === 1 && ul && cls[i - PW] < 2 && kind[i - PW] === 2)) {
        const C = CLIFF[rpx[l >= 0 ? l : i - PW] || 0], v = (span === 1 ? 3.5 : 5.6 - k * 1) + (bay(X, Y) - 0.5) + (h2(X, Y, 74) < 0.15 ? -2 : 0);
        put(i, C[clamp(Math.round(v), 0, 7)]); kind[i] = 2; break;
      }
    }
  }
  for (let i = PW; i < N - PW; i++) { // grass lip at the top of every cliff, wet rock rim where water lies above land
    if (cls[i] < 2) continue;
    if (cls[i + PW] < 2 && kind[i + PW] === 2) { const j = i * 4; S[j] *= 0.62; S[j + 1] *= 0.66; S[j + 2] *= 0.62; }
    else if (cls[i - PW] < 2 && !kind[i - PW]) { const C = CLIFF[rpx[i]]; put(i, C[cls[i - PW] === 1 ? 3 : 4]); kind[i] = 2; if (cls[i + PW] >= 2 && cls[i - PW] === 0) { put(i + PW, C[6]); kind[i + PW] = 2; } }
    else if ((cls[i - 1] === 0 && !kind[i - 1]) || (cls[i + 1] === 0 && !kind[i + 1])) { put(i, CLIFF[rpx[i]][6]); }
  }

  mark('// ---- 4. f'); yield;
  // ---- 4. forests: hundreds of overlapping crowns, light from the top-left, trunks and shadows on the open edge
  const crown = new Uint8Array(N);
  const crownAt = (cx, cy, r, P, seed) => {
    const ph = h2(cx, cy, seed) * 6.28, x0 = Math.floor(cx - r - 1), x1 = Math.ceil(cx + r + 1), y0 = Math.floor(cy - r - 1), y1 = Math.ceil(cy + r + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= PW || y >= PH) continue; const i = y * PW + x; if (!kind[i] || kind[i] === 5) continue;
      const dx = x - cx, dy = y - cy, a = Math.atan2(dy, dx), rr = r * (1 + 0.07 * Math.sin(a * 5 + ph) + 0.04 * Math.sin(a * 8 + ph * 2)), d = Math.hypot(dx, dy);
      if (d > rr) continue;
      const nx = dx / rr, ny = dy / rr, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), lum = -0.5 * nx - 0.62 * ny + 0.6 * nz;
      const relief = vn((x - 1) / 1.9, (y - 1) / 1.9, seed) - vn((x + 1) / 1.9, (y + 1) / 1.9, seed); // leaf clumps lit from the top-left
      let v = 3.3 + lum * 4 + relief * 0.9 + (bay(x, y) - 0.5) * 0.7 + (lum > 0.72 ? 1.2 : 0);
      if (lum > 0.25 && h2(x, y, seed + 3) < 0.12) v += 1.6; // leaf glints
      if (d > rr - 1.7 && dy > -rr * 0.25) v = d > rr - 0.9 ? 0.6 : Math.min(v, 2);
      else if (d > rr - 1) v = crown[i] && dy < -rr * 0.2 ? 1 : v - 1; // dark seam where it overlaps the tree behind
      put(i, P[clamp(Math.round(v), 1, P.length - 1)]); kind[i] = 3; crown[i] = 1;
    }
  };
  const pineAt = (cx, cy, s) => { // snowy conifer: stacked tiers, dark teal with snow along the lit edges
    const hh = 14 + s * 4, hw = 5.2 + s * 1.6, top = cy - hh;
    for (let y = Math.floor(top); y <= cy; y++) for (let x = Math.floor(cx - hw - 1); x <= cx + hw + 1; x++) {
      if (x < 0 || y < 0 || x >= PW || y >= PH) continue; const i = y * PW + x; if (!kind[i] || kind[i] === 5) continue;
      const rel = (y - top) / hh, tp = frac(rel * 3.2 - 0.1), wv = hw * (0.2 + 0.8 * rel) * (0.5 + 0.5 * tp), dx = x - cx + 0.5;
      if (Math.abs(dx) > wv || rel < 0) continue;
      const eR = dx > wv - 1.1, eB = tp > 0.9 && dx > -wv + 1, eL = dx < -wv + 1.6;
      const snow = (eL && tp < 0.85) || (tp < 0.22 && dx < wv * 0.2) || (rel < 0.12);
      let v = 4.3 - (dx + wv) / (2 * wv + 0.01) * 3 + (bay(x, y) - 0.5) * 0.5 + (eR || eB ? -2 : 0);
      put(i, snow ? SNOW[eL && dx < -wv + 0.8 ? 7 : rel < 0.12 ? 7 : 5] : PINE[clamp(Math.round(v), 0, 7)]); kind[i] = 3; crown[i] = 1;
    }
    for (const y of [Math.round(cy) + 1, Math.round(cy) + 2]) { const i = y * PW + Math.round(cx); if (kind[i] && kind[i] !== 3) { put(i, DIRT[y === Math.round(cy) + 1 ? 1 : 2]); kind[i] = 3; crown[i] = 1; } }
  };
  for (let i = 0; i < N; i++) if (cls[i] === 3) { const r = rpx[i]; put(i, r === 1 ? SNOW[h2(i, 1, 82) < 0.5 ? 2 : 3] : FOREST[r === 2 ? 2 : r === 4 ? 4 : r === 5 ? 5 : 0][2 + (h2(i, 1, 82) < 0.3 ? 1 : 0)]); kind[i] = 4; }
  for (let j = 0, Y = 1; Y < PH; j++, Y += 6) {
    if (!(j & 3)) yield;
    for (let X = (j & 1) * 4; X < PW; X += 8) {
      const cx = X + (h2(X, Y, 83) - 0.5) * 2.6, cy = Y + (h2(X, Y, 84) - 0.5) * 1.6, i = Math.round(cy) * PW + Math.round(cx);
      if (i < 0 || i >= N || cls[i] !== 3) continue;
      const tx = (cx / 16) | 0, ty = (cy / 16) | 0, c = ch(tx, ty), r = rpx[i];
      if (c === 't' || (c !== 'T' && r === 1)) { pineAt(cx, cy + 5, h2(X, Y, 85)); if (h2(X, Y, 89) < 0.5) pineAt(cx + 4, cy + 8, h2(X, Y, 90) * 0.5); }
      else crownAt(cx, cy, 5 + h2(X, Y, 86) * 1.4, FOREST[r === 2 ? 2 : r === 4 ? 4 : r === 5 ? 5 : 0], 87 + r);
    }
  }
  // trunks + shadow below the bottom edge of the woods
  for (let i = PW * 3; i < N - PW * 3; i++) {
    if (crown[i] || kind[i] !== 1) continue;
    if (crown[i - PW] && crown[i - PW - 1] && crown[i - PW + 1] && h2(i, 0, 88) < 0.22) { put(i, DIRT[1]); continue; }
    if (crown[i - PW] || crown[i - PW * 2 - 1] || crown[i - 1 - PW]) shade(i, 0.58);
    else if (crown[i - PW * 3 - 2] || crown[i - 2]) shade(i, 0.8);
  }

  mark('// ---- 5. m'); yield;
  // ---- 5. mountains: rows of overlapping peaks, painted back to front
  const peak = (bx, by, hgt, hw, skew, desert, snowFrac, seed) => {
    const tx = bx + skew, ty = by - hgt;
    for (let y = Math.floor(ty); y <= by; y++) {
      if (y < 0 || y >= PH) continue; const rel = clamp((by - y) / hgt, 0, 1), jag = rel > 0.92 ? 0.3 : 1;
      const L = tx - (tx - (bx - hw)) * (1 - rel) + vn(y / 2.2, seed, 1) * 1.2 * jag, R = tx + (bx + hw - tx) * (1 - rel) + vn(y / 2.2, seed, 2) * 1.2 * jag;
      const ridge = tx + (1 - rel) * hw * (0.08 + vn(y / 3.5, seed, 3) * 0.22);
      for (let x = Math.ceil(L - 0.5); x <= Math.floor(R + 0.5); x++) {
        if (x < 0 || x >= PW) continue; const i = y * PW + x; if (!kind[i] || (kind[i] === 2 && cls[i] < 2)) continue;
        const lit = x < ridge, u = lit ? (ridge - x) / (ridge - L + 0.01) : (x - ridge) / (R - ridge + 0.01), dith = (bay(x, y) - 0.5) * 0.35;
        const g = frac(((x - tx) * (lit ? 0.9 : -0.9) + (y - ty) * 0.75) / 5.5 + vn(x / 5, y / 5, seed + 5) * 0.35);
        const snowLine = 1 - snowFrac + vn(x / 3, 0, seed + 4) * 0.07 + (lit ? 0 : 0.03);
        const snow = snowFrac > 0 && (rel > snowLine || (rel > snowLine - 0.1 && g < 0.2));
        const eL = x - L < 0.9, eR = R - x < 0.9, onRidge = Math.abs(x - ridge) < 0.6;
        let col;
        if (snow) col = ICE[clamp(Math.round((lit ? 4.4 - u * 0.8 : 1.8 - u * 0.4) + dith * 0.5 + (g < 0.12 ? -0.8 : 0) + (onRidge ? 1 : 0) - (eR ? 1 : 0)), 0, 5)];
        else if (desert) col = MESA[clamp(Math.round((lit ? 6.6 - u * 1.8 : 3) + dith - (1 - rel) * 0.8 + (g < 0.16 ? -2 : g < 0.28 ? 0.9 : 0) + (onRidge && lit ? 1 : 0) - (eL || eR ? 2 : 0)), 0, 8)];
        else if (lit) col = ROCK[clamp(Math.round(6.7 - u * 2.2 - (1 - rel) * 1.0 + dith + (g < 0.16 ? -2.4 : g < 0.28 ? 0.9 : 0) + (onRidge ? 1.2 : 0) - (eL ? 3 : 0)), 0, 9)];
        else col = SHADE[clamp(Math.round(3.7 - u * 1.1 - (1 - rel) * 0.9 + dith + (g < 0.16 ? -1.5 : g < 0.28 ? 0.8 : 0) - (eR ? 2 : 0)), 0, 6)];
        put(i, col); kind[i] = 5;
      }
    }
    for (let x = Math.floor(bx - hw + 1); x < bx + hw; x++) for (const dy of [1, 2]) { const i = (Math.round(by) + dy) * PW + x; if (i > 0 && i < N && kind[i] === 1) shade(i, dy === 1 ? 0.62 : 0.8); }
  };
  for (let i = 0; i < N; i++) if (cls[i] === 4) { const X = i % PW, Y = (i / PW) | 0, r = rpx[i]; put(i, r === 3 ? MESA[3 + (h2(X, Y, 90) < 0.3 ? 1 : 0)] : ROCK[3 + Math.round(vn(X / 3, Y / 3, 91) + bay(X, Y) - 0.5)]); kind[i] = 5; }
  const peaks = [];
  for (let j = 0, Y = 4; Y < PH + 8; j++, Y += 7) for (let X = (j & 1) * 6; X < PW; X += 12) {
    const bx = X + (h2(X, Y, 92) - 0.5) * 4, by = Y + (h2(X, Y, 93) - 0.5) * 2, bi = Math.round(by - 2) * PW + Math.round(bx);
    if (bi < 0 || bi >= N || cls[bi] !== 4) continue;
    const tx = (bx / 16) | 0, ty = (by / 16) | 0;
    if (gate.some(([gx, gy]) => Math.abs(bx - (gx * 16 + 8)) < 14 && by > gy * 16 - 4 && by < gy * 16 + 26)) continue;
    let near = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (isCaveTile(tx + dx, ty + dy) && Math.abs(bx - ((tx + dx) * 16 + 8)) < 15 && by > (ty + dy) * 16 + 3 && by < (ty + dy) * 16 + 30) near = true;
    if (near) continue;
    const r = rpx[bi], deep = cls[Math.max(0, bi - 14 * PW)] === 4 && cls[Math.min(N - 1, bi + 7 * PW)] === 4;
    const desert = r === 3, hgt = desert ? 10 + h2(X, Y, 94) * 5 : 15 + h2(X, Y, 94) * 8 + (deep ? 6 : 0);
    peaks.push([by, bx, hgt, hgt * (desert ? 1.1 : 0.8 + h2(X, Y, 95) * 0.2), (h2(X, Y, 96) - 0.5) * 4, desert, desert ? 0 : r === 1 ? 0.36 : r === 2 ? 0.18 : deep ? 0.26 : 0.2, (X * 7 + Y * 13) | 0]);
  }
  peaks.sort((a, b) => a[0] - b[0]);
  let pk = 0; for (const [by, bx, hgt, hw, sk, de, sf, sd] of peaks) { peak(bx, by, hgt, hw, sk, de, sf, sd); if (!(++pk % 12)) yield; }
  // the canyon pass: a dirt floor with rock walls cut through the range
  for (const [tx, ty] of gate) for (let Y = ty * 16 - 4; Y < ty * 16 + 20; Y++) for (let X = tx * 16 - 4; X < tx * 16 + 20; X++) {
    const i = Y * PW + X, dx = X - (tx * 16 + 7.5), wv = 5 + vn(Y / 4, tx, 61) * 0.8, ad = Math.abs(dx);
    if (Y >= ty * 16 && Y < ty * 16 + 16 && ad <= wv) { put(i, DIRT[clamp(Math.round(3.6 + vn(X / 3, Y / 3, 62) * 0.8 + (bay(X, Y) - 0.5) + (ad > wv - 1.2 ? -1.5 : 0) + (h2(X, Y, 63) < 0.05 ? -2 : 0)), 0, 6)]); kind[i] = 6; }
    else if (Y >= ty * 16 - 2 && Y < ty * 16 + 18 && ad <= wv + 2.5 && kind[i] === 5) put(i, dx < 0 ? SHADE[1] : ROCK[ad <= wv + 1.2 ? 6 : 4]);
  }

  mark('// ---- 6. b'); yield;
  // ---- 6. bridges: stone decks with rails over the river
  ROWS.forEach((row, y) => [...row].forEach((c, x) => {
    if (c !== '=') return; const tx = x + PAD, ty = y + PAD, horiz = !isWater(ch(tx - 1, ty)) || !isWater(ch(tx + 1, ty));
    for (let py = -1; py < 17; py++) for (let px = -3; px < 19; px++) {
      const u = horiz ? px : py, v = horiz ? py : px; if (u < -3 || u > 18 || v < 2 || v > 13) continue;
      const X = tx * 16 + px, Y = ty * 16 + py, i = Y * PW + X; let col;
      if (v === 2 || v === 13) col = STONE[1];
      else if (v === 3 || v === 12) col = (u & 3) === 0 ? STONE[2] : STONE[7];
      else if (v === 4 || v === 11) col = STONE[3];
      else col = STONE[((u + (v >> 1)) % 4 === 0 ? 4 : 6) - (v > 8 ? 1 : 0)];
      if (u < 0 || u > 15) { if (cls[i] < 2 && v > 3 && v < 12) continue; if (v < 3 || v > 12) continue; }
      put(i, col); kind[i] = 7;
    }
    for (let px = 0; px < 16; px++) for (const dy of [14, 15]) { const X = tx * 16 + (horiz ? px : dy), Y = ty * 16 + (horiz ? dy : px), i = Y * PW + X; if (!kind[i]) { put(i, OCEAN[1]); kind[i] = 2; } }
  }));

  mark('// ---- 7. w'); yield;
  // ---- 7. water distance (to anything static) for depth shading and surf
  const dist = new Float32Array(N).fill(99);
  for (let i = 0; i < N; i++) if (kind[i]) dist[i] = 0;
  yield; for (let Y = 0; Y < PH; Y++) for (let X = 0; X < PW; X++) { const i = Y * PW + X; if (!dist[i]) continue; let d = dist[i]; if (X > 0) d = Math.min(d, dist[i - 1] + 1); if (Y > 0) { d = Math.min(d, dist[i - PW] + 1); if (X > 0) d = Math.min(d, dist[i - PW - 1] + 1.414); if (X < PW - 1) d = Math.min(d, dist[i - PW + 1] + 1.414); } dist[i] = d; }
  yield; for (let Y = PH - 1; Y >= 0; Y--) for (let X = PW - 1; X >= 0; X--) { const i = Y * PW + X; if (!dist[i]) continue; let d = dist[i]; if (X < PW - 1) d = Math.min(d, dist[i + 1] + 1); if (Y < PH - 1) { d = Math.min(d, dist[i + PW] + 1); if (X < PW - 1) d = Math.min(d, dist[i + PW + 1] + 1.414); if (X > 0) d = Math.min(d, dist[i + PW - 1] + 1.414); } dist[i] = d; }
  for (let i = 0; i < N; i++) { if (kind[i]) { wT[i] = 0; continue; } wD[i] = Math.min(31, Math.round(dist[i])); if (!wT[i]) wT[i] = 1; }
  // per tile: 0 = static only, 1 = has water near land, 2 = open ocean (shared animated tiles)
  const tt = new Uint8Array(TW * TH);
  for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) {
    let anyW = false, deep = true;
    for (let p = 0; p < 256; p++) { const i = (ty * 16 + (p >> 4)) * PW + tx * 16 + (p & 15); if (wT[i]) { anyW = true; if (wT[i] !== 1 || wD[i] < 24) deep = false; } else deep = false; }
    tt[ty * TW + tx] = !anyW ? 0 : deep ? 2 : 1;
  }
  mark('BK = { S,'); yield;
  BK = { S, wT, wD, wF, tt, TW, TH, PW, PH, W, H, tiles: new Map(), PROF };
}
let GENR = null;
function bake() { // finish (or run) the bake right now
  if (BK) return BK; GENR = GENR || bakeGen(); while (!GENR.next().done); return BK;
}
export function prebake() { // run the bake in ~6 ms slices while the player is still in town / on the title screen
  if (BK) return; GENR = GENR || bakeGen();
  const step = () => { if (BK) return; const t0 = performance.now(); while (performance.now() - t0 < 6) if (GENR.next().done) return; setTimeout(step, 16); };
  step();
}
export const bakeReady = () => !!BK;
export function finishBake(onTick) { // finish the bake in 12 ms slices (the page stays responsive and can show progress); resolves when the world is ready
  return new Promise((res) => {
    if (BK) return res(); GENR = GENR || bakeGen(); let n = 0;
    const step = () => { if (BK) return res(); const t0 = performance.now(); while (performance.now() - t0 < 12) if (GENR.next().done) return res(); onTick?.(++n); setTimeout(step, 0); };
    step();
  });
}
if (typeof window !== 'undefined') setTimeout(prebake, 400);

// ---------- animated water ----------
let RIP = null;
function ripples() { // 8 frames of 64x64 shimmer: little crescent waves that brighten and fade, plus slow swell bands
  if (RIP) return RIP;
  RIP = Array.from({ length: FRAMES }, () => new Float32Array(4096));
  for (let k = 0; k < 70; k++) {
    const x0 = Math.floor(h2(k, 1, 101) * 64), y0 = Math.floor(h2(k, 2, 101) * 64), len = 3 + Math.floor(h2(k, 3, 101) * 4), ph = h2(k, 4, 101) * FRAMES;
    for (let f = 0; f < FRAMES; f++) {
      const a = (f - ph + FRAMES) % FRAMES, b = a < 1 ? 1.2 : a < 2 ? 2.4 : a < 3 ? 1.2 : 0; if (!b) continue;
      const dx = Math.floor(a); // drifts a pixel per lit frame
      for (let u = 0; u < len; u++) { const x = (x0 + u + dx) & 63, y = (y0 + (u === 0 || u === len - 1 ? 0 : 1)) & 63; RIP[f][y * 64 + x] = Math.max(RIP[f][y * 64 + x], b); }
    }
  }
  for (let f = 0; f < FRAMES; f++) for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const s = Math.sin((y / 16 + x / 64) * 6.2832 + Math.sin(x / 64 * 6.2832 * 2) * 0.8 - f / FRAMES * 6.2832); if (s > 0.72) RIP[f][y * 64 + x] += 0.8; else if (s < -0.8) RIP[f][y * 64 + x] -= 0.6; }
  return RIP;
}
function waterPx(o, j, X, Y, type, d, fd, f) {
  const R = ripples()[f][((Y & 63) << 6) | (X & 63)];
  let v;
  if (type === 3) { // waterfall: white streaks rushing down
    const s = ((Y - f * 3 + Math.floor(h2(X, 0, 110) * 7)) % 7 + 7) % 7;
    v = fd <= 1 ? 9 : s < 2 ? 9 : s < 4 ? 8 : 7; if (fd >= 8) v = (h2(X, f, 111) > 0.4) ? 9 : 8;
  } else {
    const deep = d >= 24, dith = deep ? (bay(X, Y) - 0.5) * 0.5 : (bay(X, Y) - 0.5) * 0.9 + vn(X / 9, Y / 9, 112) * 0.6;
    v = type === 2 ? 5.3 - Math.min(d, 5) * 0.16 : d >= 24 ? 1.6 : 6.2 - Math.sqrt(d) * 0.95;
    v += dith + R * (type === 2 ? 0.9 : 1);
    if (d <= 1) v = h2(X, Y + f, 113) > 0.35 ? 9 : 8;
    else if (type === 1 && d < 9) { const s = 2.2 + 2 * (0.5 + 0.5 * Math.sin(f / FRAMES * 6.2832 + vn(X / 7, Y / 7, 114) * 2.5)); if (Math.abs(d - s - 0.3) < 0.55 && vn(X / 3, Y / 3, 115) > -0.25) v = 8; }
    else if (type === 2 && d === 2 && h2(X, Y, f + 116) > 0.6) v = 8;
  }
  const c = OCEAN[clamp(Math.round(v), 0, 9)]; o[j] = c[0]; o[j + 1] = c[1]; o[j + 2] = c[2]; o[j + 3] = 255;
}
const deepTiles = new Map();
function deepTile(x, y, f) {
  const k = ((x & 3) | ((y & 3) << 2)) * FRAMES + f; let c = deepTiles.get(k); if (c) return c;
  const id = new ImageData(16, 16); for (let p = 0; p < 256; p++) waterPx(id.data, p * 4, (x & 3) * 16 + (p & 15), (y & 3) * 16 + (p >> 4), 1, 31, 0, f);
  c = mk(16, 16); c.getContext('2d').putImageData(id, 0, 0); deepTiles.set(k, c); return c;
}
function bakedTile(x, y, f) {
  const B = bake(), tx = x + PAD, ty = y + PAD;
  if (tx < 0 || ty < 0 || tx >= B.TW || ty >= B.TH) return deepTile(x, y, f);
  const t = B.tt[ty * B.TW + tx]; if (t === 2) return deepTile(x, y, f);
  const key = (ty * B.TW + tx) * FRAMES + (t ? f : 0); let c = B.tiles.get(key); if (c) return c;
  const id = new ImageData(16, 16), o = id.data;
  for (let p = 0; p < 256; p++) {
    const X = tx * 16 + (p & 15), Y = ty * 16 + (p >> 4), i = Y * B.PW + X, j = p * 4;
    if (!B.wT[i]) { const s = i * 4; o[j] = B.S[s]; o[j + 1] = B.S[s + 1]; o[j + 2] = B.S[s + 2]; o[j + 3] = 255; }
    else waterPx(o, j, X, Y, B.wT[i], B.wD[i], B.wF[i], f);
  }
  c = mk(16, 16); c.getContext('2d').putImageData(id, 0, 0); B.tiles.set(key, c); return c;
}
export const isTheme = (theme) => theme === 'world';
export const ground = (theme, get, x, y, t) => bakedTile(x, y, Math.floor(t * FPS) % FRAMES);

// ---------- sprite painting helpers ----------
class Pix {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  set(x, y, c) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return; const i = (y * this.w + x) * 4; this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = c[3] ?? 255; }
  on(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.d[(y * this.w + x) * 4 + 3] > 0; }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, typeof c === 'function' ? c(i, j) : c); }
  outline(c, alpha = 255) { // dark rim around the silhouette (SNES icons are outlined, terrain is not)
    const o = []; for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (!this.on(x, y) && (this.on(x - 1, y) || this.on(x + 1, y) || this.on(x, y - 1) || this.on(x, y + 1))) o.push([x, y]);
    for (const [x, y] of o) this.set(x, y, [...c, alpha]); return this;
  }
  canvas() { const c = mk(this.w, this.h); c.getContext('2d').putImageData(new ImageData(this.d, this.w, this.h), 0, 0); return c; }
}
const K = hex('#160e0a');
const once = new Map(), memo = (k, f) => { if (!once.has(k)) once.set(k, f()); return once.get(k); };
// stone wall block with mortar courses; light from the left
function wallBlock(p, x, y, w, h, P, crenel = true) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const course = j % 3 === 2, joint = (i + (Math.floor(j / 3) % 2) * 2) % 4 === 0;
    let v = 5 - (i === w - 1 ? 2 : 0) + (i === 0 ? 1 : 0) - (j === h - 1 ? 1 : 0); if (course || joint) v -= 1.4; if (j === 0) v = 6;
    p.set(x + i, y + j, P[clamp(Math.round(v), 0, P.length - 1)]);
  }
  if (crenel) for (let i = 0; i < w; i += 2) { p.set(x + i, y - 1, P[6]); }
}
function tower(p, x, y, w, h, P, ROOF, roofH) { // round tower: shaded body, slit windows, conical roof
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const u = (i + 0.5) / w; let v = 6.4 - u * 4.2 + (j % 3 === 2 ? -0.8 : 0); if (i === 0) v -= 1; p.set(x + i, y + j, P[clamp(Math.round(v), 0, P.length - 1)]); }
  if (h > 5) { p.set(x + (w >> 1), y + 2, K); p.set(x + (w >> 1), y + 3, K); }
  for (let i = 0; i < w; i += 2) p.set(x + i, y - 1, P[6]);
  if (ROOF) for (let j = 0; j < roofH; j++) { const half = (w / 2 + 0.6) * (j + 1) / roofH, cx = x + w / 2 - 0.5; for (let i = Math.floor(cx - half); i <= Math.ceil(cx + half); i++) { if (Math.abs(i - cx) > half) continue; const u = (i - (cx - half)) / (2 * half + 0.01); p.set(i, y - 1 - roofH + j, ROOF[clamp(Math.round(5 - u * 4 + (j === roofH - 1 ? -1 : 0)), 0, ROOF.length - 1)]); } }
}
function roofBlock(p, x, y, w, h, R, snow) { // gabled roof seen from above-front: ridge highlight, shaded slope, eaves shadow
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { let v = j === 0 ? 5 : j < h / 2 ? 4 - (i % 3 === 0 ? 1 : 0) : 2.5 - (i % 3 === 0 ? 1 : 0); if (j === h - 1) v = 1; if (i === 0 || i === w - 1) v -= 1; p.set(x + i, y + j, snow && j < h / 2 ? SNOW[j === 0 ? 7 : 6 - (i % 4 === 0 ? 1 : 0)] : R[clamp(Math.round(v), 0, R.length - 1)]); }
}
function houseFront(p, x, y, w, P, door = -1) { for (let i = 0; i < w; i++) { p.set(x + i, y, P[i === w - 1 ? 4 : 6]); p.set(x + i, y + 1, P[i === w - 1 ? 3 : 5]); } if (door >= 0) { p.set(x + door, y, K); p.set(x + door, y + 1, K); } else { p.set(x + 1, y, hex('#f8d870')); } }

const BLUE = pal('#0a1440 #142670 #1e3ca0 #2c58c8 #4878e0 #74a0f0 #a8c8fa');
const TEAL = pal('#082430 #0e3a4a #165264 #226e80 #3a8ea0 #62b0c0 #9ad4e0');
const THATCH = pal('#2a1a08 #46300e #644616 #846020 #a27c30 #c09a46 #dab866');
const WOOD = pal('#1e1008 #36200e #523216 #6e4620 #8a5c2c #a8763c');
const RED = pal('#3a0a08 #6a1410 #9a2418 #c43a22 #e05a34');

// Haven: the Bell Village, a few golden-thatched cottages round a green with the old bell tower standing over them (3 x 2.6 tiles)
const CREAM = pal('#8a7a60 #a69678 #c4b498 #e0d2b4 #f0e6cc #faf2dc #fffbee');
const BRONZE = pal('#2e1a06 #5a3a0c #8a5a14 #bc841e #e0a830 #f6cc4c #fff09c');
const havenIcon = () => memo('havenV', () => {
  const p = new Pix(48, 42), put = (x, y, c) => p.set(x, y, c);
  for (let y = 12; y < 42; y++) for (let x = 0; x < 48; x++) { // the village green: a lawn with a ragged edge
    const dx = (x - 24) / 23.5, dy = (y - 27.5) / 14.2, d = dx * dx + dy * dy + (bay(x, y) - 0.5) * 0.12; if (d > 1) continue;
    put(x, y, GRASS[clamp(4 + ((x * 7 + y * 3) % 5 === 0 ? 1 : 0) - ((x + y * 2) % 7 === 0 ? 1 : 0) - (d > 0.82 ? 1 : 0) + (d < 0.3 && (x + y) % 4 === 0 ? 1 : 0), 0, 9)]);
  }
  for (let j = 0; j < 12; j++) { const hw = 2 + j * 0.18, cx = 24 + Math.sin(j * 0.5) * 0.7; for (let i = Math.floor(cx - hw); i <= cx + hw; i++) put(i, 41 - j, DIRT[3 + ((i + j) % 3 === 0 ? 1 : 0) - (i === Math.floor(cx - hw) ? 1 : 0)]); } // the lane up from the lych gate
  const PD = pal('#14507a #1e6e9e #3a8ec0 #6ab4dc #b4dcf2'); // the duck pond
  for (let y = 33; y < 40; y++) for (let x = 2; x < 15; x++) { const dx = (x - 8.5) / 6.4, dy = (y - 36.5) / 3.3; if (dx * dx + dy * dy > 1) continue; put(x, y, PD[clamp(Math.round(2 + (dx + dy) * -0.8 + ((x * 3 + y) % 5 === 0 ? 1 : 0) + (dx * dx + dy * dy > 0.7 ? -1 : 0)), 0, 4)]); }
  for (const [x, y] of [[6, 36], [10, 37]]) { put(x, y, hex('#ffffff')); put(x + 1, y, hex('#e8e8e8')); put(x, y - 1, hex('#ffffff')); put(x + 1, y - 1, hex('#f0c040')); } // two geese
  const cottage = (x, y, w, rh, wallH = 3, door = 2) => { // thatched roof (thick rounded eaves) over a whitewashed front
    roofBlock(p, x, y, w, rh, THATCH);
    for (let i = 1; i < w - 1; i++) { put(x + i, y + rh - 1, THATCH[1]); }
    for (let i = 0; i < w; i += 3) put(x + i, y + 1, THATCH[6]);
    for (let j = 0; j < wallH; j++) for (let i = 1; i < w - 1; i++) put(x + i, y + rh + j, CREAM[i === w - 2 ? 3 : j === 0 ? 4 : 5]);
    put(x + door, y + rh + wallH - 1, hex('#3a2010')); put(x + door, y + rh + wallH - 2, hex('#4a2c14')); put(x + w - 3, y + rh + 1, hex('#f8d870'));
    p.rect(x + w - 4, y - 3, 2, 4, STONE[4]); put(x + w - 4, y - 3, STONE[6]); // chimney
  };
  cottage(5, 17, 11, 5, 3, 3); cottage(33, 17, 11, 5, 3, 7); // the back pair, beside the tower
  cottage(2, 27, 13, 6, 3, 4); cottage(34, 28, 13, 6, 3, 6); // the front pair
  cottage(16, 31, 16, 6, 3, 8); put(23, 33, hex('#f6cc4c')); put(24, 33, hex('#fff09c')); put(24, 34, hex('#f6cc4c')); // the Goose: long and low, with a speck of gold over the door
  // the Bell Tower: stone base, timber frame, an open belfry with the great bell, a steep timber roof
  for (let j = 0; j < 8; j++) for (let i = 0; i < 10; i++) put(19 + i, 21 + j, STONE[clamp(Math.round(5.2 - (i > 6 ? 2 : 0) + (i === 0 ? 1 : 0) - (j % 3 === 2 ? 1.2 : 0) - (j === 7 ? 1 : 0)), 0, 8)]);
  put(23, 28, hex('#0c0806')); put(24, 28, hex('#0c0806')); put(23, 27, hex('#1a100a')); put(24, 27, hex('#1a100a'));
  for (let j = 0; j < 9; j++) for (let i = 0; i < 8; i++) { const brace = i === (j % 8) || i === 7 - (j % 8); put(20 + i, 12 + j, WOOD[clamp(i === 0 ? 5 : i === 7 ? 2 : brace ? 3 : 4, 0, 5)]); if (i > 0 && i < 7 && !brace && j % 3 === 1) put(20 + i, 12 + j, CREAM[4]); }
  for (let j = 0; j < 6; j++) for (let i = 0; i < 8; i++) put(20 + i, 6 + j, i === 0 || i === 7 ? WOOD[i ? 2 : 5] : hex('#1c1008')); // belfry stage: posts and a dark opening
  for (let j = 0; j < 5; j++) { const hw = j < 1 ? 1 : j < 3 ? 2 : 3; for (let i = -hw; i <= hw; i++) put(24 + i, 7 + j, BRONZE[clamp(5 - Math.round(Math.abs(i + 1) * 0.9) - (j === 4 ? 1 : 0), 0, 7)]); } put(24, 12, BRONZE[3]); // the great bell
  p.rect(19, 5, 10, 1, WOOD[5]);
  for (let j = 0; j < 6; j++) { const hw = 1.2 + j * 1.5; for (let i = Math.floor(24 - hw); i <= 24 + hw - 1; i++) put(i, j, WOOD[clamp(Math.round(4.5 - (i - (24 - hw)) / (2 * hw) * 3.4 + (j % 2 ? -0.5 : 0)), 0, 5)]); }
  put(24, 0, BRONZE[6]); put(24, 1, BRONZE[4]);
  // trees round the edge
  for (const [cx, cy, r] of [[2, 22, 4], [45, 24, 4], [13, 14, 4], [37, 13, 4.4], [24, 39, 0], [44, 38, 3.6]]) if (r) { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r; if (dx * dx + dy * dy > 1 || p.on(x, y) && y > cy + 1) continue; put(x, y, GRASS[clamp(Math.round(6 - dx * 2.4 - dy * 2.4 - (dx * dx + dy * dy > 0.7 ? 1.4 : 0)), 0, 9)]); } put(Math.round(cx), Math.round(cy + r), WOOD[2]); }
  return p.outline(K).canvas();
});
// Frostholm: snowbound walled town, white stone and teal roofs (3 x 2.5 tiles)
const frostTown = () => memo('frost', () => {
  const p = new Pix(48, 40), P = pal('#1e2438 #343c56 #4c5674 #66708e #808aa8 #9ea8c2 #c0c8dc');
  p.rect(3, 12, 42, 24, (i, j) => SNOW[5 + ((i * 5 + j * 3) % 7 === 0 ? 1 : 0) - ((i * 3 + j) % 11 === 0 ? 1 : 0)]);
  wallBlock(p, 3, 11, 42, 3, P);
  for (const [x, y, w] of [[7, 16, 9], [31, 16, 10], [6, 25, 8], [33, 25, 8], [18, 24, 6]]) { roofBlock(p, x, y, w, 5, TEAL, true); houseFront(p, x, y + 5, w, P); }
  wallBlock(p, 18, 10, 12, 9, P, false); roofBlock(p, 17, 5, 14, 6, TEAL, true); p.rect(22, 15, 3, 4, K); // great hall
  tower(p, 21, 0, 5, 9, P, TEAL, 5);
  wallBlock(p, 1, 13, 3, 22, P, false); wallBlock(p, 44, 13, 3, 22, P, false); wallBlock(p, 1, 33, 46, 6, P);
  for (let i = 1; i < 47; i += 3) p.set(i, 32, SNOW[7]);
  tower(p, 0, 10, 5, 9, P, TEAL, 4); tower(p, 43, 10, 5, 9, P, TEAL, 4); tower(p, 0, 29, 5, 9, P, TEAL, 4); tower(p, 43, 29, 5, 9, P, TEAL, 4);
  p.rect(21, 32, 6, 7, (i, j) => (j === 32 ? P[1] : hex('#0c0c14')));
  return p.outline(hex('#0e1222')).canvas();
});
// Mirewood: stilt huts behind a wooden palisade (2.5 x 2 tiles)
const village = () => memo('village', () => {
  const p = new Pix(40, 32);
  p.rect(3, 9, 34, 20, (i, j) => SWAMP[4 + ((i * 3 + j * 5) % 6 === 0 ? 1 : 0) - ((i + j) % 9 === 0 ? 2 : 0)]);
  p.rect(14, 14, 10, 4, (i, j) => POOL[2 + ((i + j) % 3 === 0 ? 1 : 0)]);
  for (const [x, y, w] of [[5, 9, 10], [25, 8, 11], [15, 17, 10]]) { for (let j = 0; j < 7; j++) for (let i = 0; i < w; i++) { const half = w / 2, d = Math.abs(i - half + 0.5); if (d > half * (0.45 + j / 9)) continue; p.set(x + i, y + j, THATCH[clamp(Math.round(5 - (i / w) * 3 - (j > 5 ? 1.5 : 0) + ((i + j) % 3 === 0 ? -1 : 0)), 0, 6)]); } for (let i = 1; i < w - 1; i++) { p.set(x + i, y + 7, WOOD[i === w - 2 ? 2 : 4]); p.set(x + i, y + 8, WOOD[3]); } p.set(x + (w >> 1), y + 7, K); p.set(x + (w >> 1), y + 8, K); p.set(x + 1, y + 9, WOOD[1]); p.set(x + w - 2, y + 9, WOOD[1]); }
  for (let i = 1; i < 39; i++) { const front = i < 17 || i > 22; for (let j = 0; j < 5; j++) { if (!front && j > 0) continue; p.set(i, 26 + j, WOOD[(i % 2 ? 4 : 3) - (j === 4 ? 1 : 0)]); } p.set(i, 25, i % 2 ? WOOD[5] : null); }
  for (let j = 8; j < 27; j++) { p.set(1, j, WOOD[j % 2 ? 4 : 3]); p.set(38, j, WOOD[j % 2 ? 3 : 2]); p.set(2, j, WOOD[2]); }
  for (let i = 1; i < 39; i += 2) p.set(i, 7 + (i % 4 === 1 ? 0 : 1), WOOD[4]);
  return p.outline(K).canvas();
});
// cave mouth in a rock outcrop; the storm cavern is slate blue with a glow inside
const caveMouth = (storm, f) => memo('cave' + storm + f, () => {
  const p = new Pix(32, 28), L = storm ? pal('#141628 #20243c #2e3452 #3e466a #525c84 #6a76a0 #8a96bc #aab4d4') : ROCK;
  for (let y = 0; y < 28; y++) for (let x = 0; x < 32; x++) {
    const nx = (x - 15.5) / 16, ny = (y - 27) / 25, d = nx * nx + ny * ny * (y < 14 ? 1.3 : 1) + vn(x / 3, y / 3, storm ? 7 : 8) * 0.12; if (d > 1) continue;
    const lit = -nx * 0.7 - ny * 0.5; let v = 3.6 + lit * 3 + (bay(x, y) - 0.5) + (frac((x * 0.8 + y) / 5 + vn(x / 4, y / 4, 9) * 0.4) < 0.2 ? -1.5 : 0); if (d > 0.88) v -= 1.5;
    p.set(x, y, L[clamp(Math.round(v), 0, L.length - 1)]);
  }
  for (let y = 12; y < 28; y++) for (let x = 8; x < 24; x++) { // arch opening
    const nx = (x - 15.5) / 7.5, ny = (y - 27) / 14.5; const d = nx * nx + ny * ny; if (d > 1) continue;
    const glow = storm ? [40 + 40 * f, 30 + 20 * f, 90 + 60 * f] : [20, 12, 8];
    if (d > 0.82) p.set(x, y, L[d > 0.92 ? 6 : 1]); else p.set(x, y, d < 0.3 && y > 22 ? glow : hex(storm ? '#08081a' : '#0c0604'));
  }
  for (const x of [11, 14, 18, 20]) p.set(x, 15 + (x % 3), L[5]);
  return p.outline(K, 200).canvas();
});
// the Sunken Crypt: a mossy ruined shrine with broken columns (2 x 2 tiles)
// wayside places: little roadside landmarks (one 24x20 sprite per kind)
const waysideIcon = (kind) => memo('wayside' + kind, () => {
  const p = new Pix(24, 20), W = pal('#9aa6b8 #c8d0dc #eef2f8 #ffffff'), G = pal('#3a3e46 #565c68 #747c8a #98a0ae #b8c0cc');
  const hut = (x0, w, roof, wall, door) => { p.rect(x0, 9, w, 9, (i, j) => wall[2 + ((i + j) % 5 === 0 ? 1 : 0) - (j > 6 ? 1 : 0)]); for (let j = 0; j < 6; j++) p.rect(x0 - 2 + j, 4 + j, w + 4 - 2 * j, 1, roof[3 + (j & 1)]); p.rect(x0 + (w >> 1) - 1, 13, 3, 5, door); p.rect(x0 + 1, 11, 2, 2, [250, 220, 120]); };
  if (kind === 'chippy') { hut(5, 14, RED, WOOD, WOOD[1]); p.rect(3, 9, 18, 2, (i) => (i & 2 ? [250, 250, 250] : [60, 100, 200])); p.rect(9, 1, 6, 3, [250, 230, 90]); p.set(11, 2, RED[2]); p.set(13, 2, RED[2]); }
  else if (kind === 'stones') { p.rect(1, 15, 22, 4, (i, j) => [46, 92 + ((i + j) % 3) * 8, 40]); for (const [x, h] of [[3, 8], [8, 11], [13, 12], [18, 8]]) { p.rect(x, 17 - h, 3, h, (i, j) => G[2 + (i === 2 ? -1 : 0) + (j % 4 === 0 ? 1 : 0)]); p.set(x + 1, 17 - h - 1, G[3]); } p.rect(7, 5, 9, 2, G[3]); p.rect(8, 3, 7, 2, G[2]); }
  else if (kind === 'bogshed') { for (const x of [6, 10, 14, 17]) p.rect(x, 15, 1, 4, WOOD[1]); p.rect(4, 14, 17, 1, WOOD[3]); hut(6, 12, WOOD, WOOD, WOOD[1]); p.rect(15, 5, 2, 3, [80, 120, 60]); p.rect(2, 18, 20, 2, [38, 70, 50]); }
  else if (kind === 'oasis') { p.rect(2, 16, 20, 3, (i, j) => [210, 180 - (j & 1) * 10, 110]); p.rect(3, 17, 8, 2, [40, 130, 200]); p.rect(14, 8, 8, 6, [250, 210, 60]); p.rect(15, 9, 3, 2, [200, 230, 250]); p.rect(14, 13, 8, 1, [200, 120, 30]); p.set(15, 15, [20, 20, 20]); p.set(20, 15, [20, 20, 20]); for (let k = 0; k < 8; k++) p.set(6, 5 + k, WOOD[3]); for (const [dx, dy] of [[-3, 0], [-2, -1], [0, -2], [2, -1], [3, 0], [-1, -1], [1, -1]]) p.rect(6 + dx, 5 + dy, 2, 1, [60, 150, 60]); }
  else if (kind === 'lodge') { p.rect(1, 17, 22, 3, W[2]); hut(5, 14, W, WOOD, WOOD[1]); p.rect(15, 1, 2, 4, G[1]); p.set(15, 0, W[3]); p.set(16, 0, W[2]); }
  else if (kind === 'hopsend') { p.rect(0, 15, 24, 5, (i, j) => [200, 150 + (i & 1) * 8, 50]); for (const [x0, w, h] of [[1, 8, 7], [10, 7, 6], [16, 7, 8]]) { p.rect(x0, 18 - h, w, h, (i, j) => WOOD[3 + ((i + j) % 4 === 0 ? 1 : 0)]); for (let j = 0; j < 4; j++) p.rect(x0 - 1 + j, 18 - h - 3 + j, w + 2 - 2 * j, 1, RED[2 + (j & 1)]); p.rect(x0 + (w >> 1), 15, 2, 3, WOOD[1]); } p.rect(21, 2, 2, 4, [240, 120, 30]); }
  else if (kind === 'kilnhaven') { p.rect(0, 15, 24, 5, (i, j) => [40 + (i & 1) * 6, 30, 28]); for (const [x0, w, h] of [[1, 7, 6], [9, 7, 7], [17, 6, 5]]) { p.rect(x0, 18 - h, w, h, (i, j) => [150 + ((i + j) % 3) * 10, 100, 70]); for (let j = 0; j < 3; j++) p.rect(x0 - 1 + j, 18 - h - 2 + j, w + 2 - 2 * j, 1, [230, 90 - j * 10, 40]); p.rect(x0 + (w >> 1), 15, 2, 3, [40, 20, 10]); } p.rect(11, 1, 2, 4, [255, 160, 30]); }
  else if (kind === 'pizzaoven') { for (let j = 0; j < 14; j++) p.rect(12 - j - 1, 5 + j, 2 * j + 3, 1, [62 + (j & 1) * 8, 44, 40]); p.rect(8, 4, 8, 2, [255, 130, 20]); p.rect(9, 3, 6, 1, [255, 220, 80]); p.rect(11, 0, 2, 3, [90, 90, 96]); p.set(13, 0, [140, 140, 150]); p.rect(10, 14, 4, 5, [255, 120, 20]); p.rect(11, 15, 2, 3, [255, 220, 80]); }
  else if (kind === 'windmill') { p.rect(2, 17, 20, 3, [90, 150, 60]); p.rect(8, 8, 8, 10, (i, j) => [200 - j * 3, 180 - j * 3, 150]); for (let j = 0; j < 4; j++) p.rect(8 + j, 5 + j, 8 - 2 * j, 1, WOOD[3 + (j & 1)]); p.rect(11, 14, 3, 4, WOOD[1]); for (const [x0, y0] of [[2, 4], [16, 4], [4, 0], [18, 1]]) for (let k = 0; k < 5; k++) p.set(x0 + k, y0 + ((k * (x0 < 12 ? 1 : -1)) | 0), [235, 225, 200]); p.rect(11, 5, 2, 2, [60, 40, 30]); }
  else if (kind === 'wreck') { p.rect(0, 14, 24, 6, (i, j) => [40 + j * 2, 70 + j * 2, 50]); p.rect(3, 9, 18, 6, (i, j) => WOOD[2 + ((i + j) % 4 === 0 ? 1 : 0)]); for (let j = 0; j < 3; j++) p.rect(3 + j, 9 - j, 1, 1, WOOD[1]); p.rect(12, 1, 1, 9, WOOD[1]); p.rect(13, 2, 5, 4, [190, 190, 180]); p.rect(5, 12, 2, 2, [20, 20, 20]); p.rect(10, 12, 2, 2, [20, 20, 20]); }
  else if (kind === 'pyramid') { for (let j = 0; j < 16; j++) p.rect(12 - j, 3 + j, 2 * j + 2, 1, [220 - (j & 1) * 12, 180 - (j & 1) * 12, 90]); p.rect(11, 15, 3, 4, [30, 20, 10]); p.rect(22, 15, 2, 4, [200, 200, 205]); p.rect(11, 0, 3, 2, [255, 220, 60]); }
  else if (kind === 'icecave') { p.rect(0, 15, 24, 5, [225, 235, 250]); for (let j = 0; j < 14; j++) p.rect(12 - j, 4 + j, 2 * j + 2, 1, [150 + (j & 1) * 12, 190 + (j & 1) * 8, 235]); p.rect(9, 11, 6, 8, [20, 40, 80]); p.rect(10, 12, 4, 6, [10, 20, 50]); for (const x of [8, 12, 15]) p.rect(x, 10, 1, 2, [235, 245, 255]); }
  else if (kind === 'brewery') { p.rect(1, 17, 22, 3, [150, 110, 50]); p.rect(3, 8, 18, 10, (i, j) => WOOD[2 + ((i + j) % 5 === 0 ? 1 : 0)]); for (let j = 0; j < 5; j++) p.rect(2 + j, 3 + j, 20 - 2 * j, 1, [176 - j * 6, 96, 40]); p.rect(15, 0, 3, 6, STONE[3]); p.rect(14, 0, 5, 1, STONE[5]); p.rect(9, 11, 6, 7, WOOD[1]); p.rect(4, 12, 3, 5, [200, 140, 40]); p.rect(4, 11, 3, 1, [150, 100, 30]); p.set(16, 0, [250, 250, 250]); p.set(17, 1, [230, 230, 230]); }
  else if (kind === 'dock') { p.rect(0, 12, 24, 8, (i, j) => [30 + j, 80 + j * 2, 170]); p.rect(0, 12, 10, 2, WOOD[4]); for (const x of [1, 4, 7]) p.rect(x, 12, 1, 6, WOOD[1]); p.rect(11, 8, 11, 5, W[2]); p.rect(11, 12, 11, 2, RED[3]); p.rect(15, 2, 1, 7, WOOD[2]); p.rect(16, 2, 4, 4, W[3]); }
  else { p.rect(1, 16, 22, 4, W[1]); p.rect(6, 8, 12, 9, (i, j) => [120 + j * 3, 170 + j * 3, 220]); for (let j = 0; j < 4; j++) p.rect(5 + j, 5 + j, 14 - 2 * j, 1, W[2 + (j & 1)]); p.rect(11, 11, 3, 6, [30, 50, 90]); p.rect(2, 17, 3, 1, G[1]); }
  return p.outline(K).canvas();
});
const shrine = () => memo('shrine', () => {
  const p = new Pix(32, 32), P = pal('#1a201c #2a342e #3e4a42 #546258 #6c7c70 #889888 #a6b4a2 #c4d0bc'), MOSS = pal('#142410 #20381a #2e4e22 #40662c');
  p.rect(2, 22, 28, 8, (i, j) => P[j === 22 ? 6 : j < 26 ? 4 - ((i + j) % 4 === 0 ? 1 : 0) : 3 - ((i * 3 + j) % 5 === 0 ? 1 : 0)]); // platform steps
  for (let i = 2; i < 30; i++) p.set(i, 26, P[6]);
  p.rect(7, 9, 18, 13, (i, j) => P[clamp(4 - (i > 21 ? 1.5 : 0) + (j % 3 === 2 ? -1 : 0), 0, 7)]); // temple wall
  for (let j = 0; j < 6; j++) for (let i = 5 + j; i < 27 - j; i++) if (!(i > 18 && j < 3)) p.set(i, 9 - 6 + j, P[clamp(Math.round(5.5 - j * 0.5 - (i > 16 ? 2 : 0)), 0, 7)]); // broken pediment
  p.rect(13, 13, 6, 9, (i, j) => (j < 15 ? P[1] : hex('#060808'))); p.set(15, 18, hex('#3cff8a')); p.set(16, 18, hex('#1aa858'));
  for (const [x, h] of [[3, 14], [27, 9], [9, 4]]) for (let j = 0; j < h; j++) { p.set(x, 21 - j, P[6]); p.set(x + 1, 21 - j, P[4]); p.set(x + 2, 21 - j, P[2]); }
  p.rect(25, 12, 4, 1, P[5]);
  for (let k = 0; k < 40; k++) { const x = Math.floor(h2(k, 1, 130) * 30) + 1, y = Math.floor(h2(k, 2, 130) * 24) + 6; if (p.on(x, y)) p.set(x, y, MOSS[Math.floor(h2(k, 3, 130) * 4)]); }
  return p.outline(K).canvas();
});
// the Frost Spire: a tall crystal tower (1.5 x 3 tiles)
const spireIcon = (f) => memo('spire' + f, () => {
  const p = new Pix(24, 48), C = pal('#1c2c5a #2a4a88 #3e6cb4 #5a92d8 #82b6ee #b0d6fa #def0ff #ffffff');
  for (let y = 0; y < 46; y++) { const half = y < 12 ? (y / 12) * 4.5 + 0.5 : 5 + (y > 38 ? (y - 38) * 0.6 : 0); for (let x = 0; x < 24; x++) { const dx = x - 11.5; if (Math.abs(dx) > half) continue; let v = 5.5 - (dx + half) / (2 * half) * 4.5 + (y % 6 === 0 ? -0.8 : 0) + (bay(x, y) - 0.5) * 0.6; if (Math.abs(dx) > half - 1) v -= 1; p.set(x, y, C[clamp(Math.round(v), 0, 7)]); } }
  for (const [x, y, h] of [[3, 34, 10], [19, 36, 9], [6, 40, 6], [17, 41, 5]]) for (let j = 0; j < h; j++) { const w = Math.max(0, Math.round((j / h) * 2)); for (let i = -w; i <= w; i++) p.set(x + i, y + j, C[i < 0 ? 6 : i > 0 ? 2 : 4]); }
  for (const y of [16, 24, 32]) { p.set(11, y, f ? C[7] : C[6]); p.set(12, y, C[4]); p.set(11, y + 1, C[5]); }
  p.set(11, 0, C[7]); p.set(12, 1, C[7]);
  return p.outline(hex('#0a1430')).canvas();
});
// desert ruins (2 x 1.5 tiles)
const ruins = () => memo('ruins', () => {
  const p = new Pix(32, 24), P = MESA;
  p.rect(1, 16, 30, 6, (i, j) => SAND[j === 16 ? 6 : 4 - ((i + j) % 5 === 0 ? 1 : 0)]);
  for (const [x, w, h] of [[2, 7, 10], [12, 3, 14], [17, 9, 7], [27, 3, 11]]) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { if (j === h - 1 - (i % 3 === 1 ? 1 : 0) && i % 2) continue; const v = 6 - (i === w - 1 ? 2.5 : 0) - (j % 3 === 2 ? 1 : 0) + (j === h - 1 ? 1 : 0); p.set(x + i, 20 - j, P[clamp(Math.round(v), 0, 8)]); }
  p.rect(4, 14, 3, 6, K); p.rect(19, 16, 3, 4, K);
  for (const [x, y] of [[9, 21], [25, 20], [15, 22]]) { p.set(x, y, P[4]); p.set(x + 1, y, P[3]); p.set(x, y - 1, P[6]); }
  return p.outline(K).canvas();
});
// boulders blocking the pass until the Wyrm falls
const rockslide = () => memo('slide', () => {
  const p = new Pix(16, 16);
  for (const [cx, cy, r] of [[4, 6, 3.6], [11, 5, 3.4], [8, 9, 4], [3, 12, 3], [12, 12, 3.4], [8, 3, 2.6]]) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy); if (d > r) continue; const l = (-dx * 0.6 - dy * 0.7) / r;
    p.set(x, y, STONE[clamp(Math.round(4 + l * 3 + (bay(x, y) - 0.5) - (d > r - 1 ? 1.5 : 0)), 0, 8)]);
  }
  return p.outline(K, 220).canvas();
});
// a swan pedalo, paddling round the Handle Lake
const ship = (f, left) => memo('ship' + f + left, () => {
  const p = new Pix(24, 22), W = pal('#9aa6b8 #c8d0dc #eef2f8 #ffffff');
  for (let x = 3; x < 21; x++) { const bot = 16 + (x > 6 && x < 18 ? 1 : 0); for (let y = 13; y <= bot; y++) p.set(x, y, y === 13 ? W[3] : y === bot ? W[0] : W[2]); }
  p.rect(3, 15, 18, 1, RED[3]); // red stripe
  for (let y = 4; y < 13; y++) { p.set(18, y, W[3]); p.set(19, y, W[2]); } // the neck
  p.rect(17, 2, 4, 3, W[3]); p.rect(21, 3, 2, 1, [236, 150, 40]); p.set(19, 3, [10, 10, 20]); // head, beak, eye
  p.rect(8, 9, 3, 4, RED[2]); p.rect(7, 12, 5, 1, W[1]); p.set(13 + (f & 1), 18, W[1]); // a pedalling lad + a splash
  p.rect(3, 12, 3, 2, W[2]); // tail
  if (left) { const q = new Pix(24, 22); for (let y = 0; y < 22; y++) for (let x = 0; x < 24; x++) { const i = (y * 24 + x) * 4; if (p.d[i + 3]) q.set(23 - x, y, [p.d[i], p.d[i + 1], p.d[i + 2]]); } return q.outline(K).canvas(); }
  return p.outline(K).canvas();
});

// ---------- draw items ----------
export function objects(theme, get, x, y, t, out, m) {
  if (get(x, y) === 'B' && !m.gateOpen) out.push({ img: rockslide(), x, y, z: 0 });
}
const SHIP_SPEED = 0.55; // tiles per second
let route = null;
function shipAt(t) {
  const P = GEN.deco?.ship; if (!P) return null;
  if (!route) { route = []; let L = 0; for (let k = 0; k < P.length; k++) { const a = P[k], b = P[(k + 1) % P.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); route.push([a, b, L, l]); L += l; } route.total = L; }
  let s = (t * SHIP_SPEED) % route.total; for (const [a, b, L, l] of route) if (s <= L + l) { const u = (s - L) / l; return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, left: b[0] < a[0] }; }
  return null;
}
export function mapObjects(m, t, out) {
  if (m.theme !== 'world') return;
  const f8 = Math.floor(t * FPS) % FRAMES;
  for (const [k, [x, y]] of Object.entries(GEN.pois)) {
    if (k === 'haven') out.push({ img: havenIcon(), x: x - 1, y: y + 1 - 42 / 16, z: 1, sy: y + 1 });
    else if (k === 'frost') out.push({ img: frostTown(), x: x - 1, y: y + 1 - 40 / 16, z: 1, sy: y + 1 });
    else if (k === 'mirewood') out.push({ img: village(), x: x - 0.75, y: y + 1 - 2, z: 1, sy: y + 1 });
    else if (k === 'cavern' || k === 'storm') out.push({ img: caveMouth(k === 'storm', k === 'storm' && (f8 === 3 || f8 === 5) ? 1 : 0), x: x - 0.5, y: y + 1 - 28 / 16, z: 1, sy: y + 1 });
    else if (['chippy', 'stones', 'bogshed', 'oasis', 'lodge', 'shed', 'hopsend', 'brewery', 'kilnhaven', 'pizzaoven', 'windmill', 'wreck', 'pyramid', 'icecave'].includes(k) || k.startsWith('dock')) out.push({ img: waysideIcon(k.startsWith('dock') ? 'dock' : k), x: x - 0.25, y: y + 1 - 1.25, z: 1, sy: y + 1 });
    else if (k === 'crypt') out.push({ img: shrine(), x: x - 0.5, y: y + 1 - 2, z: 1, sy: y + 1 });
    else if (k === 'spire') out.push({ img: spireIcon(f8 & 2 ? 1 : 0), x: x - 0.25, y: y + 1 - 3, z: 1, sy: y + 1 });
  }
  const R = GEN.deco?.ruins; if (R) out.push({ img: ruins(), x: R[0], y: R[1] + 1 - 1.5, z: 1, sy: R[1] + 1 });
  const s = shipAt(t);
  if (s) {
    const bob = Math.sin(t * 2.2) * 0.03, img = ship(Math.floor(t * 1.5) % 2, s.left);
    out.push({ draw: (cx, X, Y, TS) => { // wake foam, then the hull
      const u = TS / 16; cx.fillStyle = 'rgba(228,242,255,.55)';
      for (let k = 1; k < 5; k++) { const off = (s.left ? 1 : -1) * k * 3 * u, w = (5 - k) * u; cx.fillRect(Math.round(X + 12 * u + off - w), Math.round(Y + (18 + (k & 1)) * u), Math.round(w * 2), Math.round(u)); }
      cx.drawImage(img, X, Y, 24 * u, 22 * u);
    }, x: s.x - 0.75, y: s.y - 1.1 + bob, w: 1.5, h: 22 / 16, z: 1, sy: s.y + 0.4 });
  }
}

// ---------- whole-world picture for the map screen: the baked terrain (calm water) plus towns, caves and ruins ----------
let MAPIMG = null;
export function mapImage(m) {
  if (MAPIMG) return MAPIMG;
  const B = bake(), W = m.rows[0].length, H = m.rows.length, c = mk(W * 16, H * 16), x = c.getContext('2d'), id = x.createImageData(W * 16, H * 16), o = id.data;
  for (let Y = 0; Y < H * 16; Y++) for (let X = 0; X < W * 16; X++) {
    const gX = X + PAD * 16, gY = Y + PAD * 16, i = gY * B.PW + gX, j = (Y * W * 16 + X) * 4;
    if (!B.wT[i]) { const s = i * 4; o[j] = B.S[s]; o[j + 1] = B.S[s + 1]; o[j + 2] = B.S[s + 2]; o[j + 3] = 255; } else waterPx(o, j, gX, gY, B.wT[i], B.wD[i], B.wF[i], 0);
  }
  x.putImageData(id, 0, 0);
  const items = []; mapObjects(m, 0, items);
  for (const it of items) if (it.img) x.drawImage(it.img, Math.round(it.x * 16), Math.round(it.y * 16));
  MAPIMG = c; return c;
}
