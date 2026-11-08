/* Paperchalk World — TWO explicit navigation levels, ONE transit graph:
 * REGION: cities and real inter-city lines only.
 * CITY: the chosen city's own metro/tram/bus/road network and destinations.
 * Zoom cannot leak metro lines across levels; city click opens a separate view.
 */
(function(global){
'use strict';
const NS='http://www.w3.org/2000/svg';
const CELL=40,W=2000,H=1280,LOCAL_X=840,LOCAL_Y=480;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const snap=x=>Math.round(x/CELL)*CELL;
const element=(tag,cls,label)=>{
 const e=document.createElement(tag);
 if(cls)e.className=cls;
 if(label!==undefined)e.textContent=String(label);
 return e;
};
const vector=(tag,attrs={},cls)=>{
 const e=document.createElementNS(NS,tag);
 if(cls)e.setAttribute('class',cls);
 for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));
 return e;
};
const PHOTO=Object.freeze({
 entrance:['https://commons.wikimedia.org/wiki/Special:FilePath/Residential_area.jpg?width=540','./assets/scenes/entrance.webp'],
 school:['https://commons.wikimedia.org/wiki/Special:FilePath/Horikoshi_High_School_(external_appearance).jpg?width=540','./assets/classroom.webp'],
 convenience:['https://commons.wikimedia.org/wiki/Special:FilePath/Family-Mart-store_JA-Izumo-Otsu.jpg?width=540','./assets/locations/convenience.svg'],
 cafe:['https://commons.wikimedia.org/wiki/Special:FilePath/Cafe_Casa%2C_Tokyo_2021.jpg?width=540','./assets/locations/cafe.svg'],
 mall:['https://commons.wikimedia.org/wiki/Special:FilePath/Shinjuku_Keio-Department-store.jpg?width=540','./assets/locations/mall.svg'],
 park:['https://commons.wikimedia.org/wiki/Special:FilePath/Fuchu-city.Tokyo.Japan.Keyaki.namiki.dori.fuchu.jpg?width=540','./assets/locations/park.svg']
});
const PLACE_NAMES=Object.freeze({
 entrance:'家',school:'学校',convenience:'便利店',cafe:'咖啡厅',
 mall:'商场',park:'公园',central:'中央换乘站',northgate:'北街口'
});
const HOME=new Set(['bedroom','living-room','kitchen']);
const PLACEHOLDER='./assets/locations/park.svg';
function draw({body,snapshot,locations={},availability,onTravel,onBoard,onWorldTravel,onFeedback}){
 const metro=global.PaperWorldMetro,atlas=global.PaperWorldAtlas,geometry=global.PaperWorldMetroGeometry,network=global.PaperWorldDestinationNetwork;
 if(!metro||!atlas||!geometry||!network){body.textContent='交通路线尚未加载';return}
 global.PaperWorldTransitMap?._cleanup?.();
 const here=HOME.has(snapshot?.location)?'entrance':snapshot?.location||'entrance';
 const herePoi=atlas.POI_BY_ID[here];
 const currentCity=network.at(here)?.city||herePoi?.city||'kirihama';
 const hereCity=atlas.CITY_BY_ID[currentCity]||atlas.CITIES[0];
 const map=element('section','pw-transit-map pw-dot-world-map');
 map.setAttribute('aria-label','分级交通地图：跨市交通总览及各市独立市内线路');
 map.dataset.scope='region';
 map.dataset.grid='50x32';
 const canvas=element('div','pw-dot-world-canvas');
 const svg=vector('svg',{viewBox:'0 0 '+W+' '+H,preserveAspectRatio:'none'},'pw-transit-lines pw-dot-rail-canvas');
 const dots=vector('g',{},'pw-transit-dot-matrix');
 let previousDotScale=-1;
 const regional=vector('g',{},'pw-dot-regional-lines');
 const selectedRoute=vector('g',{},'pw-dot-selected-route');
 const urban=vector('g',{},'pw-dot-urban-lines');
 const metroNetwork=vector('g',{},'pw-dot-planned-metro');
 const municipal=vector('g',{},'pw-dot-municipal-lines');
 const access=vector('g',{},'pw-dot-access-lines');
 const cardLeaders=vector('g',{},'pw-dot-card-leaders');
 const stops=vector('g',{},'pw-dot-stations');
 svg.append(dots,regional,metroNetwork,municipal,access,urban,selectedRoute,cardLeaders,stops);
 const areaLayer=element('div','pw-dot-areas');
 const cityLayer=element('div','pw-dot-cities');
 const placeLayer=element('div','pw-dot-places');
 const metroLayer=element('div','pw-dot-local-places');
 canvas.append(svg,areaLayer,cityLayer,placeLayer,metroLayer);
 map.append(canvas);
 const chrome=element('header','pw-dot-chrome');
 const heading=element('div','pw-dot-heading');
 heading.append(element('strong','pw-dot-title','交通图'),
  element('small','pw-dot-subtitle',(hereCity?.name||'霧浜市')+' · '+(locations[here]?.label||metro.STATIONS[here]?.label||'当前位置')));
 const tools=element('div','pw-dot-tools');
 const back=element('button','pw-dot-tool pw-dot-back','← 城际地图');
 back.type='button';back.setAttribute('aria-label','返回城际交通总图');
 back.hidden=true;tools.append(back);
 const buttons=[['−','缩小地图'],['+','放大地图'],['全域','查看当前层全图'],['定位','定位人物所在城市及站点']];
 const toolBtns=buttons.map(([name,title])=>{
  const b=element('button','pw-dot-tool',name);
  b.type='button';b.setAttribute('aria-label',title);tools.append(b);return b;
 });
 chrome.append(heading,tools);
 const hint=element('div','pw-dot-hint','点击城市进入独立市内交通图 · 城际线路只在此层显示');
 const subwayLegend=element('div','pw-dot-metro-legend');
 subwayLegend.setAttribute('aria-label','地铁路线图例');
 for(const line of metro.LINES.filter(l=>!l.locked)){
  const item=element('div','pw-dot-metro-legend-entry');
  const key=element('i','pw-dot-metro-legend-line');
  key.style.background=line.color;
  item.append(key,element('span','pw-dot-metro-legend-label',line.name));
  subwayLegend.append(item);
 }
 subwayLegend.hidden=true;
 const emptyMetro=element('div','pw-dot-metro-no-service');
 emptyMetro.append(element('strong','pw-dot-empty-title','本市暂无已登记运营地铁'),
  element('small','pw-dot-empty-sub','不把公交、道路或步行线路伪装成地铁。'),
  element('small','pw-dot-empty-hint','← 返回城际地图查看其他城市'));
 emptyMetro.hidden=true;
 const popup=element('div','pw-transit-popup pw-dot-popup');
 popup.hidden=true;popup.setAttribute('role','group');
 map.append(chrome,hint,subwayLegend,emptyMetro,popup);
 body.replaceChildren(map);
 // Only explicit city selection can reveal internal rail or destination pins.
 let activeCity=null,regionalCamera=null;
 let scale=1,minScale=.5,x=0,y=0,drag=null,busy=false,selected=null,focused=false;
 const fingers=new Map();let pinch=null;
 let lastW=844,lastH=390;
 const cleanupListeners=[];
 function notify(msg){onFeedback?.(msg)}
 function clear(){
  popup.hidden=true;selectedRoute.replaceChildren();selected?.removeAttribute('data-selected');
  selected=null;
 }
 function positionPopup(event,node){
  const outer=map.getBoundingClientRect();
  const r=node?.getBoundingClientRect();
  const w=Math.min(236,Math.max(155,outer.width*.27));
  const h=popup.offsetHeight||124;
  const left=r?(r.right-outer.left+12):(event.clientX-outer.left+12);
  const top=r?(r.top-outer.top+r.height*.45):(event.clientY-outer.top);
  popup.style.width=w+'px';
  popup.style.left=clamp(left+w>outer.width?left-w-(r?.width||0)-24:left,
   5,Math.max(5,outer.width-w-5))+'px';
  popup.style.top=clamp(top-h*.3,5,Math.max(5,outer.height-h-5))+'px';
 }
 function showMenu(e,node,title,detail,commands,previewUrl=null){
  clear();e.stopPropagation();
  popup.replaceChildren(element('strong','pw-transit-popup-name',title),
   element('small','pw-transit-popup-sub',detail));
  const group=element('div','pw-transit-popup-buttons');
  for(const a of commands){
   const b=element('button','pw-transit-menu-item'+(a.primary?' is-primary':''),a.label);
   b.type='button';b.disabled=!!a.disabled;
   b.addEventListener('click',ev=>{ev.stopPropagation();a.run()});group.append(b);
  }
  if(previewUrl){
   const preview=element('div','pw-dot-preview-photo');
   const im=element('img');im.alt='地点照片仅作场景参考';im.loading='lazy';im.decoding='async';
   im.referrerPolicy='no-referrer';im.src=previewUrl;
   preview.append(im);popup.append(preview);
  }
  popup.append(group);
  popup.hidden=false;selected=node;node?.setAttribute('data-selected','true');
  positionPopup(e,node);
 }
 const anchored=[];
 function put(node,p,layer){
  // Store geometry separately: UI nodes stay at native CSS pixel resolution.
  node.dataset.worldX=p.x;node.dataset.worldY=p.y;
  anchored.push({node,p});
  layer.append(node);
 }

 // The same integer lattice owns regional routes, subway turns and every pin.
 // No terrain background at this stage: only the dot lattice and real routes.
 for(let cy=0;cy<=H;cy+=CELL)for(let cx=0;cx<=W;cx+=CELL){
  dots.append(vector('circle',{cx,cy,r:1.2},'pw-transit-grid-dot'));
 }
 function rounded(points,radius=13){
  if(!points?.length)return '';
  const result=['M'+points[0].x+' '+points[0].y];
  for(let i=1;i<points.length-1;i++){
   const a=points[i-1],p=points[i],b=points[i+1];
   const ax=p.x-a.x,ay=p.y-a.y,bx=b.x-p.x,by=b.y-p.y;
   const da=Math.hypot(ax,ay),db=Math.hypot(bx,by);
   if(da<1||db<1||ax*bx+ay*by>da*db*.999){
    result.push('L'+p.x+' '+p.y);continue;
   }
   const r=Math.min(radius,da*.44,db*.44);
   result.push('L'+(p.x-ax/da*r)+' '+(p.y-ay/da*r));
   result.push('Q'+p.x+' '+p.y+' '+(p.x+bx/db*r)+' '+(p.y+by/db*r));
  }
  const last=points[points.length-1];
  result.push('L'+last.x+' '+last.y);
  return result.join(' ');
 }
 const location=p=>({x:snap(p.x),y:snap(p.y)});
 function orthogonal(a,b,offset=0){
  const start=location(a),end=location(b);
  if(start.x===end.x||start.y===end.y)return [start,end];
  // Map-network curves are always orthogonal, with rounded 90-degree corners.
  const mid=snap((start.x+end.x)*.5+offset);
  return [start,{x:mid,y:start.y},{x:mid,y:end.y},end]
   .filter((p,i,arr)=>i===0||p.x!==arr[i-1].x||p.y!==arr[i-1].y);
 }
 function previewRegionalRoute(legs){
  selectedRoute.replaceChildren();
  if(!Array.isArray(legs)||!legs.length)return;
  for(const item of legs){
   const a=network.at(item.from),b=network.at(item.to);
   if(!a||!b)continue;
   // In the region show inter-city legs only; in a city show only its
   // internal legs. Never overlay internal metro on an inter-city view.
   if(activeCity?(a.city!==activeCity||b.city!==activeCity):
     (a.city===b.city))continue;
   const d=rounded(orthogonal(a,b),18);
   selectedRoute.append(vector('path',{d,'data-service':item.line?.mode||'regional'},
    'pw-dot-route-preview-line'));
  }
 }
 function previewMetroRoute(route){
  selectedRoute.replaceChildren();
  if(!route?.segments?.length||activeCity!=='kirihama')return;
  for(const leg of route.segments){
   const a=metro.STATIONS[leg.from],b=metro.STATIONS[leg.to];
   if(!a||!b)continue;
   const intermediate=geometry.routes[leg.line.id+':'+leg.from+':'+leg.to]||
    (geometry.routes[leg.line.id+':'+leg.to+':'+leg.from]||[]).slice().reverse();
   const points=[localPoint(a),...intermediate.map(([gx,gy])=>localPoint({gx,gy})),
    localPoint(b)];
   selectedRoute.append(vector('path',{
    d:rounded(points,15),'data-line':leg.line.id},
    'pw-dot-route-preview-line pw-dot-metro-journey-preview'));
  }
 }
 function lineGroup(parent,line,from,to,points,kind,hitCallback){
  const g=vector('g',{'data-line':line.id,'data-from':from,'data-to':to,
   'data-kind':kind,'data-mode':line.mode||'metro'},'pw-transit-segment pw-dot-segment');
  const d=rounded(points,kind==='metro'?15:20);
  g.append(vector('path',{d,stroke:'#0e1822','vector-effect':'non-scaling-stroke'},'pw-transit-rail-casing'));
  g.append(vector('path',{d,stroke:line.color||'#b7cbc7','vector-effect':'non-scaling-stroke'},'pw-transit-rail'));
  g.append(vector('path',{d,stroke:'#eff6ed','vector-effect':'non-scaling-stroke'},'pw-transit-rail-glint'));
  if(hitCallback){
   const hit=vector('path',{d,stroke:'transparent',tabindex:0,role:'button',
    'vector-effect':'non-scaling-stroke',
    'aria-label':line.name},'pw-transit-line-hit');
   hit.addEventListener('click',e=>{if(drag?.moved)return;hitCallback(e,g)});
   hit.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){
    e.preventDefault();const r=hit.getBoundingClientRect();
    hit.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.x+r.width/2,
     clientY:r.y+r.height/2}));
   }});
   g.append(hit);
  }
  parent.append(g);
  return g;
 }
 for(const l of atlas.LINKS){
  for(let i=1;i<l.stops.length;i++){
   const from=l.stops[i-1],to=l.stops[i],a=atlas.CITY_BY_ID[from],b=atlas.CITY_BY_ID[to];
   if(!a||!b)continue;
   const mode=l.mode==='highway'?'road':l.mode;
   const points=orthogonal(a,b,((atlas.LINKS.indexOf(l)%3)-1)*CELL);
   const pseudo={...l,mode};
   lineGroup(regional,pseudo,from,to,points,'regional',(e,node)=>{
    // A regional track is an actual travel action, not only a shortcut to
    // another city's subway viewer. Plan the full journey from the player's
    // current physical location to the chosen city's interchange.
    const destination=network.HUB(to),journey=network.journey(here,destination);
    const canTravel=!!journey?.legs?.length&&!HOME.has(snapshot?.location)&&
      snapshot?.nightStatus==='day'&&!snapshot?.metro?.onboard;
    const detail=HOME.has(snapshot?.location)?
      '请先到玄关出门，再规划城际路线':
      !journey?.legs?.length?
       here===destination?'你已在该交通枢纽':'当前没有可用的去回线路':
       '至'+b.name+'交通枢纽 · 约'+journey.minutes+'分钟 · '+journey.transfers+'次换乘';
    showMenu(e,node,l.name,detail,[
      {label:'查看'+b.name+'地铁图',run:()=>{clear();enterCity(to)}},
      {label:'乘车前往'+b.name,primary:true,disabled:!canTravel,run:async()=>{
       if(busy)return;busy=true;clear();
       try{
        const res=await onWorldTravel?.(destination,journey);
        if(!res?.ok)notify(res?.reason||'当前无法前往');
       }catch(_){notify('城际旅行失败')}finally{busy=false}
      }}
    ]);
    if(journey?.legs?.length)previewRegionalRoute(journey.legs);
   });
  }
 }
 // Strict SUBWAY ONLY: municipal buses/trams, walking roads and local
 // destination access exist in the gameplay journey graph, but never
 // become subway tracks or subway stations in this view.
 const stopButtons=new Map();
 const localPoint=p=>({x:LOCAL_X+p.gx*CELL,y:LOCAL_Y+p.gy*CELL});
 for(const l of metro.LINES){
  for(const [from,to] of geometry.segments(l)){
   const a=metro.STATIONS[from],b=metro.STATIONS[to];
   const via=geometry.routes[l.id+':'+from+':'+to]||[];
   const ps=[localPoint(a),...via.map(p=>localPoint({gx:p[0],gy:p[1]})),localPoint(b)];
   lineGroup(urban,l,from,to,ps,'metro',(e,node)=>{
    const choice=metro.boardingChoices(here).find(p=>p.id===l.id);
    if(!choice){showMenu(e,node,l.name,'请先到这条线路的站点',[]);return}
    showMenu(e,node,l.name,'当前站 · '+metro.STATIONS[here].label,
     choice.directions.map(dir=>({
      label:dir.label,primary:true,run:async()=>{
       if(busy)return;busy=true;clear();
       try{const res=await onBoard?.(l.id,dir.direction);
        if(!res?.ok)notify(res?.reason||'无法登车');
       }catch(err){notify('乘车失败')}finally{busy=false}
      }
     })));
   });
  }
 }
 for(const [id,s] of Object.entries(metro.STATIONS)){
  if(s.locked)continue; // No fabricated empty southern line / fake stations.
  const p=localPoint(s);
  const g=vector('g',{'data-stop':id,'data-current':id===here,'data-city':'kirihama'},
   'pw-transit-stop-group');
  if(id===here)g.append(vector('circle',{cx:p.x,cy:p.y,r:12},'pw-transit-stop-halo'));
  g.append(vector('circle',{cx:p.x,cy:p.y,r:s.transfer?6.5:5},
   'pw-transit-stop-circle'));
  if(s.transfer)g.append(vector('circle',{cx:p.x,cy:p.y,r:2.6},
   'pw-transit-transfer-core'));
  stops.append(g);
 }
 function previewImage(image,sources){
  const srcs=[...new Set(sources.filter(Boolean))];
  if(!srcs.length)return;
  image.src=srcs[srcs.length-1];
  let index=0;
  function next(){
   if(index>=srcs.length)return;
   const src=srcs[index++];
   const loader=new Image();
   loader.referrerPolicy='no-referrer';
   loader.onload=()=>{if(image.isConnected&&loader.naturalWidth)image.src=src};
   loader.onerror=next;loader.src=src;
  }
  next();
 }
 function photo(node,sources){
  const pic=element('span','pw-transit-photo'),img=element('img');
  img.alt='';img.decoding='async';img.loading='lazy';img.referrerPolicy='no-referrer';
  pic.append(img);node.append(pic);previewImage(img,sources);
 }
 function localPlace(id,station){
  // Only approved metro stations — not the school, café or shop as POIs.
  const p=localPoint(station),name=station.label;
  const node=element('button','pw-transit-place pw-dot-place is-station');
  node.type='button';node.dataset.place=id;node.dataset.local='true';
  node.dataset.current=String(here===id);node.dataset.station=id;
  node.dataset.stationOnly='true';stopButtons.set(id,node);
  node.dataset.gridColumn=station.gx;node.dataset.gridRow=station.gy;
  node.append(element('span','pw-transit-station-dot',station.transfer?'◎':'●'),
   element('span','pw-transit-place-name',name));
  put(node,p,metroLayer);
  node.addEventListener('click',e=>{
   if(drag?.moved)return;e.stopPropagation();
   const trip=metro.path(here,id);
   // Subway access belongs to the station, not the business or school
   // nearby: an evening train remains boardable after shops close.
   const canRide=snapshot?.nightStatus==='day'&&!snapshot?.metro?.onboard;
   const viable=!!trip?.segments?.length;
   showMenu(e,node,name,viable?
    '地铁 · '+trip.lines.join(' → ')+
    (trip.transfers.length?' · '+trip.transfers.length+' 次换乘':' · 无需换乘'):
    id===here?'当前所在站':'请先抵达正式地铁站',[
    {label:'乘地铁前往',primary:true,disabled:!viable||!canRide,run:async()=>{
     if(busy)return;busy=true;clear();
     try{const res=await onTravel?.(id,trip);
      if(!res?.ok)notify(res?.reason||'当前无法乘车')}
     catch(err){notify('地铁行程不可用')}finally{busy=false}
    }},
    {label:'查看地铁路线',disabled:!viable,run:()=>{
     clear();previewMetroRoute(trip);
    }}
   ]);
   if(viable)previewMetroRoute(trip);
  });
 }
 for(const [id,s] of Object.entries(metro.STATIONS))if(!s.locked)localPlace(id,s);
 const areaNodes=[];
 for(const a of atlas.AREAS){
  const label=element('span','pw-dot-area-label',a.name);
  label.dataset.area=a.id;put(label,location(a),areaLayer);
  areaNodes.push(label);
 }
 const transitPOIs=new Set(atlas.POIS.map(p=>p.id)); // Every destination is now a routable stop.
 function loadCardPhoto(img,source){
  if(!img||!source||img.dataset.loaded==='true')return;
  img.dataset.loaded='true';
  img.onerror=()=>{img.onerror=null;img.src=PLACEHOLDER};
  img.src=source;
 }
 const cityNodes=[];
 for(const c of atlas.CITIES){
  const node=element('button','pw-dot-city');
  node.type='button';node.dataset.city=c.id;node.dataset.size=c.size;
  node.dataset.station=network.HUB(c.id);stopButtons.set(network.HUB(c.id),node);
  const thumb=atlas.PHOTOS[c.id==='kirihama'?'metropolis':
   c.id==='misaki'||c.id==='urasima'?'coast':
   c.id==='naruba'||c.id==='okuzawa'?'mountain':
   c.id==='homori'||c.id==='mizuho'?'rice':'street'];
  // The bottom of the large picture card is physically attached to this hub.
  const pic=element('span','pw-transit-photo');
  const img=element('img');img.alt='';img.loading='lazy';
  img.referrerPolicy='no-referrer';img.decoding='async';
  pic.append(img);node.append(pic,element('span','pw-transit-place-name',c.name));
  put(node,location(c),cityLayer);
  cityNodes.push({node,city:c,img,source:thumb?.url});
  node.addEventListener('click',e=>{
   if(drag?.moved)return;
   e.stopPropagation();
   // Clicking a city ENTERS its independent local rail diagram.
   // Its physical interchange offers travel actions after entry.
   enterCity(c.id);
  });
 }
 // Map-specific location images belong in a separate place planner,
 // never in subway-only tracks. World destinations remain in atlas/network.
 const worldNodes=[];
 // Dedicated, world-coordinate player marker is not a fictional POI.
 const you=element('span','pw-dot-current-location');
 you.setAttribute('aria-label','当前位置');
 you.append(element('i','pw-dot-current-ring'),
  element('span','pw-dot-current-text','你在这里'));
 areaLayer.append(you);
 // Always keep the actual current place legible under photo-pin decluttering.
 worldNodes.sort((a,b)=>Number(b.poi.id===here)-Number(a.poi.id===here)||
  Number(transitPOIs.has(b.poi.id))-Number(transitPOIs.has(a.poi.id)));
 const caption=element('span','pw-transit-caption','');
 const sub=element('span','pw-transit-tip','');
 map.append(caption,sub);
 function viewport(){const r=map.getBoundingClientRect();return {w:r.width||844,h:r.height||390}}
 function centerOn(p,s){
  const v=viewport();scale=clamp(s,minScale,9);
  x=v.w*.5-location(p).x*scale;y=v.h*.5-location(p).y*scale;
  constrain();position();
 }
 function enterCity(id){
  const city=atlas.CITY_BY_ID[id];if(!city)return;
  if(activeCity===null)regionalCamera={scale,x,y};
  activeCity=id;drag=null;pinch=null;fingers.clear();clear();
  const v=viewport();
  // Kirihama's physical eight-stop metro is centered north of the city
  // interchange. Frame the railway itself, not the broad city-hub centroid.
  const target=id==='kirihama'?{x:1080,y:550}:city;
  centerOn(target,Math.max(3.15,Math.min(4.8,(v.w-160)/285,(v.h-165)/175)));
 }
 function leaveCity(){
  if(activeCity===null)return;
  activeCity=null;drag=null;pinch=null;fingers.clear();clear();
  if(regionalCamera){
   ({scale,x,y}=regionalCamera);regionalCamera=null;constrain();position();
  }else centerOn({x:W*.5,y:H*.5},minScale);
 }
 function fitSelectedCity(){
  if(!activeCity){centerOn({x:W*.5,y:H*.5},minScale);return}
  const city=atlas.CITY_BY_ID[activeCity],v=viewport();
  const pts=[city];
  if(activeCity==='kirihama'){
   // Fit ONLY subway infrastructure. Off-network cafés, forests, and road
   // access points must never determine the metro camera bounds.
   pts.length=0;
   for(const stop of Object.values(metro.STATIONS))
    if(!stop.locked)pts.push(localPoint(stop));
  }
  const xs=pts.map(p=>location(p).x),ys=pts.map(p=>location(p).y);
  const bounds={left:Math.min(...xs),right:Math.max(...xs),
   top:Math.min(...ys),bottom:Math.max(...ys)};
  const wanted=Math.min((v.w-140)/(bounds.right-bounds.left+125),
   (v.h-165)/(bounds.bottom-bounds.top+125));
  centerOn({x:(bounds.left+bounds.right)/2,y:(bounds.top+bounds.bottom)/2},
   Math.max(minScale,Math.min(9,wanted)));
 }
 function constrain(){
  const v=viewport(),pad=22;
  x=(W*scale<v.w)?(v.w-W*scale)*.5:clamp(x,v.w-W*scale-pad,pad);
  y=(H*scale<v.h)?(v.h-H*scale)*.5:clamp(y,v.h-H*scale-pad,pad);
 }
 function position(){
  const v=viewport();
  // SVG viewBox is recreated for the actual viewport on every zoom.
  // No scaled CSS compositor layer: vectors remain crisp and all labels,
  // photo cards and clickable targets are painted at native screen pixels.
  svg.setAttribute('viewBox',(-x/scale)+' '+(-y/scale)+' '+(v.w/scale)+' '+(v.h/scale));
  svg.style.width=v.w+'px';svg.style.height=v.h+'px';
  // A 1.7px screen-space dot is the same size at every zoom, never a
  // five-pixel blurry disc just because the SVG logical view grew.
  if(Math.abs(scale-previousDotScale)>.0005){
   previousDotScale=scale;
   const radius=1.25/scale;
   for(const dot of dots.children)dot.setAttribute('r',radius.toFixed(4));
   // Circles use vector coordinates but never shrink to illegible pixels on
   // the world overview, nor turn into giant blobs at street-level zoom.
   for(const stop of stops.querySelectorAll('circle')){
    const r=stop.classList.contains('pw-dot-destination-stop')?
     (stop.classList.contains('is-interchange')?13:7):
     stop.classList.contains('pw-transit-stop-halo')?18:
     stop.classList.contains('pw-transit-transfer-core')?4.2:
     stop.closest('.pw-transit-stop-group')?.querySelector('.pw-transit-transfer-core')?10:8;
    stop.setAttribute('r',(r/scale).toFixed(4));
   }
   for(const stop of municipal.querySelectorAll('.pw-dot-municipal-stop'))
    stop.setAttribute('r',(6.5/scale).toFixed(4));
  }
  for(const {node,p} of anchored){
   node.style.left=(x+p.x*scale)+'px';
   node.style.top=(y+p.y*scale)+'px';
  }
  // Explicit map scope, NOT zoom: intercity vs one city's SUBWAY ONLY.
  const scoped=activeCity!==null,city=atlas.CITY_BY_ID[activeCity];
  const hasMetro=activeCity==='kirihama'&&metro.LINES.some(l=>!l.locked);
  map.dataset.scope=scoped?'city':'region';
  map.dataset.city=activeCity||'';
  map.dataset.transport=scoped?'metro':'regional';
  map.dataset.zoom=scoped?'metro':'region';
  map.dataset.compact=String(!scoped&&scale<.65);
  map.dataset.smallScreen=String(v.w<900);
  back.hidden=!scoped;emptyMetro.hidden=!scoped||hasMetro;
  subwayLegend.hidden=!hasMetro;
  heading.querySelector('.pw-dot-title').textContent=scoped?
   city.name+' · 地铁线路图':'城际交通总图';
  heading.querySelector('.pw-dot-subtitle').textContent=scoped?
   hasMetro?'仅运营地铁 · 车站 · 换乘 · 无其他交通':
    '当前城市暂无已确认的运营地铁线路':
   '点击城市查看该城市独立地铁图';
  hint.textContent=scoped?
   '地铁专用 · 其他交通方式不在此图 · ← 返回城际':
   '城际交通总图 · 点击城市查看独立地铁';
  caption.textContent=scoped?city.name+' · 地铁线路':'十城城际交通';
  sub.textContent=scoped?
   hasMetro?'点击地铁站查询乘车和换乘 · 不显示道路公交':
    '本城市暂无正式地铁线路':
   '各城市地铁独立显示 · 不在总图混合';
  canvas.style.setProperty('--dot-city-label-size',v.w<900?'15px':'19px');
  canvas.style.setProperty('--dot-area-label-size','16px');
  canvas.style.setProperty('--dot-poi-label-size',v.w<900?'14px':'16px');
  for(const n of areaNodes)n.hidden=true;
  regional.style.display=scoped?'none':'';
  regional.style.opacity='.95';
  urban.style.display=hasMetro?'':'none';
  metroNetwork.style.display='none';
  municipal.style.display='none';
  access.style.display='none';
  stops.style.display=hasMetro?'':'none';
  for(const group of stops.children)
   group.style.display=hasMetro&&group.dataset.city==='kirihama'?'':'none';
  metroLayer.hidden=!hasMetro;
  placeLayer.hidden=true;
  // Never draw a made-up subway player pin at the city-centre hub when
  // the player is actually in a home, shop, forest or other off-rail POI.
  const atMetroStop=!!(scoped&&hasMetro&&metro.STATIONS[here]);
  const actualHere=atMetroStop?localPoint(metro.STATIONS[here]):hereCity;
  you.hidden=scoped&&(!atMetroStop||currentCity!==activeCity);
  you.style.left=(x+location(actualHere).x*scale)+'px';
  you.style.top=(y+location(actualHere).y*scale)+'px';
  you.dataset.region=String(!scoped);
  // Intercity map contains ONLY cities, with large photos and route pins.
  // When a city is selected, all ten city cards disappear completely.
  for(const {node,city} of cityNodes){
   const px=x+location(city).x*scale,py=y+location(city).y*scale;
   node.hidden=scoped||px<-130||px>v.w+130||py<-170||py>v.h+210;
  }
  cardLeaders.replaceChildren();
  if(!scoped){
   const cityCardWidth=v.h<440?130:148;
   const cityCardHeight=v.h<440?112:135;
   const placed=[];
   for(const item of cityNodes){
    const {node,city,img,source}=item;if(node.hidden)continue;
    const ax=x+location(city).x*scale,ay=y+location(city).y*scale;
    const dx=cityCardWidth+10,dy=cityCardHeight+12;
    const offsets=[[0,0],[0,-dy],[0,dy],[dx,0],[-dx,0],
     [dx,-dy],[-dx,-dy],[dx,dy],[-dx,dy],
     [0,-2*dy],[0,2*dy],[2*dx,0],[-2*dx,0]];
    let best=null;
    for(const [ox,oy] of offsets){
     const cx=clamp(ax+ox,cityCardWidth/2+8,v.w-cityCardWidth/2-8);
     const cy=clamp(ay+oy,cityCardHeight+44,v.h-11);
     const overlap=placed.reduce((sum,q)=>{
      const ow=Math.max(0,(cityCardWidth+q.w)/2+7-Math.abs(cx-q.x));
      const oh=Math.max(0,(cityCardHeight+q.h)/2+6-Math.abs(cy-q.y));
      return sum+ow*oh;
     },0);
     const score=overlap*7+Math.hypot(cx-ax,cy-ay)*.45;
     if(!best||score<best.score)best={x:cx,y:cy,score};
     if(overlap===0&&Math.hypot(cx-ax,cy-ay)<8)break;
    }
    if(!best)continue;
    node.style.left=best.x+'px';node.style.top=best.y+'px';
    placed.push({x:best.x,y:best.y,w:cityCardWidth,h:cityCardHeight});
    if(Math.hypot(best.x-ax,best.y-ay)>7){
     const from=location(city),tx=(best.x-x)/scale,ty=(best.y-y)/scale;
     cardLeaders.append(vector('path',{d:rounded([
      from,{x:from.x,y:ty},{x:tx,y:ty}],7),
      'data-stop':network.HUB(city.id)},'pw-dot-city-card-leader'));
    }
    loadCardPhoto(img,source);
   }
  }
  // Metro-only: no location photo cards, city road pins, or POI labels.
  for(const {node} of worldNodes)node.hidden=true;
  hint.hidden=false;
  // Reposition a selected station popup along with the map camera.
  // Do not destroy the route highlight every time the player pans/zooms.
  if(!popup.hidden&&selected?.isConnected)positionPopup(null,selected);
 }
 function focus(p,zoom){centerOn(p,zoom)}
 function zoomBy(factor,atX,atY){
  const v=viewport(),old=scale;
  const px=atX??v.w*.5,py=atY??v.h*.5;
  const next=clamp(old*factor,minScale,9);
  x=px-(px-x)*next/old;y=py-(py-y)*next/old;scale=next;
  constrain();position();
 }
 function measure(first){
  const v=viewport(),previousMinimum=minScale;
  const overview=!activeCity&&!first&&Math.abs(scale-previousMinimum)<.012;
  const oldCenter={x:(lastW*.5-x)/scale,y:(lastH*.5-y)/scale};
  minScale=Math.min((v.w-28)/W,(v.h-22)/H);
  lastW=v.w;lastH=v.h;
  if(first){
   activeCity=null;
   // Always enter the regional map; city networks are accessed by city click.
   centerOn({x:W*.5,y:H*.5},minScale);
  }else if(overview)centerOn({x:W*.5,y:H*.5},minScale);
  else centerOn(oldCenter,Math.max(minScale,scale));
 }
 toolBtns[0].addEventListener('click',()=>zoomBy(1/1.37));
 toolBtns[1].addEventListener('click',()=>zoomBy(1.37));
 back.addEventListener('click',leaveCity);
 toolBtns[2].addEventListener('click',fitSelectedCity);
 toolBtns[3].addEventListener('click',()=>{
  if(activeCity!==currentCity)enterCity(currentCity);
  if(activeCity==='kirihama'){
   // An off-network destination is not a subway station. Show the real
   // line network instead of centring an empty portion of the metro map.
   if(metro.STATIONS[here])centerOn(localPoint(metro.STATIONS[here]),Math.max(3.45,scale));
   else fitSelectedCity();
  }else centerOn(atlas.CITY_BY_ID[currentCity]||hereCity,Math.max(3.45,scale));
 });
 const wheel=e=>{e.preventDefault();
  const r=map.getBoundingClientRect();
  zoomBy(Math.exp(-clamp(e.deltaY,-500,500)*.0014),e.clientX-r.left,e.clientY-r.top);
 };
 map.addEventListener('wheel',wheel,{passive:false});
 map.tabIndex=0;
 map.addEventListener('keydown',e=>{
  if(e.target.closest('button')||e.target.closest('input'))return;
  if(e.key==='Escape'){if(!popup.hidden)clear();else leaveCity();return}
  if(e.key==='+'||e.key==='='){e.preventDefault();zoomBy(1.25)}
  else if(e.key==='-'){e.preventDefault();zoomBy(.8)}
  else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
   e.preventDefault();
   const dx=e.key==='ArrowLeft'?80:e.key==='ArrowRight'?-80:0;
   const dy=e.key==='ArrowUp'?80:e.key==='ArrowDown'?-80:0;
   x+=dx;y+=dy;constrain();position();
  }
 });
 map.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('button,.pw-dot-chrome,.pw-transit-popup,.pw-transit-line-hit'))return;
  if(e.pointerType==='touch'){
   fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(fingers.size===2){
    const [a,b]=[...fingers.values()];
    pinch={distance:Math.max(1,Math.hypot(b.x-a.x,b.y-a.y))};
    drag=null;
   }
  }
  if(!pinch)drag={id:e.pointerId,cx:e.clientX,cy:e.clientY,x,y,moved:false};
  map.setPointerCapture?.(e.pointerId);
 });
 map.addEventListener('pointermove',e=>{
  if(fingers.has(e.pointerId))fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch&&fingers.size>=2){
   const [a,b]=[...fingers.values()];
   const next=Math.max(1,Math.hypot(b.x-a.x,b.y-a.y));
   const box=map.getBoundingClientRect();
   zoomBy(clamp(next/pinch.distance,.75,1.35),
    (a.x+b.x)*.5-box.left,(a.y+b.y)*.5-box.top);
   pinch.distance=next;return;
  }
  if(!drag||drag.id!==e.pointerId)return;
  const dx=e.clientX-drag.cx,dy=e.clientY-drag.cy;
  if(Math.abs(dx)+Math.abs(dy)>5)drag.moved=true;
  x=drag.x+dx;y=drag.y+dy;constrain();
  position();
 });
 map.addEventListener('pointerup',e=>{
  fingers.delete(e.pointerId);
  if(pinch){if(fingers.size<2)pinch=null;drag=null;return}
  if(!drag||drag.id!==e.pointerId)return;
  const hadMove=drag.moved;drag=null;
  if(hadMove)position();
 });
 map.addEventListener('pointercancel',e=>{
  fingers.delete(e.pointerId);pinch=null;drag=null;
 });
 map.addEventListener('click',e=>{if(e.target===map||e.target===canvas||e.target===svg)clear()});
 let observer=null;
 if(typeof ResizeObserver==='function'){
  observer=new ResizeObserver(()=>measure(false));observer.observe(map);
 }else{
  const onResize=()=>measure(false);
  global.addEventListener('resize',onResize);cleanupListeners.push(()=>global.removeEventListener('resize',onResize));
 }
 measure(true);
 global.PaperWorldTransitMap._cleanup=()=>{
  observer?.disconnect();cleanupListeners.forEach(fn=>fn());
 };
}
global.PaperWorldTransitMap={PHOTO,draw,_cleanup:null};
})(window);
