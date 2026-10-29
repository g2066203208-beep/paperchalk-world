/**
 * National map *scene*, separate from terrain rules, travel state and streets.
 * Canvas draws only the current camera viewport; the small 13x9 tile inspector
 * remains for accessible keyboard navigation and short on-foot travel.
 */
import {WORLD_WIDTH,WORLD_HEIGHT,terrainAt,regionAt,REGIONS,LINKS,atlasViewport} from '../../world/national-atlas.js';
import {DISTRICTS,SETTLEMENTS,settlementsInBounds,transportInBounds,describeMapLocation} from '../../world/country-detail.js';
import {escapeText as e} from '../core/scene-html.js';
export const TERRAIN_COLORS={sea:'#3d7187',river:'#5595a8',mountain:'#8d8779',forest:'#557763',fields:'#b6ae78',lake:'#6593a4',urban:'#af9883',grass:'#8f9d7a'};
export const ZOOM_STEPS=[1,2,4,8,16,32];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const colorJitter=(value,x,y)=>{const h=((Math.imul(x+3,1315423911)^Math.imul(y+7,2654435761))>>>0)%13-6;return h/100;};
const theme={
 sea:['#38677e','#477b8e'],river:['#518da1','#71a4ac'],
 mountain:['#928c79','#b4a08b'],forest:['#4d705b','#618368'],
 fields:['#b5af7e','#c4b482'],lake:['#6697a5','#78aab3'],
 urban:['#b7a18e','#c6aa94'],grass:['#91a183','#a5b08a']
};
function sampleFill(t,x,y){
 const pair=theme[t.terrain]||theme.grass;
 return (((x*19+y*17)^x*y)%7<3)?pair[0]:pair[1];
}
export function renderNationalMap({x,y,tileNames}){
 const tiles=atlasViewport(x,y,13,9);
 return '<div class="country-atlas" data-country-atlas="1">'+
  '<div class="country-toolbar"><div><strong>国家地形总览</strong><small>拖动地图 · 滚轮缩放 · 点击城镇查看</small></div>'+
   '<div class="country-zoom-buttons">'+
    '<button data-map-action="overview" title="查看全国" aria-label="查看全国">全国</button>'+
    '<button data-map-action="home" title="定位到玩家" aria-label="定位玩家">定位</button>'+
    '<button data-map-action="minus" title="缩小" aria-label="地图缩小">−</button>'+
    '<button data-map-action="plus" title="放大" aria-label="地图放大">+</button>'+
   '</div></div>'+
  '<div class="country-canvas-frame"><canvas class="country-map-canvas" width="960" height="600" tabindex="0" aria-label="可拖动缩放的360乘240公里国家地图，点击可查看城镇与道路"></canvas>'+
  '<div class="country-map-scale" aria-live="polite">全国 · 360 × 240公里</div>'+
  '<div class="country-map-compass">N ↑</div></div>'+
  '<div class="country-map-layers">'+
   '<button data-map-layer="road" class="selected" aria-pressed="true"><span class="country-road-key"></span>公路</button>'+
   '<button data-map-layer="rail" class="selected" aria-pressed="true"><span class="country-rail-key"></span>铁路</button>'+
   '<button data-map-layer="sea" class="selected" aria-pressed="true"><span class="country-sea-key"></span>航运</button>'+
   '<span class="country-map-legend">● 城镇 / ★ 当前所在 / ▧ 行政分区</span></div>'+
  '<div class="country-map-info" role="status" aria-live="polite">全国96个分区，标注960处城镇、村庄及产业地标；放大即可看见更细的路线和地点。</div>'+
  '<details class="country-nearby-details"><summary>附近13 × 9公里细格地图（点选相邻区域）</summary>'+
  '<div class="national-map-grid" role="group" aria-label="局部13乘9公里地图">'+tiles.map(t=>{
   const sites=t.facilities.length,active=t.x===x&&t.y===y;
   return '<button type="button" class="national-map-tile '+t.terrain+(active?' active':'')+
    '" style="background:'+TERRAIN_COLORS[t.terrain]+'" data-atlas-cell="'+t.x+','+t.y+
    '" title="'+e(regionAt(t.x,t.y).name)+' · '+e(tileNames[t.terrain])+(sites?' · '+sites+'处地点':'')+'">'+
    (active?'✦':sites?'▣':t.terrain==='forest'?'♠':t.terrain==='mountain'?'▲':'')+'</button>';
  }).join('')+'</div></details></div>';
}
export function mountNationalMap(root,{x,y,camera,onInspect,onCamera}={}){
 const wrapper=root.querySelector('[data-country-atlas]');
 if(!wrapper)return null;
 const canvas=wrapper.querySelector('.country-map-canvas');
 const ctx=canvas.getContext('2d',{alpha:false});
 const state={
  cx:clamp(camera?.cx??WORLD_WIDTH/2,0,WORLD_WIDTH-1),
  cy:clamp(camera?.cy??WORLD_HEIGHT/2,0,WORLD_HEIGHT-1),
  zoom:ZOOM_STEPS.includes(camera?.zoom)?camera.zoom:1,
  layers:{road:true,rail:true,sea:true,...camera?.layers},
  inspect:null
 };
 let disposed=false,frame=0,down=null;
 const width=960,height=600;canvas.width=width;canvas.height=height;
 const dims=()=>{
  const pixels=Math.max(WORLD_WIDTH/width,WORLD_HEIGHT/height)/state.zoom;
  return {kmPerPixel:pixels,w:width*pixels,h:height*pixels,
   left:state.cx-width*pixels/2,top:state.cy-height*pixels/2};
 };
 const project=(p,d)=>({x:(p.x-d.left)/d.kmPerPixel,y:(p.y-d.top)/d.kmPerPixel});
 const fromScreen=(px,py,d=dims())=>({x:d.left+px*d.kmPerPixel,y:d.top+py*d.kmPerPixel});
 const sync=()=>{
  onCamera?.({cx:state.cx,cy:state.cy,zoom:state.zoom,layers:{...state.layers}});
  const info=wrapper.querySelector('.country-map-scale');
  if(info)info.textContent=(state.zoom===1?'全国':state.zoom+'倍缩放')+
   ' · 当前视野 '+Math.round(dims().w)+' × '+Math.round(dims().h)+'公里';
 };
 function draw(){
  frame=0;if(disposed)return;
  const d=dims(),x0=Math.floor(Math.max(0,d.left)),y0=Math.floor(Math.max(0,d.top));
  const x1=Math.ceil(Math.min(WORLD_WIDTH,d.left+d.w)),y1=Math.ceil(Math.min(WORLD_HEIGHT,d.top+d.h));
  ctx.fillStyle='#243f51';ctx.fillRect(0,0,width,height);
  const step=d.kmPerPixel>.18?2:1;
  for(let gy=y0;gy<y1;gy+=step)for(let gx=x0;gx<x1;gx+=step){
   const tile=terrainAt(gx,gy);if(!tile)continue;
   const p=project({x:gx,y:gy},d),size=step/d.kmPerPixel;
   ctx.fillStyle=sampleFill(tile,gx,gy);
   ctx.fillRect(p.x,p.y,Math.ceil(size)+1,Math.ceil(size)+1);
  }
  // District boundaries remain visible when zoomed to national scale.
  ctx.strokeStyle='#e4d1ac52';ctx.lineWidth=state.zoom>=8?1.4:.6;
  for(let col=0;col<=12;col++){
   const at=project({x:col*30,y:0},d);ctx.beginPath();ctx.moveTo(at.x,0);ctx.lineTo(at.x,height);ctx.stroke();
  }
  for(let row=0;row<=8;row++){
   const at=project({x:0,y:row*30},d);ctx.beginPath();ctx.moveTo(0,at.y);ctx.lineTo(width,at.y);ctx.stroke();
  }
  // Routes across the whole country; secondary roads appear after zoom.
  for(const line of transportInBounds(d.left-4,d.top-4,d.left+d.w+4,d.top+d.h+4)){
   if(!state.layers[line.mode])continue;
   if(line.tier==='local'&&state.zoom<3)continue;
   const a=project(line.a,d),b=project(line.b,d);
   if(!Number.isFinite(a.x+b.x+a.y+b.y))continue;
   ctx.lineWidth=(line.mode==='road'?line.tier==='local'?1.0:2.4:
    line.mode==='rail'?2.1:1.7)*(state.zoom>=8?1.3:1);
   ctx.strokeStyle=line.mode==='road'?'#f2cb8c':line.mode==='rail'?'#293d48':'#a4d2c8';
   if(line.mode==='rail')ctx.setLineDash([5,4]);
   else if(line.mode==='sea')ctx.setLineDash([7,6]);
   else ctx.setLineDash([]);
   ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  ctx.setLineDash([]);
  const lower=state.zoom===1?'regional':state.zoom<4?'town':'village';
  const settlements=settlementsInBounds(d.left-2,d.top-2,d.left+d.w+2,d.top+d.h+2,lower);
  ctx.textAlign='center';ctx.textBaseline='middle';
  const occupied=new Set();
  for(const town of settlements){
   const p=project(town,d);
   if(p.x<-30||p.x>width+30||p.y<-30||p.y>height+30)continue;
   const cellX=Math.floor(p.x/(state.zoom===1?55:state.zoom<4?42:33)),
    cellY=Math.floor(p.y/(state.zoom===1?31:25));
   const key=cellX+'-'+cellY;
   if(occupied.has(key)&&town.size!=='regional')continue;
   occupied.add(key);
   ctx.fillStyle=town.size==='regional'?'#f4ddaa':'#ebd8af';
   ctx.strokeStyle='#253543';ctx.lineWidth=2;
   ctx.beginPath();ctx.arc(p.x,p.y,town.size==='regional'?4.7:3,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.font=(town.size==='regional'?'bold 12px':'11px')+' sans-serif';
   ctx.lineWidth=3;ctx.strokeStyle='#203140';
   const label=town.name.replace('·',' ');
   ctx.strokeText(label,p.x,p.y-11);ctx.fillStyle='#fff3da';ctx.fillText(label,p.x,p.y-11);
  }
  for(const hub of REGIONS){
   const p=project(hub,d);
   if(p.x<0||p.x>width||p.y<0||p.y>height)continue;
   ctx.fillStyle='#a64553';ctx.strokeStyle='#f9dfb5';ctx.lineWidth=2;
   ctx.fillRect(p.x-5,p.y-5,10,10);ctx.strokeRect(p.x-5,p.y-5,10,10);
   ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.lineWidth=4;
   ctx.strokeStyle='#263744';ctx.strokeText(hub.name,p.x,p.y-16);
   ctx.fillStyle='#f8ebcf';ctx.fillText(hub.name,p.x,p.y-16);
  }
  // Accessible current location distinct from inspection and city hubs.
  const player=project({x,y},d);
  ctx.fillStyle='#ffe478';ctx.strokeStyle='#263344';ctx.lineWidth=3;ctx.beginPath();
  ctx.arc(player.x,player.y,8,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#273744';ctx.textAlign='center';ctx.font='bold 12px sans-serif';
  ctx.fillText('我',player.x,player.y);
  if(state.inspect){
   const pin=project(state.inspect,d);ctx.strokeStyle='#ffffff';ctx.lineWidth=2;
   ctx.beginPath();ctx.arc(pin.x,pin.y,12,0,Math.PI*2);ctx.stroke();
   ctx.beginPath();ctx.moveTo(pin.x-16,pin.y);ctx.lineTo(pin.x+16,pin.y);ctx.moveTo(pin.x,pin.y-16);ctx.lineTo(pin.x,pin.y+16);ctx.stroke();
  }
  sync();
 }
 const schedule=()=>{if(!disposed&&!frame)frame=requestAnimationFrame(draw);};
 function focus(cx,cy,zoom=state.zoom){
  state.zoom=ZOOM_STEPS.reduce((best,z)=>Math.abs(z-zoom)<Math.abs(best-zoom)?z:best,ZOOM_STEPS[0]);
  const d=dims();
  // Use safe coordinates while allowing viewport to touch national borders.
  state.cx=clamp(cx,0,WORLD_WIDTH-1);state.cy=clamp(cy,0,WORLD_HEIGHT-1);
  schedule();return {...state};
 }
 function zoomBy(dir,px=width/2,py=height/2){
  const old=dims(),point=fromScreen(px,py,old);
  const index=ZOOM_STEPS.indexOf(state.zoom),next=clamp(index+dir,0,ZOOM_STEPS.length-1);
  if(next===index)return;
  state.zoom=ZOOM_STEPS[next];
  const now=dims();
  state.cx=clamp(point.x-(px-width/2)*now.kmPerPixel,0,WORLD_WIDTH-1);
  state.cy=clamp(point.y-(py-height/2)*now.kmPerPixel,0,WORLD_HEIGHT-1);
  schedule();
 }
 function onClick(event){
  const r=canvas.getBoundingClientRect();
  const sx=(event.clientX-r.left)/r.width*width,sy=(event.clientY-r.top)/r.height*height;
  const selected=fromScreen(sx,sy);
  const ix=clamp(Math.floor(selected.x),0,WORLD_WIDTH-1),iy=clamp(Math.floor(selected.y),0,WORLD_HEIGHT-1);
  const description=describeMapLocation(ix,iy);if(!description)return;
  const radius=clamp(dims().kmPerPixel*16,.4,12);
  let nearest=null,dist=Infinity;
  for(const site of SETTLEMENTS){
   const n=Math.hypot(site.x-selected.x,site.y-selected.y);
   if(n<dist&&n<=radius){dist=n;nearest=site;}
  }
  if(nearest){description.settlement=nearest;description.x=nearest.x;description.y=nearest.y;}
  state.inspect={x:description.x,y:description.y};schedule();
  const info=wrapper.querySelector('.country-map-info');
  const label=nearest?nearest.name:'未命名地块';
  if(info)info.textContent=label+' · '+description.district.name+' · '+description.region.name+
   ' · 坐标 '+description.x+','+description.y+'。当前地图仅侦察位置；远方地点需要沿交通线路实际抵达。';
  onInspect?.(description);
 }
 let pointer=null;
 function pointerDown(event){pointer={id:event.pointerId,px:event.clientX,py:event.clientY,cx:state.cx,cy:state.cy,moved:false};
  canvas.setPointerCapture?.(event.pointerId);}
 function pointerMove(event){
  if(!pointer||pointer.id!==event.pointerId)return;
  const r=canvas.getBoundingClientRect(),dx=(event.clientX-pointer.px)/r.width*width,
   dy=(event.clientY-pointer.py)/r.height*height;
  if(Math.hypot(dx,dy)>5)pointer.moved=true;
  if(!pointer.moved)return;
  const scale=dims().kmPerPixel;
  state.cx=clamp(pointer.cx-dx*scale,0,WORLD_WIDTH-1);
  state.cy=clamp(pointer.cy-dy*scale,0,WORLD_HEIGHT-1);
  schedule();
 }
 function pointerUp(event){
  if(!pointer||pointer.id!==event.pointerId)return;
  const moved=pointer.moved;pointer=null;
  if(!moved)onClick(event);
 }
 function wheel(event){event.preventDefault();const r=canvas.getBoundingClientRect();
  zoomBy(event.deltaY<0?1:-1,(event.clientX-r.left)/r.width*width,(event.clientY-r.top)/r.height*height);}
 function key(event){
  const v=event.key;
  if(['+','=','-','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(v)){event.preventDefault();
   if(v==='+'||v==='=')zoomBy(1);else if(v==='-')zoomBy(-1);
   else{const d=dims(),delta=40*d.kmPerPixel;
    focus(state.cx+(v==='ArrowRight'?delta:v==='ArrowLeft'?-delta:0),
      state.cy+(v==='ArrowDown'?delta:v==='ArrowUp'?-delta:0));}
  }
 }
 const buttonHandler=event=>{
  const b=event.target.closest('button');if(!b||!wrapper.contains(b))return;
  if(b.dataset.mapAction){
   const action=b.dataset.mapAction;
   if(action==='overview')focus(WORLD_WIDTH/2,WORLD_HEIGHT/2,1);
   if(action==='home')focus(x,y,8);
   if(action==='plus')zoomBy(1);
   if(action==='minus')zoomBy(-1);
  }else if(b.dataset.mapLayer){
   const mode=b.dataset.mapLayer;state.layers[mode]=!state.layers[mode];
   b.classList.toggle('selected',state.layers[mode]);
   b.setAttribute('aria-pressed',String(state.layers[mode]));schedule();
  }
 };
 wrapper.addEventListener('click',buttonHandler);
 canvas.addEventListener('pointerdown',pointerDown);
 canvas.addEventListener('pointermove',pointerMove);
 canvas.addEventListener('pointerup',pointerUp);
 canvas.addEventListener('pointercancel',pointerUp);
 canvas.addEventListener('wheel',wheel,{passive:false});
 canvas.addEventListener('keydown',key);
 schedule();
 return {focus,zoomBy,snapshot:()=>({cx:state.cx,cy:state.cy,zoom:state.zoom,layers:{...state.layers},inspect:state.inspect}),
  destroy(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);
   wrapper.removeEventListener('click',buttonHandler);canvas.removeEventListener('pointerdown',pointerDown);
   canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerup',pointerUp);
   canvas.removeEventListener('pointercancel',pointerUp);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('keydown',key);}
 };
}
