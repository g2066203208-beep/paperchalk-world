import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createCityScenery} from '../studio/rendering/city-scenery.js';
import {createOrbitCamera} from '../studio/rendering/orbit-camera.js';
import {createCityPrologueWorld} from '../studio/world/CityPrologueWorld.mjs';
import {disposeSceneResources} from '../studio/rendering/resources.js';

function fixture(t,width,height){
  const previousWindow=globalThis.window;globalThis.window=new EventTarget();
  const world=createCityPrologueWorld(),scene=new THREE.Scene();
  const city=createCityScenery({THREE,scene,world});
  const domElement=new EventTarget();domElement.style={};
  const camera=new THREE.PerspectiveCamera(36,width/height,.1,100);
  const orbit=createOrbitCamera({camera,domElement,target:new THREE.Vector3(0,3,-.35),onChange(){},
    viewport:{width,height,gameplay:true,sceneId:world.id}});
  scene.updateMatrixWorld(true);
  t.after(()=>{
    orbit.dispose();disposeSceneResources(scene);
    if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;
  });
  const ray=new THREE.Raycaster(),projected=new THREE.Vector3();
  function occluders(point){
    // Cast through the point's actual screen position. The finite far distance
    // deliberately excludes architecture behind the XY character plane.
    projected.copy(point).project(camera);
    assert.ok(Math.abs(projected.x)<1&&Math.abs(projected.y)<1&&projected.z<1,
      'the visibility sample must be inside the rendered camera frame');
    ray.setFromCamera({x:projected.x,y:projected.y},camera);
    ray.near=camera.near;ray.far=camera.position.distanceTo(point)-1e-4;
    return ray.intersectObjects(city.group.children,false);
  }
  return {world,scene,city,camera,orbit,occluders};
}

for(const [width,height] of [[1440,900],[932,430],[390,844]]){
  test(`city scenery never hides the actor along the whole route at ${width}x${height}`,t=>{
    const {world,camera,orbit,occluders}=fixture(t,width,height);
    const point=new THREE.Vector3();
    // 10 cm spacing also covers the old right stage wing at x=6..7, instead
    // of sampling only the school and shop landmarks on either side of it.
    const minX=-7.7,maxX=23.7,steps=314;
    for(const direction of [1,-1]){
      orbit.follow(direction===1?minX:maxX,1,0);
      for(let step=0;step<=steps;step++){
        const x=direction===1?minX+(maxX-minX)*step/steps:maxX-(maxX-minX)*step/steps;
        const feetY=world.surfaceY(x,0);
        orbit.follow(x,1/60,feetY-.5);camera.updateMatrixWorld(true);
        // Protect the visible body width as well as the centre line, from
        // legs through torso and face. Low flower boxes can stay below it.
        for(const bodyOffset of [-.24,0,.24])for(const heightAboveFeet of [.5,1.1,1.6]){
          point.set(x+bodyOffset,feetY+heightAboveFeet,0);
          const hits=occluders(point);
          assert.equal(hits.length,0,
            `static paper hides actor at x=${x.toFixed(2)}, body offset=${bodyOffset}, height=${heightAboveFeet}, direction=${direction}: `+
            (hits[0]?`${hits[0].object.name} at z=${hits[0].point.z.toFixed(3)}`:''));
        }
      }
    }
  });
}

test('city visibility check detects the former foreground wing placement',t=>{
  const {world,scene,city,camera,orbit,occluders}=fixture(t,932,430);
  orbit.follow(6.2,1,0);camera.updateMatrixWorld(true);
  const bodyPoint=new THREE.Vector3(6.2,world.surfaceY(6.2,0)+1.1,0);
  assert.equal(occluders(bodyPoint).length,0,'the current alley must be unobstructed');
  // Positive control reproduces the footprint of the removed right wing.
  // A projection-only assertion would incorrectly accept this obstruction.
  const wing=new THREE.Mesh(new THREE.PlaneGeometry(1.45,5.4),new THREE.MeshBasicMaterial());
  wing.name='Former right paper theater wing';wing.position.set(6.125,.42+5.4/2,2.72);
  city.group.add(wing);scene.updateMatrixWorld(true);
  assert.ok(occluders(bodyPoint).some(hit=>hit.object===wing),
    'a tall foreground card at the old wing position must fail visibility');
});
