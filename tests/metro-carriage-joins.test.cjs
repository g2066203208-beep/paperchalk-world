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
test('metro actress keeps world stature, visible hair and visible shoe soles in desktop AND mobile framing',()=>{
 const hero=metro.actors.positions.hero;
 assert.ok(hero.height>=1.55&&hero.height<=1.75,'use natural character meters, not billboard magic');
 assert.equal(hero.y,0,'character soles still touch actual floor');
 assert.equal(metro.camera.fovMode,'vertical','portrait devices must not turn small humans into tiny silhouettes');
 for(const [aspect,eye,focus] of [[16/9,metro.camera.eye,metro.camera.focus],
  [9/16,metro.camera.phoneEye,metro.camera.phoneFocus]]){
  const cam={...ring.camera('outer',0),eye,focus,fov:metro.camera.fov,
   lensShift:metro.camera.lensShift,sceneStatic:true,fovMode:metro.camera.fovMode};
  const foot=ring.project({x:hero.x,y:hero.y,z:hero.z},cam,aspect);
  const crown=ring.project({x:hero.x,y:hero.y+hero.height,z:hero.z},cam,aspect);
  assert.ok(foot.valid&&crown.valid);
  assert.ok(foot.y>-.98&&foot.y<-.53,'entire shoes in picture: '+aspect);
  assert.ok(crown.y>.32&&crown.y<.89,'head clear of top: '+aspect);
  assert.ok(crown.y-foot.y>1.08,'human fills at least 54% frame height: '+aspect);
  assert.ok(foot.x>-.85&&foot.x<.5,'human visible horizontally: '+aspect);
 }
});
test('carriage uses continuous floor sampling and battle retains repeated floor tiles',()=>{
 const src=fs.readFileSync(path.resolve(__dirname,'../site/game/ring-arena-runtime.js'),'utf8');
 assert.match(src,/uGeometry>\.5&&uGeometry<1\.5\?clamp\(vWallUv/);
 assert.match(src,/fract\(vWallUv\)\)\.rgb/);
 assert.match(src,/cam\.sceneStatic&&cam\.fovMode==='vertical'/);
 assert.match(src,/ACTIVE_GEOMETRY\.shape==='strip'\?1:2/);
});
