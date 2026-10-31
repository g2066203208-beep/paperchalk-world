import {TILE,PALETTE,MATERIALS,freshPack,validatePack,tryReadPack,writePack,
 paint,stroke,flood,sample,tileRGBA,atlasRGBA,migratePack,ATLAS_COLS,ATLAS_ROWS} from './materials-core.js?v=20261031-world32';
import {createMaterialCube} from '../game/world-material-gl.js?v=20261031-world32';

const $=id=>document.getElementById(id),canvas=$('pixel-canvas');
const ctx=canvas.getContext('2d',{alpha:false});
const repeat=$('repeat-canvas'),repeatCtx=repeat.getContext('2d');
const list=$('material-list'),colors=$('ink-list');
const labels=['深紫 · 01','樱粉 · 02','雾蓝 · 03','奶白 · 04'];
const SAVE_DELAY=180,MAX_UNDOS=40;
let pack=tryReadPack(window.localStorage),active=0,color=1,tool='pencil',brush=1,filter='all';
let undo=[],redo=[],drag=null,pointer=null,saveHandle=0,renderQueued=false;
let cube=null,cubeError=null;
const snapshot=()=>JSON.stringify(pack);
function setStatus(message,error=false){
 const e=$('save-state');e.textContent=message;e.style.color=error?'#F2A5C2':'#A9BAE9';
}
function queueSave(){
 clearTimeout(saveHandle);
 setStatus('● 尚未保存');
 saveHandle=setTimeout(()=>{
  try{writePack(localStorage,pack);setStatus('✓ 已保存到本机')}catch(e){setStatus('保存失败，请导出工程',true);console.error(e)}
 },SAVE_DELAY);
}
function checkpoint(before){
 if(before===snapshot())return false;
 undo.push(before);if(undo.length>MAX_UNDOS)undo.shift();redo=[];
 queueSave();render();return true;
}
function updateUndoButtons(){
 $('undo').disabled=!undo.length;$('redo').disabled=!redo.length;
}
function historyAction(direction){
 if(drag)return;
 const source=direction==='undo'?undo:redo,dest=direction==='undo'?redo:undo;
 if(!source.length)return;
 dest.push(snapshot());pack=validatePack(JSON.parse(source.pop()));queueSave();render();
}
function rawToCanvas(canvas2,texture){
 canvas2.width=texture.width;canvas2.height=texture.height;
 const context=canvas2.getContext('2d');const image=context.createImageData(texture.width,texture.height);
 image.data.set(texture.rgba);context.putImageData(image,0,0);
}
function paintTile(){
 const w=canvas.width/TILE;
 ctx.fillStyle=PALETTE[0];ctx.fillRect(0,0,canvas.width,canvas.height);
 const pixels=pack.materials[active].pixels;
 for(let y=0;y<TILE;y++)for(let x=0;x<TILE;x++){
  ctx.fillStyle=PALETTE[pixels[y*TILE+x]-1];
  ctx.fillRect(x*w,y*w,w,w);
 }
 if($('show-grid').checked){
  ctx.strokeStyle='rgba(57,54,87,.48)';ctx.lineWidth=1;ctx.beginPath();
  for(let i=0;i<=TILE;i++){const at=i*w+.5;ctx.moveTo(at,0);ctx.lineTo(at,canvas.height);ctx.moveTo(0,at);ctx.lineTo(canvas.width,at)}
  ctx.stroke();
  ctx.strokeStyle='#393657';ctx.lineWidth=2;ctx.strokeRect(1,1,canvas.width-2,canvas.height-2);
 }
}
function drawRepeated(){
 const tile=tileRGBA(pack,active,3);rawToCanvas(repeat,tile);
}
let libraryFilter=null;
function refreshLibrary(){
 if(libraryFilter!==filter){
  list.replaceChildren();
  MATERIALS.forEach((meta,i)=>{
   if(filter!=='all'&&meta.group!==filter)return;
   const button=document.createElement('button');button.className='material-item';
   button.dataset.material=meta.id;button.dataset.index=String(i);
   button.setAttribute('role','listitem');
   const thumb=document.createElement('canvas');thumb.width=TILE;thumb.height=TILE;
   rawToCanvas(thumb,tileRGBA(pack,i));
   const names=document.createElement('span'),main=document.createElement('strong'),sub=document.createElement('small');
   main.textContent=meta.name;sub.textContent=meta.en;names.append(main,sub);button.append(thumb,names);
   button.addEventListener('click',()=>{if(drag)return;active=i;render()});
   list.append(button);
  });
  libraryFilter=filter;
 }
 // Do not destroy 32 thumbnails and scroll position on every brush movement.
 for(const button of list.children){
  const index=Number(button.dataset.index);
  button.classList.toggle('active',index===active);
  button.setAttribute('aria-pressed',String(index===active));
  if(index===active)rawToCanvas(button.querySelector('canvas'),tileRGBA(pack,index));
 }
}
for(const b of document.querySelectorAll('[data-filter]'))b.addEventListener('click',()=>{
 filter=b.dataset.filter;
 if(filter!=='all'&&MATERIALS[active].group!==filter)
  active=MATERIALS.findIndex(m=>m.group===filter);
 for(const c of document.querySelectorAll('[data-filter]')){
  c.classList.toggle('active',c.dataset.filter===filter);
  c.setAttribute('aria-pressed',String(c.dataset.filter===filter));
 }
 render();
});
function render(){
 paintTile();drawRepeated();refreshLibrary();
 const m=MATERIALS[active];$('material-title').textContent=pack.materials[active].name;
 $('material-role').textContent=m.role+' · '+m.scale+' m / tile · 循环平铺';
 $('coordinates').textContent=pointer?'X '+String(pointer.x).padStart(2,'0')+' · Y '+String(pointer.y).padStart(2,'0'):'X -- · Y --';
 updateUndoButtons();
 if(!renderQueued){
  renderQueued=true;
  requestAnimationFrame(()=>{renderQueued=false;if(cube)cube.update(pack,active)});
 }
}
for(let i=0;i<PALETTE.length;i++){
 const swatch=document.createElement('button');swatch.className='ink';swatch.dataset.ink=String(i+1);
 swatch.style.background=PALETTE[i];swatch.title=labels[i]+' / '+PALETTE[i];
 const num=document.createElement('span');num.textContent=String(i+1);swatch.append(num);
 swatch.addEventListener('click',()=>setInk(i+1));colors.append(swatch);
}
function setInk(next){color=next;for(const b of colors.children)b.classList.toggle('active',Number(b.dataset.ink)===next)}
function setTool(value){
 tool=value;for(const b of document.querySelectorAll('[data-tool]')){
  b.classList.toggle('active',b.dataset.tool===tool);b.setAttribute('aria-pressed',String(b.dataset.tool===tool));
 }
}
setInk(1);setTool('pencil');
function toPixel(e){
 const r=canvas.getBoundingClientRect();
 return {x:Math.floor((e.clientX-r.left)/r.width*TILE),y:Math.floor((e.clientY-r.top)/r.height*TILE)};
}
const valid=p=>p.x>=0&&p.y>=0&&p.x<TILE&&p.y<TILE;
function applyLine(from,to){return stroke(pack,active,from.x,from.y,to.x,to.y,color,brush)}
function down(e){
 if(e.button!==0&&e.pointerType==='mouse')return;
 if(drag)return;const p=toPixel(e);if(!valid(p))return;
 e.preventDefault();canvas.focus();drag={id:e.pointerId,before:snapshot(),start:p,last:p};
 canvas.setPointerCapture(e.pointerId);pointer=p;
 if(tool==='pencil')paint(pack,active,p.x,p.y,color,true,brush);
 else if(tool==='fill')flood(pack,active,p.x,p.y,color);
 else if(tool==='picker'){setInk(sample(pack,active,p.x,p.y));drag=null}
 render();
}
function move(e){
 const p=toPixel(e);pointer=p; $('coordinates').textContent='X '+String(p.x).padStart(2,'0')+' · Y '+String(p.y).padStart(2,'0');
 if(!drag||drag.id!==e.pointerId)return;
 e.preventDefault();
 if(tool==='pencil'){applyLine(drag.last,p);drag.last=p}
 if(tool==='line'){pack=validatePack(JSON.parse(drag.before));applyLine(drag.start,p)}
 render();
}
function up(e){
 if(!drag||drag.id!==e.pointerId)return;
 if(tool==='line'){pack=validatePack(JSON.parse(drag.before));applyLine(drag.start,toPixel(e))}
 const before=drag.before;drag=null;checkpoint(before);render();
}
function cancel(e){if(drag?.id!==e.pointerId)return;pack=JSON.parse(drag.before);drag=null;render()}
canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);
canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);
canvas.addEventListener('contextmenu',e=>e.preventDefault());
for(const button of document.querySelectorAll('[data-tool]'))button.addEventListener('click',()=>setTool(button.dataset.tool));
$('show-grid').addEventListener('change',paintTile);
$('brush').addEventListener('input',e=>{brush=Number(e.target.value);$('brush-value').textContent=brush+' px'});
$('undo').addEventListener('click',()=>historyAction('undo'));$('redo').addEventListener('click',()=>historyAction('redo'));
function savePNG(canvasSource,fileName){
 saveData(canvasSource.toDataURL('image/png'),fileName,'image/png');
}
function saveData(dataURL,name,mime){
 if(window.PaperworldFiles?.saveBase64){
  window.PaperworldFiles.saveBase64(name,dataURL,mime);
  setStatus('Android 系统保存窗口已打开');return;
 }
 const a=document.createElement('a');a.href=dataURL;a.download=name;document.body.append(a);a.click();a.remove();
 setStatus('文件已导出：'+name);
}
$('export-tile').addEventListener('click',()=>{
 const tile=document.createElement('canvas');rawToCanvas(tile,tileRGBA(pack,active));
 savePNG(tile,'paperworld-'+MATERIALS[active].id+'-16px.png');
});
$('export-atlas').addEventListener('click',()=>{
 const atlas=document.createElement('canvas');rawToCanvas(atlas,atlasRGBA(pack));
 savePNG(atlas,'paperworld-material-atlas-'+atlas.width+'x'+atlas.height+'.png');
});
$('export-pack').addEventListener('click',()=>{
 const encoded=btoa(unescape(encodeURIComponent(snapshot())));
 saveData('data:application/json;base64,'+encoded,'paperworld-material-pack.json','application/json');
});
$('import-pack').addEventListener('click',()=>{$('file-picker').value='';$('file-picker').click()});
$('file-picker').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
  if(file.size>100000)throw Error('材质工程 JSON 不能超过 100KB');
  const imported=validatePack(migratePack(JSON.parse(await file.text())));
  const old=snapshot();pack=imported;active=0;checkpoint(old);render();setStatus('成功导入官方四色材质工程');
 }catch(error){setStatus(error.message,true)}
});
$('restore-one').addEventListener('click',()=>{
 if(!confirm('只重置「'+MATERIALS[active].name+'」？其他七种材质不变。'))return;
 const before=snapshot();pack.materials[active].pixels=freshPack().materials[active].pixels;
 checkpoint(before);render();
});
$('apply-world').addEventListener('click',()=>{
 try{clearTimeout(saveHandle);writePack(localStorage,pack);location.assign('../index.html?world3d=1&materials=1')}
 catch(e){setStatus('应用失败：'+e.message,true)}
});
window.addEventListener('keydown',e=>{
 if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
 const k=e.key.toLowerCase();
 if((e.ctrlKey||e.metaKey)&&(k==='z'||k==='y')){
  e.preventDefault();historyAction(k==='y'||e.shiftKey?'redo':'undo');return;
 }
 const shortcut={b:'pencil',l:'line',f:'fill',i:'picker'};if(shortcut[k])setTool(shortcut[k]);
 if(k==='1'||k==='2'||k==='3'||k==='4')setInk(Number(k));
});
try{cube=createMaterialCube($('cube-canvas'),pack,active)}
catch(e){cubeError=e;$('cube-canvas').replaceWith(Object.assign(document.createElement('p'),{textContent:'WebGL不可用；仍可制作和导出完整原生像素材质。'}));setStatus('3D预览不可用',true)}
const resize=new ResizeObserver(()=>cube?.draw());if(cube)resize.observe($('cube-canvas'));
render();
// Read-only diagnostics used by real Chromium and Android WebView QA.
window.__PAPERWORLD_MATERIAL_STUDIO__={
 snapshot:()=>snapshot(),
 state:()=>({active: MATERIALS[active].id,tool,color,brush,undo:undo.length,redo:redo.length,
  atlasSize:[TILE*ATLAS_COLS,TILE*ATLAS_ROWS],tileSize:TILE,webgl:!!cube,materialCount:MATERIALS.length,filter})
};
