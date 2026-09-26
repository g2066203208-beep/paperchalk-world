/* Real-world environment building pools. Z is scene depth only; never player movement. */
(function(global){
'use strict';

const atlas=Object.freeze({
  id:'oldtown-building-atlas-r1',
  src:'./assets/buildings/real-world/old-town/oldtown-building-atlas-r1.webp?v=1',
  width:4137,
  height:380
});

const oldTownBuildings=[
  {id:'oldtown-building-01',x:0,y:0,w:396,h:380},
  {id:'oldtown-building-02',x:400,y:0,w:540,h:380},
  {id:'oldtown-building-03',x:944,y:0,w:364,h:380},
  {id:'oldtown-building-04',x:1312,y:0,w:480,h:380},
  {id:'oldtown-building-05',x:1796,y:0,w:355,h:380},
  {id:'oldtown-building-06',x:2155,y:0,w:382,h:380},
  {id:'oldtown-building-07',x:2541,y:0,w:480,h:380},
  {id:'oldtown-building-08',x:3025,y:0,w:372,h:380},
  {id:'oldtown-building-09',x:3401,y:0,w:368,h:380},
  {id:'oldtown-building-10',x:3773,y:0,w:364,h:380}
].map(v=>Object.freeze({...v,atlas:atlas.id}));

const pools=Object.freeze({
  realWorld:Object.freeze({
    oldTown:Object.freeze({
      id:'real-world.old-town.buildings',
      world:'real-world',
      district:'old-town',
      category:'building',
      label:'现实世界 / 老城区 / 建筑',
      layer:'midground-far',
      // Far midground scene depth. The player/camera never travels on Z.
      z:600,
      authoredScale:2,
      seamOverlap:12,
      seed:0x4f4c4454,
      atlas,
      buildings:Object.freeze(oldTownBuildings)
    })
  })
});

function validate(){
  const pool=pools.realWorld.oldTown;
  const ids=new Set();
  const errors=[];
  if(pool.buildings.length!==10)errors.push('old-town pool must contain the supplied 10 buildings');
  for(const b of pool.buildings){
    if(ids.has(b.id))errors.push('duplicate building id '+b.id);
    ids.add(b.id);
    if(b.x<0||b.y<0||b.w<=0||b.h<=0)errors.push('invalid atlas rect '+b.id);
    if(b.x+b.w>atlas.width||b.y+b.h>atlas.height)errors.push('atlas rect out of bounds '+b.id);
  }
  return {ok:errors.length===0,errors};
}

const validation=validate();
if(!validation.ok)throw new Error('Invalid building pools: '+validation.errors.join('; '));

global.PaperchalkBuildingPools=pools;
global.PaperchalkBuildingPoolRuntime=Object.freeze({validate,atlas});
})(window);
