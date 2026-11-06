/* Paperchalk combat cinematics: deterministic, non-destructive 3D director.
 * The Timegrid "slash" card is the source of semantic card values; this
 * module only orchestrates the VISUAL beats. It never changes turn rules,
 * character bindings or the world-space formation.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.PaperchalkBattleDirector=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
 const CARD=Object.freeze({key:'slash',name:'斧柄横扫',type:'attack',
  damage:12,w:1,a:1,r:1});
 const DURATION=1540;
 const REDUCED_DURATION=460;
 // Explicit monotone timings: pre-focus → wind-up → swing → frozen impact → recover.
 const STAGES=Object.freeze([
  Object.freeze({id:'lock',from:0,to:190}),
  Object.freeze({id:'windup',from:190,to:495}),
  Object.freeze({id:'swing',from:495,to:785}),
  Object.freeze({id:'impact',from:785,to:920}),
  Object.freeze({id:'recover',from:920,to:1540})
 ]);
 function pickCard(source){
  const c=source&&source.slash;
  if(!c||c.type!=='attack'||c.damage!==12||c.w!==1||c.a!==1||c.r!==1)
   return CARD;
  return Object.freeze({key:'slash',name:c.name,type:c.type,
   damage:c.damage,w:c.w,a:c.a,r:c.r});
 }
 function createAttack(targetId,startedAt,opts={}){
  if(!/^enemy-[1-4]$/.test(targetId))throw Error('Invalid attack target');
  if(!Number.isFinite(startedAt))throw Error('Attack needs a clock');
  return Object.freeze({targetId,startedAt,mode:opts.mode==='inner'?'inner':'outer',
   damage:CARD.damage,reducedMotion:!!opts.reducedMotion});
 }
 function sample(attack,now){
  if(!attack)return Object.freeze({stage:'idle',elapsed:0,finished:false,
   hit:false,zoom:0,advance:0,recoil:0,hitFlash:0,shake:0});
  const reduced=attack.reducedMotion,scale=reduced?DURATION/REDUCED_DURATION:1;
  const t=clamp((Number(now)-attack.startedAt)*scale,0,DURATION);
  const stage=t>=DURATION?'done':(STAGES.find(s=>t>=s.from&&t<s.to)||STAGES[4]).id;
  const focus=smooth((t-80)/340)*(1-smooth((t-980)/460));
  const wind=smooth((t-190)/305);
  const thrust=smooth((t-495)/190)*(1-smooth((t-900)/360));
  const impact=t>=785&&t<920;
  const reco=smooth((t-785)/85)*(1-smooth((t-1050)/275));
  return {stage,elapsed:t,finished:t>=DURATION,hit:t>=785,
   zoom:focus*(reduced?.52:1),advance:thrust*(reduced?.32:1),
   recoil:reco*(reduced?.38:1),hitFlash:impact?(1-smooth((t-785)/135))*.88:0,
   shake:reduced?0:impact?(1-smooth((t-785)/135))*.52:0,
   cue:stage==='windup'?'蓄势':stage==='swing'?'斧柄横扫':
    stage==='impact'?'命中':stage==='recover'?'收势':'',
   frameHold:impact&&!reduced};
 }
 function stageAt(now,reduced=false){
  const elapsed=clamp(Number(now),0,reduced?REDUCED_DURATION:DURATION);
  return sample(createAttack('enemy-1',0,{reducedMotion:reduced}),elapsed).stage;
 }
 // Cosmetic 3D offsets only; the caller creates temporary draw copies.
 function actorMotion(actorId,attack,s){
  if(!attack||!s||s.finished)return {x:0,y:0,z:0,scale:1};
  const direction=attack.mode==='inner'?1:-1;
  if(actorId==='hero')return {x:0,y:s.advance*.035,
   z:direction*(s.advance*.30),scale:1+s.advance*.025};
  if(actorId===attack.targetId)return {x:0,y:s.recoil*.023,
   z:-direction*(s.recoil*.18),scale:1+s.recoil*.012};
  return {x:0,y:0,z:0,scale:1};
 }
 // The resting left camera is immutable; a small in-place dolly stays at
 // the SAME side of the arena and always returns exactly to the original.
 function cinematicCamera(base,attack,s,target){
  if(!attack||!s||s.finished)return base;
  const direction=attack.mode==='inner'?1:-1;
  const z=s.zoom;
  const eye={...base.eye,
   x:base.eye.x+(target.x-base.eye.x)*z*.027,
   z:base.eye.z+direction*z*.13};
  const focus={...base.focus,x:base.focus.x+target.x*z*.09};
  if(s.shake){eye.x+=Math.sin(s.elapsed*.29)*.018*s.shake;
   eye.y+=Math.cos(s.elapsed*.45)*.010*s.shake;
   focus.y=eye.y;}
  return {...base,eye,focus,fov:base.fov-z*4.0,cinematic:true};
 }
 function projectScreen(project,actor,cam,aspect){
  const p=project({x:actor.x,y:actor.height*.80,z:actor.z},cam,aspect);
  return {valid:!!p.valid,x:(p.x+1)*50,y:(1-p.y)*50};
 }
 return Object.freeze({CARD,DURATION,REDUCED_DURATION,STAGES,pickCard,
  createAttack,sample,stageAt,actorMotion,cinematicCamera,projectScreen});
});
