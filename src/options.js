// ===== Options, save backup codes and Report a problem. =====
import { DIFFICULTY, ENEMIES, JOBS, QUESTS } from './data.js';
import { isMuted, setMuted, sfx } from './audio.js';
import { ENC_MUL, REGION_NAME, SPEEDS, TEXT_MS, UI_ZOOM } from './gamedata.js';
import { FEATS } from './feats.js';
import { packSlots, unpackSlots } from './backup.js';
import { $, ACT, ACTIN, DIAG, IS_IOS, OPT, TOUCH, applyOptions, btn, esc, fmtTime, ic, maxOf, ov, root, show, syncMute, toast } from './core.js';
import { G, S } from './state.js';
import { BUILD, SLOT_IDS, SLOT_KEY, VERSION, anySave, readSlot } from './saves.js';
import { mapDef, regionOf } from './world.js';
import { qstate } from './story.js';
import { beastDone, mainMenu } from './menus.js';
import { title } from './intro.js';
function optionsScreen() {
  const onOff = (v) => (v ? 'On' : 'Off');
  show(`<h2>⚙ Options</h2>
  <div class="opt"><label>${ic('sound')} Music volume <b>${Math.round(OPT.music * 100)}%</b></label><input type="range" min="0" max="100" value="${Math.round(OPT.music * 100)}" data-in="music"></div>
  <div class="opt"><label>${ic('sound')} Sound effects <b>${Math.round(OPT.sfx * 100)}%</b></label><input type="range" min="0" max="100" value="${Math.round(OPT.sfx * 100)}" data-in="sfx"></div>
  <div class="opts">${G ? btn('optdiff', `<span>Difficulty</span><b>${DIFFICULTY[G.difficulty].name}</b>`) : ''}${btn('optspeed', `<span>Battle speed</span><b>${OPT.speed}</b>`)}${btn('opttext', `<span>Text speed</span><b>${OPT.text}</b>`)}${btn('optui', `<span>Menu size</span><b>${OPT.ui}</b>`)}${btn('optenc', `<span>Random fights</span><b>${OPT.enc}</b>`)}${btn('optmini', `<span>Minimap</span><b>${onOff(OPT.minimap)}</b>`)}${btn('optshake', `<span>Screen shake</span><b>${onOff(OPT.shake)}</b>`)}${btn('optmute', `<span>${ic(isMuted() ? 'mute' : 'sound')}Sound</span><b>${isMuted() ? 'Muted' : 'On'}</b>`)}</div>
  <h3>Saves</h3><div class="opts">${btn('backup', '<span>Back up saves</span><b>Copy a code</b>', '', '', '', !anySave())}${btn('restore', '<span>Restore saves</span><b>Paste a code</b>')}${btn('report', '<span>Report a problem</span><b>Copy a report</b>')}</div>
  <h3>Controls</h3>${TOUCH ? '<div class="dim controls"><div><b>Tap the map</b> walk there</div><div><b>Pad</b> press and slide to walk</div><div><b>A</b> talk, check, confirm</div><div><b>B</b> menu, back</div><div><b>MAP</b> the full map</div><div><b>Tap text</b> skip ahead</div></div><div class="dim" style="margin-top:4px">A keyboard works too: arrows or WASD, Enter, Esc.</div>' : '<div class="dim controls"><div><b>Arrows / WASD</b> move</div><div><b>Esc / M</b> menu</div><div><b>N</b> toggle minimap</div><div><b>Arrows</b> move menu focus</div><div><b>Enter / Space</b> select</div><div><b>Esc / Backspace</b> back</div></div>'}
  ${IS_IOS && !root.classList.contains('standalone') && !root.classList.contains('framed') ? '<div class="card"><b>📱 Install on iPhone</b><div class="dim">In Safari tap Share, then <b>Add to Home Screen</b>. Bearded Bros then runs full-screen, works offline, and remembers your saves.</div></div>' : ''}
  <div class="foot"><span class="dim grow" style="font-size:8px;align-self:center">Bearded Bros v${VERSION}</span>${btn('optback', 'Back', '', '', 'primary')}</div>`);
}
ACT.opts = () => optionsScreen();
ACT.optsback = () => optionsScreen();
function buildReport() {
  const L2 = ['BEARDED BROS REPORT', `version ${VERSION} build ${BUILD.startsWith('__') ? 'dev' : BUILD}`, `when ${new Date().toISOString()}`, `device ${navigator.userAgent.replace(/\s+/g, ' ').slice(0, 150)}`,
    `screen ${innerWidth}x${innerHeight} @${devicePixelRatio} touch ${TOUCH ? 'yes' : 'no'} installed ${root.classList.contains('standalone') ? 'yes' : 'no'}`,
    `options music ${Math.round(OPT.music * 100)} sfx ${Math.round(OPT.sfx * 100)} muted ${isMuted() ? 'yes' : 'no'} battle ${OPT.speed} text ${OPT.text} menu ${OPT.ui} fights ${OPT.enc} shake ${OPT.shake ? 'on' : 'off'} minimap ${OPT.minimap ? 'on' : 'off'}`];
  if (G) {
    const st = G.stats || {}, m = mapDef();
    L2.push(`game slot ${G.slot} ${G.difficulty} NG+${G.ngp || 0} rules ${Object.keys(G.rules || {}).join(',') || 'none'} played ${fmtTime(G.playtime)}`,
      `where ${G.map} (${G.x},${G.y}) ${m.kind === 'outdoor' ? REGION_NAME[regionOf()] : m.name}`,
      `party ${G.party.map((c) => `${c.name} ${JOBS[c.main].name} L${c.level} ${c.hp}/${maxOf(c).hp}`).join(' | ')}`,
      `progress gold ${G.gold} bosses ${Object.keys(G.flags.bosses).join(',') || 'none'} quests ${Object.keys(QUESTS).filter((id) => qstate(id) === 'done').length}/${Object.keys(QUESTS).length} feats ${Object.keys(G.flags.feats || {}).length}/${FEATS.length} bestiary ${beastDone()}/${Object.keys(ENEMIES).length}`,
      `stats wins ${st.wins || 0} wipes ${st.wipes || 0} steps ${st.steps || 0} rides ${st.rides || 0}`);
  } else L2.push('game none (title screen)');
  L2.push('recent:', ...(DIAG.length ? DIAG.slice(-45).map((l) => '  ' + l) : ['  (nothing yet)']));
  return L2.join('\n');
}
ACT.report = () => {
  show(`<h2>🐞 Report a problem</h2><p class="dim">Tap Copy, then paste this into a message with a line about what went wrong. It holds your game state and the last few things that happened, nothing personal.</p><textarea class="code" readonly data-in="bkcode" rows="11" spellcheck="false" aria-label="Report">${esc(buildReport())}</textarea><div class="foot">${btn('rpcopy', 'Copy report', '', '', 'primary')}${btn('optsback', 'Back')}</div>`);
};
async function copyBox(done) {
  const ta = ov.querySelector('textarea'); if (!ta) return;
  ta.focus(); ta.select(); try { ta.setSelectionRange(0, ta.value.length); } catch {}
  let ok = false; try { await navigator.clipboard.writeText(ta.value); ok = true; } catch { try { ok = document.execCommand('copy'); } catch {} }
  toast(ok ? `📋 ${done} copied` : `${done} selected: tap and hold it, then Copy`, 2800); if (ok) sfx('coin');
}
ACT.rpcopy = () => copyBox('Report');
// ---------- save backup / restore (Options): one pasteable code for all three slots ----------
const slotsRaw = () => Object.fromEntries(SLOT_IDS.map((i) => { try { return [i, localStorage.getItem(SLOT_KEY(i))]; } catch { return [i, null]; } }).filter(([, v]) => v));
ACT.backup = async () => {
  show(`<h2>💾 Back up saves</h2><p class="dim">Copy this code and keep it somewhere safe: a note, or a message to yourself. Paste it into Restore on any device to get your saves back. Safari can clear a game's storage if you leave it alone for a week.</p><textarea class="code" readonly data-in="bkcode" rows="7" spellcheck="false" aria-label="Backup code">Packing…</textarea><div class="foot">${btn('bkcopy', 'Copy code', '', '', 'primary')}${btn('optsback', 'Back')}</div>`);
  const code = await packSlots(slotsRaw()), ta = ov.querySelector('textarea'); if (ta) ta.value = code || 'No saves yet. Start a game first.';
};
ACT.bkcopy = () => { const ta = ov.querySelector('textarea'); if (ta && /^BB[01]:/.test(ta.value)) return copyBox('Code'); };
let restorePending = null;
ACT.restore = () => {
  restorePending = null;
  show(`<h2>📥 Restore saves</h2><p class="dim">Paste a backup code here. Any saves in the same slots are replaced.</p><textarea class="code" data-in="bkpaste" rows="7" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="BB1:" aria-label="Backup code"></textarea><div id="bkmsg" class="dim"></div><div class="foot">${btn('bkgo', 'Restore', '', '', 'primary')}${btn('optsback', 'Back')}</div>`);
};
ACTIN.bkpaste = () => { restorePending = null; const m = $('#bkmsg'); if (m) { m.textContent = ''; m.className = 'dim'; } const b = ov.querySelector('[data-act=bkgo]'); if (b) b.textContent = 'Restore'; };
ACT.bkgo = async () => {
  const ta = ov.querySelector('textarea'), msg = $('#bkmsg'), note = (t, bad) => { if (msg) { msg.textContent = t; msg.className = bad ? 'bad' : 'dim'; } };
  if (!ta) return;
  let slots; try { slots = await unpackSlots(ta.value, SLOT_IDS); } catch (e) { sfx('error'); return note(e.message, true); }
  const ids = Object.keys(slots), clash = ids.filter((i) => readSlot(+i));
  if (clash.length && restorePending !== ta.value) { restorePending = ta.value; ov.querySelector('[data-act=bkgo]').textContent = 'Tap again to replace'; sfx('click'); return note(`This replaces your saves in slot ${clash.join(', ')}.`); }
  try { for (const i of ids) localStorage.setItem(SLOT_KEY(i), slots[i]); } catch { sfx('error'); return note('Could not write the saves: storage is full or blocked.', true); }
  restorePending = null; sfx('levelup'); toast(`📥 Restored ${ids.length} save${ids.length > 1 ? 's' : ''}`, 2600); ACT.cont();
};
ACT.optback = () => (S.optBack === 'title' && !G ? title() : mainMenu());
ACTIN.music = (v) => { OPT.music = v / 100; applyOptions(); ov.querySelector('[data-in=music]').previousElementSibling.querySelector('b').textContent = `${v}%`; };
ACTIN.sfx = (v) => { OPT.sfx = v / 100; applyOptions(); ov.querySelector('[data-in=sfx]').previousElementSibling.querySelector('b').textContent = `${v}%`; sfx('click'); };
ACT.optdiff = () => { const k = Object.keys(DIFFICULTY); G.difficulty = k[(k.indexOf(G.difficulty) + 1) % k.length]; optionsScreen(); };
ACT.optspeed = () => { const k = Object.keys(SPEEDS); OPT.speed = k[(k.indexOf(OPT.speed) + 1) % k.length]; applyOptions(); optionsScreen(); };
ACT.optenc = () => { const k = Object.keys(ENC_MUL); OPT.enc = k[(k.indexOf(OPT.enc) + 1) % k.length]; applyOptions(); optionsScreen(); };
ACT.optui = () => { const k = Object.keys(UI_ZOOM); OPT.ui = k[(k.indexOf(OPT.ui) + 1) % k.length]; applyOptions(); optionsScreen(); };
ACT.opttext = () => { const k = Object.keys(TEXT_MS); OPT.text = k[(k.indexOf(OPT.text) + 1) % k.length]; applyOptions(); optionsScreen(); };
ACT.optmini = () => { OPT.minimap = !OPT.minimap; applyOptions(); optionsScreen(); };
ACT.optshake = () => { OPT.shake = !OPT.shake; applyOptions(); optionsScreen(); };
ACT.optmute = () => { setMuted(!isMuted()); syncMute(); optionsScreen(); };
