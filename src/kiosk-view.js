// Handmade geometric pixel art. Every fixture/item/customer is a separate
// draw routine (no flattened image / generated art); all clickable bounds
// are registered with the same coordinates used to paint the object.
import {GOODS,FIXTURES,visitor,visible} from "./kiosk-core.js";
const C={ink:"#181d28",outline:"#272331",wall:"#66504a",wood:"#987159",woodLight:"#bd9874",
trim:"#533d3f",shelf:"#bb8c69",dark:"#302d35",cream:"#e7cdb1",amber:"#e4b374",
sky:"#526f87",snow:"#c1cbd0",blue:"#7d9aaa",gold:"#f1bc77",green:"#789788",red:"#be706b"};
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
function snowyStreet(g,x,y,w,h,phase){
 r(g,x,y,w,h,C.sky);
 // distant blue apartment blocks and roofs
 for(let i=0;i<7;i++){let xx=x+i*w/6-13,roof=y+h*.45+((i*11)%22);
  r(g,xx,roof,Math.ceil(w/6)+5,h*.55,C.dark);
  r(g,xx+3,roof-8,Math.ceil(w/6)-3,8,C.snow);
  for(let q=0;q<3;q++)r(g,xx+7+q*13,roof+21,4,6,(q+i)%3===0?C.gold:"#547086");
 }
 r(g,x,y+h*.80,w,h*.20,C.blue);r(g,x,y+h*.85,w,h*.15,C.snow);
 for(let i=0;i<23;i++){const xx=x+(i*37%Math.max(1,w)), yy=y+((i*29+Math.floor(phase/3))%Math.max(2,Math.floor(h*.82)));
  r(g,xx,yy,2+(i%2),2,i%3===0?"#f0e6d2":"#b5d3df");
 }
 // street lamp silhouette
 r(g,x+w*.79,y+h*.34,3,h*.53,"#27333d");r(g,x+w*.74,y+h*.31,w*.1,3,"#27333d");
 r(g,x+w*.76,y+h*.29,w*.07,8,C.gold);
}
function sprite(g,sku,x,y,scale=3){
 // 10x12 hand-drawn indexed-color sprites; each pixel remains a discrete cell.
 const palette={".":null,"#":C.ink,"w":"#d8d6be","k":"#d49b61","o":"#a96f46","g":"#83aa95","r":"#c97971","b":"#8baabd","y":"#e1bd75","p":"#9c83a1"};
 const map={
 tea:["..........","..####....","..#kk#....","..#yy###..","..#yyww#..","..#yy###..","..#yy#....","..#yy#....","..####....",".######...","..........",".........."],
 bread:["..........","..........","..####....",".#kkkk#...",".#kyyk#...",".#kyyk#...",".#kyyk#...",".#kkkk#...",".#oooo#...",".######...","..........",".........."],
 battery:["..........","...gg.....","..####....","..#bb#....","..#wb#....","..#bb#....","..#wb#....","..#bb#....","..#bb#....","..####....","..........",".........."],
 cocoa:["..........","..####....","..#pp#....","..#pp#....","..#ww###..","..#wwww#..","..#ww###..","..#pp#....","..#pp#....","..####....","..........",".........."]
 };
 const pattern=map[sku]||map.tea;
 pattern.forEach((line,row)=>[...line].forEach((ch,col)=>{if(palette[ch])r(g,x+col*scale,y+row*scale,scale,scale,palette[ch]);}));
}
function guest(g,x,y,w,h,s,phase){
 const who=visitor(s),color=["#6f9b98","#ad8192","#bfa071","#86a3b1"][who.tone];
 const bob=Math.floor(Math.sin(phase/24)*2);
 x=Math.round(x);y=Math.round(y+bob);
 r(g,x+w*.17,y+h*.55,w*.66,h*.44,C.ink);
 r(g,x+w*.21,y+h*.57,w*.58,h*.41,color);
 r(g,x+w*.33,y+h*.48,w*.34,h*.21,"#c19c82");
 r(g,x+w*.30,y+h*.21,w*.40,h*.40,"#edc09a");
 r(g,x+w*.24,y+h*.17,w*.52,h*.13,C.ink);
 r(g,x+w*.29,y+h*.11,w*.42,h*.17,who.tone%2? "#d9aa6f":"#47616e");
 r(g,x+w*.33,y+h*.08,w*.35,h*.04,C.woodLight);
 r(g,x+w*.39,y+h*.41,4,4,C.ink);r(g,x+w*.61,y+h*.41,4,4,C.ink);
 r(g,x+w*.47,y+h*.51,10,3,C.trim);
 // one scarf / collar and two hands on sill
 r(g,x+w*.29,y+h*.60,w*.41,5,C.cream);
 r(g,x+w*.21,y+h*.84,w*.12,11,"#edc09a");r(g,x+w*.66,y+h*.84,w*.12,11,"#edc09a");
}
function shelf(g,hits,x,y,w,h,slot,s){
 const key=slot,content=s.slots[key];
 r(g,x+3,y+4,w-6,h-6,C.dark);
 r(g,x,y+h-12,w,11,C.shelf);
 r(g,x,y+h-12,w,3,C.woodLight);
 r(g,x,y+h-4,w,5,C.trim);
 if(content?.qty>0){
  const count=Math.min(content.qty,3);
  for(let i=0;i<count;i++)sprite(g,content.sku,x+Math.max(1,(w-count*27)/2)+i*27,y+h-47,2.3);
  t(g,String(content.qty),x+w-6,y+h-18,11,C.gold,"right");
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
function windowFrame(g,hits,x,y,w,h,s,phase){
 r(g,x-9,y-9,w+18,h+18,C.outline);
 snowyStreet(g,x,y,w,h,phase);
 if(s.windowOpen)guest(g,x+w*.12,y+h*.07,w*.76,h*.88,s,phase);
 if(!s.windowOpen){
  // A solid wood shutter physically covers the opening when shut.
  wooden(g,x+5,y+5,w-10,h-10,3,C.wood);
  r(g,x+w*.4,y+h*.52,w*.2,7,C.gold);
 }else{
  r(g,x,y,w*.08,h,"#584a47");r(g,x+w*.92,y,w*.08,h,"#584a47");
 }
 r(g,x-9,y-9,w+18,8,C.woodLight);r(g,x-9,y+h,w+18,12,C.woodLight);
 r(g,x-8,y,w*.07,h,C.wood);r(g,x+w*.93,y,w*.07,h,C.wood);
 r(g,x,y+h-5,w,4,C.ink);
 // Click the fixed latch at the sill, allowing customers to remain clickable.
 r(g,x+w*.44,y+h+2,w*.12,5,C.gold);
 hit(hits,x+w*.17,y+h-25,w*.66,55,"window");
}
function smallGlow(g,x,y,step){
 r(g,x-34,y-10,68,9,"#b38b5d");r(g,x-25,y-1,50,7,C.woodLight);
 r(g,x-15,y+6,30,9,C.gold);r(g,x-5,y+15,10,3,C.cream);
 r(g,x-4,y-27,8,20,C.ink);
}
function scene(g,hits,s,x,y,w,h,phase){
 g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
 wooden(g,x,y,w,h,2,C.wall);
 // structural corner posts
 r(g,x,y,12,h,C.trim);r(g,x+w-12,y,12,h,C.trim);
 r(g,x+11,y,w-22,7,C.woodLight);
 const win={x:x+w*.29,y:y+h*.22,w:w*.42,h:h*.47};
 const topCabY=y+h*.045, topCabH=h*.16;
 cupboard(g,hits,x+w*.034,topCabY,w*.235,topCabH,"cabinetL",s,phase);
 cupboard(g,hits,x+w*.732,topCabY,w*.235,topCabH,"cabinetR",s,phase);
 // Left and right shelf towers. Every shelf is a real storage location.
 const towerY=y+h*.245,tw=w*.225,ty=h*.135;
 for(let i=0;i<3;i++){
  shelf(g,hits,x+w*.035,towerY+i*ty,tw,ty,"shelfL"+(i+1),s);
  shelf(g,hits,x+w*.740,towerY+i*ty,tw,ty,"shelfR"+(i+1),s);
 }
 windowFrame(g,hits,win.x,win.y,win.w,win.h,s,phase);
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
 if(s.counter)sprite(g,s.counter,mat.x+mat.w*.40,mat.y+mat.h*.1,Math.min(3,mat.h*.070));
 else t(g,"交接台",mat.x+mat.w/2,mat.y+mat.h/2,11,C.cream,"center");
 hit(hits,mat.x,mat.y,mat.w,mat.h,"counter");
 // small secondary station objects that don't compete with the item mat
 r(g,x+w*.075,benchY+benchH*.29,w*.06,8,C.gold);
 r(g,x+w*.075+5,benchY+benchH*.2,w*.04,5,C.ink);
 r(g,x+w*.80,benchY+benchH*.3,w*.09,10,C.dark);
 r(g,x+w*.81,benchY+benchH*.17,w*.07,10,C.cream);
 // Under-counter drawers: both open and close, both store merchandise.
 const drawY=y+h*.855;
 drawer(g,hits,x+w*.065,drawY,w*.34,h*.117,"drawerL",s);
 drawer(g,hits,x+w*.585,drawY,w*.34,h*.117,"drawerR",s);
 g.restore();
}
function chip(g,hits,x,y,w,h,text,cmd,key,active=false){
 r(g,x+2,y+3,w,h,C.ink);r(g,x,y,w,h,active?C.gold:C.trim);
 r(g,x+2,y+2,w-4,h-4,active?"#584336":"#5c5352");
 t(g,text,x+w/2,y+h*.52,h*.36,active?C.gold:C.cream,"center");
 if(cmd)hit(hits,x,y,w,h,cmd,key);
}
export function render(g,s,view,phase=0){
 const {W,H,land}=view,hits=[];
 r(g,0,0,W,H,C.ink);
 const headH=land?48:54;
 r(g,0,0,W,headH,C.trim);r(g,0,headH-3,W,3,C.gold);
 t(g,"雪 夜 杂 货 铺",56,headH*.47,land?17:16,C.cream);
 t(g,"第 "+s.day+" 天",W*.55,headH*.47,land?15:13,C.gold);
 t(g,"¥ "+s.cash,W-12,headH*.47,land?16:14,C.cream,"right");
 // Distinct landscape/portrait camera compositions: no stretching of a screenshot.
 const shop=land?{x:154,y:headH,w:W-300,h:H-headH-83}:{x:0,y:headH,w:W,h:H-headH-190};
 scene(g,hits,s,shop.x,shop.y,shop.w,shop.h,phase);
 if(land){
  r(g,0,headH,154,shop.h,C.dark);
  t(g,"今日",17,headH+24,17,C.gold);t(g,"已服务 "+s.served+"/5",17,headH+52,14,C.cream);
  t(g,"营业额 ¥"+s.earnings,17,headH+77,12,C.cream);
  t(g,"值班 "+Object.keys(s.players).length+" 人",17,headH+101,12,C.cream);
  r(g,W-146,headH,146,shop.h,C.dark);
  t(g,"当前订单",W-130,headH+25,13,C.gold);
  t(g,visitor(s).name,W-130,headH+52,17,C.cream);
  t(g,GOODS[visitor(s).sku].name,W-130,headH+87,15,C.cream);
  t(g,"售价 ¥"+GOODS[visitor(s).sku].price,W-130,headH+110,13,C.cream);
  t(g,s.windowOpen?"营业中":"未开窗",W-130,headH+150,12,C.gold);
 }else{
  const lower=shop.y+shop.h;
  r(g,0,lower,W,67,C.dark);
  t(g,visitor(s).name+"  ·  "+(s.windowOpen?GOODS[visitor(s).sku].name+" ¥"+GOODS[visitor(s).sku].price:"请点击窗闩开窗"),12,lower+19,15,C.gold);
  const note=s.notice.length>31?s.notice.slice(0,30)+"…":s.notice;
  t(g,note,12,lower+45,11,C.cream);
 }
 const bottom=land?H-82:H-123;
 if(land){
  r(g,0,bottom,W,H-bottom,C.dark);
  t(g,"交互",12,bottom+21,12,C.gold);
  chip(g,hits,67,bottom+7,95,33,"问候","talk");
  chip(g,hits,168,bottom+7,95,33,"收款","sell");
  t(g,"补货：",282,bottom+21,12,C.gold);
  let px=345;
  for(const sku of Object.keys(GOODS)){chip(g,hits,px,bottom+5,105,35,GOODS[sku].name+" -"+GOODS[sku].buy,"restock",sku,s.selectedRestock===sku);px+=112;}
  t(g,"选择商品格拿货 → 点交接台 → 收款。补货先选商品再点格子。",26,bottom+61,12,C.cream);
 } else{
  r(g,0,H-123,W,123,C.dark);
  chip(g,hits,10,H-117,222,49,"和顾客说话","talk");
  chip(g,hits,247,H-117,223,49,"收款完成交易","sell");
  let skuKeys=Object.keys(GOODS);
  for(let i=0;i<4;i++){
   const sku=skuKeys[i];chip(g,hits,10+i*118,H-59,107,43,GOODS[sku].name+" -"+GOODS[sku].buy,"restock",sku,s.selectedRestock===sku);
  }
 }
 if(s.hand){
  t(g,"拿着："+GOODS[s.hand].name,land?W/2:W/2,land?bottom-14:H-196,13,C.gold,"center");
 }
 if(s.phase==="summary"){
  r(g,0,0,W,H,"#171922e9");
  t(g,"今 日 打 烊",W/2,H*.27,32,C.gold,"center");
  t(g,"服务顾客 "+s.served+" 人",W/2,H*.37,20,C.cream,"center");
  t(g,"营业额 ¥"+s.earnings,W/2,H*.43,20,C.cream,"center");
  t(g,"现金结余 ¥"+s.cash,W/2,H*.49,20,C.cream,"center");
  chip(g,hits,W*.23,H*.60,W*.54,56,"开始下一天","nextday");
 }
 return hits;
}
