import {VERSION,CARD_DEFS,createGame,loadGame,locationAt,visitedAt,getMap,currentStatus,travel,searchArea,useItem,rest,playCard,endTurn,chooseReward} from './survival-engine.mjs';
const $=id=>document.getElementById(id),SAVE_KEY='paperworld-nightfall-survival-v2';
let game,locked=false,audio=false,ac=null,selectedTarget=0,frameTime=0,raf=0;
try{game=loadGame(localStorage.getItem(SAVE_KEY))}catch{}
if(!game)game=createGame(1729);
try{audio=localStorage.getItem('paperworld-nightfall-audio')==='on'}catch{}
const num=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');
function save(){
 try{localStorage.setItem(SAVE_KEY,JSON.stringify(game));$('save-status').textContent='已自动保存'}
 catch{$('save-status').textContent='无法保存，请检查存储权限'}
}
function tone(f=440,d=.09,type='triangle'){
 if(!audio)return;
 try{
  ac=ac||new (window.AudioContext||window.webkitAudioContext)();
  if(ac.state==='suspended')ac.resume();
  const osc=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;
  osc.type=type;osc.frequency.setValueAtTime(f,t);osc.frequency.exponentialRampToValueAtTime(f*.7,t+d);
  g.gain.setValueAtTime(.045,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
  osc.connect(g).connect(ac.destination);osc.start();osc.stop(t+d+.01);
 }catch{}
}
function flashNumber(label){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const e=document.createElement('span');e.className='float-score';e.textContent=label;
 $('fx-layer').append(e);setTimeout(()=>e.remove(),800);
}
function paintVitals(){
 const s=game,loc=locationAt(s);
 $('day-label').textContent=String(s.day).padStart(2,'0');
 $('time-label').textContent=String(s.hour).padStart(2,'0')+':00';
 $('location-name').textContent=loc.name;$('location-kind').textContent=loc.risk===0?'✦ 安全区域':'☣ 威胁 '+loc.risk+' / 4';
 $('hp-value').textContent=s.hp+' / '+s.maxHp;$('hp-fill').style.width=(100*s.hp/s.maxHp)+'%';
 for(const k of ['hunger','thirst']){$(k+'-value').textContent=s[k]+' / 100';$(k+'-fill').style.width=s[k]+'%'}
 $('infection-value').textContent=s.infection;$('noise-value').textContent=s.noise;
 $('energy-value').textContent=s.phase==='combat'?s.energy:'–';
 $('block-value').textContent=s.phase==='combat'?s.block:'–';
 $('combat-turn').textContent=s.phase==='combat'?'第 '+s.turn+' 回合 · 体力 '+s.energy+' / '+s.maxEnergy:'探索阶段';
 $('food-value').textContent=s.food;$('water-value').textContent=s.water;
 $('medkit-value').textContent=s.medkit;$('scrap-value').textContent=s.scrap;$('kills-value').textContent=s.kills;
 $('seed-label').textContent='SEED '+s.seed;
 $('battle-notice').textContent=s.notice;
 for(const id of ['food','water','medkit']){
  $('use-'+id).disabled=locked||!['explore','combat'].includes(s.phase)||s[id]<=0||
   (s.phase==='combat'&&s.energy<1)||(id==='medkit'&&s.hp>=s.maxHp)||
   (id==='food'&&s.hunger>=100)||(id==='water'&&s.thirst>=100);
 }
}
function renderWorld(){
 const s=game,loc=locationAt(s),isExploring=s.phase==='explore';
 $('world-panel').hidden=!isExploring;$('battle-panel').hidden=s.phase!=='combat';
 if(!isExploring)return;
 $('world-name').textContent=loc.name;$('world-desc').textContent=loc.desc;
 $('coord-label').textContent='坐标 ('+s.x+', '+s.y+') · 世界按位置生成';
 const root=$('world-map');root.replaceChildren();
 for(const node of getMap(s,2)){
  const adjacent=Math.abs(node.x-s.x)+Math.abs(node.y-s.y)===1;
  const btn=document.createElement('button');
  btn.className='map-cell';btn.type='button';btn.disabled=locked||!adjacent;
  btn.dataset.here=String(node.here);btn.dataset.seen=String(node.known);
  btn.dataset.walk=String(adjacent);btn.dataset.x=node.x;btn.dataset.y=node.y;
  btn.textContent=node.here?'⌖':node.known?node.mark:adjacent?'◇':'·';
  btn.title=node.known?node.name:'未知区域（'+node.x+','+node.y+'）';
  btn.setAttribute('aria-label',(adjacent?'前往 ':'查看 ')+(node.known?node.name:'未知区域')+
   ' 坐标 '+node.x+','+node.y);
  if(node.known&&node.cleared&&!node.here){const check=document.createElement('small');check.textContent='✓';btn.append(check)}
  if(adjacent)btn.addEventListener('click',()=>{
   if(locked)return;
   if(travel(game,node.x-game.x,node.y-game.y)){selectedTarget=0;tone(280);commitAndRender()}
  });
  root.append(btn);
 }
 $('search-button').disabled=locked||!!visitedAt(s)?.searched;
 $('rest-button').disabled=locked||s.x!==0||s.y!==0||s.food===0||s.water===0;
}
function renderEnemies(){
 const root=$('enemy-bar');root.replaceChildren();
 if(game.phase!=='combat')return;
 if(!game.enemies[selectedTarget]||game.enemies[selectedTarget].hp<=0)
  selectedTarget=Math.max(0,game.enemies.findIndex(e=>e.hp>0));
 const alive=game.enemies.filter(e=>e.hp>0).length;
 $('enemy-intent').textContent='第 '+game.turn+' 回合 · 剩余 '+alive+' 名感染者';
 for(const [i,e] of game.enemies.entries()){
  const btn=document.createElement('button');btn.className='enemy-card';btn.type='button';
  btn.dataset.type=e.type;btn.dataset.enemy=e.id;btn.disabled=e.hp<=0||locked;
  btn.setAttribute('aria-pressed',String(i===selectedTarget));
  btn.setAttribute('aria-label','选择'+e.name+'，生命 '+e.hp+' / '+e.maxHp+'，下一回合将攻击 '+Math.max(1,e.attack-e.weak)+(game.turn%3===0?2:0));
  const name=document.createElement('span');name.className='enemy-title';name.textContent=e.name;
  const art=document.createElement('span');art.className='enemy-art';art.setAttribute('aria-hidden','true');
  const hp=document.createElement('span');hp.className='enemy-hp';hp.textContent='♥ '+e.hp+' / '+e.maxHp;
  const attack=document.createElement('span');attack.className='enemy-intent';
  attack.textContent='⚔ 预计 '+(Math.max(1,e.attack-e.weak)+(game.turn%3===0?2:0))+' 伤害';
  btn.append(name,art,hp,attack);
  btn.onclick=()=>{if(locked)return;selectedTarget=i;tone(390,.045);renderEnemies()};
  root.append(btn);
 }
}
function makeCardElement(card,preview=false){
 const def=CARD_DEFS[card.type],slot=document.createElement('div');
 slot.className='card-motion-slot';slot.dataset.cardId=card.uid;
 slot.style.setProperty('--float-delay',((Number(card.uid.slice(1))%9)*-.27).toFixed(2)+'s');
 slot.style.setProperty('--float-duration',(3+(Number(card.uid.slice(1))%5)*.23).toFixed(2)+'s');
 const button=document.createElement('button');button.type='button';button.className='play-card';
 button.dataset.card=card.uid;button.dataset.type=def.type;button.disabled=locked||preview||game.energy<def.cost;
 button.setAttribute('aria-label',def.name+'，消耗'+def.cost+'体力，'+def.text);
 button.style.setProperty('--rot',((Number(card.uid.slice(1))%5-2)*.65)+'deg');
 const cost=document.createElement('span');cost.className='corner';cost.textContent=def.cost;
 const kind=document.createElement('span');kind.className='card-kind';kind.textContent=def.type==='attack'?'⚔':'✧';
 const glyph=document.createElement('span');glyph.className='suit-icon';glyph.textContent=def.icon;
 const name=document.createElement('span');name.className='card-name';name.textContent=def.name;
 const desc=document.createElement('span');desc.className='card-desc';desc.textContent=def.text;
 button.append(cost,kind,glyph,name,desc);
 button.addEventListener('pointermove',e=>{
  if(e.pointerType==='touch')return;
  const b=button.getBoundingClientRect(),x=(e.clientX-b.left)/b.width-.5,y=(e.clientY-b.top)/b.height-.5;
  button.style.setProperty('--pitch',(x*17).toFixed(2)+'deg');
  button.style.setProperty('--tiltX',(-y*13).toFixed(2)+'deg');
  button.style.setProperty('--lightX',(50+x*60)+'%');button.style.setProperty('--lightY',(50+y*60)+'%');
 });
 button.addEventListener('pointerleave',()=>{
  button.style.setProperty('--pitch','0deg');button.style.setProperty('--tiltX','0deg');
  button.style.setProperty('--lightX','50%');button.style.setProperty('--lightY','50%');
 });
 button.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')button.classList.add('touch-pressed')});
 for(const ev of ['pointerup','pointercancel'])button.addEventListener(ev,()=>button.classList.remove('touch-pressed'));
 button.addEventListener('click',()=>{
  if(locked||preview)return;
  const out=playCard(game,card.uid,selectedTarget);
  if(!out.ok){$('battle-notice').textContent=out.reason;return}
  tone(def.damage?220:510,def.damage?.12:.08);
  button.classList.add('card-scored');button.disabled=true;locked=true;
  if(def.damage){
   for(const hit of $('enemy-bar').querySelectorAll('.enemy-card')){
    if(def.all||hit.dataset.enemy==='z'+selectedTarget)hit.classList.add('enemy-hit');
   }
   flashNumber(def.all?'尸群 -'+def.damage:'-'+def.damage);
  }else if(def.block)flashNumber('防御 +'+def.block);
  else if(def.heal)flashNumber('生命 +'+def.heal);
  save();
  setTimeout(()=>{locked=false;render()},330);
 });
 slot.append(button);return slot;
}
function renderHand(){
 const root=$('hand-cards');root.replaceChildren();
 let source=[],preview=false;
 if(game.phase==='combat')source=currentStatus(game).cards;
 else{preview=true;source=game.cards.slice(0,5)}
 for(const c of source)root.append(makeCardElement(c,preview));
 $('hand-size').textContent=game.phase==='combat'?source.length:'牌组预览';
 $('deck-count').textContent='抽牌 '+game.draw.length+' · 弃牌 '+game.discard.length;
 $('total-deck').textContent=game.cards.length+' 张';
 $('end-turn').disabled=locked||game.phase!=='combat';
 $('turn-cost').textContent=game.phase==='combat'?'让感染者行动':'探索中';
}
function renderOverlay(){
 for(const id of ['reward-modal','dead-modal','shade'])$(id).classList.add('hidden');
 if(!$('help-modal').classList.contains('hidden')||!$('deck-modal').classList.contains('hidden')){
  $('shade').classList.remove('hidden');return;
 }
 if(game.phase==='reward'){
  $('shade').classList.remove('hidden');$('reward-modal').classList.remove('hidden');
  const root=$('reward-cards');root.replaceChildren();
  for(const key of game.reward){
   const d=CARD_DEFS[key];const b=document.createElement('button');
   const icon=document.createElement('div');icon.className='reward-glyph';icon.textContent=d.icon;
   const title=document.createElement('strong');title.textContent=d.name+' · '+d.cost+' 体力';
   const detail=document.createElement('span');detail.textContent=d.text;
   b.append(icon,title,detail);b.onclick=()=>{if(chooseReward(game,key)){tone(660);commitAndRender()}};
   root.append(b);
  }
 }else if(game.phase==='dead'){
  $('shade').classList.remove('hidden');$('dead-modal').classList.remove('hidden');
  $('dead-copy').textContent='存活 '+game.day+' 天，走过 '+game.moves+' 段道路，消灭 '+game.kills+' 名感染者。';
 }
}
function render(){
 paintVitals();renderWorld();renderEnemies();renderHand();
 renderOverlay();
}
function commitAndRender(){save();render()}
$('search-button').onclick=()=>{if(searchArea(game)){tone(340);flashNumber('搜刮');commitAndRender()}};
$('rest-button').onclick=()=>{if(rest(game)){tone(520);flashNumber('休整');commitAndRender()}};
for(const id of ['food','water','medkit'])$('use-'+id).onclick=()=>{
 if(useItem(game,id)){tone(540);commitAndRender()}
};
$('end-turn').onclick=()=>{
 if(locked||game.phase!=='combat')return;
 locked=true;$('end-turn').disabled=true;tone(240,.14,'sawtooth');
 setTimeout(()=>{const prior=game.hp;endTurn(game);if(game.hp<prior)flashNumber('受伤 -'+(prior-game.hp));locked=false;commitAndRender()},260);
};
$('skip-reward').onclick=()=>{if(chooseReward(game)){tone(370);commitAndRender()}};
function restart(){game=createGame(Math.floor(Math.random()*0xffffffff)>>>0);selectedTarget=0;locked=false;tone(660);commitAndRender()}
$('restart-button').onclick=()=>{if(confirm('新游戏将覆盖当前末日存档。确认重新开始吗？'))restart()};
$('dead-restart').onclick=restart;
$('help-button').onclick=()=>{$('help-modal').classList.remove('hidden');$('shade').classList.remove('hidden')};
$('close-help').onclick=()=>{$('help-modal').classList.add('hidden');renderOverlay()};
$('deck-info').onclick=()=>{
 const root=$('deck-list');root.replaceChildren();
 const counts={};for(const c of game.cards)counts[c.type]=(counts[c.type]||0)+1;
 for(const [key,count] of Object.entries(counts)){
  const d=CARD_DEFS[key],b=document.createElement('div');b.textContent=d.icon+' '+d.name+' × '+count+' · '+d.text;root.append(b)
 }
 $('deck-modal').classList.remove('hidden');$('shade').classList.remove('hidden');
};
$('close-deck').onclick=()=>{$('deck-modal').classList.add('hidden');renderOverlay()};
$('sound-toggle').onclick=()=>{
 audio=!audio;$('sound-toggle').textContent='音效: '+(audio?'开':'关');
 $('sound-toggle').setAttribute('aria-pressed',String(audio));
 try{localStorage.setItem('paperworld-nightfall-audio',audio?'on':'off')}catch{}
 tone(580);
};
$('sound-toggle').textContent='音效: '+(audio?'开':'关');
$('sound-toggle').setAttribute('aria-pressed',String(audio));
window.addEventListener('keydown',e=>{
 if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.target instanceof HTMLButtonElement)return;
 if(e.key==='Escape'){
  if(!$('help-modal').classList.contains('hidden'))$('close-help').click();
  else if(!$('deck-modal').classList.contains('hidden'))$('close-deck').click();
  return;
 }
 if(locked||!$('help-modal').classList.contains('hidden')||!$('deck-modal').classList.contains('hidden'))return;
 if(game.phase==='explore'){
  const dirs={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
  if(dirs[e.key]){e.preventDefault();if(travel(game,...dirs[e.key]))commitAndRender()}
 }else if(game.phase==='combat'){
  if(/^[1-9]$/.test(e.key)){
   const c=currentStatus(game).cards[Number(e.key)-1];
   if(c){e.preventDefault();rootCardClick(c.uid)}
  }else if(e.code==='Space'){e.preventDefault();$('end-turn').click()}
 }
});
function rootCardClick(uid){$('hand-cards').querySelector('[data-card="'+uid+'"]')?.click()}
function drawAtmosphere(time){
 if(time-frameTime<70)return;frameTime=time;
 const canvas=$('abyss'),ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx)return;
 const w=canvas.width,h=canvas.height,img=ctx.createImageData(w,h),t=time*.00012;
 const colors=[[21,20,34],[48,45,66],[83,74,98],[146,153,168]];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const wave=Math.sin(x*.028+t+Math.cos(y*.038+t)*2)+Math.cos(y*.045-t*1.8);
  const glow=Math.sin(Math.hypot(x-92,y-49)*.075-t*4)*.46;
  const col=colors[wave+glow<-.8?0:wave+glow<.15?1:wave+glow<1.2?2:3];
  const k=(y*w+x)*4;img.data[k]=col[0];img.data[k+1]=col[1];img.data[k+2]=col[2];img.data[k+3]=255;
 }
 ctx.putImageData(img,0,0);
}
function tick(t){drawAtmosphere(t);raf=requestAnimationFrame(tick)}
if(matchMedia('(prefers-reduced-motion: reduce)').matches)drawAtmosphere(750);
else{document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(raf);else raf=requestAnimationFrame(tick)});raf=requestAnimationFrame(tick)}
window.__PAPERWORLD_SURVIVAL__={
 version:VERSION,snapshot(){return {phase:game.phase,x:game.x,y:game.y,hp:game.hp,energy:game.energy,block:game.block,
  enemies:game.enemies.map(e=>({hp:e.hp,type:e.type})),hand:game.hand.length,cards:game.cards.length,day:game.day,
  hunger:game.hunger,thirst:game.thirst,kills:game.kills,moves:game.moves,reward:game.reward.length}},
 ready(){return !locked},getState(){return JSON.parse(JSON.stringify(game))}
};
save();render();
