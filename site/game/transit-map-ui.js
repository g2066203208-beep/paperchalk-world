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
 const clear=()=>{popup.hidden=true;map.querySelectorAll('[data-selected]').forEach(n=>n.dataset.selected='false')};
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
  const rect=map.getBoundingClientRect(),w=Math.min(210,Math.max(148,rect.width*.24)),h=popup.offsetHeight||122;
  const x=e.clientX-rect.left,y=e.clientY-rect.top;
  popup.style.width=w+'px';
  popup.style.left=Math.max(6,Math.min(rect.width-w-6,(x+w+22>rect.width?x-w-15:x+15)))+'px';
  popup.style.top=Math.max(38,Math.min(rect.height-h-7,y-h*.33))+'px';
 }
 for(const line of metro.LINES){
  const points=line.stops,segments=[];
  for(let i=1;i<points.length;i++)segments.push([points[i-1],points[i]]);
  if(line.ring)segments.push([points[points.length-1],points[0]]);
  for(const [a,b] of segments){
   const p=metro.STATIONS[a],q=metro.STATIONS[b],d='M'+p.x+' '+p.y+' L'+q.x+' '+q.y;
   const rail=document.createElementNS(NS,'path');
   rail.classList.add('pw-transit-rail');if(line.locked)rail.classList.add('is-locked');
   rail.setAttribute('stroke',line.color);rail.setAttribute('d',d);svg.append(rail);
   const hit=document.createElementNS(NS,'path');
   hit.classList.add('pw-transit-line-hit');
   hit.setAttribute('d',d);hit.setAttribute('stroke','transparent');hit.style.pointerEvents='stroke';
   hit.setAttribute('role','button');hit.setAttribute('aria-label','乘坐'+line.name);
   hit.addEventListener('click',e=>{
    e.stopPropagation();
    const options=metro.boardingChoices(current).find(v=>v.id===line.id);
    if(!options){menu(e,line.name,line.locked?'此线路尚未运营':'当前站不在此线路上，请到换乘站',[]);return}
    menu(e,line.name,'从 '+metro.STATIONS[current].label+' 出发',options.directions.map(dir=>({
     label:dir.label,primary:true,run:async()=>{
      if(busy)return;busy=true;clear();
      let result;try{result=await onBoard(line.id,dir.direction)}
      catch(_){result={ok:false,reason:'上车失败'}}
      busy=false;if(!result?.ok)menu(e,line.name,result?.reason||'无法乘车',[]);
     }
    })));
    hit.dataset.selected='true';
   });svg.append(hit);
  }
 }
 for(const line of metro.LINES){
  const label=create('span','pw-transit-line-key',line.name);
  label.dataset.line=line.id;label.style.setProperty('--route-color',line.color);
  if(line.locked)label.dataset.locked='true';
  map.append(label);
 }
 for(const [id,station] of Object.entries(metro.STATIONS)){
  const name=names[id]||station.label;
  const node=create('button','pw-transit-place'+(!PHOTO[id]?' is-station':''));
  node.type='button';node.dataset.place=id;node.dataset.current=String(id===current);
  node.dataset.locked=String(!!station.locked);node.dataset.selected='false';
  node.style.left=station.x+'%';node.style.top=station.y+'%';
  node.setAttribute('aria-label',name+(station.locked?'，未开放':''));
  if(PHOTO[id]){
   const pic=create('span','pw-transit-photo'),img=create('img');
   img.alt='';img.loading='eager';img.decoding='async';img.referrerPolicy='no-referrer';
   const [src,fallback]=PHOTO[id];img.src=src;
   img.addEventListener('error',()=>{if(img.dataset.fallback)return;img.dataset.fallback='true';img.src=fallback});
   pic.append(img);node.append(pic);
  }else node.append(create('span','pw-transit-station-dot',station.locked?'×':station.transfer?'◎':'•'));
  node.append(create('span','pw-transit-place-name',name));
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
 map.append(create('span','pw-transit-tip','点照片查看地点 · 点线路选择方向'));
 map.append(popup);body.replaceChildren(map);
}
global.PaperWorldTransitMap=Object.freeze({PHOTO,draw});
})(window);
