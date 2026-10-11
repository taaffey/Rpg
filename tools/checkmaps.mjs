import { MAPS } from '../src/data.js';
const reach = (rows, sx, sy) => { const seen = new Set([sx + ',' + sy]), q = [[sx, sy]]; while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x+dx, ny = y+dy, t = rows[ny]?.[nx]; if (t === undefined || '#~MT'.includes(t) || seen.has(nx+','+ny)) continue; seen.add(nx+','+ny); if (!'CXSIGHD'.includes(t)) q.push([nx, ny]); } } return seen; };
for (const [name, [sx, sy]] of [['world', [7, 4]], ['dungeon', [2, 1]], ['town', [6, 6]]]) {
  const rows = MAPS[name].rows, seen = reach(rows, sx, sy), miss = [];
  rows.forEach((r, y) => [...r].forEach((t, x) => { if ('CXDHSIGE'.includes(t) && !seen.has(x+','+y)) miss.push(`${t}@${x},${y}`); }));
  console.log(name, miss.length ? 'UNREACHABLE ' + miss : 'all points of interest reachable');
}
