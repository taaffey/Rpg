// ===== Class commands: one signature battle command per calling (inspired by FF6's character commands, with twists of their own) =====
// Rogue Pilfer · Monk Forms · Alchemist Contraptions · Samurai Sword Arts · Mage Glyphs · Knight Spellguard · Ranger Hurl · Bard Ballads
// Berserker Frenzy · Hexer Mirror · Paladin Holy Oath · Cleric Prayer · Sage Reprise. The engine side lives in Battle.command() (logic.js);
// the menus in battle.js. Command ids stay short and stable (they are stored in saves): steal, blitz, tools, bushido, lore, runic...
import { SKILLS } from './data.js';

const S = (name, mp, tgt, kind, pow, x = {}) => ({ name, mp, tgt, kind, pow, ...x });
export const COMMANDS = {
  rogue: { id: 'steal', name: 'Pilfer', desc: 'Lift an item from a foe; each foe has one. Every miss makes the next try likelier, and a miss may still lift some gold.' },
  monk: { id: 'blitz', name: 'Forms', desc: 'Free martial forms, learned as the hero levels. Chain different forms for momentum: +10% each, up to +50%.' },
  alchemist: { id: 'tools', name: 'Contraptions', desc: 'Free devices, learned as the hero levels. Use the same one twice running and it overheats to half power.' },
  samurai: { id: 'bushido', name: 'Sword Arts', desc: 'Free sword arts. The stronger the art, the longer it takes to recover.' },
  mage: { id: 'lore', name: 'Glyphs', desc: 'Cast enemy spells copied into the spellbook. A spell must be seen in two won battles before it can be written down.' },
  knight: { id: 'runic', name: 'Spellguard', desc: 'Raise the blade: the next enemy spell is drawn into it, and its power comes back as MP.' },
  ranger: { id: 'throw', name: 'Hurl', desc: 'Hurl a spare weapon from the pack. Hits hard; it is sometimes found again after the battle.' },
  bard: { id: 'dance', name: 'Ballads', desc: 'Play the land\'s ballad for three turns. A new ballad is learned by winning on new ground.' },
  berserker: { id: 'rage', name: 'Frenzy', desc: 'Frenzy for the rest of the battle: half again the damage, 15% more damage taken, and random targets.' },
  hexer: { id: 'sketch', name: 'Mirror', desc: 'Turn one of a foe\'s own moves back on it, 20% stronger. Sometimes the mirror clouds.' },
  paladin: { id: 'trance', name: 'Holy Oath', desc: 'Once a battle: recover 30% HP, and for four turns deal half again the damage with holy-edged attacks.' },
  cleric: { id: 'health', name: 'Prayer', desc: 'A free party heal that also settles poison and slow. The more of the party is hurt, the stronger it is.' },
  landlord: { id: 'mimic', name: 'Reprise', desc: 'Repeat the last thing an ally did, free, at half power.' },
};
// moves learned by character level: [skillId, level]
export const BLITZ = [['bz_raging', 1], ['bz_aura', 6], ['bz_suplex', 10], ['bz_firedance', 15], ['bz_mantra', 19], ['bz_airblade', 23], ['bz_spiraler', 27], ['bz_bumrush', 30]];
export const TOOLS = [['tl_crossbow', 1], ['tl_noise', 7], ['tl_bio', 11], ['tl_flash', 15], ['tl_drill', 19], ['tl_chainsaw', 23], ['tl_anchor', 28]];
export const BUSHIDO = [['bs_fang', 1, 1], ['bs_tempest', 8, 2], ['bs_dispatch', 16, 3], ['bs_quadra', 24, 4]]; // [skillId, level, recovery level]
Object.assign(SKILLS, {
  bz_raging: S('Stone Fist', 0, 'one', 'phys', 1.5), bz_aura: S('Spirit Palm', 0, 'one', 'phys', 1.8, { elem: 'holy' }), bz_suplex: S('Mountain Throw', 0, 'one', 'phys', 2.4, { noBoss: true }),
  bz_firedance: S('Ember Kicks', 0, 'all', 'phys', 1.0, { elem: 'fire' }), bz_mantra: S('Still Water', 0, 'allies', 'heal', 0.8), bz_airblade: S('Gale Sweep', 0, 'all', 'phys', 1.3),
  bz_spiraler: S('Last Breath', 0, 'allies', 'heal', 3, { sacrifice: true }), bz_bumrush: S('Hundred Blows', 0, 'one', 'phys', 3.8, { pierce: 0.5 }),
  tl_crossbow: S('Clockwork Crossbow', 0, 'all', 'phys', 0.9), tl_noise: S('Rattle Bomb', 0, 'all', 'phys', 0.5, { stun: 0.3 }), tl_bio: S('Miasma Flask', 0, 'all', 'mag', 0.7, { fx: ['poison'] }),
  tl_flash: S('Lumen Flare', 0, 'all', 'mag', 1.1, { elem: 'holy' }), tl_drill: S('Auger', 0, 'one', 'phys', 2.6, { pierce: 0.6 }), tl_chainsaw: S('Gear Saw', 0, 'one', 'phys', 2.0, { instakill: 0.2 }),
  tl_anchor: S('Grapnel Cannon', 0, 'one', 'phys', 3.2, { pierce: 0.3 }),
  bs_fang: S('Draw Cut', 0, 'one', 'phys', 1.8), bs_tempest: S('Crescent Gale', 0, 'all', 'phys', 1.1), bs_dispatch: S('Moon Severance', 0, 'one', 'phys', 2.8, { crit: 0.3 }), bs_quadra: S('Fourfold Petal', 0, 'one', 'phys', 1.1, { hits: 4 }),
  cmd_health: S('Prayer', 0, 'allies', 'heal', 0.5),
  // ballads: four verses each, picked at 7, 6, 2 and 1 in 16
  dn_sunbath: S('Warm Chorus', 0, 'allies', 'heal', 0.6), dn_windslash: S('Gust Refrain', 0, 'all', 'phys', 1.0), dn_plasma: S('Spark Verse', 0, 'one', 'mag', 1.8, { elem: 'bolt' }), dn_cockatrice: S('Stunning Coda', 0, 'all', 'mag', 0.6, { stun: 0.4 }),
  dn_elffire: S('Ember Air', 0, 'all', 'mag', 1.0, { elem: 'fire' }), dn_wombat: S('Bramble Stomp', 0, 'one', 'phys', 1.8), dn_raccoon: S('Moss Lullaby', 0, 'allies', 'heal', 0.5), dn_wisp: S('Wisp Light', 0, 'all', 'mag', 1.4, { elem: 'holy' }),
  dn_snowball: S('Frost Note', 0, 'one', 'mag', 1.8, { elem: 'ice' }), dn_surge: S('Hail Round', 0, 'all', 'mag', 1.0, { elem: 'ice' }), dn_icerabbit: S('Hearthsong', 0, 'allies', 'heal', 0.7), dn_snowstorm: S('Whiteout', 0, 'all', 'mag', 1.5, { elem: 'ice', fx: ['slow'] }),
  dn_sandstorm: S('Sandwind Strain', 0, 'all', 'phys', 0.9, { fx: ['slow'] }), dn_antlion: S('Dune Drum', 0, 'one', 'phys', 2.0), dn_mirage: S('Heat Haze', 0, 'allies', 'buff', 0, { fx: ['defup'] }), dn_kitty: S('Sun Flare', 0, 'all', 'mag', 1.5, { elem: 'fire' }),
  dn_shadow: S('Lantern Shade', 0, 'all', 'mag', 1.0, { elem: 'dark' }), dn_poisfrog: S('Mire Dirge', 0, 'all', 'mag', 0.6, { fx: ['poison'] }), dn_snare: S('Grave Toll', 0, 'one', 'phys', 3.0, { pierce: 0.5 }),
  dn_landslide: S('Rockfall Reel', 0, 'all', 'phys', 1.1), dn_sonic: S('Thunder Stamp', 0, 'one', 'phys', 1.8), dn_whump: S('Mountain Heart', 0, 'one', 'phys', 3.0),
});
export const DANCES = {
  wind: { name: 'Song of the Open Road', moves: ['dn_sunbath', 'dn_windslash', 'dn_plasma', 'dn_cockatrice'] },
  forest: { name: 'Greenwood Air', moves: ['dn_elffire', 'dn_wombat', 'dn_raccoon', 'dn_wisp'] },
  snow: { name: 'Hearth Carol', moves: ['dn_snowball', 'dn_surge', 'dn_icerabbit', 'dn_snowstorm'] },
  desert: { name: 'Dune Lament', moves: ['dn_sandstorm', 'dn_antlion', 'dn_mirage', 'dn_kitty'] },
  dusk: { name: 'Lantern Hymn', moves: ['dn_shadow', 'dn_poisfrog', 'dn_elffire', 'dn_snare'] },
  earth: { name: 'Ember Reel', moves: ['dn_landslide', 'dn_sonic', 'dn_sunbath', 'dn_whump'] },
};
export const DANCE_ODDS = [7, 6, 2, 1];
// which ballad a battle backdrop belongs to (the battle's terrain)
export const terrainDance = (kind = '') => { const k = String(kind).split(':')[0];
  return { world: 'wind', storm: 'wind', windmill: 'wind', boss: 'earth', forest: 'forest', swamp: 'forest', snow: 'snow', spire: 'snow', desert: 'desert', ruins: 'desert', embers: 'earth', pizzaoven: 'earth' }[k] || 'dusk'; };
// Glyphs: any enemy spell (magic) can be copied once seen in two won battles; its MP cost follows its power
export const loreCost = (id) => { const s = SKILLS[id]; return Math.max(4, Math.round((s.pow || 1) * (s.tgt === 'all' ? 9 : 6))); };
export const loreable = (id) => { const s = SKILLS[id]; return !!s && s.kind === 'mag' && !id.startsWith('dn_') && !id.startsWith('tl_') && !id.startsWith('bz_'); };
export const known = (list, level) => list.filter(([, lv]) => level >= lv).map(([id]) => id);
