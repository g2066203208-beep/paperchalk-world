/* 3×3 per side density study (18 original GitHub artworks). This is a visual
 * comparison overlay, not a claim of playable 9v9 battle balance. */
'use strict';
(function(){
 const $=id=>document.getElementById(id);
 const stage=$('stage'),board=$('grid-stage');
 if(!stage||!board)return;
 const hunters=[
  ['传奇猎人','../assets/characters/monster-hunters/01-legendary-hunter.png'],
  ['血液医师','../assets/characters/monster-hunters/02-blood-physician.png'],
  ['陷阱工程师','../assets/characters/monster-hunters/03-trap-engineer.png'],
  ['赏金枪手','../assets/characters/monster-hunters/04-bounty-markswoman.png'],
  ['封印守卫','../assets/characters/monster-hunters/05-seal-warden.png'],
  ['野兽屠夫','../assets/characters/monster-hunters/06-beast-butcher.png'],
  ['斧兵斥候','../assets/characters/monster-hunters/07-axe-scout.png'],
  ['小个子猎人','../assets/characters/monster-hunters/minions/01-petite-hunter.png'],
  ['青年猎人','../assets/characters/monster-hunters/minions/02-young-hunter.png']
 ];
 const circus=[
  ['马戏团团长','../assets/cards/wonder-circus/01_ringmaster.png'],
  ['空中杂技师','../assets/cards/wonder-circus/02_aerial-acrobat.png'],
  ['飞刀手','../assets/cards/wonder-circus/03_knife-thrower.png'],
  ['驯兽师','../assets/cards/wonder-circus/04_beast-tamer.png'],
  ['逃脱艺术家','../assets/cards/wonder-circus/05_escape-artist.png'],
  ['大力女','../assets/cards/wonder-circus/06_strongwoman.png'],
  ['小丑','../assets/cards/wonder-circus/07_clown-performer.png'],
  ['马戏团道具员','../assets/characters/wonder-circus/minions/01-prop-preparation.png'],
  ['马戏团舞台工','../assets/characters/wonder-circus/minions/02-stagehand-seated.png']
 ];
 function group(side,data){
  const container=$('grid-'+side),fragment=document.createDocumentFragment();
  data.forEach(([name,url],i)=>{
   const card=document.createElement('button');
   card.type='button';card.className='grid-preview-card';
   card.dataset.cardIndex=String(i);card.dataset.side=side;
   card.title=name;card.setAttribute('aria-label',(side==='enemy'?'敌方':'我方')+'第'+(i+1)+'格 · '+name);
   const img=document.createElement('img');img.src=url;img.alt=name;img.loading='eager';img.decoding='async';
   const fallback=document.createElement('span');fallback.className='fallback';fallback.textContent='原画未加载';
   img.addEventListener('error',()=>{card.classList.add('is-missing');updateMetrics();});
   card.append(img,fallback);
   card.addEventListener('click',()=>{
    for(const old of board.querySelectorAll('.grid-preview-card.is-selected'))old.classList.remove('is-selected');
    card.classList.add('is-selected');$('grid-metrics').textContent=name+' · '+measure(card);
   });
   fragment.appendChild(card);
  });
  container.replaceChildren(fragment);
 }
 const measure=card=>{
  const rect=card.getBoundingClientRect();
  return Math.round(rect.width)+'×'+Math.round(rect.height)+' px';
 };
 function updateMetrics(){
  const first=board.querySelector('.grid-preview-card');
  if(!first)return;
  const rect=first.getBoundingClientRect();
  const fits=Array.from(board.querySelectorAll('.grid-preview-card')).every(card=>{
    const box=card.getBoundingClientRect(),area=$('board').getBoundingClientRect();
    return box.left>=area.left-2&&box.right<=area.right+2&&box.top>=area.top-2&&box.bottom<=area.bottom+2;
  });
  $('grid-metrics').textContent='敌我各9张 · 卡牌 '+measure(first)+(fits?' · 全部入镜':' · 空间不足');
  board.dataset.cardsFit=String(fits);
  board.dataset.cardWidth=String(Math.round(rect.width));
 }
 function setLayout(mode){
  const stacked=mode==='stacked';
  board.classList.toggle('layout-stacked',stacked);
  board.classList.toggle('layout-side-by-side',!stacked);
  for(const button of $('grid-preview-ui').querySelectorAll('button[data-layout]')){
   const selected=button.dataset.layout===mode;
   button.classList.toggle('active',selected);
   button.setAttribute('aria-pressed',String(selected));
  }
  requestAnimationFrame(()=>requestAnimationFrame(updateMetrics));
 }
 function enterPreview(){
  stage.classList.add('grid-preview');
  $('grid-show-preview').hidden=true;
  document.querySelector('#mode-subtitle').textContent='DOUBLE 3×3 · TABLE TEST';
  setLayout('side-by-side');
 }
 function leavePreview(){
  stage.classList.remove('grid-preview');
  $('grid-show-preview').hidden=false;
  document.querySelector('#mode-subtitle').textContent='3 VS 3 · TIMEGRID';
 }
 group('enemy',circus);
 group('ally',hunters);
 $('grid-preview-ui').addEventListener('click',e=>{
  const b=e.target.closest('button[data-layout]');
  if(b)setLayout(b.dataset.layout);
 });
 $('grid-back-to-battle').addEventListener('click',leavePreview);
 $('grid-show-preview').addEventListener('click',enterPreview);
 window.addEventListener('resize',()=>requestAnimationFrame(updateMetrics));
 window.CardGridPreview={enterPreview,leavePreview,setLayout,updateMetrics,art:{hunters:hunters.length,circus:circus.length}};
 enterPreview();
})();
