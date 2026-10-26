// Original GPTIMG sprite extracted from an authored pixel-art atlas.
// This image has no gameplay authority; the physical window/hitbox and
// host-authoritative customer state are still driven by kiosk-view/core.
export const GPTIMG_CUSTOMER=Object.freeze({
 tone:0,path:"assets/gptimg/customer-uncle.webp",width:96,height:113,
 moods:Object.freeze(["enter","idle"])
});
let portrait=null,loaded=false,failed=false;
export function gptimgAssetState(){return {loaded,failed,requested:portrait!==null};}
export function generatedCustomerEligible({tone=0,talking=false,receiving=false,refusing=false}={}){
 return tone===GPTIMG_CUSTOMER.tone&&!talking&&!receiving&&!refusing;
}
export function drawGeneratedCustomer(g,opts){
 if(!generatedCustomerEligible(opts)||typeof Image==="undefined")return false;
 if(!portrait&&!failed){
  portrait=new Image();
  portrait.onload=()=>{loaded=portrait.naturalWidth===96&&portrait.naturalHeight===113;failed=!loaded;};
  portrait.onerror=()=>{failed=true;};
  portrait.src=new URL("../"+GPTIMG_CUSTOMER.path,import.meta.url).href;
 }
 if(!loaded||!portrait)return false;
 const {x,y,w,h,phase=0}=opts;
 const drawH=Math.min(h*.95,w*.78*113/96),drawW=drawH*96/113;
 const dx=Math.round(x+(w-drawW)/2),dy=Math.round(y+h*.96-drawH+Math.sin(phase*.06)*1.1);
 g.save();g.imageSmoothingEnabled=false;
 g.drawImage(portrait,dx,dy,Math.max(1,Math.round(drawW)),Math.max(1,Math.round(drawH)));
 g.restore();
 return true;
}
