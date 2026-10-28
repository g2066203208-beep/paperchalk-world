/** Abstract dramatic crimes; no tactical procedures. */
export const OPERATIONS=[{id:'pressure',name:'非法施压',cost:45,severity:2},{id:'sabotage',name:'破坏委托',cost:80,severity:3},{id:'contract',name:'暴力委托',cost:160,severity:4},{id:'assassination',name:'致命委托',cost:260,severity:5}];
export const operationsSystem={
 id:'operations',deps:['factions','population','clock'],
 init:()=>({pending:[],history:[]}),
 reduce(data,a,{day,context,slices}){
  if(a.type!=='commission')return {error:'未知委托'};
  const kind=OPERATIONS.find(x=>x.id===a.operation),target=slices.people.members.find(x=>x.id===a.target&&x.faction!=='player'&&x.status!=='deceased');
  if(!kind||!target)return {error:'选择敌对组织的有效人物及委托'};
  if(!context.crew?.includes(a.agent)||context.detained?.includes(a.agent))return {error:'执行者不在岗'};
  if(data.pending.some(x=>x.agent===a.agent))return {error:'此人已经接受危险委托'};
  if(context.cash<kind.cost)return {error:'资金不足'};
  const cell=slices.factions.cells.find(x=>x.owner===target.faction)?.id;
  if(!cell)return {error:'目标组织没有活动区域'};
  const job={id:'job-'+day+'-'+data.pending.length,day,kind:kind.id,severity:kind.severity,agent:a.agent,target:target.id,cell};
  data.pending.push(job);
  return {data,events:[{type:'operation.commissioned',title:'委托登记',text:kind.name+'已提交给'+a.agent+'，结局尚不确定。'}],
   effects:[{kind:'cash',amount:-kind.cost,label:kind.name+'委托预算'}]};
 },
 tick(data,{day,slices,signal}){
   const events=[],effects=[];
   for(const job of data.pending){
     const success=signal(job.id)>.28;
     const traffic=slices.population.footTraffic[job.cell]||0;
     const witnesses=Math.max(1,Math.floor(traffic/12));
     const incident={...job,day,success,witnesses};
     data.history.unshift(incident);
     events.push({type:'crime.incident',title:'刑事事件',text:job.cell+'发生涉及'+OPERATIONS.find(x=>x.id===job.kind).name+'的案件，警方与居民已开始关注。',
      incidentId:job.id,agent:job.agent,target:job.target,cell:job.cell,severity:job.severity,publicWitnesses:witnesses,proof:job.severity>=4?4:2});
     if(job.kind==='pressure'&&success)effects.push({kind:'cash',amount:65,label:'高风险委托结算'});
     if(success&&job.kind==='assassination')events.push({type:'person.harmed',target:job.target,title:'人员伤亡',text:'一名竞争组织成员遇害，引发严重的社会影响。'});
     if(success&&job.kind==='contract')events.push({type:'person.wounded',target:job.target,title:'人物受伤',text:'一名竞争组织成员受伤。'});
   }
   data.pending=[];data.history=data.history.slice(0,36);
   return {data,events,effects};
 }
};
