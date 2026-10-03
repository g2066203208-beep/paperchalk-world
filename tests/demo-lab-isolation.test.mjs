import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {LAB_DURATION,lampWave,paperSettle,samplePaperStage} from '../demo-lab/transition/PaperStageTimeline.mjs';

const root=fileURLToPath(new URL('../demo-lab/',import.meta.url));

async function files(dir=root){
  const out=[];
  for(const name of await readdir(dir)){
    const p=path.join(dir,name),s=await stat(p);
    if(s.isDirectory())out.push(...await files(p)); else out.push(p);
  }
  return out;
}

test('Demo Lab root is the dedicated Paper Stage mechanism study',async()=>{
  const html=await readFile(path.join(root,'index.html'),'utf8');
  const meta=JSON.parse(await readFile(path.join(root,'lab-meta.json'),'utf8'));
  assert.match(html,/Paper Stage Transition Lab/);
  assert.match(html,/WHITE CARD MECHANISM/);
  assert.match(html,/id="timeline"/);
  assert.match(html,/data-jump="\.25"/);
  assert.doesNotMatch(html,/toggleStageScene/);
  assert.equal(meta.focus,'paper-stage-transition-lab');
  assert.equal(meta.displayVersion,'DL-2026.10.03.2');
  assert.equal(meta.directMergeToMain,false);
});

test('Demo Lab remains isolated from production application code',async()=>{
  const forbidden=[/(?:^|[/'"])\.\.\/studio(?:\/|['"])/,/(?:^|[/'"])\.\.\/src(?:\/|['"])/,/(?:^|[/'"])\.\.\/app(?:\/|['"])/,/(?:^|[/'"])\.\.\/styles(?:\/|['"])/];
  for(const filename of await files()){
    if(!/\.(?:js|mjs|html|css|json|md)$/.test(filename))continue;
    const source=await readFile(filename,'utf8');
    for(const rule of forbidden)assert.doesNotMatch(source,rule,path.relative(root,filename)+' crosses into production code');
  }
});

test('paper timeline has one master page action followed by pop-up stages',()=>{
  assert.ok(LAB_DURATION>=1.4&&LAB_DURATION<=1.8);
  const a=samplePaperStage(0),b=samplePaperStage(.25),c=samplePaperStage(.5),d=samplePaperStage(.75),e=samplePaperStage(1);
  assert.equal(a.page,0);assert.equal(a.wall,0);assert.equal(a.light,0);
  assert.ok(b.page>.1);assert.equal(b.fixture,0);
  assert.ok(c.page>.8);assert.ok(c.wall>0);assert.equal(c.light,0);
  assert.ok(d.wall>.85);assert.ok(d.fixture>0);
  assert.equal(e.page,1);assert.equal(e.wall,1);assert.equal(e.fixture,1);assert.equal(e.light,1);
  assert.equal(paperSettle(0),0);assert.equal(paperSettle(1),1);
  assert.ok(paperSettle(.82,.06)>.82);
});

test('station lamps wake from centre outward instead of global fading',()=>{
  const early=[0,1,2,3,4].map(i=>lampWave(.2,i,5));
  assert.ok(early[2]>early[1]);assert.equal(early[0],early[4]);assert.equal(early[1],early[3]);
  const done=[0,1,2,3,4].map(i=>lampWave(1,i,5));
  assert.deepEqual(done,[1,1,1,1,1]);
});

test('new scene encodes physical paper relationships explicitly',async()=>{
  const scene=await readFile(new URL('../demo-lab/transition/PaperStageScene.js',import.meta.url),'utf8');
  assert.match(scene,/MASTER HINGE · STREET PAGE/);
  assert.match(scene,/Fixed underground pop-up deck/);
  assert.match(scene,/SECONDARY SCORE · STREET PAGE/);assert.match(scene,/triangular V-fold card/);
  assert.match(scene,/pageHinge\.rotation\.x/);assert.match(scene,/secondaryHinge\.rotation\.x/);
  assert.match(scene,/pivot\.rotation\.x=-Math\.PI\*\.5\*\(1-local\)/);
  assert.match(scene,/lampWave/);
  assert.doesNotMatch(scene,/opacity\s*=/);
  assert.doesNotMatch(scene,/floorCarrier\.position\.y/);
  assert.doesNotMatch(scene,/backdropCarrier\.position\.y/);
});

test('lab UI exposes slow motion, keyframes and frame stepping',async()=>{
  const html=await readFile(new URL('../demo-lab/index.html',import.meta.url),'utf8');
  const app=await readFile(new URL('../demo-lab/transition-lab.js',import.meta.url),'utf8');
  for(const value of ['.25','.5','1'])assert.match(html,new RegExp('value="'+value.replace('.','\\.')+'"'));
  for(const value of ['0','.25','.5','.75','1'])assert.match(html,new RegExp('data-jump="'+value.replace('.','\\.')+'"'));
  assert.match(html,/stepBack/);assert.match(html,/stepForward/);
  assert.match(app,/oneFrame=1\/\(60\*LAB_DURATION\)/);
  assert.match(app,/window\.PaperStageLab/);
});
