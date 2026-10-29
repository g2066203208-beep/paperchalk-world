import {WORLD_WIDTH,WORLD_HEIGHT,WORLD_AREA,REGIONS,LINKS,terrainAt,facilitiesAt,regionAt,playerDistricts,atlasViewport,MODE_STYLE,routeBetween} from './national-atlas.js';
import {createWalkableStreet,streetBuildingsAt,interiorFor} from './walkable-street.js';
const STORAGE='night-harbor-country-position-v1';
const escape=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function createAtlasExplorer({readWorld,openPanel,command,onExit}){
 let saved=null;try{saved=JSON.parse(localStorage.getItem(STORAGE)||'null')}catch{}
 const initial=readWorld()?.slices?.geography;
 let x=Number.isFinite(initial?.x)?clamp(initial.x,0,WORLD_WIDTH-1):Number.isFinite(saved?.x)?clamp(saved.x,0,WORLD_WIDTH-1):125;
 let y=Number.isFinite(initial?.y)?clamp(initial.y,0,WORLD_HEIGHT-1):Number.isFinite(saved?.y)?clamp(saved.y,0,WORLD_HEIGHT-1):112;
 let inside=streetBuildingsAt(x,y).find(p=>p.id===initial?.interior)||null,selected=null,mode='road',expanded=false,walk=null;
 const layer=document.createElement('section');layer.className='national-explorer';layer.hidden=true;
 layer.setAttribute('aria-label','夜港国家地图与可进入地点');
 document.body.append(layer);
 const save=()=>{try{localStorage.setItem(STORAGE,JSON.stringify({x,y}))}catch{}};
 const applyGeography=action=>{
  if(typeof command!=='function')return false;
  const result=command({module:'geography',...action});
  if(!result?.ok)return false;
  const state=readWorld()?.slices?.geography;
  if(state){x=state.x;y=state.y;inside=state.interior?streetBuildingsAt(x,y).find(b=>b.id===state.interior)||null:null;}
  save();return true;
 };
 const recordPlayer=()=>{
  if(!walk||inside)return;
  const p=walk.snapshot();
  applyGeography({type:'player-position',x:p.x,y:p.y});
 };
 const tileNames={sea:'海洋',river:'河流',mountain:'山岳',forest:'森林',fields:'农田',lake:'湖泊',urban:'城市',grass:'野地'};
 const shade={sea:'#385b75',river:'#6798ad',mountain:'#8e8477',forest:'#4a7866',fields:'#9eac7f',lake:'#6d9eb4',urban:'#ae9b87',grass:'#88977b'};
 function scene(){
  const t=terrainAt(x,y),r=REGIONS.find(a=>a.id===t.regionId),places=streetBuildingsAt(x,y);
  const lots=playerDistricts(readWorld()).filter(p=>p.x===x&&p.y===y);
  if(inside){
   const info=interiorFor(inside),world=readWorld();
   const today=world?.slices?.clock?.shift||0,person=world?.slices?.population?.people?.[(info.fixtureSeed%80)];
   const people=person?person.name+' · '+(today===1?'上班工作':today===2?'街区活动':today===0?'准备开门':'准备打烊'):'暂无值班记录';
   return '<section class="national-floorplan" aria-label="'+escape(info.kind)+'的独立室内空间">'+
    '<div class="national-floorplan-heading"><b>'+escape(info.kind)+'</b><span>'+escape(info.street)+' · 场景 '+escape(info.id)+'</span></div>'+
    '<div class="national-floorplan-body" style="--floorseed:'+info.fixtureSeed+'">'+
    info.layout.map((room,i)=>'<button type="button" class="national-room room-'+info.room+' room-'+i+
     '" style="left:'+room.x+'%;top:'+room.y+'%;width:'+room.w+'%;height:'+room.h+'%" '+
     'data-atlas-inspect="'+room.id+'"><span class="room-lamp"></span><strong>'+escape(room.name)+'</strong><small>进入调查 / 查看</small></button>').join('')+
    '<div class="national-plan-player">你</div>'+
    '</div><div class="national-interior-information">'+
    '<p><b>场所状态：</b>'+escape(people)+'</p>'+
    '<p><b>空间编号：</b>'+escape(info.id)+' · '+info.width+' × '+info.height+'米</p>'+
    '<div class="interior-caption" role="status">点击房间调查。楼层、员工工作和货物装卸仍需与经营系统进一步打通。</div>'+
    '<button class="national-exit" data-atlas-leave="1">← 出门返回实地街道</button></div></section>';
  }
  return '<div class="national-local-title"><strong>可以真正走动的街区：'+escape(r.name)+'</strong><span>坐标 '+x+','+y+' · '+escape(tileNames[t.terrain])+'</span></div>'+
   '<div class="national-walk-zone"><canvas class="national-walk-canvas" aria-label="实时街道地图，方向键或WASD移动，点击建筑门口步行进入" tabindex="0"></canvas>'+
   '<div class="national-walk-overlay"><b>W A S D / 方向键移动</b><span>点击道路移动 · 点建筑后走向门口</span></div>'+
   '<div class="national-walk-buttons" aria-label="手机步行控制">'+
   '<button data-walk-move="w" aria-label="向北步行">↑</button>'+
   '<button data-walk-move="a" aria-label="向西步行">←</button>'+
   '<button data-walk-move="s" aria-label="向南步行">↓</button>'+
   '<button data-walk-move="d" aria-label="向东步行">→</button></div></div>'+
   '<div class="national-site-heading"><b>这一街区的 '+places.length+' 栋独立编号建筑</b><span>点击建筑 · 角色步行到门前 · 进入室内</span></div>'+
   '<div class="national-site-list">'+places.map(p=>'<button type="button" data-atlas-enter="'+escape(p.id)+'">'+
   '<strong>'+escape(p.name)+'</strong><small>'+escape(p.street)+' · '+p.floors+'层</small></button>').join('')+'</div>'+
   (lots.length?'<div class="national-lot-links"><b>与经营存档关联的地块</b>'+
   lots.map(p=>'<button type="button" data-atlas-estate="'+escape(p.lot)+'">'+escape(p.kind)+' · 地契 '+escape(p.lot)+'</button>').join('')+'</div>':'')+
   '<div class="national-neighbor-actions">'+[['北',0,-1],['西',-1,0],['东',1,0],['南',0,1]].map(([name,dx,dy])=>
    '<button data-atlas-step="'+dx+','+dy+'" '+(!terrainAt(x+dx,y+dy)?'disabled':'')+'>'+name+' · 去相邻1公里区域</button>').join('')+'</div>';
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
  walk?.destroy();walk=null;
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
   ' · 海拔'+t.elevation+'米</span><span>附近建筑：'+streetBuildingsAt(x,y).length+'栋</span></div></div></div>';
  const canvas=layer.querySelector('.national-walk-canvas');
  if(canvas)walk=createWalkableStreet(canvas,{x,y,readWorld,
   initialPosition:readWorld()?.slices?.geography?.player,
   onEnter(b){
    recordPlayer();
    if(applyGeography({type:'enter',building:b.id}))render();
   }});

 }
 function enter(){
  const geo=readWorld()?.slices?.geography;
  if(geo){x=geo.x;y=geo.y;inside=geo.interior?streetBuildingsAt(x,y).find(b=>b.id===geo.interior)||null:null;}
  layer.hidden=false;document.body.classList.add('national-exploring');render();
 }
 function close(silent=false){
  const wasOpen=!layer.hidden;
  if(wasOpen)recordPlayer();
  walk?.destroy();walk=null;layer.hidden=true;document.body.classList.remove('national-exploring');
  if(wasOpen&&!silent)onExit?.();
 }
 layer.addEventListener('click',event=>{
  const b=event.target.closest('button,[data-atlas-inspect]');if(!b)return;
  if(b.dataset.atlasClose){close();return;}
  if(b.dataset.atlasLeave){if(applyGeography({type:'leave'}))render();return;}
  if(b.dataset.atlasCell){const [nx,ny]=b.dataset.atlasCell.split(',').map(Number);if(applyGeography({type:'map-locate',x:nx,y:ny}))render();return;}
  if(b.dataset.atlasStep){const [dx,dy]=b.dataset.atlasStep.split(',').map(Number);if(applyGeography({type:'move',x:x+dx,y:y+dy}))render();return;}
  if(b.dataset.atlasEnter){walk?.goTo(b.dataset.atlasEnter);return;}
  if(b.dataset.atlasEstate){openPanel('reports','estates');close();return;}
  if(b.dataset.atlasMode){mode=b.dataset.atlasMode;render();return;}
  if(b.dataset.atlasStation){selected=b.dataset.atlasStation;render();return;}
  if(b.dataset.atlasTravel){if(applyGeography({type:'map-travel',target:selected,mode}))render();return;}
  if(b.dataset.atlasInspect){const label=b.querySelector('strong')?.textContent||'房间';const caption=layer.querySelector('.interior-caption');if(caption)caption.textContent='你检查了 '+label+'。这是 '+inside.kind+' 的独立编号空间；生产和交易仍须接入真正的NPC、库存系统。';}
 });
 document.addEventListener('keydown',event=>{if(layer.hidden)return;if(event.key==='Escape'){inside? (inside=null,render()):close();return;}if(inside||!event.ctrlKey||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const dir={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[event.key];if(applyGeography({type:'move',x:x+dir[0],y:y+dir[1]}))render();});
 return {open:enter,close,render,isVisible:()=>!layer.hidden,position:()=>({x,y,inside:inside?.id||null,street:walk?.snapshot()||null}),element:layer};
}
