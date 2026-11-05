/* Camera geometry regressions. These are mathematical invariants,
 * not screenshot-only acceptance and not hand-tuned parallax multipliers. */
'use strict';
const assert=require('node:assert/strict');
const camera=require('../site/game/scene-camera.js');
const close=(a,b,eps=1e-7)=>assert.ok(Math.abs(a-b)<eps,a+' !== '+b);
const rest=camera.pose(0,0,720);
const scene={bg:{z:-235},enemy:{z:-40},player:{z:300},fog:{z:90},
  ground:{z:-215,horizon:52}};
const neutral=camera.inspect(scene,rest);
assert.deepEqual(neutral.depths,{
  background:-235,enemy:-40,fog:90,player:300,ground:-215
});
assert.deepEqual(neutral.distances,{background:1185,enemy:990,player:650});
assert.ok(neutral.distances.background>neutral.distances.enemy);
assert.ok(neutral.distances.enemy>neutral.distances.player);
const identity=camera.planeMatrix(-235,rest).values;
const expected=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
identity.forEach((v,i)=>close(v,expected[i]));
const resetEnemy=camera.billboard(-40,rest);
close(resetEnemy.x,0);close(resetEnemy.y,0);close(resetEnemy.scale,1);
const touched={bg:{z:-235},enemy:{z:-40},player:{z:300},fog:{z:90},
  ground:{z:-155,horizon:52}};
assert.equal(camera.inspect(touched,rest).depths.enemy,20,
  'ground movement must shift actor world-Z by +60');
const orbit=camera.pose(1,-.8,720);
const matrix=camera.planeMatrix(-235,orbit);
assert.equal(matrix.valid,true);
const depth=camera.FOCAL-(-235),scale=depth/camera.FOCAL;
function screenByMatrix([a,d,,g,b,e,,h,,,,,c,f],x,y){
  const w=g*x+h*y+1;
  return {x:(a*x+b*y+c)/w,y:(d*x+e*y+f)/w};
}
for(const [x,y] of [[0,0],[-280,-120],[150,190],[310,-200]]){
  const p=camera.project({x:x*scale,y:y*scale,z:-235},orbit);
  const q=screenByMatrix(matrix.values,x,y);
  close(p.x,q.x,1e-6);close(p.y,q.y,1e-6);
}
const yawOnly={...orbit,x:0,y:0,pitch:0};
const turningNear=camera.project({x:0,y:0,z:-40},yawOnly);
const turningFar=camera.project({x:0,y:0,z:-235},yawOnly);
close(turningNear.x,turningFar.x,1e-8);
const travel={...rest,x:26};
const near=camera.project({x:0,y:0,z:300},travel);
const enemy=camera.project({x:0,y:0,z:-40},travel);
const far=camera.project({x:0,y:0,z:-235},travel);
assert.ok(Math.abs(near.x)>Math.abs(enemy.x));
assert.ok(Math.abs(enemy.x)>Math.abs(far.x));
close(Math.abs(near.x/enemy.x),990/650,1e-8);
close(Math.abs(enemy.x/far.x),1185/990,1e-8);
const follow=camera.cameraFollowPosition(300,orbit);
const image=camera.project(follow,orbit);
close(image.x,0,1e-7);close(image.y,0,1e-7);
const wide=camera.pose(.8,-.5,720);
const mobile=camera.pose(.8,-.5,390);
assert.ok(Math.abs(mobile.yaw)<Math.abs(wide.yaw));
assert.equal(camera.planeMatrix(1000,rest).valid,false);
console.log('PASS: one-lens 3D camera, 4-corner plane homography, correct inverse-depth parallax, camera-follow heroine');