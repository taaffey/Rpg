// Bundles the game into ONE self-contained page (no module loading, no extra files), for hosting or publishing.
//   ESBUILD=/path/to/esbuild node tools/build.mjs     (falls back to `npx esbuild`)
// Outputs: dist/index.html (full standalone document) and dist/artifact.html (fragment for hosts that supply the document shell).
import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
const root = new URL('../', import.meta.url).pathname;
mkdirSync(root + 'dist', { recursive: true });
const es = process.env.ESBUILD;
const args = ['src/game.js', '--bundle', '--minify', '--format=iife', '--target=es2022', '--outfile=dist/game.js', '--log-level=warning'];
execFileSync(es || 'npx', es ? args : ['--yes', 'esbuild', ...args], { cwd: root, stdio: 'inherit' });
const js = readFileSync(root + 'dist/game.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(root + 'style.css', 'utf8');
const html = readFileSync(root + 'index.html', 'utf8');
const body = html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script[^>]*src=[^>]*><\/script>/g, '').trim();
const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap">';
const icon = html.match(/<link rel="icon"[^>]*>/)[0];
const style = `<style>:root{color-scheme:dark}body{background-color:#0b0e1c}\n${css}</style>`;
const fragment = `<title>Gemforge Chronicles</title>\n${icon}\n${fonts}\n${style}\n${body}\n<script>${js}</script>\n`;
writeFileSync(root + 'dist/artifact.html', fragment);
// standalone: move the body markup/script into <body>
const standalone = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n<title>Gemforge Chronicles</title>\n${icon}\n${fonts}\n${style}</head><body>\n${body}\n<script>${js}</script>\n</body></html>\n`;
writeFileSync(root + 'dist/index.html', standalone);
console.log(`dist/index.html ${(standalone.length / 1024).toFixed(0)} KB, dist/artifact.html ${(fragment.length / 1024).toFixed(0)} KB`);
