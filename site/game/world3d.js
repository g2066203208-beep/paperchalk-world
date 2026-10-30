/* PAPERWORLD low-resolution native WebGL 3D town.
 * WORLD: X forward / Y left / Z vertical. Geometry is real depth-tested
 * triangles with 4 exact palette colors; no Three/CDN/API dependency.
 */
import {MotionPose,projectionMatrix,RAD,clamp,wrap,deviceQuaternion,rotate} from './motion3d.js';
import {BodyMotor,STANCES} from './locomotion3d.js?v=20261030-motionfix4';
const INK=[57/255,54/255,87/255],PINK=[242/255,165/255,194/255];
const BLUE=[169/255,186/255,233/255],PAPER=[1,245/255,230/255];
const PALETTE=[INK,PINK,BLUE,PAPER];
const $=id=>document.getElementById(id);
function makeTown(){
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
  const x=i*10+4;
  for(const j of [-3,-2,-1,1,2,3]){
   const y=j*10.5+2;
   if(Math.abs(x)<9&&Math.abs(y)<12)continue;
   const seed=Math.abs(i*23+j*17);
   const h=3+(seed%5)*1.2,wall=(seed%3===0?1:seed%3===1?2:3);
   const w=4.6+(seed%3)*.7,depth=5.5;
   box(x,y,.1,w,depth,h,wall);
   solids.push({x,y,w,d:depth});
   // Stacked facade windows are small solid meshes, not sprites.
   const towardRoad=y>0?y-depth/2-.025:y+depth/2+.025;
   for(let floor=0;floor<Math.floor(h/2);floor++){
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
 const gl=canvas.getContext('webgl',{alpha:false,depth:true,antialias:false,stencil:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
 if(!gl)throw Error('手机或浏览器无法启用 WebGL');
 const shader=program(gl,
  'attribute vec3 aPosition;attribute vec3 aColor;uniform mat4 uView;varying vec3 vColor;void main(){gl_Position=uView*vec4(aPosition,1.0);vColor=aColor;}',
  'precision mediump float;varying vec3 vColor;void main(){gl_FragColor=vec4(vColor,1.0);}');
 const aPos=gl.getAttribLocation(shader,'aPosition'),aColor=gl.getAttribLocation(shader,'aColor'),view=gl.getUniformLocation(shader,'uView');
 const data=makeTown();
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
 if(!stage||!canvas)throw Error('Missing 3D scene');
 const motion=new MotionPose();
 let renderer=null,motor=new BodyMotor(),active=false,frame=0,prev=0,raf=0;
 let orientListening=false,accelListening=false,permission='idle',timeout=0;
 const keys=new Set(),stick={forward:0,side:0,id:null},heldMove={forward:0},look={id:null,x:0,y:0},poseHold={id:null,lockedPitch:0};
 const gravity={x:null,y:null,z:null};
 const el=id=>$(id);
 const note=v=>{if(status.textContent!==v)status.textContent=v};
 function setStance(name){
  motor.setStance(name);
  for(const key of ['stand','crouch','prone'])
   el('pw-stance-'+key).setAttribute('aria-pressed',String(key===motor.stance));
 }
 function readouts(){
  const {yaw,pitch,roll}=motion.degrees;
  el('pw-yaw').textContent=(yaw>=0?'+':'')+yaw+'°';
  el('pw-roll').textContent=(roll>=0?'+':'')+roll+'°';
  el('pw-pitch').textContent=(pitch>=0?'+':'')+pitch+'°';
  const p=motor.snapshot();
  const names={stand:'站立',crouch:'蹲下',prone:'趴下'};
  el('pw-stance-status').textContent=names[p.stance]+' · '+p.height.toFixed(2)+'m';
  el('pw-player-position').textContent='X '+p.position.x.toFixed(1)+' · Y '+p.position.y.toFixed(1);
  el('pw-player-speed').textContent=p.speed.toFixed(1)+' m/s';
  el('pw-sensor-badge').textContent=motion.sensorSeen?'陀螺仪在线':'可用手指/键盘';
  el('pw-walk-help').textContent=motor.physicalStanceMode?'识别真实下蹲/站起：手机要随身体上下运动，原地踏步暂时禁用':motor.walkMode?
   (motor.motionAvailable?'体感踏步已开启 · 已识别 '+p.steps+' 步 · 姿态需按住按钮调整':
    '等待手机加速度事件；若没有踏步信号，直接使用屏幕摇杆'):
   '屏幕摇杆/WASD可移动；开启体感踏步后，原地踏步才会自动前进';
  for(const key of ['stand','crouch','prone'])
   el('pw-stance-'+key).setAttribute('aria-pressed',String(key===p.stance));
 }
 function controls(){
  const f=(keys.has('w')||keys.has('ArrowForward')?1:0)-(keys.has('s')?1:0);
  const sideways=(keys.has('a')?1:0)-(keys.has('d')?1:0);
  return {forward:heldMove.forward||clamp(f+stick.forward,-1,1),side:clamp(sideways+stick.side,-1,1),sprint:keys.has('shift')};
 }
 function draw(t){
  if(!active)return;
  const dt=prev?clamp((t-prev)/1000,0,.055):1/60;prev=t;frame++;
  motion.step(dt);
  if(poseHold.id!==null)motion.pose.pitch=poseHold.lockedPitch;
  const p=motor.update(dt,controls(),motion.pose.yaw,performance.now());
  if(renderer)renderer.render(motion.pose,p.eye);
  if(frame%7===0)readouts();
  raf=requestAnimationFrame(draw);
 }
 function onOrientation(e){
  if(!active)return;
  const angle=Number(screen.orientation?.angle??window.orientation??0)||0;
  if(motion.ingest(e.alpha,e.beta,e.gamma,angle)){
   if(timeout){clearTimeout(timeout);timeout=0}
   if(poseHold.id!==null){
    motor.updatePosture(motion.latest.pitch);
    motion.target.pitch=poseHold.lockedPitch;
    setStance(motor.stance);
   }
   note('体感已连接 · Z转身 / X侧倒 / 抬低头；按住姿态键可调整身体高度');
  }
 }
 function onAcceleration(e){
  if(!active||(!motor.walkMode&&!motor.physicalStanceMode))return;
  const now=performance.now();
  let a=e.acceleration;
  // DeviceMotion.acceleration is null on some WebViews. High-pass the
  // gravity-bearing sample instead, never integrate it into absolute XYZ.
  if(!a||![a.x,a.y,a.z].every(Number.isFinite)){
   const g=e.accelerationIncludingGravity;
   if(!g||![g.x,g.y,g.z].every(Number.isFinite))return;
   if(gravity.x===null){for(const axis of ['x','y','z'])gravity[axis]=g[axis];return}
   const linear={};
   for(const axis of ['x','y','z']){
    linear[axis]=g[axis]-gravity[axis];
    gravity[axis]+=.045*linear[axis];
   }
   a=linear;
  }
  if(motor.walkMode)motor.ingestAcceleration(a.x,a.y,a.z,now);
  if(motor.physicalStanceMode&&motion.latest){
   // Rotate gravity-free DEVICE acceleration to WORLD Z, independent of
   // handset's portrait/landscape or roll. Z is actual game vertical.
   const o=motion.latest;
   const q=deviceQuaternion(o.alpha,o.beta,o.gamma,0);
   const up=rotate(q,[a.x,a.y,a.z])[2];
   const stance=motor.ingestVerticalAcceleration(up,now);
   if(stance){setStance(stance);note(stance==='crouch'?'识别到真实下蹲动作':'识别到真实站起动作')}
  }
 }
 async function startMotion(){
  if(!active)return;
  try{
   const orientation=typeof DeviceOrientationEvent!=='undefined';
   const acceleration=typeof DeviceMotionEvent!=='undefined';
   if(!orientation&&!acceleration){permission='unsupported';note('本机没有方向或运动传感器，摇杆/WASD依旧可用');return}
   // Request both before first await — iOS gesture activation is short-lived.
   const requests=[];
   if(orientation&&typeof DeviceOrientationEvent.requestPermission==='function')requests.push(DeviceOrientationEvent.requestPermission());
   if(acceleration&&typeof DeviceMotionEvent.requestPermission==='function')requests.push(DeviceMotionEvent.requestPermission());
   const results=await Promise.allSettled(requests);
   if(results.some(v=>v.status!=='fulfilled'||v.value!=='granted')){
    permission='denied';note('体感权限未允许，仍可用摇杆、鼠标和键盘');return;
   }
   if(orientation&&!orientListening){
    window.addEventListener('deviceorientation',onOrientation,{passive:true});orientListening=true;
   }
   if(acceleration&&!accelListening){
    window.addEventListener('devicemotion',onAcceleration,{passive:true});accelListening=true;
   }
   permission='granted';
   note('已开启手机方向与步行动作采集 · 校准后可测试');
   timeout=setTimeout(()=>{if(active&&!motion.sensorSeen)note('还没有收到方向传感器数据；使用触屏摇杆/鼠标可继续玩')},2000);
  }catch(e){permission='denied';note('体感授权失败：'+String(e.message||e).slice(0,55))}
 }
 function show(){
  if(active)return;
  stage.classList.remove('pw-off');active=true;frame=0;prev=0;
  try{
   renderer??=makeRenderer(canvas);
   motor=new BodyMotor(renderer.solids);
   note('立体街区就绪 · 鼠标/WASD或手机摇杆移动；体感需点击授权');
  }catch(e){note('WebGL 无法运行：'+String(e.message||e).slice(0,80));motor=new BodyMotor()}
  setStance('stand');readouts();raf=requestAnimationFrame(draw);
 }
 function hide(){
  active=false;stage.classList.add('pw-off');cancelAnimationFrame(raf);prev=0;
  if(timeout){clearTimeout(timeout);timeout=0}
  if(orientListening){window.removeEventListener('deviceorientation',onOrientation);orientListening=false}
  if(accelListening){window.removeEventListener('devicemotion',onAcceleration);accelListening=false}
  if(document.pointerLockElement===canvas)document.exitPointerLock?.();
  motion.sensorSeen=false;motion.calibrated=false;motor.setWalkMode(false);
  permission='idle';keys.clear();stick.forward=0;stick.side=0;stick.id=null;heldMove.forward=0;
  look.id=null;poseHold.id=null;motor.stopPosture();
  el('pw-stick-knob').style.transform='translate(0,0)';
 }
 function releaseStanceGesture(){
  if(poseHold.id===null)return;
  poseHold.id=null;
  motor.stopPosture();
  // Keep camera pitch unchanged, shifting the relative zero point to new grip.
  if(motion.latest&&motion.calibrated){
   motion.bias.pitch=motion.latest.pitch-poseHold.lockedPitch/motion.sensitivity;
   motion.refreshTarget();
  }
  el('pw-posture-hold').setAttribute('aria-pressed','false');
  note('身体姿态已锁定，恢复正常抬头/低头体感');
 }
 const postureButton=el('pw-posture-hold');
 postureButton.addEventListener('pointerdown',e=>{
  if(!active||!motion.sensorSeen){note('姿态体感需先授权并校准；也可直接点站/蹲/趴按钮');return}
  e.preventDefault();poseHold.id=e.pointerId;poseHold.lockedPitch=motion.pose.pitch;
  if(!motor.startPosture(motion.latest.pitch)){poseHold.id=null;return}
  postureButton.setPointerCapture(e.pointerId);
  postureButton.setAttribute('aria-pressed','true');
  note('按住：倾斜约29°蹲下、62°趴下；松开锁定身体姿态');
 });
 for(const evt of ['pointerup','pointercancel','lostpointercapture'])
  postureButton.addEventListener(evt,e=>{if(e.pointerId===poseHold.id)releaseStanceGesture()});
 for(const n of ['stand','crouch','prone'])
  el('pw-stance-'+n).addEventListener('click',()=>{motor.stopPosture();releaseStanceGesture();setStance(n)});
 // Large front/back hold controls work instantly even without any sensors.
 function bindWalkHold(id,direction){
  const button=el(id),current={pointer:null};
  const stop=e=>{
   if(current.pointer===null||e.pointerId!==current.pointer)return;
   current.pointer=null;heldMove.forward=0;
   button.setAttribute('aria-pressed','false');
  };
  button.addEventListener('pointerdown',e=>{
   if(!active)return;
   e.preventDefault();current.pointer=e.pointerId;heldMove.forward=direction;
   button.setAttribute('aria-pressed','true');
   try{button.setPointerCapture(e.pointerId)}catch{}
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,stop);
 }
 bindWalkHold('pw-forward-hold',1);
 bindWalkHold('pw-back-hold',-1);
 const backwards=el('pw-walk-direction');
 backwards.addEventListener('click',()=>{
  motor.setWalkDirection(-motor.stepDirection);
  backwards.textContent=motor.stepDirection>0?'踏步方向：前进 ↑':'踏步方向：后退 ↓';
  backwards.setAttribute('aria-pressed',String(motor.stepDirection<0));
  note(motor.stepDirection>0?'体感踏步方向：前进':'体感踏步方向：后退');
 });
 const physical=el('pw-squat-motion');
 physical.addEventListener('click',()=>{
  const next=!motor.physicalStanceMode;
  // During physical squat recognition, suppress step detection so the
  // same down-up pulse cannot move the player unexpectedly.
  if(next&&motor.walkMode){
   motor.setWalkMode(false);el('pw-walk-toggle').textContent='体感踏步：关';
   el('pw-walk-toggle').setAttribute('aria-pressed','false');
  }
  motor.setPhysicalStanceMode(next);
  physical.textContent=next?'体感蹲起：开':'体感蹲起：关';
  physical.setAttribute('aria-pressed',String(next));
  note(next?'体感蹲起就绪：上下蹲起（两段脉冲识别），不要只倾斜手机':'体感蹲起已关闭');
  if(next&&!accelListening)startMotion();
 });
 el('pw-gait-threshold').addEventListener('input',e=>{
  const threshold=Number(e.target.value);
  motor.setGaitThreshold(threshold);
  el('pw-gait-value').textContent=threshold<.70?'灵敏':threshold>1.2?'稳健':'标准';
 });
 const compact=el('pw-world-bottom'),more=el('pw-world-more');
 more.addEventListener('click',()=>{
  const wasCompact=compact.classList.contains('pw-world-compact');
  compact.classList.toggle('pw-world-compact',!wasCompact);
  more.textContent=wasCompact?'收起设置 ▴':'体感设置 ▾';
  more.setAttribute('aria-expanded',String(wasCompact));
 });
 el('pw-motion-start').addEventListener('click',startMotion);
 el('pw-motion-center').addEventListener('click',()=>{
  if(motion.sensorSeen){motion.recenter();note('校准完成：此方向为正前方')}
  else{motion.pose={yaw:0,pitch:0,roll:0};motion.target={...motion.pose};note('鼠标/摇杆视角已回正')}
 });
 el('pw-walk-toggle').addEventListener('click',()=>{
  const next=!motor.walkMode;
  if(next&&motor.physicalStanceMode){motor.setPhysicalStanceMode(false);el('pw-squat-motion').textContent='体感蹲起：关';el('pw-squat-motion').setAttribute('aria-pressed','false')}
  motor.setWalkMode(next);
  el('pw-walk-toggle').textContent=next?'体感踏步：开':'体感踏步：关';
  el('pw-walk-toggle').setAttribute('aria-pressed',String(next));
  if(next&&!accelListening)startMotion();
  else note(next?'踏步模式：识别明显的上下加速峰值后前进':'已关闭体感踏步，仍可用摇杆前进');
 });
 el('pw-motion-back').addEventListener('click',()=>{hide();onBack?.()});
 el('pw-motion-sensitivity').addEventListener('input',e=>{motion.setSensitivity(e.target.value);el('pw-motion-sensitivity-value').textContent=Number(e.target.value).toFixed(2)+'×'});
 el('pw-motion-response').addEventListener('input',e=>{motion.setResponse(e.target.value);el('pw-motion-response-value').textContent=Math.round(motion.smooth*1000)+' ms'});
 const stickElement=el('pw-move-stick'),knob=el('pw-stick-knob');
 function stickInput(e){
  const q=stickElement.getBoundingClientRect(),cx=q.left+q.width/2,cy=q.top+q.height*.45;
  const radius=Math.max(28,Math.min(q.width,q.height)*.32);
  const dx=clamp((e.clientX-cx)/radius,-1,1),dy=clamp((e.clientY-cy)/radius,-1,1);
  const magnitude=Math.hypot(dx,dy),limit=Math.max(1,magnitude);
  const xx=dx/limit,yy=dy/limit;
  stick.forward=Math.abs(yy)<.11?0:-yy;
  stick.side=Math.abs(xx)<.11?0:-xx;
  knob.style.transform='translate('+Math.round(xx*34)+'px,'+Math.round(yy*34)+'px)';
 }
 stickElement.addEventListener('pointerdown',e=>{
  if(!active||stick.id!==null)return;
  e.preventDefault();stick.id=e.pointerId;stickElement.setPointerCapture(e.pointerId);stickInput(e);
 });
 stickElement.addEventListener('pointermove',e=>{if(stick.id===e.pointerId){e.preventDefault();stickInput(e)}});
 const stopStick=e=>{if(stick.id!==e.pointerId)return;stick.id=null;stick.forward=0;stick.side=0;knob.style.transform='translate(0,0)'};
 for(const evt of ['pointerup','pointercancel','lostpointercapture'])stickElement.addEventListener(evt,stopStick);
 canvas.addEventListener('pointerdown',e=>{
  if(!active)return;
  if(e.pointerType==='mouse'&&canvas.requestPointerLock){
   try{const result=canvas.requestPointerLock();if(result?.catch)result.catch(()=>{})}catch{}
  }
  look={id:e.pointerId,x:e.clientX,y:e.clientY};
  try{canvas.setPointerCapture(e.pointerId)}catch{}
 });
 canvas.addEventListener('pointermove',e=>{
  if(!active)return;
  if(document.pointerLockElement===canvas)return; // handled by mousemove
  if(look.id!==e.pointerId)return;
  motion.manual((e.clientX-look.x)*.0035,(look.y-e.clientY)*.0035,0);
  look.x=e.clientX;look.y=e.clientY;
 });
 const releaseLook=e=>{if(look.id===e.pointerId)look.id=null};
 canvas.addEventListener('pointerup',releaseLook);canvas.addEventListener('pointercancel',releaseLook);
 document.addEventListener('mousemove',e=>{
  if(!active||document.pointerLockElement!==canvas)return;
  motion.manual(e.movementX*.0027,-e.movementY*.0027,0);
 });
 function keyDown(e){
  if(!active||/INPUT|SELECT|TEXTAREA/.test(e.target?.tagName||''))return;
  const k=e.key.toLowerCase();
  if(['w','a','s','d','shift'].includes(k)){e.preventDefault();keys.add(k);return}
  const lookKeys={arrowleft:[-.07,0,0],arrowright:[.07,0,0],arrowup:[0,.065,0],arrowdown:[0,-.065,0],q:[0,0,-.085],e:[0,0,.085]};
  if(lookKeys[k]){e.preventDefault();motion.manual(...lookKeys[k]);return}
  if(e.repeat)return;
  if(k==='control'){e.preventDefault();setStance(motor.stance==='crouch'?'stand':'crouch')}
  if(k==='z'){e.preventDefault();setStance(motor.stance==='prone'?'stand':'prone')}
  if(k==='x'){e.preventDefault();setStance('stand')}
  if(k===' '){e.preventDefault();motion.sensorSeen?motion.recenter():(motion.pose={yaw:0,pitch:0,roll:0},motion.target={...motion.pose})}
  if(k==='escape'){e.preventDefault();if(document.pointerLockElement===canvas)document.exitPointerLock?.();else{hide();onBack?.()}}
 }
 window.addEventListener('keydown',keyDown);
 window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
 window.addEventListener('blur',()=>{keys.clear();stick.forward=0;stick.side=0;heldMove.forward=0});
 function screenChange(){if(!active)return;motion.calibrated=false;note('屏幕方向变化，请重新校准体感')}
 window.addEventListener('orientationchange',screenChange);
 window.screen?.orientation?.addEventListener?.('change',screenChange);
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){keys.clear();stick.forward=0;stick.side=0;heldMove.forward=0;if(active)note('页面已隐藏，暂停移动')}
 });
 window.__PAPERWORLD_WORLD3D__={
  get active(){return active},get sensor(){return motion.sensorSeen},get pose(){return {...motion.pose}},
  get target(){return {...motion.target}},get permission(){return permission},get triangles(){return renderer?.triangles||0},
  get player(){return motor.snapshot()},get walls(){return renderer?.solids.length||0},
  get forwardHold(){return heldMove.forward},
  injectTestVertical:(up,ms)=>motor.ingestVerticalAcceleration(up,ms),
  injectTestOrientation:(a,b,g,screenAngle=0)=>motion.ingest(a,b,g,screenAngle),
  injectTestAcceleration:(x,y,z,ms)=>motor.ingestAcceleration(x,y,z,ms),
  setTestStance:name=>motor.setStance(name)
 };
 return {open:show,close:hide,get active(){return active},motion,get motor(){return motor}};
}
