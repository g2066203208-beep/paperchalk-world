/* Paperchalk V28: 30fps performer poses LOCKED until return to original position.
 * Original Darkest Dungeon footage is not available in this repo: this is a
 * measured 30fps game choreography draft, NOT a fake source-video transcription.
 * Attack choreography is performed WHILE both actors translate toward the
 * shared middle stage. The hit happens BEFORE arrival, NOT after a center
 * pause. Then both performers reverse to their immutable authored anchors.
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
 const FPS=30,FRAME_MS=1000/FPS,FRAME_COUNT=21;
 const DURATION=FRAME_COUNT*FRAME_MS,REDUCED_DURATION=DURATION;
 // KEYFRAME indices are 0..21 inclusive. Deliberately decoupled curves:
 // attacker movement, victim movement, camera zoom, body lunge and hit recoil.
 // One frame lasts 33.333ms. No "1 second freeze at center" is permitted.
 // This is a game art-direction prototype until the user reference video is restored.
 // Reference frame markers: zoomed middle-stage entrances at frame
 // 79/178/315/416 and exits at frame 128/228/368/470.
 // These are capture timestamps, not the original game's internal tick clock.
 const REFERENCE=Object.freeze({
  fps:30,frames:699,
  entries:Object.freeze([79,178,315,416]),
  exits:Object.freeze([128,228,368,470]),
  focus:Object.freeze({left:.365,right:.635})
 });
 const STAGES=Object.freeze([
  Object.freeze({id:'lock',from:0,to:1}),
  Object.freeze({id:'approach',from:1,to:2}),
  Object.freeze({id:'windup',from:2,to:3}),
  Object.freeze({id:'swing',from:3,to:4}),
  Object.freeze({id:'impact',from:4,to:5}),
  Object.freeze({id:'reaction',from:5,to:9}),
  Object.freeze({id:'hold',from:9,to:15}),
  Object.freeze({id:'recover',from:15,to:21})
 ]);
 // The actor tracks return to zero at frame 19 BEFORE any pose reset.
 // Camera zoom only returns to zero at frame 21, AFTER both actors return.
 // Every single authored frame has its OWN channel values; a browser running
 // at 60/90/120Hz holds the same 30fps state rather than easing over 1.5s.
 // These are screen-space/duel-relative fractions, not arbitrary world drift.
 const TRACKS=Object.freeze({
  hero:Object.freeze([0,.10,.44,.79,.95,1,1,1,1,1,1,1,1,1,1,.83,.51,.18,.025,0,0,0]),
  victim:Object.freeze([0,.08,.47,.83,.97,1,1,1,1,1,1,1,1,1,1,.80,.46,.15,.015,0,0,0]),
  camera:Object.freeze([0,.23,.64,.91,1,1,1,1,1,1,1,1,1,1,1,1,1,.95,.90,.78,.30,0]),
  lunge:Object.freeze([0,0,.10,.48,1,.43,.07,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  recoil:Object.freeze([0,0,0,0,0,.72,1,.88,.57,.24,.05,0,0,0,0,0,0,0,0,0,0,0]),
  hitFlash:Object.freeze([0,0,0,0,.48,.16,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  fx:Object.freeze([0,0,0,0,1,.60,.14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  damage:Object.freeze([0,0,0,0,.45,1,1,1,.90,.75,.58,.43,.24,.06,0,0,0,0,0,0,0,0]),
  damageRise:Object.freeze([0,0,0,0,0,.14,.28,.44,.60,.73,.84,.93,1,1,1,1,1,1,1,1,1,1])
 });
 for(const [name,values]of Object.entries(TRACKS)){
  if(values.length!==FRAME_COUNT+1||values.some(v=>!Number.isFinite(v)||v<0||v>1))
   throw Error('Invalid 30fps track '+name);
 }
 const ART=Object.freeze({
  hero:'./assets/characters/hero-axe-attack.webp',
  maleEnemy:'./assets/characters/enemy-suit-hit-no-hud.webp',
  maleEnemyIds:Object.freeze(['enemy-2'])
 });
 function pickCard(source){
  const c=source?.slash;
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
 function hasEnemyHitPortrait(targetId){
  return ART.maleEnemyIds.includes(targetId);
 }
 // Single deterministic frame clock. Real render may run at 60-120fps;
 // compositor and damage settlement always observe the same sampled frame.
 function sample(attack,now){
  if(!attack)return Object.freeze({stage:'idle',elapsed:0,frame:0,finished:false,
   hit:false,zoom:0,advance:0,recoil:0,hitFlash:0,shake:0,heroPose:0,
   victimPose:0,frameHold:false,cut:'none',stageStrength:0,
   heroProgress:0,victimProgress:0,fxOpacity:0,damageOpacity:0,damageLift:0});
  const reduced=attack.reducedMotion;
  const raw=clamp(Number(now)-attack.startedAt,0,REDUCED_DURATION);
  const frame=clamp(Math.floor(raw*FPS/1000+1e-8),0,FRAME_COUNT);
  const t=frame*FRAME_MS;
  const finished=frame>=FRAME_COUNT;
  const stage=finished?'done':STAGES.find(v=>frame>=v.from&&frame<v.to).id;
  const at=name=>TRACKS[name][frame];
  const heroProgress=at('hero'),victimProgress=at('victim'),zoom=at('camera');
  const hit=frame>=4;
  const cut=frame>=2&&frame<4?'attacker':frame>=4&&frame<9?'victim':'none';
  return {stage,elapsed:t,frame,finished,hit,heroProgress,victimProgress,
   stageStrength:Math.min(heroProgress,victimProgress),zoom,
   advance:at('lunge')*(reduced?.7:1),
   recoil:at('recoil')*(reduced?.7:1),
   hitFlash:at('hitFlash'),fxOpacity:at('fx'),
   damageOpacity:at('damage'),damageLift:at('damageRise'),
   shake:reduced?0:at('hitFlash')*.06,
   // No pose restoration in the center. BOTH action silhouettes travel
   // all the way back to their original queue anchors on frame 19.
   // Only frame 20 may switch to canonical L2D; camera settles frame 21.
   heroPose:frame>=2&&frame<=19?1:0,
   victimPose:frame>=4&&frame<=19?1:0,
   frameHold:frame>=5&&frame<=6,cut,cue:''};
 }
 function sampleFrame(attack,frame){
  if(!attack)throw Error('Cannot seek without an attack');
  if(!Number.isInteger(frame)||frame<0||frame>FRAME_COUNT)throw Error('Invalid frame');
  return sample(attack,attack.startedAt+frame*FRAME_MS);
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
 function duelCamera(base){
  // No orbit or pitch: a fast cropped view of the SAME left-side camera.
  return {...base,fov:Math.max(30,base.fov-6),lensShift:.29,duel:true};
 }
 function cinematicCamera(base,attack,s,target){
  if(!attack||!s||s.finished||s.zoom<=0)return base;
  return {...base,fov:base.fov-6*s.zoom,
   lensShift:.23+.06*s.zoom,cinematic:true};
 }
 // Screen-space ground-anchor solver. Converts exact target x positions
 // (36.5% / 63.5%) to WORLD coordinates on the common duel-depth plane.
 // It works for both outer/inner modes and landscape/portrait aspects.
 function solveX(clipX,z,cam,aspect,project){
  const p0=project({x:-6,y:1,z},cam,aspect);
  const p1=project({x:6,y:1,z},cam,aspect);
  if(!p0.valid||!p1.valid)return 0;
  const increasing=p1.x>p0.x;
  let lo=-6,hi=6;
  for(let i=0;i<35;i++){
   const mid=(lo+hi)/2;
   const p=project({x:mid,y:1,z},cam,aspect);
   if(!p.valid)break;
   if((p.x<clipX)===increasing)lo=mid;else hi=mid;
  }
  return (lo+hi)/2;
 }
 function duelLayout(cam,project,aspect,hero,target){
  if(!hero||!target)throw Error('Duel needs both combatants');
  const depth=hero.z*.33+target.z*.67;
  const x0=solveX(-.27,depth,cam,aspect,project);
  const x1=solveX(+.27,depth,cam,aspect,project);
  const duo=Object.freeze({
   hero:Object.freeze({x:x0,y:0,z:depth}),
   target:Object.freeze({x:x1,y:0,z:depth}),
   depth,aspect,actorIds:Object.freeze([hero.id,target.id])
  });
  return duo;
 }
 function actorMotion(actorId,attack,s,hero,target,duel){
  if(!attack||!s||s.finished||!duel)return {x:0,y:0,z:0,scale:1};
  const lerp=(a,b,t)=>a+(b-a)*t;
  if(actorId==='hero'){
   const k=s.heroProgress;
   const touch=.24*s.advance*k;
   const x=lerp(hero.x,duel.hero.x,k)+(duel.target.x-duel.hero.x)*touch;
   const z=lerp(hero.z,duel.hero.z,k);
   return {x:x-hero.x,y:0,z:z-hero.z,scale:1};
  }
  if(actorId===attack.targetId){
   const k=s.victimProgress;
   const out=.125*s.recoil*k;
   const x=lerp(target.x,duel.target.x,k)+
    (duel.target.x-duel.hero.x)*out;
   const z=lerp(target.z,duel.target.z,k);
   return {x:x-target.x,y:0,z:z-target.z,scale:1};
  }
  return {x:0,y:0,z:0,scale:1};
 }
 function projectScreen(project,actor,cam,aspect){
  const p=project({x:actor.x,y:actor.height*.8,z:actor.z},cam,aspect);
  return {valid:!!p.valid,x:(p.x+1)*50,y:(1-p.y)*50};
 }
 return Object.freeze({CARD,FPS,FRAME_MS,FRAME_COUNT,TRACKS,DURATION,REDUCED_DURATION,STAGES,ART,REFERENCE,
  pickCard,createAttack,hasEnemyHitPortrait,sample,sampleFrame,stageAt,poseFor,duelCamera,
  cinematicCamera,duelLayout,actorMotion,projectScreen});
});
