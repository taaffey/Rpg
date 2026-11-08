// Screenshot every main screen at phone, landscape and desktop sizes: OUT=/dir/ node tools/screens.mjs  (needs: python3 -m http.server 8123)
// Seeds a mid-game save (full party, gear, bestiary, bosses slain, NG+1 chip) so the screens show realistic content.
import { createRequire } from 'module';
import fs from 'fs';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const OUT = process.env.OUT || '/tmp/screens/'; fs.mkdirSync(OUT, { recursive: true });
const VIEWS = { p: { w: 390, h: 844, dpr: 2, touch: true }, l: { w: 844, h: 390, dpr: 2, touch: true }, d: { w: 1280, h: 800, dpr: 1, touch: false } };
const only = (process.env.VIEWS || 'pld').split('');
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const URL_ = process.env.URL || `http://localhost:${process.env.PORT || 8123}/index.html`;
const errs = [];
for (const v of only) {
  const V = VIEWS[v];
  const ctx = await b.newContext({ viewport: { width: V.w, height: V.h }, deviceScaleFactor: V.dpr, hasTouch: V.touch, isMobile: V.touch });
  const pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(`${v}: ${e.message}`)); pg.on('console', (m) => m.type() === 'error' && !/fonts|ERR_|Failed to load/.test(m.text()) && errs.push(`${v}: ${m.text()}`));
  const shot = async (name) => { await pg.waitForTimeout(260); const t0 = Date.now(); await pg.screenshot({ path: `${OUT}${v}-${name}.png` }); console.log(v, name, Date.now() - t0, 'ms'); };
  const ev = (f, a) => pg.evaluate(f, a);
  await pg.goto(URL_); await pg.waitForTimeout(500);
  await shot('01-title');
  await pg.click('[data-act=opts]'); await shot('02-options-title'); await ev(() => window.__game.ACT.optback?.());
  await pg.waitForTimeout(150); await pg.click('[data-act=new]'); await shot('03-slots-new');
  await pg.click('[data-act=slotpick][data-a="1"]'); await shot('04-difficulty');
  await pg.click('[data-act=diff][data-b=normal]'); await pg.waitForTimeout(250);
  await ev(() => { window.__game.ACT.crbegin(); window.__game.ACT.close(); window.__game.testParty(); });
  // seed a mid-game state
  await ev(async () => {
    const g = window.__game, G = g.G, D = await import('/src/data.js');
    G.party.forEach((c, i) => { c.level = 22 + i; c.exp = 0; });
    G.gold = 3240; G.playtime = 5 * 3600 + 1234; G.stats = { wins: 143 }; G.ngp = 1; G.slot = 1;
    const ids = (o, n) => Object.keys(o).slice(0, n);
    G.inv.weapons.push(...ids(D.WEAPONS, 14)); G.inv.armors.push(...ids(D.ARMORS, 8)); G.inv.accs.push(...ids(D.ACCS, 6)); G.inv.gems.push(...ids(D.GEMS, 8));
    for (const k of Object.keys(D.ITEMS).slice(0, 8)) G.inv.items[k] = 3;
    Object.assign(G.flags.story, { woke: true, cellar: true, called: true, wendell: true, brenna: true, buspass: true });
    Object.assign(G.flags.bosses, { big_gary: true, wyrm: true, lich: true });
    G.flags.qitems.ember_heart = true; G.flags.qitems.grave_heart = true;
    Object.keys(D.ENEMIES).slice(0, 70).forEach((id, i) => { G.flags.bestiary[id] = { seen: 1, kills: i % 5 === 4 ? 0 : 1 + (i % 9) }; });
    for (const m of Object.values(g.MAPS)) m.rate = 0;
    G.flags.visited.haven = G.flags.visited.frostholm = G.flags.visited.mirewood = true;
    g.ui.mainMenu(); g.ACT.save();
  });
  if (process.env.UISIZE) await ev((u) => { window.__game.OPT.ui = u; document.documentElement.style.setProperty('--ui-zoom', { normal: 1, large: 1.2, huge: 1.4 }[u]); }, process.env.UISIZE); // UISIZE=large|huge: audit Options > Menu size
  await ev(() => { const el = document.getElementById('overlay'); el.className = ''; el.innerHTML = ''; });
  await ev(() => { const g = window.__game; g.goto('haven', ...g.MAPS.haven.spots.green); }); await pg.waitForTimeout(900); await shot('05-town');
  await ev(() => window.__game.ui.mainMenu()); await shot('06-menu');
  for (const [n, f] of [
    ['07-items', () => window.__game.ACT.items()], ['08-bestiary', () => window.__game.ACT.bestiary()], ['09-journal', () => window.__game.ACT.journal()],
    ['10-options', () => window.__game.ACT.opts()], ['10b-backup', () => { window.__game.ACT.backup(); }], ['10c-restore', () => window.__game.ACT.restore()], ['10d-feats', () => window.__game.ACT.feats()], ['11-chat', () => { window.__game.ACT.chat(); }],
  ]) { await ev(f); await shot(n); if (n === '08-bestiary') { await ev(() => { const o = document.getElementById('overlay'); o.scrollTop = o.scrollHeight; for (const e of o.querySelectorAll('*')) if (e.scrollHeight > e.clientHeight + 20) e.scrollTop = e.scrollHeight; }); await shot('08b-bestiary-bottom'); } await pg.keyboard.press('Escape'); await pg.waitForTimeout(120); await ev(() => { const el = document.getElementById('overlay'); el.className = ''; el.innerHTML = ''; }); }
  await ev(() => window.__game.ACT.build(0)); await shot('12-hero');
  for (const [n, view] of [['13-hero-weapon', 'weapon'], ['14-hero-trait', 'trait'], ['15-hero-callings', 'callings'], ['16-hero-skill-slot', 'slot'], ['17-hero-job', 'jobMain']]) { await ev((vw) => window.__game.ACT.bview(vw), view); await shot(n); }
  await ev(() => { const el = document.getElementById('overlay'); el.className = ''; el.innerHTML = ''; });
  await ev(() => window.__game.ui.shop('haven_smith')); await shot('18-shop');
  await ev(() => window.__game.ui.shop('haven_general')); await shot('19-shop-general');
  await ev(() => window.__game.ui.inn({ name: 'Innkeeper', cost: 20 })); await shot('20-inn');
  await ev(() => window.__game.ui.guild()); await shot('21-guild');
  await ev(() => window.__game.ui.socketer()); await shot('22-socketer');
  await ev(() => { const el = document.getElementById('overlay'); el.className = ''; el.innerHTML = ''; });
  // map screen on the overworld + overworld view
  await ev(() => { const g = window.__game; g.goto('world', ...g.MAPS.world.spawn ? [g.MAPS.world.spawn.x, g.MAPS.world.spawn.y] : [60, 70]); }); await pg.waitForTimeout(1800); await shot('23-world');
  await ev(() => window.__game.ACT.mapscreen()); await pg.waitForTimeout(600); await shot('24-mapscreen');
  await ev(() => window.__game.ACT.close()); await ev(() => { const el = document.getElementById('overlay'); el.className = ''; el.innerHTML = ''; });
  // a battle: root, skills, target, items
  await ev(() => { window.__game.battle(['goblin', 'goblin', 'bat']); }); await pg.waitForTimeout(2400);
  await shot('25-battle-start'); await ev(() => window.__game.ACT.c('skills')); await shot('26-battle-skills');
  await ev(() => window.__game.ACT.c('attack')); await shot('27-battle-target');
  await ev(() => window.__game.ACT.c('root')); await ev(() => window.__game.ACT.c('item')); await shot('28-battle-items');
  await ev(() => window.__game.ACT.c('root'));
  for (let i = 0; i < 40; i++) { await ev(() => window.__game.BT?.ask && window.__game.ACT.c('auto')); await pg.waitForTimeout(700); if (await ev(() => !!document.querySelector('[data-act=vdone]'))) break; }
  await shot('29-victory');
  await ev(() => { const el = document.getElementById('overlay'); el.className = ''; el.innerHTML = ''; });
  // the ending card (with the NG+ button)
  await ev(() => { window.__game.G.flags.bosses = { big_gary: true }; window.__game.ending(); }); await pg.waitForTimeout(600); await shot('30-finale');
  for (let i = 0; i < 60 && !(await ev(() => !!document.querySelector('[data-act=edone]'))); i++) { await pg.keyboard.press('Enter'); await pg.waitForTimeout(120); }
  await shot('30b-credits'); await ev(() => { const o = document.getElementById('overlay'); for (const e of [o, ...o.querySelectorAll('*')]) if (e.scrollHeight > e.clientHeight + 20) e.scrollTop = e.scrollHeight; }); await shot('30c-credits-end');
  await ev(() => window.__game.ui.title()); await pg.waitForTimeout(300);
  await ev(() => window.__game.ACT.cont()); await shot('31-slots-continue');
  await ctx.close();
}
console.log(errs.join('\n') || 'no console errors'); await b.close();
