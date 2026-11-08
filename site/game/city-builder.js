/* Paperchalk World: one genuine editable DOT-CITY MODULE SYSTEM.
 * Every official city is an assembled working example, not a flattened picture.
 * This is an authoring draft: it NEVER silently mutates story, metro, or travel.
 */
(function(root){
'use strict';
const VERSION=1,KEY='paperchalk-dot-city-builder-v1:';
const TYPES=Object.freeze({
 road:{name:'道路',group:'路网',color:'#a6b9bc',mode:'path'},
 rail:{name:'轨道',group:'路网',color:'#e46b79',mode:'path'},
 station:{name:'地铁站',group:'交通',color:'#f0d3ae',mode:'point'},
 stop:{name:'交通站牌',group:'交通',color:'#d8d8c9',mode:'point'},
 place:{name:'地点标牌',group:'地点',color:'#f0c991',mode:'point'},
 home:{name:'住宅',group:'建筑',color:'#c9d4df',mode:'point'},
 school:{name:'学校',group:'建筑',color:'#d0c2e2',mode:'point'},
 shop:{name:'商店',group:'建筑',color:'#e6d3a5',mode:'point'},
 hospital:{name:'医院',group:'建筑',color:'#c7dede',mode:'point'},
 park:{name:'绿地',group:'环境',color:'#78ae92',mode:'area'},
 water:{name:'水域',group:'环境',color:'#6aaec1',mode:'area'},
 block:{name:'街区',group:'建筑',color:'#7d9baa',mode:'area'}
});
const clone=x=>JSON.parse(JSON.stringify(x));
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const int=n=>Number.isInteger(n);
const safeText=s=>String(s??'').trim().slice(0,48);
const point=p=>Array.isArray(p)&&p.length===2&&p.every(int);
const color=c=>/^#[0-9a-fA-F]{6}$/.test(c||'');
const IDs=()=>Math.random().toString(36).slice(2,10);
const nearest=(n)=>Math.round(n);
function pathBetween(a,b){
 if(a[0]===b[0]||a[1]===b[1])return [a.slice(),b.slice()];
 // Turn at a lattice point, never synthesize a diagonal railway.
 return [a.slice(),[b[0],a[1]],b.slice()];
}
function uniquePoints(points){
 return points.filter((p,i)=>i===0||p[0]!==points[i-1][0]||p[1]!==points[i-1][1]);
}
function make(type,x,y,opts={}){
 const cfg=TYPES[type];if(!cfg)throw Error('Unknown city module '+type);
 const name=safeText(opts.label)||cfg.name;
 const m={id:safeText(opts.id)||'build-'+IDs(),type,
  x:nearest(x),y:nearest(y),label:name,
  angle:((Number(opts.angle)||0)%4+4)%4,
  color:color(opts.color)?opts.color:cfg.color,
  status:opts.status||'draft',origin:opts.origin||'user'};
 if(opts.refId)m.refId=opts.refId;
 if(opts.lineId)m.lineId=opts.lineId;
 if(opts.fromStation)m.fromStation=opts.fromStation;
 if(opts.toStation)m.toStation=opts.toStation;
 if(cfg.mode==='path'){
  m.points=uniquePoints((opts.points||[[x,y],[x+3,y]]).map(p=>[nearest(p[0]),nearest(p[1])]));
 }else if(cfg.mode==='area'){
  m.w=clamp(nearest(opts.w||4),1,30);
  m.h=clamp(nearest(opts.h||3),1,30);
 }
 return m;
}
function validate(doc){
 if(!doc||doc.version!==VERSION||!int(doc.width)||!int(doc.height)||
 doc.width<12||doc.width>160||doc.height<12||doc.height>120||
 !Array.isArray(doc.modules)||doc.modules.length>3000)
 throw Error('城市蓝图尺寸或结构不正确');
 const seen=new Set();
 for(const m of doc.modules){
  const t=TYPES[m?.type];
  if(!t||typeof m.id!=='string'||!m.id||seen.has(m.id)||
   !int(m.x)||!int(m.y)||m.x<0||m.y<0||
   m.x>doc.width||m.y>doc.height||!safeText(m.label)||
   !color(m.color)||!int(m.angle)||m.angle<0||m.angle>3)
   throw Error('无效城市组件 '+(m?.id||'?'));
  seen.add(m.id);
  if(t.mode==='path'){
   if(!Array.isArray(m.points)||m.points.length<2||m.points.length>96||
    !m.points.every(point))throw Error('无效点阵线路 '+m.id);
   for(const [x,y] of m.points)
    if(x<0||x>doc.width||y<0||y>doc.height)
     throw Error('轨道或道路越界 '+m.id);
   for(let i=1;i<m.points.length;i++){
    const a=m.points[i-1],b=m.points[i];
    if(a[0]!==b[0]&&a[1]!==b[1])
     throw Error('路线必须在格点上正交转弯 '+m.id);
   }
  }else if(t.mode==='area'){
   if(!int(m.w)||!int(m.h)||m.w<1||m.h<1||
    m.x+m.w>doc.width||m.y+m.h>doc.height)
    throw Error('街区占地越界 '+m.id);
  }
 }
 return {cityId:doc.caseId,moduleCount:seen.size,
  places:doc.modules.filter(m=>m.type==='place').length,
  stations:doc.modules.filter(m=>m.type==='station').length,
  roads:doc.modules.filter(m=>m.type==='road').length,
  rails:doc.modules.filter(m=>m.type==='rail').length};
}
function officialCases(atlas,metro,geometry){
 if(!atlas?.CITIES?.length||!metro?.STATIONS||!geometry?.routes)
  throw Error('Official atlas and metro must exist before builder');
 const list=[];
 const home=atlas.POIS.filter(p=>p.city==='kirihama'&&p.metroStationId==='entrance');
 if(home.length!==7)throw Error('Seven original home locations must be retained');
 const homeDoc={version:VERSION,caseId:'home',title:'住宅前站 · 官方示范',width:48,height:40,
  source:'official',modules:[]};
 homeDoc.modules.push(make('station',24,20,{id:'official-home-station',label:'住宅前站',
  refId:'entrance',status:'existing',origin:'official'}));
 // The only authored home neighborhood sample roads. These are EDITABLE
 // demonstration blocks, not a claim of officially surveyed street GIS.
 for(const [i,p] of [
  [[4,10],[44,10]],[[4,30],[44,30]],
  [[11,4],[11,36]],[[37,4],[37,36]],
  [[24,3],[24,37]]
 ].entries()){
  const [a,b]=p;
  homeDoc.modules.push(make('road',a[0],a[1],{id:'sample-road-'+i,
   label:'示例道路 '+(i+1),points:[a,b],origin:'example',
   status:'design'}));
 }
 homeDoc.modules.push(make('rail',24,20,{id:'official-home-rail-a',
  label:'住宅线 · 正式路段',points:[[24,20],[47,20]],lineId:'a',
  origin:'official',status:'existing',color:metro.LINES.find(l=>l.id==='a').color}));
 homeDoc.modules.push(make('rail',24,0,{id:'official-home-rail-e',
  label:'西城线 · 正式路段',points:[[24,0],[24,40]],lineId:'e',
  origin:'official',status:'existing',color:metro.LINES.find(l=>l.id==='e').color}));
 for(const poi of home){
  const s=metro.STATIONS.entrance;
  const x=clamp(24+nearest((poi.metroLocal.eastM-s.gx*900)/40),0,48),
   y=clamp(20+nearest((poi.metroLocal.southM-s.gy*900)/40),0,40);
  homeDoc.modules.push(make('place',x,y,{id:'official-home-place-'+poi.id,
   label:poi.name,refId:poi.id,status:poi.status,
   origin:'official',color:poi.status==='日常'?'#efd29b':'#aabcc3'}));
 }
 validate(homeDoc);list.push(homeDoc);
 for(const city of atlas.CITIES){
  const isMetro=city.id==='kirihama',w=isMetro?72:48,h=isMetro?52:36;
  const doc={version:VERSION,caseId:city.id,title:city.name+' · 官方城市案例',
   width:w,height:h,source:'official',modules:[]};
  const pois=atlas.POIS.filter(p=>p.city===city.id);
  if(isMetro){
   for(const [id,s] of Object.entries(metro.STATIONS))
    doc.modules.push(make('station',s.gx*2,s.gy*2,{id:'official-station-'+id,
     label:s.label,refId:id,status:'existing',origin:'official'}));
   for(const line of metro.LINES){
    const total=line.stops.length;
    for(let i=0;i<total-(line.ring?0:1);i++){
     const from=line.stops[i],to=line.stops[(i+1)%total];
     const start=metro.STATIONS[from],end=metro.STATIONS[to];
     const bend=geometry.routes[line.id+':'+from+':'+to]||[];
     const points=uniquePoints([[start.gx*2,start.gy*2],
      ...bend.map(p=>[p[0]*2,p[1]*2]),[end.gx*2,end.gy*2]]);
     const straight=[];
     for(let j=1;j<points.length;j++){
      const section=pathBetween(points[j-1],points[j]);
      straight.push(...section.slice(j===1?0:1));
     }
     doc.modules.push(make('rail',start.gx*2,start.gy*2,{
      id:'official-rail-'+line.id+'-'+i,label:line.name,
      origin:'official',status:'existing',color:line.color,
      points:uniquePoints(straight),lineId:line.id,
      fromStation:from,toStation:to}));
    }
   }
  }
  else doc.modules.push(make('stop',24,18,{id:'official-hub-'+city.id,
   label:city.name+'交通枢纽',refId:'hub-'+city.id,status:'existing',origin:'official'}));
  const indexed=new Map();
  for(const poi of pois){
   const x=isMetro?clamp(nearest(poi.metroLocal.eastM/450),0,w):
    clamp(24+nearest((poi.x-city.x)*.17),0,w);
   const y=isMetro?clamp(nearest(poi.metroLocal.southM/450),0,h):
    clamp(18+nearest((poi.y-city.y)*.17),0,h);
   // When unrelated destinations share an approximate schematic grid dot,
   // allow both separate module records rather than faking a new location.
   const same=(indexed.get(x+','+y)||0);
   indexed.set(x+','+y,same+1);
   doc.modules.push(make('place',x,y,{id:'official-place-'+poi.id,
    label:poi.name,refId:poi.id,status:poi.status,origin:'official',
    color:poi.status==='日常'?'#edce9e':'#a8c1cd'}));
  }
  validate(doc);list.push(doc);
 }
 return list;
}
function createEditor(cases,store){
 const catalog=new Map(cases.map(c=>[c.caseId,clone(c)]));
 if(catalog.size!==cases.length)throw Error('Duplicate official city case');
 const storage=store??(typeof localStorage!=='undefined'?localStorage:null);
 let doc=null,history=[],future=[],dirty=false,next=1;
 const state=()=>clone(doc);
 function replace(v,push=true){
  validate(v);
  if(push){history.push(clone(doc));if(history.length>70)history.shift();future=[]}
  doc=clone(v);dirty=true;
 }
 function choose(caseId,{original=false}={}){
  const official=catalog.get(caseId);if(!official)throw Error('Unknown official case '+caseId);
  let saved=null;
  if(!original&&storage){
   try{saved=JSON.parse(storage.getItem(KEY+caseId))}catch(_){}
  }
  if(saved){
   try{validate(saved);if(saved.caseId!==caseId)throw Error('wrong case')}
   catch(_){saved=null}
  }
  doc=clone(saved||official);history=[];future=[];dirty=false;next=1;
  return state();
 }
 function locate(id){return doc.modules.findIndex(m=>m.id===id)}
 function apply(mutate){
  const nextDoc=state(),changed=mutate(nextDoc);
  if(changed===false)return false;
  replace(nextDoc);return true;
 }
 function insert(type,x,y,options={}){
  let id;const ok=apply(d=>{
   id='placed-'+Date.now().toString(36)+'-'+(next++).toString(36);
   const m=make(type,x,y,{...options,id});
   if(m.x<0||m.y<0||m.x>d.width||m.y>d.height)return false;
   if(TYPES[type].mode==='area'){
    m.w=Math.min(m.w,d.width-m.x);m.h=Math.min(m.h,d.height-m.y);
    if(m.w<1||m.h<1)return false;
   }
   d.modules.push(m);
  });
  return ok?id:null;
 }
 function update(id,props){
  return apply(d=>{
   const m=d.modules.find(x=>x.id===id);if(!m)return false;
   const original=clone(m);
   if(props.x!==undefined)m.x=nearest(props.x);
   if(props.y!==undefined)m.y=nearest(props.y);
   if(props.label!==undefined)m.label=safeText(props.label);
   if(props.color!==undefined)m.color=props.color;
   if(props.angle!==undefined){
    m.angle=((nearest(props.angle)%4)+4)%4;
    const turns=(m.angle-original.angle+4)%4;
    if(turns&&m.points){
     // A connected official line must not silently detach from both its
     // canonical stations. Edit bends, drag stops or copy it first instead.
     if(m.fromStation||m.toStation)return false;
     m.points=m.points.map(([x,y])=>{
      let dx=x-original.x,dy=y-original.y;
      for(let i=0;i<turns;i++)[dx,dy]=[-dy,dx];
      return [original.x+dx,original.y+dy];
     });
     m.points=uniquePoints(m.points);
    }
    if(turns%2===1&&TYPES[m.type].mode==='area')
     [m.w,m.h]=[m.h,m.w];
   }
   if(props.w!==undefined)m.w=nearest(props.w);
   if(props.h!==undefined)m.h=nearest(props.h);
   if(props.points)m.points=uniquePoints(props.points.map(p=>[nearest(p[0]),nearest(p[1])]));
   // Keep rail graph station endpoints attached when moving a real station.
   if(m.type==='station'&&m.refId&&(m.x!==original.x||m.y!==original.y)){
    for(const edge of d.modules.filter(e=>e.type==='rail')){
     if(edge.fromStation===m.refId)edge.points[0]=[m.x,m.y];
     if(edge.toStation===m.refId)edge.points[edge.points.length-1]=[m.x,m.y];
     for(let i=1;i<edge.points.length;i++){
      const a=edge.points[i-1],b=edge.points[i];
      if(a[0]!==b[0]&&a[1]!==b[1])
       edge.points.splice(i,0,[b[0],a[1]]);
     }
     edge.points=uniquePoints(edge.points);
    }
   }
   return JSON.stringify(m)!==JSON.stringify(original);
  });
 }
 function translate(id,dx,dy){
  const m=doc.modules.find(x=>x.id===id);if(!m)return false;
  const sx=nearest(dx),sy=nearest(dy);
  if(!sx&&!sy)return false;
  const data={x:m.x+sx,y:m.y+sy};
  if(m.points)data.points=m.points.map(([x,y])=>[x+sx,y+sy]);
  return update(id,data);
 }
 function remove(id){return apply(d=>{
  const i=d.modules.findIndex(m=>m.id===id);if(i===-1)return false;
  d.modules.splice(i,1);
  // Removing one station does not silently delete the real rail case.
  // Broken visual endpoints remain visible until reconnected by the editor.
 })}
 function duplicate(id){
  const m=doc.modules.find(m=>m.id===id);if(!m)return null;
  const opts=clone(m);delete opts.id;delete opts.refId;delete opts.fromStation;delete opts.toStation;
  opts.origin='user';opts.status='draft';
  if(opts.points)opts.points=opts.points.map(p=>[p[0]+1,p[1]+1]);
  return insert(m.type,Math.min(doc.width,m.x+1),Math.min(doc.height,m.y+1),opts);
 }
 function addPath(type,points,opts={}){
  if(!['road','rail'].includes(type)||points.length<2)return null;
  const snapped=uniquePoints(points.flatMap((p,i)=>
   i?pathBetween(points[i-1],p).slice(1):[[p[0],p[1]]]));
  return insert(type,snapped[0][0],snapped[0][1],{...opts,points:snapped});
 }
 function undo(){if(!history.length)return false;future.push(state());doc=history.pop();dirty=true;return true}
 function redo(){if(!future.length)return false;history.push(state());doc=future.pop();dirty=true;return true}
 function reset(){const base=catalog.get(doc.caseId);replace(base);return state()}
 function save(){const data=state();validate(data);if(!storage)throw Error('当前浏览器无法保存');
  storage.setItem(KEY+doc.caseId,JSON.stringify(data));dirty=false;return true}
 function importJSON(text){
  const d=JSON.parse(text);validate(d);
  if(d.caseId!==doc.caseId)throw Error('蓝图城市与当前案例不匹配，请先切换城市');
  replace(d);return state();
 }
 function adjacency(type='road'){
  const map=new Map();
  for(const m of doc.modules.filter(m=>m.type===type)){
   const nodes=m.points||[];
   for(const p of [nodes[0],nodes[nodes.length-1]]){
    if(!p)continue;
    const k=p.join(',');
    const row=map.get(k)||new Set();row.add(m.id);map.set(k,row);
   }
  }
  return [...map.entries()].filter(([,ids])=>ids.size>=2).map(([at,ids])=>({at,ids:[...ids]}));
 }
 choose(cases[0].caseId);
 return Object.freeze({
  choose,state,insert,update,translate,remove,duplicate,addPath,undo,redo,reset,save,importJSON,
  exportJSON:()=>JSON.stringify(doc,null,2),adjacency,
  get selectedCase(){return doc.caseId},get changed(){return dirty},
  get canUndo(){return history.length>0},get canRedo(){return future.length>0},
  caseList:()=>cases.map(c=>({id:c.caseId,title:c.title,modules:c.modules.length})),
  validate:()=>validate(doc)
 });
}
root.PaperWorldCityBuilder=Object.freeze({
 TYPES,make,validate,officialCases,createEditor,pathBetween
});
})(window);
