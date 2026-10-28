/** Persistent, scene-first director.
 * A normal click NEVER reconstructs the crowd/scene. Transit happens only through a door and
 * the illustrated destination map. Dialogue runs in-scene with actionable branch choices.
 */
import {SCENE_DEFS,SCENE_PEOPLE} from '../systems/origin.js';
import {sceneArtwork} from './artwork.js';
import {sceneConversation} from './scene-dialogues.js';
import {currentBeat,prologueMark} from '../content/prologue-story.js';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
const mainCell={office:'s0',alley:'s0',market:'s4',labor:'s5',docks:'s2'};
const spots={
 office:[['exit','street',80,34,'出门去街上','door'],['talk','kai',64,55,'阿凯','person']],
 alley:[['exit','street',11,65,'去其他地点','door'],['talk','neighbor',42,72,'楼下婶婶','person'],
 ['talk','runner',69,76,'街头少年','person'],['protect','harassment',51,88,'帮街坊处理麻烦','action']],
 market:[['exit','street',8,69,'离开集市','door'],['talk','vendor',49,72,'摊主林姨','person'],
 ['talk','guard',73,76,'路口巡查员','person'],['aid','vendor',34,83,'帮林姨修摊','action']],
 labor:[['exit','street',8,68,'离开就业所','door'],['talk','worker',39,75,'失业工人','person'],
 ['talk','clerk',57,71,'就业所职员','person'],['open','recruitment',51,83,'查看招聘登记册','paper']],
 docks:[['exit','street',9,72,'离开码头','door'],['talk','docker',48,72,'码头工友','person'],
 ['talk','unionist',77,75,'老工会成员','person'],['open','transport',36,86,'查看运输合同','paper']]
};
const desk=[
 ['phone','telephone.svg','open','phone',27,78,11,'拨打电话'],
 ['map','map.svg','open','map',46,75,19,'展开城区地图'],
 ['folder','folder.svg','open','reports',60,82,14,'打开卷宗'],
 ['ledger','ledger.svg','open','ledger',76,84,12,'翻开账本'],
 ['deed','deed.svg','inspect','deed',13,78,10,'办公室地契'],
 ['newspaper','newspaper.svg','inspect','newspaper',36,88,12,'旧港报纸']
];
const sceneOptions=['office','alley','market','labor','docks'];
const positions=[[19,80],[35,84],[67,82],[86,83],[52,83]];
function selectCrowd(world,venue){
 const cell=mainCell[venue];
 if(!cell||venue==='office')return [];
 const shift=world.slices.clock.shift;
 const matches=world.slices.population.people.filter(p=>(shift===1?p.work:shift===2?p.leisure:p.home)===cell);
 return matches.slice(0,Math.min(5,matches.length));
}
function actorMarkup(p,i){
 const color=['#7d9fa1','#ac837e','#baa27d','#708d9b','#979580'][i%5];
 const [x,y]=positions[i%positions.length];
 const speed=7+(Number(p.id.replace(/\D/g,''))%5)*1.8;
 return '<button type="button" class="city-walker" data-explore-type="talk-citizen" data-explore-id="'+escape(p.id)+'"'+
 ' aria-label="和'+escape(p.name)+'交谈" style="--walk-x:'+x+'%;--walk-y:'+y+'%;--coat:'+color+';--stride:'+speed+'s;--walk-delay:-'+((i+1)*2.1)+'s">'+
 '<svg viewBox="0 0 64 128" role="img" aria-hidden="true"><ellipse cx="30" cy="123" rx="27" ry="6" fill="#1c2934" opacity=".28"/>'+
 '<path d="M19 65L12 119H27L33 90L39 121H53L47 65" fill="#293947" stroke="#1d2b36" stroke-width="4"/>'+
 '<path d="M18 44L45 43L53 84H10Z" fill="var(--coat)" stroke="#263645" stroke-width="4"/>'+
 '<path d="M27 38L28 51L40 50L40 39" fill="#cba086"/>'+
 '<path d="M18 17Q33 -6 49 17L46 38Q31 56 19 38Z" fill="#edc4a7" stroke="#2a3c47" stroke-width="3"/>'+
 '<path d="M16 19L18 7L32 0L49 8L53 24L46 17L37 19L25 12Z" fill="#263846"/>'+
 '<path d="M25 30h5M41 30h5" stroke="#263742" stroke-width="3"/></svg>'+
 '<span>'+escape(p.name)+' · '+escape(p.occupation)+'</span></button>';
}
function physicalProps(){
 return desk.map(([key,file,type,id,x,y,width,label])=>
 '<button type="button" class="scene-object prop-'+key+'" data-explore-type="'+type+'" data-explore-id="'+id+
 '" style="--px:'+x+'%;--py:'+y+'%;--pw:'+width+'%" aria-label="'+label+'">'+
 '<img draggable="false" alt="" src="./assets/props/'+file+'"/><span class="scene-object-tip">'+label+'</span></button>'
 ).join('');
}
const routeMap=(current,selected)=>'<div class="street-route-backdrop" data-route-close="1">'+
 '<section class="street-route-sheet" role="dialog" aria-modal="true" aria-label="夜港出门路线地图">'+
 '<div class="street-route-header"><div><small>NIGHT HARBOR / STREET MAP</small><strong>今天去哪儿？</strong><span>手指按在地图上选目的地，推门就能过去。</span></div>'+
 '<button type="button" data-route-close="1" aria-label="收起地图">×</button></div>'+
 '<div class="street-route-places">'+sceneOptions.map((id,i)=>{
 const def=SCENE_DEFS[id],active=selected===id,here=current===id;
 return '<button class="street-route-place '+(active?'picked':'')+'" type="button" data-route-place="'+id+'" aria-pressed="'+active+'">'+
 '<div class="street-route-preview" aria-hidden="true">'+sceneArtwork(id)+'</div><div class="street-route-caption"><b>'+escape(def.name)+'</b><span>'+(here?'你正在这里':(i+1)+' · 前往')+'</span></div></button>';
 }).join('')+'</div>'+
 '<div class="street-route-foot"><p>旧港的街道并不安全；街上有真实工作、交易与生活着的人。</p>'+
 '<button type="button" data-route-go="1" '+(selected===current?'disabled':'')+'>推门前往 · '+escape(SCENE_DEFS[selected]?.name||'')+'</button></div>'+
 '</section></div>';
export function createExploreLayer(host,{readWorld,readLegacy,command,openPanel,onToggle,cue}){
 const root=document.createElement('section');root.className='explore-root';root.setAttribute('aria-label','可探索的夜港场景');
 host.appendChild(root);
 let visible=true,venue='',shift=-1,routeOpen=false,routeSelection='alley',dialogue=null;
 let departing=false;
 const speech=(speaker,line,choices=[])=>{
  const box=root.querySelector('.explore-dialogue');if(!box)return;
  box.hidden=false;
  box.querySelector('.dialogue-who').textContent=speaker;
  box.querySelector('.dialogue-line').textContent=line;
  box.querySelector('.dialogue-choices').innerHTML=choices.map(c=>'<button type="button" data-talk-choice="'+c.id+'">'+escape(c.label)+'</button>').join('')+
   '<button type="button" class="talk-leave" data-talk-close="1">'+(choices.length?'告辞':'结束交谈')+'</button>';
 };
 const say=(speaker,line)=>{dialogue={person:null,speaker};speech(speaker,line,[]);};
 function renderOpening(){
   const element=root.querySelector('.prologue-presentation');
   if(!element)return;
   const p=readWorld().slices.origin?.prologue;
   const beat=currentBeat(p);
   if(!beat||venue!=='office'){element.hidden=true;return;}
   element.hidden=false;
   element.dataset.mood=beat.mood;
   const decision=beat.choices?.map(c=>
     '<button type="button" data-prologue-step="choose" data-prologue-choice="'+c.id+'">'+escape(c.label)+'</button>').join('')||'';
   element.innerHTML=
     '<div class="prologue-top"><small>1998 · OLD HARBOR</small><span>'+String((p.at||0)+1).padStart(2,'0')+' / 12</span></div>'+
     prologueMark(beat.mood)+
     '<div class="prologue-character"><b>'+escape(beat.speaker)+'</b><p>'+escape(beat.line)+'</p></div>'+
     '<div class="prologue-foot">'+(beat.choices?
       '<div class="prologue-decisions">'+decision+'</div>':
       '<button type="button" class="prologue-continue" data-prologue-step="next">'+(p.at===11?'走进这座城 ›':'继续 ›')+'</button>')+
     '<button type="button" class="prologue-skip" data-prologue-step="skip">跳过开场</button></div>';
 }
 function renderCrowd(w,force=false){
   const container=root.querySelector('.explore-crowd');if(!container)return;
   const next=selectCrowd(w,venue),wanted=new Set(next.map(p=>p.id));
   for(const button of Array.from(container.querySelectorAll('.city-walker'))){
     if(!wanted.has(button.dataset.exploreId)&&!button.classList.contains('departing')){
       button.classList.add('departing');
       setTimeout(()=>button.remove(),520);
     }
   }
   next.forEach((p,i)=>{
     if(!container.querySelector('[data-explore-id="'+p.id+'"]')){
       const temp=document.createElement('div');temp.innerHTML=actorMarkup(p,i);
       const b=temp.firstElementChild;b.classList.add('entering');container.append(b);
       requestAnimationFrame(()=>b.classList.remove('entering'));
     }
   });
 }
 function buildScene(){
   const w=readWorld(),current=w.slices.origin.venue;
   venue=SCENE_DEFS[current]?current:'office';
   routeOpen=false;dialogue=null;
   root.dataset.venue=venue;
   const main=spots[venue]||[];
   const buttons=main.map(([type,id,x,y,label,style])=>
     '<button type="button" class="explore-spot explore-'+style+'" data-explore-type="'+type+'" data-explore-id="'+id+
     '" style="left:'+x+'%;top:'+y+'%;--hot-left:'+x+'%;--hot-top:'+y+'%" aria-label="'+label+'">'+
     (style==='door'&&venue!=='office'?'<svg class="scene-exit-door-art" viewBox="0 0 110 200" aria-hidden="true"><path d="M9 7H101V195H9Z" fill="#263845" stroke="#d8b891" stroke-width="7"/><path d="M26 23H85V161H26Z" fill="#475968" stroke="#8b8173" stroke-width="4"/><circle cx="82" cy="116" r="6" fill="#ecc393"/></svg>':'')+
     '<span>'+escape(label)+'</span></button>'
   ).join('');
   root.innerHTML='<div class="explore-stage scene-'+venue+'"><div class="explore-visual">'+sceneArtwork(venue)+'</div>'+
    '<div class="explore-crowd" aria-label="持续活动的街区行人"></div>'+
    (venue==='office'?physicalProps():'')+buttons+
    '<span class="explore-location">'+escape(SCENE_DEFS[venue].name)+'</span>'+
    '<div class="explore-dialogue" hidden aria-label="场景内人物对话" role="group">'+
    '<div class="dialogue-sigil">✦</div><div class="dialogue-copy"><small class="dialogue-who"></small><p class="dialogue-line"></p></div>'+
    '<div class="dialogue-choices"></div></div>'+ 
    (venue==='office'?'<div class="prologue-presentation" hidden role="group" aria-label="第一章开场演出"></div>':'')+
    '</div>';
   renderOpening();
   renderCrowd(w,true);
 }
 function render(){
   if(!visible)return;
   const w=readWorld(),next=w.slices.origin.venue;
   if(next!==venue||!root.querySelector('.explore-stage')){buildScene();return;}
   if(shift!==w.slices.clock.shift){shift=w.slices.clock.shift;renderCrowd(w);}
   renderOpening();
   // Important: do NOT assign root.innerHTML here. NPC actors keep walking.
 }
 function startTalk(type,id){
   const w=readWorld();
   const citizen=type==='talk-citizen'?w.slices.population.people.find(p=>p.id===id):null;
   const convo=sceneConversation(citizen?id:id,citizen);
   if(!convo)return;
   const action=type==='talk-citizen'?{module:'origin',type:'talk-citizen',person:id}:{module:'origin',type:'talk',person:id};
   const r=command(action);if(!r.ok)return;
   const opening=r.events?.find(e=>e.source==='origin')?.text||convo.opening;
   dialogue={person:id,speaker:convo.speaker,citizen:!!citizen,convo};
   speech(convo.speaker,opening,convo.options);
 }
 function openRoute(){
   const w=readWorld();const place=w.slices.origin.venue;
   routeSelection=place==='office'?'alley':'office';
   routeOpen=true;dialogue=null;
   const d=root.querySelector('.explore-dialogue');if(d)d.hidden=true;
   const holder=document.createElement('div');holder.className='street-route-layer';holder.innerHTML=routeMap(place,routeSelection);
   root.append(holder);
   holder.querySelector('[data-route-place="'+routeSelection+'"]')?.focus();
 }
 function updateRoute(){const holder=root.querySelector('.street-route-layer');if(holder)holder.innerHTML=routeMap(venue,routeSelection);}
 function closeRoute(){routeOpen=false;root.querySelector('.street-route-layer')?.remove();}
 function go(){
   if(departing||routeSelection===venue||!SCENE_DEFS[routeSelection])return;
   departing=true;
   const to=routeSelection;
   closeRoute();
   const stage=root.querySelector('.explore-stage');stage?.classList.add('scene-departing');
   setTimeout(()=>{
     const result=command({module:'origin',type:'travel',to,via:'route-map'});
     if(!result.ok)stage?.classList.remove('scene-departing');
     else{buildScene();root.querySelector('.explore-stage')?.classList.add('scene-arriving');}
     departing=false;
   },260);
 }
 root.addEventListener('click',e=>{
   const prologueButton=e.target.closest('[data-prologue-step]');
   if(prologueButton){
     const action={module:'origin',type:'prologue',step:prologueButton.dataset.prologueStep,
       choice:prologueButton.dataset.prologueChoice||null};
     const result=command(action);
     if(result.ok){
       const beat=currentBeat(readWorld().slices.origin.prologue);
       if(beat?.cue)cue?.(beat.cue==='news'?'bell':beat.cue==='key'?'step':'paper');
       renderOpening();
     }
     return;
   }
   const place=e.target.closest('[data-route-place]');
   if(place){routeSelection=place.dataset.routePlace;updateRoute();return;}
   if(e.target.closest('[data-route-go]')){go();return;}
   if(e.target.closest('[data-route-close]')){closeRoute();return;}
   if(e.target.closest('[data-talk-close]')){dialogue=null;root.querySelector('.explore-dialogue').hidden=true;return;}
   const choice=e.target.closest('[data-talk-choice]');
   if(choice&&dialogue?.convo){
     const selected=dialogue.convo.options.find(x=>x.id===choice.dataset.talkChoice);
     if(!selected)return;
     const person=dialogue.person;
     const response=command({module:'dialogue',type:'choose',person,node:'greet',choice:selected.id});
     if(response.ok) speech(dialogue.speaker,selected.reply,[]);
     else speech(dialogue.speaker,'今天聊得已经够多了。明天再说吧。',[]);
     return;
   }
   const hit=e.target.closest('[data-explore-type]');if(!hit)return;
   const type=hit.dataset.exploreType,id=hit.dataset.exploreId;
   if(type==='exit'){openRoute();return;}
   if(type==='talk'||type==='talk-citizen'){startTalk(type,id);return;}
   if(type==='open'){
     if(['recruitment','transport','news','estates'].includes(id))openPanel('reports',id);
     else openPanel(id);
     return;
   }
   const action=type==='inspect'?{module:'origin',type:'inspect',object:id}:
     type==='aid'?{module:'origin',type:'aid'}:
     {module:'origin',type:'protect'};
   const result=command(action);
   if(result.ok){const ev=result.events?.find(x=>x.source==='origin');if(ev)say(ev.title,ev.text);}
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&routeOpen){e.preventDefault();closeRoute();}});
 function show(){visible=true;root.hidden=false;render();onToggle?.(true);}
 function hide(){visible=false;root.hidden=true;closeRoute();onToggle?.(false);}
 buildScene();shift=readWorld().slices.clock.shift;
 return Object.freeze({render,show,hide,isVisible:()=>visible,say,current:()=>readWorld().slices.origin.venue,openTravel:openRoute});
}
