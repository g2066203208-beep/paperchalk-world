/* Approved character art gallery, all modules discovered by build-character-registry.py.
 * Registered character cards are separate from shuffled action cards.
 * The 1v2 tutorial does not silently put more than one friendly unit on the board.
 */
(function(root){
'use strict';
const registry=root.PaperchalkCharacterRegistry;
if(!registry)throw Error('Character registry missing');
const modal=document.getElementById('character-gallery');
const cards=document.getElementById('gallery-cards');
const trigger=document.getElementById('roster-trigger');
const close=document.getElementById('gallery-close');
function render(){
 const list=registry.byFaction('farmer');
 trigger.textContent='人物图鉴 · '+list.length;
 cards.replaceChildren();
 const deployed=new Set((root.__forestLevelDebug?.state.units||[]).filter(u=>u.side==='ally').map(u=>u.characterId).filter(Boolean));
 for(const c of list){
  const card=document.createElement('article');
  card.className='roster-card';
  card.dataset.characterId=c.id;
  const art=document.createElement('img');
  art.src=c.portrait;art.loading='lazy';
  art.alt=c.name+'人物原图';
  art.width=704;art.height=1024;
  art.onerror=()=>{art.alt=c.name+'立绘尚未载入';};
  card.append(art);
  const desc=document.createElement('div');desc.className='roster-card-description';
  const title=document.createElement('strong');title.textContent=c.name;
  const detail=document.createElement('small');detail.textContent=(c.roleName||c.profession)+' · '+(deployed.has(c.id)?'第一关上阵':'已收录');
  desc.append(title,detail);card.append(desc);cards.append(card);
 }
}
const open=()=>{render();modal.hidden=false;};
const hide=()=>{modal.hidden=true;};
trigger.addEventListener('click',open);
close.addEventListener('click',hide);
modal.addEventListener('click',e=>{if(e.target===modal)hide();});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)hide();});
render();
root.__farmerRoster=Object.freeze({get characters(){return registry.byFaction('farmer').map(c=>({id:c.id,profession:c.profession,portrait:c.portrait}));},open,close:hide});
})(window);
