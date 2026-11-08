/* Metro NPC staging — world meters + actual perspective, never CSS overlay.
 * This is a placement/calibration contract ONLY. Rejected NPC-G001 artwork is
 * deliberately not loaded, auto-spawned or displayed by this module.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(root)root.PaperWorldMetroNpcStaging=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const CONFIG=Object.freeze({
  geometry:Object.freeze({halfWidth:4.25,backZ:8.0,nearZ:10.90,ceilingY:2.85}),
  // These are ordinary back-row commuter anchor *slots*, not active NPCs.
  slots:Object.freeze([
   Object.freeze({id:'back-left',x:-.55,y:0,z:8.37}),
   Object.freeze({id:'back-center',x:.02,y:0,z:8.39}),
   Object.freeze({id:'back-right',x:.60,y:0,z:8.42})
  ]),
  statureMeters:Object.freeze({short:1.54,medium:1.61,tall:1.68}),
  // Every texture needs its ALPHA-DERIVED shoe and crown pivots.
  // Reject the input rather than guessing from 1024x1024 canvas edges.
  minVisibleHeightFraction:.35,maxVisibleHeightFraction:.93
 });
 const finite=x=>typeof x==='number'&&Number.isFinite(x);
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function validate({x,y,z,height,soleY,crownY,widthScale=1,soleX=.5},room=CONFIG.geometry){
  if(![x,y,z,height,soleY,crownY,widthScale,soleX].every(finite))return {ok:false,error:'invalid-numeric'};
  if(height<.75||height>2.3||y<-.005||y>.005)return {ok:false,error:'not-grounded-human'};
  if(z<=room.backZ+.06||z>=room.nearZ-.10||Math.abs(x)>room.halfWidth-.20)return {ok:false,error:'outside-cabin'};
  if(crownY<0||crownY>=soleY-.20||soleY>1||soleX<0||soleX>1||widthScale<=0||widthScale>2.5)
   return {ok:false,error:'invalid-alpha-pivots'};
  if(y+height>room.ceilingY-.10)return {ok:false,error:'ceiling-collision'};
  return {ok:true};
 }
 function camForViewport({camera,aspect=16/9}={}){
  if(!camera)throw Error('Real metro camera is required; never use mock screen percentages');
  const ratio=clamp(Number(aspect)||16/9,.35,3.5);
  const t=clamp((1.05-ratio)/.4875,0,1);
  const blend=(a,b)=>({x:a.x+(b.x-a.x)*t,
   y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
  return {
   eye:camera.phoneEye?blend(camera.eye,camera.phoneEye):camera.eye,
   focus:camera.phoneFocus?blend(camera.focus,camera.phoneFocus):camera.focus,
   fov:camera.fov,sceneStatic:true,fovMode:camera.fovMode||'vertical',
   lensShift:camera.lensShift||0
  };
 }
 function derive({id,slot,height,art,renderReady=false}={}){
  if(!slot||!art)return {ok:false,error:'missing-slot-or-alpha-measurement'};
  const crownY=Number(art.crownY),soleY=Number(art.soleY),soleX=Number(art.soleX);
  const widthScale=Number(art.widthScale??1);
  const a={id,x:slot.x,y:0,z:slot.z,height,soleX,soleY,crownY,widthScale,
    // Doesn't mark an unapproved image production-ready.
    approved:!!art.approved&&renderReady===true};
  const check=validate(a);
  return check.ok?{ok:true,actor:a}:{ok:false,error:check.error};
 }
 function screenMetrics(actor,{camera,aspect=16/9,project}={}){
  const chk=validate(actor);
  if(!chk.ok)return chk;
  if(typeof project!=='function')return {ok:false,error:'requires-scene-WebGL-project'};
  const cam=camForViewport({camera,aspect});
  // Same pinhole camera as the game; both toe and crown use the same x,z.
  const feet=project({x:actor.x,y:actor.y,z:actor.z},cam,aspect);
  const crown=project({x:actor.x,y:actor.y+actor.height,z:actor.z},cam,aspect);
  const mid=project({x:actor.x,y:actor.y+actor.height*.5,z:actor.z},cam,aspect);
  if(!feet.valid||!crown.valid||!mid.valid)return {ok:false,error:'behind-camera'};
  const visibleHeightFraction=Math.abs(crown.y-feet.y)/2;
  const horizontalCenter=(mid.x+1)/2;
  const footScreenY=(1-feet.y)/2;
  const crownScreenY=(1-crown.y)/2;
  return {ok:true,worldFoot:{x:actor.x,y:0,z:actor.z},
   screen:{centerX:horizontalCenter,footY:footScreenY,crownY:crownScreenY},
   visibleHeightFraction,
   inHorizontalFov:mid.x>-1&&mid.x<1,
   footCroppedByFixedCamera:footScreenY>1,
   // The fixed metro camera intentionally crops BELOW the floor/wall joint.
   // If the foot projects past the viewport, don't fake contact by moving a CSS image.
   explanation:footScreenY>1?'ground-foot-below-fixed-camera-framing':'foot-visible'
  };
 }
 function approvedActors({records=[],camera,aspect=16/9,project}={}){
  // No automatic visual registration for NPCs without user-approved assets.
  const result=[];const seen=new Set();
  for(const record of records){
   if(!record?.id||seen.has(record.id)||record.art?.approved!==true||
      record.art?.production!==true)continue;
   seen.add(record.id);
   const a=derive({id:record.id,slot:record.slot,
    height:record.height,art:record.art,renderReady:true});
   if(!a.ok)continue;
   const projected=screenMetrics(a.actor,{camera,aspect,project});
   if(!projected.ok||!projected.inHorizontalFov)continue;
   result.push({...a.actor,projection:projected});
  }
  return result;
 }
 return Object.freeze({CONFIG,validate,camForViewport,derive,screenMetrics,approvedActors});
});
