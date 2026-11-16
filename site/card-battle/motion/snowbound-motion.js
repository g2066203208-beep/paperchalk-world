/* Snowbound Journey presentation director v2 — original effects only.
 * Pure rules remain authoritative: each committed engine transaction
 * contains ordered semantic events, while this view plays recoverable clips.
 * Motion does not mutate game HP/coins/roster, so skipping or tab suspension
 * cannot double-apply effects.
 */
(function(root){
 "use strict";
 const TOKENS=Object.freeze({
  scene:330,intro:860,charge:105,travel:135,hitstop:65,
  hurt:160,attackRecover:150,damageFloat:520,death:440,
  summon:440,redraw:590,cardSwap:245,shopPurchase:720,
  result:850,fastScale:.65,reducedScale:.15
 });
 const now=()=>performance.now();
 const midpoint=b=>({x:b.left+b.width*.5,y:b.top+b.height*.5});
 const cssEscape=v=>String(v).replace(/\\/g,"\\\\").replace(/"/g,'\\"');
 function create({app,getSoundEnabled=()=>true,onChange=()=>{}}={}){
  if(!app)throw Error("MotionDirector requires app");
  let busy=false,token=0,overlay=null,skipped=false,speed=1,active=[],pending=[];
  let lastError=null,audio=null;
  const marks=[];
  const prefersReduced=()=>root.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||false;
  const duration=(ms)=>Math.max(0,Math.round(ms*(prefersReduced()?TOKENS.reducedScale:1)/speed));
  function record(event,stage,detail){
   marks.push({t:+now().toFixed(1),event,stage,detail:detail||""});
   if(marks.length>500)marks.shift();
  }
  function removeOverlay(){
   overlay?.remove();overlay=null;
   for(const a of active){try{a.cancel()}catch(e){}}
   active.length=0;
   pending.splice(0).forEach(r=>r());
  }
  function skip(){
   if(!busy)return;
   skipped=true;token++;
   removeOverlay();document.querySelectorAll(".motion-entering").forEach(n=>n.classList.remove("motion-entering"));app.querySelectorAll(".battle-unit").forEach(n=>n.style.visibility="");busy=false;onChange(false);record("director","skipped");
  }
  function wait(ms,run){
   if(!ms||skipped||run!==token||document.hidden)return Promise.resolve();
   return new Promise(resolve=>{
    let settled=false,last=now(),remaining=duration(ms);
    const done=()=>{if(settled)return;settled=true;resolve()};
    pending.push(done);
    function tick(){
     if(settled)return;
     if(skipped||run!==token||document.hidden){done();return}
     const t=now();remaining-=Math.max(0,t-last);last=t;
     if(remaining<=0){done();return}
     requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
   });
  }
  async function animate(element,keyframes,ms,{easing="cubic-bezier(.19,.8,.3,1)",fill="forwards"}={},run=token){
   if(!element||!element.isConnected||skipped||run!==token)return;
   let d=duration(ms);
   if(!d){Object.assign(element.style,{opacity:keyframes.at(-1)?.opacity??""});return}
   if(!element.animate){await wait(ms,run);return}
   const a=element.animate(keyframes,{duration:d,easing,fill});
   active.push(a);
   try{await a.finished}catch(e){}
   const i=active.indexOf(a);if(i>=0)active.splice(i,1);
  }
  function beep(type){
   if(!getSoundEnabled())return;
   try{
    const AC=root.AudioContext||root.webkitAudioContext;if(!AC)return;
    if(!audio)audio=new AC();
    if(audio.state==="suspended")audio.resume().catch(()=>{});
    const t=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();
    const spec={paper:[260,180,.018,.055],gun:[120,65,.07,.10],hit:[180,90,.065,.09],
     shatter:[460,100,.045,.15],bell:[790,560,.025,.18],buy:[640,920,.024,.16],
     win:[620,960,.02,.23],lose:[180,74,.025,.25]}[type]||[370,210,.017,.055];
    osc.type=type==="gun"||type==="hit"?"triangle":"sine";
    osc.frequency.setValueAtTime(spec[0],t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(45,spec[1]),t+spec[3]);
    gain.gain.setValueAtTime(.001,t);
    gain.gain.exponentialRampToValueAtTime(spec[2],t+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,t+spec[3]+.015);
    osc.connect(gain).connect(audio.destination);osc.start(t);osc.stop(t+spec[3]+.02);
   }catch(e){/* permission/autoplay failures silently degrade */ }
  }
  function capture(){
   const scene=app.querySelector(".scene");
   if(!scene)return {view:"none",scene:null};
   const box=scene.getBoundingClientRect();
   return {view:scene.dataset.scene||"",scene:scene.cloneNode(true),
    box:{left:box.left,top:box.top,width:box.width,height:box.height},
    capturedAt:now()};
  }
  function rootNode(){
   const layer=document.createElement("div");
   layer.className="motion-cinema";
   layer.setAttribute("aria-hidden","true");
   document.body.append(layer);
   overlay=layer;return layer;
  }
  function placeOldScene(snapshot){
   if(!snapshot?.scene)return null;
   const old=snapshot.scene,rect=snapshot.box;
   old.classList.add("motion-snapshot");old.removeAttribute("data-scene");
   old.style.position="absolute";
   old.style.left=rect.left+"px";old.style.top=rect.top+"px";
   old.style.width=rect.width+"px";old.style.height=rect.height+"px";
   old.style.margin="0";
   overlay.append(old);
   // A committed action is already past its confirmation UI. Keeping the
   // pre-click "play/cancel" tray visible over the lethal-hit movie makes
   // the gameplay clip look like a frozen webpage.
   old.querySelector(".fight-choice")?.remove();
   for(const b of old.querySelectorAll("button"))b.tabIndex=-1; // visual snapshot, not disabled/washed-out
   return old;
  }
  function unit(node,id){
   return [...(node?.querySelectorAll(".battle-unit[data-id]")||[])].find(e=>e.dataset.id===id)||null;
  }
  function flashFloat(target,amount,kind="damage",run=token){
   if(!target||!overlay)return;
   const rect=target.getBoundingClientRect(),p=midpoint(rect);
   const span=document.createElement("span");
   span.className="motion-float "+(kind==="blocked"?"is-blocked":kind==="heal"?"is-heal":"");
   span.textContent=kind==="blocked"?"格挡 "+amount:kind==="heal"?"+"+amount:"−"+amount;
   span.style.left=p.x+"px";span.style.top=(p.y-8)+"px";
   overlay.append(span);
   animate(span,[{transform:"translate(-50%,0) scale(.85)",opacity:0},
      {transform:"translate(-50%,-13px) scale(1.18)",opacity:1,offset:.22},
      {transform:"translate(-50%,-41px) scale(1)",opacity:0}],TOKENS.damageFloat,{},run).then(()=>span.remove());
  }
  function line(from,to,kind="gun",run=token){
   if(!from||!to||!overlay)return;
   const a=midpoint(from.getBoundingClientRect()),b=midpoint(to.getBoundingClientRect());
   const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
   const bullet=document.createElement("div");bullet.className="motion-projectile "+(kind==="gun"?"is-bullet":"is-strike");
   bullet.style.left=a.x+"px";bullet.style.top=a.y+"px";
   bullet.style.width=len+"px";bullet.style.transform="rotate("+Math.atan2(dy,dx)+"rad)";
   overlay.append(bullet);
   animate(bullet,[{clipPath:"inset(0 100% 0 0)",opacity:0},
    {clipPath:"inset(0 0% 0 0)",opacity:1,offset:.68},
    {clipPath:"inset(0 0% 0 0)",opacity:0}],TOKENS.travel,{easing:"ease-out"},run).then(()=>bullet.remove());
  }
  function launchPlayedCard(source,target,run,cue){
   if(!source||!target||!overlay)return;
   const a=source.getBoundingClientRect(),b=target.getBoundingClientRect();
   const dx=(b.left+b.width/2)-(a.left+a.width/2);
   const dy=(b.top+b.height/2)-(a.top+a.height/2);
   const ghost=source.cloneNode(true);
   ghost.classList.remove("is-dragging");
   ghost.classList.add("motion-played-card");
   Object.assign(ghost.style,{
    position:"fixed",left:a.left+"px",top:a.top+"px",
    width:a.width+"px",height:a.height+"px",
    margin:"0",pointerEvents:"none",visibility:"visible",
    zIndex:"11"
   });
   overlay.append(ghost);
   source.style.opacity="0";
   record("itemHit","card-launched",cue.cardKey||cue.cardId||"");
   animate(ghost,[
    {transform:"translate(0px,0px) rotate(0deg) scale(1)",opacity:1},
    {transform:"translate("+dx*.28+"px,"+(dy*.24-44)+"px) rotate(-9deg) scale(1.10)",opacity:1,offset:.38},
    {transform:"translate("+dx+"px,"+dy+"px) rotate(12deg) scale(.24)",opacity:0}
   ],TOKENS.travel+TOKENS.charge,{easing:"cubic-bezier(.28,.02,.3,1)"},run)
    .then(()=>ghost.remove());
  }
  async function attack(old,cue,run){
   if(skipped||run!==token)return;
   const actor=cue.actorId?unit(old,cue.actorId):null;
   const target=cue.targetId?unit(old,cue.targetId):null;
   if(!target)return;
   const label=cue.type+" "+(cue.actorId||cue.cardId||"item")+" → "+cue.targetId;
   record(label,"start",cue.kind);
   let from=actor;
   if(cue.type==="itemHit"){
    from=(cue.cardKey?old.querySelector('.battle-bottom .hand>button[data-card-key="'+cssEscape(cue.cardKey)+'"]'):null)||old.querySelector(".battle-bottom .hand>button")||null;
    if(from&&cue.cardKey)record(label,"card-source",cue.cardKey);
   }
   if(from&&from.isConnected){
    const sign=cue.actorSide==="enemy"?-1:1;
    animate(from,[{transform:"translateX(0) scale(1)"},{transform:"translateX("+(-sign*5)+"px) scale(.98)",offset:.33},
      {transform:"translateX("+(sign*13)+"px) scale(1.035)",offset:.72},
      {transform:"translateX(0) scale(1)"}],TOKENS.charge+TOKENS.attackRecover,{},run);
   }
   beep(cue.kind==="gun"?"gun":"paper");
   await wait(TOKENS.charge,run);
   if(cue.type==="itemHit")launchPlayedCard(from,target,run,cue);
   line(from||target,target,cue.kind,run);
   await wait(TOKENS.travel,run);
   record(label,"impact");
   beep(cue.blocked>0&&!cue.damage?"paper":"hit");
   const hp=target.querySelector(".badge.hp"),shield=target.querySelector(".badge.shield");
   if(hp&&cue.hpAfter!==undefined)hp.textContent=String(cue.hpAfter);
   if(shield&&cue.shieldAfter!==undefined)shield.textContent=String(cue.shieldAfter);
   if(cue.blocked)flashFloat(target,cue.blocked,"blocked",run);
   if(cue.damage)flashFloat(target,cue.damage,"damage",run);
   animate(target,[{transform:"translateX(0) rotate(0)",filter:"brightness(1)"},
     {transform:"translateX(5px) rotate(1.5deg) scale(.97)",filter:"brightness(1.5)",offset:.30},
     {transform:"translateX(-2px) rotate(-.6deg) scale(1.01)",filter:"brightness(1.05)",offset:.6},
     {transform:"translateX(0) rotate(0)",filter:"brightness(1)"}],TOKENS.hurt,{},run);
   await wait(TOKENS.hitstop+TOKENS.hurt,run);
   if(cue.kind==="freeze"){
    const badge=document.createElement("span");badge.className="motion-float is-blocked";
    badge.textContent="冰封";const box=target.getBoundingClientRect(),p=midpoint(box);
    badge.style.left=p.x+"px";badge.style.top=(p.y-29)+"px";
    overlay.append(badge);
    animate(badge,[{opacity:0,transform:"translate(-50%,4px) scale(.83)"},
      {opacity:1,transform:"translate(-50%,-12px) scale(1)",offset:.36},
      {opacity:0,transform:"translate(-50%,-36px) scale(.94)"}],430,{},run).then(()=>badge.remove());
   }
   if(cue.lethal){
    record(label,"death-start");beep("shatter");
    await animate(target,[{transform:"translateY(0) rotate(0) scale(1)",opacity:1,filter:"saturate(1)"},
      {transform:"translateY(12px) rotate(-6deg) scale(1.04)",opacity:.98,offset:.32},
      {transform:"translateY(58px) rotate(-14deg) scale(.67)",opacity:0,filter:"saturate(.45)"}],TOKENS.death,{},run);
    target.style.visibility="hidden";
    record(label,"death-end");
   }
   record(label,"end");
  }
  async function move(old,cue,run){
   const actor=unit(old,cue.actorId);
   const newer=unit(app,cue.actorId);
   if(!actor||!newer)return;
   const a=actor.getBoundingClientRect(),b=newer.getBoundingClientRect();
   const dx=b.left-a.left,dy=b.top-a.top;
   beep("paper");
   await animate(actor,[{transform:"translate(0,0) scale(1)"},
     {transform:"translate("+dx*.55+"px,"+(dy*.55-15)+"px) scale(1.065)",offset:.55},
     {transform:"translate("+dx+"px,"+dy+"px) scale(1)"}],TOKENS.cardSwap,{},run);
  }
  async function redraw(old,run){
   const hand=old?.querySelectorAll(".battle-bottom .hand>button")||[];
   beep("paper");
   for(let i=0;i<hand.length;i++){
    animate(hand[i],[{transform:"translateY(0) scale(1)",opacity:1},
      {transform:"translate(-70px,22px) scale(.42)",opacity:0}],TOKENS.redraw*.57,{},run);
   }
   await wait(TOKENS.redraw*.6,run);
   beep("bell");
  }
  async function reinforce(old,cue,run){
   const newCard=unit(app,cue.actorId);
   if(!newCard)return;
   const rect=newCard.getBoundingClientRect();
   const side=cue.side==="friendly"?-1:1;
   const clone=newCard.cloneNode(true);clone.classList.add("motion-new-entrant");
   clone.style.position="fixed";clone.style.left=rect.left+"px";clone.style.top=rect.top+"px";
   clone.style.width=rect.width+"px";clone.style.height=rect.height+"px";
   old.append(clone);
   newCard.style.visibility="hidden";
   beep("paper");
   await animate(clone,[{transform:"translateX("+(side*84)+"px) translateY(-14px) rotate("+(side*9)+"deg) scale(.83)",opacity:0},
     {transform:"translateX(-4px) translateY(-4px) rotate(-2deg) scale(1.055)",opacity:1,offset:.82},
     {transform:"translate(0) rotate(0) scale(1)",opacity:1}],TOKENS.summon,{},run);
   newCard.style.visibility="";clone.remove();
  }
  async function recall(old,cue,run){
   const card=unit(old,cue.actorId);
   if(!card)return;
   beep("paper");
   await animate(card,[{transform:"translate(0,0) rotate(0) scale(1)",opacity:1},
     {transform:"translate(-35px,-14px) rotate(-7deg) scale(.9)",opacity:1,offset:.4},
     {transform:"translate(-110px,64px) rotate(-16deg) scale(.25)",opacity:0}],380,{},run);
   card.style.visibility="hidden";
  }
  async function travel(old,cue,run){
   const options=[...old.querySelectorAll(".map-node.is-current")];
   const node=options[cue.branch]||options[0];
   if(!node){await wait(180,run);return}
   beep("paper");
   await animate(node,[{transform:"translateY(0) scale(1)",filter:"brightness(1)"},
    {transform:"translateY(-9px) scale(1.14)",filter:"brightness(1.5)",offset:.35},
    {transform:"translateY(-3px) scale(1.04)",filter:"brightness(1.15)"}],430,{},run);
  }
  async function reward(old,cue,run){
   const options=[...old.querySelectorAll('.choice-row [data-act="claim"]')];
   const item=options[cue.index]||options[0];
   beep("paper");
   if(item)await animate(item,[{transform:"translate(0,0) rotate(0) scale(1)",opacity:1},
     {transform:"translateY(-22px) rotate(-3deg) scale(1.12)",opacity:1,offset:.38},
     {transform:"translate(-95px,-105px) rotate(-12deg) scale(.22)",opacity:0}],520,{},run);
   else await wait(260,run);
   beep("win");
  }
  async function depart(old,cue,run){
   const hero=[...old.querySelectorAll('[data-act="leader"]')].find(n=>n.dataset.id===cue.heroId);
   if(hero){
    beep("paper");
    await animate(hero,[{transform:"translateY(0) scale(1)",opacity:1},
     {transform:"translateY(-25px) rotate(2deg) scale(1.075)",opacity:1,offset:.46},
     {transform:"translateY(-70px) scale(.65)",opacity:0}],370,{},run);
   }
  }
  async function itemSupport(old,cue,run){
   const card=(cue.cardKey?old?.querySelector('.battle-bottom .hand>button[data-card-key="'+cssEscape(cue.cardKey)+'"]'):null)||old?.querySelector(".battle-bottom .hand>button");
   if(card){
    if(cue.cardKey)record("itemSupport","card-source",cue.cardKey);
    beep(cue.kind==="heal"?"win":"paper");
    await animate(card,[{transform:"translateY(0) scale(1)"},{transform:"translateY(-25px) scale(1.08)",offset:.42},
      {transform:"translate(0) scale(.92)",opacity:.2}],250,{},run);
   }else await wait(150,run);
  }
  async function purchase(old,cue,run){
   const shelf=[...old.querySelectorAll('.choice-row [data-act="shopinspect"]')][cue.index];
   if(!shelf){await wait(260,run);return}
   const target=old.querySelector(".choice-currency"),a=shelf.getBoundingClientRect(),b=target?.getBoundingClientRect();
   const dx=(b?.left??a.left)-a.left,dy=(b?.top??a.top)-a.top;
   beep("paper");
   animate(shelf,[{transform:"translate(0,0) scale(1)",opacity:1},
     {transform:"translate("+dx*.43+"px,"+(dy*.4-24)+"px) rotate(-4deg) scale(1.08)",opacity:1,offset:.4},
     {transform:"translate("+dx+"px,"+dy+"px) rotate(11deg) scale(.17)",opacity:0}],TOKENS.shopPurchase*.78,{},run);
   await wait(TOKENS.shopPurchase*.55,run);
   if(target){target.classList.add("motion-coins");}
   beep("buy");
   await wait(TOKENS.shopPurchase*.45,run);
  }
  async function outcome(kind,run,cue={}){
   if(!overlay)return;
   const panel=document.createElement("div");
   panel.className="motion-outcome "+(kind==="victory"?"is-victory":"is-defeat");
   panel.innerHTML=kind==="victory"?"<b>战斗胜利</b><small>夜路平安</small>":"<b>远征失败</b><small>寒夜漫长</small>";
   if(kind==="defeat"&&cue.cause)panel.querySelector("small").textContent=String(cue.cause).slice(0,36);
   overlay.append(panel);
   beep(kind==="victory"?"win":"lose");
   const stage=overlay.querySelector(".motion-snapshot");
   if(kind==="victory"){
    const otherFoes=[...(stage?.querySelectorAll(".battle-unit.enemy")||[])].filter(el=>el.style.visibility!=="hidden");
    otherFoes.forEach((n,i)=>animate(n,[{transform:"translateX(0) scale(1)",opacity:1},
     {transform:"translateX(60px) rotate(8deg) scale(.86)",opacity:0}],280+i*45,{},run));
    const gold=stage?.querySelector(".header .stat:last-of-type");
    if(gold){
     const dest=midpoint(gold.getBoundingClientRect()),base={x:innerWidth*.52,y:innerHeight*.42};
     for(let i=0;i<Math.min(5,Math.max(2,Math.ceil((cue.gold||30)/20)));i++){
      const coin=document.createElement("span");coin.className="motion-flying-coin";
      coin.textContent="◈";coin.style.left=base.x+"px";coin.style.top=base.y+"px";overlay.append(coin);
      const dx=dest.x-base.x,dy=dest.y-base.y;
      animate(coin,[{opacity:0,transform:"translate(0,0) scale(.8)"},
       {opacity:1,transform:"translate("+(dx*.48)+"px,"+(dy*.48-35)+"px) scale(1.13)",offset:.5},
       {opacity:0,transform:"translate("+dx+"px,"+dy+"px) scale(.25)"}],550+i*70,{},run).then(()=>coin.remove());
     }
    }
   }else if(stage)animate(stage,[{filter:"saturate(1) brightness(1)"},
    {filter:"saturate(.55) brightness(.74)"}],400,{},run);
   await animate(panel,[{opacity:0,transform:"translate(-50%,-40%) scale(.91)"},
    {opacity:1,transform:"translate(-50%,-50%) scale(1.045)",offset:.45},
    {opacity:1,transform:"translate(-50%,-50%) scale(1)"}],TOKENS.result*.65,{},run);
   await wait(TOKENS.result*.4,run);
  }
  async function revealBattle(run){
   const scene=app.querySelector(".battle-scene");
   if(!scene)return;
   const friends=[...scene.querySelectorAll(".battle-unit.friendly")];
   const foes=[...scene.querySelectorAll(".battle-unit.enemy")];
   const hand=[...scene.querySelectorAll(".battle-bottom .hand>button")];
   const actions=[];
   foes.forEach((el,i)=>actions.push(animate(el,[{opacity:0,transform:"translateX(55px) rotate(7deg) scale(.84)"},
      {opacity:1,transform:"translate(0) rotate(0) scale(1)"}],340+i*55,{},run)));
   friends.forEach((el,i)=>actions.push(animate(el,[{opacity:0,transform:"translateX(-65px) rotate(-6deg) scale(.83)"},
      {opacity:1,transform:"translate(0) rotate(0) scale(1)"}],440+i*65,{},run)));
   hand.forEach((el,i)=>actions.push(animate(el,[{opacity:0,transform:"translateY(70px) rotate(-7deg) scale(.72)"},
      {opacity:1,transform:"translateY(0) rotate(0) scale(1)"}],420+i*60,{},run)));
   await Promise.all(actions);
  }
  async function play(snapshot,result,nextView){
   // Rule state already committed; the layer is exclusively visual.
   const cues=Array.isArray(result?.visualEvents)?result.visualEvents:[];
   const changing=!!snapshot?.scene&&snapshot.view!==(app.querySelector(".scene")?.dataset.scene||"");
   if(!cues.length&&!changing)return;
   if(busy)skip();
   busy=true;skipped=false;const run=++token;onChange(true);
   record("transaction","begin",cues.map(x=>x.type).join(","));
   const layer=rootNode();
   const old=placeOldScene(snapshot);
   const incoming=app.querySelector(".scene");
   const sameBattle=nextView==="battle"&&snapshot?.view?.startsWith("battle-scene");
   // Snapshot deliberately covers the just-rendered committed scene while
   // sequential events advance; no new rule mutation occurs during the clips.
   if(changing&&incoming)incoming.classList.add("motion-entering");
   try{
    if(old)for(const cue of cues){
     if(skipped||run!==token)break;
     if(cue.type==="attack"||cue.type==="itemHit")await attack(old,cue,run);
     else if(cue.type==="frozen"){const card=unit(old,cue.actorId);if(card)await animate(card,[{filter:"saturate(1)"},{filter:"saturate(.3) brightness(1.27)"},{filter:"saturate(1)"}],220,{},run);}
     else if(cue.type==="move")await move(old,cue,run);
     else if(cue.type==="redraw")await redraw(old,run);
     else if(cue.type==="reinforcement"||cue.type==="summon")await reinforce(old,cue,run);
     else if(cue.type==="recall")await recall(old,cue,run);
     else if(cue.type==="itemSupport")await itemSupport(old,cue,run);
     else if(cue.type==="mapTravel")await travel(old,cue,run);
     else if(cue.type==="reward")await reward(old,cue,run);
     else if(cue.type==="depart")await depart(old,cue,run);
     else if(cue.type==="mapReturn"||cue.type==="battleExit")await wait(190,run);
     else if(cue.type==="shopPurchase")await purchase(old,cue,run);
     else if(cue.type==="victory"||cue.type==="defeat")await outcome(cue.type,run,cue);
    }
    if(!skipped&&run===token){
     if(old)await animate(old,[{opacity:1},{opacity:0}],changing?TOKENS.scene:115,{},run);
     if(old)old.remove();
     if(changing&&incoming){
      incoming.classList.remove("motion-entering");
      if(nextView==="battle")await revealBattle(run);
     }else if(nextView==="battle"&&cues.some(c=>c.type==="redraw")){
      const hand=[...app.querySelectorAll(".battle-bottom .hand>button")];
      await Promise.all(hand.map((el,i)=>animate(el,[{opacity:0,transform:"translateY(36px) scale(.8)"},
       {opacity:1,transform:"translateY(0) scale(1)"}],240+i*34,{},run)));
     }
    }
   }catch(e){lastError=String(e);record("director","error",lastError);}
   finally{
    if(run===token){
     incoming?.classList.remove("motion-entering");
     for(const node of app.querySelectorAll(".battle-unit"))node.style.visibility="";
     removeOverlay();busy=false;onChange(false);record("transaction","end");
    }
   }
  }
  return Object.freeze({
   capture,play,skipToSafeCheckpoint:skip,isBusy:()=>busy,
   setSpeed:v=>{if([.5,1,1.5,2].includes(v))speed=v;return speed},
   speed:()=>speed,tokens:TOKENS,trace:()=>marks.slice(),lastError:()=>lastError,
   reduced:prefersReduced,beep
  });
 }
 root.PaperchalkMotion=Object.freeze({create,TOKENS});
})(window);