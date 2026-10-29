import {WORLD_WIDTH,WORLD_HEIGHT,WORLD_AREA,REGIONS,LINKS,terrainAt,facilitiesAt,regionAt,playerDistricts,atlasViewport,MODE_STYLE,routeBetween} from './national-atlas.js';
const STORAGE='night-harbor-country-position-v1';
const escape=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function createAtlasExplorer({readWorld,openPanel}){
 let saved=null;try{saved=JSON.parse(localStorage.getItem(STORAGE)||'null')}catch{}
 let x=Number.isFinite(saved?.x)?clamp(saved.x,0,WORLD_WIDTH-1):125;
 let y=Number.isFinite(saved?.y)?clamp(saved.y,0,WORLD_HEIGHT-1):112;
 let inside=null,selected=null,mode='road',expanded=false;
 const layer=document.createElement('section');layer.className='national-explorer';layer.hidden=true;
 layer.setAttribute('aria-label','夜港国家地图与可进入地点');
 document.body.append(layer);
 const save=()=>{try{localStorage.setItem(STORAGE,JSON.stringify({x,y}))}catch{}};
 const tileNames={sea:'海洋',river:'河流',mountain:'山岳',forest:'森林',fields:'农田',lake:'湖泊',urban:'城市',grass:'野地'};
 const shade={sea:'#385b75',river:'#6798ad',mountain:'#8e8477',forest:'#4a7866',fields:'#9eac7f',lake:'#6d9eb4',urban:'#ae9b87',grass:'#88977b'};
 function scene(){
  const t=terrainAt(x,y),r=REGIONS.find(a=>a.id===t.regionId),places=facilitiesAt(x,y);
  const lots=playerDistricts(readWorld()).filter(p=>p.x===x&&p.y===y);
  if(inside){
   const kind=inside.kind;
   const service=/(店|餐|咖啡|集市|鱼市|铺|报社)/.test(kind);
   const industrial=/(矿|厂|场|林业|农|码头|站|船坞)/.test(kind);
   return '<section class="national-interior"><div class="interior-ceiling"><span>'+escape(r.name)+' / '+escape(kind)+'</span><b>室内场景</b></div>'+
   '<div class="interior-window"></div><div class="interior-floor"></div>'+
   '<div class="interior-object desk" data-atlas-inspect="desk"><span>'+ (service?'收银台与货架':industrial?'控制台与工具':'服务台与登记册')+'</span></div>'+
   '<div class="interior-object shelves" data-atlas-inspect="shelves"><span>'+ (service?'陈列商品':'储物区')+'</span></div>'+
   '<div class="interior-object machine" data-atlas-inspect="machine"><span>'+ (industrial?'正在工作的设备':'当地设施')+'</span></div>'+
   '<div class="interior-person" data-atlas-inspect="person"><span>值班人员</span></div>'+
   '<button class="national-exit" data-atlas-leave="1">← 推门回到 '+escape(r.name)+' 的街道</button>'+
   '<div class="interior-caption">每个地点拥有独立坐标、名称和可互动对象。此版内部空间为类别化程序场景，尚非独立手绘关卡。</div></section>';
  }
  return '<div class="national-local-title"><strong>'+escape(r.name)+'</strong><span>街道 / '+escape(tileNames[t.terrain])+' · '+x+' km E · '+y+' km S</span></div>'+
  '<div class="national-neighborhood">'+
  '<div class="national-distant"></div><div class="national-local-ground '+t.terrain+'"></div>'+
  '<div class="national-local-road"></div>'+
  places.map((p,i)=>'<button class="national-building national-building-'+i+'" data-atlas-enter="'+p.id+'" aria-label="进入'+escape(p.kind)+'">'+
  '<span class="national-roof"></span><span class="national-facade"><i></i><i></i><i></i><i></i></span><strong>'+escape(p.kind)+'</strong></button>').join('')+
  lots.map((p,i)=>'<button class="national-building national-estate" style="--building-i:'+i+'" data-atlas-estate="'+p.lot+'">'+
  '<span class="national-roof"></span><span class="national-facade"><i></i><i></i></span><strong>'+escape(p.kind)+'</strong></button>').join('')+
  '<div class="national-avatar" aria-label="玩家当前位置"><span>你</span></div></div>'+
  '<div class="national-neighbor-actions">'+
  [['北',0,-1],['西',-1,0],['东',1,0],['南',0,1]].map(([name,dx,dy])=>
    '<button data-atlas-step="'+dx+','+dy+'" '+(!terrainAt(x+dx,y+dy)?'disabled':'')+'>'+name+' · 前往相邻 '+(terrainAt(x+dx,y+dy)?tileNames[terrainAt(x+dx,y+dy).terrain]:'边界')+'</button>').join('')+'</div>';
 }
 function map(){
  const tiles=atlasViewport(x,y,13,9);
  const left=x-6,top=y-4;
  return '<div class="national-map-grid" role="group" aria-label="周围13乘9公里的可移动分区">'+tiles.map(t=>{
   const rx=t.x-left,ry=t.y-top;
   const active=t.x===x&&t.y===y;
   const sites=t.facilities.length;
   return '<button type="button" class="national-map-tile '+t.terrain+(active?' active':'')+
    '" style="--tx:'+rx+';--ty:'+ry+';background:'+shade[t.terrain]+'" data-atlas-cell="'+t.x+','+t.y+
    '" title="'+escape(regionAt(t.x,t.y).name)+' · '+escape(tileNames[t.terrain])+
    (sites?' · '+sites+'个地点':'')+'">'+(active?'✦':sites?'▣':t.terrain==='forest'?'♠':t.terrain==='mountain'?'▲':'')+'</button>';
  }).join('')+'</div>';
 }
 function render(){
  if(layer.hidden)return;
  const r=regionAt(x,y),t=terrainAt(x,y);
  const station=REGIONS.find(p=>p.id===selected)||r;
  const connections=LINKS.filter(l=>l.a===r.id||l.b===r.id).filter(l=>l.mode===mode);
  const available=connections.map(l=>REGIONS.find(p=>p.id===(l.a===r.id?l.b:l.a)));
  const route=routeBetween(r.id,station.id,mode);
  layer.innerHTML='<div class="national-header"><div><small>NIGHT HARBOR / NATIONAL EXPLORATION</small><h2>夜港国土 · 地理实景</h2>'+
   '<p>360 × 240公里坐标空间 / 86,400平方公里 · 懒加载邻近区块</p></div>'+
   '<button data-atlas-close="1">返回原有剧情场景 ✕</button></div>'+
   '<div class="national-layout"><div class="national-map-column"><div class="national-map-heading"><b>国家局部地图 · '+escape(r.name)+'</b><span>每一格1公里 / '+x+','+y+'</span></div>'+
   map()+'<div class="national-map-caption"><span>★ 当前坐标</span><span>▣ 可进入建筑</span><span>▲ 山区</span><span>♠ 林区</span></div>'+
   '<div class="national-transport"><h3>公路 · 铁路 · 航运</h3><div class="national-modes">'+Object.entries(MODE_STYLE).map(([id,style])=>
   '<button class="'+(mode===id?'active':'')+'" data-atlas-mode="'+id+'">'+style.name+'</button>').join('')+'</div>'+
   '<div class="national-stations">'+REGIONS.map(a=>'<button data-atlas-station="'+a.id+'" class="'+(selected===a.id?'active':'')+'">'+escape(a.name)+'</button>').join('')+'</div>'+
   '<p>'+(route?('可用 '+MODE_STYLE[mode].name+'线路：'+route.stops.map(id=>REGIONS.find(a=>a.id===id).name).join(' → ')+
     ' · 约'+route.lengthKm+'公里'):'两地没有直连的'+MODE_STYLE[mode].name+'轨道/航道网络，需切换运输方式')+'</p>'+
   '<button class="national-travel" data-atlas-travel="1" '+(!route||station.id===r.id?'disabled':'')+'>沿实际网络前往 '+escape(station.name)+'</button>'+
   '<small>按站点网络通行，不是凭空从一张场景切换到另一张；长距离步行可沿局部格子逐格探索。</small></div></div>'+
   '<div class="national-scene-column">'+scene()+
   '<div class="national-footer"><b>所在区域：'+escape(r.name)+'</b><span>'+escape(tileNames[t.terrain])+
   ' · 海拔'+t.elevation+'米</span><span>附近地点：'+facilitiesAt(x,y).length+'处</span></div></div></div>';
 }
 function enter(){layer.hidden=false;document.body.classList.add('national-exploring');render();}
 function close(){layer.hidden=true;document.body.classList.remove('national-exploring');}
 layer.addEventListener('click',event=>{
  const b=event.target.closest('button,[data-atlas-inspect]');if(!b)return;
  if(b.dataset.atlasClose){close();return;}
  if(b.dataset.atlasLeave){inside=null;render();return;}
  if(b.dataset.atlasCell){const [nx,ny]=b.dataset.atlasCell.split(',').map(Number);x=nx;y=ny;inside=null;save();render();return;}
  if(b.dataset.atlasStep){const [dx,dy]=b.dataset.atlasStep.split(',').map(Number);x=clamp(x+dx,0,WORLD_WIDTH-1);y=clamp(y+dy,0,WORLD_HEIGHT-1);save();render();return;}
  if(b.dataset.atlasEnter){inside=facilitiesAt(x,y).find(p=>p.id===b.dataset.atlasEnter);render();return;}
  if(b.dataset.atlasEstate){openPanel('reports','estates');close();return;}
  if(b.dataset.atlasMode){mode=b.dataset.atlasMode;render();return;}
  if(b.dataset.atlasStation){selected=b.dataset.atlasStation;render();return;}
  if(b.dataset.atlasTravel){const target=REGIONS.find(r=>r.id===selected);if(!target||!routeBetween(regionAt(x,y).id,target.id,mode))return;x=target.x;y=target.y;inside=null;save();render();return;}
  if(b.dataset.atlasInspect){const label=b.querySelector('span')?.textContent||'内部设施';const caption=layer.querySelector('.interior-caption');if(caption)caption.textContent=label+'：这里属于 '+inside.kind+'，可以查看实地配置。专属行业操作仍通过产业经营系统执行。';}
 });
 document.addEventListener('keydown',event=>{if(layer.hidden)return;if(event.key==='Escape'){inside? (inside=null,render()):close();return;}if(inside||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const dir={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[event.key];x=clamp(x+dir[0],0,WORLD_WIDTH-1);y=clamp(y+dir[1],0,WORLD_HEIGHT-1);save();render();});
 return {open:enter,close,isVisible:()=>!layer.hidden,position:()=>({x,y,inside:inside?.id||null}),element:layer};
}
