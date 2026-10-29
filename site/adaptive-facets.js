/**
 * Temporal deformation-aware polygonal skin.
 *
 * 1. Measure rotation at articulated joints relative to their parent's segment.
 *    Rigid translation and whole-body rotation do not count as deformation.
 * 2. Count angular-travel threshold crossings in one rolling simulation-time window.
 * 3. Assign a local event score to each contour vertex via nearby moving joints.
 * 4. Replace dense SDF isolines by explicit straight edges: quiet tissue receives
 *    longer edges, repeatedly flexing tissue receives shorter ones.
 *    Curvature deviation adds a separate feature-preservation constraint.
 */
export const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const TAU=Math.PI*2;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const angle=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
export function wrapAngle(a){return Math.atan2(Math.sin(a),Math.cos(a));}
function relativeAngle(bone,positions,lookup){
 if(!bone.parent)return null;
 const parent=lookup.get(bone.parent);
 // A rigidly rotating entire creature does not create a hinge event.
 if(!parent?.parent)return null;
 const gp=positions.get(parent.parent),p=positions.get(bone.parent),b=positions.get(bone.id);
 if(!gp||!p||!b)return null;
 return wrapAngle(angle(p,b)-angle(gp,p));
}
export class DeformationHistory{
 constructor({windowSeconds=4,angleThreshold=.105}={}){
  this.windowSeconds=windowSeconds;
  this.angleThreshold=angleThreshold;
  this.angles=new Map();this.travel=new Map();this.events=new Map();this.time=0;
 }
 reset(){this.angles.clear();this.travel.clear();this.events.clear();this.time=0;}
 setWindow(value){this.windowSeconds=clamp(value,1,12);this.prune(this.time);}
 setThreshold(value){this.angleThreshold=clamp(value,.025,.6);}
 prune(time){
  const earliest=time-this.windowSeconds;
  for(const [id,events] of this.events){
   while(events.length&&events[0]<earliest)events.shift();
   if(!events.length)this.events.delete(id);
  }
 }
 update(rig,pose,time){
  if(time<this.time-.001)this.reset();
  // Avoid collecting multiple events from repeated calls at identical timestamps.
  const elapsed=time-this.time;
  this.time=time;
  const lookup=new Map(rig.bones.map(b=>[b.id,b]));
  for(const bone of rig.bones){
   const theta=relativeAngle(bone,pose,lookup);
   if(theta===null)continue;
   const previous=this.angles.get(bone.id);
   this.angles.set(bone.id,theta);
   if(previous===undefined||elapsed<=0||elapsed>.4)continue;
   const delta=Math.abs(wrapAngle(theta-previous));
   let accumulated=(this.travel.get(bone.id)||0)+Math.min(delta,.8);
   if(accumulated>=this.angleThreshold){
    const occurrences=Math.min(16,Math.floor(accumulated/this.angleThreshold));
    accumulated-=occurrences*this.angleThreshold;
    const events=this.events.get(bone.id)||[];
    for(let i=0;i<occurrences;i++)events.push(time);
    this.events.set(bone.id,events);
   }
   this.travel.set(bone.id,accumulated);
  }
  this.prune(time);
 }
 count(boneId){return this.events.get(boneId)?.length||0;}
 totals(rig){
  const entries=rig.bones.map(b=>({id:b.id,count:this.count(b.id)}))
    .sort((a,b)=>b.count-a.count);
  return {events:entries.reduce((sum,e)=>sum+e.count,0),
    active:entries.filter(e=>e.count>0).length,
    peak:entries[0]||{id:'—',count:0},entries};
 }
}
/** Influence of repeated local joint flexion on a nearby point on the skin. */
export function activityAt(point,rig,pose,history,{radius=30}={}){
 let best=0;
 const scale=2*radius*radius;
 for(const bone of rig.bones){
  const count=history.count(bone.id);
  if(!count)continue;
  const node=pose.get(bone.id);
  if(!node)continue;
  const dx=point.x-node.x,dy=point.y-node.y;
  // Falloff is local. No score from far-away joints.
  if(dx*dx+dy*dy>9*radius*radius)continue;
  best=Math.max(best,count*Math.exp(-(dx*dx+dy*dy)/scale));
 }
 return best;
}
export function targetSpan(score,{coarse=37,fine=7,strength=1}={}){
 const normalized=clamp((score*strength)/8,0,1);
 // Smooth reduction from large rigid-looking plates to small articulated facets.
 return coarse-(coarse-fine)*normalized;
}
function errorToSegment(p,a,b){
 const dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy;
 if(len2<1e-10)return distance(p,a);
 const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/len2,0,1);
 return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));
}
function polygonArea(points){
 let sum=0;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  sum+=a.x*b.y-b.x*a.y;
 }
 return sum*.5;
}
function orient(a,b,c){return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);}
function crosses(a,b,c,d){
 const x=orient(a,b,c),y=orient(a,b,d),u=orient(c,d,a),v=orient(c,d,b);
 return (x>1e-8&&y< -1e-8||x< -1e-8&&y>1e-8)&&
  (u>1e-8&&v< -1e-8||u< -1e-8&&v>1e-8);
}
export function selfIntersections(points){
 let count=0;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  for(let j=i+2;j<points.length;j++){
   if(i===0&&j===points.length-1)continue;
   if(crosses(a,b,points[j],points[(j+1)%points.length]))count++;
  }
 }
 return count;
}
/**
 * Builds coarse straight-segment polygons. Retains original SDF samples as
 * vertices, so the shell remains attached to the same mathematical isosurface.
 * Uses a fixed polar anchor at the leftmost input point and a two-pass
 * max-edge-span + chord-error test; no smoothing interpolation is introduced.
 */
export function facetContour(contour,scoreAt,{coarse=37,fine=7,strength=1,tolerance=5}={}){
 const pts=contour.points||[];
 const raw=pts.length>2&&distance(pts[0],pts[pts.length-1])<1e-7?pts.slice(0,-1):pts.slice();
 if(raw.length<=4)return {points:raw,closed:!!contour.closed,original:raw.length,segments:raw.length};
 let anchor=0;
 for(let i=1;i<raw.length;i++)
  if(raw[i].x<raw[anchor].x-1e-6||
   Math.abs(raw[i].x-raw[anchor].x)<1e-6&&raw[i].y<raw[anchor].y)anchor=i;
 const ordered=raw.slice(anchor).concat(raw.slice(0,anchor),raw[anchor]);
 const activity=ordered.map(p=>Math.max(0,scoreAt(p)||0));
 const pick=[0];
 let start=0;
 while(start<ordered.length-1){
  let last=start+1,arc=0,maxDeviance=0,highest=activity[start];
  for(let end=start+1;end<ordered.length;end++){
   const prev=ordered[end-1],pt=ordered[end];
   arc+=distance(prev,pt);
   highest=Math.max(highest,activity[end]);
   const span=targetSpan(highest,{coarse,fine,strength});
   const allowable=Math.max(.65,tolerance/(1+highest*strength*.28));
   const from=ordered[start],to=pt;
   maxDeviance=0;
   for(let j=start+1;j<end;j++)
    maxDeviance=Math.max(maxDeviance,errorToSegment(ordered[j],from,to));
   if((arc>span||maxDeviance>allowable)&&end>start+1)break;
   last=end;
   if(arc>span||maxDeviance>allowable)break;
  }
  if(last===start)last++;
  pick.push(last);
  start=last;
 }
 // Drop ring's duplicate first point. Avoid degenerate triangles.
 const coarsePoints=pick.slice(0,-1).map(i=>ordered[i]);
 if(coarsePoints.length<3)return {points:raw,closed:true,original:raw.length,segments:raw.length};
 // At extremely coarse settings, a chord may jump across a narrow limb.
 // Reject the invalid simplification rather than produce torn skin.
 if(selfIntersections(coarsePoints)){
  const retry=facetContour(contour,scoreAt,{coarse:Math.max(8,coarse*.64),
   fine:Math.max(3,fine*.75),strength,tolerance:Math.max(.6,tolerance*.5)});
  return retry;
 }
 return {points:coarsePoints,closed:true,original:raw.length,
  segments:coarsePoints.length,area:polygonArea(coarsePoints)};
}
export function buildFacets(envelope,rig,pose,history,opts={}){
 const scoreAt=p=>activityAt(p,rig,pose,history,{radius:opts.radius||29});
 const contours=envelope.contours.filter(c=>c.closed).map(c=>
  facetContour(c,scoreAt,opts));
 const vertices=contours.reduce((sum,c)=>sum+c.points.length,0);
 const original=envelope.contours.reduce((sum,c)=>sum+c.points.length,0);
 return {contours,vertices,original,reduction:original?1-vertices/original:0};
}
