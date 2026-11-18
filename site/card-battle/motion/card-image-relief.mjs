/**
 * Color-aware, image-derived 2.5D card relief.
 *
 * Actual artwork stays a PLANE: only shading normals + foil response change.
 * Pixels: canvas RGBA in top-left raster order. Normal RGB: tangent space.
 * Metallic uses the BLUE channel and roughness GREEN per Three.js PBR.
 * No fake raised border meshes, displacement, geometry extrusion or portrait redraw.
 *
 * A bright warm gold needs both red/yellow separation and enough green; a
 * burgundy paper pixel (high red, low green) MUST NOT become metal.
 */
const clamp01=x=>Math.max(0,Math.min(1,x));
export function goldInkWeight(r,g,b,a=255){
 if(a<20)return 0;
 const yellow=clamp01((g-b-7)/27);
 const light=clamp01((g-65)/72);
 const warmth=clamp01((r-g+3)/23);
 return yellow*light*warmth*(a/255);
}
export function deriveCardRelief(rgba,width,height,mode='back'){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<3||height<3||
  width*height>3000000||rgba.length!==width*height*4)
  throw new Error('Invalid image pixels for card relief');
 if(mode!=='back'&&mode!=='portrait')throw new Error('Unknown card relief mode');
 const count=width*height,lum=new Float32Array(count),
  gold=new Float32Array(count),heightMap=new Float32Array(count);
 const normals=new Uint8Array(count*4),surface=new Uint8Array(count*4);
 let goldPixels=0,normalPixels=0,minL=1,maxL=0;
 for(let p=0;p<count;p++){
  const i=p*4,r=rgba[i],g=rgba[i+1],b=rgba[i+2],a=rgba[i+3];
  const value=(.2126*r+.7152*g+.0722*b)/255;
  const metal=mode==='back'?goldInkWeight(r,g,b,a):0;
  lum[p]=value;
  gold[p]=metal;
  if(a>40){minL=Math.min(minL,value);maxL=Math.max(maxL,value);}
  if(metal>.48)goldPixels++;
 }
 const sample=(arr,x,y)=>arr[Math.max(0,Math.min(height-1,y))*width+
  Math.max(0,Math.min(width-1,x))];
 // Image colors indicate plausible relief, not true reconstructible depth.
 // Smooth the height before a central gradient to suppress WebP block noise.
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=y*width+x,i=p*4;
  if(rgba[i+3]<20){heightMap[p]=0;continue;}
  let local=0,weight=0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const w=dx===0&&dy===0?4:(dx===0||dy===0?2:1);
   const sx=Math.max(0,Math.min(width-1,x+dx));
   const sy=Math.max(0,Math.min(height-1,y+dy));
   const k=sy*width+sx;
   // Back: gold/engraving is raised, burgundy has quiet paper grain.
   // Portrait: gentle fold/outline normals, never make a relief statue.
   const h=mode==='back'?
    gold[k]*.91+lum[k]*.065:
    lum[k]*.42+(Math.max(rgba[k*4],rgba[k*4+1],rgba[k*4+2])-
     Math.min(rgba[k*4],rgba[k*4+1],rgba[k*4+2]))/255*.085;
   local+=h*w;weight+=w;
  }
  heightMap[p]=local/weight;
 }
 const scale=mode==='back'?5.8:2.1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=y*width+x,i=p*4;
  const alpha=rgba[i+3];
  if(alpha<20){
   normals[i]=128;normals[i+1]=128;normals[i+2]=255;normals[i+3]=255;
   surface[i]=0;surface[i+1]=255;surface[i+2]=0;surface[i+3]=255;
   continue;
  }
  // Central gradient in bitmap coordinates (Y down); the normal-map
  // texture is flipY=true, so the tangent Y component uses +dH/dY.
  const dx=(sample(heightMap,x+1,y)-sample(heightMap,x-1,y))*.5;
  const dy=(sample(heightMap,x,y+1)-sample(heightMap,x,y-1))*.5;
  let nx=-dx*scale,ny=dy*scale,nz=1;
  const inv=1/Math.sqrt(nx*nx+ny*ny+nz*nz);
  nx*=inv;ny*=inv;nz*=inv;
  normals[i]=Math.round((nx*.5+.5)*255);
  normals[i+1]=Math.round((ny*.5+.5)*255);
  normals[i+2]=Math.round((nz*.5+.5)*255);
  normals[i+3]=255;
  if(Math.abs(nx)+Math.abs(ny)>.035)normalPixels++;
  const m=gold[p];
  // Three.js: roughness is GREEN, metalness is BLUE, both linear.
  const rough=mode==='back'?.82-.55*m:.83;
  surface[i]=255;
  surface[i+1]=Math.round(255*rough);
  surface[i+2]=Math.round(255*m);
  surface[i+3]=255;
 }
 return {width,height,normals,surface,
  stats:{goldPixels,normalPixels,totalPixels:count,minimumLuminance:minL,
   maximumLuminance:maxL,mode}};
}
