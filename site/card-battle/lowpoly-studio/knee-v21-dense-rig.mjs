// V21: rebind the high-density REST surface. Never interpolate an old posed mesh.
const cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=cl(x);return x*x*(3-2*x)},mix=(a,b,t)=>a+(b-a)*t;
export function bindDense(M,base,opt={}){
 let upper=opt.upper??1.10,lower=opt.lower??.78,center=.918;
 return M.positions.map((p,i)=>{let b=base[i],side=M.zones[i]===3?'R':M.zones[i]===4?'L':null;
 if(!side||p[1]>1.23)return {...b,active:false};
 let y=p[1],z=p[2],front=smooth((z+.025)/.09),t=y>=center?.5*mix(cl((upper-y)/(upper-center)),smooth((upper-y)/(upper-center)),opt.ease??.3):.5+.5*mix(cl((center-y)/(center-lower)),smooth((center-y)/(center-lower)),opt.ease??.3);
 let hard=smooth((z-.025)/.045)*(1-smooth((Math.abs(y-center)-.012)/(opt.width??.095)));
 if(y>=upper){t=0;hard=0}if(y<=lower){t=1;hard=0}
 let w={[ 'thigh_'+side ]:(1-hard)*(1-t),['patella_'+side]:hard,['shin_'+side]:(1-hard)*t};
 return {...b,active:true,side,front,hard,t,weights:Object.fromEntries(Object.entries(w).filter(([k,v])=>v>1e-12)),locked:t===0||t===1||hard===1,owner:t===0?'thigh_'+side:t===1?'shin_'+side:hard===1?'patella_'+side:'transition_'+side,rest:p.slice()};
 })
}
export function bendDense(M,B,deg,opt={}){
 let a=deg*Math.PI/180,pz=opt.pivotZ??-.075,cy=.918,slide=(opt.slide??-.035)*Math.sin(a/2)**2;
 return M.positions.map((p,i)=>{let b=B[i];if(!b.active||deg===0||b.t===0)return p.slice();
 let y=p[1]-cy,z=p[2]-pz,t=b.t,h=b.hard;
 // Quaternion skinning: rotations around the same hinge, no scale.
 let r=(1-h)*((1-t)+t*Math.cos(a/2))+h*Math.cos(a/4),s=(1-h)*t*Math.sin(a/2)+h*Math.sin(a/4),angle=2*Math.atan2(s,r);
 // Only the rear transition can compress; shin and thigh cores are immutable.
 if(t>0&&t<1&&p[2]<-.025){let influence=(1-b.front)*Math.sin(Math.PI*t)*Math.sin(a/2)**2,theta=Math.abs(a/2-angle);if(z<0){let room=Math.abs(y)*Math.cos(theta)/Math.max(.0001,Math.sin(theta));z=mix(z,Math.max(z,-Math.max(.003,room-.006)),influence)}z+= (opt.rear??.025)*influence}
 z+=h*slide;
 return [p[0],cy+y*Math.cos(angle)-z*Math.sin(angle),pz+y*Math.sin(angle)+z*Math.cos(angle)]
 })
}
