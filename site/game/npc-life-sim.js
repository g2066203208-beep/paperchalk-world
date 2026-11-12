/* Paperchalk World — persistent NPC lives. World time, never random scene spawns.
 * Every identity has ONE position and at most ONE active route leg.
 * Routes are logical street/transit links, not authored sidewalk navmeshes.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(root)root.PaperWorldNpcLife=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const KEY='paperchalk-npc-lives-v1',VERSION=1,MINUTES_DAY=1440;
 const DEFINITIONS=Object.freeze([
  {id:'NPC-G001',name:'结伴出行的三位女同学',members:['NPC-G001-A','NPC-G001-B','NPC-G001-C'],kind:'student',home:'kirihama-07',interest:['rumor','festival','social','concert'],image:null,artStatus:'rejected-needs-redesign'},
  {id:'female2',name:'女二',kind:'student',home:'kirihama-07',interest:['school','rumor','social']},
  {id:'classmate',name:'同班同学',kind:'student',home:'kirihama-07',interest:['school','social']},
  {id:'neighbor',name:'邻居',kind:'resident',home:'kirihama-07',interest:['social','festival','rumor']}
 ]);
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function hash(s){let h=2166136261;for(const c of String(s)){h=Math.imul(h^c.charCodeAt(0),16777619)}return h>>>0}
 const abs=s=>(Math.max(1,s.day)-1)*MINUTES_DAY+Math.max(0,s.minute);
 function create({engine,storage=null,atlas=null,metro=null,actors=DEFINITIONS}={}){
  if(!engine||typeof engine.snapshot!=='function')throw Error('NPC life requires game clock');
  atlas=atlas||(typeof window!=='undefined'?window.PaperWorldAtlas:null);
  metro=metro||(typeof window!=='undefined'?window.PaperWorldMetro:null);
  const Core=typeof window!=='undefined'?window.PaperWorldDailyLife:null;
  const locs=Core?.LOCATIONS||{};
  const nodes=new Map();
  for(const p of atlas?.POIS||[])nodes.set(p.id,{id:p.id,city:p.city,x:p.x,y:p.y,public:p.kind!=='home'});
  for(const city of atlas?.CITIES||[])nodes.set('hub-'+city.id,{id:'hub-'+city.id,city:city.id,x:city.x,y:city.y,public:false});
  const p=nodes.get('station');
  const cityHome=nodes.get('entrance')||{city:'kirihama',x:980,y:573};
  for(const id of ['central','northgate'])if(!nodes.has(id))
   nodes.set(id,{id,city:'kirihama',x:(p?.x||cityHome.x)+(id==='northgate'?-35:0),y:(p?.y||cityHome.y)+(id==='northgate'?-60:0),public:true});
  const byCity=new Map();
  for(const node of nodes.values())if(node.city){
   if(!byCity.has(node.city))byCity.set(node.city,[]);
   byCity.get(node.city).push(node);
  }
  const links=new Map([...nodes.keys()].map(id=>[id,[]]));
  function addEdge(a,b,minutes,mode='walk'){
   if(a===b||!nodes.has(a)||!nodes.has(b))return;
   const duration=Math.max(2,Math.round(minutes));
   links.get(a).push({to:b,minutes:duration,mode});
   links.get(b).push({to:a,minutes:duration,mode});
  }
  // Local edges connect neighbouring map landmarks; hubs ensure reachability.
  for(const [city,items] of byCity){
   const hub='hub-'+city;
   for(const a of items)if(a.id!==hub){
    const candidates=items.filter(b=>b.id!==a.id&&b.id!==hub)
     .map(b=>({b,d:Math.hypot(a.x-b.x,a.y-b.y)})).sort((x,y)=>x.d-y.d);
    for(const entry of candidates.slice(0,4))addEdge(a.id,entry.b.id,entry.d/15,'walk');
    if(nodes.has(hub))addEdge(a.id,hub,Math.hypot(a.x-nodes.get(hub).x,a.y-nodes.get(hub).y)/14,'walk');
   }
  }
  // Real intra-city subway legs. A traveller only appears in the player's
  // carriage when their timed line+direction+origin leg matches that train.
  // No invented subway service to other cities or instantaneous station hops.
  if(metro?.LINES){
   for(const line of metro.LINES){
    if(line.locked||!Array.isArray(line.stops))continue;
    const n=line.stops.length;
    for(let i=0;i<n;i++){
     for(const dir of [-1,1]){
      const next=i+dir,at=(next+n)%n;
      if(!line.ring&&(next<0||next>=n))continue;
      const from=line.stops[i],to=line.stops[at];
      if(!nodes.has(from)||!nodes.has(to))continue;
      // Normal train trip between stations takes five game minutes.
      const edge={to,minutes:5,mode:'metro',lineId:line.id,direction:dir};
      links.get(from).push(edge);
     }
    }
   }
  }
  // Intercity legs use the existing authored atlas transport network.
  for(const city of atlas?.CITIES||[])for(const edge of atlas.connections?.(city.id)||[]){
   if(nodes.has('hub-'+city.id)&&nodes.has('hub-'+edge.to))
    addEdge('hub-'+city.id,'hub-'+edge.to,edge.minutes,edge.line?.mode||'regional');
  }
  function route(from,to){
   if(!nodes.has(from)||!nodes.has(to))return null;
   if(from===to)return [];
   const dist=new Map([[from,0]]),prev=new Map(),open=[from],done=new Set();
   while(open.length){
    open.sort((a,b)=>(dist.get(a)??Infinity)-(dist.get(b)??Infinity));
    const cur=open.shift();if(done.has(cur))continue;
    if(cur===to)break;done.add(cur);
    for(const edge of links.get(cur)||[]){
     const newDist=dist.get(cur)+edge.minutes;
     if(newDist<(dist.get(edge.to)??Infinity)){
      dist.set(edge.to,newDist);prev.set(edge.to,{from:cur,...edge});open.push(edge.to);
     }
    }
   }
   if(!prev.has(to))return null;
   const path=[];let at=to;
   while(at!==from){
    const edge=prev.get(at);if(!edge)return null;
    path.unshift({from:edge.from,to:at,minutes:edge.minutes,mode:edge.mode,
     ...(edge.lineId?{lineId:edge.lineId,direction:edge.direction}: {})});at=edge.from;
   }
   return path;
  }
  const cast=actors.filter(a=>nodes.has(a.home)).map(a=>({...a,interest:a.interest||[]}));
  const initialActor=a=>({id:a.id,node:a.home,leg:null,queue:[],
   target:a.home,activity:'home',intention:'home',lastIntent:'',lastEvent:''});
  function fresh(){
   return {version:VERSION,time:0,
    actors:Object.fromEntries(cast.map(a=>[a.id,initialActor(a)])),events:[]};
  }
  let state=fresh();
  if(storage)try{
   const old=JSON.parse(storage.getItem(KEY)||'null');
   if(old?.version===VERSION&&old.actors&&Number.isFinite(old.time)&&old.time>=0&&
      cast.every(a=>old.actors[a.id]&&nodes.has(old.actors[a.id].node)))
    state=old;
  }catch(_){}
  function persist(){if(!storage)return false;try{storage.setItem(KEY,JSON.stringify(state));return true}catch(_){return false}}
  const isHoliday=day=>{
   const d=Core?.dayDate?.(day)||new Date(Date.UTC(2026,3,12+day));
   const weekday=d.getUTCDay(),month=d.getUTCMonth()+1;
   return weekday===0||weekday===6||month===7||month===8;
  };
  function agenda(def,day){
   const holiday=isHoliday(day),pick=hash(def.id+'/'+day);
   const outing=['school','central','entrance'][pick%3];
   if(def.kind==='student'){
    return holiday?
     [{start:0,to:def.home,activity:'home'},
      {start:9*60+Math.floor(pick%32),to:outing,activity:'leisure'},
      {start:15*60,to:pick%2?'central':'entrance',activity:'leisure'},
      {start:18*60+10,to:def.home,activity:'home'}]:
     [{start:0,to:def.home,activity:'home'},
      {start:6*60+45,to:'school',activity:'class'},
      {start:15*60+15,to:outing,activity:'leisure'},
      {start:18*60+30,to:def.home,activity:'home'}];
   }
   if(def.kind==='worker')return [{start:0,to:def.home,activity:'home'},
    {start:6*60,to:def.work,activity:'work'},
    {start:15*60+30,to:pick%2?'central':'entrance',activity:'leisure'},
    {start:18*60,to:def.home,activity:'home'}];
   return [{start:0,to:def.home,activity:'home'},
    {start:9*60,to:pick%2?'school':'central',activity:'errand'},
    {start:16*60,to:'entrance',activity:'walk'},
    {start:19*60,to:def.home,activity:'home'}];
  }
  function selectIntent(def,actor,time){
   const day=Math.floor(time/MINUTES_DAY)+1,minute=time%MINUTES_DAY;
   const tasks=agenda(def,day),task=tasks.filter(t=>t.start<=minute).at(-1)||tasks[0];
   // No attraction to unknown/unreachable events; no instant travel to a rumour.
   const events=state.events.filter(e=>e.at<=time&&time<e.until&&nodes.has(e.place)&&
    (def.interest.includes(e.kind)||e.kind==='urgent')&&(e.kind!=='urgent'||e.severity>=2));
   const interested=events.filter(e=>
    e.kind==='urgent'||hash(def.id+'/'+e.id)%100<(e.strength??65));
   interested.sort((a,b)=>(b.severity||0)-(a.severity||0)||a.at-b.at);
   for(const e of interested){
    const path=route(actor.leg?.to||actor.node,e.place);
    if(path&&time+path.reduce((n,l)=>n+l.minutes,0)<e.until)
     return {to:e.place,activity:e.kind==='urgent'?'safety':'investigate',key:'event:'+e.id,event:e.id};
   }
   return {to:nodes.has(task.to)?task.to:def.home,activity:task.activity,key:'day:'+day+':'+task.start,event:''};
  }
  function moveOne(actor,def,time){
   if(actor.leg&&time>=actor.leg.ends){
    actor.node=actor.leg.to;actor.leg=null;
   }
   if(actor.leg)return;
   const want=selectIntent(def,actor,time);
   if(actor.target!==want.to||actor.lastIntent!==want.key){
    actor.target=want.to;actor.activity=want.activity;actor.intention=want.key;
    actor.lastIntent=want.key;actor.lastEvent=want.event;
    actor.queue=route(actor.node,want.to)||[];
   }
   if(actor.node!==actor.target&&actor.queue.length){
    const leg=actor.queue.shift();
    // Never move a person between two locations without a timed route leg.
    actor.leg={...leg,starts:time,ends:time+leg.minutes};
    actor.activity=leg.mode;
   }else if(actor.node===actor.target){actor.activity=want.activity}
  }
  function advanceTo(when){
   if(!Number.isFinite(when)||when<0)return;
   when=Math.floor(when);
   if(when<state.time){state=fresh()}
   // Engine progresses one in-game day per sleep; large imported save jumps
   // are safely rebuilt from the most recent dawn instead of a huge loop.
   if(when-state.time>MINUTES_DAY*3){
    state=fresh();state.time=Math.floor(when/MINUTES_DAY)*MINUTES_DAY;
   }
   for(let t=state.time+1;t<=when;t++)for(const def of cast)moveOne(state.actors[def.id],def,t);
   state.time=when;
   state.events=state.events.filter(e=>e.until>when);
   persist();
  }
  function get(id){
   const a=state.actors[id];if(!a)return null;
   if(!a.leg)return {id,node:a.node,location:a.node,phase:'staying',activity:a.activity,destination:a.target,route:a.queue.slice(),event:a.lastEvent};
   return {id,node:a.node,location:null,phase:'traveling',activity:a.activity,destination:a.target,
    leg:{...a.leg,progress:clamp((state.time-a.leg.starts)/(a.leg.ends-a.leg.starts),0,1)},
    route:a.queue.slice(),etaMinutes:Math.max(0,a.leg.ends-state.time)+a.queue.reduce((n,l)=>n+l.minutes,0),event:a.lastEvent};
  }
  function present(place){
   return cast.filter(def=>{
    const a=state.actors[def.id];
    return a&&a.node===place&&!a.leg&&place!==def.home&&nodes.get(place)?.public!==false;
   }).map(def=>({...def,...get(def.id)}));
  }
  function publishEvent({id,kind='rumor',place,at=null,until=null,strength=65,severity=1}={}){
   if(!id||!nodes.has(place)||!['rumor','festival','concert','social','urgent','school'].includes(kind))return false;
   const start=at??state.time,end=until??start+180;
   if(end<=start)return false;
   const item={id:String(id).slice(0,100),kind,place,at:start,until:end,
    strength:clamp(Number(strength)||65,0,100),severity:clamp(Number(severity)||1,0,3)};
   const existing=state.events.findIndex(e=>e.id===item.id);
   if(existing>=0)state.events.splice(existing,1);
   state.events.push(item);state.events=state.events.slice(-50);
   persist();return true;
  }
  function sync(snapshot,event){
   if(event==='reset'){state=fresh();storage?.removeItem?.(KEY)}
   advanceTo(abs(snapshot));
   if(event==='metro-rumor'){
    const rumor=snapshot.transitRumors?.at(-1);
    const site=atlas?.SITES?.find(e=>e.id===rumor?.id);
    if(site)publishEvent({id:'rumor-'+rumor.id,kind:'rumor',place:site.place,at:abs(snapshot),until:abs(snapshot)+360});
   }
  }
  const unsub=engine.subscribe((snapshot,event)=>sync(snapshot,event));
  advanceTo(abs(engine.snapshot()));
  function registerActors(definitions=[]){
   if(!Array.isArray(definitions))return [];
   const added=[];
   for(const d of definitions){
    if(!d||typeof d.id!=='string'||!/^[A-Za-z0-9_-]{2,75}$/.test(d.id)||
       !nodes.has(d.home)||!['student','worker','resident'].includes(d.kind)||
       cast.some(x=>x.id===d.id))continue;
    if(d.kind==='worker'&&(!d.work||!nodes.has(d.work)))continue;
    const def={id:d.id,name:String(d.name||d.id).slice(0,90),home:d.home,
     kind:d.kind,work:d.work||null,interest:Array.isArray(d.interest)?
      d.interest.filter(x=>typeof x==='string').slice(0,12):[]};
    cast.push(def);
    // A newly registered person starts physically at home and takes a
    // timed travel leg from the CURRENT game minute. Never appear instantly
    // at school, shop, or a distant event when their art becomes available.
    if(!state.actors[def.id])state.actors[def.id]=initialActor(def);
    moveOne(state.actors[def.id],def,state.time);
    added.push(def.id);
   }
   if(added.length)persist();
   return added;
  }
  const api=Object.freeze({snapshot:()=>JSON.parse(JSON.stringify(state)),get,present,
   where:get,isPresent:(id,place)=>present(place).some(a=>a.id===id),
   publishEvent,advanceTo,route,registerActors,
   reset:()=>{state=fresh();persist();advanceTo(abs(engine.snapshot()))},
   dispose:()=>{persist();unsub()},definitions:cast});
  return api;
 }
 return Object.freeze({VERSION,KEY,DEFINITIONS,create,abs});
});