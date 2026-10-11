// Every id referenced by shops, chests, drops, bosses, quests, encounters, jobs, weapons and the new-game inventory must exist.
// usage: node tools/checkids.mjs
import { readFileSync } from 'node:fs';
import { WEAPONS, ARMORS, ACCS, GEMS, ITEMS, SKILLS, JOBS, WEAPON_TYPES, ENEMIES, ENCOUNTERS, DROPS, BOSSES, SHOPS, QUESTS, ELEMENTS } from '../src/data.js';
import { MAPS } from '../src/maps.js';
const DB = { weapons: WEAPONS, armors: ARMORS, accs: ACCS, gems: GEMS, items: ITEMS };
const errs = [];
const has = (k, id, where) => { if (!DB[k]) errs.push(`${where}: unknown kind '${k}'`); else if (!DB[k][id]) errs.push(`${where}: unknown ${k} id '${id}'`); };
const loot = (o, where) => {
  for (const k of ['weapons', 'armors', 'accs', 'gems']) for (const id of o[k] || []) has(k, id, where);
  for (const id of Object.keys(o.items || {})) has('items', id, where);
};
for (const [sid, s] of Object.entries(SHOPS)) for (const [k, ids] of Object.entries(s.stock)) for (const id of ids) { has(k, id, `shop ${sid}`); if (DB[k]?.[id] && !(DB[k][id].price > 0)) errs.push(`shop ${sid}: ${id} has no price`); }
for (const [mid, m] of Object.entries(MAPS)) for (const [pos, c] of Object.entries(m.chests || {})) loot(c, `chest ${mid}@${pos}`);
for (const [eid, d] of Object.entries(DROPS)) {
  if (!ENEMIES[eid]) errs.push(`drops: unknown enemy ${eid}`);
  for (const slot of ['common', 'rare']) if (d[slot]) { has(d[slot][0], d[slot][1], `drops ${eid}.${slot}`); if (!(d[slot][2] > 0 && d[slot][2] <= 1)) errs.push(`drops ${eid}.${slot}: bad chance`); }
}
for (const eid of Object.keys(ENEMIES)) { if (!DROPS[eid]?.common || !DROPS[eid]?.rare) errs.push(`enemy ${eid} lacks a common+rare drop table`); }
for (const [eid, e] of Object.entries(ENEMIES)) for (const [sk] of e.skills) if (!SKILLS[sk]) errs.push(`enemy ${eid}: unknown skill ${sk}`);
for (const [bid, b] of Object.entries(BOSSES)) { if (!ENEMIES[bid]) errs.push(`boss ${bid} not an enemy`); loot(b.loot, `boss ${bid} loot`); }
for (const [qid, q] of Object.entries(QUESTS)) { loot(q.reward, `quest ${qid}`); if (q.goal.ids) for (const id of q.goal.ids) if (!ENEMIES[id]) errs.push(`quest ${qid}: unknown enemy ${id}`); if (q.goal.type === 'boss' && !ENEMIES[q.goal.id]) errs.push(`quest ${qid}: unknown boss`); }
for (const [t, grps] of Object.entries(ENCOUNTERS)) for (const g of grps) for (const id of g) if (!ENEMIES[id]) errs.push(`encounter ${t}: unknown enemy ${id}`);
for (const [mid, m] of Object.entries(MAPS)) { if (m.enc && !ENCOUNTERS[m.enc]) errs.push(`map ${mid}: unknown table ${m.enc}`); for (const t of Object.values(m.encByTile || {})) if (!ENCOUNTERS[t]) errs.push(`map ${mid}: unknown table ${t}`); if (m.boss && !ENEMIES[m.boss.id]) errs.push(`map ${mid}: unknown boss`); for (const n of m.npcs || []) { if (n.shop && !SHOPS[n.shop]) errs.push(`map ${mid}: npc shop ${n.shop}`); if (n.quest && !QUESTS[n.quest]) errs.push(`map ${mid}: npc quest ${n.quest}`); } }
for (const [jid, j] of Object.entries(JOBS)) { for (const [sk] of j.skills) if (!SKILLS[sk]) errs.push(`job ${jid}: unknown skill ${sk}`); for (const w of j.weapons) if (!WEAPON_TYPES[w]) errs.push(`job ${jid}: unknown weapon type ${w}`); }
for (const [tid, t] of Object.entries(WEAPON_TYPES)) if (!SKILLS[t.sig]) errs.push(`weapon type ${tid}: unknown sig ${t.sig}`);
const tiers = {};
for (const [wid, w] of Object.entries(WEAPONS)) {
  if (!WEAPON_TYPES[w.type]) errs.push(`weapon ${wid}: unknown type`);
  if (w.innate && !GEMS[w.innate]) errs.push(`weapon ${wid}: unknown innate gem ${w.innate}`);
  if (w.sig && !SKILLS[w.sig]) errs.push(`weapon ${wid}: unknown sig ${w.sig}`);
  if (w.elem && !ELEMENTS.includes(w.elem)) errs.push(`weapon ${wid}: bad elem`);
  if (w.proc && !['poison', 'slow', 'stun', 'drain'].includes(w.proc[0])) errs.push(`weapon ${wid}: bad proc`);
  if (!w.desc) errs.push(`weapon ${wid}: no desc`);
  (tiers[w.type] ||= new Set()).add(Math.min(3, w.tier));
}
for (const [t, s] of Object.entries(tiers)) for (const tier of [1, 2, 3]) if (!s.has(tier)) errs.push(`weapon type ${t}: no tier ${tier} weapon`);
// every weapon must be obtainable somewhere (shop, chest, boss loot, rare drop or quest)
const src = new Set();
for (const s of Object.values(SHOPS)) for (const id of s.stock.weapons || []) src.add(id);
for (const m of Object.values(MAPS)) for (const c of Object.values(m.chests || {})) for (const id of c.weapons || []) src.add(id);
for (const b of Object.values(BOSSES)) for (const id of b.loot.weapons || []) src.add(id);
for (const d of Object.values(DROPS)) for (const s of [d.common, d.rare]) if (s?.[0] === 'weapons') src.add(s[1]);
for (const q of Object.values(QUESTS)) for (const id of q.reward.weapons || []) src.add(id);
for (const wid of Object.keys(WEAPONS)) if (!src.has(wid)) errs.push(`weapon ${wid} cannot be obtained anywhere`);
// the new-game inventory and party in game.js
const game = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8'), ng = game.slice(game.indexOf('function newGame()'), game.indexOf('function migrate('));
const inv = ng.match(/inv: (\{.*\}),\s*$/m);
if (!inv) errs.push('could not find the newGame() inventory');
else { const o = Function(`return (${inv[1]})`)(); loot(o, 'newGame inventory'); }
for (const m of ng.matchAll(/newChar\('[^']+', '(\w+)', '(\w+)', (null|'(\w+)'), '(\w+)'/g)) { if (!JOBS[m[1]] || !JOBS[m[2]]) errs.push(`newGame: unknown job ${m[1]}/${m[2]}`); if (m[4]) has('weapons', m[4], 'newGame weapon'); has('armors', m[5], 'newGame armor'); }
if (errs.length) { console.log(errs.map((e) => '✗ ' + e).join('\n')); console.log(`\n${errs.length} problem(s)`); process.exit(1); }
console.log(`ids OK: ${Object.keys(WEAPONS).length} weapons, ${Object.keys(ENEMIES).length} enemies with drop tables, ${Object.keys(SHOPS).length} shops, ${Object.values(MAPS).reduce((n, m) => n + Object.keys(m.chests || {}).length, 0)} chests, ${Object.keys(QUESTS).length} quests`);
