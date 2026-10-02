import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createCityTransit} from '../studio/rendering/city-transit.js';
import {BUS_STOPS,METRO_STATIONS} from '../studio/world/CityLayout.mjs';
import {disposeSceneResources} from '../studio/rendering/resources.js';

function fixture(t){
  const scene=new THREE.Scene(),flags={},transit=createCityTransit({THREE,scene,flags});
  t.after(()=>disposeSceneResources(scene));return {scene,flags,transit};
}
function advance(transit,seconds,x=36){for(let elapsed=0;elapsed<seconds;elapsed+=.25)transit.update(.25,x);}

test('transit gives every district a paper bus shelter and all six metro portals',t=>{
  const {transit,scene}=fixture(t),stats=transit.stats();
  assert.equal(stats.busStops,BUS_STOPS.length);assert.equal(stats.busStops,12);
  assert.equal(stats.metroStations,METRO_STATIONS.length);assert.equal(stats.metroStations,6);
  assert.equal(scene.children.length,1);assert.ok(stats.triangles<16000);
  assert.ok(stats.busHeight<=1.8);assert.equal(stats.roadZ,3.5);assert.equal(stats.roadY,.05);
  const materials=new Set(),textures=new Set();let lights=0;
  transit.group.traverse(object=>{
    if(object.isLight)lights++;
    if(!object.isMesh)return;
    materials.add(object.material);if(object.material.map)textures.add(object.material.map);
    assert.ok(object.geometry.boundingBox&&object.geometry.boundingSphere);
    assert.ok(Number.isFinite(object.geometry.boundingSphere.radius));
    const p=object.geometry.attributes.position,n=object.geometry.attributes.normal;
    for(let i=0;i<p.count;i++){
      assert.ok(Number.isFinite(p.getX(i))&&Number.isFinite(p.getY(i))&&Number.isFinite(p.getZ(i)));
      assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<1e-5);
    }
  });
  assert.equal(lights,0);assert.equal(materials.size,2);assert.equal(textures.size,1);
  assert.ok(stats.signText.includes('中央车站'));assert.ok(stats.signText.includes('01 城市环线'));
});

test('ambient buses move in both directions, pause, and stop on authored platforms',t=>{
  const {transit}=fixture(t);
  const before=transit.stats();advance(transit,1);
  const moving=transit.stats();
  assert.equal(moving.buses[0].x-before.buses[0].x,8);
  assert.equal(moving.buses[2].x-before.buses[2].x,-8);
  assert.equal(transit.update(0,36),false);assert.deepEqual(transit.stats(),moving);
  advance(transit,14);
  const stopped=transit.stats();assert.equal(stopped.buses[0].atStop,true);
  assert.equal((stopped.buses[0].x-36)%120,0);assert.equal(stopped.timetable.atStop,true);
  advance(transit,2);
  assert.equal(transit.stats().buses[0].x,stopped.buses[0].x);
  assert.equal(transit.stats().buses[0].atStop,true);
  advance(transit,3.25);
  assert.equal(transit.stats().buses[0].atStop,false);
  assert.equal(transit.stats().timetable.nextArrivalSeconds,15);
});

test('bus schedules and journeys animate without reuploading the shared transit atlas',t=>{
  const {transit,flags}=fixture(t),textures=new Set();
  transit.group.traverse(object=>{if(object.material?.map)textures.add(object.material.map);});
  const versions=new Map([...textures].map(texture=>[texture,texture.version]));
  advance(transit,45,516);
  assert.equal(transit.stats().elapsed,45);
  assert.equal(transit.stats().timetable.nextArrivalSeconds,10);
  for(const kind of ['bus','metro']){
    flags.render=flags.depth=flags.ao=false;
    assert.equal(transit.update(.25,711,{kind,fromX:51,toX:1371,progress:.5,direction:1}),true);
    assert.equal(transit.stats().rideX,711);
    assert.ok(flags.render&&flags.depth&&flags.ao,'vehicle movement still refreshes the visible scene');
  }
  for(const [texture,version] of versions)assert.equal(texture.version,version,
    'printed route signs must not invalidate the entire shared GPU texture each second');
});

test('station cells follow the camera without keeping the whole city drawn',t=>{
  const {transit}=fixture(t);
  for(const x of [-48,36,396,756,1116,1370]){
    transit.update(0,x);const stats=transit.stats();assert.ok(stats.visibleStations<=4);
    if(x>=36)assert.ok(stats.visibleStations>=1);
    for(const cell of transit.group.getObjectByName('Street transit').children.filter(c=>c.userData.stop)){
      assert.equal(cell.visible,Math.abs(cell.position.x-x)<stats.stationCullDistance);
    }
    for(const bus of stats.buses)if(bus.visible)assert.ok(Math.abs(bus.x-x)<105);
  }
});

test('bus and metro journeys share exact camera coordinates and reset cleanly',t=>{
  const {transit}=fixture(t),ride={kind:'bus',fromX:36,toX:1356,progress:.4,direction:1};
  transit.update(0,564,ride);assert.equal(transit.stats().rideX,564);assert.equal(transit.stats().rideKind,'bus');
  assert.equal(transit.group.getObjectByName('Your city bus').visible,true);
  assert.equal(transit.stats().underground,false);assert.ok(transit.stats().buses.every(b=>!b.visible));
  const metro={kind:'metro',fromX:1371,toX:51,progress:.5,direction:-1};
  transit.update(0,711,metro);assert.equal(transit.stats().rideX,711);assert.equal(transit.stats().underground,true);
  assert.equal(transit.group.getObjectByName('Street transit').visible,false);
  assert.equal(transit.group.getObjectByName('Platform · 学园街').visible,true);
  const columns=transit.group.getObjectByName('Passing station columns'),columnX=columns.position.x;
  assert.equal(transit.update(0,711,metro),false);assert.equal(columns.position.x,columnX);
  transit.update(0,51,null);assert.equal(transit.stats().underground,false);assert.equal(transit.stats().rideKind,null);
  assert.equal(transit.group.getObjectByName('Street transit').visible,true);
  assert.equal(transit.group.getObjectByName('Your city bus').visible,false);
  transit.update(NaN,NaN,{kind:'metro',fromX:51,toX:NaN,progress:Infinity});
  assert.equal(transit.stats().underground,false);assert.ok(transit.stats().buses.every(b=>Number.isFinite(b.x)));
});

test('all transit geometry, both materials and the shared atlas belong to scene disposal',()=>{
  const scene=new THREE.Scene(),transit=createCityTransit({THREE,scene});
  const geometries=new Set(),materials=new Set(),textures=new Set();
  transit.group.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)materials.add(object.material);});
  for(const material of materials)if(material.map)textures.add(material.map);
  let disposedGeometry=0,disposedMaterial=0,disposedTexture=0;
  for(const geometry of geometries)geometry.addEventListener('dispose',()=>disposedGeometry++);
  for(const material of materials)material.addEventListener('dispose',()=>disposedMaterial++);
  for(const texture of textures)texture.addEventListener('dispose',()=>disposedTexture++);
  disposeSceneResources(scene);
  assert.equal(disposedGeometry,geometries.size);assert.equal(disposedMaterial,materials.size);assert.equal(disposedTexture,textures.size);
  assert.equal(scene.children.length,0);
});

