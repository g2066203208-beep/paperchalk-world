/** National traversal is part of the same persistent world, not a separate mock map. */
import {STATIONS,COUNTRY,routeBetween,resolveBuilding,interiorFor,MODE,between} from '../nation/world-model.js';
export const nationSystem={
 id:'nation',deps:['clock','estates','population'],
 init:()=>({position:{x:938,y:2050},station:'oldport',inside:null,
  visited:[],discoveries:[],journal:[],journey:null,arrivals:0,dayTraffic:0}),
 reduce(data,action,{day,slices,context}){
  const estate=slices.estates;
  const event=(type,title,text)=>({type,title,text});
  if(action.type==='enter'){
   if(data.journey)return {error:'旅途中无法进入建筑'};
   if(data.inside)return {error:'先离开当前建筑'};
   const place=resolveBuilding(action.building,estate);
   if(!place)return {error:'没有这样的可进入建筑'};
   // The player can enter the selected local building from the current street tile.
   if(Math.hypot(data.position.x-place.x,data.position.y-place.y)>4)return {error:'先走到这栋建筑所在街道'};
   data.inside=place.id;
   if(!data.visited.includes(place.id))data.visited.unshift(place.id);
   data.visited=data.visited.slice(0,120);
   return {data,events:[event('nation.enter','进入 '+place.title,place.street+' · '+place.title+'，在室内可以走动和调查。')]};
  }
  if(action.type==='exit'){
   if(!data.inside)return {error:'当前不在建筑室内'};
   const place=resolveBuilding(data.inside,estate);
   data.inside=null;
   if(place)data.position={x:place.x+.5,y:place.y+.5};
   return {data,events:[event('nation.exit','回到街道',place?.street||'街道')]};
  }
  if(action.type==='walk'){
   if(data.inside||data.journey)return {error:'当前无法在街道移动'};
   const x=action.x,y=action.y;
   if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=COUNTRY.size||y>=COUNTRY.size)return {error:'越出国境'};
   if(Math.hypot(data.position.x-x,data.position.y-y)>2)return {error:'步行操作必须逐格推进'};
   data.position={x,y};return {data,events:[]};
  }
  if(action.type==='inspect'){
   if(!data.inside)return {error:'先走入建筑'};
   const interior=interiorFor(resolveBuilding(data.inside,estate));
   const fixture=interior?.fixtures.find(f=>f.id===action.object);
   if(!fixture)return {error:'不存在这个室内物品'};
   const key=fixture.id;
   if(!data.discoveries.some(x=>x.id===key)){
    data.discoveries.unshift({id:key,building:data.inside,day,label:fixture.label});
    data.discoveries=data.discoveries.slice(0,160);
   }
   data.journal.unshift({day,type:'inspect',building:data.inside,item:fixture.label});
   data.journal=data.journal.slice(0,60);
   return {data,events:[event('nation.inspected','检查 '+fixture.label,fixture.detail)]};
  }
  if(action.type==='depart'){
   if(data.inside||data.journey)return {error:'先结束当前探索或行程'};
   const dest=STATIONS.find(s=>s.id===action.to),from=STATIONS.find(s=>s.id===data.station);
   if(!dest||!from||!MODE[action.mode])return {error:'无效运输班次'};
   if(Math.hypot(data.position.x-from.x,data.position.y-from.y)>8)return {error:'先步行返回当前车站'};
   const path=routeBetween(from.id,dest.id,action.mode);
   if(!path)return {error:'本运输方式无连接线路，请更换公路、铁路或航运'};
   if(context.cash<path.fare)return {error:'交通费用不足'};
   data.journey={from:from.id,to:dest.id,mode:action.mode,path,started:day};
   return {data,effects:[{kind:'cash',amount:-path.fare,label:MODE[action.mode].name+'：'+from.name+' → '+dest.name}],
    events:[event('nation.depart','沿交通线路出发',from.name+' → '+dest.name+'，'+path.km+'公里 / 票价'+path.fare+'元。')]};
  }
  if(action.type==='arrive'){
   if(!data.journey)return {error:'当前没有乘坐交通工具'};
   const dest=STATIONS.find(s=>s.id===data.journey.to);
   data.station=dest.id;data.position={x:dest.x,y:dest.y};
   data.journey=null;data.arrivals++;
   data.journal.unshift({day,type:'arrival',at:dest.id});
   data.journal=data.journal.slice(0,60);
   return {data,events:[event('nation.arrive','抵达 '+dest.name, '你乘交通工具沿实际线路抵达了目的地。')]};
  }
  return {error:'无效的国家地图操作'};
 },
 tick(data,{day,slices}){
  data.dayTraffic=(day*13+slices.population.people.length*3)%97;
  return {data,events:[]};
 }
};
