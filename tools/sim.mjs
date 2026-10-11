// Headless balance sim: bot parties fight encounter tables through the real battle engine.
import { Battle, newChar, gainExp, stats, slotSkill, slotGems, skillWithGems, SIG, learnable } from '../src/logic.js';
import { ENCOUNTERS } from '../src/data.js';
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function party(level){
  const ps=[newChar('A','knight','rogue','iron_sword','chain',level),newChar('B','mage','cleric','storm_rod','mage_cloak',level),newChar('C','cleric','bard','oak_staff','leather',level),newChar('D','ranger','rogue','hunter_bow','leather',level)];
  ps.forEach(c=>{ c.level=level; c.slots=[null,null,null,null]; const ok=learnable(c); ok.slice(0,4).forEach((s,i)=>c.slots[i]=s); const st=stats(c); c.hp=st.hp;c.mp=st.mp;}); return ps;
}
function bot(b,rng){
  const cmds=new Map();
  for(const p of b.p.filter(x=>x.hp>0)){
    const hurt=b.p.filter(x=>x.hp>0&&x.hp<x.maxhp*0.5)[0];
    let best=null,bs=-1;
    for(const i of [0,1,2,3,SIG]){const sid=slotSkill(p.ch,i); if(!sid)continue; const s=skillWithGems(sid,slotGems(p.ch,i)); if(p.mp<s.mp)continue;
      if(s.kind==='heal'&&s.pow&&hurt&&s.tgt!=='self'){best={kind:'skill',skillId:sid,gems:slotGems(p.ch,i),target:hurt};bs=999;break;}
      if(s.kind!=='phys'&&s.kind!=='mag')continue; const sc=s.pow*(s.hits)*(s.tgt==='all'?2:1)*(s.mp>0?1:0.8)*(1+rng()*.2); if(sc>bs){bs=sc;best={kind:'skill',skillId:sid,gems:slotGems(p.ch,i),target:pick(b.e.filter(x=>x.hp>0),rng)};}}
    cmds.set(p,best||{kind:'skill',skillId:'attack',gems:[],target:pick(b.e.filter(x=>x.hp>0),rng)});
  }
  return cmds;
}
const pick=(a,r)=>a[Math.floor(r()*a.length)];
function run(level,table,n,boss){
  let wins=0,hpLeft=0,rounds=0; const rng=mulberry(level*977+n);
  for(let t=0;t<n;t++){
    const ps=party(level);
    const groups=boss?[['wyrm']]:[pick(ENCOUNTERS[table],rng)];
    for(const g of groups){const b=new Battle(ps,g,rng,boss); let r=0; while(!b.over&&r++<60){for(const _ of b.round(bot(b,rng)));} rounds+=r;
      b.p.forEach(x=>{x.ch.hp=x.hp;x.ch.mp=x.mp}); if(b.over==='win'){wins++;hpLeft+=b.p.reduce((n,x)=>n+x.hp/x.maxhp,0)/4;}}
  }
  return `${table}${boss?'-boss':''} L${level}: win ${(wins/n*100).toFixed(0)}%  avgHP ${(hpLeft/Math.max(1,wins)*100).toFixed(0)}%  rounds ${(rounds/n).toFixed(1)}`;
}
for(const l of [3,5]) console.log(run(l,'world',300));
for(const l of [5,7,9]) console.log(run(l,'dungeon',300));
for(const l of [7,9,11]) console.log(run(l,'dungeon',1,true).replace('1','1'), run(l,'dungeon',100,true));
