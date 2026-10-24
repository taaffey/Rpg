// Touch-control regression: tap-to-travel, tap a townsperson, slide d-pad, A button, tap-to-attack in battle.
//   node tools/touch.mjs   (needs: python3 -m http.server 8123)
import { createRequire } from 'module';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let fails = 0; const ok = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) fails++; };
for (const [name, w, h] of [['iPhone', 390, 844], ['iPad', 820, 1180]]) {
  const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto(process.env.URL || 'http://localhost:8123/index.html'); await pg.waitForTimeout(400);
  const ev = (f, a) => pg.evaluate(f, a);
  await ev(() => { window.__game.ACT.diff(1, 'normal'); }); await pg.waitForTimeout(300);
  await ev(() => { const o = document.getElementById('overlay'); o.className = ''; o.innerHTML = ''; for (const m of Object.values(window.__game.MAPS)) m.rate = 0; window.__game.G.flags.tips = new Proxy({}, { get: () => true }); });
  const tileXY = (x, y) => ev(([x, y]) => { const g = window.__game, cv = document.getElementById('map'), r = cv.getBoundingClientRect(), k = Math.min(r.width / cv.width, r.height / cv.height);
    return [r.left + (r.width - cv.width * k) / 2 + ((x + 0.5 - g.camState.x) * g.TS) * k, r.top + (r.height - cv.height * k) / 2 + ((y + 0.5 - g.camState.y) * g.TS) * k]; }, [x, y]);
  const pos = () => ev(() => [window.__game.G.map, window.__game.G.x, window.__game.G.y]);
  // 1. tap-to-travel across Haven
  await ev(() => window.__game.goto('haven', 17, 30)); await pg.waitForTimeout(400);
  let [px, py] = await tileXY(17, 24); await pg.touchscreen.tap(px, py); await pg.waitForTimeout(2200);
  ok(`${name}: tap a spot and the party walks there`, JSON.stringify(await pos()) === JSON.stringify(['haven', 17, 24]), JSON.stringify(await pos()));
  // 2. tap a townsperson: walk up and talk
  const npc = await ev(() => { const n = window.__game.MAPS.haven.npcs.find((n) => n.name === 'Villager'); return [n.x, n.y]; });
  [px, py] = await tileXY(...npc); await pg.touchscreen.tap(px, py); await pg.waitForTimeout(4000);
  ok(`${name}: tapping a townsperson walks over and opens their dialogue`, await ev(() => !!document.querySelector('#overlay .sayname')));
  await ev(() => { const o = document.getElementById('overlay'); o.className = ''; o.innerHTML = ''; });
  // 3. A button talks to whoever you face (we are standing next to the villager after step 2)
  await pg.tap('#padR [data-d=a]'); await pg.waitForTimeout(300);
  ok(`${name}: A talks to the person you face`, await ev(() => !!document.querySelector('#overlay .sayname')));
  await ev(() => { const o = document.getElementById('overlay'); o.className = ''; o.innerHTML = ''; });
  // 4. slide d-pad: hold up, then slide to the right without lifting
  await ev(() => window.__game.goto('world', 22, 57)); await pg.waitForTimeout(400);
  const box = await (await pg.$('.cross')).boundingBox(), cxp = box.x + box.width / 2, cyp = box.y + box.height / 2;
  const start = await pos(); await pg.mouse.move(cxp, cyp - box.height * 0.35); await pg.mouse.down(); await pg.waitForTimeout(700);
  const mid = await pos(); await pg.mouse.move(cxp + box.width * 0.35, cyp, { steps: 4 }); await pg.waitForTimeout(700); await pg.mouse.up(); await pg.waitForTimeout(200);
  const end = await pos();
  ok(`${name}: holding the pad walks several tiles`, start[2] - mid[2] >= 2 || mid[1] !== start[1], JSON.stringify([start, mid]));
  ok(`${name}: sliding to another arm changes direction without lifting`, end[1] > mid[1], JSON.stringify([mid, end]));
  // 5. battle: tap an enemy on the stage to attack it
  await ev(() => { window.__game.OPT.speed = 'instant'; window.__game.battle(['goblin', 'slime']); }); await pg.waitForSelector('[data-act=c]');
  ok(`${name}: a new party's battle menu has no Repeat/Auto yet`, !(await pg.$('[data-act=c][data-a=repeat]')) && !(await pg.$('[data-act=c][data-a=auto]')));
  const who = await ev(() => window.__game.BT.ask.p.name);
  const tgt = await ev(() => { const st = window.__game.BT.stage, v = [...st.v.values()].find((v) => v.side === 'e'), r = st.canvas.getBoundingClientRect(); return [r.left + (v.x + (v.bb[0] + v.bb[2]) / 2) * r.width / 256, r.top + (v.y + (v.bb[1] + v.bb[3]) / 2) * r.height / 176]; });
  await pg.touchscreen.tap(...tgt); await pg.waitForTimeout(250);
  ok(`${name}: tapping a foe in battle attacks it (turn passes)`, await ev((w) => window.__game.BT?.ask?.p?.name !== w, who), who);
  ok(`${name}: no page errors`, !errs.length, errs.join(' | '));
  await pg.close();
}
await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
