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

// =====================================================================
// ===== Expansion content: new jobs, gems, gear, enemies, bosses, shops =====
// =====================================================================
export const BOSSES = {
  wyrm: { name: 'Ashen Wyrm', intro: 'The Ashen Wyrm awakens!', loot: { weapons: ['dragonbane'], armors: ['dragon_mail'] }, unlock: 'The rockslide on the northern pass has been cleared by the Wyrm\'s fall. Frostholm lies beyond.' },
  lich: { name: 'Lich King Morvath', intro: 'The Lich King rises from his sarcophagus...', loot: { weapons: ['lich_staff'], armors: ['lich_robes'], gems: ['siphon'] } },
  titan: { name: 'Frost Titan', intro: 'The Frost Titan shakes the spire awake!', loot: { weapons: ['titan_axe'], armors: ['titan_plate'], gems: ['execute'] }, final: true },
};

Object.assign(SKILLS, {
  chop: S('Chop', 3, 'one', 'phys', 1.6, { pierce: 0.25 }),
  // berserker
  rage: S('Rage', 3, 'self', 'buff', 0, { fx: ['atkup'] }),
  hew: S('Hew', 4, 'one', 'phys', 1.8, { pierce: 0.3 }),
  whirlwind: S('Whirlwind', 8, 'all', 'phys', 1.0),
  bloodlust: S('Bloodlust', 6, 'one', 'phys', 1.5, { fx: ['drain'] }),
  execution: S('Execution', 16, 'one', 'phys', 3.6),
  // alchemist
  acidflask: S('Acid Flask', 4, 'one', 'mag', 1.4, { fx: ['poison'] }),
  tonic: S('Tonic', 3, 'ally', 'heal', 1.4),
  frostflask: S('Frost Flask', 6, 'one', 'mag', 1.7, { elem: 'ice', fx: ['slow'] }),
  fireflask: S('Fire Flask', 9, 'all', 'mag', 1.0, { elem: 'fire' }),
  panacea: S('Panacea', 10, 'allies', 'heal', 0.8, { fx: ['defup'] }),
  philosopher: S('Philosopher\'s Fire', 18, 'all', 'mag', 1.9, { elem: 'fire' }),
  // enemy-only
  hexbolt: S('Hex Bolt', 0, 'one', 'mag', 1.3, { elem: 'dark', fx: ['slow'] }),
  frostbite: S('Frostbite', 0, 'one', 'phys', 1.1, { elem: 'ice', fx: ['slow'] }),
  blizzard: S('Blizzard', 0, 'all', 'mag', 1.0, { elem: 'ice' }),
  icebolt: S('Ice Bolt', 0, 'one', 'mag', 1.5, { elem: 'ice' }),
  titanfist: S('Titan Fist', 0, 'one', 'phys', 1.9),
  icicle: S('Icicle Storm', 0, 'one', 'mag', 1.5, { elem: 'ice', fx: ['slow'] }),
  soulstorm: S('Soul Storm', 0, 'all', 'mag', 0.9, { elem: 'dark', fx: ['slow'] }),
  rot: S('Rotting Claw', 0, 'one', 'phys', 1.0, { fx: ['poison'] }),
});
WEAPON_TYPES.axe = { name: 'Axe', sig: 'chop' };
Object.assign(JOBS, {
  berserker: { name: 'Berserker', icon: '🪓', desc: 'Reckless axe fighter with huge damage and lifesteal.', mod: { hp: 1.5, mp: 0.45, atk: 1.45, def: 1.0, mag: 0.4, spd: 0.95 }, weapons: ['axe', 'sword'], skills: [['rage', 1], ['hew', 2], ['whirlwind', 4], ['bloodlust', 6], ['execution', 9]] },
  alchemist: { name: 'Alchemist', icon: '⚗️', desc: 'Flasks, tonics and elemental concoctions.', mod: { hp: 0.85, mp: 1.4, atk: 0.7, def: 0.8, mag: 1.25, spd: 1.15 }, weapons: ['tome', 'dagger'], skills: [['acidflask', 1], ['tonic', 2], ['frostflask', 3], ['fireflask', 4], ['panacea', 6], ['philosopher', 9]] },
});
Object.assign(GEMS, {
  stun: { name: 'Stun Gem', desc: '35% chance to stun foes (skip their next turn)', price: 600 },
  execute: { name: 'Executioner Gem', desc: '+60% damage to foes below 35% HP', price: 700 },
  berserk: { name: 'Berserk Gem', desc: '+40% power, but costs you 8% max HP', price: 450 },
  siphon: { name: 'Siphon Gem', desc: 'Restore MP equal to 15% of damage dealt', price: 650 },
  guard: { name: 'Guard Gem', desc: 'You gain a Guard buff after using the skill', price: 400 },
  crit: { name: 'Crit Gem', desc: '25% chance to deal 180% damage', price: 550 },
});
const W2 = (name, type, atk, mag, sockets, price, innate) => ({ name, type, atk, mag, sockets, price, innate });
Object.assign(WEAPONS, {
  hand_axe: W2('Hand Axe', 'axe', 9, 0, 1, 90), battle_axe: W2('Battle Axe', 'axe', 16, 0, 2, 420, 'crit'), war_axe: W2('War Axe', 'axe', 24, 0, 2, 900, 'berserk'), titan_axe: W2('Titan Axe', 'axe', 36, 0, 3, 0, 'execute'),
  mythril_sword: W2('Mythril Sword', 'sword', 19, 0, 2, 760), frostbrand: W2('Frostbrand', 'sword', 24, 0, 2, 1150, 'frost'),
  stiletto: W2('Stiletto', 'dagger', 13, 0, 2, 680, 'pierce'), sage_staff: W2('Sage Staff', 'staff', 4, 18, 2, 740), lich_staff: W2('Lich Staff', 'staff', 5, 30, 3, 0, 'shadow'),
  longbow: W2('Longbow', 'bow', 17, 0, 2, 740), frost_bow: W2('Frost Bow', 'bow', 22, 0, 2, 1050, 'frost'),
  steel_fist: W2('Steel Fist', 'fists', 16, 0, 2, 700), thorn_whip: W2('Thorn Whip', 'whip', 14, 7, 2, 700), grave_scythe: W2('Grave Scythe', 'scythe', 19, 11, 2, 950, 'vamp'),
  arcane_tome: W2('Arcane Tome', 'tome', 3, 19, 2, 800), blizzard_tome: W2('Blizzard Tome', 'tome', 3, 25, 2, 1150, 'frost'),
});
Object.assign(ARMORS, {
  mythril_mail: { name: 'Mythril Mail', def: 22, hp: 25, sockets: 1, price: 820 }, frost_robe: { name: 'Frost Robe', def: 10, mp: 25, mag: 6, res: ['ice'], sockets: 1, price: 740 },
  yeti_fur: { name: 'Yeti Fur', def: 14, hp: 30, res: ['ice'], sockets: 0, price: 620 }, lich_robes: { name: 'Lich Robes', def: 15, mp: 35, mag: 11, sockets: 2, res: ['dark'], price: 0 },
  titan_plate: { name: 'Titan Plate', def: 36, hp: 55, spd: -2, sockets: 2, res: ['fire', 'ice'], price: 0 },
});
Object.assign(ACCS, {
  sage_ring: { name: 'Sage Ring', mag: 8, mp: 20, sockets: 0, price: 760 }, berserk_ring: { name: 'Berserk Ring', atk: 9, def: -2, sockets: 0, price: 700 },
  life_charm: { name: 'Life Charm', hp: 45, sockets: 0, price: 680 }, gem_crown: { name: 'Gem Crown', sockets: 3, price: 1600 },
  lich_ring: { name: 'Lich Ring', mag: 6, spd: 3, res: ['dark'], sockets: 1, price: 900 },
});
Object.assign(ITEMS, { megaether: { name: 'Mega Ether', mpr: 80, price: 220, desc: 'Restore 80 MP' }, elixir: { name: 'Elixir', heal: 600, price: 400, desc: 'Restore 600 HP' } });

// enemies (sprites for variants are recolors defined in sprites.js)
Object.assign(ENEMIES, {
  bog_slime: E('Bog Slime', '🟣', 130, 24, 6, 12, 6, 55, 30, [['tackle', 2], ['venombite', 1]], { weak: ['fire'] }),
  mire_wolf: E('Mire Wolf', '🐺', 160, 31, 7, 5, 12, 62, 34, [['bite', 2], ['venombite', 2]], { weak: ['fire'] }),
  zombie: E('Zombie', '🧟', 210, 32, 8, 5, 3, 68, 38, [['slam', 2], ['rot', 2]], { weak: ['fire', 'holy'], res: ['dark'] }),
  skeleton_knight: E('Skeleton Knight', '💀', 330, 48, 20, 6, 9, 130, 72, [['slam', 2], ['tackle', 2]], { weak: ['holy', 'bolt'], res: ['dark'] }),
  ghoul: E('Ghoul', '🧟', 300, 50, 11, 8, 11, 130, 70, [['rot', 2], ['bite', 2]], { weak: ['fire', 'holy'], res: ['dark'] }),
  wraith_elder: E('Wraith Elder', '👻', 240, 12, 11, 52, 13, 140, 78, [['hexbolt', 2], ['draintouch', 2]], { weak: ['holy'], res: ['dark'] }),
  bone_mage: E('Bone Mage', '💀', 210, 12, 9, 56, 11, 135, 76, [['hexbolt', 3], ['fireball', 1]], { weak: ['holy'], res: ['dark'] }),
  lich: E('Lich King Morvath', '☠️', 2250, 43, 17, 56, 10, 1500, 1500, [['hexbolt', 3], ['draintouch', 2], ['soulstorm', 2], ['slam', 1]], { weak: ['holy', 'fire'], res: ['dark'], boss: true }),
  ice_wolf: E('Ice Wolf', '🐺', 270, 52, 11, 6, 15, 150, 80, [['frostbite', 3], ['bite', 1]], { weak: ['fire'], res: ['ice'] }),
  yeti: E('Yeti', '🦍', 440, 58, 16, 6, 7, 165, 90, [['slam', 2], ['claw', 2]], { weak: ['fire'], res: ['ice'] }),
  frost_goblin: E('Frost Goblin', '👺', 250, 48, 10, 8, 10, 140, 76, [['tackle', 2], ['frostbite', 1]], { weak: ['fire'], res: ['ice'] }),
  ice_golem: E('Ice Golem', '🗿', 680, 66, 30, 6, 4, 230, 120, [['slam', 3], ['icicle', 1]], { weak: ['fire', 'bolt'], res: ['ice'] }),
  frost_wraith: E('Frost Wraith', '👻', 360, 14, 14, 66, 14, 230, 118, [['blizzard', 1], ['icebolt', 2], ['draintouch', 1]], { weak: ['fire', 'holy'], res: ['ice'] }),
  ice_imp: E('Ice Imp', '👹', 330, 16, 12, 62, 12, 215, 112, [['icebolt', 3], ['tackle', 1]], { weak: ['fire'], res: ['ice'] }),
  frozen_knight: E('Frozen Knight', '💀', 520, 70, 28, 8, 9, 245, 126, [['slam', 2], ['frostbite', 2]], { weak: ['fire', 'holy'], res: ['ice'] }),
  titan: E('Frost Titan', '🧊', 3600, 68, 24, 62, 8, 3000, 2500, [['titanfist', 3], ['blizzard', 2], ['icicle', 2]], { weak: ['fire'], res: ['ice'], boss: true }),
});
// enemy ids that already exist keep BOSS flag
ENEMIES.wyrm.boss = true;
Object.assign(ENCOUNTERS, {
  world: [['slime'], ['slime', 'slime'], ['goblin'], ['goblin', 'slime'], ['wolf'], ['wolf', 'wolf'], ['goblin', 'goblin', 'wolf']],
  swamp: [['bog_slime', 'bog_slime'], ['zombie'], ['mire_wolf', 'mire_wolf'], ['zombie', 'bog_slime'], ['mire_wolf', 'zombie'], ['zombie', 'zombie', 'bog_slime']],
  crypt: [['skeleton_knight'], ['ghoul', 'ghoul'], ['wraith_elder', 'bone_mage'], ['skeleton_knight', 'bone_mage'], ['ghoul', 'wraith_elder'], ['skeleton_knight', 'ghoul', 'bone_mage'], ['bone_mage', 'bone_mage']],
  snow: [['ice_wolf', 'ice_wolf'], ['yeti'], ['frost_goblin', 'frost_goblin', 'ice_wolf'], ['yeti', 'ice_wolf'], ['frost_goblin', 'ice_wolf'], ['frost_goblin', 'frost_goblin', 'frost_goblin']],
  spire: [['ice_golem'], ['frost_wraith', 'ice_imp'], ['frozen_knight', 'ice_imp'], ['ice_imp', 'ice_imp', 'frost_wraith'], ['frozen_knight', 'frost_wraith'], ['ice_golem', 'ice_imp']],
});
Object.assign(DROPS, {
  bog_slime: [0.1, 'gems', 'venom'], mire_wolf: [0.08, 'gems', 'swift'], zombie: [0.1, 'gems', 'guard'], skeleton_knight: [0.1, 'gems', 'pierce'], ghoul: [0.1, 'gems', 'berserk'],
  wraith_elder: [0.12, 'gems', 'shadow'], bone_mage: [0.1, 'gems', 'overcharge'], ice_wolf: [0.1, 'gems', 'crit'], yeti: [0.12, 'items', 'hipotion'], frost_goblin: [0.1, 'gems', 'frost'],
  ice_golem: [0.2, 'gems', 'stun'], frost_wraith: [0.12, 'gems', 'echo'], ice_imp: [0.1, 'gems', 'siphon'], frozen_knight: [0.12, 'gems', 'execute'],
});
// shops: stock lists (ids in WEAPONS / ARMORS / ACCS / GEMS / ITEMS)
export const SHOPS = {
  haven_general: { title: '🛒 Haven General Store', stock: { items: ['potion', 'ether', 'phoenix'], gems: ['fire', 'frost', 'bolt', 'thrifty', 'venom', 'focusg', 'pierce'] } },
  haven_smith: { title: '⚒️ Haven Smithy', stock: { weapons: ['iron_sword', 'bronze_dirk', 'oak_staff', 'short_bow', 'iron_knuckle', 'leather_whip', 'rusty_scythe', 'dusty_tome', 'hand_axe', 'flame_brand', 'viper_fang', 'storm_rod', 'hunter_bow', 'thunder_claw', 'serpent_lash', 'frost_codex', 'battle_axe'], armors: ['cloth', 'leather', 'chain', 'plate', 'mage_cloak'], accs: ['power_ring', 'ward_amulet', 'mana_charm', 'swift_boots', 'fire_pendant'] } },
  frost_general: { title: '🛒 Frostholm Provisions', stock: { items: ['potion', 'hipotion', 'ether', 'megaether', 'phoenix', 'elixir'], gems: ['fire', 'frost', 'bolt', 'holy', 'shadow', 'chain', 'vamp', 'pierce', 'thrifty', 'overcharge', 'wide', 'venom', 'swift', 'focusg', 'guard', 'crit', 'berserk', 'echo', 'stun', 'siphon', 'execute'] } },
  frost_smith: { title: '⚒️ Frostholm Forge', stock: { weapons: ['mythril_sword', 'frostbrand', 'stiletto', 'sage_staff', 'longbow', 'frost_bow', 'steel_fist', 'thorn_whip', 'grave_scythe', 'arcane_tome', 'blizzard_tome', 'war_axe'], armors: ['mythril_mail', 'frost_robe', 'yeti_fur'], accs: ['sage_ring', 'berserk_ring', 'life_charm', 'gem_crown', 'socket_jewel', 'frost_pendant', 'lich_ring'] } },
};
