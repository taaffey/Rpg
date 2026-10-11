// Screenshot map spots: OUT=/dir/ node tools/look.mjs 390x844 '[["haven",12,10,"name"],["world",7,21]]'  (needs: python3 -m http.server 8123)
import { createRequire } from 'module';
const pw = createRequire('/node-tools/node_modules/')('playwright');
const b = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const D = process.env.OUT || '/tmp/look/'; (await import('fs')).mkdirSync(D, { recursive: true });
const [vw,vh]=(process.argv[2]||'1280x800').split('x').map(Number);
const spots=JSON.parse(process.argv[3]||'[["haven",12,10]]');
const touch = !!process.env.TOUCH || vw < 800; const pg = await b.newPage({ viewport:{width:vw,height:vh}, hasTouch:touch, isMobile:touch });
const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));
await pg.goto('http://localhost:8123/index.html'); await pg.waitForTimeout(400);
await pg.evaluate(()=>{window.__game.ACT.diff(1,'normal');}); await pg.waitForTimeout(500);
await pg.evaluate(()=>{const el=document.getElementById('overlay'); el.className=''; el.innerHTML=''; for (const m of Object.values(window.__game.MAPS)) m.rate=0; window.__game.OPT.minimap=false;});
for (const [map,x,y,name] of spots){ await pg.evaluate(([m,x,y])=>{window.__game.goto(m,x,y); const G=window.__game.G; G.flags.seen={}; }, [map,x,y]); await pg.waitForTimeout(900); await pg.screenshot({path:`${D}${name||map+'-'+x+'-'+y}.png`}); }
console.log(errs.join('\n')||'ok');
await b.close();
