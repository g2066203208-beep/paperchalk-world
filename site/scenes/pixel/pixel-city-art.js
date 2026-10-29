/**
 * Original authored pixel-art rendering for Night Harbor.
 * 480x300 native-pixel framebuffer, world coordinates 960x600, crisp 2x scale.
 * This module owns VISUALS ONLY: movement/collision/saves stay in walkable-street.js.
 * No third-party sprites, screenshots or visual assets.
 */
import {terrainAt,regionAt} from '../../world/national-atlas.js';
export const PIXEL_VIEW={width:480,height:300,worldWidth:960,worldHeight:600};
export const PIXEL_PALETTE=Object.freeze({
 ink:'#243544',night:'#182737',stone:'#9b9b8c',edge:'#e6d2b1',
 road:'#4e6067',roadDark:'#3b4d56',roadMark:'#cbbd8f',brick:'#a96f68',
 brickLight:'#cd9080',plaster:'#d0b99b',plasterDark:'#958d7f',
 sea:'#527f90',seaLight:'#8ab3b8',leaf:'#4b725b',leafLight:'#83a178',
 leafShadow:'#35584d',rust:'#955a55',rustLight:'#ce866b',
 gold:'#e8b971',light:'#f4d9a0',teal:'#668f91'
});
const P=PIXEL_PALETTE;
const snap=v=>Math.floor(v/4)*4;
function r(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(snap(x),snap(y),Math.max(4,snap(w)),Math.max(4,snap(h)));}
function small(c,x,y,color){r(c,x,y,4,4,color);}
function line(c,x,y,w,h,color){r(c,x,y,w,h,color);}
function noise(seed,index=0){let v=Math.imul((seed+index*2777)|0,1664525)+1013904223|0;v=Math.imul(v^(v>>>13),2246822519);return ((v^(v>>>16))>>>0)/4294967295;}
function sign(c,label,x,y,width=80,kind='') {
 const strip=kind==='industrial'?P.ink:kind==='harbor'?P.teal:kind==='retail'?P.rust:'#424e57';
 r(c,x-width/2,y,width,16,strip);r(c,x-width/2,y+12,width,4,P.ink);
 c.save();c.font='bold 11px sans-serif';c.textAlign='center';c.textBaseline='middle';
 c.lineWidth=2;c.strokeStyle=P.ink;c.fillStyle='#ffe8c8';
 c.strokeText(label,x,y+7,width-8);c.fillText(label,x,y+7,width-8);c.restore();
}
function tree(c,x,y,seed){
 r(c,x-5,y-17,12,35,P.ink);r(c,x,y-16,4,32,'#9b775b');
 r(c,x-18,y-42,34,14,P.leafShadow);
 r(c,x-26,y-34,54,26,P.leaf);
 r(c,x-20,y-48,40,16,P.leaf);
 r(c,x-12,y-54,24,12,P.leafLight);
 for(let k=0;k<4;k++){
  const xx=x-18+(noise(seed,k)*32)|0,yy=y-38+(noise(seed+11,k)*20)|0;
  small(c,xx,yy,k%2?'#a5b184':P.leafLight);
 }
}
function lamp(c,x,y,shift){
 r(c,x-4,y-38,8,48,P.ink);r(c,x-8,y-42,16,8,'#435864');
 r(c,x-12,y-34,24,4,P.ink);
 r(c,x-8,y-38,16,8,shift>=2?P.light:'#9badad');
 if(shift>=2){r(c,x-12,y-30,24,8,'#e3c18266');r(c,x-18,y-20,36,8,'#dfbd7250');}
}
function crate(c,x,y,tone=P.rust){
 r(c,x,y,20,16,P.ink);r(c,x+4,y+4,12,8,tone);
 r(c,x+8,y+4,4,8,'#ceac87');r(c,x+4,y+8,12,4,'#81564e');
}
function stall(c,x,y,seed){
 r(c,x-12,y+4,40,16,'#68584f');
 r(c,x-16,y-8,48,12,seed%2?P.rustLight:'#73968b');
 for(let i=0;i<6;i++){
  r(c,x-16+i*8,y-8,4,12,'#ead2aa');
  small(c,x-7+i*6,y+4,i%2?'#aeb573':'#9c6d5a');
 }
 r(c,x-12,y+20,4,8,P.ink);r(c,x+20,y+20,4,8,P.ink);
}
function building(c,b,seed,shift){
 const px=snap(b.x),py=snap(b.y),w=snap(b.w),h=snap(b.h);
 const industrial=/(厂|矿|仓|铁路|站|船坞|货|机)/.test(b.name);
 const harbor=/(海|港|码头|渔|鱼|船)/.test(b.name);
 const retail=/(店|餐|铺|市|银行|旅馆|咖啡)/.test(b.name);
 const institutional=/(学校|医院|诊所|市政|图书)/.test(b.name);
 const facade=industrial?'#7f8f8e':harbor?'#8f8b80':retail?'#bb9a85':
  institutional?'#b8b9a9':seed%3===0?'#b4786f':seed%3===1?'#c3aa8f':'#9da49d';
 const shadow=industrial?'#485b64':'#5b6662';
 // Strong cast shadow and distinct 3/4 side wall keep silhouettes readable.
 r(c,px+8,py+8,w+6,h+16,'#29384488');
 r(c,px-4,py-4,w+12,h+8,P.ink);
 r(c,px+4,py+4,w-4,h-4,facade);
 r(c,px+w-12,py+4,12,h-4,shadow);
 // Individual roof silhouettes: factory shed / gable roof / terrace / old tiles.
 if(industrial){
  r(c,px-8,py-18,w+20,22,'#425560');
  for(let x=0;x<w;x+=12)r(c,px+x,py-14,4,12,'#73888b');
  r(c,px+w-24,py-44,12,32,P.ink);r(c,px+w-20,py-46,8,8,'#9d796b');
 }else if(seed%4===0||harbor){
  r(c,px-8,py-18,w+16,20,'#504e53');
  r(c,px+8,py-30,w-16,12,'#6f5b59');
  for(let x=4;x<w-8;x+=12)r(c,px+x,py-12,8,4,'#9c7c70');
 }else{
  r(c,px-8,py-14,w+16,14,'#6f5657');
  r(c,px-4,py-20,w+8,8,'#a1776e');
  for(let x=4;x<w;x+=16)r(c,px+x,py-20,8,4,'#cf967c');
 }
 r(c,px,py+h-8,w,8,'#5e5b5b');
 // Bricks, cracks and age. Facades are no longer flat filled boxes.
 for(let row=0;row<4;row++)for(let col=0;col<8;col++){
  const xx=px+4+col*12+(row%2)*6,yy=py+12+row*13;
  if(xx>=px+w-13||yy>=py+h-15)continue;
  if(noise(seed,col+row*11)>.67)r(c,xx,yy,8,4,industrial?'#99a6a0':'#d2ad91');
 }
 const windowCount=industrial?3:Math.max(2,Math.min(4,b.floors+1));
 for(let i=0;i<windowCount;i++){
  const wx=snap(px+10+i*(w-24)/windowCount),wy=py+14;
  r(c,wx-4,wy-4,20,28,P.ink);r(c,wx,wy,12,18,shift>=2?'#e1bd75':'#517383');
  r(c,wx+4,wy,4,18,shift>=2?'#f2d394':'#8db4b1');
  r(c,wx,wy+8,12,4,P.ink);r(c,wx-4,wy+20,20,4,'#d2b898');
  if(i===1&&seed%3===0)r(c,wx+12,wy,4,12,'#c3c0a7');
 }
 // Doors line up with the pathfinding target at doorX/doorY.
 const doorX=snap(b.doorX-10);
 r(c,doorX-4,py+h-32,28,36,P.ink);
 r(c,doorX,py+h-28,20,28,retail?'#527786':'#715e59');
 r(c,doorX+12,py+h-16,4,4,P.gold);
 r(c,doorX-8,py+h,36,8,'#a19b88');
 if(retail){
  // Independent shopfront, striped canopy, glazed showcase and shelf silhouettes.
  r(c,px+4,py+h-34,27,18,P.ink);
  r(c,px+8,py+h-30,19,12,'#799a9c');
  r(c,px+8,py+h-23,19,5,'#cfa980');
  for(let j=0;j<5;j++)r(c,px+2+j*7,py+h-39,7,8,j%2?'#f1d5a6':'#bd7270');
  r(c,px+4,py+h-16,24,12,'#415e69');
  r(c,px+4,py+h-20,24,4,P.rust);
  r(c,px+4,py+h-24,24,4,P.edge);
 }else if(industrial){
  r(c,px+2,py+h-28,24,28,'#344d55');
  r(c,px+6,py+h-20,16,4,'#a5a68a');
 }
 // Reflect different venue functions through identity and signage.
 const label= b.name.length>6?b.name.slice(0,6):b.name;
 sign(c,label,px+w*.5,py-2,w-8,industrial?'industrial':harbor?'harbor':retail?'retail':'');
 if(institutional){
  r(c,px+w-24,py+15,16,16,'#e5d5bd');
  r(c,px+w-17,py+16,4,12,'#ad5f5c');
  r(c,px+w-21,py+20,12,4,'#ad5f5c');
 }
 if(harbor){r(c,px-5,py+h-15,18,10,'#a77660');r(c,px+1,py+h-22,6,8,'#d3ba8c');}
 if(seed%4===2){r(c,px+4,py+h-6,12,4,'#416a67');r(c,px+16,py+h-6,8,4,'#527a67');}
}

function pocketPark(c,x,y,seed){
 // Vacant lots become small public spaces, not empty beige rectangles.
 r(c,x-3,y-8,111,91,'#6c8072');r(c,x+1,y-4,103,83,'#8aa07e');
 for(let i=0;i<5;i++){r(c,x+i*22,y+34,20,14,'#aaa990');r(c,x+i*22,y+39,20,4,'#c0ba98');}
 tree(c,x+20,y+31,seed);tree(c,x+85,y+37,seed+3);
 r(c,x+41,y+11,20,16,'#e0c397');r(c,x+45,y+15,12,8,'#7d9795');
 r(c,x+41,y+27,20,4,P.ink);
 r(c,x+35,y+63,35,6,'#65594f');r(c,x+39,y+69,4,11,P.ink);
 r(c,x+62,y+69,4,11,P.ink);
 for(let i=0;i<9;i++){
  const xx=x+7+Math.floor(noise(seed,i)*95),yy=y+8+Math.floor(noise(seed+4,i)*65);
  small(c,xx,yy,i%2?'#d5b68e':'#f0cbad');
 }
}
function pavement(c,x,y,seed){
 r(c,x,y,32,32,seed%3===0?'#9d9e91':'#a7a89a');
 r(c,x,y,32,4,'#b5b5a4');r(c,x+8,y+16,16,4,'#898e84');
 if(seed%9===0)small(c,x+16,y+8,'#61685f');
}
function staticScene(c,site){
 const {x,y,buildings}=site,env=terrainAt(x,y),biome=regionAt(x,y).biome;
 const coastal=/(sea|river|lake)/.test(env.terrain)||['harbor','shipyard','fishing'].includes(biome);
 const rural=env.terrain==='forest'||env.terrain==='fields';
 r(c,0,0,960,600,rural?'#839783':coastal?'#879a93':'#9a998a');
 for(let cy=0;cy<600;cy+=32)for(let cx=0;cx<960;cx+=32){
  const seed=Math.floor(noise(x*293+y*71+cx,cy,6)*100);
  pavement(c,cx,cy,seed);
 }
 // Sidewalk grids, damaged city asphalt, road markings and crossings.
 for(let yy=112;yy<600;yy+=150){
  r(c,0,yy-14,960,14,'#cdbba3');
  r(c,0,yy,960,38,P.roadDark);r(c,0,yy+6,960,26,P.road);
  r(c,0,yy+38,960,8,'#736e67');
  for(let xx=0;xx<960;xx+=62)r(c,xx+8,yy+18,30,4,P.roadMark);
  for(let xx=90;xx<960;xx+=158){
   r(c,xx-18,yy-3,28,40,'#566670');
   for(let i=0;i<4;i++)r(c,xx-16,yy+4+i*9,24,4,'#dbc8a9');
  }
  for(let i=0;i<10;i++){
   const xx=Math.floor(noise(x*81+y+yy,i,3)*960);
   r(c,xx,yy+10,24,4,'#43565b');
   r(c,xx+8,yy+14,8,4,'#5a7072');
  }
 }
 for(let xx=128;xx<960;xx+=158){
  r(c,xx-10,0,8,600,'#cabba4');
  r(c,xx-2,0,28,600,P.road);
  r(c,xx+26,0,8,600,'#b3a894');
  for(let yy=0;yy<600;yy+=72)r(c,xx+12,yy+8,4,30,P.roadMark);
  for(let yy=104;yy<600;yy+=150){
   for(let i=0;i<4;i++)r(c,xx-6+i*9,yy-14,4,18,'#e3cdaa');
  }
 }
 if(coastal){
  // A narrow saltwater basin along the coastal edge, static waves and mooring.
  r(c,0,560,960,40,'#456e83');
  r(c,0,556,960,8,'#d8c7a8');
  for(let i=0;i<44;i++){
   const bx=Math.floor(noise(x+y,i,541)*960);
   r(c,bx,564+Math.floor(noise(x+y,i,210)*8)*4,16,4,i%2?'#89acaf':'#7f9da4');
  }
  for(let i=0;i<12;i++){let xx=i*86;r(c,xx,548,8,22,P.ink);r(c,xx-4,548,16,4,'#a98b72');}
 }
 if(rural){
  for(let i=0;i<52;i++){
   const bx=Math.floor(noise(x*44+y,i,642)*960);
   const by=Math.floor(noise(x+y*21,i,278)*600);
   if(buildings.some(b=>bx>b.x-22&&bx<b.x+b.w+20&&by>b.y-30&&by<b.y+b.h+28))continue;
   if((by%150)>=102&&by%150<=145)continue;
   if(i%3===0)tree(c,bx,by,i+x+y);
   else{
    r(c,bx,by,20,4,i%2?'#d1c189':'#5b8063');
    for(let d=0;d<4;d++)small(c,bx+d*4,by-4,'#789966');
   }
  }
 }else{
  for(let i=0;i<34;i++){
   const bx=Math.floor(noise(x*91,y*17,i)*960);
   const by=Math.floor(noise(y*82,x*16,i+40)*600);
   if(buildings.some(b=>bx>b.x-20&&bx<b.x+b.w+20&&by>b.y-36&&by<b.y+b.h+22))continue;
   if((bx%158)>113&&i%3===0)tree(c,bx,by,i+23);
   else if(i%4===0)crate(c,bx,by,i%2?'#af8b65':'#8f6c63');
  }
 }
 for(let row=0;row<4;row++)for(let col=0;col<6;col++){
  const lx=25+col*158,ly=24+row*150;
  if(!buildings.some(b=>b.x===lx&&b.y===ly))pocketPark(c,lx,ly,x*100+y*11+row*6+col);
 }
 for(let i=0;i<buildings.length;i++){
  const b=buildings[i],seed=Math.floor(noise(x+y,b.x*8+b.y,425)*100000);
  building(c,b,seed,0);
  // Neighbourhood decoration varies by physical building identity.
  const ax=b.x+b.w-4,ay=b.y+b.h+13;
  if(i%4===0)lamp(c,ax,ay,0);
  if(i%5===1)crate(c,b.x+5,ay,'#95775c');
  if(i%7===2)stall(c,b.x+13,ay+8,seed);
  if(i%7===3)r(c,b.x+9,ay-7,24,4,'#4d6f60');
 }
}
function pixelVehicle(c,x,y,index,kind='car'){
 const col=['#af6360','#59858e','#d1a970','#a09d8a','#66796a'][index%5];
 const bus=index%8===0,lorry=index%7===0;
 const w=bus?52:lorry?48:34;
 r(c,x-w/2+4,y+5,w,14,'#29394477');
 r(c,x-w/2,y-6,w,16,P.ink);
 r(c,x-w/2+4,y-6,w-8,14,col);
 r(c,x-w/2+6,y-10,w-16,8,col);
 r(c,x-w/2+12,y-8,w-24,8,lorry?'#bcb3a3':'#93b4b5');
 r(c,x-w/2+4,y+8,8,4,P.ink);r(c,x+w/2-12,y+8,8,4,P.ink);
 r(c,x+w/2-8,y,4,4,index%2?P.light:'#e9ac84');
 if(bus){r(c,x-w/2+7,y-10,8,8,'#92aeaf');r(c,x+w/2-17,y-10,8,8,'#92aeaf');}
 if(lorry){r(c,x-w/2-8,y-4,16,14,'#b2a791');r(c,x-w/2-4,y,8,4,P.ink);}
}
export function drawPixelPerson(c,x,y,coat='#ad6e67',label=null,phase=0){
 const motion=Math.sin(phase*8),step=motion>0?4:-4;
 // Drop shadow does not glow or blur; all shapes snap to the pixel grid.
 r(c,x-12,y+10,24,5,'#25384377');
 r(c,x-8,y-7,8,18,P.ink);r(c,x+2,y-7,8,18,P.ink);
 r(c,x-8,y-2+step,8,10,'#314353');r(c,x+2,y-2-step,8,10,'#314353');
 r(c,x-11,y-25,22,23,P.ink);r(c,x-7,y-23,14,19,coat);
 r(c,x-15,y-19,7,14,coat);r(c,x+9,y-19,7,14,coat);
 r(c,x-8,y-35,16,12,P.ink);r(c,x-6,y-33,12,10,'#e2b397');
 r(c,x-8,y-37,16,6,'#32424b');
 r(c,x-3,y-29,4,4,'#2b343b');r(c,x+5,y-29,4,4,'#2b343b');
 r(c,x-6,y-22,4,4,'#ebc1a1');r(c,x+6,y-22,4,4,'#ebc1a1');
 if(label){
  c.save();c.font='bold 11px sans-serif';c.fillStyle=P.light;c.textAlign='center';
  c.strokeStyle=P.ink;c.lineWidth=3;c.strokeText(label,x,y-45);c.fillText(label,x,y-45);c.restore();
 }
}
export function createPixelStreetRenderer({x,y,buildings}){
 const art=document.createElement('canvas');
 art.width=PIXEL_VIEW.width;art.height=PIXEL_VIEW.height;
 const artCtx=art.getContext('2d',{alpha:false});artCtx.imageSmoothingEnabled=false;
 artCtx.setTransform(.5,0,0,.5,0,0);
 staticScene(artCtx,{x,y,buildings});
 return {pixelWidth:art.width,pixelHeight:art.height,
  render(ctx,elapsed,shift,traffic,people){
   ctx.imageSmoothingEnabled=false;
   // Browser scale is set once in walking-engine; use logical coordinates here.
   ctx.drawImage(art,0,0,960,600);
   const t=elapsed*.001;
   if(shift!==3)for(let i=0;i<traffic;i++){
    const vertical=i%3===0,road=Math.floor(i/3);
    const vx=vertical?138+(road%5)*158:((i%2===0?1:-1)*(t*(31+i*3))+i*177)%1150;
    const vy=vertical?((t*(25+i*2)+i*100)%730)-60:132+(road%4)*150;
    pixelVehicle(ctx,vertical?vx:(vx+1150)%1150-80,vy,i);
   }
   for(let i=0;i<people.length;i++){
    const person=people[i];
    const px=person.x+Math.sin(t*.48+i)*Math.min(28,20+person.drift);
    const py=person.y+Math.sin(t*.35+i)*6;
    drawPixelPerson(ctx,px,py,['#7c6d88','#5c7f83','#aa756c','#808456'][i%4],null,t+i);
   }
   // Clock shifts tint the atmosphere without blurring the native pixel art.
   if(shift===2)r(ctx,0,0,960,600,'#735d7240');
   if(shift===3)r(ctx,0,0,960,600,'#16274780');
   if(shift>=2){
    for(let i=0;i<buildings.length;i++){
     const b=buildings[i];r(ctx,b.x+b.w/2-4,b.y+13,8,14,'#f6d68fa0');
    }
   }
  }
 };
}
