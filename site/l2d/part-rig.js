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
 front_hair:['head',.50,.08,.50,.88,'hair']
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
// Known real CHAR-002 16-layer PSD layout (front only). Values are
// neutral initial joint locations; no source bitmap is invented or altered.
const CHAR002={
 back_hair:['head',.50,.05,.50,.95,'hair'],
 legwear:['pelvis',.50,.04,.50,.84,'leg-combined'],
 footwear:['ground',.50,.86,.50,.86,'fixed'],
 bottomwear:['pelvis',.50,.04,.50,.93,'skirt'],
 neck:['torso',.50,.80,.50,.80,'fixed'],
 topwear:['torso',.50,.10,.50,.84,'torso'],
 handwear:['torso',.50,.06,.50,.90,'arm-combined'],
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
const IDLE_PRESETS=Object.freeze({
 still:{body:0,hair:0,cloth:0,sleeves:0},
 realistic:{body:.12,hair:.28,cloth:.23,sleeves:.12},
 breeze:{body:.13,hair:.64,cloth:.52,sleeves:.24},
 windy:{body:.16,hair:1.15,cloth:.92,sleeves:.45}
});
const IDLE_RATES=Object.freeze({
 realistic:{hair:[.82,.74],cloth:[.76,.74],sleeves:[.83,.55]},
 breeze:{hair:[.98,.85],cloth:[.90,.86],sleeves:[.96,.65]},
 windy:{hair:[1.07,1.08],cloth:[1.01,1.02],sleeves:[1.04,.82]}
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
 front_hair:1,back_hair:1,hair_over_jacket:1,skirt:1
});
function defaultIdleProfile(){
 const a=IDLE_PRESETS.realistic,r=IDLE_RATES.realistic;
 return {profileVersion:3,preset:'realistic',weather:'realistic',
  body:{amount:a.body,speed:.85,swayX:.8,swayY:1.8,rotate:.35},
  hair:{amount:a.hair,speed:r.hair[0],lag:r.hair[1]},
  cloth:{amount:a.cloth,speed:r.cloth[0],lag:r.cloth[1]},
  sleeves:{amount:a.sleeves,speed:r.sleeves[0],lag:r.sleeves[1]},
  parts:{...DEFAULT_PART_STRENGTH}};
}
function sanitizeIdleProfile(input){
 const base=defaultIdleProfile(),p=input&&typeof input==='object'?input:{};
 const group=(id,max)=>({
  amount:clamp(finite(p[id]?.amount,base[id].amount),0,max),
  speed:clamp(finite(p[id]?.speed,base[id].speed),.15,3.5),
  ...((id==='hair'||id==='cloth'||id==='sleeves')
   ?{lag:clamp(finite(p[id]?.lag,base[id].lag),0,2)}:{})
 });
 const parts={...DEFAULT_PART_STRENGTH};
 if(p.parts&&typeof p.parts==='object'&&!Array.isArray(p.parts)){
  for(const [id,v] of Object.entries(p.parts).slice(0,100)){
   if(/^[a-z0-9_-]{1,80}$/.test(id))parts[id]=clamp(finite(v,1),0,2);
  }
 }
 const groups={body:group('body',1),hair:group('hair',1.5),
  cloth:group('cloth',1.5),sleeves:group('sleeves',1.5)};
 const old=p.profileVersion===3?null:
  LEGACY_PRESETS[p.preset]?.[p.profileVersion===2?'v2':'v1'];
 if(old){
  const target=IDLE_PRESETS[p.preset],rates=IDLE_RATES[p.preset];
  for(const name of ['body','hair','cloth','sleeves'])
   if(Math.abs(groups[name].amount-old[name])<.00001)
    groups[name].amount=target[name];
  // Migrate factory speed and lag. Don't overwrite manually tuned values.
  for(const [name,speed,lag] of [
   ['hair',1.05,.62],['cloth',.95,.58],['sleeves',.9,.5]]){
   if(rates&&Math.abs(groups[name].speed-speed)<.00001)
    groups[name].speed=rates[name][0];
   if(rates&&Math.abs(groups[name].lag-lag)<.00001)
    groups[name].lag=rates[name][1];
  }
  for(const [id,weight] of Object.entries(OLD_PART_STRENGTH))
   if(Math.abs((p.parts?.[id]??weight)-weight)<.00001)
    parts[id]=DEFAULT_PART_STRENGTH[id];
 }
 return {profileVersion:3,preset:typeof p.preset==='string'?p.preset:'custom',
  weather:Object.hasOwn(IDLE_PRESETS,p.weather)?p.weather:
   Object.hasOwn(IDLE_PRESETS,p.preset)?p.preset:'realistic',
  body:{...groups.body,swayX:clamp(finite(p.body?.swayX,.8),0,3),
   swayY:clamp(finite(p.body?.swayY,1.8),0,4),
   rotate:clamp(finite(p.body?.rotate,.35),0,1)},
  hair:groups.hair,cloth:groups.cloth,sleeves:groups.sleeves,parts};
}
function presetIdle(name,previous=null){
 if(!Object.hasOwn(IDLE_PRESETS,name))throw Error('Unknown idle preset: '+name);
 const p=sanitizeIdleProfile(previous||defaultIdleProfile());
 p.preset=name;p.weather=name;p.profileVersion=3;
 // Selecting a weather preset also resets old excessive per-part weights.
 p.parts={...DEFAULT_PART_STRENGTH};
 for(const [kind,amount] of Object.entries(IDLE_PRESETS[name]))p[kind].amount=amount;
 const rates=IDLE_RATES[name];
 if(rates)for(const [kind,[speed,lag]] of Object.entries(rates)){
  p[kind].speed=speed;p[kind].lag=lag;
 }
 return p;
}
// Smoothly approach a NEW weather tier instead of instantly snapping
// every joint when the user taps calm / breeze / wind.
function approachIdle(previous,target,dt){
 if(!previous)return sanitizeIdleProfile(target);
 const a=1-Math.exp(-Math.max(0,Math.min(.12,finite(dt,0)))*3.2);
 const out={...previous,preset:target.preset,weather:target.weather,profileVersion:3,
  parts:{...previous.parts}};
 for(const group of ['body','hair','cloth','sleeves']){
  out[group]={...previous[group]};
  for(const [key,v] of Object.entries(target[group]||{}))
   if(typeof v==='number')out[group][key]=
    finite(previous[group]?.[key],v)+(v-finite(previous[group]?.[key],v))*a;
 }
 for(const id of new Set([...Object.keys(previous.parts||{}),...Object.keys(target.parts||{})])){
  const from=finite(previous.parts?.[id],1),to=finite(target.parts?.[id],1);
  out.parts[id]=from+(to-from)*a;
 }
 return out;
}
function idleGroup(part){
 if(part.kind==='hair')return 'hair';
 if(part.kind==='skirt'||part.kind==='torso')return 'cloth';
 if(part.kind==='arm-left'||part.kind==='arm-right'||part.kind==='arm-combined')return 'sleeves';
 return 'body';
}
function bodyIdleAt(part,phase,idle){
 if(!idle||part.kind==='fixed'||part.kind==='leg-combined')return{x:0,y:0};
 const b=idle.body,group=idleGroup(part);
 // Body displacement is sub-pixel and coordinated through the same phase.
 // Head and attached hair follow the tiny torso motion, not the reverse.
 const share=group==='body'&&part.kind==='mouth'?.8:1;
 return {x:Math.sin(phase*b.speed*.63+.2)*b.swayX*b.amount*share,
  y:Math.sin(phase*b.speed*.81+.83)*b.swayY*b.amount*share};
}
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
 'arm-left':[
  ['shoulder',null,.82,.05,.56,.48,9,.97,.05,.38],
  ['elbow','shoulder',.56,.48,.43,.93,14,1.2,-.62,.36]
 ],
 'arm-right':[
  ['shoulder',null,.18,.05,.45,.50,9,1.05,.4,.38],
  ['elbow','shoulder',.45,.50,.60,.94,14,1.18,.9,.36]
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
function bonePoses(part,phase=0,idle=null){
 const records=part.bones||[],byId=new Map(),result=[];
 for(const b of records){
  const P={x:b.head.x*part.w,y:b.head.y*part.h};
  const T={x:b.tail.x*part.w,y:b.tail.y*part.h};
  const parent=b.parent&&byId.get(b.parent);
  const head=parent?parent.tailPos:P;
  const parentAngle=parent?parent.totalAngle:0;
  const group=idle?idle[idleGroup(part)]:null;
  const strength=group?group.amount*clamp(finite(idle.parts?.[part.id],1),0,2):1;
  // Independent root/tip strength and slight phase delay approximate inertia;
  // roots do not whip like ends, and different strands stay out of sync.
  const groupFactor=part.kind==='hair'?[.12,.48]:
   part.kind==='skirt'?[.14,.55]:
   part.kind==='torso'?[.18,.50]:
   part.kind.startsWith('arm-')?[.13,.32]:[.1,.22];
  const factor=groupFactor[b.parent?1:0];
  const speed=group?group.speed:1;
  const lag=group?.lag||0;
  // Smooth gust envelope, separate delays and small directional lift.
  // Realistic mode never gets a gust or whole-poster breathing.
  const weather=idle?.weather||idle?.preset;
  const wind=weather==='windy'?
   smooth((1+Math.sin(phase*.29-.7))/2):0;
  const mild=weather==='breeze'?
   smooth((1+Math.sin(phase*.23-.45))/2):0;
  const envelope=weather==='windy'?(.68+.32*wind):
   weather==='breeze'?(.88+.12*mild):1;
  const wave=Math.sin(phase*finite(b.frequency,1)*speed+
   finite(b.phase,0)-(b.parent?lag:lag*.25));
  const direction=weather==='windy'?.13*wind:0;
  const angle=b.enabled!==false?finite(b.amplitude,0)*strength*factor*
   Math.PI/180*(wave*envelope+direction):0;
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
 const rootLock=smooth(clamp((v-.13)/.23,0,1));
 const blend=(1-Math.exp(-sum*1.5))*rootLock;
 return {x:part.x+x+dx/sum*blend,y:part.y+y+dy/sum*blend};
}
function cleanPart(part,face,id,characterId){
 const p=part||{},spec=characterId==='char-002'&&face==='front'?(CHAR002[id]||FRONT[id]):(face==='back'?BACK:FRONT)[id];
 const w=Math.max(1,finite(p.canvas?.width||p.w,1));
 const h=Math.max(1,finite(p.canvas?.height||p.h,1));
 const def=spec||['root',.5,.08,.5,.9,'unclassified'];
 return {id:String(id),name:String(p.name||id),x:finite(p.x,0),y:finite(p.y,0),w,h,
  parentId:def[0],kind:def[5],
  pivot:{x:def[1],y:def[2]},tip:{x:def[3],y:def[4]},
  mesh:{columns:Math.min(def[5]==='hair'?6:5,Math.max(4,Math.ceil(w/35))),
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
 x.mesh=original.mesh;
 x.bones=normalizeBones(record.bones,original.kind);
 return x;
}
function project(parts,characterId,face,previous=null){
 const base=all(parts,face,characterId);
 const prev=previous?.parts||{};
 const entries=base.map(p=>[p.id,sanitize(prev[p.id],p)]);
 return {format:'paperchalk-part-rig-v1',characterId,face,canvas:[1024,1024],
  idleProfile:sanitizeIdleProfile(previous?.idleProfile||defaultIdleProfile()),
  parts:Object.fromEntries(entries)};
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
 const partStrength=idle?clamp(finite(idle.parts?.[part.id],1),0,2):1;
 const scale=group?group.amount*partStrength:1;
 const oscillation=Math.sin(phase*q.frequency*(group?.speed||1)+q.phase-(group?.lag||0));
 const a=q.angle*weight*oscillation*Math.PI/180;
 const baseX=(u-part.pivot.x)*part.w,baseY=(v-part.pivot.y)*part.h;
 const cs=Math.cos(a),sn=Math.sin(a);
 const body=bodyIdleAt(part,phase,idle);
 return {x:base.x+(baseX*cs-baseY*sn-baseX)*scale+q.x*weight*oscillation*scale+body.x,
  y:base.y+(baseX*sn+baseY*cs-baseY)*scale+q.y*weight*oscillation*scale+body.y};
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
const FACE_STACK=['rear_hair','sleeves_and_hands','legs','shoes','neck',
  'skirt','jacket','ears','face','eye_white','irises','lashes',
  'brows','front_hair','nose','mouth','hair_clip'];
const FACE_MICRO=new Set(['face','ears','brows','nose','mouth','hair_clip',
  'eye_white','irises','lashes']);
function drawFacePart(ctx,source,part,phase,idle){
 const img=source.canvas,id=part.id,blink=blinkAmount(phase);
 // Align attached facial pieces to exactly the same barely visible head
 // movement; never skin/melt tiny eyebrows/nose with a large triangular grid.
 const motion=bodyIdleAt(part,phase,idle);
 ctx.save();
 ctx.globalAlpha=source.opacity??1;
 ctx.translate(motion.x,motion.y);
 if(id==='eye_white'||id==='irises'){
  // Real iris/eye-white PNGs gradually disappear under closing eyelids.
  ctx.globalAlpha*=1-blink;
  if(ctx.globalAlpha>0.001)ctx.drawImage(img,part.x,part.y);
 }else if(id==='lashes'){
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
 const image=source.canvas,cols=part.mesh.columns,rows=part.mesh.rows;
 const strength=idle?idle[idleGroup(part)].amount*clamp(finite(idle.parts?.[part.id],1),0,2):1;
 const active=part.enabled&&(Math.abs(idle?.body?.amount||0)>0||
  (strength>0&&(Object.values(part.motion).some((v,i)=>i<3&&Math.abs(v)>1e-5)||
  (part.bones||[]).some(b=>b.enabled!==false&&Math.abs(b.amplitude)>1e-5))));
 ctx.save();ctx.globalAlpha=source.opacity??1;
 if(!active){
  ctx.drawImage(image,part.x,part.y);
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
function draw(ctx,layers,model,phase=0,selectedId=''){
 if(!model)return;
 // The imported ZIP enumerates eyebrows BEFORE opaque face texture.
 // Draw them after the face: do not let the head erase the eyebrows/nose.
 // A stable explicit z-order only applies to the known 17-piece heroine.
 const heroine=(model.characterId==='protagonist'||model.characterId==='protagonist-rig-v1')
  &&model.face==='front';
 const order=new Map(FACE_STACK.map((id,i)=>[id,i]));
 const drawLayers=heroine?[...layers].sort((a,b)=>{
  const ai=order.get(String(a.partId||a.name)),bi=order.get(String(b.partId||b.name));
  return (ai??100)-(bi??100);
 }):layers;
 for(const p of drawLayers){
  if(!p.visible||!p.sourcePart||!p.canvas)continue;
  const b=model.parts[String(p.partId||p.name)];
  if(b)drawPart(ctx,p,b,phase,b.id===selectedId,model.idleProfile||null);
 }
}
root.PaperchalkPartRigCore={FRONT,BACK,CHAR002,SEGMENTS,IDLE_PRESETS,IDLE_RATES,approachIdle,FACE_STACK,blinkAmount,defaultIdleProfile,sanitizeIdleProfile,presetIdle,idleGroup,bodyIdleAt,defaultBones,normalizeBones,bonePoses,skinnedPoint,all,project,sanitize,warpPoint,draw,drawPart};
})(typeof window!=='undefined'?window:globalThis);
