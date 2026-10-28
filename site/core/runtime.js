/** Pure, deterministic game runtime: no DOM, no storage, no timers. */
export function signal(seed,day,domain,index=0){
  let h=(seed>>>0)^((day*2654435761)>>>0);
  for(const c of String(domain)+':'+index){h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;}
  h^=h>>>16;h=Math.imul(h,2246822507)>>>0;h^=h>>>13;
  return (h>>>0)/4294967296;
}
export const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(n)));
export function createRuntime(modules){
 if(!Array.isArray(modules)||!modules.length)throw Error('Runtime needs modules');
 const ids=new Map();
 for(const mod of modules){
   if(!/^[a-z][a-z0-9-]*$/.test(mod.id)||ids.has(mod.id))throw Error('duplicate or invalid module '+mod.id);
   if(typeof mod.init!=='function'||typeof mod.tick!=='function'||typeof mod.reduce!=='function')throw Error('invalid module '+mod.id);
   ids.set(mod.id,mod);
 }
 const order=[],visited=new Set(),visiting=new Set();
 const visit=id=>{
   if(visiting.has(id))throw Error('cycle at '+id);
   if(visited.has(id))return;
   const m=ids.get(id);if(!m)throw Error('unknown dependency '+id);
   visiting.add(id);
   for(const dep of m.deps||[])visit(dep);
   visiting.delete(id);visited.add(id);order.push(m);
 };
 for(const id of ids.keys())visit(id);
 const initial=(seed=20261028,day=1)=>{
   if(!Number.isInteger(seed)||!Number.isInteger(day)||day<1)throw Error('invalid seed/day');
   const slices={};
   for(const m of order)slices[m.id]=m.init({seed,day,slices});
   return {schema:1,seed,day,slices,events:[],seq:0};
 };
 function run(world,fn){
   const next=structuredClone(world),events=[],effects=[];
   const put=(id,output)=>{
     if(!output)return;
     if(!Object.hasOwn(output,'data'))throw Error('system '+id+' must return data');
     next.slices[id]=output.data;
     for(const e of output.events||[])events.push({id:'ev-'+(next.seq++),day:next.day,source:id,...e});
     effects.push(...(output.effects||[]));
   };
   fn(next,put,events,effects);
   next.events=[...events,...next.events].slice(0,220);
   return {ok:true,state:next,events,effects};
 }
 function command(world,input,context={}){
   if(!world?.slices||!ids.has(input?.module))return {ok:false,state:world,message:'Unknown game module'};
   try{return run(world,(next,put,events)=>{
     const module=ids.get(input.module);
     const answer=module.reduce(structuredClone(next.slices[module.id]),input,{
      day:next.day,seed:next.seed,slices:next.slices,context,events,signal:(id)=>signal(next.seed,next.day,module.id,id)
     });
     if(answer?.error)throw Error(answer.error);
     put(module.id,answer);
   });}catch(err){return {ok:false,state:world,message:String(err.message)};}
 }
 function advance(world,context={}){
   return run(world,(next,put,events)=>{
     next.day++;
     for(const mod of order){
       const result=mod.tick(structuredClone(next.slices[mod.id]),{
        day:next.day,seed:next.seed,slices:next.slices,context,events,
        signal:index=>signal(next.seed,next.day,mod.id,index)
       });
       put(mod.id,result);
     }
   });
 }
 return Object.freeze({moduleIds:order.map(m=>m.id),initial,command,advance});
}
