import test from 'node:test';
import assert from 'node:assert/strict';
import {LeanCamera,leanIntent,protectedLean,LEAN_MAX,BANK_MAX} from '../site/game/lean3d.js';
import {RAD} from '../site/game/motion3d.js';
const close=(a,b,eps=.02)=>assert.ok(Math.abs(a-b)<eps,'expected '+a+' near '+b);
test('phone side tilt progressively shifts real camera position, not just bank angle',()=>{
 const c=new LeanCamera(),eye=[0,0,1.68];
 let offsets=[];
 for(const angle of [0,10,20,35,50,65]){
  for(let i=0;i<40;i++)c.update(1/60,angle*RAD,0,eye,[]);
  offsets.push(c.offset);
 }
 assert.equal(offsets[0],0);
 for(let i=1;i<offsets.length;i++)assert.ok(offsets[i]>offsets[i-1],'monotonic left peek');
 close(offsets.at(-1),.34);
 assert.equal(c.bank,0,'comfort mode must keep horizon level');
 const r=c.update(1/60,-65*RAD,0,eye,[]);
 for(let i=0;i<90;i++)c.update(1/60,-65*RAD,0,eye,[]);
 assert.ok(c.offset<-.33,'right tilt must peek right');
 close(c.update(1/60,-65*RAD,0,eye,[]).eye[1],-.34);
});
test('sideways peek follows camera yaw and is bounded at 90 degree phone tilt',()=>{
 const c=new LeanCamera(),eye=[2,1,1.68];
 for(let i=0;i<80;i++)c.update(1/60,90*RAD,Math.PI/2,eye,[]);
 const r=c.update(1/60,90*RAD,Math.PI/2,eye,[]);
 assert.ok(r.eye[0]<1.7,'yaw 90 left is negative world X');
 close(r.eye[1],1);
 assert.ok(Math.abs(r.bank)<=BANK_MAX+.0001);
 assert.ok(Math.abs(leanIntent(90*RAD).offset)<=LEAN_MAX);
});
test('peeking against walls does NOT clip the camera through cover',()=>{
 const solids=[{x:0,y:.55,w:2,d:.2}];
 const c=new LeanCamera(),eye=[0,0,1.68];
 for(let i=0;i<120;i++)c.update(1/60,65*RAD,0,eye,solids);
 const r=c.update(1/60,65*RAD,0,eye,solids);
 assert.ok(r.blocked);
 assert.ok(r.offset<.35,'solid wall limits eye extension');
 assert.ok(r.eye[1]<.35);
});
test('returning phone upright re-centers peek smoothly with no pop',()=>{
 const c=new LeanCamera(),eye=[0,0,1.68];
 for(let i=0;i<80;i++)c.update(1/60,65*RAD,0,eye,[]);
 const before=c.offset;
 const immediate=c.update(1/60,0,0,eye,[]).offset;
 assert.ok(immediate>0&&immediate<before);
 for(let i=0;i<50;i++)c.update(1/60,0,0,eye,[]);
 assert.ok(Math.abs(c.offset)<.001);
});

test('standard mode offers larger controlled peek, never 17 degree nausea-inducing camera banking',()=>{
 const c=new LeanCamera();c.setComfort(false);
 for(let i=0;i<75;i++)c.update(1/60,65*RAD,0,[0,0,1.68],[]);
 assert.ok(c.offset>.62);
 assert.ok(c.bank>0&&c.bank<=BANK_MAX+.00001);
 assert.ok(BANK_MAX<=5*RAD,'standard view still has small, safe camera banking');
 c.setComfort(true);
 for(let i=0;i<120;i++)c.update(1/60,65*RAD,0,[0,0,1.68],[]);
 assert.ok(c.offset<.341);
 assert.ok(Math.abs(c.bank)<.0001);
});
