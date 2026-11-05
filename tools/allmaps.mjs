// Screenshot the spawn point of every map (phone size) into OUT/<id>.png: OUT=/dir/ node tools/allmaps.mjs  (needs: python3 -m http.server 8123)
import { createRequire } from 'module';
import fs from 'fs';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const OUT = process.env.OUT || '/tmp/allmaps/'; fs.mkdirSync(OUT, { recursive: true });
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 700 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto(`http://localhost:${process.env.PORT || 8123}/index.html`); await pg.waitForTimeout(500);
await pg.click('[data-act=new]'); await pg.click('[data-act=slotpick][data-a="1"]'); await pg.click('[data-act=diff][data-b=normal]'); await pg.waitForTimeout(200);
await pg.evaluate(() => { const g = window.__game; g.ACT.crbegin(); g.ACT.close(); g.testParty(); for (const m of Object.values(g.MAPS)) m.rate = 0; g.OPT.minimap = false; });
const ids = await pg.evaluate(() => Object.keys(window.__game.MAPS));
for (const id of ids) {
  await pg.evaluate((i) => { const el = document.getElementById('overlay'); el.className = ''; el.innerHTML = ''; const g = window.__game, m = g.MAPS[i]; g.G.flags.seen = {}; g.goto(i, m.spawn.x, m.spawn.y); }, id);
  await pg.waitForTimeout(id === 'world' ? 2200 : 700);
  await pg.evaluate(() => { const el = document.getElementById('overlay'); el.className = ''; el.innerHTML = ''; });
  await pg.waitForTimeout(150);
  await (await pg.$('canvas')).screenshot({ path: `${OUT}${id}.png` });
}
console.log(ids.length, 'maps', errs.join('\n') || 'no errors'); await b.close();
