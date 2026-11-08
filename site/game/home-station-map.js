/* Paperchalk World — HOME STATION's one local dot-matrix neighborhood.
 * First navigation tier; not a metro station graph, not a full-city map.
 * Only the seven existing masterplan locations actually linked to 住宅前.
 * Square block dots, square streets, two real rail-line crossings, and
 * small anchored location callouts — no arbitrary city POI expansion.
 */
(function(root){
'use strict';
const NS='http://www.w3.org/2000/svg';
const S={width:1100,height:720,stationX:550,stationY:365,pixelsPerMetre:1};
const div=(tag,cls,value)=>{
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(value!==undefined)n.textContent=String(value);
 return n;
};
const svg=(tag,attributes={},cls)=>{
 const n=document.createElementNS(NS,tag);
 if(cls)n.setAttribute('class',cls);
 for(const [k,v] of Object.entries(attributes))n.setAttribute(k,String(v));
 return n;
};
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const hash=(a,b)=>(Math.imul(a+73,1664525)^Math.imul(b+101,1013904223))>>>0;
function create({map,atlas,metro,onTravel,notify,onUp}){
 const station=metro?.STATIONS?.entrance;
 const locations=(atlas?.POIS||[]).filter(p=>p.city==='kirihama'&&
  p.metroStationId==='entrance'&&p.metroLocal);
 if(!station||locations.length!==7)throw Error('Home station requires its 7 authored nearby places');
 const rootNode=div('section','pw-home-neighborhood-map');
 rootNode.setAttribute('aria-label','住宅前站 · 站点地区地图');
 rootNode.hidden=true;
 const panel=div('aside','pw-home-neighborhood-aside');
 const nameplate=div('div','pw-home-neighborhood-nameplate');
 nameplate.append(div('span','pw-home-neighborhood-kicker','霧浜市 / 西南住宅区'),
  div('strong','pw-home-neighborhood-station','住宅前站'),
  div('small','pw-home-neighborhood-station-sub','住宅线 × 西城线 · 换乘站'));
 const code=div('div','pw-home-neighborhood-code','STATION / HOME');
 nameplate.append(code);
 const intro=div('div','pw-home-neighborhood-intro');
 intro.append(div('span','pw-home-neighborhood-section-title','站点地区 / 生活圈'),
  div('p','', '以住宅前站为中心，查看附近住宅街和日常地点。地图中的每个地点都有独立入口坐标。'));
 const list=div('div','pw-home-neighborhood-list');
 list.setAttribute('aria-label','住宅前站附近的7个地点');
 const details=div('section','pw-home-neighborhood-details');
 details.setAttribute('aria-live','polite');
 const action=div('button','pw-home-neighborhood-travel','前往家');
 action.type='button';
 const detailsHead=div('strong','pw-home-neighborhood-selected-name');
 const detailsMeta=div('p','pw-home-neighborhood-selected-meta');
 const detailsStatus=div('span','pw-home-neighborhood-status');
 details.append(detailsHead,detailsMeta,detailsStatus,action);
 const note=div('p','pw-home-neighborhood-note','街区与道路为规划示意；站点、地点、方位与距离对应现有交通数据。');
 panel.append(nameplate,intro,list,details,note);
 const right=div('div','pw-home-neighborhood-right');
 const mast=div('div','pw-home-neighborhood-maphead');
 const crumb=div('div','pw-home-neighborhood-crumb');
 crumb.append(div('b','', '01  /  站点地区地图'),
  div('span','', '住宅前 · HOME DISTRICT'));
 const upper=div('button','pw-home-neighborhood-up','↑ 市区地铁图');
 upper.type='button';upper.setAttribute('aria-label','上一层：霧浜市地铁图');
 upper.addEventListener('click',()=>onUp?.());
 mast.append(crumb,upper);
 const stage=div('div','pw-home-neighborhood-stage');
 const vector=svg('svg',{
  viewBox:'0 0 '+S.width+' '+S.height,
  preserveAspectRatio:'xMidYMid meet',
  role:'img','aria-label':'住宅前站周边方正点阵街区地图，七个地点可点击'
 },'pw-home-neighborhood-svg');
 vector.style.touchAction='none';
 const defs=svg('defs');
 const dots=svg('pattern',{id:'pw-home-pixel-dots',x:0,y:0,width:14,height:14,patternUnits:'userSpaceOnUse'});
 dots.append(svg('rect',{x:1,y:1,width:2.4,height:2.4,fill:'#59626c',opacity:.44}));
 const greens=svg('pattern',{id:'pw-home-green-dots',x:0,y:0,width:12,height:12,patternUnits:'userSpaceOnUse'});
 greens.append(svg('rect',{x:1,y:1,width:5,height:5,fill:'#617b61',opacity:.62}));
 defs.append(dots,greens);vector.append(defs);
 // The original subway is a clean BLACK/BLUE DOT-LATTICE, not a pixel
 // street diorama. Every drawn road, block contour and track is composed
 // from real, separated dots. No faux 7px buildings / broad paved roads.
 const terrain=svg('g',{},'pw-home-map-dots');
 terrain.append(svg('rect',{x:0,y:0,width:S.width,height:S.height,fill:'#101b27'}));
 terrain.append(svg('rect',{x:0,y:0,width:S.width,height:S.height,
  fill:'url(#pw-home-pixel-dots)',opacity:.82}));
 function dottedPath(parent,points,{step=13,radius=1.9,fill='#a7bac4',opacity=.6}={}){
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i];
   const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
   const n=Math.max(1,Math.floor(length/step));
   for(let j=0;j<=n;j++){
    const t=j/n,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;
    parent.append(svg('circle',{cx:x,cy:y,r:radius,fill,opacity}));
   }
  }
 }
 // Sparse orthogonal traces are ONLY visual neighborhood context, not
 // fake GIS road claims. Distinct dots, dark voids and wide breathing room.
 const blocks=svg('g',{},'pw-home-block-traces');
 const avenues=[86,257,423,738,945,1054];
 const cross=[95,220,504,650];
 for(const xx of avenues)
  dottedPath(blocks,[[xx,42],[xx,690]],{step:15,radius:1.7,
   fill:'#849ba7',opacity:.44});
 for(const yy of cross)
  dottedPath(blocks,[[28,yy],[1070,yy]],{step:15,radius:1.7,
   fill:'#849ba7',opacity:.44});
 // Secondary paths stop inside blocks: they are not fake extra metro lines.
 for(const coords of [
  [[86,220],[257,220],[257,365]],
  [[257,504],[423,504],[423,650]],
  [[738,95],[738,220],[945,220]],
  [[738,504],[945,504],[945,650]],
  [[423,95],[423,220]],
  [[257,650],[423,650]],
  [[945,95],[1054,95]]
 ])dottedPath(blocks,coords,{step:13,radius:2.15,
  fill:'#c5cfd2',opacity:.74});
 terrain.append(blocks);
 // Authored metro topology only: "住宅线" terminates at home and runs east;
 // "西城线" goes north/south. Both use actual registered service colors.
 const rail=svg('g',{},'pw-home-local-rail');
 const lineA=metro.LINES.find(l=>l.id==='a'&&l.stops.includes('entrance'));
 const lineE=metro.LINES.find(l=>l.id==='e'&&l.stops.includes('entrance'));
 if(!lineA||!lineE)throw Error('住宅前 station line identity changed');
 dottedPath(rail,[[550,365],[1090,365]],{step:12,radius:3.6,fill:lineA.color,opacity:.97});
 dottedPath(rail,[[550,15],[550,705]],{step:12,radius:3.6,fill:lineE.color,opacity:.93});
 const hub=svg('g',{},'pw-home-station-symbol');
 hub.append(svg('circle',{cx:550,cy:365,r:21,fill:'#101b27',
  stroke:'#e5ddd0','stroke-width':2.4}));
 hub.append(svg('circle',{cx:550,cy:365,r:14.5,fill:'#1b2a34',
  stroke:lineA.color,'stroke-width':3.5}));
 hub.append(svg('circle',{cx:550,cy:365,r:5.2,fill:'#e5ddd0'}));
 const hubTag=svg('g',{'data-role':'station-label'},'pw-home-station-callout');
 dottedPath(hubTag,[[564,351],[581,325]],{step:6,radius:1.5,
  fill:'#e9e7dc',opacity:.86});
 const tagText=svg('text',{x:589,y:319,fill:'#eaeae0','font-size':19,
  'font-weight':700,'paint-order':'stroke',stroke:'#101b27',
  'stroke-width':3});
 tagText.textContent='住宅前站';
 hubTag.append(tagText);hub.append(hubTag);rail.append(hub);
 const arrows=svg('g',{},'pw-home-map-line-labels');
 for(const [x,y,label,color] of [
  [745,344,'住宅线  →  学园前',lineA.color],
  [575,65,'西城线',lineE.color]
 ]){
  const t=svg('text',{x,y,fill:color,'font-size':14,'font-weight':600,
   'paint-order':'stroke',stroke:'#101b27','stroke-width':3});
  t.textContent=label;arrows.append(t);
 }
 vector.append(terrain,rail,arrows);
 const locationLayer=svg('g',{},'pw-home-nearby-markers');
 const labels={
  entrance:{x:780,y:444,w:198},
  'khp-residential-02':{x:617,y:60,w:172},
  'khp-residential-03':{x:117,y:546,w:201},
  'khp-residential-04':{x:795,y:117,w:200},
  'khp-residential-06':{x:107,y:184,w:184},
  'khp-residential-08':{x:774,y:601,w:185},
  'khp-residential-09':{x:150,y:49,w:170}
 };
 const markers=new Map(),buttons=new Map();
 let selected='entrance';
 for(const p of locations){
  const ox=p.metroLocal.eastM-station.gx*900;
  const oy=p.metroLocal.southM-station.gy*900;
  const pt={x:S.stationX+ox*S.pixelsPerMetre,
   y:S.stationY+oy*S.pixelsPerMetre};
  const box=labels[p.id];
  if(!box)throw Error('Unreviewed local pin layout '+p.id);
  const g=svg('g',{tabindex:0,role:'button','aria-label':
   p.name+(p.status==='日常'?'（可进入）':'（规划中）'),
   'data-place':p.id,'data-selected':'false'},'pw-home-place-marker');
  const attachment={x:clamp(pt.x,box.x+8,box.x+box.w-8),
   y:pt.y<box.y?box.y:pt.y>box.y+47?box.y+47:box.y+24};
  // Orthogonal short dotted tail FROM the illustrated location plate
  // TO the author's real building doorway. Every tail terminates on a pin.
  const bendY=attachment.y+(pt.y-attachment.y)*.57;
  g.append(svg('path',{d:'M'+attachment.x+' '+attachment.y+' V'+bendY+
   ' H'+pt.x+' V'+pt.y,fill:'none'},'pw-home-place-leader'));
  const card=svg('g',{},'pw-home-place-card');
  const polygon=svg('path',{d:'M'+(box.x+7)+' '+box.y+' H'+(box.x+box.w)+
   ' V'+(box.y+40)+' H'+box.x+' V'+(box.y+7)+' Z'});
  card.append(polygon);
  card.append(svg('rect',{x:box.x+9,y:box.y+9,width:27,height:22,
   fill:p.status==='日常'?'#c64e52':'#48565c'}));
  const glyph=svg('text',{x:box.x+22.5,y:box.y+25.5,
   fill:'#fff0d7','font-size':14,'text-anchor':'middle'});
  glyph.textContent=p.status==='日常'?'家':'·';card.append(glyph);
  const title=svg('text',{x:box.x+44,y:box.y+26,'font-size':16,
   fill:'#f6ead8','font-weight':700});
  title.textContent=p.name;card.append(title);
  g.append(card);
  g.append(svg('rect',{x:pt.x-6,y:pt.y-6,width:12,height:12,rx:0,
   fill:p.status==='日常'?'#e6a069':'#f0dfbd',stroke:'#18242b',
   'stroke-width':2}));
  locationLayer.append(g);
  const button=div('button','pw-home-neighborhood-list-item');
  button.type='button';button.dataset.place=p.id;
  button.append(div('strong','',p.name),
   div('small','',p.status==='日常'?'可进入 · 家':'规划 · 站点附近'));
  list.append(button);buttons.set(p.id,button);
  const choose=()=>setSelected(p.id);
  button.addEventListener('click',choose);
  g.addEventListener('click',ev=>{ev.stopPropagation();choose()});
  g.addEventListener('keydown',ev=>{
   if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();choose()}
  });
  markers.set(p.id,{node:g,point:pt,poi:p});
 }
 vector.append(locationLayer);
 const legend=div('div','pw-home-neighborhood-legend');
 legend.append(div('span','pw-home-neighborhood-key home-key','■ 家（可进入）'),
  div('span','pw-home-neighborhood-key','□ 规划地点'),
  div('span','pw-home-neighborhood-key','— 住宅线 / 西城线'));
 const legendInfo=div('div','pw-home-neighborhood-scale','N ↑  ·  方正点阵  ·  约 700m 生活圈');
 const mapActions=div('div','pw-home-neighborhood-zoom');
 for(const [id,label,fn] of [
  ['zoom-out','−',()=>zoom(1.23)],
  ['zoom-in','+',()=>zoom(.81)],
  ['reset','⌖',()=>resetView()]
 ]){
  const b=div('button','',label);
  b.type='button';b.dataset.action=id;
  b.setAttribute('aria-label',id==='zoom-in'?'放大站点地区':
   id==='zoom-out'?'缩小站点地区':'重置站点地区视角');
  b.addEventListener('click',fn);mapActions.append(b);
 }
 stage.append(vector,legend,legendInfo,mapActions,details);
 right.append(mast,stage);
 rootNode.append(panel,right);map.append(rootNode);
 const view={x:0,y:0,w:1100,h:720};
 function applyView(){
  vector.setAttribute('viewBox',[view.x,view.y,view.w,view.h].join(' '));
 }
 function resetView(){Object.assign(view,{x:0,y:0,w:1100,h:720});applyView()}
 function zoom(f,cx=view.x+view.w/2,cy=view.y+view.h/2){
  const nw=clamp(view.w*f,450,1100),nh=nw*S.height/S.width;
  view.x=clamp(cx-(cx-view.x)*nw/view.w,-45,S.width-nw+45);
  view.y=clamp(cy-(cy-view.y)*nh/view.h,-35,S.height-nh+35);
  view.w=nw;view.h=nh;applyView();
 }
 function setSelected(id){
  const m=markers.get(id);if(!m)return;
  selected=id;
  for(const [key,r] of markers)r.node.dataset.selected=String(key===id);
  for(const [key,b] of buttons)b.dataset.selected=String(key===id);
  detailsHead.textContent=m.poi.name;
  const kind=m.poi.status==='日常'?'已开放':'尚未开放';
  detailsMeta.textContent='住宅前站 · 步行约'+m.poi.walkingEstimateM+'米（规划估算）';
  detailsStatus.textContent=kind;
  action.hidden=m.poi.status!=='日常';
  rootNode.dataset.selectedPlace=id;
 }
 action.addEventListener('click',async()=>{
  const m=markers.get(selected);
  if(!m||m.poi.status!=='日常')return;
  try{
   const result=await onTravel?.(m.poi.id,null);
   if(!result?.ok)notify?.(result?.reason||'暂时无法前往');
  }catch(e){notify?.('地点当前无法进入')}
 });
 let pan=null;
 vector.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('.pw-home-place-marker'))return;
  pan={id:e.pointerId,x:e.clientX,y:e.clientY,
   ox:view.x,oy:view.y,w:view.w,h:view.h};
  vector.setPointerCapture?.(e.pointerId);
 });
 vector.addEventListener('pointermove',e=>{
  if(!pan||pan.id!==e.pointerId)return;
  const r=vector.getBoundingClientRect();
  view.x=clamp(pan.ox-(e.clientX-pan.x)*pan.w/r.width,-45,S.width-view.w+45);
  view.y=clamp(pan.oy-(e.clientY-pan.y)*pan.h/r.height,-35,S.height-view.h+35);
  applyView();
 });
 const end=e=>{if(pan?.id===e.pointerId)pan=null};
 vector.addEventListener('pointerup',end);
 vector.addEventListener('pointercancel',end);
 stage.addEventListener('wheel',e=>{
  e.preventDefault();e.stopPropagation();
  const rect=vector.getBoundingClientRect();
  const sx=clamp((e.clientX-rect.left)/rect.width,0,1);
  const sy=clamp((e.clientY-rect.top)/rect.height,0,1);
  zoom(e.deltaY>0?1.13:.87,view.x+view.w*sx,view.y+view.h*sy);
 },{passive:false});
 function show(){
  rootNode.hidden=false;rootNode.dataset.level='station';
  setSelected('entrance');resetView();
 }
 function hide(){rootNode.hidden=true;pan=null}
 setSelected('entrance');
 return Object.freeze({show,hide,
  get visible(){return !rootNode.hidden},
  count:()=>markers.size,
  select:setSelected,
  reset:resetView
 });
}
root.PaperWorldHomeStationMap=Object.freeze({create});
})(window);
