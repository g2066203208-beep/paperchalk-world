/**
 * National spatial index, independent of scene renderer and player save.
 * 12x8 administrative districts, deterministic settlement geography. The
 * generated settlements are navigational LANDMARKS, not fully simulated towns.
 */
import {WORLD_WIDTH,WORLD_HEIGHT,terrainAt,regionAt,REGIONS,LINKS} from './national-atlas.js';
const hash=(a,b,c=0)=>{let n=Math.imul((a+17)*1619,(b+7)*31337)^Math.imul(c+3,1013904223);n=Math.imul(n^(n>>>15),2246822519);return (n^(n>>>13))>>>0;};
const prefixes=['青','松','长','新','南','北','东','西','石','金','白','榆','云','河','海','灰','麦','杉','竹','枫','栗','红','清','夏','望','安','明','月','湖','竹','盐','铁','岚','砂','桥','溪','岭','月','星','曙','禾','雪','野','钟','平','秋','云'];
const suffixes=['湾','镇','村','乡','集','岗','沟','谷','驿','市','坡','山','港','渡','堡','桥','庄','埠','庙','区','站','铺','坪','关','渠','垦区','营地'];
const districtTerms=['城区','镇域','农垦区','山区','林区','滨海区','产业区','流域','旧镇','郊区'];
export const DISTRICT_COLUMNS=12,DISTRICT_ROWS=8,DISTRICT_KM=30;
function landPoint(x,y){
 let tx=Math.max(1,Math.min(WORLD_WIDTH-2,Math.round(x)));
 let ty=Math.max(1,Math.min(WORLD_HEIGHT-2,Math.round(y)));
 if(!['sea','river'].includes(terrainAt(tx,ty).terrain))return {x:tx,y:ty};
 for(let radius=1;radius<=12;radius++){
  for(const [dx,dy] of [[radius,0],[-radius,0],[0,radius],[0,-radius],[radius,radius],[-radius,-radius]]){
   const px=Math.max(1,Math.min(WORLD_WIDTH-2,tx+dx));
   const py=Math.max(1,Math.min(WORLD_HEIGHT-2,ty+dy));
   if(!['sea','river'].includes(terrainAt(px,py).terrain))return {x:px,y:py};
  }
 }
 return {x:tx,y:ty};
}
export const DISTRICTS=[];
for(let row=0;row<DISTRICT_ROWS;row++)for(let col=0;col<DISTRICT_COLUMNS;col++){
 const center=landPoint(col*DISTRICT_KM+15,row*DISTRICT_KM+15);
 const region=regionAt(center.x,center.y),h=hash(col,row,610);
 const noun=prefixes[h%prefixes.length]+prefixes[(h>>>8)%prefixes.length];
 DISTRICTS.push(Object.freeze({id:'district-'+col+'-'+row,col,row,x:center.x,y:center.y,
  parent:region.id,name:noun+districtTerms[(h>>>16)%districtTerms.length],biome:region.biome,
  areaKm2:DISTRICT_KM*DISTRICT_KM}));
}
const placeTypes={
 metro:['城区','街区','车站','商圈','居民区'],oldtown:['老街','古镇','文化街'],
 harbor:['码头','货港','海运站'],farmland:['村','农庄','农机站','粮库'],
 forest:['林场','护林站','木材场'],mining:['矿区','矿山','选矿场'],
 industrial:['产业园','工业园','货场','电站'],
 town:['城镇','市集','汽车站'],fishing:['渔港','鱼市'],
 mountain:['山口','车站','矿道'],lake:['湖畔镇','农庄'],
 shipyard:['船坞','造船厂','货运码头']
};
export const SETTLEMENTS=[];
for(const district of DISTRICTS){
 for(let i=0;i<10;i++){
  const h=hash(district.col*31+i,district.row*37+i,286);
  const gx=district.col*DISTRICT_KM+4+Math.floor(h%24);
  const gy=district.row*DISTRICT_KM+4+Math.floor((h>>>9)%23);
  const position=landPoint(gx,gy),terrain=terrainAt(position.x,position.y);
  const cls=placeTypes[district.biome]||placeTypes.town;
  const name=prefixes[(h>>>17)%prefixes.length]+suffixes[(h>>>22)%suffixes.length];
  const type=cls[(h>>>12)%cls.length],size=i===0?'regional':i<3?'town':'village';
  SETTLEMENTS.push(Object.freeze({id:'settlement-'+district.col+'-'+district.row+'-'+i,
   name:name+'·'+type,type,size,district:district.id,x:position.x,y:position.y,
   terrain:terrain?.terrain||'grass'}));
 }
}
export const TRANSPORT_SEGMENTS=[];
const add=(id,mode,a,b,tier)=>{
 if(!a||!b||a.id===b.id)return;
 TRANSPORT_SEGMENTS.push(Object.freeze({id,mode,a:{x:a.x,y:a.y},b:{x:b.x,y:b.y},tier}));
};
for(const district of DISTRICTS){
 const col=district.col,row=district.row;
 if(col<DISTRICT_COLUMNS-1){
  const next=DISTRICTS.find(x=>x.col===col+1&&x.row===row);
  const m=terrainAt(Math.round((district.x+next.x)/2),Math.round((district.y+next.y)/2));
  if(m?.terrain!=='sea')add('h-'+col+'-'+row,'road',district,next,'highway');
 }
 if(row<DISTRICT_ROWS-1){
  const next=DISTRICTS.find(x=>x.col===col&&x.row===row+1);
  const m=terrainAt(Math.round((district.x+next.x)/2),Math.round((district.y+next.y)/2));
  if(m?.terrain!=='sea')add('v-'+col+'-'+row,'road',district,next,'highway');
 }
 for(const s of SETTLEMENTS.filter(x=>x.district===district.id)){
  add('access-'+s.id,'road',district,s,'local');
 }
}
for(const link of LINKS){
 const a=REGIONS.find(r=>r.id===link.a),b=REGIONS.find(r=>r.id===link.b);
 add('trunk-'+link.mode+'-'+link.a+'-'+link.b,link.mode,a,b,'trunk');
}
export function districtAt(x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=WORLD_WIDTH||y>=WORLD_HEIGHT)return null;
 return DISTRICTS[Math.min(DISTRICT_ROWS-1,Math.floor(y/DISTRICT_KM))*DISTRICT_COLUMNS+
 Math.min(DISTRICT_COLUMNS-1,Math.floor(x/DISTRICT_KM))];
}
export function settlementsInBounds(left,top,right,bottom,minSize='village'){
 const rank={regional:3,town:2,village:1};
 return SETTLEMENTS.filter(s=>s.x>=left&&s.y>=top&&s.x<=right&&s.y<=bottom&&rank[s.size]>=rank[minSize]);
}
export function transportInBounds(left,top,right,bottom,mode=null){
 return TRANSPORT_SEGMENTS.filter(t=>(!mode||t.mode===mode)&&
 Math.max(t.a.x,t.b.x)>=left&&Math.min(t.a.x,t.b.x)<=right&&
 Math.max(t.a.y,t.b.y)>=top&&Math.min(t.a.y,t.b.y)<=bottom);
}
export function describeMapLocation(x,y){
 const t=terrainAt(x,y);if(!t)return null;
 const district=districtAt(x,y);
 const nearby=SETTLEMENTS.filter(s=>s.district===district.id)
 .sort((a,b)=>(a.x-x)**2+(a.y-y)**2-((b.x-x)**2+(b.y-y)**2)).slice(0,4);
 return {x,y,terrain:t.terrain,district,region:regionAt(x,y),
  nearby,facilities:nearby.length};
}

/**
 * Highway-constrained itinerary from a local street to a mapped settlement.
 * No direct countrywide coordinate teleport: only district highway edges
 * already present in TRANSPORT_SEGMENTS are traversable.
 */
export function planCountryRoad(from,settlementId){
 const target=SETTLEMENTS.find(s=>s.id===settlementId);
 const start=districtAt(from?.x,from?.y);
 const finish=target&&DISTRICTS.find(d=>d.id===target.district);
 if(!start||!finish)return null;
 const highway=TRANSPORT_SEGMENTS.filter(edge=>edge.mode==='road'&&edge.tier==='highway');
 const nearest=(point)=>DISTRICTS.find(d=>d.x===point.x&&d.y===point.y)?.id||null;
 const adj=new Map(DISTRICTS.map(d=>[d.id,[]]));
 for(const edge of highway){
  const a=nearest(edge.a),b=nearest(edge.b);
  if(!a||!b||a===b)continue;
  const km=Math.hypot(edge.a.x-edge.b.x,edge.a.y-edge.b.y);
  adj.get(a).push({id:b,km});adj.get(b).push({id:a,km});
 }
 const dist=new Map([[start.id,0]]),previous=new Map(),seen=new Set();
 while(true){
  let next=null,min=Infinity;
  for(const [id,v] of dist)if(!seen.has(id)&&v<min){min=v;next=id;}
  if(!next)break;
  if(next===finish.id)break;
  seen.add(next);
  for(const segment of adj.get(next)||[]){
   const score=min+segment.km;
   if(score<(dist.get(segment.id)??Infinity)){
    dist.set(segment.id,score);previous.set(segment.id,next);
   }
  }
 }
 if(!dist.has(finish.id))return null;
 const districts=[finish.id];let cursor=finish.id;
 while(cursor!==start.id){
  cursor=previous.get(cursor);if(!cursor)return null;
  districts.unshift(cursor);
 }
 const legs=[{x:from.x,y:from.y},...districts.map(id=>{
  const d=DISTRICTS.find(x=>x.id===id);return {x:d.x,y:d.y};
 }),{x:target.x,y:target.y}];
 const lengthKm=Math.round(dist.get(finish.id)+Math.hypot(from.x-start.x,from.y-start.y)+
 Math.hypot(target.x-finish.x,target.y-finish.y));
 return {target:target.id,to:{x:target.x,y:target.y},districts,legs,
  lengthKm,mode:'road',estimatedMinutes:Math.max(1,Math.ceil(lengthKm/55*60))};
}
