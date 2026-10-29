/**
 * Persistent world geography slice.
 * No DOM, animation loop, localStorage or scene HTML in this module.
 * Authoritative location lives in world save and goes through runtime.command.
 */
import {WORLD_WIDTH,WORLD_HEIGHT,terrainAt,REGIONS,routeBetween} from '../world/national-atlas.js';
import {streetBuildingsAt} from '../world/walkable-street.js';
const initial=()=>({schema:1,x:125,y:112,interior:null,player:{x:124,y:100},
 visits:[],visitedBuildings:{},distanceWalked:0,journeys:[],lastMovedDay:1});
const validTile=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&Boolean(terrainAt(x,y));
export const geographySystem={
 id:'geography',deps:['clock'],
 init(){return initial();},
 reduce(data,action,{day}){
  if(action.type==='move'){
   const x=action.x,y=action.y;
   if(!validTile(x,y))return {error:'目标格子越过国土边界'};
   if(Math.abs(x-data.x)+Math.abs(y-data.y)!==1)return {error:'步行跨区必须是相邻地理格'};
   if(data.interior)return {error:'先离开建筑再移动'};
   data.distanceWalked++;
   data.x=x;data.y=y;data.lastMovedDay=day;data.player={x:124,y:100};
   return {data,events:[{type:'geography.move',title:'地区步行',text:'抵达新街区 '+x+','+y}]};
  }
  if(action.type==='map-locate'){
   const x=action.x,y=action.y;
   if(!validTile(x,y)||Math.abs(x-data.x)>6||Math.abs(y-data.y)>4||data.interior)return {error:'只能在附近地图中选择可抵达的室外地区'};
   data.distanceWalked+=Math.abs(x-data.x)+Math.abs(y-data.y);
   data.x=x;data.y=y;data.player={x:124,y:100};data.lastMovedDay=day;
   return {data,events:[{type:'geography.map-walk',title:'周边步行',text:'步行经过周边街区抵达'+x+','+y}]};
 }
 if(action.type==='map-travel'){
   const target=REGIONS.find(x=>x.id===action.target),mode=action.mode;
   const origin=REGIONS.find(x=>x.id===data.region)||REGIONS.reduce((a,b)=>
     Math.hypot(data.x-a.x,data.y-a.y)<Math.hypot(data.x-b.x,data.y-b.y)?a:b);
   if(!target||!['road','rail','sea'].includes(mode)||data.interior)return {error:'必须在室外并选择有效交通目的地'};
   const path=routeBetween(origin.id,target.id,mode);
   if(!path||path.stops.length<2)return {error:'目的地没有连接的真实线路'};
   data.journeys.unshift({day,mode,from:origin.id,to:target.id,stops:path.stops,lengthKm:path.lengthKm});
   data.journeys=data.journeys.slice(0,80);
   data.x=target.x;data.y=target.y;data.player={x:124,y:100};data.lastMovedDay=day;
   return {data,events:[{type:'geography.travel',title:'乘坐交通线路',text:'沿'+mode+'线路到达'+target.name}]};
  }
  if(action.type==='enter'){
   if(data.interior)return {error:'请先离开当前建筑'};
   const b=streetBuildingsAt(data.x,data.y).find(x=>x.id===action.building);
   if(!b)return {error:'目标建筑不存在于当前街区'};
   data.interior=b.id;
   data.visitedBuildings[b.id]=(data.visitedBuildings[b.id]||0)+1;
   data.visits.unshift({id:b.id,day,x:data.x,y:data.y,kind:b.name});
   data.visits=data.visits.slice(0,100);
   return {data,events:[{type:'geography.enter',title:'进入建筑',text:'进入'+b.name+' · '+b.street}]};
  }
  if(action.type==='leave'){
   if(!data.interior)return {error:'当前不在建筑内'};
   data.interior=null;
   return {data,events:[{type:'geography.leave',title:'离开建筑',text:'回到室外街区'}]};
  }
  if(action.type==='player-position'){
   if(data.interior)return {error:'室内角色位置需由室内模块记录'};
   const {x,y}=action;
   if(!Number.isFinite(x)||!Number.isFinite(y)||x<8||x>952||y<8||y>592)return {error:'角色目标位置无效'};
   data.player={x:Math.round(x*10)/10,y:Math.round(y*10)/10};
   return {data,events:[]};
  }
  return {error:'未知地理操作'};
 },
 tick(data){return {data,events:[],effects:[]};}
};
