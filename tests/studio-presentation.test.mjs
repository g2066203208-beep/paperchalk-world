import test from 'node:test';
import assert from 'node:assert/strict';
import {wantsGamePresentation,PauseReasons} from '../studio/ui/GamePresentation.mjs';
import {defaultOrbitDistance,createOrbitCamera} from '../studio/rendering/orbit-camera.js';
import * as THREE from '../vendor/three/three.module.js';
import {createWorld} from '../studio/world/PaperWorld.mjs';
import {PlayerSimulation} from '../studio/core/PlayerSimulation.mjs';

test('native shell always uses game presentation, even with a stale desktop override',()=>{
  assert.equal(wantsGamePresentation({userAgent:'Android PaperchalkShell/5',search:'?play=0',width:1920,height:1080}),true);
});
test('handheld and small coarse touch devices receive full screen gameplay',()=>{
  for(const userAgent of ['Android 15','iPhone','iPad'])assert.equal(wantsGamePresentation({userAgent}),true);
  assert.equal(wantsGamePresentation({coarse:true,width:844,height:390}),true);
});
test('desktop keeps studio presentation unless game preview is requested',()=>{
  assert.equal(wantsGamePresentation({width:1440,height:900}),false);
  assert.equal(wantsGamePresentation({search:'?play=1',width:1440,height:900}),true);
  assert.equal(wantsGamePresentation({search:'?play=0',coarse:true,width:844,height:390}),false);
});
test('closing a temporary menu preserves a preexisting pause',()=>{
  const pause=new PauseReasons();
  pause.toggleUser();pause.openMenu();pause.closeMenu();
  assert.equal(pause.active,true);
  pause.resume();assert.equal(pause.active,false);
});
test('opening and closing a menu during gameplay resumes without a stuck pause',()=>{
  const pause=new PauseReasons();
  pause.openMenu();pause.openMenu();assert.equal(pause.active,true);
  pause.closeMenu();assert.equal(pause.active,false);
  pause.openMenu();pause.resume();assert.equal(pause.menu,false);assert.equal(pause.active,false);
});
test('landscape gameplay frames the character closer while desktop keeps its established view',()=>{
  assert.equal(defaultOrbitDistance({width:1440,height:900}),19.2);
  assert.ok(defaultOrbitDistance({width:915,height:412,gameplay:true})<19.2);
  assert.ok(defaultOrbitDistance({width:844,height:320,gameplay:true})>=5.4);
  assert.equal(defaultOrbitDistance({width:390,height:844,gameplay:true}),19.2);
});

test('landscape composition is independent of device pixel resolution',()=>{
  const reference=defaultOrbitDistance({width:912,height:431,gameplay:true});
  for(const [width,height] of [[1824,862],[844,390],[1688,780],[3840,2160]]){
    assert.equal(defaultOrbitDistance({width,height,gameplay:true}),reference);
  }
});

test('close landscape camera keeps the entire character visible throughout a jump',t=>{
  const previousWindow=globalThis.window;
  globalThis.window=new EventTarget();
  t.after(()=>{if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;});
  const domElement=new EventTarget();domElement.style={};
  const camera=new THREE.PerspectiveCamera(36,912/431,.1,100);
  const orbit=createOrbitCamera({camera,domElement,target:new THREE.Vector3(0,1.75,-.35),
    onChange(){},viewport:{width:912,height:431,gameplay:true}});
  t.after(()=>orbit.dispose());
  const simulation=new PlayerSimulation(createWorld(Array.from({length:15},(_,i)=>({x:i-7,z:0,h:0}))));
  let highest=.5;
  for(let frame=0;frame<180;frame++){
    const snapshot=simulation.update(1/60,{jumpPressed:frame===0});
    highest=Math.max(highest,snapshot.y);
    orbit.follow(snapshot.x,1/60,snapshot.y-.5);camera.updateMatrixWorld(true);
    const head=new THREE.Vector3(snapshot.x,snapshot.y+2.24,0).project(camera);
    const feet=new THREE.Vector3(snapshot.x,snapshot.y,0).project(camera);
    assert.ok(head.y<.98,'jump frame '+frame+' cuts off the head');
    assert.ok(feet.y>-.98,'jump frame '+frame+' cuts off the feet');
  }
  assert.ok(highest>1.5,'test must include an actual jump');
  assert.ok(Math.abs(orbit.snapshot().target.y-1.75)<.001,'camera returns to the grounded composition');
});

test('first game-camera wheel input does not jump to the old distant zoom limit',t=>{
  const previousWindow=globalThis.window;
  globalThis.window=new EventTarget();
  t.after(()=>{if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;});
  const domElement=new EventTarget();
  domElement.style={};
  const vector=()=>({x:0,y:0,z:0,set(x,y,z){Object.assign(this,{x,y,z});}});
  const camera={position:vector(),up:vector(),lookAt(){}};
  const orbit=createOrbitCamera({camera,domElement,target:{x:0,y:1,z:0},onChange(){},viewport:{width:912,height:431,gameplay:true}});
  t.after(()=>orbit.dispose());
  const initial=orbit.snapshot().distance;
  const wheel=new Event('wheel',{cancelable:true});
  Object.defineProperty(wheel,'deltaY',{value:-1});
  domElement.dispatchEvent(wheel);
  const afterWheel=orbit.snapshot().distance;
  assert.equal(wheel.defaultPrevented,true);
  assert.ok(afterWheel<initial&&afterWheel>initial-.1,'one small wheel step should zoom smoothly inward');
  orbit.reset();
  assert.equal(orbit.snapshot().distance,initial);
  assert.equal(orbit.resize({width:1824,height:862,gameplay:true}),false);
  assert.equal(orbit.snapshot().distance,initial,'resolution-only changes must not alter framing');
});
