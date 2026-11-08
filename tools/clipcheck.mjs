// Clipped-text check: visits the main screens and battle menus at small phone sizes and fails if any text is cut off (an element with overflow hidden
// whose content is wider than its box). UISIZE=large|huge checks Options > Menu size too.  node tools/clipcheck.mjs  (needs the dev server on 8123)
import { createRequire } from 'module';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const VIEWS = { 'SE portrait': [375, 667], 'SE landscape': [667, 375], 'iPhone 14': [390, 844] };
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const UISIZE = process.env.UISIZE || '', URL_ = process.env.URL || `http://localhost:${process.env.PORT || 8123}/index.html`;
const seen = new Map();
for (const [vk, V] of Object.entries(VIEWS)) {
  const ctx = await b.newContext({ viewport: { width: V[0], height: V[1] }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto(URL_); await pg.waitForTimeout(400);
  await pg.click('[data-act=new]'); await pg.click('[data-act=slotpick][data-a="1"]'); await pg.click('[data-act=diff][data-b=normal]'); await pg.waitForTimeout(250);
  await pg.evaluate(async () => {
    const g = window.__game, G = g.G, D = await import('/src/data.js');
    g.ACT.crbegin(); g.ACT.close(); g.testParty(); G.party.forEach((c, i) => { c.level = 22 + i; c.exp = 0; }); G.gold = 3240; G.stats = { wins: 143 }; G.slot = 1;
    const ids = (o, n) => Object.keys(o).slice(0, n);
    G.inv.weapons.push(...ids(D.WEAPONS, 14)); G.inv.armors.push(...ids(D.ARMORS, 8)); G.inv.accs.push(...ids(D.ACCS, 6)); G.inv.gems.push(...ids(D.GEMS, 8));
    for (const k of Object.keys(D.ITEMS).slice(0, 10)) G.inv.items[k] = 3;
    Object.assign(G.flags.bosses, { big_gary: true, wyrm: true, lich: true }); G.flags.qitems.ember_heart = true;
    Object.keys(D.ENEMIES).slice(0, 80).forEach((id, i) => { G.flags.bestiary[id] = { seen: 1, kills: i % 5 === 4 ? 0 : 1 + (i % 9) }; });
    for (const m of Object.values(g.MAPS)) m.rate = 0; g.OPT.speed = 'instant';
    g.goto('haven', ...g.MAPS.haven.spots.green);
  });
  if (UISIZE) await pg.evaluate((u) => { window.__game.OPT.ui = u; document.documentElement.style.setProperty('--ui-zoom', { normal: 1, large: 1.2, huge: 1.4 }[u]); }, UISIZE);
  await pg.waitForTimeout(900);
  const scan = async (label) => {
    await pg.waitForTimeout(250);
    const hits = await pg.evaluate(() => {
      const out = []; for (const el of document.querySelectorAll('#overlay *, #hud *, #topbar *')) {
        if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
        const cs = getComputedStyle(el); if (!(cs.overflow === 'hidden' || cs.overflowX === 'hidden')) continue;
        if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && (el.textContent || '').trim().length > 2) out.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} "${(el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)}" ${el.clientWidth}/${el.scrollWidth}${cs.textOverflow === 'ellipsis' ? ' (ellipsis)' : ''}`);
      } return out;
    });
    for (const h of hits) { const k = `${label} | ${h}`; if (!seen.has(k)) seen.set(k, vk); }
  };
  const clear = () => pg.evaluate(() => { const el = document.getElementById('overlay'); el.className = ''; el.innerHTML = ''; });
  const steps = [
    ['main menu', () => window.__game.ui.mainMenu()], ['items', () => window.__game.ACT.items()], ['bestiary', () => window.__game.ACT.bestiary()], ['journal', () => window.__game.ACT.journal()],
    ['options', () => window.__game.ACT.opts()], ['feats', () => window.__game.ACT.feats()], ['hero build', () => window.__game.ACT.build(0)], ['hero build 2', () => window.__game.ACT.build(1)],
    ['shop smith', () => window.__game.ui.shop('haven_smith')], ['shop general', () => window.__game.ui.shop('haven_general')], ['inn', () => window.__game.ui.inn({ name: 'Innkeeper', cost: 20 })], ['guild', () => window.__game.ui.guild()], ['socketer', () => window.__game.ui.socketer()],
  ];
  for (const [label, f] of steps) { await pg.evaluate(f); await scan(`${label}`); await clear(); await pg.evaluate(() => window.__game.ui.mainMenu()); await pg.waitForTimeout(80); await clear(); }
  // build sub-views
  await pg.evaluate(() => window.__game.ACT.build(0));
  for (const vw of ['weapon', 'trait', 'callings', 'slot', 'jobMain']) { await pg.evaluate((v) => window.__game.ACT.bview(v), vw); await scan(`build/${vw}`); }
  await clear();
  // battle: root, skills, items, targets
  await pg.evaluate(() => { window.__game.battle(['goblin', 'goblin', 'bat']); }); await pg.waitForFunction(() => window.__game.BT?.ask?.stage === 'root', null, { timeout: 20000 });
  await scan('battle root'); for (const st of ['skills', 'item', 'attack']) { await pg.evaluate((s) => window.__game.ACT.c(s), st); await scan(`battle ${st}`); await pg.evaluate(() => window.__game.ACT.c('root')); }
  if (errs.length) { console.log(vk, 'page errors:', errs.join('|')); seen.set(`page error ${errs[0]}`, vk); }
  await ctx.close();
}
const rows = [...seen.entries()].map(([k, v]) => `${k}   [${v}]`);
console.log(rows.length ? rows.join('\n') : 'no clipped text found'); await b.close(); process.exit(rows.length ? 1 : 0);
