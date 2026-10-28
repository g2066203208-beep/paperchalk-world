/** Explore-first scene director. It never changes money or NPC state itself. */
import {SCENE_DEFS,SCENE_PEOPLE} from '../systems/origin.js';
import {sceneArtwork} from './artwork.js';
import {clockLabel} from '../systems/clock.js';
// Only doors, actual characters and separate object sprites are interactive.
const hotspots={
 office:[['travel','alley',80,37,'离开办公室','door'],['talk','kai',64,55,'与阿凯交谈','person']],
 alley:[['travel','office',12,65,'回办公室','door'],['travel','market',95,57,'去集市','arrow'],
  ['travel','attic',29,42,'去阁楼','door'],['travel','docks',95,85,'去码头','arrow'],
  ['talk','neighbor',42,72,'与街坊交谈','person'],['talk','runner',69,76,'与少年交谈','person'],['protect','harassment',51,88,'帮助街坊','action']],
 market:[['travel','alley',8,70,'回背街','arrow'],['travel','labor',94,67,'去就业所','arrow'],
  ['talk','vendor',49,72,'与林姨交谈','person'],['talk','guard',73,76,'询问巡查员','person'],['aid','vendor',34,83,'修好摊位','action']],
 labor:[['travel','market',8,72,'回集市','arrow'],['travel','docks',92,73,'去码头','arrow'],
  ['talk','worker',39,75,'与失业工人交谈','person'],['talk','clerk',57,71,'与职员交谈','person'],['open','recruitment',51,83,'招聘登记册','paper']],
 docks:[['travel','alley',9,72,'回背街','arrow'],['travel','labor',91,72,'去就业所','arrow'],
  ['talk','docker',48,72,'与码头工友交谈','person'],['talk','unionist',77,75,'与工会成员交谈','person'],['open','transport',36,86,'运输合同','paper']],
 attic:[['travel','alley',11,75,'回背街','door'],['talk','caretaker',70,78,'与房东交谈','person'],['inspect','keepsake',18,53,'纪念盒','paper']]
};
const officeProps=[
 ['phone','telephone.svg','open','phone',27,78,11,'拨打电话'],
 ['map','map.svg','open','map',46,75,19,'展开地图'],
 ['folder','folder.svg','open','reports',60,82,14,'业务卷宗'],
 ['ledger','ledger.svg','open','ledger',76,84,12,'翻开账本'],
 ['deed','deed.svg','inspect','deed',13,78,10,'地契'],
 ['newspaper','newspaper.svg','inspect','newspaper',36,88,12,'旧报纸']
];
const sceneCell={office:'s0',alley:'s0',market:'s4',labor:'s5',docks:'s2',attic:'s0'};
const crowd=(w,venue)=>{
 const cell=sceneCell[venue];
 if(venue==='office'||venue==='attic')return '';
 const time=w.slices.clock.shift;
 const chars=w.slices.population.people.filter(p=>(time===1?p.work:time===2?p.leisure:p.home)===cell).slice(0,4);
 const positions=[[21,83],[32,80],[65,81],[84,80]];
 return '<div class="explore-crowd">'+chars.map((p,i)=>{
  const [x,y]=positions[i],shade=['#718f91','#ab837e','#bfa277','#697e90'][i];
  return '<button class="city-walker" type="button" data-explore-type="talk-citizen" data-explore-id="'+p.id+'" aria-label="和路人'+p.name+'交谈" style="--walk-x:'+x+'%;--walk-y:'+y+'%;--coat:'+shade+';--delay:'+i*.46+'s">'+
   '<svg viewBox="0 0 64 128" role="img" aria-label="'+p.name+'"><ellipse cx="34" cy="120" rx="27" ry="6" fill="#1e2934" opacity=".3"/>'+
   '<path d="M18 65L12 123H28L33 87L39 123H53L48 65" fill="#243541" stroke="#1c2a37" stroke-width="4"/>'+
   '<path d="M17 43L45 43L55 85H10Z" fill="var(--coat)" stroke="#233541" stroke-width="4"/>'+
   '<path d="M28 39L29 52L41 52L41 40" fill="#c69b88"/>'+
   '<path d="M18 16Q33 -7 50 17L47 37Q31 55 18 38Z" fill="#edc2a6" stroke="#253542" stroke-width="3"/>'+
   '<path d="M16 19L17 7L32 -1L49 8L54 25L46 16L36 19L25 12Z" fill="#263742"/>'+
   '<path d="M26 30h5M41 29h5" stroke="#263743" stroke-width="3"/></svg>'+
   '<span>'+p.name+' · '+p.occupation+'</span></button>';
 }).join('')+'</div>';
};
const escape=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
export function createExploreLayer(host,{readWorld,readLegacy,command,openPanel,onToggle}){
 const root=document.createElement('section');
 root.className='explore-root';root.setAttribute('aria-label','可探索的夜港实景与街道');
 host.appendChild(root);
 let visible=true,visitMark='',speech=null;
 function showSpeech(speaker,text){
   const label=root.querySelector('.explore-voice small'),body=root.querySelector('.explore-voice p');
   if(label&&body){label.textContent=speaker;body.textContent=text;
     root.querySelector('.explore-voice').hidden=false;}
   speech={speaker,text};
 }
 function render(){
   if(!visible)return;
   const w=readWorld(),s=readLegacy(),o=w.slices.origin,def=SCENE_DEFS[o.venue];
   const spots=hotspots[o.venue]||[];
   const sClock=w.slices.clock;
   const locals=(SCENE_PEOPLE[o.venue]||[]).map(x=>x.name).join('、');
   const spotsHTML=spots.map(([type,id,x,y,name,style])=>
     '<button type="button" class="explore-spot explore-'+style+'" data-explore-type="'+type+
     '" data-explore-id="'+id+'" style="left:'+x+'%;top:'+y+'%;--hot-left:'+x+'%;--hot-top:'+y+'%" aria-label="'+escape(name)+'"><span>'+escape(name)+'</span></button>'
   ).join('');
   const officeSprites=o.venue==='office'?officeProps.map(([key,file,type,id,x,y,width,label])=>
     '<button type="button" class="scene-object prop-'+key+'" data-explore-type="'+type+
     '" data-explore-id="'+id+'" style="--px:'+x+'%;--py:'+y+'%;--pw:'+width+'%" aria-label="'+escape(label)+'">'+
     '<img src="./assets/props/'+file+'" draggable="false" alt=""/><span class="scene-object-tip">'+escape(label)+'</span></button>'
   ).join(''):'';
   root.dataset.venue=o.venue;
   root.innerHTML='<div class="explore-stage scene-'+o.venue+'">'+
     '<div class="explore-visual">'+sceneArtwork(o.venue)+'</div>'+crowd(w,o.venue)+
     officeSprites+spotsHTML+
     '<div class="explore-location" aria-hidden="true">'+escape(def.name)+'</div>'+
     '<div class="explore-voice" role="status" aria-live="polite" hidden><small></small><p></p></div>'+
     '</div>';
   if(speech)showSpeech(speech.speaker,speech.text);
 }
 root.addEventListener('click',e=>{
   const el=e.target.closest('[data-explore-type]');if(!el)return;
   const type=el.dataset.exploreType,id=el.dataset.exploreId;
   if(type==='open'){
     // The player reaches the existing working tabletop from a physical scene object.
     if(id==='recruitment'||id==='transport'||id==='news'||id==='estates'){
       openPanel('reports',id);
     }else openPanel(id);
     return;
   }
   const action=type==='talk-citizen'?{module:'origin',type:'talk-citizen',person:id}:
     type==='travel'?{module:'origin',type:'travel',to:id}:
     type==='inspect'?{module:'origin',type:'inspect',object:id}:
     type==='talk'?{module:'origin',type:'talk',person:id}:
     type==='aid'?{module:'origin',type:'aid'}:
     {module:'origin',type:'protect'};
   const prev=readWorld().slices.origin.venue;
   const r=command(action);
   if(!r?.ok)return;
   if(type==='travel'&&prev!==id){visitMark=id;root.classList.remove('explore-arrive');void root.offsetWidth;root.classList.add('explore-arrive');}
   const ev=r.events?.find(x=>x.source==='origin');
   if(ev&&['talk','talk-citizen','aid','protect','inspect'].includes(type))showSpeech(ev.title,ev.text);
 });
 function show(){visible=true;root.hidden=false;render();onToggle?.(true);}
 function hide(){visible=false;root.hidden=true;onToggle?.(false);}
 render();
 return Object.freeze({render,show,hide,isVisible:()=>visible,say:showSpeech,current:()=>readWorld().slices.origin.venue});
}
