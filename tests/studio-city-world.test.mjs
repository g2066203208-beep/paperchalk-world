import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createCityPrologueWorld} from '../studio/world/CityPrologueWorld.mjs';
import {StagePlayerSimulation} from '../studio/core/StagePlayerSimulation.mjs';
import {createCityTerrain} from '../studio/rendering/city-terrain.js';
import {disposeSceneResources} from '../studio/rendering/resources.js';

test('the city sidewalk is freely walkable in both directions and separate from road traffic',()=>{
  const world=createCityPrologueWorld(),player=new StagePlayerSimulation(world);
  assert.equal(world.id,'city-prologue');assert.equal(world.spawn.x,0);
  for(const horizontal of [1,-1])for(let frame=0;frame<900;frame++){
    const s=player.update(1/60,{horizontal});
    assert.equal(s.y,.5);assert.equal(s.z,0);assert.equal(s.grounded,true);
    assert.ok(s.x>=world.bounds.minX&&s.x<=world.bounds.maxX);
    assert.equal(world.surfaceY(s.x,3.5),.05,'traffic uses the lower road plane');
  }
  assert.ok(player.distance>50);assert.ok(player.restore({x:12,y:200}));assert.equal(player.y,.5);
  assert.equal(world.surfaceY(NaN),null);assert.deepEqual(world.floorCandidates(0,-1),[]);
  assert.equal(world.groundBelow(0,.2),null);assert.equal(world.surfaceY(1600),null);
  assert.ok(world.bounds.maxX-world.bounds.minX>1400,'the playable city spans all twelve districts');
  for(let x=world.bounds.minX+1;x<world.bounds.maxX;x+=30){
    assert.ok(player.restore({x,y:.5}));assert.equal(player.update(1/60,{horizontal:1}).y,.5);
  }
});

test('city paper ground actually renders upward at the same heights as walking and traffic',t=>{
  const scene=new THREE.Scene(),flags={},paperConfig={scale:1.8};
  const terrain=createCityTerrain({THREE,scene,flags,paperConfig});t.after(()=>disposeSceneResources(scene,terrain.textures));
  scene.updateMatrixWorld(true);const ray=new THREE.Raycaster();
  for(const x of [-45,-7,0,12,23,60,120,360,720,1080,1370])for(const z of [-20,-1,0,3.5,7]){
    ray.set(new THREE.Vector3(x,10,z),new THREE.Vector3(0,-1,0));
    const hits=ray.intersectObjects(terrain.terrainBlocks.children,false);
    assert.ok(hits.length,`missing city surface at ${x}/${z}`);
    assert.ok(Math.abs(hits[0].point.y-terrain.world.surfaceY(x,z))<.01,'drawing and collision support match');
    assert.ok(hits[0].face.normal.y>.99);
  }
  assert.ok(terrain.stats().triangles<2500);assert.equal(terrain.textures.length,2);
  const before=terrain.terrainBlocks.children.map(m=>m.geometry);
  terrain.setSurfaceMode('color');assert.equal(terrain.getSurfaceMode(),'color');
  terrain.setSurfaceMode('pulp');assert.deepEqual(terrain.terrainBlocks.children.map(m=>m.geometry),before);
});
