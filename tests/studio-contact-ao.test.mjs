import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {CONTACT_AO,createContactAO} from '../studio/rendering/contact-ao.js';
import {createVolumetrics} from '../studio/rendering/volumetrics.js';

// Real Three.js scenes, materials, matrices and render targets, with only GPU
// submission replaced. These tests verify the pass graph and resource lifecycle
// rather than pretending a Node process can validate the rendered AO image.
function harness(){
  const targets=[],materials=[],calls=[];
  class Target extends THREE.WebGLRenderTarget{
    constructor(...args){super(...args);this.disposals=0;this.addEventListener('dispose',()=>this.disposals++);targets.push(this);}
  }
  class Material extends THREE.ShaderMaterial{
    constructor(...args){super(...args);this.disposals=0;this.addEventListener('dispose',()=>this.disposals++);materials.push(this);}
  }
  const three={...THREE,WebGLRenderTarget:Target,ShaderMaterial:Material};
  let currentTarget=null;
  const size=new THREE.Vector2(913,431);
  const renderer={
    capabilities:{isWebGL2:true},extensions:{has:name=>name==='EXT_color_buffer_float'},
    getDrawingBufferSize:result=>result.copy(size),
    setRenderTarget:target=>{currentTarget=target;},clear(){},
    render(scene,camera){
      const material=scene.children.find(child=>child.material?.uniforms)?.material;
      const uniforms=material?.uniforms;
      const pass=uniforms?.radius?'ao':uniforms?.source?'filter':uniforms?.sceneColor?'composite':uniforms?.sunLightDepth?'volume':'scene';
      const visibility=new Map();scene.traverse(object=>visibility.set(object,object.visible));
      calls.push({pass,scene,camera,target:currentTarget,material,
        overrideMaterial:scene.overrideMaterial,visibility,
        depth:uniforms?.sceneDepth?.value,source:uniforms?.source?.value,
        aoEnabled:uniforms?.aoEnabled?.value,volumeStrength:uniforms?.volumeStrength?.value});
    }
  };
  return {three,renderer,size,targets,materials,calls};
}

test('contact AO consumes actual scene depth, current projection and a half-resolution linear pass chain',t=>{
  const h=harness(),camera=new THREE.PerspectiveCamera(36,913/431,.1,100);
  const screenCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1),screenGeometry=new THREE.PlaneGeometry(2,2);
  const ao=createContactAO({THREE:h.three,renderer:h.renderer,camera,screenCamera,screenGeometry});
  t.after(()=>{ao.dispose();screenGeometry.dispose();});
  ao.resize(913,431);
  assert.deepEqual([ao.stats().width,ao.stats().height],[457,216]);
  assert.equal(ao.stats().samples,16);assert.equal(CONTACT_AO.scale,.5);
  const depth=new THREE.DepthTexture(913,431);
  t.after(()=>depth.dispose());
  camera.fov=42;camera.updateProjectionMatrix();
  ao.render(depth);
  assert.deepEqual(h.calls.map(call=>call.pass),['ao','filter']);
  const [raw,filter]=h.calls;
  assert.equal(raw.depth,depth,'occlusion must sample the scene depth, not the material AO texture');
  assert.deepEqual(raw.material.uniforms.projection.value.elements,camera.projectionMatrix.elements);
  assert.deepEqual(raw.material.uniforms.projectionInverse.value.elements,camera.projectionMatrixInverse.elements);
  assert.deepEqual(raw.material.uniforms.depthTexel.value.toArray(),[1/913,1/431]);
  assert.equal(filter.source,raw.target.texture);
  assert.equal(ao.texture,filter.target.texture);
  assert.deepEqual(ao.texel.toArray(),[1/457,1/216]);
  for(const target of h.targets){
    assert.equal(target.texture.type,THREE.HalfFloatType,'view-space depth must not clamp to an 8-bit color channel');
    assert.equal(target.texture.colorSpace,THREE.NoColorSpace);
    assert.equal(target.depthBuffer,false);
  }
  for(const material of h.materials){
    assert.equal(material.toneMapped,false,'AO is visibility data, not display color');
    assert.equal(material.depthWrite,false);
  }
  assert.match(raw.material.fragmentShader,/projectionInverse\*vec4\(uv\*2\.0-1\.0,depth\*2\.0-1\.0,1\.0\)/,'sample positions must reconstruct from device depth');
  assert.match(filter.material.fragmentShader,/abs\(sampleValue\.y-center\.y\)/,'filter must reject samples across depth discontinuities');
});

test('contact AO resize replaces and releases its targets, leaving shared screen geometry owned by the caller',()=>{
  const h=harness(),screenGeometry=new THREE.PlaneGeometry(2,2);
  let screenDisposals=0;screenGeometry.addEventListener('dispose',()=>screenDisposals++);
  const ao=createContactAO({THREE:h.three,renderer:h.renderer,camera:new THREE.PerspectiveCamera(),screenCamera:new THREE.OrthographicCamera(),screenGeometry});
  ao.resize(900,500);const firstTexture=ao.texture;
  ao.resize(320,180);
  assert.notEqual(ao.texture,firstTexture);
  assert.deepEqual(h.targets.map(target=>target.disposals),[1,1,0,0]);
  assert.deepEqual([ao.stats().width,ao.stats().height],[160,90]);
  ao.dispose();
  assert.ok(h.targets.every(target=>target.disposals===1),'every owned target is released once');
  assert.ok(h.materials.every(material=>material.disposals===1));
  assert.equal(screenDisposals,0,'disposing the AO must not free a quad still used by the compositor');
  screenGeometry.dispose();
});

function pipeline(t,{hdr=true}={}){
  const h=harness();h.renderer.extensions.has=()=>hdr;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,913/431,.1,100);
  const state={ao:true,godrays:false,time:.27},flags={};
  const celestials=Object.fromEntries(['sky','starField','sunDisc','moonDisc','sunGlow','moonGlow'].map(name=>[name,new THREE.Object3D()]));
  const forestMist=new THREE.Group(),contactShadow=new THREE.Object3D(),playerMesh=new THREE.Object3D();
  scene.add(...Object.values(celestials),forestMist,contactShadow,playerMesh);
  const sun=new THREE.DirectionalLight(),moon=new THREE.DirectionalLight();sun.position.set(-18,10,-18);moon.position.set(18,-10,18);
  const effect=createVolumetrics({THREE:h.three,scene,renderer:h.renderer,camera,state,flags,
    getSize:()=>({width:h.size.x,height:h.size.y}),lights:{sun,moon},celestials,fog:{forestMist},actor:{contactShadow,playerMesh}});
  t.after(()=>effect.dispose());
  return {...h,effect,state,flags,scene,camera,lights:{sun,moon},celestials,forestMist,contactShadow,playerMesh};
}

test('AO works with rays disabled, is cached until invalidated and can toggle without changing scene rendering',t=>{
  const p=pipeline(t);
  p.effect.renderWithVolumetrics();
  assert.deepEqual(p.calls.map(call=>call.pass),['scene','ao','filter','composite']);
  assert.equal(p.calls[1].depth,p.calls[0].target.depthTexture);
  assert.equal(p.calls.at(-1).aoEnabled,1);assert.equal(p.calls.at(-1).volumeStrength,0);
  assert.equal(p.flags.ao,false);
  p.calls.length=0;p.effect.renderWithVolumetrics();
  assert.deepEqual(p.calls.map(call=>call.pass),['scene','composite'],'static depth reuses its AO');
  p.calls.length=0;p.flags.ao=true;p.effect.renderWithVolumetrics();
  assert.deepEqual(p.calls.map(call=>call.pass),['scene','ao','filter','composite'],'changed scene depth invalidates AO');
  p.calls.length=0;p.state.ao=false;p.flags.ao=true;p.effect.renderWithVolumetrics();
  assert.deepEqual(p.calls.map(call=>call.pass),['scene','composite']);
  assert.equal(p.calls.at(-1).aoEnabled,0);assert.equal(p.flags.ao,true,'a pending depth update is retained while AO is disabled');
  p.calls.length=0;p.state.ao=true;p.effect.renderWithVolumetrics();
  assert.deepEqual(p.calls.map(call=>call.pass),['scene','ao','filter','composite']);
  p.calls.length=0;p.state.godrays=true;p.flags.volumeShadow=false;p.effect.renderWithVolumetrics();
  assert.deepEqual(p.calls.map(call=>call.pass),['scene','volume','composite'],'enabling shafts neither drops nor needlessly regenerates cached AO');
  assert.equal(p.calls.at(-1).aoEnabled,1);assert.ok(p.calls.at(-1).volumeStrength>0);
});

test('pipeline resize invalidates AO and disposal releases both AO and HDR resources',t=>{
  const p=pipeline(t);p.effect.renderWithVolumetrics();
  const priorTarget=p.calls[0].target,priorAoTexture=p.calls.at(-1).material.uniforms.aoTexture.value;
  p.size.set(1280,720);p.effect.resize();
  assert.equal(priorTarget.disposals,1);assert.equal(p.flags.ao,true);
  p.calls.length=0;p.effect.renderWithVolumetrics();
  assert.deepEqual([p.calls[0].target.width,p.calls[0].target.height],[1280,720]);
  assert.deepEqual([p.calls[1].target.width,p.calls[1].target.height],[640,360]);
  assert.notEqual(p.calls.at(-1).material.uniforms.aoTexture.value,priorAoTexture);
  const screenGeometry=p.calls.at(-1).scene.children[0].geometry;
  let quadDisposals=0;screenGeometry.addEventListener('dispose',()=>quadDisposals++);
  // Observe after the existing after-hook, avoiding a double-dispose test artifact.
  t.after(()=>{
    assert.ok(p.targets.every(target=>target.disposals===1),'all replaced and active targets must be freed');
    assert.ok(p.materials.every(material=>material.disposals===1));
    assert.equal(quadDisposals,1,'the shared full-screen quad has one owner');
  });
});

test('landscape phone shafts use the compact budget and resize to desktop quality',t=>{
  const p=pipeline(t);p.state.godrays=true;p.flags.volumeShadow=false;
  p.effect.renderWithVolumetrics();
  assert.equal(p.effect.stats().scale,.34);
  let volume=p.calls.find(call=>call.pass==='volume');
  assert.deepEqual([volume.target.width,volume.target.height],[310,146]);
  assert.equal(p.effect.stats().ao.samples,16,'phone quality retains contact shadows');
  p.size.set(1280,720);p.effect.resize();p.calls.length=0;p.effect.renderWithVolumetrics();
  assert.equal(p.effect.stats().scale,.40);
  volume=p.calls.find(call=>call.pass==='volume');
  assert.deepEqual([volume.target.width,volume.target.height],[512,288]);
});

test('unsupported HDR contexts bypass AO and retain the regular scene output',t=>{
  const p=pipeline(t,{hdr:false});p.state.godrays=true;
  p.effect.renderWithVolumetrics();
  assert.deepEqual(p.calls.map(call=>call.pass),['scene']);
  assert.equal(p.calls[0].target,null);
  assert.equal(p.calls[0].scene,p.scene);
  assert.equal(p.effect.stats().ao.supported,false);
});

const shadowCalls=p=>p.calls.filter(call=>call.scene===p.scene&&call.camera.isOrthographicCamera);

test('disabled shafts retain pending shadow updates and refresh both light maps when enabled',t=>{
  const p=pipeline(t);p.state.ao=false;
  p.effect.updateVolumetricSettings(.25);
  p.flags.volumeShadow=true;
  p.effect.renderWithVolumetrics();
  assert.equal(shadowCalls(p).length,0);
  assert.equal(p.flags.volumeShadow,true,'disabling shafts must not discard a pending scene or light change');
  p.calls.length=0;p.state.godrays=true;
  p.effect.renderWithVolumetrics();
  const refreshed=shadowCalls(p);
  assert.equal(refreshed.length,2,'sun and moon both contribute during the dawn transition');
  assert.notEqual(refreshed[0].target,refreshed[1].target);
  const volume=p.calls.find(call=>call.pass==='volume');
  assert.equal(volume.material.uniforms.sunLightDepth.value,refreshed[0].target.depthTexture);
  assert.equal(volume.material.uniforms.moonLightDepth.value,refreshed[1].target.depthTexture);
  assert.equal(p.flags.volumeShadow,false);
  p.calls.length=0;p.effect.renderWithVolumetrics();
  assert.equal(shadowCalls(p).length,0,'unchanged geometry reuses the valid light depth maps');
  p.state.godrays=false;p.flags.volumeShadow=true;p.calls.length=0;
  p.effect.renderWithVolumetrics();
  assert.equal(shadowCalls(p).length,0);
  assert.equal(p.flags.volumeShadow,true);
  p.state.godrays=true;p.calls.length=0;p.effect.renderWithVolumetrics();
  assert.equal(shadowCalls(p).length,2,'reopening after an invalidation must not reuse the stale shadows');
});

test('shaft depth submissions use only shadow casters and restore visibility and the original override',t=>{
  const p=pipeline(t);p.state.ao=false;p.state.godrays=true;
  p.effect.updateVolumetricSettings(.25);
  const geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial(),oldOverride=new THREE.MeshNormalMaterial();
  t.after(()=>{geometry.dispose();material.dispose();oldOverride.dispose();});
  const caster=new THREE.Mesh(geometry,material);caster.castShadow=true;
  const nonCaster=new THREE.Mesh(geometry,material);
  const hiddenCaster=new THREE.Mesh(geometry,material);hiddenCaster.castShadow=true;hiddenCaster.visible=false;
  const hiddenNonCaster=new THREE.Mesh(geometry,material);hiddenNonCaster.visible=false;
  p.scene.add(caster,nonCaster,hiddenCaster,hiddenNonCaster);
  p.celestials.moonGlow.visible=false;p.forestMist.visible=false;
  p.scene.overrideMaterial=oldOverride;
  const originalVisibility=new Map();p.scene.traverse(object=>originalVisibility.set(object,object.visible));
  p.effect.renderWithVolumetrics();
  const shadows=shadowCalls(p);assert.equal(shadows.length,2);
  for(const call of shadows){
    assert.notEqual(call.overrideMaterial,oldOverride);
    assert.equal(call.overrideMaterial.colorWrite,false);
    assert.equal(call.overrideMaterial.depthWrite,true);
    assert.equal(call.visibility.get(caster),true);
    for(const object of [nonCaster,hiddenCaster,hiddenNonCaster,...Object.values(p.celestials),p.forestMist,p.contactShadow,p.playerMesh]){
      assert.equal(call.visibility.get(object),false,'decorations, hidden objects and the alpha character must not become solid shaft blockers');
    }
  }
  assert.equal(p.scene.overrideMaterial,oldOverride);
  for(const [object,visible] of originalVisibility)assert.equal(object.visible,visible,'temporary shadow setup must preserve every original visibility value');
  assert.equal(p.calls[0].overrideMaterial,oldOverride,'the main scene submission keeps the caller override');
});

test('moving and resizing the camera updates shaft reconstruction without stale projection or world matrices',t=>{
  const p=pipeline(t);p.state.ao=false;p.state.godrays=true;p.flags.volumeShadow=false;
  p.camera.position.set(1,3,6);p.camera.lookAt(0,1,0);p.camera.updateMatrixWorld(true);
  p.effect.renderWithVolumetrics();
  const first=p.calls.find(call=>call.pass==='volume').material.uniforms;
  const oldProjection=first.cameraProjectionInv.value.clone(),oldWorld=first.cameraMatrixWorld.value.clone();
  p.camera.fov=48;p.camera.aspect=1.4;p.camera.near=.2;p.camera.far=80;p.camera.updateProjectionMatrix();
  p.camera.position.set(-2,4,8);p.camera.lookAt(1,1,-1);p.camera.updateMatrixWorld(true);
  p.calls.length=0;p.effect.renderWithVolumetrics();
  const scene=p.calls.find(call=>call.scene===p.scene);
  const current=p.calls.find(call=>call.pass==='volume').material.uniforms;
  assert.equal(current.sceneDepth.value,scene.target.depthTexture);
  assert.deepEqual(current.cameraProjectionInv.value.elements,p.camera.projectionMatrixInverse.elements);
  assert.deepEqual(current.cameraMatrixWorld.value.elements,p.camera.matrixWorld.elements);
  assert.deepEqual(current.cameraPos.value.toArray(),p.camera.position.toArray());
  assert.notDeepEqual(current.cameraProjectionInv.value.elements,oldProjection.elements);
  assert.notDeepEqual(current.cameraMatrixWorld.value.elements,oldWorld.elements);
  assert.deepEqual(p.calls.at(-1).material.uniforms.cameraNearFar.value.toArray(),[.2,80]);
});

test('sun and moon scattering remain finite and continuous across day, twilight and the clock wrap',t=>{
  const p=pipeline(t),u=p.effect.volumeUniforms;
  for(const time of [-.01,0,.12,.25,.27,.5,.73,.75,.9,1,1.01]){
    p.state.time=time;p.effect.updateVolumetricSettings(time);
    for(const name of ['sunIntensity','moonIntensity','sunDensity','moonDensity']){
      assert.ok(Number.isFinite(u[name].value)&&u[name].value>=0,`${name} must be a finite nonnegative value at ${time}`);
    }
    for(const name of ['sunLightDir','moonLightDir']){
      assert.ok(u[name].value.toArray().every(Number.isFinite));
      assert.ok(Math.abs(u[name].value.length()-1)<1e-10);
    }
    for(const name of ['sunScatteringColor','moonScatteringColor'])assert.ok(u[name].value.toArray().every(value=>Number.isFinite(value)&&value>=0));
  }
  p.state.time=.5;p.effect.updateVolumetricSettings(.5);
  assert.ok(u.sunIntensity.value>u.moonIntensity.value,'daylight is dominated by sun scattering');
  p.state.time=0;p.effect.updateVolumetricSettings(0);
  assert.ok(u.moonIntensity.value>u.sunIntensity.value,'night retains moon scattering instead of disabling the whole effect');
  for(const boundary of [0,.25,.75,1]){
    p.state.time=boundary-.0001;p.effect.updateVolumetricSettings(p.state.time);
    const before=[u.sunIntensity.value,u.moonIntensity.value,u.sunDensity.value,u.moonDensity.value];
    p.state.time=boundary+.0001;p.effect.updateVolumetricSettings(p.state.time);
    const after=[u.sunIntensity.value,u.moonIntensity.value,u.sunDensity.value,u.moonDensity.value];
    assert.ok(before.every((value,index)=>Math.abs(value-after[index])<.02),'crossing a clock boundary must not pop the shaft contribution');
  }
});

test('shaft strength is bounded, invalid inputs cannot poison uniforms, and diagnostics report actual renders',t=>{
  const p=pipeline(t);p.state.ao=false;p.state.godrays=true;p.flags.volumeShadow=false;
  assert.equal(typeof p.effect.setShaftStrength,'function');
  assert.equal(p.effect.stats().supported,true);
  assert.equal(p.effect.stats().renderedFrames,0);
  p.effect.renderWithVolumetrics();
  const defaultStrength=p.calls.at(-1).volumeStrength;
  assert.ok(defaultStrength>0);
  p.effect.setShaftStrength(1);p.effect.renderWithVolumetrics();
  assert.equal(p.calls.at(-1).volumeStrength,defaultStrength,'the default strength is one');
  assert.equal(p.effect.stats().effectiveStrength,p.calls.at(-1).volumeStrength);
  assert.equal(p.effect.stats().enabled,true);
  assert.equal(p.effect.stats().renderedFrames,2);
  p.effect.setShaftStrength(2);p.effect.renderWithVolumetrics();
  const maximum=p.calls.at(-1).volumeStrength;
  assert.ok(maximum>defaultStrength);
  p.effect.setShaftStrength(99);p.effect.renderWithVolumetrics();
  assert.equal(p.calls.at(-1).volumeStrength,maximum,'values above two must clamp');
  for(const invalid of [NaN,Infinity,-Infinity]){
    p.effect.setShaftStrength(invalid);p.effect.renderWithVolumetrics();
    assert.equal(p.calls.at(-1).volumeStrength,maximum,'nonfinite input must preserve the last valid setting');
  }
  p.effect.setShaftStrength(-1);p.effect.renderWithVolumetrics();
  assert.equal(p.calls.at(-1).volumeStrength,0);
  p.effect.setShaftStrength(1);p.state.godrays=false;
  const priorRenders=p.effect.stats().renderedFrames;p.effect.renderWithVolumetrics();
  assert.equal(p.effect.stats().enabled,false);
  assert.equal(p.effect.stats().effectiveStrength,0);
  assert.equal(p.effect.stats().renderedFrames,priorRenders,'AO/compositing without shafts must not count as a volumetric render');
  assert.equal(p.calls.at(-1).volumeStrength,0);
});

test('unsupported HDR devices report unavailable shafts without claiming a volumetric render',t=>{
  const p=pipeline(t,{hdr:false});p.state.godrays=true;
  p.effect.renderWithVolumetrics();
  const stats=p.effect.stats();
  assert.equal(stats.supported,false);
  assert.ok(stats.fallback,'the fallback reason must be visible instead of silently advertising active shafts');
  assert.equal(stats.effectiveStrength,0);
  assert.equal(stats.renderedFrames,0);
  assert.equal(p.calls.length,1);assert.equal(p.calls[0].target,null);
});
