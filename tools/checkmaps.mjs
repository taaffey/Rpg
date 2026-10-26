// Validates every map: rows rectangular, spawn walkable, every portal / NPC / chest / boss reachable,
// portal targets land on walkable tiles, and the overworld gate really gates the north.
import { MAPS, WALK } from '../src/maps.js';
import { GEN } from '../src/mapgen.js';
let bad = 0; const fail = (m) => { bad++; console.log('FAIL', m); };
function reach(id, from, gateOpen, sub) {
  const m = MAPS[id], H = m.rows.length, W = m.rows[0].length;
  const blocked = new Set([...(m.decor || []).map((d) => `${d[0]},${d[1]}`), ...(m.npcs || []).map((n) => `${n.x},${n.y}`)]);
  const ok = (x, y) => {
    const c = m.rows[y]?.[x]; if (c === undefined || blocked.has(`${x},${y}`)) return false;
    if (c === 'B') return gateOpen; return WALK.has(c);
  };
  const seen = new Set([`${from.x},${from.y}`]), q = [[from.x, from.y]];
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = `${nx},${ny}`; if (!seen.has(k) && ok(nx, ny)) { seen.add(k); if (!(m.portals?.[k])) q.push([nx, ny]); } } }
  if (id === 'world' && !sub) for (const d of ['dock_h', 'dock_e', 'dock_p']) for (const k of reach(id, { x: GEN.adj[d][0], y: GEN.adj[d][1] }, gateOpen, true)) seen.add(k); // the far island is reached by ferry, so it is its own walkable component
  return seen;
}
for (const [id, m] of Object.entries(MAPS)) {
  const w = m.rows[0].length;
  if (!m.rows.every((r) => r.length === w)) fail(`${id}: ragged rows`);
  const seen = reach(id, m.spawn, true);
  if (!WALK.has(m.rows[m.spawn.y][m.spawn.x])) fail(`${id}: spawn not walkable`);
  const adj = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${x + dx},${y + dy}`));
  for (const k of Object.keys(m.portals || {})) { if (!seen.has(k)) fail(`${id}: portal ${k} unreachable`); const t = m.portals[k], tm = MAPS[t.to]; if (!tm) { fail(`${id}: portal ${k} -> missing map ${t.to}`); continue; } const c = tm.rows[t.y]?.[t.x]; if (c === undefined || !(WALK.has(c) || c === 'B')) fail(`${id}: portal ${k} lands on '${c}' in ${t.to}`); }
  for (const n of m.npcs || []) if (!adj(n.x, n.y)) fail(`${id}: npc ${n.name} at ${n.x},${n.y} unreachable`);
  m.rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'C') { if (!adj(x, y)) fail(`${id}: chest ${x},${y} unreachable`); if (!m.chests?.[`${x},${y}`]) fail(`${id}: chest ${x},${y} has no loot`); } if (c === 'X' && !(m.boss && m.boss.x === x && m.boss.y === y)) fail(`${id}: boss tile mismatch`); }));
  if (m.boss && !seen.has(`${m.boss.x},${m.boss.y}`)) fail(`${id}: boss unreachable`);
  for (const k of Object.keys(m.secrets || {})) { const [x, y] = k.split(',').map(Number); if (!WALK.has(m.rows[y]?.[x]) || !seen.has(k)) fail(`${id}: hidden treasure ${k} not on a reachable walkable tile`); if (m.portals?.[k] || m.chests?.[k]) fail(`${id}: hidden treasure ${k} overlaps a portal/chest`); }
  for (const k of Object.keys(m.chests || {})) { const [x, y] = k.split(',').map(Number); if (m.rows[y][x] !== 'C') fail(`${id}: loot for non-chest ${k}`); }
}
// gate: without the flag only the south is reachable; with it, the whole world is
const w0 = reach('world', MAPS.world.spawn, false), w1 = reach('world', MAPS.world.spawn, true);
const place = (n) => MAPS.world.places.find((p) => p[2] === n);
for (const n of ['Frostholm', 'Frost Spire', 'Storm Cavern']) if (w0.has(`${place(n)[0]},${place(n)[1]}`)) fail(`gate leaks to ${n}`);
for (const p of MAPS.world.places) if (!w1.has(`${p[0]},${p[1]}`)) fail(`${p[2]} unreachable even with gate open`);
for (const n of ['Haven Town', 'Ashen Cavern', 'Sunken Crypt', 'Mirewood', 'Sunscar Ruins']) if (!w0.has(`${place(n)[0]},${place(n)[1]}`)) fail(`${n} should be reachable before the gate`);
console.log(bad ? `${bad} problem(s)` : `all ${Object.keys(MAPS).length} maps valid; gate verified`);
process.exit(bad ? 1 : 0);
