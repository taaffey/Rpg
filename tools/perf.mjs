// Frame-rate check on a slow phone: the same walk / town / battle / boss scenes with the CPU throttled (default 4x, like an older iPhone).
// Fails if the median frame is slower than ~30fps or more than 5% of frames take over 50ms.  RATE=6 node tools/perf.mjs  to be harsher.
// Needs the dev server (python3 -m http.server 8123).  Also prints how long entering each kind of place takes the first time (cache baking).
import { createRequire } from 'module';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const RATE = +process.env.RATE || 4, URL_ = process.env.URL || `http://localhost:${process.env.PORT || 8123}/index.html`;
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
const cdp = await ctx.newCDPSession(pg);
await pg.goto(URL_); await pg.waitForTimeout(600);
await pg.click('[data-act=new]'); await pg.click('[data-act=slotpick][data-a="1"]'); await pg.click('[data-act=diff][data-b=normal]'); await pg.waitForTimeout(200);
await pg.evaluate(() => { const g = window.__game; g.ACT.crbegin(); g.ACT.close(); g.testParty(); for (const m of Object.values(g.MAPS)) m.rate = 0; });
await pg.evaluate(() => { window.__gaps = []; let last = performance.now(); const p = (t) => { window.__gaps.push(t - last); last = t; requestAnimationFrame(p); }; requestAnimationFrame(p); });
let fails = 0;
const scene = async (label, ms) => {
  await pg.evaluate(() => { window.__gaps.length = 0; }); await pg.waitForTimeout(ms);
  const g = await pg.evaluate(() => window.__gaps.slice()).then((a) => a.sort((x, y) => x - y)), q = (p) => g[Math.min(g.length - 1, Math.floor(g.length * p))];
  const slow = g.filter((x) => x > 50).length, ok = q(0.5) <= 34 && slow <= g.length * 0.05; if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label.padEnd(26)} ${(g.length / ms * 1000).toFixed(0).padStart(2)} fps  p50 ${q(0.5).toFixed(0)}ms  p95 ${q(0.95).toFixed(0)}ms  max ${g[g.length - 1].toFixed(0)}ms  >50ms ${slow}/${g.length}`);
};
const clear = () => pg.evaluate(() => { const el = document.getElementById('overlay'); el.className = ''; el.innerHTML = ''; });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
console.log(`CPU throttled ${RATE}x`);
await pg.evaluate(() => { const g = window.__game; g.goto('world', ...(g.MAPS.world.spawn ? [g.MAPS.world.spawn.x, g.MAPS.world.spawn.y] : [60, 70])); }); await pg.waitForTimeout(4000);
await pg.keyboard.down('ArrowRight'); await scene('overworld, walking', 3000); await pg.keyboard.up('ArrowRight');
await scene('overworld, standing', 1500);
await pg.evaluate(() => { const g = window.__game; g.goto('haven', ...g.MAPS.haven.spots.green); }); await pg.waitForTimeout(2500);
await pg.keyboard.down('ArrowLeft'); await scene('town, walking', 2500); await pg.keyboard.up('ArrowLeft');
await pg.evaluate(() => { window.__game.battle(['goblin', 'goblin', 'bat']); }); await pg.waitForTimeout(2500);
await pg.evaluate(() => window.__game.ACT.c('auto')); await scene('battle, auto', 5000);
await pg.waitForFunction(() => !!document.querySelector('[data-act=vdone]') || !window.__game.BT, null, { timeout: 30000 }).catch(() => {}); await clear();
await pg.evaluate(() => { window.__game.battle(['wyrm'], true); }); await pg.waitForTimeout(4000);
await pg.evaluate(() => window.__game.ACT.c('auto')); await scene('boss battle, auto', 6000);
// first visit to each kind of place: how long the main thread is blocked behind the wipe
const first = await pg.evaluate(async () => {
  const g = window.__game, out = []; await new Promise((r) => setTimeout(r, 300)); const el = document.getElementById('overlay');
  for (const id of ['frostholm', 'spire', 'haven_shop']) {
    el.className = ''; el.innerHTML = ''; window.__gaps.length = 0; const m = g.MAPS[id]; g.goto(id, m.spawn.x, m.spawn.y); await new Promise((r) => setTimeout(r, 1500));
    out.push(`${id} ${Math.round(Math.max(...window.__gaps))}ms`);
  } return out;
});
console.log('longest frame entering a place for the first time:', first.join(', '));
console.log(errs.join('\n') || 'no page errors'); if (errs.length) fails++;
await b.close(); process.exit(fails ? 1 : 0);
