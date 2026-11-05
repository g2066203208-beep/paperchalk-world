/* Single pinhole camera for all Paperchalk World scene planes.
 * One coordinate system: CSS Z grows toward the camera, optical center at
 * (0,0,FOCAL). True yaw/pitch and limited lateral camera translation produce
 * distance-dependent parallax, not independent per-layer animation knobs.
 * The near heroine is a camera-followed billboard at player Z; the original
 * approved close-up crop remains unchanged.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PaperWorldSceneCamera=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const FOCAL=950;
  const DEFAULT_DEPTHS=Object.freeze({background:-235,enemy:-40,
    fog:90,player:300,ground:-215});
  const MAX_YAW=1.7*Math.PI/180;
  const MAX_PITCH=1.1*Math.PI/180;
  const max=(n,lo,hi)=>Math.max(lo,Math.min(n,hi));
  const fmt=n=>Number(n.toFixed(8));
  function pose(inputX=0,inputY=0,viewportHeight=720){
    const a=max(Number(inputX)||0,-1,1);
    const b=max(Number(inputY)||0,-1,1);
    const factor=max((Number(viewportHeight)||720)/720,.45,1.35);
    return {yaw:a*MAX_YAW*factor,pitch:b*MAX_PITCH*factor,
      x:a*26*factor,y:b*12*factor,z:FOCAL};
  }
  function cameraSpace(p,cam){
    const cy=Math.cos(cam.yaw),sy=Math.sin(cam.yaw);
    const cp=Math.cos(cam.pitch),sp=Math.sin(cam.pitch);
    const x=p.x-cam.x,y=p.y-cam.y,z=p.z-FOCAL;
    const rx=cy*x+sy*z;
    const rz=-sy*x+cy*z;
    return {x:rx,y:cp*y+sp*rz,
      depth:sp*y-cp*rz};
  }
  function project(p,cam,focal=FOCAL){
    const v=cameraSpace(p,cam);
    if(v.depth<=1)return {valid:false,reason:'behind-camera'};
    return {valid:true,x:focal*v.x/v.depth,
      y:focal*v.y/v.depth,depth:v.depth};
  }
  function planeMatrix(z,cam,focal=FOCAL){
    const depth=focal-z;
    if(!(depth>100)||!Number.isFinite(depth))
      return {valid:false,reason:'plane-behind-camera'};
    // A point separated by 1 original screen pixel is separated by
    // depth/focal in 3D world coordinates. Thus neutral pose == identity.
    const s=depth/focal;
    const p=cameraSpace({x:0,y:0,z},cam);
    const x=cameraSpace({x:s,y:0,z},cam);
    const y=cameraSpace({x:0,y:s,z},cam);
    if(p.depth<=1)return {valid:false,reason:'plane-behind-camera'};
    const a=focal*(x.x-p.x)/p.depth;
    const b=focal*(y.x-p.x)/p.depth;
    const c=focal*p.x/p.depth;
    const d=focal*(x.y-p.y)/p.depth;
    const e=focal*(y.y-p.y)/p.depth;
    const f=focal*p.y/p.depth;
    const g=(x.depth-p.depth)/p.depth;
    const h=(y.depth-p.depth)/p.depth;
    const values=[a,d,0,g,b,e,0,h,0,0,1,0,c,f,0,1];
    if(!values.every(Number.isFinite))return {valid:false,reason:'bad-matrix'};
    return {valid:true,values,
      css:'matrix3d('+values.map(fmt).join(',')+')'};
  }
  function billboard(z,cam,focal=FOCAL){
    const p=project({x:0,y:0,z},cam,focal);
    if(!p.valid)return p;
    return {...p,scale:(focal-z)/p.depth,
      css:'translate3d('+fmt(p.x)+'px,'+fmt(p.y)+
        'px,0) scale('+fmt((focal-z)/p.depth)+')'};
  }
  // For any world point, increasing negative Z means farther away;
  // camera translation causes inverse-distance displacement.
  function disparity(zNear,zFar,cam,focal=FOCAL){
    const a=billboard(zNear,cam,focal),b=billboard(zFar,cam,focal);
    if(!a.valid||!b.valid)return NaN;
    return Math.hypot(a.x-b.x,a.y-b.y);
  }
  function cameraFollowPosition(z,cam){
    // Intersection between the center viewing ray and the near actor Z plane.
    const cy=Math.cos(cam.yaw),sy=Math.sin(cam.yaw);
    const cp=Math.cos(cam.pitch),sp=Math.sin(cam.pitch);
    const rayX=sy*cp,rayY=sp,rayZ=-cy*cp;
    const t=(z-FOCAL)/rayZ;
    return {x:cam.x+rayX*t,y:cam.y+rayY*t,z};
  }
  function inspect(config,cam){
    const g=config?.ground||{},f=Number(config?.fog?.z??DEFAULT_DEPTHS.fog);
    const groundShift=Number(g.z??DEFAULT_DEPTHS.ground)-DEFAULT_DEPTHS.ground;
    const bz=Number(config?.bg?.z??DEFAULT_DEPTHS.background);
    const ez=Math.min(Number(config?.enemy?.z??DEFAULT_DEPTHS.enemy),f-12)+groundShift;
    const pz=Math.max(Number(config?.player?.z??DEFAULT_DEPTHS.player),f+12)+groundShift;
    return {focalLength:FOCAL,camera:{...cam},
      depths:{background:bz,enemy:ez,fog:f,
        player:pz,ground:Number(g.z??DEFAULT_DEPTHS.ground)},
      distances:{background:FOCAL-bz,enemy:FOCAL-ez,player:FOCAL-pz},
      horizonPercent:Number(g.horizon??52),nearActor:cameraFollowPosition(pz,cam),
      disparityPx:disparity(ez,bz,cam)};
  }
  return Object.freeze({FOCAL,DEFAULT_DEPTHS,pose,project,planeMatrix,
    billboard,disparity,cameraFollowPosition,inspect});
});