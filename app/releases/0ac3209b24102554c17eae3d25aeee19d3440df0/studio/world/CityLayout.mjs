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
// Paper seams are authored stage joins rather than collision barriers.  They
// let the player turn the same street into a small paper theatre: each join
// exposes the next depth layer while the walking surface stays continuous.
export const PAPER_LAYERS=Object.freeze([
  Object.freeze({id:0,name:'街面层',shortName:'街面',description:'沿着城市主街展开的近景纸层'}),
  Object.freeze({id:1,name:'桥廊层',shortName:'桥廊',description:'抬起一折纸板，露出天桥和屋顶连廊'}),
  Object.freeze({id:2,name:'巷幕后景',shortName:'幕后',description:'翻到纸景背面，看到藏在建筑后的窄巷剪影'}),
]);
const SEAM_SPECS=[
  ['academy-fold',6,'校门折页'],
  ['oldtown-fold',60,'老城拱廊折页'],
  ['market-fold',180,'集市棚顶折页'],
  ['shopping-fold',300,'商业街橱窗折页'],
  ['central-fold',420,'车站大厅折页'],
  ['business-fold',540,'商务楼桥廊折页'],
  ['civic-fold',660,'市民广场折页'],
  ['riverside-fold',780,'月河步桥折页'],
  ['harbor-fold',900,'港口仓页折页'],
  ['arts-fold',1020,'艺术街舞台折页'],
  ['medical-fold',1140,'医院花园折页'],
  ['residential-fold',1260,'星灯庭院折页'],
];
export const PAPER_SEAMS=Object.freeze(SEAM_SPECS.map(([id,x,name],index)=>Object.freeze({
  id,x,name,radius:2.8,index,
  prompt:'切换纸层',
})));
export function districtAt(x){return CITY_DISTRICTS.find(d=>x>=d.minX&&x<d.maxX)??(x<0?CITY_DISTRICTS[0]:CITY_DISTRICTS.at(-1));}
export function nearbyTransit(x){return TRANSIT_STOPS.filter(s=>Math.abs(s.x-x)<=s.radius).sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x))[0]??null;}
export function nearbyPaperSeam(x){
  if(!Number.isFinite(x))return null;
  return PAPER_SEAMS.filter(seam=>Math.abs(seam.x-x)<=seam.radius).sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x))[0]??null;
}
export function nextPaperLayer(layer=0){
  const current=Number.isInteger(layer)&&layer>=0&&layer<PAPER_LAYERS.length?layer:0;
  return (current+1)%PAPER_LAYERS.length;
}
export function transitDestinations(stop){return (stop?.kind==='metro'?METRO_STATIONS:BUS_STOPS).filter(s=>s.id!==stop?.id);}
export function travelDuration(from,to){return Math.max(3,Math.min(from.kind==='metro'?16:38,Math.abs(to.x-from.x)/(from.kind==='metro'?105:38)+3));}
