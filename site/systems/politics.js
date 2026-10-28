/** Each faction has businesses, alliances, rivalries and changing leadership. */
import {clamp} from '../core/runtime.js';
export const STARTING_FAMILY_BUSINESSES={
 bell:[['旧城公寓','物业租赁','地下放贷','s5'],['钟楼舞厅','娱乐经营','地下赌局','s8']],
 sail:[['银帆货运','港口物流','运输市场操纵','s2'],['银帆仓储','仓库租赁','违规货运','s6']],
 kestrel:[['红隼夜场','演出经营','街头敲诈','s12'],['红隼车行','汽车维修','暴力委托','s10']],
 raven:[['灰鸦咨询','商业中介','情报交易','s7'],['灰鸦旅馆','旅馆经营','地下联络','s15']]
};
export const politicsSystem={
 id:'politics',deps:['factions','people','clock','society'],
 init:()=>({
  families:Object.fromEntries(Object.entries(STARTING_FAMILY_BUSINESSES).map(([id,list])=>[id,{
    treasury:260,leader:{bell:'卢卡',sail:'林先生',kestrel:'羽老大',raven:'维先生'}[id],
    legitimacy:45,internalStress:id==='bell'?51:26,coups:0,
    businesses:list.map(([name,main,side,cell],i)=>({id:id+'-shop-'+i,name,main,side,cell,earnings:0,active:true}))
  }])),
  ties:[{a:'bell',b:'sail',value:13,status:'neutral'},{a:'bell',b:'kestrel',value:-45,status:'feud'},
   {a:'sail',b:'raven',value:22,status:'neutral'},{a:'kestrel',b:'raven',value:-19,status:'neutral'}],
  rivalIncidents:[],settlements:[],daysOfCalm:0,playerReputation:'互助组织'
 }),
 reduce(data,a,{context,day,slices}){
  if(a.type==='offer'){
   const family=data.families[a.faction];
   if(!family)return {error:'此家族不存在'};
   if(!['peace','cooperate','refuse'].includes(a.offer))return {error:'外交提案无效'};
   if(data.settlements.some(t=>t.day===day&&t.faction===a.faction))return {error:'今天已向该家族提出方案'};
   if(a.offer==='cooperate'&&context.cash<40)return {error:'合作方案需要40元成本'};
   const accepted=a.offer==='peace'||(a.offer==='cooperate'&&family.internalStress<65);
   data.settlements.push({day,faction:a.faction,offer:a.offer,accepted});
   family.internalStress=clamp(family.internalStress+(accepted?-3:2));
   return {data,events:[{type:'politics.treaty',title:'家族会晤',text:a.faction+'：'+(accepted?'愿意进行'+(a.offer==='peace'?'停火':'商业合作')+'。':'目前拒绝这一提案。')}],
    effects:a.offer==='cooperate'?[{kind:'cash',amount:-40,label:'商业合作谈判费用'}]:[]};
  }
  if(a.type==='protect'){
   if(context.cash<30)return {error:'需要至少30元提供街区援助与合法安保'};
   const district=slices.factions.cells.find(c=>c.id===a.cell);
   if(!district)return {error:'街区无效'};
   if(data.rivalIncidents.some(x=>x.day===day&&x.protected===a.cell))return {error:'今日已援助该街区'};
   data.rivalIncidents.push({id:'protection-'+day+'-'+a.cell,day,protected:a.cell,kind:'protection'});
   return {data,events:[{type:'politics.protection',title:'平民保护行动',text:'志愿巡查和法律协助已送达'+district.name+'，帮助商户应对骚扰。'}],
    effects:[{kind:'cash',amount:-30,label:'社区合法安保和维权支持'},{kind:'respect',amount:2,label:'街区信任'}]};
  }
  return {error:'未知外交行动'};
 },
 tick(data,{day,signal,slices}){
  const events=[];
  for(const [id,f] of Object.entries(data.families)){
    const income=f.businesses.reduce((n,shop,i)=>{
      const gross=23+(i*6)+Math.floor(signal(shop.id)*10);
      shop.earnings=gross;return n+gross;
    },0);
    const overhead=20+f.businesses.length*7;
    f.treasury+=income-overhead;
    if(day%5===0)events.push({type:'politics.business',title:'家族经营',text:f.businesses[0].name+'等企业有新的收益与业务往来。',faction:id});
    if(id==='bell'&&day%4===0)f.internalStress=clamp(f.internalStress+3);
    if(f.internalStress>=65&&day%7===0){
      const old=f.leader;f.leader=id==='bell'?'钟楼·继任委员会':id==='kestrel'?'斧头组长':'新任理事';
      f.coups++;f.internalStress=32;
      events.push({type:'politics.succession',title:'家族权力更迭',text:id+' 内部派系逼迫 '+old+' 交出控制权，组织领导层重组。'});
    }
  }
  // Street gang pressure and retaliations are visible events, not tactical instructions.
  if(day%3===0){
   const cell=slices.factions.cells[10+(day%6)];
   const incident={id:'street-'+day,day,cell:cell.id,kind:'街头团伙纠纷',faction:'kestrel',
    civilianImpact:2+(day%3),severity:2};
   data.rivalIncidents.unshift(incident);
   events.push({type:'politics.street',title:'街巷冲突',text:'红隼会外围的“铁斧组”在'+cell.name+'与其他混混发生纠纷，附近店铺暂时关门。',cell:cell.id});
  }
  for(const t of data.ties){
    if(day%6===0)t.value=clamp(t.value+(signal(t.a+t.b)>.6?7:-4),-100,100);
    t.status=t.value>=40?'allied':t.value<=-40?'feud':'neutral';
  }
  data.rivalIncidents=data.rivalIncidents.slice(0,50);data.settlements=data.settlements.slice(-40);
  return {data,events};
 }
};