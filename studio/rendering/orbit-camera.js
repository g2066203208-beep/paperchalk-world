import {clamp} from './math.js';

/** Keep the Demo framing except where a short landscape stage hides its detail. */
export function defaultOrbitDistance({width,height,gameplay=false}={}){
  // The target is a close diorama shot: the playable landscape fills the
  // phone viewport and the actor remains a readable focal point.
  if(gameplay&&width>height&&height>0)return clamp(8.4*height/380,11,14);
  return width>height&&height>0&&height<380?clamp(19.2*height/380,12,19.2):19.2;
}

/** Presentation-only orbit. It never changes the XY gameplay plane. */
export function createOrbitCamera({camera,domElement,target,onChange,viewport}){
  const defaults={yaw:.02,pitch:.18,distance:defaultOrbitDistance(viewport)};
  let {yaw,pitch,distance}=defaults;
  let followX=target.x;
  let manuallyAdjusted=false;
  const minDistance=8,maxDistance=32,pitchLimit=Math.PI*.5-.015;
  const pointers=new Map(),events=new AbortController();
  let dragging=false,lastX=0,lastY=0,pinchStartDistance=0,pinchStartCameraDistance=distance;
  const options={signal:events.signal};
  function place(){
    const c=Math.cos(pitch);
    camera.position.set(target.x+Math.sin(yaw)*c*distance,target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*c*distance);
    camera.up.set(0,1,0);camera.lookAt(target);
  }
  function changed(manual=false){if(manual)manuallyAdjusted=true;place();onChange();}
  function resize(viewport){
    defaults.distance=defaultOrbitDistance(viewport);
    if(manuallyAdjusted||pointers.size||distance===defaults.distance)return false;
    distance=defaults.distance;
    pinchStartCameraDistance=distance;
    changed();
    return true;
  }
  function follow(x,dt){
    if(!Number.isFinite(x))return false;
    followX=x;
    if(!(dt>0))return false;
    const delta=followX-target.x;
    if(delta===0)return false;
    target.x=Math.abs(delta)<.0001?followX:target.x+delta*(1-Math.exp(-8*dt));
    changed();
    return true;
  }
  function pointerDistance(){const p=[...pointers.values()];return p.length<2?0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}
  function beginPinch(){pinchStartDistance=Math.max(1,pointerDistance());pinchStartCameraDistance=distance;dragging=false;}
  function finishPointer(id){
    pointers.delete(id);
    if(pointers.size===1){const p=pointers.values().next().value;lastX=p.x;lastY=p.y;dragging=true;}
    else dragging=false;
    if(pointers.size<2)pinchStartDistance=0;
  }
  domElement.style.touchAction='none';
  domElement.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    try{domElement.setPointerCapture(e.pointerId);}catch{}
    if(pointers.size===1){dragging=true;lastX=e.clientX;lastY=e.clientY;}
    else if(pointers.size===2)beginPinch();
  },options);
  domElement.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size>=2){
      if(!pinchStartDistance)beginPinch();
      distance=clamp(pinchStartCameraDistance*pinchStartDistance/Math.max(1,pointerDistance()),minDistance,maxDistance);
      changed(true);return;
    }
    if(!dragging)return;
    yaw-=(e.clientX-lastX)*.006;pitch=clamp(pitch+(e.clientY-lastY)*.005,-pitchLimit,pitchLimit);
    lastX=e.clientX;lastY=e.clientY;changed(true);
  },options);
  for(const name of ['pointerup','pointercancel','lostpointercapture'])domElement.addEventListener(name,e=>finishPointer(e.pointerId),options);
  domElement.addEventListener('wheel',e=>{e.preventDefault();distance=clamp(distance+e.deltaY*.012,minDistance,maxDistance);changed(true);},{...options,passive:false});
  window.addEventListener('blur',()=>{pointers.clear();dragging=false;pinchStartDistance=0;},options);
  place();
  return {
    follow,resize,
    reset(){({yaw,pitch,distance}=defaults);manuallyAdjusted=false;target.x=followX;pointers.clear();dragging=false;pinchStartDistance=0;changed();},
    snapshot:()=>({yaw,pitch,distance,target:{x:target.x,y:target.y,z:target.z}}),
    dispose(){events.abort();pointers.clear();}
  };
}
