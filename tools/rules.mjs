// New Game+ house rules through the real UI: ending -> New Game+ -> pick rules -> run starts with them: node tools/rules.mjs  (needs: python3 -m http.server 8123)
import { createRequire } from 'module';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await b.newPage({ viewport: { width: 700, height: 900 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
let fails = 0; const ok = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) fails++; };
await pg.goto(`http://localhost:${process.env.PORT || 8123}/index.html`); await pg.waitForTimeout(400);
await pg.click('[data-act=new]'); await pg.click('[data-act=slotpick][data-a="1"]'); await pg.click('[data-act=diff][data-b=normal]'); await pg.waitForTimeout(250);
const ev = (f, a) => pg.evaluate(f, a);
await ev(() => { const g = window.__game; g.ACT.crbegin(); g.ACT.close(); g.testParty(); g.G.party.forEach((c) => { c.level = 15; }); g.G.slot = 1; g.G.flags.bosses = { wyrm: true, lich: true, titan: true }; for (const m of Object.values(g.MAPS)) m.rate = 0; g.OPT.text = 'instant'; g.ending(); });
// the finale scene, then the credits with the New Game+ button
for (let i = 0; i < 60 && !(await ev(() => !!document.querySelector('[data-act=ngplus]'))); i++) { await pg.keyboard.press('Enter'); await pg.waitForTimeout(100); }
ok('the credits offer New Game+', await ev(() => !!document.querySelector('[data-act=ngplus]')));
await pg.click('[data-act=ngplus]'); await pg.waitForTimeout(150); await pg.click('[data-act=ngplus]'); await pg.waitForTimeout(300);
const txt = await ev(() => document.getElementById('overlay').innerText);
ok('the house rules screen lists the three rules', /Dry January/i.test(txt) && /Glass Beards/i.test(txt) && /Rush Hour/i.test(txt));
await pg.click('[data-act=ruletog][data-a=dry]'); await pg.waitForTimeout(120); await pg.click('[data-act=ruletog][data-a=glass]'); await pg.waitForTimeout(120);
ok('toggles show On for the chosen rules', (await ev(() => [...document.querySelectorAll('[data-act=ruletog]')].map((x) => x.textContent.trim()))).join(',') === 'On,On,Off');
await pg.click('[data-act=rulesgo]'); await pg.waitForTimeout(500);
const run = await ev(() => { const g = window.__game; return { ngp: g.G.ngp, rules: g.G.rules, map: g.G.map }; });
ok('the run starts as New Game+1 with those rules', run.ngp === 1 && run.rules.dry && run.rules.glass && !run.rules.rush && run.map === 'haven', JSON.stringify(run));
// battle: ITEM is disabled under Dry January, rewards are boosted
await ev(() => { const el = document.getElementById('overlay'); el.className = ''; el.innerHTML = ''; window.__game.battle(['slime']); });
await pg.waitForFunction(() => window.__game.BT?.ask?.stage === 'root', null, { timeout: 15000 });
const item = await ev(() => { const b = document.querySelector('[data-act=c][data-a=item]'); return { disabled: !!b?.disabled }; });
ok('ITEM is greyed out in battle (Dry January)', item.disabled);
ok('forcing it does nothing', await ev(() => { window.__game.ACT.c('item'); return window.__game.BT.ask.stage === 'root'; }));
const mul = await ev(() => { const b = window.__game.BT.b; return b.mod.reward; });
ok('rewards carry the bonuses (1.35 x 1.3 x the NG+ factor)', mul > 1.35 * 1.3, String(mul));
ok('Glass Beards raised the damage factor', await ev(() => window.__game.BT.b.mod.dmg === 1.5));
await ev(() => { window.__game.ACT.c('auto'); }); await pg.waitForFunction(() => document.querySelector('[data-act=vdone]'), null, { timeout: 30000 }); await ev(() => window.__game.ACT.vdone()); await pg.waitForTimeout(300);
await ev(() => window.__game.ui.mainMenu()); await pg.waitForTimeout(150);
ok('the menu shows the rules', /RULES[\s\S]*Dry[\s\S]*Glass/i.test(await ev(() => document.getElementById('overlay').innerText)));
ok('no page errors', !errs.length, errs.join('|')); await b.close(); process.exit(fails ? 1 : 0);
