// Accessible DOM narrative/map/avatar panel; separate from Canvas interactions.
import {CAST,WORLD_LOCATIONS,STORY_AVATARS,HERO_PROFILES,protagonistAssignment,storyNode,canTravel} from './story-framework.js';
const $=id=>document.getElementById(id);
const ART={female:'./assets/protagonists/alina-preview.webp',male:'./assets/protagonists/mikhail-preview.webp'};
const el=(tag,cls='',text='')=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
export function mountStoryUI({dispatch,getState}){
 const panel=$('storyPanel'),heading=$('storyHeading'),content=$('storyContent');
 const modes=['story','map','avatar'];let mode='story',opened=false,seenKey='';
 function addButton(parent,label,handler,disabled=false){
  const b=el('button','narrative-option',label);b.type='button';b.disabled=disabled;
  b.addEventListener('click',handler);parent.append(b);return b;
 }
 function refresh(force=false){
  if(!opened)return;
  const s=getState()?.story;if(!s)return;
  const key=JSON.stringify([mode,s.active,s.location,s.avatar,s.flags,s.memories,s.history.length,s.visited]);
  if(!force&&key===seenKey)return;seenKey=key;content.replaceChildren();
  if(mode==='story'){
   heading.textContent='窗边的话';
   const node=storyNode(s);
   if(!node){
    content.append(el('p','narrative-prose','此刻没什么必须说的。窗外的雪仍在工作，而且从不领工资。'));
    addButton(content,'看看街坊地图',()=>show('map'));return;
   }
   if(node.scene!==s.location){
    content.append(el('p','narrative-prose','这段话发生在「'+WORLD_LOCATIONS[node.scene].name+'」。人和故事不会跟着你瞬间移动。'));
    addButton(content,'打开地图，回到那里',()=>show('map'));return;
   }
   content.append(el('p','narrative-speaker',CAST[node.speaker]?.name||'旁白'));
   content.append(el('p','narrative-prose',node.text));
   content.append(el('p','narrative-helper','你可以不急着作答。关掉窗口，继续做自己的事。'));
   for(const choice of node.choices)
    addButton(content,choice.text,()=>dispatch('storyChoice',choice.id,undefined,node.id));
  }else if(mode==='map'){
   heading.textContent='雪城一角';
   content.append(el('p','narrative-helper','只有真实相连的街口可以前往。当前没有倒计时。'));
   const map=el('div','narrative-map');content.append(map);
   for(const location of Object.values(WORLD_LOCATIONS)){
    const current=s.location===location.id,linked=canTravel(s,location.id);
    const wrap=el('div','narrative-location'+(current?' current':''));
    wrap.append(el('strong','',location.name),el('p','',location.blurb));
    if(current)wrap.append(el('span','narrative-here','你在这里'));
    else addButton(wrap,linked?'走过去':'需要从相邻街口前往',()=>dispatch('storyTravel',location.id),!linked);
    map.append(wrap);
   }
  }else{
   heading.textContent='选择值守小店的人';
   content.append(el('p','narrative-helper','两人都在同一所国立大学读书。你选中的人经营小店，另一人接受国家分配，到城里单位见习工作。'));
   const roles=el('div','protagonist-choices');content.append(roles);
   for(const avatar of STORY_AVATARS){
    const p=HERO_PROFILES[avatar],chosen=s.avatar===avatar;
    const card=el('button','protagonist-card'+(chosen?' selected':''));card.type='button';card.setAttribute('aria-pressed',String(chosen));
    card.setAttribute('aria-label',(avatar==='female'?'女主角':'男主角')+' · '+p.name+(chosen?' · 已选择':''));
    const img=el('img','protagonist-art');img.src=ART[avatar];img.alt=p.name+'全身立绘';img.width=80;img.height=120;img.loading='eager';
    card.append(img,el('strong','',p.name),el('span','protagonist-details',p.school),
      el('span','protagonist-job',chosen?'小店店主 · 当前玩家':'选择经营小店'));
    card.addEventListener('click',()=>dispatch('storyAvatar',avatar));
    roles.append(card);
   }
   if(s.avatar){
    const partner=protagonistAssignment(s.avatar),person=HERO_PROFILES[partner.cityWorker];
    const box=el('section','city-assignment');
    box.append(el('strong','', '城市分配通知'),
      el('p','',person.name+' · '+partner.cityJob),
      el('p','narrative-helper','另一位主角在城市工作，不会变成店里的第二名店主。更完整的市区工作流程和人物动画仍待制作。'));
    content.append(box);
   }
  }
 }
 function show(nextMode='story'){
  mode=modes.includes(nextMode)?nextMode:'story';opened=true;panel.hidden=false;panel.inert=false;seenKey='';
  for(const m of modes)$(m==='story'?'storyTab':m==='map'?'mapTab':'avatarTab').setAttribute('aria-pressed',String(m===mode));
  refresh(true);$('closeStory').focus({preventScroll:true});
 }
 function hide(){opened=false;panel.hidden=true;panel.inert=true;seenKey='';}
 $('storyBtn').addEventListener('click',()=>show('story'));
 $('mapBtn').addEventListener('click',()=>show('map'));
 $('avatarBtn').addEventListener('click',()=>show('avatar'));
 $('closeStory').addEventListener('click',hide);
 for(const [id,m] of [['storyTab','story'],['mapTab','map'],['avatarTab','avatar']])
  $(id).addEventListener('click',()=>show(m));
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();hide();$('storyBtn').focus();}});
 return {show,hide,refresh,isOpen:()=>opened};
}
