import {districtAt} from '../world/CityLayout.mjs';
export const CITY_SCENE_ID='city-prologue';
export function sceneFromSearch(search=''){
  return new URLSearchParams(search).get('scene')==='forest'?'forest':CITY_SCENE_ID;
}
export function sceneSaveKey(sceneId){
  return sceneId===CITY_SCENE_ID?'paperworld.demo-lab.city-prologue.save.v1':'paperworld.demo-lab.stage.save.v1';
}
const sights=Object.freeze([
  Object.freeze({id:'school',x:1,radius:1.4,label:'查看校牌',title:'校门旁的告示',text:'晚自习已经结束。校门口的灯还亮着，值班室的窗上映着来往车灯。'}),
  Object.freeze({id:'store',x:12,radius:1.6,label:'看看便利店',title:'街角的便利店',text:'暖黄色的灯照着玻璃。货架上整齐摆着饮料，门边的小牌写着「营业中」。'}),
]);
export function cityLocation(x){
  if(!Number.isFinite(x))return '校门';
  if(x< -10||x>30)return districtAt(x).name;
  return x<4.8?'校门':x>=9.5&&x<15.5?'便利店':'街边';
}
export function nearbyCitySight(x){
  return Number.isFinite(x)?sights.find(sight=>Math.abs(x-sight.x)<=sight.radius)??null:null;
}
export function acceptsInspectionKey(event){
  if(event.code!=='KeyE'||event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return false;
  const target=event.target;
  return !target?.isContentEditable&&!target?.closest?.('input,textarea,select,button,a,summary,[contenteditable="true"],[contenteditable=""],[role="textbox"],[role="dialog"]');
}
