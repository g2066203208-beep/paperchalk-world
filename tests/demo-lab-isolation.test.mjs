import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCityPrologueWorld} from '../demo-lab/world/CityPrologueWorld.mjs';
import {StagePlayerSimulation} from '../demo-lab/core/StagePlayerSimulation.mjs';
import {sceneSaveKey,CITY_SCENE_ID} from '../demo-lab/ui/CityPrologue.mjs';

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
  assert.match(html,/DEMO LAB · EXPERIMENT ONLY/);
  assert.equal(pkg.name,'paperchalk-demo-lab');
  assert.equal(meta.directMergeToMain,false);
  assert.equal(meta.productionPath,'studio/');
});
