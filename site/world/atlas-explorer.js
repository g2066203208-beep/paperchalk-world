import {WORLD_WIDTH,WORLD_HEIGHT,REGIONS,regionAt,terrainAt} from './national-atlas.js';
import {streetBuildingsAt} from './walkable-street.js';
import {createSceneHost} from '../scenes/core/scene-host.js';
import {nationalStreetScene} from '../scenes/modules/national-street.js';
import {nationalInteriorScene} from '../scenes/modules/national-interior.js';
import {renderNationalMap} from '../scenes/modules/national-map.js';
import {renderNationalTransport} from '../scenes/modules/national-transport.js';
const STORAGE='night-harbor-country-position-v1';
const escape=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function createAtlasExplorer({readWorld,openPanel,command,onExit}){
 let saved=null;try{saved=JSON.parse(localStorage.getItem(STORAGE)||'null')}catch{}
 const initial=readWorld()?.slices?.geography;
 let x=Number.isFinite(initial?.x)?clamp(initial.x,0,WORLD_WIDTH-1):Number.isFinite(saved?.x)?clamp(saved.x,0,WORLD_WIDTH-1):125;
 let y=Number.isFinite(initial?.y)?clamp(initial.y,0,WORLD_HEIGHT-1):Number.isFinite(saved?.y)?clamp(saved.y,0,WORLD_HEIGHT-1):112;
 let inside=streetBuildingsAt(x,y).find(p=>p.id===initial?.interior)||null,selected=null,mode='road',walk=null;
 const sceneHost=createSceneHost([nationalStreetScene,nationalInteriorScene]);
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
 function render(){
  if(layer.hidden)return;
  // The scene host disposes listeners, animation frames and canvas state on every
  // street/interior/world transition. Unrelated UI may be safely re-rendered.
  sceneHost.unmount();walk=null;
  const region=regionAt(x,y),ground=terrainAt(x,y);
  const station=REGIONS.find(p=>p.id===selected)||region;
  const context={x,y,inside,readWorld,tileNames,
   onEnter(building){
    recordPlayer();
    if(applyGeography({type:'enter',building:building.id}))render();
   }};
  const key=inside?'national-interior':'national-street';
  const sceneHTML=sceneHost.render(key,context);
  layer.innerHTML='<div class="national-header"><div><small>NIGHT HARBOR / NATIONAL EXPLORATION</small><h2>夜港国土 · 场景化世界</h2>'+
   '<p>国家坐标分块加载 · 玩家进入实地街道，建筑独立进入</p></div>'+
   '<button data-atlas-close="1">返回原有剧情场景 ✕</button></div>'+
   '<div class="national-layout"><div class="national-map-column">'+
   '<div class="national-map-heading"><b>国家局部地图 · '+escape(region.name)+'</b><span>1公里/格 · '+x+','+y+'</span></div>'+
   renderNationalMap({x,y,tileNames})+
   '<div class="national-map-caption"><span>✦ 当前坐标</span><span>▣ 可进入建筑</span><span>▲ 山区</span><span>♠ 林区</span></div>'+
   renderNationalTransport({region,station,mode,selected})+
   '</div><div class="national-scene-column">'+sceneHTML+
   '<div class="national-footer"><b>所在区域：'+escape(region.name)+'</b><span>'+escape(tileNames[ground.terrain])+
   ' · 海拔'+ground.elevation+'米</span><span>附近建筑：'+streetBuildingsAt(x,y).length+'栋</span></div></div></div>';
  walk=sceneHost.mount(layer)||null;
 }
 function enter(){
  const geo=readWorld()?.slices?.geography;
  if(geo){x=geo.x;y=geo.y;inside=geo.interior?streetBuildingsAt(x,y).find(b=>b.id===geo.interior)||null:null;}
  layer.hidden=false;document.body.classList.add('national-exploring');render();
 }
 function close(silent=false){
  const wasOpen=!layer.hidden;
  if(wasOpen)recordPlayer();
  sceneHost.unmount();walk=null;layer.hidden=true;document.body.classList.remove('national-exploring');
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
 return {open:enter,close,render,isVisible:()=>!layer.hidden,position:()=>({x,y,inside:inside?.id||null,street:walk?.snapshot()||null}),sceneModule:()=>sceneHost.current()?.id||null,element:layer};
}
