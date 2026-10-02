import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {CITY_DISTRICTS} from '../studio/world/CityLayout.mjs';
import {CITY_RESIDENTS,createCityPopulation} from '../studio/rendering/city-population.js';
import {disposeSceneResources} from '../studio/rendering/resources.js';

function fixture(t){
  const scene=new THREE.Scene(),flags={},population=createCityPopulation({THREE,scene,flags});
  t.after(()=>disposeSceneResources(scene));return {scene,flags,population};
}

test('every city district has six named neighbours with local dialogue and complete character stock',t=>{
  const {population}=fixture(t),stats=population.stats();
  assert.equal(stats.residents,72);assert.equal(stats.districts,12);assert.equal(stats.atlasVariants,24);
  assert.equal(new Set(CITY_RESIDENTS.map(r=>r.id)).size,72);assert.equal(new Set(CITY_RESIDENTS.map(r=>r.name)).size,72);
  assert.equal(new Set(CITY_RESIDENTS.map(r=>r.line)).size,72);
  for(const district of CITY_DISTRICTS){
    const neighbours=CITY_RESIDENTS.filter(r=>r.districtId===district.id);assert.equal(neighbours.length,6);
    for(const r of neighbours){assert.ok(r.minX>=district.minX&&r.maxX<=district.maxX);assert.ok(r.role&&r.line.length>=16);}
  }
  for(const r of CITY_RESIDENTS){assert.ok(r.z<=-.6&&r.z>=-1.6);assert.ok(r.height>=1.5&&r.height<=2);}
  const mesh=population.group.children[0];assert.ok(mesh.isInstancedMesh);assert.equal(mesh.material.side,THREE.DoubleSide);
  assert.ok(mesh.material.alphaTest>0);assert.equal(mesh.material.depthWrite,true);
  assert.equal(mesh.material.map.image.width,2048);assert.equal(mesh.material.map.image.height,1024);
  const shader={vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <map_fragment>'};
  mesh.material.onBeforeCompile(shader);assert.match(shader.fragmentShader,/residentUV/);assert.match(shader.vertexShader,/residentTile/);
});

test('paused residents stay put and deterministic walking stays continuous inside the local district',t=>{
  const {population,flags}=fixture(t),initial=population.stats();
  for(const key of Object.keys(flags))flags[key]=false;
  assert.equal(population.update(0,0),false);assert.deepEqual(population.stats(),initial);assert.equal(flags.render,false);
  assert.equal(population.update(-1,0),false);assert.equal(population.update(NaN,0),false);
  let previous=initial.people;let sawRest=false,sawEast=false,sawWest=false;
  for(let frame=0;frame<1200;frame++){
    population.update(.1,0);const stats=population.stats();
    for(const [i,r] of stats.people.entries()){
      assert.ok(r.x>=r.minX-1e-8&&r.x<=r.maxX+1e-8);
      assert.ok(Math.abs(r.x-previous[i].x)<=CITY_RESIDENTS[i].speed*.1+1e-8,'walking never teleports at an end point');
      sawRest||=!r.walking;sawEast||=r.walking&&r.facing===1;sawWest||=r.walking&&r.facing===-1;
    }
    previous=stats.people;
  }
  assert.ok(sawRest&&sawEast&&sawWest);
  const other=fixture(t).population;other.update(120,0);
  other.stats().people.forEach((r,i)=>assert.ok(Math.abs(r.x-population.stats().people[i].x)<1e-8,'position is independent of render frame subdivision'));
});

test('nearby returns the closest local resident and visibility follows long-distance travel while paused',t=>{
  const {population,flags}=fixture(t),before=population.stats();
  for(const district of CITY_DISTRICTS){
    const person=population.stats().people.find(p=>p.districtId===district.id);
    assert.equal(population.nearby(person.x)?.id,person.id);assert.equal(population.nearby(person.x)?.role,person.role);
    population.update(0,district.x);
    const stats=population.stats();assert.ok(stats.visible>=3&&stats.visible<=7);assert.equal(stats.clock,0);
    assert.equal(population.group.children[0].count,stats.visible);assert.equal(population.group.children[1].count,stats.visible);
    assert.ok(flags.render&&flags.depth&&flags.ao);
    const matrices=population.group.children[0].instanceMatrix.array;
    for(let i=0;i<stats.visible;i++)assert.ok(Math.abs(matrices[i*16+12]-district.x)<=stats.visibleDistance+.001);
  }
  assert.deepEqual(population.stats().people,before.people,'camera travel does not change resident simulation');
  assert.equal(population.nearby(-1000),null);assert.equal(population.nearby(NaN),null);
  population.update(0,-1000);assert.equal(population.stats().visible,0);assert.equal(population.group.children[0].visible,false);
  assert.equal(population.update(.1,-1000),false,'distant walking does not upload meshes or invalidate the renderer');
});

test('shared resident atlas, materials and geometries are released once by scene disposal',()=>{
  const scene=new THREE.Scene(),population=createCityPopulation({THREE,scene,flags:{}}),geometry=new Set(),material=new Set(),texture=new Set();
  scene.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.material)material.add(o.material);});
  for(const m of material)if(m.map)texture.add(m.map);
  assert.equal(geometry.size,2);assert.equal(material.size,2);assert.equal(texture.size,1);
  const counts={geometry:0,material:0,texture:0};
  for(const [key,set] of [['geometry',geometry],['material',material],['texture',texture]])for(const resource of set)resource.addEventListener('dispose',()=>counts[key]++);
  disposeSceneResources(scene);assert.deepEqual(counts,{geometry:2,material:2,texture:1});assert.equal(scene.children.length,0);
});
