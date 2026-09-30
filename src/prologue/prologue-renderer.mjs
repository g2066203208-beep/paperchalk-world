import {PrologueScene} from './PrologueScene.js?v=prologue-r1';

const RUNTIME=window.PaperchalkPrologue;
const CONTENT=window.PaperchalkPrologueContent;
const THREE_MODULE='../../vendor/three/three.module.js';
const WORLD=document.getElementById('world');

const host=document.createElement('div');
host.id='prologueLayer';host.className='prologue-layer';host.hidden=true;host.setAttribute('aria-hidden','true');
WORLD.appendChild(host);

const ui=document.createElement('div');
ui.className='prologue-ui';
ui.innerHTML=`
  <div class="prologue-top">
    <div class="prologue-location"><b data-prologue-zone>序幕</b><span>放学后的普通一天</span></div>
    <div class="prologue-clock" data-prologue-clock>16:12</div>
  </div>
  <div class="prologue-objective" data-prologue-objective>放学了。离开教室，回家。<small>WASD / 摇杆移动 · E / 聊 与路人交谈</small></div>
  <div class="prologue-message" data-prologue-message></div>
  <div class="prologue-walk-signal" data-prologue-signal><i></i><span>行人灯</span></div>
  <button class="prologue-menu" data-prologue-menu type="button">菜单</button>
  <button class="prologue-interact" data-prologue-interact type="button">聊</button>
  <div class="prologue-stick" data-prologue-stick><div class="prologue-stick-knob" data-prologue-stick-knob></div></div>
  <div class="prologue-end" data-prologue-end>
    <div class="prologue-end-card">
      <h2>到家了</h2>
      <p>书包放下，窗外还是熟悉的车声。<br>至少在这一刻，一切都和平常一样。</p>
      <button type="button" data-prologue-finish>结束序幕</button>
    </div>
  </div>
`;
host.appendChild(ui);

const zoneEl=ui.querySelector('[data-prologue-zone]');
const clockEl=ui.querySelector('[data-prologue-clock]');
const objectiveEl=ui.querySelector('[data-prologue-objective]');
const messageEl=ui.querySelector('[data-prologue-message]');
const signalEl=ui.querySelector('[data-prologue-signal]');
const menuBtn=ui.querySelector('[data-prologue-menu]');
const interactBtn=ui.querySelector('[data-prologue-interact]');
const stick=ui.querySelector('[data-prologue-stick]');
const knob=ui.querySelector('[data-prologue-stick-knob]');
const endEl=ui.querySelector('[data-prologue-end]');
const finishBtn=ui.querySelector('[data-prologue-finish]');

let THREE=null,scene=null,ready=false,active=false,raf=0,lastNow=0,error='';
let frames=0,fps=0,fpsFrames=0,fpsAt=0;
const keys=new Set();
let touch={x:0,z:0,id:null};

function uiUpdate(s){
  zoneEl.textContent=s.zoneName||'序幕';
  clockEl.textContent=s.clock||'16:12';
  const o=s.objective;
  objectiveEl.firstChild.nodeValue=(o?.text||'回家。')+' ';
  const showSignal=s.zone==='city'&&o?.id==='cross-road';
  signalEl.style.display=showSignal?'block':'none';
  signalEl.classList.toggle('is-green',!!s.signals?.walkNS);
  signalEl.querySelector('span').textContent=s.signals?.walkNS?'行人灯 · 绿':'行人灯 · 红';
  messageEl.textContent=s.message||'';
  messageEl.classList.toggle('is-show',!!s.message);
  endEl.classList.toggle('is-show',!!s.segmentComplete&&!s.completed);
}
async function ensure(){
  if(ready&&scene)return true;
  try{
    THREE=await import(THREE_MODULE);
    scene=new PrologueScene(THREE,host,CONTENT);
    ready=true;error='';return true;
  }catch(e){error=String(e?.message||e);console.error('[prologue] init failed',e);return false}
}
function movement(){
  let x=touch.x,z=touch.z;
  if(keys.has('KeyA')||keys.has('ArrowLeft'))x-=1;
  if(keys.has('KeyD')||keys.has('ArrowRight'))x+=1;
  if(keys.has('KeyW')||keys.has('ArrowUp'))z-=1;
  if(keys.has('KeyS')||keys.has('ArrowDown'))z+=1;
  const m=Math.hypot(x,z);if(m>1){x/=m;z/=m}return{x,z};
}
function frame(now){
  if(!active||!scene){raf=0;return}
  const dt=Math.min(.05,lastNow?(now-lastNow)/1000:1/60);lastNow=now;
  const mv=movement();RUNTIME.setMove(mv.x,mv.z);
  const snap=RUNTIME.update(dt);scene.update(snap,dt);scene.render();uiUpdate(snap);
  frames++;fpsFrames++;
  if(!fpsAt)fpsAt=now;
  if(now-fpsAt>=500){fps=Math.round(fpsFrames*1000/(now-fpsAt));fpsFrames=0;fpsAt=now}
  raf=requestAnimationFrame(frame);
}
async function enable(account){
  if(!RUNTIME||!CONTENT)return false;
  const ok=await ensure();if(!ok)return false;
  RUNTIME.enter(account);active=true;host.hidden=false;host.setAttribute('aria-hidden','false');
  document.body.classList.add('prologue-active');scene.resize();lastNow=0;fpsFrames=0;fpsAt=0;
  uiUpdate(RUNTIME.snapshot());
  if(!raf)raf=requestAnimationFrame(frame);
  window.dispatchEvent(new CustomEvent('paperchalk-prologue-ready',{detail:RUNTIME.snapshot()}));
  return true;
}
function disable({save=true}={}){
  if(save)RUNTIME?.save?.();
  active=false;if(raf)cancelAnimationFrame(raf);raf=0;lastNow=0;keys.clear();touch={x:0,z:0,id:null};
  RUNTIME?.setMove?.(0,0);RUNTIME?.leave?.();
  host.hidden=true;host.setAttribute('aria-hidden','true');document.body.classList.remove('prologue-active');
  return true;
}
function interact(){if(active)RUNTIME.interact()}
function exitMenu(){
  disable({save:true});
  document.getElementById('worldMenuBtn')?.click();
}
function finish(){
  RUNTIME.finish();disable({save:true});
  // The normal enter button now bypasses the prologue because completion was persisted.
  setTimeout(()=>document.getElementById('enterBtn')?.click(),0);
}

addEventListener('keydown',e=>{
  if(!active)return;
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){keys.add(e.code);e.preventDefault()}
  else if(e.code==='KeyE'){if(!e.repeat)interact();e.preventDefault()}
  else if(e.code==='Escape'){exitMenu();e.preventDefault()}
},{passive:false});
addEventListener('keyup',e=>{if(active)keys.delete(e.code)});
addEventListener('resize',()=>scene?.resize?.(),{passive:true});

function stickMove(e){
  if(touch.id!==e.pointerId)return;
  const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  let dx=(e.clientX-cx)/(r.width*.38),dy=(e.clientY-cy)/(r.height*.38),m=Math.hypot(dx,dy);
  if(m>1){dx/=m;dy/=m}touch.x=dx;touch.z=dy;
  knob.style.transform=`translate(${dx*34}px,${dy*34}px)`;
}
stick.addEventListener('pointerdown',e=>{if(!active)return;touch.id=e.pointerId;stick.setPointerCapture(e.pointerId);stickMove(e);e.preventDefault()});
stick.addEventListener('pointermove',stickMove);
function stickEnd(e){if(touch.id!==e.pointerId)return;touch={x:0,z:0,id:null};knob.style.transform='translate(0,0)'}
stick.addEventListener('pointerup',stickEnd);stick.addEventListener('pointercancel',stickEnd);
interactBtn.addEventListener('pointerdown',e=>{e.preventDefault();interact()});
menuBtn.addEventListener('click',exitMenu);finishBtn.addEventListener('click',finish);

addEventListener('paperchalk-prologue-enter',e=>enable(e.detail?.account));
addEventListener('paperchalk-prologue-leave',()=>disable({save:true}));
addEventListener('paperchalk-world-leave',()=>{if(active)disable({save:true})});
addEventListener('pagehide',()=>{if(active)disable({save:true})});

window.PaperchalkPrologue3D=Object.freeze({
  enable,disable,
  get active(){return active},
  get ready(){return ready},
  get stats(){return {active,ready,error,frames,fps,...(scene?.stats?.()||{}),simulation:RUNTIME?.snapshot?.().stats||null}},
  snapshot(){return RUNTIME?.snapshot?.()||null}
});
