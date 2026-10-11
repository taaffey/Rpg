// Randomized playtest: a bot plays the real UI for thousands of actions and checks invariants.
//   node tools/fuzz.mjs [runs=3] [steps=1500] [url]
import { createRequire } from 'module';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const RUNS = +process.argv[2] || 3, STEPS = +process.argv[3] || 1500, URL_ = process.argv[4] || 'http://localhost:8123/index.html';
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let totalIssues = 0;
for (let run = 0; run < RUNS; run++) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => m.type() === 'error' && !/fonts|ERR_|Failed to load/.test(m.text()) && errs.push('CONSOLE ' + m.text()));
  await pg.goto(URL_); await pg.waitForTimeout(400);
  await pg.click('[data-act=new]'); await pg.click('[data-act=slotpick][data-a="1"]'); await pg.click('[data-act=diff][data-b=normal]'); await pg.waitForTimeout(200); await pg.click('[data-act=close]');
  const result = await pg.evaluate(async ([steps, seed, strong]) => {
    const g = window.__game; g.OPT.speed = 'instant'; g.OPT.shake = false;
    if (strong) g.G.party.forEach((c) => { c.level = 20; c.hp = c.mp = 9999; }); // endgame-strength party: wins fights, reaches bosses and the ending
    let s = seed; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296), pick = (a) => a[Math.floor(rnd() * a.length)];
    const issues = [], seenIssue = new Set(); const note = (m) => { if (!seenIssue.has(m)) { seenIssue.add(m); issues.push(m); } };
    for (const m of Object.values(g.MAPS)) if (m.rate) m.rate = Math.max(m.rate, strong ? 0.3 : 0.12); // more fights
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const DENY = /^(title|slotdel|new|cont|opts|optback)$/; // keep the bot in the game
    const maps = Object.keys(g.MAPS);
    const check = () => {
      const G = g.G; if (!G) return note('G missing');
      for (const c of G.party) {
        for (const k of ['hp', 'mp', 'level', 'exp']) if (!Number.isFinite(c[k])) note(`NaN ${k} on ${c.name}`);
        if (c.hp < 0) note(`negative hp ${c.name}`); if (c.level < 1 || c.level > 20) note(`bad level ${c.level}`);
        for (const arr of c.gems) if (!Array.isArray(arr)) note('gems shape');
      }
      if (!Number.isFinite(G.gold) || G.gold < 0) note(`gold ${G.gold}`);
      for (const [k, n] of Object.entries(G.inv.items)) if (!(n >= 0) || !Number.isInteger(n)) note(`item ${k}=${n}`);
      for (const k of ['weapons', 'armors', 'accs', 'gems']) if (G.inv[k].some((x) => x == null)) note(`null in inv.${k}`);
      const m = g.MAPS[G.map]; if (!m) return note(`unknown map ${G.map}`);
      const t = m.rows[G.y]?.[G.x]; if (t === undefined || t === '#' || t === '~') note(`standing on '${t}' at ${G.map} ${G.x},${G.y}`);
    };
    let stuckSince = null, battles = 0, maxBusyMs = 0, busySince = null;
    for (let i = 0; i < steps; i++) {
      const ov = document.getElementById('overlay'), open = ov.classList.contains('on');
      if (g.BT) { busySince ??= performance.now(); maxBusyMs = Math.max(maxBusyMs, performance.now() - busySince); } else busySince = null;
      if (open) {
        const btns = [...ov.querySelectorAll('[data-act]')].filter((e) => !e.disabled && !DENY.test(e.dataset.act));
        if (!btns.length) {
          stuckSince ??= performance.now();
          if (performance.now() - stuckSince > 6000) { const bt = g.BT; note(`overlay with no actions for 6s: "${ov.querySelector('h2')?.textContent || 'battle'}" ${bt ? JSON.stringify({ over: bt.b.over, ask: !!bt.ask, party: bt.b.p.map((x) => x.hp), foes: bt.b.e.map((x) => x.hp), last: bt.log.slice(-3) }) : '(no BT)'}`); ov.className = ''; stuckSince = null; }
          await wait(60); continue;
        }
        stuckSince = null;
        let el;
        if (g.BT) { const nf = btns.filter((e) => !(e.dataset.act === 'c' && e.dataset.a === 'flee')); el = rnd() < 0.7 ? pick(nf.filter((e) => ['attack', 'cast', 'tgt', 'repeat', 'auto'].includes(e.dataset.a) || e.dataset.act === 'tgt')) || pick(btns) : pick(btns); if (rnd() < 0.15) for (const e of g.BT.b.e) e.hp = Math.min(e.hp, 5 + Math.floor(rnd() * 30)); }
        else el = rnd() < 0.2 ? btns.find((e) => ['close', 'leave', 'menu', 'bmain', 'bclose'].includes(e.dataset.act)) || pick(btns) : pick(btns);
        el.click(); await wait(g.BT ? 40 : 12);
      } else {
        const r = rnd();
        if (r < 0.9) { const d = pick([[0, 1], [0, -1], [1, 0], [-1, 0]]); g.step(...d); /* not awaited: step() resolves only when a triggered battle ends */ await wait(25); }
        else if (r < 0.95) document.getElementById('hudmenu').click();
        else if (strong && r < 0.965 && !g.BT) { const bs = ['wyrm', 'lich', 'titan', 'storm_drake']; const id = pick(bs); g.battle([id], id); }
        else { const to = pick(maps), m = g.MAPS[to], sp = m.spawn; g.goto(to, sp.x, sp.y); }
        if (g.BT) battles++;
      }
      if (i % 5 === 0) check();
      if (rnd() < 0.01) { g.G.gold += 500; g.G.party.forEach((c) => { if (rnd() < 0.3) c.hp = 1; }); } // exercise shops + low hp
    }
    check();
    return { issues, battles, maxBusyMs: Math.round(maxBusyMs), maps: Object.keys(g.G.flags.visited).length, level: Math.max(...g.G.party.map((c) => c.level)), wins: g.G.stats?.wins || 0, quests: Object.keys(g.G.flags.quests).length };
  }, [STEPS, 1234 + run * 777, run % 2 === 1]);
  const all = [...result.issues, ...errs];
  totalIssues += all.length;
  console.log(`run ${run + 1}${run % 2 === 1 ? ' (strong)' : ''}: ${all.length ? 'ISSUES' : 'clean'}  steps=${STEPS} battles=${result.wins} maps=${result.maps} maxLevel=${result.level} quests=${result.quests} longestBattle=${result.maxBusyMs}ms${all.length ? '\n   - ' + all.join('\n   - ') : ''}`);
  await ctx.close();
}
await b.close(); console.log(totalIssues ? `${totalIssues} issue(s)` : 'FUZZ CLEAN'); process.exit(totalIssues ? 1 : 0);
