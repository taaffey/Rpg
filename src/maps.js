// ===== World definition: maps, portals, NPCs, chests, bosses =====
// Tile legend (visual + rules):
//   outdoor: . grass  , snow  : swamp  d desert  _ path  = bridge  ~ water  r river  T/t tree  M mountain  B rockslide(gate)  H town  D dungeon
//   town/interior: . floor  # wall  H door  E exit  C chest      dungeon: . floor  # wall  E exit  C chest  X boss
// Anything not listed in WALK blocks movement. Portals/NPCs/decor/chests live in per-map lists keyed by coordinates.
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
  if (kind === 'inn') { for (const x of [1, 2, 8, 9]) decor.push([x, 1, 'bed']); decor.push([2, 4, 'table'], [8, 4, 'table'], [1, 6, 'barrel'], [9, 6, 'barrel']); counter(); npcs.push({ x: 5, y: 3, type: 'innkeeper', name: 'Innkeeper', service: 'inn', cost: opts.cost || 25 }); }
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
    { x: 19, y: 31, type: 'guard', name: 'Guard', text: ['Welcome to Haven! Heading out empty-handed? The Smithy is the shop with the sword sign, up the main street.', 'The Ashen Wyrm sleeps in the Ashen Cavern, east of here.', 'It is weak to ice. Bring a mage, or socket a Frost Gem into a fire skill!'] },
    { x: 14, y: 15, type: 'villager', name: 'Villager', quest: 'slimes', text: ['The road north is blocked by a rockslide. They say the Wyrm\'s roars shook the mountain loose.', 'Beat the beast and the pass should clear.'] },
    { x: 20, y: 18, type: 'kid', name: 'Child', text: ['Mister! Did you know a Wide Gem makes a single-target skill hit everyone?', 'Put one in your Heal skill... but it only heals for 60% of the usual power.'] },
    { x: 15, y: 5, type: 'guard', name: 'Castle Guard', text: ['Halt! The castle is closed while the King holds council.', 'Come back once the Ashen Wyrm is dealt with.'] },
    { x: 19, y: 5, type: 'guard', name: 'Castle Guard', text: ['Haven Castle has guarded this harbour for three hundred years.'] },
    { x: 26, y: 12, type: 'villager2', name: 'Furrier', quest: 'wolves', text: ['Pro tip: the Guild lets you change jobs. A sub job lends you its skills (two levels behind) and its weapon types!'] },
  ],
};
interior('haven_inn', 'Haven Inn', 'inn', back('haven', 'haven_inn'), { cost: 25, npcs: [{ x: 8, y: 5, type: 'villager', name: 'Patron', text: ['*hic* The swamp south of town hides a Sunken Crypt. Undead everywhere. Bring holy magic!'] }] });
interior('haven_shop', 'Haven General Store', 'general', back('haven', 'haven_shop'), { shop: 'haven_general' });
interior('haven_smith', 'Haven Smithy', 'smith', back('haven', 'haven_smith'), { shop: 'haven_smith' });
interior('haven_guild', 'Adventurer\'s Guild', 'guild', back('haven', 'haven_guild'));
interior('haven_elder', 'Elder\'s House', 'house', back('haven', 'haven_elder'), { npcs: [{ x: 4, y: 3, type: 'elder', name: 'Elder', text: ['Long ago the smith Gemforge learned that gems hold more than power: they hold intent.', 'Socket one into a skill and the skill itself changes. A thrifty gem halves its cost, an echo gem may repeat it.', 'Three great evils stir: the Ashen Wyrm in the cavern, the Lich King in the Sunken Crypt, and the Frost Titan atop the Frost Spire.', 'Defeat all three, and Haven will sing of you forever.'] }] });
interior('haven_cottage', 'Fisher\'s Cottage', 'house', back('haven', 'haven_cottage'), { npcs: [{ x: 4, y: 3, type: 'fisher', name: 'Fisher', quest: 'heirloom', text: ['Caught nothing today. The lakes are quiet.', 'Feel free to take what\'s in the chest. I\'ve no use for it.'] }], chest: [9, 5, { gold: 150, items: { potion: 3 } }] });

// ---------------------------------------------------------------- Frostholm
MAPS.frostholm = {
  name: 'Frostholm', kind: 'town', theme: 'snowtown', music: 'frosttown', rows: TOWNS.frostholm.rows, base: TOWNS.frostholm.base, buildings: TOWNS.frostholm.buildings, props: TOWNS.frostholm.props, spawn: { x: 14, y: 26 },
  portals: { [P(14, 27)]: portal('world', 27, 9), [P(15, 27)]: portal('world', 27, 9), ...doorPortals('frostholm') },
  decor: [],
  npcs: [
    { x: 16, y: 25, type: 'guard', name: 'Guard', text: ['You cleared the pass? Then you\'re the ones who slew the Wyrm! Frostholm owes you.', 'The Frost Spire lies northeast. The Frost Titan within is weak to fire. Ice magic will barely scratch it.'] },
    { x: 21, y: 9, type: 'villager', name: 'Hunter', quest: 'yetis', text: ['Yetis and ice wolves roam the snow. Their hides are thick, but fire burns them well.', 'Fur armor from the forge resists ice, which helps a lot out there.'] },
    { x: 11, y: 17, type: 'kid', name: 'Child', text: ['I tried a Stun Gem on my snowball throw. Worked great! ...Mom says not to tell.'] },
  ],
};
interior('frost_inn', 'Frostholm Inn', 'inn', back('frostholm', 'frost_inn', { theme: 'interior', music: 'frosttown' }), { cost: 60, npcs: [{ x: 8, y: 5, type: 'fisher', name: 'Traveler', text: ['The Lich King\'s crypt is no joke. Bring Revive and a few Phoenix Downs.'] }] });
interior('frost_shop', 'Frostholm Provisions', 'general', back('frostholm', 'frost_shop', { music: 'frosttown' }), { shop: 'frost_general' });
interior('frost_smith', 'Frostholm Forge', 'smith', back('frostholm', 'frost_smith', { music: 'frosttown' }), { shop: 'frost_smith' });
interior('frost_guild', 'Frostholm Guild', 'guild', back('frostholm', 'frost_guild', { music: 'frosttown' }));
interior('frost_house', 'Old Hunter\'s Lodge', 'house', back('frostholm', 'frost_house', { music: 'frosttown' }), { npcs: [{ x: 4, y: 3, type: 'elder', name: 'Old Hunter', quest: 'stormdrake', text: ['The Frost Titan was a mountain once, they say, until an ancient gem woke it.', 'Gems are dangerous things. Use them wisely, adventurers.'] }], chest: [9, 5, { gems: ['guard'], gold: 400 }] });

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

// ---------------------------------------------------------------- Mirewood
MAPS.mirewood = {
  name: 'Mirewood', kind: 'town', theme: 'swamptown', music: 'town', rows: TOWNS.mirewood.rows, base: TOWNS.mirewood.base, buildings: TOWNS.mirewood.buildings, props: TOWNS.mirewood.props, spawn: { x: 14, y: 26 },
  portals: { [P(14, 27)]: portal('world', ...GEN.adj.mirewood), [P(15, 27)]: portal('world', ...GEN.adj.mirewood), ...doorPortals('mirewood') },
  decor: [],
  npcs: [
    { x: 16, y: 24, type: 'guard', name: 'Warden', quest: 'marsh', text: ['Welcome to Mirewood. Mind the bog after dark.'] },
    { x: 27, y: 8, type: 'fisher', name: 'Boatwright', quest: 'lantern', text: ['These planks have seen a hundred floods.'] },
    { x: 12, y: 15, type: 'kid', name: 'Child', text: ['The Sunken Crypt is full of skeletons! ...Allegedly. I\'m not allowed to go near it.'] },
    { x: 17, y: 12, type: 'villager2', name: 'Villager', text: ['Holy magic and fire both work wonders on the undead. Pack Phoenix Downs for the Lich King.'] },
  ],
};
interior('mire_inn', 'Mirewood Inn', 'inn', back('mirewood', 'mire_inn'), { cost: 40 });
interior('mire_shop', 'Mirewood Trading Post', 'general', back('mirewood', 'mire_shop'), { shop: 'mire_general' });
interior('mire_guild', 'Mirewood Guild', 'guild', back('mirewood', 'mire_guild'));
interior('mire_house', 'Warden\'s House', 'house', back('mirewood', 'mire_house'), { npcs: [{ x: 4, y: 3, type: 'guard', name: 'Retired Warden', text: ['Forty years I kept watch here. The marsh is patient. It waits for you to slip.', 'Take the chest, friend. I\'ve no use for gold anymore.'] }], chest: [9, 5, { gold: 250, gems: ['venom'] }] });
interior('mire_hut', 'Hermit\'s Hut', 'house', back('mirewood', 'mire_hut'), { npcs: [{ x: 4, y: 3, type: 'elder', name: 'Hermit', text: ['Gems whisper to those who listen. A Siphon Gem on a big spell turns your damage into mana.', 'Stack Stun on a quick skill and even a boss may lose a turn... unless it is too proud to fall for it.'] }], chest: [9, 5, { items: { phoenix: 2, megaether: 1 } }] });

// ---------------------------------------------------------------- overworld
const [mx, my] = GEN.pois.mirewood, [tx, ty] = GEN.pois.storm, [hx, hy] = GEN.pois.haven, [fx, fy] = GEN.pois.frost, [cx, cy] = GEN.pois.cavern, [rx, ry] = GEN.pois.crypt, [sx, sy] = GEN.pois.spire;
MAPS.world = {
  name: 'Greenmarch', kind: 'outdoor', theme: 'world', music: 'world', rows: GEN.world, spawn: { x: hx, y: hy + 1 }, fog: 5, rate: 0.07,
  encByTile: { '.': 'world', ',': 'snow', ':': 'swamp', d: 'world' },
  portals: {
    [P(hx, hy)]: portal('haven', 12, 20), [P(fx, fy)]: portal('frostholm', 10, 16), [P(cx, cy)]: portal('cavern', 2, 1),
    [P(rx, ry)]: portal('crypt', GEN.cryptInfo.spawn[0], GEN.cryptInfo.spawn[1]), [P(sx, sy)]: portal('spire', GEN.spireInfo.spawn[0], GEN.spireInfo.spawn[1]),
    [P(mx, my)]: portal('mirewood', 10, 16), [P(tx, ty)]: portal('storm', GEN.stormInfo.spawn[0], GEN.stormInfo.spawn[1]),
  },
  places: [[hx, hy, 'Haven Town'], [fx, fy, 'Frostholm'], [cx, cy, 'Ashen Cavern'], [rx, ry, 'Sunken Crypt'], [sx, sy, 'Frost Spire'], [mx, my, 'Mirewood'], [tx, ty, 'Storm Cavern']],
};
// no random fights close to towns, and grassland fights ramp up with distance from Haven (gentle first steps)
MAPS.world.safe = [[hx, hy, 6], [fx, fy, 4], [mx, my, 4], [cx, cy, 2], [rx, ry, 2], [sx, sy, 2], [tx, ty, 2]];
MAPS.world.ramp = [hx, hy];
// the northern pass is gated until the Ashen Wyrm falls
MAPS.world.gate = { tile: 'B', flag: 'wyrm' };
export const START = { map: 'haven', x: 17, y: 30 };
