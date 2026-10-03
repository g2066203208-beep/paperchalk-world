import test from 'node:test';
import assert from 'node:assert/strict';
import {CITY_BOUNDS,CITY_DISTRICTS,BUS_STOPS,METRO_STATIONS,PAPER_LAYERS,PAPER_SEAMS,districtAt,nearbyTransit,nearbyPaperSeam,nextPaperLayer,transitDestinations,travelDuration} from '../studio/world/CityLayout.mjs';
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
test('every transit destination is a reachable walkable stop, with separate complete bidirectional networks',()=>{
  const world=createCityPrologueWorld(),player=new StagePlayerSimulation(world);
  assert.equal(BUS_STOPS.length,12);assert.equal(METRO_STATIONS.length,6);
  for(const network of [BUS_STOPS,METRO_STATIONS])for(const stop of network){
    assert.equal(nearbyTransit(stop.x).id,stop.id);assert.equal(districtAt(stop.x).id,stop.districtId);
    assert.ok(player.restore({x:stop.x,y:.5}));assert.equal(player.snapshot().x,stop.x);
    const choices=transitDestinations(stop);assert.equal(choices.length,network.length-1);
    for(const destination of choices){
      assert.equal(destination.kind,stop.kind);assert.notEqual(destination.id,stop.id);
      assert.ok(transitDestinations(destination).some(s=>s.id===stop.id));
      assert.ok(travelDuration(stop,destination)>=3&&travelDuration(stop,destination)<=38);
      for(const fraction of [0,.25,.5,.75,1])assert.equal(world.surfaceY(stop.x+(destination.x-stop.x)*fraction),.5);
    }
  }
  assert.equal(nearbyTransit(0),null);assert.equal(nearbyTransit(Number.NaN),null);
});
test('positions in the farthest district survive the existing save format and restore to the city pavement',()=>{
  let text=null;const storage={getItem:()=>text,setItem:(key,value)=>{text=value;},removeItem:()=>{text=null;}};
  const saves=new SaveStore({storage}),world=createCityPrologueWorld(),player=new StagePlayerSimulation(world);
  player.restore({x:1371,y:.5});assert.equal(saves.save(player.snapshot()).ok,true);
  player.reset();assert.equal(player.restore(saves.load().snapshot),true);assert.equal(player.snapshot().x,1371);
  assert.ok(player.update(1/60,{horizontal:-1}).x<1371);
});

test('paper seams cycle three theatrical layers without creating collision gaps',()=>{
  const world=createCityPrologueWorld(),player=new StagePlayerSimulation(world);
  assert.equal(PAPER_LAYERS.length,3);assert.equal(PAPER_SEAMS.length,12);
  assert.equal(nearbyPaperSeam(6).id,'academy-fold');assert.equal(nearbyPaperSeam(6.1).x,6);assert.equal(nearbyPaperSeam(0),null);
  assert.equal(nextPaperLayer(0),1);assert.equal(nextPaperLayer(1),2);assert.equal(nextPaperLayer(2),0);assert.equal(nextPaperLayer(99),1);
  assert.equal(player.snapshot().paperLayer,0);assert.equal(player.setPaperLayer(1),true);assert.equal(player.snapshot().paperLayer,1);
  assert.equal(player.setPaperLayer(3),false);assert.equal(player.snapshot().paperLayer,1);
  assert.equal(world.surfaceY(6),.5);assert.equal(player.update(1/60,{horizontal:1}).y,.5);
  assert.equal(player.restore({...player.snapshot(),paperLayer:2}),true);assert.equal(player.snapshot().paperLayer,2);
  const records=new Map(),storage={getItem:key=>records.get(key)??null,setItem:(key,value)=>records.set(key,value),removeItem:key=>records.delete(key)};
  const saves=new SaveStore({storage,key:'paper-layer'});assert.equal(saves.save(player.snapshot()).ok,true);
  assert.equal(saves.load().snapshot.paperLayer,2);
});
