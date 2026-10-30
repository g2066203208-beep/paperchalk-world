/* PAPERWORLD low-resolution native WebGL 3D town.
 * WORLD: X forward / Y left / Z vertical. Geometry is real depth-tested
 * triangles with 4 exact palette colors; no Three/CDN/API dependency.
 */
import {MotionPose,projectionMatrix,RAD,clamp} from './motion3d.js';
const INK=[57/255,54/255,87/255],PINK=[242/255,165/255,194/255];
const BLUE=[169/255,186/255,233/255],PAPER=[1,245/255,230/255];
const PALETTE=[INK,PINK,BLUE,PAPER];
const $=id=>document.getElementById(id);
function makeTown(){
 const verts=[],cols=[],lines=[],lineCols=[];
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
   box(x,y,.05,.46,.46,1.6,0);
   box(x,y,1.2,2.35,2.35,2.5,(Math.abs(x)%20)?1:3);
   box(x,y,3.35,1.4,1.4,.95,2);
  }
 }
 // A distant sky landmark visible on looking up.
 box(66,-22,14,4,4,17,1);
 box(66,-22,31,9,9,.65,3);
 return {tri:new Float32Array(verts),colors:new Float32Array(cols),line:new Float32Array(lines),lineColors:new Float32Array(lineCols)};
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
 function render(pose){
  resize();gl.useProgram(shader);
  gl.clearColor(...INK,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(view,false,projectionMatrix(pose,canvas.width/canvas.height));
  bind(tPos,tCol);gl.drawArrays(gl.TRIANGLES,0,data.tri.length/3);
  // Depth-tested architectural ink edges; pull slightly to front using depth func LEQUAL.
  bind(lPos,lCol);gl.drawArrays(gl.LINES,0,data.line.length/3);
 }
 function destroy(){gl.deleteBuffer(tPos);gl.deleteBuffer(tCol);gl.deleteBuffer(lPos);gl.deleteBuffer(lCol);gl.deleteProgram(shader)}
 return {render,resize,destroy,get triangles(){return data.tri.length/9}};
}
export function createWorld3D({onBack}){
 const stage=$('pw-world'),canvas=$('pw-world-canvas'),status=$('pw-motion-status');
 if(!stage||!canvas)throw Error('Missing world3d DOM components');
 const motion=new MotionPose();let renderer=null,active=false,frame=0,prev=0,raf=0;
 let started=false,timeout=0,lastMotion=0,permission='idle',drag=null;
 const label=id=>$(id);
 function note(v){status.textContent=v}
 function readings(){
  const {yaw,pitch,roll}=motion.degrees;
  label('pw-yaw').textContent=(yaw>=0?'+':'')+yaw+'°';
  label('pw-roll').textContent=(roll>=0?'+':'')+roll+'°';
  label('pw-pitch').textContent=(pitch>=0?'+':'')+pitch+'°';
  label('pw-sensor-badge').textContent=motion.sensorSeen?'传感器正常':'可用手指拖动';
 }
 function draw(t){
  if(!active)return;
  const dt=prev?clamp((t-prev)/1000,0,.07):1/60;prev=t;frame++;
  motion.step(dt);
  if(renderer)renderer.render(motion.pose);
  if(frame%5===0)readings();
  raf=requestAnimationFrame(draw);
 }
 function onDevice(e){
  if(!active)return;
  const angle=Number(screen.orientation?.angle??window.orientation??0)||0;
  if(motion.ingest(e.alpha,e.beta,e.gamma,angle)){
   lastMotion=performance.now();
   if(timeout){clearTimeout(timeout);timeout=0}
   note('传感器已连接 · 绕 Z 转向 / 左右侧倾 / 上下俯仰');
  }
 }
 function onScreen(){motion.calibrated=false;note('屏幕方向已变化，请保持姿态，等待自动重新校准')}
 async function startMotion(){
  // iOS permission must be triggered by THIS button activation.
  if(!active)return;
  if(typeof DeviceOrientationEvent==='undefined'){permission='unsupported';note('设备没有提供陀螺仪接口，可用拖动模式');return}
  try{
   if(typeof DeviceOrientationEvent.requestPermission==='function'){
    const result=await DeviceOrientationEvent.requestPermission();
    if(result!=='granted'){permission='denied';note('体感权限未允许，可以用手指旋转三轴');return}
   }
   if(!started){
    window.addEventListener('deviceorientation',onDevice,{passive:true});
    started=true;
   }
   permission='granted';note('传感器已授权；请手持手机正对前方');
   timeout=setTimeout(()=>{if(active&&!motion.sensorSeen)note('暂未收到陀螺仪数据：检查设备设置或使用手指模式')},1800);
  }catch(e){permission='denied';note('无法开启体感：'+String(e.message||e).slice(0,75)+'；可用手指模式')}
 }
 function open(){
  if(active)return;
  stage.classList.remove('pw-off');active=true;prev=0;frame=0;
  try{renderer??=makeRenderer(canvas);note('3D 世界就绪 · 点击「开启体感」授权传感器')}catch(e){note('WebGL 无法运行：'+String(e.message||e));}
  readings();raf=requestAnimationFrame(draw);
 }
 function close(){
  active=false;stage.classList.add('pw-off');cancelAnimationFrame(raf);prev=0;
  if(timeout){clearTimeout(timeout);timeout=0}
  // Stop listening and saving CPU/battery outside 3D world.
  if(started){window.removeEventListener('deviceorientation',onDevice);started=false}
  motion.sensorSeen=false;motion.calibrated=false;permission='idle';
 }
 label('pw-motion-start').addEventListener('click',startMotion);
 label('pw-motion-center').addEventListener('click',()=>{
  if(motion.sensorSeen){motion.recenter();note('此刻手机方向设为新的正前方')}
  else{motion.pose={yaw:0,pitch:0,roll:0};motion.target={...motion.pose};note('手指模式已回正')}
 });
 label('pw-motion-back').addEventListener('click',()=>{close();onBack?.()});
 label('pw-motion-sensitivity').addEventListener('input',e=>{motion.setSensitivity(e.target.value);label('pw-motion-sensitivity-value').textContent=Number(e.target.value).toFixed(2)+'×'});
 label('pw-motion-response').addEventListener('input',e=>{motion.setResponse(e.target.value);label('pw-motion-response-value').textContent=Math.round(motion.smooth*1000)+' ms'});
 // Fallback: drag in X to turn around Z; drag in Y to look up/down; Q/E for sideways roll.
 canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener('pointermove',e=>{
  if(!drag)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag={x:e.clientX,y:e.clientY};
  motion.manual(dx*.004,-dy*.004,0);readings();
 });
 canvas.addEventListener('pointerup',()=>drag=null);
 canvas.addEventListener('pointercancel',()=>drag=null);
 window.addEventListener('keydown',e=>{
  if(!active)return;
  const keys={ArrowLeft:[-.09,0,0],ArrowRight:[.09,0,0],ArrowUp:[0,.075,0],ArrowDown:[0,-.075,0],q:[0,0,-.095],e:[0,0,.095],Q:[0,0,-.095],E:[0,0,.095]};
  if(keys[e.key]){e.preventDefault();motion.manual(...keys[e.key])}
  if(e.key===' '){e.preventDefault();if(motion.sensorSeen)motion.recenter();else{motion.pose={yaw:0,pitch:0,roll:0};motion.target={...motion.pose}}}
  if(e.key==='Escape'){e.preventDefault();close();onBack?.()}
 });
 window.addEventListener('orientationchange',onScreen);
 window.screen?.orientation?.addEventListener?.('change',onScreen);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active){note('已暂停传感器更新；返回后请重新校准')}});
 // Instrumented test hook, no simulation of hardware sensor permissions.
 window.__PAPERWORLD_WORLD3D__={get active(){return active},get sensor(){return motion.sensorSeen},
  get pose(){return {...motion.pose}},get target(){return {...motion.target}},get permission(){return permission},
  get triangles(){return renderer?.triangles||0},injectTestOrientation:(a,b,g,screen=0)=>motion.ingest(a,b,g,screen)};
 return {open,close,get active(){return active},motion};
}
