// Device matrix: layout metrics + screenshots across iPhone sizes, orientations, iPad and desktop.
// usage: node tools/devices.mjs <outdir> [url]
import { createRequire } from 'module';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const OUT = process.argv[2] || '/tmp/devices', URL_ = process.argv[3] || 'http://localhost:8123/index.html';
const DEVICES = [
  ['iphone-se', 375, 667, true, 2], ['iphone-14', 390, 844, true, 3], ['iphone-pro-max', 430, 932, true, 3],
  ['iphone-14-landscape', 844, 390, true, 3], ['iphone-pro-max-landscape', 932, 430, true, 3], ['ipad', 820, 1180, true, 2], ['desktop', 1280, 800, false, 1],
];
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let bad = 0;
for (const [name, w, h, touch, dpr] of DEVICES) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: touch, hasTouch: touch });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto(URL_); await pg.waitForTimeout(500);
  const snap = async (tag) => pg.screenshot({ path: `${OUT}/${name}-${tag}.png` });
  await snap('1-title');
  await pg.click('[data-act=new]'); await pg.click('[data-act=slotpick][data-a="1"]'); await pg.click('[data-act=diff][data-b=normal]'); await pg.waitForTimeout(150); await pg.evaluate(() => { window.__game.ACT.crbegin(); window.__game.ACT.close(); }); await pg.waitForTimeout(500);
  await pg.evaluate(() => window.__game.goto('world', 7, 21)); await pg.waitForTimeout(700); await snap('2-world');
  const m = await pg.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
    const cv = document.getElementById('map');
    return { tiles: `${cv.width / 32}x${cv.height / 32}`, view: r('#view'), padL: r('#padL'), padR: r('#padR'), hud: r('#hud'), scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight, bodyScroll: document.body.scrollHeight };
  });
  await pg.evaluate(() => window.__game.goto('haven', 12, 20)); await pg.waitForTimeout(600); await snap('3-town');
  pg.evaluate(() => { window.__game.battle(['goblin', 'wolf', 'slime']); }); await pg.waitForSelector('[data-act=c]', { timeout: 8000 }); await pg.waitForTimeout(900); await snap('4-battle');
  const bm = await pg.evaluate(() => { const o = document.getElementById('overlay'); return { overlayScrollable: o.scrollHeight > o.clientHeight, scrollW: o.scrollWidth, clientW: o.clientWidth }; });
  const touchOk = !touch || (m.padL && m.padL[2] > 0);
  const fits = m.scrollW <= w + 1 && m.scrollH <= h + 1 && bm.scrollW <= bm.clientW + 1;
  if (!fits || !touchOk || errs.length) bad++;
  console.log(`${fits && touchOk && !errs.length ? 'OK  ' : 'FAIL'} ${name.padEnd(26)} ${w}x${h} tiles ${m.tiles} view ${JSON.stringify(m.view)} padL ${JSON.stringify(m.padL)} doc ${m.scrollW}x${m.scrollH} battleScroll=${bm.overlayScrollable} ${errs.join('|')}`);
  await ctx.close();
}
await b.close(); process.exit(bad ? 1 : 0);
