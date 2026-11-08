/* Paperchalk World — every destination is a station on a two-way route.
 * Authored existing city/POI coordinates are authoritative. City hubs and
 * named POIs are connected through local access roads/footpaths, which join
 * real metro stations and existing regional rail/bus/ferry connections.
 * No fake intercity subway, mystery teleport or painted geographic backdrop.
 */
(function(global,factory){
 'use strict';
 const api=factory(global.PaperWorldAtlas,global.PaperWorldMetro);
 if(global)global.PaperWorldDestinationNetwork=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:null,function(atlas,metro){
 'use strict';
 if(!atlas)throw Error('World atlas must load before destination network');
 const CELL=40;
 // The city subway uses its own, large, pixel-dot world lattice.
 const METRO_ORIGIN=Object.freeze({x:280,y:100});
 const snap=n=>Math.round(n/CELL)*CELL;
 const HUB=c=>'hub-'+c;
 const nodes=new Map(),adj=new Map(),edgeByPair=new Map();
 const access=[],allRoutes=[];
 const point=(id,x,y,city,kind='place',name=id)=>{
  if(!id||nodes.has(id))return;
  nodes.set(id,Object.freeze({id,x:snap(x),y:snap(y),city,kind,name}));
  adj.set(id,[]);
 };
 for(const c of atlas.CITIES)point(HUB(c.id),c.x,c.y,c.id,'hub',c.name+'交通枢纽');
 // Canonical local subway node coordinates always win over approximate
 // regional landmark coordinates when both refer to the SAME place ID.
 // This prevents a photograph and its access-road pin being detached from
 // the actual metro station by one or two grid cells.
 for(const p of atlas.POIS){
  const stop=metro?.STATIONS?.[p.id];
  if(stop&&!stop.locked)
   point(p.id,METRO_ORIGIN.x+stop.gx*CELL,METRO_ORIGIN.y+stop.gy*CELL,p.city,'place',p.name);
  else point(p.id,p.x,p.y,p.city,'place',p.name);
 }
 // Actual municipal metro station nodes already exist in the real transport
 // simulation. Their positions are the SAME local square grid as in map UI.
 if(metro?.STATIONS)for(const [id,s] of Object.entries(metro.STATIONS)){
  if(!s.locked&&!nodes.has(id))
   point(id,METRO_ORIGIN.x+s.gx*CELL,METRO_ORIGIN.y+s.gy*CELL,'kirihama','metro',s.label);
 }
 const addEdge=(from,to,line)=>{
  const a=nodes.get(from),b=nodes.get(to);
  if(!a||!b||from===to)return;
  const metres=Math.hypot(a.x-b.x,a.y-b.y);
  const multiplier=line.mode==='metro'?.055:line.mode==='regional'?.055:
   line.mode==='ferry'?.16:line.mode==='localrail'?.085:
   line.mode==='coach'?.10:line.mode==='bus'?.14:.24;
  const minutes=Math.max(line.mode==='metro'?3:2,Math.round(metres*multiplier)+1);
  const push=(src,dst)=>{
   const key=src+'>'+dst+'@'+line.id;
   if(edgeByPair.has(key))return;
   const edge=Object.freeze({from:src,to:dst,line,minutes});
   edgeByPair.set(key,edge);adj.get(src).push(edge);
  };
  push(from,to);push(to,from);
 };
 const routeLine=(id,name,mode,color,stops,kind='access')=>{
  if(!Array.isArray(stops)||stops.length<2)return;
  const clean=stops.filter((id,i)=>nodes.has(id)&&(i===0||stops[i-1]!==id));
  if(clean.length<2)return;
  const line=Object.freeze({id,name,mode,color,stops:Object.freeze(clean),kind});
  allRoutes.push(line);
  for(let i=1;i<clean.length;i++)addEdge(clean[i-1],clean[i],line);
  return line;
 };
 // Each city has 3-4 spatially coherent branches radiating from its existing
 // physical city interchange. Every authored destination, including rumors,
 // forest paths, rural roads, school and shop, is a TRUE stop on a branch.
 // Route direction is symmetric; an endpoint is never a one-way dead end.
 const SECTORS=['东区','南区','西区','北区'];
 for(const city of atlas.CITIES){
  const ps=atlas.POIS.filter(p=>p.city===city.id);
  const groups=[[],[],[],[]];
  for(const p of ps){
   const theta=Math.atan2(p.y-city.y,p.x-city.x);
   const sector=Math.floor(((theta+Math.PI/4+Math.PI*2)%(2*Math.PI))/(Math.PI/2));
   groups[sector].push(p);
  }
  for(let n=0;n<groups.length;n++){
   const group=groups[n];if(!group.length)continue;
   // Nearest-neighbour chaining within a quadrant follows local roads better
   // than radial/random site order. The first stop is always the city hub.
   const pending=group.slice(),ordered=[HUB(city.id)];
   let cursor={x:city.x,y:city.y};
   while(pending.length){
    pending.sort((a,b)=>Math.hypot(a.x-cursor.x,a.y-cursor.y)-
     Math.hypot(b.x-cursor.x,b.y-cursor.y));
    const next=pending.shift();ordered.push(next.id);cursor=next;
   }
   const line=routeLine('access-'+city.id+'-'+n,
    city.name+' · '+SECTORS[n]+'接驳路',
    'access',n%2?'#8da9a6':'#a4b1a2',ordered);
   if(line)access.push(line);
  }
 }
 // Existing municipal services are additional useful edges (not replacements
 // for real all-destination access). They keep their original named stops.
 for(const line of atlas.LOCAL_TRANSIT_LINES||[])
  routeLine(line.id,line.name,line.mode,line.color,line.stops,'municipal');
 // Existing inter-city services only connect ACTUAL city hubs.
 for(const line of atlas.LINKS||[])
  routeLine(line.id,line.name,line.mode,line.color,
   line.stops.map(HUB),'regional');
 // Real operational metro routes, excluding disabled/ghost lines.
 if(metro?.LINES)for(const line of metro.LINES){
  if(line.locked)continue;
  const stops=line.stops.filter(id=>nodes.has(id));
  const l=routeLine('live-'+line.id,line.name,'metro',line.color,stops,'metro');
  if(l&&line.ring&&stops.length>2)addEdge(stops.at(-1),stops[0],l);
 }
 const fromId=id=>atlas.CITY_BY_ID[id]?HUB(id):
  ['bedroom','living-room','kitchen'].includes(id)?'entrance':id;
 function journey(from,to){
  from=fromId(from);to=fromId(to);
  if(!nodes.has(from)||!nodes.has(to))return null;
  if(from===to)return {from,to,minutes:0,legs:[],transfers:0,stops:[from],roundTrip:true};
  const queue=[{id:from,cost:0,legs:[],last:null}];
  const best=new Map();
  let count=0;
  while(queue.length&&count++<22000){
   queue.sort((a,b)=>a.cost-b.cost);
   const cur=queue.shift(),stateKey=cur.id+'|'+(cur.last||'start');
   if((best.get(stateKey)??Infinity)<=cur.cost)continue;
   best.set(stateKey,cur.cost);
   if(cur.id===to){
    return {from,to,minutes:Math.round(cur.cost),legs:cur.legs,
     transfers:cur.legs.filter((l,i)=>i>0&&l.line.id!==cur.legs[i-1].line.id).length,
     stops:[from,...cur.legs.map(e=>e.to)],roundTrip:true};
   }
   for(const edge of adj.get(cur.id)){
    const penalty=cur.last&&cur.last!==edge.line.id?3:0;
    const cost=cur.cost+edge.minutes+penalty;
    if((best.get(edge.to+'|'+edge.line.id)??Infinity)<=cost)continue;
    queue.push({id:edge.to,cost,
     legs:cur.legs.concat(edge),last:edge.line.id});
   }
  }
  return null;
 }
 function audit(){
  const missing=[],oneWay=[];
  const origin=HUB('kirihama');
  for(const p of atlas.POIS){
   const outward=journey(origin,p.id),back=journey(p.id,origin);
   if(!outward||!back)missing.push(p.id);
   else if(!outward.legs.length||!back.legs.length)oneWay.push(p.id);
  }
  return {cities:atlas.CITIES.length,locations:atlas.POIS.length,
   accessLines:access.length,allRoutes:allRoutes.length,
   directedEdges:edgeByPair.size,unreachable:missing,oneWay};
 }
 return Object.freeze({HUB,ROUTES:Object.freeze(allRoutes),ACCESS_ROUTES:Object.freeze(access),
  NODES:Object.freeze(Object.fromEntries(nodes)),journey,audit,
  at:id=>nodes.get(fromId(id))||null});
});
