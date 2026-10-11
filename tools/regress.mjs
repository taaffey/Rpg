// Browser regression: node tools/regress.mjs  (needs: python3 -m http.server 8123 running, Playwright installed)
import { createRequire } from 'module';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const pg = await b.newPage({ viewport: { width: 700, height: 900 } });
const errs = []; pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => ['error', 'warning'].includes(m.type()) && !/fonts|ERR_|Failed to load/.test(m.text()) && errs.push(m.text()));
let fails = 0; const ok = (name, cond, extra = '') => { console.log(cond ? 'PASS' : 'FAIL', name, extra); if (!cond) fails++; };
await pg.addInitScript(() => { window.__osc = 0; const oc = AudioContext.prototype.createOscillator; AudioContext.prototype.createOscillator = function () { const o = oc.call(this); const st = o.start.bind(o); o.start = (t) => { window.__osc++; return st(t); }; return o; }; });
await pg.goto('http://localhost:8123/index.html'); await pg.waitForTimeout(300);
const ev = (f, a) => pg.evaluate(f, a);
const key = async (k, n = 1, d = 90) => { for (let i = 0; i < n; i++) { await pg.keyboard.press(k); await pg.waitForTimeout(d); } };
const closeAll = async () => { for (let i = 0; i < 8 && (await ev(() => document.getElementById('overlay').classList.contains('on'))); i++) await key('Escape', 1, 70); };
const openMenu = async () => { await closeAll(); await key('Escape', 1, 120); };
const overlayTitle = () => ev(() => document.querySelector('#overlay h2')?.textContent || '');

// --- start, keyboard only
ok('title focuses New Game', (await ev(() => document.activeElement?.dataset?.act)) === 'new');
await key('Enter'); await key('Enter', 1, 400);
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
await pg.reload(); await pg.waitForTimeout(400);
ok('continue available after reload', !(await ev(() => document.querySelector('[data-act=cont]').disabled)));
await pg.click('[data-act=cont]'); await pg.waitForTimeout(300);
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

// --- new status: stun / crit gems resolve in the engine without errors
const eng = await ev(async () => { const L = await import('/src/logic.js'); const m = L.skillWithGems('chop', ['stun', 'crit', 'berserk']); return [m.stun, m.crit, m.recoil, m.pow.toFixed(2)].join(','); });
ok('new gems rewrite skills', eng === '0.35,0.25,0.08,2.24', eng);
ok('no page errors', errs.length === 0, errs.join(' | '));
await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
