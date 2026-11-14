/* Paperchalk World: shared, damped 3D strategy camera.
 * In fixed tactical mode the approved fit is the absolute far zoom limit.
 * Zooming IN unlocks bounded panning (mouse right/middle drag, edge scrolling,
 * shift-drag, or two-finger mobile pan/pinch). Angle never changes.
 * Normal 3D orbit behavior remains available to non-fixed consumers.
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
 const touches=new Map();
 let lastPinch=null,rightDragged=false,touchGestureConsumed=false,edgePointer=null;
 let width=1920,height=1080,fitDistance=defaults.distance;
 // maxPan is the physical half-size of the playable footprint in fixed mode.
 // The free margin grows with zoom so that the camera never leaves the board.
 const safeFactor=clamp(options.safeFactor??.90,.2,1);
 const minZoomRatio=clamp(options.minZoomRatio??.32,.12,.9);
 const edgeSpeed=options.edgeSpeed??14;
 const isZoomed=()=>fixed&&targetDistance<fitDistance-.001;
 function panLimit(atDistance=targetDistance){
  if(!fixed)return {x:maxPanX,z:maxPanZ};
  const free=clamp(1-atDistance/fitDistance,0,1);
  return {x:maxPanX*free*safeFactor,z:maxPanZ*free*safeFactor};
 }
 function constrainAim(){
  if(!fixed)return;
  const {x,z}=panLimit();
  aim[0]=clamp(aim[0],defaults.target[0]-x,defaults.target[0]+x);
  aim[2]=clamp(aim[2],defaults.target[2]-z,defaults.target[2]+z);
  aim[1]=defaults.target[1];
 }
 function constrainTarget(){
  if(!fixed)return;
  const {x,z}=panLimit(distance);
  target[0]=clamp(target[0],defaults.target[0]-x,defaults.target[0]+x);
  target[2]=clamp(target[2],defaults.target[2]-z,defaults.target[2]+z);
  target[1]=defaults.target[1];
 }
 function sizes(w,h){
  const nextWidth=Math.max(1,w),nextHeight=Math.max(1,h);
  // The render loop calls sizes every frame. Never erase the user's wheel zoom.
  if(width===nextWidth&&height===nextHeight)return;
  width=nextWidth;height=nextHeight;
  if(fixed){
   // Refit only on an actual viewport change (e.g. phone rotation).
   // Never allow the camera farther away than this viewport's approved fit.
   const ratio=clamp(targetDistance/fitDistance,minZoomRatio,1);
   fitDistance=defaults.distance*Math.max(1,fitAspect/(width/height));
   targetDistance=clamp(fitDistance*ratio,
    Math.min(fitDistance,Math.max(minDist,fitDistance*minZoomRatio)),fitDistance);
   distance=targetDistance;
   // Panning is measured in world-space and is re-clamped after any refit.
   constrainAim();constrainTarget();
  }
 }
 function recenter(){
  targetYaw=defaults.yaw;targetElevation=defaults.elevation;
  targetDistance=fixed?fitDistance:defaults.distance;
  aim[0]=defaults.target[0];aim[1]=defaults.target[1];aim[2]=defaults.target[2];
 }
 function setZoom(value){
  targetDistance=fixed?
   clamp(value,Math.min(fitDistance,Math.max(minDist,fitDistance*minZoomRatio)),fitDistance):
   clamp(value,minDist,maxDist);
  constrainAim(); // Zooming back out automatically pulls the safe view inward.
 }
 function zoom(factor){
  // Requested tactical rule: scroll/pinch only zooms IN; reset (0) restores fit.
  if(fixed&&factor>=1)return;
  setZoom(targetDistance*factor);
 }
 function pan(dx,dy){
  if(fixed&&!isZoomed())return;
  const scale=2*targetDistance*Math.tan(fov*Math.PI/360)/height;
  const c=Math.cos(targetYaw),s=Math.sin(targetYaw);
  aim[0]=clamp(aim[0]-c*dx*scale-s*dy*scale,-maxPanX,maxPanX);
  aim[2]=clamp(aim[2]+s*dx*scale-c*dy*scale,defaults.target[2]-maxPanZ,defaults.target[2]+maxPanZ);
  constrainAim();
 }
 function pointerHover(e,rect){
  if(!fixed||!rect||e.pointerType==='touch'||!rect.width||!rect.height){
   edgePointer=null;return;
  }
  const x=(e.clientX-rect.left)/rect.width,y=(e.clientY-rect.top)/rect.height;
  edgePointer=x>=0&&x<=1&&y>=0&&y<=1?{x,y}:null;
 }
 function edgePan(dt,allowed=true){
  if(!fixed||!isZoomed()||!allowed||!edgePointer||active||gestureMode==='touch-two')return;
  const margin=.085;
  const v=n=>n<margin?-(margin-n)/margin:n>1-margin?(n-(1-margin))/margin:0;
  const dx=v(edgePointer.x),dy=v(edgePointer.y);
  if(Math.abs(dx)+Math.abs(dy)<.015)return;
  const velocity=edgeSpeed*Math.min(.05,Math.max(0,dt));
  const c=Math.cos(targetYaw),s=Math.sin(targetYaw);
  aim[0]+=(c*dx+s*dy)*velocity;
  aim[2]+=(-s*dx+c*dy)*velocity;
  constrainAim();
 }
 function rotate(dx,dy){
  if(fixed)return;
  targetYaw+=dx*.006;
  targetElevation=clamp(targetElevation-dy*.005,minElevation,maxElevation);
 }
 function pointerDown(e,canOrbit=true){
  if(e.pointerType==='touch'){
   touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(touches.size>=2){
    gestureMode='touch-two';lastPinch=null;active=null;
    touchGestureConsumed=true;return true;
   }
   if(fixed){
    // A single finger must still play/deploy cards normally.
    gestureMode='touch-game';return false;
   }
   if(canOrbit){active={id:e.pointerId,mode:'rotate',x:e.clientX,y:e.clientY};gestureMode='touch-one';return true;}
   gestureMode='touch-game';return false;
  }
  const mode=e.button===2?(fixed?'pan':'rotate'):
   (e.button===1||(e.button===0&&e.shiftKey))?'pan':null;
  if(!mode||(fixed&&!isZoomed()))return false;
  active={id:e.pointerId,mode,x:e.clientX,y:e.clientY};
  edgePointer=null;rightDragged=false;gestureMode='mouse';return true;
 }
 function pointerMove(e){
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
  const tracked=active?.id===e.pointerId;
  const startedMulti=gestureMode==='touch-two';
  if(e.pointerType==='touch'){
   touches.delete(e.pointerId);
   if(touches.size<2)lastPinch=null;
   if(tracked)active=null;
   if(touches.size===1&&startedMulti){
    gestureMode='touch-game';active=null;
   }else if(touches.size===0)gestureMode=null;
   const consumed=touchGestureConsumed||tracked||startedMulti;
   if(touches.size===0)touchGestureConsumed=false;
   return consumed;
  }
  if(tracked){active=null;gestureMode=null;return true;}
  return false;
 }
 function cancel(){
  active=null;touches.clear();lastPinch=null;gestureMode=null;
  edgePointer=null;touchGestureConsumed=false;
 }
 function update(dt){
  const k=1-Math.exp(-Math.max(0,Math.min(.12,dt))*12);
  if(fixed){
   distance=mix(distance,targetDistance,k);
   for(let i=0;i<3;i++)target[i]=mix(target[i],aim[i],k);
   constrainTarget();return;
  }
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
   pan:[...aim],mode:gestureMode,fov,fixed,fitAspect,fitDistance,
   safePan:panLimit(),zoomed:isZoomed(),zoomRatio:targetDistance/fitDistance,
   viewport:[width,height],minDistance:minDist,
   maxDistance:fixed?fitDistance:maxDist
  };
 }
 return Object.freeze({sizes,reset:recenter,zoom,pan,rotate,update,snapshot,
  pointerDown,pointerMove,pointerUp,pointerHover,edgePan,cancel,
  get isGesture(){return !!active||gestureMode==='touch-two';},
  get rightDragged(){return rightDragged;}});
}
root.PaperchalkBattleCamera=Object.freeze({version:'1.2.0',create});
})(window);
