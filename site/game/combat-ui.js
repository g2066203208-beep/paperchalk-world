/* Paperchalk World — in-game Link Battle interface.
 * Draws existing live L2D into battle portraits, never saves/edits source rig.
 */
(function(root){
'use strict';
if(!root.PaperWorldCombat)return;
const model=root.PaperWorldCombat.create();
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const glyph={cut:'╱',pierce:'✧',mark:'◇',chase:'↗',quick:'⟐',cover:'⊞',link:'∞',heal:'✚'};
const enemyMark={shade:'◈',echo:'≋',rift:'◇'};
const names={hero:'女主',partner:'女二'};
let host=null,active=false,closing=false,selected=null,chainCaption='',tip='',raf=0;
let prevVisible=null,prevSlots=null,castTask=Promise.resolve();
let feedbackTimer=0;
function install(){
 if(host)return;
 const view=$('view');if(!view)return;
 host=document.createElement('section');
 host.id='pw-combat';host.hidden=true;host.setAttribute('aria-label','卡牌战斗');
 host.innerHTML=[
  '<header class="cb-top">',
  '<div class="cb-brand"><span class="cb-overline">PAPERCHALK / LINK</span><span class="cb-title">连携战斗</span></div>',
  '<span class="cb-round" id="cb-round"></span>',
  '<div class="cb-energy" id="cb-energy"></div>',
  '<button type="button" class="cb-button end" id="cb-end">结束回合</button>',
  '<button type="button" class="cb-button" id="cb-close">退出</button></header>',
  '<div class="cb-field"><div class="cb-sides">',
  '<section class="cb-team" aria-label="我方队伍"><div class="cb-team-label">我方 <span>ALLY</span></div><div class="cb-team-list" id="cb-allies"></div></section>',
  '<div class="cb-middle" aria-live="polite"><span class="cb-spark" aria-hidden="true">⌁</span>',
  '<strong class="cb-chain-label" id="cb-chain-label">LINK</strong>',
  '<span class="cb-chain-detail" id="cb-chain-detail"></span>',
  '<span class="cb-chain-counter" id="cb-chain-counter"></span></div>',
  '<section class="cb-team" aria-label="敌方队伍"><div class="cb-team-label">敌方 <span>ENEMY</span></div><div class="cb-team-list" id="cb-enemies"></div></section>',
  '</div><div class="cb-battle-feed" id="cb-feed" aria-live="polite"></div></div>',
  '<section class="cb-hand-area" aria-label="手牌"><div class="cb-hand-header">',
  '<span class="cb-hand-hint" id="cb-hint"></span><span class="cb-hand-count" id="cb-deck-info"></span>',
  '</div><div class="cb-hand" id="cb-hand"></div></section>',
  '<div class="cb-status" id="cb-result" hidden role="dialog" aria-label="战斗结算">',
  '<h2 id="cb-result-title"></h2><p id="cb-result-stats"></p>',
  '<div class="cb-status-buttons"><button class="cb-button end" type="button" id="cb-rematch">再战一次</button>',
  '<button class="cb-button" type="button" id="cb-result-close">返回游戏</button>',
  '</div></div>'
 ].join('');
 view.appendChild(host);
 host.addEventListener('click',handleClick);
 document.addEventListener('keydown',handleKey);
 const start=$('menu-start');
 if(start&&!$('menu-combat')){
  const b=document.createElement('button');b.id='menu-combat';b.type='button';
  b.textContent='卡牌战斗';start.insertAdjacentElement('afterend',b);
  b.addEventListener('click',open);
 }
 const menu=$('menu-choices');
 if(menu&&!$('game-combat')){
  const b=document.createElement('button');b.id='game-combat';b.type='button';
  b.textContent='卡牌战斗';menu.appendChild(b);b.addEventListener('click',open);
 }
 if(new URLSearchParams(location.search).get('combat')==='1')open();
}
function targetsOf(card){return model.eligibleTargets(card)}
function cardButton(c,snap){
 const owner=snap.allies.find(x=>x.id===c.owner);
 const t=targetsOf(c),enabled=owner?.hp>0&&c.cost<=snap.energy&&t.length>0;
 return '<button type="button" class="cb-card '+(c.owner==='partner'?'partner ':'')+
  (selected===c.uid?'selected':'')+'" data-card="'+esc(c.uid)+'"'+
  ' aria-pressed="'+(selected===c.uid?'true':'false')+'"'+(enabled?'':' disabled')+'>'+
  '<span class="cb-card-owner">'+esc(names[c.owner]||c.owner)+'</span>'+
  '<span class="cb-card-cost">'+c.cost+'</span>'+
  '<span class="cb-card-glyph" aria-hidden="true">'+(glyph[c.cardId]||'✦')+'</span>'+
  '<span class="cb-card-name">'+esc(c.name)+'</span>'+
  '<span class="cb-card-text">'+esc(c.text)+'</span></button>';
}
function unitButton(u,foe,intent,canTarget){
 const total=Math.max(1,u.maxHp),pct=Math.round(u.hp/total*100);
 const head=foe&&intent&&u.hp>0?
  '<span class="cb-intent '+(intent.willCombo?'chain-ready':'')+'">'+
  esc(intent.label)+(intent.kind==='guard'?'':' → '+esc(names[intent.targetId]||intent.targetId))+
  (intent.willCombo?' · 连携':'')+'</span>':'';
 const portrait=foe?
  '<span class="cb-emblem" aria-hidden="true">'+(enemyMark[u.id]||'◈')+'</span>':
  '<canvas class="cb-portrait" data-portrait="'+(u.id==='hero'?'player':'enemy')+
    '" width="200" height="260" aria-label="'+esc(u.name)+' Live2D"></canvas>';
 return '<button type="button" class="cb-unit '+(foe?'foe ':'')+
  (u.hp===0?'down ':'')+(canTarget?'targetable':'')+'" data-target="'+esc(u.id)+
  '"'+(canTarget?'':' disabled')+' aria-label="'+esc(u.name)+'，生命 '+u.hp+'/'+u.maxHp+'">'+
  head+'<span class="cb-unit-main">'+portrait+'</span><span class="cb-unit-info">'+
  '<span class="cb-unit-row"><span class="cb-unit-name">'+esc(u.name)+'</span>'+
  '<span class="cb-unit-role">'+esc(u.role)+'</span></span>'+
  '<span class="cb-meter"><i style="width:'+pct+'%"></i></span>'+
  '<span class="cb-stats"><span>HP '+u.hp+'/'+u.maxHp+'</span>'+
  '<span>'+(u.shield>0?'盾 '+u.shield:'')+(u.mark>0?' 标记 '+u.mark:'')+
  (u.expose>0?' 易伤':'')+'</span></span>'+
  '<span class="cb-stats"><span class="cb-reaction">连携 '+(u.hp>0?u.rp:0)+'</span>'+
  '<span>'+(u.hp===0?'倒下':'')+'</span></span></span></button>';
}
function render(snap){
 if(!host||!active)return;
 if(selected&&!snap.hand.some(x=>x.uid===selected))selected=null;
 const card=snap.hand.find(c=>c.uid===selected);
 const options=new Set(card?targetsOf(card):[]);
 $('cb-round').textContent='第 '+snap.round+' 回合';
 $('cb-energy').innerHTML='<span class="cb-energy-label">能量 '+snap.energy+'/'+snap.maxEnergy+'</span>'+
  Array.from({length:snap.maxEnergy},(_,i)=>'<i class="cb-orb '+(i>=snap.energy?'empty':'')+'"></i>').join('');
 $('cb-end').disabled=snap.phase!=='player';
 $('cb-allies').innerHTML=snap.allies.map(u=>unitButton(u,false,null,options.has(u.id))).join('');
 $('cb-enemies').innerHTML=snap.enemies.map(u=>{
  const plan=snap.intents.find(x=>x.actorId===u.id);
  // An intent prepared when three enemies lived must stop advertising a
  // combo if the player eliminated every potential supporting enemy.
  const liveSupport=snap.enemies.some(x=>x.id!==u.id&&x.hp>0);
  const currentPlan=plan?{...plan,willCombo:plan.kind!=='guard'&&liveSupport}:null;
  return unitButton(u,true,currentPlan,options.has(u.id));
 }).join('');
 $('cb-hand').innerHTML=snap.hand.map(c=>cardButton(c,snap)).join('');
 $('cb-deck-info').textContent='牌库 '+snap.drawCount+' · 弃牌 '+snap.discardCount;
 const last=snap.events.slice(-4);
 $('cb-feed').innerHTML=last.map(e=>'<span>'+(e.kind==='assist'?'<b>连携 </b>':'')+
   esc(e.text||'')+'</span>').join('<span>／</span>');
 const lastAttack=chainCaption||snap.events.slice().reverse().find(x=>x.kind==='chain')?.text||'';
 $('cb-chain-label').textContent=lastAttack.startsWith('敌方')?'敌方连携':
  lastAttack.startsWith('我方')?'我方连携':'LINK';
 $('cb-chain-counter').textContent=lastAttack||'攻势由队友接续';
 if(card?.type==='attack'){
  const partners=snap.allies.filter(x=>x.id!==card.owner&&x.hp>0&&x.rp>0);
  $('cb-chain-detail').textContent=partners.length?'援击就绪：'+partners.map(x=>x.name).join(' · '):
   '暂无可用连携响应';
 }else $('cb-chain-detail').textContent='我方与敌方使用相同连携规则';
 const eligible=card?targetsOf(card).map(id=>[...snap.allies,...snap.enemies].find(x=>x.id===id)?.name).filter(Boolean):[];
 $('cb-hint').textContent=card?'「'+card.name+'」选择目标：'+eligible.join(' / '):
  (tip||'先出牌，再点目标；连携自动触发。敌方行动同样会发生援击。');
 const finished=snap.phase==='won'||snap.phase==='lost';
 $('cb-result').hidden=!finished;
 if(finished){
  $('cb-result-title').textContent=snap.phase==='won'?'战斗胜利':'队伍全灭';
  $('cb-result-stats').textContent='我方连携 '+snap.stats.allyAssists+
   ' 次 · 敌方连携 '+snap.stats.enemyAssists+' 次 · 第 '+snap.round+' 回合';
 }
}
function noteChain(snap,prev){
 const chain=snap.events.filter(e=>e.id>prev&&e.kind==='chain').at(-1);
 if(chain)chainCaption=chain.text;
 // Preserve latest enemy-chain announcement through next-round bookkeeping.
}
/* The engine resolves instantly for determinism; every actual damage event is
 * nevertheless replayed in attack order, including enemy follow-up strikes.
 * A new action cancels only the old visual queue, never the battle result.
 */
function clearFeedback(){
 if(feedbackTimer)clearTimeout(feedbackTimer);
 feedbackTimer=0;
 if(!host)return;
 for(const node of host.querySelectorAll('.cb-unit.cb-striking, .cb-unit.cb-taking-hit, .cb-unit.cb-being-helped'))
  node.classList.remove('cb-striking','cb-taking-hit','cb-being-helped');
 for(const node of host.querySelectorAll('.cb-float'))node.remove();
}
function showSequence(snap,prior){
 clearFeedback();
 const steps=snap.events.filter(e=>e.id>prior&&
  ['attack','assist','guard','heal'].includes(e.kind));
 if(!steps.length)return;
 let i=0;
 function playNext(){
  if(!active||!host)return;
  clearFeedback();
  if(i>=steps.length){render(model.snapshot());return;}
  const entry=steps[i++];
  const actor=host.querySelector('.cb-unit[data-target="'+entry.actor+'"]');
  const target=host.querySelector('.cb-unit[data-target="'+entry.target+'"]');
  if(actor)actor.classList.add('cb-striking');
  if(target){
   target.classList.add(entry.kind==='guard'||entry.kind==='heal'?'cb-being-helped':'cb-taking-hit');
   const pop=document.createElement('span');
   pop.className='cb-float'+(entry.kind==='assist'?' cb-assist':'')+
    (entry.kind==='guard'||entry.kind==='heal'?' cb-help':'');
   const amount=Number.isFinite(entry.amount)?entry.amount:0;
   pop.textContent=(entry.kind==='guard'||entry.kind==='heal'?'+':'−')+amount;
   target.appendChild(pop);
  }
  $('cb-chain-label').textContent=entry.kind==='assist'?'连携追击':
   entry.side==='enemy'?'敌方行动':entry.kind==='attack'?'主攻':'支援';
  $('cb-chain-detail').textContent=entry.text||'';
  feedbackTimer=setTimeout(playNext,entry.kind==='assist'?260:320);
 }
 playNext();
}
function useCard(uid,target){
 const prev=model.snapshot().sequence;
 const result=model.play(uid,target);
 if(!result.ok){tip=result.reason;render(result.snapshot);return;}
 selected=null;tip='';noteChain(result.snapshot,prev);render(result.snapshot);showSequence(result.snapshot,prev);
}
function handleClick(event){
 if(!active)return;
 const button=event.target.closest('button');if(!button||button.disabled)return;
 if(button.id==='cb-close'||button.id==='cb-result-close'){close();return;}
 if(button.id==='cb-rematch'){
  clearFeedback();selected=null;chainCaption='';tip='';model.reset();render(model.snapshot());return;
 }
 if(button.id==='cb-end'){
  const prev=model.snapshot().sequence;
  selected=null;tip='';const res=model.endTurn();
  if(res.ok){noteChain(res.snapshot,prev);render(res.snapshot);showSequence(res.snapshot,prev);}return;
 }
 if(button.dataset.card){
  const uid=button.dataset.card;
  if(selected===uid){selected=null;render(model.snapshot());return;}
  const card=model.snapshot().hand.find(x=>x.uid===uid);if(!card)return;
  const t=targetsOf(card);
  if(t.length===1)useCard(uid,t[0]);
  else{selected=uid;tip='';render(model.snapshot());}
  return;
 }
 if(selected&&button.dataset.target)useCard(selected,button.dataset.target);
}
function handleKey(event){
 if(!active)return;
 if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}
 if(/^[1-7]$/.test(event.key)&&!event.altKey&&!event.ctrlKey&&!event.metaKey){
  const c=model.snapshot().hand[Number(event.key)-1];
  if(c){const b=host.querySelector('[data-card="'+c.uid+'"]');if(b&&!b.disabled){event.preventDefault();b.click();}}
 }
}
function portraitFrame(){
 if(!active||!host)return;
 if(!document.hidden)for(const output of host.querySelectorAll('canvas[data-portrait]')){
  const slot=output.dataset.portrait;
  const actor=$(slot==='player'?'camera-player-root':'enemy-depth-root');
  const input=$('actor-'+slot+'-l2d');
  const ctx=output.getContext('2d');if(!ctx)continue;
  ctx.clearRect(0,0,output.width,output.height);
  if(!actor||!input||actor.dataset.l2dState!=='ready')continue;
  try{
   const clip=actor.querySelector('img[data-l2d-v4]');
   if(actor.dataset.l2dMode==='v4-native'&&clip?.complete&&clip.naturalWidth){
    const r=Math.min(output.width/clip.naturalWidth,output.height/clip.naturalHeight)*.98;
    const w=clip.naturalWidth*r,h=clip.naturalHeight*r;
    ctx.drawImage(clip,(output.width-w)/2,(output.height-h)/2,w,h);
   }else if(input.width&&input.height){
    const sw=input.width*.68,sx=input.width*.16;
    const r=Math.min(output.width/sw,output.height/input.height)*1.11;
    const w=sw*r,h=input.height*r;
    ctx.drawImage(input,sx,0,sw,input.height,(output.width-w)/2,(output.height-h)/2,w,h);
   }
  }catch(_){/* art unavailable: leave portrait transparent */ }
 }
 raf=requestAnimationFrame(portraitFrame);
}
async function castPortraits(){
 const dev=root.PaperchalkCharacterDev;
 if(!dev)return;
 for(let n=0;n<180&&active&&!dev.ready;n++)await new Promise(done=>requestAnimationFrame(done));
 if(!active||!dev.ready)return;
 prevSlots={
  player:dev.assigned.player?{...dev.assigned.player}:null,
  enemy:dev.assigned.enemy?{...dev.assigned.enemy}:null
 };
 for(const [slot,id] of [['player','protagonist'],['enemy','char-002']]){
  if(!active)break;
  try{await dev.assign(slot,id,'front',false)}
  catch(error){console.warn('[Combat] Live2D portrait not available',slot,error)}
 }
}
async function uncastPortraits(){
 const dev=root.PaperchalkCharacterDev,original=prevSlots;
 prevSlots=null;if(!original||!dev?.ready)return;
 for(const slot of ['player','enemy']){
  const p=original[slot];if(!p?.id||!p.side)continue;
  if(dev.assigned[slot]?.id===p.id&&dev.assigned[slot]?.side===p.side)continue;
  try{await dev.assign(slot,p.id,p.side,false)}
  catch(error){console.warn('[Combat] Cannot restore L2D slot',slot,error)}
 }
}
function open(){
 if(active||closing)return;
 install();if(!host)return;
 clearFeedback();active=true;selected=null;chainCaption='';tip='';
 prevVisible={
  player:$('camera-player-root')?.hidden,
  enemy:$('enemy-depth-root')?.hidden
 };
 if($('camera-player-root'))$('camera-player-root').hidden=false;
 if($('enemy-depth-root'))$('enemy-depth-root').hidden=false;
 model.reset();host.hidden=false;render(model.snapshot());
 castTask=castPortraits();
 raf=requestAnimationFrame(portraitFrame);
}
async function close(){
 if(!active||closing)return;
 active=false;closing=true;clearFeedback();host.hidden=true;
 if(raf)cancelAnimationFrame(raf);raf=0;
 try{await castTask.catch(()=>{});await uncastPortraits();}
 finally{
  if(prevVisible){
   if($('camera-player-root')&&typeof prevVisible.player==='boolean')
    $('camera-player-root').hidden=prevVisible.player;
   if($('enemy-depth-root')&&typeof prevVisible.enemy==='boolean')
    $('enemy-depth-root').hidden=prevVisible.enemy;
  }
  prevVisible=null;closing=false;
 }
}
root.PaperWorldCombatUI=Object.freeze({open,close,
 get running(){return active},get snapshot(){return model.snapshot()}});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})(window);