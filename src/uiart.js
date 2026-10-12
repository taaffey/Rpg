// UI art: a 16x16 pixel icon set, window frames, hero face crops and the emoji -> icon bridge.
// Everything is drawn in code at load time and handed to CSS as data-URLs (classes .ic-<name>, vars --frame etc).
import * as SP from './sprites.js';
import * as BA from './battleart.js';
import * as WK from './walkers.js';

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const OUTLINE = '#100c1c';
const PAL = {
  k: '#1a1428', w: '#ffffff', l: '#d8dcec', g: '#9098b0', d: '#586078',
  r: '#f84838', R: '#a81c28', o: '#ff9830', y: '#ffe058', Y: '#c88a18', e: '#fff6b0',
  b: '#58a0ff', B: '#2858c8', c: '#a8f0ff', C: '#38b8e0', G: '#58d858', H: '#208838', j: '#b0ff98',
  p: '#c080ff', P: '#6c34b0', q: '#3a1a68', m: '#ff80c0', n: '#b07038', N: '#6a3a18', s: '#f8c8a0', S: '#d08860',
  t: '#f0e0b0', T: '#c8a868',
};
// ---------- pixel art (interior colors only: a dark outline is added automatically) ----------
const A = {
  sword: ['...........ww', '..........wlg', '.........wlg.', '........wlg..', '.......wlg...', '......wlg....', '..Y..wlg.....', '...Ywlg......', '...nYg.......', '..nN.Y.......', '.nN...Y......', 'yN...........', 'yy...........'],
  dagger: ['..........w', '.........wl', '........wlg', '.......wlg.', '......wlg..', '..Y..wlg...', '...YYlg....', '...nYY.....', '..nN..Y....', '.yN........', 'yy.........'],
  staff: ['.........YbbY', '........Ybcwb', '........bccbB', '.........bBB.', '........nY...', '.......nN....', '......nN.....', '.....nN......', '....nN.......', '...nN........', '..nN.........', '.nN..........', 'nN...........'],
  bow: ['...n........', '...ln.......', '...l.n......', '...l..n.....', '...l..nN....', 'r..l...nN.w.', 'rrgggggggggw', 'r..l...nN.w.', '...l..nN....', '...l..n.....', '...l.n......', '...ln.......', '...n........'],
  fists: ['..sSsSsS..', '.ssSsSsSS.', '.sssssssS.', '.sSSSSSsS.', 'ssssssssS.', 'sssssssSS.', '.ssssssS..', '..ssssS...', '..rrrrr...', '..RRRRR...', '..rrrrr...'],
  whip: ['....nnnn....', '..nN....Nn..', '.nN......Nn.', '.n...nn...n.', '.n..n..N..n.', '.nN..NN..Nn.', '..nN....Nn..', '....nnnnN...', '.......N....', '......nN....', '.....YY.....', '....YY......', '....N.......'],
  scythe: ['...wwllll....', '.wlggg..lnn..', 'wlg.....nN...', 'lg.....nN....', 'g.....nN.....', '.....nN......', '....nN.......', '...nN........', '..nN.........', '.nN..........', 'nN...........'],
  tome: ['.PPPPPPPPP.', '.PpppppppPw', '.PppyypppPw', '.PpyeeyppPw', '.PppyypppPw', '.PpppppppPw', '.PpppppppPw', '.PPPPPPPPPw', '..wwwwwwwww'],
  axe: ['...n.wl....', '...nNwllg..', '..gnNwlllg.', '..gnNwllllg', '...nNwlllg.', '...nNwllg..', '...nN.w....', '...nN......', '...nN......', '...nN......', '...nN......', '...nN......', '...YY......'],
  katana: ['............w', '...........wl', '..........wl.', '.........wl..', '........wl...', '.......wl....', '......wl.....', '.....wl......', '....YY.......', '...YYY.......', '..rR.........', '.rR..........', 'rR...........'],
  armor: ['..lll..lll..', '.lwwlllllgl.', '.lwlllllllg.', '..lwllllgg..', '..lwlllllg..', '..lllYYllg..', '..lwlllllg..', '..llllllgg..', '...lllllg...', '...ggggggg..'],
  robe: ['...BbbbbB...', '..BbbybbbB..', '.BbbbybbbbB.', 'BbbbbybbbbbB', 'BB.bbybbb.BB', '...bbybbbB..', '..bbbybbbbB.', '..bbbybbbbB.', '.bbbbybbbbbB', '.YYYYYYYYYYY'],
  vest: ['..nn....nn..', '.ntnn..nntn.', '.nnnnNNnnnn.', '.nnnnN.nnnn.', '.nnnnNYnnnn.', '.nnnnN.nnnn.', '.nnnnNYnnnn.', '.nnnnN.nnnN.', '.NNNNN.NNNN.'],
  ring: ['....cwc....', '...cbbbB...', '....bBB....', '...yYYYy...', '..yY...Yy..', '.yY.....Yy.', '.y.......Y.', '.y.......Y.', '.yY.....YY.', '..yY...YY..', '...YYYYY...'],
  amulet: ['.y.......y.', '..y.....y..', '...y...y...', '....yyy....', '...YrrrY...', '..Yrwrrry..', '..Yrrrrry..', '..YRrrrRy..', '...YRRRY...', '....YYY....'],
  charm: ['....yyy....', '....y.y....', '....yyy....', '...pmmmp...', '..pmwmmmp..', '..pmmmmmP..', '..ppmmmPP..', '...pPPPP...'],
  boots: ['..nnnn....', '..ntnn....', '..nnnN....', '..nnnN....', '..nnnN....', '..nnnnnn..', '.nnnnnnnnN', '.NNNNNNNNN'],
  gem: ['..ccccc..', '.cwwcccb.', 'ccwcccbbB', '.ccccbbB.', '..ccbbB..', '...cbB...', '....B....'],
  potion: ['....NN....', '....nn....', '...lwwl...', '....lw....', '...lwwl...', '..lrrrrl..', '.lrwrrrrl.', '.lrwrrrRl.', '.lrrrrrRl.', '..lRRRRl..', '...llll...'],
  phoenix: ['.........yo', '........yor', '.......yorr', '......yorr.', '.....yorrR.', '....yorrR..', '...yorrR...', '..yorrR....', '..orrR.....', '.oR........', 'oR.........'],
  fire: ['....r.......', '....rr......', '...ror...r..', '...roor..rr.', '..rooor.ror.', '..rooyorroor', '.rooyyoooor.', '.royyeyyoor.', 'rroyeeeyoorr', 'rroyeeeeyorr', '.royeeeeyor.', '.rooyeeyoor.', '..rrooooorr.', '...rrrrrr...'],
  ice: ['......c......', '....c.w.c....', '.....cwc.....', '.c....w....c.', '..cc..w..cc..', '....cbwbc....', 'cwwwwwwwwwwwc', '....cbwbc....', '..cc..w..cc..', '.c....w....c.', '.....cwc.....', '....c.w.c....', '......c......'],
  bolt: ['.......yyyy', '......yeey.', '.....yeey..', '....yeey...', '...yeeyyyy.', '..yeeeeeey.', '..yyyyeey..', '.....yey...', '....yey....', '...yey.....', '..yey......', '.yy........', '.y.........'],
  holy: ['......e......', '......e......', '.....eye.....', '.....eye.....', '....eyyye....', '..eeyywyyee..', 'eeyyywwwyyyee', '..eeyywyyee..', '....eyyye....', '.....eye.....', '.....eye.....', '......e......', '......e......'],
  dark: ['....qqqq....', '..qqPPPPqq..', '.qPPpPPPPPq.', '.qPpwpPPPPq.', 'qPPPpPPPPPPq', 'qPPPPPPPPqPq', 'qPPPPPPPqqPq', 'qPPPPPPqqqPq', '.qPPPqqqqPq.', '.qqPPPPPPqq.', '..qqqqqqqq..', '....qqqq....'],
  poison: ['.....G.....', '....GjG....', '....GjG....', '...GjGGG...', '..GjjGGGG..', '..GjGGGGH..', '.GjGGGGGGH.', '.GGGGGGGGH.', '.GGGGGGGHH.', '..GGGGGHH..', '...HHHHH...'],
  slow: ['.........y..y', '.........y..y', '...nnnn..ssss', '..nNttnn.ssss', '.nNtnnNtnsss.', '.nNtNNtnNss..', '.nntnntnNss..', '..nnttnNsss..', 'ssssssssssss.', '.SSSSSSSSSS..'],
  stun: ['.....y.....', '....yey....', '.y...y...y.', 'yey.....yey', '.y.......y.', '...........', '....ggg....', '..gg...gg..', '..g.....g..', '...gg.gg...'],
  up: ['...G...', '..GjG..', '.GjjjG.', 'GGjjjGG', '..GjH..', '..GjH..', '..GHH..'],
  down: ['..rRR..', '..rRR..', '..rRR..', 'rrrRRRR', '.rrRRR.', '..rRR..', '...R...'],
  shield: ['lllllllllll', 'lwbbbbbbbgl', 'lwbbbybbbgl', 'lwbbyyybbgl', 'lwbbbybbbgl', 'lwbbbybbbgl', '.lwbbbbbgl.', '.lwbbbbbgl.', '..lwbbbgl..', '...lwbgl...', '....lgl....', '.....l.....'],
  skull: ['...wwwww...', '..wwwwwwwl.', '.wwwwwwwwwl', '.wkkwwwkkwl', '.wkkwwwkkwl', '.wwwwkwwwwl', '..wwwwwwwl.', '...wlwlwl..', '...wlwlwl..'],
  bag: ['....NNNN....', '...N....N...', '..nnnnnnnn..', '.nttnnnntnn.', 'ntttttttttnN', 'nttttYYtttnN', 'ntttYttYttnN', 'nttttYYtttnN', 'nttttttttnNN', '.nnnnnnnnNN.'],
  map: ['ttTTtttTTttt', 'tttTtttTttTT', 'tGGTtttTttbT', 'tGtTrtrTtbbT', 'ttGTtrtTbbtT', 'ttGTrtrTbttT', 'tttTtttTtttT', 'ttTTtttTTttT', 'TTTTTTTTTTTT'],
  scroll: ['..tttttttttt', '.tTtttttttTt', '.tTddddddtTT', '..tttttttt..', '..tddddddt..', '..tttttttt..', '..tdddddtt..', '..tttttttt..', 'tttttttttt..', 'tTttttttTt..', 'TTTTTTTTT...'],
  cog: ['.....ll.....', '..l.llgg.g..', '.llllllggggg', '..llllgggg..', '.lll....ggg.', 'llll....gggg', 'lll......ggg', '.ll.....ggg.', '..lggggggg..', '.lggggggggg.', '..g..gg..g..', '.....gg.....'],
  crystal: ['.....w.....', '....wcb....', '...wccbB...', '..wcccbbB..', '.wccccbbbB.', '.cccccbbbB.', '.ccccbbbBB.', '..cccbbBB..', '...ccbBB...', '....cBB....', '.....B.....'],
  house: ['.....R.....', '....rRR....', '...rrRRR...', '..rrrRRRR..', '.rrrrRRRRR.', 'RRRRRRRRRRR', '.ttttttttT.', '.tbbttnntT.', '.tbbttnntT.', '.ttttnnntT.', '.ttttnyntT.', '.TTTTnnnTT.'],
  close: ['rr......rr', 'rrr....rrr', '.rrr..rrr.', '..rrrrrr..', '...rrrr...', '...rrrr...', '..rrrrrr..', '.rrr..rrr.', 'rrr....rrr', 'rr......rr'],
  repeat: ['...GGGGG.G.', '..G.....GG.', '.G.....GGG.', '.G.........', '.G.........', '.G.........', '.........G.', '.........G.', '.........G.', '.GGG.....G.', '.GG.....G..', '.G.GGGGG...'],
  auto: ['b....b.....', 'bb...bb....', 'bcb..bcb...', 'bccb.bccb..', 'bcccbbcccb.', 'bccccbccccb', 'bcccbbcccb.', 'bccb.bccb..', 'bcb..bcb...', 'bb...bb....', 'b....b.....'],
  back: ['....w......', '...ww......', '..wlwwwwwww', '.wlllllllll', '..wlggggggg', '...wg......', '....g......'],
  speaker: ['.....w......', '....ww...w..', '...wlw....w.', 'wwwllw..w..w', 'wlllllw..w.w', 'wlllllw..w.w', 'wwwllw..w..w', '...wlw....w.', '....ww...w..', '.....w......'],
  speaker0: ['.....w......', '....ww......', '...wlw......', 'wwwllw.r...r', 'wlllllw.r.r.', 'wlllllw..r..', 'wwwllw..r.r.', '...wlw.r...r', '....ww......', '.....w......'],
  burger: ['wwwwwwwwwww', 'lllllllllll', '...........', 'wwwwwwwwwww', 'lllllllllll', '...........', 'wwwwwwwwwww', 'lllllllllll'],
  coin: ['...YYYY...', '..YeeeyY..', '.YeyyyyyY.', '.YeyYYyyY.', '.YeyYyyyY.', '.YeyYYyyY.', '.YeyyyyyY.', '..YyyyyY..', '...YYYY...'],
  bulb: ['...yyyy...', '..yeeeey..', '.yeewweey.', '.yeweeeey.', '.yeeeeeey.', '..yeeeey..', '...yeey...', '...llll...', '...gggg...', '...llll...', '....gg....'],
  warn: ['.....y.....', '....yyy....', '....ykY....', '...yykyY...', '...yykyY...', '..yyykyyY..', '..yyyyyyY..', '.yyyykyyyY.', '.YYYYYYYYY.'],
  check: ['.........G', '........GG', '.......GGH', 'G.....GGH.', 'GG...GGH..', '.GG.GGH...', '..GGGH....', '...GH.....'],
  lock: ['...gggg...', '..g....g..', '..g....g..', '.yyyyyyyy.', '.yeeeeeeY.', '.yeeNNeeY.', '.yeeNNeeY.', '.yeeeNeeY.', '.YYYYYYYY.'],
  star: ['.....y.....', '....yey....', '....yey....', 'yyyyyeyyyyy', '.yeeeeeeeY.', '..yeeeeeY..', '...yeeeY...', '..yeeYeeY..', '..yeY.YeY..', '.yY.....YY.'],
  socket: ['....l....', '...l.l...', '..l...l..', '.l.....l.', 'l.......l', '.l.....l.', '..l...l..', '...l.l...', '....l....'],
  chest: ['..nnnnnnnn..', '.nNNNNNNNNn.', 'nNnnnnnnnnNn', 'nnnnnyynnnnn', 'YYYYYeyYYYYY', 'nnnnnYYnnnnn', 'nnnnnnnnnnnn', 'nNnnnnnnnnNn', 'NNNNNNNNNNNN'],
  bed: ['n...........', 'n...........', 'nww.........', 'nwwbbbbbbbbn', 'nbbbbbbbbbbn', 'nBBBBBBBBBBn', 'nnnnnnnnnnnn', 'n..........n'],
  trophy: ['y.yyyyyyy.y', 'yyyeeeeeyYY', 'y.yeeeeeY.Y', '.yyeeeeeYY.', '...yeeeY...', '....yY.....', '....yY.....', '...yyYY....', '..YYYYYY...'],
  qmark: ['..wwww..', '.ww..ww.', '.....ww.', '....ww..', '...ww...', '...ww...', '........', '...ww...'],
  excl: ['.yy.', 'yeeY', 'yeeY', 'yeeY', '.yY.', '.yY.', '....', '.yY.', '.YY.'],
  hammer: ['..lllllll..', '.lwwllllgg.', '.lllllllgg.', '..ggnNggg..', '....nN.....', '....nN.....', '....nN.....', '....nN.....', '....nN.....', '....nN.....', '...NNNN....'],
  heart: ['.rr...rr.', 'rwrr.rrrR', 'rwrrrrrrR', 'rrrrrrrrR', '.rrrrrrR.', '..rrrrR..', '...rrR...', '....R....'],
  pin: ['...rrrr...', '..rwwrrR..', '.rwrrrrRR.', '.rrrkkrRR.', '.rrrkkrRR.', '.rrrrrRRR.', '..rrrRRR..', '...rRRR...', '....RR....', '....R.....'],
  tri: ['....w....', '...wlw...', '..wlllg..', '.wllllgg.', 'wlllllggg'],
  person: ['..sss..', '.sssss.', '.sSsSs.', '..sss..', '.bbbbb.', 'bbbbbbb', 'bbbbbbb', '.BB.BB.'],
};
// icons: name -> layers [art, palette override, dx, dy, transform]
const pot = (liq, dk) => [['potion', { r: liq, R: dk }]];
const DEF = {
  sword: [['sword']], dagger: [['dagger']], staff: [['staff']], bow: [['bow']], fists: [['fists']], whip: [['whip']], scythe: [['scythe']], tome: [['tome']], axe: [['axe']], katana: [['katana']],
  rod: [['staff', { b: '#ff7060', c: '#ffc0a0', B: '#a02820' }]], flask: pot('#7ae070', '#2a8a38'),
  armor: [['armor']], robe: [['robe']], vest: [['vest']], ring: [['ring']], amulet: [['amulet']], charm: [['charm']], boots: [['boots']], gem: [['gem']],
  potion: pot('#f84838', '#a81c28'), hipotion: pot('#ff9830', '#c05010'), ether: pot('#58a0ff', '#2858c8'), megaether: pot('#c080ff', '#6c34b0'),
  elixir: [['potion', { r: '#ffe058', R: '#c88a18' }], ['star', {}, 9, 0, 'half']], antidote: pot('#58d858', '#208838'), remedy: pot('#ff80c0', '#b03070'), phoenix: [['phoenix']],
  fire: [['fire']], ice: [['ice']], bolt: [['bolt']], holy: [['holy']], dark: [['dark']], poison: [['poison']],
  skill: [['holy', { y: '#c080ff', e: '#ffc8ff', w: '#ffffff' }]], heal: [['heart']], slow: [['slow']], stun: [['stun']], ko: [['skull']],
  atkup: [['sword'], ['up', {}, 9, 8]], defup: [['shield'], ['up', {}, 9, 8]], up: [['up']], down: [['down']],
  guard: [['shield']], item: pot('#f84838', '#a81c28'), bag: [['bag']], map: [['map']], journal: [['scroll']], quest: [['scroll'], ['excl', {}, 11, 6]],
  bestiary: [['tome', { P: '#6a3a18', p: '#b07038', y: '#ffffff', e: '#d8dcec' }]], options: [['cog']], save: [['crystal']], title: [['house']], close: [['close']],
  repeat: [['repeat']], auto: [['auto']], run: [['boots']], back: [['back']], sound: [['speaker']], mute: [['speaker0']], menu: [['burger']],
  coin: [['coin']], tip: [['bulb']], warn: [['warn']], check: [['check']], lock: [['lock']], star: [['star']], socket: [['socket']], chest: [['chest']],
  bed: [['bed']], trophy: [['trophy']], unknown: [['qmark']], qdone: [['qmark', { w: '#ffe058' }]], excl: [['excl']], guild: [['sword'], ['sword', {}, 0, 0, 'flip']],
  smith: [['hammer']], shop: [['bag'], ['coin', {}, 8, 8, 'half']], gemwright: [['gem'], ['hammer', {}, 7, 6, 'half']], pin: [['pin']], hero: [['person']], spark: [['holy', { y: '#58a0ff', e: '#a8f0ff' }]],
  aup: [['tri']], adown: [['tri', {}, 0, 0, 'flipv']], aleft: [['tri', {}, 0, 0, 'left']], aright: [['tri', {}, 0, 0, 'right']], fight: [['sword']], fanfare: [['star'], ['star', { y: '#ff80c0', e: '#ffd0f0', Y: '#b03070' }, 9, 9, 'half']],
};
function layer(rows, pal, tf) {
  let R = rows.map((r) => [...r]);
  if (tf === 'flip') R = R.map((r) => r.reverse());
  if (tf === 'flipv') R = R.reverse();
  if (tf === 'left' || tf === 'right') { // quarter turns of an up-pointing shape
    const h = R.length, w = Math.max(...R.map((r) => r.length)), at = (y, x) => R[y]?.[x] || '.', T = [];
    for (let y = 0; y < w; y++) { const row = []; for (let x = 0; x < h; x++) row.push(tf === 'right' ? at(h - 1 - x, y) : at(x, w - 1 - y)); T.push(row); }
    R = T;
  }
  const w = Math.max(...R.map((r) => r.length)), h = R.length, half = tf === 'half';
  const c = mk(w, h), x = c.getContext('2d');
  R.forEach((r, yy) => r.forEach((ch, xx) => { if (ch === '.' || ch === ' ') return; x.fillStyle = pal[ch] || PAL[ch] || '#f0f'; x.fillRect(xx, yy, 1, 1); }));
  if (!half) return c;
  const s = mk(Math.ceil(w / 2) + 1, Math.ceil(h / 2) + 1), sx = s.getContext('2d'); sx.imageSmoothingEnabled = false; sx.drawImage(c, 0, 0, s.width, s.height); return s;
}
function outlined(src) { // 1px 4-neighbour outline around opaque pixels
  const w = src.width + 2, h = src.height + 2, c = mk(w, h), x = c.getContext('2d'); x.drawImage(src, 1, 1);
  const d = x.getImageData(0, 0, w, h), a = (xx, yy) => (xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : d.data[(yy * w + xx) * 4 + 3]);
  const o = x.createImageData(w, h), [R, G, B] = [16, 12, 28];
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const i = (yy * w + xx) * 4;
    if (a(xx, yy) > 127) { o.data.set(d.data.slice(i, i + 4), i); continue; }
    if (a(xx - 1, yy) > 127 || a(xx + 1, yy) > 127 || a(xx, yy - 1) > 127 || a(xx, yy + 1) > 127) o.data.set([R, G, B, 255], i);
  }
  x.putImageData(o, 0, 0); return c;
}
const cache = new Map();
export function iconCanvas(name) {
  if (cache.has(name)) return cache.get(name);
  const c = mk(16, 16), x = c.getContext('2d');
  (DEF[name] || DEF.unknown).forEach(([art, pal = {}, dx, dy, tf], i) => {
    const l = outlined(layer(A[art], pal, tf));
    const px = dx ?? Math.floor((16 - l.width) / 2), py = dy ?? Math.floor((16 - l.height) / 2);
    x.drawImage(l, Math.min(16 - l.width, px), Math.min(16 - l.height, py));
  });
  cache.set(name, c); return c;
}
export const ICON_NAMES = Object.keys(DEF);
export const ic = (name, cls = '') => `<i class="ic ic-${name}${cls ? ' ' + cls : ''}" aria-hidden="true"></i>`;

// ---------- game-data helpers ----------
export const elemIcon = (e) => (['fire', 'ice', 'bolt', 'holy', 'dark', 'poison'].includes(e) ? ic(e) : '');
export const STATUS_ICON = { poison: 'poison', slow: 'slow', stun: 'stun', atkup: 'atkup', defup: 'defup' };
export const statusIcons = (st = {}) => Object.keys(STATUS_ICON).filter((k) => st[k] > 0).map((k) => ic(STATUS_ICON[k], 'st')).join('');
export function itemIconName(id, it = {}) {
  if (DEF[id] && /potion|ether|elixir|phoenix|antidote|remedy/.test(id)) return id;
  return it.revive ? 'phoenix' : it.cure ? 'antidote' : it.mpr ? 'ether' : 'potion';
}
export function gearIconName(kind, d = {}) {
  const n = (d.name || '').toLowerCase();
  if (kind === 'weapons') return DEF[d.type] ? d.type : 'sword';
  if (kind === 'armors') return /robe|cloak|garb|vestment|gown|mantle/.test(n) ? 'robe' : /vest|leather|tunic|gi\b/.test(n) ? 'vest' : 'armor';
  if (kind === 'accs') return /ring|band/.test(n) ? 'ring' : /pendant|amulet|locket|necklace|talisman/.test(n) ? 'amulet' : /boot|shoe|greave/.test(n) ? 'boots' : /jewel|gem|stone/.test(n) ? 'gem' : 'charm';
  if (kind === 'items') return itemIconName(d.id, d);
  return 'gem';
}
export const skillIconName = (s) => (s.elem && DEF[s.elem] ? s.elem : s.kind === 'heal' ? 'heal' : s.kind === 'buff' ? 'atkup' : s.kind === 'mag' ? 'skill' : 'sword');

// ---------- emoji bridge: any emoji left in a string becomes a pixel icon ----------
const EMOJI = {
  '💡': 'tip', '⚠': 'warn', '◇': 'socket', '📜': 'quest', '✔': 'check', '★': 'star', '⭐': 'star', '⏩': 'auto', '🛏': 'bed', '🗺': 'map', '🎉': 'fanfare',
  '⚙': 'options', '⚔': 'guild', '🛡': 'guard', '🔒': 'lock', '🔊': 'sound', '🔇': 'mute', '🔁': 'repeat', '📱': 'tip', '📦': 'chest', '📖': 'bestiary', '💾': 'save',
  '💫': 'stun', '💎': 'gemwright', '🐌': 'slow', '🏆': 'trophy', '🎒': 'bag', '⬆': 'up', '❔': 'unknown', '❓': 'qdone', '✖': 'close', '✕': 'close', '☠': 'poison',
  '🔥': 'fire', '❄': 'ice', '⚡': 'bolt', '✨': 'holy', '🌑': 'dark', '🛒': 'shop', '⚒': 'smith', '✦': 'spark', '🗡': 'dagger', '🔮': 'staff', '✝': 'heal', '👊': 'fists',
  '🏹': 'bow', '💀': 'ko', '🎵': 'charm', '🪓': 'axe', '⚗': 'flask', '🗾': 'katana', '⚜': 'guard',
};
const EMOJI_RE = new RegExp(`(${Object.keys(EMOJI).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\uFE0F?`, 'gu');
export const deco = (html) => String(html).replace(EMOJI_RE, (_, k) => ic(EMOJI[k]));

// ---------- hero faces: a 16x16 head-and-shoulders crop of the battle portrait ----------
const faces = new Map();
export function faceURL(job) {
  if (faces.has(job)) return faces.get(job);
  let src; try { src = BA.heroPortrait(job); } catch { src = null; }
  if (!src) return SP.heroURL(job);
  const w = src.width, h = src.height, d = src.getContext('2d').getImageData(0, 0, w, h).data, op = (x, y) => d[(y * w + x) * 4 + 3] > 40;
  let top = 0; while (top < h && ![...Array(w).keys()].some((x) => op(x, top))) top++;
  let sx = 0, n = 0; for (let y = top; y < Math.min(h, top + 9); y++) for (let x = 0; x < w; x++) if (op(x, y)) { sx += x; n++; }
  const cxp = n ? Math.round(sx / n) : w / 2, S = 18, c = mk(S, S), x = c.getContext('2d');
  x.drawImage(src, Math.round(S / 2 - cxp), 1 - top);
  const u = SP.url(c, 4); faces.set(job, u); return u;
}
export function npcFaceURL(type) { // head crop of a townsperson's field sprite
  const k = 'npc:' + type; if (faces.has(k)) return faces.get(k);
  const src = WK.npcWalker(type, 'down', 0), w = src.width, h = src.height, d = src.getContext('2d').getImageData(0, 0, w, h).data;
  const S = 16, c = mk(S, S); c.getContext('2d').drawImage(src, Math.round((S - w) / 2), -Math.max(0, h - 24) + 1); // field sprites are 16x24 (taller only when a spear or staff pokes up)
  const u = SP.url(c, 4); faces.set(k, u); return u;
}
export const face = (job, cls = '') => `<span class="face ${cls}"><img src="${faceURL(job)}" alt=""></span>`;

// ---------- window frames (9-slice, baked at 2x so corners stay pixel-exact) ----------
function frame(T, rings, corner) {
  const N = T * 3, c = mk(N, N), x = c.getContext('2d');
  rings.forEach(([tl, br], i) => {
    x.fillStyle = tl; x.fillRect(i, i, N - 2 * i, 1); x.fillRect(i, i, 1, N - 2 * i);
    x.fillStyle = br; x.fillRect(i, N - 1 - i, N - 2 * i, 1); x.fillRect(N - 1 - i, i, 1, N - 2 * i);
  });
  for (const [ax, ay] of [[0, 0], [N - 1, 0], [0, N - 1], [N - 1, N - 1]]) { // rounded corners
    const sx = ax ? -1 : 1, sy = ay ? -1 : 1;
    x.clearRect(ax, ay, 1, 1); x.clearRect(ax + sx, ay, 1, 1); x.clearRect(ax, ay + sy, 1, 1);
    x.fillStyle = rings[0][0]; x.fillRect(ax + sx, ay + sy, 1, 1);
    if (corner) corner(x, ax, ay, sx, sy);
  }
  const s = mk(N * 2, N * 2), sx2 = s.getContext('2d'); sx2.imageSmoothingEnabled = false; sx2.drawImage(c, 0, 0, N * 2, N * 2); return s.toDataURL();
}
const K = '#0c0c24';
const stud = (gold, dark, lite) => (x, ax, ay) => { // a gold rivet filling each 4x4 corner cell
  const ox = ax ? ax - 3 : 0, oy = ay ? ay - 3 : 0;
  x.fillStyle = K; x.fillRect(ox, oy, 4, 4);
  x.fillStyle = gold; x.fillRect(ox + 1, oy + 1, 2, 2);
  x.fillStyle = lite; x.fillRect(ox + 1, oy + 1, 1, 1);
  x.fillStyle = dark; x.fillRect(ox + 2, oy + 2, 1, 1);
};
function dither() { const c = mk(4, 4), x = c.getContext('2d'); x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(0, 0, 2, 2); x.fillStyle = 'rgba(0,0,40,.10)'; x.fillRect(2, 2, 2, 2); return c.toDataURL(); }

let installed = false;
export function installUI() {
  if (installed) return; installed = true;
  const silver = [[K, K], ['#ffffff', '#8a90b8'], ['#c8cce4', '#b4b8d4'], ['#262e78', '#262e78']];
  const vars = {
    '--frame': frame(4, silver),
    '--frame-orn': frame(4, silver, stud('#ffd860', '#a06a10', '#fff8c0')),
    '--frame-gold': frame(4, [[K, K], ['#fff4b0', '#a87818'], ['#f0c850', '#d0a030'], ['#3a2a10', '#3a2a10']], stud('#ffffff', '#c09020', '#ffffff')),
    '--frame-red': frame(4, [[K, K], ['#ffd0d0', '#a04050'], ['#e87080', '#c05060'], ['#3a1020', '#3a1020']]),
    '--inset': frame(2, [['#0a0e3a', '#7a8ad8'], ['#18206a', '#4858b0']]),
    '--chip': frame(2, [[K, K], ['#d8e0ff', '#4a54a0']]),
    '--chip-on': frame(2, [[K, K], ['#fff4b0', '#b08020']]),
    '--dither': dither(),
  };
  const css = [`:root{${Object.entries(vars).map(([k, v]) => `${k}:url(${v})`).join(';')}}`];
  for (const n of ICON_NAMES) css.push(`.ic-${n}{background-image:url(${iconCanvas(n).toDataURL()})}`);
  const st = document.createElement('style'); st.id = 'uiart'; st.textContent = css.join('\n'); document.head.appendChild(st);
}
