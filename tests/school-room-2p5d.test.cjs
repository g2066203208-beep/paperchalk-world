const test=require('node:test');
const assert=require('node:assert/strict');
const school=require('../site/game/school-room-2p5d.js');
test('the daily school is a separate real five-face environment',()=>{
  assert.deepEqual(school.ROOM,{width:10,height:3.38,depth:9});
  assert.deepEqual(Object.keys(school.MATERIALS).sort(),
    ['back','ceiling','floor','left','right']);
  assert.equal(school.MATERIALS.left,'./assets/school-room/left-painted.svg');
  const {readFileSync}=require('node:fs');
  const left=readFileSync(require('node:path').join(__dirname,'../site/assets/school-room/left-painted.svg'),'utf8');
  assert.match(left,/viewBox="0 0 2048 760"/);
  assert.equal((left.match(/id="window-[0-9]"/g)||[]).length,4);
  assert.equal(school.ACTORS.some(a=>a.id==='girl'),true);
  assert.equal(school.ACTORS.some(a=>a.id==='boy'),true);
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
