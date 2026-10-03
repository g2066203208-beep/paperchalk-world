import test from 'node:test';
import assert from 'node:assert/strict';
import {CITY_BOUNDS,CITY_DISTRICTS,BUS_STOPS,METRO_STATIONS,districtAt} from '../studio/world/CityLayout.mjs';
import {createCityPrologueWorld} from '../studio/world/CityPrologueWorld.mjs';
import {StagePlayerSimulation} from '../studio/core/StagePlayerSimulation.mjs';
import {SaveStore} from '../studio/core/SaveStore.mjs';

test('twelve authored quarters cover a continuous city more than forty times the original street',()=>{
  assert.equal(CITY_DISTRICTS.length,12);assert.ok(CITY_BOUNDS.maxX-CITY_BOUNDS.minX>32*40);
  for(let i=1;i<CITY_DISTRICTS.length;i++)assert.equal(CITY_DISTRICTS[i-1].maxX,CITY_DISTRICTS[i].minX);
  for(const district of CITY_DISTRICTS)assert.equal(districtAt(district.x).id,district.id);
  assert.equal(districtAt(CITY_BOUNDS.minX).id,CITY_DISTRICTS[0].id);
  assert.equal(districtAt(CITY_BOUNDS.maxX).id,CITY_DISTRICTS.at(-1).id);
});
test('bus and metro stops remain authored street scenery without route travel helpers',()=>{
  const world=createCityPrologueWorld(),player=new StagePlayerSimulation(world);
  assert.equal(BUS_STOPS.length,12);assert.equal(METRO_STATIONS.length,6);
  for(const network of [BUS_STOPS,METRO_STATIONS])for(const stop of network){
    assert.equal(districtAt(stop.x).id,stop.districtId);
    assert.ok(player.restore({x:stop.x,y:.5}));assert.equal(player.snapshot().x,stop.x);
    assert.equal(world.surfaceY(stop.x),.5);
  }
});
test('positions in the farthest district survive the existing save format and restore to the city pavement',()=>{
  let text=null;const storage={getItem:()=>text,setItem:(key,value)=>{text=value;},removeItem:()=>{text=null;}};
  const saves=new SaveStore({storage}),world=createCityPrologueWorld(),player=new StagePlayerSimulation(world);
  player.restore({x:1371,y:.5});assert.equal(saves.save(player.snapshot()).ok,true);
  player.reset();assert.equal(player.restore(saves.load().snapshot),true);assert.equal(player.snapshot().x,1371);
  assert.ok(player.update(1/60,{horizontal:-1}).x<1371);
});
