/* Deterministic NPC brain: perception + memory + needs + schedule + utility AI + FSM.
 * It decides goals; navigation/physics execute those goals elsewhere.
 */
(function(global){
'use strict';

function num(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f}
function clamp(v,a=0,b=1){return Math.max(a,Math.min(b,v))}
function hashText(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function copyPos(p){return p?{x:num(p.x),y:num(p.y),z:num(p.z)}:null}
function minuteIn(m,start,end){m=((num(m)%1440)+1440)%1440;return start<=end?m>=start&&m<end:m>=start||m<end}

function createBrain(def={}){
  let seed=(hashText(def.id||'npc')||1)|0;
  const ai=def.ai||{},personality=def.personality||{};
  const memory=[],relationship={trust:num(def.relationship?.trust,.05),familiarity:0,fear:0};
  const needs={
    hunger:clamp(num(def.needs?.hunger,.12)),
    fatigue:clamp(num(def.needs?.fatigue,.10)),
    social:clamp(num(def.needs?.social,.22)),
    safety:clamp(num(def.needs?.safety,0))
  };
  let state='idle',goal='idle',lastGoal='idle',scheduleSlot='free',target=null;
  let nextThink=0,lastDecision=0,offscreen=false,wanderIndex=0,simTime=0;
  let perception={playerVisible:false,playerDistance:Infinity,lastSeenAge:Infinity,heardThreat:false};

  function random(){
    seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;
  }
  function remember(type,data={},ttl=30){
    const now=simTime;
    const existing=memory.find(m=>m.type===type&&m.key===(data.key||''));
    const item={type,key:data.key||'',time:now,expires:now+ttl,...data};
    if(existing)Object.assign(existing,item);else memory.push(item);
    while(memory.length>18)memory.shift();
    return item;
  }
  function forget(){for(let i=memory.length-1;i>=0;i--)if(memory[i].expires<=simTime)memory.splice(i,1)}
  function recall(type){for(let i=memory.length-1;i>=0;i--)if(memory[i].type===type)return memory[i];return null}

  function sense(ctx){
    const player=ctx.player;
    let visible=false,d=Infinity;
    if(player){
      d=Math.hypot(num(player.x)-num(ctx.actor.transform.x),num(player.z)-num(ctx.actor.transform.z));
      const eye={x:ctx.actor.transform.x,y:ctx.actor.transform.y+.45,z:ctx.actor.transform.z};
      const targetEye={x:player.x,y:num(player.y)+.35,z:player.z};
      if(d<=num(ai.visionRange,8.5)){
        const inFront=d<2.2||Math.sign(num(player.x)-num(ctx.actor.transform.x))===ctx.actor.actor.facingX;
        visible=inFront&&ctx.nav.lineOfSight(eye,targetEye);
      }
      if(visible)remember('player-seen',{position:copyPos(player),distance:d},12);
    }
    let heard=false;
    for(const stimulus of ctx.stimuli||[]){
      const sd=Math.hypot(num(stimulus.x)-num(ctx.actor.transform.x),num(stimulus.z)-num(ctx.actor.transform.z));
      if(sd<=num(stimulus.radius,6)){
        remember('stimulus',{key:stimulus.type||'sound',position:copyPos(stimulus),kind:stimulus.type||'sound',distance:sd},num(stimulus.ttl,8));
        if(stimulus.threat){heard=true;needs.safety=clamp(needs.safety+.45);relationship.fear=clamp(relationship.fear+.08)}
      }
    }
    const lastSeen=recall('player-seen');
    perception={playerVisible:visible,playerDistance:d,lastSeenAge:lastSeen?simTime-lastSeen.time:Infinity,heardThreat:heard};
  }

  function updateNeeds(dt,minutes){
    const activeDay=minuteIn(minutes,360,1260);
    needs.hunger=clamp(needs.hunger+dt*(activeDay ? .00075 : .00035));
    needs.fatigue=clamp(needs.fatigue+dt*(activeDay ? .00062 : -.0014));
    needs.social=clamp(needs.social+dt*.00048);
    needs.safety=clamp(needs.safety-dt*.022);
    relationship.fear=clamp(relationship.fear-dt*.002);
  }

  function schedule(minutes){
    const authored=Array.isArray(def.schedule)?def.schedule:[];
    for(const slot of authored){
      if(minuteIn(minutes,num(slot.start),num(slot.end)))return slot;
    }
    if(minuteIn(minutes,1260,360))return {id:'sleep',goal:'rest',place:'home'};
    if(minuteIn(minutes,360,480))return {id:'morning',goal:'socialize',place:'plaza'};
    if(minuteIn(minutes,480,1020))return {id:'work',goal:'work',place:'work'};
    if(minuteIn(minutes,1020,1200))return {id:'evening',goal:'socialize',place:'plaza'};
    return {id:'home',goal:'home',place:'home'};
  }

  function anchor(name){
    const p=def[name]||def.anchors?.[name]||def.spawn;
    return p?{x:num(p.x),z:num(p.z),y:Number.isFinite(Number(p.y))?Number(p.y):undefined}:null;
  }
  function wanderTarget(){
    const home=anchor('home')||anchor('spawn')||{x:0,z:0};
    const angle=(wanderIndex++*.93+random()*1.7),radius=1.8+random()*num(ai.wanderRadius,4.2);
    return {x:home.x+Math.cos(angle)*radius,z:home.z+Math.sin(angle)*radius};
  }
  function awayFromPlayer(ctx){
    const p=ctx.player,a=ctx.actor.transform,dx=num(a.x)-num(p?.x,a.x-1),dz=num(a.z)-num(p?.z,a.z);
    const m=Math.hypot(dx,dz)||1,home=anchor('home')||a;
    return {x:a.x+dx/m*5+(home.x-a.x)*.15,z:a.z+dz/m*5+(home.z-a.z)*.15};
  }

  function choose(ctx){
    const slot=schedule(ctx.worldMinutes),visible=perception.playerVisible;
    scheduleSlot=slot.id||slot.goal||'free';
    const threat=clamp(needs.safety+relationship.fear+(perception.heardThreat ? .3 : 0));
    const scores={
      flee:threat*.98,
      eat:needs.hunger*.74,
      rest:needs.fatigue*.82+(slot.goal==='rest' ? .28 : 0),
      socialize:needs.social*.62+(slot.goal==='socialize' ? .30 : 0)+(visible&&perception.playerDistance<3.2 ? .22 : 0),
      observe:visible&&perception.playerDistance<5.5 ? .48 : 0,
      work:slot.goal==='work' ? .58*(1-Math.max(needs.hunger,needs.fatigue)*.55) : 0,
      home:slot.goal==='home' ? .45 : 0,
      wander:.15+num(personality.curiosity,.4)*.12
    };
    let pick='wander',best=-1;
    for(const [k,v] of Object.entries(scores))if(v>best){best=v;pick=k}
    lastGoal=goal;goal=pick;lastDecision=simTime;
    if(goal==='flee')target=awayFromPlayer(ctx);
    else if(goal==='eat'||goal==='rest'||goal==='home')target=anchor('home');
    else if(goal==='work')target=anchor('work')||anchor('home');
    else if(goal==='socialize')target=(visible&&perception.playerDistance<5)?copyPos(ctx.player):(anchor('plaza')||anchor('home'));
    else if(goal==='observe')target=null;
    else target=wanderTarget();
    state=goal==='observe'?'observe':goal==='flee'?'flee':target?'navigate':'idle';
    return {scores,pick,best,slot};
  }

  function satisfyAtTarget(dt){
    if(goal==='eat')needs.hunger=clamp(needs.hunger-dt*.17);
    if(goal==='rest')needs.fatigue=clamp(needs.fatigue-dt*.20);
    if(goal==='socialize')needs.social=clamp(needs.social-dt*.16);
    if(goal==='work')needs.social=clamp(needs.social-dt*.018);
  }

  function tick(ctx){
    const dt=Math.max(0,Math.min(.5,num(ctx.dt))),player=ctx.player;
    simTime+=dt;forget();updateNeeds(dt,ctx.worldMinutes);
    const distance=player?Math.hypot(num(player.x)-num(ctx.actor.transform.x),num(player.z)-num(ctx.actor.transform.z)):Infinity;
    offscreen=distance>num(ai.fullSimRange,26);
    const senseRate=offscreen?1.0:.16,thinkRate=offscreen?2.0:.45;
    ctx.actor.brainSense=(ctx.actor.brainSense||0)-dt;
    if(ctx.actor.brainSense<=0){ctx.actor.brainSense=senseRate;sense(ctx)}
    nextThink-=dt;
    if(nextThink<=0||goal==='idle'){
      nextThink=thinkRate*(.85+random()*.3);choose(ctx);
    }
    if(state==='observe'&&player){
      const dx=num(player.x)-num(ctx.actor.transform.x);if(Math.abs(dx)>.05)ctx.actor.actor.facingX=dx<0?-1:1;
      ctx.actor.actor.action='attentive';ctx.actor.actor.moving=false;
    }
    const atTarget=target&&Math.hypot(num(target.x)-num(ctx.actor.transform.x),num(target.z)-num(ctx.actor.transform.z))<.72;
    if(atTarget){
      state=goal==='rest'?'rest':goal==='work'?'work':goal==='socialize'?'social':'idle';
      target=null;satisfyAtTarget(dt);
    }
    return {state,goal,target:target?{...target}:null,offscreen,perception:{...perception},scheduleSlot};
  }

  function onInteract(player){
    relationship.familiarity=clamp(relationship.familiarity+.12);
    relationship.trust=clamp(relationship.trust+.035);
    needs.social=clamp(needs.social-.28);
    remember('player-talked',{position:copyPos(player)},300);
    state='social';goal='socialize';nextThink=Math.max(nextThink,1.5);
    return relationship;
  }
  function addMemory(type,data,ttl){return remember(type,data,ttl)}
  function setNeed(name,value){if(name in needs)needs[name]=clamp(value);return needs[name]}
  function snapshot(){
    return {
      state,goal,lastGoal,scheduleSlot,offscreen,target:target?{...target}:null,
      needs:{...needs},relationship:{...relationship},perception:{...perception},
      memory:memory.slice(-6).map(m=>({type:m.type,key:m.key,time:m.time,kind:m.kind,position:m.position?{...m.position}:undefined})),
      utilityAI:true,fsm:true,perceptionSystem:true,memorySystem:true,needsSystem:true,scheduleSystem:true,socialSystem:true
    };
  }
  function exportState(){return {seed,needs:{...needs},relationship:{...relationship},memory:memory.slice(-12),state,goal,lastGoal,scheduleSlot,target,simTime,wanderIndex}}
  function importState(data){
    if(!data||typeof data!=='object')return false;
    seed=num(data.seed,seed)|0;Object.assign(needs,data.needs||{});Object.assign(relationship,data.relationship||{});
    memory.length=0;for(const m of Array.isArray(data.memory)?data.memory.slice(-12):[])memory.push({...m});
    state=String(data.state||state);goal=String(data.goal||goal);lastGoal=String(data.lastGoal||lastGoal);
    scheduleSlot=String(data.scheduleSlot||scheduleSlot);target=data.target?{...data.target}:null;simTime=num(data.simTime,simTime);wanderIndex=num(data.wanderIndex,wanderIndex);
    return true;
  }
  return Object.freeze({tick,onInteract,addMemory,setNeed,snapshot,exportState,importState});
}

global.PaperchalkNPCAI=Object.freeze({version:1,createBrain});
})(window);
