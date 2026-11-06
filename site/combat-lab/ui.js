/* Paperchalk Timegrid Combat demo interface. No framework, dependencies or network calls. */
(function(){'use strict';
const G=window.Timegrid,C=window.TimegridRun;const $=id=>document.getElementById(id);
let game,run,selectedUid=null,selectedActionId=null,placementMode=null,targetId=null,playHead=-1,toastHandle=null,projection=null;
const icon={attack:'⚔',defense:'⬡',skill:'✧',power:'✦',finisher:'◆',system:'↻'};
function textEscape(s){return String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function uiIcon(name, size=18){
 const paths={
  attack:'<path d="m14 4 6 6-8.3 8.3-5-5L15 5"/><path d="m5 13-2 3 5 5 3-2"/><path d="M15.5 6.5 18 4"/>',
  defense:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  skill:'<path d="m12 3 1.5 6.5L20 11l-6.5 1.5L12 19l-1.5-6.5L4 11l6.5-1.5L12 3Z"/><path d="M19 18v4M17 20h4"/>',
  power:'<path d="M12 2v8l-7 3 7 9v-8l7-3-7-9Z"/>',
  finisher:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/>',
  system:'<path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M5.7 9a7 7 0 0 1 12-2L20 12"/><path d="M18.3 15A7 7 0 0 1 6 17l-2-5"/>',
  arrow:'<path d="M4 12h16m-7-7 7 7-7 7"/>',
  guard:'<path d="M4 12h5l2 4 2-9 2 5h5"/><path d="M3 4h18v16H3z"/>',
  target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  heal:'<path d="M12 21s-9-5.4-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.6-9 12-9 12Z"/><path d="M12 8v8m-4-4h8"/>',
  alert:'<path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5M12 18h.01"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  mark:'<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><circle cx="12" cy="12" r="3"/>',
  all:'<circle cx="12" cy="6" r="2"/><circle cx="6" cy="17" r="2"/><circle cx="18" cy="17" r="2"/><path d="m10 8-3 7m7-7 3 7M8 17h8"/>',
  stun:'<path d="m13 2-6 10h5l-2 10 7-12h-5l1-8Z"/>',
  play:'<path d="m7 3 13 9-13 9V3Z"/>',
  card:'<rect x="4" y="4" width="13" height="17" rx="2"/><path d="M9 8h4M9 12h4M20 7v13"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  undo:'<path d="M3 7v6h6"/><path d="M4 13a8 8 0 1 0 2-7"/>'
 };
 return `<svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.skill}</svg>`;
}
function iconKind(c){return c.aoe?'all':c.heal?'heal':c.mark?'mark':c.type==='attack'?'attack':c.type==='defense'?'defense':c.type==='finisher'?'finisher':c.type==='system'?'system':'skill'}
function unitCode(actor){if(!actor)return '—';const side=actor.side==='enemy'?'敌':'友';const n=game.actors.filter(a=>a.side===actor.side).findIndex(a=>a.id===actor.id);return side+(n>=0?n+1:'?');}
function nameTag(actor){return textEscape(String(actor?.name||'').split('·').pop().replace('走廊','').slice(0,4))}
function healthGraphic(current,projected,max,enemy){
 const a=Math.max(0,Math.min(100,100*current/max)),b=Math.max(0,Math.min(100,100*projected/max));
 return `<div class="vital-track ${enemy?'hostile':'friendly'}" role="img" aria-label="当前${current}生命，预计${projected}生命"><span class="vital-base" style="width:${a}%"></span><span class="vital-loss" style="left:${Math.min(a,b)}%;width:${Math.abs(a-b)}%"></span><span class="vital-forecast" style="width:${b}%"></span></div>`;
}

function options(select,records,selected){select.innerHTML=records.map(([value,name])=>`<option value="${textEscape(value)}" ${value===selected?'selected':''}>${textEscape(name)}</option>`).join('');}
function refreshStyles(){const key=$('classSelect').value;options($('styleSelect'),Object.entries(G.CLASS[key].styles).map(([k,x])=>[k,x.name]),Object.keys(G.CLASS[key].styles)[0]);}
function initializeControls(){options($('classSelect'),Object.entries(G.CLASS).map(([k,x])=>[k,x.name]),'axe');refreshStyles();options($('encounterSelect'),Object.entries(G.ENCOUNTERS).map(([k,v])=>[k,v.name]),'corridor');$('teamCheckbox').checked=false;
$('classSelect').addEventListener('change',refreshStyles);
$('setupToggle')?.addEventListener('click',()=>{const open=$('setupToggle').getAttribute('aria-expanded')!=='true';document.querySelector('.setup')?.classList.toggle('is-open',open);$('setupToggle').setAttribute('aria-expanded',String(open));});
$('createButton').addEventListener('click',()=>newGame());$('resetButton').addEventListener('click',()=>newGame());
$('shuffleButton').addEventListener('click',()=>{if(!isPlanning())return;placementMode='shuffle';selectedUid=null;selectedActionId=null;display();showToast('洗牌耗时1格（非空手2格），只锁已有动作；新牌可填前面空位。');});
$('undoButton').addEventListener('click',()=>{const a=game.actors[0],tail=[...a.actions].filter(x=>!x.locked&&x.start>=game.now).sort((x,y)=>y.start-x.start)[0];if(!tail){showToast('没有可撤销的未锁定卡牌');return;}try{G.remove(game,tail.id);selectedUid=null;placementMode=null;display();}catch(e){showToast(e.message)}});

$('autoplanButton').addEventListener('click',()=>{if(!isPlanning())return;try{G.autoPlan(game,'tactical');selectedUid=null;selectedActionId=null;placementMode=null;display();forecast();showToast('自动排程已生成，仍可调整未锁定的卡牌。');}catch(e){showToast(e.message)}});
$('commitButton').addEventListener('click',execute);
$('helpButton').addEventListener('click',()=>showHelp());$('deckButton').addEventListener('click',()=>showDeck());$('closeModal').addEventListener('click',closeModal);$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal()});
$('hand').addEventListener('click',e=>{const b=e.target.closest('[data-uid]');if(!b||!isPlanning())return;selectedUid=b.dataset.uid;selectedActionId=null;placementMode='card';display();showToast('已选卡：点任意角色的上轨时间格，或直接拖到上轨。');});
$('hand').addEventListener('dragstart',e=>{const b=e.target.closest('[data-uid]');if(!b||!isPlanning())return;selectedUid=b.dataset.uid;selectedActionId=null;placementMode='card';e.dataTransfer.setData('text/plain','card:'+selectedUid);e.dataTransfer.effectAllowed='copy';});
$('hand').addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('text/plain'))e.preventDefault();});
$('hand').addEventListener('drop',e=>{e.preventDefault();const data=e.dataTransfer.getData('text/plain');if(!data.startsWith('action:'))return;try{G.remove(game,data.slice(7));selectedActionId=null;placementMode=null;display();showToast('已从时间轴取下卡牌');}catch(err){showToast(err.message)}});
$('timeline').addEventListener('dragstart',e=>{const c=e.target.closest('[data-action-id]');if(!c||!isPlanning())return;const id=c.dataset.actionId,a=game.actors[0].actions.find(x=>x.id===id);if(!a||a.locked){e.preventDefault();return;}selectedActionId=id;selectedUid=null;placementMode='move';e.dataTransfer.setData('text/plain','action:'+id);e.dataTransfer.effectAllowed='move';});
$('timeline').addEventListener('dragover',e=>{const c=e.target.closest('[data-time]');if(c){e.preventDefault();c.classList.add('drag-target')}});
$('timeline').addEventListener('dragleave',e=>{const c=e.target.closest('[data-time]');if(c)c.classList.remove('drag-target')});
$('timeline').addEventListener('drop',e=>{const c=e.target.closest('[data-time]');if(!c)return;e.preventDefault();const raw=e.dataTransfer.getData('text/plain');if(raw.startsWith('action:')){selectedActionId=raw.slice(7);placementMode='move'}else if(raw.startsWith('card:')){selectedUid=raw.slice(5);placementMode='card'}doPlace(Number(c.dataset.time),c.dataset.actor);});
$('timeline').addEventListener('click',e=>{const c=e.target.closest('[data-time]');if(!c)return;if(c.classList.contains('dual-hour')){playHead=Number(c.dataset.time);display();return;}const id=c.dataset.actionId;
if(!placementMode&&c.querySelector('.incoming-flag')){guardThreat(c.dataset.actor,Number(c.dataset.time));return;}
if(id&&placementMode===null){const a=game.actors[0].actions.find(x=>x.id===id);if(a&&!a.locked){selectedActionId=id;selectedUid=null;placementMode='move';display();showToast('已选动作：点另一格移动；拖回手牌区取下。');return;}}
if(placementMode)doPlace(Number(c.dataset.time),c.dataset.actor);
else{playHead=Number(c.dataset.time);display();}
});
$('timeline').addEventListener('pointerover',e=>{const c=e.target.closest('[data-time]');if(!c||!isPlanning()||placementMode)return;const i=Number(c.dataset.time);if(i!==playHead){playHead=i;renderForecast();updateTimeHighlight();}});
$('timeline').addEventListener('keydown',e=>{const c=e.target.closest('[data-time]');if(!c)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();c.click()}});
$('actorCards')?.addEventListener('click',e=>{const c=e.target.closest('[data-target]');if(!c)return;targetId=c.dataset.target;display();showToast('已选择目标：'+game.actors.find(x=>x.id===targetId).name);});
$('finisherSlot').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(!isPlanning())return;placementMode='finisher';selectedUid=null;selectedActionId=null;display();showToast('先安排标记/充能，再把绝杀放到目标敌人的后续时间格。');});
$('removeActionButton')?.addEventListener('click',()=>{if(!selectedActionId)return;try{G.remove(game,selectedActionId);selectedActionId=null;placementMode=null;display();showToast('已取下动作，退回手牌');}catch(err){showToast(err.message)}});
$('threatStrip')?.addEventListener('click',e=>{const b=e.target.closest('[data-guard-target]');if(b)guardThreat(b.dataset.guardTarget,Number(b.dataset.guardTick));});
$('threatStrip')?.addEventListener('pointerover',e=>{const b=e.target.closest('[data-guard-target]');if(!b)return;const row=$('timeline')?.querySelector(`[data-row-actor="${b.dataset.guardTarget}"]`);row?.classList.add('threat-focus');});
$('threatStrip')?.addEventListener('pointerout',()=>{$('timeline')?.querySelectorAll('.threat-focus').forEach(r=>r.classList.remove('threat-focus'));});
}
function toast(s){if(toastHandle)clearTimeout(toastHandle);$('toast').textContent=s;$('toast').classList.add('show');toastHandle=setTimeout(()=>$('toast').classList.remove('show'),3600)}
const showToast=toast;
function isPlanning(){return game&&game.phase==='planning';}
function newGame(extra={}){const choice={classId:$('classSelect').value,styleId:$('styleSelect').value,startEncounter:$('encounterSelect').value,team:$('teamCheckbox').checked,seed:extra.seed===undefined?Math.floor(Math.random()*1e9):extra.seed};run=C.start(choice);game=C.newBattle(run);selectedUid=null;selectedActionId=null;placementMode=null;targetId=G.actorsOf(game,'enemy')[0]?.id;playHead=-1;document.querySelector('.setup')?.classList.remove('is-open');$('setupToggle')?.setAttribute('aria-expanded','false');$('forecastOutput').innerHTML='这里会显示精确预演：我方与敌方血量、破防和预计命中。';closeModal();display();}
function resolveLane(laneId){const target=game.actors.find(a=>a.id===laneId);if(!target||target.dead)throw Error('目标不可用');return target;}
function doPlace(relative,laneId){
 if(!isPlanning())return;
 if(!placementMode){showToast('先选手牌或动作，然后选择轨道和时间格');return;}
 try{
 const lane=resolveLane(laneId);
 if(placementMode==='shuffle'){
  if(laneId!=='hero')throw Error('洗牌请放在自己的上层目标轨道');G.shuffleHand(game,relative);
 }else if(placementMode==='move'){
  const a=game.actors[0].actions.find(x=>x.id===selectedActionId);if(!a)throw Error('未找到待移动动作');
  const card=G.CARD[a.card];
  const friendly=card.type==='defense'||card.heal||card.buff||a.source==='shuffle';
  const dest=laneId==='hero'&&!friendly?a.target:laneId;
  G.moveAction(game,selectedActionId,relative,dest);
 }else if(placementMode==='finisher'){
  if(lane.side!=='enemy')throw Error('绝杀请放在敌方目标轨道');G.placeFinisher(game,relative,laneId);
 }else if(placementMode==='card'){
  const hero=game.actors[0],it=hero.hand.find(c=>c.uid===selectedUid),card=G.CARD[it?.key];if(!card)throw Error('卡牌不存在');
  const friendly=card.type==='defense'||card.heal||card.buff;
  const dest=laneId==='hero'&&!friendly?targetId:laneId;
  // The action's owner remains HERO regardless of the target lane (including allies).
  G.place(game,selectedUid,relative,dest);
 }
 placementMode=null;selectedUid=null;selectedActionId=null;playHead=-1;display();
 }catch(e){showToast(e.message)}
}
function segmentAt(actor,t){if(actor.stunUntil>t)return{kind:'recovering',name:'失能恢复',start:t,locked:true};for(const act of actor.actions){if(act.canceled)continue;const card=G.CARD[act.card];const ph=G.phase(card,act.start,t);if(ph)return{kind:'action',phase:ph,card,action:act,name:card.name};}return null;}
function updateTimeHighlight(){
 $('timeline')?.querySelectorAll('.playhead').forEach(x=>x.classList.remove('playhead'));
 if(playHead>0)$('timeline')?.querySelectorAll(`[data-time="${playHead}"]`).forEach(x=>x.classList.add('playhead'));
 
}
function forecastState(actor,instant=false){
 if(!projection)return {hp:actor.hp,marked:actor.marked,dead:actor.dead,energy:actor.energy};
 const frame=instant&&playHead>0?projection.trace?.find(t=>t.tick===game.now+playHead):null;
 return (frame?.actors||projection.actors).find(x=>x.id===actor.id)||actor;
}
function phaseBadge(phase,card,action,t,compact=false){
 if(!phase)return '';
 const active=phase==='active';
 const first=t===action.start;
 const label=first?card.name:active?(card.damage?`⚔${card.damage}`:card.guard?`⬡${card.guard}`:card.mark?`⌖${card.mark}`:'◆'):(phase==='windup'?'·':'⌛');
 return `<span class="phase-text">${textEscape(compact?(active?(card.damage?'⚔':'●'):'·'):label)}</span>`;
}
/* Display every declared enemy hit at its actual activation tick. These are
   scheduling warnings, not damage already taken: the HP projection uses the
   authoritative engine and accounts for shields, speed and interrupts. */
function scheduledThreats(){
 const threats=[];
 for(const source of game.actors.filter(a=>a.side==='enemy'&&!a.dead))for(const action of source.actions){
  if(action.canceled)continue;
  const c=G.CARD[action.card];if(!c||!c.damage)continue;
  for(let tick=Math.max(game.now,action.start+c.w);tick<Math.min(game.now+10,action.start+c.w+c.a);tick++){
   const victims=c.aoe?game.actors.filter(a=>a.side==='ally'&&!a.dead):[game.actors.find(a=>a.id===action.target)].filter(a=>a?.side==='ally'&&!a.dead);
   for(const victim of victims)threats.push({tick:tick-game.now+1,absoluteTick:tick,source:source.id,sourceName:source.name,target:victim.id,targetName:victim.name,damage:G.predictHit(source,c,tick),card:c.name,speed:c.speed||6});
  }
 }
 return threats.sort((a,b)=>a.tick-b.tick||b.speed-a.speed);
}
function shortActor(name){return String(name).split('·')[0].replace('走廊','').slice(0,4);}
function plannedGuardFor(target,tick){return game.actors.some(a=>a.actions.some(x=>!x.canceled&&x.target===target&&G.CARD[x.card]?.type==='defense'&&G.phase(G.CARD[x.card],x.start,game.now+tick-1)==='active'));}
/* One-click defense targets the threatened ally and lines up the active guard
   segment with the enemy's announced hit. It always spends caster's time. */
function guardThreat(targetId,hitTick){
 if(!isPlanning())return;
 const hero=game.actors[0];
 let card=hero.hand.find(it=>it.uid===selectedUid&&G.CARD[it.key]?.type==='defense');
 if(!card)card=hero.hand.find(it=>G.CARD[it.key]?.type==='defense');
 if(!card){showToast('当前手牌没有防御牌。已定位该队友的受击时间。');playHead=hitTick;display();return;}
 const c=G.CARD[card.key],end=hitTick-1;
 // Latest active start first; fall back through other legal overlapping windows.
 let lastError='当前没有足够的空闲时间放置这张防御牌';
 for(let start=end-c.w;start>=end-c.w-c.a+1;start--){
  const relative=start+1;if(relative<1||relative>10)continue;
  try{
   G.place(game,card.uid,relative,targetId);
   selectedUid=null;selectedActionId=null;placementMode=null;playHead=hitTick;display();
   showToast(`已为 ${game.actors.find(a=>a.id===targetId)?.name||'队友'} 排好防御，覆盖 T${hitTick}；占用的是你的时间`);
   return;
  }catch(error){lastError=error.message;}
 }
 showToast(lastError+'；可手动选择其他空格或先取下一张牌');playHead=hitTick;display();
}
function renderThreatStrip(threats){
 const el=$('threatStrip');if(!el)return;
 const keys=new Map();for(const t of threats){const key=t.tick+':'+t.target;const e=keys.get(key);if(e){e.damage+=t.damage;e.sources.add(t.sourceName)}else keys.set(key,{...t,sources:new Set([t.sourceName])})}
 const list=[...keys.values()];
 if(!list.length){el.innerHTML=`<span class="threat-calm">${uiIcon('check',16)} 本轮安全</span>`;return;}
 el.innerHTML=`<span class="threat-label">${uiIcon('alert',16)} 威胁</span>${list.map(t=>{
  const covered=plannedGuardFor(t.target,t.tick),mine=game.actors.find(a=>a.id===t.target);
  const sourceNames=[...t.sources],title=`${sourceNames.join('、')}在T${t.tick}攻击${t.targetName}，原始伤害${t.damage}。点按即可安排防御（使用自己的行动时间）`;
  return `<button class="threat-chip ${covered?'covered':''}" type="button" data-guard-target="${textEscape(t.target)}" data-guard-tick="${t.tick}" title="${textEscape(title)}" aria-label="T${t.tick} ${textEscape(sourceNames.join('、'))}攻击${textEscape(t.targetName)} ${t.damage}伤害，点击安排防御">
   <span class="threat-time"><small>T</small>${t.tick}</span><span class="threat-source">${uiIcon('attack',15)} ${nameTag({name:sourceNames[0]})}</span><span class="threat-vector">${uiIcon('arrow',15)}</span><span class="threat-victim">${nameTag(mine||{name:t.targetName})}</span><b class="threat-amount">${t.damage}</b><span class="threat-guard">${covered?uiIcon('check',16):uiIcon('defense',16)}</span>
  </button>`;
 }).join('')}`;
}
function renderTimeline(){
 const start=game.now,times=Array.from({length:10},(_,i)=>i+1),hero=game.actors[0];
 const units=[...game.actors.filter(a=>a.side==='enemy'),...game.actors.filter(a=>a.side==='ally')],threats=scheduledThreats();
 let rows=`<div class="dual-header"><div class="dual-head-label">${uiIcon('target',14)} 目标 / 预计生命</div>${times.map(i=>`<button type="button" class="dual-hour ${playHead===i?'selected':''}" data-time="${i}" data-actor="hero" title="时间第${i}格">${String(i).padStart(2,'0')}</button>`).join('')}<span class="dual-over-head">＋</span></div>`;
 for(const actor of units){
  const enemy=actor.side==='enemy',own=actor.id==='hero',pred=forecastState(actor),delta=pred.hp-actor.hp;
  const targetActions=hero.actions.filter(a=>!a.canceled&&a.target===actor.id),incoming=threats.filter(x=>x.target===actor.id),outgoing=threats.filter(x=>x.source===actor.id);
  const inbound=incoming.length?incoming.reduce((n,t)=>n+t.damage,0):0;
  const preview=delta<0?`<span class="vital-delta damage">${uiIcon('attack',12)} ${Math.abs(delta)}</span>`:delta>0?`<span class="vital-delta recover">${uiIcon('heal',12)} +${delta}</span>`:'<span class="vital-delta neutral">—</span>';
  const identity=`<div class="dual-person" title="${textEscape(actor.name)}：${actor.hp} → ${pred.hp} HP"><div class="person-top"><div class="avatar ${enemy?'is-foe':'is-friend'} ${own?'is-hero':''}">${unitCode(actor)}</div><div class="person-info"><div class="person-name">${textEscape(actor.name)}</div><div class="person-numbers"><strong>${actor.hp}</strong><span class="health-arrow">→</span><strong class="predicted ${delta<0?'is-loss':delta>0?'is-heal':''}">${pred.hp}</strong></div></div></div>${healthGraphic(actor.hp,pred.hp,actor.maxHp,enemy)}</div>`;
  const canUse=placementMode==='card'?(()=>{const it=hero.hand.find(x=>x.uid===selectedUid);const c=G.CARD[it?.key];if(!c)return false;return c.type==='defense'||c.heal||c.buff?actor.side==='ally':actor.side==='enemy'})():placementMode==='finisher'?enemy:true;
  rows+=`<div data-row-actor="${actor.id}" class="dual-row ${enemy?'enemyrow':'allyrow'} ${own?'own-row':''} ${placementMode?'targeting':''} ${canUse?'legal-target':'invalid-target'}">${identity}<div class="dual-board">`;
  for(let i=1;i<=10;i++){
   const t=start+i-1,placed=targetActions.find(a=>G.phase(G.CARD[a.card],a.start,t));
   const seg=segmentAt(actor,t),ownAction=seg?.kind==='action'?seg:null,attacksHere=incoming.filter(x=>x.tick===i);
   let topClass='dual-big '+(enemy?'enemy-zone':'ally-zone'),chip='',id='',title=`${actor.name}，T${i}，可放置指向该角色的卡牌`;
   if(placed){
     const c=G.CARD[placed.card],ph=G.phase(c,placed.start,t),actualHit=c.damage?G.predictHit(hero,c,t):0;
     topClass+=` filled ${c.type} ${ph}${placed.locked?' locked':''}`;
     const number=c.damage?actualHit:c.guard||c.heal||c.mark||0;
     chip=ph==='active'?`<span class="phase-metric">${uiIcon(iconKind(c),14)}${number||''}</span>`:ph==='windup'?`<span class="phase-mark">${i===placed.start-game.now+1?uiIcon(iconKind(c),13):''}</span>`:`<span class="phase-mark dim">${placed.locked?uiIcon('lock',12):''}</span>`;
     id=` data-action-id="${placed.id}" draggable="${!placed.locked&&isPlanning()}"`;
     title=`你的${c.name} → ${actor.name}，T${i}：${ph==='active'?'造成/生效 '+number:ph==='windup'?'前摇':'后摇'}`;
   }else if(attacksHere.length){chip=`<span class="incoming-flag" title="${textEscape(attacksHere.map(x=>unitCode(game.actors.find(a=>a.id===x.source))+' 攻击 '+x.damage).join('、'))}；点击自动安排护卫">${uiIcon('alert',12)}<b>${attacksHere.reduce((n,x)=>n+x.damage,0)}</b><small>${attacksHere.map(x=>unitCode(game.actors.find(a=>a.id===x.source))).filter((v,i,a)=>a.indexOf(v)===i).join('+')}</small></span>`}
   else chip='<span class="dual-plus">＋</span>';
   if(playHead===i)topClass+=' playhead';
   let bottomClass='dual-small',bottom='',bottomTitle=`${actor.name}在T${i}等待`;
   if(seg?.kind==='recovering'){bottomClass+=' recovering';bottom=uiIcon('stun',13);bottomTitle=`${actor.name}失能恢复`}
   else if(ownAction){
     const c=ownAction.card,ph=ownAction.phase,strike=c.damage?G.predictHit(actor,c,t):0;
     const dest=game.actors.find(x=>x.id===ownAction.action.target);
     bottomClass+=` ${c.type} ${ph} ${enemy?'enemy-intent':''}`;
     if(ph==='active')bottom=`<span class="intent-metric">${uiIcon(iconKind(c),12)}<b>${strike||c.guard||c.heal||c.mark||''}</b>${dest?`<small>›${unitCode(dest)}</small>`:c.aoe?uiIcon('all',11):''}</span>`;
     else if(ph==='windup')bottom=`<span class="intent-phase windup-icon">${uiIcon('clock',12)}</span>`;
     else bottom=`<span class="intent-phase recovery-icon">·</span>`;
     bottomTitle=`${unitCode(actor)} ${c.name} ${ph==='active'?'生效':ph==='windup'?'前摇':'后摇'}，${c.damage?'伤害'+strike:c.guard?'防御'+c.guard:'技能'}，目标${dest?unitCode(dest):'全体'}，速度${c.speed}`;
   }
   rows+=`<div class="dual-tick"><div class="${topClass}" data-time="${i}" data-actor="${actor.id}" ${id} tabindex="0" role="button" aria-label="${textEscape(title)}" title="${textEscape(title)}">${chip}</div><div class="${bottomClass}" title="${textEscape(bottomTitle)}">${bottom}</div></div>`;
  }
  const cross=[...actor.actions,...targetActions].find(a=>!a.canceled&&a.start<start+10&&a.start+G.cLen(G.CARD[a.card])>start+10);
  rows+=`</div><div class="dual-over">${cross?'+'+(cross.start+G.cLen(G.CARD[cross.card])-(start+10)):'·'}</div></div>`;
 }
 $('timeline').innerHTML=rows;$('timeline').classList.toggle('choosing',!!placementMode);renderThreatStrip(threats);
}
function renderActors(){const team=game.actors.filter(a=>a.side==='ally'),enemy=game.actors.filter(a=>a.side==='enemy');let out='';for(const a of [...team,...enemy]){const isE=a.side==='enemy',id=a.id,percent=Math.max(0,a.hp/a.maxHp*100);out+=`<div class="actor ${isE?'enemy':''} ${id==='hero'?'current':''} ${a.dead?'dead':''}" ${isE?`data-target="${id}" style="cursor:pointer;${targetId===id?'outline:2px solid #d9b275;outline-offset:-2px':''}"`:''}><div class="actor-top"><div><span class="actor-icon">${isE?'☠':G.CLASS[id==='hero'?game.options.classId:id.replace('ai-','')]?.icon||'✦'}</span><span class="actor-name">${textEscape(a.name)}</span></div><span class="badge ${isE?'enemy':''}">${a.dead?'倒下':isE?'敌':'我'}</span></div><div class="healthline"><span>生命</span><strong>${a.hp}/${a.maxHp}</strong></div><div class="healthbar"><div style="width:${percent}%"></div></div><small>${a.stunUntil>game.now?'失能至 T'+a.stunUntil+' · ':''}${a.marked?'标记'+a.marked+' · ':''}${a.id==='hero'?'绝杀能量 '+a.energy+'/100':isE?'点击选择目标':'自动排程'}</small></div>`;}if($('actorCards'))$('actorCards').innerHTML=out;}
function renderHand(){
 const hero=game.actors[0];$('handCounter').textContent=`${hero.hand.length} / ${G.HAND}`;
 $('hand').innerHTML=hero.hand.length?hero.hand.map(it=>{
  const c=G.CARD[it.key],len=G.cLen(c),effect=c.damage?`${c.damage}${c.a>1?' ×'+c.a:''}`:c.guard?`${c.guard}`:c.heal?`+${c.heal}`:c.mark?`${c.mark}`:c.buff?`+${c.buff}`:'·';
  return `<button type="button" draggable="true" class="hand-card ${c.type} ${selectedUid===it.uid?'selected':''}" data-uid="${textEscape(it.uid)}" style="--ctype:${G.COLORS[c.type]}" title="${textEscape(c.name+' — '+(c.desc||'')+'，前摇'+c.w+' / 生效'+c.a+' / 后摇'+c.r+'，速度'+c.speed)}" aria-pressed="${selectedUid===it.uid}">
  <div class="card-art"><span class="card-symbol">${uiIcon(iconKind(c),37)}</span><span class="card-impact">${effect}</span></div>
  <div class="card-bottom"><strong>${textEscape(c.name)}</strong><div class="card-metadata"><span>${c.aoe?uiIcon('all',13):uiIcon('clock',13)} ${len}</span><span>${uiIcon('power',12)} ${c.speed}</span></div></div>
  <div class="phase-track" title="前摇 ${c.w} · 生效 ${c.a} · 后摇 ${c.r}">${Array.from({length:len},(_,i)=>`<span class="${i<c.w?'windup':i<c.w+c.a?'active':'recovery'}"></span>`).join('')}</div></button>`;
 }).join(''):`<div class="empty-hand">${uiIcon('system',28)}<span>手牌用尽 · 洗牌补充</span></div>`;
}
function renderStatus(){const hero=game.actors[0];$('turnStatus').textContent=`第 ${game.round+1} 轮 · 游戏内 ${String(Math.floor(game.now/60)).padStart(2,'0')}:${String(game.now%60).padStart(2,'0')}—${String(Math.floor((game.now+10)/60)).padStart(2,'0')}:${String((game.now+10)%60).padStart(2,'0')}`;
$('phaseStatus').textContent=game.phase==='planning'?'规划阶段 · 世界暂停':game.phase==='win'?'已胜利 · 战斗结算':'已失败 · 战斗结束';$('hintStatus').textContent=placementMode==='card'?'点目标上轨放牌；即使给队友护盾，也只占用你的行动时间':placementMode==='shuffle'?'洗牌只锁已排卡；不会锁空格':placementMode==='finisher'?'绝杀 → 放到敌人上轨时间格':placementMode==='move'?'移动选中动作 → 点新时间格':'选择卡牌并点击目标上轨；技能占自己的时间；各角色血条即时显示预计承伤/治疗';
$('commitButton').disabled=!isPlanning();$('shuffleButton').disabled=!isPlanning();$('autoplanButton').disabled=!isPlanning();$('undoButton').disabled=!isPlanning();
$('runStatus').innerHTML=`<span class="hud-chip stage">${uiIcon('target',15)} ${run.stage+1}<small> / ${C.STAGES.length}</small></span><span class="hud-chip coin">◈ <b>${run.gold}</b></span><span class="hud-chip">${uiIcon('card',15)} <b>${C.cardCount(run)}</b></span><span class="hud-chip">${uiIcon('skill',15)} <b>${run.relics.length}</b><small>/4</small></span><span class="hud-chip hp">${uiIcon('heal',15)} <b>${run.hp}</b><small>/${run.maxHp}</small></span><span class="hud-chip meter">${uiIcon('finisher',15)} <b>${hero.energy}</b><small>/100</small></span>`;$('heroStatus').innerHTML=`<div class="info-key"><span>当前生命</span><span>${hero.hp} / ${hero.maxHp}</span></div><div class="info-key"><span>绝杀能量</span><span>${hero.energy} / 100</span></div><div class="info-key"><span>抽牌堆 / 弃牌堆</span><span>${hero.draw.length} / ${hero.discard.length}</span></div><div class="info-key"><span>洗牌次数</span><span>${game.stats.shuffle}</span></div><div class="info-key"><span>已锁排程</span><span>${hero.actions.filter(a=>a.locked).length}张</span></div><div class="info-key"><span>跨轮占用</span><span>${hero.actions.filter(a=>!a.canceled&&a.start<game.now+10&&a.start+G.cLen(G.CARD[a.card])>game.now+10).length}项</span></div>`;
const fin=G.CARD[hero.fin],ready=hero.energy>=100 || (projection?.trace||[]).some(z=>z.actors.find(a=>a.id==='hero')?.energy>=100);$('finisherSlot').innerHTML=`<div class="finisher-glyph">${uiIcon('finisher',25)}</div><div class="finisher-body"><strong>${textEscape(fin.name)}</strong><div class="finisher-meter"><span style="width:${hero.energy}%"></span></div><small>${hero.energy} / 100</small></div><button type="button" ${ready?'':'disabled'} class="${placementMode==='finisher'?'selected':''}" title="绝杀：${fin.w}格前摇 / ${fin.a}格生效 / ${fin.r}格后摇">${uiIcon('target',16)} 放置</button>`;
}
function renderIntents(){let rows=[];for(const e of game.actors.filter(a=>a.side==='enemy')){if(e.dead)continue;const acts=e.actions.filter(a=>a.start>=game.now&&a.start<game.now+10&&!a.canceled);for(const a of acts){const c=G.CARD[a.card];rows.push(`<div class="enemy-intent"><strong>${textEscape(e.name)} · ${textEscape(c.name)}</strong><small>开始 T${a.start-game.now+1} → ${c.w}前摇 / ${c.a}作用 / ${c.r}后摇${c.damage?' · 每格'+c.damage+'伤害':''}${c.guard?' · 共'+c.guard+'防御':''} · 速度${c.speed}</small></div>`);}}$('enemyIntents').innerHTML=rows.join('')||'<p>此轮没有新行动；敌人可能正处于跨轮动作或失能恢复。</p>';}
function renderLog(records){const logs=records||game.events||[];const recent=logs.slice(-25);$('combatLog').innerHTML=recent.map(x=>`<div class="log-row ${x.kind}"><span class="tick">T${x.t-game.now+(game.round>0?10:0)}</span><span>${textEscape(x.text)}</span></div>`).join('')||'<p>等待战斗开始...</p>';}
function display(){
 projection=isPlanning()?G.simulateRound(game,{preview:true,collectTrace:true}):null;
 renderTimeline();renderHand();renderStatus();renderIntents();renderLog();renderForecast();
 const remove=$('removeActionButton');if(remove){remove.disabled=!selectedActionId;remove.textContent=selectedActionId?'✕ 取下选中动作':'✕ 取下动作';}
}
function renderForecast(){
 // Single source of truth: forecastState() reads the very same tick simulation used at execution.
 // All projected HP is rendered in the corresponding actor's own health bar, not a separate table.
 const out=$('forecastOutput');if(out&&projection)out.textContent='本轮逐格实时推演已同步更新在每个角色血条上。';
}
function forecast(){if(!isPlanning())return;playHead=-1;display();showToast('已经自动推演整段时间，鼠标移过格子或点击时间即可查看瞬时状态。');}
function execute(){if(!isPlanning())return;const base=game.now;game=G.simulateRound(game);placementMode=null;selectedUid=null;playHead=-1;if(!G.actorsOf(game,'enemy').find(a=>a.id===targetId))targetId=G.actorsOf(game,'enemy')[0]?.id;
$('forecastOutput').innerHTML=`<b>上一轮已结算</b> · 命中按时间先后执行；本轮产生 ${game.events.length} 条事件。`;
display();$('combatLog').innerHTML=game.events.slice(-28).map(e=>`<div class="log-row ${e.kind}"><span class="tick">T${e.t-base}</span><span>${textEscape(e.text)}</span></div>`).join('');
if(game.phase==='win'||game.phase==='lost')showResult();else showToast('同步执行完毕。进入下一轮，跨轮占用已保留。');}
function showResult(){
 const success=game.phase==='win',s=game.score||G.scoreResult(game);
 if(success){try{C.win(run,game);showRewards();}catch(err){openModal('结算失败',`<p>${textEscape(err.message)}</p>`);}return;}
 openModal('战斗失败 · 冒险结束',`<div class="run-summary"><span class="result-letter">${s.rank}</span><h3>第${run.stage+1}关失败</h3><p>本场评分 ${s.points}/100 · 冒险累计完成 ${run.completed.length} 关</p><p>牌组 ${C.cardCount(run)} 张 · 遗物 ${run.relics.length} 件</p><button id="retryRun" class="primary">↻ 重开肉鸽冒险</button></div>`);
 $('retryRun').addEventListener('click',()=>newGame());
}
function rarityName(key){return{common:'普通',uncommon:'高级',rare:'稀有'}[C.rarityOf(key)]||'普通';}
function deckEntries(filter=()=>true){return Object.entries(run.deck).filter(([key,n])=>n>0&&filter(key)).map(([key,n])=>({key,n,c:G.CARD[key]}));}
function showRewards(){
 const p=run.pending,s=run.lastResult;
 const html=`<div class="run-summary"><span class="result-letter">${s.rank}</span><h3>第${run.stage+1}关胜利 · 评分 ${s.points}/100</h3><p>战利品：<b>+${p.bonusGold}金币</b>、战后回复 <b>+${p.recover}生命</b>${p.finisher?' · ◆ 绝杀收尾专属奖励已计入':''}</p><p>评分越高，稀有卡出现概率越高；关卡限制最高奖励级别。请选择 <b>1 张卡</b>永久加入牌组，或跳过换取2金币。</p></div><div class="reward-grid">${p.choices.map(key=>{const c=G.CARD[key];return `<button class="reward-card ${C.rarityOf(key)}" data-reward="${key}"><span class="rarity">${rarityName(key)}</span><strong>${textEscape(c.name)}</strong><span>${textEscape(c.desc||'逐格生效')}</span><small>前摇${c.w} / 作用${c.a} / 后摇${c.r}${c.aoe?' · 群体':''}</small><em>＋ 加入卡组</em></button>`}).join('')}</div><div class="modal-actions"><button class="secondary" data-reward="skip">跳过卡牌 · +2金币</button></div>`;
 openModal('战斗评分 → 肉鸽卡牌奖励',html);
 $('modalBody').querySelectorAll('[data-reward]').forEach(btn=>btn.addEventListener('click',()=>{try{C.choose(run,btn.dataset.reward==='skip'?null:btn.dataset.reward);showShop();}catch(e){showToast(e.message)}}));
}
function targetSelect(kind){let cards=deckEntries(k=>kind==='remove'||!k.endsWith('+'));if(kind==='remove'&&C.cardCount(run)<=7)cards=[];
 return cards.length?`<select class="deck-choose" id="deckChoice-${kind}">${cards.map(x=>`<option value="${x.key}">${textEscape(x.c.name)} ×${x.n}</option>`).join('')}</select>`:'<small>无符合条件的卡</small>';
}
function showShop(){
 const items=run.shop;const html=`<div class="run-summary"><div class="shop-heading">◈ 深夜超市 <b>${run.gold} 金币</b></div><p>购买新卡、遗物、治疗，或永久升级/删除卡牌；金币与牌库会带入下一场战斗。无需消费也可以继续。</p><p>当前牌库 ${C.cardCount(run)} 张 · HP ${run.hp}/${run.maxHp} · 绝杀能量 ${run.energy}/100</p></div><div class="shop-grid">${items.map((it,i)=>`<div class="shop-item"><div class="shop-title"><span>${it.kind==='relic'?'◈':it.kind==='card'?'▤':'✧'} ${textEscape(it.name)}</span><strong>${it.cost} 金币</strong></div><p>${textEscape(it.description)}</p>${it.kind==='card'?`<small>${rarityName(it.key)} · ${G.cLen(G.CARD[it.key])}格${G.CARD[it.key].aoe?' · 全体攻击':''}</small>`:''}${it.kind==='upgrade'||it.kind==='remove'?targetSelect(it.kind):''}<button class="shop-buy" data-buy="${i}" ${it.sold||run.gold<it.cost?'disabled':''}>${it.sold?'已售罄':'购买'}</button></div>`).join('')}</div><div class="modal-actions"><button class="secondary" id="refreshShop">↻ 刷新卡牌商品（${3+run.rerolls*2}金币）</button><button class="primary" id="continueRun">${run.stage===C.STAGES.length-1?'领取通关成绩':'继续冒险 → 第'+(run.stage+2)+'关'}</button></div>`;
 openModal('深夜超市 · 肉鸽商店',html);
 $('modalBody').querySelectorAll('[data-buy]').forEach(b=>b.addEventListener('click',()=>{try{const i=Number(b.dataset.buy),it=run.shop[i];const target=(it.kind==='upgrade'||it.kind==='remove')?$('deckChoice-'+it.kind)?.value:null;C.buy(run,i,target);showShop();}catch(err){showToast(err.message)}}));
 $('refreshShop').addEventListener('click',()=>{try{C.reroll(run);showShop()}catch(err){showToast(err.message)}});
 $('continueRun').addEventListener('click',()=>{try{game=C.next(run);if(!game){showRunComplete();return;}$('encounterSelect').value=C.STAGES[run.stage];targetId=G.actorsOf(game,'enemy')[0]?.id;placementMode=null;selectedUid=null;selectedActionId=null;closeModal();display();showToast('进入新关卡：生命、牌组、遗物与绝杀能量已继承。');}catch(err){showToast(err.message)}});
 display();
}
function showRunComplete(){openModal('冒险完成 · 本轮构筑结果',`<div class="run-summary"><span class="result-letter">★</span><h3>五关挑战完成</h3><p>最终卡组 ${C.cardCount(run)}张，遗物 ${run.relics.length}件，剩余金币 ${run.gold}，生命 ${run.hp}/${run.maxHp}</p><p>${run.completed.map((c,i)=>`第${i+1}关 ${c.rank}·${c.score}分`).join(' ｜ ')}</p><button class="primary" id="newRun">开始新的冒险</button></div>`);$('newRun').addEventListener('click',()=>newGame());}
function showDeck(){if(!run)return;const items=deckEntries();openModal('当前肉鸽牌组 · 可跨关强化',`<div class="run-summary"><p>职业 ${textEscape(G.CLASS[run.classId].name)} · ${G.CLASS[run.classId].styles[run.styleId].name} ｜共 ${C.cardCount(run)}张</p><p>金币 ${run.gold} · 生命 ${run.hp}/${run.maxHp} · 绝杀能量 ${run.energy}/100</p><p>遗物：${run.relics.length?run.relics.map(k=>textEscape(C.RELICS[k].name)).join('、'):'无'}</p></div><div class="deck-list">${items.map(({key,n,c})=>`<div><span>${textEscape(c.name)} ×${n}${c.aoe?' · 全体':''}</span><small>${C.rarityOf(key)} · ${G.cLen(c)}格</small></div>`).join('')}</div>`);}
function openModal(title,body){$('modalTitle').textContent=title;$('modalBody').innerHTML=body;$('modal').classList.remove('hidden');}
function closeModal(){if(run&&(run.state==='reward'||run.state==='shop')){showToast('请先完成战利品选择，或跳过奖励并继续冒险。');return;}$('modal').classList.add('hidden');}
function showHelp(){openModal('怎么玩 · 时间轴战斗 + 肉鸽成长',`<p>本 Demo 是原创战斗原型。目标是完成5场战斗，保留战后牌组、生命、绝杀能量、金币和遗物。</p><ul><li>每轮10格，选手牌点时间轴任意空位，浅色前摇→主色作用→深色后摇；攻击含全体攻击和逐格多段伤害。</li><li>每一<b>新回合开始自动免费补满手牌</b>（包括抽牌堆自动重洗）；不会消耗时间格。无须整手打空。</li><li><b>主动洗牌</b>：空手消耗1格，非空手消耗2格。所有<b>已放卡不可移动</b>，但<strong>之前留出的空格仍可用新牌补放</strong>，规划内不能让洗牌位与卡牌重叠。</li><li>防御共享防御值，耗尽触发破防并取消后续行动；晕倒占用更多时间。只有最右端卡牌可以跨轮。</li><li>同格生效的动作按<b>速度从高到低</b>结算；相同速度的伤害属于同一批次。敌我全部按同一规则运行。</li><li>每名敌人和队友的行完全等高，上层大轨放我打向TA的牌，下层小轨显示TA自己的行动；攻击拖敌人上轨，治疗/保护拖友方上轨。</li><li>进入战斗就自动显示预计承伤与目标血量变化，改牌后实时更新；点击时间刻度可查看当格预测。</li><li>预演会实时模拟之前安排的标记、减血和充能；可以先排标记后排绝杀，依预定时刻判定条件。</li><li>所有队友同步逐格结算；绝杀固定槽，积攒100能量并满足条件才能用，收尾提高评分和奖励。</li><li><b>胜利后</b>按评分抽取三张不同候选牌，任选一张或跳过，然后进入“深夜超市”：购买/删牌/升级/遗物/治疗，继续下一关。</li></ul><p>初始4职业×2预设流派，可以通过战利品构筑更多变体；这不是最终的职业平衡结论。NPC联机仅为模拟，尚非真实在线多人。</p>`);}
initializeControls();newGame({seed:123456});
window.__TIMEGRID_DEBUG__={getGame:()=>game,getRun:()=>run,auto:()=>{$('autoplanButton').click();},execute:()=>{$('commitButton').click();},newGame,showRewards,showShop,showDeck};
})();