/* Paperchalk World — identity-first NPC scene presence.
 * ART OWNERSHIP: site/data/npc/production-manifest.v1.json
 * GAMEPLAY OWNERSHIP: site/data/npc/scene-assignments.v1.json
 * WORLD LOCATION: PaperWorldNpcLife persistent schedule, one physical actor.
 * All THREE must agree; never place sprites by filename or random scene pool.
 */
(function(root,factory){
 'use strict';const api=factory();
 if(root)root.PaperWorldNpcScenePresence=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const LIMITS=Object.freeze({maxRecords:500,maxVisiblePerScene:6});
 const allowedImage=p=>typeof p==='string'&&p.startsWith('./assets/characters/')&&
  !p.includes('..')&&!/[?#\\]/.test(p)&&/\.(png|webp)$/i.test(p)&&p.length<240;
 const allowedId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{2,75}$/.test(id);
 const allowedPlace=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9-]{0,90}$/.test(x);
 const allowedMetroSlot=x=>x==null||['back-left','back-center','back-right'].includes(x);
 const allowedModes=new Set(['metro','regional','bus','ferry']);
 function validateManifest(data){
  if(!data||data.version!==1||!Array.isArray(data.records)||
     data.records.length>LIMITS.maxRecords)
   return {ok:false,error:'invalid-art-manifest',records:[]};
  const seen=new Set(),records=[];
  for(const row of data.records){
   if(!row||!allowedId(row.id)||seen.has(row.id))
    return {ok:false,error:'duplicate-art-identity',records:[]};
   seen.add(row.id);
   if(row.artApproved!==true||row.production!==true)continue;
   if(!row.sprites||!allowedImage(row.sprites.idle)||
      Object.values(row.sprites).some(x=>!allowedImage(x)))
    return {ok:false,error:'unapproved-or-invalid-sprite-path',records:[]};
   const g=row.geometry||{};
   if(![g.heightMeters,g.assetCrownY,g.assetSoleY,g.soleX,g.widthScale]
      .every(x=>typeof x==='number'&&Number.isFinite(x))||
      g.heightMeters<.65||g.heightMeters>2.6||
      g.assetCrownY<0||g.assetCrownY>.4||
      g.assetSoleY<.65||g.assetSoleY>1||
      g.assetCrownY>=g.assetSoleY-.25||
      g.soleX<0||g.soleX>1||g.widthScale<.2||g.widthScale>3)
    return {ok:false,error:'uncalibrated-art-geometry',records:[]};
   records.push(Object.freeze({id:row.id,kind:row.kind||null,
    sprites:Object.freeze({...row.sprites}),geometry:Object.freeze({...g})}));
  }
  return {ok:true,records};
 }
 function validateAssignments(data){
  if(!data||data.version!==1||!Array.isArray(data.records)||
     data.records.length>LIMITS.maxRecords)
   return {ok:false,error:'invalid-scene-assignments',records:[]};
  const seen=new Set(),records=[];
  for(const row of data.records){
   if(!row||!allowedId(row.id)||seen.has(row.id))
    return {ok:false,error:'duplicate-scene-identity',records:[]};
   seen.add(row.id);
   const places=row.allowedLocations,modes=row.allowedTransport;
   if(!Array.isArray(places)||!places.every(allowedPlace)||
      !Array.isArray(modes)||!modes.every(x=>allowedModes.has(x))||
      !allowedMetroSlot(row.metroSlot))
    return {ok:false,error:'invalid-scene-permissions',records:[]};
   if(modes.includes('metro')&&!row.metroSlot)
    return {ok:false,error:'metro-passenger-needs-world-slot',records:[]};
   records.push(Object.freeze({id:row.id,role:row.role||'background',
    allowedLocations:Object.freeze([...new Set(places)]),
    allowedTransport:Object.freeze([...new Set(modes)]),
    metroSlot:row.metroSlot||null,home:row.home||null}));
  }
  return {ok:true,records};
 }
 function create({life,metro=null,manifest={version:1,records:[]},
   assignments={version:1,records:[]}}={}){
  if(!life||typeof life.get!=='function')
   throw Error('Persistent NPC life simulation required');
  let art={ok:true,records:[]},places={ok:true,records:[]};
  function setManifest(data){
   const next=validateManifest(data);
   if(next.ok)art=next;
   return {ok:next.ok,error:next.error||null,registered:art.records.length};
  }
  function setAssignments(data){
   const next=validateAssignments(data);
   if(next.ok)places=next;
   return {ok:next.ok,error:next.error||null,assigned:places.records.length};
  }
  setManifest(manifest);setAssignments(assignments);
  const approved=()=>{
   const rights=new Map(places.records.map(p=>[p.id,p]));
   return art.records.flatMap(item=>{
    const where=rights.get(item.id);
    return where?[{...item,allowedLocations:where.allowedLocations,
     allowedTransport:where.allowedTransport,
     metroSlot:where.metroSlot,role:where.role,home:where.home}]:[];
   });
  };
  function forLocation(scene,{limit=LIMITS.maxVisiblePerScene}={}){
   if(!allowedPlace(scene)||typeof life.present!=='function')return [];
   const ids=new Map(approved().map(a=>[a.id,a])),out=[],seen=new Set();
   // Persistent engine is the ONLY source of who is physically here.
   for(const person of life.present(scene)){
    const a=ids.get(person.id),p=life.get(person.id);
    if(!a||!a.allowedLocations.includes(scene)||seen.has(a.id)||
       p?.phase!=='staying'||p.node!==scene)continue;
    seen.add(a.id);
    out.push(Object.freeze({id:a.id,scene,kind:a.kind||a.role,
     activity:p.activity,event:p.event||null,approved:true,production:true,
     sprite:a.sprites.idle,sprites:a.sprites,geometry:a.geometry}));
    if(out.length>=limit)break;
   }
   return out;
  }
  function forMetro({lineId,station,direction}={}){
   if(!metro||!lineId||!station||![1,-1].includes(direction))return [];
   const out=[];
   for(const a of approved()){
    if(!a.allowedTransport.includes('metro')||!a.metroSlot)continue;
    const p=life.get(a.id),leg=p?.leg;
    if(p?.phase!=='traveling'||leg?.mode!=='metro'||
       leg.lineId!==lineId||leg.from!==station||
       leg.direction!==direction)continue;
    out.push(Object.freeze({id:a.id,kind:a.kind||a.role,
     leg:{...leg},activity:'metro',progress:leg.progress,
     approved:true,production:true,sprite:a.sprites.idle,
     sprites:a.sprites,geometry:{...a.geometry,metroSlot:a.metroSlot}}));
    if(out.length>=LIMITS.maxVisiblePerScene)break;
   }
   return out;
  }
  function inspect(){
   return {artCount:art.records.length,assignmentCount:places.records.length,
    renderableIds:approved().map(x=>x.id),
    scenePermissions:places.records.map(x=>({
     id:x.id,allowedLocations:x.allowedLocations,
     allowedTransport:x.allowedTransport,metroSlot:x.metroSlot}))};
  }
  return Object.freeze({setManifest,setAssignments,forLocation,forMetro,inspect,
   get:id=>approved().find(x=>x.id===id)||null});
 }
 return Object.freeze({LIMITS,validateManifest,validateAssignments,create});
});
