(function(global){
'use strict';
const CONFIG=Object.freeze({
 id:'main-teaching-building',
 grid:Object.freeze({
  x0:12,x1:76,frontZ:-20.5,rearZ:-42.5,
  frontRoomRearZ:-29.5,corridorRearZ:-33.5,
  groundY:1,bay:8,floors:4,floorHeight:4
 }),
 wall:.20,slab:.20,doorWidth:2,
 classroom:Object.freeze({width:8,depth:9}),
 corridor:Object.freeze({width:4}),
 entrance:Object.freeze({x0:20,x1:28,doorX0:22,doorX1:26}),
 stairs:Object.freeze([{x0:12,x1:20},{x0:68,x1:76}]),
 campus:Object.freeze({x0:4,x1:84,frontZ:-16.5,rearZ:-144.5,width:80,depth:128})
});
const FRONT_TYPES=Object.freeze([
 ['stairs','lobby','classroom','classroom','classroom','classroom','classroom','stairs'],
 ['stairs','classroom','classroom','classroom','classroom','classroom','classroom','stairs'],
 ['stairs','classroom','classroom','classroom','classroom','classroom','classroom','stairs'],
 ['stairs','classroom','classroom','classroom','classroom','classroom','classroom','stairs']
]);
const REAR_TYPES=Object.freeze([
 ['stairs','admin','admin','wc-boys','wc-girls','teacher','classroom','stairs'],
 ['stairs','teacher','teacher','wc-boys','wc-girls','prep','meeting','stairs'],
 ['stairs','teacher','teacher','wc-boys','wc-girls','counsel','storage','stairs'],
 ['stairs','teacher','teacher','wc-boys','wc-girls','art-prep','club','stairs']
]);
function bayEdges(i){const g=CONFIG.grid;return[g.x0+i*g.bay,g.x0+(i+1)*g.bay]}
function room(floor,row,bay){
 const g=CONFIG.grid,[x0,x1]=bayEdges(bay),front=row==='front';
 return{floor,row,bay,type:(front?FRONT_TYPES:REAR_TYPES)[floor][bay],x0,x1,
  z0:front?g.frontZ:g.corridorRearZ,z1:front?g.frontRoomRearZ:g.rearZ,
  y0:g.groundY+floor*g.floorHeight,y1:g.groundY+(floor+1)*g.floorHeight};
}
function floorPlan(floor){
 floor=Math.max(0,Math.min(CONFIG.grid.floors-1,floor|0));
 const rooms=[];
 for(let b=0;b<8;b++){rooms.push(room(floor,'front',b));rooms.push(room(floor,'rear',b))}
 return{floor,y0:CONFIG.grid.groundY+floor*CONFIG.grid.floorHeight,y1:CONFIG.grid.groundY+(floor+1)*CONFIG.grid.floorHeight,rooms};
}
function classroomCount(){
 let n=0;for(let f=0;f<4;f++)for(const row of [FRONT_TYPES[f],REAR_TYPES[f]])for(const t of row)if(t==='classroom')n++;
 return n;
}
function overlaps(a0,a1,b0,b1){return a1>b0&&a0<b1}
function hitBox(x,y,z,hw,hh,hd,b){
 return overlaps(x-hw,x+hw,b.x0,b.x1)&&overlaps(y-hh,y+hh,b.y0,b.y1)&&overlaps(z-hd,z+hd,b.z0,b.z1);
}
function firstFloorWalls(){
 const g=CONFIG.grid,w=CONFIG.wall*.5,y0=g.groundY,y1=g.groundY+g.floorHeight;
 const out=[
  {x0:g.x0-w,x1:g.x0+w,z0:g.rearZ,z1:g.frontZ,y0,y1},
  {x0:g.x1-w,x1:g.x1+w,z0:g.rearZ,z1:g.frontZ,y0,y1},
  {x0:g.x0,x1:g.x1,z0:g.rearZ-w,z1:g.rearZ+w,y0,y1}
 ];
 // Front wall leaves a real 4m entrance opening aligned to the 8m school gate.
 out.push({x0:g.x0,x1:CONFIG.entrance.doorX0,z0:g.frontZ-w,z1:g.frontZ+w,y0,y1});
 out.push({x0:CONFIG.entrance.doorX1,x1:g.x1,z0:g.frontZ-w,z1:g.frontZ+w,y0,y1});
 // Corridor walls: each 8m room bay keeps a centered 2m doorway.
 for(const zc of [g.frontRoomRearZ,g.corridorRearZ])for(let b=1;b<=6;b++){
  const [a,c]=bayEdges(b),mid=(a+c)*.5;
  out.push({x0:a,x1:mid-CONFIG.doorWidth*.5,z0:zc-w,z1:zc+w,y0,y1});
  out.push({x0:mid+CONFIG.doorWidth*.5,x1:c,z0:zc-w,z1:zc+w,y0,y1});
 }
 return out;
}
const COLLIDERS=Object.freeze(firstFloorWalls().map(Object.freeze));
function collidesAABB(scene,x,y,z,hw,hh,hd){
 if(scene?.id!=='prologue-school-street')return false;
 for(const b of COLLIDERS)if(hitBox(x,y,z,hw,hh,hd,b))return true;
 return false;
}
function stats(){
 const g=CONFIG.grid;
 return{
  id:CONFIG.id,gridAligned:true,construction:'floor-template-voxel-grid',
  footprint:{width:g.x1-g.x0,depth:g.frontZ-g.rearZ,x0:g.x0,x1:g.x1,frontZ:g.frontZ,rearZ:g.rearZ},
  floors:g.floors,floorHeight:g.floorHeight,totalHeight:g.floors*g.floorHeight,
  classroom:{...CONFIG.classroom,count:classroomCount()},
  corridor:{...CONFIG.corridor},stairs:CONFIG.stairs.length,
  entrance:{...CONFIG.entrance},campus:{...CONFIG.campus},
  floorPlans:Array.from({length:g.floors},(_,i)=>floorPlan(i))
 };
}
global.PaperchalkSchoolLayout=Object.freeze({CONFIG,FRONT_TYPES,REAR_TYPES,bayEdges,room,floorPlan,classroomCount,collidesAABB,stats});
})(window);
