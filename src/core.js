// ===== Kernel: DOM handles, options, overlay windows (show/hide/btn), small shared helpers. Imports no other game module, so it evaluates first. =====
import * as L from './logic.js';
import * as SP from './sprites.js';
import * as UI from './uiart.js';
import { ACCS, ARMORS, GEMS, ITEMS, JOBS, SKILLS, WEAPONS, WEAPON_TYPES } from './data.js';
import { isMuted, setMuted, setVolumes, sfx } from './audio.js';
import { FX } from './stage.js';
import { UI_ZOOM } from './gamedata.js';
import { G } from './state.js';
export const hooks = { draw: () => {} }; // the map engine registers its draw() here: core cannot import the engine

const { stats, newChar, learnable, slotSkill, slotGems, gemCapacity, gemsUsed, sanitize, skillWithGems, describeSkill, gainExp, expNeeded, Battle, rewards, SIG, GEMS_PER_SLOT } = L;
const $ = (s) => document.querySelector(s);
const cv = $('#map'), cx = cv.getContext('2d'), ov = $('#overlay');
const SETTINGS = 'gemforge-settings-v2', TS = 32;
const root = document.documentElement;
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if (window.self !== window.top) root.classList.add('framed');
if (navigator.standalone || matchMedia('(display-mode: standalone)').matches) root.classList.add('standalone');
root.style.setProperty('--hand', `url(${SP.handURL()})`); UI.installUI();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const DB = { weapons: WEAPONS, armors: ARMORS, accs: ACCS, gems: GEMS, items: ITEMS };
// pacing: systems arrive one at a time instead of all on the first screen
const gemsOn = () => !!G?.flags?.story?.gems; // gems wake when the first great evil falls; until then they are dull stones
const lootName = (k, id) => (k === 'gems' && !gemsOn() ? 'Dull Stone' : DB[k][id].name);
const veteran = () => (G?.stats?.wins || 0) >= 10; // Repeat / Auto join the battle menu once the party has some fights behind it
// ---------- options (persisted separately from saves) ----------
const OPT = { music: 0.8, sfx: 0.9, speed: 'normal', text: 'normal', ui: 'normal', enc: 'normal', minimap: true, shake: !matchMedia('(prefers-reduced-motion: reduce)').matches };
try { Object.assign(OPT, JSON.parse(localStorage.getItem(SETTINGS) || '{}')); } catch {}
function applyOptions() { setVolumes(OPT.music, OPT.sfx); FX.shake = OPT.shake; document.documentElement.style.setProperty('--ui-zoom', UI_ZOOM[OPT.ui] || 1); try { localStorage.setItem(SETTINGS, JSON.stringify(OPT)); } catch {} }
applyOptions();
// ---------- overlay plumbing ----------
const ACT = {}, ACTIN = {};
let lastWinKey = '';
function show(html, cls = '', winCls = '') { // every window: emoji become pixel icons; the open animation only plays when the screen changes
  html = UI.deco(html);
  const key = `${cls}|${winCls}|${(html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || [])[1] || ''}`, anim = key !== lastWinKey || !inOverlay(); lastWinKey = key;
  ov.innerHTML = `<div class="win ${anim ? 'anim' : ''} ${winCls}">${html}</div>`; ov.className = 'on ' + cls; if (anim) ov.scrollTop = 0;
}
function closeGhost() { // a non-interactive copy of the windows folds shut while the real overlay is already gone
  if (!ov.classList.contains('on') || !ov.firstElementChild || ov.querySelector('.battle')) return;
  const g = document.createElement('div'); g.className = 'ghost'; g.style.background = getComputedStyle(ov).backgroundColor;
  for (const w of ov.querySelectorAll('.win:not(.multi), .win.multi .pane')) {
    const r = w.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) continue;
    const c = w.cloneNode(true); c.classList.remove('anim');
    c.querySelectorAll('[id],[data-act],[data-tap],[data-in]').forEach((e) => { e.removeAttribute('id'); delete e.dataset.act; delete e.dataset.tap; delete e.dataset.in; });
    const src = w.querySelectorAll('canvas'), dst = c.querySelectorAll('canvas'); src.forEach((cv0, k) => { try { dst[k].getContext('2d').drawImage(cv0, 0, 0); } catch {} });
    Object.assign(c.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: 0, maxWidth: 'none', overflow: 'hidden' });
    g.appendChild(c);
  }
  $('#app').appendChild(g); setTimeout(() => g.remove(), 160);
}
function hide() { closeGhost(); lastWinKey = ''; ov.className = ''; ov.innerHTML = ''; hooks.draw(); }
const inOverlay = () => ov.classList.contains('on');
ov.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  sfx(/^(close|bmain|leave|menu|ddone|vdone)$/.test(b.dataset.act) || b.dataset.a === 'root' ? 'back' : 'click');
  ACT[b.dataset.act]?.(b.dataset.a, b.dataset.b);
});
ov.addEventListener('input', (e) => { const el = e.target.closest('[data-in]'); if (el) ACTIN[el.dataset.in]?.(el.value, el); });
const btn = (act, label, a = '', b = '', cls = '', dis = false, af = '') => `<button class="${cls}" data-act="${act}" data-a="${a}" data-b="${b}" ${dis ? 'disabled' : ''}${af ? ' data-autofocus' : ''}>${label}</button>`;
const bar = (v, m, cls) => { const r = v / m, lvl = cls === 'hp' ? (r < 0.25 ? ' low' : r < 0.5 ? ' mid' : '') : ''; return `<div class="bar ${cls}${lvl}"><i style="width:${Math.max(0, Math.min(100, r * 100))}%"></i></div>`; };
const { ic } = UI, portrait = UI.face;
const akj = (c, job) => (c.look ? `${job}@${c.look}` : job);
const ak = (c) => (c.look ? `${c.main}@${c.look}` : c.main); // art key: calling outfit + the person wearing it (beards survive any calling)
const gemImg = (g) => `<img class="gi" src="${SP.gemIcon(g)}" width="20" height="20" alt="">`;
const itemIc = (k, id) => (k === 'gems' ? gemImg(id) : ic(UI.gearIconName(k, { ...DB[k][id], id })));
const coin = (n) => `<span class="price">${ic('coin')}${n}</span>`;
const heroBtn = (c, act = 'build', a = '', b = '') => { // portrait, name, job, level and HP/MP gauges: the party row used by every menu
  const s = maxOf(c), r = c.hp / s.hp;
  return btn(act, `${portrait(ak(c), c.hp <= 0 ? 'ko' : '')}<span class="hinfo"><span class="hn">${esc(c.name)}</span><span class="hl">LV ${c.level}</span><span class="hj">${JOBS[c.main].name}${c.sub ? ' / ' + JOBS[c.sub].name : ''}</span><span class="hh ${r < 0.25 ? 'low' : r < 0.5 ? 'mid' : ''}">HP <b>${c.hp}</b>/${s.hp}${bar(c.hp, s.hp, 'hp')}</span><span class="hm">MP <b>${c.mp}</b>/${s.mp}${bar(c.mp, s.mp || 1, 'mp')}</span></span>`, a === '' ? '' : a, b, 'hero');
};
const gemChip = (g, short = false) => `<span class="chip" title="${GEMS[g].desc}">${gemImg(g)}${short ? GEMS[g].name.replace(' Gem', '') : GEMS[g].name}</span>`;
const statLine = (s) => `<div class="stats">${['hp', 'mp', 'atk', 'def', 'mag', 'spd'].map((k) => `<span>${k.toUpperCase()} <b>${s[k]}</b></span>`).join('')}</div>`;
const gearLine = (g) => ['atk', 'mag', 'def', 'hp', 'mp', 'spd'].filter((k) => g[k]).map((k) => `${g[k] > 0 ? '+' : ''}${g[k]} ${k}`).concat(g.res ? g.res.map((r) => `resist ${r}`) : [], g.sockets ? [`${g.sockets}◇`] : [], g.innate ? [`innate ${GEMS[g.innate].name}`] : [], weaponTraits(g)).join(', ');
// weapon traits (see WEAPONS in data.js) as short tags, plus the flavour line for shop / equip lists
const weaponTraits = (g) => [g.elem && g.type ? `${UI.elemIcon(g.elem)} ${g.elem} attacks` : '', g.hits > 1 ? `${g.hits} hits/attack` : '', g.crit ? `crit +${Math.round(g.crit * 100)}%` : '', g.pierce ? `pierce ${Math.round(g.pierce * 100)}%` : '',
  g.proc ? `${Math.round(g.proc[1] * 100)}% ${g.proc[0]} on hit` : '', g.heal && g.type ? `heal +${Math.round(g.heal * 100)}%` : '', g.sig ? `skill: ${SKILLS[g.sig].name}` : ''].filter(Boolean);
const gearDesc = (k, d) => (k === 'weapons' ? `${WEAPON_TYPES[d.type].name} · ${gearLine(d)}` : gearLine(d)) + (d.desc ? `<br><i class="dim">${d.desc}</i>` : ''); // stats first, then the joke
const npcImg = (type, px = 48) => `<span class="face"><img src="${UI.npcFaceURL(type)}" width="${px}" height="${px}" alt=""></span>`;
let toastT = null;
function toast(msg, ms = 2200) { const t = $('#toast'); if (!t) return; t.innerHTML = UI.deco(esc(msg)); t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }
const TOUCH = matchMedia('(pointer:coarse)').matches;
const maxOf = (c) => stats(c);
function banner(text) { const b = $('#banner'); b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
const fmtTime = (sec = 0) => { sec = Math.floor(sec); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s2 = sec % 60; return `${h}:${String(m).padStart(2, '0')}:${String(s2).padStart(2, '0')}`; };
// ---------- diagnostics: Options > Report a problem copies the game state and the last things that happened ----------
const DIAG = [], diag = (msg) => { DIAG.push(`${fmtTime(performance.now() / 1000)} ${msg}`); if (DIAG.length > 80) DIAG.shift(); };
const muteBtn = $('#mute'), syncMute = () => { muteBtn.innerHTML = ic(isMuted() ? 'mute' : 'sound'); };
muteBtn.addEventListener('click', () => { setMuted(!isMuted()); syncMute(); if (!isMuted()) sfx('click'); });
syncMute();

export { $, ACT, ACTIN, Battle, DB, DIAG, GEMS_PER_SLOT, IS_IOS, OPT, SIG, TOUCH, TS, ak, akj, applyOptions, banner, bar, btn, coin, cv, cx, describeSkill, diag, esc, expNeeded, fmtTime, gainExp, gearDesc, gemCapacity, gemChip, gemImg, gemsOn, gemsUsed, heroBtn, hide, ic, inOverlay, itemIc, learnable, lootName, maxOf, newChar, npcImg, ov, portrait, rewards, root, sanitize, show, skillWithGems, sleep, slotGems, slotSkill, statLine, stats, syncMute, toast, veteran };
