// ===== World definition: maps, portals, NPCs, chests, bosses =====
// Tile legend (visual + rules):
//   outdoor: . grass  , snow  : swamp  _ path  = bridge  ~ water  T/t tree  M mountain  B rockslide(gate)  H town  D dungeon
//   town/interior: . floor  # wall  H door  E exit  C chest      dungeon: . floor  # wall  E exit  C chest  X boss
// Anything not listed in WALK blocks movement. Portals/NPCs/decor/chests live in per-map lists keyed by coordinates.
import { GEN } from './mapgen.js';

export const WALK = new Set(['.', ',', ':', '_', '=', 'H', 'D', 'E', 'X']); // towns add: b building, F fountain, G grave (all solid)
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

// ---------------------------------------------------------------- FF1-style town builder
// ops: ['_'|'~'|'#'|'.'|'T'|'=' , x, y, w, h] rect fills applied in order; buildings stamped last.
// building: [x, y, w, h, kind, doorCol, interiorId]  roof rows y..y+h-2, wall row y+h-1, door at (x+doorCol, y+h-1)
function town(W, H, ops, buildings, gates) {
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  for (let x = 0; x < W; x++) { g[0][x] = '#'; g[H - 1][x] = '#'; } for (let y = 0; y < H; y++) { g[y][0] = '#'; g[y][W - 1] = '#'; }
  for (const [ch, x, y, w = 1, h = 1] of ops) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = ch;
  const doors = {};
  for (const [x, y, w, h, kind, dc, to] of buildings) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = 'b';
    g[y + h - 1][x + dc] = 'H'; doors[to] = [x + dc, y + h - 1];
  }
  for (const [x, y] of gates) g[y][x] = 'E';
  return { rows: g.map((r) => r.join('')), doors, buildings: buildings.map(([x, y, w, h, kind, door, to]) => ({ x, y, w, h, kind, door, to })) };
}
const TOWNS = {
  haven: town(26, 22, [
    ['_', 12, 4, 2, 17], ['_', 2, 5, 22, 1], ['_', 2, 15, 22, 1], ['_', 8, 9, 10, 5],
    ['_', 4, 4], ['_', 8, 4], ['_', 17, 4], ['_', 22, 4],
    ['~', 19, 8, 6, 2], ['~', 1, 8, 4, 3], ['=', 21, 8, 1, 2], ['_', 21, 7], ['_', 21, 10, 1, 5],
    ['T', 11, 17], ['T', 14, 17], ['T', 11, 19], ['T', 14, 19], ['T', 7, 8], ['T', 18, 12], ['T', 7, 13], ['T', 18, 13],
    ['T', 1, 17], ['T', 2, 19], ['T', 24, 17], ['T', 23, 19], ['T', 6, 18], ['T', 19, 18], ['T', 1, 1], ['T', 24, 1],
    ['F', 12, 11], ['F', 13, 11], ['G', 3, 17], ['G', 5, 17], ['G', 3, 19], ['G', 5, 19],
  ], [[2, 1, 5, 3, 'inn', 2, 'haven_inn'], [7, 1, 4, 3, 'shop', 1, 'haven_shop'], [15, 1, 5, 3, 'smith', 2, 'haven_smith'], [20, 1, 5, 3, 'guild', 2, 'haven_guild'],
    [2, 12, 4, 3, 'house', 1, 'haven_elder'], [19, 12, 5, 3, 'house', 2, 'haven_cottage']], [[12, 21], [13, 21]]),
  frostholm: town(22, 18, [
    ['_', 10, 1, 2, 16], ['_', 2, 5, 18, 1], ['_', 7, 9, 8, 4], ['_', 4, 4], ['_', 8, 4], ['_', 14, 4], ['_', 18, 4], ['_', 3, 12, 4, 1], ['_', 4, 11],
    ['F', 10, 10], ['F', 11, 10], ['t', 1, 1], ['t', 20, 1], ['t', 2, 15], ['t', 19, 15], ['t', 9, 14], ['t', 12, 14], ['t', 6, 8], ['t', 15, 8], ['t', 17, 12], ['t', 18, 13],
    ['~', 15, 14, 5, 2],
  ], [[2, 1, 5, 3, 'inn', 2, 'frost_inn'], [7, 1, 3, 3, 'shop', 1, 'frost_shop'], [12, 1, 5, 3, 'smith', 2, 'frost_smith'], [17, 1, 4, 3, 'guild', 1, 'frost_guild'], [2, 8, 4, 3, 'house', 2, 'frost_house']], [[10, 17], [11, 17]]),
  mirewood: town(22, 18, [
    ['~', 1, 6, 20, 3], ['~', 1, 12, 6, 5], ['~', 15, 12, 6, 5],
    ['_', 10, 1, 2, 16], ['_', 2, 5, 18, 1], ['_', 4, 4], ['_', 8, 4], ['_', 14, 4], ['_', 18, 4], ['_', 2, 10, 18, 1], ['_', 4, 9], ['_', 17, 9],
    ['T', 1, 1], ['T', 20, 1], ['T', 8, 13], ['T', 13, 13], ['T', 8, 15], ['T', 13, 15], ['T', 1, 10], ['T', 20, 10],
    ['F', 10, 11], ['F', 11, 11],
  ], [[2, 1, 5, 3, 'inn', 2, 'mire_inn'], [7, 1, 3, 3, 'shop', 1, 'mire_shop'], [12, 1, 4, 3, 'guild', 2, 'mire_guild'], [16, 1, 5, 3, 'house', 2, 'mire_house'], [2, 7, 4, 3, 'house', 2, 'mire_hut']], [[10, 17], [11, 17]]),
};

const back = (t, id, extra = {}) => { const [x, y] = TOWNS[t].doors[id]; return { map: t, x, y: y + 1, ...extra }; };
const doorPortals = (t) => Object.fromEntries(Object.entries(TOWNS[t].doors).map(([id, [x, y]]) => [P(x, y), portal(id, 5, 6)]));

// ---------------------------------------------------------------- Haven Town
MAPS.haven = {
  name: 'Haven Town', kind: 'town', theme: 'town', music: 'town', rows: TOWNS.haven.rows, buildings: TOWNS.haven.buildings, spawn: { x: 12, y: 20 },
  portals: { [P(12, 21)]: portal('world', 7, 21), [P(13, 21)]: portal('world', 7, 21), ...doorPortals('haven') },
  decor: [],
  npcs: [
    { x: 11, y: 20, type: 'guard', name: 'Guard', text: ['Welcome to Haven! Heading out empty-handed? The Smithy is the shop with the sword sign, up the main street.', 'The Ashen Wyrm sleeps in the Ashen Cavern, east of here.', 'It is weak to ice. Bring a mage, or socket a Frost Gem into a fire skill!'] },
    { x: 6, y: 6, type: 'villager', name: 'Villager', quest: 'slimes', text: ['The road north is blocked by a rockslide. They say the Wyrm\'s roars shook the mountain loose.', 'Beat the beast and the pass should clear.'] },
    { x: 16, y: 10, type: 'kid', name: 'Child', text: ['Mister! Did you know a Wide Gem makes a single-target skill hit everyone?', 'Put one in your Heal skill... but it only heals for 60% of the usual power.'] },
    { x: 19, y: 6, type: 'villager2', name: 'Furrier', quest: 'wolves', text: ['Pro tip: the Guild lets you change jobs. A sub job lends you its skills (two levels behind) and its weapon types!'] },
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
  name: 'Frostholm', kind: 'town', theme: 'snowtown', music: 'frosttown', rows: TOWNS.frostholm.rows, buildings: TOWNS.frostholm.buildings, spawn: { x: 10, y: 16 },
  portals: { [P(10, 17)]: portal('world', 27, 9), [P(11, 17)]: portal('world', 27, 9), ...doorPortals('frostholm') },
  decor: [],
  npcs: [
    { x: 12, y: 16, type: 'guard', name: 'Guard', text: ['You cleared the pass? Then you\'re the ones who slew the Wyrm! Frostholm owes you.', 'The Frost Spire lies northeast. The Frost Titan within is weak to fire. Ice magic will barely scratch it.'] },
    { x: 16, y: 10, type: 'villager', name: 'Hunter', quest: 'yetis', text: ['Yetis and ice wolves roam the snow. Their hides are thick, but fire burns them well.', 'Fur armor from the forge resists ice, which helps a lot out there.'] },
    { x: 5, y: 13, type: 'kid', name: 'Child', text: ['I tried a Stun Gem on my snowball throw. Worked great! ...Mom says not to tell.'] },
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
  name: 'Mirewood', kind: 'town', theme: 'swamptown', music: 'town', rows: TOWNS.mirewood.rows, buildings: TOWNS.mirewood.buildings, spawn: { x: 10, y: 16 },
  portals: { [P(10, 17)]: portal('world', ...GEN.adj.mirewood), [P(11, 17)]: portal('world', ...GEN.adj.mirewood), ...doorPortals('mirewood') },
  decor: [],
  npcs: [
    { x: 12, y: 16, type: 'guard', name: 'Warden', quest: 'marsh', text: ['Welcome to Mirewood. Mind the bog after dark.'] },
    { x: 15, y: 9, type: 'fisher', name: 'Boatwright', quest: 'lantern', text: ['These planks have seen a hundred floods.'] },
    { x: 7, y: 11, type: 'kid', name: 'Child', text: ['The Sunken Crypt is full of skeletons! ...Allegedly. I\'m not allowed to go near it.'] },
    { x: 14, y: 11, type: 'villager2', name: 'Villager', text: ['Holy magic and fire both work wonders on the undead. Pack Phoenix Downs for the Lich King.'] },
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
  encByTile: { '.': 'world', ',': 'snow', ':': 'swamp' },
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
export const START = { map: 'haven', x: 12, y: 20 };
