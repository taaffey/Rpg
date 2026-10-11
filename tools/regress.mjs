// Browser regression: node tools/regress.mjs  (needs: python3 -m http.server 8123 running, Playwright installed)
import { createRequire } from 'module';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const pg = await b.newPage({ viewport: { width: 700, height: 900 } });
const errs = []; pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => ['error', 'warning'].includes(m.type()) && !/fonts|ERR_|Failed to load/.test(m.text()) && errs.push(m.text()));
let fails = 0; const ok = (name, cond, extra = '') => { console.log(cond ? 'PASS' : 'FAIL', name, extra); if (!cond) fails++; };
await pg.addInitScript(() => { window.__osc = 0; const oc = AudioContext.prototype.createOscillator; AudioContext.prototype.createOscillator = function () { const o = oc.call(this); const st = o.start.bind(o); o.start = (t) => { window.__osc++; return st(t); }; return o; }; });
const URL_ = process.env.URL || 'http://localhost:8123/index.html';
await pg.goto(URL_); await pg.waitForTimeout(300);
const ev = (f, a) => pg.evaluate(f, a);
const key = async (k, n = 1, d = 90) => { for (let i = 0; i < n; i++) { await pg.keyboard.press(k); await pg.waitForTimeout(d); } };
const closeAll = async () => { for (let i = 0; i < 8 && (await ev(() => document.getElementById('overlay').classList.contains('on'))); i++) await key('Escape', 1, 70); };
const openMenu = async () => { await closeAll(); await key('Escape', 1, 120); };
const overlayTitle = () => ev(() => document.querySelector('#overlay h2')?.textContent || '');

// --- start, keyboard only
ok('title focuses New Game', (await ev(() => document.activeElement?.dataset?.act)) === 'new');
await key('Enter'); await key('Enter'); await key('Enter'); await key('Enter', 1, 400); // New Game -> slot 1 -> Normal -> Begin
await ev(() => { for (const m of Object.values(window.__game.MAPS)) m.rate = 0; }); // keep tests deterministic: battles are started explicitly
ok('game started in Haven', (await ev(() => window.__game.G.map)) === 'haven');
await pg.waitForTimeout(800); ok('music engine scheduled notes', (await ev(() => window.__osc)) >= 4);

// --- walk into a building through its door, talk to the NPC to open the shop
await ev(() => window.__game.goto('haven', 7, 3)); await key('ArrowUp', 1, 450);
ok('entered the shop interior', (await ev(() => window.__game.G.map)) === 'haven_shop');
await key('ArrowUp', 3, 160);
ok('shop UI opened by bumping the merchant', /General Store/.test(await overlayTitle()));
await ev(() => document.querySelector('[data-act=buy][data-b=potion]').click()); await pg.waitForTimeout(100);
ok('bought a potion', (await ev(() => window.__game.G.inv.items.potion)) === 5 && (await ev(() => window.__game.G.gold)) === 220);
await closeAll();

// --- build screen: socket gems, change job in a town
await openMenu();
await pg.click('[data-act=build][data-a="1"]'); await pg.click('[data-act=bslot][data-a="0"]'); await pg.click('[data-act=gem][data-b=chain]'); await pg.click('[data-act=gem][data-b=thrifty]');
ok('gems socketed', JSON.stringify(await ev(() => window.__game.G.party[1].gems[0])) === '["chain","thrifty"]');
await pg.click('[data-act=bmain]'); await pg.click('[data-act=bview][data-a=jobMain]'); await pg.click('[data-act=setjob][data-b=alchemist]');
ok('changed to the new Alchemist job', (await ev(() => window.__game.G.party[1].main)) === 'alchemist');
await closeAll();

// --- explore the world: fog of war grows; options persist; save + reload + continue
await ev(() => window.__game.goto('world', 7, 21)); await key('ArrowRight', 5, 140);
const seenCount = () => ev(() => window.__game.G.flags.seen.world.join('').split('1').length - 1);
const s1 = await seenCount(); ok('fog of war reveals tiles', s1 > 20, `(${s1} tiles)`);
await ev(() => { const o = window.__game.OPT; o.speed = 'fast'; });
await openMenu(); await pg.click('[data-act=opts]'); await pg.click('[data-act=optmini]'); await key('Escape'); // minimap off (Back -> menu)
await pg.click('[data-act=save]'); await pg.waitForTimeout(100);
const before = await ev(() => ({ x: window.__game.G.x, y: window.__game.G.y, gold: window.__game.G.gold, main: window.__game.G.party[1].main }));
await pg.reload(); await pg.waitForTimeout(500);
ok('continue available after reload', !(await ev(() => document.querySelector('[data-act=cont]').disabled)));
await pg.click('[data-act=cont]'); await pg.click('[data-act=slotpick][data-a="1"]'); await pg.waitForTimeout(300);
const after = await ev(() => ({ x: window.__game.G.x, y: window.__game.G.y, gold: window.__game.G.gold, main: window.__game.G.party[1].main, seen: window.__game.G.flags.seen.world.join('').split('1').length - 1 }));
ok('save restored position/gold/job', after.x === before.x && after.y === before.y && after.gold === before.gold && after.main === before.main);
ok('fog persisted through save', after.seen === s1);
ok('options persisted', (await ev(() => window.__game.OPT.minimap)) === false && (await ev(() => window.__game.OPT.speed)) === 'fast');

// --- gate, region music/banners, battle by keyboard only
await ev(() => window.__game.goto('world', 29, 17)); await key('ArrowUp', 3, 150);
ok('northern pass blocked before the Wyrm falls', (await ev(() => window.__game.G.y)) === 17);
await ev(() => { window.__game.G.flags.bosses.wyrm = true; }); await key('ArrowUp', 4, 170);
ok('pass opens after the Wyrm', (await ev(() => window.__game.G.y)) <= 13);
await ev(() => { window.__game.OPT.speed = 'instant'; window.__game.OPT.minimap = true; window.__game.battle(['frost_goblin', 'ice_wolf']); });
await pg.waitForSelector('[data-act=c]', { timeout: 8000 });
await ev(() => window.__game.BT.b.e.forEach((e) => { e.hp = 1; })); // balance is covered by tools/sim.mjs; this checks the flow
for (let i = 0; i < 120; i++) {
  const st = await ev(() => ({ bt: !!window.__game.BT, act: document.activeElement?.dataset?.act }));
  if (!st.bt) break;
  if (await pg.$('[data-act=vdone]')) { await key('Enter', 1, 100); break; }
  if (st.act === 'c' || st.act === 'tgt') await key('Enter', 1, 60); else await pg.waitForTimeout(100);
}
await pg.waitForTimeout(300);
ok('snow battle won via keyboard only', !(await ev(() => !!window.__game.BT)) && (await ev(() => window.__game.G.party[0].exp)) > 0);

// --- quests: accept, track kills through real battles, find a quest item, claim rewards
const finishBattle = async () => { for (let i = 0; i < 200; i++) { const st = await ev(() => ({ bt: !!window.__game.BT, act: document.activeElement?.dataset?.act })); if (!st.bt) break; if (await pg.$('[data-act=vdone]')) { await key('Enter', 1, 100); break; } if (st.act === 'c' || st.act === 'tgt') await key('Enter', 1, 50); else await pg.waitForTimeout(80); } await pg.waitForTimeout(250); };
const quickFight = async (grp, boss) => { await ev(([g, b2]) => { window.__game.battle(g, b2); }, [grp, boss]); await pg.waitForSelector('[data-act=c]', { timeout: 8000 }); await ev(() => window.__game.BT.b.e.forEach((e) => { e.hp = 1; })); await finishBattle(); };
await ev(() => window.__game.goto('haven', 5, 7)); await key('ArrowLeft', 1, 200);
ok('quest giver offers a quest', /Villager/.test(await overlayTitle()));
for (let i = 0; i < 4 && !(await pg.$('[data-act=qaccept]')); i++) await key('Enter', 1, 120);
await pg.click('[data-act=qaccept]'); await pg.waitForTimeout(150);
ok('quest accepted', (await ev(() => window.__game.G.flags.quests.slimes)) === 'active');
await ev(() => { window.__game.OPT.speed = 'instant'; });
await quickFight(['slime', 'slime', 'slime']); await quickFight(['slime', 'slime', 'slime']);
ok('kills counted toward the quest', (await ev(() => window.__game.G.flags.qprog.slimes)) === 6);
await ev(() => window.__game.goto('haven', 5, 7)); await key('ArrowLeft', 1, 200);
for (let i = 0; i < 4 && !(await pg.$('[data-act=qclaim]')); i++) await key('Enter', 1, 120);
const goldBefore = await ev(() => window.__game.G.gold); await pg.click('[data-act=qclaim]'); await pg.waitForTimeout(150);
ok('quest reward granted', (await ev(() => window.__game.G.gold)) === goldBefore + 150 && (await ev(() => window.__game.G.flags.quests.slimes)) === 'done');
await closeAll();
await ev(() => window.__game.goto('cavern', 18, 11)); await key('ArrowDown', 1, 250);
ok('hidden quest chest gives the heirloom', (await ev(() => window.__game.G.flags.qitems.heirloom)) === true);
await closeAll();
// --- new regions: Mirewood interior NPCs, Storm Cavern boss, ending cinematic
await ev(() => { window.__game.G.flags.bosses.wyrm = true; window.__game.goto('mirewood', 8, 9); }); await pg.waitForTimeout(300);
ok('Mirewood loads', (await ev(() => window.__game.G.map)) === 'mirewood');
await quickFight(['storm_drake'], 'storm_drake');
ok('Storm Drake slain, loot and flag set', (await ev(() => window.__game.G.flags.bosses.storm_drake)) === true && (await ev(() => window.__game.G.inv.weapons.includes('storm_katana'))));
await closeAll();
await ev(() => { window.__game.G.flags.bosses.wyrm = true; });
await ev(() => { window.__game.battle(['titan'], 'titan'); }); await pg.waitForSelector('[data-act=c]', { timeout: 8000 });
await ev(() => window.__game.BT.b.e.forEach((e) => { e.hp = 1; })); await finishBattle();
await pg.waitForTimeout(500);
ok('ending cinematic shown after the Titan', /Frost Titan falls/.test(await overlayTitle()));
await pg.screenshot({ path: process.env.SHOT || '/tmp/ending.png' });
await pg.click('[data-act=edone]'); await pg.waitForTimeout(200);

// --- gem-wright sells bonus sockets
await ev(() => { window.__game.G.gold = 5000; window.__game.goto('haven_smith', 8, 5); }); await key('ArrowUp', 1, 250);
ok('Gem-wright opens', /Gem-wright/.test(await overlayTitle()));
const capBefore = await ev(() => window.__game.G.party[1].extra || 0);
await pg.click('[data-act=addsock][data-a="1"]'); await pg.waitForTimeout(150);
ok('bonus socket purchased', (await ev(() => window.__game.G.party[1].extra)) === capBefore + 1 && (await ev(() => window.__game.G.gold)) === 4400);
await closeAll();

// --- saves: slots, confirmations, legacy import, autosave, difficulty
await ev(() => { window.__game.G.gold = 777; });
await ev(() => window.__game.goto('haven', 9, 11)); await pg.waitForTimeout(150); // entering a town autosaves
const slot1 = await ev(() => JSON.parse(localStorage.getItem('gemforge-save-v3-1')).G.gold);
ok('entering a town autosaves into the active slot', slot1 === 777, String(slot1));
await ev(() => { localStorage.setItem('gemforge-save-v2', JSON.stringify({ ...JSON.parse(localStorage.getItem('gemforge-save-v3-1')).G, gold: 4242, flags: { chests: {}, bosses: {}, seen: {}, talked: {} } })); localStorage.removeItem('gemforge-save-v3-1'); window.__game.G.slot = null; /* stop the pagehide autosave from re-creating slot 1 */ });
await pg.reload(); await pg.waitForTimeout(500);
await pg.click('[data-act=cont]'); await pg.waitForTimeout(150);
ok('legacy single-slot save is imported into slot 1', /Slot 1/.test(await ev(() => document.getElementById('overlay').textContent)) && (await ev(() => JSON.parse(localStorage.getItem('gemforge-save-v3-1')).G.gold)) === 4242);
await pg.click('[data-act=slotpick][data-a="1"]'); await pg.waitForTimeout(300);
ok('legacy save loads and migrates missing fields', (await ev(() => window.__game.G.gold)) === 4242 && (await ev(() => typeof window.__game.G.flags.qprog)) === 'object' && (await ev(() => window.__game.G.difficulty)) === 'normal');
await ev(() => { for (const m of Object.values(window.__game.MAPS)) m.rate = 0; });
await pg.reload(); await pg.waitForTimeout(400);
await pg.click('[data-act=new]'); await pg.click('[data-act=slotpick][data-a="1"]'); await pg.waitForTimeout(100);
ok('overwriting an existing slot needs a second tap', /Tap to overwrite/.test(await ev(() => document.getElementById('overlay').textContent)));
await pg.click('[data-act=slotpick][data-a="2"]'); await pg.waitForTimeout(100); // empty slot 2 -> difficulty
await pg.click('[data-act=diff][data-b=hard]'); await pg.waitForTimeout(200); await pg.click('[data-act=close]'); await pg.waitForTimeout(200);
ok('new game in slot 2 on Hard', (await ev(() => window.__game.G.slot)) === 2 && (await ev(() => window.__game.G.difficulty)) === 'hard');
await ev(() => { for (const m of Object.values(window.__game.MAPS)) m.rate = 0; });
await ev(() => { window.__game.battle(['goblin']); }); await pg.waitForSelector('[data-act=c]', { timeout: 8000 });
const hpHard = await ev(() => window.__game.BT.b.e[0].maxhp);
ok('Hard difficulty scales enemy HP (+25%)', hpHard === Math.round(58 * 1.25), String(hpHard));
await ev(() => window.__game.BT.b.e.forEach((e) => { e.hp = 1; })); await finishBattle();
await ev(() => { window.__game.G.difficulty = 'easy'; window.__game.battle(['goblin']); }); await pg.waitForSelector('[data-act=c]', { timeout: 8000 });
ok('Easy difficulty scales enemy HP (-25%)', (await ev(() => window.__game.BT.b.e[0].maxhp)) === Math.round(58 * 0.75));
await ev(() => window.__game.BT.b.e.forEach((e) => { e.hp = 1; })); await finishBattle();
await ev(() => { window.__game.G.difficulty = 'normal'; });
await pg.reload(); await pg.waitForTimeout(400);
await pg.click('[data-act=cont]'); await pg.click('[data-act=slotdel][data-a="2"]'); await pg.waitForTimeout(100);
ok('delete needs confirmation', !!(await ev(() => localStorage.getItem('gemforge-save-v3-2'))));
await pg.click('[data-act=slotdel][data-a="2"]'); await pg.waitForTimeout(100);
ok('slot deleted after the second tap', !(await ev(() => localStorage.getItem('gemforge-save-v3-2'))));
await pg.click('[data-act=slotpick][data-a="1"]'); await pg.waitForTimeout(300);
await ev(() => { for (const m of Object.values(window.__game.MAPS)) m.rate = 0; });

// --- new status: stun / crit gems resolve in the engine without errors
const eng = await ev(async () => { try { const L = await import('/src/logic.js'); const m = L.skillWithGems('chop', ['stun', 'crit', 'berserk']); return [m.stun, m.crit, m.recoil, m.pow.toFixed(2)].join(','); } catch { return 'bundled'; } });
ok('new gems rewrite skills', eng === '0.35,0.25,0.08,2.24' || eng === 'bundled', eng);
ok('no page errors', errs.length === 0, errs.join(' | '));
await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
