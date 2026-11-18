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
// Stable, coordinate-locked fiber/grain: no animated glitter, random redraw,
// procedural gold borders, GPU shimmer or user art modification.
function hash2(x,y,salt=0){
 let v=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(salt+17,2246822519);
 v=Math.imul(v^(v>>>13),1274126177);
 return ((v^(v>>>16))>>>0)/4294967295;
}
function softNoise(x,y,size,salt){
 const gx=x/size,gy=y/size,ix=Math.floor(gx),iy=Math.floor(gy);
 const u=gx-ix,v=gy-iy;
 const sx=u*u*(3-2*u),sy=v*v*(3-2*v);
 const a=hash2(ix,iy,salt),b=hash2(ix+1,iy,salt);
 const c=hash2(ix,iy+1,salt),d=hash2(ix+1,iy+1,salt);
 return (a+(b-a)*sx)*(1-sy)+(c+(d-c)*sx)*sy;
}
function paperFiber(x,y,mode){
 // Short pulp fibers and two orthogonal softly embossed woven directions.
 // This spans the entire card, including otherwise flat dark burgundy areas.
 const a=hash2(x,y,mode==='back'?3:13)-.5;
 const b=softNoise(x,y,7,23)-.5;
 const threads=softNoise(x,Math.floor(y/5)*5,3,31)-.5;
 const fleck=(hash2(Math.floor(x/2),Math.floor(y/9),41)-.5);
 return a*.030+b*.065+threads*.037+fleck*.028+
  Math.sin(x*.83+y*.054)*.010+Math.sin(y*.78-x*.030)*.007;
}
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
 const normals=new Uint8Array(count*4),surface=new Uint8Array(count*4),
  pigment=new Uint8Array(count*4),paperGrain=new Float32Array(count);
 let goldPixels=0,normalPixels=0,minL=1,maxL=0;
 let paperNormalPixels=0,roughnessMinimum=1,roughnessMaximum=0;
 const roughSamples=[];
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
  const goldMix=gold[p];
  const fiber=paperFiber(x,y,mode);
  paperGrain[p]=fiber;
  heightMap[p]=local/weight+fiber*(mode==='back'?(1-goldMix*.65):.78);
 }
 const scale=mode==='back'?5.8:2.1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=y*width+x,i=p*4;
  const alpha=rgba[i+3];
  if(alpha<20){
   normals[i]=128;normals[i+1]=128;normals[i+2]=255;normals[i+3]=255;
   surface[i]=0;surface[i+1]=255;surface[i+2]=0;surface[i+3]=255;
   pigment[i]=rgba[i];pigment[i+1]=rgba[i+1];
   pigment[i+2]=rgba[i+2];pigment[i+3]=rgba[i+3];
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
  const m=gold[p],roughGrain=hash2(x,y,71)-.5,
   blotch=softNoise(x,y,17,89)-.5;
  // Cellulose has high, NONUNIFORM roughness; the entire surface scatters
  // reflections. Foil is smoother but still scratched/micro-embossed.
  // Dark burgundy paper never picks up metallic highlights.
  const printInk=clamp01((.7-lum[p])*.85);
  let rough=mode==='back'?
   (.925+.075*roughGrain+.07*blotch)*(1-m)+
   (.39+.08*roughGrain+.12*blotch)*m:
   .94-.075*printInk+.058*roughGrain+.066*blotch;
  // Tiny cut-paper edge wears matte, never a modeled gold border.
  const border=Math.min(x,y,width-1-x,height-1-y);
  if(border<4)rough+=.038*(1-border/4);
  rough=Math.max(.27,Math.min(.995,rough));
  if(Math.abs(nx)+Math.abs(ny)>.035&&m<.08)paperNormalPixels++;
  roughnessMinimum=Math.min(roughnessMinimum,rough);
  roughnessMaximum=Math.max(roughnessMaximum,rough);
  // Three.js: roughness is GREEN, metalness is BLUE, both linear.
  surface[i]=255;
  surface[i+1]=Math.round(255*rough);
  surface[i+2]=Math.round(255*m);
  surface[i+3]=255;
  // Paper is print, not glossy injection-molded plastic. Optical
  // micro-stippling exists across the WHOLE card; never paint new art.
  // A tiny pigment-opacity variation is applied only in the shader's
  // sampled albedo, original source PNG/WebP bytes stay untouched.
  const dither=hash2(x,y,141)-.5;
  const strength=(mode==='back'?.28:.17)*(1-m*.84);
  const shade=1+paperGrain[p]*strength+dither*(mode==='back'?.027:.015);
  for(let channel=0;channel<3;channel++){
   pigment[i+channel]=Math.max(0,Math.min(255,Math.round(rgba[i+channel]*shade)));
  }
  pigment[i+3]=alpha;
 }
 return {width,height,normals,surface,pigment,
  stats:{goldPixels,normalPixels,paperNormalPixels,totalPixels:count,
   roughnessMinimum,roughnessMaximum,
   minimumLuminance:minL,maximumLuminance:maxL,mode}};
}
