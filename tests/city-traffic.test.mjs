import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createCityTraffic} from '../studio/rendering/city-traffic.js';
import {disposeSceneResources} from '../studio/rendering/resources.js';

function fixture(t){
  const previous=globalThis.document;
  const context=Object.fromEntries(['translate','scale','beginPath','moveTo','lineTo','closePath','fill','stroke','ellipse'].map(key=>[key,()=>{}]));
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
  const scene=new THREE.Scene(),traffic=createCityTraffic({THREE,scene});
  t.after(()=>{disposeSceneResources(scene);if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
  return {scene,traffic};
}

test('paper traffic stays on the road, loops deterministically, and remains still while paused',t=>{
  const {traffic}=fixture(t),start=traffic.stats().x;
  for(const dt of [0,-1,NaN,Infinity])assert.equal(traffic.update(dt),false);
  assert.equal(traffic.stats().x,start);
  for(let i=0;i<60;i++)assert.equal(traffic.update(1/60),true);
  assert.ok(Math.abs(traffic.stats().x-start-3.2)<1e-9);
  const paused=traffic.stats();
  for(let i=0;i<60;i++)traffic.update(0);
  assert.deepEqual(traffic.stats(),paused);
  for(let i=0;i<1200;i++){
    traffic.update(1/60);
    const {x,roadZ,roadY}=traffic.stats();
    assert.ok(x>=-22&&x<=35);assert.equal(roadZ,3.5);assert.equal(roadY,.05);
  }
  assert.equal(traffic.stats().loops,1);
  const beforeResume=traffic.stats().x;traffic.update(60);
  assert.ok(Math.abs(traffic.stats().x-beforeResume-.32)<1e-9,'resuming after a long suspension cannot teleport traffic');
});

test('the car has low silhouette geometry, one shared atlas and a restrained road-only headlight',t=>{
  const {scene,traffic}=fixture(t),{group}=traffic;
  assert.equal(group.children.length,3);assert.equal(traffic.stats().batches,3);
  const face=group.children.find(mesh=>mesh.material.map),edge=group.children.find(mesh=>mesh.material.isMeshLambertMaterial&&!mesh.material.map);
  assert.ok(face&&edge);assert.equal(face.material.map.image.width,512);assert.equal(face.material.map.image.height,256);
  assert.equal(face.material.map.colorSpace,THREE.SRGBColorSpace);
  face.geometry.computeBoundingBox();
  const size=new THREE.Vector3();face.geometry.boundingBox.getSize(size);
  assert.ok(Math.abs(size.x-3.4)<1e-5);assert.ok(size.y<=1.15&&size.y>1);
  let triangles=0;
  for(const mesh of group.children){
    const positions=mesh.geometry.getAttribute('position');triangles+=positions.count/3;
    assert.ok([...positions.array].every(Number.isFinite));
    const uv=mesh.geometry.getAttribute('uv');if(uv)assert.ok([...uv.array].every(value=>value>=0&&value<=1));
  }
  assert.ok(triangles<100);assert.equal(traffic.stats().triangles,triangles);
  assert.ok([...face.geometry.getAttribute('normal').array].every((value,index)=>index%3!==2||value>.99));
  const pool=group.children.find(mesh=>mesh.material.isShaderMaterial);
  assert.equal(pool.castShadow,false);assert.equal(pool.material.depthWrite,false);
  assert.ok(Math.max(...pool.geometry.getAttribute('alpha').array)<.08);
  group.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(group);
  assert.ok(bounds.min.z>3,'car and its headlight never enter the player sidewalk at z=0');
  const resources=new Set(group.children.flatMap(mesh=>[mesh.geometry,mesh.material,mesh.material.map].filter(Boolean)));
  const counts=new Map([...resources].map(resource=>[resource,0]));
  for(const resource of resources)resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));
  disposeSceneResources(scene);
  for(const count of counts.values())assert.equal(count,1);
});
