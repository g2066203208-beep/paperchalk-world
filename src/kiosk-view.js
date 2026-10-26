// Independently drawn flat-color shapes for every functional fixture and object.
// No flattened game screen; all hitboxes and host-authoritative inventory remain real.
import {GOODS,FIXTURES,visitor,visible,slotRoom,shelfUpgradeCost,heatingUpgradeCost,dailyOverhead,reputationLevel,loyaltyTip} from "./kiosk-core.js";
import {renderGeneratedShop} from "./kiosk-gpt-scene.js";
import {flatAmbient,flatWall,flatStreet,flatCustomer,flatProduct,flatShelfBase,flatCupboard,flatDrawer,flatWindow,flatCounter,flatMat,flatPlaque,flatTop,flatButton,flatActionIcon,flatDialogue} from "./kiosk-flat.js";
import {drawPixelCash} from "./kiosk-pixel.js";

const C={ink:"#263459",outline:"#263459",wall:"#425D91",wood:"#526FA9",woodLight:"#E4EAF4",trim:"#263459",shelf:"#DDE6F5",dark:"#1E294D",cream:"#F9F7F4",amber:"#F3A33E",sky:"#7F99C2",snow:"#F0F4F8",blue:"#526FA9",gold:"#F3A33E",green:"#8CB3B1",red:"#DF7770"};
const r=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
const t=(g,text,x,y,size=12,color=C.cream,align="left",maxWidth=null)=>{
 g.fillStyle=color;g.font='bold '+size+'px ui-monospace, "Noto Sans SC",monospace';
 g.textAlign=align;g.textBaseline="middle";
 if(maxWidth)g.fillText(String(text),Math.round(x),Math.round(y),maxWidth);
 else g.fillText(String(text),Math.round(x),Math.round(y));
};
const frame=(g,x,y,w,h,th=5)=>{r(g,x,y,w,h,C.outline);r(g,x+th,y+th,w-2*th,h-2*th,C.woodLight);r(g,x+th*2,y+th*2,w-4*th,h-4*th,C.trim);};
const shine=(g,x,y,w)=>{r(g,x,y,w,2,C.woodLight);r(g,x,y+3,w,1,C.trim);};
const hit=(hits,x,y,w,h,cmd,key,gesture="tap")=>hits.push({x,y,w,h,cmd,key,gesture});
// Dialogue lives at its speaker, never in a persistent bottom message strip.
// Pure selectors can be regression-tested without changing saves/network state.
export function customerSpeech(s,motion=null){
 if(!s?.windowOpen||s.phase==="summary"||
   ["hidden","enter","handoff","exit"].includes(motion?.stage))return null;
 const person=visitor(s);
 if(s.wrongAttempted)return {name:person.name,text:"这不是我要的，请给我"+GOODS[person.sku].name+"。"};
 if(s.favorDone&&person.favor)return {name:person.name,text:"太感谢了，委托办成啦！"};
 if(s.spoken&&person.favor)return {name:person.name,text:person.favor.line};
 return {name:person.name,text:person.line};
}
export function wrapSpeech(text,maxChars=14,maxLines=3){
 const result=[],width=Math.max(2,Math.floor(maxChars)),limit=Math.max(1,Math.floor(maxLines));
 let current="";
 for(const ch of String(text??"")){
  if(ch==="\n"){if(current)result.push(current);current="";continue;}
  if(Array.from(current).length>=width){result.push(current);current="";}
  current+=ch;
 }
 if(current)result.push(current);
 if(result.length>limit){
  const cropped=result.slice(0,limit);
  cropped[limit-1]=Array.from(cropped[limit-1]).slice(0,width-1).join("")+"…";
  return cropped;
 }
 return result;
}
function commissionReady(s){
 const favor=visitor(s).favor;
 return Boolean(s.windowOpen&&s.spoken&&favor&&(s.counter===favor.sku||s.favorDone));
}
function npcBubble(g,hits,win,s,motion){
 const speech=customerSpeech(s,motion);
 if(!speech)return;
 const {x,y,w,h}=win;
 // Top-right label does not cover eyes, hands or real counter interactions.
 const bw=Math.max(82,Math.min(w*.57,145)),bx=x+w-bw-7,by=y+10;
 const font=Math.max(13,Math.min(15,w/16));
 const lines=wrapSpeech(speech.text,Math.max(4,Math.floor((bw-15)/font)),2);
 const bh=24+lines.length*(font+3);
 g.save();
 g.beginPath();g.roundRect(bx,by,bw,bh,8);g.fillStyle="#F9F7F4";g.fill();
 g.strokeStyle="#263459";g.lineWidth=2;g.stroke();
 g.beginPath();g.moveTo(bx+bw*.26,by+bh);g.lineTo(bx+bw*.44,by+bh);g.lineTo(bx+bw*.36,by+bh+8);g.closePath();g.fillStyle="#F9F7F4";g.fill();
 t(g,speech.name,bx+9,by+12,Math.min(12,font),C.blue);
 lines.forEach((line,i)=>t(g,line,bx+9,by+28+i*(font+3),font,C.ink,"left",bw-15));
 g.restore();
 const touchHeight=Math.max(72,bh);
 hit(hits,bx,by-(touchHeight-bh),bw,touchHeight,commissionReady(s)?"commission":"talk");
}
function wooden(g,x,y,w,h,seed=1,base=C.wood){
 r(g,x,y,w,h,base);const rows=Math.max(1,Math.floor(h/21));
 for(let k=0;k<rows;k++){
  const yy=y+k*21;
  r(g,x,yy,w,2,C.trim);r(g,x,yy+2,w,2,C.woodLight);
  for(let a=0;a<7;a++){
   const px=x+((a*53+k*39+seed*17)%Math.max(5,Math.floor(w-12)));
   const len=5+((k*7+a*3)%11);
   r(g,px,yy+7+(a%3)*4,len,1,(a%3===0)?"#ad836b":"#705348");
  }
  // Pixel knots and staggered pores belong to each wooden fixture, not a
  // full-scene overlay. Their deterministic seed survives camera rotation.
  if(w>=44&&yy+17<y+h){
   const knot=x+11+((seed*19+k*47)%Math.max(1,Math.floor(w-30)));
   r(g,knot,yy+10,9,2,"#74564e");
   r(g,knot+2,yy+9,5,1,"#d3a181");
   r(g,knot+3,yy+12,3,1,"#5c4a48");
  }
 }
}
function sprite(g,sku,x,y,scale=3){flatProduct(g,sku,x,y,scale*10,scale*12);}
// The glove and the merchandise are separate foreground pixel layers.
function glovedHand(g,x,y,alpha=1){
 g.save();g.globalAlpha=Math.max(0,Math.min(1,alpha));
 // Graphic sleeve, cuff and mitten are independent hard-color shapes.
 g.fillStyle="#263459";g.beginPath();g.moveTo(x+76,y+82);g.lineTo(x+32,y+37);g.lineTo(x+15,y+44);g.lineTo(x+51,y+96);g.closePath();g.fill();
 g.fillStyle="#526FA9";g.beginPath();g.moveTo(x+70,y+82);g.lineTo(x+33,y+42);g.lineTo(x+21,y+46);g.lineTo(x+56,y+92);g.closePath();g.fill();
 g.fillStyle="#F9F7F4";g.fillRect(x+19,y+37,17,10);
 g.fillStyle="#263459";g.beginPath();g.roundRect(x+3,y+21,30,29,10);g.fill();
 g.fillStyle="#DDE6F5";g.beginPath();g.roundRect(x+6,y+25,23,22,8);g.fill();
 g.restore();
}
function heldItemLayer(g,motion,mat,x,y,w,benchY,benchH){
 if(!motion||!GOODS[motion.sku])return;
 const {stage,sku,progress}=motion;
 const hx=x+w*.64,hy=benchY+benchH*.27;
 const tx=mat.x+mat.w*.40,ty=mat.y+mat.h*.10;
 const lerp=(a,b,p)=>a+(b-a)*p;
 if(stage==='place'){
  glovedHand(g,hx,hy,1-progress);
  sprite(g,sku,lerp(hx+9,tx,progress),lerp(hy,ty,progress),2.6);
 }else if(stage==='take'){
  glovedHand(g,hx,hy,progress);
  sprite(g,sku,lerp(tx,hx+9,progress),lerp(ty,hy,progress),2.6);
 }else if(stage==='pickup'){
  glovedHand(g,hx,hy,progress);
  sprite(g,sku,hx+9,hy+(1-progress)*27,2.6);
 }else{
  glovedHand(g,hx,hy);
  sprite(g,sku,hx+9,hy,2.6);
 }
}
function shelf(g,hits,x,y,w,h,slot,s,isManager){
 const content=s.slots[slot];flatShelfBase(g,x,y,w,h);
 if(content?.qty>0){
  const count=Math.min(content.qty,3),scale=Math.min(2.5,Math.max(1.05,(w-8)/(count*29)));
  for(let i=0;i<count;i++)sprite(g,content.sku,x+(w-count*30*scale/2.3)/2+i*30*scale/2.3,y+h-16-12*scale,scale);
  r(g,x+w-33,y+h-14,30,11,C.ink);
  t(g,content.qty+"/"+slotRoom(slot,content.sku,s),x+w-18,y+h-8,10,C.cream,"center");
 }
 hit(hits,x,y,w,h,"slot",slot);
 // Hold the actual shelf/stock label to prepare a purchase of that same SKU.
 // The old item identity remains on an empty shelf, preventing a sellout deadlock.
 const stockSku=content?.sku||content?.lastSku;
 if(isManager&&stockSku)hit(hits,x,y,w,h,"restock",stockSku,"hold");
}
function cupboard(g,hits,x,y,w,h,key,s,phase,isManager){
 const open=Boolean(s.open[key]);
 flatCupboard(g,x,y,w,h,open,key==="cabinetR"?1:0);
 if(open){
  const entry=s.slots[key];
  if(entry?.qty>0)flatProduct(g,entry.sku,x+w*.36,y+h*.27,w*.29,h*.55);
  hit(hits,x+w*.20,y+h*.16,w*.60,h*.71,"slot",key);
  if(isManager&&(entry.sku||entry.lastSku))hit(hits,x+w*.20,y+h*.16,w*.60,h*.71,"restock",entry.sku||entry.lastSku,"hold");
  hit(hits,x,y,w*.2,h,"toggle",key);
  hit(hits,x+w*.8,y,w*.2,h,"toggle",key);
 }else hit(hits,x,y,w,h,"toggle",key);
}
function drawer(g,hits,x,y,w,h,key,s,isManager){
 const open=Boolean(s.open[key]);flatDrawer(g,x,y,w,h,open);
 if(open){
  const entry=s.slots[key];
  if(entry?.qty>0)flatProduct(g,entry.sku,x+w*.38,y+h*.05,w*.25,h*.51);
  hit(hits,x+5,y+5,w-10,h*.62,"slot",key);
  if(isManager&&(entry.sku||entry.lastSku))hit(hits,x+5,y+5,w-10,Math.max(60,h*.62),"restock",entry.sku||entry.lastSku,"hold");
  hit(hits,x,y+h*.70,w,h*.3,"toggle",key);
 }else hit(hits,x,y,w,h,"toggle",key);
}
// Backward-compatible deterministic trim geometry. Remains available to save/replay tests.
export function windowFrostPattern(width,height){
 const w=Math.floor(width),h=Math.floor(height);
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<24||h<24)return [];
 const pieces=[];
 const add=(x,y,ww,hh,color)=>{
  const l=Math.max(0,x),r=Math.min(w,x+ww);
  if(r>l)pieces.push({x:l,y,w:r-l,h:hh,color});
 };
 for(let i=0;i<w;i+=18){
  const length=Math.min(w-i,13+(i/18%3)*2);
  add(i,-7,length,2,"#F9F7F4");
  add(i+2,-5,Math.max(1,length-4),2,"#DDE6F5");
  if((i/18)%3===1)add(i+5,-3,2,3,"#7F99C2");
 }
 for(let i=0;i<w;i+=25){
  const length=Math.min(w-i,12+(i/25%3)*3);
  add(i,h+2,length,2,"#F9F7F4");
  add(i+2,h+4,Math.max(1,length-4),2,"#DDE6F5");
 }
 return pieces;
}
function windowFrame(g,hits,x,y,w,h,s,phase,motion){
 flatStreet(g,x,y,w,h,phase);
 if(s.windowOpen&&(!motion||motion.visible)){
  g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
  flatCustomer(g,{x:x+w*(.04+(motion?.offset||0)),y:y+h*(.015+(motion?.drop||0)),
   w:w*.92,h:h*.95,tone:motion?.tone??visitor(s).tone,phase,
   talking:motion?.talking??s.spoken,receiving:Boolean(motion?.receiving),
   refusing:Boolean(motion?.refusing)});
  g.restore();
 }
 flatWindow(g,x,y,w,h,s.windowOpen);
 // The physical latch remains the only window-close target.
 hit(hits,x+w*.16,y+h-23,w*.68,49,"window");
 // Tapping the actual customer speaks to them. Dialogue bubble is also tappable.
 if(s.windowOpen&&(!motion||motion.stage==="idle"))
  hit(hits,x+w*.15,y+h*.09,w*.70,h*.63,commissionReady(s)?"commission":"talk");
 npcBubble(g,hits,{x,y,w,h},s,motion);
}
function smallGlow(g,x,y,phase){
 const z=6+Math.sin(phase*.03)*1.5;
 r(g,x-2,y-37,4,24,C.ink);
 g.fillStyle=C.ink;g.beginPath();g.moveTo(x-24,y-10);g.lineTo(x+24,y-10);g.lineTo(x+29,y+z);g.lineTo(x-29,y+z);g.fill();
 r(g,x-21,y+2,42,9,C.gold);
 r(g,x-12,y+9,24,5,"#FFF4D9");
}
function upgradePlaque(g,hits,x,y,w,h,s,isManager){
 const level=s.upgrades?.shelves??0,cost=shelfUpgradeCost(s);
 flatPlaque(g,x,y,w,h,"shelf","扩架",cost===null?"满级":"¥"+cost);
 if(isManager&&cost!==null)hit(hits,x,y,w,h,"upgrade");
}
function heatingPlaque(g,hits,x,y,w,h,s,isManager){
 const level=s.upgrades?.heating??0,cost=heatingUpgradeCost(s);
 flatPlaque(g,x,y,w,h,"heating","保温",cost===null?"完成":"¥"+cost);
 if(isManager&&cost!==null)hit(hits,x,y,w,h,"heat");
}
function scene(g,hits,s,x,y,w,h,phase,motion,itemMotion,isManager){
 if(renderGeneratedShop(g,hits,s,x,y,w,h,phase,motion,itemMotion,isManager)){
  // Interaction adapter for the existing independent generated-art fixtures.
  // This changes only their hit mapping; no art files or drawing code are altered.
  // Generator scene returns physical clickable regions; all tap targets use an
  // explicit gesture, and the cash register exists even before stock is placed.
  for(const h of hits)h.gesture??="tap";
  const till={x:x+w*.77,y:y+h*.705,w:w*.18,h:Math.max(72,h*.105)};
  hit(hits,till.x,till.y,till.w,till.h,"sell",undefined,"tap");
  const stockTargets=hits.filter(h=>h.cmd==="slot");
  if(isManager)for(const h of stockTargets){
   const entry=s.slots[h.key],sku=entry?.sku||entry?.lastSku;
   if(sku)hit(hits,h.x,h.y,h.w,Math.max(60,h.h),"restock",sku,"hold");
  }
  const mat={x:x+w*.30,y:y+h*.741,w:w*.40,h:h*.105};
  // The visible product on the pass-through mat is physically handed over.
  // Hold it to take it back instead of selling the wrong order.
  if(s.counter&&s.windowOpen){
   hit(hits,mat.x,mat.y,mat.w,mat.h,"sell");
   hit(hits,mat.x,mat.y,mat.w,mat.h,"counter",undefined,"hold");
  }
  const win={x:x+w*.256,y:y+h*.215,w:w*.488,h:h*.473};
  if(commissionReady(s)&&(!motion||motion.stage==="idle"))
   hit(hits,win.x+win.w*.13,win.y+win.h*.25,win.w*.74,win.h*.59,"commission");
  npcBubble(g,hits,win,s,motion);
  return;
 }
 g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
 flatWall(g,x,y,w,h,phase);
 // structural corner posts
 r(g,x,y,12,h,C.trim);r(g,x+w-12,y,12,h,C.trim);
 r(g,x+11,y,w-22,5,C.cream);
 const win={x:x+w*.255,y:y+h*.20,w:w*.49,h:h*.49};
 const topCabY=y+h*.025, topCabH=h*.18;
 cupboard(g,hits,x+w*.034,topCabY,w*.235,topCabH,"cabinetL",s,phase,isManager);
 cupboard(g,hits,x+w*.732,topCabY,w*.235,topCabH,"cabinetR",s,phase,isManager);
 upgradePlaque(g,hits,x+w*.28,y+h*.075,w*.155,h*.12,s,isManager);
  heatingPlaque(g,hits,x+w*.565,y+h*.075,w*.155,h*.12,s,isManager);
 // Left and right shelf towers. Every shelf is a real storage location.
 const towerY=y+h*.237,tw=w*.22,ty=h*.147;
 for(let i=0;i<3;i++){
  shelf(g,hits,x+w*.035,towerY+i*ty,tw,ty,"shelfL"+(i+1),s,isManager);
  shelf(g,hits,x+w*.740,towerY+i*ty,tw,ty,"shelfR"+(i+1),s,isManager);
 }
 windowFrame(g,hits,win.x,win.y,win.w,win.h,s,phase,motion);
 // light above service window
 smallGlow(g,x+w/2,y+h*.15,phase);
 // the physical pass-through and main worktop in front of shop wall.
 const benchY=y+h*.71,benchH=h*.13;
 flatCounter(g,x+8,benchY,w-16,benchH);
 const mat={x:x+w*.31,y:benchY+benchH*.25,w:w*.38,h:benchH*.56};
 flatMat(g,mat.x,mat.y,mat.w,mat.h);
 if(s.counter&&!itemMotion?.hideCounter)sprite(g,s.counter,mat.x+mat.w*.40,mat.y+mat.h*.1,Math.min(3,mat.h*.070));
 else t(g,"交接台",mat.x+mat.w/2,mat.y+mat.h/2,11,C.cream,"center");
 hit(hits,mat.x,mat.y,mat.w,mat.h,"counter");
 if(s.counter)hit(hits,mat.x,mat.y,mat.w,mat.h,"counter",undefined,"hold");
 // A sold product is animated independently from the authoritative counter
 // inventory. Its destination follows the moving customer's receiving hand.
 if(motion?.handoff&&GOODS[motion.handoff.sku]){
  const scale=Math.min(3,mat.h*.070),p=motion.handoff.progress;
  const cw=win.w*.92,ch=win.h*.92;
  const cs=Math.min(cw/80,ch/120);
  const cx=win.x+win.w*(.04+(motion.offset||0));
  const cy=win.y+win.h*(.04+(motion.drop||0));
  const handX=cx+cw/2+34*cs-5*scale;
  const handY=cy+ch*.96-37*cs-4*scale;
  const fromX=mat.x+mat.w*.40,fromY=mat.y+mat.h*.10;
  g.save();g.beginPath();
  // The item may cross the sill, but must never float over solid wall panels.
  g.rect(win.x,win.y,win.w,benchY+benchH-win.y);g.clip();
  sprite(g,motion.handoff.sku,fromX+(handX-fromX)*p,fromY+(handY-fromY)*p,scale);
  g.restore();
 }
 // A physical pixel cash tray. The note flies here after a paid handoff.
 const till={x:x+w*.075,y:benchY+benchH*.22,w:Math.max(26,w*.09),h:Math.max(13,benchH*.32)};
 r(g,till.x+2,till.y+3,till.w,till.h,C.ink);
 r(g,till.x,till.y,till.w,till.h,"#b38d61");
 r(g,till.x+3,till.y+3,till.w-6,till.h-6,"#485d5a");
 r(g,till.x+6,till.y+6,till.w-12,2,"#e0c68f");
 // The existing cash tray is the physical checkout target, not a floating button.
 // Expanded touch tolerance stays centered on the visible tray.
 hit(hits,till.x-10,till.y-21,Math.max(60,till.w+20),60,"sell");
 if(motion?.payment&&motion.payment.progress>0){
  const p=motion.payment.progress;
  const cw=win.w*.92,ch=win.h*.92,cs=Math.min(cw/80,ch/120);
  const cx=win.x+win.w*(.04+(motion.offset||0));
  const cy=win.y+win.h*(.04+(motion.drop||0));
  const fromX=cx+cw/2+34*cs,fromY=cy+ch*.96-37*cs;
  const toX=till.x+till.w*.27,toY=till.y-4;
  const arc=Math.sin(Math.PI*p)*Math.min(20,benchH*.20);
  const cashScale=Math.max(.85,Math.min(1.45,w/450));
  drawPixelCash(g,fromX+(toX-fromX)*p,fromY+(toY-fromY)*p-arc,cashScale);
  if(p>.75)t(g,"¥"+motion.payment.amount,till.x+till.w/2,till.y-13,11,C.gold,"center");
 }
 r(g,x+w*.80,benchY+benchH*.3,w*.09,10,C.dark);
 r(g,x+w*.81,benchY+benchH*.17,w*.07,10,C.cream);
 // Under-counter drawers: both open and close, both store merchandise.
 const drawY=y+h*.855;
 drawer(g,hits,x+w*.065,drawY,w*.34,h*.117,"drawerL",s,isManager);
 drawer(g,hits,x+w*.585,drawY,w*.34,h*.117,"drawerR",s,isManager);
 // Local first-person arm stays above the drawers and below the UI.
 heldItemLayer(g,itemMotion,mat,x,y,w,benchY,benchH);
 g.restore();
}
function chip(g,hits,x,y,w,h,text,cmd,key,active=false){
 flatButton(g,x,y,w,h,active);
 if(cmd&&w>=70){
  const small=w<116;
  flatActionIcon(g,cmd,x+(small?18:27),y+h*.52,Math.min(small?20:25,h*.40));
  t(g,text,x+(small?w*.68:w*.62),y+h*.53,Math.min(small?14:16,h*.32),C.ink,"center",w*(small?.59:.64));
 }else t(g,text,x+w/2,y+h*.53,15,C.ink,"center");
 if(cmd)hit(hits,x,y,w,h,cmd,key);
}
export function render(g,s,view,phase=0,viewerId=null,motion=null,itemMotion=null){
 const {W,H,land}=view,hits=[];
 const p=s.players?.[viewerId]||Object.values(s.players||{})[0]||{};
 const isManager=p.role==="manager";
 flatAmbient(g,W,H,phase);
 const headH=land?48:54;
 flatTop(g,W,headH);
 t(g,"冬 日 小 店",land?70:66,headH*.47,land?17:16,C.cream);
 t(g,"第 "+s.day+" 天",W*.55,headH*.47,land?15:13,C.gold);
 t(g,isManager?"店长":"店员",W*.78,headH*.47,land?13:11,C.gold);
 t(g,"¥ "+s.cash,W-12,headH*.47,land?16:14,C.cream,"right");
 // Give the actual shop the full viewport; customer speech is attached to the NPC.
 // No detached order sidebars, bottom command strip or floating stock buttons.
 const shop={x:0,y:headH,w:W,h:H-headH-8};
 scene(g,hits,s,shop.x,shop.y,shop.w,shop.h,phase,motion,itemMotion,isManager);
 if(s.phase==="summary"){
  r(g,0,0,W,H,"#171922e9");
  t(g,"今 日 打 烊",W/2,H*.27,32,C.gold,"center");
  const bill=dailyOverhead(s);
  t(g,"服务顾客 "+s.served+" 人 · 今日评分 "+(s.dayRating||0)+"/5",W/2,H*.35,19,C.cream,"center");
  t(g,"销售 ¥"+s.earnings+" · 委托 ¥"+(s.favorTips||0)+" · 熟客小费 ¥"+(s.loyaltyTips||0),W/2,H*.41,17,C.cream,"center");
  t(g,"本日进货 -¥"+(s.dayExpenses||0),W/2,H*.47,17,C.cream,"center");
  t(g,"房租 -¥"+bill.rent+" · 暖气 -¥"+bill.heating,W/2,H*.53,17,C.cream,"center");
  t(g,"经营净额 "+(s.dayNet<0?"-¥":"¥")+Math.abs(s.dayNet||0),W/2,H*.59,20,C.gold,"center");
  t(g,"现金 ¥"+s.cash+" · 口碑 "+(s.reputation||0)+"/100 ("+((s.dayReputationDelta||0)>=0?"+":"")+(s.dayReputationDelta||0)+")",W/2,H*.65,18,C.cream,"center");
  chip(g,hits,W*.23,H*.73,W*.54,56,"开始下一天","nextday");
 }
 return hits;
}
