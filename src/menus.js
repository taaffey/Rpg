// ===== The main menu and its screens: chat, bestiary, journal, map screen, feats. =====
import { MAPS } from './maps.js';
import { DROPS, ENEMIES, GEMS, KEY_ITEMS, QUESTS, SKILLS, STORY } from './data.js';
import * as L from './logic.js';
import { FEATS } from './feats.js';
import { sfx } from './audio.js';
import { BEAST_TIERS, OBJECTIVES, RULES } from './gamedata.js';
import * as UI from './uiart.js';
import * as SP from './sprites.js';
import { MECH } from './bossmech.js';
import * as TR from './terrain.js';
import { G } from './state.js';
import { PEOPLE, cond, qstate, questDone, questProgress, scene } from './story.js';
import { $, ACT, DB, TOUCH, banner, btn, diag, esc, fmtTime, gemsOn, gemsUsed, heroBtn, hide, ic, itemIc, show, toast } from './core.js';
import { drawMini, mapDef, regionOf } from './world.js';
import { autosave, save, tipOnce } from './saves.js';
import { BT, fieldNote, foeStat } from './battle.js';
import { title } from './intro.js';
// ---------- feats: silly achievements (src/feats.js), checked whenever the game autosaves ----------
function featEnv() {
  const secrets = Object.entries(MAPS).flatMap(([mid, m]) => Object.keys(m.secrets || {}).map((k) => `${mid}:${k}`)), st = G.stats || {};
  return {
    wins: st.wins || 0, wipes: st.wipes || 0, rides: st.rides || 0, phone: G.flags.story.phone || 0, used: st.used || {}, kills: (id) => G.flags.bestiary[id]?.kills || 0,
    bestiary: beastDone(), bestiaryTotal: Object.keys(ENEMIES).length, quests: Object.keys(QUESTS).filter((id) => qstate(id) === 'done').length, questsTotal: Object.keys(QUESTS).length,
    secrets: secrets.filter((k) => G.flags.chests[k]).length, secretsTotal: secrets.length, steps: st.steps || 0, roadside: Object.keys(G.flags.chat).filter((k) => k.startsWith('rs:')).length, gold: G.gold, visited: G.flags.visited, bosses: G.flags.bosses, ended: !!G.flags.story.ended, ngp: G.ngp || 0, rulesOn: Object.keys(G.rules || {}).length,
    maxLevel: G.party.some((c) => c.level >= L.MAX_LEVEL), mastered: G.party.some((c) => L.mastered(c).length > 0), callings: Math.max(0, ...G.party.map((c) => Object.keys(c.cp || {}).length)), gems: G.party.reduce((x, c) => x + gemsUsed(c), 0),
  };
}
function unlockFeats() {
  const got = (G.flags.feats ||= {}), e = featEnv(), fresh = FEATS.filter((f) => !got[f.id] && f.test(e));
  for (const f of fresh) got[f.id] = true;
  return fresh;
}
function announceFeats(fresh) { // one or two by name, a pile as a count; a save that was already far along unlocks a lot at once
  diag(`feats ${fresh.map((f) => f.id).join(',')}`); sfx('levelup'); toast(fresh.length > 2 ? `🏆 ${fresh.length} feats unlocked! See Menu > Feats` : `🏆 Feat: ${fresh.map((f) => f.name).join(' & ')}`, 3600);
}
ACT.feats = () => {
  const got = G.flags.feats || {}, e = featEnv(), done = FEATS.filter((f) => got[f.id]).length;
  show(`<h2>🏆 Feats</h2><p class="dim">Silly achievements: <b class="gold">${done}/${FEATS.length}</b>. They unlock as you play and carry into New Game+.</p>${FEATS.map((f) => {
    const dn = !!got[f.id], pr = !dn && f.prog ? f.prog(e) : null;
    return `<div class="card ${dn ? 'done' : ''}"><b>${dn ? '★' : '◇'} ${f.name}</b><div class="dim">${f.text}${pr ? ` <span class="gold">(${pr[0]}/${pr[1]})</span>` : ''}</div></div>`;
  }).join('')}<div class="foot">${btn('menu', 'Back', '', '', 'primary')}</div>`);
};
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
  const cmds = [['items', 'ITEM', 'bag'], ['chat', 'CHAT', 'hero'], ['mapscreen', 'MAP', 'map'], ['journal', 'JOURNAL', 'journal'], ['bestiary', 'BESTIARY', 'bestiary'], ['feats', 'FEATS', 'trophy'], ['opts', 'OPTIONS', 'options'], ['save', 'SAVE', 'save'], ['title', 'TITLE', 'title'], ['close', 'CLOSE', 'close']];
  show(`<div class="menugrid"><div class="menuside"><div class="pane menucmd"><div class="cmdlist">${cmds.map(([a, l, n]) => btn(a, ic(n) + l, '', '', a === 'close' ? 'primary' : '')).join('')}</div></div>
  <div class="pane menuinfo"><span class="dim">TIME</span><span>${fmtTime(G.playtime)}</span><span class="dim">WINS</span><span>${G.stats?.wins || 0}</span>${G.ngp ? `<span class="dim">LOOP</span><span>NG+${G.ngp}</span>` : ''}${G.rules && Object.keys(G.rules).length ? `<span class="dim">RULES</span><span>${Object.keys(G.rules).map((k) => RULES[k]?.name.split(' ')[0]).join(', ')}</span>` : ''}<span class="g">${ic('coin')}GOLD</span><span class="gold">${G.gold}</span></div></div>
  <div class="pane menuparty">${G.party.map((c, i) => heroBtn(c, 'build', i)).join('')}</div></div>
  ${menuTip ? `<div id="msg" class="pane">${ic('tip')} ${menuTip}</div>` : '<div id="msg"></div>'}`, '', 'multi');
}
// the Goose pays out for a well-filled bestiary: 25/50/75/100% of foes slain at least once
const beastDone = () => Object.keys(ENEMIES).filter((id) => G.flags.bestiary[id]?.kills > 0).length;
function beastClaim() {
  const n = beastDone(), tot = Object.keys(ENEMIES).length, got = G.flags.story.beastTier || 0, next = BEAST_TIERS[got];
  if (!next) return '<div class="card gold" style="text-align:center">🪿 Bestiary complete. The Goose is proud. It honks.</div>';
  const ready = n / tot >= next[0];
  return `<div class="card" style="text-align:center">🪿 Goose reward ${got + 1}/4: ${next[1]} G and ${next[2]} <small class="dim">(${n}/${tot} slain, needs ${Math.ceil(next[0] * tot)})</small>${ready ? `<div>${btn('beastclaim', 'Claim', '', '', 'primary')}</div>` : ''}</div>`;
}
ACT.beastclaim = () => { const got = G.flags.story.beastTier || 0, t = BEAST_TIERS[got]; if (!t || beastDone() / Object.keys(ENEMIES).length < t[0]) return; G.flags.story.beastTier = got + 1; G.gold += t[1]; if (got === 3) G.inv.items.elixir = (G.inv.items.elixir || 0) + 5; sfx('levelup'); banner(`+${t[1]} G`); autosave(); ACT.bestiary(); };
ACT.bestiary = () => {
  const ids = Object.keys(ENEMIES), seen = ids.filter((id) => G.flags.bestiary[id]);
  const els = (l) => l.map((w) => UI.elemIcon(w)).join('') || '<span class="dim">—</span>';
  show(`<h2>📖 Bestiary</h2><p class="dim">Foes discovered: <b class="gold">${seen.length}/${ids.length}</b>. Defeat a creature to learn its weaknesses.</p><div class="grid">${ids.map((id) => {
    const r = G.flags.bestiary[id], d = ENEMIES[id];
    if (!r) return '';
    return `<div class="card beast"><div class="bh"><span class="bimg"><img src="${SP.enemyURL(id)}" alt=""></span><div><div class="bn">${d.name}</div>${d.boss ? `<span class="chip tag">${ic('trophy')} Boss</span>` : ''}<div class="dim">Defeated ${r.kills}</div></div></div><div>HP <b>${foeStat(d, 'hp')}</b> · ATK <b>${foeStat(d, 'atk')}</b> · MAG <b>${foeStat(d, 'mag')}</b></div>${r.kills ? `<div>WEAK ${els(d.weak)}&nbsp; RES ${els(d.res)}</div>` : '<div class="dim">Weaknesses unknown</div>'}${r.kills && MECH[id]?.charge ? `<div class="tell">TELL: winds up <b>${esc(SKILLS[MECH[id].charge.move].name)}</b> every ${MECH[id].charge.every}${['th', 'st', 'nd', 'rd'][MECH[id].charge.every] || 'th'} move. Hit it hard to stagger it, or Guard.</div>` : ''}${r.kills && DROPS[id]?.common ? `<div>${[DROPS[id].common, DROPS[id].rare].filter(Boolean).map(([k, did], j) => (j ? (r.got?.[did] ? `<span class="gold">${ic('star')}${itemIc(k, did)} ${DB[k][did].name}</span>` : `<span class="dim">${ic('star')} ???</span>`) : `${itemIc(k, did)} ${DB[k][did].name}`)).join('<br>')}</div>` : ''}${(() => { const n = fieldNote(id); return n ? `<div class="dim note">${esc(n.name)}: “${esc(n.text)}”</div>` : ''; })()}</div>`;
  }).join('')}</div>${beastClaim()}${ids.length - seen.length ? `<div class="card dim" style="text-align:center">❔ ${ids.length - seen.length} more creatures are still undiscovered</div>` : ''}<div class="foot">${btn('menu', 'Back', '', '', 'primary')}</div>`);
};
ACT.title = () => { if (G?.slot && !BT) save(); title(); }; // leaving for the title never loses a step
ACT.save = () => { const m = $('#msg'); m.className = 'pane'; m.textContent = save() ? `GAME SAVED TO SLOT ${G.slot}.` : 'COULD NOT SAVE (STORAGE FULL OR BLOCKED).'; };
// ---------- map screen, journal, options ----------
ACT.mapscreen = () => {
  const m = mapDef();
  if (!m.fog) { show(`<h2>🗺 Map</h2><p class="dim">There's nothing to chart indoors. Step outside or into a dungeon to see the map.</p><div class="foot">${btn('menu', 'Back', '', '', 'primary')}</div>`); return; }
  const W = m.rows[0].length, H = m.rows.length, sc = Math.max(4, Math.min(Math.floor(560 / W), Math.floor(380 / H)));
  const places = (m.places || []).filter(([x, y]) => G.flags.seen[G.map]?.[y]?.[x] === '1');
  show(`<h2>🗺 ${esc(m.name)}</h2><canvas id="bigmap" width="${W * sc}" height="${H * sc}" class="px framed" style="max-width:${W * sc + 8}px;margin:0 auto"></canvas>
  <div class="dim">${G.map === 'world' ? 'The blinking frame is your party. Dark areas are still unexplored.' : 'White blinking square = you · gold = exits · red = the boss · tan = unopened chests (once seen).'}${TOUCH ? '' : ' Press <b>N</b> on the map to toggle the minimap.'}</div>
  ${places.length && innerHeight > innerWidth ? `<h3>Discovered</h3><div>${places.map((p) => `<span class="chip tag">${ic('pin')}${esc(p[2])}</span>`).join('')}</div>` : ''}<div class="foot" style="position:sticky;bottom:0;padding-top:6px">${btn('menu', 'Back', '', '', 'primary')}</div>`);
  const c2 = $('#bigmap').getContext('2d'); c2.imageSmoothingEnabled = false;
  const art = G.map === 'world' && TR.mapImage ? TR.mapImage(m) : null, seen = G.flags.seen[G.map] || [];
  let layer = null, layerK = 0; // parchment furniture (compass, cartouche, name plaques) on its own canvas, rebuilt when the on-screen scale changes so text stays about 8 css px
  const furniture = () => {
    const cvs = $('#bigmap'), k = Math.max(0.2, (cvs.clientWidth || W * sc) / (W * sc)); if (layer && Math.abs(k - layerK) < 0.01) return layer;
    layerK = k; const u = 1 / k, cw = W * sc, ch = H * sc; layer = document.createElement('canvas'); layer.width = cw; layer.height = ch;
    const x = layer.getContext('2d'); x.imageSmoothingEnabled = false; x.textBaseline = 'middle'; x.textAlign = 'center';
    const FONT = '"Press Start 2P", ui-monospace, Menlo, monospace', ink = '#3a2410', R = Math.round(26 * u);
    const px = (v) => Math.round(v);
    // compass rose, top right
    const ccx = cw - R - Math.round(8 * u), ccy = R + Math.round(8 * u);
    x.fillStyle = 'rgba(236,216,168,.9)'; x.strokeStyle = ink; x.lineWidth = Math.max(1, u); x.beginPath(); x.arc(ccx, ccy, R, 0, 7); x.fill(); x.stroke();
    x.beginPath(); x.arc(ccx, ccy, R * 0.8, 0, 7); x.stroke();
    const star = (len, w, col, ang) => { x.fillStyle = col; x.beginPath(); x.moveTo(ccx + Math.sin(ang) * len, ccy - Math.cos(ang) * len); x.lineTo(ccx + Math.cos(ang) * w, ccy + Math.sin(ang) * w); x.lineTo(ccx - Math.sin(ang) * len * 0.3, ccy + Math.cos(ang) * len * 0.3); x.lineTo(ccx - Math.cos(ang) * w, ccy - Math.sin(ang) * w); x.closePath(); x.fill(); x.stroke(); };
    for (let q = 0; q < 4; q++) star(R * 0.62, R * 0.12, q === 0 ? '#c43a22' : '#f4ead0', q * Math.PI / 2 + (q ? 0 : 0));
    for (let q = 0; q < 4; q++) star(R * 0.38, R * 0.08, '#8a6a3a', Math.PI / 4 + q * Math.PI / 2);
    x.fillStyle = ink; x.font = `${px(7 * u)}px ${FONT}`; x.fillText('N', ccx, ccy - R - 4 * u + 0); 
    // cartouche, bottom left
    const f = px(6.5 * u), cx0 = Math.round(6 * u), pw = Math.round(112 * u), ph = Math.round(26 * u), cy0 = ch - ph - Math.round(6 * u);
    x.fillStyle = 'rgba(236,216,168,.94)'; x.fillRect(cx0, cy0, pw, ph); x.strokeStyle = ink; x.lineWidth = Math.max(1, u); x.strokeRect(cx0 + 0.5, cy0 + 0.5, pw - 1, ph - 1); x.strokeRect(cx0 + 3 * u, cy0 + 3 * u, pw - 6 * u, ph - 6 * u);
    x.fillStyle = ink; x.font = `${f}px ${FONT}`; x.fillText('THE REALM OF', cx0 + pw / 2, cy0 + ph * 0.36); x.fillText('GREENMARCH', cx0 + pw / 2, cy0 + ph * 0.68);
    // name plaques for every discovered place, nudged apart
    if (!art) return layer;
    const fs = px(7 * u), padx = Math.round(3 * u), hgt = fs + Math.round(5 * u); x.font = `${fs}px ${FONT}`;
    const taken = [[ccx - R, ccy - R, R * 2, R * 2 + 8 * u], [cx0, cy0, pw, ph]], hit = (r) => taken.filter((t) => r[0] < t[0] + t[2] && r[0] + r[2] > t[0] && r[1] < t[1] + t[3] && r[1] + r[3] > t[1]).length;
    const MAJOR = /^(Haven Town|Frostholm|Mirewood|Hopsend|Kilnhaven|Ashen Cavern|Sunken Crypt|Frost Spire|Storm Cavern|Sunscar Ruins|Mild Pyramid|Great Brewery|The Pizza Oven|Salty Sue Wreck)$/;
    const list = places.filter((q) => k >= 0.6 || MAJOR.test(q[2])).map(([gx, gy, name]) => ({ name, x: (gx + 0.5) * sc, y: (gy + 0.5) * sc, w: Math.ceil(x.measureText(name.toUpperCase()).width) + padx * 2 })).sort((a, b) => a.y - b.y);
    const marks = [];
    for (const pl of list) {
      const off = [[0, -1], [0, 1], [1, 0], [-1, 0], [0, -2], [0, 2], [1, -1], [-1, -1], [1, 1], [-1, 1], [0, -3], [0, 3], [2, 0], [-2, 0], [0, -4], [0, 4]];
      let best = null, bh = 1e9;
      for (const [ox, oy] of off) {
        const gap = Math.round(5 * u), rx = pl.x - pl.w / 2 + ox * (pl.w / 2 + gap) , ry = pl.y - hgt / 2 + oy * (hgt + gap * 0.6);
        const r = [Math.max(2, Math.min(cw - pl.w - 2, rx)), Math.max(2, Math.min(ch - hgt - 2, ry)), pl.w, hgt], h = hit(r) * 10 + Math.abs(ox) + Math.abs(oy) * 0.5; if (h < bh) { bh = h; best = r; } if (h < 1.6) break;
      }
      taken.push(best); marks.push([pl, best]);
    }
    for (const [pl] of marks) { x.fillStyle = '#ffd24a'; x.strokeStyle = '#160e0a'; x.lineWidth = Math.max(1, u); x.beginPath(); x.arc(pl.x, pl.y, Math.max(2, 2.5 * u), 0, 7); x.fill(); x.stroke(); }
    for (const [pl, r] of marks) { x.fillStyle = 'rgba(8,6,10,.9)'; x.fillRect(px(r[0]), px(r[1]), r[2], r[3]); x.strokeStyle = '#e8d6a0'; x.lineWidth = Math.max(1, u * 0.7); x.strokeRect(px(r[0]) + 0.5, px(r[1]) + 0.5, r[2] - 1, r[3] - 1); x.fillStyle = '#ffffff'; x.fillText(pl.name.toUpperCase(), r[0] + r[2] / 2, r[1] + r[3] / 2 + u * 0.5); }
    return layer;
  };
  const paint = () => {
    if (!$('#bigmap')) return; const t2 = performance.now() / 1000; c2.clearRect(0, 0, W * sc, H * sc);
    if (!art) drawMini(c2, G.map, sc, 0, 0, t2);
    else { // the painted world, with unexplored tiles left in shadow
      c2.drawImage(art, 0, 0, W * sc, H * sc); c2.fillStyle = 'rgba(4,6,20,.93)';
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (seen[y]?.[x] !== '1') c2.fillRect(x * sc, y * sc, sc, sc);
    }
    if (art) { c2.drawImage(furniture(), 0, 0); if (Math.floor(t2 * 3) % 2 === 0) { c2.strokeStyle = '#ffffff'; c2.lineWidth = 2; c2.strokeRect(G.x * sc - 2, G.y * sc - 2, sc + 4, sc + 4); } }
    requestAnimationFrame(paint);
  }; paint();
};
ACT.journal = () => {
  const n = ['wyrm', 'lich', 'titan'].filter((k) => G.flags.bosses[k]).length, hearts = Object.keys(KEY_ITEMS).filter((k) => G.flags.qitems[k]).map((k) => KEY_ITEMS[k]);
  const secrets = Object.entries(MAPS).flatMap(([mid, m]) => Object.keys(m.secrets || {}).map((k) => `${mid}:${k}`)), found = secrets.filter((k) => G.flags.chests[k]).length;
  show(`<h2>📜 Journal</h2><p class="dim">Great evils slain: <b class="gold">${n}/3</b> · Hidden treasures: <b class="gold">${found}/${secrets.length}</b>${hearts.length ? `<br>Carried: <b class="gold">${hearts.join(', ')}</b>` : ''}</p>${OBJECTIVES.filter((o) => cond(o.show)).map((o) => { const dn = cond(o.done), locked = !cond(o.after); return `<div class="card ${dn ? 'done' : ''}"><b>${dn ? '✔' : locked ? '🔒' : '◇'} ${o.optional ? '<span class="dim">Optional:</span> ' : ''}${o.title}</b><div class="dim">${locked ? o.lockHint || 'A rockslide buries the northern pass.' : dn ? o.doneHint : o.metHint && cond('s:met') ? o.metHint : o.hint}</div></div>`; }).join('')}
  <h3>Side quests</h3>${(() => { const act = Object.entries(QUESTS).filter(([id]) => qstate(id) === 'active'), dn = Object.entries(QUESTS).filter(([id]) => qstate(id) === 'done');
    return (act.length ? act.map(([id, q]) => `<div class="card ${questDone(id) ? 'done' : ''}"><b>${questDone(id) ? '❓' : '◇'} ${esc(q.title)}</b> <span class="dim">(${questProgress(id)})</span><div class="dim">${questDone(id) ? 'Return to ' + esc(q.giver) + ' to claim your reward.' : esc(q.lines.active[0])}</div></div>`).join('') : '<div class="dim">No active quests. Folk in town sometimes need a hand.</div>') + (dn.length ? `<div class="dim">Completed: ${dn.map(([, q]) => '✔ ' + esc(q.title)).join(' · ')}</div>` : ''); })()}
  <h3>💡 Tips</h3><div class="dim">${gemsOn() ? `• Gems rewrite skills: try ${GEMS.wide.name} + a heal, ${GEMS.echo.name} on a big spell, ${GEMS.stun.name} on a fast skill.<br>` : ''}• Battles earn CP for each hero's calling; ranks teach abilities that are kept for good. Change callings from the menu.<br>• Inns heal and save. Frostholm's shops sell much better gear.<br>• Hermits and oracles roam the wilds. Listen to them, and watch the ground for a faint glint of buried treasure.</div><div class="foot">${btn('menu', 'Back', '', '', 'primary')}</div>`);
};

export { announceFeats, beastDone, mainMenu, unlockFeats };
