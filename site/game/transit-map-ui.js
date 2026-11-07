/* Photographic urban transit map; geometry and controls are never baked into artwork. */
(function(global){
'use strict';
const PHOTO=Object.freeze({
 entrance:['https://commons.wikimedia.org/wiki/Special:FilePath/Residential_area.jpg?width=540','./assets/scenes/entrance.webp'],
 school:['https://commons.wikimedia.org/wiki/Special:FilePath/Horikoshi_High_School_(external_appearance).jpg?width=540','./assets/classroom.webp'],
 convenience:['https://commons.wikimedia.org/wiki/Special:FilePath/Family-Mart-store_JA-Izumo-Otsu.jpg?width=540','./assets/locations/convenience.svg'],
 cafe:['https://commons.wikimedia.org/wiki/Special:FilePath/Cafe_Casa%2C_Tokyo_2021.jpg?width=540','./assets/locations/cafe.svg'],
 mall:['https://commons.wikimedia.org/wiki/Special:FilePath/Shinjuku_Keio-Department-store.jpg?width=540','./assets/locations/mall.svg'],
 park:['https://commons.wikimedia.org/wiki/Special:FilePath/Fuchu-city.Tokyo.Japan.Keyaki.namiki.dori.fuchu.jpg?width=540','./assets/locations/park.svg']
});
const names={entrance:'家',school:'学校',convenience:'便利店',cafe:'咖啡厅',mall:'商场',park:'公园',central:'中央站',northgate:'北街口',hospital:'医院',station:'车站',police:'警察局'};
const create=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
const NS='http://www.w3.org/2000/svg';
function draw({body,snapshot,locations,availability,onTravel,onBoard}){
 const metro=global.PaperWorldMetro;
 if(!metro){body.textContent='交通网络尚未加载';return}
 const current=['bedroom','living-room','kitchen'].includes(snapshot.location)?'entrance':snapshot.location;
 const map=create('div','pw-transit-map');
 map.setAttribute('aria-label','城市地铁图，点击地点照片或线路');
 const svg=document.createElementNS(NS,'svg');
 svg.classList.add('pw-transit-lines');svg.setAttribute('viewBox','0 0 100 100');
 svg.setAttribute('preserveAspectRatio','none');map.appendChild(svg);
 const popup=create('div','pw-transit-popup');popup.hidden=true;popup.setAttribute('role','group');
 let busy=false;
 const clear=()=>{
   popup.hidden=true;
   map.querySelectorAll('[data-selected]').forEach(n=>n.dataset.selected='false');
 };
 map.addEventListener('click',e=>{if(e.target===map||e.target===svg)clear()});
 function menu(e,name,details,actions){
  clear();popup.replaceChildren(create('strong','pw-transit-popup-name',name));
  if(details)popup.append(create('small','pw-transit-popup-sub',details));
  const group=create('div','pw-transit-popup-buttons');
  for(const action of actions||[]){
    const btn=create('button','pw-transit-menu-item'+(action.primary?' is-primary':''),action.label);
    btn.type='button';btn.disabled=!!action.disabled;
    btn.addEventListener('click',ev=>{ev.stopPropagation();action.run()});group.append(btn);
  }
  popup.append(group);map.append(popup);popup.hidden=false;
  const rect=map.getBoundingClientRect(),w=Math.min(210,Math.max(148,rect.width*.24));
  popup.style.width=w+'px';
  const h=popup.offsetHeight||122;
  const x=e.clientX-rect.left,y=e.clientY-rect.top;
  // Node popovers sit OUTSIDE the photograph's full bounding box.
  // Clicking on a photo's left/right edge must never cover that same photo.
  const locationCard=e.currentTarget?.closest?.('.pw-transit-place');
  if(locationCard){
   const anchor=locationCard.getBoundingClientRect();
   const leftEdge=anchor.left-rect.left,rightEdge=anchor.right-rect.left;
   const roomRight=rect.width-rightEdge-10;
   const roomLeft=leftEdge-10;
   const preferRight=roomRight>=w||roomRight>=roomLeft;
   const left=preferRight?rightEdge+12:leftEdge-w-12;
   popup.style.left=Math.max(6,Math.min(rect.width-w-6,left))+'px';
   popup.style.top=Math.max(38,Math.min(rect.height-h-7,
     anchor.top-rect.top+anchor.height*.5-h*.5))+'px';
  }else{
   popup.style.left=Math.max(6,Math.min(rect.width-w-6,
    (x+w+22>rect.width?x-w-15:x+15)))+'px';
   popup.style.top=Math.max(38,Math.min(rect.height-h-7,y-h*.33))+'px';
  }
 }
 // The rail canvas is drawn in real CSS-pixel coordinates, so 90° corners
 // remain circular at every aspect ratio. No skewed diagonals or sharp joins.
 const geometry=global.PaperWorldMetroGeometry;
 const segments=[],stationMarkers=[];
 function lineSegment(line,a,b){
  const group=document.createElementNS(NS,'g');
  group.classList.add('pw-transit-segment');
  group.dataset.line=line.id;group.dataset.from=a;group.dataset.to=b;
  if(line.locked)group.dataset.locked='true';
  const createStroke=(cls,stroke)=>{
   const path=document.createElementNS(NS,'path');
   path.classList.add(cls);path.setAttribute('stroke',stroke);
   group.appendChild(path);return path;
  };
  const casing=createStroke('pw-transit-rail-casing','#0f1b21');
  const core=createStroke('pw-transit-rail',line.color);
  const glint=createStroke('pw-transit-rail-glint','#e4eeed');
  const hit=createStroke('pw-transit-line-hit','transparent');
  hit.setAttribute('role','button');hit.setAttribute('tabindex','0');
  hit.setAttribute('aria-label','乘坐'+line.name);
  hit.style.pointerEvents='stroke';
  hit.addEventListener('pointerenter',()=>group.dataset.hover='true');
  hit.addEventListener('pointerleave',()=>group.dataset.hover='false');
  hit.addEventListener('keydown',event=>{
   if(event.key==='Enter'||event.key===' '){event.preventDefault();hit.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:hit.getBoundingClientRect().x+hit.getBoundingClientRect().width/2,clientY:hit.getBoundingClientRect().y+hit.getBoundingClientRect().height/2}));}
  });
  hit.addEventListener('click',event=>{
   event.stopPropagation();
   const options=metro.boardingChoices(current).find(v=>v.id===line.id);
   if(!options){
    menu(event,line.name,line.locked?'尚未运营':'请先到此线的车站换乘',[]);
    return;
   }
   menu(event,line.name,'当前站 · '+metro.STATIONS[current].label,
    options.directions.map(dir=>({
     label:dir.label,primary:true,run:async()=>{
      if(busy)return;busy=true;clear();
      let result;
      try{result=await onBoard(line.id,dir.direction)}
      catch(_){result={ok:false,reason:'上车失败'}}
      busy=false;
      if(!result?.ok)menu(event,line.name,result?.reason||'无法乘车',[]);
     }
    })));
   group.dataset.selected='true';
  });
  svg.appendChild(group);
  segments.push({line,a,b,parts:[casing,core,glint,hit]});
 }
 for(const line of metro.LINES){
  for(const [a,b] of (geometry?.segments(line)||[]))lineSegment(line,a,b);
 }
 for(const [id,station] of Object.entries(metro.STATIONS)){
  const group=document.createElementNS(NS,'g');
  group.classList.add('pw-transit-stop-group');
  group.dataset.stop=id;
  if(station.locked)group.dataset.locked='true';
  if(station.transfer)group.dataset.transfer='true';
  if(current===id)group.dataset.current='true';
  const makeCircle=(cls)=>{
   const c=document.createElementNS(NS,'circle');
   c.classList.add(cls);c.setAttribute('r',cls==='pw-transit-stop-halo'?13:
     cls==='pw-transit-transfer-core'?3.2:station.transfer?8:5.5);
   group.appendChild(c);return c;
  };
  if(current===id)makeCircle('pw-transit-stop-halo');
  const circle=makeCircle('pw-transit-stop-circle');
  if(station.transfer)makeCircle('pw-transit-transfer-core');
  svg.appendChild(group);
  stationMarkers.push({station,group});
 }
 function drawLines(){
  if(!map.isConnected)return;
  const rect=map.getBoundingClientRect();
  const width=Math.max(1,rect.width),height=Math.max(1,rect.height);
  svg.setAttribute('viewBox','0 0 '+width+' '+height);
  for(const seg of segments){
   const d=geometry.pathFor(seg.line.id,seg.a,seg.b,
      metro.STATIONS,width,height,Math.min(22,height*.041));
   for(const p of seg.parts)p.setAttribute('d',d);
  }
  for(const {station,group} of stationMarkers){
   group.setAttribute('transform','translate('+
    (station.x*width/100)+','+(station.y*height/100)+')');
  }
 }
 // One compact route label per colored service, attached to its geography.
 const keyPositions={a:[60,35],b:[57,85],c:[20,85]};
 for(const line of metro.LINES){
  const label=create('span','pw-transit-line-key',line.name);
  label.dataset.line=line.id;
  label.style.setProperty('--route-color',line.color);
  label.style.left=keyPositions[line.id][0]+'%';
  label.style.top=keyPositions[line.id][1]+'%';
  if(line.locked)label.dataset.locked='true';
  map.append(label);
 }
 for(const [id,station] of Object.entries(metro.STATIONS)){
  const name=names[id]||station.label;
  const node=create('button','pw-transit-place'+(!PHOTO[id]?' is-station':''));
  node.type='button';node.dataset.place=id;node.dataset.current=String(id===current);
  node.dataset.locked=String(!!station.locked);node.dataset.selected='false';
  node.style.left=station.x+'%';node.style.top=station.y+'%';
  node.dataset.photograph=String(!!PHOTO[id]);
  node.setAttribute('aria-label',name+(station.locked?'，未开放':''));
  if(PHOTO[id]){
   const pic=create('span','pw-transit-photo'),img=create('img');
   img.alt='';img.loading='eager';img.decoding='async';img.referrerPolicy='no-referrer';
   const [src,fallback]=PHOTO[id];
   // Local visual first: an offline or stalled photo server never leaves a
   // dark empty card. Only swap to online reference after its pixels load.
   img.src=fallback;pic.append(img);node.append(pic);
   const remote=new Image();remote.decoding='async';
   remote.referrerPolicy='no-referrer';
   remote.onload=()=>{if(img.isConnected&&remote.naturalWidth>0)img.src=src};
   remote.onerror=()=>{};
   remote.src=src;
   img.addEventListener('error',()=>{if(img.src!==new URL(fallback,document.baseURI).href)img.src=fallback});
  }else node.append(create('span','pw-transit-station-dot',station.locked?'×':station.transfer?'◎':'•'));
  node.append(create('span','pw-transit-place-name',name));
  if(PHOTO[id])node.append(create('span','pw-transit-photo-link'));
  node.addEventListener('click',e=>{
   e.stopPropagation();
   const def=locations[id];
   const status=station.locked?{ok:false,reason:'尚未开放'}:
      id===current?{ok:false,reason:'当前位置'}:availability(id,snapshot);
   const subtitle=status.ok?'预计 '+status.cost+' 分钟':status.reason;
   menu(e,name,subtitle,[
    {label:'前往',primary:true,disabled:!status.ok,run:async()=>{
     if(busy)return;busy=true;clear();
     let result;try{result=await onTravel(id,metro.path(current,id))}
     catch(_){result={ok:false,reason:'场景加载失败'}}
     busy=false;if(!result?.ok)menu(e,name,result?.reason||'无法抵达',[]);
    }},
    {label:'详情',run:()=>{
      const p=metro.path(current,id);
      const open=def?String(Math.floor(def.open/60)).padStart(2,'0')+':00—'+
        String(Math.floor(def.close/60)).padStart(2,'0')+':00':'尚未开放';
      menu(e,name,def?'开放 '+open+
        (p?.segments.length?' · '+p.lines.join(' / ')+(p.transfers.length?' · 需换乘':' · 直达'):''):'尚未开放',
        [{label:'返回',run:()=>clear()}]);
    }}
   ]);node.dataset.selected='true';
  });
  map.append(node);
 }
 map.append(create('span','pw-transit-caption','城区交通'));
 map.append(create('span','pw-transit-tip','点击地点或线路'));
 map.append(popup);body.replaceChildren(map);
 drawLines();
 if(typeof ResizeObserver==='function'){
  const ro=new ResizeObserver(drawLines);ro.observe(map);
  // The next render disconnects the old observer when opening a fresh map.
  if(global.PaperWorldTransitMap?._disconnect)
   global.PaperWorldTransitMap._disconnect();
  global.PaperWorldTransitMap._disconnect=()=>ro.disconnect();
 }
}
global.PaperWorldTransitMap={PHOTO,draw,_disconnect:null};
})(window);
