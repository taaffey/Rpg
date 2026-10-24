// node tools/silly_sheet.mjs <mode> <out.png> [querystring]   (needs: python3 -m http.server 8123)
//   node tools/silly_sheet.mjs grid /tmp/grid.png 'jobs=knight,mage&looks=plain,adam'
import { createRequire } from 'module';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const [, , mode = 'grid', out = '/tmp/silly_sheet.png', qs = ''] = process.argv;
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await b.newPage({ viewport: { width: 1600, height: 1000 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => ['error', 'warning'].includes(m.type()) && !/ERR_|Failed to load/.test(m.text()) && errs.push(m.text()));
await pg.goto(`http://localhost:8123/tools/silly_sheet.html?mode=${mode}${qs ? '&' + qs : ''}`);
await pg.waitForFunction(() => document.title === 'ready' || document.title.startsWith('ERR'), null, { timeout: 90000 }).catch(() => errs.push('timeout'));
const t = await pg.title(); if (t.startsWith('ERR')) errs.push(t);
await (await pg.$('#c')).screenshot({ path: out });
console.log(errs.join('\n') || 'ok ' + out);
await b.close();
