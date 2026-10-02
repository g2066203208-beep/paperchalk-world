import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createForest} from '../studio/rendering/forest.js';
import {CROWN_OUTLINES,createPaperTreeGeometry} from '../studio/rendering/forest-art.js';
import {createPaperStageWorld} from '../studio/world/PaperStageWorld.mjs';
import {disposeSceneResources} from '../studio/rendering/resources.js';

test('forest shares thin authored silhouette sheets and stays within its scene budget',t=>{
  const scene=new THREE.Scene(),forest=createForest({THREE,scene,terrainWorld:createPaperStageWorld()});
  t.after(()=>disposeSceneResources(scene));
  const stats=forest.stats(),geometries=new Set();let triangles=0;
  scene.traverse(mesh=>{
    if(!mesh.isMesh)return;
    geometries.add(mesh.geometry);triangles+=(mesh.geometry.index?.count??mesh.geometry.getAttribute('position').count)/3*(mesh.isInstancedMesh?mesh.count:1);
    if(mesh.isInstancedMesh){
      assert.equal(mesh.frustumCulled,true);assert.ok(mesh.boundingSphere?.radius>0,'each spatial batch has valid bounds');
      assert.ok(Number.isFinite(mesh.boundingSphere.radius));
    }
  });
  assert.equal(stats.crownSheetsPerTree,2);assert.ok(stats.treeTriangles<=300);
  assert.ok(stats.triangles<12000,'all placed forest geometry, including distance and floor, remains inexpensive');
  assert.equal(stats.triangles,triangles);assert.equal(geometries.size,6);
  assert.equal(new Set([...geometries].map(geometry=>geometry.getAttribute('position'))).size,3,'layer colours do not duplicate position buffers');
  const treeBatches=forest.canopyGroup.children.filter(mesh=>mesh.userData.forestTreeBatch);
  assert.ok(treeBatches.length>3,'trees are split spatially instead of one permanently visible world-wide batch');
  assert.equal(new Set(treeBatches.map(mesh=>mesh.geometry.getAttribute('position'))).size,1);
  assert.equal(new Set(treeBatches.map(mesh=>mesh.material)).size,1);
  for(const mesh of treeBatches){
    assert.equal(Array.isArray(mesh.material),false,'trunk, both crowns and cut edges draw together');
    assert.equal(mesh.geometry.groups.length,0);
  }
  const near=treeBatches.find(mesh=>mesh.userData.layer===0);
  const firstCanopy=[...near.geometry.getAttribute('paperStock').array].findIndex(stock=>stock===0);
  const actualPigment=new THREE.Color().fromBufferAttribute(near.geometry.getAttribute('color'),firstCanopy);
  assert.equal(actualPigment.getHex(),0x668879,'main sage stock follows the approved board');
  assert.ok(near.material.isMeshLambertMaterial,'paper has no specular plastic response');
  assert.equal(near.material.map.image.width,512);assert.equal(near.material.map.image.height,512);
  assert.equal(stats.drawsPerTreeBatch,1);assert.equal(stats.atlasBytes,1048576);
  const atlas=near.material.map.image.data;
  assert.ok(new Set([...atlas].filter((_,index)=>index%4!==3)).size>12,'the shared atlas carries folds and illustrated ink rather than uniform fill');
});

test('each tree uses low point-count closed paper contours with a real narrow cut edge',()=>{
  for(const outline of CROWN_OUTLINES){
    assert.ok(outline.length>=16&&outline.length<=28);
    const xs=outline.map(p=>p[0]),ys=outline.map(p=>p[1]);
    assert.ok((Math.max(...xs)-Math.min(...xs))/(Math.max(...ys)-Math.min(...ys))>1.5,'crowns are broad authored sheets');
  }
  const geometry=createPaperTreeGeometry(THREE),p=geometry.getAttribute('position'),edges=new Map();
  const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(6)).join(',');
  for(let i=0;i<geometry.index.count;i+=3){
    const ids=[0,1,2].map(j=>key(geometry.index.getX(i+j)));assert.equal(new Set(ids).size,3);
    for(let j=0;j<3;j++){const edge=[ids[j],ids[(j+1)%3]].sort().join('|');edges.set(edge,(edges.get(edge)??0)+1);}
  }
  assert.ok([...edges.values()].every(count=>count===2),'each paper part has closed front, back and cut-edge faces');
  assert.equal(geometry.userData.parts,3);assert.equal(geometry.userData.crownSheets,2);
  assert.ok(geometry.groups.some(group=>group.materialIndex===3&&group.count>0));
  assert.ok(geometry.boundingBox.max.z-geometry.boundingBox.min.z<.21,'the entire layered tree stays thin');
  geometry.dispose();
});
