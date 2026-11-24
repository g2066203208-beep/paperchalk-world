// V10 simplified muscle path and constant-volume belly proxy, not a validated anatomical FEM.
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,s)=>a.map(x=>x*s),mix=(a,b,t)=>add(mul(a,1-t),mul(b,t)),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),len=a=>Math.hypot(...a),unit=a=>mul(a,1/Math.max(1e-8,len(a))),cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),rad=x=>x*Math.PI/180;
const rx=(p,a)=>[p[0],p[1]*Math.cos(a)-p[2]*Math.sin(a),p[1]*Math.sin(a)+p[2]*Math.cos(a)],rz=(p,a)=>[p[0]*Math.cos(a)-p[1]*Math.sin(a),p[0]*Math.sin(a)+p[1]*Math.cos(a),p[2]];
// Each muscle has a rest polyline of pelvis/femur/tibia attachments.
// For biarticular muscles the patellar or posterior knee guide follows the hinge.
// A fixed path allowance approximates curved tendon and fiber paths.
const definitions=[
 {name:'gluteus_maximus',nodes:[[.15,1.53,-.15,'pelvis'],[.21,1.27,-.12,'femur'],[.20,1.16,-.07,'femur']],radius:.10,path:.14,coupling:.65,wrap:.045},
 {name:'rectus_femoris',nodes:[[.15,1.49,.10,'pelvis'],[.12,1.04,.08,'femur'],[.10,.918,.075,'patella'],[.10,.83,.05,'tibia']],radius:.083,path:.15,coupling:.6,wrap:0},
 {name:'vasti_group',nodes:[[.15,1.27,.025,'femur'],[.11,1.01,.065,'femur'],[.10,.918,.075,'patella'],[.10,.83,.05,'tibia']],radius:.09,path:.10,coupling:.5,wrap:0},
 {name:'adductor_group',nodes:[[.045,1.33,.005,'pelvis'],[.075,1.03,-.015,'femur']],radius:.073,path:.14,coupling:.5,wrap:0},
 {name:'hamstrings_group',nodes:[[.115,1.32,-.12,'pelvis'],[.115,1.04,-.075,'femur'],[.10,.918,-.06,'femur'],[.11,.81,-.04,'tibia']],radius:.084,path:.18,coupling:.55,wrap:.035},
 {name:'iliopsoas',nodes:[[.09,1.65,.04,'pelvis'],[.11,1.38,.07,'pelvis'],[.10,1.24,-.015,'femur']],radius:.063,path:.22,coupling:.25,wrap:0}
];
function lengthOf(a){return a.slice(1).reduce((s,p,i)=>s+len(sub(p,a[i])),0)}
function closest(nodes,p){let best={dist:Infinity,j:0,t:0};for(let j=0;j<nodes.length-1;j++){let axis=sub(nodes[j+1],nodes[j]),t=cl(dot(sub(p,nodes[j]),axis)/Math.max(1e-8,dot(axis,axis))),c=mix(nodes[j],nodes[j+1],t),dist=len(sub(p,c));if(dist<best.dist)best={dist,j,t}}return best}
export function muscleSolve(M,P,p,gain=.3){
 let Q=P.map(q=>q.slice()),stats=[],delta=Q.map(()=>[0,0,0]);
 for(let sign of [1,-1]){let side=sign===1?'r':'l',ha=rad(p['h'+side]||0),ka=rad(p['k'+side]||0),H=[sign*.145,1.36,0],K=[sign*.1,.918,0];
 let transform=(node,h,k)=>{let [x,y,z,frame]=node,q=[sign*x,y,z];if(frame==='pelvis')return q;if(frame==='tibia'||frame==='patella')q=add(K,rx(sub(q,K),frame==='patella'?k*.5:k));return add(H,rx(rz(sub(q,H),sign*rad(7)),-h))};
 for(let m of definitions){let rest=m.nodes.map(n=>transform(n,0,0)),nodes=m.nodes.map(n=>transform(n,ha,ka)),L0=lengthOf(rest)+m.path,L=lengthOf(nodes)+m.path+m.wrap*Math.max(0,ha),r=m.radius*Math.sqrt(L0/L);stats.push({name:m.name,side,restNodes:rest,nodes,L0,L,r0:m.radius,r,volumeRatio:L*r*r/(L0*m.radius*m.radius)});
 for(let i=0;i<Q.length;i++){let v=M.positions[i],z=M.zones[i];if((z!==0&&z!==(sign===1?3:4))||sign*v[0]<-.001||v[1]<1.03||v[1]>1.74)continue;if(z===0&&v[1]<1.29)continue;let {dist,j,t}=closest(rest,v),progress=(j+t)/(rest.length-1),mask=Math.exp(-(((dist-m.radius)/.08)**2))*Math.sin(Math.PI*progress)**2;if(z===0)mask*=.35;let n=unit(sub(Q[i],mix(nodes[j],nodes[j+1],t)));delta[i]=add(delta[i],mul(n,(r-m.radius)*mask*m.coupling*gain))}
 }}
 for(let i=0;i<Q.length;i++){let d=delta[i],l=len(d);Q[i]=add(Q[i],l>.025?mul(d,.025/l):d)}return {positions:Q,stats,peakSkinOffset:Math.max(...delta.map(len))};
}
