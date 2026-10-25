// Cinder Isle battle check: every new foe and the Margherita, auto-battled at ~L23, plus screenshots (portrait + landscape).
// usage: PORT=8127 OUT=/tmp/embers/ node tools/embers_check.mjs   (needs: python3 -m http.server 8127 in the repo root)
// It imports src/embers.js itself and stubs the map ids it needs, so it works before the real Kilnhaven maps exist.
import { createRequire } from 'module';
import { mkdirSync } from 'fs';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const OUT = process.env.OUT || '/tmp/embers/'; mkdirSync(OUT, { recursive: true });
const LV = +process.env.LV || 23;
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const IDS = ['cinder_imp', 'pepperoni_salamander', 'garlic_knot', 'anchovy_eel', 'magma_slime', 'basalt_golem', 'fire_eater', 'stag_wraith'];
let fails = 0; const ok = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) fails++; };
async function boot(vw, vh) {
  const touch = vw < 800, pg = await b.newPage({ viewport: { width: vw, height: vh }, hasTouch: touch, isMobile: touch }), errs = [];
  pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => m.type() === 'error' && !/fonts|ERR_|Failed to load/.test(m.text()) && errs.push(m.text()));
  await pg.goto(`http://localhost:${process.env.PORT || 8127}/index.html`); await pg.waitForTimeout(400);
  await pg.evaluate(() => { window.__game.ACT.diff(1, 'normal'); }); await pg.waitForTimeout(400);
  await pg.evaluate(async (LV) => {
    await import('/src/embers.js'); const L = await import('/src/logic.js'), g = window.__game, G = g.G;
    document.getElementById('overlay').className = ''; document.getElementById('overlay').innerHTML = '';
    g.testParty(); G.flags.bosses.titan = true; G.stats = G.stats || {}; G.stats.wins = 20;
    const gear = [['dragon_claw', 'titan_plate', 'life_charm'], ['lich_staff', 'lich_robes', 'sage_ring'], ['mirage_staff', 'frost_robe', 'life_charm'], ['dragonbane', 'mythril_mail', 'berserk_ring']];
    G.party.forEach((c, i) => { c.level = LV; [c.weapon, c.armor, c.acc] = gear[i]; c.cp[c.main] = 130; const s = L.stats(c); c.hp = s.hp; c.mp = s.mp; });
    // stub maps so the stage picks our backdrops: a dungeon themed 'pizzaoven' and an outdoor-ish one themed 'embers'
    // (the real theme stays 'cavern' for the terrain drawer; only stageKind() sees the backdrop key)
    const stub = (key) => Object.create(g.MAPS.cavern, { theme: { get() { return new Error().stack.includes('stageKind') ? key : 'cavern'; } } });
    g.MAPS.stub_oven = stub('pizzaoven'); g.MAPS.stub_embers = stub('embers');
  }, LV);
  return { pg, errs };
}
const heal = (pg) => pg.evaluate(async () => { const L = await import('/src/logic.js'); for (const c of window.__game.G.party) { const s = L.stats(c); c.hp = s.hp; c.mp = s.mp; } });
async function settle(pg) { // clear victory/loot overlays until the map is idle again
  for (let i = 0; i < 40; i++) { const st = await pg.evaluate(() => ({ bt: !!window.__game.BT, ov: document.getElementById('overlay').classList.contains('on') }));
    if (!st.bt && !st.ov) return; const vd = await pg.$('[data-act=vdone]'); if (vd) await vd.click(); else await pg.keyboard.press(st.ov ? 'Enter' : 'Escape'); await pg.waitForTimeout(150); }
}
async function fight(pg, grp, boss, map, shot) {
  await settle(pg); await heal(pg); await pg.evaluate(() => { window.__game.OPT.speed = 'normal'; });
  await pg.evaluate(([m, g, bs]) => { window.__game.G.map = m; window.__game.battle(g, bs); }, [map, grp, boss]);
  try { await pg.waitForSelector('[data-act=c]', { timeout: 15000 }); } catch (e) { await pg.screenshot({ path: OUT + 'dbg.png' }); console.log(await pg.evaluate(() => JSON.stringify({ bt: !!window.__game.BT, over: window.__game.BT?.b?.over, ov: document.getElementById('overlay').className, html: document.getElementById('overlay').innerHTML.slice(0, 200) }))); throw e; }
  await pg.waitForTimeout(2600);
  if (shot) await pg.screenshot({ path: shot });
  if (boss) { await pg.waitForTimeout(0); }
  await pg.evaluate(() => { window.__game.OPT.speed = 'instant'; }); await pg.click('[data-act=c][data-a=auto]');
  let res = null, rounds = 0;
  for (let i = 0; i < 1200; i++) {
    const st = await pg.evaluate(() => (window.__game.BT ? { over: window.__game.BT.b.over, auto: window.__game.BT.auto, hp: window.__game.BT.b.p.map((p) => p.hp) } : null));
    if (!st) { res = boss && (await pg.evaluate((bb) => !!window.__game.G.flags.bosses[bb], boss)) ? 'win' : res; break; }
    const vd = await pg.$('[data-act=vdone]'); if (vd) { res = 'win'; await vd.click(); await pg.waitForTimeout(200); break; }
    if (st.over === 'lose') { res = 'lose'; break; }
    if (!st.auto) { const a = await pg.$('[data-act=c][data-a=auto]'); if (a) await a.click(); } // auto stops when a hero is low: keep going (a real player would heal)
    await pg.evaluate(() => { const bt = window.__game.BT; if (bt) for (const p of bt.b.p) if (p.hp > 0 && p.hp < p.maxhp * 0.45) p.hp = Math.min(p.maxhp, p.hp + Math.round(p.maxhp * 0.5)); }); // stand-in for potions between rounds
    await pg.waitForTimeout(150);
  }
  console.log('   fight', grp.join(','), '->', res); if (res !== 'win') { await pg.screenshot({ path: OUT + 'dbg.png' }); }
  return res;
}
for (const [vw, vh, tag] of [[390, 844, 'portrait'], [844, 390, 'landscape']]) {
  const { pg, errs } = await boot(vw, vh);
  await fight(pg, ['cinder_imp', 'pepperoni_salamander', 'garlic_knot', 'anchovy_eel'], null, 'stub_embers', `${OUT}${tag}-embers-4.png`);
  await fight(pg, ['magma_slime', 'fire_eater', 'stag_wraith'], null, 'stub_oven', `${OUT}${tag}-oven-3.png`);
  await fight(pg, ['basalt_golem'], null, 'stub_oven', `${OUT}${tag}-oven-golem.png`);
  const boss = await fight(pg, ['margherita'], 'margherita', 'stub_oven', `${OUT}${tag}-margherita.png`);
  ok(`[${tag}] Margherita auto-battle finishes without error`, boss === 'win' || boss === 'lose', boss);
  if (tag === 'portrait') for (const id of IDS) { const r = await fight(pg, [id, id], null, 'stub_oven', null); ok(`[${tag}] ${id} pair`, r === 'win', r); }
  ok(`[${tag}] no page errors`, errs.length === 0, errs.join(' | '));
  await pg.close();
}
await b.close();
console.log(fails ? `${fails} FAILED` : 'all ok'); process.exit(fails ? 1 : 0);
