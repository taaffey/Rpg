// Options: menu size, text speed, random-fight rate, controls text for touch vs keyboard: node tools/options.mjs  (needs: python3 -m http.server 8123)
import { createRequire } from 'module';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const URL_ = `http://localhost:${process.env.PORT || 8123}/index.html`;
let fails = 0; const ok = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) fails++; };
const errs = [];
// ---- desktop (keyboard)
{
  const pg = await (await b.newContext({ viewport: { width: 900, height: 900 } })).newPage(); pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto(URL_); await pg.waitForTimeout(400); await pg.click('[data-act=opts]'); await pg.waitForTimeout(200);
  const txt = await pg.evaluate(() => document.getElementById('overlay').innerText);
  ok('keyboard controls are listed on a desktop', /WASD/i.test(txt) && !/Tap the map/i.test(txt));
  // menu size cycles and sets the zoom variable
  const zooms = []; for (let i = 0; i < 3; i++) { await pg.click('[data-act=optui]'); await pg.waitForTimeout(120); zooms.push(await pg.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-zoom').trim())); }
  ok('menu size cycles large, huge, normal', zooms.join(',') === '1.2,1.4,1', zooms.join(','));
  await pg.click('[data-act=optui]'); await pg.waitForTimeout(150);
  ok('windows are zoomed when it is large', (await pg.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#overlay .win')).zoom || '1'))) > 1.1);
  await pg.click('[data-act=optui]'); await pg.click('[data-act=optui]'); // back to normal
  // the setting survives a reload
  await pg.click('[data-act=optenc]'); await pg.waitForTimeout(100); await pg.reload(); await pg.waitForTimeout(400); await pg.click('[data-act=opts]'); await pg.waitForTimeout(150);
  ok('options persist across a reload', /fewer/i.test(await pg.evaluate(() => document.getElementById('overlay').innerText)));
  await pg.evaluate(() => localStorage.clear());
  await pg.close();
}
// ---- phone (touch)
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto(URL_); await pg.waitForTimeout(400); await pg.click('[data-act=opts]'); await pg.waitForTimeout(200);
  const txt = await pg.evaluate(() => document.getElementById('overlay').innerText);
  ok('touch controls are listed on a phone', /Tap the map/i.test(txt) && /slide/i.test(txt) && !/WASD move/i.test(txt));
  await pg.close();
  // ---- random fights: Off means none, Normal means some
  const pg2 = await (await b.newContext({ viewport: { width: 700, height: 900 } })).newPage(); pg2.on('pageerror', (e) => errs.push(e.message));
  await pg2.goto(URL_); await pg2.waitForTimeout(400);
  await pg2.click('[data-act=new]'); await pg2.click('[data-act=slotpick][data-a="1"]'); await pg2.click('[data-act=diff][data-b=normal]'); await pg2.waitForTimeout(250);
  await pg2.evaluate(async () => { const g = window.__game; g.ACT.crbegin(); g.ACT.close(); g.testParty(); g.G.slot = 1; const el = document.getElementById('overlay'); el.className = ''; el.innerHTML = ''; g.goto('world', g.MAPS.world.spawn.x + 6, g.MAPS.world.spawn.y + 10); await new Promise((r) => setTimeout(r, 2500)); });
  // Math.random is pinned: a roll of 0.2 is above Fewer's 0.12 (0.3 x 0.4) and Off's 0, and 0.02 is below even a road's 0.105 (0.3 x 0.35)
  const fights = (enc, roll = 0.2) => pg2.evaluate(async ([e, r0]) => {
    const g = window.__game, real = Math.random; g.OPT.enc = e; g.MAPS.world.rate = 0.3; Math.random = () => r0; document.getElementById('overlay').className = ''; document.getElementById('overlay').innerHTML = '';
    let started = false; const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    for (let i = 0; i < 12 && !started; i++) { const [dx, dy] = dirs[i % 4]; g.step(dx, dy); await new Promise((r) => setTimeout(r, 60)); started = !!g.BT; } // (not awaited: a fight blocks step until it ends)
    Math.random = real; return started;
  }, [enc, roll]);
  ok('random fights Off: none', (await fights('none')) === false);
  ok('random fights Fewer: none at this roll', (await fights('fewer')) === false);
  ok('random fights Normal: a fight starts', (await fights('normal', 0.02)) === true);
  await pg2.close();
}
ok('no page errors', !errs.length, errs.join('|')); await b.close(); process.exit(fails ? 1 : 0);
