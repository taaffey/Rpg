// ===== Bearded Bros (and the Bell of Gemforge): UI, map, menus, battle flow =====
import { SOCKET_COST, DIFFICULTY, DROPS, STORY, KEY_ITEMS, TRAITS, CALLING_BATCHES } from './data.js';
import { JOBS, SKILLS, GEMS, WEAPONS, ARMORS, ACCS, ITEMS, WEAPON_TYPES, ENEMIES, ENCOUNTERS, ELEM_ICON, BOSSES, SHOPS, QUESTS } from './data.js';
import { MAPS, WALK } from './maps.js';
import * as L from './logic.js';
import { BROS, COMBOS, LOCALS, PARTY_SCALE, PHONE, PHONE_CHARGED, PUB, WAKE, CELLAR_IN, GARY_DOWN, CALLED, CALLED_AFTER, WENDELL } from './bros.js';
import * as SP from './sprites.js';
import * as TR from './terrain.js';
import * as TA from './townart.js';
import * as RA from './roomart.js';
import * as WK from './walkers.js';
import { Stage, FX } from './stage.js';
import * as UI from './uiart.js';
import * as PA from './pubart.js';
import * as DATA from './data.js'; // QUIZ, QUIPS (optional content)
import { music, sfx, unlock, isMuted, setMuted, setVolumes, setBackgrounded } from './audio.js';
const { stats, newChar, learnable, slotSkill, slotGems, gemCapacity, gemsUsed, sanitize, skillWithGems, describeSkill, gainExp, expNeeded, Battle, rewards, SIG, GEMS_PER_SLOT } = L;

const $ = (s) => document.querySelector(s);
const cv = $('#map'), cx = cv.getContext('2d'), ov = $('#overlay');
const SETTINGS = 'gemforge-settings-v2', TS = 32;
let VW = 16, VH = 12; // tiles visible: adapts to the screen (phone portrait / landscape / desktop)
let G = null;
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
const OPT = { music: 0.8, sfx: 0.9, speed: 'normal', minimap: true, shake: true };
try { Object.assign(OPT, JSON.parse(localStorage.getItem(SETTINGS) || '{}')); } catch {}
const SPEEDS = { slow: 820, normal: 560, fast: 300, instant: 110 };
function applyOptions() { setVolumes(OPT.music, OPT.sfx); FX.shake = OPT.shake; try { localStorage.setItem(SETTINGS, JSON.stringify(OPT)); } catch {} }
applyOptions();

// ---------- overlay plumbing ----------
const ACT = {}, ACTIN = {};
let lastWinKey = '';
function show(html, cls = '', winCls = '') { // every window: emoji become pixel icons; the open animation only plays when the screen changes
  html = UI.deco(html);
  const key = `${cls}|${winCls}|${(html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || [])[1] || ''}`, anim = key !== lastWinKey || !inOverlay(); lastWinKey = key;
  ov.innerHTML = `<div class="win ${anim ? 'anim' : ''} ${winCls}">${html}</div>`; ov.className = 'on ' + cls;
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
function hide() { closeGhost(); lastWinKey = ''; ov.className = ''; ov.innerHTML = ''; draw(); }
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
const weaponTraits = (g) => [g.elem ? `${UI.elemIcon(g.elem)} ${g.elem} attacks` : '', g.hits > 1 ? `${g.hits} hits/attack` : '', g.crit ? `crit +${Math.round(g.crit * 100)}%` : '', g.pierce ? `pierce ${Math.round(g.pierce * 100)}%` : '',
  g.proc ? `${Math.round(g.proc[1] * 100)}% ${g.proc[0]} on hit` : '', g.heal ? `heal +${Math.round(g.heal * 100)}%` : '', g.sig ? `skill: ${SKILLS[g.sig].name}` : ''].filter(Boolean);
const gearDesc = (k, d) => (k === 'weapons' ? `${WEAPON_TYPES[d.type].name} · ${gearLine(d)}` : gearLine(d)) + (d.desc ? `<br><i class="dim">${d.desc}</i>` : ''); // stats first, then the joke
const npcImg = (type, px = 48) => `<span class="face"><img src="${UI.npcFaceURL(type)}" width="${px}" height="${px}" alt=""></span>`;

// ---------- state ----------
// ---------- callings: the bros take one after the cellar, the locals bring their own; more are learned on the road ----------
// FF5-style: callings rank up with Calling Points (logic.js); new batches wake with each heart-gem held (data.js CALLING_BATCHES)
const STARTER_JOBS = CALLING_BATCHES[0];
const heartsHeld = (g = G) => Object.keys(KEY_ITEMS).filter((k) => g?.flags?.qitems?.[k]).length;
const batchesOpen = (g = G) => Math.min(CALLING_BATCHES.length, 1 + heartsHeld(g));
const unlockedJobs = () => { const on = new Set([...CALLING_BATCHES.slice(0, batchesOpen()).flat(), ...G.party.flatMap((c) => Object.keys(c.cp || {}))]); return Object.keys(JOBS).filter((j) => on.has(j)); };
const stars = (c, j) => { const r = L.rankOf(c, j); return `<span class="stars ${r >= L.MAX_RANK ? 'mastered' : ''}" title="Rank ${r}/${L.MAX_RANK}">${Array.from({ length: L.MAX_RANK }, (_, k) => `<i class="pip${k < r ? ' on' : ''}"></i>`).join('')}</span>`; }; // rank pips ◆◆◆◇◇◇
const traitName = (t) => (t ? TRAITS[t].name : '');
const DEFAULT_PARTY = BROS.map(([n, look]) => [n, 'bloke', look]); // two blokes from 2026; callings come after the Goose's cellar
const LIGHT_ARMOR = new Set(['mage', 'cleric', 'hexer', 'bard', 'alchemist']);
function newGame(party = DEFAULT_PARTY) {
  G = {
    // like FF1: the party starts at level 1, unarmed, with 400 G to arm itself at the Haven hardware shop (~205 G for the cheap weapons)
    party: party.map(([n, j, look]) => Object.assign(newChar(n, j, null, null, LIGHT_ARMOR.has(j) || j === 'bloke' ? 'cloth' : 'leather'), look ? { look } : {})),
    gold: 400, difficulty: 'normal', slot: 1,
    inv: { weapons: [], armors: [], accs: [], gems: [], items: { potion: 3 } },
    map: 'haven', x: 17, y: 30, flags: { chests: {}, bosses: {}, seen: {}, talked: {}, visited: {}, quests: {}, qprog: {}, qitems: {}, tips: {}, bestiary: {}, story: {}, chat: {} }, playtime: 0,
  };
}
// ---------- saves: 3 slots, autosave, migration ----------
const VERSION = '2.0.0', LEGACY_SAVE = 'gemforge-save-v2', SLOT_KEY = (i) => `gemforge-save-v3-${i}`, SLOT_IDS = [1, 2, 3];
function migrate(g) {
  g.v = 3; g.flags ||= {};
  for (const k of ['chests', 'bosses', 'seen', 'talked', 'visited', 'quests', 'qprog', 'qitems', 'tips', 'bestiary', 'story', 'chat']) g.flags[k] ||= {};
  g.playtime ||= 0; g.stats ||= { wins: 0 }; g.difficulty = DIFFICULTY[g.difficulty] ? g.difficulty : 'normal';
  for (const c of g.party) { c.extra ||= 0; c.gems ||= []; while (c.gems.length < 5) c.gems.push([]); }
  // old saves keep their gear; only ids that no longer exist are dropped (never a crash on load)
  g.inv ||= {}; for (const k of ['weapons', 'armors', 'accs', 'gems']) g.inv[k] = (g.inv[k] || []).filter((id) => DB[k][id]); g.inv.items ||= {};
  for (const id of Object.keys(g.inv.items)) if (!ITEMS[id]) delete g.inv.items[id];
  g.flags ||= {}; g.flags.story ||= {}; if (g.inv.gems.length || g.party.some((c) => c.gems.some((x) => x.length)) || Object.keys(g.flags.bosses || {}).length) g.flags.story.gems = true; // saves from before gems were paced keep them
  for (const [b, d] of Object.entries(BOSSES)) if (d.heart && g.flags.bosses[b]) g.flags.qitems[d.heart] = true; // hearts of evils slain before hearts existed
  for (const c of g.party) { if (c.weapon && !WEAPONS[c.weapon]) c.weapon = null; if (c.armor && !ARMORS[c.armor]) c.armor = null; if (c.acc && !ACCS[c.acc]) c.acc = null; c.exp = Math.max(0, c.exp || 0); c.level = Math.min(L.MAX_LEVEL, c.level || 1); gainExp(c, 0); } // gainExp(0) settles EXP banked under an older curve
  for (const c of g.party) migrateCallings(c, g.inv);
  const m = MAPS[g.map];
  if (!m) { g.map = 'haven'; g.x = 17; g.y = 30; } else if (!WALK.has(m.rows[g.y]?.[g.x] ?? '#') && m.rows[g.y]?.[g.x] !== 'B') { g.x = m.spawn.x; g.y = m.spawn.y; }
  return g;
}
// Saves from before Calling Points: skills came from the hero's level (main calling) and a sub calling two levels behind.
// Grant each calling the rank that keeps every skill the hero had (and anything slotted), and at least what its level would
// have earned; the sub calling becomes the second calling. Weapons the new calling cannot hold go back to the pack.
const CP_AT_LEVEL = [0, 0, 3, 8, 14, 22, 32, 40, 50, 60, 75, 95, 115, 130, 150, 170, 190, 210, 230, 250, 270];
function migrateCallings(c, inv) {
  if (c.cp) return; if (!JOBS[c.main]) c.main = 'knight'; if (c.sub && !JOBS[c.sub]) c.sub = null;
  const lv = Math.min(L.MAX_LEVEL, c.level || 1), had = (l) => (l >= 9 ? 5 : l >= 7 ? 4 : l >= 5 ? 3 : l >= 3 ? 2 : l >= 1 ? 1 : 0); // skills the old level tables gave by then
  const need = (job, n) => { const r = JOBS[job].skills[Math.min(n, JOBS[job].skills.length) - 1]?.[1] || 1; return Math.max(1, ...(c.slots || []).filter((id) => JOBS[job].skills.some(([s]) => s === id)).map((id) => JOBS[job].skills.find(([s]) => s === id)[1]), r); };
  c.cp = { [c.main]: Math.max(L.CP_RANKS[need(c.main, had(lv)) - 1], CP_AT_LEVEL[lv]) };
  if (c.sub && c.sub !== c.main) c.cp[c.sub] = L.CP_RANKS[need(c.sub, Math.max(1, had(lv - 2))) - 1]; else c.sub = null;
  c.trait = null; sanitize(c, inv);
}
const readSlot = (i) => { try { const raw = localStorage.getItem(SLOT_KEY(i)); return raw ? JSON.parse(raw) : null; } catch { return null; } };
const anySave = () => SLOT_IDS.some((i) => readSlot(i));
const save = () => { if (!G || !G.slot) return false; try { localStorage.setItem(SLOT_KEY(G.slot), JSON.stringify({ v: 3, savedAt: Date.now(), G })); return true; } catch { return false; } };
(function importLegacy() { // a v2 single-slot save becomes slot 1 the first time this version runs
  try { const old = localStorage.getItem(LEGACY_SAVE); if (old && !readSlot(1)) { const g = migrate(JSON.parse(old)); g.slot = 1; localStorage.setItem(SLOT_KEY(1), JSON.stringify({ v: 3, savedAt: Date.now(), G: g })); localStorage.removeItem(LEGACY_SAVE); } } catch {}
})();
let toastT = null;
function toast(msg, ms = 2200) { const t = $('#toast'); if (!t) return; t.innerHTML = UI.deco(esc(msg)); t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }
const tipOnce = () => false; // no tutorial pop-ups: players work things out (the journal keeps a few notes)
function tip(id, text, ms = 5200) { if (!tipOnce(id)) return; if (BT) BT.log.push('💡 ' + text); else toast('💡 ' + text, ms); } // in battle the hint goes to the log so it never covers the stage
const TOUCH = matchMedia('(pointer:coarse)').matches;
function autosave() { if (!G || !G.slot || BT) return; if (save()) toast('💾 Autosaved', 1400); }
const mapDef = () => MAPS[G.map];
const inTown = () => ['town', 'interior'].includes(mapDef().kind);
const maxOf = (c) => stats(c);
function autofill(c) {
  const used = c.slots.filter(Boolean);
  for (const sid of learnable(c)) { const i = c.slots.indexOf(null); if (i < 0) break; if (!used.includes(sid)) { c.slots[i] = sid; used.push(sid); } }
}

// ---------- map helpers ----------
const tileAt = (x, y) => (mapDef().rows[y] || '')[x] ?? '#';
const chestKey = (x, y) => `${G.map}:${x},${y}`;
const gateOpen = () => { const g = mapDef().gate; return !g || !!G.flags.bosses[g.flag]; };
const walkable = (t) => WALK.has(t) || (t === 'B' && gateOpen());
const FLAT_DECOR = new Set(['trapdoor']); // drawn on the floor: walk right over it
const decorAt = (x, y) => mapDef().decor?.some((d) => d[0] === x && d[1] === y && !FLAT_DECOR.has(d[2]));
const here = (n) => !(n.local && G.party.some((c) => c.look === n.local)); // locals leave their post once they join
const npcAt = (x, y) => mapDef().npcs?.find((n) => n.x === x && n.y === y && here(n));
const regionOf = () => { if (G.map !== 'world') return null; const t = tileAt(G.x, G.y); return t === ',' || t === 't' ? 'snow' : t === ':' ? 'swamp' : t === 'd' ? 'desert' : G.y <= 13 ? 'plains' : 'green'; };
const REGION_NAME = { snow: 'Frostfields', swamp: 'Mire Marsh', plains: 'Northern Plains', green: 'Greenmarch', desert: 'Sunscar Sands' };
function musicFor() { const m = mapDef(); if (m.kind !== 'outdoor') return m.music; const r = regionOf(); return r === 'snow' ? 'snow' : r === 'desert' ? 'desert' : r === 'swamp' ? 'mirewood' : 'world'; }
function reveal() { // fog of war
  const m = mapDef(); if (!m.fog) return;
  const seen = (G.flags.seen[G.map] ||= m.rows.map((r) => '0'.repeat(r.length))), r = m.fog;
  for (let y = Math.max(0, G.y - r); y <= Math.min(m.rows.length - 1, G.y + r); y++) {
    let row = seen[y], ch = false;
    for (let x = Math.max(0, G.x - r); x <= Math.min(m.rows[0].length - 1, G.x + r); x++) if ((x - G.x) ** 2 + (y - G.y) ** 2 <= r * r + r && row[x] !== '1') { row = row.slice(0, x) + '1' + row.slice(x + 1); ch = true; }
    if (ch) { seen[y] = row; miniDirty = true; }
  }
}

// ---------- adaptive view: choose how many tiles to show so tiles stay chunky on every screen ----------
function layoutView() {
  const box = $('#view').getBoundingClientRect(); if (box.width < 40 || box.height < 40) return;
  const portrait = box.height > box.width * 1.1, big = Math.min(box.width, box.height) >= 560; // iPad / large windows: more of the world, not giant tiles
  const T = portrait ? box.width / (big ? 16 : 12) : Math.min(box.width / (big ? 22 : 16), box.height / (big ? 15 : 12));
  let cols = clamp(Math.round(box.width / T), 10, 26), rows = clamp(Math.round(box.height / T), 8, 20);
  if (cols !== VW || rows !== VH) { VW = cols; VH = rows; cv.width = cols * TS; cv.height = rows * TS; miniDirty = true; }
  const pad = $('#padL'); root.style.setProperty('--padh', (pad && pad.offsetHeight ? pad.offsetHeight + 8 : 0) + 'px'); // dialogue boxes sit above the touch pads
}
new ResizeObserver(() => requestAnimationFrame(layoutView)).observe($('#view'));
addEventListener('orientationchange', () => setTimeout(layoutView, 250));

// ---------- minimap / map screen ----------
let miniDirty = true; const miniCache = { id: null, canvas: document.createElement('canvas'), sc: 2 };
const MINI = { d: '#e0c070', r: '#3c94f0', '.': '#2aa83a', ',': '#eef4fc', ':': '#4a6a38', _: '#e0c070', '=': '#9a9a9a', '~': '#3c94f0', T: '#0c6a18', t: '#9ab0c8', M: '#a07848', B: '#c0a060', H: '#ffffff', D: '#c04040', E: '#f4d35e' };
const MINI_FLOOR = { cellar: '#6a4a34', cavern: '#5a566a', crypt: '#4a5a50', spire: '#8aa8d0', storm: '#5a5c8a' }, MINI_WALL = { cellar: '#2a1610', cavern: '#22202a', crypt: '#16221c', spire: '#2a4a78', storm: '#1c1e40' };
function drawMini(c2, id, scale, ox, oy, t, noPlayer = false) {
  const m = MAPS[id], seen = G.flags.seen[id]; if (!seen) return;
  for (let y = 0; y < m.rows.length; y++) for (let x = 0; x < m.rows[0].length; x++) {
    if (seen[y][x] !== '1') continue;
    const ch = m.rows[y][x]; let col;
    if (m.kind === 'dungeon') col = ch === '#' ? MINI_WALL[m.theme] : ch === 'E' ? '#f4d35e' : MINI_FLOOR[m.theme];
    else col = ch === 'B' && G.flags.bosses[m.gate?.flag] ? MINI._ : MINI[ch] || '#4f9a3f';
    c2.fillStyle = col; c2.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    if (ch === 'C' && !G.flags.chests[`${id}:${x},${y}`]) { c2.fillStyle = '#e0a050'; c2.fillRect(ox + x * scale, oy + y * scale, scale, scale); }
    if (m.boss && m.boss.x === x && m.boss.y === y && !G.flags.bosses[m.boss.id]) { c2.fillStyle = '#ff4a4a'; c2.fillRect(ox + x * scale - 1, oy + y * scale - 1, scale + 2, scale + 2); }
  }
  if (!noPlayer && G.map === id && Math.floor(t * 3) % 2 === 0) { c2.fillStyle = '#ffffff'; c2.fillRect(ox + G.x * scale - 1, oy + G.y * scale - 1, scale + 2, scale + 2); }
}
function miniOverlay(t) {
  const m = mapDef(); if (!OPT.minimap || !m.fog) return;
  const W = m.rows[0].length, H = m.rows.length, sc = Math.max(2, Math.min(Math.floor(104 / W), Math.floor(80 / H))), w = W * sc, h = H * sc, ox = cv.width - w - 8, oy = 8;
  if (miniDirty || miniCache.id !== G.map) { // redraw the static layer only when something was revealed or changed
    miniCache.id = G.map; miniCache.sc = sc; miniCache.canvas.width = w; miniCache.canvas.height = h; miniDirty = false;
    const mc = miniCache.canvas.getContext('2d'), art = G.map === 'world' && TR.mapImage ? TR.mapImage(m) : null, seen = G.flags.seen[G.map] || [];
    if (!art) drawMini(mc, G.map, sc, 0, 0, 0, true);
    else { mc.imageSmoothingEnabled = true; mc.drawImage(art, 0, 0, w, h); mc.fillStyle = '#04061a'; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (seen[y]?.[x] !== '1') mc.fillRect(x * sc, y * sc, sc, sc); }
  }
  cx.fillStyle = 'rgba(6,10,40,.72)'; cx.fillRect(ox - 3, oy - 3, w + 6, h + 6); cx.strokeStyle = '#e8ecf8'; cx.lineWidth = 1; cx.strokeRect(ox - 2.5, oy - 2.5, w + 5, h + 5);
  cx.drawImage(miniCache.canvas, ox, oy);
  if (Math.floor(t * 3) % 2 === 0) { cx.fillStyle = '#ffffff'; cx.fillRect(ox + G.x * sc - 1, oy + G.y * sc - 1, sc + 2, sc + 2); }
}

// ---------- map rendering ----------
const plr = { x: 256, y: 192 };
let face = 'down', vx = 0, vy = 0, trans = 0, lastT = 0, trail = [], fv = [];
const snap = () => { vx = G.x; vy = G.y; trail = [{ x: G.x, y: G.y }]; fv = [0, 1, 2].map(() => ({ x: G.x, y: G.y, d: face, mv: false })); reveal(); };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const LIGHT = { cellar: { glow: '255,180,90', dark: 0.8, r: 185 }, ruins: { glow: '255,190,100', dark: 0.74, r: 205 }, storm: { glow: '255,230,90', dark: 0.8, r: 180 }, cavern: { glow: '255,150,50', dark: 0.88, r: 175 }, crypt: { glow: '90,255,140', dark: 0.9, r: 165 }, spire: { glow: '130,210,255', dark: 0.5, r: 250 } };
function draw(t = performance.now() / 1000) {
  if (!G) return;
  const m = mapDef(), W = m.rows[0].length, H = m.rows.length, frame = Math.floor(t / 0.6) % 2;
  cx.imageSmoothingEnabled = false;
  cx.fillStyle = '#000'; cx.fillRect(0, 0, cv.width, cv.height);
  const camX = W <= VW ? -(VW - W) / 2 : clamp(vx - VW / 2 + 0.5, 0, W - VW);
  const camY = H <= VH ? -(VH - H) / 2 : clamp(vy - VH / 2 + 0.5, 0, H - VH);
  const sx = (x) => Math.round((x - camX) * TS), sy = (y) => Math.round((y - camY) * TS); camState.x = camX; camState.y = camY;
  const x0 = Math.max(0, Math.floor(camX)), x1 = Math.min(W, Math.ceil(camX + VW) + 1), y0 = Math.max(0, Math.floor(camY)), y1 = Math.min(H, Math.ceil(camY + VH) + 1);
  const defeated = (id) => !!G.flags.bosses[id];
  m.chestOpen = (x, y) => !!G.flags.chests[chestKey(x, y)];
  const R = TR.isTheme(m.theme) ? TR : TA.isTheme(m.theme) ? TA : RA.isTheme(m.theme) ? RA : null, items = []; // R = autotiled renderer (overworld / towns)
  if (!R) { // rooms and dungeons: classic tiles; beyond the edge more wall, shaded, instead of black bars
    for (let y = Math.floor(camY) - 1; y <= Math.ceil(camY + VH) + 1; y++) for (let x = Math.floor(camX) - 1; x <= Math.ceil(camX + VW) + 1; x++) if (x < 0 || y < 0 || x >= W || y >= H) cx.drawImage(SP.tile(m.theme, '#', x, y, 0), sx(x), sy(y), TS, TS);
    cx.fillStyle = 'rgba(0,0,0,.55)'; cx.fillRect(0, 0, cv.width, cv.height);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      let ch = tileAt(x, y);
      if (ch === 'C' && G.flags.chests[chestKey(x, y)]) ch = 'c';
      if (ch === 'X') ch = '.';
      cx.drawImage(SP.tile(m.theme, ch, x, y, frame), sx(x), sy(y), TS, TS);
    }
  } else {
    const outside = m.kind === 'outdoor' ? () => '~' : m.kind !== 'town' ? () => '#' : (x, y) => ((x * 7 + y * 5) % 3 === 0 ? (m.theme === 'snowtown' ? 't' : 'T') : '.');
    const get = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return outside(x, y); const ch = tileAt(x, y); return ch === 'X' ? '.' : ch === 'B' && gateOpen() ? '_' : ch; };
    const ax0 = Math.floor(camX) - 1, ax1 = Math.ceil(camX + VW) + 1, ay0 = Math.floor(camY) - 1, ay1 = Math.ceil(camY + VH) + 1, ctx = { gateOpen: gateOpen(), flags: G.flags };
    m.gateOpen = ctx.gateOpen;
    for (let y = ay0; y <= ay1; y++) for (let x = ax0; x <= ax1; x++) cx.drawImage(R.ground(m.theme, get, x, y, t), sx(x), sy(y), TS, TS);
    for (let y = ay0 - 1; y <= ay1 + 3; y++) for (let x = ax0 - 2; x <= ax1 + 2; x++) R.objects(m.theme, get, x, y, t, items, m); // margins: tall/wide objects rooted off-screen
    R.mapObjects(m, t, items, ctx);
  }
  // draw items: z 0 flat now; z 1 sorted with characters by their base; z 2 last
  const put = (it) => {
    const w = it.w ?? it.img.width / 16, h = it.h ?? it.img.height / 16, X = sx(it.x), Y = sy(it.y);
    if (it.shadow) { const rx = X + w * TS, s2 = Math.round(TS * 0.45); cx.fillStyle = 'rgba(0,0,0,.45)'; cx.beginPath(); cx.moveTo(rx, Y + s2); cx.lineTo(rx + s2, Y + s2 * 2); cx.lineTo(rx + s2, Y + h * TS); cx.lineTo(rx, Y + h * TS); cx.fill(); return; }
    if (it.draw) return it.draw(cx, X, Y, TS);
    cx.drawImage(it.img, X, Y, w * TS, h * TS);
  };
  for (const it of items) if (!it.z) put(it);
  const torches = [], theme = m.theme;
  if (m.kind === 'dungeon') for (let y = Math.max(0, y0 - 1); y < y1 - 1; y++) for (let x = x0; x < x1; x++) if (tileAt(x, y) === '#' && tileAt(x, y + 1) === '.' && (x * 5 + y * 3) % 7 === 0) { cx.drawImage(SP.torch(Math.floor(t * 7 + x) % 2, theme), sx(x), sy(y), TS, TS); torches.push([sx(x) + TS / 2, sy(y) + TS * 0.4]); }
  if (!R?.drawsDecor?.(m)) for (const [dx, dy, k] of m.decor || []) cx.drawImage(SP.decor(k), sx(dx), sy(dy), TS, TS);
  if (routeGoal && route.length) { // where a tap is taking the party: a pulsing ring
    const gx = sx(routeGoal[0]) + TS / 2, gy = sy(routeGoal[1]) + TS - 6, pr = 7 + Math.sin(t * 8) * 2;
    cx.strokeStyle = 'rgba(255,240,150,.9)'; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(gx, gy, pr * 1.6, pr * 0.7, 0, 0, 7); cx.stroke();
  }
  // characters: standing on the bottom of their tile, sprites may be taller than one tile
  // feet rest 2 art-px inside the tile on a soft two-layer contact shadow, so nobody hovers over cobbles or grass
  const stand = (img, X, Y) => { const u = TS / 16, h = img.height * u, fy = Y + TS - 2 * u;
    cx.fillStyle = 'rgba(10,8,24,.38)'; cx.beginPath(); cx.ellipse(X + TS / 2, fy, 7 * u, 2.6 * u, 0, 0, 7); cx.fill();
    cx.fillStyle = 'rgba(10,8,24,.42)'; cx.beginPath(); cx.ellipse(X + TS / 2, fy, 5 * u, 1.7 * u, 0, 0, 7); cx.fill();
    cx.drawImage(img, X, fy - h + u, TS, h); return h + u; };
  const sorted = items.filter((it) => it.z === 1).map((it) => ({ k: it.sy ?? it.y + (it.h ?? it.img.height / 16), f: () => put(it) }));
  if (m.boss && !defeated(m.boss.id)) sorted.push({ k: m.boss.y + 1, f: () => { const bob = Math.round(Math.sin(t * 2) * 1.5); const img = SP.enemy(m.boss.id), sc = Math.min(2 * TS / img.width, 2 * TS / img.height), w = img.width * sc, h = img.height * sc; cx.drawImage(img, sx(m.boss.x) + TS / 2 - w / 2, sy(m.boss.y) + TS - h + bob, w, h); } }); // bosses loom over their lair, up to 2x2 tiles
  for (const n of (m.npcs || []).filter(here)) sorted.push({ k: n.y + 1, f: () => {
    const nx0 = sx(n.x), ny0 = sy(n.y), fr = Math.floor(t * 1.6 + n.x) % 8 === 0 ? 1 : 0, bob = Math.round(Math.sin(t * 4 + n.x) * 1.5); // only the '!' bobs
    const h = stand(WK.npcWalker(n.type, n.dir || 'down', fr), nx0, ny0);
  } });
  const px = sx(vx), py = sy(vy); plr.x = px + TS / 2; plr.y = py + TS / 2;
  const crew = [{ i: 0, x: vx, y: vy, d: face, mv: Math.abs(vx - G.x) + Math.abs(vy - G.y) > 0.05 }, ...fv.slice(0, G.party.length - 1).map((f, i) => ({ i: i + 1, ...f }))];
  for (const c of crew) sorted.push({ k: c.y + 1 - c.i * 0.001, f: () => stand(WK.walker(ak(G.party[c.i]), c.d, c.mv ? 1 + (Math.floor(t * 8 + c.i) % 3) : 0), sx(c.x), sy(c.y)) });
  sorted.sort((a, b) => a.k - b.k).forEach((s2) => s2.f());
  for (const it of items) if (it.z === 2) put(it);

  if (m.kind === 'outdoor') {
    const reg = regionOf();
    if (reg === 'snow') { cx.fillStyle = 'rgba(210,225,255,.07)'; cx.fillRect(0, 0, cv.width, cv.height); cx.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 46; i++) cx.fillRect(Math.round((i * 47 + Math.sin(t * 0.9 + i) * 14 + t * 10) % cv.width), Math.round((t * (30 + (i % 5) * 9) + i * 53) % cv.height), 2, 2); }
  } else if (m.kind === 'dungeon') { // torch-lit darkness around the party
    const lt = LIGHT[theme], fl = Math.sin(t * 9) * 4 + Math.sin(t * 23) * 2, gx = px + TS / 2, gy = py + TS / 2;
    const g = cx.createRadialGradient(gx, gy, 30, gx, gy, lt.r + fl);
    g.addColorStop(0, `rgba(${lt.glow},.07)`); g.addColorStop(0.45, `rgba(0,0,10,${lt.dark * 0.32})`); g.addColorStop(1, `rgba(0,0,10,${lt.dark})`);
    cx.fillStyle = g; cx.fillRect(0, 0, cv.width, cv.height);
    cx.globalCompositeOperation = 'lighter'; // torch glow on top of the darkness
    for (const [tx, ty] of torches) { const r = 52 + Math.sin(t * 11 + tx) * 4, tg = cx.createRadialGradient(tx, ty, 2, tx, ty, r); tg.addColorStop(0, `rgba(${lt.glow},.38)`); tg.addColorStop(1, `rgba(${lt.glow},0)`); cx.fillStyle = tg; cx.fillRect(tx - r, ty - r, r * 2, r * 2); }
    cx.globalCompositeOperation = 'source-over';
  } else if (m.kind !== 'town') { cx.fillStyle = 'rgba(255,170,80,.06)'; cx.fillRect(0, 0, cv.width, cv.height); }
  miniOverlay(t);
  if (trans > 0) { // battle-start wipe
    cx.fillStyle = '#000';
    for (let r = 0; r < VH; r++) { const w = Math.min(1, trans * 1.5 - (r % 6) * 0.08) * cv.width; if (w > 0) cx.fillRect(r % 2 ? cv.width - w : 0, r * TS, w, TS); }
  }
  $('#loc').textContent = m.kind === 'outdoor' ? REGION_NAME[regionOf()] : m.name; $('#gold').textContent = `${G.gold} G`;
}

function drawTitle(t) {
  const W = cv.width, H = cv.height, u = Math.min(W / 512, H / 384), cxm = W / 2; cx.imageSmoothingEnabled = false;
  const g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a0c24'); g.addColorStop(0.6, '#2a2060'); g.addColorStop(1, '#6a3a78'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) { const x = (i * 97) % W, y = (i * 53) % (H * 0.6), a = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i)); cx.fillStyle = `rgba(255,255,255,${a})`; cx.fillRect(x, y, i % 5 ? 2 : 3, i % 5 ? 2 : 3); }
  cx.fillStyle = '#f4ecc8'; cx.beginPath(); cx.arc(W - 44 * u, H * 0.14, 22 * u, 0, 7); cx.fill(); cx.fillStyle = '#d8cfa0'; cx.beginPath(); cx.arc(W - 51 * u, H * 0.12, 5 * u, 0, 7); cx.arc(W - 37 * u, H * 0.16, 4 * u, 0, 7); cx.fill();
  const tall = H > W * 1.2, base = H * (tall ? 0.56 : 0.75), ground = H * (tall ? 0.63 : 0.875);
  for (const [col, off, amp, f] of [['#2a1f58', 0, 50, 0.011], ['#1a1440', 30, 38, 0.02]]) { cx.fillStyle = col; cx.beginPath(); cx.moveTo(0, H); for (let x = 0; x <= W; x += 8) cx.lineTo(x, base + off * u - Math.abs(Math.sin(x * f / u + 1)) * amp * u - Math.sin(x * f * 3 / u) * 8 * u); cx.lineTo(W, H); cx.fill(); }
  cx.fillStyle = '#0e0b24'; cx.fillRect(0, ground, W, H - ground);
  const gemCols = ['#ff7a3a', '#7fd8f0', '#fff27a', '#ffffff', '#b07aff'], n = Math.max(5, Math.round(W / 54));
  for (let i = 0; i < n; i++) { const x = (i + 0.5) * W / n, y = H * (tall ? 0.45 : 0.5) + Math.sin(t * 1.4 + i * 1.7) * 14 * u, c = gemCols[i % 5], q = u; cx.fillStyle = c; cx.beginPath(); cx.moveTo(x, y - 7 * q); cx.lineTo(x + 5 * q, y); cx.lineTo(x, y + 7 * q); cx.lineTo(x - 5 * q, y); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.6)'; cx.fillRect(x - q, y - 4 * q, 2 * q, 3 * q); }
  const sz = Math.round(48 * u / 8) * 8 || 24, heroes = ['bloke@adam', 'bloke@devon', 'cleric@brenna', 'knight@wendell'];
  heroes.forEach((j, i) => { const x = ((t * 34 * u + i * 118 * u) % (heroes.length * 118 * u)) - 56 * u, y = ground - sz - Math.round(Math.abs(Math.sin(t * 9 + i)) * 4 * u) + 8 * u; cx.fillStyle = 'rgba(0,0,0,.4)'; cx.fillRect(x + sz * 0.16, ground + 4 * u, sz * 0.66, 4 * u); const im = WK.walker(j, 'right', 1 + (Math.floor(t * 8 + i) % 3)), h = sz * im.height / 16; cx.drawImage(im, x, y + sz - h + 4 * u, sz, h); }); // the party marches along in their field sprites
  cx.textAlign = 'center'; cx.textBaseline = 'alphabetic'; cx.lineJoin = 'round';
  const ty = H * 0.29, tg = cx.createLinearGradient(0, ty - 44 * u, 0, ty + 8 * u); tg.addColorStop(0, '#fff6c0'); tg.addColorStop(1, '#e89a30');
  const f1 = Math.min(50 * u, (W - 24) / 7.6); cx.font = `${f1}px "Press Start 2P", ui-monospace, Menlo, monospace`; cx.lineWidth = Math.max(4, f1 * 0.2); cx.strokeStyle = '#2a1050'; cx.strokeText('BEARDED', cxm, ty); cx.fillStyle = tg; cx.fillText('BEARDED', cxm, ty);
  const f2 = f1 * 0.43; cx.font = `${f2}px "Press Start 2P", ui-monospace, Menlo, monospace`; cx.lineWidth = Math.max(3, f2 * 0.3); cx.strokeText('BROS', cxm, ty + f1 * 1.05); cx.fillStyle = tg; cx.fillText('BROS', cxm, ty + f1 * 1.05);
  const f3 = f1 * 0.3; cx.font = `${f3}px "Press Start 2P", ui-monospace, Menlo, monospace`; cx.lineWidth = Math.max(3, f3 * 0.35); cx.strokeText('AND THE BELL OF GEMFORGE', cxm, ty + f1 * 1.75); cx.fillStyle = '#c8b8ff'; cx.fillText('AND THE BELL OF GEMFORGE', cxm, ty + f1 * 1.75);
}
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016); lastT = now;
  if (!G) return drawTitle(now / 1000);
  G.playtime = (G.playtime || 0) + dt;
  moveTick(dt);
  if (!inOverlay()) draw(now / 1000);
}
requestAnimationFrame(tick);
const frame = () => new Promise((r) => requestAnimationFrame(r));
async function transition() { sfx('encounter'); for (trans = 0.02; trans < 1.2; trans += 0.065) await frame(); trans = 1; await sleep(60); }
function banner(text) { const b = $('#banner'); b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
function goto(id, x, y) {
  const first = !G.flags.visited[id]; G.map = id; G.x = x; G.y = y; G.flags.visited[id] = true; snap(); music(musicFor()); sfx('door');
  banner(id === 'world' ? REGION_NAME[regionOf()] : MAPS[id].name); G.region = regionOf(); layoutView(); draw(); autosave();
  arrive(id, first);
}
let busy = false;
function mapShake() { if (!OPT.shake) return; cv.classList.remove('shake'); void cv.offsetWidth; cv.classList.add('shake'); }
async function step(dx, dy) {
  if (inOverlay() || busy || Math.abs(vx - G.x) + Math.abs(vy - G.y) > 0.45) return;
  const m = mapDef(), nx = G.x + dx, ny = G.y + dy, t = tileAt(nx, ny);
  face = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
  const npc = npcAt(nx, ny); if (npc) { npc.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[face]; draw(); return talk(npc); } // they turn to face you
  if (decorAt(nx, ny) || m.blocks?.has(`${nx},${ny}`)) return; // m.blocks: solid props placed by a map renderer (stalls, barrels, fences...)
  if (t === 'C') { if (!G.flags.chests[chestKey(nx, ny)]) openChest(nx, ny); return; }
  if (!walkable(t)) return;
  G.x = nx; G.y = ny; trail.push({ x: nx, y: ny }); if (trail.length > 8) trail.shift();
  const pt = m.portals?.[`${nx},${ny}`];
  if (pt?.need && !cond(pt.need)) { G.x -= dx; G.y -= dy; trail.pop(); snap(); draw(); return scene(pt.deny || []); } // not yet: a word at the gate, and back a step
  if (pt) return goto(pt.to, pt.x, pt.y);
  reveal(); draw();
  const sec = m.secrets?.[`${nx},${ny}`]; if (sec && !G.flags.chests[chestKey(nx, ny)]) return openChest(nx, ny, sec);
  tip('move', TOUCH ? 'Tap a spot to travel there, or press and slide on the pad. A talks/checks, B opens the menu.' : 'Arrows or WASD to walk. Esc opens your party menu. A yellow ! marks someone with news.');
  if (m.kind === 'outdoor') { const reg = regionOf(); if (reg !== G.region) { G.region = reg; banner(REGION_NAME[reg]); music(musicFor()); } }
  if (m.boss && t === 'X' && !G.flags.bosses[m.boss.id]) { busy = true; mapShake(); sfx('crit'); await sleep(350); busy = false; return battle([m.boss.id], m.boss.id); }
  const table = m.enc || m.encByTile?.[t];
  if (table && !(m.safe || []).some(([sx2, sy2, r]) => Math.hypot(nx - sx2, ny - sy2) <= r) && Math.random() < m.rate) {
    let tb = ENCOUNTERS[table];
    const lure = Object.entries(QUESTS).find(([id, q]) => q.goal.lure?.table === table && qstate(id) === 'active' && !questDone(id))?.[1].goal.lure; // a hunt quest's quarry shows up more often
    if (lure && Math.random() < lure.p) return battle(lure.group);
    if (table === 'world' && m.ramp) tb = tb.slice(0, Math.min(tb.length, 2 + Math.floor(Math.hypot(nx - m.ramp[0], ny - m.ramp[1]) / 3))); // easy fights first, tougher the farther you roam
    await battle(tb[Math.floor(Math.random() * tb.length)]);
  }
}
const KEYS = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
let lastSig = '';
const sig = (el) => (el.dataset.act ? `${el.dataset.act}|${el.dataset.a}|${el.dataset.b}` : `in|${el.dataset.in}`);
const navs = () => [...ov.querySelectorAll('[data-act],[data-in]')].filter((e) => !e.disabled);
ov.addEventListener('focusin', (e) => { if (e.target.dataset?.act || e.target.dataset?.in) lastSig = sig(e.target); });
let lastTitle = null;
new MutationObserver(() => { // keep focus stable across same-screen redraws; start at the first control on a new screen
  const list = navs(); list.forEach((e) => { if (!['BUTTON', 'INPUT', 'SELECT'].includes(e.tagName)) e.tabIndex = 0; });
  const title = ov.querySelector('h2')?.textContent || ''; if (title !== lastTitle) lastSig = ''; lastTitle = title;
  const cur = document.activeElement;
  if (!list.length || (ov.contains(cur) && (cur.dataset?.act || cur.dataset?.in) && sig(cur) === lastSig)) return;
  (list.find((e) => sig(e) === lastSig) || list.find((e) => e.hasAttribute('data-autofocus')) || list[0]).focus({ preventScroll: true });
}).observe(ov, { childList: true });
function overlayKey(e) {
  if (typing && (e.key === 'Enter' || e.key === ' ')) { finishTyping(); return true; }
  const list = navs(), f = document.activeElement, i = list.indexOf(f);
  const onSlider = f?.tagName === 'INPUT' && f.type === 'range', onText = f?.tagName === 'INPUT' && f.type !== 'range';
  if (onText) { if (e.key === 'Enter') { ACT.crnext?.(); return true; } if (!['ArrowUp', 'ArrowDown', 'Escape'].includes(e.key)) return false; } // typing a name
  if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key) && list.length) {
    if (onSlider && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return false; // let the slider move
    const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1; list[(i + d + list.length) % list.length].focus(); return true;
  }
  if ((e.key === 'Enter' || e.key === ' ') && f?.dataset?.act && f.tagName !== 'BUTTON') { f.click(); return true; }
  if ((e.key === 'Escape' || e.key === 'Backspace') && ov.querySelector('.saybox')) { // skip to the last line of a dialogue, then close it
    if (sayAt < curLines.length - 1) { say(curLines.length - 1); finishTyping(); return true; }
    if (typing) { finishTyping(); return true; }
  }
  if (e.key === 'Escape' || e.key === 'Backspace') {
    const b = list.find((x) => /^(close|scend|bmain|leave|menu|bclose|optback|awdone)$/.test(x.dataset.act) || (x.dataset.act === 'c' && x.dataset.a === 'root'));
    if (b) { b.click(); return true; }
  }
  return false;
}
addEventListener('keydown', (e) => {
  if (inOverlay()) { if (overlayKey(e)) e.preventDefault(); return; } // never move the map while a window is open
  if (!G) return;
  if (KEYS[e.key]) { e.preventDefault(); route = []; if (!keysDown.includes(e.key)) keysDown.push(e.key); if (!e.repeat) step(...KEYS[e.key]); }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); interact(); }
  else if ((e.key === 'Escape' || e.key === 'm') && !inOverlay() && !busy) mainMenu();
  else if (e.key === 'n' && !inOverlay()) { OPT.minimap = !OPT.minimap; applyOptions(); }
});
// ---------- touch controls ----------
// Slide d-pad: press anywhere on the cross and slide between directions without lifting; the party walks continuously.
// A = talk/check the tile you face, B = menu. Tap (or drag) on the map: walk the whole way there along a real path;
// tapping a townsperson or chest walks up to it and talks/opens it.
let held = null, route = [], routeMap = null, routeGoal = null;
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const cross = $('.cross');
if (cross) {
  const arms = { up: cross.querySelector('[data-d=up]'), down: cross.querySelector('[data-d=down]'), left: cross.querySelector('[data-d=left]'), right: cross.querySelector('[data-d=right]') };
  let pid = null;
  const aimPad = (e) => {
    const r = cross.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy) < r.width * 0.12 ? null : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    for (const [k, el] of Object.entries(arms)) el?.classList.toggle('on', k === d);
    held = d && DIRV[d]; if (held) { route = []; routeGoal = null; }
  };
  const release = () => { pid = null; held = null; for (const el of Object.values(arms)) el?.classList.remove('on'); };
  cross.addEventListener('pointerdown', (e) => { e.preventDefault(); pid = e.pointerId; cross.setPointerCapture?.(pid); aimPad(e); if (held && G && !inOverlay()) step(...held); }); // a quick tap still moves one tile
  cross.addEventListener('pointermove', (e) => { if (e.pointerId === pid) aimPad(e); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => cross.addEventListener(ev, (e) => { if (e.pointerId === pid) release(); }));
}
const interact = () => { // A button / Enter on the map: talk to or open whatever you face
  if (!G || inOverlay() || busy) return;
  const [dx, dy] = DIRV[face] || [0, 1], nx = G.x + dx, ny = G.y + dy, npc = npcAt(nx, ny);
  if (npc) { npc.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[face]; return talk(npc); }
  if (tileAt(nx, ny) === 'C' && !G.flags.chests[chestKey(nx, ny)]) return openChest(nx, ny);
  sfx('blip');
};
document.querySelectorAll('.pad button[data-d]').forEach((b) => {
  const d = b.dataset.d;
  if (d === 'menu') b.addEventListener('click', () => { if (G && !inOverlay() && !busy) { route = []; mainMenu(); } });
  else if (d === 'map') b.addEventListener('click', () => { if (G && !inOverlay() && !busy) { route = []; ACT.mapscreen(); } });
  else if (d === 'a') b.addEventListener('pointerdown', (e) => { e.preventDefault(); route = []; interact(); });
});
$('#hudmenu').addEventListener('click', () => { if (G && !inOverlay() && !busy) mainMenu(); });
// path finding for tap-to-travel: breadth-first over walkable tiles; portals and the boss tile only as the final step
const solidAt = (x, y) => { const m = mapDef(); return !walkable(tileAt(x, y)) || !!npcAt(x, y) || decorAt(x, y) || !!m.blocks?.has(`${x},${y}`); };
function findPath(tx, ty) {
  const m = mapDef(), W = m.rows[0].length, H = m.rows.length; if (tx < 0 || ty < 0 || tx >= W || ty >= H) return [];
  const goalTalk = !!npcAt(tx, ty) || (tileAt(tx, ty) === 'C' && !G.flags.chests[chestKey(tx, ty)]);
  const key = (x, y) => y * W + x, prev = new Map([[key(G.x, G.y), -1]]), q = [[G.x, G.y]]; let best = [G.x, G.y], bestD = Math.abs(tx - G.x) + Math.abs(ty - G.y);
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny); if (nx < 0 || ny < 0 || nx >= W || ny >= H || prev.has(k)) continue;
      const isGoal = nx === tx && ny === ty;
      if (isGoal && goalTalk) { prev.set(k, key(x, y)); q.length = 0; best = [nx, ny]; bestD = 0; break; }
      if (solidAt(nx, ny)) continue;
      const special = m.portals?.[`${nx},${ny}`] || (m.boss && tileAt(nx, ny) === 'X');
      if (special && !isGoal) continue;
      prev.set(k, key(x, y)); const d = Math.abs(tx - nx) + Math.abs(ty - ny); if (d < bestD) { bestD = d; best = [nx, ny]; }
      if (isGoal) { q.length = 0; break; }
      q.push([nx, ny]);
    }
    if (prev.size > 4000) break;
  }
  const out = []; let k = key(best[0], best[1]); while (k !== -1 && k !== key(G.x, G.y)) { out.unshift([k % W, Math.floor(k / W)]); k = prev.get(k); }
  return out;
}
const camState = { x: 0, y: 0 };
const tileFromEvent = (e) => {
  const r = cv.getBoundingClientRect(), k = Math.min(r.width / cv.width, r.height / cv.height), px = (e.clientX - (r.left + (r.width - cv.width * k) / 2)) / k, py = (e.clientY - (r.top + (r.height - cv.height * k) / 2)) / k;
  return [Math.floor(px / TS + camState.x), Math.floor(py / TS + camState.y)];
};
let mapPid = null, lastTap = '';
const travelTo = (e) => { const [tx, ty] = tileFromEvent(e), k = `${tx},${ty}`; if (k === lastTap && route.length) return; lastTap = k; held = null; route = findPath(tx, ty); routeMap = G.map; routeGoal = route.length ? [tx, ty] : null; };
cv.addEventListener('pointerdown', (e) => { if (!G || inOverlay()) return; e.preventDefault(); mapPid = e.pointerId; lastTap = ''; travelTo(e); });
cv.addEventListener('pointermove', (e) => { if (e.pointerId === mapPid && G && !inOverlay()) travelTo(e); });
['pointerup', 'pointercancel'].forEach((ev) => cv.addEventListener(ev, (e) => { if (e.pointerId === mapPid) mapPid = null; }));
const WALK_SPEED = 6.5; // tiles per second
function nextMove() { // at a tile boundary: take the next tapped-route step, or keep going in the held direction
  if (route.length) {
    if (routeMap !== G.map) { route = []; return false; }
    const [nx, ny] = route[0], dx = nx - G.x, dy = ny - G.y;
    if (Math.abs(dx) + Math.abs(dy) !== 1) { route = []; return false; }
    route.shift(); const before = `${G.map}${G.x},${G.y}`; step(dx, dy);
    if (`${G.map}${G.x},${G.y}` === before) route = []; // blocked, talked or opened something
    if (!route.length) routeGoal = null;
    return true;
  }
  const d = heldKeyDir() || held; if (d) { step(...d); return true; }
  return false;
}
function moveTick(dt) { // glide at constant speed; when a step lands and input continues, chain the next step in the same frame
  let budget = WALK_SPEED * dt;
  for (let guard = 0; guard < 4 && budget > 1e-6; guard++) {
    const rx = G.x - vx, ry = G.y - vy, rem = Math.abs(rx) + Math.abs(ry);
    if (rem > 1e-6) {
      if (rem > 2) { vx = G.x; vy = G.y; break; } // teleported (door, map change): no sliding across the map
      const d = Math.min(budget, rem); budget -= d;
      if (Math.abs(rx) > 1e-6) vx += Math.sign(rx) * Math.min(d, Math.abs(rx)); else vy += Math.sign(ry) * Math.min(d, Math.abs(ry));
      continue;
    }
    if (!G || inOverlay() || busy) { if (inOverlay()) route = []; break; }
    const map0 = G.map, at = `${G.x},${G.y}`;
    if (!nextMove() || G.map !== map0 || `${G.x},${G.y}` === at) break;
  }
  const fs = WALK_SPEED * 1.05 * dt; // followers trail the leader's footsteps at the same pace
  fv.forEach((f, i) => { const tg = trail[Math.max(0, trail.length - 2 - i)] || { x: G.x, y: G.y }, dx = tg.x - f.x, dy = tg.y - f.y; f.mv = Math.abs(dx) + Math.abs(dy) > 0.02; if (f.mv) f.d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); if (Math.abs(dx) > 2 || Math.abs(dy) > 2) { f.x = tg.x; f.y = tg.y; } else { f.x += clamp(dx, -fs, fs); f.y += clamp(dy, -fs, fs); } });
}
// keyboard: track held arrow/WASD keys so holding walks smoothly (no OS key-repeat delay); the newest key wins
const keysDown = [];
const heldKeyDir = () => (keysDown.length ? KEYS[keysDown[keysDown.length - 1]] : null);
addEventListener('keyup', (e) => { const i = keysDown.indexOf(e.key); if (i >= 0) keysDown.splice(i, 1); });
addEventListener('blur', () => { keysDown.length = 0; held = null; });
ACT.close = hide;

function openChest(x, y, secret = null) { // secret: loot of a hidden treasure spot (m.secrets), found by stepping on it
  const c = secret || mapDef().chests?.[`${x},${y}`] || { gold: 50 }; G.flags.chests[chestKey(x, y)] = true; miniDirty = true; sfx('chest');
  const got = [];
  for (const k of ['weapons', 'armors', 'accs', 'gems']) for (const id of c[k] || []) { G.inv[k].push(id); got.push(lootName(k, id)); }
  for (const [id, n] of Object.entries(c.items || {})) { G.inv.items[id] = (G.inv.items[id] || 0) + n; got.push(`${ITEMS[id].name} ×${n}`); }
  if (c.gold) { G.gold += c.gold; got.push(`${c.gold} G`); }
  if (c.qitem) { G.flags.qitems[c.qitem] = true; got.push(`<span class="gold">${QITEM[c.qitem]}</span> (quest item)`); }
  draw();
  show(`<h2>${secret ? '✨ Hidden treasure!' : '📦 Treasure!'}</h2><p>${secret ? 'Something glints in the ground... You dig up:' : 'You found:'}</p>${got.map((g) => `<div class="slot"><span class="lead">${ic('chest')}</span><div class="t"><b class="gold">${g}</b></div></div>`).join('')}<div class="foot">${btn('close', 'OK', '', '', 'primary')}</div>`);
}

// ---------- NPCs, dialogue, services ----------
const QITEM = { heirloom: 'Grandmother\'s Ring', lantern: 'Boatwright\'s Lantern', doubloon: 'Redwake\'s Doubloon', letter: 'Sealed Letter', storm_shard: 'Storm Shard', ...KEY_ITEMS };
const qstate = (id) => G.flags.quests[id];
function questDone(id) { const g = QUESTS[id].goal; return g.type === 'kill' ? (G.flags.qprog[id] || 0) >= g.n : g.type === 'find' ? !!G.flags.qitems[g.item] : g.type === 'deliver' ? (G.flags.qprog[id] || 0) >= 1 : !!G.flags.bosses[g.id]; }
function questProgress(id) { const g = QUESTS[id].goal; if (g.type === 'deliver') return G.flags.qprog[id] ? 'delivered' : `bring it to ${g.to}`; return g.type === 'kill' ? `${Math.min(G.flags.qprog[id] || 0, g.n)}/${g.n}` : g.type === 'find' ? (G.flags.qitems[g.item] ? 'found' : `find it in the ${g.where}`) : (G.flags.bosses[g.id] ? 'slain' : 'not yet slain'); }
function questMarker(n) { // '!' = offers a quest or news, '?' = ready to turn in
  if (n.deliver && qstate(n.deliver) === 'active' && !questDone(n.deliver)) return '?'; // a delivery recipient
  if (n.quest) { const st = qstate(n.quest); return !st ? '!' : st === 'active' && questDone(n.quest) ? '?' : null; }
  return n.text && !G.flags.talked[`${G.map}:${n.x},${n.y}`] ? '!' : null;
}
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
function talk(npc) {
  sfx('click');
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
  typing = setInterval(() => { k++; const el = $('#tt'); if (!el) return finishTyping(); el.textContent = typingText.slice(0, k); if (k % 3 === 0) sfx('blip'); if (k >= typingText.length) finishTyping(); }, 28);
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
function guild() { B.guild = true; show(`<h2>⚔️ ${esc(mapDef().name)}</h2><div class="npc">${npcImg('guildmaster', 48)}<p>Every battle teaches a calling something, and what is learned stays learned. Change as you please; the road ahead won't wait.</p></div><div class="card menuparty">${G.party.map((c, i) => heroBtn(c, 'build', i)).join('')}</div><div class="foot">${btn('leave', 'Leave', '', '', 'primary')}</div>`); }
ACT.leave = () => { B.guild = false; hide(); };
function inn(npc) {
  const cost = npc.cost || 25;
  show(`<h2>🛏️ ${esc(mapDef().name)}</h2><div class="npc">${npcImg(npc.type || 'innkeeper', 48)}<p>${esc(fill(npcLines(npc).lines[0] || 'A bed for the night?'))}<br><small class="dim">Rest restores HP and MP, and saves your game.</small></p></div><div class="card"><div class="gilbox"><span>One night</span>${coin(cost + ' G')}</div><div class="gilbox"><span>You have</span>${coin(G.gold + ' G')}</div></div><div class="card menuparty">${G.party.map((c) => { const st = maxOf(c); return `<div class="slot">${portrait(ak(c), 'sm' + (c.hp <= 0 ? ' ko' : ''))}<div class="t"><b>${esc(c.name)}</b><div class="row" style="flex-wrap:nowrap"><small style="width:3em">HP</small><div class="grow">${bar(c.hp, st.hp, 'hp')}</div><small style="width:3em;text-align:right">MP</small><div class="grow">${bar(c.mp, st.mp || 1, 'mp')}</div></div></div></div>`; }).join('')}</div><div class="foot">${btn('rest', `${ic('bed')}Rest`, cost, '', 'primary', G.gold < cost)}${G.map === 'haven_inn' && G.flags.story.called && DATA.QUIZ ? btn('quiz', `${ic('quest')}Quiz Night`, '', '', '', G.flags.story.quizzed || G.gold < QUIZ_FEE) : ''}${btn('close', 'Leave')}</div>${G.map === 'haven_inn' && G.flags.story.quizzed ? '<p class="dim">Quiz Night is done for tonight. Sleep on it.</p>' : ''}`);
}
ACT.rest = (cost) => { sfx('rest'); G.flags.story.quizzed = false; G.gold -= +cost; for (const c of G.party) { const s = maxOf(c); c.hp = s.hp; c.mp = s.mp; } save(); draw(); show(`<h2>🛏️ Rested</h2><p>${ic('heart')} HP and MP restored.</p><p>${ic('save')} Game saved.</p><div class="foot">${btn('close', 'OK', '', '', 'primary')}</div>`); };

function socketer(msg = '') {
  show(`<h2>💎 Gem-wright</h2><div class="npc">${npcImg('merchant', 48)}<p>I bore extra sockets into a hero's gear so more gems fit on their skills. Each hero can take up to ${SOCKET_COST.length} more; the price rises with each one.</p></div><div class="card"><div class="gilbox"><span>You have</span>${coin(G.gold + ' G')}</div></div>${msg ? `<p class="gold">${msg}</p>` : ''}
  ${G.party.map((c, i) => { const n = c.extra || 0, cost = SOCKET_COST[n]; return `<div class="slot">${portrait(ak(c))}<div class="t"><b>${esc(c.name)}</b><small>${'◇'.repeat(gemCapacity(c))} ${gemCapacity(c)} sockets · bonus ${n}/${SOCKET_COST.length}</small></div>${n >= SOCKET_COST.length ? '<span class="dim">MAX</span>' : btn('addsock', `+1 ◇ ${cost} G`, i, '', '', G.gold < cost)}</div>`; }).join('')}<div class="foot">${btn('close', 'Leave', '', '', 'primary')}</div>`);
}
ACT.addsock = (i) => { const c = G.party[+i], n = c.extra || 0, cost = SOCKET_COST[n]; if (cost == null || G.gold < cost) return; G.gold -= cost; c.extra = n + 1; sfx('chest'); socketer(`${c.name} now has ${gemCapacity(c)} sockets.`); };

// ---------- Quiz Night at the Gilded Goose: five questions on the realm (QUIZ in data.js), once per night ----------
const QUIZ_FEE = 20, QUIZ_PRIZE = [[0, null, 'Barnaby: "Nil points. Brave, though."'], [0, null, 'Barnaby: "One. My goat could do one."'], [20, null, 'Barnaby: "Two. Your entry fee back, and my pity."'], [80, 'potion', 'Barnaby: "Three! Respectable. Have a potion on the house."'], [180, 'hipotion', 'Barnaby: "Four! The table by the fire is yours."'], [400, 'elixir', 'Barnaby: "FIVE! A clean sweep! Brenna, ring the... no. NO bells."']];
let QZ = null;
ACT.quiz = () => {
  if (G.flags.story.quizzed || G.gold < QUIZ_FEE) return;
  const pool = DATA.QUIZ.filter((x) => cond(x.if)).sort(() => Math.random() - 0.5).slice(0, 5);
  G.gold -= QUIZ_FEE; G.flags.story.quizzed = true; sfx('coin');
  QZ = { qs: pool.map((x) => ({ q: x.q, right: x.a[0], a: [...x.a].sort(() => Math.random() - 0.5) })), i: 0, score: 0, last: '' };
  quizScreen();
};
function quizScreen() {
  const z = QZ, x = z.qs[z.i];
  if (!x) {
    const [gold, item, line] = QUIZ_PRIZE[z.score]; G.gold += gold; if (item) G.inv.items[item] = (G.inv.items[item] || 0) + 1; sfx(z.score >= 4 ? 'levelup' : 'coin'); autosave();
    return show(`<h2>${ic('quest')} Quiz Night: ${z.score}/5</h2><div class="npc">${npcImg('barnaby', 48)}<p>${esc(line)}</p></div>${gold || item ? `<div class="card"><b class="gold">Prize: ${[gold ? gold + ' G' : '', item ? ITEMS[item].name : ''].filter(Boolean).join(' + ')}</b></div>` : ''}<div class="foot">${btn('close', 'Back to the bar', '', '', 'primary')}</div>`);
  }
  show(`<h2>${ic('quest')} Quiz Night · Q${z.i + 1}/5 <span class="dim">score ${z.score}</span></h2>${z.last ? `<p class="${z.last[0] === '✔' ? 'gold' : 'bad'}">${esc(z.last)}</p>` : ''}<div class="npc">${npcImg('barnaby', 48)}<p>${esc(x.q)}</p></div><div class="col">${x.a.map((a, k) => btn('qans', esc(a), k)).join('')}</div>`);
}
ACT.qans = (k) => {
  const z = QZ, x = z?.qs[z.i]; if (!x) return;
  const ok = x.a[+k] === x.right; if (ok) z.score++; sfx(ok ? 'coin' : 'click');
  z.last = ok ? '✔ Correct!' : `✘ It was: ${x.right}`; z.i++; quizScreen();
};
let shopTab = 'buy', curShop = null;
function shop(id, msg = '') {
  if (id) curShop = id;
  const def = SHOPS[curShop];
  const who = (id2) => `<span class="who">${G.party.map((c) => `<span class="face ${L.weaponOk(c, id2) ? '' : 'no'}" title="${esc(c.name)}"><img src="${UI.faceURL(ak(c))}" alt=""></span>`).join('')}${G.party.some((c) => L.weaponOk(c, id2)) ? '' : '<span class="bad">&nbsp;no one can use it</span>'}</span>`;
  const buyRows = Object.entries(def.stock).filter(([k]) => k !== 'gems' || gemsOn()).flatMap(([k, ids]) => ids.map((id2) => { const d = DB[k][id2]; return `<div class="slot"><span class="lead">${itemIc(k, id2)}</span><div class="t"><b>${d.name}</b><small>${gearDesc(k, d)}</small>${k === 'weapons' ? who(id2) : ''}</div>${btn('buy', shopPending === `${k}:${id2}` ? 'Tap to buy' : `${d.price} G`, k, id2, shopPending === `${k}:${id2}` ? 'primary' : '', G.gold < d.price)}</div>`; }));
  const sellRows = ['weapons', 'armors', 'accs', ...(gemsOn() ? ['gems'] : [])].flatMap((k) => [...new Set(G.inv[k])].map((id2) => { const d = DB[k][id2], p = Math.floor((d.price || 200) / 2); return `<div class="slot"><span class="lead">${itemIc(k, id2)}</span><div class="t"><b>${d.name} <span class="dim">×${G.inv[k].filter((x) => x === id2).length}</span></b></div>${btn('sell', `Sell ${p} G`, k, id2)}</div>`; })).concat(Object.entries(G.inv.items).filter(([, n]) => n > 0).map(([id2, n]) => `<div class="slot"><span class="lead">${itemIc('items', id2)}</span><div class="t"><b>${ITEMS[id2].name} <span class="dim">×${n}</span></b></div>${btn('sell', `Sell ${Math.floor(ITEMS[id2].price / 2)} G`, 'items', id2)}</div>`));
  show(`<h2>${def.title}</h2><div class="shophead">${npcImg(/smith/.test(curShop) ? 'smith' : 'merchant', 48)}<div class="shoptabs">${btn('tab', 'Buy', 'buy', '', shopTab === 'buy' ? 'sel' : '')}${btn('tab', 'Sell', 'sell', '', shopTab === 'sell' ? 'sel' : '')}</div><div class="gilbox">${coin(G.gold)}<span>G</span></div></div>${msg ? `<p class="gold">${msg}</p>` : ''}${(shopTab === 'buy' ? buyRows : sellRows).join('') || '<p class="dim">Nothing to sell.</p>'}<div class="foot">${btn('close', 'Leave', '', '', 'primary')}</div>`);
}
ACT.tab = (t) => { shopTab = t; shopPending = null; shop(); };
ACT.buy = (k, id) => { // gear takes a second tap to buy (an easy mis-tap costs a lot), then offers to equip it on the spot
  const d = DB[k][id]; if (G.gold < d.price) return;
  if (k !== 'items' && shopPending !== `${k}:${id}`) { shopPending = `${k}:${id}`; sfx('click'); return shop(); }
  shopPending = null; G.gold -= d.price; sfx('coin'); if (k === 'items') G.inv.items[id] = (G.inv.items[id] || 0) + 1; else G.inv[k].push(id);
  const field = { weapons: 'weapon', armors: 'armor', accs: 'acc' }[k], can = field ? G.party.map((c, i) => [c, i]).filter(([c]) => (k !== 'weapons' || L.weaponOk(c, id)) && c[field] !== id) : [];
  shop(null, `Bought ${d.name}.${can.length ? `<span class="equipnow"><small>Equip now:</small>${can.map(([c, i]) => btn('shopequip', `<img src="${UI.faceURL(ak(c))}" alt="">${esc(c.name)}${c[field] ? ` <small class="dim">(${esc(DB[k][c[field]].name)})</small>` : ''}`, k, `${id}|${i}`)).join('')}</span>` : ''}`);
};
let shopPending = null;
ACT.shopequip = (k, x) => {
  const [id, i] = x.split('|'), c = G.party[+i], field = { weapons: 'weapon', armors: 'armor', accs: 'acc' }[k]; if (!c || !G.inv[k].includes(id)) return shop();
  if (c[field]) G.inv[k].push(c[field]); G.inv[k].splice(G.inv[k].indexOf(id), 1); c[field] = id; sanitize(c, G.inv); sfx('chest');
  shop(null, `${esc(c.name)} equips the ${DB[k][id].name}.`);
};
ACT.sell = (k, id) => {
  const d = DB[k][id], p = Math.floor((d.price || 200) / 2);
  if (k === 'items') G.inv.items[id]--; else G.inv[k].splice(G.inv[k].indexOf(id), 1);
  G.gold += p; sfx('coin'); shop(null, `Sold ${d.name}.`);
};

// ---------- title / main menu ----------
function title() {
  G = null; optBack = 'title';
  show(`<div class="tagline">Two brothers. Two beards. One bell they really shouldn't have rung.</div>
  <div class="titlecmd">${btn('new', `${ic('star')}New Game`, '', '', 'primary')}${btn('cont', `${ic('save')}Continue`, '', '', '', !anySave())}${btn('opts', `${ic('options')}Options`)}</div>`, 'title');
  ov.insertAdjacentHTML('beforeend', `<div class="ver">v${VERSION} · made in code</div>`);
  $('#loc').textContent = ''; $('#gold').textContent = ''; music('title');
}
let slotMode = 'new', pendingSlot = null, pendingDel = null;
function slotScreen(mode) {
  slotMode = mode; const fmt = (ms) => new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  show(`<h2>${mode === 'new' ? '💾 New Game: pick a slot' : '💾 Continue'}</h2>${SLOT_IDS.map((i) => {
    const d = readSlot(i), g = d?.G;
    if (!g) return `<div class="slot"><span class="lead">${ic('save')}</span><div class="t"><b>Slot ${i}</b><small>Empty</small></div>${mode === 'new' ? btn('slotpick', 'Start here', i, '', 'primary') : '<span class="dim">—</span>'}</div>`;
    const where = g.map === 'world' ? 'Overworld' : MAPS[g.map]?.name || '?', bosses = ['wyrm', 'lich', 'titan'].filter((k) => g.flags?.bosses?.[k]).length;
    return `<div class="slot"><div class="t"><b>Slot ${i} <span class="chip tag">${DIFFICULTY[g.difficulty]?.name || 'Normal'}</span></b><div class="who">${(g.party || []).map((c) => `<span class="face" title="${esc(c.name)}"><img src="${UI.faceURL(ak(c))}" alt=""></span><small>${c.level}</small>`).join(' ')}</div><small>${ic('pin')} ${esc(where)}<br>${ic('trophy')} ${bosses}/3 evils slain · ${fmtTime(g.playtime)}<br>${fmt(d.savedAt)}</small></div>
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
  const icn = { easy: 'heart', normal: 'sword', hard: 'ko' };
  show(`<h2>⚔️ Choose difficulty</h2>${['normal', 'easy', 'hard'].map((k) => `<div class="slot"><span class="lead">${ic(icn[k])}</span><div class="t"><b>${DIFFICULTY[k].name}</b><small>${DIFFICULTY[k].desc}</small></div>${btn('diff', 'Select', slot, k, k === 'normal' ? 'primary' : '')}</div>`).join('')}<p class="dim">${ic('tip')} You can change this later in Options.</p><div class="foot">${btn('new', 'Back')}</div>`);
}
ACT.diff = (slot, d) => { newGame(); G.slot = +slot; G.difficulty = d; G.flags.visited.haven = true; snap(); prologue(0); };
// ---------- prologue: quiz night at The Bell & Anvil, 2026 (illustrations in pubart.js) ----------
const pubImg = (v) => { try { return `<img class="pubart" src="${PA.pubURL(v, 1)}" alt="">`; } catch { return ''; } };
function prologue(i) {
  if (i >= PUB.length) return ACT.crbegin();
  const [v, head, text] = PUB[i];
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
const STAT_KEYS = [['hp', 'HP'], ['mp', 'MP'], ['atk', 'ATK'], ['def', 'DEF'], ['mag', 'MAG'], ['spd', 'SPD']];
let CR = [];
const BRO_PICKS = { adam: 'knight', devon: 'monk' };
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
function loadSlot(i) {
  const d = readSlot(i); if (!d?.G) return;
  G = migrate(d.G); G.slot = i; snap(); music(musicFor()); hide(); banner(mapDef().name); toast(`Loaded slot ${i}`);
}
// ---------- party chat (menu > CHAT): skits about where you are and what just happened (STORY.chat) ----------
function chatHere(at) { // how well a skit's place fits: 2 = this map, 1 = this region / kind of place, 0 = anywhere, -1 = elsewhere
  if (!at) return 0; const m = mapDef(), [k, v] = at.includes(':') ? at.split(':') : ['map', at];
  return k === 'map' ? (G.map === v ? 2 : -1) : k === 'region' ? (regionOf() === v ? 1 : -1) : k === 'kind' ? (m.kind === v ? 1 : -1) : -1;
}
function pickChat() {
  const ok = (STORY.chat || []).map((c) => ({ c, w: chatHere(c.at) })).filter(({ c, w }) => w >= 0 && cond(c.if) && c.lines.some((l) => !PEOPLE.has(l.s) || G.party.some((p) => p.look === l.s)));
  const fresh = ok.filter(({ c }) => !G.flags.chat[c.id]).sort((a, b) => b.w - a.w);
  if (fresh.length) return fresh[0].c;
  const idle = STORY.chatIdle || []; return idle.length ? { id: '', lines: idle[Math.floor(Math.random() * idle.length)] } : null;
}
ACT.chat = async () => {
  const c = pickChat(); if (!c) return hide();
  if (c.id) G.flags.chat[c.id] = true;
  await scene(c.lines);
};
function mainMenu() {
  const menuTip = tipOnce('menu') ? 'TIP: pick a hero, then Edit a skill slot to socket gems. Gems rewrite how a skill works.' : '';
  const cmds = [['items', 'ITEM', 'bag'], ['chat', 'CHAT', 'hero'], ['mapscreen', 'MAP', 'map'], ['journal', 'JOURNAL', 'journal'], ['bestiary', 'BESTIARY', 'bestiary'], ['opts', 'OPTIONS', 'options'], ['save', 'SAVE', 'save'], ['title', 'TITLE', 'title'], ['close', 'CLOSE', 'close']];
  show(`<div class="menugrid"><div class="menuside"><div class="pane menucmd"><div class="cmdlist">${cmds.map(([a, l, n]) => btn(a, ic(n) + l, '', '', a === 'close' ? 'primary' : '')).join('')}</div></div>
  <div class="pane menuinfo"><span class="dim">TIME</span><span>${fmtTime(G.playtime)}</span><span class="dim">WINS</span><span>${G.stats?.wins || 0}</span><span class="g">${ic('coin')}GOLD</span><span class="gold">${G.gold}</span></div></div>
  <div class="pane menuparty">${G.party.map((c, i) => heroBtn(c, 'build', i)).join('')}</div></div>
  ${menuTip ? `<div id="msg" class="pane">${ic('tip')} ${menuTip}</div>` : '<div id="msg"></div>'}`, '', 'multi');
}
const fmtTime = (sec = 0) => { sec = Math.floor(sec); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s2 = sec % 60; return `${h}:${String(m).padStart(2, '0')}:${String(s2).padStart(2, '0')}`; };
ACT.bestiary = () => {
  const ids = Object.keys(ENEMIES), seen = ids.filter((id) => G.flags.bestiary[id]);
  const els = (l) => l.map((w) => UI.elemIcon(w)).join('') || '<span class="dim">—</span>';
  show(`<h2>📖 Bestiary</h2><p class="dim">Foes discovered: <b class="gold">${seen.length}/${ids.length}</b>. Defeat a creature to learn its weaknesses.</p><div class="grid">${ids.map((id) => {
    const r = G.flags.bestiary[id], d = ENEMIES[id];
    if (!r) return '';
    return `<div class="card beast"><div class="bh"><span class="bimg"><img src="${SP.enemyURL(id)}" alt=""></span><div><div class="bn">${d.name}</div>${d.boss ? `<span class="chip tag">${ic('trophy')} Boss</span>` : ''}<div class="dim">Defeated ${r.kills}</div></div></div><div>HP <b>${foeStat(d, 'hp')}</b> · ATK <b>${foeStat(d, 'atk')}</b> · MAG <b>${foeStat(d, 'mag')}</b></div>${r.kills ? `<div>WEAK ${els(d.weak)}&nbsp; RES ${els(d.res)}</div>` : '<div class="dim">Weaknesses unknown</div>'}${r.kills && DROPS[id]?.common ? `<div>${[DROPS[id].common, DROPS[id].rare].filter(Boolean).map(([k, did], j) => (j ? (r.got?.[did] ? `<span class="gold">${ic('star')}${itemIc(k, did)} ${DB[k][did].name}</span>` : `<span class="dim">${ic('star')} ???</span>`) : `${itemIc(k, did)} ${DB[k][did].name}`)).join('<br>')}</div>` : ''}</div>`;
  }).join('')}</div>${ids.length - seen.length ? `<div class="card dim" style="text-align:center">❔ ${ids.length - seen.length} more creatures are still undiscovered</div>` : ''}<div class="foot">${btn('menu', 'Back', '', '', 'primary')}</div>`);
};
ACT.title = title;
ACT.save = () => { const m = $('#msg'); m.className = 'pane'; m.textContent = save() ? `GAME SAVED TO SLOT ${G.slot}.` : 'COULD NOT SAVE (STORAGE FULL OR BLOCKED).'; };

// ---------- map screen, journal, options ----------
ACT.mapscreen = () => {
  const m = mapDef();
  if (!m.fog) { show(`<h2>🗺 Map</h2><p class="dim">There's nothing to chart indoors. Step outside or into a dungeon to see the map.</p><div class="foot">${btn('menu', 'Back', '', '', 'primary')}</div>`); return; }
  const W = m.rows[0].length, H = m.rows.length, sc = Math.max(4, Math.min(Math.floor(560 / W), Math.floor(380 / H)));
  const places = (m.places || []).filter(([x, y]) => G.flags.seen[G.map]?.[y]?.[x] === '1');
  show(`<h2>🗺 ${esc(m.name)}</h2><canvas id="bigmap" width="${W * sc}" height="${H * sc}" class="px framed" style="max-width:${W * sc + 8}px;margin:0 auto"></canvas>
  <div class="dim">${G.map === 'world' ? 'The blinking frame is your party. Dark areas are still unexplored.' : 'White blinking square = you · gold = exits · red = the boss · tan = unopened chests (once seen).'} Press <b>N</b> on the map to toggle the minimap.</div>
  ${places.length ? `<h3>Discovered</h3><div>${places.map((p) => `<span class="chip tag">${ic('pin')}${esc(p[2])}</span>`).join('')}</div>` : ''}<div class="foot">${btn('menu', 'Back', '', '', 'primary')}</div>`);
  const c2 = $('#bigmap').getContext('2d'); c2.imageSmoothingEnabled = false;
  const art = G.map === 'world' && TR.mapImage ? TR.mapImage(m) : null, seen = G.flags.seen[G.map] || [];
  const paint = () => {
    if (!$('#bigmap')) return; const t2 = performance.now() / 1000; c2.clearRect(0, 0, W * sc, H * sc);
    if (!art) drawMini(c2, G.map, sc, 0, 0, t2);
    else { // the painted world, with unexplored tiles left in shadow
      c2.drawImage(art, 0, 0, W * sc, H * sc); c2.fillStyle = 'rgba(4,6,20,.93)';
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (seen[y]?.[x] !== '1') c2.fillRect(x * sc, y * sc, sc, sc);
      if (Math.floor(t2 * 3) % 2 === 0) { c2.strokeStyle = '#ffffff'; c2.lineWidth = 2; c2.strokeRect(G.x * sc - 2, G.y * sc - 2, sc + 4, sc + 4); }
    }
    requestAnimationFrame(paint);
  }; paint();
};
const OBJECTIVES = [ // the main thread, in the story's voice. show / after / done are conditions (see cond()); hints switch once done
  { title: 'The Goose Cellar', show: '!s:called', hint: 'Elder Mott wants proof you can throw a punch. Clear the slimes out of the Gilded Goose\'s cellar: the trapdoor is in the tavern\'s corner.', done: 's:cellar', doneHint: 'Big Gary is foam. Brenna has joined, mostly out of pity.' },
  { title: 'Get a Proper Job', show: 's:cellar !s:called', hint: 'The Adventurer\'s Guild in Haven hands out callings. Apparently "content creator" isn\'t one.', done: 's:called', doneHint: 'Employed at last.' },
  { title: 'Get Home', show: 's:called', hint: 'Elder Mott reckons the bell will only ring for you again once Gemforge\'s three evils are slain. Devon\'s phone is on 3%.', done: 'titan', doneHint: 'The bell is ringing.' },
  { title: 'The Ashen Wyrm', show: 's:called', hint: 'The Elder says its seal is the weakest. The Ashen Cavern lies east of Haven.', done: 'wyrm', doneHint: 'Slain. Its heart is yours, and the northern pass is open.' },
  { title: 'The Drowned King', show: 's:called', hint: 'Morvath stirs in the Sunken Crypt, out in the marsh south of Haven.', done: 'lich', doneHint: 'Slain. Mirewood keeps its lamps lit again.' },
  { title: 'The Grey Hand', show: 'wyrm|lich', hint: 'The seals were not broken. They were cut. Who would free such things?', done: 's:met', doneHint: 'Sereth, last apprentice of Gemforge. He wants the hearts.' },
  { title: 'North', after: 'wyrm', hint: 'The pass is open. Frostholm lies beyond it.', done: 'v:frostholm', doneHint: 'Frostholm stands in the shadow of the Frost Spire.' },
  { title: 'The Walking Mountain', after: 'wyrm lich', lockHint: 'The Frost Spire\'s door is sealed with the drowned king\'s mark. Morvath first.', hint: 'The Frost Spire rises north-east of Frostholm. The Titan waits at its summit.', metHint: 'Sereth waits atop the Frost Spire. So does the Titan.', done: 'titan', doneHint: 'The mountain sleeps. Sereth is dust.' },
  { title: 'Thunder on the Plains', after: 'wyrm', optional: true, hint: 'A drake nests in the Storm Cavern on the Northern Plains. Not for the faint (Lv 11+).', done: 'storm_drake', doneHint: 'Stars over the plains again.' },
  { title: 'The Sun Pharaoh', optional: true, hint: 'Something asks riddles beneath the Sunscar Ruins, south-east of Haven (Lv 11+).', done: 'sphinx', doneHint: 'The riddle is answered.' },
];
ACT.journal = () => {
  const n = ['wyrm', 'lich', 'titan'].filter((k) => G.flags.bosses[k]).length, hearts = Object.keys(KEY_ITEMS).filter((k) => G.flags.qitems[k]).map((k) => KEY_ITEMS[k]);
  const secrets = Object.entries(MAPS).flatMap(([mid, m]) => Object.keys(m.secrets || {}).map((k) => `${mid}:${k}`)), found = secrets.filter((k) => G.flags.chests[k]).length;
  show(`<h2>📜 Journal</h2><p class="dim">Great evils slain: <b class="gold">${n}/3</b> · Hidden treasures: <b class="gold">${found}/${secrets.length}</b>${hearts.length ? `<br>Carried: <b class="gold">${hearts.join(', ')}</b>` : ''}</p>${OBJECTIVES.filter((o) => cond(o.show)).map((o) => { const dn = cond(o.done), locked = !cond(o.after); return `<div class="card ${dn ? 'done' : ''}"><b>${dn ? '✔' : locked ? '🔒' : '◇'} ${o.optional ? '<span class="dim">Optional:</span> ' : ''}${o.title}</b><div class="dim">${locked ? o.lockHint || 'A rockslide buries the northern pass.' : dn ? o.doneHint : o.metHint && cond('s:met') ? o.metHint : o.hint}</div></div>`; }).join('')}
  <h3>Side quests</h3>${(() => { const act = Object.entries(QUESTS).filter(([id]) => qstate(id) === 'active'), dn = Object.entries(QUESTS).filter(([id]) => qstate(id) === 'done');
    return (act.length ? act.map(([id, q]) => `<div class="card ${questDone(id) ? 'done' : ''}"><b>${questDone(id) ? '❓' : '◇'} ${esc(q.title)}</b> <span class="dim">(${questProgress(id)})</span><div class="dim">${questDone(id) ? 'Return to ' + esc(q.giver) + ' to claim your reward.' : esc(q.lines.active[0])}</div></div>`).join('') : '<div class="dim">No active quests. Folk in town sometimes need a hand.</div>') + (dn.length ? `<div class="dim">Completed: ${dn.map(([, q]) => '✔ ' + esc(q.title)).join(' · ')}</div>` : ''); })()}
  <h3>💡 Tips</h3><div class="dim">${gemsOn() ? `• Gems rewrite skills: try ${GEMS.wide.name} + a heal, ${GEMS.echo.name} on a big spell, ${GEMS.stun.name} on a fast skill.<br>` : ''}• Battles earn CP for each hero's calling; ranks teach abilities that are kept for good. Change callings from the menu.<br>• Inns heal and save. Frostholm's shops sell much better gear.<br>• Hermits and oracles roam the wilds. Listen to them, and watch the ground for a faint glint of buried treasure.</div><div class="foot">${btn('menu', 'Back', '', '', 'primary')}</div>`);
};
let optBack = 'menu';
function optionsScreen() {
  const onOff = (v) => (v ? 'On' : 'Off');
  show(`<h2>⚙ Options</h2>
  <div class="opt"><label>${ic('sound')} Music volume <b>${Math.round(OPT.music * 100)}%</b></label><input type="range" min="0" max="100" value="${Math.round(OPT.music * 100)}" data-in="music"></div>
  <div class="opt"><label>${ic('sound')} Sound effects <b>${Math.round(OPT.sfx * 100)}%</b></label><input type="range" min="0" max="100" value="${Math.round(OPT.sfx * 100)}" data-in="sfx"></div>
  <div class="opts">${G ? btn('optdiff', `<span>Difficulty</span><b>${DIFFICULTY[G.difficulty].name}</b>`) : ''}${btn('optspeed', `<span>Battle speed</span><b>${OPT.speed}</b>`)}${btn('optmini', `<span>Minimap</span><b>${onOff(OPT.minimap)}</b>`)}${btn('optshake', `<span>Screen shake</span><b>${onOff(OPT.shake)}</b>`)}${btn('optmute', `<span>${ic(isMuted() ? 'mute' : 'sound')}Sound</span><b>${isMuted() ? 'Muted' : 'On'}</b>`)}</div>
  <h3>Controls</h3><div class="dim controls"><div><b>Arrows / WASD</b> move</div><div><b>Esc / M</b> menu</div><div><b>N</b> toggle minimap</div><div><b>Arrows</b> move menu focus</div><div><b>Enter / Space</b> select</div><div><b>Esc / Backspace</b> back</div></div>
  ${IS_IOS && !root.classList.contains('standalone') && !root.classList.contains('framed') ? '<div class="card"><b>📱 Install on iPhone</b><div class="dim">In Safari tap Share, then <b>Add to Home Screen</b>. Gemforge then runs full-screen, works offline, and remembers your saves.</div></div>' : ''}
  <div class="foot"><span class="dim grow" style="font-size:8px;align-self:center">Bearded Bros v${VERSION}</span>${btn('optback', 'Back', '', '', 'primary')}</div>`);
}
ACT.opts = () => optionsScreen();
ACT.optback = () => (optBack === 'title' && !G ? title() : mainMenu());
ACTIN.music = (v) => { OPT.music = v / 100; applyOptions(); ov.querySelector('[data-in=music]').previousElementSibling.querySelector('b').textContent = `${v}%`; };
ACTIN.sfx = (v) => { OPT.sfx = v / 100; applyOptions(); ov.querySelector('[data-in=sfx]').previousElementSibling.querySelector('b').textContent = `${v}%`; sfx('click'); };
ACT.optdiff = () => { const k = Object.keys(DIFFICULTY); G.difficulty = k[(k.indexOf(G.difficulty) + 1) % k.length]; optionsScreen(); };
ACT.optspeed = () => { const k = Object.keys(SPEEDS); OPT.speed = k[(k.indexOf(OPT.speed) + 1) % k.length]; applyOptions(); optionsScreen(); };
ACT.optmini = () => { OPT.minimap = !OPT.minimap; applyOptions(); optionsScreen(); };
ACT.optshake = () => { OPT.shake = !OPT.shake; applyOptions(); optionsScreen(); };
ACT.optmute = () => { setMuted(!isMuted()); syncMute(); optionsScreen(); };

// ---------- items (field use) ----------
function itemsMenu(msg = '') {
  const it = Object.entries(G.inv.items).filter(([, n]) => n > 0);
  show(`<h2>🎒 Items</h2><div class="card"><div class="gilbox"><span>Gold</span>${coin(G.gold + ' G')}</div></div>${msg ? `<p class="gold">${msg}</p>` : ''}${it.length ? it.map(([id, n]) => `<div class="slot"><span class="lead">${itemIc('items', id)}</span><div class="t"><b>${ITEMS[id].name} <span class="dim">×${n}</span></b><small>${ITEMS[id].desc}</small></div>${btn('useitem', 'Use', id)}</div>`).join('') : '<p class="dim">No consumables.</p>'}
  ${G.party.some((c) => c.look === 'devon') ? `<h3>Key items</h3><div class="slot"><span class="lead">${ic('tip')}</span><div class="t"><b>Devon's Phone</b><small>${G.flags.story.charged ? '4% battery! No signal.' : '3% battery. No signal. Never changes.'}</small></div>${btn('phone', 'Use', '', '')}</div>` : ''}
  ${gemsOn() ? `<h3>💎 Gems (${G.inv.gems.length})</h3><div>${G.inv.gems.map((g) => gemChip(g)).join('') || '<span class="dim">none</span>'}</div>` : G.inv.gems.length ? `<h3>Oddments</h3><div class="dim">Dull Stone ×${G.inv.gems.length}</div>` : ''}
  <div class="foot">${btn('menu', 'Back', '', '', 'primary')}</div>`);
}
ACT.items = () => itemsMenu(); ACT.menu = mainMenu;
ACT.phone = async () => { // Devon's phone: still 3%, still no signal, a different joke each time
  const jokes = G.flags.story.charged ? [...PHONE_CHARGED, ...PHONE.slice(1)] : PHONE, n = (G.flags.story.phone || 0) % jokes.length; G.flags.story.phone = n + 1; sfx('blip');
  await scene(jokes[n]);
};
ACT.useitem = (id) => {
  show(`<h2>${itemIc('items', id)} Use ${ITEMS[id].name} on…</h2><div class="card menuparty">${G.party.map((c, i) => heroBtn(c, 'useon', id, i)).join('')}</div><div class="foot">${btn('items', 'Back', '', '', 'primary')}</div>`);
};
ACT.useon = (id, i) => {
  const c = G.party[i], it = ITEMS[id], s = maxOf(c); let ok = false;
  if (it.revive && c.hp <= 0) { c.hp = Math.round(s.hp * it.revive); ok = true; }
  else if (c.hp > 0 && it.heal && c.hp < s.hp) { c.hp = Math.min(s.hp, c.hp + it.heal); ok = true; }
  else if (c.hp > 0 && it.mpr && c.mp < s.mp) { c.mp = Math.min(s.mp, c.mp + it.mpr); ok = true; }
  if (ok) G.inv.items[id]--;
  itemsMenu(ok ? `${esc(c.name)} ${it.verb || 'uses'} ${it.art || 'a'} ${it.name}.` : 'No effect.');
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
  const s = stats(c), m = JOBS[c.main], sj = c.sub ? JOBS[c.sub] : null, cap = gemCapacity(c), used = gemsUsed(c);
  const gearRow = (label, view, id, kind) => `<div class="slot"><span class="lead">${id ? itemIc(kind, id) : ic({ weapons: 'fists', armors: 'armor', accs: 'ring' }[kind], 'dimic')}</span><div class="t"><b><span class="dim">${label}</span> ${id ? DB[kind][id].name : `<span class="dim">— ${kind === 'weapons' ? 'unarmed' : 'none'} —</span>`}</b><small>${id ? gearDesc(kind, DB[kind][id]) : kind === 'weapons' ? 'Fighting bare-handed. Buy a weapon at the hardware shop.' : ''}</small></div>${btn('bview', 'Change', view)}</div>`;
  const slotRow = (i) => {
    const sid = slotSkill(c, i), gems = slotGems(c, i);
    const m2 = sid ? skillWithGems(sid, gems) : null;
    return `<div class="slot"><span class="lead">${m2 ? ic(i === SIG ? 'star' : UI.skillIconName(m2)) : ic('socket')}</span><div class="t"><b><span class="dim">${i === SIG ? 'Weapon' : `Slot ${i + 1}`}</span> ${sid ? `${m2.name} ${gemsOn() ? gems.map((g) => gemChip(g, true)).join('') : ''}` : '<span class="dim">— empty —</span>'}</b><small>${m2 ? describeSkill(m2) : ''}</small></div>${btn('bslot', 'Edit', i)}</div>`;
  };
  const xpN = expNeeded(c.level), maxed = c.level >= L.MAX_LEVEL;
  show(`<div class="buildhead">${btn('bnav', ic('aleft'), -1, '', 'navbtn')}<div class="who2">${portrait(ak(c), 'lg')}<div><h2 style="background:none;padding:0;margin:0">${esc(c.name)}</h2><div class="lv">LV ${c.level}</div></div></div>${btn('bnav', ic('aright'), 1, '', 'navbtn')}</div>
  <div class="expline"><span>EXP</span>${bar(maxed ? 1 : c.exp, maxed ? 1 : xpN, 'xp')}<span>${maxed ? 'MAX' : `${c.exp}/${xpN}`}</span></div>
  <div class="card">${callingCard(c)}${statLine(s)}</div>
  <h3>Equipment</h3>${gearRow('Weapon', 'weapon', c.weapon, 'weapons')}${gearRow('Armor', 'armor', c.armor, 'armors')}${gearRow('Acc.', 'acc', c.acc, 'accs')}
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
    ${own || spare.length ? `<div class="jobrow"><span>${ic('star')}<span><span class="dim">TRAIT</span> ${own ? `${traitName(own)}${c.trait && c.trait !== own ? ` + ${traitName(c.trait)}` : ''}` : c.trait ? traitName(c.trait) : '<span class="dim">— none —</span>'}</span></span>${spare.length ? btn('bview', 'Set', 'trait') : ''}</div>` : ''}
    <div class="jobrow"><span>${ic('scroll')}<span><span class="dim">CALLINGS</span> ${Object.keys(c.cp || {}).length} learned${L.mastered(c).length ? ` · <span class="gold">${L.mastered(c).length}★</span>` : ''}</span></span>${btn('bview', 'View', 'callings')}</div>`;
}
const nextAbility = (c, j) => { const r = L.rankOf(c, j), n = [...JOBS[j].skills.map(([id, k]) => [SKILLS[id].name, k]), ...(JOBS[j].trait ? [[TRAITS[JOBS[j].trait[0]].name, JOBS[j].trait[1]]] : [])].filter(([, k]) => k === r + 1); return n.length ? n.map((x) => x[0]).join(', ') : ''; };
function jobPick(which) {
  const c = G.party[B.i], list = which === 'main' ? unlockedJobs() : Object.keys(JOBS).filter((j) => L.secondOk(c, j));
  show(`<h2>${which === 'main' ? 'Calling' : 'Second calling'} · ${esc(c.name)}</h2>${which === 'sub' ? `<div class="slot"><span class="lead">${ic('socket')}</span><div class="t"><b>None</b></div>${btn('setjob', 'Clear', which, '', '', !c.sub)}</div>` : ''}${list.map((id) => {
    const j = JOBS[id], r = L.rankOf(c, id), now = c[which] === id, learned = L.jobSkills(id, r), nx = nextAbility(c, id);
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
  const from = (t) => JOBS[Object.keys(JOBS).find((j) => JOBS[j].trait?.[0] === t)].name;
  show(`<h2>Trait · ${esc(c.name)}</h2>${own ? `<div class="slot"><span class="lead">${ic('star')}</span><div class="t"><b>${traitName(own)} <span class="chip tag">${JOBS[c.main].name}</span></b><small>${TRAITS[own].desc} Always on.</small></div></div>` : ''}
  <div class="slot"><span class="lead">${ic('socket')}</span><div class="t"><b>None</b></div>${btn('settrait', 'Clear', '', '', '', !c.trait)}</div>${list.map((t) => `<div class="slot ${c.trait === t ? 'sel' : ''}"><span class="lead">${ic('star')}</span><div class="t"><b>${traitName(t)} <span class="dim">${from(t)}</span></b><small>${TRAITS[t].desc}</small></div>${btn('settrait', 'Set', t, '', '', c.trait === t)}</div>`).join('')}
  <div class="foot">${btn('bmain', 'Back', '', '', 'primary')}</div>`);
}
ACT.settrait = (t) => { const c = G.party[B.i]; c.trait = t || null; sanitize(c, G.inv); B.view = 'main'; buildScreen(); };
function callingsView() { // every awakened calling: rank stars, abilities learned, the next one (later ones stay unseen)
  const c = G.party[B.i];
  show(`<h2>Callings · ${esc(c.name)}</h2>${unlockedJobs().map((id) => {
    const j = JOBS[id], r = L.rankOf(c, id), got = [...L.jobSkills(id, r).map((x) => SKILLS[x].name), ...(L.jobTrait(id, r) ? [traitName(L.jobTrait(id, r))] : [])], nx = nextAbility(c, id);
    const master = r >= L.MAX_RANK ? ` · <span class="gold">★ ${Object.entries(j.master).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(' ')}</span>` : '';
    return `<div class="slot callrow ${id === c.main ? 'sel' : ''}">${portrait(akj(c, id), r ? '' : 'ko')}<div class="t"><b>${j.name} ${stars(c, id)}${id === c.main ? ' <span class="chip tag">NOW</span>' : id === c.sub ? ' <span class="chip tag">2ND</span>' : ''}</b><small>${got.length ? got.join(' · ') : '<span class="dim">Not yet taken up.</span>'}${nx ? ` <span class="dim">→ ${nx}${r ? ` (${L.cpToNext(c, id)} CP)` : ''}</span>` : ''}${master}</small></div></div>`;
  }).join('')}<div class="foot">${btn('bmain', 'Back', '', '', 'primary')}</div>`);
}
function gearPick(kind) {
  const c = G.party[B.i], field = { weapons: 'weapon', armors: 'armor', accs: 'acc' }[kind];
  const uniq = [...new Set(G.inv[kind])];
  show(`<h2>${ic({ weapons: 'sword', armors: 'armor', accs: 'ring' }[kind])} ${esc(c.name)}: ${field}</h2>${c[field] ? `<div class="slot"><span class="lead">${itemIc(kind, c[field])}</span><div class="t"><b><span class="dim">NOW</span> ${DB[kind][c[field]].name}</b></div>${btn('equip', 'Unequip', kind, '')}</div>` : ''}${uniq.map((id) => {
    const g = DB[kind][id], ok = kind !== 'weapons' || L.weaponOk(c, id);
    const now = stats(c), after = stats({ ...c, [field]: id }), delta = ok ? ['atk', 'mag', 'def', 'hp', 'mp', 'spd'].filter((k) => after[k] !== now[k]).map((k) => `<span class="${after[k] > now[k] ? 'up' : 'down'}">${after[k] > now[k] ? '▲' : '▼'}${Math.abs(after[k] - now[k])} ${k}</span>`).join(' ') : '';
    return `<div class="slot"><span class="lead">${itemIc(kind, id)}</span><div class="t"><b>${g.name} <span class="dim">×${G.inv[kind].filter((x) => x === id).length}</span></b><small>${gearDesc(kind, g)}${ok ? '' : ' · <span class="bad">job can\'t use</span>'}</small>${delta ? `<div class="delta">${delta}</div>` : ''}</div>${btn('equip', 'Equip', kind, id, '', !ok)}</div>`;
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
  const i = B.slot, sid = slotSkill(c, i), gems = c.gems[i], inn = i === SIG ? slotGems(c, i).filter((g) => !gems.includes(g) || WEAPONS[c.weapon]?.innate === g)[0] : null;
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


// ---------- battle ----------
let BT = null;
// a foe's stat as you'd meet it now: difficulty, and (outside boss fights) the small-party scaling
const foeStat = (d, k) => { const m = DIFFICULTY[G.difficulty || 'normal'].mod, ps = !d.boss && PARTY_SCALE[G.party.length]; return Math.round(d[k] * (m[k] ?? 1) * (ps ? (k === 'hp' ? ps.hp : ps.atk) : 1)); };
function stageKind(bossId) {
  if (bossId) return { big_gary: 'cellar', wyrm: 'boss', lich: 'crypt', storm_drake: 'storm', sphinx: 'ruins' }[bossId] || 'spire';
  const m = mapDef();
  if (m.kind === 'dungeon') return m.theme === 'cavern' ? 'dungeon' : m.theme;
  const r = regionOf(), woods = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b2]) => tileAt(G.x + a, G.y + b2) === 'T'); // fighting at a forest's edge
  return r === 'snow' ? 'snow' : r === 'swamp' ? 'swamp' : r === 'desert' ? 'desert' : woods ? 'forest' : 'world';
}
async function battle(groupIds, bossId = null) {
  if (BT || busy) return; // never run two battles at once (BT is only set after the start-of-battle wipe, so check busy too)
  try { await battleInner(groupIds, bossId); } catch (err) { // never leave the player stuck in a broken battle
    console.error(err); try { BT?.stage?.stop(); } catch {} BT = null; busy = false; trans = 0; hide(); music(musicFor()); toast('⚠ Battle error: back to the map', 3500);
  }
}
async function battleInner(groupIds, bossId = null) {
  busy = true;
  const mod = { ...DIFFICULTY[G.difficulty || 'normal'].mod }, ps = !bossId && PARTY_SCALE[G.party.length];
  if (ps) { mod.hp *= ps.hp; mod.atk *= ps.atk; mod.mag *= ps.atk; }
  const b = new Battle(G.party, groupIds, Math.random, !!bossId, mod);
  await transition(); music(bossId ? 'boss' : 'battle');
  BT = { b, boss: bossId, logBig: false, log: [bossId ? BOSSES[bossId].intro : `${b.e.map((e) => e.name).join(', ')} ${b.e.length > 1 ? 'appear' : 'appears'}!`], ask: null };
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
  BT.stage.stop(); trans = 0;
  b.p.forEach((x) => { x.ch.hp = x.hp; x.ch.mp = x.mp; });
  if (b.over === 'fled') { sfx('flee'); const q = quip('flee', 0.6); if (q) toast(q.replace(/<[^>]+>/g, ''), 2600); }
  if (b.over === 'win') await victory(b, bossId);
  else if (b.over === 'lose') await defeat();
  else { hide(); }
  BT = null; busy = false; if (G) { if (b.over !== 'lose') music(musicFor()); draw(); if (b.over === 'win') autosave(); }
}
function renderBattle() {
  const { b, ask } = BT;
  const order = b.order().map((x) => `<img class="px o-${x.side} ${ask?.p === x ? 'cur' : ''} ${x.side === 'e' && SP.isBig(x.id) ? 'big' : ''}" title="${esc(x.name)}" src="${x.side === 'p' ? UI.faceURL(ak(x.ch)) : SP.enemyURL(x.id)}" alt="${esc(x.name)}">`).join('');
  const icons = (list) => list.map((w) => UI.elemIcon(w)).join('');
  const line = (l) => `<div>${UI.deco(esc(l))}</div>`;
  const groups = []; for (const e of b.e) { if (e.hp <= 0) continue; const g = groups.find((x) => x.name === e.name); if (g) g.n++; else groups.push({ name: e.name, n: 1, e }); }
  const enemyWin = `<div class="elist">${groups.map(({ name, n, e }) => `<div class="er" data-n="${esc(name)}"><span class="en">${esc(name)}</span><span class="ec">${n > 1 ? '×' + n : ''}</span>${e.weak.length || e.res.length ? `<span class="ew">${e.weak.length ? '<span class="lab">WEAK</span>' + icons(e.weak) : ''}${e.res.length ? '<span class="lab">RES</span>' + icons(e.res) : ''}</span>` : ''}</div>`).join('')}</div>`;
  const msg = BT.log.slice(-2).map(line).join('');
  ov.innerHTML = `<div class="win battle"><div class="bl"><div class="order"><span class="olab">ORDER</span>${order}${BT.auto ? '<button class="autobtn on" data-tap="autotoggle" tabindex="-1">AUTO ON</button>' : ''}</div>
  <div class="stagewrap"><div id="stagehost"></div>${msg && !BT.logBig ? `<div class="bmsg">${msg}</div>` : ''}<button class="logtoggle" data-tap="logsize" tabindex="-1" title="Battle log (L)">${BT.logBig ? 'CLOSE' : 'LOG'}</button></div>
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
  }
}
// Bro Combos: the first brother asked can team up with the other while he still stands and has not been asked yet
const comboPartner = (p) => { const b = BT.b, bro = (x) => BROS.some(([, l]) => l === x.ch.look); if (!bro(p)) return null; const q = b.p.find((x) => x !== p && bro(x)); return q && q.hp > 0 && !q.st.stun && b.p.indexOf(q) > b.p.indexOf(p) ? q : null; };
const combosKnown = () => COMBOS.filter((c) => cond(c.if));
// a line of banter after a fight (QUIPS in data.js), from someone actually in the party
const VICTORY = ['Victory!', 'Get in!', 'Sorted!', 'Result!', 'Easy, lads!', 'Proper job!'], DEFEAT = ['Defeated…', 'Absolutely Battered…', 'Spark Out…', 'Well and Truly Hammered…'];
const recentQuips = [];
function quip(kind, chance) {
  const pool = (DATA.QUIPS?.[kind] || []).filter(([who]) => G.party.some((c) => c.look === who)); if (!pool.length || Math.random() > chance) return '';
  const fresh = pool.filter(([, t]) => !recentQuips.includes(t)), [who, t] = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length || pool.length))], c = G.party.find((x) => x.look === who);
  recentQuips.push(t); if (recentQuips.length > 12) recentQuips.shift(); // no repeats for a good while
  return `<span class="quip">${esc(c.name)}: “${esc(t)}”</span>`;
}
function cmdHtml(a) {
  const p = a.p, c = p.ch, head = `<div class="cmdhead">${portrait(ak(c), 'sm')}${esc(p.name)}</div>`, back = btn('c', `${ic('back')}BACK`, 'root');
  if (a.stage === 'root') return `${head}<div class="cmdlist">${btn('c', `${ic('fight')}FIGHT`, 'attack')}${btn('c', `${ic('skill')}SKILL`, 'skills')}${btn('c', `${ic('item')}ITEM`, 'item')}${btn('c', `${ic('guard')}GUARD`, 'defend')}${comboPartner(p) && combosKnown().length ? btn('c', `${ic('spark')}COMBO`, 'combos') : ''}${veteran() ? `${btn('c', `${ic('repeat')}REPEAT`, 'repeat', '', '', !BT.last.has(p.name))}${btn('c', `${ic('auto')}AUTO`, 'auto')}` : ''}${btn('c', `${ic('run')}RUN`, 'flee', '', '', BT.b.boss)}</div>`;
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
  const a = BT.ask, p = a.p, b = BT.b;
  const finish = (cmd) => { BT.ask = null; if (cmd.kind === 'skill') BT.last.set(p.name, { kind: 'skill', skillId: cmd.skillId, gems: cmd.gems }); a.resolve(cmd); };
  const toTarget = (side, pending) => { a.stage = 'target'; a.tside = side; a.pending = pending; };
  const castDirect = (sid, gems) => {
    const s = skillWithGems(sid, gems), cmd = { kind: 'skill', skillId: sid, gems };
    if (s.tgt === 'one') toTarget('e', cmd); else if (s.tgt === 'ally') toTarget('p', cmd); else finish(cmd);
  };
  if (what === 'root') a.stage = 'root';
  else if (what === 'skills') a.stage = 'skills';
  else if (what === 'item') a.stage = 'item';
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
  if (cmd.kind === 'item') G.inv.items[cmd.item]--;
  BT.ask = null; if (cmd.kind === 'skill') BT.last.set(a.p.name, { kind: 'skill', skillId: cmd.skillId, gems: cmd.gems }); a.resolve(cmd);
};

async function victory(b, bossId) {
  music('victory');
  const r = rewards(b); G.gold += r.gold; (G.stats ||= { wins: 0 }).wins++;
  const lines = [];
  let lvSfx = false;
  for (const { c, exp, ups, learned } of L.awardExp(G.party, r.exp)) { // KO'd heroes get a half share (L.KO_EXP_SHARE)
    if (c.hp <= 0 && exp) lines.push(`<span class="dim">${esc(c.name)} (KO) gains half EXP: +${exp}</span>`);
    if (!ups.length) continue;
    if (tipOnce('levelup')) lines.push('💡 New skills unlock as heroes level up. Check the build screen for empty skill slots.');
    lvSfx = true; autofill(c);
    lines.push(`🎉 ${esc(c.name)} reached level ${ups.at(-1)}!${ups.length > 1 ? ` (+${ups.length} levels)` : ''}${learned.length ? ` Learned <b>${learned.map((id) => SKILLS[id].name).join(', ')}</b>.` : ''}`);
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
  miniDirty = true;
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
  if (awake) await awakening(awake);
  if (def?.final) await ending();
}
// The heart-gem wakes a new batch of callings (FF5's crystal shards): echoes of past heroes, then their callings are yours.
const HEART_GEM = { ember_heart: 'fire', grave_heart: 'shadow', rime_heart: 'frost' };
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
async function ending() {
  if (STORY.finale) { goto('haven', 17, 22); await sleep(600); await scene(STORY.finale); } // the bell rings for them in Haven: back to The Bell & Anvil, two minutes after they left
  music('ending');
  const left = ['wyrm', 'lich'].filter((k) => !G.flags.bosses[k]).map((k) => BOSSES[k].name);
  const quests = Object.keys(QUESTS).filter((id) => qstate(id) === 'done').length, gemsOn = G.party.reduce((n, c) => n + gemsUsed(c), 0);
  const roll = [
    ['BEARDED BROS', 'h'], ['and the Bell of Gemforge', ''], ['', ''], ['AFTERWARD', 'h'],
    [left.length ? 'Two hearts sleep in the old bell of Haven. The third is still out in the marsh.' : 'Ember, Grave and Rime: the three hearts sleep in the old bell of Haven, and it rings only for those who answer.', ''],
    ...G.party.map((c) => [esc(epilogueOf(c)).replace(/\{n\}/g, esc(c.name)), '']),
    ['Of Sereth, only the grey stone remains. No smith has dared to set it.', ''], ['', ''], ['THE HEROES', 'h'], ...G.party.map((c) => [`${esc(c.name)}: ${JOBS[c.main].name}${c.sub ? ' / ' + JOBS[c.sub].name : ''}, Lv ${c.level}`, '']), ['', ''],
    ['YOUR JOURNEY', 'h'], [`Time played: ${fmtTime(G.playtime)}`, ''], [`Battles won: ${G.stats?.wins || 0}`, ''], [`Side quests completed: ${quests}/${Object.keys(QUESTS).length}`, ''], [`Gems socketed: ${gemsOn}`, ''], [`Great evils slain: ${3 - left.length}/3`, ''], ['', ''],
    ['MADE WITH', 'h'], ['Claude Code', ''], ['every sprite, tile and song', ''], ['was drawn or composed in code', ''], ['', ''], ['THANK YOU FOR PLAYING', 'h'],
  ];
  await new Promise((res) => {
    show(`<h2>🍻 Last orders</h2>${pubImg('return')}
    <div class="credits"><div class="roll">${roll.map(([t, k]) => `<div class="${k}">${t || '&nbsp;'}</div>`).join('')}</div></div>
    ${left.length ? `<p class="dim">Still sleeping: ${left.join(', ')}. The bell is waiting.</p>` : `<p class="gold">The bell of Haven rings for ${esc(partyNames())}.</p>`}<div class="foot">${btn('edone', 'Keep exploring', '', '', 'primary')}</div>`, '', 'gold');
    ACT.edone = () => { hide(); music(musicFor()); res(); };
  });
}
async function defeat() {
  music('gameover');
  await new Promise((res) => {
    ov.innerHTML = `<div class="win red anim"><div class="vhead">${ic('ko')}<h2 class="bad">${DEFEAT[Math.floor(Math.random() * DEFEAT.length)]}</h2>${ic('ko')}</div><div class="vparty">${G.party.map((c) => `<div class="vp">${portrait(ak(c), 'sm ko')}<div class="vi">${esc(c.name)}</div></div>`).join('')}</div><p>You wake up outside the Goose with a banging headache. Half your gold is gone. Nobody will say where.</p><div class="foot">${btn('ddone', 'Wake up', '', '', 'primary')}</div></div>`;
    ACT.ddone = () => { G.gold = Math.floor(G.gold / 2); for (const c of G.party) { const s = maxOf(c); c.hp = s.hp; c.mp = s.mp; } goto('haven', 11, 12); hide(); res(); };
  });
}

// audio controls: browsers need a user gesture before sound can start
['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach((ev) => addEventListener(ev, unlock, { passive: true }));
document.addEventListener('visibilitychange', () => { setBackgrounded(document.hidden); if (document.hidden) autosave(); });
addEventListener('error', (e) => { console.error(e.error || e.message); toast('⚠ Something went wrong. Your progress is safe.', 3500); autosave(); });
addEventListener('unhandledrejection', (e) => { console.error(e.reason); toast('⚠ Something went wrong. Your progress is safe.', 3500); });
addEventListener('pagehide', () => { setBackgrounded(true); autosave(); });
addEventListener('pageshow', () => setBackgrounded(false));
// offline play + install support for the single-file build (only when served over https/localhost, never inside a host frame)
if ('serviceWorker' in navigator && document.querySelector('meta[name=gemforge-bundled]') && window.self === window.top && /^(https:|http:\/\/localhost)/.test(location.href)) navigator.serviceWorker.register('sw.js').catch(() => {});
const muteBtn = $('#mute'), syncMute = () => { muteBtn.innerHTML = ic(isMuted() ? 'mute' : 'sound'); };
muteBtn.addEventListener('click', () => { setMuted(!isMuted()); syncMute(); if (!isMuted()) sfx('click'); });
syncMute();

// debug / test hook
function testParty(jobs = { adam: 'monk', devon: 'mage', brenna: 'cleric', wendell: 'knight' }) { // tests: skip the intro with the full four
  Object.assign(G.flags.story, { woke: true, cellar: true, called: true }); G.flags.bosses.big_gary = true;
  if (!G.party.some((c) => c.look === 'brenna')) joinLocal('brenna'); if (!G.party.some((c) => c.look === 'wendell')) joinLocal('wendell');
  for (const c of G.party) { if (jobs[c.look] && c.main !== jobs[c.look]) { L.setCalling(c, jobs[c.look]); delete c.cp.bloke; c.cp[c.main] = 0; c.weapon = null; c.armor = LIGHT_ARMOR.has(c.main) ? 'cloth' : 'leather'; c.slots = [null, null, null, null]; sanitize(c, G.inv); autofill(c); } const st = maxOf(c); c.hp = st.hp; c.mp = st.mp; }
  for (const c of G.party) { if (c.look === 'brenna' || c.look === 'wendell') { c.cp[c.main] = 0; c.weapon = LOCALS[c.look].weapon || null; c.slots = [null, null, null, null]; sanitize(c, G.inv); autofill(c); } }
}
window.__game = { testParty, get G() { return G; }, get BT() { return BT; }, get v() { return [vx, vy]; }, camState, TS, get route() { return route; }, battle, step, goto, MAPS, snap, OPT, ACT, ui: { shop, inn, guild, socketer, title, slotScreen, diffScreen, talk, itemsMenu, mainMenu, awakening } };
title();
