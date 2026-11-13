/* Shared grid change animation, without duplicating terrain/world coordinates.
 * Gameplay terrain is authoritative; renderer sees a smoothly changing visualGrid.
 * Engine is independent from WebGL. Particle render adapter is supplied by stage.
 */
(function(root){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
function create(terrain,opts={}){
 let tick=0,clock=0,seed=opts.seed||25371;
 const active=new Map(),visual=new Map(),particles=[];
 const key=(c,r)=>c+':'+r;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const visualGrid=Object.create(terrain);
 Object.defineProperty(visualGrid,'cell',{value:(c,r)=>{
  const cell=terrain.cell(c,r);if(!cell)return null;
  const shown=visual.get(key(c,r));
  return shown===undefined?cell:{...cell,height:shown};
 }});
 Object.defineProperty(visualGrid,'revision',{get(){return terrain.revision+tick;}});
 function burst(c,r,kind){
  const p=terrain.center(c,r),t=terrain.cell(c,r);
  const count=kind==='raise'?28:36;
  for(let i=0;i<count;i++){
   const a=random()*Math.PI*2,dist=.2+random()*terrain.tileW*.43;
   const speed=.9+random()*2.7;
   particles.push({
    x:p.x+Math.cos(a)*dist,y:t.height+.10,z:p.z+Math.sin(a)*dist,
    vx:Math.cos(a)*speed,vy:(kind==='dig'?1.5:1.9)+random()*3.4,vz:Math.sin(a)*speed,
    age:0,life:.55+random()*.62,size:.035+random()*.075,
    color:random()<.24?[.89,.76,.49]:random()<.38?[.39,.59,.29]:[.47,.34,.21],
    kind
   });
  }
  // Pool is bounded even if an effect or rapid input tries to spawn many bursts.
  if(particles.length>240)particles.splice(0,particles.length-240);
 }
 function adjust(c,r,d){
  if(!terrain.canAdjust(c,r,d)||active.has(key(c,r)))return false;
  const old=terrain.cell(c,r).height;
  terrain.adjust(c,r,d);
  const target=terrain.cell(c,r).height;
  visual.set(key(c,r),old);tick++;
  active.set(key(c,r),{c,r,from:old,to:target,t:0,duration:.66});
  burst(c,r,d>0?'raise':'dig');
  return true;
 }
 function update(dt){
  dt=clamp(dt,0,.05);clock+=dt;let changed=false;
  for(const [id,a] of active){
   a.t+=dt;
   const q=clamp(a.t/a.duration,0,1);
   const bounce=a.to>a.from?Math.sin(Math.PI*q)*.045:0;
   visual.set(id,a.from+(a.to-a.from)*ease(q)+bounce);
   changed=true;
   if(q>=1){active.delete(id);visual.delete(id);}
  }
  if(changed)tick++;
  for(let i=particles.length-1;i>=0;i--){
   const p=particles[i];p.age+=dt;
   if(p.age>=p.life){particles.splice(i,1);continue;}
   p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
   p.vy-=5.6*dt;p.vx*=1-1.4*dt;p.vz*=1-1.4*dt;
  }
 }
 function reset(){
  active.clear();visual.clear();particles.length=0;tick++;
 }
 function snapshot(){return {busy:active.size,particleCount:particles.length,visualRevision:visualGrid.revision,clock};}
 return {adjust,update,reset,visualGrid,particles,snapshot,height:(c,r)=>visualGrid.cell(c,r)?.height??0,isBusy:(c,r)=>active.has(key(c,r))};
}
root.PaperchalkVoxelAnimations=Object.freeze({version:'1.0.0',create});
})(window);
