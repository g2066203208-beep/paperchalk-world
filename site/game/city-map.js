/* Diegetic city route map for the heroine's phone.
 * Actual travel costs come from the daily-life engine; the drawn streets are
 * a readable schematic, not a claim of measured geographic distance.
 */
(function(root){
 'use strict';
 const LOC=[
  {id:'entrance',name:'家',x:18,y:75,area:'住宅区'},
  {id:'school',name:'学校',x:39,y:22,area:'文教区'},
  {id:'convenience',name:'便利店',x:58,y:48,area:'街区'},
  {id:'cafe',name:'咖啡店',x:31,y:88,area:'商业街'},
  {id:'mall',name:'商场',x:84,y:23,area:'商业中心'},
  {id:'park',name:'公园',x:81,y:78,area:'社区'}
 ];
 function element(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;
  if(txt!==undefined)e.textContent=String(txt);return e;}
 function cost(from,to,locations){
  if(locations[from].group==='家'&&locations[to].group==='家')return 10;
  return locations[to].group==='家'?locations[from].travel:locations[to].travel;
 }
 function isOpen(loc,cal,minute){
  return (!loc.weekdaysOnly||(cal.weekday!==0&&cal.weekday!==6))&&
   minute>=loc.open&&minute<loc.close;
 }
 function show(copy,data,onTravel,onClose){
  copy.replaceChildren();
  const current=data.state.location,clock=data.state.minute,locations=data.locations;
  const selected={id:null};
  const head=element('div','city-map-heading');
  head.append(element('strong','', '城市地图'),element('small','',data.state.calendar.time+' · '+locations[current].label));
  copy.appendChild(head);
  const canvas=element('div','city-route-canvas');
  canvas.setAttribute('aria-label','城市地理示意图，可点击地点标记');
  canvas.innerHTML='<svg viewBox="0 0 240 270" preserveAspectRatio="none" aria-hidden="true" focusable="false">'+
   '<rect width="240" height="270" fill="#29363a"/>'+
   '<path d="M-20 40L267 40M-20 125L267 125M-20 212L267 212M40 -20V290M128 -20V290M213 -20V290" stroke="#61757a" stroke-width="15"/>'+
   '<path d="M-20 40L267 40M-20 125L267 125M-20 212L267 212M40 -20V290M128 -20V290M213 -20V290" stroke="#a2afb0" stroke-opacity=".58" stroke-width="1.4" stroke-dasharray="7 5"/>'+
   '<path d="M25 27L212 234M53 260L207 32" stroke="#657778" stroke-width="8"/>'+
   '<path d="M25 27L212 234M53 260L207 32" stroke="#a2afb0" stroke-opacity=".32" stroke-width="1" stroke-dasharray="6 5"/>'+
   '<rect x="51" y="55" width="66" height="60" rx="4" fill="#46595b"/>'+
   '<rect x="143" y="135" width="57" height="62" rx="4" fill="#53676b"/>'+
   '<rect x="52" y="144" width="59" height="55" rx="3" fill="#4d6165"/>'+
   '<path d="M150 203q51-48 80 8v37h-80z" fill="#536f62"/>'+
   '<path d="M13 224q30-21 54 2v35H13z" fill="#526c61"/>'+
   '<rect x="139" y="52" width="70" height="59" rx="2" fill="#4c5c5f"/>'+
   '<path d="M110 122h20v52h-20z" fill="#354d51"/>'+
   '<path d="M65 1h60v20H65z" fill="#607578"/>'+
   '</svg>';
  const info=element('p','city-map-instruction','点击地点查看路程与时间');
  for(const pin of LOC){
   const destination=locations[pin.id];if(!destination)continue;
   const button=element('button','city-route-pin',pin.name);
   button.type='button';button.dataset.place=pin.id;
   button.style.left=pin.x+'%';button.style.top=pin.y+'%';
   if(current===pin.id)button.dataset.current='true';
   const open=isOpen(destination,data.state.calendar,clock);
   const blocked=(locations[current].group==='家'&&destination.group==='城区'&&current!=='entrance')||
    (locations[current].group==='城区'&&destination.group==='家'&&pin.id!=='entrance');
   button.disabled=!open||blocked||current===pin.id;
   button.title=current===pin.id?'当前位置':!open?'当前未开放':blocked?'需先经过玄关':'前往'+destination.label;
   button.addEventListener('click',()=>{
    selected.id=pin.id;
    canvas.querySelectorAll('.city-route-pin').forEach(e=>e.dataset.selected=String(e.dataset.place===pin.id));
    info.textContent=destination.label+' · 约'+cost(current,pin.id,locations)+'分钟';
    depart.hidden=false;
    depart.disabled=false;
    depart.textContent='前往 '+destination.label;
   });
   canvas.appendChild(button);
  }
  copy.appendChild(canvas);
  const foot=element('div','city-route-footer');
  foot.appendChild(info);
  const depart=element('button','city-route-depart','选择目的地');
  depart.type='button';depart.hidden=true;
  depart.addEventListener('click',async()=>{
   if(!selected.id)return;
   depart.disabled=true;depart.textContent='正在出发…';
   const result=await onTravel(selected.id);
   if(result?.ok)onClose?.();
   else{info.textContent=result?.reason||'现在无法前往';depart.textContent='重试';depart.disabled=false;}
  });
  foot.appendChild(depart);copy.appendChild(foot);
  const tip=element('small','city-map-caption','路线示意图 · 移动会消耗游戏时间');
  copy.appendChild(tip);
 }
 root.PaperWorldCityMap=Object.freeze({LOC,show});
})(window);
