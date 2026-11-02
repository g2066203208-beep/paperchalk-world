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
function bonePoses(part,phase=0){
 const records=part.bones||[],byId=new Map(),result=[];
 for(const b of records){
  const P={x:b.head.x*part.w,y:b.head.y*part.h};
  const T={x:b.tail.x*part.w,y:b.tail.y*part.h};
  const parent=b.parent&&byId.get(b.parent);
  const head=parent?parent.tailPos:P;
  const parentAngle=parent?parent.totalAngle:0;
  const angle=b.enabled!==false?(finite(b.amplitude,0)*Math.PI/180*
   Math.sin(phase*finite(b.frequency,1)+finite(b.phase,0))):0;
  const theta=parentAngle+angle,cs=Math.cos(theta),sn=Math.sin(theta);
  const dv={x:T.x-P.x,y:T.y-P.y};
  const tailPos={x:head.x+dv.x*cs-dv.y*sn,y:head.y+dv.x*sn+dv.y*cs};
  const posed={...b,restHead:P,restTail:T,headPos:head,tailPos,totalAngle:theta};
  result.push(posed);byId.set(b.id,posed);
 }
 return result;
}
function skinnedPoint(part,u,v,phase=0){
 const x=u*part.w,y=v*part.h;
 const bones=bonePoses(part,phase);
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
 const blend=1-Math.exp(-sum*1.5);
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
  mesh:{columns:Math.max(4,Math.min(12,Math.ceil(w/25))),rows:Math.max(4,Math.min(16,Math.ceil(h/25)))},
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
  parts:Object.fromEntries(entries)};
}
// Each part's raster mesh uses its OWN normalized local coordinates.
// Its own pivot is fixed; deformation weights increase toward its tip.
// No other part is sampled, moved, cut, duplicated, or transformed.
function warpPoint(part,u,v,phase=0){
 if(!part.enabled)return{x:part.x+u*part.w,y:part.y+v*part.h};
 const base=skinnedPoint(part,u,v,phase);
 const q=part.motion;
 const dx=part.tip.x-part.pivot.x,dy=part.tip.y-part.pivot.y;
 const den=Math.max(.0001,dx*dx+dy*dy);
 const along=((u-part.pivot.x)*dx+(v-part.pivot.y)*dy)/den;
 const weight=smooth(along);
 const oscillation=Math.sin(phase*q.frequency+q.phase);
 const a=q.angle*weight*oscillation*Math.PI/180;
 const baseX=(u-part.pivot.x)*part.w,baseY=(v-part.pivot.y)*part.h;
 const cs=Math.cos(a),sn=Math.sin(a);
 return {x:base.x+(baseX*cs-baseY*sn-baseX)+q.x*weight*oscillation,
  y:base.y+(baseX*sn+baseY*cs-baseY)+q.y*weight*oscillation};
}
function drawTri(ctx,image,A,B,C,D,E,F){
 const ux=B.x-A.x,uy=B.y-A.y,vx=C.x-A.x,vy=C.y-A.y;
 const det=ux*vy-uy*vx;if(Math.abs(det)<.00001)return;
 const dx=E.x-D.x,dy=E.y-D.y,ex=F.x-D.x,ey=F.y-D.y;
 const aa=(dx*vy-ex*uy)/det,bb=(dy*vy-ey*uy)/det;
 const cc=(ex*ux-dx*vx)/det,dd=(ey*ux-dy*vx)/det;
 const tx=D.x-aa*A.x-cc*A.y,ty=D.y-bb*A.x-dd*A.y;
 ctx.save();ctx.beginPath();
 const cx=(D.x+E.x+F.x)/3,cy=(D.y+E.y+F.y)/3;
 const enlarge=p=>{const dist=Math.max(1,Math.hypot(p.x-cx,p.y-cy));return {x:cx+(p.x-cx)*(1+.45/dist),y:cy+(p.y-cy)*(1+.45/dist)}};
 const p=enlarge(D),q=enlarge(E),r=enlarge(F);
 ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.lineTo(r.x,r.y);ctx.closePath();ctx.clip();
 // transform() composes with the author's existing zoom/pan stage transform.
 ctx.transform(aa,bb,cc,dd,tx,ty);
 ctx.drawImage(image,0,0);
 ctx.restore();
}
function drawPart(ctx,source,part,phase=0,drawMesh=false){
 if(!source?.canvas||!part)return;
 const image=source.canvas,cols=part.mesh.columns,rows=part.mesh.rows;
 const active=part.enabled&&(Object.values(part.motion).some((v,i)=>i<3&&Math.abs(v)>1e-5)||
  (part.bones||[]).some(b=>b.enabled!==false&&Math.abs(b.amplitude)>1e-5));
 ctx.save();ctx.globalAlpha=source.opacity??1;
 if(!active){
  ctx.drawImage(image,part.x,part.y);
 }else{
  const vertices=[];
  for(let j=0;j<=rows;j++){
   const line=[];
   for(let i=0;i<=cols;i++)line.push(warpPoint(part,i/cols,j/rows,phase));
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
  ctx.save();ctx.strokeStyle='rgba(101,215,255,.45)';ctx.lineWidth=.9;
  for(let j=0;j<=rows;j++){
   ctx.beginPath();
   for(let i=0;i<=cols;i++){
    const p=warpPoint(part,i/cols,j/rows,phase);
    if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
   }ctx.stroke();
  }
  for(let i=0;i<=cols;i++){
   ctx.beginPath();
   for(let j=0;j<=rows;j++){
    const p=warpPoint(part,i/cols,j/rows,phase);
    if(!j)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
   }ctx.stroke();
  }
  // Selected part displays its actual joint chain, not a decorative
  // fixed-coordinate stick figure. Yellow heads, cyan tails.
  for(const b of bonePoses(part,phase)){
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
 for(const p of layers){
  if(!p.visible||!p.sourcePart||!p.canvas)continue;
  const b=model.parts[String(p.partId||p.name)];
  if(b)drawPart(ctx,p,b,phase,b.id===selectedId);
 }
}
root.PaperchalkPartRigCore={FRONT,BACK,CHAR002,SEGMENTS,defaultBones,normalizeBones,bonePoses,skinnedPoint,all,project,sanitize,warpPoint,draw,drawPart};
})(typeof window!=='undefined'?window:globalThis);
