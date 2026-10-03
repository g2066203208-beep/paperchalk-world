import {createPaperWorldScene} from './transition/PaperWorldScene.js';
import {LAB_DURATION,clamp01,samplePaperWorld} from './transition/PaperWorldTimeline.mjs';

const $=id=>document.getElementById(id);
const ui={
  viewport:$('labViewport'),play:$('playToggle'),reset:$('resetTimeline'),
  stepBack:$('stepBack'),stepForward:$('stepForward'),timeline:$('timeline'),
  progress:$('progressLabel'),act:$('actLabel'),speed:$('speedSelect'),
  version:$('demoLabVersion'),build:$('buildId'),
  cityValue:$('cityValue'),sweepValue:$('sweepValue'),
  destinationValue:$('destinationValue'),lightValue:$('lightValue'),
  viewMode:$('viewMode'),largeWorld:$('largeWorld'),playerX:$('playerX'),
  resetPlayerX:$('resetPlayerX'),playerXValue:$('playerXValue'),
  chunkValue:$('chunkValue'),residentValue:$('residentValue'),
  drawCallValue:$('drawCallValue')
};

const scene=createPaperWorldScene({container:ui.viewport});
let playing=false,progress=0,last=performance.now(),raf=0,speed=1;
const fallbackVersion='DL-2026.10.03.6';

function percent(value){return String(Math.round(value*100)).padStart(3,'0')+'%';}
function sync(){
  const s=scene.setProgress(progress),state=scene.snapshot();
  ui.timeline.value=String(Math.round(progress*1000));
  ui.progress.textContent=percent(progress);
  ui.act.textContent=s.act;
  ui.cityValue.textContent=percent(s.cityRelease);
  ui.sweepValue.textContent=percent(s.shadowPass);
  ui.destinationValue.textContent=percent(s.destinationRise);
  ui.lightValue.textContent=percent(s.lights);
  ui.playerXValue.textContent='X '+state.playerX.toFixed(1);
  ui.chunkValue.textContent='CHUNK '+state.activeChunk;
  ui.residentValue.textContent=String(state.residentChunks.length);
  ui.drawCallValue.textContent=String(state.drawCalls);
  document.body.dataset.act=s.act;
  document.body.dataset.view=state.viewMode;
}
function setProgress(value,{pause=true}={}){
  progress=clamp01(value);
  if(pause)playing=false;
  ui.play.textContent=playing?'暂停':'播放';
  ui.play.setAttribute('aria-pressed',String(playing));
  sync();
}
function tick(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(playing){
    progress+=dt*speed/LAB_DURATION;
    if(progress>=1){progress=1;playing=false;}
    sync();
    ui.play.textContent=playing?'暂停':'重播';
    ui.play.setAttribute('aria-pressed',String(playing));
  }
  raf=requestAnimationFrame(tick);
}
function togglePlay(){
  if(!playing&&progress>=1)progress=0;
  playing=!playing;last=performance.now();
  ui.play.textContent=playing?'暂停':'播放';
  ui.play.setAttribute('aria-pressed',String(playing));
  sync();
}
function step(frames){
  const oneFrame=1/(60*LAB_DURATION);
  setProgress(progress+frames*oneFrame);
}
function jump(value){setProgress(value);}

ui.play.addEventListener('click',togglePlay);
ui.reset.addEventListener('click',()=>setProgress(0));
ui.stepBack.addEventListener('click',()=>step(-1));
ui.stepForward.addEventListener('click',()=>step(1));
ui.timeline.addEventListener('input',()=>setProgress(Number(ui.timeline.value)/1000));
ui.speed.addEventListener('change',()=>{speed=Number(ui.speed.value)||1;});
ui.viewMode.addEventListener('change',()=>{scene.setView(ui.viewMode.value);sync();});
ui.largeWorld.addEventListener('change',()=>{scene.setLargeWorld(ui.largeWorld.checked);sync();});
ui.playerX.addEventListener('input',()=>{scene.setPlayerX(Number(ui.playerX.value));sync();});
ui.resetPlayerX.addEventListener('click',()=>{ui.playerX.value='0';scene.setPlayerX(0);sync();});

for(const button of document.querySelectorAll('[data-jump]')){
  button.addEventListener('click',()=>jump(Number(button.dataset.jump)));
}

window.addEventListener('keydown',event=>{
  if(event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement)return;
  if(event.code==='Space'){event.preventDefault();togglePlay();}
  if(event.code==='ArrowLeft'){event.preventDefault();step(event.shiftKey?-5:-1);}
  if(event.code==='ArrowRight'){event.preventDefault();step(event.shiftKey?5:1);}
  if(event.key==='0')jump(0);
  if(event.key==='1')jump(.25);
  if(event.key==='2')jump(.5);
  if(event.key==='3')jump(.75);
  if(event.key==='4')jump(1);
});

async function loadVersion(){
  try{
    const [metaResponse,buildResponse]=await Promise.all([
      fetch('./lab-meta.json',{cache:'no-store'}),
      fetch('./build-info.json',{cache:'no-store'})
    ]);
    const meta=metaResponse.ok?await metaResponse.json():{};
    const build=buildResponse.ok?await buildResponse.json():{};
    ui.version.textContent=meta.displayVersion||fallbackVersion;
    const short=typeof build.version==='string'&&/^[a-f0-9]{7,40}$/.test(build.version)?build.version.slice(0,8):'DEV';
    ui.build.textContent='BUILD '+short;
  }catch{
    ui.version.textContent=fallbackVersion;
    ui.build.textContent='BUILD UNKNOWN';
  }
}

const api={
  ready:false,
  duration:LAB_DURATION,
  setProgress:value=>setProgress(value),
  setView:value=>{ui.viewMode.value=value;scene.setView(value);sync();},
  setPlayerX:value=>{ui.playerX.value=String(value);scene.setPlayerX(value);sync();},
  setLargeWorld:value=>{ui.largeWorld.checked=!!value;scene.setLargeWorld(value);sync();},
  play:()=>{if(!playing)togglePlay();},
  pause:()=>{playing=false;ui.play.textContent='播放';},
  snapshot:()=>scene.snapshot(),
  sample:samplePaperWorld
};

window.PaperWorldLab=api;
sync();
loadVersion();
raf=requestAnimationFrame(tick);
scene.whenPlayerReady.then(()=>{api.ready=true;sync();}).catch(error=>{api.error=String(error);});
