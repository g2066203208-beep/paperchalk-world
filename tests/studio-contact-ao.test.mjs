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
      calls.push({pass,scene,camera,target:currentTarget,material,
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
  return {...h,effect,state,flags,scene,camera};
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

test('unsupported HDR contexts bypass AO and retain the regular scene output',t=>{
  const p=pipeline(t,{hdr:false});p.state.godrays=true;
  p.effect.renderWithVolumetrics();
  assert.deepEqual(p.calls.map(call=>call.pass),['scene']);
  assert.equal(p.calls[0].target,null);
  assert.equal(p.calls[0].scene,p.scene);
  assert.equal(p.effect.stats().ao.supported,false);
});
