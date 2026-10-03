import {createPaperScene} from './rendering/index.js';
import {StagePlayerSimulation} from './core/StagePlayerSimulation.mjs';
import {SaveStore} from './core/SaveStore.mjs';
import {InputActions} from './input/InputActions.mjs';
import {installStudioLifecycle} from './core/Lifecycle.mjs';
import {wantsGamePresentation,PauseReasons} from './ui/GamePresentation.mjs';
import {CITY_SCENE_ID,sceneFromSearch,sceneSaveKey,cityLocation,nearbyCitySight,acceptsInspectionKey} from './ui/CityPrologue.mjs';
import {createCityExplorer} from './ui/CityExplorer.mjs';
import {BUS_STOPS,METRO_STATIONS,nearbyTransit,travelDuration} from './world/CityLayout.mjs';

const $=id=>document.getElementById(id);
const ui=Object.fromEntries(['viewport','appStatus','loadingStatus','toast','scenePrompt','scenePromptTitle','scenePromptText','playPause','resetPlayer','saveProgress','loadProgress','resetCamera','toggleInspector','closeInspector','autoCycle','resetPaper','followSun','fps','playerPosition','playerState','saveStatus','buildVersion','renderStats','moveLeft','moveRight','openGameMenu','gameMenu','resumeGame','gameReset','gameResetCamera','gameSave','gameLoad','gameSettings','gameSaveStatus','gameBuildVersion','inspector','prologueHud','locationLabel','inspectAction','inspectActionLabel','inspectionOverlay','inspectionTitle','inspectionText','closeInspection'].map(id=>[id,$(id)]));
const defaults={scale:1.8,normal:0,height:0,blend:0};
const paperInputs={paperScale:'scale'};
const sceneId=sceneFromSearch(location.search),isCity=sceneId===CITY_SCENE_ID;
const saves=new SaveStore({key:sceneSaveKey(sceneId)});
const events=new AbortController();
const heldControls=new Set();
const pauseReasons=new PauseReasons();
const coarsePointer=window.matchMedia('(any-pointer: coarse)');
let scene,world,simulation,input,ready=false,failed=false,disposed=false,nativeSuspended=false,gameMode=false,surfaceMode='pulp';
let inspectionOpen=false;
let cityExplorer=null,cityRide=null,worldHandoff=false;
let raf=0,lastTime=0,accumulator=0,renderClock=performance.now(),statusTime=0,lastRendered=0,toastTimer=0,scenePromptTimer=0;
const STEP=1/60;
const disposeLifecycle=installStudioLifecycle({
  saveNow:()=>saveProgress(true),
  resetClock,
  handleBack:()=>{
    if(cityExplorer?.close())return true;
    // Interior rooms are part of the world handoff, so Back/Esc folds the
    // room card away before considering menus or inspection chrome.
    if(scene?.cityInterior?.())return leaveCityInterior();
    if(inspectionOpen){closeInspection();return true;}
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
/**
 * Show a short in-world echo without taking the player out of the scene.
 * Exploration text used to open a full-screen inspection card and pause the
 * simulation. Keep the message small and transient so movement, ambience and
 * the camera remain continuous while the player reads it.
 */
function scenePrompt(title,text){
  if(!ui.scenePrompt)return;
  clearTimeout(scenePromptTimer);
  ui.scenePromptTitle.textContent=title||'';
  ui.scenePromptText.textContent=text||'';
  ui.scenePrompt.hidden=!title&&!text;
  scenePromptTimer=setTimeout(()=>{ui.scenePrompt.hidden=true;},4600);
}
function hideScenePrompt(){
  clearTimeout(scenePromptTimer);
  if(ui.scenePrompt)ui.scenePrompt.hidden=true;
}
function setStatus(){
  const paused=pauseReasons.active;
  ui.appStatus.textContent=failed?'画面待恢复':!ready?'正在载入':paused?'场景已暂停':isCity?'序幕 · 放学归途':'纸艺世界 · 自由漫游';
  ui.playPause.textContent=paused?'继续':'暂停';
  ui.playPause.setAttribute('aria-pressed',String(paused));
  ui.openGameMenu.setAttribute('aria-expanded',String(pauseReasons.menu&&!inspectionOpen));
  refreshCityHud();
}
function refreshCityHud(){
  ui.prologueHud.hidden=!isCity;
  const x=simulation?.snapshot().x??0,sight=cityInteraction();
  ui.locationLabel.textContent=cityLocation(x);
  ui.inspectAction.hidden=!isCity||!ready||failed||pauseReasons.active||!!cityRide||!sight||!document.body.classList.contains('inspector-hidden');
  if(sight)ui.inspectActionLabel.textContent=sight.label;
}
function cityInteraction(){
  if(!isCity||!simulation||cityRide)return null;
  const x=simulation.snapshot().x;
  const activeInterior=scene?.cityInterior?.();
  if(activeInterior){
    const door=scene?.nearbyCityInterior?.(x);
    return door?.id===activeInterior?{...door,type:'interior-exit',label:'回到街道',title:'回到街道',text:'走出门口，继续沿着城市街道漫游。'}:null;
  }
  const stop=nearbyTransit(x);
  if(stop)return {...stop,type:'transit',label:stop.kind==='metro'?'进入地铁站':'上车 · '+stop.name};
  const interior=scene?.nearbyCityInterior?.(x);
  if(interior)return {...interior,type:'interior',label:'进入室内'};
  const sight=nearbyCitySight(x);if(sight)return sight;
  const person=scene?.nearbyCityPerson?.(x);
  return person?{...person,type:'person',label:'交谈 · '+person.name,title:person.name+' · '+person.role,text:person.line}:null;
}
function beginCityTravel(from,to){
  if(!ready||cityRide||scene?.cityInterior?.()||Math.abs(simulation.snapshot().x-from.x)>from.radius+.2)return;
  cityRide={kind:from.kind,fromX:from.x,toX:to.x,fromName:from.name,toName:to.name,
    direction:to.x>from.x?1:-1,progress:0,elapsed:0,duration:travelDuration(from,to)};
  resetClock();worldHandoff=true;scene.setCityRide(cityRide);document.body.classList.add('city-riding');
  cityExplorer.update(from.x,cityRide);ui.viewport.focus({preventScroll:true});refreshCityHud();
}
function finishCityTravel(cancelled=false){
  if(!cityRide)return;
  const {fromX,toX,fromName,toName,direction}=cityRide;
  const x=cancelled?fromX:toX;
  simulation.restore({x,y:world.surfaceY(x),facing:direction,vx:0,distance:simulation.snapshot().distance});
  cityRide=null;worldHandoff=true;scene.setCityRide(null);document.body.classList.remove('city-riding');resetClock();
  scene.frame(0,renderClock,simulation.snapshot());scene.resetCamera();
  cityExplorer.update(x,null);saveProgress(true);refreshCityHud();toast('已到达 '+(cancelled?fromName:toName));
}
function enterCityInterior(interior){
  if(!interior||!scene?.setCityInterior||scene.cityInterior?.()||cityRide)return false;
  const x=interior.entranceX??interior.x;
  resetClock();input?.cancel();hideScenePrompt();
  simulation.restore({x,y:world.surfaceY(x),facing:simulation.snapshot().facing,vx:0,distance:simulation.snapshot().distance});
  // House entry is immediate. Transit owns the only travelling handoff; an
  // interior is simply the already-loaded room layer at the current position.
  scene.setCityInterior(interior);scene.frame(0,renderClock,simulation.snapshot());
  saveProgress(true);refreshCityHud();
  return true;
}
function leaveCityInterior(){
  if(!scene?.cityInterior?.())return false;
  resetClock();input?.cancel();hideScenePrompt();
  scene.leaveCityInterior();scene.frame(0,renderClock,simulation.snapshot());
  saveProgress(true);refreshCityHud();
  return true;
}
function openInspection({explicit=false}={}){
  if(!isCity||!ready||failed||pauseReasons.active||!document.body.classList.contains('inspector-hidden'))return;
  const sight=cityInteraction();if(!sight)return;
  if(sight.type==='interior'){enterCityInterior(sight);return;}
  if(sight.type==='interior-exit'){leaveCityInterior();return;}
  if(sight.type==='transit'){
    // Boarding is a world action. The next stop follows the character's
    // facing, so a station never opens a destination card over the scene.
    const stops=sight.kind==='metro'?METRO_STATIONS:BUS_STOPS;
    const forward=simulation.snapshot().facing>=0;
    const candidates=stops.filter(stop=>forward?stop.x>sight.x:stop.x<sight.x);
    const destination=(forward?candidates[0]:candidates.at(-1))??(forward?stops[0]:stops.at(-1));
    scenePrompt(sight.kind==='metro'?'进入地铁站 · '+sight.name:'上车 · '+sight.name,
      `列车将前往 ${destination.name}，场景会从站台中间展开。`);
    beginCityTravel(sight,destination);
    return;
  }
  scenePrompt(sight.title,sight.text);
}
function closeInspection(){
  if(!inspectionOpen){
    hideScenePrompt();
    return;
  }
  inspectionOpen=false;pauseReasons.closeMenu();resetClock();
  ui.inspectionOverlay.hidden=true;document.body.classList.remove('inspection-open');
  document.querySelector('.toolbar').inert=false;
  setStatus();ui.viewport.focus({preventScroll:true});
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
  refreshCityHud();
  ui.playerPosition.textContent=`X ${state.x.toFixed(2)} · Y ${state.y.toFixed(2)} · Z 0`;
  ui.playerState.textContent=pauseReasons.active?'已暂停':Math.abs(state.vx)>.05?'漫游中':'站立';
  if(statusTime&&now>statusTime)ui.fps.textContent=String(Math.round((stats.renderedFrames-lastRendered)*1000/(now-statusTime)));
  ui.renderStats.textContent=`${stats.drawCalls} 次绘制 · ${stats.triangles.toLocaleString()} 个三角形\n纸艺大地 · 连续地面\n${stats.size.width} × ${stats.size.height} · 像素倍率 ${stats.pixelRatio.toFixed(2)}\n固定物理步 60 Hz · 渲染按需更新`;
  const shafts=stats.volumetrics;
  ui.renderStats.textContent+='\n丁达尔光柱：'+(!shafts.supported?'此设备图形能力不支持':!shafts.enabled?'已关闭':shafts.effectiveStrength.toFixed(2)+'× · 已渲染 '+shafts.renderedFrames+' 帧');
  lastRendered=stats.renderedFrames;statusTime=now;
}
function resetClock(){lastTime=0;accumulator=0;for(const cancel of heldControls)cancel();input?.cancel();}
function saveProgress(automatic=false){
  if(!ready||disposed)return false;
  const result=saves.save(simulation.snapshot());
  ui.saveStatus.textContent=result.ok?`已${automatic?'自动':''}保存 ${new Date(result.savedAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}`:'保存失败：本地存储不可用';
  ui.gameSaveStatus.textContent=ui.saveStatus.textContent;
  if(!automatic)toast(result.ok?'已保存角色进度到此设备':'无法保存，请检查是否允许本站使用本地存储');
  return result.ok;
}
function loadProgress(automatic=false){
  const result=saves.load();
  if(result.ok&&result.snapshot){
    if(cityRide){cityRide=null;scene.setCityRide(null);document.body.classList.remove('city-riding');}
    if(scene?.cityInterior?.())scene.leaveCityInterior?.();
    const restored=simulation.restore(result.snapshot);resetClock();
    // Loading a far-away district must move the view before another modal can
    // pause its follow interpolation, otherwise both speakers sit off screen.
    scene.frame(0,renderClock,simulation.snapshot());scene.resetCamera();
    ui.saveStatus.textContent=restored?'已读取保存的进度':'存档位置已失效，角色返回起点';
    if(!automatic)toast(restored?'已读取角色进度':'该位置已不适合当前舞台，已回到起点');
  }else{
    const message={empty:'尚未保存',corrupt:'存档损坏，当前场景可继续使用',unsupported:'此存档版本暂不支持',unavailable:'本地存储不可用'}[result.status]||'无法读取进度';
    ui.saveStatus.textContent=message;if(!automatic)toast(message);
  }
  ui.gameSaveStatus.textContent=ui.saveStatus.textContent;
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
  cityExplorer?.close();
  if(inspectionOpen)closeInspection();
  if(open)hideScenePrompt();
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
  cityExplorer?.close();
  if(inspectionOpen)closeInspection();
  if(open)hideScenePrompt();
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
  if(inspectionOpen)closeInspection();
  gameMode=next;document.body.classList.toggle('game-mode',gameMode);
  document.body.classList.add('inspector-hidden');document.body.classList.remove('game-menu-open');
  pauseReasons.closeMenu();ui.gameMenu.hidden=true;ui.toggleInspector.setAttribute('aria-expanded','false');
  ui.inspector.removeAttribute('role');ui.inspector.removeAttribute('aria-modal');
  document.title=gameMode?'纸艺世界':'纸艺世界 · 重构工作室';
  resetClock();setStatus();
}
function keepModalFocus(event){
  if(event.key!=='Tab'||(!inspectionOpen&&(!gameMode||!pauseReasons.menu)))return;
  const root=inspectionOpen?ui.inspectionOverlay:document.body.classList.contains('inspector-hidden')?ui.gameMenu:ui.inspector;
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
function resetCityPlayer(){
  if(cityRide){cityRide=null;scene.setCityRide(null);document.body.classList.remove('city-riding');}
  if(scene?.cityInterior?.())scene.leaveCityInterior?.();
  simulation.reset();resetClock();scene.frame(0,renderClock,simulation.snapshot());scene.resetCamera();
}
function wireControls(){
  listen(ui.viewport,'pointerdown',()=>ui.viewport.focus({preventScroll:true}));
  listen(ui.playPause,'click',()=>{pauseReasons.toggleUser();resetClock();setStatus();refreshStatus(performance.now(),true);});
  listen(ui.resetPlayer,'click',()=>{resetCityPlayer();toast('角色已回到起点');refreshStatus(performance.now(),true);});
  listen(ui.saveProgress,'click',()=>saveProgress());
  listen(ui.loadProgress,'click',()=>{loadProgress();refreshStatus(performance.now(),true);});
  listen(ui.resetCamera,'click',()=>{scene.resetCamera();toast('已恢复初始观察角度');});
  listen(ui.toggleInspector,'click',()=>setInspector(document.body.classList.contains('inspector-hidden')));
  listen(ui.closeInspector,'click',()=>setInspector(false));
  listen(ui.openGameMenu,'click',()=>setGameMenu(true));
  listen(ui.resumeGame,'click',()=>setGameMenu(false,{resume:true}));
  listen(ui.gameReset,'click',()=>{resetCityPlayer();setGameMenu(false,{resume:true});toast('角色已回到起点');});
  listen(ui.gameResetCamera,'click',()=>{scene.resetCamera();toast('已恢复初始观察角度');});
  listen(ui.gameSave,'click',()=>saveProgress());
  listen(ui.gameLoad,'click',()=>{loadProgress();refreshStatus(performance.now(),true);});
  listen(ui.gameSettings,'click',()=>setInspector(true));
  listen(ui.inspectAction,'click',()=>openInspection({explicit:true}));
  listen(ui.closeInspection,'click',closeInspection);
  listen(ui.inspectionOverlay,'click',event=>{if(event.target===ui.inspectionOverlay)closeInspection();});
  listen(window,'keydown',event=>{
    if((cityExplorer?.isOpen||!pauseReasons.active)&&cityExplorer?.handleKey(event))return;
    keepModalFocus(event);
    if(event.key==='Escape'&&window.PaperchalkHandleBack())event.preventDefault();
    if(acceptsInspectionKey(event)&&isCity&&!pauseReasons.active&&cityInteraction()){event.preventDefault();openInspection();}
  });
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
}
function tick(now){
  if(disposed)return;
  const elapsed=lastTime?Math.min(.1,Math.max(0,(now-lastTime)/1000)):0;lastTime=now;
  if(ready&&!failed&&!nativeSuspended&&!document.hidden){
    try{
      const paused=pauseReasons.active;
      const transitionActive=worldHandoff||scene?.getStats?.().transition?.active;
      if(!paused&&!transitionActive){
        if(cityRide){
          cityRide.elapsed+=elapsed;cityRide.progress=Math.min(1,cityRide.elapsed/cityRide.duration);
          const x=cityRide.fromX+(cityRide.toX-cityRide.fromX)*cityRide.progress;
          simulation.restore({x,y:world.surfaceY(x),facing:cityRide.direction,vx:0,distance:simulation.snapshot().distance});
          scene.setCityRide(cityRide);input.cancel();accumulator=0;
          if(cityRide.progress>=1)finishCityTravel();
        }else{
          accumulator+=elapsed;
          while(accumulator>=STEP){simulation.update(STEP,input.consume());accumulator-=STEP;}
        }
        renderClock+=elapsed*1000;
      }else{accumulator=0;input.cancel();}
      scene.frame(paused?0:elapsed,renderClock,simulation.snapshot());cityExplorer?.update(simulation.snapshot().x,cityRide);refreshStatus(now);
      if(worldHandoff&&!scene.getStats().transition?.active)worldHandoff=false;
    }catch(error){sceneStatus({state:'error',message:'场景运行出现错误，请刷新重试。'});console.error(error);}
  }
  raf=requestAnimationFrame(tick);
}
function dispose(){
  if(disposed)return;disposed=true;cancelAnimationFrame(raf);clearTimeout(toastTimer);clearTimeout(scenePromptTimer);
  disposeLifecycle();events.abort();input?.dispose();cityExplorer?.dispose();scene?.dispose();
}
async function start(){
  document.body.classList.toggle('city-prologue',isCity);refreshCityHud();
  refreshPresentation();listen(window,'resize',refreshPresentation);listen(coarsePointer,'change',refreshPresentation);
  loadBuildInfo();
  for(const button of document.querySelectorAll('.toolbar button'))button.disabled=true;
  try{
    scene=createPaperScene({container:ui.viewport,onStatus:sceneStatus,sceneId});
    world=scene.getWorld();
    simulation=new StagePlayerSimulation(world);input=new InputActions({target:window,viewport:ui.viewport});
    await scene.ready;
    if(disposed)return;
    ready=true;
    if(isCity)cityExplorer=createCityExplorer({getPlayer:()=>simulation.snapshot(),
      onPause:()=>{pauseReasons.openMenu();resetClock();setStatus();},
      onResume:()=>{pauseReasons.closeMenu();resetClock();setStatus();},
      onTravel:beginCityTravel,onCancelTravel:()=>finishCityTravel(true)});
    loadProgress(true);wireControls();updateControls();setStatus();
    for(const button of document.querySelectorAll('.toolbar button'))button.disabled=false;
    ui.openGameMenu.disabled=false;
    raf=requestAnimationFrame(tick);
  }catch(error){if(disposed)return;sceneStatus({state:'error',message:error.message||'无法载入纸艺场景，请刷新重试。'});console.error(error);}
}
start();
