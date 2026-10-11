// ===== Static game data: jobs, skills, gems, gear, enemies, maps =====
export const ELEMENTS = ['fire', 'ice', 'bolt', 'holy', 'dark'];
export const ELEM_ICON = { fire: '🔥', ice: '❄️', bolt: '⚡', holy: '✨', dark: '🌑' };

// ---- Skills. tgt: one|all|ally|allies|self. kind: phys|mag|heal|buff
const S = (name, mp, tgt, kind, pow, x = {}) => ({ name, mp, tgt, kind, pow, ...x });
export const SKILLS = {
  attack: S('Attack', 0, 'one', 'phys', 1.0),
  // weapon signature skills
  cleave: S('Cleave', 3, 'one', 'phys', 1.5),
  backstab: S('Backstab', 2, 'one', 'phys', 1.3, { pierce: 0.5 }),
  arcane: S('Arcane Bolt', 3, 'one', 'mag', 1.3),
  volley: S('Volley', 4, 'all', 'phys', 0.65),
  flurry: S('Flurry', 3, 'one', 'phys', 0.55, { hits: 3 }),
  lash: S('Lash', 2, 'one', 'phys', 0.9, { fx: ['slow'] }),
  reap: S('Reap', 3, 'one', 'phys', 1.2, { fx: ['drain'] }),
  grimoire: S('Grimoire', 3, 'one', 'mag', 1.3, { elem: 'random' }),
  punch: S('Punch', 0, 'one', 'phys', 1.0),
  // knight
  bulwark: S('Bulwark', 3, 'ally', 'buff', 0, { fx: ['defup'] }),
  shieldbash: S('Shield Bash', 4, 'one', 'phys', 1.2, { fx: ['slow'] }),
  holyblade: S('Holy Blade', 6, 'one', 'phys', 1.6, { elem: 'holy' }),
  rally: S('Rally', 8, 'allies', 'buff', 0, { fx: ['atkup'] }),
  judgment: S('Judgment', 12, 'all', 'phys', 1.2, { elem: 'holy' }),
  // rogue
  quickstab: S('Quickstab', 2, 'one', 'phys', 0.6, { hits: 2 }),
  venomedge: S('Venom Edge', 4, 'one', 'phys', 1.0, { fx: ['poison'] }),
  smokebomb: S('Smoke Bomb', 5, 'all', 'buff', 0, { fx: ['slow'], hostile: true }),
  shadowstep: S('Shadowstep', 8, 'one', 'phys', 2.2, { pierce: 0.6 }),
  assassinate: S('Assassinate', 14, 'one', 'phys', 3.2, { pierce: 0.8 }),
  // mage
  firebolt: S('Firebolt', 4, 'one', 'mag', 1.6, { elem: 'fire' }),
  chill: S('Chill', 5, 'one', 'mag', 1.5, { elem: 'ice', fx: ['slow'] }),
  spark: S('Spark', 5, 'one', 'mag', 1.6, { elem: 'bolt' }),
  inferno: S('Inferno', 10, 'all', 'mag', 1.1, { elem: 'fire' }),
  tempest: S('Tempest', 14, 'all', 'mag', 1.5, { elem: 'bolt' }),
  // cleric
  heal: S('Heal', 4, 'ally', 'heal', 2.0),
  smite: S('Smite', 4, 'one', 'mag', 1.4, { elem: 'holy' }),
  cureall: S('Cure All', 9, 'allies', 'heal', 1.2),
  revive: S('Revive', 12, 'ally', 'heal', 0, { fx: ['revive'] }),
  aegis: S('Aegis', 8, 'allies', 'buff', 0, { fx: ['defup'] }),
  // monk
  palm: S('Palm Strike', 2, 'one', 'phys', 1.4),
  focus: S('Focus', 3, 'self', 'buff', 0, { fx: ['atkup'] }),
  thunderfist: S('Thunderfist', 5, 'one', 'phys', 1.7, { elem: 'bolt' }),
  innerpeace: S('Inner Peace', 6, 'self', 'heal', 2.2),
  risingdragon: S('Rising Dragon', 10, 'one', 'phys', 2.6),
  // ranger
  aimed: S('Aimed Shot', 3, 'one', 'phys', 1.6),
  poisonarrow: S('Poison Arrow', 3, 'one', 'phys', 1.0, { fx: ['poison'] }),
  firearrow: S('Fire Arrow', 5, 'one', 'phys', 1.5, { elem: 'fire' }),
  rain: S('Rain of Arrows', 8, 'all', 'phys', 0.95),
  headshot: S('Headshot', 14, 'one', 'phys', 3.0, { pierce: 0.8 }),
  // hexer
  drain: S('Drain', 4, 'one', 'mag', 1.2, { elem: 'dark', fx: ['drain'] }),
  curse: S('Curse', 5, 'one', 'mag', 0.8, { elem: 'dark', fx: ['slow', 'poison'] }),
  shadowbolt: S('Shadow Bolt', 5, 'one', 'mag', 1.7, { elem: 'dark' }),
  deathcoil: S('Death Coil', 12, 'all', 'mag', 1.2, { elem: 'dark', fx: ['drain'] }),
  soulrend: S('Soul Rend', 18, 'one', 'mag', 3.4, { elem: 'dark' }),
  // bard
  hymn: S('Battle Hymn', 6, 'allies', 'buff', 0, { fx: ['atkup'] }),
  lullaby: S('Lullaby', 5, 'all', 'buff', 0, { fx: ['slow'], hostile: true }),
  mendsong: S('Mend Song', 7, 'allies', 'heal', 0.8),
  discord: S('Discord', 8, 'all', 'mag', 0.9, { elem: 'bolt' }),
  crescendo: S('Crescendo', 14, 'allies', 'buff', 0, { fx: ['atkup', 'defup'] }),
  // enemy-only
  tackle: S('Tackle', 0, 'one', 'phys', 1.0),
  bite: S('Bite', 0, 'one', 'phys', 1.15),
  venombite: S('Venom Bite', 0, 'one', 'phys', 0.9, { fx: ['poison'] }),
  slam: S('Slam', 0, 'one', 'phys', 1.7),
  fireball: S('Fireball', 0, 'one', 'mag', 1.4, { elem: 'fire' }),
  draintouch: S('Drain Touch', 0, 'one', 'mag', 1.1, { elem: 'dark', fx: ['drain'] }),
  claw: S('Rending Claw', 0, 'one', 'phys', 1.5),
  flamebreath: S('Flame Breath', 0, 'all', 'mag', 1.0, { elem: 'fire' }),
  tailsweep: S('Tail Sweep', 0, 'all', 'phys', 0.8),
};

export const WEAPON_TYPES = {
  sword: { name: 'Sword', sig: 'cleave' }, dagger: { name: 'Dagger', sig: 'backstab' },
  staff: { name: 'Staff', sig: 'arcane' }, bow: { name: 'Bow', sig: 'volley' },
  fists: { name: 'Fists', sig: 'flurry' }, whip: { name: 'Whip', sig: 'lash' },
  scythe: { name: 'Scythe', sig: 'reap' }, tome: { name: 'Tome', sig: 'grimoire' },
};

// ---- Jobs. skills: [skillId, unlockLevel]
export const JOBS = {
  knight: { name: 'Knight', icon: '🛡️', desc: 'Tough front-liner with holy blades.', mod: { hp: 1.35, mp: 0.6, atk: 1.2, def: 1.35, mag: 0.6, spd: 0.85 }, weapons: ['sword', 'scythe'], skills: [['bulwark', 1], ['shieldbash', 3], ['holyblade', 5], ['rally', 7], ['judgment', 9]] },
  rogue: { name: 'Rogue', icon: '🗡️', desc: 'Fast, armor-piercing, poisonous.', mod: { hp: 0.95, mp: 0.8, atk: 1.1, def: 0.9, mag: 0.7, spd: 1.5 }, weapons: ['dagger', 'bow'], skills: [['quickstab', 1], ['venomedge', 3], ['smokebomb', 4], ['shadowstep', 6], ['assassinate', 9]] },
  mage: { name: 'Mage', icon: '🔮', desc: 'Elemental spells, fragile.', mod: { hp: 0.7, mp: 1.8, atk: 0.55, def: 0.65, mag: 1.5, spd: 1.0 }, weapons: ['staff', 'tome'], skills: [['firebolt', 1], ['chill', 2], ['spark', 3], ['inferno', 5], ['tempest', 8]] },
  cleric: { name: 'Cleric', icon: '✝️', desc: 'Healing, revival and holy magic.', mod: { hp: 0.95, mp: 1.5, atk: 0.8, def: 1.0, mag: 1.3, spd: 0.95 }, weapons: ['staff', 'fists'], skills: [['heal', 1], ['smite', 2], ['cureall', 4], ['revive', 5], ['aegis', 6]] },
  monk: { name: 'Monk', icon: '👊', desc: 'Bare-knuckle brawler with great HP.', mod: { hp: 1.4, mp: 0.8, atk: 1.3, def: 1.0, mag: 0.7, spd: 1.2 }, weapons: ['fists', 'whip'], skills: [['palm', 1], ['focus', 2], ['thunderfist', 4], ['innerpeace', 5], ['risingdragon', 7]] },
  ranger: { name: 'Ranger', icon: '🏹', desc: 'Ranged hunter, hits groups.', mod: { hp: 1.0, mp: 0.9, atk: 1.2, def: 0.95, mag: 0.8, spd: 1.3 }, weapons: ['bow', 'dagger'], skills: [['aimed', 1], ['poisonarrow', 2], ['firearrow', 3], ['rain', 4], ['headshot', 8]] },
  hexer: { name: 'Hexer', icon: '💀', desc: 'Dark magic, drains life.', mod: { hp: 0.8, mp: 1.6, atk: 0.7, def: 0.75, mag: 1.4, spd: 1.0 }, weapons: ['tome', 'scythe'], skills: [['drain', 1], ['curse', 2], ['shadowbolt', 3], ['deathcoil', 6], ['soulrend', 9]] },
  bard: { name: 'Bard', icon: '🎵', desc: 'Buffs the party, debuffs foes.', mod: { hp: 0.9, mp: 1.3, atk: 0.8, def: 0.85, mag: 1.1, spd: 1.25 }, weapons: ['whip', 'sword'], skills: [['hymn', 1], ['lullaby', 2], ['mendsong', 3], ['discord', 4], ['crescendo', 7]] },
};

// ---- Gems: socketed into a skill slot to rewrite it.
export const GEMS = {
  fire: { name: 'Fire Gem', desc: 'Converts skill to Fire', elem: 'fire', price: 200 },
  frost: { name: 'Frost Gem', desc: 'Converts skill to Ice', elem: 'ice', price: 200 },
  bolt: { name: 'Bolt Gem', desc: 'Converts skill to Bolt', elem: 'bolt', price: 200 },
  holy: { name: 'Holy Gem', desc: 'Converts skill to Holy', elem: 'holy', price: 250 },
  shadow: { name: 'Shadow Gem', desc: 'Converts skill to Dark', elem: 'dark', price: 250 },
  chain: { name: 'Chain Gem', desc: 'Also hits another foe at 50%', price: 350 },
  echo: { name: 'Echo Gem', desc: '35% chance to cast again free', price: 500 },
  vamp: { name: 'Vampiric Gem', desc: 'Heal for 35% of damage dealt', price: 300 },
  pierce: { name: 'Piercing Gem', desc: 'Ignore 50% of defense', price: 250 },
  thrifty: { name: 'Thrifty Gem', desc: 'Half MP cost', price: 250 },
  overcharge: { name: 'Overcharge Gem', desc: '+50% power, +50% MP', price: 300 },
  wide: { name: 'Wide Gem', desc: 'Targets all, at 60% power', price: 400 },
  venom: { name: 'Venom Gem', desc: 'Also poisons', price: 200 },
  swift: { name: 'Swift Gem', desc: 'Acts first in the round', price: 300 },
  focusg: { name: 'Focus Gem', desc: '+25% power', price: 250 },
};

// ---- Gear. Stat keys (hp mp atk def mag spd) add directly. innate = free gem on signature skill.
const W = (name, type, atk, mag, sockets, price, innate) => ({ name, type, atk, mag, sockets, price, innate });
export const WEAPONS = {
  iron_sword: W('Iron Sword', 'sword', 8, 0, 1, 80), flame_brand: W('Flame Brand', 'sword', 14, 0, 2, 320, 'fire'), dragonbane: W('Dragonbane', 'sword', 26, 0, 3, 0, 'pierce'),
  bronze_dirk: W('Bronze Dirk', 'dagger', 5, 0, 1, 60), viper_fang: W('Viper Fang', 'dagger', 9, 0, 2, 260, 'venom'), shadow_edge: W('Shadow Edge', 'dagger', 17, 0, 3, 0, 'swift'),
  oak_staff: W('Oak Staff', 'staff', 2, 6, 1, 70), storm_rod: W('Storm Rod', 'staff', 3, 12, 2, 300, 'bolt'), archmage_staff: W('Archmage Staff', 'staff', 4, 21, 3, 0, 'echo'),
  short_bow: W('Short Bow', 'bow', 7, 0, 1, 80), hunter_bow: W('Hunter Bow', 'bow', 12, 0, 2, 300, 'chain'),
  iron_knuckle: W('Iron Knuckle', 'fists', 7, 0, 1, 70), thunder_claw: W('Thunder Claw', 'fists', 13, 0, 2, 300, 'bolt'),
  leather_whip: W('Leather Whip', 'whip', 6, 2, 1, 70), serpent_lash: W('Serpent Lash', 'whip', 11, 4, 2, 280, 'venom'),
  rusty_scythe: W('Rusty Scythe', 'scythe', 8, 3, 1, 90), soul_reaper: W('Soul Reaper', 'scythe', 15, 8, 2, 0, 'vamp'),
  dusty_tome: W('Dusty Tome', 'tome', 1, 7, 1, 80), frost_codex: W('Frost Codex', 'tome', 2, 13, 2, 300, 'frost'), void_grimoire: W('Void Grimoire', 'tome', 3, 21, 3, 0, 'shadow'),
};
export const ARMORS = {
  cloth: { name: 'Cloth Robe', def: 3, sockets: 0, price: 40 }, leather: { name: 'Leather Vest', def: 6, hp: 5, sockets: 0, price: 90 },
  chain: { name: 'Chain Mail', def: 10, hp: 10, sockets: 0, price: 220 }, plate: { name: 'Plate Armor', def: 16, hp: 20, spd: -1, sockets: 1, price: 480 },
  mage_cloak: { name: 'Mage Cloak', def: 4, mp: 15, mag: 3, sockets: 1, price: 260 }, dragon_mail: { name: 'Dragon Mail', def: 24, hp: 35, sockets: 2, res: ['fire'], price: 0 },
};
export const ACCS = {
  power_ring: { name: 'Power Ring', atk: 4, sockets: 0, price: 200 }, ward_amulet: { name: 'Ward Amulet', def: 4, sockets: 0, price: 200 },
  mana_charm: { name: 'Mana Charm', mp: 15, mag: 3, sockets: 0, price: 220 }, swift_boots: { name: 'Swift Boots', spd: 4, sockets: 0, price: 240 },
  socket_jewel: { name: 'Socket Jewel', sockets: 2, price: 450 }, fire_pendant: { name: 'Fire Pendant', res: ['fire'], def: 2, sockets: 0, price: 180 },
  frost_pendant: { name: 'Frost Pendant', res: ['ice'], def: 2, sockets: 0, price: 180 },
};
export const ITEMS = {
  potion: { name: 'Potion', heal: 60, price: 30, desc: 'Restore 60 HP' }, hipotion: { name: 'Hi-Potion', heal: 160, price: 90, desc: 'Restore 160 HP' },
  ether: { name: 'Ether', mpr: 30, price: 70, desc: 'Restore 30 MP' }, phoenix: { name: 'Phoenix Down', revive: 0.35, price: 150, desc: 'Revive an ally' },
};

// ---- Enemies. skills: [[skillId, weight]]
const E = (name, icon, hp, atk, def, mag, spd, exp, gold, skills, x = {}) => ({ name, icon, hp, atk, def, mag, spd, exp, gold, skills, weak: [], res: [], ...x });
export const ENEMIES = {
  slime: E('Slime', '🟢', 42, 9, 1, 4, 4, 9, 8, [['tackle', 1]], { weak: ['fire'] }),
  goblin: E('Goblin', '👺', 58, 13, 3, 4, 7, 14, 14, [['tackle', 2], ['bite', 1]]),
  wolf: E('Wolf', '🐺', 62, 15, 2, 3, 11, 18, 12, [['bite', 2], ['venombite', 1]], { weak: ['fire'] }),
  bat: E('Cave Bat', '🦇', 110, 24, 4, 6, 14, 42, 28, [['bite', 2], ['venombite', 1]], { weak: ['bolt'] }),
  skeleton: E('Skeleton', '💀', 175, 30, 9, 5, 8, 58, 40, [['tackle', 2], ['slam', 1]], { weak: ['holy', 'fire'], res: ['dark'] }),
  imp: E('Fire Imp', '👹', 140, 14, 5, 30, 10, 60, 45, [['fireball', 3], ['tackle', 1]], { weak: ['ice'], res: ['fire'] }),
  golem: E('Stone Golem', '🗿', 340, 42, 20, 4, 3, 100, 70, [['slam', 3], ['tackle', 1]], { weak: ['bolt'], res: ['fire', 'ice'] }),
  wraith: E('Wraith', '👻', 210, 12, 8, 34, 12, 90, 65, [['draintouch', 2], ['fireball', 1]], { weak: ['holy'], res: ['dark'] }),
  wyrm: E('Ashen Wyrm', '🐉', 1100, 40, 14, 38, 9, 600, 800, [['claw', 3], ['flamebreath', 2], ['tailsweep', 2]], { weak: ['ice'], res: ['fire'], boss: true }),
};
export const ENCOUNTERS = {
  world: [['slime'], ['slime', 'slime'], ['goblin'], ['goblin', 'slime'], ['wolf'], ['wolf', 'wolf'], ['goblin', 'goblin', 'wolf']],
  dungeon: [['bat', 'bat'], ['skeleton'], ['skeleton', 'bat'], ['imp', 'imp'], ['golem'], ['wraith', 'bat'], ['skeleton', 'imp', 'wraith'], ['imp', 'wraith']],
};
export const DROPS = { // enemy -> [chance, kind, id]
  slime: [0.08, 'items', 'potion'], goblin: [0.08, 'gems', 'thrifty'], wolf: [0.08, 'gems', 'venom'], bat: [0.1, 'gems', 'swift'],
  skeleton: [0.1, 'gems', 'holy'], imp: [0.1, 'gems', 'overcharge'], golem: [0.2, 'gems', 'wide'], wraith: [0.15, 'gems', 'shadow'],
};

// ---- Maps. Legend: # wall . floor T tree ~ water M mountain H town D dungeon S shop I inn G guild E exit C chest X boss
export const MAPS = {
  world: { name: 'Greenmarch', enc: 'world', rate: 0.07, rows: [
    '~~~~~~~~~~~~~~~~~~~~~~~~', '~~....TT........MM..~~~~', '~..TT.....TTT...MMM..~~~', '~..T...H......TT.MM..~~~',
    '~.....TT..........M...~~', '~...~~~...TT...........~', '~..~~~~~.......TTT.....~', '~..~~~~~....T..........~',
    '~...~~~.....TT.....D...~', '~.......TT.......MM....~', '~..TT.........T..MMM...~', '~..TTT...~~~..TT.......~',
    '~.....~~~~~~...........~', '~~.....~~~~.........~~~~', '~~~~................~~~~', '~~~~~~~~~~~~~~~~~~~~~~~~'] },
  town: { name: 'Haven Town', enc: null, rows: [
    '##############', '#............#', '#..S...I..G..#', '#............#', '#............#', '#............#', '#............#', '######E#######'] },
  dungeon: { name: 'Ashen Cavern', enc: 'dungeon', rate: 0.09, rows: [
    '####################', '#E.................#', '#.####..####..####.#', '#.#C.....#..#....#.#', '#.#......#..#.C..#.#',
    '#.####.###..###.##.#', '#......#......#....#', '#.####.#.####.#.##.#', '#.#C...#.#..#.#.#C.#', '#.#.####.#..#...#..#',
    '#.#......#..#####..#', '#.######.#.........#', '#........#####X###.#', '####################'] },
};
export const CHESTS = {
  'dungeon:3,3': { gems: ['echo'] }, 'dungeon:14,4': { weapons: ['shadow_edge'] }, 'dungeon:3,8': { weapons: ['archmage_staff'], gold: 200 },
  'dungeon:17,8': { weapons: ['void_grimoire'], gems: ['chain'] },
};
