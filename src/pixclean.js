// ===== Remaster pass: clean up generated pixel art before it is shown =====
// The art generators shade with ordered dither and value noise, which reads as speckle at phone size. This filter keeps every
// real edge and detail but flattens the speckle into clean, solid areas of colour (the look of hand-cleaned modern pixel art):
//   1. a pixel that differs from all four neighbours, while those neighbours agree with each other, takes their colour;
//   2. a pixel close in colour to the colour most of its eight neighbours share is snapped to that colour (dither -> flat tone).
// Strong differences (outlines, highlights, eyes, text) are never touched, and only real palette colours are used (no blending).
// Works on RGBA bytes in place. Written allocation-free: it runs on every town, room, backdrop and overworld tile as they are built.
const DX = [-1, 1, 0, 0, -1, 1, -1, 1], DY = [0, 0, -1, 1, -1, -1, 1, 1];
let SRC = new Uint8ClampedArray(0);
export function cleanPixels(d, w, h, o = {}) {
  const T1 = (o.speck ?? 46) ** 2 * 6, T2 = (o.flat ?? 24) ** 2 * 6, passes = o.passes ?? (w * h > 150000 ? 1 : 2), nb = new Int32Array(8); // big canvases: one pass keeps loading quick
  if (SRC.length < d.length) SRC = new Uint8ClampedArray(d.length);
  const s = SRC;
  for (let pass = 0; pass < passes; pass++) {
    s.set(d.subarray(0, d.length));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; if (s[i + 3] < 255) continue;
      let n = 0, orth = 0;
      for (let k = 0; k < 8; k++) { const X = x + DX[k], Y = y + DY[k]; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = (Y * w + X) * 4; if (s[j + 3] === 255) { nb[n++] = j; if (k < 4) orth++; } }
      if (n < 5) continue; // edges of a shape keep their pixels
      let same = 0; for (let k = 0; k < n; k++) { const j = nb[k]; if (s[j] === s[i] && s[j + 1] === s[i + 1] && s[j + 2] === s[i + 2]) same++; }
      if (same >= 4) continue; // already part of a flat area: the common case, so it is checked first
      let best = -1, bestN = 0; // the colour group most neighbours share (candidates: the four orthogonal neighbours)
      for (let a = 0; a < Math.min(orth, n); a++) { let c = 0; const A = nb[a]; for (let b = 0; b < n; b++) { const B = nb[b], r = s[A] - s[B], g = s[A + 1] - s[B + 1], bl = s[A + 2] - s[B + 2]; if (r * r * 2 + g * g * 3 + bl * bl < T2) c++; } if (c > bestN) { bestN = c; best = nb[a]; } }
      if (best < 0) continue;
      let lone = false;
      const D = (p, q) => { const r = s[p] - s[q], g = s[p + 1] - s[q + 1], bl = s[p + 2] - s[q + 2]; return r * r * 2 + g * g * 3 + bl * bl; };
      if (orth === 4) { lone = true; for (let k = 0; k < 4 && lone; k++) if (D(i, nb[k]) < T2 / 2 || D(nb[0], nb[k]) >= T1) lone = false; }
      if ((lone || (bestN >= 5 && D(i, best) < T2)) && (s[i] !== s[best] || s[i + 1] !== s[best + 1] || s[i + 2] !== s[best + 2])) { d[i] = s[best]; d[i + 1] = s[best + 1]; d[i + 2] = s[best + 2]; }
    }
  }
  return d;
}
export const REMASTER = { on: true };
