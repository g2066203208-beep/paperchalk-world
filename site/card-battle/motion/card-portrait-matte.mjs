/**
 * Remove only an image's BORDER-CONNECTED, nearly white studio background.
 * The painter's RGB source is immutable. Subject white gloves, face highlights,
 * hair, clothing and enclosed white shapes are never globally thresholded.
 * Clean the alpha fringe and extend subject RGB into transparent texels so
 * linear sampling/mipmaps cannot resurrect white halos.
 */
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
export function mattePortraitBackground(rgba,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<8||height<8||
  rgba?.length!==width*height*4)throw new Error('Invalid portrait RGBA');
 const total=width*height,out=new Uint8ClampedArray(rgba),bounds=[];
 const push=(x,y)=>{
  const i=(y*width+x)*4;
  if(rgba[i+3]<200)return;
  const r=rgba[i],g=rgba[i+1],b=rgba[i+2],min=Math.min(r,g,b),max=Math.max(r,g,b);
  if(min>=220&&max-min<=31)bounds.push([r,g,b]);
 };
 // Several independent samples: clothing can touch the edge, but the
 // prevailing canvas-paper color is estimated from pale BORDER samples.
 for(let j=0;j<17;j++){
  const x=Math.round(j*(width-1)/16);
  const y=Math.round(j*(height-1)/16);
  push(x,0);push(x,height-1);push(0,y);push(width-1,y);
 }
 if(bounds.length<9)return {pixels:out,stats:{
  detected:false,removed:0,feathered:0,padded:0,width,height}};
 const median=c=>bounds.map(x=>x[c]).sort((a,b)=>a-b)[Math.floor(bounds.length/2)];
 const bg=[median(0),median(1),median(2)];
 const luminosity=bg[0]*.2126+bg[1]*.7152+bg[2]*.0722;
 if(luminosity<222)return {pixels:out,stats:{
  detected:false,removed:0,feathered:0,padded:0,width,height}};
 const mask=new Uint8Array(total),queue=new Int32Array(total);
 let head=0,tail=0;
 const whiteLike=p=>{
  const i=p*4;
  if(rgba[i+3]<180)return false;
  const r=rgba[i],g=rgba[i+1],b=rgba[i+2];
  const min=Math.min(r,g,b),max=Math.max(r,g,b);
  return min>=216&&max-min<=33&&
   Math.max(Math.abs(r-bg[0]),Math.abs(g-bg[1]),Math.abs(b-bg[2]))<=45;
 };
 const enqueue=p=>{
  if(mask[p]||!whiteLike(p))return;
  mask[p]=1;queue[tail++]=p;
 };
 for(let x=0;x<width;x++){enqueue(x);enqueue((height-1)*width+x)}
 for(let y=0;y<height;y++){enqueue(y*width);enqueue(y*width+width-1)}
 while(head<tail){
  const p=queue[head++],x=p%width;
  if(x>0)enqueue(p-1);
  if(x<width-1)enqueue(p+1);
  if(p>=width)enqueue(p-width);
  if(p<total-width)enqueue(p+width);
 }
 // Do not modify deliberately light clothing or light-colored scenery
 // when the outside white area is only a tiny disconnected patch.
 if(tail<total*.06)return {pixels:new Uint8ClampedArray(rgba),stats:{
  detected:false,removed:0,feathered:0,padded:0,
  width,height,backgroundRgb:bg}};
 // Foreground arms, a cane and ribbons can form CLOSED HOLES in an
 // otherwise white studio background. These islands never touch the
 // picture border, so flood fill alone misses a large white rectangle.
 // Remove only LARGE, near-edge, same-white components; never white
 // shirt/glove/skin in the center of the character.
 const visited=new Uint8Array(total);
 let enclosedRemoved=0,enclosedIslands=0;
 for(let start=0;start<total;start++){
  if(mask[start]||visited[start]||!whiteLike(start))continue;
  let read=0,write=0,minX=width,maxX=-1,minY=height,maxY=-1;
  queue[write++]=start;visited[start]=1;
  while(read<write){
   const p=queue[read++],x=p%width,y=(p/width)|0;
   if(x<minX)minX=x;if(x>maxX)maxX=x;
   if(y<minY)minY=y;if(y>maxY)maxY=y;
   const next=[x>0?p-1:-1,x+1<width?p+1:-1,
    y>0?p-width:-1,y+1<height?p+width:-1];
   for(const q of next){
    if(q<0||visited[q]||mask[q]||!whiteLike(q))continue;
    visited[q]=1;queue[write++]=q;
   }
  }
  const large=write>Math.max(280,total*.0018);
  const sideGap=minX<width*.20||maxX>width*.80;
  const tall=(maxY-minY)>height*.095||write>total*.017;
  if(large&&sideGap&&tall){
   for(let j=0;j<write;j++)mask[queue[j]]=1;
   enclosedRemoved+=write;enclosedIslands++;
  }
 }
 // A small, pale edge transition is paper-scanner anti-alias, not a
 // deliberate white garment. Unmix white matting before compositing on red.
 let feathered=0;
 for(let p=0;p<total;p++){
  const i=p*4;
  if(mask[p]){out[i+3]=0;continue;}
  if(rgba[i+3]<16)continue;
  const x=p%width;
  const touching=(x>0&&mask[p-1])||(x<width-1&&mask[p+1])||
   (p>=width&&mask[p-width])||(p<total-width&&mask[p+width]);
  if(!touching)continue;
  const r=rgba[i],g=rgba[i+1],b=rgba[i+2],min=Math.min(r,g,b);
  if(min<185||Math.max(r,g,b)-min>60)continue;
  const delta=Math.max(Math.abs(r-bg[0]),Math.abs(g-bg[1]),Math.abs(b-bg[2]));
  if(delta>=87)continue;
  const coverage=clamp((delta-7)/74,.08,1);
  if(coverage>=.995)continue;
  out[i+3]=Math.min(out[i+3],Math.round(coverage*255));
  for(let channel=0;channel<3;channel++){
   const value=(rgba[i+channel]-(1-coverage)*bg[channel])/coverage;
   out[i+channel]=clamp(Math.round(value),0,255);
  }
  feathered++;
 }
 // Nearest foreground ink RGB expands into alpha=0 pixels. Alpha stays
 // exactly zero; this is ONLY bleed padding for trilinear filtering.
 const nearest=new Int32Array(total);
 nearest.fill(-1);
 for(let p=0;p<total;p++)if(out[p*4+3]>=200)nearest[p]=p;
 function sqdist(p,s){
  const dx=p%width-s%width,dy=Math.floor(p/width)-Math.floor(s/width);
  return dx*dx+dy*dy;
 }
 function accept(p,n){
  const a=nearest[p],b=nearest[n];
  if(b<0)return;
  if(a<0||sqdist(p,b)<sqdist(p,a))nearest[p]=b;
 }
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=y*width+x;
  if(x>0)accept(p,p-1);
  if(y>0)accept(p,p-width);
 }
 for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){
  const p=y*width+x;
  if(x<width-1)accept(p,p+1);
  if(y<height-1)accept(p,p+width);
 }
 let padded=0;
 for(let p=0;p<total;p++){
  const i=p*4,q=nearest[p];
  if(q<0||out[i+3]>=200)continue;
  const j=q*4;
  out[i]=out[j];out[i+1]=out[j+1];out[i+2]=out[j+2];padded++;
 }
 return {pixels:out,stats:{
  detected:tail>total*.06,removed:tail+enclosedRemoved,
  enclosedRemoved,enclosedIslands,feathered,padded,
  width,height,backgroundRgb:bg}};
}
