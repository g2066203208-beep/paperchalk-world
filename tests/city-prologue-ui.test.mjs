import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneFromSearch,sceneSaveKey,cityLocation,nearbyCitySight,acceptsInspectionKey} from '../studio/ui/CityPrologue.mjs';
import {SaveStore} from '../studio/core/SaveStore.mjs';

test('the default city and explicit forest preview use separate persistent positions',()=>{
  assert.equal(sceneFromSearch(''),'city-prologue');assert.equal(sceneFromSearch('?scene=forest'),'forest');
  assert.equal(sceneFromSearch('?scene=unknown'),'city-prologue');
  assert.equal(sceneSaveKey('city-prologue'),'paperworld.city-prologue.save.v1');
  const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
  const city=new SaveStore({storage,key:sceneSaveKey('city-prologue')}),forest=new SaveStore({storage,key:sceneSaveKey('forest')});
  const snapshot={x:12,y:.5,z:0,vx:0,vy:0,grounded:true,facing:1,distance:12};
  assert.equal(forest.save({...snapshot,x:20}).ok,true);assert.equal(city.load().status,'empty');
  assert.equal(city.save(snapshot).ok,true);assert.equal(city.load().snapshot.x,12);assert.equal(forest.load().snapshot.x,20);
});

test('only reachable nearby sights offer a short inspection and location labels follow the walk',()=>{
  assert.equal(nearbyCitySight(1).id,'school');assert.equal(nearbyCitySight(12).id,'store');
  for(const x of [-8,5,8,18,24,NaN])assert.equal(nearbyCitySight(x),null);
  assert.equal(cityLocation(1),'校门');assert.equal(cityLocation(7),'街边');assert.equal(cityLocation(12),'便利店');assert.equal(cityLocation(20),'街边');
  for(const x of [1,12]){const sight=nearbyCitySight(x);assert.ok(sight.title&&sight.text&&sight.label);assert.ok(sight.text.length<100);}
});

test('inspection shortcut ignores repeats, text editing, focused buttons, dialogs and browser modifiers',()=>{
  assert.equal(acceptsInspectionKey({code:'KeyE',target:{closest:()=>null}}),true);
  for(const patch of [{repeat:true},{ctrlKey:true},{metaKey:true},{altKey:true},{isComposing:true},{code:'KeyD'},
    {target:{isContentEditable:true}},{target:{closest:()=>({})}}])assert.equal(acceptsInspectionKey({code:'KeyE',...patch}),false);
});
