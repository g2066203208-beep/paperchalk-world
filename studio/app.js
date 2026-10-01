import {createPaperScene} from './rendering/index.js';
import {createWorld} from './world/PaperWorld.mjs';
import {PlayerSimulation} from './core/PlayerSimulation.mjs';
import {SaveStore} from './core/SaveStore.mjs';
import {InputActions} from './input/InputActions.mjs';

const $=id=>document.getElementById(id);
const ui=Object.fromEntries(['viewport','appStatus','loadingStatus','toast','playPause','resetPlayer','saveProgress','loadProgress','resetCamera','toggleInspector','autoCycle','resetPaper','followSun','fps','playerPosition','playerState','saveStatus','renderStats','moveLeft','moveRight','jumpButton'].map(id=>[id,$(id)]));
const defaults={scale:2,normal:1.85,height:4.8,blend:.85};
const paperInputs={paperScale:'scale',paperNormal:'normal',paperHeight:'height',paperBlend:'blend'};
const saves=new SaveStore();
const events=new AbortController();
let scene,simulation,input,ready=false,failed=false,paused=false,disposed=false;
let raf=0,lastTime=0,accumulator=0,renderClock=performance.now(),statusTime=0,lastRendered=0,toastTimer=0;
const STEP=1/60;

function listen(element,event,callback,options={}){
  element.addEventListener(event,callback,{...options,signal:events.signal});
}
function toast(message){
  clearTimeout(toastTimer);ui.toast.textContent=message;ui.toast.hidden=false;
  toastTimer=setTimeout(()=>{ui.toast.hidden=true;},3200);
}
function setStatus(){
  ui.appStatus.textContent=failed?'画面待恢复':!ready?'正在载入':paused?'场景已暂停':'横版世界 · 运行中';
  ui.playPause.textContent=paused?'继续':'暂停';
  ui.playPause.setAttribute('aria-pressed',String(paused));
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
  for(const button of document.querySelectorAll('[data-preset]')){
    const active=button.dataset.preset===state.timePreset&&!state.auto&&!state.manualSun;
    button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
  }
  ui.autoCycle.checked=state.auto;
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
  ui.playerState.textContent=paused?'已暂停':!state.grounded?(state.vy>0?'跃起':'落下'):Math.abs(state.vx)>.05?'移动中':'站立';
  if(statusTime&&now>statusTime)ui.fps.textContent=String(Math.round((stats.renderedFrames-lastRendered)*1000/(now-statusTime)));
  ui.renderStats.textContent=`${stats.drawCalls} 次绘制 · ${stats.triangles.toLocaleString()} 个三角形\n${stats.terrain.columns} 列地形 · ${stats.terrain.visibleFaces} 个可见面\n${stats.size.width} × ${stats.size.height} · 像素倍率 ${stats.pixelRatio.toFixed(2)}\n固定物理步 60 Hz · 渲染按需更新`;
  lastRendered=stats.renderedFrames;statusTime=now;
}
function resetClock(){lastTime=0;accumulator=0;input?.cancel();}
function saveProgress(){
  if(!ready)return;
  const result=saves.save(simulation.snapshot());
  ui.saveStatus.textContent=result.ok?`已保存 ${new Date(result.savedAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}`:'保存失败：浏览器存储不可用';
  toast(result.ok?'已保存角色进度到此浏览器':'无法保存，请检查浏览器是否允许本站使用本地存储');
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
}
function heldButton(element,setHeld){
  const active=new Set();let keyboardHeld=false,pulseHeld=false,pulseTimer=0;
  const update=()=>setHeld(active.size>0||keyboardHeld||pulseHeld);
  const cancel=()=>{active.clear();keyboardHeld=false;pulseHeld=false;clearTimeout(pulseTimer);update();};
  listen(element,'pointerdown',event=>{
    if(event.pointerType==='mouse'&&event.button!==0)return;
    event.preventDefault();ui.viewport.focus({preventScroll:true});
    active.add(event.pointerId);element.setPointerCapture(event.pointerId);update();
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
  events.signal.addEventListener('abort',cancel,{once:true});
}
function wireControls(){
  listen(ui.viewport,'pointerdown',()=>ui.viewport.focus({preventScroll:true}));
  listen(ui.playPause,'click',()=>{paused=!paused;resetClock();setStatus();refreshStatus(performance.now(),true);});
  listen(ui.resetPlayer,'click',()=>{simulation.reset();resetClock();toast('角色已回到起点');refreshStatus(performance.now(),true);});
  listen(ui.saveProgress,'click',saveProgress);
  listen(ui.loadProgress,'click',()=>{loadProgress();refreshStatus(performance.now(),true);});
  listen(ui.resetCamera,'click',()=>{scene.resetCamera();toast('已恢复初始观察角度');});
  listen(ui.toggleInspector,'click',()=>{
    const closed=document.body.classList.toggle('inspector-hidden');
    ui.toggleInspector.setAttribute('aria-expanded',String(!closed));
  });
  for(const button of document.querySelectorAll('[data-preset]'))listen(button,'click',()=>{scene.setTimePreset(button.dataset.preset);updateControls();if(paused)toast('场景已暂停；继续后光线会过渡到所选时间');});
  listen(ui.autoCycle,'change',()=>{scene.setAutoCycle(ui.autoCycle.checked);updateControls();});
  for(const checkbox of document.querySelectorAll('[data-feature]'))listen(checkbox,'change',()=>{scene.setFeature(checkbox.dataset.feature,checkbox.checked);updateControls();});
  for(const [id,key] of Object.entries(paperInputs))listen($(id),'input',()=>{scene.setPaper({[key]:Number($(id).value)/100});updateControls();});
  listen(ui.resetPaper,'click',()=>{scene.setPaper(defaults);updateControls();});
  for(const id of ['sunAzimuth','sunElevation'])listen($(id),'input',()=>{scene.setSun({azimuth:Number($('sunAzimuth').value),elevation:Number($('sunElevation').value),manual:true});updateControls();});
  listen(ui.followSun,'click',()=>{scene.setSun({manual:false});updateControls();toast('太阳方向已恢复跟随昼夜');});
  heldButton(ui.moveLeft,value=>input.setVirtualLeft(value));
  heldButton(ui.moveRight,value=>input.setVirtualRight(value));
  heldButton(ui.jumpButton,value=>input.setVirtualJump(value));
  listen(document,'visibilitychange',resetClock);
}
function tick(now){
  if(disposed)return;
  const elapsed=lastTime?Math.min(.1,Math.max(0,(now-lastTime)/1000)):0;lastTime=now;
  if(ready&&!failed&&!document.hidden){
    try{
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
  events.abort();input?.dispose();scene?.dispose();
}
async function start(){
  for(const button of document.querySelectorAll('.toolbar button'))button.disabled=true;
  try{
    scene=createPaperScene({container:ui.viewport,onStatus:sceneStatus});
    const world=createWorld(scene.getTerrainColumns(),{laneZ:0});
    simulation=new PlayerSimulation(world);input=new InputActions({target:window,viewport:ui.viewport});
    await scene.ready;
    ready=true;loadProgress(true);wireControls();updateControls();setStatus();
    for(const button of document.querySelectorAll('.toolbar button'))button.disabled=false;
    // Keep a bfcache page alive; tear down only when navigation discards it.
    listen(window,'pagehide',event=>{if(!event.persisted)dispose();else resetClock();});
    listen(window,'pageshow',resetClock);
    raf=requestAnimationFrame(tick);
  }catch(error){sceneStatus({state:'error',message:error.message||'无法载入纸艺场景，请刷新重试。'});console.error(error);}
}
start();
