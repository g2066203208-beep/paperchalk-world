const test=require('node:test'),assert=require('node:assert/strict');
const {create,OPEN_ANGLE}=require('../site/card-battle/engine/flip-case-controller.js');
const near=(a,b,t=.001)=>assert.ok(Math.abs(a-b)<t,'numeric pose mismatch');
test('rear horizontal hinge + center horizontal axle form continuous reversible lid',()=>{
 let count=0;const c=create({handCount:()=>count});
 assert.equal(c.phase,'closed');assert.equal(c.confirm(),false);
 assert.equal(c.open(10),true);assert.equal(c.open(10),false);
 for(let i=0;i<=24;i++){
  const p=c.samplePose('opening',i/24);
  assert.equal(p.faceSpin,0);
  near(p.angle,OPEN_ANGLE*(i/24)**2*(3-2*i/24),.001);
 }
 c.update(11.06);assert.equal(c.phase,'drawing');
 near(c.snapshot().angle,OPEN_ANGLE);
 assert.equal(c.confirm(),false);
 count=10;assert.equal(c.confirm(12),true);
 let oldY=Infinity,oldSpin=-1;
 for(let i=0;i<=24;i++){
  const p=c.samplePose('closing',i/24);
  const normalZ=-Math.cos(p.angle+p.faceSpin);
  assert.ok(normalZ>.70,'hand-facing lid never flips edge-on or backwards');
  assert.ok(p.angle<=oldY+.00001,'hinge closes monotonically');
  assert.ok(p.faceSpin>=oldSpin-.00001,'reversible axle flips monotonically');
  near(p.angle/OPEN_ANGLE+p.faceSpin/Math.PI,1,.0001);
  oldY=p.angle;oldSpin=p.faceSpin;
 }
 c.update(13.39);assert.equal(c.phase,'playing');
 near(c.snapshot().angle,0);near(c.snapshot().faceSpin,Math.PI);
 assert.equal(c.open(),false);
 assert.equal(c.nextTurn(14),true);
 assert.equal(c.phase,'rewinding');
 for(let i=0;i<=24;i++){
  const p=c.samplePose('rewinding',i/24);
  near(p.angle,0);assert.ok(p.faceSpin>=0&&p.faceSpin<=Math.PI);
 }
 c.update(14.61);assert.equal(c.phase,'closed');
 near(c.snapshot().faceSpin,0);assert.equal(c.snapshot().cycle,1);
});
test('draw confirmation is forbidden before at least one card or before deployment',()=>{
 let allow=false,count=0;
 const c=create({handCount:()=>count,canConfirm:()=>allow});
 c.open(0);c.update(2);assert.equal(c.confirm(2),false);
 count=2;assert.equal(c.confirm(2),false);
 allow=true;assert.equal(c.confirm(2),true);
 c.update(4);assert.equal(c.phase,'playing');
 c.reset(5);assert.equal(c.phase,'closed');near(c.snapshot().angle,0);
});
