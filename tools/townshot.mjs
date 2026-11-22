// Whole-town overview images: OUT=/dir/ node tools/townshot.mjs [haven,frostholm,...]  (needs: python3 -m http.server 8123)
// Sets S.viewAll so the canvas shows the entire map, then saves the canvas as <id>.png at 1 art px per screen px.
import { createRequire } from 'module';
import fs from 'fs';
const pw = createRequire('/opt/node22/lib/node_modules/')('playwright');
const OUT = process.env.OUT || '/tmp/townshot/'; fs.mkdirSync(OUT, { recursive: true });
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' });
const pg = await b.newPage({ viewport: { width: 900, height: 900 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto(`http://localhost:${process.env.PORT || 8123}/index.html`); await pg.waitForTimeout(400);
await pg.click('[data-act=new]'); await pg.click('[data-act=slotpick][data-a="1"]'); await pg.click('[data-act=diff][data-b=normal]'); await pg.waitForTimeout(200);
await pg.evaluate(() => { const g = window.__game; g.ACT.crbegin(); g.ACT.close(); g.testParty(); for (const m of Object.values(g.MAPS)) m.rate = 0; g.OPT.minimap = false; });
const ids = (process.argv[2] || 'haven,frostholm,mirewood,hopsend,kilnhaven').split(',');
for (const id of ids) {
  const url = await pg.evaluate(async (id) => { const g = window.__game; g.S.viewAll = true; const m = g.MAPS[id]; g.goto(id, m.spawn.x, m.spawn.y); g.ACT.close?.(); await new Promise((r) => setTimeout(r, 1500)); return document.querySelector('#view canvas, canvas#cv, canvas').toDataURL(); }, id);
  fs.writeFileSync(OUT + id + '.png', Buffer.from(url.split(',')[1], 'base64')); console.log('saved', OUT + id + '.png');
}
if (errs.length) console.log('errors:', errs.join(' / '));
await b.close();
