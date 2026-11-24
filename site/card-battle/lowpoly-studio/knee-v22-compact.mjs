// Compact hinge: anterior patella rigid, distal tibia exact rigid motion.
// A pose-dependent posterior tibial translation is experimental, not a biological simulation.
const cl=x=>Math.max(0,Math.min(1,x)),sm=x=>{x=cl(x);return x*x*(3-2*x)};
export function bind(M,B,o){return M.positions.map((p,i)=>{let side=M.zones[i]===3?'R':M.zones[i]===4?'L':null;if(!side||p[1]>1.23)return {...B[i],active:false};let y=p[1],z=p[2],f=sm((z+.025)/.075),u=o.upper,l=o.lower,k=.918,t=y>=k?.5*cl((u-y)/(u-k)):.5+.5*cl((k-y)/(k-l));let h=sm((z-.005)/.055)*(1-sm((Math.abs(y-k)-.032)/.04));if(t===0||t===1)h=0;return {...B[i],active:true,side,t,h,f,locked:t===0||t===1||h===1,owner:t===0?'thigh_'+side:t===1?'shin_'+side:h===1?'patella_'+side:'transition_'+side,weights:Object.fromEntries(Object.entries({['thigh_'+side]:(1-h)*(1-t),['shin_'+side]:(1-h)*t,['patella_'+side]:h}).filter(([k,v])=>v>1e-12))}})}
export function pose(M,B,deg,o){let a=deg*Math.PI/180,cy=.918,pz=o.pivot,fac=Math.sin(a/2)**2,dy=o.dy*fac,dz=-o.dz*fac;return M.positions.map((p,i)=>{let b=B[i];if(!b.active||!deg||b.t===0)return p.slice();let t=b.t,h=b.h,w=t*(1-h)+h*.5,theta=a*w,y=p[1]-cy,z=p[2]-pz;
if(t<1&&h<1){let rear=(1-b.f)*Math.sin(Math.PI*t)*fac;z+=o.rear*rear;}
// patella translation is shared for every rigid anterior vertex.
let translate=t*(1-h)+h*.5,rad=o.slide*fac*h;
return [p[0],cy+y*Math.cos(theta)-(z+rad)*Math.sin(theta)+dy*translate,pz+y*Math.sin(theta)+(z+rad)*Math.cos(theta)+dz*translate]})}
