// ===== Four small optional dungeons (side quests): the Old Windmill (Haven Isle, early), the Wreck of the Salty Sue (Mire Isle),
// the Pyramid of Mild Inconvenience (Sunscar Isle) and the Ice Cave (Frost Isle, behind the gated pass). Each has 4 new foes, an
// optional boss, two bits of gear, party chat, a first-arrival scene, a boss-down scene and pub quiz questions.
// Side-effect module (like hopsend.js): imports from data.js and fills the shared objects. Map ids it expects (built in maps.js):
// 'windmill' (theme cellar), 'wreck' (theme crypt), 'pyramid' (theme ruins), 'icecave' (theme spire).
// Encounter tables: 'windmill', 'wreck', 'pyramid', 'icecave'. Bosses (all optional): miller, captain_barnacle, clerk_pharaoh, frozen_angler.
import { SKILLS, ENEMIES, ENCOUNTERS, DROPS, BOSSES, WEAPONS, ARMORS, ACCS, STORY, BESTIARY_NOTES, QUIZ } from './data.js';

const S = (name, mp, tgt, kind, pow, x = {}) => ({ name, mp, tgt, kind, pow, ...x });
const E = (name, icon, hp, atk, def, mag, spd, exp, gold, skills, x = {}) => ({ name, icon, hp, atk, def, mag, spd, exp, gold, skills, weak: [], res: [], ...x });
const D = (ck, cid, cp, rk, rid, rp) => ({ common: [ck, cid, cp], rare: [rk, rid, rp] });
const W = (name, type, atk, mag, sockets, price, innate, tier, desc, x = {}) => ({ name, type, atk, mag, sockets, price, innate, tier, desc, ...x });
const C = (s, t) => ({ s, t });

// ---------------------------------------------------------------- enemy skills (enemy-only, silly names)
Object.assign(SKILLS, {
  // the Old Windmill
  flourpuff: S('Cloud of Flour', 0, 'all', 'mag', 0.55, { fx: ['slow'] }),
  sackslam: S('Sack Slam', 0, 'one', 'phys', 1.3),
  dustscare: S('Dusty Haunting', 0, 'all', 'mag', 0.6, { elem: 'dark' }),
  anklepeck: S('Ankle Peck', 0, 'one', 'phys', 1.2, { stun: 0.15 }),
  honk: S('Aggressive Honk', 0, 'all', 'phys', 0.55),
  cheesenip: S('Cheese Nibble', 0, 'one', 'phys', 1.15, { fx: ['poison'] }),
  // the Miller
  stonedrop: S('Millstone Drop', 0, 'one', 'phys', 1.8),
  grindhalt: S('Grind to a Halt', 0, 'all', 'phys', 0.8, { fx: ['slow'] }),
  rollstone: S('Rolling Millstone', 0, 'all', 'phys', 0.85),
  floursmog: S('Flour Fog of War', 0, 'all', 'mag', 0.75, { elem: 'dark', fx: ['slow'] }),
  kneaddo: S('Knead to Know', 0, 'self', 'buff', 0, { fx: ['atkup'] }),
  // the Wreck of the Salty Sue
  seaweedwrap: S('Seaweed Wrap', 0, 'one', 'phys', 1.0, { fx: ['slow'] }),
  clawclamp: S('Claw Clamp', 0, 'one', 'phys', 1.5),
  scrape: S('Barnacle Scrape', 0, 'one', 'phys', 1.3, { fx: ['poison'] }),
  crusty: S('Extra Crusty', 0, 'self', 'buff', 0, { fx: ['defup'] }),
  saltylang: S('Salty Language', 0, 'all', 'mag', 0.7, { elem: 'dark' }),
  parrotpeck: S('Polly Peck', 0, 'one', 'phys', 1.3),
  // Captain Barnacle
  cutlassswing: S('Cutlass Swing', 0, 'one', 'phys', 1.8),
  broadside: S('Broadside, Madam', 0, 'all', 'mag', 1.0),
  plankwalk: S('Walk the Plank', 0, 'one', 'phys', 1.5, { stun: 0.25 }),
  yohoho: S('Yo Ho Ho', 0, 'self', 'buff', 0, { fx: ['atkup'] }),
  barnshell: S('Barnacle Shell', 0, 'self', 'buff', 0, { fx: ['defup'] }),
  bilgeburp: S('Bilge Water Burp', 0, 'all', 'mag', 0.75, { fx: ['poison'] }),
  // the Pyramid of Mild Inconvenience
  formflurry: S('Form Flurry', 0, 'all', 'phys', 0.6),
  stampreject: S('Stamp of Rejection', 0, 'one', 'phys', 1.4),
  queuejump: S('Queue Jump', 0, 'one', 'phys', 1.25),
  takenumber: S('Please Take a Number', 0, 'all', 'buff', 0, { fx: ['slow'], hostile: true }),
  redtape: S('Red Tape', 0, 'one', 'phys', 1.0, { fx: ['slow'] }),
  luggagelob: S('Left Luggage Lob', 0, 'one', 'phys', 1.55),
  // the Clerk Pharaoh
  stampslam: S('Rubber Stamp Slam', 0, 'one', 'phys', 1.9),
  formfill: S('Form 27B/6', 0, 'one', 'mag', 1.4, { elem: 'dark', fx: ['poison'] }),
  officehours: S('Office Hours Are Over', 0, 'all', 'mag', 1.0, { elem: 'dark', fx: ['slow'] }),
  paperstorm: S('Paper Storm', 0, 'all', 'phys', 0.8),
  copierbeam: S('Photocopier Beam', 0, 'one', 'mag', 1.6, { elem: 'holy' }),
  outofoffice: S('Out of Office', 0, 'self', 'buff', 0, { fx: ['defup'] }),
  stamprally: S('Stamp Rally', 0, 'self', 'buff', 0, { fx: ['atkup'] }),
  // the Ice Cave
  fishslap: S('Frozen Fish Slap', 0, 'one', 'phys', 1.45),
  eelzap: S('Hole-in-One Zap', 0, 'one', 'mag', 1.5, { elem: 'bolt' }),
  icycoil: S('Icy Coil', 0, 'one', 'phys', 1.1, { elem: 'ice', fx: ['slow'] }),
  coffeebreak: S('Coffee Break', 0, 'self', 'heal', 1.2),
  thermos: S('Scalding Thermos Lob', 0, 'one', 'mag', 1.45, { elem: 'fire' }),
  lanternglow: S('Lantern Glow', 0, 'all', 'mag', 0.7, { elem: 'ice' }),
  // the Frozen Angler
  bigfishslap: S('Whopper Slap', 0, 'one', 'phys', 1.9),
  tidalsplash: S('Tidal Splash', 0, 'all', 'mag', 1.0, { elem: 'ice' }),
  lureflash: S('Lure Flash', 0, 'one', 'mag', 1.5, { elem: 'dark', fx: ['slow'] }),
  reelin: S('Reel It In', 0, 'one', 'phys', 1.5, { stun: 0.3 }),
  gulp: S('Ice Hole Gulp', 0, 'one', 'phys', 1.3, { fx: ['drain'] }),
  fishtale: S('The One That Got Away', 0, 'self', 'buff', 0, { fx: ['atkup'] }),
});

// ---------------------------------------------------------------- enemies
Object.assign(ENEMIES, {
  // The Old Windmill (Lv 5-8)
  wm_mouse: E('Dog-Sized Mouse', '🐀', 110, 22, 3, 3, 13, 32, 20, [['cheesenip', 2], ['bite', 1]], { weak: ['fire'] }),
  wm_goose: E('Angry Goose', '🪿', 130, 25, 5, 4, 12, 38, 24, [['anklepeck', 2], ['honk', 1], ['bite', 1]], { weak: ['bolt', 'fire'] }),
  wm_imp: E('Flour Sack Imp', '👹', 120, 12, 6, 28, 10, 36, 26, [['flourpuff', 2], ['sackslam', 1], ['tackle', 1]], { weak: ['fire'] }),
  wm_ghost: E('Floury Ghost', '👻', 170, 10, 8, 32, 12, 50, 36, [['draintouch', 2], ['dustscare', 1], ['flourpuff', 1]], { weak: ['holy', 'fire'], res: ['dark'] }),
  miller: E('The Miller', '👻', 1100, 36, 10, 32, 8, 520, 400, [['stonedrop', 3], ['grindhalt', 2], ['rollstone', 2], ['floursmog', 2], ['kneaddo', 1]], { weak: ['holy', 'fire'], res: ['dark'], boss: true, cp: 7 }),
  // The Wreck of the Salty Sue (Lv 11-14)
  wr_sailor: E('Drowned Sailor', '🧟', 300, 50, 10, 5, 5, 112, 58, [['slam', 2], ['seaweedwrap', 2], ['rot', 1]], { weak: ['fire', 'holy'], res: ['dark', 'ice'] }),
  wr_crab: E('Fish Supper Crab', '🦀', 280, 52, 24, 4, 9, 120, 62, [['clawclamp', 2], ['pincer', 2], ['tackle', 1]], { weak: ['fire', 'bolt'] }),
  wr_barnacle: E('Barnacle Golem', '🗿', 440, 56, 28, 4, 3, 140, 70, [['slam', 2], ['scrape', 2], ['crusty', 1]], { weak: ['bolt'], res: ['ice', 'dark'] }),
  wr_parrot: E('Potty-Mouthed Parrot', '🦜', 240, 38, 9, 54, 18, 126, 66, [['saltylang', 2], ['parrotpeck', 2], ['hexbolt', 1]], { weak: ['bolt', 'ice'], res: ['dark'] }),
  captain_barnacle: E('Captain Barnacle', '🏴‍☠️', 3050, 56, 18, 46, 10, 1400, 1300, [['cutlassswing', 3], ['plankwalk', 2], ['broadside', 2], ['bilgeburp', 1], ['yohoho', 1], ['barnshell', 1]], { weak: ['holy', 'fire'], res: ['dark', 'ice'], boss: true, cp: 12 }),
  // The Pyramid of Mild Inconvenience (Lv 13-16)
  py_mummy: E('Paperwork Mummy', '🧻', 380, 52, 16, 10, 6, 150, 80, [['formflurry', 2], ['wrap', 1], ['stampreject', 2]], { weak: ['fire', 'holy'], res: ['dark', 'ice'] }),
  py_scarab: E('Queueing Scarab', '🪲', 300, 56, 26, 6, 12, 140, 68, [['queuejump', 2], ['takenumber', 1], ['pincer', 1]], { weak: ['ice'], res: ['fire'] }),
  py_golem: E('Lost Property Golem', '🗿', 640, 60, 28, 6, 3, 200, 96, [['luggagelob', 2], ['slam', 2], ['takenumber', 1]], { weak: ['ice'], res: ['fire', 'bolt'] }),
  py_cobra: E('Red Tape Cobra', '🐍', 310, 48, 13, 46, 16, 144, 74, [['redtape', 2], ['venombite', 1], ['hypnogaze', 1]], { weak: ['ice'], res: ['dark'] }),
  clerk_pharaoh: E('The Clerk Pharaoh', '📋', 3700, 60, 22, 56, 11, 1900, 1700, [['stampslam', 3], ['formfill', 2], ['paperstorm', 2], ['officehours', 2], ['copierbeam', 1], ['stamprally', 1], ['outofoffice', 1]], { weak: ['fire', 'holy'], res: ['dark', 'ice'], boss: true, cp: 13 }),
  // The Ice Cave (Lv 15-18)
  ic_fisher: E('Ice-Fishing Zombie', '🧟', 520, 70, 16, 6, 4, 220, 100, [['fishslap', 2], ['slam', 1], ['frostbite', 1]], { weak: ['fire', 'holy'], res: ['ice', 'dark'] }),
  ic_eel: E('Ice Hole Eel', '🐍', 420, 62, 14, 60, 18, 230, 104, [['eelzap', 2], ['icycoil', 2], ['frostbite', 1]], { weak: ['fire', 'bolt'], res: ['ice'] }),
  ic_yeti: E('Coffee Break Yeti', '🦍', 700, 74, 22, 6, 6, 250, 110, [['slam', 2], ['thermos', 1], ['coffeebreak', 1], ['claw', 1]], { weak: ['fire'], res: ['ice'] }),
  ic_wisp: E('Ice Hut Lantern Wisp', '🔦', 380, 10, 12, 70, 15, 230, 100, [['lanternglow', 2], ['icebolt', 2], ['hexbolt', 1]], { weak: ['fire', 'holy'], res: ['ice', 'dark'] }),
  frozen_angler: E('The Frozen Angler', '🐟', 4800, 78, 26, 68, 10, 2700, 2300, [['bigfishslap', 3], ['tidalsplash', 2], ['lureflash', 2], ['reelin', 2], ['gulp', 2], ['fishtale', 1]], { weak: ['fire', 'bolt'], res: ['ice'], boss: true, cp: 14 }),
});
ENCOUNTERS.windmill = [['wm_mouse', 'wm_mouse'], ['wm_goose'], ['wm_imp', 'wm_mouse'], ['wm_goose', 'wm_mouse', 'wm_mouse'], ['wm_ghost'], ['wm_imp', 'wm_imp', 'wm_goose'], ['wm_ghost', 'wm_goose'], ['wm_ghost', 'wm_imp', 'wm_ghost']];
ENCOUNTERS.wreck = [['wr_sailor', 'wr_sailor'], ['wr_crab', 'wr_crab'], ['wr_parrot', 'wr_sailor'], ['wr_barnacle'], ['wr_crab', 'wr_parrot', 'wr_crab'], ['wr_sailor', 'wr_barnacle'], ['wr_barnacle', 'wr_parrot'], ['wr_barnacle', 'wr_crab', 'wr_sailor']];
ENCOUNTERS.pyramid = [['py_scarab', 'py_scarab'], ['py_mummy', 'py_mummy'], ['py_cobra', 'py_scarab'], ['py_golem'], ['py_mummy', 'py_cobra', 'py_scarab'], ['py_golem', 'py_scarab'], ['py_golem', 'py_mummy'], ['py_golem', 'py_cobra', 'py_mummy']];
ENCOUNTERS.icecave = [['ic_fisher', 'ic_fisher'], ['ic_eel', 'ic_eel'], ['ic_yeti'], ['ic_wisp', 'ic_fisher', 'ic_wisp'], ['ic_yeti', 'ic_eel'], ['ic_yeti', 'ic_wisp'], ['ic_yeti', 'ic_fisher', 'ic_eel'], ['ic_yeti', 'ic_yeti']];

BOSSES.miller = { name: 'The Miller', intro: 'The great millstone grinds to a halt. A pale figure in a floury apron lifts it overhead with one ghostly hand. "WHO IS THIS, WALKING ON MY FLOOR?" he moans. "I JUST MOPPED."', optional: true, loot: { armors: ['miller_apron'] } };
BOSSES.captain_barnacle = { name: 'Captain Barnacle', intro: 'The deck groans. A figure crusted in barnacles rises from the captain\'s chair, tricorn dripping, parrot swearing on his shoulder. "AVAST, LANDLUBBERS! Nobody boards the Salty Sue without a boarding pass!"', optional: true, loot: { accs: ['compass_charm'] } };
BOSSES.clerk_pharaoh = { name: 'The Clerk Pharaoh', intro: 'A stack of forms the size of a sarcophagus lurches upright. Behind it sits a pharaoh in a crooked crown and reading glasses. "Have you got an appointment?" he sighs, lifting a giant rubber stamp. "No? Then it is the wrong queue."', optional: true, loot: { weapons: ['rubber_stamp'] } };
BOSSES.frozen_angler = { name: 'The Frozen Angler', intro: 'The ice cracks. Out of the fishing hole slithers a fish the size of a bus, glowing lure bobbing over crooked teeth. "BLUB," it says. Not a greeting.', optional: true, loot: { armors: ['thermal_onesie'] } };

// ---------------------------------------------------------------- gear (2 per dungeon; one is boss loot, the other a rare drop)
Object.assign(WEAPONS, {
  rolling_pin: W('Nan\'s Rolling Pin', 'sword', 12, 0, 2, 300, undefined, 2, 'Solid beech, floured. Hits like a Sunday roast. A good clout may stun. Nan sends her love.', { def: 2, proc: ['stun', 0.1] }),
  soggy_cutlass: W('Soggy Cutlass', 'katana', 22, 0, 2, 1100, 'crit', 3, 'Waterlogged but sharp. Slashes with swagger and often crits. Smells of low tide.', { crit: 0.18, spd: 1 }),
  rubber_stamp: W('Rubber Stamp of Approval', 'axe', 25, 0, 2, 0, 'execute', 3, 'Ka-chunk! Hits like a filing cabinet and finishes weakened foes. DENIED, in red.', { spd: -1, crit: 0.12 }),
  ice_fishing_rod: W('Ice Fishing Rod', 'whip', 19, 7, 2, 1300, 'frost', 3, 'Frosty and flexible. Slows whatever it hooks. Includes a flask and a very long wait.', { elem: 'ice', proc: ['slow', 0.3] }),
});
Object.assign(ARMORS, {
  miller_apron: { name: 'Miller\'s Floury Apron', desc: 'Sturdy canvas with big pockets. Light and breezy. Ghosts can still smell the baking.', def: 13, hp: 18, spd: 1, sockets: 1, price: 0 },
  lost_property_coat: { name: 'Lost Property Overcoat', desc: 'Roomy, warm and unclaimed for three thousand years. One glove in the pocket, always the left.', def: 21, hp: 35, spd: 0, sockets: 1, price: 1100 },
  thermal_onesie: { name: 'Thermal Fishing Onesie', desc: 'Heavy, hooded and heated. Frostproof, with a built-in flask holder and a tragic fish print.', def: 27, hp: 42, spd: -1, res: ['ice'], sockets: 2, price: 0 },
});
Object.assign(ACCS, {
  compass_charm: { name: 'Wonky Compass Charm', desc: 'More MP, speed and HP. The needle always points at the pub. Surprisingly useful.', mag: 4, mp: 15, spd: 4, hp: 25, sockets: 1, price: 0 },
});

// ---------------------------------------------------------------- drops
Object.assign(DROPS, {
  wm_mouse: D('items', 'potion', 0.3, 'items', 'antidote', 0.1), wm_goose: D('items', 'potion', 0.3, 'weapons', 'rolling_pin', 0.05),
  wm_imp: D('items', 'ether', 0.25, 'gems', 'swift', 0.06), wm_ghost: D('items', 'ether', 0.3, 'gems', 'shadow', 0.06),
  miller: D('items', 'hipotion', 1, 'gems', 'vamp', 0.5),
  wr_sailor: D('items', 'hipotion', 0.3, 'weapons', 'soggy_cutlass', 0.04), wr_crab: D('items', 'antidote', 0.3, 'gems', 'pierce', 0.06),
  wr_barnacle: D('items', 'hipotion', 0.3, 'gems', 'guard', 0.07), wr_parrot: D('items', 'ether', 0.3, 'gems', 'echo', 0.05),
  captain_barnacle: D('items', 'elixir', 1, 'gems', 'crit', 0.5),
  py_mummy: D('items', 'remedy', 0.25, 'gems', 'thrifty', 0.06), py_scarab: D('items', 'hipotion', 0.3, 'gems', 'swift', 0.06),
  py_golem: D('items', 'phoenix', 0.15, 'armors', 'lost_property_coat', 0.05), py_cobra: D('items', 'remedy', 0.25, 'gems', 'venom', 0.07),
  clerk_pharaoh: D('items', 'elixir', 1, 'gems', 'execute', 0.5),
  ic_fisher: D('items', 'hipotion', 0.3, 'weapons', 'ice_fishing_rod', 0.04), ic_eel: D('items', 'megaether', 0.2, 'gems', 'bolt', 0.06),
  ic_yeti: D('items', 'hipotion', 0.3, 'gems', 'wide', 0.07), ic_wisp: D('items', 'megaether', 0.2, 'gems', 'frost', 0.06),
  frozen_angler: D('items', 'elixir', 1, 'gems', 'echo', 0.5),
});

// ---------------------------------------------------------------- bestiary field notes (<= 100 chars)
Object.assign(BESTIARY_NOTES, {
  wm_mouse: ['devon', 'Bro, it is the size of a Labrador. Fire works. The nibble poisons, so bring antidotes.'],
  wm_goose: ['adam', 'Honk means trouble. Bolts or fire. The ankle peck can stun, so keep your legs back.'],
  wm_imp: ['brenna', 'Made of flour and spite. Fire sets it right off. Its flour cloud slows the lot of us.'],
  wm_ghost: ['wendell', 'A spectre of the baking arts! Holy or fire. Dark is no use. Its haunting hits all of us.'],
  miller: ['adam', 'Holy or fire, never dark. The millstone drop is huge, and the flour fog slows us.'],
  wr_sailor: ['devon', 'Fire or holy, bro. He is still waiting for the tide. Seaweed wrap slows you down.'],
  wr_crab: ['brenna', 'Fish supper, and it knows. Fire or bolts. The claw clamp hurts, so keep the healer ready.'],
  wr_barnacle: ['adam', 'Crusty as a pub carpet. Bolts crack it, ice and dark slide off. Scrapes poison.'],
  wr_parrot: ['devon', 'Bro, the LANGUAGE. Bolts or ice. Dark does nothing. The swearing hits the whole party.'],
  captain_barnacle: ['wendell', 'A scurvy sea dog! Holy or fire. The plank can stun, so watch the healer.'],
  py_mummy: ['adam', 'Fire or holy. It hits everyone with forms, and nobody here is filling in a form.'],
  py_scarab: ['devon', 'Queue jumping, bro! Ice only, fire slides off. It tells us to take a number and slows us.'],
  py_golem: ['brenna', 'Lost property, never claimed. Ice cracks it. Bolts and fire do nothing. Luggage lob hurts.'],
  py_cobra: ['wendell', 'A serpent of the civil service! Ice. Dark does nothing. Its red tape slows us.'],
  clerk_pharaoh: ['adam', 'Fire or holy. Never dark or ice. Expect rubber stamps, forms for all, and the wrong queue.'],
  ic_fisher: ['devon', 'He has been waiting for a bite since the ice age, bro. Fire or holy. The fish slap is rude.'],
  ic_eel: ['brenna', 'Fast, slippery, shocking. Fire or bolts, ice does nothing. Its zap hits one hard.'],
  ic_yeti: ['devon', 'On his break, bro! Fire only. The flask burns and he heals himself, so hit him quick.'],
  ic_wisp: ['adam', 'A lantern for ice huts. Fire or holy. Ice and dark do nothing. The glow chills us all.'],
  frozen_angler: ['wendell', 'Behold the leviathan! Fire or bolts. Beware the gulp, the reel, and the sudden urge to nap.'],
});

// ---------------------------------------------------------------- story: first arrival
Object.assign(STORY.area, {
  windmill: [
    { s: 'n', t: 'The Old Windmill creaks on its hill, sails turning with no wind. A faint smell of warm bread drifts out of the door. So does a faint moan.' },
    { s: 'devon', t: 'Bro, it smells like a bakery in here. A haunted bakery.' },
    { s: 'adam', t: 'The farmer said the mill closed forty years ago. Something still seems to be working the late shift.' },
    { s: 'devon', t: 'If they do cinnamon swirls, I\'m in.' },
    { s: 'n', t: 'Somewhere upstairs, a millstone starts to turn. A goose honks from the dark.' },
    { s: 'brenna', t: 'Goose, ghost or mouse. If any of them get behind the bar, I quit.' },
    { s: 'wendell', t: 'A siege of flour! Fear not, my friends. I have faced worse. I faced a wedding buffet once.' },
  ],
  wreck: [
    { s: 'n', t: 'The Salty Sue lies on her side in the bog, mast snapped, hull green with slime. Someone has hung bunting from the rigging. It is mostly weeds.' },
    { s: 'devon', t: 'A pirate ship in a swamp, bro. A SWAMP. How did it even get here?' },
    { s: 'adam', t: 'Sea levels were higher a thousand years ago. Or the captain took a very wrong turn.' },
    { s: 'devon', t: 'Both, probably. Sat nav says "turn left at the ocean".' },
    { s: 'n', t: 'Something inside the hull squawks a word that makes a nearby frog blush.' },
    { s: 'brenna', t: 'I don\'t like it. It smells like low tide and bad decisions.' },
    { s: 'wendell', t: 'Ahoy! I shall board her with honour, and a very clean sword.' },
  ],
  pyramid: [
    { s: 'n', t: 'The Pyramid of Mild Inconvenience rises from the dunes, perfectly square. A queue of cheerful scarabs winds all the way up the front steps.' },
    { s: 'devon', t: 'There\'s a sign on the door, bro. "Please take a number." There\'s a ticket machine. It\'s broken.' },
    { s: 'adam', t: 'The pharaoh who built this had a reputation. Everything required a form.' },
    { s: 'devon', t: 'Please let there be no forms. I have forms at work. Well, my brother has forms at work.' },
    { s: 'adam', t: 'Dev, I think you have a job.' },
    { s: 'brenna', t: 'I\'d rather fight a hundred mummies than stand in one more queue.' },
    { s: 'wendell', t: 'A noble edifice! Whoever commanded it clearly liked a lot of corridors.' },
  ],
  icecave: [
    { s: 'n', t: 'Behind the pass, a cave glitters, cold as a fridge. A frozen lake fills the floor, dotted with tiny huts, each with a hole in the ice and a deckchair.' },
    { s: 'devon', t: 'Bro, are those fishing huts? Somebody has just left their rods out.' },
    { s: 'adam', t: 'Every rod has an angler still holding it. They have been waiting a very long time.' },
    { s: 'devon', t: 'No bites in a hundred years. Brutal.' },
    { s: 'n', t: 'Deep beneath the ice, something enormous turns over. It is probably not a trout.' },
    { s: 'brenna', t: 'If I wanted to freeze, I\'d go back to the beer cellar in January.' },
    { s: 'wendell', t: 'Fear not, I have the finest thermal underwear in the realm.' },
  ],
});

// ---------------------------------------------------------------- story: boss down
STORY.after.miller = [
  { s: 'n', t: 'The Miller sighs, sets the great stone on the floor and gives a tiny wave. The sails stop. The whole mill goes still, and a little warm.' },
  { s: 'devon', t: 'Bro. He just wanted somebody to say he\'d done a good job.' },
  { s: 'adam', t: 'Forty years of overtime and nobody noticed. I know that feeling.' },
  { s: 'brenna', t: 'There\'s a sack of flour by the door. I\'m taking it. Pastry is calling.' },
  { s: 'wendell', t: 'Flour on my gauntlets! The mark of a true miller\'s knight.' },
  { s: 'n', t: 'Down in the village, every loaf rises a little higher than usual.' },
];
STORY.after.captain_barnacle = [
  { s: 'n', t: 'Captain Barnacle slumps into his chair, tricorn askew. The parrot clears its throat, and for once says nothing at all.' },
  { s: 'devon', t: 'It\'s gone quiet, bro. Suspiciously quiet. Is it going to swear?' },
  { s: 'adam', t: 'It is looking at you, Dev, and judging you.' },
  { s: 'brenna', t: 'I wouldn\'t take that parrot home. I wouldn\'t take that ship home either.' },
  { s: 'wendell', t: 'A noble end to a noble scoundrel! I salute him, and his strong opinions on rum.' },
  { s: 'n', t: 'The bog gives a long, wet gurgle, and the Salty Sue settles a little deeper into the mud.' },
];
STORY.after.clerk_pharaoh = [
  { s: 'n', t: 'The Clerk Pharaoh puts his stamp down, blinks, and opens a drawer. Inside is a single, very official certificate. He stamps it. It says APPROVED.' },
  { s: 'devon', t: 'Bro, he approved us! After three thousand years of paperwork, someone approved something!' },
  { s: 'adam', t: 'I think he\'s crying. Quietly, in triplicate.' },
  { s: 'brenna', t: 'Take the certificate. Frame it. It\'ll be the first thing in the whole world that never got lost in the post.' },
  { s: 'wendell', t: 'Approved by the Pharaoh himself! I shall hang it above my fireplace, next to the one for my moustache.' },
  { s: 'n', t: 'Far across the desert, the queue outside the pyramid starts to move for the first time in a thousand years.' },
];
STORY.after.frozen_angler = [
  { s: 'n', t: 'The Frozen Angler flops, gives one last gloomy blub, and slides back into the ice. The lake gives a long, satisfied crack and stills. The anglers lower their rods at last.' },
  { s: 'devon', t: 'Bro, we caught the big one. We caught THE big one.' },
  { s: 'adam', t: 'The anglers are packing up. One of them just whispered "thank you" and went home.' },
  { s: 'brenna', t: 'Give it a minute and half of them will claim they were the ones who landed it.' },
  { s: 'wendell', t: 'A noble catch! It shall be the finest fish tale in the land, and every word shall be true.' },
  { s: 'n', t: 'The huts light up one by one, and then, very softly, go out for the night.' },
];

// ---------------------------------------------------------------- party chat
STORY.chat.push(
  { id: 'mill_flour', at: 'windmill', if: '!miller', lines: [C('devon', 'Bro, there\'s flour on EVERYTHING. Even the ghosts have flour on them.'), C('adam', 'It\'s a mill. That\'s what mills do.'), C('devon', 'It\'s in my beard. I have a bread beard.'), C('adam', 'You look like a very small, very proud baker.')] },
  { id: 'mill_goose', at: 'windmill', if: '!miller', lines: [C('devon', 'Why is there a goose in the mill, bro? Is it a flour goose? Did it ask for this?'), C('adam', 'Geese are territorial. We\'re on its patch.'), C('devon', 'It\'s looking at me, Ad. It has the eyes of a landlord.'), C('adam', 'Don\'t make eye contact. Just back away. Slowly.')] },
  { id: 'wreck_swamp', at: 'wreck', if: '!captain_barnacle', lines: [C('devon', 'A pirate ship in a swamp, bro. In a bog. The crabs have given up pretending.'), C('adam', 'The Salty Sue. She was a trading ship, until something went very wrong with the tide.'), C('devon', 'The tide went out for a fag and never came back.'), C('adam', 'That\'s not how tides work, Dev.')] },
  { id: 'wreck_parrot', at: 'wreck', if: 'v:wreck !captain_barnacle', lines: [C('devon', 'That parrot just said something I\'ve only heard in a football stand.'), C('adam', 'Do not repeat it.'), C('devon', 'I\'m not repeating it. I\'m just sort of reeling.'), C('adam', 'A thousand years of sailors. That\'s a lot of vocabulary.')] },
  { id: 'pyr_form', at: 'pyramid', if: '!clerk_pharaoh', lines: [C('devon', 'Bro, they\'ve got a ticket machine in a pyramid. In a PYRAMID.'), C('adam', 'The pharaoh wanted everything in order. Even the afterlife.'), C('devon', 'Imagine dying and having to fill out a form to be dead.'), C('adam', 'I think that\'s the whole building.')] },
  { id: 'pyr_queue', at: 'pyramid', if: 'v:pyramid !clerk_pharaoh', lines: [C('devon', 'This is a lovely corridor, but it has a lot of forms in it.'), C('adam', 'Don\'t read them.'), C('devon', 'I\'ve read one. It said "Form 3: Reason for Dying."'), C('adam', 'And what did you put?'), C('devon', 'Eating the mystery stew.')] },
  { id: 'ice_hut', at: 'icecave', if: '!frozen_angler', lines: [C('devon', 'Ad, look at that bloke with the rod. He has been there since, what, the Middle Ages?'), C('adam', 'Technically we are in the Middle Ages.'), C('devon', 'The real Middle Ages, bro. The long ones.'), C('adam', 'He is still waiting for a bite. That is dedication.')] },
  { id: 'ice_snack', at: 'icecave', if: 'v:icecave !frozen_angler', lines: [C('devon', 'Yeti on a coffee break, bro. His flask has a smiley face on it.'), C('adam', 'It is a thermos. And he is standing between us and the exit.'), C('devon', 'I respect a lad who needs a minute.'), C('adam', 'You respect everyone who needs a minute.')] },
);

// ---------------------------------------------------------------- pub quiz
QUIZ.push(
  { q: 'What is a windmill mainly used to grind into flour?', a: ['Wheat', 'Cheese', 'Pebbles', 'Moustache wax'], if: 'v:windmill' },
  { q: 'Which animal stands guard, honking angrily, in the Old Windmill?', a: ['A goose', 'A llama', 'A flamingo', 'Barnaby the barman'], if: 'v:windmill' },
  { q: 'What is the name of the ship sunk in the bog on Mire Isle?', a: ['The Salty Sue', 'The Soggy Susan', 'The Wet Wendy', 'The Gilded Goose'], if: 'v:wreck' },
  { q: 'Which silly bird sits on Captain Barnacle\'s shoulder and swears a lot?', a: ['A parrot', 'A pigeon', 'A penguin', 'A pelican'], if: 'v:wreck' },
  { q: 'Which silly rule does the Pyramid of Mild Inconvenience insist on, in triplicate?', a: ['Forms and queues', 'Quiet corridors', 'Free biscuits', 'No fedoras'], if: 'v:pyramid' },
  { q: 'What does the Frozen Angler wave from the top of its head to lure victims?', a: ['A glowing lure', 'A tiny flag', 'A kebab', 'A bell'], if: 'v:icecave' },
);
