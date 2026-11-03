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
 layer('jacket'),layer('sleeves_and_hands'),layer('face'),layer('shoes')
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
assert.ok(span('skirt',.2,.95)<6,'hem cannot lift or flare');
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
 sleeves:{amount:99},parts:{front_hair:99}
});
assert.ok(clamped.hair.amount<=.40&&clamped.cloth.amount<=.30&&
 clamped.sleeves.amount<=.12&&clamped.parts.front_hair<=3,
 'malformed saved values cannot restore high wind or excessive amplitude');
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
console.log('PASS single basic standing: no wind/sway, quiet independent hair and hem, preserved eyes, legacy migration');
