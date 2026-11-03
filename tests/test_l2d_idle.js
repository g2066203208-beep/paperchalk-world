/* Zero-browser deterministic regression for the shared L2D idle controller.
 * Run: node tests/test_l2d_idle.js
 */
'use strict';
const assert=require('node:assert/strict');
require('../site/l2d/part-rig.js');
const core=globalThis.PaperchalkPartRigCore;
const make=(id,w=180,h=290)=>({partId:id,name:id,x:300,y:60,
 sourcePart:true,canvas:{width:w,height:h}});
const model=core.project([
 make('rear_hair'),make('skirt'),make('jacket'),make('sleeves_and_hands'),
 make('face'),make('shoes')
],'protagonist','front');
const part=id=>model.parts[id];
const position=(id,t,u=.2,v=.92)=>core.warpPoint(part(id),u,v,t,null,model.idleProfile);
const length=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
assert.equal(model.idleProfile.preset,'realistic');
assert.equal(part('rear_hair').bones.length,6);
assert.equal(part('skirt').bones.length,6);
assert.equal(part('jacket').bones.length,4);
assert.equal(part('sleeves_and_hands').bones.length,4);
const hairMotion=length(position('rear_hair',.2),position('rear_hair',1.7));
const skirtMotion=length(position('skirt',.2),position('skirt',1.7));
const bodyMotion=length(position('face',.2),position('face',1.7));
assert.ok(hairMotion>1,'real hair must sway on its actual original component');
assert.ok(skirtMotion>.4,'real skirt must sway independently of hair');
assert.ok(bodyMotion>0.5&&bodyMotion<3,'whole-body stance should shift gently, not shake');
assert.ok(hairMotion>bodyMotion*1.7,'hair tips add local articulation over whole-body coordinated sway');
const approvedStill=core.presetIdle('still',model.idleProfile);
model.idleProfile=approvedStill;
for(const id of Object.keys(model.parts)){
 const a=position(id,.2),b=position(id,1.7);
 assert.ok(length(a,b)<1.8,id+' still mode should have only subpixel natural body shifting');
}
model.idleProfile=core.presetIdle('realistic',model.idleProfile);
model.idleProfile.parts.rear_hair=0;
const noHair=length(position('rear_hair',.2),position('rear_hair',1.7));
assert.ok(noHair<2.7,'single-part zero disables local hair swing but preserves shared body lean');
const unchangedSkirt=length(position('skirt',.2),position('skirt',1.7));
assert.ok(unchangedSkirt>.4,'hair slider must not disable or modify skirt swing');
const initial=core.defaultIdleProfile();
const windy=core.presetIdle('windy',initial);
assert.ok(windy.hair.amount>initial.hair.amount);
assert.ok(windy.cloth.amount>initial.cloth.amount);
assert.equal(initial.preset,'realistic','preset factory must not mutate default data');
const bad=core.sanitizeIdleProfile({hair:{amount:400,speed:-9,lag:99},parts:{rear_hair:99}});
assert.ok(bad.hair.amount<=1.5&&bad.hair.speed>=.15&&bad.hair.lag<=2&&bad.parts.rear_hair<=2,
 'out-of-range saved settings must be clamped before playback');
const reloaded=core.project([make('rear_hair')],'protagonist','front',{
 idleProfile:core.presetIdle('breeze',initial),
 parts:{rear_hair:part('rear_hair')}});
assert.equal(reloaded.idleProfile.preset,'breeze');
assert.equal(reloaded.idleProfile.hair.amount,.64);
const oldDefault=core.sanitizeIdleProfile({
 preset:'realistic',hair:{amount:.48},cloth:{amount:.34},parts:{}
});
assert.equal(oldDefault.hair.amount,.28,'old untouched calm hair migrates to natural v3');
assert.equal(oldDefault.cloth.amount,.23,'old untouched skirt migrates to natural v3');
assert.equal(oldDefault.parts.front_hair,1,'new natural fringe weight');
assert.equal(oldDefault.parts.skirt,1,'new natural skirt hem');
const oldV2=core.sanitizeIdleProfile({
 profileVersion:2,preset:'realistic',
 body:{amount:.18},hair:{amount:.85,speed:1.05,lag:.62},
 cloth:{amount:.82,speed:.95,lag:.58},sleeves:{amount:.26},
 parts:{front_hair:1.25,skirt:1.35}
});
assert.deepEqual([oldV2.body.amount,oldV2.hair.amount,
 oldV2.cloth.amount,oldV2.parts.front_hair,oldV2.parts.skirt],
 [.20,.28,.23,1,1],
 'oversized legacy factory defaults must migrate without changing original art');
const savedCustom=core.sanitizeIdleProfile({
 preset:'custom',hair:{amount:.45},cloth:{amount:.31},
 parts:{front_hair:.5,skirt:0}
});
assert.deepEqual([
 savedCustom.hair.amount,savedCustom.cloth.amount,
 savedCustom.parts.front_hair,savedCustom.parts.skirt
],[.45,.31,.5,0],'explicit user values must remain exactly as set');
assert.equal(core.defaultIdleProfile().body.amount,.20,
 'ordinary standing includes coordinated weight shifting, not fake breathing');
// Wind QA uses actual source-part UVs. Strong wind MUST push ends up
// and visibly aside, not merely oscillate the same 10px with a bigger label.
const modes=['still','realistic','breeze','windy'];
const tiers=modes.map(p=>core.presetIdle(p));
const fringe=core.project([make('front_hair',200,300)],'protagonist','front').parts.front_hair;
const hem=core.project([make('skirt',200,300)],'protagonist','front').parts.skirt;
const rest=(part,u,v)=>core.warpPoint(part,u,v,2.3,null,tiers[0]);
const displacement=(part,u,v,idle)=>{
 const a=core.warpPoint(part,u,v,2.3,null,idle),b=rest(part,u,v);
 return {dx:a.x-b.x,dy:a.y-b.y,length:length(a,b)};
};
const ranges={};
for(const [name,p,u,v] of [['hair',fringe,.12,.95],['skirt',hem,.85,.96]]){
 ranges[name]=Object.fromEntries(modes.map((mode,i)=>
  [mode,displacement(p,u,v,tiers[i])]));
}
console.log('3 WEATHER REGIMES REAL BONE TIPS',JSON.stringify(ranges));
assert.ok(ranges.hair.breeze.length>ranges.hair.still.length+3,
 'even gentle breeze must differ visibly from no wind');
assert.ok(ranges.skirt.breeze.length>ranges.skirt.still.length+.7,
 'breeze should affect cloth');
assert.ok(ranges.hair.windy.dx< -65&&ranges.hair.windy.dy< -35,
 'HIGH WIND must lift ORIGINAL left lock up and AWAY from the face');
assert.ok(ranges.skirt.windy.dx>30&&ranges.skirt.windy.dy< -12,
 'HIGH WIND must flare skirt up and to the side');
assert.ok(ranges.hair.windy.length>ranges.hair.breeze.length*4,
 'strong wind must not look like normal standing');
const rightLock=displacement(fringe,.88,.95,tiers[3]);
assert.ok(rightLock.dx>65&&rightLock.dy< -35,
 'right hair tip should lift in the opposite OUTWARD direction');
const centerFringe=core.windField(fringe,.5,.18,2.3,tiers[3]);
assert.ok(Math.hypot(centerFringe.x,centerFringe.y)<3,
 'forehead fringe stays readable; strong wind cannot sweep it over the eyes');
const leftPleat=displacement(hem,.15,.96,tiers[3]);
assert.ok(leftPleat.dx< -12&&leftPleat.dy< -12,
 'left pleat must fan out instead of both skirt sides shifting to the right');
const root=(part,idle)=>core.windField(part,.5,.02,2.3,idle);
for(const part of [fringe,hem]){
 assert.deepEqual(root(part,tiers[3]),{x:0,y:0},
  'hair roots and skirt waist must be completely pinned against the wind');
}
// One shared full-body lean across face, jacket, arms, eyes and feet.
const stillBody=core.bodyPoseAt(2.3,tiers[0]);
const breezeBody=core.bodyPoseAt(2.3,tiers[2]);
assert.ok(Math.abs(breezeBody.lean)>Math.abs(stillBody.lean),
 'gentle breeze should add coordinated body weight shift');
for(const idle of tiers){
 const toe=core.bodyPosePoint(400,902,2.3,idle);
 assert.equal(toe.x,400,'body tilt must leave shoes planted on the ground');
 const head=core.bodyPosePoint(400,140,2.3,idle);
 assert.ok(Number.isFinite(head.x)&&Math.abs(head.x-400)<30,
  'head, neck and torso must sway together but cannot snap');
}
const reset=core.presetIdle('realistic',{
 ...tiers[2],parts:{front_hair:2,skirt:2}
});
assert.deepEqual([reset.parts.front_hair,reset.parts.skirt],[1,1],
 'switching back to normal must reset excessive hair and hem multipliers');
let t=tiers[0],wind=tiers[2],visual=JSON.parse(JSON.stringify(t));
for(let i=0;i<35;i++)visual=core.approachIdle(visual,wind,1/30);
assert.ok(visual.hair.amount>t.hair.amount&&visual.hair.amount<wind.hair.amount,
 'wind tier change must ease toward its target without snapping');
const customV2=core.sanitizeIdleProfile({
 profileVersion:2,preset:'custom',hair:{amount:1.25},cloth:{amount:.43},
 parts:{front_hair:1.75}
});
assert.equal(customV2.hair.amount,1.25,'do not clobber old custom strength');
assert.equal(customV2.parts.front_hair,1.75,'do not clobber old custom weights');
const tunedWind=core.presetIdle('windy');
tunedWind.preset='custom';tunedWind.hair.amount=1.05;
const recovered=core.sanitizeIdleProfile(JSON.parse(JSON.stringify(tunedWind)));
assert.equal(recovered.weather,'windy','manual tuning must retain its selected storm');
const at=core.warpPoint(fringe,.2,.95,2.0,null,recovered);
const same=core.warpPoint(fringe,.2,.95,2.0,null,{...recovered,preset:'windy'});
assert.ok(length(at,same)<1e-8,
 'switching to custom sliders must NOT silently remove the storm gust envelope');
console.log('PASS idle presets, original source-part hair/skirt isolation, gentle body, per-part sliders and save/restore');
