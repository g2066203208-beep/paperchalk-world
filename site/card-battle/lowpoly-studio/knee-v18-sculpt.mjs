// Only anterior knee surface is sculpted in rest. No changes to original V46 archive.
export function sculptPatella(M,opt={}){let N={...M,positions:M.positions.map(p=>p.slice())};for(let [a,o] of [[0,0],[1,116]]){let central=244+o;N.positions[central][2]+=opt.bulge??.018;for(let i of [245+o,249+o])N.positions[i][2]+=(opt.bulge??.018)*.35;for(let i of [476+a*16,477+a*16,478+a*16,484+a*16,485+a*16,486+a*16])N.positions[i][2]-=(opt.taper??.008);}
return N}
