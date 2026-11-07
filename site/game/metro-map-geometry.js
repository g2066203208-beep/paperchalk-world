/* 2026 / orthogonal metro map drafting.
 * SVG coordinates are measured in CSS pixels, NOT a stretched 100x100
 * square; this keeps every bend genuinely round on 16:9 and on phones.
 * Route geometry and rail graph use the same station IDs, but this file
 * never changes boarding, transfers or stop order.
 */
(function(global){
'use strict';
const routes=Object.freeze({
 // Residential route: a single effortless horizontal corridor.
 'a:entrance:school':[],
 'a:school:central':[],
 'a:central:convenience':[],
 // Ring train: one continuous rectilinear circuit with soft 90° bends.
 'b:central:cafe':[[42,61]],
 'b:cafe:park':[[29,79]],
 'b:park:mall':[],
 'b:mall:convenience':[[87,79]],
 'b:convenience:northgate':[[87,18]],
 'b:northgate:central':[[42,18]],
 // Future southern corridor appears as a quiet dashed line.
 'c:hospital:station':[],
 'c:station:police':[]
});
const number=n=>Number(n.toFixed(2));
function pathFor(lineId,from,to,stations,width,height,radius=19){
 const st=stations||global.PaperWorldMetro?.STATIONS;
 if(!st?.[from]||!st?.[to])return '';
 const waypoints=routes[lineId+':'+from+':'+to]||[];
 const mapPoint=p=>({x:p[0]*width/100,y:p[1]*height/100});
 const all=[[st[from].x,st[from].y],...waypoints,[st[to].x,st[to].y]]
  .map(mapPoint);
 if(all.length===2)return 'M'+number(all[0].x)+' '+number(all[0].y)+
  ' L'+number(all[1].x)+' '+number(all[1].y);
 const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
 let d='M'+number(all[0].x)+' '+number(all[0].y);
 for(let i=1;i<all.length-1;i++){
  const p=all[i-1],corner=all[i],next=all[i+1];
  const dx=corner.x-p.x,dy=corner.y-p.y;
  const ex=next.x-corner.x,ey=next.y-corner.y;
  const a=Math.hypot(dx,dy),b=Math.hypot(ex,ey);
  if(a<.5||b<.5){
   d+=' L'+number(corner.x)+' '+number(corner.y);continue;
  }
  const r=clamp(radius,0,Math.min(a,b)*.47);
  const before={x:corner.x-dx/a*r,y:corner.y-dy/a*r};
  const after={x:corner.x+ex/b*r,y:corner.y+ey/b*r};
  d+=' L'+number(before.x)+' '+number(before.y);
  // A true quarter-circle-style bend in pixel space, not a skewed SVG Q.
  d+=' Q'+number(corner.x)+' '+number(corner.y)+' '+
    number(after.x)+' '+number(after.y);
 }
 const end=all[all.length-1];
 d+=' L'+number(end.x)+' '+number(end.y);
 return d;
}
function segments(line){
 if(!line?.stops?.length)return [];
 const a=[];
 for(let i=1;i<line.stops.length;i++)a.push([line.stops[i-1],line.stops[i]]);
 if(line.ring)a.push([line.stops[line.stops.length-1],line.stops[0]]);
 return a;
}
global.PaperWorldMetroGeometry=Object.freeze({routes,pathFor,segments});
})(window);
