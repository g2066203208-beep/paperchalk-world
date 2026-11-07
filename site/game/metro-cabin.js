/* Side-on 2.5D passenger carriage. Fixed camera perpendicular to one long
 * seat row, so all passenger portraits are the canonical FRONT L2D.
 * All travel, stations and the 22:00 anomaly remain fully stateful. */
(function(global){
'use strict';
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function create({root,engine,onExit,onFeedback}){
 const metro=global.PaperWorldMetro;
 if(!root||!metro||!engine)return null;
 const section=document.createElement('section');
 section.id='pw-metro-cabin';section.hidden=true;
 section.setAttribute('role','dialog');section.setAttribute('aria-label','正在乘坐的地铁车厢');
 section.setAttribute('data-ui-fog-edge','bottom');
 section.dataset.camera='side-elevation';
 section.innerHTML='<canvas class="pw-cabin-canvas" aria-label="地铁车厢纯侧面背景"></canvas>'+
  '<div class="pw-cabin-live-actors" aria-label="对面座位上的 Live2D 乘客"></div>'+
  '<canvas class="pw-cabin-foreground" aria-hidden="true"></canvas>'+
  '<div class="pw-cabin-top"><span class="pw-cabin-line"></span><span class="pw-cabin-clock"></span></div>'+
  '<div class="pw-cabin-station"><small>下一站</small><strong></strong></div>'+

  '<div class="pw-cabin-actions"></div>'+
  '<div class="pw-cabin-anomaly" hidden><strong>末班车</strong><p>车厢里的报站声突然停了。</p></div>';
 root.append(section);
 const canvas=section.querySelector('.pw-cabin-canvas'),ctx=canvas.getContext('2d',{alpha:false});
 const foreground=section.querySelector('.pw-cabin-foreground');
 const fg=foreground.getContext('2d',{alpha:true});
 const actorsLayer=section.querySelector('.pw-cabin-live-actors');
 // Every seat accepts the real authored front L2D renderer. No synthetic
 // human silhouettes, no auto-painted seated/side-profile character variants.
 const liveSeats=[];
 for(const [i,seat] of (global.PaperWorldMetroSideRenderer?.SEATS||[]).entries()){
   const holder=document.createElement('div');
   holder.className='pw-cabin-l2d-seat';holder.dataset.seat=seat.id;
   holder.dataset.l2dActor='metro-seat-'+(i+1);
   holder.setAttribute('aria-label','正面 L2D 座位 '+(i+1));
   holder.hidden=true;
   holder.style.left=(seat.x*100)+'%';
   holder.style.setProperty('--metro-seat-x',(seat.x*100)+'%');
   const img=document.createElement('img');
   img.setAttribute('data-l2d-image','');
   img.alt='';img.draggable=false;
   const cv=document.createElement('canvas');
   cv.setAttribute('data-l2d-canvas','');
   cv.width=1024;cv.height=1024;
   holder.append(img,cv);actorsLayer.appendChild(holder);
   liveSeats.push({id:holder.dataset.l2dActor,holder,img,canvas:cv});
 }
 let seatsPopulated=false,seatLoading=false,seatTry=0;
 const lineLabel=section.querySelector('.pw-cabin-line');
 const clock=section.querySelector('.pw-cabin-clock');
 const nextLabel=section.querySelector('.pw-cabin-station strong');
 const actions=section.querySelector('.pw-cabin-actions');
 const anomaly=section.querySelector('.pw-cabin-anomaly');
 let raf=0,last=0,visible=false,auto=false,frame=0,anomalyEventSent=false;
 let regionalRide=null;
 const btn=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);return b};
 // A single FRONT-facing side-elevation canvas. Never project train depth
 // toward a vanishing point or transform an existing character portrait.
 function render(time){
  if(!visible||section.hidden)return;
  raf=requestAnimationFrame(render);
  if(time-last<40)return;last=time;frame++;
  if(section.dataset.renderer==='ring-3d')return;
  const rect=canvas.getBoundingClientRect();
  const w=Math.max(280,Math.round(rect.width));
  const h=Math.max(130,Math.round(rect.height));
  const dpr=Math.min(2,global.devicePixelRatio||1);
  const cw=Math.round(w*dpr),ch=Math.round(h*dpr);
  if(canvas.width!==cw||canvas.height!==ch){
   canvas.width=cw;canvas.height=ch;
   foreground.width=cw;foreground.height=ch;
  }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  fg.setTransform(dpr,0,0,dpr,0,0);
  const anomaly=engine.snapshot().metro?.anomaly===true;
  const painter=global.PaperWorldMetroSideRenderer;
  if(painter){
   painter.drawBackground(ctx,w,h,time,anomaly);
   painter.drawForeground(fg,w,h,anomaly);
  }
 }
 async function populatePassengers(){
  if(seatsPopulated||seatLoading||!visible)return;
  const dev=global.PaperchalkCharacterDev;
  if(!dev?.ready||typeof dev.assign!=='function'){
   if(++seatTry<12)global.setTimeout(populatePassengers,450);
   return;
  }
  seatLoading=true;
  try{
   const catalog=dev.characters||[];
   // Select actual playable authored front rigs only. Never create a fake
   // avatar or draw a full-body standing character directly into the wall.
   const preferred=['char-002','char-004','char-003','char-006'];
   const picks=preferred.map(id=>catalog.find(c=>c.id===id&&c.front)).filter(Boolean);
   if(!picks.length){
    seatsPopulated=true;return; // empty carriage is preferable to fake people
   }
   const targets=[liveSeats[1],liveSeats[2],liveSeats[0],liveSeats[3]];
   for(let i=0;i<Math.min(targets.length,picks.length);i++){
    const seat=targets[i],model=picks[i];if(!seat)continue;
    for(let attempt=0;attempt<6&&!global.PaperchalkL2D?.get?.(seat.id);attempt++)
     await new Promise(resolve=>global.setTimeout(resolve,80));
    if(!global.PaperchalkL2D?.get?.(seat.id))continue;
    try{
     await dev.assign(seat.id,model.id,'front',false);
     seat.holder.hidden=false;
     seat.holder.dataset.character=model.id;
    }catch(error){
     seat.holder.hidden=true;
     console.warn('[Metro front L2D] Authentic source unavailable:',model.id,error);
    }
   }
   seatsPopulated=true;
  }finally{seatLoading=false}
 }
 function refresh(){
  if(regionalRide){
   const atlas=global.PaperWorldAtlas;
   const s=engine.snapshot(),leg=regionalRide.legs[regionalRide.index];
   const dest=atlas?.CITY_BY_ID?.[leg.to];
   lineLabel.textContent=leg.line.name+' · '+(atlas?.SERVICE_LABELS?.[leg.line.mode]||'铁路');
   lineLabel.style.borderLeftColor=leg.line.color||'#8fbab8';
   clock.textContent=s.calendar.time;
   nextLabel.textContent=dest?.name||leg.to;
   anomaly.hidden=true;section.dataset.night='false';
   actions.replaceChildren();
   return;
  }
  const s=engine.snapshot(),ride=s.metro||{};
  if(!ride.onboard){close();return}
  const line=metro.getLine(ride.lineId);
  if(!line){close();return}
  const station=metro.STATIONS[ride.station],next=metro.nextStop(line.id,ride.station,ride.direction);
  lineLabel.textContent=line.name+' · '+(ride.direction===1?'去程':'返程');
  lineLabel.style.borderLeftColor=line.color;
  clock.textContent=s.calendar.time;
  nextLabel.textContent=ride.anomaly?'？？？':next?metro.STATIONS[next].label:'终点站';
  anomaly.hidden=!ride.anomaly;
  if(ride.anomaly){
    actions.replaceChildren();
    section.dataset.night='true';
    if(section.dataset.renderer==='ring-3d')global.PaperWorldGameRingArena?.setLighting?.('flicker');
    if(!anomalyEventSent){
      anomalyEventSent=true;
      global.dispatchEvent(new CustomEvent('paperchalk:metro-night-entry',{
        detail:{station:ride.station,lineId:ride.lineId,day:s.day}
      }));
    }
    return;
  }
  section.dataset.night='false';
  if(section.dataset.renderer==='ring-3d')global.PaperWorldGameRingArena?.setLighting?.('on');
  actions.replaceChildren();
  if(next)actions.append(btn('继续乘坐 · 下一站',()=>{
    if(auto)return;
    const result=engine.metroNext();
    if(!result.ok){onFeedback?.(result.reason);return}
    refresh();
  }));
  if(!next)actions.append(btn('终点站 · 请下车',()=>exit()));
  actions.append(btn('下车',()=>exit()));
  if(!line.ring&&next)actions.append(btn('坐到终点',async()=>{
    if(auto)return;auto=true;
    for(let i=0;i<16;i++){
      const state=engine.snapshot().metro;
      if(!metro.nextStop(state.lineId,state.station,state.direction))break;
      const result=engine.metroNext();

      refresh();
      if(result.anomaly||!result.ok)break;
      await new Promise(resolve=>setTimeout(resolve,360));
    }
    auto=false;refresh();
  }));
  if(line.ring)actions.append(btn('一直坐到22:00',()=>{
    if(auto)return;
    const result=engine.metroRideToNight();
    if(!result.ok){onFeedback?.(result.reason);return}
    refresh();
  }));
  const connections=metro.boardingChoices(ride.station).filter(v=>v.id!==ride.lineId);
  for(const other of connections){
    actions.append(btn('换乘'+other.name,()=>{
      const list=document.createElement('div');list.className='pw-cabin-connection';
      for(const dir of other.directions)list.append(btn(dir.label,()=>{
        const result=engine.metroSwitch(other.id,dir.direction);
        if(!result.ok)onFeedback?.(result.reason);
        else{refresh()}
      }));
      actions.replaceChildren(list);
    }));
  }
 }
 async function exit(){
  if(auto)return;
  const result=engine.metroExit();
  if(!result.ok){onFeedback?.(result.reason);return}
  close();await onExit?.(result.station);
 }
 function open(){
  const ride=engine.snapshot().metro;
  if(!ride?.onboard)return false;
  visible=true;section.hidden=false;anomalyEventSent=false;
  section.dataset.renderer=global.PaperWorldGameRingArena?.enterTransit?.()===true?'ring-3d':'painted';
  if(section.dataset.renderer!=='ring-3d')
  populatePassengers().catch(error=>console.warn('[Metro L2D]',error));
  if(!raf)raf=requestAnimationFrame(render);
  refresh();return true;
 }
 function close(){
  visible=false;section.hidden=true;
  if(section.dataset.renderer==='ring-3d')global.PaperWorldGameRingArena?.exitTransit?.();
  section.dataset.renderer='painted';
  if(raf)cancelAnimationFrame(raf);raf=0;
 }
 // Regional rail shares the existing side-on 2.5D carriage and authentic
 // L2D seats, without mutating the separate urban-subway boarding state.
 async function playRegionalJourney(route){
  if(!route?.legs?.length)return {ok:false,reason:'没有城际铁路行程'};
  if(visible||auto)return {ok:false,reason:'列车正在行驶'};
  regionalRide={legs:route.legs,index:0};
  visible=true;section.hidden=false;anomalyEventSent=false;auto=true;
  section.dataset.renderer=global.PaperWorldGameRingArena?.enterTransit?.()===true?'ring-3d':'painted';
  if(section.dataset.renderer!=='ring-3d')
  populatePassengers().catch(error=>console.warn('[Regional rail L2D]',error));
  if(!raf)raf=requestAnimationFrame(render);
  try{
   for(let i=0;i<route.legs.length;i++){
    regionalRide.index=i;refresh();
    await new Promise(resolve=>global.setTimeout(resolve,1600));
   }
   return {ok:true};
  }finally{
   auto=false;regionalRide=null;close();
  }
 }
 // Directly choosing a destination uses the same actual rolling train.
 // Auto travel never teleports the player or creates a second fake carriage.
 async function playRoute(route){
  if(!route?.segments?.length)return {ok:false,reason:'这段行程不需要地铁'};
  if(!engine.snapshot().metro?.onboard)return {ok:false,reason:'尚未登车'};
  if(auto)return {ok:false,reason:'列车正在行驶'};
  open();auto=true;
  try{
   for(const seg of route.segments){
    let ride=engine.snapshot().metro;
    if(ride.anomaly)return {ok:true,anomaly:true};
    if(ride.station!==seg.from)
     return {ok:false,reason:'列车站点和路径不一致'};
    const direction=metro.neighbors(seg.line,seg.from).find(n=>n.to===seg.to)?.direction;
    if(!direction)return {ok:false,reason:'线路方向不正确'};
    if(ride.lineId!==seg.line.id||ride.direction!==direction){
      const transfer=engine.metroSwitch(seg.line.id,direction);
      if(!transfer.ok)return transfer;
      refresh();
      await new Promise(resolve=>setTimeout(resolve,550));
    }
    const next=engine.metroNext();
    if(!next.ok)return next;
    refresh();
    if(next.anomaly)return next;
    await new Promise(resolve=>setTimeout(resolve,550));
   }
   const result=engine.metroExit();
   if(!result.ok)return result;
   await onExit?.(result.station);
   return result;
  }finally{
   auto=false;
   if(!engine.snapshot().metro?.onboard)close();
   else refresh();
  }
 }
 return Object.freeze({open,close,refresh,playRoute,playRegionalJourney,isOpen:()=>visible});
}
global.PaperWorldMetroCabin=Object.freeze({create});
})(window);
