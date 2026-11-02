/* Easy workflow for the existing all-character editor.
 * Enhancement only: retain the real editor, V4 decoder, source layers and save handlers. */
(()=>{
'use strict';
const ed=window.characterEditor, studio=window.PaperchalkStudio, stageMotion=window.PaperchalkStageMotion;
if(!ed||!studio||!stageMotion)return;
const $=id=>document.getElementById(id);
const el=(tag,attrs={},text='')=>{
 const node=document.createElement(tag);
 for(const [k,v] of Object.entries(attrs))node.setAttribute(k,v);
 if(text)node.textContent=text;
 return node;
};
const saved=(()=>{try{return localStorage.getItem('paperchalk-editor-ui')==='expert'}catch(_){return false}})();
let expert=saved,dirty=false;
const topActions=document.querySelector('header .actions');
const modeButton=el('button',{id:'easy-mode-switch',type:'button','aria-pressed':String(expert)});
topActions?.prepend(modeButton);
const quickImport=el('button',{id:'easy-import',type:'button',title:'导入真正的 PSD 或原位分层 ZIP'},'＋ 导入分层');
topActions?.prepend(quickImport);
quickImport.onclick=()=>$('studio-parts-import')?.click();

// The catalog and face selector remain the first thing users see.
// Keep the original import handlers and input IDs untouched inside an optional section.
const library=$('studio-library');
const second=library?.querySelectorAll('.studio-row')[1];
if(second){
 const details=el('details',{id:'easy-imports',class:'easy-disclosure'});
 details.append(el('summary',{},'导入人物 / V4 动画 / 原始分层'));
 const row=el('div',{class:'studio-row'});
 for(const id of ['studio-import','studio-v4zip','studio-parts-import']){
  const input=$(id);if(input?.closest('label'))row.append(input.closest('label'));
 }
 details.append(row);
 second.before(details);
}
// Make destructive layer actions deliberate, not part of the primary editing path.
const layerList=$('layers');
const layerSection=layerList?.closest('section');
if(layerSection){
 const guide=el('p',{id:'easy-layer-guide'},'① 点选部件  →  ② 画笔/橡皮擦修改  →  ③ 保存到游戏');
 layerSection.querySelector('h3')?.after(guide);
 const advanced=el('details',{id:'easy-layer-more',class:'easy-disclosure'});
 advanced.append(el('summary',{},'图层高级操作（复制 / 排序 / 删除）'));
 const row=el('div',{class:'easy-layer-actions'});
 for(const id of ['dup','del','up','down','rename']){
  if($(id))row.append($(id));
 }
 advanced.append(row);
 layerList.parentElement.append(advanced);
}
// Advanced viewing/export tools keep their original behavior and IDs.
const right=document.querySelector('aside.right');
if(right){
 for(const section of [...right.querySelectorAll(':scope > section')]){
  const heading=section.querySelector(':scope > h3')?.textContent||'其他工具';
  if(!/查看与对齐|图层操作与导出/.test(heading))continue;
  const details=el('details',{class:'easy-disclosure easy-right-more'});
  details.append(el('summary',{},heading==='查看与对齐'?'查看 / 缩放 / 网格':'导出 / 清空 / 恢复'));
  for(const node of [...section.children])if(node.tagName!=='H3'&&node.id!=='status')details.append(node);
  const status=section.querySelector('#status');
  section.replaceChildren(details);
  if(status)section.append(status);
 }
}
const quick=el('div',{id:'easy-quickbar',role:'toolbar','aria-label':'画布快捷操作'});
const toolButtons=[
 ['brush','✎ 画笔'],['eraser','◯ 擦除'],['restore','✚ 补画'],['pan','✥ 平移']
];
for(const [tool,label] of toolButtons){
 const b=el('button',{type:'button','data-easy-tool':tool,title:label},label);
 b.onclick=()=>{
  ed.setTool(tool);
  const part=ed.S.layers[ed.S.side]?.[ed.S.sel];
  if(part?.sourcePart&&stageMotion.state.enabled)editPart().catch(console.error);
  sync();
 };
 quick.append(b);
}
const fitButton=el('button',{id:'easy-fit',type:'button',title:'让整个人物完全显示'},'全身');
fitButton.onclick=()=>$('fit')?.click();
quick.append(fitButton);
const faceButton=el('button',{id:'easy-face',type:'button',title:'放大脸部区域'},'面部');
faceButton.onclick=()=>$('face')?.click();
quick.append(faceButton);
const undoQuick=el('button',{id:'easy-undo',type:'button',title:'撤销上一步（Ctrl+Z）'},'↶ 撤销');
undoQuick.onclick=()=>$('btnUndo')?.click();
quick.append(undoQuick);
const redoQuick=el('button',{id:'easy-redo',type:'button',title:'重做上一步（Ctrl+Y）'},'↷ 重做');
redoQuick.onclick=()=>$('btnRedo')?.click();
quick.append(redoQuick);
const edit=el('button',{id:'easy-edit',type:'button',title:'停止动画并精修选中部件'},'编辑部件');
quick.append(edit);
const animate=el('button',{id:'easy-animate',type:'button',title:'退出精修，查看角色在游戏里的动画'},'▶ 看动画');
quick.append(animate);
$('stage')?.append(quick);
const selectedBox=el('div',{id:'easy-selection','aria-live':'polite'});
layerSection?.querySelector('#easy-layer-guide')?.after(selectedBox);
const saveNote=el('span',{id:'easy-save-note',role:'status'},'保存在当前浏览器；不会自动提交 GitHub');
topActions?.append(saveNote);
const bSave=$('btnSave');
if(bSave){bSave.textContent='✓ 保存到本机游戏';bSave.title='保存角色改动，当前浏览器的游戏 DEV 立即可用；并非提交 GitHub';}
if($('btnExport'))$('btnExport').textContent='↓ 备份 ZIP';
if($('studio-back'))$('studio-back').textContent='↩ 返回游戏';
function sourcePart(){
 return ed.S.layers[ed.S.side]?.[ed.S.sel]||null;
}
async function editPart(){
 const p=sourcePart();
 if(!p){selectedBox.textContent='先在左侧选择一个部件';return;}
 if(p.locked){
  selectedBox.textContent='此层已锁定，请先点击该层右边的锁图标解锁';
  return;
 }
 const id=ed.S.sel,side=ed.S.side;
 // Enter the real source-pixel editor. Never generate fake replacement parts.
 if(p.sourcePart&&studio.useV4?.())$('studio-v4-mode')?.click();
 if(ed.S.side===side&&ed.S.layers[side][id]===p){
  ed.S.sel=id;ed.renderList();
 }
 await stageMotion.setPreview(false);
 ed.render();sync();
}
async function animatePart(){
 if(studio.isV4&&!studio.hasNativePSD?.()&&!studio.useV4?.()){
  const toggle=$('studio-v4-mode');
  if(toggle&&!toggle.disabled)toggle.click();
 }
 await stageMotion.setPreview(true);
 await stageMotion.setPlaying(true);
 ed.render();sync();
}
edit.onclick=()=>editPart().catch(e=>{selectedBox.textContent='无法编辑：'+e.message});
animate.onclick=()=>animatePart().catch(e=>{selectedBox.textContent='无法预览：'+e.message});
function sync(){
 const p=sourcePart(),isSource=!!p?.sourcePart;
 selectedBox.textContent=!p?'尚未选择图层':p.locked
  ?'🔒 '+p.name+' · 已锁定，点右侧锁图标才能编辑'
  :p.name+(isSource?' · 原始部件，可直接精修':' · 可编辑图层');
 edit.disabled=!p||p.locked;
 edit.textContent=stageMotion.state.enabled?'✎ 编辑此部件':'✎ 正在精修';
 animate.classList.toggle('active',stageMotion.state.enabled&&stageMotion.state.playing);
 edit.classList.toggle('active',!stageMotion.state.enabled);
 for(const b of quick.querySelectorAll('[data-easy-tool]'))
  b.classList.toggle('active',b.dataset.easyTool===ed.S.tool);
}
function applyMode(){
 document.body.classList.toggle('easy-mode',!expert);
 document.body.classList.toggle('expert-mode',expert);
 modeButton.textContent=expert?'简洁模式':'高级模式';
 modeButton.setAttribute('aria-pressed',String(expert));
 for(const d of document.querySelectorAll('.easy-disclosure'))d.open=expert;
 try{localStorage.setItem('paperchalk-editor-ui',expert?'expert':'easy')}catch(_){}
 requestAnimationFrame(()=>requestAnimationFrame(()=>{$('fit')?.click();sync();}));
}
modeButton.onclick=()=>{expert=!expert;applyMode()};
window.addEventListener('keydown',e=>{
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){
  e.preventDefault();
  if(!bSave?.disabled)bSave?.click();
 }
});
layerList?.addEventListener('click',e=>{
 // Selecting a genuine component should enter pixel-accurate editing
 // automatically. Visibility and lock buttons keep their original actions.
 if(e.target.closest('button')||!e.target.closest('.layer'))return;
 requestAnimationFrame(()=>{
  const p=sourcePart();
  if(p?.sourcePart&&!p.locked)editPart().catch(console.error);
  else sync();
 });
});
new MutationObserver(sync).observe(layerList,{childList:true});
window.addEventListener('paperchalk:studio-ready-to-edit',()=>{dirty=false;saveNote.textContent='当前浏览器自动保存；跨设备请导出 ZIP';sync()});
window.addEventListener('paperchalk:studio-character-loaded',()=>{dirty=false;sync()});
window.addEventListener('paperchalk:art-dirty',()=>{
 dirty=true;saveNote.textContent='● 有修改 · 点击保存到本机游戏';
 sync();
});
bSave?.addEventListener('click',()=>{
 // Wait for the original async save handler; don't claim cloud sync.
 const observer=new MutationObserver(()=>{
  if(!bSave.textContent.includes('已保存'))return;
  dirty=false;
  saveNote.textContent='✓ 本机游戏已更新 · 未上传 GitHub';
  observer.disconnect();
 });
 observer.observe(bSave,{childList:true,characterData:true,subtree:true});
 setTimeout(()=>observer.disconnect(),14000);
});
$('main-preview')?.addEventListener('click',()=>requestAnimationFrame(sync));
$('main-play')?.addEventListener('click',()=>requestAnimationFrame(sync));
window.addEventListener('paperchalk:studio-play-changed',sync);
window.addEventListener('paperchalk:rig-play-changed',sync);
window.PaperchalkEasyEditor={get expert(){return expert},setExpert(value){expert=!!value;applyMode()},editPart,animatePart,sync};
applyMode();sync();
})();
