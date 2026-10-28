export const SPECIALISTS=[
 {id:'liaison',name:'商业联络员',fee:80,wage:14},
 {id:'informant',name:'线人',fee:105,wage:22},
 {id:'counsel',name:'法律顾问',fee:95,wage:19}
];
export const contactsSystem={
 id:'contacts',deps:['clock','factions'],
 init:()=>({staff:[],offers:[],reports:[]}),
 reduce(data,a,{day,context}){
  if(a.type==='hire'){
    const spec=SPECIALISTS.find(x=>x.id===a.role);
    if(!spec||data.staff.some(s=>s.role===a.role))return {error:'已经雇佣或无法聘用'};
    if(context.cash<spec.fee)return {error:'雇佣预算不足'};
    data.staff.push({id:'staff-'+spec.id,name:spec.name,role:spec.id,wage:spec.wage,joined:day});
    return {data,events:[{type:'contact.hired',title:'雇佣合同',text:'新签约：'+spec.name+'。'}],effects:[{kind:'cash',amount:-spec.fee,label:'聘用'+spec.name}]};
  }
  if(a.type==='dismiss'){
    const idx=data.staff.findIndex(s=>s.id===a.staff);
    if(idx<0)return {error:'查无此人'};
    const who=data.staff.splice(idx,1)[0];
    return {data,events:[{type:'contact.dismissed',title:'解除合约',text:'已结束'+who.name+'的合同。'}]};
  }
  if(a.type==='ask-informant'){
    if(!data.staff.some(s=>s.role==='informant'))return {error:'尚未聘请线人'};
    if(data.reports.some(r=>r.day===day))return {error:'今日已经收过情报'};
    const note={day,confidence:51+(day*7)%24,text:'听闻'+(day%2?'银帆联合的客户流失':'钟楼家族的产业争端')+'；尚未独立核实。'};
    data.reports.unshift(note);data.reports=data.reports.slice(0,25);
    return {data,events:[{type:'intel.report',title:'线人口述',text:note.text}]};
  }
  if(a.type==='bribe'){
    if(data.offers.some(o=>o.day===day))return {error:'今天已经发生过相关接触'};
    if(context.cash<110)return {error:'资金不足'};
    data.offers.push({id:'offer-'+day,day});
    return {data,events:[{type:'contact.corruption',title:'不当利益接触',text:'有一笔不当利益接触被登记。它无法抹去已存在的司法证据。'}],
     effects:[{kind:'cash',amount:-110,label:'不当公共关系开支'}]};
  }
  return {error:'无效联络操作'};
 },
 tick(data){
   const events=[],wages=data.staff.reduce((n,s)=>n+s.wage,0);
   for(const item of data.offers)
     events.push({type:'corruption.attempt',incidentId:item.id,agent:'kai',cell:'s4',severity:3,proof:3,
      title:'廉洁调查',text:'发生不当公共利益接触，已产生独立调查线索。'});
   data.offers=[];
   return {data,events,effects:wages?[{kind:'cash',amount:-wages,label:'联络与专业人员工资'}]:[]};
 }
};
