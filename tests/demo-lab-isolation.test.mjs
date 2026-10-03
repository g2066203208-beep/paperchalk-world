import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {LAB_DURATION,sampleGreetingCard} from '../demo-lab/transition/GreetingCardTimeline.mjs';

const root=fileURLToPath(new URL('../demo-lab/',import.meta.url));

async function files(dir=root){
  const out=[];
  for(const name of await readdir(dir)){
    const p=path.join(dir,name),s=await stat(p);
    if(s.isDirectory())out.push(...await files(p)); else out.push(p);
  }
  return out;
}

test('Demo Lab root is the greeting-card page-turn study',async()=>{
  const html=await readFile(path.join(root,'index.html'),'utf8');
  const meta=JSON.parse(await readFile(path.join(root,'lab-meta.json'),'utf8'));

  assert.match(html,/贺卡式翻页转场 Demo/);
  assert.match(html,/GAME VIEW · GREETING CARD FLIP/);
  assert.match(html,/城市封面翻开/);
  assert.match(html,/地铁内页弹起/);
  assert.equal(meta.focus,'greeting-card-page-turn');
  assert.equal(meta.displayVersion,'DL-2026.10.03.7');
  assert.equal(meta.directMergeToMain,false);
});

test('Demo Lab remains isolated from production application code',async()=>{
  const forbidden=[
    /(?:^|[/'"])\.\.\/studio(?:\/|['"])/,
    /(?:^|[/'"])\.\.\/src(?:\/|['"])/,
    /(?:^|[/'"])\.\.\/app(?:\/|['"])/,
    /(?:^|[/'"])\.\.\/styles(?:\/|['"])/
  ];
  for(const filename of await files()){
    if(!/\.(?:js|mjs|html|css|json|md)$/.test(filename))continue;
    const source=await readFile(filename,'utf8');
    for(const rule of forbidden){
      assert.doesNotMatch(source,rule,path.relative(root,filename)+' crosses into production code');
    }
  }
});

test('timeline reads as one page flip followed by an inner-card popup',()=>{
  assert.ok(LAB_DURATION>=1.4&&LAB_DURATION<=1.6);

  const a=sampleGreetingCard(0);
  const b=sampleGreetingCard(.25);
  const c=sampleGreetingCard(.5);
  const d=sampleGreetingCard(.75);
  const e=sampleGreetingCard(1);

  assert.equal(a.cover,0);
  assert.equal(a.innerReveal,0);
  assert.ok(b.cover>.20&&b.cover<.35,'25% should clearly start the card flip');
  assert.equal(b.innerReveal,0,'destination must not leak before the card opens');
  assert.ok(c.cover>.60&&c.cover<.72,'50% should hold the cover around a readable mid-flip angle');
  assert.ok(c.innerReveal>.25&&c.innerReveal<.50,'50% should reveal only part of the inner page');
  assert.ok(c.backWall>0&&c.backWall<.25,'50% should begin the popup, not finish it');
  assert.ok(Math.abs(c.props)<1e-9,'props should not jump up too early');
  assert.equal(d.cover,1);
  assert.ok(d.backWall>.8);
  assert.ok(d.columns>.8);
  assert.ok(d.props>.2);
  assert.equal(e.cover,1);
  assert.equal(e.innerReveal,1);
  assert.equal(e.backWall,1);
  assert.equal(e.columns,1);
  assert.equal(e.props,1);
  assert.equal(e.lights,1);
});

test('scene encodes one cover page, hidden inner page and pop-up layers',async()=>{
  const scene=await readFile(new URL('../demo-lab/transition/GreetingCardScene.js',import.meta.url),'utf8');
  const player=await readFile(new URL('../demo-lab/transition/GreetingCardPlayer.js',import.meta.url),'utf8');

  assert.match(scene,/CITY COVER BOTTOM FOLD/);
  assert.match(scene,/City greeting-card cover/);
  assert.match(scene,/SUBWAY INNER PAGE/);
  assert.match(scene,/SUBWAY POPUP LAYERS/);
  assert.match(scene,/coverHinge\.rotation\.x/);
  assert.match(scene,/innerPage\.visible=s\.innerReveal/);
  assert.match(scene,/popupRoot\.visible=s\.innerReveal/);
  assert.match(scene,/InstancedMesh/);
  assert.match(scene,/ACTIVE GREETING CARD CELL/);
  assert.match(player,/assets\/player\/protagonist\.webp/);
  assert.match(player,/Actual game protagonist/);

  assert.doesNotMatch(scene,/GAME PAPER SWEEP/);
  assert.doesNotMatch(scene,/V-fold|MASTER HINGE|PLAYER SAFE THRESHOLD/i);
});

test('lab UI exposes gameplay view, keyframes, frame stepping and large-world test',async()=>{
  const html=await readFile(new URL('../demo-lab/index.html',import.meta.url),'utf8');
  const app=await readFile(new URL('../demo-lab/transition-lab.js',import.meta.url),'utf8');

  for(const value of ['.25','.5','1']){
    assert.match(html,new RegExp('value="'+value.replace('.','\\.')+'"'));
  }
  for(const value of ['0','.25','.5','.75','1']){
    assert.match(html,new RegExp('data-jump="'+value.replace('.','\\.')+'"'));
  }

  assert.match(html,/id="viewMode"/);
  assert.match(html,/实际游戏视角/);
  assert.match(html,/id="largeWorld"/);
  assert.match(html,/id="playerX"/);
  assert.match(html,/封面翻开/);
  assert.match(html,/内页显现/);
  assert.match(app,/oneFrame=1\/\(60\*LAB_DURATION\)/);
  assert.match(app,/window\.GreetingCardLab/);
});
