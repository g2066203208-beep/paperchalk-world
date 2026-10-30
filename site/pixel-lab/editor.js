import {
 INKS,createProject,validateProject,cel,putPixel,line,rect,ellipse,floodFill,
 sample,composite,addLayer,deleteLayer,addFrame,deleteFrame,
 selectionCopy,selectionErase,selectionPaste,resizeProject,quantizeRGBA
} from './editor-core.js';

const $=id=>document.getElementById(id);
const dom={canvas:$('paint-canvas'),view:$('canvas-viewport'),swatches:$('swatches'),layers:$('layers'),frames:$('frames')};
const ctx=dom.canvas.getContext('2d',{alpha:false});
const inkNames=['透明','深紫','樱粉','雾蓝','奶油白'];
const help={
 pencil:'铅笔 · B · 精确整数像素绘制',eraser:'橡皮 · E · 透明像素',
 fill:'填充 · F · 仅改变连通同色像素',line:'直线 · L · 拖动定两端',
 rect:'矩形 · R · 可选实心',ellipse:'椭圆 · O · 可选实心',
 picker:'取色 · I · 读取可见像素',select:'矩形选区 · M · 拖动选取；再拖动选区内部移动',
 pan:'画布平移 · H · 拖动；双指缩放'
};
let project=createProject(),tool='pencil',color=1,brush=1,selection=null,clipboard=null;
let undoStack=[],redoStack=[],view={zoom:8,x:0,y:0},drag=null;
let pointers=new Map(),pinch=null,playing=null,dirty=false,saveTimer=null,toastTimer=null;
const MAX_HISTORY=32,DB_NAME='paperworld-pixel-atelier',DB_STORE='projects';
const buffer=document.createElement('canvas');
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const snapshot=()=>JSON.stringify(project);
const warn=e=>{console.error(e);status(e?.message||String(e),true)};
function status(msg,error=false){
 const el=$('save-status');el.textContent=msg;el.style.color=error?'#F2A5C2':'#A9BAE9';
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.textContent='本机自动保存';el.style.color=''},3200);
}
function saveDB(value){
 return new Promise((resolve,reject)=>{
  if(!('indexedDB'in window)){reject(Error('浏览器不支持 IndexedDB'));return}
  const open=indexedDB.open(DB_NAME,1);
  open.onupgradeneeded=()=>{if(!open.result.objectStoreNames.contains(DB_STORE))open.result.createObjectStore(DB_STORE)};
  open.onerror=()=>reject(open.error);
  open.onsuccess=()=>{
   const db=open.result,tx=db.transaction(DB_STORE,'readwrite');
   tx.objectStore(DB_STORE).put(value,'autosave');
   tx.oncomplete=()=>{db.close();resolve()};
   tx.onerror=()=>{db.close();reject(tx.error)};
  };
 });
}
function loadDB(){
 return new Promise(resolve=>{
  if(!('indexedDB'in window)){resolve(null);return}
  const open=indexedDB.open(DB_NAME,1);
  open.onupgradeneeded=()=>{if(!open.result.objectStoreNames.contains(DB_STORE))open.result.createObjectStore(DB_STORE)};
  open.onerror=()=>resolve(null);
  open.onsuccess=()=>{
   const db=open.result,tx=db.transaction(DB_STORE,'readonly'),req=tx.objectStore(DB_STORE).get('autosave');
   req.onsuccess=()=>resolve(req.result||null);
   req.onerror=()=>resolve(null);
   tx.oncomplete=()=>db.close();
  };
 });
}
function queueSave(){
 dirty=true;clearTimeout(saveTimer);$('save-status').textContent='正在保存…';
 saveTimer=setTimeout(async()=>{
  try{await saveDB(snapshot());dirty=false;status('工程已保存到本机')}catch(e){
   try{localStorage.setItem('pw-pixel-autosave',snapshot());dirty=false;status('已保存到浏览器缓存')}
   catch{status('自动保存失败：请导出 JSON 工程',true)}
  }
 },350);
}
function pushHistory(before){
 const after=snapshot();if(after===before)return false;
 undoStack.push(before);if(undoStack.length>MAX_HISTORY)undoStack.shift();
 redoStack=[];queueSave();refreshUI();return true;
}
function update(){
 const info=$('doc-info');info.textContent=project.width+' × '+project.height+' · 4 INKS';
 $('frame-counter').textContent=String(project.activeFrame+1).padStart(2,'0')+' / '+String(project.frames.length).padStart(2,'0');
 $('layer-count').textContent=project.layers.length+' / 16';
 $('undo').disabled=!undoStack.length;$('redo').disabled=!redoStack.length;
 $('delete-layer').disabled=project.layers.length<=1;$('delete-frame').disabled=project.frames.length<=1;
 $('add-layer').disabled=project.layers.length>=16;$('add-frame').disabled=project.frames.length>=24;
 $('help').textContent=help[tool];
 $('zoom-label').textContent=Math.round(view.zoom*100)+'%';
}
function newBuffer(frame=project.activeFrame){
 const off=document.createElement('canvas');off.width=project.width;off.height=project.height;
 const c=off.getContext('2d'),img=c.createImageData(off.width,off.height),pixels=composite(project,frame);
 const rgb=INKS.map(v=>[parseInt(v.slice(1,3),16),parseInt(v.slice(3,5),16),parseInt(v.slice(5,7),16)]);
 for(let i=0;i<pixels.length;i++){const k=pixels[i],p=i*4;if(k){img.data[p]=rgb[k-1][0];img.data[p+1]=rgb[k-1][1];img.data[p+2]=rgb[k-1][2];img.data[p+3]=255}}
 c.putImageData(img,0,0);return off;
}
function draw(){
 const dpr=Math.min(2,window.devicePixelRatio||1),w=dom.view.clientWidth,h=dom.view.clientHeight;
 if(!w||!h)return;
 const rw=Math.round(w*dpr),rh=Math.round(h*dpr);
 if(dom.canvas.width!==rw||dom.canvas.height!==rh){dom.canvas.width=rw;dom.canvas.height=rh}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;
 ctx.fillStyle='#171725';ctx.fillRect(0,0,w,h);
 const ox=Math.round(view.x),oy=Math.round(view.y),z=view.zoom,aw=project.width*z,ah=project.height*z;
 ctx.save();ctx.beginPath();ctx.rect(ox,oy,aw,ah);ctx.clip();
 ctx.fillStyle='#ece6f0';ctx.fillRect(ox,oy,aw,ah);
 ctx.fillStyle='#c6c3d2';
 // Checker occupies the art only, even when the viewport is much larger.
 const step=8*z;
 for(let row=0;row<Math.ceil(project.height/8);row++)for(let col=0;col<Math.ceil(project.width/8);col++)
  if((row+col)%2===0)ctx.fillRect(ox+col*step,oy+row*step,step,step);
 if($('grid').checked&&z>=7){
  ctx.strokeStyle='rgba(57,54,87,.21)';ctx.lineWidth=1;ctx.beginPath();
  for(let x=0;x<=project.width;x++){const p=Math.round(ox+x*z)+.5;ctx.moveTo(p,oy);ctx.lineTo(p,oy+ah)}
  for(let y=0;y<=project.height;y++){const p=Math.round(oy+y*z)+.5;ctx.moveTo(ox,p);ctx.lineTo(ox+aw,p)}
  ctx.stroke();
 }
 if(buffer.width!==project.width||buffer.height!==project.height){buffer.width=project.width;buffer.height=project.height}
 const bctx=buffer.getContext('2d');bctx.clearRect(0,0,buffer.width,buffer.height);
 bctx.drawImage(newBuffer(),0,0);
 ctx.drawImage(buffer,ox,oy,aw,ah);
 if(selection&&selection.w&&selection.h){
  ctx.lineWidth=1;ctx.setLineDash([5,4]);ctx.strokeStyle='#FFF5E6';
  ctx.strokeRect(ox+selection.x*z+.5,oy+selection.y*z+.5,selection.w*z,selection.h*z);
  ctx.lineDashOffset=5;ctx.strokeStyle='#393657';ctx.strokeRect(ox+selection.x*z+.5,oy+selection.y*z+.5,selection.w*z,selection.h*z);ctx.setLineDash([]);ctx.lineDashOffset=0;
 }
 ctx.restore();
 ctx.strokeStyle='#a9bae9';ctx.lineWidth=1;ctx.strokeRect(ox-.5,oy-.5,aw+1,ah+1);
 update();
}
function thumbnails(){
 dom.layers.replaceChildren();
 // Topmost visual layer is shown first.
 for(let i=project.layers.length-1;i>=0;i--){
  const layer=project.layers[i],row=document.createElement('div');row.className='layer'+(i===project.activeLayer?' active':'');row.setAttribute('role','listitem');
  const toggle=document.createElement('button');toggle.textContent=layer.visible?'◉':'○';toggle.title=layer.visible?'隐藏图层':'显示图层';toggle.setAttribute('aria-label',toggle.title);
  toggle.addEventListener('click',e=>{e.stopPropagation();const before=snapshot();layer.visible=!layer.visible;pushHistory(before);draw()});
  const number=document.createElement('span');number.className='layer-index';number.textContent=String(i+1).padStart(2,'0');
  const input=document.createElement('input');input.value=layer.name;input.setAttribute('aria-label','图层名称');
  input.addEventListener('click',e=>e.stopPropagation());input.addEventListener('change',()=>{
   const before=snapshot();layer.name=(input.value.trim().slice(0,60)||'未命名图层');pushHistory(before)
  });
  row.append(toggle,number,input);
  row.addEventListener('click',()=>{project.activeLayer=i;refreshUI()});
  dom.layers.append(row);
 }
 dom.frames.replaceChildren();
 for(let f=0;f<project.frames.length;f++){
  const item=document.createElement('button');item.className='frame'+(f===project.activeFrame?' current':'');item.setAttribute('role','listitem');
  const mini=document.createElement('canvas');mini.width=48;mini.height=48;
  const c=mini.getContext('2d');c.imageSmoothingEnabled=false;const im=newBuffer(f);const ratio=Math.min(48/project.width,48/project.height);
  c.drawImage(im,(48-project.width*ratio)/2,(48-project.height*ratio)/2,project.width*ratio,project.height*ratio);
  const label=document.createElement('span');const strong=document.createElement('strong');strong.textContent=String(f+1).padStart(2,'0');
  const small=document.createElement('small');small.textContent=f===project.activeFrame?'当前帧':'帧';label.append(strong,small);
  item.append(mini,label);item.addEventListener('click',()=>{stopPlay();project.activeFrame=f;refreshUI()});
  dom.frames.append(item);
 }
}
function refreshUI(){thumbnails();draw()}
function setTool(t){if(!help[t])return;tool=t;
 document.querySelectorAll('[data-tool]').forEach(b=>{const active=b.dataset.tool===t;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});update();
}
function setColor(n){color=n;dom.swatches.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',Number(b.dataset.color)===n));
 $('selected-chip').style.background=n?INKS[n-1]:'repeating-conic-gradient(#c6c3d2 0 25%,#ece6f0 0 50%) 0/10px 10px';
 $('selected-name').textContent=inkNames[n];$('selected-hex').textContent=n?INKS[n-1]:'ALPHA 0';}
for(let i=0;i<5;i++){
 const button=document.createElement('button');button.dataset.color=i;button.className='swatch'+(i===0?' checker':'');
 button.title=inkNames[i]+(i?' · '+INKS[i-1]:'');button.setAttribute('aria-label',button.title);
 button.style.background=i?INKS[i-1]:'';button.textContent='';
 const label=document.createElement('span');label.textContent=i===0?'T':i;button.append(label);
 button.addEventListener('click',()=>setColor(i));dom.swatches.append(button);
}
setColor(1);
function fit(){
 const w=dom.view.clientWidth,h=dom.view.clientHeight;
 view.zoom=clamp(Math.floor(Math.min((w-35)/project.width,(h-35)/project.height)),1,32);
 view.x=Math.round((w-project.width*view.zoom)/2);view.y=Math.round((h-project.height*view.zoom)/2);draw();
}
function zoomAt(newZoom,cx=dom.view.clientWidth/2,cy=dom.view.clientHeight/2){
 const z=clamp(Math.round(newZoom),1,32),factor=z/view.zoom;
 view.x=cx-(cx-view.x)*factor;view.y=cy-(cy-view.y)*factor;view.zoom=z;draw();
}
const canvasPos=e=>{const r=dom.canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}};
const artPos=pos=>({x:Math.floor((pos.x-view.x)/view.zoom),y:Math.floor((pos.y-view.y)/view.zoom)});
const within=p=>p.x>=0&&p.y>=0&&p.x<project.width&&p.y<project.height;
const normalized=(a,b)=>({x:Math.max(0,Math.min(a.x,b.x)),y:Math.max(0,Math.min(a.y,b.y)),
 w:Math.abs(b.x-a.x)+1,h:Math.abs(b.y-a.y)+1});
function paintSegment(from,to){const paint=tool==='eraser'?0:color;return line(project,from.x,from.y,to.x,to.y,paint,brush,$('mirror').checked)}
function drawShape(from,to){const filled=$('filled').checked;
 if(tool==='line')line(project,from.x,from.y,to.x,to.y,color,brush,$('mirror').checked);
 if(tool==='rect')rect(project,from.x,from.y,to.x,to.y,color,filled);
 if(tool==='ellipse')ellipse(project,from.x,from.y,to.x,to.y,color,filled);
}
function performFill(pt){if(within(pt))floodFill(project,pt.x,pt.y,color)}
function selectInside(pt){return selection&&pt.x>=selection.x&&pt.y>=selection.y&&pt.x<selection.x+selection.w&&pt.y<selection.y+selection.h}
function moveSelection(dx,dy){
 if(!selection||(!dx&&!dy))return;
 const before=snapshot(),clip=selectionCopy(project,selection);selectionErase(project,selection);
 const x=clamp(selection.x+dx,0,project.width-selection.w),y=clamp(selection.y+dy,0,project.height-selection.h);
 selectionPaste(project,clip,x,y);selection={...selection,x,y};pushHistory(before);draw();
}
function pointerDown(e){
 if(e.button!==0&&e.pointerType==='mouse')return;
 dom.canvas.focus();stopPlay();const pos=canvasPos(e),pt=artPos(pos);
 pointers.set(e.pointerId,pos);dom.canvas.setPointerCapture(e.pointerId);
 if(pointers.size===2){
  if(drag&&drag.before&&drag.mode!=='pan'){project=JSON.parse(drag.before);draw()}
  drag=null;const [a,b]=[...pointers.values()];
  const center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  pinch={dist:Math.hypot(a.x-b.x,a.y-b.y),zoom:view.zoom,worldX:(center.x-view.x)/view.zoom,worldY:(center.y-view.y)/view.zoom};
  return;
 }
 if(pointers.size>2)return;
 const pan=tool==='pan'||e.button===1||e.altKey||e.getModifierState?.('Space');
 const mode=pan?'pan':tool==='select'?(selectInside(pt)?'move':'select'):tool;
 drag={mode,start:pt,last:pt,startPos:pos,before:snapshot(),baseSelection:selection?{...selection}:null};
 if(mode==='pencil'||mode==='eraser'){if(within(pt))paintSegment(pt,pt)}
 else if(mode==='fill')performFill(pt);
 else if(mode==='picker'){setColor(sample(project,pt.x,pt.y));drag=null}
 else if(mode==='select'){selection=null}
 if(mode==='fill'){pushHistory(drag.before);drag=null}
 draw();
}
function pointerMove(e){
 const pos=canvasPos(e),pt=artPos(pos);$('pointer-position').textContent='x '+pt.x+' · y '+pt.y;
 if(!pointers.has(e.pointerId))return;
 pointers.set(e.pointerId,pos);
 if(pinch&&pointers.size>=2){
  const [a,b]=[...pointers.values()],center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  view.zoom=clamp(Math.round(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.dist)),1,32);
  view.x=center.x-pinch.worldX*view.zoom;view.y=center.y-pinch.worldY*view.zoom;draw();return;
 }
 if(!drag)return;
 if(drag.mode==='pan'){view.x+=pos.x-drag.startPos.x;view.y+=pos.y-drag.startPos.y;drag.startPos=pos}
 else if(drag.mode==='pencil'||drag.mode==='eraser'){paintSegment(drag.last,pt);drag.last=pt}
 else if(['line','rect','ellipse'].includes(drag.mode)){
  project=JSON.parse(drag.before);drawShape(drag.start,pt)
 }
 else if(drag.mode==='select'){
  const a={x:clamp(drag.start.x,0,project.width-1),y:clamp(drag.start.y,0,project.height-1)};
  const b={x:clamp(pt.x,0,project.width-1),y:clamp(pt.y,0,project.height-1)};selection=normalized(a,b);
 }
 else if(drag.mode==='move'&&drag.baseSelection){
  const sx=clamp(drag.baseSelection.x+pt.x-drag.start.x,0,project.width-drag.baseSelection.w),sy=clamp(drag.baseSelection.y+pt.y-drag.start.y,0,project.height-drag.baseSelection.h);
  selection={...drag.baseSelection,x:sx,y:sy};
 }
 draw();
}
function pointerUp(e){
 pointers.delete(e.pointerId);
 if(pinch){if(pointers.size<2)pinch=null;return}
 if(!drag)return;
 if(drag.mode==='move'&&drag.baseSelection){
  const base=drag.baseSelection,next=selection;
  const clip=selectionCopy(project,base);selectionErase(project,base);selectionPaste(project,clip,next.x,next.y);
 }
 if(drag.mode==='pencil'||drag.mode==='eraser'||drag.mode==='line'||drag.mode==='rect'||drag.mode==='ellipse'||drag.mode==='move')pushHistory(drag.before);
 drag=null;draw();
}
dom.canvas.addEventListener('pointerdown',pointerDown);
dom.canvas.addEventListener('pointermove',pointerMove);
dom.canvas.addEventListener('pointerup',pointerUp);
dom.canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);if(drag?.before){project=JSON.parse(drag.before);drag=null;draw()}pinch=null});
dom.canvas.addEventListener('wheel',e=>{e.preventDefault();const pos=canvasPos(e);zoomAt(view.zoom+(e.deltaY<0?1:-1),pos.x,pos.y)},{passive:false});
dom.canvas.addEventListener('contextmenu',e=>e.preventDefault());
dom.view.addEventListener('dragover',e=>e.preventDefault());
dom.view.addEventListener('drop',e=>{e.preventDefault();if(e.dataTransfer.files[0])openFile(e.dataTransfer.files[0])});
document.querySelectorAll('.tool').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
$('grid').addEventListener('change',draw);$('brush').addEventListener('input',e=>{brush=Number(e.target.value);$('brush-label').textContent=brush+'px'});
$('zoom-in').addEventListener('click',()=>zoomAt(view.zoom+1));$('zoom-out').addEventListener('click',()=>zoomAt(view.zoom-1));$('zoom-label').addEventListener('click',fit);$('fit').addEventListener('click',fit);
function history(direction){
 const src=direction==='undo'?undoStack:redoStack,dst=direction==='undo'?redoStack:undoStack;
 if(!src.length)return;dst.push(snapshot());project=validateProject(JSON.parse(src.pop()));selection=null;refreshUI();queueSave();
}
$('undo').addEventListener('click',()=>history('undo'));$('redo').addEventListener('click',()=>history('redo'));
function mutate(fn){
 const before=snapshot();try{fn();pushHistory(before);refreshUI()}catch(e){warn(e)}
}
$('add-layer').addEventListener('click',()=>mutate(()=>addLayer(project)));
$('delete-layer').addEventListener('click',()=>mutate(()=>deleteLayer(project)));
$('add-frame').addEventListener('click',()=>{stopPlay();mutate(()=>addFrame(project))});
$('delete-frame').addEventListener('click',()=>{stopPlay();mutate(()=>deleteFrame(project))});
$('clear-layer').addEventListener('click',()=>mutate(()=>cel(project).fill(0)));
$('copy').addEventListener('click',()=>{if(!selection)return status('先用选区工具圈出一块区域',true);clipboard=selectionCopy(project,selection);status('选区已复制')});
$('cut').addEventListener('click',()=>{if(!selection)return status('先选择区域',true);clipboard=selectionCopy(project,selection);mutate(()=>selectionErase(project,selection));status('选区已剪切')});
$('paste').addEventListener('click',()=>{if(!clipboard)return status('剪贴板没有像素',true);const x=selection?.x??0,y=selection?.y??0;mutate(()=>selectionPaste(project,clipboard,x,y));selection={x,y,w:Math.min(project.width-x,clipboard.width),h:Math.min(project.height-y,clipboard.height)};draw()});
$('clear-selection').addEventListener('click',()=>{selection=null;draw()});
function requestDimensions(title,w,h){
 const width=Number(prompt(title+' · 宽度 8–512',w));if(!width)return null;
 const height=Number(prompt(title+' · 高度 8–512',h));if(!height)return null;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<8||height<8||width>512||height>512){status('画布尺寸必须为 8–512 的整数',true);return null}
 return {width,height};
}
$('new-project').addEventListener('click',()=>{
 const dimensions=requestDimensions('新建工程',64,64);if(!dimensions)return;
 if(!confirm('创建新画布？现有工程已自动保存，建议先导出 JSON 备份。'))return;
 stopPlay();project=createProject(dimensions.width,dimensions.height);undoStack=[];redoStack=[];selection=null;clipboard=null;fit();refreshUI();queueSave();
});
$('resize-project').addEventListener('click',()=>{
 const dims=requestDimensions('改变画布尺寸（左上角对齐，不插值）',project.width,project.height);if(!dims)return;
 mutate(()=>resizeProject(project,dims.width,dims.height));selection=null;fit();
});
function stopPlay(){if(playing!==null){clearInterval(playing);playing=null;$('play').textContent='▶ 预览';$('play').setAttribute('aria-pressed','false')}}
$('play').addEventListener('click',()=>{
 if(playing!==null)return stopPlay();
 if(project.frames.length<2)return status('至少添加两帧才能预览动画',true);
 const fps=clamp(parseInt($('fps').value)||6,1,24);$('fps').value=fps;
 $('play').textContent='■ 停止';$('play').setAttribute('aria-pressed','true');
 playing=setInterval(()=>{project.activeFrame=(project.activeFrame+1)%project.frames.length;refreshUI()},1000/fps);
});
function downloadData(canvas,fileName,mime='image/png',content=null){
 const dataURL=content?'data:'+mime+';base64,'+btoa(unescape(encodeURIComponent(content))):canvas.toDataURL('image/png');
 // New Android APK provides an actual MediaStore/Downloads bridge for blob/data URLs.
 if(window.PaperworldFiles?.saveBase64){
  try{window.PaperworldFiles.saveBase64(fileName,dataURL,mime);status('已打开 Android 系统保存窗口');return}catch(e){warn(e)}
 }
 const anchor=document.createElement('a');anchor.download=fileName;anchor.href=dataURL;document.body.append(anchor);anchor.click();anchor.remove();
 status('已导出 '+fileName);
}
$('export-png').addEventListener('click',()=>downloadData(newBuffer(),'paperworld-'+project.width+'x'+project.height+'.png'));
$('export-json').addEventListener('click',()=>downloadData(null,'paperworld-project.json','application/json',snapshot()));
$('export-sheet').addEventListener('click',()=>{
 const sheet=document.createElement('canvas');sheet.width=project.width*project.frames.length;sheet.height=project.height;
 const g=sheet.getContext('2d');g.imageSmoothingEnabled=false;for(let i=0;i<project.frames.length;i++)g.drawImage(newBuffer(i),i*project.width,0);
 downloadData(sheet,'paperworld-spritesheet-'+project.frames.length+'f.png');
});
async function openFile(file){
 try{
  stopPlay();
  if(file.size>16*1024*1024)throw Error('文件大于 16 MB');
  if(file.name.toLowerCase().endsWith('.json')||file.type==='application/json'){
   const data=validateProject(JSON.parse(await file.text()));
   project=data;
  }else if(file.type==='image/png'||file.name.toLowerCase().endsWith('.png')){
   const bitmap=await createImageBitmap(file);
   if(bitmap.width>512||bitmap.height>512||bitmap.width<8||bitmap.height<8){bitmap.close();throw Error('PNG 宽高必须在 8–512 像素之间；先在外部缩放为原生像素')}
   const imported=createProject(bitmap.width,bitmap.height),c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;
   const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(bitmap,0,0);bitmap.close();
   const d=g.getImageData(0,0,c.width,c.height).data,arr=cel(imported);
   for(let i=0;i<arr.length;i++)arr[i]=quantizeRGBA(d[i*4],d[i*4+1],d[i*4+2],d[i*4+3]);
   project=imported;status('PNG 已就近映射至正式四色，可逐格修复');
  }else throw Error('仅支持 PNG 和 PAPERWORLD JSON 工程');
  undoStack=[];redoStack=[];selection=null;clipboard=null;fit();refreshUI();queueSave();
 }catch(e){warn(e)}
}
$('import-project').addEventListener('click',()=>{$('file-picker').value='';$('file-picker').click()});
$('file-picker').addEventListener('change',e=>{if(e.target.files[0])openFile(e.target.files[0])});
window.addEventListener('keydown',e=>{
 const tag=document.activeElement?.tagName;
 if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;
 const mod=e.ctrlKey||e.metaKey;
 if(mod){
  const k=e.key.toLowerCase();
  if(['z','y','c','x','v'].includes(k)){e.preventDefault();
   if(k==='z')history(e.shiftKey?'redo':'undo');
   if(k==='y')history('redo');
   if(k==='c')$('copy').click();if(k==='x')$('cut').click();if(k==='v')$('paste').click();
  }
  return;
 }
 const keys={b:'pencil',e:'eraser',f:'fill',l:'line',r:'rect',o:'ellipse',i:'picker',m:'select',h:'pan'};
 if(keys[e.key.toLowerCase()]){setTool(keys[e.key.toLowerCase()]);return}
 if(e.key==='g'){$('grid').checked=!$('grid').checked;draw()}
 if(e.key==='Escape'){selection=null;draw()}
 if(e.key==='+'||e.key==='=')zoomAt(view.zoom+1);
 if(e.key==='-')zoomAt(view.zoom-1);
 if(selection&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
  e.preventDefault();moveSelection(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0,e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0)
 }
});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
new ResizeObserver(()=>draw()).observe(dom.view);
(async()=>{
 const saved=await loadDB();
 try{project=validateProject(JSON.parse(saved||localStorage.getItem('pw-pixel-autosave')||'null'))}catch{project=createProject(64,64)}
 fit();refreshUI();
 window.__PAPERWORLD_PIXEL_EDITOR__={getInfo:()=>({width:project.width,height:project.height,layers:project.layers.length,frames:project.frames.length,tool,color,undo:undoStack.length,redo:redoStack.length,selection,frame:project.activeFrame,layer:project.activeLayer}),exportSnapshot:()=>snapshot()};
})();
