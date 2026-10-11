// ===== Battle stage: painted backdrop, sprites, attack animations, particles, damage numbers =====
import * as SP from './sprites.js';

export const FX = { shake: true };
const W = 160, H = 90;
const STYLE = { slime: 'squash', bat: 'swoop', wolf: 'pounce', wraith: 'float', zombie: 'sway', golem: 'stomp', yeti: 'stomp', wyrm: 'swoop', lich: 'float', titan: 'stomp', imp: 'pounce' };
const FONT = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111' };
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function rng(seed) { let a = seed; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const whiteCache = new Map();
function silhouette(src) {
  if (!whiteCache.has(src)) { const c = mk(src.width, src.height), x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); whiteCache.set(src, c); }
  return whiteCache.get(src);
}

// ---------- backdrops (drawn once at low-res) ----------
const DUNGEON_PAL = {
  dungeon: { top: '#1d1a2c', bot: '#2c2840', stal: '#100e1a', f0: '#2a2638', f1: '#15121f', specks: ['#34304a', '#1c1828', '#3c3858'], flame: '#ffb23a', tip: '#fff2a0', rim: 'rgba(255,255,255,.05)' },
  boss: { top: '#2a0f18', bot: '#5a1a10', stal: '#14070a', f0: '#3a1612', f1: '#1a0a0a', specks: ['#4a1c14', '#2a0e0c', '#6a2a18'], flame: '#ffb23a', tip: '#fff2a0', rim: 'rgba(255,120,40,.35)', lava: true },
  crypt: { top: '#0e1a16', bot: '#22342c', stal: '#070e0c', f0: '#22322a', f1: '#0e1612', specks: ['#2a3c34', '#162018', '#34483e'], flame: '#6aff8a', tip: '#d8ffe0', rim: 'rgba(120,255,160,.12)', graves: true },
  spire: { top: '#274670', bot: '#5a82b4', stal: '#cfe8fa', f0: '#7a9cc8', f1: '#3a5a88', specks: ['#8ab0d8', '#4a6a98', '#a8c8e8'], flame: '#8ad8ff', tip: '#ffffff', rim: 'rgba(255,255,255,.3)', ice: true },
};
function backdrop(kind) {
  const c = mk(W, H), x = c.getContext('2d'), r = rng(kind.length * 31 + 7);
  const grad = (y0, y1, a, b) => { for (let y = y0; y < y1; y++) { const t = (y - y0) / (y1 - y0), m = (i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t); x.fillStyle = `rgb(${m(1)},${m(3)},${m(5)})`; x.fillRect(0, y, W, 1); } };
  if (kind === 'world' || kind === 'snow' || kind === 'swamp') {
    const o = { world: { sky: ['#4a90e0', '#c4e8f8'], far: '#5a9a5a', near: '#3f8a3a', gr: ['#4f9a3f', '#2f6a2a'], sp: ['#5aa84a', '#3d7a30', '#6ab85a', '#2a5a24'] },
      snow: { sky: ['#8aa0c0', '#e6eef8'], far: '#b8c8e0', near: '#9ab0d0', gr: ['#e8f0f8', '#b8cce4'], sp: ['#ffffff', '#c2d4ea', '#d8e6f4', '#a8bcd8'] },
      swamp: { sky: ['#3a4a3a', '#8a9a68'], far: '#2a4030', near: '#1f3226', gr: ['#3d5c3a', '#1f3226'], sp: ['#334f33', '#486a40', '#2c442e', '#52743f'] } }[kind];
    grad(0, 46, o.sky[0], o.sky[1]);
    x.fillStyle = o.far; for (let i = 0; i < W; i++) { const h = 8 + Math.sin(i / 14) * 5 + Math.sin(i / 5) * 1.5; x.fillRect(i, 46 - h, 1, h); }
    x.fillStyle = o.near; for (let i = 0; i < W; i++) { const h = 4 + Math.sin(i / 9 + 2) * 3; x.fillRect(i, 46 - h, 1, h); }
    if (kind !== 'world') { // silhouette trees on the horizon
      x.fillStyle = kind === 'snow' ? '#5a7a98' : '#16241c';
      for (let i = 0; i < 9; i++) { const tx = 6 + i * 18 + Math.floor(r() * 8), th = 10 + Math.floor(r() * 8); for (let k = 0; k < th; k++) x.fillRect(tx - Math.floor((th - k) / 4), 46 - 4 - k, 2 + Math.floor((th - k) / 2), 1); x.fillRect(tx, 42, 1, 5); }
    }
    grad(46, H, o.gr[0], o.gr[1]);
    for (let i = 0; i < 260; i++) { x.fillStyle = o.sp[Math.floor(r() * 4)]; x.fillRect(Math.floor(r() * W), 46 + Math.floor(r() * (H - 46)), 1, 1); }
    if (kind === 'world') for (let i = 0; i < 14; i++) { x.fillStyle = ['#f2f2f2', '#f4d35e', '#ee80a8'][i % 3]; x.fillRect(Math.floor(r() * W), 50 + Math.floor(r() * 38), 1, 1); }
    if (kind === 'swamp') for (let i = 0; i < 7; i++) { const px = Math.floor(r() * (W - 14)), py = 56 + Math.floor(r() * 28); x.fillStyle = '#243c48'; x.fillRect(px, py, 10, 2); x.fillStyle = '#3e6676'; x.fillRect(px + 2, py, 5, 1); }
    if (kind === 'snow') for (let i = 0; i < 9; i++) { x.fillStyle = '#9ab0d0'; const px = Math.floor(r() * W), py = 52 + Math.floor(r() * 34); x.fillRect(px, py, 6, 1); }
    return c;
  }
  const P = DUNGEON_PAL[kind] || DUNGEON_PAL.dungeon;
  grad(0, H, P.top, P.bot);
  for (let row = 0; row < 12; row++) for (let col = -1; col < 13; col++) { const ox = (row % 2) * 7; x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(col * 14 + ox + 13, row * 5, 1, 4); if (row < 9) x.fillRect(col * 14 + ox, row * 5 + 4, 14, 1); }
  x.fillStyle = P.stal;
  for (let i = 0; i < 12; i++) { const px = i * 14 + Math.floor(r() * 8), hgt = 6 + Math.floor(r() * 14); for (let k = 0; k < hgt; k++) x.fillRect(px + Math.floor(k / 3), k, 8 - Math.floor(k / 1.6), 1); }
  grad(52, H, P.f0, P.f1);
  x.fillStyle = P.rim; x.fillRect(0, 52, W, 1);
  for (let i = 0; i < 180; i++) { x.fillStyle = P.specks[i % 3]; x.fillRect(Math.floor(r() * W), 53 + Math.floor(r() * (H - 53)), 1 + Math.floor(r() * 2), 1); }
  if (P.lava) { for (let i = 0; i < 6; i++) { const lx = 10 + i * 28 + Math.floor(r() * 10); x.fillStyle = '#ff7a2a'; x.fillRect(lx, 80, 6, 1); x.fillStyle = '#ffd25a'; x.fillRect(lx + 1, 80, 3, 1); } }
  else if (P.graves) { for (const gx of [6, 70, 132]) { x.fillStyle = '#16221c'; x.fillRect(gx, 44, 8, 9); x.fillRect(gx + 1, 42, 6, 2); x.fillStyle = '#2c3c34'; x.fillRect(gx + 3, 45, 2, 5); x.fillRect(gx + 2, 46, 4, 1); } }
  else if (P.ice) { for (let i = 0; i < 10; i++) { const px = 8 + i * 15 + Math.floor(r() * 6); x.fillStyle = '#e8f6ff'; for (let k = 0; k < 7; k++) x.fillRect(px + (k >> 2), k, 3 - (k >> 1), 1); } }
  if (!P.lava) for (const tx of [22, 98]) { x.fillStyle = '#5a3a20'; x.fillRect(tx, 22, 2, 6); x.fillStyle = P.flame; x.fillRect(tx - 1, 19, 4, 3); x.fillStyle = P.tip; x.fillRect(tx, 20, 2, 1); }
  return c;
}

const POS = { 1: [[44, 46]], 2: [[30, 40], [54, 56]], 3: [[20, 36], [46, 50], [24, 62]], 4: [[14, 34], [40, 44], [18, 58], [44, 68]], 5: [[12, 32], [36, 40], [60, 48], [18, 58], [42, 68]] };
const HERO_POS = [[122, 18], [116, 35], [122, 52], [116, 69]];
const ELEM_COL = { fire: ['#ff9a2a', '#ffd25a', '#e04a20'], ice: ['#c8f4ff', '#7fd8f0', '#ffffff'], bolt: ['#fff27a', '#ffffff', '#ffd25a'], holy: ['#ffffff', '#fff2a0', '#d0f0ff'], dark: ['#9a62e0', '#4a2a80', '#d0a0ff'], slash: ['#ffffff', '#d8e4ff'], heal: ['#7af0a0', '#c8ffd8', '#ffffff'], mp: ['#7ab0ff', '#c8e0ff'] };

export class Stage {
  constructor(battle, kind) {
    this.b = battle; this.canvas = mk(W, H); this.canvas.className = 'stage'; this.ctx = this.canvas.getContext('2d');
    this.bg = backdrop(kind); this.kind = kind; this.parts = []; this.floats = []; this.proj = []; this.running = true; this.last = performance.now(); this.lastElem = null; this.active = null; this.shake = 0;
    const epos = POS[Math.min(5, battle.e.length)] || POS[5];
    this.v = new Map();
    battle.e.forEach((e, i) => { const big = SP.isBig(e.id), spr = SP.enemy(e.id), [px, py] = big ? [46, 36] : epos[i]; this.v.set(e.name, { c: e, side: 'e', style: STYLE[SP.baseOf(e.id)] || STYLE[e.id] || 'lunge', spr, x: px, y: py, w: spr.width, h: spr.height, dead: false, t: 0, flash: 0, lunge: 0, cast: 0, seed: i * 1.7 }); });
    battle.p.forEach((p, i) => { const spr = SP.hero(p.ch.main), [px, py] = HERO_POS[i]; this.v.set(p.name, { c: p, side: 'p', style: 'lunge', spr, x: px, y: py, w: 16, h: 16, dead: p.hp <= 0, deadT: p.hp <= 0 ? 9 : 0, t: 0, flash: 0, lunge: 0, cast: 0, seed: i * 1.3 }); });
    this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }
  stop() { this.running = false; }
  setActive(name) { this.active = name; }
  // ----- events from the battle engine -----
  event(e) {
    const v = this.v.get(e.actor || e.name);
    if (e.t === 'cast') {
      if (!v) return; this.lastElem = e.kind === 'heal' || e.kind === 'buff' ? (e.kind === 'heal' ? 'heal' : null) : (e.elem && e.elem !== 'random' ? e.elem : e.elem === 'random' ? 'fire' : 'slash');
      if (e.kind === 'phys') { v.lunge = 0.32; v.slammed = false; } else { v.cast = 0.5; this.burst(v.x + v.w / 2, v.y + v.h / 2, 'mp', 8, 14); }
      if (e.kind === 'mag') for (const n of (e.targets || []).slice(0, 4)) { // orb flies from caster to each target
        const t = this.v.get(n); if (!t) continue;
        this.proj.push({ sx: v.x + v.w / 2, sy: v.y + v.h / 2, tx: t.x + t.w / 2, ty: t.y + t.h / 2, t: 0, dur: 0.2, col: (ELEM_COL[this.lastElem] || ELEM_COL.mp)[0], col2: (ELEM_COL[this.lastElem] || ELEM_COL.mp)[1] || '#fff' });
      }
    } else if (e.t === 'hit' && v) {
      v.flash = 0.25; v.shake = 0.3;
      const cx = v.x + v.w / 2, cy = v.y + v.h / 2, el = this.lastElem || 'slash';
      this.effect(el, cx, cy);
      this.number(cx, v.y - 2, e.d, e.weak ? '#ffd25a' : v.side === 'p' ? '#ff7a7a' : '#ffffff');
      if (e.weak && FX.shake) this.shake = 0.25;
      if (e.ko) { v.dead = true; v.deadT = 0; }
    } else if (e.t === 'heal' && v) {
      if (e.revived) { v.dead = false; v.deadT = 0; }
      this.effect('heal', v.x + v.w / 2, v.y + v.h / 2);
      if (e.amount) this.number(v.x + v.w / 2, v.y - 2, e.amount, '#7af0a0');
    }
  }
  number(x, y, n, col) { this.floats.push({ x, y, t: 0, s: String(n), col }); }
  burst(x, y, kind, n, spread = 10, extra = {}) {
    const cols = ELEM_COL[kind] || ELEM_COL.slash;
    for (let i = 0; i < n; i++) this.parts.push({ x: x + (Math.random() - 0.5) * spread, y: y + (Math.random() - 0.5) * spread, vx: (Math.random() - 0.5) * 24, vy: -Math.random() * 20, g: 0, life: 0.45 + Math.random() * 0.3, t: 0, col: cols[i % cols.length], sz: 1, ...extra });
  }
  effect(kind, x, y) {
    if (kind === 'fire') this.burst(x, y + 4, 'fire', 22, 12, { g: -30, sz: 2 });
    else if (kind === 'ice') { for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.28; this.parts.push({ x, y, vx: Math.cos(a) * 26, vy: Math.sin(a) * 26, g: 20, life: 0.5, t: 0, col: ELEM_COL.ice[i % 3], sz: 2 }); } }
    else if (kind === 'bolt') { for (let k = 0; k < 7; k++) this.parts.push({ x: x + (k % 2 ? 3 : -3), y: y - 24 + k * 5, vx: 0, vy: 0, g: 0, life: 0.22, t: 0, col: ELEM_COL.bolt[k % 3], sz: 2, h: 5 }); this.burst(x, y, 'bolt', 8, 14); }
    else if (kind === 'holy') { for (let i = 0; i < 16; i++) this.parts.push({ x: x + (Math.random() - 0.5) * 14, y: y + 6, vx: 0, vy: -18 - Math.random() * 14, g: 0, life: 0.7, t: 0, col: ELEM_COL.holy[i % 3], sz: 1 + (i % 2) }); }
    else if (kind === 'dark') { for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.28; this.parts.push({ x: x + Math.cos(a) * 14, y: y + Math.sin(a) * 14, vx: -Math.cos(a) * 28, vy: -Math.sin(a) * 28, g: 0, life: 0.5, t: 0, col: ELEM_COL.dark[i % 3], sz: 2 }); } }
    else if (kind === 'heal') { for (let i = 0; i < 12; i++) this.parts.push({ x: x + (Math.random() - 0.5) * 14, y: y + 6, vx: 0, vy: -14 - Math.random() * 12, g: 0, life: 0.8, t: 0, col: ELEM_COL.heal[i % 3], sz: 1 + (i % 2), plus: i % 3 === 0 }); }
    else for (let k = 0; k < 9; k++) this.parts.push({ x: x - 8 + k * 2, y: y - 8 + k * 2, vx: 0, vy: 0, g: 0, life: 0.16 + k * 0.012, t: -k * 0.012, col: '#ffffff', sz: 2 }); // slash
  }
  // ----- frame -----
  loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.draw(now / 1000, dt);
    requestAnimationFrame(this.loop);
  }
  draw(t, dt) {
    const x = this.ctx; x.imageSmoothingEnabled = false;
    const sh = this.shake > 0 ? (Math.random() - 0.5) * 3 : 0; this.shake = Math.max(0, this.shake - dt);
    x.save(); x.translate(Math.round(sh), 0); x.drawImage(this.bg, 0, 0);
    this.ambient(x, t);
    const list = [...this.v.values()].sort((a, b) => a.y + a.h - (b.y + b.h));
    for (const v of list) this.drawOne(x, v, t, dt);
    this.drawParts(x, dt);
    x.restore();
  }
  ambient(x, t) {
    if (this.kind === 'world') { x.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 3; i++) { const cx = ((t * 3 + i * 60) % (W + 40)) - 20, cy = 6 + i * 9; x.fillRect(cx, cy, 14, 3); x.fillRect(cx + 3, cy - 2, 8, 2); x.fillRect(cx + 2, cy + 3, 10, 1); } }
    else if (this.kind === 'boss') { x.fillStyle = '#ff9a3a'; for (let i = 0; i < 10; i++) { const px = (i * 17 + t * 6) % W, py = 88 - ((t * 14 + i * 23) % 70); x.fillRect(Math.round(px), Math.round(py), 1, 1); } }
    else if (this.kind === 'snow' || this.kind === 'spire') { x.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 26; i++) x.fillRect(Math.round((i * 23 + Math.sin(t * 0.8 + i) * 5 + t * 4) % W), Math.round((t * (9 + (i % 4) * 2) + i * 17) % H), 1, 1); }
    else if (this.kind === 'swamp') { x.fillStyle = 'rgba(190,210,170,.10)'; for (let i = 0; i < 4; i++) x.fillRect(0, 50 + i * 9 + Math.round(Math.sin(t * 0.5 + i) * 2), W, 4); x.fillStyle = '#e8ff80'; for (let i = 0; i < 6; i++) if (Math.sin(t * 2 + i * 2) > 0.2) x.fillRect(Math.round((i * 31 + Math.sin(t + i) * 8) % W), 50 + ((i * 13) % 30), 1, 1); }
    else if (this.kind === 'crypt') { x.fillStyle = 'rgba(140,255,170,.55)'; for (let i = 0; i < 10; i++) x.fillRect(Math.round((i * 17 + Math.sin(t * 0.7 + i) * 6) % W), Math.round(88 - ((t * 5 + i * 19) % 80)), 1, 1); }
    else { x.fillStyle = 'rgba(255,230,160,.5)'; for (let i = 0; i < 8; i++) x.fillRect(Math.round((i * 29 + Math.sin(t + i) * 4) % W), Math.round(((t * 2 + i * 13) % 80) + 4), 1, 1); }
  }
  drawOne(x, v, t, dt) {
    v.t += dt; v.flash = Math.max(0, v.flash - dt); v.lunge = Math.max(0, v.lunge - dt); v.cast = Math.max(0, v.cast - dt); if (v.dead) v.deadT += dt;
    const dir = v.side === 'p' ? -1 : 1;
    let ox = 0, oy = 0;
    let sx = 1, sy = 1, alpha = 1;
    if (v.lunge > 0) {
      const pr = 1 - v.lunge / 0.32, sn = Math.sin(pr * Math.PI);
      switch (v.style) {
        case 'squash': ox = dir * 10 * sn; sy = 1 - 0.3 * sn; sx = 1 + 0.2 * sn; break;
        case 'swoop': ox = dir * 20 * sn; oy = pr < 0.5 ? -12 * Math.sin(pr * 2 * Math.PI) : 4 * Math.sin((pr - 0.5) * 2 * Math.PI); break;
        case 'pounce': ox = dir * 22 * sn; oy = -10 * sn; break;
        case 'float': ox = dir * 10 * sn; alpha = 1 - 0.45 * sn; break;
        case 'sway': ox = dir * 8 * sn; oy = Math.sin(pr * 12) * 1.5; break;
        case 'stomp': oy = pr < 0.5 ? -10 * (pr / 0.5) : pr < 0.65 ? -10 * (1 - (pr - 0.5) / 0.15) : 0; ox = dir * 4 * sn; if (pr >= 0.65 && !v.slammed) { v.slammed = true; if (FX.shake) this.shake = 0.22; this.burst(v.x + v.w / 2, v.y + v.h, 'slash', 6, v.w); } break;
        default: ox = dir * 18 * sn;
      }
    }
    if (v.cast > 0) oy = -3 * Math.sin((1 - v.cast / 0.5) * Math.PI);
    if (v.side === 'p' && this.active === v.c.name && !v.dead) ox += -7;
    if (!v.dead || v.side === 'p') oy += Math.round(Math.sin(t * 3 + v.seed) * 0.8);
    if (v.flash > 0 && !v.dead) ox += (Math.random() - 0.5) * 3;
    const px = Math.round(v.x + ox), py = Math.round(v.y + oy), sw = v.w;
    // shadow
    x.fillStyle = 'rgba(0,0,0,.35)'; const shw = sw >= 32 ? 26 : 12; x.fillRect(Math.round(v.x + sw / 2 - shw / 2), Math.round(v.y + v.h - 1), shw, 2); x.fillRect(Math.round(v.x + sw / 2 - shw / 2 + 2), Math.round(v.y + v.h + 1), shw - 4, 1);
    if (v.dead && v.side === 'e') { // dissolve upward
      const k = Math.min(1, v.deadT / 0.6); if (k >= 1) return;
      x.globalAlpha = 1 - k; x.drawImage(k < 0.25 ? silhouette(v.spr) : v.spr, px, py - Math.round(k * 6), sw, Math.round(v.h * (1 - k * 0.3))); x.globalAlpha = 1; return;
    }
    if (v.dead) { // fallen hero: lies down, greyed
      x.save(); x.translate(px + 8, py + 14); x.rotate(-Math.PI / 2); x.globalAlpha = 0.55; x.drawImage(v.spr, -8, -8); x.restore(); x.globalAlpha = 1; return;
    }
    if (sx !== 1 || sy !== 1 || alpha !== 1) { // squash/stretch about the feet, ghost fade
      x.save(); x.globalAlpha = alpha; x.translate(px + sw / 2, py + v.h); x.scale(sx, sy); x.drawImage(v.spr, -sw / 2, -v.h); x.restore();
    } else x.drawImage(v.spr, px, py);
    if (v.flash > 0) { x.globalAlpha = Math.min(1, v.flash * 5); x.drawImage(silhouette(v.spr), px, py); x.globalAlpha = 1; }
    if (v.c.st.poison > 0) { x.fillStyle = '#7acf4a'; x.fillRect(px + sw - 3, py - 3 - Math.round(Math.abs(Math.sin(t * 4))), 2, 2); }
    if (v.c.st.slow > 0) { x.fillStyle = '#7ab0ff'; x.fillRect(px + 1, py - 3, 2, 2); }
    if (v.c.st.atkup > 0) { x.fillStyle = '#ff9a2a'; x.fillRect(px + 5, py - 3, 2, 2); }
    if (v.c.st.defup > 0) { x.fillStyle = '#f4d35e'; x.fillRect(px + 8, py - 3, 2, 2); }
  }
  drawParts(x, dt) {
    for (const p of this.parts) {
      p.t += dt; if (p.t < 0) continue; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
      x.globalAlpha = Math.max(0, 1 - p.t / p.life); x.fillStyle = p.col;
      if (p.plus) { x.fillRect(Math.round(p.x) - 1, Math.round(p.y), 3, 1); x.fillRect(Math.round(p.x), Math.round(p.y) - 1, 1, 3); }
      else x.fillRect(Math.round(p.x), Math.round(p.y), p.sz, p.h || p.sz);
    }
    x.globalAlpha = 1; this.parts = this.parts.filter((p) => p.t < p.life);
    for (const o of this.proj) {
      o.t += dt; const k = Math.min(1, o.t / o.dur), e = k * k * (3 - 2 * k), px = o.sx + (o.tx - o.sx) * e, py = o.sy + (o.ty - o.sy) * e - Math.sin(k * Math.PI) * 8;
      if (Math.random() < 0.9) this.parts.push({ x: px, y: py, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, g: 0, life: 0.25, t: 0, col: o.col2, sz: 1 });
      x.fillStyle = o.col; x.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3); x.fillStyle = '#fff'; x.fillRect(Math.round(px), Math.round(py), 1, 1);
    }
    this.proj = this.proj.filter((o) => o.t < o.dur);
    for (const f of this.floats) {
      f.t += dt; const rise = Math.min(8, f.t * 22) - (f.t > 0.5 ? (f.t - 0.5) * 6 : 0), y = Math.round(f.y - rise), w = f.s.length * 4 - 1, x0 = Math.round(f.x - w / 2);
      x.globalAlpha = Math.max(0, Math.min(1, (0.9 - f.t) * 4));
      [...f.s].forEach((ch, i) => { const g = FONT[ch]; if (!g) return; for (let k = 0; k < 15; k++) if (g[k] === '1') { const gx = x0 + i * 4 + (k % 3), gy = y + Math.floor(k / 3); x.fillStyle = '#10101a'; x.fillRect(gx - 1, gy, 3, 1); x.fillRect(gx, gy - 1, 1, 3); x.fillRect(gx, gy + 1, 1, 1); } });
      [...f.s].forEach((ch, i) => { const g = FONT[ch]; if (!g) return; for (let k = 0; k < 15; k++) if (g[k] === '1') { x.fillStyle = f.col; x.fillRect(x0 + i * 4 + (k % 3), y + Math.floor(k / 3), 1, 1); } });
    }
    x.globalAlpha = 1; this.floats = this.floats.filter((f) => f.t < 0.9);
  }
}
