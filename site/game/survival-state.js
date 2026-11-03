/* Paperchalk World / Survival State v1
 * One authoritative numerical model for combat health, hunger and sanity.
 * Time costs are based on active play time; no fabricated random drift and
 * no offline penalties while the page is closed or in the background.
 * Browser global + CommonJS export for deterministic automated tests.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(root)root.PAPERWORLD_SURVIVAL_STATE=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:null,function(){
  'use strict';
  const VERSION=1,KEY='paperchalk-survival-state-v1';
  const STAT_KEYS=Object.freeze(['health','hunger','sanity']);
  const DEFAULT_MAX=100;
  const MINUTE=60000;
  const RATES=Object.freeze({
    hungerPerActiveMinute:.25,       // 1 point every four minutes of play
    healthPerStarvingMinute:.5       // health is harmed only when food reaches 0
  });
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const safe=(n,fallback)=>Number.isFinite(n)?n:fallback;
  const makeStats=()=>Object.fromEntries(STAT_KEYS.map(k=>[k,{current:DEFAULT_MAX,max:DEFAULT_MAX}]));
  function create(options={}){
    const storage=options.storage||null;
    let stats=makeStats(),activeMs=0,dirtyMs=0;
    const listeners=new Set();
    function load(){
      if(!storage)return;
      try{
        const raw=JSON.parse(storage.getItem(KEY)||'null');
        if(raw?.version!==VERSION||!raw.stats)return;
        for(const key of STAT_KEYS){
          const v=raw.stats[key];
          if(!v||!Number.isFinite(v.max)||v.max<=0)return;
          const max=clamp(Math.round(v.max),1,99999);
          stats[key]={current:clamp(safe(v.current,max),0,max),max};
        }
        activeMs=clamp(safe(raw.activeMs,0),0,Number.MAX_SAFE_INTEGER);
      }catch(_){/* storage can be blocked by browser privacy settings */}
    }
    function persist(){
      if(!storage)return false;
      try{
        storage.setItem(KEY,JSON.stringify({version:VERSION,stats,activeMs}));
        dirtyMs=0;return true;
      }catch(_){return false}
    }
    function snapshot(){
      return Object.freeze({
        version:VERSION,
        stats:Object.fromEntries(STAT_KEYS.map(k=>[k,Object.freeze({...stats[k]})])),
        activeMs,
        rates:{...RATES}
      });
    }
    function notify(source){
      const snap=snapshot();
      for(const fn of listeners){
        try{fn(snap,source)}catch(_){/* isolated observers cannot stop simulation */}
      }
    }
    function subscribe(fn){
      if(typeof fn!=='function')throw new TypeError('Listener must be a function');
      listeners.add(fn);return ()=>listeners.delete(fn);
    }
    function advance(activeElapsedMs){
      if(!Number.isFinite(activeElapsedMs)||activeElapsedMs<=0)return false;
      const elapsed=clamp(activeElapsedMs,0,3600000);
      const minutes=elapsed/MINUTE;
      const before=stats.hunger.current;
      const hungerCost=RATES.hungerPerActiveMinute*minutes;
      stats.hunger.current=clamp(before-hungerCost,0,stats.hunger.max);
      // Accurate starvation crossing, including a frame in which hunger
      // reaches zero halfway through the elapsed time interval.
      const minutesUntilEmpty=RATES.hungerPerActiveMinute>0?
        before/RATES.hungerPerActiveMinute:Infinity;
      const starvingMinutes=Math.max(0,minutes-minutesUntilEmpty);
      if(starvingMinutes>0){
        stats.health.current=clamp(
          stats.health.current-starvingMinutes*RATES.healthPerStarvingMinute,
          0,stats.health.max);
      }
      activeMs+=elapsed;dirtyMs+=elapsed;
      if(dirtyMs>=10000)persist();
      notify('time');
      return true;
    }
    function setStats(patch){
      if(!patch||typeof patch!=='object')return false;
      let changed=false;
      for(const key of STAT_KEYS){
        const update=patch[key];
        if(!update||typeof update!=='object')continue;
        const prev=stats[key];
        const max=Number.isFinite(update.max)&&update.max>0?
          clamp(Math.round(update.max),1,99999):prev.max;
        const current=clamp(safe(update.current,prev.current),0,max);
        if(current!==prev.current||max!==prev.max){
          stats[key]={current,max};changed=true;
        }
      }
      if(changed){persist();notify('set')}
      return changed;
    }
    // All changes have a gameplay cause. No automatic or random sanity loss:
    // scripts and combat explicitly dispatch events with a concrete amount.
    function apply(event){
      if(!event||typeof event!=='object')return false;
      const amount=safe(event.amount,NaN);
      if(!Number.isFinite(amount)||amount<=0)return false;
      const delta=clamp(amount,0,99999);
      let key=null,direction=1;
      switch(event.type){
        case 'damage':key='health';direction=-1;break;
        case 'heal':key='health';break;
        case 'eat':key='hunger';break;
        case 'exert':key='hunger';direction=-1;break;
        case 'stress':key='sanity';direction=-1;break;
        case 'recover-sanity':key='sanity';break;
        default:return false;
      }
      const previous=stats[key].current;
      stats[key].current=clamp(previous+direction*delta,0,stats[key].max);
      if(stats[key].current===previous)return false;
      persist();notify(event.type);
      return true;
    }
    function reset(){
      stats=makeStats();activeMs=0;dirtyMs=0;persist();notify('reset');
    }
    load();
    return Object.freeze({snapshot,subscribe,advance,setStats,apply,reset,persist});
  }
  return Object.freeze({VERSION,KEY,RATES,STAT_KEYS,create});
});
