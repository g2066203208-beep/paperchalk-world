// Handmade geometric pixel art. Every fixture/item/customer is a separate
// draw routine (no flattened image / generated art); all clickable bounds
// are registered with the same coordinates used to paint the object.
import {GOODS,FIXTURES,visitor,visible,slotRoom,shelfUpgradeCost,heatingUpgradeCost,dailyOverhead,reputationLevel,loyaltyTip} from "./kiosk-core.js";
import {drawAmbient,drawRoomWall,drawGameFrame,drawSkinButton} from "./kiosk-skin.js";
import {drawPixelCustomer,drawPixelItem,drawPixelStreet,drawPixelCash} from "./kiosk-pixel.js";
const C={ink:"#122140",outline:"#25365b",wall:"#33466a",wood:"#ab7a61",woodLight:"#e0b78a",trim:"#263454",shelf:"#c78d63",dark:"#17294e",cream:"#fff3e2",amber:"#ffc76b",sky:"#5b83b5",snow:"#ebf2ff",blue:"#89b9df",gold:"#ffcd79",green:"#729db2",red:"#d97a7d"};
const r=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
const t=(g,text,x,y,size=12,color=C.cream,align="left",maxWidth=null)=>{
 g.fillStyle=color;g.font='bold '+size+'px ui-monospace, "Noto Sans SC",monospace';
 g.textAlign=align;g.textBaseline="middle";
 if(maxWidth)g.fillText(String(text),Math.round(x),Math.round(y),maxWidth);
 else g.fillText(String(text),Math.round(x),Math.round(y));
};
const frame=(g,x,y,w,h,th=5)=>{r(g,x,y,w,h,C.outline);r(g,x+th,y+th,w-2*th,h-2*th,C.woodLight);r(g,x+th*2,y+th*2,w-4*th,h-4*th,C.trim);};
const shine=(g,x,y,w)=>{r(g,x,y,w,2,C.woodLight);r(g,x,y+3,w,1,C.trim);};
const hit=(hits,x,y,w,h,cmd,key)=>hits.push({x,y,w,h,cmd,key});
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
function sprite(g,sku,x,y,scale=3){drawPixelItem(g,sku,x,y,scale*10,scale*12);}
// The glove and the merchandise are separate foreground pixel layers.
function glovedHand(g,x,y,alpha=1){
 g.save();g.globalAlpha=Math.max(0,Math.min(1,alpha));
 // Stepped diagonal sleeve enters from the lower-right foreground.
 r(g,x+41,y+60,31,20,C.ink);r(g,x+43,y+62,28,17,'#3e566a');
 r(g,x+33,y+51,29,20,C.ink);r(g,x+35,y+53,26,16,'#516b7b');
 r(g,x+26,y+43,26,19,C.ink);r(g,x+28,y+45,23,15,'#617d88');
 r(g,x+22,y+38,28,10,C.trim);r(g,x+24,y+40,24,6,C.woodLight);
 // Mitten, thumb and finger seams are separate hand-drawn pixel parts.
 r(g,x+9,y+27,31,17,C.ink);r(g,x+11,y+29,27,13,'#728c8c');
 r(g,x+6,y+35,12,10,C.ink);r(g,x+8,y+37,10,7,'#8ca59a');
 r(g,x+12,y+27,6,4,'#a9b9a5');r(g,x+22,y+29,2,11,'#516b70');
 r(g,x+29,y+30,2,10,'#516b70');
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
function shelf(g,hits,x,y,w,h,slot,s){
 const key=slot,content=s.slots[key];
 r(g,x+3,y+4,w-6,h-6,C.dark);
 r(g,x+5,y+5,w-10,2,"#7198ba");
 r(g,x,y+h-12,w,11,C.shelf);
 r(g,x,y+h-12,w,3,C.woodLight);
 r(g,x,y+h-4,w,5,C.trim);
 // Real pixel joinery: riveted steel supports and a narrow under-shelf
 // shadow remain attached to this individual, clickable shelf.
 r(g,x+3,y+h-10,4,7,"#39445a");
 r(g,x+w-7,y+h-10,4,7,"#39445a");
 r(g,x+4,y+h-9,2,2,"#b4c5c9");
 r(g,x+w-6,y+h-9,2,2,"#b4c5c9");
 r(g,x+9,y+h-2,Math.max(1,w-18),1,"#735953");
 if(s.upgrades?.shelves)r(g,x+4,y+h-9,w-8,2,C.gold);
 if(content?.qty>0){
  const count=Math.min(content.qty,3);
  for(let i=0;i<count;i++)sprite(g,content.sku,x+Math.max(1,(w-count*27)/2)+i*27,y+h-47,2.3);
  t(g,content.qty+"/"+slotRoom(key,content.sku,s),x+w-6,y+h-18,10,C.gold,"right");
 } else {r(g,x+w*.26,y+h-28,w*.45,2,"#564b49");}
 hit(hits,x,y,w,h,"slot",key);
}
function cupboard(g,hits,x,y,w,h,key,s,phase){
 const opened=Boolean(s.open[key]);
 r(g,x-4,y-4,w+8,h+9,C.outline);
 r(g,x,y,w,h,C.trim);
 if(opened){
  r(g,x+6,y+6,w-12,h-15,C.dark);
  shelf(g,hits,x+8,y+8,w-16,h-18,key,s);
  r(g,x-3,y,w*.19,h,C.wood);
  r(g,x+w*.81,y,w*.19,h,C.wood);
 } else {
  wooden(g,x+3,y+3,w-6,h-6,key.charCodeAt(0),C.wood);
  r(g,x+w*.50,y+4,2,h-8,C.trim);
  r(g,x+w*.39,y+h*.54,3,11,C.gold);r(g,x+w*.60,y+h*.54,3,11,C.gold);
 }
 // interaction hit registered after child slots; selecting slot inside open cabinet
 // uses more specific interior item region.
 hit(hits,x,y,w,h,"toggle",key);
 if(opened){hits.pop();hit(hits,x,y,Math.max(8,w*.14),h,"toggle",key);hit(hits,x+w*.86,y,Math.max(8,w*.14),h,"toggle",key);}
}
function drawer(g,hits,x,y,w,h,key,s){
 const opened=s.open[key];
 r(g,x,y,w,h,C.trim);
 if(opened){
  r(g,x+4,y+3,w-8,h-5,C.dark);
  shelf(g,hits,x+5,y+4,w-10,h-8,key,s);
  r(g,x+1,y+h-10,w-2,13,C.woodLight);
  t(g,"⌄ 关",x+w/2,y+h-5,10,C.ink,"center");
  hit(hits,x,y+h-13,w,16,"toggle",key);
 }else{
  r(g,x+4,y+4,w-8,h-7,C.wood);
  r(g,x+8,y+7,w-16,2,C.woodLight);
  r(g,x+w*.43,y+h*.48,w*.14,4,C.gold);
  hit(hits,x,y,w,h,"toggle",key);
 }
}
// Frost is geometry, not a translucent screenshot. Coordinates are relative
// to the aperture, so it can be painted on any aspect ratio without covering
// the customer or changing the latch's hitbox.
export function windowFrostPattern(width,height){
 const w=Math.floor(width),h=Math.floor(height);
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<24||h<24)return [];
 const pieces=[];
 const add=(x,y,ww,hh,color)=>{const left=Math.max(0,x),right=Math.min(w,x+ww);if(right>left)pieces.push({x:left,y,w:right-left,h:hh,color});};
 for(let i=0;i<w;i+=18){
  const length=Math.min(w-i,13+(i/18%3)*2);
  add(i,-7,length,2,"#f6f7ee");
  add(i+2,-5,Math.max(1,length-4),2,"#d7e9ec");
  if((i/18)%3===1)add(i+5,-3,2,3,"#bcd7e6");
 }
 for(let i=0;i<w;i+=25){
  const length=Math.min(w-i,12+(i/25%3)*3);
  add(i,h+2,length,2,"#f7f8ef");
  add(i+2,h+4,Math.max(1,length-4),2,"#c6dce6");
 }
 // The frost only occupies the wooden frame and sill; the central glass
 // remains readable for facial expressions and physical handoff.
 return pieces;
}
function windowFrame(g,hits,x,y,w,h,s,phase,motion){
 r(g,x-9,y-9,w+18,h+18,C.outline);
 drawPixelStreet(g,x,y,w,h,phase);
 if(s.windowOpen&&(!motion||motion.visible)){
  // Moving sprites are clipped to the actual window aperture, not the wall.
  g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
  drawPixelCustomer(g,{x:x+w*(.04+(motion?.offset||0)),y:y+h*(.04+(motion?.drop||0)),
   w:w*.92,h:h*.92,tone:motion?.tone??visitor(s).tone,phase,
   talking:motion?.talking??s.spoken,receiving:Boolean(motion?.receiving),
   refusing:Boolean(motion?.refusing)});
  g.restore();
 }
 if(!s.windowOpen){
  // A solid wood shutter physically covers the opening when shut.
  wooden(g,x+5,y+5,w-10,h-10,3,C.wood);
  r(g,x+w*.4,y+h*.52,w*.2,7,C.gold);
 }else{
  r(g,x,y,w*.08,h,"#584a47");r(g,x+w*.92,y,w*.08,h,"#584a47");
 }
 r(g,x-9,y-9,w+18,8,C.woodLight);r(g,x-9,y+h,w+18,12,C.woodLight);
 r(g,x-8,y,w*.07,h,C.wood);r(g,x+w*.93,y,w*.07,h,C.wood);
 // Cold blue rim light catches the inner edges of the wooden jambs.
 r(g,x-5,y+4,2,Math.max(1,h-8),"#a9cad9");
 r(g,x+w+3,y+4,2,Math.max(1,h-8),"#7d9fb5");
 r(g,x,y+h-5,w,4,C.ink);
 for(const p of windowFrostPattern(w,h))r(g,x+p.x,y+p.y,p.w,p.h,p.color);
 // Exposed fasteners and a damp, snowy lower sill are physical details.
 for(const yy of [y+12,y+h-17]){
  r(g,x-7,yy,3,3,"#38485a");r(g,x+w+4,yy,3,3,"#38485a");
  r(g,x-6,yy,1,1,"#d2c3a7");r(g,x+w+5,yy,1,1,"#d2c3a7");
 }
 r(g,x+w*.22,y+h+7,w*.56,2,"#e8e9df");
 // Click the fixed latch at the sill, allowing customers to remain clickable.
 r(g,x+w*.44,y+h+2,w*.12,5,C.gold);
 hit(hits,x+w*.17,y+h-25,w*.66,55,"window");
}
function smallGlow(g,x,y,step){
 // Individual 1–4 px pieces form a suspended metal-and-glass shop lamp.
 // Its warm light is local to the lamp, not a whole-screen orange filter.
 r(g,x-2,y-31,4,22,"#182c49");
 r(g,x-4,y-12,8,4,"#75869a");
 r(g,x-24,y-8,48,3,"#2b3652");
 r(g,x-30,y-5,60,4,"#ad805a");
 r(g,x-26,y-1,52,5,"#e4b27b");
 r(g,x-18,y+4,36,6,"#ffcb7e");
 r(g,x-12,y+10,24,4,"#ffe2a3");
 r(g,x-6,y+14,12,2,"#fff2c7");
 r(g,x-23,y-3,4,3,"#fff0cb");
 r(g,x+19,y-3,4,3,"#fff0cb");
 const glow=Math.floor(step/27)%2;
 r(g,x-32,y+5,7,2,glow?"#d0a375":"#e7b884");
 r(g,x+25,y+5,7,2,glow?"#d0a375":"#e7b884");
}
// A real in-world work order, not a transparent text hotspot. The plaque is
// independent from the window, shelf sprites and overlay controls.
function upgradePlaque(g,hits,x,y,w,h,s,isManager){
 const level=s.upgrades?.shelves??0,cost=shelfUpgradeCost(s);
 r(g,x+2,y+3,w,h,C.ink);r(g,x,y,w,h,C.trim);
 r(g,x+3,y+3,w-6,h-6,level?"#526b5b":"#66584c");
 // A compact shelf-shaped wooden order board, positioned away from HUD.
 r(g,x+7,y+9,w-14,3,C.gold);r(g,x+9,y+12,3,9,C.dark);r(g,x+w-12,y+12,3,9,C.dark);
 t(g,"扩架",x+w/2,y+h*.39,11,C.cream,"center");
 t(g,cost===null?"满级":"¥"+cost,x+w/2,y+h*.61,12,C.gold,"center");
 t(g,"容量 +"+(level*2),x+w/2,y+h*.83,9,C.cream,"center");
 if(isManager&&cost!==null)hit(hits,x,y,w,h,"upgrade");
}
function heatingPlaque(g,hits,x,y,w,h,s,isManager){
 const upgraded=s.upgrades?.heating??0,cost=heatingUpgradeCost(s);
 r(g,x+2,y+3,w,h,C.ink);r(g,x,y,w,h,C.trim);
 r(g,x+3,y+3,w-6,h-6,upgraded?"#506b65":"#56545d");
 r(g,x+8,y+8,w-16,3,C.woodLight);
 for(let i=0;i<4;i++)r(g,x+11+i*(w-27)/3,y+12,3,9,upgraded?C.gold:C.blue);
 t(g,"保温",x+w/2,y+h*.42,11,C.cream,"center");
 t(g,cost===null?"已完成":"¥"+cost,x+w/2,y+h*.64,11,C.gold,"center");
 t(g,upgraded?"省6/日":"暖气改造",x+w/2,y+h*.84,9,C.cream,"center");
 if(isManager&&cost!==null)hit(hits,x,y,w,h,"heat");
}
function scene(g,hits,s,x,y,w,h,phase,motion,itemMotion,isManager){
 g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
 drawRoomWall(g,x,y,w,h,phase);
 // structural corner posts
 r(g,x,y,12,h,C.trim);r(g,x+w-12,y,12,h,C.trim);
 r(g,x+11,y,w-22,7,C.woodLight);
 const win={x:x+w*.29,y:y+h*.22,w:w*.42,h:h*.47};
 const topCabY=y+h*.045, topCabH=h*.16;
 cupboard(g,hits,x+w*.034,topCabY,w*.235,topCabH,"cabinetL",s,phase);
 cupboard(g,hits,x+w*.732,topCabY,w*.235,topCabH,"cabinetR",s,phase);
 upgradePlaque(g,hits,x+w*.28,y+h*.075,w*.155,h*.12,s,isManager);
  heatingPlaque(g,hits,x+w*.565,y+h*.075,w*.155,h*.12,s,isManager);
 // Left and right shelf towers. Every shelf is a real storage location.
 const towerY=y+h*.245,tw=w*.225,ty=h*.135;
 for(let i=0;i<3;i++){
  shelf(g,hits,x+w*.035,towerY+i*ty,tw,ty,"shelfL"+(i+1),s);
  shelf(g,hits,x+w*.740,towerY+i*ty,tw,ty,"shelfR"+(i+1),s);
 }
 windowFrame(g,hits,win.x,win.y,win.w,win.h,s,phase,motion);
 // light above service window
 smallGlow(g,x+w/2,y+h*.15,phase);
 // the physical pass-through and main worktop in front of shop wall.
 const benchY=y+h*.71,benchH=h*.13;
 r(g,x+10,benchY,w-20,benchH,C.trim);
 r(g,x+11,benchY,w-22,10,C.woodLight);
 wooden(g,x+14,benchY+10,w-28,benchH-12,9,C.wood);
 // Dedicated handoff mat, visible even if empty.
 const mat={x:x+w*.31,y:benchY+benchH*.25,w:w*.38,h:benchH*.56};
 r(g,mat.x,mat.y,mat.w,mat.h,C.ink);
 r(g,mat.x+4,mat.y+4,mat.w-8,mat.h-8,"#506b66");
 if(s.counter&&!itemMotion?.hideCounter)sprite(g,s.counter,mat.x+mat.w*.40,mat.y+mat.h*.1,Math.min(3,mat.h*.070));
 else t(g,"交接台",mat.x+mat.w/2,mat.y+mat.h/2,11,C.cream,"center");
 hit(hits,mat.x,mat.y,mat.w,mat.h,"counter");
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
 drawer(g,hits,x+w*.065,drawY,w*.34,h*.117,"drawerL",s);
 drawer(g,hits,x+w*.585,drawY,w*.34,h*.117,"drawerR",s);
 // Local first-person arm stays above the drawers and below the UI.
 heldItemLayer(g,itemMotion,mat,x,y,w,benchY,benchH);
 g.restore();
}
function chip(g,hits,x,y,w,h,text,cmd,key,active=false){
 drawSkinButton(g,x,y,w,h,active);
 t(g,text,x+w/2,y+h*.53,Math.min(16,h*.35),active?"#24335d":"#203c6f","center");
 if(cmd)hit(hits,x,y,w,h,cmd,key);
}
export function render(g,s,view,phase=0,viewerId=null,motion=null,itemMotion=null){
 const {W,H,land}=view,hits=[];
 const p=s.players?.[viewerId]||Object.values(s.players||{})[0]||{};
 const isManager=p.role==="manager";
 drawAmbient(g,W,H,phase);
 const headH=land?48:54;
 drawGameFrame(g,W,H,land,headH,phase);
 t(g,"冬 夜 · 售 货 窗",90,headH*.47,land?17:16,C.cream);
 t(g,"第 "+s.day+" 天",W*.55,headH*.47,land?15:13,C.gold);
 t(g,isManager?"店长":"店员",W*.78,headH*.47,land?13:11,C.gold);
 t(g,"¥ "+s.cash,W-12,headH*.47,land?16:14,C.cream,"right");
 // Distinct landscape/portrait camera compositions: no stretching of a screenshot.
 const shop=land?{x:154,y:headH,w:W-300,h:H-headH-93}:{x:0,y:headH,w:W,h:H-headH-244};
 scene(g,hits,s,shop.x,shop.y,shop.w,shop.h,phase,motion,itemMotion,isManager);
 if(land){
  r(g,0,headH,154,shop.h,C.dark);
  g.save();g.beginPath();g.rect(0,headH,154,shop.h);g.clip();
  t(g,"今日",17,headH+36,17,C.gold);t(g,"已服务 "+s.served+"/5",17,headH+64,14,C.cream);
  t(g,"营业额 ¥"+s.earnings,17,headH+89,12,C.cream);
  t(g,"值班 "+Object.keys(s.players).length+" 人",17,headH+113,12,C.cream);
  t(g,"货架扩容 "+(s.upgrades?.shelves??0)+"/2",17,headH+138,12,C.gold);
   t(g,"保温 "+((s.upgrades?.heating??0)?"已完成":"未改造"),17,headH+163,12,C.gold);
   t(g,"今日进货 ¥"+(s.dayExpenses||0),17,headH+188,12,C.cream);
   t(g,"口碑 "+(s.reputation||0)+"/100 · "+reputationLevel(s)+"级",17,headH+213,12,C.gold,"left",128);
   t(g,"熟客小费 ¥"+(s.loyaltyTips||0),17,headH+238,12,C.cream,"left",128);
   t(g,"每单 +¥"+loyaltyTip(s),17,headH+260,12,C.cream);
  g.restore();
  r(g,W-146,headH,146,shop.h,C.dark);
  g.save();g.beginPath();g.rect(W-146,headH,146,shop.h);g.clip();
  t(g,"当前订单",W-130,headH+25,13,C.gold);
  t(g,visitor(s).name,W-130,headH+52,17,C.cream);
  t(g,GOODS[visitor(s).sku].name,W-130,headH+87,15,C.cream);
  t(g,"售价 ¥"+GOODS[visitor(s).sku].price,W-130,headH+110,13,C.cream);
  t(g,s.windowOpen?"营业中":"未开窗",W-130,headH+150,12,C.gold);
  const favor=visitor(s).favor;
  t(g,"邻里委托",W-130,headH+185,13,C.gold);
  t(g,!favor?"暂无":s.favorDone?"已完成 +¥"+favor.tip:s.spoken?GOODS[favor.sku].name+" +¥"+favor.tip:"交谈后了解",W-130,headH+211,12,C.cream,"left",119);
  g.restore();
 }else{
  const lower=shop.y+shop.h;
  r(g,0,lower,W,84,"#203559");
 r(g,0,lower,W,3,C.gold);
  t(g,visitor(s).name+"  ·  "+(s.windowOpen?GOODS[visitor(s).sku].name+" ¥"+GOODS[visitor(s).sku].price:"请点击窗闩开窗"),12,lower+16,15,C.gold);
  t(g,"口碑 "+(s.reputation||0)+"/100",W-12,lower+16,12,C.gold,"right");
  const favor=visitor(s).favor;
  const favorText=!favor?"邻里委托：暂无":s.favorDone?"邻里委托：已完成，获得 ¥"+favor.tip:
   s.spoken?"邻里委托："+GOODS[favor.sku].name+"，报酬 ¥"+favor.tip:"邻里委托：交谈后可了解";
  t(g,favorText,12,lower+39,12,C.gold);
  const note=s.notice.length>34?s.notice.slice(0,33)+"…":s.notice;
  t(g,note,12,lower+65,11,C.cream);
 }
 const bottom=land?H-92:H-160;
 if(land){
  r(g,0,bottom,W,H-bottom,"#17264a");
  t(g,"交互",12,bottom+21,12,C.gold);
  chip(g,hits,67,bottom+4,95,64,"问候","talk");
  chip(g,hits,168,bottom+4,95,64,"收款","sell");
  chip(g,hits,269,bottom+4,95,64,"委托","commission");
  t(g,"补货：",370,bottom+21,12,C.gold);
  let px=430;
  if(isManager){for(const sku of Object.keys(GOODS)){chip(g,hits,px,bottom+4,105,64,GOODS[sku].name+" -"+GOODS[sku].buy,"restock",sku,p.restock===sku);px+=112;}}
  else t(g,"店长负责进货；店员可拿货、交接与收款",350,bottom+23,13,C.cream);
  t(g,"货架拿货 → 交接台 → 收款；补货先选商品再点货格。",26,bottom+84,12,C.cream);
 } else{
  r(g,0,H-160,W,160,"#17264a");
  chip(g,hits,10,H-154,145,70,"交谈","talk");
  chip(g,hits,167,H-154,145,70,"收款","sell");
  chip(g,hits,324,H-154,146,70,"完成委托","commission");
  let skuKeys=Object.keys(GOODS);
  if(isManager){for(let i=0;i<4;i++){
   const sku=skuKeys[i];chip(g,hits,10+i*118,H-78,107,74,GOODS[sku].name+" -"+GOODS[sku].buy,"restock",sku,p.restock===sku);
  }}else t(g,"店员：从货架拿货 → 交接台 → 收款",W/2,H-41,15,C.cream,"center");
 }
 if(p.hand){
  t(g,"手持："+GOODS[p.hand].name,land?W/2:W/2,land?bottom-14:H-196,13,C.gold,"center");
 }
 if(s.returns?.length)t(g,"待领回 ×"+s.returns.length+"（点空交接台取回）",W/2,land?bottom-37:H-215,12,C.gold,"center");
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
