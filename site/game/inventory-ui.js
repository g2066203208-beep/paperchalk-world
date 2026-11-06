/* Immersive backpack — ordinary, physical belongings.
 * It is NOT a dashboard. Driven by the same saved daily-life inventory.
 */
(function(root){
 'use strict';
 const world=root.PaperWorldDailyLifeUI,core=root.PaperWorldDailyLife;
 const host=document.getElementById('novel-ui');
 if(!world||!core||!host)return;
 let visible=false,filter='all',selected='homework';
 const el=(tag,cls,txt)=>{
   const x=document.createElement(tag);if(cls)x.className=cls;
   if(txt!==undefined)x.textContent=String(txt);return x;
 };
 const pane=el('section','bag-ui');
 pane.id='overworld-bag';pane.hidden=true;
 pane.setAttribute('role','dialog');pane.setAttribute('aria-label','随身背包');
 pane.setAttribute('aria-modal','false');
 pane.innerHTML='<div class="bag-layout">'+
  '<header class="bag-head"><div class="bag-title"><small>PERSONAL BELONGINGS</small><strong>背包</strong></div>'+
  '<div class="bag-summary"><span id="bag-capacity"></span><span id="bag-cash"></span></div>'+
  '<button id="bag-close" aria-label="收起背包" type="button">×</button></header>'+
  '<div class="bag-filter" aria-label="物品分类"></div>'+
  '<div class="bag-content"><div class="bag-grid" role="listbox" aria-label="随身物品"></div>'+
  '<div class="bag-detail"><div class="bag-detail-illustration"></div><h3></h3>'+
  '<p class="bag-description"></p><div class="bag-item-meta"></div><div class="bag-item-actions"></div></div></div>'+
  '<div class="bag-message" role="status" aria-live="polite"></div></div>';
 host.appendChild(pane);
 const qs=sel=>pane.querySelector(sel);
 const icon={
  bread:'<path d="M4 11c-3-7 3-9 8-9s11 2 8 9l-2 10H6zM4 11h16M9 16v3M15 16v3"/>',
  water:'<path d="M9 3h6M10 5h4v3l4 4v8H6v-8l4-4zM7 14h10"/>',
  bandage:'<rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-30 12 12)"/><path d="m10 9 4 6M9 12h6"/>',
  keys:'<circle cx="7" cy="8" r="4"/><path d="M10 11l10 10m-4-4 3-3"/>',
  homework:'<path d="M6 2h12v20H6zM9 7h6M9 11h6M9 15h4"/>'
 };
 const svg=id=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+
  (icon[id]||'<circle cx="12" cy="12" r="9"/>')+'</svg>';
 const categories=[['all','全部'],['consumable','用品'],['important','重要']];
 function report(msg){qs('.bag-message').textContent=msg||''}
 function render(){
  if(!visible)return;
  const data=world.snapshot(),items=core.ITEM_META,slots=Object.entries(data.inventory).
   filter(([id,n])=>n>0&&items[id]&&(filter==='all'||items[id].category===filter));
  if(!slots.some(([id])=>id===selected))selected=slots[0]?.[0]||null;
  qs('#bag-capacity').textContent=Object.values(data.inventory).filter(n=>n>0).length+' / 20 格';
  qs('#bag-cash').textContent='¥ '+data.money;
  const filterRoot=qs('.bag-filter');filterRoot.replaceChildren();
  for(const [id,title] of categories){
   const b=el('button','bag-filter-button',title);b.type='button';
   b.dataset.active=String(filter===id);
   b.setAttribute('aria-pressed',String(filter===id));
   b.addEventListener('click',()=>{filter=id;render()});
   filterRoot.appendChild(b);
  }
  const grid=qs('.bag-grid');grid.replaceChildren();
  for(let i=0;i<20;i++){
    const entry=slots[i],slot=el('button','bag-slot');
    slot.type='button';slot.setAttribute('role','option');
    if(entry){
      const [id,n]=entry,meta=items[id];
      slot.dataset.item=id;slot.dataset.active=String(selected===id);
      slot.setAttribute('aria-selected',String(selected===id));
      slot.setAttribute('aria-label',meta.label+' '+n+'件');
      const pic=el('span','bag-slot-icon');pic.innerHTML=svg(id);
      slot.appendChild(pic);slot.appendChild(el('span','bag-slot-name',meta.label));
      if(n>1)slot.appendChild(el('span','bag-slot-count','×'+n));
      slot.addEventListener('click',()=>{selected=id;report('');render()});
    }else{
      slot.disabled=true;slot.setAttribute('aria-label','空格');
    }
    grid.appendChild(slot);
  }
  const name=qs('.bag-detail h3'),desc=qs('.bag-description'),
    picture=qs('.bag-detail-illustration'),info=qs('.bag-item-meta'),
    acts=qs('.bag-item-actions');
  picture.replaceChildren();info.replaceChildren();acts.replaceChildren();
  if(!selected){name.textContent='空';desc.textContent='没有可查看的物品。';return}
  const item=items[selected];name.textContent=item.label;
  picture.innerHTML=svg(selected);
  const inspected=world.engine.inspectItem(selected);
  desc.textContent=inspected.ok?inspected.message:item.description;
  info.textContent=item.category==='important'?'重要随身物品':
    '持有 '+data.inventory[selected]+' 件 · 最多堆叠 '+item.stackMax;
  if(item.effect){
    const use=el('button','bag-use','使用');use.type='button';
    use.addEventListener('click',()=>{
      const r=world.engine.use(selected);
      report(r.ok?r.message:r.reason);render();world.showCaption?.(r.ok?r.message:r.reason);
    });
    acts.appendChild(use);
  }else{
    acts.appendChild(el('span','bag-important','随身保管'));
  }
 }
 function open(){
  if(!world.isModeActive()||document.getElementById('novel-ui').hidden)return false;
  root.PaperWorldQuickTools?.phone?.close?.();
  const tools=root.PaperWorldQuickTools;
  if(tools?.active?.()==='phone')tools.close();
  pane.hidden=false;visible=true;report('');render();
  root.dispatchEvent(new CustomEvent('paperchalk:bag-visibility',{detail:{open:true}}));
  return true;
 }
 function close(){
  if(!visible)return;
  visible=false;pane.hidden=true;root.dispatchEvent(new CustomEvent('paperchalk:bag-visibility',{detail:{open:false}}));
 }
 function toggle(){if(visible)close();else open();}
 qs('#bag-close').addEventListener('click',close);
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&visible){e.stopPropagation();e.preventDefault();close()}
 });
 root.addEventListener('paperchalk:phone-visibility',e=>{
  if(e.detail?.open)close();
 });
 const unregister=world.engine.subscribe(()=>{if(visible)render()});
 root.PaperWorldInventoryUI=Object.freeze({open,close,toggle,isOpen:()=>visible,refresh:render,dispose:unregister});
})(window);
