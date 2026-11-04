/* PartRig v1: non-destructive editable mesh of ORIGINAL source bitmaps.
 * No synthetic body image, no name-regex motion, and no automatic game override.
 * This is independent rig AUTHORING; the approved 128-frame V4 remains intact.
 */
(function(root){
'use strict';
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const finite=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;
const smooth=v=>{const a=clamp(v,0,1);return a*a*(3-2*a);};
const FRONT={
 rear_hair:['head',.50,.08,.50,.95,'hair'],
 sleeves_and_hands:['torso',.50,.04,.50,.86,'arm-combined'],
 legs:['pelvis',.50,.02,.50,.82,'leg-combined'],
 shoes:['ground',.50,.88,.50,.88,'fixed'],
 neck:['torso',.50,.80,.50,.80,'fixed'],
 skirt:['pelvis',.50,.04,.50,.96,'skirt'],
 jacket:['torso',.50,.12,.50,.80,'torso'],
 brows:['head',.50,.50,.50,.50,'face'],
 ears:['head',.50,.50,.50,.50,'fixed'],
 face:['head',.50,.42,.50,.42,'face'],
 nose:['head',.50,.50,.50,.50,'fixed'],
 mouth:['head',.50,.50,.50,.50,'mouth'],
 hair_clip:['front_hair',.50,.50,.50,.50,'fixed'],
 eye_white:['head',.50,.50,.50,.50,'eyes-combined'],
 irises:['eye_white',.50,.50,.50,.50,'eyes-combined'],
 lashes:['eye_white',.50,.50,.50,.50,'eyes-combined'],
 front_hair:['head',.50,.08,.50,.88,'hair'],
 // Woman protagonist's independently imported BATTLE FRONT PSD:
 // these are exact source-bitmaps and spatial pivots, not copies of a
 // pre-existing heroine rig. They do not change existing character IDs.
 back_hair:['head',.50,.04,.50,.94,'hair'],
 axe_overhead:['root',.50,.50,.50,.50,'fixed'],
 axe_held:['handwear_l',.60,.50,.40,.50,'fixed'],
 // Same canonical heroine front rig, original standing baseline + combat parts:
 battle_handwear_r:['torso',.86,.07,.48,.92,'arm-right'],
 battle_handwear_l:['torso',.17,.07,.48,.91,'arm-left'],
 battle_axe:['battle_handwear_l',.60,.50,.40,.50,'fixed'],
 legwear:['pelvis',.50,.04,.50,.85,'leg-combined'],
 footwear:['ground',.50,.84,.50,.84,'fixed'],
 handwear_r:['torso',.86,.07,.48,.92,'arm-right'],
 handwear_l:['torso',.17,.07,.48,.91,'arm-left'],
 // New 2026-11-04 male-second authentic SeeThrough source:
 handwear:['torso',.50,.05,.50,.88,'arm-combined'],
 head:['head',.50,.52,.50,.52,'face'],
 eyewhite:['head',.50,.50,.50,.50,'eyes-combined'],
 irides:['eyewhite',.50,.50,.50,.50,'eyes-combined'],
 eyelash:['eyewhite',.50,.50,.50,.50,'eyes-combined'],
 eyebrow:['head',.50,.50,.50,.50,'face'],
 bottomwear:['pelvis',.50,.05,.50,.90,'skirt'],
 // User-authored black shorts from female-06 outfit's original SeeThrough PSD.
 // They deform using EXACTLY the base legwear's per-vertex hip/knee field.
 pants_overlay:['legwear',.50,.09,.50,.91,'pants-bound'],
 topwear:['torso',.50,.09,.50,.81,'torso'],
 eyebrow_l:['head',.50,.50,.50,.50,'face'],
 eyebrow_r:['head',.50,.50,.50,.50,'face'],
 ears_r:['head',.50,.50,.50,.50,'fixed'],
 ears_l:['head',.50,.50,.50,.50,'fixed'],
 headwear:['head',.50,.50,.50,.50,'fixed'],
 eyelash_r:['eyewhite_r',.50,.50,.50,.50,'eyes-combined'],
 eyelash_l:['eyewhite_l',.50,.50,.50,.50,'eyes-combined'],
 eyewhite_r:['head',.50,.50,.50,.50,'eyes-combined'],
 eyewhite_l:['head',.50,.50,.50,.50,'eyes-combined'],
 irides_r:['eyewhite_r',.50,.50,.50,.50,'eyes-combined'],
 irides_l:['eyewhite_l',.50,.50,.50,.50,'eyes-combined']
};
// Male lead is ONE canonical actor. This is his *alternate clothing* part
// library, not the male2 bundle or a copy of the original standing character.
const CHAR003_OUTFIT={
 earwear:['head',.50,.15,.50,.80,'fixed'],
 headwear:['head',.50,.04,.50,.95,'hair'],
 handwear_left:['torso',.50,.06,.50,.90,'arm-left'],
 handwear_right:['torso',.50,.06,.50,.93,'arm-right'],
 neck:['torso',.50,.75,.50,.75,'fixed'],
 footwear:['ground',.50,.85,.50,.85,'fixed'],
 legwear:['pelvis',.50,.04,.50,.90,'leg-combined'],
 back_hair:['head',.50,.09,.50,.94,'hair'],
 topwear:['torso',.50,.12,.50,.85,'torso'],
 eyelash:['head',.50,.50,.50,.50,'eyes-combined'],
 eyebrow:['head',.50,.50,.50,.50,'face'],
 ears:['head',.50,.50,.50,.50,'fixed'],
 face:['head',.50,.45,.50,.45,'face'],
 nose:['head',.50,.50,.50,.50,'fixed'],
 mouth:['head',.50,.50,.50,.50,'mouth'],
 irides:['head',.50,.50,.50,.50,'eyes-combined'],
 front_hair:['head',.50,.06,.50,.91,'hair']
};
// CHAR-004 / female third: actual user-supplied PSD, 21 layers and TWO
// physically separate shoe meshes. Not the protagonist/CHAR002 rig.
const CHAR004={
 back_hair:['head',.50,.08,.52,.91,'hair'],
 front_hair:['head',.50,.07,.51,.92,'hair'],
 topwear:['torso',.50,.18,.50,.75,'torso'],
 neck:['torso',.50,.70,.50,.13,'fixed'],
 legwear:['pelvis',.50,.04,.51,.91,'leg-combined'],
 footwear_left:['ground',.50,.83,.50,.83,'fixed'],
 footwear_right:['ground',.50,.83,.50,.83,'fixed'],
 handwear_l:['torso',.16,.89,.45,.095,'arm-coat-right'],
 handwear_r:['torso',.76,.86,.87,.12,'arm-coat-left'],
 coat_left:['torso',.77,.075,.38,.955,'coat-panel-left'],
 coat_right:['torso',.67,.075,.69,.97,'coat-panel-right'],
 face:['head',.50,.50,.50,.50,'face'],
 eyebrow_r:['head',.50,.50,.50,.50,'face'],
 eyebrow_l:['head',.50,.50,.50,.50,'face'],
 ears_r:['head',.50,.50,.50,.50,'fixed'],
 ears_l:['head',.50,.50,.50,.50,'fixed'],
 nose:['head',.50,.50,.50,.50,'fixed'],
 mouth:['head',.50,.50,.50,.50,'mouth'],
 eyewhite_r:['head',.50,.50,.50,.50,'eyes-combined'],
 eyewhite_l:['head',.50,.50,.50,.50,'eyes-combined'],
 irides_r:['eyewhite_r',.50,.50,.50,.50,'eyes-combined'],
 irides_l:['eyewhite_l',.50,.50,.50,.50,'eyes-combined'],
 eyelash_r:['eyewhite_r',.50,.50,.50,.50,'eyes-combined'],
 eyelash_l:['eyewhite_l',.50,.50,.50,.50,'eyes-combined']
};
// Female protagonist's NEW independently authored crouch-and-axe source.
// Exactly one canonical actor: this is a pose module, never a replacement
// standing body or another identity. The editor must keep the approved
// pose's rigid floor/axe and separate hands/legs, not reclassify as unknown.
// Stage coordinates and live authored pivots are read from the published rig.
const PROTAGONIST_CROUCH={
 back_hair:['head',.50,.08,.50,.95,'hair'],
 neck:['torso',.50,.75,.50,.75,'fixed'],
 topwear:['torso',.50,.15,.50,.80,'torso'],
 legwear_l:['ground',.50,.16,.50,.90,'fixed'],
 legwear_r:['ground',.50,.16,.50,.90,'fixed'],
 footwear_l:['ground',.50,.88,.50,.88,'fixed'],
 footwear_r:['ground',.50,.88,.50,.88,'fixed'],
 axe:['root',.50,.50,.50,.50,'fixed'],
 handwear_l:['torso',.82,.08,.46,.89,'arm-left'],
 handwear_r:['torso',.18,.08,.54,.89,'arm-right'],
 ears_l:['head',.50,.50,.50,.50,'fixed'],
 ears_r:['head',.50,.50,.50,.50,'fixed'],
 face:['head',.50,.42,.50,.42,'face'],
 eyewhite_l:['head',.50,.50,.50,.50,'eyes-combined'],
 eyewhite_r:['head',.50,.50,.50,.50,'eyes-combined'],
 irides_l:['eyewhite_l',.50,.50,.50,.50,'eyes-combined'],
 irides_r:['eyewhite_r',.50,.50,.50,.50,'eyes-combined'],
 eyelash_l:['eyewhite_l',.50,.50,.50,.50,'eyes-combined'],
 eyelash_r:['eyewhite_r',.50,.50,.50,.50,'eyes-combined'],
 eyebrow_l:['head',.50,.50,.50,.50,'face'],
 eyebrow_r:['head',.50,.50,.50,.50,'face'],
 nose:['head',.50,.50,.50,.50,'fixed'],
 mouth:['head',.50,.50,.50,.50,'mouth'],
 front_hair:['head',.50,.08,.50,.90,'hair'],
 headwear:['front_hair',.50,.50,.50,.50,'fixed']
};
const BACK={
 legs:['pelvis',.50,.02,.50,.82,'leg-combined'],
 sleeve_left:['torso',.85,.05,.50,.96,'arm-left'],
 sleeve_right:['torso',.15,.05,.50,.96,'arm-right'],
 shoes:['ground',.50,.88,.50,.88,'fixed'],
 back_hair:['head',.50,.05,.50,.94,'hair'],
 skirt:['pelvis',.50,.04,.50,.94,'skirt'],
 jacket:['torso',.50,.08,.50,.79,'torso'],
 hair_over_jacket:['head',.50,.05,.50,.94,'hair']
};
// CHAR-002: source-authentic PSD layers; empty source records are kept in the ZIP.
const CHAR002={
 head_reference:['head',.50,.48,.50,.48,'face'],
 back_hair:['head',.50,.05,.50,.95,'hair'],
 legwear:['pelvis',.50,.04,.50,.84,'leg-combined'],
 footwear:['ground',.50,.86,.50,.86,'fixed'],
 bottomwear:['pelvis',.50,.04,.50,.93,'skirt'],
 neck:['torso',.50,.80,.50,.80,'fixed'],
 topwear:['torso',.50,.10,.50,.84,'torso'],
 // Photoshop drew both sleeves in one source layer, with unconnected alpha.
 hand_raised:['torso',.53,.91,.31,.15,'arm-raised'],
 hand_lowered:['torso',.82,.06,.30,.93,'arm-lowered'],
 ears:['head',.50,.50,.50,.50,'fixed'],
 face:['head',.50,.45,.50,.45,'face'],
 nose:['head',.50,.50,.50,.50,'fixed'],
 mouth:['head',.50,.50,.50,.50,'mouth'],
 eyewhite:['head',.50,.50,.50,.50,'eyes-combined'],
 eyebrow:['head',.50,.50,.50,.50,'face'],
 irides:['eyewhite',.50,.50,.50,.50,'eyes-combined'],
 eyelash:['eyewhite',.50,.50,.50,.50,'eyes-combined'],
 front_hair:['head',.50,.06,.50,.82,'hair']
};
// Shared, versioned idle controller: used by BOTH game and bone editor.
// Never invokes breathing deformation or a whole-character canvas transform.
// Distinct wind regimes; keep hair roots and the waist anchored.
// Only a single approved base standing animation. Old weather names remain
// legacy API aliases, not user-facing presets or physical gusts.
const BASIC_IDLE=Object.freeze({body:0,hair:.18,cloth:.12,sleeves:.045});
const IDLE_PRESETS=Object.freeze({
 still:{body:0,hair:0,cloth:0,sleeves:0},
 realistic:BASIC_IDLE,breeze:BASIC_IDLE,windy:BASIC_IDLE
});
const WEATHER_LIFT=Object.freeze({still:0,realistic:0,breeze:0,windy:0});
const IDLE_RATES=Object.freeze({
 realistic:{hair:[.83,.78],cloth:[.78,.70],sleeves:[.80,.56]}
});
// Known v1/v2 factory values only; custom motion remains user-owned.
const LEGACY_PRESETS=Object.freeze({
 realistic:{v1:{body:.18,hair:.48,cloth:.34,sleeves:.26},
  v2:{body:.18,hair:.85,cloth:.82,sleeves:.26}},
 breeze:{v1:{body:.15,hair:.78,cloth:.62,sleeves:.46},
  v2:{body:.15,hair:1.12,cloth:1.05,sleeves:.46}},
 windy:{v1:{body:.24,hair:1.1,cloth:.95,sleeves:.76},
  v2:{body:.24,hair:1.4,cloth:1.28,sleeves:.76}}
});
const OLD_PART_STRENGTH=Object.freeze({
 front_hair:1.25,back_hair:1.18,hair_over_jacket:1.18,skirt:1.35
});
const DEFAULT_PART_STRENGTH=Object.freeze({
 front_hair:1.3,rear_hair:1.4,back_hair:1.4,hair_over_jacket:1.4,skirt:1.5,bottomwear:1.5
});
function defaultIdleProfile(){
 return {profileVersion:4,preset:'realistic',weather:'realistic',windLift:0,
  body:{amount:0,speed:.85,swayX:0,swayY:0,rotate:0},
  hair:{amount:.24,speed:.83,lag:.78},
  cloth:{amount:.18,speed:.78,lag:.70},
  sleeves:{amount:.045,speed:.80,lag:.56},
  // Chest-only rib-cage motion; never old full-body breathing scale.
  breath:{amount:.6,speed:.85},
  joints:{hands:.7,shoulders:.3,hips:.2},
  parts:{...DEFAULT_PART_STRENGTH}};
}
function sanitizeIdleProfile(input){
 const base=defaultIdleProfile(),p=input&&typeof input==='object'?input:{};
 // Old saved windy/breeze rigs are reset to base motion on both editor
 // and game. Source artwork and independently authored bones are untouched.
 if(p.profileVersion!==4)return base;
 const g=(name,max)=>({
  amount:clamp(finite(p[name]?.amount,base[name].amount),0,max),
  speed:clamp(finite(p[name]?.speed,base[name].speed),.25,2.5),
  lag:clamp(finite(p[name]?.lag,base[name].lag),0,1.5)
 });
 const parts={...DEFAULT_PART_STRENGTH};
 if(p.parts&&typeof p.parts==='object'&&!Array.isArray(p.parts)){
  for(const [id,value] of Object.entries(p.parts).slice(0,100))
   if(/^[a-z0-9_-]{1,80}$/.test(id))
    parts[id]=clamp(finite(value,1),0,20);
 }
 const joints={};
 for(const name of ['hands','shoulders','hips'])joints[name]=clamp(finite(p.joints?.[name],base.joints[name]),0,8);
 return {...base,hair:g('hair',.4),cloth:g('cloth',.30),
  sleeves:g('sleeves',.12),
  breath:{amount:clamp(finite(p.breath?.amount,base.breath.amount),0,3),
   speed:clamp(finite(p.breath?.speed,base.breath.speed),.25,2.5)},
  joints,parts};
}
function presetIdle(name,previous=null){
 if(!Object.hasOwn(IDLE_PRESETS,name))throw Error('Unknown idle preset: '+name);
 // Legacy wind aliases explicitly cannot reactivate rejected motion.
 if(name!=='still')return defaultIdleProfile();
 const p=defaultIdleProfile();p.preset='still';
 p.hair.amount=0;p.cloth.amount=0;p.sleeves.amount=0;
 p.breath.amount=0;
 p.joints={hands:0,shoulders:0,hips:0};
 return p;
}
// Smoothly approach a NEW weather tier instead of instantly snapping
// every joint when the user taps calm / breeze / wind.
function approachIdle(previous,target,dt){
 if(!previous)return sanitizeIdleProfile(target);
 const dest=sanitizeIdleProfile(target),k=1-Math.exp(-clamp(finite(dt,0),0,.12)*4);
 for(const name of ['hair','cloth','sleeves']){
  dest[name]={...dest[name]};
  for(const key of ['amount','speed','lag']){
   const end=dest[name][key];
   dest[name][key]=finite(previous[name]?.[key],end)*(1-k)+end*k;
  }
 }
 for(const key of ['amount','speed']){
  const end=dest.breath[key];
  dest.breath[key]=finite(previous.breath?.[key],end)*(1-k)+end*k;
 }
 for(const name of ['hands','shoulders','hips']){
  const end=dest.joints[name];
  dest.joints[name]=finite(previous.joints?.[name],end)*(1-k)+end*k;
 }
 for(const [id,end] of Object.entries(dest.parts)){
  const from=finite(previous.parts?.[id],end);
  dest.parts[id]=from*(1-k)+end*k;
 }
 return dest;
}
function idleGroup(part){
 if(part.kind==='hair')return 'hair';
 if(part.kind==='skirt'||part.kind==='torso'||part.kind.startsWith('coat-panel-'))return 'cloth';
 if(part.kind.startsWith('arm-'))return 'sleeves';
 return 'body';
}
// One shared, grounded full-body pose: every texture uses exactly the same
// world-space shear around the FEET, including tiny brows/eyes and long hair.
// Avoid different per-layer offsets: those cause heads, collars and wrists
// to tear apart when the body sways. No simulated breathing / vertical scale.
const FOOT_Y=902;
function bodyPoseAt(){return {lean:0,feet:FOOT_Y};}
function bodyPosePoint(x,y){return {x,y};}
function bodyIdleAt(part,phase,idle){
 // Compatibility hook for authored rigs; actual coordinated motion is
 // implemented once by bodyPosePoint, not independent body-part shaking.
 return {x:0,y:0};
}
// Wind pressure on ORIGINAL independent ArtMeshes. Strong wind has a
// sustained upward/lateral direction, with low-frequency gusts; no zoom,
// whole-character shear on the skirt, copied texture or synthetic hair.
function windPressure(){return 0;}
function windField(){return {x:0,y:0};}
// Independently authored joint chains on ORIGINAL source PNG parts.
// Coordinates are local UVs, not global character oscillation or name regex.
// Paired sleeves inside a *single original PNG* still get separate left/right
// shoulder->elbow->wrist joint chains with spatially isolated skin influence.
const SEGMENTS={
 hair:[
  ['left-root',null,.27,.07,.25,.53,11,1.03,.0,.31],
  ['left-tip','left-root',.25,.53,.13,.94,17,1.18,-.48,.29],
  ['center-root',null,.51,.06,.51,.49,7,.9,.62,.32],
  ['center-tip','center-root',.51,.49,.53,.95,12,1.06,-.37,.3],
  ['right-root',null,.76,.07,.75,.55,10,.98,.9,.31],
  ['right-tip','right-root',.75,.55,.88,.95,16,1.15,.3,.3]
 ],
 skirt:[
  ['left-pleat',null,.20,.07,.17,.54,6,.89,-.6,.28],
  ['left-hem','left-pleat',.17,.54,.08,.95,13,1.12,-.85,.25],
  ['middle-pleat',null,.50,.06,.50,.56,4,.83,.1,.27],
  ['middle-hem','middle-pleat',.50,.56,.53,.97,9,1.13,.35,.25],
  ['right-pleat',null,.80,.07,.83,.55,6,.94,.66,.28],
  ['right-hem','right-pleat',.83,.55,.91,.95,13,1.09,.9,.25]
 ],
 torso:[
  ['left-jacket',null,.28,.13,.23,.61,2.7,.92,.3,.35],
  ['left-tail','left-jacket',.23,.61,.19,.96,5.3,1.13,-.62,.31],
  ['right-jacket',null,.72,.13,.77,.60,2.7,.92,-.3,.35],
  ['right-tail','right-jacket',.77,.60,.82,.96,5.3,1.08,.48,.31]
 ],
 'arm-combined':[
  ['left-shoulder',null,.22,.06,.17,.48,8,.98,-.15,.24],
  ['left-elbow','left-shoulder',.17,.48,.19,.92,12,1.16,-.68,.23],
  ['right-shoulder',null,.78,.06,.83,.49,8,1.01,.4,.24],
  ['right-elbow','right-shoulder',.83,.49,.81,.92,12,1.16,.95,.23]
 ],
 'arm-raised':[
  ['raised-shoulder',null,.53,.91,.39,.61,8,1.00,-.2,.40],
  ['raised-elbow','raised-shoulder',.39,.61,.31,.17,18,1.10,.4,.42]
 ],
 'arm-lowered':[
  ['lowered-shoulder',null,.82,.06,.62,.50,6,1.01,.5,.39],
  ['lowered-elbow','lowered-shoulder',.62,.50,.30,.93,11,1.13,1.0,.37]
 ],
 'arm-left':[
  ['shoulder',null,.82,.05,.56,.48,9,.97,.05,.38],
  ['elbow','shoulder',.56,.48,.43,.93,14,1.2,-.62,.36]
 ],
 'arm-right':[
  ['shoulder',null,.18,.05,.45,.50,9,1.05,.4,.38],
  ['elbow','shoulder',.45,.50,.60,.94,14,1.18,.9,.36]
 ],
 // Authored 3-bone raised sleeves: shoulder -> elbow -> wrist grip.
 'arm-coat-left':[
  ['shoulder',null,.76,.86,.37,.69,1.35,.80,0,.28],
  ['elbow','shoulder',.37,.69,.71,.23,3.75,.91,-.15,.27],
  ['wrist','elbow',.71,.23,.88,.12,1.9,1.08,.38,.22]
 ],
 'arm-coat-right':[
  ['shoulder',null,.16,.89,.47,.65,1.35,.79,.32,.28],
  ['elbow','shoulder',.47,.65,.50,.21,3.25,.89,.55,.25],
  ['wrist','elbow',.50,.21,.44,.095,1.8,1.12,.80,.22]
 ],
 // Cloth roots held at grip, with delayed distal hem bones.
 'coat-panel-left':[
  ['coat-root',null,.77,.075,.61,.52,7.8,.80,-.38,.36],
  ['coat-hem','coat-root',.61,.52,.38,.955,12.5,1.08,-1.11,.30]
 ],
 'coat-panel-right':[
  ['coat-root',null,.67,.075,.42,.51,7.8,.80,.55,.36],
  ['coat-hem','coat-root',.42,.51,.69,.97,12.5,1.08,-.18,.30]
 ],
 'leg-combined':[
  ['left-knee',null,.37,.13,.36,.66,1.8,.76,0,.23],
  ['left-ankle','left-knee',.36,.66,.33,.92,3.5,.84,-.5,.21],
  ['right-knee',null,.66,.13,.66,.65,1.8,.78,.3,.23],
  ['right-ankle','right-knee',.66,.65,.67,.92,3.5,.83,.8,.21]
 ]
};
function defaultBones(kind){
 return (SEGMENTS[kind]||[]).map(([id,parent,hx,hy,tx,ty,amplitude,frequency,phase,radius])=>({
  id,parent,head:{x:hx,y:hy},tail:{x:tx,y:ty},
  amplitude,frequency,phase,radius,enabled:true
 }));
}
function normalizeBones(records,kind){
 const base=defaultBones(kind);
 if(!Array.isArray(records)||!records.length)return base;
 const matches=new Map(records.filter(r=>r&&typeof r.id==='string').map(r=>[r.id,r]));
 // Only approved bones belonging to THIS part are trusted; legacy v1
 // documents are transparently upgraded and do not mutate source pixels.
 return base.map(def=>{
  const q=matches.get(def.id)||{};
  const pt=(name)=>({x:clamp(finite(q[name]?.x,def[name].x),0,1),
   y:clamp(finite(q[name]?.y,def[name].y),0,1)});
  return {...def,head:pt('head'),tail:pt('tail'),
   amplitude:clamp(finite(q.amplitude,def.amplitude),-40,40),
   frequency:clamp(finite(q.frequency,def.frequency),.1,4),
   phase:clamp(finite(q.phase,def.phase),-6.283,6.283),
   radius:clamp(finite(q.radius,def.radius),.06,.8),
   enabled:q.enabled!==false};
 });
}
// Local shoulder, elbow and pelvic articulation; never globally rocks the body.
function jointGainFor(part,bone,idle){
 const j=idle?.joints;if(!j||!bone)return 0;
 const kind=part.kind||'',id=String(bone.id||'');
 if(kind.startsWith('arm-'))
  return /elbow|wrist|grip/.test(id)?finite(j.hands,0):finite(j.shoulders,0);
 if(kind==='torso'&&!bone.parent)return finite(j.shoulders,0)*.65;
 if(kind==='skirt'&&!bone.parent)return finite(j.hips,0);
 if(kind==='leg-combined')return 0; // planted legs are governed by ankle IK
 return 0;
}
function bonePoses(part,phase=0,idle=null){
 const records=part.bones||[],byId=new Map(),result=[];
 for(const b of records){
  const P={x:b.head.x*part.w,y:b.head.y*part.h};
  const T={x:b.tail.x*part.w,y:b.tail.y*part.h};
  const parent=b.parent&&byId.get(b.parent);
  const head=parent?parent.tailPos:P;
  const parentAngle=parent?parent.totalAngle:0;
  const group=idle?idle[idleGroup(part)]:null;
  const strength=group?group.amount*clamp(finite(idle.parts?.[part.id],1),0,20):1;
  // Independent root/tip strength and slight phase delay approximate inertia;
  // roots do not whip like ends, and different strands stay out of sync.
  const groupFactor=part.kind==='hair'?[.10,.37]:
   part.kind==='skirt'?[.10,.32]:
   part.kind==='torso'?[.18,.50]:
    part.kind.startsWith('coat-panel-')?[.25,.54]:
    part.kind.startsWith('arm-')?[.13,.32]:[.1,.22];
  const factor=groupFactor[b.parent?1:0];
  const speed=group?group.speed:1;
  const lag=group?.lag||0;
  const wave=Math.sin(phase*finite(b.frequency,1)*speed+
   finite(b.phase,0)-(b.parent?lag:lag*.25));
  const joint=jointGainFor(part,b,idle);
  // Wrist of the raised arm needs real displacement, not subpixel jitter.
  const gain=part.kind==='arm-raised'&&b.id.includes('elbow')?1.15:
    part.kind.startsWith('arm-coat-')&&/elbow|wrist/.test(b.id)?0.58:.24;
  const degrees=finite(b.amplitude,0)*(strength*factor+joint*gain);
  const angle=b.enabled!==false?clamp(degrees,-55,55)*Math.PI/180*wave:0;
  const theta=parentAngle+angle,cs=Math.cos(theta),sn=Math.sin(theta);
  const dv={x:T.x-P.x,y:T.y-P.y};
  const tailPos={x:head.x+dv.x*cs-dv.y*sn,y:head.y+dv.x*sn+dv.y*cs};
  const posed={...b,restHead:P,restTail:T,headPos:head,tailPos,totalAngle:theta};
  result.push(posed);byId.set(b.id,posed);
 }
 return result;
}
function skinnedPoint(part,u,v,phase=0,posed=null,idle=null){
 const x=u*part.w,y=v*part.h;
 const bones=posed||bonePoses(part,phase,idle);
 if(!bones.length)return{x:part.x+x,y:part.y+y};
 const wx=part.w,wy=part.h;
 // Each vertex is influenced by nearby joints of THIS texture only.
 // Roots are pinned; distal vertices inherit actual parent-child rotations.
 let sum=0,dx=0,dy=0;
 for(const b of bones){
  if(b.enabled===false)continue;
  const A=b.restHead,C=b.restTail;
  const vx=C.x-A.x,vy=C.y-A.y,den=Math.max(1,vx*vx+vy*vy);
  const along=((x-A.x)*vx+(y-A.y)*vy)/den;
  const t=clamp(along,0,1);
  const dist=Math.hypot(x-A.x-vx*t,y-A.y-vy*t);
  const radius=Math.max(4,b.radius*Math.max(wx,wy));
  const radial=Math.exp(-2*(dist/radius)**2);
  const length=smooth(clamp((along-.025)/.72,0,1));
  const raw=radial*length;
  if(raw<.0002)continue;
  const ca=Math.cos(b.totalAngle),sa=Math.sin(b.totalAngle);
  const px=b.headPos.x+(x-A.x)*ca-(y-A.y)*sa;
  const py=b.headPos.y+(x-A.x)*sa+(y-A.y)*ca;
  dx+=(px-x)*raw;dy+=(py-y)*raw;sum+=raw;
 }
 if(!sum)return{x:part.x+x,y:part.y+y};
 // Skin weights saturate smoothly at one, preserving attached roots and
 // limiting overlapping influences from distinct strand/pleat chains.
 // Independent ArtMesh attachment seam: the top 13% of each real
 // source component is pinned, with C1 easing into free distal motion.
 // This prevents torso/neck/arm shoulders and scalp roots from peeling.
 // Raised arm shoulder is at the bottom. The old top-root lock kept
 // the raised fingertips stationary regardless of slider value.
 const rootLock=(part.kind==='arm-raised'||part.kind.startsWith('arm-coat-'))?
  smooth(clamp((.91-v)/.23,0,1)):
  smooth(clamp((v-.13)/.23,0,1));
 const blend=(1-Math.exp(-sum*1.5))*rootLock;
 return {x:part.x+x+dx/sum*blend,y:part.y+y+dy/sum*blend};
}
function cleanPart(part,face,id,characterId){
 const p=part||{},spec=characterId==='female-06-outfit-02'&&face==='front'&&
   (id==='handwear_l'||id==='handwear_r')?
   (id==='handwear_l'
    ?['torso',.83,.065,.16,.92,'arm-left']
    :['torso',.17,.065,.85,.92,'arm-right']):
  characterId==='protagonist-crouch-axe'&&face==='front'?
  (PROTAGONIST_CROUCH[id]||FRONT[id]):
  (characterId==='char-003'||characterId==='char-003-outfit-02')&&face==='front'?
  (CHAR003_OUTFIT[id]||FRONT[id]):
  characterId==='char-004'&&face==='front'?
  (CHAR004[id]||FRONT[id]):
  (characterId==='char-002'||characterId==='char-002-psd-v1')&&face==='front'?
   (CHAR002[id]||FRONT[id]):
   (face==='back'?BACK:FRONT)[id];
 const w=Math.max(1,finite(p.canvas?.width||p.w,1));
 const h=Math.max(1,finite(p.canvas?.height||p.h,1));
 const def=spec||(id==='hair'?['head',.5,.06,.5,.9,'hair']:
    id==='cloth'?['pelvis',.5,.08,.5,.92,'skirt']:
    ['root',.5,.08,.5,.9,'unclassified']);
 return {id:String(id),name:String(p.name||id),x:finite(p.x,0),y:finite(p.y,0),w,h,
  // Existing 17/18-part local drafts are automatically upgraded from the
  // previous misaligned female-six shorts, without overwriting authored edits.
  // The identical preset is used by scripts/bind_female06_pants.py.
  placement:(characterId==='female-06'&&id==='pants_overlay'?
   {scaleX:.92,scaleY:.80,offsetX:-7,offsetY:-12}:
   {scaleX:1,scaleY:1,offsetX:0,offsetY:0}),
  parentId:def[0],kind:def[5],
  pivot:{x:def[1],y:def[2]},tip:{x:def[3],y:def[4]},
  mesh:def[5]==='pants-bound'?{columns:12,rows:12}:{
    columns:Math.min(def[5]==='hair'?6:5,Math.max(4,Math.ceil(w/35))),
    rows:Math.min(def[5]==='hair'?9:7,Math.max(4,Math.ceil(h/40)))},
  bones:defaultBones(def[5]),
  // The REST shape is always the original bitmap when preview is stopped.
  motion:{x:0,y:0,angle:0,frequency:1,phase:0},
  enabled:true};
}
const all=(layers,face,characterId)=>layers.filter(p=>p.sourcePart&&p.canvas).map(p=>cleanPart(p,face,String(p.partId||p.name),characterId));
function sanitize(record,original){
 if(!record)return original;
 const x={...original, ...record};
 x.id=original.id;x.name=original.name;
 x.x=original.x;x.y=original.y;x.w=original.w;x.h=original.h;
 x.parentId=typeof record.parentId==='string'?record.parentId:original.parentId;
 x.kind=original.kind; // authoritative source part role, not editable text heuristics
 x.enabled=record.enabled!==false;
 for(const field of ['pivot','tip']){
  x[field]={x:clamp(finite(record[field]?.x,original[field].x),0,1),
   y:clamp(finite(record[field]?.y,original[field].y),0,1)};
 }
 const m=record.motion||{};
 x.motion={
  x:clamp(finite(m.x,0),-80,80),
  y:clamp(finite(m.y,0),-80,80),
  angle:clamp(finite(m.angle,0),-25,25),
  frequency:clamp(finite(m.frequency,1),.25,4),
  phase:clamp(finite(m.phase,0),-6.2832,6.2832)
 };
 // Keep the authored pixel texture immutable. Size and position are
 // transformed in rest/world space before the same parent bone field.
 const t=record.placement||original.placement||{};
 x.placement={
  scaleX:clamp(finite(t.scaleX,1),.25,4),
  scaleY:clamp(finite(t.scaleY,1),.25,4),
  offsetX:clamp(finite(t.offsetX,0),-1024,1024),
  offsetY:clamp(finite(t.offsetY,0),-1024,1024)
 };
 x.mesh=original.mesh;
 x.bones=normalizeBones(record.bones,original.kind);
 if(original.kind==='pants-bound'){
  // Binding contract: the shorts do not have an independent skeleton or
  // garment jitter. Every pixel inherits the source body's leg skin field.
  x.motion={x:0,y:0,angle:0,frequency:1,phase:0};
  x.bones=[];
  x.skinBinding={target:'legwear',method:'shared-leg-field-v1',
    waist:'pelvis',left:'left-knee',right:'right-knee',rootLock:1};
 }
 return x;
}
function project(parts,characterId,face,previous=null){
 const base=all(parts,face,characterId);
 const prev=previous?.parts||{};
 const entries=base.map(p=>[p.id,sanitize(prev[p.id],p)]);
 return bindGripParents(bindBodyHierarchy({format:'paperchalk-part-rig-v1',characterId,face,canvas:[1024,1024],
  idleProfile:sanitizeIdleProfile(previous?.idleProfile||defaultIdleProfile()),
  ...(previous?.actionProfiles?{actionProfiles:previous.actionProfiles}:{}),
  ...(previous?.layerOrder?{layerOrder:previous.layerOrder}:{}),
  ...(previous?.partLayerGroups?{partLayerGroups:previous.partLayerGroups}:{}),
  ...(previous?.gripOverlays?{gripOverlays:previous.gripOverlays}:{}),
  // Authored per-part alpha masks: source is drawn again in FRONT of target.
  // PNG stays in source-texture local coordinates, so the same ArtMesh warps it.
  ...(Array.isArray(previous?.occlusionMasks)?{occlusionMasks:previous.occlusionMasks
   .filter(m=>m&&typeof m.source==='string'&&typeof m.target==='string'&&
    parts.some(p=>p.partId===m.source||p.name===m.source)&&
    (Array.isArray(m.targets)?m.targets:[m.target]).some(t=>typeof t==='string'&&
      t!==m.source&&parts.some(p=>p.partId===t||p.name===t))&&
    typeof m.png==='string'&&m.png.startsWith('data:image/png;base64,'))
   .map(m=>({source:m.source,target:m.target,
     name:typeof m.name==='string'?m.name.slice(0,80):'',
     targets:Array.isArray(m.targets)?[...new Set(m.targets.filter(v=>typeof v==='string'))]:[m.target],
     direction:m.direction==='behind'?'behind':'front',
     png:m.png,enabled:m.enabled!==false}))}:{}),
  ...(previous?.animationGraph?{animationGraph:previous.animationGraph}:{}),
  ...(previous?.motionQualityProfile?{motionQualityProfile:previous.motionQualityProfile}:{}),
  parts:Object.fromEntries(entries)}));
}

/* Anchored 2D parent hierarchy, rebuilt from ORIGINAL source component positions.
   Shoes/feet are ground nodes. Pelvis connects to two planted ankle chains.
   Chest/shoulders descend from pelvis; neck, eyes and hair descend from shoulders. */
// Reusable parent constraints: the child's coat root inherits torso pose,
// while its grasped edge is constrained to the genuine moving wrist.
// Non-enumerable source references are never stored in rig JSON.
function bindGripParents(model){
 for(const part of Object.values(model?.parts||{})){
  const link=part.followGrip;
  const target=link&&model.parts[link.partId];
  if(!link||!target||target===part||target.followGrip)continue;
  Object.defineProperty(part,'_gripParent',{value:target,configurable:true});
  Object.defineProperty(part,'_gripCache',{value:null,writable:true,configurable:true});
 }
 return model;
}
function bindBodyHierarchy(model){
 const p=model?.parts;if(!p)return model;
 const pick=(...ids)=>ids.map(id=>p[id]).find(Boolean);
 const legs=pick('legs','legwear'),feet=pick('shoes','footwear','footwear_left','footwear_right'),
  skirt=pick('skirt','bottomwear','pants_overlay')||(model.characterId==='char-004'?legs:null),
  torso=pick('jacket','topwear'),
  face=pick('face'),hair=pick('front_hair','rear_hair','back_hair','head_hair'),neck=pick('neck');
 // Female-06's original 17-part PSD has bare feet WITHIN the legwear mesh.
 // They are planted at the two ankle-chain tails, not a missing shoe layer.
 if(!legs||(!feet&&model.characterId!=='female-06')||!skirt||!torso)return model;
 const xy=(part,u,v)=>({x:part.x+part.w*u,y:part.y+part.h*v});
 const get=id=>legs.bones?.find(b=>b.id===id);
 const chain=side=>{
  const upper=get(side+'-knee'),lower=get(side+'-ankle');
  return upper&&lower?{hip:xy(legs,upper.head.x,upper.head.y),
   knee:xy(legs,upper.tail.x,upper.tail.y),
   ankle:xy(legs,lower.tail.x,lower.tail.y),
   hy:upper.head.y,ky:upper.tail.y,ay:lower.tail.y}:null;
 };
 const left=chain('left'),right=chain('right');if(!left||!right)return model;
 const layout={pelvis:xy(skirt,.5,.08),shoulder:xy(torso,.5,.12),shoulderHalfWidth:torso.w*.48,
  head:face?xy(face,.5,.5):hair?xy(hair,.5,.35):xy(torso,.5,-.2),
  neck:neck?xy(neck,.5,.12):face?xy(face,.5,.88):xy(torso,.5,-.12),
  neckTop:neck?neck.y+neck.h*.12:(face?face.y+face.h*.88:torso.y),
  neckBottom:neck?neck.y+neck.h*.96:(face?face.y+face.h*1.12:torso.y+15),
  left,right,legsId:legs.id,feetId:feet?.id||legs.id};
 // Cropped or unaligned imports must NOT acquire fabricated body motion.
 if(layout.pelvis.y-layout.shoulder.y<15)return model;
 Object.defineProperty(model,'bodyHierarchy',{value:layout,configurable:true});
 for(const part of Object.values(p)){
  Object.defineProperty(part,'_bodyHierarchy',{value:layout,configurable:true});
  if(part.kind==='pants-bound'&&part.id==='pants_overlay'&&
     model.characterId==='female-06'){
   // Newly installed garment may be absent from a user's 17-piece local
   // saved draft. The binding is an authoritative rig contract, NOT
   // optional UI state inherited from an old stored JSON blob.
   part.skinBinding={target:legs.id,method:'shared-leg-field-v1',
    waist:'pelvis',left:'left-knee',right:'right-knee',rootLock:1};
   // Share the leg deformation source *by reference*; don't duplicate
   // or separately keyframe the shorts' hips, inseam and two thigh zones.
   Object.defineProperty(part,'_garmentLegs',{value:legs,configurable:true});
  }
 }
 return model;
}
function humanPoseAt(part,phase=0,idle=null){
 const rig=part?._bodyHierarchy;if(!rig)return null;
 const h=clamp(finite(idle?.joints?.hips,0),0,8),
  sh=clamp(finite(idle?.joints?.shoulders,0),0,8),
  speed=clamp(finite(idle?.cloth?.speed,.8),.25,2.5);
 const a=Math.sin(phase*.65*speed),b=Math.sin(phase*.89*speed+.43);
 // Breathing locally expands the upper chest and lifts its descendant
 // shoulder chain. Shoes, ankles, legs and pelvis remain grounded.
 const respiration=clamp(finite(idle?.breath?.amount,0),0,3)*
  .5*(1-Math.cos(phase*.74*clamp(finite(idle?.breath?.speed,.85),.25,2.5)));
 return {rig,breathLift:respiration*3.0,breathExpand:respiration*2.25,
  hipX:a*h*1.1,hipY:(1-a*a)*h*.12,hipAngle:a*h*.0055,
  shoulderX:b*sh*.40,shoulderY:Math.cos(phase*.89*speed+.43)*sh*.13,
  shoulderAngle:b*sh*.009,
  // Cervical counter-rotation keeps the head balanced over the shoulders.
  neckAngle:-b*sh*.0033+Math.sin(phase*.69*speed+1.2)*sh*.001};
}
function turn(p,o,angle){
 const a=p.x-o.x,b=p.y-o.y,c=Math.cos(angle),s=Math.sin(angle);
 return {x:o.x+a*c-b*s,y:o.y+a*s+b*c};
}
function hipPoint(p,pose){
 const q=turn(p,pose.rig.pelvis,pose.hipAngle);
 return {x:q.x+pose.hipX,y:q.y+pose.hipY};
}
function shoulderPoint(p,pose){
 const q=turn(hipPoint(p,pose),hipPoint(pose.rig.shoulder,pose),pose.shoulderAngle);
 return {x:q.x+pose.shoulderX,y:q.y+pose.shoulderY-pose.breathLift};
}
// Rib cage widens symmetrically only in its upper region. Head/eyes/hair
// retain the rigid shoulder-to-neck-to-head transform, without head scaling.
function ribcagePoint(p,pose){
 const upper=shoulderPoint(p,pose);
 const height=smooth((pose.rig.pelvis.y-p.y)/
  Math.max(1,pose.rig.pelvis.y-pose.rig.shoulder.y));
 const lateral=clamp((p.x-pose.rig.shoulder.x)/
  Math.max(35,pose.rig.shoulderHalfWidth||85),-1,1);
 return {x:upper.x+lateral*pose.breathExpand*height,y:upper.y};
}
function headPoint(p,pose){
 const upperNeck=shoulderPoint(pose.rig.neck,pose);
 return turn(shoulderPoint(p,pose),upperNeck,pose.neckAngle);
}
function neckPoint(p,pose){
 // The cervical base inherits the widened rib-cage surface, while the
 // upper neck follows the rigid head hinge without a visible gap.
 const low=ribcagePoint(p,pose),high=headPoint(p,pose),r=pose.rig;
 const w=smooth((r.neckBottom-p.y)/Math.max(1,r.neckBottom-r.neckTop));
 return {x:low.x+(high.x-low.x)*w,y:low.y+(high.y-low.y)*w};
}
function kneeIK(c,pose){
 const h=hipPoint(c.hip,pose),a=c.ankle,orig=c.knee;
 const L1=Math.hypot(orig.x-c.hip.x,orig.y-c.hip.y),
  L2=Math.hypot(a.x-orig.x,a.y-orig.y);
 const dx=a.x-h.x,dy=a.y-h.y,d=Math.max(.001,Math.hypot(dx,dy));
 const factor=Math.max(1,d/Math.max(.001,L1+L2));
 const l1=L1*factor,l2=L2*factor;
 const along=Math.max(0,Math.min(d,(l1*l1-l2*l2+d*d)/(2*d)));
 const altitude=Math.sqrt(Math.max(0,l1*l1-along*along));
 const ex=dx/d,ey=dy/d;
 const cross=(a.x-c.hip.x)*(orig.y-c.hip.y)-
  (a.y-c.hip.y)*(orig.x-c.hip.x);
 const sign=cross>=0?1:-1;
 return {hip:h,knee:{x:h.x+ex*along-sign*ey*altitude,
  y:h.y+ey*along+sign*ex*altitude},ankle:a};
}
function legPoint(part,point,pose){
 const u=(point.x-part.x)/part.w,v=(point.y-part.y)/part.h;
 const a=pose.rig.left,b=pose.rig.right;
 if(v>=Math.max(a.ay,b.ay))return point;
 const shift=c=>{
  const q=kneeIK(c,pose),r=c;
  let from,to,t;
  if(v<=c.hy){from=q.hip;to=r.hip;}
  else if(v<=c.ky){
   t=smooth((v-c.hy)/Math.max(.001,c.ky-c.hy));
   from={x:q.hip.x*(1-t)+q.knee.x*t,y:q.hip.y*(1-t)+q.knee.y*t};
   to={x:r.hip.x*(1-t)+r.knee.x*t,y:r.hip.y*(1-t)+r.knee.y*t};
  }else{
   t=smooth((v-c.ky)/Math.max(.001,c.ay-c.ky));
   from={x:q.knee.x*(1-t)+q.ankle.x*t,y:q.knee.y*(1-t)+q.ankle.y*t};
   to={x:r.knee.x*(1-t)+r.ankle.x*t,y:r.knee.y*(1-t)+r.ankle.y*t};
  }
  return {x:from.x-to.x,y:from.y-to.y};
 };
 const l=shift(a),r=shift(b),wr=smooth((u-.4)/.2);
 return {x:point.x+l.x*(1-wr)+r.x*wr,y:point.y+l.y*(1-wr)+r.y*wr};
}
function parentRole(part){
 if(!part)return 'none';
 if(part.parentId==='ground'||part.id==='shoes'||part.id==='footwear')return 'ground';
 if(part.kind==='leg-combined')return 'legs';
 if(part.kind==='pants-bound')return 'garment';
 if(part.kind==='skirt')return 'pelvis';
 if(part.kind==='torso'||part.kind.startsWith('coat-panel-'))return 'torso';
 if(part.id==='neck')return 'neck';
 if(part.kind.startsWith('arm-'))return 'shoulder';
 if(part.kind==='head-combined'||part.kind==='hair'||part.kind==='face'||part.kind==='mouth'||
  part.kind==='eyes-combined'||['head','front_hair','eye_white','eyewhite'].includes(part.parentId))
  return 'head';
 return 'none';
}
function parentPoint(part,p,phase=0,idle=null,pose=null){
 const h=pose||humanPoseAt(part,phase,idle);if(!h)return p;
 switch(parentRole(part)){
 case 'ground':case 'none':return p;
 case 'legs':return legPoint(part,p,h);
 case 'garment':
  // Every shorts vertex samples the same 2-leg IK / area-weighted skin
  // field used by the underlying ORIGINAL body ArtMesh. No independent
  // hip motion means that hem, inseam and waistband cannot drift away.
  return part._garmentLegs?legPoint(part._garmentLegs,p,h):hipPoint(p,h);
 case 'pelvis':return hipPoint(p,h);
 case 'neck':return neckPoint(p,h);
 case 'torso':{
  const low=hipPoint(p,h),high=ribcagePoint(p,h);
  const rig=h.rig,w=smooth((rig.pelvis.y-p.y)/Math.max(1,rig.pelvis.y-rig.shoulder.y));
  return {x:low.x+(high.x-low.x)*w,y:low.y+(high.y-low.y)*w};
 }
 case 'head':return headPoint(p,h);
 case 'shoulder':return ribcagePoint(p,h);
 default:return shoulderPoint(p,h);
 }
}
function applyRigidParent(ctx,part,phase,idle){
 if(parentRole(part)!=='head'&&parentRole(part)!=='shoulder')return;
 if(!humanPoseAt(part,phase,idle))return;
 const o=parentPoint(part,{x:0,y:0},phase,idle),
  x=parentPoint(part,{x:1,y:0},phase,idle),
  y=parentPoint(part,{x:0,y:1},phase,idle);
 ctx.transform(x.x-o.x,x.y-o.y,y.x-o.x,y.y-o.y,o.x,o.y);
}

// Non-destructive local affine placement; never changes source PNG, mesh UV,
// parent IDs or occlusion mask coordinates. For fitted clothing this transform
// is evaluated BEFORE the leg IK deformation, preventing detached shorts.
function placedRestPoint(part,point){
 const t=part.placement;
 if(!t)return point;
 const sx=clamp(finite(t.scaleX,1),.25,4),sy=clamp(finite(t.scaleY,1),.25,4);
 const px=part.x+part.w*part.pivot.x,py=part.y+part.h*part.pivot.y;
 return {x:px+(point.x-px)*sx+clamp(finite(t.offsetX,0),-1024,1024),
  y:py+(point.y-py)*sy+clamp(finite(t.offsetY,0),-1024,1024)};
}
function placedBounds(part){
 const a=placedRestPoint(part,{x:part.x,y:part.y});
 const b=placedRestPoint(part,{x:part.x+part.w,y:part.y+part.h});
 return {x:a.x,y:a.y,w:b.x-a.x,h:b.y-a.y};
}
// Each part's raster mesh uses its OWN normalized local coordinates.
// Its own pivot is fixed; deformation weights increase toward its tip.
// No other part is sampled, moved, cut, duplicated, or transformed.
function warpPoint(part,u,v,phase=0,posed=null,idle=null){
 if(!part.enabled)return{x:part.x+u*part.w,y:part.y+v*part.h};
 const base=skinnedPoint(part,u,v,phase,posed,idle);
 const q=part.motion;
 const dx=part.tip.x-part.pivot.x,dy=part.tip.y-part.pivot.y;
 const den=Math.max(.0001,dx*dx+dy*dy);
 const along=((u-part.pivot.x)*dx+(v-part.pivot.y)*dy)/den;
 const weight=smooth(along);
 const group=idle?.[idleGroup(part)];
 const partStrength=idle?clamp(finite(idle.parts?.[part.id],1),0,20):1;
 const scale=group?group.amount*partStrength:1;
 const oscillation=Math.sin(phase*q.frequency*(group?.speed||1)+q.phase-(group?.lag||0));
 const a=clamp(finite(q.angle,0),-2,2)*weight*oscillation*Math.PI/180;
 const baseX=(u-part.pivot.x)*part.w,baseY=(v-part.pivot.y)*part.h;
 const cs=Math.cos(a),sn=Math.sin(a);
 const body=bodyIdleAt(part,phase,idle);
 const air=windField(part,u,v,phase,idle);
 const px=base.x+(baseX*cs-baseY*sn-baseX)*scale+
  clamp(finite(q.x,0),-4,4)*weight*oscillation*scale+air.x+body.x;
 const py=base.y+(baseX*sn+baseY*cs-baseY)*scale+
  clamp(finite(q.y,0),-4,4)*weight*oscillation*scale+air.y+body.y;
 const placed=placedRestPoint(part,{x:px,y:py});
 const inherited=parentPoint(part,bodyPosePoint(placed.x,placed.y,phase,idle),phase,idle);
 // Two parents in one deformation: pelvis->torso->coat, wrist->grasped fold.
 // Follow the authentic hand ArtMesh, never clone the hand onto the jacket.
 const link=part.followGrip,hand=part._gripParent;
 if(!link||!hand)return inherited;
 let cache=part._gripCache;
 if(!cache||cache.phase!==phase||cache.idle!==idle){
  const point={x:clamp(finite(link.point?.x,.5),0,1),
   y:clamp(finite(link.point?.y,.5),0,1)};
  const rest={x:hand.x+point.x*hand.w,y:hand.y+point.y*hand.h};
  const moved=warpPoint(hand,point.x,point.y,phase,null,idle);
  const parent=parentPoint(part,rest,phase,idle);
  cache={phase,idle,delta:{x:clamp(moved.x-parent.x,-8,8),
   y:clamp(moved.y-parent.y,-8,8)}};
  part._gripCache=cache;
 }
 const seam=link.seam||{x:part.x+part.w*part.pivot.x,
  y:part.y+part.h*part.pivot.y};
 const rx=clamp(finite(link.radiusX,90),25,250),
  ry=clamp(finite(link.radiusY,155),25,350);
 const ox=(part.x+u*part.w-finite(seam.x,0))/rx,
  oy=(part.y+v*part.h-finite(seam.y,0))/ry;
 const w=clamp(finite(link.strength,1),0,1)*Math.exp(-2*(ox*ox+oy*oy));
 return {x:inherited.x+cache.delta.x*w,
  y:inherited.y+cache.delta.y*w};
}
function drawTri(ctx,image,A,B,C,D,E,F){
 const ux=B.x-A.x,uy=B.y-A.y,vx=C.x-A.x,vy=C.y-A.y;
 const det=ux*vy-uy*vx;if(Math.abs(det)<.00001)return;
 const dx=E.x-D.x,dy=E.y-D.y,ex=F.x-D.x,ey=F.y-D.y;
 const aa=(dx*vy-ex*uy)/det,bb=(dy*vy-ey*uy)/det;
 const cc=(ex*ux-dx*vx)/det,dd=(ey*ux-dy*vx)/det;
 const tx=D.x-aa*A.x-cc*A.y,ty=D.y-bb*A.x-dd*A.y;
 ctx.save();ctx.beginPath();
 // Canvas antialiasing leaves triangular seams even when DEBUG wireframe
 // is disabled. Expand triangle EDGES in their normal direction by 1.6px.
 // The incenter is equidistant from all edges, unlike the old centroid
 // radial 0.45px expansion which left translucent hair/skirt cracks.
 const ab=Math.hypot(E.x-D.x,E.y-D.y),bc=Math.hypot(F.x-E.x,F.y-E.y),
  ca=Math.hypot(D.x-F.x,D.y-F.y),perimeter=ab+bc+ca;
 if(perimeter<.0001){ctx.restore();return;}
 const cx=(bc*D.x+ca*E.x+ab*F.x)/perimeter,
  cy=(bc*D.y+ca*E.y+ab*F.y)/perimeter;
 const inradius=Math.abs((E.x-D.x)*(F.y-D.y)-(E.y-D.y)*(F.x-D.x))/perimeter;
 const scale=1+Math.min(.8,1.6/Math.max(.5,inradius));
 const enlarge=p=>({x:cx+(p.x-cx)*scale,y:cy+(p.y-cy)*scale});
 const p=enlarge(D),q=enlarge(E),r=enlarge(F);
 ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.lineTo(r.x,r.y);ctx.closePath();ctx.clip();
 // transform() composes with the author's existing zoom/pan stage transform.
 ctx.transform(aa,bb,cc,dd,tx,ty);
 // Only sample the triangle's *own* source cell rather than uploading the
 // entire RGBA part bitmap for every one of thousands of triangles.
 // Enlarged triangles require a UV guard as well: crop outside each
 // source cell by 4px so bilinear filtering never samples a clipped edge.
 const minX=Math.max(0,Math.floor(Math.min(A.x,B.x,C.x))-4);
 const minY=Math.max(0,Math.floor(Math.min(A.y,B.y,C.y))-4);
 const maxX=Math.min(image.width,Math.ceil(Math.max(A.x,B.x,C.x))+4);
 const maxY=Math.min(image.height,Math.ceil(Math.max(A.y,B.y,C.y))+4);
 if(maxX>minX&&maxY>minY)
  ctx.drawImage(image,minX,minY,maxX-minX,maxY-minY,minX,minY,maxX-minX,maxY-minY);
 ctx.restore();
}
// Eye timing is in the same continuous phase as hair/skirt idle, but blink
// visibility is NOT connected to body breathing or procedural mesh amplitude.
// Short organic closure about every 4.6s with a second blink every third cycle.
function blinkAmount(phase){
 const seconds=Math.max(0,finite(phase,0))*3.6/(2*Math.PI);
 const period=4.6,cycle=Math.floor(seconds/period);
 const t=seconds-cycle*period;
 const pulse=(at,width)=>{
  const d=Math.abs(t-at)/width;
  return d>=1?0:Math.pow(Math.cos(d*Math.PI/2),2);
 };
 return clamp(Math.max(pulse(.9,.145),cycle%3===2?pulse(1.17,.11):0),0,1);
}
// Battle PSD uses one shared body/face model. Only arm transforms and the
// held weapon differ between actions; these are ordered BACK -> FRONT.
const BATTLE_FRONT_STACK=['back_hair','legwear','footwear','axe_overhead',
 'bottomwear','neck','topwear','axe_held','handwear_r','handwear_l',
 'ears_r','ears_l','face','eyewhite_r','eyewhite_l','irides_r','irides_l',
 'eyelash_r','eyelash_l','eyebrow_r','eyebrow_l','mouth','front_hair','headwear'];
const BATTLE_ACTIONS={
 default:'combat',transitionMs:420,actions:{
  idle:{label:'日常待机 · 共用身体',parts:{
   handwear_r:{angle:-4},handwear_l:{angle:43},axe_held:{opacity:0}}},
  combat:{label:'战斗戒备 · 手臂与斧头',parts:{
   handwear_r:{angle:0},handwear_l:{angle:0},axe_held:{opacity:1}}}
 }};
function actionSet(model){
 return model?.actionProfiles ||
  (model?.characterId==='protagonist-battle-front'&&model?.face==='front'?BATTLE_ACTIONS:null);
}
function actionNames(model){
 const config=actionSet(model);
 return config?Object.entries(config.actions||{}).map(([id,pose])=>({id,label:pose.label||id})):[];
}
function actionPart(model,id,now=typeof performance!=='undefined'?performance.now():0){
 const config=actionSet(model),zero={x:0,y:0,angle:0,opacity:1};
 if(!config)return zero;
 const current=model.actionState||{to:config.default},target=current.to||config.default;
 const goal={...zero,...config.actions?.[target]?.parts?.[id]};
 const length=Number(current.duration)||Math.max(120,Number(config.transitionMs)||420);
 const fraction=current.start==null?1:smooth((now-current.start)/length);
 const old=current.fromParts?.[id]||{...zero,...config.actions?.[current.from||config.default]?.parts?.[id]};
 return Object.fromEntries(Object.keys(zero).map(key=>[key,finite(old[key],zero[key])*(1-fraction)+finite(goal[key],zero[key])*fraction]));
}
function setAction(model,name,now=typeof performance!=='undefined'?performance.now():0){
 const config=actionSet(model);
 if(!config?.actions?.[name])return false;
 const previous=model.actionState?.to||config.default;
 if(previous===name){if(!model.actionState)model.actionState={to:name};return true;}
 const fromParts={};
 for(const id of Object.keys(model.parts||{}))fromParts[id]=actionPart(model,id,now);
 model.actionState={from:previous,fromParts,to:name,start:now,
  duration:Math.max(120,Number(config.transitionMs)||420)};
 return true;
}
// Original protagonist identity, 17 UNCHANGED standing PSD parts.
// Only battle arms and weapon are added; order is BACK -> FRONT.
const UNIFIED_FRONT_STACK=['rear_hair','sleeves_and_hands',
 'battle_handwear_r','battle_handwear_l','legs','shoes','neck','skirt','jacket','battle_axe',
 'ears','face','eye_white','irises','lashes','brows','front_hair','nose','mouth','hair_clip'];
const FACE_STACK=['rear_hair','sleeves_and_hands','legs','shoes','neck',
  'skirt','jacket','ears','face','eye_white','irises','lashes',
  'brows','front_hair','nose','mouth','hair_clip'];
const FACE_MICRO=new Set(['face','head','head_reference','ears','brows','eyebrow','nose','mouth','hair_clip',
  'eye_white','irises','lashes','eyewhite','irides','eyelash',
  'ears_r','ears_l','eyebrow_r','eyebrow_l',
  'eyewhite_r','eyewhite_l','irides_r','irides_l','eyelash_r','eyelash_l']);
function drawFacePart(ctx,source,part,phase,idle){
 const img=source.canvas,id=part.id,blink=blinkAmount(phase);
 // Align attached facial pieces to exactly the same barely visible head
 // movement; never skin/melt tiny eyebrows/nose with a large triangular grid.
 const motion=bodyIdleAt(part,phase,idle);
 const lean=bodyPoseAt(phase,idle);
 ctx.save();
 ctx.globalAlpha=source.opacity??1;
 // Same body transform as skinned hair, arms, clothing and legs.
 ctx.transform(1,0,-lean.lean,1,lean.feet*lean.lean,0);
 ctx.translate(motion.x,motion.y);
 applyRigidParent(ctx,part,phase,idle);
 const t=part.placement||{};
 if(t.scaleX!==1||t.scaleY!==1||t.offsetX||t.offsetY){
  const ax=part.x+part.w*part.pivot.x,ay=part.y+part.h*part.pivot.y;
  ctx.translate(ax+(t.offsetX||0),ay+(t.offsetY||0));
  ctx.scale(t.scaleX||1,t.scaleY||1);
  ctx.translate(-ax,-ay);
 }
 if(id==='eye_white'||id==='irises'||id==='eyewhite'||id==='irides'||
    /^eyewhite_[lr]$/.test(id)||/^irides_[lr]$/.test(id)){
  // Real iris/eye-white PNGs gradually disappear under closing eyelids.
  ctx.globalAlpha*=1-blink;
  if(ctx.globalAlpha>0.001)ctx.drawImage(img,part.x,part.y);
 }else if(id==='lashes'||id==='eyelash'||/^eyelash_[lr]$/.test(id)){
  // The source lash art forms the closed eyelid. Squash toward its center,
  // not toward the face origin; both eyes keep their native proportions.
  const center=part.y+part.h*.52;
  ctx.translate(0,center);
  ctx.scale(1,1-blink*.86);
  ctx.translate(0,-center);
  ctx.drawImage(img,part.x,part.y);
 }else if(id==='nose'){
  // The source is a minuscule translucent anime-nose dot. Preserve its PNG
  // exactly, but provide a soft subpixel edge so it doesn't vanish under
  // the front fringe or when the game canvas is downscaled on mobile.
  ctx.shadowBlur=1.25;
  ctx.shadowOffsetY=.1;
  ctx.shadowColor='rgba(104,67,63,.38)';
  ctx.drawImage(img,part.x,part.y);
 }else ctx.drawImage(img,part.x,part.y);
 ctx.restore();
}
function drawPart(ctx,source,part,phase=0,drawMesh=false,idle=null){
 if(!source?.canvas||!part)return;
 if(FACE_MICRO.has(part.id)||part.kind==='eyes-combined'){
  drawFacePart(ctx,source,part,phase,idle);
  return;
 }
 // More tessellation where side locks are blown ABOVE the shoulders.
 // Mesh density changes only during windy preview/playback; source pixels
 // and underlying independently saved bone bindings stay untouched.
 const weather=idle?.weather||idle?.preset;
 // Increase mesh density only for large user-selected bending. This limits
 // visible triangle cracks without changing the original source pixels.
 const largeMotion=idle&&(part.kind==='hair'||part.kind==='skirt')&&
  idle[idleGroup(part)].amount*clamp(finite(idle.parts?.[part.id],1),0,20)>1.2;
 const windy=weather==='windy'||largeMotion;
 const image=source.canvas,
  cols=windy&&part.kind==='hair'?Math.max(part.mesh.columns,12):
   windy&&part.kind==='skirt'?Math.max(part.mesh.columns,10):part.mesh.columns,
  rows=windy&&part.kind==='hair'?Math.max(part.mesh.rows,15):
   windy&&part.kind==='skirt'?Math.max(part.mesh.rows,12):part.mesh.rows;
 const strength=idle?idle[idleGroup(part)].amount*clamp(finite(idle.parts?.[part.id],1),0,20):1;
 const jointsActive=(part.bones||[]).some(b=>b.enabled!==false&&
  Math.abs(b.amplitude)>1e-5&&jointGainFor(part,b,idle)>0);
 const role=parentRole(part);
 const linked=!!part._bodyHierarchy&&role!=='none'&&role!=='ground'&&
  (Math.abs(idle?.joints?.hips||0)>0||Math.abs(idle?.joints?.shoulders||0)>0||
   Math.abs(idle?.breath?.amount||0)>0);
 const active=part.enabled&&(linked||jointsActive||Math.abs(idle?.body?.amount||0)>0||
  (strength>0&&(Object.values(part.motion).some((v,i)=>i<3&&Math.abs(v)>1e-5)||
  (part.bones||[]).some(b=>b.enabled!==false&&Math.abs(b.amplitude)>1e-5)||
  (weather==='windy'||weather==='breeze')&&
   (part.kind==='hair'||part.kind==='skirt'))));
 ctx.save();ctx.globalAlpha=source.opacity??1;
 if(!active){
  const t=part.placement||{};
  if(t.scaleX!==1||t.scaleY!==1||t.offsetX||t.offsetY){
   const b=placedBounds(part);
   ctx.drawImage(image,b.x,b.y,b.w,b.h);
  }else ctx.drawImage(image,part.x,part.y);
 }else{
  const posed=bonePoses(part,phase,idle);
  const vertices=[];
  for(let j=0;j<=rows;j++){
   const line=[];
   for(let i=0;i<=cols;i++)line.push(warpPoint(part,i/cols,j/rows,phase,posed,idle));
   vertices.push(line);
  }
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
   const A={x:i*part.w/cols,y:j*part.h/rows},B={x:(i+1)*part.w/cols,y:j*part.h/rows},
    C={x:i*part.w/cols,y:(j+1)*part.h/rows},D={x:(i+1)*part.w/cols,y:(j+1)*part.h/rows};
   const a=vertices[j][i],b=vertices[j][i+1],c=vertices[j+1][i],d=vertices[j+1][i+1];
   drawTri(ctx,image,A,B,C,a,b,c);drawTri(ctx,image,B,D,C,b,d,c);
  }
 }
 ctx.restore();
 if(drawMesh){
  const poses=bonePoses(part,phase,idle);
  ctx.save();ctx.strokeStyle='rgba(101,215,255,.45)';ctx.lineWidth=.9;
  for(let j=0;j<=rows;j++){
   ctx.beginPath();
   for(let i=0;i<=cols;i++){
    const p=warpPoint(part,i/cols,j/rows,phase,poses,idle);
    if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
   }ctx.stroke();
  }
  for(let i=0;i<=cols;i++){
   ctx.beginPath();
   for(let j=0;j<=rows;j++){
    const p=warpPoint(part,i/cols,j/rows,phase,poses,idle);
    if(!j)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
   }ctx.stroke();
  }
  // Selected part displays its actual joint chain, not a decorative
  // fixed-coordinate stick figure. Yellow heads, cyan tails.
  for(const b of poses){
   ctx.save();ctx.lineWidth=1.6;ctx.strokeStyle='#ffd26e';
   ctx.beginPath();ctx.moveTo(part.x+b.headPos.x,part.y+b.headPos.y);
   ctx.lineTo(part.x+b.tailPos.x,part.y+b.tailPos.y);ctx.stroke();
   ctx.fillStyle='#ffd26e';ctx.beginPath();
   ctx.arc(part.x+b.headPos.x,part.y+b.headPos.y,3.5,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#68e6fa';ctx.beginPath();
   ctx.arc(part.x+b.tailPos.x,part.y+b.tailPos.y,3.5,0,Math.PI*2);ctx.fill();
   ctx.restore();
  }
  ctx.restore();
 }
}
// Unified bidirectional occlusion painter. A mask pixel is PARTITIONED
// between its source's usual slot and the requested depth slot. This avoids
// painting the full hand/collar again (ghosted, repeated alpha).
const alphaMaskCache=new WeakMap(),maskLookupCache=new WeakMap();
let depthPlanCache=new WeakMap();
if(typeof window!=='undefined'&&typeof window.addEventListener==='function')
 window.addEventListener('paperchalk:art-dirty',()=>{depthPlanCache=new WeakMap()});
function sourceMaskCanvas(entry,source){
 if(!entry||!source?.canvas)return null;
 const live=entry._canvas,w=source.canvas.width,h=source.canvas.height;
 if(live&&live.width===w&&live.height===h)return live;
 if(typeof entry.png!=='string'||!entry.png.startsWith('data:image/png;base64,'))return null;
 let info=maskLookupCache.get(entry);
 if(!info||info.uri!==entry.png){
  const img=new Image();info={uri:entry.png,img,ready:false};maskLookupCache.set(entry,info);
  img.onload=()=>{info.ready=img.width===w&&img.height===h};
  img.onerror=()=>{info.ready=false};
  img.src=entry.png;
 }
 return info.ready?info.img:null;
}
function sourceCoverage(entry,source){
 const mask=sourceMaskCanvas(entry,source);if(!mask)return null;
 const revision=Number(entry._revision)||0,cache=alphaMaskCache.get(entry);
 if(cache&&cache.mask===mask&&cache.revision===revision)return cache;
 const width=source.canvas.width,height=source.canvas.height;
 const c=document.createElement('canvas');c.width=width;c.height=height;
 const g=c.getContext('2d',{willReadFrequently:true});
 g.drawImage(mask,0,0,width,height);
 const data=g.getImageData(0,0,width,height).data;
 const alphas=new Uint8Array(width*height);
 for(let i=0;i<alphas.length;i++)alphas[i]=data[i*4+3];
 const result={mask,revision,alphas};
 alphaMaskCache.set(entry,result);
 return result;
}
function maskTargets(entry){
 return Array.isArray(entry.targets)?entry.targets:
   typeof entry.target==='string'?[entry.target]:[];
}
function getDepthPlan(source,id,stack,model,visible){
 const baseIndex=stack.indexOf(id);
 if(baseIndex<0||!source.canvas)return null;
 const rules=[];
 for(const entry of (Array.isArray(model.occlusionMasks)?model.occlusionMasks:[])){
  if(!entry||entry.enabled===false||entry.source!==id)continue;
  const targets=[...new Set(maskTargets(entry))].filter(t=>t!==id&&visible.has(t));
  if(!targets.length)continue;
  const coverage=sourceCoverage(entry,source);
  if(!coverage)continue; // Never erase an image while its PNG is decoding.
  const indexes=targets.map(t=>stack.indexOf(t)).filter(i=>i>=0);
  if(!indexes.length)continue;
  const behind=entry.direction==='behind';
  rules.push({entry,alpha:coverage.alphas,
   minimum:behind?0:2*Math.max(...indexes)+2,
   maximum:behind?2*Math.min(...indexes):2*stack.length,
   revision:coverage.revision,mask:coverage.mask});
 }
 if(!rules.length)return null;
 const signature=JSON.stringify([stack,source.canvas.width,source.canvas.height,
  rules.map(r=>[r.entry.source,maskTargets(r.entry),r.entry.direction||'front',
   r.revision,r.entry.png?.length,r.minimum,r.maximum,r.mask===r.entry._canvas])]);
 const cached=depthPlanCache.get(source.canvas);
 if(cached?.signature===signature)return cached.result;
 const width=source.canvas.width,height=source.canvas.height;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const g=canvas.getContext('2d',{willReadFrequently:true});
 g.drawImage(source.canvas,0,0);
 const original=g.getImageData(0,0,width,height).data;
 const rasters=new Map(),baseSlot=baseIndex*2+1;let conflicts=0,moved=0;
 const getRaster=slot=>{
  if(!rasters.has(slot))rasters.set(slot,new Uint8ClampedArray(original.length));
  return rasters.get(slot);
 };
 const assign=(slot,k,alpha)=>{
  if(alpha<1)return;
  const dest=getRaster(slot);
  dest[k]=original[k];dest[k+1]=original[k+1];dest[k+2]=original[k+2];
  dest[k+3]=alpha;
 };
 for(let pixel=0;pixel<width*height;pixel++){
  const k=pixel*4,originalAlpha=original[k+3];
  if(!originalAlpha)continue;
  let minimum=0,maximum=2*stack.length,coverage=0,matched=false;
  for(const rule of rules){
   const v=rule.alpha[pixel];if(!v)continue;
   matched=true;coverage=Math.max(coverage,v);
   minimum=Math.max(minimum,rule.minimum);
   maximum=Math.min(maximum,rule.maximum);
  }
  let slot=baseSlot;
  if(matched){
   if(minimum>maximum)conflicts++;
   else slot=Math.min(maximum,Math.max(minimum,baseSlot));
  }
  if(slot===baseSlot){assign(baseSlot,k,originalAlpha);continue;}
  const shifted=Math.round(originalAlpha*coverage/255);
  assign(baseSlot,k,originalAlpha-shifted);
  assign(slot,k,shifted);moved++;
 }
 const segments=new Map();
 for(const [slot,data] of rasters){
  const item=document.createElement('canvas');item.width=width;item.height=height;
  item.getContext('2d').putImageData(new ImageData(data,width,height),0,0);
  segments.set(slot,item);
 }
 const result={segments,conflicts,moved};
 depthPlanCache.set(source.canvas,{signature,result});
 return result;
}
function occlusionDiagnostics(layers,model){
 if(!model)return [];
 const stack=model.layerOrder||
  layers.filter(p=>p.sourcePart).map(p=>String(p.partId||p.name));
 const actual=[...layers].filter(p=>p.sourcePart&&p.canvas);
 const visible=new Set(actual.filter(p=>p.visible&&model.parts?.[p.partId||p.name]?.enabled!==false)
  .map(p=>String(p.partId||p.name)));
 return actual.map(p=>{
  const id=String(p.partId||p.name);
  const plan=visible.has(id)?getDepthPlan(p,id,stack,model,visible):null;
  return {source:id,conflicts:plan?.conflicts||0,moved:plan?.moved||0};
 });
}
function renderArtPart(ctx,source,part,motion,mount,phase,idle,selected=false){
 ctx.save();
 if(motion.x||motion.y||motion.angle){
  const anchorX=mount.x+mount.w*mount.pivot.x,anchorY=mount.y+mount.h*mount.pivot.y;
  ctx.translate(anchorX+motion.x,anchorY+motion.y);
  ctx.rotate(motion.angle*Math.PI/180);
  ctx.translate(-anchorX,-anchorY);
 }
 drawPart(ctx,source,part,phase,selected,idle);
 ctx.restore();
}
function draw(ctx,layers,model,phase=0,selectedId=''){
 if(!model)return;
 // The imported ZIP enumerates eyebrows BEFORE opaque face texture.
 // Draw them after the face: do not let the head erase the eyebrows/nose.
 // A stable explicit z-order only applies to the known 17-piece heroine.
 const heroine=(model.characterId==='protagonist'||model.characterId==='protagonist-rig-v1')
  &&model.face==='front';
 const stack=model.layerOrder||
  (model.characterId==='protagonist-unified-v1'&&model.face==='front'
   ?UNIFIED_FRONT_STACK:
   model.characterId==='protagonist-battle-front'&&model.face==='front'
    ?BATTLE_FRONT_STACK:heroine?FACE_STACK:null);
 const order=stack?new Map(stack.map((id,i)=>[id,i])):null;
 const drawLayers=order?[...layers].sort((a,b)=>{
  const ai=order.get(String(a.partId||a.name)),bi=order.get(String(b.partId||b.name));
  return (ai??100)-(bi??100);
 }):layers;
 const ids=drawLayers.map(p=>String(p.partId||p.name));
 const visible=new Set(drawLayers.filter(p=>p.visible&&p.sourcePart&&p.canvas&&
    model.parts[String(p.partId||p.name)]?.enabled!==false)
   .map(p=>String(p.partId||p.name)));
 const scheduled=new Map(),originals=new Map();
 const enqueue=(slot,id,part,texture)=>{
  if(!scheduled.has(slot))scheduled.set(slot,[]);
  scheduled.get(slot).push({slot,id,part,texture});
 };
 for(let i=0;i<drawLayers.length;i++){
  const p=drawLayers[i],id=ids[i];
  if(!visible.has(id))continue;
  const plan=getDepthPlan(p,id,ids,model,visible);
  originals.set(id,p);
  if(!plan){enqueue(2*i+1,id,p,p.canvas);continue}
  for(const [slot,texture] of plan.segments)enqueue(slot,id,p,texture);
 }
 const custom=Array.isArray(model.occlusionMasks)?model.occlusionMasks:[];
 for(let slot=0;slot<=2*drawLayers.length;slot++){
  for(const item of scheduled.get(slot)||[]){
   const {id,part,texture}=item,b=model.parts[id];
   if(!b||b.enabled===false)continue;
   const pose=actionPart(model,id);
   if(pose.opacity<=.001)continue;
   const attached=((id==='axe_held'&&b.parentId==='handwear_l')||
    (id==='battle_axe'&&b.parentId==='battle_handwear_l'))?model.parts[b.parentId]:null;
   const motion=attached?actionPart(model,b.parentId):pose;
   renderArtPart(ctx,{...part,canvas:texture,opacity:(part.opacity??1)*pose.opacity},
    b,motion,attached||b,phase,model.idleProfile||null,
    id===selectedId&&slot===2*ids.indexOf(id)+1);
  }
  if(slot%2!==1)continue;
  const id=ids[(slot-1)/2];
  // The AXE is in FRONT of the jacket but BEHIND the actual gripping fingers.
  // An arm's sleeve must stay behind the torso; painting the whole arm over
  // the weapon is incorrect. Repaint only the authentic hand-shaped region
  // from its SAME texture, using the same mesh/bones and phase.
  if(id==='battle_axe'&&model.gripOverlays){
   for(const armId of ['battle_handwear_r','battle_handwear_l']){
    // A manual mask for this exact source/target supersedes the old hardcoded
    // heroine grip polygon, even if it has been intentionally erased.
    if(custom.some(m=>m.source===armId&&maskTargets(m).includes(id)))continue;
    const outline=model.gripOverlays[armId];
    if(!Array.isArray(outline)||outline.length<3)continue;
    const arm=model.parts[armId];
    const original=drawLayers.find(layer=>
      String(layer.partId||layer.name)===armId&&layer.visible&&layer.sourcePart&&layer.canvas);
    if(!arm||arm.enabled===false||!original)continue;
    const gripPose=actionPart(model,armId);
    if(gripPose.opacity<=0.001)continue;
    const idle=model.idleProfile||null;
    const posed=bonePoses(arm,phase,idle);
    ctx.save();
    ctx.beginPath();
    for(let i=0;i<outline.length;i++){
     const point=outline[i],u=Number(point?.[0])/arm.w,v=Number(point?.[1])/arm.h;
     if(!Number.isFinite(u)||!Number.isFinite(v))continue;
     const q=warpPoint(arm,u,v,phase,posed,idle);
     if(i===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);
    }
    ctx.closePath();
    ctx.clip();
    drawPart(ctx,{...original,opacity:(original.opacity??1)*gripPose.opacity},
      arm,phase,false,idle);
    ctx.restore();
   }
  }

 }
}
root.PaperchalkPartRigCore={FRONT,BACK,CHAR002,CHAR004,PROTAGONIST_CROUCH,SEGMENTS,IDLE_PRESETS,IDLE_RATES,WEATHER_LIFT,approachIdle,bodyPoseAt,bodyPosePoint,windField,windPressure,FACE_STACK,BATTLE_FRONT_STACK,UNIFIED_FRONT_STACK,actionNames,actionPart,setAction,blinkAmount,defaultIdleProfile,sanitizeIdleProfile,presetIdle,idleGroup,jointGainFor,bindBodyHierarchy,bindGripParents,humanPoseAt,parentPoint,parentRole,placedRestPoint,placedBounds,kneeIK,neckPoint,headPoint,ribcagePoint,bodyIdleAt,defaultBones,normalizeBones,bonePoses,skinnedPoint,all,project,sanitize,warpPoint,draw,drawPart,occlusionDiagnostics};
})(typeof window!=='undefined'?window:globalThis);
