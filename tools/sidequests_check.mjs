// Side-quest battle check: every new foe (pairs) and the four bosses, auto-battled at the dungeon's level, plus screenshots (portrait + landscape).
// usage: PORT=8128 OUT=/tmp/sq/ node tools/sidequests_check.mjs   (needs: python3 -m http.server 8128 in the repo root)
// It imports src/sidequests.js itself and stubs the map ids it needs, so it works before the real dungeon maps exist.
import { createRequire } from 'module';
import { mkdirSync } from 'fs';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const OUT = process.env.OUT || '/tmp/sq/'; mkdirSync(OUT, { recursive: true });
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
// dungeon: [stub theme, level, gear per hero, foes, boss]
const DG = {
  windmill: { theme: 'cellar', lv: 7, gear: [['flame_brand', 'chain', 'power_ring'], ['storm_rod', 'mage_cloak', 'mana_charm'], ['healing_staff', 'chain', null], ['flame_brand', 'leather', null]], ids: ['wm_mouse', 'wm_goose', 'wm_imp', 'wm_ghost'], boss: 'miller' },
  wreck: { theme: 'crypt', lv: 13, gear: [['dragonbane', 'mythril_mail', 'life_charm'], ['sage_staff', 'frost_robe', 'sage_ring'], ['sage_staff', 'mythril_mail', 'life_charm'], ['frostbrand', 'plate', 'power_ring']], ids: ['wr_sailor', 'wr_crab', 'wr_barnacle', 'wr_parrot'], boss: 'captain_barnacle' },
  pyramid: { theme: 'ruins', lv: 15, gear: [['dragonbane', 'mythril_mail', 'life_charm'], ['lich_staff', 'lich_robes', 'sage_ring'], ['sage_staff', 'frost_robe', 'life_charm'], ['frostbrand', 'plate', 'berserk_ring']], ids: ['py_mummy', 'py_scarab', 'py_golem', 'py_cobra'], boss: 'clerk_pharaoh' },
  icecave: { theme: 'spire', lv: 17, gear: [['dragonbane', 'dragon_mail', 'life_charm'], ['lich_staff', 'lich_robes', 'sage_ring'], ['sage_staff', 'frost_robe', 'life_charm'], ['frostbrand', 'mythril_mail', 'berserk_ring']], ids: ['ic_fisher', 'ic_eel', 'ic_yeti', 'ic_wisp'], boss: 'frozen_angler' },
};
let fails = 0; const ok = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) fails++; };
async function boot(vw, vh) {
  const touch = vw < 800, pg = await b.newPage({ viewport: { width: vw, height: vh }, hasTouch: touch, isMobile: touch }), errs = [];
  pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => m.type() === 'error' && !/fonts|ERR_|Failed to load/.test(m.text()) && errs.push(m.text()));
  await pg.goto(`http://localhost:${process.env.PORT || 8128}/index.html`); await pg.waitForTimeout(400);
  await pg.evaluate(() => { window.__game.ACT.diff(1, 'normal'); }); await pg.waitForTimeout(400);
  await pg.evaluate(async (DG) => {
    await import('/src/sidequests.js'); const g = window.__game, G = g.G;
    document.getElementById('overlay').className = ''; document.getElementById('overlay').innerHTML = '';
    g.testParty(); G.flags.bosses.titan = true; G.stats = G.stats || {}; G.stats.wins = 20;
    // stub maps so the stage picks the right backdrop (real theme stays 'cavern' for the terrain drawer; only stageKind() sees the key)
    for (const [id, d] of Object.entries(DG)) g.MAPS['stub_' + id] = Object.create(g.MAPS.cavern, { theme: { get() { return new Error().stack.includes('stageKind') ? d.theme : 'cavern'; } } });
  }, DG);
  return { pg, errs };
}
const setLevel = (pg, d) => pg.evaluate(async (d) => { const L = await import('/src/logic.js'); window.__game.G.party.forEach((c, i) => { c.level = d.lv; [c.weapon, c.armor, c.acc] = d.gear[i]; c.cp[c.main] = 130; const s = L.stats(c); c.hp = s.hp; c.mp = s.mp; }); }, d);
const heal = (pg) => pg.evaluate(async () => { const L = await import('/src/logic.js'); for (const c of window.__game.G.party) { const s = L.stats(c); c.hp = s.hp; c.mp = s.mp; } });
async function settle(pg) { // clear victory/loot overlays until the map is idle again
  for (let i = 0; i < 40; i++) { const st = await pg.evaluate(() => ({ bt: !!window.__game.BT, ov: document.getElementById('overlay').classList.contains('on') }));
    if (!st.bt && !st.ov) return; const vd = await pg.$('[data-act=vdone]'); if (vd) await vd.click(); else await pg.keyboard.press(st.ov ? 'Enter' : 'Escape'); await pg.waitForTimeout(150); }
}
async function fight(pg, grp, boss, map, shot) {
  await settle(pg); await heal(pg); await pg.evaluate(() => { window.__game.OPT.speed = 'normal'; });
  await pg.evaluate(([m, g, bs]) => { window.__game.G.map = m; window.__game.battle(g, bs); }, [map, grp, boss]);
  try { await pg.waitForSelector('[data-act=c]', { timeout: 15000 }); } catch (e) { await pg.screenshot({ path: OUT + 'dbg.png' }); throw e; }
  await pg.waitForTimeout(2600);
  if (shot) await pg.screenshot({ path: shot });
  await pg.evaluate(() => { window.__game.OPT.speed = 'instant'; }); await pg.click('[data-act=c][data-a=auto]');
  let res = null;
  for (let i = 0; i < 1500; i++) {
    const st = await pg.evaluate(() => (window.__game.BT ? { over: window.__game.BT.b.over, auto: window.__game.BT.auto } : null));
    if (!st) { res = boss && (await pg.evaluate((bb) => !!window.__game.G.flags.bosses[bb], boss)) ? 'win' : res; break; }
    const vd = await pg.$('[data-act=vdone]'); if (vd) { res = 'win'; await vd.click(); await pg.waitForTimeout(200); break; }
    if (st.over === 'lose') { res = 'lose'; break; }
    if (!st.auto) { const a = await pg.$('[data-act=c][data-a=auto]'); if (a) await a.click(); }
    await pg.evaluate(() => { const bt = window.__game.BT; if (bt) for (const p of bt.b.p) if (p.hp > 0 && p.hp < p.maxhp * 0.45) p.hp = Math.min(p.maxhp, p.hp + Math.round(p.maxhp * 0.5)); }); // stand-in for potions between rounds
    await pg.waitForTimeout(150);
  }
  console.log('   fight', grp.join(','), '->', res); if (res !== 'win') await pg.screenshot({ path: OUT + 'dbg.png' });
  return res;
}
for (const [vw, vh, tag] of [[390, 844, 'portrait'], [844, 390, 'landscape']]) {
  const { pg, errs } = await boot(vw, vh);
  for (const [id, d] of Object.entries(DG)) {
    await setLevel(pg, d);
    await fight(pg, d.ids.slice(0, 4), null, 'stub_' + id, `${OUT}${tag}-${id}-4.png`);
    const boss = await fight(pg, [d.boss], d.boss, 'stub_' + id, `${OUT}${tag}-${id}-boss.png`);
    ok(`[${tag}] ${d.boss} auto-battle finishes without error`, boss === 'win' || boss === 'lose', boss);
    if (tag === 'portrait') for (const e of d.ids) { const r = await fight(pg, [e, e], null, 'stub_' + id, null); ok(`[${tag}] ${e} pair`, r === 'win', r); }
  }
  ok(`[${tag}] no page errors`, errs.length === 0, errs.join(' | '));
  await pg.close();
}
await b.close();
console.log(fails ? `${fails} FAILED` : 'all ok'); process.exit(fails ? 1 : 0);
