/** Abstract logistics, genuine graph-based routing; no operational illicit instructions. */
const idx=id=>/^s(?:[0-9]|1[0-5])$/.test(id)?Number(id.slice(1)):-1;
export function shortestRoute(cells,from,to){
 const start=idx(from),dest=idx(to);if(start<0||dest<0)return null;
 const queue=[start],seen=new Set([start]),prev={};
 for(let i=0;i<queue.length;i++){
  const at=queue[i];if(at===dest)break;
  for(const next of cells[at].neighbors||[]){if(!seen.has(next)){seen.add(next);prev[next]=at;queue.push(next);}}
 }
 if(!seen.has(dest))return null;
 const result=[dest];while(result[0]!==start)result.unshift(prev[result[0]]);
 return result.map(i=>'s'+i);
}
export const transportSystem={
 id:'transport',deps:['factions','estates','people'],
 init:()=>({shipments:[],completed:[],routesDrawn:0}),
 reduce(data,action,{slices,context,day}){
  if(action.type!=='dispatch')return {error:'未知货运指令'};
  const src=slices.estates.parcels.find(p=>p.id===action.from);
  const fromCell=src?.cell,destination=action.to;
  if(!src||src.owner!=='player'||!src.building||!['warehouse','garage'].includes(src.building.type))return {error:'需要自己的仓库或车行作为运输起点'};
  if(!context.crew?.includes(action.courier))return {error:'人员未加入'};
  if(context.detained?.includes(action.courier))return {error:'人员正在羁押中'};
  if(data.shipments.some(s=>s.courier===action.courier))return {error:'这名成员已承担运输安排'};
  const path=shortestRoute(slices.factions.cells,fromCell,destination);
  if(!path||path.length<2)return {error:'请选择其他送货街区'};
  const cost=14+path.length*4;
  if(context.cash<cost)return {error:'运输费用不足'};
  const item={id:'trip-'+day+'-'+data.shipments.length,from:src.id,to:destination,path,courier:action.courier,cost,day};
  data.shipments.push(item);data.routesDrawn++;
  return {data,events:[{type:'transport.dispatched',title:'路线批示',text:src.title+'至'+destination+'的运输路线已交由'+action.courier+'负责，共 '+(path.length-1)+' 段街区。',trip:item.id}],
    effects:[{kind:'cash',amount:-cost,label:'合法运输派遣费用'}]};
 },
 tick(data,{day,slices}){
  const effects=[],events=[];
  for(const trip of data.shipments){
    const contested=trip.path.filter(id=>!['player','market'].includes(slices.factions.cells[idx(id)].owner)).length;
    const gross=70+trip.path.length*14,expense=contested*9;
    const net=gross-expense;
    data.completed.unshift({...trip,day,net,contested});effects.push({kind:'cash',amount:net,label:'合法运输订单回款'});
    events.push({type:'transport.completed',title:'运输回执',text:trip.path[0]+' → '+trip.to+'：结算 '+net+' 元，沿途跨越 '+contested+' 个其他势力街区。',trip:trip.id});
  }
  data.shipments=[];data.completed=data.completed.slice(0,30);
  return {data,events,effects};
 }
};
