/* Modular level gameplay runtime. Rendering is a separate adapter.
 * Pure state and events: no DOM, timers, WebGL or asset dependencies.
 * One 3x3 per side + objectives. Future levels register manifests.
 */
(function(root){
'use strict';
const registry=new Map();
const copy=value=>JSON.parse(JSON.stringify(value));
function register(def){
 if(!def||typeof def.id!=='string'||!/^[a-z0-9-]+$/.test(def.id))throw Error('Level requires a stable id');
 if(registry.has(def.id))throw Error('Duplicate level: '+def.id);
 if(!Number.isInteger(def.columns)||!Number.isInteger(def.rowsPerSide)||def.columns<1||def.rowsPerSide<1)throw Error('Invalid level grid');
 if(!Array.isArray(def.units))throw Error('Level requires units');
 const seen=new Set(),placed=new Set();
 for(const unit of def.units){
  if(!unit.id||seen.has(unit.id))throw Error('Duplicate unit id');
  if(!['ally','enemy'].includes(unit.side)||!Number.isInteger(unit.r)||!Number.isInteger(unit.c)||unit.r<0||unit.c<0||unit.r>=def.rowsPerSide||unit.c>=def.columns)throw Error('Invalid unit slot '+unit.id);
  const slot=unit.side+'-'+unit.r+'-'+unit.c;
  if(placed.has(slot))throw Error('Two units in '+slot);
  if(!Number.isFinite(unit.hp)||unit.hp<=0||!Number.isFinite(unit.attack)||unit.attack<0)throw Error('Invalid unit statistics');
  if(unit.intentCycle!==undefined){
   if(unit.side!=='enemy'||!Array.isArray(unit.intentCycle)||!unit.intentCycle.length)
    throw Error('Only enemy units may provide a nonempty intentCycle');
   for(const intent of unit.intentCycle){
    if(!intent||!['attack','guard','raid','rally'].includes(intent.kind)||
      (['attack','raid'].includes(intent.kind)&&(!Number.isFinite(intent.damage)||intent.damage<0))||
      (['guard','rally'].includes(intent.kind)&&(!Number.isFinite(intent.block)||intent.block<0)))
     throw Error('Invalid enemy intent for '+unit.id);
   }
  }
  seen.add(unit.id);placed.add(slot);
 }
 registry.set(def.id,copy(def));
 return def.id;
}
function create(id,grid,options={}){
 const config=registry.get(id);
 if(!config)throw Error('Unknown level '+id);
 const physicalColumns=options.physicalColumns||Array.from({length:config.columns},(_,c)=>c);
  if(!grid||grid.rows!==2*config.rowsPerSide||
    physicalColumns.length!==config.columns||new Set(physicalColumns).size!==config.columns||
    physicalColumns.some(c=>!Number.isInteger(c)||c<0||c>=grid.cols))
   throw Error('Terrain does not match '+id);
 const listeners=new Map();
 let phase='ready',turn=1,units=new Map(),enemyQueue=[];
 function on(event,fn){
  if(!listeners.has(event))listeners.set(event,new Set());
  listeners.get(event).add(fn);return()=>listeners.get(event)?.delete(fn);
 }
 function emit(event,detail){for(const fn of listeners.get(event)||[])fn(copy(detail));}
 function reset(){
  units=new Map(config.units.map(unit=>[unit.id,{...copy(unit),currentHp:unit.hp,alive:true,
   currentBlock:0,deployed:!(unit.side==='ally'&&unit.staged===true)}]));
  turn=1;enemyQueue=[];phase=[...units.values()].some(u=>u.side==='ally'&&!u.deployed)?'deployment':'active';
  emit('reset',snapshot());return snapshot();
 }
 function slot(unit){return {c:unit.c,r:unit.r+(unit.side==='ally'?config.rowsPerSide:0),side:unit.side};}
 function getUnit(id){const u=units.get(id);return u?copy(u):null;}
 function snapshot(){
  return {id:config.id,title:config.title,columns:config.columns,rowsPerSide:config.rowsPerSide,
   objective:config.objective,phase,turn,enemyQueue:[...enemyQueue],intents:enemyIntents(),
   units:[...units.values()].map(u=>({...copy(u),slot:slot(u)}))};
 }
 function getSlot(side,r,c){
  if(!['ally','enemy'].includes(side)||r<0||r>=config.rowsPerSide||c<0||c>=config.columns)return null;
  const tileR=r+(side==='ally'?config.rowsPerSide:0);
  const tileC=physicalColumns[c],pos=grid.center(tileC,tileR);
  return {side,r,c,tileC,tileR,...pos,id:side+'-'+r+'-'+c};
 }
 function occupancy(c,r){return [...units.values()].some(u=>u.alive&&u.deployed&&physicalColumns[u.c]===c&&slot(u).r===r);}
 function deploy(id,r,c){
  const u=units.get(id);
  if(!u||u.side!=='ally'||u.deployed||phase!=='deployment')return {ok:false,reason:'not-staged'};
  if(!Number.isInteger(r)||!Number.isInteger(c)||r<0||r>=config.rowsPerSide||c<0||c>=config.columns)return {ok:false,reason:'outside-ally-grid'};
  if(occupancy(c,r+config.rowsPerSide))return {ok:false,reason:'occupied'};
  if(!grid.cell(physicalColumns[c],r+config.rowsPerSide))return {ok:false,reason:'missing-terrain'};
  u.r=r;u.c=c;u.deployed=true;
  if(![...units.values()].some(other=>other.side==='ally'&&!other.deployed))phase='active';
  const state=snapshot();
  emit('deploy',{unitId:id,r,c,phase});if(phase==='active')emit('start',state);
  return {ok:true,phase,unit:getUnit(id),state};
 }
 function canModify(c,r,d){return phase==='active'&&!occupancy(c,r)&&grid.canAdjust(c,r,d);}
 // Distinct deterministic phases: player's plays never cause automatic enemy
 // retaliation. Surviving enemies act ONCE each only after End Turn.
 function alive(side){return [...units.values()].filter(u=>u.alive&&u.deployed&&u.side===side);}
 function intentFor(enemy){
  if(!enemy||!enemy.alive||enemy.side!=='enemy')return null;
  const move=enemy.intentCycle?.[(turn-1)%enemy.intentCycle.length];
  const kind=move?.kind||'attack';
  return {kind,damage:['attack','raid'].includes(kind)?
   Math.floor(move?.damage??enemy.attack):0,
   block:['guard','rally'].includes(kind)?Math.floor(move?.block||0):0,
   targetPolicy:move?.targetPolicy||enemy.targetPolicy||'nearest',
   pierce:move?.pierce===true,steal:Math.floor(move?.steal||0),
   skillId:move?.id||null,skillName:move?.name||null};
 }
 function enemyIntents(){
  return alive('enemy').sort((a,b)=>a.r-b.r||a.c-b.c).map(u=>({
   unitId:u.id,...intentFor(u)
  }));
 }
 function damageUnit(target,power,pierce=false){
  const blocked=pierce?0:Math.min(target.currentBlock,power);
  if(!pierce)target.currentBlock-=blocked;
  const hit=Math.min(target.currentHp,Math.max(0,power-blocked));
  target.currentHp-=hit;target.alive=target.currentHp>0;
  return {damage:hit,blocked,hp:target.currentHp,defeated:!target.alive};
 }
 function grantBlock(unitId,amount){
  const u=units.get(unitId);
  if(!u||!u.alive||!u.deployed||!Number.isFinite(amount)||amount<=0)return 0;
  const gain=Math.floor(amount);u.currentBlock+=gain;
  emit('guard',{unitId,block:gain});return gain;
 }
 function actAttack(attackerId,targetId,options={}){
  if(phase!=='active')return {ok:false,reason:'not-player-turn'};
  const actor=units.get(attackerId),target=units.get(targetId);
  if(!actor||!target||!actor.alive||!target.alive||!actor.deployed||!target.deployed||
   actor.side!=='ally'||target.side!=='enemy')return {ok:false,reason:'invalid-target'};
  const power=Number.isFinite(options.power)?Math.max(0,Math.floor(options.power)):actor.attack;
  const result=damageUnit(target,power,options.pierce===true);
  const splash=[];
  if(options.splashRow===true){
   for(const enemy of alive('enemy').filter(u=>u.id!==targetId&&u.r===target.r)){
    const hit=damageUnit(enemy,power,options.pierce===true);
    splash.push({targetId:enemy.id,...hit});
    emit('attack',{attackerId,targetId:enemy.id,...hit,side:'ally'});
    if(!enemy.alive)emit('defeat',{unitId:enemy.id,side:'enemy'});
   }
  }
  const blockGained=Number.isFinite(options.block)&&options.block>0?
   grantBlock(actor.id,options.block):0;
  emit('attack',{attackerId,targetId,...result,side:'ally'});
  if(!target.alive)emit('defeat',{unitId:target.id,side:target.side});
  if(!alive('enemy').length){phase='victory';emit('victory',snapshot());}
  return {ok:true,phase,attackerId,targetId,blockGained,splash,...result};
 }
 function endTurn(){
  if(phase!=='active')return {ok:false,reason:'not-player-turn'};
  // Enemy block expires before its NEXT action, not at the start of the
  // player's turn; defensive enemy intents must matter on the next turn.
  for(const enemy of alive('enemy'))enemy.currentBlock=0;
  enemyQueue=enemyIntents().map(e=>e.unitId);
  phase='enemy';
  emit('enemy-turn',{turn,queue:[...enemyQueue],intents:enemyIntents()});
  return {ok:true,phase,queue:[...enemyQueue]};
 }
 function targetForEnemy(enemyId){
  const actor=units.get(enemyId),intent=intentFor(actor);
  if(!actor||!actor.alive)return null;
  const candidates=alive('ally');
  const policy=intent?.targetPolicy||'nearest';
  const dist=(u)=>Math.abs(u.c-actor.c)*3+Math.abs(u.r-actor.r);
  const sorted=candidates.sort((a,b)=>{
   if(policy==='weakest')return a.currentHp-b.currentHp||dist(a)-dist(b);
   if(policy==='backline')return b.r-a.r||dist(a)-dist(b);
   if(policy==='frontline')return a.r-b.r||dist(a)-dist(b);
   return dist(a)-dist(b)||a.c-b.c;
  });
  return sorted[0]?getUnit(sorted[0].id):null;
 }
 function resolveEnemyAction(enemyId){
  if(phase!=='enemy'||!enemyQueue.length)return {ok:false,reason:'not-enemy-turn'};
  if(enemyId&&enemyId!==enemyQueue[0])return {ok:false,reason:'wrong-action-order'};
  const id=enemyQueue.shift(),actor=units.get(id);
  if(!actor||!actor.alive)return {ok:true,skipped:true,unitId:id,remaining:enemyQueue.length};
  const intent=intentFor(actor);
  if(intent.kind==='rally'){
   const affected=[];
   for(const enemy of alive('enemy')){
    enemy.currentBlock+=intent.block;
    affected.push(enemy.id);
   }
   const result={ok:true,unitId:id,kind:'rally',block:intent.block,
    affected,remaining:enemyQueue.length};
   emit('guard',result);return result;
  }
  if(intent.kind==='guard'){
   actor.currentBlock+=intent.block;
   const result={ok:true,unitId:id,kind:'guard',block:intent.block,remaining:enemyQueue.length};
   emit('guard',result);return result;
  }
  const picked=targetForEnemy(id),target=picked?units.get(picked.id):null;
  if(!target){phase='defeat';enemyQueue=[];emit('gameover',snapshot());return{ok:true,phase,unitId:id,remaining:0};}
  const result=damageUnit(target,intent.damage,intent.pierce);
  emit('attack',{attackerId:id,targetId:target.id,side:'enemy',...result});
  if(!target.alive)emit('defeat',{unitId:target.id,side:target.side});
  if(!alive('ally').length){phase='defeat';enemyQueue=[];emit('gameover',snapshot());}
  return{ok:true,unitId:id,targetId:target.id,kind:intent.kind,
   steal:result.damage>0?intent.steal:0,skillId:intent.skillId,
   phase,remaining:enemyQueue.length,...result};
 }
 function beginPlayerTurn(){
  if(phase!=='enemy'||enemyQueue.length)return{ok:false,reason:'enemy-actions-pending'};
  turn++;
  phase='active';
  for(const unit of alive('ally'))unit.currentBlock=0;
  const state=snapshot();emit('turn',state);
  return{ok:true,phase,turn,state};
 }
 reset();
 return Object.freeze({id:config.id,config:copy(config),on,reset,snapshot,getUnit,getSlot,occupancy,canModify,deploy,actAttack,
  enemyIntents,targetForEnemy,grantBlock,endTurn,resolveEnemyAction,beginPlayerTurn,
  get phase(){return phase;},get turn(){return turn;}});
}
root.PaperchalkLevelEngine=Object.freeze({version:'2.2.0-bandit-skills',register,create,list:()=>[...registry.keys()]});
})(window);
