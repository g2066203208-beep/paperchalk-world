/* PAPERWORLD — the shop OWNER walks toward the player through a 2.5D rental foyer.
 * The small distant sprite is a subdued silhouette (distance cue, not a
 * near-camera flat gray fill). Final art stays the original exact four inks.
 * Breathing is VERTICAL, whole-sprite up/down by 1-2 integer pixels, period 3.6s.
 */
import {HOSTESS_PNG,HOSTESS_WIDTH,HOSTESS_HEIGHT} from './hostess-pixel.js';

export const SHOP_LINES=Object.freeze([
  '我是这里的老板娘。你是来办理店铺租借的吧？',
  '请先创建角色，然后填写店铺名称、经营类型和租期。'
]);
const INK=[57,54,87],APPROACH_SECONDS=2.8,CHAR_PER_SEC=25,AUTO_PAUSE=1.35;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
function portraitLayers(image){
 const w=image.width,h=image.height;
 const base=document.createElement('canvas');base.width=w;base.height=h;
 const ctx=base.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0);
 const pixels=ctx.getImageData(0,0,w,h);
 const fg=new Uint8Array(w*h);
 for(let i=0;i<fg.length;i++){
  const j=i*4;fg[i]=(pixels.data[j]!==INK[0]||pixels.data[j+1]!==INK[1]||pixels.data[j+2]!==INK[2])?1:0;
 }
 // Include nearby ink outlines, but keep distant purple backdrop transparent.
 const near=new Uint8Array(fg.length);
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  if(!fg[y*w+x])continue;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)near[(y+dy)*w+x+dx]=1;
 }
 const clean=document.createElement('canvas');clean.width=w;clean.height=h;
 const cc=clean.getContext('2d');const visible=cc.createImageData(w,h);
 const distant=document.createElement('canvas');distant.width=w;distant.height=h;
 const dc=distant.getContext('2d');const shadow=dc.createImageData(w,h);
 for(let i=0;i<fg.length;i++){
  if(!near[i])continue;
  const j=i*4;
  for(let k=0;k<3;k++)visible.data[j+k]=pixels.data[j+k];
  visible.data[j+3]=255;
  // Only far away: misty low-detail single-color figure.
  shadow.data[j]=169;shadow.data[j+1]=186;shadow.data[j+2]=233;shadow.data[j+3]=255;
 }
 cc.putImageData(visible,0,0);dc.putImageData(shadow,0,0);
 return {clean,distant};
}
export function createHostessIntro({COL,R,poly,text,root,onComplete,onBack}){
 const dialogue=root.querySelector('#pw-dialogue');
 const speech=root.querySelector('#pw-dialogue-speech');
 const status=root.querySelector('#pw-dialogue-status');
 const autoBtn=root.querySelector('#pw-dialogue-auto');
 const nextBtn=root.querySelector('#pw-dialogue-next');
 const backBtn=root.querySelector('#pw-dialogue-back');
 const img=new Image();img.decoding='sync';
 let art=null,far=null,loaded=false,failed=false,visible=false;
 img.onload=()=>{
  const built=portraitLayers(img);art=built.clean;far=built.distant;loaded=true;
 };
 img.onerror=()=>{failed=true};
 img.src=HOSTESS_PNG;
 let t=0,line=0,shown=0,auto=true,dwell=0,completionSent=false;
 try{const saved=localStorage.getItem('paperworld-owner-auto-v1');if(saved!==null)auto=saved==='true'}catch{}
 const length=()=>[...SHOP_LINES[line]].length;
 function enter(){
  t=0;line=0;shown=0;dwell=0;completionSent=false;visible=true;
  dialogue.classList.add('pw-off');refresh();
 }
 function leave(){visible=false;dialogue.classList.add('pw-off')}
 function complete(){
  if(completionSent)return;
  completionSent=true;dialogue.classList.add('pw-off');
  onComplete?.();
 }
 function next(isAuto=false){
  if(!visible)return 'hidden';
  if(t<APPROACH_SECONDS){t=APPROACH_SECONDS;refresh();return 'arrived'}
  if(shown<length()){shown=length();dwell=0;refresh();return 'reveal'}
  if(line+1<SHOP_LINES.length){line++;shown=0;dwell=0;refresh();return 'next'}
  complete();return 'registration';
 }
 function onTap(){return next(false)}
 function update(dt){
  if(!visible)return;
  t+=dt;
  if(t<APPROACH_SECONDS)return;
  shown=Math.min(length(),shown+dt*CHAR_PER_SEC);
  if(shown>=length())dwell+=dt;else dwell=0;
  if(auto&&dwell>=AUTO_PAUSE)next(true);
  refresh();
 }
 function refresh(){
  if(!visible||t<APPROACH_SECONDS){dialogue.classList.add('pw-off');return}
  dialogue.classList.remove('pw-off');
  speech.textContent=[...SHOP_LINES[line]].slice(0,Math.floor(shown)).join('');
  status.textContent=(line+1)+' / '+SHOP_LINES.length+' · '+(shown>=length()?'下一句':'点击显示全文');
  nextBtn.textContent=line===SHOP_LINES.length-1&&shown>=length()?'办理租借 →':'继续 ›';
  autoBtn.textContent=auto?'自动：开':'自动：关';autoBtn.setAttribute('aria-pressed',String(auto));
 }
 nextBtn.addEventListener('click',e=>{e.stopPropagation();next()});
 backBtn.addEventListener('click',e=>{e.stopPropagation();onBack?.()});
 autoBtn.addEventListener('click',e=>{
  e.stopPropagation();auto=!auto;dwell=0;
  try{localStorage.setItem('paperworld-owner-auto-v1',String(auto))}catch{}
  refresh();
 });
 dialogue.addEventListener('click',e=>{
  if(e.target.closest('button'))return;
  next();
 });
 // Real 2.5D spatial composition: converging tiled floor and a rental counter.
 function world(W,H){
  R(0,0,W,H,COL.ink);
  const horizon=Math.round(H*.37),vx=Math.round(W*.50);
  poly([[0,horizon],[W,horizon],[W,H],[0,H]],COL.blue);
  // Mid-ground shop wall and counter in integer-pixel four-color blocks.
  R(0,Math.round(horizon*.10),W,4,COL.paper);
  R(0,horizon-3,W,3,COL.paper);
  const left=Math.round(W*.05),right=Math.round(W*.95);
  R(left,horizon-49,5,48,COL.paper);R(right-5,horizon-49,5,48,COL.paper);
  R(Math.round(W*.23),horizon-59,Math.round(W*.54),6,COL.paper);
  R(Math.round(W*.35),horizon-49,Math.round(W*.30),26,COL.ink);
  R(Math.round(W*.39),horizon-42,Math.round(W*.22),12,COL.pink);
  // Perspective floor plane: vanishing point at center.
  for(let i=-4;i<=4;i++){
   const bx=Math.round(W/2+i*W*.23);
   lineFloor(vx,horizon,bx,H,COL.paper);
  }
  for(const frac of [.16,.31,.53,.76,.94]){
   const z=frac*frac,y=Math.round(horizon+(H-horizon)*z);
   R(0,y,W,Math.max(1,Math.floor(z*3)),COL.ink);
  }
  // Two spatially staggered counter supports.
  const counterY=Math.round(H*.72);
  R(3,counterY,Math.round(W*.17),H-counterY,COL.ink);
  R(W-Math.round(W*.17)-3,counterY,Math.round(W*.17),H-counterY,COL.ink);
  R(3,counterY,Math.round(W*.17),3,COL.pink);
  R(W-Math.round(W*.17)-3,counterY,Math.round(W*.17),3,COL.pink);
 }
 function lineFloor(x1,y1,x2,y2,c){
  // Pixel staircase lines, no browser anti-aliasing.
  let dx=Math.abs(x2-x1),dy=-Math.abs(y2-y1),sx=x1<x2?1:-1,sy=y1<y2?1:-1,e=dx+dy;
  while(true){R(x1,y1,1,1,c);if(x1===x2&&y1===y2)break;const twice=2*e;
   if(twice>=dy){e+=dy;x1+=sx}if(twice<=dx){e+=dx;y1+=sy}
  }
 }
 function geometry(W,H){
  const wide=W/H>1.25;
  const goalHeight=Math.min(wide?H*.85:H*.66,wide?190:284);
  const goalWidth=Math.round(goalHeight*HOSTESS_WIDTH/HOSTESS_HEIGHT);
  const anchorX=Math.round(wide?W*.27:W*.50);
  const anchorY=Math.round(wide?H*.96:H*.73);
  return {wide,goalHeight:Math.round(goalHeight),goalWidth,anchorX,anchorY};
 }
 function draw(ctx,W,H){
  world(W,H);
  if(!loaded){text(failed?'角色素材读取失败':'老板娘正在走近…',W/2,H*.42,15,COL.paper);return}
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
 }
 function snapshot(){
  return {loaded,failed,visible,phase:t<APPROACH_SECONDS?'approaching':'talk',
   progress:+smooth(t/APPROACH_SECONDS).toFixed(3),scale:+(.24+.76*smooth(t/APPROACH_SECONDS)).toFixed(3),
   elapsed:+t.toFixed(3),breathingY:t>=APPROACH_SECONDS?Math.round(2*Math.sin((t-APPROACH_SECONDS)*Math.PI*2/3.6)):0,
   line,shown:Math.floor(shown),full:length(),auto,dialogue:SHOP_LINES[line],
   portrait:[HOSTESS_WIDTH,HOSTESS_HEIGHT]};
 }
 return {enter,leave,draw,update,onTap,next,snapshot};
}
