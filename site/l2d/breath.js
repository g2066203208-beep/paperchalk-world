/* Anatomical idle breathing for a flat V4 source.
 * Local chest/upper-abdomen mesh ONLY. Head, pelvis, legs and feet are
 * exact fixed points; no canvas-level scale, rotation, sway, or translation.
 * Coordinates are normalized to the game's canonical 1024 x 1024 artwork.
 */
(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const X=[0,320,390,440,480,520,560,610,660,720,1024];
const Y=[0,190,230,265,300,335,370,410,450,490,530,1024];
function point(x,y,amplitude=1,period=4.8,now=0){
 const amp=clamp(Number(amplitude)||0,0,4);
 const cycle=clamp(Number(period)||4.8,2,12);
 const inhale=Math.sin((Number(now)||0)*Math.PI*2/(cycle*1000));
 const r=Math.abs(x-520);
 // Upper chest spreads laterally and rises locally on inhalation. All
 // influence dies away smoothly above the clavicle and below the ribs.
 const vertical=smooth(190,260,y)*(1-smooth(370,510,y));
 const lateral=(1-smooth(135,215,r));
 const broad=(x-520)/120;
 const dx=3.6*amp*inhale*vertical*lateral*broad;
 const dy=-2.4*amp*inhale*vertical*(1-smooth(155,235,r));
 return {x:x+dx,y:y+dy};
}
function draw(ctx,source,profile={},now=performance.now(),width=ctx.canvas.width,height=ctx.canvas.height){
 const amp=clamp(Number(profile.amplitude)||0,0,4);
 if(!source||!width||!height)return;
 if(amp<.001){
  ctx.drawImage(source,0,0,width,height);
  return;
 }
 const period=clamp(Number(profile.period)||4.8,2,12);
 const pts=Y.map(y=>X.map(x=>{
  const p=point(x,y,amp,period,now);
  return {x:p.x*width/1024,y:p.y*height/1024};
 }));
 // Affine triangles across a continuous, narrowly-localized displacement
 // field. Source and destination share the same 1024-unit reference frame.
 function triangle(A,B,C,D,E,F){
  const sx=B.x-A.x,sy=B.y-A.y,tx=C.x-A.x,ty=C.y-A.y;
  const det=sx*ty-sy*tx;
  if(Math.abs(det)<.001)return;
  const dx=E.x-D.x,dy=E.y-D.y,ex=F.x-D.x,ey=F.y-D.y;
  const aa=(dx*ty-ex*sy)/det,bb=(dy*ty-ey*sy)/det;
  const cc=(ex*sx-dx*tx)/det,dd=(ey*sx-dy*tx)/det;
  const ee=D.x-aa*A.x-cc*A.y,ff=D.y-bb*A.x-dd*A.y;
  ctx.save();
  ctx.beginPath();
  // Triangle overlap under antialiasing hides sub-pixel seams.
  const mx=(D.x+E.x+F.x)/3,my=(D.y+E.y+F.y)/3;
  const pad=v=>{
   const k=1+.7/Math.max(1,Math.hypot(v.x-mx,v.y-my));
   return [mx+(v.x-mx)*k,my+(v.y-my)*k];
  };
  ctx.moveTo(...pad(D));ctx.lineTo(...pad(E));ctx.lineTo(...pad(F));
  ctx.closePath();ctx.clip();
  // Compose with the caller's camera zoom/pan (editor stage coordinates).
  ctx.transform(aa,bb,cc,dd,ee,ff);
  ctx.drawImage(source,0,0,1024,1024);
  ctx.restore();
 }
 ctx.imageSmoothingEnabled=true;
 for(let j=0;j<Y.length-1;j++)for(let i=0;i<X.length-1;i++){
  // Outside the ribcage envelope, draw the original rectangular segment:
  // mathematically no deformation and much cheaper than two mesh triangles.
  if(j===0||j===Y.length-2||i===0||i===X.length-2){
   const x=X[i],y=Y[j],w=X[i+1]-x,h=Y[j+1]-y;
   ctx.drawImage(source,x,y,w,h,x*width/1024,y*height/1024,
     w*width/1024,h*height/1024);
   continue;
  }
  const A={x:X[i],y:Y[j]},B={x:X[i+1],y:Y[j]};
  const C={x:X[i],y:Y[j+1]},D={x:X[i+1],y:Y[j+1]};
  const a=pts[j][i],b=pts[j][i+1],c=pts[j+1][i],d=pts[j+1][i+1];
  triangle(A,B,C,a,b,c);triangle(B,D,C,b,d,c);
 }
}
root.PaperchalkLocalBreath={point,draw};
})(typeof window!=='undefined'?window:globalThis);
