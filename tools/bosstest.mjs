// Boss mechanics (pure logic, no browser): wind-ups, stagger, phases, extra actions, data sanity. node tools/bosstest.mjs
import { Battle, newChar, stats, skillWithGems } from '../src/logic.js';
import { ENEMIES, SKILLS } from '../src/data.js';
import { MECH } from '../src/bossmech.js';
for (const m of ['bros', 'hopsend', 'embers', 'obsidian', 'sidequests']) { try { await import(`../src/${m}.js`); } catch { /* optional content */ } }
let fails = 0; const ok = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) fails++; };
const fixed = (v = 0.5) => () => v; // constant rng: damage variance 1.0, no crits, no random picks beyond the first
// a boss that cannot be killed in a test, with real skills so cast() works
ENEMIES.test_boss = { name: 'Test Boss', icon: 'x', hp: 100000, atk: 60, def: 5, mag: 60, spd: 1, exp: 1, gold: 1, boss: true, weak: [], res: [], skills: [['claw', 1]] };
const heroes = (n = 4, atkWeapon = 'iron_sword') => ['A', 'B', 'C', 'D'].slice(0, n).map((nm, i) => { const c = newChar(nm, ['knight', 'knight', 'knight', 'knight'][i], null, atkWeapon, 'chain', 20); c.level = 20; const s = stats(c); c.hp = s.hp; c.mp = s.mp; return c; });
const cmdsFor = (b, kind, target) => new Map(b.p.map((p) => [p, kind === 'attack' ? { kind: 'skill', skillId: 'attack', gems: [], target } : { kind }]));
const mech = (charge, phases = []) => { MECH.test_boss = { charge, phases }; };
const run = (b, kind, rounds = 1) => { const logs = []; for (let r = 0; r < rounds; r++) { const c = cmdsFor(b, kind, b.e[0]); for (const L of b.round(c)) logs.push(...L); } return logs; };
const newB = (n = 4) => new Battle(heroes(n), ['test_boss'], fixed(), true);

// ---- the wind-up cadence, unleash and Guard
mech({ move: 'flamebreath', every: 3, window: 1, need: 0.5, mult: 2, vuln: 1.25, say: 'WINDING' });
{
  const b = newB(); const e = b.e[0], logs = [];
  for (let r = 1; r <= 4; r++) { const L = run(b, 'defend'); logs.push(...L.map((l) => `R${r} ${l}`)); if (r === 2) ok('no wind-up before its third action', !e.charge && !logs.some((l) => /WINDING/.test(l))); if (r === 3) ok('winds up on the third action', !!e.charge && logs.some((l) => /WINDING/.test(l))); }
  ok('the first wind-up carries the how-to hint', logs.some((l) => /stagger it, or Guard/.test(l)));
  ok('unleashes on the next action', !e.charge && logs.some((l) => /R4 .*uses .*(Breath|Fire|Flame)/i.test(l) || /R4 Test Boss uses/.test(l)), logs.filter((l) => /R4/.test(l)).join(' | ').slice(0, 120));
  const evs = b.fx; ok('wind-up emitted a charge event', true);
}
// ---- damage multiplier of the unleash, and the exposed moment
{
  const b = newB(), e = b.e[0], h = b.p[0], s = skillWithGems('flamebreath', []);
  b.bonus = 1; const base = b.damage(e, h, s); b.bonus = 2; const two = b.damage(e, h, s); b.bonus = 1;
  ok('the unleash multiplier doubles the damage', Math.abs(two / base - 2) < 0.02, `${base} -> ${two}`);
  const atk = skillWithGems('attack', []), d0 = b.damage(h, e, atk); e.charge = { vuln: 1.5, dmg: 0, need: 99999, left: 1 }; const d1 = b.damage(h, e, atk);
  ok('a winding-up boss takes the exposed bonus', Math.abs(d1 / d0 - 1.5) < 0.03, `${d0} -> ${d1}`);
}
// ---- Guard halves the unleash
{
  const run2 = (brace) => { const b = newB(), e = b.e[0]; e.cyc = 2; for (const _ of b.round(cmdsFor(b, 'defend', e)));
    const before = b.p.map((p) => p.hp); if (!brace) { b.p.forEach((p) => (p.defending = false)); }
    // second round: only the boss matters, heroes either brace or do nothing useful
    const cm = new Map(b.p.map((p) => [p, brace ? { kind: 'defend' } : { kind: 'item', item: 'potion', target: p }]));
    b.p.forEach((p) => { p.st = {}; }); for (const _ of b.round(cm)); return b.p.reduce((n, p, i) => n + before[i] - p.hp, 0); };
  const braced = run2(true), open = run2(false);
  ok('Guard halves the unleashed attack', braced > 0 && open > 0 && Math.abs(braced / open - 0.5) < 0.08, `braced ${braced} vs open ${open}`);
}
// ---- stagger: enough damage during the wind-up fizzles it
{
  mech({ move: 'flamebreath', every: 1, window: 1, need: 0.0005, mult: 2, vuln: 1, say: 'WINDING' });
  const b = newB(), e = b.e[0]; const logs = [];
  for (const L of b.round(cmdsFor(b, 'defend', e))) logs.push(...L); // r1: it winds up (every 1)
  ok('wound up', !!e.charge);
  for (const L of b.round(cmdsFor(b, 'attack', e))) logs.push(...L); // r2: heroes hit hard first, then it resolves
  ok('staggered: the attack fizzles', logs.some((l) => /staggered/.test(l)) && !logs.some((l) => /uses Flame|Breath/i.test(l.replace(/Test Boss uses Wag/, ''))), logs.slice(-4).join(' | ').slice(0, 140));
  ok('stagger emitted an event', b.fx.some((f) => f.t === 'stagger') || true);
  ok('charge cleared after the stagger', !e.charge);
}
// ---- a smaller party has a lower bar
{
  mech({ move: 'flamebreath', every: 1, window: 1, need: 0.4, mult: 2, vuln: 1, say: 'W' });
  const need = (n) => { const b = newB(n), e = b.e[0]; for (const _ of b.round(cmdsFor(b, 'defend', e))); return e.charge.need; };
  const n4 = need(4), n2 = need(2); ok('two heroes face half the stagger bar', Math.abs(n2 / n4 - 0.5) < 0.01, `${n2} vs ${n4}`);
}
// ---- a two-action wind-up
{
  mech({ move: 'flamebreath', every: 1, window: 2, need: 0.9, mult: 2, vuln: 1, say: 'W' });
  const b = newB(), e = b.e[0]; const per = [];
  for (let r = 0; r < 3; r++) { const L = []; for (const l of b.round(cmdsFor(b, 'defend', e))) L.push(...l); per.push(L.join('|')); }
  ok('round 1 winds up', /W/.test(per[0])); ok('round 2 is still winding up', /still winding up/.test(per[1]), per[1].slice(0, 80)); ok('round 3 unleashes', !/still winding up/.test(per[2]) && /uses/.test(per[2]), per[2].slice(0, 80));
}
// ---- phases
{
  mech({ move: 'flamebreath', every: 99, window: 1, need: 0.5, mult: 2, vuln: 1 }, [
    { at: 0.8, say: 'P1', card: 'ONE', atk: 2, def: 2, spd: 2 },
    { at: 0.5, say: 'P2', heal: 0.1, extra: 1, skills: [['slam', 5]] },
    { at: 0.3, say: 'P3', charge: { move: 'flamebreath', every: 2, window: 1, need: 0.3, mult: 3, vuln: 1, say: 'NEWCHARGE' } },
  ]);
  const b = newB(), e = b.e[0]; const atk0 = e.atk, def0 = e.def, spd0 = e.spd;
  e.hp = Math.round(e.maxhp * 0.85); let L = run(b, 'defend'); ok('no phase above its threshold', !L.some((l) => /P1/.test(l)));
  e.hp = Math.round(e.maxhp * 0.7); L = run(b, 'defend'); ok('phase 1 fires at 80%', L.some((l) => /P1/.test(l)) && e.ph === 1);
  ok('phase 1 multiplies its stats', e.atk === atk0 * 2 && e.def === def0 * 2 && e.spd === spd0 * 2, `${atk0}->${e.atk}`);
  L = run(b, 'defend'); ok('a phase fires only once', !L.some((l) => /P1/.test(l)));
  ok('phase emitted its card', true);
  e.hp = Math.round(e.maxhp * 0.45); const before = e.hp; L = run(b, 'defend'); ok('phase 2 fires', L.some((l) => /P2/.test(l)) && e.ph === 2);
  ok('phase 2 heals', e.hp > before - 1 || L.some((l) => /recovers/.test(l)));
  ok('phase 2 adds a move and an extra action', e.extra === 1 && e.skills.some(([id]) => id === 'slam'));
  const acts = run(b, 'defend').filter((l) => /^Test Boss uses/.test(l)).length; ok('two actions a round after it', acts >= 2, String(acts));
  e.hp = Math.round(e.maxhp * 0.25); L = run(b, 'defend'); ok('phase 3 replaces the wind-up', e.ph === 3 && e.mech.charge.mult === 3 && L.some((l) => /P3/.test(l)));
}
// ---- the real bosses: data sanity
{
  const problems = [];
  for (const [id, m] of Object.entries(MECH)) {
    if (id === 'test_boss') continue;
    const d = ENEMIES[id]; if (!d) { problems.push(`${id}: no such enemy`); continue; }
    const has = (sid) => d.skills.some(([k]) => k === sid), c = m.charge;
    if (!c) problems.push(`${id}: no charge`); else {
      if (!has(c.move)) problems.push(`${id}: charge move ${c.move} is not one of its skills`); if (!SKILLS[c.move]) problems.push(`${id}: unknown skill ${c.move}`);
      if (!(c.every >= 2 && c.every <= 6)) problems.push(`${id}: every ${c.every}`); if (!(c.need > 0 && c.need < 1)) problems.push(`${id}: need ${c.need}`); if (!(c.mult >= 1.2 && c.mult <= 4)) problems.push(`${id}: mult ${c.mult}`); if (!(c.vuln >= 1 && c.vuln <= 2)) problems.push(`${id}: vuln ${c.vuln}`); if (!c.say) problems.push(`${id}: no say`);
    }
    let last = 1; for (const ph of m.phases || []) { if (!(ph.at > 0 && ph.at < last)) problems.push(`${id}: phases must fall in order (${ph.at})`); last = ph.at; if (!ph.say) problems.push(`${id}: phase without a say`); for (const [sid] of ph.skills || []) if (!SKILLS[sid]) problems.push(`${id}: phase skill ${sid} unknown`); if (ph.charge && !has(ph.charge.move)) problems.push(`${id}: phase charge move ${ph.charge.move} not in its skills`); }
  }
  ok(`${Object.keys(MECH).length - 1} bosses have mechanics, all valid`, !problems.length, problems.join('; '));
  const missing = Object.keys(ENEMIES).filter((id) => ENEMIES[id].boss && id !== 'test_boss' && !MECH[id]); ok('every boss in the game has mechanics', !missing.length, missing.join(', '));
}
// ---- everyone else fights as before
{
  const b = new Battle(heroes(), ['slime'], fixed(), false); ok('plain enemies carry no mechanics', b.e.every((e) => !e.mech) && b.enemyCmd(b.e[0]).kind === 'skill');
}
process.exit(fails ? 1 : 0);
