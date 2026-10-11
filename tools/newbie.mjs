// "First fight outside" check: a brand-new party (starting gear, level 3) with a mash-Attack policy (no healing, no items, random targets)
// against every overworld encounter. Run: node tools/newbie.mjs [level] [tableName]
import { Battle, newChar, stats } from '../src/logic.js';
import { ENCOUNTERS } from '../src/data.js';
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const LEVEL = +process.argv[2] || 3, TABLE = process.argv[3] || 'world';
const mk = () => [newChar('Aldric', 'knight', 'rogue', 'iron_sword', 'leather', LEVEL), newChar('Lyra', 'mage', 'cleric', 'oak_staff', 'cloth', LEVEL), newChar('Mira', 'cleric', 'bard', 'oak_staff', 'cloth', LEVEL), newChar('Kael', 'rogue', 'ranger', 'bronze_dirk', 'leather', LEVEL)];
const pick = (a, r) => a[Math.floor(r() * a.length)];
function fight(party, grp, rng) {
  const b = new Battle(party, grp, rng, false); let r = 0;
  while (!b.over && r++ < 40) { const cmds = new Map(); for (const p of b.p.filter((x) => x.hp > 0)) cmds.set(p, { kind: 'skill', skillId: 'attack', gems: [], target: pick(b.e.filter((x) => x.hp > 0), rng) }); for (const _ of b.round(cmds)); }
  b.p.forEach((x) => { x.ch.hp = x.hp; x.ch.mp = x.mp; }); return { win: b.over === 'win', rounds: r, hp: b.p.reduce((n, x) => n + x.hp, 0) / b.p.reduce((n, x) => n + x.maxhp, 0) };
}
console.log(`new party, level ${LEVEL}, mash-Attack, table '${TABLE}'`);
for (const grp of ENCOUNTERS[TABLE]) {
  let wins = 0, hp = 0, rounds = 0; const N = 300;
  for (let i = 0; i < N; i++) { const rng = mulberry(i * 31 + grp.length * 7); const party = mk(); const f = fight(party, grp, rng); if (f.win) { wins++; hp += f.hp; } rounds += f.rounds; }
  console.log(grp.join('+').padEnd(26), `win ${(wins / N * 100).toFixed(0).padStart(3)}%  hp left ${(wins ? hp / wins * 100 : 0).toFixed(0).padStart(3)}%  rounds ${(rounds / N).toFixed(1)}`);
}
// three fights in a row with no healing (a typical first expedition)
let wins = 0; const N = 300; for (let i = 0; i < N; i++) { const rng = mulberry(i * 17 + 5), party = mk(); let ok = true; for (let k = 0; k < 3 && ok; k++) ok = fight(party, pick(ENCOUNTERS[TABLE], rng), rng).win; if (ok) wins++; }
console.log(`3 fights in a row, no healing: survive ${(wins / N * 100).toFixed(0)}%`);
