export function regions(M){
const R=[],add=(name,group,ids,low,high)=>R.push({name,group,ids,low,high});
const seq=(a,n)=>Array.from({length:n},(_,i)=>a+i);
for(let [name,start] of [["肩胸",99],["胸廓",111],["下胸",428],["腰腹",123],["上骨盆",135],["下骨盆",147]])add(name,"躯干",seq(start,12),name.includes("盆")?.90:.85,name.includes("盆")?1.10:1.15);
for(let s=0;s<2;s++){let o=s*116,L=s?"L":"R";for(let [j,n] of ["肩根","上臂","肘上","肘中心","前臂","腕口"].entries())add(L+n,n==="肘中心"||n==="肩根"||n==="腕口"?"关节":"骨段",seq(164+o+6*j,6),n==="肘中心"||n==="肩根"||n==="腕口"?.80:.95,n==="肘中心"||n==="肩根"||n==="腕口"?1.20:1.05);
for(let [j,n] of ["髋根","大腿","膝上","膝中心","小腿上","小腿下","踝口","脚掌上","脚底"].entries()){let ids=seq(226+o+6*j,6);if(j>=1)ids.push(396+4*(j-1)+s,398+4*(j-1)+s);let joint=[0,2,3,6].includes(j),foot=j>=7;add(L+n,foot?"刚性末端":joint?"关节":"骨段",ids,foot?.999:joint?.80:.95,foot?1.001:joint?1.20:1.05);}
add(L+"手掌","刚性末端",seq(200+o,26),.999,1.001);
}
return R
}
export function prepare(M){let norm=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));return regions(M).map(r=>{let pairs=[];for(let i=0;i<r.ids.length;i++)for(let j=i+1;j<r.ids.length;j++){let a=r.ids[i],b=r.ids[j],len=norm(M.positions[a],M.positions[b]);pairs.push({a,b,len})}let d=Math.max(...pairs.map(p=>p.len));return {...r,pairs:pairs.filter(p=>p.len>=d*.45&&p.len>1e-8)}})}
export function measureShape(R,P){return R.map(r=>{let lo=Infinity,hi=0;for(let {a,b,len} of r.pairs){let q=Math.hypot(...P[a].map((x,k)=>x-P[b][k]))/len;lo=Math.min(lo,q);hi=Math.max(hi,q)}return {name:r.name,group:r.group,min:lo,max:hi,fail:lo<r.low-1e-8||hi>r.high+1e-8}})}