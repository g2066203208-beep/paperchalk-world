// Isolated hinge test: shared anatomical axis, no independent shin roll.
// Every distal calf/foot and proximal thigh point follows an exact rigid transform.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
export function kneeBindings(M){return M.positions.map((p,i)=>{let z=M.zones[i];if(z!==3&&z!==4)return {id:i,ring:-1,side:0,sector:'other',locked:true,weights:{torso:1}};let side=z===3?0:1,o=side*116,j=-1;if(i>=226+o&&i<280+o)j=Math.floor((i-226-o)/6);if(i>=396&&i<428)j=Math.floor((i-396)/4)+1;if(i>=476&&i<508)j=(i%16<4?0:0); // explicit support ring IDs override
if(i>=476&&i<=483||i>=492&&i<=499)j=2.5;if(i>=484&&i<=491||i>=500&&i<=507)j=3.5;
let sector=p[2]>.025?'front':p[2]<-.025?'rear':'side',w=j===2.5?(sector==='front'?.24:sector==='rear'?.02:.12):j===3?.5:j===3.5?(sector==='front'?.76:sector==='rear'?.98:.88):j>=4?1:0;return {id:i,ring:j,side,sector,locked:![2.5,3,3.5].includes(j),weights:{['thigh_'+(side?'L':'R')]:1-w,['shin_'+(side?'L':'R')]:w},w}})}
export function bend(M,B,deg,opt={}){let a=deg*Math.PI/180,h=a/2;return M.positions.map((p,i)=>{let b=B[i];if(b.side===undefined||b.ring<0||M.zones[i]<3||!deg)return p.slice();let y=p[1]-.918,z=p[2],j=b.ring,w=b.w;if(j<=2)return p.slice();if(j>=4)w=1;let t=a*w;
if(!b.locked&&z<0){let comp=smooth(deg/45),theta=Math.abs(h-t),room=Math.abs(y)*Math.cos(theta)/Math.max(.0001,Math.sin(theta));if(j===3){y*=1-comp;z*=1-(opt.squeeze??.55)*Math.sin(h)**2}else{let bound=Math.max(.006,room-(opt.gap??.008));z=Math.max(z,-bound)}}
if(!b.locked&&j===3&&z>0)z*=1+(opt.patella??.05)*Math.sin(h)**2;
return [p[0],.918+y*Math.cos(t)-z*Math.sin(t),y*Math.sin(t)+z*Math.cos(t)]})}
