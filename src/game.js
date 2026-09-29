/* Paperchalk World gameplay runtime.
* Gameplay is Terraria-style 2D (X/Y) on one voxel layer.
* Three.js provides the 3D paper-stage depth; Z is presentation-only.
*/
(function(){
'use strict';
const CONTENT=window.PaperchalkContent;
if(!CONTENT)throw new Error('Paperchalk authored content failed to load');
const SAVE_RUNTIME=window.PaperchalkSaveRuntime;
if(!SAVE_RUNTIME)throw new Error('PaperchalkSaveRuntime missing');
const ECS=window.PaperchalkECS;
if(!ECS)throw new Error('PaperchalkECS missing');
const TerrainRuntime=window.PaperchalkTerrainRuntime;
if(!TerrainRuntime)throw new Error('PaperchalkTerrainRuntime missing');
const byId=id=>{
const node=document.getElementById(id);
if(!node)throw new Error('MISSING_UI_'+id);
return node;
};
const worldEl=byId('world');
const uiShell=byId('uiShell');
const paperClock=byId('paperClock');
const mapNotice=byId('mapNotice');
const hungerFill=byId('hungerFill');
const hungerValue=byId('hungerValue');
const staminaFill=byId('staminaFill');
const staminaValue=byId('staminaValue');
const profileNote=byId('profileNote');
const continueBtn=byId('continueBtn');
const enterBtn=byId('enterBtn');
const authBtn=byId('authBtn');
const settingsBtn=byId('settingsBtn');
const authMsg=byId('authMsg');
const settingsStatus=byId('settingsStatus');
const settingLanguage=byId('settingLanguage');
const settingTimeScale=byId('settingTimeScale');
const settingLandscape=byId('settingLandscape');
const backpackBtn=byId('backpackBtn');
const backpackOverlay=byId('backpackOverlay');
const backpackClose=byId('backpackClose');
const backpackSlots=byId('backpackSlots');
const inventoryPreviewImage=byId('inventoryPreviewImage');
const inventoryItemName=byId('inventoryItemName');
const inventoryItemDesc=byId('inventoryItemDesc');
const inventoryItemWeight=byId('inventoryItemWeight');
const inventoryItemCount=byId('inventoryItemCount');
const inventoryUse=byId('inventoryUse');
const inventoryDrop=byId('inventoryDrop');
const quickbar=byId('quickbar');
const quickSlots=[...quickbar.querySelectorAll('[data-quick-slot]')];
const worldMapBtn=byId('worldMapBtn');
const worldMapOverlay=byId('worldMapOverlay');
const worldMapClose=byId('worldMapClose');
const worldMapCanvas=byId('worldMapCanvas');
const worldMapZoomIn=byId('worldMapZoomIn');
const worldMapZoomOut=byId('worldMapZoomOut');
const worldMapFit=byId('worldMapFit');
const worldMapLocate=byId('worldMapLocate');
const worldMapZoomLabel=byId('worldMapZoomLabel');
const worldMapLocation=byId('worldMapLocation');
const cameraControlBtn=byId('cameraControlBtn');
const cameraControlPanel=byId('cameraControlPanel');
const cameraControlClose=byId('cameraControlClose');
const cameraPitch=byId('cameraPitch');
const cameraPitchValue=byId('cameraPitchValue');
const cameraDistance=byId('cameraDistance');
const cameraDistanceValue=byId('cameraDistanceValue');
const cameraHeight=byId('cameraHeight');
const cameraHeightValue=byId('cameraHeightValue');
const cameraReset=byId('cameraReset');
const debugToggleBtn=byId('debugToggleBtn');
const debugPanel=byId('debugPanel');
const debugCloseBtn=byId('debugCloseBtn');
const debugStatus=byId('debugStatus');
const debugCommandForm=byId('debugCommandForm');
const debugCommandInput=byId('debugCommandInput');
const debugOutput=byId('debugOutput');
const terrainDigBtn=byId('terrainDigBtn');
const terrainPlaceBtn=byId('terrainPlaceBtn');
const jumpBtn=byId('jumpBtn');
const crouchBtn=byId('crouchBtn');
const attackBtn=byId('attackBtn');
const joystickZone=byId('joystickZone');
const joystick=byId('joystick');
const joystickKnob=joystick.querySelector('.joystick-knob');
const pages={
menu:byId('pageMenu'),
auth:byId('pageAuth'),
settings:byId('pageSettings')
};
const PLAYER_MAX_HP=10;
const HUNGER_MAX=100;
const HUNGER_DRAIN_PER_SECOND=.055;
const HUNGER_ZERO_DAMAGE_INTERVAL=6;
const STAMINA_MAX=100;
const INVENTORY_CAPACITY=20;
const FIXED_DT=1/60;
const MAX_FRAME_DT=.06;
const GRAVITY=22;
const JUMP_SPEED=7.4;
const PLAYER_SPEED=4.6;
const PLAYER_HALF_W=.34;
const PLAYER_HALF_H=.95;
const PLAYER_HALF_D=.28;
const TERRAIN_REACH=4.5;
const KEY_USERS='paperchalk.localUsers.v1';
const KEY_SESSION='paperchalk.session.v1';
const KEY_SAVE_PREFIX='paperchalk.save.v6.';
const LEGACY_SAVE_PREFIXES=['paperchalk.save.v5.','paperchalk.save.v4.','paperchalk.save.v3.','paperchalk.save.v2.'];
const LEGACY_SINGLE_SAVE='paperchalk.save.v1';
const KEY_SETTINGS='paperchalk.settings.v2';
const sceneData=CONTENT.scene3d;
const INTERACTION_ROW_Z=Number(sceneData.terrain?.interactionRowZ??0);
const PLAYER_ROW_CENTER_Z=INTERACTION_ROW_Z*(sceneData.terrain?.tileSize??1);
const bounds=sceneData.bounds;
const terrain=new TerrainRuntime.TerrainWorld({
tileSize:sceneData.terrain?.tileSize??1,
pixelsPerMeter:sceneData.terrain?.pixelsPerMeter??128,
chunkSize:sceneData.terrain?.chunkSize??16,
seed:sceneData.terrain?.seed??24681357,
interactionRowZ:INTERACTION_ROW_Z,
blackBackRowZ:sceneData.terrain?.blackBackRowZ??(INTERACTION_ROW_Z-1),
biomeConfig:sceneData.terrain?.biome||null
});
window.PaperchalkTerrain=terrain;
window.PaperchalkBiomes=Object.freeze({
sampleCell(gx,gz=0){return terrain.terrainProfile(gx,gz)},
sampleWorld(x,z=0){return terrain.sampleAtWorld(x,z)},
biomeAt(gx,gz=0){return terrain.biomeAt(gx,gz)},
landformAt(gx,gz=0){return terrain.landformAt(gx,gz)},
chunkSummary(cx,cz){return terrain.biomeSummaryForChunk(cx,cz)},
get stats(){return terrain.biomeGenerator?.stats?.()||null}
});
const memoryStore={};
function storageGet(key){
try{return localStorage.getItem(key)}catch{return memoryStore[key]??null}
}
function storageSet(key,value){
try{localStorage.setItem(key,String(value));return true}
catch{memoryStore[key]=String(value);return false}
}
function storageRemove(key){
try{localStorage.removeItem(key)}catch{delete memoryStore[key]}
}
const SAVE_STORAGE={get:storageGet,set:storageSet,remove:storageRemove};
function getUsers(){
try{return JSON.parse(storageGet(KEY_USERS)||'{}')}catch{return{}}
}
function getSession(){
try{return JSON.parse(storageGet(KEY_SESSION)||'null')}catch{return null}
}
function setSession(session){return storageSet(KEY_SESSION,JSON.stringify(session))}
function accountSaveKey(account,prefix=KEY_SAVE_PREFIX){
return prefix+encodeURIComponent(String(account||''));
}
const defaultCamera=Object.freeze({
yaw:.72,pitch:.38,distance:12,height:.65,fov:42,
stageView:Object.freeze({enabled:false,axis:'z',side:1})
});
function getSettings(){
const defaults={language:'zh-CN',timeScale:1,preferLandscape:true,camera3d:{...defaultCamera}};
try{
const parsed=JSON.parse(storageGet(KEY_SETTINGS)||'{}');
const parsedCamera=parsed.camera3d||{};
const camera3d={
...defaultCamera,
...parsedCamera,
fov:42,
stageView:{...defaultCamera.stageView,...(parsedCamera.stageView||{})}
};
return {...defaults,...parsed,camera3d};
}catch{return defaults}
}
function writeSettings(settings){
storageSet(KEY_SETTINGS,JSON.stringify(settings));
return settings;
}
let settings=getSettings();
window.PaperchalkSettings=Object.freeze({
get(){return JSON.parse(JSON.stringify(settings))},
setCamera3D(config){
const stageView=config?.stageView
?{...settings.camera3d.stageView,...config.stageView}
:settings.camera3d.stageView;
settings={...settings,camera3d:{...settings.camera3d,...config,stageView}};
writeSettings(settings);
syncCameraPanel();
return {...settings.camera3d,stageView:{...settings.camera3d.stageView}};
}
});
function applySettings(){
const n=Number(settings.timeScale);
worldTimeScale=Number.isFinite(n)?Math.max(0,Math.min(20,n)):1;
document.documentElement.lang='zh-CN';
document.body.classList.toggle('prefer-landscape',settings.preferLandscape!==false);
settingLanguage.value='zh-CN';
settingTimeScale.value=String(worldTimeScale);
settingLandscape.checked=settings.preferLandscape!==false;
syncCameraPanel();
window.Paperchalk3D?.setCameraConfig?.(settings.camera3d);
}
function saveSettingsFromUI(){
settings={
...settings,
language:'zh-CN',
timeScale:Number(settingTimeScale.value)||0,
preferLandscape:settingLandscape.checked
};
writeSettings(settings);
applySettings();
settingsStatus.textContent='设置已保存';
clearTimeout(saveSettingsFromUI._timer);
saveSettingsFromUI._timer=setTimeout(()=>{settingsStatus.textContent=''},1200);
}
function hashText(text){
let h1=0x811c9dc5,h2=0x9e3779b9;
const t='paperchalk-local-v1|'+String(text);
for(let i=0;i<t.length;i++){
const c=t.charCodeAt(i);
h1^=c;h1=Math.imul(h1,0x01000193);
h2^=(c+i);h2=Math.imul(h2,0x85ebca6b);
}
return (h1>>>0).toString(16).padStart(8,'0')+(h2>>>0).toString(16).padStart(8,'0');
}
const ecs=ECS.createWorld();
const transform={x:sceneData.spawn.x,y:sceneData.spawn.y,z:sceneData.spawn.z,yaw:sceneData.spawn.yaw};
const velocity={x:0,y:0,z:0};
const health={current:PLAYER_MAX_HP,max:PLAYER_MAX_HP};
const hunger={current:HUNGER_MAX,max:HUNGER_MAX,zeroDamageTimer:0};
const stamina={current:STAMINA_MAX,max:STAMINA_MAX};
const controller={
grounded:true,crouching:false,attacking:false,attackTimer:0,attackCooldown:0,
action:'idle',moving:false,torchOn:false,inWater:false,submerged:0,facingX:1
};
const playerEntity=ecs.create({
Transform:transform,
Velocity:velocity,
Health:health,
Player:controller
});
function hungerSnapshot(){return {current:hunger.current,max:hunger.max,ratio:hunger.current/hunger.max}}
function staminaSnapshot(){return {current:stamina.current,max:stamina.max,ratio:stamina.current/stamina.max}}
let lastHungerHud=-1,lastStaminaHud=-1;
function updateSurvivalHud(){
const ratio=Math.max(0,Math.min(1,hunger.current/hunger.max));
const quantized=Math.round(ratio*200)/200;
if(Math.abs(quantized-lastHungerHud)>.0001){
lastHungerHud=quantized;
if(hungerFill)hungerFill.style.transform='scaleX('+quantized.toFixed(3)+')';
if(hungerValue)hungerValue.textContent=String(Math.round(hunger.current));
}
const staminaRatio=Math.max(0,Math.min(1,stamina.current/stamina.max)),sq=Math.round(staminaRatio*200)/200;
if(Math.abs(sq-lastStaminaHud)>.0001){
lastStaminaHud=sq;
if(staminaFill)staminaFill.style.transform='scaleX('+sq.toFixed(3)+')';
if(staminaValue)staminaValue.textContent=String(Math.round(stamina.current));
}
}
const buildingColliders=[];
let active=false;
let worldMinutes=360;
let worldTimeScale=1;
let runtimeVersion=0;
let frameHandle=0;
let lastNow=0;
let accumulator=0;
let saveAccumulator=0;
let waterStepAccumulator=0;
let runtimePublishAccumulator=0;
let lastClockText='';
let terrainStatsCache=null;
let terrainStatsCacheAt=0;
let cameraYaw=settings.camera3d.yaw;
let keyboardCrouch=false;
let mobileCrouch=false;
const keys=new Set();
let joystickPointer=null;
let joystickAxisX=0;
let joystickAxisY=0;
let noticeTimer=0;
let debugColliders=false;
const runtimeListeners=new Set();
function worldPhase(){
const m=((worldMinutes%1440)+1440)%1440;
if(m<300)return 'night';
if(m<480)return 'dawn';
if(m<1020)return 'day';
if(m<1200)return 'dusk';
return 'night';
}
function formatClock(){
const m=Math.floor(((worldMinutes%1440)+1440)%1440);
return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
}
function playerSnapshot(){
return {
x:transform.x,y:transform.y,z:transform.z,yaw:transform.yaw,
vx:velocity.x,vy:velocity.y,vz:velocity.z,
grounded:controller.grounded,crouching:controller.crouching,
attacking:controller.attacking,action:controller.action,torchOn:controller.torchOn,
inWater:controller.inWater,submerged:controller.submerged,facingX:controller.facingX
};
}
function terrainStatsSnapshot(force=false){
const now=performance.now();
if(force||!terrainStatsCache||now-terrainStatsCacheAt>=500){
terrainStatsCache=terrain.stats();terrainStatsCacheAt=now;
}
return terrainStatsCache;
}
function buildSnapshot(){
const environment=terrain.sampleAtWorld(transform.x,transform.z);
return {
version:runtimeVersion,
active,
player:playerSnapshot(),
health:{current:health.current,max:health.max},
hunger:hungerSnapshot(),
stamina:staminaSnapshot(),
world:{minutes:worldMinutes,clock:formatClock(),phase:worldPhase(),biome:environment.biome,landform:environment.landform,elevation:environment.height},
scene:{id:'infinite-voxel-world',name:'Paperchalk · 无限3D体素世界'},
terrain:terrainStatsSnapshot(),
debug:{colliders:debugColliders},
ecs:ecs.stats()
};
}
function publish(){
runtimeVersion++;
const snap=buildSnapshot();
for(const listener of [...runtimeListeners])listener(snap);
return snap;
}
window.PaperchalkRuntime=Object.freeze({
version:7,
getSnapshot:buildSnapshot,
subscribe(listener){
if(typeof listener!=='function')throw new TypeError('runtime listener must be a function');
runtimeListeners.add(listener);
listener(buildSnapshot());
return ()=>runtimeListeners.delete(listener);
}
});
function showMapNotice(message,duration=1400){
mapNotice.textContent=String(message||'');
mapNotice.classList.add('is-show');
clearTimeout(noticeTimer);
noticeTimer=setTimeout(()=>mapNotice.classList.remove('is-show'),duration);
}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function collidesAt(x,y,z){
return terrain.collidesAABB(x,y,z,PLAYER_HALF_W,PLAYER_HALF_H,PLAYER_HALF_D);
}
function groundProbe(x=transform.x,y=transform.y,z=transform.z){
return terrain.collidesAABB(x,y-.035,z,PLAYER_HALF_W*.92,PLAYER_HALF_H,PLAYER_HALF_D*.92);
}
function snapDownToGround(maxDrop=1.05){
if(groundProbe()){controller.grounded=true;return true}
const startY=transform.y,step=.055;
let firstCollision=-1;
for(let d=step;d<=maxDrop+1e-6;d+=step){
if(collidesAt(transform.x,startY-d,transform.z)){firstCollision=d;break}
}
if(firstCollision<0)return false;
let safe=Math.max(0,firstCollision-step),hit=firstCollision;
for(let i=0;i<7;i++){
const mid=(safe+hit)*.5;
if(collidesAt(transform.x,startY-mid,transform.z))hit=mid;else safe=mid;
}
transform.y=startY-safe;
velocity.y=0;controller.grounded=true;
return true;
}
function moveAxis(axis,delta){
if(!delta)return;
const next={x:transform.x,y:transform.y,z:transform.z};
next[axis]+=delta;
if(!collidesAt(next.x,next.y,next.z)){transform[axis]=next[axis];return}
const sign=Math.sign(delta),step=sign*Math.min(Math.abs(delta),terrain.tileSize*.18);
let remaining=Math.abs(delta);
while(remaining>1e-4){
const d=sign*Math.min(Math.abs(step),remaining);
next.x=transform.x;next.y=transform.y;next.z=transform.z;next[axis]+=d;
if(collidesAt(next.x,next.y,next.z))break;
transform[axis]+=d;remaining-=Math.abs(d);
}
velocity[axis]=0;
}
function moveVertical(dy){
if(!dy)return;
const before=transform.y;moveAxis('y',dy);
if(Math.abs(transform.y-before-dy)>.0001){
if(dy<0)controller.grounded=true;
velocity.y=0;
}else if(dy!==0)controller.grounded=false;
}
function rawMoveInput(){
let horizontal=0;
if(keys.has('KeyA')||keys.has('ArrowLeft'))horizontal-=1;
if(keys.has('KeyD')||keys.has('ArrowRight'))horizontal+=1;
horizontal+=joystickAxisX;
horizontal=Math.max(-1,Math.min(1,horizontal));
return {horizontal,magnitude:Math.abs(horizontal)};
}
function overlayOpen(){
return backpackOverlay.classList.contains('is-open')||
worldMapOverlay.classList.contains('is-open')||
debugPanel.classList.contains('is-open')||
cameraControlPanel.classList.contains('is-open');
}
function worldInteractive(){
return active&&uiShell.classList.contains('is-hidden')&&!overlayOpen();
}
function playerSubmersion(){
return terrain.water?.submersionAABB?.(
transform.x,transform.y,transform.z,
PLAYER_HALF_W,PLAYER_HALF_H,PLAYER_HALF_D
)||0;
}
function playerWaterContact(){
const b=terrain.water?.boundsAtWorld?.(transform.x,transform.z);
if(!b)return null;
const bottom=transform.y-PLAYER_HALF_H,top=transform.y+PLAYER_HALF_H;
if(b.top<=bottom+.015||b.bottom>=top-.015)return null;
return {bounds:b,depthInside:Math.max(0,Math.min(top,b.top)-Math.max(bottom,b.bottom))};
}
ecs.registerSystem('player-movement',{
require:['Transform','Velocity','Player'],phase:'fixed',priority:10,
update(entity,world,dt,context){
if(entity!==playerEntity)return;
const input=context.interactive?rawMoveInput():{horizontal:0,magnitude:0};
const submerged=playerSubmersion();
controller.submerged=submerged;controller.inWater=submerged>.06;
const swimFactor=controller.inWater ? .58 : 1;
const speed=PLAYER_SPEED*(controller.crouching?.48:1)*swimFactor;
velocity.x=input.horizontal*speed;
if(Math.abs(input.horizontal)>.12)controller.facingX=input.horizontal>0?1:-1;
velocity.z=0;
transform.z=PLAYER_ROW_CENTER_Z;
controller.moving=input.magnitude>.05;
if(controller.moving)transform.yaw=velocity.x<0?Math.PI:0;
const wasGrounded=controller.grounded;
moveAxis('x',velocity.x*dt);
if(wasGrounded&&!controller.inWater&&!groundProbe())snapDownToGround(1.05);
}
});
ecs.registerSystem('player-gravity',{
require:['Transform','Velocity','Player'],phase:'fixed',priority:20,
update(entity,world,dt){
if(entity!==playerEntity)return;
const submerged=playerSubmersion();
controller.submerged=submerged;controller.inWater=submerged>.06;
if(!groundProbe())controller.grounded=false;
if(controller.inWater){
const buoyancy=GRAVITY*1.18*submerged;
const gravity=GRAVITY*(1-submerged*.82);
velocity.y+=(buoyancy-gravity)*dt;
const drag=Math.exp(-3.4*submerged*dt);
velocity.y*=drag;
velocity.x*=Math.exp(-1.8*submerged*dt);
velocity.y=Math.max(-3.2,Math.min(4.8,velocity.y));
controller.grounded=false;
}else if(!controller.grounded){velocity.y-=GRAVITY*dt;
}
moveVertical(velocity.y*dt);
}
});
ecs.registerSystem('player-action',{
require:['Player','Velocity'],phase:'fixed',priority:30,
update(entity,world,dt){
if(entity!==playerEntity)return;
controller.attackCooldown=Math.max(0,controller.attackCooldown-dt);
if(controller.attackTimer>0){
controller.attackTimer=Math.max(0,controller.attackTimer-dt);
controller.attacking=controller.attackTimer>0;
}else controller.attacking=false;
if(controller.attacking)controller.action='attack';
else if(controller.inWater)controller.action=controller.moving||Math.abs(velocity.y)>.15?'swim':'float';
else if(!controller.grounded)controller.action=velocity.y>=0?'jump-up':'jump-down';
else if(controller.crouching)controller.action='crouch';
else if(controller.moving)controller.action='walk';
else controller.action='idle';
}
});
function jump(){
if(!worldInteractive())return false;
const submerged=playerSubmersion();
const waterContact=playerWaterContact();
const canJump=controller.grounded||waterContact||submerged>.015;
if(!canJump)return false;
const jumpCost=(waterContact||submerged>.015)?4:8;
if(stamina.current<jumpCost){showMapNotice('体力不足',500);return false}
stamina.current=Math.max(0,stamina.current-jumpCost);
if(controller.grounded){
controller.grounded=false;
velocity.y=JUMP_SPEED*(((waterContact?.depthInside||0)>.25)?0.90:1);
window.PaperchalkEvents?.emit('player:jump',{x:transform.x,y:transform.y,z:transform.z,inWater:!!waterContact});
publish();
return true;
}
if(waterContact||submerged>.015){
controller.inWater=true;controller.submerged=Math.max(submerged,.08);controller.grounded=false;
velocity.y=Math.max(velocity.y,4.6+Math.min(1,submerged)*1.8);
window.PaperchalkEvents?.emit('player:swim-stroke',{x:transform.x,y:transform.y,z:transform.z,submerged:controller.submerged});
publish();
return true;
}
return false;
}
function attack(){
if(!worldInteractive())return false;
if(controller.attackCooldown>0)return false;
if(stamina.current<10){showMapNotice('体力不足',500);return false}
stamina.current=Math.max(0,stamina.current-10);
controller.attacking=true;
controller.attackTimer=.28;
controller.attackCooldown=.42;
window.PaperchalkEvents?.emit('player:attack',{x:transform.x,y:transform.y,z:transform.z,yaw:transform.yaw});
publish();
return true;
}
function setCrouch(enabled){
controller.crouching=!!enabled;
publish();
return controller.crouching;
}
function clampHp(value){
const n=Number(value);
return Math.max(0,Math.min(PLAYER_MAX_HP,Math.round(Number.isFinite(n)?n:PLAYER_MAX_HP)));
}
function setPlayerHp(value,{persist=true,animate=true}={}){
const previous=health.current;
health.current=clampHp(value);
if(health.current!==previous){
window.PaperchalkEvents?.emit('player:health-changed',{
previous,current:health.current,delta:health.current-previous,max:health.max,animate
});
publish();
if(persist)saveWorldState();
}
return health.current;
}
function damagePlayer(amount=1){return setPlayerHp(health.current-Math.max(0,Number(amount)||0))}
function healPlayer(amount=1){return setPlayerHp(health.current+Math.max(0,Number(amount)||0))}
function clampHunger(value){
const n=Number(value);
return Math.max(0,Math.min(HUNGER_MAX,Number.isFinite(n)?n:HUNGER_MAX));
}
function setHunger(value,{persist=true,notice=false}={}){
const previous=hunger.current;
hunger.current=clampHunger(value);
if(notice&&Math.abs(hunger.current-previous)>.01)showMapNotice('饥饿值 '+Math.round(hunger.current)+' / '+HUNGER_MAX,700);
updateSurvivalHud();publish();
if(persist)saveWorldState();
return hunger.current;
}
function feedPlayer(amount=1,options){return setHunger(hunger.current+Math.max(0,Number(amount)||0),options)}
window.PaperchalkHunger=Object.freeze({
max:HUNGER_MAX,get state(){return hungerSnapshot()},set:setHunger,feed:feedPlayer
});
window.PaperchalkStamina=Object.freeze({
max:STAMINA_MAX,get state(){return staminaSnapshot()}
});
window.PaperchalkHealth=Object.freeze({
maxHp:PLAYER_MAX_HP,
get state(){return {hp:health.current,maxHp:health.max}},
set(value,options){return setPlayerHp(value,options)},
damage:damagePlayer,
heal:healPlayer
});
window.PaperchalkCombat=Object.freeze({
get player(){return playerSnapshot()},
jump,attack,setCrouch,toggleTorch,
damagePlayer,healPlayer,setPlayerHp
});
function safeSpawnY(x=sceneData.spawn.x,z=sceneData.spawn.z||0){
return terrain.highestGroundY(x,z)+PLAYER_HALF_H+.03;
}
function teleport(x,z=PLAYER_ROW_CENTER_Z,y=null,{notice=''}={}){
const nx=Number.isFinite(Number(x))?Number(x):sceneData.spawn.x;
const nz=PLAYER_ROW_CENTER_Z;
let ny=Number.isFinite(Number(y))?Number(y):safeSpawnY(nx,nz);
if(collidesAt(nx,ny,nz))ny=safeSpawnY(nx,nz);
transform.x=nx;transform.y=ny;transform.z=nz;
velocity.x=velocity.y=velocity.z=0;controller.grounded=groundProbe(nx,ny,nz);
if(notice)showMapNotice(notice);publish();return true;
}
window.PaperchalkMap=Object.freeze({
get player(){return playerSnapshot()},
get scene3d(){return sceneData},
get nodes(){return CONTENT.world.nodes},
get routes(){return CONTENT.world.routes},
teleport,
reset(){return teleport(sceneData.spawn.x,sceneData.spawn.z||0,null,{notice:'已返回出生点'})}
});
window.PaperchalkScene=Object.freeze({get location(){return 'infinite-voxel-world'},get transitioning(){return false}});
function terrainTargetInReach(point){
if(!point)return false;
return Math.hypot(point.x-transform.x,point.y-transform.y,point.z-transform.z)<=TERRAIN_REACH;
}
function isInteractionRow(gz){return Number(gz)===INTERACTION_ROW_Z}
function digTerrainCell(gx,gy,gz,{persist=true}={}){
if(!isInteractionRow(gz))return {changed:false,reason:'interaction-row-only',interactionRowZ:INTERACTION_ROW_Z};
const center=terrain.cellCenter(gx,gy,gz);
if(!terrainTargetInReach(center))return {changed:false,reason:'out-of-reach'};
const result=terrain.digCell(gx,gy,gz);
if(result.changed){
const waterSettle=terrain.water.settleAll();
window.PaperchalkEvents?.emit('terrain:changed',{...result,action:'dig',waterSettle});
publish();if(persist)saveWorldState()
}
return result;
}
function placeTerrainCell(gx,gy,gz,tile=TerrainRuntime.TILE.DIRT,{persist=true}={}){
if(!isInteractionRow(gz))return {changed:false,reason:'interaction-row-only',interactionRowZ:INTERACTION_ROW_Z};
const center=terrain.cellCenter(gx,gy,gz);
if(!terrainTargetInReach(center))return {changed:false,reason:'out-of-reach'};
const half=terrain.tileSize*.49;
const overlapsPlayer=Math.abs(center.x-transform.x)<PLAYER_HALF_W+half&&Math.abs(center.y-transform.y)<PLAYER_HALF_H+half&&Math.abs(center.z-transform.z)<PLAYER_HALF_D+half;
if(overlapsPlayer)return {changed:false,reason:'player-overlap'};const result=terrain.placeCell(gx,gy,gz,tile);
if(result.changed){
const waterSettle=terrain.water.settleAll();
window.PaperchalkEvents?.emit('terrain:changed',{...result,action:'place',waterSettle});
publish();if(persist)saveWorldState()
}
return result;
}
function digTerrainAt(x,y,z=transform.z,options){const c=terrain.worldToCell(x,y,z);return digTerrainCell(c.gx,c.gy,c.gz,options)}
function placeTerrainAt(x,y,z=transform.z,tile=TerrainRuntime.TILE.DIRT,options){const c=terrain.worldToCell(x,y,z);return placeTerrainCell(c.gx,c.gy,c.gz,tile,options)}
function placeWaterCell(gx,gy,gz,{persist=true}={}){
if(!isInteractionRow(gz))return {changed:false,reason:'interaction-row-only',interactionRowZ:INTERACTION_ROW_Z};
const center=terrain.cellCenter(gx,gy,gz);
if(!terrainTargetInReach(center))return {changed:false,reason:'out-of-reach'};
if(terrain.isSolidPeek(gx,gy,gz))return {changed:false,reason:'solid'};
const result=terrain.water.placeFull(gx,gy,gz);
if(result.changed){
const waterSettle=terrain.water.settleAll();
result.waterSettle=waterSettle;
window.PaperchalkEvents?.emit('liquid:changed',{...result,action:'place-water',levels:8,waterSettle});
publish();if(persist)saveWorldState();
}
return result;
}
function placeWaterAt(x,y,z=transform.z,options){const c=terrain.worldToCell(x,y,z);return placeWaterCell(c.gx,c.gy,c.gz,options)}
let terrainToolMode='dig';
function setTerrainTool(mode,{notice=false}={}){
terrainToolMode=mode==='water'?'water':mode==='place'?'place':'dig';
terrainDigBtn.classList.toggle('is-active',terrainToolMode==='dig');
terrainPlaceBtn.classList.toggle('is-active',terrainToolMode==='place'||terrainToolMode==='water');
terrainDigBtn.setAttribute('aria-pressed',String(terrainToolMode==='dig'));
terrainPlaceBtn.setAttribute('aria-pressed',String(terrainToolMode==='place'||terrainToolMode==='water'));
if(notice)showMapNotice(terrainToolMode==='dig'?'挖掘模式':terrainToolMode==='water'?'放水模式：每格 8 层':'放置模式');
renderQuickbar?.();
return terrainToolMode;
}
terrainDigBtn.addEventListener('click',()=>setTerrainTool('dig',{notice:true}));
terrainPlaceBtn.addEventListener('click',()=>setTerrainTool('place',{notice:true}));
window.PaperchalkTerrainActions=Object.freeze({
dig:digTerrainAt,
place:placeTerrainAt,
water:placeWaterAt,
digCell:digTerrainCell,
placeCell:placeTerrainCell,
waterCell:placeWaterCell,
setTool:setTerrainTool,
targetAtScreen(x,y){return window.Paperchalk3D?.screenToTerrainCell?.(x,y,{showCursor:false})||null},
waterTargetAtScreen(x,y){return window.Paperchalk3D?.screenToWaterSurface?.(x,y,{maxDistance:32})||null},
get tool(){return terrainToolMode},
get interactionRowZ(){return INTERACTION_ROW_Z},
get stats(){return {...terrain.stats(),interactionRowZ:INTERACTION_ROW_Z}},
get edits(){return terrain.exportEdits()},
get water(){return terrain.water.exportState()}
});
let terrainPointer=null;
worldEl.addEventListener('contextmenu',event=>{
if(event.target?.closest?.('.three-world-canvas'))event.preventDefault();
});
worldEl.addEventListener('pointerdown',event=>{
if(!event.target?.closest?.('.three-world-canvas'))return;
terrainPointer={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false,pointerType:event.pointerType};
window.Paperchalk3D?.screenToTerrainCell?.(event.clientX,event.clientY,{showCursor:true});
});
worldEl.addEventListener('pointermove',event=>{
if(event.target?.closest?.('.three-world-canvas')){
window.Paperchalk3D?.screenToTerrainCell?.(event.clientX,event.clientY,{showCursor:true});
}
if(!terrainPointer||terrainPointer.id!==event.pointerId)return;
if(Math.hypot(event.clientX-terrainPointer.x,event.clientY-terrainPointer.y)>8)terrainPointer.moved=true;
});
worldEl.addEventListener('pointerleave',()=>window.Paperchalk3D?.hideTerrainCursor?.());
worldEl.addEventListener('pointerup',event=>{
const pointer=terrainPointer;
if(pointer&&pointer.id===event.pointerId)terrainPointer=null;
if(!worldInteractive()||!event.target?.closest?.('.three-world-canvas'))return;
if(pointer?.moved)return;
if(event.button!==0&&event.button!==2)return;
const selectedItem=inventoryItems[inventorySelected]||null;
const target=window.Paperchalk3D?.screenToTerrainCell?.(event.clientX,event.clientY,{showCursor:true});
if(!target)return;
const waterMode=terrainToolMode==='water';
const placing=waterMode||event.button===2||(pointer?.pointerType==='touch'&&terrainToolMode==='place');
const result=waterMode
?placeWaterCell(target.placeGx,target.placeGy,target.placeGz)
:placing
?placeTerrainCell(target.placeGx,target.placeGy,target.placeGz)
:digTerrainCell(target.gx,target.gy,target.gz);
if(result.changed){
showMapNotice(waterMode?'已放下 1 立方米水（8 层）':placing?'已放置方块':'已挖除方块',650);
return;
}
if(result.reason==='out-of-reach')showMapNotice('太远了');
else if(result.reason==='interaction-row-only')showMapNotice('只能交互指定这一排方块');
else if(result.reason==='player-overlap')showMapNotice('不能把方块放在自己身上');
else if(result.reason==='solid')showMapNotice('这里被方块占据');
else if(result.reason==='full')showMapNotice('这里的水已经是 8 层');
else if(placing)showMapNotice('这里已有方块');
else showMapNotice('这里没有可挖方块');
});
worldEl.addEventListener('pointercancel',()=>{terrainPointer=null});
let inventoryItems=Array.from({length:INVENTORY_CAPACITY},()=>null);
let inventorySelected=-1;
function itemClone(item){return item?JSON.parse(JSON.stringify(item)):null}
function inventorySnapshot(){return inventoryItems.map(itemClone)}
function renderQuickbar(){
for(let i=0;i<quickSlots.length;i++){
const button=quickSlots[i],item=inventoryItems[i]||null;
const glyph=button.querySelector('.quick-glyph'),count=button.querySelector('.quick-count');
glyph.textContent=item?.glyph||item?.name?.slice(0,1)||'';
count.textContent=item&&Number(item.count||1)>1?String(item.count):'';
button.classList.toggle('is-selected',inventorySelected===i);
button.classList.toggle('is-active',(item?.action==='toggle-torch'&&controller.torchOn)||(item?.action==='water-tool'&&terrainToolMode==='water'));
button.setAttribute('aria-label',item?('快捷栏 '+(i+1)+'：'+item.name+(item.action==='toggle-torch'?(controller.torchOn?'，已点亮':'，已熄灭'):''))
:('快捷栏 '+(i+1)+'：空'));
}
}
function activateQuickSlot(index){
const i=Math.max(0,Math.min(quickSlots.length-1,Number(index)|0));
const item=inventoryItems[i]||null;
inventorySelected=i;
renderInventory();
if(!item)return false;
if(item.action==='toggle-torch')return toggleTorch();
if(item.action==='water-tool')return setTerrainTool('water',{notice:true});
return useSelectedItem();
}
quickSlots.forEach((button,index)=>button.addEventListener('click',()=>activateQuickSlot(index)));
function setInventoryFromSave(saved){
inventoryItems=Array.from({length:INVENTORY_CAPACITY},(_,i)=>itemClone(Array.isArray(saved)?saved[i]:null));
inventorySelected=-1;
renderInventory();
renderQuickbar();
}
function renderInventory(){
backpackSlots.innerHTML='';
for(let i=0;i<INVENTORY_CAPACITY;i++){
const item=inventoryItems[i];
const button=document.createElement('button');
button.type='button';
button.className='inventory-slot'+(i===inventorySelected?' is-selected':'')+(item?' has-item':'');
button.dataset.slot=String(i);
button.setAttribute('aria-label',item?item.name:'空格');
if(item){
const glyph=document.createElement('span');
glyph.className='inventory-glyph';
glyph.textContent=item.glyph||item.name.slice(0,1);
button.appendChild(glyph);
if((item.count||1)>1){
const count=document.createElement('b');
count.textContent=String(item.count);
button.appendChild(count);
}
}
button.addEventListener('click',()=>{inventorySelected=i;renderInventory()});
backpackSlots.appendChild(button);
}
const selected=inventoryItems[inventorySelected]||null;
inventoryPreviewImage.removeAttribute('src');
inventoryPreviewImage.alt='';
inventoryPreviewImage.classList.toggle('is-empty',!selected);
inventoryItemName.textContent=selected?.name||'未选择物品';
inventoryItemDesc.textContent=selected?.desc||'';
inventoryItemWeight.textContent=selected?Number(selected.weight||0).toFixed(1):'0.0';
inventoryItemCount.textContent=selected?String(selected.count||1):'0';
inventoryUse.disabled=!selected;
inventoryDrop.disabled=!selected;
renderQuickbar();
}
function addInventoryItem(item){
if(!item)return false;
const stack=inventoryItems.find(v=>v&&v.id===item.id);
if(stack){stack.count=(stack.count||1)+(item.count||1);renderInventory();renderQuickbar();saveWorldState();return true}
const slot=inventoryItems.findIndex(v=>!v);
if(slot<0){showMapNotice('背包已满');return false}
inventoryItems[slot]=itemClone(item);
renderInventory();saveWorldState();return true;
}
function decrementInventoryItem(index,count=1){
const item=inventoryItems[index];
if(!item)return false;
item.count=(item.count||1)-count;
if(item.count<=0)inventoryItems[index]=null;
if(!inventoryItems[index])inventorySelected=-1;
return true;
}
function toggleTorch(enabled=!controller.torchOn,{notice=true,persist=true}={}){
controller.torchOn=!!enabled;
window.PaperchalkEvents?.emit('player:torch-changed',{enabled:controller.torchOn});
if(notice)showMapNotice(controller.torchOn?'火把已点亮':'火把已熄灭',700);
renderQuickbar();
publish();
if(persist)saveWorldState();
return controller.torchOn;
}
function useSelectedItem(){
const item=inventoryItems[inventorySelected];
if(!item)return false;
if(item.action==='heal'){
const before=health.current;
const next=clampHp(before+Math.max(1,Number(item.heal)||1));
if(next===before){showMapNotice('生命值已满');return false}
health.current=next;
decrementInventoryItem(inventorySelected,1);
window.PaperchalkEvents?.emit('player:health-changed',{previous:before,current:next,delta:next-before,max:health.max,animate:true});
renderInventory();publish();saveWorldState();
return true;
}
if(item.action==='toggle-torch'){
toggleTorch();
renderInventory();
return true;
}
if(item.action==='water-tool'){
setTerrainTool('water',{notice:true});
renderInventory();
return true;
}
if(item.action==='eat'){
const amount=Math.max(1,Number(item.hunger)||1);
if(hunger.current>=HUNGER_MAX-.01){showMapNotice('现在不饿');return false}
const before=hunger.current;
hunger.current=clampHunger(hunger.current+amount);
decrementInventoryItem(inventorySelected,1);
showMapNotice('吃下 '+item.name+'，饥饿值 +'+Math.round(hunger.current-before),900);
window.PaperchalkEvents?.emit('player:hunger-changed',{previous:before,current:hunger.current,max:HUNGER_MAX});
updateSurvivalHud();renderInventory();publish();saveWorldState();
return true;
}
return false;
}
function dropSelectedItem(){
if(inventorySelected<0)return false;
const ok=decrementInventoryItem(inventorySelected,1);
renderInventory();
if(ok)saveWorldState();
return ok;
}
window.PaperchalkInventory=Object.freeze({
get items(){return inventorySnapshot()},
add:addInventoryItem,
setSlot(index,item){
const i=Math.max(0,Math.min(INVENTORY_CAPACITY-1,Math.floor(Number(index)||0)));
inventoryItems[i]=itemClone(item);renderInventory();renderQuickbar();saveWorldState();return itemClone(inventoryItems[i]);
}
});
function openBackpack(){
if(!active)return;
renderInventory();
backpackOverlay.classList.add('is-open');
backpackOverlay.setAttribute('aria-hidden','false');
backpackClose.focus({preventScroll:true});
}
function closeBackpack(){
backpackOverlay.classList.remove('is-open');
backpackOverlay.setAttribute('aria-hidden','true');
backpackBtn.focus({preventScroll:true});
}
backpackBtn.addEventListener('click',openBackpack);
backpackClose.addEventListener('click',closeBackpack);
inventoryUse.addEventListener('click',useSelectedItem);
inventoryDrop.addEventListener('click',dropSelectedItem);
let worldMapZoom=1;
function drawWorldMap(){
const ctx=worldMapCanvas.getContext('2d');
if(!ctx)return;
const w=worldMapCanvas.width,h=worldMapCanvas.height;
ctx.clearRect(0,0,w,h);
ctx.save();
ctx.fillStyle='#e8ddc5';ctx.fillRect(0,0,w,h);
ctx.translate(w*.08,h*.06);
ctx.scale(worldMapZoom,worldMapZoom);
const nodes=CONTENT.world.nodes;
const routes=CONTENT.world.routes;
const byNode=new Map(nodes.map(n=>[n.id,n]));
ctx.lineWidth=8/worldMapZoom;
ctx.strokeStyle='#7d6955';
for(const route of routes){
const a=byNode.get(route.from),b=byNode.get(route.to);
if(!a||!b)continue;
ctx.beginPath();ctx.moveTo(a.x,a.y*.85);ctx.lineTo(b.x,b.y*.85);ctx.stroke();
}
for(const n of nodes){
ctx.beginPath();ctx.fillStyle=n.id==='village'?'#a74d3f':'#6d705a';
ctx.arc(n.x,n.y*.85,n.id==='village'?18:12,0,Math.PI*2);ctx.fill();
ctx.fillStyle='#352f28';ctx.font='24px sans-serif';ctx.fillText(n.name,n.x+20,n.y*.85+7);
}
ctx.restore();
worldMapZoomLabel.textContent=Math.round(worldMapZoom*100)+'%';
worldMapLocation.textContent='当前位置：A村 3D场景';
}
function openWorldMap(){
if(!active)return;
drawWorldMap();
worldMapOverlay.classList.add('is-open');
worldMapOverlay.setAttribute('aria-hidden','false');
}
function closeWorldMap(){
worldMapOverlay.classList.remove('is-open');
worldMapOverlay.setAttribute('aria-hidden','true');
}
worldMapBtn.addEventListener('click',openWorldMap);
worldMapClose.addEventListener('click',closeWorldMap);
worldMapZoomIn.addEventListener('click',()=>{worldMapZoom=Math.min(1.8,worldMapZoom+.15);drawWorldMap()});
worldMapZoomOut.addEventListener('click',()=>{worldMapZoom=Math.max(.65,worldMapZoom-.15);drawWorldMap()});
worldMapFit.addEventListener('click',()=>{worldMapZoom=1;drawWorldMap()});
worldMapLocate.addEventListener('click',()=>{worldMapZoom=1;drawWorldMap()});
function syncCameraPanel(){
const c=settings.camera3d||defaultCamera;
cameraPitch.value=String((c.pitch*180/Math.PI).toFixed(1));
cameraPitchValue.textContent=Number(cameraPitch.value).toFixed(1)+'°';
cameraDistance.value=String(Number(c.distance).toFixed(1));
cameraDistanceValue.textContent=Number(c.distance).toFixed(1)+' m';
cameraHeight.value=String(Number(c.height??.35).toFixed(1));
cameraHeightValue.textContent=Number(c.height??.35).toFixed(1)+' m';
}
function pushCameraPanel(){
const config={
...settings.camera3d,
pitch:Number(cameraPitch.value)*Math.PI/180,
distance:Number(cameraDistance.value),
height:Number(cameraHeight.value),
fov:42
};
window.PaperchalkSettings.setCamera3D(config);
window.Paperchalk3D?.setCameraConfig?.(config);
}
function openCameraPanel(){
if(!active)return;
syncCameraPanel();
cameraControlPanel.classList.add('is-open');
cameraControlPanel.setAttribute('aria-hidden','false');
cameraControlBtn.setAttribute('aria-expanded','true');
}
function closeCameraPanel(){
cameraControlPanel.classList.remove('is-open');
cameraControlPanel.setAttribute('aria-hidden','true');
cameraControlBtn.setAttribute('aria-expanded','false');
}
cameraControlBtn.addEventListener('click',()=>cameraControlPanel.classList.contains('is-open')?closeCameraPanel():openCameraPanel());
cameraControlClose.addEventListener('click',closeCameraPanel);
cameraPitch.addEventListener('input',pushCameraPanel);
cameraDistance.addEventListener('input',pushCameraPanel);
cameraHeight.addEventListener('input',pushCameraPanel);
cameraReset.addEventListener('click',()=>{
const c=window.Paperchalk3D?.resetCamera?.()||{...defaultCamera};
settings={...settings,camera3d:{...c}};
writeSettings(settings);syncCameraPanel();
});
window.addEventListener('paperchalk-3d-camera-change',event=>{
if(!event.detail)return;
cameraYaw=Number.isFinite(event.detail.yaw)?event.detail.yaw:cameraYaw;
const stageView=event.detail.stageView
?{...settings.camera3d.stageView,...event.detail.stageView}
:settings.camera3d.stageView;
settings={...settings,camera3d:{...settings.camera3d,...event.detail,stageView}};
writeSettings(settings);syncCameraPanel();syncStageDebugButtons();
});
function debugIsOpen(){return debugPanel.classList.contains('is-open')}
function stageViewState(){
const state=window.Paperchalk3D?.stats?.stageView||settings.camera3d.stageView||{enabled:true,axis:'z',side:1};
return {enabled:state.enabled!==false,axis:state.axis==='x'?'x':'z',side:state.side===-1?-1:1};
}
function syncStageDebugButtons(){
const stage=stageViewState();
const stageButton=debugPanel.querySelector('[data-debug-action="stageview"]');
const axisButton=debugPanel.querySelector('[data-debug-action="stageaxis"]');
if(stageButton)stageButton.textContent='纸片舞台视角：'+(stage.enabled?'开':'关');
if(axisButton)axisButton.textContent='舞台观察轴：'+stage.axis.toUpperCase();
}
function updateDebugStatus(){
const s=window.Paperchalk3D?.stats||{};
const stage=stageViewState();
const ts=terrain.stats();
debugStatus.textContent='HP '+health.current+'/'+health.max+
' · XY '+transform.x.toFixed(1)+', '+transform.y.toFixed(1)+
' · 3D方块 '+(s.terrain?.renderedQuads||0)+' quads / '+ts.loadedChunks+' chunks'+
' · '+terrainToolMode.toUpperCase()+
' · 舞台 '+(stage.enabled?stage.axis.toUpperCase()+'轴':'自由镜头')+
' · '+(s.fps||0)+' FPS · '+(s.drawCalls||0)+' draws';
syncStageDebugButtons();
}
function openDebugPanel(){
debugPanel.classList.add('is-open');
debugPanel.setAttribute('aria-hidden','false');
debugToggleBtn.setAttribute('aria-expanded','true');
updateDebugStatus();
}
function closeDebugPanel(){
debugPanel.classList.remove('is-open');
debugPanel.setAttribute('aria-hidden','true');
debugToggleBtn.setAttribute('aria-expanded','false');
}
function writeDebug(message){debugOutput.textContent=String(message)}
function runDebugCommand(command){
const raw=String(command||'').trim();
if(!raw)return '';
const [cmd,...args]=raw.split(/\s+/);
if(cmd==='help')return 'hp 5 | hp +1 | tp X Z [Y] | dig X Y Z | put X Y Z | tool dig/place | reset | collider | stage on/off | axis x/z | terrain | stats | save';
if(cmd==='hp'){
const token=args[0]||'';
const n=Number(token);
if(!Number.isFinite(n))return '用法：hp 5 / hp +1 / hp -1';
const target=/^[+-]/.test(token)?health.current+n:n;
return 'HP -> '+setPlayerHp(target)+' / '+PLAYER_MAX_HP;
}
if(cmd==='tp'){
const x=Number(args[0]),z=Number(args[1]),y=args[2]===undefined?null:Number(args[2]);
if(!Number.isFinite(x)||!Number.isFinite(z)||(y!==null&&!Number.isFinite(y)))return '用法：tp X Z [Y]';
teleport(x,z,y,{notice:'调试传送'});
return 'XYZ -> '+transform.x.toFixed(1)+', '+transform.y.toFixed(1)+', '+transform.z.toFixed(1);
}
if(cmd==='dig'){
const x=Number(args[0]),y=Number(args[1]),z=Number(args[2]);
if(![x,y,z].every(Number.isFinite))return '用法：dig X Y Z';
const r=digTerrainAt(x,y,z);return r.changed?'已挖除方块':'挖掘失败：'+(r.reason||'AIR');
}
if(cmd==='put'){
const x=Number(args[0]),y=Number(args[1]),z=Number(args[2]);
if(![x,y,z].every(Number.isFinite))return '用法：put X Y Z';
const r=placeTerrainAt(x,y,z);return r.changed?'已放置方块':'放置失败：'+(r.reason||'OCCUPIED');
}
if(cmd==='tool'){
const mode=String(args[0]||'').toLowerCase();
if(mode!=='dig'&&mode!=='place')return '用法：tool dig / tool place';
return '工具 -> '+setTerrainTool(mode);
}
if(cmd==='reset'){window.PaperchalkMap.reset();return '已返回出生点'}
if(cmd==='collider'){
debugColliders=!debugColliders;
window.Paperchalk3D?.setDebugColliders?.(debugColliders);
publish();
return '3D Collider -> '+(debugColliders?'开启':'关闭');
}
if(cmd==='stage'){
const token=String(args[0]||'toggle').toLowerCase();
const current=stageViewState();
const enabled=token==='on'||token==='1'||token==='true'
?true
:token==='off'||token==='0'||token==='false'
?false
:!current.enabled;
const next=window.Paperchalk3D?.setStageView?.(enabled,current.axis)||{...current,enabled};
syncStageDebugButtons();
return '纸片舞台视角 -> '+(next.enabled?'开启':'关闭');
}
if(cmd==='axis'){
const axis=String(args[0]||'').toLowerCase();
if(axis!=='x'&&axis!=='z')return '用法：axis x / axis z';
const next=window.Paperchalk3D?.setStageAxis?.(axis)||{...stageViewState(),axis};
syncStageDebugButtons();
return '舞台观察轴 -> '+next.axis.toUpperCase();
}
if(cmd==='terrain')return JSON.stringify(terrain.stats(),null,2);
if(cmd==='stats')return JSON.stringify(window.Paperchalk3D?.stats||{},null,2);
if(cmd==='save')return saveWorldState()?'存档已写入':'没有活动档案';
return '未知命令：'+cmd;
}
debugToggleBtn.addEventListener('click',()=>debugIsOpen()?closeDebugPanel():openDebugPanel());
debugCloseBtn.addEventListener('click',closeDebugPanel);
debugCommandForm.addEventListener('submit',event=>{
event.preventDefault();
const result=runDebugCommand(debugCommandInput.value);
if(result)writeDebug(result);
updateDebugStatus();
});
debugPanel.querySelectorAll('[data-debug-action]').forEach(button=>{
button.addEventListener('click',()=>{
const a=button.dataset.debugAction;
if(a==='damage1')damagePlayer(1);
else if(a==='heal1')healPlayer(1);
else if(a==='damage3')damagePlayer(3);
else if(a==='zero')setPlayerHp(0);
else if(a==='full')setPlayerHp(PLAYER_MAX_HP);else if(a==='resetpos')window.PaperchalkMap.reset();
else if(a==='colliders'){
debugColliders=!debugColliders;
window.Paperchalk3D?.setDebugColliders?.(debugColliders);
button.textContent='Collider：'+(debugColliders?'开':'关');
}else if(a==='stageview'){
const current=stageViewState();
window.Paperchalk3D?.setStageView?.(!current.enabled,current.axis);
}else if(a==='stageaxis'){
const current=stageViewState();
window.Paperchalk3D?.setStageAxis?.(current.axis==='z'?'x':'z');
}
updateDebugStatus();
});
});
window.PaperchalkDebug=Object.freeze({
perf(){return {runtime:buildSnapshot(),renderer:window.Paperchalk3D?.stats||null}},
command:runDebugCommand
});
function resetJoystick(){
joystickPointer=null;joystickAxisX=0;joystickAxisY=0;
joystick.classList.remove('is-active');
joystickKnob.style.transform='translate3d(0,0,0)';
}
joystickZone.addEventListener('pointerdown',event=>{
if(!worldInteractive())return;
joystickPointer=event.pointerId;
joystick.classList.add('is-active');
try{joystickZone.setPointerCapture(event.pointerId)}catch{}
const rect=joystick.getBoundingClientRect();
updateJoystick(event.clientX-(rect.left+rect.width*.5),event.clientY-(rect.top+rect.height*.5));
});
function updateJoystick(dx,dy){
const limit=42;
const mag=Math.hypot(dx,dy)||1;
const scale=Math.min(1,limit/mag);
const x=dx*scale,y=dy*scale;
joystickAxisX=x/limit;joystickAxisY=y/limit;
joystickKnob.style.transform='translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0)';
}
joystickZone.addEventListener('pointermove',event=>{
if(event.pointerId!==joystickPointer)return;
const rect=joystick.getBoundingClientRect();
updateJoystick(event.clientX-(rect.left+rect.width*.5),event.clientY-(rect.top+rect.height*.5));
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])joystickZone.addEventListener(type,resetJoystick);
jumpBtn.addEventListener('pointerdown',event=>{event.preventDefault();jump()});
attackBtn.addEventListener('pointerdown',event=>{event.preventDefault();attack()});
crouchBtn.addEventListener('pointerdown',event=>{event.preventDefault();mobileCrouch=true;setCrouch(true)});
for(const type of ['pointerup','pointercancel','pointerleave'])crouchBtn.addEventListener(type,()=>{mobileCrouch=false;setCrouch(keyboardCrouch)});
function shouldIgnoreKey(event){
const tag=event.target?.tagName?.toLowerCase();
return tag==='input'||tag==='textarea'||tag==='select'||event.target?.isContentEditable;
}
window.addEventListener('keydown',event=>{
if(shouldIgnoreKey(event))return;
if(event.code==='KeyB'&&active){event.preventDefault();backpackOverlay.classList.contains('is-open')?closeBackpack():openBackpack();return}
if(event.code==='KeyM'&&active){event.preventDefault();worldMapOverlay.classList.contains('is-open')?closeWorldMap():openWorldMap();return}
if(event.code==='Escape'){if(window.PaperchalkHandleBack())event.preventDefault();return}
if(!worldInteractive())return;
if(['KeyA','KeyD','ArrowLeft','ArrowRight'].includes(event.code)){
keys.add(event.code);event.preventDefault();return;
}
if(event.code==='Space'){if(!event.repeat||controller.inWater||!!playerWaterContact())jump();event.preventDefault();return}
if(event.code==='KeyJ'){if(!event.repeat)attack();event.preventDefault();return}
if(event.code==='KeyC'){keyboardCrouch=true;setCrouch(true);event.preventDefault()}
});
window.addEventListener('keyup',event=>{
keys.delete(event.code);
if(event.code==='KeyC'){keyboardCrouch=false;setCrouch(mobileCrouch)}
});
window.addEventListener('blur',()=>{keys.clear();keyboardCrouch=false;resetJoystick();setCrouch(mobileCrouch)});
function fixedUpdate(dt){
const interactive=worldInteractive();
transform.z=PLAYER_ROW_CENTER_Z;
velocity.z=0;
controller.crouching=keyboardCrouch||mobileCrouch;
ecs.runPhase('fixed',dt,{interactive});
if(active){
worldMinutes=(worldMinutes+worldTimeScale*dt)%1440;
const clockText=formatClock();
if(clockText!==lastClockText){lastClockText=clockText;paperClock.textContent=clockText}
waterStepAccumulator+=dt;
if(waterStepAccumulator>=.10){
waterStepAccumulator=0;
if(terrain.water.needsSettle){
const liquidStep=terrain.water.step();
if(liquidStep.changed)window.PaperchalkEvents?.emit('liquid:flow',liquidStep);
}
}
const hungerDrain=HUNGER_DRAIN_PER_SECOND*dt*(controller.moving?1.35:1)*(controller.inWater?1.22:1);
hunger.current=clampHunger(hunger.current-hungerDrain);
const staminaDelta=(controller.inWater&&controller.moving?-5.5:(controller.moving?5.2:9.5))*dt*(.45+.55*(hunger.current/HUNGER_MAX));
stamina.current=Math.max(0,Math.min(STAMINA_MAX,stamina.current+staminaDelta));
if(hunger.current<=0){
hunger.zeroDamageTimer+=dt;
if(hunger.zeroDamageTimer>=HUNGER_ZERO_DAMAGE_INTERVAL){
hunger.zeroDamageTimer=0;damagePlayer(1);
}
}else hunger.zeroDamageTimer=0;
updateSurvivalHud();
}
saveAccumulator+=dt;
if(active&&saveAccumulator>=5){saveAccumulator=0;saveWorldState()}
runtimePublishAccumulator+=dt;
if(runtimePublishAccumulator>=1/30){
runtimePublishAccumulator%=1/30;
publish();
}
}
function gameFrame(now){
if(!active){frameHandle=0;return}
const dt=Math.min(MAX_FRAME_DT,lastNow?(now-lastNow)/1000:FIXED_DT);
lastNow=now;
accumulator=Math.min(.12,accumulator+dt);
let steps=0;
while(accumulator>=FIXED_DT&&steps<6){
fixedUpdate(FIXED_DT);
accumulator-=FIXED_DT;
steps++;
}
frameHandle=requestAnimationFrame(gameFrame);
}
function startGameLoop(){
if(frameHandle||!active)return;
lastNow=0;accumulator=0;
frameHandle=requestAnimationFrame(gameFrame);
}
function stopGameLoop(){
if(frameHandle)cancelAnimationFrame(frameHandle);
frameHandle=0;lastNow=0;accumulator=0;
keys.clear();resetJoystick();
}
function defaultSave(session){
return {
schemaVersion:SAVE_RUNTIME.schemaVersion,
gameVersion:SAVE_RUNTIME.gameVersion,
account:session.account,
location:'Paperchalk · 无限3D体素世界',
createdAt:Date.now(),
worldMinutes:360,
player:{...sceneData.spawn,y:safeSpawnY(sceneData.spawn.x,PLAYER_ROW_CENTER_Z)},
playerHp:PLAYER_MAX_HP,
hunger:HUNGER_MAX,
stamina:STAMINA_MAX,
terrainEdits:[],
waterCells:[],
torchOn:false,
mapState:{broken:[],collected:[],visitedRoutes:[0],visitedNodes:['village'],exitReached:false},
inventory:Array.from({length:INVENTORY_CAPACITY},(_,i)=>i===0?{...CONTENT.items['hand-torch'],count:1}:i===1?{...CONTENT.items['water-bucket'],count:1}:null)
};
}
function importLegacySave(session,targetKey){
const candidates=[
...LEGACY_SAVE_PREFIXES.map(prefix=>accountSaveKey(session.account,prefix)),
LEGACY_SINGLE_SAVE
];
for(const oldKey of candidates){
const raw=storageGet(oldKey);
if(!raw)continue;
try{
const parsed=JSON.parse(raw);
if(parsed.account&&parsed.account!==session.account)continue;
const migrated=SAVE_RUNTIME.migrate({...parsed,account:session.account});
SAVE_RUNTIME.write({key:targetKey,save:migrated,account:session.account,storage:SAVE_STORAGE});
return migrated;
}catch(error){console.warn('SAVE_MIGRATION_SKIPPED',oldKey,error)}
}
return null;
}
function readSaveForSession(session=getSession()){
if(!session?.account)return null;
const key=accountSaveKey(session.account);
const result=SAVE_RUNTIME.read({key,account:session.account,storage:SAVE_STORAGE});
if(result.save){
if(result.migrated||result.source==='backup'){
try{SAVE_RUNTIME.write({key,save:result.save,account:session.account,storage:SAVE_STORAGE})}catch(error){console.warn('SAVE_REPAIR_FAILED',error)}
}
return result.save;
}
return importLegacySave(session,key);
}
function writeSaveForSession(session,save){
if(!session?.account)return false;
try{
SAVE_RUNTIME.write({key:accountSaveKey(session.account),save,account:session.account,storage:SAVE_STORAGE});
return true;
}catch(error){console.error('SAVE_WRITE_FAILED',error);return false}
}
function saveWorldState(){
const session=getSession();
if(!session)return false;
const save=readSaveForSession(session)||defaultSave(session);
save.location='Paperchalk · 无限3D体素世界';
save.worldMinutes=worldMinutes;
save.player={x:transform.x,y:transform.y,z:PLAYER_ROW_CENTER_Z,yaw:transform.yaw};
save.playerHp=health.current;
save.hunger=hunger.current;
save.stamina=stamina.current;
save.torchOn=controller.torchOn;
save.terrainEdits=terrain.exportEdits();
save.waterCells=terrain.water.exportState();
save.inventory=inventorySnapshot();
save.mapState=save.mapState||{broken:[],collected:[],visitedRoutes:[0],visitedNodes:['village'],exitReached:false};
save.updatedAt=Date.now();
return writeSaveForSession(session,save);
}
function loadWorldState(){
const session=getSession();
if(!session)return false;
const save=readSaveForSession(session)||defaultSave(session);
terrain.importEdits(save.terrainEdits);
terrain.water.importState(save.waterCells);
const p=save.player||sceneData.spawn;
transform.x=Number.isFinite(Number(p.x))?Number(p.x):sceneData.spawn.x;
transform.z=PLAYER_ROW_CENTER_Z;
transform.y=Number.isFinite(Number(p.y))?Number(p.y):safeSpawnY(transform.x,transform.z);
transform.yaw=Number.isFinite(p.yaw)?p.yaw:sceneData.spawn.yaw;
if(collidesAt(transform.x,transform.y,transform.z))transform.y=safeSpawnY(transform.x,transform.z);
velocity.x=velocity.y=velocity.z=0;
controller.grounded=groundProbe();
controller.crouching=false;controller.attacking=false;controller.action='idle';controller.inWater=false;controller.submerged=0;
health.current=clampHp(save.playerHp);
hunger.current=clampHunger(save.hunger??HUNGER_MAX);hunger.zeroDamageTimer=0;
stamina.current=Math.max(0,Math.min(STAMINA_MAX,Number(save.stamina??STAMINA_MAX)||0));
controller.torchOn=!!save.torchOn;
worldMinutes=Number.isFinite(save.worldMinutes)?save.worldMinutes:360;
setInventoryFromSave(save.inventory);
if(!inventoryItems.some(item=>item?.id==='hand-torch')){
inventoryItems[0]={...itemClone(CONTENT.items['hand-torch']),count:1};
renderInventory();
}
if(!inventoryItems.some(item=>item?.id==='water-bucket')){
const waterSlot=inventoryItems.findIndex(v=>!v);
if(waterSlot>=0)inventoryItems[waterSlot]={...itemClone(CONTENT.items['water-bucket']),count:1};
renderInventory();
}
// Fishing ecology/rod onboarding is paused until the world foundation is stable.
updateSurvivalHud();
paperClock.textContent=formatClock();
publish();
return true;
}
window.PaperchalkSaveNow=saveWorldState;
window.PaperchalkSaveDiagnostics=Object.freeze({
schemaVersion:SAVE_RUNTIME.schemaVersion,
keyFor:accountSaveKey,
backupKeyFor(account){return accountSaveKey(account)+'.backup'}
});
function showPage(name){
const appState=window.PaperchalkAppState;
if(appState&&appState.state!==name&&appState.can(name))appState.transition(name,{source:'showPage'});
for(const page of Object.values(pages))page.classList.toggle('active',page===pages[name]);
authMsg.textContent='';
if(name==='settings'){applySettings();settingsStatus.textContent=''}
}
function refreshMenu(){
const session=getSession();
const hasSave=!!readSaveForSession(session);
profileNote.textContent=session?'当前旅人：'+session.displayName:'尚未选择本地档案';
continueBtn.style.display=session&&hasSave?'block':'none';
enterBtn.textContent=session?'进入世界':'开始游戏';
authBtn.textContent=session?'切换档案 / 退出':'本地档案';
}
function enterWorld(){
closeDebugPanel();closeWorldMap();closeBackpack();closeCameraPanel();
const session=getSession();
if(!session){showPage('auth');return false}
if(!readSaveForSession(session))writeSaveForSession(session,defaultSave(session));
loadWorldState();
active=true;
const appState=window.PaperchalkAppState;
if(appState&&appState.state!=='world'&&appState.can('world'))appState.transition('world',{source:'enterWorld'});
uiShell.classList.add('is-hidden');
uiShell.setAttribute('inert','');
worldEl.removeAttribute('inert');
window.PaperchalkEvents?.emit('world:entered',{account:session.account,location:'village-paper-stage'});
window.dispatchEvent(new CustomEvent('paperchalk-world-enter'));
startGameLoop();
publish();
backpackBtn.focus({preventScroll:true});
return true;
}
function openUI(fromWorld=false){
closeDebugPanel();closeWorldMap();closeBackpack();closeCameraPanel();
if(fromWorld)saveWorldState();
active=false;
stopGameLoop();
uiShell.removeAttribute('inert');
worldEl.setAttribute('inert','');
refreshMenu();showPage('menu');
uiShell.classList.remove('is-hidden');
if(fromWorld)window.PaperchalkEvents?.emit('world:left',{reason:'menu'});
window.dispatchEvent(new CustomEvent('paperchalk-world-leave'));
publish();
}
byId('worldMenuBtn').addEventListener('click',()=>openUI(true));
continueBtn.addEventListener('click',enterWorld);
enterBtn.addEventListener('click',enterWorld);
settingsBtn.addEventListener('click',()=>showPage('settings'));
document.querySelectorAll('[data-back="menu"]').forEach(button=>button.addEventListener('click',()=>showPage('menu')));
authBtn.addEventListener('click',()=>{
const session=getSession();
if(session){
if(active)saveWorldState();
storageRemove(KEY_SESSION);
active=false;stopGameLoop();
window.dispatchEvent(new CustomEvent('paperchalk-world-leave'));
setInventoryFromSave([]);
Object.assign(transform,sceneData.spawn);
velocity.x=velocity.y=velocity.z=0;
health.current=PLAYER_MAX_HP;
worldMinutes=360;
publish();
}
refreshMenu();showPage('auth');
});
settingLanguage.addEventListener('change',saveSettingsFromUI);
settingTimeScale.addEventListener('change',saveSettingsFromUI);
settingLandscape.addEventListener('change',saveSettingsFromUI);
const tabLogin=byId('tabLogin');
const tabRegister=byId('tabRegister');
const loginForm=byId('loginForm');
const registerForm=byId('registerForm');
function setAuthTab(mode){
const login=mode==='login';
tabLogin.classList.toggle('active',login);
tabRegister.classList.toggle('active',!login);
loginForm.classList.toggle('hidden',!login);
registerForm.classList.toggle('hidden',login);
authMsg.textContent='';
}
tabLogin.addEventListener('click',()=>setAuthTab('login'));
tabRegister.addEventListener('click',()=>setAuthTab('register'));
registerForm.addEventListener('submit',event=>{
event.preventDefault();
try{
const account=byId('regUser').value.trim().toLocaleLowerCase();
const displayName=byId('regName').value.trim();
const pass=byId('regPass').value;
if(account.length<2||account.length>24||/\s/.test(account)){authMsg.textContent='档案 ID 需要 2–24 个无空格字符';return}
if(displayName.length<1||displayName.length>16){authMsg.textContent='旅人名称需要 1–16 个字符';return}
if(pass.length<4){authMsg.textContent='密码至少 4 位';return}
const users=getUsers();
if(users[account]){authMsg.textContent='这个本地档案已经存在';return}
users[account]={displayName,passwordHash:hashText(pass),createdAt:Date.now()};
storageSet(KEY_USERS,JSON.stringify(users));
setSession({account,displayName});
refreshMenu();enterWorld();
}catch(error){console.error('REGISTER_FAILED',error);authMsg.textContent='注册失败：'+error.message}
});
loginForm.addEventListener('submit',event=>{
event.preventDefault();
try{
const account=byId('loginUser').value.trim().toLocaleLowerCase();
const pass=byId('loginPass').value;
const user=getUsers()[account];
if(!user){authMsg.textContent='未找到这个本地档案';return}
if(user.passwordHash!==hashText(pass)){authMsg.textContent='本机口令不正确';return}
setSession({account,displayName:user.displayName});
refreshMenu();enterWorld();
}catch(error){console.error('LOGIN_FAILED',error);authMsg.textContent='登录失败：'+error.message}
});
window.PaperchalkHandleBack=function(){
if(debugIsOpen()){closeDebugPanel();return true}
if(cameraControlPanel.classList.contains('is-open')){closeCameraPanel();return true}
if(worldMapOverlay.classList.contains('is-open')){closeWorldMap();return true}
if(backpackOverlay.classList.contains('is-open')){closeBackpack();return true}
if(uiShell.classList.contains('is-hidden')){openUI(true);return true}
if(!pages.menu.classList.contains('active')){showPage('menu');refreshMenu();return true}
return false;
};
addEventListener('keydown',event=>{
if(/^Digit[1-5]$/.test(event.code)&&worldInteractive()){
event.preventDefault();
activateQuickSlot(Number(event.code.slice(-1))-1);
return;
}
if(event.code==='KeyT'&&worldInteractive()){
event.preventDefault();
toggleTorch();
}
});
addEventListener('pagehide',saveWorldState);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)saveWorldState()});
addEventListener('unhandledrejection',event=>{
console.error('UNHANDLED_REJECTION',event.reason);
if(!uiShell.classList.contains('is-hidden'))authMsg.textContent='运行错误：'+String(event.reason?.message||event.reason||'未知错误');
});
applySettings();
setInventoryFromSave([]);
renderQuickbar();
paperClock.textContent=formatClock();
refreshMenu();
showPage('menu');
const appState=window.PaperchalkAppState;
if(appState?.state==='boot'&&appState.can('menu'))appState.transition('menu',{source:'boot'});
worldEl.setAttribute('inert','');
publish();
})();