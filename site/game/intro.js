/* PAPERWORLD · 看板娘 chapter-one guide.
 * Uses the player's supplied illustration, palette-quantized to the four
 * exact game colors and embedded as a compact indexed PNG.
 * Silhouette is a temporary gray stage effect only.
 * Sprite animation: discreet integer-pixel torso-row offsets, NO CSS scale,
 * antialiasing, tweened color blending, image generation, or warped face.
 */
import {HOSTESS_PNG,HOSTESS_WIDTH,HOSTESS_HEIGHT} from './hostess-pixel.js';

export const GUIDE_LINES=Object.freeze([
  '你好呀！欢迎来到 PAPERWORLD。',
  '我是这里的看板娘。接下来，就由我陪你认识这个世界。',
  '这里的一切，都用四种颜色一点点绘成。',
  '你可以点击画面，或打开自动播放，让我继续讲下去。',
  '故事还在慢慢展开。准备好了吗？我们的旅程就要开始啦！'
]);
const GREY='#888888';
const SILHOUETTE_END=.88,REVEAL_END=1.85;
const INK=[57,54,87];
const n=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=n(t,0,1);return t*t*(3-2*t)};
function buildMask(image){
  const w=image.width,h=image.height;
  const temp=document.createElement('canvas');temp.width=w;temp.height=h;
  const t=temp.getContext('2d',{willReadFrequently:true});t.imageSmoothingEnabled=false;t.drawImage(image,0,0);
  const bytes=t.getImageData(0,0,w,h).data;
  const a=new Uint8Array(w*h);
  // Separate the silhouette from the true-purple screenshot background.
  for(let i=0;i<a.length;i++){
    const j=i*4;a[i]=(bytes[j]===INK[0]&&bytes[j+1]===INK[1]&&bytes[j+2]===INK[2])?0:1;
  }
  // A one-pixel dilation restores dark contour pixels lost during background removal.
  const outer=new Uint8Array(a.length);
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    const i=y*w+x;if(a[i])for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)outer[i+dy*w+dx]=1;
  }
  // Only fill holes NOT connected to the backdrop. Dark gaps between limbs remain open.
  const visited=new Uint8Array(a.length),queue=new Int32Array(a.length);
  let head=0,tail=0;
  function seed(i){if(!outer[i]&&!visited[i]){visited[i]=1;queue[tail++]=i}}
  for(let x=0;x<w;x++){seed(x);seed((h-1)*w+x)}
  for(let y=0;y<h;y++){seed(y*w);seed(y*w+w-1)}
  while(head<tail){
    const i=queue[head++],x=i%w,y=Math.floor(i/w);
    if(x>0)seed(i-1);if(x<w-1)seed(i+1);
    if(y>0)seed(i-w);if(y<h-1)seed(i+w);
  }
  const mask=document.createElement('canvas');mask.width=w;mask.height=h;
  const c=mask.getContext('2d');const out=c.createImageData(w,h);
  for(let i=0;i<outer.length;i++){
    if(!outer[i]&&visited[i])continue;
    const p=i*4;out.data[p]=136;out.data[p+1]=136;out.data[p+2]=136;out.data[p+3]=255;
  }
  c.putImageData(out,0,0);return mask;
}
function makeSizeCanvas(source,w,h){
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 ctx.drawImage(source,0,0,w,h);
 return canvas;
}
export function createHostessIntro({COL,R,frame,text,latin,glyphBitmap}){
  const original=new Image();original.decoding='sync';
  let artwork=null,mask=null,landArtwork=null,landMask=null,loaded=false,failed=false;
  original.onload=()=>{
    artwork=original;mask=buildMask(original);
    landArtwork=makeSizeCanvas(original,144,192);
    landMask=makeSizeCanvas(mask,144,192);
    loaded=true;
  };
  original.onerror=()=>{failed=true};
  original.src=HOSTESS_PNG;
  let time=0,dialogue=0,shown=0,auto=true,wait=0,finished=false,characters=0;
  try{const v=localStorage.getItem('paperworld-guide-auto-v1');if(v!==null)auto=v==='true'}catch{}
  const saveAuto=()=>{try{localStorage.setItem('paperworld-guide-auto-v1',String(auto))}catch{}};
  const total=()=>[...GUIDE_LINES[dialogue]].length;
  const isTalk=()=>time>=REVEAL_END;
  const available=()=>loaded&&!failed;
  function enter(){time=0;dialogue=0;shown=0;wait=0;finished=false;}
  function geometry(W,H){
    const landscape=W/H>1.25;
    if(landscape){
      const portraitSize=[144,192],x=Math.round(W*.27-portraitSize[0]/2),y=Math.round((H-portraitSize[1])/2);
      return {landscape,x,y,pw:144,ph:192,box:{x:Math.round(W*.49),y:12,w:Math.round(W*.49-8),h:H-24}};
    }
    const x=Math.round((W-HOSTESS_WIDTH)/2),y=Math.max(0,Math.min(12,Math.floor((H-256-133)/2)));
    return {landscape,x,y,pw:192,ph:256,box:{x:9,y:H-139,w:W-18,h:130}};
  }
  function renderedSource(g,chooseMask){
    return g.landscape?(chooseMask?landMask:landArtwork):(chooseMask?mask:artwork);
  }
  function breatheSprite(ctx,image,g,t,howMuch=1,revealFraction=1){
    if(!image)return;
    const w=image.width,h=image.height;
    const start=Math.round(h*.36),end=Math.round(h*.69);
    const reveal=n(Math.floor(w*revealFraction/2)*2,0,w);
    if(reveal<1)return;
    ctx.imageSmoothingEnabled=false;
    // One-time exact 4-color raster remains the source. Head and eyes are stable.
    // Torso has a <=1 source-pixel row-offset during a 3.8s breathing cycle.
    ctx.drawImage(image,0,0,reveal,start,g.x,g.y,reveal,start);
    const phase=(Math.sin(t*Math.PI*2/3.8)+1)/2;
    for(let y=start;y<end;y+=4){
      const hh=Math.min(4,end-y),weight=Math.sin(Math.PI*(y-start)/(end-start));
      const offset=howMuch&&phase*.95*weight>.58?1:0;
      ctx.drawImage(image,0,y,reveal,hh,g.x+offset,g.y+y,reveal,hh);
    }
    ctx.drawImage(image,0,end,reveal,h-end,g.x,g.y+end,reveal,h-end);
  }
  function wrapSentence(sentence,maxWidth,size){
    const chars=[...sentence],lines=[];let current='';
    for(const ch of chars){
      if(glyphBitmap(current+ch,size).w>maxWidth&&current){lines.push(current);current=''}
      current+=ch;
    }
    if(current)lines.push(current);
    return lines;
  }
  function boxText(W,H,g){
    const b=g.box;
    R(b.x+2,b.y+4,b.w,b.h,COL.blue);
    frame(b.x,b.y,b.w,b.h,COL.ink,COL.paper,5,2);
    // Tiny pixel dialogue tail, only a handful of squares.
    if(!g.landscape){R(b.x+18,b.y-4,8,6,COL.ink);R(b.x+20,b.y-4,6,5,COL.paper)}
    const tagY=g.landscape?b.y+6:b.y-15;
    frame(b.x+10,tagY,72,24,COL.ink,COL.pink,4,2);
    text('看板娘',b.x+46,tagY+6,13,COL.ink);
    const autoX=b.x+b.w-56,autoY=b.y+9;
    frame(autoX,autoY,46,21,COL.ink,auto?COL.pink:COL.paper,3,2);
    text(auto?'自动 开':'自动 关',autoX+23,autoY+5,11,COL.ink);
    const font=13,lineHeight=19,startY=b.y+37;
    const max=b.w-26,wrapped=wrapSentence(GUIDE_LINES[dialogue],max,font);
    let remaining=Math.min(shown,total());
    for(let i=0;i<wrapped.length&&i<4;i++){
      const segment=[...wrapped[i]],part=segment.slice(0,remaining).join('');
      if(part)text(part,b.x+12,startY+i*lineHeight,font,COL.ink,'left');
      remaining-=segment.length;
    }
    if(shown>=total()){
      const arrowX=b.x+b.w-15,arrowY=b.y+b.h-13;
      R(arrowX-2,arrowY-2,4,4,COL.ink);
      R(arrowX+2,arrowY,3,3,COL.ink);
    }
    // Short progress indicator, no sparkle/ambient noise.
    for(let i=0;i<GUIDE_LINES.length;i++)R(b.x+11+i*8,b.y+b.h-10,5,3,i===dialogue?COL.pink:COL.blue);
  }
  function update(dt){
    time+=dt;
    if(!isTalk()||failed)return;
    if(!finished){
      shown=Math.min(total(),shown+dt*19);
      if(shown>=total())wait+=dt;
      else wait=0;
      if(auto&&wait>=1.55)next(true);
    }
  }
  function next(fromAuto=false){
    if(!isTalk()){time=REVEAL_END;return 'skip-intro'}
    if(shown<total()){shown=total();wait=0;return 'reveal-text'}
    if(dialogue+1<GUIDE_LINES.length){dialogue++;shown=0;wait=0;return 'next-line'}
    if(!fromAuto){finished=true;shown=total();return 'finished'}
    // Never auto-exit the final tutorial panel.
    return 'last-line';
  }
  function onTap(x,y,W,H){
    const g=geometry(W,H),b=g.box;
    const autoX=b.x+b.w-56,autoY=b.y+9;
    if(isTalk()&&x>=autoX&&x<=autoX+46&&y>=autoY&&y<=autoY+21){
      auto=!auto;wait=0;saveAuto();return 'toggle-auto';
    }
    return next();
  }
  function draw(ctx,W,H,clock){
    R(0,0,W,H,COL.ink);
    const g=geometry(W,H);
    if(!available()){
      if(failed){text('看板娘图片加载失败',W/2,H/2-8,15,COL.paper);}
      else text('看板娘正在登场…',W/2,H/2-8,14,COL.paper);
      return;
    }
    const isMask=time<SILHOUETTE_END;
    const source=renderedSource(g,isMask);
    if(isMask){
      breatheSprite(ctx,source,g,0,0,1);
    }else if(time<REVEAL_END){
      breatheSprite(ctx,renderedSource(g,true),g,0,0,1);
      const reveal=smooth((time-SILHOUETTE_END)/(REVEAL_END-SILHOUETTE_END));
      breatheSprite(ctx,renderedSource(g,false),g,0,0,reveal);
    }else{
      breatheSprite(ctx,source,g,time,1,1);
      boxText(W,H,g);
    }
  }
  function snapshot(){
    return {loaded,failed,phase:time<SILHOUETTE_END?'silhouette':time<REVEAL_END?'reveal':'talk',
      elapsed:+time.toFixed(3),line:dialogue,shown:Math.floor(shown),full:total(),auto,finished,
      palette:['#393657','#F2A5C2','#A9BAE9','#FFF5E6'],
      portrait:[HOSTESS_WIDTH,HOSTESS_HEIGHT]};
  }
  return {enter,draw,update,onTap,snapshot,geometry};
}
