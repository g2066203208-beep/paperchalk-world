/* Paperchalk World: shared, damped 3D strategy camera.
 * Independent of WebGL: consumes pointer gestures, emits eye/target/fov.
 * Right-drag orbit; middle/Shift-left drag pan; wheel zoom.
 * One-finger touch orbit (if no game action); two-finger pan + pinch.
 */
(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
function create(options={}){
 const fov=options.fov??31;
 const fixed=options.fixed===true;
 const fitAspect=options.fitAspect??(16/9);
 const defaults={
  target:[...(options.target||[0,0,-1.1])],
  yaw:options.yaw??0,
  elevation:options.elevation??(53*Math.PI/180),
  distance:options.distance??49
 };
 const target=[...defaults.target],aim=[...defaults.target];
 let yaw=defaults.yaw,targetYaw=yaw;
 let elevation=defaults.elevation,targetElevation=elevation;
 let distance=defaults.distance,targetDistance=distance;
 const minDist=options.minDistance??25,maxDist=options.maxDistance??115;
 const minElevation=options.minElevation??(22*Math.PI/180);
 const maxElevation=options.maxElevation??(79*Math.PI/180);
 const maxPanX=options.maxPanX??55,maxPanZ=options.maxPanZ??35;
 let active=null,gestureMode=null;
 let touches=new Map(),lastPinch=null,rightDragged=false;
 const allowTouchOrbit=()=>true;
 let width=1920,height=1080,fitDistance=defaults.distance;
 function sizes(w,h){
  const nextWidth=Math.max(1,w),nextHeight=Math.max(1,h);
  // The render loop calls sizes every frame. Never erase the user's wheel zoom.
  if(width===nextWidth&&height===nextHeight)return;
  width=nextWidth;height=nextHeight;
  if(fixed){
   // Refit only when the actual viewport changes (including phone rotation).
   // Preserve the user's zoom ratio without unlocking yaw/elevation or pan.
   const ratio=targetDistance/fitDistance;
   fitDistance=defaults.distance*Math.max(1,fitAspect/(width/height));
   targetDistance=clamp(fitDistance*ratio,
    Math.max(minDist,fitDistance*.32),Math.max(maxDist,fitDistance*1.7));
   distance=targetDistance;
  }
 }
 function recenter(){
  targetYaw=defaults.yaw;targetElevation=defaults.elevation;targetDistance=fixed?fitDistance:defaults.distance;
  aim[0]=defaults.target[0];aim[1]=defaults.target[1];aim[2]=defaults.target[2];
 }
 function setZoom(value){
  // Lock the camera direction, not the zoom. Phone fit may exceed desktop maxDist.
  targetDistance=fixed?clamp(value,Math.max(minDist,fitDistance*.32),
   Math.max(maxDist,fitDistance*1.7)):clamp(value,minDist,maxDist);
 }
 function zoom(factor){setZoom(targetDistance*factor);}
 function pan(dx,dy){
  if(fixed)return;
  const scale=2*targetDistance*Math.tan(fov*Math.PI/360)/height;
  const c=Math.cos(targetYaw),s=Math.sin(targetYaw);
  aim[0]=clamp(aim[0]-c*dx*scale-s*dy*scale,-maxPanX,maxPanX);
  aim[2]=clamp(aim[2]+s*dx*scale-c*dy*scale,defaults.target[2]-maxPanZ,defaults.target[2]+maxPanZ);
 }
 function rotate(dx,dy){
  if(fixed)return;
  targetYaw+=dx*.006;
  targetElevation=clamp(targetElevation-dy*.005,minElevation,maxElevation);
 }
 function pointerDown(e,canOrbit=true){
  if(fixed)return false;
  if(e.pointerType==='touch'){
   touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(touches.size>=2){
    gestureMode='touch-two';lastPinch=null;active=null;return true;
   }
   if(canOrbit){active={id:e.pointerId,mode:'rotate',x:e.clientX,y:e.clientY};gestureMode='touch-one';return true;}
   // Track game-action touches so a second finger can switch to pinch mode.
   gestureMode='touch-game';return false;
  }
  const mode=e.button===2?'rotate':(e.button===1||(e.button===0&&e.shiftKey))?'pan':null;
  if(!mode)return false;
  active={id:e.pointerId,mode,x:e.clientX,y:e.clientY};
  rightDragged=false;gestureMode='mouse';return true;
 }
 function pointerMove(e){
  if(fixed)return false;
  if(e.pointerType==='touch'&&touches.has(e.pointerId)){
   touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(touches.size>=2){
    const pts=[...touches.values()].slice(0,2);
    const mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
    const spread=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
    if(lastPinch){
     pan(mid.x-lastPinch.x,mid.y-lastPinch.y);
     if(lastPinch.spread>1&&spread>1)zoom(lastPinch.spread/spread);
    }
    lastPinch={...mid,spread};return true;
   }
  }
  if(!active||active.id!==e.pointerId)return gestureMode==='touch-two';
  const dx=e.clientX-active.x,dy=e.clientY-active.y;
  active.x=e.clientX;active.y=e.clientY;
  if(active.mode==='pan')pan(dx,dy);else rotate(dx,dy);
  if(Math.hypot(dx,dy)>1)rightDragged=true;
  return true;
 }
 function pointerUp(e){
  if(fixed)return false;
  const tracked=active?.id===e.pointerId;
  const startedMulti=gestureMode==='touch-two';
  if(e.pointerType==='touch'){
   touches.delete(e.pointerId);
   if(touches.size<2)lastPinch=null;
   if(tracked)active=null;
   if(touches.size===1&&startedMulti){
    const [id,p]=[...touches.entries()][0];
    active={id,mode:'rotate',x:p.x,y:p.y};
    gestureMode='touch-one';
   }else if(touches.size===0)gestureMode=null;
   return tracked||startedMulti;
  }
  if(tracked){active=null;gestureMode=null;return true;}
  return false;
 }
 function cancel(){active=null;touches.clear();lastPinch=null;gestureMode=null;}
 function update(dt){
  const k=1-Math.exp(-Math.max(0,Math.min(.12,dt))*12);
  if(fixed){distance=mix(distance,targetDistance,k);return;}
  yaw=mix(yaw,targetYaw,k);elevation=mix(elevation,targetElevation,k);
  distance=mix(distance,targetDistance,k);
  for(let i=0;i<3;i++)target[i]=mix(target[i],aim[i],k);
 }
 function snapshot(){
  const horizontal=Math.cos(elevation)*distance;
  return {
   eye:[target[0]+Math.sin(yaw)*horizontal,target[1]+Math.sin(elevation)*distance,target[2]+Math.cos(yaw)*horizontal],
   target:[...target],distance,yaw,elevation,
   desiredDistance:targetDistance,desiredYaw:targetYaw,desiredElevation:targetElevation,
   pan:[...aim],mode:gestureMode,fov,fixed,fitAspect,fitDistance,viewport:[width,height],
   minDistance:minDist,maxDistance:maxDist
  };
 }
 return Object.freeze({sizes,reset:recenter,zoom,pan,rotate,update,snapshot,pointerDown,pointerMove,pointerUp,cancel,
  get isGesture(){return !!active||gestureMode==='touch-two';},
  get rightDragged(){return rightDragged;}});
}
root.PaperchalkBattleCamera=Object.freeze({version:'1.1.0',create});
})(window);
