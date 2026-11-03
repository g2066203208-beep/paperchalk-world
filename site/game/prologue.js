/* First-person prologue playable vertical slice.
 * Narrative data and restrained cues; original artwork and L2D are untouched.
 * No faux 3D monsters: off-camera threats are represented by spatial sound,
 * existing scene/fog, quick view flashes and the character's spoken reactions.
 */
(function(root){
'use strict';
// First-person sound-led encounter. No choice menus, no invented clearance
// bureaucracy, no narrator describing impossible on-screen animations.
const rows=[
 ['女主·心声','第九只。','scrape'],
 ['环境','墙边有什么东西贴着地面滑了过来。','attack'],
 ['女主','太慢。','strike'],
 ['环境','铿。','impact'],
 ['女主·心声','清完了。'],
 ['环境','另一串急促的脚步声，从走廊尽头冲过来。','steps'],
 ['？？？（远处）','救命！有人吗？！'],
 ['环境','那人的脚步停了。身后却还有脚步在继续。','echoSteps'],
 ['？？？','别、别过来！','silhouette'],
 ['女主','站住。'],
 ['？？？','你……你是人吗？'],
 ['女主','蹲下。','attack'],
 ['？？？','什么？'],
 ['女主','现在。','strike'],
 ['环境','金属声骤响，沉重的东西在眼前倒下。','impact'],
 ['？？？','……它呢？'],
 ['环境','灯管重新亮起。','unmask'],
 ['女二','你刚才……救了我？'],
 ['女主','顺手。'],
 ['女二','这里到底是什么地方？我一直跑，楼梯却全绕回原处！'],
 ['女主','第一次进来？'],
 ['女二','还、还能再进来？！'],
 ['女主','想活着出去，就跟紧。'],
 ['女二','……你说话一直这么难听吗？'],
 ['女主','你脚步一直这么吵吗？'],
 ['环境','走廊深处，又传来一声敲门声。','knock'],
 ['女主','别回头。','ending'],
 ['女二','……好。']
];
const SILHOUETTE_START=8;
const IDENTITY_REVEAL=16;
const lines=Object.freeze(rows.map(([speaker,text,cue])=>
 Object.freeze({speaker,text,cue:cue||''})));
let view=null,fx=null,enemy=null,started=false,disposed=false,sceneSound=null;
let oldEnemy=null,ownsEnemy=false,expectedEnemy=null;
let castingTask=Promise.resolve();
function ensure(){
 view=document.getElementById('view');
 if(!view)return;
 enemy=document.getElementById('enemy-depth-root');
 if(!fx){
  fx=document.createElement('div');
  fx.id='prologue-vfx';fx.setAttribute('aria-hidden','true');
  fx.hidden=true;view.appendChild(fx);
 }
}
function playSound(cue){
 const audio=sceneSound;
 if(!audio||audio.state!=='running')return;
 const t=audio.currentTime;
 function tone(freq,duration,gain,wave='triangle',when=t){
  const osc=audio.createOscillator(),vol=audio.createGain();
  osc.type=wave;osc.frequency.setValueAtTime(freq,when);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20,freq*.65),when+duration);
  vol.gain.setValueAtTime(.0001,when);
  vol.gain.exponentialRampToValueAtTime(gain,when+.018);
  vol.gain.exponentialRampToValueAtTime(.0001,when+duration);
  osc.connect(vol);vol.connect(audio.destination);
  osc.start(when);osc.stop(when+duration+.03);
 }
 const quiet=.027;
 if(cue==='hum')tone(93,.7,.014,'sine');
 if(cue==='scrape'){tone(310,.19,quiet,'sawtooth');tone(175,.20,.015,'triangle',t+.12);}
 if(cue==='attack'){tone(110,.27,.045,'sawtooth');tone(63,.27,.04,'triangle',t+.08);}
 if(cue==='strike'){tone(860,.09,.035,'triangle');tone(330,.16,.026,'sawtooth',t+.03);}
 if(cue==='impact'){tone(95,.30,.048,'triangle');tone(65,.37,.033,'sine',t+.07);}
 if(cue==='steps'||cue==='echoSteps'){
  for(let i=0;i<4;i++)tone(i%2?80:120,.075,.026,'triangle',t+.17*i);
  if(cue==='echoSteps')for(let i=0;i<4;i++)tone(90,.045,.015,'triangle',t+.17*i+.09);
 }
 if(cue==='knock')for(let i=0;i<3;i++)tone(140,.065,.036,'triangle',t+.24*i);
 if(cue==='record'||cue==='warning'){tone(640,.13,.014,'sine');if(cue==='warning')tone(390,.25,.024,'sine',t+.16);}
 if(cue==='radio'){tone(220,.28,.012,'sawtooth');tone(440,.22,.008,'sawtooth',t+.10);}
 if(cue==='echo')tone(400,.22,.018,'sine');
 if(cue==='ending')tone(60,.75,.045,'sine');
}
function enableAudio(){
 try{
  const Ctx=root.AudioContext||root.webkitAudioContext;
  if(!Ctx)return;
  if(!sceneSound)sceneSound=new Ctx();
  if(sceneSound.state==='suspended')sceneSound.resume().catch(()=>{});
 }catch(_){}
}
// Only the silhouette is shown before the actual light/reveal event.
 // CSS brightness(0) preserves the original L2D alpha and moving contour.
function setFemaleVisible(visible,known=false){
 if(!enemy)return;
 enemy.hidden=!visible;
 enemy.dataset.prologuePose=visible?'present':'absent';
 if(visible)enemy.dataset.identityVisibility=known?'revealed':'silhouette';
 else delete enemy.dataset.identityVisibility;
}
function cue(index){
 if(!started||!view)return;
 const line=lines[index];if(!line)return;
 const type=line.cue||'idle';
 fx.hidden=false;
 fx.className=''; // restart individual short impacts
 void fx.offsetWidth;
 fx.className='prologue-'+type;
 view.dataset.prologueCue='';
 void view.offsetWidth;
 view.dataset.prologueCue=type;
 // Stage rule: offscreen first, then PURE-BLACK moving contour,
 // then original colors only after the lamp becomes bright at reveal.
 setFemaleVisible(index>=SILHOUETTE_START,index>=IDENTITY_REVEAL);
 if(type==='ending')view.dataset.prologueEnding='true';
 else view.dataset.prologueEnding='false';
 playSound(type);
}
async function ensureCharacter(){
 // This is a temporary story casting choice, NOT a write to the DEV slot
 // or a replacement of the user's uploaded L2D/rig and saved preferences.
 for(let frame=0;frame<900&&started&&!disposed;frame++){
  const dev=root.PaperchalkCharacterDev;
  if(dev?.ready){
   if(!ownsEnemy){
    oldEnemy=dev.assigned.enemy?{...dev.assigned.enemy}:null;
    ownsEnemy=true;
   }
   expectedEnemy={id:'char-002',side:'front'};
   try{
    await dev.assign('enemy','char-002','front',false);
   }catch(error){console.warn('[Prologue] CHAR-002 L2D not playable:',error);}
   return;
  }
  await new Promise(resolve=>requestAnimationFrame(resolve));
 }
}
function enter(){
 ensure();if(!view)return;
 disposed=false;started=true;
 view.classList.add('prologue-first-person');
 if(fx)fx.hidden=false;
 // Never show the rear-view third-person player sprite during the story.
 const player=document.getElementById('camera-player-root');
 if(player)player.hidden=true;
 setFemaleVisible(false);
 castingTask=ensureCharacter();
}
async function leave(){
 if(!started)return;
 started=false;disposed=true;
 // Do not restore the user's previous NPC while the temporary story casting
 // request is still in flight; that would race and overwrite the restore.
 await castingTask.catch(()=>{});
 if(view){view.classList.remove('prologue-first-person');delete view.dataset.prologueEnding;delete view.dataset.prologueCue;}
 if(fx){fx.hidden=true;fx.className='';}
 if(enemy){delete enemy.dataset.prologuePose;delete enemy.dataset.identityVisibility;}
 const previous=oldEnemy;oldEnemy=null;
 if(ownsEnemy&&previous&&expectedEnemy&&root.PaperchalkCharacterDev?.ready){
  const dev=root.PaperchalkCharacterDev;
  if(dev.assigned.enemy?.id===expectedEnemy.id&&dev.assigned.enemy?.side===expectedEnemy.side
     &&previous.id&&previous.side&&previous.id!==expectedEnemy.id){
    try{await dev.assign('enemy',previous.id,previous.side,false);}catch(_){}
  }
 }
 ownsEnemy=false;expectedEnemy=null;
}
root.PaperWorldPrologue=Object.freeze({
 lines,enter,leave,cue,enableAudio,
 silhouetteStart:SILHOUETTE_START,identityReveal:IDENTITY_REVEAL
});
})(window);