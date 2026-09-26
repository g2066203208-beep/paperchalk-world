/* DOM adapter for the X/Z/Y open-card camera. Simulation remains renderer-neutral. */
(function(global){
'use strict';

const runtime=global.PaperchalkRuntime;
const camera=global.PaperchalkCardCamera;
const world=document.getElementById('world');
const groundCanvas=document.getElementById('cardGroundCanvas');
if(!runtime||!camera||!world)return;

// The grid is a debug/geometry aid, not raster artwork. A 1x backing store is
// deliberate: high-DPR phones otherwise rasterize 4-9x as many pixels per frame.
const maxDpr=1;
const styleCache=new WeakMap();
const worldVarCache=new Map();
let enemyEls=[];
let npcEls=new Map();
let groundCtx=null;
let lastCanvasW=0,lastCanvasH=0,lastCanvasDpr=0;
let lastGroundKey='',lastFarY=0;
let lastRenderAt=0;
const MAX_RENDER_FPS=60;
const stats={
  renders:0,
  skippedHighRefresh:0,
  projectedEnemies:0,
  culledEnemies:0,
  projectedNpcs:0,
  culledNpcs:0,
  depthLines:0,
  worldLines:0,
  sceneLines:0,
  canvasPixels:0,
  farDepth:0,
  farY:0
};

function refreshNodes(){
  enemyEls=[...document.querySelectorAll('#entityTrack .enemy')];
  npcEls=new Map(
    [...document.querySelectorAll('#mapLandmarkTrack .map-npc')]
      .map(el=>[el.dataset.npcId,el])
  );
}
function writeWorldVar(name,value){
  if(worldVarCache.get(name)===value)return;
  worldVarCache.set(name,value);
  world.style.setProperty(name,value);
}
function visibilityCache(el){
  let c=styleCache.get(el);
  if(!c){
    c={visible:null,x:'',bottom:'',scale:''};
    styleCache.set(el,c);
  }
  return c;
}
function setVisible(el,visible){
  const c=visibilityCache(el);
  if(c.visible===visible)return;
  c.visible=visible;
  el.style.display=visible?'':'none';
}
function coarseVisibleX(worldX,worldZ,player,viewport,margin=300){
  const cfg=camera.config;
  const depth=cfg.baseDepth+(Number(worldZ)||0);
  if(depth<=cfg.minDepth)return false;
  if((Number(worldZ)||0)>cfg.farGroundDepth)return false;
  const scale=cfg.baseDepth/depth;
  const left=(Number(player.x)||0)-((Number(player.screenX)||0)+margin)/scale;
  const right=(Number(player.x)||0)+((viewport.width-(Number(player.screenX)||0))+margin)/scale;
  const x=Number(worldX)||0;
  return x>=left&&x<=right;
}
function applyProjection(el,p,{xVar,bottomVar,viewportWidth,viewportHeight}){
  const w=viewportWidth||1280,h=viewportHeight||720;
  const visible=p.visible&&p.x>-260&&p.x<w+260&&p.y>-220&&p.y<h+220;
  setVisible(el,visible);
  if(!visible)return false;
  const c=visibilityCache(el);
  const x=p.x.toFixed(2)+'px';
  const bottom=(h-p.y).toFixed(2)+'px';
  const scale=p.scale.toFixed(4);
  if(c.x!==x){c.x=x;el.style.setProperty(xVar,x)}
  if(c.bottom!==bottom){c.bottom=bottom;el.style.setProperty(bottomVar,bottom)}
  if(c.scale!==scale){c.scale=scale;el.style.setProperty('--world-scale',scale)}
  return true;
}
function ensureGroundCanvas(v){
  if(!groundCanvas)return null;
  const dpr=Math.min(maxDpr,Math.max(1,Number(global.devicePixelRatio)||1));
  const cssW=Math.max(1,Math.round(v.width));
  const cssH=Math.max(1,Math.round(v.height));
  const pixelW=Math.max(1,Math.round(cssW*dpr));
  const pixelH=Math.max(1,Math.round(cssH*dpr));
  if(pixelW!==lastCanvasW||pixelH!==lastCanvasH||dpr!==lastCanvasDpr){
    groundCanvas.width=pixelW;
    groundCanvas.height=pixelH;
    groundCanvas.style.width=cssW+'px';
    groundCanvas.style.height=cssH+'px';
    groundCtx=groundCanvas.getContext('2d',{alpha:true,desynchronized:true});
    lastCanvasW=pixelW;lastCanvasH=pixelH;lastCanvasDpr=dpr;
  }
  if(!groundCtx)return null;
  groundCtx.setTransform(dpr,0,0,dpr,0,0);
  stats.canvasPixels=pixelW*pixelH;
  groundCanvas.dataset.dpr=dpr.toFixed(2);
  return groundCtx;
}
function strokeLine(ctx,x1,y1,x2,y2,color,width){
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.lineTo(x2,y2);
  ctx.strokeStyle=color;
  ctx.lineWidth=width;
  ctx.stroke();
}
function renderGroundGrid(frame){
  if(!groundCanvas)return;
  const cfg=camera.config,p=frame.player,v=frame.viewport;
  const groundKey=[
    Math.round((Number(p.x)||0)*100)/100,
    Math.round((Number(p.y)||0)*100)/100,
    v.width,v.height,v.groundY
  ].join('|');
  if(groundKey===lastGroundKey)return;
  lastGroundKey=groundKey;
  const ctx=ensureGroundCanvas(v);
  if(!ctx)return;
  const step=cfg.gridSize;
  const horizonY=v.height*cfg.horizonRatio;
  writeWorldVar('--card-horizon-y',horizonY.toFixed(2)+'px');

  const nearZ=Number(cfg.groundNearDepth)||-step*3;
  const farZ=Math.min(Number(cfg.farGroundDepth)||Number(cfg.wallDepth)||step*10,cfg.maxDepth-cfg.baseDepth-step);
  const farProjection=camera.project({
    worldX:p.x,worldZ:farZ,worldY:0,
    playerX:p.x,playerY:p.y,cameraZ:0,
    screenX:p.screenX,viewportHeight:v.height,groundY:v.groundY
  });
  const farY=farProjection.y;
  writeWorldVar('--card-far-ground-y',farY.toFixed(2)+'px');

  // Clear only the finite ground band. During a jump include the previous far
  // edge so no old lines remain where the sky wall moved.
  const clearTop=Math.max(0,Math.min(lastFarY||farY,farY)-6);
  ctx.clearRect(0,clearTop,v.width,Math.max(0,v.height-clearTop));
  lastFarY=farY;
  ctx.fillStyle='#2f9e44';
  ctx.fillRect(0,Math.max(0,farY),v.width,Math.max(0,v.height-farY));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0,Math.max(0,farY-5),v.width,Math.max(0,v.height-farY+10));
  ctx.clip();

  let depthUsed=0;
  for(let z=Math.ceil(nearZ/step)*step;z<=farZ;z+=step){
    const q=camera.project({
      worldX:p.x,worldZ:z,worldY:0,
      playerX:p.x,playerY:p.y,cameraZ:0,
      screenX:p.screenX,viewportHeight:v.height,groundY:v.groundY
    });
    if(!q.visible&&q.depth<=cfg.minDepth)continue;
    const major=Math.round(z/step)%5===0;
    const origin=z===0;
    strokeLine(ctx,0,q.y,v.width,q.y,
      origin?'rgba(5,102,180,.92)':(major?'rgba(255,255,255,.48)':'rgba(224,247,255,.34)'),
      origin?3:(major?2.4:1.5));
    depthUsed++;
  }

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
    const major=Math.round(x/step)%5===0;
    strokeLine(ctx,a.x,a.y,b.x,b.y,major?'rgba(255,255,255,.48)':'rgba(224,247,255,.34)',major?2.4:1.5);
    worldUsed++;
  }

  let sceneUsed=0;
  const sceneColors={player:'#0878d1',far:'#9b51e0',sky:'#ffd43b'};
  for(const guide of cfg.sceneGuides||[]){
    const q=camera.project({
      worldX:p.x,worldZ:guide.z,worldY:0,
      playerX:p.x,playerY:p.y,cameraZ:0,
      screenX:p.screenX,viewportHeight:v.height,groundY:v.groundY
    });
    strokeLine(ctx,0,q.y,v.width,q.y,sceneColors[guide.id]||'#ffffff',4);
    sceneUsed++;
  }

  ctx.restore();
  stats.depthLines=depthUsed;
  stats.worldLines=worldUsed;
  stats.sceneLines=sceneUsed;
  stats.farDepth=farZ;
  stats.farY=farY;
  groundCanvas.dataset.depthLineCount=String(depthUsed);
  groundCanvas.dataset.worldLineCount=String(worldUsed);
  groundCanvas.dataset.sceneLineCount=String(sceneUsed);
  groundCanvas.dataset.farDepth=String(farZ);
  groundCanvas.dataset.farY=farY.toFixed(2);
}

function render(frame){
  if(!frame||world.classList.contains('scene-interior'))return;
  const now=performance.now();
  const minInterval=1000/MAX_RENDER_FPS;
  if(lastRenderAt&&now-lastRenderAt<minInterval-1){
    stats.skippedHighRefresh++;
    return;
  }
  lastRenderAt=now;
  stats.renders++;

  const cfg=camera.config,p=frame.player,v=frame.viewport;
  renderGroundGrid(frame);
  writeWorldVar('--card-camera-y',(Number(p.y)||0).toFixed(2)+'px');
  const wallScale=cfg.baseDepth/(cfg.baseDepth+cfg.wallDepth);
  writeWorldVar('--card-wall-grid-size',(cfg.gridSize*wallScale).toFixed(2)+'px');
  writeWorldVar('--card-wall-x',(-camera.wrap(p.x*wallScale,cfg.gridSize*wallScale)).toFixed(2)+'px');
  writeWorldVar('--card-wall-y',camera.wrap((Number(p.y)||0)*wallScale,cfg.gridSize).toFixed(2)+'px');

  let projectedEnemies=0,culledEnemies=0;
  if(enemyEls.length!==frame.enemies.length)refreshNodes();
  for(let i=0;i<frame.enemies.length;i++){
    const data=frame.enemies[i],el=enemyEls[i];
    if(!data||!el)continue;
    if(!coarseVisibleX(data.x,data.z||0,p,v,280)){
      setVisible(el,false);
      culledEnemies++;
      continue;
    }
    const projected=camera.project({
      worldX:data.x,worldZ:data.z,worldY:0,
      playerX:p.x,playerY:p.y,cameraZ:0,
      screenX:p.screenX,viewportHeight:v.height,groundY:v.groundY
    });
    if(applyProjection(el,projected,{xVar:'--enemy-x',bottomVar:'--enemy-bottom',viewportWidth:v.width,viewportHeight:v.height}))projectedEnemies++;
    else culledEnemies++;
  }

  let projectedNpcs=0,culledNpcs=0;
  const npcs=runtime.worldData?.npcs||[];
  if(npcEls.size!==npcs.length)refreshNodes();
  for(const npc of npcs){
    const el=npcEls.get(npc.id);
    if(!el)continue;
    if(!coarseVisibleX(npc.x,npc.z||0,p,v,280)){
      setVisible(el,false);
      culledNpcs++;
      continue;
    }
    const projected=camera.project({
      worldX:npc.x,worldZ:npc.z||0,worldY:0,
      playerX:p.x,playerY:p.y,cameraZ:0,
      screenX:p.screenX,viewportHeight:v.height,groundY:v.groundY
    });
    if(applyProjection(el,projected,{xVar:'--npc-x',bottomVar:'--npc-bottom',viewportWidth:v.width,viewportHeight:v.height}))projectedNpcs++;
    else culledNpcs++;
  }
  stats.projectedEnemies=projectedEnemies;
  stats.culledEnemies=culledEnemies;
  stats.projectedNpcs=projectedNpcs;
  stats.culledNpcs=culledNpcs;
}

refreshNodes();
const unsubscribe=runtime.subscribe(render);
global.addEventListener('paperchalk-world-enter',()=>{lastRenderAt=0;refreshNodes();render(runtime.getSnapshot())});
global.addEventListener('beforeunload',()=>unsubscribe?.(),{once:true});
global.PaperchalkDomCardProjection=Object.freeze({
  render,refreshNodes,renderGroundGrid,
  get stats(){return {...stats}}
});
})(window);
