'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const scenes=require('../site/game/scene-environments.js');
const geometry=require('../site/game/scene-geometry.js');
const ring=require('../site/game/ring-arena-runtime.js');
const metro=scenes.get('metro');
const vertices=mesh=>{
 const out=[];
 for(let i=0;i<mesh.length;i+=5)out.push({x:mesh[i],y:mesh[i+1],z:mesh[i+2],u:mesh[i+3],v:mesh[i+4]});
 return out;
};
test('subway vinyl floor overlaps its actual back wall and both end walls with no holes',()=>{
 const {geometry:g,meshes:m}=geometry.build(metro.geometry);
 const f=vertices(m.floorOuter),wall=vertices(m.backOuter);
 assert.ok(Math.min(...f.map(p=>p.z))<g.backZ-.045,'floor slips behind back wall');
 assert.ok(Math.max(...f.map(p=>p.z))>g.frontZ+.045,'floor passes the near edge');
 assert.ok(Math.min(...f.map(p=>p.x))< -g.width/2-.045,'floor slips under left end wall');
 assert.ok(Math.max(...f.map(p=>p.x))> g.width/2+.045,'floor slips under right end wall');
 assert.ok(f.every(p=>p.y===0),'ground is a single y=0 plane');
 assert.ok(wall.every(p=>Math.abs(p.z-g.backZ)<1e-9),'wall has one plane');
 assert.ok(f.every(p=>p.u>=0&&p.u<=1&&p.v>=0&&p.v<=1),
  'carriage sheet uses single continuous UV range, without repeats');
 assert.deepEqual(m.floorOuter,m.floorInner,'normal/reverse meshes must meet identically');
});
test('formal straight-on metro wall: no floor or gangway, heroine cropped naturally as foreground',()=>{
 const hero=metro.actors.positions.hero;
 assert.ok(hero.height>=1.55&&hero.height<=1.75,'keep original actor height in metres');
 assert.equal(hero.y,0,'actual 3D shoes still stand on y=0 even when out of picture');
 assert.equal(metro.camera.composition,'front-elevation-no-floor');
 assert.equal(metro.camera.fovMode,'vertical');
 assert.equal(metro.camera.lensShift,0);
 for(const [aspect,eye,focus] of [[16/9,metro.camera.eye,metro.camera.focus],
  [9/16,metro.camera.phoneEye,metro.camera.phoneFocus]]){
  assert.equal(eye.x,focus.x,'formal front camera MUST face the wall squarely');
  assert.equal(eye.y,focus.y,'no tilted side perspective or downward floor angle');
  const cam={...ring.camera('outer',0),eye,focus,fov:metro.camera.fov,
   lensShift:metro.camera.lensShift,sceneStatic:true,fovMode:metro.camera.fovMode};
  const paintedWallFloor=ring.project({x:eye.x,y:0,z:metro.geometry.backZ},cam,aspect);
  const paintedWallCeiling=ring.project({x:eye.x,y:metro.geometry.heightMeters,z:metro.geometry.backZ},cam,aspect);
  assert.ok(paintedWallFloor.valid&&paintedWallCeiling.valid);
  assert.ok(paintedWallFloor.y< -1.03,
   'floor-wall seam MUST be below the bottom of the image: '+aspect+' '+paintedWallFloor.y);
  assert.ok(paintedWallCeiling.y>1.0,
   'wall image extends beyond top of frame: '+aspect+' '+paintedWallCeiling.y);
  const foot=ring.project({x:hero.x,y:hero.y,z:hero.z},cam,aspect);
  const crown=ring.project({x:hero.x,y:hero.y+hero.height,z:hero.z},cam,aspect);
  assert.ok(foot.valid&&crown.valid);
  assert.ok(foot.y< -1.1,'foreground heroine lower body is intentionally offscreen');
  assert.ok(crown.y>0&&crown.y<.70,
   'hero head sits comfortably inside the actual carriage: '+aspect+' '+crown.y);
  assert.ok(crown.x>-.85&&crown.x<.85,
   'hero upper body remains visible on desktop and phone: '+aspect+' '+crown.x);
  assert.ok(crown.y-foot.y>1.0,'hero must not become tiny');
 }
});
test('carriage uses continuous floor sampling and battle retains repeated floor tiles',()=>{
 const src=fs.readFileSync(path.resolve(__dirname,'../site/game/ring-arena-runtime.js'),'utf8');
 assert.match(src,/uGeometry>\.5&&uGeometry<1\.5\?clamp\(vWallUv/);
 assert.match(src,/fract\(vWallUv\)\)\.rgb/);
 assert.match(src,/cam\.sceneStatic&&cam\.fovMode==='vertical'/);
 assert.match(src,/ACTIVE_GEOMETRY\.shape==='strip'\?1:2/);
});
