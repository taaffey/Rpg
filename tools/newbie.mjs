// "First fight outside" check: a brand-new party with a mash-Attack policy (no healing, no items, random targets)
// against every overworld encounter. The game starts unarmed with 400 G, so this assumes the party bought the cheapest
// sensible weapons at the Haven Smithy (Iron Sword, Oak Staff x2, Bronze Dirk = 205 G). Also runs a level-1 unarmed party.
// Run: node tools/newbie.mjs [level] [tableName]   (no level = check levels 1-3 and fail if any fight is too deadly)
import { Battle, newChar, stats } from '../src/logic.js';
import { ENCOUNTERS } from '../src/data.js';
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
import { WEAPONS } from '../src/data.js';
const TABLE = process.argv[3] || 'world', LEVELS = process.argv[2] ? [+process.argv[2]] : [1, 2, 3];
const KIT = ['iron_sword', 'oak_staff', 'oak_staff', 'bronze_dirk'];
let LEVEL = 1, ARMED = true;
const mk = () => [['Aldric', 'knight', 'rogue', 'leather'], ['Lyra', 'mage', 'cleric', 'cloth'], ['Mira', 'cleric', 'bard', 'cloth'], ['Kael', 'rogue', 'ranger', 'leather']]
  .map(([n, m, , a], i) => newChar(n, m, null, ARMED ? KIT[i] : null, a, LEVEL));
const pick = (a, r) => a[Math.floor(r() * a.length)];
function fight(party, grp, rng) {
  const b = new Battle(party, grp, rng, false); let r = 0;
  while (!b.over && r++ < 40) { const cmds = new Map(); for (const p of b.p.filter((x) => x.hp > 0)) cmds.set(p, { kind: 'skill', skillId: 'attack', gems: [], target: pick(b.e.filter((x) => x.hp > 0), rng) }); for (const _ of b.round(cmds)); }
  b.p.forEach((x) => { x.ch.hp = x.hp; x.ch.mp = x.mp; }); return { win: b.over === 'win', rounds: r, hp: b.p.reduce((n, x) => n + x.hp, 0) / b.p.reduce((n, x) => n + x.maxhp, 0) };
}
let fail = 0;
for (const [lv, armed] of [...LEVELS.map((l) => [l, true]), [1, false]]) {
LEVEL = lv; ARMED = armed;
console.log(`\nnew party, level ${LEVEL}, ${ARMED ? 'cheapest weapons (' + KIT.reduce((n, w) => n + WEAPONS[w].price, 0) + ' G)' : 'UNARMED'}, mash-Attack, table '${TABLE}'`);
const ramp = TABLE === 'world' ? (LEVEL === 1 ? 4 : 99) : 99; // at level 1 you only meet the first ramp tier near Haven
for (const grp of ENCOUNTERS[TABLE].slice(0, ramp)) {
  let wins = 0, hp = 0, rounds = 0; const N = 300;
  for (let i = 0; i < N; i++) { const rng = mulberry(i * 31 + grp.length * 7); const party = mk(); const f = fight(party, grp, rng); if (f.win) { wins++; hp += f.hp; } rounds += f.rounds; }
  console.log(grp.join('+').padEnd(26), `win ${(wins / N * 100).toFixed(0).padStart(3)}%  hp left ${(wins ? hp / wins * 100 : 0).toFixed(0).padStart(3)}%  rounds ${(rounds / N).toFixed(1)}`);
  if (ARMED && TABLE === 'world' && wins / N < 0.95) { fail++; console.log('   ^ too deadly for a fresh armed party'); }
}
// three fights in a row with no healing (a typical first expedition)
let wins = 0; const N = 300; for (let i = 0; i < N; i++) { const rng = mulberry(i * 17 + 5), party = mk(); let ok = true; for (let k = 0; k < 3 && ok; k++) ok = fight(party, pick(ENCOUNTERS[TABLE].slice(0, ramp), rng), rng).win; if (ok) wins++; }
console.log(`3 fights in a row, no healing: survive ${(wins / N * 100).toFixed(0)}%`);
if (ARMED && TABLE === 'world' && wins / N < 0.8) { fail++; console.log('   ^ first expedition too deadly'); }
}
if (fail) { console.log(`\nFAIL: ${fail} check(s)`); process.exit(1); } else console.log('\nOK: a freshly armed party can survive its first trips outside Haven');
