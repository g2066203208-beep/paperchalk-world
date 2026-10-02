import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createCityBackdrop} from '../studio/rendering/city-backdrop.js';
import {disposeSceneResources} from '../studio/rendering/resources.js';

function fixture(t){
  const scene=new THREE.Scene(),flags={},backdrop=createCityBackdrop({THREE,scene,flags});
  t.after(()=>disposeSceneResources(scene));
  return {scene,flags,backdrop};
}

test('paper town covers the walking camera with three physically separate roof layers',t=>{
  const {backdrop}=fixture(t),stats=backdrop.stats();
  assert.equal(stats.layers.length,3);
  assert.deepEqual(stats.layers.map(layer=>layer.z),[-28,-18,-10]);
  for(const layer of stats.layers){
    assert.ok(layer.minX<=-65&&layer.maxX>=80);
  }
  assert.ok(stats.layers[0].maxY>stats.layers[1].maxY);
  assert.ok(stats.layers[1].maxY>stats.layers[2].maxY);
  const nearHouses=backdrop.group.userData.cityBackdrop.buildings.filter(building=>building.layer==='near');
  assert.ok(nearHouses.every(house=>house.width<3.2),'street houses stay narrower than foreground landmarks');
  // Distant cards must be tall enough to project above the 5.5-unit near roofs.
  const camera=new THREE.PerspectiveCamera(36,16/9,.1,100);
  const target=new THREE.Vector3(0,3.4,-.35),pitch=.1,distance=17;
  camera.position.set(0,target.y+Math.sin(pitch)*distance,target.z+Math.cos(pitch)*distance);
  camera.lookAt(target);camera.updateMatrixWorld();
  const projected=(y,z)=>new THREE.Vector3(0,y,z).project(camera).y;
  const foregroundRoof=projected(5.5,-4);
  assert.ok(projected(7,-18)>foregroundRoof+.08);
  assert.ok(projected(9.3,-28)>foregroundRoof+.17);
  assert.ok(projected(9.3,-28)<.7,'the common roofline leaves an open sky above');
  const moon=new THREE.Vector3(stats.moon.x,stats.moon.y+stats.moon.radius,stats.moon.z).project(camera);
  assert.ok(moon.y<1,'the crescent fits below the default camera upper edge');
});

test('the horizon is finite, shadow-free, texture-free and fits its rendering budget',t=>{
  const {scene,backdrop}=fixture(t),stats=backdrop.stats(),materials=new Set();
  let triangles=0;
  for(const mesh of backdrop.group.children){
    assert.ok(mesh.isMesh);assert.equal(mesh.frustumCulled,true);
    assert.equal(mesh.castShadow,false);assert.equal(mesh.receiveShadow,false);
    assert.equal(mesh.userData.volumeShadow,false);
    assert.equal(mesh.material.fog,false);
    assert.ok(mesh.geometry.boundingBox&&mesh.geometry.boundingSphere);
    assert.ok(Number.isFinite(mesh.geometry.boundingSphere.radius));
    for(const attribute of Object.values(mesh.geometry.attributes)){
      assert.equal(attribute.count,mesh.geometry.getAttribute('position').count);
      for(const value of attribute.array)assert.ok(Number.isFinite(value));
    }
    triangles+=mesh.geometry.getAttribute('position').count/3;
    materials.add(mesh.material);
  }
  assert.equal(triangles,stats.triangles);assert.ok(triangles<=3000);
  assert.ok(stats.batches<=10);assert.equal(materials.size,stats.materials);assert.ok(materials.size<=4);
  assert.ok([...materials].every(material=>!Object.values(material).some(value=>value?.isTexture)));
  scene.traverse(object=>assert.ok(!object.isLight,'distant windows add no lights'));
});

test('town colours follow the shared clock and celestial paper fades at daylight',t=>{
  const {flags,backdrop}=fixture(t);
  const glow=backdrop.group.children.filter(mesh=>mesh.material.isMeshBasicMaterial);
  assert.ok(glow.length>0);
  assert.equal(backdrop.stats().nightOpacity,1);
  assert.ok(glow.every(mesh=>mesh.visible));
  flags.render=false;flags.shadow=false;flags.volumeShadow=false;
  backdrop.updateLighting(.5);
  assert.equal(backdrop.stats().day,1);assert.equal(backdrop.stats().nightOpacity,0);
  assert.ok(glow.every(mesh=>!mesh.visible));
  assert.equal(flags.render,true);assert.equal(flags.shadow,false);assert.equal(flags.volumeShadow,false);
  const paper=backdrop.group.children.find(mesh=>mesh.material.isShaderMaterial).material;
  assert.equal(paper.uniforms.day.value,1);
  backdrop.updateLighting(.25);
  assert.ok(backdrop.stats().day>0&&backdrop.stats().day<1);
  assert.ok(backdrop.stats().nightOpacity>0&&backdrop.stats().nightOpacity<1);
  assert.ok(paper.uniforms.twilight.value>.99);
  backdrop.updateLighting(1.875);
  assert.equal(backdrop.stats().nightOpacity,1);assert.equal(backdrop.stats().day,0);
  backdrop.updateLighting(Number.NaN);
  assert.ok(Number.isFinite(backdrop.stats().day));
});

test('the sky toggle hides paper sky ornaments without hiding the town or reopening the moon at night',t=>{
  const {backdrop}=fixture(t);
  const sky=backdrop.group.children.filter(mesh=>mesh.userData.paperSky);
  const town=backdrop.group.children.filter(mesh=>!mesh.userData.paperSky);
  assert.equal(sky.length,2);assert.equal(town.length,3);
  backdrop.setSkyVisible(false);
  assert.ok(sky.every(mesh=>!mesh.visible));assert.ok(town.every(mesh=>mesh.visible));
  backdrop.updateLighting(.5);backdrop.updateLighting(.875);
  assert.ok(sky.every(mesh=>!mesh.visible),'the clock respects an explicit sky toggle');
  backdrop.setSkyVisible(true);
  assert.ok(sky.every(mesh=>mesh.visible));
  backdrop.updateLighting(.5);
  assert.ok(sky.find(mesh=>mesh.material.isShaderMaterial).visible,'daytime paper clouds stay visible');
  assert.ok(!sky.find(mesh=>mesh.material.isMeshBasicMaterial).visible,'daytime moon stays hidden');
});

test('all town GPU resources belong to the scene resource disposer',()=>{
  const scene=new THREE.Scene(),backdrop=createCityBackdrop({THREE,scene});
  const geometries=new Set(),materials=new Set();
  backdrop.group.traverse(object=>{
    if(object.geometry)geometries.add(object.geometry);
    if(object.material)materials.add(object.material);
  });
  let disposedGeometries=0,disposedMaterials=0;
  for(const geometry of geometries)geometry.addEventListener('dispose',()=>disposedGeometries++);
  for(const material of materials)material.addEventListener('dispose',()=>disposedMaterials++);
  disposeSceneResources(scene);
  assert.equal(disposedGeometries,geometries.size);
  assert.equal(disposedMaterials,materials.size);
  assert.equal(scene.children.length,0);
});
