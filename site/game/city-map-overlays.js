/* Paperchalk World | Kirihama full-size illustrated city atlas overlay.
 * A real destination is NOT a metro stop. 120 authored doorways sit on the
 * exact same editable metro coordinate plane, with city/district zoom LOD.
 * No standalone mock map, no fake rail, no 120 picture cards on the screen.
 */
(function(root){
'use strict';
const ICONS=Object.freeze({central:'都',westold:'旧',campus:'学',eastcommerce:'商',
 residential:'住',river:'川',baynew:'湾',harbor:'港',medical:'医',
 industrial:'工',northhill:'山',southsuburb:'郊',nightlife:'夜',
 culture:'文',underground:'地'});
const SIGNS=Object.freeze({home:'家',school:'学',convenience:'店',cafe:'茶',
 mall:'商',park:'园',hospital:'医',station:'站',police:'警',
 rumor:'?',shrine:'社',factory:'工',port:'港',landmark:'景',
 town:'街',forest:'林',rural:'田'});
const div=(tag,cls,txt)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(txt!==undefined)el.textContent=txt;
 return el;
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function create({map,svg,canvas,tools,atlas,metro,network,localPoint,
 camera,viewport,center,clear,showMenu,onTravel,notify}){
 const plan=atlas?.KIRIHAMA_CITY_PLAN;
 if(!plan?.sites?.length||!metro?.STATIONS)return null;
 const districtRows=plan.districts;
 const places=atlas.POIS.filter(p=>p.city==='kirihama'&&p.metroLocal);
 if(places.length!==120)throw Error('120 physical Kirihama doorway locations required');
 const districtLayer=div('div','pw-large-city-districts');
 const placeLayer=div('div','pw-large-city-places');
 canvas.append(placeLayer,districtLayer);
 const NS='http://www.w3.org/2000/svg';
 const links=document.createElementNS(NS,'g');
 links.setAttribute('class','pw-large-city-district-links');
 svg.append(links);
 const menu=div('aside','pw-large-city-browser');
 menu.hidden=true;menu.setAttribute('aria-label','霧浜市全部地点');
 const bar=div('div','pw-large-city-browser-top');
 bar.append(div('strong','', '霧浜市 / 120 LOCATIONS'));
 const close=div('button','pw-large-city-browser-close','×');
 close.type='button';close.setAttribute('aria-label','收起全部地点');
 bar.append(close);
 const meta=div('p','pw-large-city-browser-meta','15 个城区 · 120 个可查看的地图位置');
 const search=div('input','pw-large-city-browser-search');
 search.type='search';search.placeholder='搜索地点、车站或城区';
 search.setAttribute('aria-label','搜索所有120个地点');
 const select=div('select','pw-large-city-browser-filter');
 select.setAttribute('aria-label','选择城市片区');
 const all=div('option','', '全部城区');all.value='all';select.append(all);
 for(const d of districtRows){
  const opt=div('option','',d.name+' · '+d.siteCount);
  opt.value=d.id;select.append(opt);
 }
 const rows=div('div','pw-large-city-browser-rows');
 menu.append(bar,meta,search,select,rows);map.append(menu);
 const toggle=div('button','pw-dot-tool pw-large-city-toggle','查看地点');
 toggle.type='button';toggle.hidden=true;
 toggle.setAttribute('aria-label','查看霧浜市所有120个地点');
 tools.insertBefore(toggle,tools.querySelector('.pw-metro-edit-toggle'));
 let open=false,activeCity=null,focusedDistrict=null,selectedId=null;
 const districts=[],pins=[];
 const point=p=>({x:280+p.metroLocal.eastM/900*40,
  y:80+p.metroLocal.southM/900*40});
 for(const d of districtRows){
  const node=div('button','pw-large-city-district');
  node.type='button';node.dataset.district=d.id;
  node.setAttribute('aria-label',d.name+'，'+d.siteCount+'个地点');
  const crest=div('span','pw-large-city-crest',ICONS[d.id]||'区');
  const name=div('span','pw-large-city-district-name',d.name);
  const total=div('span','pw-large-city-district-count',String(d.siteCount));
  node.append(crest,name,total);
  districtLayer.append(node);
  const p={x:280+d.core.gridX*40,y:80+d.core.gridY*40};
  districts.push({node,p,d});
  node.addEventListener('click',ev=>{
   ev.stopPropagation();focusDistrict(d.id);
  });
 }
 for(const poi of places){
  const node=div('button','pw-large-city-pin');
  node.type='button';node.dataset.place=poi.id;
  node.dataset.district=poi.districtId;
  node.dataset.status=poi.status;
  node.dataset.active=String(poi.status==='日常');
  node.dataset.selected='false';
  node.setAttribute('aria-label',poi.name+' · '+poi.status);
  const kind=div('span','pw-large-city-pin-icon',SIGNS[poi.kind]||'·');
  const label=div('span','pw-large-city-pin-label',poi.name);
  node.append(kind,label);
  placeLayer.append(node);
  const p=point(poi);
  pins.push({node,p,poi});
  node.addEventListener('click',e=>{e.stopPropagation();openPlace(poi,e,node)});
 }
 function togglePanel(next){
  open=!!next&&activeCity==='kirihama';
  menu.hidden=!open;
  toggle.dataset.active=String(open);
  if(open)renderList();
  position({activeCity,camera:camera(),viewport:viewport()});
 }
 toggle.addEventListener('click',()=>togglePanel(!open));
 close.addEventListener('click',()=>togglePanel(false));
 search.addEventListener('input',renderList);
 select.addEventListener('change',renderList);
 function placeBox(poi){
  const stop=metro.STATIONS[poi.metroStationId];
  const district=districtRows.find(d=>d.id===poi.districtId);
  return (district?.name||'霧浜市')+' · '+(stop?.label||'换乘站')+
   ' · 步行约'+poi.walkingEstimateM+'米 · '+poi.status;
 }
 function openPlace(poi,event,node){
  focusedDistrict=poi.districtId;selectedId=poi.id;
  const station=metro.STATIONS[poi.metroStationId];
  const available=poi.status==='日常';
  const commands=[
   {label:available?'前往地点':'未开放 · 仅位置规划',primary:available,
    disabled:!available,run:async()=>{
     clear();
     try{
      const result=await onTravel?.(poi.id,null);
      if(!result?.ok)notify(result?.reason||'暂时无法前往');
     }catch(err){notify('暂时无法前往此地点')}
    }},
   {label:'定位所属地铁站',disabled:!station,run:()=>{
    clear();if(!station)return;
    center(localPoint(station),Math.max(2.8,camera().scale));
    notify(station.label+' · '+poi.walkingEstimateM+'米接驳（规划估算）');
   }}
  ];
  showMenu(event,node,poi.name,placeBox(poi),commands);
  // Reapply selection AFTER popup creation, which clears older selections.
  focusedDistrict=poi.districtId;selectedId=poi.id;
  if(open)renderList();
  position({activeCity,camera:camera(),viewport:viewport()});
 }
 function focusPlace(poi){
  const row=pins.find(r=>r.poi.id===poi.id);
  if(!row)return;
  focusedDistrict=poi.districtId;selectedId=poi.id;
  clear();
  center(row.p,Math.max(camera().scale,3.25));
  // Use actual screen target for the existing in-place popup, without
  // introducing a fixed right-hand travel decision box.
  const cam=camera(),target={
   clientX:cam.x+row.p.x*cam.scale,
   clientY:cam.y+row.p.y*cam.scale,
   stopPropagation(){}
  };
  openPlace(poi,target,row.node);
 }
 function focusDistrict(id){
  const selected=districtRows.find(d=>d.id===id);
  if(!selected)return;
  focusedDistrict=id;selectedId=null;clear();
  const contents=pins.filter(r=>r.poi.districtId===id);
  const minX=Math.min(...contents.map(s=>s.p.x)),
   maxX=Math.max(...contents.map(s=>s.p.x)),
   minY=Math.min(...contents.map(s=>s.p.y)),
   maxY=Math.max(...contents.map(s=>s.p.y));
  const v=viewport();
  const desired=Math.min((v.w-235)/(maxX-minX+110),
   (v.h-185)/(maxY-minY+95));
  center({x:(minX+maxX)/2,y:(minY+maxY)/2},
   Math.max(2.45,Math.min(4.3,desired)));
  if(open)renderList();
 }
 function renderList(){
  if(!open)return;
  const term=search.value.trim().toLowerCase();
  const filter=select.value;
  const matches=places.filter(p=>
   (filter==='all'||p.districtId===filter)&&
   (!term||p.name.toLowerCase().includes(term)||
    (districtRows.find(d=>d.id===p.districtId)?.name||'').includes(term)||
    (metro.STATIONS[p.metroStationId]?.label||'').includes(term)));
  meta.textContent=matches.length+' / 120 地点 · 6处已有日常场景，其余逐步开放';
  rows.replaceChildren();
  for(const poi of matches){
   const item=div('button','pw-large-city-place-row');
   item.type='button';item.dataset.place=poi.id;
   item.dataset.selected=String(poi.id===selectedId);
   item.append(div('strong','',poi.name),
    div('small','',(metro.STATIONS[poi.metroStationId]?.label||'')+' · '+poi.status));
   item.addEventListener('click',()=>focusPlace(poi));
   rows.append(item);
  }
 }
 function position({activeCity:scope,camera:cam,viewport:v}){
  activeCity=scope;
  const enabled=scope==='kirihama';
  districtLayer.hidden=!enabled||!open;
  placeLayer.hidden=!enabled||!open;
  links.style.display=enabled&&open?'':'none';
  toggle.hidden=!enabled||map.dataset.metroEditing==='true';
  menu.hidden=!enabled||!open;
  if(!enabled||!open)return;
  const {x,y,scale}=cam;
  map.dataset.citySites='120';
  map.dataset.cityDistrictCount='15';
  map.dataset.placeMapScale=scale>=2.4?'district':'full-city';
  // All 120 sites retain DOM nodes and exact unique map positions, even
  // when outside the camera. Every dot is clickable when on screen.
  const occupied=[];
  for(const {node,p,poi} of pins){
   const px=x+p.x*scale,py=y+p.y*scale;
   node.style.left=px+'px';node.style.top=py+'px';
   const visible=px>-24&&px<v.w+24&&py>-24&&py<v.h+24;
   node.hidden=!visible;
   node.dataset.selected=String(selectedId===poi.id);
   node.dataset.dim=String(!!focusedDistrict&&poi.districtId!==focusedDistrict);
   let label=visible&&(selectedId===poi.id||
     (focusedDistrict===poi.districtId&&scale>=2.4)||
     (poi.status==='日常'&&scale>=1.7));
   if(label&&selectedId!==poi.id){
    const width=Math.min(162,Math.max(62,poi.name.length*15+18));
    const b={left:px-width/2,right:px+width/2,top:py+14,bottom:py+40};
    if(occupied.some(a=>b.left<a.right+4&&b.right>a.left-4&&
     b.top<a.bottom+4&&b.bottom>a.top-4))label=false;
    else occupied.push(b);
   }
   node.dataset.label=String(label);
  }
  links.replaceChildren();
  const boxes=[];
  for(const {node,p,d} of districts){
   const ax=x+p.x*scale,ay=y+p.y*scale;
   if(ax<-180||ax>v.w+180||ay<-100||ay>v.h+120){
    node.hidden=true;continue;
   }
   node.hidden=false;
   node.dataset.selected=String(d.id===focusedDistrict);
   // Near a neighborhood, keep other area signs small; at city overview
   // retain every area sign and move its CARD without moving its true anchor.
   const small=scale>=2.4&&d.id!==focusedDistrict;
   node.dataset.small=String(small);
   const width=small?39:152,height=small?39:50;
   const shifts=small?[[0,-24],[0,24]]:[
    [0,-73],[0,67],[165,-30],[-165,-30],[165,55],
    [-165,55],[0,-142],[0,130],[315,-32],[-315,-32],
    [315,65],[-315,65]];
   let best=null;
   for(const [dx,dy] of shifts){
    const cx=clamp(ax+dx,width/2+9,v.w-width/2-9);
    const cy=clamp(ay+dy,height/2+75,v.h-height/2-62);
    const overlap=boxes.reduce((sum,b)=>
     sum+Math.max(0,(width+b.w)/2+8-Math.abs(cx-b.x))*
      Math.max(0,(height+b.h)/2+8-Math.abs(cy-b.y)),0);
    const score=overlap*80+Math.hypot(cx-ax,cy-ay);
    if(!best||score<best.score)best={x:cx,y:cy,score,overlap};
    if(overlap===0)break;
   }
   if(!best){node.hidden=true;continue}
   node.style.left=best.x+'px';node.style.top=best.y+'px';
   boxes.push({x:best.x,y:best.y,w:width,h:height});
   if(Math.hypot(best.x-ax,best.y-ay)>23){
    const link=document.createElementNS(NS,'path');
    link.setAttribute('d','M'+p.x+' '+p.y+' L'+
     ((best.x-x)/scale)+' '+((best.y-y)/scale));
    links.append(link);
   }
  }
 }
 function resetSelection(){
  focusedDistrict=null;selectedId=null;
  if(open)renderList();
 }
 return Object.freeze({position,focusDistrict,focusPlace,togglePanel,resetSelection,
  count:()=>({districts:districts.length,places:pins.length,
   visible:pins.filter(p=>!p.node.hidden).length})});
}
root.PaperWorldCityMapOverlay=Object.freeze({create});
})(window);
