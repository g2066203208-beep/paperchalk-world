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

test('full stage switch replaces props, floor, background and subway set with theatre animation',async()=>{
  const sceneSource=await readFile(new URL('../demo-lab/rendering/createPaperScene.js',import.meta.url),'utf8');
  const subwaySource=await readFile(new URL('../demo-lab/rendering/subway-stage.js',import.meta.url),'utf8');
  assert.match(sceneSource,/stageTransition=\{progress:0,target:0,active:false,duration:1\.48/);
  assert.match(sceneSource,/terrain\.terrainBlocks\.position\.y=cityTerrainBaseY-cityFloorDrop\*2\.45/);
  assert.match(sceneSource,/subwayStage\.root\.position\.y=-2\.55\*\(1-rise\)/);
  assert.match(sceneSource,/scene\.background\.copy\(outdoorBackground\)\.lerp\(subwayBackground,indoorMix\)/);
  assert.match(sceneSource,/direction\*fold\*Math\.PI\*\.5/);
  assert.match(sceneSource,/direction\*\(1-unfold\)\*Math\.PI\*\.5/);
  assert.match(subwaySource,/Subway platform slab/);
  assert.match(subwaySource,/Recessed track bed/);
  assert.match(subwaySource,/Subway rear paper wall/);
  assert.match(subwaySource,/Subway train paper body/);
  assert.match(subwaySource,/Subway ceiling sheet/);
});


test('Demo Lab exposes a visible build version in the stage chrome',async()=>{
  const html=await readFile(new URL('../demo-lab/index.html',import.meta.url),'utf8');
  const app=await readFile(new URL('../demo-lab/app.js',import.meta.url),'utf8');
  assert.match(html,/id="demoLabVersion"/);
  assert.match(app,/ui\.demoLabVersion\.textContent='v'\+short/);
});
