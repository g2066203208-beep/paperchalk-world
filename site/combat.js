/** Night Harbor: non-graphic original 2D point-and-shoot encounter rules. */
const clone=v=>structuredClone(v);
const cap=(v,lo,hi)=>Math.max(lo,Math.min(hi,Math.round(v)));
export const TARGETS=[
 {id:'a',x:999,y:272,r:38,health:2,kind:'intruder',color:'#b55158'},
 {id:'b',x:733,y:289,r:35,health:2,kind:'intruder',color:'#a88377'},
 {id:'c',x:1090,y:336,r:31,health:2,kind:'intruder',color:'#a66c65'}
];
export function freshCombat(){return {version:1,mode:'holstered',mag:6,reserve:24,maxMag:6,hp:100,wave:0,alert:false,alertDay:0,enemies:[],shots:0,hits:0,knockdowns:0,roundDamage:0,roundsCompleted:0,lastEncounterDay:0,history:[],reloading:false};}
export function normalizeCombat(raw){if(!raw||raw.version!==1)return freshCombat();const s=clone(raw);if(!['holstered','aim','fight','won','lost'].includes(s.mode)||!Number.isInteger(s.mag)||s.mag<0||s.mag>6||!Number.isInteger(s.reserve)||s.reserve<0||s.reserve>10000||!Number.isInteger(s.hp)||s.hp<0||s.hp>100||!Array.isArray(s.enemies)||s.enemies.length>3)return freshCombat();s.reloading=false;return s;}
export function draw(s){
 if(s.mode==='fight')return {ok:false,combat:s,message:'当前已经持枪'};
 const n=clone(s);n.mode='aim';n.reloading=false;return {ok:true,combat:n,message:'已经拿起旧枪。鼠标移动准星，点击射击；R 换弹，Esc 收枪。'};
}
export function holster(s){
 if(s.mode==='fight')return {ok:false,combat:s,message:'遭遇正在进行，请击退来客或使用掩体撤退'};
 const n=clone(s);n.mode='holstered';n.reloading=false;n.enemies=[];return {ok:true,combat:n,message:'枪已放回桌上'};
}
export function beginEncounter(s,stage=1,day=1){
 if(s.mode==='fight')return {ok:false,combat:s,message:'正在交火'};
 if(s.lastEncounterDay===day)return {ok:false,combat:s,message:'今天已经经历过办公室袭击'};
 if(s.hp===0)return {ok:false,combat:s,message:'伤势尚未恢复'};
 const n=clone(s);n.mode='fight';n.lastEncounterDay=day;n.wave=stage;n.alert=false;n.reloading=false;n.roundDamage=0;n.enemies=TARGETS.map((e,i)=>({...e,health:stage===1?e.health:Math.min(4,e.health+1),active:i<Math.min(3,stage+1)})).filter(e=>e.active);
 return {ok:true,combat:n,message:'门口传来急促脚步声，敌袭开始！'};
}
export function reload(s){
 if(!['aim','fight'].includes(s.mode))return {ok:false,combat:s,message:'先拿起枪'};
 if(s.reloading)return {ok:false,combat:s,message:'正在换弹'};
 if(s.mag===s.maxMag||s.reserve===0)return {ok:false,combat:s,message:'无需换弹或备用子弹已经用尽'};
 const n=clone(s);n.reloading=true;return {ok:true,combat:n,message:'开始换弹'};
}
export function finishReload(s){
 if(!s.reloading)return {ok:false,combat:s,message:'没有正在进行的换弹'};
 const n=clone(s),needed=Math.min(n.maxMag-n.mag,n.reserve);n.mag+=needed;n.reserve-=needed;n.reloading=false;
 return {ok:true,combat:n,message:'换弹完毕（'+n.mag+' / '+n.reserve+'）'};
}
export function fire(s,x,y,now=0){
 if(!['aim','fight'].includes(s.mode))return {ok:false,combat:s,message:'未进入持枪模式'};
 if(s.reloading)return {ok:false,combat:s,message:'正在换弹'};
 if(s.mag<1)return {ok:false,combat:s,message:'弹匣已空，按 R 换弹'};
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>1200||y<0||y>670)return {ok:false,combat:s,message:'准星不在场景中'};
 const n=clone(s);n.mag--;n.shots++;
 let hit=false,knocked=false,victim=null;
 if(s.mode==='fight'){
  // Axis-scaled ellipse: chest/head visible target, not huge circular bounding box.
  for(const e of n.enemies){
   const dx=(x-e.x)/(e.r*.83),dy=(y-e.y)/(e.r*1.5);
   if(dx*dx+dy*dy<=1){
    e.health--;hit=true;victim=e.id;n.hits++;
    if(e.health<=0){n.knockdowns++;knocked=true;}
    break;
   }
  }
  n.enemies=n.enemies.filter(e=>e.health>0);
  if(!n.enemies.length)n.mode='won';
 }else{
  // Practice mode: target board is centered near the doorway. Does not hurt an NPC.
  hit=((x-991)/50)**2+((y-300)/72)**2<=1;
  if(hit)n.hits++;
 }
 return {ok:true,combat:n,hit,knocked,victim,point:{x,y},message:hit?'命中！': '射击未命中'};
}
export function enemyTick(s){
 if(s.mode!=='fight'||s.reloading)return {ok:false,combat:s};
 const n=clone(s);const incoming=Math.max(3,n.enemies.length*4);
 n.hp=cap(n.hp-incoming,0,100);n.roundDamage+=incoming;
 if(n.hp===0)n.mode='lost';
 return {ok:true,combat:n,damage:incoming,message:n.hp===0?'你被迫撤回掩体':'遭到反击，生命 -'+incoming};
}
export function retreat(s){
 if(s.mode!=='fight')return {ok:false,combat:s,message:'当前没有遭遇'};
 const n=clone(s);n.mode='lost';return {ok:true,combat:n,message:'你撤到安全地点，放弃本次防守'};
}
export function settle(s,state,meta){
 if(!['won','lost'].includes(s.mode))return {ok:false,combat:s,state,meta,message:'遭遇尚未结束'};
 const n=clone(s),game=clone(state),m=clone(meta),win=n.mode==='won';
 if(win){game.respect=cap(game.respect+5,0,100);game.cash+=90;game.heat=cap(game.heat+12,0,100);game.ledger.unshift({day:game.day,label:'守卫办公室后的追回资金',amount:90});}
 else {game.cash-=60;game.heat=cap(game.heat+5,0,100);game.ledger.unshift({day:game.day,label:'办公室修理及善后',amount:-60});}
 n.roundsCompleted++;n.history.unshift({day:game.day,win,shots:n.shots,hits:n.hits,damage:n.roundDamage});
 n.history=n.history.slice(0,20);
 n.mode='holstered';n.hp=100;n.enemies=[];n.reloading=false;
 if(m.visitor){m.visitor=null;m.doorOpen=false;}
 return {ok:true,combat:n,state:game,meta:m,message:win?'防守成功：声望 +5、资金 +90、关注 +12':'防守失利：损失 60 元，关注 +5'};
}
export function signalEncounter(s,day,heat){
 const n=clone(s);
 if(day>=2&&day%3===2&&heat>=14&&n.alertDay!==day){n.alert=true;n.alertDay=day;}
 return n;
}

export function buyAmmo(s,state){
 if(s.reserve>=120)return {ok:false,combat:s,state,message:'弹药已经装满'};
 if(state.cash<30)return {ok:false,combat:s,state,message:'购买弹药需要 30 元'};
 const n=clone(s),game=clone(state);n.reserve=Math.min(120,n.reserve+12);game.cash-=30;
 game.ledger.unshift({day:game.day,label:'办公室采购备用弹药（12发）',amount:-30});
 return {ok:true,combat:n,state:game,message:'购买 12 发备用弹药，现金 -30'};
}
