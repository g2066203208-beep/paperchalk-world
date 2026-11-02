/* Universal multi-node idle mesh, v2.0 - reusable in game and all-character studio.
   Original 1024x1024 coordinates are NEVER reassembled or re-positioned.
   This is a smooth piecewise raster deformation, not a Cubism .moc3. */
(function(root){
'use strict';
const TWO=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)};
const bell=(v,mid,scale)=>Math.exp(-Math.pow((v-mid)/scale,2));
function preprocess(im,cleanup){
 const c=document.createElement('canvas');c.width=im.naturalWidth||im.width;c.height=im.naturalHeight||im.height;
 const x=c.getContext('2d',{willReadFrequently:true});x.clearRect(0,0,c.width,c.height);x.drawImage(im,0,0);
 if(!cleanup)return c;
 // Only exterior-connected neutral bright backdrop; never use an all-image
 // white/color key, because it would destroy shirt, socks or skin highlights.
 try{
  const W=c.width,H=c.height,imdata=x.getImageData(0,0,W,H),d=imdata.data;
  const used=new Uint8Array(W*H),stack=new Int32Array(W*H);let tail=0,head=0,removed=0;
  const neutral=i=>{const p=i*4,r=d[p],g=d[p+1],b=d[p+2],a=d[p+3];
    return a>0 && r>175 && Math.max(r,g,b)-Math.min(r,g,b)<22;};
  const put=i=>{if(i<0||i>=W*H||used[i]||!neutral(i))return;used[i]=1;stack[tail++]=i;};
  for(let x=0;x<W;x++){put(x);put((H-1)*W+x);}
  for(let y=0;y<H;y++){put(y*W);put(y*W+W-1);}
  while(head<tail){
   const p=stack[head++],xx=p%W,yy=(p/W)|0;
   if(xx>0)put(p-1);if(xx<W-1)put(p+1);
   if(yy>0)put(p-W);if(yy<H-1)put(p+W);
   d[p*4+3]=0;removed++;
  }
  if(removed>0&&removed<W*H*.82)x.putImageData(imdata,0,0);
 }catch(e){console.warn('Image matte fallback: original image retained',e);}
 return c;
}
class HeroineBreathRig{
 constructor(image,canvas,opts={}){
  this.image=image;this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:true});
  this.amplitude=opts.amplitude===undefined?.62:opts.amplitude;
  this.period=opts.period||4.6;this.playing=opts.playing!==false;
  this.drawBones=!!opts.drawBones;this.cleanup=opts.cleanup!==false;
  this.softness=Math.max(0,Math.min(2,Number(opts.softness??1)));this.animatedFrames=!!opts.animatedFrames;
  this.featurePreset=opts.featurePreset||'generic';this.blinkEnabled=this.featurePreset==='heroine-front';
  this.t0=performance.now();this.frozen=0;this.last=0;this._raf=0;
  this.source=null;
  this.ready=this.setImage(image);
 }
 async setImage(im){
  this.psdParts=null;
  this.image=im;
  if(!im)return this;
  if(!(im instanceof HTMLCanvasElement)&&!(im instanceof ImageBitmap)&&(!im.complete||!im.naturalWidth)){
   await new Promise((resolve,reject)=>{im.addEventListener('load',resolve,{once:true});im.addEventListener('error',reject,{once:true});});
  }
  this.source=preprocess(im,this.cleanup);this.animatedFrames=!!this.animatedFrames && !(im instanceof HTMLCanvasElement);
  this.bounds={left:0,right:this.source.width,top:0,bottom:this.source.height};
  try{
   const k=this.source.getContext('2d',{willReadFrequently:true}),
     {width:ww,height:hh}=this.source,img=k.getImageData(0,0,ww,hh).data;
   let left=ww,right=0,top=hh,bottom=0;
   for(let y=0;y<hh;y+=3)for(let x=0;x<ww;x+=3){
    if(img[(y*ww+x)*4+3]>22){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
   }
   if(left<=right)this.bounds={left,right,top,bottom};
  }catch(e){console.warn('L2D bounds unavailable',e)}
  this.blinkEnabled=this.featurePreset==='heroine-front';
  this.render(performance.now(),true);
  return this;
 }
 setAmplitude(v){this.amplitude=clamp(Number(v)||0,0,4);this.render(performance.now(),true);}
 setPeriod(v){this.period=clamp(Number(v)||4.6,2,12);}
 setSoftness(v){this.softness=clamp(Number(v)||0,0,2);}
 async setLayers(parts,canvasSize){
  const width=canvasSize?.[0]||1024,height=canvasSize?.[1]||1024;
  const surface=document.createElement('canvas');surface.width=width;surface.height=height;
  const g=surface.getContext('2d',{alpha:true});
  for(const part of parts){
   if(part.visible===false)continue;
   const im=part.canvas||part.image;
   if(!im)continue;
   g.globalAlpha=clamp(Number(part.opacity??1),0,1);
   g.drawImage(im,Number(part.x)||0,Number(part.y)||0);
  }
  g.globalAlpha=1;
  this.animatedFrames=false;
  await this.setImage(surface);
  // Keep EACH original PSD bitmap for independently articulated rendering.
  this.psdParts=parts.filter(p=>p.visible!==false&&(p.image||p.canvas)).map(p=>({
   image:p.canvas||p.image,x:Number(p.x)||0,y:Number(p.y)||0,name:String(p.name||''),
   opacity:clamp(Number(p.opacity??1),0,1)}));
  this.render(performance.now(),true);return this;
 }
 setPaused(paused){if(paused===!this.playing)return;this.playing=!paused;if(!paused)this.t0=performance.now()-this.frozen;}
 setBones(show){this.drawBones=!!show;this.render(performance.now(),true);}
 drawSkeleton(t,pulse){
  const c=this.ctx,w=this.canvas.width,h=this.canvas.height;
  c.save();c.strokeStyle='rgba(117,208,255,.9)';c.fillStyle='#fff';
  c.lineWidth=Math.max(1,w/540);c.setLineDash([w/115,w/215]);
  const points=[[.5,.13],[.5,.25],[.5,.40],[.5,.56],[.5,.69],[.458,.87],[.458,.976],[.544,.87],[.544,.976]];
  const pt=(p)=>[p[0]*w,p[1]*h];
  const path=(aa)=>{c.beginPath();aa.forEach((p,i)=>{const [x,y]=pt(p);if(!i)c.moveTo(x,y);else c.lineTo(x,y)});c.stroke()};
  path(points.slice(0,5));path([points[4],points[5],points[6]]);
  path([points[4],points[7],points[8]]);
  path([[.39,.29],[.5,.26],[.61,.29]]);path([[.39,.29],[.38,.47],[.40,.54]]);
  path([[.61,.29],[.62,.47],[.60,.54]]);
  for(const p of points.concat([[.39,.29],[.61,.29],[.4,.54],[.6,.54]])){
   const [x,y]=pt(p);c.beginPath();c.arc(x,y,Math.max(2,w/250),0,TWO);c.fill();
  }
  c.restore();
 }
 /* Multi-node original-coordinate mesh: head/neck rigid, long hair tips,
    sleeves, skirt hems, knees and breath have independent inertia phases.
    This is a procedural fallback; imported V4 clips take priority and bypass it.
    The full V4 asset is NOT synthesized here. */
 motionAt(x,y,t){
  // Procedural fallback: breathe with the upper chest; never translate the
  // entire skeleton. The head, waist, pelvis, legs and shoes stay planted.
  const sw=this.source.width,sh=this.source.height;
  const nx=x*1024/sw,ny=y*1024/sh;
  const p=this.amplitude,period=this.period,now=t*1000;
  const local=root.PaperchalkLocalBreath?.point(nx,ny,p,period,now)
    ||{x:nx,y:ny};
  const smooth=(a,b,v)=>{const q=clamp((v-a)/(b-a),0,1);return q*q*(3-2*q);};
  const phase=Math.sin(t*Math.PI*2/period-.65);
  const hair=Math.exp(-Math.pow((nx-520)/110,2))*smooth(175,310,ny)*
    (1-smooth(335,475,ny));
  const skirt=smooth(520,610,ny)*(1-smooth(680,730,ny));
  const sx=(3.2*hair+2.4*skirt)*this.softness*p*phase;
  return {x:(local.x+sx)*sw/1024,y:local.y*sh/1024};
 }
 blinkAmount(t){
  // Sparse asymmetric blinks, smooth 100-150 ms closure; idle loop 6.4 s.
  const x=((t%6.4)+6.4)%6.4;
  const k=(where,width)=>Math.exp(-Math.pow((x-where)/width,4));
  return Math.max(k(2.21,.10),k(5.41,.12));
 }
 drawBlink(t){
  if(!this.blinkEnabled||this.blinkAmount(t)<.006)return;
  const w=this.source.width,h=this.source.height;
  if(w!==1024||h!==1024)return;
  const a=this.blinkAmount(t),g=this.ctx;
  const sx=this.canvas.width/w,sy=this.canvas.height/h;
  // Positions match the original PSD eye locations, not image center guesses.
  // Skin sample beneath the eye avoids a black rectangle or hard mask.
  g.save();g.scale(sx,sy);
  for(const eye of [{x:483,y:143,rx:20,ry:7},{x:548,y:142,rx:20,ry:7}]){
   const sample=this.source.getContext('2d',{willReadFrequently:true})
     .getImageData(Math.round(eye.x),Math.round(eye.y+21),1,1).data;
   const tint=sample[3]>90?`rgba(${sample[0]},${sample[1]},${sample[2]},${a*.98})`: `rgba(228,198,184,${a*.98})`;
   g.fillStyle=tint;
   g.beginPath();g.ellipse(eye.x,eye.y,eye.rx+2,eye.ry+2,0,0,TWO);g.fill();
   g.strokeStyle=`rgba(69,51,49,${a*.86})`;
   g.lineCap='round';g.lineWidth=1.85;
   g.beginPath();g.moveTo(eye.x-eye.rx,eye.y);
   g.quadraticCurveTo(eye.x,eye.y+4,eye.x+eye.rx,eye.y-1);g.stroke();
  }
  g.restore();
 }
 drawBoneRig(t){
  if(!this.drawBones)return;
  const g=this.ctx,sx=this.canvas.width/1024,sy=this.canvas.height/1024;
  const joints=[[512,119],[512,210],[512,338],[512,518],[512,615],
    [466,785],[464,1000],[555,785],[555,1000],[399,344],[391,532],
    [627,344],[636,528],[470,245],[457,307],[560,246],[572,307],
    [452,570],[456,625],[569,570],[566,625]];
  const chains=[[0,1,2,3,4],[4,5,6],[4,7,8],[2,9,10],[2,11,12],[0,13,14],[0,15,16],[3,17,18],[3,19,20]];
  g.save();g.lineWidth=1.8;g.strokeStyle='rgba(125,205,255,.9)';g.fillStyle='#e5f8ff';
  for(const chain of chains){
   g.beginPath();
   chain.forEach((idx,j)=>{
    const p=joints[idx],d=this.motionAt(p[0],p[1],t);
    if(j)g.lineTo(d.x*sx,d.y*sy);else g.moveTo(d.x*sx,d.y*sy);
   });g.stroke();
  }
  for(const p of joints){
   const d=this.motionAt(p[0],p[1],t);
   g.beginPath();g.arc(d.x*sx,d.y*sy,3.2,0,TWO);g.fill();
  }
  g.restore();
 }

 // Anatomical driver: each imported Photoshop bitmap has its own transform.
 // Hair and skirt use triangular skinned meshes; face components follow head.
 // The foot artwork is absolutely fixed to the baseline ground position.
 psdTarget(x,y,part,t){
  const name=(part.name||'').toLowerCase().replace(/[\\s_-]/g,'');
  const s=(v,a,b)=>{let n=clamp((v-a)/(b-a),0,1);return n*n*(3-2*n);};
  const a=this.amplitude,period=this.period,now=t*1000;
  const breath=root.PaperchalkLocalBreath?.point(x,y,a,period,now)||{x,y};
  const theta=t*2*Math.PI/period;
  const lag=Math.sin(theta-.65);
  let X=x,Y=y;
  // No body sway. An entirely unchanged anchor for grounded anatomy.
  if(/footwear|鞋|legwear|双腿|裤|袜/.test(name))return {x,y};
  if(/bottomwear|百褶裙|裙子/.test(name)){
   const tip=s(y,520,660);
   // A tiny cloth response, not a moving pelvis.
   return {x:x+1.2*a*this.softness*lag*tip,y};
  }
  if(/topwear|上身|外套|校服|衬衫|衣服|jacket/.test(name))
   return breath;
  if(/handwear|手臂|挥手|袖子|sleeve/.test(name)){
   // Move sleeve fabric near the clavicles only; the hands stay still.
   const shoulder=(1-s(y,320,485))*(1-s(Math.abs(x-520),165,260));
   return {x:x+(breath.x-x)*shoulder*.65,
           y:y+(breath.y-y)*shoulder*.55};
  }
  if(/backhair|后发|马尾/.test(name)){
   // The scalp is fixed. Only loose lower hair has delayed inertia.
   const tip=s(y,165,330)*(1-s(y,475,550));
   X+=1.8*a*this.softness*lag*tip;return {x:X,y:Y};
  }
  if(/fronthair|刘海|前发/.test(name))return {x,y};
  if(/neck|脖颈|衣领|领带|collar|tie/.test(name)){
   // Neck is practically fixed; cloth at the collar may lift slightly.
   const collar=s(y,170,240)*(1-s(y,270,340));
   return {x,y:y+(breath.y-y)*collar*.35};
  }
  // Face/eyes/eyebrows do not follow the chest. Keep blinking independent.
  if(/irides|虹膜|瞳孔/.test(name))
   return {x,y:133+(y-133)*(1-.73*this.blinkAmount(t))};
  if(/eyewhite|眼白|eyelash|睫毛/.test(name))
   return {x,y:133+(y-133)*(1-.68*this.blinkAmount(t))};
  return {x,y};
 }
 renderPSDParts(t){
  const g=this.ctx,W=this.canvas.width,H=this.canvas.height,sx=W/1024,sy=H/1024;
  const tri=(src,A,B,C,D,E,F)=>{
   const ux=B.x-A.x,uy=B.y-A.y,vx=C.x-A.x,vy=C.y-A.y,det=ux*vy-uy*vx;
   if(Math.abs(det)<.001)return;
   const dx1=E.x-D.x,dy1=E.y-D.y,dx2=F.x-D.x,dy2=F.y-D.y;
   const aa=(dx1*vy-dx2*uy)/det,bb=(dy1*vy-dy2*uy)/det;
   const cc=(dx2*ux-dx1*vx)/det,dd=(dy2*ux-dy1*vx)/det;
   const ee=D.x-aa*A.x-cc*A.y,ff=D.y-bb*A.x-dd*A.y;
   g.save();g.setTransform(aa*sx,bb*sy,cc*sx,dd*sy,ee*sx,ff*sy);
   // Expand each mesh triangle enough to hide diagonal sampling seams.
   const mx=(A.x+B.x+C.x)/3,my=(A.y+B.y+C.y)/3;
   const expand=V=>{let k=1+1.25/Math.max(1,Math.hypot(V.x-mx,V.y-my));return [mx+(V.x-mx)*k,my+(V.y-my)*k]};
   g.beginPath();g.moveTo(...expand(A));g.lineTo(...expand(B));g.lineTo(...expand(C));g.closePath();g.clip();
   const minx=Math.max(0,Math.floor(Math.min(A.x,B.x,C.x))-1);
   const miny=Math.max(0,Math.floor(Math.min(A.y,B.y,C.y))-1);
   const maxx=Math.min(src.width,Math.ceil(Math.max(A.x,B.x,C.x))+1);
   const maxy=Math.min(src.height,Math.ceil(Math.max(A.y,B.y,C.y))+1);
   if(maxx>minx&&maxy>miny)
    g.drawImage(src,minx,miny,maxx-minx,maxy-miny,minx,miny,maxx-minx,maxy-miny);
   g.restore();
  };
  g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  for(const part of this.psdParts){
   const src=part.image,w=src.width,h=src.height;
   if(!w||!h)continue;
   const x=part.x,y=part.y,soft=/back.?hair|front.?hair|后发|刘海|bottomwear|裙|handwear|手臂/i.test(part.name);
   g.globalAlpha=part.opacity;
   if(!soft){
    const A=this.psdTarget(x,y,part,t),B=this.psdTarget(x+w,y,part,t),C=this.psdTarget(x,y+h,part,t);
    g.save();g.setTransform((B.x-A.x)/w*sx,(B.y-A.y)/w*sy,
      (C.x-A.x)/h*sx,(C.y-A.y)/h*sy,A.x*sx,A.y*sy);
    g.drawImage(src,0,0);g.restore();
   }else{
    const cols=Math.max(3,Math.ceil(w/32)),rows=Math.max(4,Math.ceil(h/27));
    const xs=Array.from({length:cols+1},(_,i)=>i*w/cols);
    const ys=Array.from({length:rows+1},(_,i)=>i*h/rows);
    const points=ys.map(v=>xs.map(u=>this.psdTarget(x+u,y+v,part,t)));
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
     const A={x:xs[col],y:ys[row]},B={x:xs[col+1],y:ys[row]};
     const C={x:xs[col],y:ys[row+1]},D={x:xs[col+1],y:ys[row+1]};
     const a=points[row][col],b=points[row][col+1],cc=points[row+1][col],d=points[row+1][col+1];
     tri(src,A,B,C,a,b,cc);tri(src,B,D,C,b,d,cc);
    }
   }
  }
  g.globalAlpha=1;
 }
 render(now=performance.now(),force=false){
  if(!this.source)return;
  if(!force&&now-this.last<40)return;
  this.last=now;
  if(this.animatedFrames&&this.image?.complete&&this.image?.naturalWidth){
   const g=this.source.getContext('2d');g.clearRect(0,0,this.source.width,this.source.height);g.drawImage(this.image,0,0);
  }
  const W=this.canvas.width,H=this.canvas.height,sw=this.source.width,sh=this.source.height;
  const g=this.ctx;
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);
  const t=(this.playing?(now-this.t0):this.frozen)/1000;
  if(this.playing)this.frozen=now-this.t0;
  if(this.psdParts?.length){
   this.renderPSDParts(t);
   if(this.drawBones)this.drawBoneRig(t);
   return;
  }
  if(this.amplitude<.0001){
   g.drawImage(this.source,0,0,W,H);
   this.drawBoneRig(t);return;
  }
  const bounds=this.bounds||{left:0,right:sw,top:0,bottom:sh};
  // Mesh only covers actual opaque character width; avoid wasting time on
  // transparent margins. Two affine triangles per cell, no row-slice flicker.
  const x0=Math.max(0,bounds.left-8),x1=Math.min(sw,bounds.right+8);
  const y0=Math.max(0,bounds.top-8),y1=Math.min(sh,bounds.bottom+8);
  const cols=Math.max(8,Math.ceil((x1-x0)/38)),rows=Math.max(30,Math.ceil((y1-y0)/19));
  const xs=Array.from({length:cols+1},(_,i)=>x0+(x1-x0)*i/cols);
  const ys=Array.from({length:rows+1},(_,j)=>y0+(y1-y0)*j/rows);
  const pts=ys.map(y=>xs.map(x=>this.motionAt(x,y,t)));
  // For axis-aligned source triangles the affine mapping is closed form.
  const tri=(sourceA,sourceB,sourceC,A,B,C)=>{
   const ux=sourceB.x-sourceA.x,uy=sourceB.y-sourceA.y;
   const vx=sourceC.x-sourceA.x,vy=sourceC.y-sourceA.y;
   const det=ux*vy-uy*vx;
   if(Math.abs(det)<1e-5)return;
   const dx1=B.x-A.x,dy1=B.y-A.y,dx2=C.x-A.x,dy2=C.y-A.y;
   const a=(dx1*vy-dx2*uy)/det,b=(dy1*vy-dy2*uy)/det;
   const c=(dx2*ux-dx1*vx)/det,d=(dy2*ux-dy1*vx)/det;
   const e=A.x-a*sourceA.x-c*sourceA.y;
   const f=A.y-b*sourceA.x-d*sourceA.y;
   g.save();g.setTransform(a*W/sw,b*H/sh,c*W/sw,d*H/sh,e*W/sw,f*H/sh);
   g.beginPath();g.moveTo(sourceA.x,sourceA.y);
   g.lineTo(sourceB.x,sourceB.y);g.lineTo(sourceC.x,sourceC.y);g.closePath();g.clip();
   const minx=Math.max(0,Math.floor(Math.min(sourceA.x,sourceB.x,sourceC.x))-1);
   const miny=Math.max(0,Math.floor(Math.min(sourceA.y,sourceB.y,sourceC.y))-1);
   const maxx=Math.min(sw,Math.ceil(Math.max(sourceA.x,sourceB.x,sourceC.x))+1);
   const maxy=Math.min(sh,Math.ceil(Math.max(sourceA.y,sourceB.y,sourceC.y))+1);
   g.drawImage(this.source,minx,miny,maxx-minx,maxy-miny,minx,miny,maxx-minx,maxy-miny);
   g.restore();
  };
  g.imageSmoothingEnabled=true;g.imageSmoothingQuality='medium';
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
   const A={x:xs[i],y:ys[j]},B={x:xs[i+1],y:ys[j]},
     C={x:xs[i],y:ys[j+1]},D={x:xs[i+1],y:ys[j+1]};
   const a=pts[j][i],b=pts[j][i+1],c=pts[j+1][i],d=pts[j+1][i+1];
   tri(A,B,C,a,b,c);tri(B,D,C,b,d,c);
  }
  this.drawBlink(t);
  this.drawBoneRig(t);
 }
 start(){
  if(this._raf)return;
  const tick=t=>{
   if(!document.hidden)this.render(t);
   this._raf=requestAnimationFrame(tick);
  };this._raf=requestAnimationFrame(tick);
 }
 stop(){if(this._raf)cancelAnimationFrame(this._raf);this._raf=0;}
 destroy(){this.stop();this.source=null;}
}
root.HeroineBreathRig=HeroineBreathRig;root.PaperchalkL2DRig=HeroineBreathRig;
})(window);
