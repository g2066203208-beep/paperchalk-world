(function(){
'use strict';
const CONTENT=window.PaperchalkContent;
if(!CONTENT)throw new Error('Paperchalk authored content failed to load');
const SAVE_RUNTIME=window.PaperchalkSaveRuntime;
if(!SAVE_RUNTIME)throw new Error('PaperchalkSaveRuntime missing');
const ECS=window.PaperchalkECS;
if(!ECS)throw new Error('PaperchalkECS missing');
const NPCRuntime=window.PaperchalkNPCRuntime;
if(!NPCRuntime)throw new Error('PaperchalkNPCRuntime missing');
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
const fishingStatusHud=byId('fishingStatusHud');
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
const npcInteractBtn=byId('npcInteractBtn');
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
const FISHING_CAST_SPEED=9.2;
const FISHING_GRAVITY=13.5;
const FISH_SIM_DT=.10;
const FISH_MAX_ACTIVE=24;
const FISH_ACTIVE_RADIUS=16;
const FISH_DESPAWN_RADIUS=23;
const FISH_APPROACH_RADIUS=7;
const FISH_BITE_RADIUS=.34;
const INVENTORY_CAPACITY=20;
const FIXED_DT=1/60;
const MAX_FRAME_DT=.06;
const GRAVITY=22;
const JUMP_SPEED=7.4;
const PLAYER_SPEED=4.6;
const FLY_SPEED=7.2;
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
const bounds=sceneData.bounds;
const WORLD_LAYOUT_ID=sceneData.terrain?.prologueRoad?.id||sceneData.mode;
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
yaw:0,pitch:.18,distance:19.2,height:.72,fov:36,
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
const controller={
grounded:true,crouching:false,flying:false,attacking:false,attackTimer:0,attackCooldown:0,
action:'idle',moving:false,torchOn:false,inWater:false,submerged:0,facingX:1
};
const playerEntity=ecs.create({
Transform:transform,
Velocity:velocity,
Health:health,
Actor:{kind:'player'},
Player:controller
});
const npcWorld=NPCRuntime.createNPCWorld({
definitions:CONTENT.npcs,quests:CONTENT.quests||[],terrain,ecs,gravity:GRAVITY
});
window.PaperchalkNPCs=Object.freeze({
get list(){return npcWorld.snapshot()},
get stats(){return npcWorld.stats()},
get dialogue(){return npcWorld.dialogueSnapshot()},
get(id){return npcWorld.snapshot().find(npc=>npc.id===String(id))||null},
nearest(range=2.5){const hit=npcWorld.nearestInteractable(transform,range);return hit?{id:hit.actor.id,distance:hit.distance}:null},
interact(id){const out=npcWorld.interact(id,{player:transform,worldMinutes});if(out){showNPCDialogue(out);saveWorldState()}return out}
});
const fishing={
state:'idle',timer:0,biteWindow:0,nextBite:0,
x:0,y:0,z:0,vx:0,vy:0,vz:0,
castX:0,castY:0,castZ:0,
fishId:null,fishName:'',result:'',targetFishEntityId:null,
seed:1
};
const fishWorld={
entities:[],nextId:1,accumulator:0,spawnAccumulator:0,
maxActive:FISH_MAX_ACTIVE,spatial:new Map(),lastWaterVersion:-1
};
function fishingSnapshot(){
return {
state:fishing.state,timer:fishing.timer,biteWindow:fishing.biteWindow,
x:fishing.x,y:fishing.y,z:fishing.z,
fishId:fishing.fishId,fishName:fishing.fishName,result:fishing.result,
targetFishEntityId:fishing.targetFishEntityId
};
}
function hungerSnapshot(){return {current:hunger.current,max:hunger.max,ratio:hunger.current/hunger.max}}
function fishSnapshot(){
return fishWorld.entities.map(f=>({
id:f.id,species:f.species,x:f.x,y:f.y,z:f.z,
vx:f.vx,vy:f.vy,vz:f.vz,state:f.state,size:f.size
}));
}
let lastHungerHud=-1,lastFishingHud='';
function updateSurvivalHud(){
const ratio=Math.max(0,Math.min(1,hunger.current/hunger.max));
const quantized=Math.round(ratio*200)/200;
if(Math.abs(quantized-lastHungerHud)>.0001){
lastHungerHud=quantized;
if(hungerFill)hungerFill.style.transform='scaleX('+quantized.toFixed(3)+')';
if(hungerValue)hungerValue.textContent=String(Math.round(hunger.current));
}
if(fishingStatusHud){
let text='';
if(fishing.state==='flying')text='🎣 浮漂飞行中';
else if(fishing.state==='waiting')text='🎣 等待咬钩…';
else if(fishing.state==='landed')text='🎣 浮漂落地，点击收杆';
else if(fishing.state==='bite')text='❗ 有鱼咬钩，立即收杆！';
else if(fishing.state==='reeling')text='🎣 收杆中…';
if(text!==lastFishingHud){
lastFishingHud=text;
fishingStatusHud.textContent=text;
fishingStatusHud.classList.toggle('is-show',!!text);
}
}
}
let active=false;
let worldMinutes=360;
let worldTimeScale=1;
let runtimeVersion=0;
let frameHandle=0;
let lastNow=0;
let accumulator=0;
let saveAccumulator=0;
let waterStepAccumulator=0;
let cameraYaw=settings.camera3d.yaw;
let keyboardCrouch=false;
let mobileCrouch=false,mobileFlyUp=false,mobileFlyDown=false;
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
grounded:controller.grounded,crouching:controller.crouching,flying:controller.flying,
attacking:controller.attacking,action:controller.action,torchOn:controller.torchOn,
inWater:controller.inWater,submerged:controller.submerged,facingX:controller.facingX
};
}
function buildSnapshot(){
const environment=terrain.sampleAtWorld(transform.x,transform.z);
return {
version:runtimeVersion,
active,
player:playerSnapshot(),
health:{current:health.current,max:health.max},
hunger:hungerSnapshot(),
fishing:fishingSnapshot(),
fish:fishSnapshot(),
npcs:npcWorld.snapshot(),
npcDialogue:npcWorld.dialogueSnapshot(),
world:{minutes:worldMinutes,clock:formatClock(),phase:worldPhase(),biome:environment.biome,landform:environment.landform,elevation:environment.height},
scene:{id:'infinite-voxel-world',name:'序幕 · 城市马路'},
terrain:terrain.stats(),
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
version:9,
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
function showNPCDialogue(packet){
if(!packet)return false;
let text=(packet.name||'NPC')+'：'+(packet.text||'');
const q=packet.quest;
if(q){const o=q.objectives?.[0];text+=' 【'+q.name+(q.status==='active'&&o?' '+(o.current||0)+'/'+(o.count||1):' '+q.status)+'】'}
showMapNotice(text,2600);
window.PaperchalkEvents?.emit('npc:dialogue',packet);
publish();return true;
}
function interactNPC(){
if(!worldInteractive())return false;
const hit=npcWorld.nearestInteractable(transform,2.65);
if(!hit){showMapNotice('附近没人',650);return false}
const packet=npcWorld.interact(hit.actor.id,{player:transform,worldMinutes});
if(!packet)return false;
showNPCDialogue(packet);saveWorldState();return packet;
}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function collidesAt(x,y,z){
return terrain.collidesAABB(x,y,z,PLAYER_HALF_W,PLAYER_HALF_H,PLAYER_HALF_D);
}
function groundProbe(x=transform.x,y=transform.y,z=transform.z){
return terrain.collidesAABB(x,y-.035,z,PLAYER_HALF_W*.92,PLAYER_HALF_H,PLAYER_HALF_D*.92);
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
horizontal=clamp(horizontal+joystickAxisX,-1,1);
return {x:horizontal,z:0,magnitude:Math.abs(horizontal)};
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
const input=context.interactive?rawMoveInput():{x:0,z:0,magnitude:0};
const submerged=playerSubmersion();
controller.submerged=submerged;controller.inWater=submerged>.06;
const speed=(controller.flying?FLY_SPEED:PLAYER_SPEED)*(controller.crouching?.48:1)*(controller.inWater&&!controller.flying ? .58 : 1);
velocity.x=input.x*speed;velocity.z=input.z*speed;
controller.moving=input.magnitude>.05;
if(Math.abs(velocity.x)>.08)controller.facingX=velocity.x>0?1:-1;
if(controller.moving)transform.yaw=Math.atan2(velocity.x,velocity.z);
moveAxis('x',velocity.x*dt);
transform.x=clamp(transform.x,bounds.minX+PLAYER_HALF_W,bounds.maxX-PLAYER_HALF_W);
transform.z=INTERACTION_ROW_Z*terrain.tileSize;velocity.z=0;
}
});
ecs.registerSystem('player-gravity',{
require:['Transform','Velocity','Player'],phase:'fixed',priority:20,
update(entity,world,dt,context){
if(entity!==playerEntity)return;
if(controller.flying){
const down=keys.has('ShiftLeft')||keys.has('ShiftRight')||keys.has('KeyC')||mobileFlyDown;
const up=keys.has('Space')||mobileFlyUp;
velocity.y=((up?1:0)-(down?1:0))*FLY_SPEED;controller.grounded=false;controller.inWater=false;controller.submerged=0;
moveAxis('y',velocity.y*dt);return;
}
const submerged=playerSubmersion();
controller.submerged=submerged;controller.inWater=submerged>.06;
if(!groundProbe())controller.grounded=false;
if(controller.inWater){
const buoyancy=GRAVITY*1.18*submerged,gravity=GRAVITY*(1-submerged*.82);
velocity.y+=(buoyancy-gravity)*dt;
const drag=Math.exp(-3.4*submerged*dt);velocity.y*=drag;velocity.x*=Math.exp(-1.8*submerged*dt);velocity.z*=Math.exp(-1.8*submerged*dt);
velocity.y=Math.max(-3.2,Math.min(4.8,velocity.y));controller.grounded=false;
}else if(!controller.grounded)velocity.y-=GRAVITY*dt;
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
else if(controller.flying)controller.action=controller.moving||Math.abs(velocity.y)>.05?'fly-move':'fly';
else if(controller.inWater)controller.action=controller.moving||Math.abs(velocity.y)>.15?'swim':'float';
else if(!controller.grounded)controller.action=velocity.y>=0?'jump-up':'jump-down';
else if(controller.crouching)controller.action='crouch';
else if(controller.moving)controller.action='walk';
else controller.action='idle';
}
});
function jump(){
if(!worldInteractive()||controller.flying)return false;
const submerged=playerSubmersion();
const waterContact=playerWaterContact();
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
const selected=typeof inventorySelected==='number'?inventoryItems?.[inventorySelected]:null;
if(fishing.state!=='idle'||selected?.action==='fishing-rod')return reelFishingRod();
if(controller.attackCooldown>0)return false;
controller.attacking=true;
controller.attackTimer=.28;
controller.attackCooldown=.42;
window.PaperchalkEvents?.emit('player:attack',{x:transform.x,y:transform.y,z:transform.z,yaw:transform.yaw});
npcWorld.emitStimulus('attack',transform,{radius:8,threat:true,ttl:5});
publish();
return true;
}
function setCrouch(enabled){
controller.crouching=!!enabled;publish();return controller.crouching;
}
function setFlight(enabled=!controller.flying,{notice=true}={}){
controller.flying=!!enabled;velocity.y=0;controller.grounded=controller.flying?false:groundProbe();
if(notice)showMapNotice(controller.flying?'飞行模式：WASD移动，Space上升，Shift/C下降':'飞行模式：关闭',1100);
publish();return controller.flying;
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
window.PaperchalkHealth=Object.freeze({
maxHp:PLAYER_MAX_HP,
get state(){return {hp:health.current,maxHp:health.max}},
set(value,options){return setPlayerHp(value,options)},
damage:damagePlayer,
heal:healPlayer
});
window.PaperchalkCombat=Object.freeze({
get player(){return playerSnapshot()},
jump,attack,setCrouch,setFlight,toggleTorch,
damagePlayer,healPlayer,setPlayerHp
});
function random01(){
fishing.seed=(Math.imul(fishing.seed|0,1664525)+1013904223)|0;
return (fishing.seed>>>0)/4294967296;
}
function chooseFishSpecies(){
const phase=worldPhase(),env=terrain.sampleAtWorld(transform.x,transform.z),r=random01();
const rareBoost=(phase==='dawn'||phase==='dusk'?0.05:0)+(env.biome==='marsh'?0.03:0);
if(r<.09+rareBoost)return 'golden-paperfish';
if(r<.48)return 'bluefin-minnow';
return 'paper-carp';
}
function waterSurfaceNear(x,z,radius=1){
const s=terrain.tileSize,gx=Math.floor(x/s),gz=Math.floor(z/s+.5);
let best=null,bestD=Infinity;
for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++){
const b=terrain.water.columnBounds(gx+dx,gz+dz);
if(!b)continue;
const wx=(gx+dx+.5)*s,wz=(gz+dz)*s,d=Math.hypot(wx-x,wz-z);
if(d<bestD){bestD=d;best={x:wx,y:b.top,z:wz,gx:gx+dx,gz:gz+dz,bottom:b.bottom,top:b.top,depth:b.depth}}
}
return best;
}
function fishById(id){return fishWorld.entities.find(f=>f.id===id)||null}
function removeFishEntity(id){
const i=fishWorld.entities.findIndex(f=>f.id===id);
if(i>=0)fishWorld.entities.splice(i,1);
}
function releaseFishingTarget({flee=true,remove=false}={}){
const id=fishing.targetFishEntityId;
if(id!=null){
const fish=fishById(id);
if(remove)removeFishEntity(id);
else if(fish){
fish.state=flee?'flee':'wander';fish.stateTimer=flee?2.2:0;
fish.targetX=fish.x+(random01()-.5)*4;fish.targetZ=fish.z+(random01()-.5)*3;
}
}
fishing.targetFishEntityId=null;
}
function resetFishing(result=''){
releaseFishingTarget({flee:result!=='caught',remove:false});
fishing.state='idle';fishing.timer=0;fishing.biteWindow=0;fishing.nextBite=0;
fishing.vx=fishing.vy=fishing.vz=0;fishing.fishId=null;fishing.fishName='';fishing.result=result;
updateSurvivalHud();publish();
}
function rebuildFishSpatial(){
const cell=3,grid=fishWorld.spatial;grid.clear();
for(const fish of fishWorld.entities){
const key=Math.floor(fish.x/cell)+','+Math.floor(fish.z/cell);
let bucket=grid.get(key);if(!bucket){bucket=[];grid.set(key,bucket)}
bucket.push(fish);
}
}
function nearbyFish(x,z,radius){
const cell=3,cx=Math.floor(x/cell),cz=Math.floor(z/cell),r=Math.ceil(radius/cell),out=[];
for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){
const bucket=fishWorld.spatial.get((cx+dx)+','+(cz+dz));
if(!bucket)continue;
for(const fish of bucket)if(Math.hypot(fish.x-x,fish.z-z)<=radius)out.push(fish);
}
return out;
}
function fishWaterTargetNear(x,z,radius=4){
const s=terrain.tileSize,gx=Math.floor(x/s),gz=Math.floor(z/s+.5),tries=18;
for(let i=0;i<tries;i++){
const dx=Math.round((random01()*2-1)*radius),dz=Math.round((random01()*2-1)*radius);
const b=terrain.water.columnBounds(gx+dx,gz+dz);
if(!b||b.depth<.28)continue;
const margin=Math.min(.22,b.depth*.3);
return {
x:(gx+dx+.5)*s,z:(gz+dz)*s,
y:b.bottom+margin+random01()*Math.max(.05,b.depth-margin*2),
bounds:b
};
}
return null;
}
function spawnFishAtColumn(gx,gz,bounds){
if(!bounds||bounds.depth<.28||fishWorld.entities.length>=fishWorld.maxActive)return null;
const species=chooseFishSpecies();
const size=species==='golden-paperfish' ? .72 : species==='bluefin-minnow' ? .46 : .62;
const margin=Math.min(.22,bounds.depth*.3);
const fish={
id:fishWorld.nextId++,species,
x:(gx+.5)*terrain.tileSize+(random01()-.5)*.35,
z:gz*terrain.tileSize+(random01()-.5)*.35,
y:bounds.bottom+margin+random01()*Math.max(.05,bounds.depth-margin*2),
vx:(random01()-.5)*.7,vy:0,vz:(random01()-.5)*.55,
state:'wander',stateTimer:0,wanderTimer:.5+random01()*2,
targetX:0,targetY:0,targetZ:0,size
};
fishWorld.entities.push(fish);return fish;
}
function ensureFishPopulation(){
const s=terrain.tileSize,seen=new Set(),candidates=[];
for(const key of terrain.water.cells.keys()){
const [gx,,gz]=key.split(',').map(Number),ck=gx+','+gz;
if(seen.has(ck))continue;seen.add(ck);
const wx=(gx+.5)*s,wz=gz*s,d=Math.hypot(wx-transform.x,wz-transform.z);
if(d>FISH_ACTIVE_RADIUS)continue;
const b=terrain.water.columnBounds(gx,gz);
if(b&&b.depth>=.28)candidates.push({gx,gz,b,d});
}
const desired=Math.min(FISH_MAX_ACTIVE,candidates.length?Math.max(1,Math.floor(candidates.length*.32)):0);
let guard=80;
while(fishWorld.entities.length<desired&&candidates.length&&guard-->0){
const c=candidates[Math.floor(random01()*candidates.length)];
if(fishWorld.entities.some(f=>Math.hypot(f.x-(c.gx+.5)*s,f.z-c.gz*s)<.8))continue;
spawnFishAtColumn(c.gx,c.gz,c.b);
}
}
function acquireFishForBobber(){
if(fishing.state!=='waiting'||fishing.targetFishEntityId!=null)return null;
rebuildFishSpatial();
let best=null,bestD=Infinity;
for(const fish of nearbyFish(fishing.x,fishing.z,FISH_APPROACH_RADIUS)){
if(fish.state==='flee'||fish.state==='hooked')continue;
const d=Math.hypot(fish.x-fishing.x,fish.y-(fishing.y-.24),fish.z-fishing.z);
if(d<bestD){best=fish;bestD=d}
}
if(best){
best.state='approach';best.stateTimer=0;fishing.targetFishEntityId=best.id;
window.PaperchalkEvents?.emit('fishing:fish-approach',{fishId:best.id,species:best.species});
}
return best;
}
function updateFishEcology(dt){
if(!terrain.water.cells.size&&fishing.state==='idle'&&!fishWorld.entities.length)return;
fishWorld.accumulator+=dt;fishWorld.spawnAccumulator+=dt;
if(fishWorld.spawnAccumulator>=1){
fishWorld.spawnAccumulator=0;
fishWorld.entities=fishWorld.entities.filter(f=>{
if(f.id===fishing.targetFishEntityId)return true;
return Math.hypot(f.x-transform.x,f.z-transform.z)<=FISH_DESPAWN_RADIUS&&!!terrain.water.boundsAtWorld(f.x,f.z);
});
ensureFishPopulation();
}
if(fishWorld.accumulator<FISH_SIM_DT)return;
const step=Math.min(.2,fishWorld.accumulator);fishWorld.accumulator=0;
rebuildFishSpatial();
acquireFishForBobber();
for(const fish of fishWorld.entities){
if(fish.state==='hooked')continue;
fish.stateTimer=Math.max(0,(fish.stateTimer||0)-step);
const bounds=terrain.water.boundsAtWorld(fish.x,fish.z);
if(!bounds){
const target=fishWaterTargetNear(fish.x,fish.z,2);
if(target){fish.x=target.x;fish.y=target.y;fish.z=target.z}
continue;
}
let tx=fish.targetX,ty=fish.targetY,tz=fish.targetZ,speed=.65;
if(fish.state==='approach'&&fishing.state==='waiting'&&fishing.targetFishEntityId===fish.id){
tx=fishing.x;tz=fishing.z;ty=Math.max(bounds.bottom+.12,Math.min(bounds.top-.12,fishing.y-.24));speed=1.35;
const d=Math.hypot(fish.x-tx,fish.y-ty,fish.z-tz);
if(d<=FISH_BITE_RADIUS){
fish.state='nibbling';fish.vx=fish.vy=fish.vz=0;
fishing.state='bite';fishing.timer=0;fishing.biteWindow=1.7;
fishing.fishId=fish.species;fishing.fishName=CONTENT.items[fish.species]?.name||'鱼';
window.PaperchalkEvents?.emit('fishing:bite',{...fishingSnapshot(),fishEntityId:fish.id});
updateSurvivalHud();publish();continue;
}
}else if(fish.state==='flee'){
speed=1.7;
if(fish.stateTimer<=0){fish.state='wander';fish.wanderTimer=0}
tx=fish.targetX||fish.x+(fish.vx>=0?2:-2);tz=fish.targetZ||fish.z;
ty=Math.min(bounds.top-.14,Math.max(bounds.bottom+.14,fish.y));
}else if(fish.state==='nibbling'){
fish.x+=(fishing.x-fish.x)*Math.min(1,step*5);
fish.z+=(fishing.z-fish.z)*Math.min(1,step*5);
fish.y+=(fishing.y-.22-fish.y)*Math.min(1,step*5);
continue;
}else{
fish.state='wander';fish.wanderTimer=(fish.wanderTimer||0)-step;
if(fish.wanderTimer<=0||!Number.isFinite(tx)){
const target=fishWaterTargetNear(fish.x,fish.z,4);
if(target){fish.targetX=tx=target.x;fish.targetY=ty=target.y;fish.targetZ=tz=target.z}
fish.wanderTimer=.8+random01()*2.8;
}
speed=fish.species==='bluefin-minnow' ? .92 : fish.species==='golden-paperfish' ? .72 : .62;
}
if(!Number.isFinite(tx)||!Number.isFinite(ty)||!Number.isFinite(tz))continue;
let dx=tx-fish.x,dy=ty-fish.y,dz=tz-fish.z;
const len=Math.max(.001,Math.hypot(dx,dy,dz));dx/=len;dy/=len;dz/=len;
let sx=0,sz=0;
for(const other of nearbyFish(fish.x,fish.z,1.1)){
if(other===fish)continue;
const ox=fish.x-other.x,oz=fish.z-other.z,d2=Math.max(.04,ox*ox+oz*oz);
sx+=ox/d2;sz+=oz/d2;
}
dx+=sx*.08;dz+=sz*.08;
const norm=Math.max(.001,Math.hypot(dx,dy,dz));dx/=norm;dy/=norm;dz/=norm;
const response=Math.min(1,step*4);
fish.vx+=(dx*speed-fish.vx)*response;
fish.vy+=(dy*speed*.55-fish.vy)*response;
fish.vz+=(dz*speed-fish.vz)*response;
const nx=fish.x+fish.vx*step,ny=fish.y+fish.vy*step,nz=fish.z+fish.vz*step;
const nb=terrain.water.boundsAtWorld(nx,nz);
if(nb&&ny>nb.bottom+.07&&ny<nb.top-.05){
fish.x=nx;fish.y=ny;fish.z=nz;
}else{
fish.vx*=-.65;fish.vz*=-.65;
fish.wanderTimer=0;
fish.y=Math.max(bounds.bottom+.08,Math.min(bounds.top-.08,fish.y));
}
}
}
window.PaperchalkFishEcology=Object.freeze({
get fish(){return fishSnapshot()},
get stats(){return {active:fishWorld.entities.length,maxActive:fishWorld.maxActive,spatialCells:fishWorld.spatial.size,simulationHz:Math.round(1/FISH_SIM_DT)}}
});
function castFishingRod(target=null){
if(!worldInteractive())return false;
if(fishing.state!=='idle')return reelFishingRod();
const dir=controller.facingX||1;
const startX=transform.x+dir*.28,startY=transform.y+.55,startZ=transform.z;
let tx,ty,tz;
if(target&&[target.x,target.y,target.z].every(Number.isFinite)){
tx=Number(target.x);ty=Number(target.y)+.06;tz=Number(target.z);
const distance=Math.hypot(tx-startX,tz-startZ);
if(distance>16){showMapNotice('这个位置太远了。',700);return false}
}else{
let best=null;
for(let d=2;d<=10;d+=.5){
const x=transform.x+dir*d;
const w=terrain.water.surfaceAtWorld(x,transform.z);
if(w){best={x,y:w.y,z:transform.z};break}
}
if(!best){showMapNotice('请点击水面选择抛竿位置。',900);return false}
tx=best.x;ty=best.y+.06;tz=best.z;
}
const dx=tx-startX,dz=tz-startZ;
const horizontal=Math.hypot(dx,dz);
const flightTime=Math.max(.48,Math.min(1.05,.46+horizontal*.055));
fishing.state='flying';fishing.timer=0;fishing.result='';
fishing.x=startX;fishing.y=startY;fishing.z=startZ;
fishing.castX=tx;fishing.castY=ty;fishing.castZ=tz;
fishing.flightTime=flightTime;
fishing.vx=dx/flightTime;
fishing.vz=dz/flightTime;
fishing.vy=(ty-startY+.5*FISHING_GRAVITY*flightTime*flightTime)/flightTime;
fishing.nextBite=0;fishing.biteWindow=0;
window.PaperchalkEvents?.emit('fishing:cast',fishingSnapshot());
showMapNotice('抛竿！',550);updateSurvivalHud();publish();
return true;
}
function reelFishingRod(){
if(fishing.state==='idle')return castFishingRod();
if(fishing.state==='bite'){
const entity=fishById(fishing.targetFishEntityId);
const species=entity?.species||fishing.fishId||'paper-carp';
const fish=CONTENT.items[species]||CONTENT.items['paper-carp'];
fishing.fishId=fish.id;fishing.fishName=fish.name;fishing.state='reeling';fishing.timer=0;
fishing.result='catch';
if(entity)entity.state='hooked';
window.PaperchalkEvents?.emit('fishing:hooked',{...fishingSnapshot(),fishId:fish.id,fishEntityId:entity?.id??null});
updateSurvivalHud();publish();
return true;
}
if(fishing.state==='waiting'||fishing.state==='flying'||fishing.state==='landed'){
showMapNotice('提前收杆，没有鱼。',700);
window.PaperchalkEvents?.emit('fishing:reel-empty',fishingSnapshot());
resetFishing('empty');
return true;
}
return false;
}
function updateFishing(dt){
if(fishing.state==='idle')return;
fishing.timer+=dt;
if(fishing.state==='flying'){
fishing.vy-=FISHING_GRAVITY*dt;
fishing.x+=fishing.vx*dt;fishing.y+=fishing.vy*dt;fishing.z+=fishing.vz*dt;
const targetWater=terrain.water.surfaceAtWorld(fishing.castX,fishing.castZ);
const reachedTarget=fishing.timer>=Math.max(.2,(fishing.flightTime||.7)*.92);
if(targetWater&&reachedTarget){
fishing.x=fishing.castX;fishing.y=targetWater.y+.06;fishing.z=fishing.castZ;
fishing.vx=fishing.vy=fishing.vz=0;fishing.state='waiting';fishing.timer=0;
fishing.nextBite=2.2+random01()*4.8;
window.PaperchalkEvents?.emit('fishing:bobber-water',fishingSnapshot());
updateSurvivalHud();return;
}
const ground=terrain.highestGroundY(fishing.x,fishing.z);
const validTargetWater=terrain.water.surfaceAtWorld(fishing.castX,fishing.castZ);
const castTimeout=Math.max(1.4,(fishing.flightTime||.7)+.75);
if(!validTargetWater&&((fishing.y<=ground+.05&&fishing.timer>.12)||fishing.timer>castTimeout)){
const targetGround=terrain.highestGroundY(fishing.castX,fishing.castZ);
fishing.x=fishing.castX;fishing.z=fishing.castZ;
fishing.y=(Number.isFinite(targetGround)?targetGround:ground)+.08;
fishing.vx=fishing.vy=fishing.vz=0;fishing.state='landed';fishing.timer=0;
window.PaperchalkEvents?.emit('fishing:bobber-land',fishingSnapshot());
showMapNotice('浮漂落地，没有水就不会有鱼咬钩。',900);
updateSurvivalHud();publish();return;
}
if(validTargetWater&&fishing.timer>castTimeout){
fishing.x=fishing.castX;fishing.y=validTargetWater.y+.06;fishing.z=fishing.castZ;
fishing.vx=fishing.vy=fishing.vz=0;fishing.state='waiting';fishing.timer=0;
window.PaperchalkEvents?.emit('fishing:bobber-water',fishingSnapshot());
updateSurvivalHud();publish();return;
}
}else if(fishing.state==='landed'){
const ground=terrain.highestGroundY(fishing.x,fishing.z);
if(Number.isFinite(ground))fishing.y=ground+.08;
}else if(fishing.state==='waiting'){
const water=waterSurfaceNear(fishing.x,fishing.z,1);
if(!water){showMapNotice('水退走了，自动收杆。',800);resetFishing('dry');return}
fishing.x=water.x;fishing.z=water.z;fishing.y=water.y+.06+Math.sin(performance.now()*.004)*.025;
acquireFishForBobber();
}else if(fishing.state==='bite'){
const water=waterSurfaceNear(fishing.x,fishing.z,1);
if(water){fishing.x=water.x;fishing.z=water.z;fishing.y=water.y-.025+Math.sin(performance.now()*.016)*.045}
if(fishing.timer>=fishing.biteWindow){
const missed=fishById(fishing.targetFishEntityId);
if(missed){missed.state='flee';missed.stateTimer=2.4;missed.targetX=missed.x+(missed.x<fishing.x?-4:4);missed.targetZ=missed.z+(random01()-.5)*2}
fishing.targetFishEntityId=null;fishing.fishId=null;fishing.fishName='';
fishing.state='waiting';fishing.timer=0;
window.PaperchalkEvents?.emit('fishing:bite-missed',fishingSnapshot());
updateSurvivalHud();publish();return;
}
}else if(fishing.state==='reeling'){
const t=Math.min(1,fishing.timer/.55),ease=1-Math.pow(1-t,3);
const targetX=transform.x+(controller.facingX||1)*.35,targetY=transform.y+.45,targetZ=transform.z;
fishing.x+=(targetX-fishing.x)*Math.min(1,dt*12);
fishing.y+=(targetY-fishing.y)*Math.min(1,dt*12);
fishing.z+=(targetZ-fishing.z)*Math.min(1,dt*12);
if(t>=1){
const fish=CONTENT.items[fishing.fishId]||CONTENT.items['paper-carp'];
const ok=addInventoryItem({...fish,count:1});
showMapNotice(ok?('钓到了 '+fish.name+'！'):'鱼上钩了，但背包已满！',1200);
window.PaperchalkEvents?.emit('fishing:caught',{fishId:fish.id,name:fish.name,fishEntityId:fishing.targetFishEntityId});
if(ok&&fishing.targetFishEntityId!=null)removeFishEntity(fishing.targetFishEntityId);
fishing.targetFishEntityId=null;
resetFishing(ok?'caught':'inventory-full');
}
}
}
window.PaperchalkFishing=Object.freeze({
get state(){return fishingSnapshot()},
cast:castFishingRod,reel:reelFishingRod,use:reelFishingRod
});
function safeSpawnY(x=sceneData.spawn.x,z=sceneData.spawn.z||0){
return terrain.highestGroundY(x,z)+PLAYER_HALF_H+.03;
}
function teleport(x,z=sceneData.spawn.z||0,y=null,{notice=''}={}){
const nx=Number.isFinite(Number(x))?Number(x):sceneData.spawn.x;
const nz=Number.isFinite(Number(z))?Number(z):(sceneData.spawn.z||0);
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
function digTerrainCell(gx,gy,gz,{persist=true}={}){
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
const center=terrain.cellCenter(gx,gy,gz);
if(!terrainTargetInReach(center))return {changed:false,reason:'out-of-reach'};
const half=terrain.tileSize*.49;
const overlapsPlayer=Math.abs(center.x-transform.x)<PLAYER_HALF_W+half&&Math.abs(center.y-transform.y)<PLAYER_HALF_H+half&&Math.abs(center.z-transform.z)<PLAYER_HALF_D+half;
if(overlapsPlayer)return {changed:false,reason:'player-overlap'};
if(npcWorld.collidesAABB(center.x,center.y,center.z,half,half,half))return {changed:false,reason:'npc-overlap'};
const result=terrain.placeCell(gx,gy,gz,tile);
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
const center=terrain.cellCenter(gx,gy,gz);
if(!terrainTargetInReach(center))return {changed:false,reason:'out-of-reach'};
if(terrain.isSolidPeek(gx,gy,gz))return {changed:false,reason:'solid'};
const result=terrain.water.placeFull(gx,gy,gz);
if(result.changed){
window.PaperchalkEvents?.emit('liquid:changed',{...result,action:'place-water',levels:8});
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
get interactionRowZ(){return null},
get stats(){return {...terrain.stats(),threeDimensionalInteraction:true}},
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
if(selectedItem?.action==='fishing-rod'){
if(fishing.state!=='idle'){reelFishingRod();return}
const waterTarget=window.Paperchalk3D?.screenToWaterSurface?.(event.clientX,event.clientY,{maxDistance:32});
const terrainTarget=window.Paperchalk3D?.screenToTerrainCell?.(event.clientX,event.clientY,{showCursor:false});
const castTarget=waterTarget||(terrainTarget?{
x:terrainTarget.x,
y:terrainTarget.y+terrain.tileSize*.52,
z:terrainTarget.z
}:null);
if(!castTarget){showMapNotice('这里太远，换个位置抛竿。',750);return}
castFishingRod(castTarget);
return;
}
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
button.classList.toggle('is-active',(item?.action==='toggle-torch'&&controller.torchOn)||(item?.action==='water-tool'&&terrainToolMode==='water')||(item?.action==='fishing-rod'&&fishing.state!=='idle'));
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
if(item.action==='fishing-rod'){
setTerrainTool('dig');
showMapNotice(fishing.state==='idle'?'钓鱼竿已装备：点击任意可见位置抛竿。':'再次点击画面即可收杆。',900);
renderQuickbar();
return true;
}
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
if(item.action==='fishing-rod'){
setTerrainTool('dig');
if(fishing.state==='idle'){
showMapNotice('点击任意可见位置抛竿；落水后才会钓到鱼。',900);
renderInventory();renderQuickbar();return true;
}
const ok=reelFishingRod();renderInventory();renderQuickbar();return ok;
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
const paperButton=debugPanel.querySelector('[data-debug-action="paperstyle"]');
const raysButton=debugPanel.querySelector('[data-debug-action="volumetric"]');
const flightButton=debugPanel.querySelector('[data-debug-action="flight"]');
if(stageButton)stageButton.textContent='纸片舞台视角：'+(stage.enabled?'开':'关');
if(axisButton)axisButton.textContent='舞台观察轴：'+stage.axis.toUpperCase();
if(paperButton)paperButton.textContent='Paper Style：'+(window.Paperchalk3D?.stats?.paperStyle?.enabled===false?'关':'开');
if(raysButton)raysButton.textContent='丁达尔：'+(window.Paperchalk3D?.stats?.atmosphere?.volumetric===false?'关':'开');
if(flightButton)flightButton.textContent='飞行：'+(controller.flying?'开':'关');
}
function updateDebugStatus(){
const s=window.Paperchalk3D?.stats||{};
const stage=stageViewState();
const ts=terrain.stats();
debugStatus.textContent='HP '+health.current+'/'+health.max+
' · XYZ '+transform.x.toFixed(1)+', '+transform.y.toFixed(1)+', '+transform.z.toFixed(1)+
' · '+(controller.flying?'飞行':'步行')+
' · '+(s.paperStyle?.enabled===false?('3D方块 '+(s.terrain?.renderedQuads||0)+' quads'):('Paper '+(s.paperTerrain?.visiblePaperChunks||0)+' chunks / '+(s.paperTerrain?.paperTriangles||0)+' tris'))+' · '+ts.loadedChunks+' logical chunks'+
' · '+terrainToolMode.toUpperCase()+
' · Vol '+((s.atmosphere?.currentStrength||0).toFixed?.(2)||'0.00')+
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
if(cmd==='help')return 'hp 5 | tp X Z [Y] | time 分钟 | flight on/off | dig X Y Z | put X Y Z | reset | collider | terrain | stats | save';
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
if(cmd==='time'){
const m=Number(args[0]);
if(!Number.isFinite(m))return '用法：time 390（06:30）';
worldMinutes=((m%1440)+1440)%1440;paperClock.textContent=formatClock();publish();
return '世界时间 -> '+formatClock();
}
if(cmd==='flight'){
const token=String(args[0]||'toggle').toLowerCase(),next=token==='on'?true:token==='off'?false:!controller.flying;
return '飞行 -> '+(setFlight(next,{notice:false})?'开':'关');
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
debugPanel.querySelectorAll('[data-paper-setting]').forEach(input=>{
input.addEventListener('input',()=>window.Paperchalk3D?.configurePaperTerrain?.({[input.dataset.paperSetting]:Number(input.value)}));
});
debugPanel.querySelectorAll('[data-atmos-setting]').forEach(input=>{
input.addEventListener('input',()=>window.Paperchalk3D?.configureAtmosphere?.({[input.dataset.atmosSetting]:Number(input.value)}));
});
debugPanel.querySelectorAll('[data-debug-action]').forEach(button=>{
button.addEventListener('click',()=>{
const a=button.dataset.debugAction;
if(a==='damage1')damagePlayer(1);
else if(a==='heal1')healPlayer(1);
else if(a==='damage3')damagePlayer(3);
else if(a==='zero')setPlayerHp(0);
else if(a==='full')setPlayerHp(PLAYER_MAX_HP);
else if(a==='resetpos')window.PaperchalkMap.reset();
else if(a==='flight'){setFlight();button.textContent='飞行：'+(controller.flying?'开':'关')}
else if(a==='colliders'){
debugColliders=!debugColliders;
window.Paperchalk3D?.setDebugColliders?.(debugColliders);
button.textContent='Collider：'+(debugColliders?'开':'关');
}else if(a==='paperstyle'){
window.Paperchalk3D?.setPaperStyle?.(!(window.Paperchalk3D?.stats?.paperStyle?.enabled!==false));
}else if(a==='volumetric'){
const current=window.Paperchalk3D?.stats?.atmosphere?.volumetric!==false;
window.Paperchalk3D?.configureAtmosphere?.({volumetric:!current});
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
window.PaperchalkTimeDebug=Object.freeze({
get(){return {minutes:worldMinutes,scale:worldTimeScale,clock:formatClock()}},
set(v){const n=Number(v);if(Number.isFinite(n)){worldMinutes=((n%1440)+1440)%1440;paperClock.textContent=formatClock();publish()}return this.get()},
scale(v){const n=Number(v);if(Number.isFinite(n))worldTimeScale=clamp(n,0,20);return this.get()}
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
jumpBtn.addEventListener('pointerdown',event=>{event.preventDefault();if(controller.flying)mobileFlyUp=true;else jump()});
for(const type of ['pointerup','pointercancel','pointerleave'])jumpBtn.addEventListener(type,()=>{mobileFlyUp=false});
attackBtn.addEventListener('pointerdown',event=>{event.preventDefault();attack()});
npcInteractBtn.addEventListener('pointerdown',event=>{event.preventDefault();interactNPC()});
crouchBtn.addEventListener('pointerdown',event=>{event.preventDefault();if(controller.flying)mobileFlyDown=true;else{mobileCrouch=true;setCrouch(true)}});
for(const type of ['pointerup','pointercancel','pointerleave'])crouchBtn.addEventListener(type,()=>{mobileFlyDown=false;mobileCrouch=false;if(!controller.flying)setCrouch(keyboardCrouch)});
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
if(['KeyA','KeyD','KeyW','KeyS','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.code)){
keys.add(event.code);event.preventDefault();return;
}
if(event.code==='Space'){keys.add('Space');if(!controller.flying&&(!event.repeat||controller.inWater||!!playerWaterContact()))jump();event.preventDefault();return}
if(event.code==='ShiftLeft'||event.code==='ShiftRight'){keys.add(event.code);event.preventDefault();return}
if(event.code==='KeyV'){if(!event.repeat)setFlight();event.preventDefault();return}
if(event.code==='KeyF'){
if(!event.repeat&&inventoryItems.some(item=>item?.id==='fishing-rod')){
if(fishing.state==='idle')showMapNotice('装备钓鱼竿后，点击任意可见位置抛竿。',900);
else reelFishingRod();
}
event.preventDefault();return;
}
if(event.code==='KeyJ'){if(!event.repeat)attack();event.preventDefault();return}
if(event.code==='KeyE'){if(!event.repeat)interactNPC();event.preventDefault();return}
if(event.code==='KeyC'){keys.add('KeyC');if(!controller.flying){keyboardCrouch=true;setCrouch(true)}event.preventDefault()}
});
window.addEventListener('keyup',event=>{
keys.delete(event.code);
if(event.code==='KeyC'){keyboardCrouch=false;if(!controller.flying)setCrouch(mobileCrouch)}
});
window.addEventListener('blur',()=>{keys.clear();keyboardCrouch=false;mobileFlyUp=mobileFlyDown=false;resetJoystick();if(!controller.flying)setCrouch(mobileCrouch)});
function fixedUpdate(dt){
const interactive=worldInteractive();
controller.crouching=!controller.flying&&(keyboardCrouch||mobileCrouch);
ecs.runPhase('fixed',dt,{interactive,player:transform,worldMinutes});
if(active){
worldMinutes=(worldMinutes+worldTimeScale*dt)%1440;
paperClock.textContent=formatClock();
waterStepAccumulator+=dt;
if(waterStepAccumulator>=.10){
waterStepAccumulator=0;
if(terrain.water.needsSettle){
const liquidStep=terrain.water.step();
if(liquidStep.changed)window.PaperchalkEvents?.emit('liquid:flow',liquidStep);
}
}
updateFishEcology(dt);
updateFishing(dt);
const hungerDrain=HUNGER_DRAIN_PER_SECOND*dt*(controller.moving?1.35:1)*(controller.inWater?1.22:1);
hunger.current=clampHunger(hunger.current-hungerDrain);
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
publish();
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
location:'序幕 · 城市马路',
createdAt:Date.now(),
worldMinutes:360,
worldLayout:WORLD_LAYOUT_ID,
player:{...sceneData.spawn},
playerHp:PLAYER_MAX_HP,
hunger:HUNGER_MAX,
terrainEdits:[],
waterCells:[],
npcState:null,
torchOn:false,
mapState:{broken:[],collected:[],visitedRoutes:[0],visitedNodes:['village'],exitReached:false},
inventory:Array.from({length:INVENTORY_CAPACITY},(_,i)=>i===0?{...CONTENT.items['hand-torch'],count:1}:i===1?{...CONTENT.items['water-bucket'],count:1}:i===2?{...CONTENT.items['fishing-rod'],count:1}:null)
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
save.location='序幕 · 城市马路';
save.worldMinutes=worldMinutes;
save.worldLayout=WORLD_LAYOUT_ID;
save.player={x:transform.x,y:transform.y,z:transform.z,yaw:transform.yaw};
save.playerHp=health.current;
save.hunger=hunger.current;
save.torchOn=controller.torchOn;
save.terrainEdits=terrain.exportEdits();
save.waterCells=terrain.water.exportState();
save.npcState=npcWorld.exportState();
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
transform.x=clamp(Number.isFinite(Number(p.x))?Number(p.x):sceneData.spawn.x,bounds.minX+PLAYER_HALF_W,bounds.maxX-PLAYER_HALF_W);
transform.z=INTERACTION_ROW_Z*terrain.tileSize;
transform.y=Number.isFinite(Number(p.y))?Number(p.y):safeSpawnY(transform.x,transform.z);
transform.yaw=Number.isFinite(p.yaw)?p.yaw:sceneData.spawn.yaw;
if(collidesAt(transform.x,transform.y,transform.z))transform.y=safeSpawnY(transform.x,transform.z);
velocity.x=velocity.y=velocity.z=0;
controller.grounded=groundProbe();
controller.crouching=false;controller.flying=false;controller.attacking=false;controller.action='idle';controller.inWater=false;controller.submerged=0;
health.current=clampHp(save.playerHp);
hunger.current=clampHunger(save.hunger??HUNGER_MAX);hunger.zeroDamageTimer=0;
resetFishing();
fishWorld.entities.length=0;fishWorld.spatial.clear();fishWorld.accumulator=0;fishWorld.spawnAccumulator=1;
controller.torchOn=!!save.torchOn;
worldMinutes=Number.isFinite(save.worldMinutes)?save.worldMinutes:360;
if(save.worldLayout!==WORLD_LAYOUT_ID&&save.npcState?.actors){
const defs=new Map(CONTENT.npcs.map(n=>[n.id,n]));
for(const row of save.npcState.actors){const d=defs.get(row.id);if(d?.spawn){row.x=d.spawn.x;row.z=d.spawn.z;row.y=safeSpawnY(row.x,row.z)}}
}
npcWorld.importState(save.npcState);save.worldLayout=WORLD_LAYOUT_ID;
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
if(!inventoryItems.some(item=>item?.id==='fishing-rod')){
const rodSlot=inventoryItems.findIndex(v=>!v);
if(rodSlot>=0)inventoryItems[rodSlot]={...itemClone(CONTENT.items['fishing-rod']),count:1};
renderInventory();
}
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