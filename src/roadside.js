// Roadside moments: short scenes that can happen while walking the overworld, so the long legs between towns have a bit of life in them.
// Rare (see roadside() in world.js), never repeated until every one that fits has been seen, and a few carry a small gift or a diegetic hint
// about an optional place the party has not visited yet. `regions` uses regionOf() names (omit = anywhere); `if` is a scene condition
// (v:<map> visited, p:<name> in the party). Lines: { s, t } with s = 'adam' | 'devon' | 'brenna' | 'wendell' | 'n' (narration) | a cast key below.
import { STORY } from './data.js';

Object.assign(STORY.cast, {
  trav: ['Traveller', 'villager2'], pedd: ['Peddler', 'merchant'], old: ['Old Timer', 'elder'], urch: ['Urchin', 'kid'], ang: ['Angler', 'fisher'], pat: ['Patrol', 'guard'],
});

const A = (t) => ({ s: 'adam', t }), D = (t) => ({ s: 'devon', t }), N = (t) => ({ s: 'n', t });
const T = (t) => ({ s: 'trav', t }), P = (t) => ({ s: 'pedd', t }), O = (t) => ({ s: 'old', t }), U = (t) => ({ s: 'urch', t }), G = (t) => ({ s: 'ang', t });

export const ROADSIDE = [
  // ---- Greenmarch
  { id: 'goose_road', regions: ['green'], lines: [N(`A goose stands in the middle of the road. It doesn't move. It has the energy of a bouncer.`), D(`Bro, it's staring at me.`), A(`Don't make eye contact.`), N(`It honks once and lets you pass. Something glints in the grass: a coin.`)], reward: { gold: 25 } },
  { id: 'signpost', regions: ['green'], lines: [N(`A signpost. One arm says HAVEN, 4 DAYS. The other arm says HAVEN (THE OTHER WAY), 4 DAYS.`), D(`So it's a circle.`), A(`It's a trap for people who trust signposts.`)] },
  { id: 'free_pint', regions: ['green', 'autumn'], lines: [P(`Pint? First one's free. It's mostly foam, but it's honest foam.`), N(`He presses a Pint of Lager into your hand and vanishes into a hedge.`)], reward: { items: { potion: 1 } } },
  { id: 'windmill_hint', regions: ['green'], if: '!v:windmill', lines: [O(`There's a windmill east of Haven, by the river. Ghost in the flour. Awful temper, lovely manners.`), D(`Is that a warning or a review?`), O(`Yes.`)] },
  { id: 'stones_hint', regions: ['green'], if: '!v:wayside_stones', lines: [T(`There's a ring of standing stones east of the windmill. Nobody knows who put them there.`), T(`The keeper makes terrible tea, though. Brave of him.`)] },
  { id: 'chippy_hint', regions: ['green'], if: '!v:wayside_chippy', lines: [O(`South of Haven there's a chippy that has no business being that good, that far from anything.`), A(`Why does that sound like a recommendation and a threat?`), O(`It's both, young man.`)] },
  { id: 'busker', regions: ['green', 'autumn'], lines: [T(`Two bros in a pub with a bell, a bell, a bell...`), D(`Is he singing about us?`), A(`He's singing about you.`), D(`...Honestly? Ratings.`)] },
  { id: 'estate_picnic', regions: ['green'], lines: [N(`A picnic. Four Estate Agent Goblins, a tartan blanket and a cheese board. They see you and hide a clipboard.`), T(`Viewing is by appointment. You saw nothing.`), N(`One of them slides thirty gold across the blanket without making eye contact.`)], reward: { gold: 30 } },
  { id: 'hiker_map', regions: ['green', 'snow'], lines: [T(`Excuse me. Have you seen my map?`), D(`It's in your hand, mate.`), T(`That's the legend. I need the map.`), N(`He wanders off, perfectly content.`)] },
  // ---- Frostfields
  { id: 'snowman', regions: ['snow'], lines: [N(`A snowman stands beside the road wearing a very small bus pass.`), D(`Bro, he's got the N9.`), A(`He's earned it.`)] },
  { id: 'pilgrim_tea', regions: ['snow'], lines: [O(`You look frozen, lads. Tea?`), N(`You're handed a Cup of Tea. It's hot. In this weather that's a minor miracle.`)], reward: { items: { antidote: 1 } } },
  { id: 'icecave_hint', regions: ['snow'], if: '!v:icecave', lines: [G(`Ice cave, just north-east of Frostholm. Fish in there the size of dogs. Dogs in there the size of fish.`), D(`Is that better or worse?`), G(`Depends who's the dog.`)] },
  { id: 'lodge_hint', regions: ['snow'], if: '!v:wayside_lodge', lines: [T(`The ski lodge east of Frostholm does one thing: fondue. Sixty gold and the beds are heated.`), A(`By what?`), T(`Fondue.`)] },
  { id: 'yeti_prints', regions: ['snow'], lines: [N(`Enormous footprints lead off into the pines. One of them has a sock in it.`), D(`Cheese thief.`), A(`Allegedly.`)] },
  // ---- Mire Marsh
  { id: 'snorkeller', regions: ['swamp'], lines: [G(`Bog snorkelling trials! Go on, have a go!`), D(`I'm good, thanks.`), G(`Nobody's good. That's the sport.`)] },
  { id: 'wisp', regions: ['swamp'], lines: [N(`A will-o'-the-wisp drifts across the path.`), D(`Is it leading us somewhere?`), A(`It's leading us away.`), N(`The wisp pulses cheerfully. Both, it seems to say.`)] },
  { id: 'wreck_hint', regions: ['swamp'], if: '!v:wreck', lines: [O(`Wreck of the Salty Sue, south-west of Mirewood. The crew are still aboard. Still arguing about whose round it was.`)] },
  { id: 'toad', regions: ['swamp'], lines: [N(`A toad sits on a log. It looks like it has seen things.`), D(`It knows.`), A(`Leave it.`)] },
  // ---- Sunscar
  { id: 'camel', regions: ['desert'], lines: [N(`A camel looks at Devon. Devon looks at the camel. The camel spits.`), D(`WHY ME.`), A(`Energy.`)] },
  { id: 'mirage_kebab', regions: ['desert'], lines: [N(`A kebab van shimmers on the dunes. It's obviously a mirage.`), D(`It smells real.`), N(`It is real. A hand passes a Late-Night Kebab through the heat haze and the van drives off across the sand.`)], reward: { items: { phoenix: 1 } } },
  { id: 'pyramid_hint', regions: ['desert'], if: '!v:pyramid', lines: [T(`There's a pyramid just north of the oasis. The pharaoh loved paperwork.`), T(`Bring fire, and a pen.`)] },
  { id: 'sandboard', regions: ['desert'], lines: [U(`MIND YOUR HEADS!`), N(`A kid on a tea tray shoots past down a dune, screaming with joy.`), A(`That's the best idea anyone's had in this desert.`)] },
  // ---- Hopsend
  { id: 'scarecrow', regions: ['autumn'], lines: [N(`A scarecrow has been given a hat and a lanyard. It is now Regional Manager of Crows.`), D(`The crows seem to respect it.`), A(`The crows fear it.`)] },
  { id: 'hop_pickers', regions: ['autumn'], lines: [T(`Hop picking! Eight hours a day, sore hands, free beer at the end.`), D(`Where do I sign?`), A(`You're not signing.`)] },
  { id: 'apple_cart', regions: ['autumn'], lines: [N(`An apple cart has lost a wheel. Its owner is arguing with it.`), P(`Seven years I have had this cart. Seven! And today it chooses to be ONE WHEEL SHORT.`), D(`Can we help?`), P(`Take an apple. Take two. Take ANY apples. Just stop looking at the wheel.`), N(`He presses a few coins on you for your trouble and goes back to glaring at it.`)], reward: { gold: 20 } },
  { id: 'cider_ground', regions: ['autumn'], lines: [O(`Don't go near the old orchard after dark. The cider ferments the ground. The ground gets ideas.`), D(`What kind of ideas?`), O(`Hugging ideas. Mostly.`)] },
  // ---- Cinder
  { id: 'lava_sausage', regions: ['ember'], lines: [T(`Two minutes, lads. The lava's quick, but it's not that quick.`), N(`A man is grilling sausages directly on a lava flow. He hands you a pint, for the nerves.`)], reward: { items: { potion: 1 } } },
  { id: 'pizza_rumour', regions: ['ember'], lines: [O(`They say the oven in the mountain's been on since 1987. Somebody should turn it off.`), D(`Has anyone asked?`), O(`It's got a manager.`)] },
  { id: 'lava_surfer', regions: ['ember'], lines: [N(`A man glides past on a front door, surfing a slow lava flow. He gives you a thumbs up. His eyebrows are no longer with us.`), D(`Bro. BRO. That is the best thing I have ever seen.`), A(`It is also the stupidest.`), D(`Best AND stupidest, Adam. That is a rare combo.`)] },
  { id: 'cinder_postie', regions: ['ember'], lines: [T(`Post for the volcano! Again. Nobody has ever signed for it.`), D(`Who is it from?`), T(`Estate agents. They think it is a property with "great views and potential."`)] },
  // ---- Jade Jungle
  { id: 'parrot', regions: ['jungle'], lines: [N(`A parrot lands on Devon's shoulder and says, in a perfect impression of Adam: "Don't."`), A(`That's not what I sound like.`), D(`That's exactly what you sound like.`)] },
  { id: 'archaeologist', regions: ['jungle'], lines: [T(`Dr Fogg, archaeologist. Have you seen a lost temple?`), D(`Have you seen a FOUND temple?`), T(`That's a hotel.`)] },
  { id: 'vine_swing', regions: ['jungle'], lines: [N(`Devon grabs a vine and swings. The vine is a snake. It is a very understanding snake.`), A(`Put it down, Dev.`), D(`He picked ME up, Adam.`), N(`The snake sets him down politely, gives Adam a look, and slithers off in a huff.`)] },
  // ---- Obsidian
  { id: 'black_glass', regions: ['obsidian'], lines: [N(`The ground here is black glass. It reflects your faces. You look tired.`), D(`I look incredible.`), A(`You look like you've been in a pub since 2026.`)] },
  { id: 'echo_orders', regions: ['obsidian'], lines: [N(`Somewhere under the black glass, a bell rings once. A faint voice says: "...last orders."`), D(`Did you hear that?`), A(`I heard that.`), D(`I would like it noted that I did not order anything.`)] },
  { id: 'glass_pint', regions: ['obsidian'], lines: [N(`A pint glass stands upright on a rock. It is full of black glass. A beermat beneath it reads: "RESERVED".`), D(`Who is it reserved for?`), A(`Nobody who is coming back.`), N(`Under the mat, someone has left a very old tip.`)], reward: { gold: 60 } },
  // ---- anywhere
  { id: 'glints', lines: [O(`Anything that glints off the path is worth the detour. Dead ends especially. Nobody builds a dead end for nothing.`), D(`Except the one in my kitchen.`), O(`Especially that one.`)] },
  { id: 'shovel', regions: ['green', 'swamp', 'desert'], lines: [T(`Don't dig just anywhere, lads. I've tried. Seven holes and a very annoyed badger.`), T(`They twinkle when they're ready. You just walk over them.`), D(`That's the worst treasure map I've ever heard.`)] },
  { id: 'magpie_talk', regions: ['green', 'snow', 'autumn'], lines: [T(`There's a spot up the coast where I keep seeing a sparkle. A little dead end by the water.`), T(`I'd go myself but I get seasick on grass.`)] },
  { id: 'rain', rain: 45, lines: [N(`It starts to rain. Not heavy. Just committed.`), D(`Bro, my phone says two percent.`), A(`It said three yesterday.`), D(`I think it's grieving.`)] },
  { id: 'shrine', lines: [N(`A roadside shrine with an offering bowl. In the bowl: one coin and a note that says "back in 5 mins".`)] },
  { id: 'rivals', lines: [T(`Heroes, eh? We're Level 30 and sponsored.`), D(`By who?`), T(`A sandwich company.`), A(`...Fair.`)] },
  { id: 'beards', lines: [T(`Lovely beards. Both of you.`), A(`Thanks.`), D(`I've had mine since 2026.`), T(`...What?`), A(`Ignore him.`)] },
  { id: 'coins', lines: [N(`You find a coin in the road. Then another. Then quite a lot of coins. A goose runs off with the rest.`)], reward: { gold: 40 } },
  { id: 'wendell_halt', if: 'p:wendell', lines: [{ s: 'wendell', t: `HALT! Who goes... ah. Sorry. Habit. Carry on.` }, A(`Nobody was there, Wendell.`), { s: 'wendell', t: `That's how they get you.` }] },
  { id: 'brenna_sandwich', if: 'p:brenna', lines: [{ s: 'brenna', t: `I packed sandwiches. Cheese and pickle. Don't tell Dad.` }, D(`Brenna, I love you.`), { s: 'brenna', t: `Eat the sandwich.` }], reward: { items: { remedy: 1 } } },
];
