/**
 * Animate a handoff by moving the authored Three.js world nodes themselves.
 *
 * There is intentionally no DOM element here.  The renderer keeps showing the
 * same world while its paper groups fall toward the camera; at the centre
 * crease the caller swaps the state, then the groups rise back into place.
 */
const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));
const smoothstep=value=>{const t=clamp01(value);return t*t*(3-2*t);};

function snapshot(node){
  const p=node.position??{},r=node.rotation??{},s=node.scale??{};
  return {
    position:{x:Number(p.x)||0,y:Number(p.y)||0,z:Number(p.z)||0},
    rotation:{x:Number(r.x)||0,y:Number(r.y)||0,z:Number(r.z)||0},
    scale:{x:Number(s.x)||1,y:Number(s.y)||1,z:Number(s.z)||1}
  };
}
function assign(node,base,offset){
  const p=node.position??(node.position={}),r=node.rotation??(node.rotation={}),s=node.scale??(node.scale={});
  p.x=base.position.x+offset.x;p.y=base.position.y+offset.y;p.z=base.position.z+offset.z;
  r.x=base.rotation.x+offset.rx;r.y=base.rotation.y+offset.ry;r.z=base.rotation.z+offset.rz;
  s.x=base.scale.x;s.y=base.scale.y;s.z=base.scale.z;
}

export function createWorldHandoff({groups=[],duration=1.14,reducedMotion=false}={}){
  const nodes=[...new Set((groups??[]).filter(Boolean))];
  let active=false,elapsed=0,totalDuration=Math.max(.2,Number(duration)||1.14);
  let kind='surface',midpointReached=false,resolveCurrent=null,onMidpoint=null,onComplete=null;
  let bases=[];

  function capture(){bases=nodes.map(node=>({node,base:snapshot(node)}));}
  function place(offset){for(const item of bases)assign(item.node,item.base,offset);}
  function start(options={}){
    if(active)cancel();
    kind=options.kind??'surface';elapsed=0;midpointReached=false;active=true;
    onMidpoint=typeof options.onMidpoint==='function'?options.onMidpoint:null;
    onComplete=typeof options.onComplete==='function'?options.onComplete:null;
    totalDuration=reducedMotion?.2:Math.max(.2,Number(options.duration??duration)||1.14);
    capture();
    // A broad downward fall plus a small forward tilt gives the cards a
    // tangible hinge without hiding the game behind a flat colour.
    place({x:0,y:0,z:0,rx:0,ry:0,rz:0});
    return new Promise(resolve=>{resolveCurrent=resolve;});
  }
  function update(dt=0){
    if(!active)return false;
    elapsed+=Math.max(0,Math.min(.1,Number(dt)||0));
    const progress=clamp01(elapsed/totalDuration);
    if(progress<.5){
      const e=smoothstep(progress*2);
      place({x:0,y:-7.2*e,z:1.55*e,rx:-.42*e,ry:0,rz:(kind==='surface'?.10:-.08)*e});
    }else{
      if(!midpointReached){
        midpointReached=true;
        try{onMidpoint?.();}catch(error){queueMicrotask(()=>{throw error;});}
      }
      const e=1-smoothstep((progress-.5)*2);
      // The incoming set starts at the crease and unfolds upward into its
      // original authored positions.  This is the visible world doing the
      // reveal; no screen-space mask is involved.
      place({x:0,y:-5.25*e,z:1.12*e,rx:-.30*e,ry:0,rz:(kind==='surface'?.07:-.06)*e});
    }
    if(progress>=1){
      active=false;place({x:0,y:0,z:0,rx:0,ry:0,rz:0});
      try{onComplete?.();}catch(error){queueMicrotask(()=>{throw error;});}
      const resolve=resolveCurrent;resolveCurrent=null;resolve?.(true);
    }
    return true;
  }
  function cancel(){
    if(!active)return false;
    active=false;place({x:0,y:0,z:0,rx:0,ry:0,rz:0});
    const resolve=resolveCurrent;resolveCurrent=null;resolve?.(false);
    return true;
  }
  function getState(){return {active,elapsed,duration:totalDuration,progress:clamp01(elapsed/totalDuration),kind,domOverlay:false};}
  function dispose(){cancel();bases=[];onMidpoint=null;onComplete=null;}
  return {start,update,cancel,isActive:()=>active,getState,dispose,nodes};
}

export {clamp01 as clampHandoffProgress,smoothstep as handoffSmoothstep};
