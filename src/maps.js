// ===== World definition: maps, portals, NPCs, chests, bosses =====
// Tile legend (visual + rules):
//   outdoor: . grass  , snow  : swamp  d desert  _ path  = bridge  ~ water  r river  T/t tree  M mountain  B rockslide(gate)  H town  D dungeon
//   town/interior: . floor  # wall  H door  E exit  C chest      dungeon: . floor  # wall  E exit  C chest  X boss
// Anything not listed in WALK blocks movement. Portals/NPCs/decor/chests live in per-map lists keyed by coordinates.
// NPC text: text = default lines; textBy = [[condition, lines], ...] checked in order, first match wins (conditions: see STORY
// in data.js, e.g. 'wyrm !lich', 's:met', 'titan'; '@base' inside lines = the default text). The world reacts to the story this way.
import { GEN } from './mapgen.js';
import { themeDecor } from './roomdecor.js';

export const WALK = new Set(['.', ',', ':', ';', 'd', '_', '=', 'H', 'D', 'E', 'X']); // d = overworld desert; towns add: b building, F fountain, G grave (all solid)
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
  if (opts.theme) decor.splice(0, decor.length, ...themeDecor(opts.theme, kind, decor, id)); // themed interiors swap in their own furniture kinds
  MAPS[id] = { name, kind: 'interior', theme: opts.theme || back.theme || 'interior', music: back.music || 'town', rows, spawn: { x: 5, y: 6 }, portals: { [P(5, 7)]: portal(back.map, back.x, back.y) }, decor, npcs, chests: {} };
  if (opts.theme) MAPS[id].ikind = kind; // the room's layout kind (inn / general / smith / guild / house), for the themed renderer's wall fittings
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
const PROP_FOOT = { stall: [3, 2], lamp: [1, 1], barrel: [1, 1], barrels: [2, 1], crate: [1, 1], crates: [2, 1], sacks: [1, 1], bench: [2, 1], well: [2, 2], cart: [2, 1], snowman: [1, 1], logs: [2, 1], pot: [1, 1], board: [1, 1], hay: [1, 1], statue: [1, 1], totem: [1, 1], sled: [2, 1], reeds: [1, 1], nets: [2, 1],
  // the Bell Village (Haven): bell tower 5x2, shrine chapel, Gemforge's grave slab, market cross, maypole, stocks, farm-cart stalls, notice board,
  // trestle table, hay cart, haystack, prize marrow, beehives, the waterwheel's walkway
  tower: [3, 2], chapel: [4, 3], gemgrave: [2, 1], cross: [1, 1], maypole: [1, 1], stocks: [2, 1], cartstall: [3, 2], noticeboard: [2, 1], trestle: [2, 1], haycart: [3, 2],
  haystack: [2, 2], marrow: [2, 1], hives: [3, 1], wheel: [2, 1], post: [1, 1],
  // Hopsend: round hay bales, a pumpkin patch, scarecrow, cider press
  bales: [2, 1], pumpkins: [2, 1], scarecrow: [1, 1], press: [3, 2],
  // Kilnhaven: tiki torch, beach parasol, sun lounger, kebab grill, the groom tied to a post
  tiki: [1, 1], parasol: [1, 1], lounger: [2, 1], grill: [2, 1], groom: [1, 1] };
// props whose solid cells are not one rectangle: [dx, dy] offsets from the prop's x, y (lych gate posts, the bridge's parapets)
const PROP_CELLS = { lychgate: (o) => [[0, 0], [(o.w || 3) + 1, 0]], bridge: (o) => { const c = []; for (let i = 0; i < (o.w || 3); i++) c.push([i, -1], [i, 1]); return c; } };
function town(art, buildings, props = []) {
  const g = art.map((r) => [...r]), doors = {};
  for (const [x, y, w, h, , dc, to] of buildings) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = 'b';
    g[y + h - 1][x + dc] = 'H'; doors[to] = [x + dc, y + h - 1];
  }
  for (const [k, x, y, o = {}] of props) {
    const f = PROP_FOOT[k], cells = PROP_CELLS[k] ? PROP_CELLS[k](o) : f ? Array.from({ length: f[0] * f[1] }, (_, n) => [n % f[0], Math.floor(n / f[0])]) : [];
    for (const [dx, dy] of cells) if (g[y + dy]?.[x + dx] !== undefined) g[y + dy][x + dx] = 'p';
  }
  return { rows: g.map((r) => r.join('')), base: art, doors, props: props.map(([k, x, y, o = {}]) => ({ k, x, y, ...o })),
    buildings: buildings.map(([x, y, w, h, kind, door, to]) => ({ x, y, w, h, kind, door, to })) };
}
const TOWNS = {
  // Haven, the Bell Village: a crooked green valley village around Gemforge's Bell (theme 'village', art in townart.js)
  //   . grass  , dirt lane  _ flagstones  : cobbles  ~ water  = ford / bridge / jetty / stepping stones  # dry-stone wall  T oak  O hollow oak  t yew  a apple
  //   h hedgerow  f fence  w cottage flowers  k allotment  G grave  E exit (the lych gate)
  haven: town([
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTT....T....T....T....T....T....T....T..TT',
    'T..............hT................h.......T',
    'T.~~~~~~.......h..O...........T..h.a.a.a.T',
    'TT~~~~~~~......h.................h......TT',
    'T.~~~~~~~......h.................h..a.a..T',
    'T.~~~~===......h.T.............T.h.......T',
    'TT~~~~~~.......h...w.......w.....h.a.a.aTT',
    'T...~~~~~......h...T._____...T...h.......T',
    'T......~~..,,..h...w._____.w.....hhhh.hhhT',
    'TT....~~~~.,,#########___#########......TT',
    'T.....====.,,#########___#########.......T',
    'Th....~~~~.,,#########,,,h#######,,.....hT',
    'TTt..t.~~..,,#########,,,h#######,,.....TT',
    'Th.....~~..,,.........,,,h.......,,.....hT',
    'Th.....~~..,,.........,,,h.......,,.....hT',
    'TT.....~~..,,.........,,,h.......,,.....TT',
    'Th.....~~..,,.........,,,h.......,,,,,..hT',
    'ThG_...~~..,,...___...,,,...___..,,ww,wwhT',
    'TT.___====.,,.........:::....~~~~,,ww,wwTT',
    'ThG.G..~~..,,.........:::....~~~~,,..,..hT',
    'Th.....~~.............,,,....~~~~,,.....hT',
    'TTt....~~.............,,,........,,.....TT',
    'Th..G..~~.............,,,........,,fffffhT',
    'Th.t...~~.............,,,........,,f....hT',
    'TTG.G..~~.............,,,........,,.....TT',
    'Th#####~~~............,,,........,,.....hT',
    'Th.....~~~_______.....,,,._____..,,f....hT',
    'TT.....~~~~~~~~~~~~~~~===~~~~~~~~~~fffffTT',
    'Th.....~~~~~~~~~~~~~~~===~~~~~~~~~~.....hT',
    'Th.........kkkkkk.,,,,,,,,,,,....~~.....hT',
    'TT.........kkkkkk.,,,,,,,,,,,....~~.....TT',
    'T..........kkkkkk.,,,,,,,,,,,....~~......T',
    'ThhhhThhThhhhhhhhhhhhh,,,hhhhThhh~~hhThThT',
    'T#####################EEE########~~######T',],
  [[13, 14, 9, 4, 'inn', 4, 'haven_inn'], [26, 14, 7, 4, 'guild', 3, 'haven_guild'], [10, 24, 5, 3, 'shop', 2, 'haven_shop'], [27, 24, 6, 3, 'smith', 1, 'haven_smith'],
    [10, 5, 5, 4, 'house', 2, 'haven_cottage'], [35, 13, 5, 4, 'elder', 2, 'haven_elder']],
  [['tower', 22, 6], ['steps', 22, 10, { w: 3, h: 2 }], ['chapel', 2, 15], ['gemgrave', 3, 22], ['weir', 7, 9, { w: 2 }], ['stones', 6, 11, { w: 4 }], ['jetty', 6, 6, { w: 4 }], ['bridge', 6, 19, { w: 4 }], ['ford', 22, 28, { w: 3, h: 2 }],
    ['cross', 23, 19], ['ring', 17.5, 22.9, { r: 20 }], ['maypole', 17, 22], ['stocks', 19, 23], ['noticeboard', 20, 18], ['cartstall', 25, 19, { c: 'veg' }], ['cartstall', 25, 22, { c: 'fur' }],
    ['trestle', 13, 19], ['trestle', 19, 20], ['trestle', 14, 21], ['barrel', 13, 18], ['barrel', 19, 18], ['post', 13, 20], ['post', 21, 20], ['lanterns', 13, 20, { w: 8 }],
    ['crates', 15, 25], ['sacks', 15, 24], ['barrel', 9, 25], ['bench', 29, 22], ['bench', 17, 9], ['well', 37, 21], ['wheel', 31, 27], ['washline', 33, 15, { w: 2 }],
    ['haycart', 17, 31], ['haystack', 36, 30], ['haystack', 38, 30], ['hives', 38, 8], ['marrow', 9, 31], ['lychgate', 21, 33, { w: 3 }],
    ['geese', 14, 24, { w: 5, h: 2, n: 2 }], ['pondfowl', 30.5, 20.5, { rx: 1.0, ry: 0.4, n: 2 }], ['goats', 36, 24, { w: 3, h: 3, n: 3 }], ['goats', 20.6, 30.1, { n: 1 }], ['rowboat', 6.5, 7.1],
    ['guildbanner', 27.8, 14.9], ['guildbanner', 30.2, 14.9], ['sparks', 28.2, 18.8],
    ['patch', 16, 3, { w: 5, h: 3, c: 'poppy' }], ['patch', 27, 3, { w: 4, h: 3, c: 'daisy' }], ['patch', 2, 28, { w: 4, h: 2, c: 'bluebell' }], ['patch', 36, 10, { w: 3, h: 2, c: 'buttercup' }]]),
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
// named places other code can rely on (the wake-up, the finale, the wipe respawn, the world-map landing...): each a walkable [x, y]
const HAVEN_SPOTS = { wake: [20, 31], gate: [23, 32], bell: [23, 8], green: [21, 21], goose: [17, 18], respawn: [16, 19] };
MAPS.haven = {
  name: 'Haven Town', kind: 'town', theme: 'village', music: 'town', rows: TOWNS.haven.rows, base: TOWNS.haven.base, buildings: TOWNS.haven.buildings, props: TOWNS.haven.props,
  spots: HAVEN_SPOTS, spawn: { x: HAVEN_SPOTS.wake[0], y: HAVEN_SPOTS.wake[1] },
  portals: { [P(22, 34)]: portal('world', ...GEN.adj.haven), [P(23, 34)]: portal('world', ...GEN.adj.haven), [P(24, 34)]: portal('world', ...GEN.adj.haven), ...doorPortals('haven') },
  decor: [],
  npcs: [
    { x: 26, y: 32, type: 'guard', name: 'Guard', text: ['Oi, you two. Nice face-curtains. Don\'t walk out that gate empty-handed. The hardware shop and forge is up the main street.', 'The Wyrm sleeps in the Ashen Cavern, north-east, up in the foothills. Old songs say it hates the cold. Bring ice, lads. And do a few fights on the grass first: it eats level ones for breakfast.'],
      textBy: [['titan', ['Did you hear the old bell this morning? Nobody pulled the rope. Nobody. I\'ve had to have a little sit down.']],
        ['wyrm lich', ['The Wyrm AND the drowned king? I\'m standing up straighter. I\'ve also started a beard. Solidarity.']],
        ['wyrm', ['Whole watch heard the mountain roar, then go quiet. Was that you? Course it was. Look at the eyebrows on you.', 'Traders are already loading carts for the north road. The pass to Frostholm is open again.']],
        ['lich', ['Mirewood sent a boat of eels, in thanks for the Crypt. Eels! Who says thank you with eels?', 'The Wyrm\'s still in its cavern, mind. East. Bring ice.']]] },
    { x: 20, y: 24, type: 'villager', name: 'Villager', quest: 'slimes', text: ['The road north is blocked by a rockslide. They say the Wyrm\'s snoring shook the mountain loose.', 'Your ginger friend keeps waving a little black slate at the sky shouting "one bar, ONE BAR". Is he well?'],
      textBy: [['wyrm', ['The rockslide\'s gone! My cousin in Frostholm can visit at last. ...I\'m not sure that\'s good news.']]] },
    { x: 18, y: 22, type: 'kid', name: 'Child', textBy: [['titan', ['When I grow up I\'m going to have a beard like Adam\'s. Or Devon\'s. Devon\'s has a whole biscuit in it.', 'Psst... did you ever find my treasure box? Behind the castle, past the barrels by the old tree.']]], text: ['Mister! Is that a real beard or are you a bear? The ginger one says he\'s "half bear, bro".', 'Psst... I hid my treasure box behind the castle, past the barrels by the old tree. Don\'t tell!'] },
    { x: 22, y: 8, type: 'guard', name: 'Bell Warden', text: ['Halt! The castle is closed while the King holds council. No, you cannot "just pop in for a selfie".'],
      textBy: [['titan', ['The King would knight the pair of you, if you\'d stop pointing that slate at him.']], ['wyrm|lich', ['The King has heard of you. He says the realm is grateful.', '...The castle is still closed. Kings, eh.']]] },
    { x: 24, y: 8, type: 'guard', name: 'Bell Warden', text: ['Haven Castle has guarded this harbour for three hundred years. Since Gemforge\'s day.', 'And no, it does not have "Wi-Fi". Whatever you think that is, we haven\'t got it.'] },
    { x: 28, y: 23, type: 'villager2', name: 'Furrier', quest: 'wolves', text: ['Every hunt teaches you something. Change your calling and you keep what you learned; that is how the old heroes did it.', 'The neat-bearded one called it "transferable skills". Sounds like witchcraft to me.'] },
    { x: 5, y: 22, type: 'elder', name: 'Acolyte', quest: 'tombs', text: ['Light keep you, travellers. The temple tends Gemforge\'s grave. Someone leaves grey flowers on it every spring.', 'No, there is no gift shop. What is a gift shop? Why do you both look so sad about it?'],
      textBy: [['s:met', ['Sereth? The temple books name him: Gemforge\'s last apprentice, cast out for cutting a gem into his own heart.', 'That was three hundred years ago. No man lives so long. ...No man should. He also owes us three centuries of library fines.']],
        ['wyrm|lich', ['Chisel marks on the seals? Gemforge had an apprentice once. The books do not like to say his name.', 'The books are also offended that you called them "basically ancient PDFs".']]] },
    { x: 36, y: 22, type: 'villager', name: 'Huntress', quest: 'goldboar', text: ['Boar stew tonight, if my luck holds.', 'Your friend asked if I had "oat milk". I have oats. I have milk. I am not mixing them for you.'] },
    { x: 6, y: 6, type: 'fisher', name: 'Old Sailor', quest: 'corsair', text: ['Arr. Sixty years at sea, and now I just watch the gulls. Fine beards, lads. Proper sailor beards.'], textBy: [['titan', ['Gulls are back on the north wind. That\'s a good sign, that is.']]] },
  ],
  secrets: { [P(18, 4)]: { gold: 300, items: { phoenix: 2 }, accs: ['mana_charm'] } }, // in front of the hollow oak on Bell Hill, behind the bell tower
};
interior('haven_inn', 'The Gilded Goose', 'inn', back('haven', 'haven_inn'), { cost: 25, inn: { text: ['Welcome to the Gilded Goose. Rest your feet. That bell kept the whole street up. So did whoever shouted "SICK!"', 'Cellar\'s still sticky from Big Gary, mind. Brenna says that one\'s on you.'], textBy: [['titan', ['Your beds are aired and waiting, lads. Haven won\'t forget you. Neither will my cellar.']], ['wyrm|lich', ['Folk drink to you every night now. Good for business. Bad for my head, Brenna says.']]] },
  npcs: [{ x: 8, y: 5, type: 'villager', name: 'Patron', text: ['*hic* Is it quiz night? You two look like quiz night.', '*hic* The dark marsh out east hides a Sunken Crypt. Dead men walking. Bring holy light!'], textBy: [['lich', ['*hic* To the heroes of the Crypt! ...What? Someone has to toast you. Your round, beardy.']]] }] });
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
  portals: { [P(14, 27)]: portal('world', ...GEN.adj.frost), [P(15, 27)]: portal('world', ...GEN.adj.frost), ...doorPortals('frostholm') },
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
  portals: { [P(1, 1)]: portal('world', ...GEN.adj.cavern) },
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

// ---------------------------------------------------------------- wayside places (small stops dotted across the islands)
const wb = (k) => ({ map: 'world', x: GEN.adj[k][0], y: GEN.adj[k][1] });
interior('wayside_chippy', 'Wayside Chippy', 'general', wb('chippy'), { theme: 'chippy', shop: 'chippy', npcs: [{ x: 2, y: 5, type: 'villager', name: 'Regular', text: ['Best chips between here and the sea. The sea is eleven miles that way. I measured. With chips.', 'Vinegar on everything. It is the law. It is also my personality.'] }] });
interior('wayside_stones', 'The Standing Stones', 'house', wb('stones'), { theme: 'stones', npcs: [{ x: 4, y: 3, type: 'elder', name: 'Stone Keeper', text: ['They stand in a circle. Nobody knows why. I have a theory: it was a very slow game of skittles.', 'Take what the stones left. Mind the wobbly one. It has opinions about your trousers.'] }], chest: [9, 5, { gold: 300, gems: ['crit'], items: { elixir: 1 } }] });
interior('wayside_bogshed', 'Bog Snorkel Shed', 'house', wb('bogshed'), { theme: 'bogshed', npcs: [{ x: 4, y: 3, type: 'villager2', name: 'Bog Snorkeller', text: ['Bog snorkelling! The world championships are held here. I came fourth. Out of four. But I came.', 'Don\'t drink the water. Don\'t touch the water. Don\'t look at the water too long. The shed has a lovely view of it though.'] }], chest: [9, 5, { items: { phoenix: 2, antidote: 3 }, gold: 200 }] });
interior('wayside_oasis', 'Oasis Kebab Van', 'general', wb('oasis'), { theme: 'oasis', shop: 'oasis', npcs: [{ x: 8, y: 5, type: 'villager', name: 'Camel Whisperer', text: ['He is not spitting at you. He is being friendly. Wipe your face, but gently, he is sensitive.', 'The kebab is camel. No it isn\'t. Probably. Eat it quickly.'] }] });
interior('wayside_lodge', 'Ski Lodge', 'inn', wb('lodge'), { theme: 'lodge', cost: 60, inn: { text: ['Welcome to the lodge! Fondue? No? We only have fondue. Sixty gold, and the beds are heated. By fondue.'] }, npcs: [{ x: 2, y: 5, type: 'villager2', name: 'Skier', text: ['I have been waiting for the lift since Tuesday. There is no lift. I have been told this. I am waiting.'] }] });
interior('wayside_shed', 'Ice Fishing Shed', 'house', wb('shed'), { theme: 'icehut', npcs: [{ x: 4, y: 3, type: 'elder', name: 'Ice Fisher', text: ['Forty years, one hole, no fish. Then yesterday, a boot. It was a good boot.', 'Take the chest. It was in the boot. The boot is staying.'] }], chest: [9, 5, { gold: 450, gems: ['frost'], items: { megaether: 1, hipotion: 2 } }] });

// ---------------------------------------------------------------- Hopsend Isle: the ferry, the autumn village, the Great Brewery
TOWNS.hopsend = town([
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  'TT........a.......e........aTT',
  'TT................k.........TT',
  'TT................k........hTT',
  'TT........e.......k........hTT',
  'TT............_...k........hTT',
  'TT.........a.._...k.........TT',
  'TT__________________________TT',
  'TT__________________________TT',
  'TT.wwww.......__.......wwww.TT',
  'TT............__............TT',
  'TT............__............TT',
  'TT.......::::::::::::.......TT',
  'TT.......:;;;;;;;;;;:.......TT',
  'TT.......:;;;;;;;;;;:.......TT',
  'TT.......:;;;;;;;;;;:fff.fffTT',
  'TT.kkkkkk:;;;;;;;;;;:.......TT',
  'TT.kkkkkk::::::::::::.......TT',
  'TT__________________________TT',
  'TT.a.a.a.a....__...........TTT',
  'TT............__.....~~~~~~.TT',
  'TT..e.e.e.e...__.....~~~~~~.TT',
  'TTT...........__.....~~~~~~.TT',
  'TT############__############TT',
  'TT############EE############TT'],
  [[3, 3, 7, 5, 'inn', 3, 'hop_inn'], [12, 3, 5, 4, 'shop', 2, 'hop_shop'], [20, 3, 7, 5, 'smith', 2, 'hop_smith'], [3, 12, 5, 4, 'house', 2, 'hop_farm'], [22, 12, 5, 4, 'house', 2, 'hop_bees']],
  [['lamp', 10, 12], ['lamp', 19, 12], ['lamp', 12, 19], ['lamp', 17, 19], ['maypole', 14, 16], ['haystack', 8, 10], ['bales', 20, 10], ['pumpkins', 21, 17], ['scarecrow', 26, 17], ['hives', 21, 18], ['bales', 26, 18],
    ['press', 17, 20], ['barrels', 17, 22], ['crate', 19, 22], ['fowl', 23.5, 22, { rx: 1.8, ry: 0.5, n: 2 }], ['arch', 14, 24, { w: 2 }]]);
interior('hop_inn', 'The Barley Mow', 'inn', back('hopsend', 'hop_inn', { music: 'pub' }), { theme: 'hoppub', cost: 70, inn: { text: ['Welcome to the Barley Mow! Rooms are seventy gold. Breakfast is a pint. Lunch is a pint. Dinner is two pints and a regret.'] } });
interior('hop_shop', 'Hopsend General Shop', 'general', back('hopsend', 'hop_shop'), { theme: 'hoppub', shop: 'hop_general' });
interior('hop_smith', 'Hopsend Forge & Tin Shed', 'smith', back('hopsend', 'hop_smith'), { theme: 'hoppub', shop: 'hop_smith' });
interior('hop_farm', 'Farmhouse', 'house', back('hopsend', 'hop_farm'), { theme: 'hoppub', npcs: [{ x: 4, y: 3, type: 'elder', name: 'Head Farmer', quest: 'mashtun', text: ['Forty acres of hops, and every one of them is now arguing with me. Since the Brewery started bubbling, they have opinions.', 'Take the chest. It is full of hops. Well, gold. Mostly gold. One hop.'] }], chest: [9, 5, { gold: 700, items: { elixir: 2, megaether: 2 } }] });
interior('hop_bees', 'Beekeeper\'s Cottage', 'house', back('hopsend', 'hop_bees'), { theme: 'hoppub', npcs: [{ x: 4, y: 3, type: 'villager2', name: 'Beekeeper', quest: 'wasps', text: ['The bees are fine! They are not fine. They are the size of dinner plates. They have started a pension fund.', 'Do not run. Running makes them chase. Standing still makes them chase also. I have no advice.'] }], chest: [9, 5, { gems: ['venom'], gold: 400 }] });
MAPS.hopsend = {
  name: 'Hopsend', kind: 'town', theme: 'autumntown', music: 'town', rows: TOWNS.hopsend.rows, base: TOWNS.hopsend.base, buildings: TOWNS.hopsend.buildings, props: TOWNS.hopsend.props, spawn: { x: 14, y: 24 },
  portals: { [P(14, 25)]: portal('world', ...GEN.adj.hopsend), [P(15, 25)]: portal('world', ...GEN.adj.hopsend), ...doorPortals('hopsend') },
  decor: [],
  npcs: [
    { x: 12, y: 20, type: 'villager2', name: 'Innkeeper', quest: 'barrels', text: ['Barrels gone missing, imps in the cellar, and the beer is still flat. Come back to me when you have dealt with the thieving little chaps.'] },
    { x: 16, y: 21, type: 'guard', name: 'Watchman', text: ['Welcome to Hopsend, famous for beer, apples and the sort of weather that makes you want both.', 'The Great Brewery is east of the village. Since the mash tun woke up, nobody has had a decent pint. We are suffering.'] },
    { x: 8, y: 13, type: 'villager', name: 'Cider Fan', text: ['Everyone here likes beer. I like cider. We do not talk about it. It is a very quiet bar.', 'Your friend asked if the cider has "good Wi-Fi". It has apples. It has apples, mate.'] },
    { x: 20, y: 17, type: 'kid', name: 'Child', text: ['Mum says never go in the Brewery. It burps. The whole island feels it. Last Tuesday a gull exploded. Happily.'] },
  ],
};
gen('brewery', 'The Great Brewery', 'cellar', GEN.breweryInfo, 'brewery', 'mash_tun',
  [{ gems: ['crit'], gold: 600 }, { items: { elixir: 2, megaether: 2 }, gold: 500 }, { accs: ['hop_garland'], gold: 400 }, { items: { phoenix: 4, hipotion: 4 } }, { weapons: ['bottle_opener'], gems: ['echo'], gold: 1200 }], GEN.adj.brewery, 'dungeon');
MAPS.brewery.minLv = 15; // optional: a warning toast below this average level
// the docks: a ferryman in a hut at each end of the sea crossing (service 'ferry' in game.js)
interior('port_s', 'Westshore Jetty', 'house', wb('dock_s'), { theme: 'jetty', npcs: [{ x: 4, y: 3, type: 'fisher', name: 'Ferryman', service: 'ferry', need: 'titan', to: ['world', ...GEN.adj.dock_h], no: ['Hopsend? Over the water? Not till the big frozen fellow in the Spire is dealt with, my insurance says. Also my mother says. Mostly my mother.'], go: ['Hop on. The crossing takes a minute. I will tell you about my cousin. He has a boat too. His is bigger.', 'Mind the gulls.'] }] });
interior('port_h', 'Hopsend Jetty', 'house', wb('dock_h'), { theme: 'jetty', npcs: [{ x: 4, y: 3, type: 'fisher', name: 'Ferryman', service: 'ferry', to: ['world', ...GEN.adj.dock_s], go: ['Back to Sunscar? Sure. Hold the rail, the sea is feeling dramatic today.'] }] });

// ---------------------------------------------------------------- Cinder Isle: the far north-west volcano holiday island (post-ending)
TOWNS.kilnhaven = town([
  'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  'TT................L.........TT',
  'TT........T.......L........hTT',
  'TT................L........hTT',
  'TTh........T......L........hTT',
  'TTh..........._..LLL........TT',
  'TT__________________________TT',
  'TT__________________________TT',
  'TT............__............TT',
  'TTh.......h...__...hh.......TT',
  'TTh...........__............TT',
  'TTh......::::::::::::.......TT',
  'TTh......::::FFF:::::.......TT',
  'TT,,,,,,,::::FFF:::::.......TT',
  'TT,,,,,,,::::::::::::T......TT',
  'TT,,,,,,,::::::::::::.......TT',
  'TT__________________________TT',
  'TT,,,,,,,,,,,.__.....LLLLLLTTT',
  'TT,,,,,,,,,,,.__.....LLLLLL.TT',
  'TT,,,,,,,,,,,.__.....LLLLLL.TT',
  'TT,,,,,,,,,,,.__.....LLLLLL.TT',
  'TT############__############TT',
  'TT############EE############TT'],
  [[3, 4, 7, 5, 'inn', 3, 'kiln_inn'], [12, 4, 5, 4, 'shop', 2, 'kiln_shop'], [20, 4, 7, 5, 'smith', 2, 'kiln_smith'], [3, 12, 5, 4, 'house', 2, 'kiln_bar'], [22, 12, 5, 4, 'house', 2, 'kiln_warden']],
  [['tiki', 10, 11], ['tiki', 19, 11], ['tiki', 12, 19], ['groom', 17, 19], ['tiki', 9, 14], ['tiki', 20, 14], ['grill', 8, 15], ['parasol', 5, 17, { c: 'pink' }], ['lounger', 3, 17], ['towel', 6, 18, { c: 1 }],
    ['parasol', 3, 21, { c: 'yellow' }], ['lounger', 4, 22], ['parasol', 7, 21, { c: 'teal' }], ['lounger', 8, 22], ['towel', 10, 22, { c: 0 }], ['towel', 2, 23, { c: 3 }], ['barrels', 25, 17], ['crates', 20, 16], ['arch', 14, 24, { w: 2 }]]);
interior('kiln_inn', 'The Lava Lounge', 'inn', back('kilnhaven', 'kiln_inn', { music: 'pub' }), { theme: 'beachbar', cost: 120, inn: { text: ['Welcome to the Lava Lounge! One hundred and twenty gold. Rooms are warm. Rooms are always warm. Please do not ask why the floor is warm.'] } });
interior('kiln_shop', 'Kilnhaven Beach Shop', 'general', back('kilnhaven', 'kiln_shop'), { theme: 'beachbar', shop: 'kiln_general' });
interior('kiln_smith', 'Kilnhaven Forge & Fire Pit', 'smith', back('kilnhaven', 'kiln_smith'), { theme: 'beachbar', shop: 'kiln_smith' });
interior('kiln_bar', 'Beach Bar', 'house', back('kilnhaven', 'kiln_bar'), { theme: 'beachbar', npcs: [{ x: 4, y: 3, type: 'villager2', name: 'Beach Bar Owner', quest: 'kebabs', text: ['Cocktails, kebabs, and a view of an erupting volcano. Four stars on the app. It would be five but the app is also on fire.', 'Take the chest. Mind the umbrella. It is lit.'] }], chest: [9, 5, { gold: 1200, items: { elixir: 3, megaether: 3 } }] });
interior('kiln_warden', 'Warden\'s Hut', 'house', back('kilnhaven', 'kiln_warden'), { theme: 'beachbar', npcs: [{ x: 4, y: 3, type: 'guard', name: 'Volcano Warden', quest: 'margherita', text: ['The mountain has been on since nineteen eighty-seven. Nobody dares turn it off. Nobody can find the dial.', 'It is a pizza oven. I want to be clear. It has always been a pizza oven. We just kept it quiet.'] }], chest: [9, 5, { gems: ['execute'], gold: 800 }] });
MAPS.kilnhaven = {
  name: 'Kilnhaven', kind: 'town', theme: 'volcanotown', music: 'town', rows: TOWNS.kilnhaven.rows, base: TOWNS.kilnhaven.base, buildings: TOWNS.kilnhaven.buildings, props: TOWNS.kilnhaven.props, spawn: { x: 14, y: 24 },
  portals: { [P(14, 25)]: portal('world', ...GEN.adj.kilnhaven), [P(15, 25)]: portal('world', ...GEN.adj.kilnhaven), ...doorPortals('kilnhaven') },
  decor: [],
  npcs: [
    { x: 12, y: 20, type: 'fisher', name: 'Lifeguard', quest: 'sunburn', text: ['I am a lifeguard. There is no water here. There is lava. I am not trained for lava. I have a whistle.'] },
    { x: 16, y: 21, type: 'guard', name: 'Local', text: ['Welcome to Kilnhaven! Lovely beaches. They are made of obsidian and they are slightly on fire. We say "sizzling".', 'The Pizza Oven is up the path. We call it that because it is one. Please do not feed it.'] },
    { x: 8, y: 13, type: 'villager', name: 'Stag Do Lad', text: ['LADS. We are on a STAG. We are on the SECOND day of a TWO day STAG. It has been nine days. The groom is somewhere in the volcano. We think.', 'Your mate has a phone on three percent? Same, bro. Same.'] },
    { x: 20, y: 17, type: 'kid', name: 'Child', text: ['Mum says the volcano is just hungry. Dad says it is just misunderstood. The cat is in there. We do not talk about the cat.'] },
  ],
};
gen('pizzaoven', 'The Pizza Oven', 'cavern', GEN.pizzaovenInfo, 'pizzaoven', 'margherita',
  [{ gems: ['crit'], gold: 1000 }, { items: { elixir: 3, megaether: 3 }, gold: 800 }, { gold: 1500 }, { items: { phoenix: 5, hipotion: 5 } }, { gems: ['echo', 'execute'], gold: 2000 }], GEN.adj.pizzaoven, 'dungeon');
MAPS.pizzaoven.minLv = 20; // optional: a warning toast below this average level
interior('port_f', 'Frost Jetty', 'house', wb('dock_f'), { theme: 'jetty', npcs: [{ x: 4, y: 3, type: 'fisher', name: 'Ferryman', service: 'ferry', need: 'titan', to: ['world', ...GEN.adj.dock_e], no: ['Cinder Isle? Holiday island, lovely, lava everywhere. I will take you once that mountain-sized fellow in the Spire has been put down. It is in the brochure.'], go: ['Cinder Isle! Pack sun cream. And a fire extinguisher. And sun cream for the fire extinguisher.'] }] });
interior('port_e', 'Cinder Jetty', 'house', wb('dock_e'), { theme: 'jetty', npcs: [{ x: 4, y: 3, type: 'fisher', name: 'Ferryman', service: 'ferry', to: ['world', ...GEN.adj.dock_f], go: ['Back to Frost Isle? Of course. It will feel like a fridge. You will love it.'] }] });

// ---------------------------------------------------------------- four small optional dungeons on the main islands
gen('windmill', 'The Old Windmill', 'cellar', GEN.windmillInfo, 'windmill', 'miller',
  [{ gold: 120, items: { potion: 2 } }, { items: { ether: 1, antidote: 1 }, gold: 80 }, { weapons: ['rolling_pin'], gold: 200 }, { items: { hipotion: 1 }, gold: 100 }, { gold: 300, gems: ['fire'] }], GEN.adj.windmill, 'dungeon');
MAPS.windmill.minLv = 4;
gen('wreck', 'Wreck of the Salty Sue', 'crypt', GEN.wreckInfo, 'wreck', 'captain_barnacle',
  [{ gold: 400, items: { hipotion: 2 } }, { items: { ether: 2 }, gold: 300 }, { weapons: ['soggy_cutlass'] }, { items: { phoenix: 2 }, gold: 300 }, { gold: 800, gems: ['venom'] }], GEN.adj.wreck, 'crypt');
MAPS.wreck.minLv = 10;
gen('pyramid', 'Pyramid of Mild Inconvenience', 'ruins', GEN.pyramidInfo, 'pyramid', 'clerk_pharaoh',
  [{ gold: 500, items: { hipotion: 3 } }, { items: { megaether: 1 }, gold: 400 }, { armors: ['lost_property_coat'], gold: 800 }, { items: { phoenix: 2, remedy: 2 }, gold: 400 }, { gold: 1000, gems: ['crit'] }], GEN.adj.pyramid, 'ruins');
MAPS.pyramid.minLv = 12;
gen('icecave', 'The Ice Cave', 'spire', GEN.icecaveInfo, 'icecave', 'frozen_angler',
  [{ gold: 700, items: { hipotion: 3 } }, { items: { megaether: 2 }, gold: 500 }, { weapons: ['ice_fishing_rod'], gold: 1000 }, { items: { elixir: 1, phoenix: 2 }, gold: 500 }, { gold: 1200, gems: ['frost'] }], GEN.adj.icecave, 'spire');
MAPS.icecave.minLv = 14;

// ---------------------------------------------------------------- the Obsidian Ruins (the last optional island)
gen('obsidian', 'The Obsidian Ruins', 'cellar', GEN.obsidianInfo, 'obsidian', 'landlord',
  [{ items: { elixir: 4, megaether: 4 }, gold: 2000 }, { gold: 2500, gems: ['execute', 'echo'] }, { items: { phoenix: 6, hipotion: 6 }, gold: 1500 }, { gold: 3000 }, { items: { elixir: 5 }, gold: 2500 }, { gems: ['crit', 'execute'], gold: 3500 }], GEN.adj.obsidian, 'dungeon');
MAPS.obsidian.minLv = 20; // optional: a warning toast below this average level
interior('port_o', 'Stormreach Jetty', 'house', wb('dock_o'), { theme: 'jetty', npcs: [{ x: 4, y: 3, type: 'fisher', name: 'Ferryman', service: 'ferry', need: 'margherita', to: ['world', ...GEN.adj.dock_p], no: ['The glass island? Not until the volcano oven-lady has been cooled, my insurance says. Also my mother says. Also the ghost, who sends a letter every Tuesday.'], go: ['The Obsidian Ruins. Last stop. Bring everything you own, and a very good excuse.'] }] });
interior('port_p', 'Obsidian Jetty', 'general', wb('dock_p'), { theme: 'jetty', shop: 'last_orders_kiosk', npcs: [{ x: 2, y: 5, type: 'fisher', name: 'Ferryman', service: 'ferry', to: ['world', ...GEN.adj.dock_o], go: ['Back to the mainland? Wise. Nobody ever leaves the pub, mind. You have been very lucky.'] }] });

// ---------------------------------------------------------------- overworld
const [ux, uy] = GEN.pois.ruins, [mx, my] = GEN.pois.mirewood, [tx, ty] = GEN.pois.storm, [hx, hy] = GEN.pois.haven, [fx, fy] = GEN.pois.frost, [cx, cy] = GEN.pois.cavern, [rx, ry] = GEN.pois.crypt, [sx, sy] = GEN.pois.spire;
MAPS.world = {
  name: 'Greenmarch', kind: 'outdoor', theme: 'world', music: 'world', rows: GEN.world, spawn: { x: hx, y: hy + 1 }, fog: 5, rate: 0.07,
  encByTile: { '.': 'world', ',': 'snow', ':': 'swamp', d: 'desert' },
  portals: {
    [P(hx, hy)]: portal('haven', ...MAPS.haven.spots.gate), [P(fx, fy)]: portal('frostholm', 14, 26), [P(cx, cy)]: portal('cavern', 2, 1),
    [P(rx, ry)]: portal('crypt', GEN.cryptInfo.spawn[0], GEN.cryptInfo.spawn[1]), [P(sx, sy)]: portal('spire', GEN.spireInfo.spawn[0], GEN.spireInfo.spawn[1]),
    [P(mx, my)]: portal('mirewood', 14, 26), [P(tx, ty)]: portal('storm', GEN.stormInfo.spawn[0], GEN.stormInfo.spawn[1]),
    [P(ux, uy)]: portal('ruins', GEN.ruinsInfo.spawn[0], GEN.ruinsInfo.spawn[1]),
    ...Object.fromEntries(['chippy', 'stones', 'bogshed', 'oasis', 'lodge', 'shed'].map((k) => [P(...GEN.pois[k]), portal('wayside_' + k, 5, 6)])),
    [P(...GEN.pois.hopsend)]: portal('hopsend', 14, 24), [P(...GEN.pois.brewery)]: portal('brewery', GEN.breweryInfo.spawn[0], GEN.breweryInfo.spawn[1]),
    [P(...GEN.pois.dock_s)]: portal('port_s', 5, 6), [P(...GEN.pois.dock_h)]: portal('port_h', 5, 6),
    ...Object.fromEntries(['windmill', 'wreck', 'pyramid', 'icecave'].map((k) => [P(...GEN.pois[k]), portal(k, GEN[k + 'Info'].spawn[0], GEN[k + 'Info'].spawn[1])])),
    [P(...GEN.pois.obsidian)]: portal('obsidian', GEN.obsidianInfo.spawn[0], GEN.obsidianInfo.spawn[1]), [P(...GEN.pois.dock_o)]: portal('port_o', 5, 6), [P(...GEN.pois.dock_p)]: portal('port_p', 5, 6),
    [P(...GEN.pois.kilnhaven)]: portal('kilnhaven', 14, 24), [P(...GEN.pois.pizzaoven)]: portal('pizzaoven', GEN.pizzaovenInfo.spawn[0], GEN.pizzaovenInfo.spawn[1]),
    [P(...GEN.pois.dock_f)]: portal('port_f', 5, 6), [P(...GEN.pois.dock_e)]: portal('port_e', 5, 6),
  },
  npcs: [
    { x: ux - 2, y: uy + 1, type: 'elder', name: 'Desert Oracle', quest: 'sphinx', text: ['The sand remembers everything, child. Even you. Especially the shorts.', 'Seek the hermit of the Frostfields, if the pass ever opens. He knows where the old kings hid their gifts.'],
      textBy: [['wyrm lich titan', ['The three are gone. The sand will forget them. It will not forget you. It has tried.']], ['wyrm|lich', ['The sand whispers of a man who cuts stone the way others cut bread. He is no friend of yours.', '@base']]] },
    { x: GEN.deco.hermit[0], y: GEN.deco.hermit[1], type: 'elder', name: 'Plains Hermit', text: ['Visitors! Sit, sit. Forty winters alone on this frozen plain, and now two beards walk in. Is this a beard-off? I accept.', 'The old kings of Greenmarch hid gifts for the worthy. One lies in the north-west, where the land ends beneath the twin peaks.', 'And the sea-captain Redwake buried his gold by a waterfall in the south. Haven\'s old sailor knows the tale.', 'No glimmers, mind. Treasure is shy. Poke about.'],
      textBy: [['titan', ['The north wind smells of spring, for once. Your doing, I wager. My beard still wins, mind.', 'The old kings\' gift still waits in the north-west, beneath the twin peaks. And Redwake\'s gold by the southern falls.']],
        ['wyrm !s:met', ['Visitors! Sit, sit. A grey man passed this way a while back, asking about the old kings. I told him nothing. He smiled as if he knew.', 'Smug sort. No beard. Never trust a man who can\'t grow a beard in three hundred years.', 'The old kings hid gifts for the worthy. One lies in the north-west, where the land ends beneath the twin peaks.', 'And the sea-captain Redwake buried his gold by a waterfall in the south. Haven\'s old sailor knows the tale.', 'No glimmers, mind. Treasure is shy. Poke about.']]] },
  ],
  secrets: {
    [P(GEN.deco.waterfall[0], GEN.deco.waterfall[1])]: { gold: 1200, gems: ['crit'], qitem: 'doubloon' }, // Redwake's cache at the foot of the waterfall
    [P(GEN.deco.gift[0], GEN.deco.gift[1])]: { gems: ['echo'], items: { elixir: 2 }, accs: ['life_charm'] }, // the old kings' gift, north-west corner
  },
  places: [[hx, hy, 'Haven Town'], [fx, fy, 'Frostholm'], [cx, cy, 'Ashen Cavern'], [rx, ry, 'Sunken Crypt'], [sx, sy, 'Frost Spire'], [mx, my, 'Mirewood'], [tx, ty, 'Storm Cavern'], [ux, uy, 'Sunscar Ruins'], [...GEN.pois.chippy, 'Wayside Chippy'], [...GEN.pois.stones, 'Standing Stones'], [...GEN.pois.bogshed, 'Bog Snorkel Shed'], [...GEN.pois.oasis, 'Oasis Kebab Van'], [...GEN.pois.lodge, 'Ski Lodge'], [...GEN.pois.shed, 'Ice Fishing Shed'], [...GEN.pois.dock_s, 'Westshore Jetty'], [...GEN.pois.dock_h, 'Hopsend Jetty'], [...GEN.pois.hopsend, 'Hopsend'], [...GEN.pois.brewery, 'Great Brewery'], [...GEN.pois.dock_f, 'Frost Jetty'], [...GEN.pois.dock_e, 'Cinder Jetty'], [...GEN.pois.windmill, 'Old Windmill'], [...GEN.pois.wreck, 'Salty Sue Wreck'], [...GEN.pois.pyramid, 'Mild Pyramid'], [...GEN.pois.icecave, 'Ice Cave'], [...GEN.pois.dock_o, 'Stormreach Jetty'], [...GEN.pois.dock_p, 'Obsidian Jetty'], [...GEN.pois.obsidian, 'Obsidian Ruins'], [...GEN.pois.kilnhaven, 'Kilnhaven'], [...GEN.pois.pizzaoven, 'The Pizza Oven']],
};
// no random fights close to towns, and grassland fights ramp up with distance from Haven (gentle first steps)
MAPS.world.safe = [[hx, hy, 6], [fx, fy, 4], [mx, my, 4], [cx, cy, 2], [rx, ry, 2], [sx, sy, 2], [tx, ty, 2], [ux, uy, 2], ...['chippy', 'stones', 'bogshed', 'oasis', 'lodge', 'shed', 'dock_s', 'dock_h', 'hopsend', 'brewery', 'dock_f', 'dock_e', 'dock_o', 'dock_p', 'obsidian', 'kilnhaven', 'pizzaoven', 'windmill', 'wreck', 'pyramid', 'icecave'].map((k) => [...GEN.pois[k], 3])];
MAPS.world.ramp = [hx, hy];
// the northern pass is gated until the Ashen Wyrm falls
MAPS.world.gate = { tile: 'B', flag: 'wyrm' };
export const START = { map: 'haven', x: MAPS.haven.spots.wake[0], y: MAPS.haven.spots.wake[1] };
// soundtrack: places with their own themes
MAPS.storm.music = 'storm'; MAPS.ruins.music = 'ruins';
for (const id of ['mirewood', 'mire_inn', 'mire_shop', 'mire_guild', 'mire_house', 'mire_hut']) if (MAPS[id]) MAPS[id].music = 'mirewood';
