/* Ring arena pure-math regression. Tests world anchors, not screenshot tricks. */
'use strict';
const assert=require('node:assert/strict');
const arena=require('../site/game/ring-arena-runtime.js');
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,a+' != '+b);
const radial=p=>Math.hypot(p.x,p.z);
for(const mode of ['outer','inner']){
  const a=arena.layout(mode,0),mid=arena.layout(mode,.5),b=arena.layout(mode,1);
  assert.equal(a.allies.length,4);
  assert.equal(a.enemies.length,4);
  for(const team of [a.allies,a.enemies,mid.allies,mid.enemies,b.allies,b.enemies])
    for(const person of team)assert.equal(person.y,0,'shoes must touch the ground plane');
  // World anchors: all six nonhero participants are static even when the camera or hero moves.
  for(const group of ['allies','enemies']){
    for(let i=group==='allies'?1:0;i<4;i++){
      for(const coord of ['x','y','z','angle']){
        near(a[group][i][coord],mid[group][i][coord]);
        near(a[group][i][coord],b[group][i][coord]);
      }
    }
  }
  assert.ok(a.allies[0].x<b.allies[0].x,'hero traverses real world-space arc');
  const ar=mode==='outer'?arena.SPEC.outerRoleRadius:arena.SPEC.innerRoleRadius;
  const er=mode==='outer'?arena.SPEC.innerRoleRadius:arena.SPEC.outerRoleRadius;
  for(let i=1;i<4;i++)near(radial(a.allies[i]),ar);
  for(const enemy of a.enemies)near(radial(enemy),er);
  for(const t of [0,.2,.5,.8,1]){
    const cam=arena.camera(mode,t);
    near(radial(cam.eye),mode==='outer'?arena.SPEC.outerCameraRadius:arena.SPEC.innerCameraRadius);
    assert.equal(cam.eye.y,1.47);
    assert.ok(radial(cam.eye)<arena.SPEC.wallRadius,'camera must remain inside cylindrical wall');
    const sho=arena.layout(mode,t).allies[0];
    const foot=arena.project(sho,cam);
    const head=arena.project({...sho,y:sho.height},cam);
    assert.ok(foot.valid&&head.valid&&head.y>foot.y,'same pinhole must project entire body');
    const M=arena.model(sho,mode);
    near(M[13],0);
  }
  const first=arena.project(a.allies[0],arena.camera(mode,0));
  const last=arena.project(b.allies[0],arena.camera(mode,1));
  assert.ok(first.x<last.x,'player must travel from screen-left to screen-right');
  assert.ok(first.x<0&&last.x>0,'player must cross the center line in both camera orbit modes');
}
assert.ok(arena.SPEC.innerCameraRadius<arena.SPEC.innerRoleRadius);
assert.ok(arena.SPEC.outerCameraRadius>arena.SPEC.outerRoleRadius);
console.log('PASS: true WebGL dual-ring geometry and stable world anchors');