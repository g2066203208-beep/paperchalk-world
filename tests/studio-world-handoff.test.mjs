import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldHandoff,clampHandoffProgress,handoffSmoothstep} from '../studio/rendering/world-handoff.js';

function vector(x=0,y=0,z=0){return {x,y,z,clone(){return vector(this.x,this.y,this.z);},set(nx,ny,nz){this.x=nx;this.y=ny;this.z=nz;}};}
function node({x=0,y=0,z=0,visible=true}={}){return {position:vector(x,y,z),rotation:vector(),scale:vector(1,1,1),visible};}
function plain(value){return {x:value.x,y:value.y,z:value.z};}

test('world handoff progress helpers are finite and monotonic',()=>{
  assert.equal(clampHandoffProgress(-1),0);
  assert.equal(clampHandoffProgress(2),1);
  assert.equal(clampHandoffProgress(Number.NaN),0);
  assert.equal(handoffSmoothstep(0),0);
  assert.equal(handoffSmoothstep(1),1);
  assert.ok(handoffSmoothstep(.5)>.49&&handoffSmoothstep(.5)<.51);
});

test('handoff moves real paper groups through the crease and restores them exactly',async()=>{
  const street=node({x:3,y:2,z:-1});
  const initial={position:plain(street.position),rotation:plain(street.rotation),scale:plain(street.scale)};
  const handoff=createWorldHandoff({groups:[street],duration:.2});
  let midpoint=0,complete=0;
  const done=handoff.start({kind:'surface',onMidpoint:()=>midpoint++,onComplete:()=>complete++});
  assert.equal(handoff.getState().active,true);
  assert.equal(handoff.getState().domOverlay,false);
  const startY=street.position.y;
  handoff.update(.05);
  assert.ok(street.position.y<startY,'old world should slip down in real scene space');
  assert.notEqual(street.rotation.z,initial.rotation.z,'old paper should tip toward the viewer');
  handoff.update(.05);
  assert.equal(midpoint,1);
  handoff.update(.11);
  assert.equal(handoff.isActive(),false);
  assert.equal(complete,1);
  assert.equal(await done,true);
  assert.deepEqual({x:street.position.x,y:street.position.y,z:street.position.z},initial.position);
  assert.deepEqual({x:street.rotation.x,y:street.rotation.y,z:street.rotation.z},initial.rotation);
  assert.deepEqual({x:street.scale.x,y:street.scale.y,z:street.scale.z},initial.scale);
});

test('restarting a handoff resolves the previous run and keeps transforms finite',async()=>{
  const oldNode=node();
  const handoff=createWorldHandoff({groups:[oldNode],duration:.2});
  const first=handoff.start({kind:'metro'});
  handoff.update(.01);
  const second=handoff.start({kind:'bus'});
  assert.equal(await first,false);
  for(let i=0;i<4;i++)handoff.update(.05);
  assert.equal(await second,true);
  for(const value of [oldNode.position,oldNode.rotation])for(const axis of ['x','y','z'])assert.ok(Number.isFinite(value[axis]));
  handoff.dispose();
});
