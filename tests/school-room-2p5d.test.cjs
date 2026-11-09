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
test('daylight advances with game minutes and keeps the same physical sun direction',()=>{
  const night=school.lightingAt(23*60),dawn=school.lightingAt(390);
  const noon=school.lightingAt(12*60),dusk=school.lightingAt(17*60+50);
  const after=school.lightingAt(19*60+45);
  assert.equal(night.phase,'night');
  assert.equal(night.sunPower,0);
  assert.ok(night.lampPower>0);
  assert.equal(dawn.phase,'sunrise');
  assert.ok(dawn.sunPower>.3&&dawn.sunPower<noon.sunPower);
  assert.ok(dawn.sunColor[0]>dawn.sunColor[2]*1.5);
  assert.ok(noon.ambient[0]>dawn.ambient[0]);
  assert.ok(dusk.sunPower>.3,'Sunset must still pass direct rays');
  assert.ok(dusk.sunColor[0]>dusk.sunColor[2]*2);
  assert.ok(dawn.sunDirection[2]<noon.sunDirection[2]);
  assert.ok(dusk.sunDirection[2]>noon.sunDirection[2],
    'Sunset and sunrise use one moving world-space sun');
  assert.equal(after.sunPower,0);
  assert.ok(after.lampPower>.1);
  assert.deepEqual(school.lightingAt(420),school.lightingAt(420),
    'The same in-game minute cannot randomly change lighting');
});
test('window jump is a gravity-driven 2D silhouette parallel to the real left wall',()=>{
  const falls=[.15,.86,1.12,1.44,2.2,3.65,4.3].map(t=>school.fallPhaseAt(t));
  assert.ok(falls[0].gaze<.2,'Camera begins facing the class');
  assert.ok(falls[2].gaze>.95,'Camera catches the actual window crossing');
  assert.ok(falls[2].fallingVisible,'The girl is visible passing the glass');
  assert.ok(falls[3].yBottom<falls[2].yBottom,
    'Acceleration moves the figure down across successive frames');
  assert.equal(falls[4].fallingVisible,false,'The girl vanishes below the sill');
  assert.equal(falls[6].finished,true);
  assert.ok(falls[5].gaze<falls[2].gaze,'The camera slowly returns from the window');
  const f=school.fallingSprite(falls[2]);
  assert.equal(f.length,30,'One two-triangle 2D paper sprite');
  const xs=[...Array(6)].map((_,i)=>f[i*5]);
  assert.ok(xs.every(x=>Math.abs(x-school.FALL_WINDOW.figureX)<1e-5),
    'Every falling-sprite vertex must share one world X plane, parallel to window');
  assert.ok(Math.max(...xs)<school.FALL_WINDOW.wallX,
    'Girl must stay OUTSIDE the transparent window wall');
  const zs=[...Array(6)].map((_,i)=>f[i*5+2]);
  const ys=[...Array(6)].map((_,i)=>f[i*5+1]);
  assert.ok(Math.max(...zs)-Math.min(...zs)>.78,'Card must have visible width across the pane');
  assert.ok(Math.max(...ys)-Math.min(...ys)>1.5,'Card must retain human height');
  const cam=school.camera();cam.yaw+=school.FALL_WINDOW.viewAngle*falls[2].gaze;
  cam.hFov-=4.6*falls[2].gaze;
  const center=school.project([school.FALL_WINDOW.figureX,2.1,
    school.FALL_WINDOW.z],cam,1440,810);
  assert.ok(center&&center.x>540&&center.x<900,
    'Window fall must be in cinematic safe area: '+JSON.stringify(center));
});
test('boss emergence ejects every one of the 41 2D classroom standees',()=>{
  assert.deepEqual(Object.keys(school.BOSS_MATERIALS).sort(),['creature','rupture']);
  const phases=[0,.58,1.24,2.28,3,4.15].map(t=>school.bossPhaseAt(t));
  assert.deepEqual(phases.map(p=>p.phase),
    ['warning','rupture','blast','blast','manifest','boss-ready']);
  assert.ok(phases[0].furnitureVisible);
  assert.ok(phases[2].flyingFurniture);
  assert.ok(phases[2].displacement>0);
  assert.ok(phases[3].furnitureOpacity<.5);
  assert.equal(phases[4].furnitureVisible,false);
  assert.equal(phases[5].furnitureVisible,false);
  assert.equal(phases[5].bossGrowth,1);
  assert.equal(phases[5].bossOpacity,1);
  assert.equal(school.BOSS_DURATION,4.15);
  const {readFileSync}=require('node:fs'),{join}=require('node:path');
  for(const sprite of Object.values(school.BOSS_MATERIALS)){
    const text=readFileSync(join(__dirname,'../site',sprite),'utf8');
    assert.match(text,/^<svg/,'Boss must remain an actual 2D texture');
    assert.doesNotMatch(text,/<image\b/,'No external-image dependencies');
  }
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
