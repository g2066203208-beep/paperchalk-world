import {clamp} from '../core/runtime.js';
export const civicSystem={
 id:'civic',deps:['factions','people'],
 init:()=>({publicMood:56,security:62,precincts:[{id:'harbor-police',name:'旧港分局',cases:0},{id:'central-police',name:'中城分局',cases:0}],
  nations:[{id:'union',name:'港联邦',tension:16},{id:'north',name:'北方协约',tension:23}],
  conflict:{stage:'peace',pressure:15},cases:[]}),
 reduce(data,action){
   if(action.type!=='read')return {error:'本阶段仅开放城市公报查阅'};
   return {data,events:[]};
 },
 tick(data,{day,context,events,signal}){
   const disputes=events.filter(e=>e.type==='territory.changed').length;
   data.security=clamp(data.security-disputes*3+1-(context.heat>50?2:0));
   data.publicMood=clamp(data.publicMood-disputes*2+(data.security>=60?1:-1));
   data.conflict.pressure=clamp(data.conflict.pressure+(day%6===0?4:-1));
   const generated=[];
   if(disputes)generated.push({type:'civic.unrest',title:'社区舆论',text:'地盘易主引起商户不安，市区治安评分有所下降。'});
   if(context.heat>55&&day%3===0){
      const precinct=data.precincts[day%2];precinct.cases++;
      const record={id:'case-'+day+'-'+precinct.id,day,precinct:precinct.id,stage:'线索登记',subject:'有关街区的经营纠纷',evidence:['商户投诉'],resolved:false};
      data.cases.unshift(record);
      generated.push({type:'police.case',title:'警方调查登记',text:precinct.name+'登记了一起经营纠纷，有商户报告作为初步线索。',caseId:record.id});
   }
   if(day%9===0){
     data.nations[1].tension=clamp(data.nations[1].tension+(signal('border')>0.5?5:-3));
     generated.push({type:'world.foreign',title:'外部局势',text:'港联邦与北方协约的贸易谈判影响了夜港的航运预期。'});
   }
   // This is a strategic background index, NOT a tactical war simulator.
   return {data,events:generated};
 }
};
