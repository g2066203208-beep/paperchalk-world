// Experimental local contact projection; fixed thigh shafts never move.
const sub=(a,b)=>a.map((x,i)=>x-b[i]),add=(a,b)=>a.map((x,i)=>x+b[i]),mul=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),len=a=>Math.hypot(...a),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function solveContact(M,P,check,steps=12,cap=.05){
 let Q=P.map(p=>p.slice()),mob=M.positions.map((p,i)=>M.mobile[i]?1:0);
 let faces=M.polygons,neighbors=Q.map(()=>new Set());for(let f of faces)for(let i=0;i<4;i++){neighbors[f[i]].add(f[(i+1)%4]);neighbors[f[(i+1)%4]].add(f[i])}
 let prev=check(M,Q),initial=prev.pairs.length,score=r=>r.pairs.length+2*r.folds.length+4*r.deg;
 for(let pass=0;pass<steps&&prev.pairs.length;pass++){
 let d=Q.map(()=>[0,0,0]),counts=Q.map(()=>0);
 for(let pair of prev.pairs){
 let a=faces[pair.actual[0]],b=faces[pair.actual[1]];
 let ma=a.reduce((s,i)=>s+mob[i],0)/4,mb=b.reduce((s,i)=>s+mob[i],0)/4;if(!ma&&!mb)continue;
 let axes=[];for(let f of [a,b]){axes.push(cross(sub(Q[f[1]],Q[f[0]]),sub(Q[f[3]],Q[f[0]])))}
 for(let i=0;i<4;i++)for(let j=0;j<4;j++){let ea=sub(Q[a[(i+1)%4]],Q[a[i]]),eb=sub(Q[b[(j+1)%4]],Q[b[j]]);axes.push(cross(ea,eb))}
 let best=null;for(let v of axes){let l=len(v);if(l<1e-8)continue;let n=mul(v,1/l),pa=a.map(i=>dot(Q[i],n)),pb=b.map(i=>dot(Q[i],n));let x=Math.max(...pa)-Math.min(...pb),y=Math.max(...pb)-Math.min(...pa);if(x<-.0001||y<-.0001)continue;let penetration=Math.min(x,y)+.0015,dir=x<y?-1:1;if(!best||penetration<best.penetration)best={penetration,axis:mul(n,dir)}}
 if(!best)continue;let shift=Math.min(.022,best.penetration)/(ma+mb);
 for(let [f,sgn] of [[a,1],[b,-1]])for(let i of f)if(mob[i]){d[i]=add(d[i],mul(best.axis,shift*sgn));counts[i]++}
 }
 d=d.map((v,i)=>counts[i]?mul(v,1/counts[i]):v);
 let propagated=d.map((v,i)=>{if(!mob[i])return [0,0,0];let nb=[...neighbors[i]].filter(j=>mob[j]);let avg=nb.length?mul(nb.reduce((s,j)=>add(s,d[j]),[0,0,0]),1/nb.length):[0,0,0];return add(mul(v,.85),mul(avg,.15))});
 let winner=null;for(let alpha of [1,.5,.25]){let candidate=Q.map((q,i)=>{let v=add(q,mul(propagated[i],alpha)),off=sub(v,P[i]),l=len(off);return l>cap?add(P[i],mul(off,cap/l)):v});let r=check(M,candidate);if(score(r)<score(prev)&&(!winner||score(r)<score(winner.r)))winner={candidate,r}}
 if(!winner)break;Q=winner.candidate;prev=winner.r;
 }
 return {positions:Q,initialPairs:initial,finalPairs:prev.pairs.length,folds:prev.folds.length,maxOffset:Math.max(...Q.map((q,i)=>len(sub(q,P[i]))))};
}