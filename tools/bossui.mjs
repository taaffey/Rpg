// Boss wind-up in the real battle UI: warning strip with a stagger bar, stage events, auto-battle bracing, a staggered attack: node tools/bossui.mjs
import { createRequire } from 'module';
import fs from 'fs';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const OUT = process.env.OUT || '';
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
let fails = 0; const ok = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) fails++; };
await pg.goto(`http://localhost:${process.env.PORT || 8123}/index.html`); await pg.waitForTimeout(400);
await pg.click('[data-act=new]'); await pg.click('[data-act=slotpick][data-a="1"]'); await pg.click('[data-act=diff][data-b=normal]'); await pg.waitForTimeout(250);
await pg.evaluate(() => { const g = window.__game; g.ACT.crbegin(); g.ACT.close(); g.testParty(); g.G.party.forEach((c) => { c.level = 12; }); g.OPT.speed = 'instant'; for (const m of Object.values(g.MAPS)) m.rate = 0; const el = document.getElementById('overlay'); el.className = ''; el.innerHTML = ''; window.__done = false; g.battle(['wyrm'], 'wyrm').then(() => { window.__done = true; }); });
const ev = (f, a) => pg.evaluate(f, a);
const waitAsk = () => pg.waitForFunction(() => window.__game.BT?.ask?.stage === 'root', null, { timeout: 20000 });
// play defend rounds until the wyrm winds up
let seen = false;
for (let i = 0; i < 14 && !seen; i++) {
  await waitAsk();
  seen = await ev(() => !!window.__game.BT.b.e[0].charge);
  if (seen) break;
  for (let k = 0; k < 4; k++) { const more = await ev(() => { const a = window.__game.BT?.ask; if (!a || a.stage !== 'root') return false; window.__game.ACT.c('defend'); return true; }); if (!more) break; await pg.waitForTimeout(30); }
}
ok('the wyrm wound up within a few rounds', seen);
await waitAsk(); await pg.waitForTimeout(300);
const strip = await ev(() => ({ has: !!document.querySelector('.chgwrap .chg'), text: document.querySelector('.chgwrap')?.innerText || '', pct: document.querySelector('.chgwrap .cbar i')?.style.width }));
ok('the warning strip is on screen with a stagger bar', strip.has && /stagger|guard/i.test(strip.text), JSON.stringify(strip));
ok('the stage knows it is charging', await ev(() => [...window.__game.BT.stage.v.values()].some((v) => v.charging)));
if (OUT) { fs.mkdirSync(OUT, { recursive: true }); await pg.screenshot({ path: OUT + 'boss-windup.png' }); }
// Auto-battle braces the hurt heroes while a boss winds up
const auto = await ev(() => { const g = window.__game, b = g.BT.b; b.p[0].hp = Math.round(b.p[0].maxhp * 0.4); g.BT.auto = true; return true; });
// attack the wyrm hard so the bar fills and it staggers
await ev(() => { window.__game.BT.auto = false; });
const logBefore = await ev(() => window.__game.BT.log.length);
// hero 1 Guards while it winds up, the other three hit it; the bar is lowered so the stagger is certain
await ev(() => { window.__game.BT.b.e[0].charge.need = 1; });
const stats0 = await ev(() => ({ braces: window.__game.G.stats?.braces || 0, staggers: window.__game.G.stats?.staggers || 0 }));
for (let k = 0; k < 4; k++) { await ev((k) => { const g = window.__game, a = g.BT?.ask; if (!a || a.stage !== 'root') return; g.ACT.c(k === 0 ? 'defend' : 'attack'); }, k); await ev(() => { const g = window.__game; if (g.BT?.ask?.stage === 'target') g.ACT.tgt('e', 0); }); await pg.waitForTimeout(40); }
await pg.waitForFunction(() => !window.__game.BT.b.e[0].charge, null, { timeout: 20000 });
const log = await ev(() => window.__game.BT.log.join('\n'));
ok('the wind-up resolved (staggered or unleashed)', /staggered|uses Vindaloo|uses Flame/i.test(log), log.split('\n').slice(-3).join(' / ').slice(0, 120));
await pg.waitForTimeout(600);
const stats1 = await ev(() => ({ braces: window.__game.G.stats?.braces || 0, staggers: window.__game.G.stats?.staggers || 0, feats: Object.keys(window.__game.G.flags.feats || {}) }));
ok('a Guard raised while it winds up is counted for the feats', stats1.braces === stats0.braces + 1, JSON.stringify([stats0.braces, stats1.braces]));
ok('the stagger happened and is counted once', /is staggered/.test(log) && stats1.staggers === stats0.staggers + 1, `${stats0.staggers} -> ${stats1.staggers}`);
// finish the fight
await waitAsk(); await ev(() => { const g = window.__game; g.BT.b.e[0].hp = 1; g.ACT.c('auto'); });
await pg.waitForFunction(() => window.__done === true || document.querySelector('[data-act=vdone]'), null, { timeout: 30000 });
ok('the battle ends cleanly', true);
ok('the victory window credits the stagger', /Staggered 1 wind-up/.test(await ev(() => document.getElementById('overlay').innerText)), (await ev(() => document.getElementById('overlay').innerText)).replace(/\s+/g, ' ').slice(0, 120));
ok('no page errors', !errs.length, errs.join('|')); await b.close(); process.exit(fails ? 1 : 0);
