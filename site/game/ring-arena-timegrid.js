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
  if(!hud||typeof document==='undefined')throw Error('Timegrid HUD requires battle stage');
  const holder=document.createElement('section');
  holder.className='ring-timegrid tg-ready';
  holder.setAttribute('aria-label','老式电影胶片战斗角色表');
  holder.innerHTML=[
   '<div class="tg-film-viewport" aria-label="贯穿全屏的连续竖向电影胶片">',
   '<div class="tg-film-blank tg-film-blank-top" aria-hidden="true"></div>',
   '<div class="tg-reel" data-tg-roster></div>',
   '<div class="tg-film-blank tg-film-blank-bottom" aria-hidden="true"></div></div>',
   '<section class="tg-timeline" data-tg-timeline role="region" aria-label="角色时间步规划" hidden>',
   '<header class="tg-timeline-head"><span data-tg-person>角色行动</span><span data-tg-time>10 时间步</span><button type="button" data-tg-close aria-label="收起时间步">×</button></header>',
   '<div class="tg-timeline-ticks" data-tg-ticks></div>',
   '<div class="tg-timeline-cards" data-tg-cards></div>',
   '<p class="tg-timeline-note" data-tg-note>选择手牌，再点时间步。</p>',
   '<footer class="tg-timeline-foot"><button type="button" data-tg-auto-role>自动编排本角色</button><button type="button" data-tg-execute>执行本轮</button></footer></section>',
   '<button type="button" class="tg-quick" data-tg-quick aria-label="自动安排并执行一次行动">行动</button>',
   '<span class="tg-screenreader" role="status" aria-live="polite" data-tg-announcement></span>'
  ].join('');
  const roster=holder.querySelector('[data-tg-roster]');
  const viewport=holder.querySelector('.tg-film-viewport');
  const timeline=holder.querySelector('[data-tg-timeline]');
  const timelineTicks=holder.querySelector('[data-tg-ticks]');
  const timelineCards=holder.querySelector('[data-tg-cards]');
  const timelineNote=holder.querySelector('[data-tg-note]');
  const announce=holder.querySelector('[data-tg-announcement]');
  const hitLayer=document.createElement('div');
  hitLayer.dataset.tgHits='';hitLayer.className='tg-hit-layer';
  hitLayer.setAttribute('aria-hidden','true');
  hud.append(holder,hitLayer);
  const roleName=id=>({hero:'斧卫','ai-gun':'枪手','ai-guard':'守护','ai-mage':'调律'}[id]||'敌方');
  // This is the exact transparent-window vintage 35mm film image generated
  // for this game, stored once and repeated as a texture, never CSS-drawn.
  const FILM_ART='./assets/ui/painted-film-portrait-frame.webp';
  const portraitArt=Object.freeze({
   hero:'./assets/characters/protagonist-front.webp',
   'ai-gun':'./assets/characters/char-003/front.png',
   'ai-guard':'./assets/characters/char-004/fullbody-solo.png',
   'ai-mage':'./assets/characters/char-016/front.png',
   'enemy-s1':'./assets/characters/char-002/front.png',
   'enemy-s2':'./assets/characters/char-003/front.png',
   'enemy-s3':'./assets/characters/char-016/front.png',
   'enemy-s4':'./assets/characters/char-004/fullbody-solo.png'
  });
  const cropped=new Map();
  // Crop a FACE from the existing full-body L2D artwork, respecting the
  // transparent silhouette instead of naively scaling a whole person into
  // a tiny avatar. Computed once per asset, not on every battle tick.
  function preparePortrait(source){
   if(cropped.has(source))return;
   cropped.set(source,source);
   const im=new Image();im.decoding='async';
   im.onload=()=>{
    try{
     const scale=Math.min(1,720/Math.max(im.naturalWidth,im.naturalHeight));
     const w=Math.max(1,Math.round(im.naturalWidth*scale));
     const h=Math.max(1,Math.round(im.naturalHeight*scale));
     const temp=document.createElement('canvas');temp.width=w;temp.height=h;
     const ctx=temp.getContext('2d',{willReadFrequently:true});
     ctx.drawImage(im,0,0,w,h);
     const pixels=ctx.getImageData(0,0,w,h).data;
     let loX=w,hiX=0,loY=h,hiY=0,count=0;
     const stride=Math.max(1,Math.floor(Math.max(w,h)/480));
     for(let y=0;y<h;y+=stride)for(let x=0;x<w;x+=stride){
      if(pixels[(y*w+x)*4+3]<70)continue;
      loX=Math.min(loX,x);hiX=Math.max(hiX,x);
      loY=Math.min(loY,y);hiY=Math.max(hiY,y);count++;
     }
     if(count<36)return;
     const bodyH=Math.max(1,hiY-loY),bodyW=Math.max(1,hiX-loX);
     // Face lives in the top quarter of an upright three-view/full-body.
     // Portrait-aspect crop preserves full hair, eyes and shoulders without squashing faces.
     const cropH=Math.min(h,Math.max(28,bodyH*.29));
     const cropW=cropH*.82,headY=loY+bodyH*.135;
     let massX=0,massN=0;
     for(let y=loY;y<Math.min(h,loY+bodyH*.19);y+=stride)
      for(let x=loX;x<=hiX;x+=stride){
       if(pixels[(y*w+x)*4+3]<95)continue;
       massX+=x;massN++;
      }
     const centerX=massN>12?massX/massN:(loX+hiX)/2;
     const sx=Math.max(0,Math.min(w-cropW,centerX-cropW*.5));
     const sy=Math.max(0,Math.min(h-cropH,headY-cropH*.45));
     const out=document.createElement('canvas');out.width=216;out.height=264;
     const o=out.getContext('2d',{willReadFrequently:true});
     o.drawImage(temp,sx,sy,Math.min(cropW,w),Math.min(cropH,h),0,0,216,264);
     // A number of the authentic fullbody sources have solid PAPER-WHITE
     // backdrops. Flood-remove only near-neutral whites CONNECTED TO THE
     // crop boundary; enclosed pale skin/eyes/shirt remain source artwork.
     // This turns old rectangular source thumbnails into contemporary
     // transparent face cutouts without changing the original files.
     const pw=216,ph=264,frame=o.getImageData(0,0,pw,ph),data=frame.data;
     const visited=new Uint8Array(pw*ph),removed=new Uint8Array(pw*ph);
     const queue=new Int32Array(pw*ph);let qIn=0,qOut=0;
     const paper=p=>{
      const off=p*4,r=data[off],g=data[off+1],b=data[off+2],a=data[off+3];
      return a<35||r>202&&g>202&&b>202&&
       Math.max(r,g,b)-Math.min(r,g,b)<35;
     };
     const seed=p=>{if(!visited[p]&&paper(p)){
      visited[p]=1;queue[qIn++]=p;
     }};
     for(let x=0;x<pw;x++){seed(x);seed((ph-1)*pw+x);}
     for(let y=0;y<ph;y++){seed(y*pw);seed(y*pw+pw-1);}
     while(qOut<qIn){
      const p=queue[qOut++];removed[p]=1;
      const x=p%pw,y=(p-x)/pw;
      if(x>0)seed(p-1);if(x+1<pw)seed(p+1);
      if(y>0)seed(p-pw);if(y+1<ph)seed(p+pw);
     }
     for(let p=0;p<pw*ph;p++){
      if(removed[p])data[p*4+3]=0;
      else{
       const x=p%pw,y=(p-x)/pw;
       const edge=(x>0&&removed[p-1])||(x+1<pw&&removed[p+1])||
        (y>0&&removed[p-pw])||(y+1<ph&&removed[p+pw]);
       if(edge){
        const at=p*4,r=data[at],g=data[at+1],b=data[at+2];
        if(Math.min(r,g,b)>170&&Math.max(r,g,b)-Math.min(r,g,b)<45)
         data[at+3]=Math.round(data[at+3]*.5);
       }
      }
     }
     o.putImageData(frame,0,0);
     // Hand-painted film has a wide viewing window. Recompose the same
     // original face cutout as a wide cinematic portrait without changing
     // identity, face details, L2D rigs or the in-world actor sprite.
     const banner=document.createElement('canvas');
     banner.width=384;banner.height=144;
     const bc=banner.getContext('2d');
     bc.fillStyle='#201619';bc.fillRect(0,0,384,144);
     // Use a CINEMATIC FACE CLOSE-UP, not a small full head on a wide black band.
     // The crop has the same 2.66:1 ratio as the painted transparent film window
     // and keeps the artist's actual source facial proportions intact.
     bc.drawImage(out,15,53,186,70,0,0,384,144);
     cropped.set(source,banner.toDataURL('image/webp',.91));
     if(model)paintRoster();
    }catch(error){console.warn('[Arena HUD portrait crop]',error);}
   };
   im.src=source;
  }
  const art=actor=>{
   const source=portraitArt[actor.id]||
    './assets/characters/protagonist-front.webp';
   preparePortrait(source);
   return cropped.get(source)||source;
  };


  let seed=20261108,model=null,firstFrame=true,rosterRevision=0;
  let openActorId=null,selectedCardUid=null,selectedTargetId=null,timelineMessage='';
  const nodes=new Map();
  const reduceMotion=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function makeFrame(actor){
   const slot=displayId(actor.id)||actor.id;
   const label=actor.side==='ally'?roleName(actor.id):actor.name||'敌方';
   const row=document.createElement('div');
   row.className='tg-row '+(actor.side==='enemy'?'enemy':'ally');
   row.dataset.tgActor=actor.id;
   row.dataset.tgRow=slot;
   // The portrait is behind the transparent window. The real film is
   // an image OVER it, so scratches/edge perforations stay physically visible.
   const portrait=actor.side==='ally'
    ?'<button type="button" class="tg-portrait" data-tg-choose-role="'+
     (ROLE_IDS.indexOf(actor.id)+1)+'" aria-label="切换到'+escape(label)+'">'
    :'<button type="button" class="tg-portrait" data-tg-inspect-enemy="'+actor.id+'" aria-label="查看'+escape(label)+'的时间步">';
   const portraitEnd='</button>';
   row.innerHTML=portrait+
    '<span class="tg-cutout"><img class="tg-face" alt="" draggable="false" decoding="async" src="'+art(actor)+'"></span>'+
    portraitEnd+
    '<img class="tg-film-texture" alt="" decoding="async" draggable="false" src="'+FILM_ART+'" aria-hidden="true">'+
    '<span class="tg-identity"><strong class="tg-hp-value"></strong>'+
    '<span class="tg-hp-bar" role="progressbar" aria-label="生命值" '+
    'aria-valuemin="0"><i></i></span></span>';
   return row;
  }
  function updateFrame(row,actor){
   const hpMax=Math.max(1,Number(actor.maxHp)||1);
   const hp=Math.max(0,Math.min(hpMax,Number(actor.hp)||0));
   const role=actor.id===model.controlled().id;
   row.classList.toggle('current',role);
   row.classList.toggle('expanded',actor.id===openActorId);
   row.classList.toggle('enemy',actor.side==='enemy');
   row.classList.toggle('ally',actor.side==='ally');
   const face=row.querySelector('.tg-face'),source=art(actor);
   if(face.getAttribute('src')!==source)face.src=source;
   const current=row.querySelector('.tg-hp-value');
   if(current.textContent!==hp+'/'+hpMax)current.textContent=hp+'/'+hpMax;
   const bar=row.querySelector('.tg-hp-bar');
   bar.setAttribute('aria-valuemax',String(hpMax));
   bar.setAttribute('aria-valuenow',String(hp));
   row.querySelector('.tg-hp-bar i').style.width=(100*hp/hpMax).toFixed(2)+'%';
   const button=row.querySelector('[data-tg-choose-role]');
   if(button)button.disabled=!!model.playback;
  }
  function rollOut(node){
   if(reduceMotion()||!node.animate)return;
   const rowBox=node.getBoundingClientRect();
   const viewBox=viewport.getBoundingClientRect();
   if(rowBox.width<1||rowBox.height<1)return;
   const ghost=node.cloneNode(true);
   ghost.removeAttribute('data-tg-actor');
   ghost.classList.add('tg-ghost');
   ghost.style.position='absolute';
   ghost.style.top=(rowBox.top-viewBox.top)+'px';
   ghost.style.left=(rowBox.left-viewBox.left)+'px';
   ghost.style.width=rowBox.width+'px';
   ghost.style.height=rowBox.height+'px';
   ghost.style.margin='0';
   ghost.style.pointerEvents='none';
   viewport.append(ghost);
   const direction=node.classList.contains('enemy')?-1:1;
   const motion=ghost.animate([
    {opacity:1,filter:'brightness(1.3)',transform:'translate3d(0,0,0)'},
    {opacity:.6,filter:'brightness(1.8) blur(1px)',offset:.32,
     transform:'translate3d(0,'+(direction*14)+'px,0)'},
    {opacity:0,filter:'brightness(.6) blur(3px)',
     transform:'translate3d(0,'+(direction*rowBox.height*1.08)+'px,0)'}
   ],{duration:245,easing:'cubic-bezier(.24,.78,.25,1)',fill:'forwards'});
   const discard=()=>ghost.remove();
   motion.finished.then(discard,discard);
   // Slow software-WebGL/hidden tabs can delay animation completion events.
   // A bounded cleanup also prevents an old portrait ghost from lingering.
   window.setTimeout(discard,480);
  }
  function paintRoster(){
   if(!model)return;
   const currentShown=new Map(model.shown.map(actor=>[actor.id,actor]));
   // Enemy/ally ordering is stable. Dead actors are spliced OUT of the
   // physical film immediately; later recruits receive their own new frame.
   const displayed=model.game.actors.map(actor=>({...actor,...currentShown.get(actor.id)}))
    .filter(actor=>!actor.dead&&Number(actor.hp)>0)
    .sort((x,y)=>Number(x.side==='ally')-Number(y.side==='ally'));
   const desired=displayed.map(actor=>actor.id);
   const existingIds=[...nodes.keys()];
   const membershipChanged=desired.length!==existingIds.length||
    desired.some((id,i)=>id!==existingIds[i]);
   const beforeRects=new Map();
   if(membershipChanged&&!firstFrame&&!reduceMotion()){
    for(const [id,node] of nodes)beforeRects.set(id,node.getBoundingClientRect());
   }
   let vanished=0,arrived=0;
   for(const [id,node] of [...nodes]){
    if(desired.includes(id))continue;
    if(!firstFrame)rollOut(node);
    node.remove();nodes.delete(id);vanished++;
   }
   for(const actor of displayed){
    let node=nodes.get(actor.id);
    if(!node){node=makeFrame(actor);nodes.set(actor.id,node);arrived++;}
    updateFrame(node,actor);
   }
   // Reorder only when needed. Existing nodes and their artwork/image decode
   // survive every 3D tick: no re-rendered innerHTML and no popping portraits.
   for(let i=0;i<desired.length;i++){
    const wanted=nodes.get(desired[i]),slot=roster.children[i];
    if(slot!==wanted)roster.insertBefore(wanted,slot||null);
   }
   if(membershipChanged&&!firstFrame&&!reduceMotion()){
    for(const [id,node] of nodes){
     const old=beforeRects.get(id);
     if(old){
      const now=node.getBoundingClientRect(),dy=old.top-now.top;
      if(Math.abs(dy)>1&&node.animate)
       node.animate([{transform:'translate3d(0,'+dy+'px,0)'},
        {transform:'translate3d(0,-1px,0)',offset:.78},
        {transform:'translate3d(0,0,0)'}],
        {duration:285,easing:'cubic-bezier(.18,.78,.23,1)'});
     }else if(node.animate){
      node.animate([{opacity:0,filter:'blur(3px) brightness(1.5)',
         transform:'translate3d(0,-52px,0)'},
       {opacity:1,filter:'none',transform:'translate3d(0,0,0)'}],
       {duration:260,easing:'cubic-bezier(.18,.82,.28,1)'});
     }
    }
    if(roster.animate){
     roster.animate([{transform:'translate3d(0,-8px,0)'},
      {transform:'translate3d(0,2px,0)',offset:.72},
      {transform:'translate3d(0,0,0)'}],
      {duration:300,easing:'cubic-bezier(.14,.78,.24,1)'});
    }
   }
   // Keep insertion order identical to the visible physical reel, even
   // when a new enemy splices in before the allied portrait frames.
   const ordered=new Map(desired.map(id=>[id,nodes.get(id)]));
   nodes.clear();for(const [id,node] of ordered)nodes.set(id,node);
   if(membershipChanged&&!firstFrame){
    rosterRevision++;
    announce.textContent=(vanished?'胶片抽离 '+vanished+' 帧。':'')+
     (arrived?'新人物胶片滚入 '+arrived+' 帧。':'');
   }
   holder.querySelector('[data-tg-quick]').disabled=model.playback||
    model.game.phase!=='planning';
   holder.dataset.layout='handpainted-film-portrait-timegrid-v4';
   holder.dataset.timegridVersion='4.0';
   holder.dataset.reelRevision=String(rosterRevision);
   firstFrame=false;
   if(openActorId)renderTimeline();
  }
  function renderTimeline(){
   if(!openActorId||!model){timeline.hidden=true;return;}
   const actor=model.game.actors.find(a=>a.id===openActorId&&!a.dead);
   if(!actor){openActorId=null;timeline.hidden=true;return;}
   const enemy=actor.side==='enemy',planning=model.game.phase==='planning'&&!model.playback;
   timeline.hidden=false;timeline.dataset.side=actor.side;
   holder.querySelector('[data-tg-person]').textContent=actor.name||roleName(actor.id);
   holder.querySelector('[data-tg-time]').textContent='第 '+(model.game.round+1)+' 轮 · 10 时间步';
   const now=model.game.now;
   timelineTicks.innerHTML=Array.from({length:10},(_,i)=>{
    const tick=now+i;
    const act=actor.actions.find(a=>!a.canceled&&a.start<=tick&&a.start+(G.CARD[a.card]?.w||0)+(G.CARD[a.card]?.a||0)+(G.CARD[a.card]?.r||0)>tick);
    const card=act&&G.CARD[act.card],phase=card&&G.phase(card,act.start,tick);
    const mark=phase==='windup'?'蓄':phase==='active'?'动':phase==='recovery'?'收':'＋';
    const title=card?escape(card.name+' · '+(phase||'')):'空闲时间步';
    return '<button class="tg-tick '+(phase||'empty')+'" data-tg-tick="'+(i+1)+'" type="button" '+
     (enemy||!planning?'disabled ':'')+'title="'+title+'"><small>'+String(i+1).padStart(2,'0')+'</small><strong>'+mark+'</strong></button>';
   }).join('');
   if(enemy)timelineCards.innerHTML='<span class="tg-timeline-intel">敌方行动只可观察，不可编辑。</span>';
   else timelineCards.innerHTML=(actor.hand||[]).map(inst=>{
    const card=G.CARD[inst.key];if(!card)return '';
    return '<button class="tg-card-pick" type="button" data-tg-card="'+escape(inst.uid)+'" aria-pressed="'+(inst.uid===selectedCardUid)+'">'+
     escape(card.name)+' <small>'+(card.w+card.a+card.r)+'步</small></button>';
   }).join('')||'<span class="tg-timeline-intel">当前没有手牌。</span>';
   timelineNote.textContent=timelineMessage||(enemy?'目标生命 '+actor.hp+'/'+actor.maxHp:
    selectedCardUid?'点击空白时间步安排已选卡牌。':'选手牌再点击 01—10 时间步；点击已安排动作可撤回。');
   timeline.querySelector('[data-tg-auto-role]').hidden=enemy||!planning;
   timeline.querySelector('[data-tg-execute]').hidden=enemy||!planning;
   timeline.querySelectorAll('[data-tg-card]').forEach(btn=>{btn.disabled=!planning});
   const row=nodes.get(actor.id);
   if(row){
    const rr=row.getBoundingClientRect(),hr=holder.getBoundingClientRect(),panelH=timeline.getBoundingClientRect().height;
    timeline.style.top=Math.max(8,Math.min(hr.height-panelH-8,rr.top-hr.top+rr.height*.5-panelH*.5))+'px';
   }
  }
  function closeTimeline(){openActorId=null;selectedCardUid=null;timeline.hidden=true;
   for(const row of nodes.values())row.classList.remove('expanded');}
  function openTimeline(actorId){
   if(openActorId===actorId){closeTimeline();return;}
   openActorId=actorId;selectedCardUid=null;timelineMessage='';
   if(actorId.startsWith('enemy-'))selectedTargetId=actorId;
   for(const [id,row] of nodes)row.classList.toggle('expanded',id===actorId);
   renderTimeline();
  }
  function start(){
   model=createBattle(++seed);
   firstFrame=true;rosterRevision=0;nodes.clear();roster.replaceChildren();
   closeTimeline();selectedTargetId=null;
   hitLayer.replaceChildren();holder.classList.remove('tg-ready');
   model.onChange(event=>{if(onTick)onTick(event,model);paintRoster();});
   paintRoster();
   // Resetting an encounter physically restarts the one-piece reel entry.
   void holder.offsetWidth;holder.classList.add('tg-ready');
   return model;
  }
  function selectRole(index){
   if(!model||model.playback)return false;
   const result=model.setRole(Number(index));
   if(result)paintRoster();
   return !!result;
  }
  function executeQuick(){
   if(!model||model.playback||model.game.phase!=='planning')return false;
   model.autoplan(true);
   const result=model.execute();paintRoster();return !!result;
  }
  holder.addEventListener('click',event=>{
   const button=event.target.closest('button');if(!button)return;
   if(button.hasAttribute('data-tg-quick')){closeTimeline();executeQuick();return;}
   if(button.hasAttribute('data-tg-close')){closeTimeline();return;}
   if(button.hasAttribute('data-tg-choose-role')){
    const index=Number(button.dataset.tgChooseRole),actorId=ROLE_IDS[index-1];
    if(!actorId)return;
    const same=openActorId===actorId;
    if(onRole)onRole(index);else selectRole(index);
    if(same)closeTimeline();else openTimeline(actorId);
    return;
   }
   if(button.hasAttribute('data-tg-inspect-enemy')){
    openTimeline(button.dataset.tgInspectEnemy);return;
   }
   if(button.hasAttribute('data-tg-card')){
    selectedCardUid=selectedCardUid===button.dataset.tgCard?null:button.dataset.tgCard;
    timelineMessage='';renderTimeline();return;
   }
   if(button.hasAttribute('data-tg-tick')&&openActorId&&!openActorId.startsWith('enemy-')){
    const actor=model.game.actors.find(a=>a.id===openActorId);
    if(!actor||model.playback||model.game.phase!=='planning')return;
    const step=Number(button.dataset.tgTick),tick=model.game.now+step-1;
    const old=actor.actions.find(a=>!a.canceled&&a.start<=tick&&a.start+(G.CARD[a.card].w+G.CARD[a.card].a+G.CARD[a.card].r)>tick);
    try{
     if(old){model.undo(old.id);timelineMessage='已撤回 '+G.CARD[old.card].name;}
     else if(selectedCardUid){
      const inst=actor.hand.find(x=>x.uid===selectedCardUid);
      if(!inst)throw Error('手牌已失效，请重新选择');
      const card=G.CARD[inst.key],dest=friendly(card)?openActorId:(selectedTargetId||'enemy-1');
      model.schedule(inst.uid,step,dest);timelineMessage='已在第 '+step+' 步安排 '+card.name;
      selectedCardUid=null;
     }else timelineMessage='先选择下方手牌。';
    }catch(error){timelineMessage=String(error.message||error)}
    renderTimeline();return;
   }
   if(button.hasAttribute('data-tg-auto-role')){
    try{model.autoplan(false);timelineMessage='已为本角色编排行动';}
    catch(error){timelineMessage=String(error.message||error)}
    renderTimeline();return;
   }
   if(button.hasAttribute('data-tg-execute')){
    if(model.execute()){closeTimeline();timelineMessage='';}return;
   }
  });
  const keyHandler=event=>{
   if(hud.hidden||!hud.isConnected||event.repeat||event.altKey||
    event.ctrlKey||event.metaKey)return;
   if(/input|textarea|select/i.test(event.target?.tagName||''))return;
   if(event.key==='Escape'&&openActorId){event.preventDefault();closeTimeline();return;}
   if(event.key==='Enter'&&!event.shiftKey&&event.target?.tagName!=='BUTTON'){event.preventDefault();executeQuick();}
  };
  document.addEventListener('keydown',keyHandler);
  // The optional QA gate verifies recruitment/death movement with REAL DOM
  // and state, never with a screenshot-composited fake overlay.
  if(new URLSearchParams(window.location.search).get('timegridQA')==='1'){
   holder.__timegridQA={
    remove:id=>{const actor=model.game.actors.find(x=>x.id===id);
     const visual=model.shown.find(x=>x.id===id);
     if(!actor)return false;actor.dead=true;actor.hp=0;
     if(visual){visual.dead=true;visual.hp=0;}paintRoster();return true;},
    recruit:actor=>{
     if(!actor?.id||model.game.actors.some(x=>x.id===actor.id))return false;
     model.game.actors.push(actor);model.shown.push({...actor});paintRoster();return true;}
   };
  }
  start();
  return {
   get model(){return model;},element:holder,selectRole,reset:start,executeQuick,
   refreshRoster:paintRoster,
   advance(dt){return model?.advance(dt)||null;},
   visual(id){return model?.shown.find(a=>a.id===gameId(id))||null;},
   active(){return !!model&&!model.playback&&model.game.phase==='planning';},
   inspect(){return model?{
    phase:model.playback?'resolving':model.game.phase,
    round:model.game.round,progress:model.progress,controlledId:model.game.controlledId,
    ui:holder.dataset.layout,version:holder.dataset.timegridVersion,
    reelRevision:rosterRevision,reelActorIds:[...nodes.keys()],
    filmArt:FILM_ART,
    tacticsOpen:false,timelineOpen:!timeline.hidden,timelineActor:openActorId,
    quickActionAvailable:!model.playback&&model.game.phase==='planning',
    roles:ROLE_IDS.map((id,i)=>({gameId:id,arenaId:ARENA_IDS[i],
     hp:model.game.actors.find(a=>a.id===id)?.hp,
     hand:model.game.actors.find(a=>a.id===id)?.hand.length,
     planned:model.game.actors.find(a=>a.id===id)?.actions.length})),
    enemies:model.game.actors.filter(a=>a.side==='enemy').map(a=>({
     id:a.id,arenaId:displayId(a.id),hp:a.hp,dead:a.dead})),
    projectedHp:model.preview().actors.map(a=>({id:a.id,hp:a.hp})),
    timelineTicks:G.ROUND
   }:null;}
  };
 }
 return Object.freeze({createBattle,mount,displayId,gameId,ROLE_IDS,ARENA_IDS,friendly});
});