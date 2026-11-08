// Shared by the balance sims: what a player who READS the wind-up strip would do (see tools/skillsim.mjs).
// skilledLayer(b, cmds, stagger) takes the commands a basic bot picked and, while a boss is winding up, rewrites them:
//   stagger on  → if the heroes who act before the attack lands can fill the bar, they all go all-out at the boss (healing is left alone);
//                 otherwise the heroes the unleash could drop Guard
//   stagger off → only the Guard half
import { slotSkill, slotGems, skillWithGems, SIG } from '../src/logic.js';
// healing, buffs, items and revives are left alone: only a hero who was going to deal damage anyway is told what to do
export const isSupport = (c) => !c || c.kind !== 'skill' || !['phys', 'mag'].includes(skillWithGems(c.skillId, c.gems).kind) || skillWithGems(c.skillId, c.gems).fx?.includes('revive');
// what one hero would do to the boss right now if it went all out (the engine's own damage maths, wind-up bonus included)
export function bestHit(b, p, boss) {
  let cmd = { kind: 'skill', skillId: 'attack', gems: [], target: boss }, dmg = b.damage(p, boss, skillWithGems('attack', []));
  for (const i of [0, 1, 2, 3, SIG]) {
    const sid = slotSkill(p.ch, i); if (!sid) continue;
    const gems = slotGems(p.ch, i), s = skillWithGems(sid, gems); if (p.mp < s.mp || (s.kind !== 'phys' && s.kind !== 'mag')) continue;
    const d = b.damage(p, boss, s) * (s.hits || 1); if (d > dmg) { dmg = d; cmd = { kind: 'skill', skillId: sid, gems, target: boss }; }
  }
  return { cmd, dmg };
}
export const unleashAt = (b, boss, c, h) => { b.bonus = c.mult; try { return b.damage(boss, h, skillWithGems(c.skill, [])); } finally { b.bonus = 1; } };
export function skilledLayer(b, cmds, stagger = true) {
  const boss = b.e.find((e) => e.hp > 0 && e.charge); if (!boss) return cmds;
  const c = boss.charge, alive = b.p.filter((x) => x.hp > 0);
  const first = alive.filter((p) => p.spd >= boss.spd); // who acts before the boss's next action: only they count towards the stagger
  const hits = new Map(first.map((p) => [p, bestHit(b, p, boss)])), total = [...hits.values()].reduce((n, h) => n + h.dmg, 0);
  if (stagger && total >= (c.need - c.dmg) * 1.1) { for (const p of first) if (!isSupport(cmds.get(p))) cmds.set(p, hits.get(p).cmd); return cmds; }
  for (const p of alive) if (p.hp < unleashAt(b, boss, c, p) * 1.05 && !isSupport(cmds.get(p))) cmds.set(p, { kind: 'defend' });
  return cmds;
}
// the cadence-counting upper bound: the round a wind-up will start, everyone goes all-out (the slow heroes land inside the window)
export function oracleLayer(b, cmds) {
  skilledLayer(b, cmds, true);
  const boss = b.e.find((e) => e.hp > 0 && e.mech?.charge && !e.charge);
  if (boss && (boss.cyc + 1) % boss.mech.charge.every === 0) for (const p of b.p.filter((x) => x.hp > 0)) if (!isSupport(cmds.get(p))) cmds.set(p, bestHit(b, p, boss).cmd);
  return cmds;
}
