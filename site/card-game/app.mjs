import {VERSION,SUITS,RANKS,HANDS,JOKERS,BLINDS,createGame,loadGame,currentBlind,selection,preview,play,discardSelected,purchase,reroll,levelUp,proceed,sortHand,moveJoker} from './engine.mjs?v=20261101-card01';
const $=id=>document.getElementById(id),KEY='paperworld-card-paradox-v1';
const P=['#393657','#F2A5C2','#A9BAE9','#FFF5E6'];
let s,locked=false,soundOn=false,ac=null,lastFrame=0,selectedJokerId=null;
try{s=loadGame(localStorage.getItem(KEY));}catch{}
if(!s)s=createGame(1729);
try{soundOn=localStorage.getItem('paperworld-card-audio')==='on'}catch{}
function save(){try{localStorage.setItem(KEY,JSON.stringify(s));$('save-status').textContent='已自动存档';}catch{$('save-status').textContent='本设备无法保存'}}
function number(n){return n.toLocaleString('zh-CN')}
function tone(f=440,d=.06,wave='sine',volume=.065){
 if(!soundOn)return;
 try{
  ac=ac||new (window.AudioContext||window.webkitAudioContext)();
  if(ac.state==='suspended')ac.resume();
  const osc=ac.createOscillator(),gain=ac.createGain(),t=ac.currentTime;
  osc.type=wave;osc.frequency.setValueAtTime(f,t);osc.frequency.exponentialRampToValueAtTime(f*.84,t+d);
  gain.gain.setValueAtTime(Math.max(.0001,volume),t);
  gain.gain.exponentialRampToValueAtTime(.001,t+d);
  osc.connect(gain);gain.connect(ac.destination);osc.start(t);osc.stop(t+d+.005);
 }catch{}
}
function ping(){tone(390,.055,'triangle',.037)}
function pts(id){const c=s.hand.find(x=>x.id===id);return c?{x:c.rank===1?14:c.rank,y:c.suit}:null}
let lastPreviewSignature='';
function pulsePreview(){
 for(const id of ['chips-display','mult-display','predicted-score']){
  const el=$(id);el.classList.remove('counter-kick');void el.offsetWidth;el.classList.add('counter-kick');
 }
}
function refreshPreview(){
 const p=preview(s);
 const signature=p?(p.id+':'+p.score+':'+s.selected.join('|')):'none';
 if(signature!==lastPreviewSignature&&lastPreviewSignature!=='')pulsePreview();
 lastPreviewSignature=signature;
 $('hand-kind').textContent=p?p.name:'选择卡牌';
 $('chips-display').textContent=p?number(p.chips):'0';
 $('mult-display').textContent=p?number(p.mult):'0';
 $('predicted-score').textContent=p?number(p.score):'0';
 $('selected-count').textContent=s.selected.length+' / 5';
 $('play-button').disabled=locked||s.phase!=='battle'||!s.selected.length;
 $('discard-button').disabled=locked||s.phase!=='battle'||!s.selected.length||s.discards===0;
 $('discard-button').querySelector('span').textContent='剩余 '+s.discards+' 次';
}
function paintGlyph(canvas,glyph){
 const ctx=canvas.getContext('2d',{alpha:true});
 canvas.width=32;canvas.height=32;
 ctx.clearRect(0,0,32,32);ctx.imageSmoothingEnabled=false;
 const px=(x,y,w,h,color=0)=>{ctx.fillStyle=P[color];ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
 // Every motif has a readable 32×32 integer pixel construction, never vector blur.
 px(0,0,32,32,3);px(2,2,28,28,0);px(4,4,24,24,2);
 const step=(coords,c=1)=>coords.forEach(([x,y,w,h])=>px(x,y,w,h,c));
 switch(glyph){
  case 'lamp':
   step([[13,3,6,3],[11,6,10,3],[9,9,14,9],[11,18,10,3],[14,21,4,4],[10,25,12,3]],0);
   step([[13,8,6,9],[12,13,8,3]],1);step([[16,9,2,7]],3);break;
  case 'gear':
   step([[12,4,8,24],[4,12,24,8],[7,7,18,18]],0);step([[10,10,12,12]],1);
   step([[13,13,6,6]],2);break;
  case 'rose':
   step([[8,8,16,13],[11,5,10,19],[13,22,6,7]],0);
   step([[11,10,10,10],[14,7,6,8]],1);step([[9,19,7,4],[17,22,7,4]],2);break;
  case 'mirror':
   step([[5,4,22,24],[8,7,16,18]],0);step([[10,9,12,13]],2);
   step([[13,9,3,13]],3);step([[9,24,14,3]],1);break;
  case 'moon':
   step([[11,5,14,23]],0);step([[12,5,12,20]],3);step([[16,3,13,20]],2);
   step([[8,22,7,3]],1);break;
  case 'star':
   step([[14,3,4,26],[3,14,26,4],[8,8,16,16]],0);
   step([[14,8,4,16],[8,14,16,4]],1);step([[14,14,4,4]],3);break;
  case 'clock':
   step([[9,4,14,4],[12,8,8,7],[9,15,14,3],[12,18,8,7],[9,25,14,4]],0);
   step([[12,8,8,5],[12,19,8,5]],1);step([[14,14,4,6]],3);break;
  case 'crown':
   step([[4,10,5,13],[12,4,8,19],[23,10,5,13],[7,23,18,5]],0);
   step([[7,12,4,10],[14,8,4,14],[21,12,4,10]],1);
   step([[12,24,8,2]],3);break;
  case 'rune':
   step([[6,5,6,22],[20,5,6,22],[11,12,10,8]],0);
   step([[9,8,4,16],[19,8,4,16]],1);step([[13,13,6,6]],3);break;
  case 'vessel':
   step([[9,5,14,4],[6,9,20,14],[10,23,12,5]],0);
   step([[9,12,14,8]],1);step([[12,15,8,3]],3);break;
  case 'orbit':
   step([[4,11,24,10],[10,5,12,22]],0);
   step([[8,13,16,6],[13,9,6,14]],2);step([[20,6,6,5]],1);break;
  case 'ember':
   step([[13,3,6,10],[9,11,14,12],[12,22,8,7]],0);
   step([[14,11,6,11]],1);step([[15,17,4,10]],3);break;
 }
 px(1,1,5,2,1);px(26,29,5,2,0);
}
function jokerElement(j,shop=false){
 const outer=document.createElement('div');
 outer.className=shop?'shop-joker':'joker';outer.dataset.color=j.color;
 outer.style.setProperty('--joker-phase',String((JOKERS.findIndex(x=>x.id===j.id)%6)*-.47)+'s');
 if(!shop){
  outer.dataset.joker=j.id;outer.title=j.name+' · '+j.desc+'（点击查看并调整顺序）';
  outer.setAttribute('role','button');outer.tabIndex=0;
  outer.setAttribute('aria-label','查看'+j.name+'。'+j.desc+'。点击可调整结算顺序');
  outer.addEventListener('click',()=>openJokerInspector(j.id));
  outer.addEventListener('keydown',e=>{
   if(e.key==='Enter'||e.key===' '){e.preventDefault();openJokerInspector(j.id)}
  });
 }
 const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;
 paintGlyph(canvas,j.glyph);outer.append(canvas);
 if(!shop){
  const label=document.createElement('b');label.textContent=j.name;
  const micro=document.createElement('small');micro.textContent='✦ '+j.cost;
  outer.prepend(micro);outer.append(label);
 }
 return outer;
}
function closeJokerInspector(){
 selectedJokerId=null;$('joker-inspector').classList.add('hidden');
 for(const el of $('joker-bar').querySelectorAll('.joker[data-joker]'))el.removeAttribute('data-inspected');
}
function refreshJokerInspector(){
 const index=s.jokers.indexOf(selectedJokerId),j=JOKERS.find(x=>x.id===selectedJokerId);
 if(!j||index<0){closeJokerInspector();return}
 $('joker-detail-name').textContent=j.name;
 $('joker-detail-text').textContent=j.desc;
 $('joker-detail-position').textContent='触发顺序 '+(index+1)+' / '+s.jokers.length+' · 从左到右结算';
 $('joker-move-left').disabled=locked||index===0;
 $('joker-move-right').disabled=locked||index===s.jokers.length-1;
 for(const el of $('joker-bar').querySelectorAll('.joker[data-joker]')){
  if(el.dataset.joker===selectedJokerId)el.dataset.inspected='true';
  else el.removeAttribute('data-inspected');
 }
}
function openJokerInspector(id){
 if(locked||s.phase!=='battle'||!s.jokers.includes(id))return;
 selectedJokerId=id;$('joker-inspector').classList.remove('hidden');
 refreshJokerInspector();tone(510,.07,'triangle',.04);
}
function shiftInspectedJoker(direction){
 if(locked||!selectedJokerId||!moveJoker(s,selectedJokerId,direction))return;
 tone(direction<0?510:620,.09,'triangle',.045);
 save();renderJokers();refreshJokerInspector();refreshPreview();
 $('last-event').textContent='◇ '+JOKERS.find(j=>j.id===selectedJokerId).name+' 顺序已改变';
}
$('joker-move-left').addEventListener('click',()=>shiftInspectedJoker(-1));
$('joker-move-right').addEventListener('click',()=>shiftInspectedJoker(1));
$('joker-close').addEventListener('click',closeJokerInspector);
function renderJokers(){
 const el=$('joker-bar');el.replaceChildren();
 if(!s.jokers.length){const p=document.createElement('div');p.className='joker-placeholder';p.textContent='◇　获得特殊卡牌后，它们将依次触发，改变牌型和倍率';el.append(p);return}
 for(const id of s.jokers){const j=JOKERS.find(x=>x.id===id);if(j)el.append(jokerElement(j))}
 for(let i=s.jokers.length;i<5;i++){const slot=document.createElement('div');slot.className='joker joker-slot';slot.style.cssText='background:#29273e;border:2px dashed #726c8c;box-shadow:none;opacity:.35;justify-content:center;font-size:25px';slot.textContent='◇';el.append(slot)}
}
function createPlayingCard(card){
 const sel=s.selected.includes(card.id),red=card.suit===1||card.suit===3;
 const slot=document.createElement('div');
 slot.className='card-motion-slot';slot.dataset.cardId=card.id;
 slot.style.setProperty('--float-delay',(-.32*(Number(card.id.slice(1))%9)).toFixed(2)+'s');
 slot.style.setProperty('--float-duration',(3.0+(card.rank%4)*.24).toFixed(2)+'s');
 const button=document.createElement('button');
 button.type='button';button.className='play-card '+(red?'red':'black');
 button.dataset.card=card.id;button.setAttribute('aria-pressed',String(sel));
 button.setAttribute('aria-label',RANKS[card.rank-1]+SUITS[card.suit]+(sel?' 已选中':' 点击选中'));
 button.disabled=s.phase!=='battle'||locked;
 button.style.setProperty('--rot',((card.suit-1.5)*.65)+'deg');
 const corner=document.createElement('span');corner.className='corner';
 corner.innerHTML='<b></b><small></small>';corner.querySelector('b').textContent=RANKS[card.rank-1];corner.querySelector('small').textContent=SUITS[card.suit];
 const other=corner.cloneNode(true);other.classList.add('mirror');
 const center=document.createElement('span');center.className='suit-icon';center.textContent=SUITS[card.suit];
 const water=document.createElement('span');water.className='watermark';water.textContent='PW · '+card.id.toUpperCase();
 const jewel=document.createElement('span');jewel.className='gem';
 button.append(corner,jewel,center,water,other);
 button.addEventListener('click',()=>{
  if(locked||!selection(s,card.id))return;
  tone(380+(card.rank*23),.075,'triangle',.05);
  // Rebuilding all cards per tap would restart idle animation and cause jerks.
  save();syncHandSelection();refreshPreview();
 });
 button.addEventListener('pointermove',e=>{
  if(e.pointerType==='touch')return;
  const rect=button.getBoundingClientRect();
  const x=(e.clientX-rect.left)/rect.width-.5;
  const y=(e.clientY-rect.top)/rect.height-.5;
  button.style.setProperty('--pitch',(x*18).toFixed(1)+'deg');
  button.style.setProperty('--tiltX',(-y*11).toFixed(1)+'deg');
  button.style.setProperty('--lightX',(50+x*75).toFixed(1)+'%');
  button.style.setProperty('--lightY',(50+y*80).toFixed(1)+'%');
 });
 button.addEventListener('pointerleave',()=>{
  button.style.setProperty('--pitch','0deg');button.style.setProperty('--tiltX','0deg');
  button.style.setProperty('--lightX','50%');button.style.setProperty('--lightY','50%');
 });
 button.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'){
   button.classList.add('touch-pressed');
   button.style.setProperty('--pitch','-5deg');button.style.setProperty('--tiltX','5deg');
  }
 });
 for(const eventName of ['pointerup','pointercancel']){
  button.addEventListener(eventName,()=>{
   button.classList.remove('touch-pressed');
   button.style.setProperty('--pitch','0deg');button.style.setProperty('--tiltX','0deg');
  });
 }
 slot.append(button);
 return slot;
}
function syncHandSelection(){
 for(const button of $('hand-cards').querySelectorAll('.play-card')){
  const id=button.dataset.card,selected=s.selected.includes(id);
  const was=button.getAttribute('aria-pressed')==='true';
  button.setAttribute('aria-pressed',String(selected));
  const card=s.hand.find(c=>c.id===id);
  if(card)button.setAttribute('aria-label',RANKS[card.rank-1]+SUITS[card.suit]+(selected?' 已选中':' 点击选中'));
  button.parentElement.dataset.selected=String(selected);
  if(selected&&!was){
   button.classList.remove('card-just-picked');void button.offsetWidth;button.classList.add('card-just-picked');
  }else if(!selected)button.classList.remove('card-just-picked');
 }
}
function renderHand(){
 const root=$('hand-cards'),scroll=root.parentElement.scrollLeft;root.replaceChildren();
 for(const c of s.hand)root.append(createPlayingCard(c));
 root.parentElement.scrollLeft=scroll;
 $('hand-size').textContent=s.hand.length;syncHandSelection();
}
function stats(){
 const b=currentBlind(s);
 $('stage-index').textContent=String(s.blind+1).padStart(2,'0')+' / 09';
 $('blind-name').textContent=b.name;
 $('blind-kind').textContent=b.boss?'◆ 首领关卡':'◇ 普通关卡';
 $('target-value').textContent=number(b.target);
 $('current-score').textContent=number(s.score);
 $('score-track-fill').style.width=Math.min(100,(s.score/b.target)*100)+'%';
 $('hands-count').textContent=s.hands;$('discards-count').textContent=s.discards;
 $('money-count').textContent='$'+s.money;
 $('seed-label').textContent='SEED '+s.seed;
 $('battle-notice').textContent=s.notice;
}
function renderShop(){
 $('shop-money').textContent=number(s.money);
 const root=$('shop-list');root.replaceChildren();
 for(const id of s.shop){
  const j=JOKERS.find(x=>x.id===id);if(!j)continue;
  const item=document.createElement('div');item.className='shop-item';
  const icon=jokerElement(j,true),name=document.createElement('strong'),desc=document.createElement('p'),btn=document.createElement('button');
  name.textContent=j.name;desc.textContent=j.desc;
  btn.textContent='$'+j.cost+'　购买';btn.disabled=s.money<j.cost||s.jokers.length>=5;
  btn.addEventListener('click',()=>{if(locked||!purchase(s,j.id))return;tone(640,.13,'triangle',.07);save();render()});
  item.append(icon,name,desc,btn);root.append(item);
 }
 if(!s.shop.length){const message=document.createElement('p');message.textContent='商店已经没有未拥有的商品。';root.append(message)}
 $('shop-reroll').textContent='刷新商品 · $'+s.rerollCost;
 $('shop-reroll').disabled=s.money<s.rerollCost||s.jokers.length>=5;
 $('shop-level').disabled=s.money<5;
 $('continue-button').textContent=s.blind>=BLINDS.length-1?'领取最终胜利 →':'前往下一场试炼 →';
}
function showPhase(){
 for(const id of ['shop-modal','end-modal','shade'])$(id).classList.add('hidden');
 if(!$('help-modal').classList.contains('hidden')){$('shade').classList.remove('hidden');return}
 if(s.phase==='shop'){
  renderShop();$('shade').classList.remove('hidden');$('shop-modal').classList.remove('hidden');
 }else if(s.phase==='lost'||s.phase==='victory'){
  $('shade').classList.remove('hidden');$('end-modal').classList.remove('hidden');
  $('end-title').textContent=s.phase==='victory'?'九场试炼 · 完成':'牌局终止';
  $('end-copy').textContent=s.phase==='victory'?'你击破了所有裁定者，纸牌悖论暂时归于平静。':'目标分数未达到。保留经验，重新洗牌挑战。';
  $('end-stats').textContent='通过 '+s.stats.won+' 场 · 出牌 '+s.stats.played+' 次 · 单次最高 '+number(s.stats.highest)+' 分';
 }
}
function render(){closeJokerInspector();stats();renderJokers();renderHand();refreshPreview();showPhase()}
let fxTimeouts=[];
function wait(ms){return new Promise(r=>{const t=setTimeout(r,ms);fxTimeouts.push(t)})}
function flash(){
 const el=document.createElement('div');el.className='trigger-flash';$('fx-layer').append(el);setTimeout(()=>el.remove(),350);
}
function floatText(text,modifier=''){
 const el=document.createElement('div');el.className='float-score '+modifier;el.textContent=text;
 $('fx-layer').append(el);setTimeout(()=>el.remove(),760);
}
function hitNumber(id){
 const el=$(id);if(!el)return;el.classList.remove('score-pop');void el.offsetWidth;el.classList.add('score-pop');
}
async function resolve(result,playedIds){
 // Score is still computed atomically and saved by the engine.
 // The following sequence is only presentation, driven by those actual events.
 const base=result.events[0];
 let chips=base.chips,mult=base.mult;
 $('hand-kind').textContent=result.name;
 $('chips-display').textContent=number(chips);
 $('mult-display').textContent=number(mult);
 $('predicted-score').textContent=number(chips*mult);
 $('last-event').textContent='◆ '+result.name;
 const byId=new Map([...$('hand-cards').querySelectorAll('.play-card')].map(el=>[el.dataset.card,el]));
 for(const id of playedIds)byId.get(id)?.classList.add('card-playing');
 await wait(170);
 const events=result.events.filter(e=>e.type==='card'||e.type==='joker');
 for(let i=0;i<events.length;i++){
  const ev=events[i];
  if(ev.type==='card'){
   chips+=ev.chips;
   $('last-event').textContent=ev.label+'　+'+ev.chips+' 筹码';
   const card=byId.get(ev.id);
   if(card){card.classList.remove('card-scored');void card.offsetWidth;card.classList.add('card-scored')}
   tone(360+i*45,.08,'triangle',.042);
  }else{
   chips+=ev.chips;mult=(mult+ev.mult)*ev.multiply;
   $('last-event').textContent=ev.name+'　'+(ev.multiply>1?'×'+ev.multiply:ev.mult?'+'+ev.mult+' 倍率':'+'+ev.chips+' 筹码');
   const joker=document.querySelector('.joker[data-joker="'+ev.id+'"]');
   if(joker){joker.classList.remove('joker-activated');void joker.offsetWidth;joker.classList.add('joker-activated')}
   tone(500+i*55,.10,'sine',.065);
   if(ev.multiply>1){flash();floatText('× '+ev.multiply)}
  }
  $('chips-display').textContent=number(chips);
  $('mult-display').textContent=number(mult);
  $('predicted-score').textContent=number(Math.round(chips*mult));
  hitNumber('chips-display');hitNumber('mult-display');
  await wait(Math.min(210,155+5*i));
 }
 floatText('+'+number(result.score));hitNumber('current-score');hitNumber('predicted-score');
 flash();tone(730,.19,'triangle',.075);
 $('current-score').textContent=number(s.score);
 $('score-track-fill').style.width=Math.min(100,(s.score/currentBlind(s).target)*100)+'%';
 $('last-event').textContent=result.chips+' × '+result.mult+' = '+number(result.score)+' 分！';
 await wait(690);
}
async function actionPlay(){
 if(locked)return;
 closeJokerInspector();
 const playedIds=[...s.selected],outcome=play(s);
 if(!outcome.ok){$('battle-notice').textContent=outcome.reason;return}
 locked=true;save();
 $('hand-cards').querySelectorAll('button').forEach(b=>b.disabled=true);
 $('play-button').disabled=true;$('discard-button').disabled=true;
 try{await resolve(outcome.result,playedIds)}
 finally{locked=false;render()}
}
$('play-button').addEventListener('click',actionPlay);
$('discard-button').addEventListener('click',()=>{if(locked||!discardSelected(s))return;tone(280,.1,'sawtooth',.035);save();render()});
$('sort-rank').addEventListener('click',()=>{if(locked)return;sortHand(s,'rank');tone(380,.05);save();renderHand()});
$('sort-suit').addEventListener('click',()=>{if(locked)return;sortHand(s,'suit');tone(380,.05);save();renderHand()});
$('shop-reroll').addEventListener('click',()=>{if(locked||!reroll(s))return;tone(570,.09);save();renderShop();stats()});
$('shop-level').addEventListener('click',()=>{if(locked||!levelUp(s))return;tone(770,.15);save();renderShop();stats()});
$('continue-button').addEventListener('click',()=>{if(locked||!proceed(s))return;tone(620,.1);save();render()});
function reset(){
 if(locked)return;
 s=createGame(Math.floor((Math.random()*4294967295)>>>0));save();render();$('last-event').textContent='';
}
$('restart-button').addEventListener('click',()=>{if(confirm('重新开始会覆盖当前的本地存档，确定吗？'))reset()});
$('end-restart').addEventListener('click',reset);
$('help-button').addEventListener('click',()=>{$('help-modal').classList.remove('hidden');$('shade').classList.remove('hidden')});
$('close-help').addEventListener('click',()=>{$('help-modal').classList.add('hidden');showPhase()});
$('sound-toggle').addEventListener('click',()=>{
 soundOn=!soundOn;$('sound-toggle').textContent='音效: '+(soundOn?'开':'关');
 $('sound-toggle').setAttribute('aria-pressed',String(soundOn));
 try{localStorage.setItem('paperworld-card-audio',soundOn?'on':'off')}catch{}
 tone(600,.08);
});
$('sound-toggle').textContent='音效: '+(soundOn?'开':'关');
$('sound-toggle').setAttribute('aria-pressed',String(soundOn));
window.addEventListener('keydown',e=>{
 if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;
 if(e.key==='Escape'&&!$('help-modal').classList.contains('hidden')){$('close-help').click();return}
 if(locked||s.phase!=='battle'||!$('help-modal').classList.contains('hidden'))return;
 if(e.key>='1'&&e.key<='8'){
  const c=s.hand[Number(e.key)-1];
  if(c&&selection(s,c.id)){ping();save();syncHandSelection();refreshPreview()}
 }else if(e.key==='Enter'||e.code==='Space'){
  e.preventDefault();if(s.selected.length)actionPlay();
 }else if(e.key.toLowerCase()==='d'){
  $('discard-button').click();
 }
});
function animateBackground(t){
 const canvas=$('abyss'),ctx=canvas.getContext('2d',{alpha:false});
 if(t-lastFrame<60)return;lastFrame=t;
 const w=canvas.width,h=canvas.height;
 const img=ctx.createImageData(w,h),dt=t*.000085;
 const colors=[[25,24,39],[57,54,87],[90,76,119],[169,186,233]];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const q=Math.sin(x*.024+dt*3+Math.sin(y*.032+dt*2)*1.9)+Math.cos(y*.035-dt*2.4+Math.sin(x*.018)*2);
  const ring=Math.sin(Math.hypot(x-w*.52,y-h*.50)*.052-dt*6.5);
  const col=colors[q+ring*.42<-.9?0:q+ring*.42<.15?1:q+ring*.42<1.25?2:3];
  const a=(y*w+x)*4;img.data[a]=col[0];img.data[a+1]=col[1];img.data[a+2]=col[2];img.data[a+3]=255;
 }
 ctx.putImageData(img,0,0);
}
let raf=0;
function tick(t){animateBackground(t);raf=requestAnimationFrame(tick)}
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(raf);else raf=requestAnimationFrame(tick)});
 raf=requestAnimationFrame(tick);
}else{animateBackground(500)}
window.__PAPERWORLD_CARD_GAME__={
 motionVersion:3,
 snapshot(){return {phase:s.phase,blind:s.blind,score:s.score,hand:s.hand.length,deck:s.deck.length,discard:s.discard.length,
  selected:s.selected.length,jokers:s.jokers.length,shop:s.shop.length,money:s.money,hands:s.hands,discards:s.discards,version:s.version}},
 getLastEvents(){return s.lastScore?.events?.map(e=>e.type)||[]},
 ready(){return !locked}
};
save();render();
