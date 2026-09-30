(function(global){
'use strict';
const CAR=Object.freeze({
 id:'paper-sedan-01',
 x:36.5,z:-5,groundY:1,yaw:0,
 length:4.4,width:1.9,height:1.6,
 lane:'rear-motor',voxelAligned:true
});
function cars(scene){return scene?.id==='prologue-school-street'?[CAR]:[]}
function collidesAABB(scene,x,y,z,hw,hh,hd){
 if(scene?.id!=='prologue-school-street')return false;
 for(const c of cars(scene)){
  const cy=c.groundY+c.height*.5;
  if(Math.abs(x-c.x)<hw+c.length*.5&&Math.abs(z-c.z)<hd+c.width*.5&&Math.abs(y-cy)<hh+c.height*.5)return true;
 }
 return false;
}
global.PaperchalkPrologueCars=Object.freeze({CAR,cars,collidesAABB});
})(window);
