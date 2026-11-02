/* Heroine idle mesh, v1.0 - reusable in game and online studio.
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
  this.t0=performance.now();this.frozen=0;this.last=0;this._raf=0;
  this.source=null;
  this.ready=this.setImage(image);
 }
 async setImage(im){
  this.image=im;
  if(!im)return this;
  if(!(im instanceof HTMLCanvasElement)&&!(im instanceof ImageBitmap)&&(!im.complete||!im.naturalWidth)){
   await new Promise((resolve,reject)=>{im.addEventListener('load',resolve,{once:true});im.addEventListener('error',reject,{once:true});});
  }
  this.source=preprocess(im,this.cleanup);this.animatedFrames=!!this.animatedFrames && !(im instanceof HTMLCanvasElement);
  this.render(performance.now(),true);
  return this;
 }
 setAmplitude(v){this.amplitude=clamp(Number(v)||0,0,2);this.render(performance.now(),true);}
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
  this.animatedFrames=false;return this.setImage(surface);
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
 render(now=performance.now(),force=false){
  if(!this.source)return;
  if(!force&&now-this.last<31)return;
  if(this.animatedFrames&&this.image&&this.image.complete&&this.image.naturalWidth){
   const x=this.source.getContext('2d');x.clearRect(0,0,this.source.width,this.source.height);x.drawImage(this.image,0,0);
  }
  this.last=now;
  const c=this.ctx,W=this.canvas.width,H=this.canvas.height;
  c.clearRect(0,0,W,H);
  const sw=this.source.width,sh=this.source.height;
  const elapsed=this.playing?(now-this.t0)/1000:this.frozen/1000;
  if(this.playing)this.frozen=now-this.t0;
  const phase=TWO*elapsed/this.period;
  const lung=Math.sin(phase),lag=Math.sin(phase-.65);
  const A=this.amplitude,flex=this.softness;
  if(A<.001){c.drawImage(this.source,0,0,W,H);if(this.drawBones)this.drawSkeleton(now,lung);return;}
  // Vertex mapping shared by neighboring rows: each band uses the same
  // boundary transform so there are no cracks or independent part offsets.
  const yy=y=>{
   const v=y/sh,thorax=bell(v,.37,.15),skirt=bell(v,.60,.072);
   const head=bell(v,.15,.10);
   const fixed=smooth(.69,.82,v);
   return y-((2.8*thorax*lung+.30*head*lag+.44*skirt*lag*flex)*A)*(1-fixed);
  };
  const xInfo=y=>{
   const v=y/sh,thorax=bell(v,.39,.14)*(1-smooth(.59,.70,v));
   const fabric=bell(v,.59,.09);
   const face=bell(v,.18,.095)*(1-smooth(.31,.43,v));
   const lock=1-smooth(.68,.8,v);
   return {
    widen:(.0055*thorax*lung+.0012*fabric*lag*flex)*A,
    shift:(.18*face*lag+.55*fabric*lag*flex)*A*lock
   };
  };
  const step=Math.max(5,Math.floor(sh/128));
  const sx=W/sw,sy=H/sh;
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  for(let y=0;y<sh;y+=step){
   const y2=Math.min(sh,y+step),ym=(y+y2)*.5,di=xInfo(ym);
   const y0=yy(y)*sy, y1=yy(y2)*sy;
   const destH=y1-y0;
   const extra=1.0; // one display pixel overlap, avoids antialias row seams
   const w=W*(1+di.widen),dx=(W-w)*.5+di.shift*sx;
   c.drawImage(this.source,0,y,sw,y2-y,dx,y0,w,destH+extra);
  }
  if(this.drawBones)this.drawSkeleton(now,lung);
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
