/**
 * Scene module: per-building floorplan. Layout selection is independently
 * registered in world/interiors.js; HTML here is only the visible presentation.
 */
import {interiorFor} from '../../world/interiors.js';
import {paintPixelInterior} from '../pixel/pixel-room-art.js';
import {escapeText as e} from '../core/scene-html.js';
export const nationalInteriorScene={
 id:'national-interior',
 render({inside,readWorld}){
  if(!inside?.id)throw Error('Interior scene needs a building identity');
  const info=interiorFor(inside),world=readWorld();
  const today=world?.slices?.clock?.shift||0;
  const person=world?.slices?.population?.people?.[info.fixtureSeed%80];
  const shifts=['准备开门','上班工作','街区活动','准备打烊'];
  const people=person?person.name+' · '+shifts[today]:'暂无值班记录';
  return '<section class="national-floorplan" aria-label="'+e(info.kind)+'独立室内空间">'+
   '<div class="national-floorplan-heading"><b>'+e(info.kind)+'</b><span>'+e(info.street)+' · '+e(info.id)+'</span></div>'+
   '<div class="national-floorplan-body pixel-floorplan" style="--floorseed:'+info.fixtureSeed+'">'+
   '<canvas class="pixel-room-canvas" width="480" height="300" aria-label="按照该建筑功能生成的像素房间场景"></canvas>'+
   info.layout.map((room,i)=>'<button type="button" class="national-room room-'+e(info.room)+' room-'+i+
   '" style="left:'+room.x+'%;top:'+room.y+'%;width:'+room.w+'%;height:'+room.h+'%" data-atlas-inspect="'+e(room.id)+'">'+
   '<span class="room-lamp"></span><strong>'+e(room.name)+'</strong><small>进入调查 / 查看</small></button>').join('')+
   '<div class="national-plan-player">你</div></div>'+
   '<div class="national-interior-information"><p><b>场所状态：</b>'+e(people)+'</p>'+
   '<p><b>空间编号：</b>'+e(info.id)+' · '+info.width+' × '+info.height+'米</p>'+
   '<div class="interior-caption" role="status">这里是独立ID的室内场景模板；真实经营、楼层及职工工序仍在开发。</div>'+
   '<button class="national-exit" data-atlas-leave="1">← 出门返回街区</button></div></section>';
 },
 mount(root,{inside,readWorld}){
  const canvas=root.querySelector('.pixel-room-canvas');
  if(!canvas)return null;
  const info=interiorFor(inside),shift=readWorld()?.slices?.clock?.shift||0;
  paintPixelInterior(canvas,info,shift);
  // A room has no street movement instance; the atlas' walk handle must remain null.
  return null;
 }
};
