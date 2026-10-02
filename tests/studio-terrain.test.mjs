import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createTerrain} from '../studio/rendering/terrain.js';
import {STORYBOOK_PAPER_DEFAULTS} from '../studio/rendering/storybook-paper-maps.js';

function fixture(t){
  const scene=new THREE.Scene(),flags={render:false};
  const paperConfig={...STORYBOOK_PAPER_DEFAULTS};
  const terrain=createTerrain({THREE,scene,flags,paperConfig,renderer:{capabilities:{getMaxAnisotropy:()=>8}}});
  t.after(()=>{
    const geometries=new Set(),materials=new Set();
    scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);for(const material of [].concat(object.material??[]))materials.add(material);});
    for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();
    for(const texture of terrain.textures)texture.dispose();scene.clear();
  });
  return {terrain,scene,flags,paperConfig,meshes:terrain.terrainBlocks.children.filter(m=>m.userData.platformId)};
}

function openEdges(geometry){
  const positions=geometry.getAttribute('position'),ids=new Map(),vertices=[],edges=new Map();
  for(let i=0;i<positions.count;i++){
    const key=[positions.getX(i),positions.getY(i),positions.getZ(i)].map(v=>v.toFixed(6)).join(',');
    if(!ids.has(key))ids.set(key,ids.size);vertices.push(ids.get(key));
  }
  const count=geometry.index?.count??positions.count;
  for(let i=0;i<count;i+=3){
    const v=[0,1,2].map(j=>vertices[geometry.index?geometry.index.getX(i+j):i+j]);
    assert.equal(new Set(v).size,3,'closed scenery has no collapsed triangles');
    for(let j=0;j<3;j++){const a=v[j],b=v[(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');edges.set(key,(edges.get(key)??0)+1);}
  }
  return [...edges.values()].filter(count=>count!==2).length;
}

test('the paper stage has closed authored scenery with rendered tops matching collision profiles',t=>{
  const {terrain,scene,meshes}=fixture(t);
  assert.equal(terrain.world.kind,'paper-stage');assert.equal(meshes.length,terrain.world.platforms.length);
  assert.equal(typeof terrain.world.digSphere,'undefined');assert.equal(typeof terrain.rebuild,'undefined');
  scene.updateMatrixWorld(true);
  const ray=new THREE.Raycaster();
  for(const mesh of meshes){
    const platform=terrain.world.platformAt(mesh.userData.platformId);
    assert.equal(openEdges(mesh.geometry),0,platform.id+' has real closed paper thickness');
    assert.equal(mesh.castShadow,true);assert.equal(mesh.receiveShadow,true);
    for(let i=1;i<platform.profile.length;i++){
      const a=platform.profile[i-1],b=platform.profile[i],x=(a.x+b.x)/2;
      ray.set(new THREE.Vector3(x,10,0),new THREE.Vector3(0,-1,0));
      const hits=ray.intersectObject(mesh,false);
      assert.ok(hits.length>0,platform.id+' has an upward-facing top');
      const physics=terrain.world.floorCandidates(x).find(p=>p.platformId===platform.id);
      assert.ok(Math.abs(hits[0].point.y-physics.y)<1e-5,platform.id+' render and collision match');
      assert.ok(hits[0].face.normal.y>.9,'the creased walkway has the correct outward normal');
    }
    for(const material of mesh.material){
      assert.equal(material.roughness,1);assert.equal(material.metalness,0);assert.equal(material.clearcoat,0);
      assert.ok(material.specularIntensity<.1);assert.equal(material.flatShading,true);
      assert.equal(material.normalMap,null);assert.equal(material.displacementMap,null);
    }
  }
  assert.equal(terrain.stats().platforms,1);assert.ok(terrain.stats().baseTriangles<1500);
  for(let x=terrain.world.bounds.minX;x<=terrain.world.bounds.maxX;x+=.1){
    for(const z of [-7.8,0,2.8])assert.ok(Number.isFinite(terrain.surfaceY(x,z)),'the whole broad ground is continuous');
  }
  assert.ok(meshes[0].geometry.getAttribute('paperDepth'),'corrugated side follows the sloping top');
  assert.equal(meshes[0].material[0].name,'corrugated-kraft-cardboard-core');
  assert.ok(terrain.stats().tufts>0&&terrain.stats().stones>0);
  const details=terrain.terrainBlocks.children.find(p=>p.name==='authored-paper-stage-props');
  assert.ok(details.children.length<20,'static paper props are batched by pigment for mobile rendering');
});

test('paper colour controls preserve stage geometry and the walkable route',t=>{
  const {terrain,scene,meshes,flags,paperConfig}=fixture(t);
  const geometries=meshes.map(m=>m.geometry),profiles=JSON.stringify(terrain.world.platforms),materials=new Set();
  scene.traverse(object=>{for(const m of [].concat(object.material??[]))materials.add(m);});
  const originalMaps=new Map([...materials].map(m=>[m,m.map]));
  for(const mode of ['color','pulp','color','pulp']){
    flags.render=false;terrain.setSurfaceMode(mode);assert.equal(flags.render,true);
    for(const material of materials)assert.equal(material.map,mode==='color'?null:originalMaps.get(material));
    assert.deepEqual(meshes.map(m=>m.geometry),geometries);assert.equal(JSON.stringify(terrain.world.platforms),profiles);
  }
  assert.throws(()=>terrain.setSurfaceMode('unknown'),RangeError);
  terrain.setPaper({scale:1.25,normal:3,height:8,blend:1});
  assert.equal(paperConfig.normal,0);assert.equal(paperConfig.height,0);assert.equal(paperConfig.blend,0);
  for(const texture of terrain.textures){assert.equal(texture.repeat.x,.8);assert.equal(texture.repeat.y,.8);}
  assert.deepEqual(meshes.map(m=>m.geometry),geometries);assert.equal(JSON.stringify(terrain.world.platforms),profiles);
});
