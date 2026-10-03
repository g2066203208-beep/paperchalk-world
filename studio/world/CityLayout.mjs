/** Shared authored geography for the walkable city and both transit networks. */
export const CITY_BOUNDS=Object.freeze({minX:-48,maxX:1380,minY:-5,maxY:24});
export const CITY_GROUND=Object.freeze({minX:-140,maxX:1480});
export const CITY_DISTRICTS=Object.freeze([
  ['academy','学园街','钟声与放学人群','school',0x6c998a],
  ['oldtown','榆树老城','红砖小巷与骑楼','oldtown',0xb97d68],
  ['market','晨星集市','花铺、果蔬与夜市','market',0xd6a15e],
  ['shopping','灯影商业街','百货橱窗与电影院','shopping',0xb97f9b],
  ['central','中央车站','城市的换乘枢纽','station',0x7296af],
  ['business','云端商务区','办公楼与城市天际线','business',0x7a9eaa],
  ['civic','市民广场','图书馆、市政厅与喷泉','civic',0xa29bbc],
  ['riverside','月河公园','河岸、步桥与树影','park',0x8fab7e],
  ['harbor','南湾港口','灯塔、码头与仓库','harbor',0x739fa9],
  ['arts','彩纸艺术街','画廊、剧院与唱片店','arts',0xc9857b],
  ['medical','白榆医院区','医院、花园与药房','hospital',0x91ad9c],
  ['residential','星灯住宅区','公寓、庭院与家的灯光','residential',0xc6a17f],
].map(([id,name,description,theme,color],index)=>Object.freeze({id,name,description,theme,color,index,x:index*120,minX:index?index*120-60:-48,maxX:index===11?1380:index*120+60})));
export const BUS_STOPS=Object.freeze(CITY_DISTRICTS.map(d=>Object.freeze({id:'bus-'+d.id,kind:'bus',districtId:d.id,name:d.name,x:d.x+36,radius:3.4})));
export const METRO_STATIONS=Object.freeze([0,3,4,7,9,11].map(i=>{
  const d=CITY_DISTRICTS[i];return Object.freeze({id:'metro-'+d.id,kind:'metro',districtId:d.id,name:d.name,x:d.x+51,radius:4});
}));
export const TRANSIT_STOPS=Object.freeze([...BUS_STOPS,...METRO_STATIONS]);
export function districtAt(x){return CITY_DISTRICTS.find(d=>x>=d.minX&&x<d.maxX)??(x<0?CITY_DISTRICTS[0]:CITY_DISTRICTS.at(-1));}
export function nearbyTransit(x){return TRANSIT_STOPS.filter(s=>Math.abs(s.x-x)<=s.radius).sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x))[0]??null;}
export function transitDestinations(stop){return (stop?.kind==='metro'?METRO_STATIONS:BUS_STOPS).filter(s=>s.id!==stop?.id);}
export function travelDuration(from,to){return Math.max(3,Math.min(from.kind==='metro'?16:38,Math.abs(to.x-from.x)/(from.kind==='metro'?105:38)+3));}
