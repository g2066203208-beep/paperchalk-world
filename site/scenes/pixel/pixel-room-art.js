/**
 * 480x300 authored pixel room set — same palette and pixel density as outdoor.
 * Paint only. All interactions, saves and employment logic stay with scene and systems.
 */
import {PIXEL_PALETTE as P} from './pixel-city-art.js';
const box=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x|0,y|0,w|0,h|0);};
const rnd=(seed,i)=>{let n=Math.imul(seed+i*15137,1664525)+1013904223|0;return ((n^(n>>>13))>>>0)/4294967296;};
function plant(c,x,y){
 box(c,x+7,y+19,14,12,'#745f51');box(c,x+9,y+17,10,3,'#a88767');
 for(const [dx,dy,w,h] of [[11,3,7,16],[3,8,13,10],[16,7,11,12],[8,0,9,9]]){
  box(c,x+dx,y+dy,w,h,'#476951');
  box(c,x+dx+3,y+dy+2,4,4,'#84a079');
 }
}
function shelf(c,x,y,seed){
 box(c,x,y,90,11,P.ink);box(c,x+4,y+6,82,8,'#8f6552');
 for(let row=0;row<3;row++){
  let top=y+14+row*22;
  box(c,x+4,top,82,19,'#5f5049');
  for(let i=0;i<9;i++){
   let col=i%3===0?'#d3aa76':i%3===1?'#668886':'#c5776e';
   box(c,x+8+i*8,top+3,5+Math.floor(rnd(seed,i+row)*2),11+Math.floor(rnd(seed+4,i)*4),col);
   box(c,x+8+i*8,top+2,5,2,'#ead7b6');
  }
  box(c,x,top+19,90,5,P.ink);box(c,x+4,top+19,82,3,'#a88767');
 }
 box(c,x+2,y+13,5,68,P.ink);box(c,x+83,y+13,5,68,P.ink);
}
function table(c,x,y,seed){
 box(c,x+5,y+29,4,28,P.ink);box(c,x+56,y+29,4,28,P.ink);
 box(c,x,y+22,69,14,P.ink);box(c,x+5,y+22,59,8,'#b78b6e');
 box(c,x+13,y+18,18,5,'#e0d2ab');
 if(seed%2===0){box(c,x+44,y+10,13,12,'#58777c');box(c,x+48,y+6,6,4,P.light);}
 else{box(c,x+42,y+17,17,4,P.rustLight);box(c,x+47,y+12,7,5,P.light);}
}
function bed(c,x,y){
 box(c,x,y,96,56,P.ink);box(c,x+5,y+4,86,46,'#94675c');
 box(c,x+10,y+8,27,14,'#e3d4b8');
 box(c,x+10,y+24,76,20,'#779a95');
 for(let i=0;i<8;i++)box(c,x+10+i*9,y+44,5,3,'#477780');
 box(c,x+10,y+51,5,8,P.ink);box(c,x+81,y+51,5,8,P.ink);
}
function cooker(c,x,y){
 box(c,x,y,80,42,P.ink);box(c,x+4,y+4,72,38,'#96a4a0');
 for(let i=0;i<4;i++){let px=x+8+(i%2)*39,py=y+7+Math.floor(i/2)*16;box(c,px,py,22,12,'#536b72');box(c,px+5,py+3,12,6,P.ink);}
 box(c,x,y+42,80,22,'#79898a');
 for(let i=0;i<4;i++)box(c,x+9+i*18,y+52,8,5,P.gold);
}
function machine(c,x,y,seed){
 box(c,x+2,y,104,83,P.ink);
 box(c,x+8,y+5,94,65,'#728889');
 box(c,x+16,y+12,42,37,'#263e49');
 box(c,x+20,y+16,34,29,seed%2?'#578a83':'#4b697b');
 box(c,x+65,y+9,26,9,P.gold);
 for(let i=0;i<3;i++)box(c,x+67+i*8,y+29,5,5,i%2?P.rustLight:'#d4cfac');
 box(c,x+61,y+48,34,11,'#344c56');
 box(c,x+13,y+72,20,16,'#424f57');box(c,x+78,y+72,20,16,'#424f57');
 box(c,x+44,y-19,15,22,P.ink);box(c,x+48,y-29,6,12,'#9b8e87');
}
function hospital(c,x,y){
 box(c,x,y,100,57,P.ink);box(c,x+5,y+5,90,47,'#e0d8c4');
 box(c,x+9,y+10,82,14,'#88a59d');
 box(c,x+13,y+33,74,15,'#a8aaa1');
 box(c,x+41,y+10,9,25,'#c37671');box(c,x+33,y+18,25,9,'#c37671');
}
function lamp(c,x,y,day){
 box(c,x-16,y-7,32,8,P.ink);box(c,x-8,y,16,13,day===3?'#f6d58c':'#cbb98f');
 box(c,x-4,y+13,8,6,'#aa9271');
}
function rug(c,x,y,seed){
 box(c,x,y,115,62,'#765f61');box(c,x+5,y+5,105,52,'#bd9a8a');
 for(let i=0;i<18;i++){
  let px=x+9+(i%9)*11,py=y+8+Math.floor(i/9)*33;
  box(c,px,py,7,9,i%2?'#987c72':'#d4b2a0');
 }
}
function drawRoom(c,room,index,seed,kind,shift){
 const x=Math.round(room.x/100*480),y=Math.round(room.y/100*300);
 const w=Math.round(room.w/100*480),h=Math.round(room.h/100*300);
 box(c,x-5,y-5,w+10,h+10,P.ink);
 box(c,x,y,w,h,['#ab9e86','#9bafa3','#b6a18b','#ada49a'][index]);
 for(let yy=y;yy<y+h;yy+=10){
  box(c,x,yy,w,1,'#746d6255');
  for(let xx=x+(yy%20===0?0:10);xx<x+w;xx+=20)box(c,xx,yy,1,9,'#847b6a52');
 }
 box(c,x+8,y+5,w-16,4,'#e5d1b3');
 box(c,x+8,y+9,w-16,2,'#79685c');
 // Each room's fixture plan uses a unique seed but has a recognizable function.
 const fx=x+18,fy=y+15;
 if(kind==='store'){
  if(index===0){table(c,fx+12,fy+10,seed);plant(c,x+w-42,y+30);}
  else if(index===1)shelf(c,fx+15,fy-1,seed);
  else if(index===2){shelf(c,fx+7,fy-3,seed+3);box(c,fx+112,fy+28,27,22,P.rust);}
  else{table(c,fx+18,fy+4,seed);box(c,fx+22,fy+19,18,16,P.ink);box(c,fx+24,fy+22,14,10,'#667f87');}
 }else if(kind==='workshop'){
  if(index<2){machine(c,fx+4,fy+11,seed+index);box(c,fx+121,fy+58,22,18,P.rust);}
  else if(index===2){table(c,fx+30,fy+10,seed);lamp(c,x+w-24,y+35,shift);}
  else{shelf(c,fx+14,fy,seed);box(c,fx+113,fy+46,26,29,'#8b6f59');}
 }else if(kind==='civic'){
  if(index===0){table(c,fx+28,fy+10,seed);plant(c,x+w-40,y+43);}
  else if(index===1){hospital(c,fx+25,fy+9);lamp(c,x+w-26,y+40,shift);}
  else if(index===2){table(c,fx+24,fy+10,seed);shelf(c,fx+107,fy+6,seed);}
  else{shelf(c,fx+12,fy-1,seed+2);}
 }else{
  if(index===0){rug(c,fx+24,fy+19,seed);table(c,fx+29,fy+15,seed);}
  else if(index===1)cooker(c,fx+23,fy+12);
  else if(index===2)bed(c,fx+25,fy+11);
  else{shelf(c,fx+18,fy-1,seed);plant(c,x+w-36,y+33);}
 }
 // Low pixel highlights, room labels are accessible as DOM controls on top.
 for(let i=0;i<4;i++){
  box(c,x+12+i*22,y+h-12,7,3,'#cfbb9b');
 }
}
export function paintPixelInterior(canvas,info,shift=1){
 if(!canvas||!info?.layout?.length)throw Error('Pixel room requires canvas and interior layout');
 canvas.width=480;canvas.height=300;
 const c=canvas.getContext('2d',{alpha:false});c.imageSmoothingEnabled=false;
 box(c,0,0,480,300,'#293b48');
 for(let y=0;y<300;y+=12)for(let x=0;x<480;x+=12){
  box(c,x,y,12,12,(x+y)%24===0?'#7f7a70':'#8a8677');
  box(c,x,y,12,1,'#a59782');
 }
 info.layout.forEach((room,i)=>drawRoom(c,room,i,info.fixtureSeed,info.room,shift));
 // The short central doorway connects the quadrants without painting over hotspots.
 box(c,221,123,38,50,'#d0bd9c');box(c,226,128,28,40,'#7d7061');
 box(c,233,136,14,23,'#e0c9a7');box(c,244,149,3,3,P.gold);
 return {width:canvas.width,height:canvas.height,template:info.template,room:info.room};
}
