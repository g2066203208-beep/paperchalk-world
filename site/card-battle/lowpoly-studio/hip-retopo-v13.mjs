// V13: rebuild the two saddle-to-thigh patches as explicit quad lofts.
// Rest and seated target share the same topology. No muscle simulation.
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,s)=>a.map(x=>x*s),mix=(a,b,t)=>add(mul(a,1-t),mul(b,t)),len=a=>Math.hypot(...a);
const R={A:[148,147,163,153,152,151,150,149],B:[226,227,160,228,229,230,162,231],C:[232,233,398,234,235,236,396,237],U:[544,545,551,550,549,548,547,546],L:[552,553,559,558,557,556,555,554]};
const L={A:[158,147,163,153,154,155,156,157],B:[342,343,159,344,345,346,161,347],C:[348,349,399,350,351,352,397,353],U:[561,560,567,566,565,564,563,562],L:[569,568,575,574,573,572,571,570]};
export function rebuild(M,T,opt={}){
 let N={...M,positions:M.positions.map(p=>p.slice()),uv:M.uv.map(p=>p.slice()),zones:M.zones.slice(),polygons:[],origFace:[]},P=T.positions.map(p=>p.slice()),a=opt.a??.85,cy=opt.cy??.14,cz=opt.cz??-.03,tilt=(opt.tilt??-42)*Math.PI/180;
 const rot=p=>[p[0],cy+(p[1]-1.36)*Math.cos(tilt)-p[2]*Math.sin(tilt),cz+(p[1]-1.36)*Math.sin(tilt)+p[2]*Math.cos(tilt)];
 // Keep pelvis volume as a rotated shape; compress anterior lower abdomen separately.
 for(let i=135;i<=158;i++){let rest=M.positions[i],q=rot(rest);if(rest[2]>.02){q[2]-=(opt.front??.13)*Math.min(1,rest[2]/.18);q[1]+=(opt.up??.035)*Math.min(1,rest[2]/.18)}P[i]=mix(P[i],q,a)}
 P[163]=mix(P[163],[0,cy*.40,cz+.035],a);
 for(let {i,a,b,t,type} of M.hipParents)if(type===0)P[i]=mix(P[a],P[b],t);
 let omit=new Set([...R.U,...R.L,...R.B,...L.U,...L.L,...L.B]);
 for(let [i,f] of M.polygons.entries())if(!f.some(v=>omit.has(v))){N.polygons.push(f.slice());N.origFace.push(M.origFace[i])}
 let tags=[];
 for(let [side,S] of [[1,R],[-1,L]]){let tvals=[.16,.32,.5,.68,.84],rings=[S.A,S.U,[],S.B,[],S.L,S.C];
 for(let r of [2,4])for(let j=0;j<8;j++){rings[r].push(N.positions.length);N.positions.push([0,0,0]);N.uv.push([0,0]);N.zones.push(side===1?3:4);P.push([0,0,0])}
 for(let j=0;j<8;j++){
  let A=S.A[j],B=S.B[j],C=S.C[j],ra=M.positions[A],rb=M.positions[B],rc=M.positions[C],pa=P[A],pc=P[C];
  let mid=mix(pa,pc,.5),bulge=opt.bulge??.06,front=j<=1||j===7,back=j>=3&&j<=5;
  // Retain gluteal curvature in the seated patch; front crease folds locally.
  let offset=[side*(j===5||j===6||j===7?bulge*.32:0),back?-bulge:front?bulge*.18:0,back?-bulge*.35:front?-(opt.crease??.025):0];
  let pb=add(mid,offset);if(j===2)pb[0]=side*Math.max(.012,Math.abs(pb[0]));
  for(let [k,t] of tvals.entries()){let i=rings[k+1][j],w=4*t*(1-t);N.positions[i]=add(mix(ra,rc,t),mul(sub(rb,mix(ra,rc,.5)),w));P[i]=add(mix(pa,pc,t),mul(sub(pb,mid),w));N.uv[i]=mix(M.uv[A],M.uv[C],t);N.zones[i]=side===1?3:4;tags.push({id:i,side:side===1?'R':'L',sector:j,ring:k+1,pelvisWeight:1-t,thighWeight:t})}
 }
 for(let k=0;k<rings.length-1;k++)for(let j=0;j<8;j++){let n=(j+1)%8,quad=[rings[k][j],rings[k][n],rings[k+1][n],rings[k+1][j]];if(side===-1)quad.reverse(); // orientation corrected against original boundary below
 N.polygons.push(quad);N.origFace.push(10000+tags.length+k*8+j)}
 }
 // Orient patch faces consistently along all shared edges.
 let edge=new Map();for(let [fi,f] of N.polygons.entries())for(let j=0;j<4;j++){let a=f[j],b=f[(j+1)%4],k=[a,b].sort((a,b)=>a-b).join(':');(edge.get(k)||edge.set(k,[]).get(k)).push({fi,a,b})}
 let adj=N.polygons.map(()=>[]);for(let arr of edge.values())if(arr.length===2){let [a,b]=arr;adj[a.fi].push([b.fi,a.a===b.a]);adj[b.fi].push([a.fi,a.a===b.a])}let seen=new Map([[0,false]]),q=[0];while(q.length){let i=q.pop();for(let [j,flip] of adj[i])if(!seen.has(j)){seen.set(j,seen.get(i)!==flip);q.push(j)}}for(let [i,f] of N.polygons.entries())if(seen.get(i))f.reverse();
 N.triangles=N.polygons.flatMap(f=>[[f[0],f[1],f[2]],[f[0],f[2],f[3]]]);N.patchBindings=tags;return {mesh:N,target:{...T,positions:P},boundaryEdges:[...edge.values()].filter(a=>a.length!==2).length}
}
