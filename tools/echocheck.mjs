// Echo Stones: node tools/echocheck.mjs (needs python3 -m http.server 8123)
import { createRequire } from 'module';
const pw = createRequire('/opt/node22/lib/node_modules/')('playwright');
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' });
const pg = await b.newPage({ viewport: { width: 700, height: 900 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
let fails = 0; const ok = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) fails++; };
await pg.goto('http://localhost:8123/index.html'); await pg.waitForTimeout(300);
const ev = (f, a) => pg.evaluate(f, a), key = async (k, n = 1, d = 90) => { for (let i = 0; i < n; i++) { await pg.keyboard.press(k); await pg.waitForTimeout(d); } };
const closeAll = async () => { for (let i = 0; i < 8 && (await ev(() => document.getElementById('overlay').classList.contains('on'))); i++) await key('Escape', 1, 70); };
await key('Enter'); await key('Enter'); await key('Enter', 1, 300); await key('Enter', 4, 220);
for (let i = 0; i < 40 && (await ev(() => !!document.querySelector('#overlay .saybox'))); i++) await key('Enter', 1, 60);
await ev(() => { for (const m of Object.values(window.__game.MAPS)) m.rate = 0; window.__game.battle(['big_gary'], 'big_gary'); }); await pg.waitForSelector('[data-act=c]', { timeout: 8000 });
await ev(() => window.__game.BT.b.e.forEach((e) => { e.hp = 1; })); await key('Enter', 1, 200); await key('Enter', 1, 200);
let vic = ''; for (let i = 0; i < 40 && !/Echo Stone/.test(vic); i++) { vic = await ev(() => document.getElementById('overlay').textContent); await key('Enter', 1, 200); }
ok('Big Gary leaves the Lumen Doe stone', /Lumen Doe/.test(vic) && (await ev(() => window.__game.G.inv.echoes.includes('lumen'))));
for (let i = 0; i < 40 && (await ev(() => !!document.querySelector('#overlay .saybox'))); i++) await key('Enter', 1, 60);
await ev(() => { window.__game.ACT.build(0); }); await pg.waitForTimeout(200);
ok('hero screen shows an Echo row', /Echo/.test(await ev(() => document.getElementById('overlay').textContent)));
await pg.click('[data-act=bview][data-a=echo]'); await pg.waitForTimeout(150); await pg.click('[data-act=setecho][data-a=lumen]'); await pg.waitForTimeout(150);
ok('attuned', (await ev(() => window.__game.G.party[0].echo)) === 'lumen' && /Lumen Doe/.test(await ev(() => document.getElementById('overlay').textContent)));
await ev(() => { window.__game.ACT.bclose?.(); }); await pg.waitForTimeout(150);
await closeAll(); await ev(() => { window.__game.G.party.forEach((c) => { c.hp = Math.max(1, Math.floor(c.hp / 2)); }); window.__game.battle(['frost_goblin']); }); await pg.waitForTimeout(800);
for (let i = 0; i < 80 && !(await pg.$('[data-act=c][data-a=call]')); i++) { await ev(() => window.__game.BT?.b?.e.forEach((e) => { e.atb = 0; })); if (await pg.$('[data-act=c][data-a=defend]')) await pg.click('[data-act=c][data-a=defend]').catch(() => {}); await pg.waitForTimeout(150); }
ok('CALL in the command list', !!(await pg.$('[data-act=c][data-a=call]')));
const hp0 = await ev(() => window.__game.BT.b.p.reduce((s, p) => s + p.hp, 0));
await pg.click('[data-act=c][data-a=call]'); await pg.waitForTimeout(2500);
const log = await ev(() => window.__game.BT.log.join(' | '));
ok('the call heals the party', /calls Lumen Doe/.test(log) && (await ev(() => window.__game.BT.b.p.reduce((s, p) => s + p.hp, 0))) > hp0, log.slice(-200));
ok('once per battle', await ev(() => window.__game.BT.b.p[0].called === true));
await ev(() => window.__game.BT.b.e.forEach((e) => { e.hp = 0; }));
ok('old gems crumble into Resonance for attuned stones', await ev(async () => { const E = await import('/src/echoes.js'), c = window.__game.G.party[0], before = JSON.stringify(c.ep || {}) + (c.spells || []).length; const l = E.dissolveGems(['echo']); return l.length >= 1 && /echo sinks/.test(l[0]) && JSON.stringify(c.ep || {}) + (c.spells || []).length !== before; }));
ok('the facet rides on slotted skills', await ev(async () => { const L = await import('/src/logic.js'), c = window.__game.G.party[0], i = c.slots.findIndex(Boolean); return i < 0 || L.slotGems(c, i).includes('thrifty'); }));
ok('no gems in the pack or the shops', await ev(() => !window.__game.G.inv.gems.length && !document.body.innerHTML.includes('Gem-wright')));
ok('no page errors', !errs.length, errs.join(' / '));
await b.close(); process.exit(fails ? 1 : 0);
