// First playable vertical slice for the actual PaperWorld home / Android WebView.
export const COLORS=Object.freeze({dark:'#393657',pink:'#F2A5C2',blue:'#A9BAE9',cream:'#FFF5E6'});
export const VERSION='2026.10.30-game.1';
const SCALE=4;
const $=id=>document.getElementById(id);
const background=$('ambient'),bctx=background.getContext('2d',{alpha:false});
const scene=$('scene'),ctx=scene.getContext('2d',{alpha:false});
const dialogue=$('dialogueText'),speaker=$('speaker'),actions=$('actions');
const portrait=$('portrait');ctx.imageSmoothingEnabled=false;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const STORE_KEY='paperworld-four-color-game-v1';
let paused=reduceMotion,seconds=0,lastTime=0,lastPhase=-1,bgNeedsDraw=true;
let bgWidth=0,bgHeight=0,step=4,hasPortrait=false;
const DEFAULT={phase:'title',line:0,choice:null};
let state={...DEFAULT};
try{const saved=JSON.parse(localStorage.getItem(STORE_KEY)||'null');if(saved&&['title','story','choice','end'].includes(saved.phase))state={phase:saved.phase,line:Math.min(3,Math.max(0,Number(saved.line)||0)),choice:saved.choice===1?1:0}}catch(e){}
function store(){try{localStorage.setItem(STORE_KEY,JSON.stringify(state))}catch(e){}}
function resize(){
 const w=innerWidth,h=innerHeight;
 step=4;const cw=Math.ceil(w/step),ch=Math.ceil(h/step);
 if(cw===bgWidth&&ch===bgHeight)return;
 bgWidth=cw;bgHeight=ch;background.width=cw;background.height=ch;bgNeedsDraw=true;
}
export function stripeColorIndex(x,y,phase,stripe=36,gap=44){const n=stripe+gap;return (((x+y+phase)%n)+n)%n<stripe?1:0}
function drawBackground(phase){
 const data=bctx.createImageData(bgWidth,bgHeight);
 const d=data.data;const cream=[255,245,230],pink=[242,165,194];
 for(let y=0;y<bgHeight;y++)for(let x=0;x<bgWidth;x++){
  const c=stripeColorIndex(x,y,phase)?pink:cream,k=(y*bgWidth+x)*4;
  d[k]=c[0];d[k+1]=c[1];d[k+2]=c[2];d[k+3]=255;
 }
 bctx.putImageData(data,0,0);lastPhase=phase;bgNeedsDraw=false;
}
function tick(t){
 if(!lastTime)lastTime=t;
 if(!paused&&!document.hidden)seconds=(seconds+Math.min((t-lastTime)/1000,.12))%36;
 lastTime=t;const phase=Math.floor(seconds/36*80)%80;
 if(bgNeedsDraw||lastPhase!==phase)drawBackground(phase);
 requestAnimationFrame(tick);
}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h)}
function sceneArt(){
 const {dark,pink,blue,cream}=COLORS;
 rect(0,0,384,216,dark);
 // Architectural shapes, quiet interior, no photographs or extra colors.
 rect(0,0,384,14,blue);rect(0,12,384,5,dark);
 rect(24,29,129,106,cream);rect(30,35,117,94,blue);
 rect(83,35,7,94,dark);rect(30,78,117,7,dark);
 rect(40,112,13,17,pink);rect(57,98,8,31,pink);rect(100,106,12,23,pink);
 rect(163,26,205,116,dark);rect(169,32,193,110,blue);
 // Soft pixel-light panel, full four-color palette, no gradients/opacity.
 rect(178,43,178,71,dark);rect(184,49,166,59,cream);
 rect(190,55,154,47,pink);rect(195,60,144,37,blue);
 rect(233,22,72,7,cream);
 rect(0,144,384,12,cream);rect(0,156,384,60,dark);
 rect(0,166,384,6,blue);rect(0,178,384,7,pink);rect(0,198,384,18,dark);
 // Counter objects: stationary glass silhouettes and bar lamp.
 rect(35,128,31,15,blue);rect(40,117,20,11,cream);rect(46,101,8,16,pink);
 rect(82,137,25,7,pink);rect(87,121,15,16,cream);rect(91,116,7,5,blue);
 rect(131,116,18,28,cream);rect(136,121,8,17,dark);
 rect(274,126,47,18,cream);rect(278,130,39,8,pink);
 rect(330,110,11,34,pink);rect(334,94,4,16,cream);
}
function portraitVisibility(){portrait.hidden=!(hasPortrait&&state.phase!=='title')}
const intro=[
 {name:'旁白',text:'夜已经很深了。柜台后方的灯，还没有熄灭。'},
 {name:'旁白',text:'雨声穿过玻璃。有人在门口停下脚步。'},
 {name:'来客',text:'“这里……现在还营业吗？”'},
 {name:'你',text:'“当然。要先坐一会儿吗？”'}
];
function button(text,action,variant){const b=document.createElement('button');b.className='action'+(variant?' alt':'');b.textContent=text;b.addEventListener('click',action);actions.append(b)}
function update(){
 actions.replaceChildren();sceneArt();portraitVisibility();
 if(state.phase==='title'){
  $('sceneTitle').textContent='PAPERWORLD  /  01';
  speaker.textContent='第一幕 · 夜间柜台';
  dialogue.textContent='一个小小的场景，一段可以亲手推进的对话。';
  button('开始游戏',()=>{state={phase:'story',line:0,choice:null};store();update()});
  button('继续',()=>{state={phase:'story',line:Math.min(2,Math.max(0,state.line||0)),choice:null};store();update()},true);
 }else if(state.phase==='story'){
  $('sceneTitle').textContent='01 / NIGHT COUNTER';
  const item=intro[state.line]||intro[0];speaker.textContent=item.name;dialogue.textContent=item.text;
  button(state.line===intro.length-1?'选择回应':'继续 ›',()=>{if(state.line<intro.length-1)state.line++;else state.phase='choice';store();update()});
 }else if(state.phase==='choice'){
  $('sceneTitle').textContent='01 / A SMALL CHOICE';
  speaker.textContent='你';dialogue.textContent='你准备怎么招待这位深夜来客？';
  button('请他坐下',()=>{state.phase='end';state.choice=0;store();update()});
  button('先递一杯热水',()=>{state.phase='end';state.choice=1;store();update()},true);
 }else{
  $('sceneTitle').textContent='01 / END OF PROLOGUE';
  speaker.textContent='旁白';
  dialogue.textContent=state.choice===1?'热水冒出淡淡的白汽。来客终于松开紧握的手。':'来客默默坐在柜台前，终于抬起头看向你。';
  button('再体验一次',()=>{state={phase:'story',line:0,choice:null};store();update()});
 }
}
const menu=$('menu'),menuButton=$('menuButton');
function toggleMenu(force){const visible=force===undefined?menu.getAttribute('aria-hidden')==='true':force;menu.setAttribute('aria-hidden',String(!visible));menuButton.setAttribute('aria-expanded',String(visible));}
menuButton.onclick=()=>toggleMenu();
$('resumeButton').onclick=()=>toggleMenu(false);
$('restartButton').onclick=()=>{state={...DEFAULT};store();update();toggleMenu(false)};
$('motionButton').onclick=()=>{paused=!paused;$('motionButton').textContent=paused?'启动背景':'停止背景'};
$('newGameButton').onclick=()=>{state={phase:'story',line:0,choice:null};store();update();toggleMenu(false)};
portrait.addEventListener('load',()=>{hasPortrait=true;portraitVisibility()});
portrait.addEventListener('error',()=>{hasPortrait=false;portrait.hidden=true});
addEventListener('resize',resize,{passive:true});
addEventListener('orientationchange',()=>{lastTime=0;resize()},{passive:true});
document.addEventListener('visibilitychange',()=>{lastTime=0});
addEventListener('keydown',e=>{
 if(e.key==='Escape')toggleMenu(false);
 else if((e.key==='Enter'||e.code==='Space')&&menu.getAttribute('aria-hidden')==='true'){
  const b=actions.querySelector('button');if(b&&e.target.tagName!=='BUTTON'){e.preventDefault();b.click()}
 }
});
if(reduceMotion)$('motionButton').textContent='启动背景';
update();resize();requestAnimationFrame(tick);
