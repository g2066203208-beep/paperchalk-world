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
const cameraFov=byId('cameraFov');
const cameraFovValue=byId('cameraFovValue');
const cameraReset=byId('cameraReset');

const debugToggleBtn=byId('debugToggleBtn');
const debugPanel=byId('debugPanel');
const debugCloseBtn=byId('debugCloseBtn');
const debugStatus=byId('debugStatus');
const debugCommandForm=byId('debugCommandForm');
const debugCommandInput=byId('debugCommandInput');
const debugOutput=byId('debugOutput');

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
const INVENTORY_CAPACITY=20;
const FIXED_DT=1/60;
const MAX_FRAME_DT=.06;
const GRAVITY=22;
const JUMP_SPEED=7.4;
const PLAYER_SPEED=4.6;
const PLAYER_HALF_W=.34;
const PLAYER_HALF_H=.95;
const TERRAIN_REACH=4.5;
const KEY_USERS='paperchalk.localUsers.v1';
const KEY_SESSION='paperchalk.session.v1';
const KEY_SAVE_PREFIX='paperchalk.save.v5.';
const LEGACY_SAVE_PREFIXES=['paperchalk.save.v4.','paperchalk.save.v3.','paperchalk.save.v2.'];
const LEGACY_SINGLE_SAVE='paperchalk.save.v1';
const KEY_SETTINGS='paperchalk.settings.v2';
const sceneData=CONTENT.scene3d;
const bounds=sceneData.bounds;
const terrain=new TerrainRuntime.TerrainWorld({
  tileSize:sceneData.terrain?.tileSize??.25,
  chunkSize:sceneData.terrain?.chunkSize??64,
  seed:sceneData.terrain?.seed??24681357
});
window.PaperchalkTerrain=terrain;

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
  yaw:0,pitch:0,distance:18,fov:42,
  stageView:Object.freeze({enabled:true,axis:'z',side:1})
});
function getSettings(){
  const defaults={language:'zh-CN',timeScale:1,preferLandscape:true,camera3d:{...defaultCamera}};
  try{
    const parsed=JSON.parse(storageGet(KEY_SETTINGS)||'{}');
    const parsedCamera=parsed.camera3d||{};
    const camera3d={
      ...defaultCamera,
      ...parsedCamera,
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
const controller={
  grounded:true,crouching:false,attacking:false,attackTimer:0,attackCooldown:0,
  action:'idle',moving:false
};
const playerEntity=ecs.create({
  Transform:transform,
  Velocity:velocity,
  Health:health,
  Player:controller
});

// World collision now comes exclusively from the X/Y single-layer terrain.
const buildingColliders=[];

let active=false;
let worldMinutes=360;
let worldTimeScale=1;
let runtimeVersion=0;
let frameHandle=0;
let lastNow=0;
let accumulator=0;
let saveAccumulator=0;
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
    attacking:controller.attacking,action:controller.action
  };
}
function buildSnapshot(){
  return {
    version:runtimeVersion,
    active,
    player:playerSnapshot(),
    health:{current:health.current,max:health.max},
    world:{minutes:worldMinutes,clock:formatClock(),phase:worldPhase()},
    scene:{id:'village-paper-stage',name:'A村 · 单层体素纸片舞台'},
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
  version:4,
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
function collidesAt(x,y){
  return terrain.collidesAABB(x,y,PLAYER_HALF_W,PLAYER_HALF_H);
}
function groundProbe(x=transform.x,y=transform.y){
  return terrain.collidesAABB(x,y-.035,PLAYER_HALF_W*.92,PLAYER_HALF_H);
}
function moveHorizontal(dx){
  if(!dx)return;
  const nx=transform.x+dx;
  if(!collidesAt(nx,transform.y))transform.x=nx;
  else{
    const step=Math.sign(dx)*Math.min(Math.abs(dx),terrain.tileSize*.2);
    let remaining=Math.abs(dx);
    while(remaining>1e-4){
      const d=Math.sign(dx)*Math.min(Math.abs(step),remaining);
      if(collidesAt(transform.x+d,transform.y))break;
      transform.x+=d;remaining-=Math.abs(d);
    }
    velocity.x=0;
  }
}
function moveVertical(dy){
  if(!dy)return;
  const ny=transform.y+dy;
  if(!collidesAt(transform.x,ny)){transform.y=ny;controller.grounded=false;return}
  const sign=Math.sign(dy),step=sign*Math.min(Math.abs(dy),terrain.tileSize*.18);
  let remaining=Math.abs(dy);
  while(remaining>1e-4){
    const d=sign*Math.min(Math.abs(step),remaining);
    if(collidesAt(transform.x,transform.y+d))break;
    transform.y+=d;remaining-=Math.abs(d);
  }
  if(dy<0)controller.grounded=true;
  velocity.y=0;
}
function rawMoveInput(){
  let x=0;
  if(keys.has('KeyA')||keys.has('ArrowLeft'))x-=1;
  if(keys.has('KeyD')||keys.has('ArrowRight'))x+=1;
  x+=joystickAxisX;
  return {x:clamp(x,-1,1),magnitude:Math.min(1,Math.abs(x))};
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

ecs.registerSystem('player-movement',{
  require:['Transform','Velocity','Player'],phase:'fixed',priority:10,
  update(entity,world,dt,context){
    if(entity!==playerEntity)return;
    const input=context.interactive?rawMoveInput():{x:0,magnitude:0};
    const speed=PLAYER_SPEED*(controller.crouching?.48:1);
    velocity.x=input.x*speed;
    velocity.z=0;
    controller.moving=input.magnitude>.05;
    if(controller.moving)transform.yaw=velocity.x<0?Math.PI:0;
    moveHorizontal(velocity.x*dt);
  }
});
ecs.registerSystem('player-gravity',{
  require:['Transform','Velocity','Player'],phase:'fixed',priority:20,
  update(entity,world,dt){
    if(entity!==playerEntity)return;
    if(!groundProbe())controller.grounded=false;
    if(!controller.grounded)velocity.y-=GRAVITY*dt;
    moveVertical(velocity.y*dt);
    transform.z=sceneData.layers?.actor??.45;
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
    else if(!controller.grounded)controller.action=velocity.y>=0?'jump-up':'jump-down';
    else if(controller.crouching)controller.action='crouch';
    else if(controller.moving)controller.action='walk';
    else controller.action='idle';
  }
});

function jump(){
  if(!worldInteractive()||!controller.grounded)return false;
  controller.grounded=false;
  velocity.y=JUMP_SPEED;
  window.PaperchalkEvents?.emit('player:jump',{x:transform.x,y:transform.y,z:transform.z});
  publish();
  return true;
}
function attack(){
  if(!worldInteractive()||controller.attackCooldown>0)return false;
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
window.PaperchalkHealth=Object.freeze({
  maxHp:PLAYER_MAX_HP,
  get state(){return {hp:health.current,maxHp:health.max}},
  set(value,options){return setPlayerHp(value,options)},
  damage:damagePlayer,
  heal:healPlayer
});
window.PaperchalkCombat=Object.freeze({
  get player(){return playerSnapshot()},
  jump,attack,setCrouch,
  damagePlayer,healPlayer,setPlayerHp
});

function safeSpawnY(x=sceneData.spawn.x){
  return terrain.highestGroundY(x)+PLAYER_HALF_H+.03;
}
function teleport(x,y=null,{notice=''}={}){
  const nx=Number.isFinite(Number(x))?Number(x):sceneData.spawn.x;
  let ny=Number.isFinite(Number(y))?Number(y):safeSpawnY(nx);
  if(collidesAt(nx,ny))ny=safeSpawnY(nx);
  transform.x=nx;transform.y=ny;transform.z=sceneData.layers?.actor??.45;
  velocity.x=velocity.y=velocity.z=0;
  controller.grounded=groundProbe(nx,ny);
  if(notice)showMapNotice(notice);
  publish();
  return true;
}
window.PaperchalkMap=Object.freeze({
  get player(){return playerSnapshot()},
  get scene3d(){return sceneData},
  get nodes(){return CONTENT.world.nodes},
  get routes(){return CONTENT.world.routes},
  teleport,
  reset(){return teleport(sceneData.spawn.x,null,{notice:'已返回出生点'})}
});
window.PaperchalkScene=Object.freeze({
  get location(){return 'village-paper-stage'},
  get transitioning(){return false}
});

function terrainTargetInReach(point){
  if(!point)return false;
  return Math.hypot(point.x-transform.x,point.y-transform.y)<=TERRAIN_REACH;
}
function digTerrainAt(x,y,{persist=true}={}){
  if(!terrainTargetInReach({x,y}))return {changed:false,reason:'out-of-reach'};
  const result=terrain.digWorld(x,y);
  if(result.changed){
    window.PaperchalkEvents?.emit('terrain:changed',{...result,action:'dig'});
    publish();if(persist)saveWorldState();
  }
  return result;
}
function placeTerrainAt(x,y,tile=TerrainRuntime.TILE.DIRT,{persist=true}={}){
  if(!terrainTargetInReach({x,y}))return {changed:false,reason:'out-of-reach'};
  const cell=terrain.worldToCell(x,y),center=terrain.cellCenter(cell.gx,cell.gy),half=terrain.tileSize*.49;
  const overlapsPlayer=Math.abs(center.x-transform.x)<PLAYER_HALF_W+half&&Math.abs(center.y-transform.y)<PLAYER_HALF_H+half;
  if(overlapsPlayer)return {changed:false,reason:'player-overlap'};
  const result=terrain.placeWorld(x,y,tile);
  if(result.changed){
    window.PaperchalkEvents?.emit('terrain:changed',{...result,action:'place'});
    publish();if(persist)saveWorldState();
  }
  return result;
}
window.PaperchalkTerrainActions=Object.freeze({
  dig:digTerrainAt,
  place:placeTerrainAt,
  get stats(){return terrain.stats()},
  get edits(){return terrain.exportEdits()}
});

worldEl.addEventListener('contextmenu',event=>{
  if(event.target?.closest?.('.three-world-canvas'))event.preventDefault();
});
worldEl.addEventListener('pointerup',event=>{
  if(!worldInteractive()||!event.target?.closest?.('.three-world-canvas'))return;
  if(event.button!==0&&event.button!==2)return;
  const point=window.Paperchalk3D?.screenToWorld?.(event.clientX,event.clientY);
  if(!point)return;
  const result=event.button===2?placeTerrainAt(point.x,point.y):digTerrainAt(point.x,point.y);
  if(!result.changed&&result.reason==='out-of-reach')showMapNotice('太远了');
});

let inventoryItems=Array.from({length:INVENTORY_CAPACITY},()=>null);
let inventorySelected=-1;
function itemClone(item){return item?JSON.parse(JSON.stringify(item)):null}
function inventorySnapshot(){return inventoryItems.map(itemClone)}
function setInventoryFromSave(saved){
  inventoryItems=Array.from({length:INVENTORY_CAPACITY},(_,i)=>itemClone(Array.isArray(saved)?saved[i]:null));
  inventorySelected=-1;
  renderInventory();
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
}
function addInventoryItem(item){
  if(!item)return false;
  const stack=inventoryItems.find(v=>v&&v.id===item.id);
  if(stack){stack.count=(stack.count||1)+(item.count||1);renderInventory();saveWorldState();return true}
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
    inventoryItems[i]=itemClone(item);renderInventory();saveWorldState();return itemClone(inventoryItems[i]);
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
  cameraFov.value=String(Number(c.fov).toFixed(0));
  cameraFovValue.textContent=Number(c.fov).toFixed(0)+'°';
}
function pushCameraPanel(){
  const config={
    ...settings.camera3d,
    pitch:Number(cameraPitch.value)*Math.PI/180,
    distance:Number(cameraDistance.value),
    fov:Number(cameraFov.value)
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
cameraFov.addEventListener('input',pushCameraPanel);
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
    ' · 单层体素 '+ts.loadedChunks+' chunks / '+ts.editedTiles+' edits'+
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
  if(cmd==='help')return 'hp 5 | hp +1 | tp X Y | reset | collider | stage on/off | axis x/z | terrain | stats | save';
  if(cmd==='hp'){
    const token=args[0]||'';
    const n=Number(token);
    if(!Number.isFinite(n))return '用法：hp 5 / hp +1 / hp -1';
    const target=/^[+-]/.test(token)?health.current+n:n;
    return 'HP -> '+setPlayerHp(target)+' / '+PLAYER_MAX_HP;
  }
  if(cmd==='tp'){
    const x=Number(args[0]),y=Number(args[1]);
    if(!Number.isFinite(x)||!Number.isFinite(y))return '用法：tp 0 -8';
    teleport(x,y,{notice:'调试传送'});
    return 'XY -> '+transform.x.toFixed(1)+', '+transform.y.toFixed(1);
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
    else if(a==='full')setPlayerHp(PLAYER_MAX_HP);
    else if(a==='resetpos')window.PaperchalkMap.reset();
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
  if(event.code==='Space'){if(!event.repeat)jump();event.preventDefault();return}
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
  controller.crouching=keyboardCrouch||mobileCrouch;
  ecs.runPhase('fixed',dt,{interactive});
  if(active){
    worldMinutes=(worldMinutes+worldTimeScale*dt)%1440;
    paperClock.textContent=formatClock();
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
    location:'A村 · 单层体素纸片舞台',
    createdAt:Date.now(),
    worldMinutes:360,
    player:{...sceneData.spawn},
    playerHp:PLAYER_MAX_HP,
    terrainEdits:[],
    mapState:{broken:[],collected:[],visitedRoutes:[0],visitedNodes:['village'],exitReached:false},
    inventory:Array.from({length:INVENTORY_CAPACITY},()=>null)
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
  save.location='A村 · 单层体素纸片舞台';
  save.worldMinutes=worldMinutes;
  save.player={x:transform.x,y:transform.y,z:sceneData.layers?.actor??.45,yaw:transform.yaw};
  save.playerHp=health.current;
  save.terrainEdits=terrain.exportEdits();
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
  const p=save.player||sceneData.spawn;
  transform.x=Number.isFinite(Number(p.x))?Number(p.x):sceneData.spawn.x;
  transform.y=Number.isFinite(Number(p.y))?Number(p.y):safeSpawnY(transform.x);
  transform.z=sceneData.layers?.actor??.45;
  transform.yaw=Number.isFinite(p.yaw)?p.yaw:sceneData.spawn.yaw;
  if(collidesAt(transform.x,transform.y))transform.y=safeSpawnY(transform.x);
  velocity.x=velocity.y=velocity.z=0;
  controller.grounded=groundProbe();
  controller.crouching=false;controller.attacking=false;controller.action='idle';
  health.current=clampHp(save.playerHp);
  worldMinutes=Number.isFinite(save.worldMinutes)?save.worldMinutes:360;
  setInventoryFromSave(save.inventory);
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

addEventListener('pagehide',saveWorldState);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)saveWorldState()});
addEventListener('unhandledrejection',event=>{
  console.error('UNHANDLED_REJECTION',event.reason);
  if(!uiShell.classList.contains('is-hidden'))authMsg.textContent='运行错误：'+String(event.reason?.message||event.reason||'未知错误');
});

applySettings();
setInventoryFromSave([]);
paperClock.textContent=formatClock();
refreshMenu();
showPage('menu');
const appState=window.PaperchalkAppState;
if(appState?.state==='boot'&&appState.can('menu'))appState.transition('menu',{source:'boot'});
worldEl.setAttribute('inert','');
publish();

})();
