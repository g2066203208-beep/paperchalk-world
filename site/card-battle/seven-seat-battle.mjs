import {
 SEAT_COUNT,HAND_LIMIT,makeDuel,deployHero,drawFromHero,
 playAction,endRound,getPlayableTarget,getSnapshot
} from './engine/seven-seat-duel.mjs';
import {mattePortraitBackground} from './motion/card-portrait-matte.mjs';
import {createSevenSeatCardMotion} from './motion/seven-seat-card-physics.mjs';

const $=id=>document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,ch=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[ch]));
const backUrl=new URL('../assets/cards/shared/character-card-back-anima.webp',import.meta.url).href;
const manifestUrl=new URL('../data/art/seven-card-groups.v1.json',import.meta.url).href;
const imageByUrl=new Map();
const processedArt=new Map();
let state=null,selection=null,previewEntry=null,notice='请选择候补人物，再点击下方七席中的空卡位';
let selectedUnit=null,referenceHeroes=[],referenceEnemies=[];
let focusedOwnerId=null;
const motion=createSevenSeatCardMotion({
 backUrl:new URL('../assets/cards/shared/character-card-back-anima.webp',import.meta.url).href,
 canvas:$('physical-card-fx')
});
let audio=null;
function cardSound(kind='deal'){
 try{
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  audio=audio||new AC();if(audio.state==='suspended')audio.resume().catch(()=>{});
  const o=audio.createOscillator(),g=audio.createGain();
  const hz=kind==='impact'?180:kind==='draw'?440:310;
  const duration=kind==='impact'?.18:.12;
  o.type=kind==='impact'?'triangle':'sine';
  o.frequency.setValueAtTime(hz,audio.currentTime);
  o.frequency.exponentialRampToValueAtTime(hz*.7,audio.currentTime+duration);
  g.gain.setValueAtTime(.025,audio.currentTime);
  g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);
  o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);
 }catch(e){console.warn('Audio blocked',e)}
}

const markupArt=(url,alt)=>`<img src="${escape(processedArt.get(url)||url)}" alt="${escape(alt)}" loading="lazy" data-origin="${escape(url)}" data-matted="${processedArt.has(url)}">`;
function rosterFromGroup(g){
 return g.roster.map(r=>({
  id:`${g.id}:${r.id}`,name:r.name,group:g.name,
  art:new URL('../'+g.assetBase.replace(/^\/+/, '')+r.file,import.meta.url).href,
  originalFile:r.file
 }));
}
function resolveSelectedHero(){
 if(selection?.type==='hero')return state?.heroes.find(x=>x.id===selection.id)||null;
 if(selection?.type==='action'){
  const c=state?.hand.find(x=>x.id===selection.id);
  return state?.heroes.find(x=>x.id===c?.ownerId)||null;
 }
 return selectedUnit?{name:selectedUnit.name,art:selectedUnit.art}:null;
}
function occupiedCount(side){return state[side==='ally'?'allySeats':'enemySeats'].filter(Boolean).length}
const heroForSeat=unit=>unit&&state.heroes.find(h=>unit.id===`ally:${h.id}`);
const cardsOwnedBy=ownerId=>state.hand.filter(c=>c.ownerId===ownerId);
// ONE physical stack per deployed character: person portrait in front,
// personal back-deck and individually owned drawn cards underneath.
function renderPocket(unit,index){
 if(!unit)return `<div class="person-pocket" data-empty="true" aria-label="第${index+1}席未上场，牌堆锁定"></div>`;
 const hero=heroForSeat(unit);if(!hero)return '';
 const d=state.decks[hero.id],owned=cardsOwnedBy(hero.id);
 const alive=unit.alive&&unit.hp>0;
 const minis=owned.slice(-3).map((c,j)=>`<button type="button"
    class="pocket-mini" data-action-id="${escape(c.id)}"
    draggable="${alive&&state.phase==='player'}"
    data-selected="${selection?.type==='action'&&selection.id===c.id}"
    style="--offset:${34+j*10}%;--angle:${(j-1)*5}deg;--depth:${4+j}"
    title="${escape(hero.name+' · '+c.description)}" aria-label="${escape(hero.name)}的${escape(c.name)}">
    <span class="pip">${c.cost}</span><b>${escape(c.name)}</b>
   </button>`).join('');
 return `<div class="person-pocket" data-empty="false" data-owner-id="${escape(hero.id)}"
  aria-label="${escape(hero.name)}人物卡下面叠放${owned.length}张行动手牌">
  <button type="button" class="pocket-deck" data-deck-id="${escape(hero.id)}"
   ${!alive||state.hand.length>=HAND_LIMIT||state.phase!=='player'?'disabled':''}
   title="${escape(hero.name)}专属牌堆：点击摸一张，剩余${d.drawPile.length}张"
   aria-label="${escape(hero.name)}酒红金线专属牌堆，剩余${d.drawPile.length}张">
    <img src="${escape(backUrl)}" alt="" loading="lazy">
    <span class="pocket-count">${d.drawPile.length}</span>
  </button>
  ${minis}
  <button type="button" class="pocket-open" data-owner-open="${escape(hero.id)}"
   data-focused="${focusedOwnerId===hero.id}"
   aria-label="展开${escape(hero.name)}的${owned.length}张行动牌">${owned.length}张▴</button>
 </div>`;
}
function renderEnemyPocket(unit,index){
 if(!unit)return '<div class="enemy-pocket"></div>';
 // One closed card corresponds to one actual attack per enemy on endRound.
 return `<div class="enemy-pocket" aria-label="敌方第${index+1}席隐藏行动卡">
  <div class="enemy-pile"><img src="${escape(backUrl)}" alt=""></div>
  <span class="enemy-label">行动</span>
 </div>`;
}
function renderSeats(side){
 const seats=side==='ally'?state.allySeats:state.enemySeats;
 const targetId=side==='ally'?'ally-seats':'enemy-seats';
 $(targetId).innerHTML=seats.map((unit,i)=>{
  const isEmpty=!unit;
  const selectable=selection?.type==='hero'&&side==='ally'&&isEmpty&&state.phase==='player';
  const valid=selection?.type==='action'&&getPlayableTarget(state,selection.id,side,i);
  const last=state.turnEvents.find(x=>x.side===side&&x.index===i);
  const effect=last?.type==='damage'?'被击中':last?.type==='heal'?'已治疗':
   last?.type==='shield'?'护盾增加':'';
  const card=`<button type="button" class="seat${unit&&!unit.alive?' is-fallen':''}" data-side="${side}"
   data-seat="${i}" data-occupied="${!!unit}" data-selectable="${!!selectable}" data-target="${!!valid}"
   aria-label="${escape(side==='enemy'?'敌方':'我方')}第${i+1}卡位${unit?'，'+unit.name+'，生命'+unit.hp+'，护盾'+unit.shield:'，空位'}"
   title="${escape(unit?unit.name+' · HP '+unit.hp+'/'+unit.maxHp+(effect?' · '+effect:''):'第'+(i+1)+'号空位')}">
   ${unit?`${markupArt(unit.art,unit.name)}<span class="seat-name">${escape(unit.name)}</span>
    <span class="seat-stats"><span class="seat-hp">♥${unit.hp}</span>
    ${unit.shield?'<span class="seat-shield">⬡'+unit.shield+'</span>':''}</span>`:
    `<span class="seat-empty">${side==='ally'?'放置':'空位'}</span>`}
   <span class="seat-num">${i+1}</span>
   </button>`;
  return `<div class="seat-column" data-card-column="${side}-${i}">
    ${card}
    ${side==='ally'?renderPocket(unit,i):renderEnemyPocket(unit,i)}
   </div>`;
 }).join('');
}
function renderReserve(){
 $('hero-reserve').innerHTML=state.heroes.map((hero,i)=>
  `<button class="reserve" type="button" data-hero-id="${escape(hero.id)}"
    data-selected="${selection?.type==='hero'&&selection.id===hero.id}" data-deployed="${hero.deployed}"
    draggable="${!hero.deployed&&state.phase==='player'}"
    aria-label="${escape(hero.name)}，${hero.deployed?'已上场':'可打出的候补人物'}"
    title="${escape(hero.name)} · 点击并选择己方空位">
     ${markupArt(hero.art,hero.name)}<span class="tag">${escape(hero.name)}</span>
   </button>`).join('');
}
// The open hand is never a detached global rail. It unfolds directly below
// its owning character on the physical table, then packs back under the card.
function renderOwnerFan(){
 const fan=$('owner-fan'),h=state.heroes.find(x=>x.id===focusedOwnerId);
 if(!h||!state.decks[h.id]?.unlocked){fan.hidden=true;return}
 const unit=state.allySeats.find(x=>x?.id===`ally:${h.id}`);
 if(!unit){fan.hidden=true;return}
 const cards=cardsOwnedBy(h.id);
 fan.hidden=false;
 $('owner-fan-name').textContent=h.name+' · 专属手牌';
 $('owner-fan-count').textContent=cards.length+' 张在手 · 剩余 '+state.decks[h.id].drawPile.length+' 张';
 $('owner-fan-draw').disabled=!unit.alive||state.phase!=='player'||state.hand.length>=HAND_LIMIT;
 $('owner-fan-draw').title=h.name+' 的个人牌堆，剩余 '+state.decks[h.id].drawPile.length+' 张';
 const index=state.allySeats.findIndex(x=>x?.id===`ally:${h.id}`);
 fan.style.setProperty('--owner-origin',((index+.5)/7*100).toFixed(1)+'%');
 $('owner-fan-cards').innerHTML=cards.length?cards.map((c,j)=>
   `<button type="button" class="action" data-action-id="${escape(c.id)}"
    data-selected="${selection?.type==='action'&&selection.id===c.id}"
    draggable="${unit.alive&&state.phase==='player'}"
    style="--card-tilt:${(j%5-2)*1.6}deg"
    aria-label="${escape(h.name+'的'+c.name+'，'+c.cost+'点行动力')}"
    title="${escape(c.description)}">
    <span class="owner">${escape(h.name)} · 专属</span>
    <span class="cost">${c.cost}</span><strong>${escape(c.name)}</strong>
    <small>${escape(c.description)}<br>可指定己方或敌方</small>
   </button>`).join(''):
   '<span class="rail-empty">行动牌仍在这名人物下面的酒红牌堆里，点击卡背摸牌</span>';
}
function selectedInstruction(){
 if(state.result)return state.result==='victory'?
  ['战斗胜利','已击败当前演示关卡的全部敌人，可重新开局']:
  ['战斗结束','队伍已全员失去战斗能力，请重新开局'];
 if(selection?.type==='hero'){
  const h=state.heroes.find(x=>x.id===selection.id);
  return [`部署 ${h?.name||''}`,'点击下方我方七席中的任意空位，解锁这个人物的专属卡组'];
 }
 if(selection?.type==='action'){
  const c=state.hand.find(x=>x.id===selection.id);
  return [c?`${c.ownerName} · ${c.name}`:'行动卡',
   '请选择任一存活目标：可打敌方，也可作用于队友；非法目标不会扣牌'];
 }
 return ['七席人物牌桌 · 每人牌组独立叠放','部署人物 → 点击其人物卡下方酒红卡背抽牌 → 点叠牌展开，再选敌我目标'];
}
function render(){
 if(!state)return;
 $('round-label').textContent='第 '+state.round+' 回合';
 $('energy-label').textContent='行动点 '+state.energy+'/'+state.maxEnergy;
 $('hand-count').textContent='手牌 '+state.hand.length+'/'+HAND_LIMIT;
 $('enemy-count').textContent='已上场 '+occupiedCount('enemy')+' / 7';
 $('ally-count').textContent='已上场 '+occupiedCount('ally')+' / 7';
 $('battle-status').textContent=state.result==='victory'?'胜利':state.result==='defeat'?'失败':'敌我各七席 · '+(state.phase==='player'?'玩家行动':'敌方行动');
 document.querySelector('.board').dataset.result=state.result||'ongoing';
 const cue=selectedInstruction();
 $('cue-title').textContent=cue[0];$('cue-sub').textContent=cue[1];
 renderSeats('enemy');renderSeats('ally');renderReserve();renderOwnerFan();
 $('end-turn').disabled=!!state.result;
 $('inspect-selected').disabled=!resolveSelectedHero();
 $('notification').textContent=notice;
 $('action-log').innerHTML=state.history.slice(0,6).map(x=>`<li>${escape(x)}</li>`).join('')||'<li>新对局开始：请选择第一名要部署的角色</li>';
 state.turnEvents=[];
}
function heroWidget(id){
 return [...document.querySelectorAll('[data-hero-id]')].find(x=>x.dataset.heroId===id);
}
function actionWidget(id){
 return [...document.querySelectorAll('[data-action-id]')].find(x=>x.dataset.actionId===id);
}
function seatWidget(side,index){
 return [...document.querySelectorAll(`#${side}-seats .seat`)]
  .find(x=>+x.dataset.seat===index);
}
function impactEffect(ev){
 const el=seatWidget(ev.side,ev.index);if(!el)return;
 const cls=ev.type==='damage'?'hit-shock':ev.type==='heal'?'healed':
  ev.type==='shield'?'shielded':'deployed';
 el.classList.remove('hit-shock','healed','shielded','deployed');
 void el.offsetWidth;el.classList.add(cls);
 el.addEventListener('animationend',()=>el.classList.remove(cls),{once:true});
}
function animateEvent(ev,origin){
 let target=null,label='行动',kind='action',frontUrl='';
 if(ev.type==='draw'){
  const cards=[...document.querySelectorAll('.person-pocket .pocket-mini')]
   .filter(x=>state.hand.some(c=>c.id===x.dataset.actionId&&c.ownerId===ev.ownerId));
  target=cards.at(-1)||document.querySelector('.person-pocket[data-owner-id="'+ev.ownerId+'"]');
  label=state.hand.find(x=>x.id===ev.cardId)?.name||'行动';
 }else if(ev.side){
  target=seatWidget(ev.side,ev.index);
  if(ev.type==='deploy'){
   kind='hero';frontUrl=state.allySeats[ev.index]?.art||'';
   label=state.allySeats[ev.index]?.name||'人物';
  }else label=ev.type==='damage'?'突击':ev.type==='heal'?'治疗':'架势';
 }
 if(!target)return;
 if(!origin&&ev.attacker){
  const attacker=state.enemySeats.findIndex(x=>x?.name===ev.attacker);
  origin=seatWidget('enemy',attacker)?.getBoundingClientRect();
 }
 const to=target.getBoundingClientRect();
 motion.fly({from:origin||to,to,frontUrl,label,kind,
  onLand:()=>{
   if(ev.type!=='draw')impactEffect(ev);
   cardSound(ev.type==='damage'?'impact':ev.type==='draw'?'draw':'deal');
  }});
}
function apply(action,{from=null}={}){
 if(!state)return;
 const result=action();notice=result.message||'无法完成这次行动';
 if(!result.ok){render();return result}
 const events=state.turnEvents.map(x=>({...x}));
 const victory=state.result==='victory';
 selection=null;selectedUnit=null;
 if(events.some(x=>x.type==='draw'))focusedOwnerId=events[0].ownerId;
 render();
 events.forEach((ev,i)=>{
  if(i>2)return; // lightweight, even when 3 enemy actions resolve
  animateEvent(ev,i===0?from:null);
 });
 if(victory)motion.payout(36);
 return result;
}
function clickSeat(side,index){
 if(!state)return;
 if(selection?.type==='hero'){
  if(side!=='ally'){notice='人物卡只能部署到我方七席';render();return}
  const heroId=selection.id;
  const from=heroWidget(heroId)?.getBoundingClientRect();
  return apply(()=>deployHero(state,heroId,index),{from});
 }
 if(selection?.type==='action'){
  const id=selection.id;
  const from=actionWidget(id)?.getBoundingClientRect();
  return apply(()=>playAction(state,id,side,index),{from});
 }
 const unit=(side==='ally'?state.allySeats:state.enemySeats)[index];
 if(unit){
  selectedUnit=unit;
  notice=`${unit.name} · 生命 ${unit.hp}/${unit.maxHp} · 护盾 ${unit.shield}。`;
  if(side==='ally'){
   const owner=heroForSeat(unit);
   if(owner)focusedOwnerId=focusedOwnerId===owner.id?null:owner.id;
   notice+=' 该人物卡下的专属手牌已'+(focusedOwnerId?'展开':'收拢');
  }
 }else notice=side==='ally'?'请选候补人物卡，再点击己方空位部署':'敌方空席没有目标';
 render();
}
function chooseHero(id){
 const hero=state?.heroes.find(x=>x.id===id);
 if(!hero||hero.deployed){notice='这张人物卡已经上场';render();return;}
 selection={type:'hero',id};selectedUnit=null;notice='已选择 '+hero.name+' · 点击我方七席中的一个空位';
 render();
}
function chooseAction(id){
 const card=state?.hand.find(x=>x.id===id);
 if(!card)return;
 selection={type:'action',id};selectedUnit=null;focusedOwnerId=card.ownerId;
 notice=card.ownerName+'·'+card.name+'：从人物下方展开的专属手牌，选择敌方或己方目标。';
 render();
}
function openPreview(entry){
 if(!entry)return;
 previewEntry=entry;$('preview-img').src=entry.art;
 $('preview-img').alt=entry.name+'的原始人物立绘';
 $('preview-name').textContent=entry.name;
 $('preview').hidden=false;$('preview-close').focus();
}
function closePreview(){previewEntry=null;$('preview').hidden=true;$('preview-img').removeAttribute('src');}
function restart(){
 motion.stop();
 state=makeDuel(referenceHeroes,referenceEnemies);
 selection=null;selectedUnit=null;focusedOwnerId=null;notice='新对局：行动手牌为 0。选择候补人物，再点击我方空席。';
 render();
}
function imageAssetError(e){
 const target=e.target;
 if(target.tagName!=='IMG'||!target.dataset.origin)return;
 target.outerHTML='<span class="rail-empty">原画加载失败</span>';
}
// Image matte is purely a presentation adapter; the original uploaded
// character PNGs stay untouched and preview still uses original full size.
async function processArt(url){
 if(processedArt.has(url)||imageByUrl.has(url))return;
 imageByUrl.set(url,true);
 try{
  const image=new Image();image.src=url;await image.decode();
  const scale=Math.min(1,640/Math.max(image.naturalWidth,image.naturalHeight));
  const w=Math.round(image.naturalWidth*scale),h=Math.round(image.naturalHeight*scale);
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,w,h);
  const frame=ctx.getImageData(0,0,w,h);
  const matte=mattePortraitBackground(frame.data,w,h);
  if(matte.stats.detected){
   frame.data.set(matte.pixels);ctx.putImageData(frame,0,0);
   processedArt.set(url,c.toDataURL('image/webp',.93));
   if(state)render();
  }else processedArt.set(url,url);
 }catch(e){console.warn('Preserve original uncut portrait',url,e)}
}
async function prepareArt(){
 for(const entry of [...referenceHeroes,...referenceEnemies]){
  await new Promise(resolve=>setTimeout(resolve,14));
  await processArt(entry.art);
 }
}
const app=$('duel-app');
app.addEventListener('click',e=>{
 const button=e.target.closest('button');
 if(!button||!state)return;
 if(button.matches('[data-side][data-seat]'))return clickSeat(button.dataset.side,Number(button.dataset.seat));
 if(button.matches('[data-hero-id]'))return chooseHero(button.dataset.heroId);
 if(button.matches('[data-action-id]'))return chooseAction(button.dataset.actionId);
 if(button.matches('[data-owner-open]')){
  const id=button.dataset.ownerOpen;
  focusedOwnerId=focusedOwnerId===id?null:id;
  notice=(state.heroes.find(h=>h.id===id)?.name||'人物')+'的个人手牌已'+(focusedOwnerId?'展开':'叠回人物卡下');
  render();return;
 }
 if(button.matches('[data-deck-id]')){
  const from=button.getBoundingClientRect();
  return apply(()=>drawFromHero(state,button.dataset.deckId),{from});
 }
});
app.addEventListener('error',imageAssetError,true);
$('owner-fan-draw').addEventListener('click',()=>{
 if(!focusedOwnerId)return;
 const deck=[...document.querySelectorAll('[data-deck-id]')]
  .find(x=>x.dataset.deckId===focusedOwnerId);
 apply(()=>drawFromHero(state,focusedOwnerId),{from:deck?.getBoundingClientRect()});
});
$('owner-fan-close').addEventListener('click',()=>{focusedOwnerId=null;selection=null;render();});
$('restart').addEventListener('click',restart);
$('end-turn').addEventListener('click',()=>apply(()=>endRound(state)));
$('inspect-selected').addEventListener('click',()=>openPreview(resolveSelectedHero()));
$('preview-close').addEventListener('click',closePreview);
$('preview').addEventListener('click',e=>{if(e.target===$('preview'))closePreview();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePreview();selection=null;if(state)render();}});
app.addEventListener('contextmenu',e=>{
 const seat=e.target.closest('[data-side][data-seat]');
 if(!seat)return;e.preventDefault();
 const u=(seat.dataset.side==='ally'?state.allySeats:state.enemySeats)[+seat.dataset.seat];
 if(u)openPreview(u);
});
app.addEventListener('dragstart',e=>{
 const button=e.target.closest('[data-hero-id],[data-action-id]');
 if(!button||!state){e.preventDefault();return;}
 const kind=button.dataset.heroId?'hero':'action';
 const id=button.dataset.heroId||button.dataset.actionId;
 e.dataTransfer.setData('text/plain',JSON.stringify({kind,id}));
 e.dataTransfer.effectAllowed='move';
});
app.addEventListener('dragover',e=>{if(e.target.closest('[data-side][data-seat]'))e.preventDefault();});
app.addEventListener('drop',e=>{
 const seat=e.target.closest('[data-side][data-seat]');
 if(!seat||!state)return;e.preventDefault();
 try{
  const val=JSON.parse(e.dataTransfer.getData('text/plain'));
  selection={type:val.kind,id:val.id};
  clickSeat(seat.dataset.side,Number(seat.dataset.seat));
 }catch(err){console.warn('Invalid drag payload',err)}
});
// Touch drag uses the same clickSeat/deployHero/playAction as desktop,
// without stealing standard tap-to-select behavior.
let touchDrag=null;
app.addEventListener('pointerdown',e=>{
 if(e.pointerType!=='touch')return;
 const el=e.target.closest('[data-hero-id],[data-action-id]');
 if(!el)return;
 touchDrag={id:e.pointerId,startX:e.clientX,startY:e.clientY,
  card:el.dataset.heroId?{type:'hero',id:el.dataset.heroId}:{type:'action',id:el.dataset.actionId},
  img:el.querySelector('img')?.src||backUrl,active:false};
});
app.addEventListener('pointermove',e=>{
 if(!touchDrag||touchDrag.id!==e.pointerId)return;
 if(!touchDrag.active&&Math.hypot(e.clientX-touchDrag.startX,e.clientY-touchDrag.startY)>15){
  touchDrag.active=true;$('ghost').hidden=false;$('ghost').src=touchDrag.img;
 }
 if(touchDrag.active){
  $('ghost').style.left=e.clientX+'px';$('ghost').style.top=e.clientY+'px';
 }
});
app.addEventListener('pointerup',e=>{
 if(!touchDrag||touchDrag.id!==e.pointerId)return;
 const drag=touchDrag;touchDrag=null;$('ghost').hidden=true;
 if(!drag.active)return;
 e.preventDefault();
 const seat=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-side][data-seat]');
 if(seat){selection=drag.card;clickSeat(seat.dataset.side,+seat.dataset.seat)}
 else{selection=drag.card;render()}
});
app.addEventListener('pointercancel',()=>{touchDrag=null;$('ghost').hidden=true});
async function init(){
 try{
  const response=await fetch(manifestUrl,{cache:'no-cache'});
  if(!response.ok)throw Error('人物清单 HTTP '+response.status);
  const manifest=await response.json();
  const get=id=>manifest.groups.find(x=>x.id===id&&x.roster?.length===SEAT_COUNT);
  const heroGroup=get('wonder-circus'),enemyGroup=get('crimson-vampires');
  if(!heroGroup||!enemyGroup)throw Error('GitHub 未找到完整的七人人物原画清单');
  referenceHeroes=rosterFromGroup(heroGroup);
  referenceEnemies=rosterFromGroup(enemyGroup);
  restart();
  window.SevenSeatBattleQA={
   get state(){return state;},
   get snapshot(){return getSnapshot(state);},
   get actualAssets(){return {ally:referenceHeroes.map(x=>x.art),enemy:referenceEnemies.map(x=>x.art)};},
   get cardPhysics(){return motion.state;},
   triggerWinCoins:()=>motion.payout(36),
   get ownerStacks(){return state.allySeats.map((unit,index)=>{
    const hero=heroForSeat(unit);return {seat:index,ownerId:hero?.id||null,
     hand:hero?cardsOwnedBy(hero.id).map(c=>c.id):[],
     deckRemaining:hero?state.decks[hero.id].drawPile.length:0};
   });},
   get focusedOwner(){return focusedOwnerId;},
   openOwner:id=>{focusedOwnerId=id;render();return focusedOwnerId;},
   deploy:(heroIndex,seatIndex)=>{const r=deployHero(state,referenceHeroes[heroIndex].id,seatIndex);notice=r.message;render();return r;},
   draw:heroIndex=>{const r=drawFromHero(state,referenceHeroes[heroIndex].id);notice=r.message;render();return r;},
   play:(cardIndex,side,seatIndex)=>{const c=state.hand[cardIndex];if(!c)return {ok:false};const r=playAction(state,c.id,side,seatIndex);notice=r.message;render();return r;},
   end:()=>{const r=endRound(state);notice=r.message;render();return r;},
   restart,selectHero:chooseHero,selectAction:chooseAction,preview:openPreview
  };
  prepareArt().catch(console.warn);
 }catch(err){
  console.error(err);
  $('battle-status').textContent='人物图加载失败';
  $('notification').textContent='加载失败：'+String(err.message||err)+'。请确认 GitHub Pages 资源已发布。';
  $('cue-title').textContent='无法载入战斗';
 }
}
init();
