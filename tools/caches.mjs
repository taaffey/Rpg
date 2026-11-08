// Every hidden cache in the open world can really be reached and opened by walking onto it: node tools/caches.mjs  (needs: python3 -m http.server 8123)
import { createRequire } from 'module';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await b.newPage({ viewport: { width: 700, height: 900 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
let fails = 0; const ok = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) fails++; };
await pg.goto(`http://localhost:${process.env.PORT || 8123}/index.html`); await pg.waitForTimeout(400);
await pg.click('[data-act=new]'); await pg.click('[data-act=slotpick][data-a="1"]'); await pg.click('[data-act=diff][data-b=normal]'); await pg.waitForTimeout(250);
await pg.evaluate(async () => { const g = window.__game; g.ACT.crbegin(); g.ACT.close(); g.testParty(); for (const m of Object.values(g.MAPS)) m.rate = 0; g.G.slot = 1; const el = document.getElementById('overlay'); el.className = ''; el.innerHTML = ''; g.goto('world', g.MAPS.world.spawn.x, g.MAPS.world.spawn.y); await new Promise((r) => setTimeout(r, 2500)); });
const res = await pg.evaluate(async () => {
  const g = window.__game, m = g.MAPS.world, { GEN } = await import('/src/mapgen.js'), { WALK } = await import('/src/maps.js'), out = { n: GEN.deco.caches.length, glints: m.glints.length, opened: 0, failed: [] };
  for (const [x, y] of GEN.deco.caches) {
    // stand on a walkable neighbour and walk onto the cache
    let from = null; for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const c = m.rows[y + dy]?.[x + dx]; if (c && WALK.has(c) && !m.secrets[`${x + dx},${y + dy}`]) { from = [x + dx, y + dy, -dx, -dy]; break; } }
    if (!from) { out.failed.push(`${x},${y}: no walkable neighbour`); continue; }
    document.getElementById('overlay').className = ''; document.getElementById('overlay').innerHTML = '';
    g.G.x = from[0]; g.G.y = from[1]; g.snap(); await new Promise((r) => setTimeout(r, 30));
    const gold0 = g.G.gold, inv0 = JSON.stringify(g.G.inv);
    await g.step(from[2], from[3]); await new Promise((r) => setTimeout(r, 30));
    const title = document.querySelector('#overlay h2')?.textContent || '';
    if (/Hidden/i.test(title) && g.G.flags.chests[`world:${x},${y}`]) out.opened++; else out.failed.push(`${x},${y}: ${title || 'nothing happened'}`);
    g.ACT.close?.();
  }
  return out;
});
ok(`${res.n} caches in the generator, ${res.glints} glints`, res.n >= 28 && res.glints === res.n);
ok('every cache opens when walked onto', res.opened === res.n && !res.failed.length, `${res.opened}/${res.n} ${res.failed.slice(0, 3).join('; ')}`);
ok('loot arrived', await pg.evaluate(() => window.__game.G.gold > 400));
ok('the feat count sees them', await pg.evaluate(async () => { const g = window.__game; g.autosave(); return Object.keys(g.G.flags.chests).filter((k) => k.startsWith('world:')).length >= 28; }));
ok('no page errors', !errs.length, errs.join('|')); await b.close(); process.exit(fails ? 1 : 0);
