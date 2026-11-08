/* Paperchalk World — restrained terrain sculpting for the shared infinite XYZ lattice.
 * A single tool palette, not a separate fake map/editor scene.
 * The terrain engine owns geometry. This component only controls user edits.
 */
(function(root){
 'use strict';
 const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
 const HISTORY_LIMIT=60;
 const STORAGE_KEY='paperworld:terrain:heightfield:v1';
 const OPERATIONS=[
  ['raise','抬升'],['dig','下挖'],['flatten','整平'],['smooth','平滑']
 ];
 const SHAPES=[
  ['point','单点'],['brush','笔刷'],['rect','方框']
 ];
 function create({map,terrain,viewport,camera,cell=40,enabled=true}){
  if(!enabled||!map||!terrain)return null;
  const doc=map.ownerDocument;
  const make=(tag,cls,label)=>{
   const node=doc.createElement(tag);node.className=cls;
   if(label!==undefined)node.textContent=label;
   return node;
  };
  const button=(cls,label)=>{
   const node=make('button',cls,label);node.type='button';return node;
  };
  const toggle=button('pw-terrain-edit-toggle','地形');
  toggle.setAttribute('aria-label','打开地形塑造工具');
  toggle.title='编辑三维点阵地形';
  const panel=make('div','pw-terrain-edit-panel');
  panel.hidden=true;
  panel.setAttribute('role','group');
  panel.setAttribute('aria-label','地形塑造工具');
  const title=make('div','pw-terrain-edit-title','地形塑造');
  const ops=make('div','pw-terrain-edit-options pw-terrain-edit-operations');
  const shapes=make('div','pw-terrain-edit-options pw-terrain-edit-shapes');
  const buttonsOp=new Map(),buttonsShape=new Map();
  for(const [id,label] of OPERATIONS){
   const b=button('pw-terrain-edit-choice',label);b.dataset.op=id;
   b.setAttribute('aria-pressed',String(id==='raise'));
   b.addEventListener('click',()=>{op=id;sync()});
   buttonsOp.set(id,b);ops.append(b);
  }
  for(const [id,label] of SHAPES){
   const b=button('pw-terrain-edit-choice',label);b.dataset.shape=id;
   b.setAttribute('aria-pressed',String(id==='brush'));
   b.addEventListener('click',()=>{shape=id;sync()});
   buttonsShape.set(id,b);shapes.append(b);
  }
  function control(labelText,min,max,initial,units){
   const label=make('label','pw-terrain-edit-setting');
   const head=make('span','pw-terrain-edit-setting-label');
   const value=make('output','pw-terrain-edit-setting-value');
   const input=doc.createElement('input');
   input.type='range';input.min=String(min);input.max=String(max);
   input.step='1';input.value=String(initial);
   head.append(make('span','',labelText),value);
   label.append(head,input);
   const update=()=>{value.textContent=input.value+units};
   input.addEventListener('input',update);update();
   return {label,input,update};
  }
  const stepControl=control('高度步长',1,40,8,'m');
  const sizeControl=control('笔刷半径',1,8,3,'格');
  const levelRow=make('label','pw-terrain-edit-target');
  levelRow.append(make('span','','目标海拔'));
  const levelInput=doc.createElement('input');
  levelInput.type='number';levelInput.min='-800';levelInput.max='800';
  levelInput.step='1';levelInput.value='0';
  levelInput.setAttribute('aria-label','整平目标海拔，米');
  const unit=make('span','','m');
  levelRow.append(levelInput,unit);
  const actions=make('div','pw-terrain-edit-actions');
  const undoBtn=button('pw-terrain-edit-action','撤销');
  const redoBtn=button('pw-terrain-edit-action','重做');
  const doneBtn=button('pw-terrain-edit-action pw-terrain-edit-done','完成');
  actions.append(undoBtn,redoBtn,doneBtn);
  const hint=make('div','pw-terrain-edit-hint','左键塑造 · Shift+拖动移动地图');
  panel.append(title,ops,shapes,stepControl.label,sizeControl.label,levelRow,actions,hint);
  const preview=make('canvas','pw-terrain-edit-preview');
  preview.setAttribute('aria-hidden','true');
  const ctx=preview.getContext('2d',{alpha:true});
  map.append(preview,toggle,panel);
  let editing=false,op='raise',shape='brush',stroke=null,hover=null,lastDraw=0;
  const undoStack=[],redoStack=[];
  function load(){
   try{
    const raw=doc.defaultView?.localStorage?.getItem(STORAGE_KEY);
    if(!raw)return;
    const saved=JSON.parse(raw);
    if(saved?.version===1&&Array.isArray(saved.points))terrain.importHeights(saved.points);
   }catch(error){console.warn('Terrain sculpt storage unavailable:',error)}
  }
  function save(){
   try{
    doc.defaultView?.localStorage?.setItem(STORAGE_KEY,JSON.stringify({
     version:1,cell,points:terrain.exportHeights()
    }));
   }catch(error){
    hint.textContent='当前地形已修改，但浏览器存储失败；请检查存储空间';
    console.warn('Terrain height save unavailable:',error);
   }
  }
  load();
  function sync(){
   panel.hidden=!editing;
   map.dataset.terrainEditing=String(editing);
   map.dataset.terrainTool=op;
   map.dataset.terrainShape=shape;
   toggle.textContent=editing?'完成':'地形';
   toggle.setAttribute('aria-pressed',String(editing));
   toggle.setAttribute('aria-label',editing?'关闭地形塑造工具':'打开地形塑造工具');
   for(const [id,b] of buttonsOp)b.setAttribute('aria-pressed',String(id===op));
   for(const [id,b] of buttonsShape)b.setAttribute('aria-pressed',String(id===shape));
   stepControl.label.hidden=op==='flatten';
   levelRow.hidden=op!=='flatten';
   sizeControl.label.hidden=shape!=='brush';
   undoBtn.disabled=!undoStack.length;redoBtn.disabled=!redoStack.length;
   if(!hint.textContent.includes('存储失败'))
    hint.textContent=shape==='rect'?'按下并拖动框选 · 松开后塑造':
     '左键塑造 · Shift+拖动移动视角 · Ctrl+Z 撤销';
  }
  function setEditing(value){
   if(stroke)finish(stroke,true);
   editing=!!value;hover=null;sync();
   if(!editing&&ctx)ctx.clearRect(0,0,preview.width,preview.height);
  }
  toggle.addEventListener('click',()=>setEditing(!editing));
  doneBtn.addEventListener('click',()=>setEditing(false));
  panel.addEventListener('pointerdown',e=>e.stopPropagation());
  panel.addEventListener('pointermove',e=>e.stopPropagation());
  panel.addEventListener('wheel',e=>e.stopPropagation(),{passive:true});
  stepControl.input.addEventListener('input',stepControl.update);
  sizeControl.input.addEventListener('input',sizeControl.update);
  function position(e){
   const rect=map.getBoundingClientRect();
   const localX=e.clientX-rect.left,localY=e.clientY-rect.top;
   const pt=terrain.unproject(localX,localY);
   return pt&&Number.isFinite(pt.x)&&Number.isFinite(pt.y)?pt:null;
  }
  function saveBefore(tx,gx,gy){
   const key=gx+','+gy;
   if(!tx.before.has(key))tx.before.set(key,{
    gx,gy,old:terrain.getHeight(gx,gy)
   });
  }
  function affect(tx,cells,amount){
   if(!cells.length)return;
   // Read the whole neighborhood before committing a smoothing pass; this
   // makes its result independent of iteration order.
   const lookup=new Map(cells.map(p=>[p.gx+','+p.gy,terrain.getHeight(p.gx,p.gy)]));
   const changed=[];
   for(const p of cells){
    const {gx,gy,weight}=p;
    if(!Number.isSafeInteger(gx)||!Number.isSafeInteger(gy))continue;
    const prev=lookup.get(gx+','+gy);
    let next=prev;
    if(op==='raise')next=prev+amount*weight;
    else if(op==='dig')next=prev-amount*weight;
    else if(op==='flatten'){
     const level=clamp(Number(levelInput.value)||0,-800,800);
     next=prev+(level-prev)*weight;
    }else if(op==='smooth'){
     let sum=0;
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      sum+=terrain.getHeight(gx+dx,gy+dy);
     }
     next=prev+(sum/9-prev)*Math.min(1,.7*weight);
    }
    next=clamp(Math.round(next*100)/100,-800,800);
    if(next===prev)continue;
    saveBefore(tx,gx,gy);
    changed.push({gx,gy,next});
   }
   for(const p of changed)terrain.setHeight(p.gx,p.gy,p.next);
  }
  function cellStamp(gx,gy,tx){
   const amount=Number(stepControl.input.value)||8;
   const radius=Number(sizeControl.input.value)||3;
   const cells=[];
   if(shape==='point')cells.push({gx,gy,weight:1});
   else {
    for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
     const dist=Math.hypot(dx,dy);
     if(dist>radius+.001)continue;
     cells.push({
      gx:gx+dx,gy:gy+dy,
      weight:Math.max(.15,1-dist/(radius+.8))
     });
    }
   }
   affect(tx,cells,amount);
  }
  function lineStamp(a,b,tx){
   const len=Math.max(Math.abs(b.gx-a.gx),Math.abs(b.gy-a.gy));
   if(len>2000)return;
   for(let i=0;i<=len;i++){
    const gx=Math.round(a.gx+(b.gx-a.gx)*i/Math.max(1,len));
    const gy=Math.round(a.gy+(b.gy-a.gy)*i/Math.max(1,len));
    const k=gx+','+gy;
    if(tx.lastCell===k)continue;
    cellStamp(gx,gy,tx);tx.lastCell=k;
   }
  }
  function rectangleStamp(tx){
   const x0=Math.min(tx.start.gx,tx.current.gx);
   const x1=Math.max(tx.start.gx,tx.current.gx);
   const y0=Math.min(tx.start.gy,tx.current.gy);
   const y1=Math.max(tx.start.gy,tx.current.gy);
   const cells=[];
   // Keep bulk edits responsive on phones; users can paint larger terrains
   // by several consecutive selections.
   if((x1-x0+1)*(y1-y0+1)>10000){
    hint.textContent='选区过大，请缩小至 10000 个顶点以内';return;
   }
   for(let gy=y0;gy<=y1;gy++)
    for(let gx=x0;gx<=x1;gx++)cells.push({gx,gy,weight:1});
   affect(tx,cells,Number(stepControl.input.value)||8);
  }
  function finish(tx,commit=true){
   if(!tx)return;
   if(commit&&shape==='rect'&&tx.current)rectangleStamp(tx);
   if(commit){
    const entry=[];
    for(const p of tx.before.values()){
     const next=terrain.getHeight(p.gx,p.gy);
     if(next!==p.old)entry.push({gx:p.gx,gy:p.gy,before:p.old,after:next});
    }
    if(entry.length){
     undoStack.push(entry);
     if(undoStack.length>HISTORY_LIMIT)undoStack.shift();
     redoStack.length=0;
     save();
    }
   }
   stroke=null;sync();
  }
  function undo(){
   if(stroke)finish(stroke,true);
   const entry=undoStack.pop();if(!entry)return;
   for(const p of entry)terrain.setHeight(p.gx,p.gy,p.before);
   redoStack.push(entry);save();sync();
  }
  function redo(){
   if(stroke)finish(stroke,true);
   const entry=redoStack.pop();if(!entry)return;
   for(const p of entry)terrain.setHeight(p.gx,p.gy,p.after);
   undoStack.push(entry);save();sync();
  }
  undoBtn.addEventListener('click',undo);
  redoBtn.addEventListener('click',redo);
  function isPanelTarget(node){
   return node===toggle||toggle.contains(node)||panel.contains(node)||
    node?.closest?.('.pw-dot-camera-toggle,.pw-dot-chrome,.pw-transit-popup');
  }
  function down(e){
   if(!editing||!e.isPrimary||e.button!==0||e.shiftKey||e.altKey||
      e.ctrlKey||isPanelTarget(e.target))return;
   const pt=position(e);if(!pt)return;
   e.preventDefault();e.stopImmediatePropagation();
   const tx={id:e.pointerId,start:pt,current:pt,lastCell:null,before:new Map()};
   stroke=tx;hover=pt;
   if(shape!=='rect')lineStamp(pt,pt,tx);
   map.setPointerCapture?.(e.pointerId);
  }
  function move(e){
   if(!editing)return;
   if(isPanelTarget(e.target))return;
   const pt=position(e);
   if(stroke&&e.pointerId===stroke.id){
    e.preventDefault();e.stopImmediatePropagation();
    if(pt){
     if(shape!=='rect')lineStamp(stroke.current,pt,stroke);
     stroke.current=pt;hover=pt;
    }
   }else if(!stroke)hover=pt;
  }
  function up(e){
   if(!stroke||e.pointerId!==stroke.id)return;
   e.preventDefault();e.stopImmediatePropagation();
   const pt=position(e);
   if(pt){
    if(shape!=='rect')lineStamp(stroke.current,pt,stroke);
    stroke.current=pt;
   }
   const tx=stroke;finish(tx,true);
   if(map.hasPointerCapture?.(e.pointerId))map.releasePointerCapture(e.pointerId);
  }
  function cancel(e){
   if(!stroke||e.pointerId!==stroke.id)return;
   e.stopImmediatePropagation();
   // Avoid invisible edits from a canceled touch gesture.
   const tx=stroke;
   for(const p of tx.before.values())terrain.setHeight(p.gx,p.gy,p.old);
   stroke=null;sync();
  }
  function keydown(e){
   if(!editing)return;
   if(e.target.closest('input,textarea,select'))return;
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){
    e.preventDefault();e.stopImmediatePropagation();
    if(e.shiftKey)redo();else undo();return;
   }
   if(e.key==='Escape'){
    e.preventDefault();e.stopImmediatePropagation();setEditing(false);
   }
  }
  map.addEventListener('pointerdown',down,true);
  map.addEventListener('pointermove',move,true);
  map.addEventListener('pointerup',up,true);
  map.addEventListener('pointercancel',cancel,true);
  map.addEventListener('keydown',keydown,true);
  function drawOutline(points,close){
   if(points.length<2)return;
   ctx.beginPath();
   for(let i=0;i<points.length;i++){
    const p=points[i];if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);
   }
   if(close)ctx.closePath();
   ctx.lineWidth=1;ctx.strokeStyle='rgba(203,215,209,0.60)';
   ctx.fillStyle='rgba(190,206,195,0.045)';
   if(close)ctx.fill();
   ctx.stroke();
  }
  function render(now){
   if(!editing||!ctx||!map.isConnected)return;
   if(lastDraw&&now-lastDraw<32)return;
   lastDraw=now;
   const v=viewport(),width=Math.max(1,Math.round(v.w)),height=Math.max(1,Math.round(v.h));
   const dpr=Math.min(doc.defaultView?.devicePixelRatio||1,2);
   if(preview.width!==Math.round(width*dpr)||preview.height!==Math.round(height*dpr)){
    preview.width=Math.round(width*dpr);preview.height=Math.round(height*dpr);
   }
   ctx.setTransform(dpr,0,0,dpr,0,0);
   ctx.clearRect(0,0,width,height);
   const focus=stroke?.current||hover;if(!focus)return;
   const drawAt=(gx,gy)=>{
    const z=terrain.heightAt(gx,gy);
    return terrain.project(gx*cell,gy*cell,z);
   };
   if(shape==='rect'&&stroke){
    const a=stroke.start,b=stroke.current;
    const minX=Math.min(a.gx,b.gx),maxX=Math.max(a.gx,b.gx);
    const minY=Math.min(a.gy,b.gy),maxY=Math.max(a.gy,b.gy);
    const points=[];
    const steps=32;
    for(let i=0;i<=steps;i++)points.push(drawAt(minX+(maxX-minX)*i/steps,minY));
    for(let i=1;i<=steps;i++)points.push(drawAt(maxX,minY+(maxY-minY)*i/steps));
    for(let i=1;i<=steps;i++)points.push(drawAt(maxX-(maxX-minX)*i/steps,maxY));
    for(let i=1;i<steps;i++)points.push(drawAt(minX,maxY-(maxY-minY)*i/steps));
    drawOutline(points,true);
   }else if(shape==='brush'){
    const radius=Number(sizeControl.input.value)||3;
    const pts=[];
    for(let i=0;i<=48;i++){
     const angle=i*Math.PI/24;
     const gx=focus.gx+Math.cos(angle)*radius;
     const gy=focus.gy+Math.sin(angle)*radius;
     pts.push(drawAt(gx,gy));
    }
    drawOutline(pts,true);
   }else{
    const at=drawAt(focus.gx,focus.gy);
    ctx.beginPath();ctx.arc(at.x,at.y,5,0,Math.PI*2);
    ctx.lineWidth=1;ctx.strokeStyle='rgba(210,219,213,.65)';ctx.stroke();
   }
  }
  function inspect(){return {
   editing,op,shape,undo:undoStack.length,redo:redoStack.length,
   points:terrain.exportHeights().length,savedKey:STORAGE_KEY
  }}
  function dispose(){
   map.removeEventListener('pointerdown',down,true);
   map.removeEventListener('pointermove',move,true);
   map.removeEventListener('pointerup',up,true);
   map.removeEventListener('pointercancel',cancel,true);
   map.removeEventListener('keydown',keydown,true);
   preview.remove();toggle.remove();panel.remove();
  }
  sync();
  return Object.freeze({open:()=>setEditing(true),close:()=>setEditing(false),
   isEditing:()=>editing,undo,redo,render,inspect,dispose});
 }
 root.PaperWorldTerrainTools=Object.freeze({create});
})(window);
