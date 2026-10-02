import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createCityScenery} from '../studio/rendering/city-scenery.js';
import {disposeSceneResources} from '../studio/rendering/resources.js';

function fixture(t){
  const scene=new THREE.Scene(),flags={},city=createCityScenery({THREE,scene,world:{surfaceY:()=>.5},flags});
  t.after(()=>disposeSceneResources(scene));return {scene,flags,city};
}

test('city scenery stays within the geometry budget and shares architectural textures',t=>{
  const {city}=fixture(t),stats=city.stats(),materials=new Set();let triangles=0;
  for(const mesh of city.group.children){
    assert.ok(mesh.isMesh);assert.equal(mesh.frustumCulled,true);
    assert.ok(mesh.geometry.boundingBox&&mesh.geometry.boundingSphere);
    assert.ok(Number.isFinite(mesh.geometry.boundingSphere.radius));
    triangles+=mesh.geometry.getAttribute('position').count/3;materials.add(mesh.material);
  }
  assert.equal(triangles,stats.triangles);assert.ok(triangles<6000);
  assert.equal(materials.size,2);assert.ok(stats.batches<=28);
  const facades=[...materials].filter(material=>material.map);
  assert.equal(facades.length,1,'every printed facade uses the same colour atlas');
  assert.ok(facades[0].emissiveMap,'only a separate window/sign mask emits light');
  assert.notEqual(facades[0].map,facades[0].emissiveMap);
  assert.equal(facades[0].map.image.width,2048);assert.equal(facades[0].map.image.height,1024);
  assert.equal(facades[0].emissiveMap.image.width,1024);assert.equal(facades[0].emissiveMap.image.height,512);
  assert.ok(stats.atlasBytes<=12*1024*1024);
});

test('city printed triangles address padded atlas regions with correct facade facing',t=>{
  const {city}=fixture(t),regions=Object.values(city.stats().regions);
  for(const region of regions){
    assert.ok(region.u0>0&&region.v0>0&&region.u1<1&&region.v1<1);
    assert.ok(region.u1>region.u0&&region.v1>region.v0);
  }
  for(const mesh of city.group.children){
    const position=mesh.geometry.getAttribute('position'),normal=mesh.geometry.getAttribute('normal'),uv=mesh.geometry.getAttribute('uv');
    for(let i=0;i<position.count;i++){
      assert.ok(Number.isFinite(position.getX(i))&&Number.isFinite(position.getY(i))&&Number.isFinite(position.getZ(i)));
      assert.ok(Math.abs(Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i))-1)<1e-5);
      if(mesh.material.map){
        const u=uv.getX(i),v=uv.getY(i);
        assert.ok(regions.some(r=>u>=r.u0-1e-6&&u<=r.u1+1e-6&&v>=r.v0-1e-6&&v<=r.v1+1e-6),'printed UV stays inside one padded tile');
        assert.ok(normal.getZ(i)>.8,'all illustrated fronts face the walking camera');
      }
    }
  }
  assert.deepEqual(city.group.userData.city.landmarks.map(place=>place.x),[0,12,23]);
  assert.ok(city.stats().signText.includes('市立中学'));assert.ok(city.stats().signText.includes('青灯便利店'));
});

test('city exposes two static shadowed spotlights and owns all GPU resources',()=>{
  const scene=new THREE.Scene(),flags={},city=createCityScenery({THREE,scene,world:{surfaceY:()=>.5},flags});
  assert.equal(city.localLights.length,2);
  for(const [index,light] of city.localLights.entries()){
    assert.ok(light.isSpotLight);assert.equal(light.parent,scene);assert.equal(light.target.parent,scene);
    assert.equal(light.castShadow,true);assert.equal(light.shadow.mapSize.x,512);assert.equal(light.shadow.mapSize.y,512);
    assert.ok(light.angle>=.3&&light.angle<=.48);assert.ok(light.distance>=10&&light.distance<=16);
    assert.equal(light.target.position.y,.5);assert.equal(light.position.x,index===0?1:12);
    assert.equal(light.userData.volumetricIntensity,.85);
  }
  assert.equal(flags.render,true);assert.equal(flags.volumeShadow,true);
  const geometries=new Set(),materials=new Set(),textures=new Set();let releasedGeometry=0,releasedMaterial=0,releasedTexture=0;
  scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)materials.add(object.material);});
  for(const material of materials)for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
  for(const geometry of geometries)geometry.addEventListener('dispose',()=>releasedGeometry++);
  for(const material of materials)material.addEventListener('dispose',()=>releasedMaterial++);
  for(const texture of textures)texture.addEventListener('dispose',()=>releasedTexture++);
  disposeSceneResources(scene);
  assert.equal(releasedGeometry,geometries.size);assert.equal(releasedMaterial,materials.size);assert.equal(releasedTexture,2);assert.equal(scene.children.length,0);
});
