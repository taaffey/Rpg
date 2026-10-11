// ===== World definition: maps, portals, NPCs, chests, bosses =====
// Tile legend (visual + rules):
//   outdoor: . grass  , snow  : swamp  _ path  = bridge  ~ water  T/t tree  M mountain  B rockslide(gate)  H town  D dungeon
//   town/interior: . floor  # wall  H door  E exit  C chest      dungeon: . floor  # wall  E exit  C chest  X boss
// Anything not listed in WALK blocks movement. Portals/NPCs/decor/chests live in per-map lists keyed by coordinates.
import { GEN } from './mapgen.js';

export const WALK = new Set(['.', ',', ':', '_', '=', 'H', 'D', 'E', 'X']);
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

// ---------------------------------------------------------------- Haven Town
const HAVEN = [
  '####################', '#..................#', '#..H...H...H...H...#', '#..................#', '#..................#', '#.....H.......H....#', '#..................#',
  '#..................#', '#..................#', '#..................#', '#..................#', '#..................#', '#########E##########'];
MAPS.haven = {
  name: 'Haven Town', kind: 'town', theme: 'town', music: 'town', rows: HAVEN, spawn: { x: 9, y: 11 },
  portals: {
    [P(9, 12)]: portal('world', 7, 21), [P(3, 2)]: portal('haven_inn', 5, 6), [P(7, 2)]: portal('haven_shop', 5, 6), [P(11, 2)]: portal('haven_smith', 5, 6),
    [P(15, 2)]: portal('haven_guild', 5, 6), [P(6, 5)]: portal('haven_elder', 5, 6), [P(14, 5)]: portal('haven_cottage', 5, 6),
  },
  decor: [[1, 1, 'tree'], [18, 1, 'tree'], [1, 11, 'tree'], [18, 11, 'tree'], [3, 9, 'tree'], [16, 9, 'tree'], [5, 4, 'lamp'], [13, 4, 'lamp'], [8, 7, 'lamp'], [10, 7, 'lamp']],
  npcs: [
    { x: 11, y: 10, type: 'guard', name: 'Guard', text: ['Welcome to Haven! The Ashen Wyrm sleeps in the Ashen Cavern, east of here.', 'It is weak to ice. Bring a mage, or socket a Frost Gem into a fire skill!'] },
    { x: 4, y: 7, type: 'villager', name: 'Villager', quest: 'slimes', text: ['The road north is blocked by a rockslide. They say the Wyrm\'s roars shook the mountain loose.', 'Beat the beast and the pass should clear.'] },
    { x: 15, y: 8, type: 'kid', name: 'Child', text: ['Mister! Did you know a Wide Gem makes a single-target skill hit everyone?', 'Put one in your Heal skill... but it only heals for 60% of the usual power.'] },
    { x: 9, y: 4, type: 'villager2', name: 'Furrier', quest: 'wolves', text: ['Pro tip: the Guild lets you change jobs. A sub job lends you its skills (two levels behind) and its weapon types!'] },
  ],
};
interior('haven_inn', 'Haven Inn', 'inn', { map: 'haven', x: 3, y: 3 }, { cost: 25, npcs: [{ x: 8, y: 5, type: 'villager', name: 'Patron', text: ['*hic* The swamp south of town hides a Sunken Crypt. Undead everywhere. Bring holy magic!'] }] });
interior('haven_shop', 'Haven General Store', 'general', { map: 'haven', x: 7, y: 3 }, { shop: 'haven_general' });
interior('haven_smith', 'Haven Smithy', 'smith', { map: 'haven', x: 11, y: 3 }, { shop: 'haven_smith' });
interior('haven_guild', 'Adventurer\'s Guild', 'guild', { map: 'haven', x: 15, y: 3 });
interior('haven_elder', 'Elder\'s House', 'house', { map: 'haven', x: 6, y: 6 }, { npcs: [{ x: 4, y: 3, type: 'elder', name: 'Elder', text: ['Long ago the smith Gemforge learned that gems hold more than power: they hold intent.', 'Socket one into a skill and the skill itself changes. A thrifty gem halves its cost, an echo gem may repeat it.', 'Three great evils stir: the Ashen Wyrm in the cavern, the Lich King in the Sunken Crypt, and the Frost Titan atop the Frost Spire.', 'Defeat all three, and Haven will sing of you forever.'] }] });
interior('haven_cottage', 'Fisher\'s Cottage', 'house', { map: 'haven', x: 14, y: 6 }, { npcs: [{ x: 4, y: 3, type: 'fisher', name: 'Fisher', quest: 'heirloom', text: ['Caught nothing today. The lakes are quiet.', 'Feel free to take what\'s in the chest. I\'ve no use for it.'] }], chest: [9, 5, { gold: 150, items: { potion: 3 } }] });

// ---------------------------------------------------------------- Frostholm
const FROST = [
  '##################', '#................#', '#..H...H...H..H..#', '#................#', '#................#', '#....H...........#', '#................#',
  '#................#', '#................#', '#................#', '#................#', '########E#########'];
MAPS.frostholm = {
  name: 'Frostholm', kind: 'town', theme: 'snowtown', music: 'frosttown', rows: FROST, spawn: { x: 8, y: 10 },
  portals: {
    [P(8, 11)]: portal('world', 27, 9), [P(3, 2)]: portal('frost_inn', 5, 6), [P(7, 2)]: portal('frost_shop', 5, 6), [P(11, 2)]: portal('frost_smith', 5, 6),
    [P(14, 2)]: portal('frost_guild', 5, 6), [P(5, 5)]: portal('frost_house', 5, 6),
  },
  decor: [[1, 1, 'snowtree'], [16, 1, 'snowtree'], [1, 10, 'snowtree'], [16, 10, 'snowtree'], [3, 8, 'snowtree'], [14, 8, 'snowtree'], [4, 4, 'lamp'], [12, 4, 'lamp'], [7, 8, 'lamp'], [10, 8, 'lamp']],
  npcs: [
    { x: 10, y: 9, type: 'guard', name: 'Guard', text: ['You cleared the pass? Then you\'re the ones who slew the Wyrm! Frostholm owes you.', 'The Frost Spire lies northeast. The Frost Titan within is weak to fire. Ice magic will barely scratch it.'] },
    { x: 13, y: 6, type: 'villager', name: 'Hunter', quest: 'yetis', text: ['Yetis and ice wolves roam the snow. Their hides are thick, but fire burns them well.', 'Fur armor from the forge resists ice, which helps a lot out there.'] },
    { x: 4, y: 7, type: 'kid', name: 'Child', text: ['I tried a Stun Gem on my snowball throw. Worked great! ...Mom says not to tell.'] },
  ],
};
interior('frost_inn', 'Frostholm Inn', 'inn', { map: 'frostholm', x: 3, y: 3, theme: 'interior', music: 'frosttown' }, { cost: 60, npcs: [{ x: 8, y: 5, type: 'fisher', name: 'Traveler', text: ['The Lich King\'s crypt is no joke. Bring Revive and a few Phoenix Downs.'] }] });
interior('frost_shop', 'Frostholm Provisions', 'general', { map: 'frostholm', x: 7, y: 3, music: 'frosttown' }, { shop: 'frost_general' });
interior('frost_smith', 'Frostholm Forge', 'smith', { map: 'frostholm', x: 11, y: 3, music: 'frosttown' }, { shop: 'frost_smith' });
interior('frost_guild', 'Frostholm Guild', 'guild', { map: 'frostholm', x: 14, y: 3, music: 'frosttown' });
interior('frost_house', 'Old Hunter\'s Lodge', 'house', { map: 'frostholm', x: 5, y: 6, music: 'frosttown' }, { npcs: [{ x: 4, y: 3, type: 'elder', name: 'Old Hunter', quest: 'stormdrake', text: ['The Frost Titan was a mountain once, they say, until an ancient gem woke it.', 'Gems are dangerous things. Use them wisely, adventurers.'] }], chest: [9, 5, { gems: ['guard'], gold: 400 }] });

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
const MIRE = [
  '##################', '#................#', '#..H...H...H..H..#', '#................#', '#................#', '#.....H..........#', '#................#',
  '#................#', '#................#', '#................#', '########E#########'];
MAPS.mirewood = {
  name: 'Mirewood', kind: 'town', theme: 'swamptown', music: 'town', rows: MIRE, spawn: { x: 8, y: 9 },
  portals: {
    [P(8, 10)]: portal('world', ...GEN.adj.mirewood), [P(3, 2)]: portal('mire_inn', 5, 6), [P(7, 2)]: portal('mire_shop', 5, 6), [P(11, 2)]: portal('mire_guild', 5, 6),
    [P(14, 2)]: portal('mire_house', 5, 6), [P(6, 5)]: portal('mire_hut', 5, 6),
  },
  decor: [[1, 1, 'tree'], [16, 1, 'tree'], [1, 9, 'tree'], [16, 9, 'tree'], [4, 8, 'barrel'], [13, 8, 'barrel'], [4, 4, 'lamp'], [12, 4, 'lamp'], [7, 7, 'lamp'], [10, 7, 'lamp']],
  npcs: [
    { x: 10, y: 8, type: 'guard', name: 'Warden', quest: 'marsh', text: ['Welcome to Mirewood. Mind the bog after dark.'] },
    { x: 14, y: 6, type: 'fisher', name: 'Boatwright', quest: 'lantern', text: ['These planks have seen a hundred floods.'] },
    { x: 3, y: 6, type: 'kid', name: 'Child', text: ['The Sunken Crypt is full of skeletons! ...Allegedly. I\'m not allowed to go near it.'] },
    { x: 12, y: 5, type: 'villager2', name: 'Villager', text: ['Holy magic and fire both work wonders on the undead. Pack Phoenix Downs for the Lich King.'] },
  ],
};
interior('mire_inn', 'Mirewood Inn', 'inn', { map: 'mirewood', x: 3, y: 3 }, { cost: 40 });
interior('mire_shop', 'Mirewood Trading Post', 'general', { map: 'mirewood', x: 7, y: 3 }, { shop: 'mire_general' });
interior('mire_guild', 'Mirewood Guild', 'guild', { map: 'mirewood', x: 11, y: 3 });
interior('mire_house', 'Warden\'s House', 'house', { map: 'mirewood', x: 14, y: 3 }, { npcs: [{ x: 4, y: 3, type: 'guard', name: 'Retired Warden', text: ['Forty years I kept watch here. The marsh is patient. It waits for you to slip.', 'Take the chest, friend. I\'ve no use for gold anymore.'] }], chest: [9, 5, { gold: 250, gems: ['venom'] }] });
interior('mire_hut', 'Hermit\'s Hut', 'house', { map: 'mirewood', x: 6, y: 6 }, { npcs: [{ x: 4, y: 3, type: 'elder', name: 'Hermit', text: ['Gems whisper to those who listen. A Siphon Gem on a big spell turns your damage into mana.', 'Stack Stun on a quick skill and even a boss may lose a turn... unless it is too proud to fall for it.'] }], chest: [9, 5, { items: { phoenix: 2, megaether: 1 } }] });

// ---------------------------------------------------------------- overworld
const [mx, my] = GEN.pois.mirewood, [tx, ty] = GEN.pois.storm, [hx, hy] = GEN.pois.haven, [fx, fy] = GEN.pois.frost, [cx, cy] = GEN.pois.cavern, [rx, ry] = GEN.pois.crypt, [sx, sy] = GEN.pois.spire;
MAPS.world = {
  name: 'Greenmarch', kind: 'outdoor', theme: 'world', music: 'world', rows: GEN.world, spawn: { x: hx, y: hy + 1 }, fog: 5, rate: 0.07,
  encByTile: { '.': 'world', ',': 'snow', ':': 'swamp' },
  portals: {
    [P(hx, hy)]: portal('haven', 9, 11), [P(fx, fy)]: portal('frostholm', 8, 10), [P(cx, cy)]: portal('cavern', 2, 1),
    [P(rx, ry)]: portal('crypt', GEN.cryptInfo.spawn[0], GEN.cryptInfo.spawn[1]), [P(sx, sy)]: portal('spire', GEN.spireInfo.spawn[0], GEN.spireInfo.spawn[1]),
    [P(mx, my)]: portal('mirewood', 8, 9), [P(tx, ty)]: portal('storm', GEN.stormInfo.spawn[0], GEN.stormInfo.spawn[1]),
  },
  places: [[hx, hy, 'Haven Town'], [fx, fy, 'Frostholm'], [cx, cy, 'Ashen Cavern'], [rx, ry, 'Sunken Crypt'], [sx, sy, 'Frost Spire'], [mx, my, 'Mirewood'], [tx, ty, 'Storm Cavern']],
};
// the northern pass is gated until the Ashen Wyrm falls
MAPS.world.gate = { tile: 'B', flag: 'wyrm' };
export const START = { map: 'haven', x: 9, y: 11 };
