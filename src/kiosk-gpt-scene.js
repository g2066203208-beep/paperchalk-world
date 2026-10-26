// GPTIMG scene atlas: independent physical zones, not a full-page mockup.
// All shop commands and authoritative state remain in kiosk-core and kiosk-app.
import {GOODS,visitor,slotRoom,shelfUpgradeCost,heatingUpgradeCost} from "./kiosk-core.js";
let img=null,load="idle";
export function generatedArtStatus(){return load;}
export function preloadGeneratedArt(){
 if(img||typeof Image==="undefined")return;
 img=new Image();load="loading";
 img.onload=()=>{load=img.naturalWidth===941&&img.naturalHeight===1672?"ready":"error";};
 img.onerror=()=>{load="error";};
 img.src=new URL("../assets/gptimg/winter-kiosk-source.png",import.meta.url).href;
}
preloadGeneratedArt();
const p=(g,sx,sy,sw,sh,x,y,w,h)=>{if(w>0&&h>0)g.drawImage(img,sx,sy,sw,sh,x,y,w,h)};
const f=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
const hit=(a,x,y,w,h,cmd,key)=>a.push({x,y,w,h,cmd,key});
function word(g,s,x,y,size=13,color="#F9F7F4"){
 g.fillStyle=color;g.font="700 "+size+"px system-ui, Noto Sans CJK SC, sans-serif";
 g.textAlign="center";g.textBaseline="middle";g.fillText(String(s),x,y);
}
function box(g,x,y,w,h,open,src){
 if(open){
  f(g,x,y,w,h,"#293B62");
  p(g,70,340,158,163,x+5,y+5,w-10,h*.68);
  f(g,x,y+h*.81,w,h*.19,"#DCE5F0");
 }else p(g,...src,x,y,w,h);
}
const crops={tea:[799,711,118,153],bread:[769,334,168,174],battery:[326,1275,149,119],cocoa:[403,408,151,131]};
const good=(g,sku,x,y,w,h)=>p(g,...(crops[sku]||crops.tea),x,y,w,h);
function cabinet(g,hits,s,key,x,y,w,h,src){
 const open=!!s.open[key];box(g,x,y,w,h,open,src);
 if(open){
  const e=s.slots[key];if(e?.qty)good(g,e.sku,x+w*.37,y+h*.26,w*.24,h*.42);
  hit(hits,x+5,y+5,w-10,h*.75,"slot",key);
  hit(hits,x,y+h*.76,w,h*.24,"toggle",key);
 }else hit(hits,x,y,w,h,"toggle",key);
}
function shelf(g,hits,s,key,x,y,w,h,src){
 p(g,...src,x,y,w,h);
 const e=s.slots[key],n=Math.min(e?.qty||0,3);
 for(let i=0;i<n;i++){const iw=Math.min(28,w/(n+2));
   good(g,e.sku,x+(i+1)*w/(n+1)-iw*.5,y+h*.24,iw,h*.50);}
 f(g,x+w-41,y+h-20,39,18,"#233354");
 word(g,(e?.qty||0)+"/"+slotRoom(key,e?.sku||"tea",s),x+w-21,y+h-11,10);
 hit(hits,x,y,w,h,"slot",key);
}
function drawer(g,hits,s,key,x,y,w,h,src){
 const open=!!s.open[key];box(g,x,y,w,h,open,src);
 if(open){
  const e=s.slots[key];if(e?.qty)good(g,e.sku,x+w*.36,y+3,w*.28,h*.48);
  hit(hits,x+4,y+3,w-8,h*.63,"slot",key);
  hit(hits,x,y+h*.69,w,h*.31,"toggle",key);
 }else hit(hits,x,y,w,h,"toggle",key);
}
function customer(g,x,y,w,h,motion,phase){
 if(motion&&!motion.visible)return;
 g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
 const shift=(motion?.offset||0)*w*.92,down=(motion?.drop||0)*h;
 // Respect the original sprite aspect ratio in both phone orientations.
 // A 375x430 guest must never become a flattened 16:9 sticker.
 const scale=Math.min(w/375,h/430);
 g.translate(x+(w-375*scale)/2+shift,y+h-430*scale+down+Math.sin(phase*.035)*1.3);
 g.scale(scale,scale);
 // Alpha-shaped cutout extracted at draw time from the GPT source illustration.
 g.beginPath();
 const pts=[[145,9],[197,2],[255,14],[302,40],[328,82],[329,137],[314,164],[335,219],[356,285],[372,429],[0,429],[14,325],[36,250],[48,204],[40,154],[51,104],[77,62],[110,25]];
 g.moveTo(...pts[0]);for(const t of pts.slice(1))g.lineTo(...t);g.closePath();g.clip();
 g.drawImage(img,290,554,375,430,0,0,375,430);
 g.restore();
}
function window(g,hits,s,x,y,w,h,motion,phase){
 // Snow landscape independent of movable customer.
 p(g,270,300,424,244,x,y,w,h);
 const shift=Math.sin(phase*.014)*2;
 p(g,295,390,120,230,x+shift,y+h*.38,w*.24,h*.62);
 p(g,570,345,120,250,x+w*.72-shift,y+h*.27,w*.28,h*.73);
 if(s.windowOpen){
  customer(g,x+w*.07,y+h*.19,w*.86,h*.80,motion,phase);
  // Separate frame strips preserve transparent opening and actual latch.
  p(g,217,160,52,828,x-15,y-18,18,h+38);
  p(g,682,160,43,828,x+w-2,y-18,18,h+38);
  p(g,250,165,432,118,x-5,y-21,w+10,30);
  p(g,241,981,453,73,x-6,y+h-11,w+12,25);
 }else{
  f(g,x,y,w,h,"#DDE6F2");
  p(g,10,125,220,180,x+6,y+7,w-12,h-14);
  f(g,x,y,w,8,"#283758");
  f(g,x,y+h-10,w,12,"#F1A44A");
 }
 f(g,x+w*.46,y+h+4,w*.10,7,"#E7ECF6");
 hit(hits,x+w*.17,y+h-25,w*.66,70,"window");
 if(s.windowOpen&&(!motion||motion.stage==="idle"))
  hit(hits,x+w*.13,y+h*.25,w*.74,h*.59,"talk");
}
function badge(g,hits,s,key,x,y,w,h){
 const cost=key==="upgrade"?shelfUpgradeCost(s):heatingUpgradeCost(s);
 f(g,x,y,w,h,"#344B74");f(g,x,y,w,4,"#F3A33E");
 word(g,key==="upgrade"?"扩架":"保温",x+w/2,y+h*.37,12);
 word(g,cost===null?"完成":"¥"+cost,x+w/2,y+h*.75,10,"#F4C27F");
 if(cost!==null)hit(hits,x,y,w,h,key);
}
export function renderGeneratedShop(g,hits,s,x,y,w,h,phase,motion,itemMotion,isManager){
 if(load!=="ready")return false;
 g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.imageSmoothingEnabled=true;
 f(g,x,y,w,h,"#2D4269");
 // Game scene is composed of 3 background regions, independent fixtures,
 // a window-scoped guest, a foreground worktop, and independent touch targets.
 p(g,0,127,235,875,x,y,w*.25,h*.80);
 p(g,705,127,236,875,x+w*.75,y,w*.25,h*.80);
 const top=y+h*.256,sh=h*.132;
 cabinet(g,hits,s,"cabinetL",x+w*.01,y+h*.025,w*.235,h*.18,[0,130,228,198]);
 cabinet(g,hits,s,"cabinetR",x+w*.755,y+h*.025,w*.235,h*.18,[708,125,231,202]);
 for(let k=0;k<3;k++){
  shelf(g,hits,s,"shelfL"+(k+1),x,top+sh*k,w*.245,sh,[0,345+k*170,230,168]);
  shelf(g,hits,s,"shelfR"+(k+1),x+w*.753,top+sh*k,w*.245,sh,[711,336+k*175,228,168]);
 }
 window(g,hits,s,x+w*.256,y+h*.215,w*.488,h*.473,motion,phase);
 if(isManager){
  badge(g,hits,s,"upgrade",x+w*.305,y+h*.042,w*.17,h*.08);
  badge(g,hits,s,"heat",x+w*.525,y+h*.042,w*.17,h*.08);
 }
 // Worktop and underside storage are different render layers.
 p(g,0,1012,941,239,x,y+h*.687,w,h*.192);
 p(g,0,1240,941,169,x,y+h*.867,w,h*.133);
 const mat={x:x+w*.30,y:y+h*.741,w:w*.40,h:h*.105};
 if(s.counter&&!itemMotion?.hideCounter)good(g,s.counter,mat.x+mat.w*.39,mat.y-12,mat.w*.20,mat.h*.82);
 hit(hits,mat.x,mat.y,mat.w,mat.h,"counter");
 if(motion?.handoff&&GOODS[motion.handoff.sku]){
  const q=motion.handoff.progress;
  good(g,motion.handoff.sku,mat.x+mat.w*.39+q*w*.11,mat.y-12-q*h*.20,mat.w*.20,mat.h*.82);
 }
 drawer(g,hits,s,"drawerL",x+w*.035,y+h*.885,w*.25,h*.115,[15,1255,240,156]);
 drawer(g,hits,s,"drawerR",x+w*.71,y+h*.885,w*.25,h*.115,[680,1258,248,155]);
 if(itemMotion?.sku&&GOODS[itemMotion.sku])
  good(g,itemMotion.sku,x+w*.59,y+h*.67,w*.16,h*.12);
 g.restore();
 return true;
}
