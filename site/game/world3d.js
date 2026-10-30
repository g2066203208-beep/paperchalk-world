/* PAPERWORLD low-resolution native WebGL 3D town.
 * WORLD: X forward / Y left / Z vertical. Geometry is real depth-tested
 * triangles with 4 exact palette colors; no Three/CDN/API dependency.
 */
import {MotionPose,projectionMatrix,RAD,clamp} from './motion3d.js?v=20261030-gyrocomfort6';
import {LeanCamera} from './lean3d.js?v=20261030-gyrocomfort6';
import {BodyMotor} from './locomotion3d.js?v=20261030-gyrocomfort6';
const INK=[57/255,54/255,87/255],PINK=[242/255,165/255,194/255];
const BLUE=[169/255,186/255,233/255],PAPER=[1,245/255,230/255];
const PALETTE=[INK,PINK,BLUE,PAPER];
const $=id=>document.getElementById(id);
function makeTown(lod='full'){
 const verts=[],cols=[],lines=[],lineCols=[],solids=[];
 function vertex(p,c){verts.push(...p);cols.push(...PALETTE[c])}
 function line(a,b,c){lines.push(...a,...b);lineCols.push(...PALETTE[c],...PALETTE[c])}
 function quad(a,b,c,d,k,outline=false){
  for(const p of [a,b,c,a,c,d])vertex(p,k);
  if(outline){line(a,b,0);line(b,c,0);line(c,d,0);line(d,a,0)}
 }
 function box(x,y,z,sx,sy,sz,pal=2){
  const x0=x-sx/2,x1=x+sx/2,y0=y-sy/2,y1=y+sy/2,z0=z,z1=z+sz;
  quad([x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0],pal);
  quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],pal===1?3:1,true);
  quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],pal,true);
  quad([x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1],pal===2?3:2,true);
  quad([x1,y1,z0],[x0,y1,z0],[x0,y1,z1],[x1,y1,z1],pal,true);
  quad([x0,y1,z0],[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],pal===2?1:pal,true);
 }
 // Ground, roads and stone blocks. Only hard pixel-color surfaces.
 quad([-90,-90,-.08],[90,-90,-.08],[90,90,-.08],[-90,90,-.08],2);
 quad([-90,-3,.012],[90,-3,.012],[90,3,.012],[-90,3,.012],0);
 quad([-5,-90,.016],[5,-90,.016],[5,90,.016],[-5,90,.016],0);
 for(let n=-72;n<=72;n+=6){
  quad([n,-.12,.022],[n+2,-.12,.022],[n+2,.12,.022],[n,.12,.022],3);
  quad([-.12,n,.023],[.12,n,.023],[.12,n+2,.023],[-.12,n+2,.023],3);
 }
 for(let n=-90;n<=90;n+=9){
  line([n,-90,.035],[n,90,.035],3);
  line([-90,n,.035],[90,n,.035],3);
 }
 // Shops stand in three-dimensional city blocks on both sides of the avenue.
 for(let i=-7;i<=7;i++){
  // Fewer far facade windows on phones: preserve actual 3D geometry and collisions.
  // Mobile LOD retains every building and collider, reducing alternate facade details only.
  const bareMobileRow=lod==='mobile'&&Math.abs(i)%2===1;
  const x=i*10+4;
  for(const j of [-3,-2,-1,1,2,3]){
   const y=j*10.5+2;
   if(Math.abs(x)<9&&Math.abs(y)<12)continue;
   const seed=Math.abs(i*23+j*17);
   const h=3+(seed%5)*1.2,wall=(seed%3===0?1:seed%3===1?2:3);
   const w=4.6+(seed%3)*.7,depth=5.5;
   box(x,y,.1,w,depth,h,wall);
   solids.push({x,y,w,d:depth});
   if(bareMobileRow)continue; // skip only facade decoration
   // Stacked facade windows are small solid meshes, not sprites.
   const towardRoad=y>0?y-depth/2-.025:y+depth/2+.025;
   for(let floor=0;floor<Math.floor(h/2);floor+=(lod==='mobile'?2:1)){ 
    for(const dx of [-1,1]){
     box(x+dx*1.13,towardRoad,.95+floor*1.75,.72,.09,.78,0);
     box(x+dx*1.13,towardRoad+(.07*(y<0?-1:1)),.98+floor*1.75,.49,.095,.5,2);
    }
   }
   box(x,y,.1, w+.35,depth+.35,.20,0);
   box(x,y,h+.1,w+.35,depth+.35,.28,1);
  }
 }
 // Landmark rental house ahead: stylized pink/cream shop front and tower.
 box(30,0,.08,8,9,8,3);
 solids.push({x:30,y:0,w:8,d:9});
 box(29.9,0,8.1,9.5,10,.7,1);
 box(29.9,0,9,4,4,3.3,2);
 box(29.9,0,12.3,5.6,5.6,.45,1);
 box(25.93,0,.11,.15,2.5,3.25,0);
 box(25.84,0,3.4,.2,4,1,1);
 for(let side of [-3.1,3.1]){
  box(25.8,side,2.7,.13,1.5,1.5,0);
  box(25.7,side,2.9,.15,1,1.05,2);
 }
 // Four-color geometric trees create parallax in the near field.
 for(let x=-45;x<=60;x+=10){
  for(const y of [-6.5,6.5]){
   if(x>=24&&x<=37)continue;
   solids.push({x,y,w:.72,d:.72});
   box(x,y,.05,.46,.46,1.6,0);
   box(x,y,1.2,2.35,2.35,2.5,(Math.abs(x)%20)?1:3);
   box(x,y,3.35,1.4,1.4,.95,2);
  }
 }
 // A distant sky landmark visible on looking up.
 box(66,-22,14,4,4,17,1);
 box(66,-22,31,9,9,.65,3);
 return {tri:new Float32Array(verts),colors:new Float32Array(cols),line:new Float32Array(lines),lineColors:new Float32Array(lineCols),solids};
}
function program(gl,vs,fs){
 const compile=(type,source)=>{
  const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
  return shader;
 };
 const p=gl.createProgram();
 gl.attachShader(p,compile(gl.VERTEX_SHADER,vs));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));
 gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
 return p;
}
function makeRenderer(canvas){
 const gl=canvas.getContext('webgl',{alpha:false,depth:true,antialias:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
 if(!gl)throw Error('手机或浏览器无法启用 WebGL');
 const shader=program(gl,
  'attribute vec3 aPosition;attribute vec3 aColor;uniform mat4 uView;varying vec3 vColor;void main(){gl_Position=uView*vec4(aPosition,1.0);vColor=aColor;}',
  'precision mediump float;varying vec3 vColor;void main(){gl_FragColor=vec4(vColor,1.0);}');
 const aPos=gl.getAttribLocation(shader,'aPosition'),aColor=gl.getAttribLocation(shader,'aColor'),view=gl.getUniformLocation(shader,'uView');
 const data=makeTown(Math.min(window.innerWidth,window.innerHeight)<640?'mobile':'full');
 function buffer(arr){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);return b}
 const tPos=buffer(data.tri),tCol=buffer(data.colors),lPos=buffer(data.line),lCol=buffer(data.lineColors);
 const bind=(pos,col)=>{gl.bindBuffer(gl.ARRAY_BUFFER,pos);gl.enableVertexAttribArray(aPos);gl.vertexAttribPointer(aPos,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,col);gl.enableVertexAttribArray(aColor);gl.vertexAttribPointer(aColor,3,gl.FLOAT,false,0,0)};
 gl.disable(gl.DITHER);gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
 function resize(){
  const w=Math.max(1,window.innerWidth),h=Math.max(1,window.innerHeight);
  // Integer pixels, 2 CSS px wide; bounded work on large tablets.
  const scale=Math.max(2,Math.ceil(w/580),Math.ceil(h/790));
  const cw=Math.ceil(w/scale),ch=Math.ceil(h/scale);
  if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;gl.viewport(0,0,cw,ch)}
 }
 function render(pose,eye){
  resize();gl.useProgram(shader);
  gl.clearColor(...INK,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(view,false,projectionMatrix(pose,canvas.width/canvas.height,eye));
  gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);
  bind(tPos,tCol);gl.drawArrays(gl.TRIANGLES,0,data.tri.length/3);
  gl.disable(gl.POLYGON_OFFSET_FILL);
  // Depth-tested architectural ink edges; pull slightly to front using depth func LEQUAL.
  bind(lPos,lCol);gl.drawArrays(gl.LINES,0,data.line.length/3);
 }
 function destroy(){gl.deleteBuffer(tPos);gl.deleteBuffer(tCol);gl.deleteBuffer(lPos);gl.deleteBuffer(lCol);gl.deleteProgram(shader)}
 return {render,resize,destroy,solids:data.solids,get triangles(){return data.tri.length/9}};
}
export function createWorld3D({onBack}){
 const stage=$('pw-world'),canvas=$('pw-world-canvas'),status=$('pw-motion-status');
 if(!stage||!canvas)throw Error('Missing world3d stage');
 const motion=new MotionPose(),lean=new LeanCamera();
 let renderer=null,motor=new BodyMotor(),active=false,frame=0,prev=0,raf=0;
 let permission='idle',orientationListening=false,timeout=0,lastSensor=0,lastEye=null;
 let comfort=true;
 const keys=new Set(),stick={forward:0,side:0,id:null};
 const heldForward={value:0},headHold={value:0};
 const pointerLook={id:null,x:0,y:0};
 const el=id=>$(id),note=s=>{if(status.textContent!==s)status.textContent=s};
 function setStance(value){
  motor.setStance(value);
  for(const name of ['stand','crouch','prone'])
   el('pw-stance-'+name).setAttribute('aria-pressed',String(name===motor.stance));
 }
 function readouts(){
  const a=motion.degrees,m=motor.snapshot();
  el('pw-yaw').textContent=(a.yaw>=0?'+':'')+a.yaw+'°';
  el('pw-roll').textContent=(a.roll>=0?'+':'')+a.roll+'°';
  el('pw-pitch').textContent=(a.pitch>=0?'+':'')+a.pitch+'°';
  el('pw-lean-distance').textContent=(lean.offset>=0?'左 ':'右 ')+Math.abs(lean.offset).toFixed(2)+'m';
  el('pw-player-position').textContent='X '+m.position.x.toFixed(1)+' · Y '+m.position.y.toFixed(1);
  el('pw-player-speed').textContent=m.speed.toFixed(1)+' m/s';
  el('pw-stance-status').textContent={stand:'站立',crouch:'蹲下',prone:'趴下'}[m.stance]+' · '+m.height.toFixed(2)+'m';
  el('pw-sensor-badge').textContent=motion.sensorSeen?(motion.lastSource==='native'?'APK 原生陀螺仪':'网页姿态传感器'):'等待体感数据';
  el('pw-gyro-debug').textContent=motion.sensorSeen?
   ('侧倾 '+a.roll+'° · '+(Math.abs(lean.offset)*100).toFixed(0)+'cm · '+motion.lastSource):
   '尚无传感器数据 · 点击「开启手机体感」';
 }
 function input(){
  const forward=heldForward.value||((keys.has('w')?1:0)-(keys.has('s')?1:0)+stick.forward);
  const side=(keys.has('a')?1:0)-(keys.has('d')?1:0)+stick.side;
  return {forward:clamp(forward,-1,1),side:clamp(side,-1,1),sprint:keys.has('shift')};
 }
 function draw(time){
  if(!active)return;
  // Time-based movement, independent of irregular requestAnimationFrame rate.
  // Limit huge background-tab jumps but do not discard ordinary frame duration.
  const dt=prev?clamp((time-prev)/1000,0,.09):1/60;prev=time;frame++;
  motion.step(dt);
  const p=motor.update(dt,input(),motion.pose.yaw);
  const manual=keys.has('q')?65*RAD:keys.has('e')?-65*RAD:
   headHold.value?headHold.value*65*RAD:null;
  const sideRoll=manual===null?motion.pose.roll:manual;
  const peek=lean.update(dt,sideRoll,motion.pose.yaw,p.eye,renderer?.solids||[]);
  lastEye=peek.eye;
  // Rotate modestly while genuinely translating the camera into cover.
  const view={yaw:motion.pose.yaw,pitch:motion.pose.pitch,roll:peek.bank};
  if(renderer)renderer.render(view,peek.eye);
  if(frame%7===0)readouts();
  raf=requestAnimationFrame(draw);
 }
 function onOrientation(e){
  if(!active)return;
  const angle=Number(screen.orientation?.angle??window.orientation??0)||0;
  if(motion.ingest(e.alpha,e.beta,e.gamma,angle)){
   lastSensor=performance.now();
   if(timeout){clearTimeout(timeout);timeout=0}
   note('方向已连接 · 左右倾斜可连续探头 · 已关闭不可靠的体感踏步与蹲起');
  }
 }
 function onNativeQuaternion(w,x,y,z){
  if(!active)return;
  if(motion.ingestQuaternion(w,x,y,z)){
   lastSensor=performance.now();
   if(timeout){clearTimeout(timeout);timeout=0}
   note('APK 原生体感已连接 · 左右倾斜直接探头 · 地平线稳定');
  }
 }
 async function startMotion(){
  if(!active)return;
  if(window.PaperworldSensor?.start){
   window.__PAPERWORLD_NATIVE_ORIENTATION__=onNativeQuaternion;
   try{window.PaperworldSensor.start()}catch(e){}
  }
  if(typeof DeviceOrientationEvent==='undefined'){
   if(window.PaperworldSensor?.start){permission='native';note('已请求原生体感 · 请左右倾斜手机');return}

   permission='unsupported';note('该浏览器没有设备方向接口，仍可点探头键或使用 Q/E');return;
  }
  try{
   if(typeof DeviceOrientationEvent.requestPermission==='function'){
    const result=await DeviceOrientationEvent.requestPermission();
    if(result!=='granted'){permission='denied';note('未允许方向传感器，可使用左右探头键和键盘');return}
   }
   if(!orientationListening){
    window.addEventListener('deviceorientation',onOrientation,{passive:true});
    orientationListening=true;
   }
   permission='granted';note('传感器已开启 · 保持手机自然方向后点「重新校准」');
   timeout=setTimeout(()=>{if(active&&!motion.sensorSeen)note('未收到设备方向数据，请使用探头按钮或检查浏览器权限')},2200);
  }catch(e){permission='denied';note('体感授权失败：'+String(e.message||e).slice(0,65))}
 }
 function open(){
  if(active)return;
  stage.classList.remove('pw-off');active=true;frame=0;prev=0;
  motion.pose={yaw:0,pitch:0,roll:0};motion.target={yaw:0,pitch:0,roll:0};lean.reset();
  motion.setComfort(comfort);lean.setComfort(comfort);
  try{
   renderer??=makeRenderer(canvas);motor=new BodyMotor(renderer.solids);
   note('3D 街区就绪 · 前后移动用按键/摇杆 · 手机左右倾斜直接探头');
  }catch(e){motor=new BodyMotor();note('WebGL 不可用：'+String(e.message||e))}
  setStance('stand');readouts();raf=requestAnimationFrame(draw);
 }
 function close(){
  if(!active)return;
  active=false;stage.classList.add('pw-off');cancelAnimationFrame(raf);prev=0;
  if(timeout){clearTimeout(timeout);timeout=0}
  if(orientationListening){window.removeEventListener('deviceorientation',onOrientation);orientationListening=false}
  if(window.PaperworldSensor?.stop){try{window.PaperworldSensor.stop()}catch(e){}}
  window.__PAPERWORLD_NATIVE_ORIENTATION__=null;
  if(document.pointerLockElement===canvas)document.exitPointerLock?.();
  keys.clear();heldForward.value=0;headHold.value=0;stick.forward=stick.side=0;stick.id=null;
  pointerLook.id=null;lean.reset();motion.sensorSeen=false;motion.calibrated=false;permission='idle';
  el('pw-stick-knob').style.transform='translate(0,0)';
 }
 function bindHold(id,callback){
  const button=el(id),seen=new Set();
  button.addEventListener('pointerdown',e=>{
   if(!active)return;
   e.preventDefault();seen.add(e.pointerId);callback(true);
   button.setAttribute('aria-pressed','true');
   try{button.setPointerCapture(e.pointerId)}catch{}
  });
  const stop=e=>{
   if(!seen.delete(e.pointerId))return;
   if(!seen.size){callback(false);button.setAttribute('aria-pressed','false')}
  };
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,stop);
 }
 bindHold('pw-forward-hold',on=>{heldForward.value=on?1:0});
 bindHold('pw-back-hold',on=>{heldForward.value=on?-1:0});
 bindHold('pw-lean-left',on=>{headHold.value=on?1:0});
 bindHold('pw-lean-right',on=>{headHold.value=on?-1:0});
 for(const name of ['stand','crouch','prone'])
  el('pw-stance-'+name).addEventListener('click',()=>setStance(name));
 el('pw-motion-start').addEventListener('click',startMotion);
 const comfortBtn=el('pw-comfort-toggle');
 comfortBtn.addEventListener('click',()=>{
  comfort=!comfort;
  motion.setComfort(comfort);lean.setComfort(comfort);
  comfortBtn.textContent=comfort?'舒适模式：开':'舒适模式：关';
  comfortBtn.setAttribute('aria-pressed',String(comfort));
  note(comfort?'稳定地平线 · 缩小探头幅度 · 低敏感旋转':'标准模式 · 探头幅度增大，视角更灵敏');
 });
 el('pw-motion-center').addEventListener('click',()=>{
  if(motion.sensorSeen){motion.recenter();lean.reset();note('探头与朝向已重新校准')}
  else{motion.pose={yaw:0,pitch:0,roll:0};motion.target={yaw:0,pitch:0,roll:0};lean.reset();note('视角已回正')}
 });
 el('pw-motion-sensitivity').addEventListener('input',e=>{
  motion.setSensitivity(e.target.value);
  el('pw-motion-sensitivity-value').textContent=Number(e.target.value).toFixed(2)+'×';
 });
 el('pw-motion-response').addEventListener('input',e=>{
  motion.setResponse(e.target.value);
  el('pw-motion-response-value').textContent=Math.round(motion.smooth*1000)+' ms';
 });
 el('pw-motion-back').addEventListener('click',()=>{close();onBack?.()});
 const more=el('pw-world-more'),panel=el('pw-world-bottom');
 more.addEventListener('click',()=>{
  const old=panel.classList.contains('pw-world-compact');
  panel.classList.toggle('pw-world-compact',!old);
  more.setAttribute('aria-expanded',String(old));
  more.textContent=old?'收起设置 ▴':'体感设置 ▾';
 });
 const joystick=el('pw-move-stick'),knob=el('pw-stick-knob');
 function moveStick(e){
  const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height*.45;
  const radius=Math.max(28,Math.min(r.width,r.height)*.32);
  let x=clamp((e.clientX-cx)/radius,-1,1),y=clamp((e.clientY-cy)/radius,-1,1);
  const len=Math.max(1,Math.hypot(x,y));x/=len;y/=len;
  stick.forward=Math.abs(y)<.085?0:-y;
  stick.side=Math.abs(x)<.085?0:-x;
  knob.style.transform='translate('+Math.round(x*34)+'px,'+Math.round(y*34)+'px)';
 }
 joystick.addEventListener('pointerdown',e=>{
  if(!active||stick.id!==null)return;
  e.preventDefault();stick.id=e.pointerId;
  try{joystick.setPointerCapture(e.pointerId)}catch{}
  moveStick(e);
 });
 joystick.addEventListener('pointermove',e=>{
  if(e.pointerId===stick.id){e.preventDefault();moveStick(e)}
 });
 const stopStick=e=>{
  if(e.pointerId!==stick.id)return;
  stick.id=null;stick.forward=0;stick.side=0;
  knob.style.transform='translate(0,0)';
 };
 for(const event of ['pointerup','pointercancel','lostpointercapture'])
  joystick.addEventListener(event,stopStick);
 canvas.addEventListener('pointerdown',e=>{
  if(!active)return;
  if(e.pointerType==='mouse'&&canvas.requestPointerLock){
   try{const promise=canvas.requestPointerLock();promise?.catch?.(()=>{})}catch{}
  }
  pointerLook.id=e.pointerId;pointerLook.x=e.clientX;pointerLook.y=e.clientY;
  try{canvas.setPointerCapture(e.pointerId)}catch{}
 });
 canvas.addEventListener('pointermove',e=>{
  if(!active||document.pointerLockElement===canvas||pointerLook.id!==e.pointerId)return;
  motion.manual((e.clientX-pointerLook.x)*.0033,(pointerLook.y-e.clientY)*.0033,0);
  pointerLook.x=e.clientX;pointerLook.y=e.clientY;
 });
 for(const event of ['pointerup','pointercancel'])
  canvas.addEventListener(event,e=>{if(e.pointerId===pointerLook.id)pointerLook.id=null});
 document.addEventListener('mousemove',e=>{
  if(active&&document.pointerLockElement===canvas)
   motion.manual(e.movementX*.0026,-e.movementY*.0026,0);
 });
 function keyDown(e){
  if(!active||/INPUT|SELECT|TEXTAREA/.test(e.target?.tagName||''))return;
  const k=e.key.toLowerCase();
  if(['w','a','s','d','shift','q','e'].includes(k)){
   e.preventDefault();keys.add(k);return;
  }
  if(k.startsWith('arrow')){
   const dirs={arrowleft:[-.08,0,0],arrowright:[.08,0,0],arrowup:[0,.065,0],arrowdown:[0,-.065,0]};
   if(dirs[k]){e.preventDefault();motion.manual(...dirs[k])}return;
  }
  if(e.repeat)return;
  if(k==='control')setStance(motor.stance==='crouch'?'stand':'crouch');
  if(k==='z')setStance(motor.stance==='prone'?'stand':'prone');
  if(k==='x')setStance('stand');
  if(k===' '){motion.sensorSeen?motion.recenter():(motion.pose={yaw:0,pitch:0,roll:0},motion.target={yaw:0,pitch:0,roll:0});lean.reset()}
  if(k==='escape'){
   if(document.pointerLockElement===canvas)document.exitPointerLock?.();
   else{close();onBack?.()}
  }
 }
 window.addEventListener('keydown',keyDown);
 window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
 window.addEventListener('blur',()=>{keys.clear();heldForward.value=0;stick.forward=stick.side=0;headHold.value=0});
 function onScreen(){motion.calibrated=false;if(active)note('屏幕朝向变更，待重新校准')}
 window.addEventListener('orientationchange',onScreen);
 window.screen?.orientation?.addEventListener?.('change',onScreen);
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){keys.clear();stick.forward=stick.side=0;heldForward.value=0;headHold.value=0}
 });
 window.__PAPERWORLD_WORLD3D__={
  get active(){return active},
  get pose(){return {...motion.pose}},
  get target(){return {...motion.target}},
  get player(){return motor.snapshot()},
  get eye(){return [...(lastEye||[0,0,1.68])]},
  get lean(){return {offset:lean.offset,bank:lean.bank}},
  get walls(){return renderer?.solids.length||0},
  get triangles(){return renderer?.triangles||0},
  get forwardHold(){return heldForward.value},
  get sensor(){return motion.sensorSeen},get sensorSource(){return motion.lastSource},get comfort(){return comfort},get permission(){return permission},
  injectTestQuaternion:(w,x,y,z)=>motion.ingestQuaternion(w,x,y,z),
  injectTestOrientation:(a,b,g,angle=0)=>motion.ingest(a,b,g,angle),
  setTestStance:name=>motor.setStance(name)
 };
 return {open,close,get active(){return active},motion,get motor(){return motor}};
}
