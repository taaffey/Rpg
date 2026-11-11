// ===== The map engine: view, minimap, rendering, movement, touch and keyboard input, chests, roadside moments, goto/step. =====
import { MAPS, WALK } from './maps.js';
import { GEN } from './mapgen.js';
import { DIRV, ENC_MUL, KEYS, LIGHT, MINI, MINI_FLOOR, MINI_WALL, QITEM, REGION_NAME } from './gamedata.js';
import * as TR from './terrain.js';
import * as TA from './townart.js';
import * as RA from './roomart.js';
import * as RB from './roomart2.js';
import * as SP from './sprites.js';
import * as WK from './walkers.js';
import { music, sfx } from './audio.js';
import { ENCOUNTERS, ITEMS, QUESTS } from './data.js';
import { ROADSIDE } from './roadside.js';
import { G, S } from './state.js';
import { $, ACT, OPT, TOUCH, TS, ak, applyOptions, banner, btn, cv, cx, diag, hide, hooks, ic, inOverlay, lootName, ov, root, show, sleep, toast } from './core.js';
import { autosave, tip } from './saves.js';
import { arrive, cond, curLines, finishTyping, giveReward, qstate, questDone, say, sayAt, scene, talk, typing } from './story.js';
import { battle, roadAt } from './battle.js';
import { mainMenu } from './menus.js';
let VW = 16, VH = 12; // tiles visible: adapts to the screen (phone portrait / landscape / desktop)
const mapDef = () => MAPS[G.map];
const inTown = () => ['town', 'interior'].includes(mapDef().kind);
// ---------- map helpers ----------
const tileAt = (x, y) => (mapDef().rows[y] || '')[x] ?? '#';
const chestKey = (x, y) => `${G.map}:${x},${y}`;
const gateOpen = () => { const g = mapDef().gate; return !g || !!G.flags.bosses[g.flag]; };
const walkable = (t) => WALK.has(t) || (t === 'B' && gateOpen());
const FLAT_DECOR = new Set(['trapdoor']); // drawn on the floor: walk right over it
const decorAt = (x, y) => mapDef().decor?.some((d) => d[0] === x && d[1] === y && !FLAT_DECOR.has(d[2]));
const here = (n) => !(n.local && G.party.some((c) => c.look === n.local)); // locals leave their post once they join
const npcAt = (x, y) => mapDef().npcs?.find((n) => n.x === x && n.y === y && here(n));
const regAt = (x, y) => (GEN.deco?.reg?.[y]?.charCodeAt(x) ?? 48) - 48;
const regionAt = (x, y) => { const t = (MAPS.world.rows[y] || '')[x] ?? '.', g = regAt(x, y); return t === ',' || t === 't' ? 'snow' : t === 'd' ? 'desert' : (x >= 138 && y >= 96) ? 'obsidian' : g === 5 ? 'ember' : g === 4 ? 'autumn' : t === ':' ? 'swamp' : g === 6 ? 'jungle' : 'green'; };
const regionOf = () => (G.map !== 'world' ? null : regionAt(G.x, G.y));
function musicFor() { const m = mapDef(); if (m.kind !== 'outdoor') return m.music; const r = regionOf(); return r === 'snow' ? 'snow' : r === 'desert' || r === 'ember' ? 'desert' : r === 'swamp' ? 'mirewood' : 'world'; }
function reveal() { // fog of war
  const m = mapDef(); if (!m.fog) return;
  const seen = (G.flags.seen[G.map] ||= m.rows.map((r) => '0'.repeat(r.length))), r = m.fog;
  for (let y = Math.max(0, G.y - r); y <= Math.min(m.rows.length - 1, G.y + r); y++) {
    let row = seen[y], ch = false;
    for (let x = Math.max(0, G.x - r); x <= Math.min(m.rows[0].length - 1, G.x + r); x++) if ((x - G.x) ** 2 + (y - G.y) ** 2 <= r * r + r && row[x] !== '1') { row = row.slice(0, x) + '1' + row.slice(x + 1); ch = true; }
    if (ch) { seen[y] = row; S.miniDirty = true; }
  }
}
// ---------- adaptive view: choose how many tiles to show so tiles stay chunky on every screen ----------
function layoutView() {
  const box = $('#view').getBoundingClientRect(); if (box.width < 40 || box.height < 40) return;
  const portrait = box.height > box.width * 1.1, big = Math.min(box.width, box.height) >= 560; // iPad / large windows: more of the world, not giant tiles
  const T = portrait ? box.width / (big ? 16 : 12) : Math.min(box.width / (big ? 22 : 16), box.height / (big ? 15 : 12));
  let cols = clamp(Math.round(box.width / T), 10, 26), rows = clamp(Math.round(box.height / T), 8, 20);
  if (cols !== VW || rows !== VH) { VW = cols; VH = rows; cv.width = cols * TS; cv.height = rows * TS; S.miniDirty = true; }
  const pad = $('#padL'); root.style.setProperty('--padh', (pad && pad.offsetHeight ? pad.offsetHeight + 8 : 0) + 'px'); // dialogue boxes sit above the touch pads
}
new ResizeObserver(() => requestAnimationFrame(layoutView)).observe($('#view'));
addEventListener('orientationchange', () => setTimeout(layoutView, 250));
// ---------- minimap / map screen ----------
const miniCache = { id: null, canvas: document.createElement('canvas'), sc: 2 };
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
  const W = m.rows[0].length, H = m.rows.length, big = W > 80, VW = big ? 44 : W, VH = big ? 34 : H; // big maps show a window around the party instead of a postage stamp
  const sc = Math.max(1, Math.min(Math.floor(104 / VW), Math.floor(80 / VH)), big ? 3 : 1), w = VW * sc, h = VH * sc, ox = cv.width - w - 8, oy = 8;
  const vx0 = big ? clamp(G.x - (VW >> 1), 0, W - VW) : 0, vy0 = big ? clamp(G.y - (VH >> 1), 0, H - VH) : 0;
  if (S.miniDirty || miniCache.id !== G.map || miniCache.vx0 !== vx0 || miniCache.vy0 !== vy0) { // redraw the static layer only when something was revealed or changed
    miniCache.id = G.map; miniCache.sc = sc; miniCache.vx0 = vx0; miniCache.vy0 = vy0; miniCache.canvas.width = w; miniCache.canvas.height = h; S.miniDirty = false;
    const mc = miniCache.canvas.getContext('2d'), art = G.map === 'world' && TR.mapImage ? TR.mapImage(m) : null, seen = G.flags.seen[G.map] || [];
    if (!art) drawMini(mc, G.map, sc, 0, 0, 0, true);
    else { mc.imageSmoothingEnabled = true; mc.drawImage(art, vx0 * 16, vy0 * 16, VW * 16, VH * 16, 0, 0, w, h); mc.fillStyle = '#04061a'; for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) if (seen[vy0 + y]?.[vx0 + x] !== '1') mc.fillRect(x * sc, y * sc, sc, sc); }
  }
  cx.fillStyle = 'rgba(6,10,40,.72)'; cx.fillRect(ox - 3, oy - 3, w + 6, h + 6); cx.strokeStyle = '#e8ecf8'; cx.lineWidth = 1; cx.strokeRect(ox - 2.5, oy - 2.5, w + 5, h + 5);
  cx.drawImage(miniCache.canvas, ox, oy);
  if (Math.floor(t * 3) % 2 === 0) { cx.fillStyle = '#ffffff'; cx.fillRect(ox + (G.x - vx0) * sc - 1, oy + (G.y - vy0) * sc - 1, sc + 2, sc + 2); }
}
// ---------- map rendering ----------
const plr = { x: 256, y: 192 };
let face = 'down', vx = 0, vy = 0, lastT = 0, trail = [], fv = [];
const snap = () => { // place the leader, with the followers lined up behind when there is walkable room (else they share the tile and spread out once moving)
  vx = G.x; vy = G.y; const [bx, by] = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }[face] || [0, -1], spots = [];
  for (let k = 1; k <= 3; k++) { const x = G.x + bx * k, y = G.y + by * k; if (!WALK.has(tileAt(x, y) ?? '#') || (spots.length && spots.length < k - 1)) break; spots.push({ x, y }); }
  trail = [...spots.slice().reverse(), { x: G.x, y: G.y }]; fv = [0, 1, 2].map((i) => ({ x: (spots[i] || { x: G.x }).x, y: (spots[i] || { y: G.y }).y, d: face, mv: false })); reveal(); };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function draw(t = performance.now() / 1000) {
  if (!G) return;
  const m = mapDef(), W = m.rows[0].length, H = m.rows.length, frame = Math.floor(t / 0.6) % 2;
  cx.imageSmoothingEnabled = false;
  cx.fillStyle = '#000'; cx.fillRect(0, 0, cv.width, cv.height);
  const camX = W <= VW ? -(VW - W) / 2 : clamp(vx - VW / 2 + 0.5, 0, W - VW);
  const camY = H <= VH ? -(VH - H) / 2 - (m.kind === 'interior' ? 0.7 : 0) : clamp(vy - VH / 2 + 0.5, 0, H - VH); // the walls of a themed room rise above its first row, so nudge small rooms down to sit centred
  const sx = (x) => Math.round((x - camX) * TS), sy = (y) => Math.round((y - camY) * TS); camState.x = camX; camState.y = camY;
  const x0 = Math.max(0, Math.floor(camX)), x1 = Math.min(W, Math.ceil(camX + VW) + 1), y0 = Math.max(0, Math.floor(camY)), y1 = Math.min(H, Math.ceil(camY + VH) + 1);
  const defeated = (id) => !!G.flags.bosses[id];
  m.chestOpen = (x, y) => !!G.flags.chests[chestKey(x, y)];
  const R = TR.isTheme(m.theme) ? TR : TA.isTheme(m.theme) ? TA : RA.isTheme(m.theme) ? RA : RB.isTheme(m.theme) ? RB : null, items = []; // R = autotiled renderer (overworld / towns)
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
  if (m.glints) for (const [gx, gy] of m.glints) { // an undug hidden cache twinkles now and then (see GEN.deco.caches)
    if (gx < x0 - 1 || gx > x1 || gy < y0 - 1 || gy > y1 || G.flags.chests[chestKey(gx, gy)]) continue;
    const ph = (t * 0.7 + gx * 0.37 + gy * 0.53) % 1; if (ph > 0.5) continue;
    const k = Math.sin(ph / 0.5 * Math.PI), u = TS / 16, s = Math.max(1, Math.round((2 + 4.5 * k) * u)), X = sx(gx) + 8 * u, Y = sy(gy) + 9 * u;
    cx.fillStyle = `rgba(255,244,170,${0.3 + 0.7 * k})`; cx.fillRect(Math.round(X - u / 2), Math.round(Y - s), Math.round(u), 2 * s); cx.fillRect(Math.round(X - s), Math.round(Y - u / 2), 2 * s, Math.round(u));
    cx.fillStyle = `rgba(255,255,255,${k})`; cx.fillRect(Math.round(X - u), Math.round(Y - u), Math.round(2 * u), Math.round(2 * u));
  }
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
    const nx0 = sx(n.x), ny0 = sy(n.y), fr = Math.floor(t * 1.6 + n.x) % 8 === 0 ? 1 : 0;
    stand(WK.npcWalker(n.type, n.dir || 'down', fr), nx0, ny0);
  } });
  const px = sx(vx), py = sy(vy); plr.x = px + TS / 2; plr.y = py + TS / 2;
  const crew = [{ i: 0, x: vx, y: vy, d: face, mv: Math.abs(vx - G.x) + Math.abs(vy - G.y) > 0.05 }, ...fv.slice(0, G.party.length - 1).map((f, i) => ({ i: i + 1, ...f }))];
  for (const c of crew) sorted.push({ k: c.y + 1 - c.i * 0.001, f: () => stand(WK.walker(ak(G.party[c.i]), c.d, c.mv ? 1 + (Math.floor(t * 8 + c.i) % 3) : 0), sx(c.x), sy(c.y)) });
  sorted.sort((a, b) => a.k - b.k).forEach((s2) => s2.f());
  for (const it of items) if (it.z === 2) put(it);

  if (m.kind === 'outdoor') {
    const reg = regionOf();
    if (reg === 'snow') { cx.fillStyle = 'rgba(210,225,255,.07)'; cx.fillRect(0, 0, cv.width, cv.height); cx.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 46; i++) cx.fillRect(Math.round((i * 47 + Math.sin(t * 0.9 + i) * 14 + t * 10) % cv.width), Math.round((t * (30 + (i % 5) * 9) + i * 53) % cv.height), 2, 2); }
    if (rain > 0 && reg !== 'snow') { // a passing shower: a cool tint and slanting streaks, fading in and out
      const k = Math.min(1, rain / 3, (45 - Math.min(45, rain)) / 2 + 0.15); cx.fillStyle = `rgba(30,50,90,${0.16 * k})`; cx.fillRect(0, 0, cv.width, cv.height);
      cx.strokeStyle = `rgba(190,215,255,${0.6 * k})`; cx.lineWidth = Math.max(1, Math.round(TS / 16)); cx.beginPath();
      for (let i = 0; i < 70; i++) { const x = ((i * 83 + t * 110) % (cv.width + 60)) - 30, y = ((i * 47 + t * 460) % (cv.height + 40)) - 20; cx.moveTo(x, y); cx.lineTo(x - TS / 8, y + TS / 2.4); }
      cx.stroke();
    }
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
  if (S.trans > 0) { // battle-start wipe
    cx.fillStyle = '#000';
    for (let r = 0; r < VH; r++) { const w = Math.min(1, S.trans * 1.5 - (r % 6) * 0.08) * cv.width; if (w > 0) cx.fillRect(r % 2 ? cv.width - w : 0, r * TS, w, TS); }
  }
  $('#loc').textContent = m.kind === 'outdoor' ? REGION_NAME[regionOf()] : m.name; $('#gold').textContent = `${G.gold} G`;
}
// ---------- title screen: four small figures with their backs to us, three great evils on the horizon, and the bell ----------
const titleCache = new Map();
function titleShade(id) { // a boss as a dark shape against the sky, a touch lighter at the top where the moon catches it
  if (titleCache.has(id)) return titleCache.get(id);
  const src = SP.enemy(id), c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const x = c.getContext('2d');
  x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; const g = x.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, '#1a1238'); g.addColorStop(1, '#0c0820'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  const rim = document.createElement('canvas'); rim.width = c.width + 2; rim.height = c.height + 2; const r = rim.getContext('2d'); // the same shape in pale violet, peeking out one pixel up and to the right (the moon's side)
  r.drawImage(c, 2, 0); r.globalCompositeOperation = 'source-in'; r.fillStyle = '#8a6ad8'; r.fillRect(0, 0, rim.width, rim.height); r.globalCompositeOperation = 'source-over'; r.drawImage(c, 1, 1);
  titleCache.set(id, rim); return rim;
}
const BELL = ['......LL......', '.....LYYd.....', '.....LYYd.....', '....LYYYYd....', '...LYYYYYYd...', '...LYWYYYYd...', '..LYWWYYYYYd..', '..LYWYYYYYYd..', '..LYWYYYYYYd..', '..LYYYYYYYYd..', '.LYYYYYYYYYYd.', '.LYYYYYYYYYYd.', 'LLYYYYYYYYYYdd', 'LYYYYYYYYYYYYd', 'dddddddddddddd', '.....kKKk.....', '......kk......'];
const titleBell = () => { if (!titleCache.has('bell')) titleCache.set('bell', SP.sprite(BELL, { L: '#fff2a8', Y: '#e8b23a', W: '#fff8d8', d: '#9a6414', k: '#5a3a10', K: '#b88428' })); return titleCache.get('bell'); };
const HEARTS = { wyrm: ['#ff7a3a', '#ffd25a'], lich: ['#b07aff', '#e8d0ff'], titan: ['#5ab8ff', '#d8f4ff'] };
function drawTitle(t) {
  const W = cv.width, H = cv.height, u = Math.min(W / 512, H / 384), cxm = W / 2; cx.imageSmoothingEnabled = false;
  const tall = H > W * 1.2, safe = H * (tall ? 0.84 : 0.66); // the menu window covers everything below `safe`
  const ground = safe - 10 * u, horizon = ground - (tall ? 70 : 44) * u, px = Math.max(1, Math.round(u * 1.5));
  // dusk sky, stars, moon
  const g = cx.createLinearGradient(0, 0, 0, ground); g.addColorStop(0, '#070920'); g.addColorStop(0.4, '#231a5a'); g.addColorStop(0.68, '#6a3484'); g.addColorStop(0.86, '#d0607a'); g.addColorStop(1, '#f0a070'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) { const x = (i * 97 + 13) % W, y = (i * 53 + (i % 7) * 31) % Math.max(1, horizon - 20 * u), a = 0.25 + 0.75 * Math.abs(Math.sin(t * (0.8 + (i % 5) * 0.3) + i)), z = i % 9 ? px : px * 2; cx.fillStyle = `rgba(255,${240 - (i % 3) * 20},${255 - (i % 4) * 30},${a})`; cx.fillRect(x, y, z, z); }
  const mx = W - 58 * u, my = H * (tall ? 0.1 : 0.16), mr = 30 * u;
  for (const [r, a] of [[2.2, 0.05], [1.6, 0.08], [1.25, 0.12]]) { cx.fillStyle = `rgba(255,240,200,${a})`; cx.beginPath(); cx.arc(mx, my, mr * r, 0, 7); cx.fill(); }
  cx.fillStyle = '#f6eecb'; cx.beginPath(); cx.arc(mx, my, mr, 0, 7); cx.fill(); cx.fillStyle = '#d9cfa2'; cx.beginPath(); cx.arc(mx - 9 * u, my - 6 * u, 6 * u, 0, 7); cx.arc(mx + 8 * u, my + 7 * u, 5 * u, 0, 7); cx.arc(mx + 10 * u, my - 12 * u, 3 * u, 0, 7); cx.fill();
  // far ridge, then the three evils looming over it, each with its heart-gem alight
  const ridge = (col, base, amp, f, ph) => { cx.fillStyle = col; cx.beginPath(); cx.moveTo(0, H); for (let x = 0; x <= W; x += 4) cx.lineTo(x, base - Math.abs(Math.sin(x * f / u + ph)) * amp * u - Math.sin(x * f * 3.1 / u + ph) * 6 * u); cx.lineTo(W, H); cx.fill(); };
  ridge('#4a2a78', horizon + 22 * u, 26, 0.009, 1);
  const es = Math.max(1, Math.round(u * (tall ? 2.4 : 1.5)));
  for (const [id, fx, dy, hx, hy] of [['wyrm', tall ? 0.2 : 0.15, 40, 0.6, 0.52], ['titan', tall ? 0.82 : 0.86, 38, 0.5, 0.42], ['lich', 0.5, 26, 0.5, 0.64]]) {
    const im = titleShade(id), w = im.width * es, h = im.height * es, x = Math.round(W * fx - w / 2), y = Math.round(horizon + dy * u - h + Math.sin(t * 0.7 + fx * 9) * 2 * u);
    cx.drawImage(im, x, y, w, h);
    const [c1, c2] = HEARTS[id], gx = x + w * hx, gy = y + h * hy, k = 0.6 + 0.4 * Math.sin(t * 2.2 + fx * 7), q = es * 2;
    for (const [r, a] of [[9, 0.07], [6, 0.12], [3.5, 0.2]]) { cx.fillStyle = c1; cx.globalAlpha = a * (0.6 + k * 0.6); cx.beginPath(); cx.arc(gx, gy, r * q * (0.8 + k * 0.3), 0, 7); cx.fill(); } cx.globalAlpha = 1;
    cx.fillStyle = c1; cx.beginPath(); cx.moveTo(gx, gy - 3.5 * q); cx.lineTo(gx + 2.5 * q, gy); cx.lineTo(gx, gy + 3.5 * q); cx.lineTo(gx - 2.5 * q, gy); cx.fill(); cx.fillStyle = c2; cx.fillRect(Math.round(gx - q * 0.5), Math.round(gy - q * 2), q, Math.round(q * 1.5));
  }
  ridge('#1a1242', horizon + 34 * u, 30, 0.017, 2.4);
  // the ground, a strip of moonlit grass, and the party seen from behind
  const gg = cx.createLinearGradient(0, ground - 14 * u, 0, H); gg.addColorStop(0, '#16123a'); gg.addColorStop(0.2, '#0d0a26'); gg.addColorStop(1, '#070514'); cx.fillStyle = gg; cx.fillRect(0, ground - 14 * u, W, H);
  cx.fillStyle = '#2a2c6a'; for (let i = 0; i < W / (6 * px); i++) { const x = i * 6 * px + ((i * 7) % 5) * px, hgt = (2 + (i * 13) % 3) * px; cx.fillRect(x, ground - 14 * u - hgt + px, px, hgt); }
  const hs = Math.max(2, Math.round(u * (tall ? 3.2 : 2.2))), heroes = ['knight@wendell', 'bloke@adam', 'bloke@devon', 'cleric@brenna'], gap = 21 * hs, x0 = cxm - (gap * (heroes.length - 1)) / 2;
  heroes.forEach((j, i) => { const im = WK.walker(j, 'up', 0), w = im.width * hs, h = im.height * hs, x = Math.round(x0 + i * gap - w / 2), y = Math.round(ground - h + (i % 2 ? 2 : 6) * u + (Math.sin(t * 1.6 + i * 1.9) > 0.86 ? -px : 0));
    cx.fillStyle = 'rgba(0,0,0,.45)'; cx.beginPath(); cx.ellipse(x + w / 2, y + h - px, w * 0.36, 3 * hs * 0.6, 0, 0, 7); cx.fill(); cx.drawImage(im, x, y, w, h); });
  // embers drifting up from the horizon
  for (let i = 0; i < 16; i++) { const life = (t * 0.07 + i * 0.137) % 1, x = (i * 151 + 40) % W + Math.sin(t * 0.9 + i) * 10 * u, y = horizon + 30 * u - life * (horizon * 0.7); cx.globalAlpha = (1 - life) * 0.8; cx.fillStyle = ['#ff9a4a', '#c8a0ff', '#8ad0ff'][i % 3]; cx.fillRect(Math.round(x), Math.round(y), px, px); } cx.globalAlpha = 1;
  // the logo, with the bell swinging above it
  cx.textAlign = 'center'; cx.textBaseline = 'alphabetic'; cx.lineJoin = 'round';
  const FONT = '"Press Start 2P", ui-monospace, Menlo, monospace', f1 = Math.min(52 * u, (W - 20) / 7.4, tall ? 1e9 : (ground - 24 * hs - 26 * u) / 4.5), bell = titleBell(), bs = Math.max(2, Math.round(f1 / 14)), ty = tall ? H * 0.2 + f1 : 4 * u + bell.height * bs + f1 * 1.28;
  const sw = Math.sin(t * 2.4) * 0.22 * (0.55 + 0.45 * Math.sin(t * 0.5)), bx = cxm, by = ty - f1 * 1.28 - bell.height * bs;
  cx.strokeStyle = '#8a6a3a'; cx.lineWidth = Math.max(1, bs * 0.8); cx.beginPath(); cx.moveTo(bx, 0); cx.lineTo(bx, by); cx.stroke();
  for (let k = 0; k < 3; k++) { const rr = ((t * 0.6 + k / 3) % 1); cx.strokeStyle = `rgba(255,232,150,${(1 - rr) * 0.35})`; cx.lineWidth = Math.max(1, px); cx.beginPath(); cx.arc(bx, by + bell.height * bs * 0.6, (10 + rr * 60) * bs * 0.5, Math.PI * 0.1, Math.PI * 0.9); cx.stroke(); }
  cx.save(); cx.translate(bx, by); cx.rotate(sw); cx.drawImage(bell, Math.round(-bell.width * bs / 2), 0, bell.width * bs, bell.height * bs); cx.restore();
  const word = (txt, y, f, top, bot, depth) => { cx.font = `${f}px ${FONT}`; const d = Math.max(2, Math.round(f * depth)); cx.lineWidth = Math.max(4, f * 0.2); cx.strokeStyle = '#150a38'; cx.strokeText(txt, cxm, y + d); cx.strokeText(txt, cxm, y); for (let k = d; k > 0; k--) { cx.fillStyle = k === d ? '#3a1456' : '#8a3a22'; cx.fillText(txt, cxm, y + k); }
    const tg = cx.createLinearGradient(0, y - f, 0, y); tg.addColorStop(0, top); tg.addColorStop(0.55, top); tg.addColorStop(0.56, bot); tg.addColorStop(1, '#c86a1e'); cx.fillStyle = tg; cx.fillText(txt, cxm, y); };
  word('BEARDED', ty, f1, '#fff6c0', '#f0b040', 0.09);
  word('BROS', ty + f1 * 1.12, f1, '#fff6c0', '#f0b040', 0.09);
  const f3 = Math.max(7, f1 * 0.27); cx.font = `${f3}px ${FONT}`; cx.lineWidth = Math.max(3, f3 * 0.4); cx.strokeStyle = '#150a38'; cx.strokeText('AND THE BELL OF GEMFORGE', cxm, ty + f1 * 1.12 + f3 * 2.2); cx.fillStyle = '#d8c8ff'; cx.fillText('AND THE BELL OF GEMFORGE', cxm, ty + f1 * 1.12 + f3 * 2.2);
}
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016); lastT = now;
  if (!G) return drawTitle(now / 1000);
  G.playtime = (G.playtime || 0) + dt; if (rain > 0) rain = Math.max(0, rain - dt);
  moveTick(dt);
  if (!inOverlay()) { const still = vx === G.x && vy === G.y && !S.trans && !S.busy && !route.length && !fv.some((f) => f.mv); if (!still || (++idleFrame & 1)) draw(now / 1000); } // standing still redraws at ~30fps: nothing on the map animates faster, and phones run cooler
}
let idleFrame = 0, rain = 0; // rain: seconds of a passing shower left (the roadside 'rain' moment)
requestAnimationFrame(tick);
const frame = () => new Promise((r) => requestAnimationFrame(r));
async function transition() { sfx('encounter'); for (S.trans = 0.02; S.trans < 1.2; S.trans += 0.065) await frame(); S.trans = 1; await sleep(60); }
function goto(id, x, y) { rain = 0; diag(`go ${G?.map} -> ${id} (${x},${y})`); // (a wipe wakes you in the last town you were in: G.home)
  const first = !G.flags.visited[id]; G.map = id; G.x = x; G.y = y; G.flags.visited[id] = true; if (MAPS[id].kind === 'town') G.home = id === 'haven' ? null : { map: id, x: MAPS[id].spawn.x, y: MAPS[id].spawn.y }; snap(); music(musicFor()); sfx('door');
  banner(id === 'world' ? REGION_NAME[regionOf()] : MAPS[id].name); G.region = regionOf(); layoutView(); draw(); autosave();
  arrive(id, first);
}
function mapShake() { if (!OPT.shake) return; cv.classList.remove('shake'); void cv.offsetWidth; cv.classList.add('shake'); }
async function chartTheLand() { // the overworld bakes in the background from the moment the page loads; if the party gets there first (a save that loads onto the map, a quick ferry), show a short loader instead of freezing
  if (!TR.bakeReady || TR.bakeReady()) return;
  const was = S.busy; S.busy = true; let dots = 0; const el = document.createElement('div'); el.id = 'charting'; el.textContent = 'Charting the land'; document.body.appendChild(el);
  await TR.finishBake(() => { el.textContent = 'Charting the land' + '.'.repeat(1 + (++dots >> 2) % 4); }); el.remove(); S.busy = was;
}
// Random fights are spaced out: after any fight the party gets a few quiet steps, and the chance per step after that is raised to match,
// so the average distance between fights is still 1 / rate but two never land back to back.
// FF1: poison outlasts the fight. Each step costs a poisoned hero 1 HP (never the last one) until a Cup of Tea or an inn sorts it out.
let poisonNag = 0;
function poisonStep() {
  const sick = G.party.filter((c) => c.poison && c.hp > 0); if (!sick.length) { poisonNag = 0; return; }
  for (const c of sick) if (c.hp > 1) c.hp--;
  if (poisonNag++ % 40 === 0) toast(`${ic('poison')} ${sick.map((c) => c.name).join(' and ')} ${sick.length > 1 ? 'have' : 'has'} a dodgy tum: 1 HP a step. A Cup of Tea or an inn will fix it.`, 3600);
}
let sinceFight = 0;
function encounterRoll(rate) {
  if (!(rate > 0)) return false;
  const gap = Math.min(4, Math.floor(0.4 / rate)); // quiet steps after a fight (none when the rate is forced very high)
  if (++sinceFight <= gap) return false;
  if (Math.random() >= Math.min(1, 1 / (1 / rate - gap))) return false;
  sinceFight = 0; return true;
}
async function step(dx, dy) {
  if (inOverlay() || S.busy || Math.abs(vx - G.x) + Math.abs(vy - G.y) > 0.45) return;
  const m = mapDef(), nx = G.x + dx, ny = G.y + dy, t = tileAt(nx, ny);
  face = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
  const npc = npcAt(nx, ny); if (npc) { npc.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[face]; draw(); return talk(npc); } // they turn to face you
  if (decorAt(nx, ny) || m.blocks?.has(`${nx},${ny}`)) return; // m.blocks: solid props placed by a map renderer (stalls, barrels, fences...)
  if (t === 'C') { if (!G.flags.chests[chestKey(nx, ny)]) openChest(nx, ny); return; }
  if (!walkable(t)) { if (t === 'B' && m.gate && !G.flags.bosses[m.gate.flag]) toast('A rockslide blocks the pass. Nothing is getting through that yet.', 2800); return; }
  G.x = nx; G.y = ny; trail.push({ x: nx, y: ny }); if (trail.length > 8) trail.shift();
  poisonStep();
  const pt = m.portals?.[`${nx},${ny}`];
  if (pt?.need && !cond(pt.need)) { G.x -= dx; G.y -= dy; trail.pop(); snap(); draw(); const seenKey = `deny:${G.map}:${G.x + dx},${G.y + dy}`; if (G.flags.talked[seenKey]) { toast('Still sealed. ' + ((pt.deny || []).slice(-1)[0]?.t || ''), 4200); return; } G.flags.talked[seenKey] = true; return scene(pt.deny || []); } // not yet: a word at the gate, and back a step
  if (pt && pt.to === 'world') await chartTheLand();
  if (pt) return goto(pt.to, pt.x, pt.y);
  reveal(); draw();
  const sec = m.secrets?.[`${nx},${ny}`]; if (sec && !G.flags.chests[chestKey(nx, ny)]) return openChest(nx, ny, sec);
  tip('move', TOUCH ? 'Tap a spot to travel there, or press and slide on the pad. A talks/checks, B opens the menu.' : 'Arrows or WASD to walk. Esc opens your party menu. A yellow ! marks someone with news.');
  if (m.kind === 'outdoor') { const reg = regionOf(); if (reg !== G.region) { G.region = reg; banner(REGION_NAME[reg]); music(musicFor()); } }
  if (m.boss && t === 'X' && !G.flags.bosses[m.boss.id]) { sinceFight = 0; S.busy = true; mapShake(); sfx('crit'); await sleep(350); S.busy = false; return battle([m.boss.id], m.boss.id); }
  const zoneEnc = G.map === 'world' ? { 4: 'hops', 5: 'embers', 6: 'jungle' }[regAt(nx, ny)] : null; // the outlying and jungle areas have their own monsters
  const table = zoneEnc || m.enc || m.encByTile?.[t];
  const encRate = m.rate * (G.map === 'world' && roadAt(nx, ny) ? 0.35 : 1) * (ENC_MUL[OPT.enc] ?? 1) * (G.rules?.rush ? 2 : 1); // the roads are well-trodden: far fewer ambushes on them, so the long legs between towns are a stroll
  if (table && !(m.safe || []).some(([sx2, sy2, r]) => Math.hypot(nx - sx2, ny - sy2) <= r) && encounterRoll(encRate)) {
    let tb = ENCOUNTERS[table];
    const lure = Object.entries(QUESTS).find(([id, q]) => q.goal.lure?.table === table && qstate(id) === 'active' && !questDone(id))?.[1].goal.lure; // a hunt quest's quarry shows up more often
    if (lure && Math.random() < lure.p) return battle(lure.group);
    if ((table === 'world' || table === 'jungle') && m.ramp) tb = tb.slice(0, Math.min(tb.length, 2 + Math.floor(Math.hypot(nx - m.ramp[0], ny - m.ramp[1]) / 3))); // easy fights first, tougher the farther you roam
    await battle(tb[Math.floor(Math.random() * tb.length)]); return;
  }
  if (G.map === 'world') await roadside();
}
// A roadside moment (src/roadside.js): once the party has walked a while, a small scene may happen. Unseen ones first; once all are seen they come back rarely.
let sinceRoad = 0;
async function roadside() {
  (G.stats ||= { wins: 0 }).steps = (G.stats.steps || 0) + 1;
  if (++sinceRoad < 45 || S.busy || inOverlay() || mapDef().rate === 0) return; // rate 0 is the tests' "nothing random happens" switch
  const reg = regionOf(), seen = G.flags.chat, pool = ROADSIDE.filter((e) => (!e.regions || e.regions.includes(reg)) && cond(e.if)), fresh = pool.filter((e) => !seen[`rs:${e.id}`]);
  if (!pool.length || Math.random() > (fresh.length ? 0.016 : 0.004)) return;
  const list = fresh.length ? fresh : pool, e = list[Math.floor(Math.random() * list.length)];
  sinceRoad = 0; seen[`rs:${e.id}`] = true; route = []; diag(`roadside ${e.id}`);
  await scene(e.lines); if (e.rain) rain = e.rain;
  if (e.reward) { const got = giveReward(e.reward); sfx('coin'); toast(`Got ${got.join(', ')}`, 2400); }
}
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
  if (f?.tagName === 'TEXTAREA' && e.key !== 'Escape') return false; // typing or pasting a backup code
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
    const b = list.find((x) => /^(close|scend|bmain|leave|menu|bclose|optback|optsback|awdone)$/.test(x.dataset.act) || (x.dataset.act === 'c' && x.dataset.a === 'root'));
    if (b) { b.click(); return true; }
  }
  return false;
}
addEventListener('keydown', (e) => {
  if (inOverlay()) { if (overlayKey(e)) e.preventDefault(); return; } // never move the map while a window is open
  if (!G) return;
  const kk = e.key.length === 1 ? e.key.toLowerCase() : e.key; // Shift / Caps Lock must not break walking
  if (KEYS[kk]) { e.preventDefault(); route = []; if (!keysDown.includes(kk)) keysDown.push(kk); if (!e.repeat) step(...KEYS[kk]); }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); interact(); }
  else if ((e.key === 'Escape' || e.key === 'm') && !inOverlay() && !S.busy) mainMenu();
  else if (e.key === 'n' && !inOverlay()) { OPT.minimap = !OPT.minimap; applyOptions(); }
});
// ---------- touch controls ----------
// Slide d-pad: press anywhere on the cross and slide between directions without lifting; the party walks continuously.
// A = talk/check the tile you face, B = menu. Tap (or drag) on the map: walk the whole way there along a real path;
// tapping a townsperson or chest walks up to it and talks/opens it.
let held = null, route = [], routeMap = null, routeGoal = null;
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
  if (!G || inOverlay() || S.busy) return;
  const [dx, dy] = DIRV[face] || [0, 1], nx = G.x + dx, ny = G.y + dy, npc = npcAt(nx, ny);
  if (npc) { npc.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[face]; return talk(npc); }
  if (tileAt(nx, ny) === 'C' && !G.flags.chests[chestKey(nx, ny)]) return openChest(nx, ny);
  sfx('blip');
};
document.querySelectorAll('.pad button[data-d]').forEach((b) => {
  const d = b.dataset.d;
  if (d === 'menu') b.addEventListener('click', () => { if (G && !inOverlay() && !S.busy) { route = []; mainMenu(); } });
  else if (d === 'map') b.addEventListener('click', () => { if (G && !inOverlay() && !S.busy) { route = []; ACT.mapscreen(); } });
  else if (d === 'a') b.addEventListener('pointerdown', (e) => { e.preventDefault(); route = []; interact(); });
});
$('#hudmenu').addEventListener('click', () => { if (G && !inOverlay() && !S.busy) mainMenu(); });
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
    if (!G || inOverlay() || S.busy) { if (inOverlay()) route = []; break; }
    const map0 = G.map, at = `${G.x},${G.y}`;
    if (!nextMove() || G.map !== map0 || `${G.x},${G.y}` === at) break;
  }
  const fs = WALK_SPEED * 1.05 * dt; // followers trail the leader's footsteps at the same pace
  fv.forEach((f, i) => { const tg = trail[Math.max(0, trail.length - 2 - i)] || { x: G.x, y: G.y }, dx = tg.x - f.x, dy = tg.y - f.y; f.mv = Math.abs(dx) + Math.abs(dy) > 0.02; if (f.mv) f.d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); if (Math.abs(dx) > 2 || Math.abs(dy) > 2) { f.x = tg.x; f.y = tg.y; } else { f.x += clamp(dx, -fs, fs); f.y += clamp(dy, -fs, fs); } });
}
// keyboard: track held arrow/WASD keys so holding walks smoothly (no OS key-repeat delay); the newest key wins
const keysDown = [];
const heldKeyDir = () => (keysDown.length ? KEYS[keysDown[keysDown.length - 1]] : null);
addEventListener('keyup', (e) => { const i = keysDown.indexOf(e.key.length === 1 ? e.key.toLowerCase() : e.key); if (i >= 0) keysDown.splice(i, 1); });
addEventListener('blur', () => { keysDown.length = 0; held = null; });
ACT.close = hide;
function openChest(x, y, secret = null) { // secret: loot of a hidden treasure spot (m.secrets), found by stepping on it
  const c = secret || mapDef().chests?.[`${x},${y}`] || { gold: 50 }; G.flags.chests[chestKey(x, y)] = true; S.miniDirty = true; sfx('chest');
  const got = [];
  for (const k of ['weapons', 'armors', 'accs', 'gems']) for (const id of c[k] || []) { G.inv[k].push(id); got.push(lootName(k, id)); }
  for (const [id, n] of Object.entries(c.items || {})) { G.inv.items[id] = (G.inv.items[id] || 0) + n; got.push(`${ITEMS[id].name} ×${n}`); }
  if (c.gold) { G.gold += c.gold; got.push(`${c.gold} G`); }
  if (c.qitem) { G.flags.qitems[c.qitem] = true; got.push(`<span class="gold">${QITEM[c.qitem]}</span> (quest item)`); }
  draw();
  show(`<h2>${secret ? '✨ Hidden treasure!' : '📦 Treasure!'}</h2><p>${secret ? 'Something glints in the ground... You dig up:' : 'You found:'}</p>${got.map((g) => `<div class="slot"><span class="lead">${ic('chest')}</span><div class="t"><b class="gold">${g}</b></div></div>`).join('')}<div class="foot">${btn('close', 'OK', '', '', 'primary')}</div>`);
}
hooks.draw = draw;

export { camState, chartTheLand, draw, drawMini, goto, inTown, mapDef, musicFor, regionAt, regionOf, roadside, route, snap, step, tileAt, transition, vx, vy };
