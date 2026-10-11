// ===== Shared autotile engine: rounded region layers composed per tile, plus texture helpers =====
// Every tile is a ground texture plus region layers. A layer's edge is found by sampling a disc around each pixel over the
// 3x3 neighbourhood, so straight edges stay on the tile border while corners come out rounded. Results are cached per key.
export const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export function rng(seed) { let a = seed; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const hex = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };

// ---------- textures: 32x32 so repeats are less obvious; sampled by world position so neighbours line up ----------
export function tex(draw) { const c = mk(32, 32), x = c.getContext('2d'); draw(x); return { c, d: x.getImageData(0, 0, 32, 32).data }; }
export function flat(base, specks = [], density = 0, seed = 1) {
  return tex((x) => { const r = rng(seed); x.fillStyle = base; x.fillRect(0, 0, 32, 32); for (let i = 0; i < 1024 * density; i++) { x.fillStyle = specks[Math.floor(r() * specks.length)]; x.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), specks.length > 2 && i % 3 === 0 ? 2 : 1, 1); } });
}
export function water(base, wave, frame) { // NES ocean: rows of little scalloped ripples that drift sideways
  return tex((x) => {
    x.fillStyle = base; x.fillRect(0, 0, 32, 32); x.fillStyle = wave;
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      const ox = (col * 8 + (row % 2) * 4 + frame * 2) % 32, oy = row * 8 + 2;
      for (const [dx, dy] of [[0, 1], [1, 0], [2, 0], [3, 0], [4, 1], [1, 3], [2, 3], [3, 3]]) x.fillRect((ox + dx) % 32, oy + dy, 1, 1);
    }
  });
}
export function canopy(dark, mid, light, gap, seed) { // dense forest: overlapping round bushes, wrapped so the texture tiles
  return tex((x) => {
    const r = rng(seed); x.fillStyle = gap; x.fillRect(0, 0, 32, 32);
    const blob = (cx, cy, rad) => { for (const ox of [-32, 0, 32]) for (const oy of [-32, 0, 32]) {
      x.fillStyle = dark; x.beginPath(); x.arc(cx + ox + 0.5, cy + oy + 1.5, rad, 0, 7); x.fill();
      x.fillStyle = mid; x.beginPath(); x.arc(cx + ox, cy + oy, rad - 0.6, 0, 7); x.fill();
      x.fillStyle = light; x.fillRect(Math.round(cx + ox - rad / 2), Math.round(cy + oy - rad / 2), 2, 1); x.fillRect(Math.round(cx + ox - rad / 2), Math.round(cy + oy - rad / 2) + 1, 1, 1);
    } };
    for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) blob(col * 6.4 + (row % 2) * 3.2 + r() * 1.5, row * 6.4 + r() * 1.5, 3.6 + r() * 0.8);
  });
}
export function cobble(fill, line, hi, seed) { // rounded grey stones in offset rows (FF1 town streets)
  return tex((x) => {
    const r = rng(seed); x.fillStyle = line; x.fillRect(0, 0, 32, 32);
    for (let row = 0; row < 8; row++) for (let col = -1; col < 5; col++) {
      const w = 6 + Math.floor(r() * 3), sx = col * 8 + (row % 2) * 4 + Math.floor(r() * 2), sy = row * 4;
      x.fillStyle = fill; x.fillRect(sx + 1, sy, w - 1, 3); x.fillStyle = hi; x.fillRect(sx + 1, sy, w - 2, 1);
    }
  });
}
export function blocks(fill, line, hi) { // low stone town wall: big pale blocks
  return tex((x) => {
    x.fillStyle = line; x.fillRect(0, 0, 32, 32);
    for (let row = 0; row < 4; row++) for (let col = -1; col < 3; col++) { const sx = col * 16 + (row % 2) * 8, sy = row * 8; x.fillStyle = fill; x.fillRect(sx + 1, sy + 1, 14, 6); x.fillStyle = hi; x.fillRect(sx + 1, sy + 1, 14, 1); }
  });
}
export function planks(fill, line, seed) { // boardwalk for the swamp village
  return tex((x) => { const r = rng(seed); x.fillStyle = fill; x.fillRect(0, 0, 32, 32); x.fillStyle = line; for (let y = 3; y < 32; y += 5) x.fillRect(0, y, 32, 1); for (let y = 0; y < 32; y += 5) x.fillRect(Math.floor(r() * 30), y, 1, 3); });
}
export function sand(base, dots, seed) { return flat(base, dots, 0.06, seed); }


// ---------- region masks ----------
const masks = new Map(), cellW = new Map();
function cellWeights(r) { // for every pixel: how many disc samples land in each of the 3x3 cells (shared by all masks of radius r)
  let w = cellW.get(r); if (w) return w;
  const pts = []; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + 0.5) pts.push([dx, dy]);
  w = new Uint16Array(256 * 9); w.n = pts.length;
  for (let py = 0; py < 16; py++) for (let px = 0; px < 16; px++) for (const [dx, dy] of pts) { const gx = Math.floor((px + 16.5 + dx) / 16), gy = Math.floor((py + 16.5 + dy) / 16); w[(py * 16 + px) * 9 + gy * 3 + gx]++; }
  cellW.set(r, w); return w;
}
export function fracMask(bits, r) { // bits: 9-char '0'/'1', row-major 3x3, centre = this tile
  const key = bits + r; let m = masks.get(key); if (m) return m;
  const w = cellWeights(r), on = [...bits].map((b) => b === '1'); m = new Float32Array(256);
  for (let p = 0; p < 256; p++) { let c = 0; for (let k = 0; k < 9; k++) if (on[k]) c += w[p * 9 + k]; m[p] = c / w.n; }
  masks.set(key, m); return m;
}


// composer(THEMES, textures) -> autoTile(theme, get, x, y, frame): get(x, y) returns the map char (callers clamp the edges);
// frame drives animated layers. Each theme = { ground(ch, N) -> texture name, base?(ch, N) -> region tag, layers: [{ is(c, base), tex, r, edge, edgeCol, inner?, anim? }] }
export function composer(THEMES, textures) {
 const tiles = new Map();
 return function autoTile(theme, get, x, y, frame) {
  const th = THEMES[theme], ch = get(x, y), N = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) N.push(get(x + dx, y + dy));
  const gname = th.ground(ch, N.join('')), base = th.base ? th.base(ch, N) : '', par = ((x & 1) << 4) | ((y & 1) << 5);
  let key = theme + gname + base + par, anyAnim = false; const parts = [];
  for (const L of th.layers) {
    const bits = N.map((c) => (L.is(c, base) ? '1' : '0')).join('');
    if (bits === '000000000') continue;
    parts.push([L, bits]); key += '|' + bits; if (L.anim) anyAnim = true;
  }
  const f = anyAnim ? frame % 4 : 0; key += ':' + f;
  let c = tiles.get(key); if (c) return c;
  const T = textures(), out = new ImageData(16, 16), o = out.data, ox = (x & 1) * 16, oy = (y & 1) * 16;
  const sample = (t, px, py, i) => { const s = ((oy + py) * 32 + ox + px) * 4; o[i] = t[s]; o[i + 1] = t[s + 1]; o[i + 2] = t[s + 2]; o[i + 3] = 255; };
  const g = T[gname].d;
  for (let p = 0; p < 256; p++) sample(g, p & 15, p >> 4, p * 4);
  for (const [L, bits] of parts) {
    const tn = typeof L.tex === 'function' ? L.tex(gname, base) : L.tex, src = L.anim ? T[tn][f] : T[tn], t = src.d;
    const m = bits === '111111111' ? null : fracMask(bits, L.r), ec = hex(L.edgeCol), ic = L.inner && hex(L.inner);
    for (let p = 0; p < 256; p++) {
      const v = m ? m[p] : 1, i = p * 4; if (v < 0.5) continue;
      if (v < L.edge) { const col = ic && v >= (0.5 + L.edge) / 2 ? ic : ec; o[i] = col[0]; o[i + 1] = col[1]; o[i + 2] = col[2]; }
      else sample(t, p & 15, p >> 4, i);
    }
  }
  c = mk(16, 16); c.getContext('2d').putImageData(out, 0, 0); tiles.set(key, c);
  if (tiles.size > 6000) tiles.clear(); // safety valve; the working set is a few hundred tiles
  return c;
}
}
