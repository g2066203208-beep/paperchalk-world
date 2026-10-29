import test from 'node:test';
import assert from 'node:assert/strict';
import {generateRig,poseRig} from '../site/rig.js';
import {buildEnvelope} from '../site/surface.js';
import {DeformationHistory,activityAt,targetSpan,facetContour,buildFacets,selfIntersections} from '../site/adaptive-facets.js';
const countEdgesNear=(contour,x,range)=>contour.points.filter(p=>Math.abs(p.x-x)<range).length;
function syntheticPose(phase,translate=0){
 const t=phase;
 return new Map([
  ['root',{x:translate,y:0}],
  ['shoulder',{x:10+translate,y:0}],
  ['elbow',{x:10+translate+10*Math.cos(t),y:10*Math.sin(t)}],
  ['other',{x:10+translate,y:-10}]
 ]);
}
const synthetic={bones:[
 {id:'root',parent:null},
 {id:'shoulder',parent:'root'},
 {id:'elbow',parent:'shoulder'},
 {id:'other',parent:'shoulder'}
]};
test('counts hinge angle changes over sliding window instead of translation',()=>{
 const h=new DeformationHistory({windowSeconds:2,angleThreshold:.14});
 for(let i=0;i<45;i++)h.update(synthetic,syntheticPose(.9*Math.sin(i*.4),0),i*.08);
 assert.ok(h.count('elbow')>7,'hinge should repeatedly record meaningful deformation');
 assert.equal(h.count('shoulder'),0,'root orientation is not a hinge');
 assert.equal(h.count('other'),0,'stationary branch should not deform');
 const current=h.count('elbow');
 h.setWindow(.5);
 assert.ok(h.count('elbow')<current,'expired events must disappear');
 const idle=new DeformationHistory({windowSeconds:3,angleThreshold:.06});
 for(let i=0;i<50;i++)idle.update(synthetic,syntheticPose(.4,i*5),i*.05);
 assert.equal(idle.totals(synthetic).events,0,'rigid translation must not be counted');
});
test('quiet sections form long straight edges; frequent local bends use more, shorter edges',()=>{
 const circle=[];
 for(let i=0;i<=480;i++){
  const a=i/480*2*Math.PI;
  circle.push({x:70*Math.cos(a),y:70*Math.sin(a)});
 }
 const source={points:circle,closed:true};
 const staticOutline=facetContour(source,()=>0,{coarse:48,fine:5,tolerance:7});
 assert.ok(staticOutline.points.length>7&&staticOutline.points.length<60);
 assert.equal(staticOutline.closed,true);
 assert.equal(selfIntersections(staticOutline.points),0);
 const activeOutline=facetContour(source,p=>p.x<0?12:0,{coarse:48,fine:5,tolerance:7});
 assert.ok(activeOutline.points.length>staticOutline.points.length*1.3,
  'frequent local movement must introduce more actual straight-line edges');
 assert.ok(countEdgesNear(activeOutline,-63,15)>countEdgesNear(activeOutline,63,15)*1.6,
  'the new vertices must concentrate near the deforming half, not globally');
 assert.ok(targetSpan(0,{coarse:48,fine:5})>targetSpan(12,{coarse:48,fine:5}));
 assert.equal(selfIntersections(activeOutline.points),0);
});
test('real articulated quadruped produces nonuniform local adaptive skin within the same four-second interval',()=>{
 const rig=generateRig('quadruped',2048),history=new DeformationHistory({windowSeconds:4,angleThreshold:.09});
 let pose=null;
 for(let i=0;i<96;i++){
  pose=poseRig(rig,i*.05);
  history.update(rig,pose,i*.05);
 }
 const events=history.totals(rig);
 assert.ok(events.events>3,'real gait must contain hinge deformation events');
 assert.ok(events.active>=2,'more than one joint has changed');
 const envelope=buildEnvelope(rig,pose,{thickness:1.15,blend:12,step:3.3});
 const rigid=new DeformationHistory();
 const coarse=buildFacets(envelope,rig,pose,rigid,{coarse:42,fine:5,tolerance:7,radius:24});
 const adaptive=buildFacets(envelope,rig,pose,history,{coarse:42,fine:5,tolerance:7,radius:24});
 assert.ok(coarse.vertices<envelope.contours.reduce((s,c)=>s+c.points.length,0)*.6,'must create coarse polygon, not keep curve samples');
 assert.ok(adaptive.vertices>coarse.vertices,'active joints should cause finer segmentation');
 assert.ok(adaptive.contours.every(c=>c.closed&&selfIntersections(c.points)===0));
 const peek=rig.bones.find(b=>b.id===events.peak.id);
 const activity=activityAt(pose.get(peek.id),rig,pose,history);
 assert.ok(activity>0);
 assert.ok(activityAt({x:2000,y:2000},rig,pose,history)<.001);
});
test('rings stay closed and non-self-crossing for all topologies/seeds/poses',()=>{
 for(const type of ['biped','quadruped','hexapod','serpent']){
  for(const seed of [19,82,2048]){
   const rig=generateRig(type,seed),history=new DeformationHistory();
   for(const t of [0,.38,1.2]){
    const pose=poseRig(rig,t),envelope=buildEnvelope(rig,pose,{step:3.5});
    const facet=buildFacets(envelope,rig,pose,history,{coarse:35,fine:7,tolerance:5});
    assert.ok(facet.vertices>=3,type);
    assert.ok(facet.reduction>=0);
    for(const polygon of facet.contours){
     assert.ok(polygon.closed&&polygon.points.length>=3,type+' generated degenerate ring');
     assert.equal(selfIntersections(polygon.points),0,type+' crossed itself');
    }
   }
  }
 }
});
