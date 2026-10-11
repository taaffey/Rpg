// ===== Pure game logic (no DOM): stats, build rules, gem rewriting, battle engine =====
import { JOBS, SKILLS, GEMS, WEAPONS, ARMORS, ACCS, WEAPON_TYPES, ENEMIES, ITEMS, DROPS, ELEMENTS } from './data.js';

export const STAT_KEYS = ['hp', 'mp', 'atk', 'def', 'mag', 'spd'];
export const MAX_LEVEL = 20;
const BASE = { hp: 40, mp: 12, atk: 6, def: 4, mag: 6, spd: 6 };
const GROW = { hp: 9, mp: 3, atk: 1.6, def: 1.2, mag: 1.6, spd: 0.7 };
export const expNeeded = (lv) => Math.round(25 * Math.pow(lv, 1.5));

// ---------- Character build ----------
export function stats(c) {
  const mj = JOBS[c.main], sj = c.sub ? JOBS[c.sub] : null, s = {};
  for (const k of STAT_KEYS) {
    const m = mj.mod[k] + (sj ? (sj.mod[k] - 1) * 0.4 : 0); // sub job contributes 40% of its modifiers
    s[k] = Math.round((BASE[k] + GROW[k] * (c.level - 1)) * m);
  }
  for (const g of gear(c)) for (const k of STAT_KEYS) s[k] += g[k] || 0;
  return s;
}
export const gear = (c) => [WEAPONS[c.weapon], ARMORS[c.armor], ACCS[c.acc]].filter(Boolean);
export const resists = (c) => gear(c).flatMap((g) => g.res || []);
export function weaponOk(c, wid) {
  const t = WEAPONS[wid].type;
  return JOBS[c.main].weapons.includes(t) || (!!c.sub && JOBS[c.sub].weapons.includes(t));
}
export const sigSkill = (c) => (c.weapon ? WEAPON_TYPES[WEAPONS[c.weapon].type].sig : 'punch');
// skills a character may slot: whole main-job list by level; sub-job skills lag 2 levels behind
export function learnable(c) {
  const out = [];
  for (const [id, lv] of JOBS[c.main].skills) if (lv <= c.level) out.push(id);
  if (c.sub) for (const [id, lv] of JOBS[c.sub].skills) if (lv + 2 <= c.level && !out.includes(id)) out.push(id);
  return out;
}
export const gemCapacity = (c) => 2 + (c.extra || 0) + gear(c).reduce((n, g) => n + (g.sockets || 0), 0);
export const gemsUsed = (c) => c.gems.reduce((n, a) => n + a.length, 0);
export const SLOT_COUNT = 4, SIG = 4, GEMS_PER_SLOT = 3;
export const slotSkill = (c, i) => (i === SIG ? sigSkill(c) : c.slots[i]);
export function slotGems(c, i) {
  const g = [...c.gems[i]];
  if (i === SIG && c.weapon && WEAPONS[c.weapon].innate) g.unshift(WEAPONS[c.weapon].innate);
  return g;
}
// After any job/gear change, return anything that no longer fits to the inventory.
export function sanitize(c, inv) {
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
  const m = { id, ...sk, fx: [...(sk.fx || [])], hits: sk.hits || 1, pierce: sk.pierce || 0, chain: false, echo: false, vamp: 0, swift: false, stun: 0, execute: !!sk.execute, recoil: 0, siphon: 0, guard: false, crit: sk.crit || 0, tags: [] };
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
export function describeSkill(m) {
  const t = { one: 'one foe', all: 'all foes', ally: 'one ally', allies: 'all allies', self: 'self' }[m.tgt];
  const bits = [`${m.mp} MP`, t];
  if (m.pow) bits.push(`×${m.pow.toFixed(2)}${m.hits > 1 ? ` ×${m.hits} hits` : ''}`);
  if (m.elem) bits.push(m.elem);
  if (m.fx.length) bits.push(m.fx.join('/'));
  for (const f of ['chain', 'echo', 'swift']) if (m[f]) bits.push(f);
  if (m.vamp) bits.push('lifesteal');
  if (m.stun) bits.push('stun 35%'); if (m.crit) bits.push('crit 25%'); if (m.execute) bits.push('execute'); if (m.siphon) bits.push('MP siphon'); if (m.guard) bits.push('self-guard'); if (m.recoil) bits.push('recoil');
  if (m.pierce) bits.push(`pierce ${Math.round(m.pierce * 100)}%`);
  return bits.join(' · ');
}

// ---------- Characters ----------
export function newChar(name, main, sub, weapon, armor, level = 3) {
  const c = { name, level, exp: 0, main, sub, weapon, armor, acc: null, hp: 1, mp: 1, slots: [null, null, null, null], gems: [[], [], [], [], []] };
  const ok = learnable(c);
  const fill = [...JOBS[main].skills.map((s) => s[0]), ...(sub ? JOBS[sub].skills.map((s) => s[0]) : [])].filter((s) => ok.includes(s));
  c.slots = [0, 1, 2, 3].map((i) => fill[i] || null);
  const st = stats(c); c.hp = st.hp; c.mp = st.mp;
  return c;
}
export function gainExp(c, amount) {
  const ups = [];
  c.exp += amount;
  while (c.level < MAX_LEVEL && c.exp >= expNeeded(c.level)) {
    c.exp -= expNeeded(c.level);
    const before = stats(c); c.level++;
    const after = stats(c);
    c.hp += after.hp - before.hp; c.mp += after.mp - before.mp;
    ups.push(c.level);
  }
  if (c.level >= MAX_LEVEL) c.exp = 0;
  return ups;
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
      return { side: 'p', ch: c, name: c.name, hp: c.hp, mp: c.mp, maxhp: s.hp, maxmp: s.mp, atk: s.atk, def: s.def, mag: s.mag, spd: s.spd, weak: [], res: resists(c), st: {}, defending: false };
    });
    const counts = {}; enemyIds.forEach((id) => (counts[id] = (counts[id] || 0) + 1));
    const seen = {};
    this.e = enemyIds.map((id) => {
      const d = ENEMIES[id]; seen[id] = (seen[id] || 0) + 1;
      const name = counts[id] > 1 ? `${d.name} ${String.fromCharCode(64 + seen[id])}` : d.name;
      return { side: 'e', id, def_: d, name, icon: d.icon, hp: Math.round(d.hp * this.mod.hp), mp: Infinity, maxhp: Math.round(d.hp * this.mod.hp), maxmp: 0, atk: Math.round(d.atk * this.mod.atk), def: Math.round(d.def * this.mod.def), mag: Math.round(d.mag * this.mod.mag), spd: d.spd, weak: d.weak, res: d.res, st: {}, defending: false };
    });
  }
  side(x) { return x.side === 'p' ? this.p : this.e; }
  foes(x) { return x.side === 'p' ? this.e : this.p; }

  enemyCmd(e) {
    const tbl = e.def_.skills, tot = tbl.reduce((n, s) => n + s[1], 0);
    let r = this.rng() * tot, id = tbl[0][0];
    for (const [sid, w] of tbl) { if ((r -= w) < 0) { id = sid; break; } }
    return { kind: 'skill', skillId: id, gems: [], target: pick(this.p.filter(alive), this.rng) };
  }
  speed(x) { return x.spd * (x.st.slow > 0 ? 0.5 : 1) + this.rng() * 2; }
  // approximate upcoming action order (no randomness), for the turn-order bar
  order() { return [...this.p, ...this.e].filter(alive).sort((a, b) => b.spd * (b.st.slow > 0 ? 0.5 : 1) - a.spd * (a.st.slow > 0 ? 0.5 : 1)); }

  // Generator: yields an array of log lines after every action.
  *round(cmds) {
    this.turn++;
    const order = [];
    for (const x of [...this.p, ...this.e]) {
      if (!alive(x)) continue;
      const cmd = x.side === 'p' ? cmds.get(x) : this.enemyCmd(x);
      if (!cmd) continue;
      const swift = cmd.kind === 'skill' && skillWithGems(cmd.skillId, cmd.gems).swift;
      order.push({ x, cmd, pri: (cmd.kind === 'defend' ? 2 : swift ? 1 : 0), spd: this.speed(x) });
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
    t.hp = Math.max(0, t.hp - d);
    this.fx.push({ t: 'hit', name: t.name, d, ko: t.hp <= 0, weak });
    L.push(`${prefix} (${d})${t.hp <= 0 ? ` — ${t.name} falls!` : ''}`);
  }
  act(a, cmd) {
    const L = [];
    switch (cmd.kind) {
      case 'defend': a.defending = true; L.push(`${a.name} braces for impact.`); break;
      case 'flee':
        if (!this.boss && this.rng() < 0.65) { this.over = 'fled'; L.push('The party escapes!'); } else L.push('Couldn’t escape!');
        break;
      case 'item': {
        const it = ITEMS[cmd.item]; let t = cmd.target;
        if (it.revive) { if (alive(t)) { L.push(`${a.name} fumbles the ${it.name}.`); break; } t.hp = Math.round(t.maxhp * it.revive); this.fx.push({ t: 'heal', name: t.name, amount: t.hp, revived: true }); L.push(`${a.name} revives ${t.name}!`); }
        else if (!alive(t)) { L.push(`${a.name}’s ${it.name} has no effect.`); }
        else if (it.cure) { const ks = it.cure === 'all' ? ['poison', 'slow', 'stun'] : [it.cure], had = ks.filter((k) => t.st[k] > 0); ks.forEach((k) => { t.st[k] = 0; }); L.push(had.length ? `${a.name} uses ${it.name}: ${t.name} is cured.` : `${a.name} uses ${it.name}, but nothing happens.`); if (had.length) this.fx.push({ t: 'heal', name: t.name, amount: 0 }); }
        else if (it.heal) { const h = Math.min(it.heal, t.maxhp - t.hp); t.hp += h; this.fx.push({ t: 'heal', name: t.name, amount: h }); L.push(`${a.name} uses ${it.name}: ${t.name} +${h} HP`); }
        else if (it.mpr) { const h = Math.min(it.mpr, t.maxmp - t.mp); t.mp += h; L.push(`${a.name} uses ${it.name}: ${t.name} +${h} MP`); }
        break;
      }
      case 'skill': this.cast(a, cmd.skillId, cmd.gems || [], cmd.target, L, false, false); break;
    }
    return L;
  }
  resolveTargets(a, s, target) {
    const foes = this.foes(a), friends = this.side(a);
    switch (s.tgt) {
      case 'one': { const f = foes.filter(alive); return f.length ? [alive(target) && foes.includes(target) ? target : pick(f, this.rng)] : []; }
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
      if (f === 'drain' && dealt > 0 && alive(a)) { const h = Math.min(Math.round(dealt * 0.5), a.maxhp - a.hp); if (h > 0) { a.hp += h; this.fx.push({ t: 'heal', name: a.name, amount: h }); L.push(`  ${a.name} drains ${h} HP.`); } }
      if (f === 'revive' && !alive(t)) { t.hp = Math.round(t.maxhp * 0.4); this.fx.push({ t: 'heal', name: t.name, amount: t.hp, revived: true }); L.push(`  ${t.name} is revived!`); }
    }
  }
  damage(a, t, s, mult = 1, elem = s.elem) {
    const up = a.st.atkup > 0 ? 1.4 : 1, dup = t.st.defup > 0 ? 1.5 : 1;
    let raw = s.kind === 'phys' ? a.atk * up * s.pow - t.def * dup * 0.6 * (1 - s.pierce) : a.mag * up * s.pow - t.def * dup * 0.3 * (1 - s.pierce);
    raw *= (0.9 + this.rng() * 0.2) * elemMult(t, elem) * mult * (t.defending ? 0.5 : 1);
    if (s.execute && t.hp < t.maxhp * 0.35) raw *= 1.6;
    this.lastCrit = !!(s.crit && this.rng() < s.crit); if (this.lastCrit) raw *= 1.8;
    return Math.max(1, Math.round(raw));
  }
  cast(a, id, gems, target, L, free, noEcho) {
    const s = skillWithGems(id, gems);
    if (!free && a.side === 'p') {
      if (a.mp < s.mp) { L.push(`${a.name} lacks the MP!`); return; }
      a.mp -= s.mp;
    }
    const elem = s.elem === 'random' ? pick(['fire', 'ice', 'bolt'], this.rng) : s.elem;
    L.push(`${a.name} uses ${s.name}${s.tags.length ? ` [${s.tags.join(' + ')}]` : ''}!`);
    let dealt = 0;
    const targets = this.resolveTargets(a, s, target);
    this.fx.push({ t: 'cast', actor: a.name, kind: s.kind, elem, hostile: !!s.hostile, side: a.side, targets: targets.map((x) => x.name) });
    for (const t of targets) {
      if (s.kind === 'phys' || s.kind === 'mag') {
        let total = 0;
        for (let h = 0; h < s.hits && alive(t); h++) {
          const d = this.damage(a, t, s, 1, elem), crit = this.lastCrit; total += d; dealt += d;
          const em = elemMult(t, elem);
          this.hurt(t, d, L, `  ${t.name} takes ${d}${crit ? ' — CRITICAL!' : em > 1 ? ' — weakness!' : em < 1 ? ' — resisted' : ''}`, em > 1 || crit);
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
          const h = Math.min(Math.round((a.mag * s.pow + 8) * (0.9 + this.rng() * 0.2)), t.maxhp - t.hp);
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
  const r = { exp: 0, gold: 0, drops: [] };
  for (const e of battle.e) {
    r.exp += Math.round(e.def_.exp * battle.mod.reward); r.gold += Math.round(e.def_.gold * battle.mod.reward);
    const d = DROPS[e.id];
    if (d && battle.rng() < d[0]) r.drops.push({ kind: d[1], id: d[2] });
  }
  return r;
}
