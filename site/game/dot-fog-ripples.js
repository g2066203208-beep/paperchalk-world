/* Paperchalk World — the original map's quiet, living dot field.
 * Presentation-only layer: real world fog + analytic expanding wavefronts.
 * It cannot mutate, replace or reserialize the canonical metro/city graph.
 */
(function(root){
 'use strict';
 const TAU=Math.PI*2;
 const fract=n=>n-Math.floor(n);
 const hash=n=>fract(Math.sin(n*127.1+78.233)*43758.5453);
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
 function create({map,viewport,camera,cell=40,worldWidth=2000,worldHeight=1280,enabled=true}){
  if(!enabled)return null;
  const fog=document.createElement('canvas'),dots=document.createElement('canvas');
  fog.className='pw-dot-fog-surface';dots.className='pw-dot-wave-surface';
  fog.setAttribute('aria-hidden','true');dots.setAttribute('aria-hidden','true');
  map.prepend(fog,dots);
  const fc=fog.getContext('2d',{alpha:false});
  const dc=dots.getContext('2d');
  if(!fc||!dc){fog.remove();dots.remove();return null}
  map.classList.add('pw-dot-ripple-running');
  map.dataset.dotAnimation='fluid-ripples';
  let frame=0,last=0,lastBirth=0,sequence=0;
  const waves=[];
  function spawn(time,v,c){
   const id=++sequence;
   waves.push({
    x:(-c.x+v.w*(.10+.80*hash(id*2+3)))/c.scale,
    y:(-c.y+v.h*(.12+.76*hash(id*3+9)))/c.scale,
    born:time,speed:126+35*hash(id*5+2),
    width:38+16*hash(id*7+1),strength:.72+.26*hash(id*11+4)
   });
   if(waves.length>5)waves.shift();
  }
  function render(now,worldFog){
   if(document.hidden||now-last<40||!map.isConnected||!map.classList.contains('pw-dot-empty-preview')||!map.getClientRects().length)return;
   last=now;
   const v=viewport(),c=camera(),w=Math.ceil(v.w),h=Math.ceil(v.h);
   if(w<=0||h<=0||!Number.isFinite(c.scale)||c.scale<=0)return;
   const ratio=Math.min(.72,root.devicePixelRatio||1);
   const fw=Math.max(1,Math.round(w*ratio)),fh=Math.max(1,Math.round(h*ratio));
   if(fog.width!==fw||fog.height!==fh){fog.width=fw;fog.height=fh}
   if(dots.width!==w||dots.height!==h){dots.width=w;dots.height=h}
   // Draw the SAME already-running WebGL/CPU black fluid, not a new fake fog.
   // The dark-gray substrate lets the black fluid's soft moving contours show.
   fc.setTransform(fw/w,0,0,fh/h,0,0);
   fc.globalAlpha=1;fc.fillStyle='#222829';fc.fillRect(0,0,w,h);
   if(worldFog?.width&&worldFog?.height){
    try{
     fc.globalAlpha=.95;fc.drawImage(worldFog,0,0,w,h);
     fc.globalAlpha=.19;
     fc.drawImage(worldFog,-w*.15+Math.sin(now*.00013)*w*.07,
      -h*.14+Math.cos(now*.00010)*h*.07,w*1.3,h*1.28);
     map.dataset.fogSource='live-world-fluid';
    }catch(_){map.dataset.fogSource='dark-fallback'}
   }
   fc.globalAlpha=1;
   const t=now*.001;
   if(!lastBirth||now-lastBirth>2200+750*hash(sequence+7)){
    spawn(t,v,c);lastBirth=now;
   }
   for(let i=waves.length-1;i>=0;i--){
    if(t-waves[i].born>8.4)waves.splice(i,1);
   }
   dc.setTransform(1,0,0,1,0,0);dc.clearRect(0,0,w,h);
   dc.fillStyle='#c2c9c2';
   const minX=clamp(Math.ceil((-c.x/c.scale-2)/cell),0,worldWidth/cell);
   const maxX=clamp(Math.floor(((w-c.x)/c.scale+2)/cell),0,worldWidth/cell);
   const minY=clamp(Math.ceil((-c.y/c.scale-2)/cell),0,worldHeight/cell);
   const maxY=clamp(Math.floor(((h-c.y)/c.scale+2)/cell),0,worldHeight/cell);
   for(let gy=minY;gy<=maxY;gy++)for(let gx=minX;gx<=maxX;gx++){
    const wx=gx*cell,wy=gy*cell;
    let energy=0;
    for(const wave of waves){
     const age=t-wave.born;if(age<0||age>8.4)continue;
     const d=Math.hypot(wx-wave.x,wy-wave.y);
     const band=Math.abs(d-age*wave.speed)/wave.width;
     if(band<1){const crest=1-band*band;energy+=crest*crest*wave.strength*(1-age/8.4)}
    }
    const lift=clamp(energy,0,1);
    const under=.045*Math.sin(t*.7+gx*.31+gy*.23);
    // Gentle faux depth: up to 0.85 px of vertical lift, 0.85 px radius
    // growth, and a small rise in value when an expanding ring passes.
    dc.globalAlpha=clamp(.43+lift*.43+under*.6,.29,.85);
    dc.beginPath();
    dc.arc(c.x+wx*c.scale,c.y+wy*c.scale-lift*.85,
     1.48+lift*.84+under,0,TAU);
    dc.fill();
   }
   dc.globalAlpha=1;
   map.dataset.rippleFrames=String(++frame);
   map.dataset.rippleCount=String(waves.length);
  }
  return {render,dispose(){
   map.classList.remove('pw-dot-ripple-running');
   fog.remove();dots.remove();
  }};
 }
 root.PaperWorldDotFogRipples=Object.freeze({create});
})(window);
