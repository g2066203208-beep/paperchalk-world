/* Screen-space tactile card-motion engine.
 * Pure view state: NEVER draws, mutates deck order, or consumes cards.
 * One timeline per real card instance. Composable peel -> arc flight ->
 * squash/overshoot -> settled fan; deck recoil; selection punch; neighbour
 * spring reflow. All amplitudes/timings centralized for every card game level.
 */
(function(root){'use strict';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const easeOut=t=>1-Math.pow(1-clamp(t),3);
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const DRAW_TIME=.59;
function create(){
 const flights=new Map(),deckHits=new Map(),selections=new Map(),springs=new Map();
 let lastTime=null;
 function drawCard({instance,ownerId,from,at}){
  if(!instance||!ownerId||!from)throw Error('Draw needs unique card instance, owner and source');
  flights.set(instance,{instance,ownerId,from:{...from},start:at,duration:DRAW_TIME});
  deckHits.set(ownerId,at);
 }
 function selectCard(instance,at){
  if(instance)selections.set(instance,at);
 }
 function drawPose(instance,target,at){
  const f=flights.get(instance);
  if(!f)return null;
  const u=clamp((at-f.start)/f.duration);
  if(u>=1){flights.delete(instance);return null;}
  const from=f.from;
  // First 12%: card visibly separates from the paper stack.
  const peel=smooth(u/.13);
  if(u<.13){
   return {x:from.x,y:from.y+peel*.29,z:1.05+peel*.34,
    scale:from.scale*(1+peel*.18),angle:-.11*peel,
    progress:u,phase:'peel'};
  }
  // 13–79%: rapid cubic traverse following a lifted arc (no linear slide).
  const v=clamp((u-.13)/.67),travel=easeOut(v);
  const x=mix(from.x,target.x,travel);
  const y=mix(from.y+.29,target.y,travel)+Math.sin(Math.PI*v)*.85;
  const sc=mix(from.scale*1.18,target.scale*1.12,travel);
  const spin=mix(-.16,target.angle,travel)+Math.sin(Math.PI*v)*.115;
  if(u<.80)return {x,y,z:1.23+Math.sin(Math.PI*v)*.65,
   scale:sc,angle:spin,progress:u,phase:'flight'};
  // Last 20%: small damped card-edge settle, never jump from position.
  const settle=(u-.80)/.20;
  const rebound=Math.sin(settle*Math.PI*2.2)*Math.pow(1-settle,2);
  return {x:target.x+rebound*.075,
   y:target.y+rebound*.16,z:.87,
   scale:target.scale*(1+.12*Math.pow(1-settle,2)+rebound*.045),
   angle:target.angle+rebound*.07,progress:u,phase:'settle'};
 }
 function deckPose(ownerId,at,hover=0){
  const start=deckHits.get(ownerId);
  const t=start===undefined?2:Math.max(0,at-start);
  if(t>1.0)deckHits.delete(ownerId);
  // Anticipation: top sheet dips first, then rebounds and releases.
  const dip=t<.075?-smooth(t/.075)*.055:0;
  const spring=t>=.075&&t<.55?
   Math.exp(-(t-.075)*9)*Math.sin((t-.075)*31)*.12:0;
  const click=Math.max(0,1-t/.42);
  return {scale:1+hover*.115+dip+spring,
   lift:hover*.20+Math.max(0,spring)*.28+click*.045,
   tilt:-.105+hover*.075+spring*.38,
   shimmer:click*click};
 }
 function selectPose(instance,at){
  const start=selections.get(instance);
  if(start===undefined)return {lift:0,punch:0,tilt:0};
  const t=at-start;
  if(t>.46){selections.delete(instance);return {lift:0,punch:0,tilt:0};}
  const p=Math.exp(-t*9)*Math.sin(t*27);
  return {lift:Math.max(0,p)*.11,punch:p*.085,tilt:p*.075};
 }
 function settle(instance,target,at,{hover=false,selected=false}={}){
  // Critically damped-like exponential integration: unaffected cards reflow
  // smoothly when a draw changes the fan, without resetting their timers.
  const dt=lastTime===null?1/60:Math.max(0,Math.min(.08,at-lastTime));
  const alpha=1-Math.exp(-dt*18);
  let pose=springs.get(instance);
  if(!pose)pose={...target};
  else{
   pose={x:mix(pose.x,target.x,alpha),y:mix(pose.y,target.y,alpha),
    scale:mix(pose.scale,target.scale,alpha),
    angle:mix(pose.angle,target.angle,alpha)};
  }
  springs.set(instance,pose);
  const flight=drawPose(instance,pose,at);
  if(flight)return flight;
  const focus=hover?1:0,chosen=selected?1:0;
  const punch=selectPose(instance,at);
  return {x:pose.x,y:pose.y+focus*.30+chosen*.44+punch.lift,
   scale:pose.scale*(1+focus*.16+chosen*.14+punch.punch),
   angle:pose.angle*(1-focus*.74-chosen*.96)+punch.tilt,
   z:chosen?1.60:hover?1.30:.80,
   phase:chosen?'selected':hover?'hover':'steady'};
 }
 function tick(at,validIds){
  lastTime=at;
  if(validIds){
   const valid=new Set(validIds);
   for(const id of springs.keys())if(!valid.has(id))springs.delete(id);
   for(const id of flights.keys())if(!valid.has(id))flights.delete(id);
  }
 }
 function reset(){
  flights.clear();deckHits.clear();selections.clear();springs.clear();lastTime=null;
 }
 function stats(at){
  // Read-only diagnostics must not advance or delete animation tracks.
  const activeFlights=[...flights].map(([instance,f])=>{
   const elapsed=clamp((at-f.start)/f.duration);
   return {instance,ownerId:f.ownerId,progress:elapsed,
    phase:elapsed<.13?'peel':elapsed<.80?'flight':elapsed<1?'settle':'complete'};
  }).filter(f=>f.phase!=='complete');
  return {activeFlights,activeDeckHits:[...deckHits.keys()],
   handPoseCount:springs.size};
 }
 return Object.freeze({drawCard,drawPose,deckPose,selectCard,selectPose,
  settle,tick,reset,stats,version:'1.0.0'});
}
root.PaperchalkCardHandMotion=Object.freeze({version:'1.0.0',create});
})(window);
