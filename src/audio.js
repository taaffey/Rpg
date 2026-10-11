// ===== Chiptune audio: Web Audio synth, looping music sequencer, sound effects =====
let ctx = null, master = null, musicBus = null, sfxBus = null;
let musicVol = 1, sfxVol = 1, muted = false; try { muted = localStorage.getItem('gemforge-muted') === '1'; } catch {}
let wanted = null, current = null, timer = null, nextTime = 0, stepIdx = 0, trackState = null;

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = (n) => { const m = /^([A-G])([#b]?)(-?\d)$/.exec(n); return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
// "C5 E5:2 -:2" -> [{m, len}] in steps (default 1)
function parse(str) { return str.trim().split(/\s+/).map((t) => { const [n, l] = t.split(':'); return { m: n === '-' ? null : midi(n), len: l ? +l : 1 }; }); }
function bass(roots, pat = 'arp') {
  const out = [];
  for (const r of roots) { const m = midi(r); if (pat === 'arp') for (const o of [0, 0, 7, 0, 0, 0, 7, 0]) out.push({ m: m + o, len: 1 }); else { out.push({ m, len: 4 }, { m: m + 7, len: 4 }); } }
  return out;
}
const mel = (bars) => parse(bars.join(' '));

const TRACKS = {
  town: { step: 0.3, voices: [
    { wave: 'square', vol: 0.09, duty: true, notes: mel(['E5:2 G5 E5 C5:2 E5:2', 'D5:2 F5 D5 B4:2 D5:2', 'E5:2 G5 A5 G5:2 E5:2', 'D5:4 C5:4', 'A4:2 C5 E5 A5:2 G5:2', 'F5:2 A5 F5 D5:2 F5:2', 'G5:2 E5 D5 C5:2 D5:2', 'G4:2 B4:2 C5:4']) },
    { wave: 'triangle', vol: 0.16, notes: parse('C3:4 G3:4 G2:4 D3:4 C3:4 G3:4 G2:4 D3:4 A2:4 E3:4 F2:4 C3:4 C3:4 G2:4 G2:4 C3:4') }] },
  world: { step: 0.24, voices: [
    { wave: 'square', vol: 0.09, notes: mel(['G4:2 B4 D5 G5:2 D5:2', 'E5:2 D5 B4 A4:2 B4:2', 'G4:2 B4 D5 G5:2 A5:2', 'B5:4 A5:2 G5:2', 'C5:2 E5 G5 C6:2 B5:2', 'A5:2 G5 E5 D5:2 E5:2', 'D5:2 G5 B5 A5:2 F#5:2', 'G5:6 -:2']) },
    { wave: 'triangle', vol: 0.17, notes: bass(['G2', 'E2', 'G2', 'D2', 'C2', 'A2', 'D2', 'G2']) }] },
  dungeon: { step: 0.4, voices: [
    { wave: 'triangle', vol: 0.12, notes: mel(['A4:4 -:2 C5:2', 'B4:4 -:2 E5:2', 'A4:2 C5:2 E5:2 D5:2', 'C5:4 -:4', 'F4:4 -:2 A4:2', 'E4:4 -:2 G#4:2', 'A4:2 C5:2 B4:2 G#4:2', 'A4:8']) },
    { wave: 'square', vol: 0.05, notes: mel(['E3:4 E3:4', 'E3:4 E3:4', 'E3:4 E3:4', 'E3:4 E3:4', 'D3:4 D3:4', 'E3:4 E3:4', 'E3:4 E3:4', 'E3:4 E3:4']) },
    { wave: 'triangle', vol: 0.2, notes: bass(['A2', 'E2', 'A2', 'A2', 'F2', 'E2', 'E2', 'A2'], 'half') }] },
  battle: { step: 0.15, voices: [
    { wave: 'square', vol: 0.09, notes: mel(['E5 E5 G5 E5 B5:2 A5 G5', 'A5 A5 B5 A5 C6:2 B5 A5', 'E5 E5 G5 E5 B5:2 A5 G5', 'F#5 G5 A5 B5 C6:4', 'C5 C5 E5 C5 G5:2 F5 E5', 'D5 D5 F#5 D5 A5:2 G5 F#5', 'B4 B4 D5 B4 F#5:2 E5 D5', 'E5:2 G5:2 B5:4']) },
    { wave: 'triangle', vol: 0.2, notes: bass(['E2', 'A2', 'E2', 'B2', 'C2', 'D2', 'B2', 'E2']) }],
    drums: 'khshkhsh' },
  boss: { step: 0.13, voices: [
    { wave: 'sawtooth', vol: 0.06, notes: mel(['D5 D5 A5 D5 F5:2 E5 D5', 'D5 D5 A5 D5 G5:2 F5 E5', 'Bb4 Bb4 F5 Bb4 D5:2 C5 Bb4', 'A4 A4 E5 A4 C#5:2 D5 E5', 'D5 D5 A5 D5 F5:2 E5 D5', 'G5 G5 Bb5 G5 D6:2 C6 Bb5', 'F5 E5 D5 C#5 D5 E5 F5 G5', 'A5:4 A4:4']) },
    { wave: 'square', vol: 0.05, notes: mel(['D4:8', 'D4:8', 'Bb3:8', 'A3:8', 'D4:8', 'G3:8', 'F3:8', 'A3:8']) },
    { wave: 'triangle', vol: 0.22, notes: bass(['D2', 'D2', 'Bb1', 'A1', 'D2', 'G2', 'F2', 'A1']) }],
    drums: 'kkshkkss' },
  snow: { step: 0.28, voices: [
    { wave: 'triangle', vol: 0.14, notes: mel(['A4:2 D5 F5 A5:2 F5:2', 'G4:2 Bb4 D5 G5:2 D5:2', 'F4:2 A4 C5 F5:2 E5:2', 'D5:4 -:2 A4:2', 'A4:2 D5 F5 A5:2 G5:2', 'Bb4:2 D5 F5 Bb5:2 A5:2', 'G5:2 F5 E5 D5:2 E5:2', 'D5:6 -:2']) },
    { wave: 'square', vol: 0.035, notes: mel(['D6:8', 'D6:8', 'C6:8', 'A5:8', 'D6:8', 'D6:8', 'Bb5:8', 'A5:8']) },
    { wave: 'triangle', vol: 0.17, notes: bass(['D2', 'G2', 'F2', 'D2', 'D2', 'Bb1', 'G2', 'D2'], 'half') }] },
  frosttown: { step: 0.32, voices: [
    { wave: 'square', vol: 0.08, notes: mel(['F5:2 A5 F5 C5:2 F5:2', 'E5:2 G5 E5 C5:2 E5:2', 'D5:2 F5 A5 G5:2 F5:2', 'C5:4 E5:2 G5:2', 'A4:2 C5 F5 A5:2 G5:2', 'Bb4:2 D5 F5 E5:2 D5:2', 'C5:2 F5 E5 D5:2 E5:2', 'F5:6 -:2']) },
    { wave: 'triangle', vol: 0.16, notes: bass(['F2', 'C2', 'D2', 'C2', 'F2', 'Bb1', 'C2', 'F2'], 'half') }] },
  crypt: { step: 0.42, voices: [
    { wave: 'triangle', vol: 0.13, notes: mel(['A4:3 -:1 Eb5:2 D5:2', 'C5:3 -:1 Ab4:4', 'A4:2 C5:2 Eb5:2 A5:2', 'G5:6 -:2', 'F4:3 -:1 B4:2 A4:2', 'E4:3 -:1 Ab4:4', 'A4:2 B4:2 C5:2 Eb5:2', 'A4:8']) },
    { wave: 'square', vol: 0.04, notes: mel(['A3:8', 'Ab3:8', 'A3:8', 'A3:8', 'F3:8', 'E3:8', 'A3:8', 'A3:8']) },
    { wave: 'triangle', vol: 0.2, notes: bass(['A2', 'Ab2', 'A2', 'A2', 'F2', 'E2', 'A2', 'A2'], 'half') }] },
  spire: { step: 0.3, voices: [
    { wave: 'square', vol: 0.075, notes: mel(['E5:2 B5 E6 B5:2 G5:2', 'D5:2 A5 D6 A5:2 F#5:2', 'C5:2 G5 C6 G5:2 E5:2', 'B4:4 F#5:2 B5:2', 'E5:2 B5 E6 B5:2 G5:2', 'F#5:2 C#6 F#6 C#6:2 A5:2', 'G5:2 B5 D6 B5:2 G5:2', 'E6:6 -:2']) },
    { wave: 'triangle', vol: 0.18, notes: bass(['E2', 'D2', 'C2', 'B1', 'E2', 'F#2', 'G2', 'E2']) }] },
  ending: { step: 0.26, voices: [
    { wave: 'square', vol: 0.09, notes: mel(['C5:2 E5 G5 C6:2 G5:2', 'A4:2 C5 E5 A5:2 G5:2', 'F4:2 A4 C5 F5:2 E5:2', 'G4:2 B4 D5 G5:4', 'E5:2 G5 C6 E6:2 D6:2', 'C6:2 B5 A5 G5:2 A5:2', 'F5:2 A5 C6 F6:2 E6:2', 'D6:2 G5:2 C6:4']) },
    { wave: 'triangle', vol: 0.05, notes: mel(['E4:8', 'C4:8', 'A3:8', 'B3:8', 'G4:8', 'E4:8', 'C4:8', 'D4:8']) },
    { wave: 'triangle', vol: 0.19, notes: bass(['C3', 'A2', 'F2', 'G2', 'C3', 'F2', 'F2', 'G2']) }] },
  victory: { once: true, step: 0.13, voices: [
    { wave: 'square', vol: 0.1, notes: parse('C5 C5 C5 C5:3 Ab4:3 Bb4:3 C5:2 Bb4 C5:6') }, { wave: 'triangle', vol: 0.18, notes: parse('C3:3 C3:3 Ab2:3 Bb2:3 C3:6') }] },
  gameover: { once: true, step: 0.28, voices: [
    { wave: 'triangle', vol: 0.15, notes: parse('C5:3 B4:3 Bb4:3 A4:8') }, { wave: 'square', vol: 0.05, notes: parse('E4:3 D4:3 Db4:3 C4:8') }] },
};

function ensure() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.55 * musicVol; musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9 * sfxVol; sfxBus.connect(master);
  return true;
}
let noiseBuf = null;
function noise() { if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return noiseBuf; }
function tone(bus, wave, f, t, dur, vol, f2 = null) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = wave; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.setValueAtTime(vol, t + Math.max(0.01, dur - 0.04)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
}
function burst(bus, t, dur, vol, hp = 800, sweep = null) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noise(); f.type = 'bandpass'; f.frequency.setValueAtTime(hp, t); if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t + dur + 0.02);
}
function drum(t, c) {
  if (c === 'k') tone(musicBus, 'sine', 150, t, 0.12, 0.35, 45);
  else if (c === 's') burst(musicBus, t, 0.1, 0.22, 1800);
  else if (c === 'h') burst(musicBus, t, 0.03, 0.08, 7000);
}

// ----- sequencer (lookahead scheduling) -----
function startTrack(name) {
  stopTrack();
  const tr = TRACKS[name]; if (!tr) return;
  current = name; nextTime = ctx.currentTime + 0.06; stepIdx = 0;
  trackState = tr.voices.map((v) => ({ v, i: 0, wait: 0, total: v.notes.reduce((n, x) => n + x.len, 0) }));
  tr.len = Math.max(...trackState.map((s) => s.total));
  timer = setInterval(pump, 40); pump();
}
function stopTrack() { clearInterval(timer); timer = null; current = null; musicBus && musicBus.gain.cancelScheduledValues(0); }
function pump() {
  const tr = TRACKS[current]; if (!tr) return;
  while (nextTime < ctx.currentTime + 0.25) {
    for (const s of trackState) {
      if (s.wait > 0) { s.wait--; continue; }
      const n = s.v.notes[s.i % s.v.notes.length];
      if (tr.once && s.i >= s.v.notes.length) continue;
      s.i++; s.wait = n.len - 1;
      if (n.m != null) tone(musicBus, s.v.wave, hz(n.m), nextTime, n.len * tr.step * 0.92, s.v.vol);
    }
    if (tr.drums) drum(nextTime, tr.drums[stepIdx % tr.drums.length]);
    stepIdx++; nextTime += tr.step;
    if (tr.once && stepIdx >= tr.len + 2) { clearInterval(timer); timer = null; current = null; break; }
  }
}
export function music(name) {
  wanted = name;
  if (!ctx || ctx.state !== 'running') return;
  if (current !== name || (!timer && !TRACKS[name].once)) startTrack(name);
}
export function unlock() {
  if (!ensure()) return;
  if (ctx.state === 'suspended' || ctx.state === 'interrupted') ctx.resume();
  if (!unlock.primed) { unlock.primed = true; try { const b = ctx.createBuffer(1, 1, 22050), src = ctx.createBufferSource(); src.buffer = b; src.connect(ctx.destination); src.start(0); } catch {} } // iOS: a silent blip inside the gesture fully unlocks audio
  if (wanted && !current) startTrack(wanted);
}
// iOS suspends audio when the app is backgrounded or the screen locks; pause music cleanly and resume on return
export function setBackgrounded(bg) {
  if (!ctx) return;
  if (bg) { try { ctx.suspend(); } catch {} }
  else if (!muted) { try { ctx.resume(); } catch {} if (wanted && !current) startTrack(wanted); }
}
export const isMuted = () => muted;
export function setVolumes(m, s) { musicVol = m; sfxVol = s; if (musicBus) musicBus.gain.value = 0.55 * m; if (sfxBus) sfxBus.gain.value = 0.9 * s; }
export function setMuted(m) { muted = m; try { localStorage.setItem('gemforge-muted', m ? '1' : '0'); } catch {} if (master) master.gain.value = m ? 0 : 0.8; }

// ----- sound effects -----
const arp = (notes, step = 0.07, wave = 'square', vol = 0.12) => { const t = ctx.currentTime; notes.forEach((n, i) => tone(sfxBus, wave, hz(midi(n)), t + i * step, step * 1.6, vol)); };
const SFX = {
  blip: () => tone(sfxBus, 'square', 1500, ctx.currentTime, 0.025, 0.035),
  click: () => tone(sfxBus, 'square', 880, ctx.currentTime, 0.05, 0.08),
  back: () => tone(sfxBus, 'square', 440, ctx.currentTime, 0.06, 0.08),
  hit: () => { const t = ctx.currentTime; burst(sfxBus, t, 0.12, 0.4, 1500, 300); tone(sfxBus, 'square', 200, t, 0.1, 0.15, 60); },
  crit: () => { const t = ctx.currentTime; burst(sfxBus, t, 0.18, 0.5, 2500, 400); tone(sfxBus, 'sawtooth', 500, t, 0.18, 0.15, 90); tone(sfxBus, 'square', 1200, t + 0.05, 0.08, 0.1); },
  fire: () => { const t = ctx.currentTime; burst(sfxBus, t, 0.45, 0.35, 3000, 400); tone(sfxBus, 'sawtooth', 300, t, 0.35, 0.08, 120); },
  ice: () => { const t = ctx.currentTime; [1800, 2400, 3000].forEach((f, i) => tone(sfxBus, 'triangle', f, t + i * 0.05, 0.25, 0.1, f * 0.7)); },
  bolt: () => { const t = ctx.currentTime; for (let i = 0; i < 5; i++) tone(sfxBus, 'square', i % 2 ? 1800 : 500, t + i * 0.035, 0.05, 0.1); burst(sfxBus, t, 0.2, 0.3, 5000); },
  holy: () => arp(['E5', 'G5', 'B5', 'E6'], 0.07, 'triangle', 0.16),
  dark: () => { const t = ctx.currentTime; tone(sfxBus, 'sawtooth', 300, t, 0.5, 0.12, 60); tone(sfxBus, 'square', 150, t, 0.5, 0.08, 40); },
  heal: () => arp(['C5', 'E5', 'G5', 'C6', 'E6'], 0.06, 'triangle', 0.16),
  buff: () => arp(['G4', 'C5', 'G5'], 0.07, 'square', 0.09),
  debuff: () => arp(['G4', 'D4', 'A3'], 0.08, 'sawtooth', 0.07),
  swing: () => burst(sfxBus, ctx.currentTime, 0.1, 0.25, 4000, 800),
  ko: () => { const t = ctx.currentTime; tone(sfxBus, 'sawtooth', 400, t, 0.5, 0.12, 50); },
  levelup: () => arp(['C5', 'E5', 'G5', 'C6', 'G5', 'C6', 'E6'], 0.08, 'square', 0.12),
  coin: () => { const t = ctx.currentTime; tone(sfxBus, 'square', 1318, t, 0.07, 0.09); tone(sfxBus, 'square', 1760, t + 0.07, 0.15, 0.09); },
  chest: () => arp(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], 0.07, 'square', 0.1),
  encounter: () => { const t = ctx.currentTime; for (let i = 0; i < 8; i++) tone(sfxBus, 'square', 200 + (i % 2) * 150, t + i * 0.045, 0.06, 0.08); burst(sfxBus, t, 0.4, 0.2, 2000, 200); },
  flee: () => arp(['E5', 'C5', 'A4', 'E4'], 0.06, 'square', 0.1),
  poison: () => { const t = ctx.currentTime; tone(sfxBus, 'sawtooth', 220, t, 0.25, 0.08, 160); tone(sfxBus, 'sawtooth', 233, t, 0.25, 0.08, 170); },
  door: () => { const t = ctx.currentTime; tone(sfxBus, 'triangle', 300, t, 0.15, 0.12, 600); },
  rest: () => arp(['C5', 'G4', 'E5', 'C5', 'G5', 'E5', 'C6'], 0.1, 'triangle', 0.14),
  error: () => tone(sfxBus, 'square', 150, ctx.currentTime, 0.12, 0.1),
};
export function sfx(name) { if (muted || !ctx || ctx.state !== 'running') return; try { SFX[name]?.(); } catch (e) { console.warn('sfx failed', name, e); } }
export const _TRACKS = TRACKS;
