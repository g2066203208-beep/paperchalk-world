import test from 'node:test';
import assert from 'node:assert/strict';
import {createSceneManager} from '../site/core/scene-manager.js';
import {createWorld,applyWorld,advanceWorld,runtime} from '../site/core/game.js';
import {streetBuildingsAt} from '../site/world/walkable-street.js';

test('scene plugins are registered, switched, resumed and removable with explicit lifecycle',()=>{
 const m=createSceneManager(),calls=[];
 const driver=id=>({enter:e=>calls.push(id+':enter'),leave:e=>calls.push(id+':leave'),
  refresh:()=>calls.push(id+':refresh'),dispose:()=>calls.push(id+':dispose')});
 m.register('story',driver('story'));m.register('country',driver('country'));
 assert.deepEqual(m.registered(),['story','country']);
 assert.equal(m.activate('story'),true);
 assert.equal(m.activate('story'),false);
 m.activate('country');assert.equal(m.active,'country');
 m.refresh();assert.deepEqual(calls,['story:enter','story:leave','country:enter','country:refresh']);
 assert.throws(()=>m.unregister('country'),/fallback/);
 assert.equal(m.back(),true);assert.equal(m.active,'story');
 assert.equal(m.unregister('country'),true);assert.deepEqual(m.registered(),['story']);
 assert.deepEqual(calls.slice(-3),['country:leave','story:enter','country:dispose']);
 m.destroy();
 assert.throws(()=>m.register('new',driver('new')),/destroyed/);
});
test('geography is official runtime state and survives the full JSON save roundtrip',()=>{
 assert.ok(runtime.moduleIds.includes('geography'));
 let world=createWorld({day:1},null),legacy={day:1,cash:190,heat:12,crew:['kai'],respect:1,orders:[]};
 let state=world.slices.geography;
 assert.equal(state.x,125);assert.equal(state.y,112);assert.equal(state.interior,null);
 const move=applyWorld(world,{module:'geography',type:'move',x:126,y:112},legacy);
 assert.equal(move.ok,true,move.message);
 assert.equal(move.state.slices.geography.x,126);
 assert.equal(world.slices.geography.x,125,'runtime must remain pure and immutable');
 const reload=createWorld(legacy,JSON.stringify(move.state));
 assert.equal(reload.slices.geography.x,126);
 assert.ok(reload.slices.geography.distanceWalked>0);
});
test('building interiors are persistent, map movement validated and travel uses real network',()=>{
 const legacy={day:1,cash:500,heat:12,crew:['kai'],respect:1,orders:[]};
 let w=createWorld(legacy,null);
 let result=applyWorld(w,{module:'geography',type:'move',x:129,y:150},legacy);
 assert.equal(result.ok,false,'cannot hop dozens of regions without a route');
 const b=streetBuildingsAt(125,112)[0];
 result=applyWorld(w,{module:'geography',type:'enter',building:b.id},legacy);
 assert.equal(result.ok,true,result.message);
 w=result.state;
 assert.equal(w.slices.geography.interior,b.id);
 assert.equal(w.slices.geography.visitedBuildings[b.id],1);
 result=applyWorld(w,{module:'geography',type:'map-travel',target:'region-3',mode:'road'},legacy);
 assert.equal(result.ok,false,'must first leave actual building');
 result=applyWorld(w,{module:'geography',type:'leave'},legacy);
 assert.equal(result.ok,true,result.message);w=result.state;
 result=applyWorld(w,{module:'geography',type:'map-travel',target:'region-3',mode:'road'},legacy);
 assert.equal(result.ok,true,result.message);
 assert.equal(result.state.slices.geography.x,92);
 assert.equal(result.state.slices.geography.journeys[0].mode,'road');
 assert.equal(result.state.slices.geography.journeys[0].to,'region-3');
 const stored=createWorld(legacy,JSON.stringify(result.state));
 assert.equal(stored.slices.geography.visitedBuildings[b.id],1);
 assert.equal(stored.slices.geography.journeys.length,1);
});
test('geography is optional for previous save schema and automatically adopted',()=>{
 let w=createWorld({day:1},null);
 delete w.slices.geography;
 const restored=createWorld({day:1},JSON.stringify(w));
 assert.equal(restored.slices.geography.x,125);
 assert.deepEqual(restored.slices.geography.visits,[]);
});
