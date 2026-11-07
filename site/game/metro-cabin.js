/* Procedurally projected 3D carriage. No pre-rendered train backdrop.
   Geometry is defined in metres, projected by a pinhole camera, shaded in
   depth order, and animated while the train is in motion. */
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
 section.innerHTML='<canvas class="pw-cabin-canvas" aria-label="程序化三维车厢"></canvas>'+
  '<div class="pw-cabin-top"><span class="pw-cabin-line"></span><span class="pw-cabin-clock"></span></div>'+
  '<div class="pw-cabin-station"><small>下一站</small><strong></strong></div>'+
  '<div class="pw-cabin-speech"><span class="pw-cabin-person"></span><p class="pw-cabin-words"></p></div>'+
  '<div class="pw-cabin-actions"></div>'+
  '<div class="pw-cabin-anomaly" hidden><strong>末班车</strong><p>车厢里的报站声突然停了。</p></div>';
 root.append(section);
 const canvas=section.querySelector('canvas'),ctx=canvas.getContext('2d',{alpha:false});
 const lineLabel=section.querySelector('.pw-cabin-line');
 const clock=section.querySelector('.pw-cabin-clock');
 const nextLabel=section.querySelector('.pw-cabin-station strong');
 const words=section.querySelector('.pw-cabin-words');
 const person=section.querySelector('.pw-cabin-person');
 const actions=section.querySelector('.pw-cabin-actions');
 const anomaly=section.querySelector('.pw-cabin-anomaly');
 let raf=0,last=0,visible=false,speakerIndex=0,auto=false,frame=0,anomalyEventSent=false;
 const btn=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);return b};
 // Camera and meshes are independent of viewport size. No CSS fake-car box.
 function render(time){
  if(!visible||section.hidden)return;
  raf=requestAnimationFrame(render);
  if(time-last<38)return;last=time;frame++;
  const rect=canvas.getBoundingClientRect();
  const w=Math.max(280,Math.round(rect.width)),h=Math.max(130,Math.round(rect.height));
  const dpr=Math.min(2,global.devicePixelRatio||1);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){
   canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const s=engine.snapshot(),ride=s.metro||{},isDark=!!ride.anomaly;
  const t=time*.001,camX=Math.sin(t*1.75)*.018,camY=1.48+Math.sin(t*2.5)*.012;
  const F=h*1.67,baseY=h*.61;
  const project=(x,y,z)=>{
    const zc=Math.max(.2,5.1-z);
    return [w*.5+(x-camX)*F/zc,baseY-(y-camY)*F/zc];
  };
  const fillQuad=(p,color,stroke)=>{
    const a=p.map(v=>project(...v));
    ctx.beginPath();ctx.moveTo(...a[0]);
    for(let i=1;i<a.length;i++)ctx.lineTo(...a[i]);
    ctx.closePath();ctx.fillStyle=color;ctx.fill();
    if(stroke){ctx.lineWidth=.7;ctx.strokeStyle=stroke;ctx.stroke()}
  };
  const beam=(a,b,width,color)=>{
    const pa=project(...a),pb=project(...b);
    ctx.beginPath();ctx.moveTo(...pa);ctx.lineTo(...pb);
    ctx.lineWidth=Math.max(.4,width*F/Math.max(2,5.1-(a[2]+b[2])*.5));
    ctx.strokeStyle=color;ctx.stroke();
  };
  const bg=ctx.createLinearGradient(0,0,0,h);
  bg.addColorStop(0,isDark?'#11121c':'#879a9d');
  bg.addColorStop(.51,isDark?'#17202b':'#c3c7c2');
  bg.addColorStop(1,isDark?'#151820':'#3b484e');
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  // Real 3D surfaces of a 4m-wide, 2.8m-high rail carriage.
  fillQuad([[-2,0,-24],[2,0,-24],[2,0,3.6],[-2,0,3.6]],
    isDark?'#20232c':'#697477');
  fillQuad([[-2,2.85,-24],[2,2.85,-24],[2,2.85,3.6],[-2,2.85,3.6]],
    isDark?'#272b34':'#e3e1d8');
  fillQuad([[-2,0,-24],[-2,2.85,-24],[-2,2.85,3.6],[-2,0,3.6]],
    isDark?'#2e333c':'#c8c9c1');
  fillQuad([[2,0,-24],[2,2.85,-24],[2,2.85,3.6],[2,0,3.6]],
    isDark?'#232833':'#b5bec1');
  fillQuad([[-2,0,-23],[2,0,-23],[2,2.85,-23],[-2,2.85,-23]],
    isDark?'#1d212c':'#849293','#52666c');
  // A bright glass exit at the far end, framed in metal.
  fillQuad([[-.73,.22,-22.95],[.73,.22,-22.95],[.73,2.38,-22.95],[-.73,2.38,-22.95]],
    isDark?'#151c22':'#59747a','#dce6df');
  const count=9;
  for(let i=count-1;i>=0;i--){
    const z=2.0-i*2.7,z2=z-2.15;
    for(const side of [-1,1]){
      const x=side*1.98;
      fillQuad([[x,1.20,z],[x,2.36,z],[x,2.36,z2],[x,1.20,z2]],
        isDark?'#111926':'#4b707b','#a1b4b3');
      // Reflections and passing platform columns move behind the window glass.
      const k=(t*.9+i*.63)%1;
      const colZ=z+(z2-z)*k;
      beam([x,1.22,colZ],[x,2.30,colZ],.028,isDark?'#9d6c78':'#9fbcc4');
      beam([x,1.20,z],[x,2.36,z],.035,'#778d91');
      beam([x,1.20,z2],[x,2.36,z2],.035,'#778d91');
      beam([x,.12,z],[x,2.76,z],.028,'#788a8b');
      // Long bench top, base, back, true quadrilateral perspective surfaces.
      const xi=side*1.18;
      fillQuad([[x,.42,z],[xi,.42,z],[xi,.42,z2],[x,.42,z2]],
        isDark?'#46525a':'#5d8790','#314a54');
      fillQuad([[xi,.13,z],[xi,.42,z],[xi,.42,z2],[xi,.13,z2]],
        isDark?'#283e49':'#4d7681');
      fillQuad([[x,.42,z],[x,.92,z],[x,.92,z2],[x,.42,z2]],
        isDark?'#263442':'#83a4a9');
      beam([x,2.5,z],[x,2.5,z2],.035,'#e1e6dc');
    }
    // Suspended grab handles in the physical 3D aisle, not a flat icon row.
    for(const x of [-1.0,1.0]){
      beam([x,2.77,z],[x,2.27,z],.028,'#a7babd');
      const p=project(x,2.13,z),radius=Math.max(1,11*F/(5.1-z)/60);
      ctx.beginPath();ctx.ellipse(p[0],p[1],Math.min(17,radius*1.3),
        Math.min(20,radius*1.5),0,0,Math.PI*2);
      ctx.strokeStyle='#c5d6cf';ctx.lineWidth=Math.max(1,radius*.22);ctx.stroke();
    }
    // Ceiling light panels diminish with depth.
    fillQuad([[-.45,2.82,z], [.45,2.82,z],[.45,2.82,z-.85],[-.45,2.82,z-.85]],
      isDark?'#b19a9e':'#f5f3e3');
    // Joint between floor panels.
    beam([-2,.012,z],[2,.012,z],.008,'#a1aeb039');
  }
  // Forward end camera detail, seat rails and linear ceiling recesses.
  for(const side of [-1,1]){
    beam([side*1.75,.83,3.0],[side*1.75,.83,-24],.035,'#bdcbc5');
    beam([side*.87,2.78,3],[side*.87,2.78,-24],.048,'#98acaa');
    beam([side*1.99,.07,3],[side*1.99,.07,-24],.07,'#3d4b50');
  }
  // Seated passengers are restrained volumetric silhouettes at fixed depth.
  for(const [x,z,kind] of [[-1.55,-5,0],[1.55,-8,1],[-1.57,-12,1],[1.55,-17,0]]){
    const head=project(x,1.08,z),body=project(x,.55,z);
    const scale=F/(5.1-z);
    ctx.fillStyle=kind?'#46515b':'#4b5661';
    ctx.beginPath();ctx.ellipse(body[0],body[1],scale*.32,scale*.46,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=kind?'#c5b3a3':'#aeb6ac';
    ctx.beginPath();ctx.arc(head[0],head[1],scale*.16,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#303942';
    ctx.beginPath();ctx.arc(head[0],head[1]-scale*.06,scale*.165,Math.PI,Math.PI*2);ctx.fill();
  }
  // Filmic atmospheric falloff, edge vignetting and carriage lighting.
  const fade=ctx.createLinearGradient(0,0,0,h);
  fade.addColorStop(0,'#0c1b2455');fade.addColorStop(.35,'#08171c05');
  fade.addColorStop(1,'#071317b5');
  ctx.fillStyle=fade;ctx.fillRect(0,0,w,h);
  if(isDark){
    ctx.fillStyle=frame%17<3?'#a442432c':'#1b112236';
    ctx.fillRect(0,0,w,h);
  }
 }
 function refresh(){
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
    person.textContent='车内广播';words.textContent='22:00。车门没有打开。窗外已经不是熟悉的城市。';
    actions.replaceChildren();
    section.dataset.night='true';
    if(!anomalyEventSent){
      anomalyEventSent=true;
      global.dispatchEvent(new CustomEvent('paperchalk:metro-night-entry',{
        detail:{station:ride.station,lineId:ride.lineId,day:s.day}
      }));
    }
    return;
  }
  section.dataset.night='false';
  const story=metro.conversation(s,{connections:ride.rides,transfers:[]});
  const beat=story[speakerIndex%story.length];
  person.textContent=beat.speaker;
  words.textContent=beat.text;
  if(ride.rides)engine.recordTransitRumor?.(
    'ride-'+s.day+'-'+ride.lineId+'-'+ride.rides,
    beat.speaker+'：'+beat.text);
  actions.replaceChildren();
  if(next)actions.append(btn('继续乘坐 · 下一站',()=>{
    if(auto)return;
    const result=engine.metroNext();
    if(!result.ok){onFeedback?.(result.reason);return}
    speakerIndex++;refresh();
  }));
  if(!next)actions.append(btn('终点站 · 请下车',()=>exit()));
  actions.append(btn('下车',()=>exit()));
  if(!line.ring&&next)actions.append(btn('坐到终点',async()=>{
    if(auto)return;auto=true;
    for(let i=0;i<16;i++){
      const state=engine.snapshot().metro;
      if(!metro.nextStop(state.lineId,state.station,state.direction))break;
      const result=engine.metroNext();
      speakerIndex++;
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
        else{speakerIndex++;refresh()}
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
  if(!raf)raf=requestAnimationFrame(render);
  refresh();return true;
 }
 function close(){
  visible=false;section.hidden=true;
  if(raf)cancelAnimationFrame(raf);raf=0;
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
      speakerIndex++;refresh();
      await new Promise(resolve=>setTimeout(resolve,550));
    }
    const next=engine.metroNext();
    if(!next.ok)return next;
    speakerIndex++;refresh();
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
 return Object.freeze({open,close,refresh,playRoute,isOpen:()=>visible});
}
global.PaperWorldMetroCabin=Object.freeze({create});
})(window);
