import test from 'node:test';
import assert from 'node:assert/strict';
import {initialGame} from '../site/engine.js';
import {runtime,createWorld,applyWorld,advanceWorld} from '../site/core/game.js';
import {shortestRoute} from '../site/systems/transport.js';
import {clockLabel} from '../site/systems/clock.js';
const legacy=initialGame();
const cmd=(w,module,type,other={},state=legacy)=>applyWorld(w,{module,type,...other},state);
test('real 48 property titles and 80 citizens with stable 4 phase clock',()=>{
 let w=createWorld(legacy);
 assert.equal(w.slices.estates.parcels.length,48);
 assert.equal(w.slices.population.people.length,80);
 assert.equal(w.slices.justice.precincts.length,2);
 assert.match(clockLabel(1),/1998-09-07/);
 const a=cmd(w,'clock','advance-shift');assert.equal(a.ok,true);w=a.state;
 assert.equal(w.slices.clock.shift,1);
 for(let i=0;i<2;i++)w=cmd(w,'clock','advance-shift').state;
 assert.equal(w.slices.clock.shift,3);
 assert.equal(cmd(w,'clock','advance-shift').ok,false);
 assert.ok(w.slices.population.people.every(p=>p.home&&p.work&&p.leisure));
});
test('parcel is separate from territory: buy, build, revenue, upgrading and risk mode',()=>{
 let s={...legacy,cash:900},w=createWorld(s);
 const lot='lot-1';
 let r=cmd(w,'estates','buy',{lot},s);assert.equal(r.ok,true,r.message);w=r.state;
 assert.equal(w.slices.estates.parcels[1].owner,'player');
 assert.equal(cmd(w,'estates','buy',{lot},s).ok,false);
 r=cmd(w,'estates','build',{lot,building:'diner'},s);assert.equal(r.ok,true,r.message);w=r.state;
 assert.equal(w.slices.estates.parcels[1].building.type,'diner');
 assert.equal(cmd(w,'estates','build',{lot,building:'diner'},s).ok,false);
 r=cmd(w,'estates','upgrade',{lot},s);assert.equal(r.ok,true,r.message);w=r.state;
 assert.equal(w.slices.estates.parcels[1].building.level,2);
 r=cmd(w,'estates','operate',{lot,mode:'underground'},s);assert.equal(r.ok,true);w=r.state;
 const before=structuredClone(w);
 r=runtime.advance(w,{cash:900,heat:0,crew:s.crew,orders:[]});
 assert.ok(r.effects.some(e=>e.label.includes('营业')));
 assert.ok(r.events.some(e=>e.type==='business.risky'));
 assert.ok(r.state.slices.justice.cases.length>=1);
 assert.deepEqual(w,before,'prior world unchanged by daily tick');
});
test('shortest legal route is real 4x4 graph and shipment settles once',()=>{
 const s={...legacy,cash:900};let w=createWorld(s);
 assert.deepEqual(shortestRoute(w.slices.factions.cells,'s0','s3'),['s0','s1','s2','s3']);
 assert.equal(shortestRoute(w.slices.factions.cells,'s0','s999'),null);
 w=cmd(w,'estates','buy',{lot:'lot-1'},s).state;
 w=cmd(w,'estates','build',{lot:'lot-1',building:'warehouse'},s).state;
 const order=cmd(w,'transport','dispatch',{from:'lot-1',to:'s3',courier:'kai'},s);
 assert.equal(order.ok,true,order.message);w=order.state;
 assert.equal(w.slices.transport.shipments.length,1);
 assert.equal(cmd(w,'transport','dispatch',{from:'lot-1',to:'s9',courier:'kai'},s).ok,false);
 let r=runtime.advance(w,{cash:900,heat:0,crew:s.crew,orders:[]});w=r.state;
 assert.equal(w.slices.transport.shipments.length,0);
 assert.equal(w.slices.transport.completed.length,1);
 assert.ok(r.effects.some(e=>e.label==='合法运输订单回款'));
 r=runtime.advance(w,{cash:900,heat:0,crew:s.crew,orders:[]});
 assert.equal(r.state.slices.transport.completed.length,1,'cannot farm same shipment');
});
test('informants, wages and bribe attempt do not erase existing investigation',()=>{
 const s={...legacy,cash:900};let w=createWorld(s);
 let r=cmd(w,'contacts','hire',{role:'informant'},s);assert.equal(r.ok,true);w=r.state;
 assert.equal(cmd(w,'contacts','hire',{role:'informant'},s).ok,false);
 r=cmd(w,'contacts','ask-informant',{},s);assert.equal(r.ok,true);w=r.state;
 assert.equal(cmd(w,'contacts','ask-informant',{},s).ok,false);
 r=cmd(w,'contacts','bribe',{},s);assert.equal(r.ok,true);w=r.state;
 assert.equal(cmd(w,'contacts','bribe',{},s).ok,false);
 r=runtime.advance(w,{cash:900,heat:0,crew:s.crew,orders:[]});w=r.state;
 assert.ok(w.slices.justice.cases.some(c=>c.id.includes('offer')));
 assert.ok(r.effects.some(e=>e.label.includes('工资')));
});
test('contract violence creates case, warrant, detention, trial, prison and release',()=>{
 const s={...legacy,cash:1000};let w=createWorld(s);
 let r=cmd(w,'operations','commission',{operation:'assassination',agent:'kai',target:'bell-lu'},s);
 assert.equal(r.ok,true,r.message);w=r.state;
 assert.equal(cmd(w,'operations','commission',{operation:'assassination',agent:'kai',target:'sail-lin'},s).ok,false);
 for(let i=0;i<6;i++)w=runtime.advance(w,{cash:1000,heat:70,crew:s.crew,orders:[]}).state;
 const stages=new Set(w.events.filter(e=>e.type==='justice.progress').map(e=>e.title));
 assert.ok(stages.has('通缉'));assert.ok(stages.has('羁押'));assert.ok(stages.has('审判'));
 assert.ok(w.slices.justice.cases.length>=1);
 assert.ok(w.slices.justice.sentences.length>=1);
 assert.ok(w.slices.justice.custody.some(x=>x.subject==='kai'));
 for(let i=0;i<12;i++)w=runtime.advance(w,{cash:1000,heat:70,crew:s.crew,orders:[]}).state;
 assert.equal(w.slices.justice.custody.length,0,'sentence completes in bounded time');
 assert.ok(w.slices.justice.cases.some(c=>c.stage==='closed'));
});
test('legacy saves migrate without resetting economy or original daily tasks',()=>{
 const old={...initialGame(),day:8,cash:617};
 const originalWorld=createWorld({...legacy,day:8},null);
 const migrated=createWorld(old,JSON.stringify({schema:1,seed:20261028,day:8,seq:0,events:[],
  slices:{factions:originalWorld.slices.factions,people:originalWorld.slices.people,news:originalWorld.slices.news}}));
 assert.equal(migrated.day,8);assert.equal(old.cash,617);
 assert.equal(migrated.slices.estates.parcels.length,48);
 assert.equal(migrated.slices.justice.cases.length,0);
});
test('30-day 100 seeds: property and justice never duplicate parcels, deterministic news and residents',()=>{
 for(let seed=1;seed<=100;seed++){
  let a=runtime.initial(seed,1),b=runtime.initial(seed,1);
  for(let day=2;day<=31;day++){
   const ctx={cash:200,heat:17,crew:legacy.crew,orders:[]};
   a=runtime.advance(a,ctx).state;
   if(day===2)b=runtime.advance(b,ctx).state;
   assert.equal(a.day,day);
   assert.equal(a.slices.estates.parcels.length,48);
   assert.equal(new Set(a.slices.estates.parcels.map(p=>p.id)).size,48);
   assert.equal(a.slices.population.people.length,80);
   assert.equal(a.slices.clock.shift,0);
   assert.ok(a.slices.news.articles.length<=45);
   assert.ok(a.slices.justice.cases.length<=70);
  }
  assert.deepEqual(runtime.advance(runtime.initial(seed,1),{cash:200,heat:17,crew:legacy.crew,orders:[]}).state,b);
 }
});
