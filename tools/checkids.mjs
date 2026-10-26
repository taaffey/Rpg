// Every id referenced by shops, chests, drops, bosses, quests, encounters, jobs, weapons and the new-game inventory must exist.
// usage: node tools/checkids.mjs
import { readFileSync } from 'node:fs';
import { WEAPONS, ARMORS, ACCS, GEMS, ITEMS, SKILLS, JOBS, WEAPON_TYPES, ENEMIES, ENCOUNTERS, DROPS, BOSSES, SHOPS, QUESTS, ELEMENTS, STORY, KEY_ITEMS, TRAITS, CALLING_BATCHES } from '../src/data.js';
import { MAPS } from '../src/maps.js';
import * as BR from '../src/bros.js';
import '../src/hopsend.js';
import '../src/embers.js';
import '../src/obsidian.js';
import '../src/sidequests.js';
import * as DATA from '../src/data.js';
const DB = { weapons: WEAPONS, armors: ARMORS, accs: ACCS, gems: GEMS, items: ITEMS };
const errs = [];
const has = (k, id, where) => { if (!DB[k]) errs.push(`${where}: unknown kind '${k}'`); else if (!DB[k][id]) errs.push(`${where}: unknown ${k} id '${id}'`); };
const loot = (o, where) => {
  for (const k of ['weapons', 'armors', 'accs', 'gems']) for (const id of o[k] || []) has(k, id, where);
  for (const id of Object.keys(o.items || {})) has('items', id, where);
};
for (const [sid, s] of Object.entries(SHOPS)) for (const [k, ids] of Object.entries(s.stock)) for (const id of ids) { has(k, id, `shop ${sid}`); if (DB[k]?.[id] && !(DB[k][id].price > 0)) errs.push(`shop ${sid}: ${id} has no price`); }
for (const [mid, m] of Object.entries(MAPS)) for (const [pos, c] of Object.entries({ ...(m.chests || {}), ...(m.secrets || {}) })) loot(c, `chest ${mid}@${pos}`);
// quest items: every find/deliver item has a display name in game.js; every find item sits in some chest; every deliver quest has a recipient
{ const gsrc = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8'), qi = gsrc.match(/const QITEM = (\{.*\});/), QITEM = qi ? Function('KEY_ITEMS', `return (${qi[1]})`)(KEY_ITEMS) : {};
  const inChests = new Set(Object.values(MAPS).flatMap((m) => Object.values({ ...(m.chests || {}), ...(m.secrets || {}) }).map((c) => c.qitem).filter(Boolean)));
  const recv = new Set(Object.values(MAPS).flatMap((m) => (m.npcs || []).map((n) => n.deliver).filter(Boolean)));
  for (const [qid, q] of Object.entries(QUESTS)) { const g = q.goal;
    if (['find', 'deliver'].includes(g.type) && !QITEM[g.item]) errs.push(`quest ${qid}: no QITEM name for ${g.item}`);
    if (g.type === 'find' && !inChests.has(g.item)) errs.push(`quest ${qid}: item ${g.item} is in no chest`);
    if (g.type === 'deliver' && (!recv.has(qid) || !q.lines.deliver)) errs.push(`quest ${qid}: no recipient NPC or deliver lines`);
    if (g.lure && (!ENCOUNTERS[g.lure.table] || g.lure.group.some((id) => !ENEMIES[id]))) errs.push(`quest ${qid}: bad lure`);
    if (!Object.values(MAPS).some((m) => (m.npcs || []).some((n) => n.quest === qid))) errs.push(`quest ${qid}: no giver NPC`); } }
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
for (const [jid, j] of Object.entries(JOBS).filter(([id]) => id !== "bloke")) { /* bloke: the jobless intro, no trait, never offered again */ for (const [sk, r] of j.skills) { if (!SKILLS[sk]) errs.push(`job ${jid}: unknown skill ${sk}`); if (!(r >= 1 && r <= 6)) errs.push(`job ${jid}: ${sk} rank ${r} outside 1-6`); } if (!TRAITS[j.trait?.[0]]) errs.push(`job ${jid}: unknown trait`); if (!j.master) errs.push(`job ${jid}: no mastery bonus`); if (CALLING_BATCHES.flat().filter((x) => x === jid).length !== 1) errs.push(`job ${jid}: not in exactly one calling batch`); if (!j.skills.some(([, r]) => r === 1)) errs.push(`job ${jid}: nothing at rank 1`); for (const w of j.weapons) if (!WEAPON_TYPES[w]) errs.push(`job ${jid}: unknown weapon type ${w}`); }
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
const game = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8'), ng = game.slice(game.indexOf('function newGame('), game.indexOf('function migrate('));
const inv = ng.match(/inv: (\{.*\}),\s*$/m);
if (!inv) errs.push('could not find the newGame() inventory');
else { const o = Function(`return (${inv[1]})`)(); loot(o, 'newGame inventory'); }
for (const m of ng.matchAll(/newChar\('[^']+', '(\w+)', '(\w+)', (null|'(\w+)'), '(\w+)'/g)) { if (!JOBS[m[1]] || !JOBS[m[2]]) errs.push(`newGame: unknown job ${m[1]}/${m[2]}`); if (m[4]) has('weapons', m[4], 'newGame weapon'); has('armors', m[5], 'newGame armor'); }
// story: every condition atom (scenes, npc.textBy) names a real boss / map / quest; speakers exist; hearts are key items
{ const PEOPLE = [...BR.BROS.map(([, l]) => l), ...Object.keys(BR.LOCALS)];
  const atom = (a, where) => { const [k, x] = a.includes(':') ? a.split(':') : ['b', a]; const okA = k === 'b' ? !!BOSSES[x] : k === 'v' ? !!MAPS[x] : k === 'q' ? !!QUESTS[x] : k === 'p' ? !!(BR.LOCALS[x] || BR.BROS.some(([, l]) => l === x)) : k === 's'; if (!okA) errs.push(`${where}: bad condition '${a}'`); };
  const conds = (c, where) => { if (c) for (const t of c.split(' ')) for (const a of t.replace(/^!/, '').split('|')) atom(a, where); };
  const scene = (sc, where) => { for (const l of Array.isArray(sc) ? sc : sc.lines) { conds(l.if, where); if (!(['n', 'h0', 'h1', 'h2', 'h3'].includes(l.s) || STORY.cast[l.s] || PEOPLE.includes(l.s))) errs.push(`${where}: unknown speaker ${l.s}`); if (!l.t) errs.push(`${where}: empty line`); } };
  for (const [id, sc] of Object.entries(STORY.area)) { if (!MAPS[id]) errs.push(`story area ${id}: no such map`); scene(sc, `story area ${id}`); }
  for (const [id, sc] of Object.entries(STORY.after)) { if (!BOSSES[id]) errs.push(`story after ${id}: no such boss`); scene(sc, `story after ${id}`); }
  for (const [who, e] of Object.entries(STORY.epilogue)) { if (!PEOPLE.includes(who)) errs.push(`epilogue: unknown person ${who}`); if (!e.default) errs.push(`epilogue ${who}: no default`); for (const j of Object.keys(e)) if (j !== 'default' && !JOBS[j]) errs.push(`epilogue ${who}: unknown job ${j}`); }
  for (const who of PEOPLE) if (!STORY.epilogue[who]) errs.push(`epilogue: no ending for ${who}`);
  if (STORY.finale) scene(STORY.finale, 'finale'); else errs.push('no STORY.finale');
  const chatIds = new Set(), REGIONS = ['green', 'plains', 'snow', 'swamp', 'desert'], KINDS = ['dungeon', 'town', 'interior', 'outdoor'];
  for (const c of STORY.chat || []) { const w = `chat ${c.id}`; if (!c.id || chatIds.has(c.id)) errs.push(`${w}: missing or duplicate id`); chatIds.add(c.id); conds(c.if, w); scene(c.lines, w);
    if (c.at) { const [k, v] = c.at.includes(':') ? c.at.split(':') : ['map', c.at]; if (!(k === 'map' ? MAPS[v] : k === 'region' ? REGIONS.includes(v) : k === 'kind' ? KINDS.includes(v) : false)) errs.push(`${w}: bad at '${c.at}'`); } }
  (STORY.chatIdle || []).forEach((l, i) => scene(l, `chatIdle ${i}`));
  BR.PHONE.forEach((l, i) => scene(l, `phone ${i}`));
  for (const [i, q] of (DATA.QUIZ || []).entries()) { conds(q.if, `quiz ${i}`); if (q.a?.length !== 4 || new Set(q.a).size !== 4) errs.push(`quiz ${i}: needs 4 distinct answers`); }
  for (const [k, list] of Object.entries(DATA.QUIPS || {})) for (const [who, t] of list) if (!PEOPLE.includes(who) || !t) errs.push(`quip ${k}: bad speaker ${who}`);
  for (const id of Object.keys(ENEMIES)) { const n = DATA.BESTIARY_NOTES?.[id]; if (!n) errs.push(`bestiary note missing for enemy ${id}`); else if (!PEOPLE.includes(n[0]) || !n[1] || n[1].length > 100) errs.push(`bestiary note ${id}: bad speaker/text`); }
  for (const id of Object.keys(DATA.BESTIARY_NOTES || {})) if (!ENEMIES[id]) errs.push(`bestiary note for unknown enemy ${id}`);
  for (const k of BR.COMBOS) { if (!SKILLS[k.id]) errs.push(`combo ${k.id}: no skill`); conds(k.if, `combo ${k.id}`); }
  for (const k of ['WAKE', 'CELLAR_IN', 'GARY_DOWN', 'CALLED', 'CALLED_AFTER', 'WENDELL']) scene(BR[k], `bros ${k}`);
  for (const [mid, m] of Object.entries(MAPS)) for (const [k, pt] of Object.entries(m.portals || {})) { if (!MAPS[pt.to]) errs.push(`portal ${mid} ${k}: no map ${pt.to}`); if (pt.need) { conds(pt.need, `portal ${mid}`); scene(pt.deny || [], `portal ${mid} deny`); } }
  for (const [id, l] of Object.entries(BR.LOCALS)) { if (!JOBS[l.job]) errs.push(`local ${id}: job ${l.job}`); if (l.weapon) has('weapons', l.weapon, `local ${id}`); has('armors', l.armor, `local ${id}`); }
  for (const [id, b] of Object.entries(BOSSES)) if (b.heart && !KEY_ITEMS[b.heart]) errs.push(`boss ${id}: heart ${b.heart} is not a key item`);
  for (const [mid, m] of Object.entries(MAPS)) for (const n of m.npcs || []) for (const [c, lines] of n.textBy || []) { conds(c, `npc ${mid}/${n.name}`); if (!lines?.length) errs.push(`npc ${mid}/${n.name}: empty textBy lines`); }
}
if (errs.length) { console.log(errs.map((e) => '✗ ' + e).join('\n')); console.log(`\n${errs.length} problem(s)`); process.exit(1); }
console.log(`ids OK: ${Object.keys(WEAPONS).length} weapons, ${Object.keys(ENEMIES).length} enemies with drop tables, ${Object.keys(SHOPS).length} shops, ${Object.values(MAPS).reduce((n, m) => n + Object.keys(m.chests || {}).length, 0)} chests, ${Object.keys(QUESTS).length} quests`);
