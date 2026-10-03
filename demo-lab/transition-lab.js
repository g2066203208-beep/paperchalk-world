import {createPaperStageScene} from './transition/PaperStageScene.js';
import {LAB_DURATION,clamp01,samplePaperStage} from './transition/PaperStageTimeline.mjs';

const $=id=>document.getElementById(id);
const ui={
  viewport:$('labViewport'),play:$('playToggle'),reset:$('resetTimeline'),
  stepBack:$('stepBack'),stepForward:$('stepForward'),timeline:$('timeline'),
  progress:$('progressLabel'),act:$('actLabel'),speed:$('speedSelect'),
  guides:$('showGuides'),shadows:$('showShadows'),version:$('demoLabVersion'),
  build:$('buildId'),pageValue:$('pageValue'),wallValue:$('wallValue'),
  fixtureValue:$('fixtureValue'),lightValue:$('lightValue'),
};
const scene=createPaperStageScene({container:ui.viewport});
let playing=false,progress=0,last=performance.now(),raf=0,speed=1;
const fallbackVersion='DL-2026.10.03.2';

function percent(value){return String(Math.round(value*100)).padStart(3,'0')+'%';}
function sync(){
  const s=scene.setProgress(progress);
  ui.timeline.value=String(Math.round(progress*1000));
  ui.progress.textContent=percent(progress);
  ui.act.textContent=s.act;
  ui.pageValue.textContent=percent(s.page);
  ui.wallValue.textContent=percent(s.wall);
  ui.fixtureValue.textContent=percent(s.fixture);
  ui.lightValue.textContent=percent(s.light);
  document.body.dataset.act=s.act;
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
  ui.play.setAttribute('aria-pressed',String(playing));sync();
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
ui.guides.addEventListener('change',()=>scene.setGuides(ui.guides.checked));
ui.shadows.addEventListener('change',()=>scene.setShadows(ui.shadows.checked));
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
      fetch('./build-info.json',{cache:'no-store'}),
    ]);
    const meta=metaResponse.ok?await metaResponse.json():{};
    const build=buildResponse.ok?await buildResponse.json():{};
    ui.version.textContent=meta.displayVersion||fallbackVersion;
    const short=typeof build.version==='string'&&/^[a-f0-9]{7,40}$/.test(build.version)?build.version.slice(0,8):'DEV';
    ui.build.textContent='BUILD '+short;
    ui.build.title=build.version&&short!=='DEV'?build.version:'本地开发构建';
  }catch{
    ui.version.textContent=fallbackVersion;ui.build.textContent='BUILD UNKNOWN';
  }
}

sync();loadVersion();raf=requestAnimationFrame(tick);
window.PaperStageLab={
  ready:true,
  duration:LAB_DURATION,
  setProgress:value=>setProgress(value),
  play:()=>{if(!playing)togglePlay();},
  pause:()=>{playing=false;ui.play.textContent='播放';},
  snapshot:()=>scene.snapshot(),
  sample:samplePaperStage,
};
