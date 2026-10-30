// PAPERWORLD: generate an exact two-color pixel stripe texture ONCE, let the
// compositor translate it continuously. Never redraw the full screen per frame.
export const PALETTE=Object.freeze(['#393657','#F2A5C2','#A9BAE9','#FFF5E6']);
export const BACKGROUND='#FFF5E6';
export const STRIPE='#A9BAE9';
export const PIXEL_CSS=4;
export const STRIPE_CELLS=36;
export const GAP_CELLS=44;
export const CYCLE_SECONDS=8;
export const PATTERN_CELLS=STRIPE_CELLS+GAP_CELLS;
export const PERIOD_CSS=PATTERN_CELLS*PIXEL_CSS;
export const DIAGONAL_OVERSCAN_CELLS=PATTERN_CELLS/2;
export const NORMAL_SHIFT_CSS=DIAGONAL_OVERSCAN_CELLS*PIXEL_CSS;
export const stripeAt=(x,y,phase)=>((x+y+phase)%PATTERN_CELLS+PATTERN_CELLS)%PATTERN_CELLS<STRIPE_CELLS;
// Kept for independently testing periodicity; this function is NOT used for animation.
export const phaseFromSeconds=t=>((t%CYCLE_SECONDS)+CYCLE_SECONDS)%CYCLE_SECONDS*PATTERN_CELLS/CYCLE_SECONDS;

const canvas=document.getElementById('background');
if(!canvas)throw Error('Missing #background canvas');
const ctx=canvas.getContext('2d',{alpha:false});
if(!ctx)throw Error('Missing 2D context');
const CREAM=[255,245,230], BLUE=[169,186,233];
let logicalWidth=-1,logicalHeight=-1;
let redraws=0;

function drawOnceForSize(){
  const cols=Math.ceil(Math.max(1,window.innerWidth)/PIXEL_CSS)+DIAGONAL_OVERSCAN_CELLS;
  const rows=Math.ceil(Math.max(1,window.innerHeight)/PIXEL_CSS)+DIAGONAL_OVERSCAN_CELLS;
  if(cols===logicalWidth&&rows===logicalHeight)return;
  logicalWidth=cols;logicalHeight=rows;
  canvas.width=cols;
  canvas.height=rows;
  canvas.style.width=(cols*PIXEL_CSS)+'px';
  canvas.style.height=(rows*PIXEL_CSS)+'px';
  // Add half a pattern on the RIGHT and BOTTOM. One full period of x+y is
  // reached by moving half a period along each axis, normal to the stripes.
  ctx.imageSmoothingEnabled=false;
  const image=ctx.createImageData(cols,rows);
  const d=image.data;
  for(let y=0;y<rows;y++){
    for(let x=0;x<cols;x++){
      const c=stripeAt(x,y,0)?BLUE:CREAM;
      const i=(y*cols+x)*4;
      d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255;
    }
  }
  ctx.putImageData(image,0,0);
  redraws++;
}
drawOnceForSize();
window.addEventListener('resize',drawOnceForSize,{passive:true});
window.addEventListener('orientationchange',drawOnceForSize,{passive:true});
window.addEventListener('pageshow',drawOnceForSize,{passive:true});
// CSS keyframes run on the compositor, independent of JavaScript workloads.
// Pausing when hidden avoids unnecessary work and ensures no catch-up jump.
document.addEventListener('visibilitychange',()=>{
  canvas.style.animationPlayState=document.hidden?'paused':'running';
});
if(document.hidden)canvas.style.animationPlayState='paused';
// Live web version check: the Android shell is only a WebView. When GitHub
// Pages changes, reload the website even if the APK stays open in foreground.
const ACTIVE_BUILD='20261030-blue8s-diagonal2';
let checking=false;
async function checkPublishedVersion(){
  if(checking||document.hidden||navigator.onLine===false)return;
  checking=true;
  try{
    const response=await fetch('./?pw_version_check='+Date.now(),{cache:'no-store'});
    if(!response.ok)return;
    const html=await response.text();
    const match=html.match(/background\\.js\\?v=([A-Za-z0-9._-]+)/);
    if(match && match[1]!==ACTIVE_BUILD){
      location.replace('./?apk=1&fresh='+Date.now());
    }
  }catch(error){/* Offline: keep the already rendered background. */}
  finally{checking=false;}
}
window.addEventListener('focus',checkPublishedVersion);
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden)checkPublishedVersion();
});
setInterval(checkPublishedVersion,60000);

// Non-interactive test telemetry: never reads or changes the CSS animation.
window.__PAPERWORLD_BACKGROUND__=Object.freeze({
  version:'2026.10.30-blue8s-diagonal.1',
  get redraws(){return redraws},
  get dimensions(){return [logicalWidth,logicalHeight]},
  palette:PALETTE,
  periodCss:PERIOD_CSS,
  normalShiftCss:NORMAL_SHIFT_CSS
});
