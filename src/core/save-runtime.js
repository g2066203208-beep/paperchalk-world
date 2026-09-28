/* Versioned save codec for the Terraria-style paper-stage runtime. */
(function(global){
'use strict';

const CURRENT_SCHEMA=5;
const GAME_VERSION='1.1.0-paper-stage';

function cloneJson(value){return JSON.parse(JSON.stringify(value))}
function finiteOr(value,fallback){return Number.isFinite(value)?value:fallback}
function asArray(value,fallback=[]){return Array.isArray(value)?value:fallback}
function finitePlayer(value){
  if(!value||typeof value!=='object')return null;
  return {
    x:finiteOr(value.x,0),
    y:finiteOr(value.y,3),
    z:finiteOr(value.z,.45),
    yaw:finiteOr(value.yaw,0)
  };
}

function migrateToV5(input){
  const save=input&&typeof input==='object'?cloneJson(input):{};
  const sourceVersion=Number.isFinite(save.schemaVersion)?save.schemaVersion:2;
  save.schemaVersion=CURRENT_SCHEMA;
  save.gameVersion=GAME_VERSION;
  save.createdAt=finiteOr(save.createdAt,Date.now());
  save.updatedAt=finiteOr(save.updatedAt,save.createdAt);
  save.worldMinutes=finiteOr(save.worldMinutes,360);
  save.playerHp=Math.max(0,Math.min(10,Math.round(finiteOr(save.playerHp,10))));
  save.inventory=asArray(save.inventory);
  save.terrainEdits=asArray(save.terrainEdits);

  let player=finitePlayer(save.player);
  if(!player){
    const legacyX=finiteOr(save.playerWorldX,finiteOr(save.worldX,460));
    const legacyY=finiteOr(save.playerY,0);
    player={
      x:(legacyX-460)/128,
      y:legacyY/128+3,
      z:.45,
      yaw:finiteOr(save.routeOrientation?.sign,1)<0?Math.PI:0
    };
  }else if(sourceVersion<=4){
    // The former 3D runtime used Y as height above a flat ground and Z as horizontal depth.
    // Keep X, map the old height into a safe spawn height, and collapse gameplay to one Z layer.
    player.y=Math.max(3,finiteOr(player.y,3));
    player.z=.45;
    player.yaw=Math.abs(player.yaw)>Math.PI*.5?Math.PI:0;
  }
  save.player=player;

  save.mapState=save.mapState&&typeof save.mapState==='object'?save.mapState:{};
  save.mapState.visitedNodes=asArray(save.mapState.visitedNodes,['village']);
  save.mapState.visitedRoutes=asArray(save.mapState.visitedRoutes,[0]);
  save.mapState.broken=asArray(save.mapState.broken);
  save.mapState.collected=asArray(save.mapState.collected);
  save.mapState.exitReached=!!save.mapState.exitReached;

  delete save.worldX;
  delete save.playerWorldX;
  delete save.playerWorldZ;
  delete save.playerY;
  delete save.actorRatio;
  delete save.routeOrientation;
  if(sourceVersion<CURRENT_SCHEMA)save.migratedFromSchema=sourceVersion;
  return save;
}

function migrate(input){
  if(!input||typeof input!=='object')throw new Error('Save payload must be an object');
  const version=Number.isFinite(input.schemaVersion)?input.schemaVersion:2;
  if(version>CURRENT_SCHEMA)throw new Error('Save schema '+version+' is newer than runtime '+CURRENT_SCHEMA);
  return migrateToV5(input);
}
function validate(save,{account=null}={}){
  const errors=[];
  if(!save||typeof save!=='object')errors.push('save must be an object');
  else{
    if(save.schemaVersion!==CURRENT_SCHEMA)errors.push('schemaVersion must be '+CURRENT_SCHEMA);
    if(account!==null&&save.account!==account)errors.push('account/profile id mismatch');
    if(!Number.isFinite(save.createdAt))errors.push('createdAt must be finite');
    if(!save.player||![save.player.x,save.player.y,save.player.z,save.player.yaw].every(Number.isFinite))errors.push('player paper-stage transform missing');
    if(!Array.isArray(save.inventory))errors.push('inventory must be an array');
    if(!Array.isArray(save.terrainEdits))errors.push('terrainEdits must be an array');
  }
  return {ok:errors.length===0,errors};
}
function parse(raw){if(typeof raw!=='string'||!raw)return null;try{return JSON.parse(raw)}catch{return null}}
function read({key,backupKey=key+'.backup',account=null,storage}){
  if(!storage?.get)throw new Error('save storage adapter requires get');
  const primary=parse(storage.get(key)),backup=parse(storage.get(backupKey));
  for(const [source,candidate] of [['primary',primary],['backup',backup]]){
    if(!candidate)continue;
    try{
      const save=migrate(candidate),check=validate(save,{account});
      if(check.ok)return {save,source,migrated:candidate.schemaVersion!==CURRENT_SCHEMA};
    }catch{}
  }
  return {save:null,source:'none',migrated:false};
}
function write({key,backupKey=key+'.backup',save,account=null,storage}){
  if(!storage?.get||!storage?.set)throw new Error('save storage adapter requires get/set');
  const migrated=migrate(save);
  migrated.schemaVersion=CURRENT_SCHEMA;migrated.gameVersion=GAME_VERSION;migrated.updatedAt=Date.now();
  if(account!==null)migrated.account=account;
  const check=validate(migrated,{account});
  if(!check.ok)throw new Error('Refusing invalid save: '+check.errors.join('; '));
  const previous=storage.get(key);
  if(previous){
    const parsed=parse(previous);
    if(parsed){try{const prior=migrate(parsed);if(validate(prior,{account}).ok)storage.set(backupKey,JSON.stringify(prior))}catch{}}
  }
  storage.set(key,JSON.stringify(migrated));
  return migrated;
}

global.PaperchalkSaveRuntime=Object.freeze({
  schemaVersion:CURRENT_SCHEMA,
  gameVersion:GAME_VERSION,
  migrate,validate,read,write
});
})(window);
