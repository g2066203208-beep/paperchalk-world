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
  if(!hud||typeof document==='undefined')throw Error('Timegrid battle needs a HUD');
  let seed=20261108,model=null,picked=null,moving=null,selectedTick=1,expanded=true;
  const holder=document.createElement('section');
  holder.className='ring-timegrid';holder.setAttribute('aria-label','正式时间步卡牌战斗');
  holder.innerHTML=[
   '<div class="tg-head"><strong>时间步 · 卡牌战斗</strong><span data-tg-phase></span>',
   '<button type="button" data-tg-toggle title="收起或展开规划时间轴">收起</button></div>',
   '<div data-tg-body><div class="tg-tools">',
   '<span data-tg-role></span><span class="tg-help" data-tg-help>选卡后点目标角色的时间格</span>',
   '<button type="button" data-tg-undo>取下</button><button type="button" data-tg-shuffle>洗牌</button>',
   '<button type="button" data-tg-finisher>绝杀</button>',
   '<button type="button" data-tg-auto>本角色自动</button><button type="button" data-tg-auto-all>全队自动</button>',
   '<button type="button" class="tg-execute" data-tg-execute>执行 10 格</button></div>',
   '<div class="tg-rail" data-tg-rail></div>',
   '<div class="tg-hand-label"><strong>当前角色手牌</strong><span data-tg-deck></span></div>',
   '<div class="tg-hand" data-tg-hand></div></div>',
   '<div class="tg-bottom"><span data-tg-info></span><button type="button" data-tg-restart hidden>重新战斗</button></div>',
   '<div class="tg-hit-layer" data-tg-hits aria-hidden="true"></div>'
  ].join('');
  hud.append(holder);
  const get=n=>holder.querySelector('[data-tg-'+n+']');
  const message=txt=>{get('help').textContent=txt;};
  function start(){
   model=createBattle(++seed);picked=null;moving=null;selectedTick=1;expanded=true;
   model.onChange(event=>{
    if(onTick)onTick(event,model);
    paint();
   });
   paint();
   return model;
  }
  function rollup(){
   holder.classList.toggle('is-folded',!expanded);
   get('toggle').textContent=expanded?'收起':'展开';
   get('toggle').setAttribute('aria-expanded',String(expanded));
  }
  function stampHp(actor,predicted){
   const max=Math.max(1,actor.maxHp),p=predicted?.hp??actor.hp;
   return '<span class="tg-hp">'+actor.hp+(p!==actor.hp?' → '+p:'')+'/'+max+'</span>'+
    '<span class="tg-hp-track"><i style="width:'+Math.max(0,Math.min(100,actor.hp/max*100))+
    '%"></i><b style="width:'+Math.max(0,Math.min(100,p/max*100))+'%"></b></span>';
  }
  function band(owner,action){
   const c=cardOf(action.card);if(!c)return '';
   const start=action.start-model.planningNow+1,length=G.cLen(c);
   if(start+length<=1||start>10||action.canceled)return '';
   const left=Math.max(0,start-1),cut=Math.max(0,1-start),lengthHere=Math.min(length-cut,10-left);
   const movable=owner.id===model.controlled().id&&!action.locked&&!model.playback;
   const active=moving===action.id,style='left:'+(left*10)+'%;width:'+(Math.max(0,lengthHere)*10)+'%;';
   const parts=[
    {n:c.w,color:'windup',title:'前摇'},
    {n:c.a,color:'active',title:'生效'},
    {n:c.r,color:'recovery',title:'后摇'}
   ];
   let offset=0,segments='';
   for(const part of parts){
    const a=Math.max(offset,cut),b=Math.min(offset+part.n,cut+lengthHere);
    if(b>a)segments+='<i class="tg-segment '+part.color+'" style="left:'+
      ((a-cut)/lengthHere*100)+'%;width:'+((b-a)/lengthHere*100)+'%"></i>';
    offset+=part.n;
   }
   return '<button type="button" class="tg-band tg-type-'+c.type+(active?' selected':'')+
    (action.locked?' locked':'')+'" data-tg-action="'+escape(action.id)+'"'+
    (movable?'':' disabled')+' style="'+style+'" title="'+escape(c.name+' · '+(action.target||'')+
    ' · '+c.w+'/'+c.a+'/'+c.r)+'">'+segments+
    '<span>'+escape(c.name)+'</span></button>';
  }
  function paint(){
   if(!model)return;
   rollup();
   const game=model.game,playing=model.playback;
   const selected=model.controlled(),projected=playing?{actors:model.shown}:model.preview();
   const predicted=new Map(projected.actors.map(a=>[a.id,a]));
   const shown=new Map(model.shown.map(a=>[a.id,a]));
   get('phase').textContent=playing?'第 '+(game.round)+' 轮 · 时间推进 '+model.progress+'/10':
    game.phase==='planning'?'第 '+(game.round+1)+' 轮 · 10 时间格':
    game.phase==='win'?'胜利 · '+(game.score?.rank||''):'战斗失败';
   const className=selected.name.split('·').pop();
   get('role').textContent='操控：'+selected.name;
   get('deck').textContent='抽牌 '+selected.draw.length+' · 弃牌 '+selected.discard.length+
    ' · 能量 '+selected.energy+'/100';
   get('info').textContent=playing?'同步执行中 · 双方逐格结算':
    game.phase==='planning'?'选卡 → 点击目标对应时间格；切换 1–4 规划队友':
    game.phase==='win'?'胜利 · 评分 '+(game.score?.rank||'')+' · '+(game.score?.points||0)+' 分':
    '本场已结束';
   const timeline=['<div class="tg-ticks"><span>目标 / 自身行动</span>'];
   for(let t=1;t<=10;t++)timeline.push('<span'+(selectedTick===t?' class="active"':'')+'>'+t+'</span>');
   timeline.push('</div>');
   for(const actor of game.actors){
    const ui=shown.get(actor.id)||actor,pre=predicted.get(actor.id)||actor;
    const live={...actor,hp:ui.hp};
    const mine=actor.id===selected.id,dead=!!ui.dead;
    timeline.push('<div class="tg-row '+(actor.side==='enemy'?'enemy':'ally')+
     (mine?' current':'')+(dead?' dead':'')+'"><div class="tg-unit"><b>'+
     escape(actor.name.replace(/ · .*/,''))+'</b>'+stampHp(live,pre)+'</div><div class="tg-track">');
    for(let t=1;t<=10;t++)timeline.push('<button type="button" class="tg-cell" data-tg-target="'+
     escape(displayId(actor.id))+'" data-tg-tick="'+t+'" title="'+escape(actor.name+' · 第'+t+'格')+
     '" '+(game.phase!=='planning'||playing||dead?'disabled':'')+'></button>');
    timeline.push('<div class="tg-bands">');
    const actions=playing?model.planningActions.filter(a=>a.actorId===actor.id):actor.actions;
    for(const action of actions)timeline.push(band(actor,action));
    timeline.push('</div></div></div>');
   }
   get('rail').innerHTML=timeline.join('');
   const hand=(playing?[]:selected.hand).map(item=>{
    const card=cardOf(item.key),chosen=picked===item.uid;
    const nums=[card.w,card.a,card.r].join('/');
    const sub=card.damage?'每次 '+card.damage+'伤害':card.guard?'防御池 '+card.guard:
     card.heal?'回复 '+card.heal:card.mark?'标记 '+card.mark:
     card.steady?'减硬直 '+card.steady:TYPE_NAMES[card.type]||'';
    return '<button class="tg-card tg-type-'+escape(card.type)+(chosen?' selected':'')+
     '" type="button" data-tg-card="'+escape(item.uid)+'"'+
     (playing||game.phase!=='planning'||selected.dead?' disabled':'')+'><strong>'+
     escape(card.name)+'</strong><small>'+escape(sub)+' · '+nums+'</small></button>';
   });
   get('hand').innerHTML=hand.length?hand.join(''):'<span class="tg-empty">'+
    (playing?'10 格执行中 · 同步判定双方的动作':'本角色暂无手牌，换手或等下轮补牌')+'</span>';
   for(const name of ['undo','shuffle','finisher','auto','auto-all','execute']){
    get(name).disabled=playing||game.phase!=='planning';
   }
   get('undo').disabled=get('undo').disabled||!moving;
   get('finisher').title='能量100且目标已标记/破防或生命低于55%，需选敌人轨';
   get('restart').hidden=playing||!['win','lost'].includes(game.phase);
   holder.dataset.phase=playing?'resolving':game.phase;
  }
  function run(action){
   try{const value=action();paint();return value;}
   catch(err){message(err?.message||String(err));paint();return false;}
  }
  function selectRole(index){
   if(!model||model.playback)return false;
   const changed=model.setRole(index);if(changed){picked=null;moving=null;message('选卡后点击目标轨道的时间格');paint();}
   return !!changed;
  }
  holder.addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b||!holder.contains(b))return;
   e.stopPropagation();e.preventDefault();
   if(b.hasAttribute('data-tg-toggle')){expanded=!expanded;paint();return;}
   if(b.hasAttribute('data-tg-restart')){start();return;}
   if(model.playback)return;
   if(b.hasAttribute('data-tg-card')){
    picked=picked===b.dataset.tgCard?null:b.dataset.tgCard;
    moving=null;message(picked?'选择目标角色的第 1–10 时间格':'选卡后点击目标时间格');paint();return;
   }
   if(b.hasAttribute('data-tg-action')){
    moving=moving===b.dataset.tgAction?null:b.dataset.tgAction;
    picked=null;message(moving?'点击新时间格移动；或点击取下':'选牌后点时间格');paint();return;
   }
   if(b.hasAttribute('data-tg-target')){
    selectedTick=Number(b.dataset.tgTick);
    const dest=b.dataset.tgTarget;
    run(()=>{
     if(picked){model.schedule(picked,selectedTick,dest);picked=null;}
     else if(moving){model.move(moving,selectedTick,dest);moving=null;}
     else {message('请选择手牌或已排好的动作');return;}
     message('已放入时间轴，可以继续规划或执行');
    });return;
   }
   if(b.hasAttribute('data-tg-undo')){run(()=>{model.undo(moving);moving=null;});return;}
   if(b.hasAttribute('data-tg-shuffle')){run(()=>model.shuffle(selectedTick));return;}
   if(b.hasAttribute('data-tg-finisher')){picked='__finisher__';moving=null;message('点击敌人轨的指定时间格发动绝杀');paint();return;}
   if(b.hasAttribute('data-tg-auto')){run(()=>model.autoplan(false));return;}
   if(b.hasAttribute('data-tg-auto-all')){run(()=>model.autoplan(true));return;}
   if(b.hasAttribute('data-tg-execute')){run(()=>{picked=null;moving=null;expanded=false;model.execute();});}
  });
  // Finisher is an independent slot and is never part of the shuffled hand.
  function handleFinisherClick(e){const b=e.target.closest('[data-tg-target]');if(!b||picked!=='__finisher__')return;
   e.preventDefault();e.stopImmediatePropagation();
   selectedTick=Number(b.dataset.tgTick);
   run(()=>{model.finisher(selectedTick,b.dataset.tgTarget);picked=null;message('绝杀已放入行动时间轴');});
  }
  holder.addEventListener('click',handleFinisherClick,true);
  start();
  return {get model(){return model;},element:holder,selectRole,reset:start,
   advance(dt){return model?.advance(dt)||null;},
   visual(id){if(!model)return null;return model.shown.find(a=>a.id===gameId(id))||null;},
   active(){return !!model&&!model.playback&&model.game.phase==='planning';},
   inspect(){return model?{phase:model.playback?'resolving':model.game.phase,
    round:model.game.round,progress:model.progress,controlledId:model.game.controlledId,
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