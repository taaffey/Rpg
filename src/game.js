// ===== Gemforge Chronicles: UI, map, menus, battle flow =====
import { SOCKET_COST, DIFFICULTY, DROPS } from './data.js';
import { JOBS, SKILLS, GEMS, WEAPONS, ARMORS, ACCS, ITEMS, WEAPON_TYPES, ENEMIES, ENCOUNTERS, ELEM_ICON, BOSSES, SHOPS, QUESTS } from './data.js';
import { MAPS, WALK } from './maps.js';
import * as L from './logic.js';
import * as SP from './sprites.js';
import * as TR from './terrain.js';
import * as TA from './townart.js';
import * as WK from './walkers.js';
import { Stage, FX } from './stage.js';
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
root.style.setProperty('--hand', `url(${SP.handURL()})`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const DB = { weapons: WEAPONS, armors: ARMORS, accs: ACCS, gems: GEMS, items: ITEMS };

// ---------- options (persisted separately from saves) ----------
const OPT = { music: 0.8, sfx: 0.9, speed: 'normal', minimap: true, shake: true };
try { Object.assign(OPT, JSON.parse(localStorage.getItem(SETTINGS) || '{}')); } catch {}
const SPEEDS = { slow: 820, normal: 560, fast: 300, instant: 110 };
function applyOptions() { setVolumes(OPT.music, OPT.sfx); FX.shake = OPT.shake; try { localStorage.setItem(SETTINGS, JSON.stringify(OPT)); } catch {} }
applyOptions();

// ---------- overlay plumbing ----------
const ACT = {}, ACTIN = {};
function show(html, cls = '', winCls = '') { html = html.replace(/<h2>(?:\s*[\p{Extended_Pictographic}\u2600-\u27BF]\uFE0F?)+\s*/gu, '<h2>'); ov.innerHTML = `<div class="win anim ${winCls}">${html}</div>`; ov.className = 'on ' + cls; }
function hide() { ov.className = ''; ov.innerHTML = ''; draw(); }
const inOverlay = () => ov.classList.contains('on');
ov.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  sfx(/^(close|bmain|leave|menu|ddone|vdone)$/.test(b.dataset.act) || b.dataset.a === 'root' ? 'back' : 'click');
  ACT[b.dataset.act]?.(b.dataset.a, b.dataset.b);
});
ov.addEventListener('input', (e) => { const el = e.target.closest('[data-in]'); if (el) ACTIN[el.dataset.in]?.(el.value, el); });
const btn = (act, label, a = '', b = '', cls = '', dis = false) => `<button class="${cls}" data-act="${act}" data-a="${a}" data-b="${b}" ${dis ? 'disabled' : ''}>${label}</button>`;
const bar = (v, m, cls) => { const r = v / m, lvl = cls === 'hp' ? (r < 0.25 ? ' low' : r < 0.5 ? ' mid' : '') : ''; return `<div class="bar ${cls}${lvl}"><i style="width:${Math.max(0, Math.min(100, r * 100))}%"></i></div>`; };
const gemImg = (g) => `<img class="gi" src="${SP.gemIcon(g)}" width="20" height="20" alt="">`;
const gemChip = (g, short = false) => `<span class="chip" title="${GEMS[g].desc}">${gemImg(g)}${short ? GEMS[g].name.replace(' Gem', '') : GEMS[g].name}</span>`;
const statLine = (s) => `<div class="stats">${['hp', 'mp', 'atk', 'def', 'mag', 'spd'].map((k) => `<span>${k.toUpperCase()} <b>${s[k]}</b></span>`).join('')}</div>`;
const gearLine = (g) => ['atk', 'mag', 'def', 'hp', 'mp', 'spd'].filter((k) => g[k]).map((k) => `${g[k] > 0 ? '+' : ''}${g[k]} ${k}`).concat(g.res ? g.res.map((r) => `resist ${r}`) : [], g.sockets ? [`${g.sockets}◇`] : [], g.innate ? [`innate ${GEMS[g.innate].name}`] : [], weaponTraits(g)).join(', ');
// weapon traits (see WEAPONS in data.js) as short tags, plus the flavour line for shop / equip lists
const weaponTraits = (g) => [g.elem ? `${ELEM_ICON[g.elem]} ${g.elem} attacks` : '', g.hits > 1 ? `${g.hits} hits/attack` : '', g.crit ? `crit +${Math.round(g.crit * 100)}%` : '', g.pierce ? `pierce ${Math.round(g.pierce * 100)}%` : '',
  g.proc ? `${Math.round(g.proc[1] * 100)}% ${g.proc[0]} on hit` : '', g.heal ? `heal +${Math.round(g.heal * 100)}%` : '', g.sig ? `skill: ${SKILLS[g.sig].name}` : ''].filter(Boolean);
const gearDesc = (k, d) => (k === 'weapons' ? `${WEAPON_TYPES[d.type].name} · ${gearLine(d)}${d.desc ? `<br><i class="dim">${d.desc}</i>` : ''}` : d.desc || gearLine(d));
const npcImg = (type, px = 48) => `<img class="px" src="${SP.url(SP.npc(type), px / 16)}" width="${px}" height="${px}" alt="">`;

// ---------- state ----------
function newGame() {
  G = {
    // like FF1: the party starts at level 1, unarmed, with 400 G to arm itself at the Haven Smithy (~205 G for the cheap weapons)
    party: [newChar('Aldric', 'knight', 'rogue', null, 'leather'), newChar('Lyra', 'mage', 'cleric', null, 'cloth'),
      newChar('Mira', 'cleric', 'bard', null, 'cloth'), newChar('Kael', 'rogue', 'ranger', null, 'leather')],
    gold: 400, difficulty: 'normal', slot: 1,
    inv: { weapons: [], armors: [], accs: [], gems: ['fire'], items: { potion: 3 } },
    map: 'haven', x: 12, y: 20, flags: { chests: {}, bosses: {}, seen: {}, talked: {}, visited: {}, quests: {}, qprog: {}, qitems: {}, tips: {}, bestiary: {} }, playtime: 0,
  };
}
// ---------- saves: 3 slots, autosave, migration ----------
const VERSION = '1.0.0', LEGACY_SAVE = 'gemforge-save-v2', SLOT_KEY = (i) => `gemforge-save-v3-${i}`, SLOT_IDS = [1, 2, 3];
function migrate(g) {
  g.v = 3; g.flags ||= {};
  for (const k of ['chests', 'bosses', 'seen', 'talked', 'visited', 'quests', 'qprog', 'qitems', 'tips', 'bestiary']) g.flags[k] ||= {};
  g.playtime ||= 0; g.stats ||= { wins: 0 }; g.difficulty = DIFFICULTY[g.difficulty] ? g.difficulty : 'normal';
  for (const c of g.party) { c.extra ||= 0; c.gems ||= []; while (c.gems.length < 5) c.gems.push([]); }
  // old saves keep their gear; only ids that no longer exist are dropped (never a crash on load)
  g.inv ||= {}; for (const k of ['weapons', 'armors', 'accs', 'gems']) g.inv[k] = (g.inv[k] || []).filter((id) => DB[k][id]); g.inv.items ||= {};
  for (const id of Object.keys(g.inv.items)) if (!ITEMS[id]) delete g.inv.items[id];
  for (const c of g.party) { if (c.weapon && !WEAPONS[c.weapon]) c.weapon = null; if (c.armor && !ARMORS[c.armor]) c.armor = null; if (c.acc && !ACCS[c.acc]) c.acc = null; c.exp = Math.max(0, c.exp || 0); c.level = Math.min(L.MAX_LEVEL, c.level || 1); gainExp(c, 0); } // gainExp(0) settles EXP banked under an older curve
  const m = MAPS[g.map];
  if (!m) { g.map = 'haven'; g.x = 12; g.y = 20; } else if (!WALK.has(m.rows[g.y]?.[g.x] ?? '#') && m.rows[g.y]?.[g.x] !== 'B') { g.x = m.spawn.x; g.y = m.spawn.y; }
  return g;
}
const readSlot = (i) => { try { const raw = localStorage.getItem(SLOT_KEY(i)); return raw ? JSON.parse(raw) : null; } catch { return null; } };
const anySave = () => SLOT_IDS.some((i) => readSlot(i));
const save = () => { if (!G || !G.slot) return false; try { localStorage.setItem(SLOT_KEY(G.slot), JSON.stringify({ v: 3, savedAt: Date.now(), G })); return true; } catch { return false; } };
(function importLegacy() { // a v2 single-slot save becomes slot 1 the first time this version runs
  try { const old = localStorage.getItem(LEGACY_SAVE); if (old && !readSlot(1)) { const g = migrate(JSON.parse(old)); g.slot = 1; localStorage.setItem(SLOT_KEY(1), JSON.stringify({ v: 3, savedAt: Date.now(), G: g })); localStorage.removeItem(LEGACY_SAVE); } } catch {}
})();
let toastT = null;
function toast(msg, ms = 2200) { const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }
const tipOnce = (id) => { if (!G || G.flags.tips[id]) return false; G.flags.tips[id] = true; return true; };
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
const decorAt = (x, y) => mapDef().decor?.some((d) => d[0] === x && d[1] === y);
const npcAt = (x, y) => mapDef().npcs?.find((n) => n.x === x && n.y === y);
const regionOf = () => { if (G.map !== 'world') return null; const t = tileAt(G.x, G.y); return t === ',' || t === 't' ? 'snow' : t === ':' ? 'swamp' : G.y <= 13 ? 'plains' : 'green'; };
const REGION_NAME = { snow: 'Frostfields', swamp: 'Mire Marsh', plains: 'Northern Plains', green: 'Greenmarch' };
function musicFor() { const m = mapDef(); return m.kind === 'outdoor' ? (regionOf() === 'snow' ? 'snow' : 'world') : m.music; }
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
  const portrait = box.height > box.width * 1.1;
  const T = portrait ? box.width / 12 : Math.min(box.width / 16, box.height / 12);
  let cols = clamp(Math.round(box.width / T), 10, 26), rows = clamp(Math.round(box.height / T), 8, 20);
  if (cols !== VW || rows !== VH) { VW = cols; VH = rows; cv.width = cols * TS; cv.height = rows * TS; miniDirty = true; }
  const pad = $('#padL'); root.style.setProperty('--padh', (pad && pad.offsetHeight ? pad.offsetHeight + 8 : 0) + 'px'); // dialogue boxes sit above the touch pads
}
new ResizeObserver(() => requestAnimationFrame(layoutView)).observe($('#view'));
addEventListener('orientationchange', () => setTimeout(layoutView, 250));

// ---------- minimap / map screen ----------
let miniDirty = true; const miniCache = { id: null, canvas: document.createElement('canvas'), sc: 2 };
const MINI = { '.': '#2aa83a', ',': '#eef4fc', ':': '#4a6a38', _: '#e0c070', '=': '#9a9a9a', '~': '#3c94f0', T: '#0c6a18', t: '#9ab0c8', M: '#a07848', B: '#c0a060', H: '#ffffff', D: '#c04040', E: '#f4d35e' };
const MINI_FLOOR = { cavern: '#5a566a', crypt: '#4a5a50', spire: '#8aa8d0', storm: '#5a5c8a' }, MINI_WALL = { cavern: '#22202a', crypt: '#16221c', spire: '#2a4a78', storm: '#1c1e40' };
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
    drawMini(miniCache.canvas.getContext('2d'), G.map, sc, 0, 0, 0, true);
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
const LIGHT = { storm: { glow: '255,230,90', dark: 0.86, r: 170 }, cavern: { glow: '255,150,50', dark: 0.88, r: 175 }, crypt: { glow: '90,255,140', dark: 0.9, r: 165 }, spire: { glow: '130,210,255', dark: 0.5, r: 250 } };
function draw(t = performance.now() / 1000) {
  if (!G) return;
  const m = mapDef(), W = m.rows[0].length, H = m.rows.length, frame = Math.floor(t / 0.6) % 2;
  cx.imageSmoothingEnabled = false;
  cx.fillStyle = '#000'; cx.fillRect(0, 0, cv.width, cv.height);
  const camX = W <= VW ? -(VW - W) / 2 : clamp(vx - VW / 2 + 0.5, 0, W - VW);
  const camY = H <= VH ? -(VH - H) / 2 : clamp(vy - VH / 2 + 0.5, 0, H - VH);
  const sx = (x) => Math.round((x - camX) * TS), sy = (y) => Math.round((y - camY) * TS);
  const x0 = Math.max(0, Math.floor(camX)), x1 = Math.min(W, Math.ceil(camX + VW) + 1), y0 = Math.max(0, Math.floor(camY)), y1 = Math.min(H, Math.ceil(camY + VH) + 1);
  const defeated = (id) => !!G.flags.bosses[id];
  const R = TR.isTheme(m.theme) ? TR : TA.isTheme(m.theme) ? TA : null, items = []; // R = autotiled renderer (overworld / towns)
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
    const outside = m.kind === 'outdoor' ? () => '~' : (x, y) => ((x * 7 + y * 5) % 3 === 0 ? (m.theme === 'snowtown' ? 't' : 'T') : '.');
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
  for (const [dx, dy, k] of m.decor || []) cx.drawImage(SP.decor(k), sx(dx), sy(dy), TS, TS);
  // characters: standing on the bottom of their tile, sprites may be taller than one tile
  const stand = (img, X, Y, bob = 0) => { const h = img.height * (TS / 16); cx.fillStyle = 'rgba(0,0,0,.32)'; cx.beginPath(); cx.ellipse(X + TS / 2, Y + TS - 3, 10, 4, 0, 0, 7); cx.fill(); cx.drawImage(img, X, Y + TS - h - bob, TS, h); return h; };
  const sorted = items.filter((it) => it.z === 1).map((it) => ({ k: it.sy ?? it.y + (it.h ?? it.img.height / 16), f: () => put(it) }));
  if (m.boss && !defeated(m.boss.id)) sorted.push({ k: m.boss.y + 1, f: () => { const bob = Math.round(Math.sin(t * 2) * 1.5); cx.drawImage(SP.enemy(m.boss.id), sx(m.boss.x), sy(m.boss.y) + bob, TS, TS); } });
  for (const n of m.npcs || []) sorted.push({ k: n.y + 1, f: () => {
    const nx0 = sx(n.x), ny0 = sy(n.y), bob = Math.round(Math.abs(Math.sin(t * 2 + n.x)) * 0.8), fr = Math.floor(t * 1.6 + n.x) % 8 === 0 ? 1 : 0;
    const h = stand(WK.npcWalker(n.type, n.dir || 'down', fr), nx0, ny0, bob);
    const mk = questMarker(n); if (mk) { const my = ny0 + TS - h - 4 - bob; cx.fillStyle = mk === '?' ? '#7af0a0' : '#ffd25a'; cx.font = 'bold 14px sans-serif'; cx.textAlign = 'center'; cx.strokeStyle = '#201000'; cx.lineWidth = 3; cx.strokeText(mk, nx0 + TS / 2, my); cx.fillText(mk, nx0 + TS / 2, my); }
  } });
  const px = sx(vx), py = sy(vy); plr.x = px + TS / 2; plr.y = py + TS / 2;
  const crew = [{ i: 0, x: vx, y: vy, d: face, mv: Math.abs(vx - G.x) + Math.abs(vy - G.y) > 0.05 }, ...fv.slice(0, G.party.length - 1).map((f, i) => ({ i: i + 1, ...f }))];
  for (const c of crew) sorted.push({ k: c.y + 1 - c.i * 0.001, f: () => stand(WK.walker(G.party[c.i].main, c.d, c.mv ? 1 + (Math.floor(t * 8 + c.i) % 3) : 0), sx(c.x), sy(c.y)) });
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
  const sz = Math.round(48 * u / 8) * 8 || 24, heroes = ['knight', 'mage', 'cleric', 'rogue', 'ranger', 'monk', 'samurai', 'paladin'];
  heroes.forEach((j, i) => { const x = ((t * 34 * u + i * 96 * u) % (W + 80 * u)) - 56 * u, y = ground - sz - Math.round(Math.abs(Math.sin(t * 9 + i)) * 4 * u) + 8 * u; cx.fillStyle = 'rgba(0,0,0,.4)'; cx.fillRect(x + sz * 0.16, ground + 4 * u, sz * 0.66, 4 * u); cx.drawImage(SP.hero(j, Math.floor(t * 8 + i) % 4 === 1 ? 1 : Math.floor(t * 8 + i) % 4 === 3 ? 2 : 0), x, y, sz, sz); });
  cx.textAlign = 'center'; cx.textBaseline = 'alphabetic'; cx.lineJoin = 'round';
  const ty = H * 0.29, tg = cx.createLinearGradient(0, ty - 44 * u, 0, ty + 8 * u); tg.addColorStop(0, '#fff6c0'); tg.addColorStop(1, '#e89a30');
  const f1 = Math.min(46 * u, (W - 24) / 8.6); cx.font = `${f1}px "Press Start 2P", ui-monospace, Menlo, monospace`; cx.lineWidth = Math.max(4, f1 * 0.2); cx.strokeStyle = '#2a1050'; cx.strokeText('GEMFORGE', cxm, ty); cx.fillStyle = tg; cx.fillText('GEMFORGE', cxm, ty);
  const f2 = f1 * 0.43; cx.font = `${f2}px "Press Start 2P", ui-monospace, Menlo, monospace`; cx.lineWidth = Math.max(3, f2 * 0.3); cx.strokeText('CHRONICLES', cxm, ty + f1 * 0.9); cx.fillStyle = '#c8b8ff'; cx.fillText('CHRONICLES', cxm, ty + f1 * 0.9);
}
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016); lastT = now;
  if (!G) return drawTitle(now / 1000);
  G.playtime = (G.playtime || 0) + dt;
  const sp = 9 * dt; vx += clamp(G.x - vx, -sp, sp); vy += clamp(G.y - vy, -sp, sp);
  fv.forEach((f, i) => { const tg = trail[Math.max(0, trail.length - 2 - i)] || { x: G.x, y: G.y }, dx = tg.x - f.x, dy = tg.y - f.y; f.mv = Math.abs(dx) + Math.abs(dy) > 0.02; if (f.mv) f.d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); f.x += clamp(dx, -sp, sp); f.y += clamp(dy, -sp, sp); });
  if (!inOverlay()) draw(now / 1000);
}
requestAnimationFrame(tick);
const frame = () => new Promise((r) => requestAnimationFrame(r));
async function transition() { sfx('encounter'); for (trans = 0.02; trans < 1.2; trans += 0.065) await frame(); trans = 1; await sleep(60); }
function banner(text) { const b = $('#banner'); b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
function goto(id, x, y) {
  G.map = id; G.x = x; G.y = y; G.flags.visited[id] = true; snap(); music(musicFor()); sfx('door');
  banner(id === 'world' ? REGION_NAME[regionOf()] : MAPS[id].name); G.region = regionOf(); layoutView(); draw(); autosave();
}
let busy = false;
function mapShake() { if (!OPT.shake) return; cv.classList.remove('shake'); void cv.offsetWidth; cv.classList.add('shake'); }
async function step(dx, dy) {
  if (inOverlay() || busy || Math.abs(vx - G.x) + Math.abs(vy - G.y) > 0.45) return;
  const m = mapDef(), nx = G.x + dx, ny = G.y + dy, t = tileAt(nx, ny);
  face = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
  const npc = npcAt(nx, ny); if (npc) return talk(npc);
  if (decorAt(nx, ny)) return;
  if (t === 'C') { if (!G.flags.chests[chestKey(nx, ny)]) openChest(nx, ny); return; }
  if (!walkable(t)) return;
  G.x = nx; G.y = ny; trail.push({ x: nx, y: ny }); if (trail.length > 8) trail.shift();
  const pt = m.portals?.[`${nx},${ny}`]; if (pt) return goto(pt.to, pt.x, pt.y);
  reveal(); draw();
  tip('move', TOUCH ? 'Tap anywhere on the map or hold the pad to walk. ☰ opens your party menu.' : 'Arrows or WASD to walk. Esc opens your party menu. A yellow ! marks someone with news.');
  if (m.kind === 'outdoor') { const reg = regionOf(); if (reg !== G.region) { G.region = reg; banner(REGION_NAME[reg]); music(musicFor()); const need = { swamp: 7, snow: 11 }[reg]; const avg = G.party.reduce((a, c) => a + c.level, 0) / G.party.length; if (need && avg < need) toast(`⚠ Dangerous land! Monsters here suit level ${need}+.`, 4200); } }
  if (m.boss && t === 'X' && !G.flags.bosses[m.boss.id]) { busy = true; mapShake(); sfx('crit'); await sleep(350); busy = false; return battle([m.boss.id], m.boss.id); }
  const table = m.enc || m.encByTile?.[t];
  if (table && !(m.safe || []).some(([sx2, sy2, r]) => Math.hypot(nx - sx2, ny - sy2) <= r) && Math.random() < m.rate) {
    let tb = ENCOUNTERS[table];
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
  (list.find((e) => sig(e) === lastSig) || list[0]).focus({ preventScroll: true });
}).observe(ov, { childList: true });
function overlayKey(e) {
  if (typing && (e.key === 'Enter' || e.key === ' ')) { finishTyping(); return true; }
  const list = navs(), f = document.activeElement, i = list.indexOf(f);
  const onSlider = f?.tagName === 'INPUT' && f.type === 'range';
  if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key) && list.length) {
    if (onSlider && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return false; // let the slider move
    const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1; list[(i + d + list.length) % list.length].focus(); return true;
  }
  if ((e.key === 'Enter' || e.key === ' ') && f?.dataset?.act && f.tagName !== 'BUTTON') { f.click(); return true; }
  if (e.key === 'Escape' || e.key === 'Backspace') {
    const b = list.find((x) => /^(close|bmain|leave|menu|bclose|optback)$/.test(x.dataset.act) || (x.dataset.act === 'c' && x.dataset.a === 'root'));
    if (b) { b.click(); return true; }
  }
  return false;
}
addEventListener('keydown', (e) => {
  if (inOverlay()) { if (overlayKey(e)) e.preventDefault(); return; } // never move the map while a window is open
  if (!G) return;
  if (KEYS[e.key]) { e.preventDefault(); step(...KEYS[e.key]); }
  else if ((e.key === 'Escape' || e.key === 'm') && !inOverlay() && !busy) mainMenu();
  else if (e.key === 'n' && !inOverlay()) { OPT.minimap = !OPT.minimap; applyOptions(); }
});
// touch: hold the d-pad, or tap/hold anywhere on the map to walk toward that spot
let holdTimer = null;
const stopHold = () => { clearInterval(holdTimer); holdTimer = null; };
const startHold = (fn) => { stopHold(); fn(); holdTimer = setInterval(fn, 150); };
const padBtns = () => document.querySelectorAll('.pad button[data-d]');
padBtns().forEach((b) => {
  const d = b.dataset.d;
  if (d === 'menu') return b.addEventListener('click', () => { if (G && !inOverlay() && !busy) mainMenu(); });
  if (d === 'map') return b.addEventListener('click', () => { if (G && !inOverlay() && !busy) ACT.mapscreen(); });
  const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d];
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); startHold(() => step(...v)); });
});
$('#hudmenu').addEventListener('click', () => { if (G && !inOverlay() && !busy) mainMenu(); });
['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => { padBtns().forEach((b) => b.addEventListener(ev, stopHold)); cv.addEventListener(ev, stopHold); });
cv.addEventListener('pointerdown', (e) => {
  if (!G || inOverlay()) return;
  const r = cv.getBoundingClientRect(), k = Math.min(r.width / cv.width, r.height / cv.height), tx = (e.clientX - (r.left + (r.width - cv.width * k) / 2)) / k, ty = (e.clientY - (r.top + (r.height - cv.height * k) / 2)) / k;
  const aim = () => { const dx = tx - plr.x, dy = ty - plr.y; if (Math.abs(dx) < TS * 0.45 && Math.abs(dy) < TS * 0.45) return; if (Math.abs(dx) > Math.abs(dy)) step(Math.sign(dx), 0); else step(0, Math.sign(dy)); };
  startHold(aim);
});
ACT.close = hide;

function openChest(x, y) {
  const c = mapDef().chests?.[`${x},${y}`] || { gold: 50 }; G.flags.chests[chestKey(x, y)] = true; miniDirty = true; sfx('chest');
  const got = [];
  for (const k of ['weapons', 'armors', 'accs', 'gems']) for (const id of c[k] || []) { G.inv[k].push(id); got.push(DB[k][id].name); }
  for (const [id, n] of Object.entries(c.items || {})) { G.inv.items[id] = (G.inv.items[id] || 0) + n; got.push(`${ITEMS[id].name} ×${n}`); }
  if (c.gold) { G.gold += c.gold; got.push(`${c.gold} G`); }
  if (c.qitem) { G.flags.qitems[c.qitem] = true; got.push(`<span class="gold">${QITEM[c.qitem]}</span> (quest item)`); }
  draw();
  show(`<h2>📦 Treasure!</h2><p>You found: <b class="gold">${got.join(', ')}</b></p>${btn('close', 'OK', '', '', 'primary')}`);
}

// ---------- NPCs, dialogue, services ----------
const QITEM = { heirloom: 'Grandmother\'s Ring', lantern: 'Boatwright\'s Lantern' };
const qstate = (id) => G.flags.quests[id];
function questDone(id) { const g = QUESTS[id].goal; return g.type === 'kill' ? (G.flags.qprog[id] || 0) >= g.n : g.type === 'find' ? !!G.flags.qitems[g.item] : !!G.flags.bosses[g.id]; }
function questProgress(id) { const g = QUESTS[id].goal; return g.type === 'kill' ? `${Math.min(G.flags.qprog[id] || 0, g.n)}/${g.n}` : g.type === 'find' ? (G.flags.qitems[g.item] ? 'found' : `find it in the ${g.where}`) : (G.flags.bosses[g.id] ? 'slain' : 'not yet slain'); }
function questMarker(n) { // '!' = offers a quest or news, '?' = ready to turn in
  if (n.quest) { const st = qstate(n.quest); return !st ? '!' : st === 'active' && questDone(n.quest) ? '?' : null; }
  return n.text && !G.flags.talked[`${G.map}:${n.x},${n.y}`] ? '!' : null;
}
let curNpc = null, curLines = [], curFinal = '';
function talk(npc) {
  sfx('click');
  if (npc.service === 'shop') return shop(npc.shop);
  if (npc.service === 'inn') return inn(npc);
  if (npc.service === 'guild') return guild();
  if (npc.service === 'socketer') return socketer();
  G.flags.talked[`${G.map}:${npc.x},${npc.y}`] = true; curNpc = npc;
  if (!npc.quest) { curLines = npc.text; curFinal = btn('close', 'Close', '', '', 'primary'); return say(0); }
  const id = npc.quest, q = QUESTS[id], st = qstate(id);
  if (!st) { curLines = [...(npc.text || []), ...q.lines.offer]; curFinal = btn('qaccept', `Accept: ${esc(q.title)}`, id, '', 'primary') + btn('close', 'Not now'); }
  else if (st === 'active' && questDone(id)) { curLines = q.lines.ready; curFinal = btn('qclaim', 'Claim reward', id, '', 'primary'); }
  else if (st === 'active') { curLines = [...q.lines.active, `(${q.title}: ${questProgress(id)})`]; curFinal = btn('close', 'Close', '', '', 'primary'); }
  else { curLines = q.lines.done; curFinal = btn('close', 'Close', '', '', 'primary'); }
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
  const n = curNpc, last = i >= curLines.length - 1; typingText = curLines[i];
  show(`<div class="sayname">${esc(n.name)}</div><div class="saytext" data-tap="skiptype"><span id="tt"></span><span class="more">▼</span></div><div class="sayrow hidden">${last ? curFinal : btn('say', 'NEXT', i + 1, '', 'primary')}</div>`, 'say');
  let k = 0; clearInterval(typing);
  typing = setInterval(() => { k++; const el = $('#tt'); if (!el) return finishTyping(); el.textContent = typingText.slice(0, k); if (k % 3 === 0) sfx('blip'); if (k >= typingText.length) finishTyping(); }, 28);
}
ACT.skiptype = finishTyping;
ACT.say = (i) => say(+i);
ACT.qaccept = (id) => { G.flags.quests[id] = 'active'; G.flags.qprog[id] = 0; sfx('levelup'); hide(); banner(`Quest: ${QUESTS[id].title}`); };
function giveReward(r) {
  const got = [];
  if (r.gold) { G.gold += r.gold; got.push(`${r.gold} G`); }
  for (const k of ['weapons', 'armors', 'accs', 'gems']) for (const id of r[k] || []) { G.inv[k].push(id); got.push(DB[k][id].name); }
  for (const [id, n] of Object.entries(r.items || {})) { G.inv.items[id] = (G.inv.items[id] || 0) + n; got.push(`${ITEMS[id].name} ×${n}`); }
  return got;
}
ACT.qclaim = (id) => {
  if (G.flags.quests[id] !== 'active' || !questDone(id)) return;
  G.flags.quests[id] = 'done'; sfx('levelup'); sfx('coin'); const got = giveReward(QUESTS[id].reward); autosave();
  show(`<h2>✔ Quest complete!</h2><p><b>${esc(QUESTS[id].title)}</b></p><p>Reward: <b class="gold">${got.join(', ')}</b></p>${btn('close', 'Wonderful', '', '', 'primary')}`);
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
function guild() { B.guild = true; show(`<h2>⚔️ ${esc(mapDef().name)}</h2><div class="npc">${npcImg('guildmaster', 64)}<p>Reassign jobs, gear and skills for free. Sub jobs lend their skills two levels behind your main job.</p></div><div class="pane menuparty">${G.party.map((c, i) => btn('build', `<img src="${SP.heroURL(c.main)}" width="36" height="36" class="px" alt=""><span class="hinfo"><span class="hn">${esc(c.name)}</span><span class="hj">${JOBS[c.main].name}${c.sub ? '/' + JOBS[c.sub].name : ''}</span><span class="hl">LV ${c.level}</span></span>`, i, '', 'hero')).join('')}</div>${btn('leave', 'Leave', '', '', 'primary')}`); }
ACT.leave = () => { B.guild = false; hide(); };
function inn(npc) {
  const cost = npc.cost || 25;
  show(`<h2>🛏️ ${esc(mapDef().name)}</h2><div class="npc">${npcImg('innkeeper', 64)}<p>A night's rest restores everyone and saves your game. <span class="gold">${cost} G</span><br>You have <span class="gold">${G.gold} G</span>.</p></div>${btn('rest', 'Rest', cost, '', 'primary', G.gold < cost)}${btn('close', 'Leave')}`);
}
ACT.rest = (cost) => { sfx('rest'); G.gold -= +cost; for (const c of G.party) { const s = maxOf(c); c.hp = s.hp; c.mp = s.mp; } save(); draw(); show(`<h2>🛏️ Rested</h2><p>HP and MP restored. Game saved.</p>${btn('close', 'OK', '', '', 'primary')}`); };

function socketer(msg = '') {
  show(`<h2>💎 Gem-wright</h2><div class="npc">${npcImg('merchant', 64)}<p>I can bore extra sockets into a hero's gear, so more gems fit on their skills. Each hero can take up to ${SOCKET_COST.length} more. The price rises with each one.<br>You have <span class="gold">${G.gold} G</span>.</p></div>${msg ? `<p class="dim">${msg}</p>` : ''}
  ${G.party.map((c, i) => { const n = c.extra || 0, cost = SOCKET_COST[n]; return `<div class="slot"><div class="t"><b>${esc(c.name)}</b> <span class="dim">${JOBS[c.main].name}</span><small>Sockets: ${gemCapacity(c)} total (${n}/${SOCKET_COST.length} bonus)</small></div>${n >= SOCKET_COST.length ? '<span class="dim">Maxed</span>' : btn('addsock', `+1 socket · ${cost} G`, i, '', '', G.gold < cost)}</div>`; }).join('')}${btn('close', 'Leave', '', '', 'primary')}`);
}
ACT.addsock = (i) => { const c = G.party[+i], n = c.extra || 0, cost = SOCKET_COST[n]; if (cost == null || G.gold < cost) return; G.gold -= cost; c.extra = n + 1; sfx('chest'); socketer(`${c.name} now has ${gemCapacity(c)} sockets.`); };

let shopTab = 'buy', curShop = null;
function shop(id, msg = '') {
  if (id) curShop = id;
  const def = SHOPS[curShop];
  const buyRows = Object.entries(def.stock).flatMap(([k, ids]) => ids.map((id2) => { const d = DB[k][id2]; return `<div class="slot"><div class="t"><b>${k === 'gems' ? gemImg(id2) + ' ' : ''}${d.name}</b><small>${gearDesc(k, d)}${k === 'weapons' ? `<br>${G.party.filter((c) => L.weaponOk(c, id2)).map((c) => esc(c.name)).join(', ') || '<span class="bad">no one in the party can use it</span>'}` : ''}</small></div>${btn('buy', `${d.price} G`, k, id2, '', G.gold < d.price)}</div>`; }));
  const sellRows = ['weapons', 'armors', 'accs', 'gems'].flatMap((k) => [...new Set(G.inv[k])].map((id2) => { const d = DB[k][id2], p = Math.floor((d.price || 200) / 2); return `<div class="slot"><div class="t"><b>${k === 'gems' ? gemImg(id2) + ' ' : ''}${d.name}</b> ×${G.inv[k].filter((x) => x === id2).length}</div>${btn('sell', `Sell ${p} G`, k, id2)}</div>`; })).concat(Object.entries(G.inv.items).filter(([, n]) => n > 0).map(([id2, n]) => `<div class="slot"><div class="t"><b>${ITEMS[id2].name}</b> ×${n}</div>${btn('sell', `Sell ${Math.floor(ITEMS[id2].price / 2)} G`, 'items', id2)}</div>`));
  show(`<h2>${def.title}</h2><div class="shophead">${npcImg(/smith/.test(curShop) ? 'smith' : 'merchant', 48)}<div class="shoptabs">${btn('tab', 'Buy', 'buy', '', shopTab === 'buy' ? 'sel' : '')}${btn('tab', 'Sell', 'sell', '', shopTab === 'sell' ? 'sel' : '')}</div><div class="gilbox"><span>G</span>${G.gold}</div></div>${msg ? `<p class="dim">${msg}</p>` : ''}${(shopTab === 'buy' ? buyRows : sellRows).join('') || '<p class="dim">Nothing to sell.</p>'}${btn('close', 'Leave', '', '', 'primary')}`);
}
ACT.tab = (t) => { shopTab = t; shop(); };
ACT.buy = (k, id) => { const d = DB[k][id]; if (G.gold < d.price) return; G.gold -= d.price; sfx('coin'); if (k === 'items') G.inv.items[id] = (G.inv.items[id] || 0) + 1; else G.inv[k].push(id); shop(null, `Bought ${d.name}.`); };
ACT.sell = (k, id) => {
  const d = DB[k][id], p = Math.floor((d.price || 200) / 2);
  if (k === 'items') G.inv.items[id]--; else G.inv[k].splice(G.inv[k].indexOf(id), 1);
  G.gold += p; sfx('coin'); shop(null, `Sold ${d.name}.`);
};

// ---------- title / main menu ----------
function title() {
  G = null; optBack = 'title';
  show(`<p class="dim" style="text-align:center">Pick a main job and a sub job. Wield weapons that grant signature skills. Socket gems to rewrite every skill.</p>
  <div class="row" style="justify-content:center">${btn('new', 'New Game', '', '', 'primary')}${btn('cont', 'Continue', '', '', '', !anySave())}${btn('opts', '⚙ Options')}</div><div class="dim" style="text-align:center;font-size:11px">v${VERSION}</div>`, 'title');
  $('#loc').textContent = ''; $('#gold').textContent = ''; music('town');
}
let slotMode = 'new', pendingSlot = null, pendingDel = null;
function slotScreen(mode) {
  slotMode = mode; const fmt = (ms) => new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  show(`<h2>${mode === 'new' ? 'New Game: pick a slot' : 'Continue'}</h2>${SLOT_IDS.map((i) => {
    const d = readSlot(i), g = d?.G;
    if (!g) return `<div class="slot"><div class="t"><b>Slot ${i}</b><small>Empty</small></div>${mode === 'new' ? btn('slotpick', 'Start here', i, '', 'primary') : '<span class="dim">—</span>'}</div>`;
    const where = g.map === 'world' ? 'Overworld' : MAPS[g.map]?.name || '?', bosses = ['wyrm', 'lich', 'titan'].filter((k) => g.flags?.bosses?.[k]).length;
    return `<div class="slot"><div class="t"><b>Slot ${i}</b> <span class="chip">${DIFFICULTY[g.difficulty]?.name || 'Normal'}</span><small>${esc(where)} · ${fmtTime(g.playtime)} · ${bosses}/3 evils slain<br>${g.party.map((c) => `${esc(c.name)} ${c.level}`).join(' · ')}<br>${fmt(d.savedAt)}</small></div>
      <div class="col">${btn('slotpick', mode === 'new' ? (pendingSlot === i ? 'Tap to overwrite' : 'Overwrite') : 'Load', i, '', mode === 'new' && pendingSlot !== i ? '' : 'primary')}${btn('slotdel', pendingDel === i ? 'Tap to delete' : 'Delete', i, '', pendingDel === i ? 'danger' : '')}</div></div>`;
  }).join('')}${btn('title', 'Back')}`);
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
  show(`<h2>Choose difficulty</h2>${['normal', 'easy', 'hard'].map((k) => `<div class="slot"><div class="t"><b>${DIFFICULTY[k].name}</b><small>${DIFFICULTY[k].desc}</small></div>${btn('diff', 'Select', slot, k, k === 'normal' ? 'primary' : '')}</div>`).join('')}<div class="dim">You can change this later in Options.</div>${btn('new', 'Back')}`);
}
ACT.diff = (slot, d) => { newGame(); G.slot = +slot; G.difficulty = d; G.flags.visited.haven = true; save(); snap(); music(musicFor()); hide(); banner(mapDef().name); intro(); };
function loadSlot(i) {
  const d = readSlot(i); if (!d?.G) return;
  G = migrate(d.G); G.slot = i; snap(); music(musicFor()); hide(); banner(mapDef().name); toast(`Loaded slot ${i}`);
}
function intro() {
  show(`<h2>Welcome to Haven Town</h2><div class="npc">${npcImg('elder', 64)}<p>Three great evils stir: the <b>Ashen Wyrm</b> in the cavern east of town, a <b>Lich King</b> in the swamp crypt, and a <b>Frost Titan</b> in a spire far to the north.</p></div>
  <p>Your party sets out <b>unarmed</b> with <span class="gold">400 G</span>: arm everyone at the <b>Smithy</b> first (a sword, two staves and a dagger cost about 205 G), then buy a few potions.</p>
  <p>Visit the <b>Guild</b> to choose jobs, the <b>Smithy</b> for gear, and open the <b>Menu</b> (Esc) to socket gems into skills. Talk to townsfolk: a <span class="gold">!</span> marks someone with news. Check your <b>Journal</b> if you get lost.</p>${btn('close', 'Begin', '', '', 'primary')}`);
}
function mainMenu() {
  const menuTip = tipOnce('menu') ? 'TIP: pick a hero, then Edit a skill slot to socket gems. Gems rewrite how a skill works.' : '';
  const cmds = [['items', 'ITEM'], ['mapscreen', 'MAP'], ['journal', 'JOURNAL'], ['bestiary', 'BESTIARY'], ['opts', 'OPTIONS'], ['save', 'SAVE'], ['title', 'TITLE'], ['close', 'CLOSE']];
  show(`<div class="menugrid"><div class="pane menucmd"><div class="gilbox"><span>G</span>${G.gold}</div><div class="cmdlist">${cmds.map(([a, l]) => btn(a, l, '', '', a === 'close' ? 'primary' : '')).join('')}</div></div>
  <div class="pane menuparty">${G.party.map((c, i) => { const s = maxOf(c); return btn('build', `<img src="${SP.heroURL(c.main)}" width="36" height="36" class="px" alt=""><span class="hinfo"><span class="hn">${esc(c.name)}</span><span class="hj">${JOBS[c.main].name}${c.sub ? '/' + JOBS[c.sub].name : ''}</span><span class="hl">LV ${c.level}</span><span class="hh ${c.hp < s.hp * 0.25 ? 'low' : c.hp < s.hp * 0.5 ? 'mid' : ''}">HP ${c.hp}/${s.hp}</span><span class="hm">MP ${c.mp}/${s.mp}</span></span>`, i, '', 'hero'); }).join('')}</div></div>
  ${menuTip ? `<div id="msg" class="pane">${menuTip}</div>` : '<div id="msg"></div>'}<div class="dim ptime">TIME ${fmtTime(G.playtime)}   WINS ${G.stats?.wins || 0}</div>`, '', 'multi');
}
const fmtTime = (sec = 0) => { sec = Math.floor(sec); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s2 = sec % 60; return `${h}:${String(m).padStart(2, '0')}:${String(s2).padStart(2, '0')}`; };
ACT.bestiary = () => {
  const ids = Object.keys(ENEMIES), seen = ids.filter((id) => G.flags.bestiary[id]);
  show(`<h2>📖 Bestiary</h2><p class="dim">Foes discovered: <b class="gold">${seen.length}/${ids.length}</b>. Defeat a creature to learn its weaknesses.</p><div class="grid">${ids.map((id) => {
    const r = G.flags.bestiary[id], d = ENEMIES[id];
    if (!r) return '';
    return `<div class="card"><img class="px" src="${SP.enemyURL(id)}" width="${SP.isBig(id) ? 64 : 48}" height="${SP.isBig(id) ? 64 : 48}" alt="" style="float:right"><b>${d.name}</b>${d.boss ? ' <span class="chip">Boss</span>' : ''}<div class="dim">Defeated ${r.kills}</div><div>HP ${d.hp} · ATK ${d.atk} · MAG ${d.mag}</div><div>${r.kills ? `weak ${d.weak.map((w) => ELEM_ICON[w]).join('') || '—'} · resists ${d.res.map((w) => ELEM_ICON[w]).join('') || '—'}` : '<span class="dim">weaknesses unknown</span>'}</div>${r.kills && DROPS[id]?.common ? `<div>Drops: ${[DROPS[id].common, DROPS[id].rare].filter(Boolean).map(([k, did], j) => (j ? (r.got?.[did] ? `<span class="gold">★ ${DB[k][did].name}</span>` : '<span class="dim">★ ???</span>') : DB[k][did].name)).join(' · ')}</div>` : ''}</div>`;
  }).join('')}</div>${ids.length - seen.length ? `<div class="card dim" style="text-align:center">❔ ${ids.length - seen.length} more creatures are still undiscovered</div>` : ''}${btn('menu', 'Back', '', '', 'primary')}`);
};
ACT.title = title;
ACT.save = () => { const m = $('#msg'); m.className = 'pane'; m.textContent = save() ? `GAME SAVED TO SLOT ${G.slot}.` : 'COULD NOT SAVE (STORAGE FULL OR BLOCKED).'; };

// ---------- map screen, journal, options ----------
ACT.mapscreen = () => {
  const m = mapDef();
  if (!m.fog) { show(`<h2>🗺 Map</h2><p class="dim">There's nothing to chart indoors. Step outside or into a dungeon to see the map.</p>${btn('menu', 'Back', '', '', 'primary')}`); return; }
  const W = m.rows[0].length, H = m.rows.length, sc = Math.max(4, Math.min(Math.floor(560 / W), Math.floor(380 / H)));
  const places = (m.places || []).filter(([x, y]) => G.flags.seen[G.map]?.[y]?.[x] === '1');
  show(`<h2>🗺 ${esc(m.name)}</h2><canvas id="bigmap" width="${W * sc}" height="${H * sc}" class="px" style="width:100%;max-width:${W * sc}px;background:#05070f;border:2px solid #060a28;border-radius:4px"></canvas>
  <div class="dim">White blinking square = you · gold = towns/exits · red = dungeons/bosses · tan = unopened chests (once seen). Press <b>N</b> on the map to toggle the minimap.</div>
  ${places.length ? `<h3>Discovered</h3><div>${places.map((p) => `<span class="chip">${esc(p[2])}</span>`).join('')}</div>` : ''}${btn('menu', 'Back', '', '', 'primary')}`);
  const c2 = $('#bigmap').getContext('2d'); c2.imageSmoothingEnabled = false;
  const paint = () => { if (!$('#bigmap')) return; c2.clearRect(0, 0, W * sc, H * sc); drawMini(c2, G.map, sc, 0, 0, performance.now() / 1000); requestAnimationFrame(paint); }; paint();
};
const OBJECTIVES = [
  { id: 'wyrm', title: 'Slay the Ashen Wyrm', hint: 'Ashen Cavern, east of Haven. It is weak to ice. Its fall will clear the northern pass.' },
  { id: 'frost', title: 'Reach Frostholm', hint: 'Cross the cleared mountain pass to the northern snowfields.', visit: 'frostholm', after: 'wyrm' },
  { id: 'lich', title: 'Slay Lich King Morvath', hint: 'Sunken Crypt, in the swamp south of Haven. Weak to holy and fire; strong against dark.' },
  { id: 'titan', title: 'Slay the Frost Titan', hint: 'Frost Spire, far northeast beyond Frostholm. Weak to fire; ice does little.', after: 'wyrm', final: true },
];
ACT.journal = () => {
  const done = (o) => (o.visit ? !!G.flags.visited[o.visit] : !!G.flags.bosses[o.id]);
  const n = OBJECTIVES.filter((o) => o.id !== 'frost' && done(o)).length;
  show(`<h2>📜 Journal</h2><p class="dim">Great evils slain: <b class="gold">${n}/3</b></p>${OBJECTIVES.map((o) => { const locked = o.after && !G.flags.bosses[o.after]; return `<div class="card ${done(o) ? 'done' : ''}"><b>${done(o) ? '✔' : locked ? '🔒' : '◇'} ${o.title}</b><div class="dim">${locked ? 'Blocked for now: the northern pass is closed by a rockslide.' : o.hint}</div></div>`; }).join('')}
  <h3>Side quests</h3>${(() => { const act = Object.entries(QUESTS).filter(([id]) => qstate(id) === 'active'), dn = Object.entries(QUESTS).filter(([id]) => qstate(id) === 'done');
    return (act.length ? act.map(([id, q]) => `<div class="card ${questDone(id) ? 'done' : ''}"><b>${questDone(id) ? '❓' : '◇'} ${esc(q.title)}</b> <span class="dim">(${questProgress(id)})</span><div class="dim">${questDone(id) ? 'Return to ' + esc(q.giver) + ' to claim your reward.' : esc(q.lines.active[0])}</div></div>`).join('') : '<div class="dim">No active quests. Talk to townsfolk marked with a yellow <b>!</b>.</div>') + (dn.length ? `<div class="dim">Completed: ${dn.map(([, q]) => '✔ ' + esc(q.title)).join(' · ')}</div>` : ''); })()}
  <h3>Tips</h3><div class="dim">• Gems rewrite skills: try Wide + a heal, Echo on a big spell, Stun on a fast skill.<br>• Jobs can be changed in any town building; sub jobs lend skills (2 levels behind).<br>• Inns heal and save. Frostholm's shops sell much better gear.</div>${btn('menu', 'Back', '', '', 'primary')}`);
};
let optBack = 'menu';
function optionsScreen() {
  const onOff = (v) => (v ? 'On' : 'Off');
  show(`<h2>⚙ Options</h2>
  <div class="opt"><label>Music volume <b>${Math.round(OPT.music * 100)}%</b></label><input type="range" min="0" max="100" value="${Math.round(OPT.music * 100)}" data-in="music"></div>
  <div class="opt"><label>Sound effects <b>${Math.round(OPT.sfx * 100)}%</b></label><input type="range" min="0" max="100" value="${Math.round(OPT.sfx * 100)}" data-in="sfx"></div>
  <div class="row">${G ? btn('optdiff', `Difficulty: <b>${DIFFICULTY[G.difficulty].name}</b>`) : ''}${btn('optspeed', `Battle speed: <b>${OPT.speed}</b>`)}${btn('optmini', `Minimap: <b>${onOff(OPT.minimap)}</b>`)}${btn('optshake', `Screen shake: <b>${onOff(OPT.shake)}</b>`)}${btn('optmute', `Sound: <b>${isMuted() ? 'Muted' : 'On'}</b>`)}</div>
  <h3>Controls</h3><div class="dim controls"><div><b>Arrows / WASD</b> move</div><div><b>Esc / M</b> menu</div><div><b>N</b> toggle minimap</div><div><b>Arrows</b> move menu focus</div><div><b>Enter / Space</b> select</div><div><b>Esc / Backspace</b> back</div></div>
  ${IS_IOS && !root.classList.contains('standalone') && !root.classList.contains('framed') ? '<div class="card"><b>📱 Install on iPhone</b><div class="dim">In Safari tap Share, then <b>Add to Home Screen</b>. Gemforge then runs full-screen, works offline, and remembers your saves.</div></div>' : ''}
  <div class="dim" style="font-size:11px">Gemforge Chronicles v${VERSION}</div><div class="row">${btn('optback', 'Back', '', '', 'primary')}</div>`);
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
  show(`<h2>🎒 Items</h2><p class="gold">${G.gold} G</p>${msg ? `<p>${msg}</p>` : ''}${it.length ? it.map(([id, n]) => `<div class="row">${btn('useitem', `${ITEMS[id].name} ×${n}`, id)}<span class="dim">${ITEMS[id].desc}</span></div>`).join('') : '<p class="dim">No consumables.</p>'}
  <h3>Gems (${G.inv.gems.length})</h3><div>${G.inv.gems.map((g) => gemChip(g)).join('') || '<span class="dim">none</span>'}</div>
  <div class="row">${btn('menu', 'Back')}</div>`);
}
ACT.items = () => itemsMenu(); ACT.menu = mainMenu;
ACT.useitem = (id) => {
  show(`<h2>Use ${ITEMS[id].name} on…</h2>${G.party.map((c, i) => { const s = maxOf(c); return `<div class="row">${btn('useon', `${esc(c.name)} — HP ${c.hp}/${s.hp} MP ${c.mp}/${s.mp}${c.hp <= 0 ? ' (KO)' : ''}`, id, i)}</div>`; }).join('')}${btn('items', 'Back')}`);
};
ACT.useon = (id, i) => {
  const c = G.party[i], it = ITEMS[id], s = maxOf(c); let ok = false;
  if (it.revive && c.hp <= 0) { c.hp = Math.round(s.hp * it.revive); ok = true; }
  else if (c.hp > 0 && it.heal && c.hp < s.hp) { c.hp = Math.min(s.hp, c.hp + it.heal); ok = true; }
  else if (c.hp > 0 && it.mpr && c.mp < s.mp) { c.mp = Math.min(s.mp, c.mp + it.mpr); ok = true; }
  if (ok) G.inv.items[id]--;
  itemsMenu(ok ? `Used ${it.name} on ${esc(c.name)}.` : 'No effect.');
};


// ---------- build screen: jobs, gear, skills, gems ----------
let B = { i: 0, view: 'main', slot: 0, guild: false };
ACT.build = (i) => { B = { i: +i, view: 'main', slot: 0, guild: B.guild && inTown() }; buildScreen(); };
function buildScreen() {
  const c = G.party[B.i];
  ({ main: buildMain, jobMain: () => jobPick('main'), jobSub: () => jobPick('sub'), weapon: () => gearPick('weapons'), armor: () => gearPick('armors'), acc: () => gearPick('accs'), slot: slotEdit }[B.view])(c);
}
const back = (v = 'main') => () => { B.view = v; buildScreen(); };
ACT.bmain = back('main');
ACT.bnav = (d) => { B.i = (B.i + +d + G.party.length) % G.party.length; B.view = 'main'; buildScreen(); };
ACT.bclose = () => (B.guild ? guild() : mainMenu());
function buildMain(c) {
  const s = stats(c), m = JOBS[c.main], sj = c.sub ? JOBS[c.sub] : null, cap = gemCapacity(c), used = gemsUsed(c);
  const jobs = inTown();
  const gearRow = (label, view, id, kind) => `<div class="slot"><div class="t"><b>${label}:</b> ${id ? DB[kind][id].name : `<span class="dim">— ${kind === 'weapons' ? 'unarmed' : 'none'} —</span>`}<small>${id ? gearDesc(kind, DB[kind][id]) : kind === 'weapons' ? 'Fighting bare-handed. Buy a weapon at a Smithy.' : ''}</small></div>${btn('bview', 'Change', view)}</div>`;
  const slotRow = (i) => {
    const sid = slotSkill(c, i), gems = slotGems(c, i);
    const m2 = sid ? skillWithGems(sid, gems) : null;
    return `<div class="slot"><div class="t"><b>${i === SIG ? '⭐ Weapon' : `Slot ${i + 1}`}:</b> ${sid ? `<b>${m2.name}</b> ${gems.map((g) => gemChip(g, true)).join('')}` : '<span class="dim">— empty —</span>'}<small>${m2 ? describeSkill(m2) : ''}</small></div>${btn('bslot', 'Edit', i)}</div>`;
  };
  show(`<div class="row">${btn('bnav', '◀', -1)}<h2 class="grow"><img src="${SP.heroURL(c.main)}" width="36" height="36" class="px" style="vertical-align:middle"> ${esc(c.name)} · Lv${c.level}</h2>${btn('bnav', '▶', 1)}</div>
  <div class="dim">${c.level < L.MAX_LEVEL ? `EXP ${c.exp}/${expNeeded(c.level)} · next level in ${expNeeded(c.level) - c.exp}` : 'EXP — · max level'}</div>
  <div class="card">
    <div class="row jobrow"><span><b>Main:</b> ${m.icon} ${m.name}</span>${btn('bview', 'Change', 'jobMain', '', '', !jobs)}</div><div class="row jobrow"><span><b>Sub:</b> ${sj ? sj.icon + ' ' + sj.name : 'none'}</span>${btn('bview', 'Change', 'jobSub', '', '', !jobs)}</div>
    ${jobs ? '' : '<div class="dim">Jobs can only be changed in town (visit the Guild ⚔️).</div>'}
    ${statLine(s)}<div class="dim">Sub job adds 40% of its stat modifiers and its skills (2 levels behind). Weapon types from either job can be equipped.</div>
  </div>
  <h3>Equipment</h3>${gearRow('Weapon', 'weapon', c.weapon, 'weapons')}${gearRow('Armor', 'armor', c.armor, 'armors')}${gearRow('Accessory', 'acc', c.acc, 'accs')}
  <h3>Skills &amp; Gems <span class="${used > cap ? 'bad' : 'gold'}">◇ ${used}/${cap}</span></h3>${[0, 1, 2, 3, SIG].map(slotRow).join('')}
  <div class="row">${btn('bclose', 'Done', '', '', 'primary')}</div>`);
}
ACT.bview = (v) => { B.view = v; buildScreen(); };
ACT.bslot = (i) => { B.slot = +i; B.view = 'slot'; buildScreen(); };

function jobPick(which) {
  const c = G.party[B.i];
  show(`<h2>${which === 'main' ? 'Main' : 'Sub'} job for ${esc(c.name)}</h2>${which === 'sub' ? btn('setjob', 'None', which, '') : ''}${Object.entries(JOBS).map(([id, j]) => {
    const dis = (which === 'main' && id === c.sub) || (which === 'sub' && id === c.main);
    return `<div class="slot ${c[which] === id ? 'sel' : ''}"><div class="t"><b>${j.icon} ${j.name}</b><small>${j.desc} Weapons: ${j.weapons.map((w) => WEAPON_TYPES[w].name).join(', ')}. Skills: ${j.skills.map((s) => SKILLS[s[0]].name + ' L' + s[1]).join(', ')}</small></div>${btn('setjob', 'Select', which, id, '', dis)}</div>`;
  }).join('')}${btn('bmain', 'Back')}`);
}
ACT.setjob = (which, id) => {
  const c = G.party[B.i]; c[which] = id || null; sanitize(c, G.inv); autofill(c); B.view = 'main'; buildScreen();
};
function gearPick(kind) {
  const c = G.party[B.i], field = { weapons: 'weapon', armors: 'armor', accs: 'acc' }[kind];
  const uniq = [...new Set(G.inv[kind])];
  show(`<h2>${esc(c.name)}: ${field}</h2>${c[field] ? btn('equip', 'Unequip', kind, '') : ''}${uniq.map((id) => {
    const g = DB[kind][id], ok = kind !== 'weapons' || L.weaponOk(c, id);
    const now = stats(c), after = stats({ ...c, [field]: id }), delta = ok ? ['atk', 'mag', 'def', 'hp', 'mp', 'spd'].filter((k) => after[k] !== now[k]).map((k) => `<span class="${after[k] > now[k] ? 'up' : 'down'}">${after[k] > now[k] ? '▲' : '▼'}${Math.abs(after[k] - now[k])} ${k}</span>`).join(' ') : '';
    return `<div class="slot"><div class="t"><b>${g.name}</b> ×${G.inv[kind].filter((x) => x === id).length}<small>${gearDesc(kind, g)}${ok ? '' : ' · <span class="bad">job can\'t use</span>'}</small>${delta ? `<div class="delta">${delta}</div>` : ''}</div>${btn('equip', 'Equip', kind, id, '', !ok)}</div>`;
  }).join('') || '<p class="dim">Nothing in inventory.</p>'}${btn('bmain', 'Back')}`);
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
  <div class="card"><b>${final ? final.name : '— empty —'}</b> ${slotGems(c, i).map((g) => gemChip(g)).join('')}<br><span class="dim">${final ? describeSkill(final) : 'Pick a skill below.'}</span></div>
  ${i === SIG ? `<div class="dim">Granted by your weapon (${c.weapon ? WEAPONS[c.weapon].name : 'unarmed'}). ${c.weapon && WEAPONS[c.weapon].innate ? 'Includes free innate gem: ' + GEMS[WEAPONS[c.weapon].innate].name + '.' : ''}</div>` :
    `<h3>Skill</h3><div class="row">${btn('setskill', 'Empty', i, '')}${learnable(c).map((s) => btn('setskill', `${SKILLS[s].name} <small>${SKILLS[s].mp}mp</small>`, i, s, c.slots[i] === s ? 'sel' : '')).join('')}</div>`}
  <h3>Socketed gems (${gemsUsed(c)}/${gemCapacity(c)} total · max ${GEMS_PER_SLOT} per skill)</h3>
  <div class="row">${gems.map((g, k) => btn('ungem', `✖ ${gemImg(g)} ${GEMS[g].name}`, i, k)).join('') || '<span class="dim">none</span>'}</div>
  <h3>Inventory gems</h3>${inv.map((g) => `<div class="slot"><div class="t"><b>${gemImg(g)} ${GEMS[g].name}</b> ×${G.inv.gems.filter((x) => x === g).length}<small>${GEMS[g].desc}</small></div>${btn('gem', 'Socket', i, g, '', full || !sid)}</div>`).join('') || '<p class="dim">No spare gems. Buy some in the shop or find them in the cavern.</p>'}
  ${btn('bmain', 'Back', '', '', 'primary')}`);
}
ACT.setskill = (i, sid) => { const c = G.party[B.i]; c.slots[+i] = sid || null; if (!sid) { G.inv.gems.push(...c.gems[+i]); c.gems[+i] = []; } buildScreen(); };
ACT.gem = (i, g) => { const c = G.party[B.i]; G.inv.gems.splice(G.inv.gems.indexOf(g), 1); c.gems[+i].push(g); buildScreen(); };
ACT.ungem = (i, k) => { const c = G.party[B.i]; G.inv.gems.push(...c.gems[+i].splice(+k, 1)); buildScreen(); };


// ---------- battle ----------
let BT = null;
function stageKind(bossId) {
  if (bossId) return { wyrm: 'boss', lich: 'crypt', storm_drake: 'storm' }[bossId] || 'spire';
  const m = mapDef();
  if (m.kind === 'dungeon') return m.theme === 'cavern' ? 'dungeon' : m.theme;
  const r = regionOf(); return r === 'snow' ? 'snow' : r === 'swamp' ? 'swamp' : 'world';
}
async function battle(groupIds, bossId = null) {
  if (BT) return; // never run two battles at once
  try { await battleInner(groupIds, bossId); } catch (err) { // never leave the player stuck in a broken battle
    console.error(err); try { BT?.stage?.stop(); } catch {} BT = null; busy = false; trans = 0; hide(); music(musicFor()); toast('⚠ Battle error: back to the map', 3500);
  }
}
async function battleInner(groupIds, bossId = null) {
  busy = true;
  const b = new Battle(G.party, groupIds, Math.random, !!bossId, DIFFICULTY[G.difficulty || 'normal'].mod);
  await transition(); music(bossId ? 'boss' : 'battle');
  BT = { b, boss: bossId, logBig: false, log: [bossId ? BOSSES[bossId].intro : `${b.e.map((e) => e.name).join(', ')} appear!`], ask: null };
  BT.last = new Map(); BT.auto = false;
  for (const e of b.e) G.flags.bestiary[e.id] = G.flags.bestiary[e.id] || { seen: 1, kills: 0 };
  BT.stage = new Stage(b, stageKind(bossId));
  tip('battle', 'Pick Attack or Skills, then a target. Icons under an enemy show its weakness: hit it with that element for +50%. 🔁 Repeat reuses your last move.', 7000);
  if (bossId) BT.stage.card(BOSSES[bossId].name.toUpperCase(), 2.6);
  renderBattle();
  while (!b.over) {
    if (BT.auto && b.p.some((x) => x.hp <= 0 || x.hp < x.maxhp * 0.3)) { BT.auto = false; toast('⏩ Auto-battle stopped: someone needs help', 3000); renderBattle(); } // never auto-march a party into a wipe
    const cmds = new Map();
    for (const p of b.p.filter((x) => x.hp > 0)) {
      const cmd = await askCommand(p);
      cmds.set(p, cmd);
    }
    BT.ask = null; BT.stage.setActive(null);
    for (const lines of b.round(cmds)) { BT.log.push(...lines); renderBattle(); playFx(b.fx.splice(0)); await sleep(SPEEDS[OPT.speed]); }
    renderBattle();
  }
  if (b.over === 'win') { BT.stage.victory(); sfx('levelup'); renderBattle(); await sleep(1200); }
  BT.stage.stop(); trans = 0;
  b.p.forEach((x) => { x.ch.hp = x.hp; x.ch.mp = x.mp; });
  if (b.over === 'fled') sfx('flee');
  if (b.over === 'win') await victory(b, bossId);
  else if (b.over === 'lose') await defeat();
  else { hide(); }
  BT = null; busy = false; if (G) { if (b.over !== 'lose') music(musicFor()); draw(); if (b.over === 'win') autosave(); }
}
function renderBattle() {
  const { b, ask } = BT;
  const order = b.order().map((x) => `<img class="px o-${x.side} ${ask?.p === x ? 'cur' : ''}" title="${esc(x.name)}" src="${x.side === 'p' ? SP.heroURL(x.ch.main) : SP.enemyURL(x.id)}" width="${x.side === 'e' && SP.isBig(x.id) ? 34 : 26}" height="${x.side === 'e' && SP.isBig(x.id) ? 34 : 26}" alt="${esc(x.name)}">`).join('');
  const sts = (x) => `${x.st.poison > 0 ? '☠' : ''}${x.st.slow > 0 ? '🐌' : ''}${x.st.stun > 0 ? '💫' : ''}${x.st.atkup > 0 ? '⬆' : ''}${x.st.defup > 0 ? '🛡' : ''}`;
  const icons = (list) => list.map((w) => ELEM_ICON[w]).join('');
  const groups = []; for (const e of b.e) { if (e.hp <= 0) continue; const g = groups.find((x) => x.name === e.name); if (g) g.n++; else groups.push({ name: e.name, n: 1, e }); }
  const enemyWin = `<div class="elist">${groups.map(({ name, n, e }) => `<div class="er" data-n="${esc(name)}"><span class="en">${esc(name)}</span><span class="ec">${n}</span>${e.weak.length || e.res.length ? `<span class="ew">${e.weak.length ? 'WEAK ' + icons(e.weak) : ''}${e.res.length ? ' RES ' + icons(e.res) : ''}</span>` : ''}</div>`).join('')}</div>`;
  const msg = BT.log.slice(-2).map((l) => `<div>${esc(l)}</div>`).join('');
  ov.innerHTML = `<div class="win battle"><div class="bl"><div class="order"><span class="dim">ORDER</span>${order}${BT.auto ? '<button class="autobtn on" data-tap="autotoggle" tabindex="-1">AUTO ON</button>' : ''}</div>
  <div class="stagewrap"><div id="stagehost"></div>${msg && !BT.logBig ? `<div class="bmsg">${msg}</div>` : ''}<button class="logtoggle" data-tap="logsize" tabindex="-1" title="Battle log (L)">${BT.logBig ? '✕' : 'LOG'}</button></div>
  ${BT.logBig ? `<div class="logwrap"><div class="log big" id="log">${BT.log.map((l) => `<div>${esc(l)}</div>`).join('')}</div></div>` : ''}</div>
  <div class="br"><div class="pane cmdwin"><div id="cmd">${ask ? cmdHtml(ask) : enemyWin}</div></div>
  <div class="pane partywin">${b.p.map((p) => { const r = p.hp / p.maxhp; return `<div data-n="${p.name}" class="pm ${p.hp <= 0 ? 'dead' : ''} ${ask?.p === p ? 'active' : ''}"><span class="pn">${esc(p.name)}</span><span class="ph ${r < 0.25 ? 'low' : r < 0.5 ? 'mid' : ''}">${p.hp}/${p.maxhp}</span><span class="pmp">MP ${p.mp}</span><span class="pst">${sts(p)}</span></div>`; }).join('')}</div></div></div>`;
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
function cmdHtml(a) {
  const p = a.p, c = p.ch, head = `<div class="cmdhead">${esc(p.name)}</div>`, back = btn('c', 'BACK', 'root');
  if (a.stage === 'root') return `${head}<div class="cmdlist">${btn('c', 'FIGHT', 'attack')}${btn('c', 'SKILL', 'skills')}${btn('c', 'ITEM', 'item')}${btn('c', 'GUARD', 'defend')}${btn('c', 'REPEAT', 'repeat', '', '', !BT.last.has(p.name))}${btn('c', 'AUTO', 'auto')}${btn('c', 'RUN', 'flee', '', '', BT.b.boss)}</div>`;
  if (a.stage === 'skills') {
    return `${head}<div class="cmdlist">` + [0, 1, 2, 3, SIG].map((i) => {
      const sid = slotSkill(c, i); if (!sid) return '';
      const gems = slotGems(c, i), s = skillWithGems(sid, gems);
      return btn('c', `<span class="sk"><b>${s.name}</b><i>${s.mp}MP</i></span><small>${s.tags.length ? s.tags.join(' + ') + ' · ' : ''}${describeSkill(s)}</small>`, 'cast', i, 'two', p.mp < s.mp);
    }).join('') + `${back}</div>`;
  }
  if (a.stage === 'item') {
    const its = Object.entries(G.inv.items).filter(([, n]) => n > 0);
    return `${head}<div class="cmdlist">` + (its.map(([id, n]) => btn('c', `<span class="sk"><b>${ITEMS[id].name}</b><i>x${n}</i></span><small>${ITEMS[id].desc}</small>`, 'useitem', id, 'two')).join('') || '<div class="dim">No items.</div>') + `${back}</div>`;
  }
  // target: pick from a list of names, like the original
  const list = a.tside === 'e' ? BT.b.e.map((e, i) => (e.hp > 0 ? btn('tgt', `${e.name}${e.weak.length ? ` <span class="tw">${e.weak.map((w) => ELEM_ICON[w]).join('')}</span>` : ''}<i>${e.hp}</i>`, 'e', i) : '')) : BT.b.p.map((x, i) => btn('tgt', `${esc(x.name)}<i>${x.hp > 0 ? x.hp : 'KO'}</i>`, 'p', i));
  return `${head}<div class="cmdlist"><div class="dim">${a.tside === 'e' ? 'ATTACK WHICH?' : 'WHO?'}</div>${list.join('')}${back}</div>`;
}
function autoCommand(p) { // reuse the hero's last move with sensible targets; fall back to a basic attack
  const b = BT.b, last = BT.last.get(p.name), foes = b.e.filter((x) => x.hp > 0), friends = b.p.filter((x) => x.hp > 0);
  let cmd = last && last.kind === 'skill' && skillWithGems(last.skillId, last.gems).mp <= p.mp ? { ...last } : { kind: 'skill', skillId: 'attack', gems: [] };
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
  if (lvSfx) setTimeout(() => sfx('levelup'), 1400);
  for (const d of r.drops) {
    if (d.kind === 'items') G.inv.items[d.id] = (G.inv.items[d.id] || 0) + 1; else G.inv[d.kind].push(d.id);
    const name = DB[d.kind][d.id].name, from = ENEMIES[d.from]?.name;
    lines.push(d.rare ? `<b class="gold">★ RARE: ${name}!</b>${from ? ` <span class="dim">(${esc(from)})</span>` : ''}` : `Got ${name}!`);
    if (d.from) ((G.flags.bestiary[d.from] ||= { seen: 1, kills: 0 }).got ||= {})[d.id] = true;
  }
  if (r.drops.some((d) => d.rare)) setTimeout(() => sfx('chest'), 900);
  for (const e of b.e) for (const [id, q] of Object.entries(QUESTS)) if (qstate(id) === 'active' && q.goal.type === 'kill' && q.goal.ids.includes(e.id)) G.flags.qprog[id] = Math.min(q.goal.n, (G.flags.qprog[id] || 0) + 1);
  const def = bossId ? BOSSES[bossId] : null;
  if (def) {
    G.flags.bosses[bossId] = true; const names = [];
    for (const k of ['weapons', 'armors', 'accs', 'gems']) for (const id of def.loot[k] || []) { G.inv[k].push(id); names.push(DB[k][id].name); }
    lines.push(`Found <b class="gold">${names.join(', ')}</b>!`);
    if (def.unlock) lines.push(`<i>${esc(def.unlock)}</i>`);
  }
  if (bossId) G.flags.bosses[bossId] = true;
  miniDirty = true;
  for (const e of b.e) { const r2 = (G.flags.bestiary[e.id] ||= { seen: 1, kills: 0 }); r2.kills++; }
  if (G.party.some((c) => c.hp > 0 && c.hp < maxOf(c).hp * 0.35) && tipOnce('rest')) lines.push('💡 Low on HP? Inns heal the whole party and save your game. Potions work from the Items menu.');
  questLog(lines);
  await new Promise((res) => {
    ov.innerHTML = `<div class="win"><h2>${def ? '🏆 ' + def.name + ' is slain!' : 'Victory!'}</h2><p>+${r.exp} EXP · +<span class="gold">${r.gold} G</span></p>${lines.map((l) => `<div>${l}</div>`).join('')}<div class="row">${btn('vdone', 'Continue', '', '', 'primary')}</div></div>`;
    ACT.vdone = () => { hide(); res(); };
  });
  if (def?.final) await ending();
}
function drawEnding(c2, t, W, H) {
  c2.imageSmoothingEnabled = false;
  const k = Math.min(1, t / 14), mix = (a, b2) => Math.round(a + (b2 - a) * k);
  const g = c2.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `rgb(${mix(14, 70)},${mix(18, 110)},${mix(50, 190)})`); g.addColorStop(0.7, `rgb(${mix(40, 255)},${mix(30, 170)},${mix(80, 120)})`); g.addColorStop(1, `rgb(${mix(60, 255)},${mix(40, 220)},${mix(90, 160)})`);
  c2.fillStyle = g; c2.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) { c2.fillStyle = `rgba(255,255,255,${Math.max(0, (1 - k * 1.4)) * (0.4 + 0.6 * Math.abs(Math.sin(t + i)))})`; c2.fillRect((i * 83) % W, (i * 41) % 120, 2, 2); }
  const sy = H - 40 - k * 75; c2.fillStyle = '#fff6c0'; c2.beginPath(); c2.arc(W * 0.62, sy, 26, 0, 7); c2.fill(); c2.fillStyle = 'rgba(255,230,160,.25)'; c2.beginPath(); c2.arc(W * 0.62, sy, 44, 0, 7); c2.fill();
  for (const [col, base, amp, f] of [['#6a5a98', 150, 40, 0.012], ['#3a2f66', 175, 30, 0.02]]) { c2.fillStyle = col; c2.beginPath(); c2.moveTo(0, H); for (let x = 0; x <= W; x += 8) c2.lineTo(x, base - Math.abs(Math.sin(x * f + 2)) * amp); c2.lineTo(W, H); c2.fill(); }
  c2.fillStyle = '#241c44'; c2.fillRect(W - 120, 56, 22, 140); c2.fillRect(W - 126, 50, 34, 8); c2.fillRect(W - 116, 36, 14, 16); // the Frost Spire, quiet at last
  c2.fillStyle = '#9ae0ff'; c2.fillRect(W - 112, 70, 4, 6); c2.fillRect(W - 112, 100, 4, 6);
  c2.fillStyle = '#1a1432'; c2.fillRect(0, H - 34, W, 34);
  G.party.forEach((c, i) => { const x = 40 + i * 52, y = H - 34 - 46 + Math.round(Math.sin(t * 2 + i) * 1.5); c2.fillStyle = 'rgba(0,0,0,.4)'; c2.fillRect(x + 4, H - 38, 38, 4); c2.drawImage(SP.hero(c.main), x, y, 48, 48); });
  for (let i = 0; i < 4; i++) { const bx = ((t * 30 + i * 140) % (W + 60)) - 30, by = 40 + i * 14 + Math.sin(t * 3 + i) * 4; c2.fillStyle = '#1a1432'; c2.fillRect(bx, by, 6, 2); c2.fillRect(bx - 2, by - 2 + (Math.floor(t * 8 + i) % 2) * 3, 2, 2); c2.fillRect(bx + 6, by - 2 + (Math.floor(t * 8 + i) % 2) * 3, 2, 2); }
}
async function ending() {
  music('ending');
  const left = ['wyrm', 'lich'].filter((k) => !G.flags.bosses[k]).map((k) => BOSSES[k].name);
  const quests = Object.keys(QUESTS).filter((id) => qstate(id) === 'done').length, gemsOn = G.party.reduce((n, c) => n + gemsUsed(c), 0);
  const roll = [
    ['GEMFORGE CHRONICLES', 'h'], ['', ''], ['THE HEROES', 'h'], ...G.party.map((c) => [`${esc(c.name)}: ${JOBS[c.main].name}${c.sub ? ' / ' + JOBS[c.sub].name : ''}, Lv ${c.level}`, '']), ['', ''],
    ['YOUR JOURNEY', 'h'], [`Time played: ${fmtTime(G.playtime)}`, ''], [`Battles won: ${G.stats?.wins || 0}`, ''], [`Side quests completed: ${quests}/${Object.keys(QUESTS).length}`, ''], [`Gems socketed: ${gemsOn}`, ''], [`Great evils slain: ${3 - left.length}/3`, ''], ['', ''],
    ['MADE WITH', 'h'], ['Claude Code', ''], ['every sprite, tile and song', ''], ['was drawn or composed in code', ''], ['', ''], ['THANK YOU FOR PLAYING', 'h'],
  ];
  await new Promise((res) => {
    show(`<h2>🎉 The Frost Titan falls!</h2><canvas id="endcv" width="512" height="230" style="width:100%;border:2px solid #060a28;border-radius:4px;display:block;background:#000"></canvas>
    <div class="credits"><div class="roll">${roll.map(([t, k]) => `<div class="${k}">${t || '&nbsp;'}</div>`).join('')}</div></div>
    ${left.length ? `<p class="dim">Still at large: ${left.join(', ')}. Hunt them down for the full legend.</p>` : '<p class="gold">All three great evils are slain. The realm is safe, for now.</p>'}${btn('edone', 'Keep exploring', '', '', 'primary')}`);
    const c2 = $('#endcv').getContext('2d'), t0 = performance.now();
    const loop = () => { if (!$('#endcv')) return; drawEnding(c2, (performance.now() - t0) / 1000, 512, 230); requestAnimationFrame(loop); }; loop();
    ACT.edone = () => { hide(); music(musicFor()); res(); };
  });
}
async function defeat() {
  music('gameover');
  await new Promise((res) => {
    ov.innerHTML = `<div class="win"><h2 class="bad">Defeated…</h2><p>The party is carried back to Haven Town. You lose half your gold.</p>${btn('ddone', 'Wake up', '', '', 'primary')}</div>`;
    ACT.ddone = () => { G.gold = Math.floor(G.gold / 2); for (const c of G.party) { const s = maxOf(c); c.hp = s.hp; c.mp = s.mp; } goto('haven', 9, 11); hide(); res(); };
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
const muteBtn = $('#mute'), syncMute = () => { muteBtn.textContent = isMuted() ? '🔇' : '🔊'; };
muteBtn.addEventListener('click', () => { setMuted(!isMuted()); syncMute(); if (!isMuted()) sfx('click'); });
syncMute();

// debug / test hook
window.__game = { get G() { return G; }, get BT() { return BT; }, battle, step, goto, MAPS, snap, OPT, ACT, ui: { shop, inn, guild, socketer, title, slotScreen, diffScreen, talk, itemsMenu, mainMenu } };
title();
