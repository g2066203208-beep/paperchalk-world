import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('programmatic 3D city contains real depth-tested WebGL geometry, exact 4 colors and many structures',()=>{
 const source=readFileSync('site/game/world3d.js','utf8');
 const begin=source.indexOf('function makeTown(){'),end=source.indexOf('\nfunction program(gl,',begin);
 assert.ok(begin>=0&&end>begin,'world mesh builder is present');
 const ink=[57/255,54/255,87/255],pink=[242/255,165/255,194/255],blue=[169/255,186/255,233/255],paper=[1,245/255,230/255];
 const mesh=new Function('INK','PINK','BLUE','PAPER','PALETTE',
   source.slice(begin,end)+'\nreturn makeTown();')(ink,pink,blue,paper,[ink,pink,blue,paper]);
 assert.ok(mesh.tri.length/9>10000,'city is made of actual textured-looking 3D triangle faces');
 assert.ok(mesh.line.length/6>10000,'street/building edges are real 3D line vertices');
 assert.equal(mesh.tri.length,mesh.colors.length);assert.equal(mesh.line.length,mesh.lineColors.length);
 assert.ok(mesh.tri.every(Number.isFinite)&&mesh.line.every(Number.isFinite));
 const colors=new Set();
 for(let i=0;i<mesh.colors.length;i+=3){
  colors.add([mesh.colors[i],mesh.colors[i+1],mesh.colors[i+2]].map(v=>Math.round(v*255)).join(','));
 }
 assert.deepEqual([...colors].sort(),['169,186,233','242,165,194','255,245,230','57,54,87'].sort());
 assert.match(source,/gl\.enable\(gl\.DEPTH_TEST\)/);
 assert.match(source,/gl\.drawArrays\(gl\.TRIANGLES/);
 assert.match(source,/gl\.drawArrays\(gl\.LINES/);
 assert.match(source,/gl\.disable\(gl\.DITHER\)/);
 assert.match(source,/gl\.polygonOffset\(1,1\)/);
 assert.ok(mesh.solids.length>50,'buildings and trees have physical collision footprints');
 assert.match(source,/function render\(pose,eye\)/);
 assert.match(source,/projectionMatrix\(pose,canvas\.width\/canvas\.height,eye\)/);
 assert.match(source,/motor\.update\(dt,controls\(\),motion\.pose\.yaw,performance\.now\(\)\)/);
});
test('world3d requests sensor only from a click, gives recenter, touch/keyboard fallback and pauses when closed',()=>{
 const source=readFileSync('site/game/world3d.js','utf8');
 assert.match(source,/addEventListener\('click',startMotion\)/);
 assert.match(source,/DeviceOrientationEvent\.requestPermission\(\)/);
 assert.match(source,/window\.addEventListener\('deviceorientation'/);
 assert.match(source,/window\.removeEventListener\('deviceorientation'/);
 assert.match(source,/motion\.recenter\(\)/);
 assert.match(source,/canvas\.addEventListener\('pointermove'/);
 assert.match(source,/requestPointerLock\(\)/);
 assert.match(source,/devicemotion/);
 assert.match(source,/onAcceleration/);
 assert.match(source,/pw-move-stick/);
 assert.match(source,/pw-posture-hold/);
 assert.match(source,/setStance\(n\)/);
 assert.match(source,/window\.addEventListener\('keydown',keyDown\)/);
 assert.match(source,/const lookKeys=\{arrowleft:/);
 assert.match(source,/cancelAnimationFrame\(raf\)/);
 const html=readFileSync('site/index.html','utf8');
 assert.match(html,/id="pw-world-canvas"/);
 assert.match(html,/id="pw-motion-start"/);
 assert.match(html,/id="pw-motion-center"/);
 assert.match(html,/id="pw-motion-sensitivity"/);
 assert.match(html,/id="pw-motion-response"/);
 assert.match(html,/id="pw-lease-enter-world"/);
 assert.match(html,/id="pw-forward-hold"/);
 assert.match(html,/id="pw-back-hold"/);
 assert.match(html,/id="pw-walk-direction"/);
 assert.match(html,/id="pw-squat-motion"/);
 assert.match(html,/id="pw-gait-threshold"/);
 assert.match(source,/bindWalkHold\('pw-forward-hold',1\)/);
 assert.match(source,/bindWalkHold\('pw-back-hold',-1\)/);
 assert.match(source,/deviceQuaternion\(o\.alpha,o\.beta,o\.gamma,0\)/);
 assert.match(source,/rotate\(q,\[a\.x,a\.y,a\.z\]\)\[2\]/);
 assert.match(source,/motor\.ingestVerticalAcceleration\(up,now\)/);
 assert.match(source,/motor\.setWalkDirection\(-motor\.stepDirection\)/);
 assert.match(source,/accelerationIncludingGravity/);

});
