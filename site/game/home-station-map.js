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
 const terrain=svg('g',{},'pw-home-map-blocks');
 terrain.append(svg('rect',{x:0,y:0,width:S.width,height:S.height,fill:'#13202a'}));
 terrain.append(svg('rect',{x:0,y:0,width:S.width,height:S.height,fill:'url(#pw-home-pixel-dots)'}));
 // The block layout uses consistent 11px pixel blocks and broad orthogonal
 // roads. No misleading satellite imagery or street-scale GIS claims.
 const xRoads=[125,318,550,773,982],yRoads=[104,254,365,519,656];
 for(let j=0;j<yRoads.length-1;j++){
  for(let i=0;i<xRoads.length-1;i++){
   const x1=xRoads[i]+18,x2=xRoads[i+1]-18;
   const y1=yRoads[j]+18,y2=yRoads[j+1]-17;
   if(x2<=x1||y2<=y1)continue;
   terrain.append(svg('rect',{x:x1,y:y1,width:x2-x1,height:y2-y1,
    rx:0,fill:(i+j)%3===0?'#1d2934':(i+j)%3===1?'#202b35':'#18242f',
    stroke:'#53616e','stroke-width':1,opacity:.75}));
   for(let py=y1+8;py<y2-8;py+=13){
    for(let px=x1+9;px<x2-7;px+=13){
     const r=hash(Math.round(px),Math.round(py))%17;
     if(r<3)continue;
     terrain.append(svg('rect',{x:px,y:py,width:r%4===0?5:7,height:7,
      fill:r%5===0?'#aaa5a0':r%4===0?'#6b747d':'#515e6a',
      opacity:r%3===0?.72:.46}));
    }
   }
  }
 }
 // A small pocket of urban trees; this is decorative land use, NOT an
 // invented reachable public park or a new world-map destination.
 for(const [x,y,w,h] of [[31,136,85,112],[999,58,83,171],[52,545,84,105],
  [967,557,112,97],[343,275,70,52]]){
  terrain.append(svg('rect',{x,y,width:w,height:h,
   fill:'#1d312f',stroke:'#40534b','stroke-width':1.5}));
  terrain.append(svg('rect',{x,y,width:w,height:h,
   fill:'url(#pw-home-green-dots)'}));
 }
 // Gray square pedestrian roads and lanes. They are a neighborhood design
 // sketch, not a claim that sidewalk GIS has already been surveyed.
 const street=svg('g',{},'pw-home-map-streets');
 for(const rx of xRoads){
  street.append(svg('rect',{x:rx-13,y:0,width:26,height:720,fill:'#34414a'}));
  street.append(svg('rect',{x:rx-2.1,y:0,width:4.2,height:720,fill:'#8f9692',opacity:.44}));
  for(let y=8;y<720;y+=15)street.append(svg('rect',{
   x:rx-12,y,width:4,height:7,fill:'#c5bdb2',opacity:.55}));
 }
 for(const ry of yRoads){
  street.append(svg('rect',{x:0,y:ry-13,width:1100,height:26,fill:'#34414a'}));
  street.append(svg('rect',{x:0,y:ry-2.1,width:1100,height:4.2,fill:'#949c9a',opacity:.42}));
  for(let x=8;x<1100;x+=15)street.append(svg('rect',{
   x,y:ry+6,width:7,height:4,fill:'#c0bdb5',opacity:.52}));
 }
 terrain.append(street);
 // The 住宅前 station is actually shared by A and E. The schematic
 // displays these TWO real services and never invents a third one.
 const rail=svg('g',{},'pw-home-local-rail');
 const lineA=metro.LINES.find(l=>l.id==='a'&&l.stops.includes('entrance'));
 const lineE=metro.LINES.find(l=>l.id==='e'&&l.stops.includes('entrance'));
 if(!lineA||!lineE)throw Error('住宅前 is no longer on both real lines');
 const aPath=svg('rect',{x:0,y:353,width:1100,height:24,fill:'#101a25'});
 const ePath=svg('rect',{x:538,y:0,width:24,height:720,fill:'#101a25'});
 rail.append(aPath,ePath);
 for(let x=8;x<1100;x+=17)rail.append(svg('rect',{
  x,y:360,width:11,height:11,fill:lineA.color,stroke:'#f5ded8','stroke-width':.55}));
 for(let y=8;y<720;y+=17)rail.append(svg('rect',{
  x:543,y,width:11,height:11,fill:lineE.color,stroke:'#eadff1','stroke-width':.5}));
 const hub=svg('g',{},'pw-home-station-symbol');
 hub.append(svg('rect',{x:S.stationX-22,y:S.stationY-22,
  width:44,height:44,rx:1,fill:'#fff0d3',stroke:'#1b2530','stroke-width':6}));
 hub.append(svg('rect',{x:S.stationX-12,y:S.stationY-12,
  width:24,height:24,fill:'#192833',stroke:'#e76f70','stroke-width':3}));
 hub.append(svg('path',{d:'M550 335 V302 H579',fill:'none',
  stroke:'#f6dfca','stroke-width':3}));
 const hubTag=svg('g',{'data-role':'station-label'},'pw-home-station-callout');
 hubTag.append(svg('rect',{x:576,y:281,width:157,height:44,rx:1,
  fill:'#e5d9c2',stroke:'#17222c','stroke-width':3}));
 hubTag.append(svg('rect',{x:580,y:285,width:149,height:36,rx:0,fill:'#a34347'}));
 const tagText=svg('text',{x:591,y:309,fill:'#fff5e6','font-size':20,'font-weight':750});
 tagText.textContent='住宅前站';
 hubTag.append(tagText);
 hub.append(hubTag);rail.append(hub);
 const arrows=svg('g',{},'pw-home-map-line-labels');
 for(const [x,y,text,color] of [
  [20,346,'住宅线 · 住宅前始发',lineA.color],
  [852,346,'住宅线 · 至学园前 →',lineA.color],
  [567,61,'西城线',lineE.color]
 ]){
  const t=svg('text',{x,y,fill:color,'font-size':14,'font-weight':650,
   'paint-order':'stroke',stroke:'#13212b','stroke-width':3});
  t.textContent=text;arrows.append(t);
 }
 // The rail arrow labels are schematic, no fabricated platform or exits.
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
 stage.append(vector,legend,legendInfo,mapActions);
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
