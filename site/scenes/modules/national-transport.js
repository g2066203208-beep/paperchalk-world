/** Transport view: network calculation stays in world graph; no scene state. */
import {REGIONS,MODE_STYLE,routeBetween} from '../../world/national-atlas.js';
import {escapeText as e} from '../core/scene-html.js';
export function renderNationalTransport({region,station,mode,selected}){
 const route=routeBetween(region.id,station.id,mode);
 return '<div class="national-transport"><h3>公路 · 铁路 · 航运</h3>'+
  '<div class="national-modes">'+Object.entries(MODE_STYLE).map(([id,style])=>
   '<button class="'+(mode===id?'active':'')+'" data-atlas-mode="'+id+'">'+e(style.name)+'</button>').join('')+'</div>'+
  '<div class="national-stations">'+REGIONS.map(r=>
   '<button data-atlas-station="'+r.id+'" class="'+(selected===r.id?'active':'')+'">'+e(r.name)+'</button>').join('')+'</div>'+
  '<p>'+(route?('可用 '+e(MODE_STYLE[mode].name)+'路网：'+route.stops.map(id=>e(REGIONS.find(r=>r.id===id).name)).join(' → ')+
   ' · 约'+route.lengthKm+'公里'):'无连通线路，请选择其他交通方式')+'</p>'+
  '<button class="national-travel" data-atlas-travel="1" '+(!route||region.id===station.id?'disabled':'')+
  '>沿路网前往 '+e(station.name)+'</button>'+
  '<small>枢纽级线路寻路，不代表已实现列车和车辆实体。</small></div>';
}
