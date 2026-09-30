(function(global){
'use strict';
function move(keys,joyX,joyY,yaw){
let strafe=0,forward=0;
if(keys.has('KeyA')||keys.has('ArrowLeft'))strafe-=1;
if(keys.has('KeyD')||keys.has('ArrowRight'))strafe+=1;
if(keys.has('KeyW')||keys.has('ArrowUp'))forward+=1;
if(keys.has('KeyS')||keys.has('ArrowDown'))forward-=1;
strafe+=joyX;forward-=joyY;
const mag=Math.hypot(strafe,forward);
if(mag>1){strafe/=mag;forward/=mag}
const sy=Math.sin(yaw),cy=Math.cos(yaw);
return{x:strafe*cy-forward*sy,z:-strafe*sy-forward*cy,magnitude:Math.min(1,mag)};
}
function camera(parsed,fallback){
const c=parsed||{};
if(Math.abs(Number(c.yaw)||0)<.001&&Math.abs((Number(c.pitch)||0)-.18)<.001&&Math.abs((Number(c.distance)||0)-19.2)<.01)return{...fallback,stageView:{...fallback.stageView}};
return null;
}
function migrateSave(save,sceneData){
if(!save)return false;
const legacy=String(save.worldLayout||'').includes('prologue')||save.location==='序幕 · 城市马路';
if(!legacy)return false;
save.player={...sceneData.spawn};save.npcState=null;save.location='Paperchalk · 无限3D体素世界';delete save.worldLayout;
return true;
}
global.PaperchalkOpenWorldRuntime=Object.freeze({move,camera,migrateSave});
})(window);
