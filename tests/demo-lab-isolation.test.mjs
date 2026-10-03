import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCityPrologueWorld} from '../demo-lab/world/CityPrologueWorld.mjs';
import {StagePlayerSimulation} from '../demo-lab/core/StagePlayerSimulation.mjs';
import {sceneSaveKey,CITY_SCENE_ID} from '../demo-lab/ui/CityPrologue.mjs';
import {createPaperScene} from '../demo-lab/rendering/createPaperScene.js';

const root=fileURLToPath(new URL('../demo-lab/',import.meta.url));
async function files(dir=root){
  const out=[];
  for(const name of await readdir(dir)){
    const p=path.join(dir,name),s=await stat(p);
    if(s.isDirectory())out.push(...await files(p));
    else out.push(p);
  }
  return out;
}

test('demo lab is a playable snapshot with isolated saves',()=>{
  const world=createCityPrologueWorld();
  const player=new StagePlayerSimulation(world);
  const start=player.snapshot().x;
  for(let i=0;i<60;i++)player.update(1/60,{horizontal:1});
  assert.ok(player.snapshot().x>start+1);
  assert.match(sceneSaveKey(CITY_SCENE_ID),/^paperworld\.demo-lab\./);
  assert.match(sceneSaveKey('forest'),/^paperworld\.demo-lab\./);
});

test('demo lab never imports production application code',async()=>{
  const forbidden=[
    /(?:^|[/'"])\.\.\/studio(?:\/|['"])/,
    /(?:^|[/'"])\.\.\/src(?:\/|['"])/,
    /(?:^|[/'"])\.\.\/app(?:\/|['"])/,
    /(?:^|[/'"])\.\.\/styles(?:\/|['"])/,
  ];
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
  assert.equal(pkg.name,'paperchalk-demo-lab');
  assert.equal(meta.directMergeToMain,false);
  assert.equal(meta.productionPath,'studio/');
});


test('full stage switch is wired to the Demo Lab UI',async()=>{
  const sceneSource=await readFile(new URL('../demo-lab/rendering/createPaperScene.js',import.meta.url),'utf8');
  const subwaySource=await readFile(new URL('../demo-lab/rendering/subway-stage.js',import.meta.url),'utf8');
  const appSource=await readFile(new URL('../demo-lab/app.js',import.meta.url),'utf8');
  const html=await readFile(new URL('../demo-lab/index.html',import.meta.url),'utf8');
  assert.match(html,/id="toggleStageScene"/);
  assert.match(html,/切换到地铁/);
  assert.match(sceneSource,/function setStage\(name\)/);
  assert.match(sceneSource,/activeStage:'city'/);
  assert.match(sceneSource,/createSubwayStage/);
  assert.match(appSource,/scene\.setStage\(next\)/);
  assert.match(subwaySource,/月灯中央站/);
  assert.match(subwaySource,/月河线/);
});

test('full stage switch uses coordinated carriers and player-centred ripple choreography',async()=>{
  const sceneSource=await readFile(new URL('../demo-lab/rendering/createPaperScene.js',import.meta.url),'utf8');
  const subwaySource=await readFile(new URL('../demo-lab/rendering/subway-stage.js',import.meta.url),'utf8');
  const appSource=await readFile(new URL('../demo-lab/app.js',import.meta.url),'utf8');
  assert.match(sceneSource,/duration:1\.92/);
  assert.match(sceneSource,/City floor lift carrier/);
  assert.match(sceneSource,/\[terrain\.terrainBlocks,traffic\?\.group,transit\?\.group\]/);
  assert.doesNotMatch(sceneSource,/traffic\?\.group,transit\?\.group,population\?\.group/);
  assert.match(sceneSource,/population\?\.setStageWave/);
  assert.match(sceneSource,/cityRipple=.*stageTransition\.anchorX/);
  assert.match(sceneSource,/subwayRipple=/);
  assert.match(sceneSource,/cityFloorCarrier\.position\.y=cityFloorBaseY-cityDrop\*3\.25/);
  assert.match(sceneSource,/subwayStage\.floorCarrier\.position\.y=-3\.25\*\(1-floorRise\)/);
  assert.match(sceneSource,/subwayStage\.ceilingCarrier\.position\.y=\(1-ceilingDown\)\*3\.45/);
  assert.match(sceneSource,/subwayStage\.trainGroup\.position\.x=/);
  assert.match(subwaySource,/trainGroup\.parent===floorCarrier/);
  assert.match(subwaySource,/ceilingCarrier\.parent===root/);
  assert.match(subwaySource,/wallPieces/);
  assert.match(subwaySource,/fixturePieces/);
  assert.match(appSource,/stageChanging=scene\.getState\(\)\.stageTransitioning/);
  assert.match(appSource,/if\(!paused&&!stageChanging\)/);
  const populationSource=await readFile(new URL('../demo-lab/rendering/city-population.js',import.meta.url),'utf8');
  assert.match(populationSource,/function residentFold\(x\)/);
  assert.match(populationSource,/setStageWave/);
  assert.match(populationSource,/transform\.rotation\.set\(-fold\*Math\.PI\*\.5/);
});

test('city paper scenery owns local floor hinges instead of rotating around world zero',async()=>{
  const districts=await readFile(new URL('../demo-lab/rendering/city-districts.js',import.meta.url),'utf8');
  const scenery=await readFile(new URL('../demo-lab/rendering/city-scenery.js',import.meta.url),'utf8');
  assert.match(districts,/stageHinge:true/);
  assert.match(districts,/geometry\.translate\(-district\.x,-\.5,3\.7\)/);
  assert.match(scenery,/stageHinge:true/);
  assert.match(scenery,/geometry\.translate\(-pivotX,-\.5,-pivotZ\)/);
});


test('Demo Lab exposes a visible build version in the stage chrome',async()=>{
  const html=await readFile(new URL('../demo-lab/index.html',import.meta.url),'utf8');
  const app=await readFile(new URL('../demo-lab/app.js',import.meta.url),'utf8');
  assert.match(html,/id="demoLabVersion"/);
  assert.match(app,/ui\.demoLabVersion\.textContent='v'\+short/);
});
