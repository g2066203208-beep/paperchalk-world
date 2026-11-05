'use strict';
const assert=require('node:assert/strict');
const api=require('../site/game/classroom-box-runtime.js');
const close=(a,b,epsilon=1e-9)=>
  assert.ok(Math.abs(a-b)<=epsilon, a+' != '+b);
const base=api.camera(0,0);
const fixed={x:api.BASE_CAMERA.x,y:api.BASE_CAMERA.y,z:api.BASE_CAMERA.z};
assert.deepEqual({x:base.x,y:base.y,z:base.z},fixed);
close(base.yaw,0);close(base.pitch,0);
close(api.pointerAxis(.03),0);
close(api.pointerAxis(-.06),0);
close(api.pointerAxis(1),1);
close(api.pointerAxis(-1),-1);
const right=api.camera(1,0),left=api.camera(-1,0);
const up=api.camera(0,-1),down=api.camera(0,1);
assert.ok(right.yaw>0 && left.yaw<0,'right mouse must LOOK right');
assert.ok(up.pitch>0 && down.pitch<0,'up mouse must LOOK up');
close(right.yaw,7*Math.PI/180);
close(up.pitch,3.8*Math.PI/180);
close(api.camera(1,0,0).yaw,0);
close(api.camera(1,0,1.5).yaw,10.5*Math.PI/180);
close(api.camera(9,-99).yaw,right.yaw);
close(api.camera(-9,99).yaw,left.yaw);
for(const x of [-1,-.5,0,.5,1]){
  for(const y of [-1,-.4,0,.4,1]){
    for(const strength of [0,.5,1,1.5]){
      const c=api.camera(x,y,strength);
      assert.deepEqual({x:c.x,y:c.y,z:c.z},fixed,
        'mouse may only turn the camera from a fixed standing point');
      assert.ok(Math.abs(c.yaw)<=7*Math.PI/180*strength+1e-9);
      assert.ok(Math.abs(c.pitch)<=3.8*Math.PI/180*strength+1e-9);
      close(c.hFov,base.hFov);
    }
  }
}
// Pure rotation alters the viewing direction, not world point distances or
// the camera pivot. Do NOT require fake distance-dependent dolly parallax.
const w=1280,h=720,point=[0,1.22,8];
const p0=api.project(point,base,w,h);
const pr=api.project(point,right,w,h);
const pu=api.project(point,up,w,h);
assert.ok(pr.x<p0.x,'looking right moves central world point left on screen');
assert.ok(pu.y>p0.y,'looking up moves central world point down on screen');
const distance=c=>Math.hypot(point[0]-c.x,point[1]-c.y,point[2]-c.z);
close(distance(base),distance(right));
close(distance(base),distance(up));
assert.equal(api.FACES.length,5);
assert.equal(api.buildMesh().faceCount,5);
console.log('PASS 3D first-person head look: fixed camera XYZ, matched pointer axes, ±7° yaw / ±3.8° pitch, deadzone and no dolly');
