// ===== Entry point: loads the content packs and every module, wires the global listeners, the test hook, and starts at the title screen. =====
import './sidequests.js'; // four small optional dungeons on the main islands
import './obsidian.js'; // the Obsidian Ruins: the last optional island and its superboss
import './embers.js'; // Cinder Isle content (post-ending volcano island)
import './hopsend.js'; // Hopsend Isle content (enemies, gear, shops, quests, scenes)
import { setBackgrounded, unlock } from './audio.js';
import * as L from './logic.js';
import { LOCALS } from './bros.js';
import { ROADSIDE } from './roadside.js';
import { MAPS } from './maps.js';
import { LIGHT_ARMOR, autofill, autosave } from './saves.js';
import { ACT, OPT, TS, diag, maxOf, sanitize, toast } from './core.js';
import { G } from './state.js';
import { joinLocal, scene, talk } from './story.js';
import { camState, goto, roadside, route, snap, step, vx, vy } from './world.js';
import { BT, awakening, battle, defeat, ending, newGamePlus, wipeHome } from './battle.js';
import { guild, inn, shop, socketer } from './town.js';
import { diffScreen, slotScreen, title } from './intro.js';
import { itemsMenu } from './build.js';
import { mainMenu } from './menus.js';
import './options.js';
// audio controls: browsers need a user gesture before sound can start
['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach((ev) => addEventListener(ev, unlock, { passive: true }));
document.addEventListener('visibilitychange', () => { setBackgrounded(document.hidden); if (document.hidden) autosave(); });
addEventListener('error', (e) => { diag(`ERROR ${String(e.message || e.error).slice(0, 160)}`); console.error(e.error || e.message); toast('⚠ Something went wrong. Your progress is safe.', 3500); autosave(); });
addEventListener('unhandledrejection', (e) => { diag(`ERROR (promise) ${String(e.reason?.message || e.reason).slice(0, 160)}`); console.error(e.reason); toast('⚠ Something went wrong. Your progress is safe.', 3500); });
addEventListener('pagehide', () => { setBackgrounded(true); autosave(); });
addEventListener('pageshow', () => setBackgrounded(false));
// offline play + install support for the single-file build (only when served over https/localhost, never inside a host frame)
if ('serviceWorker' in navigator && document.querySelector('meta[name=gemforge-bundled]') && window.self === window.top && /^(https:|http:\/\/localhost)/.test(location.href)) navigator.serviceWorker.register('sw.js').catch(() => {});
// debug / test hook: only under browser automation (Playwright sets navigator.webdriver) or with ?debug in the address; real players never get it
function testParty(jobs = { adam: 'monk', devon: 'mage', brenna: 'cleric', wendell: 'knight' }) { // tests: skip the intro with the full four
  Object.assign(G.flags.story, { woke: true, cellar: true, called: true }); G.flags.bosses.big_gary = true;
  if (!G.party.some((c) => c.look === 'brenna')) joinLocal('brenna'); if (!G.party.some((c) => c.look === 'wendell')) joinLocal('wendell');
  for (const c of G.party) { if (jobs[c.look] && c.main !== jobs[c.look]) { L.setCalling(c, jobs[c.look]); delete c.cp.bloke; c.cp[c.main] = 0; c.weapon = null; c.armor = LIGHT_ARMOR.has(c.main) ? 'cloth' : 'leather'; c.slots = [null, null, null, null]; sanitize(c, G.inv); autofill(c); } const st = maxOf(c); c.hp = st.hp; c.mp = st.mp; }
  for (const c of G.party) { if (c.look === 'brenna' || c.look === 'wendell') { c.cp[c.main] = 0; c.weapon = LOCALS[c.look].weapon || null; c.slots = [null, null, null, null]; sanitize(c, G.inv); autofill(c); } }
}
if (navigator.webdriver || /[?&]debug\b/.test(location.search)) window.__game = { scene, roadside, ROADSIDE, autosave, defeat, ending, newGamePlus, testParty, wipeHome, get G() { return G; }, get BT() { return BT; }, get v() { return [vx, vy]; }, camState, TS, get route() { return route; }, battle, step, goto, MAPS, snap, OPT, ACT, ui: { shop, inn, guild, socketer, title, slotScreen, diffScreen, talk, itemsMenu, mainMenu, awakening } };
title();
