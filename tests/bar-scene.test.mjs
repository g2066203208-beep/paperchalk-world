import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BAR_ORDERS,validMixture} from '../site/game/bar-scene.js';

test('bar orders have exact deterministic ingredient combinations',()=>{
 assert.equal(BAR_ORDERS.length,2);
 for(const r of BAR_ORDERS){
  assert.equal(r.goal.length,3);
  assert.ok(r.goal.every(Number.isInteger));
  assert.equal(validMixture(r.goal,r.goal),true);
  for(let i=0;i<3;i++){
   const wrong=r.goal.slice();wrong[i]++;
   assert.equal(validMixture(wrong,r.goal),false);
  }
 }
 assert.equal(validMixture([2,1],[2,1,0]),false);
 assert.equal(validMixture([2,1,0.5],[2,1,0]),false);
});

test('main game boots the bar without deleting previous features',()=>{
 const menu=readFileSync('site/game/menu.js','utf8');
 const html=readFileSync('site/index.html','utf8');
 const bar=readFileSync('site/game/bar-scene.js','utf8');
 assert.match(menu,/createBarScene/);
 assert.match(menu,/switchScene\('bar'\)/);
 assert.match(menu,/bar\.draw\(ctx,W,H\)/);
 assert.match(menu,/bar\.tap\(p\.x,p\.y\)/);
 assert.match(menu,/new URLSearchParams\(location\.search\)\.get\('bar'\)/);
 assert.match(menu,/createHostessIntro/);
 assert.match(menu,/createLeaseUI/);
 assert.match(menu,/createWorld3D/);
 assert.match(html,/game\/menu\.js\?v=20261031-bar2/);
 assert.match(bar,/portraitLayers/);
 assert.match(bar,/counter|柜台|poly/);
 assert.doesNotMatch(bar,/(balatro|va-11|coffee talk).*\.png/i);
});
