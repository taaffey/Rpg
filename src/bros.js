// ===== Bearded Bros: the 2026 opening, the jobless intro quest, the locals who join, and the trip home =====
// Adam and Devon ring an old brass bell at The Bell & Anvil and wake in Haven, a thousand years back. They have no
// calling yet ('bloke': fists and vibes) until they clear the Gilded Goose's cellar of slimes and beat Big Gary; then
// Brenna joins and they choose callings at the Guild. Sir Wendell joins at the mouth of the Ashen Cavern.
// Story flags: s:woke (arrival scene seen), s:cellar (Big Gary beaten), s:called (callings chosen), s:wendell (he joined).
import { JOBS, SKILLS, ENEMIES, ENCOUNTERS, DROPS, BOSSES, STORY, QUESTS } from './data.js';
import { MAPS, WALK } from './maps.js';

// ---------------------------------------------------------------- the party
// Adam: the older brother, calm and genuinely the wiser one (the straight man). Devon: the younger, chaotic, sweet, overconfident.
// look: art key suffix (job@look) and scene speaker id. Locals join with a calling of their own.
export const BROS = [['Adam', 'adam'], ['Devon', 'devon']];
export const LOCALS = {
  brenna: { name: 'Brenna', job: 'cleric', armor: 'cloth', flag: 'cellar' },
  wendell: { name: 'Wendell', job: 'knight', armor: 'leather', weapon: 'iron_sword', flag: 'wendell' },
};
Object.assign(STORY.cast, { elder: ['Elder Mott', 'elder'], barnaby: ['Barnaby', 'barnaby'], gary: ['Big Gary', 'villager'], landlord: ['Landlord', 'barkeep'], guildmaster: ['Guildmaster', 'guildmaster'] });

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
  big_gary: E('Big Gary', '🍻', 200, 14, 2, 9, 5, 60, 60, [['slosh', 3], ['belch', 2], ['tackle', 2]], { weak: ['fire'], boss: true, cp: 4 }),
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
  for (const n of inn.npcs) if (n.service === 'inn') Object.assign(n, { type: 'barnaby', name: 'Barnaby' });
  inn.npcs.push({ x: 3, y: 3, type: 'brenna', name: 'Brenna', local: 'brenna',
    text: ['If you\'re going to stand there, at least stand there holding a mop.'],
    textBy: [['!s:cellar', ['Cellar\'s through the trapdoor in the corner. Mind the slimes. And Gary.', 'No, I don\'t know why it\'s called Gary. It introduced itself. Tip: the Skill menu has Headbutt, and a Pint of Lager fixes a wobble.']]] });
}
// the Haven gate stays shut to two blokes in hoodies until the cellar is cleared
for (const pt of Object.values(MAPS.haven.portals)) if (pt.to === 'world') Object.assign(pt, { need: 's:called', deny: [
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
  { s: 'elder', t: 'Barnaby\'s tavern, up past the maypole on the green. The sign says INN. We are not a subtle people. Mind the cellar trapdoor.' },
  { s: 'elder', t: 'Do try not to die. The paperwork is dreadful.' },
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
  { s: 'guildmaster', t: 'Right. Callings. The heroes of old left us a list. Nobody knows why they all had such odd trades.' },
  { s: 'devon', t: 'Bouncer. Chancer. Darts Player. Bro, these are all just blokes from a pub.' },
  { s: 'adam', t: 'Spreadsheet Sorcerer is on here too. I\'m choosing to take that personally.' },
  { s: 'guildmaster', t: 'Pick what suits. More wake as the great evils fall. Yes, one of them is "Influencer". We don\'t talk about it.' },
  { s: 'adam', t: 'Something sensible for me, then. And for him, whatever keeps him alive. I\'ve done that job since he was four.' },
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
  { s: 'wendell', t: 'A word of counsel: the stone golems within laugh at fire. Bolt and good steel crack them. And bring pints. Many, many pints.' },
  { s: 'adam', t: 'Noted. If it gets ugly, we come back out, rest, and get a few levels first. No heroics.' },
  { s: 'brenna', t: 'Great. Now there are three of them.' },
];
export const NO_LEAVE_CELLAR = [{ s: 'adam', t: 'Not yet. The cellar first, then the Guild.' }];
STORY.area.cellar = CELLAR_IN;
STORY.after.big_gary = GARY_DOWN;
// fewer heroes, softer foes: random fights scale to the party's size until all four have joined (bosses are tuned as they are)
export const PARTY_SCALE = { 1: { hp: 0.5, atk: 0.75 }, 2: { hp: 0.62, atk: 0.82 }, 3: { hp: 0.8, atk: 0.9 } };
// Sir Wendell at his post beside the Ashen Cavern's mouth (talk to him, or walk in, and he joins)
{
  const w = MAPS.world, [cx, cy] = w.places.find((p) => p[2] === 'Ashen Cavern'), at = (x, y) => w.rows[y]?.[x];
  const spot = [[-1, 0], [1, 0], [0, 1], [-1, 1], [1, 1]].map(([dx, dy]) => [cx + dx, cy + dy]).find(([x, y]) => WALK.has(at(x, y)) && !w.portals[`${x},${y}`]);
  if (spot) w.npcs.push({ x: spot[0], y: spot[1], type: 'wendell', name: 'Sir Wendell', local: 'wendell', text: ['HALT! None shall pass! ...Unless you are my relief.'] });
}
// The Frost Spire's door bears the drowned king's mark: Morvath must fall before the Titan (so every calling has woken by the end)
{
  const w = MAPS.world, [sx, sy] = w.places.find((p) => p[2] === 'Frost Spire'), pt = w.portals[`${sx},${sy}`];
  Object.assign(pt, { need: 'lich', deny: [
    { s: 'n', t: 'The Spire\'s great door is sealed with a sigil of black water: a crown, sinking.' },
    { s: 'wendell', t: 'The mark of Morvath, the drowned king! I would know it anywhere. I have seen it in a book. Once.' },
    { s: 'devon', t: 'Locked door, bro. Classic. Key\'s in the other dungeon.' },
    { s: 'adam', t: 'The Sunken Crypt, in the dark marsh, a long way east. Past Mirewood, I think. We deal with Morvath, then we come back for the Titan.' },
  ] });
}
// Devon's phone (Items > Key items): 3%, no signal, forever
export const PHONE = [
  [{ s: 'devon', t: '3%. Still 3%. It\'s been 3% since we got here, bro. I think it\'s scared to go lower.' }, { s: 'adam', t: 'Or time works differently here. Either way, stop checking it.' }],
  [{ s: 'devon', t: 'Trying to post a selfie with a goblin. "Uploading..." It\'s been uploading since Haven.' }],
  [{ s: 'devon', t: 'Camera roll. That\'s us at the pub. That\'s the bell. That\'s... my thumb. Twelve photos of my thumb.' }, { s: 'adam', t: 'Delete those. You need the space.' }],
  [{ s: 'devon', t: 'Mum\'s last text: "Don\'t let your brother drive." I didn\'t, Mum. We teleported.' }],
  [{ s: 'devon', t: 'Maps app says we\'re in the sea. Also says the nearest Greggs is "unavailable in your region".' }],
  [{ s: 'devon', t: 'Step counter says 48,000 steps today. That\'s a personal best. I hate it.' }, { s: 'adam', t: 'Proud of you.' }],
  [{ s: 'devon', t: 'Weather app: "Light dragon. 40% chance of lich."' }, { s: 'adam', t: 'It does not say that.' }, { s: 'devon', t: 'It might.' }],
  [{ s: 'devon', t: 'Fantasy football. Adam, your team\'s top of the league. You\'ve not touched it in months.' }, { s: 'adam', t: 'Set and forget. Like a good slow cooker.' }],
  [{ s: 'devon', t: 'Recording a voice note for future us: "If you\'re hearing this, the cargo shorts were worth it."' }],
  [{ s: 'devon', t: 'Flashlight on! ...Okay, the 3% is definitely real now. Flashlight off.' }],
  [{ s: 'devon', t: 'Showing Wendell a video of a horse on a trampoline.' }, { s: 'wendell', t: 'Witchcraft. Wonderful witchcraft. Is it Clarence? It looks happy.' }],
  [{ s: 'devon', t: 'Brenna, want to see a picture of a pizza?' }, { s: 'brenna', t: 'I\'ve no idea what that is and I already know I\'m not impressed.' }],
];
// Bro Combos (battle > COMBO): Adam and Devon's double techs, Chrono Trigger style. Both pay the MP and both turns are spent;
// the move pools their ATK and MAG. New ones are learned as the story goes on.
export const COMBOS = [
  { id: 'bro_shove', if: 's:called', desc: 'One foe takes both brothers at once.' },
  { id: 'bro_hug', if: 's:called', desc: 'A bear hug so sincere it heals the whole party.' },
  { id: 'pub_brawl', if: 'wyrm', desc: 'Chairs, elbows, chaos. Hits every foe.' },
  { id: 'last_orders', if: 'lich', desc: 'The big one. May leave a foe stunned.' },
];
Object.assign(SKILLS, {
  bro_shove: { name: 'Brotherly Shove', mp: 3, tgt: 'one', kind: 'phys', pow: 1.3 },
  bro_hug: { name: 'Bro Hug', mp: 5, tgt: 'allies', kind: 'heal', pow: 0.7 },
  pub_brawl: { name: 'Pub Brawl', mp: 7, tgt: 'all', kind: 'phys', pow: 0.75 },
  last_orders: { name: 'Last Orders', mp: 12, tgt: 'one', kind: 'phys', pow: 1.9, stun: 0.5 },
});
// ---- side quest: "Lightning in a Jar". A Frostholm tinkerer can bottle lightning, given a Storm Shard from the Storm Cavern.
// Payoff: Devon's phone finally reaches 4% (reward flag 'charged').
QUESTS.charger = { title: 'Lightning in a Jar', giver: 'Frostholm tinkerer', goal: { type: 'find', item: 'storm_shard', where: 'Storm Cavern' }, reward: { gold: 600, items: { megaether: 1 }, flag: 'charged' },
  lines: {
    offer: ['Is that a... glowing slate? In your hand? With a tiny lightning bolt on it?', 'It\'s hungry. I can tell. Bring me a Storm Shard from the cavern in the Frostfields and I\'ll bottle you some lightning.'],
    active: ['A Storm Shard. The Storm Cavern, in the Frostfields. Look in the chests; the drake hoards the shiny ones.'],
    ready: ['A Storm Shard! Hold the slate still... and... THERE.', 'One whole percent! I have no idea what that means, but the slate seems very pleased.'],
    done: ['I\'ve been calling it "the Devon". It\'s a jar that hums. People are queuing.'],
  } };
MAPS.frost_smith.npcs.push({ x: 2, y: 6, type: 'villager2', name: 'Tinkerer', quest: 'charger', text: ['Gears, coils, a jar of angry bees. Mostly science.'], textBy: [['q:charger', ['Four percent. A historic day for science.']]] });
{ const [k] = Object.keys(MAPS.storm.chests); MAPS.storm.chests[k] = { ...MAPS.storm.chests[k], qitem: 'storm_shard' }; }
export const PHONE_CHARGED = [
  [{ s: 'devon', t: 'FOUR PERCENT. Adam. ADAM. Four.' }, { s: 'adam', t: 'I\'m genuinely happy for you.' }],
  [{ s: 'devon', t: 'Spent the extra 1% on one more photo of my thumb. No regrets.' }],
  [{ s: 'devon', t: 'Still no signal. But at 4% the no-signal feels more premium.' }],
];
// the finale's 2026 half plays over the pub illustrations: the white light, then The Bell & Anvil again
{
  const f = STORY.finale || [], flash = f.findIndex((l) => /White light/.test(l.t)), back = f.findIndex((l) => /bar stools|Bell & Anvil/.test(l.t));
  if (flash >= 0) f[flash].art = 'flash';
  if (back >= 0) { for (let i = back; i < f.length; i++) f[i].art = 'return'; f[back].music = 'pub'; } // home at last: the tavern jig again
}
// the Gilded Goose (and Quiz Night, which happens in it) has the tavern jig
MAPS.haven_inn.music = 'pub';
