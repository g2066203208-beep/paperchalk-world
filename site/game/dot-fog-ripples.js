/* Paperchalk World — full-field BLACK fluid haze + nearly imperceptible waves.
 * Map presentation only; official metro, city, station and POI data is unchanged.
 * Uses the game's existing live world-fog canvas for dark occlusion, and the
 * same smooth flow mathematics to fill the ENTIRE map rather than its edges.
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
  const mist=document.createElement('canvas');
  fog.className='pw-dot-fog-surface';dots.className='pw-dot-wave-surface';
  fog.setAttribute('aria-hidden','true');dots.setAttribute('aria-hidden','true');
  map.prepend(fog,dots);
  const fc=fog.getContext('2d',{alpha:false});
  const dc=dots.getContext('2d',{alpha:true});
  const mc=mist.getContext('2d',{alpha:false});
  if(!fc||!dc||!mc){fog.remove();dots.remove();return null}
  map.classList.add('pw-dot-ripple-running');
  map.dataset.dotAnimation='fluid-ripples';
  map.dataset.fogCoverage='full';
  map.dataset.rippleStyle='subtle-slow';
  let frame=0,last=0,lastBirth=0,sequence=0,mistImage=null,lastMistUpdate=0;
  const waves=[];
  function spawn(time,v,c){
   const id=++sequence;
   waves.push({
    // Source positions are fixed in the original MAP's coordinate system.
    x:(-c.x+v.w*(.10+.80*hash(id*2+3)))/c.scale,
    y:(-c.y+v.h*(.12+.76*hash(id*3+9)))/c.scale,
    born:time,
    speed:20+8*hash(id*5+2), // 5–7 times slower than the first draft.
    width:105+28*hash(id*7+1), // broad, perfectly smooth swell
    strength:.6+.25*hash(id*11+4)
   });
   if(waves.length>3)waves.shift();
  }
  function paintFullFieldFog(now,w,h,worldFog){
   const ratio=Math.min(.72,root.devicePixelRatio||1);
   const fw=Math.max(1,Math.round(w*ratio));
   const fh=Math.max(1,Math.round(h*ratio));
   if(fog.width!==fw||fog.height!==fh){fog.width=fw;fog.height=fh}
   // Low-resolution filtered density: no big gradients, no grey rectangle,
   // no hard clear zone. Every map pixel remains nearly black.
   const mw=Math.max(90,Math.min(200,Math.round(w*.12)));
   const mh=Math.max(66,Math.min(120,Math.round(h*.12)));
   if(mist.width!==mw||mist.height!==mh){
    mist.width=mw;mist.height=mh;
    mistImage=mc.createImageData(mw,mh);
    lastMistUpdate=0;
   }
   // The full-screen haze flows so slowly that a 12 fps low-resolution
   // density refresh is perceptually continuous. The real WebGL fog and
   // dots still composite at their own cadence.
   if(!lastMistUpdate||now-lastMistUpdate>=85){
    lastMistUpdate=now;
    const p=mistImage.data,t=now*.001;
    const colShift=new Float32Array(mw);
    for(let i=0;i<mw;i++){
     const xx=((i+.5)/mw-.5)*5;
     colShift[i]=.20*Math.sin(xx*1.1+t*.048);
    }
    for(let j=0;j<mh;j++){
     const yy=((j+.5)/mh-.5)*4;
     const rowShift=.20*Math.sin(yy*1.3-t*.055);
     for(let i=0;i<mw;i++){
      const xx=((i+.5)/mw-.5)*5;
      const flowX=xx+rowShift,flowY=yy+colShift[i];
      const a=Math.sin(flowX*1.27+flowY*.67+t*.055);
      const b=Math.cos(flowY*1.85-flowX*.53-t*.041);
      const d=Math.sin(flowX*.62-flowY*1.12+t*.032);
      const value=clamp(Math.round(8.5+3.3*(a*.46+b*.32+d*.22)),4,14);
      const z=(j*mw+i)*4;
      p[z]=value;p[z+1]=value+1;p[z+2]=value+1;p[z+3]=255;
     }
    }
    mc.putImageData(mistImage,0,0);
    map.dataset.fogDensityFrames=String((+map.dataset.fogDensityFrames||0)+1);
   }
   fc.setTransform(fw/w,0,0,fh/h,0,0);
   fc.globalAlpha=1;fc.fillStyle='#050606';fc.fillRect(0,0,w,h);
   fc.imageSmoothingEnabled=true;
   fc.globalAlpha=.95;fc.drawImage(mist,0,0,w,h);
   // The ORIGINAL rendered fluid still participates in the map. It now
   // gently darkens the full black haze, without cutting a grey safe-zone.
   if(worldFog?.width>0&&worldFog?.height>0){
    try{
     fc.globalAlpha=.16;
     fc.drawImage(worldFog,0,0,w,h);
     map.dataset.fogSource='live-world-fluid';
    }catch(_){map.dataset.fogSource='full-field-fallback'}
   }else map.dataset.fogSource='full-field-fallback';
   fc.globalAlpha=1;
  }
  function render(now,worldFog){
   if(document.hidden||now-last<40||!map.isConnected||
      !map.classList.contains('pw-dot-empty-preview')||!map.getClientRects().length)return;
   last=now;
   const v=viewport(),c=camera(),w=Math.ceil(v.w),h=Math.ceil(v.h);
   if(w<=0||h<=0||!Number.isFinite(c.scale)||c.scale<=0)return;
   paintFullFieldFog(now,w,h,worldFog);
   if(dots.width!==w||dots.height!==h){dots.width=w;dots.height=h}
   const t=now*.001;
   // Rare randomized waves, not repeated bright impact rings.
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
     // Gaussian ring; smooth fade-in and fade-out, never a sharp crest.
     const entrance=Math.sin(Math.PI*.5*Math.min(1,age/5));
     const exit=Math.min(1,Math.max(0,(26-age)/7));
     swell+=Math.exp(-.5*band*band)*entrance*exit*wave.strength;
    }
    const lift=clamp(swell,0,1);
    const breath=.006*Math.sin(t*.14+gx*.25+gy*.18);
    // Nearly imperceptible 3D response: no jump, pulse or glow.
    // Radius <= +0.13px, y displacement <= 0.09px, alpha <= +0.025.
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
   fog.remove();dots.remove();
  }};
 }
 root.PaperWorldDotFogRipples=Object.freeze({create});
})(window);
