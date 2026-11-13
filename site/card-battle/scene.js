/* Original first-person tabletop presentation for Paperchalk Timegrid.
 * Inspiration: tactile card handling, low light and wood, not Inscryption rules
 * or copyrighted card/sound/art assets. Existing GitHub portraits remain intact.
 */
'use strict';
(function(){
const G=window.Timegrid;
const $=id=>document.getElementById(id);
if(!G){$('status').textContent='无法载入时间步战斗引擎，请刷新页面';return;}

let battle,selected=null,latestAction=null,playback=null,toastTimer=null;
let dragging=null,suppressClick=null,soundOn=true,audio=null,impactTimer=null,frameTimer=null;
let partySize=3,targetId=null;
const seed=618231;
const ALLY_ART=[
 {name:'传奇猎人',file:'../assets/characters/monster-hunters/01-legendary-hunter.png'},
 {name:'血液医师',file:'../assets/characters/monster-hunters/02-blood-physician.png'},
 {name:'陷阱工程师',file:'../assets/characters/monster-hunters/03-trap-engineer.png'}
];
const ENEMY_ART=[
 {name:'马戏团团长',file:'../assets/cards/wonder-circus/01_ringmaster.png'},
 {name:'空中杂技师',file:'../assets/cards/wonder-circus/02_aerial-acrobat.png'},
 {name:'飞刀手',file:'../assets/cards/wonder-circus/03_knife-thrower.png'}
];
const tinyNames={attack:'攻 击',defense:'防 御',skill:'技 能',power:'能 力',special:'特 殊',system:'整 理'};
// Three original ink-engraved marks replace system emoji; crisp at card scale.
const sigilShapes={
 attack:'<path d="M23 23 91 91M97 103 87 93M17 17l18 6-12 12-6-18ZM27 91 91 27M103 17 97 35 85 23l18-6ZM17 103l6-18 12 12-18 6Z"/><path d="M35 83 26 74M74 26l9 9" stroke-width="2.4"/>',
 defense:'<path d="M60 12 91 25v38c0 20-16 32-31 44C45 95 29 83 29 63V25Z"/><path d="M60 23v68M39 40l21 9 21-9M43 66l17 8 17-8" stroke-width="2.2"/><path d="M47 28l13-5 13 5" stroke-width="2"/>',
 skill:'<circle cx="60" cy="60" r="32" stroke-width="2.2"/><path d="m60 14 8 33 33 13-33 9-8 35-9-35-33-9 33-13Z"/><circle cx="60" cy="60" r="6" fill="currentColor" stroke="none"/><path d="M19 22h17m48 0h17M19 98h17m48 0h17" stroke-width="2"/>',
 other:'<circle cx="60" cy="60" r="35"/><path d="M60 20 99 60 60 100 21 60Z"/><path d="M60 38v44M38 60h44" stroke-width="2.5"/>'
};
function makeSigil(type){
 const holder=elem('span','sigil');
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" stroke-width="3.5" aria-hidden="true">'+
  (sigilShapes[type]||sigilShapes.other)+'</svg>';
 holder.innerHTML=svg;
 return holder;
}
const marks={windup:'前',active:'效',recovery:'后',disabled:'停'};

function elem(tag,cls,txt){
 const e=document.createElement(tag);
 if(cls)e.className=cls;
 if(txt!==undefined)e.textContent=txt;
 return e;
}
function living(side,source=battle){return source.actors.filter(a=>a.side===side&&!a.dead);}
function actor(side,source=battle){
 if(!source)return null;
 const id=side==='ally'?source.controlledId:targetId;
 return source.actors.find(a=>a.side===side&&a.id===id&&!a.dead)
    ||source.actors.find(a=>a.side===side&&!a.dead)
    ||source.actors.find(a=>a.side===side)||null;
}
function normalizeSelection(){
 if(!battle)return;
 if(living('ally').length&&!living('ally').some(a=>a.id===battle.controlledId)){
   if(battle.options?.controlAllies)G.setControlled(battle,living('ally')[0].id);
 }
 if(living('enemy').length&&!living('enemy').some(a=>a.id===targetId))targetId=living('enemy')[0].id;
}
function buildSquads(){
 for(const side of ['enemy','ally']){
  const host=$(side+'-squad');host.replaceChildren();
  const fighters=battle.actors.filter(a=>a.side===side),art=side==='ally'?ALLY_ART:ENEMY_ART;
  host.dataset.count=String(fighters.length);
  fighters.forEach((a,i)=>{
   const fighter=elem('div','fighter '+side);
   fighter.dataset.actor=a.id;
   const portrait=elem('button','portrait');
   portrait.type='button';portrait.dataset.actor=a.id;portrait.dataset.side=side;
   portrait.setAttribute('aria-label',side==='ally'?'操作'+a.name:'指定攻击目标'+a.name);
   const image=document.createElement('img');image.alt=art[i].name;image.src=art[i].file;
   const fallback=elem('span','fallback','图片加载失败');
   image.addEventListener('error',()=>portrait.classList.add('missing'));
   portrait.append(image,fallback);
   const label=elem('div','unit-label'),name=elem('span','',art[i].name),hp=elem('span','hp');
   hp.append('♥ ',elem('b','hp-number',String(a.hp)));
   label.append(name,hp);fighter.append(portrait,label);host.appendChild(fighter);
  });
 }
}
function selectActor(id){
 if(playback||battle.phase!=='planning')return;
 const a=battle.actors.find(item=>item.id===id&&item.side==='ally'&&!item.dead);
 if(!a)return;
 if(battle.options.controlAllies)G.setControlled(battle,a.id);
 selected=null;latestAction=null;
 note('当前角色：'+a.name+'，请从她的手牌选择行动');
 sound('draw');render();
}
function selectTarget(id){
 if(playback||battle.phase!=='planning')return;
 const e=battle.actors.find(item=>item.id===id&&item.side==='enemy'&&!item.dead);
 if(!e)return;
 targetId=e.id;sound('card');note('攻击目标：'+e.name);render();
}
function showToast(message,duration=2100){
 const note=$('toast');
 note.textContent=message;note.hidden=false;
 clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>{note.hidden=true;},duration);
}
function note(message){$('status').textContent=message;}
function shadeCard(card){
 if(card.type==='defense')return 'defense';
 if(card.type==='attack')return 'attack';
 return 'skill';
}
function makeWoodTexture(){
 const c=document.createElement('canvas');c.width=1024;c.height=512;
 const x=c.getContext('2d'),rnd=mulberry32(201126);
 const background=x.createLinearGradient(0,0,1024,0);
 background.addColorStop(0,'#311e13');background.addColorStop(.21,'#624024');
 background.addColorStop(.48,'#342116');background.addColorStop(.75,'#654024');background.addColorStop(1,'#271a12');
 x.fillStyle=background;x.fillRect(0,0,1024,512);
 // Long horizontal fibres rather than repeated vector stripes.
 for(let i=0;i<2250;i++){
   const y=rnd()*512,xx=rnd()*1024,len=18+rnd()*470;
   const alpha=.025+rnd()*.13;
   x.strokeStyle=rnd()>.54?'rgba(231,177,106,'+alpha+')':'rgba(12,7,5,'+alpha+')';
   x.lineWidth=rnd()*1.9+.25;x.beginPath();x.moveTo(xx,y);
   x.bezierCurveTo(xx+len*.25,y-1+rnd()*4,xx+len*.7,y-3+rnd()*6,xx+len,y-1+rnd()*5);
   x.stroke();
 }
 for(let n=0;n<4;n++){
  const y=82+n*122+Math.floor(rnd()*22);
  x.strokeStyle='rgba(12,8,6,.66)';x.lineWidth=3;
  x.beginPath();x.moveTo(0,y);x.lineTo(1024,y-2);x.stroke();
  x.strokeStyle='rgba(232,170,106,.18)';x.lineWidth=2;
  x.beginPath();x.moveTo(0,y+4);x.lineTo(1024,y+2);x.stroke();
 }
 for(let i=0;i<14;i++){
   const xx=20+rnd()*984,yy=15+rnd()*485,rx=8+rnd()*26,ry=2+rnd()*8;
   x.strokeStyle='rgba(19,10,7,'+(.16+rnd()*.20)+')';x.lineWidth=1;
   for(let j=0;j<3;j++){
     x.beginPath();x.ellipse(xx,yy,rx+j*5,ry+j*2,rnd()*.1,0,Math.PI*2);x.stroke();
   }
 }
 for(let i=0;i<480;i++){
  const xx=rnd()*1024,yy=rnd()*512;x.fillStyle=rnd()>.48?'#b58b4b23':'#00000026';
  x.fillRect(xx,yy,rnd()*15+.5,.4+rnd()*1.4);
 }
 document.documentElement.style.setProperty('--wood','url("'+c.toDataURL('image/jpeg',.83)+'")');
}
function makePaperTexture(){
 const c=document.createElement('canvas');c.width=256;c.height=384;
 const x=c.getContext('2d'),rnd=mulberry32(32015);
 const grad=x.createLinearGradient(0,0,256,384);
 grad.addColorStop(0,'#efdda7');grad.addColorStop(.48,'#cbac79');grad.addColorStop(1,'#b99262');
 x.fillStyle=grad;x.fillRect(0,0,256,384);
 for(let i=0;i<8000;i++){
  const xx=rnd()*256,yy=rnd()*384,sz=rnd()*1.1+.1;
  x.fillStyle=rnd()>.55?'rgba(54,29,17,.11)':'rgba(255,248,218,.19)';
  x.fillRect(xx,yy,sz,sz);
 }
 for(let i=0;i<75;i++){
   x.strokeStyle='rgba(88,63,36,.04)';x.lineWidth=rnd()*.5+.1;
   x.beginPath();const yy=rnd()*384;x.moveTo(rnd()*220,yy);
   x.lineTo(250,yy+rnd()*3);x.stroke();
 }
 document.documentElement.style.setProperty('--paper-texture','url("'+c.toDataURL('image/png')+'")');
}
function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}

function ensureAudio(){
 if(!soundOn)return null;
 try{
  if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();
  if(audio.state==='suspended')audio.resume();
  return audio;
 }catch{return null;}
}
function sound(kind='card'){
 const a=ensureAudio();if(!a)return;
 const now=a.currentTime;
 const o=a.createOscillator(),g=a.createGain();
 o.type='triangle';
 const hz=kind==='hit'?78:kind==='execute'?140:kind==='draw'?255:112;
 o.frequency.setValueAtTime(hz,now);
 o.frequency.exponentialRampToValueAtTime(Math.max(28,hz*.62),now+.12);
 g.gain.setValueAtTime(kind==='hit'?.13:.045,now);
 g.gain.exponentialRampToValueAtTime(.0001,now+(kind==='hit'?.20:.10));
 o.connect(g);g.connect(a.destination);o.start(now);o.stop(now+.22);
 // Short filtered noise resembles paper brush/wood contact, entirely synthesized.
 if(kind!=='execute'){
  const n=Math.floor(a.sampleRate*.07),buffer=a.createBuffer(1,n,a.sampleRate);
  const data=buffer.getChannelData(0),r=mulberry32(8834+Math.floor(now*80));
  for(let i=0;i<n;i++)data[i]=(r()*2-1)*(1-i/n);
  const source=a.createBufferSource(),filter=a.createBiquadFilter(),ng=a.createGain();
  // Noise is synthesized at runtime: no copied music or audio samples.
  buffer.copyToChannel(data,0);source.buffer=buffer;
  filter.type='lowpass';filter.frequency.value=kind==='draw'?1800:540;
  ng.gain.setValueAtTime(kind==='hit'?.07:.032,now);
  ng.gain.exponentialRampToValueAtTime(.0001,now+.065);
  source.connect(filter);filter.connect(ng);ng.connect(a.destination);
  source.start(now);source.stop(now+.071);
 }
}
function cardAtTick(a,t,root){
 const at=root.now+t-1;
 const action=a.actions.find(v=>!v.canceled&&G.phase(G.CARD[v.card],v.start,at));
 if(action)return {action,phase:G.phase(G.CARD[action.card],action.start,at)};
 return a.stunUntil>at?{phase:'disabled'}:null;
}
function drawTimeline(){
 const base=playback?playback.before:battle;
 const host=$('timeline');host.replaceChildren();
 const ruler=elem('div','tick-row header');
 ruler.appendChild(elem('span','tick-label',''));
 for(let i=1;i<=10;i++)ruler.appendChild(elem('span','tick',String(i)));
 host.appendChild(ruler);
 for(const side of ['enemy','ally']){
  const actors=base.actors.filter(a=>a.side===side);
  for(let idx=0;idx<actors.length;idx++){
   const a=actors[idx],friend=side==='ally';
   const row=elem('div','tick-row '+(friend?'friendly':'hostile')+(friend&&actor('ally',base)?.id===a.id?' selected':''));
   row.dataset.rowActor=a.id;
   row.appendChild(elem('span','tick-label',(friend?'我':'敌')+(idx+1)));
   for(let t=1;t<=10;t++){
    const state=cardAtTick(a,t,base),phase=state?.phase||'';
    const cell=elem(friend?'button':'span','tick '+(phase||'empty')+(friend?' friend':''),marks[phase]||'');
    if(friend){
     cell.type='button';cell.dataset.tick=String(t);cell.dataset.actor=a.id;
     cell.disabled=!!playback||battle.phase!=='planning'||a.dead;
     cell.setAttribute('aria-label',a.name+' 第'+t+'格'+(phase?'：'+(marks[phase]||phase):'：空'));
     if(state?.action)cell.dataset.action=state.action.id;
     if(selected&&a.id===actor('ally')?.id)cell.classList.add('can-drop');
    }
    if(state?.action)cell.title=G.CARD[state.action.card].name+' · '+(marks[phase]||phase);
    if(playback&&playback.index+1===t)cell.classList.add('playing');
    row.appendChild(cell);
   }
   host.appendChild(row);
  }
 }
}
function drawHand(){
 const host=$('hand');host.replaceChildren();
 const a=actor('ally'),arr=a.hand;
 $('hand-count').textContent='手牌 · '+arr.length;
 if(!arr.length){host.appendChild(elem('span','hand-empty','手牌已排完 · 可执行时间步'));return;}
 for(let i=0;i<arr.length;i++){
   const it=arr[i],c=G.CARD[it.key];if(!c)continue;
   const card=elem('button','action-card '+shadeCard(c)+(selected===it.uid?' selected':''));card.type='button';
   card.dataset.uid=it.uid;card.style.setProperty('--angle',((i-(arr.length-1)/2)*4.2)+'deg');
   card.style.setProperty('--fan',(Math.abs(i-(arr.length-1)/2)*6.5).toFixed(1)+'px');
   card.setAttribute('aria-pressed',String(selected===it.uid));
   card.setAttribute('aria-label',c.name+'。前摇'+c.w+'格，生效'+c.a+'格，后摇'+c.r+'格');
   card.appendChild(elem('span','type',tinyNames[c.type]||'行 动'));
   card.appendChild(elem('strong','',c.name));
   card.appendChild(makeSigil(c.type));
   card.appendChild(elem('span','desc',c.desc||'按时间格发动'));
   const times=elem('div','ticks');
   for(const text of ['前 '+c.w,'效 '+c.a,'后 '+c.r])times.appendChild(elem('b','',text));
   card.appendChild(times);host.appendChild(card);
 }
}
function displayVitals(){
 normalizeSelection();
 const before=playback?.before;
 for(const side of ['ally','enemy']){
  const host=$(side+'-squad');
  for(const fighter of host.querySelectorAll('.fighter')){
   const id=fighter.dataset.actor;
   const a=battle.actors.find(item=>item.id===id);
   if(!a)continue;
   let hp=a.hp;
   if(before){
     hp=before.actors.find(item=>item.id===id)?.hp??hp;
     if(playback.index>=0)hp=playback.frames[playback.index]?.actors.find(item=>item.id===id)?.hp??hp;
   }
   fighter.querySelector('.hp-number').textContent=String(hp)+'/'+a.maxHp;
   fighter.classList.toggle('dead',hp<=0);
   fighter.classList.toggle('selected',side==='ally'&&actor('ally',before||battle)?.id===id);
   fighter.classList.toggle('targeted',side==='enemy'&&targetId===id);
   fighter.querySelector('button.portrait').disabled=!!playback||battle.phase!=='planning'||hp<=0;
  }
 }
 const active=actor('ally',before||battle);
 const hpState=playback&&playback.index>=0
  ?playback.frames[playback.index]?.actors.find(x=>x.id===active?.id)
  :null;
 $('energy').textContent=String(hpState?.energy??active?.energy??0);
 $('round').textContent='第 '+((playback?before:battle).round+1)+' 轮';
 $('phase').textContent=playback?'执行中 · 第 '+(playback.index+1)+' 格':battle.phase==='planning'?'规划中 · 时间暂停':battle.phase==='win'?'已胜利':'已失败';
 $('round-phase').textContent=playback?'同步结算中':battle.phase==='planning'?'10 格同步结算':battle.phase==='win'?'战斗胜利':'战斗失败';
 for(const b of $('party-select').querySelectorAll('button[data-party]')){
   const activeParty=Number(b.dataset.party)===partySize;
   b.classList.toggle('chosen',activeParty);b.setAttribute('aria-pressed',String(activeParty));b.disabled=!!playback;
 }
}
function render(){
 displayVitals();drawTimeline();
 if(!playback)drawHand();
 $('execute').disabled=!!playback||battle.phase!=='planning';
 $('execute').textContent=playback?'时间流动中…':battle.phase==='win'?'获胜':'执行时间步';
 $('undo').disabled=!!playback||battle.phase!=='planning'||!actor('ally').actions.some(x=>x.source==='hand'&&!x.locked&&x.start>=battle.now);
}
function initialize(){
 clearTimeout(frameTimer);frameTimer=null;playback=null;dragging=null;suppressClick=null;
 const encounter=partySize===1?'corridor':partySize===2?'twins':'siege';
 battle=G.create({classId:'axe',styleId:'strike',encounterId:encounter,
  team:partySize>1,controlAllies:partySize>1,partySize,enemySize:partySize,
  campaignBalance:partySize===1,seed});
 const friends=battle.actors.filter(a=>a.side==='ally');
 const enemies=battle.actors.filter(a=>a.side==='enemy');
 for(let i=0;i<friends.length;i++)friends[i].name=ALLY_ART[i].name;
 for(let i=0;i<enemies.length;i++)enemies[i].name=ENEMY_ART[i].name;
 targetId=enemies[0].id;
 selected=null;latestAction=null;
 buildSquads();
 $('last-event').textContent='敌方行动已预先刻在木板上';
 $('notice').textContent='点人物 → 选手牌 → 排时间 → 执行';
 note('选择我方人物的手牌，再选择时间格；点击敌方人物可指定目标');
 $('stage').classList.remove('playing');
 render();sound('draw');
}
function selectCard(uid){
 if(playback||battle.phase!=='planning')return;
 if(!actor('ally')?.hand.some(x=>x.uid===uid))return;
 selected=selected===uid?null:uid;
 sound('draw');
 note(selected?'拿起了卡牌；点击「我」的时间格，或拖动到目标时间格':'已放回手牌');
 render();
}
function placeCard(t,laneId=null){
 if(playback||battle.phase!=='planning')return;
 const hero=actor('ally'),target=actor('enemy');
 if(laneId&&laneId!==hero?.id){
  selectActor(laneId);
  note('已切换角色；请选这位队友的行动手牌');
  return;
 }
 if(!selected){note('先拿起底部手牌，再选择第1—10格');return;}
 const inst=hero.hand.find(it=>it.uid===selected);
 if(!inst){selected=null;render();return;}
 const c=G.CARD[inst.key];
 const friendly=c.type==='defense'||c.heal||c.buff||c.steady;
 try{
  const action=G.place(battle,inst.uid,t,friendly?hero.id:target.id);
  latestAction=action.id;selected=null;sound('card');
  note(hero.name+' · '+c.name+' 从第'+t+'格开始'+(friendly?'':(' → '+target.name)));
  $('notice').textContent='计划已刻下 · 可取回或执行';
 }catch(err){sound('hit');showToast(err.message,2500);note('位置不可用，请重新选时间格');}
 render();
}
function returnCard(actionId=null){
 if(playback||battle.phase!=='planning')return;
 const actions=actor('ally').actions.filter(x=>x.source==='hand'&&!x.locked&&x.start>=battle.now);
 const found=actions.find(x=>x.id===(actionId||latestAction))||actions.at(-1);
 if(!found){showToast('没有可取回的卡牌');return;}
 try{G.remove(battle,found.id);latestAction=null;sound('draw');note('已取回「'+G.CARD[found.card].name+'」');}
 catch(err){showToast(err.message);}
 render();
}
function impact(actorId){
 const el=document.querySelector('.squad .fighter[data-actor="'+actorId+'"]');
 if(el){el.classList.remove('recoil');void el.offsetWidth;el.classList.add('recoil');}
 const stage=$('stage');stage.classList.remove('impact');void stage.offsetWidth;stage.classList.add('impact');
 clearTimeout(impactTimer);
 impactTimer=setTimeout(()=>{el?.classList.remove('recoil');stage.classList.remove('impact');},230);
 sound('hit');
}
function floatEvent(text){
 const popup=elem('div','event-popup',text);
 $('stage').appendChild(popup);
 setTimeout(()=>popup.remove(),750);
}
function frameAdvance(){
 if(!playback)return;
 playback.index++;
 if(playback.index>=playback.frames.length){
  const result=battle.phase;
  playback=null;$('stage').classList.remove('playing');
  $('last-event').textContent=battle.log.slice(-2).map(e=>e.text).join(' · ')||'本轮未命中';
  if(result==='win'||result==='lost'){
   note(result==='win'?'猎人队获胜 · 点击重开再战':'猎人队战败 · 点击重开再战');
   showToast(result==='win'?'胜利':'战斗失败',3500);
  }else note('新的一轮 · 可以为每位存活角色分别安排动作');
  render();return;
 }
 const step=playback.frames[playback.index],events=step.events||[];
 for(const event of events){
  if(['damage','death','break'].includes(event.kind)){
   const text=event.text.includes('→')?event.text.split('→').at(-1):event.text;
   const target=battle.actors.find(a=>text.includes(a.name));
   if(target)impact(target.id);
   floatEvent(event.kind==='damage'?'命中':event.kind==='death'?'击败':'破防');
  }else if(event.kind==='block')sound('card');
 }
 displayVitals();drawTimeline();
 if(events.length)$('last-event').textContent=events.at(-1).text;
 frameTimer=setTimeout(frameAdvance,215);
}
function execute(){
 if(playback||battle.phase!=='planning')return;
 const before=G.clone(battle);
 let trace;
 try{
   G.simulateRound(battle,{collectTrace:true});
   trace=battle.trace?.slice()||[];
 }catch(err){showToast('结算失败：'+err.message,3500);render();return;}
 selected=null;latestAction=null;
 if(!trace.length){render();return;}
 playback={before,frames:trace,index:-1};
 sound('execute');$('stage').classList.add('playing');
 note('时间开始流动…');render();
 frameTimer=setTimeout(frameAdvance,170);
}

// Hand as physical objects: click to select; drag to a time notch; lift and tilt
// follows pointer, with a dedicated ghost (no old 3D tabletop nine-slot hitboxes).
$('hand').addEventListener('pointerdown',e=>{
 const card=e.target.closest('button[data-uid]');
 if(!card||e.button!==0||playback)return;
 dragging={uid:card.dataset.uid,x:e.clientX,y:e.clientY,card,ghost:null,started:false};
 try{card.setPointerCapture(e.pointerId);}catch{}
});
$('hand').addEventListener('pointermove',e=>{
 const card=e.target.closest('button[data-uid]');
 if(card&&!dragging&&e.pointerType!=='touch'){
  const rect=card.getBoundingClientRect();
  const px=(e.clientX-rect.left)/rect.width-.5,py=(e.clientY-rect.top)/rect.height-.5;
  card.style.setProperty('--tilt-y',(Math.max(-1,Math.min(1,px*2))*5).toFixed(2)+'deg');
  card.style.setProperty('--tilt-x',(-Math.max(-1,Math.min(1,py*2))*4).toFixed(2)+'deg');
 }
 if(!dragging)return;
 if(!dragging.started&&Math.hypot(e.clientX-dragging.x,e.clientY-dragging.y)>11){
   dragging.started=true;
   const ghost=dragging.card.cloneNode(true);
   ghost.className+=' drag-card';ghost.removeAttribute('id');
   ghost.style.setProperty('--tilt-x','0deg');ghost.style.setProperty('--tilt-y','0deg');
   document.body.appendChild(ghost);dragging.ghost=ghost;
   dragging.card.classList.add('dragging');
   sound('draw');note('将纸牌拖到时间刻痕上');
 }
 if(dragging.started){
   dragging.ghost.style.left=e.clientX+'px';
   dragging.ghost.style.top=e.clientY+'px';
   for(const c of $('timeline').querySelectorAll('.drag-over'))c.classList.remove('drag-over');
   const dest=document.elementFromPoint(e.clientX,e.clientY)?.closest('button[data-tick]');
   if(dest&&!dest.disabled)dest.classList.add('drag-over');
 }
});
function finishDrag(e){
 if(!dragging)return;
 const item=dragging;dragging=null;
 if(item.started){
   suppressClick=item.uid;
   item.card.classList.remove('dragging');
   item.ghost?.remove();
   for(const c of $('timeline').querySelectorAll('.drag-over'))c.classList.remove('drag-over');
   const destination=document.elementFromPoint(e.clientX,e.clientY)?.closest('button[data-tick]');
   selected=item.uid;
   if(destination&&!destination.disabled)placeCard(Number(destination.dataset.tick),destination.dataset.actor);
   else {note('纸牌已拿起；点击时间格放置');render();}
 }
}
$('hand').addEventListener('pointerup',finishDrag);
$('hand').addEventListener('pointercancel',e=>{
 if(dragging){dragging.ghost?.remove();dragging.card.classList.remove('dragging');dragging=null;}
});
$('hand').addEventListener('pointerleave',e=>{
 if(!dragging)for(const card of $('hand').querySelectorAll('.action-card')){
  card.style.removeProperty('--tilt-x');card.style.removeProperty('--tilt-y');
 }
});
$('hand').addEventListener('click',e=>{
 const card=e.target.closest('button[data-uid]');if(!card)return;
 if(suppressClick===card.dataset.uid){suppressClick=null;return;}
 selectCard(card.dataset.uid);
});
$('timeline').addEventListener('click',e=>{
 const b=e.target.closest('button[data-tick]');if(!b||b.disabled)return;
 if(!selected&&b.dataset.action){returnCard(b.dataset.action);return;}
 placeCard(Number(b.dataset.tick),b.dataset.actor);
});
for(const side of ['enemy','ally']){
 $(side+'-squad').addEventListener('click',e=>{
  const card=e.target.closest('button.portrait[data-actor]');
  if(!card||card.disabled)return;
  if(side==='ally')selectActor(card.dataset.actor);
  else selectTarget(card.dataset.actor);
 });
}
$('party-select').addEventListener('click',e=>{
 const b=e.target.closest('button[data-party]');
 if(!b||playback)return;
 const n=Number(b.dataset.party);
 if(!Number.isInteger(n)||n<1||n>3||n===partySize)return;
 partySize=n;initialize();
 showToast('已切换为 '+n+' 对 '+n+'，重新开始战斗',1700);
});
$('execute').addEventListener('click',execute);
$('undo').addEventListener('click',()=>returnCard());
$('restart').addEventListener('click',initialize);
$('back').addEventListener('click',()=>{window.location.assign('../');});
$('sound').addEventListener('click',()=>{
 soundOn=!soundOn;
 $('sound').textContent='音效：'+(soundOn?'开':'关');
 $('sound').setAttribute('aria-pressed',String(soundOn));
 if(soundOn)sound('draw');
});
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&selected&&!playback){selected=null;note('已放回手牌');render();}
 if((e.key==='Enter'||e.key===' ')&&e.target?.id==='execute'){e.preventDefault();execute();}
});
// A restrained 2-3 pixel mouse parallax: tabletop remains a stable plane,
// unlike the rejected exaggerated camera swings in earlier prototypes.
const lessMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
if(!lessMotion){
 let mx=0,my=0,cx=0,cy=0;
 $('stage').addEventListener('pointermove',e=>{
  if(e.pointerType==='touch')return;
  mx=(e.clientX/innerWidth-.5)*5;my=(e.clientY/innerHeight-.5)*3;
 });
 const sway=()=>{
  cx+=(mx-cx)*.065;cy+=(my-cy)*.065;
  if(!$('stage').classList.contains('impact'))
   $('board').style.transform='translate3d('+cx.toFixed(2)+'px,'+cy.toFixed(2)+'px,0)';
  requestAnimationFrame(sway);
 };
 requestAnimationFrame(sway);
}
makeWoodTexture();makePaperTexture();initialize();
})();