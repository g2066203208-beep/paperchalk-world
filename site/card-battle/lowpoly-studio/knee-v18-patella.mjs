// Rigid patella surface patch, shared hinge, localized rear contact only.
export function patellaBindings(M,B){return B.map((v,i)=>{let p=M.positions[i],hard=[2.5,3,3.5].includes(v.ring)&&v.sector==='front';return {...v,patella:hard,owner:hard?'patella_'+(v.side?'L':'R'):v.locked?(v.ring>=4?'shin_':'thigh_')+(v.side?'L':'R'):'knee_transition',weights:hard?{['patella_'+(v.side?'L':'R')]:1}:v.weights}})}
export function hardKnee(M,B,deg,opt,bend){let Q=bend(M,B,deg,opt),a=deg*Math.PI/180,theta=a*(opt.patellaFollow??.5),pz=opt.pivotZ??-.07,radial=(opt.slide??0)*Math.sin(a/2)**2;
 for(let v of B)if(v.patella){let p=M.positions[v.id],y=p[1]-.918,z=p[2]-pz;Q[v.id]=[p[0],.918+y*Math.cos(theta)-(z+radial)*Math.sin(theta),pz+y*Math.sin(theta)+(z+radial)*Math.cos(theta)]}
 return Q}
