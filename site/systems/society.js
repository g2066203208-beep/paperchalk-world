/** Oppressive state, poverty, labor and mutual aid. Local simulation, no political advocacy. */
import {clamp} from '../core/runtime.js';
export const AID_ACTIONS=[
 {id:'meals',name:'社区免费餐',cost:28,support:6,hope:4,poverty:-1,description:'让工人和失业家庭有一顿热饭'},
 {id:'clinic',name:'援助工伤患者',cost:35,support:8,hope:5,poverty:-1,description:'为贫困家庭支付基本医疗费用'},
 {id:'orphans',name:'资助儿童之家',cost:22,support:5,hope:5,poverty:0,description:'购买食物和课本，不把儿童当作雇工'},
 {id:'workers',name:'协助失业者求职',cost:24,support:7,hope:4,poverty:-2,description:'介绍正规工作与成人培训'}
];
export const societySystem={
 id:'society',deps:['clock','factions','population','estates'],
 init:()=>({government:{name:'港联邦临时政府',stability:29,legitimacy:18,corruption:76,policePressure:64,
  civilRights:24,publicDebt:83,industryCollapse:71,monthlyTax:12,licenseFee:5},
  poverty:79,unemployment:43,oppression:76,communitySupport:5,hope:14,childWelfare:18,
  citizenProtection:8,voluntaryDues:0,aidHistory:[],todayAids:[],history:[]}),
 reduce(data,a,{context,day}){
  if(a.type==='aid'){
    const act=AID_ACTIONS.find(x=>x.id===a.action);
    if(!act)return {error:'无此项互助项目'};
    if(data.todayAids.includes(act.id))return {error:'今天已经开展该项援助'};
    if(context.cash<act.cost)return {error:'援助资金不足'};
    data.todayAids.push(act.id);data.communitySupport=clamp(data.communitySupport+act.support);
    data.hope=clamp(data.hope+act.hope);data.poverty=clamp(data.poverty+act.poverty);
    data.childWelfare=clamp(data.childWelfare+(act.id==='orphans'?9:0));
    data.citizenProtection=clamp(data.citizenProtection+(act.id==='clinic'?3:1));
    data.aidHistory.unshift({id:'aid-'+day+'-'+act.id,day,action:act.id,cost:act.cost});
    return {data,events:[{type:'society.aid',title:'街区互助',text:'今天开展了'+act.name+'：'+act.description+'。',action:act.id}],
      effects:[{kind:'cash',amount:-act.cost,label:'社区互助：'+act.name},{kind:'respect',amount:2,label:'街坊信任'}]};
  }
  if(a.type==='dues'){
    if(data.voluntaryDues===day)return {error:'今天已经召开商户互助募捐'};
    if(data.communitySupport<25)return {error:'社区尚不信任组织，无人愿意自发捐款'};
    data.voluntaryDues=day;
    const amount=Math.min(80,Math.floor(data.communitySupport*.55));
    return {data,events:[{type:'society.dues',title:'自愿会费',text:'商户自愿向街区互助基金缴纳 '+amount+' 元，不能强迫任何人参与。'}],
      effects:[{kind:'cash',amount:amount,label:'街区商户自愿互助会费'}]};
  }
  return {error:'未知社区行动'};
 },
 tick(data,{day,slices,events,signal}){
  const gov=data.government;
  data.todayAids=[];
  // Economic decay and resident support independently influence social conditions.
  const shops=slices.estates?.parcels?.filter(p=>p.owner==='player'&&p.building&&p.building.type!=='office').length||0;
  const protection=Math.min(5,Math.floor(data.communitySupport/25));
  data.unemployment=clamp(data.unemployment+(day%5===0?1:0)-(shops>0?1:0));
  data.poverty=clamp(data.poverty+(data.unemployment>45?1:0)-(shops>1?1:0));
  data.hope=clamp(data.hope+(data.communitySupport>40?1:0)-(gov.stability<25&&day%4===0?1:0));
  gov.stability=clamp(gov.stability+(day%9===0?signal('cabinet')>.5?2:-3:0));
  gov.legitimacy=clamp(gov.legitimacy+(data.poverty>80&&day%6===0?-1:0));
  const effects=[],produced=[];
  if(day%7===0)produced.push({type:'society.government',title:'政务公报',text:'临时政府财政吃紧，失业率约 '+data.unemployment+'%，居民对政府信任偏低。'});
  if(data.communitySupport>40&&day%5===0)produced.push({type:'society.support',title:'居民来信',text:'一批街坊自发帮助互助站，社区支持达到 '+data.communitySupport+'。'});
  if(protection>=2&&day%3===0)produced.push({type:'society.street',title:'街区互助巡查',text:'志愿者帮助邻居处理骚扰事件，没有收取强制保护费。'});
  data.history.unshift({day,support:data.communitySupport,poverty:data.poverty,hope:data.hope});data.history=data.history.slice(0,100);
  return {data,events:produced,effects};
 }
};