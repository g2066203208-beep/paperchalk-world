/* Paperchalk Motion Runtime
 * Neutral 2D skeletal motion interchange used by the Android rigging/mocap studio.
 * Stable retarget key is bone role (root, torso, head, leftArm, ...), never editor node IDs.
 */
(function(global){
'use strict';

const SCHEMA='paperchalk.motion.v1';

function assertMotion(motion){
  if(!motion||typeof motion!=='object')throw new TypeError('PAPERCHALK_MOTION_INVALID');
  if(motion.schema!==SCHEMA)throw new Error('PAPERCHALK_MOTION_SCHEMA '+String(motion.schema||'missing'));
  if(!Array.isArray(motion.tracks))throw new Error('PAPERCHALK_MOTION_TRACKS_MISSING');
  return motion;
}

function cloneValue(v){
  if(Array.isArray(v))return v.map(cloneValue);
  if(v&&typeof v==='object'){
    const out={};
    for(const [k,x] of Object.entries(v))out[k]=cloneValue(x);
    return out;
  }
  return v;
}

function lerpValue(a,b,t){
  if(typeof a==='number'&&typeof b==='number')return a+(b-a)*t;
  if(Array.isArray(a)&&Array.isArray(b)&&a.length===b.length){
    return a.map((v,i)=>typeof v==='number'&&typeof b[i]==='number'?v+(b[i]-v)*t:(t<.5?cloneValue(v):cloneValue(b[i])));
  }
  return t<.5?cloneValue(a):cloneValue(b);
}

function ease(t,mode){
  const x=Math.max(0,Math.min(1,t));
  switch(mode){
    case 'stepped': return 0;
    case 'ease':
    case 'ease-both':
    case 'easeInOut': return x*x*(3-2*x);
    case 'ease-in':
    case 'easeIn': return x*x;
    case 'ease-out':
    case 'easeOut': return 1-(1-x)*(1-x);
    default:return x;
  }
}

function sampleKeyframes(keyframes,timeMs){
  if(!Array.isArray(keyframes)||!keyframes.length)return undefined;
  if(timeMs<=Number(keyframes[0].timeMs||0))return cloneValue(keyframes[0].value);
  const last=keyframes[keyframes.length-1];
  if(timeMs>=Number(last.timeMs||0))return cloneValue(last.value);

  let lo=0,hi=keyframes.length-1;
  while(lo+1<hi){
    const mid=(lo+hi)>>1;
    if(Number(keyframes[mid].timeMs||0)<=timeMs)lo=mid;else hi=mid;
  }
  const a=keyframes[lo],b=keyframes[hi];
  const ta=Number(a.timeMs||0),tb=Number(b.timeMs||0);
  if(tb<=ta)return cloneValue(b.value);
  const u=ease((timeMs-ta)/(tb-ta),a.easing||'linear');
  return lerpValue(a.value,b.value,u);
}

function normalizeTime(motion,timeMs,loop){
  const duration=Math.max(0,Number(motion.durationMs||0));
  if(duration<=0)return 0;
  const t=Number(timeMs)||0;
  if(loop===false)return Math.max(0,Math.min(duration,t));
  return ((t%duration)+duration)%duration;
}

function sample(motion,timeMs,{loop=true}={}){
  assertMotion(motion);
  const t=normalizeTime(motion,timeMs,loop);
  const pose={timeMs:t,bones:{},nodes:{}};
  for(const track of motion.tracks){
    const value=sampleKeyframes(track.keyframes,t);
    if(value===undefined)continue;
    const bucket=track.targetType==='bone'?pose.bones:pose.nodes;
    const target=String(track.target||track.sourceNodeId||'');
    if(!target)continue;
    (bucket[target]||(bucket[target]={}))[track.property]=value;
  }
  return pose;
}

function retargetPose(pose,handlers){
  if(!pose||!handlers)return 0;
  let count=0;
  for(const [role,props] of Object.entries(pose.bones||{})){
    const target=handlers[role];
    if(typeof target==='function'){target(props,role);count++;continue}
    if(target&&typeof target==='object'){Object.assign(target,props);count++}
  }
  return count;
}

async function load(url,options){
  const response=await fetch(url,options);
  if(!response.ok)throw new Error('PAPERCHALK_MOTION_HTTP '+response.status);
  return assertMotion(await response.json());
}

async function fromFile(file){
  if(!file||typeof file.text!=='function')throw new TypeError('PAPERCHALK_MOTION_FILE_REQUIRED');
  return assertMotion(JSON.parse(await file.text()));
}

class Player{
  constructor(motion,{loop=true,speed=1,onPose=null}={}){
    this.motion=assertMotion(motion);
    this.loop=loop;
    this.speed=Number(speed)||1;
    this.onPose=typeof onPose==='function'?onPose:null;
    this.timeMs=0;
    this.playing=false;
  }
  seek(ms){this.timeMs=Number(ms)||0;return this.pose()}
  pose(){return sample(this.motion,this.timeMs,{loop:this.loop})}
  play(){this.playing=true;return this}
  pause(){this.playing=false;return this}
  update(dtSeconds){
    if(this.playing)this.timeMs+=Math.max(0,Number(dtSeconds)||0)*1000*this.speed;
    const pose=this.pose();
    if(this.onPose)this.onPose(pose,this);
    return pose;
  }
}

global.PaperchalkMotion=Object.freeze({
  version:1,
  schema:SCHEMA,
  validate:assertMotion,
  load,
  fromFile,
  sample,
  retargetPose,
  Player
});
})(window);
