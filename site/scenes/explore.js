/** Explore-first scene director. It never changes money or NPC state itself. */
import {SCENE_DEFS,SCENE_PEOPLE} from '../systems/origin.js';
import {sceneArtwork} from './artwork.js';
import {clockLabel} from '../systems/clock.js';
const hotspots={
 office:[
  ['travel','alley',85,43,'推开办公室的门','door'],
  ['inspect','deed',19,64,'查看地契','paper'],
  ['inspect','newspaper',42,79,'那晚的报纸','paper'],
  ['inspect','window',24,31,'望向街道','object'],
  ['open','map',51,74,'展开城市地图','object'],
  ['open','phone',65,71,'拿起旧电话','object'],
  ['open','reports',58,83,'打开工作卷宗','object'],
  ['talk','kai',67,61,'与阿凯谈谈','person'],
  ['inspect','barewall',6,39,'查看毛坯墙面','object']
 ],
 alley:[
  ['travel','office',13,67,'回到办公室','door'],
  ['travel','market',88,65,'前往集市','arrow'],
  ['travel','attic',29,43,'走上旧阁楼','door'],
  ['travel','docks',97,75,'前往码头','arrow'],
  ['inspect','poster',40,50,'看街头涂写','paper'],
  ['talk','neighbor',42,72,'听街坊说话','person'],
  ['talk','runner',69,76,'和街头少年交谈','person'],
  ['protect','harassment',51,88,'帮街坊解决骚扰','action']
 ],
 market:[
  ['travel','alley',11,71,'返回背街','arrow'],
  ['travel','labor',92,67,'到就业所去','arrow'],
  ['talk','vendor',49,72,'和林姨交谈','person'],
  ['talk','guard',73,76,'问问巡查员','person'],
  ['inspect','stall',23,71,'观察菜摊','object'],
  ['aid','vendor',34,83,'帮忙修好摊位','action'],
  ['inspect','sign',76,54,'阅读招聘告示','paper']
 ],
 labor:[
  ['travel','market',12,72,'返回集市','arrow'],
  ['travel','docks',88,73,'往码头走','arrow'],
  ['talk','worker',39,75,'和失业工人说话','person'],
  ['talk','clerk',57,71,'询问就业所职员','person'],
  ['inspect','notice',16,58,'查看招聘栏','paper'],
  ['inspect','factory',78,38,'望向停工厂房','object'],
  ['open','recruitment',51,83,'查看招聘机会','object']
 ],
 docks:[
  ['travel','alley',9,72,'回到旧港背街','arrow'],
  ['travel','labor',87,71,'前往就业所','arrow'],
  ['talk','docker',48,72,'听码头工友说话','person'],
  ['talk','unionist',77,75,'和工会成员谈谈','person'],
  ['inspect','manifest',26,68,'检查运货单','paper'],
  ['inspect','crane',63,28,'看港口吊机','object'],
  ['open','transport',36,86,'查看运输合同','object']
 ],
 attic:[
  ['travel','alley',11,75,'走下阁楼','door'],
  ['inspect','bed',21,75,'看以前的床铺','object'],
  ['inspect','keepsake',18,53,'旧孤儿院徽章','paper'],
  ['talk','caretaker',70,78,'和旧房东聊聊','person']
 ]
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
    '<button type="button" class="explore-spot explore-'+style+'" data-explore-type="'+type+'" data-explore-id="'+id+'" style="left:'+x+'%;top:'+y+'%" aria-label="'+escape(name)+'"><span>'+escape(name)+'</span></button>'
   ).join('');
   root.innerHTML='<div class="explore-visual">'+sceneArtwork(o.venue)+'</div>'+
     '<div class="explore-head"><small>THE NIGHT HARBOR · '+String(s.day).padStart(2,'0')+'</small>'+
     '<strong>'+escape(def.name)+'</strong><em>'+escape(clockLabel(w.day,sClock.shift))+'</em></div>'+
     '<div class="explore-status"><span>流言传闻 '+o.legend+'</span><span>真实身份：'+(o.identityExposure===0?'无人知晓':'存在疑点')+'</span></div>'+
     '<div class="explore-hint">可直接点击门、人物和场景里的物品 · '+escape(locals)+'</div>'+
     '<div class="explore-voice" role="status" aria-live="polite" hidden><small></small><p></p></div>'+
     spotsHTML;
   if(speech)showSpeech(speech.speaker,speech.text);
 }
 root.addEventListener('click',e=>{
   const el=e.target.closest('[data-explore-type]');if(!el)return;
   const type=el.dataset.exploreType,id=el.dataset.exploreId;
   if(type==='open'){
     // The player reaches the existing working tabletop from a physical scene object.
     if(id==='recruitment'||id==='transport'){
       openPanel('reports',id);
     }else openPanel(id);
     return;
   }
   const action=type==='travel'?{module:'origin',type:'travel',to:id}:
     type==='inspect'?{module:'origin',type:'inspect',object:id}:
     type==='talk'?{module:'origin',type:'talk',person:id}:
     type==='aid'?{module:'origin',type:'aid'}:
     {module:'origin',type:'protect'};
   const prev=readWorld().slices.origin.venue;
   const r=command(action);
   if(!r?.ok)return;
   if(type==='travel'&&prev!==id){visitMark=id;root.classList.remove('explore-arrive');void root.offsetWidth;root.classList.add('explore-arrive');}
   const ev=r.events?.find(x=>x.source==='origin');
   if(ev)showSpeech(ev.title,ev.text);
 });
 function show(){visible=true;root.hidden=false;render();onToggle?.(true);}
 function hide(){visible=false;root.hidden=true;onToggle?.(false);}
 render();
 return Object.freeze({render,show,hide,isVisible:()=>visible,say:showSpeech,current:()=>readWorld().slices.origin.venue});
}
