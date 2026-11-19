import {
 SEAT_COUNT,HAND_LIMIT,makeDuel,deployHero,drawFromHero,
 playAction,endRound,getPlayableTarget,getSnapshot
} from './engine/seven-seat-duel.mjs';
import {mattePortraitBackground} from './motion/card-portrait-matte.mjs';

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
  return `<button type="button" class="seat${unit&&!unit.alive?' is-fallen':''}" data-side="${side}"
   data-seat="${i}" data-occupied="${!!unit}" data-selectable="${!!selectable}" data-target="${!!valid}"
   aria-label="${escape(side==='enemy'?'敌方':'我方')}第${i+1}卡位${unit?'，'+unit.name+'，生命'+unit.hp+'，护盾'+unit.shield:'，空位'}"
   title="${escape(unit?unit.name+' · HP '+unit.hp+'/'+unit.maxHp+(effect?' · '+effect:''):'第'+(i+1)+'号空位')}">
   ${unit?`${markupArt(unit.art,unit.name)}<span class="seat-name">${escape(unit.name)}</span>
    <span class="seat-stats"><span class="seat-hp">♥${unit.hp}</span>
    ${unit.shield?'<span class="seat-shield">⬡'+unit.shield+'</span>':''}</span>`:
    `<span class="seat-empty">${side==='ally'?'放置':'空位'}</span>`}
   <span class="seat-num">${i+1}</span>
   </button>`;
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
function renderDecks(){
 const deployed=state.heroes.filter(h=>state.decks[h.id]?.unlocked);
 $('owner-decks').innerHTML=deployed.length?deployed.map(h=>{
  const d=state.decks[h.id],unit=state.allySeats.find(x=>x?.id===`ally:${h.id}`);
  return `<button class="deck" type="button" data-deck-id="${escape(h.id)}"
    ${!unit?.alive||state.hand.length>=HAND_LIMIT||state.phase!=='player'?'disabled':''}
    title="${escape(h.name)}的独立牌堆，点击手动抽一张">
    <img src="${escape(backUrl)}" alt="统一酒红金线卡背">
    <span><strong>${escape(h.name)}</strong><small>${unit?.alive?'剩余 '+d.drawPile.length+' · 手牌 '+state.hand.length+'/10':'人物已退场'}</small></span>
    </button>`;
 }).join(''):'<span class="rail-empty">尚未部署人物 · 暂无可使用的行动牌堆</span>';
}
function renderHand(){
 $('action-hand').innerHTML=state.hand.length?state.hand.map(card=>
  `<button type="button" class="action" data-action-id="${escape(card.id)}"
    data-selected="${selection?.type==='action'&&selection.id===card.id}"
    draggable="${state.phase==='player'}" aria-label="${escape(card.ownerName+'的'+card.name+'，行动点'+card.cost)}"
    title="${escape(card.ownerName+' · '+card.description)}">
    <span class="owner">${escape(card.ownerName)} · 专属牌</span>
    <span class="cost">${card.cost}</span><strong>${escape(card.name)}</strong>
    <small>${escape(card.description)}<br>目标：己方或敌方</small>
    </button>`).join(''):'<span class="rail-empty">手牌为空 · 部署人物后，点击对应牌堆手动摸牌</span>';
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
 return ['七席牌桌 · 人物卡对战','先从候补人物卡打出角色，再手动摸该角色的行动牌'];
}
function render(){
 if(!state)return;
 $('round-label').textContent='第 '+state.round+' 回合';
 $('energy-label').textContent='行动点 '+state.energy+'/'+state.maxEnergy;
 $('hand-count').textContent='手牌 '+state.hand.length+'/'+HAND_LIMIT;
 $('enemy-count').textContent='已上场 '+occupiedCount('enemy')+' / 7';
 $('ally-count').textContent='已上场 '+occupiedCount('ally')+' / 7';
 $('battle-status').textContent=state.result==='victory'?'胜利':state.result==='defeat'?'失败':'敌我各七席 · '+(state.phase==='player'?'玩家行动':'敌方行动');
 const cue=selectedInstruction();
 $('cue-title').textContent=cue[0];$('cue-sub').textContent=cue[1];
 renderSeats('enemy');renderSeats('ally');renderReserve();renderDecks();renderHand();
 $('end-turn').disabled=!!state.result;
 $('inspect-selected').disabled=!resolveSelectedHero();
 $('notification').textContent=notice;
 $('action-log').innerHTML=state.history.slice(0,6).map(x=>`<li>${escape(x)}</li>`).join('')||'<li>新对局开始：请选择第一名要部署的角色</li>';
 state.turnEvents=[];
}
function apply(action){
 if(!state)return;
 const res=action();
 notice=res.message||'该操作无效';
 if(res.ok){selection=null;selectedUnit=null;}
 render();
}
function clickSeat(side,index){
 if(!state)return;
 if(selection?.type==='hero'){
  if(side!=='ally'){notice='人物卡只能部署到我方七席';render();return;}
  return apply(()=>deployHero(state,selection.id,index));
 }
 if(selection?.type==='action')return apply(()=>playAction(state,selection.id,side,index));
 const unit=(side==='ally'?state.allySeats:state.enemySeats)[index];
 if(unit){
  selectedUnit=unit;
  notice=`${unit.name} · 生命 ${unit.hp}/${unit.maxHp} · 护盾 ${unit.shield}。点击“放大查看”欣赏原画。`;
 }else notice=side==='ally'?'点击下方候补人物卡，再点击这个空位进行部署':'敌方这个卡位当前无人';
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
 selection={type:'action',id};selectedUnit=null;
 notice=card.ownerName+'·'+card.name+'：点击敌方或己方人物牌。空槽和倒下单位不会消耗这张牌。';
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
 state=makeDuel(referenceHeroes,referenceEnemies);
 selection=null;selectedUnit=null;notice='新对局：行动手牌为 0。选择候补人物，再点击我方空席。';
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
 if(button.matches('[data-deck-id]'))return apply(()=>drawFromHero(state,button.dataset.deckId));
});
app.addEventListener('error',imageAssetError,true);
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
