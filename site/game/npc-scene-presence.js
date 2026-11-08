/* Paperchalk World — production NPC presence bridge.
 * Never guesses identity, scene, wardrobe or asset approval from a filename.
 * The LIFE SIM is the only owner of NPC location; this module only renders
 * approved identities when the world state and asset manifest BOTH allow it.
 */
(function(root,factory){
 'use strict';const api=factory();
 if(root)root.PaperWorldNpcScenePresence=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const LIMITS=Object.freeze({maxRecords:500,maxVisiblePerScene:6});
 const ALLOWED_PREFIX='./assets/characters/';
 const allowedImage=p=>typeof p==='string'&&p.startsWith(ALLOWED_PREFIX)&&
  !p.includes('..')&&!/[?#\\]/.test(p)&&/\.(png|webp)$/i.test(p)&&p.length<240;
 const allowedId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{2,75}$/.test(id);
 const allowPlace=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9-]{0,90}$/.test(x);
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 function validateManifest(manifest){
  if(!manifest||manifest.version!==1||!Array.isArray(manifest.records)||
     manifest.records.length>LIMITS.maxRecords)return {ok:false,error:'invalid-manifest',records:[]};
  const taken=new Set(),records=[];
  for(const row of manifest.records){
   if(!row||!allowedId(row.id)||taken.has(row.id))
    return {ok:false,error:'duplicate-or-invalid-id',records:[]};
   taken.add(row.id);
   const locations=row.allowedLocations||[],transit=row.allowedTransport||[];
   if(!Array.isArray(locations)||!locations.every(allowPlace)||
      !Array.isArray(transit)||!transit.every(x=>['metro','regional','bus','ferry'].includes(x)))
    return {ok:false,error:'invalid-allowed-scenes',records:[]};
   if(row.artApproved!==true||row.production!==true){
    // Inactive art is allowed as metadata but MUST NOT be returned for rendering.
    continue;
   }
   if(!locations.length&&!transit.length)
    return {ok:false,error:'approved-without-explicit-places',records:[]};
   if(!row.sprites||!allowedImage(row.sprites.idle)||
      Object.values(row.sprites).some(x=>!allowedImage(x)))
    return {ok:false,error:'invalid-art-path',records:[]};
   const geo=row.geometry||{};
   if(![geo.heightMeters,geo.assetCrownY,geo.assetSoleY,geo.soleX,geo.widthScale]
     .every(x=>typeof x==='number'&&Number.isFinite(x))||
     geo.heightMeters<.65||geo.heightMeters>2.6||
     geo.assetCrownY<0||geo.assetCrownY>.4||
     geo.assetSoleY<.65||geo.assetSoleY>1||
     geo.assetCrownY>=geo.assetSoleY-.25||
     geo.soleX<0||geo.soleX>1||
     geo.widthScale<.2||geo.widthScale>3)
    return {ok:false,error:'uncalibrated-geometry',records:[]};
   records.push(Object.freeze({...row,
    allowedLocations:Object.freeze([...new Set(locations)]),
    allowedTransport:Object.freeze([...new Set(transit)]),
    sprites:Object.freeze({...row.sprites}),
    geometry:Object.freeze({...geo})}));
  }
  return {ok:true,records};
 }
 function create({life,atlas=null,metro=null,manifest={version:1,records:[]}}={}){
  if(!life||typeof life.get!=='function')throw Error('persistent NPC-life simulation is required');
  let state={ok:true,records:[]};
  const setManifest=next=>{
   const check=validateManifest(next);
   // Atomic update; a malformed art file cannot partially register NPCs.
   if(check.ok)state=check;
   return {ok:check.ok,error:check.error||null,registered:state.records.length};
  };
  setManifest(manifest);
  const registry=()=>new Map(state.records.map(r=>[r.id,r]));
  const allowedAt=(r,node)=>r.allowedLocations.includes(node);
  function forLocation(place,{limit=LIMITS.maxVisiblePerScene}={}){
   if(!allowPlace(place)||typeof life.present!=='function')return [];
   const reg=registry(),out=[],seen=new Set();
   // LifeSim.present checks EACH actor's unique physical node, phase and
   // publicness. Nothing is "spawned" merely because the player is here.
   for(const physical of life.present(place)){
    const row=reg.get(physical.id),stateAt=life.get(physical.id);
    if(!row||!allowedAt(row,place)||seen.has(physical.id)||
       stateAt?.phase!=='staying'||stateAt.node!==place)continue;
    seen.add(physical.id);
    out.push(Object.freeze({id:physical.id,place,kind:physical.kind,
     activity:stateAt.activity,event:stateAt.event||null,
     sprite:row.sprites.idle,sprites:row.sprites,geometry:row.geometry,
     approved:true,production:true}));
    if(out.length>=limit)break;
   }
   return out;
  }
  function forMetro({lineId,station,direction}={}){
   const reg=registry(),out=[],seen=new Set();
   if(typeof lineId!=='string'||typeof station!=='string'||
      (direction!==1&&direction!==-1)||!metro)return [];
   for(const [id,row] of reg){
    if(!row.allowedTransport.includes('metro'))continue;
    const loc=life.get(id);
    const leg=loc?.leg;
    // A particular person can board this carriage only while travelling
    // on the same line, segment and direction. Station is physical origin
    // for this train leg; direction is NOT inferred from screen position.
    if(loc?.phase!=='traveling'||leg?.mode!=='metro'||
       leg?.lineId!==lineId||leg?.from!==station||
       leg?.direction!==direction||seen.has(id))continue;
    seen.add(id);out.push(Object.freeze({id,kind:row.kind||'passenger',
     activity:'metro',progress:leg.progress,leg,sprite:row.sprites.idle,
     sprites:row.sprites,geometry:row.geometry,approved:true,production:true}));
    if(out.length>=LIMITS.maxVisiblePerScene)break;
   }
   return out;
  }
  function inspect(){
   return {registered:state.records.map(x=>({id:x.id,allowedLocations:x.allowedLocations,
    allowedTransport:x.allowedTransport,sprites:Object.keys(x.sprites)})),
    manifestValid:state.ok};
  }
  return Object.freeze({setManifest,forLocation,forMetro,inspect,get:(id)=>registry().get(id)||null});
 }
 return Object.freeze({LIMITS,validateManifest,create});
});
