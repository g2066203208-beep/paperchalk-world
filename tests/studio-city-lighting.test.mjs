import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {cityLightProfile} from '../studio/rendering/city-light-profile.js';
import {createLights,createLightingController} from '../studio/rendering/lighting.js';
import {createVolumetrics} from '../studio/rendering/volumetrics.js';

function skyObjects(){
  const result=Object.fromEntries(['sky','starField','sunDisc','moonDisc','sunGlow','moonGlow'].map(key=>{
    const object=new THREE.Object3D();object.material={opacity:1,color:new THREE.Color()};return [key,object];
  }));
  result.skyUniforms={time01:{value:0}};
  result.starUniforms={strength:{value:0},moonDir:{value:new THREE.Vector3()}};
  return result;
}

test('21:00 has strong blue shafts and restrained fill; noon turns lunar light off smoothly',()=>{
  const night=cityLightProfile(21/24),day=cityLightProfile(.5);
  assert.ok(night.moonScattering>1.5&&night.moonIntensity>1.3);
  assert.equal(night.sunIntensity,0);
  assert.ok(night.viewIntensity>=1&&night.viewIntensity<1.15,'front ink remains readable under the cool white fill');
  assert.ok(night.hemiIntensity<=.4&&night.ambientIntensity<.16);
  assert.equal(day.moonIntensity,0);assert.equal(day.moonScattering,0);
  assert.ok(day.sunIntensity>3&&day.localLightFactor<.1);
  for(const time of [0,.25,.75,1]){
    const a=cityLightProfile(time-.00001),b=cityLightProfile(time+.00001);
    for(const key of ['sunIntensity','moonIntensity','sunScattering','moonScattering','localLightFactor'])
      assert.ok(Math.abs(a[key]-b[key])<.01,key+' jumps at '+time);
  }
  const dawn=new THREE.Color(cityLightProfile(.27).sunWarm),dusk=new THREE.Color(cityLightProfile(.73).sunWarm);
  assert.ok(dawn.r>dawn.g&&dawn.b>dawn.g,'dawn uses pink-purple light');
  assert.ok(dusk.r>dusk.g&&dusk.b>dusk.g,'dusk keeps a red-purple component');
});

test('city surface light and actor rim share the actual diagonal moon direction and local lamps fade by clock',()=>{
  const scene=new THREE.Scene();scene.background=new THREE.Color();
  const camera=new THREE.PerspectiveCamera();camera.position.set(12,3,9);
  const lights=createLights({THREE,scene,target:new THREE.Vector3()});
  const local=new THREE.SpotLight(0xd5e8ff,4);lights.locals=[local];
  const celestials=skyObjects(),flags={},state={sceneId:'city-prologue',time:.875,shadow:true,fog:true,tone:true,bounce:true,sky:true};
  const volumeLightTarget=new THREE.Vector3(12,1,.6),renderer={};
  let rim;
  const actor={playerMat:new THREE.MeshLambertMaterial(),contactShadow:{material:{},userData:{groundFactor:1}},
    setPaperLighting:(direction,color,strength)=>{rim={direction:direction.clone(),color:color.clone(),strength};}};
  const controller=createLightingController({THREE,scene,camera,renderer,state,flags,lights,celestials,
    fog:{fogUniforms:{tint:{value:new THREE.Color()},opacity:{value:0}}},
    atmosphere:{volumeLightTarget,updateVolumetricSettings(){}},actor});
  controller.updateLighting(.875);
  assert.deepEqual(lights.moon.position.toArray(),[-1,15,-14]);
  assert.ok(rim.direction.distanceTo(lights.moon.position.clone().sub(volumeLightTarget).normalize())<1e-10);
  assert.ok(rim.color.b>rim.color.r&&rim.strength>.5);
  assert.equal(local.intensity,4);assert.equal(lights.moon.shadow.mapSize.x,1024);
  assert.equal(scene.fog.near,19);assert.equal(scene.fog.far,68);
  controller.updateLighting(.5);
  assert.equal(lights.moon.intensity,0);assert.ok(local.intensity<.3);
  controller.updateLighting(.875);assert.equal(local.intensity,4,'clock updates never compound the saved lamp intensity');
  actor.playerMat.dispose();
});

function pipeline(t){
  const calls=[],targets=[],depthMaterials=[];
  class Target extends THREE.WebGLRenderTarget{
    constructor(...args){super(...args);this.disposals=0;this.addEventListener('dispose',()=>this.disposals++);targets.push(this);}
  }
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,932/430,.1,100);
  camera.position.set(0,3,9);camera.lookAt(0,1,0);camera.updateMatrixWorld(true);
  let current;
  const renderer={capabilities:{isWebGL2:true,maxSamples:2},extensions:{has:()=>true},
    getDrawingBufferSize:vector=>vector.set(932,430),setRenderTarget:target=>{current=target;},clear(){},
    render(passScene,passCamera){
      passScene.updateMatrixWorld(true);
      const materials=new Map(),visible=new Map();
      passScene.traverse(object=>{
        visible.set(object,object.visible);
        if(object.isMesh){
          const material=object.material;
          materials.set(object,material?.allowOverride===false?material:(passScene.overrideMaterial??material));
          if(material?.allowOverride===false&&!depthMaterials.includes(material))depthMaterials.push(material);
        }
      });
      calls.push({scene:passScene,camera:passCamera,target:current,materials,visible,
        shadow:passScene===scene&&passCamera!==camera});
    }};
  const celestials=skyObjects(),forestMist=new THREE.Group(),contactShadow=new THREE.Object3D(),playerMesh=new THREE.Object3D();
  scene.add(...['sky','starField','sunDisc','moonDisc','sunGlow','moonGlow'].map(key=>celestials[key]),forestMist,contactShadow,playerMesh);
  const sun=new THREE.DirectionalLight(),moon=new THREE.DirectionalLight();
  sun.position.set(-18,-10,-9);moon.position.set(-13,15,-14);
  const locals=[new THREE.SpotLight(0xd5e8ff,4,14,.46,.38),new THREE.SpotLight(0xcde4fa,4,14,.46,.38)];
  locals.forEach((light,i)=>{
    light.position.set(1+i*11,5.5,.1);light.target.position.set(2+i*10,.5,-.1);
    light.userData.volumetricIntensity=.85;light.userData.cityBaseIntensity=4;light.castShadow=true;scene.add(light,light.target);
  });
  const geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial();
  const blocker=new THREE.Mesh(geometry,material);blocker.castShadow=true;blocker.position.set(1,2,-1);scene.add(blocker);
  const traffic=new THREE.Mesh(geometry,material);traffic.castShadow=true;traffic.userData.volumeShadow=false;scene.add(traffic);
  const state={sceneId:'city-prologue',time:.875,ao:true,godrays:true},flags={};
  const effect=createVolumetrics({THREE:{...THREE,WebGLRenderTarget:Target},scene,renderer,camera,state,flags,
    getSize:()=>({width:932,height:430,compact:true}),lights:{sun,moon,locals},celestials,fog:{forestMist},actor:{contactShadow,playerMesh}});
  effect.updateVolumetricSettings(.875);
  t.after(()=>{effect.dispose();geometry.dispose();material.dispose();assert.ok(targets.every(target=>target.disposals===1));});
  return {effect,calls,targets,scene,camera,locals,blocker,traffic,flags,state,depthMaterials,
    shadows:()=>calls.filter(call=>call.shadow)};
}

test('city spot shadows use matching perspective cones and cache across camera, clock and excluded traffic changes',t=>{
  const p=pipeline(t);p.effect.renderWithVolumetrics();
  assert.equal(p.shadows().length,3,'one moon plus two local depth submissions');
  assert.equal(p.effect.stats().localShadowRenders,2);
  const spots=p.shadows().filter(call=>call.camera.isPerspectiveCamera);
  assert.equal(spots.length,2);
  for(let i=0;i<2;i++){
    assert.ok(Math.abs(THREE.MathUtils.degToRad(spots[i].camera.fov)/2-p.locals[i].angle)<1e-10);
    assert.equal(spots[i].target.width,512);assert.equal(spots[i].camera.far,14);
    const u=p.effect.volumeUniforms;
    assert.ok(u['localDirection'+i].value.distanceTo(p.locals[i].target.position.clone().sub(p.locals[i].position).normalize())<1e-10);
    assert.equal(u['localDepth'+i].value,spots[i].target.depthTexture);
    assert.equal(spots[i].visible.get(p.traffic),false,'cars still cast surface shadows but not static shaft shadows');
  }
  p.calls.length=0;p.camera.position.x=3;p.effect.renderWithVolumetrics();
  assert.equal(p.shadows().length,0,'view-only movement reuses all world shadow maps');
  p.calls.length=0;p.traffic.position.x+=2;p.flags.volumeShadow=true;p.effect.renderWithVolumetrics();
  assert.equal(p.shadows().length,1,'clock/coverage invalidation only refreshes the moon when static casters are unchanged');
  assert.equal(p.effect.stats().localShadowRenders,2);assert.equal(p.traffic.visible,true);
  p.calls.length=0;p.blocker.position.x+=.5;p.flags.volumeShadow=true;p.effect.renderWithVolumetrics();
  assert.equal(p.shadows().length,3,'a real moving blocker refreshes both lamp maps');
  p.calls.length=0;p.locals[0].target.position.x+=1;p.effect.renderWithVolumetrics();
  assert.equal(p.shadows().length,1,'only the changed local cone needs a new depth map');
  assert.equal(p.effect.stats().localShadowRenders,5);
});

test('cutout city assets keep their alpha silhouette in shaft depth and restore original materials',t=>{
  const p=pipeline(t),texture=new THREE.DataTexture(new Uint8Array([255,255,255,0]),1,1);
  const material=new THREE.MeshBasicMaterial({map:texture,alphaTest:.4,side:THREE.DoubleSide});
  const geometry=new THREE.PlaneGeometry(2,2),paper=new THREE.Mesh(geometry,material);paper.castShadow=true;p.scene.add(paper);
  t.after(()=>{texture.dispose();material.dispose();geometry.dispose();});
  p.effect.renderWithVolumetrics();
  for(const call of p.shadows()){
    const depth=call.materials.get(paper);
    assert.equal(depth.map,texture);assert.equal(depth.alphaTest,.4);assert.equal(depth.colorWrite,false);
    assert.equal(depth.allowOverride,false,'global solid-depth override cannot fill transparent paper gaps');
  }
  assert.equal(paper.material,material);assert.equal(p.scene.overrideMaterial,null);
  const volume=p.calls.find(call=>call.scene.children.some(child=>child.material?.uniforms?.cityMode));
  const shader=volume.scene.children[0].material;
  assert.match(shader.fragmentShader,/gl_FragColor=vec4\(rays,fullDist\)/,'alpha remains ray length for silhouette-aware reconstruction');
  assert.equal(shader.uniforms.cityMode.value,1);
});
