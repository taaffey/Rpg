// ===== One for the Road: the last chapter. After the ending, the bricked-up arch in the Goose's cellar opens onto the same cellar
// a thousand years on: the Bell & Anvil, 2026, after hours. The Rime Heart Devon pocketed has woken, and what is left of Sereth
// ("gems hold intent") has set himself up as the quizmaster. Tuned for about level 20-22, between Hopsend and Cinder Isle. =====
import { SKILLS, ENEMIES, ENCOUNTERS, DROPS, BOSSES, ACCS, STORY, BESTIARY_NOTES } from './data.js';
import { MAPS } from './maps.js';
import './bros.js'; // the Goose's cellar (MAPS.cellar) is defined there, and this chapter opens off it
import { OBJECTIVES } from './gamedata.js';

const S = (name, mp, tgt, kind, pow, x = {}) => ({ name, mp, tgt, kind, pow, ...x });
const E = (name, icon, hp, atk, def, mag, spd, exp, gold, skills, x = {}) => ({ name, icon, hp, atk, def, mag, spd, exp, gold, skills, weak: [], res: [], ...x });
const D = (ck, cid, cp, rk, rid, rp) => ({ common: [ck, cid, cp], rare: [rk, rid, rp] });
const C = (s, t) => ({ s, t });

// ---------------------------------------------------------------- enemy skills
Object.assign(SKILLS, {
  qnpeck: S('Chip Raid', 0, 'one', 'phys', 1.5),
  qnscreech: S('Car Park Screech', 0, 'all', 'mag', 0.7, { elem: 'bolt', stun: 0.12 }),
  qnjackpot: S('Jackpot', 0, 'all', 'mag', 0.85, { elem: 'bolt' }),
  qnnudge: S('Nudge, Nudge, Hold', 0, 'one', 'mag', 1.5, { elem: 'bolt', fx: ['slow'] }),
  qnshots: S('Round of Shots', 0, 'all', 'mag', 0.75, { elem: 'fire', fx: ['poison'] }),
  qnsash: S('Sash Whip', 0, 'one', 'phys', 1.4, { fx: ['slow'] }),
  qneject: S('Out You Go', 0, 'one', 'phys', 1.9),
  qnlurch: S('Kebab Lurch', 0, 'one', 'phys', 1.4, { fx: ['poison'] }),
  qnwrong: S('Wrong Answer', 0, 'one', 'mag', 1.6, { elem: 'dark', fx: ['slow'] }),
  qndeduct: S('Points Deducted', 0, 'all', 'mag', 0.9, { elem: 'dark' }),
  qnmusic: S('The Music Round', 0, 'all', 'mag', 0.8, { elem: 'bolt', stun: 0.18 }),
  qnchisel: S('Microphone Chisel', 0, 'one', 'phys', 1.8, { fx: ['drain'] }),
  qntiebreak: S('Tie-Breaker', 0, 'all', 'mag', 1.25, { elem: 'ice' }),
});

// ---------------------------------------------------------------- enemies (recolours of older foes: see ENEMY_VARIANTS in battleart.js)
Object.assign(ENEMIES, {
  qn_rat: E('Kitchen Rat', '🐀', 520, 68, 12, 6, 17, 230, 96, [['bite', 2], ['venombite', 1]], { weak: ['fire', 'ice'] }),
  qn_gull: E('Car Park Seagull', '🐦', 560, 64, 14, 46, 19, 250, 104, [['qnpeck', 2], ['qnscreech', 1]], { weak: ['bolt', 'ice'] }),
  qn_fruitie: E('Fruit Machine', '🎰', 760, 20, 26, 74, 8, 290, 180, [['qnjackpot', 2], ['qnnudge', 2]], { weak: ['ice'], res: ['bolt'] }),
  qn_hen: E('Hen Do Harpy', '👰', 600, 60, 14, 62, 16, 270, 112, [['qnsash', 2], ['qnshots', 2]], { weak: ['ice', 'holy'], res: ['fire'] }),
  qn_doorman: E('Agency Doorman', '🕴️', 980, 78, 26, 6, 5, 310, 124, [['qneject', 2], ['slam', 2]], { weak: ['bolt'], res: ['dark', 'ice'] }),
  qn_straggler: E('Closing-Time Straggler', '🧟', 640, 70, 14, 20, 7, 250, 100, [['qnlurch', 2], ['tackle', 1]], { weak: ['holy', 'fire'], res: ['dark'] }),
  quizmaster: E('Sereth, Quizmaster', '🎤', 5600, 62, 26, 80, 12, 4200, 2600, [['qnwrong', 3], ['qndeduct', 2], ['qnmusic', 2], ['qnchisel', 2], ['qntiebreak', 1]], { weak: ['holy', 'fire'], res: ['dark', 'ice'], boss: true, cp: 14 }),
});
ENCOUNTERS.bellanvil = [['qn_rat', 'qn_rat'], ['qn_gull', 'qn_rat'], ['qn_fruitie'], ['qn_hen', 'qn_hen'], ['qn_straggler', 'qn_gull'], ['qn_doorman'], ['qn_fruitie', 'qn_straggler'], ['qn_doorman', 'qn_hen']];
BOSSES.quizmaster = { name: 'Sereth, Quizmaster', intro: 'The quiz machine lights up. Out steps a grey man in sequins and a paper crown, microphone held like a chisel. "ROUND ONE."', optional: true, loot: { accs: ['answer_sheet'], items: { elixir: 2, megaether: 2 } } };
Object.assign(ACCS, {
  answer_sheet: { name: 'The Answer Sheet', desc: 'More of everything, and quicker with it. Mostly crossings-out. One answer, in Devon\'s writing, is right.', atk: 8, mag: 8, def: 4, spd: 6, mp: 20, sockets: 2, price: 0 },
});
Object.assign(DROPS, {
  qn_rat: D('items', 'hipotion', 0.2, 'items', 'remedy', 0.06), qn_gull: D('items', 'hipotion', 0.2, 'items', 'megaether', 0.05), qn_fruitie: D('items', 'megaether', 0.2, 'items', 'elixir', 0.06),
  qn_hen: D('items', 'remedy', 0.2, 'items', 'megaether', 0.05), qn_doorman: D('items', 'phoenix', 0.2, 'items', 'elixir', 0.06), qn_straggler: D('items', 'phoenix', 0.2, 'items', 'hipotion', 0.08),
  quizmaster: D('items', 'elixir', 1, 'items', 'megaether', 0.5),
});
Object.assign(BESTIARY_NOTES, {
  qn_rat: ['adam', 'Same rats, a thousand years on. Fire or ice. The bite can poison.'],
  qn_gull: ['devon', 'It took my chips in 2024, bro. Bolts or ice. The screech can stun.'],
  qn_fruitie: ['devon', 'It pays out in LIGHTNING. Ice jams it. Bolts do nothing. Never gamble.'],
  qn_hen: ['brenna', 'Sash, tiara, flaming shots. Ice or holy. Fire does nothing. The shots poison.'],
  qn_doorman: ['adam', 'Not on the list, apparently. Bolts move him. Dark and ice do not. Hits very hard.'],
  qn_straggler: ['brenna', 'Closing time was an hour ago. Holy or fire. Dark does nothing. The lurch poisons.'],
  quizmaster: ['adam', 'Holy and fire hurt. Dark and ice do not. Break the tie-breaker or Guard through it.'],
});

// ---------------------------------------------------------------- the map: the Bell & Anvil's cellar, 2026
const BELL_ANVIL = [
  '####################',
  '#E....#.....#......#',
  '#.....#..C..#......#',
  '#.....#.....#..C...#',
  '##.####.....###.####',
  '#..........#.......#',
  '#..C.......#.......#',
  '#......###.........#',
  '####.###.#####.#####',
  '#........#.........#',
  '#........#....X....#',
  '#...C....#.........#',
  '#........#####.#####',
  '####.#####.........#',
  '#..............C...#',
  '####################',
];
MAPS.bellanvil = {
  name: 'The Bell & Anvil, 2026', kind: 'dungeon', theme: 'cellar', music: 'dungeon', rows: BELL_ANVIL, spawn: { x: 2, y: 1 }, enc: 'bellanvil', rate: 0.09, fog: 4, minLv: 19,
  portals: { '1,1': { to: 'cellar', x: 15, y: 8 } },
  chests: { '9,2': { items: { megaether: 1, hipotion: 2 } }, '15,3': { gold: 900 }, '3,6': { items: { elixir: 1 } }, '4,11': { items: { phoenix: 2 } }, '15,14': { gold: 1200, items: { megaether: 1 } } },
  boss: { x: 14, y: 10, id: 'quizmaster' },
};
// the way in: an arch at the back of the Goose's cellar, bricked up until the story has ended
{
  const c = MAPS.cellar, y = 8, row = c.rows[y];
  c.rows[y] = row.slice(0, 16) + 'E' + row.slice(17);
  c.portals['16,8'] = { to: 'bellanvil', x: 2, y: 1, need: 's:ended', deny: [
    { s: 'n', t: 'A bricked-up archway at the back of the cellar. Somebody has chalked a small bell on it.' },
    { s: 'devon', t: 'Secret door, bro. Hundred percent. We come back later with the right key.' },
    { s: 'adam', t: 'It\'s a wall, Dev.' },
  ] };
}

// ---------------------------------------------------------------- story
STORY.area.bellanvil = [
  { s: 'n', t: 'The chalk bell is gone, and so are the bricks. Beyond the arch: breeze blocks, strip lights, and a fruit machine playing itself in the dark.' },
  { s: 'devon', t: 'Bro. BRO. That\'s a plug socket. That is a real, actual plug socket.' },
  { s: 'adam', t: 'It\'s the cellar of the Bell & Anvil. Our Bell & Anvil. Same vaults as the Goose. A thousand years of other people\'s barrels.' },
  { s: 'brenna', t: 'So this is what becomes of my pub. And somebody put a BELL in the name. I\'m going to haunt them.' },
  { s: 'wendell', t: 'The torches here burn without fire! And they hum! I distrust them, and I salute them.' },
  { s: 'n', t: 'Upstairs, a microphone squeals. A voice that has waited three hundred years clears its throat.' },
  { s: 'adam', t: 'Dev. The gem in your hoodie. Is it warm?' },
  { s: 'devon', t: '...It\'s been warm since Tuesday. I thought that was just me.' },
  { s: 'adam', t: 'Gems hold intent. The Elder said it. Sereth said it. And you put one in your pocket and took it to a quiz.' },
];
STORY.after.quizmaster = [
  { s: 'n', t: 'The microphone hits the floor and rolls. The sequins go grey, one by one.' },
  { s: 'sereth', t: 'One question left. The tie-breaker. Answer it, and the heart is yours to end. Capital... of Australia.' },
  { s: 'devon', t: '...' },
  { s: 'adam', t: 'Dev. You know this one.' },
  { s: 'devon', t: 'Canberra.' },
  { s: 'sereth', t: '...Correct. Three hundred years, and I am beaten on general knowledge. My master would have laughed. He always did.' },
  { s: 'n', t: 'The grey man folds up like a deckchair and is gone. In Devon\'s pocket the Rime Heart goes dark. For the first time since Haven, it is only a stone.' },
  { s: 'brenna', t: 'Give it here. It\'s going under the Goose\'s floor, where nobody rings anything, ever.' },
  { s: 'wendell', t: 'A noble end! Felled by geography. I shall learn some at once.' },
  { s: 'n', t: 'Upstairs, the real quiz has reached question seven. Nobody has noticed a thing.' },
  { s: 'devon', t: 'Ad. My phone. It says five percent.' },
  { s: 'adam', t: '...Same again?' },
  { s: 'devon', t: 'Same again.' },
];
STORY.chat.push(
  { id: 'arch_wall', at: 'cellar', if: 'big_gary !s:ended', lines: [C('devon', 'That bricked-up arch at the back. It\'s got a bell chalked on it, bro.'), C('adam', 'Kids, probably.'), C('devon', 'In a locked cellar full of slime?'), C('adam', '...Brave kids.')] },
  { id: 'our_cellar', at: 'bellanvil', if: '!quizmaster', lines: [C('devon', 'That\'s the barrel I hid behind on Gaz\'s birthday.'), C('adam', 'This is our local, a monster-infested dungeon, and somehow also Brenna\'s cellar.'), C('brenna', 'It was tidier when it was mine.')] },
  { id: 'five_percent', if: 'quizmaster', lines: [C('devon', 'Five percent, Ad. FIVE. I could ring someone.'), C('adam', 'Who?'), C('devon', '...You\'re right here. So nobody. But I COULD.')] },
);
OBJECTIVES.push({ title: 'One for the Road', show: 's:ended', optional: true, hint: 'The bell rang again. The bricked-up arch at the back of the Goose\'s cellar, where Big Gary sat, has opened onto somewhere very familiar (Lv 20+).', done: 'quizmaster', doneHint: 'Canberra. The Rime Heart is only a stone, and the phone says five percent.' });
