/* Localhost-only prototype fixtures for automated regression. Never active on production hosting. */
(function(){
'use strict';
if(location.hostname!=='127.0.0.1'&&location.hostname!=='localhost')return;

const apartmentHost=document.getElementById('midgroundApartment');
if(apartmentHost){
  const img=document.createElement('img');
  img.id='midgroundApartment';img.className='midground-apartment';
  img.src='./assets/backgrounds/apartment-midground.webp?v=puppet-r1';
  img.width=780;img.height=1040;img.alt='';img.decoding='async';img.draggable=false;
  apartmentHost.replaceWith(img);
}
const entity=document.getElementById('entityTrack');
for(const [id,fillId,n] of [['enemy','enemyHealthFill',1],['enemy2','enemy2HealthFill',2]]){
  const el=document.getElementById(id);if(!el)continue;
  el.hidden=false;el.className='enemy';el.setAttribute('aria-label','纸境游荡者'+n);
  el.innerHTML='<div class="enemy-health"><div id="'+fillId+'" class="enemy-health-fill"></div></div><img src="./assets/enemies/rag-drifter.svg?v=1" alt="敌人">';
}
const world=document.getElementById('world');
if(world&&!document.getElementById('apartmentDoorPrompt')){
  const p=document.createElement('div');p.id='apartmentDoorPrompt';p.className='door-interact-prompt';p.setAttribute('aria-hidden','true');p.textContent='E / 开门';
  const interior=document.getElementById('interiorScene');world.insertBefore(p,interior);
}
const interior=document.getElementById('interiorScene');
if(interior){
  interior.hidden=false;
  interior.innerHTML=`
    <div id="interiorFarLayer" class="interior-depth-layer interior-far-layer" aria-hidden="true">
      <div class="interior-room-shell paper-stage-piece"></div>
      <div class="interior-wall interior-wall-left paper-stage-piece"></div>
      <div class="interior-wall interior-wall-right paper-stage-piece"></div>
      <div class="interior-ceiling paper-stage-piece"></div>
      <div class="interior-floor interior-floor-first paper-stage-piece"></div>
      <div class="interior-floor interior-floor-second paper-stage-piece"></div>
      <div class="interior-window interior-window-first paper-stage-piece"><span class="interior-window-cross"></span></div>
      <div class="interior-window interior-window-second paper-stage-piece"><span class="interior-window-cross"></span></div>
    </div>
    <div id="interiorMidLayer" class="interior-depth-layer interior-mid-layer" aria-hidden="true">
      <div class="interior-shelf paper-stage-piece"></div>
      <div id="interiorStaircase" class="interior-staircase paper-stage-piece" aria-label="折返双跑楼梯">
        <span class="interior-stair-run interior-stair-run-lower"><i class="interior-stair-rail interior-stair-rail-lower"></i></span>
        <span class="interior-stair-landing"></span>
        <span class="interior-stair-run interior-stair-run-upper"><i class="interior-stair-rail interior-stair-rail-upper"></i></span>
      </div>
      <div id="interiorExitDoor" class="interior-exit-door paper-stage-piece" aria-hidden="true"><span class="interior-door-handle"></span><span class="interior-door-label">门</span></div>
    </div>
    <div id="interiorNearLayer" class="interior-depth-layer interior-near-layer" aria-hidden="true">
      <div class="interior-near-left paper-stage-piece"></div><div class="interior-near-rug paper-stage-piece"></div><div class="interior-near-right paper-stage-piece"></div>
    </div>`;
}
const combat=document.querySelector('.debug-combat-actions');
if(combat&&!document.getElementById('debugAiBtn')){
  combat.insertAdjacentHTML('beforeend','<button id="debugAiBtn" class="debug-action" type="button" data-debug-action="enemyAI">敌人AI：开</button><button class="debug-action" type="button" data-debug-action="enemyNear">敌人靠近</button><button class="debug-action" type="button" data-debug-action="enemyReset">重置敌人</button>');
}
const map=document.querySelector('.debug-map-actions');
if(map&&!document.getElementById('debugSpawnBtn')){
  map.insertAdjacentHTML('afterbegin','<button id="debugSpawnBtn" class="debug-action" type="button" data-debug-action="spawnZones">出生区：关</button>');
}
})();
