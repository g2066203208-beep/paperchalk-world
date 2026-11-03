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
assert.ok(bodyMotion<1.0,'body/face cannot rock like a whole image');
assert.ok(hairMotion>bodyMotion*5,'hair tips should flex more than a living body');
const approvedStill=core.presetIdle('still',model.idleProfile);
model.idleProfile=approvedStill;
for(const id of Object.keys(model.parts)){
 const a=position(id,.2),b=position(id,1.7);
 assert.ok(length(a,b)<1e-7,id+' must stop completely with still preset');
}
model.idleProfile=core.presetIdle('realistic',model.idleProfile);
model.idleProfile.parts.rear_hair=0;
const noHair=length(position('rear_hair',.2),position('rear_hair',1.7));
assert.ok(noHair<.6,'single-part strength of zero should disable hair swing while keeping subpixel body follow');
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
 [.12,.28,.23,1,1],
 'oversized legacy factory defaults must migrate without changing original art');
const savedCustom=core.sanitizeIdleProfile({
 preset:'custom',hair:{amount:.45},cloth:{amount:.31},
 parts:{front_hair:.5,skirt:0}
});
assert.deepEqual([
 savedCustom.hair.amount,savedCustom.cloth.amount,
 savedCustom.parts.front_hair,savedCustom.parts.skirt
],[.45,.31,.5,0],'explicit user values must remain exactly as set');
assert.equal(core.defaultIdleProfile().body.amount,.12,
 'body must stay nearly motionless; no fake breathing');
const tiers=['realistic','breeze','windy'].map(p=>core.presetIdle(p));
const travel=(p,u,v,idle)=>{
 const pts=Array.from({length:300},(_,i)=>core.warpPoint(p,u,v,i*.066,null,idle));
 const xs=pts.map(x=>x.x),ys=pts.map(x=>x.y);
 return Math.hypot(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
};
const fringe=core.project([make('front_hair',200,300)],'protagonist','front').parts.front_hair;
const hem=core.project([make('skirt',200,300)],'protagonist','front').parts.skirt;
const ranges={fringe:tiers.map(t=>travel(fringe,.2,.95,t)),
 hem:tiers.map(t=>travel(hem,.15,.95,t))};
console.log('CALM BREEZE WINDY VERTEX SPANS',JSON.stringify(ranges));
assert.ok(ranges.fringe[0]>5&&ranges.fringe[0]<14,'normal fringe should be subtle');
assert.ok(ranges.hem[0]>3&&ranges.hem[0]<9,'normal skirt should be subtle');
assert.ok(ranges.fringe[1]>ranges.fringe[0]*1.65&&ranges.fringe[1]<28,'breeze fringe must be visible but gentle');
assert.ok(ranges.hem[1]>ranges.hem[0]*1.65&&ranges.hem[1]<18,'breeze skirt must be visible but gentle');
assert.ok(ranges.fringe[2]>ranges.fringe[1]*1.5&&ranges.fringe[2]<55,'storm fringe must be bigger but controlled');
assert.ok(ranges.hem[2]>ranges.hem[1]*1.5&&ranges.hem[2]<35,'storm hem must be bigger but controlled');
for(const part of [fringe,hem]){
 const a=core.warpPoint(part,.5,.05,.1,null,tiers[2]);
 const b=core.warpPoint(part,.5,.05,3.1,null,tiers[2]);
 assert.ok(length(a,b)<1,'hair root/skirt waist must remain attached in strong wind');
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
console.log('PASS idle presets, original source-part hair/skirt isolation, gentle body, per-part sliders and save/restore');
