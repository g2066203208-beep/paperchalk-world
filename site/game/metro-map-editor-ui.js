/* Live interactive authoring surface inside Kirihama's normal dot subway.
 * A blueprint editor, not a screenshot or a replacement for the travel menu.
 * The operating graph remains intact until the exported layout is approved.
 */
(function(global){
'use strict';
const NS='http://www.w3.org/2000/svg';
const el=(tag,cls,label)=>{
 const a=document.createElement(tag);
 if(cls)a.className=cls;
 if(label!==undefined)a.textContent=label;
 return a;
};
const v=(tag,attrs={},cls)=>{
 const a=document.createElementNS(NS,tag);
 if(cls)a.setAttribute('class',cls);
 for(const [k,val] of Object.entries(attrs))a.setAttribute(k,String(val));
 return a;
};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function create(options){
 const {map,svg,urban,stops,metroLayer,tools,metro,geometry,
  localPoint,rounded,camera,onFeedback,getCity,onRefresh}=options;
 if(!global.PaperWorldMetroMapEditor)throw Error('Metro blueprint editor must load first');
 const model=global.PaperWorldMetroMapEditor.create(metro,geometry);
 const layer=v('g',{'data-role':'metro-blueprint'},'pw-metro-edit-layer');
 svg.append(layer);
 const toggleButton=el('button','pw-dot-tool pw-metro-edit-toggle','编排');
 toggleButton.type='button';toggleButton.title='点阵地铁 · 拖动站点与线路圆角';
 toggleButton.setAttribute('aria-label','进入可编辑地铁线网编排');
 tools.append(toggleButton);
 const bar=el('div','pw-metro-edit-toolbar');
 bar.hidden=true;bar.setAttribute('aria-label','点阵地铁可视化编排工具');
 const headline=el('div','pw-metro-edit-head');
 const title=el('strong','', '霧浜地铁 · 点阵编排');
 const info=el('small','pw-metro-edit-info','选择任意真实轨道或车站');
 headline.append(title,info);bar.append(headline);
 const controls=el('div','pw-metro-edit-controls');
 bar.append(controls);
 const rename=el('div','pw-metro-edit-rename');
 const nameField=el('input');
 nameField.type='text';nameField.maxLength=36;
 nameField.placeholder='选中车站后修改站名';
 nameField.setAttribute('aria-label','所选车站名称');
 rename.append(nameField);
 bar.append(rename);
 map.append(bar);
 const upload=el('input');
 upload.type='file';upload.accept='.json,application/json';
 upload.hidden=true;map.append(upload);
 let active=false,tool='select',selectedEdge=null,focusedLine=null,selectedStation=null,
  selectedBend=-1,drag=null,lastWarning='';
 const message=t=>{
  lastWarning=t;info.textContent=t;
  onFeedback?.(t);
 };
 const currentEdge=()=>selectedEdge?model.edgeFor(selectedEdge):null;
 function snapEvent(event){
  const bounds=map.getBoundingClientRect(),cam=camera();
  const wx=(event.clientX-bounds.left-cam.x)/cam.scale;
  const wy=(event.clientY-bounds.top-cam.y)/cam.scale;
  return {
   gx:clamp(Math.round((wx-280)/40),0,metro.GRID.columns),
   gy:clamp(Math.round((wy-80)/40),0,metro.GRID.rows)
  };
 }
 function button(label,action,titleText){
  const b=el('button','pw-metro-edit-action',label);
  b.type='button';b.title=titleText||label;
  const actions={'选取':'select','折点＋':'bend','站点＋':'station',
   '删除选中':'remove','↶':'undo','↷':'redo','保存':'save',
   '应用游戏':'apply','导出':'export','导入':'import',
   '复原':'reset','改名':'rename'};
  b.dataset.action=actions[label]||'unknown';
  b.addEventListener('click',event=>{
   event.stopPropagation();
   action();
  });
  controls.append(b);
  return b;
 }
 const pick=button('选取',()=>setTool('select'),'拖动车站、点击线路选中、拖动金色圆角点');
 const bend=button('折点＋',()=>setTool('bend'),'选中后点轨道或空白格点添加圆角控制点');
 const add=button('站点＋',()=>setTool('station'),'选中一段轨道后点格点插入新车站');
 const remove=button('删除选中',()=>{
  const edge=currentEdge();
  if(edge&&selectedBend>=0){
   model.deleteBend(edge,selectedBend);selectedBend=-1;
  }else if(selectedStation&&model.getStation(selectedStation)?.original===false){
   model.removeCustomStation(selectedStation);selectedStation=null;
  }else{message('只能删除自建车站或所选金色圆角点');return}
  render();
 },'点选金色折点后删除；原有剧情站点受到保护');
 const undo=button('↶',()=>{if(model.undo())render()},'撤销 Ctrl+Z');
 const redo=button('↷',()=>{if(model.redo())render()},'重做 Ctrl+Y');
 const save=button('保存',()=>{
  try{model.save();message('编辑草图已保存到本浏览器，可继续修改或导出');render()}
  catch(err){message(err.message||'无法保存')}
 },'保存到当前浏览器；正式乘车线路需审核后发布');
 const apply=button('应用游戏',()=>{
  if(!global.confirm('将已编辑的地铁线路应用到本机游戏吗？页面会重新加载，已有游戏存档保留。'))return;
  try{
   model.save();
   message('蓝图已通过站点完整性验证，正在重新加载地铁系统');
   global.location.reload();
  }catch(err){message('无法应用：'+(err.message||String(err)))}
 },'保存并重新加载；新站与路线将进入本机真实乘车图');
 const exportButton=button('导出',()=>{
  try{
   const blob=new Blob([model.exportJSON()],{type:'application/json;charset=utf-8'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='kirihama-dot-subway-blueprint.v1.json';
   document.body.append(a);a.click();a.remove();
   global.setTimeout(()=>URL.revokeObjectURL(url),1000);
   message('已导出可再次导入的点阵线路蓝图');
  }catch(err){message('导出失败：'+err.message)}
 },'下载全部线路、站点、圆角控制点 JSON 蓝图');
 const importButton=button('导入',()=>upload.click(),'导入之前保存的点阵线路蓝图');
 const reset=button('复原',()=>{
  if(!global.confirm('要恢复成进入当前编辑器时的线路布局吗？可以撤销。'))return;
  model.reset();selectedEdge=null;selectedStation=null;selectedBend=-1;render();
 },'恢复仓库原有线路草图，可撤销');
 const renameButton=button('改名',()=>{
  if(!selectedStation)return;
  try{
   if(model.renameStation(selectedStation,nameField.value))render();
   else message('站名不能留空，最多 36 个字符');
  }catch(err){message(err.message)}
 },'直接修改所选地铁站的名称');
 const selectedControls=[pick,bend,add,remove,undo,redo,save,apply,exportButton,importButton,reset,renameButton];
 upload.addEventListener('change',async()=>{
  const file=upload.files?.[0];
  if(!file)return;
  try{
   model.importJSON(await file.text());
   selectedEdge=null;focusedLine=null;selectedStation=null;selectedBend=-1;
   tool='select';render();message('已导入完整线路蓝图，检查后点保存');
  }catch(err){message('导入失败：'+(err.message||String(err)))}
  upload.value='';
 });
 const status=()=>{
  const edge=currentEdge(),s=model.getStation(selectedStation);
  const txt=s?'车站 · '+s.label+' ('+s.gx+','+s.gy+')':
   edge?edge.name+' · '+(model.getStation(edge.from)?.label||edge.from)+
    ' → '+(model.getStation(edge.to)?.label||edge.to):
   '点一条彩色线路，只显示这条线的车站，再拖动编辑';
  info.textContent=lastWarning||txt;
  pick.dataset.active=String(tool==='select');
  bend.dataset.active=String(tool==='bend');
  add.dataset.active=String(tool==='station');
  remove.disabled=!(edge&&selectedBend>=0)&&
   !(s&&s.original===false);
  undo.disabled=!model.canUndo();
  redo.disabled=!model.canRedo();
  rename.hidden=!s;
  renameButton.hidden=!s;
  nameField.disabled=!s;
  if(s&&document.activeElement!==nameField)nameField.value=s.label;
  save.dataset.dirty=String(model.changed());
 };
 function setTool(value){
  tool=value;selectedBend=-1;lastWarning='';
  if(value!=='select'&&!currentEdge()){
   message('请先点选一段地铁轨道，再点格点添加');
  }
  status();
 }
 function selectEdge(edge){
  selectedEdge=edge.key;focusedLine=edge.lineId;selectedStation=null;selectedBend=-1;
  lastWarning='';status();
 }
 const applyToEdge=(edge,event,method)=>{
  selectEdge(edge);
  const {gx,gy}=snapEvent(event);
  try{
   if(method==='bend'){
    model.insertBend(edge,gx,gy);
    message('已连接到点阵 ('+gx+','+gy+')，拐角自动圆滑');
   }else if(method==='station'){
    const id=model.addStation(edge,gx,gy);
    if(!id){message('这里已有车站或超出点阵范围');return}
    selectedStation=id;selectedEdge=null;
    message('已插入新站，请拖动定位、修改站名，再保存蓝图');
   }
   tool='select';render();
  }catch(err){message(err.message||'无法修改轨道')}
 };
 function pickRail(edge,event,forceBend=false){
  event.stopPropagation();event.preventDefault();
  if(forceBend||tool==='bend'||tool==='station')
   applyToEdge(edge,event,forceBend?'bend':tool);
  else{selectEdge(edge);render()}
 }
 function startDrag(event,kind,id,index=-1){
  if(tool!=='select')return;
  event.preventDefault();event.stopPropagation();
  drag={pointerId:event.pointerId,kind,id,index,before:model.serialize(),changed:false};
  try{map.setPointerCapture(event.pointerId)}catch(_){}
 }
 const titleNode=(group,titleText)=>{
  const t=v('title');t.textContent=titleText;group.append(t);
 };
 function render(){
  layer.replaceChildren();
  if(!active)return;
  const data=model.data(),cam=camera(),screenR=clamp(4.7/cam.scale,2.4,15);
  const edge=currentEdge(),selectedLine=focusedLine||edge?.lineId;
  const spacing=40*cam.scale;
  const showAllStationHandles=!selectedLine&&spacing>=82;
  // Route-first LOD: a full metropolis is a LINE PLAN, not hundreds of white circles.
  // One click isolates the current line's genuine station handles.
  map.dataset.editorNodeDensity=selectedLine?'selected-line':
   showAllStationHandles?'detailed':'hubs';
  const visible=(gx,gy,margin=90)=>{
   const p=localPoint({gx,gy});
   const bounds=map.getBoundingClientRect();
   return cam.x+p.x*cam.scale>-margin&&cam.x+p.x*cam.scale<bounds.width+margin&&
    cam.y+p.y*cam.scale>-margin&&cam.y+p.y*cam.scale<bounds.height+margin;
  };
  // The track consists ONLY of real programmatic SVG path strokes; there is
  // never a transparent bounding image or an interactive rectangular overlay.
  for(const row of model.edges()){
   const pts=model.points(row).map(([gx,gy])=>localPoint({gx,gy}));
   if(pts.length<2)continue;
   const d=rounded(pts,15);
   const group=v('g',{'data-editor-edge':row.key,
    'data-editor-line':row.lineId},'pw-metro-edit-edge');
   if(row.key===selectedEdge)group.dataset.selected='true';
   else if(selectedLine===row.lineId)group.dataset.sameLine='true';
   else if(selectedLine)group.dataset.dimmed='true';
   const casing=v('path',{d,stroke:'#0b1721',
    'stroke-width':11,'vector-effect':'non-scaling-stroke'},
    'pw-metro-edit-track-casing');
   const track=v('path',{d,stroke:row.color,
    'stroke-width':6,'vector-effect':'non-scaling-stroke'},
    'pw-metro-edit-track');
   const hit=v('path',{d,stroke:'transparent',
    'stroke-width':20,'vector-effect':'non-scaling-stroke',
    role:'button',tabindex:0,'aria-label':row.name+' · 编辑轨道'},
    'pw-metro-edit-hit');
   hit.addEventListener('click',e=>pickRail(row,e));
   hit.addEventListener('dblclick',e=>pickRail(row,e,true));
   hit.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){
     e.preventDefault();selectEdge(row);render();
    }
   });
   group.append(casing,track,hit);layer.append(group);
  }
  // True physical station handles. Moving a shared interchange updates
  // ALL connected rails; it is not a pasted pin independent of its tracks.
  const served=new Map();
  for(const line of data.lines)
   for(const id of line.stops)served.set(id,(served.get(id)||0)+1);
  for(const [id,station] of Object.entries(data.stations)){
   if(!visible(station.gx,station.gy))continue;
   const p=localPoint(station),isTransfer=(served.get(id)||0)>1;
   const onLine=!!selectedLine&&data.lines.some(line=>
    line.id===selectedLine&&line.stops.includes(id));
   const important=['entrance','central','school','convenience'].includes(id);
   const showHandle=!!(id===selectedStation||onLine||
    (!selectedLine&&(showAllStationHandles||isTransfer||important)));
   // Hidden stops remain in the editable model and track path, never deleted.
   if(!showHandle)continue;
   const circle=v('circle',{cx:p.x,cy:p.y,r:screenR,
    'data-editor-station':id,role:'button',tabindex:0,
    'aria-label':'编辑车站 '+station.label},
    'pw-metro-edit-station');
   if(isTransfer)circle.dataset.transfer='true';
   if(id===selectedStation)circle.dataset.selected='true';
   if(!station.original)circle.dataset.custom='true';
   titleNode(circle,station.label+' · '+station.gx+','+station.gy);
   circle.addEventListener('pointerdown',e=>{
    selectedStation=id;selectedEdge=null;selectedBend=-1;
    lastWarning='';status();startDrag(e,'station',id);
   });
   circle.addEventListener('click',e=>{
    e.stopPropagation();e.preventDefault();
    selectedStation=id;selectedEdge=null;selectedBend=-1;render();
   });
   circle.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){
     e.preventDefault();selectedStation=id;selectedEdge=null;render()
    }
   });
   layer.append(circle);
   const labelVisible=id===selectedStation||
    (!!selectedLine&&onLine&&spacing>=75)||
    (!selectedLine&&important&&spacing>=60)||
    (!selectedLine&&isTransfer&&spacing>=105);
   if(labelVisible){
    const txt=v('text',{x:p.x,y:p.y-screenR-5,
     'text-anchor':'middle'},'pw-metro-edit-station-label');
    txt.textContent=station.label;layer.append(txt);
   }
  }
  if(edge)model.bends(edge).forEach(([gx,gy],index)=>{
   if(!visible(gx,gy))return;
   const p=localPoint({gx,gy});
   const handle=v('circle',{cx:p.x,cy:p.y,r:clamp(7/cam.scale,4,18),
    'data-editor-bend':index,'data-edge':edge.key,tabindex:0,role:'button',
    'aria-label':'可拖动圆角控制点 '+(index+1)},
    'pw-metro-edit-bend');
   if(selectedBend===index)handle.dataset.selected='true';
   handle.addEventListener('click',e=>{
    e.stopPropagation();selectedBend=index;selectedStation=null;status();
    render();
   });
   handle.addEventListener('dblclick',e=>{
    e.stopPropagation();model.deleteBend(edge,index);
    selectedBend=-1;render();
   });
   handle.addEventListener('pointerdown',e=>{
    selectedBend=index;lastWarning='';status();startDrag(e,'bend',edge.key,index);
   });
   layer.append(handle);
  });
  status();
 }
 function handlePointerMove(e){
  if(!active||!drag||drag.pointerId!==e.pointerId)return false;
  e.preventDefault();e.stopPropagation();
  const {gx,gy}=snapEvent(e);
  let moved=false;
  if(drag.kind==='station')moved=model.moveStation(drag.id,gx,gy,false);
  else{
   const edge=model.edgeFor(drag.id);
   if(edge)moved=model.moveBend(edge,drag.index,gx,gy,false);
  }
  if(moved){drag.changed=true;lastWarning='';render()}
  return true;
 }
 function handlePointerUp(e){
  if(!active||!drag||drag.pointerId!==e.pointerId)return false;
  e.preventDefault();e.stopPropagation();
  if(drag.changed)model.remember(drag.before);
  drag=null;render();return true;
 }
 function handleKeydown(e){
  if(!active)return false;
  if(e.target.closest('input'))return false;
  const mod=e.ctrlKey||e.metaKey;
  if(mod&&e.key.toLowerCase()==='z'){
   e.preventDefault();
   if(e.shiftKey)model.redo();else model.undo();
   selectedEdge=null;selectedStation=null;selectedBend=-1;render();return true;
  }
  if(mod&&e.key.toLowerCase()==='y'){
   e.preventDefault();model.redo();render();return true;
  }
  if(e.key==='Escape'){
   e.preventDefault();toggle(false);return true;
  }
  if(e.key==='Delete'||e.key==='Backspace'){
   e.preventDefault();remove.click();return true;
  }
  return false;
 }
 function toggle(value){
  const next=value===undefined?!active:!!value;
  if(next&&getCity()!=='kirihama')return false;
  if(!next&&active&&model.changed()){
   try{model.save();message('线路草图已自动保存到浏览器')}
   catch(err){message(err.message)}
  }
  active=next;drag=null;tool='select';
  selectedEdge=null;focusedLine=null;selectedStation=null;selectedBend=-1;
  lastWarning='';
  toggleButton.textContent=active?'完成':'编排';
  toggleButton.dataset.active=String(active);
  toggleButton.setAttribute('aria-label',active?'结束地铁线网编排':'进入可编辑地铁线网编排');
  bar.hidden=!active;layer.style.display=active?'':'none';
  map.dataset.metroEditing=String(active);
  if(active)render();else layer.replaceChildren();
  onRefresh?.();
  return true;
 }
 function syncVisibility(){
  const city=getCity();
  toggleButton.hidden=city!=='kirihama';
  if(city!=='kirihama'&&active){
   toggle(false);return;
  }
  if(active){
   urban.style.display='none';
   stops.style.display='none';
   metroLayer.hidden=true;
   layer.style.display='';
   // Keep every handle screen-sized during zoom; paths remain grid-aligned.
   render();
  }else layer.style.display='none';
 }
 function onGridClick(e){
  if(!active||!(tool==='bend'||tool==='station'))return;
  const target=e.target;
  if(target!==svg&&target!==map&&!target.closest?.(
    '.pw-transit-dot-matrix,.pw-dot-rail-canvas'))return;
  const edge=currentEdge();
  if(!edge){message('先点轨道选中需要编辑的线路段');return}
  e.stopPropagation();
  applyToEdge(edge,e,tool);
 }
 const onKey=e=>{if(handleKeydown(e))e.stopPropagation()};
 toggleButton.addEventListener('click',e=>{e.stopPropagation();toggle()});
 map.addEventListener('click',onGridClick);
 map.addEventListener('keydown',onKey,true);
 layer.style.display='none';
 global.PaperWorldMetroEditorDebug={model,isActive:()=>active,
  enter:()=>toggle(true),exit:()=>toggle(false)};
 return Object.freeze({
  toggle,syncVisibility,render,
  isEditing:()=>active,
  isTarget:target=>active&&!!target.closest?.('.pw-metro-edit-layer,.pw-metro-edit-toolbar'),
  handlePointerMove,handlePointerUp,handleKeydown,
  dispose(){
   map.removeEventListener('click',onGridClick);
   map.removeEventListener('keydown',onKey,true);
   layer.remove();bar.remove();toggleButton.remove();upload.remove();
   if(global.PaperWorldMetroEditorDebug?.model===model)
    delete global.PaperWorldMetroEditorDebug;
  }
 });
}
global.PaperWorldMetroMapEditorUI=Object.freeze({create});
})(window);
