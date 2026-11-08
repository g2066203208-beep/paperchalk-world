/* Paperchalk metro: deterministic position-driven train movement.
 * The carriage, heroine, camera and L2D never translate. Only scenery and
 * external light sample this travelled distance. No animation timers in GLSL.
 * Scaled cinematic ride: 88 world metres per stop, 6.2 seconds per segment.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.PaperWorldMetroMotion=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const LEG_METERS=88,DURATION_MS=6200;
 const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,Number(v)||0));
 const smooth=x=>{const t=clamp(x);return t*t*(3-2*t)};
 // Smoothstep speed ramps, integrated analytically. Velocity and
 // displacement remain C1 continuous at all phase boundaries.
 const ACCEL=.24,DECEL=.24,CRUISE=1-ACCEL-DECEL;
 const NORM=ACCEL*.5+CRUISE+DECEL*.5;
 const integral=x=>x*x*x-.5*x*x*x*x;
 function sampleLeg(elapsedMs,durationMs=DURATION_MS){
  const d=Math.max(100,Number(durationMs)||DURATION_MS),t=clamp(elapsedMs/d);
  let area,velocity;
  if(t<ACCEL){
   const q=t/ACCEL;
   area=ACCEL*integral(q);velocity=smooth(q);
  }else if(t<ACCEL+CRUISE){
   area=ACCEL*.5+(t-ACCEL);velocity=1;
  }else{
   const q=(1-t)/DECEL;
   area=NORM-DECEL*integral(q);velocity=smooth(q);
  }
  const position=LEG_METERS*area/NORM;
  const speed=velocity*LEG_METERS/(d/1000)/NORM;
  // A station is a WORLD region, not a switch flipped by the UI.
  // Departure moves past the platform; the next platform approaches.
  const nearestStop=Math.min(position,LEG_METERS-position);
  const stationExposure=1-smooth((nearestStop-8)/17);
  const phase=t>=1?'docked':position<19?'departing':
   position>LEG_METERS-19?'arriving':'tunnel';
  return {positionMeters:position,speedMps:speed,stationExposure,
   progress:t,phase,moving:t<1};
 }
 function create({durationMs=DURATION_MS,now=()=>performance.now()}={}){
  let legs=0,startedAt=0,moving=false,version=0;
  function snapshot(time=now()){
   const p=moving?sampleLeg(time-startedAt,durationMs):null;
   const done=!!p&&!p.moving;
   if(done){legs++;moving=false}
   const current=done?null:p;
   const result=current||sampleLeg(DURATION_MS,DURATION_MS);
   return {distanceMeters:(legs+(current?0:0))*LEG_METERS+
     (current?.positionMeters||0),
    speedMps:current?.speedMps||0,stationExposure:current?.stationExposure??1,
    progress:current?.progress??1,phase:current?.phase||'docked',
    moving,legs,version};
  }
  function begin(time=now()){
   if(moving)return false;
   startedAt=time;moving=true;version++;
   return true;
  }
  function reset(){legs=0;startedAt=0;moving=false;version++;return snapshot()}
  function dock(){if(moving){legs++;moving=false}return snapshot()}
  function isMoving(){return moving}
  return Object.freeze({begin,snapshot,reset,dock,isMoving});
 }
 return Object.freeze({LEG_METERS,DURATION_MS,ACCEL,DECEL,sampleLeg,create});
});
