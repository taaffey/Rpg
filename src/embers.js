// ===== Cinder Isle: the sixth island (post-ending, tier 5). A black basalt holiday island in the far north-west, reached by ferry once the
// Frost Titan has fallen. Kilnhaven is full of stag-do tourists and fire-eaters, and the volcano is secretly a gigantic wood-fired pizza
// oven that has been left on since 1987. The dungeon is The Pizza Oven; its boss is The Margherita (optional).
// Side-effect module (like hopsend.js): imports from data.js and fills the shared objects. Map ids it expects (built in maps.js):
// 'kilnhaven' (village), 'pizzaoven' (dungeon). Encounter tables: 'embers' (island) and 'pizzaoven'.
// NPC givers: 'Kilnhaven lifeguard' (sunburn), 'Kilnhaven beach bar owner' (kebabs), 'Kilnhaven volcano warden' (margherita).
import { SKILLS, ENEMIES, ENCOUNTERS, DROPS, BOSSES, WEAPONS, ARMORS, ACCS, SHOPS, QUESTS, STORY, BESTIARY_NOTES, QUIZ } from './data.js';

const S = (name, mp, tgt, kind, pow, x = {}) => ({ name, mp, tgt, kind, pow, ...x });
const E = (name, icon, hp, atk, def, mag, spd, exp, gold, skills, x = {}) => ({ name, icon, hp, atk, def, mag, spd, exp, gold, skills, weak: [], res: [], ...x });
const D = (ck, cid, cp, rk, rid, rp) => ({ common: [ck, cid, cp], rare: [rk, rid, rp] });
const W = (name, type, atk, mag, sockets, price, innate, tier, desc, x = {}) => ({ name, type, atk, mag, sockets, price, innate, tier, desc, ...x });
const C = (s, t) => ({ s, t });

// ---------------------------------------------------------------- enemy skills (enemy-only, silly names)
Object.assign(SKILLS, {
  sparkler: S('Sparkler Salute', 0, 'all', 'mag', 0.75, { elem: 'fire' }),
  greasetail: S('Greasy Tail Slap', 0, 'one', 'phys', 1.3),
  cheesepull: S('Cheese Pull', 0, 'one', 'phys', 1.0, { fx: ['slow'] }),
  butterslick: S('Garlic Butter Slick', 0, 'one', 'phys', 1.2, { fx: ['slow'] }),
  garlicbreath: S('Garlic Breath', 0, 'all', 'mag', 0.75, { fx: ['poison'] }),
  eelshock: S('Eel Shock', 0, 'one', 'mag', 1.5, { elem: 'bolt' }),
  brinebite: S('Brine Bite', 0, 'one', 'phys', 1.2, { fx: ['poison'] }),
  saltspray: S('Salt Spray', 0, 'all', 'phys', 0.65),
  cheeseslam: S('Molten Cheese Splat', 0, 'one', 'phys', 1.5),
  lavaslop: S('Lava Slop', 0, 'one', 'mag', 1.5, { elem: 'fire', fx: ['slow'] }),
  bubbling: S('Bubbling Over', 0, 'all', 'mag', 0.8, { elem: 'fire' }),
  hotstone: S('Hot Stone Slam', 0, 'one', 'phys', 2.0),
  tremor: S('Volcanic Tantrum', 0, 'all', 'phys', 0.75),
  coolit: S('Cool Down Period', 0, 'self', 'buff', 0, { fx: ['defup'] }),
  torchjab: S('Torch Poke', 0, 'one', 'phys', 1.3, { elem: 'fire' }),
  fireshow: S('Fire Breath Show', 0, 'all', 'mag', 0.85, { elem: 'fire' }),
  flambe: S('Flambe Finish', 0, 'one', 'mag', 1.7, { elem: 'fire' }),
  crowdwarm: S('Warm Up the Crowd', 0, 'self', 'buff', 0, { fx: ['atkup'] }),
  groomspeech: S('Best Man Speech', 0, 'all', 'mag', 0.8, { elem: 'dark', fx: ['slow'] }),
  sambuca: S('Sambuca Shot', 0, 'one', 'mag', 1.4, { elem: 'dark', fx: ['poison'] }),
  antlercharge: S('Antler Charge', 0, 'one', 'phys', 1.5),
  // the Margherita
  stuffedcrust: S('Stuffed Crust Slam', 0, 'one', 'phys', 1.9),
  moltenpour: S('Molten Cheese Pour', 0, 'all', 'mag', 1.0, { elem: 'fire', fx: ['slow'] }),
  pepfrisbee: S('Pepperoni Frisbee', 0, 'one', 'phys', 1.5, { pierce: 0.3 }),
  peelsweep: S('Pizza Peel Sweep', 0, 'all', 'phys', 0.85),
  extracheese: S('Extra Cheese Hug', 0, 'one', 'phys', 1.2, { fx: ['drain'] }),
  garlicdip: S('Garlic Dip Cloud', 0, 'all', 'buff', 0, { fx: ['poison'], hostile: true }),
  ovenblast: S('Oven Door Blast', 0, 'all', 'mag', 1.25, { elem: 'fire' }),
  honeydrizzle: S('Hot Honey Drizzle', 0, 'one', 'mag', 1.7, { elem: 'fire', fx: ['poison'] }),
  freshoven: S('Fresh From the Oven', 0, 'self', 'buff', 0, { fx: ['atkup'] }),
});

// ---------------------------------------------------------------- enemies (Lv ~20-26, tier 5: tougher than the Frost Spire and the Brewery)
Object.assign(ENEMIES, {
  cinder_imp: E('Chilli Flake Imp', '👹', 900, 24, 20, 118, 15, 330, 150, [['fireball', 2], ['sparkler', 2], ['tackle', 1]], { weak: ['ice'], res: ['fire'] }),
  pepperoni_salamander: E('Pepperoni Salamander', '🦎', 1150, 128, 26, 48, 14, 370, 160, [['firefang', 2], ['greasetail', 2], ['cheesepull', 1]], { weak: ['ice'], res: ['fire'] }),
  garlic_knot: E('Cheesy Garlic Knot', '🧄', 1000, 112, 22, 80, 10, 320, 150, [['butterslick', 2], ['garlicbreath', 2], ['tackle', 1]], { weak: ['ice'], res: ['dark'] }),
  anchovy_eel: E('Salty Anchovy Eel', '🐍', 840, 118, 16, 90, 19, 350, 165, [['eelshock', 2], ['brinebite', 2], ['saltspray', 1]], { weak: ['ice'], res: ['fire', 'bolt'] }),
  magma_slime: E('Molten Cheese Slime', '🟠', 1300, 106, 18, 94, 7, 350, 160, [['cheeseslam', 2], ['lavaslop', 2], ['bubbling', 1]], { weak: ['ice'], res: ['fire'] }),
  basalt_golem: E('Pizza Stone Golem', '🗿', 1600, 104, 36, 6, 4, 480, 220, [['hotstone', 2], ['slam', 2], ['tremor', 1], ['coolit', 1]], { weak: ['ice'], res: ['fire', 'bolt'] }),
  fire_eater: E('Stag Do Fire-Eater', '🔥', 1100, 118, 24, 116, 13, 420, 200, [['torchjab', 2], ['fireshow', 2], ['flambe', 1], ['crowdwarm', 1]], { weak: ['ice'], res: ['fire'] }),
  stag_wraith: E('Lost Stag Do Wraith', '👻', 1000, 48, 18, 124, 16, 440, 210, [['draintouch', 1], ['groomspeech', 2], ['sambuca', 2], ['antlercharge', 1]], { weak: ['holy', 'ice'], res: ['dark'] }),
  margherita: E('The Margherita', '🍕', 6400, 92, 34, 90, 11, 5200, 4200, [['stuffedcrust', 3], ['moltenpour', 2], ['pepfrisbee', 2], ['peelsweep', 2], ['honeydrizzle', 2], ['ovenblast', 1], ['garlicdip', 1], ['extracheese', 1], ['freshoven', 1]], { weak: ['ice'], res: ['fire'], boss: true, cp: 15 }),
});
ENCOUNTERS.embers = [['cinder_imp', 'cinder_imp'], ['pepperoni_salamander'], ['garlic_knot', 'garlic_knot'], ['anchovy_eel', 'anchovy_eel'], ['fire_eater'], ['magma_slime', 'cinder_imp'], ['stag_wraith', 'fire_eater'], ['basalt_golem'], ['pepperoni_salamander', 'garlic_knot'], ['anchovy_eel', 'magma_slime']];
ENCOUNTERS.pizzaoven = [['pepperoni_salamander', 'pepperoni_salamander'], ['basalt_golem', 'cinder_imp'], ['fire_eater', 'fire_eater'], ['magma_slime', 'garlic_knot', 'magma_slime'], ['stag_wraith', 'stag_wraith'], ['basalt_golem', 'garlic_knot'], ['anchovy_eel', 'fire_eater', 'cinder_imp'], ['stag_wraith', 'basalt_golem']];

BOSSES.margherita = { name: 'The Margherita', intro: 'A colossal pizza rises from the coals, basil eyebrows furrowed. "WHO TURNED ME ON," it booms. "AND WHO FORGOT ME?"', optional: true, loot: { weapons: ['pizza_cutter', 'laminated_menu'], armors: ['pepperoni_plate'] } };

// ---------------------------------------------------------------- gear
Object.assign(WEAPONS, {
  cricket_bat: W('Beach Cricket Bat', 'sword', 36, 0, 2, 2700, 'crit', 4, 'Willow, oiled, signed by a man called Steve. Crits like it is the last over.', { crit: 0.12, spd: 1, def: 3 }),
  ice_pick: W('Ice-Pick Cocktail Stirrer', 'dagger', 26, 0, 2, 2600, 'swift', 4, 'Stirs a mojito, cracks a block of ice, chills a foe. May slow them. Umbrella included.', { spd: 6, crit: 0.2, elem: 'ice', proc: ['slow', 0.25] }),
  super_soaker: W('Super Soaker 9000', 'bow', 30, 0, 2, 2900, 'frost', 4, 'Eight litres of iced slush and a pump action. Soaks through armour. Aim at your mates only once.', { elem: 'ice', pierce: 0.25, spd: 3 }),
  oven_gloves: W('Quilted Oven Gloves', 'fists', 26, 0, 2, 2600, 'guard', 4, 'Two thick mitts shaped like crocodiles. Punches twice, shrugs off the heat.', { hits: 2, def: 6, hp: 25 }),
  laminated_menu: W('Menu of a Thousand Toppings', 'tome', 3, 33, 3, 0, 'echo', 5, 'Pineapple on page nine. A hot take on every page. Spells reply to all.', { mp: 30, spd: 2, sig: 'tempest' }),
  pizza_cutter: W('Rocker Pizza Cutter', 'katana', 40, 0, 3, 0, 'execute', 5, 'A great round blade on a stick. One clean roll and nothing stays whole.', { crit: 0.25, spd: 3, sig: 'flashcut' }),
});
Object.assign(ARMORS, {
  hivis_overalls: { name: 'Fireproof Hi-Vis Overalls', desc: 'Orange, reflective and rated for lava. Nobody sees you coming. Everyone sees you leaving.', def: 34, hp: 50, spd: 0, res: ['fire'], sockets: 2, price: 2900 },
  pepperoni_plate: { name: 'Pepperoni Disc Plate', desc: 'Cured, crisp and armoured. Smells of Friday. Slightly greasy, very strong.', def: 41, hp: 65, spd: -1, res: ['fire'], sockets: 3, price: 0 },
});
Object.assign(ACCS, {
  beach_towel: { name: 'Reserved Sunbed Towel', desc: 'Extra HP and defence. Claims a sunbed in any fight, and nobody dares move it.', def: 6, hp: 40, sockets: 1, price: 1300 },
  flipflop_charm: { name: 'Squelchy Flip-Flop Charm', desc: 'More speed and attack. Squelches. You can hear the party coming.', atk: 4, spd: 7, sockets: 1, price: 1250 },
  ice_bucket: { name: 'Champagne Ice Bucket Crown', desc: 'Magic, MP and fire resistance. Your drink stays chilled and your head stays cool.', mag: 8, mp: 25, res: ['fire'], sockets: 1, price: 1500 },
});

// ---------------------------------------------------------------- shops
Object.assign(SHOPS, {
  kiln_general: { title: '🛒 Kilnhaven Beach Shop', greet: 'Sun cream, inflatables, postcards and miracle pints. The postcards are the miracle.', stock: { items: ['hipotion', 'ether', 'megaether', 'phoenix', 'antidote', 'remedy', 'elixir'], gems: ['fire', 'frost', 'bolt', 'holy', 'shadow', 'chain', 'echo', 'vamp', 'pierce', 'thrifty', 'guard', 'crit', 'swift', 'wide'] } },
  kiln_smith: { title: '⚒️ Kilnhaven Forge & Fire Pit', greet: 'We forge swords, flip burgers and juggle the odd torch. Please do not ask which is which.', stock: { weapons: ['cricket_bat', 'ice_pick', 'super_soaker', 'oven_gloves', 'sage_staff', 'arcane_tome', 'blizzard_tome', 'thorn_whip'], armors: ['hivis_overalls', 'mythril_mail', 'frost_robe'], accs: ['beach_towel', 'flipflop_charm', 'ice_bucket', 'life_charm', 'sage_ring', 'socket_jewel'] } },
});

// ---------------------------------------------------------------- drops
Object.assign(DROPS, {
  cinder_imp: D('items', 'megaether', 0.2, 'accs', 'ice_bucket', 0.05), pepperoni_salamander: D('items', 'hipotion', 0.3, 'accs', 'flipflop_charm', 0.05),
  garlic_knot: D('items', 'remedy', 0.25, 'gems', 'guard', 0.06), anchovy_eel: D('items', 'antidote', 0.3, 'gems', 'swift', 0.06),
  magma_slime: D('items', 'hipotion', 0.3, 'gems', 'wide', 0.07), basalt_golem: D('items', 'phoenix', 0.15, 'accs', 'beach_towel', 0.05),
  fire_eater: D('items', 'megaether', 0.2, 'weapons', 'oven_gloves', 0.04), stag_wraith: D('items', 'phoenix', 0.15, 'gems', 'echo', 0.06),
  margherita: D('items', 'elixir', 1, 'accs', 'beach_towel', 0.5),
});

// ---------------------------------------------------------------- quests (giver names match the NPCs placed in maps.js)
Object.assign(QUESTS, {
  sunburn: { title: 'Mild Sunburn', giver: 'Kilnhaven lifeguard', goal: { type: 'kill', ids: ['cinder_imp'], n: 10 }, reward: { gold: 1800, gems: ['wide'], items: { megaether: 2, elixir: 1 } },
    lines: { offer: ['Fourteen sunburns this morning. FOURTEEN. The imps flick sparks at the tourists, and the tourists do not wear a hat.', 'Ten chilli flake imps, out on the black sand. Pop them and my first aid box can finally close. Ice does it, and fire only makes them cheer.'], active: ['Ten chilli flake imps on the beaches and the lava fields. Ice works wonders. Wear a hat.'], ready: ['Not a single new blister! I was going to give you a lilo, but you deserve more. Gold, tea, and a gem, with my thanks.'], done: ['Not one sunburn this week. Well, one. A chap fell asleep on a hob. Not your fault.'] } },
  kebabs: { title: 'Kebab Bandits', giver: 'Kilnhaven beach bar owner', goal: { type: 'kill', ids: ['pepperoni_salamander'], n: 8 }, reward: { gold: 1900, gems: ['crit'], items: { hipotion: 4, remedy: 3 } },
    lines: { offer: ['My kebab skewers vanish every night! Whole racks, gone! I found grease trails and a lot of nasty little pawprints.', 'Pepperoni salamanders. They slither off with the lamb and leave the salad. Eight of them. Ice, if you have it, and bring an appetite.'], active: ['Eight pepperoni salamanders. They hide on the beaches and in the oven. Ice first, questions later.'], ready: ['The skewers are safe! Eight thieves down. Take your reward, and a free mixed grill. Mind the garlic sauce, it is a character.'], done: ['Full skewers every night. I counted. Twice. A little weep, too.'] } },
  margherita: { title: 'Who Left the Oven On?', giver: 'Kilnhaven volcano warden', goal: { type: 'boss', id: 'margherita' }, reward: { gold: 5000, gems: ['execute', 'echo'], items: { elixir: 4 } },
    lines: { offer: ['That is not a volcano. That is a pizza oven, lads, the biggest in the world, and it has been on since 1987. Nobody can find the switch.', 'Something grew in the coals. A pizza the size of a barn. The Margherita. Go inside, put it out, and keep your ice handy. It hates the cold.'], active: ['The Pizza Oven, up the black mountain. Ice and nothing else, lads. Mind the molten cheese: it slows you.'], ready: ['The fire is out! The mountain is quiet and the tourists are bored. I could weep. Take this, with the thanks of every sunburned soul on the isle.'], done: ['The oven is cool now. The chimney still smells of garlic. I hope that never changes.'] } },
});

// ---------------------------------------------------------------- bestiary field notes (<= 100 chars)
Object.assign(BESTIARY_NOTES, {
  cinder_imp: ['devon', 'Spicy lad, bro! Fire does nothing. Ice sends him packing. His sparklers burn everyone.'],
  pepperoni_salamander: ['adam', 'Fast and greasy. Ice drops it, fire does not. The Cheese Pull slows, the chomp scorches.'],
  garlic_knot: ['brenna', 'A bread roll with attitude. Ice works, dark does not. The breath poisons everyone. Mints.'],
  anchovy_eel: ['brenna', 'Salty, shocking and quick. Ice drops it. Bolts do nothing. The bite poisons, the shock hurts.'],
  magma_slime: ['devon', 'It is a pizza topping that got ideas, bro. Ice sets it. The slop slows, the bubble burns all.'],
  basalt_golem: ['wendell', 'A hot paving stone with opinions! Ice cracks it. Fire and bolts do not. Hits like a wall.'],
  fire_eater: ['adam', 'Trained with torches, no sense. Ice dampens him. His breath and flambe scorch. He warms up.'],
  stag_wraith: ['brenna', 'A stag do that went wrong. Holy or ice. Dark does nothing. Speeches slow us, shots poison.'],
  margherita: ['adam', 'A pizza the size of a barn. Ice only. Cheese slows us, honey poisons, the oven door hits all.'],
});

// ---------------------------------------------------------------- story: first arrival at the village and the Pizza Oven
Object.assign(STORY.area, {
  kilnhaven: [
    { s: 'n', t: 'Cinder Isle. Black basalt, glowing cracks in the ground, charred trees, and a beach where about four hundred stags in matching T-shirts are doing a conga.' },
    { s: 'devon', t: 'Bro. It is a volcano with a SUN LOUNGER on it.' },
    { s: 'adam', t: 'Kilnhaven. A holiday village at the foot of the mountain. The ferryman called it a "lively" crowd.' },
    { s: 'devon', t: 'Is that a man eating fire?' },
    { s: 'n', t: 'It is. He is also, quite visibly, on fire. Nobody is concerned. A stag hands him a pint.' },
    { s: 'brenna', t: 'Four bars on the seafront and not one with a licensing sign. Marvellous.' },
    { s: 'wendell', t: 'A smouldering fortress at the end of the world! The perfect place for my holidays.' },
  ],
  pizzaoven: [
    { s: 'n', t: 'The mountain is hollow. Inside, a vast brick dome arches over roaring wood-fire pits, and the air smells of baking dough and old garlic.' },
    { s: 'devon', t: 'Bro. It is a pizza oven. The WHOLE VOLCANO is a pizza oven.' },
    { s: 'adam', t: 'Wood-fired. Left on since 1987, the warden said. Nobody could find the switch.' },
    { s: 'devon', t: 'Because it is a fire, Adam. There is no switch. You just walk away.' },
    { s: 'brenna', t: 'Somebody has walked away from this for thirty-nine years. That is not an oven. That is neglect.' },
    { s: 'wendell', t: 'A noble hearth! I shall defend its crust until the last topping falls.' },
    { s: 'n', t: 'Far ahead, something warm and enormous blows a cheese bubble. It pops with a satisfying plop.' },
  ],
});
STORY.after.margherita = [
  { s: 'n', t: 'The Margherita sags, hisses, and slides off its peel in a long, glorious ribbon of melted cheese. The fire pits gutter and die. For the first time since 1987, the oven is cool.' },
  { s: 'devon', t: 'We beat a pizza, bro. A huge, angry, delicious pizza. With eyebrows.' },
  { s: 'adam', t: 'Basil. Those were basil eyebrows.' },
  { s: 'brenna', t: 'It is going cold. Can someone get a plate, a cutter and an enormous napkin?' },
  { s: 'wendell', t: 'A valiant foe! Felled by honest steel and, I fear, a small amount of pineapple.' },
  { s: 'n', t: 'Down in Kilnhaven, every fire-eater on the isle looks up at the quiet mountain, and lets out a sigh. Then every stag starts running up the slope with a knife and fork.' },
  { s: 'devon', t: 'Free pizza, bro. FREE PIZZA.' },
  { s: 'adam', t: 'One slice, Dev. We still have a bell to answer.' },
];

// ---------------------------------------------------------------- party chat
STORY.chat.push(
  { id: 'kiln_town', at: 'kilnhaven', lines: [C('devon', 'Bro, there is a man in a bridal veil being carried through the street on a door.'), C('adam', 'It is a stag do.'), C('devon', 'The groom is tied to a lamp post and he looks delighted.'), C('adam', 'Do not ask. Do not join. Do not take photos.'), C('devon', 'I am taking one photo.')] },
  { id: 'kiln_stags', if: 'v:kilnhaven !margherita', lines: [C('devon', 'Every stag has the same T-shirt. "BEST MAN\'S LAST STAND."'), C('adam', 'It is the same joke on every one.'), C('devon', 'Because it is a GOOD joke, Adam.'), C('adam', 'It is a joke about a man losing his freedom and then being sick in a bush.')] },
  { id: 'oven_inside', at: 'pizzaoven', if: '!margherita', lines: [C('devon', 'It smells incredible in here. Like Friday night and a bad idea.'), C('adam', 'Stay together. If anything looks cheesy, do not eat it.'), C('devon', 'I only ate the one thing.'), C('adam', 'It was a pizza stone, Dev. A rock.'), C('devon', 'A hot rock, bro. I had a crust.')] },
  { id: 'oven_brenna', at: 'pizzaoven', if: 'p:brenna !margherita', lines: [C('brenna', 'You do not leave a wood fire burning for thirty-nine years. A chimney sweep would have a seizure.'), C('adam', 'You know a lot about ovens.'), C('brenna', 'I know a lot about things left on by people who could not be bothered. Same thing.')] },
  { id: 'oven_wendell', at: 'pizzaoven', if: 'p:wendell !margherita', lines: [C('wendell', 'In my youth I guarded a furnace for six weeks. One gets accustomed to the smell of burning knights.'), C('devon', 'Burning WHAT, bro?'), C('wendell', 'Logs! Logs, young man. I meant logs.')] },
  { id: 'margherita_after', if: 'margherita', lines: [C('devon', 'First Gary, then the Mash Tun, now a pizza. I am basically a professional food-slayer.'), C('adam', 'You mostly stood at the back.'), C('devon', 'Quality control, bro. The crust needs a supervisor.'), C('adam', 'You are not even a little bit sorry about the free pizza, are you?')] },
);

// ---------------------------------------------------------------- pub quiz
QUIZ.push(
  { q: 'What do you call the long flat shovel used to slide pizzas in and out of a wood-fired oven?', a: ['A peel', 'A paddle', 'A spade', 'A flipper'] },
  { q: 'Which Italian city is the traditional birthplace of pizza?', a: ['Naples', 'Venice', 'Milan', 'Pisa'] },
  { q: 'Which cheese is traditionally melted on a pizza Margherita?', a: ['Mozzarella', 'Cheddar', 'Brie', 'Stilton'] },
  { q: 'What herb sits on top of a proper Margherita pizza?', a: ['Basil', 'Mint', 'Parsley', 'Coriander'] },
  { q: 'What is the name of the holiday village on Cinder Isle?', a: ['Kilnhaven', 'Hopsend', 'Frostholm', 'Mirewood'], if: 'v:kilnhaven' },
  { q: 'What is the secret inside the volcano on Cinder Isle?', a: ['A pizza oven', 'A sleeping dragon', 'A brewery', 'A launderette'], if: 'v:kilnhaven' },
  { q: 'Which giant pizza lives in the Pizza Oven?', a: ['The Margherita', 'The Hawaiian', 'The Pepperoni Pete', 'The Four Seasons'], if: 'v:pizzaoven' },
  { q: 'Which element finally puts out the Margherita?', a: ['Ice', 'Fire', 'Anchovies', 'More fire'], if: 'margherita' },
);
