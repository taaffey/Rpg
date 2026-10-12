// Soundtrack verification: node tools/musiccheck.mjs [--wav] [track ...]
// 1) musical checks on the scores (scale, chord tones on strong beats, ranges, parallel octaves, bass vs chords)
// 2) renders every track with OfflineAudioContext in Chromium using the real synth and checks peak, loudness balance,
//    silence gaps, loop seam, beat grid; also renders sfx for music-vs-sfx balance. --wav writes /tmp/music/*.wav
import { createRequire } from 'module';
import fs from 'fs';
const { compile, _TRACKS: SCORES } = await import('../src/audio.js');
const args = process.argv.slice(2), WAV = args.includes('--wav'), only = args.filter((a) => !a.startsWith('--'));
const names = only.length ? only : Object.keys(SCORES);
let problems = 0; const bad = (m) => { problems++; console.log('  ✗ ' + m); };

const SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], phrygdom: [0, 1, 4, 5, 7, 8, 10] };
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }, pc = (s) => (PC[s[0]] + (s[1] === '#' ? 1 : s[1] === 'b' ? -1 : 0) + 12) % 12;
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'], nm = (m) => NAMES[m % 12] + (Math.floor(m / 12) - 1);
const RANGE = { bass: [28, 60], pbass: [28, 60] }, LEADR = [52, 96];

console.log('== musical checks ==');
const summary = {};
for (const name of names) {
  const C = compile(name), S = C.S; console.log(`${name}: ${S.key}, ${S.bpm} bpm, ${S.beats}/${S.sub === 1 ? 8 : 4}, ${C.len / C.barLen} bars, ${(C.len * C.sd).toFixed(1)} s`);
  C.warn.forEach(bad);
  const [tonic, mode] = S.key.split(' '), scale = new Set(SCALE[mode].map((i) => (i + pc(tonic)) % 12)); (S.acc || []).forEach((a) => scale.add(pc(a)));
  const strong = (S.strong || [0, C.barLen / 2]).map((x) => x);
  const isStrong = (s) => strong.includes(s % C.barLen);
  const mels = []; let nct = 0, strongN = 0;
  C.parts.forEach((p, pi) => {
    const sound = new Array(C.len).fill(null), attack = new Array(C.len).fill(false);
    for (let s = 0; s < C.len; s++) for (const ev of C.steps[s]) {
      if (ev.p !== pi || p.t === 'drum') continue;
      const ms = Array.isArray(ev.m) ? ev.m : [ev.m], ch = C.chordAt[s];
      for (const m of ms) {
        if (m == null || Number.isNaN(m)) { bad(`${name} part ${pi}: undefined note at step ${s}`); continue; }
        const [lo, hi] = RANGE[p.i] || (p.t === 'mel' ? LEADR : [36, 100]); if (m < lo || m > hi) bad(`${name} part ${pi} (${p.i}): ${nm(m)} out of range at bar ${Math.floor(s / C.barLen) + 1}`);
        if (p.t === 'mel' && !scale.has(m % 12)) bad(`${name} part ${pi}: ${nm(m)} outside ${S.key} at bar ${Math.floor(s / C.barLen) + 1}`);
        if (p.t !== 'mel' && !ch.pcs.includes(m % 12) && !(p.t === 'bass' && s + ev.l >= ch.at + ch.len)) bad(`${name} part ${pi} (${p.t}): ${nm(m)} not in ${ch.sym}`);
      }
      if (p.t === 'bass' && s === ch.at && ms[0] % 12 !== ch.bass) bad(`${name}: bass ${nm(ms[0])} disagrees with ${ch.sym}`);
      if (p.t === 'mel' && !Array.isArray(ev.m)) { for (let k = 0; k < ev.l && s + k < C.len; k++) sound[s + k] = ev.m; attack[s] = true; }
    }
    if (p.t === 'mel') {
      mels.push({ pi, p, sound, attack });
      for (let s = 0; s < C.len; s++) if (isStrong(s) && sound[s] != null && attack[s]) { const ch = C.chordAt[s]; if (pi === C.parts.findIndex((q) => q.t === 'mel')) { strongN++; if (!ch.pcs.includes(sound[s] % 12)) { nct++; console.log(`    · ${nm(sound[s])} over ${ch.sym} (bar ${Math.floor(s / C.barLen) + 1})`); } } }
    }
  });
  // parallel octaves / unisons between melodic lines on consecutive strong beats (both voices moving)
  for (let a = 0; a < mels.length; a++) for (let b = a + 1; b < mels.length; b++) {
    let prev = null;
    for (let s = 0; s < C.len; s++) {
      if (!isStrong(s)) continue; const x = mels[a].sound[s], y = mels[b].sound[s];
      if (x == null || y == null) { prev = null; continue; }
      if (prev && (x - y) % 12 === 0 && (prev.x - prev.y) % 12 === 0 && x !== prev.x && y !== prev.y) bad(`${name}: parallel octaves parts ${mels[a].pi}/${mels[b].pi} at bar ${Math.floor(s / C.barLen) + 1}`);
      prev = { x, y };
    }
  }
  summary[name] = { strongChordTone: strongN ? (1 - nct / strongN) : 1 };
  if (strongN && nct / strongN > 0.15) bad(`${name}: lead has ${nct}/${strongN} non-chord tones on strong beats`);
}

console.log('\n== offline render (Chromium) ==');
const pw = createRequire('/node-tools/node_modules/')('playwright');
const br = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await br.newPage(); pg.on('pageerror', (e) => console.log('PAGEERR', e.message)); pg.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
await pg.goto('http://localhost:8123/tools/');
if (WAV) fs.mkdirSync('/tmp/music', { recursive: true });
const WAVS = new Set(['title', 'town', 'world', 'battle', 'boss', 'desert', 'mirewood', 'victory', 'spire', 'ending']);
const rows = [];
for (const name of names) {
  const res = await pg.evaluate(async ({ name, wav }) => {
    const A = await import('/src/audio.js'), S = A._TRACKS[name], sr = 32000;
    const C0 = await A._render(name, 0.2, sr), L = C0.r.loopSecs, loops = S.once ? 1 : 2, secs = L * loops + 3;
    const { buf, r } = await A._render(name, secs, sr), ch = [buf.getChannelData(0), buf.getChannelData(1)], n = ch[0].length;
    const mono = new Float32Array(n); for (let i = 0; i < n; i++) mono[i] = (ch[0][i] + ch[1][i]) / 2;
    let peak = 0; for (const d of ch) for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
    const rms = (a, b) => { let s = 0; a = Math.max(0, Math.floor(a * sr)); b = Math.min(n, Math.floor(b * sr)); for (let i = a; i < b; i++) s += mono[i] * mono[i]; return Math.sqrt(s / Math.max(1, b - a)); };
    const db = (x) => 20 * Math.log10(x + 1e-9);
    const from = 1, to = S.once ? L : L * loops, win = [];
    for (let t = from; t + 0.5 <= to; t += 0.25) win.push(db(rms(t, t + 0.5)));
    const sorted = [...win].sort((a, b) => a - b), med = sorted[sorted.length >> 1] ?? -99;
    const out = { name, L, peak, rms: db(rms(from, to)), minWin: sorted[0] ?? -99, med, notes: r.log.length };
    let off = 0; for (const t of r.log) off = Math.max(off, Math.abs(t / r.sd - Math.round(t / r.sd))); out.grid = off;
    if (!S.once) {
      out.seam = db(rms(L - 0.25, L + 0.25)) - med;
      const d = (i) => Math.abs(mono[i] - mono[i - 1]), diffs = []; for (let i = 1; i < n; i += 7) diffs.push(d(i)); diffs.sort((a, b) => a - b);
      let seamMax = 0; for (let i = Math.floor((L - 0.01) * sr); i < (L + 0.01) * sr; i++) seamMax = Math.max(seamMax, d(i)); out.click = seamMax / (diffs[Math.floor(diffs.length * 0.999)] + 1e-9);
      // second pass through the loop should be (near) identical to the first once both have their echo tails
      let xy = 0, xx = 0, yy = 0; const a0 = Math.floor(3 * sr), m = Math.floor((L - 3) * sr), o = Math.floor(L * sr);
      for (let i = a0; i < a0 + m; i += 3) { const x = mono[i], y = mono[i + o]; xy += x * y; xx += x * x; yy += y * y; } out.repeat = xy / Math.sqrt(xx * yy + 1e-12);
    }
    if (wav) { // 16-bit stereo, first loop (+ tail for jingles)
      const len = Math.min(n, Math.floor((S.once ? secs : L + 1) * sr)), b = new DataView(new ArrayBuffer(44 + len * 4)), w = (o, s) => [...s].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
      w(0, 'RIFF'); b.setUint32(4, 36 + len * 4, true); w(8, 'WAVEfmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 2, true); b.setUint32(24, sr, true); b.setUint32(28, sr * 4, true); b.setUint16(32, 4, true); b.setUint16(34, 16, true); w(36, 'data'); b.setUint32(40, len * 4, true);
      for (let i = 0; i < len; i++) for (let c = 0; c < 2; c++) b.setInt16(44 + i * 4 + c * 2, Math.max(-1, Math.min(1, ch[c][i])) * 32767, true);
      let s = ''; const u = new Uint8Array(b.buffer); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); out.wav = btoa(s);
    }
    return out;
  }, { name, wav: WAV && WAVS.has(name) });
  if (res.wav) { fs.writeFileSync(`/tmp/music/${name}.wav`, Buffer.from(res.wav, 'base64')); delete res.wav; }
  rows.push(res);
}
const loopRms = rows.filter((r) => !SCORES[r.name].once).map((r) => r.rms).sort((a, b) => a - b), mid = loopRms[loopRms.length >> 1];
console.log('track       loop s  notes  peak   RMS dB  Δmed  minWin  seam dB  click  repeat  grid');
for (const r of rows) {
  const f = (x, d = 1, w = 6) => (x == null ? '' : x.toFixed(d)).padStart(w);
  console.log(`${r.name.padEnd(10)} ${f(r.L, 1, 7)} ${String(r.notes).padStart(6)} ${f(r.peak, 3)} ${f(r.rms, 1, 8)} ${f(r.rms - mid, 1)} ${f(r.minWin - r.rms, 1, 7)} ${f(r.seam, 1, 8)} ${f(r.click, 2)} ${f(r.repeat, 3, 7)} ${r.grid.toExponential(0).padStart(6)}`);
  if (r.peak >= 0.95) bad(`${r.name}: peak ${r.peak.toFixed(3)} (clipping risk)`);
  if (!SCORES[r.name].once && Math.abs(r.rms - mid) > 3) bad(`${r.name}: loudness ${(r.rms - mid).toFixed(1)} dB from the median`);
  if (!SCORES[r.name].once && r.minWin - r.rms < -20) bad(`${r.name}: a near-silent gap (${(r.minWin - r.rms).toFixed(1)} dB below average)`);
  if (r.seam != null && Math.abs(r.seam) > 6) bad(`${r.name}: loop seam level jump ${r.seam.toFixed(1)} dB`);
  if (r.click != null && r.click > 3) bad(`${r.name}: possible click at the loop seam`);
  if (r.repeat != null && r.repeat < 0.8) bad(`${r.name}: second loop differs from the first (corr ${r.repeat.toFixed(2)})`);
  if (r.grid > 1e-6) bad(`${r.name}: notes off the beat grid`);
  if (!SCORES[r.name].once && (r.L < 38 || r.L > 95)) bad(`${r.name}: loop length ${r.L.toFixed(1)} s`);
}
const sf = await pg.evaluate(async () => {
  const A = await import('/src/audio.js'), out = {};
  for (const k of ['click', 'hit', 'crit', 'heal', 'levelup', 'coin', 'rest', 'fire']) { const { buf } = await A._renderSfx(k, 32000); const d = buf.getChannelData(0); let p = 0, s = 0, c = 0; for (const x of d) { p = Math.max(p, Math.abs(x)); if (Math.abs(x) > 1e-3) { s += x * x; c++; } } out[k] = { peak: p, rms: 20 * Math.log10(Math.sqrt(s / Math.max(1, c)) + 1e-9) }; }
  return out;
});
console.log('\nsfx (active-portion RMS dB / peak):', Object.entries(sf).map(([k, v]) => `${k} ${v.rms.toFixed(1)}/${v.peak.toFixed(2)}`).join('  '));
const sfxMed = Object.values(sf).map((v) => v.rms).sort((a, b) => a - b)[4];
console.log(`music median RMS ${mid.toFixed(1)} dB vs sfx median ${sfxMed.toFixed(1)} dB (music sits ${(sfxMed - mid).toFixed(1)} dB under)`);
if (sfxMed - mid < 2) bad('music is not sitting under the sfx');
for (const [k, v] of Object.entries(sf)) if (v.peak >= 0.95) bad(`sfx ${k} peak ${v.peak.toFixed(2)}`);
await br.close();
console.log(problems ? `\n${problems} problem(s)` : '\nall checks passed'); process.exit(problems ? 1 : 0);
