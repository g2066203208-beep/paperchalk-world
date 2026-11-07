/* Immersive zoomable regional atlas. This is ONE geographical map with layers
 * revealed by zoom, not a list of destinations. Photo pins and contextual
 * travel menus are anchored to precise map locations. */
(function(global){
'use strict';
const NS='http://www.w3.org/2000/svg';
const tag=(name,cls,value)=>{
 const e=document.createElement(name);if(cls)e.className=cls;
 if(value!==undefined)e.textContent=String(value);
 return e;
};
const svg=(type,props={},cls='')=>{
 const e=document.createElementNS(NS,type);
 if(cls)e.setAttribute('class',cls);
 for(const [k,v] of Object.entries(props))e.setAttribute(k,String(v));
 return e;
};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const PHOTO_FALLBACK={
 entrance:'./assets/scenes/entrance.webp',
 school:'./assets/classroom.webp',
 convenience:'./assets/locations/convenience.svg',
 cafe:'./assets/locations/cafe.svg',
 mall:'./assets/locations/mall.svg',
 park:'./assets/locations/park.svg'
};
// Remote photo sources occasionally reject third-party hotlinking. A real
// licensed Unsplash photo is the secondary source; the final step uses a
// local placeholder rather than EVER showing an empty photograph.
const THEME_BACKUP={
 mountain:'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=480&q=65',
 lake:'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=480&q=65',
 coast:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=480&q=65',
 island:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=480&q=65',
 harbor:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=480&q=65',
 village:'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=480&q=65',
 oldvillage:'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=480&q=65',
 forest:'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=480&q=65',
 tunnel:'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=480&q=65',
 darktunnel:'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=480&q=65',
 schoolruin:'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=480&q=65',
 factory:'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=480&q=65',
 onsen:'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=480&q=65',
 rice:'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=480&q=65'
};
function draw({body,snapshot,locations={},availability,onTravel,onBoard,onWorldTravel,onFeedback}){
 const atlas=global.PaperWorldAtlas;
 if(!atlas){body.textContent='城市地图数据尚未加载';return}
 const map=tag('div','pw-world-map');map.dataset.mode='world';
 map.setAttribute('aria-label','可以缩放拖动的多城市山海交通地图');
 const world=tag('div','pw-world-canvas');
 const terrain=svg('svg',{viewBox:'0 0 2000 1280',width:2000,height:1280},'pw-world-terrain');
 const transport=svg('svg',{viewBox:'0 0 2000 1280',width:2000,height:1280},'pw-world-transport');
 const features=tag('div','pw-world-features');
 const cities=tag('div','pw-world-city-layer');
 const poiLayer=tag('div','pw-world-poi-layer');
 const flags=tag('div','pw-world-current-layer');
 world.append(terrain,transport,features,cities,poiLayer,flags);
 map.append(world);
 const popup=tag('div','pw-world-popup');popup.hidden=true;
 popup.setAttribute('role','group');
 const chrome=tag('div','pw-world-chrome');
 const title=tag('div','pw-world-heading');
 title.append(tag('strong','pw-world-title','霧湾都市圈'),
  tag('span','pw-world-subtitle','都市 · 乡村 · 山海 · 群岛'));
 const controls=tag('div','pw-world-controls');
 const zoomOut=tag('button','pw-world-tool','−'),zoomIn=tag('button','pw-world-tool','+');
 const home=tag('button','pw-world-tool is-home','全域');
 const switcher=tag('button','pw-world-tool is-layer','交通');
 for(const b of [zoomOut,zoomIn,home,switcher])b.type='button';
 zoomOut.setAttribute('aria-label','缩小地图');
 zoomIn.setAttribute('aria-label','放大地图');
 home.setAttribute('aria-label','查看完整都市圈');
 switcher.setAttribute('aria-label','切换交通线路与地形');
 controls.append(zoomOut,zoomIn,home,switcher);
 chrome.append(title,controls);map.append(chrome);
 const footer=tag('div','pw-world-footer');
 const legend=tag('div','pw-world-legend');
 legend.append(tag('span','pw-world-key is-rail','城际铁路'),
  tag('span','pw-world-key is-road','高速 / 巴士'),
  tag('span','pw-world-key is-ferry','渡轮'),
  tag('span','pw-world-key is-metro','市内地铁'));
 footer.append(legend,tag('div','pw-world-hint','滚轮缩放 · 拖拽移动 · 点击照片或交通线'));
 map.append(footer,popup);
 body.replaceChildren(map);
 let scale=1,tx=0,ty=0,fit=1,drag=null,
   selected=null,lastOpen=null,renderPending=false,mode='all',
   focusedCity=null;
 const current=snapshot?.location||'entrance';
 const currentPoi=atlas.POI_BY_ID[current]||atlas.POI_BY_ID.entrance;
 const currentCity=currentPoi?.city||'kirihama';
 const cityBy=atlas.CITY_BY_ID;
 const currentPlace=atlas.CITY_BY_ID[currentCity]||atlas.CITIES[0];
 const viewedCity=()=>atlas.CITIES.find(c=>dist(c,{x:(map.clientWidth*.5-tx)/scale,y:(map.clientHeight*.5-ty)/scale})<c.radius*1.2);
 function dismiss(){popup.hidden=true;selected=null;lastOpen=null;
  map.querySelectorAll('[data-selected="true"]').forEach(n=>n.dataset.selected='false')}
 function mapXY(p){return {x:tx+p.x*scale,y:ty+p.y*scale}}
 function sourcePhoto(key){return atlas.PHOTOS[key]||atlas.PHOTOS.street}
 // The photo assets are replaceable one-by-one without changing any route.
 function preload(img,key,id){
  const source=sourcePhoto(key);
  img.alt='';img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
  const srcs=[source.url,THEME_BACKUP[key],
    PHOTO_FALLBACK[id]||'./assets/locations/park.svg'].filter(Boolean);
  let index=0;
  img.addEventListener('error',()=>{
   if(++index<srcs.length)img.src=srcs[index];
   else{img.removeAttribute('src');img.dataset.fallback='true'}
  });
  img.src=srcs[0];
 }
 function itemButton(label,callback,disabled=false,main=false){
  const b=tag('button','pw-world-action'+(main?' is-main':''),label);
  b.type='button';b.disabled=!!disabled;
  b.addEventListener('click',event=>{event.stopPropagation();callback()});
  return b;
 }
 function menu(event,heading,description,commands,sourceNode){
  dismiss();
  const header=tag('div','pw-world-popup-title',heading);
  const sub=tag('div','pw-world-popup-meta',description);
  const btns=tag('div','pw-world-popup-buttons');
  for(const a of commands)btns.append(itemButton(a.label,a.run,a.disabled,a.main));
  popup.replaceChildren(header,sub,btns);popup.hidden=false;
  selected=sourceNode;
  if(selected)selected.dataset.selected='true';
  lastOpen={x:event.clientX,y:event.clientY,node:sourceNode};
  movePopup();
 }
 function movePopup(){
  if(popup.hidden||!lastOpen)return;
  const r=map.getBoundingClientRect();
  const b=lastOpen.node?.isConnected?lastOpen.node.getBoundingClientRect():null;
  const x=b?b.left+b.width*.5:lastOpen.x;
  const y=b?b.top+b.height*.5:lastOpen.y;
  const W=Math.min(230,Math.max(165,map.clientWidth*.33));
  popup.style.width=W+'px';
  const H=popup.offsetHeight||118;
  const X=x-r.left,Y=y-r.top;
  popup.style.left=clamp(X+W+18>r.width?X-W-16:X+16,5,r.width-W-5)+'px';
  popup.style.top=clamp(Y-H*.44,5,r.height-H-5)+'px';
 }
 function banner(place){
  const p=sourcePhoto(place.photo||'street');
  const city=cityBy[place.city];
  return (city?.name||'都市圈')+' · '+(place.kind||'地点');
 }
 function planFromCurrent(place){
  if(!place||!cityBy[place.city])return null;
  return atlas.route(currentCity,place.city);
 }
 function formatRoute(r){
  if(!r)return '当前没有可用的区域公共交通线路';
  if(!r.legs.length)return '同城范围 · 市内交通或步行';
  const names=[...new Set(r.legs.map(l=>l.line.name))];
  return names.join(' → ')+' · 约 '+r.minutes+' 分钟';
 }
 function choosePlace(e,p,node){
  e.stopPropagation();
  const route=planFromCurrent(p);
  const accessible=p.staged&&p.status==='日常'&&!!locations[p.id];
  const fromMap=current==='entrance'||currentPoi?.city;
  const commands=[
   {label:'前往',main:true,disabled:!route||!fromMap,
    run:async()=>{
     dismiss();
     if(accessible){
      const result=await onTravel?.(p.id,global.PaperWorldMetro?.path(current,p.id)||null);
      if(!result?.ok)onFeedback?.(result?.reason||'无法抵达');
     }else if(onWorldTravel){
      const result=await onWorldTravel(p.id,route);
      if(!result?.ok)onFeedback?.(result?.reason||'尚不可通行');
     }else{
      onFeedback?.('已记录路线，正式场景尚未开放');
     }
    }},
   {label:'详情',run:()=>menu(e,p.name,
     p.desc+' · '+banner(p)+' · '+formatRoute(route),
     [{label:'返回地图',run:dismiss}],node)}
  ];
  if(p.kind==='rumor')commands.push({label:'传闻档案',
   run:()=>menu(e,p.name,
    '相关怪谈仍在收集中。手机档案会记录对应地点与传闻。',
    [{label:'返回地图',run:dismiss}],node)});
  menu(e,p.name,formatRoute(route),commands,node);
 }
 function chooseCity(e,c,node){
  e.stopPropagation();
  const route=atlas.route(currentCity,c.id);
  menu(e,c.name,c.sub+' · '+formatRoute(route),[
   {label:'查看城区',main:true,run:()=>{
     focusedCity=c.id;dismiss();focus(c.x,c.y,Math.max(fit*2.9,1.15))
   }},
   {label:'交通路线',run:()=>menu(e,c.name,formatRoute(route),
    [{label:'返回地图',run:dismiss}],node)}
  ],node);
 }
 function chooseLine(e,l,node){
  e.stopPropagation();
  const stops=citiesOnLine(l);
  if(!stops.length)return;
  const index=stops.findIndex(c=>c.id===currentCity);
  if(index<0){
   const near=stops.reduce((best,c)=>dist(c,currentPlace)<dist(best,currentPlace)?c:best,stops[0]);
   menu(e,l.name,'当前不在此线路沿线 · 从 '+near.name+' 站换乘',[
    {label:'查看接驳路线',main:true,run:()=>menu(e,l.name,
      formatRoute(atlas.route(currentCity,near.id)),
      [{label:'返回地图',run:dismiss}],node)}
   ],node);return;
  }
  const selections=[];
  for(const nextIndex of [index-1,index+1]){
   if(nextIndex<0||nextIndex>=stops.length)continue;
   const dest=stops[nextIndex];
   selections.push({label:'往 '+dest.name+' 方向',main:true,run:()=>{
    const route=atlas.route(currentCity,dest.id,
      ['highway','coach','bus'].includes(l.mode)?'road':'rail');
    const destination=atlas.POIS.find(p=>p.city===dest.id);
    menu(e,l.name,formatRoute(route),[
     {label:'乘坐至 '+dest.name,main:true,
      disabled:!route||!destination,
      run:async()=>{
       dismiss();
       if(!onWorldTravel)return onFeedback?.('该车次尚未开放');
       const result=await onWorldTravel(destination.id,route);
       if(!result?.ok)onFeedback?.(result?.reason||'交通服务暂时不可用');
      }},
     {label:'返回地图',run:dismiss}
    ],node);
   }});
  }
  menu(e,l.name,atlas.SERVICE_LABELS[l.mode]+' · '+stops[index].name,
    selections,node);
 }
 function citiesOnLine(line){return line.stops.map(id=>cityBy[id]).filter(Boolean)}
 // Complex coast with natural asymmetry, several river mouths and islands.
 terrain.append(svg('rect',{x:0,y:0,width:2000,height:1280,fill:'#1c2730'}));
 terrain.append(svg('path',{d:'M1620 -50 C1580 95 1650 195 1530 310 C1470 377 1575 447 1555 500 C1500 565 1633 615 1610 690 C1570 757 1712 785 1690 853 C1660 927 1810 951 1780 1058 C1763 1123 1825 1175 1804 1310 L2100 1310 L2100 -50 Z',fill:'#1b3544'},'pw-world-sea'));
 terrain.append(svg('path',{d:'M1619 -50 C1579 95 1649 195 1529 310 C1469 377 1574 447 1554 500 C1499 565 1632 615 1609 690 C1569 757 1711 785 1689 853 C1659 927 1809 951 1779 1058 C1762 1123 1824 1175 1803 1310',fill:'none',stroke:'#6c9cab', 'stroke-width':4,opacity:.47}));
 const mountainData=[
  'M0 0 H1040 L930 143 L800 225 L710 180 L570 287 L430 245 L294 369 L168 356 L0 535Z',
  'M0 100 L325 0 L490 90 L575 190 L440 315 L512 401 L329 512 L110 583 L0 544Z',
  'M0 374 L255 317 L402 398 L472 561 L350 720 L186 779 L0 696Z',
  'M151 595 L295 520 L398 560 L515 697 L480 897 L292 970 L135 894 L0 818Z',
  'M355 897 L514 821 L670 880 L743 1050 L603 1247 L331 1232 L260 1071Z'
 ];
 mountainData.forEach((d,i)=>terrain.append(svg('path',{d,fill:['#253d39','#2e423d','#2a3c39','#34413a','#2a403d'][i],opacity:.93})));
 // Mountain contours and heavily wooded shapes, deliberately not a grid.
 for(let i=0;i<29;i++){
  const x=45+(i*137)%540,y=38+(i*167)%870;
  const c=svg('ellipse',{cx:x,cy:y,rx:50+(i*23)%78,ry:17+(i*11)%26,
   fill:'none',stroke:i%2?'#556d64':'#426159','stroke-width':1.1,opacity:.38,
   transform:'rotate('+(i*31%110-45)+' '+x+' '+y+')'});
  terrain.append(c);
 }
 // Agricultural patchwork follows the broad northern alluvial plain.
 terrain.append(svg('path',{d:'M905 65 C1050 25 1350 52 1532 156 L1490 373 L1320 440 L1030 385 L878 280 Z',fill:'#263b37',opacity:.88}));
 for(let row=0;row<8;row++)for(let col=0;col<10;col++){
  const xx=948+col*57+(row%2)*9,yy=105+row*39;
  terrain.append(svg('rect',{x:xx,y:yy,width:43+((col+row)%3)*5,height:28,rx:2,
   fill:(col+row)%3===0?'#5b7453':'#455f4c',opacity:.35,
   transform:'rotate('+(row%2===0?4:-3)+' '+xx+' '+yy+')'}));
 }
 // A mountain reservoir is distinct from the sea, linked to a winding river.
 terrain.append(svg('path',{d:'M422 844 C483 805 554 854 558 907 C568 963 530 1014 485 1017 C428 1007 400 945 422 844Z',
  fill:'#395866',stroke:'#698996','stroke-width':2,opacity:.93}));
 terrain.append(svg('path',{d:'M464 844 C552 740 625 713 681 612 S847 456 888 364 C908 323 945 297 989 275',
  fill:'none',stroke:'#567b84','stroke-width':11,opacity:.65}));
 terrain.append(svg('path',{d:'M464 844 C552 740 625 713 681 612 S847 456 888 364 C908 323 945 297 989 275',
  fill:'none',stroke:'#7ba2aa','stroke-width':3.2,opacity:.45}));
 for(const island of [
  {x:1861,y:1043,rx:63,ry:30,rot:-27},
  {x:1941,y:1160,rx:24,ry:12,rot:12},
  {x:1759,y:1129,rx:28,ry:16,rot:-18},
  {x:1831,y:1221,rx:19,ry:10,rot:22}
 ]){
  terrain.append(svg('ellipse',{cx:island.x,cy:island.y,rx:island.rx,ry:island.ry,
   fill:'#2c4542',stroke:'#789c97','stroke-width':1.8,
   transform:'rotate('+island.rot+' '+island.x+' '+island.y+')'}));
 }
 // Diverse settlement development by size and terrain, not uniform discs.
 for(const c of atlas.CITIES){
  const halo=svg('ellipse',{cx:c.x,cy:c.y,rx:c.radius*1.08,ry:c.radius*.57,
   fill:c.size==='metro'?'#45525b':'#415051',opacity:c.size==='metro'?.26:.15},
   'pw-world-urban-halo');
  terrain.append(halo);
  if(c.size==='metro'||c.size==='city'){
   for(let i=0;i<42;i++){
    const a=i*2.3999,rad=Math.sqrt(i/42)*c.radius*.83;
    const x=c.x+Math.cos(a)*rad,y=c.y+Math.sin(a)*rad*.65;
    terrain.append(svg('rect',{x:x-4,y:y-2.4,width:5+((i*5)%8),
      height:2+((i*3)%8),rx:.3,fill:'#77818a',opacity:.10+(i%4)*.027,
      transform:'rotate('+(i*11%50-25)+' '+x+' '+y+')'}));
   }
  }
 }
 const areaLayer=svg('g',{},'pw-world-geography-labels');
 for(const a of atlas.AREAS){
  const label=svg('text',{x:a.x,y:a.y,'text-anchor':'middle'},'pw-world-area-label');
  label.textContent=a.name;areaLayer.append(label);
 }
 terrain.append(areaLayer);
 // Roads sit behind regional rail. Route draws use real coordinates and
 // organic curvature; city metro below is revealed only as you zoom in.
 const railLayer=svg('g',{},'pw-world-regional-lines');
 const roadsLayer=svg('g',{},'pw-world-road-lines');
 const metrosLayer=svg('g',{},'pw-world-municipal-lines');
 transport.append(roadsLayer,railLayer,metrosLayer);
 function routePath(list){
  if(!list.length)return '';
  let d='M'+list[0].x+' '+list[0].y;
  if(list.length===2)return d+' L'+list[1].x+' '+list[1].y;
  for(let i=1;i<list.length-1;i++){
   const current=list[i],after=list[i+1];
   d+=' Q'+current.x+' '+current.y+' '+((current.x+after.x)/2)+' '+((current.y+after.y)/2);
  }
  const end=list.at(-1);
  return d+' L'+end.x+' '+end.y;
 }
 function makeRailTrack(parent,line,points,cl){
  const d=routePath(points);
  const g=svg('g',{'data-line':line.id,'data-mode':line.mode||'metro'},cl);
  g.append(svg('path',{d,stroke:'#13212a','stroke-width':line.mode==='highway'?9:8},
    'pw-world-line-casing'));
  g.append(svg('path',{d,stroke:line.color,'stroke-width':line.mode==='highway'?3:4},
    'pw-world-line-color'));
  const hit=svg('path',{d,stroke:'transparent','stroke-width':24,'pointer-events':'stroke',
    tabindex:0,role:'button','aria-label':line.name},'pw-world-line-hit');
  hit.addEventListener('click',event=>{
   if(drag?.moved)return;
   if(line.mode)chooseLine(event,line,g);
   else{
    event.stopPropagation();
    const c=atlas.CITY_BY_ID[line.city],area=global.PaperWorldMetro?.boardChoices?.(current);
    menu(event,line.name,c.name+' · 市内轨道交通',
     [{label:'沿线查看',main:true,run:()=>{dismiss();focus(c.x,c.y,Math.max(scale,1.6))}}],
     g);
   }
  });
  hit.addEventListener('keydown',event=>{
   if(event.key==='Enter'){event.preventDefault();const b=hit.getBoundingClientRect();
    hit.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:b.x+b.width/2,clientY:b.y+b.height/2}))}
  });
  g.append(hit);parent.append(g);
 }
 for(const line of atlas.LINKS){
  const points=citiesOnLine(line);
  if(points.length>1)makeRailTrack(['highway','coach','bus'].includes(line.mode)?
    roadsLayer:railLayer,line,points,
    'pw-world-transport-service is-'+line.mode);
 }
 for(const line of atlas.METRO_LINES){
  let points=line.coords;
  if(line.shape==='ring')points=[...points,points[0]];
  makeRailTrack(metrosLayer,line,points,'pw-world-metro-service');
 }
 const stopLayer=svg('g',{},'pw-world-regional-stops');transport.append(stopLayer);
 for(const c of atlas.CITIES){
  const g=svg('g',{'data-city':c.id,transform:'translate('+c.x+' '+c.y+')'},'pw-world-hub');
  g.append(svg('circle',{r:c.size==='metro'?13:9},'pw-world-hub-outer'),
   svg('circle',{r:3.8},'pw-world-hub-center'));
  stopLayer.append(g);
 }
 for(const stop of atlas.METRO_STOPS){
  const circle=svg('circle',{cx:stop.x,cy:stop.y,r:3},'pw-world-metro-stop');
  circle.dataset.stop=stop.id;metrosLayer.append(circle);
 }
 // Town photo markers summarize the region when zoomed out.
 const cityNodes=[];
 for(const c of atlas.CITIES){
  const n=tag('button','pw-world-city-card');
  n.type='button';n.dataset.city=c.id;
  n.style.left=c.x+'px';n.style.top=c.y+'px';
  const photo=tag('span','pw-world-city-photo');
  const img=document.createElement('img');
  const photoKey={kirihama:'metropolis',kirihara:'street',homori:'rice',
   shiomi:'harbor',minamioka:'factory',misaki:'village',
   okuzawa:'onsen',naruba:'mountain',mizuho:'lake',urasima:'island'}[c.id];
  preload(img,photoKey);
  photo.append(img);n.append(photo,tag('span','pw-world-city-name',c.name),
   tag('small','pw-world-city-sub',c.sub));
  n.addEventListener('click',e=>{if(drag?.moved)return;chooseCity(e,c,n)});
  cities.append(n);cityNodes.push({n,c});
 }
 // 121 distinct destinations. Their photographs are individual replaceable
 // location bindings, and only nearby ones are loaded at high zoom.
 const poiNodes=[];
 for(const p of atlas.POIS){
  const n=tag('button','pw-world-poi');
  n.type='button';n.dataset.place=p.id;n.dataset.kind=p.kind;
  n.style.left=p.x+'px';n.style.top=p.y+'px';
  const picture=tag('span','pw-world-poi-photo');
  const img=document.createElement('img');
  picture.append(img);
  const name=tag('span','pw-world-poi-title',p.name);
  n.append(picture,name);
  n.addEventListener('click',e=>{if(drag?.moved)return;choosePlace(e,p,n)});
  poiLayer.append(n);poiNodes.push({n,img,p,loaded:false});
 }
 const me=tag('div','pw-world-player','');
 me.innerHTML='<span class="pw-world-player-ring"></span><span class="pw-world-player-core"></span>';
 me.style.left=currentPoi.x+'px';me.style.top=currentPoi.y+'px';
 flags.append(me);
 const caption=tag('div','pw-world-player-caption','当前位置');
 caption.style.left=currentPoi.x+'px';caption.style.top=currentPoi.y+'px';flags.append(caption);
 function resize(){
  const w=map.clientWidth||1200,h=map.clientHeight||720;
  const previous=fit;
  fit=Math.min((w-42)/atlas.SIZE.width,(h-54)/atlas.SIZE.height);
  if(!drag||!drag.initialized||Math.abs(previous-fit)>0.01&&scale===previous){
   scale=fit;tx=(w-atlas.SIZE.width*fit)/2;ty=(h-atlas.SIZE.height*fit)/2;
  }
  schedule();
 }
 function focus(x,y,z){
  const w=map.clientWidth,h=map.clientHeight;
  scale=clamp(z,fit,3.5);tx=w*.5-x*scale;ty=h*.5-y*scale;
  schedule();
 }
 function zoomAt(next,sx,sy){
  const z=clamp(next,fit,3.5);
  const x=(sx-tx)/scale,y=(sy-ty)/scale;
  scale=z;tx=sx-x*scale;ty=sy-y*scale;
  schedule();
 }
 function apply(){
  renderPending=false;
  const w=map.clientWidth,h=map.clientHeight;
  const minX=w-(atlas.SIZE.width*scale)+10,maxX=-10;
  const minY=h-(atlas.SIZE.height*scale)+10,maxY=-10;
  if(minX<maxX)tx=clamp(tx,minX,maxX);else tx=(w-atlas.SIZE.width*scale)/2;
  if(minY<maxY)ty=clamp(ty,minY,maxY);else ty=(h-atlas.SIZE.height*scale)/2;
  world.style.transform='translate('+tx+'px,'+ty+'px) scale('+scale+')';
  map.dataset.zoom=scale>1.22?'detail':scale>.74?'district':'region';
  map.dataset.transport=mode;
  map.style.setProperty('--pw-world-city-font',(15/Math.max(scale,.25))+'px');
  map.style.setProperty('--pw-world-poi-font',(13/Math.max(scale,.25))+'px');
  const region=scale<=.72;
  for(const {n,c} of cityNodes){
   const visible=region||scale<=1.04&&c.id===viewedCity()?.id;
   n.hidden=!visible;
  }
  const activeCity=focusedCity||viewedCity()?.id||currentCity;
  const sorted=poiNodes.filter(o=>{
   const v=mapXY(o.p),margin=90;
   return v.x>-margin&&v.x<w+margin&&v.y>-margin&&v.y<h+margin;
  }).sort((a,b)=>Number(b.p.staged)-Number(a.p.staged));
  const placed=[];
  let shown=0;
  // Never let an expanding rural settlement turn into a field of overlapping
  // photo cards. Only the focused town's sights appear at medium zoom.
  const threshold=scale<1.5?152:scale<2.25?114:85;
  const limit=scale<1.5?8:scale<2.25?14:25;
  for(const node of sorted){
   const v=mapXY(node.p);
   const within=scale>2.3||node.p.city===activeCity;
   const can=scale>.77&&within&&
    !placed.some(p=>Math.hypot(p.x-v.x,p.y-v.y)<threshold)&&shown<limit;
   node.n.hidden=!can;
   if(can){
    shown++;placed.push(v);
    node.n.style.width=clamp(99/scale,43,185)+'px';
    if(!node.loaded){preload(node.img,node.p.photo,node.p.id);node.loaded=true}
   }
  }
  for(const o of poiNodes)if(!sorted.includes(o))o.n.hidden=true;
  const cardSize=clamp(118/scale,75,240);
  for(const {n} of cityNodes)n.style.width=cardSize+'px';
  movePopup();
 }
 function schedule(){if(renderPending)return;renderPending=true;
  requestAnimationFrame(apply)}
 zoomOut.addEventListener('click',()=>zoomAt(scale/1.55,map.clientWidth*.5,map.clientHeight*.5));
 zoomIn.addEventListener('click',()=>zoomAt(scale*1.55,map.clientWidth*.5,map.clientHeight*.5));
 home.addEventListener('click',()=>{focusedCity=null;
  scale=fit;tx=(map.clientWidth-2000*fit)/2;
  ty=(map.clientHeight-1280*fit)/2;schedule();dismiss()});
 switcher.addEventListener('click',()=>{
  mode=mode==='all'?'terrain':'all';switcher.textContent=mode==='all'?'交通':'地形';
  schedule();
 });
 map.addEventListener('wheel',e=>{
  e.preventDefault();const r=map.getBoundingClientRect();
  zoomAt(scale*Math.exp(-e.deltaY*.0013),e.clientX-r.left,e.clientY-r.top);
 },{passive:false});
 const pointers=new Map();
 let pinch=0,initialScale=0;
 map.addEventListener('pointerdown',e=>{
  if(e.target.closest('button')||e.target.closest('.pw-world-popup'))return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  map.setPointerCapture?.(e.pointerId);
  if(pointers.size===1){drag={x:e.clientX,y:e.clientY,tx,ty,moved:false,initialized:true}}
  if(pointers.size===2){
   const pp=[...pointers.values()];
   pinch=dist(pp[0],pp[1]);initialScale=scale;drag=null;
  }
 });
 map.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){
   const pp=[...pointers.values()];const d=dist(pp[0],pp[1]);
   const r=map.getBoundingClientRect();
   zoomAt(initialScale*d/Math.max(pinch,1),
     (pp[0].x+pp[1].x)*.5-r.left,(pp[0].y+pp[1].y)*.5-r.top);
   return;
  }
  if(drag&&pointers.size===1){
   const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
   if(Math.hypot(dx,dy)>5)drag.moved=true;
   if(drag.moved){tx=drag.tx+dx;ty=drag.ty+dy;schedule()}
  }
 });
 const release=e=>{pointers.delete(e.pointerId);
  if(!pointers.size){drag=null;pinch=0}
 };
 map.addEventListener('pointerup',release);
 map.addEventListener('pointercancel',release);
 map.addEventListener('click',e=>{
  if(e.target===map||e.target===world||e.target===terrain||
     e.target===transport||e.target.closest('.pw-world-terrain')||
     e.target.closest('.pw-world-transport-service')===null&&
     e.target.closest('button')===null)
   dismiss();
 });
 map.addEventListener('dblclick',e=>{
  if(e.target.closest('button'))return;
  const r=map.getBoundingClientRect();
  zoomAt(scale*1.65,e.clientX-r.left,e.clientY-r.top);
 });
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;
 observer?.observe(map);
 const old=global.PaperWorldRegionalMap?._cleanup;
 if(typeof old==='function')old();
 global.PaperWorldRegionalMap._cleanup=()=>observer?.disconnect();
 resize();
}
global.PaperWorldRegionalMap={draw,_cleanup:null};
})(window);
