// V20: entire calf, ankle and foot share one rigid transform in isolated knee flexion.
// No posterior calf compression; no blend into ring 4. Ankle is neutral in this test.
export function bindShin(B){return B.map(v=>v.ring>=4?{...v,w:1,owner:'shin_'+(v.side?'L':'R'),locked:true,weights:{['shin_'+(v.side?'L':'R')]:1}}:v)}
export function rigidShin(M,B,deg,opt,bend,hardKnee,controlled){let P=controlled(M,B,deg,{...opt,calfContact:false,lower:1},bend,hardKnee),a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a),pz=opt.pivotZ;for(let v of B)if(v.ring>=4){let p=M.positions[v.id],y=p[1]-.918,z=p[2]-pz;P[v.id]=[p[0],.918+y*c-z*s,pz+y*s+z*c]}return P}
