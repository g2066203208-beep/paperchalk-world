// Accessible DOM narrative/map/avatar panel; separate from Canvas interactions.
import {CAST,WORLD_LOCATIONS,STORY_AVATARS,storyNode,canTravel} from './story-framework.js';
const $=id=>document.getElementById(id);
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
   heading.textContent='值夜的人';
   content.append(el('p','narrative-prose','你可以选择主角的呈现方式。两种形象拥有相同的故事、选择权和营业能力。'));
   content.append(el('p','narrative-helper','正式单人全身素材需要通过美术验收；现在是角色数据与界面骨架。'));
   for(const avatar of STORY_AVATARS)addButton(content,(avatar==='female'?'女主角':'男主角')+(s.avatar===avatar?' · 已选择':''),()=>dispatch('storyAvatar',avatar),s.avatar===avatar);
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
