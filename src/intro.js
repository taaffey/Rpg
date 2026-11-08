// ===== Title, slots, difficulty, the prologue and choosing callings. =====
import { music, sfx } from './audio.js';
import { BRO_PICKS, REGION_NAME, STAT_KEYS } from './gamedata.js';
import { MAPS } from './maps.js';
import { DIFFICULTY, JOBS, SKILLS, WEAPON_TYPES } from './data.js';
import * as UI from './uiart.js';
import * as PA from './pubart.js';
import { CALLED_AFTER, PUB, WAKE } from './bros.js';
import * as L from './logic.js';
import { G, S, setG } from './state.js';
import { LIGHT_ARMOR, SLOT_IDS, SLOT_KEY, STARTER_JOBS, VERSION, anySave, autofill, autosave, loadSlot, newGame, readSlot, save } from './saves.js';
import { $, ACT, ak, akj, banner, bar, btn, esc, fmtTime, hide, ic, maxOf, ov, portrait, sanitize, show } from './core.js';
import { mapDef, musicFor, regionAt, snap } from './world.js';
import { scene } from './story.js';
// ---------- title / main menu ----------
function title() {
  setG(null); S.optBack = 'title'; const saved = anySave();
  show(`<div class="tagline">Two brothers. Two beards. One bell they really shouldn't have rung.</div>
  <div class="titlecmd">${btn('new', `${ic('star')}New Game`, '', '', saved ? '' : 'primary')}${btn('cont', `${ic('save')}Continue`, '', '', saved ? 'primary' : '', !saved, saved ? 'autofocus' : '')}${btn('opts', `${ic('options')}Options`)}</div>`, 'title'); // a returning player lands on Continue
  ov.insertAdjacentHTML('beforeend', `<div class="ver">v${VERSION} · made in code</div>`);
  $('#loc').textContent = ''; $('#gold').textContent = ''; music('title');
}
let slotMode = 'new', pendingSlot = null, pendingDel = null;
function slotScreen(mode) {
  slotMode = mode; const fmt = (ms) => new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  show(`<h2>${mode === 'new' ? '💾 New Game: pick a slot' : '💾 Continue'}</h2>${SLOT_IDS.map((i) => {
    const d = readSlot(i), g = d?.G;
    if (!g) return `<div class="slot"><span class="lead">${ic('save')}</span><div class="t"><b>Slot ${i}</b><small>Empty</small></div>${mode === 'new' ? btn('slotpick', 'Start here', i, '', 'primary') : '<span class="dim">—</span>'}</div>`;
    const where = g.map === 'world' ? (REGION_NAME[regionAt(g.x, g.y)] || 'Overworld') : MAPS[g.map]?.name || '?', bosses = ['wyrm', 'lich', 'titan'].filter((k) => g.flags?.bosses?.[k]).length;
    return `<div class="slot"><div class="t"><b>Slot ${i} <span class="chip tag">${DIFFICULTY[g.difficulty]?.name || 'Normal'}</span>${g.ngp ? ` <span class="chip tag">NG+${g.ngp}</span>` : ''}</b><div class="who">${(g.party || []).map((c) => `<span class="face" title="${esc(c.name)}"><img src="${UI.faceURL(ak(c))}" alt=""></span><small>${c.level}</small>`).join(' ')}</div><small>${ic('pin')} ${esc(where)}<br>${ic('trophy')} ${bosses}/3 evils slain · ${fmtTime(g.playtime)}<br>${fmt(d.savedAt)}</small></div>
      <div class="col">${btn('slotpick', mode === 'new' ? (pendingSlot === i ? 'Tap to overwrite' : 'Overwrite') : 'Load', i, '', mode === 'new' && pendingSlot !== i ? '' : 'primary')}${btn('slotdel', pendingDel === i ? 'Tap to delete' : 'Delete', i, '', pendingDel === i ? 'danger' : '')}</div></div>`;
  }).join('')}<div class="foot">${btn('title', 'Back')}</div>`);
}
ACT.new = () => { pendingSlot = pendingDel = null; slotScreen('new'); };
ACT.cont = () => { pendingSlot = pendingDel = null; slotScreen('load'); };
ACT.slotpick = (i) => {
  i = +i; pendingDel = null;
  if (slotMode === 'load') return loadSlot(i);
  if (readSlot(i) && pendingSlot !== i) { pendingSlot = i; return slotScreen('new'); } // overwriting needs a second tap
  pendingSlot = null; diffScreen(i);
};
ACT.slotdel = (i) => { i = +i; pendingSlot = null; if (pendingDel !== i) { pendingDel = i; return slotScreen(slotMode); } pendingDel = null; try { localStorage.removeItem(SLOT_KEY(i)); } catch {} if (!anySave() && slotMode === 'load') return title(); slotScreen(slotMode); };
function diffScreen(slot) {
  const icn = { easy: 'heal', normal: 'sword', hard: 'ko' };
  show(`<h2>⚔️ Choose difficulty</h2>${['normal', 'easy', 'hard'].map((k) => `<div class="slot"><span class="lead">${ic(icn[k])}</span><div class="t"><b>${DIFFICULTY[k].name}</b><small>${DIFFICULTY[k].desc}</small></div>${btn('diff', 'Select', slot, k, k === 'normal' ? 'primary' : '')}</div>`).join('')}<p class="dim">${ic('tip')} You can change this later in Options.</p><div class="foot">${btn('new', 'Back')}</div>`);
}
ACT.diff = (slot, d) => { newGame(); G.slot = +slot; G.difficulty = d; G.flags.visited.haven = true; snap(); prologue(0); };
// ---------- prologue: quiz night at The Bell & Anvil, 2026 (illustrations in pubart.js) ----------
const pubImg = (v) => { try { return `<img class="pubart" src="${PA.pubURL(v, 1)}" alt="">`; } catch { return ''; } };
function prologue(i) {
  if (i >= PUB.length) return ACT.crbegin();
  const [v, head, text] = PUB[i]; if (i === 0) music('pub'); // the tavern jig plays under the whole 2026 prologue, until the bell swallows them
  show(`<h2>${esc(head)}</h2>${pubImg(v)}<p class="lore">${esc(text)}</p><div class="foot">${btn('prolog', i < PUB.length - 1 ? 'Next' : 'Wake up', i + 1, '', 'primary', false, 'autofocus')}</div>`, '', 'lorewin');
  if (v === 'flash') sfx('levelup'); else if (v === 'ring') sfx('chest');
}
ACT.prolog = (i) => prologue(+i);
ACT.crbegin = () => { // into the past: Haven, a hay cart, a disappointed Elder
  G.flags.visited.haven = true; G.flags.story.woke = true;
  save(); snap(); music(musicFor()); hide(); banner(mapDef().name);
  scene(WAKE);
};
// ---------- choosing callings (after the cellar, at the Guild) ----------
let CR = [];
function creation(i) {
  const c = G.party[CR[i].at], job = CR[i].job, j = JOBS[job];
  const skills = j.skills.slice(0, 3).map(([sid, r]) => `${SKILLS[sid].name} <span class="dim">★${r}</span>`).join(' · ');
  show(`<h2>A calling for ${esc(c.name)} · ${i + 1} of ${CR.length}</h2>
  <div class="crhead">${portrait(akj(c, job), 'lg')}<div class="crname"><small>NAME</small><b>${esc(c.name)}</b></div></div>
  <h3>Calling</h3><div class="crjobs">${STARTER_JOBS.map((id) => btn('crjob', `${portrait(akj(c, id))}<span>${JOBS[id].name}</span>`, id, '', job === id ? 'sel' : '')).join('')}</div>
  <div class="card"><b>${j.name}</b><small>${j.desc}</small>
    <div class="crstats">${STAT_KEYS.map(([k, l]) => `<span>${l}</span>${bar(Math.round(j.mod[k] * 50), 100, 'xp')}`).join('')}</div>
    <small>Weapons: ${j.weapons.map((w) => WEAPON_TYPES[w]?.name || w).join(', ')}<br>Skills: ${skills}</small></div>
  <div class="foot">${i ? btn('crback', 'Back', '') : ''}${btn('crnext', i < CR.length - 1 ? 'Next' : 'Review', '', '', 'primary', false, 'autofocus')}</div>`, '', 'crwin');
  CR.i = i;
}
ACT.crjob = (id) => { CR[CR.i].job = id; creation(CR.i); };
ACT.crnext = () => { if (CR.i < CR.length - 1) creation(CR.i + 1); else review(); };
ACT.crback = () => { if (CR.i > 0) creation(CR.i - 1); };
function review() {
  show(`<h2>Proper jobs</h2><div class="crreview">${CR.map((h, i) => { const c = G.party[h.at]; return `<button data-act="credit" data-a="${i}" class="hero">${portrait(akj(c, h.job))}<span class="hinfo"><span class="hn">${esc(c.name)}</span><span class="hj">${JOBS[h.job].name}</span></span></button>`; }).join('')}</div>
  <p class="dim">Every battle deepens a calling, and what is learned stays learned. You can change callings at any time from the menu. Other callings are said to sleep in the hearts of Gemforge's evils.</p>
  <div class="foot">${btn('crback2', 'Back', '')}${btn('crdone', 'Sign here', '', '', 'primary', false, 'autofocus')}</div>`, '', 'crwin');
}
ACT.credit = (i) => creation(+i);
ACT.crback2 = () => creation(CR.length - 1);
ACT.crdone = async () => {
  for (const h of CR) { const c = G.party[h.at]; L.setCalling(c, h.job); delete c.cp.bloke; if (LIGHT_ARMOR.has(h.job) && c.armor === 'leather') c.armor = 'cloth'; sanitize(c, G.inv); autofill(c); const st = maxOf(c); c.hp = st.hp; c.mp = st.mp; }
  G.flags.story.called = true; sfx('levelup'); hide(); autosave();
  await scene(CALLED_AFTER);
};
function chooseCallings() { // the bros (anyone still a 'bloke') pick from the first callings
  CR = G.party.map((c, at) => ({ at, c })).filter(({ c }) => c.main === 'bloke').map(({ at, c }) => ({ at, job: BRO_PICKS[c.look] || 'knight' }));
  if (!CR.length) { G.flags.story.called = true; return; }
  creation(0);
}

export { chooseCallings, diffScreen, pubImg, slotScreen, title };
