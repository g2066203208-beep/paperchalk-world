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
 const popup=element('div','pw-transit-popup pw-dot-popup');
 popup.hidden=true;popup.setAttribute('role','group');
 map.append(chrome,hint,popup);
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
    const route=atlas.route(currentCity,to,['highway','coach','bus'].includes(l.mode)?'road':'rail');
    showMenu(e,node,l.name,route?
     '城际交通 · '+(atlas.SERVICE_LABELS[l.mode]||l.mode)+' · 约 '+route.minutes+' 分钟':
     '当前位置需要先换乘',[
      {label:'查看 '+b.name,primary:true,run:()=>{clear();focus(b,Math.max(minScale*2,1.7))}}
     ]);
   });
  }
 }
 // Expanded municipal services exist as planned topology. Only actually
 // implemented local routes offer boarding; planned lines never fake rides.
 // City transport uses actual, individually named destination nodes,
 // never numbered synthetic metro stops. Smaller towns have buses.
 for(const l of atlas.LOCAL_TRANSIT_LINES){
  const points=[location(atlas.POI_BY_ID[l.stops[0]])];
  for(let i=1;i<l.stops.length;i++){
   const a=atlas.POI_BY_ID[l.stops[i-1]],b=atlas.POI_BY_ID[l.stops[i]];
   for(const p of orthogonal(a,b).slice(1))
    if(p.x!==points.at(-1).x||p.y!==points.at(-1).y)points.push(p);
  }
  const g=lineGroup(municipal,l,l.stops[0],l.stops.at(-1),points,'metro',(e,node)=>{
   const city=atlas.CITY_BY_ID[l.city];
   showMenu(e,node,l.name,city.name+' · '+(l.mode==='metro'?'地铁':l.mode==='tram'?'有轨电车':'地方巴士')+
    ' · '+l.stops.length+' 个真实地点',l.stops.map(id=>{
    const stop=atlas.POI_BY_ID[id];
    return {label:stop.name,run:()=>{clear();focus(stop,Math.max(3.15,scale))}};
   }));
  });
  g.dataset.city=l.city;g.dataset.mode=l.mode;
  for(const id of l.stops){
   const p=location(atlas.POI_BY_ID[id]);
   const station=vector('circle',{cx:p.x,cy:p.y,r:4,
    'data-stop':id,'data-city':l.city},'pw-dot-municipal-stop');
   g.append(station);
  }
 }
 // Each named destination has an actual station mark on a symmetric
 // access-road / trail network. No invented ghost metro trains.
 const stopButtons=new Map();
 const physicalMarkers=new Set();
 for(const l of network.ACCESS_ROUTES){
  const ps=[],points=l.stops.map(id=>network.at(id)).filter(Boolean);
  for(let i=0;i<points.length;i++){
   if(!i){ps.push(location(points[i]));continue}
   for(const p of orthogonal(points[i-1],points[i]).slice(1)){
    const last=ps.at(-1);
    if(!last||p.x!==last.x||p.y!==last.y)ps.push(p);
   }
  }
  const g=lineGroup(access,l,l.stops[0],l.stops.at(-1),ps,'access',null);
  g.dataset.city=points[0]?.city||'';
  for(const id of l.stops){
   if(physicalMarkers.has(id))continue;physicalMarkers.add(id);
   const pt=network.at(id);if(!pt)continue;
   const marker=vector('circle',{cx:pt.x,cy:pt.y,r:5,
    'data-stop':id,'data-direction':'both','data-city':pt.city},
    'pw-dot-destination-stop'+(pt.kind==='hub'?' is-interchange':''));
   marker.setAttribute('role','button');marker.setAttribute('tabindex','0');
   marker.setAttribute('aria-label','查看站点 '+pt.name);
   marker.addEventListener('click',event=>{
    event.stopPropagation();
    if(activeCity!==pt.city)return;
    if(id===network.HUB(activeCity)){
     const trip=network.journey(here,id),backTrip=network.journey(id,here);
     const dest=locations[id],can=here!==id&&!!trip&&!!backTrip&&
      !!dest&&snapshot.nightStatus!=='recalled'&&
      snapshot.minute+trip.minutes<dest.close;
     showMenu(event,marker,pt.name,'市内与城际换乘站 · '+
      (trip?'去程 '+trip.minutes+' 分钟 · 返程 '+backTrip.minutes+' 分钟':'暂不可达'),[
      {label:'前往换乘站',primary:true,disabled:!can,run:async()=>{
       if(busy)return;busy=true;clear();
       try{const res=await onWorldTravel?.(id,trip);
        if(!res?.ok)notify(res?.reason||'无法前往')}
       catch(err){notify('换乘站加载失败')}finally{busy=false}
      }},
      {label:'查看城际路线',run:leaveCity}
     ]);
     previewRegionalRoute(trip?.legs);return;
    }
    const card=stopButtons.get(id);
    if(card&&!card.hidden)card.click();
    else focus(pt,Math.max(3.5,scale*1.35));
   });
   marker.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){
     event.preventDefault();marker.dispatchEvent(new MouseEvent('click',{bubbles:true}))
    }
   });
   stops.append(marker);
  }
 }
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
 function localPlace(id,s){
  const p=localPoint(s),visible=!!PHOTO[id];
  const name=PLACE_NAMES[id]||s.label;
  const node=element('button','pw-transit-place pw-dot-place'+(visible?'':' is-station'));
  node.type='button';node.dataset.place=id;node.dataset.local='true';
  node.dataset.current=String(here===id);node.dataset.photograph=String(visible);
  node.dataset.station=id;stopButtons.set(id,node);
  node.dataset.gridColumn=s.gx;node.dataset.gridRow=s.gy;
  if(visible){const q=PHOTO[id];photo(node,[q[0],q[1]])}
  else node.append(element('span','pw-transit-station-dot',s.transfer?'◎':'•'));
  node.append(element('span','pw-transit-place-name',name));
  // Image leader ends exactly at this metro station, never one grid row above.
  put(node,p,metroLayer);
  node.addEventListener('click',e=>{
   if(drag?.moved)return;
   e.stopPropagation();
   const loc=locations[id],status=id===here?{ok:false,reason:'当前位置'}:
    loc?availability?.(id,snapshot):{ok:false,reason:'尚未开放'};
   const metroRoute=metro.STATIONS[here]?metro.path(here,id):null;
   const trip=network.journey(here,id),back=network.journey(id,here);
   const viable=!!trip&&!!back&&!!status?.ok;
   showMenu(e,node,name,(viable?'去程 '+trip.minutes+' 分钟 · 返程 '+back.minutes+' 分钟':
    status?.reason||'暂不可达'),[
    {label:'前往',primary:true,disabled:!viable,run:async()=>{
     if(busy)return;busy=true;clear();
     try{
      const result=metroRoute?.segments?.length?
       await onTravel?.(id,metroRoute):await onWorldTravel?.(id,trip);
      if(!result?.ok)notify(result?.reason||'无法到达');
     }catch(error){notify('地图路线不可用')}finally{busy=false}
    }},
    {label:'查看线路',run:()=>{clear();previewRegionalRoute(trip?.legs)}}
   ]);
   previewRegionalRoute(trip?.legs);
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
 const worldNodes=[];
 for(const p of atlas.POIS){
  if(metro.STATIONS[p.id]||!locations[p.id])continue;
  const node=element('button','pw-dot-poi pw-transit-place');
  node.type='button';node.dataset.place=p.id;node.dataset.city=p.city;
  node.dataset.station=p.id;stopButtons.set(p.id,node);
  node.dataset.current=String(p.id===here);
  node.dataset.kind=p.kind||'';
  node.dataset.transitStop=String(transitPOIs.has(p.id));
  const src=atlas.PHOTOS[p.photo]?.url;
  // Load only visible photos. All pictures are connected to real route pins.
  const pic=element('span','pw-transit-photo');
  const img=element('img');img.alt='';img.loading='lazy';
  img.referrerPolicy='no-referrer';img.decoding='async';
  pic.append(img);node.append(pic,element('span','pw-transit-place-name',p.name));
  put(node,location(p),placeLayer);
  worldNodes.push({node,poi:p,img,source:src});
  node.addEventListener('click',e=>{
   if(drag?.moved)return;
   const route=network.journey(here,p.id);
   const hereNow=here===p.id;
   const dest=locations[p.id];
   const cost=route?.minutes||dest.travel;
   const canTravel=!hereNow&&!!route&&snapshot.nightStatus!=='recalled'&&
    snapshot.minute+cost<dest.close;
   showMenu(e,node,p.name,(atlas.CITY_BY_ID[p.city]?.name||'城市')+
    ' · '+(route?.legs.length?route.legs.map(l=>l.line.name).filter((v,i,a)=>a.indexOf(v)===i).join(' → '):
      '同城区域')+(canTravel?' · 约 '+cost+' 分钟':' · 当前不可前往'),[
    {label:'前往',primary:true,disabled:!canTravel,run:async()=>{
     if(busy)return;busy=true;clear();
     try{const res=await onWorldTravel?.(p.id,route);
      if(!res?.ok)notify(res?.reason||'尚无法前往')}
     catch(_){notify('场景加载失败')}finally{busy=false}
    }},
    {label:'查看地点',run:()=>{clear();focus(p,Math.max(scale,2.5))}}
   ],src);
   previewRegionalRoute(route?.legs);
  });
 }
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
  centerOn(city,Math.max(3.15,Math.min(4.8,(v.w-160)/285,(v.h-165)/175)));
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
  const pts=[city,...atlas.POIS.filter(p=>p.city===activeCity)
   .map(p=>network.at(p.id)||p)];
  if(activeCity==='kirihama')for(const [id,stop] of Object.entries(metro.STATIONS))
   if(!stop.locked)pts.push(localPoint(stop));
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
  // Map LEVEL is independent of zoom. No switch from regional to city
  // just because the player zoomed in near another city.
  const scoped=activeCity!==null,selectedCity=atlas.CITY_BY_ID[activeCity];
  map.dataset.scope=scoped?'city':'region';
  map.dataset.city=activeCity||'';
  map.dataset.zoom=scoped?(scale>=4.75?'detail':'city'):'region';
  map.dataset.compact=String(!scoped&&scale<.65);
  map.dataset.smallScreen=String(v.w<900);
  back.hidden=!scoped;
  heading.querySelector('.pw-dot-title').textContent=scoped?
   selectedCity.name+' · 市内交通':'城际交通总图';
  heading.querySelector('.pw-dot-subtitle').textContent=scoped?
   selectedCity.sub+' · 仅显示本市线路与地点':
   '点击城市进入独立交通图 · 城际铁路 / 巴士 / 渡轮';
  hint.textContent=scoped?'仅显示'+selectedCity.name+'的交通线 · ← 返回城际图 · 拖动／缩放':
   '仅显示跨市线路 · 点击任一城市进入其独立市内交通图';
  caption.textContent=scoped?selectedCity.name+' · 市内线网':'十城城际交通';
  sub.textContent=scoped?'点击本站点规划去回路线 · 返回城际图可选其他城市':
   '城市间交通只在这一层显示 · 点击城市查看内部线路';
  canvas.style.setProperty('--dot-city-label-size',v.w<900?'15px':'19px');
  canvas.style.setProperty('--dot-area-label-size','16px');
  canvas.style.setProperty('--dot-poi-label-size',v.w<900?'14px':'16px');
  // Geographical area names are not part of the current route-first brief.
  for(const n of areaNodes)n.hidden=true;
  regional.style.display=scoped?'none':'';
  regional.style.opacity='.95';
  urban.style.display=activeCity==='kirihama'?'':'none';
  metroNetwork.style.display='none';
  municipal.style.display=scoped?'':'none';
  access.style.display=scoped?'':'none';
  stops.style.display=scoped?'':'none';
  for(const segment of municipal.children){
   segment.style.display=scoped&&segment.dataset.city===activeCity?'':'none';
  }
  for(const segment of access.children){
   segment.style.display=scoped&&segment.dataset.city===activeCity?'':'none';
  }
  for(const group of stops.children){
   group.style.display=scoped&&group.dataset.city===activeCity?'':'none';
  }
  metroLayer.hidden=activeCity!=='kirihama';
  const physicalHere=scoped?(network.at(here)||hereCity):hereCity;
  you.hidden=scoped&&currentCity!==activeCity;
  you.style.left=(x+location(physicalHere).x*scale)+'px';
  you.style.top=(y+location(physicalHere).y*scale)+'px';
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
  // Each city's POI list is isolated by its authored city ID, not by
  // proximity or a zoom threshold. POIs in other cities cannot leak.
  const occupied=[];
  if(activeCity==='kirihama'){
   for(const [id,station] of Object.entries(metro.STATIONS)){
    if(station.locked)continue;
    const p=localPoint(station);
    occupied.push({x:x+p.x*scale,y:y+p.y*scale-100});
   }
  }
  for(const {node,poi,img,source} of worldNodes){
   const p=network.at(poi.id)||location(poi);
   const px=x+p.x*scale,py=y+p.y*scale;
   let visible=scoped&&poi.city===activeCity&&scale>=1.6&&
    px>-95&&px<v.w+95&&py>-40&&py<v.h+180;
   if(visible){
    visible=!occupied.some(q=>Math.abs(q.x-px)<183&&
     Math.abs(q.y-(py-85))<145);
    if(visible)occupied.push({x:px,y:py-85});
   }
   node.hidden=!visible;
   if(visible)loadCardPhoto(img,source);
  }
  // Local station thumbnails stay visible only in Kirihama city mode.
  // Other city's bus/metro labels belong to that city's authored lines.
  hint.hidden=false;
  clear();
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
  centerOn(network.at(here)||herePoi||hereCity,Math.max(3.45,scale));
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
