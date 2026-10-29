/**
 * Scene module: real-time traversable street. No modal, atlas renderer,
 * route graph, save or command code lives here.
 */
import {createWalkableStreet,streetBuildingsAt} from '../../world/walkable-street.js';
import {playerDistricts,terrainAt,regionAt} from '../../world/national-atlas.js';
import {escapeText as e} from '../core/scene-html.js';
const directions=[['北',0,-1],['西',-1,0],['东',1,0],['南',0,1]];
export const nationalStreetScene={
 id:'national-street',
 render({x,y,readWorld,tileNames}){
  const ground=terrainAt(x,y),region=regionAt(x,y),places=streetBuildingsAt(x,y);
  const estates=playerDistricts(readWorld()).filter(p=>p.x===x&&p.y===y);
  return '<div class="national-local-title"><strong>可自由步行：'+e(region.name)+'</strong><span>坐标 '+x+','+y+' · '+e(tileNames[ground.terrain])+'</span></div>'+
   '<div class="national-walk-zone"><canvas class="national-walk-canvas" aria-label="WASD自由移动，点击建筑会步行至门口" tabindex="0"></canvas>'+
   '<div class="national-walk-overlay"><b>W A S D / 方向键移动</b><span>点道路步行 · 点建筑走向门口</span></div>'+
   '<div class="national-walk-buttons" aria-label="手机步行控制">'+
   [['w','↑','北'],['a','←','西'],['s','↓','南'],['d','→','东']].map(([key,label,name])=>
    '<button data-walk-move="'+key+'" aria-label="向'+name+'步行">'+label+'</button>').join('')+
   '</div></div>'+
   '<div class="national-site-heading"><b>街区中 '+places.length+' 栋具名建筑</b><span>选建筑 · 角色走到门前 · 进入室内</span></div>'+
   '<div class="national-site-list">'+places.map(p=>'<button type="button" data-atlas-enter="'+e(p.id)+'">'+
    '<strong>'+e(p.name)+'</strong><small>'+e(p.street)+' · '+p.floors+'层</small></button>').join('')+'</div>'+
   (estates.length?'<div class="national-lot-links"><b>本区产权</b>'+estates.map(p=>
    '<button data-atlas-estate="'+e(p.lot)+'">'+e(p.kind)+' · '+e(p.lot)+'</button>').join('')+'</div>':'')+
   '<div class="national-neighbor-actions">'+directions.map(([name,dx,dy])=>
    '<button data-atlas-step="'+dx+','+dy+'" '+(!terrainAt(x+dx,y+dy)?'disabled':'')+'>'+name+' · 去相邻1公里区域</button>').join('')+'</div>';
 },
 mount(root,{x,y,readWorld,onEnter}){
  const canvas=root.querySelector('.national-walk-canvas');
  if(!canvas)throw Error('Street module canvas not mounted');
  return createWalkableStreet(canvas,{x,y,readWorld,
   initialPosition:readWorld()?.slices?.geography?.player,onEnter});
 },
 dispose(instance){instance?.destroy();}
};
