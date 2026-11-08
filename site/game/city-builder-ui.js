/* Click-to-build DOT CITY STUDIO inside the actual game map.
 * No static image city art: every dot geometry has an individually editable
 * semantic module behind it. Official examples are loaded as component data.
 */
(function(global){
'use strict';
const M=global.PaperWorldCityBuilder;
if(!M)return;
const docEl=(tag,cls,text)=>{
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(text!==undefined)n.textContent=text;
 return n;
};
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const widthOf=m=>m.w||0;
const CAT=['路网','交通','地点','建筑','环境'];
const colored=(c,alpha=1)=>{
 if(alpha>=.999)return c;
 const x=parseInt(c.slice(1),16);
 return 'rgba('+((x>>16)&255)+','+((x>>8)&255)+','+(x&255)+','+alpha+')';
};
function create({map,tools,atlas,metro,geometry,chooseInitial,onFeedback}){
 const cases=M.officialCases(atlas,metro,geometry);
 const model=M.createEditor(cases);
 let open=false,tool='select',selection=null,cursor=null,pending=null,drag=null,
  pan={x:0,y:0},zoom=1,lastSize={w:0,h:0},raf=0,notice='',selectedCat='路网';
 const root=docEl('section','pw-city-build-studio');
 root.hidden=true;root.setAttribute('aria-label','点阵城市模块化建设工作室');
 const top=docEl('header','pw-city-build-head');
 const title=docEl('div','pw-city-build-title');
 title.append(docEl('strong','', '点阵城市 · 规划工作室'),
  docEl('small','', '模块拼装 / 官方案例 / 所见即数据'));
 const cityChoice=docEl('select','pw-city-build-case');
 cityChoice.setAttribute('aria-label','选择官方城市案例');
 for(const c of model.caseList()){
  const o=docEl('option','',c.title);
  o.value=c.id;cityChoice.append(o);
 }
 const actions=docEl('div','pw-city-build-actions');
 const action=(label,id,onClick,titleText)=>{
  const button=docEl('button','pw-city-build-action',label);
  button.type='button';button.dataset.action=id;
  button.title=titleText||label;
  button.setAttribute('aria-label',titleText||label);
  button.addEventListener('click',e=>{e.stopPropagation();onClick()});
  actions.append(button);return button;
 };
 const save=action('保存草图','save',()=>{
  try{model.save();notify('已保存到此浏览器，正式世界数据未被改写');render()}
  catch(e){notify('保存失败：'+e.message)}
 },'保存本机城市编辑草图');
 action('导出 JSON','export',()=>{
  const data=model.exportJSON();
  const blob=new Blob([data],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=docEl('a');
  a.href=url;a.download='paperchalk-city-'+model.selectedCase+'-blueprint.json';
  document.body.append(a);a.click();a.remove();
  global.setTimeout(()=>URL.revokeObjectURL(url),1000);
  notify('已导出完整可复用城市组件蓝图');
 },'导出每个组件和真实坐标');
 const upload=docEl('input');upload.type='file';upload.accept='.json,application/json';
 upload.hidden=true;root.append(upload);
 action('导入','import',()=>upload.click(),'导入本城市兼容的组件 JSON 蓝图');
 upload.addEventListener('change',async()=>{
  const file=upload.files?.[0];upload.value='';
  if(!file)return;
  try{model.importJSON(await file.text());selection=null;pending=null;
   fit();notify('已导入蓝图，可直接继续拼装')}
  catch(e){notify('导入失败：'+e.message)}
 });
 action('↶','undo',()=>{if(model.undo()){selection=null;pending=null;render()}},'撤销 Ctrl+Z');
 action('↷','redo',()=>{if(model.redo()){selection=null;pending=null;render()}},'重做 Ctrl+Y');
 action('还原案例','reset',()=>{
  if(global.confirm&& !global.confirm('恢复这座官方案例的原始模块吗？本次改动可撤销。'))return;
  model.reset();selection=null;pending=null;fit();notify('官方案例模块已复原');
 },'从原官方数据重装所有模块，可撤销');
 const close=action('×','close',()=>hide(),'关闭城市拼装工作室');
 top.append(title,cityChoice,actions);
 const main=docEl('div','pw-city-build-layout');
 const left=docEl('aside','pw-city-build-palette');
 left.append(docEl('div','pw-city-build-small-title','组件库 · 点击选择'));
 const cats=docEl('div','pw-city-build-cats');
 const bank=docEl('div','pw-city-build-bank');
 for(const cat of CAT){
  const b=docEl('button','pw-city-build-cat',cat);b.type='button';
  b.dataset.cat=cat;
  b.addEventListener('click',()=>{selectedCat=cat;rebuildBank()});
  cats.append(b);
 }
 const select=docEl('button','pw-city-build-module pw-city-build-select','◈ 选择 / 拖动');
 select.type='button';select.dataset.tool='select';
 select.addEventListener('click',()=>setTool('select'));
 const help=docEl('div','pw-city-build-tips');
 help.textContent='格点吸附 · 左键放置 · 画线可连续延伸 · Enter 结束连线 · 空格拖动 · 滚轮缩放 · R 旋转 · Delete 删除';
 left.append(cats,select,bank,help);
 const center=docEl('section','pw-city-build-workspace');
 const canvas=docEl('canvas','pw-city-build-canvas');
 canvas.setAttribute('aria-label','可交互点阵城市拼装画布');
 canvas.tabIndex=0;
 const viewportHead=docEl('div','pw-city-build-viewport-top');
 const stats=docEl('span','pw-city-build-stats','加载城市案例…');
 const zoomBar=docEl('div','pw-city-build-zoom');
 const z=(s,id,fn)=>{
  const b=docEl('button','',s);b.type='button';b.dataset.zoom=id;
  b.addEventListener('click',fn);zoomBar.append(b);
 };
 z('−','out',()=>zoomAt(.83,lastSize.w/2,lastSize.h/2));
 z('+','in',()=>zoomAt(1.21,lastSize.w/2,lastSize.h/2));
 z('全图','fit',()=>fit());
 viewportHead.append(stats,zoomBar);
 const status=docEl('div','pw-city-build-status','所有元素均为可编辑组件，点击选择');
 center.append(canvas,viewportHead,status);
 const right=docEl('aside','pw-city-build-inspector');
 right.append(docEl('div','pw-city-build-small-title','当前组件'));
 const details=docEl('div','pw-city-build-detail');
 const name=docEl('input','pw-city-build-name');
 name.placeholder='组件名称';name.maxLength=48;
 name.setAttribute('aria-label','编辑当前组件名称');
 name.addEventListener('change',()=>{
  if(selection){try{model.update(selection,{label:name.value});render()}
  catch(e){notify(e.message)}}
 });
 const colorField=docEl('input','pw-city-build-color');
 colorField.type='color';colorField.setAttribute('aria-label','编辑点阵颜色');
 colorField.addEventListener('change',()=>{
  if(selection){try{model.update(selection,{color:colorField.value});render()}
  catch(e){notify(e.message)}}
 });
 const position=docEl('div','pw-city-build-position','未选择组件');
 const refs=docEl('div','pw-city-build-reference');
 const editActions=docEl('div','pw-city-build-edit-actions');
 const edit=(text,fn)=>{
  const b=docEl('button','',text);b.type='button';
  b.addEventListener('click',fn);editActions.append(b);
 };
 edit('↻ 旋转',()=>{const m=selected();if(m){model.update(m.id,{angle:m.angle+1});render()}});
 edit('复制',()=>{const m=selected();if(m){selection=model.duplicate(m.id);render()}});
 edit('删除',()=>{if(selection){model.remove(selection);selection=null;render()}});
 details.append(name,colorField,position,refs,editActions);
 right.append(details);
 const foot=docEl('div','pw-city-build-footer');
 foot.append(docEl('span','', '点阵不是贴图：每条道路、轨道、站点、地块、地点都有独立数据。'),
  docEl('span','pw-city-build-footer-mode','编辑草图不会直接改动正式旅行线路'));
 root.append(top,main,foot);
 main.append(left,center,right);
 map.append(root);
 const toggle=docEl('button','pw-dot-tool pw-city-build-toggle','城市拼装');
 toggle.type='button';
 toggle.setAttribute('aria-label','打开城市点阵模块拼装编辑器');
 toggle.addEventListener('click',()=>open?hide():show(chooseInitial?.()));
 tools.append(toggle);
 const selected=()=>model.state().modules.find(m=>m.id===selection);
 const list=()=>model.state().modules;
 const keys=()=>Object.keys(M.TYPES);
 function notify(text){
  notice=text;status.textContent=text;onFeedback?.(text);
 }
 function rebuildBank(){
  for(const b of cats.children)b.dataset.active=String(b.dataset.cat===selectedCat);
  bank.replaceChildren();
  for(const type of keys().filter(k=>M.TYPES[k].group===selectedCat)){
   const cfg=M.TYPES[type],b=docEl('button','pw-city-build-module');
   b.type='button';b.dataset.tool=type;
   const color=docEl('i');color.style.background=cfg.color;
   b.append(color,docEl('span','',cfg.name));
   b.dataset.active=String(tool===type);
   b.addEventListener('click',()=>setTool(type));
   bank.append(b);
  }
  select.dataset.active=String(tool==='select');
 }
 function setTool(next){
  tool=next;pending=null;selection=null;rebuildBank();
  notify(next==='select'?'选择并拖动已有模块':(
   ['road','rail'].includes(next)?
   '点击第一个点开始画线；继续点击拼装，Enter 结束':
   '鼠标移动到格点预览，点击放置'+M.TYPES[next]?.name));
  render();
 }
 function view(){
  return model.state();
 }
 function measure(){
  const r=canvas.getBoundingClientRect();
  if(!r.width||!r.height)return false;
  const ratio=Math.min(2,global.devicePixelRatio||1);
  if(canvas.width!==Math.round(r.width*ratio)||canvas.height!==Math.round(r.height*ratio)){
   canvas.width=Math.round(r.width*ratio);
   canvas.height=Math.round(r.height*ratio);
  }
  lastSize={w:r.width,h:r.height,ratio};
  return true;
 }
 function transform(){
  const d=view(),w=lastSize.w,h=lastSize.h;
  const cell=Math.min((w-115)/d.width,(h-105)/d.height)*zoom;
  return {cell,x:w/2-d.width*cell/2+pan.x,y:h/2-d.height*cell/2+pan.y};
 }
 function screen(p,t){return [t.x+p[0]*t.cell,t.y+p[1]*t.cell]}
 function world(x,y){
  const d=view(),t=transform();
  return [clamp(Math.round((x-t.x)/t.cell),0,d.width),
   clamp(Math.round((y-t.y)/t.cell),0,d.height)];
 }
 function dot(ctx,x,y,r,col,opacity=1){
  ctx.globalAlpha=opacity;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fillStyle=col;ctx.fill();ctx.globalAlpha=1;
 }
 function pointDots(ctx,a,b,t,col,{radius=1.65,spacing=9,opacity=1}={}){
  const [x1,y1]=screen(a,t),[x2,y2]=screen(b,t),
   n=Math.max(1,Math.ceil(Math.hypot(x2-x1,y2-y1)/spacing));
  for(let i=0;i<=n;i++){
   const k=i/n;
   dot(ctx,x1+(x2-x1)*k,y1+(y2-y1)*k,radius,col,opacity);
  }
 }
 function perimeter(ctx,m,t,col,selected){
  const x=m.x,y=m.y,w=m.w,h=m.h;
  for(const [a,b] of [
   [[x,y],[x+w,y]],[[x+w,y],[x+w,y+h]],
   [[x+w,y+h],[x,y+h]],[[x,y+h],[x,y]]
  ])pointDots(ctx,a,b,t,col,{radius:selected?2.1:1.45,spacing:8,opacity:selected?1:.77});
  const d=Math.max(1,Math.ceil(8/t.cell));
  for(let cx=x+1;cx<x+w;cx+=d)for(let cy=y+1;cy<y+h;cy+=d){
   const [px,py]=screen([cx,cy],t);
   dot(ctx,px,py,1.0,col,.27);
  }
 }
 function drawLine(ctx,m,t,selected){
  const pts=m.points||[];const col=selected?'#fff1d1':m.color;
  for(let i=1;i<pts.length;i++){
   if(m.type==='road'){
    // Two continuous aligned bands of individual light points.
    const a=pts[i-1],b=pts[i];
    if(a[0]===b[0]){
     pointDots(ctx,[a[0]-.18,a[1]],[b[0]-.18,b[1]],t,col,
      {radius:selected?2:1.4,spacing:9,opacity:.8});
     pointDots(ctx,[a[0]+.18,a[1]],[b[0]+.18,b[1]],t,col,
      {radius:selected?2:1.4,spacing:9,opacity:.8});
    }else{
     pointDots(ctx,[a[0],a[1]-.18],[b[0],b[1]-.18],t,col,
      {radius:selected?2:1.4,spacing:9,opacity:.8});
     pointDots(ctx,[a[0],a[1]+.18],[b[0],b[1]+.18],t,col,
      {radius:selected?2:1.4,spacing:9,opacity:.8});
    }
   }else pointDots(ctx,pts[i-1],pts[i],t,col,{
    radius:selected?2.7:2,spacing:7,opacity:selected?1:.91});
  }
  if(selected)for(const p of pts){
   const [x,y]=screen(p,t);dot(ctx,x,y,4.5,'#fff1cf',.94);
  }
 }
 function label(ctx,x,y,txt,col='#dbe8e7',align='left'){
  ctx.save();ctx.textAlign=align;
  ctx.font='600 12px "Noto Sans CJK SC",sans-serif';
  ctx.lineWidth=3.5;ctx.strokeStyle='#0c1a25';ctx.strokeText(txt,x,y);
  ctx.fillStyle=col;ctx.fillText(txt,x,y);ctx.restore();
 }
 function drawMarker(ctx,m,t,selected){
  const [x,y]=screen([m.x,m.y],t);
  const col=selected?'#fff1cd':m.color;
  if(m.type==='station'||m.type==='stop'){
   for(const [a,b] of [
    [[m.x-.45,m.y-.45],[m.x+.45,m.y-.45]],
    [[m.x+.45,m.y-.45],[m.x+.45,m.y+.45]],
    [[m.x+.45,m.y+.45],[m.x-.45,m.y+.45]],
    [[m.x-.45,m.y+.45],[m.x-.45,m.y-.45]]
   ])pointDots(ctx,a,b,t,col,{radius:1.9,spacing:5});
   dot(ctx,x,y,2.8,col);
  }else if(m.type==='place'){
   dot(ctx,x,y,selected?5:3.4,col,.96);
   dot(ctx,x,y,selected?2.4:1.2,'#0c1921');
  }else{
   const shapes={
    home:[[0,-1],[-1,0],[1,0],[-1,1],[1,1],[0,1]],
    school:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]],
    shop:[[-1,0],[0,0],[1,0],[-1,1],[1,1]],
    hospital:[[0,-1],[-1,0],[0,0],[1,0],[0,1]]
   };
   for(const [dx,dy] of shapes[m.type]||[[0,0]])
    dot(ctx,x+dx*4,y+dy*4,selected?2.65:2.15,col);
  }
  // Labels are attached to one real module point with a SHORT dotted tail.
  // At metropolitan zoom, hide crowding until selected or closer.
  if(selected||zoom>=1.15&&t.cell>=9&&(
   m.type!=='place'||m.status==='日常')){
   const lx=x+13,ly=y-14;
   pointDots(ctx,[m.x,m.y],[m.x+12/t.cell,m.y-12/t.cell],t,col,
    {radius:1.05,spacing:5,opacity:.85});
   label(ctx,lx+4,ly,m.label,selected?'#fff1ce':'#d5e2dd');
  }
 }
 function render(){
  if(!open)return;
  cancelAnimationFrame(raf);
  raf=requestAnimationFrame(draw);
 }
 function draw(){
  if(!measure())return;
  const d=view(),t=transform(),ctx=canvas.getContext('2d');
  if(!ctx)return;
  ctx.setTransform(lastSize.ratio,0,0,lastSize.ratio,0,0);
  ctx.clearRect(0,0,lastSize.w,lastSize.h);
  ctx.fillStyle='#0d1822';ctx.fillRect(0,0,lastSize.w,lastSize.h);
  const dotGap=t.cell;
  // Uniform isolated matrix light points, never solid faux pixel buildings.
  for(let gy=0;gy<=d.height;gy++)for(let gx=0;gx<=d.width;gx++){
   const [x,y]=screen([gx,gy],t);
   if(x<-4||x>lastSize.w+4||y<-4||y>lastSize.h+4)continue;
   dot(ctx,x,y,Math.min(1.4,Math.max(.65,t.cell*.095)),
    '#67838b',((gx%5===0&&gy%5===0)?.41:.23));
  }
  const modules=d.modules;
  for(const m of modules.filter(m=>M.TYPES[m.type].mode==='area'))
   perimeter(ctx,m,t,m.color,m.id===selection);
  for(const m of modules.filter(m=>M.TYPES[m.type].mode==='path'))
   drawLine(ctx,m,t,m.id===selection);
  for(const m of modules.filter(m=>M.TYPES[m.type].mode==='point'))
   drawMarker(ctx,m,t,m.id===selection);
  // Explicit physical junctions: shared endpoints become illuminated joints.
  for(const type of ['road','rail'])for(const join of model.adjacency(type)){
   const p=join.at.split(',').map(Number),[x,y]=screen(p,t);
   dot(ctx,x,y,3.2,type==='rail'?'#e2c7af':'#ccdedc',.95);
  }
  const preview=drag?.kind==='item'&&selection?selected():null;
  if(preview&&cursor){
   const [x,y]=screen(cursor,t),[sx,sy]=screen([preview.x,preview.y],t);
   ctx.save();ctx.globalAlpha=.7;
   pointDots(ctx,[preview.x,preview.y],cursor,t,'#f5e8b9',{
    radius:1.5,spacing:6});
   dot(ctx,x,y,6,'#f6dfad');ctx.restore();
  }
  if(cursor&&tool!=='select'){
   const [x,y]=screen(cursor,t);
   dot(ctx,x,y,7,'#9ebbc0',.35);dot(ctx,x,y,2.7,'#f7e9c5',.94);
   if(pending&&['road','rail'].includes(tool)){
    const p=M.pathBetween(pending,cursor);
    for(let i=1;i<p.length;i++)pointDots(ctx,p[i-1],p[i],t,
     M.TYPES[tool].color,{radius:2.3,spacing:7,opacity:.85});
   }else if(M.TYPES[tool]?.mode==='area'){
    const g=M.make(tool,cursor[0],cursor[1]);
    g.w=Math.min(g.w,d.width-g.x);g.h=Math.min(g.h,d.height-g.y);
    if(g.w>0&&g.h>0)perimeter(ctx,g,t,g.color,true);
   }
  }
  stats.textContent=d.title.replace(' · 官方城市案例','')+'  /  '+
   d.modules.length+' 个独立组件  /  '+d.width+'×'+d.height+' 格';
  root.dataset.case=model.selectedCase;
  root.dataset.tool=tool;
  root.dataset.modules=String(d.modules.length);
  root.dataset.unsaved=String(model.changed);
  root.dataset.stationCount=String(d.modules.filter(m=>m.type==='station').length);
  root.dataset.railCount=String(d.modules.filter(m=>m.type==='rail').length);
  root.dataset.roadCount=String(d.modules.filter(m=>m.type==='road').length);
  root.dataset.placeCount=String(d.modules.filter(m=>m.type==='place').length);
  save.dataset.changed=String(model.changed);
  renderInspector();
 }
 function renderInspector(){
  const m=selected();
  details.hidden=!m;
  if(!m)return;
  if(document.activeElement!==name)name.value=m.label;
  if(document.activeElement!==colorField)colorField.value=m.color;
  position.textContent='格点 X '+m.x+' / Y '+m.y+
   ' · 方向 '+(m.angle*90)+'° · '+M.TYPES[m.type].name;
  refs.textContent=m.refId?
   '官方数据 '+m.refId+' · '+(m.status||'规划')+' · 可编辑实例':
   '自建组件 · '+(m.status||'草图');
 }
 function zoomAt(f,x,y){
  if(!lastSize.w)return;
  const before=transform(),wx=(x-before.x)/before.cell,wy=(y-before.y)/before.cell;
  zoom=clamp(zoom*f,.62,5.8);
  const after=transform();
  pan.x+=(x-(after.x+wx*after.cell));
  pan.y+=(y-(after.y+wy*after.cell));
  render();
 }
 function fit(){pan={x:0,y:0};zoom=1;render()}
 function show(id){
  if(!cases.some(c=>c.caseId===id))id='home';
  if(open&&model.changed&&model.selectedCase!==id&&
   global.confirm&&!global.confirm('尚有未保存修改，切换官方案例？'))return;
  model.choose(id);cityChoice.value=id;selection=null;pending=null;
  open=true;root.hidden=false;toggle.dataset.active='true';
  tool='select';selectedCat='路网';rebuildBank();fit();
  notify('官方案例已拆为可点击的单个组件；左侧选取即可直接拼装');
  global.requestAnimationFrame(()=>{fit();canvas.focus({preventScroll:true})});
 }
 function hide(){
  open=false;root.hidden=true;toggle.dataset.active='false';pending=null;
  selection=null;drag=null;
 }
 cityChoice.addEventListener('change',()=>{
  const next=cityChoice.value;
  if(model.changed&&global.confirm&&
   !global.confirm('当前城市蓝图有未保存修改，确认切换？')){
   cityChoice.value=model.selectedCase;return;
  }
  model.choose(next);selection=null;pending=null;fit();notify('已打开 '+view().title+'，可以直接拆装所有模块');
 });
 function nearPath(m,p){
  let best=Infinity;const pts=m.points||[];
  for(let i=1;i<pts.length;i++){
   const a=pts[i-1],b=pts[i],dx=b[0]-a[0],dy=b[1]-a[1];
   const len=dx*dx+dy*dy||1;
   const t=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/len,0,1);
   const dst=Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);
   best=Math.min(best,dst);
  }
  return best;
 }
 function findAt(p){
  const modules=list(),hits=[];
  for(let i=modules.length-1;i>=0;i--){
   const m=modules[i],mode=M.TYPES[m.type].mode;
   let dist=Infinity;
   if(mode==='point')dist=Math.hypot(m.x-p[0],m.y-p[1]);
   else if(mode==='path')dist=nearPath(m,p);
   else if(p[0]>=m.x&&p[0]<=m.x+m.w&&p[1]>=m.y&&p[1]<=m.y+m.h)dist=.95;
   if(dist<=Math.max(.68,5.5/transform().cell))
    hits.push({id:m.id,dist,priority:mode==='point'?0:mode==='area'?2:1});
  }
  hits.sort((a,b)=>a.priority-b.priority||a.dist-b.dist);
  return hits[0]?.id||null;
 }
 const canvasCoords=e=>{
  const r=canvas.getBoundingClientRect();
  return [e.clientX-r.left,e.clientY-r.top];
 };
 const isEditingTarget=target=>!!target.closest('input,select,textarea');
 canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0&&e.button!==1)return;
  const [px,py]=canvasCoords(e),p=world(px,py);
  if(e.button===1||e.shiftKey&&tool==='select'){
   drag={kind:'pan',x:e.clientX,y:e.clientY,pan:{...pan}};
   canvas.setPointerCapture(e.pointerId);e.preventDefault();return;
  }
  canvas.setPointerCapture(e.pointerId);
  if(tool==='select'){
   selection=findAt(p);cursor=p;render();
   drag=selection?{kind:'item',from:p,id:selection}:{kind:'pan',x:e.clientX,y:e.clientY,pan:{...pan}};
  }else if(tool==='road'||tool==='rail'){
   if(!pending){pending=p;notify('选择第二个格点连接'+M.TYPES[tool].name);}
   else if(p[0]!==pending[0]||p[1]!==pending[1]){
    try{selection=model.addPath(tool,[pending,p],{
     label:M.TYPES[tool].name,origin:'user',status:'draft'});
     pending=p;notify('线路已连接到格点，继续点击可延伸；Enter 结束');}
    catch(err){notify(err.message)}
   }
   render();
  }else{
   try{selection=model.insert(tool,p[0],p[1],{
    label:M.TYPES[tool].name,origin:'user',status:'draft'});
    notify('已放置 '+M.TYPES[tool].name+' · 可以继续在其他格点拼装')}
   catch(err){notify(err.message)}
   render();
  }
 });
 canvas.addEventListener('pointermove',e=>{
  const [px,py]=canvasCoords(e);cursor=world(px,py);
  if(drag?.kind==='pan'){
   pan.x=drag.pan.x+e.clientX-drag.x;
   pan.y=drag.pan.y+e.clientY-drag.y;
  }
  render();
 });
 function finish(e){
  if(drag?.kind==='item'&&selection&&cursor){
   const a=drag.from,b=cursor;
   if(a[0]!==b[0]||a[1]!==b[1]){
    try{model.translate(selection,b[0]-a[0],b[1]-a[1])}
    catch(err){notify(err.message)}
   }
  }
  drag=null;render();
 }
 canvas.addEventListener('pointerup',finish);
 canvas.addEventListener('pointercancel',()=>{drag=null;render()});
 canvas.addEventListener('pointerleave',()=>{
  if(!drag){cursor=null;render()}
 });
 canvas.addEventListener('wheel',e=>{
  e.preventDefault();e.stopPropagation();
  const [x,y]=canvasCoords(e);
  zoomAt(e.deltaY>0?.84:1.19,x,y);
 },{passive:false});
 root.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(pending){pending=null;render()}else if(tool!=='select')setTool('select');else hide();e.preventDefault();return}
  if(isEditingTarget(e.target))return;
  if(e.key==='Enter'&&pending){pending=null;notify('已结束线段拼装');render();e.preventDefault();return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){if(model.undo())render();e.preventDefault();return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){if(model.redo())render();e.preventDefault();return}
  if(e.key.toLowerCase()==='r'&&selection){const m=selected();model.update(selection,{angle:m.angle+1});render();e.preventDefault();return}
  if((e.key==='Delete'||e.key==='Backspace')&&selection){model.remove(selection);selection=null;render();e.preventDefault();return}
  if(e.key==='+'||e.key==='='){zoomAt(1.16,lastSize.w/2,lastSize.h/2);e.preventDefault();return}
  if(e.key==='-'){zoomAt(.86,lastSize.w/2,lastSize.h/2);e.preventDefault()}
  e.stopPropagation();
 });
 root.addEventListener('pointerdown',e=>e.stopPropagation());
 root.addEventListener('pointermove',e=>e.stopPropagation());
 root.addEventListener('pointerup',e=>e.stopPropagation());
 root.addEventListener('wheel',e=>e.stopPropagation(),{passive:false});
 const observer=typeof ResizeObserver!=='undefined'?
  new ResizeObserver(()=>render()):null;
 observer?.observe(center);
 rebuildBank();
 return Object.freeze({
  show,hide,get open(){return open},
  model,refresh:render,
  dispose:()=>{observer?.disconnect();hide()},
  // Exposed for reliable CI and in-game DEV inspection, not an alternate renderer.
  debug:()=>({open,tool,caseId:model.selectedCase,selectedId:selection,pending,
   ...model.validate()})
 });
}
global.PaperWorldCityBuilderUI=Object.freeze({create});
})(window);
