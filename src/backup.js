// Save backups: one pasteable text code for all save slots. (Safari can clear a site's storage after a week unused, and a code also
// moves a save between phone and iPad.) Pure: no DOM, no localStorage; options.js reads and writes the slots.
const APP = 'bearded-bros', TAG_RAW = 'BB0:', TAG_ZIP = 'BB1:';

const toB64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const run = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

// slots: { 1: '<raw save json>', 3: '...' }  ->  'BB1:H4sI...' (gzip when the browser can, plain otherwise)
export async function packSlots(slots) {
  const ids = Object.keys(slots).filter((k) => slots[k]);
  if (!ids.length) return '';
  const bytes = new TextEncoder().encode(JSON.stringify({ app: APP, v: 1, slots: Object.fromEntries(ids.map((k) => [k, slots[k]])) }));
  if (typeof CompressionStream === 'function') { try { return TAG_ZIP + toB64(await run(bytes, new CompressionStream('gzip'))); } catch { /* fall through to plain */ } }
  return TAG_RAW + toB64(bytes);
}

// 'BB1:...' -> { 1: '<raw save json>', ... }; throws an Error with a player-readable message when the text is not a good backup
export async function unpackSlots(code, validIds = [1, 2, 3]) {
  const text = String(code || '').replace(/\s+/g, '');
  const tag = text.slice(0, 4), body = text.slice(4);
  if (tag !== TAG_RAW && tag !== TAG_ZIP) throw new Error('That does not look like a backup code. It should start with BB1:');
  let data;
  try {
    let bytes = fromB64(body);
    if (tag === TAG_ZIP) bytes = await run(bytes, new DecompressionStream('gzip'));
    data = JSON.parse(new TextDecoder().decode(bytes));
  } catch { throw new Error('The code is damaged or cut short. Copy the whole thing again.'); }
  if (data?.app !== APP || typeof data.slots !== 'object' || !data.slots) throw new Error('That backup is not from Bearded Bros.');
  const out = {};
  for (const id of validIds) {
    const raw = data.slots[id]; if (!raw) continue;
    let save; try { save = JSON.parse(raw); } catch { throw new Error(`Slot ${id} in that backup is damaged.`); }
    if (!Array.isArray(save?.G?.party) || !save.G.party.length || !save.G.flags) throw new Error(`Slot ${id} in that backup is damaged.`);
    out[id] = raw;
  }
  if (!Object.keys(out).length) throw new Error('That backup has no saves in it.');
  return out;
}
