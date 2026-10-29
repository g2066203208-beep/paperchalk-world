import test from 'node:test';
import assert from 'node:assert/strict';
import {generateRig,poseRig} from '../site/rig.js';
import {
 capsuleDistance,smoothMin,envelopeParts,sampleEnvelope,buildEnvelope,
 marchingContours,pathsToSVG
} from '../site/surface.js';
const eps=(a,b,e=.001)=>Math.abs(a-b)<e;
test('capsule signed-distance really encloses its skeletal segment',()=>{
 const capsule={ax:0,ay:0,bx:100,by:0,ra:20,rb:10};
 assert.ok(eps(capsuleDistance(0,0,capsule),-20));
 assert.ok(eps(capsuleDistance(50,0,capsule),-15));
 assert.ok(eps(capsuleDistance(100,0,capsule),-10));
 assert.ok(eps(capsuleDistance(50,15,capsule),0));
 assert.ok(capsuleDistance(50,40,capsule)>0);
});
test('smooth minimum is symmetric, monotonic, and has no jumps at its blend boundaries',()=>{
 for(const [a,b,k] of [[-1,3,0],[-1,3,4],[0,0,20],[5,8,2]]){
  const s=smoothMin(a,b,k);
  assert.ok(Number.isFinite(s));
  assert.ok(eps(s,smoothMin(b,a,k)));
  assert.ok(s<=Math.min(a,b)+1e-8);
 }
 const k=12,base=6;
 for(const offset of [-k,0,k]){
  const m=smoothMin(base,base+offset,k);
  assert.ok(Math.abs(smoothMin(base,base+offset+1e-5,k)-m)<1e-4);
 }
 assert.ok(eps(smoothMin(2,2,12),-1));
});
test('marching squares extracts an actual closed, interpolated circle',()=>{
 const step=2,n=62,start={x:-61,y:-61};
 const field=new Float32Array(n*n);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++)
  field[y*n+x]=Math.hypot(start.x+x*step,start.y+y*step)-23;
 const contours=marchingContours(field,n,n,start,step);
 assert.equal(contours.length,1);
 assert.equal(contours[0].closed,true);
 assert.ok(contours[0].points.length>60);
 for(const point of contours[0].points){
  assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));
  assert.ok(Math.abs(Math.hypot(point.x,point.y)-23)<.2);
 }
});
test('all 4 procedural species get closed continuous skin in multiple animated poses',()=>{
 for(const type of ['biped','quadruped','hexapod','serpent']){
  for(const seed of [19,2048,92719]){
   const rig=generateRig(type,seed);
   for(const time of [0,.25,.68]){
    const pose=poseRig(rig,time,{play:time!==0});
    const parts=envelopeParts(rig,pose,1.15);
    assert.equal(parts.length,rig.bones.length);
    const field=buildEnvelope(rig,pose,{thickness:1.15,blend:12,step:3.6});
    assert.ok(field.nx>20&&field.ny>20,type+' grid');
    assert.ok(field.inside>60,type+' must have real area');
    assert.ok(field.contours.length>=1,type+' no contours');
    assert.ok(field.contours.every(c=>c.closed),'open/invalid contour in '+type+':'+
      field.contours.map(c=>c.closed+'('+c.points.length+')').join(','));
    for(const bone of rig.bones){
     const at=pose.get(bone.id);
     assert.ok(sampleEnvelope(at.x,at.y,parts,12)<=0,type+' joint outside skin: '+bone.id);
    }
    for(const outline of field.contours){
     assert.ok(outline.points.length>4);
     for(const point of outline.points)assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));
    }
    const svg=pathsToSVG(field);
    assert.match(svg,/^<path d="M/);
    assert.ok(svg.includes('fill-rule="evenodd"'));
   }
  }
 }
});
test('mathematically increasing thickness and smoothness expands occupied body field',()=>{
 const rig=generateRig('quadruped',333),pose=poseRig(rig,0,{play:false});
 const thin=envelopeParts(rig,pose,.7),thick=envelopeParts(rig,pose,1.45);
 const anchor=pose.get('body-core');
 const p={x:anchor.x,y:anchor.y+28};
 assert.ok(sampleEnvelope(p.x,p.y,thick,6)<sampleEnvelope(p.x,p.y,thin,6));
 assert.ok(sampleEnvelope(p.x,p.y,thin,20)<=sampleEnvelope(p.x,p.y,thin,2)+1e-8);
 const start=buildEnvelope(rig,pose,{thickness:.8,blend:4,step:3.5});
 const end=buildEnvelope(rig,pose,{thickness:1.5,blend:18,step:3.5});
 assert.ok(end.inside>start.inside*1.15,'thickness should expand projected area');
});
test('real IK dragging changes the skin contour, not only an overlaid skeleton',()=>{
 const rig=generateRig('quadruped',419),rest=poseRig(rig,0,{play:false});
 const c=rig.chains[0],a=rest.get(c.root);
 const warped=poseRig(rig,0,{play:false,drag:{id:c.end,x:a.x+15,y:a.y+45}});
 const baseline=buildEnvelope(rig,rest,{step:4});
 const pulled=buildEnvelope(rig,warped,{step:4});
 const signature=env=>env.contours.reduce((sum,poly)=>sum+
  poly.points.reduce((s,pt,i)=>s+(i%5===0?pt.y*.021+pt.x*.047:0),0),0);
 assert.ok(Math.abs(signature(baseline)-signature(pulled))>1,
  'the actual extracted skin contour must move with IK');
});
