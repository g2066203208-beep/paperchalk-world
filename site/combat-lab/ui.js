/* Paperchalk Timegrid Combat demo interface. No framework, dependencies or network calls. */
(function(){'use strict';
const G=window.Timegrid,C=window.TimegridRun;const $=id=>document.getElementById(id);
let game,run,selectedUid=null,selectedActionId=null,placementMode=null,targetId=null,playHead=-1,toastHandle=null,projection=null;
const icon={attack:'⚔',defense:'⬡',skill:'✧',power:'✦',finisher:'◆',system:'↻'};
function textEscape(s){return String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function options(select,records,selected){select.innerHTML=records.map(([value,name])=>`<option value="${textEscape(value)}" ${value===selected?'selected':''}>${textEscape(name)}</option>`).join('');}
function refreshStyles(){const key=$('classSelect').value;options($('styleSelect'),Object.entries(G.CLASS[key].styles).map(([k,x])=>[k,x.name]),Object.keys(G.CLASS[key].styles)[0]);}
function initializeControls(){options($('classSelect'),Object.entries(G.CLASS).map(([k,x])=>[k,x.name]),'axe');refreshStyles();options($('encounterSelect'),Object.entries(G.ENCOUNTERS).map(([k,v])=>[k,v.name]),'corridor');$('teamCheckbox').checked=false;
$('classSelect').addEventListener('change',refreshStyles);
$('createButton').addEventListener('click',()=>newGame());$('resetButton').addEventListener('click',()=>newGame());
$('shuffleButton').addEventListener('click',()=>{if(!isPlanning())return;placementMode='shuffle';selectedUid=null;selectedActionId=null;display();showToast('选择时间格：空手换手占1格，主动重整占2格。此前排程会锁定。');});
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
if(id&&placementMode===null){const a=game.actors[0].actions.find(x=>x.id===id);if(a&&!a.locked){selectedActionId=id;selectedUid=null;placementMode='move';display();showToast('已选动作：点另一格移动；拖回手牌区取下。');return;}}
if(placementMode)doPlace(Number(c.dataset.time),c.dataset.actor);
else{playHead=Number(c.dataset.time);display();}
});
$('timeline').addEventListener('pointerover',e=>{const c=e.target.closest('[data-time]');if(!c||!isPlanning()||placementMode)return;const i=Number(c.dataset.time);if(i!==playHead){playHead=i;renderForecast();updateTimeHighlight();}});
$('timeline').addEventListener('keydown',e=>{const c=e.target.closest('[data-time]');if(!c)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();c.click()}});
$('actorCards')?.addEventListener('click',e=>{const c=e.target.closest('[data-target]');if(!c)return;targetId=c.dataset.target;display();showToast('已选择目标：'+game.actors.find(x=>x.id===targetId).name);});
$('finisherSlot').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(!isPlanning())return;placementMode='finisher';selectedUid=null;selectedActionId=null;display();showToast('先安排标记/充能，再把绝杀放到目标敌人的后续时间格。');});
$('removeActionButton')?.addEventListener('click',()=>{if(!selectedActionId)return;try{G.remove(game,selectedActionId);selectedActionId=null;placementMode=null;display();showToast('已取下动作，退回手牌');}catch(err){showToast(err.message)}});
}
function toast(s){if(toastHandle)clearTimeout(toastHandle);$('toast').textContent=s;$('toast').classList.add('show');toastHandle=setTimeout(()=>$('toast').classList.remove('show'),3600)}
const showToast=toast;
function isPlanning(){return game&&game.phase==='planning';}
function newGame(extra={}){const choice={classId:$('classSelect').value,styleId:$('styleSelect').value,startEncounter:$('encounterSelect').value,team:$('teamCheckbox').checked,seed:extra.seed===undefined?Math.floor(Math.random()*1e9):extra.seed};run=C.start(choice);game=C.newBattle(run);selectedUid=null;selectedActionId=null;placementMode=null;targetId=G.actorsOf(game,'enemy')[0]?.id;playHead=-1;$('forecastOutput').innerHTML='这里会显示精确预演：我方与敌方血量、破防和预计命中。';closeModal();display();}
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
function ribbonFor(action, owner, layer){
 const c=G.CARD[action.card];if(!c||action.canceled)return '';
 const length=G.cLen(c),relative=action.start-game.now;if(relative>=10||relative+length<=0)return '';
 const hit=c.damage?G.predictHit(owner,c,action.start+c.w):0;
 const effect=c.damage?`−${hit}${c.a>1?' ×'+c.a:''}`:c.guard?`盾${c.guard}`:c.heal?`+${c.heal}`:c.mark?`标记${c.mark}`:c.buff?`增益`:'效果';
 const name=layer==='own'?c.name:c.name;
 const detail=`${owner.name} · ${c.name}｜前摇${c.w} / 生效${c.a} / 后摇${c.r}｜${effect}｜速度${c.speed||6}`;
 const make=(n,phase)=>n?`<i class="ribbon-part ${phase}" style="flex:${n}"></i>`:'';
 const label=length<=1?effect:`${textEscape(name)} <b>${textEscape(effect)}</b>`;
 return `<div class="action-ribbon ${layer==='own'?'own-ribbon':'target-ribbon'} ${c.type} ${action.locked?'ribbon-locked':''}" style="left:${relative*10}%;width:${length*10}%;--ribbon-color:${G.COLORS[c.type]||'#8e9aaa'}" title="${textEscape(detail)}" aria-hidden="true">${make(c.w,'pre')}${make(c.a,'hit')}${make(c.r,'post')}<span class="ribbon-label">${label}</span></div>`;
}
function renderTimeline(){
 const start=game.now,hero=game.actors[0];
 const team=game.actors.filter(a=>a.side==='ally'),enemies=game.actors.filter(a=>a.side==='enemy');
 // Each actor gets an IDENTICAL two-lane group. Upper lane targets this actor;
 // lower lane shows their own actions. Neither targeting nor visuals consume a target's time.
 const units=[...enemies,...team];
 let rows=`<div class="dual-header"><div class="dual-head-label">角色 <span>· 当前 → 预计</span></div>${Array.from({length:10},(_,i)=>`<button type="button" class="dual-hour ${playHead===i+1?'selected':''}" data-time="${i+1}" data-actor="hero" title="查看第${i+1}分钟">${String(i+1).padStart(2,'0')}</button>`).join('')}<span class="dual-over-head">↗</span></div>`;
 for(const actor of units){
  const enemy=actor.side==='enemy',own=actor.id==='hero',prediction=forecastState(actor),delta=prediction.hp-actor.hp;
  const currentPct=Math.max(0,Math.min(100,100*actor.hp/actor.maxHp));
  const projectedPct=Math.max(0,Math.min(100,100*prediction.hp/actor.maxHp));
  const loss=Math.max(0,currentPct-projectedPct);
  const difference=delta<0?`<strong class="hp-loss">−${-delta} 预伤</strong>`:delta>0?`<strong class="hp-gain">+${delta} 治疗</strong>`:'<span class="hp-safe">无变化</span>';
  const targetActions=hero.actions.filter(a=>!a.canceled&&a.target===actor.id);
  const head=`<div class="dual-person" title="${textEscape(actor.name)} / 目前 ${actor.hp} / 预计 ${prediction.hp}"><div class="dual-name"><span class="side-signal ${enemy?'foe':'friend'}"></span><span>${textEscape(actor.name)}</span>${own?'<i>我</i>':''}</div><div class="dual-hp"><b>${actor.hp}</b><span class="hp-arr">→</span><b class="hp-future ${delta<0?'loss':delta>0?'heal':''}">${prediction.hp}</b><small>/${actor.maxHp}</small></div><div class="dual-health"><div class="hp-original ${enemy?'foe':'friend'}" style="width:${currentPct}%"></div><div class="hp-difference" style="left:${projectedPct}%;width:${loss}%"></div><div class="hp-projected ${enemy?'foe':'friend'}" style="width:${projectedPct}%"></div></div><div class="dual-result">${difference}${prediction.dead?'<b class="hp-loss"> · 倒下</b>':''}${prediction.marked?`<span> · 标记${prediction.marked}</span>`:''}</div></div>`;
  rows+=`<div class="dual-row ${enemy?'enemyrow':'allyrow'} ${own?'own-row':''}">${head}<div class="dual-board">`;
  for(let i=1;i<=10;i++){
   const t=start+i-1,placed=targetActions.find(a=>G.phase(G.CARD[a.card],a.start,t));
   const segment=segmentAt(actor,t),ownAction=segment?.kind==='action'?segment:null;
   let topClass='dual-big '+(enemy?'enemy-zone':'ally-zone'),id='',topTitle=`向${actor.name}施放卡牌，时间${i}分钟`;
   if(placed){
    const c=G.CARD[placed.card],ph=G.phase(c,placed.start,t);
    topClass+=` filled ${c.type} ${ph}${placed.locked?' locked':''}`;
    id=` data-action-id="${placed.id}" draggable="${!placed.locked&&isPlanning()}"`;
    topTitle=`我对${actor.name}使用${c.name}｜${ph==='windup'?'前摇':ph==='active'?'生效':'后摇'}｜第${i}格`;
   }
   if(playHead===i)topClass+=' playhead';
   let bottomClass='dual-small',bottomTitle=`${actor.name}：第${i}格等待`;
   if(segment?.kind==='recovering'){bottomClass+=' recovering';bottomTitle=`${actor.name}恢复失能`}
   else if(ownAction){const c=ownAction.card,ph=ownAction.phase;bottomClass+=` ${c.type} ${ph} ${enemy?'enemy-intent':''}`;
    const actualTarget=game.actors.find(x=>x.id===ownAction.action.target);
    bottomTitle=`${actor.name} · ${c.name}｜${ph==='active'?'生效':ph==='windup'?'前摇':'后摇'}｜${c.damage?'每格'+G.predictHit(actor,c,t)+'伤害':c.guard?'防御'+c.guard:c.heal?'治疗'+c.heal:'技能'}｜速度${c.speed}｜目标${actualTarget?.name||'全体'}`;
   }
   rows+=`<div class="dual-tick"><div class="${topClass}" data-time="${i}" data-actor="${actor.id}" ${id} tabindex="0" role="button" aria-label="${textEscape(topTitle)}" title="${textEscape(topTitle)}"></div><div class="${bottomClass}" title="${textEscape(bottomTitle)}"></div></div>`;
  }
  const topBars=targetActions.map(a=>ribbonFor(a,hero,'target')).join('');
  const bottomBars=actor.actions.filter(a=>!a.canceled).map(a=>ribbonFor(a,actor,'own')).join('');
  rows+=`<div class="ribbon-plane top-plane">${topBars}</div><div class="ribbon-plane bottom-plane">${bottomBars}</div></div>`;
  const cross=[...actor.actions,...targetActions].find(a=>!a.canceled&&a.start<start+10&&a.start+G.cLen(G.CARD[a.card])>start+10);
  rows+=`<div class="dual-over">${cross?`+${cross.start+G.cLen(G.CARD[cross.card])-(start+10)}`:'·'}</div></div>`;
 }
 $('timeline').innerHTML=rows;
}
function renderActors(){const team=game.actors.filter(a=>a.side==='ally'),enemy=game.actors.filter(a=>a.side==='enemy');let out='';for(const a of [...team,...enemy]){const isE=a.side==='enemy',id=a.id,percent=Math.max(0,a.hp/a.maxHp*100);out+=`<div class="actor ${isE?'enemy':''} ${id==='hero'?'current':''} ${a.dead?'dead':''}" ${isE?`data-target="${id}" style="cursor:pointer;${targetId===id?'outline:2px solid #d9b275;outline-offset:-2px':''}"`:''}><div class="actor-top"><div><span class="actor-icon">${isE?'☠':G.CLASS[id==='hero'?game.options.classId:id.replace('ai-','')]?.icon||'✦'}</span><span class="actor-name">${textEscape(a.name)}</span></div><span class="badge ${isE?'enemy':''}">${a.dead?'倒下':isE?'敌':'我'}</span></div><div class="healthline"><span>生命</span><strong>${a.hp}/${a.maxHp}</strong></div><div class="healthbar"><div style="width:${percent}%"></div></div><small>${a.stunUntil>game.now?'失能至 T'+a.stunUntil+' · ':''}${a.marked?'标记'+a.marked+' · ':''}${a.id==='hero'?'绝杀能量 '+a.energy+'/100':isE?'点击选择目标':'自动排程'}</small></div>`;}if($('actorCards'))$('actorCards').innerHTML=out;}
function renderHand(){const hero=game.actors[0];$('handCounter').textContent=`${hero.hand.length} / ${G.HAND}`;$('hand').innerHTML=hero.hand.length?hero.hand.map(it=>{const c=G.CARD[it.key],len=G.cLen(c);return `<button draggable="true" class="hand-card ${selectedUid===it.uid?'selected':''}" data-uid="${textEscape(it.uid)}" style="--ctype:${G.COLORS[c.type]}"><div class="card-head"><span class="card-ico">${icon[c.type]||'▣'}</span><span class="length">${len}格</span></div><strong>${textEscape(c.name)}</strong><div class="card-desc">${c.aoe?'<b class="group-badge">全体攻击</b> ':''}${textEscape(c.desc||'逐格生效')}</div><div class="phase-track" title="浅色前摇/主色生效/深色后摇">${Array.from({length:len},(_,i)=>`<span class="${i<c.w?'windup':i<c.w+c.a?'active':'recovery'}"></span>`).join('')}</div><small style="color:#92a9bd">${c.w} 前摇 · ${c.a} 生效 · ${c.r} 后摇 · 速度 ${c.speed}</small></button>`}).join(''):'<div class="empty-hand">手牌已空。选择「洗牌」并点击后续空格，消耗1格，锁定前面所有卡，再抽新手牌。</div>';}
function renderStatus(){const hero=game.actors[0];$('turnStatus').textContent=`第 ${game.round+1} 轮 · 游戏内 ${String(Math.floor(game.now/60)).padStart(2,'0')}:${String(game.now%60).padStart(2,'0')}—${String(Math.floor((game.now+10)/60)).padStart(2,'0')}:${String((game.now+10)%60).padStart(2,'0')}`;
$('phaseStatus').textContent=game.phase==='planning'?'规划阶段 · 世界暂停':game.phase==='win'?'已胜利 · 战斗结算':'已失败 · 战斗结束';$('hintStatus').textContent=placementMode==='card'?'选中卡牌，点目标上轨；给队友放技能只消耗施术者时间':placementMode==='shuffle'?'洗牌操作 → 选择空格':placementMode==='finisher'?'绝杀 → 放到敌人上轨时间格':placementMode==='move'?'移动选中动作 → 点新时间格':'选卡后点击目标轨道；血条直接显示当轮预计生命与承伤';
$('commitButton').disabled=!isPlanning();$('shuffleButton').disabled=!isPlanning();$('autoplanButton').disabled=!isPlanning();$('undoButton').disabled=!isPlanning();
$('runStatus').innerHTML=`<b>冒险第 ${run.stage+1}/${C.STAGES.length} 关</b><span>◈ 金币 ${run.gold}</span><span>▤ 牌组 ${C.cardCount(run)} 张</span><span>♢ 遗物 ${run.relics.length}/4</span><span>生命 ${run.hp}/${run.maxHp}</span><span>绝杀能量 ${hero.energy}/100</span>`;
$('heroStatus').innerHTML=`<div class="info-key"><span>当前生命</span><span>${hero.hp} / ${hero.maxHp}</span></div><div class="info-key"><span>绝杀能量</span><span>${hero.energy} / 100</span></div><div class="info-key"><span>抽牌堆 / 弃牌堆</span><span>${hero.draw.length} / ${hero.discard.length}</span></div><div class="info-key"><span>洗牌次数</span><span>${game.stats.shuffle}</span></div><div class="info-key"><span>已锁排程</span><span>${hero.actions.filter(a=>a.locked).length}张</span></div><div class="info-key"><span>跨轮占用</span><span>${hero.actions.filter(a=>!a.canceled&&a.start<game.now+10&&a.start+G.cLen(G.CARD[a.card])>game.now+10).length}项</span></div>`;
const fin=G.CARD[hero.fin],ready=hero.energy>=100 || (projection?.trace||[]).some(z=>z.actors.find(a=>a.id==='hero')?.energy>=100);$('finisherSlot').innerHTML=`<strong>◆ 独立绝杀槽 · ${fin.name}</strong><div class="meter"><div style="width:${hero.energy}%"></div></div><small>能量 ${hero.energy}/100 ｜目标生命≤55%或已标记/破防</small><button ${ready?'':'disabled'} class="${placementMode==='finisher'?'selected':''}">选中绝杀牌 · ${G.cLen(fin)}格（${fin.w}+${fin.a}+${fin.r}）</button>`;
}
function renderIntents(){let rows=[];for(const e of game.actors.filter(a=>a.side==='enemy')){if(e.dead)continue;const acts=e.actions.filter(a=>a.start>=game.now&&a.start<game.now+10&&!a.canceled);for(const a of acts){const c=G.CARD[a.card];rows.push(`<div class="enemy-intent"><strong>${textEscape(e.name)} · ${textEscape(c.name)}</strong><small>开始 T${a.start-game.now+1} → ${c.w}前摇 / ${c.a}作用 / ${c.r}后摇${c.damage?' · 每格'+c.damage+'伤害':''}${c.guard?' · 共'+c.guard+'防御':''} · 速度${c.speed}</small></div>`);}}$('enemyIntents').innerHTML=rows.join('')||'<p>此轮没有新行动；敌人可能正处于跨轮动作或失能恢复。</p>';}
function renderLog(records){const logs=records||game.events||[];const recent=logs.slice(-25);$('combatLog').innerHTML=recent.map(x=>`<div class="log-row ${x.kind}"><span class="tick">T${x.t-game.now+(game.round>0?10:0)}</span><span>${textEscape(x.text)}</span></div>`).join('')||'<p>等待战斗开始...</p>';}
function display(){
 projection=isPlanning()?G.simulateRound(game,{preview:true,collectTrace:true}):null;
 renderTimeline();renderHand();renderStatus();renderIntents();renderLog();renderForecast();
 const remove=$('removeActionButton');if(remove){remove.disabled=!selectedActionId;remove.textContent=selectedActionId?'✕ 取下选中动作':'✕ 取下动作';}
}
function renderForecast(){const el=$('forecastOutput');if(el)el.textContent='实时预演已显示于每个角色的血条。';}
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
