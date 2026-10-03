import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {LAB_DURATION,samplePaperWorld} from '../demo-lab/transition/PaperWorldTimeline.mjs';

const root=fileURLToPath(new URL('../demo-lab/',import.meta.url));

async function files(dir=root){
  const out=[];
  for(const name of await readdir(dir)){
    const p=path.join(dir,name),s=await stat(p);
    if(s.isDirectory())out.push(...await files(p)); else out.push(p);
  }
  return out;
}

test('Demo Lab root is the game-first white-paper transition study',async()=>{
  const html=await readFile(path.join(root,'index.html'),'utf8');
  const meta=JSON.parse(await readFile(path.join(root,'lab-meta.json'),'utf8'));
  assert.match(html,/纯白纸游戏转场 Demo/);
  assert.match(html,/GAME VIEW · WHITE PAPER ONLY/);
  assert.match(html,/纸感是视觉语法，不是物理规则/);
  assert.match(html,/PAPER_WORLD_WHITEBOX_PROMPT\.md/);
  assert.equal(meta.focus,'game-first-white-paper-transition');
  assert.equal(meta.displayVersion,'DL-2026.10.03.5');
  assert.equal(meta.directMergeToMain,false);
});

test('the detailed production prompt is substantial and cites the chosen open techniques',async()=>{
  const prompt=await readFile(path.join(root,'PAPER_WORLD_WHITEBOX_PROMPT.md'),'utf8');
  assert.ok(prompt.length>3500,'whitebox prompt should be a substantial ~2000-character-plus production brief');
  assert.match(prompt,/Tearaway/);
  assert.match(prompt,/InstancedMesh/);
  assert.match(prompt,/clipping \/ stencil/);
  assert.match(prompt,/Theatre\.js/);
  assert.match(prompt,/游戏镜头/);
  assert.match(prompt,/大地图与很多场景/);
  assert.match(prompt,/禁止把场景做成真实纸机械教学模型/);
});

test('Demo Lab remains isolated from production application code',async()=>{
  const forbidden=[/(?:^|[/'"])\.\.\/studio(?:\/|['"])/,/(?:^|[/'"])\.\.\/src(?:\/|['"])/,/(?:^|[/'"])\.\.\/app(?:\/|['"])/,/(?:^|[/'"])\.\.\/styles(?:\/|['"])/];
  for(const filename of await files()){
    if(!/\.(?:js|mjs|html|css|json|md)$/.test(filename))continue;
    const source=await readFile(filename,'utf8');
    for(const rule of forbidden)assert.doesNotMatch(source,rule,path.relative(root,filename)+' crosses into production code');
  }
});

test('timeline is game choreography rather than mechanical simulation',()=>{
  assert.ok(LAB_DURATION>=1.3&&LAB_DURATION<=1.6);
  const a=samplePaperWorld(0),b=samplePaperWorld(.25),c=samplePaperWorld(.5),d=samplePaperWorld(.75),e=samplePaperWorld(1);
  assert.equal(a.cityRelease,0);assert.equal(a.destinationRise,0);
  assert.ok(b.cityRelease>.1);assert.equal(b.destinationRise,0);
  assert.ok(c.cityRelease>.8&&c.cityRelease<.98);assert.ok(c.destinationRise>.1&&c.destinationRise<.5);assert.ok(c.shadowPass>.4&&c.shadowPass<.8);
  assert.ok(d.destinationRise>.9);assert.ok(d.details>.4);
  assert.equal(e.destinationRise,1);assert.equal(e.details,1);assert.equal(e.lights,1);assert.equal(e.settle,1);
});

test('scene uses paper magic, actual protagonist and scalable repeated rendering',async()=>{
  const scene=await readFile(new URL('../demo-lab/transition/PaperWorldScene.js',import.meta.url),'utf8');
  const player=await readFile(new URL('../demo-lab/transition/PaperWorldPlayer.js',import.meta.url),'utf8');
  assert.match(scene,/GAME PAPER SWEEP/);
  assert.match(scene,/NEW SUBWAY PAPER LAYERS/);
  assert.match(scene,/OLD CITY PAPER LAYERS/);
  assert.match(scene,/InstancedMesh/);
  assert.match(scene,/ACTIVE GAMEPLAY PAPER CELL/);
  assert.match(scene,/PROXY_RADIUS=2/);
  assert.match(player,/assets\/player\/protagonist\.webp/);
  assert.match(player,/Actual game protagonist/);
  assert.doesNotMatch(scene,/V-fold|MASTER HINGE|PLAYER SAFE THRESHOLD|real paper mechanism/i);
});

test('lab UI exposes game view, large-world movement, keyframes and frame stepping',async()=>{
  const html=await readFile(new URL('../demo-lab/index.html',import.meta.url),'utf8');
  const app=await readFile(new URL('../demo-lab/transition-lab.js',import.meta.url),'utf8');
  for(const value of ['.25','.5','1'])assert.match(html,new RegExp('value="'+value.replace('.','\\.')+'"'));
  for(const value of ['0','.25','.5','.75','1'])assert.match(html,new RegExp('data-jump="'+value.replace('.','\\.')+'"'));
  assert.match(html,/id="viewMode"/);assert.match(html,/实际游戏视角/);
  assert.match(html,/id="largeWorld"/);assert.match(html,/id="playerX"/);
  assert.match(html,/Draw Calls/);
  assert.match(app,/oneFrame=1\/\(60\*LAB_DURATION\)/);
  assert.match(app,/window\.PaperWorldLab/);
});
