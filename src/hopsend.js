// ===== Hopsend Isle: the fifth island (late game). An autumn orchard-and-hop-field island with a cosy village, Hopsend, and a huge
// dungeon, the Great Brewery, where the brewing has gone horribly wrong. Boss: The Mash Tun (optional).
// Side-effect module (like bros.js): imports from data.js and fills the shared objects. Map ids it expects (built in maps.js):
// 'hopsend' (village), 'brewery' (dungeon). Encounter tables: 'hops' (island fields) and 'brewery'.
// NPC givers: 'Hopsend innkeeper' (barrels), 'Hopsend beekeeper' (wasps), 'Hopsend head farmer' (mashtun).
import { SKILLS, ENEMIES, ENCOUNTERS, DROPS, BOSSES, WEAPONS, ARMORS, ACCS, SHOPS, QUESTS, STORY, BESTIARY_NOTES, QUIZ } from './data.js';

const S = (name, mp, tgt, kind, pow, x = {}) => ({ name, mp, tgt, kind, pow, ...x });
const E = (name, icon, hp, atk, def, mag, spd, exp, gold, skills, x = {}) => ({ name, icon, hp, atk, def, mag, spd, exp, gold, skills, weak: [], res: [], ...x });
const D = (ck, cid, cp, rk, rid, rp) => ({ common: [ck, cid, cp], rare: [rk, rid, rp] });
const W = (name, type, atk, mag, sockets, price, innate, tier, desc, x = {}) => ({ name, type, atk, mag, sockets, price, innate, tier, desc, ...x });
const C = (s, t) => ({ s, t });

// ---------------------------------------------------------------- enemy skills (enemy-only, silly names)
Object.assign(SKILLS, {
  hoppole: S('Hop Pole Whack', 0, 'one', 'phys', 1.3, { stun: 0.15 }),
  overtime: S('Mandatory Overtime', 0, 'self', 'buff', 0, { fx: ['atkup'] }),
  crowflock: S('Murder of Crows', 0, 'all', 'phys', 0.6),
  thousandyard: S('Thousand-Yard Stare', 0, 'one', 'mag', 1.1, { elem: 'dark', stun: 0.3 }),
  pumpkinsplat: S('Pumpkin Spice Splat', 0, 'one', 'mag', 1.3, { fx: ['slow'] }),
  scrumpysnap: S('Scrumpy Snap', 0, 'one', 'phys', 1.3, { stun: 0.2 }),
  barrelroll: S('Barrel Roll', 0, 'all', 'phys', 0.7),
  hayfever: S('Hay Fever', 0, 'all', 'phys', 0.6, { fx: ['slow'] }),
  boozefumes: S('Boozy Fumes', 0, 'all', 'mag', 0.7, { elem: 'dark', fx: ['poison'] }),
  // the Mash Tun
  vatslam: S('Vat Slam', 0, 'one', 'phys', 1.8),
  boilover: S('Boil Over', 0, 'all', 'mag', 1.0, { elem: 'fire' }),
  foamparty: S('Foam Party', 0, 'all', 'buff', 0, { fx: ['slow'], hostile: true }),
  hopbomb: S('Hop Bomb', 0, 'one', 'mag', 1.5, { fx: ['poison'] }),
  ferment: S('Second Fermentation', 0, 'self', 'buff', 0, { fx: ['atkup'] }),
});

// ---------------------------------------------------------------- enemies (Lv ~15-21, Sunscar Ruins / Frost Spire tier)
Object.assign(ENEMIES, {
  hop_goblin: E('Foreman Hop Goblin', '👺', 520, 66, 16, 8, 11, 205, 90, [['hoppole', 2], ['tackle', 1], ['overtime', 1]], { weak: ['bolt', 'fire'] }),
  scarecrow: E('Traumatised Scarecrow', '🎃', 560, 62, 14, 40, 9, 215, 96, [['slash', 2], ['crowflock', 1], ['thousandyard', 1]], { weak: ['fire', 'holy'], res: ['dark'] }),
  pumpkin_slime: E('Pumpkin Spice Slime', '🎃', 480, 56, 12, 32, 6, 190, 84, [['tackle', 2], ['pumpkinsplat', 2]], { weak: ['ice'], res: ['fire'] }),
  cider_wolf: E('Scrumpy Wolf', '🐺', 540, 72, 13, 6, 15, 210, 88, [['bite', 2], ['scrumpysnap', 2], ['venombite', 1]], { weak: ['fire', 'holy'] }),
  barrel_imp: E('Barrel-Rolling Imp', '👹', 470, 18, 12, 64, 12, 200, 94, [['fireball', 2], ['barrelroll', 2], ['tackle', 1]], { weak: ['fire', 'bolt'], res: ['ice'] }),
  straw_golem: E('Hay Bale Golem', '🗿', 880, 72, 22, 6, 4, 265, 112, [['slam', 3], ['hayfever', 1], ['tackle', 1]], { weak: ['fire'], res: ['bolt', 'ice'] }),
  brew_wraith: E('Last Orders Wraith', '👻', 480, 14, 14, 70, 14, 230, 104, [['draintouch', 2], ['boozefumes', 1], ['hexbolt', 1]], { weak: ['holy', 'fire'], res: ['dark'] }),
  wasp_swarm: E('Angry Wasp Swarm', '🐝', 360, 66, 8, 4, 20, 190, 80, [['swarm', 2], ['sting', 2], ['deathsting', 1]], { weak: ['fire', 'ice'] }),
  mash_tun: E('The Mash Tun', '🛢️', 4800, 74, 28, 66, 9, 2600, 2200, [['vatslam', 3], ['boilover', 2], ['hopbomb', 2], ['foamparty', 1], ['ferment', 1]], { weak: ['ice', 'bolt'], res: ['fire'], boss: true, cp: 14 }),
});
ENCOUNTERS.hops = [['wasp_swarm'], ['pumpkin_slime', 'pumpkin_slime'], ['hop_goblin'], ['cider_wolf', 'cider_wolf'], ['scarecrow'], ['barrel_imp', 'pumpkin_slime'], ['wasp_swarm', 'wasp_swarm'], ['straw_golem'], ['hop_goblin', 'cider_wolf'], ['scarecrow', 'wasp_swarm']];
ENCOUNTERS.brewery = [['brew_wraith', 'barrel_imp'], ['hop_goblin', 'hop_goblin'], ['pumpkin_slime', 'brew_wraith', 'pumpkin_slime'], ['scarecrow', 'scarecrow'], ['cider_wolf', 'hop_goblin', 'barrel_imp'], ['straw_golem', 'barrel_imp'], ['straw_golem', 'brew_wraith'], ['straw_golem', 'straw_golem']];

BOSSES.mash_tun = { name: 'The Mash Tun', intro: 'The Great Mash Tun bubbles over, burps a cloud of hot barley, and rises on its oak legs. "GLUG," it says. Not a greeting.', optional: true, loot: { weapons: ['mash_paddle'], armors: ['kettle_mail'] } };

// ---------------------------------------------------------------- gear
Object.assign(WEAPONS, {
  barrel_stave: W('Oak Barrel Stave', 'sword', 26, 0, 2, 1250, undefined, 3, 'Iron-hooped oak, still damp. Hits like a rounders bat and smells like Friday.', { crit: 0.1, def: 4 }),
  bottle_opener: W('Trusty Bottle Opener', 'dagger', 18, 0, 2, 1150, 'swift', 3, 'Pops caps, locks and the odd foe. A lucky flick stuns. Cheers.', { spd: 4, crit: 0.2, proc: ['stun', 0.12] }),
  rocket_launcher: W('Bottle Rocket Launcher', 'bow', 25, 0, 2, 1300, 'fire', 3, 'Fireworks night leftovers in a drainpipe. Aim away from the thatch.', { elem: 'fire', pierce: 0.2, spd: 2 }),
  coopers_mallet: W('Cooper\'s Mallet', 'axe', 31, 0, 2, 1300, 'crit', 3, 'Knocks the hoops onto barrels, and the sense out of foes. Slow, loud.', { spd: -2, crit: 0.12 }),
  bine_strimmer: W('Hop Bine Strimmer', 'scythe', 22, 12, 2, 1250, 'vamp', 3, 'Strims the bines at harvest. Takes a cut of everything it cuts.', { spd: -1, proc: ['drain', 0.35] }),
  mash_paddle: W('The Big Mash Paddle', 'staff', 5, 29, 3, 0, 'siphon', 4, 'Stirs vats the size of houses. Spells come out warm, malty and slightly sticky.', { mp: 30, heal: 0.3, sig: 'tonic' }),
});
Object.assign(ARMORS, {
  field_jacket: { name: 'Waxed Field Jacket', desc: 'Waxed, tweedy, smells of wet dog and money. Sheds rain and opinions.', def: 25, hp: 30, spd: 2, sockets: 1, price: 1150 },
  kettle_mail: { name: 'Copper Kettle Mail', desc: 'Whistles when it boils. Fireproof, dent-resistant and tea-ready.', def: 32, hp: 45, spd: -1, res: ['fire'], sockets: 2, price: 0 },
});
Object.assign(ACCS, {
  hop_garland: { name: 'Hop Garland Crown', desc: 'Magic, MP and a festival hangover. Sleep-inducing, allegedly.', mag: 5, mp: 20, hp: 20, sockets: 1, price: 900 },
  corkscrew: { name: 'Pocket Corkscrew', desc: 'More attack, more speed. Opens wine, tins and, once, a locked shed.', atk: 7, spd: 3, sockets: 1, price: 850 },
  wellie_charm: { name: 'Muddy Wellie Charm', desc: 'A tiny welly, full of luck. Extra HP and defence. Never clean.', def: 5, hp: 35, spd: 2, sockets: 0, price: 950 },
});

// ---------------------------------------------------------------- shops
Object.assign(SHOPS, {
  hop_general: { title: '🛒 Hopsend Farm Shop', greet: 'Apples, honey, pickles, and a jar labelled "ASK ME". Nobody has dared.', stock: { items: ['potion', 'hipotion', 'ether', 'megaether', 'phoenix', 'antidote', 'remedy', 'elixir'], gems: ['fire', 'frost', 'bolt', 'holy', 'shadow', 'chain', 'vamp', 'pierce', 'thrifty', 'guard', 'crit', 'venom'] } },
  hop_smith: { title: '⚒️ Hopsend Cooper & Forge', greet: 'We make barrels, hoops and the odd sword. The barrels are better, honestly.', stock: { weapons: ['barrel_stave', 'bottle_opener', 'rocket_launcher', 'coopers_mallet', 'bine_strimmer', 'stiletto', 'sage_staff', 'steel_fist', 'arcane_tome'], armors: ['field_jacket', 'mythril_mail', 'frost_robe'], accs: ['hop_garland', 'corkscrew', 'wellie_charm', 'life_charm', 'socket_jewel'] } },
});

// ---------------------------------------------------------------- drops
Object.assign(DROPS, {
  hop_goblin: D('items', 'hipotion', 0.3, 'accs', 'corkscrew', 0.05), scarecrow: D('items', 'remedy', 0.25, 'gems', 'shadow', 0.06), pumpkin_slime: D('items', 'potion', 0.35, 'gems', 'thrifty', 0.06),
  cider_wolf: D('items', 'hipotion', 0.25, 'weapons', 'coopers_mallet', 0.04), barrel_imp: D('items', 'ether', 0.3, 'accs', 'hop_garland', 0.05), straw_golem: D('items', 'hipotion', 0.3, 'gems', 'wide', 0.08),
  brew_wraith: D('items', 'megaether', 0.2, 'gems', 'echo', 0.05), wasp_swarm: D('items', 'antidote', 0.35, 'gems', 'swift', 0.06),
  mash_tun: D('items', 'elixir', 1, 'accs', 'wellie_charm', 0.5),
});

// ---------------------------------------------------------------- quests (giver names match the NPCs placed in maps.js)
Object.assign(QUESTS, {
  barrels: { title: 'Rolling Out the Barrels', giver: 'Hopsend innkeeper', goal: { type: 'kill', ids: ['barrel_imp', 'hop_goblin'], n: 10 }, reward: { gold: 1100, gems: ['guard'], items: { elixir: 1 } },
    lines: { offer: ['Someone is nicking my barrels! Whole casks, rolled off at night. I have found imp footprints. And little hi-vis vests.', 'Barrel imps and hop goblins, out in the fields and the brewery. Ten of them should teach the rest. Bring ten, and I shall pour you something nice.'], active: ['Ten barrel imps or hop goblins. Fields or the Brewery, I do not mind. Mind the barrels on the way out.'], ready: ['The cellar is full again! Ten thieves down. Here: gold, a Sunday roast, and a gem that stops people nicking things. Probably.'], done: ['Not a barrel missing. I count them every night. Twice. Okay, five times.'] } },
  wasps: { title: 'Waspish Behaviour', giver: 'Hopsend beekeeper', goal: { type: 'kill', ids: ['wasp_swarm'], n: 8 }, reward: { gold: 900, gems: ['venom'], items: { hipotion: 3, remedy: 2 } },
    lines: { offer: ['My bees are terrified. The wasps have formed a swarm, a very organised swarm, with a rota.', 'Clear out eight wasp swarms and my bees can go back to their honey. Burn them or freeze them. I do not mind. Keep your arms down.'], active: ['Eight wasp swarms. The orchards and the hop fields. Fire or ice, mind the stings.'], ready: ['The bees are back at work! Take this gem, some tea and biscuits, and as much honey as you can carry. Stop eating it now.'], done: ['Peace at last. The bees sent a card. It is mostly buzzing.'] } },
  mashtun: { title: 'The Great Mash Tun', giver: 'Hopsend head farmer', goal: { type: 'boss', id: 'mash_tun' }, reward: { gold: 3000, gems: ['echo', 'execute'], items: { elixir: 3 } },
    lines: { offer: ['The Great Brewery has been bubbling since harvest. The Mash Tun, our biggest vat, has decided it wants out. And a quarter of the island.', 'Cool it down, lads. Ice or lightning, never fire. It loves the heat. Beat the Mash Tun and the island will drink to you for a decade.'], active: ['The Great Brewery, at the far end of the island. Ice and bolts. The foam slows you, so strike fast.'], ready: ['Flat! Calm! Drinkable! The island is saved, and so is the harvest. Take the reserve, with our thanks.'], done: ['The Mash Tun is calm now. It hums lullabies to the barley. We let it.'] } },
});

// ---------------------------------------------------------------- bestiary field notes (<= 100 chars)
Object.assign(BESTIARY_NOTES, {
  hop_goblin: ['adam', 'Hi-vis, clipboard, zero patience. Fire or bolts. His pole stuns, and he works overtime.'],
  scarecrow: ['devon', 'He\'s seen things, bro. His stare can stun you. Fire or holy sorts him out. Dark won\'t.'],
  pumpkin_slime: ['devon', 'Pumpkin spice, bro. Seasonal! Ice sets it; fire only makes it a latte. Splat slows you.'],
  cider_wolf: ['adam', 'Smells of scrumpy and bad decisions. Fire or holy. The snap stuns, the bite poisons.'],
  barrel_imp: ['brenna', 'Rolls barrels like it owns the place. Fire or bolts. Ice slides off. Barrel Roll hits all.'],
  straw_golem: ['wendell', 'A bale with ideas! Light a torch to it. Bolts and ice do nothing. Hay fever slows us.'],
  brew_wraith: ['brenna', 'Still here after closing. Holy or fire. Dark does nothing. The fumes poison everyone.'],
  wasp_swarm: ['devon', 'One wasp is bad, bro. These have a union. Fire or ice. Four stings at once, poison too.'],
  mash_tun: ['adam', 'A vat the size of a shed. Ice or bolts, never fire. Foam slows us, Boil Over hits all.'],
});

// ---------------------------------------------------------------- story: first arrival at the village and the Brewery
Object.assign(STORY.area, {
  hopsend: [
    { s: 'n', t: 'Hopsend Isle. Orchards sag with apples, the hop-bines glow bronze and rust, and the whole island smells like the inside of a very nice pint.' },
    { s: 'devon', t: 'Bro. The air tastes like a Sunday lunchtime.' },
    { s: 'adam', t: 'The ferryman said the brewery went wrong at harvest. He wouldn\'t say how wrong.' },
    { s: 'devon', t: 'How wrong can a brewery go? It\'s just beer.' },
    { s: 'n', t: 'Far across the fields, a copper chimney belches a smoke ring. It sounds happy about it.' },
    { s: 'brenna', t: 'Three kinds of cider in the harbour and not one decent landlord. I could run this place blindfolded.' },
    { s: 'wendell', t: 'A land of plenty! I shall defend its apples to the last pip.' },
  ],
  brewery: [
    { s: 'n', t: 'The Great Brewery looms: copper pipes thick as oaks, steam hissing from every joint. Somewhere deep inside, something is bubbling. Contentedly.' },
    { s: 'devon', t: 'It smells like Gary, bro. Like Gary\'s cousin. Gary\'s cousin, but warmer.' },
    { s: 'adam', t: 'Stay together. If anything is glowing, nobody touches it.' },
    { s: 'devon', t: 'I only touched the one thing.' },
    { s: 'adam', t: 'It was a vat of boiling mash, Dev.' },
    { s: 'brenna', t: 'Health and safety would have a field day here. And then a funeral.' },
    { s: 'wendell', t: 'A fortress of copper! Whoever commands it must be a brewer of fearsome skill. Or a very lazy one.' },
  ],
});
STORY.after.mash_tun = [
  { s: 'n', t: 'The Mash Tun shudders, sighs a long and contented belch, and settles into a quiet puddle of very good ale. The pipes stop hissing at last.' },
  { s: 'devon', t: 'We just beat a pint, bro. A really big pint. With a face.' },
  { s: 'adam', t: 'Technically a vat.' },
  { s: 'brenna', t: 'It\'s going flat. Someone get a glass before it all goes to waste.' },
  { s: 'wendell', t: 'A noble foe! Felled by honest steel and, in small part, honest yeast.' },
  { s: 'n', t: 'Down in the village, the church bell rings for the first time since harvest. The whole of Hopsend starts running towards the brewery with jugs.' },
  { s: 'devon', t: 'Open bar, bro. OPEN BAR.' },
  { s: 'adam', t: 'One pint, Dev. Pace yourself. We still have a bell to answer.' },
];

// ---------------------------------------------------------------- party chat
STORY.chat.push(
  { id: 'hop_village', at: 'hopsend', lines: [C('devon', 'Bro, they\'ve got an apple tree growing out of the PUB. In the pub.'), C('adam', 'That\'s a lot of pub for one tree.'), C('devon', 'I want to live here. I\'d be called Devon of the Orchard.'), C('adam', 'You\'d be called Devon who fell out of the orchard.')] },
  { id: 'hop_hops', if: 'v:hopsend !mash_tun', lines: [C('devon', 'So hops are what make beer taste like beer?'), C('adam', 'They give it the bitterness. They grow on bines, tall ones, up a pole.'), C('devon', 'Bines. Bro, I love it. "Bine." Say it again.'), C('adam', 'No.')] },
  { id: 'brew_floor', at: 'brewery', if: '!mash_tun', lines: [C('devon', 'The floor is sticky, bro. Like a nightclub, but with a worse atmosphere.'), C('adam', 'It\'s wort. Sweet, unfermented beer.'), C('devon', 'The posh word for beer before it\'s beer. Respect.'), C('adam', 'It\'s also on your trainers.')] },
  { id: 'brew_brenna', at: 'brewery', if: 'p:brenna !mash_tun', lines: [C('brenna', 'Lines are blocked, kegs unclean, and someone has left the yeast on. That\'s what\'s got up and started walking.'), C('adam', 'You know a lot about brewing.'), C('brenna', 'I know a lot about people who don\'t clean their pipes. Same thing.')] },
  { id: 'mash_after', if: 'mash_tun', lines: [C('devon', 'First Gary, now the Mash Tun. I\'m basically a professional pint-slayer.'), C('adam', 'You mostly stood at the back.'), C('devon', 'Quality control, bro. Someone has to supervise.'), C('adam', 'You\'re not even a little bit sorry about the open bar, are you?')] },
);

// ---------------------------------------------------------------- pub quiz
QUIZ.push(
  { q: 'Which flower gives beer its bitterness, grown up tall poles in Hopsend?', a: ['Hops', 'Barley', 'Rhubarb', 'Dandelion'] },
  { q: 'What is the climbing stem of a hop plant called?', a: ['A bine', 'A vine', 'A stalk', 'A rope'] },
  { q: 'What is the sweet liquid before it ferments into beer?', a: ['Wort', 'Port', 'Sort', 'Gravy'] },
  { q: 'What is scrumpy, as served on Hopsend Isle?', a: ['Rough farmhouse cider', 'A kind of slime', 'A small hat', 'A pub quiz round'], if: 'v:hopsend' },
  { q: 'On which island does the Great Brewery stand?', a: ['Hopsend Isle', 'The Frostfields', 'Sunscar Sands', 'Mirewood'], if: 'v:hopsend' },
  { q: 'Which vessel went rogue in the Great Brewery?', a: ['The Mash Tun', 'The Kettle', 'The Teapot', 'Big Gary\'s dad'], if: 'v:brewery' },
  { q: 'Which two foes are, essentially, very large pints with feelings?', a: ['Big Gary and the Mash Tun', 'Morvath and the Titan', 'The Wyrm and the Sphinx', 'Brenna and Wendell'], if: 'mash_tun' },
  { q: 'The Mash Tun is made of copper and what else?', a: ['Oak', 'Pewter', 'Marshmallow', 'Gouda'], if: 'v:brewery' },
);
