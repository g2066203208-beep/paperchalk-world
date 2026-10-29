/** Stateless local atlas viewport — replaceable independently of street scene. */
import {atlasViewport,regionAt} from '../../world/national-atlas.js';
import {escapeText as e} from '../core/scene-html.js';
export const TERRAIN_COLORS={sea:'#385b75',river:'#6798ad',mountain:'#8e8477',forest:'#4a7866',
 fields:'#9eac7f',lake:'#6d9eb4',urban:'#ae9b87',grass:'#88977b'};
export function renderNationalMap({x,y,tileNames}){
 const tiles=atlasViewport(x,y,13,9);
 return '<div class="national-map-grid" role="group" aria-label="局部13乘9公里地图">'+tiles.map(t=>{
  const sites=t.facilities.length,active=t.x===x&&t.y===y;
  return '<button type="button" class="national-map-tile '+t.terrain+(active?' active':'')+
    '" style="background:'+TERRAIN_COLORS[t.terrain]+'" data-atlas-cell="'+t.x+','+t.y+
    '" title="'+e(regionAt(t.x,t.y).name)+' · '+e(tileNames[t.terrain])+(sites?' · '+sites+'处地点':'')+'">'+
    (active?'✦':sites?'▣':t.terrain==='forest'?'♠':t.terrain==='mountain'?'▲':'')+'</button>';
 }).join('')+'</div>';
}
