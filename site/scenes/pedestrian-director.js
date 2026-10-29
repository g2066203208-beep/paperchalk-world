/** Street-only crowd presentation. Scene-independent character trajectories,
 * animation lifecycle, pool replacement, staging and real citizen dialogue targets.
 * Does not mutate any world state.
 */
import {LOCATIONS,residentsForStreet,pedestrianPlan,stepWalker} from './pedestrian-routes.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
function puppet(p){
 const skin=p.skin,hair=p.hair,coat=p.color;
 const skirt=p.clothing===1;
 const hat=p.clothing===2?'<path d="M9 23L65 23L58 17L21 15Z" fill="#253440" stroke="#15232d" stroke-width="3"/>':'';
 const bag=p.clothing===3?'<path d="M53 83L69 84L73 116L50 116Z" fill="#c9a77a" stroke="#1b2a33" stroke-width="3"/><path d="M58 83Q59 72 67 81" fill="none" stroke="#324252" stroke-width="3"/>':'';
 return '<svg class="pedestrian-puppet" viewBox="0 0 80 156" role="img" aria-hidden="true">'+
 '<ellipse class="pedestrian-shadow" cx="40" cy="150" rx="25" ry="5" fill="#172630" opacity=".3"/>'+
 '<g class="puppet-bob">'+
 '<g class="puppet-leg puppet-leg-back"><path d="M30 96L26 137L23 148L37 149L43 101Z" fill="#263846" stroke="#142431" stroke-width="3"/>'+
 '<path d="M20 142L38 142L40 150L17 150Z" fill="#222a34"/></g>'+
 '<g class="puppet-leg puppet-leg-front"><path d="M44 98L44 137L52 148L66 147L56 95Z" fill="#354858" stroke="#142431" stroke-width="3"/>'+
 '<path d="M49 143L64 141L70 150L49 151Z" fill="#17222e"/></g>'+
 (skirt?'<path d="M19 84L60 84L67 117L12 117Z" fill="'+coat+'" stroke="#22313a" stroke-width="3"/>':'')+
 '<g class="puppet-arm puppet-arm-back"><path d="M22 66L12 96L20 113L31 103L33 77Z" fill="'+coat+'" stroke="#24343e" stroke-width="3"/></g>'+
 '<path d="M22 62L55 61L66 106L14 107Z" fill="'+coat+'" stroke="#1e2f3b" stroke-width="3"/>'+
 '<path d="M35 64L42 78L49 64" fill="#e1d4c2" stroke="#22313d" stroke-width="2"/>'+
 '<path d="M39 76L39 104" stroke="#273844" stroke-width="3"/>'+
 '<g class="puppet-arm puppet-arm-front"><path d="M54 70L70 98L60 117L49 108L55 89Z" fill="'+coat+'" stroke="#24343e" stroke-width="3"/></g>'+
 bag+
 '<path d="M33 51L34 64L47 64L48 51" fill="'+skin+'"/>'+
 '<path d="M21 24Q28 9 47 12Q60 15 61 31L58 49Q52 65 38 63Q25 56 21 42Z" fill="'+skin+'" stroke="#283442" stroke-width="3"/>'+
 '<path d="M18 33L18 19Q31 -2 51 13L66 29L59 35L52 24L38 25L25 19L22 41Z" fill="'+hair+'"/>'+
 hat+
 '<path d="M30 38L35 38M47 38L52 38" stroke="#263844" stroke-width="2.5"/>'+
 '<path d="M39 49L45 48" stroke="#996e65" stroke-width="2"/>'+
 '</g></svg>';
}
function actorMarkup(p,plan){
 return '<button type="button" class="city-walker pedestrian-actor" data-explore-type="talk-citizen" data-explore-id="'+esc(p.id)+'"'+
 ' data-walker-phase="walking" aria-label="和'+esc(p.name)+'交谈" style="left:'+plan.start+'%;top:'+plan.lane+'%;--ped-scale:'+(plan.lane<82?'.78':plan.lane<87?'.92':'1.04')+'">'+
 '<span class="pedestrian-facing">'+puppet(plan)+'</span>'+
 '<span class="pedestrian-greeting" aria-hidden="true"></span>'+
 '<span class="pedestrian-identity">'+esc(p.name)+' · '+esc(p.occupation)+'</span></button>';
}
export function createPedestrianDirector(layer,{world,venue}){
 if(!LOCATIONS[venue])return Object.freeze({sync:()=>{},pause:()=>{},resume:()=>{},pauseCitizen:()=>{},resumeCitizen:()=>{},destroy:()=>{},snapshot:()=>({actors:[],entrances:0,exits:0})});
 const actors=new Map();
 let active=true,stopped=false,frame=0,last=0,sequence=0,entrances=0,exits=0,shift=-1,roster=[];
 let pausedCitizen=null,talkLocked=false;
 const capacity=()=>window.matchMedia('(max-width:650px)').matches?3:5;
 function position(item){
  const {element,walk}=item;
  element.style.left=walk.x.toFixed(3)+'%';
  element.style.top=walk.plan.lane+'%';
  element.style.zIndex=String(3+Math.floor(walk.plan.lane-72));
  element.style.setProperty('--ped-facing',walk.plan.fromLeft?'1':'-1');
  element.dataset.walkerPhase=walk.phase;
  element.style.opacity=(walk.phase==='entering-shop'?Math.max(0,walk.remaining/.56):walk.phase==='leaving'?Math.max(0,walk.remaining/.06):1).toFixed(2);
  const greeting=element.querySelector('.pedestrian-greeting');
  if(greeting){
    const visible=walk.phase==='chatting';
    greeting.textContent=visible?walk.plan.bubble:'';
    greeting.hidden=!visible;
  }
 }
 function spawn(initial=false){
   const busy=new Set(actors.keys());
   const available=roster.filter(p=>!busy.has(p.id));
   if(!available.length)return;
   const p=available[(sequence*5+1)%available.length];
   const plan=pedestrianPlan(p,venue,shift,sequence++);
   const walker={plan,x:plan.start,phase:'walking',stopped:false,remaining:0};
   if(initial){
     // The player enters an already living street; more actors continue walking in from its actual edges.
     const ratio=[.20,.53,.08,.36,.03][actors.size%5];
     walker.x=plan.start+(plan.exit-plan.start)*ratio;
   }
   const holder=document.createElement('div');holder.innerHTML=actorMarkup(p,plan);
   const element=holder.firstElementChild;
   const item={element,walk:walker};
   // Real people can be approached: hovering pauses movement so the actual
   // moving target is clickable on desktop. A conversation locks the pause.
   element.addEventListener('pointerenter',()=>pauseCitizen(p.id,false));
   element.addEventListener('pointerleave',()=>{if(pausedCitizen===p.id&&!talkLocked)resumeCitizen();});
   actors.set(p.id,item);layer.append(element);entrances++;
   position(item);
 }
 function sync(nextWorld,force=false){
   const newShift=nextWorld.slices.clock.shift;
   if(!force&&shift===newShift)return;
   shift=newShift;
   roster=residentsForStreet(nextWorld,venue);
   const remaining=new Set(roster.map(p=>p.id));
   for(const [id,item] of actors){
     if(!remaining.has(id)){item.element.remove();actors.delete(id);exits++;}
   }
   while(actors.size<Math.min(capacity(),roster.length))spawn(true);
 }
 function tick(now){
   if(!active)return;
   const dt=Math.min(.055,Math.max(0,(now-last)/1000||0));last=now;
   if(!stopped&&!document.hidden){
     for(const [id,item] of [...actors]){
       const before=item.walk.phase,updated=stepWalker(item.walk,dt);
       if(before==='entering-shop'||before==='leaving'){
         updated.remaining=Math.max(0,(item.walk.remaining||0)-dt);
         if(updated.remaining<=0){
           item.element.remove();actors.delete(id);exits++;continue;
         }
       }
       item.walk=updated;position(item);
     }
     while(actors.size<Math.min(capacity(),roster.length))spawn(false);
   }
   frame=requestAnimationFrame(tick);
 }
 function pauseCitizen(id,lock=true){
   if(pausedCitizen&&actors.has(pausedCitizen)&&pausedCitizen!==id)resumeCitizen();
   const item=actors.get(id);if(!item)return;
   if(item.walk.phase!=='talking'&&item.walk.phase!=='hovering')item.walk.previousPhase=item.walk.phase;
   pausedCitizen=id;talkLocked=lock||talkLocked;
   item.walk.phase=talkLocked?'talking':'hovering';
   item.element.classList.toggle('pedestrian-talking',talkLocked);
   item.element.classList.toggle('pedestrian-hovering',!talkLocked);
   position(item);
 }
 function resumeCitizen(){
   if(pausedCitizen&&actors.has(pausedCitizen)){
     const item=actors.get(pausedCitizen);
     item.walk.phase=item.walk.previousPhase||'walking';
     item.element.classList.remove('pedestrian-talking','pedestrian-hovering');
     position(item);
   }
   pausedCitizen=null;talkLocked=false;
 }
 sync(world(),true);
 frame=requestAnimationFrame(tick);
 return Object.freeze({
   sync,pause:()=>{stopped=true;},resume:()=>{stopped=false;last=0;},
   pauseCitizen,resumeCitizen,
   destroy:()=>{active=false;cancelAnimationFrame(frame);actors.forEach(x=>x.element.remove());actors.clear();},
   snapshot:()=>({venue,shift,entrances,exits,active:!stopped,
    actors:[...actors.values()].map(({walk})=>({id:walk.plan.id,x:walk.x,phase:walk.phase,
     direction:walk.plan.fromLeft?'right':'left',exit:walk.plan.exit}))})
 });
}
