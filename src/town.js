// ===== Town services and mini-games: guild, inn, gem-wright, Quiz Night, shops. =====
import * as DATA from './data.js';
import { ITEMS, SHOPS, SOCKET_COST } from './data.js';
import { sfx } from './audio.js';
import * as L from './logic.js';
import * as UI from './uiart.js';
import { B } from './build.js';
import { ACT, DB, ak, bar, btn, coin, esc, gearDesc, gemCapacity, gemsOn, heroBtn, hide, ic, itemIc, maxOf, npcImg, ov, portrait, sanitize, show } from './core.js';
import { draw, mapDef } from './world.js';
import { G } from './state.js';
import { cond, fill, npcLines } from './story.js';
import { autosave, save } from './saves.js';
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
const QUIZ_FEE = 20, QUIZ_PRIZE = [[0, null, 'Barnaby: "Nil points. Brave, though."'], [0, null, 'Barnaby: "One. My goat could do one."'], [20, null, 'Barnaby: "Two. Your entry fee back, and my pity."'], [60, 'potion', 'Barnaby: "Three! Respectable. Have a pint on the house."'], [100, 'hipotion', 'Barnaby: "Four! The table by the fire is yours."'], [220, 'elixir', 'Barnaby: "FIVE! A clean sweep! Brenna, ring the... no. NO bells."']];
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
  const own = (k, id2) => { const n = k === 'items' ? G.inv.items[id2] || 0 : G.inv[k].filter((x) => x === id2).length; return n ? ` <span class="own">×${n}</span>` : ''; }; // how many you already carry
  const buyRows = Object.entries(def.stock).filter(([k]) => k !== 'gems' || gemsOn()).flatMap(([k, ids]) => ids.map((id2) => { const d = DB[k][id2]; return `<div class="slot"><span class="lead">${itemIc(k, id2)}</span><div class="t"><b>${d.name}${own(k, id2)}</b><small>${gearDesc(k, d)}</small>${k === 'weapons' ? who(id2) : ''}</div>${btn('buy', shopPending === `${k}:${id2}` ? 'Tap to buy' : `${d.price} G`, k, id2, shopPending === `${k}:${id2}` ? 'primary' : '', G.gold < d.price)}</div>`; }));
  const sellRows = ['weapons', 'armors', 'accs', ...(gemsOn() ? ['gems'] : [])].flatMap((k) => [...new Set(G.inv[k])].map((id2) => { const d = DB[k][id2], p = Math.floor((d.price || 200) / 2); return `<div class="slot"><span class="lead">${itemIc(k, id2)}</span><div class="t"><b>${d.name} <span class="dim">×${G.inv[k].filter((x) => x === id2).length}</span></b></div>${btn('sell', `Sell ${p} G`, k, id2)}</div>`; })).concat(Object.entries(G.inv.items).filter(([, n]) => n > 0).map(([id2, n]) => `<div class="slot"><span class="lead">${itemIc('items', id2)}</span><div class="t"><b>${ITEMS[id2].name} <span class="dim">×${n}</span></b></div>${btn('sell', `Sell ${Math.floor(ITEMS[id2].price / 2)} G`, 'items', id2)}</div>`));
  show(`<h2>${def.title}</h2><div class="shophead">${npcImg(/smith/.test(curShop) ? 'smith' : 'merchant', 48)}<div class="shoptabs">${btn('tab', 'Buy', 'buy', '', shopTab === 'buy' ? 'sel' : '')}${btn('tab', 'Sell', 'sell', '', shopTab === 'sell' ? 'sel' : '')}</div><div class="gilbox">${coin(G.gold)}<span>G</span></div></div>${def.greet ? `<p class="dim greet">“${esc(def.greet)}”</p>` : ''}${msg ? `<p class="gold">${msg}</p>` : ''}${(shopTab === 'buy' ? buyRows : sellRows).join('') || '<p class="dim">Nothing to sell.</p>'}<div class="foot">${btn('close', 'Leave', '', '', 'primary')}</div>`);
}
ACT.tab = (t) => { shopTab = t; shopPending = null; shop(); };
ACT.buy = (k, id) => { // gear takes a second tap to buy (an easy mis-tap costs a lot), then offers to equip it on the spot
  const d = DB[k][id]; if (G.gold < d.price) return;
  if (k !== 'items' && shopPending !== `${k}:${id}`) { shopPending = `${k}:${id}`; sfx('click'); return shop(); }
  shopPending = null; G.gold -= d.price; sfx('coin'); if (k === 'items') G.inv.items[id] = (G.inv.items[id] || 0) + 1; else G.inv[k].push(id);
  const field = { weapons: 'weapon', armors: 'armor', accs: 'acc' }[k], can = field ? G.party.map((c, i) => [c, i]).filter(([c]) => (k !== 'weapons' || L.weaponOk(c, id)) && c[field] !== id) : [];
  ov.scrollTop = 0; shop(null, `Bought ${d.name}.${can.length ? `<span class="equipnow"><small>Equip now:</small>${can.map(([c, i]) => btn('shopequip', `<img src="${UI.faceURL(ak(c))}" alt="">${esc(c.name)}${c[field] ? ` <small class="dim">(${esc(DB[k][c[field]].name)})</small>` : ''}`, k, `${id}|${i}`)).join('')}</span>` : ''}`);
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

export { guild, inn, shop, socketer };
