// ===== Field-sprite parts and character recipes (see walkerart.js for the letter legend) =====
// P(x, y, rows): a part at sprite coords. Full-width rows are 16 chars. Directions: down, up, right ('left' mirrors right).
export const P = (x, y, rows) => ({ x, y, rows });

// ---------- anatomy ----------
export const FACE = {
  down: P(0, 3, [
    '....ssssssss....',
    '...sSSSSSSSSs...',
    '...SSSSSSSSSs...',
    '...SSSSSSSSSs...',
    '...SSSSSSSSsx...',
    '..sSSeSSSSeSxx..',
    '..xSSESSSSESxX..',
    '....xSSSSSsx....',
    '.....xxssxx.....']),
  right: P(0, 3, [
    '.....sssssss....',
    '....sSSSSSSSs...',
    '....SSSSSSSSSs..',
    '....SSSSSSSSSS..',
    '....SSSSSSSSSS..',
    '....sSSSSSSeSS..',
    '....xSSSSSSESSs.',
    '....xxsSSSSSsx..',
    '......xxsssx....']),
  up: P(0, 3, [
    '....ssssssss....',
    '...sssssssssx...',
    '...ssssssssxx...',
    '...ssssssssxx...',
    '...xsssssssxx...',
    '..sxsssssssxxx..',
    '..xxsssssssxXX..',
    '....xsssssxx....',
    '.....xxxxxx.....']),
};
export const EAR = P(6, 8, ['Ss', 'sx']);

export const TORSO = {
  down: P(0, 11, [
    '.....uuTTuu.....',
    '....TWTTTTTt....',
    '....TWTTTTTu....',
    '....TWTTTTtu....',
    '....tTTTTTtu....',
    '....aAAZAAaz....',
    '....TTTtTTtu....']),
  up: P(0, 11, [
    '.....uTTTTu.....',
    '....TWTTTTTt....',
    '....TTTTTTTu....',
    '....TTTTTTtu....',
    '....tTTTTttu....',
    '....aAAAAAaz....',
    '....TTTtTTtu....']),
  right: P(0, 11, [
    '......uTTTu.....',
    '.....TWTTTTt....',
    '.....TWTTTTu....',
    '.....TTTTTtu....',
    '.....tTTTTtu....',
    '.....aAAAZaz....',
    '.....TTTTttu....']),
};
// arms: [neutral, forward, back]
export const ARM = {
  L: [P(2, 12, ['WT', 'TT', 'Tt', 'Tt', 'Ss', 'sx']), P(2, 12, ['WT', 'TT', 'Tt', 'Tt', 'tu', 'Ss', 'sx']), P(2, 12, ['WT', 'TT', 'Tt', 'Ss', 'sx'])],
  R: [P(12, 12, ['Tt', 'Tt', 'tu', 'tu', 'sx', 'xX']), P(12, 12, ['Tt', 'Tt', 'tu', 'tu', 'tu', 'sx', 'xX']), P(12, 12, ['Tt', 'Tt', 'tu', 'sx', 'xX'])],
  near: [P(7, 12, ['WT', 'TT', 'Tt', 'Tt', 'Ss', 'sx']), P(7, 12, ['WT..', 'TTt.', '.Ttt', '..Ss', '..sx']), P(5, 12, ['..WT', '.TTt', 'Tt..', 'Ss..', 'sx..'])],
  far: [null, P(3, 13, ['.tu', 'tu.', 'xX.']), P(10, 13, ['tu.', '.tu', '.xX'])],
};
export const LEGS = {
  down: [
    P(0, 18, ['.....PPpPPq.....', '.....PPqPpq.....', '.....PPqPpq.....', '.....BBbBBb.....', '....DBBbBBbd....']),
    P(0, 18, ['.....PPpPPq.....', '.....PPqPpq.....', '.....PPqBBb.....', '.....BBbbbd.....', '....DBBb........']),
    P(0, 18, ['.....PPpPPq.....', '.....PPqPpq.....', '.....PPqPpq.....', '.....BBbBBb.....', '.....DBbBBb.....']),
    P(0, 18, ['.....PPpPPq.....', '.....PPqPpq.....', '.....BBbPpq.....', '.....bbdBBb.....', '........BBbd....'])],
  up: [
    P(0, 18, ['.....PPpPPq.....', '.....PPqPpq.....', '.....PPqPpq.....', '.....BBbBBb.....', '.....bBdbBd.....']),
    P(0, 18, ['.....PPpPPq.....', '.....PPqPpq.....', '.....PPqBBb.....', '.....BBbbbd.....', '.....bBd........']),
    P(0, 18, ['.....PPpPPq.....', '.....PPqPpq.....', '.....PPqPpq.....', '.....BBbBBb.....', '.....bBdbBd.....']),
    P(0, 18, ['.....PPpPPq.....', '.....PPqPpq.....', '.....BBbPpq.....', '.....bbdBBb.....', '........bBd.....'])],
  right: [
    P(0, 18, ['......PPPq......', '......PPPq......', '......PPpq......', '......BBBb......', '......BBBBb.....']),
    P(0, 18, ['......PPPq......', '.....qpPPPq.....', '....qp..PPq.....', '...dbb...BBb....', '...db....BBBb...']),
    P(0, 18, ['......PPPq......', '......PPPq......', '......PPPq......', '......BBBb......', '.....bBBBBb.....']),
    P(0, 18, ['......PPPq......', '.....PPPqpq.....', '....PPq..pqq....', '...BBb....bbd...', '...BB.....bbbd..'])],
};
// long robe / dress replaces the legs (rows 17-22)
export const ROBE = {
  down: [
    P(0, 17, ['....TTTtTTtu....', '....TWTTTTtu....', '...TWTTTTTTtu...', '...TTTTTTTTtu...', '...utttuttttu...', '.....BBb.bBB....']),
    P(0, 17, ['....TTTtTTtu....', '....TWTTTTtu....', '...TWTTTTTTtu...', '...TTTTTTTTtu...', '...uttttutttu...', '....BBb.........']),
    P(0, 17, ['....TTTtTTtu....', '....TWTTTTtu....', '...TWTTTTTTtu...', '...TTTTTTTTtu...', '...utttuttttu...', '.....Bb..bB.....']),
    P(0, 17, ['....TTTtTTtu....', '....TWTTTTtu....', '...TWTTTTTTtu...', '...TTTTTTTTtu...', '...uttuttttuu...', '.........bBBd...'])],
  up: [
    P(0, 17, ['....TTTtTTtu....', '....TTTTTTtu....', '...TTTTTTTTtu...', '...TTTTtTTTtu...', '...utttuttttu...', '.....bBd.bBd....']),
    P(0, 17, ['....TTTtTTtu....', '....TTTTTTtu....', '...TTTTTTTTtu...', '...TTTTtTTTtu...', '...uttttutttu...', '....bBd.........']),
    P(0, 17, ['....TTTtTTtu....', '....TTTTTTtu....', '...TTTTTTTTtu...', '...TTTTtTTTtu...', '...utttuttttu...', '.....bd...bd....']),
    P(0, 17, ['....TTTtTTtu....', '....TTTTTTtu....', '...TTTTTTTTtu...', '...TTTTtTTTtu...', '...uttuttttuu...', '.........bBd....'])],
  right: [
    P(0, 17, ['.....TTTTttu....', '.....TWTTTtu....', '....TWTTTTTtu...', '....TTTTTTTtu...', '....uttttttuu...', '.....bBBBBb.....']),
    P(0, 17, ['.....TTTTttu....', '.....TWTTTTtu...', '....TWTTTTTTtu..', '...uTTTTTTTTtu..', '...uutttttttuu..', '...bb....BBBb...']),
    P(0, 17, ['.....TTTTttu....', '.....TWTTTtu....', '....TWTTTTTtu...', '....TTTTTTTtu...', '....uttttttuu...', '.....bBBBBb.....']),
    P(0, 17, ['.....TTTTttu....', '....TWTTTTtu....', '...TWTTTTTTtu...', '...TTTTTTTTtu...', '..uutttttttuu...', '...BBB....bbd...'])],
};

// ---------- hair ----------
export const HAIR = {
  short: {
    down: P(0, 0, [
      '................',
      '......YHHh......',
      '....HYYHHHHh....',
      '...HYHHHHHHHh...',
      '..HYHHYYYHHHHh..',
      '..HHHhHHHHhHhh..',
      '.hHHhHHhHHhHhhj.',
      '..HhhHhHHhHhhh..',
      '..Hh..h..h..hj..',
      '..hj........jj..',
      '..j..........j..']),
    up: P(0, 0, [
      '................',
      '......YHHh......',
      '....HYYHHHHh....',
      '...HYHHHHHHHh...',
      '..HYHHYYYHHHHh..',
      '..HHHHHHHHHHhh..',
      '.hHHHHHHHHHHHhj.',
      '..HHHhHHHHhHHh..',
      '..HHhhHHHhhHhj..',
      '..hHhjhHhjhhjj..',
      '..jjjhjjhjjjjj..',
      '....jjjjjjjj....']),
    right: P(0, 0, [
      '................',
      '.....YHHHh......',
      '...HYYHHHHHh....',
      '..HYHHHHHHHHh...',
      '..HYHHYYYHHHHh..',
      '.hHHHHHHHHHHHh..',
      '.hHHHHHHHHHhHHh.',
      '..HHHHHHhHHhHh..',
      '..hHHHH..h......',
      '..hHHh..........',
      '..jhj...........',
      '...j............']),
  },
  spiky: {
    down: P(0, -2, [
      '....Y....H......',
      '...YH..YHh..h...',
      '..YHH.YHHh.Hh...',
      '.YHHHYHHHHHHh.h.',
      '..YHHHHHHHHHHhh.',
      '.YHHHHHHHHHHHhh.',
      'YHHHHHHHHHHHHhhj',
      '.HHHYHHHHHYHHhj.',
      'YHHHHHHHHHHHHhhj',
      '.HHhHHhHHhHHhhj.',
      'HHh.h..hh..h.hjj',
      '.hj..........jj.',
      'hj............jj']),
    up: P(0, -2, [
      '....Y....H......',
      '...YH..YHh..h...',
      '..YHH.YHHh.Hh...',
      '.YHHHYHHHHHHh.h.',
      '..YHHHHHHHHHHhh.',
      '.YHHHHHHHHHHHhh.',
      'YHHHHHHHHHHHHhhj',
      '.HHHHHhHHHHhHhj.',
      'YHHHhHHHHhHHhhhj',
      '.hHHhhHHHhhHhhj.',
      'hhHhjhHhhjhhjjjj',
      '.jhjjhjjhjjjjjj.',
      'jj.jjjjjjjjjj.jj']),
    right: P(0, -2, [
      '...Y....H.......',
      '..YH..YHh..h....',
      '.YHH.YHHh.Hh....',
      'YHHHYHHHHHHh.h..',
      '.YHHHHHHHHHHHh..',
      'YHHHHHHHHHHHHhh.',
      'HHHHHHHHHHHHHhh.',
      '.HHHHHYHHHHHHHh.',
      'HHHHHHHHHHHHhh..',
      '.HHHHHHHhHHhHh..',
      'hhHHHH..hh...h..',
      '.hHHh...........',
      'jjhhj...........',
      '.jjj............']),
  },
  long: {
    down: P(0, 0, [
      '................',
      '......YYHh......',
      '....YYHHHHHh....',
      '...YHHHHHHHHh...',
      '..HYHHYYYHHHHh..',
      '.HHHHHHHHHHHHhh.',
      '.HHHHHhHHhHHHhj.',
      '.HHHhh.HH.hhHhj.',
      '.HHh........hhj.',
      '.HHh........hhj.',
      '.HHh........hhj.',
      '.hHh........hjj.',
      '.hhj........jjj.',
      '..jj........jj..']),
    up: P(0, 0, [
      '................',
      '......YYHh......',
      '....YYHHHHHh....',
      '...YHHHHHHHHh...',
      '..YHHHHHHHHHHh..',
      '.YHHHHHHHHHHHhh.',
      '.HHHHHHHHHHHHhh.',
      '.HHHHhHHHHhHHhh.',
      '.HHHHhHHHHhHhhj.',
      '.HHHhhHHHhhHhhj.',
      '.hHHhHHHHhHhhjj.',
      '.hHhhHHHhhhhhjj.',
      '.hhhjhhhhjhhjjj.',
      '..jjjjjjjjjjjj..']),
    right: P(0, 0, [
      '................',
      '.....YYHHh......',
      '...YYHHHHHHh....',
      '..YHHHHHHHHHh...',
      '.YHHHHHHHHHHHh..',
      '.HHHHHYHHHHHHHh.',
      '.HHHHHHHHHHHHhh.',
      '.HHHHHHHhHHhHh..',
      '.HHHHH..hh...h..',
      '.HHHh...........',
      '.HHhh...........',
      '.hHhh...........',
      '.hhhj...........',
      '..jjj...........']),
  },
  bald: { // white side hair, shiny scalp
    down: P(0, 0, [
      '................',
      '......SSss......',
      '....SSSSSSss....',
      '...SSwSSSSSsx...',
      '..SSwSSSSSSSsx..',
      '.HSSSSSSSSSSsxh.',
      '.YHsSSSSSSSSxhh.',
      '.HHh........hhj.',
      '.Hh..........hj.',
      '.hj..........jj.',
      '..j..........j..']),
    up: P(0, 0, [
      '................',
      '......SSss......',
      '....SSSSSSss....',
      '...SSwSSSSSsx...',
      '..SSwSSSSSSSsx..',
      '.HSSSSSSSSSSsxh.',
      '.YHsSSSSSSSsxhh.',
      '.HHHhssssssxhhh.',
      '.HHHHHhhhhHHhhj.',
      '.hHHhhHHHhhHhhj.',
      '.jhhjhhhhjhhjjj.',
      '...jjjjjjjjjj...']),
    right: P(0, 0, [
      '................',
      '.....SSSss......',
      '...SSSSSSSsx....',
      '..SSwSSSSSSSx...',
      '.SSwSSSSSSSSSx..',
      '.HSSSSSSSSSSSs..',
      '.YHSSSSSSSSSSs..',
      '.HHHHHs.........',
      '.hHHHh..........',
      '.hHHh...........',
      '.jhhj...........',
      '..jj............']),
  },
};

// ---------- headgear ----------
const HOOD = {
  down: [
    '......KCCc......',
    '....KCCCCCCc....',
    '...KCCCCCCCCc...',
    '..KCCCCCCCCCCc..',
    '.KCCCCCCCCCCCcv.',
    '.CCCcvvvvvvcCcv.',
    '.CCv........vcv.',
    '.CCv........vcv.',
    '.CCv........vcv.',
    '.CCcv......vccv.',
    '.cCcv......vccv.',
    '.ccvv......vvcv.',
    '..vvv......vvv..'],
  up: [
    '......KCCc......',
    '....KCCCCCCc....',
    '...KCCCCCCCCc...',
    '..KCCCCCCCCCCc..',
    '.KCCCCCCCCCCCcv.',
    '.CCCCCCCCCCCCcv.',
    '.CCCCCCCCCCCccv.',
    '.CCCCCCCCCCcccv.',
    '.cCCCCCCCCCccvv.',
    '.cCCCCCCCCcccvv.',
    '.ccCCCCCCcccvvv.',
    '.cccccccccccvvv.',
    '..vvvvvvvvvvvv..'],
  right: [
    '.....KCCCc......',
    '...KCCCCCCCc....',
    '..KCCCCCCCCCc...',
    '.KCCCCCCCCCCCc..',
    '.CCCCCCCCCCCCcv.',
    '.CCCCCCCCcvvvvv.',
    '.CCCCCCCv.......',
    '.CCCCCCCv.......',
    '.CCCCCCcv.......',
    '.cCCCCCcv.......',
    '.cCCCCccv.......',
    '.ccccccv........',
    '..vvvvv.........'],
};
const hood = (y = 0, extra = {}) => ({ down: [P(0, y, HOOD.down), ...(extra.down || [])], up: [P(0, y, HOOD.up), ...(extra.up || [])], right: [P(0, y, HOOD.right), ...(extra.right || [])] });
const HELM_DOWN = [
  '....LLMMMMm.....',
  '...LMMMMMMMm....',
  '..LMLMMMMMMMMm..',
  '.LMLMMMMMMMMMmn.',
  '.MMLMMMMMMMMMmn.',
  '.MMMMMMMMMMMMmn.'];
export const HEADS = {
  knight: {
    down: [P(0, -1, [
      '......CKc.......',
      '.....CKCcc......',
      '....LLMCcMm.....',
      '...LMMMMMMMm....',
      '..LMLMMMMMMMMm..',
      '.LMLMMMMMMMMMmn.',
      '.MMLMMMMMMMMMmn.',
      '.MMMMMMMMMMMMmn.',
      '.Mmnnnnnnnnnnmn.',
      '.Mm....mn....mn.',
      '.Mm..........mn.',
      '.mn..........nn.',
      '..n..........n..'])],
    up: [P(0, -1, [
      '......CKc.......',
      '.....CKCcc......',
      '....LLCCcMm.....',
      '...LMMCccMMm....',
      '..LMLMMccMMMMm..',
      '.LMLMMMMMMMMMmn.',
      '.MMLMMMMMMMMMmn.',
      '.MMMMMMMMMMMMmn.',
      '.MMMMMMMMMMMMmn.',
      '.MmMMMMMMMMMmmn.',
      '.mmMMMMMMMMmmnn.',
      '.mnmmmmmmmmmmnn.',
      '..nnnnnnnnnnnn..'])],
    right: [P(0, -1, [
      '...Kc...........',
      '..KCCc.LMm......',
      '.KCc..LMMMMm....',
      '.Cc..LMMMMMMm...',
      '....LMLMMMMMMm..',
      '...LMLMMMMMMMMm.',
      '..LMLMMMMMMMMMn.',
      '.LMMMMMMMMMMMMn.',
      '.MMMMMMMMnnnnnn.',
      '.MMMMMMMn.......',
      '.MMMMMMMn.......',
      '.mMMMMmn........',
      '..nnnnn.........'])],
  },
  paladin: {
    down: [P(0, 0, [
      '.......ZA.......',
      '....LLMZaMm.....',
      '...LMMMZaMMm....',
      '..LMLMMZaMMMMm..',
      '.LMLMMMMMMMMMmn.',
      '.MMLMMMMMMMMMmn.',
      '.MMMMMMMMMMMMmn.',
      '.AZAAAAAAAAAAaz.',
      '.Mm....aa....mn.',
      '.Mm..........mn.',
      '.mn..........nn.',
      '..n..........n..']), P(0, 1, ['O..', 'OO.', 'OFO', 'FFf', '.Ff']), P(13, 1, ['..O', '.Of', 'OfN', 'fFN', 'fN.'])],
    up: [P(0, 0, [
      '.......ZA.......',
      '....LLMZaMm.....',
      '...LMMMZaMMm....',
      '..LMLMMZaMMMMm..',
      '.LMLMMMZaMMMMmn.',
      '.MMLMMMZaMMMMmn.',
      '.MMMMMMZaMMMMmn.',
      '.AZAAAAAAAAAAaz.',
      '.MmMMMMMMMMMmmn.',
      '.mmMMMMMMMMmmnn.',
      '.mnmmmmmmmmmmnn.',
      '..nnnnnnnnnnnn..']), P(0, 1, ['O..', 'OO.', 'OFO', 'FFf', '.Ff']), P(13, 1, ['..O', '.Of', 'OfN', 'fFN', 'fN.'])],
    right: [P(0, 0, [
      '.......LMm......',
      '......LMMMMm....',
      '.....LMMMMMMm...',
      '....LMLMMMMMMm..',
      '...LMLMMMMMMMMm.',
      '..LMLMMMMMMMMMn.',
      '.LMMMMMMMMMMMMn.',
      '.AAZAAAAAzaaaaz.',
      '.MMMMMMMn.......',
      '.MMMMMMMn.......',
      '.mMMMMmn........',
      '..nnnnn.........']), P(1, -2, ['O....', 'OO...', 'OFO..', '.FFO.', '.FfFO', '..fFf', '...fN'])],
  },
  guard: { // open kettle helm with a wide brim
    down: [P(0, 1, [
      '......LMm.......',
      '....LLMMMMm.....',
      '...LMLMMMMMm....',
      '..LMLMMMMMMMm...',
      '..MMMMMMMMMMmn..',
      'LMMMMMMMMMMMMmnn',
      '.nnnnnnnnnnnnnn.'])],
    up: [P(0, 1, [
      '......LMm.......',
      '....LLMMMMm.....',
      '...LMLMMMMMm....',
      '..LMLMMMMMMMm...',
      '..MMMMMMMMMMmn..',
      'LMMMMMMMMMMMMmnn',
      '.nnnnnnnnnnnnnn.'])],
    right: [P(0, 1, [
      '......LMMm......',
      '....LLMMMMMm....',
      '...LMLMMMMMMm...',
      '..LMLMMMMMMMMm..',
      '..MMMMMMMMMMMn..',
      'LMMMMMMMMMMMMMmn',
      '.nnnnnnnnnnnnnn.'])],
  },
  mage: {
    down: [P(0, -4, [
      '........KC......',
      '.......KCc......',
      '.......CCc......',
      '......KCCcv.....',
      '......CCCcv.....',
      '.....KCCCCcv....',
      '.....CCCCCcv....',
      '....KCCCCCCcv...',
      '....AAZAAAAaz...',
      '..KCCCCCCCCCCv..',
      '.KCCCCCCCCCCCcv.',
      '.vccccccccccccv.',
      '...oo......oo...'])],
    up: [P(0, -4, [
      '........KC......',
      '.......KCc......',
      '.......CCc......',
      '......KCCcv.....',
      '......CCCcv.....',
      '.....KCCCCcv....',
      '.....CCCCCcv....',
      '....KCCCCCCcv...',
      '....AAAAAAAaz...',
      '..KCCCCCCCCCCv..',
      '.KCCCCCCCCCCCcv.',
      '.vccccccccccccv.'])],
    right: [P(0, -4, [
      '..KC............',
      '..CCc...........',
      '...CCc..........',
      '...KCCc.........',
      '....CCCc........',
      '....KCCCCc......',
      '....CCCCCCc.....',
      '...KCCCCCCCc....',
      '...AAZAAAAAaz...',
      '.KCCCCCCCCCCCCv.',
      'KCCCCCCCCCCCCCcv',
      '.vcccccccccccvv.',
      '........oo......'])],
  },
  bard: { // cavalier hat with a long swept plume
    down: [P(0, -3, [
      '.............OO.',
      '...........OOFf.',
      '..........OFfN..',
      '.........OFfN...',
      '.....KCCOFfCc...',
      '...KCCCCFfCCCc..',
      '..KCCCCCNCCCCcv.',
      '.KCCCCCCCCCCCCcv',
      'KCAAZAAAAAAAAacv',
      '.vcccccccccccvv.'])],
    up: [P(0, -3, [
      '.OO.............',
      '.fFOO...........',
      '..NfFO..........',
      '...NfFO.........',
      '...KCNfFCCc.....',
      '..KCCCCNfCCCc...',
      '.KCCCCCCCCCCCcv.',
      'KCCCCCCCCCCCCCcv',
      'KCAAAAAAAAAAAacv',
      '.vcccccccccccvv.'])],
    right: [P(0, -3, [
      'OO..............',
      'fFOO............',
      '.NfFO...........',
      '..NfFO..........',
      '...NfFOCCCc.....',
      '....NfCCCCCCc...',
      '..KCCCCCCCCCCc..',
      '.KCCCCCCCCCCCCcv',
      'KCAAAAAAAAAZAacv',
      '.vcccccccccccvv.'])],
  },
  ranger: {
    down: [P(0, -1, [
      '.........OO.....',
      '........OFf.....',
      '......KCFfCc....',
      '....KCCCCCCCc...',
      '...KCCCCCCCCCc..',
      '..KCCCCCCCCCCCc.',
      '..CCCCCCCCCCCcv.',
      '..vccccccccccvv.'])],
    up: [P(0, -1, [
      '.....OO.........',
      '.....fFO........',
      '....KCfFCc......',
      '...KCCCCCCCc....',
      '..KCCCCCCCCCc...',
      '.KCCCCCCCCCCCc..',
      '.CCCCCCCCCCCCcv.',
      '.vccccccccccccv.'])],
    right: [P(0, -1, [
      '..OO............',
      '..fFO...........',
      '...fFKCCCc......',
      '..KCCCCCCCCc....',
      '.KCCCCCCCCCCCc..',
      'KCCCCCCCCCCCCCc.',
      '.vCCCCCCCCCCcvvv',
      '..vvccccccccv...'])],
  },
  monk: { // headband with trailing tails
    down: [P(0, 5, ['.AZAAAAAAAAAAaz.'])],
    up: [P(0, 5, ['.AAAAAAAAAAAAaz.', '......AZa.......', '......Aaa.......', '.....Aa.Aa......', '.....a...a......'])],
    right: [P(0, 5, ['.AAAAAAAAAAAZaz.', 'aAa.............', 'Aa..............', 'a...............'])],
  },
  samurai: { // topknot + white hachimaki
    down: [P(5, -2, ['.YHh.', 'YHHhj', '.jhj.']), P(0, 5, ['.FOFFFFFFFFFFfN.'])],
    up: [P(5, -2, ['.YHh.', 'YHHhj', '.jhj.']), P(0, 5, ['.FFFFFFFFFFFFfN.', '......FfN.......', '.....Ff.fN......'])],
    right: [P(3, -2, ['.YHh.', 'YHHhj', '.jhj.']), P(0, 5, ['.FFFFFFFFFFFOfN.', 'FfN.............', 'f.N.............'])],
  },
  berserker: { // horned iron helm over a wild red mane
    down: [P(0, -2, [
      '.4............4.',
      '.45..........56.',
      '.45....LMm...56.',
      '..45.LMMMMm.56..',
      '..556LMMMMMM65..',
      '...6LMLMMMMMm6..',
      '..LMLMMMMMMMMm..',
      '..MMMMMMMMMMMn..',
      '..nnmnnnnnmnnn..'])],
    up: [P(0, -2, [
      '.4............4.',
      '.45..........56.',
      '.45....LMm...56.',
      '..45.LMMMMm.56..',
      '..556LMMMMMM65..',
      '...6LMMMMMMMm6..',
      '..LMLMMMMMMMMm..',
      '..MMMMMMMMMMMn..',
      '..nnnnnnnnnnnn..'])],
    right: [P(0, -2, [
      '..........4.....',
      '.........45.....',
      '.........45.....',
      '......LMMm56....',
      '....LMMMMMM6....',
      '...LMLMMMMMMm...',
      '..LMLMMMMMMMMm..',
      '..MMMMMMMMMMMMn.',
      '..nnnnnnnnmnnnn.'])],
  },
  alchemist: { // bandana + brass goggles pushed up on the forehead
    down: [P(0, 0, [
      '......KCCc......',
      '....KCCCCCCc....',
      '...KCCCCCCCCc...',
      '..KCCCCCCCCCCc..',
      '.KCCAAACCAAACcv.',
      '.CCA12AmmA12acv.',
      '.vvaAAavvaAAazv.'])],
    up: [P(0, 0, [
      '......KCCc......',
      '....KCCCCCCc....',
      '...KCCCCCCCCc...',
      '..KCCCCCCCCCCc..',
      '.KCCCCCCCCCCCcv.',
      '.mmmmmmmmmmmmmm.',
      '.vccccccccccccv.',
      '.......Ccv......',
      '......Cc.cv.....'])],
    right: [P(0, 0, [
      '.....KCCCc......',
      '...KCCCCCCCc....',
      '..KCCCCCCCCCc...',
      '.KCCCCCCCCCCCc..',
      '.CCCCCCCCAAAAc..',
      '.mmmmmmmmA12Aa..',
      '.vcccccccaAAz...',
      'Ccv.............',
      'c.cv............'])],
  },
  rogue: hood(0, { down: [P(3, 10, ['FFOFFFFFfN', 'fFFFFFFffN', '.ffffffNN.'])], right: [P(8, 10, ['FFFFFfN', 'fFFFFfN', '.ffffN.'])], up: [P(3, 10, ['fNNNNNNNNN'])] }),
  cleric: hood(0, {
    down: [P(0, 5, ['.CCCZAAAAAAzCcv.', '.CCA........acv.', '.CCA........acv.', '.CCA........acv.', '.CCcA......accv.']), P(7, 1, ['Za', 'aa'])],
    right: [P(0, 5, ['.CCCCCCCCAAAAAa.', '.CCCCCCCA.......', '.CCCCCCCA.......', '.CCCCCCaA.......'])],
    up: [],
  }),
  hexer: {
    down: [P(0, -3, [
      '.........Kc.....',
      '........KCc.....',
      '.......KCCc.....',
      '......KCCCcv....',
      '....KCCCCCCcv...',
      '...KCCCCCCCCcv..',
      '..KCCCCCCCCCCcv.',
      '.KCCCCCCCCCCCcv.',
      '.CCCcvvvvvvcCcv.',
      '.CCvoooooooovcv.',
      '.CCvoooooooovcv.',
      '.CCvo1oooo1ovcv.',
      '.CCcvoooooovccv.',
      '.cCcv......vccv.',
      '.ccvv......vvcv.',
      '..vvv......vvv..'])],
    up: [P(0, -3, [
      '.........Kc.....',
      '........KCc.....',
      '.......KCCc.....',
      '......KCCCcv....',
      '....KCCCCCCcv...',
      '...KCCCCCCCCcv..',
      '..KCCCCCCCCCCcv.',
      '.KCCCCCCCCCCCcv.',
      '.CCCCCCCCCCCCcv.',
      '.CCCCCCCCCCCccv.',
      '.CCCCCCCCCCcccv.',
      '.cCCCCCCCCCccvv.',
      '.cCCCCCCCCcccvv.',
      '.ccCCCCCCcccvvv.',
      '.cccccccccccvvv.',
      '..vvvvvvvvvvvv..'])],
    right: [P(0, -3, [
      'Kc..............',
      '.KCc............',
      '..KCCc..........',
      '...KCCCc........',
      '...KCCCCCCc.....',
      '..KCCCCCCCCCc...',
      '.KCCCCCCCCCCCc..',
      '.CCCCCCCCCCCCcv.',
      '.CCCCCCCCcvvvvv.',
      '.CCCCCCCvooooo..',
      '.CCCCCCCvooooo..',
      '.CCCCCCcvooo1o..',
      '.cCCCCCcvooooo..',
      '.cCCCCccv.......',
      '.ccccccv........',
      '..vvvvv.........'])],
  },
  // ----- townsfolk -----
  cowlick: { down: [P(6, -1, ['.Y', 'YH'])], up: [P(6, -1, ['.Y', 'YH'])], right: [P(5, -1, ['.Y', 'YH'])] },
  turban: {
    down: [P(0, -1, [
      '......KCCc......',
      '....KCCCCCCc....',
      '...KCCCCCCCcc...',
      '..KCcvCCCCCCCc..',
      '..CCCCcvvCCCCv..',
      '.KCCCCCZ1zcvCcv.',
      '.CCcvCCCaCCCccv.',
      '.vcccvvcccccvvv.'])],
    up: [P(0, -1, [
      '......KCCc......',
      '....KCCCCCCc....',
      '...KCCCCCCCcc...',
      '..KCCCCCCCcvCc..',
      '..CCCCcvvCCCCv..',
      '.KCcvCCCCCCCCcv.',
      '.CCCCCCCccvCccv.',
      '.vcccvvcccccvvv.'])],
    right: [P(0, -1, [
      '.....KCCCc......',
      '...KCCCCCCCc....',
      '..KCCCCCCCCcc...',
      '.KCcvCCCCCCCCc..',
      '.CCCCcvvCCCCCc..',
      '.KCCCCCCcvCZ1z..',
      '.CCcvCCCCCCCacv.',
      '.vcccvvcccccvvv.'])],
  },
  bandana: {
    down: [P(0, 1, ['......KCCc......', '....KCCCCCCc....', '...KCCCCCCCCc...', '..KCCCCCCCCCCc..', '..CCCCCCCCCCCc..', '..vcccccccccvv..'])],
    up: [P(0, 1, ['......KCCc......', '....KCCCCCCc....', '...KCCCCCCCCc...', '..KCCCCCCCCCCc..', '..CCCCCCCCCCCc..', '..vccccKcccccv..', '......Ccv.......', '.....Cc.cv......'])],
    right: [P(0, 1, ['.....KCCCc......', '...KCCCCCCCc....', '..KCCCCCCCCCc...', '..KCCCCCCCCCCc..', '.KCCCCCCCCCCCc..', 'Kvcccccccccvv...', 'Cc..............', 'c...............'])],
  },
  kerchief: hood(1, {}),
  chaperon: { // guildmaster: tall rolled cap with gold badge
    down: [P(0, -2, [
      '.....KCCCCc.....',
      '....KCCCCCCc....',
      '...KCCCCCCCCc...',
      '...CCCCCCCCcv...',
      '..ZAAAAZAAAAaz..',
      '.KCCCCC1CCCCCcv.',
      '.CCCCCCCCCCCCcv.',
      '.vccccccccccccv.'])],
    up: [P(0, -2, [
      '.....KCCCCc.....',
      '....KCCCCCCc....',
      '...KCCCCCCCCc...',
      '...CCCCCCCCcv...',
      '..ZAAAAAAAAAaz..',
      '.KCCCCCCCCCCCcv.',
      '.CCCCCCCCCCCCcv.',
      '.vccccccccccccv.'])],
    right: [P(0, -2, [
      '....KCCCCc......',
      '...KCCCCCCc.....',
      '..KCCCCCCCCc....',
      '..CCCCCCCCCcv...',
      '.ZAAAAAAAAZAaz..',
      '.KCCCCCCCCCC1cv.',
      '.CCCCCCCCCCCCcv.',
      '.vccccccccccccv.'])],
  },
  fisherhat: { // floppy bucket hat
    down: [P(0, 0, [
      '................',
      '.....KCCCCc.....',
      '....KCCCCCCc....',
      '...KCCCCCCCCc...',
      '...CCCCCCCCcv...',
      '..AAZAAAAAAAaz..',
      'KCCCCCCCCCCCCCcv',
      '.vccccccccccccv.'])],
    up: [P(0, 0, [
      '................',
      '.....KCCCCc.....',
      '....KCCCCCCc....',
      '...KCCCCCCCCc...',
      '...CCCCCCCCcv...',
      '..AAAAAAAAAAaz..',
      'KCCCCCCCCCCCCCcv',
      '.vccccccccccccv.'])],
    right: [P(0, 0, [
      '................',
      '....KCCCCc......',
      '...KCCCCCCc.....',
      '..KCCCCCCCCc....',
      '..CCCCCCCCCcv...',
      '.AAAAAAAAAZAaz..',
      'KCCCCCCCCCCCCCcv',
      '.vccccccccccccv.'])],
  },
  bun: { // innkeeper: hair bun + red ribbon
    down: [P(5, -2, ['.YHHh.', 'YHHHhj', '.1hh1.'])],
    up: [P(5, -2, ['.YHHh.', 'YHHHhj', 'HHhhhj', '.1jj1.'])],
    right: [P(1, -1, ['.YHh..', 'YHHhj.', 'HHhhj1', '.jjj..'])],
  },
  beard: { // elder: bushy brows, moustache, long beard
    down: [P(0, 7, ['....FF....FF....', '................', '................', '....OFFffFFf....', '...OFFFFFFFFf...', '...FFFFFFFFFf...', '....FFFFFFfN....', '.....fFFFffN....', '......fFfN......', '.......fN.......'])],
    up: [],
    right: [P(8, 7, ['..FFF.', '......', '......', '.OFFFf', 'OFFFFf', 'FFFFfN', 'FFFfN.', '.ffN..', '..fN..'])],
  },
  moustache: {
    down: [P(0, 10, ['.....hHHHHh.....', '......h..h......'])],
    up: [],
    right: [P(11, 10, ['hHHh', '.h..'])],
  },
};

// ---------- props & overlays: per dir { z: 'back'|'mid'|'top', parts } ----------
// back = before everything (behind body), mid = over torso/arms (under head), top = after head
const pole = (head, shaft = 'R', len = 26) => { const rows = [...head]; while (rows.length < len) rows.push(rows.length % 2 ? `.${shaft}.` : `.${shaft}.`); return rows; };
const SPEAR = ['.L.', 'LMm', 'LMm', '.mn', '.A.', '.a.'];
const STAFF_ORB = ['.1.', '121', '.1.', 'ZAa', '.A.'];
const STAFF_CROSS = ['.Z.', 'ZAa', '.a.', '.R.'];
const STAFF_GNARL = ['GR.', 'RRr', '.Rr', '.r.'];
const ROD = ['.R.', '.R.', '.R.', '.R.'];
export const PROPS = {
  spear: {
    down: { z: 'mid', parts: [P(0, -5, pole(SPEAR, 'R', 27)), P(1, 16, ['S', 'x'])] },
    up: { z: 'mid', parts: [P(13, -5, pole(SPEAR, 'r', 27)), P(14, 16, ['x'])] },
    right: { z: 'back', parts: [P(2, -5, pole(SPEAR, 'r', 27))] },
  },
  staffOrb: {
    down: { z: 'mid', parts: [P(0, -4, pole(STAFF_ORB, 'R', 26)), P(1, 16, ['S', 'x'])] },
    up: { z: 'mid', parts: [P(13, -4, pole(STAFF_ORB, 'r', 26))] },
    right: { z: 'back', parts: [P(2, -4, pole(STAFF_ORB, 'r', 26))] },
  },
  staffCross: {
    down: { z: 'mid', parts: [P(0, -2, pole(STAFF_CROSS, 'R', 24)), P(1, 16, ['S', 'x'])] },
    up: { z: 'mid', parts: [P(13, -2, pole(STAFF_CROSS, 'r', 24))] },
    right: { z: 'back', parts: [P(2, -2, pole(STAFF_CROSS, 'r', 24))] },
  },
  staffGnarl: {
    down: { z: 'mid', parts: [P(0, 4, pole(STAFF_GNARL, 'R', 18)), P(1, 16, ['S', 'x'])] },
    up: { z: 'mid', parts: [P(13, 4, pole(STAFF_GNARL, 'r', 18))] },
    right: { z: 'top', parts: [P(11, 4, pole(STAFF_GNARL, 'R', 18)), P(11, 14, ['Ss', 'sx'])] },
  },
  rod: {
    down: { z: 'mid', parts: [P(0, -6, ['..R', '.R1', '.R1', '.R1', ...pole(ROD, 'R', 23)]), P(1, 16, ['S', 'x'])] },
    up: { z: 'mid', parts: [P(13, -6, ['R..', '1R.', '1R.', '1R.', ...pole(ROD, 'r', 23)])] },
    right: { z: 'back', parts: [P(2, -6, ['.R..', '..R1', '..R1', '..R1', ...pole(['..R', '..R', '.R.', '.R.'], 'r', 22).map((r) => r + '.')])] },
  },
  shield: { // on the left arm
    down: { z: 'mid', parts: [P(11, 12, ['LMMMn', 'MCKCn', 'MZAAn', 'MCacn', 'mCcvn', '.mcn.', '..n..'])] },
    up: { z: 'mid', parts: [P(0, 12, ['LMMMn', 'MRRrn', 'MRrrn', 'MRrrn', 'mrrgn', '.mrn.', '..n..'])] },
    right: { z: 'back', parts: [P(9, 12, ['LMMn', 'MCCn', 'MAan', 'MCcn', 'mcvn', '.mn.'])] },
  },
  cape: {
    down: { z: 'back', parts: [P(2, 12, ['CC........cv', 'CC........cv', 'Cc........cv', 'Cc........cv', 'Cc........cv', 'cc........vv', 'Kcc......cvv', 'Ccc......cvv', '.cv......vv.'])] },
    up: { z: 'mid', parts: [P(3, 11, ['.KCCCCCCcc.', 'KCCCCCCCCcv', 'KCCCCCCCCcv', 'CCCCCCCCccv', 'CCCCCCCcccv', 'CCCcCCCcccv', 'CCCcCCccccv', 'CCccCCcccvv', 'cCccCcccvvv', 'ccvccccvcvv'])] },
    right: { z: 'back', parts: [P(2, 11, ['...KCC', '..KCCC', '..CCCc', '.KCCCc', '.CCCcc', '.CCccv', 'KCCccv', 'CCccv.', 'Ccvv..', 'vv....'])] },
  },
  bow: {
    down: { z: 'back', parts: [P(12, 8, ['.R.', 'R..', 'R..']), P(1, 16, ['..g', '.r.', 'r..'])] },
    up: { z: 'mid', parts: [P(8, 9, ['1.2.', 'BbBb', 'Bbbd', 'Bbbd', 'Bbbd', 'bbdd', '.dd.']), P(3, 9, ['R..', 'Rr.', '.Rr', '.Rr', '.Rr', '.Rr', '.Rr', 'Rr.', 'R..']), P(4, 10, ['w', '.', '.', '.', '.', '.', 'w'])] },
    right: { z: 'back', parts: [P(1, 9, ['..Rr', '.Rr.', 'Rr..', 'Rr..', 'Rr..', 'Rr..', '.Rr.', '..Rr']), P(3, 8, ['12', 'Bb', 'Bb', 'bd'])] },
  },
  lute: {
    down: { z: 'back', parts: [P(12, 8, ['RG', 'Rr', '.r'])] },
    up: { z: 'mid', parts: [P(9, 7, ['.GR', '.Rr', '.Rr', '.Rr', '.Rr']), P(5, 12, ['.GRRr.', 'GRRRrr', 'RRgRrr', 'RRRrrg', 'rRrrrg', '.rrgg.'])] },
    right: { z: 'back', parts: [P(1, 12, ['.GRRr', 'GRRgr', 'RRRrr', 'rRrrg', '.rrg.']), P(4, 8, ['GR', 'Rr', '.R', '.r'])] },
  },
  axe: {
    down: { z: 'back', parts: [P(11, 6, ['.LM..', 'LMMn.', 'LMMmn', '.mnR.', '...R.'])] },
    up: { z: 'mid', parts: [P(3, 6, ['..ML.', '.nMML', 'nmMML', '.RnM.', 'R....']), P(4, 10, ['Rr......', '.Rr.....', '..Rr....', '...Rr...', '....Rr..', '.....Rr.', '......Rr'])] },
    right: { z: 'back', parts: [P(0, 6, ['..LM.', '.LMMn', 'LMMmn', '.mn..', '..Rr.', '...Rr', '....R'])] },
  },
  katana: {
    down: { z: 'mid', parts: [P(12, 13, ['.A', 'Rr', 'Rr', 'r.'])] },
    up: { z: 'back', parts: [P(1, 13, ['A.', 'rR', 'rR', '.r'])] },
    right: { z: 'mid', parts: [P(10, 14, ['...RA', '..Rr.']), P(1, 16, ['ggrr..', '.ggrr.'])] },
  },
  tome: {
    down: { z: 'top', parts: [P(11, 14, ['CCCKc', 'CZACc', 'CAaCc', 'CCCcv', '.vvv.']), P(12, 16, ['Ss'])] },
    up: { z: 'back', parts: [P(0, 14, ['vCCC', 'cCCC', 'cCCC', 'vvv.'])] },
    right: { z: 'back', parts: [P(10, 14, ['CCCc', 'CZAc', 'CCcv', 'vvv.'])] },
  },
  flask: {
    down: { z: 'mid', parts: [P(11, 15, ['.L.', '121', '232', '.3.'])] },
    up: { z: 'mid', parts: [P(3, 16, ['Bb', 'bd'])] },
    right: { z: 'mid', parts: [P(9, 15, ['.L.', '121', '232'])] },
  },
  hammer: {
    down: { z: 'top', parts: [P(0, 16, ['..r', '..r', 'LMMm', 'MMmn'])] },
    up: { z: 'mid', parts: [P(12, 16, ['r..', 'r..', 'LMMm', 'Mmmn'])] },
    right: { z: 'top', parts: [P(9, 16, ['..r', '..r', 'LMMm', 'Mmmn'])] },
  },
  pauldrons: {
    down: { z: 'mid', parts: [P(1, 11, ['.LM', 'LMm', 'Mmn']), P(12, 11, ['Mm.', 'mmn', 'mnn'])] },
    up: { z: 'mid', parts: [P(1, 11, ['.LM', 'LMm', 'Mmn']), P(12, 11, ['Mm.', 'mmn', 'mnn'])] },
    right: { z: 'top', parts: [P(6, 11, ['LMm', 'MMn', 'mn.'])] },
  },
  fur: { // shaggy shoulder mantle
    down: { z: 'mid', parts: [P(2, 11, ['.OFFFFFFFFf.', 'OFFfFFFfFFfN', 'FfN.fNfN.fNN'])] },
    up: { z: 'mid', parts: [P(2, 11, ['.OFFFFFFFFf.', 'OFFFFFFFFFfN', 'FfNfFfNfFfNN', '.N..N..N..N.'])] },
    right: { z: 'top', parts: [P(4, 11, ['.OFFFFf', 'OFFFFfN', 'FfNfNN.'])] },
  },
  apron: {
    down: { z: 'mid', parts: [P(5, 13, ['.wWW.', '.WWw.', 'WWWWw', 'WWWWw', 'WWWww', 'WWWww', 'WWwww', 'wwwwN'].map((r) => r.replace(/W/g, 'O').replace(/w/g, 'F')))] },
    up: { z: 'mid', parts: [P(4, 16, ['f..f.f', '.ff.f.'].map((r) => r.replace(/\./g, '.')))] },
    right: { z: 'mid', parts: [P(9, 13, ['.F', 'OF', 'OF', 'OF', 'OFF', 'OFf', 'OFf'])] },
  },
  sash: { // monk / samurai belt knot
    down: { z: 'mid', parts: [P(4, 16, ['AZAAAAaz']), P(9, 17, ['Aa', 'a.'])] },
    up: { z: 'mid', parts: [P(4, 16, ['AAAAAAaz'])] },
    right: { z: 'mid', parts: [P(5, 16, ['AAAAZaz']), P(3, 16, ['Aa', '.a'])] },
  },
  collar: { // cleric gold stole
    down: { z: 'mid', parts: [P(5, 11, ['AZ..Za', 'A....a', 'A....a', 'A....a', 'Z....z'])] },
    up: { z: 'mid', parts: [P(6, 13, ['.Z.', 'ZAa', '.a.', '.a.'])] },
    right: { z: 'mid', parts: [P(9, 11, ['Za', 'A.', 'A.', 'A.', 'z.'])] },
  },
  medal: {
    down: { z: 'mid', parts: [P(5, 11, ['ZA..Aa', '.ZAAa.', '..1z..'])] },
    up: { z: 'mid', parts: [] },
    right: { z: 'mid', parts: [P(8, 11, ['Za', 'Aa', '1z'])] },
  },
  vest: { // open vest over a shirt (arms stay shirt coloured via remap)
    down: { z: 'mid', parts: [P(4, 12, ['CC..cc', 'CC..cv', 'CK..cv', 'Cc..cv'])] },
    up: { z: 'mid', parts: [P(4, 12, ['KCCCcv', 'CCCCcv', 'CCCccv', 'CCcccv'])] },
    right: { z: 'mid', parts: [P(5, 12, ['KCCcc', 'CCCcv', 'CCccv', 'Cccv.'])] },
  },
  satchel: {
    down: { z: 'mid', parts: [P(4, 11, ['r.....', '.r....', '..r...', '...r..', '....r.']), P(10, 15, ['DBb', 'Bbd', 'bdd'])] },
    up: { z: 'mid', parts: [P(5, 11, ['.....r', '....r.', '...r..', '..r...', '.r....']), P(2, 15, ['DBb', 'Bbd', 'bdd'])] },
    right: { z: 'mid', parts: [P(7, 11, ['..r', '.r.', 'r..']), P(4, 15, ['DBb', 'Bbd', 'bdd'])] },
  },
  hem: { // gold (or glowing) trim along a robe hem
    down: { z: 'mid', parts: [P(3, 20, ['ZAAAAAAAAaz'])] },
    up: { z: 'mid', parts: [P(3, 20, ['AAAAAAAAAaz'])] },
    right: { z: 'mid', parts: [P(4, 20, ['ZAAAAAAaz'])] },
  },
  skull: {
    down: { z: 'mid', parts: [P(9, 16, ['ww', 'oo'])] },
    up: { z: 'mid', parts: [] },
    right: { z: 'mid', parts: [P(9, 16, ['w', 'o'])] },
  },
};

// ---------- recipes ----------
// head: HEADS key(s) · hair: HAIR key · body: 'tunic' | 'robe' · props: PROPS keys · ramps: material base colours
// remap: { arms|legs|torso: {from: to} } letter swaps per body region (bare arms, shorts...) · spec: '1'..'9' colours
const BARE = { W: 'S', T: 's', t: 'x', u: 'X' }, SHIRT = { W: 'Q', T: 'P', t: 'p', u: 'q' }, BAREL = { Q: 'S', P: 's', p: 'x', q: 'X' };
export const HEROES = {
  knight: { head: 'knight', ramps: { T: '#3a6ac0', M: '#aab4c8', C: '#d94a4a', P: '#7a8499', B: '#4a4a62', A: '#e8e8f0', R: '#7a5030' }, props: ['pauldrons', 'shield'], remap: { legs: { P: 'M', p: 'm', q: 'n', Q: 'L' } } },
  rogue: { head: 'rogue', ramps: { C: '#4e5e56', T: '#4a4a58', P: '#3a3440', B: '#5a3a2a', A: '#d0a040', F: '#8a3a44', H: '#3a2a20' }, props: ['cape', 'satchel'] },
  mage: { head: 'mage', hair: 'short', body: 'robe', h: 28, ramps: { C: '#7a4ac0', T: '#5a38b0', A: '#f4d35e', H: '#6a4a30', R: '#8a5a30', B: '#4a3050' }, props: ['hem', 'staffOrb'], hold: true, spec: { 1: '#ff9a4a', 2: '#fff2a0' } },
  cleric: { head: 'cleric', body: 'robe', h: 26, ramps: { C: '#eceaf4', T: '#eceaf4', A: '#f4d35e', H: '#c89a50', R: '#c8a050', B: '#8a7060' }, props: ['collar', 'hem', 'staffCross'], hold: true },
  monk: { head: 'monk', hair: 'short', ramps: { T: '#e88a30', A: '#d94a4a', H: '#6a4224', P: '#6a4a3a', B: '#3a2a2a', S: ['#ffd8b0', '#e8b890', '#c08060', '#8a5038'] }, props: ['sash'], remap: { arms: BARE } },
  ranger: { head: 'ranger', hair: 'short', ramps: { C: '#3a8a3a', T: '#3a8a3a', F: '#d94a4a', H: '#8a5a30', P: '#6a5038', B: '#5a3a24', A: '#8a5a30', R: '#a07040' }, props: ['bow'], spec: { 1: '#f2f2f2', 2: '#d94a4a' } },
  hexer: { head: 'hexer', body: 'robe', h: 27, ramps: { C: '#4a2a80', T: '#2e2440', A: '#6ef0a0', S: ['#ece0cc', '#d8c8b0', '#b0a090', '#807060'], B: '#2a2030' }, props: ['hem', 'skull', 'tome'], spec: { 1: '#7affb0' } },
  bard: { head: 'bard', hair: 'short', h: 27, ramps: { C: '#d94a4a', F: '#f4d35e', T: '#2aa0a0', H: '#e0b050', P: '#e8e0d0', B: '#6a3a2a', A: '#f4d35e', R: '#b07838' }, props: ['lute'], remap: { arms: SHIRT } },
  berserker: { head: 'berserker', hair: 'long', h: 26, ramps: { H: '#c03020', T: '#8a5a30', F: '#a88a6a', M: '#8a909c', P: '#5a4030', B: '#3a2a20', A: '#d94a4a', R: '#7a4a2a', S: ['#ffd8b0', '#e8b890', '#c08060', '#8a5038'] }, props: ['fur', 'axe'], remap: { arms: BARE }, spec: { 4: '#f4ead2', 5: '#cdb890', 6: '#8a7254' } },
  alchemist: { head: 'alchemist', hair: 'short', body: 'robe', ramps: { C: '#3aa86a', T: '#e8e0d0', A: '#c89a40', H: '#8a5a30', B: '#5a4030', M: '#8a7040' }, props: ['flask'], spec: { 1: '#7fd8f0', 2: '#e0f8ff', 3: '#3a8ab0' }, remap: { arms: { W: 'K', T: 'C', t: 'c', u: 'v' } } },
  samurai: { head: 'samurai', hair: 'short', ramps: { M: '#9a3038', H: '#24242e', T: '#c04040', F: '#f2f2f2', P: '#3a3a50', B: '#2a2a30', A: '#f2f2f2', R: '#3a2a40' }, props: ['pauldrons', 'sash', 'katana'] },
  paladin: { head: 'paladin', h: 26, ramps: { M: '#e8e8f0', T: '#f2f2f2', A: '#f4d35e', C: '#c03a40', F: '#ffffff', P: '#c8c8d8', B: '#8a7a5a', R: '#8a6a40' }, props: ['cape', 'pauldrons', 'shield'], remap: { legs: { P: 'M', p: 'm', q: 'n', Q: 'L' } } },
};
export const TOWNS = {
  innkeeper: { head: 'bun', hair: 'long', body: 'robe', ramps: { H: '#c06030', T: '#d94a4a', F: '#f8f4ec', A: '#e8e0d0', B: '#6a3a2a' }, props: ['apron'], spec: { 1: '#f2f2f2' }, remap: { arms: { W: 'O', T: 'F', t: 'f', u: 'N' } } },
  merchant: { head: ['turban', 'moustache'], hair: 'short', ramps: { C: '#2a8a8a', T: '#d0a040', H: '#5a3a20', F: '#f4f0e8', P: '#7a5a3a', B: '#5a3a24', A: '#a07828' }, props: ['apron'], spec: { 1: '#d94a4a' } },
  smith: { head: ['bandana', 'moustache'], hair: 'short', ramps: { C: '#c03a30', T: '#4a5468', H: '#3a2618', F: '#b07a48', P: '#4a3a30', B: '#2a2020', M: '#7a8090', R: '#6a4a2a', S: ['#f8d0a8', '#e0b088', '#b88060', '#7a4a30'] }, props: ['apron', 'hammer'], remap: { arms: BARE } },
  guildmaster: { head: ['chaperon', 'moustache'], hair: 'bald', body: 'robe', ramps: { C: '#6a2a8a', T: '#5a2a7a', A: '#f4d35e', H: '#9a9aa8', B: '#3a2a3a' }, props: ['medal', 'hem'], spec: { 1: '#7fd8f0' } },
  elder: { head: 'beard', hair: 'bald', body: 'robe', ramps: { H: '#e8e8f0', F: '#f4f4f8', T: '#6a4a8a', A: '#f4d35e', R: '#8a6a40', B: '#4a3050', S: ['#f8d8bc', '#e8bc98', '#c08868', '#8a5a44'] }, props: ['staffGnarl'], hold: true },
  villager: { hair: 'short', ramps: { H: '#8a5a30', T: '#6a8ac0', P: '#7a5a3a', B: '#5a3a24', A: '#8a5a30' } },
  villager2: { head: 'bandana', hair: 'long', body: 'robe', ramps: { C: '#b04a4a', H: '#7a4a26', T: '#c08a50', A: '#f2f2f2', B: '#6a4a30', F: '#f2ece0' }, remap: { arms: { W: 'O', T: 'F', t: 'f', u: 'N' } } },
  kid: { hair: 'short', head: 'cowlick', kid: true, ramps: { H: '#f4d35e', T: '#5ac08a', P: '#5a4a8a', B: '#6a3a2a', A: '#a07040' }, remap: { legs: BAREL } },
  guard: { head: 'guard', hair: 'short', h: 29, ramps: { M: '#9aa0b0', T: '#3a5aa0', H: '#6a4a2a', P: '#4a4a5a', B: '#3a2e2a', A: '#f4d35e', R: '#8a5a30', C: '#3a5aa0' }, props: ['pauldrons', 'spear'], hold: true },
  sereth: { head: 'chaperon', hair: 'long', body: 'robe', ramps: { C: '#6a6a7a', T: '#5a5a6a', A: '#9ae0ff', H: '#c8c8d4', B: '#2a2a34', F: '#d8d8e0' }, props: ['hem'], spec: { 1: '#7fd8f0' } }, // the grey apprentice (story scenes)
  barnaby: { head: 'moustache', hair: 'bald', ramps: { C: '#a04a2a', H: '#b0582a', T: '#8a5a3a', F: '#f8f4ec', P: '#5a4030', B: '#4a3020', A: '#e8e0d0' }, props: ['apron'], spec: { 1: '#f2f2f2' } }, // Brenna's dad, landlord of the Gilded Goose
  fisher: { head: 'fisherhat', hair: 'short', h: 30, ramps: { C: '#4a8ae0', H: '#2a2a30', T: '#e8e8f0', P: '#4a5a7a', B: '#4a3a2a', A: '#2a5aa0', R: '#9a7040' }, props: ['vest', 'rod'], hold: true, spec: { 1: '#d0d8e0' } },
};

// =====================================================================================================
// ---------- Bearded Bros: modern outfits, per-person "looks" and the pub folk ----------
// A look ('job@look') keeps the calling's outfit and swaps the face: hair (when the calling shows hair), skin, beard.
// Under helmets/hoods only the beard or moustache shows (they are drawn after the headgear).
Object.assign(HAIR, {
  messy: { // Devon: shaggy ginger mop with tufts
    down: P(0, -1, [
      '.....Y...H......',
      '...Y.YH.YHh.h...',
      '....YYHHHHHhh...',
      '...HYYHHHHHHHh..',
      '..HYHHHHHHHHHHh.',
      '.HYHHYYYHHHHHhh.',
      '.hHHHhHHHhHHhhh.',
      'hHHhHHhHHhHHHhhj',
      '.HHhhHhHHhHhHhj.',
      '.HHh..h.h..hhhj.',
      '.hHh.........hj.',
      '.hj..........jj.',
      '..j..........j..']),
    up: P(0, -1, [
      '.....Y...H......',
      '...Y.YH.YHh.h...',
      '....YYHHHHHhh...',
      '...HYYHHHHHHHh..',
      '..HYHHHHHHHHHHh.',
      '.HYHHYYYHHHHHhh.',
      '.hHHHHHHHHHHHhh.',
      'hHHHHHHHHHHHHHhj',
      '.HHHHhHHHHhHHhh.',
      '.HHHhhHHHhhHhhj.',
      'hhHhhjhHhjhhhjjj',
      '.jhjjhjjhjjhjjj.',
      '..jj.jjjjjj.jj..']),
    right: P(0, -1, [
      '....Y...H.......',
      '..Y.YH.YHh.h....',
      '...YYHHHHHhh....',
      '..HYYHHHHHHHh...',
      '.HYHHHHHHHHHHh..',
      '.HYHHYYYHHHHHhh.',
      'hHHHHHHHHHHHHhh.',
      'hHHHHHHHHHHhHHhh',
      '.HHHHHHHhHHhHh..',
      '.hHHHHh..h......',
      '.hHHHh..........',
      '.jhHhj..........',
      '..jhj...........',
      '...j............']),
  },
  crop: { // close crop / stubble ring on a shaved head (pub landlord)
    down: P(0, 0, [
      '................',
      '......SSss......',
      '....SSSSSSss....',
      '...SSwSSSSSsx...',
      '..SSwSSSSSSSsx..',
      '.hSSSSSSSSSSsxj.',
      '.hhsSSSSSSSSxhj.',
      '.hh..........hj.',
      '.hj..........jj.']),
    up: P(0, 0, [
      '................',
      '......SSss......',
      '....SSSSSSss....',
      '...SSwSSSSSsx...',
      '..SSwSSSSSSSsx..',
      '.hSSSSSSSSSSsxj.',
      '.hhsSSSSSSSsxhj.',
      '.hhhhssssssxhhj.',
      '.hhhhhhhhhhhhjj.',
      '..jjjjjjjjjjjj..']),
    right: P(0, 0, [
      '................',
      '.....SSSss......',
      '...SSSSSSSsx....',
      '..SSwSSSSSSSx...',
      '.SSwSSSSSSSSSx..',
      '.hSSSSSSSSSSSs..',
      '.hhSSSSSSSSSSs..',
      '.hhhhhs.........',
      '.jhhj...........']),
  },
});
Object.assign(HEADS, {
  beanie: { // ribbed knit beanie (Devon, 2026)
    down: [P(0, -1, ['________________', '______KCCc______', '____KCCCCCCc____', '...KCCCCCCCCc...', '..KCCCCCCCCCCc..', '..CCCCCCCCCCCcv.', '.KCKCKCKCKCKCcv.', '.cvcvcvcvcvcvvv.'])],
    up: [P(0, -1, ['________________', '______KCCc______', '____KCCCCCCc____', '...KCCCCCCCCc...', '..KCCCCCCCCCCc..', '..CCCCCCCCCCCcv.', '.KCKCKCKCKCKCcv.', '.cvcvcvcvcvcvvv.'])],
    right: [P(0, -1, ['________________', '_____KCCCc______', '___KCCCCCCCc____', '..KCCCCCCCCCc...', '.KCCCCCCCCCCCc..', '.CCCCCCCCCCCCcv.', '.KCKCKCKCKCKCcv.', '.cvcvcvcvcvcvvv.'])],
  },
  beardAdam: { // full, neat dark beard: sideburns, moustache, 2 rows below the mouth
    down: [P(0, 8, ['...4........4...', '...hH......Hh...', '...hHYYHHYYHh...', '....hHHooHHh....', '.....hHHHHh.....', '......hhjj......'])],
    up: [],
    right: [P(0, 8, ['........4.......', '........hH......', '.......hHHHYYH..', '.......hHHHHoHh.', '........hHHHHh..', '.........hhjj...'])],
  },
  beardDevon: { // huge bushy beard, almost to the belt
    down: [P(0, 7, ['..h..........h..', '..hH........Hh..', '..HHh......hHh..', '..HHHYYHHYYHHh..', '..YHHHHooHHHHh..', '...HHHHHHHHHh...', '...YHHHHHHHHh...', '...hHHHHHHHhh...', '....hHHHHHhj....', '.....jhHhhj.....'])],
    up: [P(0, 9, ['.h............h.', '.hh..........hh.', '..h..........h..'])],
    right: [P(0, 7, ['........h.......', '.......hH.......', '.......hHH......', '......hHHHHYYYH.', '......hHHHHHHoHh', '......hHHHHHHHHh', '.......hHHYHHHh.', '.......hHHHHHh..', '........hHHHhj..', '.........jhj....'])],
  },
  walrus: { // enormous white walrus moustache + mutton chops
    down: [P(0, 7, ['..H..........H..', '..HH........HH..', '..HHh......hHH..', '..HHYYYHHYYYHH..', '..hHHHHhhHHHHh..', '...hHh....hHh...'])],
    up: [P(0, 8, ['.H............H.', '.HH..........HH.'])],
    right: [P(0, 7, ['........H.......', '.......HH.......', '.......HHh......', '.......hHHYYYYH.', '........hHhHHHHh', '...........hHh..'])],
  },
  brows: { down: [P(0, 7, ['....HH....HH....'])], up: [], right: [P(0, 7, ['..........HHH...'])] },
  fringe: { // a lock of hair peeking out of a hood
    down: [P(0, 6, ['....HYHHHHhh....', '....Hh....hh....'])],
    up: [],
    right: [P(0, 6, ['.........HYHh...', '.........Hh.....'])],
  },
  temples: { down: [P(0, 6, ['..4..........4..', '..4..........4..'])], up: [P(0, 6, ['.4............4.'])], right: [P(0, 6, ['..4.............', '..4.............'])] }, // Adam: first grey at the temples
  freckles: { down: [P(0, 9, ['....x......x....'])], up: [], right: [P(0, 9, ['..........x.....'])] },
});
Object.assign(PROPS, {
  opentee: { // open flannel over a dark tee
    down: { z: 'mid', parts: [P(7, 12, ['22', '22', '22', '22'])] },
    up: { z: 'mid', parts: [] },
    right: { z: 'mid', parts: [P(10, 12, ['2', '2', '2'])] },
  },
  hoodie: { // bunched hood at the neck, drawstrings, kangaroo pocket, tiny chest logo
    down: { z: 'mid', parts: [P(4, 11, ['.tTTTTu.']), P(6, 12, ['1..1', '1..1']), P(5, 15, ['.tttu.']), P(9, 13, ['3'])] },
    up: { z: 'mid', parts: [P(5, 11, ['.TTTt.', 'TWTTtu', 'tTTttu', '.uttu.'])] },
    right: { z: 'mid', parts: [P(5, 11, ['TTt', 'Ttu', '.u.']), P(11, 12, ['1', '1']), P(9, 15, ['tttu'])] },
  },
  polo: { // polo collar + placket
    down: { z: 'mid', parts: [P(5, 11, ['22..22', '.2..2.']), P(7, 12, ['.2', '.2'])] },
    up: { z: 'mid', parts: [P(5, 11, ['222222'])] },
    right: { z: 'mid', parts: [P(8, 11, ['222', '..2'])] },
  },
  towel: { // bar towel slung over the shoulder
    down: { z: 'mid', parts: [P(11, 11, ['OF', 'FF', '1f', 'FF', 'Ff', '1N'])] },
    up: { z: 'mid', parts: [P(3, 11, ['OF', 'FF', '1f', 'FF', 'fN'])] },
    right: { z: 'top', parts: [P(7, 11, ['OFf', 'F1N', 'Ff.', '1N.'])] },
  },
  tabard: { // faded surcoat down the front of the plate
    down: { z: 'mid', parts: [P(6, 12, ['KCCc', 'CCCc', 'CCcv', '....', 'CCcv', 'Ccvv'])] },
    up: { z: 'mid', parts: [P(6, 12, ['CCCc', 'CCcc', 'Cccv', '....', 'Cccv', 'ccvv'])] },
    right: { z: 'mid', parts: [P(9, 12, ['KC', 'Cc', 'Cc', '..', 'Cv', 'cv'])] },
  },
  dents: { // rust and dents on old plate
    down: { z: 'top', parts: [P(5, 13, ['3...']), P(9, 15, ['.3']), P(3, 6, ['3'])] },
    up: { z: 'top', parts: [P(6, 14, ['3..3'])] },
    right: { z: 'top', parts: [P(8, 14, ['3']), P(4, 4, ['3'])] },
  },
});
// arm / leg remaps can be functions of the sprite row: short sleeves, cargo shorts
const TEE = (ch, y) => (y >= 14 && BARE[ch]) || ch, SHORTS = (ch, y) => (y >= 20 && BAREL[ch]) || ch;
const DEVON_SKIN = ['#ffe6cc', '#f6c49c', '#d8946c', '#a46446'];
HEROES.bloke = { hair: 'short', ramps: { T: '#8a8e98', P: '#3e5a92', B: '#e6e6ee', A: '#3a3036', H: '#6a4428' }, remap: { arms: TEE } }; // jobless 2026 bloke: grey tee, jeans, trainers
// full replacements of the bloke recipe for one person (their own 2026 clothes)
export const OUTFITS = {
  'bloke@adam': { hair: 'short', ramps: { T: '#b8323a', P: '#3e5a92', B: '#ecebf2', A: '#2a2228' }, props: ['opentee'], plaid: true, spec: { 1: '#2a1418', 2: '#2c2a34' } },
  'bloke@devon': { hair: 'messy', head: 'beanie', ramps: { T: '#2c3c72', C: '#8e9098', P: '#b8a274', B: '#c8ccd6', A: '#8a7650' }, props: ['hoodie'], remap: { legs: SHORTS }, spec: { 1: '#e8e8f0', 3: '#f4d35e' } },
};
// per-person looks: hair = HAIR key used where the calling shows hair; face = head parts always added (beards show under helmets);
// open = parts added only when the calling wears nothing on the head; hood = parts added under a hood
export const LOOKS = {
  adam: { hair: 'short', face: ['beardAdam'], open: ['temples'], hood: ['fringe'], spec: { 4: '#b4aca8' }, ramps: { H: '#5a3a22', S: ['#ffe2c4', '#f3bf92', '#d08d64', '#9a5c40'] } },
  devon: { hair: 'messy', face: ['beardDevon'], open: ['freckles'], hood: ['fringe'], ramps: { H: '#d0702c', S: DEVON_SKIN } },
  brenna: { hair: 'long', open: ['bun'], hood: ['fringe'], ramps: { H: '#a8462a', S: ['#ffe4cc', '#f4c39c', '#d4906a', '#9e5e44'] }, spec: { 1: '#2e7a5a' } },
  wendell: { hair: 'bald', face: ['walrus'], open: ['brows'], ramps: { H: '#e4e4ec', S: ['#ffdcc0', '#f0b48e', '#cc8460', '#965638'] } },
};
Object.assign(TOWNS, {
  brenna: { head: 'bun', hair: 'long', body: 'robe', ramps: { H: '#a8462a', T: '#3a5a4a', F: '#f8f4ec', A: '#6a3a2a', B: '#4a2a22', S: LOOKS.brenna.ramps.S }, props: ['apron'], spec: { 1: '#2e7a5a' }, remap: { arms: { W: 'O', T: 'F', t: 'f', u: 'N' } } },
  wendell: { hair: 'bald', head: ['brows', 'walrus'], ramps: { M: '#8e96a4', C: '#8e3a2c', A: '#6a4428', P: '#7a6a5c', B: '#3e3430', R: '#6a4a2a', H: '#f0f0f6', S: ['#ffd4b4', '#e8a882', '#c07a58', '#8a4e36'] }, props: ['tabard', 'pauldrons', 'dents'], remap: { torso: { W: 'L', T: 'M', t: 'm', u: 'n' }, arms: { W: 'L', T: 'M', t: 'm', u: 'n' }, legs: { P: 'M', p: 'm', q: 'n', Q: 'L' } }, spec: { 3: '#a04a22' } }, // old Sir Wendell: bald, walrus moustache, rust-spotted grey plate
  barkeep: { hair: 'crop', ramps: { H: '#8a6a58', T: '#2e5a4a', P: '#3a3a48', B: '#2a2228', A: '#2a2a30', F: '#f2f2f6', S: ['#ffdcc0', '#f0b890', '#cc8864', '#96583c'] }, props: ['polo', 'towel'], remap: { arms: TEE }, spec: { 1: '#4a7ae0', 2: '#e8e8e0' } },
});

// =====================================================================================================
// ---------- THE SILLY PASS: twelve silly callings (job ids unchanged; only the clothes changed) ----------
// knight = Bouncer · rogue = Chancer · mage = Spreadsheet Sorcerer · cleric = Barmaid · monk = Gym Bro · ranger = Darts Player
// hexer = Influencer · bard = Busker · berserker = Stag Do Lad · alchemist = Home Brewer · samurai = Angry Chef · paladin = Traffic Warden
// Special colours used here (cfg.spec): 1-3 and 5-7 per class; 4 / 8 / 9 are reserved for the looks (grey beard, ribbon...).
const CUFFROW = [15, 16, 14]; // sleeve end row of the three arm-swing variants
// wrist details that follow the swinging arms: lL / lR = the one-row letters of the left / right cuff, (rows = [dy offsets])
const armBand = (lL, lR, up2) => ({
  down: (c) => { const a = CUFFROW[c.hold ? 0 : c.sw], b = CUFFROW[c.sw2]; return { z: 'mid', parts: [P(2, a, [lL]), P(12, b, [lR]), ...(up2 ? [P(2, a - 2, [up2[0]]), P(12, b - 2, [up2[1]])] : [])] }; },
  up: (c) => { const a = CUFFROW[c.sw2], b = CUFFROW[c.hold ? 0 : c.sw]; return { z: 'mid', parts: [P(2, a, [lL]), P(12, b, [lR]), ...(up2 ? [P(2, a - 2, [up2[0]]), P(12, b - 2, [up2[1]])] : [])] }; },
  right: (c) => { const v = c.hold ? 0 : c.sw; return { z: 'mid', parts: [P([7, 9, 5][v], [15, 14, 14][v], [lL])] }; },
});
const SKIRT = (ch, y) => (y >= 17 && SHIRT[ch]) || ch; // white blouse above, coloured skirt below (robe bodies)

Object.assign(HAIR, {
  buzz: { // clippers, number two
    down: P(0, 1, ['................', '.....hHHHHh.....', '....hHHYHHHh....', '...hHHhHHhHHh...', '...hh......hh...', '...j........j...']),
    up: P(0, 1, ['................', '.....hHHHHh.....', '....hHHYHHHh....', '...hHHhHHhHHh...', '...hHHHHHHHHh...', '...hHhHHHhHHh...', '...hHHHHHHHHh...', '...hHhHHHHhHh...', '....hjhHHhjh....', '......hjjh......']),
    right: P(0, 1, ['................', '.....hHHHh......', '....hHHHHHHh....', '...hHHHhHHHHh...', '...hHHHHHHh.....', '...hHHHHHh......', '...hHHHHh.......', '....hjhj........']),
  },
  quiff: { // swept-up pompadour, shaved sides
    down: P(0, -2, ['.......YHHh.....', '.....YHHHHHHh...', '...YHHYYHHHHHh..', '...HHHHYYHHHHh..', '...HHHhHHHHHhh..', '...HHhHHHHhHh...', '...hHHhHHhHHh...', '...hh......hh...', '...h........h...']),
    up: P(0, -2, ['.....YHHHh......', '....YHHHHHHh....', '...YHHHHHHHHh...', '...HHHYYHHHHh...', '...HHHHHHHHHh...', '...HHhHHHhHHh...', '...hHHHHHHHHh...', '...hHhHHHHhHh...', '...hHHHHHHHHh...', '....hHhHHhHh....', '....hjhhhhjh....', '......hjjh......']),
    right: P(0, -2, ['.........YHHHh..', '.....YHHHHHHHHh.', '....YHHYYHHHHHh.', '...YHHHHYYHHHHh.', '...HHHHHHHHHHh..', '..hHHHHHHHHHh...', '..hHHHHHHHHh....', '..hHHHHHHHh.....', '..hHHHHHHh......', '..hHHHHh........', '..hjhhj.........']),
  },
});
Object.assign(HEADS, {
  shades: { // wraparound sunglasses (the Bouncer)
    down: [P(0, 8, ['..oooooooooooo..', '....o5o..o5o....'])],
    up: [P(0, 8, ['..oo........oo..'])],
    right: [P(0, 8, ['......oooooooo..', '..........o5oo..'])],
  },
  bigshades: { // oversized influencer sunglasses
    down: [P(0, 7, ['...oooo..oooo...', '..oooooooooooo..', '...o5oo..o5oo...', '....ooo..ooo....'])],
    up: [P(0, 8, ['..oo........oo..'])],
    right: [P(0, 7, ['.........oooo...', '......oooooooo..', '.........o5oo...', '.........ooo....'])],
  },
  glasses: { // nerdy square specs (the Spreadsheet Sorcerer)
    down: [P(0, 8, ['....o.oooo.o....', '....o.o..o.o....', '....ooo..ooo....'])],
    up: [P(0, 8, ['..oo........oo..'])],
    right: [P(0, 8, ['......ooooo.o...', '..........o.o...', '..........ooo...'])],
  },
  earpiece: { // curly-cord earpiece
    down: [P(0, 9, ['.............F..', '............2...', '...........2....', '...........2....'])],
    up: [P(0, 9, ['.............F..', '............2...', '...........2....', '...........2....'])],
    right: [P(0, 9, ['......F.........', '......2.........', '.......2........', '.......2........'])],
  },
  flatcap: { // tweed flat cap, peak down over the eyes
    down: [P(0, 0, ['................', '.....KCCCCc.....', '...KCCCCCCCCc...', '..KCCCCCCCCCCc..', '..CCCCCCCCCCCcv.', '..cccccccccccv..', '...vvvvvvvvvv...'])],
    up: [P(0, 0, ['................', '.....KCCCCc.....', '...KCCCCCCCCc...', '..KCCCCCCCCCCc..', '..CCCCCCCCCCCcv.', '..cccccccccccv..', '...vvvvvvvvvv...'])],
    right: [P(0, 0, ['................', '....KCCCCc......', '..KCCCCCCCCc....', '.KCCCCCCCCCCc...', '.CCCCCCCCCCCcv..', '.cccccccccccvvv.', '...........vvvv.'])],
  },
  wizoffice: { // wizard hat with a Post-it stuck to it
    down: [P(0, -5, ['.......KCc......', '......KCCc......', '......CCCcv.....', '.....KCCCcv.....', '.....CCCCCcv....', '....KCCCCCCcv...', '....CCCCCCCCcv..', '...KCCCCCCCCcv..', '...CCCCCCCCCCcv.', '..AAAAZAAAAAAaz.', '..KCCCCCCCCCCv..', '.KCCCCCCCCCCCcv.', '.vccccccccccccv.']), P(6, -1, ['32', '33'])],
    up: [P(0, -5, ['.......KCc......', '......KCCc......', '......CCCcv.....', '.....KCCCcv.....', '.....CCCCCcv....', '....KCCCCCCcv...', '....CCCCCCCCcv..', '...KCCCCCCCCcv..', '...CCCCCCCCCCcv.', '..AAAAAAAAAAAaz.', '..KCCCCCCCCCCv..', '.KCCCCCCCCCCCcv.', '.vccccccccccccv.'])],
    right: [P(0, -5, ['..KCc...........', '..CCc...........', '...KCc..........', '...KCCc.........', '....CCCc........', '....KCCCCc......', '....CCCCCCc.....', '...KCCCCCCCc....', '...CCCCCCCCCc...', '..AAAAZAAAAAaz..', '.KCCCCCCCCCCCCv.', 'KCCCCCCCCCCCCCcv', '.vcccccccccccvv.']), P(5, -1, ['32', '33'])],
  },
  sweat: { // terry-cloth sweatband
    down: [P(0, 6, ['...AAAAAAAAAA...'])],
    up: [P(0, 6, ['...AAAAAAAAAA...'])],
    right: [P(0, 6, ['...AAAAAAAAAAA..'])],
  },
  cone: { // a traffic cone, worn
    down: [P(0, -7, ['.......ZA.......', '......ZAAa......', '......wwww......', '.....wwwwww.....', '.....ZAAAAa.....', '....ZAAAAAAa....', '....ZAAAAAAa....', '...aaaaaaaaaa...', '..zzzzzzzzzzzz..'])],
    up: [P(0, -7, ['.......ZA.......', '......ZAAa......', '......wwww......', '.....wwwwww.....', '.....ZAAAAa.....', '....ZAAAAAAa....', '....ZAAAAAAa....', '...aaaaaaaaaa...', '..zzzzzzzzzzzz..'])],
    right: [P(0, -7, ['......ZA........', '.....ZAAa.......', '.....wwww.......', '....wwwwww......', '....ZAAAAa......', '...ZAAAAAAa.....', '...ZAAAAAAa.....', '..aaaaaaaaaa....', '.zzzzzzzzzzzz...'])],
  },
  bobble: { // bobble hat with a hop flower pinned on
    down: [P(0, -3, ['......OFFf......', '......FFFf......', '.....KCCCCc.....', '....KCCCCCCc....', '...KCCCCCCCCc...', '..KCCCCCCCCCCc..', '..CCCCCCCCCCCcv.', '.KCKCKCKCKCKCcv.', '.cvcvcvcvcvcvvv.']), P(11, 1, ['.1', '11', '1.'])],
    up: [P(0, -3, ['......OFFf......', '......FFFf......', '.....KCCCCc.....', '....KCCCCCCc....', '...KCCCCCCCCc...', '..KCCCCCCCCCCc..', '..CCCCCCCCCCCcv.', '.KCKCKCKCKCKCcv.', '.cvcvcvcvcvcvvv.'])],
    right: [P(0, -3, ['.....OFFf.......', '.....FFFf.......', '....KCCCCc......', '...KCCCCCCCc....', '..KCCCCCCCCCc...', '.KCCCCCCCCCCCc..', '.CCCCCCCCCCCCcv.', '.KCKCKCKCKCKCcv.', '.cvcvcvcvcvcvvv.']), P(10, 1, ['.1', '11', '1.'])],
  },
  goggles: { // brewing goggles pushed up onto the forehead
    down: [P(0, 6, ['...m33m..m33m...', '...mmmm..mmmm...'])],
    up: [P(0, 6, ['..mmmmmmmmmmmm..'])],
    right: [P(0, 6, ['.........m33m...', '.........mmmm...'])],
  },
  toque: { // the tall pleated chef's hat
    down: [P(0, -6, ['.....OFFFFO.....', '...OFFFFFFFFf...', '..OFFFFFfFFFFf..', '..FFFfFFFFfFFf..', '..FFFFFFFFFFFf..', '...fFFFfFFFFf...', '....FFfFFfFF....', '....FfFFFfFf....', '....ffffffff....'])],
    up: [P(0, -6, ['.....OFFFFO.....', '...OFFFFFFFFf...', '..OFFFFFfFFFFf..', '..FFFfFFFFfFFf..', '..FFFFFFFFFFFf..', '...fFFFfFFFFf...', '....FFfFFfFF....', '....FfFFFfFf....', '....ffffffff....'])],
    right: [P(0, -6, ['....OFFFFO......', '..OFFFFFFFFf....', '.OFFFFFfFFFFf...', '.FFFfFFFFfFFf...', '.FFFFFFFFFFFf...', '..fFFFfFFFFf....', '...FFfFFfFF.....', '...FfFFFfFf.....', '...ffffffff.....'])],
  },
  angry: { // furrowed brows, flushed cheeks
    down: [P(0, 6, ['....o......o....', '.....oo..oo.....', '................', '...1........1...'])],
    up: [],
    right: [P(0, 6, ['.........o......', '..........oo....', '................', '...........1....'])],
  },
  peaked: { // peaked cap with a chequered band
    down: [P(0, 0, ['................', '....KCCCCCCc....', '..KCCCCCCCCCCc..', '..CCCCCCCCCCCcv.', '..FoFoFoFoFoFo..', '..vvvvvvvvvvvv..', '...vvvvvvvvvv...'])],
    up: [P(0, 0, ['................', '....KCCCCCCc....', '..KCCCCCCCCCCc..', '..CCCCCCCCCCCcv.', '..FoFoFoFoFoFo..', '..vvvvvvvvvvvv..'])],
    right: [P(0, 0, ['................', '....KCCCCCCc....', '..KCCCCCCCCCCc..', '..CCCCCCCCCCCcvv', '..FoFoFoFoFoFvv.', '..vvvvvvvvvvvvvv', '............vvvv'])],
  },
});

// ---------- props: weapons, accessories and clothing details (letters as in walkerart.js) ----------
const stripe = (n) => Array(n).fill('F');
Object.assign(PROPS, {
  bomber: { // black bomber jacket: white collar, zip, ribbed cuffs
    down: (c) => { const a = CUFFROW[c.hold ? 0 : c.sw], b = CUFFROW[c.sw2]; return { z: 'mid', parts: [P(6, 12, ['FFFF']), P(7, 13, ['FF']), P(7, 14, ['L', 'L', 'L']), P(2, a, ['aA']), P(12, b, ['Aa'])] }; },
    up: (c) => { const a = CUFFROW[c.sw2], b = CUFFROW[c.hold ? 0 : c.sw]; return { z: 'mid', parts: [P(2, a, ['aA']), P(12, b, ['Aa'])] }; },
    right: { z: 'mid', parts: [P(8, 12, ['FF']), P(9, 13, ['F'])] },
  },
  bat: { // a rounders bat, barrel up (Bats & Clubs)
    down: { z: 'mid', parts: [P(0, 1, ['.R.', 'GRr', 'GRr', 'GRr', 'GRr', 'GRr', '.Rr', '.R.', '.R.', '.R.', '.R.', '.R.', '.R.', '.R.', '.R.']), P(1, 16, ['S', 'x']), P(0, 18, ['.r.'])] },
    up: { z: 'mid', parts: [P(13, 1, ['.R.', 'rRG', 'rRG', 'rRG', 'rRG', 'rRG', 'rR.', '.R.', '.R.', '.R.', '.R.', '.R.', '.R.', '.R.', '.R.']), P(14, 16, ['x']), P(13, 18, ['.r.'])] },
    right: { z: 'back', parts: [P(0, 1, ['.R.', 'GRr', 'GRr', 'GRr', 'GRr', 'GRr']), P(1, 7, ['Rr']), P(1, 8, ['R', 'R']), P(2, 10, ['R', 'R']), P(3, 12, ['R', 'R', 'R']), P(3, 15, ['r'])] },
  },
  clipboard: { // guest list
    down: { z: 'mid', parts: [P(12, 13, ['.MM.', 'RRRR', 'RFgr', 'RFFr', 'RgFr', 'RFFr', 'rrrr'])] },
    up: { z: 'mid', parts: [P(0, 13, ['.MM.', 'RRRR', 'RRRr', 'RRRr', 'RRRr', 'RRRr', 'rrrr'])] },
    right: { z: 'back', parts: [] },
  },
  shell: { // shell-suit: white collar band and side stripes
    down: { z: 'mid', parts: [P(5, 12, ['FFFFFF']), P(4, 12, ['F', 'F', 'F', 'F', 'F']), P(11, 12, ['F', 'F', 'F', 'F', 'F'])] },
    up: { z: 'mid', parts: [P(5, 12, ['FFFFFF']), P(4, 12, ['F', 'F', 'F', 'F', 'F']), P(11, 12, ['F', 'F', 'F', 'F', 'F'])] },
    right: { z: 'mid', parts: [P(8, 12, ['FFF']), P(11, 12, ['F', 'F', 'F', 'F', 'F'])] },
  },
  chain: { // gold chain
    down: { z: 'mid', parts: [P(6, 12, ['A..A']), P(7, 13, ['ZZ'])] },
    up: { z: 'mid', parts: [] },
    right: { z: 'mid', parts: [P(10, 12, ['A', 'Z'])] },
  },
  watches: armBand('ZA', 'AZ', ['Lm', 'mL']), // a gold and a silver watch up each forearm
  selfie: { // selfie stick (the Sorcerer's "staff")
    down: { z: 'mid', parts: [P(0, -5, ['ooo', 'o5o', 'o5o', 'ooo']), ...[0].map(() => P(1, -1, ['M', ...Array(21).fill('M')])), P(1, 16, ['S', 'x'])] },
    up: { z: 'mid', parts: [P(13, -5, ['ooo', 'o5o', 'o5o', 'ooo']), P(14, -1, ['m', ...Array(21).fill('m')])] },
    right: { z: 'back', parts: [P(1, -5, ['ooo', 'o5o', 'o5o', 'ooo']), P(2, -1, ['m', ...Array(21).fill('m')])] },
  },
  office: { // lanyard with an ID badge, shirt collar and a red tie poking out of the robe
    down: { z: 'mid', parts: [P(6, 12, ['F..F']), P(7, 12, ['11']), P(7, 13, ['11']), P(5, 12, ['2']), P(6, 13, ['2']), P(7, 14, ['2']), P(10, 12, ['2']), P(9, 13, ['2']), P(8, 14, ['2']), P(7, 15, ['ww']), P(7, 16, ['wo'])] },
    up: { z: 'mid', parts: [] },
    right: { z: 'mid', parts: [P(9, 12, ['F', '1']), P(10, 13, ['2', '2']), P(10, 15, ['w', 'o'])] },
  },
  apronB: { // the Barmaid's black bar apron
    down: { z: 'mid', parts: [P(5, 12, ['c....c']), P(6, 13, ['KCCc', 'CCCc', 'CCCc']), P(5, 16, ['CCCCCc', 'CCCCCc', 'CCCCCc', 'CCccCc', 'CCCCCc', 'CCCCCc', 'cccccc'])] },
    up: { z: 'mid', parts: [P(5, 16, ['c....c']), P(4, 17, ['AcccccA'])] },
    right: { z: 'mid', parts: [P(9, 13, ['KC', 'CC', 'CC', 'CC', 'CC', 'CCc', 'CCc', 'CCc', 'ccc'])] },
  },
  pint: { // a pint, held (foam on top)
    down: { z: 'top', parts: [P(12, 14, ['www', 'ZAz', 'AAz', 'AAz']), P(11, 17, ['S'])] },
    up: { z: 'mid', parts: [] },
    right: { z: 'top', parts: [P(11, 14, ['www', 'ZAz', 'AAz', 'AAz']), P(10, 17, ['S'])] },
  },
  towelB: { // blue-striped tea towel over the shoulder
    down: { z: 'mid', parts: [P(11, 11, ['OF', 'FF', '1f', 'FF', 'Ff', '1N'])] },
    up: { z: 'mid', parts: [P(3, 11, ['OF', 'FF', '1f', 'FF', 'fN'])] },
    right: { z: 'top', parts: [P(7, 11, ['OFf', 'F1N', 'Ff.', '1N.'])] },
  },
  tank: { // big arms
    down: { z: 'mid', parts: [P(1, 12, ['S', 's', 's']), P(14, 12, ['S', 's', 's']), P(1, 15, ['x']), P(14, 15, ['x'])] },
    up: { z: 'mid', parts: [P(1, 12, ['S', 's', 's']), P(14, 12, ['S', 's', 's'])] },
    right: { z: 'mid', parts: [P(6, 12, ['S', 's', 's'])] },
  },
  shaker: { // protein shaker
    down: { z: 'mid', parts: [P(0, 13, ['111', 'w2w', 'w2w', 'w2w', 'www']), P(1, 17, ['x'])] },
    up: { z: 'mid', parts: [P(13, 13, ['111', 'www', 'www', 'www', 'www'])] },
    right: { z: 'back', parts: [P(2, 13, ['111', 'w2w', 'w2w', 'www'])] },
  },
  jersey: { // loud sponsor shirt: polo collar and a yellow logo band
    down: { z: 'mid', parts: [P(6, 12, ['FFFF']), P(7, 13, ['FF']), P(4, 14, ['11111111', '1o1oo1o1'])] },
    up: { z: 'mid', parts: [P(4, 14, ['11111111', '1o1oo1o1'])] },
    right: { z: 'mid', parts: [P(8, 12, ['FF']), P(5, 14, ['1111111', '1o1oo1o'])] },
  },
  belly: { // the belly hanging over the belt
    down: { z: 'mid', parts: [P(3, 14, ['WTTTTTTTTu', 'TTTTTTTTTt', 'TTTTTTTTtu', 'tTTTTTTtuu'])] },
    up: { z: 'mid', parts: [P(3, 14, ['WTTTTTTTTu', 'TTTTTTTTTt', 'TTTTTTTTtu', 'tTTTTTTtuu'])] },
    right: { z: 'mid', parts: [P(10, 14, ['Tt', 'TTt', 'TTu', 'tuu'])] },
  },
  chainD: { // gold chain, bigger (it is a darts shirt)
    down: { z: 'mid', parts: [P(6, 12, ['A..A']), P(6, 13, ['AZZA'])] },
    up: { z: 'mid', parts: [] },
    right: { z: 'mid', parts: [P(10, 12, ['A', 'Z'])] },
  },
  dart: { // a dart, held up ready
    down: { z: 'mid', parts: [P(14, 12, ['L', 'M', '1', '1']), P(13, 16, ['S'])] },
    up: { z: 'mid', parts: [P(1, 12, ['L', 'M', '1', '1'])] },
    right: { z: 'top', parts: [P(13, 12, ['L', 'M', '1', '1']), P(12, 15, ['S'])] },
  },
  puffer: { // bulky quilted puffer jacket
    down: { z: 'mid', parts: [P(3, 11, ['.WTTTTTTt.', 'WTTTTTTTTt', 'tttttttttt', 'WTTTTTTTTt', 'tttttttttt', 'WTTTTTTTTt', 'tttttttttu']), P(1, 12, ['WT', 'TT', 'tt', 'TT', 'tt', 'ts']), P(13, 12, ['TW', 'tT', 'tt', 'tT', 'tt']), P(1, 17, ['Ss'])] },
    up: { z: 'mid', parts: [P(3, 11, ['.WTTTTTTt.', 'WTTTTTTTTt', 'tttttttttt', 'WTTTTTTTTt', 'tttttttttt', 'WTTTTTTTTt', 'tttttttttu']), P(1, 12, ['WT', 'TT', 'tt', 'TT', 'tt', 'Ss']), P(13, 12, ['TW', 'TT', 'tt', 'TT', 'tt', 'sS'])] },
    right: { z: 'mid', parts: [P(5, 11, ['.WTTTTTt.', 'WTTTTTTTt', 'ttttttttt', 'WTTTTTTTt', 'ttttttttt', 'WTTTTTTTt', 'tttttttuu']), P(6, 12, ['WTT', 'TTT', 'ttt', 'TTT', 'ttt', 'ts'])] },
  },
  phoneup: { // selfie arm: the right sleeve goes up, the phone goes ahead of it
    down: { z: 'mid', parts: [P(13, 3, ['ooo', 'o1o', 'o1o', 'ooo']), P(14, 7, ['S']), P(13, 8, ['WT', 'Tt', 'tt', 'WT', 'Tt'])] },
    up: { z: 'mid', parts: [P(13, 3, ['ooo', 'ooo', 'ooo', 'ooo']), P(14, 7, ['S']), P(13, 8, ['WT', 'Tt', 'tt', 'WT', 'Tt'])] },
    right: { z: 'top', parts: [P(12, 3, ['ooo', 'o1o', 'o1o', 'ooo']), P(13, 7, ['S']), P(12, 8, ['WT', 'Tt', 'tt', 'WT', 'Tt'])] },
  },
  guitar: { // acoustic guitar slung across the belly, neck out to the side
    down: { z: 'mid', parts: [P(7, 14, ['GRRr', 'RRRr']), P(6, 16, ['.GRRRr', 'GRRRRRr', 'GRoRRRr', 'GRoRRRr', '.rRRRr.']), P(11, 14, ['r']), P(12, 13, ['R']), P(13, 12, ['R']), P(14, 11, ['R']), P(15, 9, ['g', 'g']), P(5, 12, ['B', 'B', 'B', 'B'])] },
    up: { z: 'mid', parts: [P(7, 14, ['GRRr', 'RRRr']), P(6, 16, ['.GRRRr', 'GRRRRRr', 'GRRRRRr', 'GRRRRRr', '.rRRRr.']), P(5, 12, ['B', 'B', 'B', 'B'])] },
    right: { z: 'mid', parts: [P(8, 15, ['GRRr', 'RRor', 'RRRr', 'rRRr']), P(12, 14, ['Rr']), P(13, 13, ['R']), P(14, 12, ['g'])] },
  },
  scarf: { // knitted scarf
    down: { z: 'mid', parts: [P(4, 12, ['OFOFOFOF']), P(9, 13, ['Ff', 'Ff', 'fN', 'fN'])] },
    up: { z: 'mid', parts: [P(4, 12, ['OFOFOFOF']), P(9, 13, ['Ff', 'fN'])] },
    right: { z: 'mid', parts: [P(7, 12, ['OFOFO']), P(6, 13, ['Ff', 'fN', 'fN'])] },
  },
  stagtee: { // the matching STAG t-shirt (white band, suggestive lettering)
    down: { z: 'mid', parts: [P(4, 14, ['FFFFFFFF', 'FoFooFoF', 'FFFFFFFF'])] },
    up: { z: 'mid', parts: [P(4, 14, ['FFFFFFFF', 'FoooFooF', 'FFFFFFFF'])] },
    right: { z: 'mid', parts: [P(5, 14, ['FFFFFFF', 'FoFooFo', 'FFFFFFF'])] },
  },
  can: { // a can of lager
    down: { z: 'top', parts: [P(12, 15, ['Lm', 'ZZ', 'mL']), P(11, 17, ['S'])] },
    up: { z: 'mid', parts: [] },
    right: { z: 'top', parts: [P(11, 15, ['Lm', 'ZZ', 'mL']), P(10, 17, ['S'])] },
  },
  apronH: { // the Home Brewer's leather apron
    down: { z: 'mid', parts: [P(5, 12, ['b....b']), P(6, 13, ['DBBb', 'BBBb', 'BBBb']), P(5, 16, ['BBBBBb', 'BBBBBb', 'BBbbBb', 'BBBBBb', 'BBBBBb'])] },
    up: { z: 'mid', parts: [P(5, 16, ['b....b'])] },
    right: { z: 'mid', parts: [P(9, 13, ['DB', 'BB', 'BB', 'BB', 'BB', 'BBb', 'BBb'])] },
  },
  demijohn: { // a demijohn of something that is definitely fermenting
    down: { z: 'mid', parts: [P(0, 11, ['..m..', '.wLw.', 'wZAAw', 'wAAAw', 'wAAaw', 'wAaaw', '.www.']), P(1, 17, ['S', 'x'])] },
    up: { z: 'mid', parts: [P(11, 11, ['..m..', '.wLw.', 'wZAAw', 'wAAAw', 'wAAaw', 'wAaaw', '.www.'])] },
    right: { z: 'back', parts: [P(1, 11, ['..m..', '.wLw.', 'wZAAw', 'wAAAw', 'wAAaw', 'wAaaw', '.www.'])] },
  },
  chefjacket: { // double-breasted whites with a red neckerchief
    down: { z: 'mid', parts: [P(6, 12, ['KKKK']), P(6, 13, ['m..m', 'm..m', 'm..m', 'm..m'])] },
    up: { z: 'mid', parts: [P(6, 12, ['KKKK'])] },
    right: { z: 'mid', parts: [P(8, 12, ['KK']), P(10, 13, ['m', 'm', 'm'])] },
  },
  towel2: { // blue-striped kitchen towel over the shoulder
    down: { z: 'mid', parts: [P(11, 11, ['OF', 'FF', '2f', 'FF', 'Ff', '2N'])] },
    up: { z: 'mid', parts: [P(3, 11, ['OF', 'FF', '2f', 'FF', 'fN'])] },
    right: { z: 'top', parts: [P(7, 11, ['OFf', 'F2N', 'Ff.', '2N.'])] },
  },
  cleaver: { // a meat cleaver, held aloft
    down: { z: 'mid', parts: [P(0, 8, ['LLLL', 'LMMm', 'LoMm', 'LMMm', 'MMmn', 'mnnn']), P(1, 14, ['DB', 'DB', 'dB']), P(1, 16, ['S', 'x'])] },
    up: { z: 'mid', parts: [P(12, 8, ['LLLL', 'LMMm', 'LMMm', 'LMMm', 'MMmn', 'mnnn']), P(13, 14, ['DB', 'DB', 'dB'])] },
    right: { z: 'back', parts: [P(1, 8, ['LLLL', 'LMMm', 'LoMm', 'LMMm', 'MMmn', 'mnnn']), P(2, 14, ['DB', 'DB', 'dB'])] },
  },
  hivis: { // hi-vis jacket: reflective bands
    down: (c) => { const a = CUFFROW[c.hold ? 0 : c.sw], b = CUFFROW[c.sw2]; return { z: 'mid', parts: [P(4, 14, ['LLLLLLLL']), P(5, 12, ['L', 'L']), P(10, 12, ['L', 'L']), P(2, a, ['LL']), P(12, b, ['LL'])] }; },
    up: (c) => { const a = CUFFROW[c.sw2], b = CUFFROW[c.hold ? 0 : c.sw]; return { z: 'mid', parts: [P(4, 14, ['LLLLLLLL']), P(5, 12, ['L', 'L']), P(10, 12, ['L', 'L']), P(2, a, ['LL']), P(12, b, ['LL'])] }; },
    right: { z: 'mid', parts: [P(5, 14, ['LLLLLLL']), P(9, 12, ['L', 'L'])] },
  },
  lollipop: { // the STOP lollipop sign (red disc, white bar), held out to the side
    down: { z: 'mid', parts: [P(12, -5, ['.11.', '1ww1', '1ww1', '.11.']), P(14, -1, ['F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F']), P(13, 16, ['x'])] },
    up: { z: 'mid', parts: [P(0, -5, ['.11.', '1111', '1111', '.11.']), P(1, -1, ['F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F'])] },
    right: { z: 'back', parts: [P(1, -5, ['.11.', '1ww1', '1ww1', '.11.']), P(2, -1, ['F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F'])] },
  },
  ticketbox: { // handheld ticket machine on the belt
    down: { z: 'mid', parts: [P(4, 15, ['oF', 'oo'])] },
    up: { z: 'mid', parts: [P(10, 15, ['Fo', 'oo'])] },
    right: { z: 'mid', parts: [P(10, 15, ['oF', 'oo'])] },
  },
});

Object.assign(HEROES, {
  knight: { // BOUNCER: bomber, shades, earpiece, clipboard, bat
    head: ['shades', 'earpiece'], hair: 'buzz', openOk: false, hood: false, hairBy: { short: 'buzz', messy: 'buzz' },
    ramps: { T: '#34343e', P: '#2a2a32', B: '#1a1a20', A: '#6a6a78', F: '#f4f4f8', R: '#b07a3e', M: '#c8ccd6', H: '#3a2a20' },
    props: ['bat', 'clipboard', 'bomber'], spec: { 5: '#7a98c8', 2: '#e0d8c8' },
  },
  rogue: { // CHANCER: teal shell suit, flat cap, gold chain, a lot of watches
    head: ['flatcap'], hair: 'short', openOk: false, hood: false,
    ramps: { T: '#22b2a4', P: '#7c3cb8', B: '#f2f2f6', A: '#f0c840', C: '#8a7a64', F: '#f6f6fa', M: '#cfd4de', H: '#4a3220' },
    remap: { torso: { A: 'T', Z: 'W', a: 't', z: 'u' } }, props: ['shell', 'chain', 'watches'],
  },
  mage: { // SPREADSHEET SORCERER: green wizard robe, specs, lanyard, a Post-it on the hat
    head: ['wizoffice', 'glasses'], hair: 'short', body: 'robe', h: 29, hold: true, openOk: false, hood: false,
    ramps: { C: '#1f7c4c', T: '#2c9c5e', A: '#e6e8f0', H: '#5a4630', M: '#8a90a0', B: '#2a2a32', F: '#f4f4f8' },
    props: ['selfie', 'office'], spec: { 1: '#e04a4a', 2: '#2a9ad8', 3: '#fff070', 5: '#8ad8ff' },
  },
  cleric: { // BARMAID: wine skirt, white blouse, apron, tea towel, a pint
    head: ['bun'], hair: 'long', body: 'robe', hold: true, openOk: false, hood: false,
    look: { adam: { head: [], openOk: true }, devon: { head: [], openOk: true }, wendell: { head: [], openOk: true } },
    ramps: { T: '#f6f2f6', P: '#8c2c3e', F: '#f6f1e6', A: '#f0a424', B: '#2a2028', H: '#a8462a' },
    remap: { torso: SKIRT }, props: ['apronB', 'towelB', 'pint'], spec: { 1: '#3a6ac0' },
  },
  monk: { // GYM BRO: tank top, sweatband, shorts, big arms, protein shaker
    head: ['sweat'], hair: 'short', openOk: true, hood: false,
    ramps: { T: '#2a8cf2', P: '#1e1e28', B: '#f2f2f6', A: '#f6f6fa', H: '#4a3020' },
    remap: { arms: BARE, legs: SHORTS }, props: ['tank', 'shaker'], spec: { 1: '#e84a3a', 2: '#e8e060' },
  },
  ranger: { // DARTS PLAYER: loud sponsor shirt, belly, gold chain, a dart between the fingers
    head: [], hair: 'short', openOk: true, hood: false,
    ramps: { T: '#d6322e', P: '#2c2c3a', B: '#1c1c22', A: '#f0c840', F: '#f6f6fa', M: '#c8ccd6', H: '#5a4630' },
    remap: { arms: TEE }, props: ['jersey', 'belly', 'chainD', 'dart', 'wristband'], spec: { 1: '#f6d838' },
  },
  hexer: { // INFLUENCER: lavender puffer, quiff, huge shades, selfie
    head: ['bigshades'], hair: 'quiff', h: 27, hold: true, openOk: false, hood: false, hairBy: { short: 'quiff', messy: 'quiff' },
    ramps: { T: '#b6a0f2', P: '#2a2a34', B: '#f6f6fa', H: '#4a3020' },
    remap: { arms: { W: 'W', T: 'T', t: 't', u: 'u' } }, props: ['puffer', 'phoneup'], spec: { 1: '#8aeaff', 5: '#8a7ab8' },
  },
  bard: { // BUSKER: beanie, scarf, olive jacket, acoustic guitar
    head: ['beanie'], hair: 'short', openOk: false, hood: false,
    ramps: { T: '#6c7c3c', P: '#3c4c70', B: '#5a3a24', C: '#e2a82e', F: '#d8483e', R: '#b8702e', H: '#4a3020' },
    props: ['guitar', 'scarf'],
  },
  berserker: { // STAG DO LAD: matching hot-pink STAG tee, traffic cone, lager
    head: ['cone'], hair: 'short', h: 32, openOk: false, hood: false,
    ramps: { T: '#ff4fa6', P: '#2c3c6c', B: '#f2f2f6', A: '#ff8c1e', F: '#f8f8fa', M: '#d0d4de', H: '#5a4630' },
    remap: { arms: TEE, legs: SHORTS }, props: ['stagtee', 'can'],
  },
  alchemist: { // HOME BREWER: bobble hat with hops, goggles up, leather apron, demijohn
    head: ['bobble', 'goggles'], hair: 'short', h: 27, openOk: false, hood: false,
    ramps: { T: '#e8c44c', P: '#4c4a3a', B: '#7c4c28', C: '#c45e2a', F: '#f6f2ea', M: '#d0a842', A: '#f0a420', H: '#5a4630' },
    props: ['apronH', 'demijohn'], spec: { 1: '#6cc44c', 3: '#8adcf2' },
  },
  samurai: { // ANGRY CHEF: whites, toque, red face, towel, cleaver
    head: ['toque', 'angry'], hair: 'short', h: 30, openOk: false, hood: false,
    ramps: { T: '#f4f4f8', P: '#464654', B: '#2a2a32', F: '#f8f8fa', K: '#d83a2a', M: '#cfd4de', D: '#6a4428', H: '#4a3020' },
    props: ['chefjacket', 'towel2', 'cleaver'], spec: { 1: '#ea4a36', 2: '#3a6cc8' },
  },
  paladin: { // TRAFFIC WARDEN: hi-vis jacket, peaked cap, STOP lollipop, ticket machine
    head: ['peaked'], hair: 'short', hold: true, openOk: false, hood: false,
    ramps: { T: '#eee83a', P: '#2a3052', B: '#1a1a22', A: '#2a2a34', C: '#242c4a', F: '#f6f6fa', M: '#e4e8f0', H: '#4a3020' },
    props: ['lollipop', 'hivis', 'ticketbox'], spec: { 1: '#d42a2a' }, h: 29,
  },
});
PROPS.wristband = armBand('FF', 'FF'); // darts player's sweat wristbands
