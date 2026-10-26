// Real GPT-generated, individually cropped sprite assets committed to assets/anime.
// Runtime merely positions independent images. All interaction rules stay in kiosk-core.
const SRC={
 "window-open":"scene-window-open","window-closed":"scene-window-closed",
 "cabinetL-open":"scene-cabinet-left-open","cabinetL-closed":"scene-cabinet-left-closed",
 "cabinetR-open":"scene-cabinet-right-open","cabinetR-closed":"scene-cabinet-right-closed",
 "drawer-open":"scene-drawer-open","drawer-closed":"scene-drawer-closed",
 "shelf":"scene-shelf-tower","counter":"scene-countertop","mat":"scene-mat",
 "street":"scene-snow-street","lamp":"scene-lamp",
 "shelf-upgrade":"scene-upgrade-shelf","heater-upgrade":"scene-upgrade-heater",
 "girl":"customers-girl","man":"customers-man","woman":"customers-woman","child":"customers-child",
 "bread":"goods-bread","tea":"goods-tea","battery":"goods-battery","cocoa":"goods-cocoa"
};
const images=new Map();
export const ANIME_ART_KEYS=Object.freeze(Object.keys(SRC));
export function preloadAnimeArt(){
 if(typeof Image==="undefined")return;
 for(const [key,filename] of Object.entries(SRC)){
  if(images.has(key))continue;
  const img=new Image();
  const record={img,status:"loading",filename};
  images.set(key,record);
  img.onload=()=>{record.status="ready"};
  img.onerror=()=>{record.status="error";console.warn("Artwork unavailable:",filename)};
  img.src="./assets/anime/"+filename+".webp";
 }
}
export function drawAnime(g,key,x,y,w,h,options={}){
 const obj=images.get(key);
 if(!obj||obj.status!=="ready"||w<=0||h<=0)return false;
 const {img}=obj;
 const pad=options.padding||0;
 g.save();
 if(options.alpha!==undefined)g.globalAlpha=options.alpha;
 g.imageSmoothingEnabled=true;
 g.drawImage(img,Math.round(x-pad),Math.round(y-pad),Math.round(w+pad*2),Math.round(h+pad*2));
 g.restore();
 return true;
}
export function getAnimeArtStatus(){return Object.fromEntries([...images].map(([k,v])=>[k,v.status]));}
preloadAnimeArt();
