/* 3D Ring Arena × canonical ten-tick card engine. No duplicated combat arithmetic. */
(function(root,factory){
 const api=factory(root.Timegrid);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.PaperWorldRingTimegrid=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(G){
 'use strict';
 const ROLE_IDS=['hero','ai-gun','ai-guard','ai-mage'];
 const ARENA_IDS=['hero','ally-2','ally-3','ally-4'];
 const TYPE_NAMES={attack:'攻击',defense:'防御',skill:'技能',power:'能力',finisher:'绝杀',system:'重整'};
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cardOf=key=>G.CARD[key];
 const friendly=c=>c.type==='defense'||!!c.heal||!!c.buff||!!c.steady;
 const displayId=id=>{
  const i=ROLE_IDS.indexOf(id);
  if(i>=0)return ARENA_IDS[i];
  if(id&&id.startsWith('enemy-')){const n=Number(id.slice(-1));return Number.isInteger(n)&&n>=1&&n<=4?'enemy-'+n:id;}
  return null;
 };
 const gameId=id=>{
  const i=ARENA_IDS.indexOf(id);
  if(i>=0)return ROLE_IDS[i];
  if(id&&/^enemy-[1-4]$/.test(id))return 'enemy-s'+id.slice(-1);
  return id;
 };
 function createBattle(seed=20261108){
  if(!G?.create||!G?.setControlled)throw Error('Timegrid four-player engine missing');
  const game=G.create({classId:'axe',styleId:'strike',team:true,
   controlAllies:true,encounterId:'surround',campaignBalance:false,seed});
  if(game.actors.length!==8||game.actors.filter(a=>a.side==='ally').length!==4
     ||game.actors.filter(a=>a.side==='enemy').length!==4)
   throw Error('Timegrid 3D ring requires exactly four combatants per team');
  let replay=null,shown=game.actors.map(a=>({id:a.id,hp:a.hp,energy:a.energy,dead:a.dead,
   poise:a.poise,maxHp:a.maxHp,poiseMax:a.poiseMax})),listener=()=>{};
  function controlled(){return G.player(game);}
  function setRole(index){
   if(replay)return false;
   if(!Number.isInteger(index)||index<1||index>4)return false;
   G.setControlled(game,ROLE_IDS[index-1]);return controlled();
  }
  function schedule(uid,tick,dest){return G.place(game,uid,tick,gameId(dest));}
  function move(id,tick,dest){return G.moveAction(game,id,tick,gameId(dest));}
  function undo(id){return G.remove(game,id);}
  function shuffle(tick){return G.shuffleHand(game,tick);}
  function finisher(tick,dest){return G.placeFinisher(game,tick,gameId(dest));}
  function autoplan(all=false){
   if(game.phase!=='planning'||replay)return false;
   const original=game.controlledId;
   if(all)for(const role of ROLE_IDS){G.setControlled(game,role);G.autoPlan(game,'tactical');}
   else G.autoPlan(game,'tactical');
   G.setControlled(game,original);return true;
  }
  function preview(){return game.phase==='planning'&&!replay?
   G.simulateRound(game,{preview:true}):game;}
  function execute(){
   if(game.phase!=='planning'||replay)return false;
   const previous=game.actors.map(a=>({id:a.id,hp:a.hp,energy:a.energy,dead:a.dead,
    poise:a.poise,maxHp:a.maxHp,poiseMax:a.poiseMax}));
   const actions=game.actors.flatMap(a=>a.actions.filter(x=>!x.canceled)
    .map(x=>({actorId:a.id,...x})));
   const round=game.round;
   G.simulateRound(game,{collectTrace:true});
   const trace=(game.trace||[]).map(t=>({...t,actors:t.actors.map(a=>({...a})),
    events:t.events.map(e=>({...e}))}));
   if(!trace.length){listener({done:true,round,actors:previous});return false;}
   replay={index:-1,elapsed:0,previous,actions,trace,round};
   shown=previous;
   listener({start:true,round,actors:shown});
   return true;
  }
  function advance(dt=0){
   if(!replay)return null;
   replay.elapsed+=Math.max(0,Math.min(.15,Number(dt)||0));
   if(replay.elapsed<.52)return null;
   replay.elapsed-=.52;
   const p=replay;
   p.index++;
   if(p.index>=p.trace.length){
    shown=game.actors.map(a=>({id:a.id,hp:a.hp,energy:a.energy,dead:a.dead,
     poise:a.poise,maxHp:a.maxHp,poiseMax:a.poiseMax}));
    replay=null;const result={done:true,round:p.round,actors:shown};
    listener(result);return result;
   }
   const tick=p.trace[p.index],old=new Map(shown.map(a=>[a.id,a]));
   shown=tick.actors;
   const changes=shown.map(a=>({id:a.id,visualId:displayId(a.id),
    deltaHp:a.hp-(old.get(a.id)?.hp??a.hp),dead:a.dead})).filter(a=>a.deltaHp||a.dead&&!(old.get(a.id)?.dead));
   const activeActions=p.actions.filter(a=>{
    const card=cardOf(a.card);
    return card&&!a.canceled&&G.phase(card,a.start,tick.tick-1)==='active';
   }).map(a=>({...a,visualId:displayId(a.actorId),
    targetVisualId:displayId(a.target)}));
   const event={tick:tick.tick,tickInRound:tick.tick-p.round*G.ROUND,round:p.round,
    actors:shown,changes,activeActions,events:tick.events};
   listener(event);return event;
  }
  const api={game,controlled,setRole,schedule,move,undo,shuffle,finisher,
   autoplan,preview,execute,advance,displayId,gameId,
   onChange(fn){listener=typeof fn==='function'?fn:()=>{};},
   get playback(){return !!replay;},get shown(){return shown;},
   get planningNow(){return replay?replay.round*G.ROUND:game.now;},
   get planningActions(){return replay?replay.actions:null;},
   get progress(){return replay?replay.index+1:0}};
  return api;
 }
 function mount({hud,onTick,onRole}={}){
  if(!hud||typeof document==='undefined')throw Error('Timegrid HUD requires a battle stage');
  const holder=document.createElement('section');
  holder.className='ring-timegrid';
  holder.setAttribute('aria-label','战斗常驻角色头像及生命值');
  // This is the ONLY always-visible game HUD: 4 foe portraits + 4
  // party portraits, each with real engine HP. NO permanent card grid,
  // command window, timeline ruler, hand, or tinted full-height panel.
  holder.innerHTML='<div data-tg-roster class="tg-roster"></div>';
  const tray=document.createElement('section');
  tray.className='tg-tactics';
  tray.hidden=true;tray.setAttribute('aria-label','临时战术操作');
  tray.innerHTML=[
   '<div class="tg-tactic-head"><strong data-tg-role></strong><span data-tg-phase></span>',
   '<button type="button" data-tg-close aria-label="关闭临时出牌操作">×</button></div>',
   '<div class="tg-target-line" data-tg-targets></div>',
   '<div class="tg-cards" data-tg-hand></div>',
   '<div class="tg-tick-caption">选择出牌时间格 · 前摇 / 生效 / 后摇由 V1.7 引擎结算</div>',
   '<div class="tg-ticks" data-tg-ticks></div>',
   '<div class="tg-tactic-foot"><span data-tg-hint></span>',
   '<button type="button" data-tg-undo>撤销</button>',
   '<button type="button" data-tg-auto-all>辅助排程</button>',
   '<button type="button" class="tg-commit" data-tg-execute>执行</button></div>'
  ].join('');
  hud.append(holder,tray);
  const hitLayer=document.createElement('div');
  hitLayer.dataset.tgHits='';hitLayer.className='tg-hit-layer';
  hitLayer.setAttribute('aria-hidden','true');hud.append(hitLayer);
  const get=name=>tray.querySelector('[data-tg-'+name+']');
  const roleName=id=>({hero:'斧卫','ai-gun':'枪手','ai-guard':'守护','ai-mage':'调律'}[id]||'敌方');
  const art=actor=>actor.side==='enemy'?
   './assets/characters/char-002/front.png':'./assets/characters/protagonist-front.webp';
  let seed=20261108,model=null,target='enemy-1',cardUid=null,selectedTick=1,tip='';
  function notify(message){tip=String(message);get('hint').textContent=tip;}
  function hpBar(actual){
   const max=Math.max(1,actual.maxHp||1),hp=Math.max(0,Number(actual.hp)||0);
   return '<div class="tg-health"><span class="tg-hp-value">'+hp+
    '<small>/'+max+'</small></span><span class="tg-hp-bar" role="progressbar" '+
    'aria-label="生命值" aria-valuemin="0" aria-valuemax="'+max+
    '" aria-valuenow="'+hp+'"><i style="width:'+
    Math.min(100,hp/max*100)+'%"></i></span></div>';
  }
  function paintRoster(){
   const state=new Map(model.shown.map(a=>[a.id,a]));
   const game=model.game,rows=[];
   for(const side of ['enemy','ally']){
    rows.push('<div class="tg-faction '+side+'">'+(side==='enemy'?'敌方':'我方')+'</div>');
    for(const actor of game.actors.filter(a=>a.side===side)){
     const a={...actor,...state.get(actor.id)},dead=!!a.dead,
      slot=displayId(actor.id),mine=actor.id===model.controlled().id;
     const id=ROLE_IDS.indexOf(actor.id)+1;
     const label=side==='enemy'?'敌人 '+slot.slice(-1):roleName(actor.id);
     rows.push('<div class="tg-row '+side+(mine?' current':'')+(dead?' dead':'')+
      '" data-tg-row="'+slot+'">'+
      '<button type="button" class="tg-portrait" '+
      (side==='ally'?'data-tg-choose-role="'+id+'"':'data-tg-open-target="'+slot+'"')+
      ' aria-label="'+(side==='ally'?'切换到':'选择')+escape(label)+'"'+
      (model.playback?' disabled':'')+'><img alt="" draggable="false" src="'+art(actor)+
      '"></button><div class="tg-identity"><strong>'+escape(label)+
      '</strong>'+hpBar(a)+'</div></div>');
    }
   }
   holder.querySelector('[data-tg-roster]').innerHTML=rows.join('');
   holder.dataset.layout='persistent-portraits-hp-only';
   holder.dataset.timegridVersion='1.7';
  }
  function paintTactics(){
   if(tray.hidden)return;
   const game=model.game,actor=model.controlled();
   get('role').textContent=roleName(actor.id)+' · '+actor.name;
   get('phase').textContent=model.playback?'行动 '+model.progress+'/10':
    '第 '+(game.round+1)+' 轮';
   get('targets').innerHTML=game.actors.map(a=>'<button type="button" '+
    'data-tg-target-pick="'+escape(displayId(a.id))+'" class="'+
    (target===displayId(a.id)?'selected':'')+'"'+(a.dead?' disabled':'')+'>'+
    escape(a.side==='ally'?roleName(a.id):'敌'+displayId(a.id).slice(-1))+'</button>').join('');
   get('hand').innerHTML=actor.hand.map(item=>{
    const c=cardOf(item.key);
    if(!c)return '';
    return '<button type="button" data-tg-card="'+escape(item.uid)+'" '+
     (cardUid===item.uid?'class="selected" ':'')+
     (model.playback||game.phase!=='planning'?'disabled ':'')+
     'title="'+escape(c.desc||c.name)+'"><strong>'+escape(c.name)+
     '</strong><small>'+c.w+' / '+c.a+' / '+c.r+
     (c.damage?' · '+c.damage+'伤害':c.guard?' · '+c.guard+'防御':'')+
     '</small></button>';
   }).join('')||'<span class="tg-empty">没有手牌，等待下一轮补牌</span>';
   get('ticks').innerHTML=Array.from({length:10},(_,i)=>
    '<button type="button" data-tg-tick="'+(i+1)+'" '+
    (selectedTick===i+1?'class="selected" ':'')+
    (model.playback||game.phase!=='planning'?'disabled':'')+
    '>'+(i+1)+'</button>').join('');
   get('hint').textContent=tip;
   for(const n of ['undo','auto-all','execute']){
    get(n).disabled=model.playback||game.phase!=='planning';
   }
  }
  function paint(){if(!model)return;paintRoster();paintTactics();}
  function start(){
   model=createBattle(++seed);target='enemy-1';cardUid=null;selectedTick=1;
   tray.hidden=true;hitLayer.replaceChildren();
   model.onChange(e=>{if(onTick)onTick(e,model);paint();});
   tip='选择手牌，再点开始时间格';paint();return model;
  }
  function selectRole(index){
   if(!model||model.playback)return false;
   const result=model.setRole(index);
   if(result){
    cardUid=null;
    notify('当前：'+roleName(result.id)+'。点击敌人头像选择目标，按 T 开关出牌');
    paint();
   }
   return !!result;
  }
  function openTactics(choice){
   if(!model||model.playback||model.game.phase!=='planning')return false;
   if(choice)target=choice;
   tray.hidden=false;cardUid=null;notify('选择手牌与时间格；完成后关闭，头像与血量依然常驻');
   paint();return true;
  }
  function action(fn){try{const r=fn();paint();return r;}catch(err){
   notify(err?.message||String(err));paint();return false;
  }}
  holder.addEventListener('click',e=>{
   const button=e.target.closest('button');if(!button)return;
   if(button.hasAttribute('data-tg-choose-role')){
    const i=Number(button.dataset.tgChooseRole);
    if(onRole)onRole(i);else selectRole(i);
   }else if(button.hasAttribute('data-tg-open-target'))openTactics(button.dataset.tgOpenTarget);
  });
  tray.addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b||!tray.contains(b))return;
   e.stopPropagation();
   if(b.hasAttribute('data-tg-close')){tray.hidden=true;return;}
   if(model.playback||model.game.phase!=='planning')return;
   if(b.hasAttribute('data-tg-target-pick')){target=b.dataset.tgTargetPick;paint();return;}
   if(b.hasAttribute('data-tg-card')){cardUid=b.dataset.tgCard;paint();return;}
   if(b.hasAttribute('data-tg-tick')){
    selectedTick=Number(b.dataset.tgTick);
    action(()=>{
     if(!cardUid){notify('请先选择一张手牌');return;}
     model.schedule(cardUid,selectedTick,target);cardUid=null;
     notify('已在第 '+selectedTick+' 格放牌');
    });return;
   }
   if(b.hasAttribute('data-tg-undo')){action(()=>{
    const actor=model.controlled();
    const last=actor.actions.filter(a=>!a.locked&&!a.canceled).sort((a,b)=>b.start-a.start)[0];
    if(!last)throw Error('当前角色没有可撤销动作');
    model.undo(last.id);notify('已撤回最后一张牌');
   });return;}
   if(b.hasAttribute('data-tg-auto-all')){action(()=>{
    model.autoplan(true);notify('已安排四名队友，可以直接执行或继续调整');
   });return;}
   if(b.hasAttribute('data-tg-execute')){action(()=>{
    cardUid=null;tray.hidden=true;model.execute();
   });}
  });
  const keyHandler=e=>{
   if(hud.hidden||!hud.isConnected||e.repeat||e.altKey||e.ctrlKey||e.metaKey)return;
   if(/input|textarea|select/i.test(e.target?.tagName||''))return;
   if(e.key?.toLowerCase()==='t'){
    e.preventDefault();
    if(tray.hidden)openTactics();else tray.hidden=true;
   }else if(e.key==='Escape'&&!tray.hidden){e.preventDefault();tray.hidden=true;}
  };
  document.addEventListener('keydown',keyHandler);
  start();
  return {
   get model(){return model;},element:holder,selectRole,reset:start,
   advance(dt){return model?.advance(dt)||null;},
   visual(id){return model?.shown.find(a=>a.id===gameId(id))||null;},
   active(){return !!model&&!model.playback&&model.game.phase==='planning';},
   inspect(){return model?{phase:model.playback?'resolving':model.game.phase,
    round:model.game.round,progress:model.progress,controlledId:model.game.controlledId,
    ui:holder.dataset.layout,version:holder.dataset.timegridVersion,
    tacticsOpen:!tray.hidden,
    roles:ROLE_IDS.map((id,i)=>({gameId:id,arenaId:ARENA_IDS[i],
     hp:model.game.actors.find(a=>a.id===id)?.hp,
     hand:model.game.actors.find(a=>a.id===id)?.hand.length,
     planned:model.game.actors.find(a=>a.id===id)?.actions.length})),
    enemies:model.game.actors.filter(a=>a.side==='enemy').map(a=>({id:a.id,
     arenaId:displayId(a.id),hp:a.hp,dead:a.dead})),
    projectedHp:model.preview().actors.map(a=>({id:a.id,hp:a.hp})),
    timelineTicks:G.ROUND}:null;}
  };
 }
 return Object.freeze({createBattle,mount,displayId,gameId,ROLE_IDS,ARENA_IDS,friendly});
});