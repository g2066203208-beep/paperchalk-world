/* Retained far-midground row renderer for the real-world old-town building pool. */
(function(global){
'use strict';

const runtime=global.PaperchalkRuntime;
const camera=global.PaperchalkCardCamera;
const pool=global.PaperchalkBuildingPools?.realWorld?.oldTown;
const layer=document.getElementById('oldTownBuildingLayer');
const track=document.getElementById('oldTownBuildingTrack');
if(!runtime||!camera||!pool||!layer||!track)return;

const ROW_COPIES=3;
const SLOTS_PER_ROW=pool.buildings.length;
const slotRows=[];
const worldWidths=pool.buildings.map(b=>b.w*pool.authoredScale);
const rowWidth=worldWidths.reduce((a,b)=>a+b,0)-pool.seamOverlap*(SLOTS_PER_ROW-1);
let lastCenterRow=Number.NaN;

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
      track.appendChild(el);
      row.push({el,worldX:0,building:null});
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
  const center=Math.floor((Number(playerX)||0)/rowWidth);
  if(center===lastCenterRow)return;
  lastCenterRow=center;
  for(let r=0;r<ROW_COPIES;r++)configureRow(r,center+r-1);
}
function render(frame){
  if(!frame||document.getElementById('world')?.classList.contains('scene-interior')){
    layer.hidden=true;
    return;
  }
  layer.hidden=false;
  const p=frame.player,v=frame.viewport;
  ensureRows(p.x);
  const margin=520;
  for(const row of slotRows){
    for(const slot of row){
      const b=slot.building;
      if(!b)continue;
      const q=camera.project({
        worldX:slot.worldX,worldZ:pool.z,worldY:0,
        playerX:p.x,playerY:p.y,cameraZ:0,
        screenX:p.screenX,viewportHeight:v.height,groundY:v.groundY
      });
      const renderW=b.w*pool.authoredScale*q.scale;
      const visible=q.visible&&q.x+renderW*.55>-margin&&q.x-renderW*.55<v.width+margin;
      slot.el.hidden=!visible;
      if(!visible)continue;
      slot.el.style.setProperty('--oldtown-x',q.x.toFixed(2)+'px');
      slot.el.style.setProperty('--oldtown-bottom',(v.height-q.y).toFixed(2)+'px');
      slot.el.style.setProperty('--oldtown-perspective',q.scale.toFixed(4));
    }
  }
}

createRows();
const unsubscribe=runtime.subscribe(render);
global.addEventListener('paperchalk-world-enter',()=>render(runtime.getSnapshot()));
global.addEventListener('beforeunload',()=>unsubscribe?.(),{once:true});

global.PaperchalkOldTownBuildings=Object.freeze({
  poolId:pool.id,
  rowWidth,
  slotCount:ROW_COPIES*SLOTS_PER_ROW,
  get centerRow(){return lastCenterRow},
  render
});
})(window);
