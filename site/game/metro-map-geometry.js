/* Strict, square-cell metro lattice. All photos, station dots, curves and
 * route titles share the same calculated 12×6 dot matrix. */
(function(global){
'use strict';
const graph=global.PaperWorldMetro;
const GRID=graph?.GRID||Object.freeze({columns:12,rows:6});
const routes=Object.freeze({
 'a:entrance:school':[],
 'a:school:central':[],
 'a:central:convenience':[],
 'b:central:cafe':[[5,3],[4,3],[4,4]],
 'b:cafe:park':[[3,5]],
 'b:park:mall':[],
 'b:mall:convenience':[[11,5]],
 'b:convenience:northgate':[[12,2],[12,0],[9,0]],
 'b:northgate:central':[[5,1]],
 'c:hospital:station':[],
 'c:station:police':[]
});
const number=n=>Number(n.toFixed(2));
function layout(width,height){
 const w=Math.max(300,Number(width)||0),h=Math.max(160,Number(height)||0);
 const side=Math.max(15,Math.min(w*.075,64));
 const vertical=Math.max(16,Math.min(h*.08,48));
 const cell=Math.max(1,Math.min((w-side*2)/GRID.columns,
   (h-vertical*2)/GRID.rows));
 return Object.freeze({
   columns:GRID.columns,rows:GRID.rows,cell,
   originX:(w-GRID.columns*cell)*.5,
   originY:(h-GRID.rows*cell)*.5,
   width:w,height:h
 });
}
function point(col,row,space){
 const l=space;
 if(!Number.isFinite(col)||!Number.isFinite(row)||
    col<0||col>l.columns||row<0||row>l.rows)
   throw Error('Metro lattice coordinates outside strict matrix: '+col+','+row);
 return {x:l.originX+col*l.cell,y:l.originY+row*l.cell};
}
function stationPoint(station,space){
 if(!station||!Number.isInteger(station.gx)||!Number.isInteger(station.gy))
  throw Error('Station is missing integer lattice coordinates');
 return point(station.gx,station.gy,space);
}
function pathFor(lineId,from,to,stations,width,height,radius=19){
 const st=stations||global.PaperWorldMetro?.STATIONS;
 if(!st?.[from]||!st?.[to])return '';
 const via=routes[lineId+':'+from+':'+to];
 if(!via)throw Error('Unrouted metro grid edge '+lineId+' '+from+' '+to);
 const coords=[[st[from].gx,st[from].gy],...via,[st[to].gx,st[to].gy]];
 const l=layout(width,height);
 for(let i=1;i<coords.length;i++){
  const prev=coords[i-1],curr=coords[i];
  if(prev[0]!==curr[0]&&prev[1]!==curr[1])
   throw Error('Metro tracks may only follow orthogonal grid axes: '+lineId);
 }
 const all=coords.map(p=>point(p[0],p[1],l));
 const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
 let d='M'+number(all[0].x)+' '+number(all[0].y);
 for(let i=1;i<all.length-1;i++){
  const prev=all[i-1],corner=all[i],next=all[i+1];
  const dx=corner.x-prev.x,dy=corner.y-prev.y;
  const ex=next.x-corner.x,ey=next.y-corner.y;
  const a=Math.hypot(dx,dy),b=Math.hypot(ex,ey);
  if(a<.5||b<.5){
   d+=' L'+number(corner.x)+' '+number(corner.y);continue;
  }
  const bend=clamp(radius,0,Math.min(a,b)*.44);
  const before={x:corner.x-dx/a*bend,y:corner.y-dy/a*bend};
  const after={x:corner.x+ex/b*bend,y:corner.y+ey/b*bend};
  d+=' L'+number(before.x)+' '+number(before.y);
  d+=' Q'+number(corner.x)+' '+number(corner.y)+' '+
    number(after.x)+' '+number(after.y);
 }
 const last=all[all.length-1];
 d+=' L'+number(last.x)+' '+number(last.y);
 return d;
}
function segments(line){
 if(!line?.stops?.length)return [];
 const all=[];
 for(let i=1;i<line.stops.length;i++)all.push([line.stops[i-1],line.stops[i]]);
 if(line.ring)all.push([line.stops[line.stops.length-1],line.stops[0]]);
 return all;
}
global.PaperWorldMetroGeometry=Object.freeze({
 GRID,routes,layout,point,stationPoint,pathFor,segments
});
})(window);
