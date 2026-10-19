// ===== Bearded Bros: the 2026 opening, the jobless intro quest, the locals who join, and the trip home =====
// Adam and Devon ring an old brass bell at The Bell & Anvil and wake in Haven, a thousand years back. They have no
// calling yet ('bloke': fists and vibes) until they clear the Gilded Goose's cellar of slimes and beat Big Gary; then
// Brenna joins and they choose callings at the Guild. Sir Wendell joins at the mouth of the Ashen Cavern.
// Story flags: s:woke (arrival scene seen), s:cellar (Big Gary beaten), s:called (callings chosen), s:wendell (he joined).
import { JOBS, SKILLS, ENEMIES, ENCOUNTERS, DROPS, BOSSES, STORY } from './data.js';
import { MAPS } from './maps.js';

// ---------------------------------------------------------------- the party
// Adam: the older brother, calm and genuinely the wiser one (the straight man). Devon: the younger, chaotic, sweet, overconfident.
// look: art key suffix (job@look) and scene speaker id. Locals join with a calling of their own.
export const BROS = [['Adam', 'adam'], ['Devon', 'devon']];
export const LOCALS = {
  brenna: { name: 'Brenna', job: 'cleric', armor: 'cloth', flag: 'cellar' },
  wendell: { name: 'Wendell', job: 'knight', armor: 'leather', weapon: 'iron_sword', flag: 'wendell' },
};
Object.assign(STORY.cast, { elder: ['Elder Mott', 'elder'], barnaby: ['Barnaby', 'innkeeper'], gary: ['Big Gary', 'villager'], landlord: ['Landlord', 'barkeep'], guildmaster: ['Guildmaster', 'guildmaster'] });

// ---------------------------------------------------------------- no calling yet
JOBS.bloke = { name: 'Bloke', icon: '🍺', desc: 'No calling yet. Fists, vibes and a phone on 3%.', mod: { hp: 1.15, mp: 0.5, atk: 1.1, def: 1.0, mag: 0.5, spd: 1.0 }, weapons: ['fists'], skills: [['headbutt', 1], ['banter', 2]], trait: null, master: {} };
Object.assign(SKILLS, {
  headbutt: { name: 'Headbutt', mp: 2, tgt: 'one', kind: 'phys', pow: 1.5 },
  banter: { name: 'Banter', mp: 2, tgt: 'one', kind: 'mag', pow: 0.6, fx: ['slow'] }, // so bad it hurts
  belch: { name: 'Belch', mp: 0, tgt: 'all', kind: 'mag', pow: 0.6 },
  slosh: { name: 'Slosh', mp: 0, tgt: 'one', kind: 'phys', pow: 1.25 },
});

// ---------------------------------------------------------------- the Gilded Goose's cellar
const E = (name, icon, hp, atk, def, mag, spd, exp, gold, skills, x = {}) => ({ name, icon, hp, atk, def, mag, spd, exp, gold, skills, weak: [], res: [], ...x });
Object.assign(ENEMIES, {
  cellar_rat: E('Cellar Rat', '🐀', 34, 10, 1, 2, 9, 9, 5, [['bite', 1]]),
  ale_slime: E('Ale Slime', '🍺', 52, 11, 1, 5, 4, 12, 7, [['tackle', 2], ['slosh', 1]], { weak: ['fire'] }),
  big_gary: E('Big Gary', '🍻', 200, 14, 2, 9, 5, 60, 120, [['slosh', 3], ['belch', 2], ['tackle', 2]], { weak: ['fire'], boss: true, cp: 4 }),
});
if (!SKILLS.bite) SKILLS.bite = { name: 'Bite', mp: 0, tgt: 'one', kind: 'phys', pow: 1.0 };
ENCOUNTERS.cellar = [['cellar_rat'], ['ale_slime'], ['cellar_rat', 'cellar_rat'], ['ale_slime', 'cellar_rat']];
Object.assign(DROPS, { cellar_rat: { common: ['items', 'potion', 0.2], rare: ['items', 'antidote', 0.06] }, ale_slime: { common: ['items', 'potion', 0.25], rare: ['items', 'ether', 0.06] }, big_gary: { common: ['items', 'ether', 1], rare: ['items', 'hipotion', 0.5] } });
BOSSES.big_gary = { name: 'Big Gary', intro: 'The biggest slime you have ever seen turns round. It is wearing a foam moustache. "GAAARY," it gurgles.', loot: {} };

const CELLAR = [
  '##################',
  '#E...#......#....#',
  '#....#..C...#....#',
  '#...........#....#',
  '###.####.####....#',
  '#......#.........#',
  '#.C....#..####.###',
  '#......#..#......#',
  '####.###..#..X...#',
  '#.........#......#',
  '#......C..########',
  '##################',
];
MAPS.cellar = {
  name: 'Goose Cellar', kind: 'dungeon', theme: 'cellar', music: 'dungeon', rows: CELLAR, spawn: { x: 2, y: 1 }, enc: 'cellar', rate: 0.1, fog: 4,
  portals: { '1,1': { to: 'haven_inn', x: 2, y: 6 } },
  chests: { '8,2': { items: { potion: 2 } }, '2,6': { gold: 60, items: { antidote: 1 } }, '7,10': { items: { ether: 1, potion: 1 } } },
  boss: { x: 13, y: 8, id: 'big_gary' },
};
// the trapdoor in the Goose's back corner (flat decor, walkable), and Barnaby + Brenna behind the bar until she joins
{
  const inn = MAPS.haven_inn; inn.decor = inn.decor.filter(([x, y]) => !(x === 1 && y === 6));
  inn.decor.push([1, 6, 'trapdoor']); inn.portals['1,6'] = { to: 'cellar', x: 2, y: 2 };
  inn.npcs.push({ x: 3, y: 3, type: 'brenna', name: 'Brenna', local: 'brenna',
    text: ['If you\'re going to stand there, at least stand there holding a mop.'],
    textBy: [['!s:cellar', ['Cellar\'s through the trapdoor in the corner. Mind the slimes. And Gary.', 'No, I don\'t know why it\'s called Gary. It introduced itself.']]] });
}
// the Haven gate stays shut to two blokes in hoodies until the cellar is cleared
for (const k of ['16,33', '17,33', '18,33']) if (MAPS.haven.portals[k]) Object.assign(MAPS.haven.portals[k], { need: 's:called', deny: [
  { s: 'guard', t: 'Oi. Where do you two think you\'re going, dressed like that? No calling, no weapon, no chance.' },
  { s: 'devon', t: 'Bro, it\'s a tutorial area. We can\'t leave till we finish the tutorial.' },
  { s: 'adam', t: 'The Elder said the Gilded Goose. The tavern. Let\'s go and sort out the cellar.', if: '!s:cellar' },
  { s: 'adam', t: 'Right. The Guild, then. Time to get a proper job.', if: 's:cellar' },
] });

// ---------------------------------------------------------------- scenes
// The prologue, told over the pub illustrations (pubart.js); {pub} lines are [variant, title, text].
export const PUB = [
  ['pub', 'The Bell & Anvil', 'Quiz night, 2026. The Bell & Anvil. Two brothers, two beards, one answer sheet with mostly crossings-out.'],
  ['pub', 'Round Seven', 'ADAM: "Capital of Australia." DEVON: "Sydney." ADAM: "Canberra." DEVON: "Write Sydney, bro. Trust the beard." Adam writes Canberra.'],
  ['ring', 'The Bell', 'Behind the bar hangs a brass bell the landlord bought at a car-boot sale. Devon reaches up. "A ROUND FOR THE HOUSE!"'],
  ['flash', '...', 'Nobody agreed to pay for that round. Nobody gets the chance to. The bell rings once, and keeps ringing, a thousand years deep.'],
];
export const WAKE = [
  { s: 'n', t: 'Hay. Sunlight. A goat, eating Devon\'s shoelace.' },
  { s: 'devon', t: 'Bro. BRO. We\'re in a video game.' },
  { s: 'adam', t: 'We are not in a video game. Check your phone. ...No signal, no date, no pub. Right. Nobody panic. Especially you.' },
  { s: 'elder', t: 'It worked! The bell! After three hundred years, the heroes of legend have... oh.' },
  { s: 'elder', t: 'I rang for the heroes of legend. Four of them. In shining armour. You are two men in what appear to be blankets with sleeves.' },
  { s: 'devon', t: 'It\'s a hoodie. It\'s got a pocket. Look. Pocket.' },
  { s: 'elder', t: 'I am Elder Mott. Three ancient evils are waking, the realm is doomed, and the bell has sent me... these.' },
  { s: 'adam', t: 'Fair enough. Mistakes were made. Mostly by him. So how do we get home?' },
  { s: 'elder', t: 'The bell rings for those who set right Gemforge\'s seals. Slay the three evils and perhaps it will ring for you again.' },
  { s: 'devon', t: 'Main quest unlocked. Let\'s GO.' },
  { s: 'elder', t: 'You have no calling, no weapons and no idea. Prove you can swing a fist first. The Gilded Goose has a slime problem.' },
  { s: 'elder', t: 'Barnaby\'s cellar. Down the street, the inn by the north wall. Do try not to die. The paperwork is dreadful.' },
];
export const CELLAR_IN = [
  { s: 'n', t: 'Brick vaults. Barrels. Something squelching in the dark, and a smell like a brewery that gave up.' },
  { s: 'devon', t: 'Classic first dungeon. Rats, slimes, a boss with a stupid name. I\'ve played this a hundred times.' },
  { s: 'adam', t: 'You\'ve played FIFA a hundred times. Stay behind me.' },
];
export const GARY_DOWN = [
  { s: 'n', t: 'Big Gary wobbles, burps out a perfectly good barrel of ale, and dissolves into a puddle of foam.' },
  { s: 'devon', t: 'GG, Gary. GG.' },
  { s: 'n', t: 'Footsteps on the cellar stairs. A young woman with an apron and a mop takes in the scene.' },
  { s: 'brenna', t: 'You killed Gary. He\'s been down here a month. I\'d started leaving him crisps.' },
  { s: 'adam', t: 'Sorry? He attacked us. With his... whole body.' },
  { s: 'brenna', t: 'Brenna. Barnaby\'s my dad. Thanks for the cellar. Now: you two are going to get killed in about a day and a half.' },
  { s: 'brenna', t: 'Somebody has to patch you up. I\'ve spent six years cleaning up after drunks. Heroes can\'t be much worse.' },
  { s: 'devon', t: 'Party member joined! Brenna, you\'re a healer, yeah? You give off healer vibes.' },
  { s: 'brenna', t: 'I give off "please wipe your feet" vibes. But fine. Healer. Now go to the Guild and get yourselves proper callings.' },
];
export const CALLED = [
  { s: 'guildmaster', t: 'Right. Callings. No, "influencer" is not one. Neither is "IT support".' },
  { s: 'adam', t: 'Whatever keeps him alive. I\'ve been doing that job for free since he was four.' },
];
export const CALLED_AFTER = [
  { s: 'guildmaster', t: 'There. Every battle teaches a calling something, and what you learn you keep. Change any time; I won\'t be offended.' },
  { s: 'brenna', t: 'The Ashen Cavern\'s east of town. The Wyrm\'s in there. Buy weapons first. Real ones. Not Devon\'s fists.' },
  { s: 'devon', t: 'These fists have been banned from three Wetherspoons, Brenna.' },
];
export const WENDELL = [
  { s: 'n', t: 'At the mouth of the cavern, an old knight stands to attention. His moustache is magnificent. His armour is mostly rust.' },
  { s: 'wendell', t: 'HALT! None shall pass! ...Unless you are my relief. Are you my relief? Please say you are my relief.' },
  { s: 'adam', t: 'We\'re here to kill the Wyrm, actually.' },
  { s: 'wendell', t: 'Sir Wendell of Haven, at your service. I have guarded this cave for eleven years. Nobody told me I could stop.' },
  { s: 'devon', t: 'Eleven YEARS? Mate, that\'s not a job, that\'s a hostage situation.' },
  { s: 'wendell', t: 'I see you also honour the old ways of the beard. Splendid. Then I ride with you! Well. Walk. The horse left in year three.' },
  { s: 'brenna', t: 'Great. Now there are three of them.' },
];
export const NO_LEAVE_CELLAR = [{ s: 'adam', t: 'Not yet. The cellar first, then the Guild.' }];
STORY.area.cellar = CELLAR_IN;
STORY.after.big_gary = GARY_DOWN;
// fewer heroes, softer foes: random fights scale to the party's size until all four have joined (bosses are tuned as they are)
export const PARTY_SCALE = { 1: { hp: 0.5, atk: 0.75 }, 2: { hp: 0.62, atk: 0.82 }, 3: { hp: 0.8, atk: 0.9 } };
