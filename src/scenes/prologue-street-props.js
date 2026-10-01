/* Data-driven street prop runtime for the finite prologue city.
 * Gameplay owns placement/collision metadata; art can replace assetSlot visuals independently.
 */
(function(global){
'use strict';
const SCENE_ID='prologue-school-street',CELL=12;
const freezeType=(assetSlot,size,{interactive=false,collision=true}={})=>Object.freeze({
 assetSlot,size:Object.freeze(size),interactive,collision
});
const TYPES=Object.freeze({
 'street-light':freezeType('street.light',{x:.34,y:4.8,z:.34}),
 'bench':freezeType('street.bench',{x:1.8,y:.92,z:.68},{interactive:true}),
 'trash-bin':freezeType('street.trash-bin',{x:.62,y:1.02,z:.62},{interactive:true}),
 'bollard':freezeType('street.bollard',{x:.28,y:.92,z:.28}),
 'traffic-sign':freezeType('street.traffic-sign',{x:.34,y:2.7,z:.34},{interactive:true}),
 'bus-stop':freezeType('street.bus-stop',{x:3.6,y:2.45,z:.72},{interactive:true}),
 'bike-rack':freezeType('street.bike-rack',{x:1.9,y:.78,z:.62}),
 'hydrant':freezeType('street.hydrant',{x:.48,y:.82,z:.48}),
 'planter':freezeType('street.planter',{x:1.25,y:.66,z:1.25}),
 'utility-box':freezeType('street.utility-box',{x:.92,y:1.35,z:.58})
});
const list=[],counter={};
function add(type,x,z,{y=1,yaw=0,zone='',tags=[]}={}){
 const spec=TYPES[type];if(!spec)throw new Error('UNKNOWN_STREET_PROP_'+type);
 const n=(counter[type]=(counter[type]||0)+1),id=type+'-'+String(n).padStart(3,'0');
 list.push(Object.freeze({id,type,assetSlot:spec.assetSlot,x,y,z,yaw,zone,tags:Object.freeze([...tags]),interactive:spec.interactive}));
}
function line(type,xs,z,zone,yaw=0){for(const x of xs)add(type,x,z,{zone,yaw})}
const lights=[8,24,40,56,72,88,104,120,136,152,168];
line('street-light',lights,-13.2,'rear-sidewalk');
line('street-light',lights,12.2,'front-sidewalk',Math.PI);
line('bench',[10,44,76,108,140,168],-15.15,'rear-sidewalk');
line('bench',[26,58,92,124,156],14.15,'front-sidewalk',Math.PI);
line('trash-bin',[12.3,46.3,78.3,110.3],-15.15,'rear-sidewalk');
line('trash-bin',[28.3,60.3,94.3,126.3],14.15,'front-sidewalk');
line('bollard',[32,64,96,128],-9,'rear-buffer');
line('bollard',[32,64,96,128],8,'front-buffer');
line('traffic-sign',[16,56,96,136],-9,'rear-buffer');
line('traffic-sign',[36,76,116,156],8,'front-buffer',Math.PI);
add('bus-stop',58,-14.2,{zone:'rear-sidewalk'});
add('bus-stop',118,13.2,{zone:'front-sidewalk',yaw:Math.PI});
line('bike-rack',[34,82,130],-15.35,'rear-sidewalk');
line('bike-rack',[50,98,146],14.35,'front-sidewalk',Math.PI);
line('hydrant',[94,118,142],-15.55,'rear-sidewalk');
line('hydrant',[72,132],14.55,'front-sidewalk');
line('planter',[18,48,78,108,138,168],-.5,'median');
line('utility-box',[90,114],-16.05,'rear-building-edge');
line('utility-box',[102,150],15.55,'front-building-edge',Math.PI);
const PROPS=Object.freeze(list);
function boundsOf(prop){
 const s=TYPES[prop.type].size;
 return{minX:prop.x-s.x*.5,maxX:prop.x+s.x*.5,minY:prop.y,maxY:prop.y+s.y,minZ:prop.z-s.z*.5,maxZ:prop.z+s.z*.5};
}
const buckets=new Map();
for(const prop of PROPS){
 if(!TYPES[prop.type].collision)continue;
 const b=boundsOf(prop),x0=Math.floor(b.minX/CELL),x1=Math.floor(b.maxX/CELL),z0=Math.floor(b.minZ/CELL),z1=Math.floor(b.maxZ/CELL);
 for(let bz=z0;bz<=z1;bz++)for(let bx=x0;bx<=x1;bx++){
  const k=bx+','+bz,a=buckets.get(k)||[];a.push(prop);buckets.set(k,a);
 }
}
function props(scene){return scene?.id===SCENE_ID?PROPS:[]}
function queryAABB(scene,x,y,z,hw,hh,hd){
 if(scene?.id!==SCENE_ID)return[];
 const minX=x-hw,maxX=x+hw,minY=y-hh,maxY=y+hh,minZ=z-hd,maxZ=z+hd;
 const x0=Math.floor(minX/CELL),x1=Math.floor(maxX/CELL),z0=Math.floor(minZ/CELL),z1=Math.floor(maxZ/CELL),seen=new Set(),hits=[];
 for(let bz=z0;bz<=z1;bz++)for(let bx=x0;bx<=x1;bx++)for(const prop of buckets.get(bx+','+bz)||[]){
  if(seen.has(prop.id)){continue}seen.add(prop.id);
  const b=boundsOf(prop);
  if(maxX>b.minX&&minX<b.maxX&&maxY>b.minY&&minY<b.maxY&&maxZ>b.minZ&&minZ<b.maxZ)hits.push(prop);
 }
 return hits;
}
function collidesAABB(scene,x,y,z,hw,hh,hd){return queryAABB(scene,x,y,z,hw,hh,hd).length>0}
function nearest(scene,x,y,z,radius=3,predicate=null){
 if(scene?.id!==SCENE_ID)return null;
 let best=null,bestD=radius*radius;
 for(const prop of PROPS){
  if(predicate&&!predicate(prop,TYPES[prop.type]))continue;
  const cy=prop.y+TYPES[prop.type].size.y*.5,d=(prop.x-x)**2+(cy-y)**2+(prop.z-z)**2;
  if(d<=bestD){bestD=d;best=prop}
 }
 return best;
}
function stats(scene){
 const active=props(scene),byType={};for(const p of active)byType[p.type]=(byType[p.type]||0)+1;
 return{enabled:scene?.id===SCENE_ID,count:active.length,types:byType,spatialIndex:true,cellSize:CELL,assetSlots:Object.keys(TYPES).length,collisionModel:'static-aabb-spatial-hash',renderContract:'asset-slot-with-instanced-proxy-fallback'};
}
global.PaperchalkStreetProps=Object.freeze({version:1,sceneId:SCENE_ID,types:TYPES,props,queryAABB,collidesAABB,nearest,boundsOf,stats});
})(window);
