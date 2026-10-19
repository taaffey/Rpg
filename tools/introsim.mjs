// Intro balance: two jobless blokes (bare fists) in the Goose cellar, then Big Gary. usage: node tools/introsim.mjs
import { Battle, newChar } from '../src/logic.js';
import { ENCOUNTERS } from '../src/data.js';
import { PARTY_SCALE } from '../src/bros.js';
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const bros = (lv) => ['Adam', 'Devon'].map((n) => { const c = newChar(n, 'bloke', null, null, 'cloth', lv); c.cp.bloke = lv >= 3 ? 6 : 0; c.slots = ['headbutt', lv >= 3 ? 'banter' : null, null, null]; return c; });
function fight(party, ids, boss, rng) {
  const mod = boss ? {} : { hp: PARTY_SCALE[party.length].hp, atk: PARTY_SCALE[party.length].atk, mag: PARTY_SCALE[party.length].atk };
  const b = new Battle(party, ids, rng, boss, mod); let rounds = 0;
  while (!b.over && rounds < 60) { rounds++; const cmds = new Map(); for (const p of b.p.filter((x) => x.hp > 0)) { const t = b.e.filter((x) => x.hp > 0)[0]; const hurt = p.hp < p.maxhp * 0.3 && b.items?.potion; cmds.set(p, p.mp >= 2 && rng() < 0.5 ? { kind: 'skill', skillId: 'headbutt', gems: [], target: t } : { kind: 'skill', skillId: 'attack', gems: [], target: t }); } for (const _ of b.round(cmds)); }
  return { won: b.e.every((e) => e.hp <= 0), rounds, hp: b.p.map((p) => p.hp / p.maxhp) };
}
const rng = mulberry(7);
for (const lv of [1, 2, 3]) {
  let w = 0, r = 0, hp = 0; const N = 300;
  for (let i = 0; i < N; i++) { const g = ENCOUNTERS.cellar[Math.floor(rng() * 4)]; const o = fight(bros(lv), g, false, rng); w += o.won; r += o.rounds; hp += o.hp.reduce((a, b) => a + b) / 2; }
  let gw = 0, gr = 0, gh = 0; for (let i = 0; i < N; i++) { const o = fight(bros(lv), ['big_gary'], true, rng); gw += o.won; gr += o.rounds; gh += o.hp.reduce((a, b) => a + Math.max(0, b), 0) / 2; }
  console.log(`L${lv}: cellar fights win ${(100 * w / N).toFixed(0)}% in ${(r / N).toFixed(1)} rounds, ${(100 * hp / N).toFixed(0)}% HP left | Big Gary (full HP) win ${(100 * gw / N).toFixed(0)}% in ${(gr / N).toFixed(1)} rounds, ${(100 * gh / N).toFixed(0)}% HP left`);
}
