/* Paperchalk V29: reviewed against the USER-PROVIDED actual 699-frame
 * Darkest Dungeon pre-alpha recording (1272x702, 30fps, 23.3s).
 * The frame data below records source-visible events, NOT engine internals.
 * Keep the attack/hurt illustrations during the entire central duel AND
 * retreat; restore normal L2D only AFTER reaching the original anchors.
 * Frame-accurate camera/pacing is adapted to our art/geometry, not pixel-copy.
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
 const FPS=30,FRAME_MS=1000/FPS,FRAME_COUNT=58;
 const DURATION=FRAME_COUNT*FRAME_MS,REDUCED_DURATION=DURATION;
 // Directly inspected source JPG indices. UI footage is 699 consecutive
 // frames, from frame_0000 to frame_0698. Transition markers are empirical
 // visual readings (±1 frame), not claims about hidden engine timing.
 const ORIGINAL_CLIPS=Object.freeze([
  Object.freeze({id:'gunshot-miss',entry:79,impact:81,holdEnd:127,
   retreatStart:128,originalQueue:134,end:135,result:'miss'}),
  Object.freeze({id:'goblet-hit',entry:178,impact:180,holdEnd:227,
   retreatStart:228,originalQueue:234,end:235,result:'hit'}),
  Object.freeze({id:'sword-miss',entry:315,impact:318,holdEnd:364,
   retreatStart:365,originalQueue:372,end:373,result:'miss'}),
  Object.freeze({id:'heavy-miss',entry:416,impact:418,holdEnd:464,
   retreatStart:465,originalQueue:473,end:474,result:'miss'})
 ]);
 const REFERENCE=Object.freeze({
  fps:30,frames:699,
  entries:Object.freeze(ORIGINAL_CLIPS.map(c=>c.entry)),
  exits:Object.freeze(ORIGINAL_CLIPS.map(c=>c.retreatStart)),
  focus:Object.freeze({left:.30,right:.70}),
  clips:ORIGINAL_CLIPS,
  source:'user-uploaded actual 699 JPEG frames, checked 2026-11-06'
 });
 // Screen action starts in 2-3 frames; the hit/result is visible for ~46
 // frames, then zoom and actor placement RETURN over ~7 frames. The central
 // tableau is action/hurt art, NEVER normal idle art. It is NOT a pre-hit pause.
 const STAGES=Object.freeze([
  Object.freeze({id:'lock',from:0,to:1}),
  Object.freeze({id:'approach',from:1,to:2}),
  Object.freeze({id:'swing',from:2,to:3}),
  Object.freeze({id:'impact',from:3,to:4}),
  Object.freeze({id:'reaction',from:4,to:9}),
  Object.freeze({id:'hold',from:9,to:49}),
  Object.freeze({id:'recover',from:49,to:56}),
  Object.freeze({id:'settle',from:56,to:58})
 ]);
 // Keyframe per channel, sampled at EXACT 30fps frame boundaries.
 // These are separate controls: actor travel != camera lens != strike kick.
 // The last screenshot is frame 58; the restored poses begin at frame 56.
 function frameTrack(points){
  const data=new Array(FRAME_COUNT+1);
  const keys=Object.keys(points).map(Number).sort((a,b)=>a-b);
  if(keys[0]!==0||keys[keys.length-1]!==FRAME_COUNT)
   throw Error('Frame track endpoints required');
  for(let j=0;j<keys.length-1;j++){
   const a=keys[j],b=keys[j+1],v0=points[a],v1=points[b];
   for(let i=a;i<b;i++){
    const t=(i-a)/(b-a);
    data[i]=+(v0+(v1-v0)*t).toFixed(6);
   }
  }
  data[FRAME_COUNT]=points[FRAME_COUNT];
  return Object.freeze(data);
 }
 const TRACKS=Object.freeze({
  // Both travel to central safe zones; camera magnifies their clash.
  hero:frameTrack({0:0,1:.48,2:.88,3:1,48:1,
   49:1,50:.93,51:.79,52:.59,53:.34,54:.13,55:0,58:0}),
  victim:frameTrack({0:0,1:.38,2:.82,3:1,48:1,
   49:1,50:.95,51:.83,52:.63,53:.37,54:.15,55:0,58:0}),
  camera:frameTrack({0:0,1:.54,2:.91,3:1,48:1,
   49:1,50:.91,51:.74,52:.53,53:.32,54:.14,55:.04,56:.02,57:0,58:0}),
  lunge:frameTrack({0:0,1:0,2:.36,3:1,4:.42,5:.08,6:0,58:0}),
  recoil:frameTrack({0:0,2:0,3:.28,4:.86,5:1,6:.75,7:.44,8:.17,9:0,58:0}),
  hitFlash:frameTrack({0:0,2:0,3:.5,4:.23,5:0,58:0}),
  fx:frameTrack({0:0,2:0,3:1,4:.85,5:.40,6:0,58:0}),
  damage:frameTrack({0:0,2:0,3:.85,4:1,6:1,8:.85,
   10:.62,13:.24,16:0,58:0}),
  damageRise:frameTrack({0:0,3:0,6:.28,10:.65,16:1,58:1})
 });
 for(const [name,values]of Object.entries(TRACKS)){
  if(values.length!==FRAME_COUNT+1||values.some(v=>!Number.isFinite(v)||v<0||v>1))
   throw Error('Invalid original-frame-referenced director channel '+name);
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
  const hit=frame>=3;
  const cut=frame>=2&&frame<3?'attacker':frame>=3&&frame<9?'victim':'none';
  return {stage,elapsed:t,frame,finished,hit,heroProgress,victimProgress,
   stageStrength:Math.min(heroProgress,victimProgress),zoom,
   advance:at('lunge')*(reduced?.7:1),
   recoil:at('recoil')*(reduced?.7:1),
   hitFlash:at('hitFlash'),fxOpacity:at('fx'),
   damageOpacity:at('damage'),damageLift:at('damageRise'),
   shake:reduced?0:at('hitFlash')*.06,
   // Source-verified: f127/227/364/464 STILL hold battle silhouettes.
   // Retreat f49..55 still uses attack/hurt art, f55 both back at base
   // anchors, f56 FIRST idle art, camera fully settles f57.
   heroPose:frame>=2&&frame<=55?1:0,
   victimPose:frame>=3&&frame<=55?1:0,
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
  return {...base,fov:Math.max(28,base.fov-16),lensShift:.29,duel:true};
 }
 function cinematicCamera(base,attack,s,target){
  if(!attack||!s||s.finished||s.zoom<=0)return base;
  return {...base,fov:base.fov-16*s.zoom,
   lensShift:.23+.06*s.zoom,cinematic:true};
 }
 // Screen-space ground-anchor solver. Converts exact target x positions
 // (30% / 70%) to WORLD coordinates on the common duel-depth plane.
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
  const x0=solveX(-.40,depth,cam,aspect,project);
  const x1=solveX(+.40,depth,cam,aspect,project);
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
 return Object.freeze({CARD,FPS,FRAME_MS,FRAME_COUNT,TRACKS,DURATION,REDUCED_DURATION,STAGES,ART,REFERENCE,ORIGINAL_CLIPS,
  pickCard,createAttack,hasEnemyHitPortrait,sample,sampleFrame,stageAt,poseFor,duelCamera,
  cinematicCamera,duelLayout,actorMotion,projectScreen});
});
