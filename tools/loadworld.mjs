// A save that loads straight onto the overworld must not freeze the page while the map bakes: node tools/loadworld.mjs  (needs: python3 -m http.server 8123)
import { createRequire } from 'module';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 700, height: 900 } });
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
let fails = 0; const ok = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) fails++; };
const URL_ = `http://localhost:${process.env.PORT || 8123}/index.html`;
await pg.goto(URL_); await pg.waitForTimeout(400);
await pg.click('[data-act=new]'); await pg.click('[data-act=slotpick][data-a="1"]'); await pg.click('[data-act=diff][data-b=normal]'); await pg.waitForTimeout(250);
await pg.evaluate(async () => { const g = window.__game; g.ACT.crbegin(); g.ACT.close(); g.testParty(); for (const m of Object.values(g.MAPS)) m.rate = 0; g.G.slot = 1; const el = document.getElementById('overlay'); el.className = ''; el.innerHTML = ''; g.goto('world', g.MAPS.world.spawn.x, g.MAPS.world.spawn.y); await new Promise((r) => setTimeout(r, 2500)); g.ui.mainMenu(); g.ACT.save(); });
ok('saved on the overworld', await pg.evaluate(() => JSON.parse(localStorage.getItem('gemforge-save-v3-1')).G.map === 'world'));
// a fresh page (nothing baked yet): continue right away and watch the frame gaps
await pg.reload(); await pg.waitForTimeout(60);
await pg.evaluate(() => { window.__gaps = []; let last = performance.now(); const t = (n) => { window.__gaps.push(n - last); last = n; requestAnimationFrame(t); }; requestAnimationFrame(t); });
await pg.click('[data-act=cont]'); await pg.click('[data-act=slotpick][data-a="1"]');
await pg.waitForFunction(() => window.__game?.G?.map === 'world', null, { timeout: 60000 });
await pg.waitForTimeout(800);
const r = await pg.evaluate(() => { const g = window.__gaps.slice(5).sort((a, c) => a - c); return { max: Math.round(g.at(-1)), p95: Math.round(g[Math.floor(g.length * .95)]), n: g.length, loader: !!document.getElementById('charting') }; });
ok('loaded onto the world', true, JSON.stringify(r));
ok('no frame stalls over 400 ms while it loads', r.max < 400, r.max + ' ms worst');
ok('the loader is gone afterwards', !r.loader);
ok('no page errors', !errs.length, errs.join('|')); await b.close(); process.exit(fails ? 1 : 0);
