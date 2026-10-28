import {clamp} from '../core/runtime.js';
export const civicSystem={
 id:'civic',deps:['factions','people','justice'],
 init:()=>({publicMood:56,security:62,precincts:[{id:'harbor-police',name:'旧港分局',cases:0},{id:'central-police',name:'中城分局',cases:0}],
  nations:[{id:'union',name:'港联邦',tension:16},{id:'north',name:'北方协约',tension:23}],
  conflict:{stage:'peace',pressure:15},cases:[]}),
 reduce(data,action){
   if(action.type!=='read')return {error:'本阶段仅开放城市公报查阅'};
   return {data,events:[]};
 },
 tick(data,{day,context,events,signal,slices}){
   const disputes=events.filter(e=>e.type==='territory.changed').length;
   data.security=clamp(data.security-disputes*3+1-(context.heat>50?2:0));
   data.publicMood=clamp(data.publicMood-disputes*2+(data.security>=60?1:-1));
   data.conflict.pressure=clamp(data.conflict.pressure+(day%6===0?4:-1));
   const generated=[];
   if(disputes)generated.push({type:'civic.unrest',title:'社区舆论',text:'地盘易主引起商户不安，市区治安评分有所下降。'});
   for(const e of events.filter(x=>x.type==='justice.opened')){
     const c=slices.justice.cases.find(x=>x.id===e.caseId);
     const j=c?.precinct==='port'?0:1;
     data.precincts[j].cases++;
     data.cases.unshift({id:e.caseId,day,precinct:c?.precinct,stage:'线索登记',subject:c?.subject||'营业场所',evidence:c?.evidence.map(x=>x.source)||[],resolved:false});
     data.cases=data.cases.slice(0,40);
     generated.push({type:'police.case',title:'案件动态',text:e.text,caseId:e.caseId});
   }
   if(day%9===0){
     data.nations[1].tension=clamp(data.nations[1].tension+(signal('border')>0.5?5:-3));
     generated.push({type:'world.foreign',title:'外部局势',text:'港联邦与北方协约的贸易谈判影响了夜港的航运预期。'});
   }
   // This is a strategic background index, NOT a tactical war simulator.
   return {data,events:generated};
 }
};
