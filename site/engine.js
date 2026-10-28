/** 夜港：独立于视图的、可复现的黑帮经营模拟器。所有数值是虚构的游戏规则。 */
export const DISTRICTS=[
 {id:'dock',name:'旧码头',en:'OLD HARBOR',tag:'起步之地',photo:'photo-1519608487953-e999c86e7455',photoCredit:'Unsplash',cost:480,income:155,risk:1,initialRival:20,flavor:'潮水拍打仓库。这里没有你的名字，也没有人会替你记住它。',business:'仓库事务所',claimCost:330},
 {id:'oldtown',name:'老城街',en:'OLD QUARTER',tag:'工会与街坊',photo:'photo-1480714378408-67cf0d13bc1b',photoCredit:'Unsplash',cost:850,income:230,risk:2,initialRival:34,flavor:'旧招牌下是几十年的街坊生意。人情比现金更管用。',business:'街角餐厅',claimCost:570},
 {id:'night',name:'霓虹区',en:'NEON MILE',tag:'夜生活中心',photo:'photo-1514565131-fce0801e5785',photoCredit:'Unsplash',cost:1300,income:345,risk:3,initialRival:49,flavor:'午夜的灯亮得像白天。每个笑容背后都有交易。',business:'爵士俱乐部',claimCost:850},
 {id:'finance',name:'中心区',en:'CITY CENTER',tag:'资本的高地',photo:'photo-1519501025264-65ba15a82390',photoCredit:'Unsplash',cost:2100,income:520,risk:4,initialRival:63,flavor:'玻璃大楼倒映着城里的另一套秩序。',business:'投资公司',claimCost:1250},
 {id:'heights',name:'山顶区',en:'THE HEIGHTS',tag:'最后的门槛',photo:'photo-1494526585095-c41746248156',photoCredit:'Unsplash',cost:3400,income:800,risk:5,initialRival:77,flavor:'城里所有的灯都在脚下。想在这里说话，先拿出实力。',business:'私人会所',claimCost:1800}
];
export const CONFIG={goalCash:10000,goalRespect:70,goalDistricts:5,maxCrew:20};
export const photoUrl=(d,w=1100)=>'https://images.unsplash.com/'+d.photo+'?auto=format&fit=crop&w='+w+'&q=78';
export const getDistrict=(id)=>DISTRICTS.find(d=>d.id===id);
export const cashText=n=>'＄'+Math.round(n).toLocaleString('en-US');
export function createGame(){
 const zones=Object.fromEntries(DISTRICTS.map(d=>[d.id,{influence:d.id==='dock'?21:0,rival:d.initialRival,level:0,controlled:false,worked:-1,networked:-1,negotiated:-1,community:-1}]));
 return {version:3,week:1,cash:320,crew:1,loyalty:78,respect:6,heat:7,selected:'dock',
  zones,event:null,quiet:-1,history:[],log:[
   {week:1,title:'你的故事从码头开始',body:'口袋里只有 320 美元，一位愿意跟随你的朋友。没有产业，也没有地盘。先认识街坊，再想办法开一家自己的店。'}
  ],won:false,bankrupt:false};
}
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(n)));
const sCopy=s=>structuredClone(s);
const result=(state,ok,message)=>({state,ok,message});
const entry=(s,title,body)=>{s.log=[{week:s.week,title,body},...s.log].slice(0,14)};
export const ownedCount=s=>DISTRICTS.filter(d=>s.zones[d.id].controlled).length;
export const sitesCount=s=>DISTRICTS.filter(d=>s.zones[d.id].level>0).length;
export const payroll=s=>s.crew*45+35;
export const districtRevenue=(s,d)=>{
 const z=s.zones[d.id];
 if(z.level===0)return z.controlled?65:0;
 const mult=[0,1,1.64,2.35][z.level];
 const trust=.78+s.loyalty/450;
 const pressure=z.rival>75?.86:1;
 return Math.round(d.income*mult*trust*pressure)+(z.controlled?65:0);
};
export const weeklyFinance=s=>{
 const income=DISTRICTS.reduce((sum,d)=>sum+districtRevenue(s,d),0);
 const wages=payroll(s);
 const enforcement=s.heat>=65?Math.round((s.heat-64)*8):0;
 return {income,wages,enforcement,net:income-wages-enforcement};
};
const canPay=(s,cost)=>s.cash>=cost;
const allowed=s=>!s.bankrupt&&!s.event;
export function actionInfo(s,type,id=s.selected){
 const d=getDistrict(id),z=s.zones[id];
 if(type==='next')return {ok:allowed(s),cost:0,reason:s.event?'先处理本周事件':''};
 if(!d||!z)return {ok:false,cost:0,reason:'未知街区'};
 if(!allowed(s))return {ok:false,cost:0,reason:s.event?'先处理城内事件':'本局已破产'};
 let cost=0,reason='',done=false;
 switch(type){
  case 'hustle':done=z.worked===s.week;reason=done?'本周已完成街头跑单':'';break;
  case 'network':cost=65+d.risk*15;done=z.networked===s.week;reason=done?'本周已拜访过联系人':'';break;
  case 'negotiate':cost=115+d.risk*35;done=z.negotiated===s.week;reason=done?'本周已与当地势力交涉':'';break;
  case 'recruit':cost=160+s.crew*75;reason=s.crew>=CONFIG.maxCrew?'团队已达上限':'';break;
  case 'open':cost=d.cost;reason=z.level>0?'这里已有产业':z.influence<24?'需先建立至少 24 点街区影响力':s.crew<2?'至少需要两名团队成员':'';break;
  case 'upgrade':cost=Math.round(d.cost*(.65+z.level*.62));reason=z.level===0?'先开设产业':z.level>=3?'产业已升至最高等级':'';break;
  case 'claim':cost=d.claimCost;reason=z.controlled?'已掌控该街区':z.influence<65?'需要 65 点街区影响力':s.crew<2+ownedCount(s)?'需要更多团队成员支撑新地盘':s.respect<10?'声望至少达到 10':'';break;
  case 'community':cost=120+d.risk*25;done=z.community===s.week;reason=done?'本周已经维护过街坊关系':'';break;
  case 'quiet':cost=65;done=s.quiet===s.week;reason=done?'本周已经低调休整':'';break;
  default:return {ok:false,cost:0,reason:'未知行动'};
 }
 if(!reason&&done)reason='本周已进行';
 if(!reason&&cost>s.cash)reason='资金不足，还差 '+cashText(cost-s.cash);
 return {ok:!reason,cost,reason};
}
function checkMilestone(s){
 if(!s.won&&ownedCount(s)>=CONFIG.goalDistricts&&s.cash>=CONFIG.goalCash&&s.respect>=CONFIG.goalRespect){
  s.won=true;entry(s,'这座城已经记住你的名字','从一位码头熟人，到坐拥五区的组织首领。你仍可以继续经营，挑战更高资产。');
 }
 if(s.cash<-1200&&s.crew<=1){s.bankrupt=true;entry(s,'资金链断裂','组织无法维持开支。本局结束，可重新开始。');}
}
export function act(state,type,id=state?.selected){
 const info=actionInfo(state,type,id);
 if(!info.ok)return result(state,false,info.reason);
 if(type==='next')return nextWeek(state);
 const s=sCopy(state),d=getDistrict(id),z=s.zones[id];
 s.cash-=info.cost;
 let text='';
 switch(type){
  case 'hustle':{
   const take=145+s.crew*18+d.risk*34;
   s.cash+=take;s.heat=clamp(s.heat+5+d.risk);
   s.respect=clamp(s.respect+1);z.influence=clamp(z.influence+4);
   z.rival=clamp(z.rival+2);z.worked=s.week;
   text='接下街头委托，收入 '+cashText(take)+'。警方关注度上升。';break;
  }
  case 'network':{
   z.influence=clamp(z.influence+17+Math.floor(s.crew/3));
   s.respect=clamp(s.respect+2);z.networked=s.week;
   text='拜访商户、修复关系，本地影响力增加。';break;
  }
  case 'negotiate':{
   z.influence=clamp(z.influence+11);z.rival=clamp(z.rival-13);
   s.respect=clamp(s.respect+3);z.negotiated=s.week;
   text='与街区势力达成一项暂时的协议，对抗压力下降。';break;
  }
  case 'recruit':{
   s.crew++;s.loyalty=clamp(s.loyalty-3);s.respect=clamp(s.respect+1);
   text='新的伙伴加入。团队增加至 '+s.crew+' 人，今后每周需要支付工资。';break;
  }
  case 'open':{
   z.level=1;s.respect=clamp(s.respect+5);z.influence=clamp(z.influence+8);
   text='签下 '+d.business+'，从下周开始提供持续收入。';break;
  }
  case 'upgrade':{
   z.level++;s.respect=clamp(s.respect+3);
   text=d.business+' 提升至 '+z.level+' 级，未来收入提高。';break;
  }
  case 'claim':{
   z.controlled=true;z.influence=clamp(Math.max(z.influence,76));z.rival=clamp(z.rival-19);
   s.heat=clamp(s.heat+8+d.risk);s.respect=clamp(s.respect+9);
   text='街区的商会与联系人正式承认你的影响力。每周获得额外收益，但警方更关注你。';break;
  }
  case 'community':{
   z.influence=clamp(z.influence+10);s.loyalty=clamp(s.loyalty+8);s.heat=clamp(s.heat-5);
   z.community=s.week;
   text='资助街区活动，街坊信任和团队士气回升，关注度降低。';break;
  }
  case 'quiet':{
   s.heat=clamp(s.heat-17);s.loyalty=clamp(s.loyalty+4);s.quiet=s.week;
   text='暂缓高调活动，让组织休整一周。';break;
  }
 }
 entry(s,type==='open'||type==='upgrade'?'产业扩张':type==='claim'?'街区易主':'本周行动',d.name+'｜'+text);
 checkMilestone(s);
 return result(s,true,text);
}
const EVENTS=[
 {id:'audit',title:'突击核查',text:'监管部门开始调查城里的商铺，近期动作越大，审查越严格。',
  a:{text:'聘请顾问处理账务',cost:210,heat:-18,loyalty:0,rep:1},b:{text:'维持现状接受检查',cost:0,heat:10,loyalty:0,rep:-1}},
 {id:'rivals',title:'隔街的竞争者',text:'竞争帮派希望重新划分市场。有合作的空间，也有新的摩擦。',
  a:{text:'谈判并承担一笔费用',cost:185,heat:-3,loyalty:4,rep:3,rival:-16},b:{text:'坚持现有立场',cost:0,heat:8,loyalty:-3,rep:2,rival:12}},
 {id:'employees',title:'团队有了意见',text:'一名老成员认为分红太少。有人开始讨论离开。',
  a:{text:'发放额外奖金',cost:160,heat:0,loyalty:15,rep:0},b:{text:'要求继续忍耐',cost:0,heat:0,loyalty:-12,rep:-1}},
 {id:'opportunity',title:'新的商业机会',text:'有人邀请你参加一个地区经营联盟，代价不低，但会带来新的联系人。',
  a:{text:'加入合作计划',cost:230,heat:-2,loyalty:2,rep:7,influence:10},b:{text:'暂时不投资',cost:0,heat:0,loyalty:0,rep:0}}
];
export function eventInfo(s){
 if(!s.event)return null;
 return EVENTS.find(e=>e.id===s.event.id)||null;
}
function nextWeek(state){
 const s=sCopy(state);
 const {income,wages,enforcement,net}=weeklyFinance(s);
 s.cash+=net;
 s.history=[...s.history,{week:s.week,income,wages,enforcement,net,cash:s.cash}].slice(-26);
 s.week++;
 s.heat=clamp(s.heat-3+ownedCount(s));
 s.loyalty=clamp(s.loyalty-(net<0?3:0));
 for(const d of DISTRICTS){
  const z=s.zones[d.id];
  if(z.controlled){
   z.rival=clamp(z.rival+(s.heat>70?5:1));
   if(z.rival>=85){z.influence=clamp(z.influence-8);}
   if(z.influence<38){
    z.controlled=false;entry(s,'失去街区',d.name+' 的联盟瓦解，重新获得支持才能回归。');
   }
  }
 }
 const seed=((s.week*71+s.crew*23+ownedCount(s)*17)%11);
 if(s.week%3===0||seed===4){
  s.event={id:EVENTS[(s.week*7+ownedCount(s)+s.crew)%EVENTS.length].id,week:s.week};
 }
 entry(s,'财务结算 · 第 '+(s.week-1)+' 周','营业 '+cashText(income)+' － 工资及房租 '+cashText(wages)+(enforcement?' － 监管开销 '+cashText(enforcement):'')+' = '+(net>=0?'+':'')+cashText(net));
 checkMilestone(s);
 return result(s,true,'进入第 '+s.week+' 周。本周净现金流 '+(net>=0?'+':'')+cashText(net));
}
export function resolveEvent(state,choice){
 const e=eventInfo(state);
 if(!e)return result(state,false,'当前没有事件');
 if(choice!=='a'&&choice!=='b')return result(state,false,'未知事件选项');
 const pick=e[choice];
 if(state.cash<pick.cost)return result(state,false,'现金不足以支付该方案');
 const s=sCopy(state);s.cash-=pick.cost;
 s.heat=clamp(s.heat+pick.heat);s.loyalty=clamp(s.loyalty+pick.loyalty);s.respect=clamp(s.respect+pick.rep);
 if(pick.rival!==undefined)s.zones[s.selected].rival=clamp(s.zones[s.selected].rival+pick.rival);
 if(pick.influence!==undefined)s.zones[s.selected].influence=clamp(s.zones[s.selected].influence+pick.influence);
 s.event=null;
 entry(s,e.title,pick.text+'。');
 checkMilestone(s);
 return result(s,true,e.title+'：'+pick.text);
}
export function restore(raw){
 try{
  const s=typeof raw==='string'?JSON.parse(raw):raw;
  if(!s||s.version!==3||!getDistrict(s.selected))return createGame();
  for(const k of ['week','cash','crew','loyalty','respect','heat','quiet']){
   if(!Number.isInteger(s[k])||Math.abs(s[k])>1e9)return createGame();
  }
  if(s.week<1||s.crew<1||s.crew>CONFIG.maxCrew||s.loyalty<0||s.loyalty>100||
   s.respect<0||s.respect>100||s.heat<0||s.heat>100||s.quiet>s.week)return createGame();
  if(typeof s.won!=='boolean'||typeof s.bankrupt!=='boolean'||!Array.isArray(s.history)||s.history.length>26||
   !Array.isArray(s.log)||s.log.length>14)return createGame();
  if(s.event&&(!EVENTS.some(e=>e.id===s.event.id)||s.event.week!==s.week))return createGame();
  for(const d of DISTRICTS){
   const z=s.zones?.[d.id];
   if(!z||!Number.isInteger(z.influence)||z.influence<0||z.influence>100||
    !Number.isInteger(z.rival)||z.rival<0||z.rival>100||
    !Number.isInteger(z.level)||z.level<0||z.level>3||
    typeof z.controlled!=='boolean')return createGame();
   for(const k of ['worked','networked','negotiated','community'])if(!Number.isInteger(z[k])||z[k]>s.week)return createGame();
  }
  return s;
 }catch{return createGame();}
}
