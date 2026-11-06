/* Paperchalk V23 combat director. Reconstructed from the user's actual
 * 699-frame, 30fps Darkest Dungeon reference recording (Nov 6 2026).
 * Main principle: ONE fixed middle DUEL STAGE. Both selected actors translate
 * into two opposing, screen-space-controlled WORLD positions, share a single
 * camera, exchange poses/hit FX, then restore exact authored ground anchors.
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
 const DURATION=700,REDUCED_DURATION=410;
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
  Object.freeze({id:'lock',from:0,to:45}),
  Object.freeze({id:'approach',from:45,to:140}),
  Object.freeze({id:'windup',from:140,to:215}),
  Object.freeze({id:'swing',from:215,to:335}),
  Object.freeze({id:'impact',from:335,to:410}),
  Object.freeze({id:'reaction',from:410,to:570}),
  Object.freeze({id:'recover',from:570,to:700})
 ]);
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
 function sample(attack,now){
  if(!attack)return Object.freeze({stage:'idle',elapsed:0,finished:false,
   hit:false,zoom:0,advance:0,recoil:0,hitFlash:0,shake:0,heroPose:0,
   victimPose:0,frameHold:false,cut:'none',stageStrength:0});
  const reduced=attack.reducedMotion,scale=reduced?DURATION/REDUCED_DURATION:1;
  const t=clamp((Number(now)-attack.startedAt)*scale,0,DURATION);
  const finished=t>=DURATION;
  const stage=finished?'done':STAGES.find(v=>t>=v.from&&t<v.to).id;
  // Enter together in ~95ms, exit together after the strike. Avoid the
  // former false 'short lunge from each character's own queue position'.
  const stageStrength=smooth((t-35)/105)*(1-smooth((t-560)/140));
  const attackPush=smooth((t-215)/80)*(1-smooth((t-385)/115));
  const recoil=smooth((t-335)/45)*(1-smooth((t-445)/110));
  const hit=stage==='impact',hitFlash=hit?(1-smooth((t-335)/72))*.72:0;
  const cut=stage==='windup'||stage==='swing'?'attacker':
   stage==='impact'||stage==='reaction'?'victim':'none';
  return {stage,elapsed:t,finished,hit:t>=335,
   stageStrength:reduced?stageStrength*.92:stageStrength,
   zoom:stageStrength,advance:attackPush*(reduced?.55:1),
   recoil:recoil*(reduced?.55:1),hitFlash,
   shake:reduced?0:hit?.12*(1-smooth((t-335)/50)):0,
   heroPose:stage==='windup'||stage==='swing'||stage==='impact'?1:0,
   victimPose:stage==='impact'||stage==='reaction'?1:0,
   frameHold:hit&&!reduced,cut,cue:''};
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
  return {...base,fov:Math.max(30,base.fov-12),duel:true};
 }
 function cinematicCamera(base,attack,s,target){
  if(!attack||!s||s.finished||s.stageStrength<=0)return base;
  return {...base,fov:base.fov-12*s.stageStrength,cinematic:true};
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
  const depth=(hero.z+target.z)*.5;
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
   const k=s.stageStrength;
   const touch=.12*s.advance*k;
   const x=lerp(hero.x,duel.hero.x,k)+(duel.target.x-duel.hero.x)*touch;
   const z=lerp(hero.z,duel.hero.z,k);
   return {x:x-hero.x,y:0,z:z-hero.z,scale:1+.05*k};
  }
  if(actorId===attack.targetId){
   const k=s.stageStrength;
   const out=.10*s.recoil*k;
   const x=lerp(target.x,duel.target.x,k)+
    (duel.target.x-duel.hero.x)*out;
   const z=lerp(target.z,duel.target.z,k);
   return {x:x-target.x,y:0,z:z-target.z,scale:1+.05*k};
  }
  return {x:0,y:0,z:0,scale:1};
 }
 function projectScreen(project,actor,cam,aspect){
  const p=project({x:actor.x,y:actor.height*.8,z:actor.z},cam,aspect);
  return {valid:!!p.valid,x:(p.x+1)*50,y:(1-p.y)*50};
 }
 return Object.freeze({CARD,DURATION,REDUCED_DURATION,STAGES,ART,REFERENCE,
  pickCard,createAttack,hasEnemyHitPortrait,sample,stageAt,poseFor,duelCamera,
  cinematicCamera,duelLayout,actorMotion,projectScreen});
});
