/* Paperchalk World / transport network: authored route data, not a map image.
   A visual line is also a clickable, directional, physical train service.
   "Ring" is a true closed route: it has no artificial terminal. */
(function(global){
'use strict';
// Visual station coordinates form a deliberately legible orthogonal
// schematic. The authored graph/topology remains unchanged; this is NOT
// physical street geography. Route corners are built separately.
const STATIONS=Object.freeze({
 entrance:{label:'住宅前',x:11,y:41},
 school:{label:'学园前',x:26,y:41},
 central:{label:'中央换乘站',x:42,y:41,transfer:true},
 convenience:{label:'商业街',x:87,y:41},
 cafe:{label:'咖啡街',x:29,y:61},
 park:{label:'河岸公园',x:49,y:79},
 mall:{label:'中央商场',x:74,y:79},
 northgate:{label:'北街口',x:69,y:18},
 hospital:{label:'医院前',x:13,y:91,locked:true},
 station:{label:'南站',x:28,y:91,locked:true},
 police:{label:'警察署前',x:46,y:91,locked:true}
});
const LINES=Object.freeze([
 Object.freeze({id:'a',name:'住宅线',color:'#E45B70',
   stops:['entrance','school','central','convenience'],ring:false}),
 Object.freeze({id:'b',name:'环城线',color:'#7DA9DE',
   stops:['central','cafe','park','mall','convenience','northgate'],ring:true}),
 Object.freeze({id:'c',name:'南部线',color:'#AEC792',
   stops:['hospital','station','police'],ring:false,locked:true})
]);
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
 STATIONS,LINES,getLine,neighbors,nextStop,boardingChoices,path,conversation
});
})(window);
