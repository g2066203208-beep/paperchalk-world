import {CANDIDATES} from './systems/recruitment.js';
/** NIGHT OFFICE / original playable vertical slice. Deterministic and offline, browser-independent. */
export const DISTRICTS=[
{id:'harbor',name:'旧港',x:143,y:272,influence:28,pressure:18,pay:155,color:'#bc655e',blurb:'码头仓库和旧货轮，是你的第一条街。'},
{id:'market',name:'市集',x:330,y:132,influence:8,pressure:28,pay:185,color:'#d3a76a',blurb:'每张账单都经过别人的手。'},
{id:'midtown',name:'中城',x:520,y:270,influence:0,pressure:40,pay:235,color:'#6a93aa',blurb:'新的夜晚，旧的势力。'},
{id:'neon',name:'霓虹街',x:363,y:376,influence:0,pressure:58,pay:295,color:'#bf6d85',blurb:'灯光照不见真实的面孔。'}
];
export const CREW=[
{id:'kai',name:'阿凯',role:'跑腿与运输',skill:'deliver',trait:'脚程快 · 风险低',face:'K',tone:'#d5a66e'},
{id:'mio',name:'米娅',role:'交涉与情报',skill:'network',trait:'善于和人谈判',face:'M',tone:'#a9bfd2'},
{id:'leo',name:'雷欧',role:'调查与侦察',skill:'scout',trait:'熟悉陌生街区',face:'L',tone:'#c9a3af'},
 ...CANDIDATES.filter(c=>!['mio','leo'].includes(c.id)).map(c=>({id:c.id,name:c.name,role:c.role,skill:c.skill,trait:c.trait,face:c.face,tone:c.tone}))
];
export const MISSIONS=[
{id:'deliver',title:'收取货款',short:'跑单',description:'获得现金，可能引发关注。'},
{id:'network',title:'拜访关系人',short:'交涉',description:'增加街区影响力与声望。'},
{id:'scout',title:'调查街区',short:'调查',description:'降低街区压力并发现情报。'}
];
export const GOALS={cash:1400,respect:24,hold:2};
export function initialGame(){
 return {version:4,day:1,cash:190,heat:12,respect:1,crew:['kai'],zones:Object.fromEntries(DISTRICTS.map(d=>[d.id,{influence:d.influence,pressure:d.pressure}])),
 orders:[], reports:[{id:'intro',day:1,crew:'kai',title:'第一次汇报',body:'办公室钥匙终于到手了，墙还是毛坯。街上又在讲那晚两个蒙面人的事……他们没人知道我们的身份。现在就我们两个人，没有一块地盘。',outcome:'你和阿凯：旧港孤儿院的两个孩子，买下毛坯办公室，余款190元。'}],
 call:{id:'welcome',answered:false},callHistory:[],ledger:[{day:1,label:'买下毛坯办公室后余下的启动资金',amount:190}],flags:{gunSeen:false},won:false};
}
export const crewInfo=id=>CREW.find(c=>c.id===id);
export const zoneInfo=id=>DISTRICTS.find(d=>d.id===id);
export const missionInfo=id=>MISSIONS.find(m=>m.id===id);
export function availableCrew(s){return s.crew.filter(id=>!(s.detained||[]).includes(id)&&!s.orders.some(o=>o.crew===id));}
export function canOrder(s,crew,zone,mission){
 const person=crewInfo(crew),place=zoneInfo(zone),job=missionInfo(mission);
 if(!person||!place||!job)return {ok:false,reason:'请选择人手、目的地和行动'};
 if(!s.crew.includes(crew))return {ok:false,reason:'这名成员尚未加入'};
 if(!availableCrew(s).includes(crew))return {ok:false,reason:'这名成员今天已经有任务'};
 if(s.orders.length>=s.crew.length)return {ok:false,reason:'今天没有空闲人手'};
 const cost=mission==='network'?25:mission==='scout'?10:0;
 if(s.cash<cost)return {ok:false,reason:'可用资金不足'};
 return {ok:true,cost};
}
export function setOrder(state,crew,zone,mission){
 const check=canOrder(state,crew,zone,mission);
 if(!check.ok)return {ok:false,state,message:check.reason};
 const s=structuredClone(state);
 s.cash-=check.cost;
 s.orders.push({id:s.day+'-'+crew,crew,zone,mission,cost:check.cost});
 if(check.cost)s.ledger.unshift({day:s.day,label:'安排'+missionInfo(mission).title+'：'+zoneInfo(zone).name,amount:-check.cost});
 return {ok:true,state:s,message:crewInfo(crew).name+'已接受任务：'+zoneInfo(zone).name+' · '+missionInfo(mission).title};
}
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(n)));
function taskResult(s,order){
 const c=crewInfo(order.crew),d=zoneInfo(order.zone),z=s.zones[d.id];
 const skilled=c.skill===order.mission, roll=(s.day*7+c.id.length*11+d.x+order.mission.length*5)%9;
 let amount=0,text='';
 if(order.mission==='deliver'){
   amount=Math.round(d.pay*(skilled?1.25:0.82)+(roll-4)*8);
   s.cash+=amount;
   s.heat=clamp(s.heat+(z.pressure>=45?8:4));
   z.influence=clamp(z.influence+(skilled?3:1));
   text='在'+d.name+'收回了 '+amount+' 元货款。'+(z.pressure>=45?'当地人盯得很紧。':'目前仍算顺利。');
 } else if(order.mission==='network'){
   amount=skilled?17:10;
   z.influence=clamp(z.influence+amount);
   s.respect=clamp(s.respect+(skilled?4:2));
   z.pressure=clamp(z.pressure+2);
   text='结识了新的街区联系人。'+d.name+'影响力增加 '+amount+' 点。';
 } else {
   amount=skilled?15:9;
   z.pressure=clamp(z.pressure-amount);
   s.heat=clamp(s.heat-3);
   s.respect=clamp(s.respect+1);
   text='摸清了当地关系。'+d.name+'的竞争压力降低 '+amount+' 点。';
 }
 return {id:order.id,day:s.day,crew:c.id,title:d.name+' · '+missionInfo(order.mission).title,body:text,
  outcome:order.mission==='deliver'?'收入 +'+amount:order.mission==='network'?'影响力 +'+amount:'压力 -'+amount,zone:d.id};
}
export function endDay(state){
 const s=structuredClone(state);
 const dispatched=s.orders.length;
 if(!dispatched&&!s.call.answered)return {ok:false,state,message:'先处理电话，或至少安排一名成员'};
 const newReports=[];
 for(const order of s.orders){
  const report=taskResult(s,order);
  newReports.push(report);
  if(order.mission==='deliver')s.ledger.unshift({day:s.day,label:zoneInfo(order.zone).name+' · 货款',amount:parseInt(report.outcome.split('+')[1],10)});
 }
 const rent=35+s.crew.length*14;
 s.cash-=rent;
 s.ledger.unshift({day:s.day,label:'自有办公室维护、水电与团队开支',amount:-rent});
 s.heat=clamp(s.heat-2);
 s.day++;
 s.orders=[];
 s.call={id: s.day%3===0?'rival':s.day%2===0?'neighbor':'supplier',answered:false};
 // 后续成员只通过自愿招募入职，绝不无缘无故按日期赠送。
 s.reports=[...newReports,...s.reports].slice(0,40);
 s.won=s.cash>=GOALS.cash&&s.respect>=GOALS.respect&&DISTRICTS.filter(d=>s.zones[d.id].influence>=55).length>=GOALS.hold;
 return {ok:true,state:s,generated:newReports,message:'第 '+s.day+' 天，成员们带回了 '+newReports.length+' 份新报告。'};
}
export const phoneDetails=state=>{
 const id=state.call.id;
 if(id==='welcome')return {from:'旧港联系人',text:'“听说你终于有自己的办公室了。有人需要你替他跑一趟货，旧港这条路好走。想留下名字，就先做出一点动静。”',
 options:[{id:'yes',name:'接下这份人情',description:'获得 85 元，关注 +5'},{id:'no',name:'先观察局势',description:'降低关注 4'}]};
 if(id==='rival')return {from:'邻街的陌生人',text:'“你的人最近很忙啊。这里还有别的人做生意。你最好懂一点规矩。”',
 options:[{id:'yes',name:'耐心解释',description:'声望 +2，关注 -4'},{id:'no',name:'挂断电话',description:'关注 +7'}]};
 if(id==='neighbor')return {from:'旧城区店主',text:'“我这边有一份小委托。你派人来看看，大家可以互相照顾。”',
 options:[{id:'yes',name:'答应帮忙',description:'现金 +60，声望 +2'},{id:'no',name:'暂时婉拒',description:'关注 -3'}]};
 return {from:'仓库经理',text:'“有一笔货款需要有人出面谈谈。不急，但也别拖太久。”',
 options:[{id:'yes',name:'安排一次碰面',description:'现金 +90，关注 +6'},{id:'no',name:'让对方改天再说',description:'关注 -4'}]};
};
export function answerPhone(state,choice){
 if(state.call.answered)return {ok:false,state,message:'今天的通话已经结束'};
 if(!['yes','no'].includes(choice))return {ok:false,state,message:'未知回复'};
 const s=structuredClone(state),d=phoneDetails(s),id=s.call.id;
 if(id==='welcome'){
  if(choice==='yes'){s.cash+=85;s.heat=clamp(s.heat+5);s.ledger.unshift({day:s.day,label:'旧港人情委托',amount:85});}
  else s.heat=clamp(s.heat-4);
 }else if(id==='rival'){
  if(choice==='yes'){s.respect=clamp(s.respect+2);s.heat=clamp(s.heat-4);}
  else s.heat=clamp(s.heat+7);
 }else if(id==='neighbor'){
  if(choice==='yes'){s.cash+=60;s.respect=clamp(s.respect+2);s.ledger.unshift({day:s.day,label:'店主委托',amount:60});}
  else s.heat=clamp(s.heat-3);
 }else if(choice==='yes'){s.cash+=90;s.heat=clamp(s.heat+6);s.ledger.unshift({day:s.day,label:'仓库账款',amount:90});}
 else s.heat=clamp(s.heat-4);
 s.call.answered=true;s.callHistory.unshift({day:s.day,from:d.from,answer:d.options.find(o=>o.id===choice).name});
 return {ok:true,state:s,message:'通话结束：'+d.options.find(o=>o.id===choice).name};
}
export function markGunSeen(state){
 const s=structuredClone(state);s.flags.gunSeen=true;
 return {state:s,ok:true,message:'旧物证：枪身上的刻字“NO KINGS”提醒你，权力从来不只靠武力。'};
}
export function restore(raw){
 try{
  const s=typeof raw==='string'?JSON.parse(raw):raw;
  if(!s||s.version!==4||!Number.isInteger(s.day)||s.day<1||s.day>10000)return initialGame();
  if(!Number.isInteger(s.cash)||Math.abs(s.cash)>1e9||!Number.isInteger(s.heat)||s.heat<0||s.heat>100||
     !Number.isInteger(s.respect)||s.respect<0||s.respect>100)return initialGame();
  if(!Array.isArray(s.crew)||!s.crew.includes('kai')||s.crew.some(id=>!crewInfo(id)))return initialGame();
  if(!Array.isArray(s.orders)||s.orders.length>s.crew.length||s.orders.some(o=>!canOrderType(o)))return initialGame();
  if(new Set(s.orders.map(o=>o.crew)).size!==s.orders.length)return initialGame();
  if(!Array.isArray(s.reports)||s.reports.length>40||!Array.isArray(s.ledger)||s.ledger.length>1000||
     !Array.isArray(s.callHistory)||s.callHistory.length>1000)return initialGame();
  if(!s.call||typeof s.call.id!=='string'||!['welcome','rival','neighbor','supplier'].includes(s.call.id)||
     typeof s.call.answered!=='boolean'||typeof s.won!=='boolean'||typeof s.flags?.gunSeen!=='boolean')return initialGame();
  for(const d of DISTRICTS){
   const z=s.zones?.[d.id];
   if(!z||![z.influence,z.pressure].every(v=>Number.isInteger(v)&&v>=0&&v<=100))return initialGame();
  }
  return s;
 }catch{return initialGame();}
}
function canOrderType(o){return crewInfo(o?.crew)&&zoneInfo(o?.zone)&&missionInfo(o?.mission)&&typeof o.id==='string'&&Number.isInteger(o.cost)&&o.cost>=0;}
