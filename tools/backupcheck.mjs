// Backup code round trip (pure, no browser): node tools/backupcheck.mjs
import { packSlots, unpackSlots } from '../src/backup.js';
let fails = 0; const ok = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) fails++; };
const save = (n) => JSON.stringify({ v: 3, savedAt: 1, G: { party: [{ name: 'Adam', level: n }], flags: { seen: { world: 'x'.repeat(20000) } }, slot: n } });
const slots = { 1: save(5), 3: save(9) };
const code = await packSlots(slots);
ok('code has a tag', /^BB[01]:/.test(code), code.slice(0, 12));
ok('gzip makes it small', code.length < 3000, code.length + ' chars');
const back = await unpackSlots(code);
ok('round trip slot 1', back[1] === slots[1]); ok('round trip slot 3', back[3] === slots[3]); ok('no slot 2', !back[2]);
ok('whitespace and line breaks are tolerated', Object.keys(await unpackSlots(code.replace(/(.{40})/g, '$1\n  '))).length === 2);
for (const [name, bad] of [['empty', ''], ['junk', 'hello'], ['cut short', code.slice(0, 40)], ['wrong app', 'BB0:' + Buffer.from(JSON.stringify({ app: 'x', slots: {} })).toString('base64')], ['no saves', 'BB0:' + Buffer.from(JSON.stringify({ app: 'bearded-bros', slots: {} })).toString('base64')], ['damaged slot', 'BB0:' + Buffer.from(JSON.stringify({ app: 'bearded-bros', slots: { 1: '{"G":{"party":[]}}' } })).toString('base64')]]) {
  let msg = ''; try { await unpackSlots(bad); } catch (e) { msg = e.message; } ok('rejects ' + name, !!msg, msg);
}
ok('empty input packs to nothing', (await packSlots({})) === '');
process.exit(fails ? 1 : 0);
