/* Paperchalk subway dot-lattice BLUEPRINT editor.
 * Data is independent of the immutable operating metro graph until the
 * blueprint is published as approved game route data. No raster map.
 * Every station/waypoint is an integer intersection; every edge is a real
 * ordered connection; all changes support undo/redo and JSON round trip.
 */
(function(global){
'use strict';
const KEY='paperchalk-kirihama-dot-metro-blueprint-v1';
const LIVE_KEY='paperchalk-kirihama-dot-metro-live-v1';
const clone=x=>JSON.parse(JSON.stringify(x));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const key=(lineId,from,to)=>lineId+':'+from+':'+to;
const finitePoint=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isInteger);
function segments(line){
 const pairs=[];
 for(let i=1;i<line.stops.length;i++)pairs.push([line.stops[i-1],line.stops[i]]);
 if(line.ring&&line.stops.length>2)pairs.push([line.stops.at(-1),line.stops[0]]);
 return pairs;
}
function defaults(metro,geometry){
 return {
  version:1,cityId:'kirihama',nextStationNumber:1,
  stations:Object.fromEntries(Object.entries(metro.STATIONS).map(([id,s])=>
   [id,{id,label:s.label,gx:s.gx,gy:s.gy,
    original:metro.ACTIVE_BLUEPRINT?.stations?.[id]?.original!==false}])),
  lines:metro.LINES.map(l=>({id:l.id,name:l.name,color:l.color,
   ring:!!l.ring,stops:l.stops.slice()})),
  bends:Object.fromEntries(Object.entries(geometry.routes).map(([id,points])=>
   [id,points.map(p=>p.slice())]))
 };
}
function validate(plan,metro){
 if(!plan||plan.version!==1||plan.cityId!=='kirihama'||
  !plan.stations||typeof plan.stations!=='object'||!Array.isArray(plan.lines)||
  !plan.bends||typeof plan.bends!=='object')
  throw Error('不支持的城市地铁蓝图格式');
 if(plan.lines.length!==metro.LINES.length)throw Error('不允许删除已登记的十条地铁线路');
 const ids=new Set(),coords=new Map(),served=new Set(),edgeKeys=new Set();
 const columns=metro.GRID.columns,rows=metro.GRID.rows;
 for(const [id,s] of Object.entries(plan.stations)){
  if(!s||s.id!==id||typeof s.label!=='string'||!s.label.trim()||
    s.label.length>36||!Number.isInteger(s.gx)||!Number.isInteger(s.gy)||
    s.gx<0||s.gx>columns||s.gy<0||s.gy>rows)
   throw Error('站点位置或名称无效：'+id);
  const c=s.gx+','+s.gy;
  if(coords.has(c))throw Error('两个车站占用同一格点：'+coords.get(c)+' / '+id);
  coords.set(c,id);ids.add(id);
 }
 for(const id of Object.keys(metro.STATIONS))
  if(!ids.has(id))throw Error('原有站点不能丢失：'+id);
 // A former 170-stop saved draft is NOT allowed to silently resurrect
 // hundreds of removed real stations in the new 70-stop city graph.
 for(const [id,stop] of Object.entries(plan.stations)){
  if(!metro.STATIONS[id]&&(!id.startsWith('kh-custom-')||stop.original!==false))
   throw Error('旧版蓝图站点不兼容新版精简线路：'+id);
 }
 for(const line of plan.lines){
  const original=metro.LINES.find(l=>l.id===line.id);
  if(!original||original.name!==line.name||original.color!==line.color||
    !!original.ring!==!!line.ring||
    !Array.isArray(line.stops)||line.stops.length<2)
   throw Error('地铁线路定义损坏：'+(line?.id||'unknown'));
  const unique=new Set(line.stops);
  if(unique.size!==line.stops.length)throw Error('同一条线路上重复设置车站：'+line.name);
  for(const stop of line.stops){
   if(!ids.has(stop))throw Error('线路指向不存在的车站：'+stop);
   served.add(stop);
  }
  for(const [from,to] of segments(line))edgeKeys.add(key(line.id,from,to));
 }
 if(served.size!==ids.size)throw Error('存在孤立站点，必须先接入一条线路');
 for(const [edge,points] of Object.entries(plan.bends)){
  if(!edgeKeys.has(edge))continue; // stale segments are safe to prune on save
  if(!Array.isArray(points)||points.length>48)
   throw Error('一段线路的控制点过多：'+edge);
  for(const p of points)
   if(!finitePoint(p)||p[0]<0||p[0]>columns||p[1]<0||p[1]>rows)
    throw Error('圆角路径控制点必须落在点阵格点上：'+edge);
 }
 return {stations:ids.size,lines:plan.lines.length,
  interchanges:Object.values(plan.stations).filter(s=>
   plan.lines.filter(l=>l.stops.includes(s.id)).length>1).length,
  segments:plan.lines.reduce((n,l)=>n+segments(l).length,0),
  bends:Object.values(plan.bends).reduce((n,p)=>n+(p?.length||0),0)};
}
function orthogonalPoints(plan,lineId,from,to){
 const a=plan.stations[from],b=plan.stations[to];
 if(!a||!b)return [];
 const anchors=[[a.gx,a.gy],...(plan.bends[key(lineId,from,to)]||[]),[b.gx,b.gy]];
 const result=[anchors[0]];
 for(let i=1;i<anchors.length;i++){
  const prev=result.at(-1),curr=anchors[i];
  if(prev[0]!==curr[0]&&prev[1]!==curr[1])
   result.push([curr[0],prev[1]]);
  if(prev[0]!==curr[0]||prev[1]!==curr[1])result.push(curr.slice());
 }
 // Erase zero-length points and all unneeded collinear midpoints.
 const clean=[];
 for(const p of result){
  if(clean.length&&p[0]===clean.at(-1)[0]&&p[1]===clean.at(-1)[1])continue;
  while(clean.length>=2){
   const a=clean.at(-2),b=clean.at(-1);
   if((a[0]===b[0]&&b[0]===p[0])||
      (a[1]===b[1]&&b[1]===p[1]))clean.pop();
   else break;
  }
  clean.push(p);
 }
 return clean;
}
function create(metro,geometry,storage){
 if(!metro||!geometry)throw Error('地铁规划编辑器需要实际线路数据');
 let store=storage;
 if(store===undefined){try{store=global.localStorage}catch(_){store=null}}
 let plan=defaults(metro,geometry),saved=JSON.stringify(defaults(metro,geometry)),undoStack=[],redoStack=[];
 const load=()=>{
  try{
   const raw=store?.getItem(KEY);
   if(!raw)return;
   const p=JSON.parse(raw);validate(p,metro);plan=p;saved=raw;
  }catch(err){
   // Do not destroy anyone's 170-stop draft when the playable network
   // becomes 70 stops. Archive the exact old JSON before next save.
   try{
    const old=store?.getItem(KEY),backup=KEY+'-legacy-backup';
    if(old&&!store.getItem(backup))store.setItem(backup,old);
   }catch(_){}
   plan=defaults(metro,geometry);saved=JSON.stringify(plan);
  }
 };
 const serialize=()=>JSON.stringify(plan);
 const remember=(before=serialize())=>{
  if(before===serialize())return false;
  undoStack.push(before);
  if(undoStack.length>80)undoStack.shift();
  redoStack=[];
  return true;
 };
 const mutate=fn=>{
  const before=serialize();
  fn();validate(plan,metro);remember(before);
  return true;
 };
 const getLine=id=>plan.lines.find(l=>l.id===id);
 const getStation=id=>plan.stations[id]||null;
 const edges=()=>plan.lines.flatMap(l=>segments(l).map(([from,to])=>
  ({lineId:l.id,from,to,key:key(l.id,from,to),name:l.name,color:l.color})));
 const edgeFor=k=>edges().find(e=>e.key===k);
 const coordsOK=(x,y,except)=>{
  if(!Number.isInteger(x)||!Number.isInteger(y)||
    x<0||x>metro.GRID.columns||y<0||y>metro.GRID.rows)return false;
  return !Object.values(plan.stations).some(s=>
   s.id!==except&&s.gx===x&&s.gy===y);
 };
 const api={
  storageKey:KEY,cityId:'kirihama',
  data:()=>clone(plan),serialize,getLine,getStation,edges,edgeFor,
  info:()=>validate(plan,metro),
  points:(edge)=>orthogonalPoints(plan,edge.lineId,edge.from,edge.to),
  bends:(edge)=>clone(plan.bends[edge.key]||[]),
  changed:()=>serialize()!==saved,
  canUndo:()=>undoStack.length>0,
  canRedo:()=>redoStack.length>0,
  moveStation(id,gx,gy,record=true){
   const s=getStation(id);
   if(!s||!coordsOK(gx,gy,id))return false;
   if(s.gx===gx&&s.gy===gy)return false;
   const before=serialize();
   s.gx=gx;s.gy=gy;
   if(record)remember(before);
   return true;
  },
  remember,
  insertBend(edge,gx,gy){
   if(!edgeFor(edge.key)||!Number.isInteger(gx)||!Number.isInteger(gy)||
     gx<0||gx>metro.GRID.columns||gy<0||gy>metro.GRID.rows)return false;
   return mutate(()=>{
    const v=plan.bends[edge.key]||(plan.bends[edge.key]=[]);
    // Insert nearest to the clicked section, keeping the author's point order.
    const anchors=[[getStation(edge.from).gx,getStation(edge.from).gy],
     ...v,[getStation(edge.to).gx,getStation(edge.to).gy]];
    let best=0,dist=Infinity;
    for(let i=0;i<anchors.length-1;i++){
     const a=anchors[i],b=anchors[i+1],dx=b[0]-a[0],dy=b[1]-a[1];
     const t=dx*dx+dy*dy>0?clamp(((gx-a[0])*dx+(gy-a[1])*dy)/(dx*dx+dy*dy),0,1):0;
     const d=(gx-a[0]-dx*t)**2+(gy-a[1]-dy*t)**2;
     if(d<dist){dist=d;best=i}
    }
    v.splice(best,0,[gx,gy]);
   });
  },
  moveBend(edge,index,gx,gy,record=true){
   const bends=plan.bends[edge.key];
   if(!edgeFor(edge.key)||!bends?.[index]||
      !Number.isInteger(gx)||!Number.isInteger(gy)||
      gx<0||gx>metro.GRID.columns||gy<0||gy>metro.GRID.rows)return false;
   if(bends[index][0]===gx&&bends[index][1]===gy)return false;
   const before=serialize();bends[index]=[gx,gy];
   if(record)remember(before);return true;
  },
  deleteBend(edge,index){
   if(!edgeFor(edge.key)||!plan.bends[edge.key]?.[index])return false;
   return mutate(()=>plan.bends[edge.key].splice(index,1));
  },
  clearBends(edge){
   if(!edgeFor(edge.key))return false;
   return mutate(()=>{plan.bends[edge.key]=[]});
  },
  addStation(edge,gx,gy){
   if(!edgeFor(edge.key)||!coordsOK(gx,gy))return null;
   let newId='';
   mutate(()=>{
    newId='kh-custom-'+String(plan.nextStationNumber++).padStart(3,'0');
    while(plan.stations[newId])
     newId='kh-custom-'+String(plan.nextStationNumber++).padStart(3,'0');
    const name='新站'+String(plan.nextStationNumber-1).padStart(2,'0');
    plan.stations[newId]={id:newId,label:name,gx,gy,original:false};
    const line=getLine(edge.lineId),index=line.stops.indexOf(edge.from);
    if(index<0)throw Error('无法确定新站在本线的先后顺序');
    line.stops.splice(index+1,0,newId);
    delete plan.bends[edge.key]; // re-route both real physical edges
   });
   return newId;
  },
  renameStation(id,label){
   const s=getStation(id),text=String(label||'').trim();
   if(!s||!text||text.length>36)return false;
   return mutate(()=>{s.label=text});
  },
  removeCustomStation(id){
   const s=getStation(id);
   if(!s||s.original)return false;
   return mutate(()=>{
    for(const line of plan.lines){
     const i=line.stops.indexOf(id);
     if(i>=0){
      line.stops.splice(i,1);
      for(const k of Object.keys(plan.bends))
       if(k.startsWith(line.id+':')&&k.split(':').includes(id))delete plan.bends[k];
     }
    }
    delete plan.stations[id];
   });
  },
  undo(){
   if(!undoStack.length)return false;
   redoStack.push(serialize());
   plan=JSON.parse(undoStack.pop());return true;
  },
  redo(){
   if(!redoStack.length)return false;
   undoStack.push(serialize());
   plan=JSON.parse(redoStack.pop());return true;
  },
  save(){
   validate(plan,metro);
   const raw=serialize();
   if(!store)throw Error('浏览器不允许本地保存，请导出 JSON');
   store.setItem(KEY,raw);
   saved=raw;return true;
  },
  apply(){
   validate(plan,metro);
   if(!store)throw Error('浏览器不允许保存正式地铁，请导出 JSON');
   const raw=serialize();
   // Keep draft and live separate. A failed live write must never claim
   // that the playable network was successfully updated.
   store.setItem(LIVE_KEY,raw);
   store.setItem(KEY,raw);
   saved=raw;return true;
  },
  reset(){
   const before=serialize();
   plan=defaults(metro,geometry);
   remember(before);return true;
  },
  importJSON(json){
   const candidate=JSON.parse(json);
   validate(candidate,metro);
   const before=serialize();plan=clone(candidate);remember(before);return true;
  },
  exportJSON:()=>JSON.stringify(plan,null,2)+'\n'
 };
 load();
 return Object.freeze(api);
}
global.PaperWorldMetroMapEditor=Object.freeze({
 KEY,LIVE_KEY,create,validate,segments,key,orthogonalPoints
});
})(window);
