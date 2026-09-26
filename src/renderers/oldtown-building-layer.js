/* Retained far-midground row renderer for the real-world old-town building pool. */
(function(global){
'use strict';

const runtime=global.PaperchalkRuntime;
const camera=global.PaperchalkCardCamera;
const pool=global.PaperchalkBuildingPools?.realWorld?.oldTown;
const layer=document.getElementById('oldTownBuildingLayer');
const track=document.getElementById('oldTownBuildingTrack');
if(!runtime||!camera||!pool||!layer||!track)return;

const ROW_COPIES=2;
const SLOTS_PER_ROW=pool.buildings.length;
const slotRows=[];
const worldWidths=pool.buildings.map(b=>b.w*pool.authoredScale);
const rowWidth=worldWidths.reduce((a,b)=>a+b,0)-pool.seamOverlap*(SLOTS_PER_ROW-1);
let lastRowKey='';
const stats={renders:0,projected:0,coarseCulled:0,visible:0,rowCopies:ROW_COPIES};

function seeded(seed){
  let x=(seed|0)||0x6d2b79f5;
  return ()=>{
    x^=x<<13;x^=x>>>17;x^=x<<5;
    return (x>>>0)/4294967296;
  };
}
function shuffled(rowIndex){
  const list=pool.buildings.slice();
  const rnd=seeded((pool.seed^(rowIndex*0x9e3779b1))|0);
  for(let i=list.length-1;i>0;i--){
    const j=Math.floor(rnd()*(i+1));
    [list[i],list[j]]=[list[j],list[i]];
  }
  return list;
}
function configureSprite(el,b){
  const s=pool.authoredScale;
  el.dataset.buildingId=b.id;
  el.style.width=(b.w*s).toFixed(2)+'px';
  el.style.height=(b.h*s).toFixed(2)+'px';
  el.style.backgroundImage='url("'+pool.atlas.src+'")';
  el.style.backgroundSize=(pool.atlas.width*s).toFixed(2)+'px '+(pool.atlas.height*s).toFixed(2)+'px';
  el.style.backgroundPosition=(-b.x*s).toFixed(2)+'px '+(-b.y*s).toFixed(2)+'px';
}
function createRows(){
  for(let r=0;r<ROW_COPIES;r++){
    const row=[];
    for(let i=0;i<SLOTS_PER_ROW;i++){
      const el=document.createElement('div');
      el.className='oldtown-building';
      el.setAttribute('aria-hidden','true');
      el.hidden=true;
      track.appendChild(el);
      row.push({el,worldX:0,building:null,hidden:true});
    }
    slotRows.push(row);
  }
}
function configureRow(rowSlot,rowIndex){
  const order=shuffled(rowIndex);
  let cursor=rowIndex*rowWidth;
  for(let i=0;i<order.length;i++){
    const b=order[i];
    const w=b.w*pool.authoredScale;
    const slot=slotRows[rowSlot][i];
    slot.building=b;
    slot.worldX=cursor+w*.5;
    configureSprite(slot.el,b);
    cursor+=w-pool.seamOverlap;
  }
  slotRows[rowSlot].rowIndex=rowIndex;
}
function ensureRows(playerX){
  const x=Number(playerX)||0;
  const center=Math.floor(x/rowWidth);
  const local=x-center*rowWidth;
  const neighbor=local<rowWidth*.5?center-1:center+1;
  const key=center+':'+neighbor;
  if(key===lastRowKey)return;
  lastRowKey=key;
  configureRow(0,center);
  configureRow(1,neighbor);
}
function setHidden(slot,hidden){
  if(slot.hidden===hidden)return;
  slot.hidden=hidden;
  slot.el.hidden=hidden;
}
function render(frame){
  if(!frame||document.getElementById('world')?.classList.contains('scene-interior')){
    layer.hidden=true;
    return;
  }
  layer.hidden=false;
  stats.renders++;
  const p=frame.player,v=frame.viewport;
  ensureRows(p.x);

  const depth=camera.config.baseDepth+pool.z;
  const scale=camera.config.baseDepth/depth;
  const screenMargin=360;
  const worldHalf=((v.width*.5)+screenMargin)/scale;
  const minX=p.x-worldHalf,maxX=p.x+worldHalf;
  let projected=0,coarseCulled=0,visibleCount=0;

  for(const row of slotRows){
    for(const slot of row){
      const b=slot.building;
      if(!b)continue;
      const halfW=b.w*pool.authoredScale*.5;
      if(slot.worldX+halfW<minX||slot.worldX-halfW>maxX){
        setHidden(slot,true);
        coarseCulled++;
        continue;
      }
      projected++;
      const q=camera.project({
        worldX:slot.worldX,worldZ:pool.z,worldY:0,
        playerX:p.x,playerY:p.y,cameraZ:0,
        screenX:p.screenX,viewportHeight:v.height,groundY:v.groundY
      });
      const renderW=b.w*pool.authoredScale*q.scale;
      const visible=q.visible&&q.x+renderW*.55>-screenMargin&&q.x-renderW*.55<v.width+screenMargin;
      setHidden(slot,!visible);
      if(!visible)continue;
      visibleCount++;
      slot.el.style.setProperty('--oldtown-x',q.x.toFixed(2)+'px');
      slot.el.style.setProperty('--oldtown-bottom',(v.height-q.y).toFixed(2)+'px');
      slot.el.style.setProperty('--oldtown-perspective',q.scale.toFixed(4));
    }
  }
  stats.projected=projected;
  stats.coarseCulled=coarseCulled;
  stats.visible=visibleCount;
}

createRows();
const unsubscribe=runtime.subscribe(render);
global.addEventListener('paperchalk-world-enter',()=>render(runtime.getSnapshot()));
global.addEventListener('beforeunload',()=>unsubscribe?.(),{once:true});

global.PaperchalkOldTownBuildings=Object.freeze({
  poolId:pool.id,
  rowWidth,
  slotCount:ROW_COPIES*SLOTS_PER_ROW,
  get centerRow(){return slotRows[0]?.rowIndex??Number.NaN},
  get stats(){return {...stats}},
  render
});
})(window);
