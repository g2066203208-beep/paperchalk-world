import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createTerrain} from '../studio/rendering/terrain.js';
import {createWorld} from '../studio/world/PaperWorld.mjs';

const surfaceMaps=['map','normalMap','roughnessMap','aoMap','bumpMap','displacementMap'];

function fixture(t){
  const scene=new THREE.Scene();
  const flags={render:false};
  const paperConfig={scale:.65,normal:.85,height:0,blend:0};
  const requests=[];
  const terrain=createTerrain({THREE,scene,flags,paperConfig,
    renderer:{capabilities:{getMaxAnisotropy:()=>8}},
    loadTexture(url,onLoad){
      const texture=new THREE.Texture();
      requests.push({url,texture,onLoad});
      return texture;
    }
  });
  const mesh=terrain.terrainBlocks;
  const [sides,top]=mesh.material;
  t.after(()=>{
    mesh.geometry.dispose();
    for(const material of mesh.material)material.dispose();
    for(const texture of terrain.textures)texture.dispose();
    scene.clear();
  });
  return {terrain,mesh,sides,top,flags,paperConfig,requests};
}

function assertNoSurfaceMaps(material){
  for(const property of surfaceMaps)assert.equal(material[property],null,property+' must be absent');
}

function collisionSnapshot(terrain){
  const world=createWorld(terrain.columnRecords);
  return {
    columns:terrain.columnRecords.map(column=>({...column})),
    surfaces:terrain.columnRecords.flatMap(({x,z})=>[-.25,0,.25].map(offset=>terrain.surfaceY(x+offset,z))),
    gameplaySurfaces:Array.from({length:65},(_,index)=>world.surfaceY(-8+index*.25)),
    tiles:world.queryTiles({minX:-8,maxX:8,minY:-1,maxY:5}),
    stats:world.stats(),
    spawn:world.spawn,
    outside:terrain.surfaceY(100,100)
  };
}

test('Olive Fiber uses sRGB color and linear normal/ORM only on grass tops',t=>{
  const {terrain,mesh,sides,top,requests,flags}=fixture(t);
  assert.equal(terrain.getSurfaceMode(),'pulp');
  assert.equal(top.isMeshStandardMaterial,true);
  assert.equal(top.color.getHex(),0xffffff,'The source color must not be multiplied by green');
  assert.equal(top.map.colorSpace,THREE.SRGBColorSpace);
  assert.equal(top.normalMap.colorSpace,THREE.NoColorSpace);
  assert.equal(top.normalMapType,THREE.TangentSpaceNormalMap);
  assert.equal(top.roughnessMap.colorSpace,THREE.NoColorSpace);
  assert.equal(top.aoMap,top.roughnessMap,'ORM shares one texture for R=AO and G=roughness');
  assert.equal(top.aoMap.channel,0,'AO must use the world UVs present on the geometry');
  assert.equal(top.metalness,0);
  assert.equal(top.bumpMap,null);
  assert.equal(top.displacementMap,null);
  assert.equal(top.normalScale.x,.85);
  assert.equal(top.normalScale.y,.85,'OpenGL normal green channel must not be flipped');
  assertNoSurfaceMaps(sides);
  assert.equal(sides.color.getHex(),0x8b654c);
  assert.equal(terrain.textures.length,3);
  assert.equal(requests.length,3);
  for(const texture of terrain.textures){
    assert.equal(texture.wrapS,THREE.RepeatWrapping);
    assert.equal(texture.wrapT,THREE.RepeatWrapping);
    assert.equal(texture.minFilter,THREE.LinearMipmapLinearFilter);
    assert.equal(texture.repeat.x,1/.65);
    assert.equal(texture.repeat.y,1/.65);
    assert.ok(texture.anisotropy<=4);
  }
  const normal=mesh.geometry.getAttribute('normal');
  for(const group of mesh.geometry.groups){
    for(let index=group.start;index<group.start+group.count;index++){
      assert.equal(group.materialIndex===1,normal.getY(index)===1,'Only top-facing vertices use the pulp material');
    }
  }
  flags.render=false;
  requests[0].onLoad(requests[0].texture);
  assert.equal(flags.render,true,'Loaded surface images must invalidate the frame');
});

test('solid-color mode removes every terrain surface map',t=>{
  const {terrain,mesh,sides,top,flags}=fixture(t);
  flags.render=false;
  terrain.setSurfaceMode('color');
  assert.equal(terrain.getSurfaceMode(),'color');
  assert.equal(top.color.getHex(),0x8fae68);
  assert.equal(sides.color.getHex(),0x8b654c);
  for(const material of mesh.material){
    assert.equal(material.isMeshStandardMaterial,true);
    assertNoSurfaceMaps(material);
    assert.equal(material.metalness,0);
  }
  assert.equal(flags.render,true);
});

test('switching material modes preserves cube geometry and gameplay collisions',t=>{
  const {terrain,mesh,sides,top}=fixture(t);
  const geometry=mesh.geometry;
  const attributes=Object.fromEntries(Object.entries(geometry.attributes).map(([name,attribute])=>[name,attribute.array.slice()]));
  const groups=geometry.groups.map(group=>({...group}));
  const collisions=collisionSnapshot(terrain);
  const maps={map:top.map,normalMap:top.normalMap,roughnessMap:top.roughnessMap,aoMap:top.aoMap};
  for(const mode of ['color','pulp','color','pulp']){
    terrain.setSurfaceMode(mode);
    assert.equal(mesh.geometry,geometry);
    for(const [name,array] of Object.entries(attributes))assert.deepEqual(geometry.attributes[name].array,array,name);
    assert.deepEqual(geometry.groups,groups);
    assert.deepEqual(collisionSnapshot(terrain),collisions);
    assertNoSurfaceMaps(sides);
  }
  for(const [property,map] of Object.entries(maps))assert.equal(top[property],map,'Mode switches reuse '+property);
  assert.throws(()=>terrain.setSurfaceMode('unknown'),RangeError);
  assert.equal(terrain.getSurfaceMode(),'pulp','Rejected modes must not change the active material');
  assert.equal(mesh.castShadow,true);
  assert.equal(mesh.receiveShadow,true);
});

test('texture settings update scale and relief without turning the material on',t=>{
  const {terrain,top,sides,paperConfig}=fixture(t);
  terrain.setSurfaceMode('color');
  terrain.setPaper({scale:1.25,normal:.4,height:8,blend:1});
  assert.equal(terrain.getSurfaceMode(),'color');
  assertNoSurfaceMaps(top);
  assertNoSurfaceMaps(sides);
  assert.equal(paperConfig.height,0,'Extra height effects must not return through older saved settings');
  assert.equal(paperConfig.blend,0,'Old procedural blending must remain disabled');
  terrain.setSurfaceMode('pulp');
  assert.equal(top.map.repeat.x,.8);
  assert.equal(top.map.repeat.y,.8);
  assert.equal(top.normalScale.x,.4);
  terrain.setPaper({scale:.5,normal:.6});
  assert.equal(terrain.getSurfaceMode(),'pulp');
  for(const texture of terrain.textures){
    assert.equal(texture.repeat.x,2);
    assert.equal(texture.repeat.y,2);
  }
  assert.equal(top.normalScale.y,.6);
  assertNoSurfaceMaps(sides);
});

test('terrain remains exact cubes with continuous world UVs and hidden-face culling',t=>{
  const {terrain,mesh}=fixture(t);
  const positions=mesh.geometry.getAttribute('position');
  const normals=mesh.geometry.getAttribute('normal');
  const uv=mesh.geometry.getAttribute('uv');
  for(let index=0;index<positions.count;index++){
    for(const value of [positions.getX(index),positions.getY(index),positions.getZ(index)]){
      assert.equal(value+.5,Math.round(value+.5),'Cube corners stay on the half-unit grid');
    }
    assert.equal(Math.hypot(normals.getX(index),normals.getY(index),normals.getZ(index)),1);
    if(normals.getY(index)===1){
      assert.equal(uv.getX(index),positions.getX(index));
      assert.equal(uv.getY(index),-positions.getZ(index));
    }
  }
  const stats=terrain.stats();
  assert.ok(stats.visibleFaces<stats.blocks*6,'Shared internal faces must not be submitted');
  assert.equal(stats.triangles,stats.visibleFaces*2);
  assert.equal(positions.count,stats.triangles*3);
  assert.equal(mesh.frustumCulled,true);
});
