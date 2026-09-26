/* CI-only runtime fixtures. Production never mounts these demo actors/scenes. */
(function(){
'use strict';
const p=new URLSearchParams(location.search);
const fixture=p.has('core-regression')||p.get('ci')==='ui-smoke'||p.get('ci')==='gpu-smoke';
if(!fixture)return;

document.getElementById('debugToggleBtn')?.removeAttribute('hidden');
document.getElementById('interactBtn')?.removeAttribute('hidden');

const mid=document.getElementById('midgroundBuildingTrack');
if(mid&&!document.getElementById('midgroundApartment')){
  mid.insertAdjacentHTML('beforeend','<img id="midgroundApartment" class="midground-apartment" src="./assets/backgrounds/apartment-midground.webp?v=puppet-r1" width="780" height="1040" alt="" decoding="async" loading="eager" fetchpriority="high" draggable="false">');
}
const entity=document.getElementById('entityTrack');
if(entity&&!document.getElementById('enemy')){
  entity.insertAdjacentHTML('beforeend','<div id="enemy" class="enemy" aria-label="纸境游荡者一号"><div class="enemy-health"><div id="enemyHealthFill" class="enemy-health-fill"></div></div><img src="./assets/enemies/rag-drifter.svg?v=1" alt="敌人"></div><div id="enemy2" class="enemy" aria-label="纸境游荡者二号"><div class="enemy-health"><div id="enemy2HealthFill" class="enemy-health-fill"></div></div><img src="./assets/enemies/rag-drifter.svg?v=1" alt="敌人"></div>');
}
const dialogue=document.getElementById('dialogueStage');
if(dialogue&&!document.getElementById('interiorScene')){
  dialogue.insertAdjacentHTML('beforebegin',`
  <div id="apartmentDoorPrompt" class="door-interact-prompt" aria-hidden="true">E / 开门</div>
  <section id="interiorScene" class="interior-scene" aria-hidden="true" aria-label="公寓室内">
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
      <div id="interiorExitDoor" class="interior-exit-door paper-stage-piece" aria-hidden="true">
        <span class="interior-door-handle"></span><span class="interior-door-label">门</span>
      </div>
    </div>
    <div id="interiorNearLayer" class="interior-depth-layer interior-near-layer" aria-hidden="true">
      <div class="interior-near-left paper-stage-piece"></div>
      <div class="interior-near-rug paper-stage-piece"></div>
      <div class="interior-near-right paper-stage-piece"></div>
    </div>
  </section>`);
}
})();
