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
assert.equal(reloaded.idleProfile.hair.amount,.78);
console.log('PASS idle presets, original source-part hair/skirt isolation, gentle body, per-part sliders and save/restore');
