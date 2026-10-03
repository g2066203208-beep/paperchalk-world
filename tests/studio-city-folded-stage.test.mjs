import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createCityFoldedStage} from '../studio/rendering/city-folded-stage.js';

test('folded city stage builds three light accordion layers across every district',t=>{
  const scene=new THREE.Scene();
  const flags={};
  const stage=createCityFoldedStage({THREE,scene,flags});
  t.after(()=>stage.dispose());
  const stats=stage.stats();
  assert.equal(stats.layers,3);
  assert.equal(stats.districts,12);
  assert.equal(stats.panels,216);
  assert.ok(stats.triangles<5000);
  assert.ok(stats.batches<=80);
  assert.equal(scene.children.length,1);
  assert.ok(stage.group.children.length>=12);
  for(const district of stage.group.children.filter(child=>child.name.startsWith('Accordion district'))){
    assert.equal(district.children.length,3);
    assert.ok(district.children.every(layer=>layer.children.length===2));
  }
});

test('accordion stage follows the active district and exposes lane transitions',t=>{
  const stage=createCityFoldedStage({THREE,scene:new THREE.Scene(),flags:{}});
  t.after(()=>stage.dispose());
  const result=stage.update(531,.05,{layer:2,fold:.3});
  assert.equal(result.district,'central');
  assert.equal(result.layer,2);
  assert.ok(result.fold<1);
  const changed=stage.setLayer(0,{seam:true,progress:.45});
  assert.deepEqual(changed,{layer:0,seam:true,progress:.45});
  assert.equal(stage.stats().selectedLayer,0);
});

test('folded stage resources are removable without leaving scene nodes',()=>{
  const scene=new THREE.Scene(),stage=createCityFoldedStage({THREE,scene,flags:{}});
  stage.dispose();
  assert.equal(scene.children.length,0);
});
