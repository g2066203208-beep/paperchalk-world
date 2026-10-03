import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCityPrologueWorld} from '../demo-lab/world/CityPrologueWorld.mjs';
import {createSubwayWorld} from '../demo-lab/world/SubwayWorld.mjs';
import {StagePlayerSimulation} from '../demo-lab/core/StagePlayerSimulation.mjs';
import {sceneSaveKey,CITY_SCENE_ID} from '../demo-lab/ui/CityPrologue.mjs';
import {StageLifecycle} from '../demo-lab/stage/StageRig.js';
import {PAPER_STAGE_TIMING,paperSettle,rippleDelay} from '../demo-lab/stage/StageTransitionTimeline.js';

const root=fileURLToPath(new URL('../demo-lab/',import.meta.url));
async function files(dir=root){
  const out=[];
  for(const name of await readdir(dir)){
    const p=path.join(dir,name),s=await stat(p);
    if(s.isDirectory())out.push(...await files(p)); else out.push(p);
  }
  return out;
}

test('demo lab is a playable snapshot with isolated saves',()=>{
  const world=createCityPrologueWorld(),player=new StagePlayerSimulation(world),start=player.snapshot().x;
  for(let i=0;i<60;i++)player.update(1/60,{horizontal:1});
  assert.ok(player.snapshot().x>start+1);
  assert.match(sceneSaveKey(CITY_SCENE_ID),/^paperworld\.demo-lab\./);
  assert.match(sceneSaveKey('forest'),/^paperworld\.demo-lab\./);
});

test('player physics can hand off between city, subway and a moving vehicle pose',()=>{
  const city=createCityPrologueWorld(),subway=createSubwayWorld({anchorX:12});
  const player=new StagePlayerSimulation(city);player.setExternalPose({x:12,y:.5,z:-4.6,supportY:.5,onVehicle:true});
  assert.equal(player.snapshot().onVehicle,true);assert.equal(player.snapshot().z,-4.6);
  player.setWorld(subway,{preserve:true});
  assert.equal(player.world.id,'subway-moonlight-central');assert.equal(player.snapshot().z,0);assert.equal(player.snapshot().y,.5);
  player.setWorld(city,{preserve:true});assert.equal(player.world.id,'city-prologue');
});

test('demo lab never imports production application code',async()=>{
  const forbidden=[/(?:^|[/'"])\.\.\/studio(?:\/|['"])/,/(?:^|[/'"])\.\.\/src(?:\/|['"])/,/(?:^|[/'"])\.\.\/app(?:\/|['"])/,/(?:^|[/'"])\.\.\/styles(?:\/|['"])/];
  for(const filename of await files()){
    if(!/\.(?:js|mjs|html|css|json|md)$/.test(filename))continue;
    const source=await readFile(filename,'utf8');
    for(const rule of forbidden)assert.doesNotMatch(source,rule,path.relative(root,filename)+' crosses into production code');
  }
});

test('lab identity is visibly different from production',async()=>{
  const html=await readFile(path.join(root,'index.html'),'utf8');
  const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
  const meta=JSON.parse(await readFile(path.join(root,'lab-meta.json'),'utf8'));
  assert.match(html,/DEMO LAB · .*demoLabVersion.* · EXPERIMENT ONLY/s);
  assert.equal(pkg.name,'paperchalk-demo-lab');assert.equal(meta.directMergeToMain,false);assert.equal(meta.productionPath,'studio/');assert.match(meta.displayVersion,/^DL-\\d{4}\\.\\d{2}\\.\\d{2}\\.\\d+$/);
});

test('stage architecture is split into director, timeline and stage rigs',async()=>{
  const scene=await readFile(new URL('../demo-lab/rendering/createPaperScene.js',import.meta.url),'utf8');
  const director=await readFile(new URL('../demo-lab/stage/StageDirector.js',import.meta.url),'utf8');
  const city=await readFile(new URL('../demo-lab/stage/CityStageRig.js',import.meta.url),'utf8');
  const subway=await readFile(new URL('../demo-lab/stage/SubwayStageRig.js',import.meta.url),'utf8');
  assert.match(scene,/createStageDirector/);assert.match(scene,/createCityStageRig/);assert.match(scene,/createSubwayStageRig/);
  assert.doesNotMatch(scene,/function cityToSubway/);assert.doesNotMatch(scene,/function subwayToCity/);
  for(const state of ['inactive','preloading','ready','entering','active','exiting','dormant'])assert.equal(StageLifecycle[state],state);
  assert.match(director,/switchTo\(name,anchorX\)/);assert.match(city,/CityFloorCarrier/);assert.match(city,/CityVerticalSets/);
  assert.match(city,/CityNpcRoot/);assert.match(city,/CityBackdropCarrier/);assert.match(subway,/ceilingCarrier\.position\.y/);
});

test('stage choreography uses paper hinges, a hero street page and player-centred ripple delays',async()=>{
  const city=await readFile(new URL('../demo-lab/stage/CityStageRig.js',import.meta.url),'utf8');
  const subwayRig=await readFile(new URL('../demo-lab/stage/SubwayStageRig.js',import.meta.url),'utf8');
  const stageRig=await readFile(new URL('../demo-lab/stage/StageRig.js',import.meta.url),'utf8');
  const districts=await readFile(new URL('../demo-lab/rendering/city-districts.js',import.meta.url),'utf8');
  const scenery=await readFile(new URL('../demo-lab/rendering/city-scenery.js',import.meta.url),'utf8');
  const subway=await readFile(new URL('../demo-lab/rendering/subway-stage.js',import.meta.url),'utf8');
  assert.ok(PAPER_STAGE_TIMING.duration>=1.3&&PAPER_STAGE_TIMING.duration<=1.8);
  assert.ok(rippleDelay(0,0)<rippleDelay(80,0));
  assert.equal(paperSettle(0),0);assert.equal(paperSettle(1),1);assert.ok(paperSettle(.82,{overshoot:.06})>.82);
  assert.match(city,/piece\.group\.rotation\.x=piece\.baseRotationX-fold\*Math\.PI\*\.5/);
  assert.match(city,/City street hero page hinge/);assert.match(city,/Hero street fold crease/);assert.match(city,/paperSettle/);
  assert.match(subwayRig,/deckLift:false/);assert.match(subwayRig,/backdropLift:false/);assert.match(subwayRig,/paperSettle/);assert.match(subwayRig,/stage\.ceilingCarrier\.position\.y/);
  assert.doesNotMatch(subwayRig,/ceilingCarrier\.rotation/);
  assert.match(stageRig,/function hingeAudit/);
  assert.match(districts,/pivotY=minY/);assert.match(districts,/pivotZ=\(minZ\+maxZ\)\/2/);
  assert.match(districts,/stageUnitName:unit\.name/);assert.doesNotMatch(districts,/geometry\.translate\(-district\.x,-\.5,3\.7\)/);
  assert.match(scenery,/pivotY=unit\.minY/);assert.match(scenery,/stageUnitName:unit\.name/);assert.doesNotMatch(scenery,/geometry\.translate\(-pivotX,-\.5,-pivotZ\)/);
  assert.match(subway,/stagePivotY:y/);assert.match(subway,/stagePivotZ:z/);
  assert.doesNotMatch(subway,/Hanging guide hinge/);assert.doesNotMatch(subway,/Station clock hinge/);
  assert.match(subway,/Ceiling suspended guide/);assert.match(subway,/centralWallBay/);
});

test('city NPCs enter a true dormant lifecycle with zero active instances and no interaction',async()=>{
  const population=await readFile(new URL('../demo-lab/rendering/city-population.js',import.meta.url),'utf8');
  const cityRig=await readFile(new URL('../demo-lab/stage/CityStageRig.js',import.meta.url),'utf8');
  assert.match(population,/lifecycle==='dormant'\|\|lifecycle==='inactive'/);
  assert.match(population,/people\.count=shadows\.count=0/);
  assert.match(population,/group\.visible=false/);
  assert.match(population,/if\(lifecycle!=='active'\|\|!Number\.isFinite\(playerX\)\)return null/);
  assert.match(cityRig,/if\(lifecycle\.state!==StageLifecycle\.active\)return false/);
});

test('subway owns a playable single-car train bound to the floor carrier',async()=>{
  const subway=await readFile(new URL('../demo-lab/rendering/subway-stage.js',import.meta.url),'utf8');
  const vehicle=await readFile(new URL('../demo-lab/stage/VehicleSystem.js',import.meta.url),'utf8');
  assert.match(subway,/createTrainVehicle/);assert.match(subway,/trainGroup\.parent===floorCarrier/);
  assert.doesNotMatch(subway,/Subway train paper body',86/);
  for(const name of ['CarriageRoot','Exterior','Interior','DoorLeft','DoorRight','VehiclePassengerRoot'])assert.match(vehicle,new RegExp(name));
  for(const state of ['approaching','arriving','doorsOpening','boarding','doorsClosing','departing','travelling'])assert.match(vehicle,new RegExp(state));
  assert.match(vehicle,/boardingZones/);assert.match(vehicle,/standingAnchors/);assert.match(vehicle,/seatAnchors/);
  assert.match(vehicle,/function board\(/);assert.match(vehicle,/function disembark\(/);assert.match(vehicle,/function updatePassenger\(/);
});

test('subway stage has independent floor, backdrop, NPC and ceiling carriers',async()=>{
  const subway=await readFile(new URL('../demo-lab/rendering/subway-stage.js',import.meta.url),'utf8');
  for(const name of ['Subway floor lift carrier','SubwayBackdropCarrier','SubwayNpcRoot','Subway ceiling fly carrier','Far tunnel matte'])assert.match(subway,new RegExp(name));
  assert.match(subway,/backdropVerticalOnly/);assert.match(subway,/ceilingIndependent/);
});

test('render resolution is adaptive and no longer hard-capped at blurry 1.05/1.22 DPR',async()=>{
  const scene=await readFile(new URL('../demo-lab/rendering/createPaperScene.js',import.meta.url),'utf8');
  const adaptive=await readFile(new URL('../demo-lab/rendering/AdaptiveResolutionManager.js',import.meta.url),'utf8');
  const actor=await readFile(new URL('../demo-lab/rendering/actor.js',import.meta.url),'utf8');
  assert.doesNotMatch(scene,/compact\?1\.05:1\.22/);
  assert.match(adaptive,/compact\?1\.75:2/);assert.match(adaptive,/averageFrameMs/);
  assert.match(scene,/drawingBuffer/);assert.match(scene,/nativePixelRatio/);assert.match(scene,/frameTimeMs/);
  assert.match(actor,/anisotropy=Math\.min\(16/);assert.match(actor,/LinearMipmapLinearFilter/);assert.match(actor,/snapshot\.z/);
});

test('performance UI exposes stage, buffer, NPC, vehicle and pivot diagnostics',async()=>{
  const app=await readFile(new URL('../demo-lab/app.js',import.meta.url),'utf8');
  assert.match(app,/Drawing Buffer/);assert.match(app,/NPC 活动/);assert.match(app,/休眠/);assert.match(app,/活动车辆/);assert.match(app,/Pivot Audit/);
  assert.match(app,/updateTrainPassenger/);assert.match(app,/boardTrain/);assert.match(app,/setWorld\(activeWorld/);
});

test('Demo Lab exposes a visible build version in the stage chrome',async()=>{
  const html=await readFile(new URL('../demo-lab/index.html',import.meta.url),'utf8');
  const app=await readFile(new URL('../demo-lab/app.js',import.meta.url),'utf8');
  assert.match(html,/id="demoLabVersion"/);assert.match(app,/ui\.demoLabVersion\.textContent='v'\+short/);
});
