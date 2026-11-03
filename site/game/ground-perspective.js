/* Common planar-floor perspective. All units are logical-viewport pixels.
 * A character is anchored by its actual shoe contact on ONE floor plane.
 * Sizes follow character height and projected shoe distance from horizon,
 * never a fixed multiplier based on arbitrary L2D layer numbers.
 * Draft height values can be replaced when the character canon is confirmed.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PaperWorldPerspectiveGround=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null,function(){
  'use strict';
  const CHARACTER_DATA=Object.freeze({
    protagonist:Object.freeze({heightCm:162,crown:.033,sole:.978,confirmedHeight:false}),
    'char-002':Object.freeze({heightCm:155,crown:.034,sole:.988,confirmedHeight:false})
  });
  const FALLBACK=Object.freeze({heightCm:162,crown:.035,sole:.985,confirmedHeight:false});
  function metricsFor(id){return CHARACTER_DATA[id]||FALLBACK}
  const FLOOR_ORIGIN=Object.freeze({y:77,z:-215});
  // The floor owns a shared world translation. Every character keeps its
  // authored local X/Y and Z offset relative to that floor. Moving the
  // floor displaces ALL attached characters by the same world delta.
  function floorMotion({y=FLOOR_ORIGIN.y,z=FLOOR_ORIGIN.z},viewportHeight){
    if(!Number.isFinite(y)||!Number.isFinite(z)||!Number.isFinite(viewportHeight)||viewportHeight<=0)
      return {valid:false,reason:'invalid-floor'};
    return {
      valid:true,
      screenDeltaY:viewportHeight*(y-FLOOR_ORIGIN.y)/100,
      worldDeltaZ:z-FLOOR_ORIGIN.z
    };
  }
  function fit({referenceHeightCm,actorHeightCm,referenceCanvasHeight,
      referenceCanvasBottom,actorCanvasBottom,actorPlaneHeight,
      horizonY,referenceCrown=.033,referenceSole=.978,
      actorCrown=.034,actorSole=.988}={}){
    const numbers=[referenceHeightCm,actorHeightCm,referenceCanvasHeight,
      referenceCanvasBottom,actorCanvasBottom,actorPlaneHeight,horizonY,
      referenceCrown,referenceSole,actorCrown,actorSole];
    if(!numbers.every(Number.isFinite)||referenceHeightCm<=0||actorHeightCm<=0||
       referenceCanvasHeight<=0||actorPlaneHeight<=0||referenceSole<=referenceCrown||
       actorSole<=actorCrown||referenceSole>1||actorSole>1){
      return {valid:false,reason:'invalid-geometry'};
    }
    const referenceFootY=referenceCanvasBottom-referenceCanvasHeight*(1-referenceSole);
    const referenceDist=referenceFootY-horizonY;
    const actorDist=actorCanvasBottom-horizonY;
    if(referenceDist<=1||actorDist<=1)return {valid:false,reason:'foot-above-horizon',
      referenceFootY,actorCanvasBottom,horizonY};
    const physicalRatio=actorHeightCm/referenceHeightCm;
    const referenceVisible=referenceSole-referenceCrown;
    const actorVisible=actorSole-actorCrown;
    // Solve exactly, including the transparent padding below the shoes.
    const coeff=(referenceCanvasHeight*referenceVisible*physicalRatio)/
      (actorVisible*referenceDist);
    const heightPx=coeff*actorDist/(1+coeff*(1-actorSole));
    const actorFootY=actorCanvasBottom-heightPx*(1-actorSole);
    const depthRatio=(actorFootY-horizonY)/referenceDist;
    const relativeVisibleHeight=heightPx*actorVisible/(referenceCanvasHeight*referenceVisible);
    const sizePercent=heightPx/actorPlaneHeight*100;
    return {valid:true,sizePercent,heightPx,actorFootY,referenceFootY,
      horizonY,physicalRatio,depthRatio,relativeVisibleHeight,
      referenceVisible,actorVisible};
  }
  // Camera-space depth convention matches CSS translateZ: positive Z is
  // closer to the camera. This bounded pinhole ratio is dimensionless.
  // A grounded actor looks smaller as Z decreases (farther away).
  const CAMERA=Object.freeze({focalLength:1150,referenceZ:160,
    minDenominator:180,maxScale:4.5});
  function depthScale(z,referenceZ=CAMERA.referenceZ,
      focalLength=CAMERA.focalLength){
    if(!Number.isFinite(z)||!Number.isFinite(referenceZ)||
       !Number.isFinite(focalLength)||focalLength<=referenceZ+CAMERA.minDenominator)
      return NaN;
    const near=Math.max(CAMERA.minDenominator,focalLength-z);
    const ref=focalLength-referenceZ;
    return Math.min(CAMERA.maxScale,Math.max(.1,ref/near));
  }
  // The authoritative baseline is the ORIGINAL 1024x1024 L2D visible
  // crown-to-shoe span; different characters have different transparent
  // margins. Size normalization is independent of their canvas dimensions.
  // 3D DEV already adds camera projection; normal 2D game needs the
  // mathematically equivalent Z scale factor.
  function renderScale({actorHeightCm,referenceHeightCm,
      actorCanvasHeight,referenceCanvasHeight,actorVisibleFraction,
      referenceVisibleFraction,actorZ,referenceZ=CAMERA.referenceZ,
      focalLength=CAMERA.focalLength,dev=false}={}){
    if(![actorHeightCm,referenceHeightCm,actorCanvasHeight,
      referenceCanvasHeight,actorVisibleFraction,referenceVisibleFraction,actorZ]
      .every(Number.isFinite)||actorHeightCm<=0||referenceHeightCm<=0||
      actorCanvasHeight<=0||referenceCanvasHeight<=0||
      actorVisibleFraction<=0||referenceVisibleFraction<=0)
      return {valid:false,reason:'invalid-character'};
    const stature=actorHeightCm/referenceHeightCm;
    const correction=(referenceCanvasHeight*referenceVisibleFraction*stature)/
      (actorCanvasHeight*actorVisibleFraction);
    const distance=depthScale(actorZ,referenceZ,focalLength);
    if(!Number.isFinite(distance))return {valid:false,reason:'invalid-camera'};
    const scale=correction*(dev?1:distance);
    return {valid:Number.isFinite(scale),scale,correction,distance,
      stature,dev,actorZ,referenceZ};
  }
  return Object.freeze({CHARACTER_DATA,FLOOR_ORIGIN,CAMERA,
    floorMotion,depthScale,renderScale,metricsFor,fit});
});
