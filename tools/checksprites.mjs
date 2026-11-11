import { readFileSync } from 'fs';
// validate every ASCII sprite is 16x16 by evaluating the module text for arrays
const src = readFileSync(new URL('../src/sprites.js', import.meta.url), 'utf8');
let bad = 0;
for (const m of src.matchAll(/(\w+): \[((?:'[^']*',? ?)+)\]/g)) {
  const rows = [...m[2].matchAll(/'([^']*)'/g)].map((r) => r[1]);
  if (rows.length < 7 || rows[0].length < 16) continue;
  const ok = rows.every((r) => r.length === rows[0].length);
  if (!ok || (rows[0].length !== 16 || ![16, 7, 9, 32].includes(rows.length))) { bad++; console.log('BAD', m[1], rows.length, rows.map((r) => r.length).join(',')); }
}
console.log(bad ? bad + ' bad sprites' : 'all sprites 16 wide');
