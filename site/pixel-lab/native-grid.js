/* Shared native-grid microscope. Drawing is a separate inspection surface:
 * it never writes grid lines into any source/export PNG. */
export function mountNativeGrid({source, canvas, toggle, zoomInput, focusInput, output}) {
 if (!(source instanceof HTMLImageElement)) throw Error('A native image is required');
 if (source.naturalWidth !== 384 || source.naturalHeight !== 512) throw Error('Expected 384x512 native pixel source');
 const SIZE = 384, ctx = canvas.getContext('2d',{willReadFrequently:true});
 const samples = document.createElement('canvas');samples.width=384;samples.height=512;
 const sctx=samples.getContext('2d',{willReadFrequently:true});
 sctx.imageSmoothingEnabled=false;sctx.drawImage(source,0,0);
 const raw=sctx.getImageData(0,0,384,512).data;
 const regions={face:[173,112],hands:[271,243],clothing:[190,293],shoes:[221,463]};
 let zoom=Number(zoomInput.value)||12,center=regions[focusInput.value]||regions.face;
 let originX=0,originY=0,enabled=toggle.checked;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const pixelHex=(x,y)=>{
  const n=(y*384+x)*4;
  return '#'+[raw[n],raw[n+1],raw[n+2]].map(v=>v.toString(16).padStart(2,'0').toUpperCase()).join('');
 };
 function render(){
  const n=SIZE/zoom;
  if(!Number.isInteger(n))throw Error('Zoom must evenly divide inspection grid');
  originX=clamp(Math.round(center[0]-n/2),0,384-n);
  originY=clamp(Math.round(center[1]-n/2),0,512-n);
  ctx.imageSmoothingEnabled=false;
  ctx.clearRect(0,0,SIZE,SIZE);
  ctx.drawImage(source,originX,originY,n,n,0,0,SIZE,SIZE);
  if(enabled){
   ctx.beginPath();ctx.lineWidth=1;ctx.strokeStyle='rgba(255,255,255,.42)';
   for(let k=0;k<=n;k++){
    const p=clamp(k*zoom+.5,0,SIZE);
    ctx.moveTo(p,0);ctx.lineTo(p,SIZE);
    ctx.moveTo(0,p);ctx.lineTo(SIZE,p);
   }
   ctx.stroke();
   // Every eighth pixel is a stronger measuring line, still inspection only.
   ctx.beginPath();ctx.lineWidth=1;ctx.strokeStyle='rgba(255,255,255,.70)';
   for(let k=0;k<=n;k++){
    if((originX+k)%8===0){const p=k*zoom+.5;ctx.moveTo(p,0);ctx.lineTo(p,SIZE);}
    if((originY+k)%8===0){const p=k*zoom+.5;ctx.moveTo(0,p);ctx.lineTo(SIZE,p);}
   }
   ctx.stroke();
  }
  output.textContent='1格 = 原图1像素 · '+zoom+'× · 当前区域 x '+originX+'–'+(originX+n-1)+' / y '+originY+'–'+(originY+n-1);
 }
 function sampleAt(clientX,clientY){
  const rect=canvas.getBoundingClientRect();
  const px=Math.floor((clientX-rect.left)/rect.width*SIZE/zoom);
  const py=Math.floor((clientY-rect.top)/rect.height*SIZE/zoom);
  const x=clamp(originX+px,0,383),y=clamp(originY+py,0,511);
  const hex=pixelHex(x,y);
  output.textContent='像素 ('+x+', '+y+') = '+hex+' · 1格 = 原图1像素 · '+zoom+'×';
  return {x,y,hex};
 }
 let drag=null;
 canvas.addEventListener('pointerdown',event=>{drag={x:event.clientX,y:event.clientY,cx:center[0],cy:center[1],moved:false};canvas.setPointerCapture(event.pointerId);});
 canvas.addEventListener('pointermove',event=>{if(!drag)return;
  const rect=canvas.getBoundingClientRect(),dx=(event.clientX-drag.x)/rect.width*SIZE/zoom,dy=(event.clientY-drag.y)/rect.height*SIZE/zoom;
  if(Math.abs(dx)>0.5||Math.abs(dy)>0.5)drag.moved=true;
  center=[drag.cx-dx,drag.cy-dy];render();
 });
 canvas.addEventListener('pointerup',event=>{if(!drag)return;const moved=drag.moved;drag=null;if(!moved)sampleAt(event.clientX,event.clientY);});
 canvas.addEventListener('pointercancel',()=>{drag=null;});
 toggle.addEventListener('change',()=>{enabled=toggle.checked;render();});
 zoomInput.addEventListener('change',()=>{zoom=Number(zoomInput.value);render();});
 focusInput.addEventListener('change',()=>{center=regions[focusInput.value]||regions.face;render();});
 render();
 return {
  get gridVisible(){return enabled;},
  get zoom(){return zoom;},
  get sourceDimensions(){return [384,512];},
  get currentOrigin(){return [originX,originY];},
  sample:(x,y)=>pixelHex(clamp(x,0,383),clamp(y,0,511)),
  redraw:render
 };
}
