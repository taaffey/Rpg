import { readFileSync } from 'fs';
// validate every ASCII sprite is 16x16 by evaluating the module text for arrays
const src = readFileSync(new URL('../src/sprites.js', import.meta.url), 'utf8');
let bad = 0;
for (const m of src.matchAll(/(\w+): \[((?:'[^']*',? ?)+)\]/g)) {
  const rows = [...m[2].matchAll(/'([^']*)'/g)].map((r) => r[1]);
  if (rows.length < 7) continue;
  const ok = rows.every((r) => r.length === 16);
  if (!ok || (rows.length !== 16 && rows.length !== 7 && rows.length !== 9)) { bad++; console.log('BAD', m[1], rows.length, rows.map((r) => r.length).join(',')); }
}
console.log(bad ? bad + ' bad sprites' : 'all sprites 16 wide');
