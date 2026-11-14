/* Regression: tactical zoom can reverse up to original fit, never smaller; safe pan.
 * Run independently of WebGL: node tests/battle-camera-controls.test.cjs
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const context={window:{},Math};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,
 '../site/card-battle/engine/battle-camera.js'),'utf8'),context);
const factory=context.window.PaperchalkBattleCamera;
assert.ok(factory,'camera exports its browser-facing constructor');
const approx=(a,b,tol=.001)=>assert.ok(Math.abs(a-b)<=tol,`expected ${a} ~ ${b}`);
const inBounds=(c,start)=>{
 const q=c.snapshot();
 assert.ok(Math.abs(q.pan[0]-start.target[0])<=q.safePan.x+.001,'x never leaves tactical safety area');
 assert.ok(Math.abs(q.pan[2]-start.target[2])<=q.safePan.z+.001,'z never leaves tactical safety area');
 assert.equal(q.yaw,start.yaw);
 assert.equal(q.elevation,start.elevation);
};
for(const [w,h] of [[1920,1080],[390,844]]){
 const c=factory.create({
  fixed:true,fitAspect:1.68,distance:50.7,
  target:[0,-1.65,.7],yaw:0,elevation:78*Math.PI/180,
  fov:33,minDistance:18,maxDistance:105,
  maxPanX:21.2,maxPanZ:10.02,safeFactor:.87
 });
 c.sizes(w,h);
 const start=c.snapshot();
 assert.equal(start.fitDistance,start.maxDistance);
 assert.equal(start.zoomed,false);
 c.zoom(10);
 approx(c.snapshot().desiredDistance,start.fitDistance);
 c.pan(100000,100000);
 approx(c.snapshot().pan[0],start.target[0]);
 approx(c.snapshot().pan[2],start.target[2]);
 c.zoom(.52);
 assert.ok(c.snapshot().zoomed);
 const closer=c.snapshot().desiredDistance;
 c.zoom(1.2);
 assert.ok(c.snapshot().desiredDistance>closer,
  'reverse wheel increases distance after zooming in');
 assert.ok(c.snapshot().desiredDistance<start.fitDistance,
  'a small reverse wheel must stay within the original full-board size');
 c.zoom(10);
 approx(c.snapshot().desiredDistance,start.fitDistance);
 assert.equal(c.snapshot().zoomed,false,'far limit is the exact original camera');
 c.zoom(10);
 approx(c.snapshot().desiredDistance,start.fitDistance,'cannot go beyond original');
 c.zoom(.52);
 c.pan(-100000,-100000);
 inBounds(c,start);
 assert.ok(c.snapshot().safePan.x>1&&c.snapshot().safePan.z>1);
 // Right-drag must translate, never orbit.
 const down={pointerType:'mouse',pointerId:12,button:2,clientX:330,clientY:330};
 assert.equal(c.pointerDown(down),true);
 assert.equal(c.pointerMove({...down,clientX:430,clientY:390}),true);
 assert.equal(c.pointerUp({...down,clientX:430,clientY:390}),true);
 inBounds(c,start);
 // Pointer at the screen edge attempts pan but safety rails always clamp.
 c.pointerHover({pointerType:'mouse',clientX:w-2,clientY:h-2},
  {left:0,top:0,width:w,height:h});
 for(let i=0;i<300;i++)c.edgePan(1/60,true);
 inBounds(c,start);
 c.pointerHover(null,null);
 // Two touches can pinch both directions, never beyond the original fit.
 assert.equal(c.pointerDown({pointerType:'touch',pointerId:21,clientX:160,clientY:330},false),false);
 assert.equal(c.pointerDown({pointerType:'touch',pointerId:22,clientX:240,clientY:330},false),true);
 c.pointerMove({pointerType:'touch',pointerId:21,clientX:145,clientY:325});
 const pinchBefore=c.snapshot().desiredDistance;
 c.pointerMove({pointerType:'touch',pointerId:22,clientX:270,clientY:340});
 assert.ok(c.snapshot().desiredDistance<pinchBefore,'outward pinch zooms in');
 const pinchCloser=c.snapshot().desiredDistance;
 c.pointerMove({pointerType:'touch',pointerId:22,clientX:220,clientY:340});
 assert.ok(c.snapshot().desiredDistance>pinchCloser,
  'inward pinch zooms back out after enlarging');
 assert.ok(c.snapshot().desiredDistance<=start.fitDistance,
  'pinch can never shrink below the original size');
 assert.equal(c.pointerUp({pointerType:'touch',pointerId:21}),true);
 assert.equal(c.pointerUp({pointerType:'touch',pointerId:22}),true);
 inBounds(c,start);
 // Zooming back to the fit clamps any displaced camera target into zero pan.
 c.zoom(100);
 approx(c.snapshot().desiredDistance,start.fitDistance);
 approx(c.snapshot().pan[0],start.target[0]);
 approx(c.snapshot().pan[2],start.target[2]);
 c.reset();
 for(let i=0;i<80;i++)c.update(.05);
 const restored=c.snapshot();
 approx(restored.distance,start.fitDistance);
 approx(restored.target[0],start.target[0]);
 approx(restored.target[2],start.target[2]);
 assert.equal(restored.zoomed,false);
 console.log('TACTICAL_CAMERA_SAFE_ZOOM_AND_PAN_PASS',JSON.stringify({
  viewport:[w,h],fitDistance:start.fitDistance,restoredDistance:restored.distance
 }));
}
