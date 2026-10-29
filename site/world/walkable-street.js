/**
 * Real-time, keyboard/touch-controlled street vertical slice.
 * 960x600 local metres per loaded atlas tile. Each individual building has
 * stable world-id, hitbox, front door and persisted avatar position.
 * Only visible pedestrians and vehicles are animated; no country-wide DOM.
 */
import {regionAt,FACILITY_TYPES} from './national-atlas.js';
import {createPixelStreetRenderer,drawPixelPerson,PIXEL_VIEW} from '../scenes/pixel/pixel-city-art.js';
import {isOldHarborCell,oldHarborBuildings,OLD_HARBOR_WALKERS} from '../scenes/pixel/old-harbor-plaza.js';
export {interiorFor} from './interiors.js';
export const STREET_W=960,STREET_H=600;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const rnd=(a,b,salt=0)=>{
 let v=(Math.imul(a+1249+salt,73856093)^Math.imul(b+3137+salt,19349663))>>>0;
 v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967295;
};
const colors=['#bb8d74','#b2a18c','#a4aaa4','#a88181','#b8ac91','#8e9d99','#d0bca4','#bd9982'];
export function streetBuildingsAt(x,y){
 if(isOldHarborCell(x,y))return oldHarborBuildings();
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

export function createWalkableStreet(canvas,{x,y,readWorld,initialPosition,onEnter,onLeave,onPosition}){
 const ctx=canvas.getContext('2d',{alpha:false});
 canvas.width=PIXEL_VIEW.width;canvas.height=PIXEL_VIEW.height;
 ctx.imageSmoothingEnabled=false;
 ctx.setTransform(canvas.width/STREET_W,0,0,canvas.height/STREET_H,0,0);
 const buildings=streetBuildingsAt(x,y),key='night-harbor-street-player-'+x+'-'+y;
 let original=null;try{original=JSON.parse(localStorage.getItem(key)||'null')}catch{}
 const art=createPixelStreetRenderer({x,y,buildings});
 const site={x,y,buildings,people:[]},source=readWorld()?.slices?.population?.people||[];
 for(let i=0;i<Math.min(30,source.length);i++){
  const plaza=OLD_HARBOR_WALKERS[i%OLD_HARBOR_WALKERS.length];
  const px=isOldHarborCell(x,y)?plaza[0]:65+Math.floor(rnd(x+i,y,433)*840);
  const py=isOldHarborCell(x,y)?plaza[1]:100+Math.floor(rnd(y+i,x,347)*460);
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
  art.render(ctx,timestamp,shift,
   clamp(Math.floor((world?.slices?.population?.footTraffic?.['s0']||15)/2),4,18),site.people);
  // Pixel-grid selection marker and original animated protagonist.
  ctx.fillStyle='#ffe1a5';
  ctx.fillRect(Math.floor((player.x-17)/4)*4,Math.floor((player.y+11)/4)*4,32,4);
  drawPixelPerson(ctx,player.x,player.y,'#b3525f','你',timestamp*.001);
  if(follow){
    ctx.fillStyle='#e5c56c';
    ctx.fillRect(Math.floor((follow.doorX-10)/4)*4,Math.floor((follow.doorY+8)/4)*4,20,4);
  }
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
  snapshot(){return {...player,buildings:buildings.length,people:site.people.length,following:follow?.id||null,waypoints:path.length,art:'pixel-city-v1',nativeSize:{width:canvas.width,height:canvas.height}};},
  destroy(){if(closed)return;closed=true;cancelAnimationFrame(frame);canvas.removeEventListener('click',click);
   document.removeEventListener('keydown',down);document.removeEventListener('keyup',up);write();}
 };
}
