/* DOM adapter for the X/Z/Y open-card camera. Simulation remains renderer-neutral. */
(function(global){
'use strict';

const runtime=global.PaperchalkRuntime;
const camera=global.PaperchalkCardCamera;
const world=document.getElementById('world');
const groundSvg=document.getElementById('cardGroundGrid');
const groundDepth=document.getElementById('cardGroundDepthLines');
const groundWorld=document.getElementById('cardGroundWorldLines');
const groundScenes=document.getElementById('cardGroundSceneLines');
if(!runtime||!camera||!world)return;

const SVG_NS='http://www.w3.org/2000/svg';
const depthLinePool=[];
const worldLinePool=[];
const sceneLinePool=[];
let enemyEls=[];
let npcEls=new Map();

function refreshNodes(){
  enemyEls=[...document.querySelectorAll('#entityTrack .enemy')];
  npcEls=new Map(
    [...document.querySelectorAll('#mapLandmarkTrack .map-npc')]
      .map(el=>[el.dataset.npcId,el])
  );
}

function applyProjection(el,p,{xVar,bottomVar,viewportWidth,viewportHeight}){
  const w=viewportWidth||1280,h=viewportHeight||720;
  const visible=p.visible&&p.x>-320&&p.x<w+320&&p.y>-280&&p.y<h+280;
  el.style.display=visible?'':'none';
  if(!visible)return;
  el.style.setProperty(xVar,p.x.toFixed(2)+'px');
  el.style.setProperty(bottomVar,(h-p.y).toFixed(2)+'px');
  el.style.setProperty('--world-scale',p.scale.toFixed(4));
}

function pooledLine(group,pool,index){
  let line=pool[index];
  if(!line&&group){
    line=document.createElementNS(SVG_NS,'line');
    group.appendChild(line);
    pool[index]=line;
  }
  if(line)line.style.display='';
  return line;
}
function hideUnused(pool,used){
  for(let i=used;i<pool.length;i++)pool[i].style.display='none';
}
function setGridLine(line,x1,y1,x2,y2,kind,value,major,origin){
  if(!line)return;
  line.setAttribute('x1',x1.toFixed(2));
  line.setAttribute('y1',y1.toFixed(2));
  line.setAttribute('x2',x2.toFixed(2));
  line.setAttribute('y2',y2.toFixed(2));
  line.classList.toggle('is-major',!!major);
  line.classList.toggle('is-origin',!!origin);
  line.dataset[kind]=String(value);
}
function renderGroundGrid(frame){
  if(!groundSvg||!groundDepth||!groundWorld)return;
  const cfg=camera.config,p=frame.player,v=frame.viewport;
  const step=cfg.gridSize;
  const horizonY=v.height*cfg.horizonRatio;
  world.style.setProperty('--card-horizon-y',horizonY.toFixed(2)+'px');
  groundSvg.setAttribute('viewBox','0 0 '+v.width+' '+v.height);

  const nearZ=Number(cfg.groundNearDepth)||-step*3;
  const farZ=Math.min(Number(cfg.farGroundDepth)||Number(cfg.wallDepth)||step*10,cfg.maxDepth-cfg.baseDepth-step);
  let depthUsed=0;
  for(let z=Math.ceil(nearZ/step)*step;z<=farZ;z+=step){
    const q=camera.project({
      worldX:p.x,worldZ:z,worldY:0,
      playerX:p.x,playerY:p.y,cameraZ:0,
      screenX:p.screenX,viewportHeight:v.height,groundY:v.groundY
    });
    if(!q.visible&&q.depth<=cfg.minDepth)continue;
    setGridLine(
      pooledLine(groundDepth,depthLinePool,depthUsed++),
      0,q.y,v.width,q.y,'worldZ',z,
      Math.round(z/step)%5===0,z===0
    );
  }
  hideUnused(depthLinePool,depthUsed);

  const farProjection=camera.project({
    worldX:p.x,worldZ:farZ,worldY:0,
    playerX:p.x,playerY:p.y,cameraZ:0,
    screenX:p.screenX,viewportHeight:v.height,groundY:v.groundY
  });
  world.style.setProperty('--card-far-ground-y',farProjection.y.toFixed(2)+'px');
  const farScale=Math.max(.12,farProjection.scale||.12);
  const halfWorld=(v.width*.5+step*2)/farScale;
  const firstX=Math.floor((p.x-halfWorld)/step)*step;
  const lastX=Math.ceil((p.x+halfWorld)/step)*step;
  let worldUsed=0;
  for(let x=firstX;x<=lastX;x+=step){
    const a=camera.project({
      worldX:x,worldZ:nearZ,worldY:0,
      playerX:p.x,playerY:p.y,cameraZ:0,
      screenX:p.screenX,viewportHeight:v.height,groundY:v.groundY
    });
    const b=camera.project({
      worldX:x,worldZ:farZ,worldY:0,
      playerX:p.x,playerY:p.y,cameraZ:0,
      screenX:p.screenX,viewportHeight:v.height,groundY:v.groundY
    });
    setGridLine(
      pooledLine(groundWorld,worldLinePool,worldUsed++),
      a.x,a.y,b.x,b.y,'worldX',x,
      Math.round(x/step)%5===0,false
    );
  }
  hideUnused(worldLinePool,worldUsed);

  let sceneUsed=0;
  for(const guide of cfg.sceneGuides||[]){
    const q=camera.project({
      worldX:p.x,worldZ:guide.z,worldY:0,
      playerX:p.x,playerY:p.y,cameraZ:0,
      screenX:p.screenX,viewportHeight:v.height,groundY:v.groundY
    });
    const line=pooledLine(groundScenes,sceneLinePool,sceneUsed++);
    setGridLine(line,0,q.y,v.width,q.y,'sceneDepth',guide.z,false,guide.z===0);
    line.dataset.sceneId=guide.id;
    line.classList.add('scene-guide');
    line.classList.toggle('scene-guide-player',guide.id==='player');
    line.classList.toggle('scene-guide-far',guide.id==='far');
    line.classList.toggle('scene-guide-sky',guide.id==='sky');
  }
  hideUnused(sceneLinePool,sceneUsed);

  groundSvg.dataset.depthLineCount=String(depthUsed);
  groundSvg.dataset.worldLineCount=String(worldUsed);
  groundSvg.dataset.sceneLineCount=String(sceneUsed);
  groundSvg.dataset.farDepth=String(farZ);
}

function render(frame){
  if(!frame||world.classList.contains('scene-interior'))return;
  const cfg=camera.config,p=frame.player,v=frame.viewport;
  renderGroundGrid(frame);
  world.style.setProperty('--card-camera-y',(Number(p.y)||0).toFixed(2)+'px');
  const wallScale=cfg.baseDepth/(cfg.baseDepth+cfg.wallDepth);
  world.style.setProperty('--card-wall-grid-size',(cfg.gridSize*wallScale).toFixed(2)+'px');
  world.style.setProperty('--card-wall-x',(-camera.wrap(p.x*wallScale,cfg.gridSize*wallScale)).toFixed(2)+'px');
  world.style.setProperty('--card-wall-y',camera.wrap((Number(p.y)||0)*wallScale,cfg.gridSize).toFixed(2)+'px');

  if(enemyEls.length!==frame.enemies.length)refreshNodes();
  for(let i=0;i<frame.enemies.length;i++){
    const data=frame.enemies[i],el=enemyEls[i];
    if(!data||!el)continue;
    const projected=camera.project({
      worldX:data.x,worldZ:data.z,worldY:0,
      playerX:p.x,playerY:p.y,cameraZ:0,
      screenX:p.screenX,viewportHeight:v.height,groundY:v.groundY
    });
    applyProjection(el,projected,{xVar:'--enemy-x',bottomVar:'--enemy-bottom',viewportWidth:v.width,viewportHeight:v.height});
  }

  const npcs=runtime.worldData?.npcs||[];
  if(npcEls.size!==npcs.length)refreshNodes();
  for(const npc of npcs){
    const el=npcEls.get(npc.id);
    if(!el)continue;
    const projected=camera.project({
      worldX:npc.x,worldZ:npc.z||0,worldY:0,
      playerX:p.x,playerY:p.y,cameraZ:0,
      screenX:p.screenX,viewportHeight:v.height,groundY:v.groundY
    });
    applyProjection(el,projected,{xVar:'--npc-x',bottomVar:'--npc-bottom',viewportWidth:v.width,viewportHeight:v.height});
  }
}

refreshNodes();
const unsubscribe=runtime.subscribe(render);
global.addEventListener('paperchalk-world-enter',()=>{refreshNodes();render(runtime.getSnapshot())});
global.addEventListener('beforeunload',()=>unsubscribe?.(),{once:true});
global.PaperchalkDomCardProjection=Object.freeze({render,refreshNodes,renderGroundGrid});
})(window);
