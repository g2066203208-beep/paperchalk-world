/* Shared original-coordinate anatomy + secondary-motion driver.
 * Both the game decoder and editor use the same layered localized field.
 * Never rotate, translate or scale the entire actor to fake breathing.
 */
(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const bell=(x,c,r)=>Math.max(0,1-Math.abs(x-c)/r);
const X=[0,300,345,385,415,445,475,505,535,565,595,625,655,690,735,1024];
const Y=[0,50,95,135,175,215,255,300,345,390,435,480,520,565,610,650,690,740,820,1024];
const defaults=Object.freeze({amplitude:1.4,period:3.6,softness:1.25,hairSwing:3,skirtSwing:2.8,armSwing:2.2,legSwing:0,swaySpeed:1});
const profileOf=q=>{
 q=q||{};
 const p={};
 for(const key of Object.keys(defaults)){
  const n=Number(q[key]);
  p[key]=q[key]!==undefined&&Number.isFinite(n)?n:defaults[key];
 }
 p.amplitude=clamp(p.amplitude,0,4);p.period=clamp(p.period,2,12);
 p.softness=clamp(p.softness,0,2.4);
 for(const k of ['hairSwing','skirtSwing','armSwing','legSwing'])p[k]=clamp(p[k],0,5);
 p.swaySpeed=clamp(p.swaySpeed,.5,2.5);
 return p;
};
function point(x,y,amplitude=1,period=4.8,now=0){
 const amp=clamp(Number(amplitude)||0,0,4);
 const cycle=clamp(Number(period)||4.8,2,12);
 const inhale=Math.sin((Number(now)||0)*Math.PI*2/(cycle*1000));
 const r=Math.abs(x-520);
 const vertical=smooth(190,260,y)*(1-smooth(370,510,y));
 const lateral=1-smooth(135,215,r);
 const broad=(x-520)/120;
 return {x:x+3.6*amp*inhale*vertical*lateral*broad,
         y:y-2.4*amp*inhale*vertical*(1-smooth(155,235,r))};
}
function deform(x,y,options={},now=0,part=''){
 const q=profileOf(options);
 const name=String(part||'').toLowerCase().replace(/[\s_-]/g,'');
 const t=(Number(now)||0)/1000*2*Math.PI/q.period*q.swaySpeed;
 const hairWave=Math.sin(t*.88-.72+(x-520)*.0016);
 const skirtWave=Math.sin(t*.77-1.18+(x-520)*.003);
 const armWave=Math.sin(t*.94-1.02+(x-520)*.0018);
 const lagY=Math.sin(t*.88-1.25);
 const r=Math.abs(x-520);
 let b=point(x,y,q.amplitude,q.period,now),hair=0,skirt=0,arm=0,leg=0;
 if(name){
  // Every PSD bitmap is an independent bone/mesh, not a region cut from
  // the current V4 frame. The root of each part stays anchored.
  if(/footwear|鞋|shoes/.test(name))return {x,y};
  if(/legwear|双腿|裤|袜|legs/.test(name)){
   b={x,y};leg=smooth(650,755,y)*(1-smooth(885,945,y));
  }
  if(/backhair|后发|马尾|hairclip|头部和马尾/.test(name)){
   b={x,y};hair=smooth(135,335,y)*(1-smooth(500,620,y));
  }else if(/fronthair|前发|刘海|fringe/.test(name)){
   b={x,y};hair=smooth(90,160,y)*(1-smooth(210,305,y))*.60;
  }else if(/bottomwear|百褶裙|裙子|skirt/.test(name)){
   b={x,y};skirt=smooth(435,595,y)*(1-smooth(690,780,y));
  }else if(/handwear|手臂|袖|sleeve|wavehand|freehand|hand/.test(name)){
   const joint=smooth(195,340,y)*(1-smooth(565,690,y));
   b={x:x+(b.x-x)*.35*joint,y:y+(b.y-y)*.35*joint};
   arm=joint;
  }else if(/topwear|上身|外套|校服|衬衫|衣服|jacket|shirt|shirtfront/.test(name)){
   // Retain local ribcage breathing only.
  }else if(/领口|领带|collar|tie|neck|脖颈/.test(name)){
   b={x,y:y+(b.y-y)*.25};
  }else b={x,y};
 }else{
  // Flat V4: spatial masks only. Face, spine, pelvis and feet stay put.
  // PSD sources are more accurate than these approximate pixels.
  hair=smooth(45,95,r)*(1-smooth(190,255,r))*
       smooth(135,285,y)*(1-smooth(445,540,y));
  const hemX=smooth(285,390,x)*(1-smooth(640,760,x));
  skirt=hemX*smooth(475,600,y)*(1-smooth(670,740,y));
  arm=smooth(80,145,r)*(1-smooth(210,285,r))*
      smooth(220,350,y)*(1-smooth(535,635,y));
  leg=smooth(670,775,y)*(1-smooth(885,945,y))*
      smooth(300,390,x)*(1-smooth(645,725,x));
 }
 // Substantial but local movement at 250%: loose hair ~16px, skirt hem
 // ~15px, sleeve/arms ~10px. All independent from chest breathing amplitude.
 const flex=q.softness/1.25;
 const dx=hair*6.5*q.hairSwing*flex*hairWave+
          skirt*6.7*q.skirtSwing*flex*skirtWave+
          arm*5.3*q.armSwing*flex*armWave+
          leg*2.7*q.legSwing*flex*Math.sin(t*.74-1.2+(x-520)*.006);
 const dy=hair*1.5*q.hairSwing*flex*lagY+
          skirt*1.3*q.skirtSwing*flex*Math.sin(t*.77-1.55)+
          arm*.9*q.armSwing*flex*Math.sin(t*.94-.8);
 return {x:b.x+dx,y:b.y+dy};
}
function draw(ctx,source,options={},now=performance.now(),width=ctx.canvas.width,height=ctx.canvas.height){
 if(!source||!width||!height)return;
 const q=profileOf(options);
 if(q.amplitude<.001&&q.hairSwing<.001&&q.skirtSwing<.001&&q.armSwing<.001&&q.legSwing<.001){
  ctx.drawImage(source,0,0,width,height);return;
 }
 const pts=Y.map(y=>X.map(x=>{
  const p=deform(x,y,q,now);
  return {x:p.x*width/1024,y:p.y*height/1024};
 }));
 const scaleX=width/1024,scaleY=height/1024;
 function tri(A,B,C,D,E,F){
  const ux=B.x-A.x,uy=B.y-A.y,vx=C.x-A.x,vy=C.y-A.y;
  const det=ux*vy-uy*vx;if(Math.abs(det)<.00001)return;
  const dx=E.x-D.x,dy=E.y-D.y,ex=F.x-D.x,ey=F.y-D.y;
  const aa=(dx*vy-ex*uy)/det,bb=(dy*vy-ey*uy)/det;
  const cc=(ex*ux-dx*vx)/det,dd=(ey*ux-dy*vx)/det;
  const ee=D.x-aa*A.x-cc*A.y,ff=D.y-bb*A.x-dd*A.y;
  ctx.save();ctx.beginPath();
  const mx=(D.x+E.x+F.x)/3,my=(D.y+E.y+F.y)/3;
  const pad=V=>{const k=1+.9/Math.max(1,Math.hypot(V.x-mx,V.y-my));return [mx+(V.x-mx)*k,my+(V.y-my)*k];};
  ctx.moveTo(...pad(D));ctx.lineTo(...pad(E));ctx.lineTo(...pad(F));ctx.closePath();ctx.clip();
  ctx.transform(aa,bb,cc,dd,ee,ff);
  // Source crop avoids repeatedly resampling the entire V4 frame per triangle.
  const minX=Math.max(0,Math.floor(Math.min(A.x,B.x,C.x))-2);
  const minY=Math.max(0,Math.floor(Math.min(A.y,B.y,C.y))-2);
  const maxX=Math.min(1024,Math.ceil(Math.max(A.x,B.x,C.x))+2);
  const maxY=Math.min(1024,Math.ceil(Math.max(A.y,B.y,C.y))+2);
  if(maxX>minX&&maxY>minY)
   ctx.drawImage(source,minX*source.width/1024,minY*source.height/1024,
     (maxX-minX)*source.width/1024,(maxY-minY)*source.height/1024,
     minX,minY,maxX-minX,maxY-minY);
  ctx.restore();
 }
 ctx.imageSmoothingEnabled=true;
 for(let j=0;j<Y.length-1;j++)for(let i=0;i<X.length-1;i++){
  const A={x:X[i],y:Y[j]},B={x:X[i+1],y:Y[j]},
        C={x:X[i],y:Y[j+1]},D={x:X[i+1],y:Y[j+1]};
  const a=pts[j][i],b=pts[j][i+1],c=pts[j+1][i],d=pts[j+1][i+1];
  // If all four vertices are static, preserve original pixels and save CPU.
  const flat=(v,p)=>Math.abs(v.x-p.x*scaleX)+Math.abs(v.y-p.y*scaleY)<.003;
  if(flat(a,A)&&flat(b,B)&&flat(c,C)&&flat(d,D)){
   ctx.drawImage(source,A.x*source.width/1024,A.y*source.height/1024,
     (D.x-A.x)*source.width/1024,(D.y-A.y)*source.height/1024,
     A.x*scaleX,A.y*scaleY,(D.x-A.x)*scaleX,(D.y-A.y)*scaleY);
  }else{tri(A,B,C,a,b,c);tri(B,D,C,b,d,c);}
 }
}
root.PaperchalkLocalBreath={defaults,profileOf,point,deform,draw};
})(typeof window!=='undefined'?window:globalThis);
