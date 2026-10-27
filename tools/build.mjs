// Bundles the game into ONE self-contained page for hosting or publishing.
//   ESBUILD=/path/to/esbuild node tools/build.mjs     (falls back to `npx esbuild`)
// Outputs:
//   dist/index.html      full standalone document (iPhone home-screen ready: manifest, icons, safe areas, offline service worker)
//   dist/assets/*, sw.js icons + manifest + service worker (host dist/ as a folder to get install + offline)
//   dist/artifact.html   the same page as a fragment for hosts that supply the document shell (no extra files needed)
import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'fs';
import { createHash } from 'crypto';
const root = new URL('../', import.meta.url).pathname;
mkdirSync(root + 'dist', { recursive: true });
const es = process.env.ESBUILD;
const args = ['src/game.js', '--bundle', '--minify', '--format=iife', '--target=es2022', '--outfile=dist/game.js', '--log-level=warning'];
execFileSync(es || 'npx', es ? args : ['--yes', 'esbuild', ...args], { cwd: root, stdio: 'inherit' });
const js = readFileSync(root + 'dist/game.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const font64 = readFileSync(root + 'assets/pressstart2p-latin.woff2').toString('base64');
const css = readFileSync(root + 'style.css', 'utf8').replace(/url\(['"]?(?:\.\/)?assets\/pressstart2p-latin\.woff2['"]?\)/g, `url(data:font/woff2;base64,${font64})`);
const html = readFileSync(root + 'index.html', 'utf8');
const body = html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script[^>]*src=[^>]*><\/script>/g, '').trim();
const fonts = ''; // the pixel font is embedded in style.css, no third-party request
const icon = html.match(/<link rel="icon"[^>]*>/)[0];
const style = `<style>:root{color-scheme:dark}body{background-color:#0b0e1c}\n${css}</style>`;
const fragment = `<title>Bearded Bros</title>\n${icon}\n${fonts}\n${style}\n${body}\n<script>${js}</script>\n`;
writeFileSync(root + 'dist/artifact.html', fragment);
// standalone document keeps every <meta>/<link> from the dev page's head (viewport-fit, apple-web-app, manifest, touch icon)
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<link rel="stylesheet" href="style.css">/, '').replace(/<title>[\s\S]*?<\/title>/, '').trim();
const standalone = `<!doctype html>\n<html lang="en"><head>\n${head}\n<meta name="gemforge-bundled" content="1">\n<title>Bearded Bros</title>\n${style}</head><body>\n${body}\n<script>${js}</script>\n</body></html>\n`;
writeFileSync(root + 'dist/index.html', standalone);
cpSync(root + 'assets', root + 'dist/assets', { recursive: true });
const build = createHash('sha1').update(standalone).digest('hex').slice(0, 8);
writeFileSync(root + 'dist/sw.js', readFileSync(root + 'assets/sw.js', 'utf8').replace('__BUILD__', build));
console.log(`dist/index.html ${(standalone.length / 1024).toFixed(0)} KB (build ${build}), dist/artifact.html ${(fragment.length / 1024).toFixed(0)} KB`);
