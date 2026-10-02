import {createPaperScene} from './rendering/index.js';
import {TerrainPlayerSimulation} from './core/TerrainPlayerSimulation.mjs';
import {SaveStore} from './core/SaveStore.mjs';
import {InputActions} from './input/InputActions.mjs';
import {installStudioLifecycle} from './core/Lifecycle.mjs';
import {wantsGamePresentation,PauseReasons} from './ui/GamePresentation.mjs';

const $=id=>document.getElementById(id);
const ui=Object.fromEntries(['viewport','appStatus','loadingStatus','toast','playPause','resetPlayer','terrainDigBtn','terrainPlaceBtn','saveProgress','loadProgress','resetCamera','toggleInspector','closeInspector','autoCycle','resetPaper','followSun','fps','playerPosition','playerState','saveStatus','buildVersion','renderStats','moveLeft','moveRight','jumpButton','terrainDigTouch','terrainPlaceTouch','openGameMenu','gameMenu','resumeGame','gameReset','gameResetCamera','gameSave','gameLoad','gameSettings','gameSaveStatus','gameBuildVersion','inspector'].map(id=>[id,$(id)]));
const defaults={scale:1.8,normal:0,height:0,blend:0};
const paperInputs={paperScale:'scale',paperNormal:'normal'};
const saves=new SaveStore();
const events=new AbortController();
const heldControls=new Set();
const pauseReasons=new PauseReasons();
const coarsePointer=window.matchMedia('(any-pointer: coarse)');
let scene,world,simulation,input,ready=false,failed=false,disposed=false,nativeSuspended=false,gameMode=false,surfaceMode='pulp';
const WORLD_SAVE_KEY='paperchalk-world-density-v1';
let raf=0,lastTime=0,accumulator=0,renderClock=performance.now(),statusTime=0,lastRendered=0,toastTimer=0;
const STEP=1/60;
const disposeLifecycle=installStudioLifecycle({
  saveNow:()=>saveProgress(true),
  resetClock,
  handleBack:()=>{
    if(!document.body.classList.contains('inspector-hidden')){setInspector(false);return true;}
    if(gameMode){setGameMenu(!pauseReasons.menu);return true;}
    const details=document.querySelector('.render-details[open]');
    if(details){details.open=false;return true;}
    return false;
  },
  setNativeSuspended:value=>{nativeSuspended=value;},
  resumeView:()=>window.dispatchEvent(new Event('resize')),
  discard:dispose,
});

function listen(element,event,callback,options={}){
  element.addEventListener(event,callback,{...options,signal:events.signal});
}
function toast(message){
  clearTimeout(toastTimer);ui.toast.textContent=message;ui.toast.hidden=false;
  toastTimer=setTimeout(()=>{ui.toast.hidden=true;},3200);
}
function setStatus(){
  const paused=pauseReasons.active;
  ui.appStatus.textContent=failed?'画面待恢复':!ready?'正在载入':paused?'场景已暂停':'横版世界 · 运行中';
  ui.playPause.textContent=paused?'继续':'暂停';
  ui.playPause.setAttribute('aria-pressed',String(paused));
  ui.openGameMenu.setAttribute('aria-expanded',String(pauseReasons.menu));
}
function sceneStatus({state,message}){
  if(disposed)return;
  if(state==='error'){
    failed=true;input?.cancel();ui.loadingStatus.textContent=message;
    ui.loadingStatus.classList.add('error');ui.loadingStatus.hidden=false;
  }else if(state==='ready'){
    failed=false;ui.loadingStatus.hidden=true;ui.loadingStatus.classList.remove('error');
    lastTime=0;accumulator=0;
  }else if(state==='loading')ui.appStatus.textContent=message;
  setStatus();
}
function updateControls(){
  const state=scene.getState();
  surfaceMode=state.surfaceMode||surfaceMode;
  for(const button of document.querySelectorAll('[data-surface]')){
    const active=button.dataset.surface===surfaceMode;
    button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
  }
  for(const id of Object.keys(paperInputs))$(id).disabled=surfaceMode==='color';
  ui.resetPaper.disabled=surfaceMode==='color';
  for(const button of document.querySelectorAll('[data-preset]')){
    const active=button.dataset.preset===state.timePreset&&!state.auto&&!state.manualSun;
    button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
  }
  ui.autoCycle.checked=state.auto;
  $('shaftStrength').value=String(Math.round(state.shaftStrength*100));
  $('shaftStrengthValue').textContent=state.shaftStrength.toFixed(2)+'×';
  $('shaftStrength').disabled=!state.godrays;
  for(const checkbox of document.querySelectorAll('[data-feature]'))checkbox.checked=state[checkbox.dataset.feature];
  for(const [id,key] of Object.entries(paperInputs)){
    const value=state.paper[key];$(id).value=String(Math.round(value*100));
    $(id+'Value').textContent=key==='blend'?`${Math.round(value*100)}%`:`${value.toFixed(2)}${key==='scale'?'×':''}`;
  }
  for(const [id,key] of [['sunAzimuth','sunAzimuth'],['sunElevation','sunElevation']]){
    $(id).value=String(state[key]);$(id+'Value').textContent=`${Math.round(state[key])}°`;
  }
}
function refreshStatus(now,force=false){
  if(!ready||(!force&&now-statusTime<350))return;
  const state=simulation.snapshot(),stats=scene.getStats();
  ui.playerPosition.textContent=`X ${state.x.toFixed(2)} · Y ${state.y.toFixed(2)} · Z 0`;
  ui.playerState.textContent=pauseReasons.active?'已暂停':!state.grounded?(state.vy>0?'跃起':'落下'):Math.abs(state.vx)>.05?'移动中':'站立';
  if(statusTime&&now>statusTime)ui.fps.textContent=String(Math.round((stats.renderedFrames-lastRendered)*1000/(now-statusTime)));
  ui.renderStats.textContent=`${stats.drawCalls} 次绘制 · ${stats.triangles.toLocaleString()} 个三角形\n连续地形 ${stats.terrain.baseTriangles.toLocaleString()} 个三角面 · ${stats.terrain.editedSamples} 处编辑\n${stats.size.width} × ${stats.size.height} · 像素倍率 ${stats.pixelRatio.toFixed(2)}\n固定物理步 60 Hz · 渲染按需更新`;
  const shafts=stats.volumetrics;
  ui.renderStats.textContent+='\n丁达尔光柱：'+(!shafts.supported?'此设备图形能力不支持':!shafts.enabled?'已关闭':shafts.effectiveStrength.toFixed(2)+'× · 已渲染 '+shafts.renderedFrames+' 帧');
  lastRendered=stats.renderedFrames;statusTime=now;
}
function resetClock(){lastTime=0;accumulator=0;for(const cancel of heldControls)cancel();input?.cancel();}
function saveProgress(automatic=false){
  if(!ready||disposed)return false;
  const result=saveWorldState()?saves.save(simulation.snapshot()):{ok:false};
  ui.saveStatus.textContent=result.ok?`已${automatic?'自动':''}保存 ${new Date(result.savedAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}`:'保存失败：本地存储不可用';
  ui.gameSaveStatus.textContent=ui.saveStatus.textContent;
  if(!automatic)toast(result.ok?'已保存角色进度到此设备':'无法保存，请检查是否允许本站使用本地存储');
  return result.ok;
}
function loadProgress(automatic=false){
  const result=saves.load();
  if(result.ok&&result.snapshot){
    const restored=simulation.restore(result.snapshot);resetClock();
    ui.saveStatus.textContent=restored?'已读取保存的进度':'存档位置已失效，角色返回起点';
    if(!automatic)toast(restored?'已读取角色进度':'该位置已不适合当前地形，已安全回到起点');
  }else{
    const message={empty:'尚未保存',corrupt:'存档损坏，当前场景可继续使用',unsupported:'此存档版本暂不支持',unavailable:'本地存储不可用'}[result.status]||'无法读取进度';
    ui.saveStatus.textContent=message;if(!automatic)toast(message);
  }
  ui.gameSaveStatus.textContent=ui.saveStatus.textContent;
}
function saveWorldState(){
  try{localStorage.setItem(WORLD_SAVE_KEY,world.serialize());return true;}catch{return false;}
}
function loadWorldState(){
  try{
    const raw=localStorage.getItem(WORLD_SAVE_KEY);
    if(!raw)return false;
    const restored=world.restore(raw);
    if(restored)scene.rebuildTerrain();
    return restored;
  }catch{return false;}
}
function editWorld(action){
  if(!ready||pauseReasons.active)return;
  const player=simulation.snapshot(),facing=player.facing||1;
  const center={x:player.x+facing*(action==='dig'?1.1:1.35),y:player.y-.27,z:0};
  const radius=.85;
  if(action==='place'&&simulation.intersectsBrush(center,radius)){toast('角色站在放置位置');return;}
  const result=world.brush(center,{radius,mode:action==='dig'?'dig':'add'});
  if(result.changed){scene.rebuildTerrain();saveWorldState();toast(action==='dig'?'已挖开一片土地':'已填上一片土地');}
  else toast(action==='dig'?'这里已经挖空':'这里没有可填的位置');
  refreshStatus(performance.now(),true);
}
function heldButton(element,setHeld){
  const active=new Set();let keyboardHeld=false,pulseHeld=false,pulseTimer=0;
  const update=()=>{const held=active.size>0||keyboardHeld||pulseHeld;element.classList.toggle('pressed',held);setHeld(held);};
  const cancel=()=>{active.clear();keyboardHeld=false;pulseHeld=false;clearTimeout(pulseTimer);update();};
  heldControls.add(cancel);
  listen(element,'pointerdown',event=>{
    if(event.pointerType==='mouse'&&event.button!==0)return;
    event.preventDefault();ui.viewport.focus({preventScroll:true});
    active.add(event.pointerId);
    try{element.setPointerCapture(event.pointerId);}catch{/* A platform cancellation can precede capture. */}
    update();
  });
  const release=event=>{active.delete(event.pointerId);update();};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])listen(element,event,release);
  listen(element,'contextmenu',event=>event.preventDefault());
  listen(element,'keydown',event=>{
    if(!['Enter',' '].includes(event.key))return;
    event.preventDefault();keyboardHeld=true;update();
  });
  listen(element,'keyup',event=>{
    if(!['Enter',' '].includes(event.key))return;
    event.preventDefault();keyboardHeld=false;update();
  });
  listen(element,'click',event=>{
    if(event.detail!==0)return;
    pulseHeld=true;update();clearTimeout(pulseTimer);
    pulseTimer=setTimeout(()=>{pulseHeld=false;update();},180);
  });
  listen(element,'blur',()=>{keyboardHeld=false;update();});
  listen(window,'blur',cancel);
  listen(document,'visibilitychange',()=>{if(document.hidden)cancel();});
  events.signal.addEventListener('abort',()=>{cancel();heldControls.delete(cancel);},{once:true});
}
function setInspector(open){
  if(gameMode&&open)pauseReasons.openMenu();
  document.body.classList.toggle('inspector-hidden',!open);
  ui.toggleInspector.setAttribute('aria-expanded',String(open));
  if(gameMode){
    ui.inspector.setAttribute('role','dialog');ui.inspector.setAttribute('aria-modal','true');
    ui.gameMenu.hidden=open||!pauseReasons.menu;
    document.body.classList.toggle('game-menu-open',pauseReasons.menu);
    if(open)ui.closeInspector.focus({preventScroll:true});
    else if(pauseReasons.menu)ui.gameSettings.focus({preventScroll:true});
  }
  resetClock();
  if(!gameMode&&!open)ui.toggleInspector.focus({preventScroll:true});
  setStatus();
}
function setGameMenu(open,{resume=false}={}){
  if(!gameMode)return;
  if(resume)pauseReasons.resume();else if(open)pauseReasons.openMenu();else pauseReasons.closeMenu();
  document.body.classList.add('inspector-hidden');
  ui.toggleInspector.setAttribute('aria-expanded','false');
  ui.gameMenu.hidden=!pauseReasons.menu;
  document.body.classList.toggle('game-menu-open',pauseReasons.menu);
  resetClock();setStatus();
  (pauseReasons.menu?ui.resumeGame:ui.viewport).focus({preventScroll:true});
}
function refreshPresentation(){
  const next=wantsGamePresentation({userAgent:navigator.userAgent,search:location.search,coarse:coarsePointer.matches,width:innerWidth,height:innerHeight});
  if(next===gameMode)return;
  gameMode=next;document.body.classList.toggle('game-mode',gameMode);
  document.body.classList.add('inspector-hidden');document.body.classList.remove('game-menu-open');
  pauseReasons.closeMenu();ui.gameMenu.hidden=true;ui.toggleInspector.setAttribute('aria-expanded','false');
  ui.inspector.removeAttribute('role');ui.inspector.removeAttribute('aria-modal');
  document.title=gameMode?'纸艺世界':'纸艺世界 · 重构工作室';
  resetClock();setStatus();
}
function keepModalFocus(event){
  if(event.key!=='Tab'||!gameMode||!pauseReasons.menu)return;
  const root=document.body.classList.contains('inspector-hidden')?ui.gameMenu:ui.inspector;
  const items=[...root.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')].filter(element=>element.getClientRects().length);
  if(!items.length)return;
  const first=items[0],last=items[items.length-1];
  if(!root.contains(document.activeElement)){event.preventDefault();(event.shiftKey?last:first).focus();}
  else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
}
async function loadBuildInfo(){
  try{
    const response=await fetch(new URL('./build-info.json',import.meta.url),{cache:'no-store',signal:events.signal});
    if(!response.ok)throw new Error('Build information unavailable');
    const info=await response.json();
    if(info.version==='dev'){
      ui.buildVersion.textContent='开发预览';ui.buildVersion.title='本机开发版本';ui.gameBuildVersion.textContent=ui.buildVersion.textContent;return;
    }
    if(typeof info.version!=='string'||!/^[a-f0-9]{7,40}$/.test(info.version))throw new Error('Invalid build information');
    ui.buildVersion.textContent=`构建 ${info.version.slice(0,7)}`;
    const date=new Date(info.publishedAt);
    ui.buildVersion.title=`版本 ${info.version}${Number.isFinite(date.getTime())?` · 发布 ${date.toLocaleString('zh-CN')}`:''}`;
    ui.gameBuildVersion.textContent=ui.buildVersion.textContent;
  }catch{
    if(disposed)return;
    ui.buildVersion.textContent='版本待确认';ui.buildVersion.title='暂时无法读取此构建的版本信息';
    ui.gameBuildVersion.textContent=ui.buildVersion.textContent;
  }
}
function wireControls(){
  listen(ui.viewport,'pointerdown',()=>ui.viewport.focus({preventScroll:true}));
  listen(ui.playPause,'click',()=>{pauseReasons.toggleUser();resetClock();setStatus();refreshStatus(performance.now(),true);});
  listen(ui.resetPlayer,'click',()=>{simulation.reset();resetClock();toast('角色已回到起点');refreshStatus(performance.now(),true);});
  listen(ui.terrainDigBtn,'click',()=>editWorld('dig'));
  listen(ui.terrainPlaceBtn,'click',()=>editWorld('place'));
  listen(ui.terrainDigTouch,'click',()=>editWorld('dig'));
  listen(ui.terrainPlaceTouch,'click',()=>editWorld('place'));
  listen(ui.saveProgress,'click',()=>saveProgress());
  listen(ui.loadProgress,'click',()=>{loadProgress();refreshStatus(performance.now(),true);});
  listen(ui.resetCamera,'click',()=>{scene.resetCamera();toast('已恢复初始观察角度');});
  listen(ui.toggleInspector,'click',()=>setInspector(document.body.classList.contains('inspector-hidden')));
  listen(ui.closeInspector,'click',()=>setInspector(false));
  listen(ui.openGameMenu,'click',()=>setGameMenu(true));
  listen(ui.resumeGame,'click',()=>setGameMenu(false,{resume:true}));
  listen(ui.gameReset,'click',()=>{simulation.reset();setGameMenu(false,{resume:true});toast('角色已回到起点');});
  listen(ui.gameResetCamera,'click',()=>{scene.resetCamera();toast('已恢复初始观察角度');});
  listen(ui.gameSave,'click',()=>saveProgress());
  listen(ui.gameLoad,'click',()=>{loadProgress();refreshStatus(performance.now(),true);});
  listen(ui.gameSettings,'click',()=>setInspector(true));
  listen(window,'keydown',event=>{keepModalFocus(event);if(event.key==='Escape'&&window.PaperchalkHandleBack())event.preventDefault();});
  for(const button of document.querySelectorAll('[data-surface]'))listen(button,'click',()=>{surfaceMode=button.dataset.surface;scene.setSurfaceMode(surfaceMode);updateControls();});
  for(const button of document.querySelectorAll('[data-preset]'))listen(button,'click',()=>{scene.setTimePreset(button.dataset.preset);updateControls();if(pauseReasons.active)toast('已选择光线，继续游戏后开始过渡');});
  listen(ui.autoCycle,'change',()=>{scene.setAutoCycle(ui.autoCycle.checked);updateControls();});
  for(const checkbox of document.querySelectorAll('[data-feature]'))listen(checkbox,'change',()=>{scene.setFeature(checkbox.dataset.feature,checkbox.checked);updateControls();});
  listen($('shaftStrength'),'input',()=>{scene.setShaftStrength(Number($('shaftStrength').value)/100);updateControls();});
  for(const [id,key] of Object.entries(paperInputs))listen($(id),'input',()=>{scene.setPaper({[key]:Number($(id).value)/100});updateControls();});
  listen(ui.resetPaper,'click',()=>{scene.setPaper(defaults);updateControls();});
  for(const id of ['sunAzimuth','sunElevation'])listen($(id),'input',()=>{scene.setSun({azimuth:Number($('sunAzimuth').value),elevation:Number($('sunElevation').value),manual:true});updateControls();});
  listen(ui.followSun,'click',()=>{scene.setSun({manual:false});updateControls();toast('太阳方向已恢复跟随昼夜');});
  heldButton(ui.moveLeft,value=>input.setVirtualLeft(value));
  heldButton(ui.moveRight,value=>input.setVirtualRight(value));
  heldButton(ui.jumpButton,value=>input.setVirtualJump(value));
}
function tick(now){
  if(disposed)return;
  const elapsed=lastTime?Math.min(.1,Math.max(0,(now-lastTime)/1000)):0;lastTime=now;
  if(ready&&!failed&&!nativeSuspended&&!document.hidden){
    try{
      const paused=pauseReasons.active;
      if(!paused){
        accumulator+=elapsed;
        while(accumulator>=STEP){simulation.update(STEP,input.consume());accumulator-=STEP;}
        renderClock+=elapsed*1000;
      }else{accumulator=0;input.cancel();}
      scene.frame(paused?0:elapsed,renderClock,simulation.snapshot());refreshStatus(now);
    }catch(error){sceneStatus({state:'error',message:'场景运行出现错误，请刷新重试。'});console.error(error);}
  }
  raf=requestAnimationFrame(tick);
}
function dispose(){
  if(disposed)return;disposed=true;cancelAnimationFrame(raf);clearTimeout(toastTimer);
  disposeLifecycle();events.abort();input?.dispose();scene?.dispose();
}
async function start(){
  refreshPresentation();listen(window,'resize',refreshPresentation);listen(coarsePointer,'change',refreshPresentation);
  loadBuildInfo();
  for(const button of document.querySelectorAll('.toolbar button'))button.disabled=true;
  try{
    scene=createPaperScene({container:ui.viewport,onStatus:sceneStatus});
    world=scene.getWorld();
    simulation=new TerrainPlayerSimulation(world);input=new InputActions({target:window,viewport:ui.viewport});
    await scene.ready;
    if(disposed)return;
    ready=true;loadWorldState();loadProgress(true);wireControls();updateControls();setStatus();
    for(const button of document.querySelectorAll('.toolbar button'))button.disabled=false;
    ui.openGameMenu.disabled=false;
    raf=requestAnimationFrame(tick);
  }catch(error){if(disposed)return;sceneStatus({state:'error',message:error.message||'无法载入纸艺场景，请刷新重试。'});console.error(error);}
}
start();
