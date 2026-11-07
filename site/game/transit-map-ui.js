/* Paperchalk World — ONE continuous dot-matrix map.
 * From the local 12x6 subway grid to ten cities and 120+ visitable points,
 * every rail, photo pin and station aligns to one square lattice. There is
 * no separate regional atlas, no geographic wallpaper, and no map-mode switch.
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
 const metro=global.PaperWorldMetro,atlas=global.PaperWorldAtlas,geometry=global.PaperWorldMetroGeometry;
 if(!metro||!atlas||!geometry){body.textContent='交通地图尚未加载';return}
 global.PaperWorldTransitMap?._cleanup?.();
 const here=HOME.has(snapshot?.location)?'entrance':snapshot?.location||'entrance';
 const herePoi=atlas.POI_BY_ID[here];
 const currentCity=herePoi?.city||'kirihama';
 const hereCity=atlas.CITY_BY_ID[currentCity]||atlas.CITIES[0];
 const map=element('section','pw-transit-map pw-dot-world-map');
 map.setAttribute('aria-label','唯一的可缩放点阵城市及全国交通地图');
 map.dataset.grid='50x32';
 const canvas=element('div','pw-dot-world-canvas');
 const svg=vector('svg',{viewBox:'0 0 '+W+' '+H,preserveAspectRatio:'none'},'pw-transit-lines pw-dot-rail-canvas');
 const dots=vector('g',{},'pw-transit-dot-matrix');
 let previousDotScale=-1;
 const regional=vector('g',{},'pw-dot-regional-lines');
 const urban=vector('g',{},'pw-dot-urban-lines');
 const metroNetwork=vector('g',{},'pw-dot-planned-metro');
 const municipal=vector('g',{},'pw-dot-municipal-lines');
 const stops=vector('g',{},'pw-dot-stations');
 svg.append(dots,regional,metroNetwork,municipal,urban,stops);
 const areaLayer=element('div','pw-dot-areas');
 const cityLayer=element('div','pw-dot-cities');
 const placeLayer=element('div','pw-dot-places');
 const metroLayer=element('div','pw-dot-local-places');
 canvas.append(svg,areaLayer,cityLayer,placeLayer,metroLayer);
 map.append(canvas);
 const chrome=element('header','pw-dot-chrome');
 const heading=element('div','pw-dot-heading');
 heading.append(element('strong','pw-dot-title','交通图'),
  element('small','pw-dot-subtitle','点阵 · 城市与城际交通'));
 const tools=element('div','pw-dot-tools');
 const buttons=[['−','缩小地图'],['+','放大地图'],['全域','查看整个区域'],['定位','返回当前位置']];
 const toolBtns=buttons.map(([name,title])=>{
  const b=element('button','pw-dot-tool',name);
  b.type='button';b.setAttribute('aria-label',title);tools.append(b);return b;
 });
 chrome.append(heading,tools);
 const hint=element('div','pw-dot-hint','滚轮缩放 · 拖动地图 · 点击站点与地点');
 const popup=element('div','pw-transit-popup pw-dot-popup');
 popup.hidden=true;popup.setAttribute('role','group');
 map.append(chrome,hint,popup);
 body.replaceChildren(map);
 let scale=1,minScale=.5,x=0,y=0,drag=null,busy=false,selected=null,focused=false;
 let lastW=844,lastH=390;
 const cleanupListeners=[];
 function notify(msg){onFeedback?.(msg)}
 function clear(){
  popup.hidden=true;selected?.removeAttribute('data-selected');
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
 function showMenu(e,node,title,detail,commands){
  clear();e.stopPropagation();
  popup.replaceChildren(element('strong','pw-transit-popup-name',title),
   element('small','pw-transit-popup-sub',detail));
  const group=element('div','pw-transit-popup-buttons');
  for(const a of commands){
   const b=element('button','pw-transit-menu-item'+(a.primary?' is-primary':''),a.label);
   b.type='button';b.disabled=!!a.disabled;
   b.addEventListener('click',ev=>{ev.stopPropagation();a.run()});group.append(b);
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
 const REGION_TONES={mountain:'#738e7c',forest:'#648476',plain:'#8e9580',
  lake:'#6492a3',sea:'#59879e',coast:'#6e94a0',island:'#709f9b',
  rural:'#9fa88a',industrial:'#758e9a',river:'#6c979d',
  town:'#80969a',ruins:'#8b8c83',onsen:'#8ca4a0'};
 for(let cy=0;cy<=H;cy+=CELL)for(let cx=0;cx<=W;cx+=CELL){
  let accent=null;
  // Semantic biomes are DOTS ONLY: never a painted terrain polygon,
  // imported world-map texture or fake mini city silhouette.
  for(const a of atlas.AREAS){
   const dx=(cx-a.x)/245,dy=(cy-a.y)/185;
   const distortion=.82+.16*Math.sin(cx*.017+cy*.011)+.1*Math.cos(cx*.025-cy*.009);
   if(dx*dx+dy*dy<distortion){accent=REGION_TONES[a.type]||'#758e90';break}
  }
  const dot=vector('circle',{cx,cy,r:1.35},
   'pw-transit-grid-dot'+(accent?' pw-dot-biome-dot':''));
  if(accent){dot.style.fill=accent;dot.style.opacity='.62'}
  dots.append(dot);
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
  const g=vector('g',{'data-stop':id,'data-current':id===here},
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
  node.dataset.gridColumn=s.gx;node.dataset.gridRow=s.gy-(visible?1:0);
  if(visible){const q=PHOTO[id];photo(node,[q[0],q[1]])}
  else node.append(element('span','pw-transit-station-dot',s.transfer?'◎':'•'));
  node.append(element('span','pw-transit-place-name',name));
  const at={x:p.x,y:p.y-(visible?CELL:0)};
  put(node,at,metroLayer);
  node.addEventListener('click',e=>{
   if(drag?.moved)return;
   e.stopPropagation();
   const loc=locations[id];
   const status=id===here?{ok:false,reason:'当前位置'}:
    loc?availability?.(id,snapshot):{ok:false,reason:'请先到达此站'};
   const route=metro.path(here,id);
   showMenu(e,node,name,status?.ok?'预计 '+status.cost+' 分钟':status?.reason||'暂不可达',[
    {label:'前往',primary:true,disabled:!status?.ok||!route,run:async()=>{
     if(busy)return;busy=true;clear();
     try{const res=await onTravel?.(id,route);if(!res?.ok)notify(res?.reason||'无法到达')}
     catch(_){notify('场景加载失败')}finally{busy=false}
    }},
    {label:'详情',run:()=>showMenu(e,node,name,
     '市内交通 · '+(route?.lines.join(' / ')||'步行')+
     (route?.transfers.length?' · 需要换乘':''),[])}
   ]);
  });
 }
 for(const [id,s] of Object.entries(metro.STATIONS))if(!s.locked)localPlace(id,s);
 const areaNodes=[];
 for(const a of atlas.AREAS){
  const label=element('span','pw-dot-area-label',a.name);
  label.dataset.area=a.id;put(label,location(a),areaLayer);
  areaNodes.push(label);
 }
 const transitPOIs=new Set(atlas.LOCAL_TRANSIT_STOPS.map(stop=>stop.id));
 const cityNodes=[];
 for(const c of atlas.CITIES){
  const node=element('button','pw-dot-city');
  node.type='button';node.dataset.city=c.id;
  const thumb=atlas.PHOTOS[c.id==='kirihama'?'metropolis':
   c.id==='misaki'||c.id==='urasima'?'coast':
   c.id==='naruba'||c.id==='okuzawa'?'mountain':
   c.id==='homori'||c.id==='mizuho'?'rice':'street'];
  photo(node,[thumb?.url,PLACEHOLDER]);
  node.append(element('span','pw-transit-place-name',c.name));
  put(node,location(c),cityLayer);
  cityNodes.push({node,city:c});
  node.addEventListener('click',e=>{
   if(drag?.moved)return;
   showMenu(e,node,c.name,c.sub+' · '+c.region,[
    {label:'查看城区',primary:true,run:()=>{clear();focus(c,Math.max(2.85,minScale*3.6))}}
   ]);
  });
 }
 const worldNodes=[];
 for(const p of atlas.POIS){
  if(metro.STATIONS[p.id]||!locations[p.id])continue;
  const node=element('button','pw-dot-poi pw-transit-place');
  node.type='button';node.dataset.place=p.id;node.dataset.city=p.city;
  node.dataset.current=String(p.id===here);
  node.dataset.kind=p.kind||'';
  node.dataset.transitStop=String(transitPOIs.has(p.id));
  const src=atlas.PHOTOS[p.photo]?.url;
  photo(node,[src,PLACEHOLDER]);
  node.append(element('span','pw-transit-place-name',p.name));
  put(node,location(p),placeLayer);
  worldNodes.push({node,poi:p});
  node.addEventListener('click',e=>{
   if(drag?.moved)return;
   const route=atlas.route(currentCity,p.city);
   const hereNow=here===p.id;
   const dest=locations[p.id];
   const cost=p.city!==currentCity?Math.max(18,Math.round((route?.minutes||0)+18)):dest.travel;
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
   ]);
  });
 }
 // Always keep the actual current place legible under photo-pin decluttering.
 worldNodes.sort((a,b)=>Number(b.poi.id===here)-Number(a.poi.id===here)||
  Number(transitPOIs.has(b.poi.id))-Number(transitPOIs.has(a.poi.id)));
 const caption=element('span','pw-transit-caption','');
 const sub=element('span','pw-transit-tip','');
 map.append(caption,sub);
 function viewport(){const r=map.getBoundingClientRect();return {w:r.width||844,h:r.height||390}}
 function centerOn(p,s){
  const v=viewport();scale=clamp(s,minScale,4.5);
  x=v.w*.5-location(p).x*scale;y=v.h*.5-location(p).y*scale;
  constrain();position();
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
    const r=stop.classList.contains('pw-transit-stop-halo')?18:
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
  canvas.style.setProperty('--dot-city-label-size',v.w<900?'15px':'19px');
  canvas.style.setProperty('--dot-area-label-size','16px');
  canvas.style.setProperty('--dot-poi-label-size',v.w<900?'14px':'16px');
  map.dataset.compact=String(scale<.55);
  map.dataset.smallScreen=String(v.w<900);
  const zoom=scale<1.15?'region':scale<2.3?'city':'detail';
  map.dataset.zoom=zoom;
  // Regions and city districts are zoom layers of the SAME physical lattice.
  caption.textContent=zoom==='region'?'都市圈交通':zoom==='city'?'城市交通':'街区交通';
  sub.textContent=zoom==='region'?'点击城市放大 · 城际铁路 / 巴士 / 渡轮':
   zoom==='city'?'点击地点乘车 · 缩放查看全域':'点击地点调查 · 拖动继续探索';
  for(const n of areaNodes)n.hidden=scale>=1.22;
  for(const {node,city} of cityNodes){
   const onScreen=(x+city.x*scale)>-100&&(x+city.x*scale)<v.w+100&&
    (y+city.y*scale)>-100&&(y+city.y*scale)<v.h+100;
   node.hidden=!onScreen||scale>=1.55;
  }
  // Atlas city cards have fixed *readable* screen sizes. Resolve the few
  // close-city overlaps in screen space rather than making ALL cities tiny.
  // Keep each card as close as possible to its snapped geographic anchor.
  const cityCardWidth=scale<.55?96:166;
  const cityCardHeight=scale<.55?82:125;
  const placedCities=[];
  for(const {node,city} of cityNodes){
   if(node.hidden)continue;
   const anchorX=x+location(city).x*scale;
   const anchorY=y+location(city).y*scale;
   const offsets=[[0,0],[0,-74],[0,74],[105,0],[-105,0],
    [105,-65],[-105,-65],[105,65],[-105,65],
    [0,-144],[0,144],[145,0],[-145,0]];
   let best=null;
   for(const [dx,dy] of offsets){
    const cx=clamp(anchorX+dx,cityCardWidth/2+8,v.w-cityCardWidth/2-8);
    const cy=clamp(anchorY+dy,cityCardHeight/2+48,v.h-cityCardHeight/2-8);
    const overlap=placedCities.reduce((sum,q)=>{
     const ow=Math.max(0,(cityCardWidth+q.w)/2+8-Math.abs(cx-q.x));
     const oh=Math.max(0,(cityCardHeight+q.h)/2+6-Math.abs(cy-q.y));
     return sum+ow*oh;
    },0);
    const score=overlap*6+Math.hypot(cx-anchorX,cy-anchorY)*.7;
    if(!best||score<best.score)best={x:cx,y:cy,score};
    if(overlap===0&&Math.hypot(cx-anchorX,cy-anchorY)<8)break;
   }
   if(best){
    node.style.left=best.x+'px';node.style.top=best.y+'px';
    placedCities.push({x:best.x,y:best.y,w:cityCardWidth,h:cityCardHeight});
   }
  }
  // The real eight-station metro is the main navigation layer. Surrounding
  // atlas photo POIs must not blanket its station names at initial city zoom.
  // Only reveal those optional investigations at street-level detail.
  const occupied=[];
  if(scale>=1.22&&currentCity==='kirihama'){
   for(const [id,st] of Object.entries(metro.STATIONS)){
    const loc=localPoint(st);
    occupied.push({x:x+loc.x*scale,
     y:y+(loc.y-(PHOTO[id]?CELL:0))*scale});
   }
  }
  for(const {node,poi} of worldNodes){
   const p=location(poi),px=x+p.x*scale,py=y+p.y*scale;
   const threshold=poi.id===here?1.8:
    (poi.city==='kirihama'&&currentCity==='kirihama')?3.85:
    transitPOIs.has(poi.id)?1.9:2.45;
   let visible=scale>=threshold&&px>-75&&px<v.w+75&&py>-65&&py<v.h+65;
   // Real screen-space occupancy, not piles of overlapping photo cards.
   if(visible){
    visible=!occupied.some(q=>Math.abs(q.x-px)<112&&
      Math.abs(q.y-py)<93);
    if(visible)occupied.push({x:px,y:py});
   }
   node.hidden=!visible;
  }
  metroLayer.hidden=scale<1.22||scale>4.5;
  urban.style.display=scale<1.22?'none':'';
  stops.style.display=scale<1.22?'none':'';
  metroNetwork.style.display='none'; // Retired fabricated ghost stops.
  municipal.style.display=scale<1.65?'none':'';
  regional.style.display=scale>=1.45?'none':'';
  regional.style.opacity='.86';
  hint.hidden=scale>2.3;
  clear();
 }
 function focus(p,zoom){centerOn(p,zoom)}
 function zoomBy(factor,atX,atY){
  const v=viewport(),old=scale;
  const px=atX??v.w*.5,py=atY??v.h*.5;
  const next=clamp(old*factor,minScale,4.5);
  x=px-(px-x)*next/old;y=py-(py-y)*next/old;scale=next;
  constrain();position();
 }
 function measure(first){
  const v=viewport(),previousMinimum=minScale;
  const overview=!first&&Math.abs(scale-previousMinimum)<.012;
  const oldCenter={x:(lastW*.5-x)/scale,y:(lastH*.5-y)/scale};
  minScale=Math.min((v.w-28)/W,(v.h-22)/H);
  lastW=v.w;lastH=v.h;
  if(first){
   // Fit the ACTUAL 8-column x 3-row metro diagram, not a fictional
   // 570x310 bounding rectangle that left the route tiny. Photo cards and
   // station names require a modest clearance outside the real track bounds.
   const metroZoom=Math.min(3.5,(v.w-80)/400,(v.h-92)/185);
   const local=Math.max(1.5,metroZoom);
   const targetZoom=currentCity==='kirihama'?local:Math.max(2.85,local);
   centerOn(currentCity==='kirihama'?
    {x:LOCAL_X+6*CELL,y:LOCAL_Y+2*CELL}:(herePoi||hereCity),
    Math.max(minScale,targetZoom));
  }else if(overview){
   centerOn({x:W*.5,y:H*.5},minScale);
  }else{
   centerOn(oldCenter,Math.max(minScale,scale));
  }
 }
 toolBtns[0].addEventListener('click',()=>zoomBy(1/1.37));
 toolBtns[1].addEventListener('click',()=>zoomBy(1.37));
 toolBtns[2].addEventListener('click',()=>centerOn({x:W/2,y:H/2},minScale));
 toolBtns[3].addEventListener('click',()=>centerOn(herePoi||hereCity,Math.max(1.8,minScale*2.6)));
 const wheel=e=>{e.preventDefault();
  const r=map.getBoundingClientRect();
  zoomBy(Math.exp(-clamp(e.deltaY,-500,500)*.0014),e.clientX-r.left,e.clientY-r.top);
 };
 map.addEventListener('wheel',wheel,{passive:false});
 map.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('button,.pw-dot-chrome,.pw-transit-popup,.pw-transit-line-hit'))return;
  drag={id:e.pointerId,cx:e.clientX,cy:e.clientY,x,y,moved:false};
  map.setPointerCapture?.(e.pointerId);
 });
 map.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const dx=e.clientX-drag.cx,dy=e.clientY-drag.cy;
  if(Math.abs(dx)+Math.abs(dy)>5)drag.moved=true;
  x=drag.x+dx;y=drag.y+dy;constrain();
  position();
 });
 map.addEventListener('pointerup',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const hadMove=drag.moved;
  drag=null;
  if(hadMove)position();
 });
 map.addEventListener('pointercancel',()=>{drag=null});
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
