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
  seen.add(unit.id);placed.add(slot);
 }
 registry.set(def.id,copy(def));
 return def.id;
}
function create(id,grid){
 const config=registry.get(id);
 if(!config)throw Error('Unknown level '+id);
 if(!grid||grid.cols!==config.columns||grid.rows!==2*config.rowsPerSide)throw Error('Terrain does not match '+id);
 const listeners=new Map();
 let phase='ready',turn=1,units=new Map();
 function on(event,fn){
  if(!listeners.has(event))listeners.set(event,new Set());
  listeners.get(event).add(fn);return()=>listeners.get(event)?.delete(fn);
 }
 function emit(event,detail){for(const fn of listeners.get(event)||[])fn(copy(detail));}
 function reset(){
  units=new Map(config.units.map(unit=>[unit.id,{...copy(unit),currentHp:unit.hp,alive:true}]));
  turn=1;phase='active';emit('reset',snapshot());return snapshot();
 }
 function slot(unit){return {c:unit.c,r:unit.r+(unit.side==='ally'?config.rowsPerSide:0),side:unit.side};}
 function getUnit(id){const u=units.get(id);return u?copy(u):null;}
 function snapshot(){
  return {id:config.id,title:config.title,columns:config.columns,rowsPerSide:config.rowsPerSide,
   objective:config.objective,phase,turn,units:[...units.values()].map(u=>({...copy(u),slot:slot(u)}))};
 }
 function getSlot(side,r,c){
  if(!['ally','enemy'].includes(side)||r<0||r>=config.rowsPerSide||c<0||c>=config.columns)return null;
  const tileR=r+(side==='ally'?config.rowsPerSide:0);
  const pos=grid.center(c,tileR);
  return {side,r,c,tileC:c,tileR,...pos,id:side+'-'+r+'-'+c};
 }
 function occupancy(c,r){return [...units.values()].some(u=>u.alive&&u.c===c&&slot(u).r===r);}
 function canModify(c,r,d){return phase==='active'&&!occupancy(c,r)&&grid.canAdjust(c,r,d);}
 function actAttack(attackerId,targetId){
  if(phase!=='active')return {ok:false,reason:'ended'};
  const actor=units.get(attackerId),target=units.get(targetId);
  if(!actor||!target||!actor.alive||!target.alive||actor.side!=='ally'||target.side!=='enemy')return {ok:false,reason:'invalid-target'};
  const damage=Math.min(target.currentHp,actor.attack);
  target.currentHp-=damage;target.alive=target.currentHp>0;
  emit('attack',{attackerId,targetId,damage,hp:target.currentHp,defeated:!target.alive});
  if(!target.alive)emit('defeat',{unitId:target.id,side:target.side});
  if(![...units.values()].some(u=>u.alive&&u.side==='enemy')){
   phase='victory';emit('victory',snapshot());return{ok:true,phase,damage};
  }
  for(const enemy of units.values()){
   if(!enemy.alive||enemy.side!=='enemy'||!actor.alive)continue;
   const hit=Math.min(actor.currentHp,enemy.attack);
   actor.currentHp-=hit;actor.alive=actor.currentHp>0;
   emit('attack',{attackerId:enemy.id,targetId:actor.id,damage:hit,hp:actor.currentHp,defeated:!actor.alive});
   if(!actor.alive){emit('defeat',{unitId:actor.id,side:actor.side});break;}
  }
  if(!actor.alive){phase='defeat';emit('gameover',snapshot());}
  else{turn++;emit('turn',snapshot());}
  return{ok:true,phase,damage};
 }
 reset();
 return Object.freeze({id:config.id,config:copy(config),on,reset,snapshot,getUnit,getSlot,occupancy,canModify,actAttack,
  get phase(){return phase;},get turn(){return turn;}});
}
root.PaperchalkLevelEngine=Object.freeze({version:'1.0.0',register,create,list:()=>[...registry.keys()]});
})(window);
