// iPhone-style touch regression: node tools/regress-mobile.mjs [url]
import { createRequire } from 'module';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const URL_ = process.argv[2] || 'http://localhost:8123/index.html';
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let fails = 0; const ok = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) fails++; };
for (const [name, w, h] of [['iPhone 14 portrait', 390, 844], ['iPhone 14 landscape', 844, 390]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto(URL_); await pg.waitForTimeout(500);
  const ev = (f, a) => pg.evaluate(f, a);
  ok(`${name}: viewport-fit=cover + no zoom`, /viewport-fit=cover/.test(await ev(() => document.querySelector('meta[name=viewport]').content)) && /user-scalable=no/.test(await ev(() => document.querySelector('meta[name=viewport]').content)));
  await pg.tap('[data-act=new]'); await pg.tap('[data-act=slotpick][data-a="1"]'); await pg.tap('[data-act=diff][data-b=normal]'); await pg.waitForTimeout(200); await pg.tap('[data-act=close]'); await pg.waitForTimeout(400);
  await ev(() => { for (const m of Object.values(window.__game.MAPS)) m.rate = 0; }); await ev(() => window.__game.goto('world', 7, 21)); await pg.waitForTimeout(500);
  const p0 = await ev(() => [window.__game.G.x, window.__game.G.y]);
  { const bb = await (await pg.$('.cross [data-d=right]')).boundingBox(); await pg.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); } await pg.waitForTimeout(350); // taps go to the slide pad under the arm
  const p1 = await ev(() => [window.__game.G.x, window.__game.G.y]);
  ok(`${name}: D-pad tap moves`, p1[0] === p0[0] + 1, JSON.stringify([p0, p1]));
  const box = await (await pg.$('#map')).boundingBox();
  await pg.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height * 0.1); await pg.waitForTimeout(400); // tap above the party (the tile to the right is a tree)
  ok(`${name}: tap-on-map moves toward the tap`, (await ev(() => window.__game.G.y)) < p1[1]);
  const sizes = await ev(() => [...document.querySelectorAll('.pad button, #hud button, #overlay button')].map((e) => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height); }).filter((x) => x > 0));
  ok(`${name}: touch targets big enough (40px portrait, 36px landscape HUD)`, sizes.every((x) => x >= (h > w ? 40 : 36)), `min ${Math.min(...sizes)}`);
  await pg.tap('#padR [data-d=menu]'); await pg.waitForTimeout(250);
  ok(`${name}: menu opens from the pad`, (await ev(() => document.querySelector('#overlay .menucmd') ? 'Menu' : '')) === 'Menu');
  const menuMin = await ev(() => Math.min(...[...document.querySelectorAll('#overlay button')].map((e) => e.getBoundingClientRect().height)));
  ok(`${name}: menu buttons are thumb-sized`, menuMin >= (h > w ? 40 : 34), `min ${Math.round(menuMin)}`);
  await pg.tap('#overlay [data-act=close]'); await pg.waitForTimeout(200);
  ok(`${name}: no horizontal scroll`, (await ev(() => document.documentElement.scrollWidth)) <= w + 1);
  ok(`${name}: no page errors`, errs.length === 0, errs.join('|'));
  await ctx.close();
}
await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
