import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BAR_ORDERS,validMixture,computeBarLayout,computeFullPortraitPlacement} from '../site/game/bar-scene.js';

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
 assert.match(html,/game\/menu\.js\?v=20261031-cafe-normal2/);
 assert.match(bar,/portraitLayers/);
 assert.match(bar,/drawBarInterior/);
 const interior=readFileSync('site/game/bar-environment.js','utf8');
 assert.match(interior,/getBarInteriorGeometry/);
 assert.match(interior,/brickLight/);
 assert.match(interior,/topEdge/);
 assert.match(interior,/counterStart/);
 assert.match(bar,/ctx\.scale\(2,2\)/);
 assert.ok(readFileSync('site/game/bar-environment.js','utf8').includes('drawBarInterior'));
 assert.match(bar,/counter|柜台|poly/);
 assert.doesNotMatch(bar,/(balatro|va-11|coffee talk).*\.png/i);
});

test('four viewport panels stay inside canvas and never overlap',()=>{
 const targets=[[195,422],[422,195],[720,450],[410,590],[280,250]];
 function overlaps(a,b){
  return Math.max(a.x,b.x)<Math.min(a.x+a.w,b.x+b.w)&&
   Math.max(a.y,b.y)<Math.min(a.y+a.h,b.y+b.h);
 }
 for(const [w,h] of targets){
  const layout=computeBarLayout(w,h);
  const panels=[layout.header,layout.room,layout.dialogue,layout.mixer];
  for(const panel of panels){
   assert.ok(panel.x>=0&&panel.y>=0&&panel.w>0&&panel.h>0);
   assert.ok(panel.x+panel.w<=w&&panel.y+panel.h<=h,'clipped '+JSON.stringify({w,h,panel}));
  }
  for(let i=0;i<panels.length;i++)for(let j=i+1;j<panels.length;j++)
   assert.equal(overlaps(panels[i],panels[j]),false,'overlap '+JSON.stringify({w,h,i,j}));
  const surface=panels.reduce((a,p)=>a+p.w*p.h,0);
  assert.equal(surface,w*h,'zero dead space; panels fully tile screen');
  assert.ok(layout.room.h>=60&&layout.dialogue.h>=55&&layout.mixer.h>=70);
 }
});

test('complete hostess portrait keeps all 192×256 rows and is never behind counter',()=>{
 const file=readFileSync('site/game/bar-scene.js','utf8');
 assert.match(file,/drawImage\(art,0,0,192,256,/);
 assert.doesNotMatch(file,/drawImage\(art,0,0,192,140,/);
 for(const [w,h] of [[195,422],[422,195],[720,450],[410,590],[280,250]]){
  const r=computeBarLayout(w,h).room;
  const p=computeFullPortraitPlacement(r);
  assert.deepEqual(p.source,[192,256]);
  assert.ok(p.x>=r.x&&p.y>=r.y&&p.y+p.h<=r.y+r.h, 'vertical crop: '+w+' '+h);
  assert.ok(p.x+p.w<=r.x+r.w,'full sprite may not leave the room: '+w+' '+h);
  assert.ok(Math.abs(p.w*256-p.h*192)<=192,'aspect ratio warped');
 }
});

test('long café counter is behind the complete character, not a separate little cabinet',()=>{
 const scene=readFileSync('site/game/bar-scene.js','utf8');
 const env=readFileSync('site/game/bar-environment.js','utf8');
 assert.ok(scene.indexOf('drawBarInterior({p,rect,poly,caption,clock,counts})')<scene.indexOf('ctx.drawImage(art,0,0,192,256,'));
 assert.match(env,/counterStart=x\+n\(w\*\.055\)/);
 assert.match(env,/wallBottom/);
});
