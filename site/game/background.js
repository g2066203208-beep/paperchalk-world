// PAPERWORLD · one fullscreen procedural background, no placeholder game UI.
// D palette: #393657 / #F2A5C2 / #A9BAE9 / #FFF5E6.
// This background ONLY draws #FFF5E6 and #F2A5C2.
export const PALETTE=Object.freeze(['#393657','#F2A5C2','#A9BAE9','#FFF5E6']);
export const BACKGROUND='#FFF5E6';
export const STRIPE='#F2A5C2';
export const PIXEL_CSS=4;
export const STRIPE_CELLS=36;
export const GAP_CELLS=44;
export const CYCLE_SECONDS=36;
export const PATTERN_CELLS=STRIPE_CELLS+GAP_CELLS;
export const stripeAt=(x,y,phase)=>((x+y+phase)%PATTERN_CELLS+PATTERN_CELLS)%PATTERN_CELLS<STRIPE_CELLS;
export const phaseFromSeconds=t=>Math.floor(((t%CYCLE_SECONDS)+CYCLE_SECONDS)%CYCLE_SECONDS*PATTERN_CELLS/CYCLE_SECONDS)%PATTERN_CELLS;

const canvas=document.getElementById('background');
if(!canvas)throw new Error('Missing #background canvas');
const ctx=canvas.getContext('2d',{alpha:false});
if(!ctx)throw new Error('Unable to initialize 2D canvas');
ctx.imageSmoothingEnabled=false;
const CREAM=[255,245,230],PINK=[242,165,194];
let width=0,height=0,time=0,lastTimestamp=null,lastPhase=-1,dirty=true;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function resize(){
  const w=Math.ceil(Math.max(1,innerWidth)/PIXEL_CSS);
  const h=Math.ceil(Math.max(1,innerHeight)/PIXEL_CSS);
  if(w===width&&h===height)return;
  width=w;height=h;canvas.width=w;canvas.height=h;
  // Integer CSS scaling: never use fractional scaling or linear interpolation.
  canvas.style.width=(w*PIXEL_CSS)+'px';
  canvas.style.height=(h*PIXEL_CSS)+'px';
  ctx.imageSmoothingEnabled=false;
  dirty=true;
}
function paint(phase){
  if(!width||!height)return;
  const frame=ctx.createImageData(width,height);
  const pixels=frame.data;
  for(let y=0;y<height;y++){
    for(let x=0;x<width;x++){
      const color=stripeAt(x,y,phase)?PINK:CREAM;
      const i=(y*width+x)*4;
      pixels[i]=color[0];pixels[i+1]=color[1];pixels[i+2]=color[2];pixels[i+3]=255;
    }
  }
  ctx.putImageData(frame,0,0);lastPhase=phase;dirty=false;
}
function frame(timestamp){
  if(lastTimestamp===null)lastTimestamp=timestamp;
  const delta=Math.min(.10,Math.max(0,(timestamp-lastTimestamp)/1000));
  lastTimestamp=timestamp;
  if(!reduced&&!document.hidden)time=(time+delta)%CYCLE_SECONDS;
  const phase=phaseFromSeconds(time);
  if(dirty||phase!==lastPhase)paint(phase);
  requestAnimationFrame(frame);
}
addEventListener('resize',resize,{passive:true});
addEventListener('orientationchange',()=>{lastTimestamp=null;resize()},{passive:true});
document.addEventListener('visibilitychange',()=>{lastTimestamp=null});
resize();
paint(0);
requestAnimationFrame(frame);
