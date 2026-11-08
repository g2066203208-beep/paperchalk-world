/* Paperchalk Metro — approved civilian identities through a real door cycle.
 * No station-wide random NPC teleport, no duplicate actor across train/platform.
 * The saved NPC route and independent art/scene manifests own every identity.
 * The carriage's existing RAF samples this pure state; no second animation loop.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.PaperWorldMetroCivilianFlow=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
 const smooth=t=>{const x=clamp(t);return x*x*(3-2*x)};
 const CONFIG=Object.freeze({maxPlatform:6,maxCabin:3,boardStartMs:500,boardDurationMs:2250,
  alightStartMs:250,alightDurationMs:1700,minimumDoorDwellMs:3100});
 const slotIds=Object.freeze(['back-left','back-center','back-right']);
 const has=(v,x)=>Array.isArray(v)&&v.includes(x);
 function create({presence,life}={}){
  if(!presence||typeof presence.forMetro!=='function'||typeof presence.get!=='function')
   throw Error('Approved NPC scene presence required');
  if(!life||typeof life.get!=='function')throw Error('Persistent NPC routes required');
  let stop=null,epoch=0,waiting=[],alighting=[],onboard=[];
  const seen=new Set();
  function approved(id){
   const art=presence.get(id);return art&&art.sprites?.front&&art.sprites?.side_left&&
    art.sprites?.back&&art.geometry?.heightMeters?art:null;
  }
  function matchCandidate(row,ride){
   if(!row||!approved(row.id))return false;
   const current=life.get(row.id);
   const leg=current?.leg;
   return current?.phase==='traveling'&&leg?.mode==='metro'&&
    leg.lineId===ride.lineId&&leg.from===ride.station&&leg.direction===ride.direction;
  }
  function probe(ride){
   if(!ride?.station||!ride.lineId||![1,-1].includes(ride.direction))return [];
   return presence.forMetro({station:ride.station,lineId:ride.lineId,
    direction:ride.direction}).filter(p=>matchCandidate(p,ride));
  }
  function dock(ride,{arrival=false}={}){
   if(!ride?.station||!ride.lineId)return false;
   if(stop?.station===ride.station&&stop.lineId===ride.lineId&&
      stop.direction===ride.direction&&stop.arrival===arrival)return false;
   stop={station:ride.station,lineId:ride.lineId,direction:ride.direction,arrival};
   waiting=[];seen.clear();
   for(const p of probe(ride)){
    if(onboard.some(x=>x.id===p.id)||alighting.some(x=>x.id===p.id)||seen.has(p.id))continue;
    waiting.push(p);seen.add(p.id);
    if(waiting.length>=CONFIG.maxPlatform)break;
   }
   epoch++;return true;
  }
  function refreshWaiting(){
   if(!stop)return false;
   if(waiting.length)return false;
   for(const p of probe(stop)){
    if(onboard.some(x=>x.id===p.id)||alighting.some(x=>x.id===p.id))continue;
    waiting.push(p);
    if(waiting.length>=CONFIG.maxPlatform)break;
   }
   return waiting.length>0;
  }
  function depart(){
   for(const p of waiting){
    if(onboard.some(x=>x.id===p.id))continue;
    if(onboard.length>=CONFIG.maxCabin)break;
    onboard.push(p);
   }
   waiting=[];
   alighting=[];
   stop=null;epoch++;
   return onboard.map(x=>x.id);
  }
  function arrive(ride){
   if(!ride?.station)return false;
   // The last leg's destination, not a guessed station billboard, decides
   // who leaves this train. Everyone else retains their cabin identity.
   alighting=onboard.filter(p=>p.leg?.to===ride.station);
   onboard=onboard.filter(p=>p.leg?.to!==ride.station);
   stop=null;
   return dock(ride,{arrival:true});
  }
  function clear(){stop=null;waiting=[];alighting=[];onboard=[];epoch++;seen.clear();}
  function status(){return {epoch,station:stop?.station||null,arrival:stop?.arrival||false,
   waiting:waiting.map(x=>x.id),alighting:alighting.map(x=>x.id),
   onboard:onboard.map(x=>x.id)}}
  function sample({doorOpen=0,doorOpenedEver=false,dwellMs=0,moving=false,stationExposure=1}={}){
   const elapsed=Math.max(0,Number(dwellMs)||0);
   const open=clamp(doorOpen),exposure=clamp(stationExposure);
   const activeDoor=doorOpenedEver&&!moving;
   const platform=[];
   const push=(p,role,i,progress)=>{
    const art=approved(p.id);
    if(!art)return;
    platform.push({id:p.id,role,index:i,progress,art,
     sprites:art.sprites,geometry:art.geometry});
   };
   for(const [i,p] of alighting.entries()){
    const progress=activeDoor?smooth((elapsed-CONFIG.alightStartMs-i*130)/CONFIG.alightDurationMs):0;
    if(progress>=.02&&progress<.98&&exposure>.05)push(p,'alighting',i,progress);
   }
   for(const [i,p] of waiting.entries()){
    const progress=activeDoor?smooth((elapsed-CONFIG.boardStartMs-i*155)/
     CONFIG.boardDurationMs):0;
    if(progress<.98&&exposure>.05)push(p,activeDoor?'boarding':'waiting',i,progress);
   }
   // Identity must exist on precisely ONE side of a physical door at a time.
   const cabin=onboard.filter(x=>approved(x.id)).map(p=>({...p,phase:'onboard'}));
   for(const [i,p] of waiting.entries()){
    const progress=activeDoor?smooth((elapsed-CONFIG.boardStartMs-i*155)/
     CONFIG.boardDurationMs):0;
    if(progress>=.98&&cabin.length<CONFIG.maxCabin)
     cabin.push({...p,phase:'boarded'});
   }
   for(const [i,p] of alighting.entries()){
    const progress=activeDoor?smooth((elapsed-CONFIG.alightStartMs-i*130)/
     CONFIG.alightDurationMs):0;
    if(progress<.02&&cabin.length<CONFIG.maxCabin)cabin.push({...p,phase:'alighting'});
   }
   return {platform,cabin,epoch,doorOpen:open,station:stop?.station||null,
    waitingCount:waiting.length,alightingCount:alighting.length,
    activeDoor,minimumDwellMs:CONFIG.minimumDoorDwellMs};
  }
  return Object.freeze({dock,arrive,depart,clear,refreshWaiting,status,sample});
 }
 return Object.freeze({CONFIG,create});
});