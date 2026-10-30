/* PAPERWORLD — the shop OWNER walks toward the player through a 2.5D rental foyer.
 * The small distant sprite is a subdued silhouette (distance cue, not a
 * near-camera flat gray fill). Final art stays the original exact four inks.
 * Breathing is VERTICAL, whole-sprite up/down by 1-2 integer pixels, period 3.6s.
 */
import {HOSTESS_PNG,HOSTESS_WIDTH,HOSTESS_HEIGHT} from './hostess-pixel.js';
import {drawOfficeBack,drawOfficeCounter,officeLayout} from './rental-office.js?v=20261031-office1';

export const SHOP_LINES=Object.freeze([
  '欢迎来到蓝铃街。第一次来这儿吧？',
  '想在城里住下的话，先填一张登记表，我帮你看看合适的地方。'
]);
const INK=[57,54,87],APPROACH_SECONDS=2.8,CHAR_PER_SEC=10;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
// PixelLab-grade four-ink transparent matte.
// IMPORTANT: never alpha-key EVERY dark-purple pixel; that destroys pupils,
// eyelashes, internal outlines, clothing folds, and buttons on the outfit.
// 1. Mark all truly non-background colored pixels.
// 2. Close one-pixel gaps in foreground contour (3x3 dilate then erode).
// 3. Flood-fill ONLY exterior background from image edges (4-connected).
// 4. Preserve every remaining dark-purple interior pixel in original palette.
export function computeExteriorMask(data,w,h){
 const len=w*h,barrier=new Uint8Array(len),dilated=new Uint8Array(len),closed=new Uint8Array(len);
 let originalInk=0,nonInk=0;
 for(let i=0;i<len;i++){
  const j=i*4;
  const ink=data[j]===INK[0]&&data[j+1]===INK[1]&&data[j+2]===INK[2];
  barrier[i]=ink?0:1;if(ink)originalInk++;else nonInk++;
 }
 // Morphological closing fills only temporary segmentation barriers. It never
 // paints over the original portrait; colors are copied unchanged below.
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const i=y*w+x;
  let any=0;
  for(let dy=-1;dy<=1&&!any;dy++)for(let dx=-1;dx<=1;dx++)
   if(barrier[i+dy*w+dx]){any=1;break}
  dilated[i]=any;
 }
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const i=y*w+x;
  let all=1;
  for(let dy=-1;dy<=1&&all;dy++)for(let dx=-1;dx<=1;dx++)
   if(!dilated[i+dy*w+dx]){all=0;break}
  closed[i]=all;
 }
 const exterior=new Uint8Array(len),queue=new Int32Array(len);
 let read=0,write=0;
 function seed(i){
  if(!closed[i]&&!exterior[i]){exterior[i]=1;queue[write++]=i}
 }
 for(let x=0;x<w;x++){seed(x);seed((h-1)*w+x)}
 for(let y=0;y<h;y++){seed(y*w);seed(y*w+w-1)}
 while(read<write){
  const i=queue[read++],x=i%w,y=(i/w)|0;
  if(x>0)seed(i-1);
  if(x<w-1)seed(i+1);
  if(y>0)seed(i-w);
  if(y<h-1)seed(i+w);
 }
 return exterior;
}
export function portraitLayers(image){
 const w=image.width,h=image.height;
 const base=document.createElement('canvas');base.width=w;base.height=h;
 const ctx=base.getContext('2d',{willReadFrequently:true});
 ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0);
 const pixels=ctx.getImageData(0,0,w,h);
 const outside=computeExteriorMask(pixels.data,w,h);
 const clean=document.createElement('canvas');clean.width=w;clean.height=h;
 const cc=clean.getContext('2d');const visible=cc.createImageData(w,h);
 const distant=document.createElement('canvas');distant.width=w;distant.height=h;
 const dc=distant.getContext('2d');const shadow=dc.createImageData(w,h);
 for(let i=0;i<outside.length;i++){
  if(outside[i])continue;
  const j=i*4;
  // Every face/eye/clothing pixel survives exactly (no recoloring or alpha blending).
  visible.data[j]=pixels.data[j];visible.data[j+1]=pixels.data[j+1];
  visible.data[j+2]=pixels.data[j+2];visible.data[j+3]=255;
  // Small distant image looks low contrast; still only official palette hues.
  shadow.data[j]=169;shadow.data[j+1]=186;shadow.data[j+2]=233;shadow.data[j+3]=255;
 }
 cc.putImageData(visible,0,0);dc.putImageData(shadow,0,0);
 return {clean,distant,outside};
}
export function createHostessIntro({COL,R,poly,text,root,onComplete,onBack}){
 const dialogue=root.querySelector('#pw-dialogue');
 const speech=root.querySelector('#pw-dialogue-speech');
 const status=root.querySelector('#pw-dialogue-status');
 const nextBtn=root.querySelector('#pw-dialogue-next');
 const backBtn=root.querySelector('#pw-dialogue-back');
 const img=new Image();img.decoding='sync';
 let art=null,far=null,loaded=false,failed=false,visible=false;
 img.onload=()=>{
  const built=portraitLayers(img);art=built.clean;far=built.distant;loaded=true;
 };
 img.onerror=()=>{failed=true};
 img.src=HOSTESS_PNG;
 let t=0,line=0,shown=0,completionSent=false;
 const length=()=>[...SHOP_LINES[line]].length;
 function enter(){
  t=0;line=0;shown=0;completionSent=false;visible=true;
  dialogue.classList.add('pw-off');refresh();
 }
 function leave(){visible=false;dialogue.classList.add('pw-off')}
 function complete(){
  if(completionSent)return;
  completionSent=true;dialogue.classList.add('pw-off');
  onComplete?.();
 }
 function next(){
  if(!visible)return 'hidden';
  if(t<APPROACH_SECONDS){t=APPROACH_SECONDS;refresh();return 'arrived'}
  if(shown<length()){shown=length();refresh();return 'reveal'}
  if(line+1<SHOP_LINES.length){line++;shown=0;refresh();return 'next'}
  complete();return 'registration';
 }
 function onTap(){return next(false)}
 function update(dt){
  if(!visible)return;
  t+=dt;
  if(t<APPROACH_SECONDS)return;
  // Deliberately NO auto next; only a user action advances dialogue.
  shown=Math.min(length(),shown+dt*CHAR_PER_SEC);
  refresh();
 }
 function refresh(){
  if(!visible||t<APPROACH_SECONDS){dialogue.classList.add('pw-off');return}
  dialogue.classList.remove('pw-off');
  speech.textContent=[...SHOP_LINES[line]].slice(0,Math.floor(shown)).join('');
  status.textContent=(line+1)+' / '+SHOP_LINES.length+' · '+(shown>=length()?'点击继续':'点击显示全文');
  nextBtn.textContent=line===SHOP_LINES.length-1&&shown>=length()?'填写资料 →':'继续 ›';
 }
 nextBtn.addEventListener('click',e=>{e.stopPropagation();next()});
 backBtn.addEventListener('click',e=>{e.stopPropagation();onBack?.()});
 dialogue.addEventListener('click',e=>{
  if(e.target.closest('button'))return;
  next();
 });
 // Rental office is a native editable scene, not a baked GPT illustration.
 function world(W,H){return drawOfficeBack({R,COL},W,H)}
 function geometry(W,H){
  const room=officeLayout(W,H),{wide,anchorX,anchorY}=room;
  // Portrait: one recognisable unaltered hostess behind a physical counter.
  // Landscape: keep the complete sprite left of the real native speech window.
  const goalHeight=Math.min(wide?H*.93:H*.75,wide?350:336,
    (W*(wide?.31:.98))*HOSTESS_HEIGHT/HOSTESS_WIDTH);
  const goalWidth=Math.round(goalHeight*HOSTESS_WIDTH/HOSTESS_HEIGHT);
  return {wide,goalHeight:Math.round(goalHeight),goalWidth,anchorX,anchorY};
 }
 function draw(ctx,W,H){
  world(W,H);
  if(!loaded){text(failed?'角色素材读取失败':'老板娘正在走近…',W/2,H*.42,15,COL.paper);drawOfficeCounter({R,COL},W,H);return}
  const g=geometry(W,H),p=smooth(t/APPROACH_SECONDS);
  // Distance is spatial, NOT just a gray fill: ~24% scale at vanishing point,
  // ~100% at the counter, with grounded feet and a walking step.
  const depth=.24+.76*p,sw=Math.max(1,Math.round(g.goalWidth*depth)),sh=Math.max(1,Math.round(g.goalHeight*depth));
  const perspectiveY=Math.round(g.anchorY-(1-p)*H*.27);
  const breathing=t>=APPROACH_SECONDS?Math.round(2*Math.sin((t-APPROACH_SECONDS)*Math.PI*2/3.6)):0;
  const walking=t<APPROACH_SECONDS?Math.round(Math.sin(t*14)*Math.min(2,2*(1-p))):0;
  const px=Math.round(g.anchorX-sw/2),py=Math.round(perspectiveY-sh+breathing+walking);
  ctx.imageSmoothingEnabled=false;
  // Far away silhouette becomes the actual fully-colored original before reaching us.
  const source=p<.36?far:art;
  ctx.drawImage(source,0,0,HOSTESS_WIDTH,HOSTESS_HEIGHT,px,py,sw,sh);
  // Correct occlusion: counter and physical register are always in front.
  drawOfficeCounter({R,COL},W,H);
 }
 function snapshot(){
  return {loaded,failed,visible,scene:'rental-office-v1',room:officeLayout(192,384).keys,
   phase:t<APPROACH_SECONDS?'approaching':'talk',
   progress:+smooth(t/APPROACH_SECONDS).toFixed(3),scale:+(.24+.76*smooth(t/APPROACH_SECONDS)).toFixed(3),
   elapsed:+t.toFixed(3),breathingY:t>=APPROACH_SECONDS?Math.round(2*Math.sin((t-APPROACH_SECONDS)*Math.PI*2/3.6)):0,
   line,shown:Math.floor(shown),full:length(),auto:false,dialogue:SHOP_LINES[line],
   portrait:[HOSTESS_WIDTH,HOSTESS_HEIGHT]};
 }
 return {enter,leave,draw,update,onTap,next,snapshot};
}
