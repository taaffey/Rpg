// ===== Class commands (FF6): one signature battle command per calling, modelled on FF6's characters =====
// Rogue Steal (Locke) · Monk Blitz (Sabin) · Alchemist Tools (Edgar) · Samurai Bushido (Cyan) · Mage Lore (Strago) · Knight Runic (Celes)
// Ranger Throw (Shadow) · Bard Dance (Mog) · Berserker Rage (Gau) · Hexer Sketch (Relm) · Paladin Trance (Terra) · Cleric Health (Banon)
// Sage Mimic (Gogo). The engine side lives in Battle.command() (logic.js); the menus in battle.js.
import { SKILLS } from './data.js';

const S = (name, mp, tgt, kind, pow, x = {}) => ({ name, mp, tgt, kind, pow, ...x });
export const COMMANDS = {
  rogue: { id: 'steal', name: 'Steal', desc: 'Take an item from a foe. Each foe has one to lose.' },
  monk: { id: 'blitz', name: 'Blitz', desc: 'Free martial arts, learned as the hero levels up.' },
  alchemist: { id: 'tools', name: 'Tools', desc: 'Free gadgets, learned as the hero levels up.' },
  samurai: { id: 'bushido', name: 'Bushido', desc: 'Free sword arts. The stronger the art, the longer it takes to recover.' },
  mage: { id: 'lore', name: 'Lore', desc: 'Cast enemy spells the hero has seen and survived.' },
  knight: { id: 'runic', name: 'Runic', desc: 'Raise the blade: the next spell cast by anyone is absorbed, and its MP is the knight\'s.' },
  ranger: { id: 'throw', name: 'Throw', desc: 'Hurl a spare weapon from the pack. Hits hard; the weapon is gone.' },
  bard: { id: 'dance', name: 'Dance', desc: 'Dance the land\'s dance for the rest of the battle. Learned by winning on new ground.' },
  berserker: { id: 'rage', name: 'Rage', desc: 'Go berserk for the rest of the battle: hits half again as hard, but attacks at random.' },
  hexer: { id: 'sketch', name: 'Sketch', desc: 'Copy one of a foe\'s own moves and turn it on them.' },
  paladin: { id: 'trance', name: 'Trance', desc: 'Once a battle: recover 30% HP and deal 60% more damage for four turns.' },
  cleric: { id: 'health', name: 'Health', desc: 'A free, light heal for the whole party that also settles poison and slow.' },
  landlord: { id: 'mimic', name: 'Mimic', desc: 'Repeat the last thing an ally did, free.' },
};
// moves learned by character level: [skillId, level]
export const BLITZ = [['bz_raging', 1], ['bz_aura', 6], ['bz_suplex', 10], ['bz_firedance', 15], ['bz_mantra', 19], ['bz_airblade', 23], ['bz_spiraler', 27], ['bz_bumrush', 30]];
export const TOOLS = [['tl_crossbow', 1], ['tl_noise', 7], ['tl_bio', 11], ['tl_flash', 15], ['tl_drill', 19], ['tl_chainsaw', 23], ['tl_anchor', 28]];
export const BUSHIDO = [['bs_fang', 1, 1], ['bs_tempest', 8, 2], ['bs_dispatch', 16, 3], ['bs_quadra', 24, 4]]; // [skillId, level, recovery level]
Object.assign(SKILLS, {
  bz_raging: S('Raging Fist', 0, 'one', 'phys', 1.5), bz_aura: S('Aura Bolt', 0, 'one', 'phys', 1.8, { elem: 'holy' }), bz_suplex: S('Suplex', 0, 'one', 'phys', 2.4, { noBoss: true }),
  bz_firedance: S('Fire Dance', 0, 'all', 'phys', 1.0, { elem: 'fire' }), bz_mantra: S('Mantra', 0, 'allies', 'heal', 0.8), bz_airblade: S('Air Blade', 0, 'all', 'phys', 1.3),
  bz_spiraler: S('Spiraler', 0, 'allies', 'heal', 3, { sacrifice: true }), bz_bumrush: S('Bum Rush', 0, 'one', 'phys', 3.8, { pierce: 0.5 }),
  tl_crossbow: S('Auto Crossbow', 0, 'all', 'phys', 0.9), tl_noise: S('Noise Blaster', 0, 'all', 'phys', 0.5, { stun: 0.3 }), tl_bio: S('Bio Blaster', 0, 'all', 'mag', 0.7, { fx: ['poison'] }),
  tl_flash: S('Flash', 0, 'all', 'mag', 1.1, { elem: 'holy' }), tl_drill: S('Drill', 0, 'one', 'phys', 2.6, { pierce: 0.6 }), tl_chainsaw: S('Chainsaw', 0, 'one', 'phys', 2.0, { instakill: 0.2 }),
  tl_anchor: S('Air Anchor', 0, 'one', 'phys', 3.2, { pierce: 0.3 }),
  bs_fang: S('Fang', 0, 'one', 'phys', 1.8), bs_tempest: S('Tempest', 0, 'all', 'phys', 1.1), bs_dispatch: S('Dispatch', 0, 'one', 'phys', 2.8, { crit: 0.3 }), bs_quadra: S('Quadra Slam', 0, 'one', 'phys', 1.1, { hits: 4 }),
  cmd_health: S('Health', 0, 'allies', 'heal', 0.5),
  // dances: four moves each, picked at FF6's odds (7, 6, 2 and 1 in 16)
  dn_sunbath: S('Sun Bath', 0, 'allies', 'heal', 0.6), dn_windslash: S('Wind Slash', 0, 'all', 'phys', 1.0), dn_plasma: S('Plasma', 0, 'one', 'mag', 1.8, { elem: 'bolt' }), dn_cockatrice: S('Cockatrice', 0, 'all', 'mag', 0.6, { stun: 0.4 }),
  dn_elffire: S('Elf Fire', 0, 'all', 'mag', 1.0, { elem: 'fire' }), dn_wombat: S('Wombat', 0, 'one', 'phys', 1.8), dn_raccoon: S('Raccoon', 0, 'allies', 'heal', 0.5), dn_wisp: S('Will o\' the Wisp', 0, 'all', 'mag', 1.4, { elem: 'holy' }),
  dn_snowball: S('Snowball', 0, 'one', 'mag', 1.8, { elem: 'ice' }), dn_surge: S('Surge', 0, 'all', 'mag', 1.0, { elem: 'ice' }), dn_icerabbit: S('Ice Rabbit', 0, 'allies', 'heal', 0.7), dn_snowstorm: S('Snowstorm', 0, 'all', 'mag', 1.5, { elem: 'ice', fx: ['slow'] }),
  dn_sandstorm: S('Sand Storm', 0, 'all', 'phys', 0.9, { fx: ['slow'] }), dn_antlion: S('Antlion', 0, 'one', 'phys', 2.0), dn_mirage: S('Mirage', 0, 'allies', 'buff', 0, { fx: ['defup'] }), dn_kitty: S('Kitty', 0, 'all', 'mag', 1.5, { elem: 'fire' }),
  dn_shadow: S('Shadow', 0, 'all', 'mag', 1.0, { elem: 'dark' }), dn_poisfrog: S('Poison Frog', 0, 'all', 'mag', 0.6, { fx: ['poison'] }), dn_snare: S('Snare', 0, 'one', 'phys', 3.0, { pierce: 0.5 }),
  dn_landslide: S('Land Slide', 0, 'all', 'phys', 1.1), dn_sonic: S('Sonic Boom', 0, 'one', 'phys', 1.8), dn_whump: S('Whump', 0, 'one', 'phys', 3.0),
});
export const DANCES = {
  wind: { name: 'Wind Song', moves: ['dn_sunbath', 'dn_windslash', 'dn_plasma', 'dn_cockatrice'] },
  forest: { name: 'Forest Suite', moves: ['dn_elffire', 'dn_wombat', 'dn_raccoon', 'dn_wisp'] },
  snow: { name: 'Snowman Jazz', moves: ['dn_snowball', 'dn_surge', 'dn_icerabbit', 'dn_snowstorm'] },
  desert: { name: 'Desert Aria', moves: ['dn_sandstorm', 'dn_antlion', 'dn_mirage', 'dn_kitty'] },
  dusk: { name: 'Dusk Requiem', moves: ['dn_shadow', 'dn_poisfrog', 'dn_elffire', 'dn_snare'] },
  earth: { name: 'Earth Blues', moves: ['dn_landslide', 'dn_sonic', 'dn_sunbath', 'dn_whump'] },
};
export const DANCE_ODDS = [7, 6, 2, 1];
// which dance a battle backdrop belongs to (the battle's terrain)
export const terrainDance = (kind = '') => { const k = String(kind).split(':')[0];
  return { world: 'wind', storm: 'wind', windmill: 'wind', boss: 'earth', forest: 'forest', swamp: 'forest', snow: 'snow', spire: 'snow', desert: 'desert', ruins: 'desert', embers: 'earth', pizzaoven: 'earth' }[k] || 'dusk'; };
// Lore: any enemy spell (magic, not a boss's wind-up) can be learned; its MP cost follows its power
export const loreCost = (id) => { const s = SKILLS[id]; return Math.max(4, Math.round((s.pow || 1) * (s.tgt === 'all' ? 9 : 6))); };
export const loreable = (id) => { const s = SKILLS[id]; return !!s && s.kind === 'mag' && !id.startsWith('dn_') && !id.startsWith('tl_') && !id.startsWith('bz_'); };
export const known = (list, level) => list.filter(([, lv]) => level >= lv).map(([id]) => id);
