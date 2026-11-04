/* One resolution policy for source-PartRig and V4. Preserve aspect ratio.
 * Oversized backing stores must REDUCE resolution, never stop animation.
 * Kept pure and CommonJS-testable; no DOM or GPU assumptions.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(root)root.PaperchalkL2DCanvasBudget=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const DEFAULTS=Object.freeze({maxDpr:2,maxDimension:2560,maxPixels:4194304});
 function backingSize(cssWidth,cssHeight,devicePixelRatio=1,limits=DEFAULTS){
  const w=Number(cssWidth),h=Number(cssHeight);
  if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)
   return {width:0,height:0,scale:0};
  const dpr=Number.isFinite(Number(devicePixelRatio))&&Number(devicePixelRatio)>0
   ?Number(devicePixelRatio):1;
  const maxDpr=Number.isFinite(limits.maxDpr)&&limits.maxDpr>0?limits.maxDpr:DEFAULTS.maxDpr;
  const maxDimension=Number.isFinite(limits.maxDimension)&&limits.maxDimension>=64
   ?limits.maxDimension:DEFAULTS.maxDimension;
  const maxPixels=Number.isFinite(limits.maxPixels)&&limits.maxPixels>=4096
   ?limits.maxPixels:DEFAULTS.maxPixels;
  const scale=Math.min(Math.max(1,dpr),maxDpr,
   maxDimension/w,maxDimension/h,Math.sqrt(maxPixels/(w*h)));
  return {width:Math.max(1,Math.floor(w*scale)),
   height:Math.max(1,Math.floor(h*scale)),scale};
 }
 return Object.freeze({backingSize,DEFAULTS});
});
