import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from '../vendor/three/three.module.js';

// Exercise the production frame scheduler with renderer boundaries replaced.
// No WebGL context is needed to verify which expensive passes it requests.
const source=(await readFile(new URL('../studio/rendering/createPaperScene.js',import.meta.url),'utf8'))
  .replace(/^import .*;\r?\n/gm,'').replace('export function createPaperScene','function createPaperScene');

async function setup({width=932,height=430,coarse=false}={}){
  const calls=[],refs={};
  const window=new EventTarget();
  window.devicePixelRatio=3;window.matchMedia=()=>({matches:coarse});
  const container={clientWidth:width,clientHeight:height,appendChild(){}};
  class Renderer{
    constructor(){
      refs.renderer=this;this.domElement=new EventTarget();
      Object.assign(this.domElement,{style:{},setAttribute(){},remove(){}});
      this.shadowMap={};this.info={autoReset:true,render:{calls:0,triangles:0,points:0},memory:{textures:0,geometries:0},reset(){}};
      this.renderLists={dispose(){}};
    }
    setPixelRatio(value){this.pixelRatio=value;}
    getPixelRatio(){return this.pixelRatio;}
    setSize(){}
    dispose(){}
  }
  const object=()=>new THREE.Object3D();
  const sandbox={THREE:{...THREE,WebGLRenderer:Renderer},window,
    document:{body:{classList:{contains:()=>true}}},AbortController,performance,
    clamp:(value,min,max)=>Math.max(min,Math.min(max,value)),
    createPaperMaterials:()=>({textures:[],storybookMaps:{}}),
    createTerrain:({flags})=>{refs.flags=flags;return {pulpSets:{},textures:[],terrainBlocks:object(),world:{},
      stats:()=>({}),getSurfaceMode:()=> 'pulp',setPaper(){}};},
    createForest:()=>({canopyGroup:object()}),createStageScenery:()=>({group:object()}),
    createActor:()=>{
      const playerMesh=object();playerMesh.material={map:{image:{}}};
      let last;
      return {playerMesh,contactShadow:object(),snapshot:()=>last,
        sync(snapshot){
          const changed=!last||['x','y','distance','facing'].some(key=>(last[key]??0)!==(snapshot[key]??0));
          playerMesh.position.set(snapshot.x,snapshot.y+1.12,0);last={...snapshot};return changed;
        }};
    },
    createLights:()=>{
      const light=()=>Object.assign(object(),{intensity:1,target:object()});
      refs.lights={sun:light(),moon:light(),groundBounce:light(),viewFill:light()};return refs.lights;
    },
    createSky:()=>({sky:object(),starField:object(),starUniforms:{time:{value:0},pixelRatio:{value:1},strength:{value:0}},
      sunDisc:object(),moonDisc:object(),sunGlow:object(),moonGlow:object()}),
    createPaperFog:({flags})=>({forestMist:object(),fogUniforms:{time:{value:0}},updateFogInstances(){},
      updateDepthTexture(){refs.depthRequested=flags.depth;flags.depth=false;},resize(){},dispose(){}}),
    createVolumetrics:({flags,renderer,getSize})=>{
      const volumeLightTarget=new THREE.Vector3(0,1,.6);refs.center=volumeLightTarget;
      return {volumeLightTarget,volumeUniforms:{time:{value:0}},updateVolumetricSettings(){},
        renderWithVolumetrics(){
          calls.push({shadow:!!renderer.shadowMap.needsUpdate,volume:flags.volumeShadow,
            ao:flags.ao,depth:refs.depthRequested,center:volumeLightTarget.x,compact:getSize().compact});
          renderer.shadowMap.needsUpdate=false;flags.volumeShadow=flags.ao=false;
        },stats:()=>({}),resize(){},dispose(){}};
    },
    createLightingController:({flags})=>({updateLighting(){flags.render=flags.shadow=flags.volumeShadow=true;}}),
    createOrbitCamera:({target,camera,onChange})=>{
      camera.position.set(0,3,9);refs.viewChanged=onChange;
      return {follow(x){
        if(target.x!==x){target.x=x;camera.position.x=x;onChange();}
      },resize(){},snapshot:()=>({}),dispose(){}};
    },
    disposeSceneResources(){},
  };
  const create=vm.runInNewContext(source+'\ncreatePaperScene;',sandbox);
  const scene=create({container,sceneId:'forest'});await scene.ready;calls.length=0;
  let tick=0;
  const frame=(patch={})=>scene.frame(1/60,1000+(++tick)*17,
    {x:0,y:.5,facing:1,distance:0,grounded:true,...patch});
  return {scene,calls,refs,frame,container,window};
}

test('camera view changes refresh screen-space data without rebuilding fixed world shadows',async()=>{
  const h=await setup();h.refs.viewChanged();h.frame();
  assert.deepEqual(h.calls.at(-1),{shadow:false,volume:false,ao:true,depth:true,center:0,compact:true});
  h.scene.dispose();
});

test('walking keeps the actor shadow current but reuses volumetric occlusion within a coverage cell',async()=>{
  const h=await setup();
  for(const x of [.2,.8,1.9])h.frame({x,distance:x});
  assert.equal(h.calls.length,3);
  assert.ok(h.calls.every(call=>call.shadow&&call.ao&&call.depth&&!call.volume&&call.center===0));
  h.frame({x:2.1,distance:2.1});
  assert.equal(h.calls.at(-1).volume,true);assert.equal(h.refs.center.x,2);
  h.frame({x:1.95,distance:2.25});
  assert.equal(h.calls.at(-1).volume,false);assert.equal(h.refs.center.x,2,'boundary does not oscillate');
  h.frame({x:-.1,distance:4.3});
  assert.equal(h.calls.at(-1).volume,true);assert.equal(h.refs.center.x,0);
  h.scene.dispose();
});

test('automatic lighting refreshes static volumetric shadows every eighth frame',async()=>{
  const h=await setup();h.scene.setAutoCycle(true);h.frame();h.calls.length=0;
  for(let frame=0;frame<16;frame++)h.frame();
  assert.equal(h.calls.filter(call=>call.volume).length,2);
  assert.equal(h.calls.filter(call=>call.shadow).length,2);
  h.calls.length=0;
  for(let frame=0;frame<8;frame++)h.frame({distance:frame+.1});
  assert.equal(h.calls.filter(call=>call.volume).length,1);
  assert.equal(h.calls.filter(call=>call.shadow).length,8,'actor stride must not inherit light-clock throttling');
  h.scene.dispose();
});

test('geometry invalidation survives a non-cadence auto frame',async()=>{
  const h=await setup();h.scene.setAutoCycle(true);h.frame();
  h.refs.flags.shadow=h.refs.flags.volumeShadow=true;h.frame();
  assert.equal(h.calls.at(-1).volume,true);assert.equal(h.calls.at(-1).shadow,true);
  h.scene.dispose();
});

test('landscape phones and coarse tablets use compact quality, large desktop remains full quality',async()=>{
  for(const options of [{width:932,height:430},{width:430,height:932},{width:1180,height:820,coarse:true}]){
    const h=await setup(options);
    assert.equal(h.refs.renderer.pixelRatio,2);assert.equal(h.scene.getStats().size.compact,true);
    h.scene.dispose();
  }
  const h=await setup({width:1440,height:900});
  assert.equal(h.refs.renderer.pixelRatio,1.5);assert.equal(h.scene.getStats().size.compact,false);
  h.container.clientWidth=932;h.container.clientHeight=430;h.window.dispatchEvent(new Event('resize'));
  assert.equal(h.refs.renderer.pixelRatio,2);assert.equal(h.scene.getStats().size.compact,true);
  h.scene.dispose();
});
