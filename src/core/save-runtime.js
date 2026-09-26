/* Versioned save codec with migration, validation and last-known-good backup. */
(function(global){
'use strict';

const CURRENT_SCHEMA=3;
const GAME_VERSION='0.1.0-preprod';

function cloneJson(value){return JSON.parse(JSON.stringify(value))}
function finiteOr(value,fallback){return Number.isFinite(value)?value:fallback}
function asArray(value,fallback=[]){return Array.isArray(value)?value:fallback}

function migrateToV3(input){
  const save=input&&typeof input==='object'?cloneJson(input):{};
  save.schemaVersion=3;
  save.gameVersion=typeof save.gameVersion==='string'?save.gameVersion:GAME_VERSION;
  save.createdAt=finiteOr(save.createdAt,Date.now());
  save.updatedAt=finiteOr(save.updatedAt,save.createdAt);
  save.worldMinutes=finiteOr(save.worldMinutes,0);
  save.worldX=finiteOr(save.worldX,0);
  save.playerY=finiteOr(save.playerY,0);
  save.actorRatio=finiteOr(save.actorRatio,.35);
  save.mapState=save.mapState&&typeof save.mapState==='object'?save.mapState:{};
  save.mapState.broken=asArray(save.mapState.broken);
  save.mapState.collected=asArray(save.mapState.collected);
  save.mapState.visitedRoutes=asArray(save.mapState.visitedRoutes,[0]);
  save.mapState.visitedNodes=asArray(save.mapState.visitedNodes,['village']);
  save.mapState.exitReached=!!save.mapState.exitReached;
  save.inventory=asArray(save.inventory);
  return save;
}

function migrate(input){
  if(!input||typeof input!=='object')throw new Error('Save payload must be an object');
  const version=Number.isFinite(input.schemaVersion)?input.schemaVersion:2;
  if(version>CURRENT_SCHEMA)throw new Error('Save schema '+version+' is newer than runtime '+CURRENT_SCHEMA);
  if(version<=2)return migrateToV3(input);
  return migrateToV3(input);
}

function validate(save,{account=null}={}){
  const errors=[];
  if(!save||typeof save!=='object')errors.push('save must be an object');
  else{
    if(save.schemaVersion!==CURRENT_SCHEMA)errors.push('schemaVersion must be '+CURRENT_SCHEMA);
    if(account!==null&&save.account!==account)errors.push('account/profile id mismatch');
    if(!Number.isFinite(save.createdAt))errors.push('createdAt must be finite');
    if(!save.mapState||typeof save.mapState!=='object')errors.push('mapState missing');
    if(!Array.isArray(save.inventory))errors.push('inventory must be an array');
  }
  return {ok:errors.length===0,errors};
}

function parse(raw){
  if(typeof raw!=='string'||!raw)return null;
  try{return JSON.parse(raw)}catch{return null}
}

function read({key,backupKey=key+'.backup',account=null,storage}){
  if(!storage?.get)throw new Error('save storage adapter requires get');
  const primary=parse(storage.get(key));
  const backup=parse(storage.get(backupKey));
  for(const [source,candidate] of [['primary',primary],['backup',backup]]){
    if(!candidate)continue;
    try{
      const save=migrate(candidate);
      const check=validate(save,{account});
      if(check.ok)return {save,source,migrated:candidate.schemaVersion!==CURRENT_SCHEMA};
    }catch{}
  }
  return {save:null,source:'none',migrated:false};
}

function write({key,backupKey=key+'.backup',save,account=null,storage}){
  if(!storage?.get||!storage?.set)throw new Error('save storage adapter requires get/set');
  const migrated=migrate(save);
  migrated.schemaVersion=CURRENT_SCHEMA;
  migrated.gameVersion=GAME_VERSION;
  migrated.updatedAt=Date.now();
  if(account!==null)migrated.account=account;
  const check=validate(migrated,{account});
  if(!check.ok)throw new Error('Refusing invalid save: '+check.errors.join('; '));

  const previous=storage.get(key);
  if(previous){
    const parsed=parse(previous);
    if(parsed){
      try{
        const prior=migrate(parsed);
        if(validate(prior,{account}).ok)storage.set(backupKey,JSON.stringify(prior));
      }catch{}
    }
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
