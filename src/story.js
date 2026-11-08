// ===== Story and dialogue: conditions, scenes, NPC talk, quests, the locals who join. =====
import { ITEMS, JOBS, QUESTS, STORY } from './data.js';
import { BROS, CALLED, LOCALS, WENDELL } from './bros.js';
import { music, sfx } from './audio.js';
import { CP_AT_LEVEL, QITEM, TEXT_MS } from './gamedata.js';
import { G } from './state.js';
import { $, ACT, OPT, ak, banner, btn, esc, gemsOn, hide, ic, lootName, maxOf, newChar, npcImg, ov, portrait, show, toast } from './core.js';
import { chartTheLand, goto } from './world.js';
import { guild, inn, shop, socketer } from './town.js';
import { chooseCallings, pubImg } from './intro.js';
import { autofill, autosave } from './saves.js';
// ---------- NPCs, dialogue, services ----------
const qstate = (id) => G.flags.quests[id];
function questDone(id) { const g = QUESTS[id].goal; return g.type === 'kill' ? (G.flags.qprog[id] || 0) >= g.n : g.type === 'find' ? !!G.flags.qitems[g.item] : g.type === 'deliver' ? (G.flags.qprog[id] || 0) >= 1 : !!G.flags.bosses[g.id]; }
function questProgress(id) { const g = QUESTS[id].goal; if (g.type === 'deliver') return G.flags.qprog[id] ? 'delivered' : `bring it to ${g.to}`; return g.type === 'kill' ? `${Math.min(G.flags.qprog[id] || 0, g.n)}/${g.n}` : g.type === 'find' ? (G.flags.qitems[g.item] ? 'found' : `find it in the ${g.where}`) : (G.flags.bosses[g.id] ? 'slain' : 'not yet slain'); }
// ---------- story: conditions, text fill-ins, reactive NPC lines, scenes (content in STORY / npc.textBy) ----------
function cond(c) { // 'wyrm !lich', 'v:frostholm', 's:met', 'q:slimes', 'wyrm|lich': see STORY in data.js
  return !c || c.split(' ').every((tok) => {
    const neg = tok[0] === '!', v = (neg ? tok.slice(1) : tok).split('|').some((a) => {
      const [k, x] = a.includes(':') ? a.split(':') : ['b', a];
      return k === 'b' ? !!G.flags.bosses[x] : k === 'v' ? !!G.flags.visited[x] : k === 's' ? !!G.flags.story[x] : k === 'q' ? qstate(x) === 'done' : k === 'p' ? G.party.some((c) => c.look === x) : false;
    });
    return neg ? !v : v;
  });
}
const partyNames = () => { const n = G.party.map((c) => c.name); return n.slice(0, -1).join(', ') + ' and ' + n.at(-1); };
const fill = (t) => String(t).replace(/\{all\}|\{(job)?(\d)\}/g, (m, j, i) => { if (m === '{all}') return partyNames(); const c = G.party[+i]; return !c ? '' : j ? JOBS[c.main].name : c.name; });
function npcLines(npc) { // npc.textBy: [[condition, lines], ...], first match wins ('@base' = npc.text); otherwise npc.text
  const v = npc.textBy?.find(([c]) => cond(c));
  return v ? { vid: v[0], lines: v[1].flatMap((l) => (l === '@base' ? npc.text || [] : [l])) } : { vid: '', lines: npc.text || [] };
}
let curNpc = null, curLines = [], curFinal = '', sayAt = 0, sceneDone = null;
const PEOPLE = new Set([...BROS.map(([, k]) => k), ...Object.keys(LOCALS)]); // scene speakers who are party members
function scene(sc) { // a short story scene in the dialogue window; resolves when it closes
  sc = Array.isArray(sc) ? { lines: sc } : sc;
  const lines = sc.lines.filter((l) => cond(l.if) && (!PEOPLE.has(l.s) || G.party.some((c) => c.look === l.s))); if (sc.set) G.flags.story[sc.set] = true; // lines by someone not (yet) in the party are skipped
  if (!lines.length) return Promise.resolve();
  return new Promise((res) => { sceneDone?.(); sceneDone = res; curNpc = null; curLines = lines; curFinal = btn('scend', 'Close', '', '', 'primary'); say(0); });
}
ACT.scend = () => { const r = sceneDone; sceneDone = null; hide(); r?.(); };
function speaker(l) { // a scene line's speaker: narration, a hero (by party slot) or one of STORY.cast
  if (!l.s || l.s === 'n') return { narr: true, name: '' };
  if (/^h\d$/.test(l.s)) { const c = G.party[+l.s[1]] || G.party[0]; return { name: c.name, job: ak(c) }; }
  const hero = G.party.find((c) => c.look === l.s); if (hero) return { name: hero.name, job: ak(hero) };
  const [name, type] = STORY.cast[l.s] || [l.s, 'villager']; return { name, type };
}
async function ferry(npc) { // a ferryman: free passage once the `need` boss is slain, with a short crossing scene
  if (npc.need && !G.flags.bosses[npc.need]) return talk({ ...npc, service: null, quest: null, textBy: null, text: npc.no });
  await scene((npc.go || []).map((t) => ({ s: 'n', t })).concat([{ s: 'n', t: 'The ferry chugs across the water...' }]));
  if (npc.to[0] === 'world') await chartTheLand();
  goto(...npc.to);
}
function talk(npc) {
  sfx('click');
  if (npc.service === 'ferry') return ferry(npc);
  if (npc.service === 'shop') return shop(npc.shop);
  if (npc.service === 'inn') return inn(npc);
  if (npc.service === 'guild') return guild();
  if (npc.service === 'socketer') return gemsOn() ? socketer() : talk({ ...npc, service: null, quest: null, textBy: null, text: ['Nothing in your pack worth cutting.', 'Come back when you carry a stone that hums.'] });
  if (npc.local === 'wendell' && G.party.length < 4 && G.flags.story.called) { joinLocal('wendell'); return scene(WENDELL); } // he joins first, so his own lines play
  const key = `${G.map}:${npc.x},${npc.y}`, { vid, lines } = npcLines(npc), news = vid && G.flags.talked[key] !== vid ? lines : []; // news: a new reactive line, told once before quest talk
  G.flags.talked[key] = vid || true; curNpc = npc;
  if (npc.deliver && qstate(npc.deliver) === 'active' && !questDone(npc.deliver)) { const q = QUESTS[npc.deliver]; curLines = q.lines.deliver; curFinal = btn('qdeliver', `Hand over: ${esc(QITEM[q.goal.item])}`, npc.deliver, '', 'primary'); return say(0); }
  if (!npc.quest) { curLines = lines; curFinal = btn('close', 'Close', '', '', 'primary'); return say(0); }
  const id = npc.quest, q = QUESTS[id], st = qstate(id);
  if (!st) { curLines = [...lines, ...q.lines.offer]; curFinal = btn('qaccept', `Accept: ${esc(q.title)}`, id, '', 'primary') + btn('close', 'Not now'); }
  else if (st === 'active' && questDone(id)) { curLines = q.lines.ready; curFinal = btn('qclaim', 'Claim reward', id, '', 'primary'); }
  else if (st === 'active') { curLines = [...news, ...q.lines.active, `(${q.title}: ${questProgress(id)})`]; curFinal = btn('close', 'Close', '', '', 'primary'); }
  else { curLines = [...news, ...q.lines.done]; curFinal = btn('close', 'Close', '', '', 'primary'); }
  say(0);
}
let typing = null, typingText = '';
function finishTyping() { // show the whole line and reveal the buttons
  if (!typing && !ov.querySelector('.sayrow.hidden')) return;
  clearInterval(typing); typing = null; const el = $('#tt'); if (el) el.textContent = typingText;
  const row = ov.querySelector('.sayrow'); if (row) { row.classList.remove('hidden'); row.querySelector('[data-act]')?.focus(); }
  ov.querySelector('.more')?.classList.add('on');
}
function say(i) {
  sayAt = i; const l = curLines[i], n = typeof l === 'string' ? curNpc : speaker(l), last = i >= curLines.length - 1; typingText = fill(typeof l === 'string' ? l : l.t);
  const face = n.narr ? '' : n.job ? portrait(n.job) : npcImg(n.type || 'villager');
  const art = typeof l === 'object' && l.art; if (l?.music) music(l.music); // a scene line can bring a picture (the pub, in the finale) and its music
  show(`${art ? pubImg(art) : ''}<div class="saybox${n.narr ? ' narr' : ''}" data-tap="sayadv">${face}<div class="saybody">${n.narr ? '' : `<div class="sayname">${esc(n.name)}</div>`}<div class="saytext"${n.narr ? ' style="color:#c8d4ff"' : ''}><span id="tt"></span><span class="more">▼</span></div></div></div><div class="sayrow hidden">${last ? curFinal : btn('say', 'NEXT', i + 1, '', 'primary')}</div>`, art ? 'say art' : 'say');
  let k = 0; clearInterval(typing);
  const ms = TEXT_MS[OPT.text] ?? 28; // Options > Text speed: fast for a second playthrough, instant for New Game+
  if (!ms) { typing = setInterval(() => {}, 1e6); return finishTyping(); }
  typing = setInterval(() => { k++; const el = $('#tt'); if (!el) return finishTyping(); el.textContent = typingText.slice(0, k); if (k % 3 === 0) sfx('blip'); if (k >= typingText.length) finishTyping(); }, ms);
}
ACT.skiptype = finishTyping;
ACT.sayadv = () => { // tap anywhere on the dialogue box: finish the line, then go on (only when there is a single way on, never a choice)
  if (typing) return finishTyping();
  const bs = [...ov.querySelectorAll('.sayrow [data-act]')]; if (bs.length === 1) bs[0].click();
};
ACT.say = (i) => say(+i);
ACT.qaccept = (id) => { const g = QUESTS[id].goal; G.flags.quests[id] = 'active'; G.flags.qprog[id] = 0; if (g.type === 'deliver') { G.flags.qitems[g.item] = true; toast(`📜 Received: ${QITEM[g.item]}`, 2600); } sfx('levelup'); hide(); banner(`Quest: ${QUESTS[id].title}`); };
ACT.qdeliver = (id) => { const g = QUESTS[id].goal; if (qstate(id) !== 'active' || g.type !== 'deliver') return; G.flags.qprog[id] = 1; G.flags.qitems[g.item] = false; ACT.qclaim(id); }; // the recipient pays
function giveReward(r) {
  const got = [];
  if (r.gold) { G.gold += r.gold; got.push(`${r.gold} G`); }
  if (r.flag) G.flags.story[r.flag] = true;
  for (const k of ['weapons', 'armors', 'accs', 'gems']) for (const id of r[k] || []) { G.inv[k].push(id); got.push(lootName(k, id)); }
  for (const [id, n] of Object.entries(r.items || {})) { G.inv.items[id] = (G.inv.items[id] || 0) + n; got.push(`${ITEMS[id].name} ×${n}`); }
  return got;
}
ACT.qclaim = (id) => {
  if (G.flags.quests[id] !== 'active' || !questDone(id)) return;
  G.flags.quests[id] = 'done'; sfx('levelup'); sfx('coin'); const got = giveReward(QUESTS[id].reward); autosave();
  show(`<h2>📜 Quest complete!</h2><div class="card done"><b>✔ ${esc(QUESTS[id].title)}</b></div><h3>Reward</h3>${got.map((g) => `<div class="slot"><span class="lead">${ic('chest')}</span><div class="t"><b class="gold">${g}</b></div></div>`).join('')}<div class="foot">${btn('close', 'Wonderful', '', '', 'primary')}</div>`, '', 'gold');
};
function questLog(lines = []) { // progress notes appended to the victory panel
  for (const [id, q] of Object.entries(QUESTS)) {
    if (qstate(id) !== 'active') continue;
    const g = q.goal;
    if (g.type === 'kill') lines.push(`📜 ${esc(q.title)}: ${questProgress(id)}${questDone(id) ? ' — return to ' + esc(q.giver) : ''}`);
    else if (g.type === 'boss' && questDone(id)) lines.push(`📜 ${esc(q.title)}: complete — return to ${esc(q.giver)}`);
  }
  return lines;
}
// ---------- the locals who join (Brenna after the cellar, Wendell at the Ashen Cavern) ----------
function joinLocal(id) {
  const d = LOCALS[id]; if (!d || G.party.some((c) => c.look === id) || G.party.length >= 4) return;
  const lv = Math.max(1, Math.round(G.party.reduce((n, c) => n + c.level, 0) / G.party.length));
  const c = Object.assign(newChar(d.name, d.job, null, d.weapon || null, d.armor, lv), { look: id });
  c.cp[d.job] = CP_AT_LEVEL[lv] || 0; autofill(c); const st = maxOf(c); c.hp = st.hp; c.mp = st.mp;
  G.party.push(c); G.flags.story[id] = true; sfx('levelup'); banner(`${d.name} joined the party!`);
}
async function arrive(id, first) { // story beats tied to entering a place
  if (id === 'haven_guild' && G.flags.story.cellar && !G.flags.story.called) { await scene(CALLED); return chooseCallings(); }
  if (id === 'cavern' && !G.flags.story.wendell && G.party.length < 4) { joinLocal('wendell'); await scene(WENDELL); }
  if (first && STORY.area[id]) await scene(STORY.area[id]); // a few lines the first time the party sets foot somewhere
}

export { PEOPLE, arrive, cond, curLines, fill, finishTyping, giveReward, joinLocal, npcLines, partyNames, qstate, questDone, questLog, questProgress, say, sayAt, scene, talk, typing };
