/* Paperchalk World — pure-black map with quiet wave-motion dots.
 * Map presentation only. No fog or background effects are generated.
 * All official city / metro / POI data remain untouched.
 */
(function(root){
 'use strict';
 const TAU=Math.PI*2;
 const fract=n=>n-Math.floor(n);
 const hash=n=>fract(Math.sin(n*127.1+78.233)*43758.5453);
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
 function create({map,viewport,camera,cell=40,worldWidth=2000,worldHeight=1280,enabled=true}){
  if(!enabled)return null;
  const dots=document.createElement('canvas');
  dots.className='pw-dot-wave-surface';
  dots.setAttribute('aria-hidden','true');
  map.prepend(dots);
  const dc=dots.getContext('2d',{alpha:true});
  if(!dc){dots.remove();return null}
  map.classList.add('pw-dot-ripple-running');
  map.dataset.dotAnimation='slow-subtle-ripples';
  map.dataset.mapBackground='solid-black';
  let frame=0,last=0,lastBirth=0,sequence=0;
  const waves=[];
  function spawn(time,v,c){
   const id=++sequence;
   waves.push({
    // World-grid anchored wavefronts: panning and zooming never move them.
    x:(-c.x+v.w*(.10+.80*hash(id*2+3)))/c.scale,
    y:(-c.y+v.h*(.12+.76*hash(id*3+9)))/c.scale,
    born:time,speed:20+8*hash(id*5+2),
    width:105+28*hash(id*7+1),
    strength:.6+.25*hash(id*11+4)
   });
   if(waves.length>3)waves.shift();
  }
  function render(now){
   if(document.hidden||now-last<40||!map.isConnected||
      !map.classList.contains('pw-dot-empty-preview')||!map.getClientRects().length)return;
   last=now;
   const v=viewport(),c=camera(),w=Math.ceil(v.w),h=Math.ceil(v.h);
   if(w<=0||h<=0||!Number.isFinite(c.scale)||c.scale<=0)return;
   if(dots.width!==w||dots.height!==h){dots.width=w;dots.height=h}
   const t=now*.001;
   if(!lastBirth||now-lastBirth>11500+3500*hash(sequence+7)){
    spawn(t,v,c);lastBirth=now;
   }
   for(let i=waves.length-1;i>=0;i--){
    if(t-waves[i].born>26)waves.splice(i,1);
   }
   dc.setTransform(1,0,0,1,0,0);
   dc.clearRect(0,0,w,h);dc.fillStyle='#bbc4c1';
   const minX=clamp(Math.ceil((-c.x/c.scale-2)/cell),0,worldWidth/cell);
   const maxX=clamp(Math.floor(((w-c.x)/c.scale+2)/cell),0,worldWidth/cell);
   const minY=clamp(Math.ceil((-c.y/c.scale-2)/cell),0,worldHeight/cell);
   const maxY=clamp(Math.floor(((h-c.y)/c.scale+2)/cell),0,worldHeight/cell);
   for(let gy=minY;gy<=maxY;gy++)for(let gx=minX;gx<=maxX;gx++){
    const wx=gx*cell,wy=gy*cell;
    let swell=0;
    for(const wave of waves){
     const age=t-wave.born;if(age<0||age>26)continue;
     const d=Math.hypot(wx-wave.x,wy-wave.y);
     const band=(d-age*wave.speed)/wave.width;
     const entrance=Math.sin(Math.PI*.5*Math.min(1,age/5));
     const exit=Math.min(1,Math.max(0,(26-age)/7));
     swell+=Math.exp(-.5*band*band)*entrance*exit*wave.strength;
    }
    const lift=clamp(swell,0,1);
    const breath=.006*Math.sin(t*.14+gx*.25+gy*.18);
    // No glow, fog, noise, or wave texture: only barely moving grid points.
    dc.globalAlpha=clamp(.43+lift*.022+breath,.39,.46);
    dc.beginPath();
    dc.arc(c.x+wx*c.scale,c.y+wy*c.scale-lift*.085,
     1.41+lift*.12+breath*.3,0,TAU);
    dc.fill();
   }
   dc.globalAlpha=1;
   map.dataset.rippleFrames=String(++frame);
   map.dataset.rippleCount=String(waves.length);
  }
  return {render,dispose(){
   map.classList.remove('pw-dot-ripple-running');
   dots.remove();
  }};
 }
 root.PaperWorldDotFogRipples=Object.freeze({create});
})(window);
