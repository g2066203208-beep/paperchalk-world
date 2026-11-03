/* Three-shell spherical maze topology.
 * Zero UI/Three.js dependencies: shared deterministic world rules.
 * Every open edge belongs to a connected spanning maze; daily seeds change
 * both wall topology AND spatial district identities on each shell.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(root)root.SphericalMazeCore=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const VERSION=1, LEVELS=3, DEPTH=2;
 const DISTRICTS=Object.freeze(['旧校区','居住区','医疗区','交通区','厂房区','封闭区']);
 const RADII=Object.freeze([13.8,9.9,6.1]);
 const COLORS=Object.freeze(['#7ab8b4','#e0b178','#b19dc3','#86a1bc','#ae8577','#c4be9d']);
 const AXES=Object.freeze([
  Object.freeze([0.14,1,0.19]),
  Object.freeze([0.85,-0.23,0.5]),
  Object.freeze([-0.52,0.55,0.82])
 ]);
 const normalize=v=>{
  const n=Math.hypot(...v)||1;
  return v.map(x=>x/n);
 };
 const add=(a,b)=>a.map((x,i)=>x+b[i]);
 const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
 const mean3=(a,b,c)=>normalize([0,1,2].map(i=>(a[i]+b[i]+c[i])/3));
 const key=v=>v.map(x=>Math.round(x*100000)).join(',');
 const edgeKey=(a,b)=>[key(a),key(b)].sort().join('|');
 const mkRng=seed=>{
  let v=Number(seed)>>>0||1;
  return ()=>{v^=v<<13;v^=v>>>17;v^=v<<5;return (v>>>0)/4294967296};
 };
 const randomInt=(rng,n)=>Math.floor(rng()*n);
 function shuffle(array,rng){
  for(let i=array.length-1;i>0;i--){
   const j=randomInt(rng,i+1);[array[i],array[j]]=[array[j],array[i]];
  }
  return array;
 }
 const t=(1+Math.sqrt(5))/2;
 const V=[
  [-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],
  [0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],
  [t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]
 ].map(normalize);
 const INDICES=[
  [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
  [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
  [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
  [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]
 ];
 const BASE_CENTERS=INDICES.map(([a,b,c])=>mean3(V[a],V[b],V[c]));
 function splitTriangle(a,b,c,depth,output){
  if(depth===0){output.push([a,b,c]);return;}
  const ab=normalize(add(a,b)),bc=normalize(add(b,c)),ca=normalize(add(c,a));
  splitTriangle(a,ab,ca,depth-1,output);
  splitTriangle(ab,b,bc,depth-1,output);
  splitTriangle(ca,bc,c,depth-1,output);
  splitTriangle(ab,bc,ca,depth-1,output);
 }
 function topology(detail=DEPTH){
  if(!Number.isInteger(detail)||detail<0||detail>3)throw Error('detail must be 0..3');
  const triangles=[];
  INDICES.forEach(([a,b,c])=>splitTriangle(V[a],V[b],V[c],detail,triangles));
  const cells=triangles.map((vertices,id)=>{
   const center=mean3(...vertices);
   let zone=0,best=-Infinity;
   for(let i=0;i<BASE_CENTERS.length;i++){
    const similarity=dot(center,BASE_CENTERS[i]);
    if(similarity>best){best=similarity;zone=i;}
   }
   return {id,vertices,center,zone,neighborEdges:[]};
  });
  const edgeMap=new Map();
  for(const cell of cells){
   const [[a,b,c]]= [cell.vertices];
   for(const [x,y] of [[a,b],[b,c],[c,a]]){
    const k=edgeKey(x,y);
    if(!edgeMap.has(k))edgeMap.set(k,{a:x,b:y,cells:[]});
    edgeMap.get(k).cells.push(cell.id);
   }
  }
  const edges=[];
  for(const e of edgeMap.values()){
   if(e.cells.length!==2)throw Error('sphere topology is not watertight');
   const id=edges.length;
   edges.push({id,a:e.a,b:e.b,left:e.cells[0],right:e.cells[1],
    center:normalize(add(e.a,e.b))});
   for(const cellId of e.cells)cells[cellId].neighborEdges.push(id);
  }
  if(edges.length!==cells.length*3/2)throw Error('invalid full-sphere edge count');
  return {detail,cells,edges};
 }
 const meshCache=new Map();
 function getTopology(detail=DEPTH){
  if(!meshCache.has(detail))meshCache.set(detail,topology(detail));
  return meshCache.get(detail);
 }
 function dailyAngles(day){
  if(!Number.isInteger(day)||day<1)throw Error('day must be >= 1');
  // Each new day adds an independent circular movement. Angles may exceed
  // one full revolution; Quaternion.setFromAxisAngle handles that naturally.
  const d=day-1;
  return [d*73*Math.PI/180,-d*47*Math.PI/180,d*61*Math.PI/180];
 }
 function generateLayer({day=1,layer=0,detail=DEPTH,seed=43057}={}){
  if(!Number.isInteger(day)||day<1||layer<0||layer>=LEVELS||
   !Number.isInteger(layer))throw Error('invalid world coordinates');
  const topo=getTopology(detail);
  const rng=mkRng((seed^Math.imul(day,0x45d9f3b)^Math.imul(layer+1,0x9e3779b1))>>>0);
  const visited=new Uint8Array(topo.cells.length);
  const passages=new Set();
  const stack=[randomInt(rng,topo.cells.length)];visited[stack[0]]=1;
  while(stack.length){
   const cell=topo.cells[stack[stack.length-1]];
   const candidates=[];
   for(const eid of cell.neighborEdges){
    const edge=topo.edges[eid];
    const neighbor=edge.left===cell.id?edge.right:edge.left;
    if(!visited[neighbor])candidates.push({eid,neighbor});
   }
   if(!candidates.length){stack.pop();continue;}
   const next=candidates[randomInt(rng,candidates.length)];
   visited[next.neighbor]=1;passages.add(next.eid);
   stack.push(next.neighbor);
  }
  if(visited.some(v=>v!==1))throw Error('maze is disconnected');
  // A few loops make the spherical maze navigable without eliminating
  // dead ends. Daily changes are seeded and reproducible.
  const loops=Math.round(topo.edges.length*.07);
  const candidates=shuffle(topo.edges.filter(e=>!passages.has(e.id)).map(e=>e.id),rng);
  for(let i=0;i<loops;i++)passages.add(candidates[i]);
  const districts=shuffle(
   Array.from({length:BASE_CENTERS.length},(_,i)=>(i+layer)%DISTRICTS.length),rng);
  const cells=topo.cells.map(c=>({...c,district:districts[c.zone]}));
  const edges=topo.edges.map(e=>({...e,open:passages.has(e.id)}));
  return {day,layer,radius:RADII[layer],axis:AXES[layer],
    angle:dailyAngles(day)[layer],cells,edges,passageCount:passages.size,
    wallCount:edges.length-passages.size,districts};
 }
 function reachable(layer,from,to){
  const visited=new Uint8Array(layer.cells.length),pending=[from];visited[from]=1;
  while(pending.length){
   const id=pending.pop();
   if(id===to)return true;
   for(const eid of layer.cells[id].neighborEdges){
    const edge=layer.edges[eid];
    if(!edge.open)continue;
    const other=edge.left===id?edge.right:edge.left;
    if(!visited[other]){visited[other]=1;pending.push(other);}
   }
  }
  return false;
 }
 function stats(layer){
  const zones=new Set(layer.cells.map(x=>x.zone));
  return {rooms:layer.cells.length,walls:layer.wallCount,
    passages:layer.passageCount,regions:zones.size};
 }
 return Object.freeze({VERSION,LEVELS,DEPTH,RADII,AXES,COLORS,DISTRICTS,
  normalize,dot,getTopology,generateLayer,dailyAngles,reachable,stats});
});
