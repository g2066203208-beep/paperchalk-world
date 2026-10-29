/**
 * Reproducible country-scale coordinate atlas. 1 atlas tile = 1 km².
 * All 360×240 km² are addressable without allocating every tile or sprite.
 * Named hubs and transport routes are persistent landmarks; local props are
 * generated only for the visible 9×7 tiles. No invented visual completeness.
 */
export const WORLD_WIDTH=360, WORLD_HEIGHT=240;
export const REGION_SIZE=30;
export const REGIONS=[
 ['旧港都会','metro',125,112],['钟楼旧城','oldtown',127,107],
 ['滨海船坞','harbor',129,118],['北部农垦区','farmland',92,78],
 ['东岭林场','forest',212,73],['铁峰矿区','mining',247,114],
 ['灰蓝工业带','industrial',184,124],['河谷新镇','town',161,153],
 ['西湾渔港','fishing',65,140],['群山口岸','mountain',282,54],
 ['湖心农庄','lake',192,192],['南海造船城','shipyard',258,201]
].map(([name,biome,x,y],i)=>({id:'region-'+i,name,biome,x,y}));
export const LINKS=[
 [0,1,'road'],[0,2,'road'],[0,3,'road'],[0,6,'road'],[0,7,'road'],
 [0,8,'road'],[6,5,'rail'],[6,4,'road'],[6,7,'rail'],[5,9,'rail'],
 [7,10,'road'],[8,11,'sea'],[2,8,'sea'],[2,11,'sea'],[6,11,'rail'],
 [3,8,'road'],[4,9,'road'],[10,11,'road'],[1,6,'rail']
].map(([a,b,mode])=>({a:REGIONS[a].id,b:REGIONS[b].id,mode}));
export const FACILITY_TYPES={
 metro:['居民楼','街角商店','社区诊所','旅馆','学校','市政大楼','银行','餐厅'],
 oldtown:['钟楼','古董店','裁缝铺','图书馆','公寓','报社'],
 harbor:['码头仓库','货运车站','船坞','海关','工人食堂'],
 farmland:['谷物农场','水泵站','农机仓库','粮食合作社'],
 forest:['林业营地','锯木厂','护林站','伐木铁路'],
 mining:['井口','洗矿场','矿务办公室','矿工宿舍'],
 industrial:['铸造厂','机械工厂','货站','电厂','工人宿舍'],
 town:['住房','集市','汽车站','学校','食堂'],
 fishing:['鱼市','船坞','冷链仓库','渔民住宅'],
 mountain:['边境检查站','山路客栈','铁路隧道','救护站'],
 lake:['码头','农庄','水处理站','宿营地'],
 shipyard:['造船厂','货场','码头','运输公司','维修厂']
};
export const MODE_STYLE={road:{name:'公路',speed:65,cost:1},rail:{name:'铁路',speed:95,cost:1.4},sea:{name:'航道',speed:38,cost:.8}};
const hash=(x,y,seed=20261028)=>{let n=Math.imul(x+seed,374761393)+Math.imul(y+seed,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const WORLD_AREA= WORLD_WIDTH*WORLD_HEIGHT;
export function regionAt(x,y){let match=REGIONS[0],distance=Infinity;
 for(const r of REGIONS){const n=(r.x-x)**2+(r.y-y)**2;if(n<distance){match=r;distance=n;}}
 return match;}
export function terrainAt(x,y){
 if(x<0||y<0||x>=WORLD_WIDTH||y>=WORLD_HEIGHT)return null;
 const region=regionAt(x,y);
 const u=hash(Math.floor(x/5),Math.floor(y/5)),v=hash(Math.floor(x/17),Math.floor(y/17),12345);
 const coast=y>209+Math.sin(x*.042)*12||x<24+Math.cos(y*.05)*9;
 const river=Math.abs(x-(179+Math.sin(y*.036)*15))<3;
 const mountain=region.biome==='mountain'||region.biome==='mining'&&v>.42;
 let terrain=coast?'sea':river?'river':mountain?'mountain':region.biome==='forest'?'forest':
 region.biome==='farmland'?'fields':region.biome==='lake'&&u>.45?'lake':
 ['metro','oldtown','harbor','industrial','shipyard','town'].includes(region.biome)?'urban':'grass';
 return {x,y,terrain,regionId:region.id,elevation:Math.floor(v*280+(mountain?420:0))};
}
export function facilitiesAt(x,y){
 const cell=terrainAt(x,y);if(!cell||['sea','river'].includes(cell.terrain))return [];
 const region=REGIONS.find(r=>r.id===cell.regionId),kind=FACILITY_TYPES[region.biome],density=
 ['metro','oldtown','industrial','town','harbor','shipyard'].includes(region.biome)?.7:.28;
 const seed=hash(x,y,2026);
 const count=seed<density?1+(hash(x,y,719)> .82?1:0):0;
 return Array.from({length:count},(_,index)=>{
 const sub=Math.floor(hash(x+index,y,3102)*kind.length);
 return {id:'place-'+x+'-'+y+'-'+index,x,y,kind:kind[sub],region:region.id,
  position:{x:24+index*42,y:44},open:true};
 });
}
export function playerDistricts(world){
 // Existing 48 city properties remain identifiable in the walkable atlas.
 return (world?.slices?.estates?.parcels||[]).map((lot,i)=>({
  id:'estate-'+lot.id,x:125+i%8-4,y:112+Math.floor(i/8)-3,
  kind:lot.building?.name||'空置地块',lot:lot.id,owner:lot.owner
 }));
}
export function nearestStation(point,mode){return REGIONS.filter(r=>
 LINKS.some(l=>l.mode===mode&&(l.a===r.id||l.b===r.id)))
 .sort((a,b)=>(a.x-point.x)**2+(a.y-point.y)**2-((b.x-point.x)**2+(b.y-point.y)**2))[0];}
export function routeBetween(from,to,mode){
 if(from===to)return {mode,stops:[from],lengthKm:0};
 const best=new Map([[from,0]]),todo=[{id:from,dist:0,path:[from]}];
 while(todo.length){
 todo.sort((a,b)=>a.dist-b.dist);const item=todo.shift();
 if(item.id===to)return {mode,stops:item.path,lengthKm:Math.round(item.dist)};
 if(item.dist>best.get(item.id))continue;
 for(const edge of LINKS.filter(l=>l.mode===mode&&(l.a===item.id||l.b===item.id))){
 const id=edge.a===item.id?edge.b:edge.a;
 const a=REGIONS.find(r=>r.id===item.id),b=REGIONS.find(r=>r.id===id);
 const length=Math.hypot(a.x-b.x,a.y-b.y),next=item.dist+length;
 if(next<(best.get(id)??Infinity)){best.set(id,next);todo.push({id,dist:next,path:[...item.path,id]});}
 }
 }
 return null;
}
export function atlasViewport(cx,cy,width=11,height=9){
 const tiles=[];const x0=Math.floor(cx-width/2),y0=Math.floor(cy-height/2);
 for(let y=y0;y<y0+height;y++)for(let x=x0;x<x0+width;x++){
 const t=terrainAt(x,y);if(t)tiles.push({...t,facilities:facilitiesAt(x,y)});
 }
 return tiles;
}
