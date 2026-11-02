/* Paperchalk L2D neck/collar preparation.
 * Only installs the exact original PSD neck and jacket-collar crop
 * for protagonist/front. Does NOT erase or repaint a single source pixel.
 * One reusable tool in the existing all-character studio, not another site.
 */
(()=>{
'use strict';
const ed=window.characterEditor;
if(!ed)return;
const NAME_NECK='PSD · 原版脖子（锁定）';
const NAME_COLLAR='PSD · 外套衣领（可擦除）';
const $=id=>document.getElementById(id);
let assetsPromise=null,busy=false,prepared=false;
function sources(){
 if(!assetsPromise)assetsPromise=fetch('../assets/characters/protagonist-psd-neck-collar.json',
   {cache:'force-cache'}).then(async r=>{
     if(!r.ok)throw Error('原始脖子/衣领素材没有部署：HTTP '+r.status);
     return r.json();
   }).catch(e=>{assetsPromise=null;throw e});
 return assetsPromise;
}
function decode(url){
 return new Promise((resolve,reject)=>{
  const im=new Image();
  im.onload=()=>resolve(im);im.onerror=()=>reject(Error('原始 PSD 图层解码失败'));im.src=url;
 });
}
function status(message){
 const out=$('studio-status');if(out)out.textContent=message;
}
function showButton(){
 const button=$('studio-neck-focus');
 if(!button)return;
 button.hidden=!(window.PaperchalkStudio?.current==='protagonist' &&
  window.PaperchalkStudio?.editSide==='front' &&
  window.PaperchalkStudio?.isV4);
}
function selectCollar(){
 const S=ed.S,collar=S.layers.front.find(p=>p.name===NAME_COLLAR);
 if(!collar)return false;
 S.side='front';
 S.sel=S.layers.front.indexOf(collar);
 S.only=false;S.selection=null;
 const solo=$('solo');if(solo)solo.checked=false;
 $('frontTab')?.classList.add('active');
 $('backTab')?.classList.remove('active');
 if($('size')){$('size').value='9';$('sizeText').textContent='9 px';S.brush=9;}
 ed.setTool('eraser');ed.renderList();
 // Original PSD source origin 496,160 and 474,190; center at exposed collar.
 ed.focus(520,213,Math.min(3.2,Math.max(2.2,window.innerWidth/160)));
 ed.render();
 return true;
}
async function prepare(){
 if(busy)return;
 const studio=window.PaperchalkStudio;
 if(!studio||studio.current!=='protagonist'||studio.editSide!=='front'||!studio.isV4){
  showButton();return;
 }
 busy=true;
 try{
  const assets=await sources();
  if(studio.current!=='protagonist'||studio.editSide!=='front')return;
  const arr=ed.S.layers.front;
  let neck=arr.find(p=>p.name===NAME_NECK);
  let collar=arr.find(p=>p.name===NAME_COLLAR);
  let created=false;
  if(!neck){
   const p=assets.front.neck,im=await decode(p.image);
   neck=ed.layer(NAME_NECK,im,p.x,p.y,true);
   arr.push(neck);created=true;
  }
  if(!collar){
   const p=assets.front.collar,im=await decode(p.image);
   collar=ed.layer(NAME_COLLAR,im,p.x,p.y,false);
   arr.push(collar);created=true;
  }
  // Enforce immutable original neck; collar stays editable, preserving
  // the exact user's already-erased pixels on subsequent loads.
  neck.locked=true;neck.visible=true;
  collar.locked=false;
  const ni=arr.indexOf(neck),ci=arr.indexOf(collar);
  if(ni>ci){arr.splice(ni,1);arr.splice(arr.indexOf(collar),0,neck);}
  prepared=true;
  showButton();selectCollar();
  if(created){
   // Keep the prepared editable PSD stack locally, but do NOT alter what
   // the game renders until the user explicitly saves their collar edits.
   await ed.save();
  }
  status('✓ 原始 PSD 脖子已锁定（496,160），外套衣领已选中（474,190）；橡皮擦 9px。现在可以直接擦领口，脖子不会受损。');
 }catch(e){
  console.error('[PSD neck/collar]',e);
  status('无法准备原始脖子/衣领：'+e.message);
 }finally{busy=false;}
}
const btn=document.createElement('button');
btn.id='studio-neck-focus';
btn.type='button';
btn.textContent='🎯 领口精修 · 橡皮擦';
btn.title='原版脖子锁定，外套衣领可擦，放大到领口';
btn.hidden=true;
btn.onclick=()=>prepare();
const line=document.querySelector('#studio-v4-wrap .studio-v4-tools .studio-row');
if(line)line.prepend(btn);
window.addEventListener('paperchalk:studio-ready-to-edit',()=>{
 showButton();
 prepare();
});
window.PaperchalkNeckCollar={prepare,selectCollar,get ready(){return prepared},neckLayer:NAME_NECK,collarLayer:NAME_COLLAR};
})();