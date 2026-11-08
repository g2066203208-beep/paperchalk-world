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
  let seed=20261108,model=null,picked=null,moving=null,mode=null,selectedTick=1,expanded=true;
  let feedback='选手牌 → 点右侧目标的时间格。点击我方头像可切换镜头和牌组。';
  const holder=document.createElement('section');
  holder.className='ring-timegrid';
  holder.setAttribute('aria-label','右侧四对四人物头像与时间步卡牌指挥面板');
  holder.innerHTML=[
   '<div class="tg-head"><div class="tg-brand"><span class="tg-sigil">◈</span>',
   '<div><strong>时序作战</strong><small>TIMEGRID / V1.7</small></div></div>',
   '<span data-tg-phase class="tg-phase"></span>',
   '<button type="button" data-tg-toggle aria-expanded="true">收起 ⌃</button></div>',
   '<div class="tg-body" data-tg-body>',
   '<div class="tg-threat" data-tg-threat></div>',
   '<div class="tg-command"><span data-tg-role></span><small data-tg-deck></small>',
   '<div class="tg-tools">',
   '<button type="button" data-tg-undo title="撤销当前选中的已安排卡牌">撤销</button>',
   '<button type="button" data-tg-shuffle title="空手1格、非空手2格；洗牌只锁已排动作">洗牌</button>',
   '<button type="button" data-tg-finisher title="独立绝杀槽，需能量100与发动条件">绝杀</button>',
   '<button type="button" data-tg-auto title="为当前角色辅助排程">辅助</button>',
   '<button type="button" data-tg-auto-all title="为四名角色分别辅助排程">全队</button></div></div>',
   '<div class="tg-rail" data-tg-rail></div>',
   '<div class="tg-hand-label"><strong>当前角色手牌</strong><span data-tg-handcount></span></div>',
   '<div class="tg-hand" data-tg-hand></div>',
   '<div class="tg-bottom"><span data-tg-help aria-live="polite"></span>',
   '<button type="button" class="tg-execute" data-tg-execute>执行 10 格 →</button>',
   '<button type="button" data-tg-restart hidden>重开</button></div>',
   '</div><div class="tg-compact" data-tg-compact hidden></div>',
   '<div class="tg-hit-layer" data-tg-hits aria-hidden="true"></div>'
  ].join('');
  hud.append(holder);
  const get=n=>holder.querySelector('[data-tg-'+n+']');
  const note=s=>{feedback=String(s);get('help').textContent=feedback;};
  const roleName=id=>({hero:'斧卫','ai-gun':'枪手','ai-guard':'守护','ai-mage':'调律'}[id]||'敌方');
  const imgSrc=actor=>actor.side==='enemy'?
   './assets/characters/enemy-suit-hit-no-hud.webp':'./assets/characters/protagonist-front.webp';
  const describe=c=>{
   if(c.aoe)return '全体 · '+(c.damage||0)+'×'+c.a;
   if(c.damage)return '伤害 '+c.damage+(c.a>1?'×'+c.a:'');
   if(c.guard)return '格挡 '+c.guard;
   if(c.heal)return '治疗 '+c.heal;
   if(c.steady)return '稳定 '+c.steady;
   if(c.mark)return '标记 '+c.mark;
   return TYPE_NAMES[c.type]||'行动';
  };
  function start(){
   model=createBattle(++seed);picked=null;moving=null;mode=null;expanded=true;selectedTick=1;
   model.onChange(e=>{if(onTick)onTick(e,model);paint();});
   feedback='选手牌 → 点击目标的时间格；点头像切换角色。';
   paint();return model;
  }
  function setExpanded(open){
   expanded=open;holder.classList.toggle('is-folded',!open);
   get('toggle').textContent=open?'收起 ⌃':'展开 ⌄';
   get('toggle').setAttribute('aria-expanded',String(open));
   get('compact').hidden=open;get('body').hidden=!open;
  }
  function hp(actor,pred){
   const max=Math.max(1,actor.maxHp),estimate=pred?.hp??actor.hp;
   return '<span class="tg-hp">'+actor.hp+
    (estimate!==actor.hp?'<em class="'+(estimate<actor.hp?'danger':'heal')+'"> → '+estimate+'</em>':'')+
    '<small>/'+max+'</small></span><span class="tg-hp-track"><i style="width:'+
    Math.max(0,actor.hp/max*100)+'%"></i><b style="width:'+
    Math.max(0,estimate/max*100)+'%"></b></span>';
  }
  function band(action,interactive){
   const c=cardOf(action.card);if(!c||action.canceled)return '';
   const start=action.start-model.planningNow+1,len=G.cLen(c);
   if(start+len<=1||start>10)return '';
   const left=Math.max(0,start-1),cut=Math.max(0,1-start);
   const shown=Math.min(len-cut,10-left);if(shown<=0)return '';
   let offset=0,segments='';
   for(const [color,duration]of [['windup',c.w],['active',c.a],['recovery',c.r]]){
    const a=Math.max(offset,cut),b=Math.min(offset+duration,cut+shown);
    if(b>a)segments+='<i class="tg-segment '+color+'" style="left:'+
     ((a-cut)/shown*100)+'%;width:'+((b-a)/shown*100)+'%"></i>';
    offset+=duration;
   }
   const editable=interactive&&!model.playback&&!action.locked;
   return '<button type="button" class="tg-band tg-type-'+escape(c.type)+
    (moving===action.id?' selected':'')+(action.locked?' locked':'')+
    '" style="left:'+(left*10)+'%;width:'+(shown*10)+'%;" title="'+
    escape(c.name+' · '+describe(c)+' · 前'+c.w+'生效'+c.a+'后'+c.r)+'" '+
    (editable?'data-tg-action="'+escape(action.id)+'" draggable="true"':'disabled')+
    '>'+segments+'<span>'+escape(c.name)+'</span></button>';
  }
  function threats(){
   const game=model.game,allies=game.actors.filter(a=>a.side==='ally'&&!a.dead);
   const found=new Map();
   for(const enemy of game.actors.filter(a=>a.side==='enemy'&&!a.dead)){
    for(const action of enemy.actions.filter(a=>!a.canceled)){
     const c=cardOf(action.card);if(!c?.damage)continue;
     for(let t=action.start+c.w;t<action.start+c.w+c.a;t++){
      const relative=t-game.now+1;if(relative<1||relative>10)continue;
      const targets=c.aoe?allies:allies.filter(a=>a.id===action.target);
      for(const target of targets){
       const key=target.id+':'+relative;
       const prior=found.get(key);
       if(prior)prior.damage+=c.damage;
       else found.set(key,{id:target.id,tick:relative,damage:c.damage,source:enemy.name});
      }
     }
    }
   }
   return [...found.values()].sort((a,b)=>a.tick-b.tick||b.damage-a.damage);
  }
  function quickGuard(id,tick){
   const a=model.controlled(),hand=a.hand.filter(h=>cardOf(h.key)?.type==='defense')
    .sort((x,y)=>Number(y.uid===picked)-Number(x.uid===picked));
   if(!hand.length)throw Error('当前角色没有防御手牌，可切换其他队友');
   for(const item of hand){
    const c=cardOf(item.key);
    for(let t=1;t<=10;t++){
     if(t+c.w>tick||t+c.w+c.a<=tick)continue;
     try{
      model.schedule(item.uid,t,displayId(id));picked=null;moving=null;mode=null;selectedTick=t;
      note('已自动为 '+roleName(id)+' 排防，覆盖 T'+tick+'；占用施术者自己的时间');
      return true;
     }catch(_){}
    }
   }
   throw Error('没有可覆盖 T'+tick+' 的空闲时间格');
  }
  function paint(){
   if(!model)return;
   setExpanded(expanded);
   const game=model.game,playing=model.playback,selected=model.controlled();
   const projected=new Map((playing?model.shown:model.preview().actors).map(a=>[a.id,a]));
   const shown=new Map(model.shown.map(a=>[a.id,a]));
   const danger=playing?[]:threats();
   const affected=new Set(danger.map(t=>t.id+':'+t.tick));
   get('phase').textContent=playing?'第'+game.round+'轮 T'+model.progress+'/10':
    game.phase==='planning'?'第'+(game.round+1)+'轮 · 10格':
    game.phase==='win'?'胜利 '+(game.score?.rank||''):'失败';
   get('role').textContent='操控 '+roleName(selected.id)+' · '+selected.name;
   get('deck').textContent='抽 '+selected.draw.length+' / 弃 '+selected.discard.length+
    ' / 绝杀 '+selected.energy+'/100';
   get('compact').textContent=roleName(selected.id)+' · 第'+(game.round+1)+'轮 · 点击上方展开';
   get('threat').innerHTML=danger.length?
    '<strong>受击预告</strong>'+danger.slice(0,2).map(t=>
     '<button type="button" class="tg-danger-chip" data-tg-cover="'+escape(t.id)+
     '" data-tg-cover-tick="'+t.tick+'" title="敌人预计伤害；点击自动给目标安排防御">'+
     '<span>T'+t.tick+'</span> '+escape(roleName(t.id))+' <em>−'+t.damage+'</em><b>援护</b></button>').join('')+
     (danger.length>2?'<small>+'+(danger.length-2)+'</small>':''):
    '<strong>战况</strong><span class="tg-quiet">本轮暂无预告攻击</span>';
   const playerActs=playing?
    model.planningActions.filter(a=>a.actorId===selected.id):selected.actions;
   const selectedCard=selected.hand.find(a=>a.uid===picked);
   const selectedType=selectedCard?cardOf(selectedCard.key):null;
   const targetsAllies=mode==='shuffle'||(selectedType&&friendly(selectedType));
   const targetsFoes=mode==='finisher'||(selectedType&&!friendly(selectedType));
   const activeTargeting=!!(mode||selectedType||moving);
   const rail=['<div class="tg-ticks"><span>目标 / 自身行动</span>'];
   for(let t=1;t<=10;t++)rail.push('<span'+((playing?model.progress:selectedTick)===t?
    ' class="active"':'')+'>'+t+'</span>');
   rail.push('</div>');
   for(const actor of game.actors){
    const current=shown.get(actor.id)||actor,forecast=projected.get(actor.id)||actor;
    const enemy=actor.side==='enemy',mine=actor.id===selected.id,dead=!!current.dead;
    const index=ROLE_IDS.indexOf(actor.id)+1,portrait=imgSrc(actor);
    const eligible=!activeTargeting||moving||targetsAllies&&!enemy||
     targetsFoes&&enemy;
    rail.push('<div class="tg-row '+(enemy?'enemy':'ally')+
     (mine?' current':'')+(dead?' dead':'')+
     (activeTargeting?(eligible?' tg-eligible':' tg-ineligible'):'')+
     '" data-tg-row="'+escape(displayId(actor.id))+
     '"><div class="tg-unit">'+
     (!enemy?'<button type="button" class="tg-portrait" data-tg-choose-role="'+index+
      '" aria-label="切换'+escape(roleName(actor.id))+'的镜头与手牌">':
      '<span class="tg-portrait">')+
     '<img alt="" loading="eager" draggable="false" src="'+portrait+'">'+
     (!enemy?'</button>':'</span>')+
     '<div class="tg-identity"><b>'+escape(enemy?actor.name:roleName(actor.id))+
     '</b>'+hp({...actor,hp:current.hp},forecast)+'</div></div>'+
     '<div class="tg-dual"><div class="tg-target-track">');
    for(let t=1;t<=10;t++)rail.push('<button type="button" class="tg-cell'+
     (affected.has(actor.id+':'+t)?' danger':'')+
     (selectedTick===t?' chosen':'')+
     '" data-tg-target="'+escape(displayId(actor.id))+'" data-tg-tick="'+t+
     '" title="'+escape(actor.name)+' · 第'+t+'格'+
     (affected.has(actor.id+':'+t)?' · 预定受击':'')+'"'+
     (playing||game.phase!=='planning'||dead?' disabled':'')+'></button>');
    rail.push('<div class="tg-bands">'+playerActs.filter(a=>a.target===actor.id)
     .map(a=>band(a,true)).join('')+'</div></div>'+
     '<div class="tg-own-track" title="此角色自己的行动（只读）"><div class="tg-bands">');
    const own=playing?model.planningActions.filter(a=>a.actorId===actor.id):actor.actions;
    rail.push(own.map(a=>band(a,false)).join('')+'</div></div></div></div>');
   }
   get('rail').innerHTML=rail.join('');
   const cards=(playing?[]:selected.hand).map(item=>{
    const c=cardOf(item.key);if(!c)return '';
    const rarity=c.rarity||'common',chosen=picked===item.uid;
    return '<button type="button" draggable="true" class="tg-card tg-type-'+escape(c.type)+
     ' tg-rarity-'+escape(rarity)+(chosen?' selected':'')+
     '" data-tg-card="'+escape(item.uid)+'" aria-pressed="'+chosen+'" title="'+
     escape(c.desc||c.name)+'" '+(playing||game.phase!=='planning'||selected.dead?'disabled':'')+
     '><span class="tg-card-icon">'+({attack:'⚔',defense:'⬡',skill:'✦',power:'◆'}[c.type]||'✧')+
     '</span><strong>'+escape(c.name)+'</strong><small>'+escape(describe(c))+
     ' · '+c.w+'/'+c.a+'/'+c.r+'</small></button>';
   });
   get('hand').innerHTML=cards.length?cards.join(''):
    '<span class="tg-empty">'+(playing?'行动正在执行':'手牌空 · 洗牌或等待下轮自动补满')+'</span>';
   get('handcount').textContent=selected.hand.length+'/'+G.HAND+' 张';
   get('help').textContent=feedback;
   for(const name of ['undo','shuffle','finisher','auto','auto-all','execute'])
    get(name).disabled=playing||game.phase!=='planning';
   get('finisher').classList.toggle('ready',selected.energy>=100);
   get('restart').hidden=playing||!['win','lost'].includes(game.phase);
   holder.dataset.layout='right-portrait-dual-track-v17';
   holder.dataset.timegridVersion='1.7';
   holder.dataset.phase=playing?'resolving':game.phase;
  }
  function run(fn){
   try{const result=fn();paint();return result;}
   catch(error){note(error?.message||String(error));paint();return false;}
  }
  function selectRole(index){
   if(!model||model.playback)return false;
   const actor=model.setRole(index);
   if(actor){picked=null;moving=null;mode=null;note('已切换 '+roleName(actor.id)+'，选择该角色手牌');paint();}
   return !!actor;
  }
  function onSlot(id,tick){
   selectedTick=tick;
   run(()=>{
    if(mode==='finisher'){
     model.finisher(tick,id);mode=null;note('绝杀已安排到 T'+tick);return;
    }
    if(mode==='shuffle'){
     if(id!==displayId(model.controlled().id))throw Error('洗牌只放在当前出牌者的上轨');
     model.shuffle(tick);mode=null;note('换手成功，已排动作锁定，未占用的旧时间格仍可回填');return;
    }
    if(picked){model.schedule(picked,tick,id);picked=null;note('卡牌已放入 T'+tick);return;}
    if(moving){model.move(moving,tick,id);moving=null;note('卡牌已移至 T'+tick);return;}
    note('先选手牌，再点击目标上轨的 T1–T10');
   });
  }
  holder.addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b||!holder.contains(b))return;
   e.stopPropagation();e.preventDefault();
   if(b.hasAttribute('data-tg-toggle')){setExpanded(!expanded);return;}
   if(b.hasAttribute('data-tg-restart')){start();return;}
   if(!model||model.playback)return;
   if(b.hasAttribute('data-tg-choose-role')){
    const n=Number(b.dataset.tgChooseRole);
    if(onRole)onRole(n);else selectRole(n);
    return;
   }
   if(b.hasAttribute('data-tg-card')){
    picked=picked===b.dataset.tgCard?null:b.dataset.tgCard;
    moving=null;mode=null;
    const inst=model.controlled().hand.find(a=>a.uid===picked);
    note(inst?(cardOf(inst.key).name+' · '+(cardOf(inst.key).desc||'请选择合法目标及时间格')):
     '选卡后点目标上轨');paint();return;
   }
   if(b.hasAttribute('data-tg-action')){
    moving=moving===b.dataset.tgAction?null:b.dataset.tgAction;
    picked=null;mode=null;note(moving?'已选中动作：点新时间格调整，或点击撤销':'选择手牌规划');paint();return;
   }
   if(b.hasAttribute('data-tg-target')){onSlot(b.dataset.tgTarget,Number(b.dataset.tgTick));return;}
   if(b.hasAttribute('data-tg-cover')){
    run(()=>quickGuard(b.dataset.tgCover,Number(b.dataset.tgCoverTick)));return;
   }
   if(b.hasAttribute('data-tg-undo')){
    run(()=>{
     const actor=model.controlled(),last=actor.actions.filter(a=>!a.locked&&a.start>=model.game.now)
      .sort((a,b)=>b.start-a.start)[0],id=moving||last?.id;
     if(!id)throw Error('没有可撤销的已排卡牌');
     model.undo(id);moving=null;picked=null;note('已取下，卡牌返回手牌');
    });return;
   }
   if(b.hasAttribute('data-tg-shuffle')){
    mode='shuffle';picked=null;moving=null;note('点击当前角色上轨选洗牌起点：空手1格，有手牌2格');paint();return;
   }
   if(b.hasAttribute('data-tg-finisher')){
    mode='finisher';picked=null;moving=null;note('绝杀：在敌人上轨选择时间格，需100能量和发动条件');paint();return;
   }
   if(b.hasAttribute('data-tg-auto')){run(()=>{model.autoplan(false);note('已辅助规划本角色，可继续调整');});return;}
   if(b.hasAttribute('data-tg-auto-all')){run(()=>{model.autoplan(true);note('四个角色各自排程完毕，可切换复核');});return;}
   if(b.hasAttribute('data-tg-execute')){
    run(()=>{picked=null;moving=null;mode=null;model.execute();note('双方行动按十格同步结算');});return;
   }
  });
  // Human-friendly full-action footprint: test legality with a CLONED real
  // V1.7 engine state, not a divergent UI-only overlap approximation.
  // Does not consume cards or change the live deck on hover.
  function clearFootprint(){
   holder.querySelectorAll('.tg-footprint-valid,.tg-footprint-invalid').forEach(el=>{
    el.classList.remove('tg-footprint-valid','tg-footprint-invalid');
   });
  }
  function footprint(cell){
   clearFootprint();
   if(!cell||model?.playback||model?.game.phase!=='planning')return;
   const tick=Number(cell.dataset.tgTick),target=cell.dataset.tgTarget;
   const actor=model.controlled();
   let c=null,act=null,uid=null;
   if(mode==='finisher')c=cardOf(actor.fin);
   else if(mode==='shuffle')c={w:0,a:actor.hand.length?2:1,r:0};
   else if(picked){
    const item=actor.hand.find(a=>a.uid===picked);
    if(item){uid=item.uid;c=cardOf(item.key);}
   }else if(moving){
    act=actor.actions.find(a=>a.id===moving);if(act)c=cardOf(act.card);
   }
   if(!c)return;
   let legal=false;
   try{
    const snapshot=G.clone(model.game),dest=gameId(target);
    if(mode==='finisher')G.placeFinisher(snapshot,tick,dest);
    else if(mode==='shuffle'){
     if(target!==displayId(actor.id))throw Error('shuffle target');
     G.shuffleHand(snapshot,tick);
    }else if(uid)G.place(snapshot,uid,tick,dest);
    else if(act)G.moveAction(snapshot,act.id,tick,dest);
    legal=true;
   }catch(_){}
   const row=cell.closest('.tg-row');if(!row)return;
   const cls=legal?'tg-footprint-valid':'tg-footprint-invalid';
   for(let i=tick;i<=Math.min(10,tick+G.cLen(c)-1);i++)
    row.querySelector('[data-tg-target][data-tg-tick="'+i+'"]')?.classList.add(cls);
  }
  get('rail').addEventListener('pointerover',e=>{
   const cell=e.target.closest('[data-tg-target]');
   if(cell)footprint(cell);
  });
  get('rail').addEventListener('pointerleave',clearFootprint);
  // Desktop drag/drop and touch-friendly tap-to-place use the same engine.
  holder.addEventListener('dragstart',e=>{
   const el=e.target.closest('[data-tg-card],[data-tg-action]');
   if(!el||!e.dataTransfer||model?.playback)return;
   e.dataTransfer.setData('text/plain',el.dataset.tgCard?'card:'+el.dataset.tgCard:
    'action:'+el.dataset.tgAction);
   e.dataTransfer.effectAllowed='move';
  });
  holder.addEventListener('dragover',e=>{
   const el=e.target.closest('[data-tg-target]');
   if(el&&!model?.playback){e.preventDefault();el.classList.add('drag-target');}
  });
  holder.addEventListener('dragleave',e=>{
   const el=e.target.closest('[data-tg-target]');if(el)el.classList.remove('drag-target');
  });
  holder.addEventListener('drop',e=>{
   const el=e.target.closest('[data-tg-target]');if(!el||model?.playback)return;
   e.preventDefault();el.classList.remove('drag-target');
   const token=e.dataTransfer?.getData('text/plain')||'';
   if(token.startsWith('card:')){picked=token.slice(5);moving=null;mode=null;}
   else if(token.startsWith('action:')){moving=token.slice(7);picked=null;mode=null;}
   else return;
   onSlot(el.dataset.tgTarget,Number(el.dataset.tgTick));
  });
  start();
  return {get model(){return model;},element:holder,selectRole,reset:start,
   advance(dt){return model?.advance(dt)||null;},
   visual(id){if(!model)return null;return model.shown.find(a=>a.id===gameId(id))||null;},
   active(){return !!model&&!model.playback&&model.game.phase==='planning';},
   inspect(){return model?{phase:model.playback?'resolving':model.game.phase,
    round:model.game.round,progress:model.progress,controlledId:model.game.controlledId,
    ui:holder.dataset.layout,version:holder.dataset.timegridVersion,
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