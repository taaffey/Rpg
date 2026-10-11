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
  bard: ['pointy', '#d94a4a', '#8a2430', '#2aa0a0', '#1a7070', '#f4d35e', '#f0c8a0'],
};
function heroRows(job) { const [h] = HERO_STYLE[job]; return [...HEAD[h], ...BODY]; }
function heroPal(job) { const [, H, h, T, t, A, F] = HERO_STYLE[job]; return { H, h, T, t, A, F }; }

// ---------- tile sheet ----------
const T = {};
function buildTiles() {
  const grass = [0, 1, 2, 3].map((i) => {
    const c = noiseTile('#4f9a3f', ['#5aa84a', '#468a38', '#3d7a30', '#6ab85a'], 10 + i), x = c.getContext('2d'), r = rng(90 + i);
    if (i % 2) for (let k = 0; k < 3; k++) { x.fillStyle = ['#f2f2f2', '#f4d35e', '#ee80a8'][Math.floor(r() * 3)]; x.fillRect(Math.floor(r() * 15), Math.floor(r() * 15), 1, 1); }
    return c;
  });
  const water = [0, 1].map((i) => { const c = noiseTile('#2c5fa8', ['#2a5598', '#3a70c0'], 20 + i, 0.1), x = c.getContext('2d'); x.fillStyle = '#6aa4e8'; for (let k = 0; k < 4; k++) x.fillRect(((k * 5) + i * 3) % 14, 2 + k * 4, 3, 1); return c; });
  const cobble = [0, 1].map((i) => noiseTile('#9a8760', ['#8a7752', '#aa9770', '#7a6a48'], 30 + i, 0.3));
  const dfloor = [0, 1].map((i) => noiseTile('#3b3744', ['#34303c', '#443f4e', '#2c2834'], 40 + i, 0.25));
  const sp = (n) => sprite(ART[n]);
  T.world = {
    '.': grass, T: [over(grass[0], sp('tree'))], M: [over(grass[1], sp('mountain'))], '~': water, H: [over(cobble[0], sp('house'))], D: [over(grass[2], sp('cave'))],
  };
  const stone = brick('#4a4256', '#2e2838', 50), cobbleDark = cobble;
  T.town = { '.': cobble, '#': [stone], S: [over(cobble[0], sp('shop'))], I: [over(cobble[0], sp('inn'))], G: [over(cobble[0], sp('guild'))], E: [over(cobble[0], sp('exit'))] };
  const dwall = brick('#26222e', '#15121b', 60);
  T.dungeon = { '.': dfloor, '#': [dwall], E: [over(dfloor[0], sp('exit'))], C: [over(dfloor[0], sp('chest'))], c: [over(dfloor[0], sp('chestOpen'))], X: [over(dfloor[1], enemy('wyrmMini'))] };
}
export function enemy(id) { if (!cache.has('e' + id)) cache.set('e' + id, sprite(BIG[id] || ENEMY_ART[id], BIG[id] ? BIG_PAL : undefined)); return cache.get('e' + id); }
export function hero(job) { if (!cache.has('h' + job)) cache.set('h' + job, sprite(heroRows(job), heroPal(job))); return cache.get('h' + job); }
export function url(canvas, scale = 4) { const c = mk(canvas.width * scale, canvas.height * scale), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(canvas, 0, 0, c.width, c.height); return c.toDataURL(); }
export const enemyURL = (id) => { const k = 'eu' + id; if (!cache.has(k)) cache.set(k, url(enemy(id), 4)); return cache.get(k); };
export const heroURL = (job) => { const k = 'hu' + job; if (!cache.has(k)) cache.set(k, url(hero(job), 3)); return cache.get(k); };
// tile lookup: variant picked by position so textures don't tile obviously
export function tile(map, ch, x, y, frame = 0) {
  if (!T.world) buildTiles();
  const set = T[map][ch] || T[map]['.'];
  return set[ch === '~' ? frame % set.length : (x * 7 + y * 13) % set.length];
}
export const floorTile = (map, x, y) => tile(map, '.', x, y);
export { ART, ENEMY_ART, heroRows };
export const isBig = (id) => !!BIG[id];
