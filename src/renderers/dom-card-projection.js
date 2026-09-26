/* DOM adapter for the X/Z/Y open-card camera. Simulation remains renderer-neutral. */
(function(global){
'use strict';

const runtime=global.PaperchalkRuntime;
const camera=global.PaperchalkCardCamera;
const world=document.getElementById('world');
if(!runtime||!camera||!world)return;

let enemyEls=[];
let npcEls=new Map();

function refreshNodes(){
  enemyEls=[...document.querySelectorAll('#entityTrack .enemy')];
  npcEls=new Map(
    [...document.querySelectorAll('#mapLandmarkTrack .map-npc')]
      .map(el=>[el.dataset.npcId,el])
  );
}

function applyProjection(el,p,{xVar,bottomVar,viewportHeight}){
  const visible=p.visible&&p.x>-320&&p.x<(innerWidth||1280)+320&&p.y>-280&&p.y<(viewportHeight||720)+280;
  el.style.display=visible?'':'none';
  if(!visible)return;
  el.style.setProperty(xVar,p.x.toFixed(2)+'px');
  el.style.setProperty(bottomVar,((viewportHeight||720)-p.y).toFixed(2)+'px');
  el.style.setProperty('--world-scale',p.scale.toFixed(4));
}

function render(frame){
  if(!frame||world.classList.contains('scene-interior'))return;
  const cfg=camera.config,p=frame.player,v=frame.viewport;
  world.style.setProperty('--card-grid-x',(-camera.wrap(p.x,cfg.gridSize)).toFixed(2)+'px');
  world.style.setProperty('--card-grid-z',camera.wrap(p.z,cfg.gridSize).toFixed(2)+'px');
  const wallScale=cfg.baseDepth/(cfg.baseDepth+cfg.wallDepth);
  world.style.setProperty('--card-wall-x',(-camera.wrap(p.x*wallScale,cfg.gridSize)).toFixed(2)+'px');
  world.style.setProperty('--card-wall-y',camera.wrap((p.y-p.z*.16)*wallScale,cfg.gridSize).toFixed(2)+'px');

  if(enemyEls.length!==frame.enemies.length)refreshNodes();
  for(let i=0;i<frame.enemies.length;i++){
    const data=frame.enemies[i],el=enemyEls[i];
    if(!data||!el)continue;
    const projected=camera.project({
      worldX:data.x,worldZ:data.z,worldY:0,
      playerX:p.x,playerZ:p.z,playerY:p.y,
      screenX:p.screenX,viewportHeight:v.height,groundY:v.groundY
    });
    applyProjection(el,projected,{xVar:'--enemy-x',bottomVar:'--enemy-bottom',viewportHeight:v.height});
  }

  const npcs=runtime.worldData?.npcs||[];
  if(npcEls.size!==npcs.length)refreshNodes();
  for(const npc of npcs){
    const el=npcEls.get(npc.id);
    if(!el)continue;
    const projected=camera.project({
      worldX:npc.x,worldZ:npc.z||0,worldY:0,
      playerX:p.x,playerZ:p.z,playerY:p.y,
      screenX:p.screenX,viewportHeight:v.height,groundY:v.groundY
    });
    applyProjection(el,projected,{xVar:'--npc-x',bottomVar:'--npc-bottom',viewportHeight:v.height});
  }
}

refreshNodes();
const unsubscribe=runtime.subscribe(render);
global.addEventListener('paperchalk-world-enter',()=>{refreshNodes();render(runtime.getSnapshot())});
global.addEventListener('beforeunload',()=>unsubscribe?.(),{once:true});
global.PaperchalkDomCardProjection=Object.freeze({render,refreshNodes});
})(window);
