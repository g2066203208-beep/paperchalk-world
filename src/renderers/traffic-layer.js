(function(global){
'use strict';
const runtime=global.PaperchalkRuntime;
const camera=global.PaperchalkCardCamera;
const world=document.getElementById('world');
const layer=document.getElementById('trafficLayer');
if(!runtime||!camera||!world||!layer)return;

const MAP_WIDTH=120000;
const ROAD_Z=[-480,-160];
const ROAD_Y=[-86,-36];
const SPEED=145;
const SAFE_GAP=520;
const carSources=['./assets/traffic/bus.png','./assets/traffic/sedan.png','./assets/traffic/bus-large.png','./assets/traffic/pickup.png'];
const cars=[];
const lanes=[
  {z:ROAD_Z[0],y:ROAD_Y[0],dir:1,offset:0},
  {z:ROAD_Z[0],y:ROAD_Y[0]+24,dir:1,offset:340},
  {z:ROAD_Z[1],y:ROAD_Y[1],dir:-1,offset:220},
  {z:ROAD_Z[1],y:ROAD_Y[1]+24,dir:-1,offset:560}
];
for(let i=0;i<lanes.length;i++)for(let j=0;j<2;j++)cars.push({lane:i,x:(lanes[i].offset+j*SAFE_GAP+i*173)%MAP_WIDTH,src:carSources[(i+j)%carSources.length],el:null});

function makeRoad(z,kind){
  const el=document.createElement('div');
  el.className='traffic-road '+kind;
  el.dataset.z=String(z);
  layer.appendChild(el);
  return el;
}
const roadEls=[makeRoad(ROAD_Z[0],'traffic-road-near'),makeRoad(ROAD_Z[1],'traffic-road-mid')];
const crosswalk=document.createElement('div');
crosswalk.className='traffic-crosswalk';
layer.appendChild(crosswalk);
for(const car of cars){
  const el=document.createElement('img');
  el.className='traffic-car';el.alt='';el.draggable=false;el.src=car.src;
  layer.appendChild(el);car.el=el;
}

function project(frame,x,z,y=0){return camera.project({worldX:x,worldZ:z,worldY:y,playerX:frame.player.x,playerY:frame.player.y,cameraZ:0,screenX:frame.player.screenX,viewportHeight:frame.viewport.height,groundY:frame.viewport.groundY})}
function placeRoad(el,frame,z){
  const a=project(frame,frame.player.x-2400,z,0),b=project(frame,frame.player.x+2400,z,0);
  const scale=Math.max(.12,a.scale||1);
  el.style.left=a.x+'px';el.style.top=(a.y-52*scale)+'px';el.style.width=Math.max(120,b.x-a.x)+'px';el.style.height=(104*scale)+'px';el.style.transform='scaleY('+Math.max(.18,scale)+')';
}
function render(frame){
  const now=performance.now();
  if(!frame||!frame.player)return;
  for(const road of roadEls)placeRoad(road,frame,Number(road.dataset.z));
  const cross=project(frame,Math.floor(frame.player.x/1800)*1800+900,-320,0);
  crosswalk.style.left=(cross.x-70*(cross.scale||1))+'px';crosswalk.style.top=(cross.y-18*(cross.scale||1))+'px';crosswalk.style.transform='scale('+Math.max(.12,cross.scale||1)+')';
  for(const car of cars){
    const lane=lanes[car.lane];
    car.x=(car.x+lane.dir*SPEED/60)%MAP_WIDTH;if(car.x<0)car.x+=MAP_WIDTH;
    const q=project(frame,car.x,lane.z,lane.y);
    const visible=q.visible&&q.x>-300&&q.x<frame.viewport.width+300;
    car.el.hidden=!visible;
    if(!visible)continue;
    car.el.style.left=q.x+'px';car.el.style.top=(q.y-42*(q.scale||1))+'px';
    car.el.style.transform='translateX(-50%) scale('+(Math.max(.08,q.scale||1)*.72)+') scaleX('+(lane.dir>0?1:-1)+')';
  }
}
const off=runtime.subscribe(render);
global.addEventListener('paperchalk-world-enter',()=>render(runtime.getSnapshot()));
global.addEventListener('beforeunload',()=>off?.(),{once:true});
global.PaperchalkTraffic=Object.freeze({lanes:lanes.length,cars:cars.length,speed:SPEED,safeGap:SAFE_GAP});
})(window);
