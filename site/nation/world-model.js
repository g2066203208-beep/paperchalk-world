/** The Republic of Yegang: deterministic 1,024 km × 1,024 km logical atlas.
 * 4096² addressable 250 m blocks; never precreate a 16-million-tile array.
 * Distinct stable building IDs, a real graph for road/rail/sea and typed interiors.
 * All scenery is original vector geometry drawn by the game, not remote maps.
 */
export const COUNTRY={name:'夜港联邦',size:4096,metersPerTile:250,chunk:32,seed:19980907};
export const REGIONS=[
 {id:'northwoods',name:'苍杉林区',x:840,y:1140,r:410,biome:'forest'},
 {id:'northern-mines',name:'霜脊矿区',x:2260,y:780,r:480,biome:'mine'},
 {id:'northcity',name:'北境铁路城',x:2720,y:450,r:230,biome:'urban'},
 {id:'old-harbor',name:'夜港旧城区',x:940,y:2070,r:170,biome:'urban'},
 {id:'ironbelt',name:'旧钢铁工业带',x:1390,y:1760,r:250,biome:'industry'},
 {id:'northport',name:'北岸深水港',x:850,y:1280,r:140,biome:'port'},
 {id:'capital',name:'雨城首府',x:2630,y:1710,r:330,biome:'urban'},
 {id:'eastcity',name:'东原新城',x:3430,y:1910,r:300,biome:'urban'},
 {id:'farmlands',name:'南平原农业区',x:1990,y:2640,r:510,biome:'farm'},
 {id:'southern-docks',name:'南湾货柜港',x:845,y:3230,r:170,biome:'port'},
 {id:'lowland',name:'河口湿地区',x:1270,y:2880,r:360,biome:'wetland'},
 {id:'highland',name:'东部高原',x:3480,y:840,r:470,biome:'mountain'}
];
export const STATIONS=[
 {id:'oldport',name:'旧港联运站',x:938,y:2050,kind:'port'},
 {id:'nightcity',name:'夜港中央车站',x:980,y:2000,kind:'rail'},
 {id:'ironworks',name:'铁带工业站',x:1420,y:1770,kind:'rail'},
 {id:'northport',name:'北岸货运港',x:846,y:1260,kind:'port'},
 {id:'forest',name:'林业转运站',x:1030,y:1160,kind:'road'},
 {id:'mines',name:'霜脊矿石站',x:2240,y:790,kind:'rail'},
 {id:'northcity',name:'北境总站',x:2670,y:470,kind:'rail'},
 {id:'capital',name:'雨城中央枢纽',x:2660,y:1710,kind:'rail'},
 {id:'eastcity',name:'东原客运站',x:3430,y:1910,kind:'rail'},
 {id:'farms',name:'农业集散中心',x:1980,y:2680,kind:'rail'},
 {id:'southport',name:'南湾深水码头',x:860,y:3220,kind:'port'},
 {id:'wetlands',name:'河口巡护站',x:1270,y:2890,kind:'road'}
];
export const NETWORK={
 road:[
 ['oldport','nightcity'],['nightcity','ironworks'],['ironworks','capital'],
 ['capital','eastcity'],['capital','northcity'],['northcity','mines'],
 ['mines','forest'],['forest','northport'],['northport','nightcity'],
 ['nightcity','southport'],['southport','wetlands'],['wetlands','farms'],
 ['farms','capital'],['ironworks','farms'],['mines','capital'],['eastcity','farms'],
 ['northport','oldport'],['farms','southport']
 ],
 rail:[
 ['nightcity','ironworks'],['ironworks','capital'],['capital','eastcity'],
 ['capital','northcity'],['northcity','mines'],['ironworks','mines'],
 ['capital','farms'],['farms','southport'],['nightcity','northport']
 ],
 sea:[['oldport','northport'],['oldport','southport'],['northport','southport']]
};
export const MODE={road:{name:'公路客运',speed:70,cost:1.2},rail:{name:'铁路列车',speed:110,cost:.8},sea:{name:'沿海轮船',speed:42,cost:.55}};
const SITE_TYPES={
 urban:['住宅楼','街角食堂','报刊亭','杂货店','诊所','修车厂','学校','邮局','银行','旅馆','电影院','车站','服装店','办公室'],
 industry:['钢铁厂','机修车间','零件厂','发电站','仓库','工人食堂','铁路货场','汽修车间'],
 port:['港务楼','冷库','船舶修理厂','海关','集装箱堆场','鱼市场','码头候船室','仓储站'],
 forest:['伐木场','护林站','锯木厂','林区宿舍','木材堆场'],
 mine:['采矿井口','选矿厂','矿车库','矿工宿舍','设备修理站'],
 farm:['谷物农场','粮仓','温室','农机站','乡村商店','乡村诊所'],
 wetland:['巡护站','水文站','泵站','小渡口'],
 mountain:['气象站','观测站','采石场']
};
export const SITE_CATEGORIES=Object.keys(SITE_TYPES);
export function hash(...parts){
 let v=2166136261;
 for(const part of parts)for(const c of String(part)+':'){v=Math.imul(v^c.charCodeAt(0),16777619)>>>0;}
 v^=v>>>16;v=Math.imul(v,2246822507)>>>0;v^=v>>>13;
 return v>>>0;
}
export const between=(v,min,max)=>Math.max(min,Math.min(max,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function coastAt(y){return 690+70*Math.sin(y/236)+38*Math.sin(y/83);}
function riverAt(x){return 3100-480*Math.sin(x/530)+45*Math.sin(x/99);}
export function terrainAt(x,y){
 x=Math.floor(x);y=Math.floor(y);
 if(x<0||y<0||x>=COUNTRY.size||y>=COUNTRY.size)return {kind:'outside',region:null,elevation:0};
 const coast=coastAt(y),river=riverAt(x),h=hash(x>>3,y>>3,COUNTRY.seed)/4294967296;
 const elevation=Math.round(20+140*h+Math.max(0,x-2700)*.12);
 if(x<coast-18)return {kind:'sea',region:'coast',elevation:0};
 if(Math.abs(y-river)<15&&x>coast+50&&x<2340)return {kind:'water',region:'river',elevation:0};
 const region=REGIONS.map(r=>({...r,d:distance({x,y},r)/r.r})).sort((a,b)=>a.d-b.d)[0];
 let kind=region.d<1?region.biome:'grassland';
 if(region.d>1&&h>.84)kind='forest';
 if(region.d>1&&h<.20)kind='farm';
 if(x<coast+40)kind='port';
 return {kind,region:region.id,elevation};
}
export function roadGridAt(x,y){
 const t=terrainAt(x,y);
 if(t.kind==='sea'||t.kind==='water'||t.kind==='outside')return false;
 if(t.kind==='urban')return (x%4===0||y%4===0);
 if(t.kind==='industry'||t.kind==='port')return (x%5===0||y%5===0);
 if(t.kind==='farm')return (x%12===0||y%12===0);
 return false;
}
const nameLead=['枫','灯','灰','金','栖','河','旧','红','安','青','银','远','晨','新','风','星'];
const nameTail=['街','巷','路','道','堤','坊','岗','坡'];
export function streetName(x,y){return nameLead[hash(x>>2,y>>2)%nameLead.length]+nameTail[hash(y>>3,x>>4)%nameTail.length];}
export function nearbyRegion(x,y){
 return REGIONS.map(r=>({...r,dist:distance(r,{x,y})})).sort((a,b)=>a.dist-b.dist)[0];
}
function propertyAt(x,y,slot,estate){
 const col=x-934,row=y-2041;
 if(col>=0&&col<48&&col%4===0&&row>=0&&row<16&&row%4===0&&slot===0){
  const i=Math.floor(row/4)*12+Math.floor(col/4),lot=estate?.parcels?.[i];
  return lot?{id:lot.id,title:lot.title,owner:lot.owner,building:lot.building}:null;
 }
 return null;
}
export function buildingAt(x,y,slot,estate=null){
 x=Math.floor(x);y=Math.floor(y);
 if(!Number.isInteger(slot)||slot<0||slot>5)return null;
 const terrain=terrainAt(x,y);
 if(['sea','water','outside'].includes(terrain.kind)||roadGridAt(x,y))return null;
 const biome=SITE_TYPES[terrain.kind]?terrain.kind:'farm';
 const density={urban:6,industry:4,port:4,forest:2,mine:3,farm:2,wetland:2,mountain:1}[biome]||2;
 const parcel=propertyAt(x,y,slot,estate);
 const count=Math.max(parcel?1:0,1+(hash(x,y,'lots')%density));
 if(slot>=count)return null;
 const title=parcel?.building?.name||SITE_TYPES[biome][hash(x,y,slot)%SITE_TYPES[biome].length];
 const id='b:'+x+':'+y+':'+slot;
 const side=slot%3,level=Math.floor(slot/3);
 return {id,x,y,slot,title,biome,region:terrain.region,street:streetName(x,y),
  property:parcel?.id||null,owner:parcel?.owner||'居民/本地企业',
  floors:parcel?.building?.level||1+hash(id,'floors')%5,
  frontage:hash(id,'style')%6,
  door:{x:x+(.14+.31*side),y:y+(.26+.43*level)},
  footprint:{x:x+.07+.31*side,y:y+.08+.43*level,w:.26,h:.34},
  patrons:2+hash(id,'patrons')%15,
  color:hash(id,'shade')%7};
}
export function buildingsInBlock(x,y,estate=null){
 const list=[];for(let i=0;i<6;i++){const b=buildingAt(x,y,i,estate);if(b)list.push(b);}
 return list;
}
export function resolveBuilding(id,estate=null){
 const match=/^b:(\d{1,4}):(\d{1,4}):([0-5])$/.exec(id||'');
 return match?buildingAt(+match[1],+match[2],+match[3],estate):null;
}
const FURNISHING={
 urban:['柜台','楼梯间','职员办公桌','住户信箱','窗边长椅','货架','收银台','电表箱'],
 industry:['卷扬机','机床','维修台','控制柜','卸货平台','物料传送架','安全告示','工具箱'],
 port:['装卸台','报关窗口','航运清单','集装箱门','绞盘','海图柜','航海灯','卸货货架'],
 forest:['木材分选台','锯台','护林地图','材积记录','消防器材','工具挂架'],
 mine:['矿车轨道','通风机','岩样台','井口登记台','设备架','安全灯'],
 farm:['谷仓秤台','种子架','灌溉阀','工具架','谷物分拣台','运输单据'],
 wetland:['水位尺','观测仪','渔网','值守台','巡查记录'],
 mountain:['测绘桌','岩石样本','气象仪','安全绳','标高地图']
};
export function interiorFor(building){
 if(!building)return null;
 const h=hash(building.id,'interior'),fixtures=[];
 const source=FURNISHING[building.biome]||FURNISHING.urban;
 const w=960,H=600;
 // Every building has a stable, differentiated floor plan; fixtures are collidable.
 const rooms=1+(h%3),wallX=rooms>=2?400+(h%110):0;
 for(let i=0;i<6;i++){
  const id='o:'+building.id+':'+i;
  const x=135+(i%3)*266+(hash(id)%60),y=125+Math.floor(i/3)*210+(hash(id,'y')%70);
  fixtures.push({id,label:source[(i+hash(building.id)%source.length)%source.length],x,y,
   w:75+hash(id,'w')%38,h:36+hash(id,'h')%33,detail:
   source[(i+hash(building.id)%source.length)%source.length]+'的使用记录显示这栋建筑在持续运作。'});
 }
 return {id:building.id,title:building.title,region:building.region,rooms,wallX,
  floor:h%5,fixtures,door:{x:480,y:560},spawn:{x:480,y:510},
  characters:Array.from({length:Math.min(4,building.patrons)},(_,i)=>({
   id:'n:'+building.id+':'+i,name:['值班员','街坊','工人','来访者'][i],
   x:185+i*165+(hash(i,h)%45),y:310+(hash(h,i)%80)
  }))};
}
export function allEdges(mode){
 return (NETWORK[mode]||[]).map(([a,b],index)=>{
  const from=STATIONS.find(s=>s.id===a),to=STATIONS.find(s=>s.id===b);
  return {id:mode+':'+a+':'+b,mode,a,b,index,from,to,
   km:Math.round(distance(from,to)*COUNTRY.metersPerTile/1000)};
 });
}
export function routeBetween(fromId,toId,mode){
 if(!MODE[mode]||fromId===toId)return null;
 const adj=new Map(STATIONS.map(n=>[n.id,[]]));
 for(const edge of allEdges(mode)){
  adj.get(edge.a).push({to:edge.b,edge});adj.get(edge.b).push({to:edge.a,edge});
 }
 const costs=new Map([[fromId,0]]),previous=new Map(),open=new Set([fromId]);
 if(!adj.has(fromId)||!adj.has(toId))return null;
 while(open.size){
  const current=[...open].sort((a,b)=>(costs.get(a)||Infinity)-(costs.get(b)||Infinity))[0];
  open.delete(current);if(current===toId)break;
  for(const link of adj.get(current)){
   const cost=costs.get(current)+link.edge.km;
   if(cost<(costs.get(link.to)??Infinity)){costs.set(link.to,cost);previous.set(link.to,{from:current,edge:link.edge});open.add(link.to);}
  }
 }
 if(!costs.has(toId))return null;
 const edges=[];let at=toId;
 while(at!==fromId){const p=previous.get(at);if(!p)return null;edges.unshift({...p.edge,fromId:p.from,toId:at});at=p.from;}
 const points=[STATIONS.find(s=>s.id===fromId)];
 for(const e of edges)points.push(STATIONS.find(s=>s.id===e.toId));
 const km=edges.reduce((n,e)=>n+e.km,0);
 return {mode,from:fromId,to:toId,edges:edges.map(e=>e.id),points:points.map(p=>({x:p.x,y:p.y,id:p.id})),
  km,durationHours:Math.max(1,Math.ceil(km/MODE[mode].speed)),fare:Math.max(2,Math.round(km*MODE[mode].cost/10))};
}
export function positionOnRoute(route,progress){
 if(!route||route.points.length<2)return null;
 const lengths=route.points.slice(1).map((p,i)=>distance(p,route.points[i]));
 const total=lengths.reduce((a,b)=>a+b,0);let remain=between(progress,0,1)*total;
 for(let i=0;i<lengths.length;i++){
  if(remain<=lengths[i]||i===lengths.length-1){const f=lengths[i]?remain/lengths[i]:0;
   const a=route.points[i],b=route.points[i+1];return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f};}
  remain-=lengths[i];
 }
 return route.points.at(-1);
}
