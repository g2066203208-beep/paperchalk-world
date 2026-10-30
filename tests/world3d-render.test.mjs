import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('programmatic 3D city contains real depth-tested WebGL geometry, exact 4 colors and many structures',()=>{
 const source=readFileSync('site/game/world3d.js','utf8');
 const begin=source.indexOf('function makeTown(lod='),end=source.indexOf('\nfunction program(gl,',begin);
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
 assert.match(source,/motor\.update\(dt,input\(\),motion\.pose\.yaw\)/);
});
test('3D world has genuine 3D eye-translation peek, no inertial walking or fake squat',()=>{
 const world=readFileSync('site/game/world3d.js','utf8');
 const lean=readFileSync('site/game/lean3d.js','utf8');
 const html=readFileSync('site/index.html','utf8');
 assert.match(world,/import \{LeanCamera\} from '\.\/lean3d\.js\?v=20261030-gyrocomfort6'/);
 assert.match(world,/const peek=lean\.update\(dt,sideRoll,motion\.pose\.yaw,p\.eye,renderer\?\.solids\|\|\[\]\)/);
 assert.match(world,/renderer\.render\(view,peek\.eye\)/);
 assert.match(world,/onNativeQuaternion/);
 assert.match(world,/setComfort\(comfort\)/);
 assert.match(lean,/protectedLean/);
 assert.match(lean,/offset:eased\*LEAN_MAX/);
 assert.doesNotMatch(world,/devicemotion|onAcceleration|ingestVerticalAcceleration|walkMode|physicalStanceMode|pw-walk-toggle|pw-posture-hold/);
 assert.match(world,/bindHold\('pw-forward-hold',/);
 assert.match(world,/bindHold\('pw-back-hold',/);
 assert.match(world,/bindHold\('pw-lean-left',/);
 assert.match(world,/bindHold\('pw-lean-right',/);
 assert.match(world,/requestPointerLock/);
 assert.match(world,/window\.addEventListener\('deviceorientation'/);
 assert.match(world,/window\.removeEventListener\('deviceorientation'/);
 assert.match(world,/setStance\('stand'\)/);
 for(const name of ['pw-world-canvas','pw-motion-start','pw-lean-left','pw-lean-right',
 'pw-lean-distance','pw-stance-stand','pw-stance-crouch','pw-stance-prone',
 'pw-forward-hold','pw-back-hold']){
   assert.ok(html.includes('id="'+name+'"'));
 }
 for(const id of ['pw-walk-toggle','pw-walk-direction','pw-posture-hold','pw-squat-motion','pw-gait-threshold'])
   assert.ok(!html.includes('id="'+id+'"'),'removed unreliable sensor input');
});
