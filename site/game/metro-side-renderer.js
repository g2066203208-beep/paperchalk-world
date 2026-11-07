/* Paperchalk metro cabin — locked SIDE ELEVATION.
 * The camera is perpendicular to the opposite bench: zero depth vanishing,
 * zero yaw, no camera pan. Each art module can later be replaced by an
 * independently authored Anima PNG without moving a seat or L2D actor.
 * Draw only environment geometry, never baked-in passengers or text.
 */
(function(global){
'use strict';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const ART=Object.freeze({
 // Approved complete Anima scene; keep the procedural background if absent.
 master:'./assets/metro/side/cabin-master-illustrated.webp',
 wall:'./assets/metro/side/wall.webp',
 windows:'./assets/metro/side/windows.webp',
 doors:'./assets/metro/side/doors.webp',
 ceiling:'./assets/metro/side/ceiling.webp',
 rails:'./assets/metro/side/rails.webp',
 benchBack:'./assets/metro/side/bench-back.webp',
 benchFront:'./assets/metro/side/bench-front.webp',
 floor:'./assets/metro/side/floor.webp'
});
// Load optional art from the authored map. Missing files silently keep vector
// blockout: no breaking scene, no fake placeholder character.
const images=new Map(),pending=new Set();
function load(key,paintAgain){
 if(images.has(key)||pending.has(key))return;
 pending.add(key);
 const im=new Image();
 im.onload=()=>{pending.delete(key);images.set(key,im);paintAgain?.()};
 im.onerror=()=>{pending.delete(key);images.set(key,null)};
 im.src=ART[key];
}
function image(ctx,key,w,h,paintAgain){
 const im=images.get(key);
 if(im?.naturalWidth){
  ctx.drawImage(im,0,0,w,h);return true;
 }
 // Deferred until Anima assets arrive; no early blanking.
 if(!images.has(key))load(key,paintAgain);
 return false;
}
const r=(ctx,x,y,w,h,fill)=>{
 ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);
};
function stroke(ctx,x,y,w,h,color,width=1){
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.strokeRect(x,y,w,h);
}
function path(ctx,coords,color,width=1){
 ctx.beginPath();
 for(let i=0;i<coords.length;i++){
  if(!i)ctx.moveTo(...coords[i]);else ctx.lineTo(...coords[i]);
 }
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
function rounded(ctx,x,y,w,h,rad,color){
 ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,rad);ctx.fill();
}
function drawBackground(ctx,w,h,t,anomaly,repaint){
 // Authored 2172x724 subway wall with real alpha-window masks.
 // Respect original 3:1 aspect; never stretch the doors or benches.
 const master=images.get('master');
 if(master?.naturalWidth){
  ctx.fillStyle='#18262c';ctx.fillRect(0,0,w,h);
  const fit=Math.min(w/master.naturalWidth,h/master.naturalHeight);
  const iw=master.naturalWidth*fit,ih=master.naturalHeight*fit;
  ctx.drawImage(master,(w-iw)*.5,(h-ih)*.5,iw,ih);
  if(anomaly){
   ctx.fillStyle=(Math.floor(t/190)%17===0)?'#7f4a561e':'#08131e48';
   ctx.fillRect(0,0,w,h);
  }
  return;
 }
 if(!images.has('master'))load('master',repaint);
 const fill=ctx.createLinearGradient(0,0,0,h);
 fill.addColorStop(0,anomaly?'#22242e':'#a2b4b5');
 fill.addColorStop(.6,anomaly?'#29323a':'#c2cdc9');
 fill.addColorStop(1,anomaly?'#131920':'#778b91');
 ctx.fillStyle=fill;ctx.fillRect(0,0,w,h);
 const layer=fn=>{ctx.save();fn();ctx.restore()};
 const base=anomaly?'#40434d':'#d6ded9';
 // SIDE ELEVATION: every element is horizontal/vertical, not scaled by Z.
 layer(()=>{
  if(image(ctx,'wall',w,h,repaint))return;
  r(ctx,0,h*.17,w,h*.68,base);
  r(ctx,0,h*.17,w,h*.035,anomaly?'#252d38':'#edf0eb');
  r(ctx,0,h*.81,w,h*.034,'#556a70');
  // Commuter side wall panels (four equal sections).
  for(let i=1;i<5;i++)r(ctx,i*w/5-1,h*.2,2,h*.62,anomaly?'#3a404a':'#9baeb0');
 });
 layer(()=>{
  if(image(ctx,'windows',w,h,repaint))return;
  const wins=[[.17,.15],[.37,.15],[.57,.15],[.77,.15]];
  for(let i=0;i<wins.length;i++){
   const [x,ww]=wins[i];const xx=w*x,wwid=w*ww;
   rounded(ctx,xx,h*.31,wwid,h*.29,Math.max(4,h*.016),'#46585d');
   rounded(ctx,xx+3,h*.315,wwid-6,h*.275,Math.max(3,h*.012),
     anomaly?'#080d18':'#23353c');
   ctx.save();ctx.beginPath();ctx.rect(xx+4,h*.32,wwid-8,h*.265);ctx.clip();
   // Only the outdoors moves horizontally. The carriage stays perfectly still.
   const move=(t*.025)%45;
   for(let j=-2;j<8;j++){
    const bx=xx+j*35-move;
    r(ctx,bx,h*.46+(j%3)*h*.02,22,h*.14,
      anomaly?'#070d15':'#1c343a');
    r(ctx,bx+8,h*.47+(j%3)*h*.02,2,3,
      anomaly?'#682e41':'#a5a895');
   }
   ctx.restore();
   stroke(ctx,xx+1,h*.312,wwid-2,h*.283,
     anomaly?'#6c626e':'#e2e7df',Math.max(1,w*.0017));
   r(ctx,xx+wwid*.1,h*.33,1.5,h*.23,'#829da0');
  }
 });
 layer(()=>{
  if(image(ctx,'doors',w,h,repaint))return;
  const doors=[[.015,.13],[.856,.13]];
  for(const [x,ww] of doors){
   r(ctx,w*x,h*.235,w*ww,h*.60,anomaly?'#292f3a':'#b7c6c5');
   stroke(ctx,w*x,h*.235,w*ww,h*.60,'#728f93',3);
   const xx=w*(x+ww*.12),fw=w*ww*.76;
   rounded(ctx,xx,h*.35,fw,h*.34,h*.016,'#455e65');
   rounded(ctx,xx+3,h*.355,fw-6,h*.33,h*.011,
     anomaly?'#101421':'#223b44');
   r(ctx,w*(x+ww*.5)-1,h*.239,2,h*.595,'#758c8e');
   r(ctx,w*(x+ww*.5)-12,h*.63,3,h*.06,'#788e92');
   r(ctx,w*(x+ww*.5)+9,h*.63,3,h*.06,'#788e92');
  }
 });
 layer(()=>{
  if(image(ctx,'ceiling',w,h,repaint))return;
  r(ctx,0,0,w,h*.20,anomaly?'#272b35':'#e2e7e1');
  r(ctx,0,h*.18,w,h*.017,'#8b9e9f');
  r(ctx,0,h*.08,w,h*.029,anomaly?'#b38f9e':'#eff5e6');
  for(let i=0;i<6;i++)r(ctx,w*(.08+i*.15),h*.02,w*.075,h*.03,
    anomaly?'#34363e':'#c5cfcc');
  path(ctx,[[0,h*.20],[w,h*.20]],'#536c73',2);
 });
 layer(()=>{
  if(image(ctx,'rails',w,h,repaint))return;
  // The grab rail is perfectly horizontal, as on a side-elevation plan.
  r(ctx,0,h*.24,w,h*.012,anomaly?'#8b8f9a':'#a9b8b7');
  const ringCount=11;
  for(let i=0;i<ringCount;i++){
   const x=w*(.13+i*.075);
   r(ctx,x-1,h*.25,2,h*.065,'#849b9e');
   ctx.beginPath();ctx.ellipse(x,h*.341,w*.010,h*.021,0,0,Math.PI*2);
   ctx.lineWidth=Math.max(2,w*.002);
   ctx.strokeStyle=anomaly?'#85838e':'#d6ded8';ctx.stroke();
  }
  for(const x of [.15,.85]){
   r(ctx,w*x-2,h*.20,4,h*.59,anomaly?'#838c9a':'#92a4a4');
  }
 });
 layer(()=>{
  if(image(ctx,'benchBack',w,h,repaint))return;
  // Same row all the way across: 4 clearly usable character seats.
  r(ctx,w*.145,h*.625,w*.71,h*.15,anomaly?'#5b4c5d':'#6c818c');
  r(ctx,w*.145,h*.632,w*.71,h*.01,anomaly?'#7b6575':'#94adb2');
  for(const ratio of [.31,.47,.63,.79])
   r(ctx,w*ratio-1.5,h*.64,3,h*.13,anomaly?'#332e38':'#526a72');
 });
 layer(()=>{
  if(image(ctx,'floor',w,h,repaint))return;
  r(ctx,0,h*.844,w,h*.156,anomaly?'#1a2029':'#526b71');
  r(ctx,0,h*.834,w,h*.009,'#334b53');
  // No converging floor joints.
  for(let i=1;i<9;i++)
   r(ctx,w*i/9,h*.85,1,h*.15,anomaly?'#242932':'#70858a');
 });
 const shade=ctx.createLinearGradient(0,0,0,h);
 shade.addColorStop(0,'#11192344');shade.addColorStop(.5,'#11192300');
 shade.addColorStop(1,'#10161c70');
 ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
 if(anomaly){
  r(ctx,0,0,w,h,(Math.floor(t/190)%17===0)?'#97556915':'#11172116');
 }
}
function drawForeground(ctx,w,h,anomaly,repaint){
 ctx.clearRect(0,0,w,h);
 // Never paint a synthetic old bench over the artist's complete carriage:
 // a future authored alpha bench-front layer owns passenger leg occlusion.
 if(images.get('master')?.naturalWidth){
  image(ctx,'benchFront',w,h,repaint);
  return;
 }
 if(image(ctx,'benchFront',w,h,repaint))return;
 // This foreground is painted AFTER L2D, precisely covering the lower legs,
 // so existing FRONT rigs read as seated without new body animation.
 r(ctx,w*.145,h*.754,w*.71,h*.075,
   anomaly?'#333844':'#516d77');
 r(ctx,w*.145,h*.754,w*.71,h*.013,
   anomaly?'#726270':'#89a5ac');
 for(const side of [.145,.85])
  r(ctx,w*side-2,h*.756,4,h*.075,
    anomaly?'#8b8795':'#9bb2b8');
 path(ctx,[[w*.146,h*.828],[w*.856,h*.828]],
   anomaly?'#222530':'#2e4d55',2);
}
const SEATS=Object.freeze([
 Object.freeze({id:'seat-1',x:.29}),
 Object.freeze({id:'seat-2',x:.43}),
 Object.freeze({id:'seat-3',x:.61}),
 Object.freeze({id:'seat-4',x:.75})
]);
global.PaperWorldMetroSideRenderer=Object.freeze({
 ART,SEATS,drawBackground,drawForeground,hasMaster:()=>!!images.get('master')?.naturalWidth
});
})(window);
