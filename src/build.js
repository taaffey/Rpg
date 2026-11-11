// ===== Field items and the hero build screens (callings, gear, skills, gems). =====
import { GEMS, ITEMS, JOBS, SKILLS, TRAITS, WEAPONS } from './data.js';
import { MAPS } from './maps.js';
import { GEN } from './mapgen.js';
import { PHONE, PHONE_CHARGED } from './bros.js';
import { sfx } from './audio.js';
import * as UI from './uiart.js';
import * as L from './logic.js';
import { G } from './state.js';
import { ACT, DB, GEMS_PER_SLOT, SIG, ak, akj, bar, btn, coin, describeSkill, esc, expNeeded, gearDesc, gemCapacity, gemChip, gemImg, gemsOn, gemsUsed, heroBtn, hide, ic, itemIc, learnable, maxOf, portrait, sanitize, show, skillWithGems, slotGems, slotSkill, statLine, stats } from './core.js';
import { mainMenu } from './menus.js';
import { chartTheLand, goto, inTown, mapDef } from './world.js';
import { scene } from './story.js';
import { autofill, autosave, stars, traitName, unlockedJobs } from './saves.js';
import { guild } from './town.js';
// ---------- items (field use) ----------
function itemsMenu(msg = '') {
  const it = Object.entries(G.inv.items).filter(([, n]) => n > 0);
  show(`<h2>🎒 Items</h2><div class="card"><div class="gilbox"><span>Gold</span>${coin(G.gold + ' G')}</div></div>${msg ? `<p class="gold">${msg}</p>` : ''}${it.length ? it.map(([id, n]) => `<div class="slot"><span class="lead">${itemIc('items', id)}</span><div class="t"><b>${ITEMS[id].name} <span class="dim">×${n}</span></b><small>${ITEMS[id].desc}</small></div>${btn('useitem', 'Use', id)}</div>`).join('') : '<p class="dim">No consumables.</p>'}
  ${(G.party.some((c) => c.look === 'devon') || G.flags.story.buspass) ? `<h3>Key items</h3>${G.flags.story.buspass ? `<div class="slot"><span class="lead">${ic('tip')}</span><div class="t"><b>Night Bus Pass</b><small>The N9 stops at every place you have visited. Not in dungeons. "Every stop is a request stop."</small></div>${btn('bus', 'Ride', '', '')}</div>` : ''}${G.party.some((c) => c.look === 'devon') ? `<div class="slot"><span class="lead">${ic('tip')}</span><div class="t"><b>Devon's Phone</b><small>${G.flags.story.charged ? '4% battery! No signal.' : '3% battery. No signal. Never changes.'}</small></div>${btn('phone', 'Use', '', '')}</div>` : ''}` : ''}
  ${gemsOn() ? `<h3>💎 Gems (${G.inv.gems.length})</h3><div>${G.inv.gems.map((g) => gemChip(g)).join('') || '<span class="dim">none</span>'}</div>` : G.inv.gems.length ? `<h3>Oddments</h3><div class="dim">Dull Stone ×${G.inv.gems.length}</div>` : ''}
  <div class="foot">${btn('menu', 'Back', '', '', 'primary')}</div>`);
}
ACT.items = () => itemsMenu(); ACT.menu = mainMenu;
function busStops() { // every visited town, jetty and dungeon door on the overworld, with where the bus lands you (the tile outside)
  const out = [], w = MAPS.world;
  for (const [k, [px, py]] of Object.entries(GEN.pois)) {
    const pt = w.portals[`${px},${py}`], place = w.places.find((q) => q[0] === px && q[1] === py); if (!pt || !place) continue;
    if (!G.flags.visited[pt.to] || !GEN.adj[k]) continue;
    out.push({ name: place[2], to: GEN.adj[k], kind: MAPS[pt.to]?.kind });
  }
  return out.sort((a, b) => (a.kind === 'town' ? 0 : 1) - (b.kind === 'town' ? 0 : 1) || a.name.localeCompare(b.name));
}
ACT.bus = () => {
  const m = mapDef(); if (m.kind === 'dungeon') return show(`<h2>🚌 Night Bus</h2><p>The N9 does not run in dungeons. The driver has been very clear about this.</p><div class="foot">${btn('items', 'Back', '', '', 'primary')}</div>`);
  const stops = busStops();
  show(`<h2>🚌 Night Bus</h2><p class="dim">Where to, lads? Every stop is a request stop.</p><div class="cmdlist">${stops.map((s2, i) => `<button data-act="busgo" data-a="${i}">${ic('pin')}${esc(s2.name)}</button>`).join('') || '<p class="dim">Nowhere yet. Go and visit somewhere.</p>'}</div><div class="foot">${btn('items', 'Back', '', '', 'primary')}</div>`);
};
ACT.busgo = async (i) => {
  const s2 = busStops()[+i]; if (!s2) return;
  hide(); await scene([{ s: 'n', t: 'The N9 rattles up, windows steamed. "Mind the gap," says a voice from nowhere.' }]);
  (G.stats ||= { wins: 0 }).rides = (G.stats.rides || 0) + 1; await chartTheLand(); goto('world', ...s2.to); autosave();
};
ACT.phone = async () => { // Devon's phone: still 3%, still no signal, a different joke each time
  const jokes = G.flags.story.charged ? [...PHONE_CHARGED, ...PHONE.slice(1)] : PHONE, n = (G.flags.story.phone || 0) % jokes.length; G.flags.story.phone = n + 1; sfx('blip');
  await scene(jokes[n]);
};
ACT.useitem = (id) => {
  show(`<h2>${itemIc('items', id)} Use ${ITEMS[id].name} on…</h2><div class="card menuparty">${G.party.map((c, i) => heroBtn(c, 'useon', id, i)).join('')}</div><div class="foot">${btn('items', 'Back', '', '', 'primary')}</div>`);
};
const countUse = (id) => { const u = ((G.stats ||= { wins: 0 }).used ||= {}); u[id] = (u[id] || 0) + 1; }; // for the feats
ACT.useon = (id, i) => {
  const c = G.party[i], it = ITEMS[id], s = maxOf(c); let ok = false;
  if (it.revive && c.hp <= 0) { c.hp = Math.round(s.hp * it.revive); ok = true; }
  else if (c.hp > 0 && it.heal && c.hp < s.hp) { c.hp = Math.min(s.hp, c.hp + it.heal); ok = true; }
  else if (c.hp > 0 && it.mpr && c.mp < s.mp) { c.mp = Math.min(s.mp, c.mp + it.mpr); ok = true; }
  if (ok) { G.inv.items[id]--; countUse(id); }
  itemsMenu(ok ? `${esc(c.name)} ${it.verb || 'uses'} ${it.art || 'a'} ${it.name}.` : 'No effect.');
};
// ---------- field magic, the way FF1 does it: Menu > Magic > who casts > which spell > on whom ----------
// Only healing spells work outside battle. A spell keeps its battle shape: a one-ally cure asks for a target, the stronger
// party-wide ones just go off, and gems, weapon bonuses and MP costs are the same as in a fight. Free (0 MP) heals are battle-only.
function fieldSpells(c) {
  const thrift = L.activeTraits(c).includes('thrift');
  return [0, 1, 2, 3, SIG].map((i) => {
    const sid = L.slotSkill(c, i); if (!sid) return null;
    const m = L.withWeapon(skillWithGems(sid, L.slotGems(c, i)), c.weapon ? WEAPONS[c.weapon] : null, false, i === SIG);
    if (m.kind !== 'heal' || !(m.mp > 0)) return null;
    if (thrift) m.mp = Math.max(1, Math.round(m.mp * 0.75));
    return { ...m, slot: i, revive: m.fx.includes('revive'), amount: m.pow ? Math.round((maxOf(c).mag * m.pow + 8) * (m.healMul || 1)) : 0 };
  }).filter(Boolean);
}
const spellOf = (c, slot) => fieldSpells(c).find((m) => m.slot === +slot);
const helps = (m, t) => { const s = maxOf(t); return t.hp <= 0 ? m.revive : m.amount > 0 && t.hp < s.hp; }; // would this spell do anything for this hero?
function castField(c, m, targets) { // spend the MP and heal; returns what happened, or null if it would do nothing
  const hit = targets.filter((t) => helps(m, t)); if (c.hp <= 0 || c.mp < m.mp || !hit.length) return null;
  c.mp -= m.mp; sfx('holy');
  const out = hit.map((t) => { const s = maxOf(t); if (t.hp <= 0) { t.hp = Math.round(s.hp * 0.4); return `${esc(t.name)} is back on their feet.`; } const h = Math.min(m.amount, s.hp - t.hp); t.hp += h; return `${esc(t.name)} +${h} HP`; });
  (G.stats ||= { wins: 0 }).fieldCasts = (G.stats.fieldCasts || 0) + 1;
  return `${esc(c.name)} casts ${m.name}${/[?!.]$/.test(m.name) ? '' : '.'} ${out.join(' · ')}`;
}
const spellLine = (m) => `${m.mp} MP · ${m.tgt === 'allies' ? 'whole party' : m.tgt === 'self' ? 'self' : 'one ally'}${m.amount ? ` · +${m.amount} HP` : ''}${m.revive ? ' · revives' : ''}`;
ACT.magic = (msg) => {
  const any = G.party.some((c) => fieldSpells(c).length);
  show(`<h2>${ic('heal')} Magic</h2>${msg ? `<p class="gold">${msg}</p>` : ''}<p class="dim">${any ? 'Who casts? Healing spells work out here just as they do in a fight.' : 'Nobody has a healing spell ready. Barmaids learn them first; put one in a skill slot.'}</p><div class="card menuparty">${G.party.map((c, i) => { const n = fieldSpells(c).length; return heroBtn(c, 'magicwho', i).replace('<button ', `<button ${n && c.hp > 0 ? '' : 'disabled '}`); }).join('')}</div><div class="foot">${btn('menu', 'Back', '', '', 'primary')}</div>`);
};
ACT.magicwho = (i, msg) => {
  const c = G.party[+i], list = fieldSpells(c);
  show(`<h2>${ic('heal')} ${esc(c.name)} · MP ${c.mp}/${maxOf(c).mp}</h2>${msg ? `<p class="gold">${msg}</p>` : ''}<div class="cmdlist">${list.map((m) => btn('magiccast', `<span class="sk">${ic(UI.skillIconName(m))}<b>${m.name}</b></span><small>${spellLine(m)}</small>`, i, m.slot, 'two', c.hp <= 0 || c.mp < m.mp)).join('')}</div><div class="foot">${btn('magic', 'Back', '', '', 'primary')}</div>`);
};
ACT.magiccast = (i, slot, msg) => {
  const c = G.party[+i], m = spellOf(c, slot); if (!m) return ACT.magicwho(i);
  if (m.tgt !== 'ally') return ACT.magicwho(i, castField(c, m, m.tgt === 'self' ? [c] : G.party) || (c.mp < m.mp ? 'Not enough MP.' : 'No effect.'));
  show(`<h2>${ic('heal')} ${m.name} on…</h2>${msg ? `<p class="gold">${msg}</p>` : `<p class="dim">${esc(c.name)} · MP ${c.mp}/${maxOf(c).mp} · ${spellLine(m)}</p>`}<div class="card menuparty">${G.party.map((t, j) => heroBtn(t, 'magicon', `${+i}_${m.slot}`, j)).join('')}</div><div class="foot">${btn('magicwho', 'Back', i, '', 'primary')}</div>`);
};
ACT.magicon = (key, j) => { // stay on the target list after a cast, so topping up the whole party is a few taps
  const [i, slot] = String(key).split('_'), c = G.party[+i], m = spellOf(c, slot); if (!m) return ACT.magicwho(i);
  const r = castField(c, m, [G.party[+j]]) || (c.mp < m.mp ? 'Not enough MP.' : 'No effect.');
  if (c.mp < m.mp) return ACT.magicwho(i, r);
  ACT.magiccast(i, slot, `${r} <span class="dim">(MP ${c.mp}/${maxOf(c).mp})</span>`);
};
// ---------- build screen: jobs, gear, skills, gems ----------
let B = { i: 0, view: 'main', slot: 0, guild: false };
ACT.build = (i) => { B = { i: +i, view: 'main', slot: 0, guild: B.guild && inTown() }; buildScreen(); };
function buildScreen() {
  const c = G.party[B.i];
  ({ main: buildMain, jobMain: () => jobPick('main'), jobSub: () => jobPick('sub'), trait: traitPick, callings: callingsView, weapon: () => gearPick('weapons'), armor: () => gearPick('armors'), acc: () => gearPick('accs'), slot: slotEdit }[B.view])(c);
}
const back = (v = 'main') => () => { B.view = v; buildScreen(); };
ACT.bmain = back('main');
ACT.bnav = (d) => { B.i = (B.i + +d + G.party.length) % G.party.length; B.view = 'main'; buildScreen(); };
ACT.bclose = () => (B.guild ? guild() : mainMenu());
function buildMain(c) {
  const s = stats(c), cap = gemCapacity(c), used = gemsUsed(c);
  const gearRow = (label, view, id, kind) => `<div class="slot"><span class="lead">${id ? itemIc(kind, id) : ic({ weapons: 'fists', armors: 'armor', accs: 'ring' }[kind], 'dimic')}</span><div class="t"><b><span class="dim">${label}</span> ${id ? DB[kind][id].name : `<span class="dim">— ${kind === 'weapons' ? 'unarmed' : 'none'} —</span>`}</b><small>${id ? gearDesc(kind, DB[kind][id]) : kind === 'weapons' ? 'Fighting bare-handed. Buy a weapon at the hardware shop.' : ''}</small></div>${btn('bview', 'Change', view)}</div>`;
  const slotRow = (i) => {
    const sid = slotSkill(c, i), gems = slotGems(c, i);
    const m2 = sid ? skillWithGems(sid, gems) : null;
    return `<div class="slot"><span class="lead">${m2 ? ic(i === SIG ? 'star' : UI.skillIconName(m2)) : ic('socket')}</span><div class="t"><b><span class="dim">${i === SIG ? 'Weapon' : `Slot ${i + 1}`}</span> ${sid ? `${m2.name} ${gemsOn() ? gems.map((g) => gemChip(g, true)).join('') : ''}` : '<span class="dim">— empty —</span>'}</b><small>${m2 ? describeSkill(m2) : ''}</small></div>${btn('bslot', 'Edit', i)}</div>`;
  };
  const xpN = expNeeded(c.level), maxed = c.level >= L.MAX_LEVEL;
  show(`<div class="buildhead">${btn('bnav', ic('aleft'), -1, '', 'navbtn')}<div class="who2">${portrait(ak(c), 'lg')}<div><h2 style="background:none;padding:0;margin:0">${esc(c.name)}</h2><div class="lv">LV ${c.level}</div></div></div>${btn('bnav', ic('aright'), 1, '', 'navbtn')}</div>
  <div class="expline"><span>EXP</span>${bar(maxed ? 1 : c.exp, maxed ? 1 : xpN, 'xp')}<span>${maxed ? 'MAX' : `${c.exp}/${xpN}`}</span></div>${c.level >= 18 && L.nextPerk(c.level) ? `<div class="dim" style="font-size:8px">${ic('star')} LV ${L.nextPerk(c.level)[0]}: ${L.nextPerk(c.level)[1]}</div>` : ''}
  <div class="card">${callingCard(c)}${statLine(s)}</div>
  <h3>Equipment</h3>${gearRow('Weapon', 'weapon', c.weapon, 'weapons')}${gearRow('Armour', 'armor', c.armor, 'armors')}${gearRow('Acc.', 'acc', c.acc, 'accs')}
  <h3>${gemsOn() ? `Skills &amp; Gems <span class="${used > cap ? 'bad' : 'gold'}">◇ ${used}/${cap}</span>` : 'Skills'}</h3>${[0, 1, 2, 3, SIG].map(slotRow).join('')}
  <div class="foot">${btn('bclose', 'Done', '', '', 'primary')}</div>`);
}
ACT.bview = (v) => { B.view = v; buildScreen(); };
ACT.bslot = (i) => { B.slot = +i; B.view = 'slot'; buildScreen(); };
// the calling card: current calling with its rank bar, the second-calling and trait slots (each shown once it can be used)
function callingCard(c) {
  const m = JOBS[c.main], r = L.rankOf(c, c.main), cp = c.cp?.[c.main] || 0, sj = L.secondOk(c, c.sub) ? JOBS[c.sub] : null;
  const others = Object.keys(c.cp || {}).filter((j) => L.secondOk(c, j)), own = L.jobTrait(c.main, r), spare = L.learnedTraits(c).filter((t) => t !== own);
  const lo = L.CP_RANKS[r - 1] || 0, hi = L.CP_RANKS[r] ?? lo;
  return `<div class="jobrow"><span>${portrait(ak(c), 'sm')}<span><span class="dim">CALLING</span> ${m.name} ${stars(c, c.main)}</span></span>${btn('bview', 'Change', 'jobMain')}</div>
    <div class="expline"><span>RANK ${r}</span>${bar(r >= L.MAX_RANK ? 1 : cp - lo, r >= L.MAX_RANK ? 1 : hi - lo, 'cp')}<span>${r >= L.MAX_RANK ? 'MASTERED' : `${L.cpToNext(c, c.main)} CP`}</span></div>
    ${others.length ? `<div class="jobrow"><span>${sj ? portrait(c.sub, 'sm') : ic('socket')}<span><span class="dim">SECOND</span> ${sj ? `${sj.name} ${stars(c, c.sub)}` : '<span class="dim">— none —</span>'}</span></span>${btn('bview', 'Set', 'jobSub')}</div>` : ''}
    ${own || spare.length ? `<div class="jobrow"><span>${ic('star')}<span><span class="dim">TRAIT</span> ${L.activeTraits(c).map(traitName).join(' + ') || '<span class="dim">— none —</span>'}</span></span>${spare.length ? btn('bview', 'Set', 'trait') : ''}</div>` : ''}
    <div class="jobrow"><span>${ic('scroll')}<span><span class="dim">CALLINGS</span> ${Object.keys(c.cp || {}).length} learned${L.mastered(c).length ? ` · <span class="gold">${L.mastered(c).length}★</span>` : ''}</span></span>${btn('bview', 'View', 'callings')}</div>`;
}
const nextAbility = (c, j) => { const r = L.rankOf(c, j), n = [...JOBS[j].skills.map(([id, k]) => [SKILLS[id].name, k]), ...(JOBS[j].trait ? [[TRAITS[JOBS[j].trait[0]].name, JOBS[j].trait[1]]] : [])].filter(([, k]) => k === r + 1); return n.length ? n.map((x) => x[0]).join(', ') : ''; };
// the callings a hero can see: the awakened ones, plus any capstone once they have a mastery to their name (locked until earned)
const jobsFor = (c) => [...unlockedJobs().filter((j) => !JOBS[j].needs), ...Object.keys(JOBS).filter((j) => JOBS[j].needs && (L.callingOpen(c, j) || L.mastered(c).length > 0))];
function jobPick(which) {
  const c = G.party[B.i], list = which === 'main' ? jobsFor(c) : Object.keys(JOBS).filter((j) => L.secondOk(c, j));
  show(`<h2>${which === 'main' ? 'Calling' : 'Second calling'} · ${esc(c.name)}</h2>${which === 'sub' ? `<div class="slot"><span class="lead">${ic('socket')}</span><div class="t"><b>None</b></div>${btn('setjob', 'Clear', which, '', '', !c.sub)}</div>` : ''}${list.map((id) => {
    const j = JOBS[id], r = L.rankOf(c, id), now = c[which] === id, learned = L.jobSkills(id, r), nx = nextAbility(c, id);
    if (which === 'main' && !L.callingOpen(c, id)) return `<div class="slot"><span class="lead">${ic('socket')}</span><div class="t"><b class="dim">???</b><small>A calling for those who have mastered ${j.needs} others. ${esc(c.name)} has mastered ${L.mastered(c).length}.</small></div></div>`;
    const info = which === 'main' ? `${j.desc} ${!r ? `<span class="gold">New:</span> starts with ${nx}.` : nx ? `Next: ${nx}.` : 'Mastered.'}` : `Lends: ${learned.map((x) => SKILLS[x].name).join(', ')}`;
    return `<div class="slot ${now ? 'sel' : ''}">${portrait(akj(c, id))}<div class="t"><b>${j.name} ${which === 'main' ? j.weapons.map((w) => ic(UI.gearIconName('weapons', { type: w }))).join('') : ''} ${r ? stars(c, id) : ''}${now ? ' <span class="chip tag">NOW</span>' : ''}</b><small>${info}</small></div>${btn('setjob', 'Select', which, id, '', now)}</div>`;
  }).join('')}<div class="foot">${btn('bmain', 'Back', '', '', 'primary')}</div>`);
}
ACT.setjob = (which, id) => {
  const c = G.party[B.i]; if (which === 'main') L.setCalling(c, id); else c.sub = id || null;
  sanitize(c, G.inv); autofill(c); B.view = 'main'; buildScreen();
};
function traitPick() {
  const c = G.party[B.i], own = L.jobTrait(c.main, L.rankOf(c, c.main)), list = L.learnedTraits(c).filter((t) => t !== own);
  const from = (t) => JOBS[Object.keys(JOBS).find((j) => JOBS[j].trait?.[0] === t)].name, two = L.traitSlots(c) > 1;
  show(`<h2>Trait · ${esc(c.name)}</h2>${own ? `<div class="slot"><span class="lead">${ic('star')}</span><div class="t"><b>${traitName(own)} <span class="chip tag">${JOBS[c.main].name}</span></b><small>${TRAITS[own].desc} Always on.</small></div></div>` : ''}
  ${two ? `<p class="dim">Level 25 gave a second trait slot: pick any two.</p>` : ''}<div class="slot"><span class="lead">${ic('socket')}</span><div class="t"><b>None</b></div>${btn('settrait', 'Clear', '', '', '', !c.trait && !c.trait2)}</div>${list.map((t) => { const on = c.trait === t || (two && c.trait2 === t); return `<div class="slot ${on ? 'sel' : ''}"><span class="lead">${ic('star')}</span><div class="t"><b>${traitName(t)} <span class="dim">${from(t)}</span></b><small>${TRAITS[t].desc}</small></div>${btn('settrait', on && two ? 'Remove' : 'Set', t, '', '', on && !two)}</div>`; }).join('')}
  <div class="foot">${btn('bmain', 'Back', '', '', 'primary')}</div>`);
}
ACT.settrait = (t) => { // one slot: pick and go back. Two slots (level 25): tap to add or remove, the older pick makes way for a third
  const c = G.party[B.i];
  if (L.traitSlots(c) < 2) { c.trait = t || null; sanitize(c, G.inv); B.view = 'main'; return buildScreen(); }
  if (!t) { c.trait = c.trait2 = null; } else if (c.trait === t) { c.trait = c.trait2 || null; c.trait2 = null; } else if (c.trait2 === t) c.trait2 = null; else if (!c.trait) c.trait = t; else if (!c.trait2) c.trait2 = t; else { c.trait = c.trait2; c.trait2 = t; }
  sanitize(c, G.inv); buildScreen();
};
function callingsView() { // every awakened calling: rank stars, abilities learned, the next one (later ones stay unseen)
  const c = G.party[B.i];
  show(`<h2>Callings · ${esc(c.name)}</h2>${jobsFor(c).filter((id) => L.callingOpen(c, id)).map((id) => {
    const j = JOBS[id], r = L.rankOf(c, id), got = [...L.jobSkills(id, r).map((x) => SKILLS[x].name), ...(L.jobTrait(id, r) ? [traitName(L.jobTrait(id, r))] : [])], nx = nextAbility(c, id);
    const master = r >= L.MAX_RANK ? ` · <span class="gold">★ ${Object.entries(j.master).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(' ')}</span>` : '';
    return `<div class="slot callrow ${id === c.main ? 'sel' : ''}">${portrait(akj(c, id), r ? '' : 'ko')}<div class="t"><b>${j.name} ${stars(c, id)}${id === c.main ? ' <span class="chip tag">NOW</span>' : id === c.sub ? ' <span class="chip tag">2ND</span>' : ''}</b><small>${got.length ? got.join(' · ') : '<span class="dim">Not yet taken up.</span>'}${nx ? ` <span class="dim">→ ${nx}${r ? ` (${L.cpToNext(c, id)} CP)` : ''}</span>` : ''}${master}</small></div></div>`;
  }).join('')}<div class="foot">${btn('bmain', 'Back', '', '', 'primary')}</div>`);
}
function gearPick(kind) {
  const c = G.party[B.i], field = { weapons: 'weapon', armors: 'armor', accs: 'acc' }[kind];
  const gain = (id) => { const now = stats(c), after = stats({ ...c, [field]: id }); return ['atk', 'mag', 'def', 'spd'].reduce((n, k) => n + after[k] - now[k], 0) + (after.hp - now.hp + after.mp - now.mp) / 10; };
  const uniq = [...new Set(G.inv[kind])].map((id) => { const ok = kind !== 'weapons' || L.weaponOk(c, id); return { id, ok, g: ok ? gain(id) : -Infinity }; }).sort((x, y) => y.g - x.g || (x.ok === y.ok ? 0 : x.ok ? -1 : 1)); // usable first, biggest gain first
  const best = uniq[0]?.ok && uniq[0].g > 0 ? uniq[0].id : null;
  show(`<h2>${ic({ weapons: 'sword', armors: 'armor', accs: 'ring' }[kind])} ${esc(c.name)}: ${{ weapon: 'weapon', armor: 'armour', acc: 'accessory' }[field]}</h2>${c[field] ? `<div class="slot"><span class="lead">${itemIc(kind, c[field])}</span><div class="t"><b><span class="dim">NOW</span> ${DB[kind][c[field]].name}</b></div>${btn('equip', 'Unequip', kind, '')}</div>` : ''}${uniq.map(({ id, ok }) => {
    const g = DB[kind][id];
    const now = stats(c), after = stats({ ...c, [field]: id }), delta = ok ? ['atk', 'mag', 'def', 'hp', 'mp', 'spd'].filter((k) => after[k] !== now[k]).map((k) => `<span class="${after[k] > now[k] ? 'up' : 'down'}">${after[k] > now[k] ? '▲' : '▼'}${Math.abs(after[k] - now[k])} ${k}</span>`).join(' ') : '';
    return `<div class="slot"><span class="lead">${itemIc(kind, id)}</span><div class="t"><b>${g.name} <span class="dim">×${G.inv[kind].filter((x) => x === id).length}</span>${id === best ? ' <span class="chip tag">★ Best</span>' : ''}</b><small>${gearDesc(kind, g)}${ok ? '' : ' · <span class="bad">job can\'t use</span>'}</small>${delta ? `<div class="delta">${delta}</div>` : ''}</div>${btn('equip', 'Equip', kind, id, '', !ok)}</div>`;
  }).join('') || '<p class="dim">Nothing in inventory.</p>'}<div class="foot">${btn('bmain', 'Back', '', '', 'primary')}</div>`);
}
ACT.equip = (kind, id) => {
  const c = G.party[B.i], field = { weapons: 'weapon', armors: 'armor', accs: 'acc' }[kind];
  if (c[field]) G.inv[kind].push(c[field]);
  c[field] = null;
  if (id) { G.inv[kind].splice(G.inv[kind].indexOf(id), 1); c[field] = id; }
  sanitize(c, G.inv); B.view = 'main'; buildScreen();
};
function slotEdit(c) {
  const i = B.slot, sid = slotSkill(c, i), gems = c.gems[i];
  const full = gemsUsed(c) >= gemCapacity(c) || gems.length >= GEMS_PER_SLOT;
  const final = sid ? skillWithGems(sid, slotGems(c, i)) : null;
  const inv = [...new Set(G.inv.gems)];
  show(`<h2>${i === SIG ? '⭐ Weapon skill' : 'Skill slot ' + (i + 1)} — ${esc(c.name)}</h2>
  <div class="card"><div class="row">${final ? ic(UI.skillIconName(final)) : ic('socket')}<b>${final ? final.name : '— empty —'}</b>${final ? `<span class="gold">${final.mp} MP</span>` : ''}</div><div>${gemsOn() ? slotGems(c, i).map((g) => gemChip(g)).join('') : ''}</div><small>${final ? describeSkill(final) : 'Pick a skill below.'}</small></div>
  ${i === SIG ? `<div class="dim">Granted by your weapon (${c.weapon ? WEAPONS[c.weapon].name : 'unarmed'}). ${gemsOn() && c.weapon && WEAPONS[c.weapon].innate ? 'Includes free innate gem: ' + GEMS[WEAPONS[c.weapon].innate].name + '.' : ''}</div>` :
    `<h3>Skill</h3><div class="skillpick">${btn('setskill', `<span>${ic('socket')} Empty</span>`, i, '')}${learnable(c).map((s) => btn('setskill', `<span>${ic(UI.skillIconName(SKILLS[s]))} ${SKILLS[s].name}</span><small>${SKILLS[s].mp}mp</small>`, i, s, c.slots[i] === s ? 'sel two' : 'two')).join('')}</div>`}
  ${gemsOn() ? `<h3>Socketed ◇ ${gemsUsed(c)}/${gemCapacity(c)} <small>max ${GEMS_PER_SLOT}/skill</small></h3>
  ${gems.map((g, k) => `<div class="slot"><span class="lead">${gemImg(g)}</span><div class="t"><b>${GEMS[g].name}</b><small>${GEMS[g].desc}</small></div>${btn('ungem', `${ic('close')}Remove`, i, k)}</div>`).join('') || '<p class="dim">None socketed.</p>'}
  <h3>💎 Inventory gems</h3>${inv.map((g) => `<div class="slot"><span class="lead">${gemImg(g)}</span><div class="t"><b>${GEMS[g].name} <span class="dim">×${G.inv.gems.filter((x) => x === g).length}</span></b><small>${GEMS[g].desc}</small></div>${btn('gem', 'Socket', i, g, '', full || !sid)}</div>`).join('') || '<p class="dim">No spare gems.</p>'}` : ''}
  <div class="foot">${btn('bmain', 'Back', '', '', 'primary')}</div>`);
}
ACT.setskill = (i, sid) => { const c = G.party[B.i]; c.slots[+i] = sid || null; if (!sid) { G.inv.gems.push(...c.gems[+i]); c.gems[+i] = []; } buildScreen(); };
ACT.gem = (i, g) => { const c = G.party[B.i]; G.inv.gems.splice(G.inv.gems.indexOf(g), 1); c.gems[+i].push(g); buildScreen(); };
ACT.ungem = (i, k) => { const c = G.party[B.i]; G.inv.gems.push(...c.gems[+i].splice(+k, 1)); buildScreen(); };

export { B, countUse, itemsMenu };
