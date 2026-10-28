import {clamp} from '../core/runtime.js';
import {CANDIDATES} from './recruitment.js';
export const JOBS=[
 {id:'capo',name:'街区负责人',capacity:1,info:'参与社区联系时影响力 +6'},
 {id:'manager',name:'业务经理',capacity:1,info:'获得更多商业经营经验'},
 {id:'analyst',name:'情报顾问',capacity:1,info:'提升线索辨别能力'}
];
const defaults=[
 {id:'kai',name:'阿凯',faction:'player',job:'none',skills:{trade:3,network:1,analysis:1},personality:{ambition:55,discipline:72,empathy:48,courage:65},loyalty:65,morale:62,experience:0,trainingDay:0},
 {id:'mio',name:'米娅',faction:'player',job:'none',skills:{trade:1,network:4,analysis:3},personality:{ambition:61,discipline:68,empathy:71,courage:52},loyalty:73,morale:67,experience:0,trainingDay:0},
 {id:'leo',name:'雷欧',faction:'player',job:'none',skills:{trade:2,network:2,analysis:4},personality:{ambition:39,discipline:78,empathy:45,courage:60},loyalty:57,morale:60,experience:0,trainingDay:0},
 {id:'bell-lu',name:'钟楼·卢卡',faction:'bell',job:'capo',skills:{trade:4,network:4,analysis:2},personality:{ambition:82,discipline:66,empathy:31,courage:71},loyalty:61,morale:59,experience:0,trainingDay:0},
 {id:'sail-lin',name:'银帆·林',faction:'sail',job:'manager',skills:{trade:5,network:4,analysis:4},personality:{ambition:73,discipline:88,empathy:44,courage:35},loyalty:76,morale:67,experience:0,trainingDay:0},
 {id:'kestrel-yu',name:'红隼·羽',faction:'kestrel',job:'capo',skills:{trade:2,network:3,analysis:1},personality:{ambition:90,discipline:31,empathy:34,courage:91},loyalty:50,morale:63,experience:0,trainingDay:0},
 {id:'raven-wei',name:'灰鸦·维',faction:'raven',job:'analyst',skills:{trade:2,network:4,analysis:5},personality:{ambition:57,discipline:80,empathy:65,courage:48},loyalty:67,morale:61,experience:0,trainingDay:0}
];
export const peopleSystem={
 id:'people',deps:['factions','operations'],
 init:()=>({members:structuredClone([
 ...defaults.map(p=>({...p,status:'active'})),
 ...CANDIDATES.filter(c=>!defaults.some(p=>p.id===c.id)).map(c=>({
   id:c.id,name:c.name,faction:'player',job:'none',status:'inactive',
   skills:{trade:2,network:c.skill==='network'?4:2,analysis:c.skill==='scout'?4:2},
   personality:{ambition:40+c.age%25,discipline:50+c.age%30,empathy:58,courage:47},
   loyalty:c.trust,morale:55,experience:0,trainingDay:0
 }))
 ])}),
 reduce(data,action,{context,day}){
  const p=data.members.find(m=>m.id===action.person&&m.faction==='player'&&(context.crew||[]).includes(m.id));
  if(!p)return {error:'人员未加入组织'};
  if(action.type==='train'){
    if(p.trainingDay===day)return {error:'此人今天已经接受培养'};
    if(context.cash<45)return {error:'培训需要 45 元'};
    const skill=['trade','network','analysis'].includes(action.skill)?action.skill:null;
    if(!skill)return {error:'无效技能'};
    if(p.skills[skill]>=10)return {error:'该能力已达到本阶段上限'};
    p.skills[skill]++;p.experience+=2;p.morale=clamp(p.morale+3);p.trainingDay=day;
    return {data,events:[{type:'person.trained',title:'能力培养',text:p.name+'接受了'+({trade:'商业',network:'交际',analysis:'判断'})[skill]+'课程。',person:p.id}],
     effects:[{kind:'cash',amount:-45,label:'人员培训：'+p.name}]};
  }
  if(action.type==='appoint'){
    if(!JOBS.some(j=>j.id===action.job)&&action.job!=='none')return {error:'未知职位'};
    if(action.job!=='none'&&data.members.some(x=>x.faction==='player'&&x.id!==p.id&&x.job===action.job))return {error:'职位已有负责人'};
    if(p.job===action.job)return {error:'无需重复任命'};
    if(context.cash<20)return {error:'签发任命需要 20 元'};
    p.job=action.job;p.loyalty=clamp(p.loyalty+6);p.personality.ambition=clamp(p.personality.ambition+1);
    return {data,events:[{type:'person.appointed',title:'职务任命',text:p.name+'已正式担任'+(JOBS.find(x=>x.id===p.job)?.name||'普通成员')+'。',person:p.id}],
     effects:[{kind:'cash',amount:-20,label:'人事任命：'+p.name}]};
  }
  return {error:'未知人员指令'};
 },
 tick(data,{day,context,events:worldEvents}){
   const events=[],effects=[];
   for(const e of worldEvents){
     if(e.type==='person.harmed'||e.type==='person.wounded'){
       const v=data.members.find(p=>p.id===e.target);
       if(v&&v.status!=='deceased'){
         v.status=e.type==='person.harmed'?'deceased':'injured';
         events.push({type:'person.status',title:'人员动态',text:v.name+'已经'+(v.status==='deceased'?'遇害':'受伤')+'。'});
       }
     }
   }
   for(const p of data.members){
     if(p.faction!=='player')continue;
     const tasks=(context.orders||[]).filter(x=>x.crew===p.id);
     if(tasks.length){p.experience+=2;p.morale=clamp(p.morale+1);}
     else p.morale=clamp(p.morale-1);
     if(p.job==='manager'&&tasks.some(t=>t.mission==='deliver')){
       const bonus=10+p.skills.trade*3;
       effects.push({kind:'cash',amount:bonus,label:'业务经理·'+p.name+'运营增益'});
       events.push({type:'business.manager',title:'组织运营',text:p.name+'规范了派送账目，追回应收款 '+bonus+' 元。',person:p.id});
     }
     if(p.job==='analyst'&&tasks.some(t=>t.mission==='scout')){
       effects.push({kind:'heat',amount:-2,label:'情报分析·'+p.name+'风险预警'});
       events.push({type:'person.analysis',title:'情报预警',text:p.name+'核对最新调查线索，及时提醒组织降低风险。',person:p.id});
     }
     if(context.cash<0){p.loyalty=clamp(p.loyalty-2);p.morale=clamp(p.morale-3);}
     if(day%7===0){p.morale=clamp(p.morale+(p.personality.discipline>65?1:-1));}
     if(p.morale<30&&day%5===0)events.push({type:'person.concern',title:'人员顾虑',text:p.name+'最近情绪低落，希望获得更明确的安排。',person:p.id});
   }
   return {data,events,effects};
 }
};
