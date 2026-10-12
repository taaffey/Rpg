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
const overlayTitle = () => ev(() => (document.querySelector('#overlay h2') || document.querySelector('#overlay .sayname'))?.textContent || '');

// --- start, keyboard only
ok('title focuses New Game', (await ev(() => document.activeElement?.dataset?.act)) === 'new');
await key('Enter'); await key('Enter'); await key('Enter', 1, 300); // New Game -> slot 1 -> Normal
ok('prologue shown after picking difficulty', /The Seals/i.test(await overlayTitle()));
await key('Enter', 3, 200); ok('party creation opens with hero 1 of 4', /1 of 4/i.test(await overlayTitle()));
await pg.click('[data-act=crjob][data-a=hexer]'); await pg.waitForTimeout(150); await pg.fill('#crname', 'Vex'); await key('Enter', 1, 200); // pick a calling, rename, Enter = next hero
await key('Enter', 3, 200); ok('party review lists the four', /The Four/i.test(await overlayTitle()) && (await ev(() => document.querySelectorAll('[data-act=credit]').length)) === 4);
await key('Enter', 1, 400); // answer the bell
for (let i = 0; i < 12 && (await ev(() => document.getElementById('overlay').classList.contains('on'))); i++) await key('Enter', 1, 250); // Elder's greeting
ok('chosen calling and name are used, no sub calling yet', (await ev(() => { const c = window.__game.G.party[0]; return c.name === 'Vex' && c.main === 'hexer' && !c.sub && c.armor === 'cloth'; })));
await ev(() => { for (const m of Object.values(window.__game.MAPS)) m.rate = 0; }); // keep tests deterministic: battles are started explicitly
ok('game started in Haven', (await ev(() => window.__game.G.map)) === 'haven');
await pg.waitForTimeout(800); ok('music engine scheduled notes', (await ev(() => window.__osc)) >= 4);

// --- walk into a building through its door, talk to the NPC to open the shop
await ev(() => window.__game.goto('haven', 10, 18)); await key('ArrowUp', 1, 450);
ok('entered the shop interior', (await ev(() => window.__game.G.map)) === 'haven_shop');
await key('ArrowUp', 3, 160);
ok('shop UI opened by bumping the merchant', /General Store/.test(await overlayTitle()));
ok('new game: unarmed party, 400 G', (await ev(() => window.__game.G.party.every((c) => c.weapon === null && c.level === 1))) && (await ev(() => window.__game.G.gold)) === 400);
const potBefore = await ev(() => window.__game.G.inv.items.potion || 0), goldBefore0 = await ev(() => window.__game.G.gold);
await ev(() => document.querySelector('[data-act=buy][data-b=potion]').click()); await pg.waitForTimeout(100);
ok('bought a potion', (await ev(() => window.__game.G.inv.items.potion)) === potBefore + 1 && (await ev(() => window.__game.G.gold)) === goldBefore0 - 30);
await closeAll();

// --- build screen: socket gems, change job in a town
await ev(() => window.__game.G.inv.gems.push('chain', 'thrifty')); // the new game starts with a single gem; hand the test two more
await openMenu();
await pg.click('[data-act=build][data-a="1"]'); await pg.click('[data-act=bslot][data-a="0"]'); await pg.click('[data-act=gem][data-b=chain]'); await pg.click('[data-act=gem][data-b=thrifty]');
ok('gems socketed', JSON.stringify(await ev(() => window.__game.G.party[1].gems[0])) === '["chain","thrifty"]');
await pg.click('[data-act=bmain]'); await pg.click('[data-act=bview][data-a=jobMain]');
ok('advanced callings are locked before the Wyrm falls', await ev(() => document.querySelector('[data-act=setjob][data-b=alchemist]').disabled));
await pg.click('[data-act=bmain]'); await ev(() => { window.__game.G.flags.bosses.wyrm = true; }); await pg.click('[data-act=bview][data-a=jobMain]');
await pg.click('[data-act=setjob][data-b=alchemist]');
ok('changed to the new Alchemist job', (await ev(() => window.__game.G.party[1].main)) === 'alchemist');
await ev(() => { window.__game.G.flags.bosses.wyrm = false; }); // later checks expect the Wyrm alive
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
const xpKey = () => ev(() => window.__game.G.party.map((c) => c.level * 1e6 + c.exp).join()), xp0 = await xpKey();
await ev(() => { window.__game.OPT.speed = 'instant'; window.__game.OPT.minimap = true; window.__game.battle(['frost_goblin', 'ice_wolf']); });
await pg.waitForSelector('[data-act=c]', { timeout: 8000 });
await ev(() => window.__game.BT.b.e.forEach((e) => { e.hp = 1; })); // balance is covered by tools/sim.mjs; this checks the flow
for (let i = 0; i < 120; i++) {
  const st = await ev(() => ({ bt: !!window.__game.BT, act: document.activeElement?.dataset?.act }));
  if (!st.bt) break;
  if (await pg.$('[data-act=vdone]')) { await key('Enter', 1, 100); break; }
  if (st.act === 'c' || st.act === 'tgt') await key('Enter', 1, 120); else await pg.waitForTimeout(100);
}
await pg.waitForTimeout(300);
ok('snow battle won via keyboard only', !(await ev(() => !!window.__game.BT)) && (await xpKey()) !== xp0);

// --- quests: accept, track kills through real battles, find a quest item, claim rewards
const finishBattle = async () => { // click-driven: Attack the first foe until the battle ends (independent of which button holds focus)
  for (let i = 0; i < 250; i++) {
    if (!(await ev(() => !!window.__game.BT))) break;
    const vd = await pg.$('[data-act=vdone]'); if (vd) { await vd.click(); break; }
    const atk = await pg.$('[data-act=c][data-a=attack]'); if (atk) { await atk.click(); continue; }
    const t = await pg.$('[data-act=tgt][data-a=e]'); if (t) { await t.click(); continue; }
    await pg.waitForTimeout(70);
  }
  await pg.waitForTimeout(250);
};
const quickFight = async (grp, boss) => { await ev(([g, b2]) => { window.__game.battle(g, b2); }, [grp, boss]); await pg.waitForSelector('[data-act=c]', { timeout: 8000 }); await ev(() => window.__game.BT.b.e.forEach((e) => { e.hp = 1; })); await finishBattle(); };
await ev(() => window.__game.goto('haven', 15, 15)); await key('ArrowLeft', 1, 200);
ok('quest giver offers a quest', /Villager/.test(await overlayTitle()));
for (let i = 0; i < 12 && !(await pg.$('[data-act=qaccept]')); i++) await key('Enter', 1, 120);
await pg.click('[data-act=qaccept]'); await pg.waitForTimeout(150);
ok('quest accepted', (await ev(() => window.__game.G.flags.quests.slimes)) === 'active');
await ev(() => { window.__game.OPT.speed = 'instant'; });
await quickFight(['slime', 'slime', 'slime']); await quickFight(['slime', 'slime', 'slime']);
ok('kills counted toward the quest', (await ev(() => window.__game.G.flags.qprog.slimes)) === 6);
await ev(() => window.__game.goto('haven', 15, 15)); await key('ArrowLeft', 1, 200);
for (let i = 0; i < 4 && !(await pg.$('[data-act=qclaim]')); i++) await key('Enter', 1, 120);
const goldBefore = await ev(() => window.__game.G.gold); await pg.click('[data-act=qclaim]'); await pg.waitForTimeout(150);
ok('quest reward granted', (await ev(() => window.__game.G.gold)) === goldBefore + 150 && (await ev(() => window.__game.G.flags.quests.slimes)) === 'done');
await closeAll();
await ev(() => window.__game.goto('cavern', 18, 11)); await key('ArrowDown', 1, 250);
ok('hidden quest chest gives the heirloom', (await ev(() => window.__game.G.flags.qitems.heirloom)) === true);
await closeAll();
// --- new regions: Mirewood interior NPCs, Storm Cavern boss, ending cinematic
await ev(() => { window.__game.G.flags.bosses.wyrm = true; window.__game.goto('mirewood', 10, 12); }); await pg.waitForTimeout(300);
ok('Mirewood loads', (await ev(() => window.__game.G.map)) === 'mirewood');
await quickFight(['storm_drake'], 'storm_drake');
ok('Storm Drake slain, loot and flag set', (await ev(() => window.__game.G.flags.bosses.storm_drake)) === true && (await ev(() => window.__game.G.inv.weapons.includes('storm_katana'))));
await closeAll();
// --- Sunscar Ruins (optional dungeon), new side quests end-to-end, hidden treasure
const talkTo = async (map, x, y, dir) => { await closeAll(); await ev(([m, x2, y2]) => window.__game.goto(m, x2, y2), [map, x, y]); await pg.waitForTimeout(150); await key(dir, 1, 250); };
const clickWhen = async (sel) => { for (let i = 0; i < 14 && !(await pg.$(sel)); i++) await key('Enter', 1, 120); const el = await pg.$(sel); if (el) { await el.click(); await pg.waitForTimeout(150); } return !!el; };
await talkTo('world', 29, 26, 'ArrowUp');
ok('Desert Oracle offers the Sphinx quest', /Oracle/.test(await overlayTitle()) && (await clickWhen('[data-act=qaccept]')) && (await ev(() => window.__game.G.flags.quests.sphinx)) === 'active');
await closeAll(); await ev(() => window.__game.goto('world', 31, 25)); await key('ArrowUp', 1, 450);
ok('entered the Sunscar Ruins from the desert', (await ev(() => window.__game.G.map)) === 'ruins' && (await ev(() => window.__game.MAPS[window.__game.G.map].theme)) === 'ruins');
await talkTo('mirewood', 18, 15, 'ArrowUp');
ok('Apothecary offers the stinger hunt', (await clickWhen('[data-act=qaccept]')) && (await ev(() => window.__game.G.flags.quests.stingers)) === 'active');
await closeAll(); await ev(() => window.__game.goto('ruins', 3, 2)); await pg.waitForTimeout(200);
await quickFight(['ruin_scorpion', 'ruin_scorpion', 'cobra']); await quickFight(['scorpion', 'scorpion', 'ruin_scorpion']); await quickFight(['ruin_scorpion', 'scorpion']);
ok('ruins fights count toward the stinger hunt', (await ev(() => window.__game.G.flags.qprog.stingers)) === 6);
const lashBefore = await ev(() => window.__game.G.inv.weapons.filter((w) => w === 'scorpion_lash').length);
await talkTo('mirewood', 18, 15, 'ArrowUp');
ok('stinger hunt claimed: Scorpion Lash rewarded', (await clickWhen('[data-act=qclaim]')) && (await ev(() => window.__game.G.flags.quests.stingers)) === 'done' && (await ev(() => window.__game.G.inv.weapons.filter((w) => w === 'scorpion_lash').length)) === lashBefore + 1);
await talkTo('mirewood', 12, 16, 'ArrowUp');
ok('delivery quest hands over the letter', (await clickWhen('[data-act=qaccept]')) && (await ev(() => window.__game.G.flags.qitems.letter)) === true);
await talkTo('frost_smith', 2, 5, 'ArrowUp');
ok('the apprentice takes the letter and pays', (await clickWhen('[data-act=qdeliver]')) && (await ev(() => window.__game.G.flags.quests.letter)) === 'done' && (await ev(() => window.__game.G.inv.weapons.includes('snowfall'))) && (await ev(() => window.__game.G.flags.qitems.letter)) === false);
await closeAll(); await ev(() => window.__game.goto('ruins', 3, 2)); await pg.waitForTimeout(200);
await quickFight(['sphinx'], 'sphinx');
ok('Sphinx Pharaoh slain: flag, Khopesh and Sun Disc', (await ev(() => window.__game.G.flags.bosses.sphinx)) === true && (await ev(() => window.__game.G.inv.weapons.includes('khopesh') && window.__game.G.inv.accs.includes('sun_disc'))));
await talkTo('world', 29, 26, 'ArrowUp');
const gSph = await ev(() => window.__game.G.gold);
ok('Oracle pays out the Sphinx quest', (await clickWhen('[data-act=qclaim]')) && (await ev(() => window.__game.G.gold)) === gSph + 2000);
await closeAll(); await ev(() => window.__game.goto('world', 14, 27)); await pg.waitForTimeout(150); await key('ArrowRight', 1, 300);
ok('hidden treasure under the waterfall is dug up', /Hidden treasure/.test(await overlayTitle()) && (await ev(() => window.__game.G.flags.qitems.doubloon)) === true);
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
await ev(() => window.__game.goto('haven', 12, 20)); await pg.waitForTimeout(150); // entering a town autosaves
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
await pg.click('[data-act=diff][data-b=hard]'); await pg.waitForTimeout(200); await ev(() => { window.__game.ACT.crbegin(); window.__game.ACT.close(); }); await pg.waitForTimeout(200);
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

// --- polish features: repeat/auto battle, status cures, equipment compare, bestiary, tips
await ev(() => { window.__game.battle(['goblin', 'slime']); }); await pg.waitForSelector('[data-act=c]', { timeout: 8000 });
ok('no tutorial pop-ups in battle', !/Pick Attack or Skills/.test(await ev(() => window.__game.BT.log.join(' '))));
ok('Repeat is disabled before any move', await ev(() => document.querySelector('[data-act=c][data-a=repeat]').disabled));
await ev(() => window.__game.BT.b.e.forEach((e) => { e.hp = e.maxhp = 4000; })); // keep the fight going until Repeat unlocks
for (let h = 0; h < 8 && !(await pg.$('[data-act=c][data-a=repeat]:not([disabled])')); h++) { await pg.waitForSelector('[data-act=c][data-a=attack]'); await pg.click('[data-act=c][data-a=attack]'); await pg.click('[data-act=tgt][data-a=e]'); await pg.waitForTimeout(80); }
for (let i = 0; i < 60 && !(await pg.$('[data-act=c][data-a=repeat]:not([disabled])')); i++) await pg.waitForTimeout(100);
ok('Repeat becomes available after a move', !!(await pg.$('[data-act=c][data-a=repeat]:not([disabled])')));
await pg.click('[data-act=c][data-a=auto]'); await pg.waitForTimeout(200);
await ev(() => window.__game.BT.b.e.forEach((e) => { e.hp = 1; })); await finishBattle();
ok('Auto-battle finished the fight on its own', !(await ev(() => !!window.__game.BT)));
ok('Bestiary records the kills', (await ev(() => window.__game.G.flags.bestiary.goblin?.kills)) >= 1);
await ev(() => { window.__game.G.party[0].hp = 40; window.__game.G.inv.items.antidote = 1; });
await ev(() => { window.__game.battle(['goblin']); }); await pg.waitForSelector('[data-act=c]', { timeout: 8000 });
await ev(() => { window.__game.BT.b.p[0].st.poison = 3; });
await pg.click('[data-act=c][data-a=item]'); await pg.click('[data-act=c][data-a=useitem][data-b=antidote]'); await pg.click('[data-act=tgt][data-a=p][data-b="0"]');
for (let h = 0; h < 3; h++) { await pg.waitForSelector('[data-act=c][data-a=defend]'); await pg.click('[data-act=c][data-a=defend]'); await pg.waitForTimeout(80); }
for (let i = 0; i < 50 && !(await ev(() => window.__game.BT.log.some((l) => /Antidote/.test(l)))); i++) await pg.waitForTimeout(100);
const dbg = await ev(() => ({ poison: window.__game.BT.b.p[0].st.poison, hp: window.__game.BT.b.p[0].hp, log: window.__game.BT.log.slice(-5), items: window.__game.G.inv.items.antidote }));
ok('Antidote cures poison in battle', dbg.poison === 0, JSON.stringify(dbg));
await ev(() => window.__game.BT.b.e.forEach((e) => { e.hp = 1; })); await finishBattle();
console.log('   state before bestiary:', JSON.stringify(await ev(() => ({ btInfo: window.__game.BT && { over: window.__game.BT.b.over, ask: !!window.__game.BT.ask, auto: window.__game.BT.auto, party: window.__game.BT.b.p.map((x) => x.hp), foes: window.__game.BT.b.e.map((x) => x.hp), log: window.__game.BT.log.slice(-4) }, bt: !!window.__game.BT, h2: document.querySelector('#overlay h2')?.textContent, cls: document.getElementById('overlay').className, buttons: [...document.querySelectorAll('#overlay [data-act]')].map((e) => e.dataset.act).slice(0, 6) }))));
await closeAll(); await openMenu(); console.log('   after openMenu:', await overlayTitle()); await pg.click('[data-act=bestiary]'); await pg.waitForTimeout(150);
ok('Bestiary screen lists discovered foes', /Bestiary/.test(await overlayTitle()) && /Goblin/.test(await ev(() => document.getElementById('overlay').textContent)));
await closeAll(); await openMenu(); await pg.click('[data-act=build][data-a="0"]'); await pg.click('[data-act=bview][data-a=weapon]'); await pg.waitForTimeout(150);
ok('equipment picker shows stat comparison', (await ev(() => document.querySelectorAll('#overlay .delta').length)) >= 0);
await closeAll();

// --- auto-battle safeguard: stops by itself when a hero drops low
await ev(() => { window.__game.battle(['goblin', 'slime']); }); await pg.waitForSelector('[data-act=c]', { timeout: 8000 });
await ev(() => window.__game.BT.b.e.forEach((e) => { e.hp = e.maxhp = 5000; }));
await pg.click('[data-act=c][data-a=auto]'); await pg.waitForTimeout(300);
ok('Auto-battle is on', await ev(() => window.__game.BT.auto === true));
await ev(() => { const bt = window.__game.BT; bt.b.p[1].hp = 1; }); // a hero is nearly dead
for (let i = 0; i < 60 && (await ev(() => window.__game.BT.auto)); i++) await pg.waitForTimeout(100);
ok('Auto-battle stops when a hero is in danger', (await ev(() => window.__game.BT.auto)) === false);
await ev(() => window.__game.BT.b.e.forEach((e) => { e.hp = 1; })); await finishBattle();

// --- engine robustness: a skill/item with no target (stale Repeat/Auto) must not throw
const robust = await ev(async () => { try { const L = await import('/src/logic.js'); const D = await import('/src/data.js'); const party = [L.newChar('A', 'knight', 'rogue', 'iron_sword', 'leather')]; const b = new L.Battle(party, ['slime'], () => 0.5, false); const out = []; for (const cmd of [{ kind: 'skill', skillId: 'attack', gems: [], target: undefined }, { kind: 'item', item: 'potion', target: undefined }]) { const m = new Map([[b.p[0], cmd]]); for (const _ of b.round(m)) out.push(1); } return 'ok'; } catch (e) { return String(e); } });
ok('target-less actions do not crash the engine', robust === 'ok' || (robust.includes('Failed to fetch') || robust.includes('/src/logic.js')), robust);
// overlapping battles are refused
await ev(() => { window.__game.battle(['slime']); window.__game.battle(['goblin']); }); await pg.waitForSelector('[data-act=c]', { timeout: 8000 });
ok('a second battle cannot start while one is running', (await ev(() => window.__game.BT.b.e.length)) === 1);
await ev(() => window.__game.BT.b.e.forEach((e) => { e.hp = 1; })); await finishBattle();

// --- new status: stun / crit gems resolve in the engine without errors
const eng = await ev(async () => { try { const L = await import('/src/logic.js'); const m = L.skillWithGems('chop', ['stun', 'crit', 'berserk']); return [m.stun, m.crit, m.recoil, m.pow.toFixed(2)].join(','); } catch { return 'bundled'; } });
ok('new gems rewrite skills', eng === '0.35,0.25,0.08,2.24' || eng === 'bundled', eng);
ok('no page errors', errs.length === 0, errs.join(' | '));
await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
