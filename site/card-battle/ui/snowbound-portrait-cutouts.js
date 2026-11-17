/* Non-destructive display-only alpha mattes for GitHub Anima source paintings.
 * Original 704x1024 PNG files stay byte-identical. Only flood-connected,
 * near-white canvas pixels become transparent in this battle view.
 * No external AI models, image hosts, network requests or permanent edits.
 */
(function(){
"use strict";
const cache=new Map();
function cutout(src,img){
 if(cache.has(src))return cache.get(src);
 const job=(async()=>{
  const w=img.naturalWidth,h=img.naturalHeight,n=w*h;
  if(!w||!h)throw Error("unloaded actor "+src);
  const cvs=document.createElement("canvas");cvs.width=w;cvs.height=h;
  const ctx=cvs.getContext("2d",{willReadFrequently:true});
  ctx.drawImage(img,0,0,w,h);
  const data=ctx.getImageData(0,0,w,h),px=data.data;
  let corners=0;
  for(const [x,y] of [[0,0],[w-1,0],[0,h-1],[w-1,h-1]]){
   if(px[(y*w+x)*4+3]<64)corners++;
  }
  if(corners>=3)return src; // already a true alpha cutout
  const seen=new Uint8Array(n),queue=new Uint32Array(n);
  let head=0,tail=0;
  const looksLikeCanvas=(index)=>{
   const k=index*4,r=px[k],g=px[k+1],b=px[k+2],a=px[k+3];
   return a>0&&r>=220&&g>=220&&b>=220&&
     Math.max(r,g,b)-Math.min(r,g,b)<=33;
  };
  const seed=(i)=>{
   if(!seen[i]&&looksLikeCanvas(i)){seen[i]=1;queue[tail++]=i;}
  };
  for(let x=0;x<w;x++){seed(x);seed((h-1)*w+x);}
  for(let y=1;y<h-1;y++){seed(y*w);seed(y*w+w-1);}
  while(head<tail){
   const i=queue[head++],x=i%w,y=(i-x)/w;
   if(x>0)seed(i-1);if(x<w-1)seed(i+1);
   if(y>0)seed(i-w);if(y<h-1)seed(i+w);
  }
  if(tail<n*.025)return src; // no reliable solid white background detected
  for(let k=0;k<tail;k++)px[queue[k]*4+3]=0;
  // One-pixel antialias: remove pale fringe only next to the proven outside.
  for(let k=0;k<tail;k++){
   const i=queue[k],x=i%w,y=(i-x)/w;
   for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1]){
    if(j<0||seen[j])continue;
    const off=j*4,R=px[off],G=px[off+1],B=px[off+2],lo=Math.min(R,G,B);
    if(lo>=185&&Math.max(R,G,B)-lo<48){
     px[off+3]=Math.min(px[off+3],Math.max(28,Math.round((243-lo)*3.5)));
    }
   }
  }
  ctx.putImageData(data,0,0);
  const blob=await new Promise((resolve,reject)=>cvs.toBlob(b=>b?resolve(b):reject(Error("alpha export failed")),"image/png"));
  return URL.createObjectURL(blob);
 })();
 cache.set(src,job);
 job.catch(()=>cache.delete(src));
 return job;
}
function hydrate(root){
 for(const img of root.querySelectorAll(".battle-scene.stage-actors .battle-unit .unit-art img")){
  if(img.dataset.cutoutPending||img.dataset.cutoutReady==="1")continue;
  img.dataset.cutoutPending="1";
  const src=img.src;
  img.dataset.originalArt=src;
  (async()=>{
   try{
    if(!img.complete||!img.naturalWidth)await new Promise((resolve,reject)=>{
     img.addEventListener("load",resolve,{once:true});
     img.addEventListener("error",reject,{once:true});
    });
    const transparent=await cutout(src,img);
    if(!img.isConnected)return;
    if(transparent!==src){img.src=transparent;await img.decode();}
    // The very same extracted alpha becomes a silhouette mask for original
    // snow bounce light + cool forest ambient shading. Do not put a tinted
    // rectangular CSS panel behind the actor or modify the source Anima PNG.
    const art=img.closest(".unit-art");
    if(art){
      art.style.setProperty("--actor-alpha-mask",'url("'+transparent.replace(/"/g,"%22")+'")');
      art.dataset.maskReady="1";
    }
    img.dataset.cutoutReady="1";
   }catch(err){
    console.warn("Anima transparent portrait fallback",err);
    img.dataset.cutoutReady="fallback";
   }finally{delete img.dataset.cutoutPending;}
  })();
 }
}
window.PaperchalkSnowboundCutouts=Object.freeze({hydrate});
})();