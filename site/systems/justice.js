/** Event evidence chain; arrest & custody require warrant based on accumulated evidence. */
export const casePhase=c=>({reported:'线索登记',investigating:'正式调查',warrant:'通缉',detained:'羁押',trial:'审判',prison:'服刑',closed:'结案'})[c.stage]||c.stage;
export const justiceSystem={
 id:'justice',deps:['operations','contacts','population','factions','people','estates'],
 init:()=>({cases:[],wanted:[],custody:[],sentences:[],precincts:[{id:'port',name:'旧港分局',cases:0},{id:'center',name:'中城分局',cases:0}]}),
 reduce(data,a,{context,day}){
   if(a.type!=='counsel')return {error:'未知法律行动'};
   const c=data.cases.find(x=>x.id===a.caseId&&x.stage!=='closed');
   if(!c||c.counselDay===day)return {error:'案件无效或今天已接受法律协助'};
   if(context.cash<85)return {error:'法律咨询费不足'};
   c.counselDay=day;c.counsel=true;
   return {data,events:[{type:'justice.counsel',title:'法律协助',text:'法律顾问已审查案件 '+c.id+' 的公开程序。'}],
     effects:[{kind:'cash',amount:-85,label:'法律咨询费'}]};
 },
 tick(data,{day,events,signal}){
  const news=[];
  for(const event of events.filter(e=>['crime.incident','corruption.attempt','business.risky'].includes(e.type))){
   const id='case-'+(event.incidentId||event.lot||day+'-'+event.type+'-'+data.cases.length);
   if(data.cases.some(c=>c.id===id&&c.opened===day))continue;
   const territory=Number((event.cell||'s0').slice(1)),precinct=data.precincts[territory<8?0:1];
   precinct.cases++;
   const evidence=[{kind:'event',source:event.type,weight:1},{kind:'witness',source:'市民证言',weight:Math.min(2,event.publicWitnesses||1)}];
   if((event.proof||0)>=4)evidence.push({kind:'independent',source:'独立材料',weight:2});
   const c={id,opened:day,stageDay:day,stage:'reported',subject:event.agent||null,target:event.target||null,
    severity:event.severity||2,cell:event.cell||'s0',precinct:precinct.id,evidence,counsel:false,counselDay:0};
   data.cases.unshift(c);
   news.push({type:'justice.opened',title:'案件登记',text:precinct.name+'收到具体犯罪事件的证言与材料，已登记 '+id+'。',caseId:id});
  }
  for(const c of data.cases){
   if(c.stageDay>=day)continue;
   const weight=c.evidence.reduce((n,e)=>n+e.weight,0),threshold=c.severity>=4?3:4;
   const move=(stage,text)=>{c.stage=stage;c.stageDay=day;news.push({type:'justice.progress',title:casePhase(c),text,caseId:c.id});};
   if(c.stage==='reported'){move('investigating',c.id+' 进入正式调查。');continue;}
   if(c.stage==='investigating'){
      if(weight>=threshold&&c.subject){
         data.wanted.push({caseId:c.id,subject:c.subject,issued:day});
         move('warrant','司法部门根据现有证据批准通缉 '+c.subject+'。');
      }else if(day-c.opened>=9)move('closed',c.id+' 因证据不足暂行结案。');
      else if(signal(c.id+'-evidence')>.65)c.evidence.push({kind:'witness',source:'后续核实证言',weight:1});
      continue;
   }
   if(c.stage==='warrant'){
      data.wanted=data.wanted.filter(w=>w.caseId!==c.id);
      if(!data.custody.some(p=>p.subject===c.subject)){
        data.custody.push({caseId:c.id,subject:c.subject,kind:'detained',since:day,until:day+3});
        move('detained',c.subject+' 在通缉后被拘留，等待审理。');
      }else move('trial',c.subject+' 的相关案件合并审查。');
      continue;
   }
   if(c.stage==='detained'){move('trial','案件 '+c.id+' 开庭审理。');continue;}
   if(c.stage==='trial'){
     if(weight>=threshold){
       const prisoner=data.custody.find(p=>p.caseId===c.id);
       if(prisoner){prisoner.kind='prison';prisoner.until=day+Math.max(3,c.severity*2);}
       data.sentences.unshift({caseId:c.id,subject:c.subject,day,sentenceDays:Math.max(3,c.severity*2)});
       move('prison',c.subject+' 因具体案件接受判决并服刑。');
     }else{
       data.custody=data.custody.filter(p=>p.caseId!==c.id);
       move('closed',c.id+' 证据未达裁判要求，案件终结。');
     }continue;
   }
  }
  const released=data.custody.filter(p=>p.until<=day);
  data.custody=data.custody.filter(p=>p.until>day);
  for(const p of released)news.push({type:'justice.released',title:'释放通知',text:p.subject+' 已结束本阶段羁押或刑期。'});
  for(const c of data.cases)if(c.stage==='prison'&&!data.custody.some(p=>p.caseId===c.id))c.stage='closed';
  data.cases=data.cases.slice(0,70);data.sentences=data.sentences.slice(0,60);
  return {data,events:news};
 }
};
