// Do the boss wind-ups reward skill? Same boss fights as tools/sim.mjs, three kinds of player:
//   plain  never Guards and never aims at a wind-up (what the balance numbers in sim.mjs / progress.mjs use)
//   guard  Guards the heroes the unleash could kill the moment a boss starts winding up, otherwise plays like plain
//   smart  when a wind-up starts, works out whether the heroes who act before it lands can stagger it (all-out attacks on the boss),
//          and if not Guards the fragile ones; a cleric who has someone below half health keeps healing
//   oracle smart, and it has counted the boss's cadence so it also goes all-out the round the wind-up starts (the upper bound)
// Prints win rate, health left, and how often wind-ups got staggered. A good boss: plain is beatable, smart is clearly better, nobody is at 100%.
// usage: node tools/skillsim.mjs [runs=150]
//   ONLY=titan,lich      only those bosses
//   TUNE='titan.need=0.09,titan.mult=2.1'   try other wind-up numbers without editing src/bossmech.js
import { Battle, newChar, stats, slotSkill, slotGems, skillWithGems, SIG, learnable } from '../src/logic.js';
import { MECH } from '../src/bossmech.js';
import { skilledLayer, oracleLayer } from './skilled.mjs';
for(const kv of (process.env.TUNE||'').split(',').filter(Boolean)){ const [k,v]=kv.split('='), [boss,field]=k.split('.'); MECH[boss].charge[field]=+v; }
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const TIER = [
  [['iron_sword','chain'],['storm_rod','mage_cloak'],['oak_staff','leather'],['hunter_bow','leather']],
  [['mythril_sword','mythril_mail'],['sage_staff','frost_robe'],['sage_staff','yeti_fur'],['longbow','yeti_fur']],
  [['frostbrand','mythril_mail'],['lich_staff','lich_robes'],['sage_staff','yeti_fur'],['frost_bow','mythril_mail']],
];
const JOBSET = ['knight','mage','cleric','ranger'];
const CP_AT = [0,0,3,8,14,22,32,40,50,60,75,95,115,130,150,170,190,210,230,250,270];
function party(level,tier){
  return JOBSET.map((m,i)=>{ const [w,a]=TIER[tier][i]; const c=newChar('ABCD'[i],m,null,w,a,level); c.level=level; c.cp[m]=CP_AT[level]; c.slots=[null,null,null,null]; learnable(c).slice(-4).reverse().forEach((sk,k)=>c.slots[k]=sk); const st=stats(c); c.hp=st.hp; c.mp=st.mp; return c; });
}
const pick=(a,r)=>a[Math.floor(r()*a.length)];
function plain(b,rng){
  const cmds=new Map();
  for(const p of b.p.filter(x=>x.hp>0)){
    const hurt=b.p.filter(x=>x.hp>0&&x.hp<x.maxhp*0.5).sort((a,c)=>a.hp/a.maxhp-c.hp/c.maxhp)[0];
    let best=null,bs=-1;
    for(const i of [0,1,2,3,SIG]){const sid=slotSkill(p.ch,i); if(!sid)continue; const s=skillWithGems(sid,slotGems(p.ch,i)); if(p.mp<s.mp)continue;
      if(s.kind==='heal'&&s.pow&&hurt&&s.tgt!=='self'){best={kind:'skill',skillId:sid,gems:slotGems(p.ch,i),target:hurt};bs=999;break;}
      if(s.kind!=='phys'&&s.kind!=='mag')continue; const sc=s.pow*s.hits*(s.tgt==='all'?2:1)*(s.mp>0?1:0.8)*(1+rng()*.2); if(sc>bs){bs=sc;best={kind:'skill',skillId:sid,gems:slotGems(p.ch,i),target:pick(b.e.filter(x=>x.hp>0),rng)};}}
    cmds.set(p,best||{kind:'skill',skillId:'attack',gems:[],target:pick(b.e.filter(x=>x.hp>0),rng)});
  }
  return cmds;
}
const POLICY={plain:(b,r)=>plain(b,r), guard:(b,r)=>skilledLayer(b,plain(b,r),false), smart:(b,r)=>skilledLayer(b,plain(b,r),true), oracle:(b,r)=>oracleLayer(b,plain(b,r))};
function trial(level,tier,boss,n,policy){
  let wins=0,hp=0,winups=0,stag=0; const rng=mulberry(level*977+tier*13+boss.length*7);
  for(let t=0;t<n;t++){
    const ps=party(level,tier), b=new Battle(ps,[boss],rng,true); let r=0;
    while(!b.over&&r++<80){ for(const L of b.round(POLICY[policy](b,rng))) for(const l of L){ if(l.startsWith('⚠'))winups++; else if(l.includes('is staggered'))stag++; } }
    if(b.over==='win'){wins++;hp+=b.p.reduce((s,x)=>s+x.hp/x.maxhp,0)/4;}
  }
  return {win:wins/n,hp:wins?hp/wins:0,winups:winups/n,stag:winups?stag/winups:0};
}
const N=+process.argv[2]||150;
const ONLY=(process.env.ONLY||'').split(',').filter(Boolean);
const CASES=[['wyrm',8,0],['wyrm',9,0],['wyrm',10,0],['lich',12,1],['lich',13,1],['lich',14,1],['titan',16,2],['titan',17,2],['titan',18,2],['storm_drake',11,1],['storm_drake',12,1],['storm_drake',13,1],['sphinx',11,1],['sphinx',12,1],['sphinx',13,1],['sphinx',14,1]].filter(([b])=>!ONLY.length||ONLY.includes(b));
const f=(r)=>`${(r.win*100).toFixed(0).padStart(3)}% hp${(r.hp*100).toFixed(0).padStart(3)}%`, st=(r)=>`${(r.stag*100).toFixed(0).padStart(3)}%`;
console.log('boss @ level'.padEnd(17),'plain  (stagger)'.padEnd(21),'guard'.padEnd(13),'smart  (stagger)'.padEnd(21),'oracle (stagger)'.padEnd(21),'wind-ups');
let rows=0,easy=0,flat=0,bad=0; const KEY={wyrm:9,lich:13,titan:17,storm_drake:12,sphinx:12}; // the level a party arrives at: these rows are asserted
for(const [boss,lv,tier] of CASES){
  const a=trial(lv,tier,boss,N,'plain'), g=trial(lv,tier,boss,N,'guard'), s=trial(lv,tier,boss,N,'smart'), o=trial(lv,tier,boss,N,'oracle'); rows++;
  if(s.win>=0.995)easy++; if(s.win-a.win<0.03&&a.win<0.97)flat++;
  const why=[]; if(KEY[boss]===lv){ if(o.stag<0.4)why.push('the stagger bar is out of reach'); if(a.stag>0.85)why.push('a plain player staggers it almost every time'); if(s.win<a.win-0.03)why.push('skill makes the fight harder'); }
  if(why.length)bad++;
  console.log(`${boss} L${lv}`.padEnd(17),`${f(a)} (${st(a)})`.padEnd(21),f(g).padEnd(13),`${f(s)} (${st(s)})`.padEnd(21),`${f(o)} (${st(o)})`.padEnd(21),s.winups.toFixed(1).padStart(4),why.length?`  <-- ${why.join('; ')}`:'');
}
console.log(`\n${easy}/${rows} cases are a certain win for the smart player; ${flat}/${rows} cases where skill adds almost nothing`);
if(bad){ console.log(`FAIL ${bad} boss(es) at their arrival level need their wind-up numbers retuned (src/bossmech.js)`); process.exit(1); }
console.log('wind-ups are reachable, not trivial, and skill never hurts at the arrival level');
