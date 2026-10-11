// ===== Gemforge Chronicles: UI, map, menus, battle flow =====
import { JOBS, SKILLS, GEMS, WEAPONS, ARMORS, ACCS, ITEMS, WEAPON_TYPES, ENEMIES, ENCOUNTERS, ELEM_ICON, BOSSES, SHOPS } from './data.js';
import { MAPS, WALK } from './maps.js';
import * as L from './logic.js';
import * as SP from './sprites.js';
import { Stage, FX } from './stage.js';
import { music, sfx, unlock, isMuted, setMuted, setVolumes } from './audio.js';
const { stats, newChar, learnable, slotSkill, slotGems, gemCapacity, gemsUsed, sanitize, skillWithGems, describeSkill, gainExp, expNeeded, Battle, rewards, SIG, GEMS_PER_SLOT } = L;

const $ = (s) => document.querySelector(s);
const cv = $('#map'), cx = cv.getContext('2d'), ov = $('#overlay');
const SAVE = 'gemforge-save-v2', SETTINGS = 'gemforge-settings-v2', TS = 32, VW = 16, VH = 12;
let G = null;
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
function show(html, cls = '') { ov.innerHTML = `<div class="win anim">${html}</div>`; ov.className = 'on ' + cls; }
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
const gearLine = (g) => ['atk', 'mag', 'def', 'hp', 'mp', 'spd'].filter((k) => g[k]).map((k) => `${g[k] > 0 ? '+' : ''}${g[k]} ${k}`).concat(g.res ? g.res.map((r) => `resist ${r}`) : [], g.sockets ? [`${g.sockets}◇`] : [], g.innate ? [`innate ${GEMS[g.innate].name}`] : []).join(', ');
const npcImg = (type, px = 48) => `<img class="px" src="${SP.url(SP.npc(type), px / 16)}" width="${px}" height="${px}" alt="">`;

// ---------- state ----------
function newGame() {
  G = {
    party: [newChar('Aldric', 'knight', 'rogue', 'iron_sword', 'leather'), newChar('Lyra', 'mage', 'cleric', 'oak_staff', 'cloth'),
      newChar('Mira', 'cleric', 'bard', 'oak_staff', 'cloth'), newChar('Kael', 'rogue', 'ranger', 'bronze_dirk', 'leather')],
    gold: 250,
    inv: { weapons: ['iron_knuckle', 'short_bow', 'dusty_tome', 'leather_whip'], armors: ['cloth'], accs: [], gems: ['fire', 'chain', 'vamp', 'thrifty', 'pierce'], items: { potion: 4, ether: 2, phoenix: 1 } },
    map: 'haven', x: 9, y: 11, flags: { chests: {}, bosses: {}, seen: {}, talked: {}, visited: {} },
  };
}
const save = () => { try { localStorage.setItem(SAVE, JSON.stringify(G)); return true; } catch { return false; } };
const hasSave = () => { try { return !!localStorage.getItem(SAVE); } catch { return false; } };
const load = () => { try { G = JSON.parse(localStorage.getItem(SAVE)); return !!G; } catch { return false; } };
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
    if (ch) seen[y] = row;
  }
}

// ---------- minimap / map screen ----------
const MINI = { '.': '#4f9a3f', ',': '#e6eef8', ':': '#3d5c3a', _: '#8a7040', '=': '#8a5a30', '~': '#2c5fa8', T: '#2a6a2c', t: '#9ab0c8', M: '#7b7468', B: '#c0a060', H: '#e8c060', D: '#c04040', E: '#f4d35e' };
const MINI_FLOOR = { cavern: '#5a566a', crypt: '#4a5a50', spire: '#8aa8d0' }, MINI_WALL = { cavern: '#22202a', crypt: '#16221c', spire: '#2a4a78' };
function drawMini(c2, id, scale, ox, oy, t) {
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
  if (G.map === id && Math.floor(t * 3) % 2 === 0) { c2.fillStyle = '#ffffff'; c2.fillRect(ox + G.x * scale - 1, oy + G.y * scale - 1, scale + 2, scale + 2); }
}
function miniOverlay(t) {
  const m = mapDef(); if (!OPT.minimap || !m.fog) return;
  const W = m.rows[0].length, H = m.rows.length, sc = Math.max(2, Math.min(Math.floor(104 / W), Math.floor(80 / H))), w = W * sc, h = H * sc, ox = cv.width - w - 8, oy = 8;
  cx.fillStyle = 'rgba(6,10,40,.72)'; cx.fillRect(ox - 3, oy - 3, w + 6, h + 6); cx.strokeStyle = '#e8ecf8'; cx.lineWidth = 1; cx.strokeRect(ox - 2.5, oy - 2.5, w + 5, h + 5);
  drawMini(cx, G.map, sc, ox, oy, t);
}

// ---------- map rendering ----------
let face = 1, vx = 0, vy = 0, trans = 0, lastT = 0, trail = [], fv = [];
const snap = () => { vx = G.x; vy = G.y; trail = [{ x: G.x, y: G.y }]; fv = [0, 1, 2].map(() => ({ x: G.x, y: G.y, f: face, mv: false })); reveal(); };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const LIGHT = { cavern: { glow: '255,150,50', dark: 0.88, r: 175 }, crypt: { glow: '90,255,140', dark: 0.9, r: 165 }, spire: { glow: '130,210,255', dark: 0.5, r: 250 } };
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
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    let ch = tileAt(x, y);
    if (ch === 'C' && G.flags.chests[chestKey(x, y)]) ch = 'c';
    if (ch === 'X') ch = '.';
    if (ch === 'B' && gateOpen()) ch = '_';
    cx.drawImage(SP.tile(m.theme, ch, x, y, frame), sx(x), sy(y), TS, TS);
    if (ch === '~') { // shoreline foam where water meets land
      cx.fillStyle = 'rgba(255,255,255,.55)';
      const land = (a, b) => { const c = tileAt(a, b); return c !== '~' && c !== '=' && a >= 0 && b >= 0 && a < W && b < H; };
      if (land(x, y - 1)) cx.fillRect(sx(x), sy(y), TS, 2);
      if (land(x, y + 1)) cx.fillRect(sx(x), sy(y) + TS - 2, TS, 2);
      if (land(x - 1, y)) cx.fillRect(sx(x), sy(y), 2, TS);
      if (land(x + 1, y)) cx.fillRect(sx(x) + TS - 2, sy(y), 2, TS);
    }
  }
  const torches = [], theme = m.theme;
  if (m.kind === 'dungeon') for (let y = Math.max(0, y0 - 1); y < y1 - 1; y++) for (let x = x0; x < x1; x++) if (tileAt(x, y) === '#' && tileAt(x, y + 1) === '.' && (x * 5 + y * 3) % 7 === 0) { cx.drawImage(SP.torch(Math.floor(t * 7 + x) % 2, theme), sx(x), sy(y), TS, TS); torches.push([sx(x) + TS / 2, sy(y) + TS * 0.4]); }
  for (const [dx, dy, k] of m.decor || []) cx.drawImage(SP.decor(k), sx(dx), sy(dy), TS, TS);
  if (m.kind === 'town') { // door signs so each building is identifiable
    cx.font = '15px sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    for (const [k, p] of Object.entries(m.portals)) { const to = p.to; const icon = /inn/.test(to) ? '🛏️' : /shop/.test(to) ? '🛒' : /smith/.test(to) ? '⚒️' : /guild/.test(to) ? '⚔️' : /elder|house|cottage/.test(to) ? '🏠' : null; if (!icon) continue; const [px2, py2] = k.split(',').map(Number); cx.fillStyle = 'rgba(6,10,40,.8)'; cx.fillRect(sx(px2) + 6, sy(py2) - 13, 20, 16); cx.fillText(icon, sx(px2) + TS / 2, sy(py2) - 5); }
    cx.textBaseline = 'alphabetic';
  }
  if (m.boss && !defeated(m.boss.id)) { const bob = Math.round(Math.sin(t * 2) * 1.5); cx.drawImage(SP.enemy(m.boss.id), sx(m.boss.x), sy(m.boss.y) + bob, TS, TS); }
  for (const n of m.npcs || []) {
    const nx0 = sx(n.x), ny0 = sy(n.y), bob = Math.round(Math.sin(t * 2 + n.x) * 0.8);
    cx.fillStyle = 'rgba(0,0,0,.35)'; cx.beginPath(); cx.ellipse(nx0 + TS / 2, ny0 + TS - 3, 10, 4, 0, 0, 7); cx.fill();
    cx.drawImage(SP.npc(n.type), nx0, ny0 - bob, TS, TS);
    if (n.text && !G.flags.talked[`${G.map}:${n.x},${n.y}`]) { cx.fillStyle = '#ffd25a'; cx.font = 'bold 14px sans-serif'; cx.textAlign = 'center'; cx.strokeStyle = '#201000'; cx.lineWidth = 3; cx.strokeText('!', nx0 + TS / 2, ny0 - 3 - bob * 2); cx.fillText('!', nx0 + TS / 2, ny0 - 3 - bob * 2); }
  }
  const px = sx(vx), py = sy(vy);
  const crew = [{ i: 0, x: vx, y: vy, f: face, mv: Math.abs(vx - G.x) + Math.abs(vy - G.y) > 0.05 }, ...fv.slice(0, G.party.length - 1).map((f, i) => ({ i: i + 1, ...f }))].sort((a, b) => a.y - b.y || b.i - a.i);
  for (const c of crew) {
    const cx0 = sx(c.x), cy0 = sy(c.y), hop = c.mv ? Math.round(Math.abs(Math.sin(t * 16 + c.i)) * 2) : 0;
    cx.fillStyle = 'rgba(0,0,0,.35)'; cx.beginPath(); cx.ellipse(cx0 + TS / 2, cy0 + TS - 3, 10, 4, 0, 0, 7); cx.fill();
    cx.save(); cx.translate(c.f < 0 ? cx0 + TS : cx0, cy0 - hop); cx.scale(c.f, 1);
    cx.drawImage(SP.hero(G.party[c.i].main, c.mv ? [0, 1, 0, 2][Math.floor(t * 10 + c.i) % 4] : 0), 0, 0, TS, TS); cx.restore();
  }
  if (m.kind === 'outdoor') {
    const reg = regionOf();
    cx.fillStyle = 'rgba(10,20,40,.13)'; // drifting cloud shadows
    for (let i = 0; i < 3; i++) { const cxp = ((t * 14 + i * 230) % (cv.width + 240)) - 120; cx.beginPath(); cx.ellipse(cxp, 70 + i * 120, 80, 26, 0, 0, 7); cx.fill(); }
    if (reg === 'swamp') { cx.fillStyle = 'rgba(40,70,40,.14)'; cx.fillRect(0, 0, cv.width, cv.height); }
    if (reg === 'snow') { cx.fillStyle = 'rgba(210,225,255,.07)'; cx.fillRect(0, 0, cv.width, cv.height); cx.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 46; i++) cx.fillRect(Math.round((i * 47 + Math.sin(t * 0.9 + i) * 14 + t * 10) % cv.width), Math.round((t * (30 + (i % 5) * 9) + i * 53) % cv.height), 2, 2); }
  } else if (m.kind === 'dungeon') { // torch-lit darkness around the party
    const lt = LIGHT[theme], fl = Math.sin(t * 9) * 4 + Math.sin(t * 23) * 2, gx = px + TS / 2, gy = py + TS / 2;
    const g = cx.createRadialGradient(gx, gy, 30, gx, gy, lt.r + fl);
    g.addColorStop(0, `rgba(${lt.glow},.07)`); g.addColorStop(0.45, `rgba(0,0,10,${lt.dark * 0.32})`); g.addColorStop(1, `rgba(0,0,10,${lt.dark})`);
    cx.fillStyle = g; cx.fillRect(0, 0, cv.width, cv.height);
    cx.globalCompositeOperation = 'lighter'; // torch glow on top of the darkness
    for (const [tx, ty] of torches) { const r = 52 + Math.sin(t * 11 + tx) * 4, tg = cx.createRadialGradient(tx, ty, 2, tx, ty, r); tg.addColorStop(0, `rgba(${lt.glow},.38)`); tg.addColorStop(1, `rgba(${lt.glow},0)`); cx.fillStyle = tg; cx.fillRect(tx - r, ty - r, r * 2, r * 2); }
    cx.globalCompositeOperation = 'source-over';
  } else { cx.fillStyle = 'rgba(255,170,80,.06)'; cx.fillRect(0, 0, cv.width, cv.height); }
  miniOverlay(t);
  if (trans > 0) { // battle-start wipe
    cx.fillStyle = '#000';
    for (let r = 0; r < 12; r++) { const w = Math.min(1, trans * 1.5 - (r % 6) * 0.08) * cv.width; if (w > 0) cx.fillRect(r % 2 ? cv.width - w : 0, r * TS, w, TS); }
  }
  $('#loc').textContent = m.kind === 'outdoor' ? REGION_NAME[regionOf()] : m.name; $('#gold').textContent = `${G.gold} G`;
}

function drawTitle(t) {
  const W = cv.width, H = cv.height; cx.imageSmoothingEnabled = false;
  const g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a0c24'); g.addColorStop(0.6, '#2a2060'); g.addColorStop(1, '#6a3a78'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) { const x = (i * 97) % W, y = (i * 53) % 230, a = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i)); cx.fillStyle = `rgba(255,255,255,${a})`; cx.fillRect(x, y, i % 5 ? 2 : 3, i % 5 ? 2 : 3); }
  cx.fillStyle = '#f4ecc8'; cx.beginPath(); cx.arc(468, 52, 22, 0, 7); cx.fill(); cx.fillStyle = '#d8cfa0'; cx.beginPath(); cx.arc(461, 46, 5, 0, 7); cx.arc(475, 62, 4, 0, 7); cx.fill();
  for (const [col, base, amp, f] of [['#2a1f58', 290, 50, 0.011], ['#1a1440', 320, 38, 0.02]]) { cx.fillStyle = col; cx.beginPath(); cx.moveTo(0, H); for (let x = 0; x <= W; x += 8) cx.lineTo(x, base - Math.abs(Math.sin(x * f + 1)) * amp - Math.sin(x * f * 3) * 8); cx.lineTo(W, H); cx.fill(); }
  cx.fillStyle = '#0e0b24'; cx.fillRect(0, 336, W, 48);
  const gemCols = ['#ff7a3a', '#7fd8f0', '#fff27a', '#ffffff', '#b07aff'];
  for (let i = 0; i < 9; i++) { const x = 40 + i * 54, y = 190 + Math.sin(t * 1.4 + i * 1.7) * 14, c = gemCols[i % 5]; cx.fillStyle = c; cx.beginPath(); cx.moveTo(x, y - 7); cx.lineTo(x + 5, y); cx.lineTo(x, y + 7); cx.lineTo(x - 5, y); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.6)'; cx.fillRect(x - 1, y - 4, 2, 3); }
  ['knight', 'mage', 'cleric', 'rogue', 'ranger', 'monk'].forEach((j, i) => { const x = ((t * 34 + i * 96) % (W + 80)) - 56, y = 296 - Math.round(Math.abs(Math.sin(t * 9 + i)) * 4); cx.fillStyle = 'rgba(0,0,0,.4)'; cx.fillRect(x + 8, 340, 32, 4); cx.drawImage(SP.hero(j), x, y, 48, 48); });
  cx.textAlign = 'center'; cx.textBaseline = 'alphabetic'; cx.lineJoin = 'round';
  const tg = cx.createLinearGradient(0, 70, 0, 120); tg.addColorStop(0, '#fff6c0'); tg.addColorStop(1, '#e89a30');
  cx.font = '46px "Press Start 2P", ui-monospace, Menlo, monospace'; cx.lineWidth = 9; cx.strokeStyle = '#2a1050'; cx.strokeText('GEMFORGE', W / 2, 112); cx.fillStyle = tg; cx.fillText('GEMFORGE', W / 2, 112);
  cx.font = '20px "Press Start 2P", ui-monospace, Menlo, monospace'; cx.lineWidth = 6; cx.strokeText('CHRONICLES', W / 2, 160); cx.fillStyle = '#c8b8ff'; cx.fillText('CHRONICLES', W / 2, 160);
}

function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016); lastT = now;
  if (!G) return drawTitle(now / 1000);
  const sp = 9 * dt; vx += clamp(G.x - vx, -sp, sp); vy += clamp(G.y - vy, -sp, sp);
  fv.forEach((f, i) => { const tg = trail[Math.max(0, trail.length - 2 - i)] || { x: G.x, y: G.y }, dx = tg.x - f.x, dy = tg.y - f.y; f.mv = Math.abs(dx) + Math.abs(dy) > 0.02; if (Math.abs(dx) > 0.01) f.f = Math.sign(dx); f.x += clamp(dx, -sp, sp); f.y += clamp(dy, -sp, sp); });
  if (!inOverlay()) draw(now / 1000);
}
requestAnimationFrame(tick);
const frame = () => new Promise((r) => requestAnimationFrame(r));
async function transition() { sfx('encounter'); for (trans = 0.02; trans < 1.2; trans += 0.065) await frame(); trans = 1; await sleep(60); }
function banner(text) { const b = $('#banner'); b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
function goto(id, x, y) {
  G.map = id; G.x = x; G.y = y; G.flags.visited[id] = true; snap(); music(musicFor()); sfx('door');
  banner(id === 'world' ? REGION_NAME[regionOf()] : MAPS[id].name); G.region = regionOf(); draw();
}
let busy = false;
async function step(dx, dy) {
  if (inOverlay() || busy || Math.abs(vx - G.x) + Math.abs(vy - G.y) > 0.45) return;
  const m = mapDef(), nx = G.x + dx, ny = G.y + dy, t = tileAt(nx, ny);
  if (dx) face = dx;
  const npc = npcAt(nx, ny); if (npc) return talk(npc);
  if (decorAt(nx, ny)) return;
  if (t === 'C') { if (!G.flags.chests[chestKey(nx, ny)]) openChest(nx, ny); return; }
  if (!walkable(t)) return;
  G.x = nx; G.y = ny; trail.push({ x: nx, y: ny }); if (trail.length > 8) trail.shift();
  const pt = m.portals?.[`${nx},${ny}`]; if (pt) return goto(pt.to, pt.x, pt.y);
  reveal(); draw();
  if (m.kind === 'outdoor') { const reg = regionOf(); if (reg !== G.region) { G.region = reg; banner(REGION_NAME[reg]); music(musicFor()); } }
  if (m.boss && t === 'X' && !G.flags.bosses[m.boss.id]) return battle([m.boss.id], m.boss.id);
  const table = m.enc || m.encByTile?.[t];
  if (table && Math.random() < m.rate) { const tb = ENCOUNTERS[table]; await battle(tb[Math.floor(Math.random() * tb.length)]); }
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
document.querySelectorAll('#dpad button').forEach((b) => b.addEventListener('click', () => {
  const d = b.dataset.d; if (d === 'menu') return inOverlay() ? null : mainMenu();
  step(...{ up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d]);
}));
ACT.close = hide;

function openChest(x, y) {
  const c = mapDef().chests?.[`${x},${y}`] || { gold: 50 }; G.flags.chests[chestKey(x, y)] = true; sfx('chest');
  const got = [];
  for (const k of ['weapons', 'armors', 'accs', 'gems']) for (const id of c[k] || []) { G.inv[k].push(id); got.push(DB[k][id].name); }
  for (const [id, n] of Object.entries(c.items || {})) { G.inv.items[id] = (G.inv.items[id] || 0) + n; got.push(`${ITEMS[id].name} ×${n}`); }
  if (c.gold) { G.gold += c.gold; got.push(`${c.gold} G`); }
  draw();
  show(`<h2>📦 Treasure!</h2><p>You found: <b class="gold">${got.join(', ')}</b></p>${btn('close', 'OK', '', '', 'primary')}`);
}

// ---------- NPCs, dialogue, services ----------
let curNpc = null;
function talk(npc) {
  sfx('click');
  if (npc.service === 'shop') return shop(npc.shop);
  if (npc.service === 'inn') return inn(npc);
  if (npc.service === 'guild') return guild();
  G.flags.talked[`${G.map}:${npc.x},${npc.y}`] = true; curNpc = npc; say(0);
}
function say(i) {
  const n = curNpc, last = i >= n.text.length - 1;
  show(`<h2>${esc(n.name)}</h2><div class="npc">${npcImg(n.type, 64)}<p>${esc(n.text[i])}</p></div><div class="row">${last ? btn('close', 'Close', '', '', 'primary') : btn('say', 'Next ▶', i + 1, '', 'primary')}</div>`);
}
ACT.say = (i) => say(+i);
function guild() { B.guild = true; show(`<h2>⚔️ ${esc(mapDef().name)}</h2><div class="npc">${npcImg('guildmaster', 64)}<p>Reassign jobs, gear and skills for free. Sub jobs lend their skills two levels behind your main job.</p></div><div class="grid">${G.party.map((c, i) => btn('build', `${esc(c.name)} — ${JOBS[c.main].name}${c.sub ? ' / ' + JOBS[c.sub].name : ''}`, i)).join('')}</div>${btn('leave', 'Leave', '', '', 'primary')}`); }
ACT.leave = () => { B.guild = false; hide(); };
function inn(npc) {
  const cost = npc.cost || 25;
  show(`<h2>🛏️ ${esc(mapDef().name)}</h2><div class="npc">${npcImg('innkeeper', 64)}<p>A night's rest restores everyone and saves your game. <span class="gold">${cost} G</span><br>You have <span class="gold">${G.gold} G</span>.</p></div>${btn('rest', 'Rest', cost, '', 'primary', G.gold < cost)}${btn('close', 'Leave')}`);
}
ACT.rest = (cost) => { sfx('rest'); G.gold -= +cost; for (const c of G.party) { const s = maxOf(c); c.hp = s.hp; c.mp = s.mp; } save(); draw(); show(`<h2>🛏️ Rested</h2><p>HP and MP restored. Game saved.</p>${btn('close', 'OK', '', '', 'primary')}`); };

let shopTab = 'buy', curShop = null;
function shop(id, msg = '') {
  if (id) curShop = id;
  const def = SHOPS[curShop];
  const buyRows = Object.entries(def.stock).flatMap(([k, ids]) => ids.map((id2) => { const d = DB[k][id2]; return `<div class="slot"><div class="t"><b>${k === 'gems' ? gemImg(id2) + ' ' : ''}${d.name}</b><small>${d.desc || (k === 'weapons' ? WEAPON_TYPES[d.type].name + ' · ' : '') + gearLine(d)}</small></div>${btn('buy', `${d.price} G`, k, id2, '', G.gold < d.price)}</div>`; }));
  const sellRows = ['weapons', 'armors', 'accs', 'gems'].flatMap((k) => [...new Set(G.inv[k])].map((id2) => { const d = DB[k][id2], p = Math.floor((d.price || 200) / 2); return `<div class="slot"><div class="t"><b>${k === 'gems' ? gemImg(id2) + ' ' : ''}${d.name}</b> ×${G.inv[k].filter((x) => x === id2).length}</div>${btn('sell', `Sell ${p} G`, k, id2)}</div>`; })).concat(Object.entries(G.inv.items).filter(([, n]) => n > 0).map(([id2, n]) => `<div class="slot"><div class="t"><b>${ITEMS[id2].name}</b> ×${n}</div>${btn('sell', `Sell ${Math.floor(ITEMS[id2].price / 2)} G`, 'items', id2)}</div>`));
  show(`<h2>${def.title}</h2><div class="row"><span class="gold grow">${G.gold} G</span>${btn('tab', 'Buy', 'buy', '', shopTab === 'buy' ? 'sel' : '')}${btn('tab', 'Sell', 'sell', '', shopTab === 'sell' ? 'sel' : '')}</div>${msg ? `<p class="dim">${msg}</p>` : ''}${(shopTab === 'buy' ? buyRows : sellRows).join('') || '<p class="dim">Nothing to sell.</p>'}${btn('close', 'Leave', '', '', 'primary')}`);
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
  <div class="row" style="justify-content:center">${btn('new', 'New Game', '', '', 'primary')}${btn('cont', 'Continue', '', '', '', !hasSave())}${btn('opts', '⚙ Options')}</div>`, 'title');
  $('#loc').textContent = ''; $('#gold').textContent = ''; music('town');
}
ACT.new = () => { newGame(); G.flags.visited.haven = true; snap(); music(musicFor()); hide(); banner(mapDef().name); intro(); };
ACT.cont = () => { if (load()) { G.flags.visited ||= {}; snap(); music(musicFor()); hide(); banner(mapDef().name); } };
function intro() {
  show(`<h2>Welcome to Haven Town</h2><div class="npc">${npcImg('elder', 64)}<p>Three great evils stir: the <b>Ashen Wyrm</b> in the cavern east of town, a <b>Lich King</b> in the swamp crypt, and a <b>Frost Titan</b> in a spire far to the north.</p></div>
  <p>Visit the <b>Guild</b> to choose jobs, the <b>Smithy</b> for gear, and open the <b>Menu</b> (Esc) to socket gems into skills. Talk to townsfolk: a <span class="gold">!</span> marks someone with news. Check your <b>Journal</b> if you get lost.</p>${btn('close', 'Begin', '', '', 'primary')}`);
}
function mainMenu() {
  show(`<h2>Menu</h2><div class="grid">${G.party.map((c, i) => { const s = maxOf(c); return `<div class="pm"><img src="${SP.heroURL(c.main)}" width="32" height="32" class="px" style="float:right">${btn('build', `<b>${esc(c.name)}</b> Lv${c.level}`, i)}<div class="dim">${JOBS[c.main].icon} ${JOBS[c.main].name}${c.sub ? ' / ' + JOBS[c.sub].name : ''}</div>HP ${c.hp}/${s.hp}${bar(c.hp, s.hp, 'hp')}MP ${c.mp}/${s.mp}${bar(c.mp, s.mp, 'mp')}</div>`; }).join('')}</div>
  <div class="row">${btn('items', '🎒 Items')}${btn('mapscreen', '🗺 Map')}${btn('journal', '📜 Journal')}${btn('opts', '⚙ Options')}${btn('save', '💾 Save')}${btn('title', 'Title')}${btn('close', 'Close', '', '', 'primary')}</div><div id="msg" class="dim"></div>`);
}
ACT.title = title;
ACT.save = () => { $('#msg').textContent = save() ? 'Game saved.' : 'Could not save.'; };

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
  <h3>Tips</h3><div class="dim">• Gems rewrite skills: try Wide + a heal, Echo on a big spell, Stun on a fast skill.<br>• Jobs can be changed in any town building; sub jobs lend skills (2 levels behind).<br>• Inns heal and save. Frostholm's shops sell much better gear.</div>${btn('menu', 'Back', '', '', 'primary')}`);
};
let optBack = 'menu';
function optionsScreen() {
  const onOff = (v) => (v ? 'On' : 'Off');
  show(`<h2>⚙ Options</h2>
  <div class="opt"><label>Music volume <b>${Math.round(OPT.music * 100)}%</b></label><input type="range" min="0" max="100" value="${Math.round(OPT.music * 100)}" data-in="music"></div>
  <div class="opt"><label>Sound effects <b>${Math.round(OPT.sfx * 100)}%</b></label><input type="range" min="0" max="100" value="${Math.round(OPT.sfx * 100)}" data-in="sfx"></div>
  <div class="row">${btn('optspeed', `Battle speed: <b>${OPT.speed}</b>`)}${btn('optmini', `Minimap: <b>${onOff(OPT.minimap)}</b>`)}${btn('optshake', `Screen shake: <b>${onOff(OPT.shake)}</b>`)}${btn('optmute', `Sound: <b>${isMuted() ? 'Muted' : 'On'}</b>`)}</div>
  <h3>Controls</h3><div class="dim controls"><div><b>Arrows / WASD</b> move</div><div><b>Esc / M</b> menu</div><div><b>N</b> toggle minimap</div><div><b>Arrows</b> move menu focus</div><div><b>Enter / Space</b> select</div><div><b>Esc / Backspace</b> back</div></div>
  <div class="row">${btn('optback', 'Back', '', '', 'primary')}</div>`);
}
ACT.opts = () => optionsScreen();
ACT.optback = () => (optBack === 'title' && !G ? title() : mainMenu());
ACTIN.music = (v) => { OPT.music = v / 100; applyOptions(); ov.querySelector('[data-in=music]').previousElementSibling.querySelector('b').textContent = `${v}%`; };
ACTIN.sfx = (v) => { OPT.sfx = v / 100; applyOptions(); ov.querySelector('[data-in=sfx]').previousElementSibling.querySelector('b').textContent = `${v}%`; sfx('click'); };
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
  const gearRow = (label, view, id, kind) => `<div class="slot"><div class="t"><b>${label}:</b> ${id ? DB[kind][id].name : '<span class="dim">— none —</span>'}<small>${id ? (kind === 'weapons' ? WEAPON_TYPES[WEAPONS[id].type].name + ' · ' : '') + gearLine(DB[kind][id]) : ''}</small></div>${btn('bview', 'Change', view)}</div>`;
  const slotRow = (i) => {
    const sid = slotSkill(c, i), gems = slotGems(c, i);
    const m2 = sid ? skillWithGems(sid, gems) : null;
    return `<div class="slot"><div class="t"><b>${i === SIG ? '⭐ Weapon' : `Slot ${i + 1}`}:</b> ${sid ? `<b>${m2.name}</b> ${gems.map((g) => gemChip(g, true)).join('')}` : '<span class="dim">— empty —</span>'}<small>${m2 ? describeSkill(m2) : ''}</small></div>${btn('bslot', 'Edit', i)}</div>`;
  };
  show(`<div class="row">${btn('bnav', '◀', -1)}<h2 class="grow"><img src="${SP.heroURL(c.main)}" width="36" height="36" class="px" style="vertical-align:middle"> ${esc(c.name)} · Lv${c.level}</h2>${btn('bnav', '▶', 1)}</div>
  <div class="dim">EXP ${c.exp}/${c.level < L.MAX_LEVEL ? expNeeded(c.level) : '—'}</div>
  <div class="card">
    <div class="row"><b>Main:</b> ${m.icon} ${m.name} ${btn('bview', 'Change', 'jobMain', '', '', !jobs)}<b>Sub:</b> ${sj ? sj.icon + ' ' + sj.name : 'none'} ${btn('bview', 'Change', 'jobSub', '', '', !jobs)}</div>
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
    return `<div class="slot"><div class="t"><b>${g.name}</b> ×${G.inv[kind].filter((x) => x === id).length}<small>${kind === 'weapons' ? WEAPON_TYPES[g.type].name + ' · ' : ''}${gearLine(g)}${ok ? '' : ' · <span class="bad">job can\'t use</span>'}</small></div>${btn('equip', 'Equip', kind, id, '', !ok)}</div>`;
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
  if (bossId) return bossId === 'wyrm' ? 'boss' : bossId === 'lich' ? 'crypt' : 'spire';
  const m = mapDef();
  if (m.kind === 'dungeon') return m.theme === 'cavern' ? 'dungeon' : m.theme;
  const r = regionOf(); return r === 'snow' ? 'snow' : r === 'swamp' ? 'swamp' : 'world';
}
async function battle(groupIds, bossId = null) {
  busy = true;
  const b = new Battle(G.party, groupIds, Math.random, !!bossId);
  await transition(); music(bossId ? 'boss' : 'battle');
  BT = { b, boss: bossId, logBig: false, log: [bossId ? BOSSES[bossId].intro : `${b.e.map((e) => e.name).join(', ')} appear!`], ask: null };
  BT.stage = new Stage(b, stageKind(bossId));
  renderBattle();
  while (!b.over) {
    const cmds = new Map();
    for (const p of b.p.filter((x) => x.hp > 0)) {
      const cmd = await askCommand(p);
      cmds.set(p, cmd);
    }
    BT.ask = null; BT.stage.setActive(null);
    for (const lines of b.round(cmds)) { BT.log.push(...lines); renderBattle(); playFx(b.fx.splice(0)); await sleep(SPEEDS[OPT.speed]); }
    renderBattle();
  }
  BT.stage.stop(); trans = 0;
  b.p.forEach((x) => { x.ch.hp = x.hp; x.ch.mp = x.mp; });
  if (b.over === 'fled') sfx('flee');
  if (b.over === 'win') await victory(b, bossId);
  else if (b.over === 'lose') await defeat();
  else { hide(); }
  BT = null; busy = false; if (G) { if (b.over !== 'lose') music(musicFor()); draw(); }
}
function renderBattle() {
  const { b, ask } = BT;
  const tgtFoes = ask?.stage === 'target' && ask.tside === 'e', tgtAllies = ask?.stage === 'target' && ask.tside === 'p';
  const order = b.order().map((x) => `<img class="px o-${x.side} ${ask?.p === x ? 'cur' : ''}" title="${esc(x.name)}" src="${x.side === 'p' ? SP.heroURL(x.ch.main) : SP.enemyURL(x.id)}" width="${x.side === 'e' && SP.isBig(x.id) ? 34 : 26}" height="${x.side === 'e' && SP.isBig(x.id) ? 34 : 26}" alt="${esc(x.name)}">`).join('');
  ov.innerHTML = `<div class="win"><div class="order"><span class="dim">Turn order</span>${order}</div><div id="stagehost"></div><div class="foes">${b.e.map((e, i) => `<div data-n="${e.name}" class="foe ${e.hp <= 0 ? 'dead' : ''} ${tgtFoes && e.hp > 0 ? 'targetable' : ''}" ${tgtFoes && e.hp > 0 ? `data-act="tgt" data-a="e" data-b="${i}"` : ''}>
    <b>${e.name}</b>${bar(e.hp, e.maxhp, 'hp')}<small class="dim">${e.hp}/${e.maxhp}${e.st.poison > 0 ? ' ☠️' : ''}${e.st.slow > 0 ? ' 🐌' : ''}${e.st.stun > 0 ? ' 💫' : ''}</small>
    <div class="dim" style="font-size:11px">${e.weak.length ? 'weak ' + e.weak.map((w) => ELEM_ICON[w]).join('') : ''}${e.res.length ? ' res ' + e.res.map((w) => ELEM_ICON[w]).join('') : ''}</div></div>`).join('')}</div>
  <div class="logwrap"><div class="log ${BT.logBig ? 'big' : ''}" id="log">${BT.log.map((l) => `<div>${esc(l)}</div>`).join('')}</div><button class="logtoggle" data-tap="logsize" tabindex="-1" title="Expand / collapse the battle log (L)">${BT.logBig ? '▾ Log' : '▴ Log'}</button></div>
  <div class="party">${b.p.map((p, i) => `<div data-n="${p.name}" class="pm ${p.hp <= 0 ? 'dead' : ''} ${ask?.p === p ? 'active' : ''} ${tgtAllies ? 'targetable' : ''}" ${tgtAllies ? `data-act="tgt" data-a="p" data-b="${i}"` : ''}>
    <img class="px" src="${SP.heroURL(p.ch.main)}" width="28" height="28" style="vertical-align:middle"> <b>${esc(p.name)}</b> <small>${p.st.poison > 0 ? ' ☠️' : ''}${p.st.atkup > 0 ? ' ⬆️' : ''}${p.st.defup > 0 ? ' 🛡️' : ''}${p.st.slow > 0 ? ' 🐌' : ''}${p.st.stun > 0 ? ' 💫' : ''}</small>
    <div>HP ${p.hp}/${p.maxhp}${bar(p.hp, p.maxhp, 'hp')}MP ${p.mp}/${p.maxmp}${bar(p.mp, p.maxmp, 'mp')}</div></div>`).join('')}</div>
  <div id="cmd">${ask ? cmdHtml(ask) : '<span class="dim">…</span>'}</div></div>`;
  ov.className = 'on';
  $('#stagehost').appendChild(BT.stage.canvas);
  const lg = $('#log'); if (lg) lg.scrollTop = lg.scrollHeight;
}
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
  const p = a.p, c = p.ch;
  if (a.stage === 'root') return `<div class="row"><b>${esc(p.name)}</b>${btn('c', '⚔️ Attack', 'attack')}${btn('c', '✨ Skills', 'skills')}${btn('c', '🎒 Item', 'item')}${btn('c', '🛡️ Defend', 'defend')}${btn('c', '🏃 Flee', 'flee', '', '', BT.b.boss)}</div>`;
  if (a.stage === 'skills') {
    return `<div class="row"><b>${esc(p.name)}</b> ${btn('c', '← Back', 'root')}</div>` + [0, 1, 2, 3, SIG].map((i) => {
      const sid = slotSkill(c, i); if (!sid) return '';
      const gems = slotGems(c, i), s = skillWithGems(sid, gems);
      return `<div class="slot"><div class="t"><b>${s.name}</b> ${s.tags.map((t) => `<span class="chip">${t}</span>`).join('')}<small>${describeSkill(s)}</small></div>${btn('c', 'Use', 'cast', i, '', p.mp < s.mp)}</div>`;
    }).join('');
  }
  if (a.stage === 'item') {
    const its = Object.entries(G.inv.items).filter(([, n]) => n > 0);
    return `<div class="row">${btn('c', '← Back', 'root')}</div>` + (its.map(([id, n]) => `<div class="slot"><div class="t"><b>${ITEMS[id].name} ×${n}</b><small>${ITEMS[id].desc}</small></div>${btn('c', 'Use', 'useitem', id)}</div>`).join('') || '<p class="dim">No items.</p>');
  }
  return `<div class="row"><b>Choose a target</b> ${btn('c', '← Back', 'root')}</div>`;
}
function askCommand(p) {
  BT.stage.setActive(p.name);
  return new Promise((resolve) => { BT.ask = { p, stage: 'root', resolve, pending: null }; renderBattle(); });
}
ACT.c = (what, x) => {
  const a = BT.ask, p = a.p, b = BT.b;
  const finish = (cmd) => { BT.ask = null; a.resolve(cmd); };
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
  else if (what === 'cast') { const i = +x; castDirect(slotSkill(p.ch, i), slotGems(p.ch, i)); }
  else if (what === 'useitem') toTarget('p', { kind: 'item', item: x });
  if (BT.ask === a) renderBattle();
};
ACT.tgt = (side, i) => {
  const a = BT.ask, t = (side === 'e' ? BT.b.e : BT.b.p)[+i], cmd = { ...a.pending, target: t };
  if (cmd.kind === 'item') G.inv.items[cmd.item]--;
  BT.ask = null; a.resolve(cmd);
};

async function victory(b, bossId) {
  music('victory');
  const r = rewards(b); G.gold += r.gold;
  const lines = [];
  for (const c of G.party) if (c.hp > 0) {
    const ups = gainExp(c, r.exp);
    if (ups.length) { setTimeout(() => sfx('levelup'), 1400); lines.push(`🎉 ${esc(c.name)} reached level ${ups.at(-1)}!`); autofill(c); }
  }
  for (const d of r.drops) { if (d.kind === 'items') G.inv.items[d.id] = (G.inv.items[d.id] || 0) + 1; else G.inv[d.kind].push(d.id); lines.push(`Found ${DB[d.kind][d.id].name}`); }
  const def = bossId ? BOSSES[bossId] : null;
  if (def) {
    G.flags.bosses[bossId] = true; const names = [];
    for (const k of ['weapons', 'armors', 'accs', 'gems']) for (const id of def.loot[k] || []) { G.inv[k].push(id); names.push(DB[k][id].name); }
    lines.push(`Found <b class="gold">${names.join(', ')}</b>!`);
    if (def.unlock) lines.push(`<i>${esc(def.unlock)}</i>`);
  }
  await new Promise((res) => {
    ov.innerHTML = `<div class="win"><h2>${def ? '🏆 ' + def.name + ' is slain!' : 'Victory!'}</h2><p>+${r.exp} EXP · +<span class="gold">${r.gold} G</span></p>${lines.map((l) => `<div>${l}</div>`).join('')}<div class="row">${btn('vdone', 'Continue', '', '', 'primary')}</div></div>`;
    ACT.vdone = () => { hide(); res(); };
  });
  if (def?.final) await ending();
}
async function ending() {
  const left = ['wyrm', 'lich'].filter((k) => !G.flags.bosses[k]).map((k) => BOSSES[k].name);
  await new Promise((res) => {
    show(`<h2>🎉 The Frost Titan falls!</h2><p>The spire falls silent and a pale dawn breaks over the north. Frostholm and Haven both sing your names.</p>
    ${left.length ? `<p class="dim">Still at large: ${left.join(', ')}. Hunt them down for the full legend.</p>` : '<p class="gold">All three great evils are slain. The realm is safe, for now.</p>'}
    <p class="dim">Party: ${G.party.map((c) => `${esc(c.name)} (${JOBS[c.main].name}${c.sub ? '/' + JOBS[c.sub].name : ''} Lv${c.level})`).join(' · ')}</p>
    <p><b>Thanks for playing!</b> Keep experimenting: try a Berserker with a Crit Gem on Chop, an Alchemist with Wide Panacea, or a Bard with Echo on Crescendo.</p>${btn('edone', 'Keep exploring', '', '', 'primary')}`);
    ACT.edone = () => { hide(); res(); };
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
['pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, unlock));
const muteBtn = $('#mute'), syncMute = () => { muteBtn.textContent = isMuted() ? '🔇' : '🔊'; };
muteBtn.addEventListener('click', () => { setMuted(!isMuted()); syncMute(); if (!isMuted()) sfx('click'); });
syncMute();

// debug / test hook
window.__game = { get G() { return G; }, get BT() { return BT; }, battle, step, goto, MAPS, snap, OPT };
title();
