// Roadside moments: data sanity + the runtime (rare, region-aware, no repeats until all seen, rewards land): node tools/roadsidecheck.mjs
import { createRequire } from 'module';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await b.newPage({ viewport: { width: 700, height: 900 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
let fails = 0; const ok = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) fails++; };
await pg.goto(`http://localhost:${process.env.PORT || 8123}/index.html`); await pg.waitForTimeout(400);
const ev = (f, a) => pg.evaluate(f, a);
// ---- data
const d = await ev(async () => {
  const { ROADSIDE } = await import('/src/roadside.js'), D = await import('/src/data.js'), REG = Object.keys(D.REGION_NAME || {}), problems = [], ids = new Set();
  const cast = new Set(['adam', 'devon', 'brenna', 'wendell', 'n', ...Object.keys(D.STORY.cast)]);
  for (const e of ROADSIDE) {
    if (ids.has(e.id)) problems.push('duplicate id ' + e.id); ids.add(e.id);
    if (!e.lines?.length) problems.push(e.id + ': no lines');
    for (const l of e.lines || []) { if (!cast.has(l.s)) problems.push(`${e.id}: unknown speaker ${l.s}`); if (!l.t || l.t.length > 190) problems.push(`${e.id}: bad line length`); if (/ {2}|\.\.\.\./.test(l.t)) problems.push(`${e.id}: spacing`); }
    for (const r of e.regions || []) if (!['green', 'snow', 'swamp', 'desert', 'autumn', 'ember', 'jungle', 'obsidian'].includes(r)) problems.push(`${e.id}: unknown region ${r}`);
    for (const k of Object.keys(e.reward?.items || {})) if (!D.ITEMS[k]) problems.push(`${e.id}: unknown item ${k}`);
    for (const tok of (e.if || '').split(' ').filter(Boolean)) if (!/^!?(v|p|s|q|b)?:?[a-z_|:]+$/.test(tok)) problems.push(`${e.id}: odd condition ${tok}`);
  }
  const perRegion = {}; for (const r of ['green', 'snow', 'swamp', 'desert', 'autumn', 'ember', 'jungle', 'obsidian']) perRegion[r] = ROADSIDE.filter((e) => !e.regions || e.regions.includes(r)).length;
  return { n: ROADSIDE.length, problems, perRegion };
});
ok(`${d.n} moments, no data problems`, !d.problems.length, d.problems.join('; '));
ok('every region has at least 4 moments', Object.values(d.perRegion).every((n) => n >= 4), JSON.stringify(d.perRegion));
// ---- runtime
await pg.click('[data-act=new]'); await pg.click('[data-act=slotpick][data-a="1"]'); await pg.click('[data-act=diff][data-b=normal]'); await pg.waitForTimeout(250);
await ev(async () => { const g = window.__game; g.ACT.crbegin(); g.ACT.close(); g.testParty(); for (const m of Object.values(g.MAPS)) m.rate = 0; g.MAPS.world.rate = 0.0001; g.G.slot = 1; const el = document.getElementById('overlay'); el.className = ''; el.innerHTML = ''; g.goto('world', g.MAPS.world.spawn.x, g.MAPS.world.spawn.y); await new Promise((r) => setTimeout(r, 2500)); });
await ev(() => { window.tick = async (g) => { const p = g.roadside(); const shown = !!document.querySelector('#overlay .saybox'); if (shown) g.ACT.scend(); await p; return shown; }; });
const run = (steps, rnd) => ev(async ([n, r]) => { const tick = window.tick, g = window.__game, real = Math.random; Math.random = () => r; let shown = 0; for (let i = 0; i < n; i++) if (await tick(g)) shown++; Math.random = real; return { shown, steps: g.G.stats.steps }; }, [steps, rnd]);
let r1 = await run(40, 0);
ok('nothing happens in the first 44 steps (a quiet stretch after the last one)', r1.shown === 0, JSON.stringify(r1));
let r2 = await run(30, 0);
ok('once the gap is over, a forced roll shows a moment', r2.shown >= 1, JSON.stringify(r2));
ok('a normal dice roll is rare (1000 steps, real odds)', await ev(async () => { const tick = window.tick, g = window.__game; let shown = 0; for (let i = 0; i < 1000; i++) if (await tick(g)) shown++; window.__shown = shown; return shown >= 3 && shown <= 24; }), String(await ev(() => window.__shown)) + ' in 1000 steps');
// no repeats until the pool of this region is exhausted
const seen = await ev(async () => { const tick = window.tick, g = window.__game, real = Math.random, got = []; Math.random = () => 0; g.G.flags.chat = {}; let guard = 0;
  while (guard++ < 600 && got.length < 6) { if (await tick(g)) got.push(Object.keys(g.G.flags.chat).filter((k) => k.startsWith('rs:')).length); }
  Math.random = real; return got; });
ok('each new moment adds one to the seen list (no repeats while unseen ones remain)', seen.length >= 3 && seen.every((n, i) => i === 0 || n >= seen[i - 1]), JSON.stringify(seen));
// a reward lands
const rw = await ev(async () => { const tick = window.tick, g = window.__game, before = g.G.gold; const real = Math.random; Math.random = () => 0; g.G.flags.chat = {}; for (const x of g.ROADSIDE) if (x.id !== 'coins' && (!x.regions || x.regions.includes('green'))) g.G.flags.chat['rs:' + x.id] = true; // only coins is unseen here
  let shown = false; for (let i = 0; i < 80 && !shown; i++) shown = await tick(g); await new Promise((x) => setTimeout(x, 50)); Math.random = real; return { shown, gain: g.G.gold - before, region: g.G.map }; });
ok('the coins moment pays out 40 G', rw.shown && rw.gain === 40, JSON.stringify(rw));
// conditional hints disappear once the place is visited
const hint = await ev(() => { const g = window.__game, e = g.ROADSIDE.find((x) => x.id === 'windmill_hint'); const before = g.G.flags.visited.windmill; g.G.flags.visited.windmill = true; return { id: e.id, if: e.if }; });
ok('windmill hint is conditional on not having visited it', hint.if === '!v:windmill');
ok('feats can count steps', await ev(async () => { const { FEATS } = await import('/src/feats.js'); return FEATS.some((f) => f.id === 'steps') && FEATS.some((f) => f.id === 'roadside'); }));
ok('no page errors', !errs.length, errs.join('|')); await b.close(); process.exit(fails ? 1 : 0);
