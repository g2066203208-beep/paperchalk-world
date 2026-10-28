/** Interactive office systems. Pure domain rules: real contacts, invoices, visits and allocations. */
import {CREW,availableCrew,setOrder,zoneInfo,crewInfo,endDay} from './engine.js';

export const CONTACTS=[
 {id:'kai',num:'201',name:'阿凯',type:'组织成员',hint:'请他到办公室汇报'},
 {id:'mio',num:'221',name:'米娅',type:'组织成员',hint:'约她来谈街区关系'},
 {id:'supplier',num:'305',name:'仓库供货商',type:'生意',hint:'订购下一趟运输需要的货'},
 {id:'broker',num:'409',name:'街头中间人',type:'线索',hint:'获得新的待批示委托'},
 {id:'advisor',num:'418',name:'事务顾问',type:'财务',hint:'支付咨询费，降低关注'},
 {id:'informant',num:'532',name:'城区情报员',type:'调查',hint:'付费获取区域风险情报'}
];
export const DOSSIERS=[
 {id:'freight',name:'旧港货款委托',dept:'物流 / 旧港',description:'请一名成员负责收取货款，处理结果将在次日汇报。'},
 {id:'meeting',name:'市集拜访申请',dept:'人脉 / 市集',description:'批准前往市集拜访关键联系人，建立新的社会关系。'},
 {id:'audit',name:'仓库安全审计',dept:'事务 / 旧港',description:'拨出一笔预算，核查仓库管理与外来压力。'}
];
const copy=v=>structuredClone(v);
const clamp=v=>Math.max(0,Math.min(100,Math.round(v)));
function stamp(s,label,amount){s.ledger.unshift({day:s.day,label,amount});}
export function initialOffice(){
 return {version:1,day:1,venue:'office',contactsUsed:[],supply:0,storedCash:0,
  visitorQueue:[{id:'kai',title:'今日报告',kind:'report'}],visitor:null,
  doorOpen:false,heardKnock:false,visited:[],
  dossierStatus:{freight:'pending',meeting:'pending',audit:'pending'},
  bonus:{logistics:0,relations:0},equipment:'locked',info:null,phoneHistory:[]};
}
export function normalizeOffice(value,state){
 const m=copy(value&&value.version===1?value:initialOffice());
 if(!Array.isArray(m.contactsUsed)||!Array.isArray(m.visitorQueue)||!Array.isArray(m.phoneHistory)||!m.dossierStatus||!m.bonus)return initialOffice();
 if(!['office','street'].includes(m.venue))m.venue='office';
 if(m.day!==state.day){m.day=state.day;m.contactsUsed=[];m.dossierStatus={freight:'pending',meeting:'pending',audit:'pending'};m.bonus={logistics:0,relations:0};}
 return m;
}
const result=(ok,state,meta,message,extra={})=>({ok,state,meta,message,...extra});
export function queueVisitor(state,meta,id,title='当面汇报',kind='report'){
 if(!CREW.some(c=>c.id===id))return result(false,state,meta,'找不到这名成员');
 if(!state.crew.includes(id))return result(false,state,meta,'这名成员尚未加入');
 const m=copy(meta);
 if((m.visitor?.id===id)||m.visitorQueue.some(v=>v.id===id))return result(false,state,meta,'他已经在办公室附近');
 m.visitorQueue.push({id,title,kind});return result(true,state,m,'已通知 '+crewInfo(id).name+' 前来办公室');
}
export function dial(state,meta,digits,zone='harbor'){
 const c=CONTACTS.find(x=>x.num===digits);
 if(!c)return result(false,state,meta,'号码不存在，请查通讯录');
 if(meta.contactsUsed.includes(c.id))return result(false,state,meta,c.name+' 今天已经联系过');
 let s=copy(state),m=copy(meta),msg='',price=0;
 if(c.id==='kai'||c.id==='mio'){
  if(!availableCrew(s).includes(c.id))return result(false,state,meta,'成员正在执行任务，无法回到办公室');
  if(m.visitor?.id===c.id||m.visitorQueue.some(v=>v.id===c.id))return result(false,state,meta,'成员已经在路上');
  m.visitorQueue.push({id:c.id,title:'电话约见',kind:'report'});
  msg=c.name+'确认会来办公室当面汇报';
 }else if(c.id==='supplier'){
  price=60;if(s.cash<price)return result(false,state,meta,'订货需要至少 60 元');
  s.cash-=price;m.supply++;stamp(s,'电话订购仓库货品',-price);msg='已订购一批货品，下次收款任务额外收入 65 元';
 }else if(c.id==='broker'){
  m.dossierStatus.freight='pending';m.dossierStatus.meeting='pending';
  s.respect=clamp(s.respect+1);msg='中间人送来两份新的委托，已加入文件夹';
 }else if(c.id==='advisor'){
  price=45;if(s.cash<price)return result(false,state,meta,'咨询需要至少 45 元');
  s.cash-=price;s.heat=clamp(s.heat-9);stamp(s,'外部事务顾问费用',-price);msg='事务顾问已处理风险，关注 -9';
 }else if(c.id==='informant'){
  price=25;if(s.cash<price)return result(false,state,meta,'情报费用不足');
  if(!zoneInfo(zone))return result(false,state,meta,'未知城区');
  s.cash-=price;stamp(s,'城区情报费用',-price);
  const z=s.zones[zone];z.pressure=clamp(z.pressure-7);
  m.info={zone,day:s.day,pressure:z.pressure};
  msg=zoneInfo(zone).name+'最新竞争压力 '+z.pressure+'，调查使压力 -7';
 }
 m.contactsUsed.push(c.id);
 m.phoneHistory.unshift({day:s.day,num:digits,name:c.name,result:msg});
 return result(true,s,m,msg,{contact:c});
}
export function decideDossier(state,meta,id,decision){
 const item=DOSSIERS.find(d=>d.id===id);
 if(!item||!['approve','decline'].includes(decision))return result(false,state,meta,'批示不合法');
 if(meta.dossierStatus[id]!=='pending')return result(false,state,meta,'这份文件已处理');
 const m=copy(meta),s=copy(state);
 if(decision==='decline'){m.dossierStatus[id]='declined';return result(true,s,m,'已退回 '+item.name);}
 if(id==='audit'){
  if(s.cash<40)return result(false,state,meta,'审计资金不足（40 元）');
  s.cash-=40;s.heat=clamp(s.heat-3);s.zones.harbor.pressure=clamp(s.zones.harbor.pressure-9);
  stamp(s,'批准仓库安全审计',-40);
 }else{
  const member=availableCrew(s)[0];
  if(!member)return result(false,state,meta,'今天没有空闲成员，不能批准');
  const r=setOrder(s,member,id==='freight'?'harbor':'market',id==='freight'?'deliver':'network');
  if(!r.ok)return result(false,state,meta,r.message);
  Object.assign(s,r.state);
 }
 m.dossierStatus[id]='approved';
 return result(true,s,m,'已签署 '+item.name+'，命令生效');
}
export function allocate(state,meta,target){
 if(!['logistics','relations'].includes(target))return result(false,state,meta,'预算类别无效');
 const cost=target==='logistics'?40:35;
 if(state.cash<cost)return result(false,state,meta,'现金不足');
 if(meta.bonus[target]>=2)return result(false,state,meta,'该类本日最多追加两次');
 const s=copy(state),m=copy(meta);s.cash-=cost;m.bonus[target]++;
 stamp(s,target==='logistics'?'运输保障预算':'社区关系预算',-cost);
 return result(true,s,m,'已划拨 '+cost+' 元，明日结算将产生对应效果');
}
export function transferSafe(state,meta,amount){
 if(!Number.isInteger(amount)||Math.abs(amount)!==50)return result(false,state,meta,'每次存取固定 50 元');
 const s=copy(state),m=copy(meta);
 if(amount>0){if(s.cash<50)return result(false,state,meta,'没有足够现金');s.cash-=50;m.storedCash+=50;}
 else{if(m.storedCash<50)return result(false,state,meta,'保险抽屉储备不足');s.cash+=50;m.storedCash-=50;}
 stamp(s,amount>0?'现金放入保险抽屉':'从保险抽屉取款',amount>0?-50:50);
 return result(true,s,m,amount>0?'已存入 50 元备用金':'已取出 50 元备用金');
}
export function equip(state,meta,mode){
 if(!['locked','kai'].includes(mode))return result(false,state,meta,'保管方式无效');
 const m=copy(meta),s=copy(state);
 if(m.equipment===mode)return result(false,state,meta,'已经按此方式保管');
 if(mode==='kai'&&!s.crew.includes('kai'))return result(false,state,meta,'该成员不在组织');
 m.equipment=mode;
 if(mode==='locked')s.heat=clamp(s.heat-2);else s.heat=clamp(s.heat+2);
 return result(true,s,m,mode==='locked'?'已将旧枪锁回抽屉，关注 -2':'阿凯登记领取旧枪，关注 +2');
}
export function openDoor(state,meta){
 const m=copy(meta);
 if(m.venue==='street')return result(false,state,meta,'你不在办公室');
 if(m.visitor)return result(false,state,meta,'来客正在室内');
 if(m.visitorQueue.length){
  m.visitor=m.visitorQueue.shift();m.doorOpen=true;m.heardKnock=true;
  return result(true,state,m,crewInfo(m.visitor.id)?.name+' 推门进来，走到办公桌前',{visitor:m.visitor});
 }
 m.venue='street';m.doorOpen=true;
 return result(true,state,m,'你离开办公室，走进夜港街区');
}
export function visitorAction(state,meta,choice){
 if(!meta.visitor)return result(false,state,meta,'现在没有来客');
 if(!['hear','assign','dismiss'].includes(choice))return result(false,state,meta,'无效回应');
 const m=copy(meta),s=copy(state),v=m.visitor;
 let message='';
 if(choice==='hear'){
   s.respect=clamp(s.respect+1);
   s.reports.unshift({id:'meeting-'+s.day+'-'+v.id,day:s.day,crew:v.id,title:'到访汇报',body:crewInfo(v.id).name+'当面汇报了本日情况，并确认服从你接下来的安排。',outcome:'声望 +1'});
   message='已经听取 '+crewInfo(v.id).name+' 的当面汇报，声望 +1';
 }else if(choice==='assign'){
   const mission=v.id==='mio'?'network':'deliver',zone=v.id==='mio'?'market':'harbor';
   const r=setOrder(s,v.id,zone,mission);
   if(!r.ok)return result(false,state,meta,r.message);
   Object.assign(s,r.state);message='直接委托 '+crewInfo(v.id).name+' 外出执行 '+mission+' 任务';
 }else message=crewInfo(v.id).name+' 退出办公室';
 m.visitor=null;m.doorOpen=false;m.visited.push({day:s.day,id:v.id,choice});
 return result(true,s,m,message);
}
export function travel(state,meta,place){
 if(meta.venue!=='street')return result(false,state,meta,'请先从办公室门离开');
 const s=copy(state),m=copy(meta);
 if(place==='office'){m.venue='office';m.doorOpen=false;return result(true,s,m,'回到办公室');}
 if(!['harbor','market','neon'].includes(place))return result(false,state,meta,'没有这个可到达的位置');
 if(m.visited.some(v=>v.day===s.day&&v.place===place))return result(false,state,meta,'今天已经去过这个地点');
 const z=s.zones[place];
 if(place==='harbor'){s.cash+=35;stamp(s,'在旧港收取现场款项',35);}
 if(place==='market'){s.respect=clamp(s.respect+2);z.influence=clamp(z.influence+3);}
 if(place==='neon'){s.heat=clamp(s.heat+3);z.pressure=clamp(z.pressure-6);}
 m.visited.push({day:s.day,place});return result(true,s,m,'已走访 '+zoneInfo(place).name+'，经营状态已更新');
}
export function advance(state,meta){
 const r=endDay(state);if(!r.ok)return result(false,state,meta,r.message);
 let s=r.state,m=copy(meta);
 const delivers=r.generated.filter(x=>x.outcome.startsWith('收入 +'));
 let extra=0;
 for(const d of delivers){if(m.supply<=0)break;m.supply--;extra+=65;}
 extra+=m.bonus.logistics*30*delivers.length;
 if(extra){s.cash+=extra;stamp(s,'运输补给和预算追加收益',extra);}
 if(m.bonus.relations){s.respect=clamp(s.respect+m.bonus.relations*2);s.zones.market.influence=clamp(s.zones.market.influence+m.bonus.relations*3);}
 m.day=s.day;m.contactsUsed=[];m.bonus={logistics:0,relations:0};
 m.dossierStatus={freight:'pending',meeting:'pending',audit:'pending'};
 m.visitor=null;m.doorOpen=false;m.venue='office';
 m.visitorQueue=[{id:s.day%2===0?'mio':'kai',title:'新一天的汇报',kind:'report'}];
 return result(true,s,m,'新一天开始。'+r.generated.length+' 份行动报告，额外收入 '+extra+' 元。',{generated:r.generated});
}
