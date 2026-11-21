// ===== Echo Stones (inspired by FF6's Magicite, but this world's own): Gemforge bound more than three evils. Lesser spirits he bound
// left their echo in small stones. A hero attunes one stone at a time and:
//   · learns its spells through Resonance earned in won battles (stone rate x battle resonance; 100 to learn). Learned spells are kept
//     for good and can be slotted like calling skills, whatever the calling. Harmony: a stone resonates twice as fast with a hero whose
//     current calling is one of its affinities.
//   · may Call the spirit once per battle. The Call grows 15% stronger for every spell the hero has learned from that stone.
//   · gains the stone's stat bonus at every level-up while attuned (kept for good: c.eb).
// Stones are boss rewards (BOSS_ECHO). c.echo = attuned stone id, c.ep = { spellId: progress }, c.spells = learned spells, G.inv.echoes.
import { SKILLS } from './data.js';

const S = (name, mp, tgt, kind, pow, x = {}) => ({ name, mp, tgt, kind, pow, ...x });
Object.assign(SKILLS, { // the Calls: free, once per battle
  ec_cinder: S('Cinderwhelp: Ash Breath', 0, 'all', 'mag', 2.0, { elem: 'fire' }), ec_rime: S('Rimehare: Hoarfrost', 0, 'all', 'mag', 1.8, { elem: 'ice', fx: ['slow'] }),
  ec_gale: S('Galewing: Thunderhead', 0, 'all', 'mag', 1.9, { elem: 'bolt', stun: 0.2 }), ec_lumen: S('Lumen Doe: Dawnlight', 0, 'allies', 'heal', 1.6),
  ec_grave: S('Gravemoth: Night Veil', 0, 'all', 'mag', 1.6, { elem: 'dark', fx: ['drain'] }), ec_stone: S('Stonebrow: Bulwark Hymn', 0, 'allies', 'buff', 0, { fx: ['defup', 'atkup'] }),
  ec_tide: S('Tidecalf: Spring Tide', 0, 'allies', 'heal', 1.3, { fx: ['revive'] }),
});
export const ECHOES = {
  cinder: { name: 'Cinderwhelp', desc: 'A dragon pup that never cooled.', spells: [['firebolt', 10], ['fireflask', 5], ['inferno', 3]], call: 'ec_cinder', bonus: { atk: 1 }, affinity: ['mage', 'berserker', 'alchemist'] },
  rime: { name: 'Rimehare', desc: 'A white hare that leaves no tracks, only frost.', spells: [['chill', 10], ['frostflask', 5], ['tempest', 2]], call: 'ec_rime', bonus: { mag: 1 }, affinity: ['mage', 'samurai', 'ranger'] },
  gale: { name: 'Galewing', desc: 'A storm-bird that sleeps in thunderheads.', spells: [['spark', 10], ['thunderfist', 6], ['tempest', 3]], call: 'ec_gale', bonus: { spd: 1 }, affinity: ['ranger', 'rogue', 'monk'] },
  lumen: { name: 'Lumen Doe', desc: 'A deer of soft light that walks the dawn.', spells: [['heal', 12], ['smite', 6], ['revive', 3]], call: 'ec_lumen', bonus: { mp: 3 }, affinity: ['cleric', 'paladin', 'bard'] },
  grave: { name: 'Gravemoth', desc: 'A grey moth drawn to the last light of things.', spells: [['drain', 10], ['curse', 6], ['deathcoil', 2]], call: 'ec_grave', bonus: { mag: 1 }, affinity: ['hexer', 'rogue'] },
  stone: { name: 'Stonebrow', desc: 'A patient old spirit of standing stones.', spells: [['bulwark', 10], ['rally', 5], ['divineshield', 3]], call: 'ec_stone', bonus: { def: 1 }, affinity: ['knight', 'monk', 'paladin'] },
  tide: { name: 'Tidecalf', desc: 'A seal calf of the inland sea, gentle and quick.', spells: [['tonic', 12], ['mendsong', 6], ['cureall', 3]], call: 'ec_tide', bonus: { hp: 8 }, affinity: ['bard', 'alchemist', 'cleric'] },
};
// which boss leaves which stone behind
export const BOSS_ECHO = { big_gary: 'lumen', miller: 'gale', wyrm: 'cinder', captain_barnacle: 'tide', lich: 'grave', clerk_pharaoh: 'stone', frozen_angler: 'rime' };
export const harmony = (c, id) => !!ECHOES[id]?.affinity.includes(c.main);
export const learnedFrom = (c, id) => (ECHOES[id]?.spells || []).filter(([sp]) => (c.spells || []).includes(sp)).length;
export const callPower = (c, id) => 1 + 0.15 * learnedFrom(c, id);
// after a won battle: every standing, attuned hero resonates. Returns lines for the victory screen.
export function resonate(party, standing, res) {
  const out = [];
  for (const c of party) {
    const id = c.echo, st = ECHOES[id]; if (!st || !standing.has(c)) continue;
    const mul = harmony(c, id) ? 2 : 1, got = [];
    for (const [sp, rate] of st.spells) {
      if ((c.spells ||= []).includes(sp)) continue;
      const ep = (c.ep ||= {}), before = ep[sp] || 0; ep[sp] = Math.min(100, before + rate * res * mul);
      if (ep[sp] >= 100) { c.spells.push(sp); delete ep[sp]; got.push(SKILLS[sp].name); }
    }
    if (got.length) out.push(`${c.name} learns ${got.map((n) => `<b>${n}</b>`).join(', ')} from ${st.name}.`);
  }
  return out;
}
