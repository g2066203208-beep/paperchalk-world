/* First-person prologue playable vertical slice.
 * Narrative data and restrained cues; original artwork and L2D are untouched.
 * No faux 3D monsters: off-camera threats are represented by spatial sound,
 * existing scene/fog, quick view flashes and the character's spoken reactions.
 */
(function(root){
'use strict';
const rows=[
 ['环境','黑色从教室外的走廊缓缓漫过门槛。头顶的灯管只亮了一半。','hum'],
 ['女主·心声','二十七号。剩下的东西应该就在附近。'],
 ['环境','右边传来指甲刮过墙砖的声音，越来越近。','scrape'],
 ['女主','出来。'],
 ['环境','灯光骤然暗了一瞬，侧面的黑影几乎撞上视线。','attack'],
 ['女主·心声','太慢。','strike'],
 ['环境','尖锐的金属声贴着耳边划过。黑影撞在地面上，逐渐散成一滩墨迹。','impact'],
 ['女主','二十七。结束。'],
 ['环境','走廊另一端，突然传来急促而凌乱的脚步。','steps'],
 ['陌生少女（远处）','救命！有没有人在？！'],
 ['女主·心声','……人声？'],
 ['环境','脚步声越来越近，后面还跟着一串完全相同、却慢了半拍的脚步。','echoSteps'],
 ['陌生少女（远处）','怎么又是这里？！我明明往楼下跑了！'],
 ['环境','一个扎着栗棕色马尾的少女跌跌撞撞冲到你面前。','reveal'],
 ['女二','你、你是人吧？！'],
 ['女主','看你怎么定义。'],
 ['女二','现在是说这个的时候吗？！'],
 ['环境','门外传来一模一样的声音：“你、你是人吧？！”','echo'],
 ['女二','……谁？那个是我的声音？'],
 ['女主','别回头。'],
 ['环境','一种沉重的东西沿着门框爬进来。你握紧手里的武器。','attack'],
 ['女主','蹲下。现在。','strike'],
 ['环境','女孩抱头蹲下。视线边缘闪过一道寒光，随后是重物砸在地上的闷响。','impact'],
 ['女二','它、它没了？！你刚才做了什么？！'],
 ['女主','清扫。'],
 ['女二','清扫？！你把那个叫清扫？！'],
 ['女主','你可以换一个好听的词。'],
 ['女二','我连这里是哪都不知道！我只是想从学校出去！'],
 ['女主','第一次进来？'],
 ['女二','第一次？！难道还有第二次吗？！'],
 ['女主','有的人运气没那么好。'],
 ['女二','……我只想回家。'],
 ['环境','门外传来三下敲击。前两下是木头声，第三下像敲在你的后脑。','knock'],
 ['女二','那边有光……会不会是出口？'],
 ['女主','看着地上，先别过去。'],
 ['选择','门里突然响起你的声音。你先做什么？','choice1',[
   {label:'观察门缝下的影子',value:'shadow'},
   {label:'确认敲门的方向',value:'knock'}
 ]],
 ['女主·心声','这声音……离门太近了。','',null,{shadow:'门缝下的影子正朝着光的反方向生长。',knock:'第三声从你身后响起，和门后的脚步不可能属于同一个人。'}],
 ['女二','等、等一下！那个影子在动！'],
 ['女主','看到了。后退。'],
 ['环境','门板猛地向内一鼓，漆黑的水线沿着缝隙抽走。','impact'],
 ['女二','为什么我们没事……'],
 ['女主','因为你至少学会了停下。'],
 ['女二','你就不能好好夸人吗？！'],
 ['环境','袖口里的记录夹突然自行亮起。','record'],
 ['终端','清扫记录：27 / 28。'],
 ['女主·心声','不对。清扫目标进来时只有二十七个。'],
 ['终端','第 28 号：栗棕马尾，深色校服。首次出现。'],
 ['终端','当前位置：清道夫身后。','warning'],
 ['环境','你缓缓抬起视线。女孩正看着门口，仍在努力平复呼吸。'],
 ['女二','怎么了？你脸色好像……很不好。'],
 ['女主','在考虑要不要把你留在这。'],
 ['女二','喂？！我刚刚还帮了你吧？！'],
 ['女主','所以还没决定。'],
 ['女二','这是什么理由啊！'],
 ['女主','别离开我视线。'],
 ['终端','请勿包庇。','warning'],
 ['环境','教室突然安静下来。灯亮了，黑板上出现两行没有姓名的值日记录。','silence'],
 ['女二','……等等。这不就是我们的教室吗？'],
 ['女主','“我们的”？'],
 ['女二','对啊。难道你不是这里的学生？'],
 ['女主','我可没说过。'],
 ['广播','今日清扫工作已经结束。','radio'],
 ['广播','当前未登记人员：两名。'],
 ['女二','两名……包括你？！'],
 ['广播','请前往广播室，领取自己的名字。'],
 ['女二','你也听到了吧？我们现在怎么办？'],
 ['女主','先把广播关了。'],
 ['广播中的女主','第二十八号。已确认接触。','warning'],
 ['环境','声音和你自己的声音完全一样。你从未对它报过名字。','ending'],
 ['终端','状态更新：正在与你同行。'],
 ['序章','清扫名单上的活人。']
];
const lines=Object.freeze(rows.map(([speaker,text,cue,choices,variants])=>
 Object.freeze({speaker,text,cue:cue||'',choices:choices||null,variants:variants||null})));
let view=null,fx=null,enemy=null,started=false,disposed=false,sceneSound=null;
let selections=Object.create(null),oldEnemy=null,ownsEnemy=false,expectedEnemy=null;
const choiceKey=line=>line?.cue==='choice1'?'entrance':null;
const readChoice=key=>selections[key]||null;
const choices=()=>({...selections});
function restoreChoices(data){
 selections=Object.create(null);
 if(data&&['shadow','knock'].includes(data.entrance))selections.entrance=data.entrance;
}
function choose(line,value){
 const key=choiceKey(line);
 if(!key||!line.choices.some(option=>option.value===value))return false;
 selections[key]=value;return true;
}
function textFor(line){
 if(line?.variants?.[selections.entrance])return line.variants[selections.entrance];
 return line?.text||'';
}
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
function setFemaleVisible(visible){
 if(!enemy)return;
 enemy.hidden=!visible;
 enemy.dataset.prologuePose=visible?'present':'absent';
}
function cue(index){
 if(!started||!view)return;
 const line=lines[index];if(!line)return;
 const type=line.cue||'idle';
 fx.hidden=false;
 fx.className=''; // restart individual short impacts
 void fx.offsetWidth;
 fx.className='prologue-'+type;
 if(type==='reveal'||index>=13)setFemaleVisible(true);
 else setFemaleVisible(false);
 if(type==='ending')view.dataset.prologueEnding='true';
 else view.dataset.prologueEnding='false';
 playSound(type);
}
async function ensureCharacter(){
 // This is a temporary story casting choice, NOT a write to the DEV slot
 // or a replacement of the user's uploaded L2D/rig and saved preferences.
 for(let frame=0;frame<180&&started&&!disposed;frame++){
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
 ensureCharacter();
}
async function leave(){
 if(!started)return;
 started=false;disposed=true;
 if(view){view.classList.remove('prologue-first-person');delete view.dataset.prologueEnding;}
 if(fx){fx.hidden=true;fx.className='';}
 if(enemy){enemy.dataset.prologuePose='';}
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
function reset(){restoreChoices(null);}
root.PaperWorldPrologue=Object.freeze({
 lines,enter,leave,cue,enableAudio,reset,choose,choices,restoreChoices,textFor
});
})(window);