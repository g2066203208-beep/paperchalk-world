import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createTerrain} from '../studio/rendering/terrain.js';
import {STORYBOOK_PAPER_DEFAULTS} from '../studio/rendering/storybook-paper-maps.js';

const surfaceMaps=['map','normalMap','roughnessMap','aoMap','bumpMap','displacementMap'];

function fixture(t){
  const scene=new THREE.Scene(),flags={render:false};
  const paperConfig={scale:STORYBOOK_PAPER_DEFAULTS.scale,normal:0,height:0,blend:0};
  const terrain=createTerrain({THREE,scene,flags,paperConfig,renderer:{capabilities:{getMaxAnisotropy:()=>8}}});
  t.after(()=>{
    const geometries=new Set(),materials=new Set();
    scene.traverse(object=>{
      if(object.geometry)geometries.add(object.geometry);
      for(const material of [].concat(object.material??[]))materials.add(material);
    });
    for(const geometry of geometries)geometry.dispose();
    for(const material of materials)material.dispose();
    for(const texture of terrain.textures)texture.dispose();
    scene.clear();
  });
  return {terrain,mesh:terrain.terrainBlocks,flags,paperConfig};
}

function assertNoSurfaceMaps(material){
  for(const property of surfaceMaps)assert.equal(material[property],null,property+' must be absent');
}

function triangleCount(geometry){return (geometry.index?.count??geometry.getAttribute('position').count)/3;}

// Weld coordinates so the check supports shared extraction vertices and a
// render copy whose vertices have been split to preserve hard fold normals.
function topology(geometry){
  const p=geometry.getAttribute('position'),ids=new Map(),vertices=[],edges=new Map();
  for(let i=0;i<p.count;i++){
    const key=[p.getX(i),p.getY(i),p.getZ(i)].join(',');
    if(!ids.has(key))ids.set(key,ids.size);
    vertices.push(ids.get(key));
  }
  const parents=Array.from({length:ids.size},(_,i)=>i);
  function root(id){while(parents[id]!==id){parents[id]=parents[parents[id]];id=parents[id];}return id;}
  const count=geometry.index?.count??p.count,vertex=i=>vertices[geometry.index?geometry.index.getX(i):i];
  for(let i=0;i<count;i+=3){
    const triangle=[vertex(i),vertex(i+1),vertex(i+2)];
    assert.equal(new Set(triangle).size,3,'no triangle collapses after welding');
    for(let edge=0;edge<3;edge++){
      const a=triangle[edge],b=triangle[(edge+1)%3],key=a<b?a+':'+b:b+':'+a;
      edges.set(key,(edges.get(key)??0)+1);parents[root(a)]=root(b);
    }
  }
  return {openEdges:[...edges.values()].filter(count=>count!==2).length,components:new Set(vertices.map(root)).size};
}

function physicsSnapshot(terrain){
  return {values:terrain.world.values.slice(),state:terrain.world.exportState(),
    samples:[[-7,-4],[0,0],[3,-2],[7,3]].map(([x,z])=>terrain.world.verticalCrossings(x,z)),spawn:terrain.world.spawn};
}

function assertDressing(terrain){
  const meshes=terrain.terrainBlocks.children.flatMap(group=>group.children).filter(object=>object.isInstancedMesh);
  assert.ok(meshes.length>=2,'paper grass and stone instances remain attached to the terrain');
  assert.ok(meshes.every(mesh=>mesh.count>0&&mesh.geometry.getAttribute('position').count>0));
  assert.ok(terrain.stats().tufts>0&&terrain.stats().stones>0);
}

test('authored terrain is one watertight connected land surface with hard matte paper',t=>{
  const {terrain,mesh}=fixture(t);
  assert.equal(terrain.getSurfaceMode(),'pulp');
  assert.equal(terrain.terrain.children.filter(object=>object.isMesh).length,1,'the land is one continuous surface mesh');
  assert.deepEqual(topology(mesh.geometry),{openEdges:0,components:1});
  assert.equal(terrain.stats().openEdges,0);
  assert.equal(terrain.stats().triangles,triangleCount(mesh.geometry));
  assert.ok(mesh.geometry.groups.some(group=>group.materialIndex===0&&group.count>0),'soil faces exist');
  assert.ok(mesh.geometry.groups.some(group=>group.materialIndex===1&&group.count>0),'grass faces exist');
  const normals=mesh.geometry.getAttribute('normal');
  const vertex=i=>mesh.geometry.index?mesh.geometry.index.getX(i):i;
  for(let i=0;i<triangleCount(mesh.geometry)*3;i+=3){
    const first=vertex(i);
    for(let corner=1;corner<3;corner++){
      const other=vertex(i+corner);
      assert.ok(Math.abs(normals.getX(first)-normals.getX(other))<1e-6
        &&Math.abs(normals.getY(first)-normals.getY(other))<1e-6
        &&Math.abs(normals.getZ(first)-normals.getZ(other))<1e-6,
      'all lighting passes receive one hard normal per triangle');
    }
  }
  for(const material of mesh.material){
    assert.equal(material.isMeshPhysicalMaterial,true);
    assert.equal(material.flatShading,true,'folds keep independent face lighting');
    assert.equal(material.roughness,1);assert.equal(material.metalness,0);assert.equal(material.clearcoat,0);
    assert.ok(material.specularIntensity<=.1,'paper does not have a glossy plastic response');
    assert.equal(material.map.colorSpace,THREE.SRGBColorSpace);
    assert.equal(material.normalMap,null);assert.equal(material.displacementMap,null);
  }
  assert.equal(mesh.castShadow,true);assert.equal(mesh.receiveShadow,true);
  assertDressing(terrain);
});

test('surface modes change only pigments and preserve the mesh and collision volume',t=>{
  const {terrain,mesh,flags}=fixture(t),geometry=mesh.geometry;
  const positions=geometry.getAttribute('position').array.slice(),collisions=physicsSnapshot(terrain);
  const maps=mesh.material.map(material=>material.map);
  for(const mode of ['color','pulp','color','pulp']){
    flags.render=false;terrain.setSurfaceMode(mode);
    assert.equal(terrain.getSurfaceMode(),mode);assert.equal(flags.render,true);
    assert.equal(mesh.geometry,geometry);assert.deepEqual(geometry.getAttribute('position').array,positions);
    assert.deepEqual(physicsSnapshot(terrain),collisions);
    mesh.material.forEach((material,index)=>{
      if(mode==='color')assertNoSurfaceMaps(material);else assert.equal(material.map,maps[index],'pigment textures are reused');
    });
  }
  assert.throws(()=>terrain.setSurfaceMode('unknown'),RangeError);assert.equal(terrain.getSurfaceMode(),'pulp');
  assertDressing(terrain);
});

test('paper scale and legacy relief controls cannot move terrain or change collisions',t=>{
  const {terrain,mesh,paperConfig}=fixture(t),geometry=mesh.geometry,collisions=physicsSnapshot(terrain);
  terrain.setSurfaceMode('color');terrain.setPaper({scale:1.25,normal:.4,height:8,blend:1});
  assert.equal(terrain.getSurfaceMode(),'color');for(const material of mesh.material)assertNoSurfaceMaps(material);
  terrain.setSurfaceMode('pulp');
  for(const scale of [1.25,.5]){
    terrain.setPaper({scale,normal:.6});
    for(const texture of terrain.textures){assert.equal(texture.repeat.x,1/scale);assert.equal(texture.repeat.y,1/scale);}
    for(const material of mesh.material){assert.equal(material.normalMap,null);assert.equal(material.displacementMap,null);}
    assert.equal(mesh.geometry,geometry);assert.deepEqual(physicsSnapshot(terrain),collisions);
  }
  assert.equal(paperConfig.height,0);assert.equal(paperConfig.blend,0);
});

test('digging rebuilds a closed cave floor and ceiling and releases the old mesh',t=>{
  const {terrain,mesh,flags}=fixture(t),world=terrain.world,oldGeometry=mesh.geometry,oldTop=terrain.surfaceY(0,0);
  let disposed=0;oldGeometry.addEventListener('dispose',()=>disposed++);
  const center={x:0,y:-1.75,z:0};assert.equal(world.digSphere(center,.9).changed,true);terrain.rebuild();
  assert.equal(disposed,1);assert.notEqual(mesh.geometry,oldGeometry);
  assert.equal(terrain.surfaceY(0,0),oldTop,'the cavity keeps its original roof');
  assert.deepEqual(world.verticalCrossings(0,0).slice(0,3).map(hit=>hit.type),['floor','ceiling','floor']);
  const p=mesh.geometry.getAttribute('position');let caveVertices=0;
  for(let i=0;i<p.count;i++)if(Math.hypot(p.getX(i),p.getY(i)-center.y,p.getZ(i))<1.2)caveVertices++;
  assert.ok(caveVertices>20,'the cavity has rendered geometry beneath the top surface');
  assert.equal(topology(mesh.geometry).openEdges,0,'excavation leaves no cracks');
  assert.ok(terrain.stats().editedSamples>0);
  for(const key of ['render','shadow','depth','volumeShadow','ao'])assert.equal(flags[key],true,key+' is invalidated');
  assertDressing(terrain);
});

test('adding earth changes the rendered land and restoring a save restores its surface',t=>{
  const {terrain,mesh}=fixture(t),world=terrain.world,state=world.exportState(),oldTop=terrain.surfaceY(1,0);
  const originalPositions=mesh.geometry.getAttribute('position').array.slice();
  assert.equal(world.addSphere({x:1,y:oldTop+.25,z:0},.9).changed,true);terrain.rebuild();
  assert.ok(terrain.surfaceY(1,0)>oldTop+.8,'placing raises the authoritative surface');
  const p=mesh.geometry.getAttribute('position');let raisedVertices=0;
  for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i)-1)<.8&&Math.abs(p.getZ(i))<.8&&p.getY(i)>oldTop+.6)raisedVertices++;
  assert.ok(raisedVertices>0,'raised earth appears in the rendered mesh');
  assert.equal(topology(mesh.geometry).openEdges,0);
  assert.equal(world.restore(state),true);terrain.rebuild();assert.equal(terrain.surfaceY(1,0),oldTop);
  assert.deepEqual(mesh.geometry.getAttribute('position').array,originalPositions,'restoring edits reproduces the original deterministic skin');
  assertDressing(terrain);
});
