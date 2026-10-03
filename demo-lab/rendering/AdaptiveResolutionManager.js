
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function recommendedPixelRatio({devicePixelRatio=1,compact=false}={}){
  const native=Number.isFinite(devicePixelRatio)&&devicePixelRatio>0?devicePixelRatio:1;
  return Math.min(native,compact?1.75:2);
}

export function createAdaptiveResolutionManager({renderer,getViewport,onChanged=()=>{}}={}){
  if(!renderer)throw new TypeError('AdaptiveResolutionManager requires a renderer.');
  let current=1,averageMs=16.7,samples=0,cooldown=0;
  function limits(){
    const compact=!!getViewport?.().compact;
    const native=Math.max(1,window.devicePixelRatio||1);
    return {min:Math.min(native,compact?1.25:1.35),max:Math.min(native,compact?1.75:2)};
  }
  function apply(value){
    const {min,max}=limits(),next=clamp(value,min,max);
    if(Math.abs(next-current)<.025)return false;
    current=next;renderer.setPixelRatio(current);onChanged(current);return true;
  }
  function reset(){
    const viewport=getViewport?.()??{};
    current=recommendedPixelRatio({devicePixelRatio:window.devicePixelRatio||1,compact:viewport.compact});
    renderer.setPixelRatio(current);averageMs=16.7;samples=0;cooldown=0;return current;
  }
  function sample(frameMs){
    if(!Number.isFinite(frameMs)||frameMs<=0||frameMs>100)return false;
    averageMs=averageMs*.94+frameMs*.06;samples++;if(cooldown>0){cooldown--;return false;}
    if(samples<90)return false;
    let next=current;
    if(averageMs>22.5)next=current-.12;
    else if(averageMs<14.2)next=current+.08;
    if(Math.abs(next-current)<.025)return false;
    const changed=apply(next);if(changed){samples=0;cooldown=90;}return changed;
  }
  function stats(size={}){
    return {
      pixelRatio:current,
      nativePixelRatio:window.devicePixelRatio||1,
      averageFrameMs:averageMs,
      drawingBuffer:{width:renderer.domElement.width,height:renderer.domElement.height},
      css:{width:size.width??renderer.domElement.clientWidth,height:size.height??renderer.domElement.clientHeight},
    };
  }
  reset();
  return {reset,apply,sample,stats,get pixelRatio(){return current;}};
}
