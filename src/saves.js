// ===== Saves and party plumbing: callings helpers, new game, slots, migration, autosave, loading a slot. =====
import { ACCS, ARMORS, BOSSES, CALLING_BATCHES, DIFFICULTY, ITEMS, JOBS, KEY_ITEMS, TRAITS, WEAPONS } from './data.js';
import * as L from './logic.js';
import { BROS } from './bros.js';
import { MAPS, START, WALK } from './maps.js';
import { GEN } from './mapgen.js';
import { CP_AT_LEVEL, RULES } from './gamedata.js';
import { music, sfx } from './audio.js';
import { G, setG } from './state.js';
import { DB, banner, diag, gainExp, hide, learnable, newChar, sanitize, toast } from './core.js';
import { BT } from './battle.js';
import { announceFeats, unlockFeats } from './menus.js';
import { chartTheLand, mapDef, musicFor, snap } from './world.js';
// ---------- state ----------
// ---------- callings: the bros take one after the cellar, the locals bring their own; more are learned on the road ----------
// FF5-style: callings rank up with Calling Points (logic.js); new batches wake with each heart-gem held (data.js CALLING_BATCHES)
const STARTER_JOBS = CALLING_BATCHES[0];
const heartsHeld = (g = G) => Object.keys(KEY_ITEMS).filter((k) => g?.flags?.qitems?.[k]).length;
const batchesOpen = (g = G) => Math.min(CALLING_BATCHES.length, 1 + heartsHeld(g));
const unlockedJobs = () => { const on = new Set([...CALLING_BATCHES.slice(0, batchesOpen()).flat(), ...G.party.flatMap((c) => Object.keys(c.cp || {}))]); return Object.keys(JOBS).filter((j) => on.has(j)); };
const stars = (c, j) => { const r = L.rankOf(c, j); return `<span class="stars ${r >= L.MAX_RANK ? 'mastered' : ''}" title="Rank ${r}/${L.MAX_RANK}">${Array.from({ length: L.MAX_RANK }, (_, k) => `<i class="pip${k < r ? ' on' : ''}"></i>`).join('')}</span>`; }; // rank pips ◆◆◆◇◇◇
const traitName = (t) => (t ? TRAITS[t].name : '');
const DEFAULT_PARTY = BROS.map(([n, look]) => [n, 'bloke', look]); // two blokes from 2026; callings come after the Goose's cellar
const LIGHT_ARMOR = new Set(['mage', 'cleric', 'hexer', 'bard', 'alchemist']);
function newGame(party = DEFAULT_PARTY) {
  setG({
    // like FF1: the party starts at level 1, unarmed, with 400 G to arm itself at the Haven hardware shop (~205 G for the cheap weapons)
    party: party.map(([n, j, look]) => Object.assign(newChar(n, j, null, null, LIGHT_ARMOR.has(j) || j === 'bloke' ? 'cloth' : 'leather'), look ? { look } : {})),
    gold: 400, difficulty: 'normal', slot: 1,
    inv: { weapons: [], armors: [], accs: [], gems: [], items: { potion: 3 } },
    map: START.map, x: START.x, y: START.y, flags: { chests: {}, bosses: {}, seen: {}, talked: {}, visited: {}, quests: {}, qprog: {}, qitems: {}, tips: {}, bestiary: {}, story: {}, chat: {}, feats: {} }, playtime: 0,
  });
}
// ---------- saves: 3 slots, autosave, migration ----------
const BUILD = '__BUILD__'; // tools/build.mjs stamps the content hash here
const VERSION = '2.1.0', LEGACY_SAVE = 'gemforge-save-v2', SLOT_KEY = (i) => `gemforge-save-v3-${i}`, SLOT_IDS = [1, 2, 3];
function migrate(g) {
  g.v = 3; g.flags ||= {};
  for (const k of ['chests', 'bosses', 'seen', 'talked', 'visited', 'quests', 'qprog', 'qitems', 'tips', 'bestiary', 'story', 'chat', 'feats']) g.flags[k] ||= {};
  if (g.flags.worldv !== WORLD_V) { delete g.flags.seen.world; for (const k of Object.keys(g.flags.chests)) if (k.startsWith('world:')) delete g.flags.chests[k]; g.flags.worldMoved = true; if (g.map === 'world') { [g.x, g.y] = GEN.adj.haven; g.dir = 'down'; } }
  g.playtime ||= 0; g.ngp = Math.max(0, Math.min(5, g.ngp | 0)); g.rules = Object.fromEntries(Object.keys(RULES).filter((k) => g.rules?.[k]).map((k) => [k, true])); g.stats ||= { wins: 0 }; g.difficulty = DIFFICULTY[g.difficulty] ? g.difficulty : 'normal';
  for (const c of g.party) { c.extra ||= 0; c.gems ||= []; while (c.gems.length < 5) c.gems.push([]); }
  // old saves keep their gear; only ids that no longer exist are dropped (never a crash on load)
  g.inv ||= {}; for (const k of ['weapons', 'armors', 'accs', 'gems']) g.inv[k] = (g.inv[k] || []).filter((id) => DB[k][id]); g.inv.items ||= {};
  for (const id of Object.keys(g.inv.items)) if (!ITEMS[id]) delete g.inv.items[id];
  g.flags ||= {}; g.flags.story ||= {}; if (g.inv.gems.length || g.party.some((c) => c.gems.some((x) => x.length)) || Object.keys(g.flags.bosses || {}).length) g.flags.story.gems = true; // saves from before gems were paced keep them
  for (const [b, d] of Object.entries(BOSSES)) if (d.heart && g.flags.bosses[b]) g.flags.qitems[d.heart] = true; // hearts of evils slain before hearts existed
  for (const c of g.party) { if (c.weapon && !WEAPONS[c.weapon]) c.weapon = null; if (c.armor && !ARMORS[c.armor]) c.armor = null; if (c.acc && !ACCS[c.acc]) c.acc = null; c.exp = Math.max(0, c.exp || 0); c.level = Math.min(L.MAX_LEVEL, c.level || 1); gainExp(c, 0); } // gainExp(0) settles EXP banked under an older curve
  for (const c of g.party) migrateCallings(c, g.inv);
  const m = MAPS[g.map];
  if (!m) { g.map = START.map; g.x = START.x; g.y = START.y; } else if (!WALK.has(m.rows[g.y]?.[g.x] ?? '#') && m.rows[g.y]?.[g.x] !== 'B') { g.x = m.spawn.x; g.y = m.spawn.y; }
  return g;
}
// Saves from before Calling Points: skills came from the hero's level (main calling) and a sub calling two levels behind.
// Grant each calling the rank that keeps every skill the hero had (and anything slotted), and at least what its level would
// have earned; the sub calling becomes the second calling. Weapons the new calling cannot hold go back to the pack.
function migrateCallings(c, inv) {
  if (c.cp) return; if (!JOBS[c.main]) c.main = 'knight'; if (c.sub && !JOBS[c.sub]) c.sub = null;
  const lv = Math.min(L.MAX_LEVEL, c.level || 1), had = (l) => (l >= 9 ? 5 : l >= 7 ? 4 : l >= 5 ? 3 : l >= 3 ? 2 : l >= 1 ? 1 : 0); // skills the old level tables gave by then
  const need = (job, n) => { const r = JOBS[job].skills[Math.min(n, JOBS[job].skills.length) - 1]?.[1] || 1; return Math.max(1, ...(c.slots || []).filter((id) => JOBS[job].skills.some(([s]) => s === id)).map((id) => JOBS[job].skills.find(([s]) => s === id)[1]), r); };
  c.cp = { [c.main]: Math.max(L.CP_RANKS[need(c.main, had(lv)) - 1], CP_AT_LEVEL[lv]) };
  if (c.sub && c.sub !== c.main) c.cp[c.sub] = L.CP_RANKS[need(c.sub, Math.max(1, had(lv - 2))) - 1]; else c.sub = null;
  c.trait = null; sanitize(c, inv);
}
const readSlot = (i) => { try { const raw = localStorage.getItem(SLOT_KEY(i)); return raw ? JSON.parse(raw) : null; } catch { return null; } };
const anySave = () => SLOT_IDS.some((i) => readSlot(i));
const WORLD_V = 6; // bump when the overworld layout changes: older saves drop their fog and a party standing on the old map is walked back to Haven's gate
const save = () => { if (!G || !G.slot) return false; G.flags.worldv = WORLD_V; try { localStorage.setItem(SLOT_KEY(G.slot), JSON.stringify({ v: 3, savedAt: Date.now(), G })); return true; } catch { return false; } };
(function importLegacy() { // a v2 single-slot save becomes slot 1 the first time this version runs
  try { const old = localStorage.getItem(LEGACY_SAVE); if (old && !readSlot(1)) { const g = migrate(JSON.parse(old)); g.slot = 1; localStorage.setItem(SLOT_KEY(1), JSON.stringify({ v: 3, savedAt: Date.now(), G: g })); localStorage.removeItem(LEGACY_SAVE); } } catch {}
})();
const tipOnce = () => false; // no tutorial pop-ups: players work things out (the journal keeps a few notes)
function tip(id, text, ms = 5200) { if (!tipOnce(id)) return; if (BT) BT.log.push('💡 ' + text); else toast('💡 ' + text, ms); } // in battle the hint goes to the log so it never covers the stage
function autosave() { if (!G || !G.slot || BT) return; const fresh = unlockFeats(); if (save()) toast('💾 Autosaved', 1400); else toast('⚠ Could not autosave: storage is full or blocked', 3200); if (fresh.length) announceFeats(fresh); }
function autofill(c) {
  const used = c.slots.filter(Boolean);
  for (const sid of learnable(c)) { const i = c.slots.indexOf(null); if (i < 0) break; if (!used.includes(sid)) { c.slots[i] = sid; used.push(sid); } }
}
let loadingSlot = false;
async function loadSlot(i) {
  const d = readSlot(i); if (!d?.G || loadingSlot) return;
  let g; try { g = migrate(d.G); } catch (err) { console.error(err); sfx('error'); return toast('⚠ That save looks damaged. Try Restore with a backup code (Options).', 4600); }
  if (g.map === 'world') { loadingSlot = true; try { await chartTheLand(); } finally { loadingSlot = false; } } // a save that loads onto the overworld: bake it behind a loader, not a frozen frame
  setG(g); G.slot = i; snap(); diag(`loaded slot ${i} at ${G.map}`); music(musicFor()); hide(); banner(mapDef().name); toast(`Loaded slot ${i}`);
  if (G.flags.worldMoved) { delete G.flags.worldMoved; toast('The world has been redrawn since this save. Fog reset' + (G.map === 'world' ? ' and you are back at Haven\'s gate' : '') + '.', 5200); }
}

export { BUILD, LIGHT_ARMOR, SLOT_IDS, SLOT_KEY, STARTER_JOBS, VERSION, WORLD_V, anySave, autofill, autosave, batchesOpen, loadSlot, newGame, readSlot, save, stars, tip, tipOnce, traitName, unlockedJobs };
