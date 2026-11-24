// V7 facial planes only. V6 topology, body, hair exterior, rig and weights preserved.
import {buildBody as buildV6} from './body-topology-v6.mjs';
const coordinates={127:[0,2.0222,.46718],128:[.1624,2.1846,.484232],129:[.203,2.2774,.493976],130:[.2958,2.1846,.441],131:[.3596,2.1614,.358],132:[.3886,1.9584,.224],140:[-.3886,1.9584,.224],141:[-.3596,2.1614,.358],142:[-.2958,2.1846,.441],143:[-.203,2.2774,.493976],144:[-.1624,2.1846,.484232],145:[0,1.7902,.44282],146:[.232,1.8192,.445865],147:[.3364,1.8888,.345],153:[-.3364,1.8888,.345],154:[-.232,1.8192,.445865],155:[0,1.9062,.455]};
const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>a.map(x=>x/Math.max(1e-12,Math.hypot(...a)));
export function buildBody(){
 const d=buildV6();for(const [i,p] of Object.entries(coordinates))d.positions[i]=p.slice();
 const P=d.positions,T=d.triangles;const N=P.map(()=>[0,0,0]);let volume=0,minArea=Infinity;
 for(let i=0;i<T.length;i++){const ids=T[i], [a,b,c]=ids.map(k=>P[k]),n=cross(sub(b,a),sub(c,a));minArea=Math.min(minArea,Math.hypot(...n)/2);volume+=dot(a,cross(b,c))/6;if(d.groups[i]!=='skin')continue;const f=unit(n);for(let j=0;j<3;j++){const k=ids[j],u=unit(sub(P[ids[(j+1)%3]],P[k])),v=unit(sub(P[ids[(j+2)%3]],P[k])),angle=Math.acos(Math.max(-1,Math.min(1,dot(u,v))));N[k]=N[k].map((x,l)=>x+f[l]*angle)}}
 const mirror=P.map(([x,y,z])=>P.findIndex(([a,b,c])=>Math.abs(a+x)<1e-9&&Math.abs(b-y)<1e-9&&Math.abs(c-z)<1e-9));if(mirror.some(i=>i<0)||minArea<1e-9||Math.abs(volume-1.15058634880996)>1e-8)throw Error('V7 face geometry audit failed');
 d.skinNormals=N.map((n,i)=>{const m=N[mirror[i]],v=unit([n[0]-m[0],n[1]+m[1],n[2]+m[2]]);return Math.hypot(...v)>1e-9?v:null});
 d.stats={...d.stats,volume,minimumFaceArea:minArea,faceMirrorError:0};return d;
}
