// Run the whole suite: node tools/all.mjs [quick]   (needs: python3 -m http.server 8123 for the browser tests)
// `quick` skips the slow ones (fuzz, music analysis, progression sim). Exit code 1 if anything fails.
import { spawn } from 'child_process';
const quick = process.argv.includes('quick');
const TOOLS = [
  ['checkids', 60], ['checkmaps', 60], ['checksprites', 60], ['backupcheck', 60], ['roadsidecheck', 120], ['bosstest', 60], ['skillsim', 120, ['150']],
  ['regress', 600], ['regress-mobile', 600], ['touch', 600], ['devices', 300], ['ngplus', 120], ['backuptest', 120], ['featstest', 120], ['bossui', 120], ['loadworld', 120], ['perf', 240], ['caches', 120], ['options', 150], ['rules', 120], ['report', 120],
  ...(quick ? [] : [['musiccheck', 600], ['progress', 600], ['fuzz', 900, ['4', '1500']]]),
];
const results = [];
for (const [name, secs, args = []] of TOOLS) {
  const t0 = Date.now();
  const code = await new Promise((resolve) => {
    const p = spawn('node', [`tools/${name}.mjs`, ...args], { stdio: ['ignore', 'pipe', 'pipe'] }); let out = '';
    p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
    const timer = setTimeout(() => { p.kill('SIGKILL'); resolve(124); }, secs * 1000);
    p.on('close', (c) => { clearTimeout(timer); const bad = out.split('\n').filter((l) => /^FAIL|PAGEERR|^✗/.test(l)).slice(0, 6); if (c !== 0 && bad.length) console.log(bad.join('\n')); resolve(c === null ? 1 : c); });
  });
  results.push([name, code, ((Date.now() - t0) / 1000).toFixed(0)]);
  console.log(`${code === 0 ? 'ok  ' : 'FAIL'} ${name.padEnd(16)} ${((Date.now() - t0) / 1000).toFixed(0)}s${code === 124 ? ' (timed out)' : ''}`);
}
const failed = results.filter(([, c]) => c !== 0);
console.log(failed.length ? `\n${failed.length} failed: ${failed.map((r) => r[0]).join(', ')}` : '\nAll green.');
process.exit(failed.length ? 1 : 0);
