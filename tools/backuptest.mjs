// Backup / restore through the real Options screens: node tools/backuptest.mjs  (needs: python3 -m http.server 8123)
import { createRequire } from 'module';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await b.newPage({ viewport: { width: 700, height: 900 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
let fails = 0; const ok = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) fails++; };
await pg.goto(`http://localhost:${process.env.PORT || 8123}/index.html`); await pg.waitForTimeout(400);
const ev = (f, a) => pg.evaluate(f, a);
const act = async (name, a) => { await pg.click(`[data-act=${name}]${a ? `[data-a="${a}"]` : ''}`); await pg.waitForTimeout(250); };
// a played save in slot 1
await act('new'); await act('slotpick', '1'); await pg.click('[data-act=diff][data-b=normal]'); await pg.waitForTimeout(250);
await ev(() => { const g = window.__game; g.ACT.crbegin(); g.ACT.close(); g.testParty(); g.G.gold = 4321; g.G.slot = 1; g.ui.mainMenu(); g.ACT.save(); });
ok('slot 1 saved', !!(await ev(() => localStorage.getItem('gemforge-save-v3-1'))));
await ev(() => window.__game.ui.title()); await pg.waitForTimeout(200);
await act('opts');
const code = await (async () => { await act('backup'); await pg.waitForFunction(() => /^BB[01]:/.test(document.querySelector('#overlay textarea')?.value || ''), null, { timeout: 5000 }); return ev(() => document.querySelector('#overlay textarea').value); })();
ok('backup code shown', /^BB[01]:/.test(code), code.slice(0, 16) + '… ' + code.length + ' chars');
ok('textarea is read only', await ev(() => document.querySelector('#overlay textarea').readOnly));
// keys typed into the box must not drive the game (Backspace would go "back")
await pg.focus('#overlay textarea'); await pg.keyboard.press('Backspace'); await pg.keyboard.press('ArrowDown');
ok('still on the backup screen after keys', (await ev(() => document.querySelector('#overlay h2')?.textContent || '')).includes('Back up'));
// lose the save, then restore it from the code
await ev(() => localStorage.removeItem('gemforge-save-v3-1'));
await act('optsback'); await act('restore');
await pg.fill('#overlay textarea', 'BB1:not-a-real-code'); await act('bkgo');
ok('junk code is refused kindly', /damaged|does not look/i.test(await ev(() => document.getElementById('bkmsg').textContent)), await ev(() => document.getElementById('bkmsg').textContent));
await pg.fill('#overlay textarea', code.replace(/(.{60})/g, '$1\n')); await act('bkgo');
ok('restore lands on the Continue list', (await ev(() => document.querySelector('#overlay h2')?.textContent || '')).includes('Continue'));
const back = await ev(() => JSON.parse(localStorage.getItem('gemforge-save-v3-1') || 'null')?.G?.gold);
ok('slot 1 is back with its gold', back === 4321, String(back));
// restoring over an existing save needs a second tap
await ev(() => window.__game.ui.title()); await pg.waitForTimeout(200); await act('opts'); await act('restore');
await pg.fill('#overlay textarea', code); await act('bkgo');
ok('first tap asks before replacing', /replaces your saves in slot 1/.test(await ev(() => document.getElementById('bkmsg').textContent)));
await act('bkgo'); ok('second tap restores', (await ev(() => document.querySelector('#overlay h2')?.textContent || '')).includes('Continue'));
// the restored game loads
await act('slotpick', '1'); await pg.waitForTimeout(500);
ok('restored save loads', (await ev(() => window.__game.G?.gold)) === 4321);
ok('no page errors', !errs.length, errs.join('|')); await b.close(); process.exit(fails ? 1 : 0);
