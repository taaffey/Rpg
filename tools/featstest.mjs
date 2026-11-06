// Feats: unlock on autosave, counters, the Feats screen, carry into New Game+: node tools/featstest.mjs  (needs: python3 -m http.server 8123)
import { createRequire } from 'module';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await b.newPage({ viewport: { width: 700, height: 900 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
let fails = 0; const ok = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) fails++; };
await pg.goto(`http://localhost:${process.env.PORT || 8123}/index.html`); await pg.waitForTimeout(400);
const ev = (f, a) => pg.evaluate(f, a);
await pg.click('[data-act=new]'); await pg.click('[data-act=slotpick][data-a="1"]'); await pg.click('[data-act=diff][data-b=normal]'); await pg.waitForTimeout(250);
await ev(() => { const g = window.__game; g.ACT.crbegin(); g.ACT.close(); g.testParty(); const el = document.getElementById('overlay'); el.className = ''; el.innerHTML = ''; g.G.slot = 1; g.G.stats = { wins: 60 }; g.autosave(); });
let f = await ev(() => Object.keys(window.__game.G.flags.feats));
ok('first win and Regular unlock from the win count', f.includes('first_win') && f.includes('wins_50'), f.join(','));
ok('Fixture (200 wins) stays locked', !f.includes('wins_200'));
// pints counted through the real item path
const left = await ev(() => { const g = window.__game, G = g.G; G.inv.items.potion = 30; for (let i = 0; i < 22; i++) { G.party[0].hp = 1; g.ACT.useon('potion', 0); } g.autosave(); return { used: G.stats.used.potion, feats: Object.keys(G.flags.feats) }; });
ok('22 pints used are counted', left.used === 22, String(left.used)); ok('Round for the House unlocks', left.feats.includes('pints'));
// wipe and bus counters
await ev(() => { const g = window.__game; g.defeat(); });
await pg.waitForTimeout(200); await ev(() => window.__game.ACT.ddone()); await pg.waitForTimeout(300);
ok('a wipe is counted', (await ev(() => window.__game.G.stats.wipes)) === 1);
await ev(() => { const el = document.getElementById('overlay'); el.className = ''; el.innerHTML = ''; window.__game.autosave(); });
ok('Learning Experience unlocks after a wipe', await ev(() => !!window.__game.G.flags.feats.wipe));
// the screen
await ev(() => window.__game.ui.mainMenu()); await ev(() => window.__game.ACT.feats()); await pg.waitForTimeout(200);
const txt = await ev(() => document.getElementById('overlay').innerText);
ok('Feats screen shows the count', /feats[\s\S]*\d+\/\d+/i.test(txt), (txt.match(/\d+\/\d+/) || [''])[0]);
ok('locked feats show a counter', /\(\d+\/\d+\)/.test(txt));
const names = await ev(() => [...document.querySelectorAll('#overlay .card.done b')].map((e) => e.textContent.trim()));
ok('unlocked feats are marked done', names.some((n) => /regular/i.test(n)), names.join(' | '));
// New Game+ keeps them
const kept = await ev(() => { const g = window.__game; g.newGamePlus(); return Object.keys(g.G.flags.feats); });
ok('New Game+ keeps feats and adds Round Two after the next check', kept.includes('wins_50'));
await ev(() => { window.__game.autosave(); }); ok('Round Two unlocks', await ev(() => !!window.__game.G.flags.feats.ng1));
// an old save without the flag loads
const loaded = await ev(() => { const g = window.__game, raw = JSON.parse(localStorage.getItem('gemforge-save-v3-1')); delete raw.G.flags.feats; localStorage.setItem('gemforge-save-v3-1', JSON.stringify(raw)); return true; });
await ev(() => window.__game.ui.title()); await pg.waitForTimeout(200); await pg.click('[data-act=cont]'); await pg.waitForTimeout(200); await pg.click('[data-act=slotpick][data-a="1"]'); await pg.waitForTimeout(600);
ok('an older save loads and gets a feats map', await ev(() => typeof window.__game.G.flags.feats === 'object'));
ok('no page errors', !errs.length, errs.join('|')); await b.close(); process.exit(fails ? 1 : 0);
