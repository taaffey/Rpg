// Headless balance sim for the four side-quest dungeons (src/sidequests.js): random-encounter survival and boss win rates at the
// intended levels, party sizes 2-4, on 'normal'. Same bot as tools/progress.mjs (no potions, no hand-healing between rounds).
// usage: node tools/sidequests_sim.mjs [runs=40] [diff=normal] [windmill|wreck|pyramid|icecave]
import { Battle, newChar, stats, slotSkill, slotGems, skillWithGems, SIG, learnable, rewards } from '../src/logic.js';
import { DIFFICULTY, ENCOUNTERS } from '../src/data.js';
import { PARTY_SCALE } from '../src/bros.js';
import '../src/sidequests.js';
const CP_AT_LEVEL = [0, 0, 3, 8, 14, 22, 32, 40, 50, 60, 75, 95, 115, 130, 150, 170, 190, 210, 230, 250, 270];
const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const RUNS = +process.argv[2] || 40, DIFF = ['easy', 'normal', 'hard'].includes(process.argv[3]) ? process.argv[3] : 'normal';
const JOBS = [['Adam', 'knight'], ['Devon', 'mage'], ['Brenna', 'cleric'], ['Wendell', 'knight']];
// [weapon, armor, acc] per hero: a sensible kit for the stage at two levels (the low end and the high end of the band)
const KIT = {
  windmill: { 6: [['flame_brand', 'chain', null], ['storm_rod', 'mage_cloak', null], ['healing_staff', 'leather', null], ['iron_sword', 'leather', null]], 8: [['flame_brand', 'chain', 'power_ring'], ['storm_rod', 'mage_cloak', 'mana_charm'], ['healing_staff', 'chain', null], ['flame_brand', 'leather', null]] },
  wreck: { 12: [['mythril_sword', 'plate', 'life_charm'], ['sage_staff', 'frost_robe', 'sage_ring'], ['healing_staff', 'mage_cloak', 'mana_charm'], ['mythril_sword', 'chain', 'power_ring']], 14: [['dragonbane', 'mythril_mail', 'life_charm'], ['sage_staff', 'frost_robe', 'sage_ring'], ['sage_staff', 'mythril_mail', 'life_charm'], ['frostbrand', 'plate', 'power_ring']] },
  pyramid: { 13: [['mythril_sword', 'plate', 'life_charm'], ['sage_staff', 'frost_robe', 'sage_ring'], ['sage_staff', 'mage_cloak', 'mana_charm'], ['mythril_sword', 'mythril_mail', 'power_ring']], 16: [['dragonbane', 'mythril_mail', 'life_charm'], ['lich_staff', 'lich_robes', 'sage_ring'], ['sage_staff', 'frost_robe', 'life_charm'], ['frostbrand', 'plate', 'berserk_ring']] },
  icecave: { 15: [['dragonbane', 'mythril_mail', 'life_charm'], ['sage_staff', 'frost_robe', 'sage_ring'], ['sage_staff', 'mythril_mail', 'life_charm'], ['frostbrand', 'plate', 'power_ring']], 18: [['dragonbane', 'dragon_mail', 'life_charm'], ['lich_staff', 'lich_robes', 'sage_ring'], ['sage_staff', 'frost_robe', 'life_charm'], ['frostbrand', 'mythril_mail', 'berserk_ring']] },
};
const BOSS = { windmill: 'miller', wreck: 'captain_barnacle', pyramid: 'clerk_pharaoh', icecave: 'frozen_angler' };
function mk(n, lv, kit) {
  return JOBS.slice(0, n).map(([nm, job], i) => {
    const c = newChar(nm, job, null, kit[i][0], kit[i][1], lv); c.acc = kit[i][2]; c.cp[job] = CP_AT_LEVEL[lv];
    const ok = learnable(c); c.slots = [0, 1, 2, 3].map((k) => ok.slice(-4).reverse()[k] || null); return c;
  });
}
function bot(b, rng, pool) {
  const cmds = new Map();
  for (const p of b.p.filter((x) => x.hp > 0)) {
    const ko = b.p.find((x) => x.hp <= 0), hurt = b.p.filter((x) => x.hp > 0 && x.hp < x.maxhp * 0.5).sort((a, c) => a.hp / a.maxhp - c.hp / c.maxhp)[0];
    let best = null, bs = -1;
    for (const i of [0, 1, 2, 3, SIG]) {
      const sid = slotSkill(p.ch, i); if (!sid) continue; const gems = slotGems(p.ch, i), s = skillWithGems(sid, gems); if (p.mp < s.mp) continue;
      if (ko && s.fx.includes('revive')) { best = { kind: 'skill', skillId: sid, gems, target: ko }; bs = 1000; break; }
      if (s.kind === 'heal' && s.pow && hurt && s.tgt !== 'self') { best = { kind: 'skill', skillId: sid, gems, target: hurt }; bs = 999; continue; }
      if (s.kind !== 'phys' && s.kind !== 'mag') continue;
      const stat = s.kind === 'phys' ? p.atk : p.mag, sc = stat * s.pow * s.hits * (s.tgt === 'all' ? Math.min(2.2, b.e.filter((x) => x.hp > 0).length) : 1) * (1 + rng() * 0.2);
      if (sc > bs) { bs = sc; best = { kind: 'skill', skillId: sid, gems, target: b.e.filter((x) => x.hp > 0).sort((x, y) => x.hp - y.hp)[0] }; }
    }
    const atk = p.atk * (p.wpn?.hits > 1 ? 1.2 : 1);
    if (!best || (bs < atk && bs < 999)) best = { kind: 'skill', skillId: 'attack', gems: [], target: b.e.filter((x) => x.hp > 0).sort((x, y) => x.hp - y.hp)[0] };
    if (pool && bs < 999) { // boss fights: the party shares a bag of items (potions, one kebab) and uses them when someone is in trouble
      const low = b.p.filter((x) => x.hp > 0 && x.hp < x.maxhp * 0.35).sort((a, c) => a.hp / a.maxhp - c.hp / c.maxhp)[0], dead = b.p.find((x) => x.hp <= 0);
      if (dead && pool.phoenix > 0) { pool.phoenix--; best = { kind: 'item', item: 'phoenix', target: dead }; }
      else if (low) { const it = pool.elixir > 0 && low.maxhp * 0.6 > 160 ? 'elixir' : pool.hipotion > 0 ? 'hipotion' : pool.potion > 0 ? 'potion' : null; if (it) { pool[it]--; best = { kind: 'item', item: it, target: low }; } }
    }
    cmds.set(p, best);
  }
  return cmds;
}
function fight(party, grp, rng, boss, pool) {
  const mod = { ...DIFFICULTY[DIFF].mod }, ps = !boss && PARTY_SCALE[party.length]; if (ps) { mod.hp *= ps.hp; mod.atk *= ps.atk; mod.mag *= ps.atk; }
  const b = new Battle(party, grp, rng, !!boss, mod); let r = 0;
  while (!b.over && r++ < 80) for (const _ of b.round(bot(b, rng, pool)));
  b.p.forEach((x) => { x.ch.hp = x.hp; x.ch.mp = x.mp; });
  return { b, rounds: r };
}
const heal = (party) => party.forEach((c) => { const s = stats(c); c.hp = s.hp; c.mp = s.mp; });
const only = process.argv.find((a) => BOSS[a]);
if (process.argv.includes('ref')) { // calibration: how the existing optional/story bosses fare with the same bot, kits and item bag
  for (const [dg, lv, boss] of [['windmill', 8, 'wyrm'], ['wreck', 14, 'lich'], ['pyramid', 16, 'sphinx'], ['icecave', 18, 'titan'], ['icecave', 15, 'titan']]) {
    for (const n of [2, 3, 4]) { let w = 0; for (let k = 0; k < RUNS; k++) { const party = mk(n, lv, KIT[dg][lv]); heal(party); const { b } = fight(party, [boss], mulberry(k * 101 + 7 + n), boss, dg === 'windmill' ? { potion: 4, hipotion: 2, phoenix: 1 } : { hipotion: 5, elixir: 1, phoenix: 1 }); if (b.over === 'win') w++; } console.log(`ref ${boss} L${lv} party ${n}: win ${(w / RUNS * 100).toFixed(0)}%`); }
  }
  process.exit(0);
}
for (const [dg, kits] of Object.entries(KIT)) {
  if (only && dg !== only) continue;
  for (const [lvS, kit] of Object.entries(kits)) {
    const lv = +lvS; console.log(`\n== ${dg} L${lv} (${DIFF})   enc cells: win% / party HP lost% (* = elite)`);
    for (const n of [2, 3, 4]) {
      const rows = ENCOUNTERS[dg].map((g, gi) => {
        let w = 0, lost = 0;
        for (let k = 0; k < RUNS; k++) { const party = mk(n, lv, kit); heal(party); const hp0 = party.reduce((s, c) => s + c.hp, 0), { b } = fight(party, g, mulberry(gi * 977 + k * 31 + n), null); if (b.over === 'win') w++; lost += 1 - party.reduce((s, c) => s + c.hp, 0) / hp0; }
        return `${(w / RUNS * 100).toFixed(0)}/${(lost / RUNS * 100).toFixed(0)}${gi >= 6 ? '*' : ''}`;
      });
      let bw = 0, br = 0, bl = 0;
      for (let k = 0; k < RUNS; k++) { const party = mk(n, lv, kit); heal(party); const { b, rounds } = fight(party, [BOSS[dg]], mulberry(k * 101 + 7 + n), BOSS[dg], dg === 'windmill' ? { potion: 4, hipotion: 2, phoenix: 1 } : { hipotion: 5, elixir: 1, phoenix: 1 }); if (b.over === 'win') bw++; br += rounds; bl += party.filter((c) => c.hp <= 0).length; }
      console.log(`party ${n}: ${rows.join(' ')} | boss ${BOSS[dg]} win ${(bw / RUNS * 100).toFixed(0)}% rounds ${(br / RUNS).toFixed(1)} KOs ${(bl / RUNS).toFixed(1)}`);
    }
  }
}
