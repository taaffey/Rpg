// ===== World definition: maps, portals, NPCs, chests, bosses =====
// Tile legend (visual + rules):
//   outdoor: . grass  , snow  : swamp  d desert  _ path  = bridge  ~ water  r river  T/t tree  M mountain  B rockslide(gate)  H town  D dungeon
//   town/interior: . floor  # wall  H door  E exit  C chest      dungeon: . floor  # wall  E exit  C chest  X boss
// Anything not listed in WALK blocks movement. Portals/NPCs/decor/chests live in per-map lists keyed by coordinates.
// NPC text: text = default lines; textBy = [[condition, lines], ...] checked in order, first match wins (conditions: see STORY
// in data.js, e.g. 'wyrm !lich', 's:met', 'titan'; '@base' inside lines = the default text). The world reacts to the story this way.
import { GEN } from './mapgen.js';

export const WALK = new Set(['.', ',', ':', 'd', '_', '=', 'H', 'D', 'E', 'X']); // d = overworld desert; towns add: b building, F fountain, G grave (all solid)
export const MAPS = {};
const portal = (to, x, y) => ({ to, x, y });
const P = (x, y) => `${x},${y}`;

// ---------------------------------------------------------------- interiors
function interior(id, name, kind, back, opts = {}) {
  const w = 11, h = 8, rows = [];
  for (let y = 0; y < h; y++) rows.push(y === 0 || y === h - 1 ? '#'.repeat(w) : '#' + '.'.repeat(w - 2) + '#');
  rows[h - 1] = '#####E#####';
  const decor = [], npcs = [], counter = () => decor.push([4, 3, 'counter'], [6, 3, 'counter']);
  const shelves = () => { for (const x of [1, 2, 3, 7, 8, 9]) decor.push([x, 1, 'shelf']); };
  if (kind === 'inn') { for (const x of [1, 2, 8, 9]) decor.push([x, 1, 'bed']); decor.push([2, 4, 'table'], [8, 4, 'table'], [1, 6, 'barrel'], [9, 6, 'barrel']); counter(); npcs.push({ x: 5, y: 3, type: 'innkeeper', name: 'Innkeeper', service: 'inn', cost: opts.cost || 25, ...opts.inn }); } // inn: { text, textBy } greeting
  if (kind === 'general') { shelves(); decor.push([1, 5, 'barrel'], [9, 5, 'barrel'], [2, 6, 'barrel']); counter(); npcs.push({ x: 5, y: 3, type: 'merchant', name: 'Merchant', service: 'shop', shop: opts.shop }); }
  if (kind === 'smith') { decor.push([1, 1, 'anvil'], [3, 1, 'shelf'], [7, 1, 'shelf'], [9, 1, 'anvil'], [1, 5, 'barrel'], [9, 5, 'barrel']); counter(); npcs.push({ x: 5, y: 3, type: 'smith', name: 'Smith', service: 'shop', shop: opts.shop }); npcs.push({ x: 8, y: 4, type: 'merchant', name: 'Gem-wright', service: 'socketer' }); }
  if (kind === 'guild') { decor.push([2, 1, 'banner'], [5, 1, 'banner'], [8, 1, 'banner'], [2, 5, 'table'], [8, 5, 'table']); counter(); npcs.push({ x: 5, y: 3, type: 'guildmaster', name: 'Guildmaster', service: 'guild' }); }
  if (kind === 'house') { decor.push([1, 1, 'bed'], [9, 1, 'shelf'], [8, 1, 'shelf'], [5, 5, 'table'], [1, 5, 'barrel']); }
  for (const n of opts.npcs || []) npcs.push(n);
  MAPS[id] = { name, kind: 'interior', theme: back.theme || 'interior', music: back.music || 'town', rows, spawn: { x: 5, y: 6 }, portals: { [P(5, 7)]: portal(back.map, back.x, back.y) }, decor, npcs, chests: {} };
  if (opts.chest) { const [cx, cy, loot] = opts.chest; const r = [...rows[cy]]; r[cx] = 'C'; rows[cy] = r.join(''); MAPS[id].chests[P(cx, cy)] = loot; }
}

// ---------------------------------------------------------------- 16-bit town builder (art in townart.js)
// art: one string per row of ground / structure chars
//   . grass (snow / moss)  _ street (boardwalk in Mirewood)  : plaza  , dirt  ~ water  = dock / bridge  # stone wall
//   T tree  t pine  h hedge  f fence  w flower bed  F fountain / centrepiece  E exit to the world map
// buildings: [x, y, w, h, kind, doorCol, interiorId]: footprint w x h tiles ('b'), door 'H' at (x+doorCol, y+h-1);
//   the roof is drawn up to one tile above the footprint, so leave the row above it free of tall things.
// props: [kind, x, y, opts?] decoration; kinds in PROP_FOOT also stamp solid 'p' tiles over their footprint.
// The art (before stamping) is kept as `base` so the renderer knows what ground lies under buildings and props.
const PROP_FOOT = { stall: [3, 2], lamp: [1, 1], barrel: [1, 1], barrels: [2, 1], crate: [1, 1], crates: [2, 1], sacks: [1, 1], bench: [2, 1], well: [2, 2], cart: [2, 1], snowman: [1, 1], logs: [2, 1], pot: [1, 1], board: [1, 1], hay: [1, 1], statue: [1, 1], totem: [1, 1], sled: [2, 1], reeds: [1, 1], nets: [2, 1] };
function town(art, buildings, props = []) {
  const g = art.map((r) => [...r]), doors = {};
  for (const [x, y, w, h, , dc, to] of buildings) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = 'b';
    g[y + h - 1][x + dc] = 'H'; doors[to] = [x + dc, y + h - 1];
  }
  for (const [k, x, y] of props) { const f = PROP_FOOT[k]; if (f) for (let j = y; j < y + f[1]; j++) for (let i = x; i < x + f[0]; i++) g[j][i] = 'p'; }
  return { rows: g.map((r) => r.join('')), base: art, doors, props: props.map(([k, x, y, o = {}]) => ({ k, x, y, ...o })),
    buildings: buildings.map(([x, y, w, h, kind, door, to]) => ({ x, y, w, h, kind, door, to })) };
}
const TOWNS = {
  haven: town([
    '~~~~~~TTTTT#############TTTTTTTTTT',
    '~~~~~~TTTTT#############TTTTTTTTTT',
    '~~~~~~TTTTT#############TTTTTTTTTT',
    '~~~~~~__T..#############T.......TT',
    '~~~~~~_T.T.#############..T.T...TT',
    '~~~~~~__......_______.........T.TT',
    '~==~~~__......_______...........TT',
    '~==~~~__.......w___ww...........TT',
    '~=====__.......w___............TTT',
    '~==~~~__........___.............TT',
    '~==~~~__........___.............TT',
    '~~~~~~__________________________TT',
    '~~~~~~__________________________TT',
    '~~~~~~__....:::::::::::________.TT',
    '~~~~~~__....:::::::::::________.TT',
    '~~~~~~__....:::::::::::________.TT',
    '~~~~~~__....::::FFF::::.h.......TT',
    '~~~~~~__....::::FFF::::wh.......TT',
    '~~~~~~______::::FFF::::wh.......TT',
    '~~====__....:::::::::::.h.......TT',
    '~~====__.T..:::::::::::.h.......TT',
    '~~~~~~__ww..:::::::::::_________TT',
    '~~~~~~__________________________TT',
    '~~~~~~__........___.......ffffffTT',
    '~~~~~~__.....T..___.......f,,,,fTT',
    '~~~~~~__.......T___T.....Tf,,,,fTT',
    '~~~~~~__.....ww.___.......f,,,,fTT',
    '~~~===__........___.......f,,,,fTT',
    '~~~~~~____________________f,,,,fTT',
    '~~~~~~__hhhh....___.www...ffffffTT',
    '~~~~~~__.T....T.___...T.T.......TT',
    '~~~~~~__...T....___........hhhh.TT',
    '~~~~~~##########___#############TT',
    '~~~~~~##########EEE#############TT'],
  [[8, 6, 7, 5, 'inn', 3, 'haven_inn'], [21, 6, 7, 5, 'guild', 3, 'haven_guild'], [8, 14, 4, 4, 'shop', 2, 'haven_shop'], [25, 16, 7, 5, 'smith', 2, 'haven_smith'],
    [8, 24, 5, 4, 'house', 2, 'haven_cottage'], [20, 24, 5, 4, 'house', 2, 'haven_elder']],
  [['castle', 11, 0], ['stall', 23, 13, { c: 'red' }], ['stall', 27, 13, { c: 'blue' }], ['lamp', 15, 9], ['lamp', 19, 9], ['lamp', 12, 13], ['lamp', 22, 13], ['lamp', 12, 21], ['lamp', 22, 21],
    ['barrels', 7, 4], ['crates', 6, 14], ['barrel', 7, 21], ['bench', 13, 19], ['bench', 20, 19], ['pen', 27, 24, { w: 4, h: 5, n: 4 }], ['hay', 30, 24],
    ['boat', 3, 10], ['boat', 2, 24], ['ship', 0, 13], ['arch', 16, 32, { w: 3 }], ['barrel', 7, 16], ['crate', 7, 25], ['sacks', 30, 15], ['board', 13, 12], ['pot', 20, 22], ['pot', 14, 23]]),
  frostholm: town([
    'tttttttttttttttttttttttttttttt',
    'tttttttttttttttttttttttttttttt',
    'tt........t........t........tt',
    'tt..........................tt',
    'tt..................t.......tt',
    'tt..........................tt',
    'tt..........................tt',
    'tt............._............tt',
    'tt__________________________tt',
    'tt__________________________tt',
    'ttthhhh.......__.......hhhh.tt',
    'tt........::::::::::.......ttt',
    'tt.......t::::::::::t.......tt',
    'tt........:::FFF::::........tt',
    'tt........:::FFF::::........tt',
    'tt........:::FFF::::........tt',
    'tt________::::::::::________tt',
    'tt......t.::::::::::........tt',
    'tt........::::::::::.t......tt',
    'tt.~~~~~......__..........t.tt',
    'tt.~~~~~______________......tt',
    'tt.~~~~~......__............tt',
    'tt.~~~~~......__........t...tt',
    'tt.......t....__....t.......tt',
    'tt.t.......t..__..t.........tt',
    'tt............__............tt',
    'tt############__############tt',
    'tt############EE############tt'],
  [[3, 3, 7, 5, 'inn', 3, 'frost_inn'], [12, 2, 7, 5, 'guild', 3, 'frost_guild'], [21, 3, 6, 5, 'smith', 2, 'frost_smith'], [3, 12, 5, 4, 'shop', 2, 'frost_shop'], [22, 12, 5, 4, 'house', 2, 'frost_house']],
  [['lamp', 10, 11], ['lamp', 19, 11], ['lamp', 13, 25], ['lamp', 16, 25], ['snowman', 6, 18], ['logs', 8, 6], ['sled', 24, 17], ['barrel', 27, 9], ['arch', 14, 26, { w: 2 }]]),
  mirewood: town([
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'T............................T',
    'T~~~~~~~~~~~~~~~~~~~~~~~~~~~~T',
    'T~~~~~~~~~~~~~~~~~~~~~~~~~~~~T',
    'T~~~~~~~~~~~~~~~~~~~~~~~~~~~~T',
    'T~~~~~~~~~~~~~~~~~~~~~~~~~~~~T',
    'T~~~~~~~~~~~~~_~~~~~~~~~~~~~~T',
    'T~__________________________~T',
    'T~~~~~~~~~~~~~__~~~~~~~~~~~T~T',
    'T~~~~~~~~~~~~~__~~~~~~~~~~~~~T',
    'T~~~~~~~~~.T......T.~~~~~~~~~T',
    'TT~~~~~~~~..ww......~T~~~~~~~T',
    'T~~~~~~~T~...FFF....~~~~~~~~~T',
    'T~~~~~~~~~...FFF....~~~~~~~~~T',
    'T~~~~~~~~~...FFF....~~~~~~~~~T',
    'T~~~~~~~~~.......wT.~~~~~~~~~T',
    'T~~~~~~~~~..........~~~~~~~~~T',
    'T~~~~~~~~~~~~~__~~~~~~~~~~~~~T',
    'T~~~~~~~~~~~~~__~~~~~~~_~~~~~T',
    'T~~~~~~~~~~~~~__~~~~~~~_~~~~~T',
    'T~~_______________________~~~T',
    'T~~~~~~~~~~~~~__~~~~~~......~T',
    'T......~~~~~~~__~~~~~~...T..~T',
    'T.T....~~T~~~~__~~~T~~......~T',
    'T......~~~~~~~__~~~~~~......~T',
    'T......~~~~~~~__~~~~~~~~~~~~~T',
    'T~~~~~~~~~~~~~EE~~~~~~~~~~~~~T'],
  [[3, 3, 7, 5, 'inn', 3, 'mire_inn'], [12, 3, 5, 4, 'shop', 2, 'mire_shop'], [20, 3, 7, 5, 'guild', 3, 'mire_guild'], [21, 15, 5, 4, 'house', 2, 'mire_house'], [3, 17, 4, 4, 'house', 2, 'mire_hut']],
  [['lamp', 10, 11], ['lamp', 19, 17], ['barrel', 12, 17], ['nets', 23, 22], ['boat', 8, 9], ['boat', 18, 25], ['reeds', 9, 16]]),
};

const back = (t, id, extra = {}) => { const [x, y] = TOWNS[t].doors[id]; return { map: t, x, y: y + 1, ...extra }; };
const doorPortals = (t) => Object.fromEntries(Object.entries(TOWNS[t].doors).map(([id, [x, y]]) => [P(x, y), portal(id, 5, 6)]));

// ---------------------------------------------------------------- Haven Town
MAPS.haven = {
  name: 'Haven Town', kind: 'town', theme: 'town', music: 'town', rows: TOWNS.haven.rows, base: TOWNS.haven.base, buildings: TOWNS.haven.buildings, props: TOWNS.haven.props, spawn: { x: 17, y: 32 },
  portals: { [P(16, 33)]: portal('world', 7, 21), [P(17, 33)]: portal('world', 7, 21), [P(18, 33)]: portal('world', 7, 21), ...doorPortals('haven') },
  decor: [],
  npcs: [
    { x: 19, y: 31, type: 'guard', name: 'Guard', text: ['Oi, you two. Nice face-curtains. Don\'t walk out that gate empty-handed. The smithy is up the main street.', 'The Wyrm sleeps in the Ashen Cavern, east of here. Old songs say it hates the cold. Bring ice, lads.'],
      textBy: [['titan', ['Did you hear the old bell this morning? Nobody pulled the rope. Nobody. I\'ve had to have a little sit down.']],
        ['wyrm lich', ['The Wyrm AND the drowned king? I\'m standing up straighter. I\'ve also started a beard. Solidarity.']],
        ['wyrm', ['Whole watch heard the mountain roar, then go quiet. Was that you? Course it was. Look at the eyebrows on you.', 'Traders are already loading carts for the north road. The pass to Frostholm is open again.']],
        ['lich', ['Mirewood sent a boat of eels, in thanks for the Crypt. Eels! Who says thank you with eels?', 'The Wyrm\'s still in its cavern, mind. East. Bring ice.']]] },
    { x: 14, y: 15, type: 'villager', name: 'Villager', quest: 'slimes', text: ['The road north is blocked by a rockslide. They say the Wyrm\'s snoring shook the mountain loose.', 'Your ginger friend keeps waving a little black slate at the sky shouting "one bar, ONE BAR". Is he well?'],
      textBy: [['wyrm', ['The rockslide\'s gone! My cousin in Frostholm can visit at last. ...I\'m not sure that\'s good news.']]] },
    { x: 20, y: 18, type: 'kid', name: 'Child', textBy: [['titan', ['When I grow up I\'m going to have a beard like Adam\'s. Or Devon\'s. Devon\'s has a whole biscuit in it.', 'Psst... did you ever find my treasure box? Behind the castle, past the barrels by the old tree.']]], text: ['Mister! Is that a real beard or are you a bear? The ginger one says he\'s "half bear, bro".', 'Psst... I hid my treasure box behind the castle, past the barrels by the old tree. Don\'t tell!'] },
    { x: 15, y: 5, type: 'guard', name: 'Castle Guard', text: ['Halt! The castle is closed while the King holds council. No, you cannot "just pop in for a selfie".'],
      textBy: [['titan', ['The King would knight the pair of you, if you\'d stop pointing that slate at him.']], ['wyrm|lich', ['The King has heard of you. He says the realm is grateful.', '...The castle is still closed. Kings, eh.']]] },
    { x: 19, y: 5, type: 'guard', name: 'Castle Guard', text: ['Haven Castle has guarded this harbour for three hundred years. Since Gemforge\'s day.', 'And no, it does not have "Wi-Fi". Whatever you think that is, we haven\'t got it.'] },
    { x: 26, y: 12, type: 'villager2', name: 'Furrier', quest: 'wolves', text: ['Every hunt teaches you something. Change your calling and you keep what you learned; that is how the old heroes did it.', 'The neat-bearded one called it "transferable skills". Sounds like witchcraft to me.'] },
    { x: 10, y: 20, type: 'elder', name: 'Acolyte', quest: 'tombs', text: ['Light keep you, travellers. The temple tends Gemforge\'s grave. Someone leaves grey flowers on it every spring.', 'No, there is no gift shop. What is a gift shop? Why do you both look so sad about it?'],
      textBy: [['s:met', ['Sereth? The temple books name him: Gemforge\'s last apprentice, cast out for cutting a gem into his own heart.', 'That was three hundred years ago. No man lives so long. ...No man should. He also owes us three centuries of library fines.']],
        ['wyrm|lich', ['Chisel marks on the seals? Gemforge had an apprentice once. The books do not like to say his name.', 'The books are also offended that you called them "basically ancient PDFs".']]] },
    { x: 25, y: 23, type: 'villager', name: 'Huntress', quest: 'goldboar', text: ['Boar stew tonight, if my luck holds.', 'Your friend asked if I had "oat milk". I have oats. I have milk. I am not mixing them for you.'] },
    { x: 3, y: 8, type: 'fisher', name: 'Old Sailor', quest: 'corsair', text: ['Arr. Sixty years at sea, and now I just watch the gulls. Fine beards, lads. Proper sailor beards.'], textBy: [['titan', ['Gulls are back on the north wind. That\'s a good sign, that is.']]] },
  ],
  secrets: { [P(9, 3)]: { gold: 300, items: { phoenix: 2 }, accs: ['mana_charm'] } }, // tucked behind the castle wall
};
interior('haven_inn', 'The Gilded Goose', 'inn', back('haven', 'haven_inn'), { cost: 25, inn: { text: ['Welcome to the Gilded Goose. Rest your feet. That bell kept the whole street up. So did whoever shouted "SICK!"', 'Cellar\'s still sticky from Big Gary, mind. Brenna says that one\'s on you.'], textBy: [['titan', ['Your beds are aired and waiting, lads. Haven won\'t forget you. Neither will my cellar.']], ['wyrm|lich', ['Folk drink to you every night now. Good for business. Bad for my head, Brenna says.']]] },
  npcs: [{ x: 8, y: 5, type: 'villager', name: 'Patron', text: ['*hic* Is it quiz night? You two look like quiz night.', '*hic* The swamp south of town hides a Sunken Crypt. Dead men walking. Bring holy light!'], textBy: [['lich', ['*hic* To the heroes of the Crypt! ...What? Someone has to toast you. Your round, beardy.']]] }] });
interior('haven_shop', 'Haven Corner Store & Offy', 'general', back('haven', 'haven_shop'), { shop: 'haven_general' });
interior('haven_smith', 'Haven Hardware & Forge', 'smith', back('haven', 'haven_smith'), { shop: 'haven_smith' });
interior('haven_guild', 'Adventurer\'s Guild', 'guild', back('haven', 'haven_guild'));
interior('haven_elder', 'Elder\'s House', 'house', back('haven', 'haven_elder'), { npcs: [{ x: 4, y: 3, type: 'elder', name: 'Elder',
  text: ['I rang the bell for the heroes of legend. It sent me you two. I\'m not angry. I\'m just disappointed.', 'Gemforge used to say that gems hold more than power. They hold intent.', 'His held the Wyrm in the eastern hills, Morvath in his drowned crypt, and the Titan of the north.', 'Now the seals crack, one after another. Too neatly, for old stone. Put them right, and the bell may ring you home.'],
  textBy: [['titan', ['Adam. Devon. The bell rang on its own this morning. I think it was thanking you.', 'I may have misjudged you. Slightly. Don\'t let it go to your beards.']],
    ['s:met', ['Sereth lives? Then it was him all along.', 'If he wants the hearts, he must not have them. Whatever it costs.', 'And please stop calling him "Gandalf\'s accountant". I don\'t know who Gandalf is, but it\'s clearly working.']],
    ['wyrm|lich', ['Chisel marks on the seal? Then someone is cutting them.', 'Gemforge took an apprentice, near the end. Ask the acolyte. The temple keeps the old books.', 'No, Devon. You cannot "just Google it".']]] }] });
interior('haven_cottage', 'Fisher\'s Cottage', 'house', back('haven', 'haven_cottage'), { npcs: [{ x: 4, y: 3, type: 'fisher', name: 'Fisher', quest: 'heirloom', textBy: [['wyrm', ['Fish are biting again since the Wyrm went quiet. Funny, that.', 'Feel free to take what\'s in the chest. I\'ve no use for it.']]], text: ['Caught nothing today. The lakes are quiet. Your brother offered to "check the tide times". On a rock.', 'Feel free to take what\'s in the chest. I\'ve no use for it.'] }], chest: [9, 5, { gold: 150, items: { potion: 3 } }] });

// ---------------------------------------------------------------- Frostholm
MAPS.frostholm = {
  name: 'Frostholm', kind: 'town', theme: 'snowtown', music: 'frosttown', rows: TOWNS.frostholm.rows, base: TOWNS.frostholm.base, buildings: TOWNS.frostholm.buildings, props: TOWNS.frostholm.props, spawn: { x: 14, y: 26 },
  portals: { [P(14, 27)]: portal('world', 27, 9), [P(15, 27)]: portal('world', 27, 9), ...doorPortals('frostholm') },
  decor: [],
  npcs: [
    { x: 16, y: 25, type: 'guard', name: 'Guard', text: ['Frostholm owes you for that pass. Mind the cold; it bites harder than the wolves. ...Shorts, lad? SHORTS?', 'The Spire is north-east. The grey man went up a month ago. Nobody has seen him since.'],
      textBy: [['titan', ['The Spire\'s quiet. First quiet night in a year. Drink with us, heroes. Not you in the shorts; you\'ll freeze to the bench.']], ['s:met', ['So the grey man has a name. Sereth. I\'ll remember it, and spit after. "Gandalf\'s accountant", you say? I\'ll spit twice.']]] },
    { x: 21, y: 9, type: 'villager', name: 'Hunter', quest: 'yetis', text: ['Yetis and ice wolves roam the snow. Their hides are thick, but fire burns them well.', 'Fur from the forge keeps the frost out. Trust me. Your ginger friend\'s beard is doing a lot of heavy lifting.'], textBy: [['titan', ['Even the yetis seem calmer since the Titan fell. Fewer of them, too. Your doing?']]] },
    { x: 11, y: 17, type: 'kid', name: 'Child', text: ['I tried an Awkward Silence Gem on my snowball throw. Worked great! ...Mum says not to tell.', 'Is it true your hat is called a "beanie"? I\'m calling my goat Beanie.'] },
    { x: 20, y: 18, type: 'villager2', name: 'Prospector', quest: 'crystalgolem', text: ['Frostholm sits on a fortune in crystal, if you know where to dig. Not "crypto". Crystal. Real rocks you can hold.', 'Old trappers used to stash their furs behind the pines in the south-east corner of town. Probably nothing left now.'] },
  ],
  secrets: { [P(27, 22)]: { gems: ['execute'], gold: 500 } }, // a trapper's cache behind the south-east pines
};
interior('frost_inn', 'The Frozen Flagon', 'inn', back('frostholm', 'frost_inn', { theme: 'interior', music: 'frosttown' }), { cost: 60, inn: { text: ['Shake off the snow. The fire\'s always lit in Frostholm. And for pity\'s sake, somebody lend that man some trousers.'], textBy: [['titan', ['The Spire\'s quiet. I slept the whole night through for the first time this winter.']]] },
  npcs: [{ x: 8, y: 5, type: 'fisher', name: 'Traveler', text: ['The drowned king\'s crypt is no joke. Bring a few Late-Night Kebabs.', 'Your mate asked if I had "a charger". I have a horse. Will that do?'], textBy: [['lich', ['The drowned king is dead? Then I can go home by the marsh road at last.']]] }] });
interior('frost_shop', 'Frostholm Cold Store', 'general', back('frostholm', 'frost_shop', { music: 'frosttown' }), { shop: 'frost_general' });
interior('frost_smith', 'Frostholm DIY Forge', 'smith', back('frostholm', 'frost_smith', { music: 'frosttown' }), { shop: 'frost_smith', npcs: [{ x: 2, y: 4, type: 'villager', name: 'Apprentice', deliver: 'letter', text: ['Hammer, quench, hammer, quench... I dream in sparks.', 'I grew up in Mirewood, you know. Frostholm is so dry. And so cold. And nobody here knows what "a vibe" is either.'] }] });
interior('frost_guild', 'Frostholm Guild', 'guild', back('frostholm', 'frost_guild', { music: 'frosttown' }));
interior('frost_house', 'Old Hunter\'s Lodge', 'house', back('frostholm', 'frost_house', { music: 'frosttown' }), { npcs: [{ x: 4, y: 3, type: 'elder', name: 'Old Hunter', quest: 'stormdrake', text: ['The Titan was a mountain once, they say, until a gem woke it. Fire humbles a mountain, my father said. Fire, and patience.', 'Your brother said "so it\'s weak to fire, got it, bro." My father took forty years to say that.'],
  textBy: [['titan', ['The Titan\'s gone back to being a mountain. That\'s how it should be.']], ['s:met', ['A man who doesn\'t age, cutting seals for three hundred years... Gems are dangerous things, friend. So is boredom.']]] }], chest: [9, 5, { gems: ['guard'], gold: 400 }] });

// ---------------------------------------------------------------- dungeons
const CAVERN = [
  '####################', '#E.................#', '#.####..####..####.#', '#.#C.....#..#....#.#', '#.#......#..#.C..#.#', '#.####.###..###.##.#', '#......#......#....#',
  '#.####.#.####.#.##.#', '#.#C...#.#..#.#.#C.#', '#.#.####.#..#...#..#', '#.#......#..#####..#', '#.######.#.........#', '#........#####X###C#', '####################'];
MAPS.cavern = {
  name: 'Ashen Cavern', kind: 'dungeon', theme: 'cavern', music: 'dungeon', rows: CAVERN, spawn: { x: 2, y: 1 }, enc: 'dungeon', rate: 0.09, fog: 4,
  portals: { [P(1, 1)]: portal('world', 24, 20) },
  chests: { [P(3, 3)]: { gems: ['echo'] }, [P(14, 4)]: { weapons: ['shadow_edge'] }, [P(3, 8)]: { weapons: ['archmage_staff'], gold: 200 }, [P(17, 8)]: { weapons: ['void_grimoire'], gems: ['chain'] }, [P(18, 12)]: { gold: 50, qitem: 'heirloom' } },
  boss: { x: 14, y: 12, id: 'wyrm' },
};
const gen = (id, name, theme, info, enc, boss, loot, exitTo, music) => {
  MAPS[id] = { name, kind: 'dungeon', theme, music, rows: GEN[id], spawn: { x: info.spawn[0], y: info.spawn[1] }, enc, rate: 0.09, fog: 4,
    portals: { [P(info.entrance[0], info.entrance[1])]: portal('world', exitTo[0], exitTo[1]) }, chests: {}, boss: { x: info.boss[0], y: info.boss[1], id: boss } };
  info.chests.forEach(([x, y], i) => { MAPS[id].chests[P(x, y)] = loot[i % loot.length]; });
};
gen('crypt', 'Sunken Crypt', 'crypt', GEN.cryptInfo, 'crypt', 'lich',
  [{ gems: ['stun', 'guard'], gold: 300 }, { weapons: ['stiletto'], gold: 200 }, { armors: ['frost_robe'], items: { elixir: 1 }, qitem: 'lantern' }, { weapons: ['arcane_tome'], gems: ['berserk'] }], GEN.adj.crypt, 'crypt');
gen('spire', 'Frost Spire', 'spire', GEN.spireInfo, 'spire', 'titan',
  [{ accs: ['gem_crown'] }, { weapons: ['frost_bow'], gold: 500 }, { armors: ['yeti_fur'], gems: ['execute'] }, { weapons: ['blizzard_tome'] }, { accs: ['life_charm'], items: { elixir: 2 }, gold: 600 }], GEN.adj.spire, 'spire');

gen('storm', 'Storm Cavern', 'storm', GEN.stormInfo, 'storm', 'storm_drake',
  [{ gems: ['wide', 'swift'], gold: 300 }, { weapons: ['moonblade'] }, { items: { elixir: 2, megaether: 2 }, gold: 500 }, { accs: ['lich_ring'] }], GEN.adj.storm, 'dungeon');

gen('ruins', 'Sunscar Ruins', 'ruins', GEN.ruinsInfo, 'ruins', 'sphinx',
  [{ weapons: ['scarab_bow'], gold: 400 }, { armors: ['sandwalker'], items: { hipotion: 3 } }, { accs: ['scarab_charm'], gems: ['overcharge'] }, { weapons: ['mirage_staff'], items: { megaether: 1 } }, { gems: ['execute', 'crit'], gold: 800 }], GEN.adj.ruins, 'crypt');
MAPS.ruins.minLv = 11; // optional: a warning toast below this average level

// ---------------------------------------------------------------- Mirewood
MAPS.mirewood = {
  name: 'Mirewood', kind: 'town', theme: 'swamptown', music: 'town', rows: TOWNS.mirewood.rows, base: TOWNS.mirewood.base, buildings: TOWNS.mirewood.buildings, props: TOWNS.mirewood.props, spawn: { x: 14, y: 26 },
  portals: { [P(14, 27)]: portal('world', ...GEN.adj.mirewood), [P(15, 27)]: portal('world', ...GEN.adj.mirewood), ...doorPortals('mirewood') },
  decor: [],
  npcs: [
    { x: 16, y: 24, type: 'guard', name: 'Warden', quest: 'marsh', text: ['Welcome to Mirewood. Mind the bog after dark. Worse than bog about, since the Crypt\'s door opened.', 'And no, the bog is not "basically a spa". Stop telling people it\'s a spa.'],
      textBy: [['lich', ['The dead stopped walking the night you came back. The bog\'s never been so dull. I love it.']]] },
    { x: 27, y: 8, type: 'fisher', name: 'Boatwright', quest: 'lantern', text: ['These planks have seen a hundred floods. Your mate asked if I\'m "an Uber". I\'m a boat.', 'Rowed a grey fellow out to the Crypt, the week before the dead woke. Paid in cut gems. Never wanted a ride back.'],
      textBy: [['lich', ['These planks have seen a hundred floods. One less drowned king, now.']]] },
    { x: 12, y: 15, type: 'kid', name: 'Child', quest: 'letter', text: ['The Sunken Crypt is full of skeletons! ...Allegedly. I\'m not allowed to go near it.', 'Is your beard full of things? Mum says beards are full of things.'] },
    { x: 18, y: 14, type: 'villager2', name: 'Apothecary', quest: 'stingers', text: ['Bog-moss, newt oil, a pinch of ash... no, no, that\'s for warts.', 'Beard oil? Oh, I have just the thing, dear. It\'s mostly newt.'] },
    { x: 17, y: 12, type: 'villager2', name: 'Villager', text: ['Holy light and fire both put the dead back down. Pack some Late-Night Kebabs if you go to the Crypt.', 'Your friend asked me if I "use Spotify". Is that a rash? We get a lot of rashes here.'], textBy: [['lich', ['They\'re fishing near the Crypt again. Bold, if you ask me.']]] },
  ],
};
interior('mire_inn', 'The Soggy Frog', 'inn', back('mirewood', 'mire_inn'), { cost: 40, inn: { text: ['Welcome to the Soggy Frog. Wipe your boots. Mind the frogs; they bite. No, they are not "a starter".'], textBy: [['lich', ['No more knocking on the shutters at night. Now I can hear the frogs. I hate the frogs.']]] } });
interior('mire_shop', 'Mirewood Car Boot Shop', 'general', back('mirewood', 'mire_shop'), { shop: 'mire_general' });
interior('mire_guild', 'Mirewood Guild', 'guild', back('mirewood', 'mire_guild'));
interior('mire_house', 'Warden\'s House', 'house', back('mirewood', 'mire_house'), { npcs: [{ x: 4, y: 3, type: 'guard', name: 'Retired Warden', text: ['Forty years I kept watch here. The marsh is patient. It waits for you to slip.', 'Take the chest, friend. I\'ve no use for gold anymore. I\'m retired. I do jigsaws.'], textBy: [['lich', ['Forty years I watched that Crypt. You emptied it in an afternoon. With beards.', 'Take the chest, friend. I\'ve no use for gold anymore.']]] }], chest: [9, 5, { gold: 250, gems: ['venom'] }] });
interior('mire_hut', 'Hermit\'s Hut', 'house', back('mirewood', 'mire_hut'), { npcs: [{ x: 4, y: 3, type: 'elder', name: 'Hermit', text: ['Gems whisper to those who listen. Most folk never hear them. Your brother\'s slate whispers "three percent".', 'Stack Awkward Silence on a quick skill and even a boss may lose a turn... unless it is too proud to fall for it.'] }], chest: [9, 5, { items: { phoenix: 2, megaether: 1 } }] });

// ---------------------------------------------------------------- overworld
const [ux, uy] = GEN.pois.ruins, [mx, my] = GEN.pois.mirewood, [tx, ty] = GEN.pois.storm, [hx, hy] = GEN.pois.haven, [fx, fy] = GEN.pois.frost, [cx, cy] = GEN.pois.cavern, [rx, ry] = GEN.pois.crypt, [sx, sy] = GEN.pois.spire;
MAPS.world = {
  name: 'Greenmarch', kind: 'outdoor', theme: 'world', music: 'world', rows: GEN.world, spawn: { x: hx, y: hy + 1 }, fog: 5, rate: 0.07,
  encByTile: { '.': 'world', ',': 'snow', ':': 'swamp', d: 'desert' },
  portals: {
    [P(hx, hy)]: portal('haven', 17, 32), [P(fx, fy)]: portal('frostholm', 14, 26), [P(cx, cy)]: portal('cavern', 2, 1),
    [P(rx, ry)]: portal('crypt', GEN.cryptInfo.spawn[0], GEN.cryptInfo.spawn[1]), [P(sx, sy)]: portal('spire', GEN.spireInfo.spawn[0], GEN.spireInfo.spawn[1]),
    [P(mx, my)]: portal('mirewood', 14, 26), [P(tx, ty)]: portal('storm', GEN.stormInfo.spawn[0], GEN.stormInfo.spawn[1]),
    [P(ux, uy)]: portal('ruins', GEN.ruinsInfo.spawn[0], GEN.ruinsInfo.spawn[1]),
  },
  npcs: [
    { x: ux - 2, y: uy + 1, type: 'elder', name: 'Desert Oracle', quest: 'sphinx', text: ['The sand remembers everything, child. Even you. Especially the shorts.', 'Seek the hermit of the northern plains, if the pass ever opens. He knows where the old kings hid their gifts.'],
      textBy: [['wyrm lich titan', ['The three are gone. The sand will forget them. It will not forget you. It has tried.']], ['wyrm|lich', ['The sand whispers of a man who cuts stone the way others cut bread. He is no friend of yours.', '@base']]] },
    { x: 8, y: 8, type: 'elder', name: 'Plains Hermit', text: ['Visitors! Sit, sit. Forty winters alone on these plains, and now two beards walk in. Is this a beard-off? I accept.', 'The old kings of Greenmarch hid gifts for the worthy. One lies in the north-west, where the land ends beneath the twin peaks.', 'And the sea-captain Redwake buried his gold by a waterfall in the south. Haven\'s old sailor knows the tale.', 'Look for a faint glimmer on the ground. Treasure likes to twinkle.'],
      textBy: [['titan', ['The north wind smells of spring, for once. Your doing, I wager. My beard still wins, mind.', 'The old kings\' gift still waits in the north-west, beneath the twin peaks. And Redwake\'s gold by the southern falls.']],
        ['wyrm !s:met', ['Visitors! Sit, sit. A grey man passed this way a while back, asking about the old kings. I told him nothing. He smiled as if he knew.', 'Smug sort. No beard. Never trust a man who can\'t grow a beard in three hundred years.', 'The old kings hid gifts for the worthy. One lies in the north-west, where the land ends beneath the twin peaks.', 'And the sea-captain Redwake buried his gold by a waterfall in the south. Haven\'s old sailor knows the tale.', 'Look for a faint glimmer on the ground. Treasure likes to twinkle.']]] },
  ],
  secrets: {
    [P(15, 27)]: { gold: 1200, gems: ['crit'], qitem: 'doubloon' }, // Redwake's cache at the foot of the waterfall
    [P(4, 5)]: { gems: ['echo'], items: { elixir: 2 }, accs: ['life_charm'] }, // the old kings' gift, north-west corner
  },
  places: [[hx, hy, 'Haven Town'], [fx, fy, 'Frostholm'], [cx, cy, 'Ashen Cavern'], [rx, ry, 'Sunken Crypt'], [sx, sy, 'Frost Spire'], [mx, my, 'Mirewood'], [tx, ty, 'Storm Cavern'], [ux, uy, 'Sunscar Ruins']],
};
// no random fights close to towns, and grassland fights ramp up with distance from Haven (gentle first steps)
MAPS.world.safe = [[hx, hy, 6], [fx, fy, 4], [mx, my, 4], [cx, cy, 2], [rx, ry, 2], [sx, sy, 2], [tx, ty, 2], [ux, uy, 2]];
MAPS.world.ramp = [hx, hy];
// the northern pass is gated until the Ashen Wyrm falls
MAPS.world.gate = { tile: 'B', flag: 'wyrm' };
export const START = { map: 'haven', x: 17, y: 30 };
// soundtrack: places with their own themes
MAPS.storm.music = 'storm'; MAPS.ruins.music = 'ruins';
for (const id of ['mirewood', 'mire_inn', 'mire_shop', 'mire_guild', 'mire_house', 'mire_hut']) if (MAPS[id]) MAPS[id].music = 'mirewood';
