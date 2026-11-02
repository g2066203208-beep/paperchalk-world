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
function cleanPart(part,face,id,characterId){
 const p=part||{},spec=characterId==='char-002'&&face==='front'?(CHAR002[id]||FRONT[id]):(face==='back'?BACK:FRONT)[id];
 const w=Math.max(1,finite(p.canvas?.width||p.w,1));
 const h=Math.max(1,finite(p.canvas?.height||p.h,1));
 const def=spec||['root',.5,.08,.5,.9,'unclassified'];
 return {id:String(id),name:String(p.name||id),x:finite(p.x,0),y:finite(p.y,0),w,h,
  parentId:def[0],kind:def[5],
  pivot:{x:def[1],y:def[2]},tip:{x:def[3],y:def[4]},
  mesh:{columns:Math.max(4,Math.min(12,Math.ceil(w/25))),rows:Math.max(4,Math.min(16,Math.ceil(h/25)))},
  // The REST shape is always the original bitmap: angle=0, motion=0.
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
 const q=part.motion;
 const dx=part.tip.x-part.pivot.x,dy=part.tip.y-part.pivot.y;
 const den=Math.max(.0001,dx*dx+dy*dy);
 const along=((u-part.pivot.x)*dx+(v-part.pivot.y)*dy)/den;
 const weight=smooth(along);
 const oscillation=Math.sin(phase*q.frequency+q.phase);
 const a=q.angle*weight*oscillation*Math.PI/180;
 const baseX=(u-part.pivot.x)*part.w,baseY=(v-part.pivot.y)*part.h;
 const cs=Math.cos(a),sn=Math.sin(a);
 return {x:part.x+part.pivot.x*part.w+baseX*cs-baseY*sn+q.x*weight*oscillation,
  y:part.y+part.pivot.y*part.h+baseX*sn+baseY*cs+q.y*weight*oscillation};
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
 const active=part.enabled&&Object.values(part.motion).some((v,i)=>i<3&&Math.abs(v)>1e-5);
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
root.PaperchalkPartRigCore={FRONT,BACK,CHAR002,all,project,sanitize,warpPoint,draw,drawPart};
})(typeof window!=='undefined'?window:globalThis);
