// Options > Report a problem: a copyable report with version, device, state and recent events (and errors): node tools/report.mjs  (needs: python3 -m http.server 8123)
import { createRequire } from 'module';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await b.newPage({ viewport: { width: 700, height: 900 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
let fails = 0; const ok = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) fails++; };
await pg.goto(`http://localhost:${process.env.PORT || 8123}/index.html`); await pg.waitForTimeout(400);
const ev = (f, a) => pg.evaluate(f, a);
// on the title screen there is no game yet
await pg.click('[data-act=opts]'); await pg.waitForTimeout(150); await pg.click('[data-act=report]'); await pg.waitForTimeout(150);
let r = await ev(() => document.querySelector('#overlay textarea').value);
ok('the title-screen report says there is no game', /BEARDED BROS REPORT/.test(r) && /game none/.test(r) && /version 2\./.test(r), r.split('\n').slice(0, 3).join(' / '));
ok('it names the device and screen', /device .*Mozilla|device .+/.test(r) && /screen 700x900/.test(r));
// in a game
await pg.evaluate(() => window.__game.ui.title()); await pg.click('[data-act=new]'); await pg.click('[data-act=slotpick][data-a="1"]'); await pg.click('[data-act=diff][data-b=normal]'); await pg.waitForTimeout(250);
await ev(() => { const g = window.__game; g.ACT.crbegin(); g.ACT.close(); g.testParty(); g.G.slot = 1; for (const m of Object.values(g.MAPS)) m.rate = 0; const el = document.getElementById('overlay'); el.className = ''; el.innerHTML = ''; g.goto('frostholm', 14, 26); });
await pg.waitForTimeout(400);
// an error is recorded
await ev(() => window.dispatchEvent(new ErrorEvent('error', { message: 'boom from the test', error: new Error('boom from the test') })));
await ev(() => { const el = document.getElementById('overlay'); el.className = ''; el.innerHTML = ''; window.__game.ACT.opts(); });
await pg.waitForTimeout(150); await pg.click('[data-act=report]'); await pg.waitForTimeout(150);
r = await ev(() => document.querySelector('#overlay textarea').value);
ok('the report shows the party and place', /party Adam .* L\d+ \d+\/\d+/.test(r) && /where frostholm/.test(r), r.split('\n').filter((l) => /^(party|where)/.test(l)).join(' / ').slice(0, 160));
ok('it lists recent events including the map change', /recent:/.test(r) && /go haven -> frostholm|go .* -> frostholm/.test(r));
ok('it records the error', /ERROR boom from the test/.test(r));
ok('it carries the progress line', /progress gold \d+ bosses .* quests \d+\/\d+ feats \d+\/\d+ bestiary \d+\/\d+/.test(r));
ok('the text is read only and selectable', await ev(() => { const t = document.querySelector('#overlay textarea'); return t.readOnly && getComputedStyle(t).userSelect !== 'none'; }));
ok('Back returns to Options', await (async () => { await pg.click('[data-act=optsback]'); await pg.waitForTimeout(150); return /options/i.test(await ev(() => document.querySelector('#overlay h2')?.textContent || '')); })());
ok('no page errors (apart from the one we injected as an event)', !errs.some((e) => !/boom from the test/.test(e)), errs.join('|')); await b.close(); process.exit(fails ? 1 : 0);
