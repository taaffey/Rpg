// Headless playthrough sim: a fresh, unarmed level-1 party buys the cheapest weapons in Haven, then follows the
// intended route fighting normal random encounters, shopping with the gold it actually earned, looting the
// dungeon chests and fighting each boss. Prints the level reached at every stage, EXP/gold per fight, and
// boss win rates at the arrival level. Exits non-zero if the curve drifts out of the intended bands.
// usage: node tools/progress.mjs [runs=24] [verbose]
import { Battle, newChar, stats, slotSkill, slotGems, skillWithGems, SIG, learnable, rewards, awardExp, awardCP, rankOf, expNeeded, MAX_LEVEL, setCalling } from '../src/logic.js';
const CP_AT_LEVEL = [0, 0, 3, 8, 14, 22, 32, 40, 50, 60, 75, 95, 115, 130, 150, 170, 190, 210, 230, 250, 270];
import { ENCOUNTERS, WEAPONS, ARMORS, ACCS, ITEMS, DIFFICULTY } from '../src/data.js';
import { PARTY_SCALE } from '../src/bros.js';
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const RUNS = +process.argv[2] || 24, VERBOSE = process.argv.includes('verbose');
const DIFF = process.argv.find((a) => DIFFICULTY[a]) || 'normal';
const pick = (a, r) => a[Math.floor(r() * a.length)];
const DB = { weapons: WEAPONS, armors: ARMORS, accs: ACCS };

// The route. fights = random encounters a normal player meets there (exploring, quests, a little detouring).
// shop: [heroIndex, kind, id] wish list bought in order when affordable; loot: chest gear handed to heroes.
// want: [lo, hi] acceptable average party level on arriving at the boss / leaving the stage.
const ROUTE = [
  { name: 'Goose Cellar (2 blokes)', table: 'cellar', fights: 5, boss: 'big_gary', bossWant: [2, 3], want: [2, 4] }, // then Brenna joins and the bros take callings
  { name: 'Haven grassland', table: 'world', ramp: true, fights: 16, shop: [[0, 'weapons', 'iron_sword'], [1, 'weapons', 'oak_staff'], [2, 'weapons', 'oak_staff'], ], want: [4, 6] },
  { name: 'Haven again', table: 'world', fights: 6, shop: [[0, 'armors', 'chain'], [3, 'weapons', 'flame_brand'], [0, 'weapons', 'flame_brand'], [1, 'weapons', 'storm_rod']], want: [5, 7] },
  { name: 'Mire Marsh', table: 'swamp', fights: 12, shop: [[2, 'weapons', 'healing_staff'], [1, 'armors', 'mage_cloak'], [2, 'armors', 'leather']], want: [7, 9] },
  { name: 'Ashen Cavern', table: 'dungeon', fights: 10, loot: [[1, 'weapons', 'archmage_staff']], join: true, boss: 'wyrm', bossWant: [8, 10], want: [9, 11] },
  { name: 'Plains+Frostfields', table: 'snow', fights: 10, pre: [[0, 'weapons', 'dragonbane'], [0, 'armors', 'dragon_mail']], shop: [[2, 'weapons', 'sage_staff'], [3, 'weapons', 'mythril_sword'], [3, 'armors', 'yeti_fur'], [2, 'armors', 'frost_robe']], want: [11, 13] },
  { name: 'Sunken Crypt', table: 'crypt', fights: 10, loot: [[1, 'armors', 'frost_robe']], boss: 'lich', bossWant: [12, 14], want: [13, 15] },
  { name: 'Frost Spire', table: 'spire', fights: 14, pre: [[1, 'weapons', 'lich_staff'], [1, 'armors', 'lich_robes']], shop: [[0, 'armors', 'mythril_mail'], [2, 'accs', 'life_charm']], loot: [], boss: 'titan', bossWant: [16, 18], want: [17, 19] },
  { name: 'Storm Cavern (opt.)', table: 'storm', fights: 6, boss: 'storm_drake', bossWant: [11, 20], want: [17, 20] },
  { name: 'Sunscar Ruins (opt.)', table: 'ruins', fights: 6, boss: 'sphinx', bossWant: [11, 20], want: [17, 20] },
];
// the party never changes calling: skills come only from that calling's ranks (Calling Points), like an FF5 party that stays put
// Adam and Devon start as blokes; after the cellar they take knight and mage, Brenna (cleric) joins; Sir Wendell (knight, own sword) at the Ashen Cavern
const JOBSET = [['Adam', 'knight', 'leather'], ['Devon', 'mage', 'cloth'], ['Brenna', 'cleric', 'cloth'], ['Wendell', 'knight', 'leather']];
// a sensible player keeps their newest four abilities slotted
function reslot(c) { const ok = learnable(c); c.slots = [0, 1, 2, 3].map((i) => ok.slice(-4).reverse()[i] || null); }
function bot(b, rng) {
  const cmds = new Map();
  for (const p of b.p.filter((x) => x.hp > 0)) {
    const ko = b.p.find((x) => x.hp <= 0), hurt = b.p.filter((x) => x.hp > 0 && x.hp < x.maxhp * 0.5).sort((a, c) => a.hp / a.maxhp - c.hp / c.maxhp)[0];
    let best = null, bs = -1;
    for (const i of [0, 1, 2, 3, SIG]) {
      const sid = slotSkill(p.ch, i); if (!sid) continue; const gems = slotGems(p.ch, i), s = skillWithGems(sid, gems); if (p.mp < s.mp) continue;
      if (ko && s.fx.includes('revive')) { best = { kind: 'skill', skillId: sid, gems, target: ko }; bs = 1000; break; }
      if (s.kind === 'heal' && s.pow && hurt && s.tgt !== 'self') { best = { kind: 'skill', skillId: sid, gems, target: hurt }; bs = 999; continue; }
      if (s.kind !== 'phys' && s.kind !== 'mag') continue;
      const stat = s.kind === 'phys' ? p.atk : p.mag, sc = stat * s.pow * s.hits * (s.tgt === 'all' ? Math.min(2.2, b.e.filter((x) => x.hp > 0).length) : 1) * (1 + rng() * 0.2);
      if (sc > bs) { bs = sc; best = { kind: 'skill', skillId: sid, gems, target: b.e.filter((x) => x.hp > 0).sort((x, y) => x.hp - y.hp)[0] }; }
    }
    const atk = p.atk * (p.wpn?.hits > 1 ? 1.2 : 1);
    if (!best || (bs < atk && bs < 999)) best = { kind: 'skill', skillId: 'attack', gems: [], target: b.e.filter((x) => x.hp > 0).sort((x, y) => x.hp - y.hp)[0] };
    cmds.set(p, best);
  }
  return cmds;
}
function fight(party, grp, rng, boss = null) {
  const mod = { ...DIFFICULTY[DIFF].mod }, ps = !boss && PARTY_SCALE[party.length]; if (ps) { mod.hp *= ps.hp; mod.atk *= ps.atk; mod.mag *= ps.atk; }
  const b = new Battle(party, grp, rng, !!boss, mod); let r = 0;
  while (!b.over && r++ < 80) for (const _ of b.round(bot(b, rng)));
  b.p.forEach((x) => { x.ch.hp = x.hp; x.ch.mp = x.mp; });
  return b;
}
const heal = (party) => party.forEach((c) => { const s = stats(c); c.hp = s.hp; c.mp = s.mp; });
const avgLv = (party) => party.reduce((n, c) => n + c.level + c.exp / expNeeded(Math.min(c.level, MAX_LEVEL - 1)), 0) / party.length;
const clone = (party) => party.map((c) => JSON.parse(JSON.stringify(c)));
function equip(party, list, inv, buy, G, log) {
  for (const [i, kind, id] of list || []) {
    const field = { weapons: 'weapon', armors: 'armor', accs: 'acc' }[kind], d = DB[kind][id];
    if (!party[i]) continue;
    if (buy) { if (G.gold < d.price) { log.push(`  (could not afford ${d.name} ${d.price}G)`); continue; } G.gold -= d.price; log.push(`  bought ${d.name} for ${party[i].name} (${d.price}G)`); }
    if (!party[i]) continue; party[i][field] = id;
  }
}
function bossTrial(party, boss, n, seed) {
  let w = 0; for (let k = 0; k < n; k++) { const ps = clone(party); heal(ps); const b = fight(ps, [boss], mulberry(seed + k * 101), boss); if (b.over === 'win') w++; } return w / n;
}

const agg = ROUTE.map(() => ({ rank: 0, cp: 0, lv: 0, end: 0, wins: 0, fights: 0, exp: 0, gold: 0, bossLv: 0, bossWin: 0, drops: 0, rares: 0, goldEnd: 0 }));
let firstRunLog = [];
for (let run = 0; run < RUNS; run++) {
  const rng = mulberry(run * 7919 + 13), log = [];
  const party = JOBSET.slice(0, 2).map(([n, , a]) => newChar(n, 'bloke', null, null, 'cloth', 1)); party.forEach(reslot); heal(party);
  const join = (i) => { const lv = Math.max(1, Math.round(avgLv(party))), [n, m, a] = JOBSET[i]; const c = newChar(n, m, null, i === 3 ? 'iron_sword' : null, a, lv); c.cp[m] = CP_AT_LEVEL[lv]; reslot(c); party.push(c); };
  const G = { gold: 400, potions: 0 };
  ROUTE.forEach((st, si) => {
    const A = agg[si]; log.push(`== ${st.name} (arrive avg Lv ${avgLv(party).toFixed(1)}, ${G.gold}G)`);
    A.lv += avgLv(party);
    if (st.join) { join(3); heal(party); }
    equip(party, st.pre, null, false, G, log); equip(party, st.shop, null, true, G, log);
    if (si === 1) { const n = Math.floor(Math.min(G.gold, 120) / ITEMS.potion.price); G.gold -= n * ITEMS.potion.price; log.push(`  bought ${n} potions`); }
    heal(party);
    for (let f = 0; f < st.fights; f++) {
      let tb = ENCOUNTERS[st.table];
      if (st.ramp) tb = tb.slice(0, Math.min(tb.length, 2 + Math.floor(f / 2))); // the encounter ramp around Haven
      const b = fight(party, pick(tb, rng), rng);
      A.fights++;
      if (b.over === 'win') { A.wins++; const r = rewards(b); A.exp += r.exp; A.gold += r.gold; G.gold += r.gold; A.drops += r.drops.length; A.rares += r.drops.filter((d) => d.rare).length; awardExp(party, r.exp); A.cp += r.cp; awardCP(party, r.cp); party.forEach(reslot); }
      if (f % 3 === 2 || party.some((c) => c.hp <= 0)) heal(party); // walk back to an inn / use items between fights
    }
    equip(party, st.loot, null, false, G, log);
    if (st.boss) {
      heal(party); A.bossLv += avgLv(party);
      A.bossWin += bossTrial(party, st.boss, 40, run * 31 + si);
      const b = fight(party, [st.boss], rng, st.boss); // the real attempt (its EXP counts only on a win)
      const r = b.over === 'win' ? rewards(b) : { exp: 0, gold: 0 }; heal(party); awardExp(party, r.exp); awardCP(party, r.cp || 0); G.gold += r.gold; party.forEach(reslot);
      log.push(`  boss ${st.boss}: ${b.over}`);
    }
    if (si === 0) { party.forEach((c, i) => { setCalling(c, JOBSET[i][1]); delete c.cp.bloke; c.armor = JOBSET[i][2]; reslot(c); }); join(2); heal(party); }
    A.end += avgLv(party); A.goldEnd += G.gold; A.rank += party.reduce((n, c) => n + rankOf(c, c.main), 0) / party.length;
  });
  if (run === 0) firstRunLog = log;
}
if (VERBOSE) console.log(firstRunLog.join('\n'));
console.log(`progression sim: ${RUNS} playthroughs, difficulty ${DIFF}, unarmed level-1 start with 400G`);
console.log('stage'.padEnd(22), 'arrive  leave  want  rank cp/fight  fights win%  exp/fight gold/fight drops/fight rare%  gold-left  boss@Lv  boss win%');
let bad = 0;
ROUTE.forEach((st, i) => {
  const A = agg[i], arrive = A.lv / RUNS, leave = A.end / RUNS, bossLv = A.bossLv / RUNS, bw = A.bossWin / RUNS;
  const okLeave = DIFF !== 'normal' || (leave >= st.want[0] - 0.5 && leave <= st.want[1] + 0.5), okBoss = DIFF !== 'normal' || !st.boss || (bossLv >= st.bossWant[0] - 0.5 && bossLv <= st.bossWant[1] + 0.5 && bw >= 0.5);
  if (!okLeave || !okBoss) bad++;
  console.log(st.name.padEnd(22), arrive.toFixed(1).padStart(6), leave.toFixed(1).padStart(6), `${st.want[0]}-${st.want[1]}`.padStart(6), (A.rank / RUNS).toFixed(1).padStart(5), (A.cp / Math.max(1, A.wins)).toFixed(1).padStart(9),
    String(A.fights / RUNS).padStart(7), (A.wins / A.fights * 100).toFixed(0).padStart(5), (A.exp / Math.max(1, A.wins)).toFixed(0).padStart(10), (A.gold / Math.max(1, A.wins)).toFixed(0).padStart(10),
    (A.drops / Math.max(1, A.wins)).toFixed(2).padStart(11), (A.rares / Math.max(1, A.drops) * 100).toFixed(0).padStart(6), (A.goldEnd / RUNS).toFixed(0).padStart(10),
    st.boss ? `${st.boss} ${bossLv.toFixed(1)}`.padStart(16) : ''.padStart(16), st.boss ? (bw * 100).toFixed(0).padStart(7) : '', okLeave && okBoss ? '' : '  <-- out of band');
});
console.log('\nEXP curve (to next level):', Array.from({ length: MAX_LEVEL - 1 }, (_, i) => `${i + 1}:${expNeeded(i + 1)}`).join(' '));
if (bad) { console.log(`\n${bad} stage(s) out of band`); process.exit(1); }
console.log('\nall stages within band');
