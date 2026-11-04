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
  return Object.freeze({create});
});
