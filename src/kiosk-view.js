// Approved generated 2D anime assets, independently layered by fixture state.
// All pointer hit regions and inventory authority remain in kiosk-core.
import {GOODS,FIXTURES,visitor,visible,slotRoom,shelfUpgradeCost,heatingUpgradeCost,dailyOverhead,reputationLevel,loyaltyTip} from "./kiosk-core.js";
import {drawAmbient,drawRoomWall,drawGameFrame,drawSkinButton} from "./kiosk-skin.js";
import {drawAnime} from "./kiosk-anime-assets.js";
const C={ink:"#122140",outline:"#25365b",wall:"#33466a",wood:"#ab7a61",woodLight:"#e0b78a",trim:"#263454",shelf:"#c78d63",dark:"#17294e",cream:"#fff3e2",amber:"#ffc76b",sky:"#5b83b5",snow:"#ebf2ff",blue:"#89b9df",gold:"#ffcd79",green:"#729db2",red:"#d97a7d"};
const r=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
const t=(g,text,x,y,size=12,color=C.cream,align="left")=>{g.fillStyle=color;g.font='bold '+size+'px ui-monospace, "Noto Sans SC",monospace';g.textAlign=align;g.textBaseline="middle";g.fillText(String(text),Math.round(x),Math.round(y));};
const frame=(g,x,y,w,h,th=5)=>{r(g,x,y,w,h,C.outline);r(g,x+th,y+th,w-2*th,h-2*th,C.woodLight);r(g,x+th*2,y+th*2,w-4*th,h-4*th,C.trim);};
const shine=(g,x,y,w)=>{r(g,x,y,w,2,C.woodLight);r(g,x,y+3,w,1,C.trim);};
const hit=(hits,x,y,w,h,cmd,key)=>hits.push({x,y,w,h,cmd,key});
function wooden(g,x,y,w,h,seed=1,base=C.wood){
 r(g,x,y,w,h,base);const rows=Math.max(1,Math.floor(h/21));
 for(let k=0;k<rows;k++){
  let yy=y+k*21;r(g,x,yy,w,2,C.trim);r(g,x,yy+2,w,2,C.woodLight);
  for(let a=0;a<7;a++){let px=x+((a*53+k*39+seed*17)%Math.max(5,Math.floor(w-12)));
   let len=5+((k*7+a*3)%11);r(g,px,yy+7+(a%3)*4,len,1,(a%3===0)?"#ad836b":"#705348");}
 }
}
function sprite(g,sku,x,y,scale=3){drawAnime(g,sku,x,y,scale*10,scale*12);}
// The glove and the merchandise are separate foreground pixel layers.
function glovedHand(){ /* Removed previous procedural mitten. A separated staff-hand asset will replace it. */ }
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
 const content=s.slots[slot];
 // Actual slot and inventory are still determined by kiosk-core.
 r(g,x+3,y+3,w-6,h-7,"#152648bd");
 r(g,x+3,y+h-14,w-6,3,"#e8ac72");
 if(content?.qty>0){
  const count=Math.min(content.qty,3),sz=Math.min(w/(count+1),h*.60);
  for(let i=0;i<count;i++)drawAnime(g,content.sku,x+(i+1)*w/(count+1)-sz*.45,y+h*.20,sz*.90,sz*1.25);
  r(g,x+w-34,y+h-16,29,14,"#20345c");t(g,content.qty+"/"+slotRoom(slot,content.sku,s),x+w-19,y+h-9,10,C.cream,"center");
 }
 hit(hits,x,y,w,h,"slot",slot);
}
function cupboard(g,hits,x,y,w,h,key,s,phase){
 const opened=Boolean(s.open[key]);
 drawAnime(g,key+(opened?"-open":"-closed"),x-4,y-5,w+8,h+10);
 if(opened){
  // Product art represents the actual stored SKU, not a decorative fake inventory.
  const b=s.slots[key];
  if(b?.qty)drawAnime(g,b.sku,x+w*.34,y+h*.35,w*.31,h*.38);
  hit(hits,x+w*.16,y+h*.22,w*.68,h*.58,"slot",key);
  hit(hits,x,y,w*.17,h,"toggle",key);
  hit(hits,x+w*.84,y,w*.16,h,"toggle",key);
 }else hit(hits,x,y,w,h,"toggle",key);
}
function drawer(g,hits,x,y,w,h,key,s){
 const opened=Boolean(s.open[key]);
 drawAnime(g,opened?"drawer-open":"drawer-closed",x-4,y-5,w+8,h+10);
 if(opened){
  const b=s.slots[key];
  if(b?.qty)drawAnime(g,b.sku,x+w*.35,y+h*.10,w*.26,h*.55);
  hit(hits,x+4,y+3,w-8,h*.62,"slot",key);
  hit(hits,x,y+h*.70,w,h*.30,"toggle",key);
 }else hit(hits,x,y,w,h,"toggle",key);
}
function windowFrame(g,hits,x,y,w,h,s,phase,motion){
 // Outdoor landscape, movable customer cutout, functional shutter and frame are
 // independent draw calls, not a pasted composition or fake clickable screenshot.
 r(g,x,y,w,h,"#5779a6");
 drawAnime(g,"street",x,y,w,h);
 if(s.windowOpen&&(!motion||motion.visible)){
  const kinds=["girl","man","woman","child"];
  const tone=motion?.tone??visitor(s).tone;
  const kind=kinds[Math.abs(Math.floor(tone||0))%kinds.length];
  g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
  const bob=Math.sin(phase*.045)*1.8;
  drawAnime(g,kind,x+w*(motion?.offset||0),y+h*(.11+(motion?.drop||0))+bob,w,h*.95);
  g.restore();
 }
 drawAnime(g,s.windowOpen?"window-open":"window-closed",x-w*.11,y-h*.14,w*1.22,h*1.27);
 // Sill latch keeps the identical world command for open/close and WebRTC.
 hit(hits,x+w*.18,y+h-20,w*.64,48,"window");
}
function smallGlow(g,x,y,phase){
 const pulse=.76+Math.sin(phase*.035)*.07;
 g.save();g.globalAlpha=pulse;
 drawAnime(g,"lamp",x-31,y-37,62,68);
 g.restore();
}
function upgradePlaque(g,hits,x,y,w,h,s,isManager){
 const level=s.upgrades?.shelves??0,cost=shelfUpgradeCost(s);
 drawAnime(g,"shelf-upgrade",x,y,w,h);
 t(g,cost===null?"满级":"¥"+cost,x+w/2,y+h*.81,11,C.cream,"center");
 if(isManager&&cost!==null)hit(hits,x,y,w,h,"upgrade");
}
function heatingPlaque(g,hits,x,y,w,h,s,isManager){
 const level=s.upgrades?.heating??0,cost=heatingUpgradeCost(s);
 drawAnime(g,"heater-upgrade",x,y,w,h);
 t(g,cost===null?"已完成":"¥"+cost,x+w/2,y+h*.81,11,C.cream,"center");
 if(isManager&&cost!==null)hit(hits,x,y,w,h,"heat");
}
function scene(g,hits,s,x,y,w,h,phase,motion,itemMotion,isManager){
 g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
 drawRoomWall(g,x,y,w,h,phase);
 // structural corner posts
 r(g,x,y,12,h,C.trim);r(g,x+w-12,y,12,h,C.trim);
 r(g,x+11,y,w-22,7,C.woodLight);
 const win={x:x+w*.225,y:y+h*.225,w:w*.55,h:h*.46};
 const topCabY=y+h*.045, topCabH=h*.16;
 cupboard(g,hits,x+w*.034,topCabY,w*.235,topCabH,"cabinetL",s,phase);
 cupboard(g,hits,x+w*.732,topCabY,w*.235,topCabH,"cabinetR",s,phase);
 upgradePlaque(g,hits,x+w*.28,y+h*.075,w*.155,h*.12,s,isManager);
  heatingPlaque(g,hits,x+w*.565,y+h*.075,w*.155,h*.12,s,isManager);
 // Left and right shelf towers. Every shelf is a real storage location.
 const towerY=y+h*.27,tw=w*.206,ty=h*.128;
 drawAnime(g,"shelf",x+w*.008,towerY-10,tw*1.16,ty*3.40);
 drawAnime(g,"shelf",x+w*.783,towerY-10,tw*1.16,ty*3.40);
 for(let i=0;i<3;i++){
  shelf(g,hits,x+w*.019,towerY+i*ty,tw,ty,"shelfL"+(i+1),s);
  shelf(g,hits,x+w*.777,towerY+i*ty,tw,ty,"shelfR"+(i+1),s);
 }
 windowFrame(g,hits,win.x,win.y,win.w,win.h,s,phase,motion);
 // light above service window
 smallGlow(g,x+w/2,y+h*.17,phase);
 // the physical pass-through and main worktop in front of shop wall.
 const benchY=y+h*.71,benchH=h*.13;
 drawAnime(g,"counter",x-12,benchY-10,w+24,benchH+46);
 const mat={x:x+w*.31,y:benchY+benchH*.25,w:w*.38,h:benchH*.56};
 drawAnime(g,"mat",mat.x,mat.y,mat.w,mat.h);
 if(s.counter&&!itemMotion?.hideCounter)sprite(g,s.counter,mat.x+mat.w*.40,mat.y+mat.h*.1,Math.min(3,mat.h*.070));
 else t(g,"交接",mat.x+mat.w/2,mat.y+mat.h/2,11,C.cream,"center");
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
 // small secondary station objects that don't compete with the item mat
 // Existing pen cup is part of separated counter sprite.
 // r(g,x+w*.075,benchY+benchH*.29,w*.06,8,C.gold);
 
 
 
 // Under-counter drawers: both open and close, both store merchandise.
 const drawY=y+h*.855;
 drawer(g,hits,x+w*.065,drawY,w*.34,h*.117,"drawerL",s);
 drawer(g,hits,x+w*.585,drawY,w*.34,h*.117,"drawerR",s);
 // Local first-person arm stays above the drawers and below the UI.
 if(itemMotion?.sku) heldItemLayer(g,itemMotion,mat,x,y,w,benchY,benchH);
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
 t(g,"冬 夜 · 售 货 窗",76,headH*.47,land?17:16,C.cream);
 t(g,"第 "+s.day+" 天",W*.55,headH*.47,land?15:13,C.gold);
 t(g,isManager?"店长":"店员",W*.78,headH*.47,land?13:11,C.gold);
 t(g,"¥ "+s.cash,W-12,headH*.47,land?16:14,C.cream,"right");
 // Distinct landscape/portrait camera compositions: no stretching of a screenshot.
 const shop=land?{x:154,y:headH,w:W-300,h:H-headH-93}:{x:0,y:headH,w:W,h:H-headH-244};
 scene(g,hits,s,shop.x,shop.y,shop.w,shop.h,phase,motion,itemMotion,isManager);
 if(land){
  r(g,0,headH,154,shop.h,C.dark);
  t(g,"今日",17,headH+24,17,C.gold);t(g,"已服务 "+s.served+"/5",17,headH+52,14,C.cream);
  t(g,"营业额 ¥"+s.earnings,17,headH+77,12,C.cream);
  t(g,"值班 "+Object.keys(s.players).length+" 人",17,headH+101,12,C.cream);
  t(g,"货架扩容 "+(s.upgrades?.shelves??0)+"/2",17,headH+126,12,C.gold);
   t(g,"保温 "+((s.upgrades?.heating??0)?"已完成":"未改造"),17,headH+151,12,C.gold);
   t(g,"今日进货 ¥"+(s.dayExpenses||0),17,headH+176,12,C.cream);
   t(g,"口碑 "+(s.reputation||0)+"/100 · "+reputationLevel(s)+"级",17,headH+201,12,C.gold);
   t(g,"熟客小费 ¥"+(s.loyaltyTips||0)+" · 每单 +¥"+loyaltyTip(s),17,headH+226,12,C.cream);
  r(g,W-146,headH,146,shop.h,C.dark);
  t(g,"当前订单",W-130,headH+25,13,C.gold);
  t(g,visitor(s).name,W-130,headH+52,17,C.cream);
  t(g,GOODS[visitor(s).sku].name,W-130,headH+87,15,C.cream);
  t(g,"售价 ¥"+GOODS[visitor(s).sku].price,W-130,headH+110,13,C.cream);
  t(g,s.windowOpen?"营业中":"未开窗",W-130,headH+150,12,C.gold);
  const favor=visitor(s).favor;
  t(g,"邻里委托",W-130,headH+185,13,C.gold);
  t(g,!favor?"暂无":s.favorDone?"已完成 +¥"+favor.tip:s.spoken?GOODS[favor.sku].name+" +¥"+favor.tip:"交谈后了解",W-130,headH+211,12,C.cream);
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
  // The low landscape action bar is reserved for touch targets; move instructions to dialogue status.
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
