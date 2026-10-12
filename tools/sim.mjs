// Headless balance sim: bot parties fight each region's encounter table (and bosses) through the real engine.
// usage: node tools/sim.mjs [fast]
import { Battle, newChar, stats, slotSkill, slotGems, skillWithGems, SIG, learnable } from '../src/logic.js';
import { ENCOUNTERS } from '../src/data.js';
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const TIER = [
  [['iron_sword','chain'],['storm_rod','mage_cloak'],['oak_staff','leather'],['hunter_bow','leather']],
  [['mythril_sword','mythril_mail'],['sage_staff','frost_robe'],['sage_staff','yeti_fur'],['longbow','yeti_fur']],
  [['frostbrand','mythril_mail'],['lich_staff','lich_robes'],['sage_staff','yeti_fur'],['frost_bow','mythril_mail']],
];
const JOBSET = [['knight','rogue'],['mage','cleric'],['cleric','bard'],['ranger','rogue']];
function party(level,tier){
  return JOBSET.map(([m,s],i)=>{ const [w,a]=TIER[tier][i]; const c=newChar('ABCD'[i],m,s,w,a,level); c.level=level; c.slots=[null,null,null,null]; learnable(c).slice(0,4).forEach((sk,k)=>c.slots[k]=sk); const st=stats(c); c.hp=st.hp;c.mp=st.mp; return c;});
}
const pick=(a,r)=>a[Math.floor(r()*a.length)];
function bot(b,rng){
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
// one "dungeon visit" = several fights in a row with no healing between (like a real crawl), HP carries over
function crawl(level,tier,table,fights,n,boss){
  let wins=0,hp=0; const rng=mulberry(level*977+n*31+tier);
  for(let t=0;t<n;t++){
    const ps=party(level,tier); let ok=true, last=null;
    for(let f=0;f<fights&&ok;f++){
      const grp=boss?[boss]:pick(ENCOUNTERS[table],rng); const b=new Battle(ps,grp,rng,!!boss); let r=0;
      while(!b.over&&r++<80){ for(const _ of b.round(bot(b,rng))); }
      b.p.forEach(x=>{x.ch.hp=x.hp;x.ch.mp=x.mp}); if(b.over!=='win')ok=false; last=b;
    }
    if(ok){wins++;hp+=ps.reduce((n,c)=>n+c.hp/stats(c).hp,0)/4;}
  }
  return {win:wins/n, hp:wins?hp/wins:0};
}
const row=(label,r)=>console.log(label.padEnd(26),`win ${(r.win*100).toFixed(0).padStart(3)}%  hp left ${(r.hp*100).toFixed(0).padStart(3)}%`);
const N=+process.argv[3]||120;
console.log('--- single fights (full HP) ---');
for(const [t,l,tier] of [['world',3,0],['world',5,0],['swamp',7,0],['swamp',9,0],['dungeon',6,0],['dungeon',8,0],['crypt',10,1],['crypt',12,1],['snow',12,1],['snow',14,1],['spire',14,1],['spire',16,2],['storm',11,1],['storm',13,1],['desert',8,0],['desert',10,0],['desert',11,1]]) row(`${t} L${l}`,crawl(l,tier,t,1,N));
console.log('--- 4-fight crawls (HP carries over, no healing) ---');
for(const [t,l,tier] of [['dungeon',7,0],['dungeon',9,0],['crypt',11,1],['crypt',13,1],['spire',15,2],['spire',17,2]]) row(`${t} L${l} x4`,crawl(l,tier,t,4,N));
console.log('--- bosses ---');
for(const [b,l,tier] of [['wyrm',8,0],['wyrm',9,0],['wyrm',10,0],['lich',12,1],['lich',13,1],['lich',14,1],['titan',16,2],['titan',17,2],['titan',18,2],['storm_drake',11,1],['storm_drake',12,1],['storm_drake',13,1]]) row(`${b} L${l}`,crawl(l,tier,null,1,N,b));
