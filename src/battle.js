// ===== Battle UI and flow, victory, defeat, the ending, New Game+ and house rules. =====
import { GEN } from './mapgen.js';
import * as DATA from './data.js';
import { BOSSES, CALLING_BATCHES, DIFFICULTY, ENEMIES, ITEMS, JOBS, KEY_ITEMS, QUESTS, SKILLS, STORY, TRAITS } from './data.js';
import { BROS, COMBOS, PARTY_SCALE } from './bros.js';
import { music, sfx } from './audio.js';
import { Stage } from './stage.js';
import { DEFEAT, HEART_GEM, RULES, SPEEDS, VICTORY } from './gamedata.js';
import * as SP from './sprites.js';
import * as UI from './uiart.js';
import * as L from './logic.js';
import { MAPS } from './maps.js';
import { FEATS } from './feats.js';
import { G, S } from './state.js';
import { draw, goto, mapDef, musicFor, regionOf, tileAt, transition } from './world.js';
import { $, ACT, Battle, OPT, SIG, ak, banner, bar, btn, describeSkill, diag, esc, expNeeded, fmtTime, gemsOn, gemsUsed, hide, ic, itemIc, lootName, maxOf, ov, portrait, rewards, show, skillWithGems, sleep, slotGems, slotSkill, toast, veteran } from './core.js';
import { WORLD_V, autofill, autosave, batchesOpen, newGame, stars, tip, tipOnce } from './saves.js';
import { cond, joinLocal, partyNames, qstate, questLog, scene } from './story.js';
import { countUse } from './build.js';
import { beastDone, unlockFeats } from './menus.js';
import { pubImg } from './intro.js';
// ---------- battle ----------
let BT = null;
// a foe's stat as you'd meet it now: difficulty, and (outside boss fights) the small-party scaling
let ROAD = null; const roadAt = (x, y) => (ROAD ||= new Set((GEN.deco?.roads || []).map(([a, b]) => a + ',' + b))).has(x + ',' + y);
const ngMul = (k) => { const n = Math.min(5, G.ngp || 0); return n ? (k === 'hp' ? 1 + 0.4 * n : k === 'reward' ? 1 + 0.5 * n : k === 'def' ? 1 + 0.08 * n : 1 + 0.2 * n) : 1; }; // New Game+: each loop of the bell toughens the world
const foeStat = (d, k) => { const m = DIFFICULTY[G.difficulty || 'normal'].mod, ps = !d.boss && PARTY_SCALE[G.party.length]; return Math.round(d[k] * (m[k] ?? 1) * ngMul(k) * (ps ? (k === 'hp' ? ps.hp : ps.atk) : 1)); };
// the party's one-line field note on an enemy (BESTIARY_NOTES in data.js); whoever isn't in the party is replaced by Devon
const fieldNote = (id) => {
  const n = DATA.BESTIARY_NOTES?.[id]; if (!n) return null;
  const who = G.party.find((c) => c.look === n[0]) || G.party.find((c) => c.look === 'devon') || G.party[0];
  return { name: who.name, text: n[1] };
};
function stageKind(bossId) {
  if (bossId) return { big_gary: 'cellar', miller: 'windmill', captain_barnacle: 'wreck', clerk_pharaoh: 'ruins', frozen_angler: 'spire', mash_tun: 'brewery', margherita: 'pizzaoven', landlord: 'obsidian', wyrm: 'boss', lich: 'crypt', storm_drake: 'storm', sphinx: 'ruins' }[bossId] || 'spire';
  const m = mapDef();
  if (m.kind === 'dungeon') return G.map === 'pizzaoven' || G.map === 'obsidian' || G.map === 'wreck' || G.map === 'windmill' ? G.map : m.theme === 'cavern' ? 'dungeon' : m.theme;
  const r = regionOf(), woods = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b2]) => tileAt(G.x + a, G.y + b2) === 'T'); // fighting at a forest's edge
  return r === 'snow' ? 'snow' : r === 'swamp' ? 'swamp' : r === 'ember' ? 'embers' : r === 'desert' ? 'desert' : woods ? 'forest' : 'world';
}
async function battle(groupIds, bossId = null) {
  if (BT || S.busy) return; // never run two battles at once (BT is only set after the start-of-battle wipe, so check busy too)
  try { await battleInner(groupIds, bossId); } catch (err) { // never leave the player stuck in a broken battle
    console.error(err); try { BT?.stage?.stop(); } catch {} BT = null; S.busy = false; S.trans = 0; hide(); music(musicFor()); toast('⚠ Battle error: back to the map. Options > Report a problem has the details.', 5200);
  }
}
async function battleInner(groupIds, bossId = null) {
  S.busy = true; diag(`fight ${groupIds.join(',')}${bossId ? ' (boss)' : ''} at ${G.map}`);
  const mod = { ...DIFFICULTY[G.difficulty || 'normal'].mod }, ps = !bossId && PARTY_SCALE[G.party.length];
  if (ps) { mod.hp *= ps.hp; mod.atk *= ps.atk; mod.mag *= ps.atk; }
  for (const k of ['hp', 'atk', 'mag', 'def', 'reward']) mod[k] = (mod[k] ?? 1) * ngMul(k);
  if (G.rules) { mod.reward *= ruleBonus(); if (G.rules.glass) mod.dmg = 1.5; if (G.rules.rush) mod.rush = true; } // NG+ house rules
  const b = new Battle(G.party, groupIds, Math.random, !!bossId, mod);
  await transition(); music(bossId ? 'boss' : 'battle');
  const firstId = !bossId && b.e.map((e) => e.id).find((id) => !G.flags.bestiary[id] && fieldNote(id)), note = firstId && fieldNote(firstId); // first sight of a new foe: the party says something
  BT = { b, boss: bossId, logBig: false, log: [bossId ? BOSSES[bossId].intro : `${b.e.map((e) => e.name).join(', ')} ${b.e.length > 1 ? 'appear' : 'appears'}!`, ...(note ? [`${note.name}: “${note.text}”`] : [])], ask: null };
  BT.last = new Map(); BT.auto = false;
  for (const e of b.e) G.flags.bestiary[e.id] = G.flags.bestiary[e.id] || { seen: 1, kills: 0 };
  BT.stage = new Stage(b, stageKind(bossId));
  BT.stage.canvas.addEventListener('pointerdown', (e) => { // touch targeting: tap a foe to attack it, or tap the target you're choosing
    const a = BT?.ask; if (!a) return; const hit = BT.stage.pick(e.clientX, e.clientY); if (!hit) return;
    const i = (hit.side === 'e' ? BT.b.e : BT.b.p).indexOf(hit.c); if (i < 0) return; e.preventDefault();
    if (a.stage === 'target' && a.tside === hit.side) ACT.tgt(hit.side, i);
    else if (a.stage === 'root' && hit.side === 'e') { ACT.c('attack'); if (BT?.ask?.stage === 'target') ACT.tgt('e', i); }
  });
  tip('battle', 'Pick Attack or Skills, then a target. Icons under an enemy show its weakness: hit it with that element for +50%. 🔁 Repeat reuses your last move.', 7000);
  if (bossId) BT.stage.card(BOSSES[bossId].name.toUpperCase(), 2.6);
  renderBattle();
  while (!b.over) {
    if (BT.auto && b.p.some((x) => x.hp <= 0 || x.hp < x.maxhp * 0.3)) { BT.auto = false; toast('⏩ Auto-battle stopped: someone needs help', 3000); renderBattle(); } // never auto-march a party into a wipe
    const cmds = new Map();
    for (const p of b.p.filter((x) => x.hp > 0)) {
      if (cmds.get(p)?.kind === 'assist') continue; // already teamed up in a Bro Combo
      const cmd = await askCommand(p);
      cmds.set(p, cmd); if (cmd.kind === 'combo') cmds.set(cmd.partner, { kind: 'assist' });
    }
    BT.ask = null; BT.stage.setActive(null);
    for (const lines of b.round(cmds)) { BT.log.push(...lines); renderBattle(); playFx(b.fx.splice(0)); await sleep(SPEEDS[OPT.speed]); }
    renderBattle();
  }
  if (b.over === 'win') { BT.stage.victory(); sfx('levelup'); renderBattle(); await sleep(1200); }
  BT.stage.stop(); S.trans = 0;
  b.p.forEach((x) => { x.ch.hp = x.hp; x.ch.mp = x.mp; });
  if (b.over === 'fled') { sfx('flee'); const q = quip('flee', 0.6); if (q) toast(q.replace(/<[^>]+>/g, ''), 2600); }
  diag(`fight over: ${b.over} after ${b.turn} rounds, party ${b.p.map((x) => `${x.hp}/${x.maxhp}`).join(' ')}`);
  if (b.over === 'win') await victory(b, bossId);
  else if (b.over === 'lose') await defeat();
  else { hide(); }
  BT = null; S.busy = false; if (G) { if (b.over !== 'lose') music(musicFor()); draw(); if (b.over === 'win') autosave(); }
}
function renderBattle() {
  const { b, ask } = BT;
  const order = b.order().map((x) => `<img class="px o-${x.side} ${ask?.p === x ? 'cur' : ''} ${x.side === 'e' && SP.isBig(x.id) ? 'big' : ''}" title="${esc(x.name)}" src="${x.side === 'p' ? UI.faceURL(ak(x.ch)) : SP.enemyURL(x.id)}" alt="${esc(x.name)}">`).join('');
  const icons = (list) => list.map((w) => UI.elemIcon(w)).join('');
  const line = (l) => `<div>${UI.deco(esc(l))}</div>`;
  const groups = []; for (const e of b.e) { if (e.hp <= 0) continue; const g = groups.find((x) => x.name === e.name); if (g) g.n++; else groups.push({ name: e.name, n: 1, e }); }
  const enemyWin = `<div class="elist">${groups.map(({ name, n, e }) => `<div class="er" data-n="${esc(name)}"><span class="en">${esc(name)}</span><span class="ec">${n > 1 ? '×' + n : ''}</span>${e.weak.length || e.res.length ? `<span class="ew">${e.weak.length ? '<span class="lab">WEAK</span>' + icons(e.weak) : ''}${e.res.length ? '<span class="lab">RES</span>' + icons(e.res) : ''}</span>` : ''}</div>`).join('')}</div>`;
  const msg = BT.log.slice(-2).map(line).join('');
  const winding = b.e.filter((x) => x.hp > 0 && x.charge).map((x) => { const pct = Math.min(100, Math.round(100 * x.charge.dmg / x.charge.need)); return `<div class="chg${pct >= 100 ? ' ready' : ''}"><b>${UI.deco('⚠')} WIND-UP</b><span class="cbar"><i style="width:${pct}%"></i></span><small>${pct >= 100 ? 'STAGGER READY' : 'Hit it hard, or Guard'}</small></div>`; }).join('');
  ov.innerHTML = `<div class="win battle"><div class="bl"><div class="order"><span class="olab">ORDER</span>${order}${BT.auto ? '<button class="autobtn on" data-tap="autotoggle" tabindex="-1">AUTO ON</button>' : ''}</div>
  <div class="stagewrap"><div id="stagehost"></div>${msg && !BT.logBig ? `<div class="bmsg">${msg}</div>` : ''}${winding ? `<div class="chgwrap">${winding}</div>` : ''}<button class="logtoggle" data-tap="logsize" tabindex="-1" title="Battle log (L)">${BT.logBig ? 'CLOSE' : 'LOG'}</button></div>
  ${BT.logBig ? `<div class="logwrap"><div class="log big" id="log">${BT.log.map(line).join('')}</div></div>` : ''}</div>
  <div class="br${ask && ask.stage !== 'root' ? ' subcmd' : ''}"><div class="pane cmdwin"><div id="cmd">${ask ? cmdHtml(ask) : enemyWin}</div></div>
  <div class="pane partywin">${b.p.map((p) => { const r = p.hp / p.maxhp; return `<div data-n="${p.name}" class="pm ${p.hp <= 0 ? 'dead' : ''} ${ask?.p === p ? 'active' : ''}">${portrait(ak(p.ch), 'sm' + (p.hp <= 0 ? ' ko' : ''))}<span class="pn">${esc(p.name)}${UI.statusIcons(p.st)}</span><span class="ph ${r < 0.25 ? 'low' : r < 0.5 ? 'mid' : ''}">${p.hp}<small>/${p.maxhp}</small></span><span class="pg">${bar(p.hp, p.maxhp, 'hp')}</span><span class="pmp">MP ${p.mp}</span></div>`; }).join('')}</div></div></div>`;
  ov.className = 'on';
  $('#stagehost').appendChild(BT.stage.canvas);
  const lg = $('#log'); if (lg) lg.scrollTop = lg.scrollHeight;
}
ACT.autotoggle = () => { if (!BT) return; BT.auto = !BT.auto; toast(BT.auto ? '⏩ Auto-battle on' : 'Auto-battle off', 1400); renderBattle(); };
const toggleLog = () => { if (!BT) return; BT.logBig = !BT.logBig; renderBattle(); };
ACT.logsize = toggleLog;
ov.addEventListener('click', (e) => { const t = e.target.closest('[data-tap]'); if (t) ACT[t.dataset.tap]?.(); });
addEventListener('keydown', (e) => { if (BT && (e.key === 'l' || e.key === 'L') && !e.ctrlKey && !e.metaKey) toggleLog(); });
function playFx(list) {
  let delay = 0;
  for (const e of list) {
    setTimeout(() => BT?.stage?.event(e), delay);
    if (e.t === 'cast') {
      const k = e.kind === 'heal' ? 'heal' : e.kind === 'buff' ? (e.hostile ? 'debuff' : 'buff') : (e.elem && e.elem !== 'random' ? e.elem : 'swing');
      setTimeout(() => sfx(k), delay); delay += 170;
    } else if (e.t === 'hit') {
      const el = ov.querySelector(`[data-n="${e.name}"]`); if (el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
      setTimeout(() => { sfx(e.weak ? 'crit' : 'hit'); if (e.ko) setTimeout(() => sfx('ko'), 140); }, delay); delay += 110;
    } else if (e.t === 'poison') setTimeout(() => sfx('poison'), delay);
    else if (e.t === 'guard') { setTimeout(() => sfx('buff'), delay); delay += 90; if (e.wind) (G.stats ||= { wins: 0 }).braces = (G.stats.braces || 0) + 1; } // shields go up in a quick run; a Guard while a boss winds up counts for the feats
    else if (e.t === 'charge') { setTimeout(() => sfx('debuff'), delay); delay += 250; }
    else if (e.t === 'stagger') { setTimeout(() => { sfx('crit'); setTimeout(() => sfx('hit'), 120); }, delay); delay += 300; (G.stats ||= { wins: 0 }).staggers = (G.stats.staggers || 0) + 1; if (BT) BT.stag = (BT.stag || 0) + 1; }
    else if (e.t === 'phase') { setTimeout(() => sfx('dark'), delay); delay += 300; }
  }
}
// Bro Combos: the first brother asked can team up with the other while he still stands and has not been asked yet
const comboPartner = (p) => { const b = BT.b, bro = (x) => BROS.some(([, l]) => l === x.ch.look); if (!bro(p)) return null; const q = b.p.find((x) => x !== p && bro(x)); return q && q.hp > 0 && !q.st.stun && b.p.indexOf(q) > b.p.indexOf(p) ? q : null; };
const combosKnown = () => COMBOS.filter((c) => cond(c.if));
// a line of banter after a fight (QUIPS in data.js), from someone actually in the party
const recentQuips = [];
function quip(kind, chance) {
  const pool = (DATA.QUIPS?.[kind] || []).filter(([who]) => G.party.some((c) => c.look === who)); if (!pool.length || Math.random() > chance) return '';
  const fresh = pool.filter(([, t]) => !recentQuips.includes(t)), [who, t] = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length || pool.length))], c = G.party.find((x) => x.look === who);
  recentQuips.push(t); if (recentQuips.length > 12) recentQuips.shift(); // no repeats for a good while
  return `<span class="quip">${esc(c.name)}: “${esc(t)}”</span>`;
}
function cmdHtml(a) {
  const p = a.p, c = p.ch, head = `<div class="cmdhead">${portrait(ak(c), 'sm')}${esc(p.name)}</div>`, back = btn('c', `${ic('back')}BACK`, 'root');
  if (a.stage === 'root') return `${head}<div class="cmdlist">${btn('c', `${ic('fight')}FIGHT`, 'attack')}${btn('c', `${ic('skill')}SKILL`, 'skills')}${btn('c', `${ic('item')}ITEM`, 'item', '', '', !!G.rules?.dry)}${btn('c', `${ic('guard')}GUARD`, 'defend')}${comboPartner(p) && combosKnown().length ? btn('c', `${ic('spark')}COMBO`, 'combos') : ''}${veteran() ? `${btn('c', `${ic('repeat')}REPEAT`, 'repeat', '', '', !BT.last.has(p.name))}${btn('c', `${ic('auto')}AUTO`, 'auto')}` : ''}${btn('c', `${ic('run')}RUN`, 'flee', '', '', BT.b.boss)}</div>`;
  if (a.stage === 'skills') {
    return `${head}<div class="cmdlist">` + [0, 1, 2, 3, SIG].map((i) => {
      const sid = slotSkill(c, i); if (!sid) return '';
      const gems = slotGems(c, i), s = skillWithGems(sid, gems); s.mp = L.mpCost(p, s);
      return btn('c', `<span class="sk">${ic(UI.skillIconName(s))}<b>${s.name}</b></span><small>${s.tags.length ? s.tags.join(' + ') + ' · ' : ''}${describeSkill(s)}</small>`, 'cast', i, 'two', p.mp < s.mp);
    }).join('') + `${back}</div>`;
  }
  if (a.stage === 'combos') {
    const q = comboPartner(p);
    return `${head}<div class="cmdlist">` + combosKnown().map((k) => { const s = SKILLS[k.id], m1 = L.mpCost(p, s), m2 = L.mpCost(q, s);
      return btn('c', `<span class="sk">${ic(UI.skillIconName({ ...s, fx: s.fx || [] }))}<b>${s.name}</b></span><small>${m1}+${m2} MP · ${k.desc}</small>`, 'combo', k.id, 'two combo', p.mp < m1 || q.mp < m2); }).join('') + `${back}</div>`;
  }
  if (a.stage === 'item') {
    const its = Object.entries(G.inv.items).filter(([, n]) => n > 0);
    return `${head}<div class="cmdlist">` + (its.map(([id, n]) => btn('c', `<span class="sk">${itemIc('items', id)}<b>${ITEMS[id].name} <em>×${n}</em></b></span><small>${ITEMS[id].desc}</small>`, 'useitem', id, 'two')).join('') || '<div class="dim">No items.</div>') + `${back}</div>`;
  }
  // target: pick from a list of names, like the original
  const list = a.tside === 'e' ? BT.b.e.map((e, i) => (e.hp > 0 ? btn('tgt', `<span class="tgtname">${e.name}</span>${e.weak.length ? `<span class="tw">${e.weak.map((w) => UI.elemIcon(w)).join('')}</span>` : ''}<i>${e.hp}</i>`, 'e', i) : '')) : BT.b.p.map((x, i) => btn('tgt', `${portrait(ak(x.ch), 'sm' + (x.hp > 0 ? '' : ' ko'))}<span class="tgtname">&nbsp;${esc(x.name)}</span><i>${x.hp > 0 ? x.hp : 'KO'}</i>`, 'p', i));
  return `${head}<div class="cmdlist"><div class="dim">${a.tside === 'e' ? 'ATTACK WHICH?' : 'WHO?'}</div>${list.join('')}${back}</div>`;
}
function autoCommand(p) { // reuse the hero's last move with sensible targets; fall back to a basic attack
  const b = BT.b, last = BT.last.get(p.name), foes = b.e.filter((x) => x.hp > 0), friends = b.p.filter((x) => x.hp > 0);
  if (foes.some((x) => x.charge && x.charge.dmg < x.charge.need) && p.hp < p.maxhp * 0.7) return { kind: 'defend' }; // a boss is winding up a big one: the hurt ones brace
  let cmd = last && last.kind === 'skill' && L.mpCost(p, skillWithGems(last.skillId, last.gems)) <= p.mp ? { ...last } : { kind: 'skill', skillId: 'attack', gems: [] };
  const s = skillWithGems(cmd.skillId, cmd.gems);
  if (s.tgt === 'one') cmd.target = foes.sort((x, y) => x.hp - y.hp)[0];
  else if (s.tgt === 'ally') cmd.target = s.fx.includes('revive') ? b.p.find((x) => x.hp <= 0) || p : friends.sort((x, y) => x.hp / x.maxhp - y.hp / y.maxhp)[0];
  return cmd;
}
function askCommand(p) {
  if (BT.auto) { BT.stage.setActive(p.name); return Promise.resolve(autoCommand(p)); }
  BT.stage.setActive(p.name);
  return new Promise((resolve) => { BT.ask = { p, stage: 'root', resolve, pending: null }; renderBattle(); });
}
ACT.c = (what, x) => {
  if (!BT?.ask) return; // a fast double-tap can land between two prompts
  const a = BT.ask, p = a.p;
  const finish = (cmd) => { BT.ask = null; if (cmd.kind === 'skill') BT.last.set(p.name, { kind: 'skill', skillId: cmd.skillId, gems: cmd.gems }); a.resolve(cmd); };
  const toTarget = (side, pending) => { a.stage = 'target'; a.tside = side; a.pending = pending; };
  const castDirect = (sid, gems) => {
    const s = skillWithGems(sid, gems), cmd = { kind: 'skill', skillId: sid, gems };
    if (s.tgt === 'one') toTarget('e', cmd); else if (s.tgt === 'ally') toTarget('p', cmd); else finish(cmd);
  };
  if (what === 'root') a.stage = 'root';
  else if (what === 'skills') a.stage = 'skills';
  else if (what === 'item') { if (G.rules?.dry) return toast('Dry January: no items in battle.', 1600); a.stage = 'item'; }
  else if (what === 'combos') a.stage = 'combos';
  else if (what === 'combo') { const s = SKILLS[x], cmd = { kind: 'combo', skillId: x, partner: comboPartner(p) }; if (!cmd.partner) a.stage = 'root'; else if (s.tgt === 'one') toTarget('e', cmd); else finish(cmd); }
  else if (what === 'defend') return finish({ kind: 'defend' });
  else if (what === 'flee') return finish({ kind: 'flee' });
  else if (what === 'attack') castDirect('attack', []);
  else if (what === 'repeat') return finish(autoCommand(p));
  else if (what === 'auto') { BT.auto = true; toast('⏩ Auto-battle on. Tap Auto in the corner to stop.', 2600); return finish(autoCommand(p)); }
  else if (what === 'cast') { const i = +x; castDirect(slotSkill(p.ch, i), slotGems(p.ch, i)); }
  else if (what === 'useitem') toTarget('p', { kind: 'item', item: x });
  if (BT.ask === a) renderBattle();
};
ACT.tgt = (side, i) => {
  if (!BT?.ask || BT.ask.stage !== 'target') return;
  const a = BT.ask, t = (side === 'e' ? BT.b.e : BT.b.p)[+i], cmd = { ...a.pending, target: t };
  if (cmd.kind === 'item') { G.inv.items[cmd.item]--; countUse(cmd.item); }
  BT.ask = null; if (cmd.kind === 'skill') BT.last.set(a.p.name, { kind: 'skill', skillId: cmd.skillId, gems: cmd.gems }); a.resolve(cmd);
};
async function victory(b, bossId) {
  music('victory');
  const r = rewards(b); G.gold += r.gold; (G.stats ||= { wins: 0 }).wins++;
  const lines = [];
  if (BT?.stag) lines.push(`<b class="gold">★ Staggered ${BT.stag} wind-up${BT.stag > 1 ? 's' : ''}</b>`); // the fight's skill, told once
  let lvSfx = false;
  for (const { c, exp, ups, learned } of L.awardExp(G.party, r.exp)) { // KO'd heroes get a half share (L.KO_EXP_SHARE)
    if (c.hp <= 0 && exp) lines.push(`<span class="dim">${esc(c.name)} (KO) gains half EXP: +${exp}</span>`);
    if (!ups.length) continue;
    if (tipOnce('levelup')) lines.push('💡 New skills unlock as heroes level up. Check the build screen for empty skill slots.');
    lvSfx = true; autofill(c);
    lines.push(`🎉 ${esc(c.name)} reached level ${ups.at(-1)}!${ups.length > 1 ? ` (+${ups.length} levels)` : ''}${learned.length ? ` Learned <b>${learned.map((id) => SKILLS[id].name).join(', ')}</b>.` : ''}`);
    for (const lv of ups) if (L.LEVEL_PERKS[lv]) lines.push(`⭐ ${esc(c.name)} unlocked <b>${L.LEVEL_PERKS[lv]}</b>.`);
  }
  const cpGot = new Map(); // Calling Points: standing heroes only; each rank teaches the next ability of the calling
  for (const { c, cp, ranks } of L.awardCP(G.party, r.cp)) {
    cpGot.set(c, cp); if (ranks.length) { lvSfx = true; autofill(c); }
    for (const k of ranks) { const got = [...k.skills.map((id) => SKILLS[id].name), ...(k.trait ? [TRAITS[k.trait].name] : [])]; if (!got.length && !k.mastered && k.job === 'bloke') continue;
      lines.push(`✦ Rank up! ${esc(c.name)}: ${JOBS[k.job].name} ${k.rank}${got.length ? ` — learned <b>${got.join(', ')}</b>` : ''}${k.mastered ? ' <b class="gold">★ Mastered</b>' : ''}`); }
  }
  if (lvSfx) setTimeout(() => sfx('levelup'), 1400);
  for (const d of r.drops) {
    if (d.kind === 'items') G.inv.items[d.id] = (G.inv.items[d.id] || 0) + 1; else G.inv[d.kind].push(d.id);
    const name = lootName(d.kind, d.id), from = ENEMIES[d.from]?.name;
    lines.push(d.rare ? `<b class="gold">★ RARE: ${name}!</b>${from ? ` <span class="dim">(${esc(from)})</span>` : ''}` : `Got ${name}!`);
    if (d.from) ((G.flags.bestiary[d.from] ||= { seen: 1, kills: 0 }).got ||= {})[d.id] = true;
  }
  if (r.drops.some((d) => d.rare)) setTimeout(() => sfx('chest'), 900);
  for (const e of b.e) for (const [id, q] of Object.entries(QUESTS)) if (qstate(id) === 'active' && q.goal.type === 'kill' && q.goal.ids.includes(e.id)) G.flags.qprog[id] = Math.min(q.goal.n, (G.flags.qprog[id] || 0) + 1);
  const def = bossId ? BOSSES[bossId] : null, open0 = batchesOpen(); let awake = null;
  if (def) {
    G.flags.bosses[bossId] = true; const names = [];
    for (const k of ['weapons', 'armors', 'accs', 'gems']) for (const id of def.loot[k] || []) { G.inv[k].push(id); names.push(lootName(k, id)); }
    if (names.length) lines.push(`Found <b class="gold">${names.join(', ')}</b>!`);
    if (def.heart) { G.flags.qitems[def.heart] = true; lines.push(`Obtained the <b class="gold">${KEY_ITEMS[def.heart]}</b>.`);
      const gems = !gemsOn(); if (gems) G.flags.story.gems = true; // the first heart wakes the dull stones too (told in the awakening)
      if (batchesOpen() > open0) awake = { heart: def.heart, jobs: CALLING_BATCHES[batchesOpen() - 1], gems: gems ? (G.inv.gems.length ? 'stones' : 'call') : '' };
      else if (gems) lines.push(G.inv.gems.length ? 'The heart pulses. The dull stones in your pack wake with it: they were gems all along.' : 'The heart pulses, as if calling to stones like itself.'); }
  }
  if (bossId) G.flags.bosses[bossId] = true;
  S.miniDirty = true;
  for (const e of b.e) { const r2 = (G.flags.bestiary[e.id] ||= { seen: 1, kills: 0 }); r2.kills++; }
  if (G.party.some((c) => c.hp > 0 && c.hp < maxOf(c).hp * 0.35) && tipOnce('rest')) lines.push('💡 Low on HP? Inns heal the whole party and save your game. Pints work from the Items menu.');
  questLog(lines);
  const q = quip(bossId ? 'boss' : b.p.some((x) => x.hp <= 0 || x.hp < x.maxhp * 0.25) ? 'close' : 'win', bossId ? 1 : 0.4); if (q) lines.push(q);
  await new Promise((res) => {
    const vp = G.party.map((c) => { const n = expNeeded(c.level), mx = c.level >= L.MAX_LEVEL; return `<div class="vp">${portrait(ak(c), 'sm' + (c.hp <= 0 ? ' ko' : ''))}<div class="vi"><div>${esc(c.name)} <span class="gold">LV ${c.level}</span></div>${bar(mx ? 1 : c.exp, mx ? 1 : n, 'xp')}<div class="cpg">${cpGot.get(c) ? `+${cpGot.get(c)} CP` : '<span class="dim">no CP</span>'} ${stars(c, c.main)}</div></div></div>`; }).join('');
    ov.innerHTML = `<div class="win gold anim"><div class="vhead">${ic('trophy')}<h2>${def ? esc(def.name) + ' is slain!' : VICTORY[Math.floor(Math.random() * VICTORY.length)]}</h2>${ic('trophy')}</div><div class="spoils"><span>${ic('star')}+${r.exp} EXP</span><span class="gold">${ic('coin')}+${r.gold} G</span></div><div class="vparty">${vp}</div><div class="vlines">${lines.map((l) => `<div>${UI.deco(l)}</div>`).join('')}</div><div class="foot">${btn('vdone', 'Continue', '', '', 'primary')}</div></div>`;
    ACT.vdone = () => { hide(); res(); };
  });
  if (bossId === 'big_gary') { G.flags.story.cellar = true; joinLocal('brenna'); }
  if (bossId && STORY.after[bossId]) { await scene(STORY.after[bossId]); autosave(); } // aftermath: what the evil left behind, and who was watching
  if (bossId === 'wyrm' && !G.flags.story.buspass) { // the Elder's thank-you: a fast-travel pass
    G.flags.story.buspass = true;
    await scene([{ s: 'elder', t: 'Take this, heroes. A Night Bus pass: the N9, which runs to every place you have set foot in. Do not ask who drives. Nobody has ever asked who drives.' }, { s: 'devon', t: 'Bro. A bus pass. In a fantasy world.' }, { s: 'adam', t: 'Use it from the menu, Items. It only stops where we have already been. And not in dungeons, so we ride it from outside.' }, { s: 'n', t: 'Got the Night Bus Pass! (Menu, Items.)' }]); autosave();
  }
  if (awake) await awakening(awake);
  if (def?.final) await ending();
}
// The heart-gem wakes a new batch of callings (FF5's crystal shards): echoes of past heroes, then their callings are yours.
function awakening({ heart, jobs, gems }) {
  music('victory'); setTimeout(() => sfx('holy'), 350);
  const echo = jobs.map((j, k) => `<div class="echo" style="animation-delay:${0.5 + k * 0.45}s"><img src="${SP.heroURL(j)}" alt=""><b>${JOBS[j].name}</b><small>${JOBS[j].weapons.map((w) => ic(UI.gearIconName('weapons', { type: w }))).join('')}</small></div>`).join('');
  const gemLine = gems === 'stones' ? '<p class="lore">The dull stones in your pack answer it. They were gems all along.</p>' : gems === 'call' ? '<p class="lore">It hums, as if calling to stones like itself.</p>' : '';
  return new Promise((res) => {
    show(`<h2>The ${esc(KEY_ITEMS[heart].replace(/ Heart$/, ''))} Heart wakes</h2><div class="heartgem"><img src="${SP.gemIcon(HEART_GEM[heart] || 'fire', 6)}" alt=""></div>
    <p class="lore">It beats once in your hands. In its light stand heroes of an older age, who answered the bell before you.</p>${gemLine}
    <h3 class="awh">New callings awaken</h3><div class="echoes">${echo}</div>
    <div class="foot">${btn('awdone', 'Continue', '', '', 'primary', false, 'autofocus')}</div>`, '', 'lorewin awakewin');
    ACT.awdone = () => { hide(); res(); };
  });
}
const epilogueOf = (c) => { const e = STORY.epilogue[c.look] ?? STORY.epilogue[c.main]; return (typeof e === 'string' ? e : e?.[c.main] || e?.default) || '{n} went home.'; };
let ngPending = false, pendingRules = {};
// House rules for a New Game+ run: tick any you like (each pays a bonus to EXP and gold), or none for the plain run
function rulesScreen() {
  const n = (G.ngp || 0) + 1;
  show(`<h2>🍺 House rules</h2><p class="dim">New Game+${n}: pick any rules for this run. Each pays extra EXP and gold. None is fine too.</p>${Object.entries(RULES).map(([k, r]) => `<div class="slot ${pendingRules[k] ? 'sel' : ''}"><span class="lead">${ic(pendingRules[k] ? 'check' : 'socket')}</span><div class="t"><b>${r.name} <span class="gold">+${Math.round(r.bonus * 100)}%</span></b><small>${r.desc}</small></div>${btn('ruletog', pendingRules[k] ? 'On' : 'Off', k, '', pendingRules[k] ? 'primary' : '')}</div>`).join('')}<div class="foot">${btn('rulesgo', `Begin New Game+${n}`, '', '', 'primary')}</div>`);
}
ACT.ruletog = (k) => { pendingRules[k] = !pendingRules[k]; rulesScreen(); };
ACT.rulesgo = () => { const r = Object.fromEntries(Object.keys(RULES).filter((k) => pendingRules[k]).map((k) => [k, true])); pendingRules = {}; hide(); newGamePlus(r); };
const ruleBonus = () => Object.keys(RULES).reduce((m, k) => m * (G.rules?.[k] ? 1 + RULES[k].bonus : 1), 1);
// New Game+: the bell rings again. Party, gear and gold carry over; the world, its bosses and quests reset and hit back harder (each loop: foes +40% HP, +20% damage).
function newGamePlus(rules = {}) {
  const keep = G.flags.qitems || {}, hearts = Object.fromEntries(Object.keys(KEY_ITEMS).filter((k) => keep[k]).map((k) => [k, true]));
  const prev = G; diag('new game plus'); newGame(); const n = Math.min(5, (prev.ngp || 0) + 1);
  Object.assign(G, { party: prev.party, inv: prev.inv, gold: prev.gold, difficulty: prev.difficulty, slot: prev.slot, playtime: prev.playtime, stats: prev.stats, ngp: n, rules });
  for (const c of G.party) { const st = maxOf(c); c.hp = st.hp; c.mp = st.mp; c.ko = false; }
  Object.assign(G.flags.story, { woke: true, cellar: true, called: true, wendell: true, brenna: true }); G.flags.qitems = hearts; G.flags.visited.haven = true; G.flags.worldv = WORLD_V;
  G.flags.bestiary = prev.flags.bestiary || {}; G.flags.tips = prev.flags.tips || {}; G.flags.feats = prev.flags.feats || {}; if (prev.flags.story.beastTier) G.flags.story.beastTier = prev.flags.story.beastTier; // what you have learned about the monsters, and the Goose's rewards, carry over
  goto('haven', ...MAPS.haven.spots.bell); autosave(); music(musicFor());
  scene([{ s: 'elder', t: 'You again. The bell is ringing. Properly, this time. Everything you beat has come back, and it is cross about it.' }, { s: 'devon', t: 'Bro. New Game Plus. We keep the beards.' }, { s: 'adam', t: 'We keep the gear too. Everything else is angrier.' }]);
}
async function ending() {
  if (STORY.finale) { goto('haven', ...MAPS.haven.spots.bell); await sleep(600); await scene(STORY.finale); } // the bell rings for them in Haven: back to The Bell & Anvil, two minutes after they left
  music('ending'); G.flags.story.ended = true;
  const left = ['wyrm', 'lich'].filter((k) => !G.flags.bosses[k]).map((k) => BOSSES[k].name);
  const quests = Object.keys(QUESTS).filter((id) => qstate(id) === 'done').length, gemsOn = G.party.reduce((n, c) => n + gemsUsed(c), 0);
  const roll = [
    ['BEARDED BROS', 'h'], ['and the Bell of Gemforge', ''], ['', ''], ['AFTERWARD', 'h'],
    [left.length ? 'Two hearts sleep in the old bell of Haven. The third is still out in the marsh.' : 'Ember, Grave and Rime: the three hearts sleep in the old bell of Haven, and it rings only for those who answer.', ''],
    ...G.party.map((c) => [esc(epilogueOf(c)).replace(/\{n\}/g, esc(c.name)), '']),
    ['Of Sereth, only the grey stone remains. No smith has dared to set it.', ''], ['', ''], ['THE HEROES', 'h'], ...G.party.map((c) => [`${esc(c.name)}: ${JOBS[c.main].name}${c.sub ? ' / ' + JOBS[c.sub].name : ''}, Lv ${c.level}`, '']), ['', ''],
    ['YOUR JOURNEY', 'h'], [`Time played: ${fmtTime(G.playtime)}`, ''], [`Battles won: ${G.stats?.wins || 0}`, ''], [`Side quests completed: ${quests}/${Object.keys(QUESTS).length}`, ''], [`Gems socketed: ${gemsOn}`, ''], [`Feats earned: ${(unlockFeats(), FEATS.filter((f) => G.flags.feats[f.id]).length)}/${FEATS.length}`, ''], [`Creatures defeated: ${beastDone()}/${Object.keys(ENEMIES).length}`, ''], [`Great evils slain: ${3 - left.length}/3`, ''], ['', ''],
    ['MADE WITH', 'h'], ['Claude Code', ''], ['every sprite, tile and song', ''], ['was drawn or composed in code', ''], ['', ''], ['THANK YOU FOR PLAYING', 'h'],
  ];
  await new Promise((res) => {
    show(`<h2>🍻 Last orders</h2>${pubImg('return')}
    <div class="credits"><div class="roll">${roll.map(([t, k]) => `<div class="${k}">${t || '&nbsp;'}</div>`).join('')}</div></div>
    ${left.length ? `<p class="dim">Still sleeping: ${left.join(', ')}. The bell is waiting.</p>` : `<p class="gold">The bell of Haven rings for ${esc(partyNames())}.</p>`}<div class="foot">${btn('edone', 'Keep exploring', '', '', 'primary')}${(G.ngp || 0) < 5 ? btn('ngplus', ngPending ? 'Tap again: New Game+' : 'New Game+') : ''}</div>`, '', 'gold');
    ACT.edone = () => { ngPending = false; hide(); music(musicFor()); res(); };
    ACT.ngplus = () => { if (!ngPending) { ngPending = true; banner('New Game+: keep your party and gear, the world hits back harder. Tap again.'); return; } ngPending = false; res(); rulesScreen(); };
  });
}
function wipeHome() { // where a wipe wakes you: the nearest town you have visited on the same landmass as where you fell (a dungeon counts as its door on the overworld)
  let wx = null, wy = null;
  if (G.map === 'world') { wx = G.x; wy = G.y; }
  else if (MAPS[G.map]?.kind === 'town') return { map: G.map, x: MAPS[G.map].spawn.x, y: MAPS[G.map].spawn.y, name: MAPS[G.map].name };
  else { const hit = Object.entries(MAPS.world.portals).find(([, p]) => p.to === G.map); if (hit) [wx, wy] = hit[0].split(',').map(Number); }
  const towns = { haven: 'haven', frostholm: 'frost', mirewood: 'mirewood', hopsend: 'hopsend', kilnhaven: 'kilnhaven' };
  const zone = (x, y) => (x <= 41 && y >= 64 ? 'h' : x <= 42 && y <= 42 ? 'k' : 'm'); // Hopsend Isle, Cinder Isle, the mainland
  let best = null;
  for (const [id, poi] of Object.entries(towns)) {
    if (id !== 'haven' && !G.flags.visited[id]) continue; const [px, py] = GEN.pois[poi];
    if (wx != null && zone(px, py) !== zone(wx, wy)) continue;
    const d = wx == null ? 0 : Math.hypot(px - wx, py - wy); if (!best || d < best.d) best = { d, id };
  }
  if (!best || best.id === 'haven') return { map: 'haven', x: MAPS.haven.spots.respawn[0], y: MAPS.haven.spots.respawn[1], name: 'the Goose' };
  return { map: best.id, x: MAPS[best.id].spawn.x, y: MAPS[best.id].spawn.y, name: MAPS[best.id].name };
}
async function defeat() {
  let HOME = null; (G.stats ||= { wins: 0 }).wipes = (G.stats.wipes || 0) + 1;
  music('gameover');
  await new Promise((res) => {
    ov.innerHTML = `<div class="win red anim"><div class="vhead">${ic('ko')}<h2 class="bad">${DEFEAT[Math.floor(Math.random() * DEFEAT.length)]}</h2>${ic('ko')}</div><div class="vparty">${G.party.map((c) => `<div class="vp">${portrait(ak(c), 'sm ko')}<div class="vi">${esc(c.name)}</div></div>`).join('')}</div><p>You wake up outside ${(HOME = wipeHome()).map === 'haven' ? 'the Goose' : esc(HOME.name)} with a banging headache. Half your gold is gone. Nobody will say where.</p><div class="foot">${btn('ddone', 'Wake up', '', '', 'primary')}</div></div>`;
    ACT.ddone = () => { G.gold = Math.floor(G.gold / 2); for (const c of G.party) { const s = maxOf(c); c.hp = s.hp; c.mp = s.mp; } const home = HOME || wipeHome(); goto(home.map, home.x, home.y); hide(); res(); };
  });
}

export { BT, awakening, battle, defeat, ending, fieldNote, foeStat, newGamePlus, roadAt, wipeHome };
