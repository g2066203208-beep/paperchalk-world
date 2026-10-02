import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createTerrain} from '../studio/rendering/terrain.js';
import {createGrassRimGeometry,createBeveledTerrainGeometry,createPolygonalTerrainGeometry} from '../studio/rendering/terrain-geometry.js';
import {createWorld} from '../studio/world/PaperWorld.mjs';
import {STORYBOOK_PAPER_PALETTE,STORYBOOK_PAPER_DEFAULTS} from '../studio/rendering/storybook-paper-maps.js';

const surfaceMaps=['map','normalMap','roughnessMap','aoMap','bumpMap','displacementMap'];

function fixture(t){
  const scene=new THREE.Scene();
  const flags={render:false};
  const paperConfig={scale:STORYBOOK_PAPER_DEFAULTS.scale,normal:0,height:0,blend:0};
  const terrain=createTerrain({THREE,scene,flags,paperConfig,
    renderer:{capabilities:{getMaxAnisotropy:()=>8}},
  });
  const mesh=terrain.terrainBlocks;
  const [sides,top]=mesh.material;
  t.after(()=>{
    mesh.geometry.dispose();
    terrain.terrainGrassRim.geometry.dispose();
    terrain.terrainGrassRim.material.dispose();
    for(const material of mesh.material)material.dispose();
    for(const texture of terrain.textures)texture.dispose();
    scene.clear();
  });
  return {terrain,mesh,sides,top,flags,paperConfig};
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

test('storybook paper uses quiet sRGB pigment with matte physical response',t=>{
  const {terrain,mesh,sides,top,flags}=fixture(t);
  assert.equal(terrain.getSurfaceMode(),'pulp');
  assert.equal(top.isMeshPhysicalMaterial,true,'paper reflection controls require the physical material');
  assert.ok(top.specularIntensity<=.06&&sides.specularIntensity<=.06,'uncoated paper has restrained dielectric reflections');
  assert.equal(top.roughness,1);assert.equal(sides.roughness,1);
  assert.equal(top.clearcoat,0,'paper must not gain a plastic coating');
  assert.equal(top.color.getHex(),0xffffff,'colour is carried by a quiet storybook map');
  assert.equal(top.map.colorSpace,THREE.SRGBColorSpace);
  assert.equal(top.normalMap,null);assert.equal(top.roughnessMap,null);assert.equal(top.aoMap,null);
  assert.equal(top.metalness,0);
  assert.equal(top.bumpMap,null);
  assert.equal(top.displacementMap,null);
  assert.equal(top.normalScale.x,0);assert.equal(top.normalScale.y,0);
  assert.equal(sides.map.colorSpace,THREE.SRGBColorSpace);
  assert.equal(sides.normalMap,null);assert.equal(sides.roughnessMap,null);
  assert.equal(sides.color.getHex(),0xffffff);
  assert.equal(terrain.textures.length,4);
  for(const texture of terrain.textures){
    assert.equal(texture.wrapS,THREE.RepeatWrapping);
    assert.equal(texture.wrapT,THREE.RepeatWrapping);
    assert.equal(texture.minFilter,THREE.LinearMipmapLinearFilter);
    assert.equal(texture.repeat.x,1/STORYBOOK_PAPER_DEFAULTS.scale);
    assert.equal(texture.repeat.y,1/STORYBOOK_PAPER_DEFAULTS.scale);
    assert.ok(texture.anisotropy<=4);
  }
  const normal=mesh.geometry.getAttribute('normal');
  for(const group of mesh.geometry.groups){
    for(let index=group.start;index<group.start+group.count;index++){
      if(group.materialIndex===1)assert.ok(normal.getY(index)>.25,'top and folded paper edges use grass pigment');
      else assert.ok(Math.abs(normal.getY(index))<.25,'dirt side faces stay close to vertical');
    }
  }
  assert.equal(terrain.terrainGrassRim.visible,true);
  assert.ok(terrain.stats().grassRimEdges>0);
  assert.ok(terrain.stats().grassRimTriangles<terrain.stats().baseTriangles*24,'Rim stays within a bounded geometry budget');
});

test('solid-color mode removes every terrain surface map',t=>{
  const {terrain,mesh,sides,top,flags}=fixture(t);
  flags.render=false;
  terrain.setSurfaceMode('color');
  assert.equal(terrain.getSurfaceMode(),'color');
  assert.equal(top.color.getHex(),STORYBOOK_PAPER_PALETTE.grass);
  assert.equal(sides.color.getHex(),STORYBOOK_PAPER_PALETTE.dirt);
  for(const material of mesh.material){
    assert.equal(material.isMeshPhysicalMaterial,true);
    assertNoSurfaceMaps(material);
    assert.equal(material.metalness,0);
  }
  assert.equal(terrain.terrainGrassRim.visible,false);
  assertNoSurfaceMaps(terrain.terrainGrassRim.material);
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

test('paper settings update colour scale while relief stays intentionally flat',t=>{
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
  assert.equal(top.map.repeat.x,1/1.25);
  assert.equal(top.map.repeat.y,1/1.25);
  assert.equal(top.normalScale.x,0);
  terrain.setPaper({scale:.5,normal:.6});
  assert.equal(terrain.getSurfaceMode(),'pulp');
  for(const texture of terrain.textures){
    assert.equal(texture.repeat.x,2);
    assert.equal(texture.repeat.y,2);
  }
  assert.equal(top.normalScale.y,0);
  assert.equal(sides.normalScale.y,0);
  assert.equal(terrain.terrainGrassRim.material.normalScale.y,0);
  assert.equal(sides.map.colorSpace,THREE.SRGBColorSpace);
  assert.equal(sides.normalMap,null);
});

test('polygonal paper terrain keeps collision grid while adding a deterministic cut outline',t=>{
  const {terrain,mesh}=fixture(t);
  const positions=mesh.geometry.getAttribute('position');
  const normals=mesh.geometry.getAttribute('normal');
  const uv=mesh.geometry.getAttribute('uv');
  for(let index=0;index<positions.count;index++){
    assert.ok(Math.abs(Math.hypot(normals.getX(index),normals.getY(index),normals.getZ(index))-1)<1e-6,'normals remain normalized after float32 conversion');
    if(normals.getY(index)>0){
      assert.ok(Number.isFinite(uv.getX(index))&&Number.isFinite(uv.getY(index)),'paper top UVs are finite');
    }
  }
  const stats=terrain.stats();
  assert.ok(stats.visibleFaces<stats.blocks*6,'Shared internal faces must not be submitted');
  assert.ok(stats.bevelTriangles>0,'fold triangles must exist in actual geometry');
  assert.equal(positions.count,stats.baseTriangles*3);
  assert.equal(terrain.terrainGrassRim.geometry.getAttribute('position').count,stats.grassRimTriangles*3);
  assert.equal(mesh.frustumCulled,true);
  const rebuilt=createPolygonalTerrainGeometry({THREE,columnRecords:terrain.columnRecords});
  t.after(()=>rebuilt.dispose());
  for(const name of ['position','normal','uv'])assert.deepEqual(rebuilt.getAttribute(name).array,mesh.geometry.getAttribute(name).array,name+' must be deterministic');
  assert.equal(rebuilt.userData.polygonal,true);
  assert.ok(rebuilt.boundingBox.min.x<-.5&&rebuilt.boundingBox.max.x>7.5,'exposed paper outline gets a small cut wobble');
});

test('grass rim is deterministic, keeps top surface and never changes collision height',t=>{
  const {terrain}=fixture(t);
  const geometry=terrain.terrainGrassRim.geometry;
  const positions=geometry.getAttribute('position');
  assert.ok(positions.count>0);
  assert.equal(geometry.userData.segments,18);
  assert.ok(geometry.userData.maxDepth<.19);
  assert.ok(geometry.userData.maxOverhang<.065);
  assert.ok(geometry.userData.maxLift<.024,'lifted fibres cannot turn the lip into a padded rim');
  const rebuilt=createGrassRimGeometry({THREE,columnRecords:terrain.columnRecords});
  t.after(()=>rebuilt.dispose());
  for(const name of ['position','normal','uv','pulpCore'])assert.deepEqual(rebuilt.getAttribute(name).array,geometry.getAttribute(name).array,name+' must be deterministic');
  assert.deepEqual(terrain.columnRecords.map(({x,z})=>terrain.surfaceY(x,z)),
    terrain.columnRecords.map(({h})=>h+.5),'pulp thickness cannot lift the walking surface');
  for(let i=0;i<positions.count;i++){
    assert.ok(Number.isFinite(positions.getX(i))&&Number.isFinite(positions.getY(i))&&Number.isFinite(positions.getZ(i)));
  }
});

test('torn grass core uses a separate lit pigment without changing other grass',t=>{
  const {terrain,top}=fixture(t);
  const rim=terrain.terrainGrassRim;
  assert.notEqual(rim.material,top,'a paper-edge pigment must not bleed onto every grass mesh');
  assert.equal(rim.material.emissive.getHex(),0);
  assert.equal(rim.material.map,top.map);
  const cores=rim.geometry.getAttribute('pulpCore');
  assert.equal(cores.count,rim.geometry.getAttribute('position').count);
  assert.ok(cores.array.some(value=>value===0),'the inner uncut grass keeps its source pigment');
  assert.ok(cores.array.some(value=>value>.5),'the real folded rim exposes compressed fibre colour');
  for(const value of cores.array)assert.ok(value>=0&&value<=.81);
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.physical.vertexShader,fragmentShader:THREE.ShaderLib.physical.fragmentShader};
  rim.material.onBeforeCompile(shader);
  assert.ok(shader.vertexShader.includes('vPulpCore=pulpCore;'));
  assert.ok(shader.fragmentShader.includes('diffuseColor.rgb=mix(diffuseColor.rgb,pulpCoreColor'));
  assert.ok(shader.fragmentShader.includes('#include <lights_fragment_begin>'),'the core pigment remains part of the ordinary lit surface');
  for(const mode of ['color','pulp']){
    terrain.setSurfaceMode(mode);
    for(const name of ['map','normalMap','roughnessMap','aoMap'])assert.equal(rim.material[name],top[name]);
  }
});

test('convex chamfers have outward normals and never bevel an internal coplanar join',t=>{
  const geometry=createBeveledTerrainGeometry({THREE,columnRecords:[{x:0,z:0,h:0},{x:1,z:0,h:0}]});
  t.after(()=>geometry.dispose());
  const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal');
  assert.equal(geometry.userData.visibleFaces,10,'the shared wall must be culled');
  assert.deepEqual(geometry.boundingBox.min.toArray(),[-.5,-.5,-.5]);
  assert.deepEqual(geometry.boundingBox.max.toArray(),[1.5,.5,.5]);
  for(let i=0;i<p.count;i++){
    const x=p.getX(i);
    if(x>.45&&x<.55)assert.equal(x,.5,'an internal tile join must not shrink or gain a highlight seam');
  }
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),cross=new THREE.Vector3(),normal=new THREE.Vector3();
  for(let i=0;i<p.count;i+=3){
    a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1).sub(a);c.fromBufferAttribute(p,i+2).sub(a);
    cross.crossVectors(b,c);normal.fromBufferAttribute(n,i);
    assert.ok(cross.length()>1e-8,'no degenerate bevel triangles');
    assert.ok(cross.dot(normal)>0,'triangle winding must face the same direction as its normal');
    assert.ok(!(p.getX(i)===.5&&p.getX(i+1)===.5&&p.getX(i+2)===.5&&Math.abs(normal.x)>.99),'no hidden shared wall');
  }
});

test('equal-height cells become one continuous layered paperboard contour',t=>{
  const columns=[];
  for(let x=0;x<2;x++)for(let z=0;z<2;z++)columns.push({x,z,h:0});
  const geometry=createPolygonalTerrainGeometry({THREE,columnRecords:columns});
  t.after(()=>geometry.dispose());
  assert.equal(geometry.userData.layeredPaperboard,true);
  assert.equal(geometry.userData.layerCount,1);
  assert.equal(geometry.userData.boundaryEdges,8,'the 2x2 island has one 8-edge outer contour');
  assert.equal(geometry.userData.paperThickness,.94);
  assert.equal(geometry.groups.length,2);
  assert.equal(geometry.userData.topTriangles,6,'one contour is triangulated as a single polygon');
  assert.equal(geometry.groups[1].count/3,geometry.userData.topTriangles+geometry.userData.foldTriangles,
    'grass stream contains one top polygon plus the folded outer lip');
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
