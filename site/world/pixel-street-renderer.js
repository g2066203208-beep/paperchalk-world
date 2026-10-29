/**
 * Original, procedural 2D pixel-art renderer for Night Harbor.
 * 480x300 native frame, displayed at 2x. Art and physics are separate.
 * No images or art copied from reference games.
 */
import {terrainAt} from './national-atlas.js';
export const PIXEL_W=480,PIXEL_H=300;
const palette={
 ink:'#213340',dark:'#354958',stone:'#8d9d99',pavement:'#a5a69a',road:'#4c5963',
 edge:'#d1bc9c',brick:'#b98b79',brickShade:'#936d69',light:'#f0ce93',
 pine:'#4d7568',grass:'#798e75',water:'#4f8295',field:'#acac73',white:'#f7e5c6'
};
const px=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
const h=(x,y,seed=0)=>{let n=(Math.imul(x+seed+12,374761393)^Math.imul(y+seed+3,668265263))>>>0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
function font(c,label,x,y,size=7){
 c.font='bold '+size+'px monospace';c.textAlign='center';
 c.fillStyle=palette.ink;c.fillText(label,x+1,y+1);c.fillStyle=palette.white;c.fillText(label,x,y);
}
function tree(c,x,y,seed=0){
 px(c,x-2,y+5,4,9,'#61544c');
 px(c,x-8,y-10,16,14,'#365c52');px(c,x-12,y-5,24,10,'#487366');
 px(c,x-9,y-13,18,9,seed%2?'#527c6b':'#608c75');
 px(c,x-4,y-13,5,3,'#9db094');px(c,x+5,y-4,4,2,'#8fab8c');
}
function lamppost(c,x,y,night){
 px(c,x,y-28,2,29,palette.ink);px(c,x-3,y-28,8,2,'#334853');
 px(c,x-2,y-27,6,5,night?'#f2cf8c':'#b3b1a2');
 if(night){px(c,x-7,y-21,17,2,'#d6b16a50');px(c,x-10,y-17,23,2,'#d6b16a30');}
}
function build(c,b,night,time){
 const x=Math.round(b.x/2),y=Math.round(b.y/2),w=Math.round(b.w/2),height=35;
 const seed=Math.floor(h(x,y,18)*1000),shop=/店|餐|银行|市|铺|诊所|咖啡|报社|旅馆/.test(b.name);
 px(c,x+4,y+4,w,height+6,'#283d47');
 px(c,x,y,w,height,'#344b57');
 px(c,x+3,y+4,w-6,height-4,b.tint||palette.brick);
 // Brick courses, staggered and genuinely pixel-grid aligned.
 for(let fy=y+7;fy<y+height-3;fy+=7){
  px(c,x+3,fy,w-6,1,'#604d4d55');
  for(let bx=x+((fy/7|0)%2?9:3);bx<x+w-3;bx+=15)px(c,bx,fy-6,1,6,'#443e4255');
 }
 px(c,x-3,y-5,w+6,6,'#334957');px(c,x,y-7,w,3,'#6d6668');
 for(let j=0;j<2+(seed%2);j++){
  const wx=x+6+j*11;
  if(wx+8>x+w-4)break;
  px(c,wx,y+8,8,12,'#293e4b');px(c,wx+1,y+9,6,9,night?'#f1c688':'#8aaab4');
  px(c,wx+4,y+9,1,9,'#d9c9aa');px(c,wx,y+19,8,2,'#e1c8a5');
  if(night)px(c,wx+2,y+10,2,2,'#fff0bb');
 }
 if(shop){
  px(c,x+3,y+23,w-6,3,seed%2?'#8b565c':'#5c7778');
  px(c,x+4,y+26,w-8,4,seed%2?'#c49f76':'#d1b58b');
  px(c,x+5,y+27,4,3,'#d7b57b');px(c,x+w-9,y+27,3,3,'#e3b58e');
 }
 const door=Math.round(b.doorX/2),dy=Math.round((b.y+b.h-22)/2);
 px(c,door-5,dy,10,11,'#243744');px(c,door-4,dy+2,8,9,'#526774');
 px(c,door+2,dy+5,1,1,'#f4c893');px(c,door-6,dy+11,12,2,'#d2baa1');
 // Real awnings, drainpipe, power meter and cargo crates.
 px(c,x+w-5,y+2,2,height-3,'#465d5c');
 if(seed%3===0){px(c,x+2,y+height-7,7,6,'#66564c');px(c,x+3,y+height-9,6,2,'#d2af83');}
 if(seed%4===0){px(c,x-5,y+14,4,6,'#b9b19e');px(c,x-4,y+15,2,3,'#4c5f61');}
 font(c,b.name,x+w/2,y-9,6);
}
export function drawPixelCharacter(c,x,y,color='#a4545b',frame=0,name=''){
 x=Math.round(x/2);y=Math.round(y/2);
 px(c,x-5,y+2,11,3,'#273c4788');
 const bob=Math.sin(frame*7)>0?1:0;
 // Each anatomy section is 2-5 px, not an anti-aliased vector.
 px(c,x-3,y-13+bob,6,9,'#2b4053');px(c,x-4,y-13+bob,8,6,color);
 px(c,x-5,y-10+bob,2,6,color);px(c,x+3,y-10+bob,2,6,color);
 px(c,x-3,y-4,2,6,'#263845');px(c,x+1,y-4+(bob?1:0),2,6,'#263845');
 px(c,x-3,y-21+bob,6,7,'#d8ad91');
 px(c,x-4,y-22+bob,8,3,'#28343c');px(c,x-2,y-17+bob,1,1,'#28343c');
 px(c,x+2,y-17+bob,1,1,'#28343c');
 if(name)font(c,name,x,y-27,7);
}
function car(c,x,y,seed=0){
 x=Math.round(x/2);y=Math.round(y/2);
 px(c,x-12,y-3,24,8,'#263845');px(c,x-10,y-5,19,9,['#965c59','#729293','#bd9e77','#777b8e'][seed%4]);
 px(c,x-4,y-5,9,3,'#aac7c4');px(c,x-8,y+3,4,2,'#232e36');px(c,x+6,y+3,4,2,'#232e36');
 px(c,x-11,y+1,2,2,'#f7cd86');px(c,x+9,y+1,2,2,'#c55e5d');
}
export function drawPixelStreet(c,site,elapsed,shift,traffic,player,follow){
 const terrain=terrainAt(site.x,site.y)?.terrain,night=shift===3;
 const background=terrain==='forest'?palette.pine:terrain==='fields'?palette.field:
 terrain==='sea'?palette.water:palette.pavement;
 px(c,0,0,PIXEL_W,PIXEL_H,background);
 // Nationally deterministic ground texture, no large flat rectangles.
 for(let i=0;i<2100;i++){
  const x=Math.floor(h(i,site.x,413)*PIXEL_W),y=Math.floor(h(i,site.y,397)*PIXEL_H);
  px(c,x,y,i%4?2:3,1,i%3?'#304f4840':'#f3d6a637');
 }
 for(let y=57;y<PIXEL_H;y+=75){
  px(c,0,y,PIXEL_W,19,palette.road);px(c,0,y-4,PIXEL_W,4,'#b8b09d');
  px(c,0,y+16,PIXEL_W,3,'#a8a69a');
  for(let x=0;x<PIXEL_W;x+=35)px(c,x+7,y+9,13,1,'#d9c79b');
  for(let x=14;x<PIXEL_W;x+=78){for(let k=0;k<4;k++)px(c,x+k*3,y+1,2,4,'#e6d6c0');}
 }
 for(let x=65;x<PIXEL_W;x+=79){
  px(c,x,0,13,PIXEL_H,'#525f66');
  px(c,x-3,0,3,PIXEL_H,'#b9b2a2');px(c,x+13,0,2,PIXEL_H,'#b6b19f');
  for(let y=0;y<PIXEL_H;y+=32)px(c,x+6,y,1,13,'#dfd3ac');
 }
 // Scene-specific props and planting, always deterministic per tile.
 for(let i=0;i<57;i++){
  const x=Math.floor(h(i+site.x,site.y,74)*PIXEL_W),y=Math.floor(h(i+site.y,site.x,88)*PIXEL_H);
  if(site.buildings.some(b=>x*2>b.x-12&&x*2<b.x+b.w+12&&y*2>b.y-12&&y*2<b.y+b.h+12))continue;
  if(i%4===0)tree(c,x,y,i);
  else if(i%4===1)lamppost(c,x,y,night);
  else if(i%4===2){px(c,x,y,4,7,'#58757a');px(c,x-1,y,6,2,'#a1b5ab');}
  else{px(c,x,y,3,2,'#c5b392');px(c,x+4,y+2,2,2,'#776b5c');}
 }
 for(const b of site.buildings)build(c,b,night,elapsed);
 const t=elapsed*.001;
 if(!night)for(let i=0;i<traffic;i++){
  const horizontal=i%3!==0,road=Math.floor(i/3);
  const x=horizontal?((i%2?1:-1)*(t*(35+i*4))+i*177)%1160:
   137+(road%5)*158;
  const y=horizontal?133+(road%3)*150:((t*(27+i*2)+i*100)%760)-80;
  car(c,(x+1160)%1160-100,y,i);
 }
 for(let i=0;i<site.people.length;i++){
  const p=site.people[i];
  drawPixelCharacter(c,p.x+Math.sin(t*.35+i)*Math.min(20,18+p.drift),
   p.y+Math.sin(t*.6+i)*3,['#84708d','#5e8885','#ad706c','#89825c'][i%4],t+i);
 }
 if(night)px(c,0,0,PIXEL_W,PIXEL_H,'#14274455');
 else if(shift===2)px(c,0,0,PIXEL_W,PIXEL_H,'#bd795a1a');
 if(player){
  const x=Math.round(player.x/2),y=Math.round(player.y/2);
  c.strokeStyle='#f3d48a';c.lineWidth=1;c.strokeRect(x-9,y-23,18,28);
  drawPixelCharacter(c,player.x,player.y,'#b75262',t,'你');
 }
 if(follow){
  const x=Math.round(follow.doorX/2),y=Math.round(follow.doorY/2);
  c.strokeStyle='#ffe39b';c.lineWidth=2;c.strokeRect(x-9,y-8,18,16);
  font(c,'前往 '+follow.name,x,y+18,7);
 }
}
