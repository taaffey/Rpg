// ===== Pure game logic (no DOM): stats, build rules, gem rewriting, battle engine =====
import { JOBS, SKILLS, GEMS, WEAPONS, ARMORS, ACCS, WEAPON_TYPES, ENEMIES, ITEMS, DROPS, ELEMENTS, TRAITS } from './data.js';

export const STAT_KEYS = ['hp', 'mp', 'atk', 'def', 'mag', 'spd'];
export const MAX_LEVEL = 20;
const BASE = { hp: 40, mp: 12, atk: 6, def: 4, mag: 6, spd: 6 };
const GROW = { hp: 9, mp: 3, atk: 1.6, def: 1.2, mag: 1.6, spd: 0.7 };
// EXP to go from level lv to lv+1. Early levels come every 1-4 fights near Haven; each later level needs roughly
// 6-10 fights of the region you are meant to be in (see tools/progress.mjs). Total to the cap: ~26,700.
export const EXP_TABLE = [20, 40, 70, 110, 170, 280, 440, 630, 840, 1050, 1300, 1600, 1900, 2200, 2500, 2850, 3200, 3600, 4000];
export const expNeeded = (lv) => EXP_TABLE[Math.max(1, Math.min(lv, EXP_TABLE.length)) - 1];

// ---------- Character build ----------
export function stats(c) {
  const mj = JOBS[c.main], s = {};
  for (const k of STAT_KEYS) s[k] = Math.round((BASE[k] + GROW[k] * (c.level - 1)) * mj.mod[k]); // only the current calling shapes stats
  for (const g of [...gear(c), ...mastered(c).map((j) => JOBS[j].master)]) for (const k of STAT_KEYS) s[k] += g[k] || 0; // gear + mastery bonuses
  if (!c.weapon && fistJob(c)) s.atk += unarmedBonus(c.level); // martial artists fight well bare-handed
  s.hp = Math.max(1, s.hp);
  return s;
}
// Monks (and any main job that can wield fists) hit hard bare-handed; the bonus grows with level, but real fist weapons stay better.
const fistJob = (c) => JOBS[c.main].weapons.includes('fists'); // main job only
export const unarmedBonus = (level) => 2 + Math.floor(level * 0.6);
export const gear = (c) => [WEAPONS[c.weapon], ARMORS[c.armor], ACCS[c.acc]].filter(Boolean);
export const resists = (c) => gear(c).flatMap((g) => g.res || []);
export function weaponOk(c, wid) {
  if (!WEAPONS[wid]) return false;
  const t = WEAPONS[wid].type;
  return JOBS[c.main].weapons.includes(t); // FF5-style: only the current calling's weapon types
}
export const sigSkill = (c) => { const w = c.weapon && WEAPONS[c.weapon]; return w ? w.sig || WEAPON_TYPES[w.type].sig : 'punch'; };
// ---------- Callings: ranks, learned abilities, traits (FF5 job levels) ----------
// c.cp[job] = Calling Points earned in that calling (present = the hero has taken it, rank >= 1). CP_RANKS[r-1] = CP to reach rank r.
// Everything learned is kept for good; the CURRENT calling's abilities plus one SECOND calling's (c.sub) can be slotted.
export const CP_RANKS = [0, 6, 18, 45, 80, 130], MAX_RANK = CP_RANKS.length;
export const rankOf = (c, job) => { const n = c.cp?.[job]; if (n == null) return 0; let r = 0; while (r < MAX_RANK && n >= CP_RANKS[r]) r++; return r; };
export const cpToNext = (c, job) => { const r = rankOf(c, job); return r >= MAX_RANK ? 0 : CP_RANKS[r] - (c.cp?.[job] || 0); };
export const mastered = (c) => Object.keys(c.cp || {}).filter((j) => JOBS[j] && rankOf(c, j) >= MAX_RANK);
export const jobSkills = (job, rank) => JOBS[job].skills.filter(([, r]) => r <= rank).map(([id]) => id);
export const jobTrait = (job, rank) => { const t = JOBS[job].trait; return t && t[1] <= rank ? t[0] : null; };
export const learnedTraits = (c) => Object.keys(c.cp || {}).filter((j) => JOBS[j]).map((j) => jobTrait(j, rankOf(c, j))).filter(Boolean);
export function activeTraits(c) { // the current calling's own trait (once learned) + the one in the trait slot
  const own = jobTrait(c.main, rankOf(c, c.main)), out = own ? [own] : [];
  if (c.trait && c.trait !== own && learnedTraits(c).includes(c.trait)) out.push(c.trait);
  return out;
}
export const secondOk = (c, job) => !!job && job !== c.main && rankOf(c, job) >= 1;
// skills a character may slot: the current calling's learned abilities, then the second calling's
export function learnable(c) {
  const out = jobSkills(c.main, Math.max(1, rankOf(c, c.main)));
  if (secondOk(c, c.sub)) for (const id of jobSkills(c.sub, rankOf(c, c.sub))) if (!out.includes(id)) out.push(id);
  return out;
}
// take up a calling: level and every learned ability are kept; CP now flow to the new calling
export function setCalling(c, job) {
  c.cp ||= {}; c.main = job; if (c.cp[job] == null) c.cp[job] = 0;
  if (c.sub === job) c.sub = null;
}
// CP to one hero's current calling. Returns the ranks gained: [{ job, rank, skills, trait, mastered }]
export function gainCP(c, n) {
  c.cp ||= {}; const job = c.main, before = rankOf(c, job), out = [], st0 = stats(c);
  c.cp[job] = (c.cp[job] || 0) + Math.max(0, Math.round(n));
  for (let r = before + 1; r <= rankOf(c, job); r++) out.push({ job, rank: r, skills: JOBS[job].skills.filter(([, k]) => k === r).map(([id]) => id), trait: JOBS[job].trait?.[1] === r ? JOBS[job].trait[0] : null, mastered: r === MAX_RANK });
  if (out.at(-1)?.mastered) { const st1 = stats(c); if (c.hp > 0) c.hp += st1.hp - st0.hp; c.mp += st1.mp - st0.mp; } // the mastery bonus lands at once
  return out;
}
export const mpCost = (x, s) => (x.tr?.has('thrift') && s.mp > 0 ? Math.max(1, Math.round(s.mp * 0.75)) : s.mp); // Mage trait: MP Thrift
export const enemyCp = (id) => { const d = ENEMIES[id]; return d.cp ?? Math.min(4, 1 + Math.floor(d.exp / 80)); };
// Award a battle's CP: every hero still standing gets it in full; KO'd heroes get none. Returns [{ c, cp, ranks }]
export const awardCP = (party, cp) => party.map((c) => { const n = c.hp > 0 ? cp : 0; return { c, cp: n, ranks: n ? gainCP(c, n) : [] }; });
export const gemCapacity = (c) => 2 + (c.extra || 0) + gear(c).reduce((n, g) => n + (g.sockets || 0), 0);
export const gemsUsed = (c) => c.gems.reduce((n, a) => n + a.length, 0);
export const SLOT_COUNT = 4, SIG = 4, GEMS_PER_SLOT = 3;
export const slotSkill = (c, i) => (i === SIG ? sigSkill(c) : c.slots[i]);
export function slotGems(c, i) {
  const g = [...c.gems[i]];
  if (i === SIG && c.weapon && WEAPONS[c.weapon]?.innate) g.unshift(WEAPONS[c.weapon].innate);
  return g;
}
// After any job/gear change, return anything that no longer fits to the inventory.
export function sanitize(c, inv) {
  c.cp ||= {}; if (c.cp[c.main] == null) c.cp[c.main] = 0;
  if (c.sub && !secondOk(c, c.sub)) c.sub = null;
  if (c.trait && !learnedTraits(c).includes(c.trait)) c.trait = null;
  if (c.weapon && !weaponOk(c, c.weapon)) { inv.weapons.push(c.weapon); c.weapon = null; }
  const ok = learnable(c);
  c.slots = c.slots.map((s) => (ok.includes(s) ? s : null));
  c.slots.forEach((s, i) => { if (!s) { inv.gems.push(...c.gems[i]); c.gems[i] = []; } });
  while (gemsUsed(c) > gemCapacity(c)) {
    const i = c.gems.findLastIndex((a) => a.length);
    inv.gems.push(c.gems[i].pop());
  }
  const st = stats(c);
  c.hp = Math.min(c.hp, st.hp); c.mp = Math.min(c.mp, st.mp);
}

// ---------- Gem rewriting: base skill + gems => final skill ----------
export function skillWithGems(id, gems = []) {
  const sk = SKILLS[id];
  const m = { id, ...sk, fx: [...(sk.fx || [])], hits: sk.hits || 1, pierce: sk.pierce || 0, chain: false, echo: false, vamp: 0, swift: false, stun: sk.stun || 0, execute: !!sk.execute, recoil: 0, siphon: 0, guard: false, crit: sk.crit || 0, tags: [] };
  let mpMul = 1;
  for (const gid of gems) {
    const g = GEMS[gid];
    if (g.elem) { if (m.kind === 'phys' || m.kind === 'mag') { m.elem = g.elem; m.tags.push(g.elem); } continue; }
    switch (gid) {
      case 'chain': m.chain = true; m.tags.push('Chain'); break;
      case 'echo': m.echo = true; m.tags.push('Echo'); break;
      case 'vamp': m.vamp = 0.35; m.tags.push('Vampiric'); break;
      case 'pierce': m.pierce = Math.min(1, m.pierce + 0.5); m.tags.push('Pierce'); break;
      case 'thrifty': mpMul *= 0.5; m.tags.push('Thrifty'); break;
      case 'overcharge': m.pow *= 1.5; mpMul *= 1.5; m.tags.push('Overcharge'); break;
      case 'focusg': m.pow *= 1.25; m.tags.push('Focus'); break;
      case 'venom': if (!m.fx.includes('poison')) m.fx.push('poison'); m.tags.push('Venom'); break;
      case 'swift': m.swift = true; m.tags.push('Swift'); break;
      case 'stun': m.stun = 0.35; m.tags.push('Stun'); break;
      case 'execute': m.execute = true; m.tags.push('Execute'); break;
      case 'berserk': m.pow *= 1.4; m.recoil = 0.08; m.tags.push('Berserk'); break;
      case 'siphon': m.siphon = 0.15; m.tags.push('Siphon'); break;
      case 'guard': m.guard = true; m.tags.push('Guard'); break;
      case 'crit': m.crit = 0.25; m.tags.push('Crit'); break;
      case 'wide':
        if (m.tgt === 'one') { m.tgt = 'all'; m.pow *= 0.6; m.tags.push('Wide'); }
        else if (m.tgt === 'ally') { m.tgt = 'allies'; m.pow *= 0.6; m.tags.push('Wide'); }
        break;
    }
  }
  m.mp = Math.round(m.mp * mpMul);
  return m;
}
// Weapon traits layered onto a hero's skill: crit on all physical skills, healing bonus on heals,
// element / extra hits / pierce on the plain Attack, on-hit status on Attack and the signature skill.
export function withWeapon(m, w, isAttack, isSig) {
  if (!w) return m;
  if (m.kind === 'phys' && w.crit) m.crit = Math.min(0.9, (m.crit || 0) + w.crit);
  if (m.kind === 'heal' && w.heal) m.healMul = 1 + w.heal;
  if (isAttack) {
    if (w.hits > 1) { m.hits = w.hits; m.pow *= 0.6; }
    if (w.elem && !m.elem) m.elem = w.elem;
    if (w.pierce) m.pierce = Math.min(1, m.pierce + w.pierce);
  }
  if ((isAttack || isSig) && w.proc && (m.kind === 'phys' || m.kind === 'mag')) m.proc = w.proc;
  return m;
}
export function describeSkill(m) {
  const t = { one: 'one foe', all: 'all foes', ally: 'one ally', allies: 'all allies', self: 'self' }[m.tgt];
  const bits = [`${m.mp} MP`, t];
  if (m.pow) bits.push(`×${m.pow.toFixed(2)}${m.hits > 1 ? ` ×${m.hits} hits` : ''}`);
  if (m.elem) bits.push(m.elem);
  if (m.fx.length) bits.push(m.fx.join('/'));
  for (const f of ['chain', 'echo', 'swift']) if (m[f]) bits.push(f);
  if (m.vamp) bits.push('lifesteal');
  if (m.stun) bits.push('stun 35%'); if (m.crit) bits.push(`crit ${Math.round(m.crit * 100)}%`); if (m.execute) bits.push('execute'); if (m.siphon) bits.push('MP siphon'); if (m.guard) bits.push('self-guard'); if (m.recoil) bits.push('recoil');
  if (m.proc) bits.push(`${Math.round(m.proc[1] * 100)}% ${m.proc[0]} on hit`);
  if (m.healMul > 1) bits.push(`heal +${Math.round((m.healMul - 1) * 100)}%`);
  if (m.pierce) bits.push(`pierce ${Math.round(m.pierce * 100)}%`);
  return bits.join(' · ');
}

// ---------- Characters ----------
export function newChar(name, main, sub, weapon = null, armor = null, level = 1) {
  const c = { name, level, exp: 0, main, sub: sub || null, trait: null, cp: { [main]: 0, ...(sub ? { [sub]: 0 } : {}) }, weapon, armor, acc: null, hp: 1, mp: 1, slots: [null, null, null, null], gems: [[], [], [], [], []] };
  const fill = learnable(c);
  c.slots = [0, 1, 2, 3].map((i) => fill[i] || null);
  const st = stats(c); c.hp = st.hp; c.mp = st.mp;
  return c;
}
// EXP: c.exp is progress inside the current level; expNeeded(lv) is the cost of lv -> lv+1.
// Multi-level-ups are handled in one call; the cap clears leftover EXP. A KO'd hero stays KO'd (no free revive on level-up).
export function gainExp(c, amount) {
  const ups = [];
  if (c.level >= MAX_LEVEL) { c.exp = 0; return ups; }
  c.exp += Math.max(0, Math.round(amount));
  while (c.level < MAX_LEVEL && c.exp >= expNeeded(c.level)) {
    c.exp -= expNeeded(c.level);
    const before = stats(c); c.level++;
    const after = stats(c);
    if (c.hp > 0) c.hp = Math.min(after.hp, c.hp + after.hp - before.hp);
    c.mp = Math.min(after.mp, c.mp + after.mp - before.mp);
    ups.push(c.level);
  }
  if (c.level >= MAX_LEVEL) c.exp = 0;
  return ups;
}
// KO'd heroes earn half EXP: a penalty, but nobody falls hopelessly behind after one bad fight.
export const KO_EXP_SHARE = 0.5;
// Award a battle's EXP to the whole party. Returns one entry per hero: { c, exp, ups, learned }.
export const ENCORE = 1.1; // Bard trait: the whole party earns 10% more EXP while a Bard with Encore stands
export function awardExp(party, exp) {
  if (party.some((c) => c.hp > 0 && activeTraits(c).includes('encore'))) exp = Math.round(exp * ENCORE);
  return party.map((c) => {
    const share = Math.round(exp * (c.hp > 0 ? 1 : KO_EXP_SHARE)), before = learnable(c);
    const ups = gainExp(c, share);
    return { c, exp: share, ups, learned: learnable(c).filter((id) => !before.includes(id)) };
  });
}

// ---------- Battle ----------
const alive = (x) => x.hp > 0;
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
function elemMult(t, e) { if (!e) return 1; if (t.weak.includes(e)) return 1.5; if (t.res.includes(e)) return 0.5; return 1; }

export class Battle {
  constructor(party, enemyIds, rng = Math.random, boss = false, mod = {}) {
    this.mod = { hp: 1, atk: 1, mag: 1, def: 1, reward: 1, ...mod };
    this.rng = rng; this.boss = boss; this.over = null; this.turn = 0; this.fx = [];
    this.p = party.map((c) => {
      const s = stats(c);
      return { side: 'p', ch: c, tr: new Set(activeTraits(c)), wpn: WEAPONS[c.weapon] || null, sig: sigSkill(c), name: c.name, hp: c.hp, mp: c.mp, maxhp: s.hp, maxmp: s.mp, atk: s.atk, def: s.def, mag: s.mag, spd: s.spd, weak: [], res: resists(c), st: {}, defending: false };
    });
    // rare elites: an enemy with elite: [id, chance] is occasionally replaced by its golden/crystal cousin
    enemyIds = enemyIds.map((id) => { const el = !boss && ENEMIES[id]?.elite; return el && ENEMIES[el[0]] && rng() < el[1] ? el[0] : id; });
    const counts = {}; enemyIds.forEach((id) => (counts[id] = (counts[id] || 0) + 1));
    const seen = {};
    this.e = enemyIds.map((id) => {
      const d = ENEMIES[id]; seen[id] = (seen[id] || 0) + 1;
      const name = counts[id] > 1 ? `${d.name} ${String.fromCharCode(64 + seen[id])}` : d.name;
      return { side: 'e', tr: new Set(), id, def_: d, name, icon: d.icon, hp: Math.round(d.hp * this.mod.hp), mp: Infinity, maxhp: Math.round(d.hp * this.mod.hp), maxmp: 0, atk: Math.round(d.atk * this.mod.atk), def: Math.round(d.def * this.mod.def), mag: Math.round(d.mag * this.mod.mag), spd: d.spd, weak: d.weak, res: d.res, st: {}, defending: false };
    });
  }
  side(x) { return x.side === 'p' ? this.p : this.e; }
  // Ranger trait: a pre-emptive strike costs the foes their first turn (rolled once, never against a boss)
  get preempt() { if (this._pre == null) this._pre = !this.boss && this.p.some((x) => x.tr.has('preempt')) && this.rng() < 0.25; return this._pre; }
  foes(x) { return x.side === 'p' ? this.e : this.p; }

  enemyCmd(e) {
    // healing skills are only picked when they would help (self below 60% HP, or a wounded ally for 'ally' heals)
    const hurt = this.e.filter((x) => alive(x) && x.hp < x.maxhp * 0.6).sort((a, b) => a.hp / a.maxhp - b.hp / b.maxhp)[0];
    const useful = ([sid]) => SKILLS[sid].kind !== 'heal' || (SKILLS[sid].tgt === 'self' ? e.hp < e.maxhp * 0.6 : !!hurt);
    let tbl = e.def_.skills.filter(useful); if (!tbl.length) tbl = e.def_.skills;
    const tot = tbl.reduce((n, s) => n + s[1], 0);
    let r = this.rng() * tot, id = tbl[0][0];
    for (const [sid, w] of tbl) { if ((r -= w) < 0) { id = sid; break; } }
    const s = SKILLS[id], target = s.kind === 'heal' && s.tgt === 'ally' ? hurt : pick(this.p.filter(alive), this.rng);
    return { kind: 'skill', skillId: id, gems: [], target };
  }
  speed(x) { return x.spd * (x.st.slow > 0 ? 0.5 : 1) + this.rng() * 2; }
  // approximate upcoming action order (no randomness), for the turn-order bar
  order() { return [...this.p, ...this.e].filter(alive).sort((a, b) => b.spd * (b.st.slow > 0 ? 0.5 : 1) - a.spd * (a.st.slow > 0 ? 0.5 : 1)); }

  // Generator: yields an array of log lines after every action.
  *round(cmds) {
    this.turn++;
    const order = [], ambush = this.turn === 1 && this.preempt;
    if (ambush) yield ['Pre-emptive strike! The foes are caught off guard.'];
    for (const x of [...this.p, ...this.e]) {
      if (!alive(x) || (ambush && x.side === 'e')) continue;
      const cmd = x.side === 'p' ? cmds.get(x) : this.enemyCmd(x);
      if (!cmd || cmd.kind === 'assist') continue; // assist: this hero's turn goes into a partner's combo
      const swift = cmd.kind === 'skill' && skillWithGems(cmd.skillId, cmd.gems).swift, first = this.turn === 1 && x.tr.has('firststrike');
      order.push({ x, cmd, pri: (first ? 3 : cmd.kind === 'defend' ? 2 : swift ? 1 : 0), spd: this.speed(x) });
    }
    order.sort((a, b) => b.pri - a.pri || b.spd - a.spd);
    this.p.forEach((x) => (x.defending = false));
    for (const { x, cmd } of order) {
      if (!alive(x) || this.over) continue;
      if (x.st.stun > 0) { x.st.stun = 0; this.fx.push({ t: 'poison' }); yield [`${x.name} is stunned and can't act!`]; continue; }
      const L = this.act(x, cmd);
      this.check();
      yield L;
      if (this.over) return;
    }
    const L = [];
    for (const x of [...this.p, ...this.e]) {
      if (!alive(x)) continue;
      if (x.st.poison > 0) { const d = Math.max(1, Math.round(x.maxhp * 0.07)); this.hurt(x, d, L, `${x.name} suffers poison`); this.fx.push({ t: 'poison' }); }
      if (alive(x) && x.tr.has('regen') && x.hp < x.maxhp) { const h = Math.min(x.maxhp - x.hp, Math.max(1, Math.round(x.maxhp * 0.05))); x.hp += h; this.fx.push({ t: 'heal', name: x.name, amount: h }); L.push(`${x.name} regenerates ${h} HP.`); }
      for (const k of Object.keys(x.st)) if (k !== 'stun' && x.st[k] > 0) x.st[k]--;
    }
    this.check();
    if (L.length) yield L;
  }
  check() {
    if (!this.e.some(alive)) this.over = 'win';
    else if (!this.p.some(alive)) this.over = 'lose';
  }
  hurt(t, d, L, prefix, weak = false) {
    prefix = /\d/.test(prefix) ? prefix : `${prefix} (${d})`;
    t.hp = Math.max(0, t.hp - d);
    this.fx.push({ t: 'hit', name: t.name, d, ko: t.hp <= 0, weak });
    L.push(`${prefix}${t.hp <= 0 ? `  ${t.name} falls!` : ''}`);
  }
  act(a, cmd) {
    const L = [];
    switch (cmd.kind) {
      case 'defend': a.defending = true; L.push(`${a.name} braces for impact.`); break;
      case 'flee':
        if (!this.boss && this.rng() < 0.65) { this.over = 'fled'; L.push('The party escapes!'); } else L.push('Couldn’t escape!');
        break;
      case 'item': {
        const it = ITEMS[cmd.item], pot = a.tr.has('pharmacy') ? 2 : 1; let t = cmd.target || a; // Alchemist trait: double potency
        if (it.revive) { if (alive(t)) { L.push(`${a.name} fumbles the ${it.name}.`); break; } t.hp = Math.round(t.maxhp * it.revive); this.fx.push({ t: 'heal', name: t.name, amount: t.hp, revived: true }); L.push(`${a.name} revives ${t.name}!`); }
        else if (!alive(t)) { L.push(`${a.name}’s ${it.name} has no effect.`); }
        else if (it.cure) { const ks = it.cure === 'all' ? ['poison', 'slow', 'stun'] : [it.cure], had = ks.filter((k) => t.st[k] > 0); ks.forEach((k) => { t.st[k] = 0; }); L.push(had.length ? `${a.name} uses ${it.name}: ${t.name} is cured.` : `${a.name} uses ${it.name}, but nothing happens.`); if (had.length) this.fx.push({ t: 'heal', name: t.name, amount: 0 }); }
        else if (it.heal) { const h = Math.min(it.heal * pot, t.maxhp - t.hp); t.hp += h; this.fx.push({ t: 'heal', name: t.name, amount: h }); L.push(`${a.name} uses ${it.name}: ${t.name} +${h} HP`); }
        else if (it.mpr) { const h = Math.min(it.mpr * pot, t.maxmp - t.mp); t.mp += h; L.push(`${a.name} uses ${it.name}: ${t.name} +${h} MP`); }
        break;
      }
      case 'skill': this.cast(a, cmd.skillId, cmd.gems || [], cmd.target, L, false, false); break;
      case 'combo': { // a double tech: both heroes pay the MP and pool their strength into one move at the leader's speed
        const p = cmd.partner, s = SKILLS[cmd.skillId], ca = mpCost(a, s), cp = mpCost(p, s);
        if (!alive(p) || p.st.stun > 0) { L.push(`${p.name} isn't ready! ${a.name} goes it alone.`); this.cast(a, 'attack', [], cmd.target, L, false, false); break; }
        if (a.mp < ca || p.mp < cp) { L.push(`Not enough MP for ${s.name}!`); break; }
        a.mp -= ca; p.mp -= cp;
        this.fx.push({ t: 'cast', actor: p.name, kind: s.kind, side: p.side, targets: [] });
        const atk = a.atk, mag = a.mag; a.atk += p.atk; a.mag += p.mag;
        const at = L.length; try { this.cast(a, cmd.skillId, [], cmd.target, L, true, true); } finally { a.atk = atk; a.mag = mag; }
        if (L[at]?.startsWith(`${a.name} uses`)) L[at] = `${a.name} & ${p.name}: ${s.name}!`; // credit both brothers
        break;
      }
    }
    return L;
  }
  resolveTargets(a, s, target) {
    const foes = this.foes(a), friends = this.side(a);
    switch (s.tgt) {
      case 'one': { const f = foes.filter(alive); return f.length ? [target && alive(target) && foes.includes(target) ? target : pick(f, this.rng)] : []; }
      case 'all': return foes.filter(alive);
      case 'ally': {
        if (s.fx.includes('revive')) return [target && friends.includes(target) ? target : a];
        const f = friends.filter(alive); return [target && alive(target) && friends.includes(target) ? target : pick(f, this.rng)];
      }
      case 'allies': return s.fx.includes('revive') ? friends : friends.filter(alive);
      default: return [a];
    }
  }
  applyFx(a, t, s, L, dealt) {
    for (const f of s.fx) {
      if (f === 'poison' && alive(t)) { t.st.poison = 4; L.push(`  ${t.name} is poisoned.`); }
      if (f === 'slow' && alive(t)) { t.st.slow = 3; L.push(`  ${t.name} is slowed.`); }
      if (f === 'atkup') { t.st.atkup = 4; L.push(`  ${t.name}'s power rises.`); }
      if (f === 'defup') { t.st.defup = 4; L.push(`  ${t.name}'s guard rises.`); }
      if (f === 'drain' && dealt > 0 && alive(a)) { const h = Math.min(Math.round(dealt * (a.tr.has('hunger') ? 0.75 : 0.5)), a.maxhp - a.hp); if (h > 0) { a.hp += h; this.fx.push({ t: 'heal', name: a.name, amount: h }); L.push(`  ${a.name} drains ${h} HP.`); } }
      if (f === 'revive' && !alive(t)) { t.hp = Math.round(t.maxhp * 0.4); this.fx.push({ t: 'heal', name: t.name, amount: t.hp, revived: true }); L.push(`  ${t.name} is revived!`); }
    }
  }
  proc(a, t, [f, chance], dealt, L) { // weapon on-hit effect
    if (this.rng() >= chance) return;
    if (f === 'drain') { if (!alive(a)) return; const h = Math.min(Math.round(dealt * (a.tr.has('hunger') ? 0.75 : 0.5)), a.maxhp - a.hp); if (h > 0) { a.hp += h; this.fx.push({ t: 'heal', name: a.name, amount: h }); L.push(`  ${a.name}'s weapon drains ${h} HP.`); } return; }
    if (!alive(t)) return;
    if (f === 'poison' && !(t.st.poison > 0)) { t.st.poison = 4; L.push(`  ${t.name} is poisoned.`); }
    else if (f === 'slow' && !(t.st.slow > 0)) { t.st.slow = 3; L.push(`  ${t.name} is slowed.`); }
    else if (f === 'stun' && !t.def_?.boss) { t.st.stun = 1; L.push(`  ${t.name} is stunned!`); }
  }
  damage(a, t, s, mult = 1, elem = s.elem) {
    const up = a.st.atkup > 0 ? 1.4 : 1, dup = t.st.defup > 0 ? 1.5 : 1;
    let raw = s.kind === 'phys' ? a.atk * up * s.pow - t.def * dup * 0.6 * (1 - s.pierce) : a.mag * up * s.pow - t.def * dup * 0.3 * (1 - s.pierce);
    raw *= (0.9 + this.rng() * 0.2) * elemMult(t, elem) * mult * (t.defending ? 0.5 : 1);
    if (a.tr.has('adrenaline') && a.hp < a.maxhp * 0.4) raw *= 1.3; // traits (see TRAITS in data.js)
    if (t.tr.has('stalwart')) raw *= 0.85;
    if (t.side === 'p' && this.p.some((x) => x !== t && alive(x) && x.tr.has('guardian'))) raw *= 0.9;
    if (s.execute && t.hp < t.maxhp * 0.35) raw *= 1.6;
    this.lastCrit = !!(s.crit && this.rng() < s.crit); if (this.lastCrit) raw *= 1.8;
    return Math.max(1, Math.round(raw));
  }
  cast(a, id, gems, target, L, free, noEcho) {
    const s = a.side === 'p' ? withWeapon(skillWithGems(id, gems), a.wpn, id === 'attack', id === a.sig) : skillWithGems(id, gems);
    s.mp = mpCost(a, s);
    if (a.tr.has('bushido') && s.kind === 'phys') s.crit = Math.min(0.9, (s.crit || 0) + 0.1);
    if (!free && a.side === 'p') {
      if (a.mp < s.mp) { L.push(`${a.name} lacks the MP!`); return; }
      a.mp -= s.mp;
    }
    const elem = s.elem === 'random' ? pick(['fire', 'ice', 'bolt'], this.rng) : s.elem;
    L.push(id === 'attack' ? `${a.name} attacks!` : `${a.name} uses ${s.name}${s.tags.length ? ` [${s.tags.join(' + ')}]` : ''}!`);
    let dealt = 0;
    const targets = this.resolveTargets(a, s, target);
    this.fx.push({ t: 'cast', actor: a.name, kind: s.kind, elem, hostile: !!s.hostile, side: a.side, targets: targets.map((x) => x.name) });
    for (const t of targets) {
      if (s.kind === 'phys' || s.kind === 'mag') {
        let total = 0;
        for (let h = 0; h < s.hits && alive(t); h++) {
          const d = this.damage(a, t, s, 1, elem), crit = this.lastCrit; total += d; dealt += d;
          const em = elemMult(t, elem);
          this.hurt(t, d, L, `  ${t.name} takes ${d} damage${crit ? ' CRITICAL!' : em > 1 ? ' WEAK!' : em < 1 ? ' resisted' : ''}`, em > 1 || crit);
        }
        if (s.proc && total) this.proc(a, t, s.proc, total, L);
        if (s.kind === 'phys' && total && alive(t) && alive(a) && t.tr.has('counter') && this.rng() < 0.3) { // Monk trait
          const cs = withWeapon(skillWithGems('attack', []), t.wpn, true, false), d = this.damage(t, a, cs, 1, cs.elem); this.hurt(a, d, L, `  ${t.name} counters! ${a.name} takes ${d}`);
        }
        if (s.vamp && total && alive(a)) { const h = Math.min(Math.round(total * s.vamp), a.maxhp - a.hp); if (h > 0) { a.hp += h; this.fx.push({ t: 'heal', name: a.name, amount: h }); L.push(`  ${a.name} siphons ${h} HP.`); } }
        this.applyFx(a, t, s, L, total);
        if (s.stun && alive(t) && !t.def_?.boss && this.rng() < s.stun) { t.st.stun = 1; L.push(`  ${t.name} is stunned!`); }
        if (s.chain) {
          const others = this.foes(a).filter((x) => alive(x) && x !== t);
          if (others.length) { const o = pick(others, this.rng); const d = this.damage(a, o, s, 0.5, elem); this.hurt(o, d, L, `  Chain! ${o.name} takes ${d}`); }
        }
      } else if (s.kind === 'heal') {
        if (s.pow) {
          if (!alive(t)) continue;
          const h = Math.min(Math.round((a.mag * s.pow + 8) * (s.healMul || 1) * (0.9 + this.rng() * 0.2)), t.maxhp - t.hp);
          t.hp += h; this.fx.push({ t: 'heal', name: t.name, amount: h }); L.push(`  ${t.name} recovers ${h} HP.`);
        }
        this.applyFx(a, t, s, L, 0);
      } else if (s.kind === 'buff') {
        if (alive(t) || s.fx.includes('revive')) this.applyFx(a, t, s, L, 0);
      }
    }
    if (s.recoil && alive(a)) { const d = Math.min(a.hp - 1, Math.max(1, Math.round(a.maxhp * s.recoil))); if (d > 0) { a.hp -= d; this.fx.push({ t: 'hit', name: a.name, d, ko: false, weak: false }); L.push(`  ${a.name} strains (${d})`); } }
    if (s.siphon && a.side === 'p' && dealt) { const m = Math.min(Math.round(dealt * s.siphon), a.maxmp - a.mp); if (m > 0) { a.mp += m; L.push(`  ${a.name} siphons ${m} MP.`); } }
    if (s.guard && alive(a)) { a.st.defup = 4; L.push(`  ${a.name} guards.`); }
    if (s.echo && !noEcho && !free && alive(a) && this.e.some(alive) && this.p.some(alive) && this.rng() < 0.35) {
      L.push('  ✦ Echo!'); this.cast(a, id, gems, target, L, true, true);
    }
  }
}

export function rewards(battle) {
  const r = { exp: 0, gold: 0, cp: 0, drops: [] };
  for (const e of battle.e) {
    r.cp += enemyCp(e.id);
    r.exp += Math.round(e.def_.exp * battle.mod.reward); r.gold += Math.round(e.def_.gold * battle.mod.reward);
    const d = DROPS[e.id];
    if (!d) continue;
    if (Array.isArray(d)) { if (battle.rng() < d[0]) r.drops.push({ kind: d[1], id: d[2], rare: false, from: e.id }); continue; } // legacy [chance, kind, id]
    // one roll per enemy: the rare drop is checked first, otherwise the common one
    // (a guaranteed common drop, chance 1, e.g. a boss's, is given on top)
    const rare = !!d.rare && battle.rng() < d.rare[2];
    if (rare) r.drops.push({ kind: d.rare[0], id: d.rare[1], rare: true, from: e.id });
    if (d.common && (d.common[2] >= 1 || (!rare && battle.rng() < d.common[2]))) r.drops.push({ kind: d.common[0], id: d.common[1], rare: false, from: e.id });
  }
  return r;
}
