// Boss mechanics, read by the Battle engine (logic.js). Numbers are tuned with tools/skillsim.mjs (plain vs Guard-aware vs cadence-counting players): a wind-up should be
// staggerable by a coordinated party (about half the time at the intended level) and hurt when it lands. A boss fight should be more than a stat check: bosses wind up big attacks the party can
// interrupt (or brace for), and change gear as they are hurt. Keyed by enemy id; anything not listed fights the plain old way.
//
//   charge: { move, every, window, need, mult, vuln, say }
//     move   the skill it unleashes when the wind-up completes (must be one of its own skills; area skills make the best telegraphs)
//     every  it winds up on every Nth action (that action is spent charging)
//     window how many of its own actions the wind-up lasts: 1 = it unleashes on its next action, 2 = one more waiting action first
//     need   damage, as a fraction of its max HP, the party must deal during the wind-up to stagger it: the attack fizzles
//     mult   damage multiplier of the unleashed attack (a hero who Guards takes half of it)
//     vuln   damage multiplier the boss takes while it is winding up (the exposed moment)
//     say    the log line when it starts
//   phases: [{ at, say, card, atk, def, spd, heal, cleanse, extra, skills, charge }], each fires once when its HP falls to `at` (a fraction of max HP)
//     atk/def/spd multiply the stat · heal restores that fraction of max HP · cleanse clears its statuses · extra = more actions per round ·
//     skills = moves added to its pool · charge = replaces its wind-up (the superboss changes tempo)
//     card is the short word the battle stage flashes
export const MECH = {
  big_gary: {
    charge: { move: 'belch', every: 3, window: 1, need: 0.4, mult: 1.7, vuln: 1.25, say: `Big Gary sucks in a vast gulp of cellar air. His moustache quivers...` },
    phases: [{ at: 0.5, say: `Big Gary hiccups. A foam moustache pops off and he goes bright red!`, card: 'FOAMING', atk: 1.2 }],
  },
  wyrm: {
    charge: { move: 'flamebreath', every: 3, window: 1, need: 0.09, mult: 1.8, vuln: 1.25, say: `The Ashen Wyrm draws a long, rattling breath. The air shimmers...` },
    phases: [{ at: 0.5, say: `Its scales glow like coals. The Wyrm is furious!`, card: 'ENRAGED', atk: 1.2 }],
  },
  lich: {
    charge: { move: 'soulstorm', every: 3, window: 1, need: 0.11, mult: 1.9, vuln: 1.25, say: `Morvath raises both hands. The marsh lamps gutter, one by one...` },
    phases: [{ at: 0.4, say: `Morvath drinks in the last of the lamplight and stands taller.`, card: 'DEEPER', atk: 1.15, heal: 0.08 }],
  },
  titan: {
    charge: { move: 'blizzard', every: 4, window: 1, need: 0.085, mult: 1.7, vuln: 1.3, say: `The Frost Titan's chest creaks open. A blizzard gathers inside...` },
    phases: [
      { at: 0.6, say: `Rime thickens across the Titan's shoulders.`, card: 'FROSTED', def: 1.15 },
      { at: 0.3, say: `The Titan roars. Icicles shatter off it and it moves faster!`, card: 'ENRAGED', atk: 1.15, spd: 1.15 },
    ],
  },
  storm_drake: {
    charge: { move: 'thunderbreath', every: 3, window: 1, need: 0.11, mult: 1.9, vuln: 1.25, say: `The Storm Drake's scales crackle. The hair on your arms stands up...` },
    phases: [{ at: 0.5, say: `Static lashes the cavern. The Drake gets quicker!`, card: 'CHARGED', spd: 1.2 }],
  },
  sphinx: {
    charge: { move: 'sunray', every: 3, window: 1, need: 0.11, mult: 1.8, vuln: 1.25, say: `The Sphinx's third eye opens, a bright slit of sun. "Time is up."` },
    phases: [{ at: 0.5, say: `"Wrong. WRONG. All of you." The riddles come faster.`, card: 'IMPATIENT', atk: 1.15, skills: [['riddle', 2]] }],
  },
  mash_tun: {
    charge: { move: 'boilover', every: 3, window: 1, need: 0.1, mult: 1.8, vuln: 1.4, say: `The Mash Tun's gauge needle swings into the red. Steam screams from every rivet!` },
    phases: [{ at: 0.5, say: `Bubbles climb the sides. The Mash Tun ferments faster!`, card: 'FERMENTING', atk: 1.15, heal: 0.08 }],
  },
  margherita: {
    charge: { move: 'ovenblast', every: 4, window: 1, need: 0.1, mult: 1.8, vuln: 1.3, say: `The Margherita's cheese begins to blister. The oven door groans open...` },
    phases: [
      { at: 0.65, say: `Extra cheese! The crust hardens.`, card: 'EXTRA CHEESE', def: 1.12 },
      { at: 0.3, say: `Double dough! The Margherita starts moving twice as fast.`, card: 'DOUBLE DOUGH', extra: 1 },
    ],
  },
  landlord: {
    charge: { move: 'lastbell', every: 4, window: 1, need: 0.08, mult: 1.5, vuln: 1.25, say: `The Landlord reaches for the bell-pull. "Last orders..."` },
    phases: [
      { at: 0.65, say: `"You're all barred." The Landlord takes off his apron.`, card: 'BARRED', atk: 1.1, skills: [['barred', 2]] },
      { at: 0.35, say: `"TIME, GENTLEMEN. PLEASE." The whole bar rattles. Everyone is going home. Permanently.`, card: 'TIME!', charge: { move: 'lastbell', every: 3, window: 2, need: 0.14, mult: 2.6, vuln: 1.3, say: `The Landlord rings the great bell. It will not stop. Get him off it or get down!` } },
    ],
  },
  miller: {
    charge: { move: 'rollstone', every: 3, window: 1, need: 0.3, mult: 1.8, vuln: 1.25, say: `The Miller winds the great millstone back like a bowling ball...` },
    phases: [{ at: 0.5, say: `Flour everywhere. The Miller is properly angry now.`, card: 'FLOURED', atk: 1.15 }],
  },
  captain_barnacle: {
    charge: { move: 'broadside', every: 3, window: 1, need: 0.16, mult: 1.8, vuln: 1.25, say: `Barnacle hauls the cannon round and lights the fuse with his cigar.` },
    phases: [{ at: 0.5, say: `"YO HO HO!" The ghost crew cheer and the Captain swings harder.`, card: 'YO HO HO', atk: 1.15, skills: [['yohoho', 1]] }],
  },
  clerk_pharaoh: {
    charge: { move: 'officehours', every: 3, window: 1, need: 0.14, mult: 1.8, vuln: 1.25, say: `The Clerk Pharaoh stacks a vast tower of forms. "I'll need that in triplicate."` },
    phases: [{ at: 0.5, say: `He stamps his own forms APPROVED. Defence up.`, card: 'APPROVED', def: 1.2 }],
  },
  frozen_angler: {
    charge: { move: 'tidalsplash', every: 3, window: 1, need: 0.15, mult: 1.8, vuln: 1.25, say: `The Angler hauls back an enormous, shivering line...` },
    phases: [{ at: 0.5, say: `He bites into a very cold sandwich. HP up, mood worse.`, card: 'SNACK BREAK', heal: 0.08, atk: 1.1 }],
  },
};
