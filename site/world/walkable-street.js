/**
 * Real-time, keyboard/touch-controlled street vertical slice.
 * 960x600 local metres per loaded atlas tile. Each individual building has
 * stable world-id, hitbox, front door and persisted avatar position.
 * Only visible pedestrians and vehicles are animated; no country-wide DOM.
 */
import {regionAt,terrainAt,FACILITY_TYPES} from './national-atlas.js';
import {PIXEL_W,PIXEL_H,drawPixelStreet} from './pixel-street-renderer.js';
export {interiorFor} from './interiors.js';
export const STREET_W=960,STREET_H=600;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const rnd=(a,b,salt=0)=>{
 let v=(Math.imul(a+1249+salt,73856093)^Math.imul(b+3137+salt,19349663))>>>0;
 v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967295;
};
const colors=['#bb8d74','#b2a18c','#a4aaa4','#a88181','#b8ac91','#8e9d99','#d0bca4','#bd9982'];
export function streetBuildingsAt(x,y){
 const kind=regionAt(x,y).biome,arr=FACILITY_TYPES[kind]||FACILITY_TYPES.town;
 const units=[],spacingX=158,spacingY=150;
 const rows=[0,1,2,3],cols=[0,1,2,3,4,5];
 for(const row of rows)for(const col of cols){
   const left=25+col*spacingX,right=left+105,top=24+row*spacingY;
   const vacant=rnd(x*17+col,y*13+row,204)<(.13+(kind==='forest'?.29:0));
   if(vacant)continue;
   const index=Math.floor(rnd(x+col*5,y+row*7,571)*arr.length);
   const floors=1+Math.floor(rnd(x*4+col,y*3+row,637)*(['metro','industrial'].includes(kind)?5:3));
   const width=78+Math.floor(rnd(col+x,row+y,911)*22);
   const name=arr[index];
   const id='building-'+x+'-'+y+'-'+row+'-'+col;
   units.push({id,name,region:regionAt(x,y).id,x:left,y:top,w:width,h:68,doorX:left+width*.5,
    doorY:top+82,floors,tint:colors[Math.floor(rnd(col+x*2,row+y*3,511)*colors.length)],
    street:'街道 '+(Math.floor(row/2)+1)+' · '+(col+1)+'号',worldX:x,worldY:y});
 }
 return units;
}
export function canStandAt(px,py,buildings){
 if(px<8||py<8||px>STREET_W-8||py>STREET_H-8)return false;
 return !buildings.some(b=>px>b.x-10&&px<b.x+b.w+10&&py>b.y-10&&py<b.y+b.h+5);
}

export function findStreetPath(start,end,buildings){
 const step=12,cols=Math.floor(STREET_W/step),rows=Math.floor(STREET_H/step);
 const idx=(x,y)=>y*cols+x,inside=(x,y)=>x>=0&&y>=0&&x<cols&&y<rows;
 const toGrid=p=>[clamp(Math.floor(p.x/step),0,cols-1),clamp(Math.floor(p.y/step),0,rows-1)];
 const [sx,sy]=toGrid(start),[ex,ey]=toGrid(end);
 const origin=idx(sx,sy),dest=idx(ex,ey),prev=new Int32Array(cols*rows).fill(-1);
 const queue=[origin];prev[origin]=origin;
 for(let i=0;i<queue.length;i++){
   const at=queue[i];if(at===dest)break;
   const x=at%cols,y=Math.floor(at/cols);
   for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){
    const nx=x+dx,ny=y+dy;if(!inside(nx,ny))continue;
    const n=idx(nx,ny);
    if(prev[n]!==-1||!canStandAt(nx*step+step/2,ny*step+step/2,buildings))continue;
    prev[n]=at;queue.push(n);
   }
 }
 if(prev[dest]===-1)return [];
 const path=[];let at=dest;
 while(at!==origin){path.push({x:(at%cols)*step+step/2,y:Math.floor(at/cols)*step+step/2});at=prev[at];}
 path.reverse();
 // Keep every axis-aligned waypoint. Simplifying corners makes the actor
 // cut diagonally through solid buildings and get stuck outside the door.
 return [...path,end];

}

function rect(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function text(ctx,label,x,y,size=12,color='#f8ead5'){
 ctx.font='bold '+size+'px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#1b2935';
 ctx.strokeText(label,x,y);ctx.fillStyle=color;ctx.fillText(label,x,y);
}
function drawPerson(ctx,x,y,color,label){
 ctx.fillStyle='#27364655';ctx.beginPath();ctx.ellipse(x,y+8,12,5,0,0,7);ctx.fill();
 rect(ctx,x-5,y-22,10,24,color);rect(ctx,x-4,y-2,3,9,'#272d30');rect(ctx,x+1,y-2,3,9,'#272d30');
 ctx.fillStyle='#e4c4a3';ctx.beginPath();ctx.arc(x,y-27,8,0,7);ctx.fill();
 if(label)text(ctx,label,x,y-41,11);
}
function drawBuilding(ctx,b,shift){
 const face=b.tint,roof='#574e51',dark='#39495b';
 rect(ctx,b.x+6,b.y+9,b.w,b.h+17,'#28373a66');
 rect(ctx,b.x,b.y,b.w,b.h,face);
 rect(ctx,b.x,b.y-9,b.w,17,roof);
 // Distinct floors and windows, deterministic per building.
 const windows=Math.max(2,Math.min(5,b.floors+1));
 for(let i=0;i<windows;i++){
   const wx=b.x+11+i*(b.w-19)/windows;
   rect(ctx,wx,b.y+17,10,14,'#263c49');
   rect(ctx,wx+2,b.y+18,6,10,shift===3?'#d5b47e':'#92b8c1');
 }
 rect(ctx,b.doorX-8,b.y+b.h-22,16,22,dark);
 rect(ctx,b.doorX+4,b.y+b.h-13,2,2,'#e4c889');
 rect(ctx,b.x,b.y+b.h-4,b.w,5,'#75605b');
 text(ctx,b.name,b.x+b.w/2,b.y-16,10);
}
function drawEnvironment(ctx,site,elapsed,shift,traffic){
 const {x,y}=site;const t=terrainAt(x,y);
 const rural=t.terrain==='forest'||t.terrain==='fields';
 rect(ctx,0,0,STREET_W,STREET_H, rural?'#718776':t.terrain==='sea'?'#6990a3':'#9ca197');
 // Four city blocks, two intersecting east-west roads and sidewalks.
 for(let yy=115;yy<STREET_H;yy+=150){
   rect(ctx,0,yy,STREET_W,36,'#4f5c60');
   rect(ctx,0,yy-8,STREET_W,8,'#c7bca5');
   rect(ctx,0,yy+28,STREET_W,8,'#c7bca5');
   for(let xx=0;xx<STREET_W;xx+=65)rect(ctx,xx+4,yy+16,28,2,'#ead1a1');
 }
 for(let xx=130;xx<STREET_W;xx+=158){
   rect(ctx,xx,0,25,STREET_H,'#505d62');
   rect(ctx,xx-6,0,6,STREET_H,'#bdbaa7');
   rect(ctx,xx+25,0,5,STREET_H,'#bdbaa7');
   for(let yy=0;yy<STREET_H;yy+=55)rect(ctx,xx+12,yy,2,24,'#e8d19c');
 }
 // Persistent grass, street furniture, traffic lights, not individually DOM-updated.
 for(let i=0;i<90;i++){
   const bx=Math.floor(rnd(x+i,y,33)*STREET_W),by=Math.floor(rnd(y+i,x,47)*STREET_H);
   if(site.buildings.some(b=>bx>b.x-5&&bx<b.x+b.w+5&&by>b.y-5&&by<b.y+b.h+5))continue;
   const green=rnd(i+x,i+y,61)>.35;
   if(green){ctx.fillStyle='#476f55';ctx.beginPath();ctx.arc(bx,by,2+rnd(i,y,31)*5,0,7);ctx.fill();}
 }
 for(const b of site.buildings)drawBuilding(ctx,b,shift);
 const time=elapsed*.001, trafficOn=shift!==3;
 if(trafficOn){
 for(let i=0;i<traffic;i++){
   const vertical=i%3===0,road=Math.floor(i/3);
   const px=vertical?137+road%5*158:((i%2===0?1:-1)*(time*(35+i*4))+i*177)%1160;
   const py=vertical?((time*(27+i*2)+i*100)%760)-80:133+(road%3)*150;
   const vx=vertical?px:((px+1160)%1160)-100,vy=vertical?py:py;
   rect(ctx,vx-10,vy-5,20,10,i%5===0?'#e7c678':['#8f5554','#53758b','#78867a'][i%3]);
   rect(ctx,vx-2,vy-4,7,5,'#a9c2c6');
 }
 }
 for(let i=0;i<site.people.length;i++){
   const p=site.people[i],px=p.x+Math.sin(time*.35+i)*Math.min(20,18+p.drift);
   const py=p.y+Math.sin(time*.6+i)*3;
   drawPerson(ctx,px,py,['#7b637b','#5a7679','#a16e69','#7e7b5b'][i%4],null);
 }
 const night=shift===3,evening=shift===2;
 if(night||evening)rect(ctx,0,0,STREET_W,STREET_H,night?'#1827474a':'#8a5b7130');
}
export function createWalkableStreet(canvas,{x,y,readWorld,initialPosition,onEnter,onLeave,onPosition}){
 const ctx=canvas.getContext('2d',{alpha:false});
 canvas.width=PIXEL_W;canvas.height=PIXEL_H;
 ctx.imageSmoothingEnabled=false;
 const buildings=streetBuildingsAt(x,y),key='night-harbor-street-player-'+x+'-'+y;
 let original=null;try{original=JSON.parse(localStorage.getItem(key)||'null')}catch{}
 const site={x,y,buildings,people:[]},source=readWorld()?.slices?.population?.people||[];
 for(let i=0;i<Math.min(30,source.length);i++){
  const px=65+Math.floor(rnd(x+i,y,433)*840),py=100+Math.floor(rnd(y+i,x,347)*460);
  site.people.push({name:source[i].name,x:px,y:py,drift:i%11});
 }
 let player={x:clamp(initialPosition?.x??original?.x??124,10,950),y:clamp(initialPosition?.y??original?.y??100,10,590)};
 if(!canStandAt(player.x,player.y,buildings))player={x:120,y:106};
 let target=null,follow=null,path=[],last=0,frame=0,closed=false,held=new Set(),entered=false;
 const write=()=>{try{localStorage.setItem(key,JSON.stringify(player))}catch{}};
 function locate(px,py){
   const hit=buildings.find(b=>px>=b.x-3&&px<=b.x+b.w+3&&py>=b.y-14&&py<=b.y+b.h+8);
   if(hit){follow=hit;target={x:hit.doorX,y:hit.doorY};}
   else{follow=null;target={x:px,y:py};}
   path=findStreetPath(player,target,buildings);
   if(!path.length){target=null;follow=null;}
 }
 function click(event){
   const r=canvas.getBoundingClientRect();
   const xx=(event.clientX-r.left)/r.width*STREET_W,yy=(event.clientY-r.top)/r.height*STREET_H;
   locate(xx,yy);
 }
 function down(event){
   const key=event.key.toLowerCase();
   if(!event.ctrlKey&&['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(key)){
     if(!event.target.closest('input,textarea'))event.preventDefault();held.add(key);
   }
 }
 function up(event){held.delete(event.key.toLowerCase());}
 canvas.addEventListener('click',click);
 document.addEventListener('keydown',down);
 document.addEventListener('keyup',up);
 const controls=canvas.parentNode.querySelectorAll('[data-walk-move]');
 for(const b of controls){
   b.addEventListener('pointerdown',()=>{held.add(b.dataset.walkMove);target=null;path=[];});
   b.addEventListener('pointerup',()=>held.delete(b.dataset.walkMove));
   b.addEventListener('pointercancel',()=>held.delete(b.dataset.walkMove));
 }
 function frameDraw(timestamp){
  if(closed)return;
  const dt=clamp(last?(timestamp-last)/1000:0,0,.05);last=timestamp;
  let vx=0,vy=0;
  if(held.has('a')||held.has('arrowleft'))vx--;
  if(held.has('d')||held.has('arrowright'))vx++;
  if(held.has('w')||held.has('arrowup'))vy--;
  if(held.has('s')||held.has('arrowdown'))vy++;
  if(target&&vx===0&&vy===0){const next=path[0]||target;
    const dx=next.x-player.x,dy=next.y-player.y;
    if(Math.hypot(dx,dy)>5){vx=dx;vy=dy;}
    else if(path.length){path.shift();}
    else {target=null;if(follow){const b=follow;follow=null;if(!entered){entered=true;write();onEnter(b);return;}}}
  }else if(vx||vy){target=null;follow=null;path=[];}
  const distance=Math.hypot(vx,vy);
  if(distance){
    const speed=210*dt,nx=player.x+vx/distance*speed,ny=player.y+vy/distance*speed;
    if(canStandAt(nx,player.y,buildings))player.x=nx;
    if(canStandAt(player.x,ny,buildings))player.y=ny;
    onPosition?.(player);
  }
  const world=readWorld(),shift=world?.slices?.clock?.shift||0;
  drawPixelStreet(ctx,site,timestamp,shift,clamp(Math.floor((world?.slices?.population?.footTraffic?.['s0']||15)/2),4,18),player,follow);
  if(!closed)frame=requestAnimationFrame(frameDraw);
 }
 frame=requestAnimationFrame(frameDraw);
 return {
  buildings,goTo(id){
   const b=buildings.find(x=>x.id===id);
   if(!b)return false;
   // Destination buttons target a *door*, not the building's wall hitbox.
   // Never infer the selected building from the destination coordinate.
   follow=b;target={x:b.doorX,y:b.doorY};
   path=findStreetPath(player,target,buildings);
   if(!path.length){follow=null;target=null;return false;}
   return true;
  },
  move(dx,dy){const nx=clamp(player.x+dx,8,STREET_W-8),ny=clamp(player.y+dy,8,STREET_H-8);
    if(canStandAt(nx,ny,buildings)){player.x=nx;player.y=ny;write();return true;}return false;},
  snapshot(){return {...player,buildings:buildings.length,people:site.people.length,following:follow?.id||null,waypoints:path.length};},
  destroy(){if(closed)return;closed=true;cancelAnimationFrame(frame);canvas.removeEventListener('click',click);
   document.removeEventListener('keydown',down);document.removeEventListener('keyup',up);write();}
 };
}
