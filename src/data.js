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
  // weapon-specific signature skills (WEAPONS[id].sig overrides the type's)
  mend: S('Mend', 3, 'ally', 'heal', 1.6),
  sunstrike: S('Sunstrike', 6, 'all', 'phys', 0.85, { elem: 'holy' }),
  dragonrush: S('Dragon Rush', 6, 'one', 'phys', 0.55, { hits: 4, elem: 'fire' }),
  harvest: S('Harvest', 8, 'all', 'phys', 0.8, { elem: 'dark', fx: ['drain'] }),
  raijin: S('Raijin', 8, 'all', 'phys', 1.0, { elem: 'bolt' }),
  demoncut: S('Demon Cut', 6, 'one', 'phys', 2.1, { fx: ['drain'], crit: 0.2 }),
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

// ---- Gear. Stat keys (hp mp atk def mag spd) add directly. innate = free gem on the signature skill.
// Weapon traits (applied in battle by logic.js):
//   crit: extra crit chance on every physical hit   elem: element of the plain Attack   hits: Attack strikes N times (each at 60%)
//   pierce: Attack ignores this share of defense    proc: [status, chance] on Attack + signature hits (poison|slow|stun|drain)
//   heal: +x healing power on every heal             sig: replaces the weapon type's signature skill
// tier: 1 Haven smithy · 2 Haven/Mirewood · 3 Frostholm forge & deep chests · 4 boss loot and rare drops
const W = (name, type, atk, mag, sockets, price, innate, tier, desc, x = {}) => ({ name, type, atk, mag, sockets, price, innate, tier, desc, ...x });
export const WEAPONS = {
  // ---- swords: steady damage, the widest choice of elements
  iron_sword: W('Iron Sword', 'sword', 8, 0, 1, 80, undefined, 1, 'Plain, honest steel. Every knight starts somewhere.'),
  flame_brand: W('Flame Brand', 'sword', 13, 0, 2, 320, 'fire', 2, 'The blade never cools; foes that fear fire fear it more.', { elem: 'fire' }),
  mythril_sword: W('Mythril Sword', 'sword', 19, 0, 2, 760, undefined, 3, 'Feather-light elven metal that finds the gaps.', { crit: 0.1 }),
  frostbrand: W('Frostbrand', 'sword', 23, 0, 2, 1150, 'frost', 3, 'Rimed steel forged in Frostholm. Its cold creeps into the wound.', { elem: 'ice', proc: ['slow', 0.2] }),
  dragonbane: W('Dragonbane', 'sword', 25, 0, 3, 0, 'pierce', 4, 'Forged from the Ashen Wyrm\'s own fang. Scale and plate part before it.', { pierce: 0.3, hp: 20 }),
  sun_blade: W('Sun Blade', 'sword', 27, 4, 2, 0, undefined, 4, 'A fallen paladin\'s relic, still warm with morning light.', { elem: 'holy', hp: 15, sig: 'sunstrike' }),
  // ---- daggers: fast, critical, poisonous
  bronze_dirk: W('Bronze Dirk', 'dagger', 5, 0, 1, 45, undefined, 1, 'Cheap, quick to draw, easy to hide.', { spd: 2, crit: 0.1 }),
  viper_fang: W('Viper Fang', 'dagger', 9, 0, 2, 260, 'venom', 2, 'A hollow fang still full of venom.', { spd: 2, proc: ['poison', 0.3] }),
  shadow_edge: W('Shadow Edge', 'dagger', 14, 0, 2, 0, 'swift', 2, 'Drinks the light around it. Its wielder always moves first.', { spd: 3, crit: 0.15 }),
  stiletto: W('Stiletto', 'dagger', 13, 0, 2, 680, 'pierce', 3, 'A needle of a blade that slips between armor plates.', { spd: 3, crit: 0.2, pierce: 0.5 }),
  nightfang: W('Nightfang', 'dagger', 21, 0, 2, 0, undefined, 4, 'Taken from a dead assassin by a ghoul with taste.', { spd: 5, crit: 0.25, proc: ['stun', 0.12] }),
  // ---- staves: magic, healing, utility
  oak_staff: W('Oak Staff', 'staff', 2, 6, 1, 40, undefined, 1, 'A walking stick that hums faintly with mana.', { heal: 0.1 }),
  healing_staff: W('Healing Staff', 'staff', 2, 9, 2, 280, undefined, 2, 'A temple staff that teaches its bearer to mend.', { heal: 0.3, mp: 10, sig: 'mend' }),
  storm_rod: W('Storm Rod', 'staff', 3, 12, 2, 300, 'bolt', 2, 'Crackles whenever it rains.', { elem: 'bolt' }),
  archmage_staff: W('Archmage Staff', 'staff', 3, 17, 2, 0, 'echo', 2, 'Its spells echo long after they are cast.', { mp: 15 }),
  sage_staff: W('Sage Staff', 'staff', 4, 18, 2, 740, undefined, 3, 'Carved by the sages of Frostholm from a single pine.', { mp: 20, heal: 0.2 }),
  lich_staff: W('Lich Staff', 'staff', 5, 30, 3, 0, 'shadow', 4, 'Morvath\'s focus. Cold, patient and hungry.', { mp: 25, elem: 'dark' }),
  // ---- bows: armor-piercing arrows, hit groups with Volley
  short_bow: W('Short Bow', 'bow', 7, 0, 1, 60, undefined, 1, 'A light hunting bow. Arrows find the gaps in armor.', { pierce: 0.2 }),
  hunter_bow: W('Hunter Bow', 'bow', 12, 0, 2, 300, 'chain', 2, 'Its arrows ricochet from one foe to the next.', { pierce: 0.2, crit: 0.05 }),
  longbow: W('Longbow', 'bow', 17, 0, 2, 740, undefined, 3, 'Long draw, long reach.', { pierce: 0.25, crit: 0.1 }),
  frost_bow: W('Frost Bow', 'bow', 22, 0, 2, 1050, 'frost', 3, 'Frost-tipped arrows numb whatever they strike.', { pierce: 0.2, proc: ['slow', 0.25] }),
  gale_bow: W('Gale Bow', 'bow', 25, 0, 3, 0, 'swift', 4, 'Strung with a storm wraith\'s last sigh.', { pierce: 0.25, elem: 'bolt', spd: 4, crit: 0.15 }),
  // ---- fists: two blows per Attack, crushing combos
  iron_knuckle: W('Iron Knuckle', 'fists', 6, 0, 1, 50, undefined, 1, 'Two quick jabs per attack. Soft foes crumple; armored ones shrug.', { hits: 2 }),
  thunder_claw: W('Thunder Claw', 'fists', 11, 0, 2, 320, 'bolt', 2, 'Each blow carries a spark.', { hits: 2, elem: 'bolt' }),
  steel_fist: W('Steel Fist', 'fists', 15, 0, 2, 700, undefined, 3, 'Gauntlets that double as armor.', { hits: 2, def: 5 }),
  dragon_claw: W('Dragon Claw', 'fists', 20, 0, 2, 0, 'focusg', 4, 'Torn from a yeti\'s trophy pile; it still smoulders.', { hits: 2, elem: 'fire', sig: 'dragonrush' }),
  // ---- whips: magic-tinged control
  leather_whip: W('Leather Whip', 'whip', 5, 2, 1, 50, undefined, 1, 'A sharp crack that makes foes hesitate.', { proc: ['slow', 0.2] }),
  serpent_lash: W('Serpent Lash', 'whip', 10, 4, 2, 280, 'venom', 2, 'Barbed with snake fangs.', { proc: ['poison', 0.3] }),
  thorn_whip: W('Thorn Whip', 'whip', 14, 7, 2, 700, 'vamp', 3, 'Briar-wound. It drinks through its thorns.', { proc: ['slow', 0.3], crit: 0.1 }),
  // ---- scythes: slow, life-draining, dark
  rusty_scythe: W('Rusty Scythe', 'scythe', 8, 3, 1, 65, undefined, 1, 'Rusty but hungry.', { spd: -1, proc: ['drain', 0.25] }),
  bone_scythe: W('Bone Scythe', 'scythe', 13, 6, 2, 360, undefined, 2, 'Carved from something\'s spine. It feeds its wielder.', { spd: -1, elem: 'dark', proc: ['drain', 0.3] }),
  grave_scythe: W('Grave Scythe', 'scythe', 19, 11, 2, 950, 'vamp', 3, 'A gravedigger\'s blade that never quite stops reaping.', { spd: -1, proc: ['drain', 0.35] }),
  soul_reaper: W('Soul Reaper', 'scythe', 25, 15, 3, 0, 'vamp', 4, 'Hums with the souls it has stolen.', { elem: 'dark', proc: ['drain', 0.4], sig: 'harvest' }),
  // ---- tomes: pure magic, random elements
  dusty_tome: W('Dusty Tome', 'tome', 1, 7, 1, 45, undefined, 1, 'Faded spells scribbled in the margins.', { mp: 8 }),
  frost_codex: W('Frost Codex', 'tome', 2, 13, 2, 300, 'frost', 2, 'Its pages are cold to the touch.', { elem: 'ice' }),
  void_grimoire: W('Void Grimoire', 'tome', 2, 17, 2, 0, 'shadow', 2, 'Whispers from the dark between stars.', { elem: 'dark', mp: 10 }),
  arcane_tome: W('Arcane Tome', 'tome', 3, 19, 2, 800, undefined, 3, 'A scholar\'s life work, annotated twice.', { mp: 15, spd: 2 }),
  blizzard_tome: W('Blizzard Tome', 'tome', 3, 25, 2, 1150, 'frost', 3, 'A whole winter bound in leather.', { elem: 'ice', proc: ['slow', 0.2] }),
  // ---- axes: huge hits, slow, critical
  hand_axe: W('Hand Axe', 'axe', 10, 0, 1, 75, undefined, 1, 'Heavy and slow, but it bites deep.', { spd: -1, crit: 0.05 }),
  battle_axe: W('Battle Axe', 'axe', 16, 0, 2, 420, 'crit', 2, 'Double-bitted, for double the trouble.', { spd: -1, crit: 0.1 }),
  war_axe: W('War Axe', 'axe', 24, 0, 2, 900, 'berserk', 3, 'Too heavy for the timid.', { spd: -2, crit: 0.1 }),
  titan_axe: W('Titan Axe', 'axe', 36, 0, 3, 0, 'execute', 4, 'Hewn from the Frost Titan\'s glacier heart.', { spd: -2, crit: 0.15, hp: 30 }),
  // ---- katanas: crits and speed
  wakizashi: W('Wakizashi', 'katana', 8, 0, 1, 90, undefined, 1, 'A samurai\'s short companion blade.', { spd: 1, crit: 0.12 }),
  iron_katana: W('Iron Katana', 'katana', 13, 0, 1, 380, undefined, 2, 'Folded a thousand times.', { crit: 0.15 }),
  moonblade: W('Moonblade', 'katana', 23, 0, 2, 1000, 'crit', 3, 'Shines silver under the moon.', { spd: 2, crit: 0.2 }),
  storm_katana: W('Storm Katana', 'katana', 32, 0, 3, 0, 'bolt', 4, 'Lightning given an edge.', { elem: 'bolt', crit: 0.2, spd: 3, sig: 'raijin' }),
  muramasa: W('Muramasa', 'katana', 35, 0, 2, 0, undefined, 4, 'A cursed blade: it bites deeper than any other, and drinks its owner\'s blood.', { crit: 0.25, hp: -30, sig: 'demoncut' }),
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
  slime: E('Slime', '🟢', 42, 9, 1, 4, 4, 10, 8, [['tackle', 1]], { weak: ['fire'] }),
  goblin: E('Goblin', '👺', 58, 13, 3, 4, 7, 16, 14, [['tackle', 2], ['bite', 1]]),
  wolf: E('Wolf', '🐺', 62, 15, 2, 3, 11, 21, 13, [['bite', 2], ['venombite', 1]], { weak: ['fire'] }),
  bat: E('Cave Bat', '🦇', 110, 24, 4, 6, 14, 38, 26, [['bite', 2], ['venombite', 1]], { weak: ['bolt'] }),
  skeleton: E('Skeleton', '💀', 175, 30, 9, 5, 8, 52, 38, [['tackle', 2], ['slam', 1]], { weak: ['holy', 'fire'], res: ['dark'] }),
  imp: E('Fire Imp', '👹', 140, 14, 5, 30, 10, 54, 42, [['fireball', 3], ['tackle', 1]], { weak: ['ice'], res: ['fire'] }),
  golem: E('Stone Golem', '🗿', 340, 42, 20, 4, 3, 90, 66, [['slam', 3], ['tackle', 1]], { weak: ['bolt'], res: ['fire', 'ice'] }),
  wraith: E('Wraith', '👻', 210, 12, 8, 34, 12, 82, 60, [['draintouch', 2], ['fireball', 1]], { weak: ['holy'], res: ['dark'] }),
  wyrm: E('Ashen Wyrm', '🐉', 1100, 40, 14, 38, 9, 600, 800, [['claw', 3], ['flamebreath', 2], ['tailsweep', 2]], { weak: ['ice'], res: ['fire'], boss: true }),
};
export const ENCOUNTERS = {
  world: [['slime'], ['slime', 'slime'], ['goblin'], ['goblin', 'slime'], ['wolf'], ['wolf', 'wolf'], ['goblin', 'goblin', 'wolf']],
  dungeon: [['bat', 'bat'], ['skeleton'], ['skeleton', 'bat'], ['imp', 'imp'], ['golem'], ['wraith', 'bat'], ['skeleton', 'imp', 'wraith'], ['imp', 'wraith']],
};
export const DROPS = {}; // filled at the end of this file (every enemy has a table)

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
  bog_slime: E('Bog Slime', '🟣', 130, 24, 6, 12, 6, 46, 30, [['tackle', 2], ['venombite', 1]], { weak: ['fire'] }),
  mire_wolf: E('Mire Wolf', '🐺', 160, 31, 7, 5, 12, 52, 34, [['bite', 2], ['venombite', 2]], { weak: ['fire'] }),
  zombie: E('Zombie', '🧟', 210, 32, 8, 5, 3, 58, 38, [['slam', 2], ['rot', 2]], { weak: ['fire', 'holy'], res: ['dark'] }),
  skeleton_knight: E('Skeleton Knight', '💀', 330, 48, 20, 6, 9, 118, 60, [['slam', 2], ['tackle', 2]], { weak: ['holy', 'bolt'], res: ['dark'] }),
  ghoul: E('Ghoul', '🧟', 300, 50, 11, 8, 11, 118, 58, [['rot', 2], ['bite', 2]], { weak: ['fire', 'holy'], res: ['dark'] }),
  wraith_elder: E('Wraith Elder', '👻', 240, 12, 11, 52, 13, 126, 64, [['hexbolt', 2], ['draintouch', 2]], { weak: ['holy'], res: ['dark'] }),
  bone_mage: E('Bone Mage', '💀', 210, 12, 9, 56, 11, 122, 62, [['hexbolt', 3], ['fireball', 1]], { weak: ['holy'], res: ['dark'] }),
  lich: E('Lich King Morvath', '☠️', 2250, 43, 17, 56, 10, 1500, 1500, [['hexbolt', 3], ['draintouch', 2], ['soulstorm', 2], ['slam', 1]], { weak: ['holy', 'fire'], res: ['dark'], boss: true }),
  ice_wolf: E('Ice Wolf', '🐺', 270, 52, 11, 6, 15, 124, 66, [['frostbite', 3], ['bite', 1]], { weak: ['fire'], res: ['ice'] }),
  yeti: E('Yeti', '🦍', 440, 58, 16, 6, 7, 140, 74, [['slam', 2], ['claw', 2]], { weak: ['fire'], res: ['ice'] }),
  frost_goblin: E('Frost Goblin', '👺', 250, 48, 10, 8, 10, 116, 62, [['tackle', 2], ['frostbite', 1]], { weak: ['fire'], res: ['ice'] }),
  ice_golem: E('Ice Golem', '🗿', 680, 66, 30, 6, 4, 210, 98, [['slam', 3], ['icicle', 1]], { weak: ['fire', 'bolt'], res: ['ice'] }),
  frost_wraith: E('Frost Wraith', '👻', 360, 14, 14, 66, 14, 210, 96, [['blizzard', 1], ['icebolt', 2], ['draintouch', 1]], { weak: ['fire', 'holy'], res: ['ice'] }),
  ice_imp: E('Ice Imp', '👹', 330, 16, 12, 62, 12, 196, 92, [['icebolt', 3], ['tackle', 1]], { weak: ['fire'], res: ['ice'] }),
  frozen_knight: E('Frozen Knight', '💀', 520, 70, 28, 8, 9, 224, 104, [['slam', 2], ['frostbite', 2]], { weak: ['fire', 'holy'], res: ['ice'] }),
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
// shops: stock lists (ids in WEAPONS / ARMORS / ACCS / GEMS / ITEMS)
export const SHOPS = {
  haven_general: { title: '🛒 Haven General Store', stock: { items: ['potion', 'ether', 'phoenix'], gems: ['fire', 'frost', 'bolt', 'thrifty', 'venom', 'focusg', 'pierce'] } },
  haven_smith: { title: '⚒️ Haven Smithy', stock: { weapons: ['oak_staff', 'bronze_dirk', 'dusty_tome', 'iron_knuckle', 'leather_whip', 'short_bow', 'rusty_scythe', 'hand_axe', 'iron_sword', 'wakizashi', 'viper_fang', 'storm_rod', 'frost_codex', 'hunter_bow', 'flame_brand'], armors: ['cloth', 'leather', 'chain', 'plate', 'mage_cloak'], accs: ['power_ring', 'ward_amulet', 'mana_charm', 'swift_boots', 'fire_pendant'] } },
  frost_general: { title: '🛒 Frostholm Provisions', stock: { items: ['potion', 'hipotion', 'ether', 'megaether', 'phoenix', 'elixir'], gems: ['fire', 'frost', 'bolt', 'holy', 'shadow', 'chain', 'vamp', 'pierce', 'thrifty', 'overcharge', 'wide', 'venom', 'swift', 'focusg', 'guard', 'crit', 'berserk', 'echo', 'stun', 'siphon', 'execute'] } },
  frost_smith: { title: '⚒️ Frostholm Forge', stock: { weapons: ['mythril_sword', 'frostbrand', 'stiletto', 'sage_staff', 'longbow', 'frost_bow', 'steel_fist', 'thorn_whip', 'grave_scythe', 'arcane_tome', 'blizzard_tome', 'war_axe', 'moonblade'], armors: ['mythril_mail', 'frost_robe', 'yeti_fur'], accs: ['sage_ring', 'berserk_ring', 'life_charm', 'gem_crown', 'socket_jewel', 'frost_pendant', 'lich_ring'] } },
};

// =====================================================================
// ===== Content pack 3: Samurai + Paladin, katanas, Storm Cavern, quests =====
// =====================================================================
Object.assign(SKILLS, {
  iai: S('Iaido', 3, 'one', 'phys', 1.4, { crit: 0.3, pierce: 0.2 }),
  // samurai
  kiai: S('Kiai', 3, 'self', 'buff', 0, { fx: ['atkup'] }),
  flashcut: S('Flashcut', 5, 'one', 'phys', 0.8, { hits: 2 }),
  windblade: S('Wind Blade', 7, 'all', 'phys', 0.9),
  bladestorm: S('Blade Storm', 10, 'one', 'phys', 0.5, { hits: 5 }),
  zanshin: S('Zanshin', 16, 'one', 'phys', 3.4, { pierce: 0.5 }),
  // paladin
  holylight: S('Holy Light', 4, 'one', 'mag', 1.5, { elem: 'holy' }),
  layhands: S('Lay on Hands', 4, 'ally', 'heal', 1.6),
  divineshield: S('Divine Shield', 8, 'allies', 'buff', 0, { fx: ['defup'] }),
  crusade: S('Crusade', 11, 'all', 'phys', 1.1, { elem: 'holy' }),
  sacredblade: S('Sacred Blade', 12, 'one', 'phys', 2.4, { elem: 'holy' }),
  divinegrace: S('Divine Grace', 14, 'ally', 'heal', 0, { fx: ['revive'] }),
  // enemy-only
  sparkbolt: S('Spark Bolt', 0, 'one', 'mag', 1.4, { elem: 'bolt' }),
  thunderbreath: S('Thunder Breath', 0, 'all', 'mag', 1.0, { elem: 'bolt' }),
  stormclaw: S('Storm Claw', 0, 'one', 'phys', 1.6, { elem: 'bolt' }),
});
WEAPON_TYPES.katana = { name: 'Katana', sig: 'iai' };
Object.assign(JOBS, {
  samurai: { name: 'Samurai', icon: '🗾', desc: 'Swift blade master with crits and multi-hit strikes.', mod: { hp: 1.1, mp: 0.7, atk: 1.4, def: 0.95, mag: 0.6, spd: 1.3 }, weapons: ['katana', 'bow'], skills: [['kiai', 1], ['flashcut', 2], ['windblade', 4], ['bladestorm', 6], ['zanshin', 9]] },
  paladin: { name: 'Paladin', icon: '⚜️', desc: 'Holy warrior who fights, heals and guards.', mod: { hp: 1.3, mp: 1.0, atk: 1.0, def: 1.4, mag: 1.0, spd: 0.8 }, weapons: ['sword', 'staff'], skills: [['holylight', 1], ['layhands', 2], ['divineshield', 4], ['crusade', 6], ['sacredblade', 8], ['divinegrace', 10]] },
});
Object.assign(ARMORS, { storm_cloak: { name: 'Storm Cloak', def: 18, mp: 28, mag: 8, spd: 3, res: ['bolt'], sockets: 2, price: 0 } });
Object.assign(ACCS, {
  family_ring: { name: 'Family Ring', hp: 30, def: 3, sockets: 1, price: 0 }, wolf_fang: { name: 'Wolf Fang', atk: 6, spd: 4, sockets: 0, price: 0 },
  swamp_lantern: { name: 'Swamp Lantern', mag: 6, mp: 15, sockets: 1, price: 0 }, frost_amulet: { name: 'Frost Amulet', def: 6, hp: 30, res: ['ice'], sockets: 1, price: 0 },
});
Object.assign(ENEMIES, {
  storm_bat: E('Storm Bat', '🦇', 250, 44, 10, 10, 16, 120, 56, [['bite', 2], ['sparkbolt', 1]], { weak: ['ice'], res: ['bolt'] }),
  thunder_imp: E('Thunder Imp', '👹', 270, 14, 11, 54, 12, 128, 60, [['sparkbolt', 3], ['tackle', 1]], { weak: ['ice'], res: ['bolt'] }),
  gale_wraith: E('Gale Wraith', '👻', 310, 14, 13, 58, 15, 140, 64, [['sparkbolt', 2], ['draintouch', 1], ['hexbolt', 1]], { weak: ['holy', 'ice'], res: ['bolt'] }),
  storm_drake: E('Storm Drake', '🐲', 2500, 48, 18, 52, 12, 2000, 1800, [['stormclaw', 3], ['thunderbreath', 2], ['claw', 1]], { weak: ['ice'], res: ['bolt'], boss: true }),
});
Object.assign(ENCOUNTERS, { storm: [['storm_bat', 'storm_bat'], ['thunder_imp', 'thunder_imp'], ['gale_wraith'], ['storm_bat', 'thunder_imp'], ['gale_wraith', 'storm_bat'], ['thunder_imp', 'gale_wraith', 'storm_bat']] });
BOSSES.storm_drake = { name: 'Storm Drake', intro: 'Thunder splits the cavern as the Storm Drake descends!', optional: true, loot: { weapons: ['storm_katana'], armors: ['storm_cloak'], gems: ['siphon', 'crit'] } };
SHOPS.mire_general = { title: '🛒 Mirewood Trading Post', stock: { items: ['potion', 'hipotion', 'ether', 'phoenix'], gems: ['fire', 'frost', 'bolt', 'holy', 'shadow', 'chain', 'vamp', 'thrifty', 'venom', 'guard', 'crit'], weapons: ['healing_staff', 'viper_fang', 'serpent_lash', 'thunder_claw', 'bone_scythe', 'battle_axe', 'iron_katana', 'hunter_bow', 'flame_brand'], armors: ['chain', 'mage_cloak', 'yeti_fur'], accs: ['ward_amulet', 'fire_pendant', 'swift_boots'] } };

// ---- side quests. goal: {type:'kill', ids, n} | {type:'find', item} | {type:'boss', id}
export const QUESTS = {
  slimes: { title: 'Slime Trouble', giver: 'Haven villager', goal: { type: 'kill', ids: ['slime'], n: 6 }, reward: { gold: 150, items: { potion: 3 }, gems: ['thrifty'] },
    lines: { offer: ['Slimes keep oozing into the cellars and ruining the grain!', 'Could you clear out six of them on the grassland?'], active: ['Slimes, on the grass outside town. Six of them, please!'], ready: ['You did it! My cellars are safe again. Take this, with my thanks!'], done: ['Not a single slime in my cellar since you passed through. Thank you.'] } },
  heirloom: { title: 'The Lost Heirloom', giver: 'Haven fisher', goal: { type: 'find', item: 'heirloom', where: 'Ashen Cavern' }, reward: { gold: 100, accs: ['family_ring'] },
    lines: { offer: ['My grandmother\'s ring... I dropped it fleeing the Ashen Cavern years ago.', 'If you find it in some hidden corner of the cavern, I\'d be forever grateful.'], active: ['The ring should be in a dead end of the Ashen Cavern, far from the entrance.'], ready: ['That\'s it! That\'s her ring! Please, take this family heirloom of my own.'], done: ['Grandmother\'s ring is back on the mantel. Bless you.'] } },
  wolves: { title: 'Pelts for the Furrier', giver: 'Haven traveler', goal: { type: 'kill', ids: ['wolf', 'mire_wolf'], n: 5 }, reward: { gold: 200, accs: ['wolf_fang'] },
    lines: { offer: ['I\'m a furrier by trade. Wolf pelts are in short supply since the Wyrm woke.', 'Bring me proof of five wolves, from the plains or the marsh, and I\'ll pay well.'], active: ['Five wolves, plains or marsh. I\'ll know the pelts when I see them.'], ready: ['Fine work! These are prime pelts. Here: a fang charm I carved myself.'], done: ['Business is booming thanks to you.'] } },
  marsh: { title: 'Cleanse the Marsh', giver: 'Mirewood warden', goal: { type: 'kill', ids: ['bog_slime', 'zombie'], n: 8 }, reward: { gold: 400, gems: ['guard'], items: { elixir: 1 } },
    lines: { offer: ['Mirewood stands on stilts, but the bog creatures climb up anyway.', 'Slay eight bog slimes or zombies and the village will rest easier.'], active: ['Eight bog slimes or zombies. They lurk in the marsh around the village.'], ready: ['The marsh is quiet tonight. The village is in your debt.'], done: ['The village sleeps soundly. You are always welcome here.'] } },
  lantern: { title: 'The Lost Lantern', giver: 'Mirewood boatwright', goal: { type: 'find', item: 'lantern', where: 'Sunken Crypt' }, reward: { gold: 300, accs: ['swamp_lantern'] },
    lines: { offer: ['My late brother\'s lantern fell from his boat into the Sunken Crypt\'s flooded entrance.', 'It would mean everything to have it back. Look for a chest deep in the crypt.'], active: ['The lantern is in a chest somewhere in the Sunken Crypt.'], ready: ['His lantern! It still shines. Please, take this charm it inspired.'], done: ['I light it every night, in his memory.'] } },
  yetis: { title: 'Yeti Hunt', giver: 'Frostholm hunter', goal: { type: 'kill', ids: ['yeti'], n: 4 }, reward: { gold: 600, accs: ['frost_amulet'] },
    lines: { offer: ['Yetis raid our storehouses every winter night.', 'Slay four of the great beasts and the village will reward you.'], active: ['Four yetis. They roam the Frostfields. Bring fire!'], ready: ['Four yetis down! Take this amulet. It has kept our hunters warm for generations.'], done: ['The storehouses are safe. Thank you, friend.'] } },
  stormdrake: { title: 'Slay the Storm Drake', giver: 'Frostholm old hunter', goal: { type: 'boss', id: 'storm_drake' }, reward: { gold: 1500, gems: ['stun', 'echo'] },
    lines: { offer: ['A great drake nests in a cavern on the northern plains. Lightning plagues the sky for miles.', 'Slay the Storm Drake and I will pay the village\'s whole reserve. Ice is its weakness.'], active: ['The Storm Cavern, on the Northern Plains. Ice magic, friend.'], ready: ['The skies are clear for the first time in years! The village\'s reserve is yours.'], done: ['Clear skies at last. You are a legend.'] } },
};

// gem-wright: price of each successive bonus socket (per hero)
export const SOCKET_COST = [600, 1500, 3500];

// difficulty presets (chosen per save; can be changed in Options)
export const DIFFICULTY = {
  easy: { name: 'Easy', desc: 'Softer enemies (-25% HP, -20% damage). Great for the story.', mod: { hp: 0.75, atk: 0.8, mag: 0.8, def: 0.9, reward: 1 } },
  normal: { name: 'Normal', desc: 'The intended balance.', mod: { hp: 1, atk: 1, mag: 1, def: 1, reward: 1 } },
  hard: { name: 'Hard', desc: 'Tougher enemies (+25% HP, +20% damage) with +20% EXP and gold.', mod: { hp: 1.25, atk: 1.2, mag: 1.2, def: 1.1, reward: 1.2 } },
};

Object.assign(ITEMS, {
  antidote: { name: 'Antidote', cure: 'poison', price: 20, desc: 'Cure poison' },
  remedy: { name: 'Remedy', cure: 'all', price: 80, desc: 'Cure poison, slow and stun' },
});
for (const id of ['haven_general', 'mire_general']) SHOPS[id].stock.items.push('antidote');
SHOPS.frost_general.stock.items.push('antidote', 'remedy');
SHOPS.mire_general.stock.items.push('remedy');

// ---- Enemy drops. common: everyday spoils (~20-35%); rare: a gem or a piece of gear (~3-8%, shown as ★ RARE).
// Bosses always drop their common item, on top of their guaranteed BOSSES[id].loot. rewards() in logic.js rolls rare first.
const D = (ck, cid, cp, rk, rid, rp) => ({ common: [ck, cid, cp], rare: [rk, rid, rp] });
Object.assign(DROPS, {
  // Greenmarch
  slime: D('items', 'potion', 0.3, 'gems', 'fire', 0.05), goblin: D('items', 'antidote', 0.25, 'weapons', 'wakizashi', 0.05), wolf: D('items', 'potion', 0.25, 'gems', 'venom', 0.06),
  // Ashen Cavern
  bat: D('items', 'antidote', 0.3, 'gems', 'swift', 0.05), skeleton: D('items', 'potion', 0.3, 'gems', 'holy', 0.06), imp: D('items', 'ether', 0.25, 'weapons', 'flame_brand', 0.05),
  golem: D('items', 'hipotion', 0.3, 'gems', 'wide', 0.08), wraith: D('items', 'ether', 0.3, 'gems', 'shadow', 0.06),
  wyrm: D('items', 'elixir', 1, 'accs', 'fire_pendant', 0.5),
  // Mire Marsh
  bog_slime: D('items', 'antidote', 0.35, 'gems', 'venom', 0.06), mire_wolf: D('items', 'potion', 0.3, 'accs', 'swift_boots', 0.04), zombie: D('items', 'remedy', 0.2, 'gems', 'guard', 0.06),
  // Sunken Crypt
  skeleton_knight: D('items', 'hipotion', 0.25, 'weapons', 'sun_blade', 0.04), ghoul: D('items', 'remedy', 0.25, 'weapons', 'nightfang', 0.04),
  wraith_elder: D('items', 'ether', 0.3, 'weapons', 'soul_reaper', 0.04), bone_mage: D('items', 'ether', 0.3, 'gems', 'siphon', 0.05),
  lich: D('items', 'megaether', 1, 'accs', 'lich_ring', 0.5),
  // Frostfields
  ice_wolf: D('items', 'hipotion', 0.25, 'gems', 'crit', 0.06), yeti: D('items', 'hipotion', 0.3, 'weapons', 'dragon_claw', 0.04), frost_goblin: D('items', 'antidote', 0.25, 'gems', 'frost', 0.07),
  // Frost Spire
  ice_golem: D('items', 'hipotion', 0.3, 'gems', 'stun', 0.08), frost_wraith: D('items', 'megaether', 0.2, 'gems', 'echo', 0.06), ice_imp: D('items', 'ether', 0.3, 'accs', 'sage_ring', 0.04),
  frozen_knight: D('items', 'hipotion', 0.25, 'weapons', 'muramasa', 0.04),
  titan: D('items', 'elixir', 1, 'gems', 'crit', 0.5),
  // Storm Cavern
  storm_bat: D('items', 'ether', 0.25, 'gems', 'swift', 0.06), thunder_imp: D('items', 'ether', 0.3, 'gems', 'bolt', 0.07), gale_wraith: D('items', 'megaether', 0.2, 'weapons', 'gale_bow', 0.05),
  storm_drake: D('items', 'elixir', 1, 'gems', 'echo', 0.5),
});

// =====================================================================
// ===== Bestiary expansion: 24 new monster designs + tiered variants and rare elites =====
// =====================================================================
Object.assign(SKILLS, { // enemy-only. stun: chance to make the target lose its next turn
  slash: S('Slash', 0, 'one', 'phys', 1.0),
  sting: S('Stinger', 0, 'one', 'phys', 0.6, { hits: 2, fx: ['poison'] }),
  spores: S('Sleep Spores', 0, 'all', 'buff', 0, { fx: ['slow'], hostile: true }),
  gore: S('Gore', 0, 'one', 'phys', 1.45),
  enrage: S('Enrage', 0, 'self', 'buff', 0, { fx: ['atkup'] }),
  cheapshot: S('Cheap Shot', 0, 'one', 'phys', 0.8, { stun: 0.3 }),
  sandtoss: S('Sand Toss', 0, 'one', 'phys', 0.6, { fx: ['slow'] }),
  vinelash: S('Vine Lash', 0, 'one', 'phys', 1.0, { fx: ['slow'] }),
  photosynth: S('Photosynthesis', 0, 'self', 'heal', 1.6),
  web: S('Web Shot', 0, 'one', 'phys', 0.5, { fx: ['slow'] }),
  tongue: S('Tongue Lash', 0, 'one', 'phys', 1.0, { fx: ['slow'] }),
  leech: S('Leech', 0, 'one', 'phys', 1.0, { fx: ['drain'] }),
  wispfire: S('Foxfire', 0, 'one', 'mag', 1.3, { elem: 'fire' }),
  twinthrust: S('Twin Thrust', 0, 'one', 'phys', 0.65, { hits: 2 }),
  scaleguard: S('Scale Guard', 0, 'self', 'buff', 0, { fx: ['defup'] }),
  pincer: S('Pincer', 0, 'one', 'phys', 0.6, { hits: 2 }),
  deathsting: S('Death Stinger', 0, 'one', 'phys', 1.1, { fx: ['poison'] }),
  devour: S('Devour', 0, 'one', 'phys', 1.4, { fx: ['drain'] }),
  sandquake: S('Sandquake', 0, 'all', 'phys', 0.7),
  needles: S('Needle Volley', 0, 'all', 'phys', 0.55),
  wrap: S('Bandage Bind', 0, 'one', 'phys', 0.8, { stun: 0.3 }),
  firefang: S('Fire Fang', 0, 'one', 'phys', 1.2, { elem: 'fire' }),
  eruption: S('Eruption', 0, 'all', 'mag', 0.85, { elem: 'fire' }),
  swarm: S('Swarm', 0, 'one', 'phys', 0.4, { hits: 4 }),
  dreadcleave: S('Dread Cleave', 0, 'all', 'phys', 0.75),
  soulslash: S('Soul Slash', 0, 'one', 'phys', 1.3, { elem: 'dark', fx: ['drain'] }),
  wail: S('Banshee Wail', 0, 'all', 'mag', 0.55, { elem: 'dark', stun: 0.2 }),
  gravebreath: S('Grave Breath', 0, 'all', 'mag', 0.8, { elem: 'dark', fx: ['poison'] }),
  refreeze: S('Refreeze', 0, 'self', 'heal', 1.0),
  talonrake: S('Talon Rake', 0, 'one', 'phys', 0.6, { hits: 2 }),
  featherstorm: S('Feather Storm', 0, 'all', 'phys', 0.6, { elem: 'ice' }),
  trample: S('Trample', 0, 'all', 'phys', 0.75),
  earthshaker: S('Earthshaker', 0, 'one', 'phys', 1.0, { stun: 0.3 }),
  prism: S('Prism Beam', 0, 'one', 'mag', 1.4, { elem: 'holy' }),
  crystalward: S('Crystal Ward', 0, 'self', 'buff', 0, { fx: ['defup'] }),
  mendprism: S('Mending Prism', 0, 'ally', 'heal', 1.0),
  thunderclap: S('Thunderclap', 0, 'all', 'mag', 0.7, { elem: 'bolt', stun: 0.15 }),
});
// elite: [id, chance] -> the Battle constructor occasionally swaps this enemy for a rare elite
Object.assign(ENEMIES, {
  // Greenmarch grassland & forest edge (Lv 2-6)
  hornet: E('Giant Hornet', '🐝', 46, 13, 2, 3, 15, 19, 11, [['sting', 2], ['tackle', 1]], { weak: ['fire', 'ice'] }),
  shroom: E('Myconid', '🍄', 70, 11, 4, 8, 5, 22, 14, [['tackle', 2], ['spores', 1]], { weak: ['fire'], res: ['dark'] }),
  boar: E('Wild Boar', '🐗', 84, 16, 5, 3, 8, 27, 15, [['tackle', 2], ['gore', 1]], { weak: ['ice'], elite: ['golden_boar', 0.06] }),
  bandit: E('Bandit', '🗡️', 74, 15, 4, 4, 12, 28, 34, [['slash', 2], ['cheapshot', 1]], { weak: ['bolt'] }),
  sapling: E('Treant Sapling', '🌳', 96, 14, 7, 8, 4, 27, 16, [['vinelash', 2], ['photosynth', 1]], { weak: ['fire'], res: ['bolt'] }),
  spider: E('Giant Spider', '🕷️', 66, 14, 3, 4, 13, 24, 13, [['venombite', 2], ['web', 1]], { weak: ['fire'] }),
  golden_boar: E('Golden Boar', '🐗', 150, 16, 18, 4, 9, 160, 260, [['tackle', 2], ['gore', 1], ['enrage', 1]], { weak: ['ice'], res: ['fire'], rare: true }),
  // Mire Marsh (Lv 7-9)
  bog_toad: E('Bog Toad', '🐸', 175, 27, 7, 10, 8, 56, 34, [['tongue', 2], ['venombite', 1], ['tackle', 1]], { weak: ['ice', 'bolt'], res: ['dark'] }),
  leech: E('Giant Leech', '🪱', 150, 26, 5, 6, 9, 50, 26, [['leech', 3], ['tackle', 1]], { weak: ['fire', 'bolt'], res: ['dark', 'ice'] }),
  wisp: E('Will-o\'-Wisp', '🕯️', 120, 10, 5, 30, 14, 58, 32, [['wispfire', 2], ['hexbolt', 1], ['draintouch', 1]], { weak: ['ice', 'holy'], res: ['fire', 'dark'] }),
  lizardman: E('Lizardman', '🦎', 200, 32, 10, 6, 11, 64, 42, [['twinthrust', 2], ['slash', 1], ['scaleguard', 1]], { weak: ['ice'], res: ['fire'] }),
  // Sunscar Sands desert (Lv 8-11)
  scorpion: E('Sand Scorpion', '🦂', 220, 36, 18, 6, 10, 74, 44, [['deathsting', 2], ['pincer', 2]], { weak: ['ice', 'bolt'], res: ['fire'] }),
  sandworm: E('Sandworm', '🪱', 430, 44, 12, 8, 5, 120, 64, [['devour', 1], ['sandquake', 1], ['slam', 1]], { weak: ['ice'], res: ['fire', 'bolt'] }),
  cactus: E('Cactling', '🌵', 190, 30, 12, 6, 9, 66, 38, [['needles', 2], ['tackle', 1]], { weak: ['fire'], res: ['bolt'] }),
  mummy: E('Mummy', '🧟', 300, 38, 12, 8, 5, 82, 52, [['wrap', 2], ['rot', 1], ['slam', 1]], { weak: ['fire', 'holy'], res: ['dark', 'ice'] }),
  desert_bandit: E('Sand Raider', '🗡️', 240, 40, 10, 8, 14, 92, 90, [['slash', 2], ['cheapshot', 1], ['sandtoss', 1]], { weak: ['ice'], res: ['fire'] }),
  // Ashen Cavern (Lv 8-10)
  salamander: E('Fire Salamander', '🦎', 180, 28, 9, 30, 11, 62, 44, [['firefang', 2], ['flamebreath', 1]], { weak: ['ice'], res: ['fire'] }),
  magma_golem: E('Magma Golem', '🗿', 380, 44, 20, 24, 3, 104, 72, [['slam', 2], ['eruption', 1]], { weak: ['ice', 'bolt'], res: ['fire'] }),
  batswarm: E('Bat Swarm', '🦇', 130, 20, 3, 4, 16, 46, 22, [['swarm', 2], ['bite', 1]], { weak: ['fire', 'bolt'] }),
  // Sunken Crypt (Lv 12-15)
  ghoul_knight: E('Ghoul Knight', '⚔️', 430, 56, 22, 8, 8, 156, 76, [['soulslash', 2], ['dreadcleave', 1], ['slam', 1]], { weak: ['holy'], res: ['dark', 'ice'] }),
  banshee: E('Banshee', '👻', 270, 14, 10, 54, 15, 140, 66, [['wail', 1], ['draintouch', 2], ['hexbolt', 1]], { weak: ['holy'], res: ['dark', 'ice'] }),
  bone_whelp: E('Bone Whelp', '🐉', 360, 50, 16, 46, 12, 150, 72, [['gravebreath', 1], ['claw', 2], ['bite', 1]], { weak: ['holy', 'bolt'], res: ['dark', 'fire'] }),
  // Frostfields (Lv 11-13)
  ice_elemental: E('Ice Elemental', '❄️', 300, 14, 18, 54, 10, 140, 70, [['icebolt', 2], ['blizzard', 1], ['refreeze', 1]], { weak: ['fire'], res: ['ice', 'dark'] }),
  harpy: E('Snow Harpy', '🦅', 260, 48, 10, 8, 17, 130, 68, [['talonrake', 2], ['featherstorm', 1]], { weak: ['bolt', 'fire'], res: ['ice'] }),
  mammoth: E('Woolly Mammoth', '🦣', 580, 60, 18, 6, 5, 190, 84, [['gore', 2], ['trample', 1], ['earthshaker', 1]], { weak: ['fire'], res: ['ice'] }),
  // Frost Spire (Lv 14-18)
  crystal_sentinel: E('Crystal Sentinel', '💎', 600, 64, 30, 52, 9, 230, 104, [['prism', 2], ['slam', 1], ['crystalward', 1], ['mendprism', 1]], { weak: ['dark', 'bolt'], res: ['ice', 'fire', 'holy'] }),
  glacier_yeti: E('Glacier Yeti', '🦍', 620, 70, 20, 6, 8, 220, 96, [['slam', 2], ['claw', 2], ['frostbite', 1]], { weak: ['fire'], res: ['ice'] }),
  crystal_golem: E('Crystal Golem', '💎', 1100, 72, 40, 60, 6, 650, 900, [['slam', 2], ['prism', 2], ['crystalward', 1]], { weak: ['dark', 'bolt'], res: ['ice', 'fire'], rare: true }),
  // Storm Cavern (optional, Lv 11-20)
  thunderbird: E('Thunderbird', '🦅', 340, 48, 12, 50, 18, 150, 72, [['stormclaw', 2], ['thunderclap', 1]], { weak: ['ice'], res: ['bolt'] }),
  storm_elemental: E('Storm Elemental', '🌩️', 320, 14, 16, 58, 11, 146, 70, [['sparkbolt', 2], ['thunderclap', 1], ['hexbolt', 1]], { weak: ['ice'], res: ['bolt', 'fire'] }),
});
ENEMIES.ice_golem.elite = ['crystal_golem', 0.08];
// Greenmarch: the first four groups are what a level-1 party meets near Haven (the distance ramp in game.js slices this list)
ENCOUNTERS.world = [['slime'], ['slime', 'slime'], ['goblin'], ['goblin', 'slime'], ['hornet'], ['wolf'], ['shroom', 'slime'], ['spider'], ['wolf', 'wolf'], ['boar'], ['goblin', 'goblin', 'wolf'], ['bandit', 'goblin'], ['sapling', 'shroom'], ['hornet', 'hornet'], ['boar', 'spider'], ['bandit', 'bandit'], ['sapling', 'spider']];
ENCOUNTERS.swamp.push(['bog_toad'], ['leech', 'leech'], ['wisp', 'bog_slime'], ['lizardman'], ['bog_toad', 'leech'], ['lizardman', 'wisp'], ['wisp', 'wisp']);
ENCOUNTERS.desert = [['scorpion'], ['cactus', 'cactus'], ['desert_bandit', 'desert_bandit'], ['mummy'], ['sandworm'], ['scorpion', 'cactus'], ['mummy', 'desert_bandit'], ['scorpion', 'scorpion'], ['cactus', 'desert_bandit', 'cactus']];
ENCOUNTERS.dungeon.push(['salamander'], ['batswarm'], ['salamander', 'bat'], ['magma_golem'], ['batswarm', 'imp']);
ENCOUNTERS.crypt.push(['ghoul_knight'], ['banshee', 'ghoul'], ['bone_whelp'], ['ghoul_knight', 'bone_mage'], ['banshee', 'banshee']);
ENCOUNTERS.snow.push(['ice_elemental'], ['harpy', 'harpy'], ['mammoth'], ['ice_elemental', 'ice_wolf'], ['harpy', 'frost_goblin']);
ENCOUNTERS.spire.push(['crystal_sentinel'], ['glacier_yeti'], ['crystal_sentinel', 'ice_imp'], ['glacier_yeti', 'frost_wraith']);
ENCOUNTERS.storm.push(['thunderbird'], ['storm_elemental', 'storm_bat'], ['thunderbird', 'thunder_imp'], ['storm_elemental', 'gale_wraith']);
Object.assign(DROPS, {
  hornet: D('items', 'antidote', 0.3, 'gems', 'swift', 0.05), shroom: D('items', 'ether', 0.2, 'gems', 'thrifty', 0.06), boar: D('items', 'potion', 0.35, 'accs', 'power_ring', 0.05),
  bandit: D('items', 'potion', 0.25, 'weapons', 'viper_fang', 0.05), sapling: D('items', 'ether', 0.2, 'weapons', 'healing_staff', 0.05), spider: D('items', 'antidote', 0.3, 'weapons', 'serpent_lash', 0.05),
  golden_boar: D('items', 'elixir', 0.6, 'accs', 'socket_jewel', 0.4),
  bog_toad: D('items', 'antidote', 0.3, 'accs', 'mana_charm', 0.05), leech: D('items', 'potion', 0.3, 'gems', 'vamp', 0.07), wisp: D('items', 'ether', 0.3, 'weapons', 'void_grimoire', 0.04),
  lizardman: D('items', 'hipotion', 0.2, 'weapons', 'iron_katana', 0.05),
  scorpion: D('items', 'antidote', 0.35, 'gems', 'pierce', 0.07), sandworm: D('items', 'hipotion', 0.35, 'accs', 'life_charm', 0.06), cactus: D('items', 'potion', 0.3, 'weapons', 'thorn_whip', 0.04),
  mummy: D('items', 'remedy', 0.25, 'accs', 'sage_ring', 0.04), desert_bandit: D('items', 'hipotion', 0.2, 'weapons', 'moonblade', 0.03),
  salamander: D('items', 'ether', 0.25, 'accs', 'fire_pendant', 0.06), magma_golem: D('items', 'hipotion', 0.3, 'gems', 'overcharge', 0.07), batswarm: D('items', 'antidote', 0.3, 'gems', 'chain', 0.06),
  ghoul_knight: D('items', 'hipotion', 0.3, 'weapons', 'grave_scythe', 0.05), banshee: D('items', 'megaether', 0.15, 'gems', 'echo', 0.05), bone_whelp: D('items', 'hipotion', 0.3, 'weapons', 'dragonbane', 0.03),
  ice_elemental: D('items', 'ether', 0.3, 'accs', 'frost_pendant', 0.06), harpy: D('items', 'hipotion', 0.25, 'weapons', 'gale_bow', 0.03), mammoth: D('items', 'hipotion', 0.35, 'weapons', 'war_axe', 0.04),
  crystal_sentinel: D('items', 'megaether', 0.2, 'gems', 'guard', 0.08), glacier_yeti: D('items', 'hipotion', 0.3, 'accs', 'frost_amulet', 0.05),
  crystal_golem: D('items', 'elixir', 1, 'accs', 'gem_crown', 0.35),
  thunderbird: D('items', 'megaether', 0.2, 'gems', 'stun', 0.06), storm_elemental: D('items', 'ether', 0.3, 'gems', 'siphon', 0.06),
});
