// V12 explicit vertex binding: persistent named bone weights and mesh adjacency.
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),len=a=>Math.hypot(...a),cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),rad=x=>x*Math.PI/180;
const blend=(a,b,t)=>{let r={};for(let [k,v] of Object.entries(a))r[k]=(r[k]||0)+v*(1-t);for(let [k,v] of Object.entries(b))r[k]=(r[k]||0)+v*t;return Object.fromEntries(Object.entries(r).filter(([k,v])=>v>1e-8))};
export function bindings(M,D){
 let W=[],regions=[],parents=new Map(M.hipParents.map(p=>[p.i,p])),edges=new Map(),nb=M.positions.map(()=>new Set()),faces=M.positions.map(()=>[]);
 for(let f of D.polygons)for(let j=0;j<4;j++){let a=f[j],b=f[(j+1)%4],key=[a,b].sort((a,b)=>a-b).join(':');edges.set(key,[a,b])}
 function assign(i){let p=M.positions[i],z=M.zones[i],side=z===1||z===3?'R':'L',bone=(k)=>k+'_'+side;
 if(z===1||z===2){let k=i-(z===1?164:280),j=Math.floor(k/6);if(j<=1)return [blend({chest:1},{[bone('upperArm')]:1},j===0?.3:.94),'shoulder'];if(j===2)return [{[bone('upperArm')]:1},'upperArm'];if(j===3)return [blend({[bone('upperArm')]:1},{[bone('forearm')]:1},.5),'elbow'];if(j===4)return [{[bone('forearm')]:1},'forearm'];if(j===5)return [blend({[bone('forearm')]:1},{[bone('hand')]:1},.5),'wrist'];return [{[bone('hand')]:1},'hand']}
 if(z>=3){let k=i-(z===3?226:342),j=i>=396?Math.floor((i-396)/4)+1:Math.floor(k/6);if(i===161||i===162)j=0;if(j<=0)return [blend({pelvis:1},{[bone('thigh')]:1},i===161||i===162?.35:.75),'hip'];if(j<=2)return [{[bone('thigh')]:1},'thigh'];if(j===3)return [blend({[bone('thigh')]:1},{[bone('shin')]:1},.5),'knee'];if(j<=5)return [{[bone('shin')]:1},'shin'];if(j===6)return [blend({[bone('shin')]:1},{[bone('foot')]:1},.5),'ankle'];return [{[bone('foot')]:1},'foot']}
 if(i<=98)return [{head:1},'head'];if(i>=147&&i<=163)return [{pelvis:1},'pelvis'];let t=cl((p[1]-1.38)/.43);return [blend({pelvis:1},{chest:1},t),t<.5?'abdomen':'torso'];
 }
 for(let i=0;i<M.positions.length;i++){if(i<440){let [w,r]=assign(i);W.push(w);regions.push(r);continue}let p=parents.get(i);if(!p){for(let [a,b] of edges.values()){let u=sub(M.positions[b],M.positions[a]),t=dot(sub(M.positions[i],M.positions[a]),u)/dot(u,u);if(t>0&&t<1&&len(sub(M.positions[i],add(M.positions[a],mul(u,t))))<1e-8){p={a,b,t};break}}}if(!p)throw Error('Unresolved refined vertex '+i);W.push(blend(W[p.a],W[p.b],p.t));regions.push(regions[p.a]===regions[p.b]?regions[p.a]:regions[p.a]+'|'+regions[p.b]);}
 M.polygons.forEach((f,fi)=>f.forEach((a,j)=>{let b=f[(j+1)%4];nb[a].add(b);nb[b].add(a);faces[a].push(fi)}));
 return M.positions.map((p,i)=>({id:i,rest:p,region:regions[i],weights:W[i],neighbors:[...nb[i]].sort((a,b)=>a-b),faces:faces[i],mobility: Object.keys(W[i]).length===1?0:1}));
}
const qm=(a,b)=>[a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]],qc=q=>[q[0],-q[1],-q[2],-q[3]],qr=(q,p)=>qm(qm(q,[0,...p]),qc(q)).slice(1),axis=(k,a)=>[Math.cos(a/2),...[0,1,2].map(i=>i===k?Math.sin(a/2):0)];
export function skeleton(p){let B={pelvis:{q:[1,0,0,0],t:[0,0,0],parent:null,pivot:[0,1.36,0]}};
 function bone(name,parent,pivot,q){let b=B[parent],t=sub(pivot,qr(q,pivot));B[name]={q:qm(b.q,q),t:add(qr(b.q,t),b.t),parent,pivot}}
 bone('chest','pelvis',[0,1.36,0],qm(axis(1,rad(p.twist||0)),axis(0,rad(p.pitch||0))));bone('head','chest',[0,2.06,0],axis(0,0));
 for(let [s,k] of [[1,'r'],[-1,'l']]){let side=k.toUpperCase(),n=x=>x+'_'+side,ha=rad(p['h'+k]||0),sa=rad(p['s'+k]||0);
 bone(n('thigh'),'pelvis',[s*.145,1.36,0],qm(axis(0,-ha),axis(2,s*rad(7*cl(Math.abs(ha)/.7)))));
 bone(n('shin'),n('thigh'),[s*.1,.918,0],axis(0,rad(p['k'+k]||0)));
 bone(n('foot'),n('shin'),[s*.105,.44,0],axis(0,rad(p['a'+k]||0)));
 bone(n('upperArm'),'chest',[s*.205,1.965,0],qm(axis(0,-sa),axis(2,s*rad(p['b'+k]||0))));
 bone(n('forearm'),n('upperArm'),[s*.272,1.695,0],axis(0,-rad(p['e'+k]||0)));
 bone(n('hand'),n('forearm'),[s*.365,1.465,.019],axis(0,-rad(p['w'+k]||0)));
 }return B
}
function pointDQ(v,B){let r=[0,0,0,0],d=[0,0,0,0],first=null;for(let [name,w] of Object.entries(v.weights)){let b=B[name],q=b.q;if(!first)first=q;let sign=dot(q,first)<0?-1:1;q=mul(q,sign);r=add(r,mul(q,w));d=add(d,mul(qm([0,...b.t],q),w*.5))}let l=len(r);r=mul(r,1/l);d=mul(d,1/l);d=sub(d,mul(r,dot(r,d)));return add(qr(r,v.rest),mul(qm(d,qc(r)).slice(1),2))}
export function deform(M,V,p,passes=12){let B=skeleton(p),P=V.map(v=>pointDQ(v,B)),Q=P.map(v=>v.slice()),E=[];for(let v of V)for(let j of v.neighbors)if(j>v.id&&(v.mobility||V[j].mobility))E.push([v.id,j,len(sub(v.rest,V[j].rest))]);for(let pass=0;pass<passes;pass++){for(let [i,j,L] of E){let a=V[i].mobility,b=V[j].mobility,d=sub(Q[j],Q[i]),l=len(d);if(l<1e-8||L<1e-8)continue;let err=l-cl(l,L*.6,L*1.35),v=mul(d,.6*err/l/(a+b));Q[i]=add(Q[i],mul(v,a));Q[j]=sub(Q[j],mul(v,b))}for(let v of V)if(v.mobility)Q[v.id]=add(mul(Q[v.id],.96),mul(P[v.id],.04))}
 let dy=.3213431245877313-Math.min(...Q.map(q=>q[1]))+(p.lift||0);Q=Q.map(q=>add(q,[0,dy,0]));let modules=Object.fromEntries(Object.entries(M.modules).map(([k,m])=>[k,{...m,positions:m.positions.map(rest=>add(pointDQ({rest,weights:{head:1}},B),[0,dy,0]))}]));return{positions:Q,modules,bones:B,params:p}
}
