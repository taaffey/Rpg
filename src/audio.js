// ===== Gemforge audio: SNES-style WebAudio synth, score sequencer (lookahead scheduler), sound effects =====
// Graph: notes -> part gain/pan -> track faders -> { dry, shared echo (feedback delay + lowpass), convolver reverb } -> music bus
//        -> master -> compressor -> out.   sfx -> sfx bus -> master.   Scores live in musicdata.js.
import { SCORES, FALLBACK } from './musicdata.js';

const MUSIC_LVL = 0.25, SFX_LVL = 0.9, MASTER = 0.8, LOOK = 0.3, TICK = 25, MAXV = 56;
let E = null; // current graph { ctx, master, music, sfx, echoIn, delay, fb, revIn, noise, waves, voices }
let musicVol = 1, sfxVol = 1, muted = false; try { muted = localStorage.getItem('gemforge-muted') === '1'; } catch {}
let wanted = null, T = null, timer = null;

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const accOf = (c) => (c === '#' ? 1 : c === 'b' ? -1 : 0);
const pcOf = (s) => (NOTE[s[0]] + accOf(s[1]) + 12) % 12;
const midi = (n) => { const m = /^([A-G])([#b]?)(-?\d)$/.exec(n); if (!m) throw new Error('bad note ' + n); return 12 * (+m[3] + 1) + NOTE[m[1]] + accOf(m[2]); };
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---------- score compiler ----------
const QUAL = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6], dim7: [0, 3, 6, 9], aug: [0, 4, 8], sus4: [0, 5, 7], sus2: [0, 2, 7], m7b5: [0, 3, 6, 10], add9: [0, 4, 7, 14], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9] };
export function parseChord(sym) {
  const m = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(sym); if (!m || !QUAL[m[2]]) throw new Error('bad chord ' + sym);
  const root = pcOf(m[1]); return { sym, root, iv: QUAL[m[2]], bass: m[3] ? pcOf(m[3]) : root, pcs: QUAL[m[2]].map((i) => (root + i) % 12) };
}
const toks = (s) => s.split(/\s+/).filter(Boolean);
const tl = (tk) => { const i = tk.lastIndexOf(':'); return i < 0 ? [tk, 1] : [tk.slice(0, i), +tk.slice(i + 1)]; };
const above = (pc, lo) => lo + (((pc - lo) % 12) + 12) % 12; // lowest midi >= lo with pitch class pc
function cycle(rh, len, fn) { const r = toks(rh).map(tl); for (let s = 0, k = 0; s < len && r.length; k++) { const [x, l] = r[k % r.length]; if (x !== '-') fn(s, Math.min(l, len - s), x); s += l; } }
const VEL = { X: 1, x: 0.8, o: 0.5, r: 0.55 };
const cache = {};
export function compile(name) {
  if (cache[name]) return cache[name];
  const S = SCORES[name], barLen = S.beats * S.sub, sd = 60 / S.bpm / S.sub, warn = [];
  let at = 0; const prog = toks(S.prog).filter((t) => t !== '|').map((tk) => { const [s, l] = tl(tk); const c = { ...parseChord(s), at, len: l }; at += l; return c; });
  const len = at, chordAt = new Array(len); prog.forEach((c, i) => { c.i = i; for (let s = c.at; s < c.at + c.len; s++) chordAt[s] = c; });
  const steps = Array.from({ length: len }, () => []);
  const parts = S.parts.map((p, pi) => {
    const inBars = (s) => !p.bars || p.bars.some(([a, b]) => s >= a * barLen && s < b * barLen);
    const add = (s, m, l, v, x) => { if (s < len && inBars(s)) steps[s].push({ p: pi, m, l, v, ...x }); };
    if (p.t === 'mel') {
      let s = (p.at || 0) * barLen;
      for (const tk of toks(p.n)) {
        if (tk === '|') { if (s % barLen) warn.push(`${name} part ${pi}: bar line at step ${s} is off the bar grid`); continue; }
        const [n, l] = tl(tk); if (n !== '-') { const ms = n.split('+').map(midi); add(s, ms.length > 1 ? ms : ms[0], l, 0.8); } s += l;
      }
      if (s > len) warn.push(`${name} part ${pi}: ${s} steps but the loop is ${len}`);
      if (!p.at && !p.bars && s !== len) warn.push(`${name} part ${pi}: ${s} steps but the loop is ${len}`);
    } else if (p.t === 'pad') {
      for (const c of prog) { const lo = (p.c ?? 60) - 5, ns = [...new Set(c.pcs)].map((pc) => above(pc, lo)).sort((a, b) => a - b); cycle(p.rh || `x:${c.len}`, c.len, (s, l) => add(c.at + s, ns, l, 0.8)); }
    } else if (p.t === 'arp') {
      for (const c of prog) {
        const lo = p.lo ?? 55, tones = []; for (let m = lo; m < lo + 48; m++) if (c.pcs.includes(m % 12)) tones.push(m);
        cycle(p.pat.split(' ').map((x) => `${x}:${p.len || 1}`).join(' '), c.len, (s, l, x) => add(c.at + s, tones[+x], l, 0.8));
      }
    } else if (p.t === 'bass') {
      const lo = p.lo ?? 36, R = (c) => above(c.bass, lo);
      for (const c of prog) {
        const r = R(c), root = r - ((c.bass - c.root + 12) % 12), nx = prog[(c.i + 1) % prog.length];
        const deg = { R: r, 3: root + c.iv[1], 5: root + c.iv[2], 7: root + (c.iv[3] ?? 10), 8: r + 12, L: root - 5, A: R(nx) - 1 };
        cycle(p.pat, c.len, (s, l, x) => add(c.at + s, deg[x], l, s === 0 ? 0.85 : 0.72));
      }
    } else if (p.t === 'drum') {
      for (const [lane, pat] of Object.entries(p.p)) for (let s = 0; s < len; s++) { const ch = pat[s % pat.length]; if (VEL[ch]) add(s, lane, 1, VEL[ch], { roll: ch === 'r', f: lane === 't' ? hz(above(chordAt[s].root, 38)) : 0 }); }
    }
    return p;
  });
  return (cache[name] = { name, S, sd, len, barLen, prog, chordAt, steps, parts, warn, once: !!S.once });
}

// ---------- synth graph ----------
function impulse(c, secs) {
  const n = Math.floor(c.sampleRate * secs), b = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let lp = 0; for (let i = 0; i < n; i++) { const x = i / n, k = 0.25 + 0.7 * x; lp = lp * k + (Math.random() * 2 - 1) * (1 - k); d[i] = i < c.sampleRate * 0.012 ? 0 : lp * Math.pow(1 - x, 2.6) * 1.6; } }
  return b;
}
function graph(c, offline = false) {
  const G = { ctx: c, waves: {}, voices: [] }, gain = (v, to) => { const g = c.createGain(); g.gain.value = v; if (to) g.connect(to); return g; };
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -12; comp.knee.value = 10; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.25; comp.connect(c.destination);
  G.master = gain(muted && !offline ? 0 : MASTER, comp); G.music = gain(MUSIC_LVL * (offline ? 1 : musicVol), G.master); G.sfx = gain(SFX_LVL * (offline ? 1 : sfxVol), G.master);
  // SNES-style echo: feedback delay through a lowpass (each repeat darker), plus a little high-pass so lows don't pile up
  G.echoIn = gain(1); G.delay = c.createDelay(1.5); G.delay.delayTime.value = 0.3; const elp = c.createBiquadFilter(), ehp = c.createBiquadFilter();
  elp.type = 'lowpass'; elp.frequency.value = 2600; ehp.type = 'highpass'; ehp.frequency.value = 220; G.fb = gain(0.3);
  G.echoIn.connect(G.delay); G.delay.connect(elp); elp.connect(ehp); ehp.connect(G.fb); G.fb.connect(G.delay); ehp.connect(gain(0.6, G.music));
  G.revIn = gain(1); const cv = c.createConvolver(); cv.buffer = impulse(c, 2.2); G.revIn.connect(cv); cv.connect(gain(0.55, G.music));
  G.noise = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = G.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return G;
}
function ensure() {
  if (E) return true;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
  E = graph(new AC()); return true;
}

// wavetables (Fourier series -> PeriodicWave)
const HARM = {
  warm: Array.from({ length: 28 }, (_, i) => (i % 2 ? 0.75 : 1) / Math.pow(i + 1, 1.2)),
  pulse: { cos: Array.from({ length: 28 }, (_, i) => Math.sin(Math.PI * (i + 1) * 0.25) / (i + 1)) },
  flute: [1, 0.22, 0.07, 0.03, 0.015], ocarina: [1, 0.06, 0.02], glass: [1, 0.25, 0.1, 0.05],
  reed: [1, 0.5, 0.75, 0.55, 0.45, 0.32, 0.26, 0.18, 0.12, 0.08, 0.05], choir: [1, 0.55, 0.38, 0.45, 0.3, 0.1, 0.06, 0.04, 0.03],
  harp: [1, 0.45, 0.2, 0.1, 0.05, 0.03], organ: [1, 0.9, 0.55, 0.5, 0, 0.3, 0, 0.25, 0, 0, 0, 0.1],
};
function wave(name) {
  if (E.waves[name]) return E.waves[name];
  const h = HARM[name], a = h.cos || h, re = new Float32Array(a.length + 1), im = new Float32Array(a.length + 1);
  a.forEach((v, i) => { (h.cos ? re : im)[i + 1] = v; }); return (E.waves[name] = E.ctx.createPeriodicWave(re, im));
}
function env(g, t, a, peak, d, s, dur, r) {
  const P = g.gain; P.setValueAtTime(0, t); P.linearRampToValueAtTime(peak, t + a); if (s < 1) P.setTargetAtTime(peak * s, t + a, d / 3);
  const off = Math.max(t + a, t + dur); P.setTargetAtTime(0, off, r / 3); return off + r * 1.7;
}
function breath(t, f, amt, out) { const c = E.ctx, s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(); s.buffer = E.noise; bp.type = 'bandpass'; bp.frequency.value = Math.min(9000, f * 2.2); bp.Q.value = 1.5; g.gain.setValueAtTime(amt, t); g.gain.setTargetAtTime(0, t + 0.02, 0.03); s.connect(bp); bp.connect(g); g.connect(out); s.start(t, (t * 7.3) % 0.8); s.stop(t + 0.2); }
// generic subtractive voice: oscillators (wavetable or native) -> optional lowpass (with envelope) -> amp envelope (sustained or plucked)
function voice(S, t, f, dur, vel, out) {
  const c = E.ctx, g = c.createGain(); let end;
  if (S.pluck) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(S.peak * vel, t + 0.004); g.gain.setTargetAtTime(0, t + 0.004, S.pluck / 4); end = t + S.pluck * 1.35; }
  else end = env(g, t, S.a, S.peak * vel, S.d ?? 0.3, S.s ?? 1, dur, S.r);
  let head = g;
  if (S.lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = S.q ?? 0.7; if (S.fe) { fl.frequency.setValueAtTime(S.fe[0], t); fl.frequency.linearRampToValueAtTime(S.fe[1], t + S.fe[2]); fl.frequency.setTargetAtTime(S.lp, t + S.fe[2], 0.12); } else fl.frequency.value = S.lp; fl.connect(g); head = fl; }
  g.connect(out);
  let lg = null;
  if (S.vib) { const lfo = c.createOscillator(); lfo.frequency.value = 5 + ((f * 13.7) % 0.9); lg = c.createGain(); lg.gain.setValueAtTime(0, t + S.vib[1]); lg.gain.linearRampToValueAtTime(S.vib[0], t + S.vib[1] + 0.4); lfo.connect(lg); lfo.start(t); lfo.stop(end); }
  S.w.forEach((w, i) => {
    const o = c.createOscillator(), fr = f * (S.mul?.[i] ?? 1); if (HARM[w]) o.setPeriodicWave(wave(w)); else o.type = w;
    if (S.bend) { o.frequency.setValueAtTime(fr * S.bend[0], t); o.frequency.setTargetAtTime(fr, t, S.bend[1]); } else o.frequency.value = fr;
    if (S.det) o.detune.value = S.det[i] ?? 0; if (lg) lg.connect(o.detune);
    if (S.mix) { const og = c.createGain(); og.gain.value = S.mix[i]; o.connect(og); og.connect(head); } else o.connect(head);
    o.start(t); o.stop(end);
  });
  if (S.breath) breath(t, f, S.breath * vel, out);
  return end;
}
function fm(t, f, vel, out, ratio, index, decay, peak) {
  const c = E.ctx, car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain(), end = t + decay * 1.35;
  car.frequency.value = f; mod.frequency.value = f * ratio; mg.gain.setValueAtTime(f * index, t); mg.gain.setTargetAtTime(f * index * 0.08, t, decay * 0.18);
  mod.connect(mg); mg.connect(car.frequency); car.connect(g); g.connect(out);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak * vel, t + 0.003); g.gain.setTargetAtTime(0, t + 0.003, decay / 4);
  car.start(t); mod.start(t); car.stop(end); mod.stop(end); return end;
}
const P = {
  lead: { w: ['warm', 'pulse'], det: [-6, 6], mix: [0.6, 0.45], lp: 3600, a: 0.012, d: 0.5, s: 0.75, r: 0.15, vib: [12, 0.2], peak: 0.32 },
  strings: { w: ['sawtooth', 'sawtooth'], det: [-9, 9], lp: 2600, a: 0.08, d: 0.6, s: 0.9, r: 0.3, vib: [9, 0.25], peak: 0.24 },
  flute: { w: ['flute'], a: 0.06, d: 0.4, s: 0.85, r: 0.12, vib: [16, 0.22], peak: 0.45, breath: 0.06 },
  panflute: { w: ['flute'], a: 0.05, d: 0.3, s: 0.8, r: 0.2, vib: [6, 0.3], peak: 0.45, breath: 0.12 },
  ocarina: { w: ['ocarina'], a: 0.04, d: 0.3, s: 0.9, r: 0.1, vib: [12, 0.2], peak: 0.5 },
  reed: { w: ['reed'], lp: 3000, a: 0.03, d: 0.3, s: 0.85, r: 0.1, vib: [14, 0.18], peak: 0.34 },
  accordion: { w: ['reed', 'reed'], det: [-10, 10], lp: 2600, a: 0.02, d: 0.3, s: 0.85, r: 0.08, peak: 0.24 }, // musette: two reeds a few cents apart beat against each other, no vibrato
  choir: { w: ['choir', 'choir'], det: [-9, 9], lp: 2000, a: 0.25, d: 0.5, s: 1, r: 0.5, vib: [8, 0.3], peak: 0.26 },
  glass: { w: ['glass'], lp: 5000, a: 0.12, d: 1, s: 0.85, r: 0.8, vib: [6, 0.3], peak: 0.42 },
  pad: { w: ['sawtooth', 'sawtooth', 'sawtooth'], det: [-11, 0, 11], lp: 1150, a: 0.45, d: 1, s: 1, r: 0.9, peak: 0.12 },
  organ: { w: ['organ'], lp: 3500, a: 0.03, s: 1, r: 0.15, peak: 0.2 },
  brass: { w: ['sawtooth', 'sawtooth'], det: [-5, 5], lp: 1800, fe: [400, 3000, 0.05], q: 1.2, a: 0.03, d: 0.3, s: 0.8, r: 0.12, vib: [8, 0.3], peak: 0.24 },
  horn: { w: ['sawtooth', 'sawtooth'], det: [-6, 6], lp: 1100, fe: [300, 1600, 0.08], a: 0.06, d: 0.4, s: 0.85, r: 0.2, vib: [6, 0.35], peak: 0.26 },
  harp: { w: ['harp'], lp: 3800, fe: [6000, 3800, 0.03], pluck: 1.5, peak: 0.42 },
  pizz: { w: ['triangle'], lp: 2000, pluck: 0.28, peak: 0.55 },
  sitar: { w: ['sawtooth', 'sawtooth'], det: [0, 9], lp: 900, fe: [4500, 900, 0.1], q: 2, bend: [1.015, 0.03], pluck: 0.8, peak: 0.22 },
  bass: { w: ['triangle', 'sine'], mix: [0.7, 0.6], lp: 1200, a: 0.006, d: 0.35, s: 0.65, r: 0.07, peak: 0.6 },
  pbass: { w: ['sawtooth', 'sine'], mix: [0.55, 0.7], lp: 650, fe: [1900, 650, 0.07], q: 2, a: 0.003, d: 0.2, s: 0.7, r: 0.05, peak: 0.45 },
};
const INST = {
  celesta: (t, f, d, v, o) => fm(t, f, v, o, 4, 1.1, 1.0, 0.36),
  bell: (t, f, d, v, o) => fm(t, f, v, o, 3.5, 2, 2.2, 0.3),
  marimba: (t, f, d, v, o) => { fm(t, f * 4, v, o, 1, 0.3, 0.06, 0.1); return fm(t, f, v, o, 1, 0.6, 0.5, 0.5); },
};
function play(inst, t, f, dur, vel, out) { return INST[inst] ? INST[inst](t, f, dur, vel, out) : voice(P[inst] || P.lead, t, f, dur, vel, out); }

// percussion (filtered noise + pitched sines)
function nz(t, dur, vel, out, type, freq, q = 0.8, att = 0) {
  const c = E.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = E.noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(att ? 0 : vel, t); if (att) g.gain.linearRampToValueAtTime(vel, t + att); g.gain.setTargetAtTime(0, t + att, dur / 4);
  s.connect(f); f.connect(g); g.connect(out); s.start(t, (t * 3.7) % 0.6); s.stop(t + att + dur * 1.3);
}
function thump(t, f0, f1, ft, dur, vel, out, type = 'sine') {
  const c = E.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + ft);
  g.gain.setValueAtTime(vel, t); g.gain.setTargetAtTime(0, t + 0.005, dur / 4); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur * 1.3);
}
const DRUM = {
  k: (t, v, o) => { thump(t, 130, 42, 0.09, 0.3, v, o); nz(t, 0.012, v * 0.15, o, 'highpass', 3000); },
  s: (t, v, o) => { nz(t, 0.16, v * 0.55, o, 'bandpass', 1900); thump(t, 210, 160, 0.05, 0.09, v * 0.3, o, 'triangle'); },
  h: (t, v, o) => nz(t, 0.035, v * 0.22, o, 'highpass', 7500),
  o: (t, v, o) => nz(t, 0.22, v * 0.18, o, 'highpass', 7000),
  c: (t, v, o) => nz(t, 1.6, v * 0.24, o, 'highpass', 5000),
  t: (t, v, o, f) => { thump(t, f * 1.08, f, 0.06, 1.3, v * 0.7, o); thump(t, f * 2.02, f * 2, 0.06, 0.5, v * 0.15, o); nz(t, 0.08, v * 0.25, o, 'lowpass', 400); },
  b: (t, v, o) => thump(t, 120, 78, 0.12, 0.35, v * 0.7, o),
  i: (t, v, o) => { thump(t, 920, 860, 0.03, 0.05, v * 0.2, o); nz(t, 0.03, v * 0.22, o, 'bandpass', 3500, 1.5); },
  j: (t, v, o) => nz(t, 0.12, v * 0.24, o, 'bandpass', 9000, 2),
  m: (t, v, o) => nz(t, 0.06, v * 0.2, o, 'highpass', 6000, 0.7, 0.015),
  w: (t, v, o) => { thump(t, 1000, 980, 0.02, 0.06, v * 0.3, o); thump(t, 1530, 1500, 0.02, 0.04, v * 0.12, o); },
  n: (t, v, o) => { const c = E.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = E.noise; s.loop = true; f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(900, t + 1.6); f.frequency.linearRampToValueAtTime(400, t + 3.4);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * 0.3, t + 1.4); g.gain.linearRampToValueAtTime(0, t + 3.5); s.connect(f); f.connect(g); g.connect(o); s.start(t); s.stop(t + 3.6); },
  e: (t, v, o) => fm(t, 2637, v, o, 2.76, 1, 2.2, 0.12),
};

// ---------- sequencer ----------
function instance(name, offline = false) {
  const C = compile(name), c = E.ctx, S = C.S, mk = (to) => { const g = c.createGain(); g.gain.value = 0; g.connect(to); return g; };
  const I = { name, C, offline, idx: 0, t0: 0, next: 0, done: false, log: offline ? [] : null };
  I.dry = mk(E.music); I.ech = mk(E.echoIn); I.rev = mk(E.revIn);
  I.outs = C.parts.map((p) => {
    const g = c.createGain(); g.gain.value = p.v * (S.gain ?? 1); let n = g;
    if (p.pan && c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = p.pan; g.connect(pn); n = pn; }
    n.connect(I.dry); const se = c.createGain(); se.gain.value = p.e ?? S.e ?? 0.22; n.connect(se); se.connect(I.ech);
    const sr = c.createGain(); sr.gain.value = p.r ?? S.r ?? 0.2; n.connect(sr); sr.connect(I.rev); return g;
  });
  return I;
}
function playStep(I, s, t) {
  const C = I.C, c = E.ctx;
  for (const ev of C.steps[s]) {
    const p = C.parts[ev.p], out = I.outs[ev.p]; if (I.log) I.log.push(t);
    if (p.t === 'drum') { const fn = DRUM[ev.m]; if (!fn) continue; if (ev.roll) for (let k = 0; k < 4; k++) fn(t + (k * C.sd) / 4, ev.v * (0.6 + k * 0.1), out, ev.f); else fn(t, ev.v, out, ev.f); continue; }
    if (!I.offline) { const now = c.currentTime; if (E.voices.length > MAXV) E.voices = E.voices.filter((e) => e > now); if (E.voices.length > MAXV) continue; } // voice cap keeps old iPhones happy
    const dur = ev.l * C.sd * (p.leg ?? 0.92);
    for (const m of Array.isArray(ev.m) ? ev.m : [ev.m]) { const end = play(p.i, t, hz(m), dur, ev.v, out); if (!I.offline) E.voices.push(end); }
  }
}
function pump(I, until) {
  const C = I.C, now = E.ctx.currentTime;
  if (!I.offline && I.next < now - 0.02) { I.idx += Math.ceil((now - I.next) / C.sd); I.next = I.t0 + I.idx * C.sd; } // main thread stalled: skip ahead on the grid instead of bunching notes
  while (I.next < until) {
    if (C.once && I.idx >= C.len) { I.done = true; if (!I.offline && wanted === I.name) wanted = null; break; }
    if (!muted || I.offline) playStep(I, I.idx % C.len, I.next);
    I.idx++; I.next = I.t0 + I.idx * C.sd; // computed from t0: no drift over long sessions
  }
}
function tick() {
  timer = null; if (!T || !E) return;
  if (E.ctx.state === 'running') pump(T, E.ctx.currentTime + LOOK);
  if (!T.done) timer = setTimeout(tick, E.ctx.state === 'running' ? TICK : 250);
}
function setEcho(C, at) { const c = E.ctx; E.delay.delayTime.setTargetAtTime(Math.min(0.75, (C.S.echo ?? 3) * C.sd), at, 0.05); E.fb.gain.setTargetAtTime(C.S.fb ?? 0.3, at, 0.05); }
function retire(I, now, fo) {
  for (const f of [I.dry, I.ech, I.rev]) { f.gain.cancelScheduledValues(now); f.gain.setValueAtTime(f.gain.value, now); f.gain.linearRampToValueAtTime(0, now + fo); }
  setTimeout(() => { for (const f of [I.dry, I.ech, I.rev]) try { f.disconnect(); } catch {} }, (fo + LOOK + 3) * 1000);
}
function startTrack(name) {
  const c = E.ctx, now = c.currentTime, S = SCORES[name];
  if (T) retire(T, now, S.fast ? 0.12 : 0.7);
  T = instance(name); T.t0 = T.next = now + 0.05;
  const fi = S.fadeIn ?? (S.fast ? 0.02 : 0.6);
  for (const f of [T.dry, T.ech, T.rev]) { f.gain.setValueAtTime(0, now); f.gain.linearRampToValueAtTime(1, now + 0.05 + fi); }
  setEcho(T.C, now); clearTimeout(timer); tick();
}
const resolve = (n) => (SCORES[n] ? n : SCORES[FALLBACK[n]] ? FALLBACK[n] : /cave|crypt|ruin|spire|storm|dungeon|tower/.test(n || '') ? 'dungeon' : 'world');
function sync() { if (!E || E.ctx.state !== 'running' || !wanted) return; if (T && T.name === wanted && !T.done) return; startTrack(wanted); }

export function music(name) { wanted = resolve(name); sync(); }
export function unlock() {
  if (!ensure()) return; const c = E.ctx;
  if (c.state === 'suspended' || c.state === 'interrupted') { try { c.resume().then(sync, () => {}); } catch {} }
  if (!unlock.primed) { unlock.primed = true; try { const b = c.createBuffer(1, 1, 22050), src = c.createBufferSource(); src.buffer = b; src.connect(c.destination); src.start(0); } catch {} } // iOS: a silent blip inside the gesture fully unlocks audio
  sync();
}
// iOS suspends audio when the app is backgrounded or the screen locks; pause music cleanly and resume on return
export function setBackgrounded(bg) {
  if (!E) return;
  if (bg) { try { E.ctx.suspend(); } catch {} }
  else if (!muted) { try { E.ctx.resume().then(sync, () => {}); } catch {} sync(); }
}
export const isMuted = () => muted;
export function setVolumes(m, s) { musicVol = m; sfxVol = s; if (E) { E.music.gain.value = MUSIC_LVL * m; E.sfx.gain.value = SFX_LVL * s; } }
export function setMuted(m) { muted = m; try { localStorage.setItem('gemforge-muted', m ? '1' : '0'); } catch {} if (E) E.master.gain.value = m ? 0 : MASTER; }

// ----- sound effects -----
const now = () => E.ctx.currentTime;
function tone(wave, f, t, dur, vol, f2 = null) {
  const c = E.ctx, o = c.createOscillator(), g = c.createGain();
  o.type = wave; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.setValueAtTime(vol, t + Math.max(0.01, dur - 0.04)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(E.sfx); o.start(t); o.stop(t + dur + 0.02);
}
function burst(t, dur, vol, hp = 800, sweep = null) {
  const c = E.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = E.noise; f.type = 'bandpass'; f.frequency.setValueAtTime(hp, t); if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(E.sfx); s.start(t); s.stop(t + dur + 0.02);
}
const arp = (notes, step = 0.07, wave = 'square', vol = 0.12) => { const t = now(); notes.forEach((n, i) => tone(wave, hz(midi(n)), t + i * step, step * 1.6, vol)); };
const chime = (notes, step, inst, vol) => { const t = now(); notes.forEach((n, i) => play(inst, t + i * step, hz(midi(n)), step * 2, vol, E.sfx)); };
const SFX = {
  blip: () => tone('square', 1500, now(), 0.025, 0.035),
  click: () => tone('square', 880, now(), 0.05, 0.08),
  back: () => tone('square', 440, now(), 0.06, 0.08),
  hit: () => { const t = now(); burst(t, 0.12, 0.4, 1500, 300); tone('square', 200, t, 0.1, 0.15, 60); },
  crit: () => { const t = now(); burst(t, 0.18, 0.5, 2500, 400); tone('sawtooth', 500, t, 0.18, 0.15, 90); tone('square', 1200, t + 0.05, 0.08, 0.1); },
  fire: () => { const t = now(); burst(t, 0.45, 0.35, 3000, 400); tone('sawtooth', 300, t, 0.35, 0.08, 120); },
  ice: () => { const t = now(); [1800, 2400, 3000].forEach((f, i) => tone('triangle', f, t + i * 0.05, 0.25, 0.1, f * 0.7)); fm(t + 0.05, 2600, 0.6, E.sfx, 4, 1, 0.5, 0.25); },
  bolt: () => { const t = now(); for (let i = 0; i < 5; i++) tone('square', i % 2 ? 1800 : 500, t + i * 0.035, 0.05, 0.1); burst(t, 0.2, 0.3, 5000); },
  holy: () => chime(['E5', 'G5', 'B5', 'E6', 'G6'], 0.06, 'celesta', 0.5),
  dark: () => { const t = now(); tone('sawtooth', 300, t, 0.5, 0.12, 60); tone('square', 150, t, 0.5, 0.08, 40); },
  heal: () => { chime(['C5', 'E5', 'G5', 'C6', 'E6'], 0.06, 'harp', 0.45); chime(['G6'], 0.3, 'celesta', 0.3); },
  buff: () => arp(['G4', 'C5', 'G5'], 0.07, 'square', 0.09),
  debuff: () => arp(['G4', 'D4', 'A3'], 0.08, 'sawtooth', 0.07),
  swing: () => burst(now(), 0.1, 0.25, 4000, 800),
  ko: () => tone('sawtooth', 400, now(), 0.5, 0.12, 50),
  levelup: () => arp(['C5', 'E5', 'G5', 'C6', 'G5', 'C6', 'E6'], 0.08, 'square', 0.12),
  coin: () => { const t = now(); tone('square', 1318, t, 0.07, 0.09); tone('square', 1760, t + 0.07, 0.15, 0.09); },
  chest: () => { arp(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], 0.07, 'square', 0.08); chime(['C6', 'G6'], 0.21, 'celesta', 0.35); },
  encounter: () => { const t = now(); for (let i = 0; i < 8; i++) tone('square', 200 + (i % 2) * 150, t + i * 0.045, 0.06, 0.08); burst(t, 0.4, 0.2, 2000, 200); },
  flee: () => arp(['E5', 'C5', 'A4', 'E4'], 0.06, 'square', 0.1),
  poison: () => { const t = now(); tone('sawtooth', 220, t, 0.25, 0.08, 160); tone('sawtooth', 233, t, 0.25, 0.08, 170); },
  door: () => tone('triangle', 300, now(), 0.15, 0.12, 600),
  rest: () => { chime(['C5', 'G4', 'E5', 'C5', 'G5', 'E5', 'C6'], 0.12, 'harp', 0.45); chime(['E6', 'C7'], 0.42, 'celesta', 0.3); }, // inn lullaby
  error: () => tone('square', 150, now(), 0.12, 0.1),
};
export function sfx(name) { if (muted || !E || E.ctx.state !== 'running') return; try { SFX[name]?.(); } catch (e) { console.warn('sfx failed', name, e); } }

// ----- analysis hooks (tools/musiccheck.mjs): render a track or sfx offline with the real synth -----
async function offline(secs, setup, chunk = null, sr = 44100) {
  const oc = new OfflineAudioContext(2, Math.ceil(sr * secs), sr), saved = E, G = graph(oc, true), use = (fn) => { const s = E; E = G; try { return fn(); } finally { E = s; } };
  const r = use(setup);
  if (chunk) { // schedule like the live lookahead scheduler, 1 s at a time (keeps the offline graph small)
    use(() => chunk(1.5));
    for (let t = 1; t < secs - 0.5; t += 1) oc.suspend(t).then(() => { use(() => chunk(t + 1.5)); oc.resume(); });
  }
  E = saved; const buf = await oc.startRendering(); return { buf, r };
}
export async function _render(name, secs, sr) {
  let I = null;
  return offline(secs, () => { I = instance(name, true); const C = I.C; for (const f of [I.dry, I.ech, I.rev]) f.gain.value = 1; setEcho(C, 0); I.t0 = I.next = 0; return { log: I.log, sd: C.sd, len: C.len, loopSecs: C.len * C.sd }; },
    (until) => pump(I, Math.min(until, secs - 0.01)), sr);
}
export async function _renderSfx(name, sr) { return offline(2.5, () => SFX[name](), null, sr); }
export const _SFX = Object.keys(SFX), _TRACKS = SCORES, _midi = midi;
