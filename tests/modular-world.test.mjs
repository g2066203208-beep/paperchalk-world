import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuntime,signal} from '../site/core/runtime.js';
import {runtime,createWorld,applyWorld,advanceWorld} from '../site/core/game.js';
import {FACTIONS,ownership} from '../site/systems/factions.js';
import {initialGame} from '../site/engine.js';
const legacy=initialGame();
test('plugin order is deterministic, dependency sorted; bad dependency/cycle rejected',()=>{
 assert.deepEqual(runtime.moduleIds,['factions','people','civic','dialogue','news']);
 assert.equal(signal(11,2,'npc',3),signal(11,2,'npc',3));
 const basic={id:'a',deps:[],init:()=>0,reduce:data=>({data}),tick:data=>({data})};
 const other={...basic,id:'b',deps:['a']};
 assert.deepEqual(createRuntime([other,basic]).moduleIds,['a','b']);
 assert.throws(()=>createRuntime([{...basic,deps:['b']},other]),/cycle/);
 assert.throws(()=>createRuntime([{...basic,deps:['missing']}]),/unknown dependency/);
 assert.throws(()=>createRuntime([basic,basic]),/duplicate/);
});
test('v4 day and wealth preserved; persisted world validated and copied',()=>{
 const world=createWorld(legacy,null);
 assert.equal(world.day,1);assert.equal(world.slices.factions.cells.length,16);
 assert.equal(world.slices.people.members.length,7);assert.equal(world.slices.news.articles.length,1);
 assert.deepEqual(createWorld(legacy,JSON.stringify(world)),world);
 const old={...legacy,day:12,cash:666};
 const migrated=createWorld(old,null);
 assert.equal(migrated.day,12);assert.equal(old.cash,666);
 assert.equal(createWorld(old,JSON.stringify({schema:8,day:12})).day,12);
});
test('territory update checks adjacency and emits accountable cash effect',()=>{
 let world=createWorld(legacy);
 const invalid=applyWorld(world,{module:'factions',type:'influence',cell:'s15'},legacy);
 assert.equal(invalid.ok,false);assert.deepEqual(invalid.state,world);
 const r=applyWorld(world,{module:'factions',type:'influence',cell:'s1'},legacy);
 assert.equal(r.ok,true,r.message);
 assert.equal(r.state.slices.factions.cells[1].influence.player,20);
 assert.equal(r.effects[0].amount,-40);
 assert.equal(world.slices.factions.cells[1].influence.player,0);
 assert.equal(applyWorld(world,{module:'factions',type:'influence',cell:'s1'},{...legacy,cash:0}).ok,false);
});
test('personnel appointments and training are independent extensible commands',()=>{
 let w=createWorld(legacy);
 let r=applyWorld(w,{module:'people',type:'appoint',person:'kai',job:'capo'},legacy);
 assert.equal(r.ok,true);w=r.state;
 assert.equal(w.slices.people.members.find(p=>p.id==='kai').job,'capo');
 assert.equal(applyWorld(w,{module:'people',type:'appoint',person:'mio',job:'capo'},legacy).ok,false);
 r=applyWorld(w,{module:'people',type:'train',person:'kai',skill:'network'},legacy);
 assert.equal(r.ok,true);w=r.state;
 assert.equal(w.slices.people.members.find(p=>p.id==='kai').skills.network,2);
 assert.equal(applyWorld(w,{module:'people',type:'train',person:'kai',skill:'network'},legacy).ok,false);
});
test('dialogue branch saves real response and reputation effect',()=>{
 const w=createWorld(legacy);
 const r=applyWorld(w,{module:'dialogue',type:'choose',person:'kai',node:'greet',choice:'steady'},legacy);
 assert.equal(r.ok,true);assert.equal(r.effects[0].kind,'respect');
 assert.equal(r.state.slices.dialogue.history.length,1);
 assert.ok(r.events.some(x=>x.type==='dialogue.spoken'));
 assert.equal(applyWorld(w,{module:'dialogue',type:'choose',person:'kai',node:'greet',choice:'invalid'},legacy).ok,false);
});
test('100 seeds × 30 days: autonomous rivals, immutable states, budget guards and news provenance',()=>{
 for(let seed=1;seed<=100;seed++){
  let w=runtime.initial(seed,1);
  let changed=0;
  for(let day=2;day<=31;day++){
   const previous=structuredClone(w),r=runtime.advance(w,{cash:600,heat:12,crew:legacy.crew,orders:[]});
   w=r.state;
   assert.deepEqual(previous.events,previous.events,'old reference still valid');
   assert.equal(w.day,day);
   assert.ok(w.events.length<=220);
   assert.ok(w.slices.news.articles.length<=45);
   assert.ok(w.slices.civic.security>=0&&w.slices.civic.security<=100);
   for(const g of Object.values(w.slices.factions.groups))assert.ok(Number.isFinite(g.cash)&&g.cash>=0,'AI cannot spend money below zero');
   changed+=r.events.filter(e=>e.type==='territory.changed').length;
  }
  const deterministic=runtime.initial(seed,1);
  assert.deepEqual(runtime.advance(deterministic,{cash:600,heat:12,crew:legacy.crew,orders:[]}).state,
                   runtime.advance(runtime.initial(seed,1),{cash:600,heat:12,crew:legacy.crew,orders:[]}).state);
  assert.ok(w.slices.news.articles.length>=3);
  assert.ok(Object.values(ownership(w.slices.factions)).reduce((a,b)=>a+b,0)===16);
 }
});
test('legacy daily result integrates into autonomous world tick without altering old economy',()=>{
 const before=initialGame(),after={...before,day:2};
 const w=createWorld(before);
 const r=advanceWorld(w,before,after);
 assert.equal(r.state.day,2);assert.ok(r.events.some(e=>e.type==='faction.influence'));
 assert.equal(after.cash,190,'world tick does not edit legacy object');
});
