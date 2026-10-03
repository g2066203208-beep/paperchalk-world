import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createCityDistricts} from '../studio/rendering/city-districts.js';
import {createCityInteriors} from '../studio/rendering/city-interiors.js';
import {disposeSceneResources} from '../studio/rendering/resources.js';

function fixture(t){
  const scene=new THREE.Scene(),flags={};
  const districts=createCityDistricts({THREE,scene,flags});
  const interiors=createCityInteriors({THREE,scene,flags,
    buildings:districts.group.userData.cityDistricts.buildings});
  t.after(()=>disposeSceneResources(scene));
  return {scene,flags,districts,interiors};
}

test('every authored city building owns a doorway and a hidden paper room',t=>{
  const {districts,interiors}=fixture(t),buildings=districts.group.userData.cityDistricts.buildings;
  assert.ok(buildings.length>=90);
  assert.equal(interiors.stats().rooms,buildings.length);
  for(const building of buildings){
    assert.match(building.id,/^house-/);
    assert.equal(typeof building.entranceX,'number');
    assert.ok(interiors.find(building.id));
    const near=interiors.nearby(building.entranceX,.05);
    assert.equal(near?.type,'interior');
  }
  assert.equal(interiors.group.visible,false);
});

test('entering a doorway reveals one in-place room and leaving restores the street',t=>{
  const {scene,flags,districts,interiors}=fixture(t);
  const building=districts.group.userData.cityDistricts.buildings.find(item=>item.districtId==='residential');
  assert.ok(interiors.setActive(building.id));
  assert.equal(interiors.active(),building.id);
  assert.equal(interiors.group.visible,true);
  assert.equal(interiors.rooms.filter(item=>item.room.visible).length,1);
  interiors.update(.5);
  assert.equal(interiors.rooms.find(item=>item.id===building.id).room.position.y,0);
  assert.ok(flags.render&&flags.shadow&&flags.depth&&flags.volumeShadow);
  assert.equal(interiors.leave(),true);
  assert.equal(interiors.active(),null);
  assert.equal(interiors.group.visible,false);
});

test('interior cards release through the shared scene disposer',t=>{
  const {scene}=fixture(t);
  let geometries=0,materials=0;
  scene.traverse(object=>{
    if(object.geometry)geometries++;
    if(object.material)materials++;
  });
  assert.ok(geometries>0&&materials>0);
  disposeSceneResources(scene);
  assert.equal(scene.children.length,0);
});
