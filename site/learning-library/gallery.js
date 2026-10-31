import {GAMES,CATEGORIES,storeLink,galleryLink} from './games.js?v=20261031-library1';
const $=id=>document.getElementById(id);
const state={data:{},selected:0,tag:'全部',query:'',core:false,onlySaved:false,
 visible:48,current:0,viewerItems:[],saved:new Set()};
try{state.saved=new Set(JSON.parse(localStorage.getItem('paperworld-study-saved-v1')||'[]'))}catch{}
const core=GAMES.filter(g=>g.core);
function linkSafe(url){
 try{let u=new URL(url);return u.protocol==='https:'?u.href:'#'}catch{return '#'}
}
function el(tag,className,text){
 const n=document.createElement(tag);
 if(className)n.className=className;
 if(text!==undefined)n.textContent=text;
 return n;
}
function imagesFor(g){
 return (state.data[String(g.id)]||[]).filter(i=>i&&typeof i.url==='string'&&i.url.startsWith('https://'));
}
function matches(g){
 const q=state.query.trim().toLocaleLowerCase();
 return (!state.core||g.core)&&(!state.onlySaved||state.saved.has(g.id))&&
 (state.tag==='全部'||g.tags.includes(state.tag))&&
 (!q||[g.title,g.cn,g.tags.join(' '),g.focus].some(t=>t.toLocaleLowerCase().includes(q)));
}
function menu(){
 const list=$('game-list');list.replaceChildren();
 for(const g of GAMES.filter(matches)){
  const b=el('button','game-item'+(state.selected===g.id?' active':''));
  b.type='button';b.setAttribute('role','listitem');
  const title=el('strong','',g.cn);b.append(title);
  b.append(el('small','',g.title));
  const row=el('span','game-count');row.append(el('small','',imagesFor(g).length+' 张实机图'));
  if(g.core)row.append(el('span','mark','指定参考'));
  b.append(row);b.addEventListener('click',()=>{state.selected=g.id;state.visible=48;render()});
  list.append(b);
 }
 if(!list.children.length)list.append(el('p','empty','没有匹配的游戏，换个关键词或筛选项。'));
}
function categoryButtons(){
 const parent=$('categories');parent.replaceChildren();
 for(const category of CATEGORIES){
  const b=el('button',category===state.tag?'active':'',category);
  b.type='button';b.setAttribute('aria-pressed',String(category===state.tag));
  b.addEventListener('click',()=>{state.tag=category;state.selected=0;state.visible=48;render()});
  parent.append(b);
 }
}
function photoData(){
 const subset=GAMES.filter(matches).filter(g=>state.selected===0||g.id===state.selected);
 // Default grouping keeps the original five visually prominent.
 return subset.flatMap(g=>imagesFor(g).map((image,i)=>({game:g,image,index:i})));
}
function photoCard(item,index){
 const {game:g,image:p}=item;
 const article=el('article','photo');
 const button=el('button','view');button.type='button';
 button.setAttribute('aria-label','放大 '+g.cn+' · '+p.label);
 const img=el('img');
 img.loading=index<8?'eager':'lazy';img.decoding='async';
 img.src=linkSafe(p.thumb||p.url);img.alt=g.cn+' 游戏截图：'+(p.label||('第 '+(item.index+1)+' 张'));
 img.addEventListener('error',()=>{
  img.classList.add('failed');
  const n=el('span','failed-note','来源图片暂不可用；打开原始链接查看');
  if(!button.querySelector('.failed-note'))button.append(n);
 });
 button.append(img);
 button.addEventListener('click',()=>openViewer(index));
 article.append(button);
 const cap=el('div','caption');
 cap.append(el('strong','',g.cn));
 cap.append(el('small','',p.label||'Steam 官方真实游戏截图'));
 const a=el('a','source','来源 ↗');a.href=linkSafe(p.source||storeLink(g.id));a.rel='noopener noreferrer';a.target='_blank';
 cap.append(a);article.append(cap);
 return article;
}
let currentPhotos=[];
function render(){
 menu();categoryButtons();
 const active=GAMES.find(g=>g.id===state.selected);
 $('selection-title').textContent=active?active.cn:'全部实机游戏截图';
 $('selection-subtitle').textContent=active?active.title:'按照游戏收录并标注来源，不放概念图';
 $('study-note').replaceChildren();
 $('study-note').append(el('strong','',active?'本游戏研究重点':'PAPERWORLD 对照研究'));
 $('study-note').append(el('span','',active?active.focus:'先看柜台顶面与人物分层，再看档案操作与窗口反馈。不得把其他游戏的成品 UI 当作我们自己的贴图使用。'));
 const source=$('official-source');
 source.hidden=!active;
 if(active){source.href=storeLink(active.id);source.textContent='Steam 官方页面 ↗'}
 currentPhotos=photoData();
 const parent=$('photos');parent.replaceChildren();
 currentPhotos.slice(0,state.visible).forEach((p,i)=>parent.append(photoCard(p,i)));
 const empty=$('empty');
 empty.hidden=currentPhotos.length>0;
 const m=$('more');m.hidden=currentPhotos.length<=state.visible;
 m.textContent='继续加载 '+Math.min(48,currentPhotos.length-state.visible)+' 张 · 共 '+currentPhotos.length+' 张';
 const total=Object.values(state.data).reduce((acc,a)=>acc+(Array.isArray(a)?a.length:0),0);
 $('total-games').textContent=GAMES.length+' 款游戏';
 $('total-images').textContent=total+' 张有来源的实机截图';
}
function openViewer(index){
 if(index<0||index>=currentPhotos.length)return;
 state.viewerItems=currentPhotos;state.current=index;
 updateViewer();
 $('viewer').showModal();
}
function updateViewer(){
 const item=state.viewerItems[state.current];if(!item)return;
 const {game:g,image:p}=item;
 $('viewer-title').textContent=g.cn+' / '+g.title;
 $('viewer-count').textContent=(state.current+1)+' / '+state.viewerItems.length;
 $('viewer-img').src=linkSafe(p.url);
 $('viewer-img').alt=g.cn+'：'+p.label;
 $('viewer-label').textContent=p.label+' · '+(p.sourceKind==='official-steam-store'?'Steam 商店官方截图':'经来源核对的实机画面');
 $('viewer-source').href=linkSafe(p.source||galleryLink(g.id));
 $('viewer-store').href=storeLink(g.id);
 $('viewer-prev').disabled=state.current<=0;
 $('viewer-next').disabled=state.current>=state.viewerItems.length-1;
}
$('viewer-prev').addEventListener('click',()=>{state.current=Math.max(0,state.current-1);updateViewer()});
$('viewer-next').addEventListener('click',()=>{state.current=Math.min(state.viewerItems.length-1,state.current+1);updateViewer()});
$('viewer-close').addEventListener('click',()=>$('viewer').close());
$('viewer').addEventListener('click',e=>{if(e.target===$('viewer'))$('viewer').close()});
document.addEventListener('keydown',e=>{
 if(!$('viewer').open)return;
 if(e.key==='ArrowRight'){state.current=Math.min(state.viewerItems.length-1,state.current+1);updateViewer()}
 if(e.key==='ArrowLeft'){state.current=Math.max(0,state.current-1);updateViewer()}
});
$('search').addEventListener('input',e=>{state.query=e.target.value;state.selected=0;state.visible=48;render()});
$('core-only').addEventListener('change',e=>{state.core=e.target.checked;state.selected=0;state.visible=48;render()});
$('saved-only').addEventListener('change',e=>{state.onlySaved=e.target.checked;state.selected=0;state.visible=48;render()});
$('all-games').addEventListener('click',()=>{state.selected=0;state.tag='全部';state.query='';$('search').value='';state.core=false;$('core-only').checked=false;state.onlySaved=false;$('saved-only').checked=false;state.visible=48;render()});
$('more').addEventListener('click',()=>{state.visible+=48;render()});
async function loadImages(){
 let parsed=null;
 try{
  const response=await fetch('./screenshots.json',{cache:'no-store'});
  if(response.ok)parsed=await response.json();
 }catch{}
 if(!parsed?.games){
  try{const response=await fetch('./seed-screenshots.json');if(response.ok)parsed=await response.json()}catch{}
 }
 if(parsed?.schema==='paperworld-real-game-screenshots-v1'&&parsed.games&&typeof parsed.games==='object'){
  state.data=Object.fromEntries(GAMES.map(g=>[String(g.id),Array.isArray(parsed.games[String(g.id)])?parsed.games[String(g.id)]:[]]));
 }
 render();
}
window.__PAPERWORLD_LEARNING_LIBRARY__={
 get totalGames(){return GAMES.length},
 get totalPhotos(){return Object.values(state.data).reduce((n,a)=>n+a.length,0)},
 get selected(){return state.selected},
 get currentPhotos(){return currentPhotos.length},
 get coreCount(){return core.length},
 get sourceKinds(){return [...new Set(Object.values(state.data).flat().map(x=>x.sourceKind))]}
};
render();await loadImages();
