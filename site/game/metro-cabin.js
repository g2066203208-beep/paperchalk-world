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
 // Developer-only NPC-G001 emotion comparison. Normal metro remains unchanged.
 // Inputs can be original white-background Anima PNGs: the outer paper is
 // stripped for display without touching or overwriting the uploaded artwork.
 section.insertAdjacentHTML('beforeend',
  '<section class="pw-npc-qa" hidden aria-label="NPC三人组情绪地铁对比">'+
  '<div class="pw-npc-qa-stage" aria-live="off">'+
  '<img class="pw-npc-qa-joy" alt="喜悦三人组">'+
  '<img class="pw-npc-qa-surprise" alt="惊讶三人组"></div>'+
  '<div class="pw-npc-qa-controls">'+
  '<strong>NPC-G001 · 地铁情绪对比</strong>'+
  '<button type="button" data-npc-pose="joy">喜悦</button>'+
  '<button type="button" data-npc-pose="surprise">惊讶</button>'+
  '<button type="button" data-npc-pose="both">并排</button>'+
  '<label>大小 <input data-npc-scale type="range" min="42" max="80" value="64"></label>'+
  '<label class="pw-npc-file">喜悦原图 <input type="file" data-npc-input="joy" accept="image/png,image/jpeg,image/webp"></label>'+
  '<label class="pw-npc-file">惊讶原图 <input type="file" data-npc-input="surprise" accept="image/png,image/jpeg,image/webp"></label>'+
  '<button type="button" data-npc-pose="exit">退出对比</button>'+
  '<small class="pw-npc-qa-note">开发预览：复用实际地铁车厢背景与摄像机；当前人物为屏幕上的透视比例测试，非正式3D演员。</small>'+
  '</div></section>');
 root.append(section);
 const canvas=section.querySelector('.pw-cabin-canvas'),ctx=canvas.getContext('2d',{alpha:false});
 const foreground=section.querySelector('.pw-cabin-foreground');
 const fg=foreground.getContext('2d',{alpha:true});
 const actorsLayer=section.querySelector('.pw-cabin-live-actors');
 const qa=section.querySelector('.pw-npc-qa');
 const qaImages={joy:qa.querySelector('.pw-npc-qa-joy'),
  surprise:qa.querySelector('.pw-npc-qa-surprise')};
 let qaActive=false,qaPose='joy';
 // Outer-area flood fill preserves white shirt regions inside the blazer.
 function extractPaper(image){
  const imageWidth=image.naturalWidth||image.width;
  const imageHeight=image.naturalHeight||image.height;
  const size=768,side=Math.max(imageWidth,imageHeight);
  const cv=document.createElement('canvas');cv.width=size;cv.height=size;
  const c=cv.getContext('2d',{willReadFrequently:true});if(!c)return image.src;
  c.drawImage(image,(size-imageWidth*size/side)/2,
   (size-imageHeight*size/side)/2,
   imageWidth*size/side,imageHeight*size/side);
  const frame=c.getImageData(0,0,size,size),p=frame.data;
  const visited=new Uint8Array(size*size),stack=new Int32Array(size*size);
  let count=0;
  const blank=i=>p[i*4]>228&&p[i*4+1]>228&&p[i*4+2]>228&&
   Math.max(p[i*4],p[i*4+1],p[i*4+2])-Math.min(p[i*4],p[i*4+1],p[i*4+2])<24;
  const push=i=>{if(i<0||i>=visited.length||visited[i]||!blank(i))return;
    visited[i]=1;stack[count++]=i};
  for(let x=0;x<size;x++){push(x);push((size-1)*size+x)}
  for(let y=0;y<size;y++){push(y*size);push(y*size+size-1)}
  while(count){
   const a=stack[--count],x=a%size,y=Math.floor(a/size);
   p[a*4+3]=0;
   if(x>0)push(a-1);if(x<size-1)push(a+1);
   if(y>0)push(a-size);if(y<size-1)push(a+size);
  }
  c.putImageData(frame,0,0);return cv.toDataURL('image/png');
 }
 // Two approved-reference thumbnails are committed in ONE AVIF preview asset.
 // They auto-load without a file chooser; local PNG files override them at full resolution.
 let previewAssetStatus='idle';
 function loadDefaultNpcArt(){
  if(previewAssetStatus!=='idle')return;
  previewAssetStatus='loading';
  const source=new Image();source.decoding='async';
  const note=qa.querySelector('.pw-npc-qa-note');
  source.onload=()=>{
   const cell=source.naturalHeight;
   if(!cell||source.naturalWidth!==cell*2){
    previewAssetStatus='error';if(note)note.textContent='预览图尺寸错误，请选择本地原图';return;
   }
   for(const [i,pose] of ['joy','surprise'].entries()){
    if(qaImages[pose].dataset.overridden==='true')continue;
    const cut=document.createElement('canvas');cut.width=cell;cut.height=cell;
    const ctx=cut.getContext('2d',{alpha:true});
    if(!ctx)continue;
    ctx.drawImage(source,i*cell,0,cell,cell,0,0,cell,cell);
    qaImages[pose].src=extractPaper(cut);
   }
   previewAssetStatus='ready';
   if(note)note.textContent='两组NPC已从GitHub自动加载（192px快速预览）。可点下方文件选择框替换为高清原图。';
  };
  source.onerror=()=>{
   previewAssetStatus='error';
   if(note)note.textContent='自动素材加载失败；请刷新或手动选取两张原始PNG';
  };
  source.src='./assets/characters/npc-g001/emotion-joy-surprise-preview.avif?v=source-20261108';
 }
 function showQaPose(pose){
  qaPose=pose==='surprise'||pose==='both'?pose:'joy';
  qa.dataset.pose=qaPose;
  for(const button of qa.querySelectorAll('[data-npc-pose]')){
   if(button.dataset.npcPose!=='exit')
    button.setAttribute('aria-pressed',String(button.dataset.npcPose===qaPose));
  }
  return qaPose;
 }
 for(const input of qa.querySelectorAll('[data-npc-input]')){
  input.addEventListener('change',()=>{
   const file=input.files?.[0];if(!file)return;
   const pose=input.dataset.npcInput,url=URL.createObjectURL(file),img=new Image();
   img.onload=()=>{try{qaImages[pose].dataset.overridden='true';qaImages[pose].src=extractPaper(img)}
    finally{URL.revokeObjectURL(url)}showQaPose(pose)};
   img.onerror=()=>URL.revokeObjectURL(url);img.src=url;
  });
 }
 for(const button of qa.querySelectorAll('[data-npc-pose]')){
  button.addEventListener('click',()=>{
   const pose=button.dataset.npcPose;
   if(pose==='exit'){close();return}
   showQaPose(pose);
  });
 }
 qa.querySelector('[data-npc-scale]').addEventListener('input',event=>{
  qa.style.setProperty('--npc-qa-height',event.target.value+'%');
 });

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
 const motion=global.PaperWorldMetroMotion?.create?.()||null;
 const journeyTime=global.PaperWorldMetroMotion?.DURATION_MS||9000;
 const platformDwellMs=2250; // people can leave and board before departure
 let rideEpoch=0,doorSequence=0;
 const door={open:0,start:0,from:0,target:0,duration:900,moving:false};
 let doorReadyAt=0;
 const delay=ms=>new Promise(resolve=>global.setTimeout(resolve,ms));
 const ease=x=>{const t=clamp(x,0,1);return t*t*(3-2*t)};
 function sampleDoors(time=global.performance.now()){
  if(door.moving){
   const progress=clamp((time-door.start)/door.duration,0,1);
   door.open=door.from+(door.target-door.from)*ease(progress);
   if(progress>=1){
    door.open=door.target;door.moving=false;
    if(door.open>.995)doorReadyAt=time;
   }
  }
  if(section.dataset.renderer==='ring-3d')
   global.PaperWorldGameRingArena?.setTransitDoorOpen?.(door.open,false);
  section.dataset.doorState=door.moving?'moving':door.open>.995?'open':'closed';
  return door.open;
 }
 async function animateDoors(target,duration=900){
  if(!visible)return false;
  if(section.dataset.renderer!=='ring-3d'){
   await delay(350);return visible;
  }
  sampleDoors();
  const sequence=++doorSequence,epoch=rideEpoch;
  door.from=door.open;door.target=clamp(target,0,1);
  door.start=global.performance.now();
  door.duration=Math.max(80,duration);
  door.moving=Math.abs(door.target-door.from)>.005;
  if(!door.moving)return true;
  await delay(door.duration+65);
  if(!visible||rideEpoch!==epoch||doorSequence!==sequence)return false;
  door.open=door.target;door.moving=false;
  if(door.open>.995)doorReadyAt=global.performance.now();
  sampleDoors();
  return true;
 }
 // Train's camera, floor, walls and actor positions never translate.
 // Only the scenery OUTSIDE the glass is animated by travelled distance.
 async function animateRailLeg(){
  if(!visible)return false;
  if(section.dataset.renderer!=='ring-3d'||!motion){
   await delay(650);return visible;
  }
  if(motion.isMoving())return false;
  const epoch=rideEpoch;
  // Arrivals must allow real travellers time to cross. If the player
  // presses Continue early, wait for door-open animation plus a short
  // minimum dwell; never close onto a boarding commuter.
  if(door.moving&&door.target>.99){
   await delay(Math.max(0,door.duration-(global.performance.now()-door.start))+70);
  }
  sampleDoors();
  if(door.open>.1&&doorReadyAt){
   const minPassengerDwellMs=1350;
   const remaining=minPassengerDwellMs-(global.performance.now()-doorReadyAt);
   if(remaining>0)await delay(remaining);
  }
  if(!visible||rideEpoch!==epoch)return false;
  // The train physically cannot depart while either door leaf is open.
  if(!await animateDoors(0,930))return false;
  if(!visible||epoch!==rideEpoch)return false;
  motion.begin(global.performance.now());
  section.dataset.trainMoving='true';
  section.dataset.travelPhase='departing';
  actions.replaceChildren();
  global.PaperWorldGameRingArena?.setTransitDynamics?.(motion.snapshot());
  await delay(journeyTime+55);
  if(!visible||epoch!==rideEpoch)return false;
  const arrival=motion.snapshot(global.performance.now()+10);
  global.PaperWorldGameRingArena?.setTransitDynamics?.(arrival);
  section.dataset.trainMoving='false';
  section.dataset.travelPhase='docked';
  // Open all four physical metal leaves after the wheel speed reaches 0.
  if(!await animateDoors(1,1050))return false;
  return true;
 }
 async function advanceOneStation(){
  if(auto)return;
  auto=true;
  try{
   if(!await animateRailLeg())return;
   const result=engine.metroNext();
   if(!result.ok){onFeedback?.(result.reason);return}
   refresh();
  }finally{auto=false}
 }
 const btn=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);return b};
 // A single FRONT-facing side-elevation canvas. Never project train depth
 // toward a vanishing point or transform an existing character portrait.
 function render(time){
  if(!visible||section.hidden)return;
  raf=requestAnimationFrame(render);
  const threeD=section.dataset.renderer==='ring-3d';
  // One RAF owner. Stationary coach at 12fps, in-motion exterior at ~30fps.
  const interval=threeD?(motion?.isMoving()||door.moving?33:82):40;
  if(time-last<interval)return;last=time;frame++;
  if(threeD){
   sampleDoors(time);
   const stage=motion?.snapshot(time);
   if(stage){
    section.dataset.travelPhase=stage.phase;
    global.PaperWorldGameRingArena?.setTransitDynamics?.(stage);
   }
   global.PaperWorldGameRingArena?.render?.(0);
   return;
  }
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
  if(qaActive){
   lineLabel.textContent='地铁 · 三人NPC情绪预览';
   clock.textContent='开发对比';
   nextLabel.textContent='站内观察';
   anomaly.hidden=true;section.dataset.night='false';
   actions.replaceChildren();
   return;
  }
  if(regionalRide){
   const atlas=global.PaperWorldAtlas;
   const s=engine.snapshot(),leg=regionalRide.legs[regionalRide.index];
   const dest=atlas?.CITY_BY_ID?.[leg.to];
   lineLabel.textContent=leg.line.name+' · '+(atlas?.SERVICE_LABELS?.[leg.line.mode]||'铁路');
   lineLabel.style.borderLeftColor=leg.line.color||'#8fbab8';
   clock.textContent=s.calendar.time;
   nextLabel.textContent=dest?.name||leg.to;
   anomaly.hidden=true;section.dataset.night='false';
   if(section.dataset.renderer==='ring-3d'&&!motion?.isMoving())
    global.PaperWorldGameRingArena?.setPlatformExposure?.(.82);
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
    if(section.dataset.renderer==='ring-3d'){
     global.PaperWorldGameRingArena?.setPlatformExposure?.(0);
     global.PaperWorldGameRingArena?.setLighting?.('flicker');
    }
    if(!anomalyEventSent){
      anomalyEventSent=true;
      global.dispatchEvent(new CustomEvent('paperchalk:metro-night-entry',{
        detail:{station:ride.station,lineId:ride.lineId,day:s.day}
      }));
    }
    return;
  }
  section.dataset.night='false';
  if(section.dataset.renderer==='ring-3d'&&!motion?.isMoving()){
   global.PaperWorldGameRingArena?.setPlatformExposure?.(1);
   global.PaperWorldGameRingArena?.setLighting?.('on');
  }
  actions.replaceChildren();
  if(next)actions.append(btn('继续乘坐 · 下一站',()=>{
   advanceOneStation().catch(error=>{
    auto=false;console.error('[Metro motion]',error);
    onFeedback?.('列车运行异常，请重试');refresh();
   });
  }));
  if(!next)actions.append(btn('终点站 · 请下车',()=>exit()));
  actions.append(btn('下车',()=>exit()));
  if(!line.ring&&next)actions.append(btn('坐到终点',async()=>{
    if(auto)return;auto=true;
    try{
    for(let i=0;i<16;i++){
     const state=engine.snapshot().metro;
     if(!metro.nextStop(state.lineId,state.station,state.direction))break;
     if(!await animateRailLeg())break;
     const result=engine.metroNext();
     refresh();
     if(result.anomaly||!result.ok)break;
     await delay(platformDwellMs);
    }
   }finally{auto=false;refresh()}
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
 function openNpcComparison(){
  if(visible||auto)return false;
  qaActive=true;visible=true;section.hidden=false;qa.hidden=false;
  rideEpoch++;motion?.reset();
  section.dataset.trainMoving='false';section.dataset.travelPhase='docked';
  section.dataset.renderer=global.PaperWorldGameRingArena?.enterTransit?.()===true?'ring-3d':'painted';
  section.dataset.camera=section.dataset.renderer==='ring-3d'?'front-elevation-no-floor':'side-elevation';
  if(!raf)raf=requestAnimationFrame(render);
  loadDefaultNpcArt();showQaPose('both');refresh();
  return true;
 }
 function open(){
  const ride=engine.snapshot().metro;
  if(!ride?.onboard)return false;
  visible=true;section.hidden=false;anomalyEventSent=false;
  rideEpoch++;doorSequence++;motion?.reset();
  door.open=0;door.from=0;door.target=0;door.moving=false;doorReadyAt=0;
  section.dataset.doorState='closed';
  section.dataset.trainMoving='false';section.dataset.travelPhase='docked';
  section.dataset.renderer=global.PaperWorldGameRingArena?.enterTransit?.()===true?'ring-3d':'painted';
  section.dataset.camera=section.dataset.renderer==='ring-3d'?'front-elevation-no-floor':'side-elevation';
  if(section.dataset.renderer!=='ring-3d')
  populatePassengers().catch(error=>console.warn('[Metro L2D]',error));
  if(!raf)raf=requestAnimationFrame(render);
  refresh();
  animateDoors(1,980).catch(error=>console.warn('[Metro station doors]',error));
  return true;
 }
 function close(){
  qaActive=false;qa.hidden=true;
  visible=false;section.hidden=true;rideEpoch++;doorSequence++;
  door.open=0;door.target=0;door.moving=false;doorReadyAt=0;
  section.dataset.doorState='closed';
  motion?.reset();
  section.dataset.trainMoving='false';section.dataset.travelPhase='docked';
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
  rideEpoch++;doorSequence++;motion?.reset();
  door.open=0;door.from=0;door.target=0;door.moving=false;doorReadyAt=0;
  section.dataset.doorState='closed';
  section.dataset.trainMoving='false';section.dataset.travelPhase='docked';
  section.dataset.renderer=global.PaperWorldGameRingArena?.enterTransit?.()===true?'ring-3d':'painted';
  section.dataset.camera=section.dataset.renderer==='ring-3d'?'front-elevation-no-floor':'side-elevation';
  if(section.dataset.renderer!=='ring-3d')
  populatePassengers().catch(error=>console.warn('[Regional rail L2D]',error));
  if(!raf)raf=requestAnimationFrame(render);
  animateDoors(1,980).catch(error=>console.warn('[Regional rail doors]',error));
  try{
   for(let i=0;i<route.legs.length;i++){
    regionalRide.index=i;refresh();
    if(!await animateRailLeg())break;
    await delay(platformDwellMs);
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
  if(!visible)open();
  auto=true;
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
    if(!await animateRailLeg())return {ok:false,reason:'列车行程已取消'};
    const next=engine.metroNext();
    if(!next.ok)return next;
    refresh();
    if(next.anomaly)return next;
    await delay(platformDwellMs);
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
 return Object.freeze({open,openNpcComparison,showQaPose,close,refresh,playRoute,playRegionalJourney,isOpen:()=>visible});
}
global.PaperWorldMetroCabin=Object.freeze({create});
})(window);
