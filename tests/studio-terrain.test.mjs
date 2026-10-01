import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from '../vendor/three/three.module.js';
import {createTerrain} from '../studio/rendering/terrain.js';
import {createGrassRimGeometry} from '../studio/rendering/terrain-geometry.js';
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
    terrain.terrainGrassRim.geometry.dispose();
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

test('Olive Fiber uses sRGB grass plus linear soil maps with dedicated torn rim',t=>{
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
  assert.equal(sides.map.colorSpace,THREE.SRGBColorSpace);
  assert.equal(sides.normalMap.colorSpace,THREE.NoColorSpace);
  assert.equal(sides.roughnessMap.colorSpace,THREE.NoColorSpace);
  assert.equal(sides.color.getHex(),0xffffff);
  assert.equal(terrain.textures.length,6);
  assert.equal(requests.length,6);
  for(const texture of terrain.textures){
    assert.equal(texture.wrapS,THREE.RepeatWrapping);
    assert.equal(texture.wrapT,THREE.RepeatWrapping);
    assert.equal(texture.minFilter,THREE.LinearMipmapLinearFilter);
    const repeat=texture.name.includes('Dirt')?2/.65:1/.65;
    assert.equal(texture.repeat.x,repeat);
    assert.equal(texture.repeat.y,repeat);
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
  assert.equal(terrain.terrainGrassRim.visible,true);
  assert.ok(terrain.stats().grassRimEdges>0);
  assert.ok(terrain.stats().grassRimTriangles<terrain.stats().baseTriangles*20,'Rim stays within a bounded geometry budget');
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
  assert.equal(terrain.terrainGrassRim.visible,false);
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
    assert.equal(terrain.terrainGrassRim.visible,mode==='pulp');
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
  assert.equal(sides.map,null);
  assert.equal(sides.normalMap,null);
  assert.equal(paperConfig.height,0,'Extra height effects must not return through older saved settings');
  assert.equal(paperConfig.blend,0,'Old procedural blending must remain disabled');
  terrain.setSurfaceMode('pulp');
  assert.equal(top.map.repeat.x,.8);
  assert.equal(top.map.repeat.y,.8);
  assert.equal(top.normalScale.x,.4);
  terrain.setPaper({scale:.5,normal:.6});
  assert.equal(terrain.getSurfaceMode(),'pulp');
  for(const texture of terrain.textures){
    const repeat=texture.name.includes('Dirt')?4:2;
    assert.equal(texture.repeat.x,repeat);
    assert.equal(texture.repeat.y,repeat);
  }
  assert.equal(top.normalScale.y,.6);
  assert.equal(sides.map.colorSpace,THREE.SRGBColorSpace);
  assert.equal(sides.normalMap.colorSpace,THREE.NoColorSpace);
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
  assert.equal(stats.baseTriangles,stats.visibleFaces*2);
  assert.equal(positions.count,stats.baseTriangles*3);
  assert.equal(terrain.terrainGrassRim.geometry.getAttribute('position').count,stats.grassRimTriangles*3);
  assert.equal(mesh.frustumCulled,true);
});

test('grass rim is deterministic, keeps top surface and never changes collision height',t=>{
  const {terrain}=fixture(t);
  const geometry=terrain.terrainGrassRim.geometry;
  const positions=geometry.getAttribute('position');
  assert.ok(positions.count>0);
  assert.equal(geometry.userData.segments,12);
  assert.ok(geometry.userData.maxDepth<.28);
  assert.ok(geometry.userData.maxOverhang<.12);
  const rebuilt=createGrassRimGeometry({THREE,columnRecords:terrain.columnRecords});
  t.after(()=>rebuilt.dispose());
  for(const name of ['position','normal','uv'])assert.deepEqual(rebuilt.getAttribute(name).array,geometry.getAttribute(name).array,name+' must be deterministic');
  assert.deepEqual(terrain.columnRecords.map(({x,z})=>terrain.surfaceY(x,z)),
    terrain.columnRecords.map(({h})=>h+.5),'pulp thickness cannot lift the walking surface');
  for(let i=0;i<positions.count;i++){
    assert.ok(Number.isFinite(positions.getX(i))&&Number.isFinite(positions.getY(i))&&Number.isFinite(positions.getZ(i)));
  }
});

test('scenic plateaus preserve the established z=0 walking lane and collisions',t=>{
  const {terrain}=fixture(t);
  // Captured from the established gameplay layout, independently of the new
  // front/back scenic columns. There are 15 columns and 20 collision cells.
  const heights=[2,1,0,0,0,0,0,0,0,0,0,0,0,1,1];
  const expected=heights.map((h,index)=>({x:index-7,z:0,h}));
  assert.deepEqual(terrain.columnRecords.filter(c=>c.z===0).map(({x,z,h})=>({x,z,h})),expected);
  const world=createWorld(terrain.columnRecords),baseline=createWorld(expected);
  assert.deepEqual(world.stats(),baseline.stats());
  assert.deepEqual(world.spawn,{x:0,y:.5,z:0});
  assert.deepEqual(world.queryTiles({minX:-8,maxX:8,minY:-1,maxY:5}),baseline.queryTiles({minX:-8,maxX:8,minY:-1,maxY:5}));
  for(let x=-8;x<=8;x+=.125)assert.equal(world.surfaceY(x),baseline.surfaceY(x));
});

function webpDimensions(bytes){
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.equal(bytes.readUInt32LE(4)+8,bytes.length,'truncated or trailing WebP bytes');
  for(let offset=12;offset+8<=bytes.length;){
    const kind=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4),data=offset+8;
    assert.ok(data+size<=bytes.length,'WebP chunk is truncated');
    if(kind==='VP8X')return [1+bytes.readUIntLE(data+4,3),1+bytes.readUIntLE(data+7,3)];
    if(kind==='VP8L'){
      assert.equal(bytes[data],0x2f);
      const packed=bytes.readUInt32LE(data+1);
      return [(packed&0x3fff)+1,((packed>>>14)&0x3fff)+1];
    }
    if(kind==='VP8 '){
      assert.deepEqual([...bytes.subarray(data+3,data+6)],[0x9d,0x01,0x2a]);
      return [bytes.readUInt16LE(data+6)&0x3fff,bytes.readUInt16LE(data+8)&0x3fff];
    }
    offset=data+size+(size&1);
  }
  throw new Error('WebP has no image chunk');
}

test('pulp maps match the provenance manifest and retain the audited forward-blue normals',async()=>{
  const directory=new URL('../studio/assets/olive-fiber/',import.meta.url);
  const manifest=JSON.parse(await readFile(new URL('source.json',directory),'utf8'));
  const names=['base-color.webp','dirt-color.webp','normal-gl.webp','dirt-normal-gl.webp','orm.webp','dirt-orm.webp'];
  assert.deepEqual(manifest.textures.map(texture=>texture.file).sort(),names.sort());
  let total=0;
  // This export was pixel-audited: mean RGB [126.46,128.44,235.13], with
  // positive tangent Z in B. Pinning its digest catches the previous [x,1,z]
  // channel error even when someone regenerates the provenance manifest.
  const auditedNormal='bde2b045235b3d19a979c3c6b15029bf293031df1465559916d40a760eb292ff';
  for(const entry of manifest.textures){
    const bytes=await readFile(new URL(entry.file,directory));
    const digest=createHash('sha256').update(bytes).digest('hex');
    total+=bytes.length;
    assert.equal(digest,entry.sha256,entry.file+' does not match its provenance digest');
    assert.deepEqual(webpDimensions(bytes),[1024,1024],entry.file+' must retain mobile-sized source detail');
    assert.deepEqual(entry.dimensions,[1024,1024]);
    if(entry.file.includes('normal-gl')){
      assert.equal(digest,auditedNormal,entry.file+' changed: audit tangent XYZ channels before accepting a new normal export');
      assert.equal(entry.encoding,'WebP lossless','normal components must not receive lossy color compression');
    }
  }
  assert.equal(total,manifest.totalTextureBytes);
  assert.ok(total<8*1024*1024,'the complete six-map set must remain within its mobile download budget');
});
