/* V4 single-standing L2D safety and regression QA.
 * The rejected storm, breeze and full-body sway MUST NOT reappear.
 * Run: node tests/test_l2d_idle.js
 */
'use strict';
const assert=require('node:assert/strict');
require('../site/l2d/part-rig.js');
const core=globalThis.PaperchalkPartRigCore;
const layer=(id,w=200,h=300)=>({
 partId:id,name:id,x:320,y:80,sourcePart:true,canvas:{width:w,height:h}
});
const model=core.project([
 layer('front_hair'),layer('rear_hair'),layer('skirt'),
 layer('jacket'),layer('sleeves_and_hands'),layer('legs'),layer('face'),layer('shoes')
],'protagonist','front');
const idle=model.idleProfile;
const p=id=>model.parts[id];
const pt=(id,u,v,t,profile=idle)=>core.warpPoint(p(id),u,v,t,null,profile);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const span=(id,u,v,profile=idle)=>{
 const coords=Array.from({length:240},(_,i)=>pt(id,u,v,i*.07,profile));
 const xs=coords.map(a=>a.x),ys=coords.map(a=>a.y);
 return Math.hypot(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
};
assert.equal(idle.profileVersion,4);
assert.equal(idle.preset,'realistic');
assert.deepEqual([idle.body.amount,idle.hair.amount,idle.cloth.amount,idle.sleeves.amount],
 [0,.24,.18,.045]);
assert.equal(idle.weather,'realistic');
assert.equal(idle.windLift,0);
assert.equal(p('front_hair').bones.length,6);
assert.equal(p('rear_hair').bones.length,6);
assert.equal(p('skirt').bones.length,6);
assert.equal(p('jacket').bones.length,4);
assert.equal(p('sleeves_and_hands').bones.length,4);
assert.ok(span('rear_hair',.2,.95)>1,'subtle hair tips must still move');
assert.ok(span('front_hair',.2,.95)<12,'hair tips cannot whip around');
assert.ok(span('skirt',.2,.95)>0.3,'hem has a barely noticeable idle');
assert.ok(span('skirt',.2,.95)<10,'baseline hem stays gentle');
for(const id of ['face','shoes']){
 assert.ok(span(id,.5,.5)<.001,'face / shoes must NOT move left-right: '+id);
}
assert.ok(distance(pt('front_hair',.5,.05,.1),pt('front_hair',.5,.05,3.1))<.001,
 'hair root must stay firmly attached');
assert.ok(distance(pt('skirt',.5,.05,.1),pt('skirt',.5,.05,3.1))<.001,
 'skirt waistband must stay firmly attached');
assert.deepEqual(core.bodyPoseAt(1.4,idle),{lean:0,feet:902},
 'body leaning/weight-shift was explicitly rejected');
const point={x:450,y:200};
assert.deepEqual(core.bodyPosePoint(point.x,point.y,4,idle),point);
assert.deepEqual(core.bodyIdleAt(p('face'),4,idle),{x:0,y:0});
for(const name of ['realistic','breeze','windy']){
 const profile=core.presetIdle(name,idle);
 assert.deepEqual([profile.hair.amount,profile.cloth.amount,
  profile.body.amount,profile.windLift],[.24,.18,0,0],
  'all former wind options must resolve to the ONE standing animation');
 assert.deepEqual(core.windField(p('front_hair'),.15,.95,3,profile),{x:0,y:0});
 assert.deepEqual(core.windField(p('skirt'),.85,.95,3,profile),{x:0,y:0});
 assert.deepEqual(core.bodyPoseAt(3,profile),{lean:0,feet:902});
}
assert.equal(core.windPressure(4,'windy'),0);
const legacy=core.sanitizeIdleProfile({
 profileVersion:3,preset:'windy',weather:'windy',windLift:1,
 body:{amount:.52},hair:{amount:1.5},cloth:{amount:1.3},
 parts:{front_hair:2,skirt:2}
});
assert.deepEqual(legacy,core.defaultIdleProfile(),
 'every old overly dramatic saved profile must reset to the base idle');
const custom=core.sanitizeIdleProfile({
 profileVersion:4,preset:'windy',weather:'windy',windLift:1,
 body:{amount:1,rotate:1,swayX:3},hair:{amount:.27,speed:1.1},
 cloth:{amount:.15},sleeves:{amount:.08},
 parts:{front_hair:1.1,skirt:1.2}
});
assert.deepEqual([custom.body.amount,custom.weather,custom.windLift],[0,'realistic',0]);
assert.deepEqual([custom.hair.amount,custom.cloth.amount,
 custom.parts.front_hair,custom.parts.skirt],[.27,.15,1.1,1.2],
 'only gentle V4 authoring controls can be saved and reloaded');
const clamped=core.sanitizeIdleProfile({
 profileVersion:4,hair:{amount:99},cloth:{amount:99},
 sleeves:{amount:99},parts:{front_hair:99},
 joints:{hands:99,shoulders:99,hips:99}
});
assert.ok(clamped.hair.amount<=.40&&clamped.cloth.amount<=.30&&
 clamped.sleeves.amount<=.12&&clamped.parts.front_hair===20&&
 clamped.joints.hands===8&&clamped.joints.shoulders===8&&clamped.joints.hips===8,
 'saved high amplitudes remain adjustable but finite and bounded');
// Extreme sliders must ACTUALLY change texture motion, not merely labels.
const maximum=core.sanitizeIdleProfile({...idle,
 parts:{...idle.parts,front_hair:20,rear_hair:20,skirt:20}});
assert.ok(span('front_hair',.2,.95,maximum)>span('front_hair',.2,.95,idle)*3,
 'fringe 2000% must substantially exceed normal motion');
assert.ok(span('skirt',.2,.95,maximum)>span('skirt',.2,.95,idle)*3,
 'hem 2000% must substantially exceed normal motion');
const jointProfile=(id,value)=>core.sanitizeIdleProfile({...idle,
 joints:{...idle.joints,[id]:value}});
const handsOff=jointProfile('hands',0),handsMax=jointProfile('hands',8);
assert.ok(span('sleeves_and_hands',.18,.92,handsMax)>
 span('sleeves_and_hands',.18,.92,handsOff)+20,
 'hand/elbow slider articulates original hand texture');
const shouldersOff=jointProfile('shoulders',0),shouldersMax=jointProfile('shoulders',8);
assert.ok(span('jacket',.18,.63,shouldersMax)>span('jacket',.18,.63,shouldersOff)+5,
 'shoulder slider articulates upper jacket independently');
const hipsOff=jointProfile('hips',0),hipsMax=jointProfile('hips',8);
assert.ok(span('skirt',.18,.58,hipsMax)>span('skirt',.18,.58,hipsOff)+10,
 'pelvic slider moves the real skirt joint chain');
assert.ok(span('legs',.35,.65,hipsMax)>span('legs',.35,.65,hipsOff)+2,
 'pelvic slider also coordinates the upper legs');
for(const high of [handsMax,shouldersMax,hipsMax,maximum]){
 assert.deepEqual(core.bodyPoseAt(1,high),{lean:0,feet:902},
  'joint controls must not rock the entire character');
 assert.ok(distance(pt('front_hair',.5,.05,.1,high),pt('front_hair',.5,.05,3.1,high))<.001,
  'even maximum motion keeps hair rooted');
 assert.ok(distance(pt('skirt',.5,.05,.1,high),pt('skirt',.5,.05,3.1,high))<.001,
  'even maximum motion keeps skirt waist pinned');
}
const speedHigh=core.sanitizeIdleProfile({...idle,hair:{...idle.hair,speed:2.5}});
assert.equal(speedHigh.hair.speed,2.5,'entire visible speed slider range must be real');
const paused=core.presetIdle('still');
assert.ok(span('front_hair',.2,.95,paused)<.001);
assert.ok(span('skirt',.2,.95,paused)<.001);
const phase=2.1;
const a=core.warpPoint(p('front_hair'),.8,.95,phase,null,core.presetIdle('windy'));
const b=core.warpPoint(p('front_hair'),.8,.95,phase,null,core.presetIdle('realistic'));
assert.deepEqual(a,b,'old windy preset cannot create a second animation state');
const interpolated=core.approachIdle(idle,custom,1/30);
assert.ok(interpolated.hair.amount>idle.hair.amount&&
 interpolated.hair.amount<custom.hair.amount);
assert.equal(interpolated.body.amount,0);

// Anatomically positioned real-component fixture: the old all-same-origin
// geometry above intentionally remains unaffected when landmarks are invalid.
const bodyLayer=(id,x,y,w,h)=>({
 partId:id,name:id,sourcePart:true,x,y,canvas:{width:w,height:h}
});
const grounded=core.project([
 bodyLayer('shoes',400,860,160,50),bodyLayer('legs',409,585,143,292),
 bodyLayer('skirt',395,550,170,260),bodyLayer('jacket',388,342,190,237),
 bodyLayer('sleeves_and_hands',340,348,290,278),
 bodyLayer('neck',461,290,43,75),bodyLayer('face',418,157,131,151),
 bodyLayer('front_hair',400,124,168,158),
 bodyLayer('rear_hair',383,124,190,220),
 bodyLayer('eye_white',439,235,100,35),
 bodyLayer('irises',443,233,88,32),
 bodyLayer('brows',440,208,94,25),bodyLayer('nose',479,265,20,16)
],'protagonist','front');
assert.ok(grounded.bodyHierarchy,'real source landmarks must build hierarchy');
const parts=grounded.parts;
const hipOff=core.sanitizeIdleProfile({...idle,
 joints:{hands:0,shoulders:0,hips:0}});
const hipOn=core.sanitizeIdleProfile({...idle,
 joints:{hands:0,shoulders:0,hips:8}});
const shoulderOn=core.sanitizeIdleProfile({...idle,
 joints:{hands:0,shoulders:8,hips:0}});
const wholeOn=core.sanitizeIdleProfile({...idle,
 joints:{hands:0,shoulders:8,hips:8}});
const sourcePoint=(id,u,v)=>({x:parts[id].x+u*parts[id].w,
 y:parts[id].y+v*parts[id].h});
const articulated=(id,u,v,time,profile)=>core.warpPoint(parts[id],u,v,time,null,profile);
const shared=grounded.bodyHierarchy;
for(const time of [0,.7,1.5,2.7,4.2,6.8]){
 for(const profile of [hipOff,hipOn,shoulderOn,wholeOn]){
  // Shoes and BOTH ankle ends are exact nonmoving world-space constraints.
  assert.ok(distance(articulated('shoes',.5,.92,time,profile),
   sourcePoint('shoes',.5,.92))<1e-6,'shoes must remain fixed');
  for(const leg of [shared.left,shared.right]){
   const u=(leg.ankle.x-parts.legs.x)/parts.legs.w,
    v=(leg.ankle.y-parts.legs.y)/parts.legs.h;
   assert.ok(distance(articulated('legs',u,v,time,profile),
    leg.ankle)<1e-6,'both ankle joints must stay grounded');
  }
 }
 const q=shared.shoulder;
 const anchor=core.parentPoint(parts.jacket,q,time,shoulderOn);
 for(const id of ['neck','face','nose','brows','eye_white','irises',
   'front_hair','rear_hair','sleeves_and_hands']){
  const got=core.parentPoint(parts[id],q,time,shoulderOn);
  assert.ok(distance(got,anchor)<1e-5,
   id+' must inherit the very same shoulder parent transform');
 }
 const waist=shared.pelvis;
 const torsoWaist=core.parentPoint(parts.jacket,waist,time,wholeOn),
  skirtWaist=core.parentPoint(parts.skirt,waist,time,wholeOn);
 assert.ok(distance(torsoWaist,skirtWaist)<1e-5,
  'torso and skirt must meet at their shared pelvic attachment');
}
// Pelvis moves: hip and waist move, knees solve, ankle and shoes do not.
const displacement=(id,u,v,profile)=>
 distance(articulated(id,u,v,1.2,profile),articulated(id,u,v,4.1,profile));
assert.ok(displacement('legs',.36,.66,hipOn)>1.5,'knee must bend with pelvis');
assert.ok(displacement('legs',.36,.66,hipOff)<1e-6,
 'no unwanted independent leg swinging with pelvis slider at zero');
assert.ok(displacement('skirt',.5,.08,hipOn)>2,
 'pelvic joint must actually shift the attached waist');
assert.ok(displacement('face',.5,.5,shoulderOn)>2,
 'shoulder must carry the complete head and facial features');
assert.ok(displacement('neck',.5,.5,shoulderOn)>1,
 'neck must follow shoulder rather than remain detached');
assert.equal(grounded.bodyHierarchy===undefined,false);
// Runtime attachment is intentionally NOT serialized into the user-authored rig.
// The game reconstructs it from the same authentic source-part coordinates.
const savedGrounded=JSON.stringify(grounded);
assert.ok(!savedGrounded.includes('_bodyHierarchy')&&
 !savedGrounded.includes('"bodyHierarchy"'),
 'runtime parent binding must not pollute saved L2D JSON');
const restored=JSON.parse(savedGrounded);
core.bindBodyHierarchy(restored);
assert.ok(restored.bodyHierarchy&&restored.parts.face._bodyHierarchy,
 'game must reconstruct the same shoulder/head and planted-leg ancestry');

console.log('PASS fixed shoes + ankle IK, coupled pelvis/shoulder/neck/head/face, sliders and legacy migration');
