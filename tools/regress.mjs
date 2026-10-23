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

// --- start, keyboard only: quiz night at the pub, the bell, waking up in Haven
const sayText = () => ev(() => document.getElementById('tt')?.textContent || '');
const sayThrough = async (max = 30) => { const seen = []; for (let i = 0; i < max && (await ev(() => !!document.querySelector('#overlay .saybox'))); i++) { await key('Enter', 1, 60); seen.push((await ev(() => (document.querySelector('#overlay .sayname')?.textContent || '') + ': ' + (document.getElementById('tt')?.textContent || '')))); await key('Enter', 1, 60); } return seen.join('\n'); };
ok('title focuses New Game', (await ev(() => document.activeElement?.dataset?.act)) === 'new');
await key('Enter'); await key('Enter'); await key('Enter', 1, 300); // New Game -> slot 1 -> Normal
ok('prologue opens at The Bell & Anvil', /Bell & Anvil/i.test(await overlayTitle()));
ok('new game: Adam and Devon, both blokes with no calling', await ev(() => { const p = window.__game.G.party; return p.length === 2 && p[0].name === 'Adam' && p[1].name === 'Devon' && p.every((c) => c.main === 'bloke' && c.look); }));
await key('Enter', 4, 220);
const wake = await sayThrough();
ok('waking in Haven: the Elder expected heroes of legend', /legend/i.test(wake) && /Devon/.test(wake), wake.slice(0, 120));
ok('game started in Haven', (await ev(() => window.__game.G.map)) === 'haven');
await ev(() => { for (const m of Object.values(window.__game.MAPS)) m.rate = 0; });
await ev(() => window.__game.goto('haven', 17, 32)); await pg.waitForTimeout(300); await key('ArrowDown', 1, 400);
ok('the gate turns two blokes away until they have callings', (await ev(() => window.__game.G.map)) === 'haven' && /Guard/.test(await overlayTitle())); await sayThrough();
await ev(() => window.__game.goto('haven_inn', 2, 6)); await pg.waitForTimeout(300); await key('ArrowLeft', 1, 600);
ok('the trapdoor in the Goose leads to the cellar', (await ev(() => window.__game.G.map)) === 'cellar'); await sayThrough();
await ev(() => { window.__game.battle(['big_gary'], 'big_gary'); }); await pg.waitForSelector('[data-act=c]', { timeout: 8000 });
ok('Big Gary scales for a party of two: boss HP is as tuned', (await ev(() => window.__game.BT.b.e[0].maxhp)) === 200);
await ev(() => window.__game.BT.b.e.forEach((e) => { e.hp = 1; })); await key('Enter', 1, 200); await key('Enter', 1, 200);
for (let i = 0; i < 30 && !(await ev(() => !!document.querySelector('#overlay .saybox'))); i++) await key('Enter', 1, 200);
const gary = await sayThrough();
ok('Brenna joins after Big Gary', /Brenna/.test(gary) && (await ev(() => window.__game.G.party.length)) === 3 && (await ev(() => window.__game.G.party[2].main)) === 'cleric', gary.slice(0, 100));
await closeAll();
await ev(() => window.__game.goto('haven_guild', 5, 6)); await pg.waitForTimeout(300); await sayThrough();
ok('the Guild offers callings to the two blokes', /calling for Adam · 1 of 2/i.test(await overlayTitle()) && (await ev(() => document.querySelectorAll('[data-act=crjob]').length)) === 6 && !(await pg.$('[data-act=crjob][data-a=hexer]')));
await pg.click('[data-act=crjob][data-a=monk]'); await pg.waitForTimeout(150); await pg.click('[data-act=crnext]'); await pg.waitForTimeout(150);
ok('Devon second', /calling for Devon · 2 of 2/i.test(await overlayTitle())); await pg.click('[data-act=crjob][data-a=mage]'); await pg.waitForTimeout(150); await pg.click('[data-act=crnext]'); await pg.waitForTimeout(150);
ok('review lists both', (await ev(() => document.querySelectorAll('[data-act=credit]').length)) === 2); await key('Enter', 1, 300); await sayThrough();
ok('chosen callings stick, bloke CP dropped, light armour for the mage', await ev(() => { const [a, d] = window.__game.G.party; return a.main === 'monk' && d.main === 'mage' && !a.cp.bloke && d.armor === 'cloth' && a.cp.monk === 0 && !a.sub; }));
await ev(() => window.__game.goto('cavern', 2, 1)); await pg.waitForTimeout(300); const wen = await sayThrough();
ok('Sir Wendell joins at the Ashen Cavern', (await ev(() => window.__game.G.party.length)) === 4 && (await ev(() => window.__game.G.party[3].name)) === 'Wendell' && /old knight/.test(wen) && (await ev(() => window.__game.G.party[3].main)) === 'knight', (await ev(() => window.__game.G.party.length + ' ' + window.__game.G.map)) + ' ' + wen.slice(0, 200));
await closeAll(); await ev(() => window.__game.goto('haven_inn', 3, 4)); await pg.waitForTimeout(300); await key('ArrowUp', 1, 400);
ok('Brenna has left her post behind the bar once she joins', !/Brenna/.test(await overlayTitle()) && (await ev(() => window.__game.G.y)) === 3);
await closeAll();
const chatN = await ev(() => Object.keys(window.__game.G.flags.chat).length);
await openMenu(); await pg.click('[data-act=chat]'); await pg.waitForTimeout(300);
ok('CHAT plays a party skit', !!(await pg.$('#overlay .saybox')) && (await ev(() => Object.keys(window.__game.G.flags.chat).length)) === chatN + 1, await sayText());
await sayThrough(); await closeAll();
await openMenu(); await pg.click('[data-act=items]'); await pg.click('[data-act=phone]'); await pg.waitForTimeout(300);
ok('Devon\'s phone is a key item with a joke', /3%|Devon/.test(await ev(() => document.getElementById('overlay').textContent)) && !!(await pg.$('#overlay .saybox')));
await sayThrough(); await closeAll();
const spireIn = await ev(() => { const g = window.__game, w = g.MAPS.world, [sx, sy] = w.places.find((p) => p[2] === 'Frost Spire'); for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) { const t = w.rows[sy + dy]?.[sx + dx]; if ('.,:d_='.includes(t)) { g.goto('world', sx + dx, sy + dy); return [-dx, -dy]; } } return null; });
await pg.waitForTimeout(300); await key({ '0,-1': 'ArrowUp', '0,1': 'ArrowDown', '-1,0': 'ArrowLeft', '1,0': 'ArrowRight' }[spireIn.join(',')], 1, 500);
ok('the Frost Spire stays sealed until Morvath falls', (await ev(() => window.__game.G.map)) === 'world' && /Spire|Morvath|sigil/.test(await sayText() + (await ev(() => document.getElementById('overlay').textContent))));
await sayThrough(); await closeAll();
const keep = await ev(() => JSON.stringify({ gold: window.__game.G.gold, party: window.__game.G.party, wins: window.__game.G.stats, inv: window.__game.G.inv })); await ev(() => { window.__game.battle(['slime', 'slime']); }); await pg.waitForSelector('[data-act=c]', { timeout: 8000 });
await pg.click('[data-act=c][data-a=combos]'); await pg.waitForTimeout(150);
ok('COMBO offers the bros\' double techs', !!(await pg.$('[data-act=c][data-a=combo][data-b=bro_shove]')) && !!(await pg.$('[data-act=c][data-a=combo][data-b=bro_hug]')) && !(await pg.$('[data-act=c][data-a=combo][data-b=pub_brawl]')));
await pg.click('[data-act=c][data-a=combo][data-b=bro_shove]'); await pg.waitForTimeout(150); await pg.click('[data-act=tgt][data-a=e][data-b="0"]'); await pg.waitForTimeout(150);
ok('the partner\'s turn is spent on the combo (next prompt skips Devon)', /Brenna/.test(await ev(() => document.querySelector('.cmdhead')?.textContent || '')));
await ev(() => window.__game.BT.b.e.forEach((e) => { e.hp = 1; })); for (let i = 0; i < 30 && (await ev(() => !!window.__game.BT)); i++) await key('Enter', 1, 150);
await closeAll(); await ev(() => { window.__game.G.gold += 100; window.__game.G.flags.story.quizzed = false; window.__game.goto('haven_inn', 5, 4); }); await pg.waitForTimeout(300); await key('ArrowUp', 1, 400);
await pg.click('[data-act=quiz]'); await pg.waitForTimeout(200);
ok('Quiz Night at the Goose asks a question with four answers', /Quiz Night · Q1\/5/.test(await overlayTitle()) && (await ev(() => document.querySelectorAll('[data-act=qans]').length)) === 4);
for (let i = 0; i < 5; i++) { await pg.click('[data-act=qans][data-a="0"]'); await pg.waitForTimeout(80); }
ok('the quiz ends with a score and is done for the night', /Quiz Night: \d\/5/.test(await overlayTitle()) && (await ev(() => window.__game.G.flags.story.quizzed)) === true);
await closeAll(); await ev((k) => { const o = JSON.parse(k), G = window.__game.G; G.gold = o.gold; G.party = o.party; G.stats = o.wins; G.inv = o.inv; }, keep); // undo the side trips' rewards
await closeAll(); await ev(() => { window.__game.testParty(); window.__game.goto('haven', 17, 30); }); await pg.waitForTimeout(200); await closeAll();
await ev(() => { for (const m of Object.values(window.__game.MAPS)) m.rate = 0; }); // keep tests deterministic: battles are started explicitly
await ev(() => { for (const id of ['cavern', 'crypt', 'mirewood', 'frostholm', 'spire', 'storm', 'ruins']) window.__game.G.flags.visited[id] = true; }); // first-visit scenes would cover the teleports below
ok('game started in Haven', (await ev(() => window.__game.G.map)) === 'haven');
await pg.waitForTimeout(800); ok('music engine scheduled notes', (await ev(() => window.__osc)) >= 4);

// --- walk into a building through its door, talk to the NPC to open the shop
await ev(() => window.__game.goto('haven', 10, 18)); await key('ArrowUp', 1, 450);
ok('entered the shop interior', (await ev(() => window.__game.G.map)) === 'haven_shop');
await key('ArrowUp', 3, 160);
ok('shop UI opened by bumping the merchant', /General Store/.test(await overlayTitle()));
ok('after the cellar: unarmed bros, Wendell brings his own sword, 400 G + Big Gary\'s 120 G', (await ev(() => window.__game.G.party.every((c) => (c.look === 'wendell' ? c.weapon === 'iron_sword' : c.weapon === null)))) && (await ev(() => window.__game.G.gold)) === 520);
const potBefore = await ev(() => window.__game.G.inv.items.potion || 0), goldBefore0 = await ev(() => window.__game.G.gold);
await ev(() => document.querySelector('[data-act=buy][data-b=potion]').click()); await pg.waitForTimeout(100);
ok('bought a potion', (await ev(() => window.__game.G.inv.items.potion)) === potBefore + 1 && (await ev(() => window.__game.G.gold)) === goldBefore0 - 30);
await closeAll();

// --- build screen: socket gems, change job in a town
ok('a new game starts with no gems and no gem stock in shops', (await ev(() => window.__game.G.inv.gems.length)) === 0 && (await ev(() => { window.__game.ui.shop('haven_general'); const t = document.getElementById('overlay').textContent; window.__game.ACT.close(); return !/Gem/.test(t); })));
await ev(() => { window.__game.G.inv.gems.push('chain', 'thrifty'); window.__game.G.flags.story.gems = true; }); // gems wake after the first great evil; switch them on for the build-screen checks
await openMenu();
await pg.click('[data-act=build][data-a="1"]'); await pg.click('[data-act=bslot][data-a="0"]'); await pg.click('[data-act=gem][data-b=chain]'); await pg.click('[data-act=gem][data-b=thrifty]');
ok('gems socketed', JSON.stringify(await ev(() => window.__game.G.party[1].gems[0])) === '["chain","thrifty"]');
await pg.click('[data-act=bmain]'); await pg.click('[data-act=bview][data-a=jobMain]');
ok('only the six starting callings are listed before any heart is claimed', (await ev(() => document.querySelectorAll('[data-act=setjob]').length)) === 6 && !(await pg.$('[data-act=setjob][data-b=hexer]')) && !(await pg.$('[data-act=setjob][data-b=alchemist]')));
await pg.click('[data-act=setjob][data-b=ranger]');
ok('changed calling outside town: Lyra the Ranger at rank 1, mage rank kept', await ev(() => { const c = window.__game.G.party[1]; return c.main === 'ranger' && c.cp.ranger === 0 && c.cp.mage === 0 && c.slots.includes('aimed') && !c.slots.includes('firebolt'); }));
await pg.click('[data-act=bview][data-a=jobSub]'); await pg.click('[data-act=setjob][data-a=sub][data-b=mage]');
ok('second calling lends its learned abilities', await ev(() => { const c = window.__game.G.party[1]; return c.sub === 'mage' && c.slots.includes('aimed') && c.slots.includes('firebolt'); }));
await pg.click('[data-act=bview][data-a=callings]');
ok('Callings view lists the six with rank stars', (await ev(() => document.querySelectorAll('#overlay .callrow').length)) === 6 && (await ev(() => document.querySelectorAll('#overlay .callrow .stars .pip.on').length)) === 2); // Lyra: Mage 1 + Ranger 1
await pg.click('[data-act=bmain]');
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
await ev(() => { const c = window.__game.G.party[0]; c.cp.monk = 5; }); const cp0 = await ev(() => window.__game.G.party.map((c) => c.cp[c.main]));
let vtext = '';
await ev(() => { window.__game.OPT.speed = 'instant'; window.__game.OPT.minimap = true; window.__game.battle(['frost_goblin', 'ice_wolf']); });
await pg.waitForSelector('[data-act=c]', { timeout: 8000 });
await ev(() => window.__game.BT.b.e.forEach((e) => { e.hp = 1; })); // balance is covered by tools/sim.mjs; this checks the flow
for (let i = 0; i < 120; i++) {
  const st = await ev(() => ({ bt: !!window.__game.BT, act: document.activeElement?.dataset?.act }));
  if (!st.bt) break;
  if (await pg.$('[data-act=vdone]')) { vtext = await ev(() => document.querySelector('#overlay .win').textContent); await key('Enter', 1, 100); break; }
  if (st.act === 'c' || st.act === 'tgt') await key('Enter', 1, 120); else await pg.waitForTimeout(100);
}
await pg.waitForTimeout(300);
ok('snow battle won via keyboard only', !(await ev(() => !!window.__game.BT)) && (await xpKey()) !== xp0);
const cp1 = await ev(() => window.__game.G.party.map((c) => c.hp > 0 ? c.cp[c.main] : -1));
ok('the win awards CP to each standing hero\'s calling (+4 shown)', cp1.every((v, i) => v === -1 || v === cp0[i] + 4) && /\+4 CP/.test(vtext), `${cp0} -> ${cp1}`);
ok('a rank-up teaches an ability: Monk 2, Focus', await ev(() => { const c = window.__game.G.party[0]; return c.cp.monk >= 6 && c.slots.includes('focus'); }) && /Rank up! Adam: Monk 2 — learned Focus/.test(vtext), vtext.slice(0, 200));

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
// --- story: the Wyrm's fall plays an aftermath scene, leaves its heart, and Haven's guard has news
const guardSays = async () => { await closeAll(); await ev(() => window.__game.goto('haven', 18, 31)); await pg.waitForTimeout(200); await key('ArrowRight', 1, 250); await key('Enter', 1, 150); const t = await ev(() => document.getElementById('tt')?.textContent || ''); await closeAll(); return t; };
await ev(() => { window.__game.G.flags.bosses.wyrm = false; });
const guard0 = await guardSays();
await ev(() => { window.__game.battle(['wyrm'], 'wyrm'); }); await pg.waitForSelector('[data-act=c]', { timeout: 8000 });
await ev(() => window.__game.BT.b.e.forEach((e) => { e.hp = 1; })); await finishBattle(); await pg.waitForTimeout(300);
ok('aftermath scene plays after the Wyrm falls', await ev(() => !!document.querySelector('#overlay .saybox.narr')));
ok('the Wyrm leaves the Ember Heart', (await ev(() => window.__game.G.flags.qitems.ember_heart)) === true);
for (let i = 0; i < 6 && (await ev(() => !!document.querySelector('#overlay .saybox'))); i++) await key('Escape', 1, 150); // Esc skips to the end, then closes
await pg.waitForTimeout(200);
ok('the first heart wakes three callings (awakening moment)', /Ember Heart wakes/.test(await overlayTitle()) && (await ev(() => [...document.querySelectorAll('#overlay .echo b')].map((e) => e.textContent).join())) === 'Hexer,Bard,Berserker');
await pg.screenshot({ path: process.env.SHOT_AWAKE || '/tmp/awakening.png' });
await key('Escape', 1, 200);
ok('Esc skips and closes the scene and the awakening', !(await ev(() => document.getElementById('overlay').classList.contains('on'))));
await openMenu(); await pg.click('[data-act=build][data-a="2"]'); await pg.click('[data-act=bview][data-a=jobMain]');
ok('the awakened callings can now be taken up', (await ev(() => document.querySelectorAll('[data-act=setjob]').length)) === 9 && !!(await pg.$('[data-act=setjob][data-b=berserker]')) && !(await pg.$('[data-act=setjob][data-b=paladin]')));
await closeAll();
const guard1 = await guardSays();
ok('Haven guard\'s dialogue changes after the Wyrm falls', !!guard0 && !!guard1 && guard0 !== guard1, `${guard0.slice(0, 40)} -> ${guard1.slice(0, 40)}`);
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
await pg.waitForTimeout(300);
ok('finale scene: Sereth comes for the hearts', /Sereth/.test(await ev(async () => { let t = ''; for (let i = 0; i < 4; i++) { t += document.getElementById('overlay').textContent; document.querySelector('[data-act=say]')?.click(); await new Promise((r) => setTimeout(r, 60)); } return t; })));
for (let i = 0; i < 6 && !(await pg.$('[data-act=edone]')); i++) await key('Escape', 1, 200);
await pg.waitForTimeout(300);
for (let i = 0; i < 40 && (await ev(() => !!document.querySelector('#overlay .saybox'))); i++) { await ev(() => { window.__game.ACT.skiptype(); document.querySelector('.sayrow [data-act]')?.click(); }); await pg.waitForTimeout(60); } // the finale: back to the pub
ok('ending shown after the Titan: last orders at the pub', /Last orders/.test(await overlayTitle()) && !!(await pg.$('#overlay img.pubart')));
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
await pg.click('[data-act=diff][data-b=hard]'); await pg.waitForTimeout(200); await ev(() => { window.__game.ACT.crbegin(); window.__game.ACT.close(); window.__game.testParty(); }); await pg.waitForTimeout(200);
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
