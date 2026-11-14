/* Reusable scene object lifecycle scheduler.
 * Register visual groups once; switching a biome never needs per-prop DOM code
 * or a forest-specific list of animation calls. Every renderer is responsible
 * for drawing M = T(pivot)*S(objectScale)*T(-pivot), never S around world 0.
 * Terrain, props, facilities, cards and their logical state survive swaps.
 */
(function(root){'use strict';
function create({animation,groups=[]}={}){
 if(!animation?.enter||!animation?.exit||!animation?.clear)
  throw Error('Scene lifecycle requires object animation controller');
 const providers=new Map();
 const log=[];
 function register(def){
  if(!def||!def.id||typeof def.ids!=='function'||providers.has(def.id))
   throw Error('Invalid or duplicate scene object provider');
  providers.set(def.id,{
   id:def.id,ids:def.ids,enter:def.enter||{},exit:def.exit||{},
   anchor:def.anchor||'self'
  });
  return def.id;
 }
 function itemsFor(scene){
  const found=new Map();
  for(const group of providers.values()){
   const ids=group.ids(scene)||[];
   if(!Array.isArray(ids))throw Error('Provider '+group.id+' must return an id array');
   for(let i=0;i<ids.length;i++){
    const id=ids[i];
    if(typeof id!=='string'||!id.length)throw Error('Invalid scene object id');
    if(found.has(id))throw Error('Duplicate scene object id across providers: '+id);
    found.set(id,{id,group:group.id,index:i,enter:group.enter,exit:group.exit,anchor:group.anchor});
   }
  }
  return [...found.values()];
 }
 function apply(mode,scene,at=0){
  if(!['enter','exit'].includes(mode))throw Error('Unknown scene lifecycle mode');
  const objects=itemsFor(scene),entering=mode==='enter';
  for(const obj of objects){
   const config=entering?obj.enter:obj.exit;
   const opts={
    duration:config.duration??(entering?.62:.43),
    delay:Math.min(config.maxDelay??.28,obj.index*(config.stagger??0)),
    overshoot:config.overshoot??(entering?1.1:1)
   };
   if(entering)animation.enter(obj.id,at,opts);
   else animation.exit(obj.id,at+opts.delay,{duration:opts.duration});
  }
  log.push({scene,mode,at,count:objects.length});
  if(log.length>12)log.shift();
  return {scene,mode,count:objects.length};
 }
 function release(scene,{retain=[]}={}){
  const exceptions=new Set(retain);
  for(const obj of itemsFor(scene))
   if(!exceptions.has(obj.id))animation.clear(obj.id);
 }
 for(const def of groups)register(def);
 return Object.freeze({
  register,itemsFor,play:apply,release,
  get snapshot(){return {providers:[...providers.keys()],recent:log.slice()};},
  version:'1.0.0'
 });
}
root.PaperchalkSceneLifecycle=Object.freeze({version:'1.0.0',create});
})(window);
