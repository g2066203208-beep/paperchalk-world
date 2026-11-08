/* Paperchalk World / transport network: authored route data, not a map image.
   A visual line is also a clickable, directional, physical train service.
   "Ring" is a true closed route: it has no artificial terminal. */
(function(global){
'use strict';
// The transit diagram is defined on ONE shared integer lattice.
 // gx/gy are grid intersections, never independently hand-tuned percentages.
 // The same lattice positions rail stations, vector turns, photo anchors
 // and line badges in desktop and landscape mobile layouts.
const GRID=Object.freeze({columns:36,rows:26});
// Existing story locations retain their save-game station IDs and the same
// two originally playable service names/directions. The new city grid has
// room for 170 independently located platforms instead of eight giant pins.
const BASE_STATIONS={
 entrance:{label:'住宅前',gx:6,gy:10},
 school:{label:'学园前',gx:11,gy:10},
 central:{label:'中央换乘站',gx:15,gy:10},
 convenience:{label:'商业街',gx:20,gy:10},
 cafe:{label:'咖啡街',gx:6,gy:15},
 park:{label:'河岸公园',gx:11,gy:15},
 mall:{label:'中央商场',gx:20,gy:15},
 northgate:{label:'北街口',gx:15,gy:5}
};
const BASE_LINES=[
 {id:'a',name:'住宅线',color:'#E45B70',
  stops:['entrance','school','central','convenience'],ring:false},
 {id:'b',name:'环城线',color:'#7DA9DE',
  stops:['central','cafe','park','mall','convenience','northgate'],ring:true}
];
// Eight additional AUTHORED corridor stop orders. The coordinates are
// integer intersections on the same subway-only dot network. Shared
// coordinates resolve to one canonical station ID = a real interchange;
// this is NOT a raster image, and no line is generated from nearby POIs.
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>i+a);
const CORRIDORS=[
 {id:'c',name:'南北线',color:'#E8B763',
  points:range(1,23).filter(y=>y!==2).map(y=>[15,y]),
  names:'赤樫北口|北岭公园|杉原町|朝雾坂|旧北街|梓桥|榉木上町|大学北门|北樱门|中央北口|中央南口|纸灯町|青柳桥|莲花新町|河岸东口|砂町|潮田坂|新桥南|南田工坊|青冈住宅|南谷町|南环口'},
 {id:'d',name:'东西线',color:'#75C6B3',
  points:[1,2,3,5,6,8,10,11,13,15,16,18,19,20,21,23,24,26,27,29,30,32,33].map(x=>[x,8]),
  names:'旧西门|樫町|斜阳坂|梨木里|桐原东口|落叶町|老电厂|西城医院|樱庭|西风道|茜桥|中央大街|文化会馆|南图书馆|轨道公园|东央门|新湾区|滨桥町|风车广场|樱港中路|潮见塔|东滨町|临港公园'},
 {id:'e',name:'西城线',color:'#B69AE8',
  points:range(1,23).map(y=>[6,y]),
  names:'北樫丘|晨雾北苑|杉影坡|白榆公园|旧区役所|松明坂|西町小路|旧城中枢|赤砖巷|晨雾住宅|梅花街|古书里|旧港河桥|桐叶町|柳下街|霞桥旧址|长藤苑|西河滨|城南中学|西风台|竹林坡|云泉路|月见台'},
 {id:'f',name:'湾岸线',color:'#F38B65',
  points:range(1,24).filter(y=>y!==2).map(y=>[24,y]),
  names:'北海公园|潮岬新町|风滨港|潮音台|海洋资料馆|晴波大桥|新都心北|港湾会展|东湾商务|滨海医院|中央码头|南港仓储|滨河渡口|万叶广场|盐田町|海防大街|潮入路|港南街|海堤公园|物流新城|新浦码头|月轮港|汐风南岸'},
 {id:'g',name:'学园北线',color:'#94CB7A',
  points:[2,3,4,5,6,7,9,10,12,13,14,15,16,18,19,20,21,22,24,25,27,29,30].map(x=>[x,4]),
  names:'西学宿|古樱町|雾谷北路|梧桐台|教师住宅|图书学园|旧大学西|文艺大道|萤泽町|学研中心|北环三街|南杉研究院|湖上公园|青柿里|双叶坂|西湾学院|科创大道|望月广场|青海北站|晴风台|芦苇园|虹桥北|东海大学'},
 {id:'h',name:'南部线',color:'#E4A5C7',
  points:[3,4,5,6,7,9,10,11,12,14,15,16,18,19,20,21,22,23,24,26,28,31].map(x=>[x,19]),
  names:'西南林场|旧隧道口|谷尾坂|赤穗工厂|长青里|南浦学院|楠叶桥|水门东|南商工街|旧码头路|高架新町|临港西门|深川南街|白莲园|海港步廊|千鸟町|南城展馆|春樱台|湾口南|新民居|新堤町|东南田园'},
 {id:'i',name:'青柳河岸线',color:'#77C4E3',
  points:[...range(2,14).map(x=>[x,13]),...range(14,23).map(y=>[14,y])],
  names:'河西堤|芦花小路|秋影桥|祠堂东|河岸观测|旧堤站|榉川市场|柳泉花园|纸鸟横丁|真砂口|工艺学校|白浪桥|新川门|南河谷|枫林码头|堤岸三丁目|青柳新城|南柳巷|白石堤|雨后町|汀桥里|湿地公园|水穗北路'},
 {id:'j',name:'临海南线',color:'#DDD36D',
  points:[9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,28,30,34].map(x=>[x,23]),
  names:'西湾南端|杉台南|古南郊|霞田农园|秋津西路|临水湿地|光桥郊园|南河百货|朝阳高地|月轮桥|晨曦住宅|港西工坊|青蒲里|松浦东区|石渡口|南潮林|海风绿地|海鸟公园|东湾净水|南沙道|岬角前'}
].map(p=>Object.freeze({...p,
 // Authored rail corridors bend around old districts, riverbanks and docks;
 // the central shared interchange lattice positions are left untouched.
 // Each stop retains its name, index and ID across future scene assets.
 points:p.points.map(([gx,gy])=>{
  if(p.id==='c'&&gy>=12&&gy<=17)gx=16;
  if(p.id==='d'&&gx>=10&&gx<=13)gy=7;
  if(p.id==='e'&&(gy===2||gy===3))gx=4;
  if(p.id==='e'&&gy>=21)gx=5;
  if(p.id==='f'&&gy>=11&&gy<=16)gx=26;
  if(p.id==='g'&&gx>=8&&gx<=12)gy=3;
  if(p.id==='g'&&gx>=26)gy=5;
  if(p.id==='h'&&gx>=8&&gx<=11)gy=18;
  if(p.id==='h'&&gx>=26)gy=21;
  if(p.id==='i'&&gy===13&&gx>=9&&gx<=13)gy=14;
  if(p.id==='i'&&gy>=20&&gy<=22)gx=13;
  if(p.id==='j'&&gx>=26)gy=22;
  return Object.freeze([gx,gy]);
 }),
 names:p.names.split('|')
})));
const stationRows={...BASE_STATIONS};
const byCoordinate=new Map(Object.entries(stationRows)
 .map(([id,s])=>[s.gx+','+s.gy,id]));
const allLineRows=[...BASE_LINES];
for(const corridor of CORRIDORS){
 if(corridor.points.length!==corridor.names.length)
  throw Error('Authored metro labels mismatch: '+corridor.id);
 const stops=corridor.points.map(([gx,gy],i)=>{
  if(gx<0||gx>GRID.columns||gy<0||gy>GRID.rows)
   throw Error('Subway station outside the mapped city: '+corridor.id);
  const key=gx+','+gy;
  if(byCoordinate.has(key))return byCoordinate.get(key);
  const id='kh-'+corridor.id+'-'+String(i+1).padStart(2,'0');
  if(Object.values(stationRows).some(row=>row.label===corridor.names[i]))
   throw Error('Duplicate station name: '+corridor.names[i]);
  stationRows[id]={label:corridor.names[i],gx,gy};
  byCoordinate.set(key,id);
  return id;
 });
 allLineRows.push({id:corridor.id,name:corridor.name,color:corridor.color,
  stops,ring:false});
}
const servedBy=new Map();
for(const line of allLineRows){
 if(new Set(line.stops).size!==line.stops.length)throw Error('Repeated station on line '+line.id);
 for(const id of line.stops){
  if(!servedBy.has(id))servedBy.set(id,[]);
  servedBy.get(id).push(line.id);
 }
}
const GRID_STATIONS=Object.freeze(Object.fromEntries(Object.entries(stationRows)
 .map(([id,station])=>[id,Object.freeze({...station,
  transfer:(servedBy.get(id)?.length||0)>1,
  lines:Object.freeze(servedBy.get(id)||[])})])));
const STATIONS=Object.freeze(Object.fromEntries(Object.entries(GRID_STATIONS)
 .map(([id,station])=>[id,Object.freeze({...station,
  x:station.gx/GRID.columns*100,
  y:station.gy/GRID.rows*100})])));
const LINES=Object.freeze(allLineRows.map(line=>Object.freeze({...line,
 stops:Object.freeze(line.stops.slice())})));
if(LINES.length!==10||Object.keys(STATIONS).length!==170)
 throw Error('Kirihama metro plan must contain exactly 10 lines and 170 physical stations');
const getLine=id=>LINES.find(l=>l.id===id)||null;
function neighbors(line,station){
 if(!line||line.locked)return [];
 const i=line.stops.indexOf(station);
 if(i<0)return [];
 const n=line.stops.length;
 const forward=i+1<n?line.stops[i+1]:line.ring?line.stops[0]:null;
 const backward=i>0?line.stops[i-1]:line.ring?line.stops[n-1]:null;
 return [{direction:1,to:forward},{direction:-1,to:backward}]
  .filter(x=>!!x.to).map(x=>({
    ...x,name:STATIONS[x.to]?.label||x.to,
    label:(line.ring?(x.direction===1?'顺时针 · ':'逆时针 · '):'')+
      '往 '+(STATIONS[x.to]?.label||x.to)+' 方向'
  }));
}
function nextStop(lineId,station,direction){
 return neighbors(getLine(lineId),station).find(x=>x.direction===direction)?.to||null;
}
function boardingChoices(station){
 if(!STATIONS[station]||STATIONS[station].locked)return [];
 return LINES.filter(l=>!l.locked&&l.stops.includes(station))
   .map(line=>({...line,directions:neighbors(line,station)}));
}
function path(from,to){
 if(!STATIONS[from]||!STATIONS[to]||STATIONS[to].locked)return null;
 if(from===to)return {from,to,stops:[from],segments:[],transfers:[],lines:[],connections:0};
 const q=[{at:from,line:null,cost:0,stops:[from],segments:[],transfers:[]}];
 const best=new Map();
 while(q.length){
   q.sort((a,b)=>a.cost-b.cost);
   const current=q.shift();
   const key=current.at+'|'+(current.line?.id||'');
   if(best.has(key)&&best.get(key)<=current.cost)continue;
   best.set(key,current.cost);
   if(current.at===to)return {from,to,stops:current.stops,segments:current.segments,
    transfers:current.transfers,lines:[...new Set(current.segments.map(v=>v.line.name))],
    connections:current.segments.length};
   for(const line of LINES){
     if(line.locked||!line.stops.includes(current.at))continue;
     for(const direction of neighbors(line,current.at)){
       const change=!!current.line&&current.line.id!==line.id;
       q.push({at:direction.to,line,cost:current.cost+1+(change?4:0),
        stops:[...current.stops,direction.to],
        segments:[...current.segments,{from:current.at,to:direction.to,line}],
        transfers:change?[...current.transfers,current.at]:current.transfers});
     }
   }
 }
 return null;
}
const TRANSIT_TALK=Object.freeze({
 everyday:[
  ['上班族','今天这趟车比平时空了些。','高中生','是啊，可能大家都改坐上一班了。'],
  ['学生','我作业还没写完呢。','学生','等到学校再补应该来得及吧。'],
  ['乘客','社区公园那边这两天在修路。','乘客','希望别耽误末班车。']
 ],
 strange:[
  ['乘客','昨天晚上的站台上好像多了块牌子。','上班族','别是广告贴错了吧。'],
  ['高中生','有人拍到站牌上多出一站。','高中生','先别传，可能是剪辑。'],
  ['乘客','街口摄像头又坏了？','乘客','公告说还在检修。']
 ],
 alert:[
  ['乘客','听说有几条线路要临时改道。','工作人员','请留意站内通知。'],
  ['学生','学校群又有人发那个视频。','学生','老师让我们别单独出门。'],
  ['上班族','新闻说调查组已经到了。','乘客','但他们还没公布具体原因。']
 ]
});
function conversation(snapshot,route){
 const stage=Number(snapshot?.stage)||1;
 const bank=stage<=1?'everyday':stage<=2?'strange':'alert';
 const collection=TRANSIT_TALK[bank];
 const chosen=collection[((Number(snapshot?.day)||1)+
   (route.connections||0)+(route.transfers?.length||0))%collection.length];
 return [
  {speaker:chosen[0],text:chosen[1]},
  {speaker:chosen[2],text:chosen[3]},
  {speaker:'车厢新闻屏',text:snapshot?.news?.[0]||'请注意车厢内的广播。'}
 ];
}
global.PaperWorldMetro=Object.freeze({
 GRID,STATIONS,LINES,getLine,neighbors,nextStop,boardingChoices,path,conversation
});
})(window);
