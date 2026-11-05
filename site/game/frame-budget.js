/* A deterministic cadence budget for optional visual overlays.
 * The primary WebGL/CPU world simulation remains on the browser's rAF.
 * Separate canvas resampling is capped without tying it to a fixed timer.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(root)root.PaperWorldFrameBudget=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:null,function(){
  'use strict';
  function create({fps=30,maxDeltaSeconds=.12,minFramesBetween=2}={}){
    if(!Number.isFinite(fps)||fps<1||fps>120)
      throw new RangeError('fps must be 1..120');
    if(!Number.isFinite(maxDeltaSeconds)||maxDeltaSeconds<=0)
      throw new RangeError('maxDeltaSeconds must be positive');
    if(!Number.isSafeInteger(minFramesBetween)||minFramesBetween<1||minFramesBetween>12)
      throw new RangeError('minFramesBetween must be 1..12');
    const minIntervalMs=1000/fps;
    let lastAt=null,invalidated=true,frames=0,skipped=0,callsSincePaint=0;
    function sample(now){
      if(!Number.isFinite(now))return null;
      if(lastAt!==null&&now<lastAt){
        lastAt=null;invalidated=true;callsSincePaint=0;
      }
      callsSincePaint++;
      // Never let secondary fog consume every available frame when the
      // WORLD rAF slows down on integrated GPUs or software compositors.
      if(!invalidated&&lastAt!==null&&
         (now-lastAt<minIntervalMs-.01||callsSincePaint<minFramesBetween)){
        skipped++;
        return null;
      }
      const dt=lastAt===null?1/fps:
        Math.min(maxDeltaSeconds,Math.max(0,(now-lastAt)/1000));
      lastAt=now;invalidated=false;callsSincePaint=0;frames++;
      return {dt,frames};
    }
    return Object.freeze({
      sample,
      invalidate(){invalidated=true},
      reset(){lastAt=null;invalidated=true;callsSincePaint=0},
      inspect(){return {fps,minFramesBetween,frames,skipped,invalidated,lastAt}}
    });
  }
  // Fixed-size, allocation-free per-frame telemetry for the real world rAF.
  // Percentiles are calculated only when DEV explicitly asks for metrics.
  function createTiming({capacity=240,slowFrameMs=50}={}){
    if(!Number.isSafeInteger(capacity)||capacity<16||capacity>4096)
      throw new RangeError('capacity must be 16..4096');
    if(!Number.isFinite(slowFrameMs)||slowFrameMs<=0)
      throw new RangeError('slowFrameMs must be positive');
    const timings=new Float32Array(capacity);
    let index=0,count=0,previous=null,totalFrames=0,slowFrames=0;
    function record(now){
      if(!Number.isFinite(now))return;
      if(previous!==null){
        const elapsed=now-previous;
        // Do not claim a multi-minute background tab is a dropped frame.
        if(elapsed>0&&elapsed<=250){
          timings[index]=elapsed;
          index=(index+1)%capacity;
          count=Math.min(count+1,capacity);
          totalFrames++;
          if(elapsed>slowFrameMs)slowFrames++;
        }
      }
      previous=now;
    }
    function inspect(){
      if(!count)return {samples:0,fps:0,meanMs:0,p50Ms:0,p95Ms:0,
        slowFrames,totalFrames};
      const sorted=Array.from(timings.subarray(0,count)).sort((a,b)=>a-b);
      const sum=sorted.reduce((s,n)=>s+n,0);
      const mean=sum/count;
      return {samples:count,fps:Number((1000/mean).toFixed(1)),
        meanMs:Number(mean.toFixed(2)),
        p50Ms:Number(sorted[Math.ceil(count*.5)-1].toFixed(2)),
        p95Ms:Number(sorted[Math.ceil(count*.95)-1].toFixed(2)),
        slowFrames,totalFrames};
    }
    return Object.freeze({record,inspect,pause(){previous=null}});
  }
  return Object.freeze({create,createTiming});
});
