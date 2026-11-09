const test=require('node:test');
const assert=require('node:assert/strict');
const school=require('../site/game/school-room-2p5d.js');
test('the daily school is a separate real five-face environment',()=>{
  assert.deepEqual(school.ROOM,{width:10,height:3.38,depth:9});
  assert.ok(school.EXTERIOR.skyX<school.EXTERIOR.schoolX);
  assert.ok(school.EXTERIOR.schoolX<school.EXTERIOR.windowWallX);
  assert.deepEqual(Object.keys(school.MATERIALS).sort(),
    ['back','ceiling','floor','left','right']);
  assert.equal(school.MATERIALS.left,'./assets/school-room/left-windows-alpha.svg');
  assert.equal(school.MATERIALS.right,'./assets/school-room/right-door-painted.svg');
  assert.equal(school.CLASSROOM_LAYOUT.desks,20);
  assert.equal(school.CLASSROOM_LAYOUT.chairs,20);
  assert.equal(school.CLASSROOM_LAYOUT.columns.length,4);
  assert.equal(school.CLASSROOM_LAYOUT.rows.length,5);
  assert.ok(school.CLASSROOM_LAYOUT.centerAisle>=1.2);
  assert.equal(Object.keys(school.FURNITURE_MATERIALS).length,3);
  assert.equal(school.FURNITURE_MATERIALS.desk,'./assets/school-room/student-desk-standee.svg');
  assert.equal(school.FURNITURE_MATERIALS.chair,'./assets/school-room/student-chair-standee.svg');
  assert.equal(school.FURNITURE_MATERIALS.podium,'./assets/school-room/teacher-podium-standee.svg');
  const exterior=Object.values(school.EXTERIOR_MATERIALS);
  assert.equal(exterior.length,2);
  assert.ok(exterior.every(v=>v.startsWith('./assets/school-room/exterior-')));
  assert.equal(school.FALL_MATERIAL,'./assets/school-room/falling-schoolgirl-silhouette.svg');
  const fs=require('node:fs'),path=require('node:path');
  for(const material of [...exterior,school.FALL_MATERIAL]){
    const markup=fs.readFileSync(path.join(__dirname,'../site',material),'utf8');
    assert.match(markup,/^<svg/,'2D material must exist: '+material);
  }
  // No solid mesh material/shaders, boxes or hand-triangulated silhouettes.
  const source=fs.readFileSync(path.join(__dirname,'../site/game/school-room-2p5d.js'),'utf8');
  for(const banned of ['cuboid(', 'outsideQuad(', 'solidDraw(', 'silhouette(', 'a_color']){
    assert.equal(source.includes(banned),false,'No 3D solid mesh: '+banned);
  }
  for(const [id,asset] of Object.entries(school.FURNITURE_MATERIALS)){
    const {readFileSync}=require('node:fs');
    const {join}=require('node:path');
    const art=readFileSync(join(__dirname,'../site',asset),'utf8');
    assert.match(art,/viewBox=/,'Missing independent painted '+id+' material');
  }
  const {readFileSync}=require('node:fs');
  const left=readFileSync(require('node:path').join(__dirname,'../site/assets/school-room/left-painted.svg'),'utf8');
  assert.match(left,/viewBox="0 0 2048 760"/);
  assert.equal((left.match(/id="window-[0-9]"/g)||[]).length,4);
  assert.equal(school.ACTORS.some(a=>a.id==='girl'),true);
  assert.equal(school.ACTORS.some(a=>a.id==='boy'),true);
});
test('classroom actors keep the exact original source-image proportions',()=>{
  const actor=school.ACTORS.find(a=>a.id==='female2');
  // Width follows the 1024x2048 original; never the historic fixed 0.49 ratio.
  const ink={left:.32,right:.68,top:.06,bottom:.96};
  const fit=school.portraitPlacement(actor,{width:1024,height:2048},ink);
  assert.ok(Math.abs(fit.sourceAspect-fit.planeAspect)<1e-12);
  assert.ok(Math.abs(fit.visibleHeight-actor.h)<1e-10);
  assert.ok(Math.abs(fit.planeWidth/fit.planeHeight-.5)<1e-12);
  assert.ok(Math.abs((fit.x0+(ink.left+ink.right)*.5*fit.planeWidth)-actor.x)<1e-10);
  assert.ok(Math.abs(fit.y0+(1-ink.bottom)*fit.planeHeight)<1e-10);
  const wide=school.portraitPlacement(actor,{width:2048,height:1024},
    {left:.30,right:.70,top:.1,bottom:.9});
  assert.ok(Math.abs(wide.planeAspect-2)<1e-12);
});
test('school lens uses human-sized actors, not a wide overview of the ceiling',()=>{
  const cam=school.camera(),actor=school.ACTORS.find(a=>a.id==='girl');
  const top=school.project([actor.x,actor.h,actor.z],cam,1440,810);
  const sole=school.project([actor.x,0,actor.z],cam,1440,810);
  assert.ok(top&&sole);
  const fraction=(sole.y-top.y)/810;
  assert.ok(fraction>.49&&fraction<.69,
    'Physical 1.73m actor should occupy a readable fraction: '+fraction);
  assert.ok(cam.hFov<=56&&cam.z> -1.2,'Portrait lens should frame humans');
});
test('one shared physical perspective makes distant objects appear smaller',()=>{
  const cam=school.camera();
  const w=1440,h=810;
  const closeTop=school.project([0,1.8,2.5],cam,w,h);
  const closeBase=school.project([0,0,2.5],cam,w,h);
  const farTop=school.project([0,1.8,7.5],cam,w,h);
  const farBase=school.project([0,0,7.5],cam,w,h);
  assert.ok(closeTop&&closeBase&&farTop&&farBase);
  assert.ok(closeBase.y-closeTop.y>farBase.y-farTop.y);
  assert.ok(Math.abs(closeBase.x-w/2)<120);
  assert.ok(school.camera(.8,0).yaw>0);
  assert.ok(school.camera(-.8,0).yaw<0);
  assert.ok(Math.abs(school.camera(0,0).yaw)<1e-10);
});
test('the human-scale lens keeps the real character artwork within frame',()=>{
  const cam=school.camera();
  const positions=school.ACTORS.map(a=>{
    const p=school.project([a.x,a.h*.5,a.z],cam,1440,810);
    assert.ok(p,'Projected real actor must have positive depth: '+a.id);
    assert.ok(p.x>70&&p.x<1370,'No actors may be lost to the 54-degree crop: '+a.id+' '+p.x);
    return {id:a.id,x:p.x};
  });
  assert.equal(positions.length,6);
});
test('window and blackboard belong to opposite true world surfaces',()=>{
  const cam=school.camera();
  const a=school.project([-5,1.65,8.0],cam,1440,810);
  const b=school.project([0,1.65,9],cam,1440,810);
  const c=school.project([5,1.65,8],cam,1440,810);
  assert.ok(a.x<b.x&&b.x<c.x);
  assert.ok(a.z<12&&a.z>0);
});
test('main school characters disappear according to chapter days',()=>{
  const boy=school.ACTORS.find(a=>a.id==='boy');
  const girl=school.ACTORS.find(a=>a.id==='girl');
  assert.equal(boy.ends,5);
  assert.equal(girl.ends,1);
});
