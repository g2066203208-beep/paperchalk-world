// PIXEL ATELIER — 4-colour technical study, NOT a learned model.
export const PALETTES={
 fogsakura:{name:'雾樱玻璃 / 工作室原创四色',colors:['#393657','#F2A5C2','#A9BAE9','#FFF5E6']},
 soot:{name:'夜灯灰阶 / 原创',colors:['#20232f','#50566a','#9d9c9c','#f0dcc4']},
 marine:{name:'夜港冷暖 / 原创',colors:['#152c39','#3d6170','#a18a79','#f6dcc2']}
};
export function hexToRGB(hex){if(typeof hex!=='string'||!/^#[0-9a-f]{6}$/i.test(hex))throw Error('必须提供六位HEX颜色');return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))}
export function analyzePixelData({data,width,height}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||data.length!==width*height*4)throw Error('RGBA尺寸不正确');
 const histogram=new Map();let semi=0,opaque=0,transparent=0;
 const alphaMask=new Uint8Array(width*height);
 for(let i=0;i<width*height;i++){
  const p=i*4,a=data[p+3];if(a===0){transparent++;continue}
  if(a!==255)semi++;else opaque++;
  const key='#'+[data[p],data[p+1],data[p+2]].map(x=>x.toString(16).padStart(2,'0')).join('');
  histogram.set(key,(histogram.get(key)||0)+1);alphaMask[i]=1;
 }
 let islands=0,smallIslands=0,visited=new Uint8Array(alphaMask.length);
 for(let i=0;i<alphaMask.length;i++){if(!alphaMask[i]||visited[i])continue;islands++;let count=0;const stack=[i];visited[i]=1;while(stack.length){const p=stack.pop(),x=p%width,y=(p/width)|0;count++;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){let a=x+dx,b=y+dy;if(a<0||b<0||a>=width||b>=height)continue;const j=b*width+a;if(alphaMask[j]&&!visited[j]){visited[j]=1;stack.push(j)}}}if(count<=2)smallIslands++}
 return {size:[width,height],colors:histogram.size,colorList:[...histogram].sort((a,b)=>b[1]-a[1]).slice(0,32).map(([hex,count])=>({hex,count})),opaque,semi,transparent,alphaBinary:semi===0,colorBudgetPass:histogram.size>0&&histogram.size<=4,connectedVisibleRegions:islands,tinyVisibleRegions:smallIslands,onePixelPerGridCell:true,handDrawnNativeVerified:false,visualArtApproved:false};
}
function near(rgb,palette){let k=0,m=Infinity;for(let i=0;i<palette.length;i++){const c=palette[i];const d=(rgb[0]-c[0])**2+(rgb[1]-c[1])**2+(rgb[2]-c[2])**2;if(d<m){m=d;k=i}}return k}
export function convertToFourColors({rgba,width,height,outWidth=96,outHeight=144,palette=PALETTES.fogsakura.colors}){
 if(![48,64,96,128,192,256].includes(outWidth)||![64,96,128,144,192,256,384].includes(outHeight)||width<1||height<1||width>4096||height>4096||rgba.length!==width*height*4)throw Error('无效图片或目标网格');
 if(!Array.isArray(palette)||palette.length!==4||new Set(palette.map(x=>x.toLowerCase())).size!==4)throw Error('调色板必须恰好四种不同颜色');
 const colors=palette.map(hexToRGB),out=new Uint8ClampedArray(outWidth*outHeight*4);
 // Compute exact overlap coverage of source cells by each target logical cell.
 // Alpha is binary and transparent pixels are excluded from color means.
 for(let y=0;y<outHeight;y++)for(let x=0;x<outWidth;x++){
  const x0=x*width/outWidth,x1=(x+1)*width/outWidth,y0=y*height/outHeight,y1=(y+1)*height/outHeight;
  let rs=0,gs=0,bs=0,ws=0,alphaCoverage=0;
  for(let sy=Math.floor(y0);sy<Math.ceil(y1);sy++)for(let sx=Math.floor(x0);sx<Math.ceil(x1);sx++){
   const aw=Math.max(0,Math.min(x1,sx+1)-Math.max(x0,sx))*Math.max(0,Math.min(y1,sy+1)-Math.max(y0,sy));if(!aw)continue;
   const i=(sy*width+sx)*4,a=rgba[i+3]/255;
   alphaCoverage+=aw*a;if(a===0)continue;
   const wt=aw*a;rs+=rgba[i]*wt;gs+=rgba[i+1]*wt;bs+=rgba[i+2]*wt;ws+=wt;
  }
  const d=(y*outWidth+x)*4,total=(x1-x0)*(y1-y0);
  if(ws>0&&alphaCoverage/total>=.5){const q=near([rs/ws,gs/ws,bs/ws],colors);out.set([...colors[q],255],d)}
  else out.set([0,0,0,0],d);
 }
 return {data:out,width:outWidth,height:outHeight,palette:[...palette],method:'area-resample-to-native-grid+nearest-4-color-no-dither',provenance:'converted-originality-unverified'};
}
export function originalExample(palette=PALETTES.fogsakura.colors){
const w=64,h=96,a=new Uint8ClampedArray(w*h*4),c=palette.map(hexToRGB);
const plot=(x,y,k)=>{if(x<0||y<0||x>=w||y>=h)return;a.set([...c[k],255],(y*w+x)*4)};
const blob=(cx,cy,rx,ry,k)=>{for(let y=Math.floor(cy-ry);y<=cy+ry;y++)for(let x=Math.floor(cx-rx);x<=cx+rx;x++){let t=(x-cx)*(x-cx)/(rx*rx)+(y-cy)*(y-cy)/(ry*ry);if(t<=1)plot(x,y,k)}};
const rect=(x,y,ww,hh,k)=>{for(let v=y;v<y+hh;v++)for(let u=x;u<x+ww;u++)plot(u,v,k)};
 // Explicitly original procedural demo: not the artist's work, not a copy of any source image.
 blob(32,26,21,24,0);blob(31,26,17,20,3);
 blob(26,19,17,13,0);blob(35,12,12,6,0);blob(15,31,8,16,0);blob(48,28,6,16,0);
 blob(22,22,6,4,1);blob(40,22,7,4,1);
 rect(22,30,6,2,0);rect(36,30,6,2,0);plot(24,30,2);plot(38,30,2);
 rect(31,35,2,5,1);rect(29,42,8,1,0);plot(34,42,1);
 rect(26,46,14,8,3);blob(32,79,28,32,0);blob(32,75,22,23,2);
 rect(27,55,10,19,3);rect(31,57,2,12,1);
 for(let y=62;y<84;y+=6){rect(15,y,9,2,0);rect(41,y,8,2,0)}
 return {data:a,width:w,height:h,palette:[...palette],method:'original-programmed-portrait-example',provenance:'original-software-exercise-not-TofuPxl-artwork'};
}
