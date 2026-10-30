/* PAPERWORLD Pixel Atelier — integer indexed pixel-document engine.
 * 0 = transparent; 1..4 = the four official game inks.
 * No interpolation, smoothing, half-transparent paints or hidden fifth pigment.
 */
export const INKS=['#393657','#F2A5C2','#A9BAE9','#FFF5E6'];
export const MAX_DIM=512, MAX_LAYERS=16, MAX_FRAMES=24;
let sequence=0;
const id=()=>Date.now().toString(36)+'-'+(++sequence).toString(36);
export function createProject(width=64,height=64){
  checkSize(width,height);
  return {format:'paperworld-pixel-v1',width,height,palette:[...INKS],
    layers:[{id:id(),name:'底稿',visible:true}],
    frames:[{id:id(),cels:[Array(width*height).fill(0)]}],
    activeFrame:0,activeLayer:0};
}
function checkSize(w,h){if(!Number.isInteger(w)||!Number.isInteger(h)||w<8||h<8||w>MAX_DIM||h>MAX_DIM)throw Error('画布尺寸须为 8–512 的整数')}
export function validateProject(p){
 if(!p||p.format!=='paperworld-pixel-v1')throw Error('不是支持的 PAPERWORLD 像素工程');
 checkSize(p.width,p.height);
 if(!Array.isArray(p.layers)||p.layers.length<1||p.layers.length>MAX_LAYERS||
    !Array.isArray(p.frames)||p.frames.length<1||p.frames.length>MAX_FRAMES)throw Error('图层或动画帧数量超过限制');
 if(!Array.isArray(p.palette)||p.palette.length!==4||p.palette.some((v,i)=>v.toUpperCase()!==INKS[i]))throw Error('本游戏工程仅支持正式四色');
 for(const l of p.layers)if(typeof l.name!=='string'||l.name.length>60||typeof l.visible!=='boolean')throw Error('图层信息损坏');
 for(const f of p.frames){
  if(!Array.isArray(f.cels)||f.cels.length!==p.layers.length)throw Error('动画图层数量不匹配');
  for(const cel of f.cels)if(!Array.isArray(cel)||cel.length!==p.width*p.height||cel.some(c=>!Number.isInteger(c)||c<0||c>4))throw Error('发现不合法的像素颜色');
 }
 if(!Number.isInteger(p.activeFrame)||p.activeFrame<0||p.activeFrame>=p.frames.length||!Number.isInteger(p.activeLayer)||p.activeLayer<0||p.activeLayer>=p.layers.length)throw Error('活动图层或帧无效');
 return p;
}
export const cel=(p,frame=p.activeFrame,layer=p.activeLayer)=>p.frames[frame].cels[layer];
export const pixelIndex=(p,x,y)=>y*p.width+x;
export function putPixel(p,x,y,color,frame=p.activeFrame,layer=p.activeLayer){
 if(x<0||y<0||x>=p.width||y>=p.height||!Number.isInteger(x)||!Number.isInteger(y)||!Number.isInteger(color)||color<0||color>4)return false;
 const arr=cel(p,frame,layer),i=pixelIndex(p,x,y);if(arr[i]===color)return false;arr[i]=color;return true;
}
export function line(p,x0,y0,x1,y1,color,brush=1,mirror=false){
 x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
 let changed=false;
 const brushAt=(x,y)=>{
  const start=-Math.floor((brush-1)/2);
  for(let dy=0;dy<brush;dy++)for(let dx=0;dx<brush;dx++){
   const px=x+start+dx,py=y+start+dy;
   changed=putPixel(p,px,py,color)||changed;
   if(mirror)changed=putPixel(p,p.width-1-px,py,color)||changed;
  }
 };
 let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;
 // Avoid unbounded loops from hostile import/tools.
 if(dx>MAX_DIM*2||-dy>MAX_DIM*2)return false;
 for(;;){brushAt(x0,y0);if(x0===x1&&y0===y1)break;const e2=2*err;if(e2>=dy){err+=dy;x0+=sx}if(e2<=dx){err+=dx;y0+=sy}}
 return changed;
}
export function rect(p,x0,y0,x1,y1,color,filled=false){
 const a=Math.min(x0,x1),b=Math.max(x0,x1),c=Math.min(y0,y1),d=Math.max(y0,y1);
 let changed=false;
 for(let y=Math.max(0,c);y<=Math.min(p.height-1,d);y++)for(let x=Math.max(0,a);x<=Math.min(p.width-1,b);x++)
  if(filled||y===c||y===d||x===a||x===b)changed=putPixel(p,x,y,color)||changed;
 return changed;
}
export function ellipse(p,x0,y0,x1,y1,color,filled=false){
 const a=Math.min(x0,x1),b=Math.max(x0,x1),c=Math.min(y0,y1),d=Math.max(y0,y1);
 const rx=(b-a+1)/2,ry=(d-c+1)/2,cx=(a+b)/2,cy=(c+d)/2;
 const inside=(x,y)=>((x-cx)/rx)**2+((y-cy)/ry)**2<=1;
 let changed=false;
 for(let y=Math.max(0,c);y<=Math.min(p.height-1,d);y++)for(let x=Math.max(0,a);x<=Math.min(p.width-1,b);x++)
  if(inside(x,y)&&(filled||!inside(x-1,y)||!inside(x+1,y)||!inside(x,y-1)||!inside(x,y+1)))changed=putPixel(p,x,y,color)||changed;
 return changed;
}
export function floodFill(p,x,y,color){
 if(x<0||y<0||x>=p.width||y>=p.height)return false;
 const arr=cel(p),w=p.width,h=p.height,i=y*w+x,target=arr[i];
 if(target===color)return false;
 // Span-based flood fill; each painted point is enqueued once.
 const stack=[i];arr[i]=color;
 while(stack.length){
  const q=stack.pop(),px=q%w,py=(q/w)|0;
  if(px>0&&arr[q-1]===target){arr[q-1]=color;stack.push(q-1)}
  if(px<w-1&&arr[q+1]===target){arr[q+1]=color;stack.push(q+1)}
  if(py>0&&arr[q-w]===target){arr[q-w]=color;stack.push(q-w)}
  if(py<h-1&&arr[q+w]===target){arr[q+w]=color;stack.push(q+w)}
 }
 return true;
}
export function sample(p,x,y,merged=true){
 if(x<0||y<0||x>=p.width||y>=p.height)return 0;
 const idx=y*p.width+x;
 if(!merged)return cel(p)[idx];
 for(let i=p.layers.length-1;i>=0;i--)if(p.layers[i].visible&&cel(p,p.activeFrame,i)[idx])return cel(p,p.activeFrame,i)[idx];
 return 0;
}
export function composite(p,frame=p.activeFrame){
 const out=new Uint8Array(p.width*p.height);
 for(let l=0;l<p.layers.length;l++)if(p.layers[l].visible){
  const src=cel(p,frame,l);for(let i=0;i<out.length;i++)if(src[i])out[i]=src[i];
 }
 return out;
}
export function addLayer(p){
 if(p.layers.length>=MAX_LAYERS)throw Error('最多 16 层');
 const i=p.activeLayer+1;p.layers.splice(i,0,{id:id(),name:'图层 '+(p.layers.length+1),visible:true});
 for(const f of p.frames)f.cels.splice(i,0,Array(p.width*p.height).fill(0));p.activeLayer=i;
}
export function deleteLayer(p){
 if(p.layers.length===1)throw Error('至少保留一个图层');
 p.layers.splice(p.activeLayer,1);for(const f of p.frames)f.cels.splice(p.activeLayer,1);p.activeLayer=Math.max(0,p.activeLayer-1);
}
export function addFrame(p){
 if(p.frames.length>=MAX_FRAMES)throw Error('最多 24 帧');
 const f=p.frames[p.activeFrame];p.frames.splice(p.activeFrame+1,0,{id:id(),cels:f.cels.map(a=>a.slice())});p.activeFrame++;
}
export function deleteFrame(p){if(p.frames.length===1)throw Error('至少保留一帧');p.frames.splice(p.activeFrame,1);p.activeFrame=Math.max(0,p.activeFrame-1)}
export function selectionCopy(p,area){
 const x=Math.max(0,Math.min(area.x,p.width)),y=Math.max(0,Math.min(area.y,p.height));
 const w=Math.max(0,Math.min(area.w,p.width-x)),h=Math.max(0,Math.min(area.h,p.height-y));
 const src=cel(p),data=[];for(let j=0;j<h;j++)for(let i=0;i<w;i++)data.push(src[(y+j)*p.width+x+i]);
 return {width:w,height:h,data};
}
export function selectionErase(p,area){
 for(let y=Math.max(0,area.y);y<Math.min(p.height,area.y+area.h);y++)for(let x=Math.max(0,area.x);x<Math.min(p.width,area.x+area.w);x++)putPixel(p,x,y,0);
}
export function selectionPaste(p,clip,x,y){
 if(!clip||!Number.isInteger(clip.width)||!Number.isInteger(clip.height)||!Array.isArray(clip.data)||clip.data.length!==clip.width*clip.height||clip.width>MAX_DIM||clip.height>MAX_DIM)throw Error('剪贴区域无效');
 for(let j=0;j<clip.height;j++)for(let i=0;i<clip.width;i++)putPixel(p,x+i,y+j,clip.data[j*clip.width+i]);
}
export function resizeProject(p,w,h){
 checkSize(w,h);
 for(const f of p.frames)f.cels=f.cels.map(a=>{
   const next=Array(w*h).fill(0);for(let y=0;y<Math.min(h,p.height);y++)for(let x=0;x<Math.min(w,p.width);x++)next[y*w+x]=a[y*p.width+x];return next;
 });
 p.width=w;p.height=h;
}
export function quantizeRGBA(r,g,b,a){
 if(a<128)return 0;
 let best=1,score=Infinity;
 for(let i=0;i<INKS.length;i++){const hex=INKS[i],rr=parseInt(hex.slice(1,3),16),gg=parseInt(hex.slice(3,5),16),bb=parseInt(hex.slice(5,7),16);
  const d=(r-rr)**2*.30+(g-gg)**2*.59+(b-bb)**2*.11;if(d<score){best=i+1;score=d}}
 return best;
}
