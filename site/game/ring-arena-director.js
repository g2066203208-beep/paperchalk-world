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
 const DURATION=2400,REDUCED_DURATION=720;
 // A DD-style theatrical beat uses new drawn attack/hit poses, strong art cuts,
 // deliberately held impact and an exact return to the original eye-level view.
 const STAGES=Object.freeze([
  Object.freeze({id:'lock',from:0,to:165}),
  Object.freeze({id:'windup',from:165,to:670}),
  Object.freeze({id:'swing',from:670,to:1050}),
  Object.freeze({id:'impact',from:1050,to:1210}),
  Object.freeze({id:'reaction',from:1210,to:1750}),
  Object.freeze({id:'recover',from:1750,to:DURATION})
 ]);
 const ART=Object.freeze({
  hero:'./assets/characters/hero-axe-attack.webp',
  maleEnemy:'./assets/characters/enemy-suit-hit.webp',
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
  const stage=finished?'done':(STAGES.find(s=>t>=s.from&&t<s.to)||STAGES[5]).id;
  const zoom=smooth((t-65)/390)*(1-smooth((t-1650)/600));
  const advance=smooth((t-500)/430)*(1-smooth((t-1250)/320));
  const recoil=smooth((t-1050)/95)*(1-smooth((t-1750)/345));
  const inImpact=t>=1050&&t<1210;
  const heroPose=smooth((t-140)/160)*(1-smooth((t-1030)/135));
  const victimPose=smooth((t-1010)/80)*(1-smooth((t-1720)/200));
  const hitFlash=inImpact?(1-smooth((t-1050)/150))*.95:0;
  const shake=reduced?0:inImpact?(1-smooth((t-1050)/155))*.95:0;
  const cut=(stage==='windup'||stage==='swing')?'attacker':
   (stage==='impact'||stage==='reaction')?'victim':'none';
  return {stage,elapsed:t,finished,hit:t>=1050,
   zoom:zoom*(reduced?.45:1),advance:advance*(reduced?.4:1),
   recoil:recoil*(reduced?.4:1),hitFlash,shake,heroPose,victimPose,
   cut,cue:stage==='windup'?'斧柄横扫':stage==='swing'?'断斩':
    stage==='impact'?'命中':stage==='reaction'?'受击':'',
   frameHold:inImpact&&!reduced};
 }
 function stageAt(now,reduced=false){
  return sample(createAttack('enemy-1',0,{reducedMotion:reduced}),now).stage;
 }
 function actorMotion(actorId,attack,s){
  if(!attack||!s||s.finished)return {x:0,y:0,z:0,scale:1};
  const direction=attack.mode==='inner'?1:-1;
  if(actorId==='hero')return {x:0,y:s.advance*.08,
   z:direction*(s.advance*.48),scale:1+s.advance*.055};
  if(actorId===attack.targetId)return {x:0,y:s.recoil*.03,
   z:-direction*(s.recoil*.28),scale:1+s.recoil*.035};
  return {x:0,y:0,z:0,scale:1};
 }
 // The only canonical camera is still the fixed LEFT shot. Temporary
 // focal compression may occur only during an attack; no orbit or pitch.
 function cinematicCamera(base,attack,s,target){
  if(!attack||!s||s.finished)return base;
  const direction=attack.mode==='inner'?1:-1,z=s.zoom;
  const eye={...base.eye,
   x:base.eye.x+(target.x-base.eye.x)*z*.055,
   z:base.eye.z+direction*z*.24};
  const focus={...base.focus,x:base.focus.x+target.x*z*.12};
  if(s.shake){
   eye.x+=Math.sin(s.elapsed*.32)*.023*s.shake;
   eye.y+=Math.cos(s.elapsed*.45)*.014*s.shake;
   focus.y=eye.y;
  }
  return {...base,eye,focus,fov:base.fov-z*6.7,cinematic:true};
 }
 function projectScreen(project,actor,cam,aspect){
  const p=project({x:actor.x,y:actor.height*.8,z:actor.z},cam,aspect);
  return {valid:!!p.valid,x:(p.x+1)*50,y:(1-p.y)*50};
 }
 return Object.freeze({CARD,DURATION,REDUCED_DURATION,STAGES,ART,
  pickCard,createAttack,hasEnemyHitPortrait,sample,stageAt,
  actorMotion,cinematicCamera,projectScreen});
});
