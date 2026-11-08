/* Strict 36x26 integer subway lattice: every line turn, station and clickable
 * track segment is generated from real nodes, not an image rectangle. */
(function(global){
'use strict';
const graph=global.PaperWorldMetro;
const GRID=graph?.GRID||Object.freeze({columns:12,rows:6});
// Every SVG segment is calculated from REAL integer-lattice station nodes.
// Only two downtown loop corners require authored intermediate grid turns;
// all eight new city corridors consist of contiguous axis-aligned tracks.
const routeRows={
 'a:entrance:school':[],
 'a:school:central':[],
 'a:central:convenience':[],
 'b:central:cafe':[[15,12],[6,12]],
 'b:cafe:park':[],
 'b:park:mall':[],
 'b:mall:convenience':[],
 'b:convenience:northgate':[[22,10],[22,5]],
 'b:northgate:central':[]
};
for(const line of graph?.LINES||[]){
 for(let i=0;i<line.stops.length;i++){
  if(i===line.stops.length-1&&!line.ring)continue;
  const from=line.stops[i],to=line.stops[(i+1)%line.stops.length];
  const key=line.id+':'+from+':'+to;
  if(routeRows[key])continue;
  const a=graph.STATIONS[from],b=graph.STATIONS[to];
  if(!a||!b)throw Error('A metro edge requires two genuine stations: '+key);
  // When two authored station nodes are on different grid rows/columns,
  // make a true two-axis track via a real integer-lattice bend. Never
  // draw a diagonal line or a selected rectangular image area.
  routeRows[key]=(a.gx!==b.gx&&a.gy!==b.gy)?[[b.gx,a.gy]]:[];
 }
}
// Curated 70-stop topology retains the ORIGINAL 170-stop railway bends:
 // removed station nodes are still drawn as true grid turns, not stop buttons.
 for(const [edge,via] of Object.entries(graph?.AUTHORED_ROUTE_BENDS||{})){
  routeRows[edge]=via.map(p=>p.slice());
 }
 // The EXACT saved blueprint controls visible rounded rail geometry as well
// as station topology after reload. Orthogonalize between authored handles,
// so a dragged node never creates a diagonal or loses an editable connection.
if(graph?.ACTIVE_BLUEPRINT&&global.PaperWorldMetroMapEditor){
 const plan=graph.ACTIVE_BLUEPRINT;
 for(const line of graph.LINES){
  const pairs=global.PaperWorldMetroMapEditor.segments(line);
  for(const [from,to] of pairs){
   const k=line.id+':'+from+':'+to;
   const pts=global.PaperWorldMetroMapEditor.orthogonalPoints(plan,line.id,from,to);
   if(pts.length<2)throw Error('Saved metro blueprint contains a disconnected edge '+k);
   routeRows[k]=pts.slice(1,-1);
  }
 }
}
const routes=Object.freeze(Object.fromEntries(Object.entries(routeRows)
 .map(([key,via])=>[key,Object.freeze(via.map(point=>Object.freeze(point.slice())))])));
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
