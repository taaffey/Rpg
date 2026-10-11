// ===== Procedural pixel art: ASCII 16x16 sprites + seeded tile textures =====
const PAL = { k: '#15101d', w: '#f2f2f2', s: '#9aa0b0', S: '#585e72', r: '#d94a4a', R: '#8a2430', o: '#f09a3a', y: '#f4d35e', g: '#4fae4f', G: '#2a6a34', l: '#a6e87f', b: '#4a8ae0', B: '#27428a', c: '#8fe0f5', p: '#9a62e0', P: '#4a2a80', n: '#8a5a30', N: '#55341c', t: '#e6bf90', m: '#ee80a8', d: '#3b3744', e: '#6e3a28' };

const cache = new Map();
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function paint(rows, pal = {}, ctx2, ox = 0, oy = 0) {
  const P = { ...PAL, ...pal };
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.' && P[ch]) { ctx2.fillStyle = P[ch]; ctx2.fillRect(ox + x, oy + y, 1, 1); } }));
}
export function sprite(rows, pal) { const c = mk(rows[0].length, rows.length), x = c.getContext('2d'); paint(rows, pal, x); return c; }
function rng(seed) { let a = seed; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function noiseTile(base, shades, seed, density = 0.18) {
  const c = mk(16, 16), x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = base; x.fillRect(0, 0, 16, 16);
  for (let i = 0; i < 16 * 16 * density; i++) { x.fillStyle = shades[Math.floor(r() * shades.length)]; x.fillRect(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1); }
  return c;
}
function over(base, spr) { const c = mk(16, 16), x = c.getContext('2d'); x.drawImage(base, 0, 0); x.drawImage(spr, 0, 0); return c; }
function brick(base, line, seed) {
  const c = noiseTile(base, [line], seed, 0.04), x = c.getContext('2d'); x.fillStyle = line;
  for (let row = 0; row < 4; row++) { x.fillRect(0, row * 4 + 3, 16, 1); for (let col = (row % 2) * 4; col < 16; col += 8) x.fillRect(col + 3, row * 4, 1, 3); }
  return c;
}

import { FURN, NPC_STYLE, ENEMY2, BIG2, VARIANT, BIGVAR } from './art2.js';
// ---------- object sprites (drawn over a floor tile) ----------
const ART = {
  tree: ['................', '.....GGGGG......', '....GGgggGG.....', '...GGgggglGG....', '..GGggggggggG...', '..GgglgggggggG..', '...GGgggggglGG..', '..GGgggglggggGG.', '.GGggggggggggggG', '.GGGGgggggggGGGG', '..GGGGGGGGGGGG..', '.....NNnN.......', '.....NnnN.......', '.....NNnN.......', '................', '................'],
  mountain: ['................', '................', '.......ww.......', '......wwsw......', '.....wwsssw.....', '....wsssSssw....', '...wsssSsSssw...', '..sssSsssSsssS..', '..ssSsssSssSssS.', '.sssSssnsSsssSS.', '.ssSssnnnssSSSS.', 'sssSsnnnnnsSSSSS', 'ssSSnnnNnnnSSSSS', 'SSSSSSSSSSSSSSSS', '................', '................'],
  house: ['................', '.......rr.......', '.....rrrrrr.....', '....rrrRrrrrr...', '...rrRrrrrRrrr..', '..rrrrrRrrrrrrr.', '.RRRRRRRRRRRRRR.', '..ttttttttttt...', '..ttbbtttttnt...', '..ttbbtttttnt...', '..ttttttttnnt...', '..tttttttnNnt...', '..NNNNNNNNNNN...', '................', '................', '................'],
  cave: ['................', '....SSSSSSSS....', '...SssssssSS....', '..SssSSSSSssS...', '.SssSkkkkkSssS..', '.SsSkkkkkkkSsS..', '.SsSkkkkkkkSsS..', '.SsSkkkkkkkSsS..', '.SsSkkkkkkkSsS..', '.SsSkkkkkkkSsS..', '.SSSkkkkkkkSSS..', '..SSSSSSSSSSS...', '................', '................', '................', '................'],
  shop: ['................', '..rwrwrwrwrwrw..', '.rwrwrwrwrwrwr..', '.RRRRRRRRRRRRR..', '..n..........n..', '..n..yy.oo...n..', '..n..yy.oo...n..', '..nnnnnnnnnnnn..', '..nNnNnNnNnNnn..', '..nNnNnNnNnNnn..', '..nnnnnnnnnnnn..', '................', '................', '................', '................', '................'],
  inn: ['................', '................', '..nnnn..........', '..nNNn.wwwwwww..', '..nNNnwwwwwwwww.', '..nNNnbbbbbbbbb.', '..nNNnbbBbbbbBb.', '..nNNnbbbbbbbbb.', '..nnnnnnnnnnnnn.', '..nN........nN..', '..nN........nN..', '................', '................', '................', '................', '................'],
  guild: ['................', '....pppppppp....', '...pPPPPPPPPp...', '...pPwPPPPwPp...', '...pPPwPPwPPp...', '...pPPPwwPPPp...', '...pPPwPPwPPp...', '...pPwPPPPwPp...', '...pPPPPPPPPp...', '....pPPPPPPp....', '.....pPPPPp.....', '......pPPp......', '.......pp.......', '................', '................', '................'],
  chest: ['................', '................', '................', '...NNNNNNNNNN...', '..NnnnnnnnnnnN..', '..NnnnnnnnnnnN..', '..NNNNyyNNNNNN..', '..NnnnnykNnnnN..', '..NnnnnnnnnnnN..', '..NnnnnnnnnnnN..', '..NNNNNNNNNNNN..', '................', '................', '................', '................', '................'],
  chestOpen: ['................', '..NNNNNNNNNNNN..', '..NnnnnnnnnnnN..', '..NNNNNNNNNNNN..', '..NkkkkkkkkkkN..', '..NkyyyykyyykN..', '..NNNNyyNNNNNN..', '..NnnnnykNnnnN..', '..NnnnnnnnnnnN..', '..NnnnnnnnnnnN..', '..NNNNNNNNNNNN..', '................', '................', '................', '................', '................'],
  torchA: ['................', '................', '.......y........', '......yoy.......', '......yoy.......', '.......o........', '......kNk.......', '......kNk.......', '......kNk.......', '.....kkkkk......', '................', '................', '................', '................', '................', '................'],
  torchB: ['................', '.......y........', '......yoy.......', '.....yoyoy......', '......yoy.......', '.......o........', '......kNk.......', '......kNk.......', '......kNk.......', '.....kkkkk......', '................', '................', '................', '................', '................', '................'],
  lamp: ['................', '.....kkkkk......', '....kyyyyyk.....', '....kyywyyk.....', '....kyyyyyk.....', '.....kkkkk......', '......kSk.......', '......kSk.......', '......kSk.......', '......kSk.......', '......kSk.......', '.....kSSSk......', '....kSSSSSk.....', '................', '................', '................'],
  exit: ['................', '.....yyyy.......', '....yyyyyy......', '....yyyyyy......', '....yyyyyy......', '..yyyyyyyyyy....', '...yyyyyyyy.....', '....yyyyyy......', '.....yyyy.......', '......yy........', '................', '................', '................', '................', '................', '................'],
};
// ---------- enemies ----------
const ENEMY_ART = {
  slime: ['................', '................', '................', '................', '.....gggggg.....', '...gggllllggg...', '..gglllllllggg..', '..glllllllllgg..', '.gglkwllllkwlgg.', '.gglkklllllkklg.', '.ggllllllllllgg.', '.gggllllllllggg.', '..ggggggggggggG.', '...GGGGGGGGGG...', '................', '................'],
  goblin: ['................', '..g...........g.', '..gg.GGGGGG.gg..', '...gGGggggGGg...', '....GgrggrgG....', '....GgkggkgG....', '....Gggkkgg.G...', '.....GggggG.....', '...nnnnGGnnnn...', '..nnnnnnnnnnnn..', '..gnnnnnnnnnng..', '..g.nnnnnnnn.g..', '....nn....nn....', '....nn....nn....', '...kkk....kkk...', '................'],
  wolf: ['................', '................', '..s.s...........', '.sSsSs..........', '.sssSsssssss....', '.swskssssSsssss.', '.ssssssssssssSs.', '..rsssssssssssS.', '..SSsssssssssSs.', '...SsssssssssSs.', '...ssSssssSssSs.', '...ss.ss..ss.ss.', '...ss.ss..ss.ss.', '..kkk.kkk.kkkkk.', '................', '................'],
  bat: ['................', '................', '.pp..........pp.', '.pPp........pPp.', '.pPPp..pp..pPPp.', '.pPPPppPPppPPPp.', '..pPPpPrPrpPPp..', '..pPPpPPPPpPPp..', '...pPpPkkPpPp...', '....pppwwppp....', '.....pPpPpp.....', '......p..p......', '................', '................', '................', '................'],
  skeleton: ['................', '.....wwwwww.....', '....wwwwwwww....', '....wkkwwkkw....', '....wkkwwkkw....', '....wwwkkwww....', '.....wwwwww.....', '......wkwk......', '....wwwwwwww....', '...w.wssssw.w...', '...w.wwwwww.w...', '...w..wssw..w...', '......wwww......', '.....ww..ww.....', '.....ww..ww.....', '....kkk..kkk....'],
  imp: ['................', '..r..........r..', '..rr........rr..', '...rrrrrrrrrr...', '...rrrrrrrrrr...', '..rrykrrrrkyrr..', '..rrkkrrrrkkrr..', '..rrrrrwwrrrrr..', '...rrrrrrrrrr...', '..o.rrrRRrrr.o..', '.oo.rrrrrrrr.oo.', '.oyo.rrrrrr.oyo.', '..o..rr..rr..o..', '.....rr..rr.....', '....kkk..kkk....', '................'],
  golem: ['................', '................', '....SSSSSSSS....', '...SssssssssS...', '...SskyssykSs...', '...SsssssssS....', '..SSSSssssSSSS..', '.SssSSSSSSSSssS.', '.SsssSssssSsssS.', '.SssssSssSssssS.', '.SSssssssssssSS.', '..SSSSSSSSSSSS..', '...SsS....SsS...', '...SsS....SsS...', '..SSSSS..SSSSS..', '................'],
  wraith: ['................', '.....cccccc.....', '....cwwwwwwc....', '...cwwwwwwwwc...', '...cwkkwwkkwc...', '...cwkkwwkkwc...', '...cwwwkkwwwc...', '..ccwwwwwwwwcc..', '..cwwwwwwwwwwc..', '.ccwwwwwwwwwwcc.', '.cwwwwwwwwwwwwc.', '.cwwcwwwwwwcwwc.', '..c.cwwcwwwc.c..', '.....c.cwc......', '................', '................'],
  wyrmMini: ['................', '.R..........R...', '.RR........RR...', '..RRrrrrrrrRR...', '..RrrrrrrrrrrR..', '.RrryyrrryyrrR..', '.RrrkkrrrkkrrR..', '.RrrrrrrrrrrrR..', '..RrrrwwwwrrrR..', '..RRrrkkkkrrRR..', '.RRRrrrrrrrrRRRR', 'RoRRrrrooorrRRoR', 'RoRRrrrooorrRRoR', '.RRRrrrooorrRRR.', '..RRRRrrrrRRRR..', '....RR....RR....'],
};
// ---------- 32x32 boss: left half (16 cols) mirrored ----------
const mirror = (half) => half.map((r) => r + [...r].reverse().join(''));
const BIG_PAL = { e: '#6e3a28', E: '#4a2418', f: '#f08a50' };
const BIG = { wyrm: mirror([
  '................', '..R.............', '..RR............', '...RR.....RRRRRR', '...RRR...RRrrrrr', '....RRR.RRrrrrrr', '....RRRRRrrrrrrr',
  '.....RrrrrrrrrrR', '.....RrrryyyyRrr', '.....Rrryykkyrrr', '.....RrrrrrrrrrR', '......RRrrrrrrrr', '.....RRRrrrrwwrr', '....RRrRRrrrkkkk',
  '...RReRRRRrrkwkw', '..RReeRRrrrrrrrr', '.RReeeRRrRrrrrrr', 'RReeeeRRrrRRrrrr', 'RReeeeReRrrRRRrr', 'RReeeReeRRrrrrrr',
  'RReeReeeeRRrrfff', '.RReReeeeERRfffo', '..RRRReeEE.RRfof', '....RRRRE..RRfof', '.....RR....RRffo', '.....RRR..RRRRff',
  '....RRRRR.RRRrrr', '....RwRwR.RRrrrr', '....RwRwRRRRRRR', '.....RRRRR......', '................', '................']) };
// ---------- heroes: head template + body template recolored per job ----------
const HEAD = {
  hair: ['................', '.....kkkkkk.....', '....kHHHHHHk....', '...kHHhHHhHHk...', '...kHFFFFFFHk...', '...kFkFFFFkFk...', '....kFFFFFFk....'],
  hood: ['.....kkkkkk.....', '....kHHHHHHk....', '...kHHhhhhHHk...', '...kHhFFFFhHk...', '...kHFkFFkFHk...', '...kHFFFFFFHk...', '....kHFFFFHk....'],
  pointy: ['......kH........', '.....kHHk.......', '....kHHHHk......', '...kHHhHHHk.....', '..kkkkkkkkkk....', '...kFkFFkFk.....', '....kFFFFk......'],
  helm: ['.....kkkkkk.....', '....kHHHHHHk....', '...kHHhhhhHHk...', '...kHkkkkkkHk...', '...kHFFFFFFHk...', '...kHFkFFkFHk...', '....kFFFFFFk....'],
};
const BODY = ['.....kTTTTk.....', '...kkTTAATTkk...', '..kFkTTTTTTkFk..', '..kFkTTAATTkFk..', '...kkTTTTTTkk...', '....kTTkkTTk....', '....kttk.kttk...', '....kkkk.kkkk...', '................'];
export const HERO_STYLE = { // job -> [head, H, h, T, t, A, F]
  knight: ['helm', '#aab4c8', '#7a8499', '#3a6ac0', '#27428a', '#e8e8f0', '#f0c8a0'],
  rogue: ['hood', '#3c4a44', '#2a3430', '#4a4a58', '#2a2a36', '#d0a040', '#f0c8a0'],
  mage: ['pointy', '#7a4ac0', '#5a30a0', '#5a38b0', '#3a2080', '#f4d35e', '#f0c8a0'],
  cleric: ['hood', '#f2f2f2', '#c8c8d8', '#f2f2f2', '#c8c8d8', '#f4d35e', '#f0c8a0'],
  monk: ['hair', '#8a5a30', '#55341c', '#e88a30', '#b06020', '#d94a4a', '#e8b890'],
  ranger: ['hair', '#8a5a30', '#55341c', '#3a8a3a', '#2a6a2a', '#8a5a30', '#f0c8a0'],
  hexer: ['hood', '#4a2a80', '#2a1550', '#2a2038', '#15101d', '#6ef0a0', '#d8c8b0'],
  berserker: ['hair', '#c03020', '#802010', '#8a5a30', '#55341c', '#d94a4a', '#e8b890'],
  alchemist: ['hood', '#3aa86a', '#2a7048', '#e8e0d0', '#b8b0a0', '#7fd8f0', '#f0c8a0'],
  samurai: ['hair', '#202030', '#101018', '#c04040', '#802020', '#f2f2f2', '#f0c8a0'],
  paladin: ['helm', '#e8e8f0', '#a8a8c0', '#f2f2f2', '#c8c8d8', '#f4d35e', '#f0c8a0'],
  bard: ['pointy', '#d94a4a', '#8a2430', '#2aa0a0', '#1a7070', '#f4d35e', '#f0c8a0'],
};
function rowsFor(h, frame = 0) {
  const rows = [...HEAD[h], ...BODY];
  if (frame === 1) { rows[13] = '..kttk....kttk..'; rows[14] = '..kkkk....kkkk..'; }
  if (frame === 2) { rows[13] = '.....kttkttk....'; rows[14] = '.....kkkkkkk....'; }
  return rows;
}
function heroRows(job, frame = 0) { return rowsFor(HERO_STYLE[job][0], frame); }
function heroPal(job) { const [, H, h, T, t, A, F] = HERO_STYLE[job]; return { H, h, T, t, A, F }; }

// ---------- tile sheet ----------
const T = {};
function plank(base, line, seed) {
  const c = noiseTile(base, [line], seed, 0.03), x = c.getContext('2d'); x.fillStyle = line;
  for (let y = 3; y < 16; y += 4) x.fillRect(0, y, 16, 1);
  for (let y = 0; y < 4; y++) x.fillRect(((y * 5 + seed) % 12) + 2, y * 4, 1, 3);
  return c;
}
function vplank(base, line, seed) {
  const c = noiseTile(base, [line], seed, 0.04), x = c.getContext('2d'); x.fillStyle = line;
  for (let k = 3; k < 16; k += 4) x.fillRect(k, 0, 1, 16); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, 15, 16, 1);
  return c;
}
function buildTiles() {
  const grass = [0, 1, 2, 3].map((i) => {
    const c = noiseTile('#4f9a3f', ['#5aa84a', '#468a38', '#3d7a30', '#6ab85a'], 10 + i), x = c.getContext('2d'), r = rng(90 + i);
    if (i % 2) for (let k = 0; k < 3; k++) { x.fillStyle = ['#f2f2f2', '#f4d35e', '#ee80a8'][Math.floor(r() * 3)]; x.fillRect(Math.floor(r() * 15), Math.floor(r() * 15), 1, 1); }
    return c;
  });
  const snow = [0, 1, 2].map((i) => noiseTile('#e6eef8', ['#d0e0f0', '#ffffff', '#c2d4ea', '#b8ccea'], 70 + i, 0.22));
  const swamp = [0, 1, 2].map((i) => { const c = noiseTile('#3d5c3a', ['#334f33', '#486a40', '#2c442e', '#52743f'], 80 + i, 0.3), x = c.getContext('2d'); x.fillStyle = '#2d4a56'; x.fillRect(3 + i * 4, 5 + i * 3, 4, 2); x.fillStyle = '#4a7a86'; x.fillRect(4 + i * 4, 5 + i * 3, 2, 1); return c; });
  const dirt = [0, 1].map((i) => noiseTile('#8a7040', ['#7a6034', '#9a8050', '#6a5030'], 85 + i, 0.3));
  const water = [0, 1].map((i) => { const c = noiseTile('#2c5fa8', ['#2a5598', '#3a70c0'], 20 + i, 0.1), x = c.getContext('2d'); x.fillStyle = '#6aa4e8'; for (let k = 0; k < 4; k++) x.fillRect(((k * 5) + i * 3) % 14, 2 + k * 4, 3, 1); return c; });
  const bridge = water.map((w) => { const c = mk(16, 16), x = c.getContext('2d'); x.drawImage(w, 0, 0); x.fillStyle = '#8a5a30'; x.fillRect(0, 2, 16, 12); x.fillStyle = '#a87440'; for (let k = 0; k < 16; k += 4) x.fillRect(k, 2, 3, 12); x.fillStyle = '#55341c'; x.fillRect(0, 2, 16, 1); x.fillRect(0, 13, 16, 1); return c; });
  const cobble = [0, 1].map((i) => noiseTile('#9a8760', ['#8a7752', '#aa9770', '#7a6a48'], 30 + i, 0.3));
  const scobble = [0, 1].map((i) => noiseTile('#b8c4d4', ['#a8b6c8', '#ccd8e8', '#98a8bc', '#ffffff'], 36 + i, 0.3));
  const wood = [0, 1].map((i) => plank('#9a6a3c', '#6e4624', 11 + i));
  const sp = (n) => sprite(ART[n]), fu = (n) => sprite(FURN[n]);
  T.world = {
    '.': grass, ',': snow, ':': swamp, _: dirt, '=': bridge, '~': water,
    T: [over(grass[0], sp('tree'))], t: [over(snow[0], fu('snowtree'))], M: [over(grass[1], sp('mountain'))], B: [over(dirt[0], fu('rockslide'))],
    H: [over(cobble[0], sp('house'))], D: [over(grass[2], sp('cave'))],
  };
  const stone = brick('#4a4256', '#2e2838', 50), sstone = brick('#7a8aa8', '#566684', 52), wwall = vplank('#6a4426', '#3e2614', 14);
  const ov = (base) => ({ H: [over(base[0], sp('house'))], E: [over(base[0], sp('exit'))], C: [over(base[0], sp('chest'))], c: [over(base[0], sp('chestOpen'))] });
  T.town = { '.': cobble, '#': [stone], ...ov(cobble) };
  T.snowtown = { '.': scobble, '#': [sstone], ...ov(scobble) };
  T.interior = { '.': wood, '#': [wwall], ...ov(wood) };
  const dungeon = (floorBase, floorShades, wallBase, wallLine, seed) => {
    const fl = [0, 1].map((i) => noiseTile(floorBase, floorShades, seed + i, 0.25));
    return { '.': fl, '#': [brick(wallBase, wallLine, seed + 9)], E: [over(fl[0], sp('exit'))], C: [over(fl[0], sp('chest'))], c: [over(fl[0], sp('chestOpen'))], X: [fl[1]] };
  };
  T.storm = dungeon('#3a3c5a', ['#32344e', '#46486c', '#2a2c44'], '#1a1c38', '#0e1028', 340);
  const swampWood = [0, 1].map((i) => plank('#6a5a3a', '#3e3220', 21 + i));
  T.swamptown = { '.': swampWood, '#': [vplank('#4a3a22', '#2a2010', 24)], ...ov(swampWood) };
  T.cavern = dungeon('#3b3744', ['#34303c', '#443f4e', '#2c2834'], '#26222e', '#15121b', 40);
  T.crypt = dungeon('#38403a', ['#2e362f', '#46504a', '#262c28'], '#1c2a22', '#0e1814', 140);
  T.spire = dungeon('#6a86a8', ['#5a76a0', '#7a96b8', '#8aa6c8'], '#3a5a8a', '#24406a', 240);
}
const BIGALL = () => ({ ...BIG, lich: mirror(BIG2.lich), titan: mirror(BIG2.titan) });
export function enemy(id) {
  if (cache.has('e' + id)) return cache.get('e' + id);
  const big = BIGALL()[id]; let c;
  if (BIGVAR[id]) c = sprite(BIGALL()[BIGVAR[id][0]], { ...BIG_PAL, ...BIGVAR[id][1] });
  else if (big) c = sprite(big, BIG_PAL);
  else if (VARIANT[id]) { const [base, pal] = VARIANT[id]; c = sprite(ENEMY_ART[base] || ENEMY2[base], pal); }
  else c = sprite(ENEMY2[id] || ENEMY_ART[id]);
  cache.set('e' + id, c); return c;
}
export const baseOf = (id) => (VARIANT[id] ? VARIANT[id][0] : id);
export function hero(job, frame = 0) { const k = `h${job}${frame}`; if (!cache.has(k)) cache.set(k, sprite(heroRows(job, frame), heroPal(job))); return cache.get(k); }
const TORCH_PAL = { cavern: undefined, storm: { y: '#fff6a0', o: '#ffd22a' }, crypt: { y: '#c8ffb0', o: '#4aff7a' }, spire: { y: '#ffffff', o: '#7fd8f0' } };
export const torch = (frame, theme = 'cavern') => { const k = `torch${frame}${theme}`; if (!cache.has(k)) cache.set(k, sprite(ART[frame ? 'torchB' : 'torchA'], TORCH_PAL[theme])); return cache.get(k); };
const DECOR_ART = { lamp: () => ART.lamp, tree: () => ART.tree, banner: () => ART.guild, ...Object.fromEntries(Object.keys(FURN).map((k) => [k, () => FURN[k]])) };
export function decor(kind) { const k = 'd' + kind; if (!cache.has(k)) cache.set(k, sprite(DECOR_ART[kind]())); return cache.get(k); }
export function npc(type, frame = 0) { const k = `n${type}${frame}`; if (!cache.has(k)) { const [h, H, hh, Tt, t, A, F] = NPC_STYLE[type]; cache.set(k, sprite(rowsFor(h, frame), { H, h: hh, T: Tt, t, A, F })); } return cache.get(k); }
export const lamp = () => { if (!cache.has('lamp')) cache.set('lamp', sprite(ART.lamp)); return cache.get('lamp'); };
export const treeSprite = () => { if (!cache.has('tree')) cache.set('tree', sprite(ART.tree)); return cache.get('tree'); };
// 10x10 faceted gem icon, recolored per gem type
const GEM_COL = { fire: '#ff7a3a', frost: '#7fd8f0', bolt: '#fff27a', holy: '#ffffff', shadow: '#9a62e0', chain: '#9aa0b0', echo: '#3ad0b0', vamp: '#d94a4a', pierce: '#d0d8f0', thrifty: '#5ed17a', overcharge: '#ee50c0', wide: '#4a8ae0', venom: '#a6e87f', swift: '#6ac8ff', focusg: '#f4b13a', stun: '#ffd25a', execute: '#8a2430', berserk: '#ff4a2a', siphon: '#4a8aff', guard: '#c8a050', crit: '#ffb0e0' };
const GEM_SHAPE = ['....kk....', '...kLLk...', '..kLLMMk..', '.kLMMMMDk.', 'kLMMMMMDDk', 'kLMMMMMDDk', '.kMMMMMDk.', '..kMMMDk..', '...kDDk...', '....kk....'];
export function gemIcon(id, scale = 2) {
  const k = `gi${id}${scale}`; if (cache.has(k)) return cache.get(k);
  const base = GEM_COL[id] || '#aaaaaa', c = mk(10, 10), x = c.getContext('2d');
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16), ch = (v) => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`; };
  paint(GEM_SHAPE, { M: base, L: shade(base, 1.35) === base ? base : shade(base, 1.3), D: shade(base, 0.6), k: '#15101d' }, x);
  x.fillStyle = '#ffffff'; x.fillRect(3, 3, 1, 1);
  const u = mk(10 * scale, 10 * scale), ux = u.getContext('2d'); ux.imageSmoothingEnabled = false; ux.drawImage(c, 0, 0, u.width, u.height);
  const out = u.toDataURL(); cache.set(k, out); return out;
}
export function url(canvas, scale = 4) { const c = mk(canvas.width * scale, canvas.height * scale), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(canvas, 0, 0, c.width, c.height); return c.toDataURL(); }
export const enemyURL = (id) => { const k = 'eu' + id; if (!cache.has(k)) cache.set(k, url(enemy(id), 4)); return cache.get(k); };
export const heroURL = (job) => { const k = 'hu' + job; if (!cache.has(k)) cache.set(k, url(hero(job), 3)); return cache.get(k); };
// tile lookup: variant picked by position so textures don't tile obviously
export function tile(map, ch, x, y, frame = 0) {
  if (!T.world) buildTiles();
  const set = T[map]?.[ch] || T[map]['.'];
  return set[ch === '~' ? frame % set.length : (x * 7 + y * 13) % set.length];
}
export const floorTile = (map, x, y) => tile(map, '.', x, y);
export { ART, ENEMY_ART, heroRows };
export const isBig = (id) => !!BIGALL()[id] || !!BIGVAR[id];
