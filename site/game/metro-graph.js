/* Paperchalk World — a shared schematic subway graph.
 * Pure data and deterministic shortest routes; no geography image baked in.
 * Named transfer nodes exist even when a station scene is not authored.
 */
(function(global){
'use strict';
const STATIONS=Object.freeze({
 entrance:{label:'住宅前',x:12,y:23},school:{label:'学园前',x:33,y:23},
 central:{label:'中央换乘站',x:53,y:23,transfer:true},
 convenience:{label:'商业街',x:79,y:23},
 cafe:{label:'咖啡街',x:40,y:53},mall:{label:'中央商场',x:68,y:53},
 park:{label:'河岸公园',x:87,y:73},
 hospital:{label:'医院前',x:14,y:74,locked:true},
 station:{label:'南站',x:41,y:74,locked:true},
 police:{label:'警察署前',x:67,y:74,locked:true}
});
const LINES=Object.freeze([
 {id:'a',name:'住宅线',color:'#B6C79D',stops:['entrance','school','central','convenience']},
 {id:'b',name:'环城线',color:'#88B5C3',stops:['central','cafe','mall','park']},
 {id:'c',name:'南部线',color:'#B4A0B9',locked:true,stops:['hospital','station','police']}
]);
function path(from,to){
 if(!STATIONS[from]||!STATIONS[to])return null;
 if(from===to)return {from,to,stops:[from],segments:[],transfers:[],lines:[],connections:0};
 const adjacency=new Map();
 function edge(a,b,line){
   if(!adjacency.has(a))adjacency.set(a,[]);
   adjacency.get(a).push({to:b,line});
 }
 for(const line of LINES){
   if(line.locked)continue;
   for(let i=0;i<line.stops.length-1;i++){
     edge(line.stops[i],line.stops[i+1],line);
     edge(line.stops[i+1],line.stops[i],line);
   }
 }
 // Dijkstra state includes line to count a real platform transfer.
 const queue=[{at:from,line:null,cost:0,nodes:[from],segments:[],transfers:[]}];
 const seen=new Map();
 while(queue.length){
   queue.sort((a,b)=>a.cost-b.cost);
   const cur=queue.shift();
   const key=cur.at+'|'+(cur.line?.id||'');
   if(seen.has(key)&&seen.get(key)<=cur.cost)continue;
   seen.set(key,cur.cost);
   if(cur.at===to){
     return {from,to,stops:cur.nodes,segments:cur.segments,
       transfers:cur.transfers,lines:[...new Set(cur.segments.map(s=>s.line.name))],
       connections:cur.segments.length};
   }
   for(const next of adjacency.get(cur.at)||[]){
     const changing=!!cur.line&&cur.line.id!==next.line.id;
     const cost=cur.cost+1+(changing?4:0);
     queue.push({at:next.to,line:next.line,cost,
       nodes:[...cur.nodes,next.to],
       segments:[...cur.segments,{from:cur.at,to:next.to,line:next.line}],
       transfers:changing?[...cur.transfers,cur.at]:cur.transfers});
   }
 }
 return null;
}
const TRANSIT_TALK=Object.freeze({
  everyday:[
   ['上班族','今天的电车比平时空了点。','高中生','听说学校附近新开了一家咖啡厅。'],
   ['学生','作业交了没有？','学生','别提醒我，我在电车上补呢。'],
   ['乘客','今早的路口又在施工。','乘客','好像这周已经修过两次了。']
  ],
  strange:[
   ['乘客','昨天晚上那条路明明已经封了。','上班族','我也看到了，早上又恢复了。'],
   ['高中生','有人拍到站牌上多出一站。','高中生','先别转，可能是剪辑。'],
   ['乘客','街口摄像头又坏了？','乘客','公告说还在检修。']
  ],
  alert:[
   ['乘客','听说有几条线路要临时改道。','工作人员','请留意站内通知。'],
   ['学生','学校群又有人发那个视频。','学生','老师让我们别单独外出。'],
   ['上班族','新闻说调查组已经到了。','乘客','但他们还没公布具体原因。']
  ]
});
function conversation(snapshot,route){
 const stage=Number(snapshot?.stage)||1;
 const bank=stage<=1?'everyday':stage<=2?'strange':'alert';
 const collection=TRANSIT_TALK[bank];
 const chosen=collection[((Number(snapshot?.day)||1)+route.connections+(route.transfers?.length||0))%collection.length];
 return [
  {speaker:chosen[0],text:chosen[1]},
  {speaker:chosen[2],text:chosen[3]},
  {speaker:'车厢屏幕',text:snapshot?.news?.[0]||'下一站请留意车内广播。'}
 ];
}
global.PaperWorldMetro=Object.freeze({STATIONS,LINES,path,conversation});
})(window);
