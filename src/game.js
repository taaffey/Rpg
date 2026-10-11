// ===== Gemforge Chronicles: UI, map, menus, battle flow =====
import { JOBS, SKILLS, GEMS, WEAPONS, ARMORS, ACCS, ITEMS, WEAPON_TYPES, ENEMIES, ENCOUNTERS, MAPS, CHESTS, ELEM_ICON } from './data.js';
import * as L from './logic.js';
const { stats, newChar, learnable, slotSkill, slotGems, gemCapacity, gemsUsed, sanitize, skillWithGems, describeSkill, gainExp, expNeeded, Battle, rewards, SIG, GEMS_PER_SLOT } = L;

const $ = (s) => document.querySelector(s);
const cv = $('#map'), cx = cv.getContext('2d'), ov = $('#overlay');
const SAVE = 'gemforge-save-v1', TS = 32, VW = 16, VH = 12;
let G = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const DB = { weapons: WEAPONS, armors: ARMORS, accs: ACCS, gems: GEMS, items: ITEMS };

// ---------- overlay plumbing ----------
const ACT = {};
function show(html) { ov.innerHTML = `<div class="win">${html}</div>`; ov.classList.add('on'); }
function hide() { ov.classList.remove('on'); ov.innerHTML = ''; draw(); }
const inOverlay = () => ov.classList.contains('on');
ov.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  ACT[b.dataset.act]?.(b.dataset.a, b.dataset.b);
});
const btn = (act, label, a = '', b = '', cls = '', dis = false) => `<button class="${cls}" data-act="${act}" data-a="${a}" data-b="${b}" ${dis ? 'disabled' : ''}>${label}</button>`;
const bar = (v, m, cls) => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, (v / m) * 100))}%"></i></div>`;
const statLine = (s) => `<div class="stats">${['hp', 'mp', 'atk', 'def', 'mag', 'spd'].map((k) => `<span>${k.toUpperCase()} <b>${s[k]}</b></span>`).join('')}</div>`;
const gearLine = (g) => ['atk', 'mag', 'def', 'hp', 'mp', 'spd'].filter((k) => g[k]).map((k) => `${g[k] > 0 ? '+' : ''}${g[k]} ${k}`).concat(g.res ? g.res.map((r) => `resist ${r}`) : [], g.sockets ? [`${g.sockets}◇`] : [], g.innate ? [`innate ${GEMS[g.innate].name}`] : []).join(', ');

// ---------- state ----------
function newGame() {
  G = {
    party: [newChar('Aldric', 'knight', 'rogue', 'iron_sword', 'leather'), newChar('Lyra', 'mage', 'cleric', 'oak_staff', 'cloth'),
      newChar('Mira', 'cleric', 'bard', 'oak_staff', 'cloth'), newChar('Kael', 'rogue', 'ranger', 'bronze_dirk', 'leather')],
    gold: 250,
    inv: { weapons: ['iron_knuckle', 'short_bow', 'dusty_tome', 'leather_whip'], armors: ['cloth'], accs: [], gems: ['fire', 'chain', 'vamp', 'thrifty', 'pierce'], items: { potion: 4, ether: 2, phoenix: 1 } },
    map: 'town', x: 6, y: 6, flags: { chests: {}, boss: false },
  };
}
const save = () => { try { localStorage.setItem(SAVE, JSON.stringify(G)); return true; } catch { return false; } };
const hasSave = () => { try { return !!localStorage.getItem(SAVE); } catch { return false; } };
const load = () => { try { G = JSON.parse(localStorage.getItem(SAVE)); return !!G; } catch { return false; } };
const inTown = () => G.map === 'town';
const maxOf = (c) => stats(c);
function autofill(c) {
  const used = c.slots.filter(Boolean);
  for (const sid of learnable(c)) { const i = c.slots.indexOf(null); if (i < 0) break; if (!used.includes(sid)) { c.slots[i] = sid; used.push(sid); } }
}

// ---------- map ----------
const mapDef = () => MAPS[G.map];
const tileAt = (x, y) => (mapDef().rows[y] || '')[x] ?? '#';
const chestKey = (x, y) => `${G.map}:${x},${y}`;
const COL = { world: { '.': '#4f9a3f', T: '#2b6a2c', '~': '#2c5fa8', M: '#7b7468', H: '#c9a15a', D: '#3a2f45' }, town: { '.': '#9a8760', '#': '#4a4256', S: '#b07a3b', I: '#3b7ab0', G: '#8b3bb0', E: '#d9d0a0' }, dungeon: { '.': '#3b3744', '#': '#17141d', E: '#d9d0a0', C: '#3b3744', X: '#3b3744' } };
const GLYPH = { T: '🌲', '~': '', M: '⛰️', H: '🏘️', D: '🕳️', S: '🛒', I: '🛏️', G: '⚔️', E: '⬇', C: '📦', X: '🐉' };
function draw() {
  const m = mapDef(), W = m.rows[0].length, H = m.rows.length;
  cx.fillStyle = '#000'; cx.fillRect(0, 0, cv.width, cv.height);
  const camX = W <= VW ? -(VW - W) / 2 : Math.max(0, Math.min(W - VW, G.x - VW / 2));
  const camY = H <= VH ? -(VH - H) / 2 : Math.max(0, Math.min(H - VH, G.y - VH / 2));
  cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.font = '22px sans-serif';
  const pal = COL[G.map];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let t = tileAt(x, y);
    if ((t === 'C' && G.flags.chests[chestKey(x, y)]) || (t === 'X' && G.flags.boss)) t = '.';
    const px = (x - camX) * TS, py = (y - camY) * TS;
    cx.fillStyle = pal[t] || (G.map === 'world' ? pal['.'] : pal['.']); cx.fillRect(px, py, TS, TS);
    if (G.map === 'world' && (t === 'T' || t === 'M')) { cx.fillStyle = pal['.']; cx.fillRect(px, py, TS, TS); }
    if (GLYPH[t]) { cx.fillStyle = '#fff'; cx.fillText(GLYPH[t], px + TS / 2, py + TS / 2 + 1); }
    if (t === '~') { cx.fillStyle = 'rgba(255,255,255,.07)'; cx.fillRect(px, py + (x % 2) * 8 + 4, TS, 3); }
  }
  const px = (G.x - camX) * TS + TS / 2, py = (G.y - camY) * TS + TS / 2;
  cx.fillStyle = '#f4c95d'; cx.beginPath(); cx.arc(px, py, 11, 0, 7); cx.fill();
  cx.strokeStyle = '#20180a'; cx.lineWidth = 2; cx.stroke();
  cx.fillStyle = '#20180a'; cx.font = 'bold 13px sans-serif'; cx.fillText(G.party[0].name[0], px, py + 1);
  $('#loc').textContent = m.name; $('#gold').textContent = `${G.gold} G`;
}
function goto(map, x, y) { G.map = map; G.x = x; G.y = y; draw(); }
const BLOCK = new Set(['#', '~', 'M', 'T']);
async function step(dx, dy) {
  if (inOverlay() || busy) return;
  const nx = G.x + dx, ny = G.y + dy, t = tileAt(nx, ny);
  if (BLOCK.has(t)) return;
  if (t === 'S') return shop();
  if (t === 'I') return inn();
  if (t === 'G') return guild();
  if (t === 'C') { if (!G.flags.chests[chestKey(nx, ny)]) openChest(nx, ny); return; }
  G.x = nx; G.y = ny;
  if (t === 'H') return goto('town', 6, 6);
  if (t === 'D') return goto('dungeon', 2, 1);
  if (t === 'E') return G.map === 'town' ? goto('world', 7, 4) : goto('world', 19, 9);
  draw();
  if (t === 'X' && !G.flags.boss) return bossFight();
  const m = mapDef();
  if (m.enc && Math.random() < m.rate) { const grp = ENCOUNTERS[m.enc][Math.floor(Math.random() * ENCOUNTERS[m.enc].length)]; await battle(grp); }
}
let busy = false;
const KEYS = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
addEventListener('keydown', (e) => {
  if (!G) return;
  if (KEYS[e.key]) { e.preventDefault(); step(...KEYS[e.key]); }
  else if ((e.key === 'Escape' || e.key === 'm') && !inOverlay() && !busy) mainMenu();
  else if (e.key === 'Escape' && inOverlay() && ov.querySelector('[data-act="close"]')) hide();
});
document.querySelectorAll('#dpad button').forEach((b) => b.addEventListener('click', () => {
  const d = b.dataset.d; if (d === 'menu') return inOverlay() ? null : mainMenu();
  step(...{ up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d]);
}));
ACT.close = hide;

function openChest(x, y) {
  const c = CHESTS[chestKey(x, y)] || { gold: 50 }; G.flags.chests[chestKey(x, y)] = true;
  const got = [];
  for (const k of ['weapons', 'armors', 'accs', 'gems']) for (const id of c[k] || []) { G.inv[k].push(id); got.push(DB[k][id].name); }
  if (c.gold) { G.gold += c.gold; got.push(`${c.gold} G`); }
  draw();
  show(`<h2>📦 Treasure!</h2><p>You found: <b class="gold">${got.join(', ')}</b></p>${btn('close', 'OK', '', '', 'primary')}`);
}

// ---------- title / main menu ----------
function title() {
  G = null;
  show(`<h2 style="text-align:center">⚔️ Gemforge Chronicles</h2>
  <p class="dim" style="text-align:center">Pick a main job and a sub job. Wield weapons that grant signature skills. Socket gems to rewrite every skill.</p>
  <div class="row" style="justify-content:center">${btn('new', 'New Game', '', '', 'primary')}${btn('cont', 'Continue', '', '', '', !hasSave())}</div>`);
  mapPlaceholder();
}
function mapPlaceholder() { cx.fillStyle = '#10131c'; cx.fillRect(0, 0, cv.width, cv.height); $('#loc').textContent = ''; $('#gold').textContent = ''; }
ACT.new = () => { newGame(); hide(); intro(); };
ACT.cont = () => { if (load()) hide(); };
function intro() {
  show(`<h2>Welcome to Haven Town</h2><p>The <b>Ashen Wyrm</b> sleeps beneath the cavern east of here. You and your three companions are the town's last hope.</p>
  <p>Before you leave, visit the <b>Guild (⚔️)</b> to choose jobs, and open the <b>Menu</b> to socket gems into skills. Experiment: the same skill can behave very differently with the right gems.</p>${btn('close', 'Begin', '', '', 'primary')}`);
}
function mainMenu() {
  show(`<h2>Menu</h2><div class="grid">${G.party.map((c, i) => { const s = maxOf(c); return `<div class="pm">${btn('build', `<b>${esc(c.name)}</b> Lv${c.level}`, i)}<div class="dim">${JOBS[c.main].icon} ${JOBS[c.main].name}${c.sub ? ' / ' + JOBS[c.sub].name : ''}</div>HP ${c.hp}/${s.hp}${bar(c.hp, s.hp, 'hp')}MP ${c.mp}/${s.mp}${bar(c.mp, s.mp, 'mp')}</div>`; }).join('')}</div>
  <div class="row">${btn('items', '🎒 Items')}${btn('save', '💾 Save')}${btn('title', 'Title')}${btn('close', 'Close', '', '', 'primary')}</div><div id="msg" class="dim"></div>`);
}
ACT.title = title;
ACT.save = () => { $('#msg').textContent = save() ? 'Game saved.' : 'Could not save.'; };

// ---------- items (field use) ----------
function itemsMenu(msg = '') {
  const it = Object.entries(G.inv.items).filter(([, n]) => n > 0);
  show(`<h2>🎒 Items</h2><p class="gold">${G.gold} G</p>${msg ? `<p>${msg}</p>` : ''}${it.length ? it.map(([id, n]) => `<div class="row">${btn('useitem', `${ITEMS[id].name} ×${n}`, id)}<span class="dim">${ITEMS[id].desc}</span></div>`).join('') : '<p class="dim">No consumables.</p>'}
  <h3>Gems (${G.inv.gems.length})</h3><div>${G.inv.gems.map((g) => `<span class="chip" title="${GEMS[g].desc}">${GEMS[g].name}</span>`).join('') || '<span class="dim">none</span>'}</div>
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
    return `<div class="slot"><div class="t"><b>${i === SIG ? '⭐ Weapon' : `Slot ${i + 1}`}:</b> ${sid ? `<b>${m2.name}</b> ${gems.map((g) => `<span class="chip">${GEMS[g].name.replace(' Gem', '')}</span>`).join('')}` : '<span class="dim">— empty —</span>'}<small>${m2 ? describeSkill(m2) : ''}</small></div>${btn('bslot', 'Edit', i)}</div>`;
  };
  show(`<div class="row">${btn('bnav', '◀', -1)}<h2 class="grow">${esc(c.name)} · Lv${c.level}</h2>${btn('bnav', '▶', 1)}</div>
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
  <div class="card"><b>${final ? final.name : '— empty —'}</b> ${slotGems(c, i).map((g) => `<span class="chip">${GEMS[g].name}</span>`).join('')}<br><span class="dim">${final ? describeSkill(final) : 'Pick a skill below.'}</span></div>
  ${i === SIG ? `<div class="dim">Granted by your weapon (${c.weapon ? WEAPONS[c.weapon].name : 'unarmed'}). ${c.weapon && WEAPONS[c.weapon].innate ? 'Includes free innate gem: ' + GEMS[WEAPONS[c.weapon].innate].name + '.' : ''}</div>` :
    `<h3>Skill</h3><div class="row">${btn('setskill', 'Empty', i, '')}${learnable(c).map((s) => btn('setskill', `${SKILLS[s].name} <small>${SKILLS[s].mp}mp</small>`, i, s, c.slots[i] === s ? 'sel' : '')).join('')}</div>`}
  <h3>Socketed gems (${gemsUsed(c)}/${gemCapacity(c)} total · max ${GEMS_PER_SLOT} per skill)</h3>
  <div class="row">${gems.map((g, k) => btn('ungem', `✖ ${GEMS[g].name}`, i, k)).join('') || '<span class="dim">none</span>'}</div>
  <h3>Inventory gems</h3>${inv.map((g) => `<div class="slot"><div class="t"><b>${GEMS[g].name}</b> ×${G.inv.gems.filter((x) => x === g).length}<small>${GEMS[g].desc}</small></div>${btn('gem', 'Socket', i, g, '', full || !sid)}</div>`).join('') || '<p class="dim">No spare gems. Buy some in the shop or find them in the cavern.</p>'}
  ${btn('bmain', 'Back', '', '', 'primary')}`);
}
ACT.setskill = (i, sid) => { const c = G.party[B.i]; c.slots[+i] = sid || null; if (!sid) { G.inv.gems.push(...c.gems[+i]); c.gems[+i] = []; } buildScreen(); };
ACT.gem = (i, g) => { const c = G.party[B.i]; G.inv.gems.splice(G.inv.gems.indexOf(g), 1); c.gems[+i].push(g); buildScreen(); };
ACT.ungem = (i, k) => { const c = G.party[B.i]; G.inv.gems.push(...c.gems[+i].splice(+k, 1)); buildScreen(); };

// ---------- town services ----------
function guild() { B.guild = true; show(`<h2>⚔️ Adventurer's Guild</h2><p>Reassign jobs, gear and skills for free.</p><div class="grid">${G.party.map((c, i) => btn('build', `${esc(c.name)} — ${JOBS[c.main].name}${c.sub ? ' / ' + JOBS[c.sub].name : ''}`, i)).join('')}</div>${btn('leave', 'Leave', '', '', 'primary')}`); }
ACT.leave = () => { B.guild = false; hide(); };
function inn() {
  const cost = 20;
  show(`<h2>🛏️ Haven Inn</h2><p>A night's rest restores everyone and saves your game. <span class="gold">${cost} G</span></p><p>You have <span class="gold">${G.gold} G</span>.</p>${btn('rest', 'Rest', '', '', 'primary', G.gold < cost)}${btn('close', 'Leave')}`);
}
ACT.rest = () => { G.gold -= 20; for (const c of G.party) { const s = maxOf(c); c.hp = s.hp; c.mp = s.mp; } save(); draw(); show(`<h2>🛏️ Rested</h2><p>HP and MP restored. Game saved.</p>${btn('close', 'OK', '', '', 'primary')}`); };

let shopTab = 'buy';
function catalog() {
  const out = [];
  for (const k of ['items', 'weapons', 'armors', 'accs', 'gems']) for (const [id, d] of Object.entries(DB[k])) if (d.price > 0) out.push({ k, id, d });
  return out;
}
function shop(msg = '') {
  const rows = shopTab === 'buy' ? catalog().map(({ k, id, d }) => `<div class="slot"><div class="t"><b>${d.name}</b><small>${d.desc || (k === 'weapons' ? WEAPON_TYPES[d.type].name + ' · ' : '') + (d.desc ? '' : gearLine(d))}</small></div>${btn('buy', `${d.price} G`, k, id, '', G.gold < d.price)}</div>`)
    : ['weapons', 'armors', 'accs', 'gems'].flatMap((k) => [...new Set(G.inv[k])].map((id) => { const d = DB[k][id], p = Math.floor((d.price || 200) / 2); return `<div class="slot"><div class="t"><b>${d.name}</b> ×${G.inv[k].filter((x) => x === id).length}</div>${btn('sell', `Sell ${p} G`, k, id)}</div>`; })).concat(Object.entries(G.inv.items).filter(([, n]) => n > 0).map(([id, n]) => `<div class="slot"><div class="t"><b>${ITEMS[id].name}</b> ×${n}</div>${btn('sell', `Sell ${Math.floor(ITEMS[id].price / 2)} G`, 'items', id)}</div>`));
  show(`<h2>🛒 Shop</h2><div class="row"><span class="gold grow">${G.gold} G</span>${btn('tab', 'Buy', 'buy', '', shopTab === 'buy' ? 'sel' : '')}${btn('tab', 'Sell', 'sell', '', shopTab === 'sell' ? 'sel' : '')}</div>${msg ? `<p class="dim">${msg}</p>` : ''}${rows.join('') || '<p class="dim">Nothing to sell.</p>'}${btn('close', 'Leave', '', '', 'primary')}`);
}
ACT.tab = (t) => { shopTab = t; shop(); };
ACT.buy = (k, id) => { const d = DB[k][id]; if (G.gold < d.price) return; G.gold -= d.price; if (k === 'items') G.inv.items[id] = (G.inv.items[id] || 0) + 1; else G.inv[k].push(id); shop(`Bought ${d.name}.`); };
ACT.sell = (k, id) => {
  const d = DB[k][id], p = Math.floor((d.price || 200) / 2);
  if (k === 'items') G.inv.items[id]--; else G.inv[k].splice(G.inv[k].indexOf(id), 1);
  G.gold += p; shop(`Sold ${d.name}.`);
};

// ---------- battle ----------
let BT = null;
async function bossFight() { await battle(['wyrm'], true); }
async function battle(groupIds, boss = false) {
  busy = true;
  const b = new Battle(G.party, groupIds, Math.random, boss);
  BT = { b, log: [boss ? 'The Ashen Wyrm awakens!' : `${b.e.map((e) => e.name).join(', ')} appear!`], ask: null };
  renderBattle();
  while (!b.over) {
    const cmds = new Map();
    for (const p of b.p.filter((x) => x.hp > 0)) {
      const cmd = await askCommand(p);
      cmds.set(p, cmd);
    }
    BT.ask = null;
    for (const lines of b.round(cmds)) { BT.log.push(...lines); renderBattle(); await sleep(520); }
    renderBattle();
  }
  b.p.forEach((x) => { x.ch.hp = x.hp; x.ch.mp = x.mp; });
  if (b.over === 'win') await victory(b, boss);
  else if (b.over === 'lose') await defeat();
  else { hide(); }
  BT = null; busy = false; if (G) draw();
}
function renderBattle() {
  const { b, ask } = BT;
  const tgtFoes = ask?.stage === 'target' && ask.tside === 'e', tgtAllies = ask?.stage === 'target' && ask.tside === 'p';
  ov.innerHTML = `<div class="win"><div class="foes">${b.e.map((e, i) => `<div class="foe ${e.hp <= 0 ? 'dead' : ''} ${tgtFoes && e.hp > 0 ? 'targetable' : ''}" ${tgtFoes && e.hp > 0 ? `data-act="tgt" data-a="e" data-b="${i}"` : ''}>
    <div class="ico">${e.icon}</div><b>${e.name}</b>${bar(e.hp, e.maxhp, 'hp')}<small class="dim">${e.hp}/${e.maxhp}${e.st.poison > 0 ? ' ☠️' : ''}${e.st.slow > 0 ? ' 🐌' : ''}</small>
    <div class="dim" style="font-size:11px">${e.weak.length ? 'weak ' + e.weak.map((w) => ELEM_ICON[w]).join('') : ''}${e.res.length ? ' res ' + e.res.map((w) => ELEM_ICON[w]).join('') : ''}</div></div>`).join('')}</div>
  <div class="log" id="log">${BT.log.map((l) => `<div>${esc(l)}</div>`).join('')}</div>
  <div class="party">${b.p.map((p, i) => `<div class="pm ${p.hp <= 0 ? 'dead' : ''} ${ask?.p === p ? 'active' : ''} ${tgtAllies ? 'targetable' : ''}" ${tgtAllies ? `data-act="tgt" data-a="p" data-b="${i}"` : ''}>
    <b>${esc(p.name)}</b> <small>${JOBS[p.ch.main].icon}${p.st.poison > 0 ? ' ☠️' : ''}${p.st.atkup > 0 ? ' ⬆️' : ''}${p.st.defup > 0 ? ' 🛡️' : ''}${p.st.slow > 0 ? ' 🐌' : ''}</small>
    <div>HP ${p.hp}/${p.maxhp}${bar(p.hp, p.maxhp, 'hp')}MP ${p.mp}/${p.maxmp}${bar(p.mp, p.maxmp, 'mp')}</div></div>`).join('')}</div>
  <div id="cmd">${ask ? cmdHtml(ask) : '<span class="dim">…</span>'}</div></div>`;
  ov.classList.add('on');
  const lg = $('#log'); if (lg) lg.scrollTop = lg.scrollHeight;
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
async function victory(b, boss) {
  const r = rewards(b); G.gold += r.gold;
  const lines = [];
  for (const c of G.party) if (c.hp > 0) {
    const ups = gainExp(c, r.exp);
    if (ups.length) { lines.push(`🎉 ${esc(c.name)} reached level ${ups.at(-1)}!`); autofill(c); }
  }
  for (const d of r.drops) { if (d.kind === 'items') G.inv.items[d.id] = (G.inv.items[d.id] || 0) + 1; else G.inv[d.kind].push(d.id); lines.push(`Found ${DB[d.kind][d.id].name}`); }
  if (boss) {
    G.flags.boss = true; G.inv.weapons.push('dragonbane'); G.inv.armors.push('dragon_mail');
    lines.push('Found Dragonbane and Dragon Mail!');
  }
  await new Promise((res) => {
    ov.innerHTML = `<div class="win"><h2>${boss ? '🏆 The Ashen Wyrm is slain!' : 'Victory!'}</h2><p>+${r.exp} EXP · +<span class="gold">${r.gold} G</span></p>${lines.map((l) => `<div>${l}</div>`).join('')}
    ${boss ? '<p><b>Thanks for playing the vertical slice!</b> Keep experimenting with builds: try Dragonbane with a Knight/Ranger and Wide + Echo gems.</p>' : ''}<div class="row">${btn('vdone', 'Continue', '', '', 'primary')}</div></div>`;
    ACT.vdone = () => { hide(); res(); };
  });
}
async function defeat() {
  await new Promise((res) => {
    ov.innerHTML = `<div class="win"><h2 class="bad">Defeated…</h2><p>The party is carried back to Haven Town. You lose half your gold.</p>${btn('ddone', 'Wake up', '', '', 'primary')}</div>`;
    ACT.ddone = () => { G.gold = Math.floor(G.gold / 2); for (const c of G.party) { const s = maxOf(c); c.hp = s.hp; c.mp = s.mp; } goto('town', 6, 6); hide(); res(); };
  });
}

// debug / test hook
window.__game = { get G() { return G; }, get BT() { return BT; }, battle, step };
title();
