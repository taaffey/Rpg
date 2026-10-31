// New Game+ check: node tools/ngplus.mjs (needs http.server on 8123)
import { createRequire } from 'module';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await b.newPage({ viewport: { width: 700, height: 900 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto(`http://localhost:${process.env.PORT || 8123}/index.html`); await pg.waitForTimeout(400);
let fails = 0; const ok = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) fails++; };
await pg.click('[data-act=new]'); await pg.click('[data-act=slotpick][data-a="1"]'); await pg.click('[data-act=diff][data-b=normal]'); await pg.waitForTimeout(150); await pg.evaluate(() => { window.__game.ACT.crbegin(); window.__game.ACT.close(); });
const r = await pg.evaluate(async () => {
  const g = window.__game; g.testParty(); const G = g.G; G.slot = 1; G.gold = 777; G.party[0].level = 20; G.flags.bosses.wyrm = true; G.flags.chests['haven:x'] = true; G.flags.qitems.ember_heart = true;
  const hp0 = (await import('/src/data.js')).ENEMIES; const before = g.G;
  g.newGamePlus(); await new Promise((r) => setTimeout(r, 300));
  const N = g.G;
  return { ngp: N.ngp, gold: N.gold, lv: N.party[0].level, n: N.party.length, bosses: Object.keys(N.flags.bosses).length, chests: Object.keys(N.flags.chests).length, heart: !!N.flags.qitems.ember_heart, map: N.map };
});
ok('ngp=1', r.ngp === 1, JSON.stringify(r)); ok('gold kept', r.gold === 777); ok('level kept', r.lv === 20); ok('4 party', r.n === 4); ok('bosses reset', r.bosses === 0); ok('chests reset', r.chests === 0); ok('heart kept', r.heart); ok('in haven', r.map === 'haven');
const bt = await pg.evaluate(async () => { const g = window.__game; document.getElementById('overlay')?.classList.remove('on'); const mk = async (n) => { g.G.ngp = n; g.battle?.(['slime']); await new Promise((r) => setTimeout(r, 400)); const e = g.BT?.b?.e?.[0]; const out = e ? { hp: e.hp, atk: e.atk } : null; return out; }; return [await mk(0), await mk(2)]; });
console.log('battle probe', JSON.stringify(bt));
ok('no page errors', !errs.length, errs.join('|')); await b.close(); process.exit(fails ? 1 : 0);
