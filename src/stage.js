// ===== Battle stage: painted 16-bit backdrop, large enemies, side-view party, animations, particles, damage numbers =====
import * as SP from './sprites.js';
import * as BA from './battleart.js';

export const FX = { shake: true };
export const W = BA.BW, H = BA.BH; // 256 x 176 logical pixels
const ELEM_COL = { fire: ['#ff9a2a', '#ffd25a', '#e04a20', '#fff2a0'], ice: ['#c8f4ff', '#7fd8f0', '#ffffff', '#4aa0e8'], bolt: ['#fff27a', '#ffffff', '#ffd25a'], holy: ['#ffffff', '#fff2a0', '#d0f0ff'], dark: ['#9a62e0', '#4a2a80', '#d0a0ff', '#20103a'], slash: ['#ffffff', '#d8e4ff'], heal: ['#7af0a0', '#c8ffd8', '#ffffff'], mp: ['#7ab0ff', '#c8e0ff', '#ffffff'] };
const STYLE = { slime: 'squash', bat: 'swoop', wolf: 'pounce', wraith: 'float', zombie: 'sway', golem: 'stomp', yeti: 'stomp', wyrm: 'swoop', lich: 'float', titan: 'stomp', imp: 'pounce', goblin: 'lunge', skeleton: 'lunge',
  hornet: 'swoop', shroom: 'squash', boar: 'lunge', bandit: 'lunge', sapling: 'sway', spider: 'pounce', bog_toad: 'pounce', leech: 'squash', wisp: 'float', lizardman: 'lunge', scorpion: 'lunge', sandworm: 'stomp', cactus: 'sway', mummy: 'sway',
  salamander: 'pounce', batswarm: 'swoop', ghoul_knight: 'lunge', banshee: 'float', bone_whelp: 'swoop', ice_elemental: 'float', harpy: 'swoop', mammoth: 'stomp', crystal_sentinel: 'stomp', thunderbird: 'swoop', cobra: 'sway', sphinx: 'pounce', cellar_rat: 'pounce', big_gary: 'squash', mash_tun: 'stomp' };
const HOVER = new Set(['bat', 'wraith', 'lich', 'hornet', 'wisp', 'batswarm', 'banshee', 'bone_whelp', 'ice_elemental', 'harpy', 'thunderbird']); // genuine flyers drift above their own shadow
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const whiteCache = new Map();
function silhouette(src, col = '#ffffff') {
  const k = col; let m = whiteCache.get(src); if (!m) whiteCache.set(src, (m = new Map()));
  if (!m.has(k)) { const c = mk(src.width, src.height), x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); m.set(k, c); }
  return m.get(k);
}
// pixel ellipse contact shadows, dithered
const shadowCache = new Map();
function shadow(w) {
  w = Math.max(6, Math.round(w)); if (shadowCache.has(w)) return shadowCache.get(w);
  const h = Math.max(3, Math.round(w / 4.5)), c = mk(w, h), x = c.getContext('2d');
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const q = ((i + 0.5 - w / 2) / (w / 2)) ** 2 + ((j + 0.5 - h / 2) / (h / 2)) ** 2; if (q > 1) continue; const a = q < 0.45 ? 0.5 : q < 0.8 ? 0.36 : (BA.bayer(i, j) < 0.5 ? 0.3 : 0); if (a) { x.fillStyle = `rgba(6,4,18,${a})`; x.fillRect(i, j, 1, 1); } }
  shadowCache.set(w, c); return c;
}
// 5x7 damage digits, pre-rendered per colour with a dark outline and a lit top
const DIG = { 0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'], 1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'], 2: ['01110', '10001', '00001', '00110', '01000', '10000', '11111'], 3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'], 4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], 5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'], 6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], 7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'], 8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'], 9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'] };
const digCache = new Map();
function digit(ch, col) {
  const k = ch + col; if (digCache.has(k)) return digCache.get(k);
  const g = DIG[ch], c = mk(7, 9), x = c.getContext('2d'), lite = BA.mix(col, '#ffffff', 0.55), dark = BA.mix(col, '#000000', 0.25);
  x.fillStyle = '#0c0814'; for (let y = 0; y < 7; y++) for (let i = 0; i < 5; i++) if (g[y][i] === '1') x.fillRect(i, y, 3, 3);
  for (let y = 0; y < 7; y++) for (let i = 0; i < 5; i++) if (g[y][i] === '1') { x.fillStyle = y < 2 ? lite : y > 4 ? dark : col; x.fillRect(i + 1, y + 1, 1, 1); }
  digCache.set(k, c); return c;
}
// Formations: [centreX, feetY]. The ground band runs from the horizon (~y 80) to the bottom of the stage.
const POS = { 1: [[78, 142]], 2: [[56, 124], [102, 154]], 3: [[42, 118], [100, 134], [60, 162]], 4: [[36, 112], [94, 122], [46, 148], [108, 162]], 5: [[30, 108], [82, 114], [130, 128], [42, 148], [98, 164]] };
const BOSS_POS = [72, 166];
const HERO_POS = [[206, 106], [217, 124], [206, 142], [217, 160]];
const HERO_FEET = 29; // hero frames are 32x32 with the soles on row 29
const ATK = 0.5; // hero physical attack duration
function wtypeOf(p) { const w = p.wpn; return w ? w.type : 'none'; }

export class Stage {
  constructor(battle, kind) {
    this.b = battle; this.canvas = mk(W, H); this.canvas.className = 'stage'; this.ctx = this.canvas.getContext('2d');
    const arena = battle.boss && ['crypt', 'spire', 'storm', 'ruins', 'cellar', 'brewery'].includes(kind) ? kind + ':boss' : kind;
    this.info = BA.backdropInfo(BA.BACKDROPS.includes(arena) ? arena : 'world'); this.bg = this.info.c; this.kind = this.info.kind;
    this.parts = []; this.floats = []; this.proj = []; this.shapes = []; this.running = true; this.last = performance.now(); this.lastElem = null; this.active = null; this.shake = 0; this.flashA = 0; this.flashC = '#ffffff';
    const live = battle.e, epos = POS[Math.min(5, live.length)] || POS[5]; let ni = 0;
    this.v = new Map();
    live.forEach((e, i) => {
      const spr = SP.enemy(e.id), big = SP.isBig(e.id), [x0, y0, x1, y1] = BA.bbox(spr), base = BA.enemyBase(e.id);
      const [cx, feet] = big ? BOSS_POS : epos[Math.min(ni++, epos.length - 1)];
      const hover = HOVER.has(base) ? (big ? 6 : 4) : 0;
      this.v.set(e.name, { c: e, side: 'e', big, style: STYLE[base] || 'lunge', spr, x: Math.round(cx - (x0 + x1 + 1) / 2), y: Math.round(feet - y1 - 1 - hover), feet, bb: [x0, y0, x1, y1], hover, w: spr.width, h: spr.height, dead: e.hp <= 0, deadT: e.hp <= 0 ? 9 : 0, t: 0, flash: 0, lunge: 0, cast: 0, blink: 0, seed: i * 1.7 });
    });
    battle.p.forEach((p, i) => {
      const [cx, feet] = HERO_POS[i] || HERO_POS[3], wt = wtypeOf(p);
      const frames = Object.fromEntries(BA.HERO_POSES.map((k) => [k, BA.heroFrame(p.ch.look ? `${p.ch.main}@${p.ch.look}` : p.ch.main, k, wt)]));
      this.v.set(p.name, { c: p, side: 'p', frames, spr: frames.idle, x: cx - 16, y: feet - HERO_FEET, feet, bb: [10, 4, 23, 29], w: 32, h: 32, dead: p.hp <= 0, deadT: p.hp <= 0 ? 9 : 0, t: 0, flash: 0, lunge: 0, cast: 0, atk: 0, step: 0, seed: i * 1.3 });
    });
    this.born = performance.now(); this.zoom = 0; this.cardT = -1; this.cardText = ''; this.cardDur = 2; this.won = false; this.ease = 0;
    this.fpsT = 0; this.fpsN = 0; this.fps = 60;
    this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }
  stop() { this.running = false; }
  pick(clientX, clientY) { // which living sprite sits under a tap (smallest box wins), for touch targeting
    const r = this.canvas.getBoundingClientRect(); if (!r.width) return null;
    const x = (clientX - r.left) * W / r.width, y = (clientY - r.top) * H / r.height; let best = null, area = 1e9;
    for (const v of this.v.values()) {
      if (v.dead || v.c.hp <= 0) continue;
      const x0 = v.x + v.bb[0] - 5, x1 = v.x + v.bb[2] + 5, y0 = v.y + v.bb[1] - 5, y1 = v.y + v.bb[3] + 5;
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && (x1 - x0) * (y1 - y0) < area) { area = (x1 - x0) * (y1 - y0); best = v; }
    }
    return best && { side: best.side, c: best.c };
  }
  setActive(name) { this.active = name; }
  card(text, dur = 2.2) { this.cardText = text; this.cardT = 0; this.cardDur = dur; }
  victory() {
    this.won = true; this.wonT = 0; this.card('VICTORY!', 1.6);
    for (const v of this.v.values()) if (v.side === 'p' && !v.dead) { const [cx, cy] = this.centre(v); this.effect('holy', cx, cy); }
  }
  centre(v) { return [v.x + (v.bb[0] + v.bb[2] + 1) / 2, v.y + (v.bb[1] + v.bb[3] + 1) / 2 - (v.hover ? 0 : 0)]; }
  top(v) { return v.y + v.bb[1]; }
  // ----- events from the battle engine -----
  event(e) {
    const v = this.v.get(e.actor || e.name);
    if (e.t === 'cast') {
      if (!v) return; this.lastElem = e.kind === 'heal' || e.kind === 'buff' ? (e.kind === 'heal' ? 'heal' : null) : (e.elem && e.elem !== 'random' ? e.elem : e.elem === 'random' ? 'fire' : 'slash');
      const [cx, cy] = this.centre(v);
      if (e.kind === 'phys') { if (v.side === 'p') v.atk = ATK; else { v.lunge = 0.36; v.slammed = false; v.blink = 0.18; } }
      else {
        v.cast = 0.6; if (v.side === 'e') v.blink = 0.3;
        let col = e.kind === 'heal' ? 'heal' : e.kind === 'buff' ? 'holy' : 'mp';
        const fx = v.side === 'p' ? BA.CLASS_FX[String((v.c.ch && v.c.ch.main) || '').split('@')[0]] : null; // class accents: Influencer pink ring light, Barmaid foam, Stag Do orange...
        if (fx) { const k = 'cls:' + (v.c.ch.main + '').split('@')[0] + col; ELEM_COL[k] = ELEM_COL[k] || (col === 'heal' ? [fx.c1, '#7af0a0', '#ffffff', fx.c2] : [fx.c1, fx.c2, fx.c1, '#ffffff']); col = k; }
        this.shapes.push({ k: 'circle', x: cx, y: v.feet + 1, r: v.big ? 30 : 12, t: 0, life: 0.6, col: ELEM_COL[col][0], col2: ELEM_COL[col][1] });
        this.burst(cx, cy, col, 10, 16, { g: -20 });
      }
      if (e.kind === 'mag') for (const n of (e.targets || []).slice(0, 5)) { // orb flies from caster to each target
        const t = this.v.get(n); if (!t) continue; const [tx, ty] = this.centre(t), cols = ELEM_COL[this.lastElem] || ELEM_COL.mp;
        this.proj.push({ sx: cx, sy: cy, tx, ty, t: 0, dur: 0.2, col: cols[0], col2: cols[1] || '#fff' });
      }
    } else if (e.t === 'hit' && v) {
      v.flash = 0.28; const [cx, cy] = this.centre(v), el = this.lastElem || 'slash';
      this.effect(el, cx, cy, v);
      this.number(cx, this.top(v) - 2, e.d, e.weak ? '#ffd25a' : v.side === 'p' ? '#ff8a8a' : '#ffffff');
      if (e.weak && FX.shake) this.shake = 0.25;
      if (e.weak || (e.ko && v.side === 'e' && v.big)) this.zoom = Math.max(this.zoom, v.big ? 0.06 : 0.04);
      if (e.ko) { v.dead = true; v.deadT = 0; if (v.side === 'e' && v.big) { this.flashA = 0.6; this.flashC = '#ffffff'; } }
    } else if (e.t === 'heal' && v) {
      if (e.revived) { v.dead = false; v.deadT = 0; }
      const [cx, cy] = this.centre(v); this.effect('heal', cx, cy, v);
      if (e.amount) this.number(cx, this.top(v) - 2, e.amount, '#7af0a0');
    }
  }
  number(x, y, n, col) { this.floats.push({ x, y, t: 0, s: String(n), col }); }
  burst(x, y, kind, n, spread = 10, extra = {}) {
    const cols = ELEM_COL[kind] || ELEM_COL.slash;
    for (let i = 0; i < n; i++) this.parts.push({ x: x + (Math.random() - 0.5) * spread, y: y + (Math.random() - 0.5) * spread, vx: (Math.random() - 0.5) * 36, vy: -Math.random() * 30, g: 0, life: 0.45 + Math.random() * 0.35, t: 0, col: cols[i % cols.length], sz: 1 + (i % 3 === 0 ? 1 : 0), ...extra });
  }
  effect(kind, x, y, v) {
    const big = v && v.big, R = big ? 2 : 1;
    if (kind === 'fire') {
      for (let i = 0; i < 18 * R; i++) { const a = Math.random() * 6.28, s = 10 + Math.random() * 26 * R; this.parts.push({ x: x + Math.cos(a) * 4, y: y + 6, vx: Math.cos(a) * s * 0.6, vy: -20 - Math.random() * 40, g: -10, life: 0.4 + Math.random() * 0.4, t: Math.random() * -0.1, col: ELEM_COL.fire[i % 4], sz: 2 + (i % 3 === 0 ? 1 : 0), fade: true }); }
      this.shapes.push({ k: 'ring', x, y, r0: 2, r1: 18 * R, t: 0, life: 0.3, col: '#ffd25a', col2: '#ff7a2a' });
    } else if (kind === 'ice') {
      for (let i = 0; i < 6 + 2 * R; i++) { const a = (i / (6 + 2 * R)) * 6.28; this.shapes.push({ k: 'shard', x: x + Math.cos(a) * 9 * R, y: y + Math.sin(a) * 7 * R, h: 6 + (i % 3) * 3 * R, t: -i * 0.02, life: 0.45 }); }
      for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.28; this.parts.push({ x, y, vx: Math.cos(a) * 34, vy: Math.sin(a) * 30, g: 30, life: 0.5, t: -0.25, col: ELEM_COL.ice[i % 4], sz: 2 }); }
    } else if (kind === 'bolt') {
      const pts = [[x + (Math.random() - 0.5) * 20, -4]]; while (pts[pts.length - 1][1] < y) { const [px, py] = pts[pts.length - 1]; pts.push([px + (Math.random() - 0.5) * 12 + (x - px) * 0.25, py + 6 + Math.random() * 6]); } pts[pts.length - 1] = [x, y];
      this.shapes.push({ k: 'bolt', pts, t: 0, life: 0.28 }); this.flashA = Math.max(this.flashA, 0.35); this.flashC = '#fff8c0'; this.burst(x, y, 'bolt', 12, 14);
    } else if (kind === 'holy') {
      this.shapes.push({ k: 'pillar', x, y: v ? v.feet : y + 12, w: big ? 22 : 12, t: 0, life: 0.6 });
      for (let i = 0; i < 18; i++) this.parts.push({ x: x + (Math.random() - 0.5) * 16 * R, y: y + 10, vx: 0, vy: -24 - Math.random() * 20, g: 0, life: 0.8, t: Math.random() * -0.2, col: ELEM_COL.holy[i % 3], sz: 1 + (i % 2), star: i % 4 === 0 });
    } else if (kind === 'dark') {
      for (let i = 0; i < 20; i++) { const a = (i / 20) * 6.28, r = 20 * R; this.parts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: -Math.cos(a) * r * 2.2, vy: -Math.sin(a) * r * 2.2, g: 0, life: 0.45, t: 0, col: ELEM_COL.dark[i % 4], sz: 2 }); }
      this.shapes.push({ k: 'ring', x, y, r0: 22 * R, r1: 2, t: 0.0, life: 0.45, col: '#d0a0ff', col2: '#4a2a80' });
    } else if (kind === 'heal') {
      for (let i = 0; i < 16; i++) this.parts.push({ x: x + (Math.random() - 0.5) * 18, y: y + 10, vx: 0, vy: -16 - Math.random() * 16, g: 0, life: 0.9, t: Math.random() * -0.2, col: ELEM_COL.heal[i % 3], sz: 1 + (i % 2), plus: i % 3 === 0 });
      this.shapes.push({ k: 'circle', x, y: v ? v.feet + 1 : y + 12, r: 12, t: 0, life: 0.6, col: '#7af0a0', col2: '#c8ffd8' });
    } else { // slash: two crossing arcs + sparks
      const s = big ? 1.8 : 1; this.shapes.push({ k: 'slash', x, y, s, a: -0.7, t: 0, life: 0.2 }); this.shapes.push({ k: 'slash', x, y, s, a: 0.6, t: -0.06, life: 0.2 });
      for (let i = 0; i < 8; i++) this.parts.push({ x, y, vx: (Math.random() - 0.5) * 70, vy: (Math.random() - 0.7) * 50, g: 90, life: 0.3, t: -0.05, col: i % 2 ? '#ffffff' : '#ffe08a', sz: 1 });
    }
  }
  // ----- frame -----
  loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.draw(now / 1000, dt);
    this.fpsT += dt; this.fpsN++; if (this.fpsT >= 1) { this.fps = this.fpsN / this.fpsT; this.fpsT = 0; this.fpsN = 0; }
    requestAnimationFrame(this.loop);
  }
  draw(t, dt) {
    const x = this.ctx; x.imageSmoothingEnabled = false;
    const sh = this.shake > 0 ? Math.round((Math.random() - 0.5) * 4) : 0; this.shake = Math.max(0, this.shake - dt);
    this.ease = 1 - Math.pow(1 - Math.min(1, (performance.now() - this.born) / 750), 3); this.zoom = Math.max(0, this.zoom - dt * 0.2);
    x.save(); x.translate(sh, 0);
    if (this.zoom > 0 && FX.shake) { x.translate(W / 2, H / 2); x.scale(1 + this.zoom, 1 + this.zoom); x.translate(-W / 2, -H / 2); }
    x.drawImage(this.bg, 0, 0);
    this.ambientBack(x, t);
    const list = [...this.v.values()].sort((a, b) => a.feet - b.feet);
    for (const v of list) this.shadowOf(x, v);
    for (const v of list) (v.side === 'p' ? this.drawHero(x, v, t, dt) : this.drawEnemy(x, v, t, dt));
    this.drawShapes(x, dt);
    this.drawParts(x, dt);
    this.ambientFront(x, t);
    x.restore();
    if (this.flashA > 0) { x.globalAlpha = Math.min(1, this.flashA); x.fillStyle = this.flashC; x.fillRect(0, 0, W, H); x.globalAlpha = 1; this.flashA = Math.max(0, this.flashA - dt * 3); }
    this.drawFloats(x, dt);
    this.drawCard(x, dt);
  }
  drawCard(x, dt) {
    if (this.cardT < 0) return;
    this.cardT += dt; const p = this.cardT / this.cardDur; if (p >= 1) { this.cardT = -1; return; }
    const slide = Math.min(1, p / 0.15), fade = p > 0.8 ? (1 - p) / 0.2 : 1, w = W * slide, cy = 50;
    x.globalAlpha = 0.75 * fade; x.fillStyle = '#05060f'; x.fillRect(0, cy - 12, w, 24); x.fillStyle = '#e8c060'; x.fillRect(0, cy - 12, w, 1); x.fillRect(0, cy + 11, w, 1); x.fillStyle = '#8a6a20'; x.fillRect(0, cy - 11, w, 1); x.fillRect(0, cy + 10, w, 1);
    x.globalAlpha = fade; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '8px "Press Start 2P", ui-monospace, monospace';
    const tx = Math.round(W / 2 + (1 - slide) * 120);
    x.fillStyle = '#201000'; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) x.fillText(this.cardText, tx + dx, cy + 0.5 + dy); x.fillStyle = '#fff2b0'; x.fillText(this.cardText, tx, cy + 0.5);
    x.globalAlpha = 1; x.textBaseline = 'alphabetic';
  }
  ambientBack(x, t) {
    for (const L of this.info.lights) { // flickering torch flames
      if (L[0] === 'lava') continue; const [lx, ly, col] = L, f = Math.sin(t * 13 + lx) * 0.5 + Math.sin(t * 29 + lx * 3) * 0.5, hgt = 5 + Math.round(f * 1.2), tip = BA.mix(col, '#ffffff', 0.6), deep = BA.mix(col, '#a02000', 0.35);
      x.fillStyle = deep; x.fillRect(lx - 1, ly - 2, 4, 2); x.fillStyle = col; x.fillRect(lx - 1, ly - hgt + 1, 4, hgt - 2); x.fillRect(lx, ly - hgt, 2, 1); x.fillStyle = tip; x.fillRect(lx, ly - hgt + 2, 2, Math.max(1, hgt - 4)); if (f > 0.3) x.fillRect(lx + (f > 0.6 ? 1 : 0), ly - hgt - 1, 1, 1);
    }
    const k = this.kind;
    if (k === 'world') { x.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 2; i++) { const cx = ((t * 2.5 + i * 140) % (W + 60)) - 30, cy = 46 + i * 7; x.fillRect(Math.round(cx), cy, 20, 2); x.fillRect(Math.round(cx) + 4, cy - 1, 10, 1); } }
    else if (k === 'swamp') { x.fillStyle = 'rgba(190,210,170,.10)'; for (let i = 0; i < 5; i++) x.fillRect(0, 80 + i * 14 + Math.round(Math.sin(t * 0.5 + i) * 3), W, 6); }
    else if (k === 'storm') { const ph = (t * 0.35) % 1; if (ph < 0.025 || (ph > 0.05 && ph < 0.065)) { x.fillStyle = 'rgba(220,230,255,.35)'; x.fillRect(0, 0, W, 80); } }
  }
  ambientFront(x, t) {
    const k = this.kind;
    if (k === 'boss') { for (let i = 0; i < 16; i++) { const px = (i * 37 + t * 8 + Math.sin(t + i) * 6) % W, py = H - ((t * 22 + i * 29) % 150); x.fillStyle = i % 3 ? '#ff9a3a' : '#ffd25a'; x.fillRect(Math.round(px), Math.round(py), 1, i % 4 ? 1 : 2); } }
    else if (k === 'storm') { x.fillStyle = 'rgba(180,200,255,.35)'; for (let i = 0; i < 26; i++) { const px = (i * 41 + t * 30) % W, py = (t * 220 + i * 53) % (H + 20) - 10; x.fillRect(Math.round(px), Math.round(py), 1, 4); } }
    else if (k === 'snow' || k === 'spire') { for (let i = 0; i < 40; i++) { x.fillStyle = i % 5 ? 'rgba(255,255,255,.85)' : 'rgba(220,236,255,.9)'; const sz = i % 7 === 0 ? 2 : 1; x.fillRect(Math.round((i * 29 + Math.sin(t * 0.8 + i) * 7 + t * 6) % W), Math.round((t * (12 + (i % 4) * 3) + i * 17) % H), sz, sz); } }
    else if (k === 'swamp') { for (let i = 0; i < 9; i++) if (Math.sin(t * 2 + i * 2) > 0.1) { x.fillStyle = '#e8ff80'; x.fillRect(Math.round((i * 31 + Math.sin(t * 0.7 + i) * 10) % W), 70 + ((i * 23) % 70) + Math.round(Math.sin(t + i) * 3), 1, 1); } }
    else if (k === 'crypt') { for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? 'rgba(140,255,170,.6)' : 'rgba(200,255,220,.4)'; x.fillRect(Math.round((i * 23 + Math.sin(t * 0.7 + i) * 8) % W), Math.round(H - 10 - ((t * 6 + i * 19) % 130)), 1, 1); } }
    else if (k === 'forest') { for (let i = 0; i < 8; i++) { x.fillStyle = 'rgba(255,250,200,.7)'; x.fillRect(Math.round((i * 37 + Math.sin(t * 0.6 + i) * 10) % W), Math.round(40 + ((t * 4 + i * 23) % 110)), 1, 1); } }
    else if (k === 'cellar' || k === 'brewery') { for (let i = 0; i < 18; i++) { const u = (t * (0.03 + (i % 5) * 0.008) + i * 0.137) % 1, px = (i * 47 + Math.sin(t * 0.4 + i) * 12 + u * 30) % W, py = 20 + ((i * 31) % 120) + Math.sin(t * 0.7 + i * 2) * 6; x.fillStyle = i % 4 ? 'rgba(255,220,160,.5)' : 'rgba(255,240,200,.8)'; x.fillRect(Math.round(px), Math.round(py), 1, 1); } } // dust motes in the lantern light
    else if (k === 'dungeon') { for (let i = 0; i < 10; i++) { x.fillStyle = i % 3 ? 'rgba(255,230,160,.45)' : 'rgba(190,150,255,.6)'; x.fillRect(Math.round((i * 29 + Math.sin(t + i) * 5) % W), Math.round(((t * 3 + i * 17) % 120) + 8), 1, 1); } }
  }
  shadowOf(x, v) {
    if (v.side === 'e' && v.dead && v.deadT > (v.big ? 1.4 : 0.55)) return;
    const bw = v.bb[2] - v.bb[0] + 1, sw = v.side === 'p' ? (v.dead ? 22 : 14) : Math.min(bw * 0.8, v.big ? 80 : 40), s = shadow(sw);
    const cx = v.x + (v.bb[0] + v.bb[2] + 1) / 2 + (v.side === 'p' ? (v.dead ? 0 : 1) - v.step : (v.ox || 0) * 0.6);
    x.drawImage(s, Math.round(cx - s.width / 2), Math.round(v.feet - s.height / 2 + 0.5));
  }
  heroPose(v, t) {
    const p = v.c;
    if (v.dead) return 'ko';
    if (v.atk > 0) { const k = 1 - v.atk / ATK; return k < 0.22 ? 'windup' : k < 0.62 ? 'strike' : 'ready'; }
    if (v.cast > 0) return 'cast';
    if (v.flash > 0) return 'hurt';
    if (this.won) return Math.floor((this.wonT || 0) * 3) % 2 === 0 ? 'victory' : 'idle';
    if (p.hp > 0 && p.hp < p.maxhp * 0.25) return 'kneel';
    if (this.active === p.name || p.defending) return 'ready';
    return 'idle';
  }
  drawHero(x, v, t, dt) {
    v.t += dt; v.flash = Math.max(0, v.flash - dt); v.cast = Math.max(0, v.cast - dt); v.atk = Math.max(0, v.atk - dt); if (v.dead) v.deadT += dt;
    if (v.c.hp <= 0 && !v.dead && v.flash <= 0) { v.dead = true; v.deadT = 0; } else if (v.c.hp > 0 && v.dead) v.dead = false; // stay in sync with the engine even without fx events
    if (this.won) this.wonT = (this.wonT || 0) + dt / Math.max(1, [...this.v.values()].filter((u) => u.side === 'p').length);
    const pose = this.heroPose(v, t), spr = v.frames[pose];
    // step forward when acting (FF style), run in/out for physical attacks
    let target = this.active === v.c.name && !v.dead ? 12 : 0, oy = 0;
    if (v.atk > 0) { const k = 1 - v.atk / ATK; target = k < 0.7 ? 26 : 12; }
    if (v.cast > 0) target = Math.max(target, 10);
    v.step += (target - v.step) * Math.min(1, dt * 16);
    let ox = -Math.round(v.step) + Math.round((1 - this.ease) * 80);
    if (pose === 'hurt') ox += 3 + Math.round(Math.sin(v.t * 60));
    if (this.won && pose === 'victory') oy = -Math.round(Math.abs(Math.sin((this.wonT || 0) * Math.PI * 3)) * 3);
    if (pose === 'ko') { const [, , , y1] = BA.bbox(spr); x.drawImage(spr, v.x + ox, v.feet - y1 - 1); return; }
    const px = v.x + ox, py = v.y + oy;
    x.drawImage(spr, px, py);
    if (v.flash > 0.12) { x.globalAlpha = Math.min(1, (v.flash - 0.12) * 6); x.drawImage(silhouette(spr, '#ffffff'), px, py); x.globalAlpha = 1; }
    if (v.cast > 0) { x.globalAlpha = 0.35 + 0.35 * Math.sin(v.t * 30); x.drawImage(silhouette(spr, '#c8e0ff'), px, py); x.globalAlpha = 1; }
    this.statusIcons(x, v, px + 16, py + 3, t);
  }
  drawEnemy(x, v, t, dt) {
    v.t += dt; v.flash = Math.max(0, v.flash - dt); v.lunge = Math.max(0, v.lunge - dt); v.cast = Math.max(0, v.cast - dt); v.blink = Math.max(0, v.blink - dt); if (v.dead) v.deadT += dt;
    let ox = 0, oy = 0, sx = 1, sy = 1, alpha = 1;
    if (v.lunge > 0) {
      const pr = 1 - v.lunge / 0.36, sn = Math.sin(pr * Math.PI), K = v.big ? 0.7 : 1.4;
      switch (v.style) {
        case 'squash': ox = 14 * K * sn; sy = 1 - 0.25 * sn; sx = 1 + 0.18 * sn; break;
        case 'swoop': ox = 26 * K * sn; oy = pr < 0.5 ? -14 * Math.sin(pr * 2 * Math.PI) : 5 * Math.sin((pr - 0.5) * 2 * Math.PI); break;
        case 'pounce': ox = 28 * K * sn; oy = -12 * sn; break;
        case 'float': ox = 14 * K * sn; alpha = 1 - 0.4 * sn; break;
        case 'sway': ox = 12 * K * sn; oy = Math.sin(pr * 12) * 1.5; break;
        case 'stomp': oy = pr < 0.5 ? -12 * (pr / 0.5) : pr < 0.65 ? -12 * (1 - (pr - 0.5) / 0.15) : 0; ox = 6 * sn; if (pr >= 0.65 && !v.slammed) { v.slammed = true; if (FX.shake) this.shake = 0.24; const [cx] = this.centre(v); this.burst(cx, v.feet - 1, 'slash', 10, v.bb[2] - v.bb[0], { col: '#c8b898', g: 60 }); } break;
        default: ox = 22 * K * sn;
      }
    }
    if (v.cast > 0) oy -= 3 * Math.sin((1 - v.cast / 0.6) * Math.PI);
    ox -= Math.round((1 - this.ease) * 120);
    if (!v.dead && v.hover) oy -= Math.round(Math.sin(t * 2.4 + v.seed) * 2);
    if (v.flash > 0 && !v.dead) ox += Math.round(Math.sin(v.t * 70) * 2);
    v.ox = ox;
    const px = Math.round(v.x + ox), py = Math.round(v.y + oy);
    if (v.dead) { this.dissolve(x, v, px, py); return; }
    if (sx !== 1 || sy !== 1 || alpha !== 1) { x.save(); x.globalAlpha = alpha; x.translate(px + v.w / 2, py + v.bb[3] + 1); x.scale(sx, sy); x.drawImage(v.spr, -v.w / 2, -(v.bb[3] + 1)); x.restore(); }
    else x.drawImage(v.spr, px, py);
    const fl = v.flash > 0.1 ? 1 : v.blink > 0 && Math.floor(v.blink * 20) % 2 === 0 ? 0.6 : 0;
    if (fl) { x.globalAlpha = fl; x.drawImage(silhouette(v.spr, '#ffffff'), px, py); x.globalAlpha = 1; }
    this.statusIcons(x, v, px + (v.bb[0] + v.bb[2]) / 2, py + v.bb[1] - 4, t);
  }
  // FF-style death: the enemy flushes purple/red and dissolves top-down in a dithered wipe (bosses take longer and burst)
  dissolve(x, v, px, py) {
    const dur = v.big ? 1.6 : 0.6, k = Math.min(1, v.deadT / dur); if (k >= 1) return;
    if (!v.dz) { v.dz = mk(v.w, v.h); v.dzx = v.dz.getContext('2d'); }
    const c = v.dzx, [x0, y0, x1, y1] = v.bb, hgt = y1 - y0 + 1;
    c.clearRect(0, 0, v.w, v.h); c.globalCompositeOperation = 'source-over'; c.drawImage(v.spr, 0, 0);
    c.globalAlpha = Math.min(0.85, k * 3); c.globalCompositeOperation = 'source-atop'; c.fillStyle = v.big ? '#ff60a0' : '#c050c0'; c.fillRect(0, 0, v.w, v.h); c.globalAlpha = 1;
    c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000';
    const edge = y0 + (k * 1.25 - 0.15) * hgt;
    for (let yy = y0; yy <= y1; yy++) { const d = (edge - yy) / 6; if (d >= 1) c.fillRect(0, yy, v.w, 1); else if (d > 0) for (let xx = x0; xx <= x1; xx++) if (BA.bayer(xx, yy) < d) c.fillRect(xx, yy, 1, 1); }
    c.globalCompositeOperation = 'source-over';
    x.drawImage(v.dz, px, py);
    if (v.big && Math.random() < 0.35) { const ex = px + x0 + Math.random() * (x1 - x0), ey = py + y0 + Math.random() * hgt; this.burst(ex, ey, 'fire', 6, 8); if (FX.shake) this.shake = Math.max(this.shake, 0.08); }
    if (!v.big && Math.random() < 0.5) this.parts.push({ x: px + x0 + Math.random() * (x1 - x0), y: py + edge, vx: 0, vy: -20, g: 0, life: 0.3, t: 0, col: '#ff9ae0', sz: 1 });
  }
  statusIcons(x, v, cx, ty, t) {
    const st = v.c.st, icons = [];
    if (st.poison > 0) icons.push(['#7acf4a', '#2a5a1a']); if (st.slow > 0) icons.push(['#7ab0ff', '#2a4a8a']); if (st.stun > 0) icons.push(['#ffe45a', '#8a6a10']); if (st.atkup > 0) icons.push(['#ff9a2a', '#8a3a10']); if (st.defup > 0) icons.push(['#f4d35e', '#7a5a10']);
    let ix = Math.round(cx - icons.length * 2.5); const bob = Math.round(Math.abs(Math.sin(t * 4 + v.seed)));
    for (const [c1, c2] of icons) { x.fillStyle = '#0c0814'; x.fillRect(ix - 1, ty - 1 - bob, 5, 5); x.fillStyle = c2; x.fillRect(ix, ty - bob, 3, 3); x.fillStyle = c1; x.fillRect(ix, ty - bob, 2, 2); ix += 5; }
  }
  drawShapes(x, dt) {
    for (const s of this.shapes) {
      s.t += dt; if (s.t < 0) continue; const k = s.t / s.life; if (k >= 1) continue;
      if (s.k === 'slash') { // white crescent sweeping across the target
        const n = 14, r = 13 * s.s, sweep = Math.min(1, k * 2.2), fade = k > 0.5 ? 1 - (k - 0.5) * 2 : 1;
        for (let i = 0; i < n * sweep; i++) { const u = i / n, a = s.a + (u - 0.5) * 2.2, rx = s.x + Math.cos(a + 1.57) * r * (u - 0.5) * 1.6 + Math.cos(a) * Math.sin(u * Math.PI) * 4 * s.s, ry = s.y + Math.sin(a + 1.57) * r * (u - 0.5) * 1.6 + Math.sin(a) * Math.sin(u * Math.PI) * 4 * s.s, th = Math.max(1, Math.round(Math.sin(u * Math.PI) * 3 * s.s));
          x.globalAlpha = fade; x.fillStyle = '#c8d8ff'; x.fillRect(Math.round(rx) - 1, Math.round(ry) - 1, th + 1, th + 1); x.fillStyle = '#ffffff'; x.fillRect(Math.round(rx), Math.round(ry), th, th); }
        x.globalAlpha = 1;
      } else if (s.k === 'ring') { const r = s.r0 + (s.r1 - s.r0) * k, n = Math.max(12, Math.round(r * 2)); x.globalAlpha = 1 - k; for (let i = 0; i < n; i++) { const a = (i / n) * 6.28; x.fillStyle = i % 2 ? s.col : s.col2; x.fillRect(Math.round(s.x + Math.cos(a) * r), Math.round(s.y + Math.sin(a) * r * 0.8), 2, 2); } x.globalAlpha = 1; }
      else if (s.k === 'circle') { const r = s.r * (0.6 + 0.4 * Math.min(1, k * 3)), n = Math.round(r * 3); x.globalAlpha = k > 0.6 ? (1 - k) / 0.4 : 1; for (let i = 0; i < n; i++) { const a = (i / n) * 6.28 + s.t * 3; x.fillStyle = i % 3 ? s.col : s.col2; x.fillRect(Math.round(s.x + Math.cos(a) * r), Math.round(s.y + Math.sin(a) * r * 0.32), 1, 1); if (i % 6 === 0) x.fillRect(Math.round(s.x + Math.cos(a) * r), Math.round(s.y + Math.sin(a) * r * 0.32) - 2 - Math.round(k * 8), 1, 2); } x.globalAlpha = 1; }
      else if (s.k === 'bolt') { const fl = Math.floor(s.t * 40) % 2; x.globalAlpha = 1 - k * 0.6; for (let i = 0; i < s.pts.length - 1; i++) { const [ax, ay] = s.pts[i], [bx, by] = s.pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay)); for (let j = 0; j <= n; j++) { const qx = Math.round(ax + (bx - ax) * j / n), qy = Math.round(ay + (by - ay) * j / n); x.fillStyle = fl ? '#fff27a' : '#a8c8ff'; x.fillRect(qx - 1, qy, 3, 1); x.fillStyle = '#ffffff'; x.fillRect(qx, qy, 1, 1); } } x.globalAlpha = 1; }
      else if (s.k === 'pillar') { const w = Math.round(s.w * Math.sin(Math.min(1, k * 1.5) * Math.PI) ), top = 0; if (w > 0) { x.globalAlpha = 0.55; x.fillStyle = '#fff6c8'; x.fillRect(Math.round(s.x - w / 2), top, w, s.y - top); x.globalAlpha = 0.9; x.fillStyle = '#ffffff'; x.fillRect(Math.round(s.x - w / 4), top, Math.max(1, Math.round(w / 2)), s.y - top); x.globalAlpha = 1; } }
      else if (s.k === 'shard') { const g = Math.min(1, k * 4), h = Math.round(s.h * g), fade = k > 0.7 ? (1 - k) / 0.3 : 1; x.globalAlpha = fade; for (let j = 0; j < h; j++) { const half = Math.round((1 - j / Math.max(1, h)) * 2); x.fillStyle = '#4aa0e8'; x.fillRect(Math.round(s.x) - half - 1, Math.round(s.y) - j, half * 2 + 3, 1); x.fillStyle = j > h * 0.4 ? '#ffffff' : '#c8f4ff'; x.fillRect(Math.round(s.x) - half, Math.round(s.y) - j, half + 1, 1); } x.globalAlpha = 1; }
    }
    this.shapes = this.shapes.filter((s) => s.t < s.life);
  }
  drawParts(x, dt) {
    for (const p of this.parts) {
      p.t += dt; if (p.t < 0) continue; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
      const life = 1 - p.t / p.life; x.globalAlpha = Math.max(0, Math.min(1, life * 1.6)); x.fillStyle = p.fade && life < 0.4 ? '#8a2a10' : p.col;
      const px = Math.round(p.x), py = Math.round(p.y);
      if (p.plus) { x.fillRect(px - 1, py, 3, 1); x.fillRect(px, py - 1, 1, 3); }
      else if (p.star) { x.fillRect(px - 1, py, 3, 1); x.fillRect(px, py - 1, 1, 3); x.fillStyle = '#ffffff'; x.fillRect(px, py, 1, 1); }
      else x.fillRect(px, py, p.sz, p.h || p.sz);
    }
    x.globalAlpha = 1; this.parts = this.parts.filter((p) => p.t < p.life);
    if (this.parts.length > 600) this.parts.splice(0, this.parts.length - 600);
    for (const o of this.proj) {
      o.t += dt; const k = Math.min(1, o.t / o.dur), e = k * k * (3 - 2 * k), px = o.sx + (o.tx - o.sx) * e, py = o.sy + (o.ty - o.sy) * e - Math.sin(k * Math.PI) * 14;
      for (let j = 0; j < 2; j++) this.parts.push({ x: px, y: py, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, g: 0, life: 0.25, t: 0, col: o.col2, sz: 1 });
      x.fillStyle = o.col; x.fillRect(Math.round(px) - 2, Math.round(py) - 1, 5, 3); x.fillRect(Math.round(px) - 1, Math.round(py) - 2, 3, 5); x.fillStyle = '#fff'; x.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2);
    }
    this.proj = this.proj.filter((o) => o.t < o.dur);
  }
  drawFloats(x, dt) { // FF-style bouncing damage numbers
    for (const f of this.floats) {
      f.t += dt; const tt = f.t, b = tt < 0.18 ? Math.sin((tt / 0.18) * Math.PI) * 9 : tt < 0.3 ? Math.sin(((tt - 0.18) / 0.12) * Math.PI) * 3 : 0;
      const y = Math.round(f.y - 8 - b), w = f.s.length * 6, x0 = Math.round(f.x - w / 2);
      x.globalAlpha = Math.max(0, Math.min(1, (1.05 - tt) * 5));
      [...f.s].forEach((ch, i) => { if (DIG[ch]) x.drawImage(digit(ch, f.col), x0 + i * 6 - 1, y - 1); });
    }
    x.globalAlpha = 1; this.floats = this.floats.filter((f) => f.t < 1.05);
  }
}
