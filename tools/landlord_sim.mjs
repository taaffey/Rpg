// Obsidian Ruins balance sim (pure logic, no browser): a level-20 party in the best gear against every foe and the Landlord of the Void.
//   node tools/landlord_sim.mjs [boss|regular|all] [N]     MODE=smart|dumb  GEAR=old|kiosk|new  PARTY=4|3
// "dumb" never uses the Landlord's weakness (holy / bolt) and keeps its buffs to a minimum; "smart" exploits both and buffs/heals well.
import * as D from '../src/data.js';
import '../src/hopsend.js'; import '../src/embers.js'; import '../src/sidequests.js'; import '../src/obsidian.js';
import * as L from '../src/logic.js';
const { Battle, stats, newChar, slotGems, SIG } = L;
const [what = 'boss', N = '300'] = process.argv.slice(2), MODE = process.env.MODE || 'smart', GEAR = process.env.GEAR || 'old', SIZE = +(process.env.PARTY || 4);
// ---- seeded rng
const mk = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
// ---- the party: best gear that existed before the Ruins ('old') or with the new kiosk/boss gear ('new')
const GEARSET = {
  old: { sam: ['pizza_cutter', 'pepperoni_plate', 'corkscrew'], pal: ['sun_blade', 'titan_plate', 'golden_tusk'], mage: ['laminated_menu', 'lich_robes', 'sage_ring'], cle: ['lich_staff', 'storm_cloak', 'ice_bucket'] },
  kiosk: { sam: ['pizza_cutter', 'bouncer_parka', 'egg_charm'], pal: ['brass_rail', 'titan_plate', 'egg_charm'], mage: ['licensing_act', 'lich_robes', 'optic_ring'], cle: ['hand_pump_staff', 'bouncer_parka', 'optic_ring'] }, // everything the kiosk sells, none of the boss loot
  new: { sam: ['last_orders_cleaver', 'landlord_waistcoat', 'bell_of_last_orders'], pal: ['brass_rail', 'bouncer_parka', 'egg_charm'], mage: ['licensing_act', 'lich_robes', 'optic_ring'], cle: ['hand_pump_staff', 'storm_cloak', 'sage_ring'] },
}[GEAR];
function party() {
  const spec = [['Adam', 'samurai', GEARSET.sam, ['kiai', 'zanshin', 'bladestorm', 'windblade']], ['Wendell', 'paladin', GEARSET.pal, ['divineshield', 'sacredblade', 'layhands', 'crusade']], ['Devon', 'mage', GEARSET.mage, ['firebolt', 'chill', 'inferno', 'spark']], ['Brenna', 'cleric', GEARSET.cle, ['heal', 'cureall', 'revive', 'aegis']]].filter((_, i) => SIZE >= 4 || i !== 1); // a party of 3 leaves the paladin behind
  return spec.map(([n, job, g, slots]) => { const c = newChar(n, job, null); c.level = 20; c.cp[job] = 130; [c.weapon, c.armor, c.acc] = g; c.slots = slots; const s = stats(c); c.hp = s.hp; c.mp = s.mp; return c; });
}
const ITEMS = () => ({ elixir: 8, megaether: 5, phoenix: 4, antidote: 6 });
// ---- the bot
function plan(b, inv, round) {
  const cmds = new Map(), P = b.p, alive = (x) => x.hp > 0, foes = b.e.filter(alive), boss = foes.find((e) => e.def_.boss), tgt = foes.slice().sort((a, c) => a.hp - c.hp)[0];
  const smart = MODE === 'smart', hurt = P.filter(alive).sort((a, c) => a.hp / a.maxhp - c.hp / c.maxhp), down = P.filter((x) => !alive(x));
  const cle = P.find((x) => x.ch.main === 'cleric' && alive(x)), healed = new Set();
  const mpOf = (x, id) => L.mpCost(x, D.SKILLS[id]);
  const can = (x, id) => x.mp >= mpOf(x, id);
  const use = (x, item, t) => { if (inv[item] > 0) { inv[item]--; cmds.set(x, { kind: 'item', item, target: t }); return true; } return false; };
  const skill = (x, id, t, gems = []) => cmds.set(x, { kind: 'skill', skillId: id, gems, target: t });
  for (const x of P) {
    if (!alive(x)) continue;
    const job = x.ch.main, low = hurt[0], lowFrac = low ? low.hp / low.maxhp : 1, many = P.filter((y) => alive(y) && y.hp < y.maxhp * 0.7).length;
    const reviveTarget = down[0];
    if (job === 'cleric') {
      if (reviveTarget && !healed.has('rev') && can(x, 'revive')) { skill(x, 'revive', reviveTarget); healed.add('rev'); continue; }
      if (lowFrac < 0.4 && can(x, 'heal')) { skill(x, 'heal', low); healed.add(low); continue; }
      if (many >= 2 && can(x, 'cureall')) { skill(x, 'cureall', x); continue; }
      if (lowFrac < 0.65 && can(x, 'heal')) { skill(x, 'heal', low); healed.add(low); continue; }
      if (x.mp < 20 && use(x, 'megaether', x)) continue;
      if (smart && round % 4 === 1 && can(x, 'aegis')) { skill(x, 'aegis', x); continue; }
      if (can(x, 'smite') || true) { x.ch.slots[1] = x.ch.slots[1]; }
      skill(x, 'attack', tgt); continue;
    }
    // everyone: emergency potion
    if (lowFrac < 0.3 && low === x && use(x, 'elixir', x)) continue;
    if (low && lowFrac < 0.3 && low !== x && !healed.has(low) && cle == null && use(x, 'elixir', low)) { healed.add(low); continue; }
    if (reviveTarget && inv.phoenix > 0 && !healed.has('rev') && !cle) { use(x, 'phoenix', reviveTarget); healed.add('rev'); continue; }
    if (job === 'samurai') {
      if (smart && (!x.st.atkup || x.st.atkup < 1) && can(x, 'kiai') && round % 4 === 1) { skill(x, 'kiai', x); continue; }
      if (x.mp >= 16) { skill(x, 'zanshin', tgt, MODE === 'smart' ? ['focusg', 'pierce'] : []); continue; }
      if (x.mp >= 3 && can(x, 'kiai') && !x.st.atkup && round > 1) { skill(x, 'kiai', x); continue; }
      if (x.mp < 16 && inv.megaether > 2 && use(x, 'megaether', x)) continue;
      skill(x, 'attack', tgt); continue;
    }
    if (job === 'paladin') {
      if (smart && round % 4 === 1 && can(x, 'divineshield')) { skill(x, 'divineshield', x); continue; }
      if (!smart && round === 1 && can(x, 'divineshield')) { skill(x, 'divineshield', x); continue; }
      if (lowFrac < 0.45 && low !== x && can(x, 'layhands')) { skill(x, 'layhands', low); continue; }
      if (smart && can(x, 'sacredblade')) { skill(x, 'sacredblade', tgt); continue; } // holy: the Landlord's weakness
      skill(x, 'attack', tgt); continue;
    }
    if (job === 'mage') {
      if (x.mp < 14 && use(x, 'megaether', x)) continue;
      if (smart) { if (can(x, 'tempest') || true) { const sg = slotGems(x.ch, SIG); skill(x, x.ch.weapon && D.WEAPONS[x.ch.weapon].sig || 'arcane', tgt, sg); continue; } }
      if (can(x, 'chill')) { skill(x, 'chill', tgt); continue; }
      skill(x, 'attack', tgt); continue;
    }
  }
  return cmds;
}
function fight(ids, boss, seed, mod = {}) {
  const rng = mk(seed), p = party(), b = new Battle(p, ids, rng, boss, mod), inv = ITEMS(); let r = 0;
  while (!b.over && r < 120) { r++; const cmds = plan(b, inv, r); for (const _ of b.round(cmds)); }
  return { win: b.over === 'win', rounds: r, hpLeft: b.p.filter((x) => x.hp > 0).length, dead: b.p.filter((x) => x.hp <= 0).length, bossHp: b.e[0].hp };
}
function rate(ids, boss, n, mod) { let w = 0, rs = 0, alive = 0; for (let i = 0; i < n; i++) { const f = fight(ids, boss, 1000 + i * 7919, mod); if (f.win) { w++; rs += f.rounds; alive += f.hpLeft; } } return { win: w / n, rounds: w ? (rs / w).toFixed(1) : '-', alive: w ? (alive / w).toFixed(1) : '-' }; }
for (const k of ['hp', 'atk', 'def', 'mag', 'spd']) if (process.env['B_' + k.toUpperCase()]) D.ENEMIES.landlord[k] = +process.env['B_' + k.toUpperCase()]; // tuning overrides
const n = +N;
if (what === 'boss' || what === 'all') {
  for (const id of ['margherita', 'mash_tun', 'titan', 'landlord']) { const r = rate([id], true, n); console.log(`${MODE}/${GEAR} ${id.padEnd(11)} win ${(r.win * 100).toFixed(0)}%  rounds ${r.rounds}  survivors ${r.alive}`); }
}
if (what === 'regular' || what === 'all') {
  for (const grp of D.ENCOUNTERS.obsidian) { const r = rate(grp, false, n); console.log(`${grp.join(' + ').padEnd(80)} win ${(r.win * 100).toFixed(0)}%  rounds ${r.rounds}`); }
  for (const grp of D.ENCOUNTERS.embers.slice(0, 4)) { const r = rate(grp, false, n); console.log(`[cinder] ${grp.join(' + ').padEnd(70)} win ${(r.win * 100).toFixed(0)}%  rounds ${r.rounds}`); }
}
const PS = party().map((c) => { const s = stats(c); return `${c.name}(${c.main}) hp${s.hp} mp${s.mp} atk${s.atk} def${s.def} mag${s.mag} spd${s.spd}`; }); console.log(PS.join(' | '));
