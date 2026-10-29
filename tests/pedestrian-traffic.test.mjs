import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialGame} from '../site/engine.js';
import {createWorld} from '../site/core/game.js';
import {LOCATIONS,residentsForStreet,pedestrianPlan,stepWalker} from '../site/scenes/pedestrian-routes.js';
test('citizens are real unique people from the world, not decorative fixed circles',()=>{
 const world=createWorld(initialGame());
 for(const scene of ['alley','market','labor','docks']){
   const residents=residentsForStreet(world,scene);
   assert.ok(residents.length>=3,scene+' has residents');
   assert.equal(new Set(residents.map(p=>p.id)).size,residents.length);
   assert.ok(residents.every(p=>p.home===LOCATIONS[scene].cell));
   assert.ok(!residents.some(p=>p.id==='kai'));
 }
});
test('both left-to-right and right-to-left paths end outside the viewport or at an actual store',()=>{
 const world=createWorld(initialGame());
 const residents=world.slices.population.people;
 for(const scene of Object.keys(LOCATIONS)){
  let left=false,right=false,shops=false;
  for(let i=0;i<32;i++){
   const p=pedestrianPlan(residents[i],scene,0,i);
   assert.ok(p.start===-11||p.start===111,'actual offscreen spawn');
   assert.ok(p.exit===111||p.exit===-11||p.shop,'must leave full scene or enter building');
   assert.ok(p.speed>=13,'progression across whole viewport');
   assert.ok(p.lane>=70&&p.lane<=91,'sidewalk depth lanes');
   if(p.fromLeft)left=true;else right=true;
   if(p.shop)shops=true;
  }
  assert.ok(left&&right&&shops,'bidirectional living street with store access: '+scene);
 }
});
test('pedestrians advance in world percent, stop briefly, continue and disappear',()=>{
 const world=createWorld(initialGame()),person=world.slices.population.people[4],plan=pedestrianPlan(person,'market',0,0);
 let actor={plan,x:plan.start,phase:'walking',stopped:false,remaining:0},history=[];
 for(let t=0;t<400;t++){
  actor=stepWalker(actor,.04);history.push(actor.x);
  if(['leaving','entering-shop'].includes(actor.phase))break;
 }
 assert.ok(Math.abs(actor.x-plan.start)>40,'character crosses a meaningful distance');
 assert.ok(['leaving','entering-shop'].includes(actor.phase),'character actually exits');
 const direction=plan.fromLeft?1:-1;
 assert.ok(direction*(actor.x-plan.start)>0,'correct travel direction');
 const movement=history.filter((x,i)=>i&&Math.abs(x-history[i-1])>.01).length;
 assert.ok(movement>30,'actual continuous position updates');
});
test('scene director has independent lifecycle, animation assets and face-to-face interactions',()=>{
 const src=readFileSync('site/scenes/explore.js','utf8');
 const director=readFileSync('site/scenes/pedestrian-director.js','utf8');
 const css=readFileSync('site/scenes/pedestrian.css','utf8');
 const html=readFileSync('site/index.html','utf8');
 assert.match(src,/createPedestrianDirector/);
 assert.match(src,/traffic\?\.pauseCitizen\(id\)/);
 assert.match(src,/traffic\?\.destroy\(\)/);
 assert.match(director,/requestAnimationFrame/);
 assert.match(director,/cancelAnimationFrame/);
 assert.match(css,/@keyframes ped-step/);
 assert.match(css,/\.pedestrian-facing/);
 assert.match(html,/scenes\/pedestrian\.css/);
});
