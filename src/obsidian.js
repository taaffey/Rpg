// ===== The Obsidian Ruins: the seventh and last island (post-ending, tier 6, the true superboss). A tiny black-glass isle in the far
// south-east, reached by ferry only once the Margherita has fallen. It is what is left of The Last Orders, the legendary pub that stood
// here before the world was made, smashed into volcanic glass. The dungeon is the cellar and cellar-bar; its boss, the Landlord of the Void,
// has been shouting "TIME, GENTLEMEN, PLEASE" for ten thousand years because nobody ever left. Optional. Level cap 20 and the best gear.
// Side-effect module (like embers.js): imports from data.js and fills the shared objects. Map ids it expects (built in maps.js):
// 'port_o' and 'port_p' (jetty interiors; STORY.area plays on 'port_p'), 'obsidian' (the dungeon, theme 'cellar', generated rooms).
// Encounter tables: 'obsidian' (dungeon) and 'obsidian_isle' (overworld island, not wired yet).
// NPC givers: 'Obsidian ferryman' (lastorders), 'Kiosk owner' (glassware; shop 'last_orders_kiosk').
import { SKILLS, ENEMIES, ENCOUNTERS, DROPS, BOSSES, WEAPONS, ARMORS, ACCS, SHOPS, QUESTS, STORY, BESTIARY_NOTES, QUIZ } from './data.js';

const S = (name, mp, tgt, kind, pow, x = {}) => ({ name, mp, tgt, kind, pow, ...x });
const E = (name, icon, hp, atk, def, mag, spd, exp, gold, skills, x = {}) => ({ name, icon, hp, atk, def, mag, spd, exp, gold, skills, weak: [], res: [], ...x });
const D = (ck, cid, cp, rk, rid, rp) => ({ common: [ck, cid, cp], rare: [rk, rid, rp] });
const W = (name, type, atk, mag, sockets, price, innate, tier, desc, x = {}) => ({ name, type, atk, mag, sockets, price, innate, tier, desc, ...x });
const C = (s, t) => ({ s, t });

// ---------------------------------------------------------------- enemy skills (enemy-only, silly names)
Object.assign(SKILLS, {
  obshards: S('Shard Volley', 0, 'all', 'mag', 0.75, { elem: 'bolt' }),
  obsparks: S('Glass Spark Flick', 0, 'one', 'mag', 1.5, { elem: 'fire' }),
  obfang: S('Glass Fang Snap', 0, 'one', 'phys', 1.4, { pierce: 0.3 }),
  obgrin: S('Razor Grin', 0, 'one', 'phys', 1.1, { fx: ['poison'] }),
  obhowl: S('Shattering Howl', 0, 'all', 'phys', 0.65, { fx: ['slow'] }),
  obmeasure: S('Double Measure', 0, 'one', 'mag', 1.5, { fx: ['poison'] }),
  obneat: S('Neat Pour', 0, 'one', 'mag', 1.7, { elem: 'fire' }),
  obspill: S('Spirit Spill', 0, 'all', 'mag', 0.8, { fx: ['slow'] }),
  obstool: S('Barstool Swing', 0, 'one', 'phys', 1.45),
  obusual: S('The Usual', 0, 'self', 'buff', 0, { fx: ['atkup'] }),
  obstory: S('Same Old Story', 0, 'all', 'mag', 0.75, { elem: 'dark', fx: ['slow'] }),
  obshoes: S('Not in Those Shoes', 0, 'one', 'phys', 1.8),
  obrope: S('Velvet Rope Lash', 0, 'one', 'phys', 1.2, { fx: ['slow'] }),
  obpolicy: S('Door Policy Shove', 0, 'self', 'buff', 0, { fx: ['defup'] }),
  obeject: S('Ejection Seat', 0, 'one', 'phys', 2.0),
  obfinalcall: S('Final Call', 0, 'one', 'mag', 1.6, { elem: 'dark' }),
  obtimewail: S('Time Wail', 0, 'all', 'mag', 0.85, { elem: 'dark', fx: ['slow'] }),
  obbrine: S('Pickle Juice Splash', 0, 'all', 'mag', 0.8, { fx: ['poison'] }),
  objarlid: S('Jar Lid Slam', 0, 'one', 'phys', 1.6),
  obburp: S('Eggy Burp', 0, 'all', 'mag', 0.7, { elem: 'dark', fx: ['poison'] }),
  obballad: S('Power Ballad', 0, 'all', 'mag', 0.9, { elem: 'bolt' }),
  obscreech: S('Off-Key Screech', 0, 'one', 'mag', 1.6, { elem: 'bolt', stun: 0.25 }),
  obencore: S('Encore!', 0, 'self', 'buff', 0, { fx: ['atkup'] }),
  obwail: S('Last Karaoke Wail', 0, 'all', 'mag', 1.0, { elem: 'dark' }),
  // the Landlord of the Void
  pullpint: S('Pull a Pint', 0, 'one', 'phys', 1.7),
  spiltpint: S('Spilt Pint', 0, 'all', 'mag', 0.8, { fx: ['slow'] }),
  bartab: S('Bar Tab', 0, 'one', 'mag', 1.5, { elem: 'dark', fx: ['drain'] }),
  barred: S('You Are Barred', 0, 'one', 'phys', 1.2, { stun: 0.3 }),
  timegents: S('Time Gentlemen', 0, 'all', 'buff', 0, { fx: ['slow'], hostile: true }),
  lockin: S('Lock-In', 0, 'all', 'buff', 0, { fx: ['poison'], hostile: true }),
  bellwind: S('Reaching for the Bell', 0, 'self', 'buff', 0, { fx: ['atkup'] }),
  lastbell: S('LAST ORDERS BELL', 0, 'all', 'mag', 1.3, { elem: 'dark' }),
  finalround: S('Final Round Slam', 0, 'one', 'phys', 2.2),
  staffdrink: S('Staff Drink', 0, 'self', 'heal', 3.0, { fx: ['atkup', 'defup'] }), // only picked below 60% HP: the Landlord's last, loudest round
});

// ---------------------------------------------------------------- enemies (Lv 20, tier 6: tougher than Cinder Isle)
Object.assign(ENEMIES, {
  ob_shard_imp: E('Obsidian Shard Imp', '👹', 1100, 28, 24, 128, 17, 420, 200, [['obsparks', 2], ['obshards', 2], ['tackle', 1]], { weak: ['bolt'], res: ['fire'] }),
  ob_glass_hound: E('Razor-Glass Hound', '🐺', 1500, 140, 30, 24, 21, 440, 210, [['obfang', 2], ['obgrin', 2], ['obhowl', 1]], { weak: ['fire'], res: ['ice'] }),
  ob_spirit_optic: E('Haunted Spirit Optic', '🍾', 1050, 40, 20, 118, 12, 430, 210, [['obmeasure', 2], ['obneat', 2], ['obspill', 1]], { weak: ['fire', 'holy'], res: ['dark'] }),
  ob_ghost_regular: E('Barstool Regular Ghost', '👻', 1250, 112, 24, 100, 13, 450, 220, [['obstool', 2], ['obstory', 2], ['obusual', 1], ['draintouch', 1]], { weak: ['holy'], res: ['dark'] }),
  ob_bouncer_golem: E('Ancient Bouncer Golem', '🗿', 2000, 132, 42, 8, 5, 560, 280, [['obshoes', 2], ['obeject', 1], ['obrope', 1], ['obpolicy', 1]], { weak: ['bolt'], res: ['fire', 'ice'], cp: 5 }),
  ob_last_orders_wraith: E('Time Gentlemen Wraith', '👻', 1250, 55, 20, 132, 18, 520, 270, [['obfinalcall', 2], ['obtimewail', 2], ['draintouch', 1]], { weak: ['holy', 'fire'], res: ['dark'], cp: 5 }),
  ob_pickled_egg: E('Pickled Egg Horror', '🥚', 1700, 108, 34, 90, 8, 470, 240, [['objarlid', 2], ['obbrine', 2], ['obburp', 1]], { weak: ['fire'], res: ['dark'] }),
  ob_karaoke_banshee_x: E('Last Karaoke Banshee', '🎤', 1300, 60, 22, 135, 19, 540, 280, [['obballad', 2], ['obscreech', 2], ['obwail', 1], ['obencore', 1]], { weak: ['bolt'], res: ['dark'], cp: 5 }),
  landlord: E('Landlord of the Void', '🔔', 12000, 145, 40, 145, 14, 12000, 9000, [['pullpint', 3], ['spiltpint', 2], ['bartab', 2], ['barred', 2], ['finalround', 1], ['lastbell', 2], ['bellwind', 2], ['timegents', 1], ['lockin', 1], ['staffdrink', 3]], { weak: ['holy', 'bolt'], res: ['dark', 'fire'], boss: true, cp: 20 }),
});
ENCOUNTERS.obsidian = [['ob_shard_imp', 'ob_shard_imp'], ['ob_glass_hound', 'ob_glass_hound'], ['ob_spirit_optic', 'ob_ghost_regular'], ['ob_pickled_egg', 'ob_shard_imp', 'ob_spirit_optic'], ['ob_ghost_regular', 'ob_ghost_regular', 'ob_spirit_optic'], ['ob_bouncer_golem', 'ob_glass_hound'], ['ob_last_orders_wraith', 'ob_karaoke_banshee_x'], ['ob_bouncer_golem', 'ob_karaoke_banshee_x']];
ENCOUNTERS.obsidian_isle = [['ob_shard_imp'], ['ob_glass_hound', 'ob_glass_hound'], ['ob_pickled_egg'], ['ob_spirit_optic', 'ob_spirit_optic'], ['ob_ghost_regular', 'ob_shard_imp'], ['ob_bouncer_golem']];

BOSSES.landlord = { name: 'Landlord of the Void', intro: 'A clock-haloed ghost looms: "TIME, GENTLEMEN, PLEASE!" Devon: "Bro, it has said that for ten thousand years."', optional: true, loot: { weapons: ['last_orders_cleaver'], armors: ['landlord_waistcoat'], accs: ['bell_of_last_orders'], items: { potion: 4 } } };

// ---------------------------------------------------------------- gear (the best in the game; the Bell is boss loot)
Object.assign(WEAPONS, {
  brass_rail: W('Brass Rail Bat', 'sword', 46, 0, 3, 4400, 'guard', 5, 'A bar rail, polished by a thousand elbows. Crits, and shrugs off a bar fight. Slightly sticky.', { crit: 0.12, def: 5, spd: 1 }),
  fruit_machine: W('Fruit Machine Slingshot', 'bow', 42, 0, 3, 4400, 'bolt', 5, 'Fires pound coins in a flash of bolt, ignoring armour. Jackpot lights on. The house always wins.', { elem: 'bolt', pierce: 0.25, spd: 4 }),
  beermat_knuckles: W('Beer Mat Knuckledusters', 'fists', 38, 0, 3, 4200, 'vamp', 5, 'Two stacks of laminated beer mats. Punches twice and drinks in the damage. Sticky, branded, free.', { hits: 2, def: 7, hp: 40 }),
  licensing_act: W('The Licensing Act (Annotated)', 'tome', 3, 40, 3, 4600, 'focusg', 5, 'Forty pages of small print and a lot of lightning. More MP, a bit quicker. Section 9 is all in capitals.', { mp: 35, spd: 2, sig: 'tempest' }),
  hand_pump_staff: W('Cellarman\'s Hand Pump', 'staff', 5, 38, 3, 4600, 'siphon', 5, 'A long brass beer pump. Heals by 35% more, and every pull is a round for the house. Mind the drips.', { mp: 35, heal: 0.35, sig: 'cureall' }),
  last_orders_cleaver: W('Last Orders Cleaver', 'katana', 52, 0, 3, 0, 'execute', 5, 'The Landlord\'s own carving knife. Crits a lot, finishes the weak, and carves a Sunday joint in one swing.', { crit: 0.25, spd: 4, sig: 'zanshin' }),
});
Object.assign(ARMORS, {
  bouncer_parka: { name: 'Bouncer\'s Winter Parka', desc: 'Resists dark. Padded to the chin and radiates "not tonight, lads". Nobody argues with a hood.', def: 46, hp: 70, spd: -1, res: ['dark'], sockets: 3, price: 4800 },
  landlord_waistcoat: { name: 'Landlord\'s Waistcoat', desc: 'Resists dark. Fifty pockets, forty of them for coins. Smells of ten thousand years of Friday nights.', def: 52, hp: 80, mag: 8, mp: 20, res: ['dark'], sockets: 3, price: 0 },
});
Object.assign(ACCS, {
  egg_charm: { name: 'Pickled Egg Lucky Charm', desc: 'More attack and HP. Smells of vinegar. Lucky for you, less so for the egg.', atk: 6, hp: 55, def: 4, sockets: 1, price: 2300 },
  optic_ring: { name: 'Spirit Optic Shot Ring', desc: 'More magic, MP and speed. Pours exactly 25ml of power. Not a drop wasted.', mag: 10, mp: 30, spd: 3, sockets: 2, price: 2500 },
  bell_of_last_orders: { name: 'Bell of Last Orders', desc: '+10 to every stat, +80 HP and +40 MP. Ring it, and everyone gets one more round. Never ring it at closing.', atk: 10, def: 10, mag: 10, spd: 10, hp: 80, mp: 40, res: ['dark'], sockets: 3, price: 0 },
});

// ---------------------------------------------------------------- the kiosk (a stall in the jetty hall)
Object.assign(SHOPS, {
  last_orders_kiosk: { title: '🍺 The Last Orders Kiosk', greet: 'Ten thousand years, same stock. Everything is fresh, I promise. Time is a flat circle with a bar.', stock: { items: ['hipotion', 'ether', 'megaether', 'phoenix', 'antidote', 'remedy', 'elixir'], gems: ['fire', 'frost', 'bolt', 'holy', 'shadow', 'chain', 'echo', 'vamp', 'pierce', 'thrifty', 'overcharge', 'wide', 'guard', 'crit', 'swift', 'focusg'], weapons: ['brass_rail', 'fruit_machine', 'beermat_knuckles', 'licensing_act', 'hand_pump_staff'], armors: ['bouncer_parka'], accs: ['egg_charm', 'optic_ring', 'socket_jewel'] } },
});

// ---------------------------------------------------------------- drops
Object.assign(DROPS, {
  ob_shard_imp: D('items', 'megaether', 0.25, 'accs', 'optic_ring', 0.05), ob_glass_hound: D('items', 'elixir', 0.2, 'weapons', 'fruit_machine', 0.04),
  ob_spirit_optic: D('items', 'megaether', 0.25, 'gems', 'overcharge', 0.06), ob_ghost_regular: D('items', 'phoenix', 0.2, 'accs', 'egg_charm', 0.05),
  ob_bouncer_golem: D('items', 'elixir', 0.3, 'armors', 'bouncer_parka', 0.04), ob_last_orders_wraith: D('items', 'phoenix', 0.2, 'gems', 'echo', 0.07),
  ob_pickled_egg: D('items', 'elixir', 0.25, 'weapons', 'beermat_knuckles', 0.04), ob_karaoke_banshee_x: D('items', 'megaether', 0.25, 'weapons', 'licensing_act', 0.04),
  landlord: D('items', 'elixir', 1, 'accs', 'optic_ring', 0.5),
});

// ---------------------------------------------------------------- quests (giver names match the NPCs placed in maps.js)
Object.assign(QUESTS, {
  lastorders: { title: 'Time, Gentlemen, Please', giver: 'Obsidian ferryman', goal: { type: 'boss', id: 'landlord' }, reward: { gold: 9000, gems: ['execute', 'overcharge'], items: { elixir: 6, megaether: 4 } },
    lines: { offer: ['That black rock is not a rock, lads. It is a pub. THE pub. The Last Orders, older than the hills, and he is still in there.', 'The Landlord of the Void. Ten thousand years of "time, gentlemen, please", and nobody ever left. Holy and bolts hurt him; dark does nothing. Bring your very best, and a lot of Sunday roasts.'], active: ['The Obsidian Ruins, the cellar-bar of the Last Orders. The Landlord shrugs off dark and fire. Holy and bolts, lads, and heal early.'], ready: ['He let you go? And YOU let HIM go? Ten thousand years, and he finally got to lock up. Here, the purse is yours. Mind the step.'], done: ['The bell rings once, every evening now. Then silence. Lovely.'] } },
  glassware: { title: 'Glassware Collection', giver: 'Kiosk owner', goal: { type: 'kill', ids: ['ob_spirit_optic'], n: 10 }, reward: { gold: 3500, gems: ['wide'], items: { megaether: 3, elixir: 2 } },
    lines: { offer: ['The optics down in the cellar have gone upside down and started pouring themselves at the customers. Triple measures, all day. Nobody asked for that.', 'Ten haunted spirit optics, please. Fire pops them and holy settles them. Break them all and I will stand you a round, and a bit of coin.'], active: ['Ten haunted spirit optics, down in the cellar. Fire pops them, holy settles them. Mind the double measure, it poisons.'], ready: ['Ten bottles popped and not one spilt! Well. Several spilt. Here is your coin, and thanks.'], done: ['The optics are back on the wall. Mostly right way up.'] } },
});

// ---------------------------------------------------------------- bestiary field notes (<= 100 chars)
Object.assign(BESTIARY_NOTES, {
  ob_shard_imp: ['devon', 'Pointy lad, bro! Bolts shatter him. Fire does nothing. His shards hit everyone at once.'],
  ob_glass_hound: ['adam', 'Fast, and sharp all over. Fire cracks it, ice does not. The grin poisons, the howl slows.'],
  ob_spirit_optic: ['brenna', 'An optic pouring itself. Fire or holy. Dark does nothing. The double measure poisons.'],
  ob_ghost_regular: ['wendell', 'A regular who never went home! Holy sends him off. Dark does not. He keeps his stool.'],
  ob_bouncer_golem: ['adam', 'Black glass and a bad attitude. Bolts crack it, fire and ice do not. The ejection hurts.'],
  ob_last_orders_wraith: ['brenna', 'Rings the bell for last orders. Holy or fire. Dark does nothing. Wails slow us all.'],
  ob_pickled_egg: ['devon', 'It is an egg in a jar and it is MAD, bro. Fire helps. The brine poisons us all.'],
  ob_karaoke_banshee_x: ['adam', 'A power ballad that never ends. Bolts shut her up. The screech can stun. Earplugs.'],
  landlord: ['adam', 'Holy and bolts hurt. Dark and fire do not. He rings the bell, slows us, then really swings.'],
});

// ---------------------------------------------------------------- story: first arrival at the jetty and the Ruins
STORY.cast.oldlandlord = ['Old Landlord', 'barkeep'];
Object.assign(STORY.area, {
  port_p: [
    { s: 'n', t: 'The ferry noses up to a jetty of black glass. Beyond it, a low island of shining rock, and a faint smell of stale beer that has been stale for ever.' },
    { s: 'devon', t: 'Bro. The whole island is a SPARKLY BLACK PINT GLASS.' },
    { s: 'adam', t: 'Obsidian. Volcanic glass. The ferryman says it was a pub, once.' },
    { s: 'brenna', t: 'The whole isle? That is some pub.', if: 'p:brenna' },
    { s: 'wendell', t: 'A tavern older than the world! I shall have a small sherry.', if: 'p:wendell' },
    { s: 'n', t: 'Somewhere under the glass, very faintly, a bell rings once and a distant voice shouts a very old, very bored shout.' },
  ],
  obsidian: [
    { s: 'n', t: 'Stairs of black glass lead down into a cellar. Barrels, casks and optic bottles are fused into the walls, and a thousand amber lamps still burn.' },
    { s: 'devon', t: 'It is a PUB, bro. A pub in a volcano that is also a pub. I am so in.' },
    { s: 'adam', t: 'The Last Orders. It stood here before the world was made. Whatever ended it, it ended all at once.' },
    { s: 'brenna', t: 'The beer pipes are still wet. That is not normal. Nothing here is normal.', if: 'p:brenna' },
    { s: 'wendell', t: 'A pub frozen in glass! Think of the unpaid tabs!', if: 'p:wendell' },
    { s: 'n', t: 'Far above, a huge clock ticks once. It reads one minute to eleven. It has read that for as long as anyone can say.' },
    { s: 'devon', t: 'Is that a ghost with a hand pump for an arm?' },
    { s: 'adam', t: 'Stay together. Whatever you do, do not order a drink.' },
  ],
});
STORY.after.landlord = [
  { s: 'n', t: 'The Landlord sags. The hand pull droops, the clock face flickers, and the great spectral shoulders let go of ten thousand years of bar rail.' },
  { s: 'oldlandlord', t: '...Time, gentlemen. Please.' },
  { s: 'devon', t: 'Bro, he said it quietly this time. Like he meant it.' },
  { s: 'oldlandlord', t: 'Nobody ever left. I kept calling and kept calling, and nobody ever left. You did. You came, and you fought, and you are leaving. That is all I wanted.' },
  { s: 'adam', t: 'Then lock up, and go home. You have earned it.' },
  { s: 'oldlandlord', t: 'Home. I had one, once. Right. Let me do the lights.' },
  { s: 'n', t: 'The ghost slides a row of foaming pints across the bar. One for each of you. The amber light is warm as a kitchen at midnight.' },
  { s: 'devon', t: 'A pint on the house. The first free pint in history, bro.' },
  { s: 'brenna', t: 'He is not charging us? Marry me, ghost.', if: 'p:brenna' },
  { s: 'wendell', t: 'Cheers, good landlord! I shall toast the lot of you with a small sherry!', if: 'p:wendell' },
  { s: 'n', t: 'The ghost drifts toward the clock. His shape thins into amber light, and the hand pull sinks into the bar like an arm folding for the night.' },
  { s: 'n', t: 'The clock ticks over to eleven, and a single bell rings out, long and clear. Then, for the first time in ten thousand years, the pub is quiet.' },
  { s: 'adam', t: 'Goodnight, landlord.' },
];

// ---------------------------------------------------------------- party chat
STORY.chat.push(
  { id: 'port_p_arrive', at: 'port_p', lines: [C('devon', 'Bro, the jetty is MADE of black glass. I can see my own face in it.'), C('adam', 'I know. You have been pulling it for a full minute.'), C('devon', 'Looking good, Adam. Looking SO good.')] },
  { id: 'ruins_cellar', at: 'obsidian', if: '!landlord', lines: [C('devon', 'This is the best pub I have ever been in. And I have been in a LOT of pubs.'), C('adam', 'It is a ruin. Every barrel is full of glass.'), C('devon', 'Full of ATMOSPHERE, Adam.')] },
  { id: 'ruins_clock', at: 'obsidian', if: 'v:obsidian !landlord', lines: [C('devon', 'The clock says 10:59. It has said 10:59 for ever.'), C('adam', 'Then last orders are not called yet.'), C('devon', 'So I can order a pint?'), C('adam', 'The man on the other side of that bar would not allow it.')] },
  { id: 'ruins_brenna', at: 'obsidian', if: 'p:brenna !landlord', lines: [C('brenna', 'Ten thousand years behind the same bar. I have done a Sunday shift like that.'), C('adam', 'You have a job? In a pub?'), C('brenna', 'I have had worse landlords. Not many. The ghost is almost fair.')] },
  { id: 'ruins_wendell', at: 'obsidian', if: 'p:wendell !landlord', lines: [C('wendell', 'In my youth, I served on a pub quiz team. We were known as the Knights of the Round Table.'), C('devon', 'Round Table. Brilliant.'), C('wendell', 'Wet round table. We came last every week. It is still the proudest moment of my life.')] },
  { id: 'landlord_after', if: 'landlord', lines: [C('devon', 'We beat the first and last landlord, bro. The final boss of drinks.'), C('adam', 'He was lonely, Dev.'), C('devon', 'He had a clock halo, Adam. He had a hand pump for an arm. He was FINE.'), C('adam', 'We gave a ghost his last orders. Let that be enough.')] },
);

// ---------------------------------------------------------------- pub quiz
QUIZ.push(
  { q: 'What is the name of the ruined pub that stood on the Obsidian Ruins before the world was made?', a: ['The Last Orders', 'The Black Bottle', 'The Void & Anvil', 'The Glass Goose'], if: 'v:obsidian' },
  { q: 'What time does the clock on the Obsidian Ruins always say?', a: ['10:59', '11:00', '12:01', '9:15'], if: 'v:obsidian' },
  { q: 'What is obsidian?', a: ['Volcanic glass', 'A black granite', 'A kind of coal', 'Frozen smoke'], if: 'v:obsidian' },
  { q: 'What does a pub landlord traditionally call at closing time?', a: ['Time, gentlemen, please', 'Order! Order!', 'Last dance', 'Everybody out'], if: 'v:obsidian' },
  { q: 'What does the Landlord of the Void have in place of one arm?', a: ['A hand pull', 'A dartboard', 'A bar stool', 'A tea towel'], if: 'v:obsidian' },
  { q: 'Which two elements hurt the Landlord of the Void the most?', a: ['Holy and bolt', 'Dark and fire', 'Ice and fire', 'Dark and bolt'], if: 'landlord' },
  { q: 'What did the Landlord give the heroes after he let go?', a: ['A pint on the house', 'A round of darts', 'A signed menu', 'A pub quiz trophy'], if: 'landlord' },
  { q: 'What upside-down bottles with measures hang on a pub back wall?', a: ['Optics', 'Pourers', 'Taps', 'Bungs'], if: 'v:obsidian' },
);
