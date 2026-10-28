import {clamp} from '../core/runtime.js';
export const FACTIONS=[
 {id:'player',name:'无名事务所',color:'#dfd1bd',trait:'white'},
 {id:'bell',name:'钟楼家族',color:'#ae4853',trait:'conservative'},
 {id:'sail',name:'银帆联合',color:'#638ca0',trait:'business'},
 {id:'kestrel',name:'红隼会',color:'#c49b57',trait:'aggressive'},
 {id:'raven',name:'灰鸦同盟',color:'#565d6b',trait:'intelligence'}
];
export const ZONES=['旧港','市集','中城','霓虹街'];
const owners=['player','sail','sail','raven','bell','bell','sail','raven','bell','bell','kestrel','raven','kestrel','kestrel','kestrel','raven'];
const roads=i=>[i%4>0?i-1:-1,i%4<3?i+1:-1,i>3?i-4:-1,i<12?i+4:-1].filter(n=>n>=0);
const nextCell=(id,owner)=>({id:'s'+id,index:id,zone:ZONES[Math.floor(id/4)],name:ZONES[Math.floor(id/4)]+' '+['西街','东路','商业区','路口'][id%4],
 owner,influence:Object.fromEntries(FACTIONS.map(f=>[f.id,f.id===owner?66:0])),
 publicMood:55,security:50,neighbors:roads(id),businesses:[]});
export const ownership=state=>Object.fromEntries(FACTIONS.map(f=>[f.id,state.cells.filter(c=>c.owner===f.id).length]));
function compete(cell,faction,power){
 cell.influence[faction]=clamp(cell.influence[faction]+power);
 if(cell.owner!==faction&&cell.influence[faction]>=66){
   const prev=cell.owner;
   cell.owner=faction;cell.influence[prev]=clamp(cell.influence[prev]-23);
   cell.publicMood=clamp(cell.publicMood-4);
   return prev;
 }
 return null;
}
export const factionsSystem={
 id:'factions',deps:[],
 init:()=>({playerActions:[],cells:owners.map((owner,i)=>nextCell(i,owner)),groups:Object.fromEntries(FACTIONS.map((f,i)=>[f.id,{cash:i?240+i*55:0,relations:{},stance:f.trait}]))}),
 reduce(data,action,{context,slices,day}){
   if(action.type!=='influence')return {error:'Unknown faction action'};
   const id=action.cell,cell=data.cells.find(c=>c.id===id);
   if(!cell)return {error:'Unknown street'};
   if(data.groups.player.cash<0)return {error:'Invalid budget'};
   if(data.playerActions.includes(cell.id))return {error:'今日已经与这条街区的商户联系过'};
   if(!data.cells.some(c=>c.owner==='player'&&c.neighbors.includes(cell.index))&&cell.owner!=='player')
     return {error:'只能争取与己方地盘相邻的街区'};
   const cost=40;
   if(context.cash<cost)return {error:'需要 40 元开展社区联系'};
   const leader=slices.people?.members?.find(p=>p.job==='capo'&&p.faction==='player');
   const power=20+(leader?6:0);
   const prior=cell.owner;
   data.playerActions.push(cell.id);
   const replaced=compete(cell,'player',power);
   cell.publicMood=clamp(cell.publicMood+3);
   return {data,events:[{type:'faction.influence',title:'社区联系',text:'你派人拜访了'+cell.name+'的本地商户，影响力 +'+power+'。',cell:cell.id,faction:'player'},
    ...(replaced?[{type:'territory.changed',title:'地盘更迭',text:cell.name+'的主导权由'+FACTIONS.find(f=>f.id===prior).name+'转至无名事务所。',cell:cell.id}]:[])],
    effects:[{kind:'cash',amount:-cost,label:'街区关系维护：'+cell.name}]};
 },
 tick(data,{day,signal}){
   const events=[];
   data.playerActions=[];
   for(const f of FACTIONS.filter(f=>f.id!=='player')){
     const group=data.groups[f.id];
     const held=data.cells.filter(c=>c.owner===f.id);
     const income=held.length*7+12;
     group.cash+=income;
     const targets=data.cells.filter(c=>c.owner!==f.id&&c.neighbors.some(n=>data.cells[n].owner===f.id));
     if(group.cash<32||!targets.length)continue;
     targets.sort((a,b)=>{
       const aScore=(a.owner==='player'?6:0)+(a.publicMood<55?3:0)+(a.zone==='旧港'&&f.id==='sail'?4:0);
       const bScore=(b.owner==='player'?6:0)+(b.publicMood<55?3:0)+(b.zone==='旧港'&&f.id==='sail'?4:0);
       return bScore-aScore||a.index-b.index;
     });
     const target=targets[Math.floor(signal(f.id)*Math.min(3,targets.length))];
     const power=9+Math.floor(signal(f.id+'-power')*9)+(f.id==='kestrel'?3:0);
     group.cash-=32;
     const prior=target.owner,replace=compete(target,f.id,power);
     events.push({type:'faction.influence',title:f.name+'正在行动',text:f.name+'在'+target.name+'开展活动，影响力增加 '+power+'。',cell:target.id,faction:f.id,visible:true});
     if(replace)events.push({type:'territory.changed',title:'街区改旗易帜',text:target.name+'由'+FACTIONS.find(x=>x.id===prior).name+'转入'+f.name+'的势力范围。',cell:target.id,faction:f.id});
   }
   return {data,events};
 }
};
