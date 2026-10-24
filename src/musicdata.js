// ===== Gemforge Chronicles soundtrack: scores for the synth in audio.js (all original compositions) =====
// Track: bpm, sub (steps per beat), beats (per bar), key + acc (allowed accidentals; checked by tools/musiccheck.mjs),
//   prog: chord progression 'Sym:steps' (drives pad/arp/bass parts so harmony always agrees),
//   parts: mel  { n: 'E5:2 G5 -:2 | ...' notes (len in steps, '-' rest, 'A4+C5' chord), at: start bar }
//          pad  { c: centre midi, rh: rhythm 'x:2 -:6' cycled per chord }      arp  { pat: '0 1 2 -', lo: lowest midi, len }
//          bass { pat: 'R:2 5:2 8:2 L:2 A:2' (Root/slash, 3rd, 5th, 7th, octave, Lower 5th, Approach), lo }
//          drum { p: { lane: 'X.x.o.r.' } } lanes k kick, s snare, h hat, o open hat, c crash, t timpani, b doum, i tek,
//               j tambourine, m shaker, w woodblock, n wind, e finger bell; X/x/o = loud/normal/soft, r = roll
//   every part: i instrument, v volume, pan, e echo send, r reverb send, bars: [[from, to)] bar ranges where it plays
//   once: jingle (plays once, then the game picks the next track), fast: quick crossfade, gain: loudness trim
const j = (...a) => a.join(' | ');

// ---------- title: grand, hopeful prelude (D major) ----------
const tiA = 'D:8 A/C#:8 Bm:8 G:8 Em7:8 A:8 D/F#:4 G:4 Asus4:4 A:4', tiB = 'Bm:8 G:8 D:8 A:8 Bm:8 G:8 Em7:4 A:4 D:8';
const tiM = j('D5:3 E5:1 F#5:2 G5:2', 'A5:3 G5:1 E5:4', 'F#5:3 E5:1 D5:2 F#5:2', 'B4:6 D5:2', 'E5:3 F#5:1 G5:2 B5:2', 'A5:4 E5:2 C#5:2', 'F#5:2 A5:2 B5:2 D6:2', 'D6:4 C#6:4',
  'D6:3 C#6:1 B5:2 F#5:2', 'G5:3 A5:1 B5:4', 'A5:3 G5:1 F#5:2 D5:2', 'E5:6 C#5:2', 'D5:2 F#5:2 B5:2 C#6:2', 'D6:4 B5:2 G5:2', 'G5:2 F#5:2 E5:2 C#5:2', 'D5:8');

// ---------- town (Haven): warm, bustling (F major) ----------
const twA = 'F:8 C/E:8 Dm7:8 Bb:8 Gm7:8 C7:8 F:4 Dm7:4 Gm7:4 C7:4', twA2 = 'F:8 C/E:8 Dm7:8 Bb:8 Gm7:8 C7:8 Gm7:4 C7:4 F:8', twB = 'Bb:8 C:8 Am7:8 Dm7:8 Gm7:8 Am7:8 Bb:8 C7:8';
const twM6 = j('C5:2 F5:2 A5:3 G5:1', 'G5:2 E5:2 C5:4', 'D5:2 F5:2 A5:2 C6:2', 'Bb5:3 A5:1 F5:4', 'G5:2 Bb5:2 D6:3 C6:1', 'Bb5:2 G5:2 E5:4');
const twMA = j(twM6, 'F5:2 A5:2 D5:2 F5:2', 'G5:3 F5:1 E5:2 C5:2'), twMA2 = j(twM6, 'Bb5:2 A5:2 G5:2 E5:2', 'F5:6 -:2');
const twMB = j('D5:3 C5:1 Bb4:2 D5:2', 'C5:2 E5:2 G5:4', 'A5:3 G5:1 E5:2 C5:2', 'D5:4 F5:2 A5:2', 'Bb5:3 A5:1 G5:2 F5:2', 'E5:4 C5:2 E5:2', 'D5:2 F5:2 Bb5:2 D6:2', 'C6:4 Bb5:2 G5:2');

// ---------- mirewood: swampy, mysterious-cosy 6/8 (D dorian) ----------
const mwA = 'Dm:6 G/D:6 Dm:6 Am7:6 F:6 C:6 G:6 Am:6', mwB = 'F:6 C/E:6 Dm:6 Am:6 G:6 Em7:6 C:6 A7:6', mwA2 = 'Dm:6 G/D:6 Dm:6 Am7:6 F:6 C:6 Em7:3 A7:3 Dm:6';
const mw6 = j('A4:2 D5:1 F5:2 E5:1', 'D5:2 B4:1 G4:3', 'A4:2 D5:1 F5:2 A5:1', 'G5:2 E5:1 C5:3', 'A5:2 G5:1 F5:2 C5:1', 'E5:2 D5:1 C5:2 E5:1');
const mwM = j(mw6, 'D5:2 B4:1 G4:2 B4:1', 'A4:6',
  'C5:2 F5:1 A5:2 G5:1', 'G5:3 E5:3', 'F5:2 E5:1 D5:2 A4:1', 'C5:3 E5:3', 'B4:2 D5:1 G5:2 F5:1', 'E5:2 D5:1 B4:3', 'C5:2 E5:1 G5:2 E5:1', 'G5:2 E5:1 C#5:3',
  mw6, 'B4:2 G4:1 C#5:2 E5:1', 'D5:6');

// ---------- frosttown (Frostholm): wintry waltz with celesta (G major, 3/4) ----------
const ftA = 'G:6 D/F#:6 Em:6 Bm/D:6 C:6 G/B:6 Am7:6 D7:6', ftA2 = 'G:6 D/F#:6 Em:6 Bm/D:6 C:6 G/B:6 Am7:3 D7:3 G:6', ftB = 'Em:6 C:6 G:6 D:6 Em:6 Am7:6 C:6 D7:6';
const ft6 = j('D5:2 G5:2 B5:2', 'A5:4 F#5:2', 'G5:2 E5:2 B4:2', 'D5:4 F#5:2', 'E5:2 G5:2 C6:2', 'B5:4 G5:2');
const ftMA2 = j(ft6, 'C6:3 A5:2 F#5:1', 'G5:6');
const ftM = j(ft6, 'C6:2 B5:2 A5:2', 'A5:4 F#5:2', ftMA2,
  'B4:2 E5:2 G5:2', 'G5:4 E5:2', 'D5:2 G5:2 B5:2', 'A5:6', 'B5:2 A5:2 G5:2', 'E5:4 C5:2', 'E5:2 G5:2 C6:2', 'C6:2 A5:2 F#5:2', ftMA2);

// ---------- world (Greenmarch): heroic adventure march (Bb major) ----------
const wdA = 'Bb:8 F/A:8 Gm7:8 Eb:8 Cm7:8 F:8 Bb/D:4 Eb:4 F:8', wdA2 = 'Bb:8 F/A:8 Gm7:8 Eb:8 Cm7:8 F:8 Eb:4 F:4 Bb:8', wdB = 'Eb:8 F:8 Dm7:8 Gm7:8 Cm7:8 F/A:8 Ab:8 F:8';
const wd6 = j('F4:3 Bb4:1 D5:2 F5:2', 'F5:3 Eb5:1 C5:4', 'D5:3 Eb5:1 F5:2 G5:2', 'G5:4 Eb5:2 F5:1 G5:1', 'Bb5:3 G5:1 Eb5:2 C5:2', 'A4:3 C5:1 F5:4');
const wdMA = j(wd6, 'F5:2 D5:2 G5:2 Bb5:2', 'A5:4 F5:2 Eb5:1 C5:1'), wdMA2 = j(wd6, 'G5:2 Bb5:2 A5:2 C6:2', 'Bb5:6 -:2');
const wdMB = j('G5:4 Bb5:4', 'A5:3 G5:1 F5:4', 'F5:2 A5:2 C6:2 A5:2', 'Bb5:4 G5:4', 'G5:3 F5:1 Eb5:2 G5:2', 'F5:4 C5:4', 'Eb5:3 F5:1 Ab5:2 C6:2', 'C6:4 A5:2 F5:2');
const wdC = j('Bb3:8', 'C4:8', 'Bb3:8', 'Eb4:8', 'Eb4:8', 'C4:8', 'Bb3:4 C4:4', 'D4:8');

// ---------- snow (Frostfields): sparse and cold (D minor) ----------
const snA = 'Dm:8 Bbmaj7:8 Gm7:8 Asus4:4 A:4 Dm:8 Bbmaj7:8 Gm7:8 A:8', snB = 'Fmaj7:8 C:8 Bbmaj7:8 F/A:8 Gm7:8 Dm/F:8 Em7b5:8 A:8';
const snM = j('A5:6 F5:2', 'D5:6 -:2', 'F5:3 G5:1 Bb5:4', 'A5:4 E5:4', 'F5:6 E5:2', 'D5:4 A4:4', 'Bb4:3 C5:1 D5:4', 'C#5:6 -:2',
  'C6:6 A5:2', 'G5:6 E5:2', 'F5:4 A5:4', 'A5:8', 'Bb5:3 A5:1 G5:4', 'F5:3 E5:1 D5:4', 'E5:4 G5:2 Bb5:2', 'C#5:4 E5:4');

// ---------- desert (Sunscar Sands): E phrygian dominant, darbuka groove ----------
const deA = 'E:16 F:16 Dm:16 E:16 Am:16 F:16 Dm:16 E:16', deB = 'Am:16 Dm:16 F:16 E:16 Dm:16 Am:16 F:8 Dm:8 E:16';
const deM = j('E5:4 F5:2 G#5:2 B5:4 A5:2 G#5:2', 'F5:6 E5:2 F5:4 A5:4', 'D5:4 F5:2 E5:2 D5:4 C5:2 B4:2', 'E5:8 G#4:4 B4:4', 'C5:4 E5:4 A5:6 G#5:2', 'A5:4 C6:4 A5:4 G#5:2 A5:2', 'F5:4 E5:2 D5:2 F5:2 E5:2 D5:2 C5:2', 'B4:4 G#4:4 E4:8',
  'A5:6 G#5:1 A5:1 C6:4 B5:2 C6:2', 'D6:6 C6:2 A5:8', 'C6:4 A5:2 F5:2 A5:4 C6:4', 'B5:8 G#5:4 E5:4', 'F5:4 A5:4 D6:4 C6:2 A5:2', 'C6:4 B5:2 A5:2 E5:8', 'F5:4 G#5:2 A5:2 D5:4 F5:2 E5:2', 'E5:8 B4:4 D5:2 F5:2');

// ---------- dungeon (Ashen Cavern): tense, pulsing (C minor) ----------
const dgA = 'Cm:16 Cm:16 Ab:16 G:16 Cm:16 Fm:16 Ab:16 G:16', dgB = 'Fm:16 Cm:16 Ab:16 Eb:16 Fm:16 Db:16 G:16 G7:16';
const dgM = j('G4:4 Ab4:4 G4:8', 'Eb5:6 D5:2 C5:8', 'C5:12 Eb5:4', 'D5:8 B4:8', 'G5:8 Eb5:4 F5:4', 'Ab5:8 F5:4 C5:4', 'Eb5:8 C5:4 Eb5:4', 'D5:16',
  'F5:8 Ab5:8', 'G5:12 Eb5:4', 'C6:8 Ab5:4 Eb5:4', 'G5:16', 'Ab5:8 C6:8', 'Ab5:8 F5:4 Db5:4', 'B4:8 D5:8', 'D5:8 F5:4 B4:4');

// ---------- crypt (Sunken Crypt): eerie lament, organ + choir (A minor) ----------
const crA = 'Am:8 E/G#:8 C/G:8 D/F#:8 Fmaj7:8 Dm7:8 E:8 E7:8', crB = 'Dm:8 Am:8 Bb:8 E:8 Dm:8 Am/C:8 Bb:8 E7:8';
const crM = j('E5:6 C5:2', 'B4:6 D5:2', 'C5:4 E5:4', 'A4:4 D5:2 F#5:2', 'E5:6 C5:2', 'F5:4 D5:4', 'G#4:4 B4:4', 'D5:6 -:2',
  'F5:6 A5:2', 'C5:4 E5:4', 'D5:4 F5:2 Bb5:2', 'G#5:6 -:2', 'A5:4 F5:4', 'E5:4 C5:4', 'D5:4 Bb4:4', 'B4:4 G#4:4');

// ---------- spire (Frost Spire): crystalline, lydian shimmer (E major) ----------
const spA = 'Emaj7:16 F#/E:16 Emaj7:16 F#/E:16 C#m7:16 Amaj7:16 Bsus4:16 B:16', spB = 'C#m7:16 G#m7:16 Amaj7:16 Emaj7/G#:16 F#m7:16 Amaj7:16 Bsus4:16 B7:16';
const spM = j('B5:8 D#6:4 B5:4', 'A#5:8 C#6:4 F#5:4', 'G#5:8 B5:4 D#6:4', 'C#6:12 A#5:4', 'E6:8 C#6:4 G#5:4', 'C#6:8 A5:4 B5:4', 'F#5:8 E5:8', 'D#5:16',
  'E5:8 G#5:8', 'D#6:8 B5:8', 'C#6:8 E6:8', 'D#6:12 B5:4', 'A5:8 C#6:8', 'E6:8 C#6:4 A5:4', 'B5:8 E6:8', 'D#6:8 A5:4 F#5:4');

// ---------- storm (Storm Cavern): driving, ominous (F minor) ----------
const stA = 'Fm:16 Db:16 Eb:16 C:16 Fm:16 Db:16 Bbm:16 C:16', stB = 'Db:16 Eb:16 Fm:16 Fm:16 Bbm:16 Gb:16 C:16 C7:16';
const stMA = j('F5:6 C5:2 Ab5:4 G5:2 F5:2', 'Ab5:6 F5:2 Db6:4 C6:2 Ab5:2', 'G5:6 Eb5:2 Bb5:8', 'G5:4 E5:4 C5:8', 'F5:6 C5:2 Ab5:4 Bb5:2 C6:2', 'Db6:6 C6:2 Ab5:8', 'Bb5:6 Ab5:2 F5:4 Db5:4', 'E5:4 G5:4 C6:8');
const stM = j(stMA, 'F5:8 Ab5:8', 'G5:8 Bb5:8', 'C6:12 Ab5:4', 'F5:16', 'Db6:8 Bb5:8', 'Bb5:8 Db6:4 Bb5:4', 'C6:8 G5:8', 'E5:8 Bb5:4 G5:4', stMA);

// ---------- ruins (Sunscar Ruins): ancient, mysterious (A phrygian) ----------
const ruA = 'Am:8 Bb/A:8 Am:8 Gm/A:8 Fmaj7:8 Gm7:8 Bb:8 Am:8', ruB = 'Dm:8 C:8 Bb:8 Am:8 Dm:8 Gm:8 Bb:8 Asus4:4 Am:4';
const ruM = j('E5:3 F5:1 E5:2 C5:2', 'D5:3 C5:1 Bb4:4', 'A4:2 C5:2 E5:2 G5:2', 'G5:4 D5:2 Bb4:2', 'E5:6 C5:2', 'D5:4 F5:2 G5:2', 'F5:3 D5:1 Bb4:4', 'A4:8',
  'A5:4 F5:2 D5:2', 'E5:4 G5:4', 'D5:2 F5:2 Bb5:4', 'A5:4 E5:4', 'F5:3 E5:1 D5:4', 'Bb5:3 A5:1 G5:4', 'F5:4 D5:2 Bb4:2', 'D5:4 C5:4');

// ---------- battle: fast, catchy, driving (E minor) ----------
const btA = 'Em:16 Cmaj7:16 D:16 Bm:16 Em:16 C:16 Am7:8 D:8 B7:16', btA2 = 'Em:16 Cmaj7:16 D:16 Bm:16 Em:16 C:16 Am7:8 B7:8 Em:16';
const btB = 'C:16 D:16 Bm:16 Em:16 C:16 D:16 F#m7b5:16 B7:16', btB2 = 'C:16 D:16 Bm:16 Em:16 Am7:16 D:16 C:16 B7:16';
const bt6 = j('E5:2 B4:2 E5:2 F#5:2 G5:3 F#5:1 E5:2 D5:2', 'E5:6 G5:2 B5:6 A5:2', 'A5:3 F#5:3 D5:2 A5:2 G5:2 F#5:2 E5:2', 'F#5:6 B5:6 A5:2 F#5:2', 'E5:2 B4:2 E5:2 G5:2 B5:2 C6:1 B5:1 A5:2 G5:2', 'G5:3 E5:3 C5:2 E5:2 G5:2 C6:4');
const btB4 = j('E5:4 G5:4 C6:6 B5:2', 'A5:4 F#5:4 D5:6 E5:2', 'F#5:4 D5:4 B5:6 A5:2', 'G5:8 E5:4 B4:4');
const btM = j(bt6, 'C6:3 B5:3 A5:2 F#5:3 A5:3 D6:2', 'D#6:4 B5:4 F#5:4 A5:4', bt6, 'C6:3 B5:3 A5:2 F#5:3 D#5:3 B4:2', 'E5:12 -:4',
  btB4, 'E5:4 G5:4 C6:4 E6:4', 'D6:6 C6:2 A5:4 F#5:4', 'A5:4 C6:4 E5:4 F#5:4', 'D#5:6 F#5:2 B5:8',
  btB4, 'E6:4 C6:4 A5:4 G5:4', 'F#5:6 A5:2 D6:8', 'E6:4 D6:4 C6:4 G5:4', 'B5:4 A5:4 F#5:4 D#5:4');
const btC = j('C5:16', 'D5:16', 'D5:16', 'B4:16', 'C5:16', 'A4:16', 'A4:16', 'B4:16', 'C5:16', 'D5:16', 'D5:16', 'B4:16', 'C5:16', 'A4:16', 'G4:16', 'F#4:16');

// ---------- boss: heavy, brass stabs + timpani (G minor) ----------
const bsA = 'Gm:16 Gm:16 Eb:16 F:16 Gm:16 Gm:16 Ab:16 D:16', bsB = 'Cm:16 D:16 Gm:16 Eb:16 Cm:16 Ab:16 D:16 D7:16';
const bsMA = j('G5:4 D5:2 G5:2 Bb5:4 A5:2 G5:2', 'D6:6 C6:2 Bb5:4 A5:4', 'G5:4 Eb5:2 G5:2 Bb5:4 C6:2 Bb5:2', 'A5:8 F5:4 C6:4', 'G5:4 D5:2 G5:2 Bb5:4 C6:2 D6:2', 'D6:4 Bb5:4 G5:4 D5:4', 'C6:6 Ab5:2 Eb5:8', 'F#5:4 A5:4 D6:8');
const bsMB = j('Eb5:8 G5:8', 'F#5:8 A5:8', 'G5:4 Bb5:4 D6:8', 'Eb6:8 Bb5:4 G5:4', 'C6:6 Bb5:2 G5:8', 'Ab5:6 G5:2 Eb5:8', 'F#5:8 D5:4 A5:4', 'C6:8 A5:4 F#5:4');
const bsCA = j('D5:16', 'Bb4:16', 'Bb4:16', 'C5:16', 'D5:16', 'D5:16', 'C5:16', 'A4:16'), bsCB = j('G4:16', 'A4:16', 'Bb4:16', 'G4:16', 'G4:16', 'C5:16', 'A4:16', 'F#4:16');

// ---------- ending: emotional finale (Eb major) ----------
const enA = 'Eb:8 Bb/D:8 Cm7:8 Ab:8 Fm7:8 Bb:8 Gm7:4 Cm7:4 Fm7:4 Bb7:4', enB = 'Ab:8 Bb:8 Gm7:8 Cm7:8 Abmaj7:8 Fm7:8 Bbsus4:8 Bb:8', enA2 = 'Eb:8 Bb/D:8 Cm7:8 Ab:8 Fm7:8 Bb:8 Fm7:4 Bb7:4 Eb:8';
const en6 = j('Bb4:2 Eb5:2 G5:3 F5:1', 'F5:4 D5:2 Bb4:2', 'C5:2 Eb5:2 G5:2 Bb5:2', 'Ab5:4 Eb5:4', 'F5:2 Ab5:2 C6:3 Bb5:1', 'Bb5:4 F5:2 D5:2');
const enM = j(en6, 'D5:2 Bb4:2 Eb5:2 G5:2', 'Ab5:3 G5:1 F5:2 D5:2',
  'Eb5:3 F5:1 Ab5:2 C6:2', 'D6:4 Bb5:2 C6:2', 'Bb5:3 Ab5:1 G5:2 D5:2', 'Eb5:4 G5:2 C6:2', 'C6:3 Bb5:1 Ab5:2 G5:2', 'F5:3 G5:1 Ab5:2 C6:2', 'Eb6:8', 'D6:4 Bb5:2 F5:2',
  en6, 'Ab5:2 F5:2 D5:2 F5:2', 'Eb5:8');

// ---------- pub (The Bell & Anvil, the Gilded Goose, quiz night): jaunty 6/8 tavern jig (G major) ----------
// 6/8 as 2 beats of 6 steps (a step is a sixteenth, an eighth is 2 steps; bpm counts dotted-quarter beats). 32 bars:
// verse (accordion) / chorus (fiddle, accordion in sixths) / verse (accordion, tin whistle answers on beat 2 of the even bars) / chorus (rolled whistle, fiddle in sixths).
// A finger-bell ting (a toast) opens each chorus; a tambourine roll and two woodblock knocks close it, then the accordion picks the verse back up.
const puA = 'G:12 C:12 G/B:12 Am7:6 D7:6 G:12 C:12 Am7:6 D7:6 G:12', puB = 'Em:12 C:12 G:6 E7:6 Am:6 D7:6 Em:12 C:6 A7:6 D7:12 G:6 D7:6';
const puV = j('D5:4 B4:2 G4:4 B4:2', 'E5:4 D5:2 C5:6', 'D5:3 E5:1 D5:2 B4:3 A4:1 B4:2', 'C5:4 B4:2 A4:6', 'D5:4 B4:2 G4:4 B4:2', 'C5:4 E5:2 G5:6', 'E5:4 D5:2 C5:3 B4:1 A4:2', 'G4:6 -:6');
const puChorus = (open) => j(open, 'C6:4 B5:2 G5:4 E5:2', 'D5:4 G5:2 B5:6', 'A5:4 G5:2 F#5:6', open, 'C6:4 B5:2 G5:4 E5:2', 'A5:4 G5:2 F#5:3 E5:1 F#5:2', 'G5:6 -:6');
const puC = puChorus('G5:6 B5:6'), puR = puChorus('G5:2 A5:1 G5:1 F#5:1 G5:1 B5:6'); // puR: the same chorus with a roll (G A G F# G) on the G that opens each half
const puH = j('B4:6 E5:6', 'E5:4 D5:2 E5:4 C5:2', 'B4:6 D5:6', 'C5:4 B4:2 A4:6', 'B4:6 E5:6', 'E5:4 D5:2 E5:4 A4:2', 'C5:4 B4:2 A4:3 G4:1 A4:2', 'B4:6 -:6'); // sixths under the chorus
const puUp = '-:6 D5:3 E5:1 F#5:2', puBack = j('-:12', '-:12', '-:12', '-:12', '-:12', '-:12', '-:12', '-:6 A4:3 B4:1 C5:2'); // pickups into the chorus / back into the verse
const puW = j('-:12', '-:6 E5:3 G5:1 C6:2', '-:12', '-:6 F#5:3 A5:1 D6:2', '-:12', '-:6 C6:2 D6:1 C6:1 D6:1 C6:1', '-:12', puUp); // whistle: arpeggio flicks, then a trill, on the accordion's held notes

export const SCORES = {
  title: { bpm: 76, sub: 2, beats: 4, key: 'D major', e: 0.24, r: 0.3, echo: 3, fb: 0.3, prog: j(tiA, tiB), parts: [
    { t: 'mel', i: 'strings', v: 0.6, n: tiM },
    { t: 'mel', i: 'horn', v: 0.42, at: 8, pan: 0.25, n: j('F#4:8', 'G4:8', 'F#4:8', 'C#4:8', 'F#4:8', 'B3:8', 'B3:4 C#4:4', 'F#4:8') },
    { t: 'arp', i: 'harp', v: 0.38, pat: '0 1 2 3 4 3 2 1', lo: 50, pan: -0.3, e: 0.3 },
    { t: 'pad', i: 'pad', v: 0.32, c: 60 },
    { t: 'pad', i: 'brass', v: 0.24, c: 62, rh: 'x:2 -:6', bars: [[8, 16]] },
    { t: 'bass', i: 'bass', v: 0.6, pat: 'R:4 5:4' },
    { t: 'drum', v: 0.5, p: { t: 'o.......' }, bars: [[0, 8]] },
    { t: 'drum', v: 0.6, p: { t: 'X...x...', c: 'x' + '.'.repeat(63) }, bars: [[8, 15]] },
    { t: 'drum', v: 0.6, p: { t: 'x...rrrr', s: '....rrrr' }, bars: [[15, 16]] }] },

  town: { bpm: 112, sub: 2, beats: 4, key: 'F major', prog: j(twA, twA2, twB, twA2), parts: [
    { t: 'mel', i: 'flute', v: 0.62, n: j(twMA, twMA2, twMB, twMA2) },
    { t: 'mel', i: 'reed', v: 0.34, at: 16, pan: 0.3, n: j('F4:8', 'G4:8', 'E4:8', 'F4:8', 'D4:8', 'C4:8', 'F4:8', 'E4:8') },
    { t: 'arp', i: 'pizz', v: 0.4, pat: '0 2 1 2', lo: 53, pan: -0.35 },
    { t: 'pad', i: 'pad', v: 0.2, c: 62 },
    { t: 'bass', i: 'bass', v: 0.6, pat: 'R:2 5:2 8:2 5:2' },
    { t: 'drum', v: 0.45, p: { k: 'x...x...', s: '..o...o.', m: 'oxoxoxox' } }] },

  mirewood: { bpm: 168, sub: 1, beats: 6, strong: [0, 3], key: 'D dorian', acc: ['C#'], e: 0.3, echo: 3, fb: 0.32, prog: j(mwA, mwB, mwA2), parts: [
    { t: 'mel', i: 'ocarina', v: 0.6, n: mwM },
    { t: 'mel', i: 'reed', v: 0.3, at: 8, pan: -0.3, n: j('A4:6', 'E4:6', 'A4:6', 'E4:6', 'D4:6', 'G4:6', 'E4:6', 'E4:3 G4:3') },
    { t: 'arp', i: 'marimba', v: 0.42, pat: '0 1 2 3 2 1', lo: 50, pan: 0.3 },
    { t: 'pad', i: 'pad', v: 0.2, c: 57 },
    { t: 'bass', i: 'bass', v: 0.6, pat: 'R:3 5:3', lo: 33 },
    { t: 'drum', v: 0.45, p: { m: 'x.ox.o', w: 'x..o..', k: 'o.....' } }] },

  frosttown: { bpm: 92, sub: 2, beats: 3, strong: [0], key: 'G major', e: 0.3, r: 0.28, prog: j(ftA, ftA2, ftB, ftA2), parts: [
    { t: 'mel', i: 'celesta', v: 0.75, n: ftM, bars: [[0, 16], [24, 32]] },
    { t: 'mel', i: 'flute', v: 0.55, n: ftM, bars: [[16, 24]] },
    { t: 'arp', i: 'celesta', v: 0.22, pat: '0 1 2 3 2 1', lo: 72, pan: 0.4, bars: [[16, 24]] },
    { t: 'pad', i: 'pizz', v: 0.3, c: 62, rh: '-:2 x:2 x:2', pan: -0.25 },
    { t: 'pad', i: 'pad', v: 0.2, c: 60 },
    { t: 'bass', i: 'bass', v: 0.6, pat: 'R:6' },
    { t: 'drum', v: 0.35, p: { j: 'x.o.o.' } }] },

  world: { bpm: 120, sub: 2, beats: 4, key: 'Bb major', acc: ['Ab'], prog: j(wdA, wdA2, wdB, wdA2), parts: [
    { t: 'mel', i: 'brass', v: 0.55, n: j(wdMA, wdMA2, wdMB, wdMA2), bars: [[0, 16], [24, 32]] },
    { t: 'mel', i: 'strings', v: 0.62, n: j(wdMA, wdMA2, wdMB, wdMA2), bars: [[16, 24]] },
    { t: 'mel', i: 'strings', v: 0.36, at: 8, pan: -0.3, n: j(wdC, '-:64', wdC) },
    { t: 'arp', i: 'harp', v: 0.32, pat: '0 1 2 3 4 3 2 1', lo: 55, pan: 0.3, bars: [[16, 24]] },
    { t: 'pad', i: 'horn', v: 0.26, c: 58, rh: '-:1 x:1', pan: 0.25 },
    { t: 'bass', i: 'bass', v: 0.6, pat: 'R:2 L:2 R:2 L:2' },
    { t: 'drum', v: 0.5, p: { k: 'X...x...', s: '..x..rx.', h: 'o.o.o.o.', c: 'x' + '.'.repeat(127) } }] },

  snow: { bpm: 80, sub: 2, beats: 4, key: 'D minor', acc: ['C#'], e: 0.38, r: 0.3, echo: 3, fb: 0.42, prog: j(snA, snB), parts: [
    { t: 'mel', i: 'flute', v: 0.6, n: snM },
    { t: 'arp', i: 'celesta', v: 0.28, pat: '2 - - 1 - - 0 -', lo: 74, pan: 0.4 },
    { t: 'pad', i: 'pad', v: 0.32, c: 57 },
    { t: 'bass', i: 'bass', v: 0.45, pat: 'R:8' },
    { t: 'drum', v: 0.5, p: { n: 'x' + '.'.repeat(15) } }] },

  desert: { bpm: 92, sub: 4, beats: 4, key: 'E phrygdom', prog: j(deA, deB), parts: [
    { t: 'mel', i: 'reed', v: 0.55, n: deM },
    { t: 'arp', i: 'sitar', v: 0.36, pat: '0 - 0 2 - 1 - 2 0 - 0 2 - 1 2 -', lo: 52, pan: -0.3 },
    { t: 'pad', i: 'pad', v: 0.16, c: 54 },
    { t: 'bass', i: 'bass', v: 0.55, pat: 'R:6 R:4 5:6' },
    { t: 'drum', v: 0.5, p: { b: 'x.....x...x.....', i: '..x.x...x.x.x.xo', j: '....o.......o...' } }] },

  dungeon: { gain: 1.2, bpm: 88, sub: 4, beats: 4, key: 'C minor', acc: ['B', 'Db'], e: 0.25, r: 0.25, prog: j(dgA, dgB), parts: [
    { t: 'mel', i: 'strings', v: 0.55, n: dgM },
    { t: 'mel', i: 'horn', v: 0.4, at: 8, pan: -0.25, n: j('C4:16', 'Eb4:16', 'Eb4:16', 'Bb3:16', 'C4:16', 'Db4:16', 'D4:16', 'B3:16') },
    { t: 'arp', i: 'pizz', v: 0.24, pat: '0 1 2 1', lo: 60, pan: 0.3 },
    { t: 'pad', i: 'pad', v: 0.22, c: 52 },
    { t: 'bass', i: 'pbass', v: 0.5, pat: 'R:2 R:2 8:2 R:2' },
    { t: 'drum', v: 0.5, p: { k: 'X..x............', h: '..o...o...o...o.' } },
    { t: 'drum', v: 0.5, p: { t: 'x...............' }, bars: [[8, 16]] }] },

  crypt: { bpm: 66, sub: 2, beats: 4, key: 'A minor', acc: ['F#', 'G#', 'Bb'], e: 0.3, r: 0.4, echo: 3, fb: 0.35, prog: j(crA, crB), parts: [
    { t: 'mel', i: 'choir', v: 0.6, n: crM },
    { t: 'arp', i: 'celesta', v: 0.24, pat: '0 2 4 2 3 1 2 0', lo: 69, pan: 0.35, e: 0.4 },
    { t: 'pad', i: 'organ', v: 0.26, c: 57 },
    { t: 'bass', i: 'bass', v: 0.5, pat: 'R:8' },
    { t: 'drum', v: 0.5, p: { t: 'o' + '.'.repeat(15) } }] },

  spire: { bpm: 84, sub: 4, beats: 4, key: 'E major', acc: ['A#'], e: 0.32, r: 0.4, echo: 6, fb: 0.38, prog: j(spA, spB), parts: [
    { t: 'mel', i: 'glass', v: 0.6, n: spM },
    { t: 'arp', i: 'celesta', v: 0.2, pat: '0 1 2 3 4 5 4 3 2 1 2 3 4 3 2 1', lo: 64, pan: 0.35 },
    { t: 'pad', i: 'pad', v: 0.26, c: 64 },
    { t: 'bass', i: 'bass', v: 0.45, pat: 'R:16' },
    { t: 'drum', v: 0.5, p: { e: 'x' + '.'.repeat(31) } }] },

  storm: { bpm: 132, sub: 4, beats: 4, key: 'F minor', acc: ['E', 'Gb'], fast: true, prog: j(stA, stB, stA), parts: [
    { t: 'mel', i: 'lead', v: 0.55, n: stM },
    { t: 'mel', i: 'strings', v: 0.36, at: 16, pan: -0.3, n: j('C5:16', 'Db5:16', 'Bb4:16', 'C5:16', 'C5:16', 'F4:16', 'Db5:16', 'E4:8 G4:8') },
    { t: 'pad', i: 'brass', v: 0.28, c: 58, rh: 'x:2 -:14', bars: [[8, 16]] },
    { t: 'pad', i: 'pad', v: 0.16, c: 55 },
    { t: 'bass', i: 'pbass', v: 0.5, pat: 'R:1 R:1 8:1 R:1 R:1 R:1 5:1 R:1' },
    { t: 'drum', v: 0.5, p: { k: 'X.....x.X...x...', s: '....X.......X..x', h: 'xoxoxoxoxoxoxoxo', c: 'x' + '.'.repeat(63) } },
    { t: 'drum', v: 0.55, p: { t: 'X.......x.......', n: 'x' + '.'.repeat(127) }, bars: [[8, 16]] }] },

  ruins: { bpm: 72, sub: 2, beats: 4, key: 'A phrygian', e: 0.3, r: 0.4, echo: 3, fb: 0.35, prog: j(ruA, ruB), parts: [
    { t: 'mel', i: 'panflute', v: 0.6, n: ruM },
    { t: 'arp', i: 'harp', v: 0.34, pat: '0 - 1 2 - 3 2 1', lo: 57, pan: -0.3 },
    { t: 'pad', i: 'choir', v: 0.2, c: 57 },
    { t: 'bass', i: 'bass', v: 0.5, pat: 'R:8' },
    { t: 'drum', v: 0.5, p: { b: 'x.......x.....o.', e: 'x' + '.'.repeat(31) } }] },

  battle: { bpm: 150, sub: 4, beats: 4, key: 'E minor', acc: ['D#'], fast: true, e: 0.16, r: 0.12, prog: j(btA, btA2, btB, btB2), parts: [
    { t: 'mel', i: 'lead', v: 0.55, n: btM, bars: [[0, 16]] },
    { t: 'mel', i: 'brass', v: 0.55, n: btM, bars: [[16, 32]] },
    { t: 'mel', i: 'strings', v: 0.34, at: 16, pan: -0.3, n: btC },
    { t: 'arp', i: 'harp', v: 0.26, pat: '0 1 2 3 2 1 0 1', lo: 59, pan: 0.35, bars: [[0, 16]] },
    { t: 'pad', i: 'brass', v: 0.22, c: 57, rh: 'x:2 -:12 x:2', bars: [[0, 16]] },
    { t: 'pad', i: 'pad', v: 0.14, c: 60, bars: [[16, 32]] },
    { t: 'bass', i: 'pbass', v: 0.55, pat: 'R:2 R:1 8:1 R:2 8:2 R:2 R:1 8:1 5:2 A:2' },
    { t: 'drum', v: 0.55, p: { k: 'X.....x.X.....x.', s: '....X.......X...', h: 'x.x.x.x.x.x.x.xx', c: 'x' + '.'.repeat(255) }, bars: [[0, 7], [8, 15], [16, 23], [24, 31]] },
    { t: 'drum', v: 0.55, p: { k: 'X.....x.X.......', s: '....X...x.xXxXrr', h: 'x.x.x.x.........' }, bars: [[7, 8], [15, 16], [23, 24], [31, 32]] }] },

  boss: { gain: 0.72, bpm: 160, sub: 4, beats: 4, key: 'G minor', acc: ['F#', 'Ab'], fast: true, e: 0.14, r: 0.14, prog: j(bsA, bsA, bsB, bsB), parts: [
    { t: 'mel', i: 'lead', v: 0.55, n: j(bsMA, bsMA, bsMB, bsMB) },
    { t: 'mel', i: 'horn', v: 0.4, at: 8, pan: -0.3, n: j(bsCA, '-:128', bsCB) },
    { t: 'pad', i: 'brass', v: 0.3, c: 55, rh: 'x:3 x:3 x:2 -:6 x:2' },
    { t: 'pad', i: 'choir', v: 0.16, c: 62, bars: [[16, 32]] },
    { t: 'bass', i: 'pbass', v: 0.55, pat: 'R:1 R:1 8:1 R:1' },
    { t: 'drum', v: 0.55, p: { k: 'X...x...X...x.x.', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.', t: 'X.......X...X.X.', c: 'x' + '.'.repeat(127) } }] },

  victory: { gain: 0.8, once: true, fast: true, bpm: 140, sub: 4, beats: 4, key: 'G major', e: 0.2, prog: 'G:8 C:4 D:4 G:16', parts: [
    { t: 'mel', i: 'brass', v: 0.6, n: j('G4:2 B4:2 D5:2 G5:2 G5:3 E5:1 F#5:4', 'G5:4 B5:4 D6:8') },
    { t: 'arp', i: 'harp', v: 0.4, pat: '0 1 2 3 4 5 6 7', lo: 55, pan: 0.3 },
    { t: 'pad', i: 'strings', v: 0.36, c: 62, pan: -0.2 },
    { t: 'bass', i: 'bass', v: 0.55, pat: 'R:4' },
    { t: 'drum', v: 0.6, p: { t: 'X...x...x.x.rrrrX...............', c: '................x...............' } }] },

  gameover: { once: true, fast: true, bpm: 72, sub: 2, beats: 4, key: 'A minor', acc: ['G#'], e: 0.3, r: 0.35, prog: 'Am:2 F:2 Dm/F:2 E:2 Am:6', parts: [
    { t: 'mel', i: 'flute', v: 0.6, n: 'E5:2 F5:1 E5:1 D5:1 C5:1 B4:2 | A4:6' },
    { t: 'arp', i: 'harp', v: 0.34, pat: '2 1', lo: 57, pan: 0.3 },
    { t: 'pad', i: 'strings', v: 0.3, c: 57 },
    { t: 'bass', i: 'bass', v: 0.5, pat: 'R:6' }] },

  ending: { bpm: 72, sub: 2, beats: 4, key: 'Eb major', e: 0.26, r: 0.32, prog: j(enA, enB, enA2), parts: [
    { t: 'mel', i: 'flute', v: 0.62, n: enM, bars: [[0, 8]] },
    { t: 'mel', i: 'strings', v: 0.62, n: enM, bars: [[8, 24]] },
    { t: 'mel', i: 'horn', v: 0.4, at: 16, pan: -0.3, n: j('Eb4:8', 'F4:8', 'G4:8', 'C5:8', 'Ab4:8', 'D5:8', 'C5:4 Bb4:4', 'G4:8') },
    { t: 'arp', i: 'harp', v: 0.36, pat: '0 1 2 3 4 3 2 1', lo: 51, pan: 0.3 },
    { t: 'pad', i: 'pad', v: 0.28, c: 60 },
    { t: 'bass', i: 'bass', v: 0.55, pat: 'R:4 5:4' },
    { t: 'drum', v: 0.5, p: { t: 'X.......' }, bars: [[8, 24]] },
    { t: 'drum', v: 0.45, p: { s: '..rrrrrr' }, bars: [[15, 16]] },
    { t: 'drum', v: 0.5, p: { c: 'x' + '.'.repeat(63) }, bars: [[16, 17]] }] },

  pub: { gain: 1.1, bpm: 96, sub: 6, beats: 2, key: 'G major', e: 0.2, r: 0.22, echo: 6, fb: 0.25, prog: j(puA, puB, puA, puB), parts: [
    { t: 'mel', i: 'accordion', v: 0.8, n: j(puV, puBack, puV, puBack) },
    { t: 'mel', i: 'strings', v: 0.8, at: 7, pan: -0.15, n: j(puUp, puC) },
    { t: 'mel', i: 'accordion', v: 0.5, at: 8, pan: 0.2, n: puH },
    { t: 'mel', i: 'panflute', v: 0.45, at: 16, pan: 0.2, n: puW },
    { t: 'mel', i: 'panflute', v: 0.55, at: 24, pan: 0.2, n: puR },
    { t: 'mel', i: 'strings', v: 0.45, at: 24, pan: -0.25, n: puH },
    { t: 'pad', i: 'pizz', v: 0.3, c: 62, rh: '-:4 x:2', pan: -0.3, bars: [[0, 8], [16, 24]] },
    { t: 'pad', i: 'pizz', v: 0.3, c: 62, rh: '-:2 x:2 x:2', pan: -0.3, bars: [[8, 16], [24, 32]] },
    { t: 'pad', i: 'pad', v: 0.14, c: 60, bars: [[8, 16], [24, 32]] },
    { t: 'bass', i: 'bass', v: 0.6, pat: 'R:4 -:2 L:4 -:2', lo: 38, bars: [[0, 8], [16, 24]] },
    { t: 'bass', i: 'bass', v: 0.6, pat: 'R:4 -:2 5:4 -:2', lo: 38, bars: [[8, 16], [24, 32]] },
    { t: 'drum', v: 0.45, p: { b: 'x.....o.....', m: 'x.o.o.x.o.o.' } },
    { t: 'drum', v: 0.45, p: { b: '........o.x.' }, bars: [[7, 8], [23, 24]] },
    { t: 'drum', v: 0.9, pan: 0.25, p: { j: '....x.....x.' }, bars: [[8, 16], [24, 32]] },
    { t: 'drum', v: 0.6, pan: -0.25, p: { w: '..x.....x...' }, bars: [[16, 32]] },
    { t: 'drum', v: 0.9, pan: 0.25, p: { j: '......rrrr..' }, bars: [[15, 16], [31, 32]] },
    { t: 'drum', v: 0.6, pan: -0.25, p: { w: '..........xx' }, bars: [[15, 16], [31, 32]] },
    { t: 'drum', v: 0.8, pan: 0.3, p: { e: 'x...........' }, bars: [[8, 9], [24, 25]] }] },
};

// names the game may ask for before they are wired up (or old names) -> the closest existing piece
export const FALLBACK = { swamp: 'mirewood', sands: 'desert', forest: 'world', plains: 'world', green: 'world', cavern: 'dungeon', inn: 'town', menu: 'title' };
