/* Paperchalk Metro — station residents with deterministic spatial boarding.
 * Pure sampling: no random NPC teleportation, no extra requestAnimationFrame.
 * All x/z values are real metres in the SAME WebGL volume as the train,
 * real metal sliding doors, bench and station lighting.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.PaperWorldMetroPlatformLife=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const ATLAS='./assets/metro/commuters/metro-commuter-atlas.svg';
 const CELL_WIDTH=192,CELL_HEIGHT=384,ATLAS_COLUMNS=8,LEG_METERS=88;
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
 const mix=(a,b,t)=>a+(b-a)*t;
 const smooth=v=>{const t=clamp(v);return t*t*(3-2*t)};
 const PROFILE=Object.freeze([
  Object.freeze({id:'office',frame:0,role:'passing',x:-4.25,z:5.85,height:1.76}),
  Object.freeze({id:'student',frame:1,role:'waiting',x:-1.00,z:5.90,height:1.62}),
  Object.freeze({id:'hoodie',frame:2,role:'boarding-left',x:-3.56,z:6.15,height:1.71}),
  Object.freeze({id:'elder',frame:3,role:'waiting',x:1.52,z:5.45,height:1.63}),
  Object.freeze({id:'commuter',frame:4,role:'boarding-right',x:3.48,z:6.00,height:1.68}),
  Object.freeze({id:'worker',frame:5,role:'alighting-left',x:-2.67,z:8.29,height:1.73}),
  Object.freeze({id:'seated-reader',frame:6,role:'sitting',x:-.18,z:5.44,height:1.43}),
  Object.freeze({id:'seated-listener',frame:7,role:'sitting',x:4.30,z:5.44,height:1.42})
 ]);
 // The station box shader uses this exact modular displacement. Platform
 // architecture and passengers MUST travel together when the coach departs.
 function stationOffset(distanceMeters){
  const d=Math.max(0,Number(distanceMeters)||0);
  return ((d+44)%LEG_METERS+LEG_METERS)%LEG_METERS-44;
 }
 function stationNumber(distanceMeters){
  return Math.floor((Math.max(0,Number(distanceMeters)||0)+44)/LEG_METERS);
 }
 function lightCue(nowMs=0,station=0,anomaly=false){
  if(anomaly)return 0;
  const t=Math.max(0,Number(nowMs)||0);
  // A subtle powered fluorescent breathing/fault sequence. No all-white
  // screen flash. Dips are deliberately sparse and deterministic.
  const beat=(t+station*1137)%10900;
  const dip=beat>7480&&beat<7590 ? .26 : beat>7630&&beat<7725 ? .49 : 1;
  const hum=.975+.025*Math.sin(t*.0015+station*1.37);
  return clamp(dip*hum,.18,1);
 }
 // Unlike the historical demonstration atlas, these are REAL approved
 // identities selected by the persistent NPC route/boarding controller.
 // No actor is invented here; no random platform placement or teleport.
 const REAL_WAIT_X=[-3.55,-1.48,1.22,3.55,-4.1,4.03];
 function sampleApproved({realActors=[],distanceMeters=0,stationExposure=1,
   nowMs=0,anomaly=false}={}){
  const offset=stationOffset(distanceMeters),exposed=clamp(stationExposure);
  const passengers=[];
  if(exposed<.045||anomaly)return passengers;
  const unique=new Set();
  for(const person of realActors){
   if(!person?.id||!person.art||unique.has(person.id)||passengers.length>=6)continue;
   unique.add(person.id);
   const i=passengers.length,progress=clamp(person.progress),role=person.role;
   const waitX=REAL_WAIT_X[i],doorX=i%2?2.67:-2.67;
   let x=waitX,z=5.54+(i%3)*.15;
   const walk=role==='boarding'||role==='alighting';
   if(role==='boarding'){
    x=mix(waitX,doorX,progress);z=mix(z,8.31,progress);
   }else if(role==='alighting'){
    x=mix(doorX,waitX,progress);z=mix(8.31,z,progress);
   }
   const moving=walk&&progress>.025&&progress<.975;
   passengers.push({id:person.id,role,frame:null,
    x:x-offset,z,y:-.16+(moving?Math.abs(Math.sin(nowMs*.01+i))*.013:0),
    height:person.geometry?.heightMeters||1.6,
    opacity:exposed,progress,
    view:role==='boarding'&&progress>.36?'back':
     role==='alighting'&&progress<.60?'front':'side_left',
    geometry:person.geometry,sprites:person.sprites,
    moving,lean:moving?(.009*Math.sin(nowMs*.011+i)):0});
  }
  return passengers;
 }
 function sample({distanceMeters=0,stationExposure=1,doorOpen=0,moving=false,
   dwellMs=0,nowMs=0,doorOpenedEver=false,anomaly=false,realActors=null}={}){
  const offset=stationOffset(distanceMeters);
  const station=stationNumber(distanceMeters);
  const exposed=clamp(stationExposure);
  const door=clamp(doorOpen);
  const time=Math.max(0,Number(nowMs)||0);
  const dwell=Math.max(0,Number(dwellMs)||0);
  // Latch the first real opening. Closing doors and acceleration must
  // NEVER teleport a half-boarded commuter back to the waiting area.
  const passage=smooth((dwell-430)/2200)*
   (doorOpenedEver?1:smooth((door-.18)/.7));
  const crowd=PROFILE.map((p,i)=>{
   let x=p.x,z=p.z,opacity=1,movingFeet=false;
   if(p.role==='passing'){
    // Walking parallel to the platform edge, not across the tracks.
    x+=1.42*Math.sin(time*.00028+station*.82);
    movingFeet=true;
   }else if(p.role==='boarding-left'||p.role==='boarding-right'){
    const target=p.role==='boarding-left'?-2.67:2.67;
    const amount=passage;
    x=mix(x,target,amount);
    z=mix(z,8.31,amount);
    opacity=1-smooth((amount-.82)/.18);
    movingFeet=amount>.03&&amount<.96;
   }else if(p.role==='alighting-left'){
    const amount=passage;
    z=mix(8.29,6.55,amount);
    x=mix(-2.67,-2.12,amount);
    // No passenger clips through an almost-closed metal leaf.
    opacity=(door>.82||(doorOpenedEver&&passage>.35))?1:0;
    movingFeet=amount>.03&&amount<.96;
   }else if(p.role==='waiting'){
    // A human fidgets and shifts weight rather than hovering in place.
    x+=Math.sin(time*.00048+i*2.7)*.045;
   }
   // A window can only reveal people physically present at a station.
   // A 0.04 m foot rise on real walk frames gives subtle activity;
   // seated readers only tilt their head, never bounce off the bench.
   const gait=movingFeet?Math.abs(Math.sin(time*.011+i*1.72))*.025:0;
   if(p.role==='sitting')z+=Math.sin(time*.0006+i)*.008;
   return {id:p.id,frame:p.frame,role:p.role,
    x:x-offset,y:-.16+gait,z,height:p.height,
    opacity:clamp(opacity*exposed),moving:movingFeet,
    lean:p.role==='sitting' ? .012*Math.sin(time*.001+i) : movingFeet ? .014*Math.sin(time*.011+i) : 0};
  });
  return {station,offsetMeters:offset,lampFactor:lightCue(nowMs,station,anomaly),
   passengers:Array.isArray(realActors)?sampleApproved({realActors,distanceMeters,stationExposure,nowMs,anomaly}):
    exposed>.045&&!anomaly?crowd.filter(p=>p.opacity>.025):[]};
 }
 return Object.freeze({ATLAS,CELL_WIDTH,CELL_HEIGHT,ATLAS_COLUMNS,LEG_METERS,
  PROFILE,stationNumber,stationOffset,lightCue,sample,sampleApproved});
});
