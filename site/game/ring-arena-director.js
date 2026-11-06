/* Paperchalk combat director V20 — painterly action portraits + hard-cut timing.
 * Existing Timegrid card damage and authored world actors remain authoritative.
 * This file is deterministic presentation state, not a new combat engine.
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
 const CARD=Object.freeze({key:'slash',name:'斧柄横扫',type:'attack',damage:12,w:1,a:1,r:1});
 const DURATION=520,REDUCED_DURATION=280;
 // A DD-style theatrical beat uses new drawn attack/hit poses, strong art cuts,
 // deliberately held impact and an exact return to the original eye-level view.
 const STAGES=Object.freeze([
  Object.freeze({id:'lock',from:0,to:35}),
  Object.freeze({id:'windup',from:35,to:115}),
  Object.freeze({id:'swing',from:115,to:265}),
  Object.freeze({id:'impact',from:265,to:330}),
  Object.freeze({id:'reaction',from:330,to:445}),
  Object.freeze({id:'recover',from:445,to:520})
 ]);
 const ART=Object.freeze({
  hero:'./assets/characters/hero-axe-attack.webp',
  maleEnemy:'./assets/characters/enemy-suit-hit-no-hud.webp',
  // The new enemy reaction painting is of a suited male. Never display
  // that male as any other enemy; their original L2D gets the hit reaction.
  maleEnemyIds:Object.freeze(['enemy-2'])
 });
 function pickCard(source){
  const c=source?.slash;
  if(!c||c.type!=='attack'||c.damage!==12||c.w!==1||c.a!==1||c.r!==1)return CARD;
  return Object.freeze({key:'slash',name:c.name,type:c.type,
   damage:c.damage,w:c.w,a:c.a,r:c.r});
 }
 function createAttack(targetId,startedAt,opts={}){
  if(!/^enemy-[1-4]$/.test(targetId))throw Error('Invalid attack target');
  if(!Number.isFinite(startedAt))throw Error('Attack needs a clock');
  return Object.freeze({targetId,startedAt,mode:opts.mode==='inner'?'inner':'outer',
   damage:CARD.damage,reducedMotion:!!opts.reducedMotion});
 }
 function hasEnemyHitPortrait(targetId){
  return ART.maleEnemyIds.includes(targetId);
 }
 function sample(attack,now){
  if(!attack)return Object.freeze({stage:'idle',elapsed:0,finished:false,
   hit:false,zoom:0,advance:0,recoil:0,hitFlash:0,shake:0,heroPose:0,
   victimPose:0,frameHold:false,cut:'none'});
  const reduced=attack.reducedMotion,scale=reduced?DURATION/REDUCED_DURATION:1;
  const t=clamp((Number(now)-attack.startedAt)*scale,0,DURATION);
  const finished=t>=DURATION;
  const stage=finished?'done':STAGES.find(v=>t>=v.from&&t<v.to).id;
  // Fight participants remain together in the SAME projected battlefield.
  // Anticipation is short; the attack *snaps* to contact, holds ~2 frames,
  // enemy visibly recoils, both then return to their original anchors.
  const rise=smooth((t-100)/112);
  const fall=1-smooth((t-344)/160);
  const advance=rise*fall;
  const recoil=smooth((t-265)/38)*(1-smooth((t-375)/116));
  const inImpact=stage==='impact';
  return {stage,elapsed:t,finished,hit:t>=265,
   zoom:inImpact?.15:0,advance:advance*(reduced?.55:1),
   recoil:recoil*(reduced?.55:1),
   hitFlash:inImpact?(1-smooth((t-265)/65))*.83:0,
   shake:reduced?0:inImpact?(1-smooth((t-265)/50))*.2:0,
   heroPose:stage==='windup'||stage==='swing'||stage==='impact'?1:0,
   victimPose:stage==='impact'||stage==='reaction'?1:0,
   cut:stage==='windup'||stage==='swing'?'attacker':
    stage==='impact'||stage==='reaction'?'victim':'none',
   cue:'',frameHold:inImpact&&!reduced};
 }
 function stageAt(now,reduced=false){
  return sample(createAttack('enemy-1',0,{reducedMotion:reduced}),now).stage;
 }
 function poseFor(actorId,attack,state){
  if(!attack||!state||state.finished)return 'idle';
  if(actorId==='hero'&&state.heroPose)return 'attack';
  if(actorId===attack.targetId&&state.victimPose)
   return hasEnemyHitPortrait(actorId)?'hurt-art':'hurt-original';
  return 'idle';
 }
 function actorMotion(actorId,attack,s,hero,target){
  if(!attack||!s||s.finished)return {x:0,y:0,z:0,scale:1};
  const sign=attack.mode==='inner'?1:-1;
  if(actorId==='hero'){
   // Draw-time ONLY: a short visible lunge towards the actual target.
   // No ghost copies, no mutations of frozen L2D anchors.
   const vx=hero&&target?target.x-hero.x:0;
   const vz=hero&&target?target.z-hero.z:sign*3.8;
   const k=.36*s.advance;
   return {x:vx*k,y:0,z:vz*k,scale:1+.018*s.advance};
  }
  if(actorId===attack.targetId){
   const vx=hero&&target?target.x-hero.x:0;
   const vz=hero&&target?target.z-hero.z:sign*3.8;
   const len=Math.hypot(vx,vz)||1;
   return {x:vx/len*.20*s.recoil,y:0,
    z:vz/len*.20*s.recoil,scale:1-.018*s.recoil};
  }
  return {x:0,y:0,z:0,scale:1};
 }
 function cinematicCamera(base,attack,s,target){
  // The eye-level fixed-left view is stable from anticipation through hit.
  // Target and attacker move within this camera, NOT as full-screen cut-ins.
  return base;
 }
 function projectScreen(project,actor,cam,aspect){
  const p=project({x:actor.x,y:actor.height*.8,z:actor.z},cam,aspect);
  return {valid:!!p.valid,x:(p.x+1)*50,y:(1-p.y)*50};
 }
 return Object.freeze({CARD,DURATION,REDUCED_DURATION,STAGES,ART,
  pickCard,createAttack,hasEnemyHitPortrait,sample,stageAt,
  actorMotion,cinematicCamera,projectScreen,poseFor});
});
