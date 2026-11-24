// V46 knee V5: experimental local flexion, original quad topology preserved.
// Front patellar patch is a separate rigid transform; posterior only is compressed.
export function knee(M,deg,side=0){
 if(!Number.isFinite(deg)||deg<0||deg>145)throw new RangeError('Knee flexion 0–145°');
 const K=[(side?-1:1)*.1,.918,0],angle=deg*Math.PI/180,h=angle/2,o=side*116,z=side+3;
 const rot=(p,a)=>{let y=p[1]-K[1],d=p[2];return [p[0],K[1]+y*Math.cos(a)-d*Math.sin(a),y*Math.sin(a)+d*Math.cos(a)]};
 const ring=j=>[...Array.from({length:6},(_,i)=>226+o+j*6+i),...(j?[396+4*(j-1)+side,398+4*(j-1)+side]:[])];
 let idx=new Map();for(let j=1;j<=5;j++)ring(j).forEach(i=>idx.set(i,j));
 for(let j=1;j<5;j++)for(let a of ring(j))for(let b of ring(j+1)){let f=j===2?.4375:.5625;let p=M.positions[a].map((v,k)=>v+(M.positions[b][k]-v)*f);let i=M.positions.findIndex((q,i)=>i>=440&&M.zones[i]===z&&q.every((v,k)=>Math.abs(v-p[k])<1e-9));if(i>=0)idx.set(i,j+.5)}
 return M.positions.map((p,i)=>{
  if(M.zones[i]!==z||!deg)return p.slice();
  let j=idx.get(i),y=p[1]-K[1];
  if(j===undefined)return y<-.13?rot(p,angle):p.slice();
  let q=p.slice(),front=p[2]>.035,a=j<3?0:j>3?angle:h;
  if(j===3){a=h;if(!front){q[1]=K[1]+(q[1]-K[1])*(1-Math.min(1,deg/25)**2*(3-2*Math.min(1,deg/25)));q[2]*=1-.45*Math.sin(h)**2;}}
  else if(j===2.5||j===3.5){let f=front?.4:Math.max(0,Math.min(.4,(p[2]+.05)*2));a=j===2.5?h*f:angle-h*f}
  // Keep rear surfaces on the proper side of the hinge bisector, not the whole ring.
  if(p[2]<0&&j!==3){let upper=j<3,delta=upper?a:angle-a,theta=h-delta;if(theta>.0001){let maxR=Math.max(.003,(Math.abs(y)*Math.cos(theta)-.002*Math.sin(h))/Math.sin(theta));q[2]=Math.max(q[2],-maxR)}}
  return rot(q,a);
 });
}
export function pose(M,right,left){let R=knee(M,right,0),L=knee(M,left,1);return R.map((p,i)=>M.zones[i]===4?L[i]:p)}
export function auditRigid(M,P,side){
 const o=side*116,s=side?4:3, groups={patella:[244+o,245+o,249+o],thighAnterior:M.positions.map((p,i)=>i).filter(i=>M.zones[i]===s&&M.positions[i][1]>1.07&&M.positions[i][2]>=0),distalShinFoot:M.positions.map((p,i)=>i).filter(i=>M.zones[i]===s&&M.positions[i][1]<.65)};
 let out={};for(let [name,ids] of Object.entries(groups)){let err=0;for(let a of ids)for(let b of ids){let d=Math.hypot(...M.positions[a].map((x,k)=>x-M.positions[b][k]));if(d>1e-8)err=Math.max(err,Math.abs(Math.hypot(...P[a].map((x,k)=>x-P[b][k]))/d-1))}out[name]={vertices:ids.length,maxRelativeError:err}}return out;
}
