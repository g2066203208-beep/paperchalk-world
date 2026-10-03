import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createCityDistricts} from '../studio/rendering/city-districts.js';
import {CITY_DISTRICTS,CITY_BOUNDS,BUS_STOPS,METRO_STATIONS} from '../studio/world/CityLayout.mjs';
import {disposeSceneResources} from '../studio/rendering/resources.js';

function fixture(t){
  const scene=new THREE.Scene(),flags={},city=createCityDistricts({THREE,scene,flags});
  t.after(()=>disposeSceneResources(scene));return {scene,flags,city};
}

test('the complete city has authored landmarks, Chinese shop signs and continuous streets',t=>{
  const {city}=fixture(t),stats=city.stats(),{buildings,landmarks,features}=city.group.userData.cityDistricts;
  assert.equal(stats.districts,12);assert.ok(buildings.length>=90);
  assert.deepEqual(landmarks.map(l=>l.districtId),CITY_DISTRICTS.slice(1).map(d=>d.id));
  assert.ok(stats.signText.includes('灯影电影院'));assert.ok(stats.signText.includes('白榆综合医院'));
  assert.ok(stats.signText.includes('纸城中央站'));assert.ok(stats.signText.includes('彩纸大剧院'));
  for(const district of CITY_DISTRICTS){
    assert.ok(buildings.filter(b=>b.districtId===district.id).length>=6,`${district.name} has street fabric around its landmark`);
    assert.ok(features.some(f=>f.districtId===district.id&&f.kind==='bench'));
  }
  assert.ok(features.some(f=>f.districtId==='civic'&&f.kind==='fountain'));
  assert.deepEqual(features.filter(f=>f.kind==='water').map(f=>f.districtId),['riverside','harbor']);
  // Existing handcrafted school and shops own this central part of the first street.
  assert.ok(buildings.filter(b=>b.districtId==='academy').every(b=>b.x+b.width/2<-11||b.x-b.width/2>27));
  const intervals=[[-11,27],...buildings.map(b=>[b.x-b.width/2,b.x+b.width/2]),...landmarks.map(l=>[l.x-l.width/2,l.x+l.width/2])].sort((a,b)=>a[0]-b[0]);
  let covered=CITY_BOUNDS.minX;
  for(const [start,end] of intervals){assert.ok(start-covered<13,`empty street gap at ${covered}..${start}`);covered=Math.max(covered,end);}
  assert.ok(CITY_BOUNDS.maxX-covered<3,'street fabric reaches the far residential boundary');
});

test('district culling follows the player across every seam and invalidates static buffers only on changes',t=>{
  const {city,flags}=fixture(t);
  assert.deepEqual(city.stats().visibleDistricts,['academy','oldtown']);
  for(const x of [-48,0,60,180,360,480,600,840,960,1080,1320,1380,0]){
    city.update(x);const stats=city.stats();
    const expected=CITY_DISTRICTS.filter(d=>x>=d.minX-160&&x<=d.maxX+160).map(d=>d.id);
    assert.deepEqual(stats.visibleDistricts,expected);assert.ok(stats.visibleBatches<=8);assert.ok(stats.visibleTriangles<30000);
    for(const key of ['render','shadow','depth','volumeShadow'])flags[key]=false;
    assert.equal(city.update(x),false);assert.ok(Object.values(flags).every(value=>value===false));
  }
  assert.equal(city.update(NaN),false);assert.equal(city.update(Infinity),false);
  assert.equal(city.update(720),true);
  for(const key of ['render','shadow','depth','volumeShadow'])assert.equal(flags[key],true);
});

test('new district architecture leaves the character path and all transit entrances open',t=>{
  const {scene,city}=fixture(t),ray=new THREE.Raycaster(),camera=new THREE.PerspectiveCamera(36,1440/900,.1,100);
  const target=new THREE.Vector3(),projected=new THREE.Vector3();
  for(let x=CITY_BOUNDS.minX;x<=CITY_BOUNDS.maxX;x+=4){
    city.update(x);scene.updateMatrixWorld(true);camera.position.set(x+.73,4.47,15.78);camera.lookAt(x,3,-.35);camera.updateMatrixWorld(true);
    for(const y of [1.05,1.65,2.2]){
      target.set(x,y,0);projected.copy(target).project(camera);ray.setFromCamera(projected,camera);ray.far=camera.position.distanceTo(target)-1e-4;
      assert.equal(ray.intersectObjects(city.group.children,true).length,0,`actor is obscured at ${x}, ${y}`);
    }
  }
  for(const stop of [...BUS_STOPS,...METRO_STATIONS]){
    const tallFront=[];
    city.group.traverse(object=>{
      if(!object.geometry)return;const p=object.geometry.getAttribute('position');
      for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i)-stop.x)<4&&p.getZ(i)>-.8&&p.getY(i)>1) tallFront.push(object.name);
    });
    assert.deepEqual(tallFront,[],`${stop.name} ${stop.kind} entrance is reserved`);
  }
});

test('districts share bounded GPU resources and release invisible geometry and textures',()=>{
  const scene=new THREE.Scene(),city=createCityDistricts({THREE,scene}),stats=city.stats();
  const geometries=new Set(),materials=new Set(),textures=new Set();let triangles=0,disposedGeometry=0,disposedMaterial=0,disposedTexture=0;
  scene.traverse(object=>{
    if(!object.geometry)return;
    assert.ok(object.geometry.boundingBox&&object.geometry.boundingSphere);assert.ok(Number.isFinite(object.geometry.boundingSphere.radius));
    assert.equal(object.frustumCulled,true);geometries.add(object.geometry);materials.add(object.material);
    const p=object.geometry.getAttribute('position'),n=object.geometry.getAttribute('normal');triangles+=p.count/3;
    for(let i=0;i<p.count;i++){assert.ok(Number.isFinite(p.getX(i))&&Number.isFinite(p.getY(i))&&Number.isFinite(p.getZ(i)));assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<1e-5);}
  });
  for(const material of materials)for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
  assert.equal(geometries.size,24);assert.equal(materials.size,2);assert.equal(textures.size,2);assert.equal(triangles,stats.triangles);assert.ok(triangles<80000);assert.ok(stats.atlasBytes<=16*1024*1024);
  for(const geometry of geometries)geometry.addEventListener('dispose',()=>disposedGeometry++);
  for(const material of materials)material.addEventListener('dispose',()=>disposedMaterial++);
  for(const texture of textures)texture.addEventListener('dispose',()=>disposedTexture++);
  disposeSceneResources(scene);assert.equal(disposedGeometry,24);assert.equal(disposedMaterial,2);assert.equal(disposedTexture,2);assert.equal(scene.children.length,0);
});
