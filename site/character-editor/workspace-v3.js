/* Paperchalk L2D — focused workspace shell.
 * Presentation/navigation only. Model identity, art, undo, bones and saved
 * PartRigs stay with the existing editor and are never rewritten here.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const ed=window.characterEditor,rig=window.PaperchalkPartRigStudio;
if(!ed||!rig||!document.body.classList.contains('studio-page')||
   document.body.dataset.focusedWorkspace==='v3')return;
document.body.dataset.focusedWorkspace='v3';
const root=document.body,header=document.querySelector('body>header'),
  actions=header?.querySelector('.actions'),stage=$('stage'),
  left=document.querySelector('.layout .left'),
  right=document.querySelector('.layout .right'),
  panel=$('part-rig-panel'),quick=$('rig-quick-panel');
if(!header||!actions||!stage||!left||!right||!panel||!quick)return;

function make(tag,className='',label=''){
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(label)node.textContent=label;
 return node;
}
function command(label,callback,extraClass=''){
 const button=make('button',extraClass,label);
 button.type='button';button.addEventListener('click',callback);
 return button;
}
const title=header.querySelector('strong');
if(title)title.textContent='L2D Studio';
const subtitle=make('span','workspace-subtitle','角色工作室');
title?.after(subtitle);

// One coherent, nonduplicated header. Keep the original buttons and their
// listeners; moving nodes does not replace or fake save/undo/export actions.
const more=make('details','workspace-more');
more.id='workspace-more';
more.innerHTML='<summary aria-label="更多工作室功能" title="更多工作室功能">···</summary>';
const moreContents=make('div','workspace-more-contents');
moreContents.setAttribute('aria-label','工程、文件与历史操作');
more.append(moreContents);
for(const id of ['btnUndo','btnRedo','btnExport']){
 const existing=$(id);if(existing)moreContents.append(existing);
}
const importAction=command('导入 PSD / ZIP',()=>{
 more.open=false;
 const native=$('studio-person-import')||$('studio-parts-import');
 if(native?.tagName==='BUTTON')native.click();else native?.click();
});
const exportAction=command('导出合成 PNG',()=>{more.open=false;$('exportPng')?.click()});
const v4ImportAction=command('导入动画工程 ZIP',()=>{more.open=false;$('studio-v4zip')?.click()});
moreContents.append(importAction,exportAction,v4ImportAction);
// The six faction links are navigation, not persistent editing actions.
// Move the ORIGINAL anchors into the accessible overflow menu. Keeping all
// of them inline in the narrow header made them physically overlap and steal
// pointer events from the ... menu, blocking editing and production QA.
for(const id of [
 'knight-booth-entry','demon-booth-entry','witch-booth-entry',
 'circus-booth-entry','vampire-booth-entry','hunter-booth-entry'
]){
 const anchor=$(id);
 if(anchor){anchor.classList.add('workspace-booth-entry');moreContents.append(anchor);}
}
// Keep the existing rig-detail action, but it is a secondary workflow,
// not a persistent primary toolbar control. Preserve its original listener.
const rigDetailButton=$('idle-open');
if(rigDetailButton)moreContents.prepend(rigDetailButton);
actions.append(more);
$('btnRecovery')?.setAttribute('title','打开恢复、撤销和原版复原');
$('btnRecovery')?.setAttribute('aria-label','复原工具');
$('btnSave')?.setAttribute('title','将工作室的当前稿保存给本机同站点游戏');
const saveButton=$('btnSave');
if(saveButton&&typeof MutationObserver==='function'){
 const reflectSaveState=()=>{
  saveButton.dataset.saved=/已保存|保存成功/.test(saveButton.textContent)?'true':'false';
 };
 new MutationObserver(reflectSaveState).observe(saveButton,{
  childList:true,characterData:true,subtree:true
 });
 reflectSaveState();
}

// A single character & tool inspector, rather than 5 open panels stacked.
const inspectorTabs=make('div','workspace-inspector-tabs');
inspectorTabs.id='workspace-inspector-tabs';
inspectorTabs.setAttribute('role','tablist');
inspectorTabs.setAttribute('aria-label','当前编辑任务');
const modes=[['motion','动态'],['placement','位置'],['mask','遮挡'],['paint','绘画']];
const refs=new Map();
for(const [id,label] of modes){
 const button=command(label,()=>setMode(id,true));
 button.dataset.inspector=id;button.setAttribute('role','tab');
 button.setAttribute('aria-selected',id==='motion'?'true':'false');
 button.setAttribute('aria-controls',id==='paint'?'tools':'part-rig-panel');
 inspectorTabs.append(button);refs.set(id,button);
}
right.insertBefore(inspectorTabs,panel);
// Existing animation controls are moved, not duplicated or re-initialized.
panel.querySelector('.rig-h')?.after(quick);
const crouch=$('rig-crouch-motion');
if(crouch)quick.querySelector('.rig-quick-heading')?.after(crouch);
const advancedDetails=make('details','workspace-rig-more');
advancedDetails.id='workspace-rig-more';
advancedDetails.innerHTML='<summary>更多参数与专业工具</summary>';
for(const id of ['rig-advanced','rig-file-actions','l2d-production-guide']){
 const node=$(id);if(node)advancedDetails.append(node);
}
for(const node of [panel.querySelector('.rig-part-amount'),panel.querySelector('.rig-buttons')]){
 if(node)advancedDetails.append(node);
}
// The mask/placement inspectors can be taller than the viewport. Keep the
// actual advanced-tools disclosure BEFORE those editors, not below them where
// the canvas, sticky header or mask controls can intercept the click.
// Preserve the real nested controls; only move the disclosure itself.
const rigPartSelector=panel.querySelector('label:has(#rig-part)');
if(rigPartSelector)rigPartSelector.after(advancedDetails);
else panel.prepend(advancedDetails);
// Keep the preview clean until the user explicitly asks for details.
const extended=make('button','workspace-motion-more','更多动态参数');
extended.type='button';
extended.id='workspace-motion-more';
extended.setAttribute('aria-expanded','false');
extended.onclick=()=>{
 const open=root.dataset.motionExtra==='true';
 root.dataset.motionExtra=String(!open);
 extended.setAttribute('aria-expanded',String(!open));
 extended.textContent=open?'更多动态参数':'收起高级动态';
};
quick.querySelector('#rig-quick-sliders')?.after(extended);

function isSmall(){
 return matchMedia('(max-width:710px), (max-width:950px) and (max-height:520px) and (pointer:coarse)').matches;
}
function setMode(name,fromClick){
 if(!refs.has(name))name='motion';
 // Leaving a paint/mask/resize operation always returns to safe canvas pan.
 if(fromClick&&ed?.S?.tool!=='pan')ed.setTool('pan');
 root.dataset.inspector=name;
 for(const [key,button] of refs){
  const active=key===name;
  button.setAttribute('aria-selected',String(active));
  button.classList.toggle('active',active);
 }
 // The original phone navigation continues to own canvas/character/layer
 // visibility; we only request its existing motion/paint pages as needed.
 if(isSmall()&&fromClick){
  const destination=name==='paint'?'paint':'motion';
  const current=root.dataset.studioPane;
  if(current!==destination){
   $('mobile-studio-tabs')?.querySelector('[data-studio-pane="'+destination+'"]')?.click();
  }
 }
 if(name==='motion')requestAnimationFrame(()=>quick.hidden=!rig.state?.active);
}
root.dataset.motionExtra='false';
root.dataset.canvasTool=ed.S.tool;
setMode('motion',false);

// The otherwise long restoration toolbar becomes a small accessible sheet.
const recovery=$('studio-recovery');
if(recovery){
 const close=command('关闭',()=>{
  recovery.hidden=true;
  $('btnRecovery')?.setAttribute('aria-expanded','false');
 },'workspace-recovery-close');
 close.setAttribute('aria-label','关闭复原面板');
 // Keep the close action pinned inside its own scrollable sheet, not in the title.\n recovery.prepend(close);
}

// One small viewport toolbar: move secondary commands behind a menu while
// keeping their existing click handlers and keyboard shortcuts intact.
const quickbar=$('easy-quickbar');
if(quickbar){
 const toolMore=make('details','workspace-quick-more');
 toolMore.id='workspace-quick-more';
 toolMore.innerHTML='<summary title="更多画布操作" aria-label="更多画布操作">···</summary>';
 const list=make('div','workspace-quick-more-list');
 list.id='workspace-quick-more-list';
 for(const id of ['easy-face','easy-undo','easy-redo','easy-edit','easy-animate']){
  const button=$(id);if(button)list.append(button);
 }
 const eraser=quickbar.querySelector('[data-easy-tool="eraser"]');
 if(eraser)list.prepend(eraser);
 toolMore.append(list);quickbar.append(toolMore);
 list.addEventListener('click',e=>{
  if(e.target.closest('button'))toolMore.open=false;
 });
}

// The simple paint palette remains complete: rarely used selection/fill
// tools are one optional expansion away, not disabled or deleted.
const paintTools=$('tools');
if(paintTools){
 const paintMore=make('details','workspace-paint-more');
 paintMore.id='workspace-paint-more';
 paintMore.innerHTML='<summary>更多绘画与选区工具</summary>';
 const advancedPaint=make('div','workspace-paint-more-grid');
 for(const name of ['picker','fill','move','rect','lasso']){
  const button=paintTools.querySelector('[data-tool="'+name+'"]');
  if(button)advancedPaint.append(button);
 }
 paintMore.append(advancedPaint);
 paintTools.after(paintMore);
}
// Existing phone tab bar gets a true overflow slot instead of 6 tiny
// permanently visible targets; delegation still reaches its old handlers.
const mobileTabs=$('mobile-studio-tabs');
if(mobileTabs){
 const mobileMore=make('details','workspace-mobile-more');
 mobileMore.id='workspace-mobile-more';
 mobileMore.innerHTML='<summary aria-label="更多工作区">更多</summary>';
 const dropdown=make('div','workspace-mobile-more-list');
 for(const selector of ['[data-studio-pane="paint"]','#mobile-studio-recover']){
  const button=mobileTabs.querySelector(selector);
  if(button)dropdown.append(button);
 }
 mobileMore.append(dropdown);mobileTabs.append(mobileMore);
 dropdown.addEventListener('click',e=>{
  if(e.target.closest('button'))mobileMore.open=false;
 });
 for(const [value,label] of [['canvas','画布'],['characters','人物'],
                              ['layers','部件'],['motion','动作']]){
  const button=mobileTabs.querySelector('[data-studio-pane="'+value+'"]');
  if(button)button.textContent=label;
 }
 mobileTabs.addEventListener('click',e=>{
  const button=e.target.closest('[data-studio-pane]');
  if(button?.dataset.studioPane==='motion')setMode('motion',false);
  if(button?.dataset.studioPane==='paint')setMode('paint',false);
 });
}

// Import stays reachable without reproducing every file action inline.
const importSection=[...left.querySelectorAll(':scope > section')].find(
  section=>section.querySelector('#zipImport,#psdImport'));
if(importSection){
 const fold=make('details','workspace-import-more');
 fold.id='workspace-import-more';
 fold.innerHTML='<summary>素材导入与文件管理</summary>';
 importSection.before(fold);fold.append(importSection);
}
const artSection=[...left.querySelectorAll(':scope > section')].find(
 section=>section.querySelector('#layers'));
if(artSection)artSection.classList.add('workspace-layers-section');
const selector=$('rig-part');
function syncSelection(){
 const selected=selector?.selectedOptions?.[0]?.textContent?.trim()||'未选择部件';
 const name=$('studio-character')?.selectedOptions?.[0]?.textContent?.trim()||'角色工作室';
 subtitle.textContent=rig.state?.active?name+' · '+selected:name;
 subtitle.title=subtitle.textContent;
}
selector?.addEventListener('change',syncSelection);
window.addEventListener('paperchalk:studio-ready-to-edit',syncSelection);
window.addEventListener('paperchalk:studio-selection-changed',syncSelection);
window.addEventListener('paperchalk:studio-character-loaded',()=>{
 // Persistent choice between models is never a destructive edit mode.
 ed.setTool('pan');root.dataset.motionExtra='false';
 extended.setAttribute('aria-expanded','false');
 extended.textContent='更多动态参数';
 setMode('motion',false);
 requestAnimationFrame(syncSelection);
});
window.addEventListener('paperchalk:studio-tool-changed',()=>{
 root.dataset.canvasTool=ed.S.tool;
 // Painting must expose the correct contextual controls, never unlock meshes.
 if(['brush','eraser','fill','restore','picker','rect','lasso'].includes(ed.S.tool)){
  setMode('paint',false);
 }
});
const outside=e=>{
 if(more.open&&!more.contains(e.target))more.open=false;
 const sub=$('workspace-quick-more');
 if(sub?.open&&!sub.contains(e.target))sub.open=false;
 const m=$('workspace-mobile-more');
 if(m?.open&&!m.contains(e.target))m.open=false;
};
document.addEventListener('pointerdown',outside,{passive:true});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){
  if(more.open)more.open=false;
  if($('workspace-quick-more')?.open)$('workspace-quick-more').open=false;
  if($('workspace-mobile-more')?.open)$('workspace-mobile-more').open=false;
  if(recovery&&!recovery.hidden){
   recovery.hidden=true;
   $('btnRecovery')?.setAttribute('aria-expanded','false');
  }
 }
});
requestAnimationFrame(()=>{
 syncSelection();
 const css=document.createElement('link');
 css.rel='stylesheet';css.href='./workspace-v3.css?v=focused-studio-20261105-v2';
 css.dataset.workspaceStyle='v3';
 document.head.append(css); // later than runtime's other injected styles
});
})();