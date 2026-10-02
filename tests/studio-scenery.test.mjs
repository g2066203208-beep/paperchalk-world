import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createStageScenery} from '../studio/rendering/stage-scenery.js';
import {createPaperStageWorld} from '../studio/world/PaperStageWorld.mjs';
import {disposeSceneResources} from '../studio/rendering/resources.js';

function fixture(t){
  const previousDocument=globalThis.document;
  // Raster appearance is checked in the browser; this fixture exercises the real
  // Three.js geometry, materials, UVs and disposal without requiring WebGL.
  const context=Object.fromEntries(['scale','beginPath','rect','clip','translate','save','restore',
    'moveTo','lineTo','closePath','fill','stroke','fillRect','ellipse','bezierCurveTo','quadraticCurveTo']
    .map(name=>[name,()=>{}]));
  const canvases=[];
  globalThis.document={createElement(tag){
    assert.equal(tag,'canvas');
    const canvas={width:0,height:0,getContext(type){assert.equal(type,'2d');return context;}};
    canvases.push(canvas);return canvas;
  }};
  const scene=new THREE.Scene(),world=createPaperStageWorld();
  const scenery=createStageScenery({THREE,scene,world});
  t.after(()=>{
    disposeSceneResources(scene);
    if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
  });
  return {scene,world,...scenery,canvases,meshes:scenery.group.children.filter(object=>object.isMesh)};
}

test('two illustrated cottages and their props stay inside the mobile geometry and material budget',t=>{
  const {meshes,group,canvases}=fixture(t);
  assert.equal(meshes.length,2,'paint and kraft edges require only two batches');
  let triangles=0,cottageTriangles=0,drawCalls=0;
  const textures=new Set();
  for(const mesh of meshes){
    assert.equal(mesh.material.isMeshLambertMaterial,true,'paper should remain diffuse');
    assert.equal(mesh.castShadow,true);assert.equal(mesh.receiveShadow,true);
    const geometry=mesh.geometry,positions=geometry.getAttribute('position');
    const count=geometry.index?.count??positions.count;
    drawCalls+=geometry.groups.length||1;
    triangles+=count/3;
    for(let i=0;i<count;i+=3){
      const indices=[0,1,2].map(offset=>geometry.index?geometry.index.getX(i+offset):i+offset);
      if(indices.every(index=>positions.getZ(index)<-3))cottageTriangles++;
    }
    if(mesh.material.map)textures.add(mesh.material.map);
  }
  assert.equal(drawCalls,2);assert.equal(textures.size,1);
  assert.ok(cottageTriangles>0&&cottageTriangles<=400,'house detail must stay painted, not become individual meshes');
  assert.ok(triangles<=1000,'whole scenery exceeds its mobile triangle budget');
  assert.equal(group.userData.triangles,triangles,'reported budget uses actual rendered geometry');
  assert.equal(group.userData.cottageTriangles,cottageTriangles);
  assert.equal(canvases.length,1);
  const texture=[...textures][0];
  assert.equal(texture.isCanvasTexture,true);assert.equal(texture.colorSpace,THREE.SRGBColorSpace);
  assert.equal(texture.image.width,1024);assert.equal(texture.image.height,1024);
  assert.equal(texture.image,canvases[0]);
});

test('painted faces point toward the player and all atlas UVs and paper thickness are valid',t=>{
  const {meshes}=fixture(t);
  const edges=new Map(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  for(const mesh of meshes){
    const geometry=mesh.geometry,positions=geometry.getAttribute('position'),normals=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv');
    assert.equal(uv.count,positions.count);assert.equal(normals.count,positions.count);
    for(let i=0;i<positions.count;i++){
      for(const value of [positions.getX(i),positions.getY(i),positions.getZ(i),uv.getX(i),uv.getY(i)])assert.ok(Number.isFinite(value));
      assert.ok(uv.getX(i)>=0&&uv.getX(i)<=1);assert.ok(uv.getY(i)>=0&&uv.getY(i)<=1);
      if(mesh.material.map)assert.ok(normals.getZ(i)>.999,'illustrated face points away from the viewing side');
    }
    for(let i=0;i<positions.count;i+=3){
      a.fromBufferAttribute(positions,i);b.fromBufferAttribute(positions,i+1);c.fromBufferAttribute(positions,i+2);
      assert.ok(b.clone().sub(a).cross(c.clone().sub(a)).lengthSq()>1e-12,'no collapsed triangles');
      const vertices=[a,b,c].map(point=>point.toArray().map(v=>v.toFixed(5)).join(','));
      for(let j=0;j<3;j++){
        const key=[vertices[j],vertices[(j+1)%3]].sort().join('|');
        edges.set(key,(edges.get(key)??0)+1);
      }
    }
  }
  assert.equal([...edges.values()].filter(count=>count!==2).length,0,'fronts, backs and kraft perimeters form closed sheets');
});

test('scene disposal releases both geometry batches, both materials and the one shared atlas',t=>{
  const {scene,meshes}=fixture(t);
  const resources=new Set(meshes.flatMap(mesh=>[mesh.geometry,mesh.material,mesh.material.map].filter(Boolean)));
  const disposed=new Map([...resources].map(resource=>[resource,0]));
  for(const resource of resources)resource.addEventListener('dispose',()=>disposed.set(resource,disposed.get(resource)+1));
  disposeSceneResources(scene);
  assert.equal(resources.size,5);assert.equal(scene.children.length,0);
  for(const count of disposed.values())assert.equal(count,1,'every owned resource is released exactly once');
  disposeSceneResources(scene);
  for(const count of disposed.values())assert.equal(count,1,'an empty disposed scene retains no resource references');
});
